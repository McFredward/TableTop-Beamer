import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const hasDefinitionBoundLoopStart = runtimeSource.includes("insideDefinition?.loopUntilStopped");
const hasDashboardLoopToggle = htmlSource.includes("id=\"dashboard-global-loop-until-stop\"");
const clickHandlerUsesDashboardToggle = runtimeSource.includes("dashboardGlobalLoopUntilStopInput?.checked");

const findings = [
  {
    id: "global-start-path-still-definition-bound",
    observed: hasDefinitionBoundLoopStart,
    expected: false,
    impact:
      "Global runtime start behavior is tied to animation-definition edits instead of trigger-time operator intent.",
  },
  {
    id: "dashboard-loop-toggle-missing",
    observed: hasDashboardLoopToggle,
    expected: true,
    impact: "Operator cannot choose one-shot vs loop-until-stop directly from the dashboard trigger surface.",
  },
  {
    id: "click-path-missing-dashboard-loop-semantics",
    observed: clickHandlerUsesDashboardToggle,
    expected: true,
    impact: "Per-trigger loop semantics are not wired into the global trigger runtime path.",
  },
];

const failedChecks = findings.filter((entry) => entry.observed !== entry.expected);

const output = {
  suite: "p11-hf2-t1-global-runtime-repro",
  phase: "RED",
  observed: failedChecks.length > 0 ? "FAIL" : "PASS",
  findings,
  failedChecks,
};

writeFileSync(
  new URL("./p11-hf2-t1-global-runtime-repro-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

assert.equal(output.observed, "FAIL", "RED repro must fail before HF2 recovery changes");
console.log(JSON.stringify(output, null, 2));
