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

from board_context_review import refine_board_context
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

        with_contours = board_objects("frame", {"alien", "fire"}, detections, image.size,
                                     (1600, 600), (320, 60, 800, 300), np, include_contours=True)
        shape = next(item["contours"][0] for item in with_contours["objects"] if item["kind"] == "alien")
        np.testing.assert_allclose(np.min(shape, axis=0), [(320 + 345) / 1600, (60 + 90) / 600], atol=1e-5)

    def test_reduced_overlap_keeps_the_board_covered_with_four_overview_tiles(self):
        image = Image.new("RGB", (2290, 1400))
        calls = []

        class Detector:
            def predict(self, tile, **_):
                calls.append(tile.size)
                return sv.Detections.empty()

        predict_tiled(Detector(), image, .25, 1280, overlap_fraction=.20)
        self.assertEqual(calls, [(1280, 1280)] * 4)

    def test_empty_tiles_publish_a_valid_empty_observation(self):
        image = Image.new("RGB", (800, 300))
        detections = predict_tiled(PixelPredictor(), image, 0.5, 500)
        payload = board_objects("frame", {"fire"}, detections, image.size, image.size, None, np)
        self.assertEqual(payload["objects"], [])
        self.assertEqual(payload["classes"], ["fire"])


class SmallObjectRefinementTest(unittest.TestCase):
    def test_a_recognized_player_can_replace_a_dice_or_alien_alias_in_the_same_position(self):
        image = Image.new("RGB", (800, 720))
        box = [350, 310, 450, 390]
        labels = np.array(["dice", "alien", "malfunction"])
        coarse = sv.Detections(xyxy=np.array([box, box, [473, 300, 530, 365]], dtype=np.float32),
                               confidence=np.array([0.31, 0.65, 0.92]),
                               class_id=np.array([2, 0, 3]), data={"class_name": labels})

        class PlayerOnCloseCrop:
            def predict(self, _crop, **_):
                return sv.Detections(xyxy=np.array([[302, 310, 402, 390], [302, 310, 402, 390]], dtype=np.float32),
                                     confidence=np.array([0.94, 0.68]), class_id=np.array([1, 0]),
                                     data={"class_name": np.array(["character", "alien"])})

        result, _ = refine_small_objects(PlayerOnCloseCrop(), image, coarse, ["character", "alien"], 0.25)
        self.assertEqual(set(result.data["class_name"]), {"character", "malfunction"})
        payload = board_objects("frame", {"alien", "character", "dice", "malfunction"}, result, image.size, image.size, None, np)
        player = next(piece for piece in payload["objects"] if piece["kind"] == "character")
        self.assertEqual(player["reclassifiedFrom"]["kind"], "alien")

    def test_a_borderline_defect_proposal_stays_uncertain_when_the_detail_pass_runs_out_of_time(self):
        image = Image.new("RGB", (800, 720))
        coarse = sv.Detections(xyxy=np.array([[350, 310, 430, 390], [550, 500, 630, 581]], dtype=np.float32),
                               confidence=np.array([0.74, 0.93]), class_id=np.array([2, 2]),
                               data={"class_name": np.array(["malfunction", "malfunction"])})
        result, recent = refine_small_objects(None, image, coarse, ["alien", "malfunction"], 0.25,
                                              review_malfunctions=True, deadline=0)
        np.testing.assert_allclose(result.confidence, [0.60, 0.93])
        np.testing.assert_allclose(coarse.confidence, [0.74, 0.93])
        self.assertEqual(recent, [])

    def test_a_close_view_recovers_a_weak_defect_without_removing_a_nearby_fire_marker(self):
        image = Image.new("RGB", (800, 720))
        box = [350, 310, 450, 390]
        fire = [322, 360, 392, 434]
        coarse = sv.Detections(xyxy=np.array([box, fire], dtype=np.float32), confidence=np.array([0.19, 0.83]),
                               class_id=np.array([2, 1]), data={"class_name": np.array(["malfunction", "fire"])})

        class DefectOnCloseCrop:
            def predict(self, crop, **_):
                left = 16 if crop.width == 768 else 112
                top = 0 if crop.height == 720 else 62
                boxes = np.array([box, [319, 252, 482, 431]], dtype=np.float32) - [left, top, left, top]
                return sv.Detections(xyxy=boxes,
                                     confidence=np.array([0.76, 0.92]), class_id=np.array([2, 0]),
                                     data={"class_name": np.array(["malfunction", "alien"])})

        result, recent = refine_small_objects(DefectOnCloseCrop(), image, coarse, ["alien", "malfunction"], 0.25,
                                              review_malfunctions=True)
        self.assertEqual(set(result.data["class_name"]), {"fire", "malfunction"})
        self.assertEqual(recent[0][0], "malfunction")
        again, _ = refine_small_objects(DefectOnCloseCrop(), image, sv.Detections.empty(), ["alien", "malfunction"],
                                        0.25, recent, review_malfunctions=True)
        self.assertEqual(again.data["class_name"].tolist(), ["malfunction"])

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
        payload = board_objects("frame", {"alien", "malfunction"}, result, image.size, image.size, None, np)
        self.assertEqual(payload["objects"][0]["reclassifiedFrom"]["kind"], "malfunction")
        np.testing.assert_allclose(payload["objects"][0]["reclassifiedFrom"]["box"], [350/800, 310/720, 100/800, 80/720])
        again, _ = refine_small_objects(LarvaOnClearCrop(), image, sv.Detections.empty(), ["alien"], 0.25,
                                        recent, reduced)
        self.assertEqual(again.data["class_name"].tolist(), ["alien"])


class BoardContextReviewTest(unittest.TestCase):
    @staticmethod
    def detections(objects):
        classes = ["fire", "dice", "malfunction", "alien", "character"]
        return sv.Detections(xyxy=np.array([box for _, _, box in objects], dtype=np.float32),
                             confidence=np.array([score for _, score, _ in objects]),
                             class_id=np.array([classes.index(label) for label, _, _ in objects]),
                             data={"class_name": np.array([label for label, _, _ in objects])})

    def test_one_close_view_keeps_the_marker_and_die_as_independent_pieces(self):
        fire = [296, 308, 359, 368]
        die = [201, 263, 278, 331]
        coarse = self.detections([("dice", .86, die), ("fire", .66, die), ("fire", .30, fire)])
        detail = self.detections([("dice", .97, die), ("fire", .39, die), ("fire", .95, fire)])

        class Predictor:
            def predict_context(self, crop, **_):
                self.size = crop.size
                return detail[:]

        predictor = Predictor()
        image = Image.new("RGB", (960, 800))
        result, recent = refine_board_context(predictor, image, coarse, .25)
        self.assertEqual(predictor.size, (768, 768))
        self.assertEqual(result.data["class_name"].tolist(), ["dice", "fire"])
        self.assertEqual(result.data["reclassified_kind"].tolist(), ["fire", ""])
        np.testing.assert_allclose(result.xyxy, [die, fire])
        self.assertEqual(len(recent), 1)

    def test_two_weak_dice_proposals_can_schedule_a_close_view_for_unseeded_fire(self):
        first = [230, 250, 305, 310]
        second = [345, 250, 420, 310]
        flame = [281, 306, 354, 367]
        coarse = self.detections([("dice", .48, first), ("dice", .39, second), ("fire", .7, second)])
        detail = self.detections([("dice", .95, first), ("dice", .94, second), ("fire", .93, flame)])

        class Predictor:
            def predict_context(self, _crop, *, purpose, **_):
                if purpose != "flame":
                    raise AssertionError("The nearby dice should get a joint fire review")
                return detail[:]

        actual, _ = refine_board_context(Predictor(), Image.new("RGB", (960, 800)), coarse, .25)
        self.assertEqual(actual.data["class_name"].tolist(), ["dice", "dice", "fire"])
        np.testing.assert_allclose(actual.xyxy, [first, second, flame])

    def test_a_competing_dice_box_vetoes_only_overlapping_fire_during_the_overview(self):
        fire = [296, 308, 359, 368]
        die = [201, 263, 278, 331]
        coarse = self.detections([("dice", .46, die), ("fire", .74, die), ("fire", .76, fire)])
        image = Image.new("RGB", (960, 800))
        result, _ = refine_board_context(None, image, coarse, .25, deadline=0)
        self.assertEqual(result.data["class_name"].tolist(), ["dice", "fire"])
        np.testing.assert_allclose(result.xyxy, [die, fire])

    def test_a_defect_without_an_overview_box_survives_next_to_fire_and_a_large_alien(self):
        fire = [286, 328, 350, 388]
        alien = [310, 204, 497, 357]
        defect = [267, 280, 331, 344]
        coarse = self.detections([("fire", .82, fire), ("alien", .92, alien)])
        detail = self.detections([("fire", .95, fire), ("alien", .91, alien), ("malfunction", .88, defect)])

        class Predictor:
            def predict_context(self, *_args, **_options):
                return detail[:]

        result, _ = refine_board_context(Predictor(), Image.new("RGB", (960, 800)), coarse, .25)
        self.assertEqual(set(result.data["class_name"]), {"fire", "alien", "malfunction"})

    def test_marker_review_cannot_reclassify_a_confident_nearby_player(self):
        fire = [286, 328, 350, 388]
        player = [363, 254, 475, 361]
        coarse = self.detections([("fire", .82, fire), ("character", .88, player)])
        detail = self.detections([("fire", .95, fire), ("alien", .92, player)])

        class Predictor:
            def predict_context(self, *_args, **_options):
                return detail[:]

        result, _ = refine_board_context(Predictor(), Image.new("RGB", (960, 800)), coarse, .25)
        self.assertEqual(set(result.data["class_name"]), {"fire", "character"})

    def test_a_larva_can_replace_a_character_without_replacing_the_player_next_to_it(self):
        player = [275, 390, 375, 489]
        larva = [308, 308, 369, 366]
        alias = [291, 282, 388, 372]
        coarse = self.detections([("character", .86, alias), ("alien", .19, larva), ("character", .88, player)])
        detail = self.detections([("character", .94, player), ("character", .43, larva), ("alien", .88, larva)])

        class Predictor:
            def predict_context(self, *_args, **_options):
                return detail[:]

        result, _ = refine_board_context(Predictor(), Image.new("RGB", (960, 800)), coarse, .25)
        self.assertEqual(result.data["class_name"].tolist(), ["character", "alien"])
        self.assertEqual(result.data["reclassified_kind"].tolist(), ["", "character"])
        np.testing.assert_allclose(result.xyxy, [player, larva])


if __name__ == "__main__":
    unittest.main()
