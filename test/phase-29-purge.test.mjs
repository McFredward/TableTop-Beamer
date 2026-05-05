// Phase 29 Wave 0 — boot-migration purge scaffold.
//
// Tests for Wave 3's `purgeDeadFieldsOnBoot` / `purgeBoardFile` helpers.
// All substantive assertions are skip-gated until Wave 3 (29-05) exposes the
// production helper. Each skipped test contains an `assert.fail(...)` body so
// that when Wave 3 removes the skip gate the test MUST FAIL until the helper
// is wired in.

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { writeJsonFile, withTempDir } from "./_helpers.mjs";

// ---------------------------------------------------------------------------
// Liveness — keeps the file's suite count stable across waves.
// ---------------------------------------------------------------------------
test("scaffold: phase-29-purge loads", () => assert.equal(1, 1));

// ---------------------------------------------------------------------------
// Test 1 — idempotence.
// Run purge twice on the same temp dir. After the second run the disk state
// MUST be byte-identical to the disk state after the first run.
// ---------------------------------------------------------------------------
test("W3: purgeDeadFieldsOnBoot is idempotent", { skip: "Wave 3 (29-05) not landed yet" }, async () => {
  await withTempDir("phase-29-purge-idem", async (dir) => {
    const boardPath = join(dir, "boards", "test-a.json");
    const fixture = {
      schema: "tt-beamer.board.v2",
      boardId: "test-a",
      metadata: { name: "Test A" },
      roomCatalog: [],
      roomClusters: [],
      hiddenRoomNames: {},
      roomStateProfiles: { "room-1": { broken: false } },
      playAreaPolygon: [[0, 0], [1, 0], [1, 1], [0, 1]],
      playAreas: [{ id: "play-1", polygon: [[0, 0], [1, 0]] }],
      lastUsedProfileName: "Main",
    };
    await writeJsonFile(boardPath, fixture);
    // Will be replaced when Wave 3 exports purgeBoardFile from a testable module.
    // Placeholder failure ensures the un-skipped test trips on a missing import
    // rather than passing vacuously.
    assert.fail("Wave 3 helper not exported yet — this test is skip-gated");
  });
});

// ---------------------------------------------------------------------------
// Test 2 — strip semantics + LIVE preservation.
// Fixture board JSON containing all 4 DEAD fields → run purge → assert DEAD
// fields are gone, LIVE fields (lastUsedProfileName, playAreas, etc.) survive.
// ---------------------------------------------------------------------------
test("W3: purgeBoardFile drops DEAD fields, preserves LIVE fields", { skip: "Wave 3 (29-05) not landed yet" }, async () => {
  assert.fail("Wave 3 helper not exported yet — this test is skip-gated");
});

// ---------------------------------------------------------------------------
// Test 3 — malformed JSON tolerance.
// Fixture file with broken JSON → purge MUST NOT throw, and the file MUST be
// left untouched so a human can recover it.
// ---------------------------------------------------------------------------
test("W3: purgeBoardFile skips malformed JSON without throwing", { skip: "Wave 3 (29-05) not landed yet" }, async () => {
  assert.fail("Wave 3 helper not exported yet — this test is skip-gated");
});
