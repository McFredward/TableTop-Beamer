import { readFileSync, writeFileSync } from "node:fs";

const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasAuthoritativeStartRebase =
  serverSource.includes("const serverNowEpochMs = Date.now();")
  && serverSource.includes("incoming.startedAtEpochMs = serverNowEpochMs;");

const globalOneShotDurationMs = 4_000;
const controlStartEpochMs = 1_700_000_000_000;
const serverReceiveEpochMs = controlStartEpochMs + 9_000;
const finalRenderEpochMs = serverReceiveEpochMs + 120;

const authoritativeStartEpochMs = hasAuthoritativeStartRebase
  ? serverReceiveEpochMs
  : controlStartEpochMs;

const oneShotActiveOnFinal =
  authoritativeStartEpochMs + globalOneShotDurationMs > finalRenderEpochMs;
const loopActiveOnFinal = true;

const suppressionReproduced = !oneShotActiveOnFinal && loopActiveOnFinal;

const output = {
  suite: "P11-HF4-T1-non-loop-final-suppression-red",
  phase: "RED",
  observed: suppressionReproduced ? "FAIL" : "PASS",
  expected: "FAIL",
  checks: [
    {
      id: "server-authoritative-global-start-epoch-rebase",
      pass: hasAuthoritativeStartRebase,
      expected: false,
    },
    {
      id: "one-shot-active-on-final-under-clock-skew",
      pass: oneShotActiveOnFinal,
      expected: false,
      meta: {
        controlStartEpochMs,
        serverReceiveEpochMs,
        finalRenderEpochMs,
        globalOneShotDurationMs,
        authoritativeStartEpochMs,
      },
    },
    {
      id: "loop-still-active-on-final",
      pass: loopActiveOnFinal,
      expected: true,
    },
  ],
};

writeFileSync(
  new URL("./p11-hf4-t1-non-loop-suppression-red-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

if (suppressionReproduced) {
  console.log("FAIL - RED repro captured: non-loop suppressed on final while loop remains visible");
} else {
  console.log("PASS - RED repro no longer present");
}
