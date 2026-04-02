import assert from "node:assert/strict";

function applyRuntimePressureCaps({ role, level }) {
  const finalOutputPriority = role === "final-output";
  if (level >= 2) {
    return {
      nonCriticalCoalesceStride: finalOutputPriority ? 2 : 4,
      maxRenderAnimationsPerFrame: finalOutputPriority ? 48 : 18,
      maxAshParticles: finalOutputPriority ? 120 : 56,
      maxOutsideStarsPerLayer: finalOutputPriority ? 48 : 24,
      videoDecodeStride: finalOutputPriority ? 1 : 2,
    };
  }
  if (level === 1) {
    return {
      nonCriticalCoalesceStride: finalOutputPriority ? 1 : 2,
      maxRenderAnimationsPerFrame: finalOutputPriority ? 72 : 40,
      maxAshParticles: finalOutputPriority ? 180 : 120,
      maxOutsideStarsPerLayer: finalOutputPriority ? 78 : 52,
      videoDecodeStride: 1,
    };
  }
  return {
    nonCriticalCoalesceStride: 1,
    maxRenderAnimationsPerFrame: finalOutputPriority ? 96 : 84,
    maxAshParticles: finalOutputPriority ? 240 : 210,
    maxOutsideStarsPerLayer: finalOutputPriority ? 110 : 92,
    videoDecodeStride: 1,
  };
}

const finalL2 = applyRuntimePressureCaps({ role: "final-output", level: 2 });
const controlL2 = applyRuntimePressureCaps({ role: "control", level: 2 });

assert.equal(finalL2.maxRenderAnimationsPerFrame > controlL2.maxRenderAnimationsPerFrame, true, "final output should keep larger render budget");
assert.equal(finalL2.maxAshParticles > controlL2.maxAshParticles, true, "final output should keep larger particle budget");
assert.equal(controlL2.videoDecodeStride, 2, "control should decode-throttle under heavy pressure");
assert.equal(finalL2.videoDecodeStride, 1, "final output should stay decode-continuous");

console.log(JSON.stringify({
  suite: "p9-hf3-final-output-priority",
  executedAt: new Date().toISOString(),
  pressureLevel: 2,
  finalOutput: finalL2,
  control: controlL2,
  result: "PASS",
}, null, 2));
