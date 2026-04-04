import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { extractRenderablePlayAreaPolygons } = require("../src/app/runtime/polygon-contract.js");

const fallbackPolygon = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const canonicalPolygon = [[0.1, 0.1], [0.9, 0.1], [0.85, 0.9], [0.12, 0.88]];

const canonicalPreferred = extractRenderablePlayAreaPolygons(
  [{ id: "canonical", polygon: canonicalPolygon }],
  { fallbackPolygon, allowDefaultFallbackWhenEmpty: true },
);

const invalidProvided = extractRenderablePlayAreaPolygons(
  [{ id: "invalid", polygon: [[0.2, 0.2], [0.8, 0.8]] }],
  { fallbackPolygon, allowDefaultFallbackWhenEmpty: true },
);

const emptySourceFallback = extractRenderablePlayAreaPolygons(
  [],
  { fallbackPolygon, allowDefaultFallbackWhenEmpty: true },
);

const output = {
  suite: "p10-hf4-t9-final-output-canonical",
  canonicalPreferredCount: canonicalPreferred.length,
  invalidProvidedCount: invalidProvided.length,
  emptySourceFallbackCount: emptySourceFallback.length,
  result: canonicalPreferred.length > 0 && invalidProvided.length === 0 ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf4-t9-final-output-canonical-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(canonicalPreferred.length > 0, true, "Valid canonical polygons must remain clip source");
assert.equal(invalidProvided.length, 0, "Invalid provided polygons must not trigger default fallback when canonical source exists but is invalid");
assert.equal(emptySourceFallback.length > 0, true, "Fallback remains allowed only for truly missing polygon data");

console.log(JSON.stringify(output, null, 2));
