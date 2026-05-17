// Phase 48 W1 — align-exit-trace diagnostic regression rail.
//
// Phase 48 is investigating the ~2-3 s dashboard hiccup after exiting align
// mode. Wave 1 installs three `console.log` trace sites tagged
// `[align-exit-trace]`. This test pins each site to its source file so a
// future refactor cannot silently remove the diagnostics before Wave 2 has
// captured the operator's repro trace.
//
// Wave 2's final task removes both the traces AND this test (or replaces
// this test with the real fix verification). Until then, this test enforces
// "the trace is wired" for as long as Phase 48 is open.

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

test("Phase 48 W1: [align-exit-trace] dirty-dashboard-state lives inside syncAlignModeDirtyDashboardState", () => {
  const fnDeclIdx = VIEWPORT_SRC.indexOf("function syncAlignModeDirtyDashboardState");
  assert.ok(fnDeclIdx > 0, "syncAlignModeDirtyDashboardState declaration must exist");
  const traceIdx = VIEWPORT_SRC.indexOf("[align-exit-trace] dirty-dashboard-state");
  assert.ok(traceIdx > 0, "trace marker must exist");
  assert.ok(traceIdx > fnDeclIdx, "trace must appear AFTER the function declaration");
  // Bound: the next sibling function in the same IIFE is syncAlignModePanel.
  const nextFnIdx = VIEWPORT_SRC.indexOf("function syncAlignModePanel", fnDeclIdx);
  assert.ok(nextFnIdx > traceIdx, "trace must appear BEFORE the next function (syncAlignModePanel)");
});

test("Phase 48 W1: [align-exit-trace] setAlignMode-emit lives inside setAlignMode", () => {
  const fnDeclIdx = VIEWPORT_SRC.indexOf("function setAlignMode(enabled");
  assert.ok(fnDeclIdx > 0, "setAlignMode declaration must exist");
  const traceIdx = VIEWPORT_SRC.indexOf("[align-exit-trace] setAlignMode-emit");
  assert.ok(traceIdx > 0, "trace marker must exist");
  assert.ok(traceIdx > fnDeclIdx, "trace must appear AFTER the function declaration");
  // Bound: the next sibling function in the same IIFE is collectStageViewportMetrics.
  const nextFnIdx = VIEWPORT_SRC.indexOf("function collectStageViewportMetrics", fnDeclIdx);
  assert.ok(nextFnIdx > traceIdx, "trace must appear BEFORE the next function (collectStageViewportMetrics)");
});

test("Phase 48 W1: [align-exit-trace] applyLiveRuntimeSnapshot lives inside applyLiveRuntimeSnapshot", () => {
  const fnDeclIdx = LIVESYNC_SRC.indexOf("function applyLiveRuntimeSnapshot(snapshot,");
  assert.ok(fnDeclIdx > 0, "applyLiveRuntimeSnapshot declaration must exist");
  const traceIdx = LIVESYNC_SRC.indexOf("[align-exit-trace] applyLiveRuntimeSnapshot");
  assert.ok(traceIdx > 0, "trace marker must exist");
  assert.ok(traceIdx > fnDeclIdx, "trace must appear AFTER the function declaration");
  // Bound: the next sibling function in the same module is connectLiveSyncSocket.
  const nextFnIdx = LIVESYNC_SRC.indexOf("function connectLiveSyncSocket", fnDeclIdx);
  assert.ok(nextFnIdx > traceIdx, "trace must appear BEFORE the next function (connectLiveSyncSocket)");
});

test("Phase 48 W1: 'removed in W2 final task' canary present at every trace site", () => {
  const viewportHits = VIEWPORT_SRC.match(/removed in W2 final task/g) || [];
  const livesyncHits = LIVESYNC_SRC.match(/removed in W2 final task/g) || [];
  const total = viewportHits.length + livesyncHits.length;
  assert.ok(
    total >= 3,
    `expected at least 3 'removed in W2 final task' canary comments (one per trace site), found ${total}`,
  );
});
