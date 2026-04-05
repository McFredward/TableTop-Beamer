import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasServerAuthoritativeTriggerRevisionPath =
  serverSource.includes("const nextTriggerRevision = currentTriggerRevision + 1;")
  && serverSource.includes("authoritativeAnimation.triggerRevision = nextTriggerRevision;")
  && serverSource.includes("startedAtEpochMs: serverNowEpochMs");

const hasSnapshotReconcileOverwritePath =
  runtimeSource.includes("const boardBoundRunningAnimations = filterRunningAnimationsForBoard(runtime.runningAnimations, selectedBoard);")
  && runtimeSource.includes("const primedRunningAnimations = primeGlobalTriggerRuntimeTimestamps(boardBoundRunningAnimations, previousAnimationsById);")
  && (
    runtimeSource.includes("state.runningAnimations = hydrateRunningAnimationStartTimestamps(reconciledRunningAnimations);")
    || runtimeSource.includes("const retainedRunningAnimations = retainActiveSeenOneShotRuns(reconciledRunningAnimations);")
  );

const hasExplicitSeenOnceLock =
  runtimeSource.includes("activeSeenOneShotRunByTriggerRevision")
  && runtimeSource.includes("retainActiveSeenOneShotRuns");

const branchIsolation = {
  commandEmissionBranch: {
    isolatedAsRootCause: false,
    note: "HF5 already removed local optimistic non-loop start masking from initiator path",
  },
  serverApplyBranch: {
    isolatedAsRootCause: false,
    note: "server still issues authoritative triggerRevision + startedAtEpochMs payload",
    pass: hasServerAuthoritativeTriggerRevisionPath,
  },
  pollingHydrationReconcileBranch: {
    isolatedAsRootCause: hasSnapshotReconcileOverwritePath,
    note: "snapshot apply can replace local active one-shot without explicit stop/clear revision gate",
    fixedBySeenLock: hasExplicitSeenOnceLock,
  },
};

const rootCauseIsolated = branchIsolation.pollingHydrationReconcileBranch.isolatedAsRootCause
  && branchIsolation.serverApplyBranch.pass;

const output = {
  suite: "P11-HF6-T2-root-cause-branch-isolation",
  observed: rootCauseIsolated ? "PASS" : "FAIL",
  hasServerAuthoritativeTriggerRevisionPath,
  hasSnapshotReconcileOverwritePath,
  hasExplicitSeenOnceLock,
  branchIsolation,
};

writeFileSync(
  new URL("./p11-hf6-t2-root-cause-branch-isolation-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(rootCauseIsolated
  ? "PASS - root cause isolated to polling/hydration reconcile cancellation branch"
  : "FAIL - root cause isolation incomplete");
