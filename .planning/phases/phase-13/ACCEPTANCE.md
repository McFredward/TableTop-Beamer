# Phase 13 Acceptance

## Verification Strategy
- Root-cause first: the current browser-persistence model is enumerated and documented before any removal lands.
- Server-authority first: server write + live-sync broadcast is proven before client-side persistence is removed.
- Non-regression first: Phase 11 HF6 seen-once retention and Phase 12 additive layering remain PASS.
- UX verification: zoom gestures and touch polygon edits are verified in-browser by the user after static guards land.

## Hard Gates

### Plan 13-1 — Server-Authoritative Config
- G13-1-1 NoLocalStorage-Static-Gate: zero `localStorage`/`indexedDB` references remain under `src/app/**` and `src/live/**` runtime code (ignoring test harnesses and docs).
- G13-1-2 Server-Write-Path-Gate: `POST /api/global-defaults` writes the file atomically and triggers live-sync broadcast.
- G13-1-3 Debounced-Client-Write-Gate: `scheduleGlobalConfigWrite` exists with a 200ms debounce; all legacy `persistBoardProfiles()` call sites route through it.
- G13-1-4 Blocking-Startup-Gate: `fetchGlobalDefaultsOrBlock()` replaces localStorage hydration; on failure shows an error banner with a Retry button; no fallback to cached data.
- G13-1-5 Redundant-Buttons-Removed-Gate: `#save-global-defaults` and `#load-apply-global-defaults` are gone from `index.html` and no handler references remain.
- G13-1-6 Export-Import-Round-Trip-Gate: Export JSON + Import JSON round-trip produces an equivalent server snapshot.
- G13-1-7 Settings-Subtab-SessionStorage-Gate: subtab memory uses `sessionStorage` only.
- G13-1-8 API-Base-URL-Param-Gate: `?apiBase=...` URL query is the only override surface; no `localStorage` reads/writes for this key.
- G13-1-9 Phase-11-HF6-NonRegression-Gate: `activeSeenOneShotRunByTriggerRevision` retention and `observeGlobalStopRevisions`/`observeGlobalClearRevision` wiring remain intact.
- G13-1-10 Phase-12-AdditiveLayering-NonRegression-Gate: `roomConcurrencyByKey` build in `draw()` and `globalCompositeOperation = "lighter"` guard in `drawAnimation()` remain intact.

### Plan 13-2 — Gesture-Based Zoom
- G13-2-1 Slider-Removed-Gate: `#board-zoom-range` and `#board-zoom-value` not present in `index.html`.
- G13-2-2 Zoom-Range-25-400-Gate: `clampBoardZoomScale` enforces `[0.25, 4.0]`.
- G13-2-3 Wheel-Handler-Gate: wheel event handler is wired to the stage element with cursor-anchored focus.
- G13-2-4 Pinch-Handler-Gate: two-pointer pinch handler tracks pointer pairs with midpoint focus.
- G13-2-5 Pan-NonRegression-Gate: single-pointer pan still works when scale > 1 (no regressions to existing pan code).
- G13-2-6 Fit-Reset-Preserved-Gate: `#board-zoom-fit` and `#board-zoom-reset` remain wired and functional.

### Plan 13-3 — Touch Polygon Editing
- G13-3-1 Pointer-Button-Guard-Relaxed-Gate: polygon `pointerdown` handlers accept touch events (`pointerType === "touch"`) even if `event.button !== 0`.
- G13-3-2 Coarse-Pointer-Hit-Radius-Gate: vertex hit radius upgrades to ≥ 22px CSS pixels for coarse/touch pointers.
- G13-3-3 Touch-Action-None-Gate: `touch-action: none` applied to the room overlay so the browser does not consume the gesture.
- G13-3-4 Pinch-Vertex-Arbitration-Gate: an active vertex drag on pointer X blocks pinch gesture from stealing X.
- G13-3-5 Area-Drag-Symmetric-Gate: the same touch-friendly changes apply to area-drag (moving an entire polygon).

## Strict Regression Matrix
- P13-1-NoLocalStorage-Static-Test
- P13-1-Server-Write-Broadcast-Test
- P13-1-Debounced-Write-Cadence-Test
- P13-1-Blocking-Startup-Error-Banner-Test
- P13-1-Export-Import-Round-Trip-Test
- P13-1-Phase-11-HF6-NonRegression-Test
- P13-1-Phase-12-AdditiveLayering-NonRegression-Test
- P13-2-Slider-Removed-Test
- P13-2-Zoom-Range-Test
- P13-2-Wheel-Handler-Test
- P13-2-Pinch-Handler-Test
- P13-2-Pan-NonRegression-Test
- P13-3-Pointer-Button-Guard-Test
- P13-3-Coarse-Pointer-Hit-Radius-Test
- P13-3-Touch-Action-None-Test
- P13-3-Pinch-Vertex-Arbitration-Test

## Incremental Mandatory Gates
- After P13-1-T1..T3: inventory + server write path + debounced client helper are PASS.
- After P13-1-T4..T6: persistence replacement + blocking startup + button removal are PASS.
- After P13-1-T7..T9: import-from-file + sessionStorage subtab + URL param api base are PASS.
- After P13-1-T10: closure + artifact sync complete.
- After P13-2-T1..T4: slider removal + range extension + wheel + pinch handlers are PASS.
- After P13-2-T5..T6: pan non-regression + verification closure complete.
- After P13-3-T1..T4: touch gates PASS.
- After P13-3-T5: closure + artifact sync complete.

## Definition of Done
- All hard gates PASS.
- No browser persistent storage remains in runtime code.
- Wheel + pinch zoom are present, sliders gone, zoom range 25%-400%.
- Touch polygon drag works in static guards (user verifies live).
- Phase and global trackers fully synchronized.

## Plan Evidence References (produced during execution)
- `.planning/phases/phase-13/13-1-VERIFICATION.md`
- `.planning/phases/phase-13/13-2-VERIFICATION.md`
- `.planning/phases/phase-13/13-3-VERIFICATION.md`
- `debug/p13-1-acceptance-regression-output.json`
- `debug/p13-2-acceptance-regression-output.json`
- `debug/p13-3-acceptance-regression-output.json`
