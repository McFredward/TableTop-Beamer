import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const checks = [
  {
    id: "runtime-clear-all-hard-stop-still-present",
    ok: runtimeSource.includes("hardStopRuntimeEffects({ clearVisuals: true });")
      && runtimeSource.includes("void emitLiveMutation(\"clear-all\""),
    detail: "Clear-all still enforces immediate runtime hard-stop + live mutation broadcast.",
  },
  {
    id: "runtime-stop-animation-flow-still-present",
    ok: runtimeSource.includes("if (mutationType === \"clear-all\" || mutationType === \"stop-animation\")")
      && runtimeSource.includes("emitStopAnimationCommand"),
    detail: "Stop path remains explicit and deterministic in runtime apply + command flow.",
  },
  {
    id: "server-clear-all-global-stop-revisions-preserved",
    ok: serverSource.includes("if (mutationType === \"clear-all\")")
      && serverSource.includes("globalStopRevisions[triggerKey] = stopRevision + 1;")
      && serverSource.includes("runningAnimations.length = 0;"),
    detail: "Server clear-all still advances global stop revisions and clears running animations atomically.",
  },
];

const output = {
  suite: "p11-hf2-t5-stop-clear-non-regression-pass",
  phase: "PASS",
  observed: checks.every((entry) => entry.ok) ? "PASS" : "FAIL",
  checks,
};

writeFileSync(
  new URL("./p11-hf2-t5-stop-clear-non-regression-pass-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

assert.equal(output.observed, "PASS", "Stop/Clear semantics must stay non-regressed");
console.log(JSON.stringify(output, null, 2));
