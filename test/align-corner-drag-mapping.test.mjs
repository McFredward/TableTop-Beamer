// Phase-31 h18 — align-corner-drag vertex→grid-corner mapping.
//
// THE CONTRACT: receiver-bootstrap.js sends vertex IDs 0/1/2/3
// corresponding to TL/TR/BR/BL of the captured display. The SSR-tab
// live-sync handler must map those vertex IDs to the FOUR CORNERS of
// the projection grid (which has variable rows/cols). This test pins
// that mapping so a future grid refactor can't silently misalign.
//
// We exercise the mapping logic in isolation (no live-sync, no
// browser) by extracting the lookup from the source.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(
  "./src/app/runtime/live-sync/runtime-live-sync-core.js",
  "utf8",
);

test("h18: live-sync wires the align-corner-drag handler", () => {
  // The handler runs inside applyLiveMutation. Source-grep ensures the
  // wire-up exists.
  assert.ok(
    /align-corner-drag/i.test(SRC) || /lastAlignCornerDrag/.test(SRC),
    "live-sync core must reference align-corner-drag handling",
  );
  assert.ok(
    /TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE/.test(SRC),
    "must consume grid-state to call setPoint()",
  );
  assert.ok(
    /applyTransform\b/.test(SRC),
    "must call applyTransform to redraw after the vertex update",
  );
});

test("h18: vertex ID mapping pins TL/TR/BR/BL → (row, col) corners", () => {
  // Extract the cornerByVertex array literal from the source as
  // visible text. This is a snapshot test — it asserts the contract
  // matches receiver-bootstrap.js's hitTestVertex (which produces
  // 0=TL, 1=TR, 2=BR, 3=BL).
  const m = SRC.match(/const\s+cornerByVertex\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(m, "cornerByVertex array must be present in live-sync core");
  const body = m[1];
  // Position 0 (TL): row=0, col=0
  assert.match(body, /\{\s*row:\s*0,\s*col:\s*0\s*\}/);
  // Position 1 (TR): row=0, col=lastCol
  assert.match(body, /\{\s*row:\s*0,\s*col:\s*lastCol\s*\}/);
  // Position 2 (BR): row=lastRow, col=lastCol
  assert.match(body, /\{\s*row:\s*lastRow,\s*col:\s*lastCol\s*\}/);
  // Position 3 (BL): row=lastRow, col=0
  assert.match(body, /\{\s*row:\s*lastRow,\s*col:\s*0\s*\}/);
});

test("h18: drag dedup uses (at:vertex:phase) key so re-applies don't fight", () => {
  // The handler stashes the last-applied drag key on
  // state._lastAppliedAlignCornerDragKey to prevent re-applying the
  // same drag on every snapshot tick (the broadcast is N consumers ×
  // M ticks, so the same drag arrives many times).
  assert.match(
    SRC,
    /_lastAppliedAlignCornerDragKey/,
    "must track the last-applied drag to dedup repeats",
  );
  assert.match(
    SRC,
    /\$\{drag\.at[^}]*\}:\$\{drag\.vertexId\}:\$\{drag\.phase\}/,
    "dedup key must combine timestamp, vertex, and phase so partial drags are still applied",
  );
});

test("h18: only the SSR-tab (final-output role) applies the drag", () => {
  // The dashboard preview also receives the broadcast, but applying
  // would fight the operator's own pointer. Source-pin that gate.
  assert.match(
    SRC,
    /OUTPUT_ROLE_FINAL/,
    "drag application must be gated on the final-output role only",
  );
});

test("h18: 'end' phase persists the new corner via grid-state.saveToLocalStorage", () => {
  // Mid-drag (start/move phases) we update the grid in memory but
  // don't persist — this avoids hammering localStorage on every
  // pointermove event. On pointerup (phase='end') we save once.
  assert.match(
    SRC,
    /drag\.phase\s*===\s*"end"/,
    "must check for the end phase before persisting",
  );
  assert.match(
    SRC,
    /saveToLocalStorage/,
    "must call saveToLocalStorage on drag end",
  );
});
