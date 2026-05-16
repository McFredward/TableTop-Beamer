import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const {
  extractRenderablePlayAreaPolygons,
  normalizePlayAreasCollection,
  resolveProfilePolygonContract,
  isRenderableNormalizedPolygon,
} = require("../src/app/runtime/core/polygon-contract.js");

const fallbackPolygon = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];

const invalidInput = [
  {
    id: "invalid-area",
    name: "Invalid",
    polygon: [[0.2, 0.2], [0.8, 0.8]],
  },
];

const invalidNormalized = extractRenderablePlayAreaPolygons(invalidInput, {
  fallbackPolygon,
  allowDefaultFallbackWhenEmpty: true,
});
const invalidAccepted = invalidNormalized.length > 0;

const canonicalMultiArea = normalizePlayAreasCollection([
  {
    id: "inside-a",
    polygon: [[0.08, 0.08], [0.48, 0.1], [0.45, 0.9], [0.1, 0.88]],
  },
  {
    id: "inside-b",
    polygon: [[0.52, 0.1], [0.92, 0.08], [0.9, 0.9], [0.55, 0.88]],
  },
], fallbackPolygon);

const legacyContract = resolveProfilePolygonContract(
  { shipPolygon: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]], selectedPlayAreaId: "legacy-1" },
  {},
  fallbackPolygon,
);

const output = {
  suite: "p10-hf4-t6-ship-clip-repro",
  invalidInputVertexCount: invalidInput[0].polygon.length,
  invalidAccepted,
  canonicalMultiAreaCount: canonicalMultiArea.length,
  canonicalMultiAreaRenderableCount: canonicalMultiArea.filter((entry) => isRenderableNormalizedPolygon(entry.polygon)).length,
  legacySelectedPlayAreaId: legacyContract.selectedPlayAreaId,
  legacyRenderableCount: legacyContract.playAreas.filter((entry) => isRenderableNormalizedPolygon(entry.polygon)).length,
  result: !invalidAccepted ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf4-t6-ship-clip-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(invalidAccepted, false, "Invalid ship polygons must not be normalized into renderable fallback polygons");
assert.ok(canonicalMultiArea.length >= 2, "Canonical multi-play-area state must remain accepted");
assert.ok(legacyContract.playAreas.length >= 1, "Legacy shipPolygon contract must remain accepted");

console.log(JSON.stringify(output, null, 2));
