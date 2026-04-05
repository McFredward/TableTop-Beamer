import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const gates = [
  { id: "P11-HF6-T1", artifact: "debug/p11-hf6-t1-polling-premature-cancel-red-output.json", expected: "FAIL" },
  { id: "P11-HF6-T2", artifact: "debug/p11-hf6-t2-root-cause-branch-isolation-output.json", expected: "PASS" },
  { id: "P11-HF6-T3", artifact: "debug/p11-hf6-t3-seen-revision-full-duration-exactly-once-output.json", expected: "PASS" },
  { id: "P11-HF6-T4", artifact: "debug/p11-hf6-t4-no-premature-snapshot-cancel-output.json", expected: "PASS" },
  { id: "P11-HF6-T5", artifact: "debug/p11-hf6-t5-loop-non-regression-output.json", expected: "PASS" },
  { id: "P11-HF6-T6", artifact: "debug/p11-hf6-t6-stop-clear-non-regression-output.json", expected: "PASS" },
  { id: "P11-HF6-T7", artifact: "debug/p11-hf6-t7-multiclient-polling-fail-pass-proof-output.json", expected: "PASS" },
];

const observedGates = gates.map((gate) => {
  const payload = JSON.parse(readFileSync(new URL(`../${gate.artifact}`, import.meta.url), "utf8"));
  const observed = String(payload?.observed || "UNKNOWN");
  return {
    ...gate,
    observed,
    pass: observed === gate.expected,
  };
});

let assertError = null;
try {
  assert.equal(observedGates.every((gate) => gate.pass), true, "HF6 acceptance regression matrix must be PASS");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "p11-hf6-acceptance-regression",
  observed: assertError ? "FAIL" : "PASS",
  gates: observedGates,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf6-acceptance-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError ? "FAIL - HF6 acceptance regression matrix incomplete" : "PASS - HF6 acceptance regression matrix complete");
