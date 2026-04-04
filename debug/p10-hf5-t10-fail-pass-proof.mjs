import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const failEvidenceFiles = [
  ".planning/phases/phase-10/P10-HF5-T1-REPRO-MULTI-VS-SINGLE.md",
  ".planning/phases/phase-10/P10-HF5-T2-LOCKDOWN-FALLBACK-REPRO.md",
  ".planning/phases/phase-10/P10-HF5-T4-CANONICAL-SOURCE-DIAGNOSTICS.md",
];

const passOutputFiles = [
  "debug/p10-hf5-t1-multi-vs-single-repro-output.json",
  "debug/p10-hf5-t2-lockdown-fallback-repro-output.json",
  "debug/p10-hf5-t3-firefox-parity-diagnostics-output.json",
  "debug/p10-hf5-t4-canonical-source-diagnostics-output.json",
  "debug/p10-hf5-t6-shared-resolver-contract-output.json",
  "debug/p10-hf5-t7-lifecycle-parity-output.json",
  "debug/p10-hf5-t8-browser-parity-output.json",
  "debug/p10-hf5-t9-imported-multiarea-regression-output.json",
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

assert.ok(failChecks.every((entry) => entry.hasFailMarker), "All RED evidence files must contain explicit FAIL markers");
assert.ok(passChecks.every((entry) => entry.result === "PASS"), "All HF5 diagnostics and matrices must be PASS after the fix");

const output = {
  suite: "p10-hf5-t10-fail-pass-proof",
  executedAt: new Date().toISOString(),
  failEvidence: failChecks,
  passEvidence: passChecks,
  result: "PASS",
};

writeFileSync(new URL("./p10-hf5-t10-fail-pass-proof-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
