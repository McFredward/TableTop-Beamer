import assert from "node:assert/strict";

function shouldApplyMutationEnvelope({ version, mutationEnvelope, lastAppliedVersion, appliedMutationIds }) {
  const numericVersion = Number.isFinite(version) ? Number(version) : null;
  if (numericVersion !== null && numericVersion <= lastAppliedVersion) {
    return false;
  }
  const envelopeVersion = Number.isFinite(Number(mutationEnvelope?.serverVersion))
    ? Number(mutationEnvelope.serverVersion)
    : null;
  const effectiveVersion = envelopeVersion ?? numericVersion;
  if (effectiveVersion === null || effectiveVersion <= lastAppliedVersion) {
    return false;
  }
  if (mutationEnvelope?.mutationId && appliedMutationIds.has(mutationEnvelope.mutationId)) {
    return false;
  }
  return true;
}

function isActive(animation, nowEpochMs) {
  if (animation?.hold === true) {
    return true;
  }
  const durationMs = Number(animation?.durationMs);
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return true;
  }
  const startedAtEpochMs = Number(animation?.startedAtEpochMs) || nowEpochMs;
  return startedAtEpochMs + durationMs > nowEpochMs;
}

function stopAnimationDeterministically(runningAnimations, id) {
  const before = runningAnimations.length;
  const after = runningAnimations.filter((entry) => entry.id !== id);
  return {
    removed: before - after.length,
    runningAnimations: after,
  };
}

const syncCases = [
  {
    id: "accept-monotonic",
    payload: {
      version: 211,
      mutationEnvelope: { mutationId: "m-211", serverVersion: 211 },
      lastAppliedVersion: 210,
      appliedMutationIds: new Set(["m-100"]),
    },
    expected: true,
  },
  {
    id: "reject-stale",
    payload: {
      version: 210,
      mutationEnvelope: { mutationId: "m-210", serverVersion: 210 },
      lastAppliedVersion: 210,
      appliedMutationIds: new Set(["m-100"]),
    },
    expected: false,
  },
  {
    id: "reject-duplicate-mutation",
    payload: {
      version: 212,
      mutationEnvelope: { mutationId: "m-dup", serverVersion: 212 },
      lastAppliedVersion: 211,
      appliedMutationIds: new Set(["m-dup"]),
    },
    expected: false,
  },
];

for (const testCase of syncCases) {
  const actual = shouldApplyMutationEnvelope(testCase.payload);
  assert.equal(actual, testCase.expected, `sync determinism failed: ${testCase.id}`);
}

const nowEpochMs = Date.now();
const hydrated = [
  {
    id: "expired-intruder",
    type: "intruder-alert",
    hold: false,
    durationMs: 5000,
    startedAtEpochMs: nowEpochMs - 12000,
  },
  {
    id: "active-ambient",
    type: "ambient-drift",
    hold: true,
    durationMs: null,
    startedAtEpochMs: nowEpochMs - 400,
  },
];

const activeAfterHydration = hydrated.filter((entry) => isActive(entry, nowEpochMs));
assert.equal(activeAfterHydration.some((entry) => entry.id === "expired-intruder"), false, "expired one-shot replayed after hydrate");

const stopInput = [
  { id: "anim-1", scope: "room" },
  { id: "anim-2", scope: "global" },
  { id: "anim-3", scope: "cluster" },
];

const stopResult = stopAnimationDeterministically(stopInput, "anim-2");
assert.equal(stopResult.removed, 1, "stop should remove exactly one target instance");
assert.equal(stopResult.runningAnimations.some((entry) => entry.id === "anim-2"), false, "target animation still present after stop");
assert.equal(stopResult.runningAnimations.length, 2, "stop removed unexpected additional entries");

console.log(JSON.stringify({
  suite: "p9-hf3-determinism-regression",
  executedAt: new Date().toISOString(),
  syncCases: syncCases.length,
  activeAfterHydration: activeAfterHydration.map((entry) => entry.id),
  stopRemoved: stopResult.removed,
  result: "PASS",
}, null, 2));
