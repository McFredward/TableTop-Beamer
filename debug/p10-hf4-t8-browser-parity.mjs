import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const suites = [
  {
    id: "runtime-panels-repro",
    command: ["debug/p10-hf4-t1-runtime-panels-repro.mjs"],
    outputPath: "debug/p10-hf4-t1-runtime-panels-repro-output.json",
  },
  {
    id: "runtime-panels-diagnostics",
    command: ["debug/p10-hf4-t2-runtime-panels-diagnostics.mjs"],
    outputPath: "debug/p10-hf4-t2-runtime-panels-diagnostics-output.json",
  },
  {
    id: "settings-ownership",
    command: ["debug/p10-hf4-t4-settings-ownership-repro.mjs"],
    outputPath: "debug/p10-hf4-t4-settings-ownership-repro-output.json",
  },
  {
    id: "ship-clip-regression",
    command: ["debug/p10-hf4-t6-ship-clip-repro.mjs"],
    outputPath: "debug/p10-hf4-t6-ship-clip-repro-output.json",
  },
];

const browsers = ["chrome", "firefox"];

function runSuiteForBrowser(suite, browser) {
  const run = spawnSync("node", suite.command, {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, TT_BEAMER_DIAGNOSTIC_BROWSER: browser },
    encoding: "utf8",
  });
  const parsed = JSON.parse(readFileSync(new URL(`../${suite.outputPath}`, import.meta.url), "utf8"));
  return {
    suite: suite.id,
    browser,
    exitCode: run.status,
    result: parsed.result,
  };
}

const matrix = [];
for (const browser of browsers) {
  for (const suite of suites) {
    matrix.push(runSuiteForBrowser(suite, browser));
  }
}

const suitesById = new Map();
for (const entry of matrix) {
  const list = suitesById.get(entry.suite) ?? [];
  list.push(entry);
  suitesById.set(entry.suite, list);
}

const parity = Array.from(suitesById.entries()).map(([suite, entries]) => {
  const results = new Set(entries.map((entry) => `${entry.result}:${entry.exitCode}`));
  return {
    suite,
    entries,
    parityPass: results.size === 1,
  };
});

const output = {
  suite: "p10-hf4-t8-browser-parity",
  result: parity.every((entry) => entry.parityPass) && matrix.every((entry) => entry.result === "PASS")
    ? "PASS"
    : "FAIL",
  browsers,
  parity,
};

writeFileSync(new URL("./p10-hf4-t8-browser-parity-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.ok(parity.every((entry) => entry.parityPass), "HF4 diagnostics must produce parity-equivalent verdicts for Chrome and Firefox");
assert.ok(matrix.every((entry) => entry.result === "PASS" && entry.exitCode === 0), "All HF4 diagnostics must pass in both browser lanes");

console.log(JSON.stringify(output, null, 2));
