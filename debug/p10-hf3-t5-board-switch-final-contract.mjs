import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const {
  applySnapshotPolygonState,
  getNormalizedPolygonArea,
} = require("../src/app/runtime/polygon-contract.js");

const FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const BOARDS = ["nemesis", "nemesis-lockdown-a"];

function createSnapshot(boardId, selectedPlayAreaId, polygon) {
  return {
    runtime: {
      selectedBoard: boardId,
      playAreasByBoard: {
        [boardId]: [
          {
            id: selectedPlayAreaId,
            name: selectedPlayAreaId,
            polygon,
          },
        ],
      },
      selectedPlayAreaIdByBoard: {
        [boardId]: selectedPlayAreaId,
      },
    },
  };
}

function clipContract(polygon) {
  return getNormalizedPolygonArea(Array.isArray(polygon) ? polygon : []) >= 0.00003
    ? "canonical"
    : "fallback";
}

let state = {
  playAreasByBoard: Object.fromEntries(BOARDS.map((boardId) => [boardId, [{ id: "play-area-1", name: "Play Area 1", polygon: FALLBACK }]])),
  selectedPlayAreaIdByBoard: Object.fromEntries(BOARDS.map((boardId) => [boardId, "play-area-1"])),
};

const sequence = [
  {
    boardId: "nemesis",
    selectedPlayAreaId: "nemesis-canonical",
    polygon: [[0.1, 0.1], [0.88, 0.12], [0.9, 0.9], [0.12, 0.88]],
  },
  {
    boardId: "nemesis-lockdown-a",
    selectedPlayAreaId: "lockdown-canonical",
    polygon: [[0.08, 0.09], [0.92, 0.1], [0.9, 0.91], [0.09, 0.9]],
  },
];

const results = [];
for (const step of sequence) {
  const snapshot = createSnapshot(step.boardId, step.selectedPlayAreaId, step.polygon);
  const applied = applySnapshotPolygonState({
    state,
    snapshot,
    runtime: snapshot.runtime,
    boardIds: BOARDS,
    shipPolygonDefault: FALLBACK,
  });
  state = {
    playAreasByBoard: applied.playAreasByBoard,
    selectedPlayAreaIdByBoard: applied.selectedPlayAreaIdByBoard,
  };
  const selectedId = state.selectedPlayAreaIdByBoard?.[step.boardId] ?? null;
  const selectedPolygon = (state.playAreasByBoard?.[step.boardId] ?? [])
    .find((entry) => entry.id === selectedId)?.polygon;
  const contract = clipContract(selectedPolygon);
  results.push({
    boardId: step.boardId,
    expectedSelectedPlayAreaId: step.selectedPlayAreaId,
    actualSelectedPlayAreaId: selectedId,
    clipContract: contract,
    pass: selectedId === step.selectedPlayAreaId && contract === "canonical",
  });
}

const failures = results.filter((entry) => !entry.pass);
const output = {
  suite: "p10-hf3-t5-board-switch-final-contract",
  result: failures.length === 0 ? "PASS" : "FAIL",
  checks: results,
};

writeFileSync(new URL("./p10-hf3-t5-board-switch-final-contract-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(failures.length, 0, `Board-switch final-output contract drift on: ${failures.map((entry) => entry.boardId).join(", ")}`);

console.log(JSON.stringify(output, null, 2));
