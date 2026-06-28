// Phase 58 Wave 3.8o — regression: the inside (global-scope) reversible-freeze
// re-trigger must be DETERMINISTIC, exactly like the room path.
//
// Bug (operator 2026-06-08): the inside "freeze" button (play-then-freeze +
// reverse-then-freeze-first) behaved inconsistently across presses — sometimes
// it removed the animation, sometimes nothing happened, sometimes it worked.
// Root cause: upsertGlobalAnimation never pushed the triggered instance into
// state.runningAnimations locally (unlike runtime-room-dispatch.js), so the
// re-trigger candidate `existing` was present-or-absent purely as a function of
// snapshot-roundtrip timing. A press during the roundtrip window re-issued
// trigger-global (restart at phase=forward = "nothing") or fell through to the
// STOP+REMOVE toggle ("disappears"). Fix: create+push the instance locally with
// a STABLE id (server preserves it), so every subsequent press flips the phase.
//
// This test loads the REAL runtime-runtime-controls.js IIFE and drives 22
// presses under the worst case (snapshot never lands between presses).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function loadControls() {
  const url = new URL("../src/app/runtime/animation/runtime-runtime-controls.js", import.meta.url);
  const src = readFileSync(url, "utf8");
  const sandbox = { window: {}, performance: { now: () => Date.now() }, Date, console: { warn() {}, log() {} } };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.window.TT_BEAMER_RUNTIME_RUNTIME_CONTROLS;
}

function makeHarness(def) {
  let idc = 0;
  const state = { boardId: "board", runningAnimations: [] };
  const emits = [];
  const ctx = {
    state,
    OUTPUT_ROLE_CONTROL: "control",
    getOutputRole: () => "control",
    getOutsideFxProfile: () => ({ animations: [] }),
    getInsideFxProfile: () => ({ animations: [def] }),
    getGlobalAnimationCategory: () => "inside",
    isOutsideAnimationType: () => false,
    createAnimation: (opts) => ({ id: `anim-local-${idc++}`, playbackPhase: "forward", ...opts }),
    stopAnimation: (id) => emits.push(`STOP(${id})`),
    stopAnimationSound: () => {},
    emitStopAnimationCommand: (id) => { emits.push(`emitStop(${id})`); return Promise.resolve(); },
    emitLiveMutation: (type, payload) => {
      emits.push(`${type}${payload?.action ? "/" + payload.action : ""}`);
      return Promise.resolve();
    },
    buildAnimationSnapshotForLiveSync: (a) => ({ ...a }),
    getAnimationLabel: (t) => t,
    triggerFeedback: { textContent: "" },
    renderRunningAnimationsList: () => {},
    refreshGlobalButtons: () => {},
    updateOutsideFxProfile: () => {},
    persistBoardProfiles: () => {},
    syncOutsideFxPanel: () => {},
    getBoards: () => [],
  };
  return { state, emits, ctx };
}

test("inside reversible-freeze re-trigger is deterministic across 22 worst-case presses", () => {
  const controls = loadControls();
  const def = {
    id: "frost-snow", assetType: "gif", assetRef: "snow.gif",
    playbackMode: "play-then-freeze", onRetrigger: "reverse-then-freeze-first",
    playbackDirection: "forward", intensity: 1, speed: 1, opacity: 1,
  };
  const { state, emits, ctx } = makeHarness(def);
  controls.init(ctx);

  // Render layer settles a forward playthrough at frozen-last (reverse at
  // frozen-first) between presses — but we DO NOT let any server snapshot
  // land, so state.runningAnimations is only ever populated by the local push.
  const settle = () => {
    const inst = state.runningAnimations.find((a) => a.scope === "global");
    if (inst?.playbackPhase === "forward") inst.playbackPhase = "frozen-last";
    else if (inst?.playbackPhase === "reverse") inst.playbackPhase = "frozen-first";
  };

  const PRESSES = 22;
  let creates = 0, flips = 0, stops = 0;
  let expectedPhase = "forward";
  for (let i = 1; i <= PRESSES; i++) {
    emits.length = 0;
    controls.upsertGlobalAnimation("frost-snow", 4, { playSound: true });
    const e = emits.join(",");
    if (e.includes("trigger-global/start")) creates++;
    if (e.includes("edit-room")) flips++;
    if (e.includes("STOP")) stops++;

    const inst = state.runningAnimations.find((a) => a.scope === "global");
    assert.equal(state.runningAnimations.length, 1, `press ${i}: exactly one instance`);
    assert.equal(inst.id, "global-board:frost-snow", `press ${i}: stable id`);
    assert.equal(inst.playbackMode, "play-then-freeze", `press ${i}: mode preserved`);

    expectedPhase = i === 1
      ? "forward"
      : (expectedPhase === "forward" || expectedPhase === "frozen-last") ? "reverse" : "forward";
    assert.equal(inst.playbackPhase, expectedPhase, `press ${i}: phase ${expectedPhase}`);
    settle();
  }

  assert.equal(creates, 1, "exactly one trigger-global/start (only the first press creates)");
  assert.equal(flips, PRESSES - 1, "every subsequent press flips the phase via edit-room");
  assert.equal(stops, 0, "no spurious stop/remove (animation never disappears)");
});

test("inside loop animation keeps legacy toggle behavior (no stable-id local push)", () => {
  const controls = loadControls();
  const def = {
    id: "frost-loop", assetType: "gif", assetRef: "loop.gif",
    playbackMode: "loop", onRetrigger: "instant-disappear",
    intensity: 1, speed: 1, opacity: 1,
  };
  const { state, emits, ctx } = makeHarness(def);
  controls.init(ctx);

  emits.length = 0;
  controls.upsertGlobalAnimation("frost-loop", 4, { playSound: true });
  // Loop globals still rely on the snapshot roundtrip (unchanged): the create
  // path does not push locally and emits a trigger-global/start.
  assert.ok(emits.join(",").includes("trigger-global/start"), "loop create emits trigger-global");
  assert.equal(state.runningAnimations.length, 0, "loop create does not push locally (legacy path untouched)");
});
