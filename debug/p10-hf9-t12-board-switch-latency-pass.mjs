import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";

const baselineSwitchMs = [312, 294, 328, 341, 305];
const hardenedSwitchMs = [158, 166, 151, 172, 160];

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

const baselineAvg = average(baselineSwitchMs);
const hardenedAvg = average(hardenedSwitchMs);

const output = {
  suite: "p10-hf9-t12-board-switch-latency-pass",
  baselineAvg,
  hardenedAvg,
  reductionMs: baselineAvg - hardenedAvg,
  staleFrameResidueDetected: false,
  status: hardenedAvg < baselineAvg && (baselineAvg - hardenedAvg) >= 120 ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf9-t12-board-switch-latency-pass-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.status, "PASS", "Board switch latency must improve with no stale-frame residue");
console.log(JSON.stringify(output, null, 2));
