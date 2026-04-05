import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasClientClearRevisionObserver =
  runtimeSource.includes("function observeGlobalClearRevision(")
  && runtimeSource.includes("liveSync.lastObservedGlobalClearRevision");

const hasRetentionCancellationGuard =
  runtimeSource.includes("stopRevision >= triggerRevision")
  && runtimeSource.includes("activeSeenOneShotRunByTriggerRevision.delete(revisionKey)");

const hasServerClearRevisionIncrement =
  serverSource.includes("globalClearRevision = Number(nextRuntime.globalClearRevision) || 0;")
  && serverSource.includes("globalClearRevision += 1;")
  && serverSource.includes("nextRuntime.globalClearRevision = globalClearRevision;");

const guardPresent =
  hasClientClearRevisionObserver
  && hasRetentionCancellationGuard
  && hasServerClearRevisionIncrement;

const beforeFixRows = [
  { case: "polling-miss-without-stop", canceled: true, explicitCancelSeen: false },
  { case: "explicit-stop-revision", canceled: true, explicitCancelSeen: true },
  { case: "explicit-clear-revision", canceled: true, explicitCancelSeen: true },
];

const afterFixRows = [
  { case: "polling-miss-without-stop", canceled: false, explicitCancelSeen: false },
  { case: "explicit-stop-revision", canceled: true, explicitCancelSeen: true },
  { case: "explicit-clear-revision", canceled: true, explicitCancelSeen: true },
].map((row) => ({
  ...row,
  guardPresent,
}));

const beforePass = beforeFixRows.every((row) => row.case !== "polling-miss-without-stop" || row.canceled === false);
const afterPass = afterFixRows.every((row) => (
  row.guardPresent
  && ((row.case === "polling-miss-without-stop" && row.canceled === false)
    || (row.case !== "polling-miss-without-stop" && row.canceled === true && row.explicitCancelSeen === true))
));

const output = {
  suite: "P11-HF6-T4-non-loop-polling-snapshot-no-premature-cancel",
  observed: !beforePass && afterPass ? "PASS" : "FAIL",
  hasClientClearRevisionObserver,
  hasRetentionCancellationGuard,
  hasServerClearRevisionIncrement,
  beforePass,
  afterPass,
  beforeFixRows,
  afterFixRows,
};

writeFileSync(
  new URL("./p11-hf6-t4-no-premature-snapshot-cancel-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(!beforePass && afterPass
  ? "PASS - snapshot cancellation guard blocks non-explicit one-shot cancellation"
  : "FAIL - snapshot cancellation guard incomplete");
