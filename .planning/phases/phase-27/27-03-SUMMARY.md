---
phase: 27
plan: "03"
subsystem: align-mode-context-menu
tags: [B7, B8, D-10, hit-test, context-menu, handle-ui]
dependency_graph:
  requires: [27-01, 27-02]
  provides: [hit-test-priority-context-menu, screen-space-line-hittest, three-shape-menu, single-add-line-through-point]
  affects:
    - src/app/runtime/viewport/runtime-projection-handle-ui.js
tech_stack:
  added: []
  patterns: [screen-space-pixel-hittest, three-shape-menu-dispatch, aria-role-menu]
key_files:
  created: []
  modified:
    - src/app/runtime/viewport/runtime-projection-handle-ui.js
decisions:
  - "_hitTestAlignContext uses getPoint(r,c) displaced screen-space coords exclusively — srcXs/srcYs are never used for hit-test (Pitfall 1 closure)"
  - "Intersection branch emits a SINGLE 'Add line through this point' item that calls both addHorizontalLine(normY) and addVerticalLine(normX) per locked D-10 (overrides prior research-Q2 two-item recommendation)"
  - "Outer-line delete options are HIDDEN (items never pushed) not greyed — colIsOuter/rowIsOuter guard per D-10"
  - "4×3 pre-condition for inner-intersection delete items: cols>3 / rows>3 guard already in removeVerticalLine/removeHorizontalLine; menu reflects same guard to avoid showing items that would silently no-op"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-04"
  tasks_total: 1
  tasks_completed: 1
  files_modified: 1
  lines_added: 172
  lines_deleted: 49
---

# Phase 27 Plan 03: Right-Click Context Menu — Hit-Test Priority + Three-Shape Menu Summary

**One-liner:** Screen-space hit-test priority (intersection ≤10px > line ≤6px > empty) with three menu shapes and a single "Add line through this point" item at intersections — Pitfall 1 (srcXs/srcYs misuse) closed and D-10 fully implemented.

---

## Tasks Completed

| Task | Name | Commit | Files | +/- Lines |
|------|------|--------|-------|-----------|
| T1 | Replace onContextMenu with hit-test priority + three-shape menu (B7+B8) | 224ace2 | runtime-projection-handle-ui.js | +172 / -49 |

---

## Files Modified

| File | Lines Before | Lines After | Change |
|------|-------------|-------------|--------|
| runtime-projection-handle-ui.js | ~960 | ~1083 | +123 net (+172 added / -49 removed) |

---

## Acceptance Criteria Verification

### B7 sub-row: Empty canvas

**Pre-condition:** right-click in area >10px from any intersection and >6px from any line.

**Expected menu:** "Add horizontal line here" · "Add vertical line here" — no delete options.

**Code path:** `hit.type === "empty"` branch pushes only the two Add items. The legacy "Remove this horizontal/vertical line", "Save profile...", "Load profile...", "Delete profile...", "Reset all" items are gone from the source.

grep evidence:
```
"Add horizontal line here" in onContextMenu empty branch: PRESENT
"Add vertical line here"   in onContextMenu empty branch: PRESENT
"Remove this horizontal line" in file: ABSENT
"Save profile..."             in file: ABSENT
"Load profile..."             in file: ABSENT
"Delete profile..."           in file: ABSENT
"Reset all"                   in file: ABSENT
```

Status: GREEN (verified by automated check suite, all 19 checks passed)

---

### B7 sub-row: Inner line only

**Pre-condition:** right-click ≤6px from an inner horizontal or vertical line, >10px from any intersection.

**Expected menu:** "Delete this line" (danger-styled) · "Add line through this point".

**Code path:** `hit.type === "line"` branch. `isOuter` check hides delete on outer lines. On a 3×3 default grid (rows=3, cols=3): `rows > 3` is false so the delete item is suppressed; only "Add line through this point" appears. On a 4×3 grid (after one add): delete item appears for the inner line.

"Add line through this point" action: h-line hit → `addVerticalLine(normX)`; v-line hit → `addHorizontalLine(normY)`.

Status: GREEN (verified by automated check suite)

---

### B7 sub-row: Inner intersection (4×3 pre-condition)

**Pre-condition:** grid must have at least one inner row AND inner column (>3 in each axis) because the removeHorizontalLine/removeVerticalLine guards refuse at ≤3. On a fresh 3×3 default, right-click empty area → "Add horizontal line here" → yields 4×3 with one inner row at the click position. Then right-click ≤10px from that inner intersection.

**Expected menu:** "Delete vertical line" (if col is inner + cols>3, shown in `--c-danger`) · "Delete horizontal line" (if row is inner + rows>3, shown in `--c-danger`) · SINGLE "Add line through this point" (adds both lines).

**Code path:** `hit.type === "intersection"` branch. `colIsOuter` = `hit.col === 0 || hit.col === lastCol`; `rowIsOuter` = `hit.row === 0 || hit.row === lastRow`. Delete items only pushed when not outer AND grid count >3.

Note: On a 4×3 grid (4 rows, 3 cols), the inner intersection at col=1 has `colIsOuter=false` but `cols>3` is false (cols=3) — so "Delete vertical line" is suppressed. "Delete horizontal line" appears (rows=4, rows>3, rowIsOuter=false). This is correct: the 4×3 pre-condition only satisfies the horizontal-delete guard.

To see both delete items: first add a horizontal line (4×3), then add a vertical line (4×4). Right-click the inner intersection at row=1, col=1 → both delete items appear.

Status: GREEN (logic verified; 4×3 note correctly captured in 27-VALIDATION.md row B7)

---

### B7 sub-row: Outer intersection (top-left corner)

**Pre-condition:** right-click ≤10px from top-left corner (row=0, col=0).

**Expected menu:** ONLY "Add line through this point" — no delete options at all.

**Code path:** `hit.type === "intersection"`, `colIsOuter = true` (col=0), `rowIsOuter = true` (row=0). Both delete items are NOT pushed. Only the single "Add line through this point" item is pushed.

Status: GREEN (both outer guards verified by code inspection and automated check)

---

### B8: Line deletion end-to-end

**Code path:** "Delete this line" action calls `removeHorizontalLine(hit.lineIndex)` or `removeVerticalLine(hit.lineIndex)`. Both functions already call `pushUndo()` before mutation and `saveToLocalStorage()` after, following the Phase 27 invariant (Pattern 3 in 27-RESEARCH.md). The existing undo stack (`Ctrl+Z → undo()`) restores prior state. Profile save persists through the existing toolbar Save button from plan 27-02.

grep evidence:
```
removeHorizontalLine body: pushUndo() + splice + saveToLocalStorage + notifyDirtyChanged  CONFIRMED
removeVerticalLine body:   pushUndo() + splice + saveToLocalStorage + notifyDirtyChanged  CONFIRMED
```

Status: GREEN (undo + persistence paths unchanged from pre-plan state; code routes through existing guards)

---

### Pitfall 1 Closure: Trapezoid hit-test fix

**Old bug:** `onContextMenu` used `Math.abs(grid.srcYs[i] - normY) < 0.03` — baseline srcY comparison, wrong on displaced trapezoid grids.

**New code:** `_hitTestAlignContext` iterates all `(row, col)` pairs using `getPoint(r, c)` which returns the actual displaced screen-space normalized coordinates. Pixel distances are computed as `Math.sqrt((pt.x * vw - clientX)² + (pt.y * vh - clientY)²)` for intersections and `_segDist()` for line segments.

grep evidence:
```
Math.abs(grid.srcYs in onContextMenu: ABSENT (old code gone)
getPoint(r, c) in _hitTestAlignContext: PRESENT (line 656)
getPoint(row, col) in _segDist loops: PRESENT (lines 695-715)
```

Status: GREEN — Pitfall 1 fully closed.

---

### DOM / ARIA verification

```javascript
// showContextMenu() now creates:
menu.setAttribute("role", "menu");
menu.setAttribute("aria-label", "Grid line options");

// Per item:
btn.setAttribute("role", "menuitem");
if (item.destructive) btn.style.color = "var(--c-danger)";
```

grep counts:
```
setAttribute("role", "menu")     in file: 1
setAttribute("role", "menuitem") in file: 1
aria-label.*Grid line options    in file: 1
var(--c-danger)                  in file: 1
```

Status: GREEN

---

## Deviations from Plan

None — plan executed exactly as written. All code in the task's `<action>` block was applied byte-for-byte. `showContextMenu`, `dismissContextMenu`, and `dismissContextMenuOnOutside` were not touched beyond the targeted loop-body and menu-creation changes specified by the plan.

---

## Known Stubs

None. The implementation is complete. All three menu shapes route to existing `addHorizontalLine` / `addVerticalLine` / `removeHorizontalLine` / `removeVerticalLine` functions which are fully wired (pushUndo + saveToLocalStorage + notifyDirtyChanged).

---

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The right-click context menu is a thin UI affordance over already-validated grid mutations. Hit-test computation is bounded by viewport coords and grid array length — no unbounded loops, no eval, no string parsing.

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| runtime-projection-handle-ui.js exists | FOUND |
| 27-03-SUMMARY.md exists | FOUND (this file) |
| Commit 224ace2 (T1) exists | FOUND |
| `node --check` passes | PASSED |
| All 19 automated checks passed | PASSED |
| _hitTestAlignContext function | FOUND |
| onContextMenu function | FOUND |
| No legacy "Remove this horizontal line" | CONFIRMED ABSENT |
| No legacy "Save profile..." context item | CONFIRMED ABSENT |
| role="menu" on container | CONFIRMED |
| role="menuitem" on items | CONFIRMED |
| var(--c-danger) on destructive items | CONFIRMED |
| getPoint() used in hit-test (not srcXs/srcYs) | CONFIRMED |
