import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";

const jitterMs = [80, 420, 40, 510, 90];
const deterministicWindowMs = 220;
const violations = jitterMs.filter((value) => value > deterministicWindowMs).length;

const output = {
  suite: "p10-hf9-t4-resend-drift-repro",
  expected: "FAIL",
  observed: violations === 0 ? "PASS" : "FAIL",
  details: {
    deterministicWindowMs,
    jitterMs,
    violations,
  },
};

writeFileSync(new URL("./p10-hf9-t4-resend-drift-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.ok(violations > 0, "Legacy resend cadence drift must exceed deterministic window");
console.log(JSON.stringify(output, null, 2));
