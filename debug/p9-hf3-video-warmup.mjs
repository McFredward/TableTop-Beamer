import assert from "node:assert/strict";

function ensureWarmup({ readyStates }) {
  const warmup = {
    requestedAtMs: 0,
    stableSinceMs: 0,
    primedAtMs: 0,
  };
  const timeline = [];
  for (const sample of readyStates) {
    const { nowMs, readyState } = sample;
    if (!warmup.requestedAtMs) {
      warmup.requestedAtMs = nowMs;
    }
    if (readyState < 2) {
      warmup.stableSinceMs = 0;
      timeline.push({ nowMs, readyState, warmReady: false });
      continue;
    }
    if (!warmup.stableSinceMs) {
      warmup.stableSinceMs = nowMs;
    }
    const warmReady = nowMs - warmup.stableSinceMs >= 90;
    timeline.push({ nowMs, readyState, warmReady });
  }
  return timeline;
}

function shouldAllowLifecycleSeek({ nowMs, lastLifecyclePrimeAtMs }) {
  return nowMs - lastLifecyclePrimeAtMs >= 180;
}

const warmTimeline = ensureWarmup({
  readyStates: [
    { nowMs: 0, readyState: 1 },
    { nowMs: 45, readyState: 2 },
    { nowMs: 110, readyState: 2 },
    { nowMs: 142, readyState: 2 },
  ],
});

const firstWarmReady = warmTimeline.find((entry) => entry.warmReady === true)?.nowMs ?? null;

assert.equal(firstWarmReady, 142, "warmup should require stable readiness window before draw");
assert.equal(shouldAllowLifecycleSeek({ nowMs: 1500, lastLifecyclePrimeAtMs: 1360 }), false, "seek cooldown should block decoder thrash");
assert.equal(shouldAllowLifecycleSeek({ nowMs: 1600, lastLifecyclePrimeAtMs: 1360 }), true, "seek cooldown should reopen after guard window");

console.log(JSON.stringify({
  suite: "p9-hf3-video-warmup",
  executedAt: new Date().toISOString(),
  warmTimeline,
  firstWarmReady,
  seekCooldownMs: 180,
  result: "PASS",
}, null, 2));
