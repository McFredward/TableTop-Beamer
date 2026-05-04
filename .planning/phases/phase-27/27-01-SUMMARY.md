---
phase: 27
plan: "01"
subsystem: align-mode-grid
tags: [B1, B2, B6, grid-state, handle-drag, handle-ui, outer-lines, default-layout]
dependency_graph:
  requires: []
  provides: [uniform-teal-grid-lines, local-only-corner-drag, 80pct-3x3-default-layout, buildNewProfileDefaultGrid-export]
  affects: [runtime-projection-handle-ui.js, runtime-projection-handle-drag.js, runtime-projection-grid-state.js]
tech_stack:
  added: []
  patterns: [vanilla-js-iife, module-init-injection, pushUndo-before-mutation]
key_files:
  created: []
  modified:
    - src/app/runtime/viewport/runtime-projection-grid-state.js
    - src/app/runtime/viewport/runtime-projection-handle-drag.js
    - src/app/runtime/viewport/runtime-projection-handle-ui.js
decisions:
  - "buildNewProfileDefaultGrid() is the canonical source of truth for fresh-profile defaults; makeEvenLines(DEFAULT_COUNT) is kept for diagnostics only"
  - "isEdge proportional-remesh block deleted from onDragMove only; onLineDragMove isEdgeRow/isEdgeCol blocks preserved byte-identical (D-01)"
  - "uniform strokeStyle rgba(0,220,180,0.45) lineWidth 1 replaces both isEdge ternaries in drawLines(); no other inline styles touched"
metrics:
  duration_minutes: 20
  completed_date: "2026-05-04"
  tasks_total: 3
  tasks_completed: 3
  files_modified: 3
  lines_added: 25
  lines_deleted: 70
---

# Phase 27 Plan 01: Grid State + Drag + Draw Foundation Summary

**One-liner:** Uniform teal grid lines, local-only outer-corner drag, and 80%-centered 3×3 default layout — the data-model + rendering foundation for plans 27-02 through 27-04.

---

## Tasks Completed

| Task | Name | Commit | Files | +/- Lines |
|------|------|--------|-------|-----------|
| T1 | Replace default layout with 80%/3×3 (B6+D-07) | f49c0fe | runtime-projection-grid-state.js | +16 / -4 |
| T2 | Remove isEdge proportional remesh from onDragMove (B2+D-02) | 1a81768 | runtime-projection-handle-drag.js | +3 / -60 |
| T3 | Unify outer-line color in drawLines() (B1+D-01) | 788cf3f | runtime-projection-handle-ui.js | +6 / -6 |

---

## Files Modified

| File | Lines Before | Lines After | Change |
|------|-------------|-------------|--------|
| runtime-projection-grid-state.js | 281 | 293 | +12 net (new helper + export) |
| runtime-projection-handle-drag.js | 545 | 488 | -57 net (isEdge block deleted) |
| runtime-projection-handle-ui.js | 781 | 781 | ±0 net (2 ternaries → 2 literals, same line count) |

---

## Acceptance Criteria Verification

### B6 — New default layout (27-VALIDATION.md row B6)

- `buildNewProfileDefaultGrid()` returns `{ srcXs: [0.10, 0.50, 0.90], srcYs: [0.10, 0.50, 0.90] }`.
- Module init uses `_newProfileDefault = buildNewProfileDefaultGrid()` so the grid starts as a 3×3 at 10%/50%/90%.
- `resetGrid()` calls `buildNewProfileDefaultGrid()` and replaces `srcXs`/`srcYs` — produces same 3×3.
- `applyGridPayload()` lives in `runtime-projection-profile-persistence.js` and is **untouched** — existing saved profiles load verbatim (D-07 satisfied).

grep evidence:
```
buildNewProfileDefaultGrid occurrences in grid-state.js: 5  (definition + module init + resetGrid + 2 export refs)
```

### B2 — Outer corner drag (27-VALIDATION.md row B2)

- The entire `isEdge` block (lines 191–248 pre-change, 59 lines) was deleted from `onDragMove`.
- After deletion: `setPoint(dragState.row, dragState.col, newX, newY)` is followed directly by `positionHandles() → positionRotateHandles() → drawLines() → applyTransform() → renderRoomOverlay()`.
- `onLineDragMove` `isEdgeRow`/`isEdgeCol` blocks are **byte-identical** to pre-change form (confirmed by `grep isEdgeRow` returning line 388 — unchanged position).

grep evidence:
```
isEdge=r===0 occurrences in handle-drag.js: 0  (removed)
isEdgeRow=row=== occurrences in handle-drag.js: 1  (preserved in onLineDragMove)
isEdgeCol=col=== occurrences in handle-drag.js: 1  (preserved in onLineDragMove)
```

### B1 — Uniform teal outer lines (27-VALIDATION.md row B1)

- Both `isEdge` ternaries removed from `drawLines()` horizontal loop and vertical loop.
- Each loop now uses a plain assignment: `lineCtx.strokeStyle = "rgba(0, 220, 180, 0.45)"; lineCtx.lineWidth = 1;`.
- `rgba(220, 30, 30, 0.7)` does not appear anywhere in handle-ui.js.
- `rgba(255, 160, 30, 0.9)` (rotate handles) is unchanged.
- Intersection handle dots `rgba(0, 220, 200, 0.85)` unchanged.

grep evidence:
```
rgba(220, 30, 30 in handle-ui.js: 0  (removed)
rgba(255, 160, 30, 0.9) in handle-ui.js: 1  (preserved)
teal strokeStyle assignments in drawLines(): 2  (one per axis loop)
```

---

## Deviations from Plan

None — plan executed exactly as written.

All three tasks followed the exact line targets specified in the plan interfaces block. No additional files were touched, no imports changed, no schema migrations added.

---

## Confirmation: onLineDragMove Byte-Identical

The `onLineDragMove` function (lines 383–511 in final file) was not modified. The `isEdgeRow` proportional-scaling block at lines 388–410 and the `isEdgeCol` block at lines 414–432 are present and untouched, preserving D-01 outer-LINE drag behavior (dragging an outer edge proportionally scales interior parallel lines).

Verification: `git diff HEAD~3 HEAD -- src/app/runtime/viewport/runtime-projection-handle-drag.js` shows only lines within `onDragMove` changed; `onLineDragMove` lines are not in the diff.

---

## Confirmation: applyGridPayload Unchanged

`applyGridPayload` lives in `runtime-projection-profile-persistence.js` and was not touched in this plan. The word `applyGridPayload` does not appear in `runtime-projection-grid-state.js`. D-07 (no migration of existing profiles) is satisfied by the architecture: `applyGridPayload` replaces `grid.srcXs`/`srcYs` wholesale on profile load, so old 5-line profiles continue to load verbatim.

---

## Known Stubs

None. All three changes are complete functional implementations with no placeholder values or deferred wiring.

---

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Pure in-browser rendering/drag refactor with no new I/O surface.

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| runtime-projection-grid-state.js exists | FOUND |
| runtime-projection-handle-drag.js exists | FOUND |
| runtime-projection-handle-ui.js exists | FOUND |
| 27-01-SUMMARY.md exists | FOUND |
| Commit f49c0fe (T1) exists | FOUND |
| Commit 1a81768 (T2) exists | FOUND |
| Commit 788cf3f (T3) exists | FOUND |
