import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/core/polygon-contract.js");

const boardId = "nemesis-lockdown-a";
const profile = {
  playAreas: [
    { id: "play-area-1", polygon: [[0.08, 0.08], [0.94, 0.08], [0.94, 0.94], [0.08, 0.94]] },
    { id: "bunker", polygon: [[0.22, 0.2], [0.8, 0.2], [0.8, 0.78], [0.22, 0.78]] },
  ],
  selectedPlayAreaId: "bunker",
};

function project(surface) {
  return applySnapshotPolygonState({
    state: {
      playAreasByBoard: { [boardId]: [] },
      selectedPlayAreaIdByBoard: { [boardId]: "" },
    },
    snapshot: { runtime: { boardProfiles: { [boardId]: profile } }, surface },
    runtime: { boardProfiles: { [boardId]: profile }, surface },
    boardIds: [boardId],
    shipPolygonDefault: [[0.4, 0.4], [0.6, 0.4], [0.5, 0.6]],
  });
}

const control = project("control");
const final = project("output/final");
const controlIds = (control.playAreasByBoard?.[boardId] ?? []).map((entry) => entry.id).sort();
const finalIds = (final.playAreasByBoard?.[boardId] ?? []).map((entry) => entry.id).sort();

const output = {
  suite: "p10-hf9-t14-sync-render-non-regression",
  controlSelected: control.selectedPlayAreaIdByBoard?.[boardId] ?? null,
  finalSelected: final.selectedPlayAreaIdByBoard?.[boardId] ?? null,
  controlIds,
  finalIds,
  status:
    JSON.stringify(controlIds) === JSON.stringify(finalIds)
    && (control.selectedPlayAreaIdByBoard?.[boardId] ?? null) === (final.selectedPlayAreaIdByBoard?.[boardId] ?? null)
      ? "PASS"
      : "FAIL",
};

writeFileSync(new URL("./p10-hf9-t14-sync-render-non-regression-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.status, "PASS", "Control/final parity must stay deterministic after HF9 hardening");
console.log(JSON.stringify(output, null, 2));
