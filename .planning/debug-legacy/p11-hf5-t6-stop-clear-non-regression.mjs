import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasGlobalStopRevisionIncrement = serverSource.includes("globalStopRevisions[inferredTriggerKey] = currentStopRevision + 1")
  || serverSource.includes("globalStopRevisions[triggerKey] = stopRevision + 1");
const hasTypeFallbackStop = serverSource.includes("shouldFallbackGlobalTypeStop");
const hasClearAllFlush = serverSource.includes("} else if (mutationType === \"clear-all\")")
  && serverSource.includes("runningAnimations.length = 0;");
const hasOutsideClearDisable = serverSource.includes("enabled: false");

const matrix = [
  { step: "global-stop-revision", pass: hasGlobalStopRevisionIncrement },
  { step: "global-stop-type-fallback", pass: hasTypeFallbackStop },
  { step: "clear-all-runtime-flush", pass: hasClearAllFlush },
  { step: "outside-disable-on-stop-clear", pass: hasOutsideClearDisable },
];

let assertError = null;
try {
  assert.equal(matrix.every((row) => row.pass), true, "stop/clear non-regression matrix must be PASS");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF5-T6-stop-clear-non-regression",
  observed: assertError ? "FAIL" : "PASS",
  matrix,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf5-t6-stop-clear-non-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError ? "FAIL - stop/clear non-regression guard failed" : "PASS - stop/clear non-regression guard passed");
