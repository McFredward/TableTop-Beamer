import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const BOARD_ID = "nemesis-lockdown-a";
const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const EXPECTED_COUNT = 2;

function runtimeFor(browser) {
  const base = {
    selectedBoard: BOARD_ID,
    diagnosticBrowser: browser,
    boardProfiles: {
      [BOARD_ID]: {
        playAreas: [
          { id: "play-area-1", polygon: [[0.08, 0.08], [0.91, 0.08], [0.91, 0.91], [0.08, 0.91]] },
          { id: "bunker", polygon: [[0.21, 0.22], [0.81, 0.22], [0.81, 0.78], [0.21, 0.78]] },
        ],
      },
    },
  };
  if (browser === "chrome") return base;
  return {
    ...base,
    playAreasByBoard: {
      [BOARD_ID]: [
        { id: "play-area-1", polygon: [[0.08, 0.08], [0.91, 0.08], [0.91, 0.91], [0.08, 0.91]] },
      ],
    },
  };
}

function probe(browser) {
  const applied = applySnapshotPolygonState({
    state: {
      playAreasByBoard: { [BOARD_ID]: [{ id: "play-area-1", polygon: SHIP_FALLBACK }] },
      selectedPlayAreaIdByBoard: { [BOARD_ID]: "play-area-1" },
    },
    snapshot: { runtime: runtimeFor(browser) },
    runtime: runtimeFor(browser),
    boardIds: [BOARD_ID],
    shipPolygonDefault: SHIP_FALLBACK,
  });
  return {
    browser,
    areaCount: (applied.playAreasByBoard?.[BOARD_ID] ?? []).length,
  };
}

const lanes = ["chrome", "firefox", "mobile-chrome"].map((browser) => probe(browser));
const pass = lanes.every((lane) => lane.areaCount === EXPECTED_COUNT);

const output = {
  suite: "p10-hf6-t4-area-count-parity",
  boardId: BOARD_ID,
  expectedAreaCount: EXPECTED_COUNT,
  lanes,
  result: pass ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf6-t4-area-count-parity-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(pass, true, "Area-count parity must match across Chrome/Firefox/mobile-class and retain all canonical areas");
console.log(JSON.stringify(output, null, 2));
