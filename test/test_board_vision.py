"""Geometry regressions for tiled inference. Uses the vision Python environment."""

import sys
import unittest
from pathlib import Path

try:
    import numpy as np
    from PIL import Image
    import supervision as sv
except ImportError as error:
    raise unittest.SkipTest("Run with the TT-Beamer vision Python environment") from error

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from board_vision import predict_tiled, refine_small_objects, resize_detections
from stream_board_vision import annotate, board_objects


class PixelPredictor:
    """Stand-in detector with exact boxes and masks for colored source pixels."""

    def predict(self, image, **_):
        rgb = np.asarray(image)
        masks = [rgb[:, :, channel] == 255 for channel in (0, 1)]
        boxes, ids, names, used_masks = [], [], [], []
        for class_id, (name, mask) in enumerate(zip(("alien", "fire"), masks, strict=True)):
            ys, xs = np.nonzero(mask)
            if xs.size:
                boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
                ids.append(class_id)
                names.append(name)
                used_masks.append(mask)
        if not boxes:
            return sv.Detections.empty()
        return sv.Detections(xyxy=np.array(boxes, dtype=np.float32), mask=np.array(used_masks),
                             confidence=np.full(len(boxes), 0.9), class_id=np.array(ids),
                             data={"class_name": np.array(names)})


class TileCoordinatesTest(unittest.TestCase):
    def test_overlap_mask_and_anchor_are_mapped_back_to_camera_roi(self):
        pixels = np.zeros((300, 800, 3), dtype=np.uint8)
        pixels[90:126, 345:375, 0] = 255  # Present in both overlapping tiles.
        pixels[177:192, 737:755, 1] = 255
        image = Image.fromarray(pixels)
        detections = predict_tiled(PixelPredictor(), image, 0.5, 500)
        self.assertEqual(len(detections), 2)
        self.assertIsInstance(detections.mask, sv.CompactMask)
        np.testing.assert_allclose(detections.xyxy, [[345, 90, 375, 126], [737, 177, 755, 192]])
        self.assertEqual(detections.mask.area.tolist(), [1080, 270])

        payload = board_objects("frame", {"alien", "fire"}, detections, image.size,
                                (1600, 600), (320, 60, 800, 300), np)
        self.assertEqual(payload["coverage"], [0.2, 0.1, 0.5, 0.5])
        alien = next(item for item in payload["objects"] if item["kind"] == "alien")
        np.testing.assert_allclose(alien["anchor"], [(320 + 359.5) / 1600, (60 + 124.5) / 600])

        preview = image.resize((400, 150))
        scaled = resize_detections(detections, image.size, preview.size)
        np.testing.assert_allclose(scaled.xyxy, detections.xyxy / 2)
        self.assertEqual(scaled.mask.image_shape, (150, 400))
        jpeg = annotate(preview, scaled, (sv.MaskAnnotator(), sv.BoxAnnotator(), sv.LabelAnnotator()), np)
        self.assertTrue(jpeg.startswith(b"\xff\xd8"))

    def test_empty_tiles_publish_a_valid_empty_observation(self):
        image = Image.new("RGB", (800, 300))
        detections = predict_tiled(PixelPredictor(), image, 0.5, 500)
        payload = board_objects("frame", {"fire"}, detections, image.size, image.size, None, np)
        self.assertEqual(payload["objects"], [])
        self.assertEqual(payload["classes"], ["fire"])


class SmallObjectRefinementTest(unittest.TestCase):
    def test_a_matching_character_prevents_amplifying_a_weak_alien_label(self):
        image = Image.new("RGB", (800, 720))
        box = (350, 310, 450, 390)
        coarse = sv.Detections(xyxy=np.array([box, box], dtype=np.float32),
                               confidence=np.array([0.41, 0.13]), class_id=np.array([1, 0]),
                               data={"class_name": np.array(["character", "alien"])})

        class RejectCrop:
            def predict(self, *_args, **_kwargs):
                raise AssertionError("A stronger character already explains this box")

        result, recent = refine_small_objects(RejectCrop(), image, coarse, ["alien"], 0.25)
        self.assertEqual(result.data["class_name"].tolist(), ["character"])
        self.assertEqual(recent, [])

    def test_a_verified_larva_replaces_a_conflicting_malfunction_label(self):
        image = Image.new("RGB", (800, 720), (0, 0, 255))
        reduced = Image.new("RGB", image.size)
        box = (350, 310, 450, 390)
        coarse = sv.Detections(xyxy=np.array([box, box], dtype=np.float32),
                               confidence=np.array([0.1, 0.75]), class_id=np.array([1, 2]),
                               data={"class_name": np.array(["character", "malfunction"])})

        class LarvaOnClearCrop:
            def predict(self, crop, **_):
                if crop.getpixel((0, 0)) != (0, 0, 0):
                    raise AssertionError("The bright projected change should be reduced")
                return sv.Detections(xyxy=np.array([[238, 248, 338, 328]], dtype=np.float32),
                                     confidence=np.array([0.8]), class_id=np.array([0]),
                                     data={"class_name": np.array(["alien"])})

        result, recent = refine_small_objects(LarvaOnClearCrop(), image, coarse, ["alien"], 0.25,
                                              reduced_projection=reduced)
        self.assertEqual(result.data["class_name"].tolist(), ["alien"])
        np.testing.assert_array_equal(result.xyxy, [box])
        again, _ = refine_small_objects(LarvaOnClearCrop(), image, sv.Detections.empty(), ["alien"], 0.25,
                                        recent, reduced)
        self.assertEqual(again.data["class_name"].tolist(), ["alien"])


if __name__ == "__main__":
    unittest.main()
