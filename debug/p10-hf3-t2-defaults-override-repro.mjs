import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const BOARD_ID = "nemesis";

const preState = {
  playAreasByBoard: {
    [BOARD_ID]: [
      {
        id: "play-area-1",
        name: "Play Area 1",
        polygon: [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]],
      },
    ],
  },
  selectedPlayAreaIdByBoard: {
    [BOARD_ID]: "play-area-1",
  },
};

const postDefaultsSnapshot = {
  runtime: {
    selectedBoard: BOARD_ID,
    playAreasByBoard: {
      [BOARD_ID]: [
        {
          id: "persisted-board-area",
          name: "Persisted Board Area",
          polygon: [[0.12, 0.1], [0.88, 0.1], [0.9, 0.9], [0.15, 0.88]],
        },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "persisted-board-area",
    },
  },
};

const applied = applySnapshotPolygonState({
  state: preState,
  snapshot: postDefaultsSnapshot,
  runtime: postDefaultsSnapshot.runtime,
  boardIds: [BOARD_ID],
  shipPolygonDefault: [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]],
});

const selectedId = applied.selectedPlayAreaIdByBoard?.[BOARD_ID];
const output = {
  suite: "p10-hf3-t2-defaults-override-repro",
  boardId: BOARD_ID,
  expectedSelectedPlayAreaId: "persisted-board-area",
  actualSelectedPlayAreaId: selectedId ?? null,
  appliedFromSnapshot: Boolean(applied.appliedFromSnapshot),
  result: selectedId === "persisted-board-area" ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf3-t2-defaults-override-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(
  selectedId,
  "persisted-board-area",
  "Apply-defaults flow must preserve persisted board polygon ownership instead of default fallback takeover",
);

console.log(JSON.stringify(output, null, 2));
