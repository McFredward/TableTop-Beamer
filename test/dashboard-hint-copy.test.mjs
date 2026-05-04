// Phase 28 Wave 2 — dashboard-hint-copy (B2 board-switch hint chip copy contract).
// Pure-Node source-pattern test: greps the production source file for the
// locked HINT_COPY_* constants and the boardSelect.setAttribute call shape.
// No jsdom, no browser shim, no helpers required.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const STAGE_VIEWPORT_PATH = path.join(
  REPO_ROOT,
  "src/app/runtime/viewport/runtime-stage-viewport.js",
);

test("scaffold: dashboard-hint-copy.test.mjs loads", () => {
  // Trivial liveness check so the file always has at least one passing assertion.
  assert.equal(1, 1);
});

test("B2-D05: hint copy locked — short chip is \"Unsaved on /output/\" and tooltip is the full sentence", async () => {
  const src = await readFile(STAGE_VIEWPORT_PATH, "utf8");

  // (a) HINT_COPY_FULL_BOARD_SWITCH — the locked B2 long-form (board-switch flavor).
  assert.ok(
    src.includes(
      "Unsaved align changes on /output/ — save or discard there first to switch board.",
    ),
    "expected runtime-stage-viewport.js to contain HINT_COPY_FULL_BOARD_SWITCH literal",
  );

  // (b) HINT_COPY_CHIP — short amber chip, identical to Phase 27 W5.
  assert.ok(
    src.includes("Unsaved on /output/"),
    "expected runtime-stage-viewport.js to contain HINT_COPY_CHIP literal",
  );

  // (c) HINT_COPY_FULL — Phase 27 W5 align-toggle long-form, NOT replaced by Phase 28.
  assert.ok(
    src.includes(
      "Unsaved changes on /output/ — save or discard there first.",
    ),
    "expected runtime-stage-viewport.js to preserve Phase 27 W5 HINT_COPY_FULL literal",
  );

  // (d) The helper sets boardSelect.title to HINT_COPY_FULL_BOARD_SWITCH when dirty.
  assert.ok(
    src.includes(
      'boardSelect.setAttribute("title", HINT_COPY_FULL_BOARD_SWITCH)',
    ),
    "expected helper to set boardSelect title attribute to HINT_COPY_FULL_BOARD_SWITCH constant",
  );
});
