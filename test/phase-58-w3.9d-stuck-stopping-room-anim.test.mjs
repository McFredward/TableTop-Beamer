// Phase 58 Wave 3.9d — regression: a room animation stop must never wedge in
// "Stopping". Reproduces the operator bug (2026-06-08): toggling OFF an active
// loop room animation occasionally left it grey "Stopping" forever, un-stoppable
// without a server restart.
//
// Two compounding faults:
//   (1) the stop was silently lost server-side (sequence-stale drop when the
//       fair scheduler dequeued a higher-seq state mutation before the queued
//       high-priority stop) -> the id stayed in runningAnimations -> client
//       pendingStop[id] never cleared.
//   (2) the client refused to re-dispatch an already-pending stop (no escape,
//       no retry) -> only a server restart recovered.
//
// This test loads the REAL runtime-lifecycle-stop-pipeline.js IIFE and drives
// stopAnimation + reconcileStopPendingFromSnapshot directly. It models the
// server still holding the id (the "stop was lost" condition) and asserts the
// fixed behavior: re-issue re-dispatches, reconcile auto-retries, the stop
// command carries roomId for the server fallback, and a confirmed removal
// clears the pending state.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function loadPipeline() {
  const url = new URL(
    "../src/app/runtime/animation/runtime-lifecycle-stop-pipeline.js",
    import.meta.url,
  );
  const src = readFileSync(url, "utf8");
  let nowMs = 1_000_000;
  const sandbox = {
    window: {},
    Date: { now: () => nowMs },
    Promise,
    console: { warn() {}, log() {} },
  };
  sandbox.__advance = (ms) => { nowMs += ms; };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return { pipeline: sandbox.window.TT_BEAMER_RUNTIME_LIFECYCLE_STOP_PIPELINE, sandbox };
}

function roomLoopAnim() {
  return {
    id: "room-1",
    scope: "room",
    type: "wave",
    roomId: "r1",
    boardId: "board",
    playbackMode: "loop",
  };
}

function makeCtx() {
  const emitted = [];
  const state = {
    runningAnimations: [roomLoopAnim()],
    roomDraft: { editTargetId: null },
    boardId: "board",
  };
  const liveSync = {
    pendingStopAnimationIds: new Set(),
  };
  const ctx = {
    state,
    liveSync,
    OUTPUT_ROLE_CONTROL: "control",
    getOutputRole: () => "control",
    STOP_ANIMATION_MUTATION_TYPE: "stop-animation",
    emitLiveMutation: (type, payload) => {
      emitted.push({ type, payload });
      return Promise.resolve({ applied: true });
    },
    getClusterMemberAnimationIds: () => [],
    triggerFeedback: { textContent: "" },
    stopAnimationSound: () => {},
    clearRoomDraftEditTarget: () => { state.roomDraft.editTargetId = null; },
    isOutsideAnimationType: () => false,
    updateOutsideFxProfile: () => {},
    persistBoardProfiles: () => {},
    syncOutsideFxPanel: () => {},
  };
  return { ctx, emitted, state, liveSync };
}

function initPipeline() {
  const { pipeline, sandbox } = loadPipeline();
  const { ctx, emitted, state, liveSync } = makeCtx();
  pipeline.init({
    ctx,
    renderRunningAnimationsList: () => {},
    refreshGlobalButtons: () => {},
  });
  return { pipeline, sandbox, ctx, emitted, state, liveSync };
}

const stopCommands = (emitted) => emitted.filter((m) => m.type === "stop-animation");

test("initial stop marks pending and dispatches a stop command with roomId meta", async () => {
  const { pipeline, emitted, liveSync } = initPipeline();
  pipeline.stopAnimation("room-1");
  await Promise.resolve();

  assert.equal(stopCommands(emitted).length, 1, "exactly one stop command emitted");
  const cmd = stopCommands(emitted)[0];
  assert.equal(cmd.payload.animationId, "room-1");
  assert.equal(cmd.payload.targetScope, "room", "scope meta sent for server fallback");
  assert.equal(cmd.payload.targetType, "wave", "type meta sent for server fallback");
  assert.equal(cmd.payload.roomId, "r1", "roomId meta sent so the server can fall back to room+type match");
  assert.ok(liveSync.pendingStopAnimationIds.has("room-1"), "id is marked stop-pending");
});

test("re-issuing a stop for an already-pending id RE-DISPATCHES (no permanent wedge)", async () => {
  const { pipeline, emitted, state, liveSync } = initPipeline();

  // First stop: dispatched, pending. Simulate the server LOSING it: the id
  // stays in runningAnimations (this is exactly the wedge condition).
  pipeline.stopAnimation("room-1");
  await Promise.resolve();
  assert.equal(stopCommands(emitted).length, 1);
  assert.ok(state.runningAnimations.some((a) => a.id === "room-1"), "server still holds the id (stop lost)");
  assert.ok(liveSync.pendingStopAnimationIds.has("room-1"), "still pending");

  // Operator re-toggles OFF the still-"Stopping" animation. Baseline bug:
  // this was a silent no-op ("already in flight") -> restart-only. Fixed:
  // it force re-dispatches a fresh stop (which gets a new clientSequence and
  // is no longer stale-dropped server-side).
  pipeline.stopAnimation("room-1");
  await Promise.resolve();
  assert.equal(
    stopCommands(emitted).length,
    2,
    "re-issuing a pending stop must re-dispatch (the wedge must be escapable without a restart)",
  );
});

test("reconcileStopPendingFromSnapshot AUTO-RETRIES a pending stop still present after the grace window", async () => {
  const { pipeline, sandbox, emitted, state, liveSync } = initPipeline();

  pipeline.stopAnimation("room-1");
  await Promise.resolve();
  assert.equal(stopCommands(emitted).length, 1);

  // A snapshot arrives still carrying the id, but within the grace window:
  // no retry yet (avoid hammering on a normal round-trip).
  pipeline.reconcileStopPendingFromSnapshot();
  assert.equal(stopCommands(emitted).length, 1, "no retry inside the grace window");

  // Grace window elapses, id STILL present (stop was lost) -> self-heal retry.
  sandbox.__advance(5_000);
  pipeline.reconcileStopPendingFromSnapshot();
  await Promise.resolve();
  assert.equal(
    stopCommands(emitted).length,
    2,
    "a pending stop still present after the grace window must auto-retry (self-heal, no restart)",
  );
  assert.ok(liveSync.pendingStopAnimationIds.has("room-1"), "stays pending until the server confirms removal");

  // Server finally removes it -> pending clears, no further retries.
  state.runningAnimations = [];
  pipeline.reconcileStopPendingFromSnapshot();
  assert.ok(!liveSync.pendingStopAnimationIds.has("room-1"), "pending cleared once the id leaves the snapshot");
  sandbox.__advance(5_000);
  pipeline.reconcileStopPendingFromSnapshot();
  assert.equal(stopCommands(emitted).length, 2, "no retries after the stop is confirmed landed");
});

// Root-cause precondition (deterministic): the fair scheduler can dequeue a
// higher-sequence STATE mutation BEFORE an already-queued lower-sequence
// high-priority CONTROL (stop) mutation. When that happens the server's
// per-client sequence watermark advances past the stop's sequence, so the
// stop trips the `seq <= last` stale gate and is dropped. This is why the
// server fix exempts control-critical mutations from that gate.
test("fair scheduler can apply a higher-seq state mutation before a queued lower-seq stop (stale-drop precondition)", async () => {
  const { dequeueFairMutation, createFairQueueState } = await import("../src/live/hf9-command-pipeline.mjs");
  const queueState = createFairQueueState();
  // Position the rotating cursor on a STATE slot of FAIR_SEQUENCE
  // [control,control,control,state,state,noisy].
  queueState.cursor = 3;
  const lanes = {
    control: [{ type: "stop-animation", clientSequence: 100 }],
    state: [{ type: "trigger-room", clientSequence: 101 }],
    noisy: [],
  };
  const first = dequeueFairMutation(queueState, lanes);
  assert.equal(first.type, "trigger-room", "state lane (higher seq) dequeued first while cursor is on a state slot");
  assert.equal(first.clientSequence, 101);
  const second = dequeueFairMutation(queueState, lanes);
  assert.equal(second.type, "stop-animation", "the lower-seq stop is applied AFTER -> tripped the old stale gate");
  assert.equal(second.clientSequence, 100);
  assert.ok(
    second.clientSequence < first.clientSequence,
    "stop's clientSequence is below the just-advanced watermark -> would be stale-dropped without the control-critical exemption",
  );
});

test("a confirmed-removed stop clears pending (normal happy path)", async () => {
  const { pipeline, state, liveSync } = initPipeline();
  pipeline.stopAnimation("room-1");
  await Promise.resolve();
  assert.ok(liveSync.pendingStopAnimationIds.has("room-1"));
  // Server removed it; next snapshot omits the id.
  state.runningAnimations = [];
  pipeline.reconcileStopPendingFromSnapshot();
  assert.ok(!liveSync.pendingStopAnimationIds.has("room-1"), "pending cleared on confirmed removal");
});
