import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");

const checks = [
  {
    id: "removed-definition-bound-loop-start",
    ok: !runtimeSource.includes("insideDefinition?.loopUntilStopped"),
    detail: "Global start path no longer reads loop mode from inside definition edits.",
  },
  {
    id: "global-start-emits-animation-snapshot",
    ok: runtimeSource.includes("animation: buildAnimationSnapshotForLiveSync(animation)"),
    detail: "Global start mutation always carries animation snapshot payload for deterministic runtime hydration.",
  },
  {
    id: "global-start-emits-loop-flag",
    ok: runtimeSource.includes("loopUntilStopped: effectiveDefaultDurationSec === null"),
    detail: "Trigger payload includes explicit runtime loop flag for start lifecycle observability.",
  },
];

const output = {
  suite: "p11-hf2-t2-global-runtime-recovery-pass",
  phase: "PASS",
  observed: checks.every((entry) => entry.ok) ? "PASS" : "FAIL",
  checks,
};

writeFileSync(
  new URL("./p11-hf2-t2-global-runtime-recovery-pass-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

assert.equal(output.observed, "PASS", "Global runtime recovery checks must pass");
console.log(JSON.stringify(output, null, 2));
