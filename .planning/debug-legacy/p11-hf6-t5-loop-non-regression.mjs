import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasLoopTogglePayload = runtimeSource.includes("loopUntilStopped: effectiveDefaultDurationSec === null");
const hasLoopHoldOnServer = serverSource.includes("hold: requestedLoopUntilStopped");
const hasLoopInfiniteDurationOnServer = serverSource.includes("durationMs: requestedLoopUntilStopped")
  && serverSource.includes("? null");
const hasStopActionPath = serverSource.includes("if (action === \"stop\")");
const hasSeenOneShotScopedToFiniteOnly = runtimeSource.includes("if (!isFiniteDurationGlobalAnimation(animation)) {")
  && runtimeSource.includes("function rememberSeenOneShotRun(");

const loopMatrix = [
  { step: "start-loop", pass: hasLoopTogglePayload && hasLoopHoldOnServer },
  { step: "sustain-loop", pass: hasLoopInfiniteDurationOnServer },
  { step: "stop-loop", pass: hasStopActionPath },
  { step: "finite-only-seen-lock", pass: hasSeenOneShotScopedToFiniteOnly },
];

let assertError = null;
try {
  assert.equal(loopMatrix.every((row) => row.pass), true, "HF6 loop start/sustain/stop non-regression must remain PASS");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF6-T5-loop-non-regression",
  observed: assertError ? "FAIL" : "PASS",
  loopMatrix,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf6-t5-loop-non-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError ? "FAIL - HF6 loop non-regression guard failed" : "PASS - HF6 loop non-regression guard passed");
