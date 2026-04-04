import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const {
  normalizePlayAreasCollection,
  extractRenderablePlayAreaPolygons,
} = require("../src/app/runtime/polygon-contract.js");

const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];

const canonicalSource = [
  { id: "invalid-alpha", polygon: [[0.2, 0.2], [0.21, 0.21]] },
  { id: "valid-beta", polygon: [[0.1, 0.1], [0.9, 0.12], [0.88, 0.9], [0.12, 0.88]] },
  { id: "valid-gamma", polygon: [[0.14, 0.16], [0.82, 0.16], [0.8, 0.82], [0.16, 0.82]] },
];

const canonicalAreas = normalizePlayAreasCollection(canonicalSource, SHIP_FALLBACK);
const controlAreaIds = canonicalAreas.map((entry) => entry.id);

const finalRenderablePolygons = extractRenderablePlayAreaPolygons(canonicalAreas, {
  fallbackPolygon: SHIP_FALLBACK,
  allowDefaultFallbackWhenEmpty: true,
});

const output = {
  suite: "p10-hf5-t6-shared-resolver-contract",
  controlAreaIds,
  finalRenderablePolygonCount: finalRenderablePolygons.length,
  expectedValidAreas: ["valid-beta", "valid-gamma"],
  result:
    controlAreaIds.join(",") === "valid-beta,valid-gamma" && finalRenderablePolygons.length === 2
      ? "PASS"
      : "FAIL",
};

writeFileSync(new URL("./p10-hf5-t6-shared-resolver-contract-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.deepEqual(controlAreaIds, ["valid-beta", "valid-gamma"], "Control canonical resolver must drop invalid entries and keep valid canonical areas");
assert.equal(finalRenderablePolygons.length, 2, "Final-output renderer must consume same canonical area set as control resolver");

console.log(JSON.stringify(output, null, 2));
