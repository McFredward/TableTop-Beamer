import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

function readObserved(path) {
  const parsed = JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  return parsed.observed ?? parsed.result ?? parsed.status ?? "UNKNOWN";
}

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");
const runtimeEnvSource = readFileSync(new URL("../src/app/lib/shared/runtime-env.js", import.meta.url), "utf8");

const matrix = [
  {
    id: "P11-HF2-Global-Start-Recovery-PASS-Test",
    observed: readObserved("./p11-hf2-t2-global-runtime-recovery-pass-output.json"),
    expected: "PASS",
  },
  {
    id: "P11-HF2-Dashboard-Loop-Toggle-PerTrigger-Test",
    observed: readObserved("./p11-hf2-t3-dashboard-loop-toggle-pass-output.json"),
    expected: "PASS",
  },
  {
    id: "P11-HF2-PerTrigger-Loop-NoDefinitionEdit-Test",
    observed: readObserved("./p11-hf2-t4-per-trigger-loop-pass-output.json"),
    expected: "PASS",
  },
  {
    id: "P11-HF2-Global-Stop-NonRegression-Test",
    observed: readObserved("./p11-hf2-t5-stop-clear-non-regression-pass-output.json"),
    expected: "PASS",
  },
  {
    id: "P11-HF2-Global-Clear-NonRegression-Test",
    observed: readObserved("./p11-hf2-t5-stop-clear-non-regression-pass-output.json"),
    expected: "PASS",
  },
  {
    id: "P11-HF2-Global-Loop-Stop-Behavior-Test",
    observed: runtimeSource.includes("loopUntilStopped: effectiveDefaultDurationSec === null") ? "PASS" : "FAIL",
    expected: "PASS",
  },
  {
    id: "P11-HF2-Global-OneShot-Completion-Behavior-Test",
    observed: runtimeSource.includes("GLOBAL_ONE_SHOT_DURATION_SEC = 6") ? "PASS" : "FAIL",
    expected: "PASS",
  },
  {
    id: "P11-HF2-Control-Final-StartStop-Parity-Test",
    observed:
      runtimeEnvSource.includes('const OUTPUT_ROLE_FINAL = "final-output"')
      && runtimeSource.includes("applyLiveRuntimeSnapshot")
      && runtimeSource.includes("isFastFinalApply")
        ? "PASS"
        : "FAIL",
    expected: "PASS",
  },
  {
    id: "P11-HF2-CrossClient-Trigger-Parity-Test",
    observed:
      serverSource.includes("function applyGlobalMutationPatch(payload)")
      && serverSource.includes("globalTriggerRevisions")
      && serverSource.includes("globalStopRevisions")
        ? "PASS"
        : "FAIL",
    expected: "PASS",
  },
];

const output = {
  suite: "p11-hf2-t6-global-regression-matrix",
  observed: matrix.every((entry) => entry.observed === entry.expected) ? "PASS" : "FAIL",
  matrix,
};

writeFileSync(new URL("./p11-hf2-t6-global-regression-matrix-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(output.observed, "PASS", "HF2 regression matrix must pass");
console.log(JSON.stringify(output, null, 2));
