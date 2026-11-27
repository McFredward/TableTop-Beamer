"""Shared image geometry for live and offline RF-DETR inference."""

import argparse
from itertools import chain

BOARD_CLASSES = {"noise", "fire", "malfunction", "alien", "character", "hand", "dice", "track-marker"}
SMALL_PROPOSAL_THRESHOLD = 0.04
SMALL_OBJECT_CROP_SIZE = 576


def parse_roi(value):
    try:
        x, y, width, height = map(int, value.split(","))
    except ValueError as error:
        raise argparse.ArgumentTypeError("expected x,y,width,height") from error
    if min(x, y) < 0 or min(width, height) <= 0:
        raise argparse.ArgumentTypeError("ROI coordinates must be non-negative and size positive")
    return x, y, width, height


def add_tile_option(parser):
    def tile_size(value):
        size = int(value)
        if not 384 <= size <= 1600:
            raise argparse.ArgumentTypeError("tile size must be between 384 and 1600 pixels")
        return size

    parser.add_argument("--tile-size", type=tile_size,
                        help="Run inference on overlapping tiles of this size in original pixels")


def predict_tiled(predictor, image, threshold, tile_size):
    import supervision as sv

    width, height = min(tile_size, image.width), min(tile_size, image.height)

    def predict(tile):
        return predictor.predict(tile, threshold=threshold, include_source_image=False)

    slicer = sv.InferenceSlicer(
        callback=predict,
        slice_wh=(width, height),
        overlap_wh=(width // 4, height // 4),
        overlap_filter=sv.OverlapFilter.NON_MAX_SUPPRESSION,
        iou_threshold=0.5,
        thread_workers=1,
        compact_masks=True,
    )
    return slicer(image)


def refine_small_objects(predictor, image, detections, classes, threshold, recent=(), reduced_projection=None):
    """Rerun the detector at native resolution around uncertain, compact pieces."""
    import numpy as np
    import supervision as sv
    from PIL import ImageOps

    scores = detections.confidence if len(detections) else np.empty(0)
    baseline = detections[scores >= threshold] if len(detections) else detections
    if max(image.size) <= SMALL_OBJECT_CROP_SIZE:
        return baseline, []

    confidence = 0.62
    size = SMALL_OBJECT_CROP_SIZE
    labels = np.asarray(detections.data.get("class_name", []))
    dimensions = detections.xyxy[:, 2:] - detections.xyxy[:, :2]
    small = np.all((dimensions >= size * 0.045) & (dimensions <= size * 0.25), axis=1)
    relevant = np.isin(labels, classes)
    candidates = np.flatnonzero(small & relevant & (scores < confidence))
    character_boxes = detections.xyxy[(labels == "character") & (scores >= 0.15)]
    new_proposals = []
    for index in sorted(candidates, key=lambda i: -scores[i]):
        label, box = labels[index], detections.xyxy[index]
        rivals = (labels == "character") & (scores >= max(0.15, scores[index] + 0.08))
        if label == "alien" and rivals.any() and (sv.box_iou_batch(box[None, :], detections.xyxy[rivals]) >= 0.55).any():
            continue
        new_proposals.append((label, box, None))
    # A bright malfunction effect can give a miniature mutually exclusive labels.
    if "alien" in classes and reduced_projection is not None:
        possible_figures = detections.xyxy[(labels == "character") & (scores >= 0.08)]
        malfunction_boxes = detections.xyxy[small & (labels == "malfunction") & (scores >= threshold)]
        if len(possible_figures) and len(malfunction_boxes):
            conflicts = sv.box_iou_batch(malfunction_boxes, possible_figures).max(axis=1) >= 0.65
            new_proposals[:0] = (("alien", box, None) for box in malfunction_boxes[conflicts])
    accepted = []
    centers = []
    next_recent = []
    width, height = min(size, image.width), min(size, image.height)
    for label, box, misses in chain(recent, new_proposals):
        if misses is not None and label == "alien" and len(character_boxes) and (
            sv.box_iou_batch(box[None, :], character_boxes) >= 0.55
        ).any():
            continue
        reliable = detections.xyxy[(labels == label) & (scores >= confidence)]
        if len(reliable) and (sv.box_iou_batch(box[None, :], reliable) >= 0.35).any():
            if misses is not None:
                next_recent.append((label, box, 0))
            continue
        center = (box[:2] + box[2:]) / 2
        if any(np.linalg.norm(center - previous) < size / 12 for previous in centers):
            continue
        left = max(0, min(image.width - width, round(float(center[0]) - width / 2)))
        top = max(0, min(image.height - height, round(float(center[1]) - height / 2)))
        bounds = (left, top, left + width, top + height)
        tile = image.crop(bounds)
        if reduced_projection is not None:
            patch = tuple(map(round, box))
            before = np.asarray(image.crop(patch), dtype=np.int16)
            after = np.asarray(reduced_projection.crop(patch))
            if before.size and np.mean(np.max(before - after, axis=2) > 25) >= 0.08:
                tile = ImageOps.grayscale(reduced_projection.crop(bounds)).convert("RGB")
        centers.append(center)
        zoom = predictor.predict(tile, threshold=confidence, include_source_image=False)
        confirmed = False
        if len(zoom):
            zoom.xyxy += (left, top, left, top)
            matches = (zoom.data["class_name"] == label) & (sv.box_iou_batch(box[None, :], zoom.xyxy)[0] >= 0.30)
            if matches.any():
                choices = zoom[matches]
                best = int(np.argmax(choices.confidence))
                accepted.append(choices[best:best + 1])
                next_recent.append((label, choices.xyxy[best], 0))
                confirmed = True
        # A confirmed crop gets another look if projection temporarily hides it.
        if not confirmed and misses == 0:
            next_recent.append((label, box, 1))
        # Bound the additional work so that markers still receive frequent readings.
        if len(centers) == 3:
            break

    if not accepted:
        return baseline, next_recent[:2]
    refined = sv.Detections.merge(accepted)
    aliens = refined.xyxy[refined.data["class_name"] == "alien"]
    if len(aliens) and len(baseline):
        rival = baseline.data["class_name"] == "malfunction"
        matches = sv.box_iou_batch(baseline.xyxy, aliens).max(axis=1) >= 0.53
        baseline = baseline[~(rival & matches)]
    merged = sv.Detections.merge([baseline, refined]).with_nms(threshold=0.5)
    return merged, next_recent[:2]


def resize_detections(detections, original_size, preview_size):
    if not len(detections) or original_size == preview_size:
        return detections
    width, height = preview_size
    sx, sy = width / original_size[0], height / original_size[1]
    preview = detections[:]
    preview.xyxy = detections.xyxy * (sx, sy, sx, sy)
    if detections.mask is not None:
        preview.mask = detections.mask.resize((height, width))
    return preview
