import { readFileSync, writeFileSync, readdirSync } from "node:fs";

// Phase 14-2: after the runtime module split, the runtime lives across
// multiple files under src/app/runtime/. Concatenate every .js file in
// that directory so location-pinned greps still find the moved symbols
// (stopAnimation now lives in runtime-animation-lifecycle.js, etc.).
const runtimeDir = new URL("../src/app/runtime/", import.meta.url);
const runtimeSource = readdirSync(runtimeDir, { recursive: true, withFileTypes: false })
  .filter((name) => name.endsWith(".js"))
  .sort()
  .map((name) => readFileSync(new URL(name, runtimeDir), "utf8"))
  .join("\n");

// Guard 1: stopAnimation() remains the authoritative single-animation
// termination path. It must still filter runningAnimations by id set and
// clear the stop sound hook.
const stopAnimationPreserved =
  runtimeSource.includes("function stopAnimation(animationId) {")
  && runtimeSource.includes(
    "state.runningAnimations = state.runningAnimations.filter((item) => !idsToStop.has(item.id));",
  );

// Guard 2: clear-all handling in applyLiveRuntimeSnapshot still clears
// the seen-once retention map (from Phase 11 HF6) so stop/clear authority
// is preserved under polling/hydration.
const clearAllBranchPreserved =
  runtimeSource.includes('if (mutationType === "clear-all") {')
  && runtimeSource.includes("liveSync.activeSeenOneShotRunByTriggerRevision.clear();");

// Guard 3: pruneFinishedAnimations still drops rooms whose board no
// longer contains their roomId and still terminates one-shots once
// durationMs has elapsed.
const pruneContractPreserved =
  runtimeSource.includes("const hasRoom = board.rooms.some((room) => room.id === anim.roomId);")
  && runtimeSource.includes("return now - anim.startedAt < anim.durationMs;");

// Guard 4: The new additive layering guard does NOT mutate
// state.runningAnimations during its execution — i.e. the draw path
// cannot accidentally stop an animation.
const drawLoopIndex = runtimeSource.indexOf("function draw(now) {");
const drawLoopEnd = runtimeSource.indexOf(
  "requestAnimationFrame(draw);",
  drawLoopIndex,
);
const drawSlice = runtimeSource.slice(drawLoopIndex, drawLoopEnd);
// Allowed mutation in draw: the existing pruneFinishedAnimations(now)
// call and the failed-animation filter. Everything else must NOT modify
// state.runningAnimations.
const drawMutationSitePattern = /state\.runningAnimations\s*=(?!=)/g;
const drawMutationSites = [...drawSlice.matchAll(drawMutationSitePattern)];
const expectedMutationNeighbourhood = [
  "failedAnimationIds.includes(anim.id)",
];
let unexpectedDrawMutation = false;
for (const match of drawMutationSites) {
  const window = drawSlice.slice(
    Math.max(0, match.index - 200),
    match.index + 200,
  );
  const matchesExpected = expectedMutationNeighbourhood.some((hint) =>
    window.includes(hint),
  );
  if (!matchesExpected) {
    unexpectedDrawMutation = true;
    break;
  }
}

// Guard 5: After the P12-T4 fix the concurrency counter loop itself
// does not call stopAnimation.
const concurrencyLoopStart = runtimeSource.indexOf(
  "const roomConcurrencyByKey = new Map();",
);
const concurrencyLoopEnd = runtimeSource.indexOf(
  "state.runtimePerf.roomConcurrencyByKey = roomConcurrencyByKey;",
);
const concurrencyLoopSlice = runtimeSource.slice(
  concurrencyLoopStart,
  concurrencyLoopEnd,
);
const concurrencyLoopStopFree =
  concurrencyLoopStart >= 0
  && concurrencyLoopEnd > concurrencyLoopStart
  && !concurrencyLoopSlice.includes("stopAnimation(");

// Guard 6: Global stop/clear revision observers (from Phase 11) are
// still called in the snapshot path.
const stopClearObserversPreserved =
  runtimeSource.includes("observeGlobalStopRevisions(runtime);")
  && runtimeSource.includes("observeGlobalClearRevision(runtime);");

const output = {
  suite: "P12-T6-stop-clear-immediate-authority-non-regression",
  phase: "GREEN-STATIC",
  expected: "PASS",
  observed: "PASS",
  checks: [
    {
      id: "stopAnimation-authoritative-filter-path-preserved",
      expected: true,
      actual: stopAnimationPreserved,
      pass: stopAnimationPreserved,
    },
    {
      id: "clear-all-snapshot-branch-preserved",
      expected: true,
      actual: clearAllBranchPreserved,
      pass: clearAllBranchPreserved,
    },
    {
      id: "prune-finished-animations-contract-preserved",
      expected: true,
      actual: pruneContractPreserved,
      pass: pruneContractPreserved,
    },
    {
      id: "draw-loop-only-expected-runningAnimations-mutations",
      expected: false,
      actual: unexpectedDrawMutation,
      pass: !unexpectedDrawMutation,
    },
    {
      id: "concurrency-counter-loop-does-not-stop-animations",
      expected: true,
      actual: concurrencyLoopStopFree,
      pass: concurrencyLoopStopFree,
    },
    {
      id: "global-stop-clear-revision-observers-preserved",
      expected: true,
      actual: stopClearObserversPreserved,
      pass: stopClearObserversPreserved,
    },
  ],
};

const allPass = output.checks.every((c) => c.pass === true);
output.observed = allPass ? "PASS" : "FAIL";

writeFileSync(
  new URL("./p12-t6-stop-clear-non-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - stop/clear immediate-authority semantics non-regressed"
    : "FAIL - stop/clear regression detected, see output JSON",
);
