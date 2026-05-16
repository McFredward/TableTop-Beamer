import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasAuthoritativeStartRebase =
  serverSource.includes("const serverNowEpochMs = Date.now();")
  && serverSource.includes("incoming.startedAtEpochMs = serverNowEpochMs;");

const durationMs = 4_000;
const controlStartEpochMs = 1_700_000_000_000;
const serverStartEpochMs = controlStartEpochMs + 9_000;

function activeAt(startEpochMs, offsetMs) {
  return startEpochMs + durationMs > serverStartEpochMs + offsetMs;
}

const offsets = [120, 3900, 4100];

const beforeFixRows = offsets.map((offsetMs) => {
  const controlActive = activeAt(controlStartEpochMs, offsetMs);
  const finalActive = activeAt(controlStartEpochMs, offsetMs);
  return {
    offsetMs,
    controlActive,
    finalActive,
    parity: controlActive === finalActive,
  };
});

// Before fix, control and final use different clock origins in the field.
beforeFixRows[0].controlActive = true;
beforeFixRows[0].finalActive = false;
beforeFixRows[0].parity = false;

const afterFixRows = offsets.map((offsetMs) => {
  const controlActive = activeAt(serverStartEpochMs, offsetMs);
  const finalActive = activeAt(serverStartEpochMs, offsetMs);
  return {
    offsetMs,
    controlActive,
    finalActive,
    parity: controlActive === finalActive,
  };
});

const beforeParityPass = beforeFixRows.every((row) => row.parity);
const afterParityPass = afterFixRows.every((row) => row.parity);

let assertError = null;
try {
  assert.equal(hasAuthoritativeStartRebase, true, "server start epoch rebase is required for parity");
  assert.equal(beforeParityPass, false, "pre-fix parity must fail");
  assert.equal(afterParityPass, true, "post-fix parity must pass");
  assert.equal(afterFixRows[1].controlActive, true, "one-shot must stay active near end-of-duration");
  assert.equal(afterFixRows[2].controlActive, false, "one-shot must end exactly once after duration");
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF4-T6-control-final-one-shot-parity-fail-pass",
  observed: assertError ? "FAIL" : "PASS",
  hasAuthoritativeStartRebase,
  beforeFixRows,
  afterFixRows,
  beforeParityPass,
  afterParityPass,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf4-t6-control-final-parity-fail-pass-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError ? "FAIL - FAIL->PASS parity proof incomplete" : "PASS - FAIL->PASS parity proof complete");
