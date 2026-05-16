import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/core/polygon-contract.js");

const BOARD_ID = "nemesis-lockdown-a";
const FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const EXPECTED = "canonical-source-area";

function createClientState() {
  return {
    playAreasByBoard: {
      [BOARD_ID]: [
        {
          id: "play-area-1",
          name: "Play Area 1",
          polygon: FALLBACK,
        },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "play-area-1",
    },
  };
}

const canonicalSnapshot = {
  runtime: {
    selectedBoard: BOARD_ID,
    playAreasByBoard: {
      [BOARD_ID]: [
        {
          id: EXPECTED,
          name: "Canonical Source Area",
          polygon: [[0.09, 0.1], [0.9, 0.1], [0.89, 0.9], [0.1, 0.89]],
        },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: EXPECTED,
    },
  },
};

const controlApplied = applySnapshotPolygonState({
  state: createClientState(),
  snapshot: canonicalSnapshot,
  runtime: canonicalSnapshot.runtime,
  boardIds: [BOARD_ID],
  shipPolygonDefault: FALLBACK,
});

const finalApplied = applySnapshotPolygonState({
  state: createClientState(),
  snapshot: canonicalSnapshot,
  runtime: canonicalSnapshot.runtime,
  boardIds: [BOARD_ID],
  shipPolygonDefault: FALLBACK,
});

const controlSelected = controlApplied.selectedPlayAreaIdByBoard?.[BOARD_ID] ?? null;
const finalSelected = finalApplied.selectedPlayAreaIdByBoard?.[BOARD_ID] ?? null;

const output = {
  suite: "p10-hf3-t6-canonical-source-selection",
  boardId: BOARD_ID,
  expectedSelectedPlayAreaId: EXPECTED,
  controlSelectedPlayAreaId: controlSelected,
  finalSelectedPlayAreaId: finalSelected,
  sourceParity: controlSelected === finalSelected,
  result: controlSelected === EXPECTED && finalSelected === EXPECTED ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf3-t6-canonical-source-selection-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(controlSelected, EXPECTED, "Control path must pick canonical play-area source from snapshot/runtime payload");
assert.equal(finalSelected, EXPECTED, "Final-output path must pick same canonical play-area source as control path");

console.log(JSON.stringify(output, null, 2));
