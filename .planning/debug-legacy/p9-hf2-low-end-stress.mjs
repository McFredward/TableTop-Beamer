import assert from "node:assert/strict";

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function applyFrameCost(state, frameCostMs) {
  const samples = state.frameCostSamples;
  samples.push(frameCostMs);
  if (samples.length > 240) {
    samples.shift();
  }
  const p90 = percentile(samples, 0.9);
  const targetMs = 16.7;
  if (p90 > targetMs * 1.9) {
    state.pressureLevel = 2;
    state.nonCriticalCoalesceStride = 3;
    state.maxRenderAnimationsPerFrame = 28;
    state.maxAshParticles = 80;
    state.maxOutsideStarsPerLayer = 34;
  } else if (p90 > targetMs * 1.35) {
    state.pressureLevel = 1;
    state.nonCriticalCoalesceStride = 2;
    state.maxRenderAnimationsPerFrame = 56;
    state.maxAshParticles = 150;
    state.maxOutsideStarsPerLayer = 64;
  } else {
    state.pressureLevel = 0;
    state.nonCriticalCoalesceStride = 1;
    state.maxRenderAnimationsPerFrame = 96;
    state.maxAshParticles = 240;
    state.maxOutsideStarsPerLayer = 110;
  }
}

const state = {
  frameCostSamples: [],
  pressureLevel: 0,
  nonCriticalCoalesceStride: 1,
  maxRenderAnimationsPerFrame: 96,
  maxAshParticles: 240,
  maxOutsideStarsPerLayer: 110,
};

const stressFrames = [];
for (let index = 0; index < 620; index += 1) {
  const frameCostMs = index < 160
    ? 15 + (index % 4)
    : index < 320
      ? 33 + (index % 6)
      : 18 + (index % 3);
  applyFrameCost(state, frameCostMs);
  stressFrames.push({
    index,
    frameCostMs,
    pressureLevel: state.pressureLevel,
    stride: state.nonCriticalCoalesceStride,
    maxRenderAnimationsPerFrame: state.maxRenderAnimationsPerFrame,
  });
}

const reachedPressure2 = stressFrames.some((entry) => entry.pressureLevel === 2);
const recoveredTo0 = stressFrames.slice(-120).some((entry) => entry.pressureLevel === 0);

assert.equal(reachedPressure2, true, "stress run never escalated to pressure level 2");
assert.equal(recoveredTo0, true, "stress run never recovered to pressure level 0");

console.log(JSON.stringify({
  suite: "p9-hf2-low-end-stress",
  executedAt: new Date().toISOString(),
  totalFrames: stressFrames.length,
  reachedPressure2,
  recoveredTo0,
  finalState: {
    pressureLevel: state.pressureLevel,
    nonCriticalCoalesceStride: state.nonCriticalCoalesceStride,
    maxRenderAnimationsPerFrame: state.maxRenderAnimationsPerFrame,
    maxAshParticles: state.maxAshParticles,
    maxOutsideStarsPerLayer: state.maxOutsideStarsPerLayer,
  },
  result: "PASS",
}, null, 2));
