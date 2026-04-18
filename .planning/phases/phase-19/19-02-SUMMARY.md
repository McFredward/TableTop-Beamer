---
phase: 19
plan: 2
title: Projection Mapping (4-Corner Warp)
subsystem: viewport/projection
tags: [projection-mapping, css-matrix3d, align-mode, output]
dependency_graph:
  requires: [19-01]
  provides: [projection-mapping, corner-warp, calibration-persistence]
  affects: [output-view, align-mode, global-defaults]
tech_stack:
  added: [css-matrix3d, perspective-homography]
  patterns: [iife-init-ctx, pointer-drag, arrow-key-nudge]
key_files:
  created:
    - src/app/runtime/viewport/runtime-projection-mapping.js
  modified:
    - index.html
    - src/styles.css
    - src/app/runtime/viewport/runtime-stage-viewport.js
    - src/app/runtime/runtime-orchestration.js
    - src/app/runtime/core/runtime-bootstrap.js
    - src/app/runtime/state/runtime-board-profiles.js
    - server.mjs
decisions:
  - CSS matrix3d computed from unit-square-to-quad Heckbert algorithm (no SVD/numpy needed in browser)
  - Corners stored as viewport percentages (0-100) for resolution independence
  - Projection mapping corners persisted via existing buildPersistedRuntimeSettingsFromState pipeline
  - Handles rendered as fixed-position body-level divs (not inside transformed stage)
  - Line canvas overlay at z-index 9998, handles at z-index 9999
metrics:
  duration_seconds: 321
  completed: "2026-04-18T20:44:06Z"
  tasks_completed: 5
  tasks_total: 5
---

# Phase 19 Plan 2: Projection Mapping (4-Corner Warp) Summary

Browser-based 4-corner projection mapping using CSS matrix3d perspective homography, replacing xrandr system-level transforms with in-browser calibration.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| T4 | Projection Mapping Module | 0f85f3f | runtime-projection-mapping.js |
| T5 | Corner Drag Handles on /output | 3da392f | index.html, styles.css |
| T6+T8 | Arrow Key Fine-Tuning + Align Mode Integration | f309215 | runtime-stage-viewport.js |
| T7 | Persistence + Wiring | 0b85c94 | server.mjs, runtime-orchestration.js, runtime-bootstrap.js, runtime-board-profiles.js |

## Implementation Details

### Projection Mapping Module (T4)
- New IIFE module `runtime-projection-mapping.js` following codebase conventions
- Stores 4 corner positions as viewport percentages (0-100) for resolution independence
- Computes CSS `matrix3d()` using the Heckbert unit-square-to-quadrilateral algorithm
- No external dependencies needed (pure JS matrix math, no SVD required for rectangular source)
- Transform applied to `.stage` element via `transform-origin: 0 0` + computed matrix

### Corner Drag Handles (T5)
- 4 fixed-position 28px red circle divs with white border, numbered 1-4
- Drag via pointerdown/pointermove/pointerup with pointer capture
- Connected by red border lines via canvas overlay (z-index 9998)
- Semi-transparent red fill inside the quad for visual feedback
- Active corner highlighted yellow with scale(1.25)
- CSS `transform: none !important` on /output replaced with `transform-origin: 0 0`

### Arrow Key Fine-Tuning (T6)
- Arrow keys nudge active corner: 1px normal, 10px with Shift
- Tab cycles active corner (1->2->3->4->1)
- Only active on /output when align mode is on
- Keyboard listener added/removed with handle visibility

### Persistence (T7)
- Corners included in `buildPersistedRuntimeSettingsFromState()` via module API
- Server-side `handleGlobalDefaultsSave` preserves `projectionMapping` field across saves
- Bootstrap loads corners from `__TT_BEAMER_BOOTSTRAP_CONFIG__` on startup
- Auto-saves when align mode turns off via `saveGlobalDefaultsToServer()`

### Align Mode Integration (T8)
- `setAlignMode` calls `onAlignModeChanged` callback for projection mapping
- ON: shows handles + applies transform
- OFF: hides handles + keeps transform (calibration persists) + saves to server
- Resize observer recomputes transform and repositions handles
- Dashboard/Settings unaffected (transform only on OUTPUT_ROLE_FINAL)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
