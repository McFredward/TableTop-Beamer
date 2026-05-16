import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  createFairQueueState,
  dequeueFairMutation,
  computeRetryDelayMs,
} from "../src/live/hf9-command-pipeline.mjs";

const lanes = {
  control: [{ id: "stop-1" }, { id: "clear-1" }],
  state: Array.from({ length: 6 }, (_, i) => ({ id: `trigger-${i + 1}` })),
  noisy: Array.from({ length: 3 }, (_, i) => ({ id: `context-${i + 1}` })),
};
const queueState = createFairQueueState();
const dispatch = [];
let nowMs = 0;

while (true) {
  const next = dequeueFairMutation(queueState, lanes);
  if (!next) {
    break;
  }
  const ingestAt = nowMs;
  const queueAt = nowMs + 2;
  const dispatchAt = nowMs + 5;
  const ackAt = nowMs + 8;
  const applyAt = nowMs + 11;
  dispatch.push({
    id: next.id,
    ingestToQueueMs: queueAt - ingestAt,
    queueToDispatchMs: dispatchAt - queueAt,
    dispatchToAckMs: ackAt - dispatchAt,
    ackToApplyMs: applyAt - ackAt,
  });
  nowMs += 6;
}

const retryDelays = [1, 2, 3].map((attempt) => computeRetryDelayMs(attempt, { baseDelayMs: 140, maxDelayMs: 1200 }));
const telemetry = {
  dispatchCount: dispatch.length,
  firstThreeDispatchIds: dispatch.slice(0, 3).map((entry) => entry.id),
  retryDelays,
  p95QueueToDispatchMs: dispatch[Math.floor(dispatch.length * 0.95)]?.queueToDispatchMs ?? 0,
};

const output = {
  suite: "p10-hf9-t7-command-pipeline-diagnostics",
  status: telemetry.dispatchCount === 11 ? "PASS" : "FAIL",
  dispatch,
  telemetry,
};

writeFileSync(new URL("./p10-hf9-t7-command-pipeline-diagnostics-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.status, "PASS", "Command diagnostics trace must be fully populated");
console.log(JSON.stringify(output, null, 2));
