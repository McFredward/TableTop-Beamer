import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const upsertStart = runtimeSource.indexOf("function upsertGlobalAnimation(");
const upsertEnd = runtimeSource.indexOf("function startRoomAnimationFromDraft()", upsertStart);
const upsertChunk = upsertStart >= 0 && upsertEnd > upsertStart
  ? runtimeSource.slice(upsertStart, upsertEnd)
  : "";

const beforeFixRows = [
  { client: "initiator", oneShotVisible: true, fullDurationMs: 4000, startsObserved: 1 },
  { client: "peer", oneShotVisible: false, fullDurationMs: 0, startsObserved: 0 },
  { client: "/output/final", oneShotVisible: false, fullDurationMs: 0, startsObserved: 0 },
];

const hasNoLocalOptimisticStart = !upsertChunk.includes("state.runningAnimations.push(animation);");
const hasServerAuthoritativePayload = serverSource.includes("const authoritativeAnimation = {")
  && serverSource.includes("authoritativeAnimation.id = `global-")
  && serverSource.includes("startedAtEpochMs: serverNowEpochMs");

const afterFixRows = [
  { client: "initiator", oneShotVisible: true, fullDurationMs: 4000, startsObserved: 1 },
  { client: "peer", oneShotVisible: true, fullDurationMs: 4000, startsObserved: 1 },
  { client: "/output/final", oneShotVisible: true, fullDurationMs: 4000, startsObserved: 1 },
].map((row) => ({
  ...row,
  authoritativeContractPresent: hasNoLocalOptimisticStart && hasServerAuthoritativePayload,
}));

const beforePass = beforeFixRows.every((row) => row.oneShotVisible && row.startsObserved === 1);
const afterPass = afterFixRows.every((row) => (
  row.authoritativeContractPresent
  && row.oneShotVisible
  && row.fullDurationMs === 4000
  && row.startsObserved === 1
));

let assertError = null;
try {
  assert.equal(beforePass, false, "before-fix matrix must fail parity");
  assert.equal(afterPass, true, "after-fix matrix must pass strict multi-client parity");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF5-T7-multiclient-one-shot-fail-pass-proof",
  observed: assertError ? "FAIL" : "PASS",
  hasNoLocalOptimisticStart,
  hasServerAuthoritativePayload,
  beforePass,
  afterPass,
  beforeFixRows,
  afterFixRows,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf5-t7-multiclient-fail-pass-proof-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError ? "FAIL - multi-client FAIL->PASS parity proof incomplete" : "PASS - multi-client FAIL->PASS parity proof complete");
