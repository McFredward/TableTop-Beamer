import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");

const hasSnapshotOverwritePath =
  runtimeSource.includes("const boardBoundRunningAnimations = filterRunningAnimationsForBoard(runtime.runningAnimations, selectedBoard);")
  && runtimeSource.includes("const primedRunningAnimations = primeGlobalTriggerRuntimeTimestamps(boardBoundRunningAnimations, previousAnimationsById);")
  && runtimeSource.includes("state.runningAnimations = hydrateRunningAnimationStartTimestamps(reconciledRunningAnimations);");

const hasNoSeenOnceRetentionGuard =
  !runtimeSource.includes("retainActiveSeenOneShotRuns")
  && !runtimeSource.includes("activeSeenOneShotRunByTriggerRevision");

const failureModel = {
  triggerRevisionSeenOnPeer: true,
  configuredDurationMs: 4000,
  pollingSnapshotHasNoRunningEntry: true,
  explicitStopOrClearRevisionObserved: false,
};

const prematurelyCanceledByPolling =
  hasSnapshotOverwritePath
  && hasNoSeenOnceRetentionGuard
  && failureModel.triggerRevisionSeenOnPeer
  && failureModel.pollingSnapshotHasNoRunningEntry
  && !failureModel.explicitStopOrClearRevisionObserved;

const output = {
  suite: "P11-HF6-T1-polling-premature-cancel-red",
  phase: "RED",
  expected: "FAIL",
  observed: prematurelyCanceledByPolling ? "FAIL" : "PASS",
  checks: [
    {
      id: "snapshot-overwrite-applies-running-list",
      expected: true,
      pass: hasSnapshotOverwritePath,
    },
    {
      id: "seen-once-local-retention-guard-missing",
      expected: true,
      pass: hasNoSeenOnceRetentionGuard,
    },
    {
      id: "polling-can-cancel-started-one-shot-without-explicit-stop-clear",
      expected: true,
      pass: prematurelyCanceledByPolling,
      meta: failureModel,
    },
  ],
};

writeFileSync(
  new URL("./p11-hf6-t1-polling-premature-cancel-red-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

if (prematurelyCanceledByPolling) {
  console.log("FAIL - RED repro captured: polling/hydration can cancel active one-shot before full local duration");
} else {
  console.log("PASS - RED repro no longer present");
}
