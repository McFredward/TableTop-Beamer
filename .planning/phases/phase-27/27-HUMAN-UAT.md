---
status: partial
phase: 27-align-mode-refinement
source: [27-VERIFICATION.md, 27-VALIDATION.md]
started: 2026-05-04T00:00:00Z
updated: 2026-05-04T00:00:00Z
---

## Current Test

[awaiting human testing on Pi /output/]

## Pre-flight

**REQUIRED before B5 tests are valid:** restart `node server.mjs`. The new `/api/align-mode-dirty` endpoint and grace-timer logic only activate after a fresh server boot.

## Tests

### B1.a Outer lines uniform teal color
expected: After align mode ON, all grid lines (incl. outer rectangle) render as `rgba(0, 220, 180, 0.45)` teal. No red lines visible.
result: [pending]

### B1.b Outer line drag behaves identically to inner line drag
expected: Drag the top outer edge → ns-resize cursor; line moves; interior horizontal lines scale proportionally. Behavior identical to inner-edge drag.
result: [pending]

### B2 Outer corner draggable with local-only deformation
expected: Drag top-left corner → only that corner intersection moves. Interior intersections do NOT auto-redistribute.
result: [pending]

### B3 Profile name visible in align-mode toolbar
expected: Toolbar chip top-center shows the loaded profile name. With no profile loaded → chip shows "Unsaved".
result: [pending]

### B4.a Dirty flag triggers on any geometry mutation
expected: Drag any handle → dirty dot `●` appears in profile chip; name color shifts to `--c-warn` amber; Save/Discard buttons activate.
result: [pending]

### B4.b Save profile overwrites loaded profile (clean state restored)
expected: In dirty state with profile loaded, click "Save profile" → profile JSON updates on disk; toolbar returns to clean state (no dot, no amber).
result: [pending]

### B4.c "Save as new..." opens name-input modal
expected: Click secondary "Save as new..." → modal opens with "Save profile" + "Keep editing" buttons; on submit a new profile is created.
result: [pending]

### B4.d Discard reverts immediately, no confirm modal
expected: In dirty state, click "Discard" → no confirm modal appears; grid reverts to last-saved profile geometry (or default 80%/3×3 if no profile loaded).
result: [pending]

### B5.a Dashboard align-mode toggle disabled when /output/ dirty (REQUIRES SERVER RESTART)
expected: Make /output/ dirty → on dashboard: align-mode toggle has `disabled` attribute; hint reads exactly "Unsaved changes on /output/ — save or discard there first." (em-dash U+2014).
result: [pending]

### B5.b Dashboard toggle re-enables on /output/ save/discard
expected: /output/ saves or discards → within ~500 ms (live-sync fanout) dashboard toggle re-enables and hint disappears.
result: [pending]

### B5.c Grace timer clears dirty flag after /output/ disconnect
expected: /output/ is dirty → close /output/ tab/disconnect → wait 10 s → dashboard toggle re-enables.
result: [pending]

### B6 New default layout is 80% rect + 1 H + 1 V mid-line
expected: Reset grid (or open a fresh profile via Discard with no profile loaded) → grid is 3×3 at normalized positions [0.10, 0.50, 0.90] for both srcXs and srcYs.
result: [pending]

### B7.a Right-click on empty canvas shows only Add options
expected: Right-click in empty grid area → menu shows "Add horizontal line here" + "Add vertical line here" only — NO delete options.
result: [pending]

### B7.b Right-click on inner line shows Delete + Add
expected: Right-click ≤6 px from an inner line → menu shows "Delete this line" + "Add line through this point".
result: [pending]

### B7.c Right-click on inner intersection shows two delete options + single Add
expected: Pre-condition: grid has ≥4 in each axis (use Add horizontal line here once on the 3×3 default to reach 4×3). Then right-click ≤10 px from the inner intersection → menu shows "Delete vertical line" (hidden if outer column) + "Delete horizontal line" + a SINGLE "Add line through this point" item (whose action adds BOTH a perpendicular horizontal AND vertical line at the click coordinate, per locked D-10).
result: [pending]

### B7.d Right-click on outer intersection greys out outer-line deletes
expected: Right-click on top-left outer-corner intersection → menu shows NO "Delete horizontal line" or "Delete vertical line" entries (outer lines not deletable).
result: [pending]

### B8 Line deletion end-to-end (canvas + persistence + undo)
expected: Right-click inner line → "Delete this line" → line disappears from canvas; press Ctrl+Z → line restores; reload page after explicit Save → deletion persisted.
result: [pending]

### B9.a Four squish bars visible outside outer rectangle
expected: Align mode ON → four teal rectangular bars (60×10 px) visible outside the grid, one per outer side, at the same offset distance as rotate handles.
result: [pending]

### B9.b Top bar squish: opposite-side anchored
expected: Drag top bar downward by Δy → top edge moves down; bottom edge stays fixed (board does not translate); all interior horizontal lines compress proportionally.
result: [pending]

### B9.c Squish is undoable via existing undo stack
expected: Squish → Ctrl+Z → grid geometry restores to pre-squish positions.
result: [pending]

### B9.d Squish bars track trapezoid edges (post-B2)
expected: After dragging an outer corner so the outer is a trapezoid → the squish bar for that side sits at the midpoint of the (now non-axis-aligned) outer edge.
result: [pending]

## Summary

total: 22
passed: 0
issues: 0
pending: 22
skipped: 0
blocked: 0

## Gaps

[none recorded yet — to be added when issues are reported]
