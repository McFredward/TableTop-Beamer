# Phase 13 Plan (Server-Authoritative Config + Gesture Zoom + Touch Polygon Editing)

## Planning Mode Note
- Phase 12 closed PASS at Plan 12-1.
- Phase 13 opens with three independent plans; 13-1 is the execute-ready priority because it changes storage foundations that 13-2 and 13-3 otherwise have to work around.

## Mandatory Objectives (binding)

### Plan 13-1 Server-Authoritative Config
1. No browser-side persistent storage. `localStorage` and `indexedDB` are not used by the runtime anywhere under `src/`. `sessionStorage` is only used for the ephemeral Settings subtab memory.
2. `config/global-defaults.json` on the server is the single source of truth for all persistent config.
3. Every config mutation (slider, toggle, polygon edit, zoom/pan, room edit, animation definition edit, etc.) emits to the server with a debounced ~200ms write cadence. Server persists to `config/global-defaults.json` atomically and fans out to all connected clients via the existing live-sync channel.
4. Server unreachable at startup → the client blocks with an explicit error UI ("Server nicht erreichbar — Retry"). No static-file fallback, no degraded mode.
5. The "Save to global defaults" button and the "Load and apply defaults" button are removed from the DOM and from the handler code.
6. Export-to-file (JSON download) remains. New: import-from-file (JSON upload) is added, which overwrites the server global config and broadcasts the new state to all clients.
7. The existing live-sync fan-out (`applyLiveRuntimeSnapshot`) continues to be the authoritative client-side apply path.
8. Loop / stop / clear / animation lifecycle (Phase 11 HF6 contracts, Phase 12 additive layering) remain non-regressed.

### Plan 13-2 Gesture-Based Zoom
1. The `#board-zoom-range` slider and its value label are removed from the DOM.
2. Desktop: mouse wheel over the stage zooms centered on the cursor position.
3. Mobile: two-finger pinch gesture on the stage zooms centered on the pinch midpoint.
4. Zoom range is 25% to 400% (0.25 to 4.0 scale). Pan is clamped so the board stays visible.
5. Fit-to-room and reset-zoom buttons remain available.
6. The existing single-finger pan gesture (active when scale > 1) is preserved.
7. The new pinch gesture takes priority when two pointers are active; single-finger drag/pan is suspended during pinch.
8. Vertex-drag editing (Plan 13-3) and pinch gesture must arbitrate — pinch cannot steal an active vertex drag and vice versa.

### Plan 13-3 Touch Polygon Editing
1. Polygon vertex drag (ship play area + room boundaries + special polygons) works reliably with a finger on a touchscreen.
2. Vertex hit-test radius scales up for coarse pointer types (`pointerType === "touch"` or `pointer: coarse`).
3. `event.button !== 0` check on `pointerdown` is relaxed for touch (touch events may report `button === -1` on some browsers).
4. `touch-action: none` CSS on the overlay elements so the browser does not consume the gesture for native pan/zoom.
5. Single-finger drag begins a vertex drag when it lands on a vertex hit target; two-finger pinch (from 13-2) takes over zoom only if the drag has not already captured the first pointer.
6. Area-drag (moving an entire polygon) follows the same rules.

## Target State
Phase 13 exits when:
1. No `localStorage` / `indexedDB` references remain in `src/` runtime or shared modules (search returns zero matches except documentation and export-payload parity tests).
2. Every persistent config mutation round-trips through the server, and all connected clients see the new state within ~200ms + live-sync latency.
3. Server unreachable blocks the app with an explicit error banner.
4. The zoom slider is gone; wheel/pinch gestures produce identical zoom semantics in the 25%-400% range with correct cursor/midpoint anchoring.
5. A user can drag a polygon vertex with a finger on a mobile device without the browser stealing the gesture or the hit target being too small.

## Binding Product Decisions
- Server is the single source of truth for all persistent config. The client is a pure view/mutator.
- Live-sync is extended to be the write channel too (or parallel: debounced POST to `/api/global-defaults` or a new `/api/global-defaults/mutate` endpoint — TBD during T2 design). Server writes `config/global-defaults.json` atomically and broadcasts the new snapshot via the existing live-sync fan-out.
- The debounce window is 200ms. Multiple mutations within that window collapse into a single server write.
- Optimistic UI: the local `state.*` updates immediately on user action; the server write trails.
- Export: file download of the current server snapshot (same payload as before).
- Import: file upload replaces the server global config atomically, then broadcasts to all clients.
- Zoom slider is removed. Wheel + pinch gestures replace it entirely.
- Zoom is centered on the gesture anchor (cursor for wheel, pinch midpoint for pinch).
- Touch-friendly hit radius: at least 22px CSS pixels for touch / coarse pointers, scaled inversely by zoom to remain consistent in canvas space.

## Scope (Plans 13-1, 13-2, 13-3 — execute-ready, sequential)

### Plan 13-1 — Server-Authoritative Config
Scope:
- Inventory + RED baseline: static harness enumerating every `localStorage.*` / `indexedDB.*` / `window.localStorage` reference under `src/`.
- Server-side: extend `POST /api/global-defaults` (or add new path) to be the single mutation endpoint. Preserve atomic file write. Broadcast to live-sync peers on success.
- Client-side: add a single `scheduleGlobalConfigWrite()` function with a 200ms debounce that serializes the current relevant state and POSTs to the server. Replace every `persistBoardProfiles()` / localStorage-write call with a call to this scheduler.
- Replace `loadBoardProfiles()` hydration with a blocking `fetchGlobalConfigOrBlock()` at startup; on failure show an error banner and a Retry button.
- Remove the "Save to global defaults" button (`#save-global-defaults`) and its handler.
- Remove the "Load and apply defaults" button (`#load-apply-global-defaults`) and its handler.
- Keep Export-to-file (`#export-global-defaults`) — it now just serializes the live server snapshot from client state.
- Add Import-from-file (new button) — user picks a JSON file, client POSTs it as the new global config, server writes and broadcasts.
- Settings subtab memory moves from `localStorage` (`tt-beamer.settings-subtab.v1`) to `sessionStorage`.
- `API_BASE_STORAGE_KEY` localStorage override is replaced with a URL query parameter (`?apiBase=...`) or removed entirely if unused. Decision during T9.
- Non-regression: live-sync still applies server snapshots via `applyLiveRuntimeSnapshot`; Phase 11 HF6 seen-once retention and Phase 12 additive layering remain untouched.

### Plan 13-2 — Gesture-Based Zoom
Scope:
- Remove `#board-zoom-range` slider + `#board-zoom-value` label from DOM and JS handler.
- Extend `clampBoardZoomScale` range to `[0.25, 4.0]`.
- Add a `wheel` event handler on the stage that computes a focus point from `event.clientX/Y`, applies a scale delta (0.1 per wheel tick, exponential), calls `updateCurrentBoardZoom(...)`.
- Add a two-pointer pinch handler (pointerdown tracking, pointermove distance computation) that applies a scale delta proportional to distance ratio with midpoint as focus.
- CSS: disable stage transition during wheel/pinch gestures (same pattern as existing pan `.is-panning`).
- Pan logic: still works when scale > 1, uses single pointer drag as today.
- Fit-to-room and reset-zoom buttons remain wired.

### Plan 13-3 — Touch Polygon Editing
Scope:
- Drop or relax `event.button !== 0` check in polygon `pointerdown` handlers (allow `button === -1` for touch or check `event.pointerType` instead).
- Touch-scaled vertex hit radius: `pointerType === "touch"` → minimum 22px; other pointers keep existing 16px floor.
- `touch-action: none` on the room overlay SVG container.
- Ensure pinch gesture (from 13-2) checks that no active vertex drag is in progress before capturing both pointers.
- Ensure single-finger vertex drag does not trigger pinch (isPrimary/pointerCount check).

## Out of Scope
- New animation content packs.
- UX redesign beyond removing the slider and save/load buttons.
- Protocol rewrites beyond the debounced global-config mutation path.
- Board import from image (existing import flow).

## Prioritized Next Execution Wave

### Plan 13-1 Tasks (P0, execute-ready)
1. P13-1-T1 [P0] RED baseline: harness enumerating all localStorage/indexedDB references in src/.
2. P13-1-T2 [P0] Server: atomic `writeGlobalDefaults` path + existing `POST /api/global-defaults` confirmed as single write endpoint; extend to broadcast via live-sync fan-out.
3. P13-1-T3 [P0] Client: `scheduleGlobalConfigWrite()` (200ms debounce) + thin `emitGlobalConfigMutation()` wrapper.
4. P13-1-T4 [P0] Replace all `persistBoardProfiles()` / localStorage-writes with calls to the new scheduler.
5. P13-1-T5 [P0] Blocking startup hydration: `fetchGlobalDefaultsOrBlock()` + error banner + Retry button.
6. P13-1-T6 [P0] Remove Save + Load-and-apply buttons from DOM and JS handlers.
7. P13-1-T7 [P0] Import-from-file button: accept a JSON upload, POST as new global config, server broadcasts.
8. P13-1-T8 [P0] Settings subtab → sessionStorage (ephemeral).
9. P13-1-T9 [P0] `API_BASE_STORAGE_KEY` → URL param only.
10. P13-1-T10 [P0] Verification: static harness asserting zero localStorage references in src/ runtime/ shared/; export payload round-trip preserved; artifact sync.

### Plan 13-2 Tasks (P0, after 13-1 PASS)
1. P13-2-T1 [P0] Remove `#board-zoom-range` + `#board-zoom-value` from index.html and their handlers in runtime-orchestration.js.
2. P13-2-T2 [P0] Extend zoom range to `[0.25, 4.0]`; update `clampBoardZoomScale` and all clamp sites.
3. P13-2-T3 [P0] Mouse wheel handler on stage with cursor-anchored focus.
4. P13-2-T4 [P0] Two-pointer pinch handler with midpoint-anchored focus.
5. P13-2-T5 [P0] CSS: disable stage transition while wheel/pinch active.
6. P13-2-T6 [P0] Verification: static checks + manual matrix note; artifact sync.

### Plan 13-3 Tasks (P0, after 13-2 PASS)
1. P13-3-T1 [P0] Relax `event.button !== 0` check in polygon pointerdown handlers (use `pointerType`-based gate).
2. P13-3-T2 [P0] Increase vertex hit radius for coarse/touch pointers to >= 22px CSS.
3. P13-3-T3 [P0] `touch-action: none` on room-overlay SVG container.
4. P13-3-T4 [P0] Pinch↔vertex-drag arbitration: active vertex drag blocks pinch gesture capture.
5. P13-3-T5 [P0] Verification: static checks; artifact sync.

## Milestones
1. M1 Plan 13-1 Server-Authoritative Config Closure.
2. M2 Plan 13-2 Gesture Zoom Closure.
3. M3 Plan 13-3 Touch Polygon Editing Closure.
4. M4 Phase 13 Exit: no browser persistent storage, gesture zoom live, touch polygon drag reliable.

## Regression/Evidence Matrix Policy
- P13-1-NoLocalStorage-Static-Test
- P13-1-Server-Authoritative-Write-Test
- P13-1-Debounced-Mutation-Cadence-Test
- P13-1-Blocking-Startup-On-Server-Unreachable-Test
- P13-1-Export-Import-Round-Trip-Test
- P13-1-Live-Sync-Broadcast-NonRegression-Test
- P13-2-No-Slider-Static-Test
- P13-2-Zoom-Range-25-400-Test
- P13-2-Wheel-Handler-Present-Test
- P13-2-Pinch-Handler-Present-Test
- P13-2-Pan-NonRegression-Test
- P13-3-Touch-Polygon-Drag-Contract-Test
- P13-3-Coarse-Pointer-Hit-Radius-Test
- P13-3-Touch-Action-None-Test
- P13-3-Pinch-Vertex-Arbitration-Test
- P13-NonRegression-Phase-11-HF6-SeenOnce-Preserved
- P13-NonRegression-Phase-12-AdditiveLayering-Preserved

## Definition of Done
- Plan 13-1 gates G13-1-1..G13-1-10 are PASS.
- Plan 13-2 gates G13-2-1..G13-2-6 are PASS.
- Plan 13-3 gates G13-3-1..G13-3-5 are PASS.
- Zero `localStorage` / `indexedDB` references remain in `src/` runtime/shared code.
- Gesture zoom works for wheel + pinch across 25%-400%.
- Touch polygon drag is reliable on mobile (static guards + user-verified in-browser).
- Phase and global trackers fully synchronized.
