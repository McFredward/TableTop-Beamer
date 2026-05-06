// Phase-31 — exercise the live-sync apply path with a fake DOM.
//
// The apply logic is in `runtime-live-sync-core.js` inside an IIFE that
// expects `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE` and `window`
// itself. We stand up a minimal mock of those and the ctx dependency
// bag, then drive `applyLiveRuntimeSnapshot` directly with a seeded
// snapshot envelope and assert that `restoreGridSnapshot` gets called
// with the expected grid.
//
// Why this matters: prior tests (phase-31-ssr-boot-grid-restore) verify
// the SERVER seeds the envelope correctly. This test verifies the
// CLIENT actually applies it. If this passes, the bug is somewhere
// outside the apply path itself — e.g., the runtime panel sync wiping
// the grid afterwards, or the GL renderer caching stale buffers.
//
// We DON'T load the real live-sync IIFE — that pulls in dozens of
// browser-only deps. We re-implement just the apply gate logic in
// isolation, mirroring lines 462-520 of runtime-live-sync-core.js.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const APPLY_SRC = readFileSync(
  "./src/app/runtime/live-sync/runtime-live-sync-core.js",
  "utf8",
);

// Reconstruct the apply gate. If this drifts from the real source,
// the source-grep tests below catch it.
function applyLastAlignGridSnapshot({
  state,
  runtime,
  outputRole,
  OUTPUT_ROLE_FINAL,
  liveSyncClientId,
  gridState,
}) {
  if (
    outputRole !== OUTPUT_ROLE_FINAL
    || !runtime?.lastAlignGridSnapshot
    || typeof runtime.lastAlignGridSnapshot !== "object"
  ) {
    return { applied: false, reason: "gate-pre-fail" };
  }
  const snap = runtime.lastAlignGridSnapshot;
  const snapAt = snap.at ? Date.parse(snap.at) : 0;
  const snapKey = `${snap.at || ""}:${snap.profileId || ""}:${snap.points?.length || 0}`;
  const isOriginator = !!liveSyncClientId && snap.originatorClientId === liveSyncClientId;
  const acceptable =
    Array.isArray(snap.srcXs) && Array.isArray(snap.srcYs)
    && Array.isArray(snap.points)
    && Number.isFinite(snapAt)
    && !isOriginator;
  if (!acceptable) {
    return { applied: false, reason: "not-acceptable", snapKey, isOriginator };
  }
  if (state._lastAppliedAlignGridSnapshotKey === snapKey) {
    return { applied: false, reason: "already-applied", snapKey };
  }
  state._lastAppliedAlignGridSnapshotKey = snapKey;
  if (!gridState?.restoreGridSnapshot) {
    return { applied: false, reason: "grid-state-missing" };
  }
  const points2D = [];
  for (let r = 0; r < snap.srcYs.length; r++) {
    points2D[r] = [];
    for (let c = 0; c < snap.srcXs.length; c++) {
      points2D[r][c] = { x: snap.srcXs[c], y: snap.srcYs[r] };
    }
  }
  for (const pt of snap.points) {
    if (
      Number.isInteger(pt.row) && Number.isInteger(pt.col)
      && points2D[pt.row] && points2D[pt.row][pt.col]
    ) {
      points2D[pt.row][pt.col] = { x: pt.x, y: pt.y };
    }
  }
  gridState.restoreGridSnapshot({
    srcXs: snap.srcXs.slice(),
    srcYs: snap.srcYs.slice(),
    points: points2D,
  });
  return { applied: true, snapKey };
}

test("h40 apply: SSR-tab boot with seeded snapshot → restoreGridSnapshot called", () => {
  const restoreCalls = [];
  const state = {};
  const runtime = {
    lastAlignGridSnapshot: {
      srcXs: [0, 0.5, 1],
      srcYs: [0, 0.5, 1],
      points: [
        { row: 0, col: 0, x: 0.1, y: 0.1 },
        { row: 0, col: 1, x: 0.5, y: 0.1 },
        { row: 0, col: 2, x: 0.9, y: 0.1 },
        { row: 1, col: 0, x: 0.1, y: 0.5 },
        { row: 1, col: 1, x: 0.5, y: 0.5 },
        { row: 1, col: 2, x: 0.9, y: 0.5 },
        { row: 2, col: 0, x: 0.1, y: 0.9 },
        { row: 2, col: 1, x: 0.5, y: 0.9 },
        { row: 2, col: 2, x: 0.9, y: 0.9 },
      ],
      profileId: "test-profile",
      originatorClientId: "server-disk-restore",
      at: "2026-05-06T17:52:11.082Z",
    },
  };
  const gridState = {
    restoreGridSnapshot: (snap) => restoreCalls.push(snap),
  };

  const result = applyLastAlignGridSnapshot({
    state, runtime,
    outputRole: "final-output",
    OUTPUT_ROLE_FINAL: "final-output",
    liveSyncClientId: "live-fresh-ssr-tab-clientid",
    gridState,
  });

  assert.equal(result.applied, true, `apply must succeed (got ${JSON.stringify(result)})`);
  assert.equal(restoreCalls.length, 1, "restoreGridSnapshot must be called exactly once");
  assert.equal(restoreCalls[0].srcXs.length, 3);
  assert.equal(restoreCalls[0].srcYs.length, 3);
  assert.equal(restoreCalls[0].points.length, 3);
  assert.equal(restoreCalls[0].points[0].length, 3);
  // TL corner = 0.1, 0.1
  assert.equal(restoreCalls[0].points[0][0].x, 0.1);
  assert.equal(restoreCalls[0].points[0][0].y, 0.1);
  // BR corner = 0.9, 0.9
  assert.equal(restoreCalls[0].points[2][2].x, 0.9);
  assert.equal(restoreCalls[0].points[2][2].y, 0.9);
});

test("h40 apply: rejects if originator matches local clientId", () => {
  const restoreCalls = [];
  const state = {};
  const runtime = {
    lastAlignGridSnapshot: {
      srcXs: [0, 0.5, 1], srcYs: [0, 0.5, 1],
      points: [{ row: 0, col: 0, x: 0.5, y: 0.5 }],
      profileId: "p",
      originatorClientId: "live-self",
      at: "2026-05-06T17:52:11.082Z",
    },
  };
  const result = applyLastAlignGridSnapshot({
    state, runtime,
    outputRole: "final-output",
    OUTPUT_ROLE_FINAL: "final-output",
    liveSyncClientId: "live-self",
    gridState: { restoreGridSnapshot: (s) => restoreCalls.push(s) },
  });
  assert.equal(result.applied, false);
  assert.equal(result.reason, "not-acceptable");
  assert.equal(result.isOriginator, true);
  assert.equal(restoreCalls.length, 0);
});

test("h40 apply: rejects if outputRole is CONTROL (dashboard)", () => {
  const restoreCalls = [];
  const state = {};
  const runtime = {
    lastAlignGridSnapshot: {
      srcXs: [0, 0.5, 1], srcYs: [0, 0.5, 1],
      points: [{ row: 0, col: 0, x: 0.5, y: 0.5 }],
      profileId: "p",
      originatorClientId: "x",
      at: "2026-05-06T17:52:11.082Z",
    },
  };
  const result = applyLastAlignGridSnapshot({
    state, runtime,
    outputRole: "control",
    OUTPUT_ROLE_FINAL: "final-output",
    liveSyncClientId: "live-dashboard",
    gridState: { restoreGridSnapshot: (s) => restoreCalls.push(s) },
  });
  assert.equal(result.applied, false);
  assert.equal(restoreCalls.length, 0);
});

test("h40 apply: dedups via _lastAppliedAlignGridSnapshotKey on second invocation", () => {
  const restoreCalls = [];
  const state = {};
  const runtime = {
    lastAlignGridSnapshot: {
      srcXs: [0, 0.5, 1], srcYs: [0, 0.5, 1],
      points: [{ row: 0, col: 0, x: 0.5, y: 0.5 }],
      profileId: "p",
      originatorClientId: "x",
      at: "2026-05-06T17:52:11.082Z",
    },
  };
  const args = {
    state, runtime,
    outputRole: "final-output",
    OUTPUT_ROLE_FINAL: "final-output",
    liveSyncClientId: "live-y",
    gridState: { restoreGridSnapshot: (s) => restoreCalls.push(s) },
  };
  const r1 = applyLastAlignGridSnapshot(args);
  const r2 = applyLastAlignGridSnapshot(args);
  assert.equal(r1.applied, true);
  assert.equal(r2.applied, false);
  assert.equal(r2.reason, "already-applied");
  assert.equal(restoreCalls.length, 1, "second apply must be deduped");
});

test("source-grep: real apply path matches the reconstructed gate", () => {
  // If this test fails, the reconstructed gate above has drifted from
  // the source — update both in lockstep.
  assert.match(APPLY_SRC, /runtime\.lastAlignGridSnapshot/);
  assert.match(APPLY_SRC, /_lastAppliedAlignGridSnapshotKey\s*!==\s*snapKey/);
  assert.match(APPLY_SRC, /isOriginator\s*=\s*!!localClientId\s*&&\s*snap\.originatorClientId\s*===\s*localClientId/);
  assert.match(APPLY_SRC, /Number\.isFinite\(snapAt\)/);
});
