// Phase 28 Wave 1 — board-json-roundtrip (B1 boards/<id>.json round-trip incl. lastUsedProfileName).
// Replaces Wave 0 skip placeholder with real assertions per 28-01-PLAN Task 1.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readJsonFile, writeJsonFile, withTempDir } from "./_helpers.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

test("scaffold: board-json-roundtrip.test.mjs loads", () => {
  // Trivial liveness check so the file always has at least one passing assertion.
  assert.equal(1, 1);
});

// ---------------------------------------------------------------------------
// Recreate the server-side BOARD_PROFILE_FIELDS iterator pattern so the test
// stays pure-Node. The list is parsed out of server.mjs source to ensure the
// test fails if production drifts. The "iterator" itself is byte-equivalent
// to extractProfileFromUnifiedBoard's inner loop (server.mjs line 62–68).
// ---------------------------------------------------------------------------
function parseBoardProfileFieldsFromServerSrc(src) {
  // Match `const BOARD_PROFILE_FIELDS = Object.freeze([ ... ]);` block.
  const m = src.match(/const BOARD_PROFILE_FIELDS = Object\.freeze\(\[([\s\S]*?)\]\);/);
  if (!m) throw new Error("Could not locate BOARD_PROFILE_FIELDS in server.mjs");
  const items = [];
  const re = /"([^"]+)"/g;
  let match;
  while ((match = re.exec(m[1])) !== null) {
    items.push(match[1]);
  }
  return items;
}

function extractProfileFromUnifiedBoardClone(board, fields) {
  // Logic-clone of server.mjs extractProfileFromUnifiedBoard (lines 53–68).
  if (!board || typeof board !== "object") return {};
  const profile = {};
  if (Array.isArray(board.roomCatalog)) profile.roomCatalog = board.roomCatalog;
  if (Array.isArray(board.roomClusters)) profile.roomClusters = board.roomClusters;
  for (const field of fields) {
    if (board[field] !== undefined) {
      profile[field] = board[field];
    }
  }
  return profile;
}

test("B1-D02: lastUsedProfileName persists in config/boards/<id>.json round-trip", async () => {
  const serverSrc = readFileSync(join(REPO_ROOT, "server.mjs"), "utf8");
  const fields = parseBoardProfileFieldsFromServerSrc(serverSrc);

  // Structural assertion: the freeze list contains the new field.
  assert.ok(
    fields.includes("lastUsedProfileName"),
    "BOARD_PROFILE_FIELDS must contain 'lastUsedProfileName'",
  );

  // Sanity-check: existing LIVE fields still present (no accidental removal).
  // Phase 29-04 dropped `deletedRoomIds` from BOARD_PROFILE_FIELDS as REDUNDANT.
  assert.ok(fields.includes("playAreas"), "playAreas must remain in BOARD_PROFILE_FIELDS");

  // Forward direction — board with the field → profile carries it through.
  const boardWith = { lastUsedProfileName: "alpha" };
  const profileWith = extractProfileFromUnifiedBoardClone(boardWith, fields);
  assert.equal(profileWith.lastUsedProfileName, "alpha", "field must round-trip board → profile");

  // Absent direction — board without the field → profile omits it (BOARD_PROFILE_FIELDS
  // iterator skips `undefined`).
  const boardWithout = {};
  const profileWithout = extractProfileFromUnifiedBoardClone(boardWithout, fields);
  assert.equal(
    Object.prototype.hasOwnProperty.call(profileWithout, "lastUsedProfileName"),
    false,
    "field must be absent in profile when absent on board",
  );

  // Null direction — board with explicit null → profile carries through as null
  // (legacy boards that have the field stamped at apply time get null preserved).
  const boardNull = { lastUsedProfileName: null };
  const profileNull = extractProfileFromUnifiedBoardClone(boardNull, fields);
  assert.equal(profileNull.lastUsedProfileName, null, "explicit null must round-trip as null");

  // Disk round-trip — write a synthetic boards/<id>.json with the field, read it
  // back, verify bit-exactness.
  await withTempDir("phase28-board-roundtrip", async (dir) => {
    const filePath = join(dir, "synthetic-board.json");
    const original = {
      schema: "tt-beamer.board-definition.v1",
      boardId: "synthetic-board",
      metadata: { name: "Synthetic", imageSrc: "/x.png", source: "test" },
      roomCatalog: [],
      roomClusters: [],
      lastUsedProfileName: "main-stage.v1",
    };
    await writeJsonFile(filePath, original);
    const reread = await readJsonFile(filePath);
    assert.equal(reread.lastUsedProfileName, "main-stage.v1", "disk round-trip preserves field bit-exact");
    assert.deepEqual(reread, original, "full disk round-trip must be bit-exact");
  });
});
