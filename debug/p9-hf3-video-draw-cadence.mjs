import assert from "node:assert/strict";

function getVideoDrawStride({ role, pressureLevel, priority }) {
  if (role === "final-output") {
    return 1;
  }
  const base = pressureLevel >= 2 ? 3 : pressureLevel === 1 ? 2 : 1;
  return priority === "critical" ? Math.max(1, base - 1) : base;
}

function simulateCadence({ role, pressureLevel, priority, frames }) {
  const stride = getVideoDrawStride({ role, pressureLevel, priority });
  let draws = 0;
  let cachedContinuityFrames = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    const shouldDraw = frame % stride === 0;
    if (shouldDraw) {
      draws += 1;
    } else {
      cachedContinuityFrames += 1;
    }
  }
  return {
    stride,
    frames,
    draws,
    cachedContinuityFrames,
  };
}

const controlNormal = simulateCadence({ role: "control", pressureLevel: 2, priority: "normal", frames: 180 });
const controlCritical = simulateCadence({ role: "control", pressureLevel: 2, priority: "critical", frames: 180 });
const finalCritical = simulateCadence({ role: "final-output", pressureLevel: 2, priority: "critical", frames: 180 });

assert.equal(controlNormal.stride, 3, "control normal stride mismatch under pressure");
assert.equal(controlCritical.stride, 2, "control critical stride mismatch under pressure");
assert.equal(finalCritical.stride, 1, "final output must keep full cadence");
assert.equal(controlNormal.cachedContinuityFrames > 0, true, "control should use cached continuity frames under pressure");
assert.equal(finalCritical.cachedContinuityFrames, 0, "final output must not cadence-drop critical frames");

console.log(JSON.stringify({
  suite: "p9-hf3-video-draw-cadence",
  executedAt: new Date().toISOString(),
  controlNormal,
  controlCritical,
  finalCritical,
  result: "PASS",
}, null, 2));
