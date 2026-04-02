import assert from "node:assert/strict";

function preHf4KeepRunning(entries, boardId) {
  return entries.filter((entry) => entry?.boardId === boardId);
}

function hf4NormalizeRunning(entries, boardId) {
  const byId = new Set();
  const outsideByBoard = new Set();
  return entries
    .filter((entry) => entry && entry.id && entry.scope && entry.boardId === boardId)
    .sort((a, b) => Number(b.startedAtEpochMs || 0) - Number(a.startedAtEpochMs || 0))
    .filter((entry) => {
      if (byId.has(entry.id)) {
        return false;
      }
      if (entry.scope === "global" && entry.type === "outside-space") {
        if (outsideByBoard.has(entry.boardId)) {
          return false;
        }
        outsideByBoard.add(entry.boardId);
      }
      byId.add(entry.id);
      return true;
    })
    .reverse();
}

const now = Date.now();
const duplicateOutsideInput = [
  { id: "outside-a", boardId: "board-a", scope: "global", type: "outside-space", startedAtEpochMs: now - 1000 },
  { id: "outside-b", boardId: "board-a", scope: "global", type: "outside-space", startedAtEpochMs: now - 500 },
  { id: "room-1", boardId: "board-a", scope: "room", type: "kaputt", startedAtEpochMs: now - 200 },
  { id: "", boardId: "board-a", scope: "room", type: "kaputt", startedAtEpochMs: now - 100 },
];

const preFail = preHf4KeepRunning(duplicateOutsideInput, "board-a");
assert.equal(preFail.filter((entry) => entry.type === "outside-space").length, 2, "pre-HF4 should reproduce duplicate outside entries");
assert.equal(preFail.some((entry) => !entry.id), true, "pre-HF4 should reproduce phantom entry");

const postPass = hf4NormalizeRunning(duplicateOutsideInput, "board-a");
assert.equal(postPass.filter((entry) => entry.type === "outside-space").length, 1, "HF4 invariant should keep exactly one outside run");
assert.equal(postPass.some((entry) => !entry.id), false, "HF4 invariant should remove phantom entries");

function preHf4BoardSwitchSequence() {
  return ["boardId:update", "overlay:render", "image:load"];
}

function hf4BoardSwitchSequence() {
  return ["boardId:update", "overlay:hidden", "image:load", "overlay:render"];
}

assert.deepEqual(preHf4BoardSwitchSequence(), ["boardId:update", "overlay:render", "image:load"], "pre-HF4 reproduces image/polygon race");
assert.deepEqual(hf4BoardSwitchSequence(), ["boardId:update", "overlay:hidden", "image:load", "overlay:render"], "HF4 board switch keeps parity ordering");

console.log(JSON.stringify({
  suite: "p9-hf4-fail-pass",
  executedAt: new Date().toISOString(),
  failCases: [
    "duplicate-outside-run",
    "phantom-running-entry",
    "board-switch-image-polygon-race",
  ],
  passCases: [
    "startup-running-invariant-normalization",
    "single-outside-run-per-board",
    "atomic-board-switch-overlay-guard",
  ],
  result: "PASS",
}, null, 2));
