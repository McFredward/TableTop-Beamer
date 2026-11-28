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
    player_conflicts = compact & (labels == "character") & (
        ((scores >= 0.48) & (same & aliases).any(axis=1)) |
        ((scores >= 0.30) & (same & dice).any(axis=1))
    )
    feature_sizes = dimensions.max(axis=1)
    # The figure review can see the base of a large miniature even when its
    # overview box is mistaken for a player's piece or includes its shadow.
    large_aliens = (labels == "alien") & (scores >= 0.055) & (scores < 0.73)
    alien_alternative = np.where(same & large_aliens, scores, 0).max(axis=1, initial=0)
    large_player_conflicts = ((labels == "character") & (scores >= 0.46)
                              & (feature_sizes > 144) & (feature_sizes <= 365)
                              & (dimensions.min(axis=1) >= 76)
                              & ((alien_alternative > 0) | (feature_sizes >= 185))
                              & ~(same & (labels == "alien") & (scores >= 0.80)).any(axis=1))
    marker_proposals = compact & (labels == "malfunction") & (scores >= 0.10) & (scores <= 0.82)
    possible_figures = compact & (labels == "alien") & (scores >= 0.13) & (scores < 0.62)
    larva_proposals = compact & (labels == "larva") & (scores >= 0.42)
    ring_conflicts = compact & (labels == "dice") & (scores >= 0.22) & (scores < 0.76)
    weak_flames = mixed_flames & (scores < 0.82)

    def recent_support(purpose):
        prior = np.array([(box[:2] + box[2:]) / 2 for box, kind in recent if kind == purpose])
        if not len(prior):
            return 0
        distance = np.linalg.norm(centers[:, None] - prior, axis=2).min(axis=1)
        return np.maximum(0, 1 - distance / 170) * 0.25

    joint_markers = None
    if marker_shape is not None:
        likely = marker_proposals & (scores >= 0.70) & (marker_shape >= 0.58)
        pairs = np.triu(likely & likely[:, None] & (distances >= 170) & (distances <= 395), k=1)
        if pairs.any():
            quality = scores + marker_shape
            i, j = np.unravel_index(np.argmax(np.where(pairs, quality + quality[:, None], -1)), pairs.shape)
            joint_markers = ((centers[i] + centers[j]) / 2, "marker")

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
    larva_order = np.flatnonzero(larva_proposals)
    priority = scores + recent_support("figure")
    larva_centers = []
    for index in larva_order[np.argsort(-priority[larva_order], kind="stable")]:
        if all(np.linalg.norm(centers[index] - point) >= 170 for point in larva_centers):
            larva_centers.append(centers[index])
    if joint_markers is not None and len(larva_centers) < 3:
        # Both pieces fit near the center of one native-resolution crop.
        yield joint_markers
    if large_player_conflicts.any():
        priority = scores + feature_sizes / 720 + 0.65 * (alien_alternative > 0) + alien_alternative
        choices = np.flatnonzero(large_player_conflicts)
        for index in choices[np.argsort(-priority[choices], kind="stable")[:2]]:
            yield centers[index], "figure"
    # Close views can resolve a larva even when the overview labels its
    # low-profile miniature as a player or corpse.
    for center in larva_centers:
        yield center, "figure"
    if joint_markers is not None and len(larva_centers) >= 3:
        yield joint_markers
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


def resolve_fire_dice_aliases(detections, sv, np):
    """Use one label for a piece with overlapping fire and dice predictions."""
    if not len(detections):
        return detections
    labels = detections.data["class_name"]
    fire = np.flatnonzero(labels == "fire")
    dice = np.flatnonzero(labels == "dice")
    if not len(fire) or not len(dice):
        return detections
    same = sv.box_iou_batch(detections.xyxy[fire], detections.xyxy[dice]) >= 0.67
    decisive_fire = detections.confidence[fire, None] > detections.confidence[dice] + 0.32
    plausible_dice = detections.confidence[dice] >= 0.42
    strong_fire = detections.confidence[fire, None] >= 0.72
    keep = np.ones(len(detections), dtype=bool)
    keep[fire] = ~(same & plausible_dice & ~decisive_fire).any(axis=1)
    keep[dice] = ~(same & strong_fire & decisive_fire).any(axis=0)
    return detections[keep]


def discard_large_alien_aliases(detections, sv, np):
    boxes = detections.xyxy
    labels, scores = detections.data["class_name"], detections.confidence
    size = boxes[:, 2:] - boxes[:, :2]
    largest = size.max(axis=1)
    adults = np.flatnonzero((labels == "alien") & (largest >= 145) & (scores >= 0.80))
    if not len(adults):
        return detections
    areas = size.prod(axis=1)
    iou = sv.box_iou_batch(boxes[adults], boxes)
    inside = iou / (1 + iou) * (areas[adults, None] + areas) >= 0.80 * areas
    smaller = areas[adults, None] >= 1.50 * areas
    player_alias = (labels == "character") & ((iou >= 0.66) |
                  (inside & smaller & (scores < 0.91)))
    player_alias &= scores[adults, None] + 0.10 >= scores
    # Use a single ranking for both overlaps and contained fragments so
    # two overlapping candidates cannot eliminate one another.
    priority = scores + 0.15 * np.minimum(largest / 185, 1.45)
    order = np.arange(len(detections))
    preferred = (priority[adults, None] > priority) | (
        (priority[adults, None] == priority) & (adults[:, None] < order))
    duplicate = (labels == "alien") & (largest > 95) & preferred & (
        (iou >= 0.47) | (inside & smaller))
    return detections[~(player_alias | duplicate).any(axis=0)]


def resolve_piece_aliases(detections, sv, np):
    """Keep the strongest miniature label when predictions overlap the same piece."""
    if not len(detections):
        return detections
    detections = discard_large_alien_aliases(detections, sv, np)
    boxes = detections.xyxy
    labels = detections.data["class_name"]
    scores = detections.confidence
    minis = np.flatnonzero(np.isin(labels, ["character", "corpse", "door"]))
    if len(minis) > 1:
        parts = boxes[minis]
        areas = np.prod(parts[:, 2:] - parts[:, :2], axis=1)
        iou = sv.box_iou_batch(parts, parts)
        intersection = iou / (1 + iou) * (areas[:, None] + areas)
        contained = (intersection >= areas * 0.86) & (areas[:, None] >= areas * 1.45)
        contained &= labels[minis, None] == labels[minis]
        contained &= scores[minis, None] + 0.08 >= scores[minis]
        keep = np.ones(len(detections), dtype=bool)
        keep[minis[contained.any(axis=0)]] = False
        detections = detections[keep]
        boxes, labels, scores = detections.xyxy, detections.data["class_name"], detections.confidence
    preferred = np.flatnonzero((np.isin(labels, ["corpse", "door", "xeno-corpse"]) & (scores >= 0.70)) |
                             ((labels == "character") & (scores >= 0.74)))
    rivals = np.flatnonzero(np.isin(labels, ["alien", "character", "corpse", "dice", "fire", "malfunction", "noise", "xeno-corpse"]))
    if not len(preferred) or not len(rivals):
        return resolve_fire_dice_aliases(detections, sv, np)
    corpse_or_door = np.isin(labels[preferred, None], ["corpse", "door"])
    xeno_token = labels[preferred, None] == "xeno-corpse"
    competing = np.where(corpse_or_door, labels[preferred, None] != labels[rivals],
                         np.where(xeno_token, labels[rivals] == "malfunction", np.isin(labels[rivals], ["dice", "xeno-corpse"])))
    overlap = sv.box_iou_batch(boxes[preferred], boxes[rivals])
    player_marker_alias = ((labels[preferred, None] == "character") & (scores[preferred, None] >= 0.88) &
                           (labels[rivals] == "malfunction") & (overlap >= 0.65))
    competing |= player_marker_alias
    weak_rival = corpse_or_door & (scores[preferred, None] >= 0.86) & (scores[rivals] < 0.62)
    weak_rival |= ((labels[preferred, None] == "door") & (labels[rivals] == "corpse") &
                   (scores[preferred, None] >= 0.85) & (scores[preferred, None] > scores[rivals]))
    matches = competing & (overlap >= np.where(weak_rival, 0.42, np.where(corpse_or_door | xeno_token, 0.54, 0.64)))
    contained = ((boxes[preferred, None, :2] <= boxes[rivals, :2]) &
                 (boxes[preferred, None, 2:] >= boxes[rivals, 2:])).all(axis=2)
    matches |= ((labels[preferred, None] == "door") & (labels[rivals] == "corpse") & contained &
                (overlap >= 0.27) & (scores[preferred, None] >= scores[rivals] + 0.07))
    matches &= scores[preferred, None] >= scores[rivals] + np.where(corpse_or_door, -0.06, 0.10)
    matches &= (labels[rivals] != "corpse") | (scores[preferred, None] > scores[rivals])
    if not matches.any():
        return resolve_fire_dice_aliases(detections, sv, np)
    corrections = detections.data.get("reclassified_box", np.full(detections.xyxy.shape, np.nan)).copy()
    kinds = detections.data.get("reclassified_kind", np.full(len(detections), "", dtype="<U80")).copy()
    for row in np.flatnonzero(matches.any(axis=1)):
        winner = preferred[row]
        loser = rivals[np.argmax(np.where(matches[row], scores[rivals], -1))]
        corrections[winner] = detections.xyxy[loser]
        kinds[winner] = labels[loser]
    keep = np.ones(len(detections), dtype=bool)
    keep[rivals[matches.any(axis=0)]] = False
    result = detections[keep]
    result.data["reclassified_box"] = corrections[keep]
    result.data["reclassified_kind"] = kinds[keep]
    return resolve_fire_dice_aliases(result, sv, np)


def refine_board_context(predictor, image, detections, threshold, recent=(), reduced_projection=None,
                         deadline=None, survey=False):
    """Review up to three neighborhoods at native resolution with one model pass each."""
    import numpy as np
    import supervision as sv

    marker_shape = None
    overview_shape = None
    has_marker_rank = hasattr(predictor, "rank_markers")
    match_escape_pods = getattr(predictor, "match_escape_pods", None)
    marker_image = image.convert("L") if has_marker_rank or match_escape_pods else None
    marker_reference = reduced_projection.convert("L") if has_marker_rank and reduced_projection is not None else None
    verified_shapes = []

    def discard_capsule_aliases(candidates):
        if match_escape_pods and len(candidates):
            players = np.flatnonzero((candidates.data["class_name"] == "character") &
                                     (candidates.confidence >= 0.50))
            if len(players):
                capsules = match_escape_pods(marker_image, candidates.xyxy[players], np)
                if capsules is not None and capsules.any():
                    keep = np.ones(len(candidates), dtype=bool)
                    keep[players[capsules]] = False
                    return candidates[keep]
        return candidates

    def rank_marker_views(rank, boxes):
        raw = rank(marker_image, boxes, np)
        if raw is None or marker_reference is None:
            return raw
        # A short pixel minimum removes the moving highlight while the
        # current frame remains evidence if a marker has just appeared.
        return np.maximum(raw, rank(marker_reference, boxes, np))

    def rank_markers(boxes, paired=False):
        rank = getattr(predictor, "rank_markers_near_fire", predictor.rank_markers) if paired else predictor.rank_markers
        return rank_marker_views(rank, boxes)

    def align_marker_shape(boxes, scores):
        # Overview boxes move by several pixels as the projector changes the
        # contrast. Check a small displacement before discarding a good logit.
        dimensions = np.tile((boxes[:, 2:] - boxes[:, :2]) * 0.12, (1, 2))
        offsets = np.array([[-1, -1], [1, -1], [-1, 1], [1, 1]])
        moved = boxes[:, None, :] + dimensions[:, None, :] * np.tile(offsets, (1, 2))
        nearby = rank_markers(moved.reshape(-1, 4)).reshape(-1, len(offsets))
        return np.maximum(scores, nearby.max(axis=1))

    detections = discard_capsule_aliases(detections)
    if len(detections):
        labels = detections.data["class_name"]
        scores = detections.confidence
        visible = scores >= np.maximum(threshold, np.select(
            [labels == "character", labels == "corpse", labels == "door", labels == "xeno-corpse"],
            [0.50, 0.73, 0.78, 0.67],
        ))
        visible &= (labels != "") & (labels != "larva")
        if has_marker_rank:
            dims = detections.xyxy[:, 2:] - detections.xyxy[:, :2]
            candidates = (labels == "malfunction") & (scores >= 0.10) & np.all((dims >= 26) & (dims <= 144), axis=1)
            ranked = rank_markers(detections.xyxy[candidates])
            if ranked is not None:
                marker_shape = np.zeros(len(detections))
                marker_shape[candidates] = ranked
                align = candidates & (scores >= 0.75) & (marker_shape >= 0.63) & (marker_shape < 0.86)
                if align.any():
                    marker_shape[align] = align_marker_shape(detections.xyxy[align], marker_shape[align])
                overview_shape = marker_shape.copy()
                possible_glare = candidates & (scores >= 0.75) & (marker_shape < 0.86)
                projection_rank = getattr(predictor, "rank_projected_markers", None)
                if projection_rank and possible_glare.any():
                    # An independent shape fit for bright projections can
                    # confirm a good overview reading without steering crops.
                    boxes = detections.xyxy[possible_glare]
                    corroboration = rank_marker_views(projection_rank, boxes)
                    if corroboration is not None:
                        uncertain = (corroboration >= 0.30) & (corroboration < 0.86)
                        if uncertain.any():
                            region = boxes[uncertain]
                            center = (region[:, :2] + region[:, 2:]) / 2
                            dimensions = region[:, 2:] - region[:, :2]
                            offsets = np.array([[0, -0.23], [0, 0.23], [-0.15, 0], [0.15, 0], [0, 0]])
                            shifted = center[:, None] + dimensions[:, None] * offsets
                            half = dimensions[:, None] * (0.5 * np.array([0.9, 0.9, 0.9, 0.9, 0.81])[None, :, None])
                            aligned = np.concatenate([shifted - half, shifted + half], axis=2)
                            nearby = rank_marker_views(projection_rank, aligned.reshape(-1, 4)).reshape(-1, len(offsets))
                            corroboration[uncertain] = np.maximum(corroboration[uncertain], nearby.max(axis=1))
                        overview_shape[possible_glare] = np.maximum(overview_shape[possible_glare], corroboration)
                visible &= (labels != "malfunction") | (scores > 0.82) | (overview_shape >= 0.66)
        baseline = detections[visible]
    else:
        baseline = detections
    previous_markers = [(box, purpose) for box, purpose in recent if purpose in ("marker", "marker-gap")]
    if has_marker_rank and previous_markers:
        previous_boxes = np.array([box for box, _ in previous_markers])
        padding = 0.08 * (previous_boxes[:, 2:] - previous_boxes[:, :2])
        expanded = previous_boxes + np.concatenate([-padding, padding], axis=1)
        evidence = rank_markers(previous_boxes)
        if evidence is not None:
            evidence = np.maximum(evidence, rank_markers(expanded))
            verified_shapes = [box for (box, purpose), value in zip(previous_markers, evidence, strict=True)
                               if purpose == "marker" and value >= 0.86]
            recent = [(box, purpose) for box, purpose in recent if purpose not in ("marker", "marker-gap")]
            recent += [(box, purpose) for (box, purpose), value in zip(previous_markers, evidence, strict=True)
                       if value >= 0.71]
    if len(baseline):
        dimensions = baseline.xyxy[:, 2:] - baseline.xyxy[:, :2]
        uncertain = ((baseline.data["class_name"] == "malfunction") & (baseline.confidence <= 0.82) &
                     np.all((dimensions >= 26) & (dimensions <= 144), axis=1))
        if overview_shape is not None:
            # Keep a strong reading when both the model and shape agree.
            uncertain &= (baseline.confidence < 0.75) | (overview_shape[visible] < 0.86)
        baseline.confidence[uncertain] = np.minimum(baseline.confidence[uncertain], 0.60)

    limits = {"fire": 0.72, "dice": 0.79, "malfunction": 0.68, "alien": 0.73,
              "character": 0.78, "corpse": 0.78, "door": 0.78, "xeno-corpse": 0.67}
    reviewed = []
    selected = []
    next_recent = []
    verified_aliens = []
    for center, purpose in review_anchors(detections, recent, sv, np, survey, marker_shape):
        if any(np.linalg.norm(center - previous) < 170 for previous in selected):
            continue
        if purpose == "figure" and any(np.linalg.norm(center - previous) < 80 for previous in verified_aliens):
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
        zoom = discard_capsule_aliases(zoom)
        if not len(zoom):
            continue
        labels = zoom.data["class_name"]
        zoom = zoom[np.isin(labels, (*limits, "larva"))]
        zoom.data = {"class_name": zoom.data["class_name"]}
        if not len(zoom):
            continue
        labels, scores, boxes = zoom.data["class_name"].copy(), zoom.confidence, zoom.xyxy
        dimensions = boxes[:, 2:] - boxes[:, :2]
        centers = (boxes[:, :2] + boxes[:, 2:]) / 2
        same = same_piece(boxes, dimensions, centers, sv, np)
        support = np.zeros(len(zoom), dtype=bool)
        corroborated_larvae = np.zeros(len(zoom), dtype=bool)
        if len(detections):
            overlaps = sv.box_iou_batch(boxes, detections.xyxy)
            marker_hints = (detections.data["class_name"] == "malfunction") & (detections.confidence >= 0.10)
            support = np.where(labels == "malfunction", overlaps[:, marker_hints].max(axis=1, initial=0),
                               overlaps.max(axis=1)) >= 0.27
            larva_hints = (detections.data["class_name"] == "larva") & (overlaps >= 0.32)
            overview_larva = np.where(larva_hints, detections.confidence, 0).max(axis=1)
            corroborated_larvae = ((labels == "larva") & (overview_larva >= 0.38) &
                                  (scores >= np.where(overview_larva >= 0.65, 0.76, 0.80)) &
                                  np.all((dimensions >= 26) & (dimensions <= 144), axis=1))
        scores[(labels == "larva") & ~corroborated_larvae] = 0
        labels[labels == "larva"] = "alien"
        zoom.data["class_name"] = labels
        competing_mini = np.isin(labels, ["alien", "character", "malfunction", "corpse", "xeno-corpse"]) & ~corroborated_larvae
        scores[competing_mini & (same & corroborated_larvae).any(axis=1)] = 0
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
        if has_marker_rank and marker_checks.any() and (shape := rank_markers(boxes[marker_checks], paired)) is not None:
            strong_shape = shape >= 0.86
            shape_supported[marker_checks] = strong_shape
            # Require agreement on the shape to lift a weak model reading.
            scores[marker_checks] = np.where(strong_shape, np.maximum(scores[marker_checks], (scores[marker_checks] + shape) / 2),
                                             np.where(shape >= 0.35, scores[marker_checks], 0))
        unseeded_class = {"crowd": "malfunction", "figure": "alien", "flame": "fire"}.get(purpose)
        discovery_confidence = 0.82 if purpose == "figure" else 0.88
        new_near_anchor = (labels == unseeded_class) & compact & (distance <= 110) & (scores >= discovery_confidence)
        if purpose in ("marker", "crowd"):
            # A small alien beside a marker may only be resolved at this scale.
            new_near_anchor |= (labels == "alien") & compact & (distance <= 120) & (scores >= 0.88)
        size_ok = compact | np.isin(labels, ["alien", "character", "door"])
        rivals = np.where(same & (labels[:, None] != labels), scores, 0).max(axis=1)
        accepted = central & size_ok & (scores >= cutoff) & (scores >= rivals + 0.085) & (support | new_near_anchor | shape_supported)
        if len(baseline):
            players = baseline.xyxy[(baseline.data["class_name"] == "character") & (baseline.confidence >= 0.62)]
            if len(players):
                # Only a focused figure review can overturn a reliable player.
                overlap = sv.box_iou_batch(boxes, players).max(axis=1)
                accepted &= ((labels == "character") | (overlap < 0.40) | corroborated_larvae |
                             ((purpose == "figure") & (distance <= 85)))
        if accepted.any():
            reviewed.append(zoom[accepted])
            verified_aliens.extend(centers[accepted & (labels == "alien")])
            target = {"flame": "fire", "figure": "alien"}.get(purpose, "malfunction")
            focus = accepted & (labels == target)
            best = np.argmin(np.where(focus if focus.any() else accepted, distance, np.inf))
            if purpose != "marker":
                next_recent.append((boxes[best], purpose))
            for box in zoom.xyxy[accepted & (labels == "malfunction")]:
                if not any(kind == "marker" and sv.box_iou_batch(box[None, :], old[None, :])[0, 0] >= 0.35
                           for old, kind in next_recent):
                    next_recent.append((box, "marker"))

    if not reviewed:
        next_recent = list(recent) if not selected else []
    marker_boxes = [box for box, kind in next_recent if kind == "marker"]
    if len(baseline):
        marker_boxes.extend(baseline.xyxy[(baseline.data["class_name"] == "malfunction") & (baseline.confidence >= 0.68)])
    if verified_shapes:
        # Bridge an illumination gap independently for each previously confirmed
        # marker. A gap reading cannot start an effect or bridge another gap.
        supports = np.asarray(marker_boxes).reshape(-1, 4)
        gaps = np.asarray(verified_shapes)
        gaps = gaps[sv.box_iou_batch(gaps, supports).max(axis=1, initial=0) < 0.35]
        if len(gaps):
            template = baseline if len(baseline) else reviewed[0] if reviewed else detections
            ids = template.class_id if len(template) else None
            marker_ids = ids[template.data["class_name"] == "malfunction"] if ids is not None else None
            gap = sv.Detections(xyxy=gaps, confidence=np.full(len(gaps), 0.57),
                                class_id=np.full(len(gaps), marker_ids[0] if len(marker_ids) else -1) if ids is not None else None,
                                data={"class_name": np.full(len(gaps), "malfunction")})
            if len(baseline):
                baseline.data = {"class_name": baseline.data["class_name"]}
                baseline = sv.Detections.merge([baseline, gap])
            else:
                baseline = gap
            next_recent.extend((box, "marker-gap") for box in gaps)

    if not reviewed:
        return resolve_piece_aliases(baseline, sv, np), next_recent
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
