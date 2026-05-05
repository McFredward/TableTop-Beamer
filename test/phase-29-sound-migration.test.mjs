// Phase 29 Wave 0 — animationSoundMap migration scaffold (D-03).
//
// Tests for Wave 3's lossless `animationSoundMap` migration helper. All
// substantive assertions are skip-gated until Wave 3 (29-05) exposes the
// migration helper. Each skipped test contains an `assert.fail(...)` body so
// that when Wave 3 removes the skip gate the test MUST FAIL until the helper
// is wired in.
//
// D-03 algorithm:
//   1. For every entry in `animationSoundMap` (type → soundAssetRef):
//      - Find matching animations in any board's outsideFx/roomFx/insideFx.
//      - If matching animation's soundAssetRef is empty/"none": copy map value.
//      - Otherwise: leave per-animation ref UNCHANGED (no overwrite).
//   2. Drop the entire `animationSoundMap` field afterwards (orphan map entries
//      silently disappear).

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { writeJsonFile, withTempDir } from "./_helpers.mjs";

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
test("W3: migrateAnimationSoundMap copies map value to empty soundAssetRef", { skip: "Wave 3 (29-05) not landed yet" }, async () => {
  await withTempDir("phase-29-sound-copy", async (dir) => {
    const boardPath = join(dir, "boards", "test-b.json");
    await writeJsonFile(boardPath, {
      schema: "tt-beamer.board.v2",
      boardId: "test-b",
      outsideFx: {
        animations: [{ id: "anim-1", type: "alarm", soundAssetRef: "" }],
      },
    });
    await writeJsonFile(join(dir, "global-defaults.json"), {
      animationSoundMap: { alarm: "/sounds/alarm.mp3" },
    });
    assert.fail("Wave 3 migration helper not exported yet — this test is skip-gated");
  });
});

// ---------------------------------------------------------------------------
// Test 2 — skip-on-conflict.
// Fixture: animation.soundAssetRef === "/sounds/custom.mp3" (not "none", not empty).
// global-defaults.animationSoundMap === { "alarm": "/sounds/alarm.mp3" }.
// After migration: animation.soundAssetRef remains "/sounds/custom.mp3".
// ---------------------------------------------------------------------------
test("W3: migrateAnimationSoundMap does NOT overwrite an already-set soundAssetRef", { skip: "Wave 3 (29-05) not landed yet" }, async () => {
  assert.fail("Wave 3 migration helper not exported yet — this test is skip-gated");
});

// ---------------------------------------------------------------------------
// Test 3 — drop-orphan.
// Fixture: NO board has any animation of type "obsolete-type".
// global-defaults.animationSoundMap === { "obsolete-type": "/sounds/old.mp3" }.
// After migration: no animation got a new soundAssetRef; the map entry is
// just gone (silently dropped).
// ---------------------------------------------------------------------------
test("W3: migrateAnimationSoundMap silently drops orphan map entries", { skip: "Wave 3 (29-05) not landed yet" }, async () => {
  assert.fail("Wave 3 migration helper not exported yet — this test is skip-gated");
});
