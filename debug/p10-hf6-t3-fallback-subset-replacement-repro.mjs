import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const BOARD_ID = "nemesis-lockdown-a";
const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];

function runLane(browser) {
  const state = {
    playAreasByBoard: {
      [BOARD_ID]: [
        {
          id: "play-area-1",
          name: "Play Area 1",
          polygon: SHIP_FALLBACK,
        },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "play-area-1",
    },
  };

  const runtime = {
    selectedBoard: BOARD_ID,
    diagnosticBrowser: browser,
    boardProfiles: {
      [BOARD_ID]: {
        playAreas: [
          {
            id: "play-area-1",
            name: "Play Area 1",
            polygon: [[0.08, 0.08], [0.91, 0.08], [0.91, 0.91], [0.08, 0.91]],
          },
          {
            id: "bunker",
            name: "Bunker",
            polygon: [[0.21, 0.22], [0.81, 0.22], [0.81, 0.78], [0.21, 0.78]],
          },
        ],
        selectedPlayAreaId: "bunker",
      },
    },
    playAreasByBoard: {
      [BOARD_ID]: [
        {
          id: "play-area-1",
          name: "Play Area 1",
          polygon: SHIP_FALLBACK,
        },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "play-area-1",
    },
  };

  const applied = applySnapshotPolygonState({
    state,
    snapshot: { runtime },
    runtime,
    boardIds: [BOARD_ID],
    shipPolygonDefault: SHIP_FALLBACK,
  });

  const merged = applied.playAreasByBoard?.[BOARD_ID] ?? [];
  const mergedIds = merged.map((entry) => entry.id).sort();
  const selected = applied.selectedPlayAreaIdByBoard?.[BOARD_ID] ?? null;
  const selectedArea = merged.find((entry) => entry.id === selected) ?? null;
  const selectedPolygon = Array.isArray(selectedArea?.polygon) ? selectedArea.polygon : [];

  return {
    browser,
    mergedAreaCount: merged.length,
    mergedAreaIdSet: mergedIds,
    selectedPlayAreaId: selected,
    selectedIsDefaultFallbackHex: JSON.stringify(selectedPolygon) === JSON.stringify(SHIP_FALLBACK),
  };
}

const lanes = ["chrome", "firefox", "mobile-chrome"].map((browser) => runLane(browser));
const pass = lanes.every((lane) => lane.mergedAreaCount === 2
  && JSON.stringify(lane.mergedAreaIdSet) === JSON.stringify(["bunker", "play-area-1"])
  && lane.selectedPlayAreaId === "bunker"
  && !lane.selectedIsDefaultFallbackHex);

const output = {
  suite: "p10-hf6-t3-fallback-subset-replacement-repro",
  boardId: BOARD_ID,
  lanes,
  result: pass ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf6-t3-fallback-subset-replacement-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(pass, true, "Fallback/default subset payload must not replace valid canonical multi-area state");
console.log(JSON.stringify(output, null, 2));
