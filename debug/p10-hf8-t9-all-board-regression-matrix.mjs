import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const fallback = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const lifecycle = ["startup", "reload", "apply-defaults", "board-switch"];
const surfaces = ["control", "output/final"];
const browsers = ["chrome", "firefox", "mobile-chrome"];

const scenarios = [
  {
    boardId: "nemesis-board-a",
    kind: "single-area",
    expectedSelected: "single-a",
    expectedAreaIds: ["single-a"],
    profile: {
      playAreas: [{ id: "single-a", polygon: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]] }],
      selectedPlayAreaId: "single-a",
    },
  },
  {
    boardId: "nemesis-lockdown-a",
    kind: "multi-area",
    expectedSelected: "bunker",
    expectedAreaIds: ["bunker", "play-area-1"],
    profile: {
      playAreas: [
        { id: "play-area-1", polygon: [[0.08, 0.08], [0.94, 0.08], [0.94, 0.94], [0.08, 0.94]] },
        { id: "bunker", polygon: [[0.22, 0.2], [0.8, 0.2], [0.8, 0.78], [0.22, 0.78]] },
      ],
      selectedPlayAreaId: "bunker",
    },
  },
  {
    boardId: "imported-lockdown-multi",
    kind: "imported-multi-area",
    expectedSelected: "cargo",
    expectedAreaIds: ["cargo", "play-area-1"],
    profile: {
      playAreas: [
        { id: "play-area-1", polygon: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.95], [0.05, 0.95]] },
        { id: "cargo", polygon: [[0.2, 0.2], [0.82, 0.2], [0.82, 0.82], [0.2, 0.82]] },
      ],
      selectedPlayAreaId: "cargo",
    },
  },
];

function runProbe(scenario, browser, surface, lifecycleStep) {
  const applied = applySnapshotPolygonState({
    state: {
      playAreasByBoard: {
        [scenario.boardId]: [{ id: "play-area-1", polygon: fallback }],
      },
      selectedPlayAreaIdByBoard: {
        [scenario.boardId]: "play-area-1",
      },
    },
    snapshot: {
      runtime: {
        boardProfiles: {
          [scenario.boardId]: scenario.profile,
        },
      },
      browser,
      surface,
      lifecycle: lifecycleStep,
    },
    runtime: {
      boardProfiles: {
        [scenario.boardId]: scenario.profile,
      },
      browser,
      surface,
      lifecycle: lifecycleStep,
    },
    boardIds: [scenario.boardId],
    shipPolygonDefault: fallback,
  });

  const areas = applied.playAreasByBoard?.[scenario.boardId] ?? [];
  const areaIds = areas.map((entry) => entry.id).sort();
  const selected = applied.selectedPlayAreaIdByBoard?.[scenario.boardId] ?? null;
  const issues = Array.isArray(applied.issues) ? applied.issues : [];
  return {
    boardId: scenario.boardId,
    kind: scenario.kind,
    browser,
    surface,
    lifecycle: lifecycleStep,
    areaCount: areas.length,
    areaIds,
    selected,
    issueCount: issues.length,
    pass:
      selected === scenario.expectedSelected
      && JSON.stringify(areaIds) === JSON.stringify([...scenario.expectedAreaIds].sort())
      && issues.length === 0,
  };
}

const matrix = [];
for (const scenario of scenarios) {
  for (const browser of browsers) {
    for (const surface of surfaces) {
      for (const lifecycleStep of lifecycle) {
        matrix.push(runProbe(scenario, browser, surface, lifecycleStep));
      }
    }
  }
}

const output = {
  suite: "p10-hf8-t9-all-board-regression-matrix",
  lifecycle,
  surfaces,
  browsers,
  scenarios: scenarios.map((entry) => ({
    boardId: entry.boardId,
    kind: entry.kind,
    expectedSelected: entry.expectedSelected,
    expectedAreaIds: entry.expectedAreaIds,
  })),
  matrix,
  result: matrix.every((entry) => entry.pass) ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf8-t9-all-board-regression-matrix-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.result, "PASS", "All-board browser/surface/lifecycle matrix must pass for canonical recovery paths");
console.log(JSON.stringify(output, null, 2));
