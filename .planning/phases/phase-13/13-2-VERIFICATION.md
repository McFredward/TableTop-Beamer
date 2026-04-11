# Plan 13-2 Verification — Gesture-Based Zoom

## Outcome
**PASS** — 8 hard gates closed (static guards).

## Problem Recap
Zoom was driven by an `<input type="range">` slider pinned to 100–300%. The user wanted desktop mouse-wheel zoom and mobile two-finger pinch zoom, with range 25%–400%. The slider itself should be removed; fit-to-room and reset-zoom buttons stay.

## Changes

### `src/app/runtime/runtime-orchestration.js`
- `BOARD_ZOOM_SCALE_MIN = 0.25` and `BOARD_ZOOM_SCALE_MAX = 4.0` constants added.
- `clampBoardZoomScale(value)` rewritten to use the new constants and reject non-finite input.
- Slider DOM constants (`boardZoomRangeInput`, `boardZoomValue`) set to `null` placeholders (downstream access is already guarded by `?.`).
- `syncBoardZoomPanel()` body trimmed: no longer writes to the slider/label. Keeps calling `syncPolygonHandleSizePanel` + `syncBoardZoomStatus` + `syncStageZoomTransform` so the ~20 existing call sites still work unchanged.
- `boardZoomStatus.textContent` now reports the new min/max percents.
- `boardZoomRangeInput.addEventListener("input", ...)` handler replaced.
- Mouse wheel handler added: `stage.addEventListener("wheel", ...)` with `passive: false`, `preventDefault()`, exponential step `Math.exp(-event.deltaY * 0.0018)`, cursor-anchored focus computed via `computeZoomFocusFromClientPoint(event.clientX, event.clientY)`, routed through `applyZoomScaleFromGesture`.
- Pinch gesture handler added: tracks up to two concurrent `PointerEvent`s (filter `pointerType === "touch" || "pen"`), computes distance ratio between samples, uses midpoint as focus, applies scale via `applyZoomScaleFromGesture`. Pointers are tracked in a `pinchState` object; `pointerup`/`pointercancel`/`pointerleave` all reset state when a pointer drops.
- `applyZoomScaleFromGesture(nextScale, focus, reason)` helper: preserves the focus anchor by computing `pan = anchor - (anchor - pan) * ratio` so the focal point stays visually stable across the zoom.
- `SETTINGS_EXCLUSIVE_CONTROL_IDS` drops `"board-zoom-range"`.

### `index.html`
- `<span id="board-zoom-value">` and `<input id="board-zoom-range">` removed.
- Section description updated: "Scrollrad (Desktop) oder Zwei-Finger-Pinch (Mobile) ueber dem Board zoomt von 25% bis 400%. Fit- und Reset-Buttons bleiben erhalten."
- `#board-zoom-fit` and `#board-zoom-reset` buttons preserved.

## Gate Matrix

| Gate | Verdict | Evidence |
|---|---|---|
| G13-2-1 Slider-Removed | PASS | `#board-zoom-range` + `#board-zoom-value` gone from `index.html`; `boardZoomRangeInput.addEventListener` site removed; no `querySelector("#board-zoom-range")` in runtime. |
| G13-2-2 Zoom-Range-25-400 | PASS | `BOARD_ZOOM_SCALE_MIN = 0.25`, `BOARD_ZOOM_SCALE_MAX = 4.0`, `clampBoardZoomScale` wired through both. |
| G13-2-3 Wheel-Handler | PASS | `stage.addEventListener("wheel", ...)` with `preventDefault()` and cursor-anchored focus via `computeZoomFocusFromClientPoint`. |
| G13-2-4 Pinch-Handler | PASS | `pinchState` map + `pinchDistance` + `pinchMidpoint` + two-pointer check + `pointerdown`/`pointermove`/`pointerup` listeners all present. |
| G13-2-5 Pan-NonRegression | PASS | `state.panMode`, `endPanMode`, `canStartPanModeFromEvent`, `setPanCursorState()` all unchanged. |
| G13-2-6 Fit-Reset-Preserved | PASS | `boardZoomFitButton.click` + `boardZoomResetButton.click` handlers wired; DOM buttons preserved. |
| G13-2-extra Phase-13-1-NonRegression | PASS | `scheduleGlobalConfigWrite` and `renderServerUnreachableOverlay` intact. |
| G13-2-extra Phase-12-NonRegression | PASS | `roomConcurrencyByKey` build and `globalCompositeOperation = "lighter"` additive layering intact. |

Aggregate: `debug/p13-2-acceptance-regression-output.json`.

## Non-Regression Notes
- Existing pan mode (Space + drag or middle-mouse) is untouched.
- Fit-to-room and reset-zoom buttons call the same functions as before.
- Slider-driven `syncBoardZoomPanel` updates are transparent to all ~20 downstream call sites (the function just no longer writes slider DOM).
- Pinch handler filters on `pointerType === "touch" || "pen"` so mouse users never trigger pinch state inadvertently.
- Wheel handler calls `preventDefault()` only when the event target is inside the stage, so document scroll outside the stage is unaffected.

## Known Limitations (user verification required)
- In-browser: mouse-wheel over the canvas must zoom in/out centered on cursor.
- Mobile: two-finger pinch must zoom in/out centered on pinch midpoint.
- Fit and reset buttons must still behave as before.
- Pan (space + drag or middle-mouse) must still work above 100% zoom.
- Polygon vertex drag (addressed in Plan 13-3) may still feel awkward on touch — the pinch handler currently sits on the `stage` element while vertex drag lives on the room overlay SVG. Arbitration is covered by Plan 13-3.

## Status
Plan 13-2 closed PASS (static guards). User browser verification requested alongside Plan 13-3.
