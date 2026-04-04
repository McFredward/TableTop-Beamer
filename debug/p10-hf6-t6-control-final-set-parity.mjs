import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const BOARD_ID = "nemesis-lockdown-a";
const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const EXPECTED_SET = ["bunker", "play-area-1"];

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
        selectedPlayAreaId: "bunker",
      },
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "bunker",
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

function evaluateSurface(surface, browser) {
  const runtime = runtimeFor(browser);
  const applied = applySnapshotPolygonState({
    state: {
      playAreasByBoard: { [BOARD_ID]: [{ id: "play-area-1", polygon: SHIP_FALLBACK }] },
      selectedPlayAreaIdByBoard: { [BOARD_ID]: "play-area-1" },
    },
    snapshot: { runtime, surface },
    runtime: { ...runtime, surface },
    boardIds: [BOARD_ID],
    shipPolygonDefault: SHIP_FALLBACK,
  });
  return {
    surface,
    browser,
    areaIdSet: (applied.playAreasByBoard?.[BOARD_ID] ?? []).map((entry) => entry.id).sort(),
  };
}

const lanes = ["chrome", "firefox", "mobile-chrome"].map((browser) => {
  const control = evaluateSurface("control", browser);
  const finalOutput = evaluateSurface("output/final", browser);
  return {
    browser,
    control,
    finalOutput,
    parity: JSON.stringify(control.areaIdSet) === JSON.stringify(finalOutput.areaIdSet),
  };
});

const expected = [...EXPECTED_SET].sort();
const pass = lanes.every((lane) => lane.parity
  && JSON.stringify(lane.control.areaIdSet) === JSON.stringify(expected)
  && JSON.stringify(lane.finalOutput.areaIdSet) === JSON.stringify(expected));

const output = {
  suite: "p10-hf6-t6-control-final-set-parity",
  boardId: BOARD_ID,
  expectedAreaIdSet: expected,
  lanes,
  result: pass ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf6-t6-control-final-set-parity-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(pass, true, "Control-view and /output/final must consume identical full canonical play-area sets in every browser lane");
console.log(JSON.stringify(output, null, 2));
