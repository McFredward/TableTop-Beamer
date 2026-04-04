import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasLoopTogglePayload = runtimeSource.includes("loopUntilStopped: effectiveDefaultDurationSec === null");
const hasLoopHoldOnServer = serverSource.includes("hold: requestedLoopUntilStopped");
const hasLoopInfiniteDurationOnServer = serverSource.includes("durationMs: requestedLoopUntilStopped")
  && serverSource.includes("? null");
const hasStopActionPath = serverSource.includes("if (action === \"stop\")");

const loopMatrix = [
  { step: "start-loop", pass: hasLoopTogglePayload && hasLoopHoldOnServer },
  { step: "sustain-loop", pass: hasLoopInfiniteDurationOnServer },
  { step: "stop-loop", pass: hasStopActionPath },
];

let assertError = null;
try {
  assert.equal(loopMatrix.every((row) => row.pass), true, "loop start/sustain/stop non-regression must remain PASS");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF5-T5-loop-non-regression",
  observed: assertError ? "FAIL" : "PASS",
  loopMatrix,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf5-t5-loop-non-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError ? "FAIL - loop non-regression guard failed" : "PASS - loop non-regression guard passed");
