# Phase 13 Tasks

Status legend: TODO | IN-PROGRESS | DONE | REJECTED
Priority labels: [P0] critical | [P1] high | [P2] medium

## Plan 13-1 - Server-Authoritative Config (CLOSED PASS — static guards)

Closure evidence: `.planning/phases/phase-13/13-1-VERIFICATION.md`, `debug/p13-1-acceptance-regression-output.json`. In-browser verification requested before Plan 13-2 starts.

- [x] DONE P13-1-T1 [P0] RED inventory harness enumerating every `localStorage.*`/`indexedDB.*`/`sessionStorage.*` reference under `src/` (runtime, app, shared, live).
- [x] DONE P13-1-T2 [P0] Server-side write path confirmed: `POST /api/global-defaults` writes `config/global-defaults.json` atomically and triggers live-sync broadcast to all connected clients.
- [x] DONE P13-1-T3 [P0] Client `scheduleGlobalConfigWrite(reason)` helper with 200ms debounce that serializes the relevant state slice and POSTs to the server; optimistic local apply + trailing server write.
- [x] DONE P13-1-T4 [P0] Replace every `persistBoardProfiles()` / `localStorage.setItem(...)` call site in runtime/shared with `scheduleGlobalConfigWrite(reason)`.
- [x] DONE P13-1-T5 [P0] Blocking startup hydration: `fetchGlobalDefaultsOrBlock()` replaces `loadBoardProfiles()`; renders explicit error banner + Retry on failure.
- [x] DONE P13-1-T6 [P0] Remove `#save-global-defaults` and `#load-apply-global-defaults` buttons (DOM + handlers).
- [x] DONE P13-1-T7 [P0] Add Import-from-file button: JSON file picker POSTs the full payload to the server which atomically replaces the global config and broadcasts.
- [x] DONE P13-1-T8 [P0] Settings subtab memory: migrate `tt-beamer.settings-subtab.v1` from `localStorage` to `sessionStorage`.
- [x] DONE P13-1-T9 [P0] `API_BASE_STORAGE_KEY` retired: parse from `?apiBase=` URL query parameter on startup only; remove `localStorage.setItem/getItem` for this key.
- [x] DONE P13-1-T10 [P0] FAIL→PASS verification: static harness assert zero `localStorage`/`indexedDB` references in `src/app/**` and `src/live/**`; export/import round-trip; create `13-1-VERIFICATION.md`; sync `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 13-2 - Gesture-Based Zoom (blocked on 13-1 PASS)
- [ ] TODO P13-2-T1 [P0] Remove `#board-zoom-range` slider and `#board-zoom-value` label from `index.html`; remove their handlers in `runtime-orchestration.js`.
- [ ] TODO P13-2-T2 [P0] Extend zoom range to `[0.25, 4.0]` — update `clampBoardZoomScale` and all clamp/fit call sites.
- [ ] TODO P13-2-T3 [P0] Mouse wheel handler on stage (desktop): cursor-anchored focus, exponential scale step, preventDefault, calls `updateCurrentBoardZoom` with debounced server write.
- [ ] TODO P13-2-T4 [P0] Two-pointer pinch handler (mobile/tablet): tracks two PointerEvents, midpoint focus, distance-ratio scale delta.
- [ ] TODO P13-2-T5 [P0] CSS: disable stage transition during wheel/pinch gesture (reuse `.is-panning` or new class); preserve existing pan behavior.
- [ ] TODO P13-2-T6 [P0] Verification: static harness asserting slider removed + wheel/pinch handlers present + range extended + pan non-regression; create `13-2-VERIFICATION.md`; artifact sync.

## Plan 13-3 - Touch Polygon Editing (blocked on 13-2 PASS)
- [ ] TODO P13-3-T1 [P0] Relax `event.button !== 0` check in polygon vertex `pointerdown` handlers: accept `button === 0 || event.pointerType === "touch"` (touch events sometimes report `button === -1`).
- [ ] TODO P13-3-T2 [P0] Coarse-pointer hit radius: `event.pointerType === "touch"` or `pointer: coarse` → at least 22px CSS pixel hit radius, scaled inversely by zoom to stay constant in screen space.
- [ ] TODO P13-3-T3 [P0] `touch-action: none` on the `#room-overlay` SVG container so the browser does not consume single-finger drag as native pan.
- [ ] TODO P13-3-T4 [P0] Pinch ↔ vertex-drag arbitration: if a vertex drag is in progress on `pointerId X`, a second pointer triggering pinch must NOT steal `X`; pinch tracks its own pointer pair.
- [ ] TODO P13-3-T5 [P0] Verification: static harness for DOM/JS changes + create `13-3-VERIFICATION.md`; artifact sync.

## Phase 13 Closure
- [ ] TODO P13-CLOSURE [P0] Cross-plan non-regression: Phase 11 HF6 seen-once retention and Phase 12 additive layering still static-PASS; create phase-level closure note in `ROADMAP.md` + `STATE.md`.
