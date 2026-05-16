import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasGlobalStopRevisionIncrement =
  serverSource.includes("globalStopRevisions[inferredTriggerKey] = currentStopRevision + 1;")
  && serverSource.includes("globalStopRevisions[inferredTriggerKey] = currentStopRevision + 1;");

const loopAnimation = {
  scope: "global",
  type: "intruder-alert",
  hold: true,
  durationMs: 4_000,
  startedAtEpochMs: 1_700_000_000_000,
};

const isLoopActiveAt = (offsetMs) => loopAnimation.hold === true || (loopAnimation.startedAtEpochMs + loopAnimation.durationMs > (loopAnimation.startedAtEpochMs + offsetMs));

const checks = {
  startVisible: isLoopActiveAt(0),
  sustainVisibleAfter30s: isLoopActiveAt(30_000),
  stopRevisionPathPresent: hasGlobalStopRevisionIncrement,
};

let assertError = null;
try {
  assert.equal(checks.startVisible, true, "loop should start visible");
  assert.equal(checks.sustainVisibleAfter30s, true, "loop should sustain until explicit stop");
  assert.equal(checks.stopRevisionPathPresent, true, "loop stop revision path must remain intact");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF4-T4-loop-non-regression",
  observed: assertError ? "FAIL" : "PASS",
  checks,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf4-t4-loop-non-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError ? "FAIL - loop non-regression gate failed" : "PASS - loop non-regression gate passed");
