"""Shared image geometry for live and offline RF-DETR inference."""

import argparse
from itertools import chain
from time import monotonic

BOARD_CLASSES = {"noise", "fire", "malfunction", "alien", "character", "hand", "dice", "track-marker"}
SMALL_PROPOSAL_THRESHOLD = 0.04
SMALL_OBJECT_CROP_SIZE = 576
MALFUNCTION_CROP_SIZE = 768
MALFUNCTION_PROPOSAL_THRESHOLD = 0.16
MALFUNCTION_REVIEW_CONFIDENCE = 0.82
PLAYER_CROP_SIZE = 704


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


def predict_tiled(predictor, image, threshold, tile_size, *, overlap_fraction=0.25):
    import supervision as sv

    width, height = min(tile_size, image.width), min(tile_size, image.height)

    def predict(tile):
        return predictor.predict(tile, threshold=threshold, include_source_image=False)

    slicer = sv.InferenceSlicer(
        callback=predict,
        slice_wh=(width, height),
        overlap_wh=(int(width * overlap_fraction), int(height * overlap_fraction)),
        overlap_filter=sv.OverlapFilter.NON_MAX_SUPPRESSION,
        iou_threshold=0.5,
        thread_workers=1,
        compact_masks=True,
    )
    return slicer(image)


def refine_small_objects(predictor, image, detections, classes, threshold, recent=(), reduced_projection=None,
                         review_malfunctions=False, deadline=None):
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
    if review_malfunctions and "malfunction" in classes and len(baseline):
        # A small, borderline overview prediction can be a larva. Keep it
        # visible as evidence while a detail crop supplies the decisive label.
        uncertain_markers = small & (labels == "malfunction") & (scores <= MALFUNCTION_REVIEW_CONFIDENCE)
        baseline.confidence = np.where(uncertain_markers[scores >= threshold],
                                       np.minimum(baseline.confidence, 0.60), baseline.confidence)
    candidates = np.flatnonzero(small & relevant & (scores < confidence))
    character_boxes = detections.xyxy[(labels == "character") & (scores >= 0.15)]
    confirmed_characters = detections.xyxy[(labels == "character") & (scores >= 0.40)]
    new_proposals = []
    for index in sorted(candidates, key=lambda i: -scores[i]):
        label, box = labels[index], detections.xyxy[index]
        if label == "malfunction" and scores[index] < MALFUNCTION_PROPOSAL_THRESHOLD:
            continue
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
    flames = detections.xyxy[(labels == "fire") & (scores >= 0.40)]
    flame_centers = (flames[:, :2] + flames[:, 2:]) / 2

    def near_fire(box):
        center = (box[:2] + box[2:]) / 2
        return (np.linalg.norm(flame_centers - center, axis=1) < size / 5).any()

    figure_reviews = []
    if "character" in classes and "alien" in classes:
        # A colored base ring can appear as a low-confidence die at board scale.
        possible_players = small & (labels == "dice") & (scores >= 0.22) & (scores < 0.76)
        aliens = np.flatnonzero(small & (labels == "alien") & (scores >= confidence) & (scores < 0.90))
        if len(character_boxes) and len(aliens):
            overlaps = sv.box_iou_batch(detections.xyxy[aliens], character_boxes).max(axis=1)
            possible_players[aliens[overlaps >= 0.45]] = True
        indexes = np.flatnonzero(possible_players)
        if len(indexes):
            previous_players = [box for label, box, misses in recent if label == "character" and misses == 0]
            previous_hits = np.zeros(len(detections), dtype=bool)
            if previous_players:
                previous_hits[indexes] = sv.box_iou_batch(detections.xyxy[indexes], np.array(previous_players)).max(axis=1) >= 0.5
            index = max(indexes, key=lambda i: (previous_hits[i], labels[i] == "alien", np.prod(dimensions[i]), scores[i]))
            figure_reviews.append(("character", detections.xyxy[index], None))

    marker_reviews = []
    if review_malfunctions and "alien" in classes:
        minimum = MALFUNCTION_PROPOSAL_THRESHOLD if "malfunction" in classes else threshold
        doubtful = np.flatnonzero(small & (labels == "malfunction") & (scores >= minimum) &
                                  (scores <= MALFUNCTION_REVIEW_CONFIDENCE))
        reviews = {}
        additional_reviews = []
        for index in sorted(doubtful, key=lambda i: abs(scores[i] - confidence)):
            box = detections.xyxy[index]
            if len(character_boxes) and (sv.box_iou_batch(box[None, :], character_boxes) >= 0.55).any():
                continue
            by_fire = near_fire(box)
            label = "malfunction" if "malfunction" in classes else "alien"
            proposal = (label, box, None)
            if by_fire in reviews:
                additional_reviews.append(proposal)
            else:
                reviews[by_fire] = proposal
        # Check a candidate under the fire effect and another elsewhere when possible.
        marker_reviews = ([reviews[by_fire] for by_fire in (True, False) if by_fire in reviews] + additional_reviews)[:2]
    accepted = []
    accepted_from = []
    centers = []
    next_recent = []
    for label, box, misses in chain(figure_reviews, marker_reviews, recent, new_proposals):
        if misses is not None and label == "alien" and len(character_boxes) and (
            sv.box_iou_batch(box[None, :], character_boxes) >= 0.55
        ).any():
            continue
        reliable = detections.xyxy[(labels == label) & (scores >= confidence)]
        if (label != "malfunction" or misses is not None) and len(reliable) and (
            sv.box_iou_batch(box[None, :], reliable) >= 0.35
        ).any():
            if misses is not None:
                next_recent.append((label, box, 0))
            continue
        center = (box[:2] + box[2:]) / 2
        if any(np.linalg.norm(center - previous) < size / 12 for previous in centers):
            continue
        if deadline is not None and monotonic() >= deadline:
            if not next_recent:
                next_recent.extend(recent)
            break
        # The malfunction token is easier to recognize with more surrounding
        # room context, especially when a nearby flame washes out its edge.
        crop_size = PLAYER_CROP_SIZE if label == "character" else size
        if label == "malfunction" and near_fire(box):
            crop_size = MALFUNCTION_CROP_SIZE
        width, height = min(crop_size, image.width), min(crop_size, image.height)
        left = max(0, min(image.width - width, round(float(center[0]) - width / 2)))
        top = max(0, min(image.height - height, round(float(center[1]) - height / 2)))
        bounds = (left, top, left + width, top + height)
        tile = image.crop(bounds)
        if reduced_projection is not None and label == "alien":
            patch = tuple(map(round, box))
            before = np.asarray(image.crop(patch), dtype=np.int16)
            after = np.asarray(reduced_projection.crop(patch))
            if before.size and np.mean(np.max(before - after, axis=2) > 25) >= 0.08:
                tile = ImageOps.grayscale(reduced_projection.crop(bounds)).convert("RGB")
        centers.append(center)
        predict = getattr(predictor, "predict_player", predictor.predict) if label == "character" else predictor.predict
        zoom = predict(tile, threshold=confidence, include_source_image=False)
        confirmed = False
        if len(zoom):
            zoom.xyxy += (left, top, left, top)
            close = sv.box_iou_batch(box[None, :], zoom.xyxy)[0] >= 0.30
            local_labels = zoom.data["class_name"]
            matches = (local_labels == label) & close
            if label == "character":
                competitors = zoom.confidence[close & np.isin(local_labels, ["alien", "dice"])]
                matches &= zoom.confidence >= max(0.80, competitors.max(initial=0) + 0.08)
            if review_malfunctions and label in ("alien", "malfunction"):
                competing = zoom.confidence[close & np.isin(zoom.data["class_name"], ["malfunction", "character"])]
                alien_candidates = close & (zoom.data["class_name"] == "alien")
                if label == "malfunction" or (
                    (labels == "malfunction").any() and
                    (sv.box_iou_batch(box[None, :], detections.xyxy[labels == "malfunction"]) >= 0.70).any()
                ):
                    zoom_area = np.prod(zoom.xyxy[:, 2:] - zoom.xyxy[:, :2], axis=1)
                    alien_candidates &= zoom_area <= 1.25 * np.prod(box[2:] - box[:2])
                if len(confirmed_characters):
                    alien_candidates &= sv.box_iou_batch(zoom.xyxy, confirmed_characters).max(axis=1) < 0.4
                aliens = alien_candidates & (zoom.confidence >= max(0.72, competing.max(initial=0) + 0.12))
                if label == "malfunction":
                    plausible_alien = zoom.confidence[alien_candidates].max(initial=0)
                    if plausible_alien >= 0.70:
                        matches &= zoom.confidence >= plausible_alien + 0.05
                matches = aliens if label == "alien" or aliens.any() else matches
            if matches.any():
                choices = zoom[matches]
                best = int(np.argmax(choices.confidence))
                accepted.append(choices[best:best + 1])
                accepted_from.append(box)
                next_recent.append((choices.data["class_name"][best], choices.xyxy[best], 0))
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
    displaced = []
    if len(baseline):
        removed = np.zeros(len(baseline), dtype=bool)
        for label, candidate, actual in zip(refined.data["class_name"], accepted_from, refined.xyxy, strict=True):
            if label not in ("alien", "character", "malfunction"):
                continue
            overlap = sv.box_iou_batch(np.array([candidate, actual]), baseline.xyxy)
            coarse_labels = baseline.data["class_name"]
            rivals = np.isin(coarse_labels, ["alien", "dice"]) if label == "character" else coarse_labels == "malfunction"
            matches = rivals & ((overlap[0] >= 0.70) | (overlap[1] >= 0.53))
            corrections = matches & (coarse_labels != label)
            if label == "character" and (corrections & (coarse_labels == "alien")).any():
                corrections &= coarse_labels == "alien"
            if corrections.any():
                index = np.argmax(np.where(corrections, overlap.max(axis=0), 0))
                displaced.append((label, actual, coarse_labels[index], baseline.xyxy[index]))
            removed |= matches
        baseline = baseline[~removed]
    merged = sv.Detections.merge([baseline, refined]).with_nms(threshold=0.5)
    if displaced:
        corrections = np.full(merged.xyxy.shape, np.nan)
        replaced_labels = np.full(len(merged), "", dtype="<U80")
        for label, actual, replaced_label, replaced in displaced:
            matches = (merged.data["class_name"] == label) & (sv.box_iou_batch(actual[None, :], merged.xyxy)[0] >= 0.7)
            corrections[matches] = replaced
            replaced_labels[matches] = replaced_label
        merged.data["reclassified_box"] = corrections
        merged.data["reclassified_kind"] = replaced_labels
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
