import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/core/polygon-contract.js");

const boardId = "nemesis-lockdown-a";
const fallbackTriangle = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];

const snapshot = {
  runtime: {
    boardProfiles: {
      [boardId]: {
        playAreas: [{ id: "bunker", name: "Bunker", polygon: [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5]] }],
        selectedPlayAreaId: "bunker",
      },
    },
  },
};

const state = {
  playAreasByBoard: {
    [boardId]: [{ id: "play-area-1", name: "Play Area 1", polygon: fallbackTriangle }],
  },
  selectedPlayAreaIdByBoard: {
    [boardId]: "play-area-1",
  },
};

const applied = applySnapshotPolygonState({
  state,
  snapshot,
  runtime: snapshot.runtime,
  boardIds: [boardId],
  shipPolygonDefault: fallbackTriangle,
});

const observedAreas = applied.playAreasByBoard?.[boardId] ?? [];
const observedSelected = applied.selectedPlayAreaIdByBoard?.[boardId] ?? null;
const hasIssueSurface = Array.isArray(applied.issues) && applied.issues.length > 0;

const output = {
  suite: "p10-hf8-t4-silent-fallback-repro",
  phase: "RED",
  boardId,
  observedAreaIds: observedAreas.map((entry) => entry.id),
  observedSelected,
  hasIssueSurface,
  result:
    observedAreas.length === 1
    && observedAreas[0]?.id === "play-area-1"
    && observedSelected === "play-area-1"
    && !hasIssueSurface
      ? "FAIL"
      : "PASS",
};

writeFileSync(new URL("./p10-hf8-t4-silent-fallback-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.result, "FAIL", "Canonical load/apply failure must currently reproduce silent fallback masking");
console.log(JSON.stringify(output, null, 2));
