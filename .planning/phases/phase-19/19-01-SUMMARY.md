---
phase: 19
plan: 1
title: Align Mode Visibility + Play Area Display + Output Path
subsystem: ui, server, viewport
tags: [align-mode, play-area, routing, output]
dependency_graph:
  requires: []
  provides: [/output-route, align-button-promoted, play-area-align-overlay]
  affects: [index.html, styles.css, server.mjs, runtime-env.js, runtime-stage-viewport.js, runtime-polygon-editor.js]
tech_stack:
  added: []
  patterns: [svg-overlay-rendering, css-glow-animation, multi-path-routing]
key_files:
  created: []
  modified:
    - index.html
    - src/styles.css
    - server.mjs
    - src/app/lib/shared/runtime-env.js
    - src/app/runtime/viewport/runtime-stage-viewport.js
    - src/app/runtime/polygon-editor/runtime-polygon-editor.js
decisions:
  - Align button placed as standalone element after Quick Mode panel rather than inside it, for maximum visibility
  - Play Area overlay uses purple dashed stroke to match Settings accent and differentiate from room polygons
  - /output recognized via startsWith to future-proof sub-paths
metrics:
  duration: 135s
  completed: 2026-04-18T20:26:10Z
  tasks: 3/3
  files: 6
---

# Phase 19 Plan 1: Align Mode Visibility + Play Area Display + Output Path Summary

Promoted Align Mode button to standalone dashboard position with glow-pulse styling, added Play Area boundary rendering during align mode on /output, and changed primary output route from /output/final to /output with backward compatibility.

## Task Completion

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| T1 | Align Mode Button Promotion | f5cf48a | Moved button from Active Animations to below Quick Mode; shorter label; subtle/glow styling |
| T2 | Play Area Display in Align Mode | 70c656e | Added renderAlignModePlayAreaOverlay(); purple dashed stroke CSS |
| T3 | Output Path Change | 4ed2a9e | /output route in server + runtime-env; /output/final kept as compat; footer updated |

## Decisions Made

1. **Button placement**: Standalone `<button>` element directly after the Quick Mode `</section>` tag, with `dashboard-only` and `data-dashboard-zone="trigger"` attributes so it follows the same visibility rules as Quick Mode.
2. **Play Area rendering**: Separate `renderAlignModePlayAreaOverlay()` function rather than modifying `renderShipPolygonEditorHandles()`, keeping editor logic cleanly separated from display-only overlay.
3. **Route matching**: `/output` uses exact match plus `startsWith("/output/")` in runtime-env.js, which means `/output/final` still matches via the startsWith check as well as its own explicit check.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- Align button removed from Active Animations panel (no duplication)
- Align button visible in dashboard zone without scrolling
- Play Area polygons render only during align mode on /output (guard: outputRole === FINAL && alignMode)
- /output route serves index.html and resolves as OUTPUT_ROLE_FINAL
- /output/final continues to work (backward compat)
- No existing align mode logic modified (setAlignMode, syncAlignModePanel unchanged except label text)
