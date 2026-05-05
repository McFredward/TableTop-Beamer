// Phase 29 Wave 3 — animationSoundMap migration tests (live).
//
// Tests for `migrateAnimationSoundMap` from lib/migrations/phase-29-purge.mjs:
//   - Test 1: copy-when-empty (empty per-animation soundAssetRef gets the
//             value from the global animationSoundMap)
//   - Test 2: skip-on-conflict (already-set soundAssetRef NOT overwritten)
//   - Test 3: drop-orphan (map entries with no matching animation type are
//             counted as orphans and silently dropped)
//
// Skip-gates removed in 29-05.
//
// D-03 algorithm:
//   1. For every entry in `animationSoundMap` (type → soundAssetRef):
//      - Find matching animations in any board's outsideFx/roomFx/insideFx.
//      - If matching animation's soundAssetRef is empty/"none": copy map value.
//      - Otherwise: leave per-animation ref UNCHANGED (no overwrite).
//   2. The downstream strip step drops the entire `animationSoundMap` field
//      afterwards (orphan map entries silently disappear).

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { readJsonFile, writeJsonFile, withTempDir } from "./_helpers.mjs";
import { migrateAnimationSoundMap } from "../lib/migrations/phase-29-purge.mjs";

// ---------------------------------------------------------------------------
// Liveness — keeps the file's suite count stable across waves.
// ---------------------------------------------------------------------------
test("scaffold: phase-29-sound-migration loads", () => assert.equal(1, 1));

// ---------------------------------------------------------------------------
// Test 1 — copy-when-empty.
// Fixture: board.outsideFx.animations[0].type === "alarm", soundAssetRef === "".
// global-defaults.animationSoundMap === { "alarm": "/sounds/alarm.mp3" }.
// After migration: animation.soundAssetRef === "/sounds/alarm.mp3".
// ---------------------------------------------------------------------------
test("W3: migrateAnimationSoundMap copies map value to empty soundAssetRef", async () => {
  await withTempDir("phase-29-sound-copy", async (dir) => {
    const boardPath = join(dir, "boards", "test-a.json");
    await writeJsonFile(boardPath, {
      schema: "tt-beamer.board.v2",
      boardId: "test-a",
      outsideFx: {
        animations: [{ id: "anim-1", type: "alarm", soundAssetRef: "" }],
      },
    });

    const result = await migrateAnimationSoundMap(
      { animationSoundMap: { alarm: "/sounds/alarm.mp3" } },
      [boardPath],
    );
    assert.equal(result.copiedCount, 1);
    assert.equal(result.boardFilesModified, 1);
    assert.equal(result.orphanCount, 0);

    const out = await readJsonFile(boardPath);
    assert.equal(out.outsideFx.animations[0].soundAssetRef, "/sounds/alarm.mp3");
  });
});

// ---------------------------------------------------------------------------
// Test 2 — skip-on-conflict.
// Fixture: animation.soundAssetRef === "/sounds/custom.mp3" (not "none", not empty).
// global-defaults.animationSoundMap === { "alarm": "/sounds/alarm.mp3" }.
// After migration: animation.soundAssetRef remains "/sounds/custom.mp3".
// ---------------------------------------------------------------------------
test("W3: migrateAnimationSoundMap does NOT overwrite an already-set soundAssetRef", async () => {
  await withTempDir("phase-29-sound-skip", async (dir) => {
    const boardPath = join(dir, "boards", "test-b.json");
    await writeJsonFile(boardPath, {
      schema: "tt-beamer.board.v2",
      boardId: "test-b",
      outsideFx: {
        animations: [{ id: "anim-1", type: "alarm", soundAssetRef: "/sounds/custom.mp3" }],
      },
    });

    const result = await migrateAnimationSoundMap(
      { animationSoundMap: { alarm: "/sounds/alarm.mp3" } },
      [boardPath],
    );
    assert.equal(result.copiedCount, 0, "must not overwrite existing ref");
    assert.equal(result.boardFilesModified, 0, "no board file should be rewritten");
    // The map entry IS consumed (skip-on-conflict ≠ orphan); orphanCount should be 0.
    assert.equal(result.orphanCount, 0);

    const out = await readJsonFile(boardPath);
    assert.equal(out.outsideFx.animations[0].soundAssetRef, "/sounds/custom.mp3");
  });
});

// ---------------------------------------------------------------------------
// Test 3 — drop-orphan.
// Fixture: NO board has any animation of type "obsolete-type".
// global-defaults.animationSoundMap === { "obsolete-type": "/sounds/old.mp3" }.
// After migration: no animation got a new soundAssetRef; the map entry is
// just gone (silently dropped — counted as orphanCount: 1).
// ---------------------------------------------------------------------------
test("W3: migrateAnimationSoundMap silently drops orphan map entries", async () => {
  await withTempDir("phase-29-sound-orphan", async (dir) => {
    const boardPath = join(dir, "boards", "test-c.json");
    await writeJsonFile(boardPath, {
      schema: "tt-beamer.board.v2",
      boardId: "test-c",
      outsideFx: {
        animations: [{ id: "anim-1", type: "intruder-alert", soundAssetRef: "" }],
      },
    });

    const result = await migrateAnimationSoundMap(
      { animationSoundMap: { "obsolete-type": "/sounds/old.mp3" } },
      [boardPath],
    );
    assert.equal(result.copiedCount, 0);
    assert.equal(result.boardFilesModified, 0);
    assert.equal(result.orphanCount, 1, "obsolete-type has no consumer; counted as orphan");

    const out = await readJsonFile(boardPath);
    assert.equal(out.outsideFx.animations[0].soundAssetRef, "", "consumer untouched");
  });
});
