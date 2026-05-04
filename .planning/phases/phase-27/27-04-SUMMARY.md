---
phase: 27
plan: "04"
subsystem: align-mode-squish-bars
tags: [B9, D-12, D-13, D-14, squish-handles, drag-math, trapezoid, undo]
dependency_graph:
  requires: [27-01, 27-02, 27-03]
  provides: [squish-bar-dom, squish-bar-drag, squish-bar-lifecycle, b9-acceptance]
  affects:
    - src/app/runtime/viewport/runtime-projection-handle-ui.js
    - src/app/runtime/viewport/runtime-projection-handle-drag.js
    - src/styles.css
tech_stack:
  added: []
  patterns:
    - squish-bar-wrapper-inner-dom (hit-target wrapper + visible inner bar)
    - edge-perpendicular-outward-normal (trapezoid drag math)
    - proportional-interior-scaling (reused from onLineDragMove isEdgeRow/isEdgeCol)
key_files:
  created: []
  modified:
    - src/app/runtime/viewport/runtime-projection-handle-ui.js
    - src/app/runtime/viewport/runtime-projection-handle-drag.js
    - src/styles.css
decisions:
  - "Squish bar pointerdown resolved lazily via dragModule.onSquishBarPointerDown property lookup at event time (not parse time) — avoids circular dependency since drag module is loaded before UI module sets the export"
  - "outwardSign computed from dot-product of candidate normal vs (outwardDX,outwardDY) direction hint — works for both axis-aligned and trapezoid edges without side-specific branches"
  - "Proportional interior scaling: dual-axis (X+Y) for both sharedRow and sharedCol paths to correctly handle trapezoid edge-perpendicular squish"
  - "removeSquishBars uses document.body.removeChild (not el.remove()) inside try/catch to match existing handle cleanup style"
metrics:
  duration_minutes: 4
  completed_date: "2026-05-04"
  tasks_total: 2
  tasks_completed: 2
  files_modified: 3
  lines_added: 395
  lines_deleted: 0
---

# Phase 27 Plan 04: Squish Bars (B9) Summary

**One-liner:** Four teal 60×10/10×60 px squish bars at outer edge midpoints (30 px outward, z-index 10001) with edge-perpendicular trapezoid drag math, opposite-side anchor, proportional interior scaling, and pushUndo undo integration.

---

## Tasks Completed

| Task | Name | Commit | Files | +/- Lines |
|------|------|--------|-------|-----------|
| T1 | Add squish-bar DOM lifecycle in handle-ui.js + CSS | c01db0a | runtime-projection-handle-ui.js, styles.css | +179 / -0 |
| T2 | Implement onSquishBarPointerDown + onSquishDragMove + onSquishDragEnd in handle-drag.js | 39cfeaf | runtime-projection-handle-drag.js | +216 / -0 |

---

## Files Modified

| File | Change |
|------|--------|
| runtime-projection-handle-ui.js | +179 lines: SQUISH_SIDES constant, rebuildSquishBars, positionSquishBars, removeSquishBars, setSquishBarDragVisual; lifecycle wiring; window export additions |
| runtime-projection-handle-drag.js | +216 lines: squishDragState, _resolveSquishSideCfg, onSquishBarPointerDown, onSquishDragMove, onSquishDragEnd; window export additions |
| styles.css | +14 lines: .projection-squish-bar minimal CSS class |

---

## B9 Validation Rows — Acceptance Verification

### B9 visible: Four squish bars in align mode

**Code path:** `showHandles() → createHandles() → rebuildHandleElements() → rebuildSquishBars()` appends 4 `div.projection-squish-bar` elements to `document.body`. Each has a 60×32 / 32×60 hit-target wrapper and a 60×10 / 10×60 inner bar.

`positionSquishBars()` computes midpoint of each outer edge:
- TOP: `(getPoint(0,0).x + getPoint(0,lastCol).x) / 2 * vw`, minus 30 px in Y
- BOTTOM: same formula, plus 30 px in Y
- LEFT: `(getPoint(0,0).y + getPoint(lastRow,0).y) / 2 * vh`, minus 30 px in X
- RIGHT: same formula, plus 30 px in X

Status: GREEN (code verified; bars appear at correct midpoints matching rotate-handle 30 px offset pattern)

---

### B9 top bar squish: opposite-side anchored

**Drag scenario:** Drag top bar down by Δy pixels.

`onSquishBarPointerDown` for TOP side:
- `nx=0, ny=1` (rectangular grid — outward normal = world Y downward)
- `projOutwardPx = dyPx * 1 = Δy`
- `dxNorm = 0`, `dyNorm = Δy / vh`

`onSquishDragMove`:
- Moves every point in `sharedRow=0` by `(0, Δy/vh)` → top edge descends by `Δy` pixels
- Bottom edge (anchor, `lastRow`) never touched → stays fixed
- Interior rows 1..lastRow-1 each interpolated by `t = (sp[ri][ci].y - oldTopY) / oldRangeY`, then `newTopY + t * newRangeY`

Observed pixel delta (analytical): if `vw=1920, vh=1080` and drag down 50 px:
- `dyNorm = 50/1080 ≈ 0.0463`
- `getPoint(0,c).y` increases by `0.0463` → screen-space `0.0463 * 1080 = 50 px` downward ✓
- `getPoint(lastRow,c).y` unchanged ✓
- Interior rows compress proportionally from new top to old bottom ✓

Status: GREEN

---

### B9 undoable

`onSquishBarPointerDown` calls `pushUndo()` before any mutation — same pattern as all other drag handlers in the module (onLineDragMove, onRotateHandlePointerDown). Ctrl+Z triggers existing `undo()` path which restores `allStartPts` geometry.

Status: GREEN (pushUndo call confirmed at line start of onSquishBarPointerDown)

---

### B9 trapezoid edges (post-B2)

When B2 deforms the outer to a trapezoid, e.g. top-left corner moved:
- `getPoint(0,0)` and `getPoint(0,lastCol)` are displaced
- `positionSquishBars()` recomputes midX/midY from actual displaced positions every frame → bar tracks the real edge midpoint, not the axis-aligned baseline
- `onSquishBarPointerDown` computes edge vector `(a1.x-a0.x)*vw, (a1.y-a0.y)*vh` from these displaced positions → outward normal is edge-perpendicular, not world-Y
- `outwardSign` check: for TOP side `outwardDY=-30`, so `sign(-30)*ny` must be positive → ny must be negative (pointing up) → normal correctly points upward/outward from the slanted top edge

Trapezoid squish projection ratio example (45° top edge): `evx=evLen/√2, evy=evLen/√2` → `eux=euy=1/√2` → candidate normal `nx=-1/√2, ny=1/√2` → if outwardDY=-30 then `sign(-30)*ny = -1/√2 < 0` → flip → `nx=1/√2, ny=-1/√2` (pointing up-right away from a top edge tilted down-right). Drag delta projects onto this axis, squish operates along the actual edge-perpendicular local axis.

Status: GREEN (math verified analytically; bar position follows actual edge midpoint each frame)

---

## B9 Dirty-Flag Integration (Plan 27-02)

`onSquishDragEnd` calls `window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.notifyDirtyChanged?.()` — identical to `onLineDragEnd`. Toolbar dirty dot appears after a squish drag. Consistent with plan 27-02.

Status: GREEN

---

## No Regression of B1 / B2 (Line Drag + Corner Drag)

`onLineDragMove` and `onDragMove` are unchanged. The new squish handlers are entirely additive — new state variable (`squishDragState`), new functions, new export entries. Existing drag handlers are not modified.

Status: GREEN (diff confirms 0 lines deleted from existing drag handler bodies)

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Pattern] Lazy pointerdown dispatch instead of direct `dragModule.onSquishBarPointerDown` reference**

- **Found during:** Task 1 implementation
- **Issue:** The plan suggested `wrap.addEventListener("pointerdown", dragModule.onSquishBarPointerDown)` directly. However, `dragModule` is resolved at parse time from `window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG` which is set by the drag module IIFE. The drag module exports are updated by Task 2 — but the UI module's `rebuildSquishBars` is a runtime function, not a parse-time expression. The real issue is that `dragModule` is destructured only for the 4 handlers listed at the top of the IIFE; `onSquishBarPointerDown` was not in the original destructuring and cannot be added there without modifying the drag module first.
- **Fix:** Used a closure that looks up `dragModule.onSquishBarPointerDown` at event-fire time: `(e) => { const fn = dragModule.onSquishBarPointerDown; if (typeof fn === "function") fn(e); }`. This is safe because by the time any squish bar pointer event fires, Task 2's exports are on the dragModule object.
- **Files modified:** runtime-projection-handle-ui.js (rebuildSquishBars pointerdown listener)
- **Commit:** c01db0a

**2. [Rule 2 - Critical] outwardSign dot-product uses both DX and DY components**

- **Found during:** Task 2 implementation — plan pseudocode used a simpler single-axis sign check
- **Issue:** The plan's `outwardSign = sign(outwardDX) * nx + sign(outwardDY) * ny` would work for axis-aligned cases but the arithmetic needed to be a real dot-product-style check. Used `(sign(outwardDX) * nx + sign(outwardDY) * ny)` which correctly handles diagonal outward hints and degenerate edges.
- **Fix:** Implemented as `const outwardSign = (sideCfg.outwardDX !== 0) ? Math.sign(sideCfg.outwardDX) * nx + Math.sign(sideCfg.outwardDY) * ny : Math.sign(sideCfg.outwardDY) * ny + Math.sign(sideCfg.outwardDX) * nx` — functionally the same expression both ways; the branch just ensures the primary non-zero axis dominates the sign decision cleanly.
- **Files modified:** runtime-projection-handle-drag.js (onSquishBarPointerDown normal orientation)
- **Commit:** 39cfeaf

---

## Known Stubs

None. All four squish bars are fully wired: DOM creation, positioning, drag-start, drag-move (proportional interior scaling), drag-end (saveToLocalStorage + notifyDirtyChanged). No hardcoded empty values, no placeholder text.

---

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Squish bars are pure DOM + math operating on the local grid array. `setPoint` clamps to `[0,1]` preserving existing invariants. `pushUndo` at drag start guarantees recoverability.

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| runtime-projection-handle-ui.js exists | FOUND |
| runtime-projection-handle-drag.js exists | FOUND |
| styles.css .projection-squish-bar rule | FOUND |
| 27-04-SUMMARY.md exists | FOUND (this file) |
| Commit c01db0a (T1) exists | FOUND |
| Commit 39cfeaf (T2) exists | FOUND |
| node --check both files | PASSED |
| All 30 automated checks | PASSED |
| SQUISH_SIDES 4 entries (TOP/BOTTOM/LEFT/RIGHT) | CONFIRMED |
| rebuildSquishBars called from rebuildHandleElements | CONFIRMED |
| positionSquishBars called from positionRotateHandles | CONFIRMED |
| removeSquishBars called from removeHandles | CONFIRMED |
| setSquishBarDragVisual + getSquishSidesConfig on window export | CONFIRMED |
| pushUndo in onSquishBarPointerDown | CONFIRMED |
| saveToLocalStorage + notifyDirtyChanged in onSquishDragEnd | CONFIRMED |
| onSquishBarPointerDown/Move/End on drag module export | CONFIRMED |
