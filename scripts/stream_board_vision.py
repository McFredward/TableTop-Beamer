"""Run local RF-DETR inference on the latest TT-Beamer camera frames."""

import argparse
import hashlib
import io
import json
import re
import sys
import time
from collections import deque
from http.client import HTTPException
from pathlib import Path
from threading import Event, Thread
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from board_vision import (
    SMALL_OBJECT_CROP_SIZE, SMALL_PROPOSAL_THRESHOLD, add_tile_option, parse_roi,
    predict_tiled, refine_small_objects, resize_detections,
)


def identify_checkpoint(checkpoint, model_id=None):
    with checkpoint.open("rb") as source:
        digest = hashlib.file_digest(source, "sha256").hexdigest()
    presets = json.loads((Path(__file__).resolve().parents[1] / "config" / "camera-models.json").read_text(encoding="utf-8"))
    preset = next((entry for entry in presets["models"] if entry["checkpointSha256"] == digest), {})
    identity = {"modelId": model_id or preset.get("id", "checkpoint-" + digest[:20]),
                "modelName": model_id or preset.get("name", checkpoint.stem[:120])}
    return identity, preset


def board_objects(frame_id, classes, detections, size, original_size, roi, np):
    width, height = size
    original_width, original_height = original_size
    x, y, roi_width, roi_height = roi or (0, 0, original_width, original_height)
    sx, sy = roi_width / width / original_width, roi_height / height / original_height
    left, top = x / original_width, y / original_height
    objects = []
    corrections = detections.data.get("reclassified_malfunction")
    for i, (label, score, box) in enumerate(zip(detections.data.get("class_name", []), detections.confidence,
                                                 detections.xyxy, strict=True)):
        if label not in classes:
            continue
        x0, y0, x1, y1 = (float(v) for v in box)
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(width, x1), min(height, y1)
        if x1 <= x0 or y1 <= y0:
            continue
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        if label in {"alien", "character"}:
            cy = y0 + 0.92 * (y1 - y0)
            if detections.mask is not None:
                if hasattr(detections.mask, "crop"):
                    dx, dy = detections.mask.offsets[i]
                    ys, xs = np.nonzero(detections.mask.crop(i))
                    ys, xs = ys + dy, xs + dx
                else:
                    ys, xs = np.nonzero(detections.mask[i])
                base = ys >= cy
                if base.any():
                    cx = min(x1, max(x0, float(np.median(xs[base]))))
                    cy = min(y1, float(np.median(ys[base])))
        item = {
            "kind": label, "confidence": float(score),
            "box": [left + x0 * sx, top + y0 * sy, (x1 - x0) * sx, (y1 - y0) * sy],
            "anchor": [left + cx * sx, top + cy * sy],
        }
        if corrections is not None and np.isfinite(corrections[i]).all():
            a, b, c, d = corrections[i].tolist()
            a, b, c, d = max(0, a), max(0, b), min(width, c), min(height, d)
            if c > a and d > b:
                item["reclassifiedFrom"] = {"kind": "malfunction", "box": [left + a * sx, top + b * sy, (c - a) * sx, (d - b) * sy]}
        objects.append(item)
    return {
        "frameId": frame_id, "classes": sorted(classes),
        "objects": sorted(objects, key=lambda item: -item["confidence"])[:256],
        "coverage": [left, top, roi_width / original_width, roi_height / original_height],
    }


def annotate(image, detections, annotators, np):
    from PIL import Image

    mask, box, label = annotators
    scene = np.array(image)[:, :, ::-1].copy()
    if detections.mask is not None and len(detections):
        scene = mask.annotate(scene, detections)
    if len(detections):
        labels = [
            f"{name or f'class {class_id}'} {confidence:.0%}"
            for name, class_id, confidence in zip(
                detections.data["class_name"], detections.class_id, detections.confidence, strict=True
            )
        ]
        scene = box.annotate(scene, detections)
        scene = label.annotate(scene, detections, labels=labels)
    jpeg = io.BytesIO()
    Image.fromarray(scene[:, :, ::-1]).save(jpeg, format="JPEG", quality=88)
    return jpeg.getvalue()


def get_frame(url, last_frame, *, inference=True):
    query = {"purpose": "inference"} if inference else {}
    if last_frame:
        query["after"] = last_frame
    try:
        with urlopen(url + "/api/camera/latest.jpg?" + urlencode(query), timeout=2) as response:
            if response.status == 204:
                return None
            return response.headers["X-Camera-Frame-Id"], response.read()
    except HTTPError as error:
        if error.code == 503:
            return None
        raise


def collect_projection_samples(url, samples):
    last_id = None
    while True:
        try:
            frame = get_frame(url, last_id, inference=False)
            if frame:
                last_id = frame[0]
                samples.append(frame)
        except (OSError, HTTPException):
            pass
        time.sleep(0.25)


def reduce_projection(image, frame_id, samples, original_size, roi, np):
    """Reduce changing projector highlights using a short history with no inference wait."""
    from PIL import Image

    timestamp, generation, _ = map(int, frame_id.split("-"))
    prior = [jpeg for identity, jpeg in samples if (parts := list(map(int, identity.split("-"))))[1] == generation
             and 0 < timestamp - parts[0] <= 3700]
    if len(prior) < 2:
        return None
    minimum = np.array(image)
    for jpeg in prior:
        try:
            with Image.open(io.BytesIO(jpeg)) as source:
                if source.size != original_size:
                    continue
                if roi:
                    x, y, width, height = roi
                    source = source.crop((x, y, x + width, y + height))
                np.minimum(minimum, np.asarray(source.convert("RGB")), out=minimum)
        except OSError:
            continue
    return Image.fromarray(minimum)


class WorkerFailure(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


class DetailDetector:
    """Use fine-tuned logits on close crops with the board detector unchanged."""

    def __init__(self, model, adapter, torch):
        head = model.model.model.class_embed
        weights = torch.zeros_like(head.weight)
        bias = torch.zeros_like(head.bias)
        for name, row in adapter["classes"].items():
            index = list(model.class_names).index(name)
            weights[index] = torch.as_tensor(row["weights"], device=weights.device, dtype=weights.dtype)
            bias[index] = row["bias"]
        head.register_buffer("detail_weights", weights, persistent=False)
        head.register_buffer("detail_bias", bias, persistent=False)

        def correct(layer, args, output):
            return output + torch.nn.functional.linear(args[0], layer.detail_weights, layer.detail_bias)

        hook = head.register_forward_hook(correct)
        try:
            self.predictor = model.inference(compile=False)
        finally:
            hook.remove()

    def predict(self, *args, **options):
        return self.predictor.predict(*args, antialias=True, **options)


class ModelProgress:
    def __init__(self, url, model_id):
        self.url = url + "/api/camera/model-status"
        self.model_id = model_id
        self.current = {"phase": "starting"}
        self.changed = Event()
        self.closed = Event()
        self.worker = None
        if model_id:
            self.worker = Thread(target=self.heartbeat, daemon=True)
            self.worker.start()

    def show(self, phase):
        if self.current["phase"] != phase:
            self.current = {"phase": phase}
            self.changed.set()

    def publish(self, status):
        request = Request(self.url, data=json.dumps({"modelId": self.model_id, **status}).encode(),
                          headers={"Content-Type": "application/json"})
        try:
            with urlopen(request, timeout=1):
                pass
        except (OSError, HTTPException):
            # Progress is optional when reconnecting or talking to an older TT-Beamer.
            pass

    def heartbeat(self):
        while not self.closed.is_set():
            self.changed.clear()
            self.publish(self.current)
            self.changed.wait(3)

    def finish(self, phase, error=None):
        if self.worker:
            self.closed.set()
            self.changed.set()
            self.worker.join()
            self.publish({"phase": phase, **({"error": error} if error else {})})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4173, help="Local TT-Beamer port")
    parser.add_argument("--model", choices=("seg-2xlarge", "seg-large", "seg-nano", "large"),
                        help="RF-DETR variant. Uses the registered checkpoint variant or seg-2xlarge by default.")
    parser.add_argument("--checkpoint", type=Path, help="Trusted local checkpoint for the selected model")
    parser.add_argument("--game", action="store_true", help="Publish checkpoint classes to Game observation")
    parser.add_argument("--model-id", help="Stable name used by animation bindings. Defaults to the registered ID or a checkpoint hash.")
    parser.add_argument("--device", choices=("auto", "cuda", "cpu"), default="auto")
    parser.add_argument("--threshold", type=float, default=0.45)
    parser.add_argument("--max-fps", type=float, default=3)
    parser.add_argument("--roi", type=parse_roi, help="Optional crop x,y,width,height in raw camera pixels")
    add_tile_option(parser)
    args = parser.parse_args()
    if not 0 <= args.threshold <= 1 or not 0 < args.max_fps <= 5 or not 0 < args.port <= 65535:
        parser.error("Use a threshold from 0 to 1, an FPS limit above 0 and at most 5, and a valid port")
    if args.model_id and not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}", args.model_id):
        parser.error("Model ID must use up to 80 letters, numbers, periods, underscores or hyphens")
    url = f"http://127.0.0.1:{args.port}"
    progress = ModelProgress(url, args.model_id if args.game else None)
    try:
        if args.game and not args.checkpoint:
            raise WorkerFailure("checkpoint", "--game needs a checkpoint trained on the board-game classes")
        if args.checkpoint and not args.checkpoint.is_file():
            raise WorkerFailure("checkpoint", f"Checkpoint not found: {args.checkpoint}")
        try:
            model_identity, preset = identify_checkpoint(args.checkpoint, args.model_id) if args.game else ({}, {})
        except OSError as error:
            raise WorkerFailure("checkpoint", str(error)) from error
        if args.game and not progress.model_id:
            progress = ModelProgress(url, model_identity["modelId"])
        run_detector(args, url, model_identity, preset, progress)
    except WorkerFailure as error:
        progress.finish("error", error.code)
        parser.error(str(error))
    except KeyboardInterrupt:
        progress.finish("stopped")
    except Exception:
        progress.finish("error", "worker")
        raise


def run_detector(args, url, model_identity, preset, progress):
    model_name = args.model or preset.get("variant") or "seg-2xlarge"
    small_objects = preset.get("smallObjectClasses", []) if model_name == "large" else []
    try:
        import numpy as np
        from PIL import Image
        import supervision as sv
        import torch
        from rfdetr import RFDETRLarge, RFDETRSeg2XLarge, RFDETRSegLarge, RFDETRSegNano
    except ImportError as error:
        raise WorkerFailure("dependencies", "Install PyTorch and RF-DETR as described in docs/UTILITIES.md") from error

    has_cuda = torch.cuda.is_available()
    if args.device == "cuda" and not has_cuda:
        raise WorkerFailure("device", "CUDA requested but unavailable in this PyTorch environment")
    device = ("cuda" if has_cuda else "cpu") if args.device == "auto" else args.device
    model_type = {
        "seg-2xlarge": RFDETRSeg2XLarge, "seg-large": RFDETRSegLarge,
        "seg-nano": RFDETRSegNano, "large": RFDETRLarge,
    }[model_name]
    weights = {"pretrain_weights": str(args.checkpoint.resolve())} if args.checkpoint else {}
    print(f"Loading RF-DETR {model_name} on {device}…", flush=True)
    progress.show("loading")
    model = model_type(device=device, **weights)
    progress.show("preparing")
    predictor = model.inference(compile=False)
    detail = None
    if small_objects and preset.get("detailAdapter"):
        adapter_path = Path(__file__).resolve().parents[1] / "config" / preset["detailAdapter"]
        detail = DetailDetector(model, json.loads(adapter_path.read_text(encoding="utf-8")), torch)
    classes = set()
    if args.game:
        names = model.class_names
        classes = {name for name in (names.values() if hasattr(names, "values") else names)
                   if isinstance(name, str) and name and name == name.strip() and len(name) <= 80}
        if not classes:
            raise WorkerFailure("checkpoint", "The checkpoint does not define any usable classes")
        if len(classes) > 128:
            raise WorkerFailure("checkpoint", "Game observation supports up to 128 published classes per detector")
        print(f"Publishing detector {model_identity['modelId']}", flush=True)
    del model
    annotations = (
        sv.MaskAnnotator(opacity=0.42),
        sv.BoxAnnotator(thickness=2),
        sv.LabelAnnotator(text_scale=0.7, text_padding=5, smart_position=True),
    )
    print(f"Reading camera frames from {url}", flush=True)
    progress.show("waiting-camera")
    projection_samples = deque(maxlen=5)
    if small_objects:
        Thread(target=collect_projection_samples, args=(url, projection_samples), daemon=True).start()
    last_frame = None
    refinement_key = None
    recent_small_objects = []
    shown_connection_error = False
    published = False
    detection_threshold = min(args.threshold, 0.25) if args.game else args.threshold
    while True:
        started = time.monotonic()
        try:
            capture = get_frame(url, last_frame)
            if not capture:
                if not published and not last_frame:
                    progress.show("waiting-camera")
                time.sleep(0.2)
                continue
            last_frame, jpeg = capture
            try:
                with Image.open(io.BytesIO(jpeg)) as source:
                    image = source.convert("RGB")
            except OSError:
                continue
            original_size = image.size
            if args.roi:
                x, y, width, height = args.roi
                if x + width > image.width or y + height > image.height:
                    raise WorkerFailure("frame-size", "The ROI must fit inside the live camera image")
                image = image.crop((x, y, x + width, y + height))
            refine = small_objects and (args.tile_size or max(image.size)) > SMALL_OBJECT_CROP_SIZE
            previous_frames = projection_samples.copy() if refine else ()
            analysis = image
            if not args.tile_size and max(image.size) > 1600:
                analysis = image.copy() if refine else image
                analysis.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            threshold = min(detection_threshold, SMALL_PROPOSAL_THRESHOLD) if refine else detection_threshold

            if not published:
                progress.show("inference")
            inference_start = time.monotonic()
            if args.tile_size:
                detections = predict_tiled(predictor, analysis, threshold, args.tile_size)
            else:
                detections = predictor.predict(analysis, threshold=threshold, include_source_image=False)
            if refine:
                detections = resize_detections(detections, analysis.size, image.size)
                current_key = (last_frame.split("-")[1], image.size)
                if current_key != refinement_key:
                    refinement_key, recent_small_objects = current_key, []
                reduced = reduce_projection(image, last_frame, previous_frames, original_size, args.roi, np)
                detections, recent_small_objects = refine_small_objects(
                    detail or predictor, image, detections, small_objects, detection_threshold, recent_small_objects, reduced,
                    review_malfunctions=detail is not None, deadline=started + 4.4,
                )
                analysis = image
            elapsed = (time.monotonic() - inference_start) * 1000
            if classes:
                payload = board_objects(last_frame, classes, detections, analysis.size, original_size, args.roi, np)
                payload.update(model_identity)
                request = Request(url + "/api/camera/board-objects", method="POST",
                                  data=json.dumps(payload, allow_nan=False).encode("utf-8"),
                                  headers={"Content-Type": "application/json"})
                try:
                    with urlopen(request, timeout=2):
                        published = True
                        progress.show("running")
                except HTTPError as error:
                    if error.code not in (404, 409):
                        raise
            annotated = detections
            if args.game and len(annotated):
                included = (np.asarray(annotated.data["class_name"]) != "track-marker") & (annotated.confidence >= args.threshold)
                annotated = annotated[included]
            prediction_size = analysis.size
            analysis.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            annotated = resize_detections(annotated, prediction_size, analysis.size)
            result = annotate(analysis, annotated, annotations, np)
            original_width, original_height = original_size
            x, y, width, height = args.roi or (0, 0, original_width, original_height)
            coverage = [x / original_width, y / original_height, width / original_width, height / original_height]
            request = Request(url + "/api/camera/vision.jpg", method="POST", data=result, headers={
                "Content-Type": "image/jpeg",
                "X-Camera-Frame-Id": last_frame,
                "X-Vision-Model": model_name,
                "X-Vision-Weights": "checkpoint" if weights else "pretrained",
                "X-Vision-Device": device,
                "X-Vision-Count": str(len(annotated)),
                "X-Vision-Masks": str(len(annotated) if annotated.mask is not None else 0),
                "X-Vision-MS": f"{elapsed:.1f}",
                "X-Vision-Coverage": ",".join(str(value) for value in coverage),
            })
            try:
                with urlopen(request, timeout=2):
                    pass
            except HTTPError as error:
                if error.code != 409:
                    raise
            shown_connection_error = False
        except (OSError, HTTPException) as error:
            if isinstance(error, HTTPError) and 400 <= error.code < 500:
                raise WorkerFailure("server", f"TT-Beamer rejected the detector request with HTTP {error.code}") from error
            published = False
            last_frame = None
            progress.show("reconnecting")
            if not shown_connection_error:
                print(f"Waiting for TT-Beamer: {error}", file=sys.stderr, flush=True)
                shown_connection_error = True
            time.sleep(1)
        time.sleep(max(0, 1 / args.max_fps - (time.monotonic() - started)))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
