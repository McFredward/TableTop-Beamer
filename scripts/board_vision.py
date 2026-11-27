"""Shared image geometry for live and offline RF-DETR inference."""

import argparse

BOARD_CLASSES = {"noise", "fire", "malfunction", "alien", "character", "hand", "dice", "track-marker"}


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
