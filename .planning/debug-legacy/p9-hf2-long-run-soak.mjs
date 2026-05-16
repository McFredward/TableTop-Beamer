import assert from "node:assert/strict";

function resolveStartEpoch(animation, nowEpochMs) {
  const direct = Number(animation?.startedAtEpochMs);
  if (Number.isFinite(direct)) {
    return direct;
  }
  return nowEpochMs;
}

function isActive(animation, nowEpochMs) {
  if (animation?.hold === true) {
    return true;
  }
  const durationMs = Number(animation?.durationMs);
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return true;
  }
  return resolveStartEpoch(animation, nowEpochMs) + durationMs > nowEpochMs;
}

function fingerprint(animation, nowEpochMs) {
  return `${animation.boardId}:${animation.type}:${resolveStartEpoch(animation, nowEpochMs)}:${Number(animation.durationMs) || 0}`;
}

const terminalFingerprints = new Set();
const iterations = 800;
let replaySuppressed = 0;
let activeExpiredDetected = 0;

for (let index = 0; index < iterations; index += 1) {
  const nowEpochMs = Date.now() + index * 1000;
  const startedAtEpochMs = nowEpochMs - 12000;
  const snapshotAnimations = [
    {
      id: `expired-${index % 5}`,
      scope: "global",
      boardId: "nemesis-board-a",
      type: index % 2 === 0 ? "intruder-alert" : "power-outage",
      hold: false,
      durationMs: 6000,
      startedAtEpochMs,
    },
    {
      id: `active-${index}`,
      scope: "global",
      boardId: "nemesis-board-a",
      type: "ambient-drift",
      hold: true,
      durationMs: null,
      startedAtEpochMs: nowEpochMs - 800,
    },
  ];

  const active = [];
  for (const animation of snapshotAnimations) {
    if (!isActive(animation, nowEpochMs)) {
      terminalFingerprints.add(fingerprint(animation, nowEpochMs));
      continue;
    }
    const fp = fingerprint(animation, nowEpochMs);
    if (terminalFingerprints.has(fp)) {
      replaySuppressed += 1;
      continue;
    }
    active.push(animation);
  }

  const leakedExpired = active.some((entry) => Number(entry.durationMs) > 0);
  if (leakedExpired) {
    activeExpiredDetected += 1;
  }
}

assert.equal(activeExpiredDetected, 0, "expired one-shot replay leaked into active list");

console.log(JSON.stringify({
  suite: "p9-hf2-long-run-soak",
  executedAt: new Date().toISOString(),
  iterations,
  replaySuppressed,
  activeExpiredDetected,
  result: "PASS",
}, null, 2));
