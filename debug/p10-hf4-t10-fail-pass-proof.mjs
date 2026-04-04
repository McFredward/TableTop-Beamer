import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const failEvidenceFiles = [
  ".planning/phases/phase-10/P10-HF4-T1-REPRO-TRACE.md",
  ".planning/phases/phase-10/P10-HF4-T2-RUNTIME-PANEL-DIAGNOSTICS.md",
  ".planning/phases/phase-10/P10-HF4-T4-OWNERSHIP-REPRO.md",
  ".planning/phases/phase-10/P10-HF4-T6-SHIP-CLIP-REPRO.md",
];

const passOutputFiles = [
  "debug/p10-hf4-t1-runtime-panels-repro-output.json",
  "debug/p10-hf4-t2-runtime-panels-diagnostics-output.json",
  "debug/p10-hf4-t4-settings-ownership-repro-output.json",
  "debug/p10-hf4-t6-ship-clip-repro-output.json",
  "debug/p10-hf4-t8-browser-parity-output.json",
  "debug/p10-hf4-t9-final-output-canonical-output.json",
];

const failChecks = failEvidenceFiles.map((path) => {
  const content = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  return {
    path,
    hasFailMarker: /Assertion failed|result: FAIL/.test(content),
  };
});

const passChecks = passOutputFiles.map((path) => {
  const parsed = JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
  return {
    path,
    suite: parsed.suite,
    result: parsed.result,
  };
});

assert.ok(failChecks.every((entry) => entry.hasFailMarker), "All RED evidence files must contain explicit FAIL traces");
assert.ok(passChecks.every((entry) => entry.result === "PASS"), "All HF4 diagnostics must be PASS after fixes");

const output = {
  suite: "p10-hf4-t10-fail-pass-proof",
  executedAt: new Date().toISOString(),
  failEvidence: failChecks,
  passEvidence: passChecks,
  result: "PASS",
};

writeFileSync(new URL("./p10-hf4-t10-fail-pass-proof-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
