// Phase 58 Wave 3.8v — the FINAL/projector role must ADOPT a genuine inside
// reverse re-trigger (frozen-last -> reverse) from a live-sync snapshot.
//
// Bug (operator 2026-06-08): on /output (FINAL, SSR projector) the 2nd trigger
// of an inside play-then-freeze + reverse-on-retrigger animation does NOT play
// the reverse leg. FINAL stays on the frozen frame; the still-frame just
// disappears the instant CONTROL finishes its reverse and broadcasts the stop.
// The dashboard (CONTROL) plays reverse correctly.
//
// Root cause: primeGlobalTriggerRuntimeTimestamps overwrites the genuine
// re-trigger's re-stamped startedAtEpochMs (T2) with the PREVIOUS local epoch
// (T1) for the scope="global" inside instance, BEFORE the v1.2.45
// re-stamp-acceptance check (epoch delta > 250ms) reads it. The delta collapses
// to ~0, isReTriggerReStamp never fires, and the v1.2.45 RENDER_PLAYBACK_FIELDS
// preservation keeps FINAL's client-derived frozen-last phase -> FINAL never
// adopts playbackPhase="reverse".
//
// This test loads the REAL runtime-live-sync-core.js and drives
// applyLiveRuntimeSnapshot directly with a prime stub that FAITHFULLY mirrors
// the real prime's epoch clobber for global-scope animations
// (runtime-global-trigger-tracker.js:261,270): an already-present global
// animation keeps the PREVIOUS local startedAtEpochMs.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function loadCore() {
  const url = new URL("../src/app/runtime/live-sync/runtime-live-sync-core.js", import.meta.url);
  const src = readFileSync(url, "utf8");
  let nowMs = 1_000_000;
  const sandbox = {
    window: {},
    performance: { now: () => nowMs },
    Date,
    WebSocket: { OPEN: 1 },
    console: { warn() {}, log() {} },
    structuredClone: (v) => JSON.parse(JSON.stringify(v)),
  };
  sandbox.__advance = (ms) => { nowMs += ms; };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return { core: sandbox.window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE, sandbox };
}

const getEpoch = (a) => {
  const v = Number(a?.startedAtEpochMs);
  return Number.isFinite(v) ? v : 0;
};

function makeCtx(role = "final") {
  const state = {
    boardId: "board",
    selectedBoard: "board",
    selectedLayout: "board",
    selectedRoomId: null,
    selectedRoomByBoard: {},
    runningAnimations: [],
    outsideFxByBoard: {},
    insideFxByBoard: {},
    roomFxByBoard: {},
    playAreasByBoard: {},
    selectedPlayAreaIdByBoard: {},
    shipPolygonsByBoard: {},
    audio: { enabled: false, volume: 1 },
    animationSpeed: 1,
    alignMode: false,
    roomDraft: {},
  };
  const liveSync = {
    lastAppliedVersion: 0,
    appliedMutationIds: new Set(),
    applyRejectCounters: { staleVersion: 0, duplicateMutation: 0 },
    terminalOneShotRevisionByKey: new Map(),
    terminalOneShotFingerprints: new Map(),
    activeSeenOneShotRunByTriggerRevision: new Map(),
    lastObservedGlobalClearRevision: 0,
    clientId: "client-final",
    wsConnected: false,
    socket: null,
  };
  return {
    state,
    liveSync,
    OUTPUT_ROLE_CONTROL: "control",
    OUTPUT_ROLE_FINAL: "final",
    getOutputRole: () => role,
    shouldApplyMutationEnvelope: () => true,
    syncAlignModePanel: () => {},
    polygonContract: null,
    getBoards: () => [{ id: "board" }],
    SHIP_POLYGON_DEFAULT: { points: [] },
    normalizeShipPolygon: (p) => p,
    getSelectedPlayArea: () => null,
    reportCanonicalPolygonIssues: () => {},
    normalizeOutsideFxProfile: (p) => p ?? {},
    normalizeInsideFxProfile: (p) => p ?? {},
    normalizeRoomFxProfile: (p) => p ?? {},
    observeGlobalStopRevisions: () => {},
    observeGlobalClearRevision: () => {},
    getAnimationStartedAtEpochMs: getEpoch,
    filterRunningAnimationsForBoard: (anims, boardId) =>
      (Array.isArray(anims) ? anims : []).filter((a) => a && a.boardId === boardId),
    // FAITHFUL prime stub: mirrors runtime-global-trigger-tracker.js:261,270 —
    // for an already-present global animation, the incoming startedAtEpochMs is
    // OVERWRITTEN with the previous local epoch (the real clobber that hides the
    // re-trigger re-stamp from the preservation check).
    primeGlobalTriggerRuntimeTimestamps: (anims, previousById = new Map()) =>
      (Array.isArray(anims) ? anims : []).map((a) => {
        if (!a || a.scope !== "global") return a;
        const prev = previousById.get(a.id);
        if (prev) {
          return { ...a, startedAtEpochMs: getEpoch(prev) };
        }
        return a;
      }),
    reconcileHydratedAnimations: (anims) => anims,
    retainActiveSeenOneShotRuns: (anims) => anims,
    hydrateRunningAnimationStartTimestamps: (anims) =>
      (Array.isArray(anims) ? anims : []).map((a) => ({
        ...a,
        startedAtEpochMs: getEpoch(a),
      })),
    syncOutsideRuntimeMirror: () => {},
    warmGifAssetPath: () => {},
    warmBoardGifDefinitions: () => {},
    reconcileStopPendingFromSnapshot: () => {},
    clampAnimationSpeed: (v) => v,
    clampAudioVolumePercent: (v) => v,
    enforceAudioLifecycleGuard: () => {},
    hardStopRuntimeEffects: () => {},
    isControlCriticalMutationEnvelope: () => false,
    playSoundForAnimation: () => {},
    recordMutationTrace: () => {},
    refreshGlobalButtons: () => {},
    rememberAppliedMutationId: () => {},
    renderRoomOverlay: () => {},
    renderRunningAnimationsList: () => {},
    sendLiveMutationApplyAck: () => {},
    stopSoundsForInactiveAnimations: () => {},
    syncRuntimePanelsFromState: () => {},
  };
}

// Frozen inside global instance as it sits on FINAL after the client-derived
// forward->freeze transition. T1 = forward epoch.
const T1 = 500_000;
function frozenInsideGif() {
  return {
    id: "inside-gif", scope: "global", type: "snow", boardId: "board",
    roomAssetType: "gif", startedAtEpochMs: T1,
    playbackMode: "play-then-freeze", onRetrigger: "reverse-then-disappear",
    playbackPhase: "frozen-last", _endedDispatched: false, _phaseChangedAt: 12345,
    _gifLegPhase: "frozen-last", _gifLegStartPerfMs: 42_000, opacity: 0.8,
  };
}
function frozenInsideMp4() {
  return {
    id: "inside-mp4", scope: "global", type: "fire", boardId: "board",
    roomAssetType: "mp4", startedAtEpochMs: T1,
    playbackMode: "play-then-freeze", onRetrigger: "reverse-then-freeze-first",
    playbackPhase: "frozen-last", _endedDispatched: false, _phaseChangedAt: 11000,
    opacity: 0.9,
  };
}

// The genuine re-trigger snapshot the server broadcasts/serves: dispatch set
// playbackPhase="reverse" + startedAtEpochMs=Date.now() (=T2, NEW) and merged it
// server-side; every later snapshot carries reverse+T2.
const T2 = 540_000; // 40s after forward trigger; delta 40_000 >> 250
function reverseReTriggerOf(anim) {
  return {
    id: anim.id, scope: "global", type: anim.type, boardId: "board",
    roomAssetType: anim.roomAssetType, startedAtEpochMs: T2,
    playbackMode: anim.playbackMode, onRetrigger: anim.onRetrigger,
    playbackPhase: "reverse", opacity: anim.opacity,
  };
}
function serverForwardView(anim) {
  // Server's stale view of a still-running (pre-reverse) inside: never stores
  // frozen-* / never re-stamps. Used for unrelated-mutation regression.
  return {
    id: anim.id, scope: "global", type: anim.type, boardId: "board",
    roomAssetType: anim.roomAssetType, startedAtEpochMs: T1,
    playbackMode: anim.playbackMode, onRetrigger: anim.onRetrigger,
    playbackPhase: "forward", opacity: anim.opacity,
  };
}

function snapshot(runningAnimations) {
  return { runtime: { boardId: "board", runningAnimations } };
}

let __version = 100;

test("FINAL adopts a genuine inside reverse re-trigger over a frozen-last gif (the bug)", () => {
  const { core } = loadCore();
  const ctx = makeCtx("final");
  core.init(ctx);
  ctx.state.runningAnimations = [frozenInsideGif()];

  __version += 1;
  // edit-room broadcast carrying the re-trigger (reverse + re-stamped T2).
  core.applyLiveRuntimeSnapshot(
    snapshot([reverseReTriggerOf(frozenInsideGif())]),
    { version: __version, mutationType: "edit-room" },
  );

  const gif = ctx.state.runningAnimations.find((a) => a.id === "inside-gif");
  assert.ok(gif, "inside gif must still be present on FINAL");
  assert.equal(gif.playbackPhase, "reverse",
    "FINAL must ADOPT playbackPhase=reverse on a genuine re-trigger (not keep frozen-last)");
  // leg markers must NOT carry the stale frozen-last marker: the draw loop
  // detects the phase change and starts the reverse leg clock fresh.
  assert.notEqual(gif._gifLegPhase, "frozen-last",
    "stale gif leg marker must not survive a genuine re-trigger (else the reverse leg never starts)");
});

test("FINAL adopts inside reverse re-trigger via a snapshot-poll too (channel-independent)", () => {
  const { core } = loadCore();
  const ctx = makeCtx("final");
  core.init(ctx);
  ctx.state.runningAnimations = [frozenInsideMp4()];

  __version += 1;
  core.applyLiveRuntimeSnapshot(
    snapshot([reverseReTriggerOf(frozenInsideMp4())]),
    { version: __version, mutationType: "snapshot-poll" },
  );

  const mp4 = ctx.state.runningAnimations.find((a) => a.id === "inside-mp4");
  assert.equal(mp4.playbackPhase, "reverse",
    "FINAL must adopt reverse even when the re-stamp arrives via snapshot-poll");
});

test("10x repeated reverse re-trigger snapshots stay on reverse (no flip-flop on FINAL)", () => {
  const { core } = loadCore();
  const ctx = makeCtx("final");
  core.init(ctx);
  ctx.state.runningAnimations = [frozenInsideGif()];

  // First apply: adopt reverse.
  __version += 1;
  core.applyLiveRuntimeSnapshot(
    snapshot([reverseReTriggerOf(frozenInsideGif())]),
    { version: __version, mutationType: "edit-room" },
  );
  // Subsequent identical reverse snapshots (server re-emits reverse+T2). The
  // adopted epoch must persist so the re-stamp does NOT keep re-firing.
  for (let i = 0; i < 10; i++) {
    __version += 1;
    core.applyLiveRuntimeSnapshot(
      snapshot([reverseReTriggerOf(frozenInsideGif())]),
      { version: __version, mutationType: "snapshot-poll" },
    );
    const gif = ctx.state.runningAnimations.find((a) => a.id === "inside-gif");
    assert.equal(gif.playbackPhase, "reverse", `iter ${i}: FINAL stays on reverse`);
  }
});

test("v1.2.45 REGRESSION: an unrelated mutation still does NOT restart a frozen inside on FINAL", () => {
  const { core } = loadCore();
  const ctx = makeCtx("final");
  core.init(ctx);
  // Two frozen inside instances on FINAL.
  ctx.state.runningAnimations = [frozenInsideGif(), frozenInsideMp4()];

  // Unrelated edit-room: server re-emits the inside instances with its STALE
  // forward view (identical T1, never reverse) plus an edited room animation.
  for (let i = 0; i < 5; i++) {
    __version += 1;
    core.applyLiveRuntimeSnapshot(
      snapshot([
        serverForwardView(frozenInsideGif()),
        serverForwardView(frozenInsideMp4()),
        { id: "room-1", scope: "room", type: "wave", boardId: "board", startedAtEpochMs: 600_000 + i, opacity: 0.5 },
      ]),
      { version: __version, mutationType: "edit-room" },
    );
    const gif = ctx.state.runningAnimations.find((a) => a.id === "inside-gif");
    const mp4 = ctx.state.runningAnimations.find((a) => a.id === "inside-mp4");
    assert.equal(gif.playbackPhase, "frozen-last", `iter ${i}: gif stays frozen-last (v1.2.45 holds)`);
    assert.equal(gif._gifLegStartPerfMs, 42_000, `iter ${i}: gif leg clock not reset (no forward replay)`);
    assert.equal(mp4.playbackPhase, "frozen-last", `iter ${i}: mp4 stays frozen-last (v1.2.45 holds)`);
  }
});

test("reverse-then-freeze-first: after reverse completes, a stale server-reverse snapshot does NOT re-replay reverse over the client-derived frozen-first", () => {
  const { core } = loadCore();
  const ctx = makeCtx("final");
  core.init(ctx);
  ctx.state.runningAnimations = [frozenInsideMp4()]; // onRetrigger=reverse-then-freeze-first

  // 1) Genuine re-trigger -> FINAL adopts reverse (epoch now T2 persisted).
  __version += 1;
  core.applyLiveRuntimeSnapshot(
    snapshot([reverseReTriggerOf(frozenInsideMp4())]),
    { version: __version, mutationType: "edit-room" },
  );
  let mp4 = ctx.state.runningAnimations.find((a) => a.id === "inside-mp4");
  assert.equal(mp4.playbackPhase, "reverse", "adopts reverse first");

  // 2) Reverse leg completes -> render layer derives frozen-first (client-side).
  mp4.playbackPhase = "frozen-first";

  // 3) A LATER unrelated snapshot still carries the server's stored reverse+T2.
  //    FINAL must PRESERVE the client-derived frozen-first, NOT re-adopt reverse.
  __version += 1;
  core.applyLiveRuntimeSnapshot(
    snapshot([reverseReTriggerOf(frozenInsideMp4())]),
    { version: __version, mutationType: "snapshot-poll" },
  );
  mp4 = ctx.state.runningAnimations.find((a) => a.id === "inside-mp4");
  assert.equal(mp4.playbackPhase, "frozen-first",
    "stale server-reverse must not re-replay reverse over the client-derived frozen-first terminal state");
});
