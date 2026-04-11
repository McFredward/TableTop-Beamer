# P13-HF7-T2 Root Cause Isolation — Mobile Pan/Zoom Lag (Survived HF5 + HF6)

## Symptom
After HF5 (`4cdf2f9`) and HF6 (`dca8cf4`), users on mobile still see severe lag when panning or pinch-zooming the board. Reported severity: "seconds of delay before the motion catches up". HF5's rAF-throttle and HF6's cached stage geometry + transition guard visibly helped but did not eliminate the problem.

## Hot Path Inventory (after HF6)

### Per pointermove event (panning mode)
1. Stage capture pointermove handler (touch gesture state machine)
   - pointer type filter
   - `pinchPointers.has()` check
   - `Map.set(pointerId, {clientX, clientY})`
   - mode-branch evaluation — no work in `panning` mode
   → ~0.02 ms
2. Overlay pointermove handler (the existing pan logic)
   - `state.panMode.active` + `pointerId` match check
   - delta arithmetic
   - `scheduleZoomUpdate({panX, panY})`
   → ~0.03 ms

### Per rAF tick (from `scheduleZoomUpdate`)
1. `updateCurrentBoardZoom(partial)`
   - `clampPanToBounds` (arithmetic)
   - `setBoardZoom` (state.boardZoomByBoard write)
   - `syncBoardZoomPanel`
     - `syncPolygonHandleSizePanel` — 2 DOM writes (input value + span text)
     - `syncBoardZoomStatus` — SKIPPED via `touchGestureActive` guard (HF6)
     - `syncStageZoomTransform` — 3 CSS variable writes on `.stage`
   - `setPanCursorState` — SKIPPED via `touchGestureActive` guard (HF6)
2. `triggerFeedback.textContent` write when statusText present

Total DOM writes per rAF tick: 5. No forced reflows.

## Residual Lag — Three Concurrent Main-Thread Contenders

The hot path is already lean. The lag is not from the direct pan/zoom work itself. It is from the main thread being overloaded by OTHER concurrent work while the user gestures.

### Cause A: Main animation `draw()` loop runs at 60 Hz regardless of user intent
`src/app/runtime/runtime-orchestration.js:11764-11848`

```javascript
function draw(now) {
  ...
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pruneFinishedAnimations(now);
  drawOutsideFxLayer(now);
  ...
  for (const anim of state.runningAnimations) {
    ...
    const ok = drawAnimationSafely(anim, now);
    ...
  }
  ...
  requestAnimationFrame(draw);
}
```

- `drawOutsideFxLayer` — when a starfield outside-fx is active, draws HUNDREDS of stars/streaks/lanes per frame. See `drawEffectVisual("outside-space", ...)` lines 11487-11565: up to 4 parallax layers × up to 98 stars per layer plus express lanes.
- `drawAnimationSafely` loop — iterates all `state.runningAnimations`, calls coded/mp4/gif drawers. Each room animation pays `clipToRoom`, canvas save/restore, effect visual draw.

**This loop runs at display refresh rate on the main thread**, even when the user is on the Settings view trying to pan. On a low/mid-range mobile device, a single frame of heavy animation rendering can cost 20-40 ms. At 30 ms/frame, the main thread has ~50% capacity for everything else, input events queue up, and rAF callbacks for the pan update are delayed by multiple animation frames.

### Cause B: Live-sync poll every 120–250 ms
`src/app/runtime/runtime-orchestration.js:600-601, 937-951`

```javascript
const LIVE_POLL_FAST_MS = 120;
const LIVE_POLL_IDLE_MS = 250;
...
function scheduleNextLiveSnapshotPoll(delayOverrideMs = null) {
  ...
  liveSync.pollTimerId = window.setTimeout(() => {
    liveSync.pollTimerId = null;
    ...
  }, effectiveDelay);
}
```

Every 120–250 ms the client fetches `/api/live/snapshot` and runs `applyLiveRuntimeSnapshot()` on the result. `applyLiveRuntimeSnapshot` is massive — it hydrates board profiles, outside/inside FX, polygon state, running animations, etc. Even when nothing changed, the function iterates all BOARDS and rebuilds fields. On mobile this can take 10–30 ms per poll.

At 250 ms poll cadence = 4 polls/second × ~20 ms each = ~80 ms/second main-thread consumption just for polling. During a gesture, this competes with the pan rAF path.

### Cause C: No GPU layer promotion on `.stage`
`src/styles.css:92-112`

```css
.stage {
  ...
  transform: translate(var(--stage-pan-x), var(--stage-pan-y)) scale(var(--stage-zoom-scale));
  transform-origin: 50% 50%;
  transition: transform 120ms ease;
}
.stage.is-panning,
.stage.is-touch-gesture {
  transition: none;
}
```

No `will-change: transform`. No `contain`. Mobile browsers typically do NOT promote an element to its own composition layer unless the element has `will-change`, a 3D transform, a filter, or an animation. Without promotion, every CSS transform update on `.stage` forces the CPU to re-rasterize the entire subtree (board image + fx-canvas + room-overlay SVG). At a stage layout width of ~1200 px and a canvas backing store that size, this is expensive per frame on mobile — easily 10–20 ms per update.

This compounds with the per-rAF tick: the rAF write sets new CSS variables, the compositor must re-rasterize the stage subtree, which delays the next vsync, which delays the next rAF callback, which delays the next input event drain.

## Why HF5/HF6 Did Not Eliminate the Symptom
- HF5 collapsed pan/zoom updates to one rAF tick per frame. Effective, but the rAF tick is still stuck behind the main animation draw loop in frame scheduling and behind the poll-induced microtasks.
- HF6 removed forced reflows from the rAF callback itself. Effective, but did not address the CPU load from `draw()` + polling.
- Neither wave added GPU layer promotion.

The three causes above run concurrently on the main thread and together starve the gesture path.

## Fix Plan (feeds into P13-HF7-T3)

1. **GPU layer promotion** — add `will-change: transform` + `contain: paint` + a 3D translate hint on `.stage` so the stage lives in its own compositor layer. CSS transform updates become GPU-cheap, independent of the subtree's rasterization cost.

2. **Pause animation rendering during active touch gestures** — in `draw()`, when `touchGestureActive` is true, skip `drawOutsideFxLayer` + the `for (anim of runningAnimations)` loop. Clear the canvas and return. The gesture is brief; the user is actively interacting and not staring at animations. Resume on gesture end. This recovers ~20–40 ms of main-thread capacity per frame on mobile.

3. **Pause live-sync polling during active touch gestures** — when `touchGestureActive` becomes true, call `window.clearTimeout(liveSync.pollTimerId)` and set a `liveSync.pollingPausedForGesture = true` flag so subsequent scheduleNextLiveSnapshotPoll no-ops. On gesture end, clear the flag and call `scheduleNextLiveSnapshotPoll(0)` to resume. This recovers ~80 ms/second of main-thread capacity during gestures.

Each of the three fixes addresses an independent contender. Together they should eliminate the residual lag.

## Non-Regression Concerns
- Animation rendering pauses for the duration of the gesture (≤ 2 s typically). Users on Settings view are editing, not watching, so this is acceptable. On Dashboard view, gesture zoom is rarer — if needed a flag can gate this on `uiView === "settings"`.
- Live-sync polling pause means config broadcasts from peers are delayed by ≤ 2 s. Phase 13-HF3 opt-in-save already gates remote application on dirty flag, so no conflict.
- The WebSocket `global-config-update` listener still fires — only HTTP polling is paused.
- `will-change: transform` consumes some GPU memory. On the single `.stage` element this is negligible.
