import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const checks = [
  {
    id: "dashboard-loop-checkbox-present",
    ok: htmlSource.includes('id="dashboard-global-loop-until-stop"'),
    detail: "Dashboard global trigger panel exposes Loop until stopped checkbox.",
  },
  {
    id: "checkbox-lives-in-dashboard-global-panel",
    ok: /Global animations - inside Play Area[\s\S]*dashboard-global-loop-until-stop[\s\S]*inside-global-buttons/.test(htmlSource),
    detail: "Loop toggle is colocated with trigger-time global controls, not hidden behind settings editor.",
  },
];

const output = {
  suite: "p11-hf2-t3-dashboard-loop-toggle-pass",
  phase: "PASS",
  observed: checks.every((entry) => entry.ok) ? "PASS" : "FAIL",
  checks,
};

writeFileSync(
  new URL("./p11-hf2-t3-dashboard-loop-toggle-pass-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

assert.equal(output.observed, "PASS", "Dashboard loop toggle must be present in global trigger controls");
console.log(JSON.stringify(output, null, 2));
