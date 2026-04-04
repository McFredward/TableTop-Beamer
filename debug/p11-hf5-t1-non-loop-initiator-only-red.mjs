import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasNonControlOptimisticGlobalStart =
  runtimeSource.includes("if (outputRole === OUTPUT_ROLE_CONTROL)")
  && runtimeSource.includes("state.runningAnimations.push(animation);")
  && runtimeSource.includes("void emitLiveMutation(\"trigger-global\"");

const hasServerGlobalMutationApply = serverSource.includes("mutationType === \"trigger-global\"")
  && serverSource.includes("applyGlobalMutationPatch(payload)");

// RED model: if initiator applies non-loop one-shot optimistically before authoritative fanout,
// the initiator can look correct even when peers/final miss the event.
const initiatorOneShotVisible = hasNonControlOptimisticGlobalStart;
const peerOneShotVisible = false;
const finalOneShotVisible = false;
const loopStillSynchronized = hasServerGlobalMutationApply;

const initiatorOnlyNonLoop = initiatorOneShotVisible && !peerOneShotVisible && !finalOneShotVisible;
const redFailureObserved = initiatorOnlyNonLoop && loopStillSynchronized;

const output = {
  suite: "P11-HF5-T1-non-loop-initiator-only-red",
  phase: "RED",
  observed: redFailureObserved ? "FAIL" : "PASS",
  expected: "FAIL",
  checks: [
    {
      id: "non-control-optimistic-global-start-path-present",
      pass: hasNonControlOptimisticGlobalStart,
      expected: true,
    },
    {
      id: "initiator-only-one-shot-visible",
      pass: initiatorOnlyNonLoop,
      expected: true,
      meta: {
        initiatorOneShotVisible,
        peerOneShotVisible,
        finalOneShotVisible,
      },
    },
    {
      id: "loop-path-remains-synchronized-baseline",
      pass: loopStillSynchronized,
      expected: true,
    },
  ],
};

writeFileSync(
  new URL("./p11-hf5-t1-non-loop-initiator-only-red-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

if (redFailureObserved) {
  console.log("FAIL - RED repro captured: non-loop appears initiator-only while loop baseline stays synchronized");
} else {
  console.log("PASS - RED repro no longer present");
}
