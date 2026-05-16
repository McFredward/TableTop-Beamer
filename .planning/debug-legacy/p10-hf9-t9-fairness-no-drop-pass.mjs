import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createFairQueueState, dequeueFairMutation } from "../src/live/hf9-command-pipeline.mjs";

const queueState = createFairQueueState();
const lanes = {
  control: [{ id: "stop-1" }, { id: "clear-1" }],
  state: Array.from({ length: 12 }, (_, i) => ({ id: `trigger-${i + 1}` })),
  noisy: Array.from({ length: 8 }, (_, i) => ({ id: `context-${i + 1}` })),
};

const order = [];
while (true) {
  const next = dequeueFairMutation(queueState, lanes);
  if (!next) {
    break;
  }
  order.push(next.id);
}

const firstNoisyIndex = order.findIndex((entry) => entry.startsWith("context-"));
const noDrop = order.length === 22;

const output = {
  suite: "p10-hf9-t9-fairness-no-drop-pass",
  firstNoisyIndex,
  noDrop,
  order,
  status: firstNoisyIndex >= 0 && firstNoisyIndex <= 8 && noDrop ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf9-t9-fairness-no-drop-pass-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.status, "PASS", "Fair scheduler must avoid starvation and preserve no-drop semantics");
console.log(JSON.stringify(output, null, 2));
