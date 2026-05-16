import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { runLegacyNoDropScenario } from "./p10-hf9-red-harness.mjs";

const result = runLegacyNoDropScenario({ queueMax: 12, incoming: 48 });
const output = {
  suite: "p10-hf9-t6-no-drop-repro",
  expected: "FAIL",
  observed: result.status,
  details: result,
};

writeFileSync(new URL("./p10-hf9-t6-no-drop-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(result.status, "FAIL", "Legacy overflow drop path must reproduce no-drop contract violation");
console.log(JSON.stringify(output, null, 2));
