# Phase 13 Backlog

## Epics

### Plan 13-1 Server-Authoritative Config
- E13-1-A [P0] Eliminate browser-side persistence (`localStorage`, `indexedDB`) from runtime/shared modules.
- E13-1-B [P0] Debounced per-mutation global config write (200ms) from client to server.
- E13-1-C [P0] Server-side atomic write + live-sync broadcast on every mutation.
- E13-1-D [P0] Blocking startup hydration with explicit error UI on server unreachable.
- E13-1-E [P0] Remove redundant Save / Load-and-apply buttons from DOM + handlers.
- E13-1-F [P0] Preserve Export-to-file; add Import-from-file that overwrites server config.
- E13-1-G [P0] Settings subtab memory → sessionStorage (ephemeral).
- E13-1-H [P0] API base override → URL param, not localStorage.
- E13-1-I [P0] Planning artifact sync.

### Plan 13-2 Gesture-Based Zoom
- E13-2-A [P0] Remove zoom slider + value label from DOM and handlers.
- E13-2-B [P0] Extend zoom range to `[0.25, 4.0]`.
- E13-2-C [P0] Mouse wheel zoom on stage with cursor-anchored focus.
- E13-2-D [P0] Two-finger pinch zoom with midpoint-anchored focus.
- E13-2-E [P0] Preserve fit / reset zoom buttons + pan logic.
- E13-2-F [P0] Planning artifact sync.

### Plan 13-3 Touch Polygon Editing
- E13-3-A [P0] Touch-reliable polygon vertex drag (ship + rooms + special).
- E13-3-B [P0] Coarse-pointer hit radius upgrade.
- E13-3-C [P0] `touch-action` CSS gate on overlay SVG.
- E13-3-D [P0] Pinch ↔ vertex-drag arbitration.
- E13-3-E [P0] Planning artifact sync.

## Story Mapping

### Plan 13-1
- S13-1-1 Inventory every localStorage/indexedDB call site under src/ via static harness.
- S13-1-2 Server mutation endpoint: POST /api/global-defaults writes atomically + triggers live-sync broadcast.
- S13-1-3 Client `scheduleGlobalConfigWrite(reason)` with 200ms debounce + cancellation-on-close; serializes relevant state slice and POSTs.
- S13-1-4 Replace all persistBoardProfiles() / localStorage.setItem(...) call sites with `scheduleGlobalConfigWrite(reason)` calls.
- S13-1-5 Replace loadBoardProfiles() hydration with `fetchGlobalDefaultsOrBlock()`; show error banner + Retry on failure.
- S13-1-6 Drop Save + Load-and-apply button DOM + handlers; status text element repurposed as general sync status.
- S13-1-7 Import-from-file: new button, JSON file picker, POSTs full payload, server replaces + broadcasts.
- S13-1-8 Settings subtab memory: migrate to sessionStorage.
- S13-1-9 API base override: parse from `?apiBase=` URL param on startup only.
- S13-1-10 Verification: static harness asserting zero localStorage refs in src/app, src/live; round-trip export/import; artifact sync.

### Plan 13-2
- S13-2-1 Remove slider DOM + JS handler + supporting UI code.
- S13-2-2 Extend clamp range to [0.25, 4.0] and update default/fit math if needed.
- S13-2-3 Wheel event handler on `#stage` with cursor-anchored focus computation.
- S13-2-4 Pinch gesture handler via PointerEvent tracking.
- S13-2-5 Pan arbitration: wheel/pinch suspends transition, pan still works with single pointer when scale > 1.
- S13-2-6 Verification: static checks + gate matrix; artifact sync.

### Plan 13-3
- S13-3-1 Relax `event.button !== 0` check or replace with `pointerType`-based guard.
- S13-3-2 Coarse-pointer hit radius: 22px minimum for touch/coarse.
- S13-3-3 CSS `touch-action: none` on the overlay.
- S13-3-4 Pinch gesture arbitration: active vertex drag pointer id blocks pinch capture.
- S13-3-5 Verification: static checks; artifact sync.

## Prioritized Execution Wave
- Wave 1: Plan 13-1 (foundation) — blocks 13-2 and 13-3.
- Wave 2: Plan 13-2 (zoom gestures).
- Wave 3: Plan 13-3 (touch polygon editing).
