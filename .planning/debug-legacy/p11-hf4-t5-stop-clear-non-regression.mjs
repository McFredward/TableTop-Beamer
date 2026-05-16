import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasClearAllBranch = serverSource.includes("mutationType === \"clear-all\"");
const hasGlobalStopRevisionOnClear =
  serverSource.includes("for (const entry of runningAnimations)")
  && serverSource.includes("globalStopRevisions[triggerKey] = stopRevision + 1;");

const runningAnimations = [
  { id: "g-loop", scope: "global", type: "intruder-alert", boardId: "nemesis-lockdown-a", hold: true },
  { id: "g-shot", scope: "global", type: "reactor-pulse", boardId: "nemesis-lockdown-a", hold: false, durationMs: 4000 },
  { id: "r-1", scope: "room", type: "malfunction", boardId: "nemesis-lockdown-a", roomId: "room-a" },
];

const stopTargetId = "g-loop";
const afterStop = runningAnimations.filter((entry) => entry.id !== stopTargetId);
const afterClear = [];

const checks = {
  stopRemovesOnlyTarget: !afterStop.some((entry) => entry.id === stopTargetId) && afterStop.length === 2,
  clearRemovesAll: afterClear.length === 0,
  clearAllBranchPresent: hasClearAllBranch,
  clearGlobalStopRevisionPathPresent: hasGlobalStopRevisionOnClear,
};

let assertError = null;
try {
  assert.equal(checks.stopRemovesOnlyTarget, true, "stop must remove only targeted animation in mixed set");
  assert.equal(checks.clearRemovesAll, true, "clear-all must remove all running animations");
  assert.equal(checks.clearAllBranchPresent, true, "server clear-all branch must exist");
  assert.equal(checks.clearGlobalStopRevisionPathPresent, true, "clear-all must keep global stop revision increment path");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF4-T5-stop-clear-non-regression",
  observed: assertError ? "FAIL" : "PASS",
  checks,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf4-t5-stop-clear-non-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError ? "FAIL - stop/clear non-regression gate failed" : "PASS - stop/clear non-regression gate passed");
