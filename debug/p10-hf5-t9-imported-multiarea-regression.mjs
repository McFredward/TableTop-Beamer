import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/core/polygon-contract.js");

const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const importedBoardDefinition = JSON.parse(readFileSync(new URL("../config/boards/imported/nemesis-lockdown-a.json", import.meta.url), "utf8"));
const importedBoardId = importedBoardDefinition?.board?.boardId ?? "nemesis-lockdown-a";

const boardScenarios = [
  {
    boardId: importedBoardId,
    kind: "imported-multi-area",
    expectedSelected: "valid-beta",
  },
  {
    boardId: "nemesis-board-a",
    kind: "builtin-single-area",
    expectedSelected: "single-a",
  },
];

const lifecycle = ["startup", "reload", "apply-defaults", "board-switch"];
const surfaces = ["control", "output/final"];

function runProbe({ boardId, expectedSelected, lifecycleStep, surface }) {
  const isMulti = expectedSelected === "valid-beta";
  const state = {
    playAreasByBoard: {
      [boardId]: [{ id: "play-area-1", polygon: SHIP_FALLBACK }],
    },
    selectedPlayAreaIdByBoard: {
      [boardId]: "play-area-1",
    },
  };
  const runtime = {
    selectedBoard: boardId,
    lifecycle: lifecycleStep,
    surface,
    playAreasByBoard: {
      [boardId]: isMulti
        ? [
          { id: "invalid-alpha", polygon: [[0.2, 0.2], [0.22, 0.22]] },
          { id: "valid-beta", polygon: [[0.09, 0.1], [0.93, 0.11], [0.9, 0.93], [0.11, 0.9]] },
        ]
        : [{ id: "single-a", polygon: [[0.12, 0.12], [0.88, 0.12], [0.88, 0.88], [0.12, 0.88]] }],
    },
    selectedPlayAreaIdByBoard: {
      [boardId]: isMulti ? "invalid-alpha" : "single-a",
    },
  };

  const applied = applySnapshotPolygonState({
    state,
    snapshot: { runtime },
    runtime,
    boardIds: [boardId],
    shipPolygonDefault: SHIP_FALLBACK,
  });

  const selectedPlayAreaId = applied.selectedPlayAreaIdByBoard?.[boardId] ?? null;
  const selectedArea = (applied.playAreasByBoard?.[boardId] ?? []).find((entry) => entry.id === selectedPlayAreaId) ?? null;
  const selectedPolygon = Array.isArray(selectedArea?.polygon) ? selectedArea.polygon : [];
  return {
    boardId,
    lifecycle: lifecycleStep,
    surface,
    expectedSelected,
    selectedPlayAreaId,
    fellBackToDefaultHex: JSON.stringify(selectedPolygon) === JSON.stringify(SHIP_FALLBACK),
  };
}

const matrix = [];
for (const scenario of boardScenarios) {
  for (const lifecycleStep of lifecycle) {
    for (const surface of surfaces) {
      matrix.push(runProbe({
        boardId: scenario.boardId,
        expectedSelected: scenario.expectedSelected,
        lifecycleStep,
        surface,
      }));
    }
  }
}

const output = {
  suite: "p10-hf5-t9-imported-multiarea-regression",
  importedBoardId,
  matrix,
  result: matrix.every((entry) => entry.selectedPlayAreaId === entry.expectedSelected && !entry.fellBackToDefaultHex) ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf5-t9-imported-multiarea-regression-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(output.result, "PASS", "Imported-board and multi-area regression matrix must stay canonical-first without default fallback takeover");
console.log(JSON.stringify(output, null, 2));
