// Phase 28 Wave 0 scaffold — auto-load-fallback (B1 silent default fallback when no remembered profile).
// Downstream wave Wave 1 replaces the skipped placeholders with real assertions.
import { test } from "node:test";
import assert from "node:assert/strict";
// import * as helpers from "./_helpers.mjs";  // Re-enabled by downstream wave.

test("scaffold: auto-load-fallback.test.mjs loads", () => {
  // Trivial liveness check so the file always has at least one passing assertion.
  assert.equal(1, 1);
});

test.skip("B1-D03 fallback: null lastUsedProfileName loads default geometry without popup", () => {
  // Downstream wave fills this in.
});
