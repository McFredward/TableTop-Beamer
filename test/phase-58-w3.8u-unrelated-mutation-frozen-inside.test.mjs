// Phase 58 Wave 3.8u — regression: an UNRELATED mutation (edit-room on a
// different animation, trigger/stop of other animations) must NOT restart a
// frozen inside (global-scope) play-then-freeze animation.
//
// Bug (operator 2026-06-08): a frozen inside play-then-freeze gif/mp4 sitting
// on its frozen-last/frozen-first frame REPLAYED forward the moment an
// unrelated ROOM animation was edited+saved. Root cause: applyLiveRuntimeSnapshot
// gated ALL playback-phase preservation behind `mutationType !== "edit-room"`,
// so an edit-room snapshot stripped EVERY other animation's client-derived
// playbackPhase (frozen-*) + gif leg-clock markers, reverting them to the
// server's stale "forward" → the leg clock re-initialized → forward replay.
//
// This test loads the REAL runtime-live-sync-core.js IIFE and drives
// applyLiveRuntimeSnapshot directly with a minimal ctx.

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

function makeCtx(role = "control") {
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
    clientId: "client-A",
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
    // board-bound filter: keep only animations whose boardId matches
    filterRunningAnimationsForBoard: (anims, boardId) =>
      (Array.isArray(anims) ? anims : []).filter((a) => a && a.boardId === boardId),
    // pass-through reconcile stubs (the bug under test is in the
    // preservation block, not these helpers)
    primeGlobalTriggerRuntimeTimestamps: (anims) => anims,
    reconcileHydratedAnimations: (anims) => anims,
    retainActiveSeenOneShotRuns: (anims) => anims,
    // faithful-enough hydrate: spreads the incoming object (so any field set
    // by the preservation block survives) and stamps startedAt/epoch
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
    // post-merge side-effect stubs (irrelevant to the preservation logic)
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

// A frozen inside gif instance as it sits in state after the client-derived
// freeze transition (playbackPhase + leg markers set by the render layer).
function frozenInsideGif() {
  return {
    id: "inside-gif",
    scope: "global",
    type: "snow",
    boardId: "board",
    roomAssetType: "gif",
    startedAtEpochMs: 500_000,
    playbackPhase: "frozen-last",
    _endedDispatched: false,
    _phaseChangedAt: 12345,
    _gifLegPhase: "frozen-last",
    _gifLegStartPerfMs: 42_000,
    opacity: 0.8,
  };
}

function frozenInsideMp4() {
  return {
    id: "inside-mp4",
    scope: "global",
    type: "fire",
    boardId: "board",
    roomAssetType: "mp4",
    startedAtEpochMs: 480_000,
    playbackPhase: "frozen-first",
    _endedDispatched: true,
    _phaseChangedAt: 11000,
    opacity: 0.9,
  };
}

// The server's view of a still-running inside instance: the server NEVER
// stores the client-derived frozen-* phase or the leg markers, and does NOT
// re-stamp the epoch on an unrelated mutation.
function serverViewOf(anim) {
  return {
    id: anim.id,
    scope: anim.scope,
    type: anim.type,
    boardId: anim.boardId,
    roomAssetType: anim.roomAssetType,
    startedAtEpochMs: anim.startedAtEpochMs, // identical epoch (no re-trigger)
    playbackPhase: "forward",
    opacity: anim.opacity,
  };
}

function snapshot(runningAnimations) {
  return { runtime: { boardId: "board", runningAnimations } };
}

let __version = 1;
function applyUnrelated(core, ctx, mutationType, extraRoomAnim) {
  // Re-emit both inside instances (server view) + an unrelated room animation.
  const running = [
    serverViewOf(frozenInsideGif()),
    serverViewOf(frozenInsideMp4()),
  ];
  if (extraRoomAnim) running.push(extraRoomAnim);
  __version += 1;
  return core.applyLiveRuntimeSnapshot(snapshot(running), {
    version: __version,
    mutationType,
  });
}

test("edit-room on an unrelated room animation leaves a frozen inside gif+mp4 untouched", () => {
  const { core } = loadCore();
  const ctx = makeCtx("control");
  core.init(ctx);
  // seed: two frozen inside instances already in local state
  ctx.state.runningAnimations = [frozenInsideGif(), frozenInsideMp4()];

  const roomEdit = {
    id: "room-1", scope: "room", type: "wave", boardId: "board",
    startedAtEpochMs: 600_000, playbackPhase: "forward", opacity: 0.5,
  };
  applyUnrelated(core, ctx, "edit-room", roomEdit);

  const gif = ctx.state.runningAnimations.find((a) => a.id === "inside-gif");
  const mp4 = ctx.state.runningAnimations.find((a) => a.id === "inside-mp4");
  const room = ctx.state.runningAnimations.find((a) => a.id === "room-1");

  assert.ok(gif, "inside gif must still be present");
  assert.equal(gif.playbackPhase, "frozen-last", "frozen gif phase must be preserved across unrelated edit-room");
  assert.equal(gif._gifLegPhase, "frozen-last", "gif leg phase marker preserved (prevents leg-clock reset/replay)");
  assert.equal(gif._gifLegStartPerfMs, 42_000, "gif leg-clock origin preserved (no forward replay)");

  assert.ok(mp4, "inside mp4 must still be present");
  assert.equal(mp4.playbackPhase, "frozen-first", "frozen mp4 phase must be preserved across unrelated edit-room");

  assert.ok(room, "edited room animation present");
  assert.equal(room.opacity, 0.5, "edit-room edit still applies to the edited animation");
});

test("10x assorted unrelated mutations never restart the frozen inside instances", () => {
  const { core } = loadCore();
  const ctx = makeCtx("control");
  core.init(ctx);
  ctx.state.runningAnimations = [frozenInsideGif(), frozenInsideMp4()];

  const mutations = [
    ["edit-room", { id: "room-1", scope: "room", type: "wave", boardId: "board", startedAtEpochMs: 600_000, opacity: 0.3 }],
    ["trigger-room", { id: "room-2", scope: "room", type: "rain", boardId: "board", startedAtEpochMs: 610_000 }],
    ["context-update", null],
    ["edit-room", { id: "room-1", scope: "room", type: "wave", boardId: "board", startedAtEpochMs: 600_000, opacity: 0.7 }],
    ["outside-update", null],
    ["trigger-room", { id: "room-3", scope: "room", type: "fog", boardId: "board", startedAtEpochMs: 620_000 }],
    ["edit-room", { id: "room-2", scope: "room", type: "rain", boardId: "board", startedAtEpochMs: 610_000, opacity: 0.2 }],
    ["context-update", null],
    ["edit-room", { id: "room-3", scope: "room", type: "fog", boardId: "board", startedAtEpochMs: 620_000, opacity: 0.9 }],
    ["trigger-global", { id: "other-global", scope: "global", type: "stars", boardId: "board", startedAtEpochMs: 630_000 }],
  ];

  for (let i = 0; i < mutations.length; i++) {
    const [type, extra] = mutations[i];
    applyUnrelated(core, ctx, type, extra);
    const gif = ctx.state.runningAnimations.find((a) => a.id === "inside-gif");
    const mp4 = ctx.state.runningAnimations.find((a) => a.id === "inside-mp4");
    assert.equal(gif.playbackPhase, "frozen-last", `iter ${i} (${type}): gif must stay frozen-last`);
    assert.equal(gif._gifLegStartPerfMs, 42_000, `iter ${i} (${type}): gif leg clock must not reset`);
    assert.equal(mp4.playbackPhase, "frozen-first", `iter ${i} (${type}): mp4 must stay frozen-first`);
  }
});

test("stop-animation of a DIFFERENT animation leaves the frozen inside instances frozen", () => {
  const { core } = loadCore();
  const ctx = makeCtx("control");
  core.init(ctx);
  ctx.state.runningAnimations = [frozenInsideGif(), frozenInsideMp4(), {
    id: "room-x", scope: "room", type: "wave", boardId: "board", startedAtEpochMs: 600_000,
  }];
  // snapshot omits room-x (it was stopped); inside instances remain
  __version += 1;
  core.applyLiveRuntimeSnapshot(
    snapshot([serverViewOf(frozenInsideGif()), serverViewOf(frozenInsideMp4())]),
    { version: __version, mutationType: "stop-animation" },
  );
  const gif = ctx.state.runningAnimations.find((a) => a.id === "inside-gif");
  const mp4 = ctx.state.runningAnimations.find((a) => a.id === "inside-mp4");
  assert.ok(!ctx.state.runningAnimations.find((a) => a.id === "room-x"), "stopped room removed");
  assert.equal(gif.playbackPhase, "frozen-last", "gif stays frozen after stop of another animation");
  assert.equal(mp4.playbackPhase, "frozen-first", "mp4 stays frozen after stop of another animation");
});

test("a legitimate inside re-trigger (epoch jump >250ms) STILL replays forward", () => {
  const { core } = loadCore();
  const ctx = makeCtx("control");
  core.init(ctx);
  ctx.state.runningAnimations = [frozenInsideGif()];

  // re-trigger: server re-stamps startedAtEpochMs far newer + phase forward
  const reTriggered = {
    id: "inside-gif", scope: "global", type: "snow", boardId: "board",
    roomAssetType: "gif", startedAtEpochMs: 500_000 + 5_000, playbackPhase: "forward",
  };
  __version += 1;
  core.applyLiveRuntimeSnapshot(snapshot([reTriggered]), { version: __version, mutationType: "trigger-global" });

  const gif = ctx.state.runningAnimations.find((a) => a.id === "inside-gif");
  assert.equal(gif.playbackPhase, "forward", "legit re-trigger must NOT preserve the stale frozen phase");
  assert.notEqual(gif._gifLegPhase, "frozen-last", "re-trigger must not carry stale frozen leg marker");
});

test("on FINAL (projector) role, unrelated edit-room also leaves frozen inside untouched", () => {
  const { core } = loadCore();
  const ctx = makeCtx("final");
  core.init(ctx);
  ctx.state.runningAnimations = [frozenInsideGif(), frozenInsideMp4()];
  applyUnrelated(core, ctx, "edit-room", {
    id: "room-1", scope: "room", type: "wave", boardId: "board", startedAtEpochMs: 600_000, opacity: 0.5,
  });
  const gif = ctx.state.runningAnimations.find((a) => a.id === "inside-gif");
  const mp4 = ctx.state.runningAnimations.find((a) => a.id === "inside-mp4");
  assert.equal(gif.playbackPhase, "frozen-last", "projector: gif stays frozen across unrelated edit-room");
  assert.equal(mp4.playbackPhase, "frozen-first", "projector: mp4 stays frozen across unrelated edit-room");
});
