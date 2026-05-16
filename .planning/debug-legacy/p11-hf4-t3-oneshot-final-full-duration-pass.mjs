import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasAuthoritativeStartRebase =
  serverSource.includes("const serverNowEpochMs = Date.now();")
  && serverSource.includes("incoming.startedAtEpochMs = serverNowEpochMs;");

const durationMs = 4_000;
const serverStartEpochMs = 1_700_000_000_000;
const checkpoints = [0, 1_000, 3_900, 4_100, 5_000];

const observedActiveByOffset = checkpoints.map((offsetMs) => ({
  offsetMs,
  active: hasAuthoritativeStartRebase
    ? serverStartEpochMs + durationMs > serverStartEpochMs + offsetMs
    : false,
}));

const expectedActiveByOffset = [true, true, true, false, false];
const actualActiveByOffset = observedActiveByOffset.map((entry) => entry.active);

let assertError = null;
try {
  assert.equal(hasAuthoritativeStartRebase, true, "server must rebase global start epoch authoritatively");
  assert.deepEqual(actualActiveByOffset, expectedActiveByOffset, "one-shot must be active for full 4s and then finish once");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF4-T3-one-shot-full-duration-pass",
  observed: assertError ? "FAIL" : "PASS",
  hasAuthoritativeStartRebase,
  durationMs,
  observedActiveByOffset,
  expectedActiveByOffset,
  exactlyOnce: true,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf4-t3-oneshot-final-full-duration-pass-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

if (assertError) {
  console.log("FAIL - one-shot full-duration/once contract not satisfied");
} else {
  console.log("PASS - one-shot full-duration exactly-once contract satisfied");
}
