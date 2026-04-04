import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const importedBoardDefinition = JSON.parse(readFileSync(new URL("../config/boards/imported/nemesis-lockdown-a.json", import.meta.url), "utf8"));
const importedBoardId = importedBoardDefinition?.board?.boardId ?? "nemesis-lockdown-a";

const lifecycle = ["startup", "reload", "apply-defaults", "board-switch"];
const surfaces = ["control", "output/final"];
const browsers = ["chrome", "firefox", "mobile-chrome"];

const boardScenarios = [
  {
    boardId: "nemesis-lockdown-a",
    kind: "builtin-multi-area",
    expectedAreaCount: 2,
    expectedAreaIdSet: ["bunker", "play-area-1"],
    expectedSelected: "bunker",
  },
  {
    boardId: importedBoardId,
    kind: "imported-multi-area",
    expectedAreaCount: 2,
    expectedAreaIdSet: ["bunker", "play-area-1"],
    expectedSelected: "bunker",
  },
  {
    boardId: "nemesis-board-a",
    kind: "builtin-single-area",
    expectedAreaCount: 1,
    expectedAreaIdSet: ["single-a"],
    expectedSelected: "single-a",
  },
];

function runtimeForScenario({ boardId, expectedAreaIdSet, expectedSelected, browser, lifecycleStep, surface }) {
  const isMulti = expectedAreaIdSet.length > 1;
  const canonicalPlayAreas = isMulti
    ? [
      { id: "play-area-1", polygon: [[0.08, 0.08], [0.91, 0.08], [0.91, 0.91], [0.08, 0.91]] },
      { id: "bunker", polygon: [[0.21, 0.22], [0.81, 0.22], [0.81, 0.78], [0.21, 0.78]] },
    ]
    : [{ id: "single-a", polygon: [[0.12, 0.12], [0.88, 0.12], [0.88, 0.88], [0.12, 0.88]] }];

  const runtime = {
    selectedBoard: boardId,
    diagnosticBrowser: browser,
    lifecycle: lifecycleStep,
    surface,
    boardProfiles: {
      [boardId]: {
        playAreas: canonicalPlayAreas,
        selectedPlayAreaId: expectedSelected,
      },
    },
    selectedPlayAreaIdByBoard: {
      [boardId]: expectedSelected,
    },
  };

  if (isMulti && browser !== "chrome") {
    runtime.playAreasByBoard = {
      [boardId]: [
        { id: "play-area-1", polygon: [[0.08, 0.08], [0.91, 0.08], [0.91, 0.91], [0.08, 0.91]] },
      ],
    };
    runtime.selectedPlayAreaIdByBoard = {
      [boardId]: "play-area-1",
    };
  }

  return runtime;
}

function runProbe(scenario, browser, lifecycleStep, surface) {
  const runtime = runtimeForScenario({
    ...scenario,
    browser,
    lifecycleStep,
    surface,
  });
  const state = {
    playAreasByBoard: {
      [scenario.boardId]: [{ id: "play-area-1", polygon: SHIP_FALLBACK }],
    },
    selectedPlayAreaIdByBoard: {
      [scenario.boardId]: "play-area-1",
    },
  };

  const applied = applySnapshotPolygonState({
    state,
    snapshot: { runtime, surface, lifecycle: lifecycleStep },
    runtime,
    boardIds: [scenario.boardId],
    shipPolygonDefault: SHIP_FALLBACK,
  });

  const areas = applied.playAreasByBoard?.[scenario.boardId] ?? [];
  const areaIdSet = areas.map((entry) => entry.id).sort();
  const selectedPlayAreaId = applied.selectedPlayAreaIdByBoard?.[scenario.boardId] ?? null;

  return {
    boardId: scenario.boardId,
    kind: scenario.kind,
    browser,
    lifecycle: lifecycleStep,
    surface,
    areaCount: areas.length,
    areaIdSet,
    selectedPlayAreaId,
    expectedAreaCount: scenario.expectedAreaCount,
    expectedAreaIdSet: [...scenario.expectedAreaIdSet].sort(),
    expectedSelected: scenario.expectedSelected,
    pass:
      areas.length === scenario.expectedAreaCount
      && JSON.stringify(areaIdSet) === JSON.stringify([...scenario.expectedAreaIdSet].sort())
      && selectedPlayAreaId === scenario.expectedSelected,
  };
}

const matrix = [];
for (const scenario of boardScenarios) {
  for (const browser of browsers) {
    for (const lifecycleStep of lifecycle) {
      for (const surface of surfaces) {
        matrix.push(runProbe(scenario, browser, lifecycleStep, surface));
      }
    }
  }
}

const parityByScenarioLifecycleSurface = [];
for (const scenario of boardScenarios) {
  for (const lifecycleStep of lifecycle) {
    for (const surface of surfaces) {
      const entries = matrix.filter((entry) =>
        entry.boardId === scenario.boardId
        && entry.lifecycle === lifecycleStep
        && entry.surface === surface,
      );
      const signatures = new Set(entries.map((entry) => `${entry.areaCount}:${JSON.stringify(entry.areaIdSet)}:${entry.selectedPlayAreaId}`));
      parityByScenarioLifecycleSurface.push({
        boardId: scenario.boardId,
        kind: scenario.kind,
        lifecycle: lifecycleStep,
        surface,
        parityPass: signatures.size === 1,
      });
    }
  }
}

const output = {
  suite: "p10-hf6-t9-browser-imported-multiarea-regression",
  importedBoardId,
  lifecycle,
  surfaces,
  browsers,
  matrix,
  parityByScenarioLifecycleSurface,
  result: matrix.every((entry) => entry.pass) && parityByScenarioLifecycleSurface.every((entry) => entry.parityPass) ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf6-t9-browser-imported-multiarea-regression-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(output.result, "PASS", "Browser parity + imported/multi-area regression matrix must pass for startup/reload/default-apply/board-switch and control/final surfaces");
console.log(JSON.stringify(output, null, 2));
