import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const BOARD_MULTI = "nemesis-lockdown-a";
const BOARD_SINGLE = "nemesis-board-a";
const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];

function runLifecycleCase({ lifecycle, boardId, state, runtime }) {
  const applied = applySnapshotPolygonState({
    state,
    snapshot: { runtime },
    runtime,
    boardIds: [boardId],
    shipPolygonDefault: SHIP_FALLBACK,
  });
  const selectedId = applied.selectedPlayAreaIdByBoard?.[boardId] ?? null;
  const selectedArea = (applied.playAreasByBoard?.[boardId] ?? []).find((entry) => entry.id === selectedId) ?? null;
  const selectedPolygon = Array.isArray(selectedArea?.polygon) ? selectedArea.polygon : [];
  const fellBackToDefaultHex = JSON.stringify(selectedPolygon) === JSON.stringify(SHIP_FALLBACK);
  return {
    lifecycle,
    boardId,
    selectedPlayAreaId: selectedId,
    selectedPolygonVertexCount: selectedPolygon.length,
    fellBackToDefaultHex,
  };
}

const lifecyclePhases = ["startup", "reload", "apply-defaults"];

const singleBoardState = {
  playAreasByBoard: {
    [BOARD_SINGLE]: [{ id: "single-a", polygon: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]] }],
  },
  selectedPlayAreaIdByBoard: { [BOARD_SINGLE]: "single-a" },
};

const singleBoardRuntime = {
  selectedBoard: BOARD_SINGLE,
  playAreasByBoard: {
    [BOARD_SINGLE]: [{ id: "single-a", polygon: [[0.12, 0.12], [0.88, 0.12], [0.88, 0.88], [0.12, 0.88]] }],
  },
  selectedPlayAreaIdByBoard: { [BOARD_SINGLE]: "single-a" },
};

const multiBoardState = {
  playAreasByBoard: {
    [BOARD_MULTI]: [{ id: "play-area-1", polygon: SHIP_FALLBACK }],
  },
  selectedPlayAreaIdByBoard: { [BOARD_MULTI]: "play-area-1" },
};

const multiBoardRuntime = {
  selectedBoard: BOARD_MULTI,
  playAreasByBoard: {
    [BOARD_MULTI]: [
      { id: "invalid-alpha", polygon: [[0.21, 0.2], [0.22, 0.21]] },
      { id: "valid-beta", polygon: [[0.06, 0.08], [0.94, 0.1], [0.92, 0.94], [0.08, 0.91]] },
    ],
  },
  selectedPlayAreaIdByBoard: { [BOARD_MULTI]: "invalid-alpha" },
};

const singleLane = lifecyclePhases.map((lifecycle) => runLifecycleCase({
  lifecycle,
  boardId: BOARD_SINGLE,
  state: singleBoardState,
  runtime: singleBoardRuntime,
}));

const multiLane = lifecyclePhases.map((lifecycle) => runLifecycleCase({
  lifecycle,
  boardId: BOARD_MULTI,
  state: multiBoardState,
  runtime: multiBoardRuntime,
}));

const singlePass = singleLane.every((entry) => entry.selectedPlayAreaId === "single-a" && !entry.fellBackToDefaultHex);
const multiPass = multiLane.every((entry) => entry.selectedPlayAreaId === "valid-beta" && !entry.fellBackToDefaultHex);

const output = {
  suite: "p10-hf5-t1-multi-vs-single-repro",
  singleBoard: singleLane,
  multiBoard: multiLane,
  expected: {
    singleBoardSelected: "single-a",
    multiBoardSelected: "valid-beta",
    noDefaultHexFallbackWhenValidExists: true,
  },
  result: singlePass && multiPass ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf5-t1-multi-vs-single-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(singlePass, true, "Single-area canonical path must remain stable across startup/reload/default-apply");
assert.equal(multiPass, true, "Multi-area canonical path must not select invalid/default fallback when valid areas exist");

console.log(JSON.stringify(output, null, 2));
