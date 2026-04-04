import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const BOARD_ID = "nemesis-lockdown-a";
const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const LANES = ["firefox", "mobile-chrome"];

function runLane(browserLane) {
  const state = {
    playAreasByBoard: {
      [BOARD_ID]: [{ id: "play-area-1", name: "Play Area 1", polygon: SHIP_FALLBACK }],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "play-area-1",
    },
  };

  const runtime = {
    selectedBoard: BOARD_ID,
    playAreasByBoard: {
      [BOARD_ID]: [
        {
          id: "lockdown-fallback-id",
          name: "Lockdown Fallback",
          polygon: [[0.18, 0.2], [0.21, 0.22]],
        },
        {
          id: "lockdown-canonical-a",
          name: "Lockdown Canonical A",
          polygon: [{ x: 0.07, y: 0.08 }, { x: 0.94, y: 0.09 }, { x: 0.9, y: 0.95 }, { x: 0.08, y: 0.92 }],
        },
        {
          id: "lockdown-canonical-b",
          name: "Lockdown Canonical B",
          polygon: [{ x: 0.11, y: 0.12 }, { x: 0.86, y: 0.12 }, { x: 0.84, y: 0.88 }, { x: 0.13, y: 0.88 }],
        },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "lockdown-fallback-id",
    },
    diagnosticBrowser: browserLane,
  };

  const applied = applySnapshotPolygonState({
    state,
    snapshot: { runtime },
    runtime,
    boardIds: [BOARD_ID],
    shipPolygonDefault: SHIP_FALLBACK,
  });

  const selectedPlayAreaId = applied.selectedPlayAreaIdByBoard?.[BOARD_ID] ?? null;
  const selectedArea = (applied.playAreasByBoard?.[BOARD_ID] ?? []).find((entry) => entry.id === selectedPlayAreaId) ?? null;
  const selectedPolygon = Array.isArray(selectedArea?.polygon) ? selectedArea.polygon : [];
  const fellBackToDefaultHex = JSON.stringify(selectedPolygon) === JSON.stringify(SHIP_FALLBACK);
  return {
    browserLane,
    selectedPlayAreaId,
    selectedPolygonVertexCount: selectedPolygon.length,
    fellBackToDefaultHex,
    expectedSelectedPlayAreaId: "lockdown-canonical-a",
  };
}

const lanes = LANES.map((browserLane) => runLane(browserLane));
const pass = lanes.every((entry) => entry.selectedPlayAreaId === "lockdown-canonical-a" && !entry.fellBackToDefaultHex);

const output = {
  suite: "p10-hf5-t2-lockdown-fallback-repro",
  boardId: BOARD_ID,
  lanes,
  result: pass ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf5-t2-lockdown-fallback-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(pass, true, "Lockdown A must not display default fallback hex when valid canonical multi-area payload exists");

console.log(JSON.stringify(output, null, 2));
