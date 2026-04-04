import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const functionMatch = source.match(/function validateSettingsControlOwnership\([\s\S]*?\n}\n\nfunction validateViewExclusivity/);

if (!functionMatch) {
  throw new Error("Unable to locate validateSettingsControlOwnership in runtime-orchestration.js");
}

const functionSource = functionMatch[0].replace(/\nfunction validateViewExclusivity[\s\S]*/, "");

const diagnostics = [];

const context = vm.createContext({
  SETTINGS_EXCLUSIVE_CONTROL_IDS: ["board-select", "outside-mode", "outside-direction"],
  document: {
    getElementById(id) {
      if (id === "outside-mode" || id === "outside-direction") {
        return null;
      }
      return {
        closest() {
          return { dataset: { view: "settings" } };
        },
      };
    },
  },
  logUi: {
    error(eventName, payload) {
      diagnostics.push({ eventName, payload });
    },
  },
  triggerFeedback: { textContent: "" },
});

vm.runInContext(`${functionSource}\n;globalThis.__ownershipResult = validateSettingsControlOwnership({ silent: false, context: "hf4-t4" });`, context);

const output = {
  suite: "p10-hf4-t4-settings-ownership-repro",
  outsideModeMounted: false,
  outsideDirectionMounted: false,
  diagnostics,
  result: context.__ownershipResult ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf4-t4-settings-ownership-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(
  context.__ownershipResult,
  true,
  "Settings ownership checks must accept conditionally unmounted non-applicable outside controls",
);

console.log(JSON.stringify(output, null, 2));
