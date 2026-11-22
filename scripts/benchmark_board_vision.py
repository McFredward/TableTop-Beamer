"""Measure RF-DETR on room crops from a saved board image."""

import argparse
from contextlib import redirect_stdout
import json
import math
import statistics
import sys
import time
from pathlib import Path


def parse_roi(value):
    try:
        x, y, width, height = map(int, value.split(","))
    except ValueError as error:
        raise argparse.ArgumentTypeError("expected x,y,width,height") from error
    if min(x, y) < 0 or min(width, height) <= 0:
        raise argparse.ArgumentTypeError("ROI coordinates must be non-negative and size positive")
    return x, y, width, height


def run_benchmark(parser, args):
    try:
        from PIL import Image

        with Image.open(args.image) as source:
            image = source.convert("RGB")
    except ImportError:
        parser.error("Install Pillow and the RF-DETR environment from docs/UTILITIES.md")
    except OSError as error:
        parser.error(str(error))

    rois = args.roi or [(0, 0, image.width, image.height)]
    if any(x + width > image.width or y + height > image.height for x, y, width, height in rois):
        parser.error("Every ROI must fit inside the image")
    crops = [image.crop((x, y, x + width, y + height)) for x, y, width, height in rois]

    try:
        import torch
        from rfdetr import RFDETRLarge, RFDETRSeg2XLarge
    except ImportError:
        parser.error("Install PyTorch and RF-DETR from docs/UTILITIES.md")

    has_cuda = torch.cuda.is_available()
    if args.device == "cuda" and not has_cuda:
        parser.error("CUDA requested but unavailable in this PyTorch environment")
    device = ("cuda" if has_cuda else "cpu") if args.device == "auto" else args.device
    model_type = RFDETRLarge if args.model == "large" else RFDETRSeg2XLarge
    weights = {"pretrain_weights": str(args.checkpoint.resolve())} if args.checkpoint else {}
    started = time.perf_counter()
    model = model_type(device=device, **weights)
    load_ms = (time.perf_counter() - started) * 1000
    synchronize = torch.cuda.synchronize if device == "cuda" else lambda: None

    def predict():
        return model.predict(crops, threshold=args.threshold, include_source_image=False)

    predict()
    synchronize()
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()
    times = []
    for _ in range(args.repeats):
        started = time.perf_counter()
        detections = predict()
        synchronize()
        times.append((time.perf_counter() - started) * 1000)

    result = {
        "model": args.model,
        "weights": "checkpoint" if args.checkpoint else "pretrained",
        "device": torch.cuda.get_device_name() if device == "cuda" else "cpu",
        "device_type": device,
        "image_size": image.size,
        "load_ms": round(load_ms, 1),
        "crop_batch_p50_ms": round(statistics.median(times), 2),
        "crop_batch_p95_ms": round(sorted(times)[math.ceil(len(times) * 0.95) - 1], 2),
        "crops": [],
    }
    if device == "cuda":
        result["peak_vram_allocated_mib"] = round(torch.cuda.max_memory_allocated() / 2**20, 1)
    for (x, y, width, height), prediction in zip(rois, detections, strict=True):
        boxes = []
        for index, (box, class_id, confidence) in enumerate(zip(
            prediction.xyxy, prediction.class_id, prediction.confidence, strict=True
        )):
            item = {
                "class_id": int(class_id),
                "confidence": round(float(confidence), 4),
                "xyxy": [round(float(value + offset), 2)
                         for value, offset in zip(box, (x, y, x, y), strict=True)],
            }
            if prediction.mask is not None:
                item["mask_area_px"] = int(prediction.mask[index].sum())
            boxes.append(item)
        result["crops"].append({"roi": (x, y, width, height), "boxes": boxes})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path, help="Path to a saved image, ideally the original 4K capture")
    parser.add_argument("--roi", action="append", type=parse_roi, help="Crop x,y,width,height. May be repeated.")
    parser.add_argument("--model", choices=("large", "seg-2xlarge"), default="large")
    parser.add_argument("--checkpoint", type=Path, help="Optional fine-tuned RF-DETR checkpoint")
    parser.add_argument("--device", choices=("auto", "cuda", "cpu"), default="auto")
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--repeats", type=int, default=10, help="Measured runs after one warm-up")
    args = parser.parse_args()
    if not args.image.is_file():
        parser.error(f"Image not found: {args.image}")
    if args.checkpoint and not args.checkpoint.is_file():
        parser.error(f"Checkpoint not found: {args.checkpoint}")
    if not 0 <= args.threshold <= 1 or args.repeats < 1:
        parser.error("Use threshold between 0 and 1 and at least one repeat")

    # RF-DETR logs and may show checkpoint download progress. Reserve stdout
    # for the report so it can be consumed by other programs.
    with redirect_stdout(sys.stderr):
        result = run_benchmark(parser, args)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
