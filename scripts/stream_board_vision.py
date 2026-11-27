"""Run local RF-DETR inference on the latest TT-Beamer camera frames."""

import argparse
import hashlib
import io
import json
import re
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from board_vision import add_tile_option, parse_roi, predict_tiled, resize_detections


def board_objects(frame_id, classes, detections, size, original_size, roi, np):
    width, height = size
    original_width, original_height = original_size
    x, y, roi_width, roi_height = roi or (0, 0, original_width, original_height)
    sx, sy = roi_width / width / original_width, roi_height / height / original_height
    left, top = x / original_width, y / original_height
    objects = []
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
        objects.append({
            "kind": label, "confidence": float(score),
            "box": [left + x0 * sx, top + y0 * sy, (x1 - x0) * sx, (y1 - y0) * sy],
            "anchor": [left + cx * sx, top + cy * sy],
        })
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


def get_frame(url, last_frame):
    query = {"purpose": "inference"}
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4173, help="Local TT-Beamer port")
    parser.add_argument("--model", choices=("seg-2xlarge", "seg-large", "seg-nano", "large"),
                        default="seg-2xlarge")
    parser.add_argument("--checkpoint", type=Path, help="Trusted local checkpoint for the selected model")
    parser.add_argument("--game", action="store_true", help="Publish checkpoint classes to Game observation")
    parser.add_argument("--model-id", help="Stable name used by animation bindings. Defaults to a checkpoint hash.")
    parser.add_argument("--device", choices=("auto", "cuda", "cpu"), default="auto")
    parser.add_argument("--threshold", type=float, default=0.45)
    parser.add_argument("--max-fps", type=float, default=3)
    parser.add_argument("--roi", type=parse_roi, help="Optional crop x,y,width,height in raw camera pixels")
    add_tile_option(parser)
    args = parser.parse_args()
    if not 0 <= args.threshold <= 1 or not 0 < args.max_fps <= 5 or not 0 < args.port <= 65535:
        parser.error("Use a threshold from 0 to 1, an FPS limit above 0 and at most 5, and a valid port")
    if args.checkpoint and not args.checkpoint.is_file():
        parser.error(f"Checkpoint not found: {args.checkpoint}")
    if args.game and not args.checkpoint:
        parser.error("--game needs a checkpoint trained on the board-game classes")
    if args.model_id and not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}", args.model_id):
        parser.error("Model ID must use up to 80 letters, numbers, periods, underscores or hyphens")

    try:
        import numpy as np
        from PIL import Image
        import supervision as sv
        import torch
        from rfdetr import RFDETRLarge, RFDETRSeg2XLarge, RFDETRSegLarge, RFDETRSegNano
    except ImportError:
        parser.error("Install PyTorch and RF-DETR as described in docs/UTILITIES.md")

    has_cuda = torch.cuda.is_available()
    if args.device == "cuda" and not has_cuda:
        parser.error("CUDA requested but unavailable in this PyTorch environment")
    device = ("cuda" if has_cuda else "cpu") if args.device == "auto" else args.device
    model_type = {
        "seg-2xlarge": RFDETRSeg2XLarge, "seg-large": RFDETRSegLarge,
        "seg-nano": RFDETRSegNano, "large": RFDETRLarge,
    }[args.model]
    weights = {"pretrain_weights": str(args.checkpoint.resolve())} if args.checkpoint else {}
    print(f"Loading RF-DETR {args.model} on {device}…", flush=True)
    model = model_type(device=device, **weights)
    predictor = model.inference(compile=False)
    classes = set()
    model_identity = {}
    if args.game:
        names = model.class_names
        classes = {name for name in (names.values() if hasattr(names, "values") else names)
                   if isinstance(name, str) and name and name == name.strip() and len(name) <= 80}
        if not classes:
            parser.error("The checkpoint does not define any usable classes")
        if len(classes) > 128:
            parser.error("Game observation supports up to 128 published classes per detector")
        model_id = args.model_id
        if not model_id:
            with args.checkpoint.open("rb") as source:
                model_id = "checkpoint-" + hashlib.file_digest(source, "sha256").hexdigest()[:20]
        model_identity = {"modelId": model_id, "modelName": args.model_id or args.checkpoint.stem[:120]}
        print(f"Publishing detector {model_id}", flush=True)
    annotations = (
        sv.MaskAnnotator(opacity=0.42),
        sv.BoxAnnotator(thickness=2),
        sv.LabelAnnotator(text_scale=0.7, text_padding=5, smart_position=True),
    )
    url = f"http://127.0.0.1:{args.port}"
    print(f"Reading camera frames from {url}", flush=True)
    last_frame = None
    shown_connection_error = False
    detection_threshold = min(args.threshold, 0.25) if args.game else args.threshold
    while True:
        started = time.monotonic()
        try:
            capture = get_frame(url, last_frame)
            if not capture:
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
                    parser.error("The ROI must fit inside the live camera image")
                image = image.crop((x, y, x + width, y + height))
            if not args.tile_size:
                image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)

            inference_start = time.monotonic()
            if args.tile_size:
                detections = predict_tiled(predictor, image, detection_threshold, args.tile_size)
            else:
                detections = predictor.predict(image, threshold=detection_threshold, include_source_image=False)
            elapsed = (time.monotonic() - inference_start) * 1000
            if classes:
                payload = board_objects(last_frame, classes, detections, image.size, original_size, args.roi, np)
                payload.update(model_identity)
                request = Request(url + "/api/camera/board-objects", method="POST",
                                  data=json.dumps(payload, allow_nan=False).encode("utf-8"),
                                  headers={"Content-Type": "application/json"})
                try:
                    with urlopen(request, timeout=2):
                        pass
                except HTTPError as error:
                    if error.code not in (404, 409):
                        raise
            annotated = detections
            if args.game and len(annotated):
                included = (np.asarray(annotated.data["class_name"]) != "track-marker") & (annotated.confidence >= args.threshold)
                annotated = annotated[included]
            if args.tile_size:
                prediction_size = image.size
                image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
                annotated = resize_detections(annotated, prediction_size, image.size)
            result = annotate(image, annotated, annotations, np)
            original_width, original_height = original_size
            x, y, width, height = args.roi or (0, 0, original_width, original_height)
            coverage = [x / original_width, y / original_height, width / original_width, height / original_height]
            request = Request(url + "/api/camera/vision.jpg", method="POST", data=result, headers={
                "Content-Type": "image/jpeg",
                "X-Camera-Frame-Id": last_frame,
                "X-Vision-Model": args.model,
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
        except (URLError, TimeoutError) as error:
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
