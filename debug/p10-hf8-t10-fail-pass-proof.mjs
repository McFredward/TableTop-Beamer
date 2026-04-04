import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const failEvidenceFiles = [
  ".planning/phases/phase-10/P10-HF8-T1-ALL-BOARD-FALLBACK-REPRO.md",
  ".planning/phases/phase-10/P10-HF8-T2-DEFAULTS-REAPPLY-REPRO.md",
  ".planning/phases/phase-10/P10-HF8-T4-SILENT-FALLBACK-REPRO.md",
];

const passOutputFiles = [
  "debug/p10-hf8-t3-canonical-lineage-diagnostics-output.json",
  "debug/p10-hf8-t5-canonical-load-recovery-output.json",
  "debug/p10-hf8-t6-defaults-reapply-recovery-output.json",
  "debug/p10-hf8-t7-explicit-error-surface-contract-output.json",
  "debug/p10-hf8-t8-control-final-parity-output.json",
  "debug/p10-hf8-t9-all-board-regression-matrix-output.json",
];

const failChecks = failEvidenceFiles.map((path) => {
  const content = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  return {
    path,
    hasFailMarker: /\*\*FAIL|expected RED|result: \*\*FAIL/i.test(content),
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

assert.ok(failChecks.every((entry) => entry.hasFailMarker), "HF8 RED evidence files must contain explicit fail markers");
assert.ok(passChecks.every((entry) => entry.result === "PASS"), "HF8 recovery diagnostics and matrices must report PASS");

const output = {
  suite: "p10-hf8-t10-fail-pass-proof",
  executedAt: new Date().toISOString(),
  failEvidence: failChecks,
  passEvidence: passChecks,
  result: "PASS",
};

writeFileSync(new URL("./p10-hf8-t10-fail-pass-proof-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
