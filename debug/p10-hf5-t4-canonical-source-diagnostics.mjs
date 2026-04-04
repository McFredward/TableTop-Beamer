import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState, extractRenderablePlayAreaPolygons } = require("../src/app/runtime/polygon-contract.js");

const BOARD_ID = "nemesis-lockdown-a";
const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];

function createSnapshotRuntime() {
  return {
    selectedBoard: BOARD_ID,
    playAreasByBoard: {
      [BOARD_ID]: [
        { id: "invalid-alpha", polygon: [[0.22, 0.22], [0.24, 0.24]] },
        { id: "valid-beta", polygon: [[0.08, 0.08], [0.93, 0.1], [0.92, 0.93], [0.1, 0.9]] },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "invalid-alpha",
    },
  };
}

function evaluateSurface(surface) {
  const runtime = createSnapshotRuntime();
  const state = {
    playAreasByBoard: {
      [BOARD_ID]: [{ id: "play-area-1", polygon: SHIP_FALLBACK }],
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

  const selectedPlayAreaId = applied.selectedPlayAreaIdByBoard?.[BOARD_ID] ?? null;
  const selectedArea = (applied.playAreasByBoard?.[BOARD_ID] ?? []).find((entry) => entry.id === selectedPlayAreaId) ?? null;
  const selectedPolygon = Array.isArray(selectedArea?.polygon) ? selectedArea.polygon : [];
  const selectedFallsBack = JSON.stringify(selectedPolygon) === JSON.stringify(SHIP_FALLBACK);

  const renderablePolygons = extractRenderablePlayAreaPolygons(applied.playAreasByBoard?.[BOARD_ID] ?? [], {
    fallbackPolygon: SHIP_FALLBACK,
    allowDefaultFallbackWhenEmpty: true,
  });

  return {
    surface,
    selectedPlayAreaId,
    selectedFallsBack,
    renderablePolygonCount: renderablePolygons.length,
    fallbackDecision: selectedFallsBack ? "default-fallback-selected" : "canonical-selected",
  };
}

const control = evaluateSurface("control");
const finalOutput = evaluateSurface("output/final");

const expectedCanonical = "valid-beta";
const pass = [control, finalOutput].every((entry) => entry.selectedPlayAreaId === expectedCanonical && !entry.selectedFallsBack);

const output = {
  suite: "p10-hf5-t4-canonical-source-diagnostics",
  boardId: BOARD_ID,
  expectedCanonical,
  control,
  finalOutput,
  sourceParity: control.selectedPlayAreaId === finalOutput.selectedPlayAreaId,
  result: pass ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf5-t4-canonical-source-diagnostics-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(control.selectedPlayAreaId, expectedCanonical, "Control surface must resolve canonical play-area source instead of fallback-selected invalid area");
assert.equal(finalOutput.selectedPlayAreaId, expectedCanonical, "Final surface must resolve same canonical play-area source as control");
assert.equal(control.selectedFallsBack, false, "Control surface must not apply default fallback hex when valid canonical area exists");
assert.equal(finalOutput.selectedFallsBack, false, "Final surface must not apply default fallback hex when valid canonical area exists");

console.log(JSON.stringify(output, null, 2));
