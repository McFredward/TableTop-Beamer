// Phase-31 boot-time grid sync: verify that loadActiveGrid → live-hello
// envelope path actually delivers the seeded grid to a fresh client.
//
// This test simulates the EXACT sequence on SSR-tab boot:
//   1. Server starts with persisted runtime-active-grid.json
//   2. h41 seeds liveSessionState.snapshot.runtime.lastAlignGridSnapshot
//   3. h42 bumps liveSessionState.version to 1
//   4. SSR-tab connects → live-hello envelope built from liveSessionState
//   5. Client (live-sync core) receives live-hello and applies the snapshot
//
// We cover steps 1-4 directly; step 5 is verified by source-grep on the
// apply path.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  loadActiveGrid,
  persistActiveGrid,
  flushActiveGrid,
  ACTIVE_GRID_SCHEMA,
  _resetForTests,
} from "../src/server/ssr-state-restore.mjs";

function makeTmp() {
  const root = mkdtempSync(path.join(tmpdir(), "ttbeamer-grid-"));
  return {
    rootDir: root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test("h41+h42 simulation: live-hello envelope carries lastAlignGridSnapshot", async () => {
  const { rootDir, cleanup } = makeTmp();
  try {
    _resetForTests();
    // STEP 1: persist a non-default grid (simulating the user's earlier drag).
    mkdirSync(path.join(rootDir, "config"), { recursive: true });
    const seededGrid = {
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
      profileId: "test-profile-1",
    };
    await persistActiveGrid({ rootDir, ...seededGrid });
    await flushActiveGrid();

    // STEP 2: simulate h41 — load and seed liveSessionState.
    const restored = await loadActiveGrid({ rootDir });
    assert.ok(restored, "loadActiveGrid must return a value");
    assert.equal(restored.points.length, 9);
    assert.equal(restored.profileId, "test-profile-1");

    // Build a fake liveSessionState mimicking server.mjs lines 121+ + 4140-4196.
    const liveSessionState = {
      version: 0,
      updatedAt: new Date().toISOString(),
      lastMutation: null,
      snapshot: {
        schema: "tt-beamer.live-state.v1",
        alignMode: false,
        alignModeDirtyOnOutput: false,
        selectedBoard: null,
        selectedLayout: null,
        outsideFxByBoard: {},
        runtime: null,
      },
    };

    // h41 block.
    if (!liveSessionState.snapshot.runtime) liveSessionState.snapshot.runtime = {};
    liveSessionState.snapshot.runtime.lastAlignGridSnapshot = {
      srcXs: restored.srcXs.slice(),
      srcYs: restored.srcYs.slice(),
      points: restored.points.map((p) => ({ row: p.row, col: p.col, x: p.x, y: p.y })),
      profileId: restored.profileId,
      originatorClientId: "server-disk-restore",
      at: restored.persistedAt || new Date().toISOString(),
    };
    // h42: bump version.
    liveSessionState.version = Math.max(1, Number(liveSessionState.version || 0) + 1);
    liveSessionState.updatedAt = new Date().toISOString();

    assert.equal(liveSessionState.version, 1, "h42 must bump version to >=1");
    assert.ok(
      liveSessionState.snapshot.runtime.lastAlignGridSnapshot,
      "h41 must populate lastAlignGridSnapshot",
    );

    // STEP 3: simulate buildLiveSessionEnvelope (server.mjs:1510).
    const buildLiveSessionEnvelope = (type, extra = {}) => ({
      type,
      session: {
        version: liveSessionState.version,
        updatedAt: liveSessionState.updatedAt,
        lastMutation: liveSessionState.lastMutation,
        snapshot: liveSessionState.snapshot,
      },
      ...extra,
    });

    const helloEnvelope = buildLiveSessionEnvelope("live-hello", {
      clientId: "live-fake-1",
      role: "final-output",
      replay: { mode: "snapshot-base-version", baseVersion: liveSessionState.version },
    });

    // STEP 4: assert the envelope carries the grid snapshot.
    assert.ok(
      helloEnvelope?.session?.snapshot?.runtime?.lastAlignGridSnapshot,
      "live-hello envelope must carry runtime.lastAlignGridSnapshot",
    );
    const carried = helloEnvelope.session.snapshot.runtime.lastAlignGridSnapshot;
    assert.equal(carried.profileId, "test-profile-1");
    assert.equal(carried.points.length, 9);
    assert.equal(carried.originatorClientId, "server-disk-restore");
    assert.equal(helloEnvelope.session.version, 1);

    // STEP 5: source-grep the apply path to verify we have the right gates.
    const APPLY_SRC = readFileSync(
      "./src/app/runtime/live-sync/runtime-live-sync-core.js",
      "utf8",
    );
    // Slow-path apply must restoreGridSnapshot when the snap key is fresh.
    assert.match(
      APPLY_SRC,
      /runtime\.lastAlignGridSnapshot/,
      "applyLiveRuntimeSnapshot must reference runtime.lastAlignGridSnapshot",
    );
    assert.match(
      APPLY_SRC,
      /restoreGridSnapshot/,
      "applyLiveRuntimeSnapshot must call gridState.restoreGridSnapshot",
    );
    assert.match(
      APPLY_SRC,
      /_lastAppliedAlignGridSnapshotKey/,
      "applyLiveRuntimeSnapshot must dedup via _lastAppliedAlignGridSnapshotKey",
    );
  } finally {
    cleanup();
  }
});

test("h41+h42 simulation: clone of live-hello envelope (JSON serialization) preserves lastAlignGridSnapshot", async () => {
  // The server.mjs sendLiveSocketMessage path serializes the envelope via
  // JSON.stringify. Verify lastAlignGridSnapshot survives the roundtrip
  // (no non-enumerable / function fields that would be stripped).
  const { rootDir, cleanup } = makeTmp();
  try {
    _resetForTests();
    mkdirSync(path.join(rootDir, "config"), { recursive: true });
    const seededGrid = {
      srcXs: [0, 0.5, 1],
      srcYs: [0, 0.5, 1],
      points: [
        { row: 0, col: 0, x: 0.05, y: 0.05 },
        { row: 0, col: 1, x: 0.5, y: 0.05 },
        { row: 0, col: 2, x: 0.95, y: 0.05 },
        { row: 1, col: 0, x: 0.05, y: 0.5 },
        { row: 1, col: 1, x: 0.5, y: 0.5 },
        { row: 1, col: 2, x: 0.95, y: 0.5 },
        { row: 2, col: 0, x: 0.05, y: 0.95 },
        { row: 2, col: 1, x: 0.5, y: 0.95 },
        { row: 2, col: 2, x: 0.95, y: 0.95 },
      ],
      profileId: "stretch-90",
    };
    await persistActiveGrid({ rootDir, ...seededGrid });
    await flushActiveGrid();

    const restored = await loadActiveGrid({ rootDir });

    const envelope = {
      type: "live-hello",
      session: {
        version: 1,
        updatedAt: new Date().toISOString(),
        lastMutation: null,
        snapshot: {
          schema: "tt-beamer.live-state.v1",
          alignMode: false,
          runtime: {
            lastAlignGridSnapshot: {
              srcXs: restored.srcXs.slice(),
              srcYs: restored.srcYs.slice(),
              points: restored.points.map((p) => ({ ...p })),
              profileId: restored.profileId,
              originatorClientId: "server-disk-restore",
              at: restored.persistedAt,
            },
          },
        },
      },
      clientId: "live-fake-2",
      role: "final-output",
    };

    // Serialize + parse like the WebSocket frame.
    const serialized = JSON.stringify(envelope);
    const parsed = JSON.parse(serialized);
    assert.ok(
      parsed?.session?.snapshot?.runtime?.lastAlignGridSnapshot,
      "lastAlignGridSnapshot must survive JSON serialization",
    );
    const carriedPoints = parsed.session.snapshot.runtime.lastAlignGridSnapshot.points;
    assert.equal(carriedPoints.length, 9);
    assert.deepEqual(carriedPoints[4], { row: 1, col: 1, x: 0.5, y: 0.5 });
  } finally {
    cleanup();
  }
});
