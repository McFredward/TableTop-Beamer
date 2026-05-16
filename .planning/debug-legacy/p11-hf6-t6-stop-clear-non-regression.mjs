import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasGlobalStopRevisionIncrement = serverSource.includes("globalStopRevisions[inferredTriggerKey] = currentStopRevision + 1")
  || serverSource.includes("globalStopRevisions[triggerKey] = stopRevision + 1");
const hasRetentionStopGuard = runtimeSource.includes("stopRevision >= triggerRevision")
  && runtimeSource.includes("activeSeenOneShotRunByTriggerRevision.delete(revisionKey)");
const hasClearAllRevisionIncrement = serverSource.includes("globalClearRevision += 1;")
  && serverSource.includes("nextRuntime.globalClearRevision = globalClearRevision;");
const hasClientClearRevisionApply = runtimeSource.includes("function observeGlobalClearRevision(")
  && runtimeSource.includes("liveSync.activeSeenOneShotRunByTriggerRevision.clear();");

const matrix = [
  { step: "global-stop-revision-authority", pass: hasGlobalStopRevisionIncrement },
  { step: "seen-one-shot-stop-guard", pass: hasRetentionStopGuard },
  { step: "clear-all-revision-authority", pass: hasClearAllRevisionIncrement },
  { step: "client-clear-apply-immediate", pass: hasClientClearRevisionApply },
];

let assertError = null;
try {
  assert.equal(matrix.every((row) => row.pass), true, "HF6 stop/clear non-regression matrix must be PASS");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF6-T6-stop-clear-non-regression",
  observed: assertError ? "FAIL" : "PASS",
  matrix,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf6-t6-stop-clear-non-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError ? "FAIL - HF6 stop/clear non-regression guard failed" : "PASS - HF6 stop/clear non-regression guard passed");
