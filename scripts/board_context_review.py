"""Local RF-DETR review of competing board-piece labels and crowded areas."""

from time import monotonic


def same_piece(boxes, dimensions, centers, sv, np):
    """Match a piece across scales without conflating adjacent pieces."""
    offsets = np.abs(centers[:, None] - centers)
    smaller = np.minimum(dimensions[:, None], dimensions)
    larger = np.maximum(dimensions[:, None], dimensions)
    aligned = np.all((offsets <= smaller * 0.30) & (smaller >= larger * 0.55), axis=2)
    return aligned | (sv.box_iou_batch(boxes, boxes) >= 0.45)


def review_anchors(detections, recent, sv, np, survey=False, marker_shape=None):
    boxes = detections.xyxy
    labels = detections.data.get("class_name", np.empty(0))
    scores = detections.confidence if len(detections) else np.empty(0)
    dimensions = boxes[:, 2:] - boxes[:, :2]
    centers = (boxes[:, :2] + boxes[:, 2:]) / 2
    compact = np.all((dimensions >= 26) & (dimensions <= 144), axis=1)
    same = same_piece(boxes, dimensions, centers, sv, np) if len(boxes) else np.zeros((0, 0), dtype=bool)
    distances = np.linalg.norm(centers[:, None] - centers, axis=2)
    flames = compact & (labels == "fire") & (scores >= 0.19)
    dice = compact & (labels == "dice") & (scores >= 0.24)
    figures = np.isin(labels, ["character", "alien"]) & (scores >= 0.60)
    mixed_flames = flames & ~(same & dice & (scores >= 0.62)).any(axis=1)
    packed = (distances < 135) & ~same
    adjacent_dice = (distances <= 228) & ~same & dice
    die_alias = dice & (same & flames).any(axis=1)
    pairs = 0.9 * die_alias + 0.7 * (1 - distances / 228) + 0.12 * scores
    paired_evidence = np.where(adjacent_dice, pairs, 0).max(axis=1, initial=0)
    # Multiple nearby dice often light up in the same projection as the fire.
    # Review the whole group even when the overview only sees weak proposals.
    close_dice = (distances <= 200) & dice
    covered_dice = close_dice.sum(axis=1)
    dice_pairs = dice & (covered_dice >= 2) & (close_dice & die_alias).any(axis=1)
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
        ((mixed_flames & adjacent_dice.any(axis=1)) | dice_pairs,
         paired_evidence + 0.75 * np.minimum(covered_dice, 2) + scores * 0.22 + recent_support("flame"), "flame"),
        (mixed_flames & (packed & figures).any(axis=1),
         np.where(packed & figures, 1 - distances / 135, 0).max(axis=1, initial=0) + scores * 0.25, "crowd"),
        (player_conflicts, scores + recent_support("figure"), "figure"),
        (marker_proposals, scores + recent_support("marker") + (2.4 * marker_shape if marker_shape is not None else 0), "marker"),
        (possible_figures | ring_conflicts | weak_flames, scores, "general"),
    )
    groups = [[(centers[i], purpose) for i in np.flatnonzero(mask)[np.argsort(-priority[mask], kind="stable")]]
              for mask, priority, purpose in groups]
    if marker_shape is not None and groups[3]:
        target = groups[3][0][0]
        promising = (marker_proposals & (np.linalg.norm(centers - target, axis=1) < 1) & (marker_shape >= 0.68)).any()
        previous_marker = next(((box[:2] + box[2:]) / 2 for box, kind in recent if kind in ("marker", "marker-gap")), None)
        if previous_marker is not None:
            target, promising = previous_marker, True
        if promising and previous_marker is None:
            # Center an initial shape check on the candidate. Later reviews
            # can share the crop once the marker has a reliable position.
            groups[1].insert(0, groups[3].pop(0))
        elif promising and groups[1] and np.linalg.norm(groups[1][0][0] - target) <= 425:
            # Keep both promising areas in view with one close prediction.
            groups[1][0] = (groups[1][0][0] * 0.44 + target * 0.56, "crowd")
            if np.linalg.norm(groups[3][0][0] - target) < 135:
                groups[3].pop(0)
        elif promising and not groups[1]:
            groups[1].append(groups[3].pop(0))
    # Fire can distort a neighboring marker's shape at overview scale.
    # Check that pair together before spending the crop on weaker proposals.
    nearby_fire = np.where(packed & flames & (scores >= 0.40), 1 - distances / 135, 0).max(axis=1, initial=0)
    marker_by_fire = marker_proposals & (scores >= 0.75) & (nearby_fire > 0)
    if marker_by_fire.any():
        priority = scores + nearby_fire
        marker = np.argmax(np.where(marker_by_fire, priority, -1))
        groups[1].insert(0, (centers[marker], "marker-fire"))
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


def resolve_piece_aliases(detections, sv, np):
    """Keep the strongest miniature label when predictions overlap the same piece."""
    if not len(detections):
        return detections
    boxes = detections.xyxy
    labels = detections.data["class_name"]
    scores = detections.confidence
    corpses = np.flatnonzero(labels == "corpse")
    if len(corpses) > 1:
        parts = boxes[corpses]
        areas = np.prod(parts[:, 2:] - parts[:, :2], axis=1)
        iou = sv.box_iou_batch(parts, parts)
        intersection = iou / (1 + iou) * (areas[:, None] + areas)
        contained = (intersection >= areas * 0.86) & (areas[:, None] >= areas * 1.45)
        contained &= scores[corpses, None] + 0.08 >= scores[corpses]
        keep = np.ones(len(detections), dtype=bool)
        keep[corpses[contained.any(axis=0)]] = False
        detections = detections[keep]
        boxes, labels, scores = detections.xyxy, detections.data["class_name"], detections.confidence
    figures = np.flatnonzero(((labels == "corpse") & (scores >= 0.70)) |
                             ((labels == "character") & (scores >= 0.74)))
    rivals = np.flatnonzero(np.isin(labels, ["alien", "character", "dice", "fire", "malfunction", "noise"]))
    if not len(figures) or not len(rivals):
        return drop_fire_dice_aliases(detections, sv, np)
    corpse = labels[figures, None] == "corpse"
    competing = np.where(corpse, labels[rivals] != "corpse", labels[rivals] == "dice")
    overlap = sv.box_iou_batch(boxes[figures], boxes[rivals])
    weak_rival = corpse & (scores[figures, None] >= 0.86) & (scores[rivals] < 0.62)
    matches = competing & (overlap >= np.where(weak_rival, 0.42, np.where(corpse, 0.54, 0.64)))
    matches &= scores[figures, None] >= scores[rivals] + np.where(corpse, -0.06, 0.10)
    if not matches.any():
        return drop_fire_dice_aliases(detections, sv, np)
    corrections = detections.data.get("reclassified_box", np.full(detections.xyxy.shape, np.nan)).copy()
    kinds = detections.data.get("reclassified_kind", np.full(len(detections), "", dtype="<U80")).copy()
    for row in np.flatnonzero(matches.any(axis=1)):
        winner = figures[row]
        loser = rivals[np.argmax(np.where(matches[row], scores[rivals], -1))]
        corrections[winner] = detections.xyxy[loser]
        kinds[winner] = labels[loser]
    keep = np.ones(len(detections), dtype=bool)
    keep[rivals[matches.any(axis=0)]] = False
    result = detections[keep]
    result.data["reclassified_box"] = corrections[keep]
    result.data["reclassified_kind"] = kinds[keep]
    return drop_fire_dice_aliases(result, sv, np)


def refine_board_context(predictor, image, detections, threshold, recent=(), reduced_projection=None,
                         deadline=None, survey=False):
    """Review up to three neighborhoods at native resolution with one model pass each."""
    import numpy as np
    import supervision as sv

    marker_shape = None
    marker_image = None
    marker_reference = None
    verified_shapes = []

    def rank_markers(boxes, paired=False):
        rank = getattr(predictor, "rank_markers_near_fire", predictor.rank_markers) if paired else predictor.rank_markers
        raw = rank(marker_image, boxes, np)
        if raw is None or marker_reference is None:
            return raw
        # A short pixel minimum removes the moving highlight while the
        # current frame remains evidence if a marker has just appeared.
        return np.maximum(raw, rank(marker_reference, boxes, np))

    if len(detections):
        labels = detections.data["class_name"]
        scores = detections.confidence
        visible = scores >= np.where(labels == "corpse", max(threshold, 0.73), threshold)
        visible &= labels != ""
        if hasattr(predictor, "rank_markers"):
            marker_image = image.convert("L")
            marker_reference = reduced_projection.convert("L") if reduced_projection is not None else None
            dims = detections.xyxy[:, 2:] - detections.xyxy[:, :2]
            candidates = (labels == "malfunction") & (scores >= 0.10) & np.all((dims >= 26) & (dims <= 144), axis=1)
            ranked = rank_markers(detections.xyxy[candidates])
            if ranked is not None:
                marker_shape = np.zeros(len(detections))
                marker_shape[candidates] = ranked
                visible &= (labels != "malfunction") | (scores > 0.82) | (marker_shape >= 0.66)
                previous_markers = [(box, purpose) for box, purpose in recent if purpose in ("marker", "marker-gap")]
                if previous_markers:
                    previous_boxes = np.array([box for box, _ in previous_markers])
                    padding = 0.08 * (previous_boxes[:, 2:] - previous_boxes[:, :2])
                    expanded = previous_boxes + np.concatenate([-padding, padding], axis=1)
                    evidence = np.maximum(rank_markers(previous_boxes), rank_markers(expanded))
                    verified_shapes = [box for (box, purpose), value in zip(previous_markers, evidence, strict=True)
                                       if purpose == "marker" and value >= 0.86]
                    recent = [(box, purpose) for box, purpose in recent if purpose not in ("marker", "marker-gap")]
                    recent += [(box, purpose) for (box, purpose), value in zip(previous_markers, evidence, strict=True)
                               if value >= 0.71]
        baseline = detections[visible]
    else:
        baseline = detections
    if len(baseline):
        dimensions = baseline.xyxy[:, 2:] - baseline.xyxy[:, :2]
        uncertain = ((baseline.data["class_name"] == "malfunction") & (baseline.confidence <= 0.82) &
                     np.all((dimensions >= 26) & (dimensions <= 144), axis=1))
        if marker_shape is not None:
            # Keep a strong reading when both the model and shape agree.
            uncertain &= (baseline.confidence < 0.75) | (marker_shape[visible] < 0.86)
        baseline.confidence[uncertain] = np.minimum(baseline.confidence[uncertain], 0.60)

    limits = {"fire": 0.72, "dice": 0.79, "malfunction": 0.68, "alien": 0.73, "character": 0.78, "corpse": 0.78}
    reviewed = []
    selected = []
    next_recent = []
    for center, purpose in review_anchors(detections, recent, sv, np, survey, marker_shape):
        if any(np.linalg.norm(center - previous) < 170 for previous in selected):
            continue
        if len(selected) == 3 or (deadline is not None and monotonic() >= deadline):
            break
        paired = purpose == "marker-fire"
        if paired:
            purpose = "marker"
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
        marker_under_projection = purpose in ("marker", "crowd") and any(
            previous_purpose in ("marker", "marker-gap") and np.linalg.norm((box[:2] + box[2:]) / 2 - center) <= 245
            for box, previous_purpose in recent
        )
        source = reduced_projection if reduced_projection is not None and (previously_reviewed or marker_under_projection) else image
        selected.append(center)
        measure = "marker" if marker_under_projection else purpose
        zoom = predictor.predict_context(source.crop(bounds), purpose=measure, threshold=0.32, include_source_image=False)
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
        support = np.zeros(len(zoom), dtype=bool)
        if len(detections):
            overlaps = sv.box_iou_batch(boxes, detections.xyxy)
            marker_hints = (detections.data["class_name"] == "malfunction") & (detections.confidence >= 0.10)
            support = np.where(labels == "malfunction", overlaps[:, marker_hints].max(axis=1, initial=0),
                               overlaps.max(axis=1)) >= 0.27
        distance = np.linalg.norm(centers - center, axis=1)
        central = distance <= 245
        # Independent pieces pass separately. A result without an overview
        # proposal needs stronger evidence and must be close to the crop center.
        cutoff = np.array([limits[label] for label in labels])
        # New detections should be compact. Existing coarse pieces supply
        # support for taller figures without adding a duplicate by the crop edge.
        compact = np.max(dimensions, axis=1) <= 144
        marker_checks = compact & central & (labels == "malfunction") & (scores >= 0.40)
        shape_supported = np.zeros(len(zoom), dtype=bool)
        if marker_shape is not None and marker_checks.any():
            shape = rank_markers(boxes[marker_checks], paired)
            strong_shape = shape >= 0.86
            shape_supported[marker_checks] = strong_shape
            # Require agreement on the shape to lift a weak model reading.
            scores[marker_checks] = np.where(strong_shape, np.maximum(scores[marker_checks], (scores[marker_checks] + shape) / 2),
                                             np.where(shape >= 0.35, scores[marker_checks], 0))
        unseeded_class = {"crowd": "malfunction", "figure": "alien", "flame": "fire"}.get(purpose)
        discovery_confidence = 0.82 if purpose == "figure" else 0.88
        new_near_anchor = (labels == unseeded_class) & compact & (distance <= 110) & (scores >= discovery_confidence)
        size_ok = compact | np.isin(labels, ["alien", "character"])
        rivals = np.where(same & (labels[:, None] != labels), scores, 0).max(axis=1)
        accepted = central & size_ok & (scores >= cutoff) & (scores >= rivals + 0.085) & (support | new_near_anchor | shape_supported)
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
            if purpose != "marker" or focus.any():
                next_recent.append((boxes[best], purpose))
            markers = accepted & (labels == "malfunction")
            if purpose == "crowd" and markers.any():
                marker = np.argmax(np.where(markers, scores, -np.inf))
                next_recent.append((boxes[marker], "marker"))

    if verified_shapes and not any(purpose == "marker" for _, purpose in next_recent):
        # Keep one weak, shape-confirmed reading across an illumination gap.
        # It can preserve an existing effect, and a fresh model confirmation
        # is needed before we can bridge another gap.
        rows = np.flatnonzero(detections.data["class_name"] == "malfunction")
        if len(rows):
            gap = detections[rows[:1]]
            gap.xyxy[0] = verified_shapes[0]
            gap.confidence[0] = 0.57
            baseline = sv.Detections.merge([baseline, gap]).with_nms(threshold=0.5)
            next_recent.append((verified_shapes[0], "marker-gap"))

    if not reviewed:
        return resolve_piece_aliases(baseline, sv, np), recent if not selected else []
    refined = sv.Detections.merge(reviewed).with_nms(threshold=0.33)
    if len(reviewed) > 1:
        boxes, labels = refined.xyxy, refined.data["class_name"]
        same = same_piece(boxes, boxes[:, 2:] - boxes[:, :2], (boxes[:, :2] + boxes[:, 2:]) / 2, sv, np)
        conflicting = same & (labels[:, None] != labels)
        refined = refined[~(conflicting & (refined.confidence[:, None] <= refined.confidence)).any(axis=1)]
    if not len(refined):
        return resolve_piece_aliases(baseline, sv, np), next_recent
    if not len(baseline):
        return resolve_piece_aliases(refined, sv, np), next_recent
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
    return resolve_piece_aliases(result, sv, np), next_recent
