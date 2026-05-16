import { readFileSync, writeFileSync } from "node:fs";

const artifacts = [
  "p11-hf4-t1-non-loop-suppression-red-output.json",
  "p11-hf4-t3-oneshot-final-full-duration-pass-output.json",
  "p11-hf4-t4-loop-non-regression-output.json",
  "p11-hf4-t5-stop-clear-non-regression-output.json",
  "p11-hf4-t6-control-final-parity-fail-pass-output.json",
];

const rows = artifacts.map((fileName) => {
  const raw = readFileSync(new URL(`./${fileName}`, import.meta.url), "utf8");
  const parsed = JSON.parse(raw);
  return {
    fileName,
    suite: parsed.suite ?? fileName,
    observed: parsed.observed ?? "UNKNOWN",
    pass: parsed.observed === "PASS",
  };
});

const allPass = rows.every((row) => row.pass);

const output = {
  suite: "P11-HF4-acceptance-regression",
  observed: allPass ? "PASS" : "FAIL",
  rows,
};

writeFileSync(
  new URL("./p11-hf4-acceptance-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(allPass ? "PASS - HF4 acceptance regression matrix passed" : "FAIL - HF4 acceptance regression matrix failed");
