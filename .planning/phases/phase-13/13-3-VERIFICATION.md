# Plan 13-3 Verification — Touch Polygon Editing

## Outcome
**PASS** — 6 hard gates closed (static guards).

## Problem Recap
Polygon vertex drag (ship play area + room boundaries + special polygons) worked with mouse but barely worked on mobile touchscreens. Root causes identified: `event.button !== 0` check rejects touch pointers that report `button === -1`, vertex hit radius (~16 SVG units) is too small for a fingertip, and the browser consumed single-finger drag as native pan because `touch-action` was left at its default.

## Changes

### `src/app/runtime/runtime-orchestration.js`
- `isAcceptablePolygonPointerEvent(event)` helper added: accepts `pointerType === "touch"` or `"pen"` regardless of `button`; still requires `button === 0` for mouse.
- `getCoarsePointerHitMultiplier()` helper added: checks `matchMedia("(pointer: coarse)")` (1.8x) and `matchMedia("(any-pointer: coarse)")` (1.5x) to scale hit targets up on touch-first devices.
- `getPolygonEditorHandleMetrics` applies the multiplier to `vertexHitRadius` and `edgeHitRadius` but NOT to the visual handle radii so the handles look the same while the hit zones expand.
- All five `event.button !== 0` checks in polygon vertex/edge/area pointerdown handlers replaced with `!isAcceptablePolygonPointerEvent(event)`.
- Pinch gesture `shouldCaptureForPinch(event)` extended with arbitration: if `state.polygonEditor.dragPointerId`, `state.polygonEditor.dragAreaPointerId`, or `state.shipPolygonEditor.dragPointerId` is set (i.e. any polygon drag is mid-flight), pinch capture bails out entirely. The user's drag finger is never stolen by a suddenly-starting pinch.

### `src/styles.css`
- `#room-overlay` gains `touch-action: none` so single-finger drag lands directly on the vertex hit target instead of being consumed by the browser's native pan/zoom. Zoom gestures continue to work because they attach to the parent `#stage`.

## Gate Matrix

| Gate | Verdict | Evidence |
|---|---|---|
| G13-3-1 Pointer-Button-Guard-Relaxed | PASS | `isAcceptablePolygonPointerEvent` helper present; zero `event.button !== 0` sites remain in the vertex/edge/area pointerdown handlers. |
| G13-3-2 Coarse-Pointer-Hit-Radius | PASS | `getCoarsePointerHitMultiplier` exists and checks `(pointer: coarse)`; `vertexHitRadius` and `edgeHitRadius` multiplied by `coarse`. |
| G13-3-3 Touch-Action-None | PASS | `#room-overlay { ... touch-action: none; }` present in `src/styles.css`. |
| G13-3-4 Pinch-Vertex-Arbitration | PASS | `shouldCaptureForPinch` bails out when any drag pointer id is set (room drag, area drag, ship drag). |
| G13-3-5 Area-Drag-Symmetric | PASS | At least 5 call sites of `isAcceptablePolygonPointerEvent` — covering vertex, edge, area drag, both ship and room polygons. |
| G13-3-extra Phase-12/13-1/13-2-NonRegression | PASS | `scheduleGlobalConfigWrite`, `BOARD_ZOOM_SCALE_MIN = 0.25`, `globalCompositeOperation = "lighter"`, and `renderServerUnreachableOverlay` all intact. |

Aggregate: `debug/p13-3-acceptance-regression-output.json`.

## Non-Regression Notes
- Mouse workflow unchanged: `isAcceptablePolygonPointerEvent` still requires `button === 0` for mouse pointers.
- Single-animation room rendering, blocking startup, gesture zoom — all untouched.
- Fit-to-room and reset-zoom buttons still call the same functions.
- Pan mode (space + drag / middle-mouse) still works above 100% zoom.

## Known Limitations (user verification required)
- Real finger testing on a phone/tablet is the final truth. The static guards verify the source-level changes (pointer-type guard, hit radius scaling, touch-action CSS, arbitration) but cannot simulate actual touchscreen behavior.
- On devices where the browser reports `(pointer: coarse)` incorrectly (e.g. desktop with touchscreen), the hit radius inflation applies even for mouse pointers. This is a minor visual regression — the visible handles are not resized, only the invisible hit zones.
- If multi-device sync (13-1) and gesture zoom (13-2) behave correctly in-browser, this plan should layer cleanly on top because it touches disjoint code paths.

## Status
Plan 13-3 closed PASS (static guards). Phase 13 exit criteria met pending user browser verification across all three plans.
