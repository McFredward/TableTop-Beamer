"""Local RF-DETR review of competing board-piece labels and crowded areas."""

from time import monotonic


def same_piece(boxes, dimensions, centers, sv, np):
    """Match a piece across scales without conflating adjacent pieces."""
    offsets = np.abs(centers[:, None] - centers)
    smaller = np.minimum(dimensions[:, None], dimensions)
    larger = np.maximum(dimensions[:, None], dimensions)
    aligned = np.all((offsets <= smaller * 0.30) & (smaller >= larger * 0.55), axis=2)
    return aligned | (sv.box_iou_batch(boxes, boxes) >= 0.45)


def review_anchors(detections, recent, sv, np, survey=False):
    boxes = detections.xyxy
    labels = detections.data.get("class_name", np.empty(0))
    scores = detections.confidence if len(detections) else np.empty(0)
    dimensions = boxes[:, 2:] - boxes[:, :2]
    centers = (boxes[:, :2] + boxes[:, 2:]) / 2
    compact = np.all((dimensions >= 26) & (dimensions <= 144), axis=1)
    same = same_piece(boxes, dimensions, centers, sv, np) if len(boxes) else np.zeros((0, 0), dtype=bool)
    distances = np.linalg.norm(centers[:, None] - centers, axis=2)
    flames = compact & (labels == "fire") & (scores >= 0.19)
    dice = compact & (labels == "dice") & (scores >= 0.58)
    figures = np.isin(labels, ["character", "alien"]) & (scores >= 0.60)
    mixed_flames = flames & ~(same & dice).any(axis=1)
    packed = (distances < 135) & ~same
    adjacent_dice = (distances <= 228) & ~same & dice
    die_alias = dice & (same & flames).any(axis=1)
    pairs = 0.9 * die_alias + 0.7 * (1 - distances / 228) + 0.12 * scores
    paired_evidence = np.where(adjacent_dice, pairs, 0).max(axis=1, initial=0)
    aliases = np.isin(labels, ["alien", "fire", "malfunction"]) & (scores >= 0.075)
    player_conflicts = compact & (labels == "character") & (scores >= 0.48) & (same & aliases).any(axis=1)
    marker_proposals = compact & (labels == "malfunction") & (scores >= 0.10) & (scores <= 0.82)
    possible_figures = compact & (labels == "alien") & (scores >= 0.13) & (scores < 0.62)
    ring_conflicts = compact & (labels == "dice") & (scores >= 0.22) & (scores < 0.76)
    weak_flames = mixed_flames & (scores < 0.82)

    def recent_support(purpose):
        prior = np.array([(box[:2] + box[2:]) / 2 for box, kind in recent if kind == purpose])
        if not len(prior):
            return 0
        distance = np.linalg.norm(centers[:, None] - prior, axis=2).min(axis=1)
        return np.maximum(0, 1 - distance / 170) * 0.25

    groups = (
        (mixed_flames & adjacent_dice.any(axis=1),
         paired_evidence + scores * 0.22 + recent_support("flame"), "flame"),
        (mixed_flames & (packed & figures).any(axis=1),
         np.where(packed & figures, 1 - distances / 135, 0).max(axis=1, initial=0) + scores * 0.25, "crowd"),
        (player_conflicts, scores + recent_support("figure"), "figure"),
        (marker_proposals, scores, "marker"),
        (possible_figures | ring_conflicts | weak_flames, scores, "general"),
    )
    groups = [[(centers[i], purpose) for i in np.flatnonzero(mask)[np.argsort(-priority[mask], kind="stable")]]
              for mask, priority, purpose in groups]
    first_groups = groups[:3]
    if survey and groups[3]:
        first_groups = [*first_groups[:2], groups[3], first_groups[2]]
        purposes = ("flame", "crowd", "marker", "figure")
    else:
        purposes = ("flame", "crowd", "figure")
    for group, purpose in zip(first_groups, purposes, strict=True):
        if group:
            yield group.pop(0)
        else:
            for box, previous_purpose in recent:
                if previous_purpose == purpose:
                    yield (box[:2] + box[2:]) / 2, purpose
                    break
    for box, purpose in recent:
        yield (box[:2] + box[2:]) / 2, purpose
    for group in groups[3:] + groups[:3]:
        yield from group


def drop_fire_dice_aliases(detections, sv, np):
    """Reject duplicate fire labels on dice in an unreviewed overview region."""
    if not len(detections):
        return detections
    labels = detections.data["class_name"]
    fire = np.flatnonzero(labels == "fire")
    dice = np.flatnonzero((labels == "dice") & (detections.confidence >= 0.42))
    if not len(fire) or not len(dice):
        return detections
    overlap = sv.box_iou_batch(detections.xyxy[fire], detections.xyxy[dice])
    competitive = detections.confidence[dice] + 0.32 >= detections.confidence[fire, None]
    keep = np.ones(len(detections), dtype=bool)
    keep[fire] = ~((overlap >= 0.67) & competitive).any(axis=1)
    return detections[keep]


def refine_board_context(predictor, image, detections, threshold, recent=(), reduced_projection=None,
                         deadline=None, survey=False):
    """Review up to three neighborhoods at native resolution with one model pass each."""
    import numpy as np
    import supervision as sv

    baseline = detections[detections.confidence >= threshold] if len(detections) else detections
    if len(baseline):
        dimensions = baseline.xyxy[:, 2:] - baseline.xyxy[:, :2]
        uncertain = ((baseline.data["class_name"] == "malfunction") & (baseline.confidence <= 0.82) &
                     np.all((dimensions >= 26) & (dimensions <= 144), axis=1))
        baseline.confidence[uncertain] = np.minimum(baseline.confidence[uncertain], 0.60)

    limits = {"fire": 0.72, "dice": 0.79, "malfunction": 0.65, "alien": 0.73, "character": 0.78}
    reviewed = []
    selected = []
    next_recent = []
    for center, purpose in review_anchors(detections, recent, sv, np, survey):
        if any(np.linalg.norm(center - previous) < 170 for previous in selected):
            continue
        if len(selected) == 3 or (deadline is not None and monotonic() >= deadline):
            break
        size = 768
        # Small box jitter should not shift the model's crop every frame.
        crop_center = np.round(center / 16) * 16
        width, height = min(size, image.width), min(size, image.height)
        left = max(0, min(image.width - width, round(float(crop_center[0]) - width / 2)))
        top = max(0, min(image.height - height, round(float(crop_center[1]) - height / 2)))
        bounds = (left, top, left + width, top + height)
        previously_reviewed = purpose == "flame" and any(
            previous_purpose == purpose and np.linalg.norm((box[:2] + box[2:]) / 2 - center) < 80
            for box, previous_purpose in recent
        )
        source = reduced_projection if previously_reviewed and reduced_projection is not None else image
        selected.append(center)
        zoom = predictor.predict_context(source.crop(bounds), purpose=purpose, threshold=0.32, include_source_image=False)
        if not len(zoom):
            continue
        zoom.xyxy += (left, top, left, top)
        labels = zoom.data["class_name"]
        zoom = zoom[np.isin(labels, tuple(limits))]
        zoom.data = {"class_name": zoom.data["class_name"]}
        if not len(zoom):
            continue
        labels, scores, boxes = zoom.data["class_name"], zoom.confidence, zoom.xyxy
        dimensions = boxes[:, 2:] - boxes[:, :2]
        centers = (boxes[:, :2] + boxes[:, 2:]) / 2
        same = same_piece(boxes, dimensions, centers, sv, np)
        rivals = np.where(same & (labels[:, None] != labels), scores, 0).max(axis=1)
        support = (sv.box_iou_batch(boxes, detections.xyxy).max(axis=1, initial=0) >= 0.28
                   if len(detections) else np.zeros(len(zoom), dtype=bool))
        distance = np.linalg.norm(centers - center, axis=1)
        central = distance <= 245
        # Independent pieces pass separately. A result without an overview
        # proposal needs stronger evidence and must be close to the crop center.
        cutoff = np.array([limits[label] for label in labels])
        # New detections should be compact. Existing coarse pieces supply
        # support for taller figures without adding a duplicate by the crop edge.
        compact = np.max(dimensions, axis=1) <= 144
        unseeded_class = (labels == "malfunction") if purpose == "crowd" else (labels == "alien") & (purpose == "figure")
        new_near_anchor = unseeded_class & compact & (distance <= 110) & (scores >= 0.82)
        size_ok = compact | np.isin(labels, ["alien", "character"])
        accepted = central & size_ok & (scores >= cutoff) & (scores >= rivals + 0.085) & (support | new_near_anchor)
        if len(baseline):
            players = baseline.xyxy[(baseline.data["class_name"] == "character") & (baseline.confidence >= 0.62)]
            if len(players):
                # Only a focused figure review can overturn a reliable player.
                overlap = sv.box_iou_batch(boxes, players).max(axis=1)
                accepted &= (labels == "character") | (overlap < 0.40) | ((purpose == "figure") & (distance <= 85))
        if accepted.any():
            reviewed.append(zoom[accepted])
            target = {"flame": "fire", "figure": "alien"}.get(purpose, "malfunction")
            focus = accepted & (labels == target)
            best = np.argmin(np.where(focus if focus.any() else accepted, distance, np.inf))
            next_recent.append((boxes[best], purpose))

    if not reviewed:
        return drop_fire_dice_aliases(baseline, sv, np), recent if not selected else []
    refined = sv.Detections.merge(reviewed).with_nms(threshold=0.33)
    if len(reviewed) > 1:
        boxes, labels = refined.xyxy, refined.data["class_name"]
        same = same_piece(boxes, boxes[:, 2:] - boxes[:, :2], (boxes[:, :2] + boxes[:, 2:]) / 2, sv, np)
        conflicting = same & (labels[:, None] != labels)
        refined = refined[~(conflicting & (refined.confidence[:, None] <= refined.confidence)).any(axis=1)]
    if not len(refined):
        return drop_fire_dice_aliases(baseline, sv, np), next_recent
    if not len(baseline):
        return drop_fire_dice_aliases(refined, sv, np), next_recent
    # Remove old aliases only where a close view found the same physical piece.
    boxes = np.concatenate([refined.xyxy, baseline.xyxy])
    same = same_piece(boxes, boxes[:, 2:] - boxes[:, :2], (boxes[:, :2] + boxes[:, 2:]) / 2, sv, np)
    matches = same[:len(refined), len(refined):]
    labels = baseline.data["class_name"]
    matches &= np.isin(labels, tuple(limits))
    coarse = baseline[~matches.any(axis=0)]
    coarse.data = {"class_name": coarse.data["class_name"]}
    result = sv.Detections.merge([refined, coarse])
    corrections = np.full(result.xyxy.shape, np.nan)
    kinds = np.full(len(result), "", dtype="<U80")
    for index, label in enumerate(refined.data["class_name"]):
        changed = matches[index] & (labels != label)
        if changed.any():
            previous = np.argmax(np.where(changed, baseline.confidence, -1))
            corrections[index] = baseline.xyxy[previous]
            kinds[index] = labels[previous]
    result.data["reclassified_box"] = corrections
    result.data["reclassified_kind"] = kinds
    return drop_fire_dice_aliases(result, sv, np), next_recent
