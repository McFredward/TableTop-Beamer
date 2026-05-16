import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");

// The regression description says "global animations (one-shot) break on /output/final after approx. 1 second"
// and "synchronize loop and audio toggles in trigger payload"

// Let's check how upsertGlobalAnimation handles the loop parameter
const upsertMatch = runtimeSource.includes("const effectiveDefaultDurationSec = loopUntilStopped");
const clickMatch = runtimeSource.includes("const loopUntilStopped = Boolean(dashboardGlobalLoopUntilStopInput?.checked);");

// Let's check if there is an audio toggle anywhere in the code
const hasAudioToggleInGlobal = runtimeSource.includes("dashboard-global-play-sound");

const findings = [
  {
    id: "global-trigger-missing-audio-toggle",
    observed: hasAudioToggleInGlobal,
    expected: true,
  }
];

const failedChecks = findings.filter(f => f.observed !== f.expected);

const output = {
  suite: "p11-hf3-t1-red",
  phase: "RED",
  observed: failedChecks.length > 0 ? "FAIL" : "PASS",
  findings,
  failedChecks,
};

writeFileSync(
  new URL("./p11-hf3-t1-global-oneshot-duration-red-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`
);

if (output.observed === "FAIL") {
  console.log("FAIL - RED check passed (test failed as expected)");
} else {
  console.log("PASS - RED check failed (test passed, expected it to fail)");
}
