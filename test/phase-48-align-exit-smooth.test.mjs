// Phase 48 W2 — align-exit dashboard hiccup fix regression rail.
//
// Pins the optimistic dashboard-side state mutation in setAlignMode that
// closes the ~2-3 s gap between align-toggle-off click and visible clean
// state on the dashboard. Pre-fix, state.alignMode + the body class +
// the dirty-chip + the indicator bar all waited for the server's snapshot
// echo (120-250 ms) before updating; post-fix, they update on the click
// frame and the server echo is idempotent (gated by _lastAlignModeState
// at runtime-stage-viewport.js:146, the Phase 35 idempotence guard).
//
// If this test fails, the optimistic update has been removed and the
// hiccup will return. See .planning/phases/phase-48/48-02-SUMMARY.md for
// the why behind each assertion.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const VIEWPORT_SRC = readFileSync(
  "./src/app/runtime/viewport/runtime-stage-viewport.js",
  "utf8",
);
const LIVESYNC_SRC = readFileSync(
  "./src/app/runtime/live-sync/runtime-live-sync-core.js",
  "utf8",
);

function setAlignModeBody() {
  const start = VIEWPORT_SRC.indexOf("function setAlignMode(enabled");
  assert.ok(start > 0, "setAlignMode declaration must exist");
  const end = VIEWPORT_SRC.indexOf("function collectStageViewportMetrics", start);
  assert.ok(end > start, "next function (collectStageViewportMetrics) must exist after setAlignMode");
  return VIEWPORT_SRC.slice(start, end);
}

test("Phase 48 W2: setAlignMode contains a 'Phase 48 W2' marker comment", () => {
  const body = setAlignModeBody();
  assert.ok(body.includes("Phase 48 W2"), "setAlignMode must reference Phase 48 W2 in its body");
});

test("Phase 48 W2: setAlignMode mutates state.alignMode optimistically BEFORE emitLiveMutation", () => {
  const body = setAlignModeBody();
  const firstMutation = body.indexOf("state.alignMode = nextAlignMode");
  const firstEmit = body.indexOf("emitLiveMutation");
  assert.ok(firstMutation > 0, "setAlignMode must contain `state.alignMode = nextAlignMode`");
  assert.ok(firstEmit > 0, "setAlignMode must contain `emitLiveMutation`");
  assert.ok(
    firstMutation < firstEmit,
    "the FIRST state.alignMode mutation must appear BEFORE emitLiveMutation (optimistic update, not post-emit)",
  );
  // Belt-and-suspenders: the mutation should occur at least twice in the
  // function body (once in the optimistic-emit branch, once in the
  // /output/-side path at the end of the function).
  const allMutations = body.match(/state\.alignMode = nextAlignMode/g) || [];
  assert.ok(
    allMutations.length >= 2,
    `expected state.alignMode = nextAlignMode to appear >=2 times (optimistic + /output/-side), found ${allMutations.length}`,
  );
});

test("Phase 48 W2: setAlignMode declares previousAlignMode and uses it in a .catch rollback", () => {
  const body = setAlignModeBody();
  assert.ok(body.includes("const previousAlignMode"), "setAlignMode must declare previousAlignMode for rollback");
  const catchIdx = body.indexOf(".catch(");
  assert.ok(catchIdx > 0, "setAlignMode must have a .catch handler on the emit promise");
  // previousAlignMode must be referenced inside the catch (rollback path)
  const tailAfterCatch = body.slice(catchIdx);
  assert.ok(
    tailAfterCatch.includes("previousAlignMode"),
    "previousAlignMode must be referenced inside the .catch rollback path",
  );
});

test("Phase 48 W2 + Phase 35: _lastAlignModeState idempotence gate is preserved in syncAlignModePanel", () => {
  // This is what makes applyLiveRuntimeSnapshot's echo idempotent — must not be removed.
  const matches = VIEWPORT_SRC.match(/_lastAlignModeState/g) || [];
  assert.ok(
    matches.length >= 2,
    `expected _lastAlignModeState to be declared + compared (>=2 refs), found ${matches.length}`,
  );
});

test("Phase 48 W2: no [align-exit-trace] diagnostic markers remain", () => {
  assert.ok(
    !VIEWPORT_SRC.includes("[align-exit-trace]"),
    "[align-exit-trace] markers must be removed from runtime-stage-viewport.js post-W2",
  );
  assert.ok(
    !LIVESYNC_SRC.includes("[align-exit-trace]"),
    "[align-exit-trace] markers must be removed from runtime-live-sync-core.js post-W2",
  );
});
