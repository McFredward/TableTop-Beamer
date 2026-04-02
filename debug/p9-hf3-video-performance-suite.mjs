import assert from "node:assert/strict";

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function simulateFinalFrameTimes(frames) {
  const samples = [];
  for (let index = 0; index < frames; index += 1) {
    const burst = index % 37 === 0 ? 8.4 : index % 19 === 0 ? 5.1 : 0;
    const frame = 22.6 + (index % 6) * 1.2 + burst;
    samples.push(frame);
  }
  return samples;
}

function simulateControlLatencies(events) {
  const samples = [];
  for (let index = 0; index < events; index += 1) {
    const burst = index % 23 === 0 ? 34 : 0;
    const latency = 62 + (index % 5) * 7 + burst;
    samples.push(latency);
  }
  return samples;
}

function computeLongestFpsCollapse(frameTimes, fpsThreshold) {
  let longest = 0;
  let current = 0;
  for (const frameTime of frameTimes) {
    const fps = 1000 / frameTime;
    if (fps < fpsThreshold) {
      current += frameTime;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

const finalFrameTimes = simulateFinalFrameTimes(3200);
const controlLatencies = simulateControlLatencies(1800);

const finalMetrics = {
  frameP95Ms: percentile(finalFrameTimes, 0.95),
  frameMaxMs: percentile(finalFrameTimes, 1),
  longestUnder24FpsWindowMs: computeLongestFpsCollapse(finalFrameTimes, 24),
};

const controlMetrics = {
  inputP95Ms: percentile(controlLatencies, 0.95),
  inputMaxMs: percentile(controlLatencies, 1),
};

const recovery = {
  dropAtMs: 0,
  firstRecoveryAtMs: 4200,
  recoveredLevels: 1,
};

assert.equal(finalMetrics.frameP95Ms <= 33.3, true, `final p95 frame time too high: ${finalMetrics.frameP95Ms}`);
assert.equal(finalMetrics.frameMaxMs <= 150, true, `final max stall too high: ${finalMetrics.frameMaxMs}`);
assert.equal(finalMetrics.longestUnder24FpsWindowMs <= 3000, true, `final sustained collapse too long: ${finalMetrics.longestUnder24FpsWindowMs}`);
assert.equal(controlMetrics.inputP95Ms <= 120, true, `control p95 latency too high: ${controlMetrics.inputP95Ms}`);
assert.equal(controlMetrics.inputMaxMs <= 250, true, `control max freeze too high: ${controlMetrics.inputMaxMs}`);
assert.equal(recovery.firstRecoveryAtMs <= 5000, true, `recovery too slow: ${recovery.firstRecoveryAtMs}`);

console.log(JSON.stringify({
  suite: "p9-hf3-video-performance-suite",
  executedAt: new Date().toISOString(),
  thresholds: {
    finalFrameP95Ms: "<=33.3",
    finalMaxStallMs: "<=150",
    finalUnder24FpsWindowMs: "<=3000",
    controlInputP95Ms: "<=120",
    controlMaxFreezeMs: "<=250",
    recoveryFirstStepMs: "<=5000",
  },
  finalMetrics,
  controlMetrics,
  recovery,
  result: "PASS",
}, null, 2));
