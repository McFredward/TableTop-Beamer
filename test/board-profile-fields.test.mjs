// Phase 28 Wave 0 scaffold — board-profile-fields (B1 lastUsedProfileName persistence + traversal validation).
// Downstream wave Wave 1 replaces the skipped placeholders with real assertions.
import { test } from "node:test";
import assert from "node:assert/strict";
// import * as helpers from "./_helpers.mjs";  // Re-enabled by downstream wave.

test("scaffold: board-profile-fields.test.mjs loads", () => {
  // Trivial liveness check so the file always has at least one passing assertion.
  assert.equal(1, 1);
});

test.skip("B1-D01: save flow updates lastUsedProfileName", () => {
  // Downstream wave fills this in.
});

test.skip("B1-D01: lastUsedProfileName rejects path-traversal characters", () => {
  // Downstream wave fills this in.
});
