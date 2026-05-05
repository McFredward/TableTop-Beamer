// Phase 29 Wave 3 — boot-migration purge tests (live).
//
// Tests for `purgeBoardFile` from lib/migrations/phase-29-purge.mjs:
//   - Test 1: idempotence (second run is byte-stable no-op)
//   - Test 2: strip semantics + LIVE-field preservation
//   - Test 3: malformed JSON tolerance (no throw, file untouched)
//
// Skip-gates removed in 29-05.

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import { readJsonFile, writeJsonFile, withTempDir } from "./_helpers.mjs";
import { purgeBoardFile } from "../lib/migrations/phase-29-purge.mjs";

// ---------------------------------------------------------------------------
// Liveness — keeps the file's suite count stable across waves.
// ---------------------------------------------------------------------------
test("scaffold: phase-29-purge loads", () => assert.equal(1, 1));

// ---------------------------------------------------------------------------
// Test 1 — idempotence.
// Run purge twice on the same temp dir. After the second run the disk state
// MUST be byte-identical to the disk state after the first run.
// ---------------------------------------------------------------------------
test("W3: purgeDeadFieldsOnBoot is idempotent", async () => {
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

    const r1 = await purgeBoardFile(boardPath);
    assert.equal(r1.changed, true, "first call should report changed");
    const after1 = await readJsonFile(boardPath);
    assert.ok(!("hiddenRoomNames" in after1), "hiddenRoomNames must be gone after first call");
    assert.ok(!("roomStateProfiles" in after1), "roomStateProfiles must be gone after first call");
    assert.ok(!("playAreaPolygon" in after1), "playAreaPolygon must be gone after first call");

    const r2 = await purgeBoardFile(boardPath);
    assert.equal(r2.changed, false, "second call MUST be a no-op (idempotence)");
    const after2 = await readJsonFile(boardPath);
    assert.deepEqual(after1, after2, "second call MUST not mutate the file");
  });
});

// ---------------------------------------------------------------------------
// Test 2 — strip semantics + LIVE preservation.
// Fixture board JSON containing all 4 DEAD fields → run purge → assert DEAD
// fields are gone, LIVE fields (lastUsedProfileName, playAreas, etc.) survive.
// ---------------------------------------------------------------------------
test("W3: purgeBoardFile drops DEAD fields, preserves LIVE fields", async () => {
  await withTempDir("phase-29-purge-strip", async (dir) => {
    const boardPath = join(dir, "boards", "test-b.json");
    await writeJsonFile(boardPath, {
      schema: "tt-beamer.board.v2",
      boardId: "test-b",
      metadata: { name: "Test B" },
      roomCatalog: [{ id: "r1", name: "R1" }],
      // DEAD:
      hiddenRoomNames: { "r1": true },
      roomStateProfiles: { "r1": { broken: false } },
      playAreaPolygon: [[0, 0]],
      deletedRoomIds: ["old-room"],
      // LIVE:
      playAreas: [{ id: "p1", polygon: [[0, 0]] }],
      outsideFx: { animations: [] },
      lastUsedProfileName: "Foo",
    });

    await purgeBoardFile(boardPath);
    const out = await readJsonFile(boardPath);

    // DEAD fields gone:
    for (const f of ["hiddenRoomNames", "roomStateProfiles", "playAreaPolygon", "deletedRoomIds"]) {
      assert.ok(!(f in out), `${f} must be stripped`);
    }
    // LIVE fields preserved byte-identical:
    assert.deepEqual(out.playAreas, [{ id: "p1", polygon: [[0, 0]] }]);
    assert.deepEqual(out.outsideFx, { animations: [] });
    assert.equal(out.lastUsedProfileName, "Foo");
    assert.equal(out.boardId, "test-b");
    assert.deepEqual(out.roomCatalog, [{ id: "r1", name: "R1" }]);
    assert.deepEqual(out.metadata, { name: "Test B" });
  });
});

// ---------------------------------------------------------------------------
// Test 3 — malformed JSON tolerance.
// Fixture file with broken JSON → purge MUST NOT throw, and the file MUST be
// left untouched so a human can recover it.
// ---------------------------------------------------------------------------
test("W3: purgeBoardFile skips malformed JSON without throwing", async () => {
  await withTempDir("phase-29-purge-malformed", async (dir) => {
    const boardPath = join(dir, "broken.json");
    const original = "{ this is not valid json";
    await writeFile(boardPath, original, "utf8");

    const r = await purgeBoardFile(boardPath);
    assert.equal(r.changed, false, "malformed file must report no change");

    const after = await readFile(boardPath, "utf8");
    assert.equal(after, original, "malformed file MUST be untouched");
  });
});
