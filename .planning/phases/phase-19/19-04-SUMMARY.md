---
phase: 19
plan: 4
title: Unified Grid Projection System (replaces 19-02/19-03)
subsystem: viewport/projection
tags: [projection-mapping, grid-warp, css-transform, canvas]
dependency_graph:
  requires: [19-01]
  provides: [unified-grid-projection, post-draw-mesh-warp]
  affects: [runtime-draw-loop, runtime-orchestration]
tech_stack:
  patterns: [unified-grid-state, post-draw-warp, css-matrix3d-from-grid-corners]
key_files:
  created: []
  modified:
    - src/app/runtime/viewport/runtime-projection-mapping.js
    - src/app/runtime/render/runtime-draw-loop.js
    - src/app/runtime/runtime-orchestration.js
    - src/styles.css
decisions:
  - Unified grid replaces dual 4-corner + grid-mesh system
  - Post-draw mesh warp instead of offscreen canvas swap (zero overhead when unused)
  - localStorage v2 key with automatic migration from old corners key
  - Legacy begin/endGridWarpFrame kept as no-ops for safety
metrics:
  duration: 244s
  completed: "2026-04-18T22:44:01Z"
  tasks_completed: 4
  tasks_total: 4
  files_modified: 4
---

# Phase 19 Plan 4: Unified Grid Projection System Summary

Replaced the broken dual-system (4-corner CSS matrix3d + offscreen canvas grid mesh) with one unified grid-based projection system with post-draw mesh warp.

## One-liner

Unified grid projection: single 5x5 grid controls both CSS perspective (corners) and canvas mesh warp (interior), with zero-overhead post-draw approach.

## What Was Done

### T13 -- Rewrite projection-mapping.js as unified grid system
- Rewrote entire file from scratch while preserving IIFE + init(ctx) pattern
- New grid state: `{ xs: [...], ys: [...], points: { "row-col": {x,y} } }`
- Default 4x4 grid = 5x5 = 25 control points (normalized 0-1 coordinates)
- CSS matrix3d computed from the 4 corner grid points using existing homography math
- `getPoint(row, col)` returns displaced position or default `{ x: xs[col], y: ys[row] }`

### T14 -- Unified handle UI
- Single set of DOM handles at every grid intersection
- Corner handles: 28px red circles, labeled 1-4 (free movement)
- Edge handles: 12x16px blue rectangles (axis-constrained)
- Interior handles: 14px cyan circles (free movement)
- Grid lines drawn on a canvas overlay with pointer-events for line dragging
- Line dragging: 15px hit threshold, moves entire row/column
- Right-click context menu: add/remove horizontal/vertical lines, reset all
- Arrow keys with Tab cycling through all handles, Shift for 10px steps

### T15 -- Post-draw mesh warp
- `postDrawMeshWarp(canvas, canvasCtx)` called after all rendering completes
- Early-returns when no interior/edge displacements exist (zero overhead)
- Cached temp canvas for snapshot (reused across frames)
- Per-cell drawImage mapping from original grid to displaced positions

### T16 -- Cleanup draw loop and orchestration
- Removed `beginGridWarpFrame`/`endGridWarpFrame` hooks from draw loop
- Removed canvas swapping/ctx mutation code
- Added single `ctx.postDrawMeshWarp?.(canvas, c)` after rendering
- Updated orchestration destructuring and DRAW_LOOP init wiring
- Cleaned up CSS: removed old `#projection-line-canvas`, updated grid overlay

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| T13+T14+T15 | 6731e96 | Rewrite projection-mapping as unified grid system |
| T16 | fbf6076 | Clean up draw loop and orchestration for unified grid |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
