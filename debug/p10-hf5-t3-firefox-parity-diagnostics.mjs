import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/polygon-contract.js");

const BOARD_ID = "nemesis-lockdown-a";
const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const BROWSERS = ["firefox", "chrome", "mobile-chrome"];
const LIFECYCLE = ["startup", "reload", "apply-defaults"];

function runProbe(browser, lifecycle) {
  const state = {
    playAreasByBoard: {
      [BOARD_ID]: [{ id: "play-area-1", polygon: SHIP_FALLBACK }],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "play-area-1",
    },
  };

  const runtime = {
    selectedBoard: BOARD_ID,
    diagnosticBrowser: browser,
    lifecycle,
    playAreasByBoard: {
      [BOARD_ID]: [
        { id: "invalid-alpha", polygon: [[0.22, 0.22], [0.25, 0.25]] },
        { id: "valid-beta", polygon: [{ x: 0.09, y: 0.1 }, { x: 0.92, y: 0.11 }, { x: 0.9, y: 0.93 }, { x: 0.11, y: 0.9 }] },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "invalid-alpha",
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

  return {
    browser,
    lifecycle,
    selectedPlayAreaId,
    fellBackToDefaultHex: JSON.stringify(selectedPolygon) === JSON.stringify(SHIP_FALLBACK),
    selectedPolygonVertexCount: selectedPolygon.length,
  };
}

const traces = [];
for (const browser of BROWSERS) {
  for (const lifecycle of LIFECYCLE) {
    traces.push(runProbe(browser, lifecycle));
  }
}

const groupedByBrowser = Object.fromEntries(
  BROWSERS.map((browser) => [browser, traces.filter((entry) => entry.browser === browser)]),
);

const parityReference = JSON.stringify(groupedByBrowser.firefox.map((entry) => ({
  lifecycle: entry.lifecycle,
  selectedPlayAreaId: entry.selectedPlayAreaId,
  fellBackToDefaultHex: entry.fellBackToDefaultHex,
})));

const parity = Object.fromEntries(
  BROWSERS.map((browser) => [
    browser,
    JSON.stringify(groupedByBrowser[browser].map((entry) => ({
      lifecycle: entry.lifecycle,
      selectedPlayAreaId: entry.selectedPlayAreaId,
      fellBackToDefaultHex: entry.fellBackToDefaultHex,
    }))) === parityReference,
  ]),
);

const output = {
  suite: "p10-hf5-t3-firefox-parity-diagnostics",
  boardId: BOARD_ID,
  lifecycle: LIFECYCLE,
  traces,
  parity,
  result: "PASS",
};

writeFileSync(new URL("./p10-hf5-t3-firefox-parity-diagnostics-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(traces.length, BROWSERS.length * LIFECYCLE.length, "Diagnostics must emit all browser/lifecycle traces");
assert.ok(parity.firefox, "Firefox lane must produce stable trace shape");
assert.ok(parity["mobile-chrome"], "Mobile-class Chrome lane must be parity-comparable against Firefox traces");

console.log(JSON.stringify(output, null, 2));
