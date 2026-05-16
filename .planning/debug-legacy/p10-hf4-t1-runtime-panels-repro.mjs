import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const logs = [];

const context = vm.createContext({
  window: {
    TT_BEAMER_LOGGER: {
      createLogger: () => ({
        info: (...args) => logs.push({ level: "info", args }),
        warn: (...args) => logs.push({ level: "warn", args }),
        error: (...args) => logs.push({ level: "error", args }),
      }),
    },
  },
});

const runtimePanelsSource = readFileSync(new URL("../src/app/lib/ui/runtime-panels-controller.js", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

vm.runInContext(runtimePanelsSource, context, { filename: "runtime-panels-controller.js" });
vm.runInContext(appSource, context, { filename: "app.js" });

const missingWarning = logs.find((entry) => entry.level === "warn" && entry.args?.[0] === "domain-modules-missing") ?? null;
const missing = Array.isArray(missingWarning?.args?.[1]?.missing) ? missingWarning.args[1].missing : [];

const output = {
  suite: "p10-hf4-t1-runtime-panels-repro",
  runtimePanelsGlobalPresent: Boolean(context.window.TT_BEAMER_RUNTIME_PANELS),
  legacyUiRuntimePanelsGlobalPresent: Boolean(context.window.TT_BEAMER_UI_RUNTIME_PANELS),
  missingDomains: missing,
  result: missing.includes("TT_BEAMER_RUNTIME_PANELS") ? "FAIL" : "PASS",
};

writeFileSync(new URL("./p10-hf4-t1-runtime-panels-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.ok(
  !missing.includes("TT_BEAMER_RUNTIME_PANELS"),
  "TT_BEAMER_RUNTIME_PANELS must be globally exposed before app-shell domain checks",
);

console.log(JSON.stringify(output, null, 2));
