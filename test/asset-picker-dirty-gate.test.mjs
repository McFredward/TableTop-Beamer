// Phase 28 Wave 0 scaffold — asset-picker-dirty-gate (B3 dirty-fires-only-on-effective-change semantics).
// Downstream wave Wave 3 replaces the skipped placeholders with real assertions.
import { test } from "node:test";
import assert from "node:assert/strict";
// import * as helpers from "./_helpers.mjs";  // Re-enabled by downstream wave.

test("scaffold: asset-picker-dirty-gate.test.mjs loads", () => {
  // Trivial liveness check so the file always has at least one passing assertion.
  assert.equal(1, 1);
});

test.skip("B3-D07.1: upload of asset NOT in current selection fires no dirty", () => {
  // Downstream wave fills this in.
});

test.skip("B3-D07.2: upload with same content-hash fires no dirty", () => {
  // Downstream wave fills this in.
});

test.skip("B3-D07.3: upload with different content-hash fires dirty=true", () => {
  // Downstream wave fills this in.
});

test.skip("B3-D08: library-only delete fires no dirty", () => {
  // Downstream wave fills this in.
});
