import assert from "node:assert/strict";

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function resolvePressureCandidate(p90, targetMs) {
  if (p90 > targetMs * 1.9) {
    return 2;
  }
  if (p90 > targetMs * 1.35) {
    return 1;
  }
  return 0;
}

function updatePressureLevelWithHysteresis(state, { candidateLevel, p90, targetMs }) {
  const currentLevel = state.pressureLevel;
  const escalationFramesRequired = candidateLevel >= 2 ? 6 : 8;
  const recoveryFramesRequired = 75;
  if (candidateLevel > currentLevel) {
    state.escalationFrames += 1;
    state.recoveryFrames = 0;
    if (state.escalationFrames >= escalationFramesRequired) {
      state.pressureLevel = candidateLevel;
      state.escalationFrames = 0;
    }
    return;
  }
  if (candidateLevel < currentLevel) {
    const strictRecoveryTarget = currentLevel >= 2 ? targetMs * 1.2 : targetMs * 1.05;
    state.recoveryFrames = p90 <= strictRecoveryTarget ? state.recoveryFrames + 1 : 0;
    state.escalationFrames = 0;
    if (state.recoveryFrames >= recoveryFramesRequired) {
      state.pressureLevel = Math.max(0, currentLevel - 1);
      state.recoveryFrames = 0;
    }
    return;
  }
  state.escalationFrames = 0;
  state.recoveryFrames = 0;
}

const state = {
  samples: [],
  pressureLevel: 0,
  escalationFrames: 0,
  recoveryFrames: 0,
};

const targetMs = 16.7;
const timeline = [];

for (let frame = 0; frame < 780; frame += 1) {
  const frameCost = frame < 180
    ? 16 + (frame % 4)
    : frame < 420
      ? 35 + (frame % 7)
      : 17 + (frame % 3);
  state.samples.push(frameCost);
  if (state.samples.length > 240) {
    state.samples.shift();
  }
  const p90 = percentile(state.samples, 0.9);
  const candidateLevel = resolvePressureCandidate(p90, targetMs);
  updatePressureLevelWithHysteresis(state, { candidateLevel, p90, targetMs });
  timeline.push({ frame, p90, candidateLevel, pressureLevel: state.pressureLevel });
}

const firstLevel2 = timeline.find((entry) => entry.pressureLevel === 2)?.frame ?? null;
const recoveryStep = timeline.find((entry) => entry.frame > 420 && entry.pressureLevel === 1)?.frame ?? null;
const finalLevel = timeline.at(-1)?.pressureLevel ?? -1;

assert.equal(firstLevel2 !== null, true, "ladder never escalated to pressure level 2");
assert.equal(recoveryStep !== null, true, "ladder never recovered at least one level after pressure drop");
assert.equal(recoveryStep - 420 <= 300, true, "ladder did not recover one level within 5 seconds at 60fps");
assert.equal(finalLevel <= 1, true, "ladder did not stabilize after recovery window");

console.log(JSON.stringify({
  suite: "p9-hf3-adaptive-ladder",
  executedAt: new Date().toISOString(),
  firstLevel2Frame: firstLevel2,
  recoveryStepFrame: recoveryStep,
  recoveryWithinFrames: recoveryStep - 420,
  finalLevel,
  result: "PASS",
}, null, 2));
