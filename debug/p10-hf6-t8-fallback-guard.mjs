import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const BOARD_ID = "nemesis-lockdown-a";
const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];

function runScenario(name, runtimePlayAreas) {
  const runtime = {
    selectedBoard: BOARD_ID,
    scenario: name,
    boardProfiles: {
      [BOARD_ID]: {
        playAreas: [
          { id: "play-area-1", polygon: [[0.08, 0.08], [0.91, 0.08], [0.91, 0.91], [0.08, 0.91]] },
          { id: "bunker", polygon: [[0.21, 0.22], [0.81, 0.22], [0.81, 0.78], [0.21, 0.78]] },
        ],
        selectedPlayAreaId: "bunker",
      },
    },
    playAreasByBoard: {
      [BOARD_ID]: runtimePlayAreas,
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "play-area-1",
    },
  };

  const applied = applySnapshotPolygonState({
    state: {
      playAreasByBoard: {
        [BOARD_ID]: [
          { id: "play-area-1", polygon: SHIP_FALLBACK },
        ],
      },
      selectedPlayAreaIdByBoard: {
        [BOARD_ID]: "play-area-1",
      },
    },
    snapshot: { runtime },
    runtime,
    boardIds: [BOARD_ID],
    shipPolygonDefault: SHIP_FALLBACK,
  });

  const merged = applied.playAreasByBoard?.[BOARD_ID] ?? [];
  const selectedPlayAreaId = applied.selectedPlayAreaIdByBoard?.[BOARD_ID] ?? null;
  const selected = merged.find((entry) => entry.id === selectedPlayAreaId) ?? null;
  const selectedPolygon = Array.isArray(selected?.polygon) ? selected.polygon : [];

  return {
    scenario: name,
    mergedAreaCount: merged.length,
    mergedAreaIdSet: merged.map((entry) => entry.id).sort(),
    selectedPlayAreaId,
    selectedIsDefaultFallbackHex: JSON.stringify(selectedPolygon) === JSON.stringify(SHIP_FALLBACK),
  };
}

const scenarios = [
  runScenario("subset-default-only", [
    { id: "play-area-1", polygon: SHIP_FALLBACK },
  ]),
  runScenario("subset-invalid-only", [
    { id: "play-area-1", polygon: [[0.1, 0.1], [0.2, 0.2]] },
  ]),
  runScenario("empty-array", []),
];

const pass = scenarios.every((entry) => entry.mergedAreaCount === 2
  && JSON.stringify(entry.mergedAreaIdSet) === JSON.stringify(["bunker", "play-area-1"])
  && entry.selectedPlayAreaId === "bunker"
  && entry.selectedIsDefaultFallbackHex === false);

const output = {
  suite: "p10-hf6-t8-fallback-guard",
  boardId: BOARD_ID,
  scenarios,
  result: pass ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf6-t8-fallback-guard-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(pass, true, "Fallback/default must only fill missing-or-invalid data and must never replace valid canonical subset data");
console.log(JSON.stringify(output, null, 2));
