// Phase 28 Wave 0 scaffold — asset-manifest (B5 manifest read/write/sync round-trip).
// Downstream wave Wave 4 replaces the skipped placeholders with real assertions.
import { test } from "node:test";
import assert from "node:assert/strict";
// import * as helpers from "./_helpers.mjs";  // Re-enabled by downstream wave.

test("scaffold: asset-manifest.test.mjs loads", () => {
  // Trivial liveness check so the file always has at least one passing assertion.
  assert.equal(1, 1);
});

test.skip("B5-D13: manifest round-trips — write then read returns the same hash + size + mtime", () => {
  // Downstream wave fills this in.
});

test.skip("B5-D13: missing manifest synthesizes from disk on boot", () => {
  // Downstream wave fills this in.
});
