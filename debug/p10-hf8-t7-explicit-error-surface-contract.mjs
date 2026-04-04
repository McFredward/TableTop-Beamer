import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const fallback = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];

function runScenario({ boardId, profile }) {
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
    },
    runtime: {
      boardProfiles: {
        [boardId]: profile,
      },
    },
    boardIds: [boardId],
    shipPolygonDefault: fallback,
  });
}

const invalidBoard = "nemesis-lockdown-a";
const validBoard = "nemesis-board-a";

const invalidResult = runScenario({
  boardId: invalidBoard,
  profile: {
    playAreas: [{ id: "bunker", polygon: [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5]] }],
    selectedPlayAreaId: "bunker",
  },
});

const validResult = runScenario({
  boardId: validBoard,
  profile: {
    playAreas: [{ id: "single-a", polygon: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]] }],
    selectedPlayAreaId: "single-a",
  },
});

const invalidIssues = Array.isArray(invalidResult.issues) ? invalidResult.issues : [];
const validIssues = Array.isArray(validResult.issues) ? validResult.issues : [];

const output = {
  suite: "p10-hf8-t7-explicit-error-surface-contract",
  invalidScenario: {
    boardId: invalidBoard,
    selected: invalidResult.selectedPlayAreaIdByBoard?.[invalidBoard] ?? null,
    issues: invalidIssues,
  },
  validScenario: {
    boardId: validBoard,
    selected: validResult.selectedPlayAreaIdByBoard?.[validBoard] ?? null,
    issues: validIssues,
  },
  result:
    invalidIssues.length > 0
    && validIssues.length === 0
    && validResult.selectedPlayAreaIdByBoard?.[validBoard] === "single-a"
      ? "PASS"
      : "FAIL",
};

writeFileSync(new URL("./p10-hf8-t7-explicit-error-surface-contract-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.result, "PASS", "Canonical load/apply failures must expose explicit issues; valid canonical paths must stay clean");
console.log(JSON.stringify(output, null, 2));
