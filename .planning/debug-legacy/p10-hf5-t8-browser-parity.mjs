import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const suites = [
  {
    id: "multi-vs-single-repro",
    command: ["debug/p10-hf5-t1-multi-vs-single-repro.mjs"],
    outputPath: "debug/p10-hf5-t1-multi-vs-single-repro-output.json",
  },
  {
    id: "lockdown-fallback-repro",
    command: ["debug/p10-hf5-t2-lockdown-fallback-repro.mjs"],
    outputPath: "debug/p10-hf5-t2-lockdown-fallback-repro-output.json",
  },
  {
    id: "firefox-parity-diagnostics",
    command: ["debug/p10-hf5-t3-firefox-parity-diagnostics.mjs"],
    outputPath: "debug/p10-hf5-t3-firefox-parity-diagnostics-output.json",
  },
  {
    id: "canonical-source-diagnostics",
    command: ["debug/p10-hf5-t4-canonical-source-diagnostics.mjs"],
    outputPath: "debug/p10-hf5-t4-canonical-source-diagnostics-output.json",
  },
  {
    id: "lifecycle-parity",
    command: ["debug/p10-hf5-t7-lifecycle-parity.mjs"],
    outputPath: "debug/p10-hf5-t7-lifecycle-parity-output.json",
  },
];

const browsers = ["chrome", "firefox", "mobile-chrome"];

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
  suite: "p10-hf5-t8-browser-parity",
  result: parity.every((entry) => entry.parityPass) && matrix.every((entry) => entry.result === "PASS" && entry.exitCode === 0)
    ? "PASS"
    : "FAIL",
  browsers,
  parity,
};

writeFileSync(new URL("./p10-hf5-t8-browser-parity-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.ok(parity.every((entry) => entry.parityPass), "HF5 suite must produce parity-equivalent verdicts across Chrome/Firefox/mobile-chrome lanes");
assert.ok(matrix.every((entry) => entry.result === "PASS" && entry.exitCode === 0), "All HF5 diagnostics must PASS in every browser lane");

console.log(JSON.stringify(output, null, 2));
