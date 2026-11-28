"""Local appearance review for transparent markers and look-alike dice."""

import numpy as np
import torch
from PIL import Image
from torch import nn

PATCH_SIZE = 40
LABELS = ("fire", "dice", "malfunction", "other")


class MarkerAppearance(nn.Sequential):
    def __init__(self):
        super().__init__(
            nn.Conv2d(3, 16, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(16, 24, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(24, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 32, 3, padding=1), nn.ReLU(),
            nn.AdaptiveAvgPool2d((2, 2)), nn.Flatten(), nn.Linear(128, len(LABELS)),
        )

    @classmethod
    def load(cls, path, device):
        model = cls()
        with np.load(path, allow_pickle=False) as weights:
            model.load_state_dict({key: torch.from_numpy(weights[key].astype(np.float32)) for key in weights.files})
        return model.to(device).eval()

    @torch.inference_mode()
    def rank(self, image, boxes):
        sizes = boxes[:, 2:] - boxes[:, :2]
        # Loose detector boxes often include the translucent marker's shadow or nearby printing.
        views = np.array([[.66, 0, 0], [.82, 0, 0], [1.05, 0, 0], [.78, -.16, 0],
                          [.78, .16, 0], [.78, 0, -.15], [.78, 0, .15],
                          [.78, -.14, -.12], [.78, .14, .12]])
        center = (boxes[:, :2] + boxes[:, 2:]) / 2
        centers = center[:, None] + sizes[:, None] * views[:, 1:]
        half = sizes.max(axis=1)[:, None, None] * views[None, :, :1] / 2
        bounds = np.concatenate([centers - half, centers + half], axis=-1)
        patches = [image.resize((PATCH_SIZE, PATCH_SIZE), Image.Resampling.BILINEAR, box=tuple(box))
                   for box in bounds.reshape(-1, 4).clip([0, 0, 0, 0], image.size * 2)]
        pixels = torch.from_numpy(np.array(patches)).permute(0, 3, 1, 2)
        device = next(self.parameters()).device
        scores = torch.cat([self(chunk.to(device).float() / 127.5 - 1).softmax(1)
                            for chunk in pixels.split(160)]).cpu().numpy()
        return scores.reshape(len(boxes), len(views), len(LABELS)), bounds


def discard_projection_conflicts(classifier, image, detections):
    """Remove marker detections when close views consistently see other material."""
    if not len(detections):
        return detections
    labels = detections.data["class_name"]
    candidates = np.flatnonzero(np.isin(labels, ("fire", "malfunction")))
    if not len(candidates):
        return detections
    scores, _ = classifier.rank(image, detections.xyxy[candidates])
    fire = labels[candidates] == "fire"
    marker_scores = np.where(fire[:, None], scores[:, :, 0], scores[:, :, 2])
    majority = (scores[:, :, 3] >= 0.68).mean(axis=1)
    contradicted = ((majority >= np.where(fire, 0.55, 0.78)) &
                    (marker_scores.max(axis=1) < np.where(fire, 0.14, 0.55)))
    keep = np.ones(len(detections), dtype=bool)
    keep[candidates[contradicted]] = False
    return detections[keep]


def review_fire_markers(classifier, image, proposals, detections, fire_class_id, sv, np):
    """Check projected marker look-alikes and recover verified fire markers."""
    detections = discard_projection_conflicts(classifier, image, detections)
    if not len(proposals):
        return detections
    labels = proposals.data["class_name"]
    dims = proposals.xyxy[:, 2:] - proposals.xyxy[:, :2]
    eligible = np.isin(labels, ("fire", "dice", "corpse", "xeno-corpse", "malfunction", "door"))
    eligible &= np.all((dims >= 30) & (dims <= 145), axis=1)
    eligible &= proposals.confidence >= np.where(np.isin(labels, ("fire", "dice")), .075, .105)
    seeds = proposals[eligible].with_nms(threshold=.66, class_agnostic=True)
    if not len(seeds):
        return detections
    order = np.argsort(-seeds.confidence, kind="stable")[:128]
    seeds = seeds[order]
    scores, views = classifier.rank(image, seeds.xyxy)
    fire = scores[:, :, 0]
    winner = fire.argmax(axis=1)
    row = np.arange(len(seeds))
    best = fire[row, winner]
    agreed = (fire >= .945).sum(axis=1) >= 2
    valid = (best >= .969) & (agreed | ((seeds.data["class_name"] == "fire") & (seeds.confidence >= .30)))
    if not valid.any():
        return detections
    annotations = sv.Detections(xyxy=views[row, winner][valid].astype(np.float32), confidence=best[valid],
                                class_id=np.full(int(valid.sum()), fire_class_id, dtype=int))
    annotations = annotations.with_nms(threshold=.40, class_agnostic=True)
    previous = detections.data.get("class_name", np.empty(0))
    if len(detections):
        iou = sv.box_iou_batch(detections.xyxy, annotations.xyxy)
        matching = iou >= .40
        same_label = np.isin(previous, ("fire", "dice", "corpse", "xeno-corpse"))
        detections = detections[~(matching.any(axis=1) & same_label)]
    result = sv.Detections(
        xyxy=np.concatenate([detections.xyxy, annotations.xyxy]),
        confidence=np.concatenate([detections.confidence, annotations.confidence]),
        class_id=np.concatenate([detections.class_id if detections.class_id is not None else np.empty(0, dtype=int),
                                 annotations.class_id]),
        data={"class_name": np.concatenate([detections.data.get("class_name", np.empty(0, dtype="<U1")),
                                            np.full(len(annotations), "fire")]),
              "marker_verified": np.concatenate([np.zeros(len(detections), dtype=bool),
                                                  np.ones(len(annotations), dtype=bool)])},
    )
    # Keep existing reclassification evidence for other independently reviewed pieces.
    for key, empty in (("reclassified_kind", np.full(len(annotations), "")),
                       ("reclassified_box", np.full((len(annotations), 4), np.nan))):
        if key in detections.data:
            result.data[key] = np.concatenate([detections.data[key], empty])
    return result
