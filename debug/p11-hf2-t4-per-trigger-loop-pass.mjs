import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");

const checks = [
  {
    id: "click-handler-reads-dashboard-loop-checkbox",
    ok: runtimeSource.includes("const loopUntilStopped = Boolean(dashboardGlobalLoopUntilStopInput?.checked);"),
    detail: "Global trigger click path reads loop choice directly from dashboard control.",
  },
  {
    id: "upsert-receives-per-trigger-loop-option",
    ok: runtimeSource.includes("upsertGlobalAnimation(type, GLOBAL_ONE_SHOT_DURATION_SEC, { loopUntilStopped });"),
    detail: "Loop mode is applied per trigger invocation without editing animation definitions.",
  },
  {
    id: "global-start-no-definition-loop-dependency",
    ok: !runtimeSource.includes("insideDefinition?.loopUntilStopped"),
    detail: "Global runtime loop behavior no longer depends on definition editor state.",
  },
];

const output = {
  suite: "p11-hf2-t4-per-trigger-loop-pass",
  phase: "PASS",
  observed: checks.every((entry) => entry.ok) ? "PASS" : "FAIL",
  checks,
};

writeFileSync(
  new URL("./p11-hf2-t4-per-trigger-loop-pass-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

assert.equal(output.observed, "PASS", "Per-trigger loop semantics must be wired to dashboard checkbox");
console.log(JSON.stringify(output, null, 2));
