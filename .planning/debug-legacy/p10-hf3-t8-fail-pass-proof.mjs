import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const failEvidenceFiles = [
  ".planning/phases/phase-10/P10-HF3-T1-REPRO-TRACE.md",
  ".planning/phases/phase-10/P10-HF3-T2-DEFAULTS-OVERRIDE-REPRO.md",
  ".planning/phases/phase-10/P10-HF3-T3-FINAL-BLACK-REPRO.md",
  ".planning/phases/phase-10/P10-HF3-T4-LIFECYCLE-DIAGNOSTICS.md",
  ".planning/phases/phase-10/P10-HF3-T5-BOARD-SWITCH-FINAL-CONTRACT.md",
  ".planning/phases/phase-10/P10-HF3-T6-CANONICAL-SOURCE-SELECTION.md",
];

const passOutputFiles = [
  "debug/p10-hf3-t1-lockdown-firefox-mobile-repro-output.json",
  "debug/p10-hf3-t2-defaults-override-repro-output.json",
  "debug/p10-hf3-t3-final-black-rectangle-repro-output.json",
  "debug/p10-hf3-t4-lifecycle-diagnostics-output.json",
  "debug/p10-hf3-t5-board-switch-final-contract-output.json",
  "debug/p10-hf3-t6-canonical-source-selection-output.json",
];

const failChecks = failEvidenceFiles.map((path) => {
  const content = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const hasFailMarker = /FAIL \(expected RED baseline\)|AssertionError/.test(content);
  return {
    path,
    hasFailMarker,
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

assert.ok(failChecks.every((entry) => entry.hasFailMarker), "All T1..T6 fail evidence files must contain explicit FAIL traces");
assert.ok(passChecks.every((entry) => entry.result === "PASS"), "All T1..T6 diagnostics must be PASS after fix");

const output = {
  suite: "p10-hf3-t8-fail-pass-proof",
  executedAt: new Date().toISOString(),
  failEvidence: failChecks,
  passEvidence: passChecks,
  result: "PASS",
};

writeFileSync(new URL("./p10-hf3-t8-fail-pass-proof-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
