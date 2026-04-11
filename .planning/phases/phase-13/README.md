# Phase 13 Workspace

Planning and execution workspace for **Server-Authoritative Config + Gesture-Based Zoom + Touch Polygon Editing**.

- `PLAN.md`: objective, binding decisions, scope, milestones, and DoD.
- `BACKLOG.md`: epics and story mapping.
- `TASKS.md`: execute-ready worklist for Plans 13-1, 13-2, 13-3.
- `ACCEPTANCE.md`: hard gates and regression matrix.
- `RISKS.md`: critical execution risks and mitigations.
- `EXECUTE.md`: binding run order and closure gates.

## Status
- Phase 13 is active.
- Plan 13-1 is execute-ready (foundation — must close before 13-2).
- Plan 13-2 blocked on 13-1.
- Plan 13-3 blocked on 13-1.
- Previous phase (Phase 12) closed PASS at Plan 12-1 (concurrent room animation layering).

## Problem Statement (binding)

### 13-1 Server-authoritative config (Large)
Nothing is persisted in the browser anymore. A single global config lives on the server. Every mutation (from any device, any client) propagates to the server and is immediately reflected on every connected client. The "save to global" and "load and apply defaults" buttons become redundant and are removed. Export-to-file (download JSON backup) and import-from-file (overwrite global config from a JSON upload) remain available.

### 13-2 Gesture-based zoom (Medium)
The zoom slider in the Settings tab is removed. Desktop users zoom with the mouse wheel over the stage. Mobile users zoom with a two-finger pinch gesture. Zoom range 25%-400%. Fit-to-room and reset-zoom buttons are preserved.

### 13-3 Touch-friendly polygon editing (Small-Medium)
Polygon vertex drag editing works reliably on mobile touchscreens. Today mouse dragging works but touch dragging barely works — finger-sized hit targets, correct pointer button semantics for touch, `touch-action` CSS so the browser does not steal the gesture, and clean arbitration with the new pinch-zoom gesture.

## Binding User Decisions (2026-04-11)
- **Server unreachable at startup**: block with a clear error ("Server nicht erreichbar — Retry"). No static-file fallback, no in-memory defaults.
- **Write cadence**: debounced 150-300ms per mutation. Optimistic local UI update, server write after ~200ms of settle time.
- **Zoom range**: 25% to 400%. Pan clamping must keep the board visible at extreme zoom-outs.
- **Settings subtab memory**: moves to `sessionStorage` (ephemeral per browser tab) — not `localStorage`, not server. Borderline to "nothing in browser" but minimal UX concession.
