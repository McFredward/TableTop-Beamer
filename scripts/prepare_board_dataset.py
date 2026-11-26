"""Audit a local annotated board dataset and export whole-scene COCO splits."""

import argparse
from collections import Counter, defaultdict
from hashlib import file_digest
import json
from pathlib import Path
from shutil import copyfile
from tempfile import TemporaryDirectory

from board_vision import BOARD_CLASSES


def audit(manifest, image_root):
    images, annotations, categories = (manifest[key] for key in ("images", "annotations", "categories"))
    classes = {category["id"]: category["name"] for category in categories}
    if len(classes) != len(categories) or len(set(classes.values())) != len(classes) or not classes:
        raise ValueError("COCO categories need unique ids and names")
    if unknown := set(classes.values()) - BOARD_CLASSES:
        raise ValueError(f"Unknown board classes: {', '.join(sorted(unknown))}")
    by_id, files = {}, {}
    scene_counts, lighting_counts, object_counts = Counter(), Counter(), Counter()
    identical = defaultdict(list)
    for image in images:
        image_id, scene = image["id"], image["scene_group"]
        if image_id in by_id or not isinstance(scene, str) or not scene.strip():
            raise ValueError("Each image needs a unique id and a non-empty scene_group")
        path = (image_root / image["file_name"]).resolve()
        if not path.is_relative_to(image_root) or not path.is_file():
            raise ValueError(f"Image unavailable under the dataset root: {image['file_name']}")
        with path.open("rb") as source:
            identical[file_digest(source, "sha256").hexdigest()].append(image_id)
        files[image_id] = path
        by_id[image_id] = image
        scene_counts[scene] += 1
        lighting_counts[image.get("lighting", "unspecified")] += 1
    annotation_ids = set()
    for annotation in annotations:
        annotation_id = annotation["id"]
        if annotation_id in annotation_ids:
            raise ValueError(f"Duplicate annotation id: {annotation_id}")
        annotation_ids.add(annotation_id)
        image = by_id[annotation["image_id"]]
        x, y, w, h = annotation["bbox"]
        if not (0 <= x < x + w <= image["width"] and 0 <= y < y + h <= image["height"]):
            raise ValueError(f"Invalid bounding box in image {image['file_name']}")
        object_counts[classes[annotation["category_id"]]] += 1
    duplicate_groups = [ids for ids in identical.values() if len(ids) > 1]
    return {
        "frames": len(images), "scene_groups": dict(scene_counts), "lighting": dict(lighting_counts),
        "objects_by_class": dict(object_counts), "unrepresented_classes": sorted(BOARD_CLASSES - object_counts.keys()),
        "duplicate_image_ids": duplicate_groups,
    }, files


def export_splits(manifest, files, report, output, validation, test):
    scenes = set(report["scene_groups"])
    if validation & test or not (validation | test) <= scenes:
        raise ValueError("Validation and test must use different, existing scene groups")
    train = scenes - validation - test
    if not all((train, validation, test)):
        raise ValueError("Training, validation and test each need an independent scene group")
    split_by_scene = {scene: name for name, group in (("train", train), ("valid", validation), ("test", test))
                      for scene in group}
    split_by_image = {image["id"]: split_by_scene[image["scene_group"]] for image in manifest["images"]}
    for ids in report["duplicate_image_ids"]:
        if len({split_by_image[image_id] for image_id in ids}) > 1:
            raise ValueError(f"Identical images cross dataset splits: {ids}")
    if output.exists():
        raise ValueError(f"Export destination already exists: {output}")

    output.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix=".board-dataset-", dir=output.parent) as staging:
        dataset = Path(staging) / "dataset"
        counts = {}
        for split in ("train", "valid", "test"):
            folder = dataset / split
            folder.mkdir(parents=True, mode=0o700)
            images = []
            for image in manifest["images"]:
                image_id = image["id"]
                if split_by_image[image_id] != split:
                    continue
                source = files[image_id]
                name = f"{len(images) + 1:06d}{source.suffix.lower()}"
                copyfile(source, folder / name)
                images.append({**image, "file_name": name})
            annotations = [annotation for annotation in manifest["annotations"]
                           if split_by_image[annotation["image_id"]] == split]
            subset = {**manifest, "images": images, "annotations": annotations}
            (folder / "_annotations.coco.json").write_text(json.dumps(subset, indent=2) + "\n", encoding="utf-8")
            counts[split] = len(images)
        dataset.chmod(0o700)
        dataset.rename(output)
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path, help="COCO manifest with a scene_group on each image")
    parser.add_argument("--image-root", type=Path, help="Image directory, defaults to the manifest directory")
    parser.add_argument("--output", type=Path, help="Export for RF-DETR, otherwise print only the audit")
    parser.add_argument("--valid-scene", action="append", default=[], help="Validation scene group, repeatable")
    parser.add_argument("--test-scene", action="append", default=[], help="Test scene group, repeatable")
    args = parser.parse_args()
    try:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        report, files = audit(manifest, (args.image_root or args.manifest.parent).resolve())
        if args.output:
            report["exported_frames"] = export_splits(manifest, files, report, args.output,
                                                       set(args.valid_scene), set(args.test_scene))
    except (ValueError, TypeError, KeyError, OSError) as error:
        parser.error(str(error))
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
