import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { runLegacyTimeoutScenario } from "./p10-hf9-red-harness.mjs";

const result = runLegacyTimeoutScenario({ attempts: 1, ackAvailableAtAttempt: 2 });
const output = {
  suite: "p10-hf9-t3-ack-instability-repro",
  expected: "FAIL",
  observed: result.status,
  details: {
    reason: "missing ack closure with no retry causes false timeout",
    ...result,
  },
};

writeFileSync(new URL("./p10-hf9-t3-ack-instability-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(result.status, "FAIL", "Ack instability must be reproducible before retry/closure hardening");
console.log(JSON.stringify(output, null, 2));
