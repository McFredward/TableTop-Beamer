import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveProfilePolygonContract } = require("../src/app/runtime/polygon-contract.js");

const fallback = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];

const canonicalByBoard = {
  "nemesis-board-a": {
    playAreas: [{ id: "single-a", polygon: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]] }],
    selectedPlayAreaId: "single-a",
  },
  "nemesis-lockdown-a": {
    playAreas: [
      { id: "play-area-1", polygon: [[0.08, 0.08], [0.94, 0.08], [0.94, 0.94], [0.08, 0.94]] },
      { id: "bunker", polygon: [[0.22, 0.2], [0.8, 0.2], [0.8, 0.78], [0.22, 0.78]] },
    ],
    selectedPlayAreaId: "bunker",
  },
  "imported-lockdown-multi": {
    playAreas: [
      { id: "play-area-1", polygon: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.95], [0.05, 0.95]] },
      { id: "cargo", polygon: [[0.2, 0.2], [0.82, 0.2], [0.82, 0.82], [0.2, 0.82]] },
    ],
    selectedPlayAreaId: "cargo",
  },
};

const localFallbackByBoard = Object.fromEntries(
  Object.keys(canonicalByBoard).map((boardId) => [boardId, {
    playAreas: [{ id: "play-area-1", polygon: fallback }],
    selectedPlayAreaId: "play-area-1",
  }]),
);

const matrix = Object.keys(canonicalByBoard).map((boardId) => {
  const resolved = resolveProfilePolygonContract(canonicalByBoard[boardId], localFallbackByBoard[boardId], fallback);
  const expectedAreaIds = canonicalByBoard[boardId].playAreas.map((entry) => entry.id).sort();
  const observedAreaIds = resolved.playAreas.map((entry) => entry.id).sort();
  return {
    boardId,
    expectedSelected: canonicalByBoard[boardId].selectedPlayAreaId,
    observedSelected: resolved.selectedPlayAreaId,
    expectedAreaIds,
    observedAreaIds,
    pass:
      resolved.selectedPlayAreaId === canonicalByBoard[boardId].selectedPlayAreaId
      && JSON.stringify(observedAreaIds) === JSON.stringify(expectedAreaIds),
  };
});

const output = {
  suite: "p10-hf8-t5-canonical-load-recovery",
  matrix,
  result: matrix.every((entry) => entry.pass) ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf8-t5-canonical-load-recovery-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.result, "PASS", "Canonical-first recovery must preserve board-specific play-area sets for all boards");
console.log(JSON.stringify(output, null, 2));
