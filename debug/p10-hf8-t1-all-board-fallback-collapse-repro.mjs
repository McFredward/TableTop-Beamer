import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveProfilePolygonContract } = require("../src/app/runtime/core/polygon-contract.js");

const BOARDS = ["nemesis-board-a", "nemesis-lockdown-a", "imported-lockdown-multi"];

function buildCanonicalDefaults() {
  return {
    "nemesis-board-a": {
      playAreas: [{ id: "single-a", name: "Single A", polygon: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]] }],
      selectedPlayAreaId: "single-a",
    },
    "nemesis-lockdown-a": {
      playAreas: [
        { id: "play-area-1", name: "Play Area 1", polygon: [[0.08, 0.08], [0.94, 0.08], [0.94, 0.94], [0.08, 0.94]] },
        { id: "bunker", name: "Bunker", polygon: [[0.22, 0.2], [0.8, 0.2], [0.8, 0.78], [0.22, 0.78]] },
      ],
      selectedPlayAreaId: "bunker",
    },
    "imported-lockdown-multi": {
      playAreas: [
        { id: "play-area-1", name: "Play Area 1", polygon: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.95], [0.05, 0.95]] },
        { id: "cargo", name: "Cargo", polygon: [[0.2, 0.18], [0.82, 0.18], [0.82, 0.82], [0.2, 0.82]] },
      ],
      selectedPlayAreaId: "cargo",
    },
  };
}

function buildFallbackLocalProfiles() {
  return Object.fromEntries(
    BOARDS.map((boardId) => [boardId, {
      playAreas: [{ id: "play-area-1", name: "Play Area 1", polygon: [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]] }],
      selectedPlayAreaId: "play-area-1",
    }]),
  );
}

function legacyApplyPolygonPrecedence(baseProfiles, polygonOwnerProfiles) {
  const merged = {};
  for (const boardId of BOARDS) {
    const baseProfile = baseProfiles?.[boardId] ?? {};
    const polygonOwnerProfile = polygonOwnerProfiles?.[boardId] ?? {};
    const polygonContract = resolveProfilePolygonContract(polygonOwnerProfile, baseProfile, [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]]);
    merged[boardId] = {
      ...baseProfile,
      ...polygonContract,
    };
  }
  return merged;
}

const canonicalDefaults = buildCanonicalDefaults();
const localFallback = buildFallbackLocalProfiles();
const merged = legacyApplyPolygonPrecedence(canonicalDefaults, localFallback);

const boardResults = BOARDS.map((boardId) => {
  const expected = canonicalDefaults[boardId];
  const observed = merged[boardId];
  const expectedAreaIdSet = (expected.playAreas ?? []).map((entry) => entry.id).sort();
  const observedAreaIdSet = (observed.playAreas ?? []).map((entry) => entry.id).sort();
  return {
    boardId,
    expectedSelected: expected.selectedPlayAreaId,
    observedSelected: observed.selectedPlayAreaId,
    expectedAreaIdSet,
    observedAreaIdSet,
    collapsedToFallback:
      observed.selectedPlayAreaId === "play-area-1"
      && JSON.stringify(observedAreaIdSet) === JSON.stringify(["play-area-1"]),
  };
});

const output = {
  suite: "p10-hf8-t1-all-board-fallback-collapse-repro",
  phase: "RED",
  legacyPath: "applyGlobalDefaultsPayloadToState -> applyPolygonPrecedence(migratedProfiles, localProfiles)",
  boardResults,
  result: boardResults.every((entry) => entry.collapsedToFallback) ? "FAIL" : "PASS",
};

writeFileSync(new URL("./p10-hf8-t1-all-board-fallback-collapse-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.result, "FAIL", "Legacy defaults merge must reproduce all-board fallback collapse");
console.log(JSON.stringify(output, null, 2));
