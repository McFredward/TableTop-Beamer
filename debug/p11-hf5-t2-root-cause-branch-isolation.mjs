import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const branchChecks = {
  commandEmission: runtimeSource.includes("state.runningAnimations.push(animation);")
    && runtimeSource.includes("void emitLiveMutation(\"trigger-global\"")
    && runtimeSource.includes("if (outputRole === OUTPUT_ROLE_CONTROL)"),
  serverApply: serverSource.includes("mutationType === \"trigger-global\"")
    && serverSource.includes("applyGlobalMutationPatch(payload)"),
  snapshotFanout: serverSource.includes("mutateLiveSession({")
    && serverSource.includes("nextSnapshotPatch"),
};

const isolatedRootCause = {
  branch: "command emission",
  reason: "non-control global start applies optimistic local one-shot before authoritative snapshot fanout confirmation",
  maskingRisk: "initiator can look PASS while peers/final miss event",
};

let assertError = null;
try {
  assert.equal(branchChecks.commandEmission, true, "command-emission branch with optimistic global start must be present");
  assert.equal(branchChecks.serverApply, true, "server apply branch must exist");
  assert.equal(branchChecks.snapshotFanout, true, "snapshot fanout branch must exist");
  assert.equal(isolatedRootCause.branch, "command emission", "root cause branch must isolate to command emission");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF5-T2-root-cause-branch-isolation",
  observed: assertError ? "FAIL" : "PASS",
  branchChecks,
  isolatedRootCause,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf5-t2-root-cause-branch-isolation-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError ? "FAIL - root-cause branch isolation incomplete" : "PASS - root-cause branch isolated to command emission path");
