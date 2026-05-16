import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { runLegacyFairnessScenario } from "./p10-hf9-red-harness.mjs";

const result = runLegacyFairnessScenario();
const output = {
  suite: "p10-hf9-t5-queue-fairness-repro",
  expected: "FAIL",
  observed: result.status,
  details: result,
};

writeFileSync(new URL("./p10-hf9-t5-queue-fairness-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(result.status, "FAIL", "Legacy strict-priority dequeue must reproduce starvation/fairness drift");
console.log(JSON.stringify(output, null, 2));
