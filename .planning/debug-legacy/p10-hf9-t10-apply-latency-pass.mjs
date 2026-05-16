import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createApplySliceController } from "../src/live/hf9-command-pipeline.mjs";

let nowMs = 0;
const controller = createApplySliceController({
  budgetMs: 8,
  now: () => nowMs,
});

const sliceStart = nowMs;
let processed = 0;
while (controller.shouldContinue(sliceStart)) {
  processed += 1;
  nowMs += 1.2;
}

const output = {
  suite: "p10-hf9-t10-apply-latency-pass",
  processed,
  elapsedMs: nowMs,
  budgetMs: controller.budgetMs,
  status: processed >= 6 && processed <= 8 ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf9-t10-apply-latency-pass-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.status, "PASS", "Apply loop must respect bounded per-slice budget");
console.log(JSON.stringify(output, null, 2));
