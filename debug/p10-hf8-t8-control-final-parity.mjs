import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const fallback = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const boards = [
  {
    boardId: "nemesis-board-a",
    profile: {
      playAreas: [{ id: "single-a", polygon: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]] }],
      selectedPlayAreaId: "single-a",
    },
  },
  {
    boardId: "nemesis-lockdown-a",
    profile: {
      playAreas: [
        { id: "play-area-1", polygon: [[0.08, 0.08], [0.94, 0.08], [0.94, 0.94], [0.08, 0.94]] },
        { id: "bunker", polygon: [[0.22, 0.2], [0.8, 0.2], [0.8, 0.78], [0.22, 0.78]] },
      ],
      selectedPlayAreaId: "bunker",
    },
  },
];

const lifecycle = ["startup", "reload", "apply-defaults", "board-switch"];

function applyForSurface(boardId, profile, surface, lifecycleStep) {
  return applySnapshotPolygonState({
    state: {
      playAreasByBoard: {
        [boardId]: [{ id: "play-area-1", polygon: fallback }],
      },
      selectedPlayAreaIdByBoard: {
        [boardId]: "play-area-1",
      },
    },
    snapshot: {
      runtime: {
        boardProfiles: {
          [boardId]: profile,
        },
      },
      surface,
      lifecycle: lifecycleStep,
    },
    runtime: {
      boardProfiles: {
        [boardId]: profile,
      },
      surface,
      lifecycle: lifecycleStep,
    },
    boardIds: [boardId],
    shipPolygonDefault: fallback,
  });
}

const matrix = [];
for (const board of boards) {
  for (const lifecycleStep of lifecycle) {
    const control = applyForSurface(board.boardId, board.profile, "control", lifecycleStep);
    const final = applyForSurface(board.boardId, board.profile, "output/final", lifecycleStep);
    const controlAreas = control.playAreasByBoard?.[board.boardId] ?? [];
    const finalAreas = final.playAreasByBoard?.[board.boardId] ?? [];
    const controlIdSet = controlAreas.map((entry) => entry.id).sort();
    const finalIdSet = finalAreas.map((entry) => entry.id).sort();
    matrix.push({
      boardId: board.boardId,
      lifecycle: lifecycleStep,
      controlAreaCount: controlAreas.length,
      finalAreaCount: finalAreas.length,
      controlIdSet,
      finalIdSet,
      controlSelected: control.selectedPlayAreaIdByBoard?.[board.boardId] ?? null,
      finalSelected: final.selectedPlayAreaIdByBoard?.[board.boardId] ?? null,
      pass:
        controlAreas.length === finalAreas.length
        && JSON.stringify(controlIdSet) === JSON.stringify(finalIdSet)
        && control.selectedPlayAreaIdByBoard?.[board.boardId] === final.selectedPlayAreaIdByBoard?.[board.boardId],
    });
  }
}

const output = {
  suite: "p10-hf8-t8-control-final-parity",
  matrix,
  result: matrix.every((entry) => entry.pass) ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf8-t8-control-final-parity-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.result, "PASS", "Control and final surfaces must keep canonical play-area set/count/selection parity");
console.log(JSON.stringify(output, null, 2));
