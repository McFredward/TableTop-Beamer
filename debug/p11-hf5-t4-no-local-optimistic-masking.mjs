import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");

const upsertStart = runtimeSource.indexOf("function upsertGlobalAnimation(");
const upsertEnd = runtimeSource.indexOf("function startRoomAnimationFromDraft()", upsertStart);
const upsertChunk = upsertStart >= 0 && upsertEnd > upsertStart
  ? runtimeSource.slice(upsertStart, upsertEnd)
  : "";

const hasPendingSnapshotStatus = upsertChunk.includes("start accepted (waiting for snapshot)");
const hasStartFailureStatus = upsertChunk.includes("start command failed");

const hasRemovedLocalOptimisticStart = !upsertChunk.includes("state.runningAnimations.push(animation);");
const hasGlobalStartMutationEmit = upsertChunk.includes("void emitLiveMutation(\"trigger-global\"");

let assertError = null;
try {
  assert.equal(hasRemovedLocalOptimisticStart, true, "local optimistic global one-shot start must be removed");
  assert.equal(hasGlobalStartMutationEmit, true, "global start mutation emit must remain wired");
  assert.equal(hasPendingSnapshotStatus, true, "pending snapshot operator feedback is required");
  assert.equal(hasStartFailureStatus, true, "start failure status must be explicit");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF5-T4-no-local-optimistic-masking",
  observed: assertError ? "FAIL" : "PASS",
  hasRemovedLocalOptimisticStart,
  hasGlobalStartMutationEmit,
  hasPendingSnapshotStatus,
  hasStartFailureStatus,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf5-t4-no-local-optimistic-masking-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError ? "FAIL - optimistic masking guard incomplete" : "PASS - local optimistic one-shot masking removed/guarded");
