import assert from "node:assert/strict";
import { writeFileSync, readFileSync } from "node:fs";

function readStatus(path) {
  const parsed = JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  return parsed.observed ?? parsed.status ?? "UNKNOWN";
}

const redSuites = [
  ["t1", "./p10-hf9-t1-trigger-timeout-repro-output.json"],
  ["t2", "./p10-hf9-t2-stop-timeout-repro-output.json"],
  ["t3", "./p10-hf9-t3-ack-instability-repro-output.json"],
  ["t4", "./p10-hf9-t4-resend-drift-repro-output.json"],
  ["t5", "./p10-hf9-t5-queue-fairness-repro-output.json"],
  ["t6", "./p10-hf9-t6-no-drop-repro-output.json"],
];

const passSuites = [
  ["t7", "./p10-hf9-t7-command-pipeline-diagnostics-output.json"],
  ["t8", "./p10-hf9-t8-command-hardening-pass-output.json"],
  ["t9", "./p10-hf9-t9-fairness-no-drop-pass-output.json"],
  ["t10", "./p10-hf9-t10-apply-latency-pass-output.json"],
  ["t11", "./p10-hf9-t11-low-end-mp4-smoothness-pass-output.json"],
  ["t12", "./p10-hf9-t12-board-switch-latency-pass-output.json"],
];

const redResults = redSuites.map(([id, path]) => ({ id, status: readStatus(path) }));
const passResults = passSuites.map(([id, path]) => ({ id, status: readStatus(path) }));

const output = {
  suite: "p10-hf9-t13-fail-pass-matrix",
  redResults,
  passResults,
  status:
    redResults.every((entry) => entry.status === "FAIL")
    && passResults.every((entry) => entry.status === "PASS")
      ? "PASS"
      : "FAIL",
};

writeFileSync(new URL("./p10-hf9-t13-fail-pass-matrix-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.status, "PASS", "FAIL->PASS matrix must close all HF9 gates");
console.log(JSON.stringify(output, null, 2));
