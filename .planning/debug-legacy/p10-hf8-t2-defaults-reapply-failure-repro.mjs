import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveProfilePolygonContract } = require("../src/app/runtime/core/polygon-contract.js");

const boardId = "nemesis-lockdown-a";

const defaultsPayloadProfile = {
  playAreas: [
    { id: "play-area-1", name: "Play Area 1", polygon: [[0.08, 0.08], [0.94, 0.08], [0.94, 0.94], [0.08, 0.94]] },
    { id: "bunker", name: "Bunker", polygon: [[0.21, 0.2], [0.82, 0.2], [0.82, 0.79], [0.21, 0.79]] },
  ],
  selectedPlayAreaId: "bunker",
};

const currentRuntimeFallbackProfile = {
  playAreas: [{ id: "play-area-1", name: "Play Area 1", polygon: [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]] }],
  selectedPlayAreaId: "play-area-1",
};

const mergedLegacy = {
  ...defaultsPayloadProfile,
  ...resolveProfilePolygonContract(
    currentRuntimeFallbackProfile,
    defaultsPayloadProfile,
    [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]],
  ),
};

const observedAreaIdSet = (mergedLegacy.playAreas ?? []).map((entry) => entry.id).sort();
const output = {
  suite: "p10-hf8-t2-defaults-reapply-failure-repro",
  phase: "RED",
  boardId,
  expectedSelected: defaultsPayloadProfile.selectedPlayAreaId,
  observedSelected: mergedLegacy.selectedPlayAreaId,
  expectedAreaIdSet: defaultsPayloadProfile.playAreas.map((entry) => entry.id).sort(),
  observedAreaIdSet,
  legacyDecision: "local runtime polygons override loaded defaults polygons",
  result:
    mergedLegacy.selectedPlayAreaId === "play-area-1"
    && JSON.stringify(observedAreaIdSet) === JSON.stringify(["play-area-1"])
      ? "FAIL"
      : "PASS",
};

writeFileSync(new URL("./p10-hf8-t2-defaults-reapply-failure-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.result, "FAIL", "Legacy load defaults path must reproduce board-specific reapply failure");
console.log(JSON.stringify(output, null, 2));
