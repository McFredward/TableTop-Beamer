import { readFileSync, writeFileSync, readdirSync } from "node:fs";

// Phase 14-2: runtime modules now split across src/app/runtime/*.js.
const runtimeDir = new URL("../src/app/runtime/", import.meta.url);
const runtimeSource = readdirSync(runtimeDir, { recursive: true, withFileTypes: false })
  .filter((name) => name.endsWith(".js"))
  .sort()
  .map((name) => readFileSync(new URL(name, runtimeDir), "utf8"))
  .join("\n");

// Guard 1: The new additive layering guard is strictly gated on
// concurrency >= 2. A single-animation room MUST continue using the
// default source-over blend so that loop-mode visual design is preserved
// (e.g. power-outage still darkens a room that has only one running
// animation). We inspect the guard site for the `>= 2` gate.
const hasConcurrencyGatedGuard =
  /const\s+roomConcurrency\s*=\s*state\.runtimePerf\.roomConcurrencyByKey\?\.get\(concurrencyKey\)\s*\?\?\s*0;\s*if\s*\(roomConcurrency\s*>=\s*2\)\s*\{/.test(
    runtimeSource,
  )
  && /const\s+memberConcurrency\s*=\s*state\.runtimePerf\.roomConcurrencyByKey\?\.get\(memberConcurrencyKey\)\s*\?\?\s*0;\s*if\s*\(memberConcurrency\s*>=\s*2\)\s*\{/.test(
    runtimeSource,
  );

// Guard 2: Loop-mode lifecycle touchpoints remain intact — the
// concurrency guard must NOT reference loopUntilStopped / loop / hold.
const compositeOpSiteMatches = [
  ...runtimeSource.matchAll(/ctx\.globalCompositeOperation\s*=\s*"lighter"/g),
];
let guardTouchesLoopLifecycle = false;
for (const match of compositeOpSiteMatches) {
  const window = runtimeSource.slice(
    Math.max(0, match.index - 400),
    match.index + 400,
  );
  if (
    /\bloopUntilStopped\b/.test(window)
    || /\banim\.hold\b/.test(window)
    || /\bdurationMs\b/.test(window)
  ) {
    guardTouchesLoopLifecycle = true;
    break;
  }
}

// Guard 3: Loop-mode evaluation in pruneFinishedAnimations remains
// unchanged (authoritative loop lifecycle: hold/durationMs predicate).
const loopPrunePreserved =
  runtimeSource.includes("if (anim.hold || anim.durationMs === null) {")
  && runtimeSource.includes("return now - anim.startedAt < anim.durationMs;");

// Guard 4: upsertGlobalAnimation loop-mode branch preserved. The guard
// relies on effectiveDefaultDurationSec === null for loop semantics.
const globalLoopBranchPreserved =
  runtimeSource.includes("loopUntilStopped = false")
  && runtimeSource.includes("const effectiveDefaultDurationSec = loopUntilStopped");

// Guard 5: No state mutation of state.runningAnimations inside the new
// concurrency map build — must be read-only.
const concurrencyMapIsReadOnly = (() => {
  const start = runtimeSource.indexOf("const roomConcurrencyByKey = new Map();");
  if (start < 0) return false;
  const region = runtimeSource.slice(start, start + 2500);
  const forHeader = "for (const entry of state.runningAnimations) {";
  const forStart = region.indexOf(forHeader);
  if (forStart < 0) return false;
  let depth = 0;
  let forEnd = -1;
  const braceOpen = region.indexOf("{", forStart);
  for (let i = braceOpen; i < region.length; i += 1) {
    const ch = region[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        forEnd = i;
        break;
      }
    }
  }
  if (forEnd < 0) return false;
  const loopBody = region.slice(braceOpen, forEnd + 1);
  const hasMutation =
    /state\.runningAnimations\s*=(?!=)/.test(loopBody)
    || /state\.runningAnimations\s*\.\s*push\s*\(/.test(loopBody)
    || /state\.runningAnimations\s*\.\s*splice\s*\(/.test(loopBody)
    || /\bentry\.\w+\s*=(?!=)/.test(loopBody);
  return !hasMutation;
})();

const output = {
  suite: "P12-T5-loop-mode-non-regression",
  phase: "GREEN-STATIC",
  expected: "PASS",
  observed: "PASS",
  checks: [
    {
      id: "concurrency-guard-gated-on-count-ge-2",
      expected: true,
      actual: hasConcurrencyGatedGuard,
      pass: hasConcurrencyGatedGuard,
      note: "Single-animation rooms keep source-over; loop visuals unaffected when alone.",
    },
    {
      id: "guard-does-not-touch-loop-lifecycle-fields",
      expected: false,
      actual: guardTouchesLoopLifecycle,
      pass: !guardTouchesLoopLifecycle,
      note: "No loopUntilStopped/hold/durationMs reference inside composite-op switch.",
    },
    {
      id: "prune-finished-animations-preserves-loop-predicate",
      expected: true,
      actual: loopPrunePreserved,
      pass: loopPrunePreserved,
      note: "Loop termination rule (hold/durationMs) is untouched.",
    },
    {
      id: "upsert-global-loop-branch-preserved",
      expected: true,
      actual: globalLoopBranchPreserved,
      pass: globalLoopBranchPreserved,
      note: "Global upsert loop semantics (loopUntilStopped flag) remain intact.",
    },
    {
      id: "concurrency-map-build-is-read-only",
      expected: true,
      actual: concurrencyMapIsReadOnly,
      pass: concurrencyMapIsReadOnly,
      note: "Concurrency count build does not mutate runningAnimations or entries.",
    },
  ],
};

const allPass = output.checks.every((c) => c.pass === true);
output.observed = allPass ? "PASS" : "FAIL";

writeFileSync(
  new URL("./p12-t5-loop-non-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - loop-mode lifecycle untouched by P12-T4 additive layering guard"
    : "FAIL - loop non-regression failure, see output JSON",
);
