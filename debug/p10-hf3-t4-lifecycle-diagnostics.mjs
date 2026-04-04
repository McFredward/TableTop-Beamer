import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const BOARD_ID = "nemesis-lockdown-a";
const FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];

function createState(playAreaId = "play-area-1") {
  return {
    playAreasByBoard: {
      [BOARD_ID]: [
        {
          id: playAreaId,
          name: playAreaId,
          polygon: FALLBACK,
        },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: playAreaId,
    },
  };
}

function createSnapshot(selectedPlayAreaId, polygon) {
  return {
    runtime: {
      selectedBoard: BOARD_ID,
      playAreasByBoard: {
        [BOARD_ID]: [
          {
            id: selectedPlayAreaId,
            name: selectedPlayAreaId,
            polygon,
          },
        ],
      },
      selectedPlayAreaIdByBoard: {
        [BOARD_ID]: selectedPlayAreaId,
      },
    },
  };
}

const lifecycle = [
  {
    step: "startup-load",
    selectedId: "startup-area",
    polygon: [[0.08, 0.08], [0.9, 0.1], [0.88, 0.9], [0.1, 0.88]],
  },
  {
    step: "apply-defaults",
    selectedId: "persisted-area-after-defaults",
    polygon: [[0.12, 0.09], [0.92, 0.11], [0.9, 0.9], [0.12, 0.9]],
  },
  {
    step: "reload",
    selectedId: "persisted-area-after-defaults",
    polygon: [[0.12, 0.09], [0.92, 0.11], [0.9, 0.9], [0.12, 0.9]],
  },
];

let workingState = createState();
const results = [];
for (const phase of lifecycle) {
  const snapshot = createSnapshot(phase.selectedId, phase.polygon);
  const applied = applySnapshotPolygonState({
    state: workingState,
    snapshot,
    runtime: snapshot.runtime,
    boardIds: [BOARD_ID],
    shipPolygonDefault: FALLBACK,
  });
  const actualSelectedId = applied.selectedPlayAreaIdByBoard?.[BOARD_ID] ?? null;
  results.push({
    step: phase.step,
    expectedSelectedId: phase.selectedId,
    actualSelectedId,
    appliedFromSnapshot: Boolean(applied.appliedFromSnapshot),
    pass: actualSelectedId === phase.selectedId,
  });
  workingState = {
    playAreasByBoard: applied.playAreasByBoard,
    selectedPlayAreaIdByBoard: applied.selectedPlayAreaIdByBoard,
  };
}

const failed = results.filter((entry) => !entry.pass);
const output = {
  suite: "p10-hf3-t4-lifecycle-diagnostics",
  boardId: BOARD_ID,
  result: failed.length === 0 ? "PASS" : "FAIL",
  steps: results,
};

writeFileSync(new URL("./p10-hf3-t4-lifecycle-diagnostics-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(failed.length, 0, `Lifecycle ownership/apply order drift detected in steps: ${failed.map((entry) => entry.step).join(", ")}`);

console.log(JSON.stringify(output, null, 2));
