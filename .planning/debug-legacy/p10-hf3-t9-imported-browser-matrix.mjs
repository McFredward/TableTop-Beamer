import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const {
  applySnapshotPolygonState,
  getNormalizedPolygonArea,
} = require("../src/app/runtime/core/polygon-contract.js");

const importedBoard = JSON.parse(readFileSync(new URL("../config/boards/imported/nemesis-lockdown-a.json", import.meta.url), "utf8"));
const importedBoardId = importedBoard?.board?.boardId;
assert.equal(importedBoardId, "nemesis-lockdown-a", "Imported board fixture must resolve nemesis-lockdown-a");

const browserMatrix = [
  { id: "chrome-desktop", family: "chromium", mobileClass: false },
  { id: "firefox-desktop", family: "firefox", mobileClass: false },
  { id: "chrome-mobile-class", family: "chromium", mobileClass: true },
  { id: "firefox-mobile-class", family: "firefox", mobileClass: true },
];

const boardIds = ["nemesis", importedBoardId];
const fallback = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];

function createSnapshotForBoard(boardId) {
  const selectedPlayAreaId = `${boardId}-canonical`;
  return {
    runtime: {
      selectedBoard: boardId,
      playAreasByBoard: {
        [boardId]: [
          {
            id: selectedPlayAreaId,
            name: `${boardId} Canonical`,
            polygon: [[0.1, 0.1], [0.9, 0.1], [0.88, 0.9], [0.1, 0.88]],
          },
        ],
      },
      selectedPlayAreaIdByBoard: {
        [boardId]: selectedPlayAreaId,
      },
    },
  };
}

const matrixResults = [];
for (const browser of browserMatrix) {
  for (const boardId of boardIds) {
    const initialState = {
      playAreasByBoard: {
        [boardId]: [{ id: "play-area-1", name: "Play Area 1", polygon: fallback }],
      },
      selectedPlayAreaIdByBoard: {
        [boardId]: "play-area-1",
      },
    };
    const snapshot = createSnapshotForBoard(boardId);
    const applied = applySnapshotPolygonState({
      state: initialState,
      snapshot,
      runtime: snapshot.runtime,
      boardIds,
      shipPolygonDefault: fallback,
    });
    const expectedId = `${boardId}-canonical`;
    const actualId = applied.selectedPlayAreaIdByBoard?.[boardId] ?? null;
    const polygon = (applied.playAreasByBoard?.[boardId] ?? []).find((entry) => entry.id === actualId)?.polygon ?? [];
    const area = getNormalizedPolygonArea(polygon);
    const passed = actualId === expectedId && area >= 0.00003;
    matrixResults.push({
      browser: browser.id,
      boardId,
      expectedId,
      actualId,
      area,
      result: passed ? "PASS" : "FAIL",
    });
  }
}

const failed = matrixResults.filter((entry) => entry.result !== "PASS");
assert.equal(failed.length, 0, `Imported-board/browser matrix failed entries: ${failed.map((entry) => `${entry.browser}:${entry.boardId}`).join(", ")}`);

const output = {
  suite: "p10-hf3-t9-imported-browser-matrix",
  importedBoardId,
  matrixSize: matrixResults.length,
  result: "PASS",
  matrix: matrixResults,
};

writeFileSync(new URL("./p10-hf3-t9-imported-browser-matrix-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
