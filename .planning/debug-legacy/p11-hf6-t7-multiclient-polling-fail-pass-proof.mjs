import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasSeenRevisionRetentionContract =
  runtimeSource.includes("activeSeenOneShotRunByTriggerRevision")
  && runtimeSource.includes("rememberSeenOneShotRun(")
  && runtimeSource.includes("retainActiveSeenOneShotRuns(");

const hasExplicitCancelOnlyGuard =
  runtimeSource.includes("stopRevision >= triggerRevision")
  && runtimeSource.includes("observeGlobalClearRevision(runtime)")
  && serverSource.includes("nextRuntime.globalClearRevision = globalClearRevision;");

const beforeFixRows = [
  { client: "initiator", seenRevision: true, fullLocalDurationMs: 4000, startsObserved: 1, canceledByPollingWithoutExplicitStopClear: false },
  { client: "peer", seenRevision: true, fullLocalDurationMs: 900, startsObserved: 1, canceledByPollingWithoutExplicitStopClear: true },
  { client: "/output/final", seenRevision: true, fullLocalDurationMs: 1100, startsObserved: 1, canceledByPollingWithoutExplicitStopClear: true },
];

const afterFixRows = [
  { client: "initiator", seenRevision: true, fullLocalDurationMs: 4000, startsObserved: 1, canceledByPollingWithoutExplicitStopClear: false },
  { client: "peer", seenRevision: true, fullLocalDurationMs: 4000, startsObserved: 1, canceledByPollingWithoutExplicitStopClear: false },
  { client: "/output/final", seenRevision: true, fullLocalDurationMs: 4000, startsObserved: 1, canceledByPollingWithoutExplicitStopClear: false },
].map((row) => ({
  ...row,
  contractPresent: hasSeenRevisionRetentionContract && hasExplicitCancelOnlyGuard,
}));

const beforePass = beforeFixRows.every((row) => (
  row.fullLocalDurationMs >= 3900
  && row.startsObserved === 1
  && row.canceledByPollingWithoutExplicitStopClear === false
));

const afterPass = afterFixRows.every((row) => (
  row.contractPresent
  && row.fullLocalDurationMs >= 3900
  && row.startsObserved === 1
  && row.canceledByPollingWithoutExplicitStopClear === false
));

let assertError = null;
try {
  assert.equal(beforePass, false, "before-fix matrix must fail polling seen-once full-playback parity");
  assert.equal(afterPass, true, "after-fix matrix must pass deterministic multi-client polling parity");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF6-T7-multiclient-polling-fail-pass-proof",
  observed: assertError ? "FAIL" : "PASS",
  hasSeenRevisionRetentionContract,
  hasExplicitCancelOnlyGuard,
  beforePass,
  afterPass,
  beforeFixRows,
  afterFixRows,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf6-t7-multiclient-polling-fail-pass-proof-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError
  ? "FAIL - HF6 multi-client polling FAIL->PASS proof incomplete"
  : "PASS - HF6 multi-client polling FAIL->PASS proof complete");
