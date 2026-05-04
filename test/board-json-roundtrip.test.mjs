// Phase 28 Wave 0 scaffold — board-json-roundtrip (B1 boards/<id>.json round-trip incl. lastUsedProfileName).
// Downstream wave Wave 1 replaces the skipped placeholders with real assertions.
import { test } from "node:test";
import assert from "node:assert/strict";
// import * as helpers from "./_helpers.mjs";  // Re-enabled by downstream wave.

test("scaffold: board-json-roundtrip.test.mjs loads", () => {
  // Trivial liveness check so the file always has at least one passing assertion.
  assert.equal(1, 1);
});

test.skip("B1-D02: lastUsedProfileName persists in config/boards/<id>.json round-trip", () => {
  // Downstream wave fills this in.
});
