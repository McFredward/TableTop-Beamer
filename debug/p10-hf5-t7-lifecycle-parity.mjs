import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const BOARDS = {
  single: "nemesis-board-a",
  multi: "nemesis-lockdown-a",
};

function makeRuntime(boardId) {
  if (boardId === BOARDS.single) {
    return {
      selectedBoard: boardId,
      playAreasByBoard: {
        [boardId]: [{ id: "single-a", polygon: [[0.12, 0.12], [0.88, 0.12], [0.88, 0.88], [0.12, 0.88]] }],
      },
      selectedPlayAreaIdByBoard: {
        [boardId]: "single-a",
      },
    };
  }
  return {
    selectedBoard: boardId,
    playAreasByBoard: {
      [boardId]: [
        { id: "invalid-alpha", polygon: [[0.2, 0.2], [0.21, 0.21]] },
        { id: "valid-beta", polygon: [[0.08, 0.08], [0.93, 0.1], [0.91, 0.93], [0.1, 0.9]] },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [boardId]: "invalid-alpha",
    },
  };
}

function makeState(boardId) {
  return {
    playAreasByBoard: {
      [boardId]: [{ id: "play-area-1", polygon: SHIP_FALLBACK }],
    },
    selectedPlayAreaIdByBoard: {
      [boardId]: "play-area-1",
    },
  };
}

function runLifecycle(boardId, lifecycle) {
  const runtime = makeRuntime(boardId);
  runtime.lifecycle = lifecycle;
  const applied = applySnapshotPolygonState({
    state: makeState(boardId),
    snapshot: { runtime },
    runtime,
    boardIds: [BOARDS.single, BOARDS.multi],
    shipPolygonDefault: SHIP_FALLBACK,
  });
  const selectedPlayAreaId = applied.selectedPlayAreaIdByBoard?.[boardId] ?? null;
  return {
    lifecycle,
    boardId,
    selectedPlayAreaId,
  };
}

const phases = ["startup", "reload", "apply-defaults"];
const singleLifecycle = phases.map((phase) => runLifecycle(BOARDS.single, phase));
const multiLifecycle = phases.map((phase) => runLifecycle(BOARDS.multi, phase));

const boardSwitch = [
  runLifecycle(BOARDS.single, "board-switch:to-single"),
  runLifecycle(BOARDS.multi, "board-switch:to-multi"),
  runLifecycle(BOARDS.single, "board-switch:back-single"),
  runLifecycle(BOARDS.multi, "board-switch:back-multi"),
];

const output = {
  suite: "p10-hf5-t7-lifecycle-parity",
  singleLifecycle,
  multiLifecycle,
  boardSwitch,
  result:
    singleLifecycle.every((entry) => entry.selectedPlayAreaId === "single-a")
    && multiLifecycle.every((entry) => entry.selectedPlayAreaId === "valid-beta")
    && boardSwitch.filter((entry) => entry.boardId === BOARDS.single).every((entry) => entry.selectedPlayAreaId === "single-a")
    && boardSwitch.filter((entry) => entry.boardId === BOARDS.multi).every((entry) => entry.selectedPlayAreaId === "valid-beta")
      ? "PASS"
      : "FAIL",
};

writeFileSync(new URL("./p10-hf5-t7-lifecycle-parity-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.ok(singleLifecycle.every((entry) => entry.selectedPlayAreaId === "single-a"), "Single-area lifecycle must remain canonical-stable");
assert.ok(multiLifecycle.every((entry) => entry.selectedPlayAreaId === "valid-beta"), "Multi-area lifecycle must remain canonical-stable without fallback takeover");
assert.ok(boardSwitch.filter((entry) => entry.boardId === BOARDS.single).every((entry) => entry.selectedPlayAreaId === "single-a"), "Board-switch back to single must preserve canonical selected area");
assert.ok(boardSwitch.filter((entry) => entry.boardId === BOARDS.multi).every((entry) => entry.selectedPlayAreaId === "valid-beta"), "Board-switch back to multi must preserve canonical selected area");

console.log(JSON.stringify(output, null, 2));
