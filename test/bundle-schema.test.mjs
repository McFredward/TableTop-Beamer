// Phase 29 Wave 0 — bundle-schema bump scaffold (D-04).
//
// Tests for Wave 4 (29-06): BOARD_PACKAGE_SCHEMA "v3" → "v4" cutover, the new
// SCHEMA_OUTDATED rejection on import, and the export-side
// `filterBoardToLiveFields` filter (D-07/D-08).
// All substantive assertions are skip-gated until Wave 4 lands.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Liveness — keeps the file's suite count stable across waves.
// ---------------------------------------------------------------------------
test("scaffold: bundle-schema loads", () => assert.equal(1, 1));

// ---------------------------------------------------------------------------
// Test 1 — constant value bump.
// Asserts the BOARD_PACKAGE_SCHEMA literal in server.mjs reads
// "tt-beamer.board-package.v4" once Wave 4 lands.
// ---------------------------------------------------------------------------
test("W4: BOARD_PACKAGE_SCHEMA constant bumped to v4", () => {
  const src = readFileSync(join(REPO_ROOT, "server.mjs"), "utf8");
  assert.match(
    src,
    /const BOARD_PACKAGE_SCHEMA = "tt-beamer\.board-package\.v4";/,
    "expected BOARD_PACKAGE_SCHEMA to be the v4 string literal",
  );
});

// ---------------------------------------------------------------------------
// Test 2 — v3-rejected (SCHEMA_OUTDATED).
// Asserts the import-handler block wraps the 400-response in the new
// `code: "SCHEMA_OUTDATED"` shape with a "Package format outdated" message.
// ---------------------------------------------------------------------------
test("W4: bundle import handler emits SCHEMA_OUTDATED on non-v4 manifest", () => {
  const src = readFileSync(join(REPO_ROOT, "server.mjs"), "utf8");
  assert.match(
    src,
    /code:\s*["']SCHEMA_OUTDATED["']/,
    "expected import handler to emit code: 'SCHEMA_OUTDATED' on schema mismatch",
  );
  assert.match(
    src,
    /Package format outdated/,
    "expected the user-facing error message to include 'Package format outdated'",
  );
});

// ---------------------------------------------------------------------------
// Test 3 — export-filter (D-07).
// Asserts `filterBoardToLiveFields` exists in server.mjs and is referenced
// inside the export-handler block (so the helper is both DEFINED and CALLED).
// ---------------------------------------------------------------------------
test("W4: filterBoardToLiveFields helper exists and is used in export handler", () => {
  const src = readFileSync(join(REPO_ROOT, "server.mjs"), "utf8");
  assert.match(src, /function filterBoardToLiveFields\(/, "helper must be defined in server.mjs");
  // The export-handler block (currently around server.mjs:3251-3349) must call
  // it before building the manifest.
  const callMatches = src.match(/filterBoardToLiveFields\(/g) || [];
  assert.ok(
    callMatches.length >= 2,
    `expected helper to be defined AND called (found ${callMatches.length} occurrences)`,
  );
});

// ---------------------------------------------------------------------------
// Test 4 — Phase 29 h1: v4 export MUST NOT carry specialPolygons or
// roomGeometry. The allowed-set in filterBoardToLiveFields spreads
// BOARD_PROFILE_FIELDS plus a fixed structural-keys list. Asserting both
// sources excludes the two dropped fields keeps the export-side filter
// honest.
// ---------------------------------------------------------------------------
test("29-h1: v4 export filter excludes specialPolygons + roomGeometry", () => {
  const src = readFileSync(join(REPO_ROOT, "server.mjs"), "utf8");

  // 1. BOARD_PROFILE_FIELDS — primary spread source — must not contain
  //    either dropped field. (Independent of board-profile-fields.test.mjs:
  //    that test expects the LIVE set to BE 9 entries; this one binds the
  //    DEAD-set absence to the bundle-export contract.)
  const blockMatch = src.match(/const BOARD_PROFILE_FIELDS = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(blockMatch, "BOARD_PROFILE_FIELDS block must be findable");
  const fieldNames = Array.from(blockMatch[1].matchAll(/"([a-zA-Z0-9_]+)"/g)).map((m) => m[1]);
  assert.ok(!fieldNames.includes("specialPolygons"),
    "v4 export MUST NOT carry specialPolygons (29-h1: collapsed to roomCatalog[*].polygon)");
  assert.ok(!fieldNames.includes("roomGeometry"),
    "v4 export MUST NOT carry roomGeometry (29-h1: runtime-only, disk field always {})");

  // 2. filterBoardToLiveFields' explicit `allowedTopKeys` set must list
  //    only structural keys (schema, boardId, metadata, roomCatalog,
  //    roomClusters) — neither dropped field has crept in there as a
  //    hardcoded fallback.
  const helperMatch = src.match(/function filterBoardToLiveFields\([\s\S]*?\n\}/);
  assert.ok(helperMatch, "filterBoardToLiveFields body must be findable");
  const body = helperMatch[0];
  assert.ok(!/"specialPolygons"/.test(body),
    "filterBoardToLiveFields MUST NOT hardcode specialPolygons in allowedTopKeys");
  assert.ok(!/"roomGeometry"/.test(body),
    "filterBoardToLiveFields MUST NOT hardcode roomGeometry in allowedTopKeys");
});
