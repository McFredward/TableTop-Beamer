import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const failEvidenceFiles = [
  ".planning/phases/phase-10/P10-HF7-T1-CLEAN-START-PROFILE-LOSS-REPRO.md",
  ".planning/phases/phase-10/P10-HF7-T2-EXTRACTION-COUPLING-DIAGNOSTICS.md",
  ".planning/phases/phase-10/P10-HF7-T3-UNKNOWN-KEY-MIGRATION-DROP-REPRO.md",
];

const passOutputFiles = [
  "debug/p10-hf7-t4-catalog-independent-extraction-output.json",
  "debug/p10-hf7-t5-unknown-key-retention-output.json",
  "debug/p10-hf7-t6-lifecycle-multiarea-retention-output.json",
  "debug/p10-hf7-t7-browser-imported-cleanstart-regression-output.json",
];

const failChecks = failEvidenceFiles.map((path) => {
  const content = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  return {
    path,
    hasFailMarker: /RED expected|result: FAIL|Assertion failed/.test(content),
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

assert.ok(failChecks.every((entry) => entry.hasFailMarker), "HF7 RED evidence files must contain explicit fail markers");
assert.ok(passChecks.every((entry) => entry.result === "PASS"), "HF7 post-fix diagnostics and matrices must report PASS");

const output = {
  suite: "p10-hf7-t8-fail-pass-proof",
  executedAt: new Date().toISOString(),
  failEvidence: failChecks,
  passEvidence: passChecks,
  result: "PASS",
};

writeFileSync(new URL("./p10-hf7-t8-fail-pass-proof-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
