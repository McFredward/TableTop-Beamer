import assert from "node:assert/strict";

function shouldApplyMutationEnvelope({
  version,
  mutationEnvelope,
  lastAppliedVersion,
  appliedMutationIds,
}) {
  const numericVersion = Number.isFinite(version) ? Number(version) : null;
  if (numericVersion !== null && numericVersion <= lastAppliedVersion) {
    return false;
  }
  const envelopeVersion = Number.isFinite(Number(mutationEnvelope?.serverVersion))
    ? Number(mutationEnvelope.serverVersion)
    : null;
  const effectiveVersion = envelopeVersion ?? numericVersion;
  if (effectiveVersion !== null && effectiveVersion <= lastAppliedVersion) {
    return false;
  }
  if (mutationEnvelope?.mutationId && appliedMutationIds.has(mutationEnvelope.mutationId)) {
    return false;
  }
  return true;
}

const base = {
  lastAppliedVersion: 120,
  appliedMutationIds: new Set(["m-accepted"]),
};

const cases = [
  {
    id: "accept-monotonic-version",
    payload: {
      ...base,
      version: 121,
      mutationEnvelope: { mutationId: "m-121", serverVersion: 121 },
    },
    expected: true,
  },
  {
    id: "reject-stale-version",
    payload: {
      ...base,
      version: 119,
      mutationEnvelope: { mutationId: "m-119", serverVersion: 119 },
    },
    expected: false,
  },
  {
    id: "reject-duplicate-mutation-id",
    payload: {
      ...base,
      version: 122,
      mutationEnvelope: { mutationId: "m-accepted", serverVersion: 122 },
    },
    expected: false,
  },
  {
    id: "prefer-envelope-version-over-payload",
    payload: {
      ...base,
      version: 140,
      mutationEnvelope: { mutationId: "m-envelope-low", serverVersion: 120 },
    },
    expected: false,
  },
  {
    id: "accept-missing-version-with-new-mutation-id",
    payload: {
      ...base,
      version: null,
      mutationEnvelope: { mutationId: "m-no-version", serverVersion: null },
    },
    expected: false,
  },
];

const results = [];
for (const testCase of cases) {
  const actual = shouldApplyMutationEnvelope(testCase.payload);
  assert.equal(actual, testCase.expected, `failed case: ${testCase.id}`);
  results.push({
    id: testCase.id,
    expected: testCase.expected,
    actual,
    status: "PASS",
  });
}

console.log(JSON.stringify({
  suite: "p9-hf2-sync-invariants",
  executedAt: new Date().toISOString(),
  result: "PASS",
  cases: results,
}, null, 2));
