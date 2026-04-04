import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const BOARD_ID = "nemesis-lockdown-a";
const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const EXPECTED_IDS = ["play-area-1", "bunker"];

function createRuntimeForBrowser(browser) {
  const shared = {
    selectedBoard: BOARD_ID,
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "bunker",
    },
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
  };

  if (browser === "chrome") {
    return {
      ...shared,
      diagnosticBrowser: browser,
    };
  }

  return {
    ...shared,
    diagnosticBrowser: browser,
    playAreasByBoard: {
      [BOARD_ID]: [
        {
          id: "play-area-1",
          name: "Play Area 1",
          polygon: [[0.08, 0.08], [0.91, 0.08], [0.91, 0.91], [0.08, 0.91]],
        },
      ],
    },
  };
}

function runLane(browser) {
  const runtime = createRuntimeForBrowser(browser);
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

  const applied = applySnapshotPolygonState({
    state,
    snapshot: { runtime },
    runtime,
    boardIds: [BOARD_ID],
    shipPolygonDefault: SHIP_FALLBACK,
  });

  const areas = applied.playAreasByBoard?.[BOARD_ID] ?? [];
  const areaIds = areas.map((entry) => entry.id);

  return {
    browser,
    areaCount: areas.length,
    areaIdSet: [...areaIds].sort(),
    selectedPlayAreaId: applied.selectedPlayAreaIdByBoard?.[BOARD_ID] ?? null,
  };
}

const lanes = ["chrome", "firefox", "mobile-chrome"].map((browser) => runLane(browser));
const expectedSet = [...EXPECTED_IDS].sort();
const pass = lanes.every((lane) => lane.areaCount === expectedSet.length
  && JSON.stringify(lane.areaIdSet) === JSON.stringify(expectedSet)
  && lane.selectedPlayAreaId === "bunker");

const output = {
  suite: "p10-hf6-t1-lockdown-a-area-drop-repro",
  boardId: BOARD_ID,
  expected: {
    areaCount: expectedSet.length,
    areaIdSet: expectedSet,
    selectedPlayAreaId: "bunker",
  },
  lanes,
  result: pass ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf6-t1-lockdown-a-area-drop-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(pass, true, "Lockdown A must retain both canonical play-areas (Play Area 1 + Bunker) across Chrome/Firefox/mobile-class lanes");
console.log(JSON.stringify(output, null, 2));
