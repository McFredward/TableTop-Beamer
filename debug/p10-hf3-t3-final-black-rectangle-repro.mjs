import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const {
  applySnapshotPolygonState,
  getNormalizedPolygonArea,
} = require("../src/app/runtime/polygon-contract.js");

const BOARD_ID = "nemesis-lockdown-a";

function resolveFinalClipStatus(polygon) {
  const area = getNormalizedPolygonArea(Array.isArray(polygon) ? polygon : []);
  if (area < 0.00003) {
    return "fallback-rectangle";
  }
  return "canonical-polygon";
}

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

const finalRuntimeSnapshot = {
  runtime: {
    selectedBoard: BOARD_ID,
    playAreasByBoard: {
      [BOARD_ID]: [
        {
          id: "valid-render-area",
          name: "Valid Render Area",
          polygon: [[0.1, 0.08], [0.92, 0.08], [0.9, 0.92], [0.1, 0.9]],
        },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "valid-render-area",
    },
  },
};

const applied = applySnapshotPolygonState({
  state: preState,
  snapshot: finalRuntimeSnapshot,
  runtime: finalRuntimeSnapshot.runtime,
  boardIds: [BOARD_ID],
  shipPolygonDefault: [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]],
});

const selectedId = applied.selectedPlayAreaIdByBoard?.[BOARD_ID];
const selectedPolygon = (applied.playAreasByBoard?.[BOARD_ID] ?? [])
  .find((entry) => entry.id === selectedId)?.polygon;
const clipStatus = resolveFinalClipStatus(selectedPolygon);

const output = {
  suite: "p10-hf3-t3-final-black-rectangle-repro",
  boardId: BOARD_ID,
  expectedClipStatus: "canonical-polygon",
  actualClipStatus: clipStatus,
  expectedSelectedPlayAreaId: "valid-render-area",
  actualSelectedPlayAreaId: selectedId ?? null,
  result: clipStatus === "canonical-polygon" && selectedId === "valid-render-area" ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf3-t3-final-black-rectangle-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(selectedId, "valid-render-area", "Final output must hydrate selected canonical play area from runtime snapshot");
assert.equal(clipStatus, "canonical-polygon", "Final output clip path must use valid canonical polygons, not fallback rectangle");

console.log(JSON.stringify(output, null, 2));
