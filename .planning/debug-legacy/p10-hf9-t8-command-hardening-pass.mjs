import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  computeRetryDelayMs,
  shouldRetryCommand,
} from "../src/live/hf9-command-pipeline.mjs";

const retries = [
  shouldRetryCommand({ name: "AbortError" }, null, { attempt: 1, maxAttempts: 3 }),
  shouldRetryCommand({ status: 503 }, 503, { attempt: 2, maxAttempts: 3 }),
  shouldRetryCommand({ status: 400 }, 400, { attempt: 1, maxAttempts: 3 }),
  shouldRetryCommand({ name: "AbortError" }, null, { attempt: 3, maxAttempts: 3 }),
];

const delays = [1, 2, 3].map((attempt) => computeRetryDelayMs(attempt, { baseDelayMs: 180, maxDelayMs: 1200 }));

const output = {
  suite: "p10-hf9-t8-command-hardening-pass",
  retries,
  delays,
  status: retries[0] && retries[1] && !retries[2] && !retries[3] ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf9-t8-command-hardening-pass-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.status, "PASS", "Retry policy must be deterministic and bounded");
console.log(JSON.stringify(output, null, 2));
