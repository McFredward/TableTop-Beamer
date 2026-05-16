import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { runLegacyTimeoutScenario } from "./p10-hf9-red-harness.mjs";

const result = runLegacyTimeoutScenario({ attempts: 1, ackAvailableAtAttempt: 2 });
const output = {
  suite: "p10-hf9-t1-trigger-timeout-repro",
  expected: "FAIL",
  observed: result.status,
  details: result,
};

writeFileSync(new URL("./p10-hf9-t1-trigger-timeout-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(result.status, "FAIL", "Legacy single-attempt path must reproduce trigger timeout under delayed ack");
console.log(JSON.stringify(output, null, 2));
