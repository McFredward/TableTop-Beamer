import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");

const hasPlaySoundInUpsert = runtimeSource.includes("playSound: true");
const hasPlaySoundInPayload = runtimeSource.includes("playSound,");

const findings = [
  {
    id: "global-trigger-payload-sync",
    observed: hasPlaySoundInPayload,
    expected: true,
  }
];

const failedChecks = findings.filter(f => f.observed !== f.expected);

const output = {
  suite: "p11-hf3-t4-pass",
  phase: "PASS",
  observed: failedChecks.length > 0 ? "FAIL" : "PASS",
  findings,
  failedChecks,
};

writeFileSync(
  new URL("./p11-hf3-t4-sync-audio-loop-payload-pass-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`
);

if (output.observed === "PASS") {
  console.log("PASS - check passed");
} else {
  console.log("FAIL - check failed");
}
