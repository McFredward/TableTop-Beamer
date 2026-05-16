import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const failEvidenceFiles = [
  ".planning/phases/phase-10/P10-HF6-T1-LOCKDOWNA-AREA-DROP-REPRO.md",
  ".planning/phases/phase-10/P10-HF6-T2-MERGE-LINEAGE-DIAGNOSTICS.md",
  ".planning/phases/phase-10/P10-HF6-T3-FALLBACK-SUBSET-REPLACEMENT-REPRO.md",
  ".planning/phases/phase-10/P10-HF6-T4-AREA-COUNT-PARITY.md",
  ".planning/phases/phase-10/P10-HF6-T5-AREA-ID-SET-PARITY.md",
  ".planning/phases/phase-10/P10-HF6-T6-CONTROL-FINAL-SET-PARITY.md",
];

const passOutputFiles = [
  "debug/p10-hf6-t1-lockdown-a-area-drop-repro-output.json",
  "debug/p10-hf6-t2-merge-lineage-diagnostics-output.json",
  "debug/p10-hf6-t3-fallback-subset-replacement-repro-output.json",
  "debug/p10-hf6-t4-area-count-parity-output.json",
  "debug/p10-hf6-t5-area-id-set-parity-output.json",
  "debug/p10-hf6-t6-control-final-set-parity-output.json",
  "debug/p10-hf6-t8-fallback-guard-output.json",
  "debug/p10-hf6-t9-browser-imported-multiarea-regression-output.json",
];

const failChecks = failEvidenceFiles.map((path) => {
  const content = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  return {
    path,
    hasFailMarker: /Assertion failed|result: FAIL|RED expected/.test(content),
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

assert.ok(failChecks.every((entry) => entry.hasFailMarker), "All RED evidence files must contain explicit fail markers");
assert.ok(passChecks.every((entry) => entry.result === "PASS"), "All HF6 post-fix diagnostics and matrices must report PASS");

const output = {
  suite: "p10-hf6-t10-fail-pass-proof",
  executedAt: new Date().toISOString(),
  failEvidence: failChecks,
  passEvidence: passChecks,
  result: "PASS",
};

writeFileSync(new URL("./p10-hf6-t10-fail-pass-proof-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
