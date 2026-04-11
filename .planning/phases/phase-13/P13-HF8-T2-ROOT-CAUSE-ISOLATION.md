# P13-HF8-T2 Root Cause Isolation — Polygon Drag Lag (Survived HF7)

## Symptom
After HF7 (`67fef9d`) mobile pan/zoom is smooth, but dragging a room or polygon vertex/edge stays laggy. Same "seconds of delay" profile under heavy drag.

## Hot Path — Drag pointermove

The roomOverlay pointermove handler at `src/app/runtime/runtime-orchestration.js:13214-13298` has three drag branches:

### Ship polygon vertex drag
```javascript
// ~13227
if (state.shipPolygonEditor.dragVertexIndex !== null && state.uiView === "settings") {
  ...
  const points = getShipPolygonPoints(boardId);
  const [x, y] = getNormalizedOverlayPoint(event);
  points[state.shipPolygonEditor.dragVertexIndex] = [x, y];
  setShipPolygonPoints(boardId, points);
  state.shipPolygonEditor.dragMoved = true;
  renderRoomOverlay();                       // ← FULL SVG REBUILD
  syncShipPolygonEditorStatus();
  return;
}
```

### Room area drag
```javascript
// ~13246
if (state.polygonEditor.dragAreaPointerId !== null && state.uiView === "settings") {
  ...
  setSpecialPolygonPoints(boardId, roomId, shifted);
  state.polygonEditor.dragAreaMoved = state.polygonEditor.dragAreaMoved || moved;
  renderRoomOverlay();                       // ← FULL SVG REBUILD
  syncPolygonEditorStatus();
  return;
}
```

### Room polygon vertex drag
```javascript
// ~13276
...
setSpecialPolygonPoints(boardId, roomId, points);
state.polygonEditor.dragMoved = true;
renderRoomOverlay();                         // ← FULL SVG REBUILD
syncPolygonEditorStatus();
```

All three call `renderRoomOverlay()` synchronously per pointermove event.

## Cost of `renderRoomOverlay()` per call

`src/app/runtime/runtime-orchestration.js:8941-8980` starts with:
```javascript
roomOverlay.replaceChildren();
```
and then iterates `board.rooms`, creating for each room:
- a `<polygon class="room-zone">` with `click` and `pointerdown` listeners
- via `renderPolygonEditorHandles()`: for each vertex a `<g>` containing 3 SVG nodes (hit target, handle, label) and for each edge another `<g>` with 2 nodes
- via `renderShipPolygonEditorHandles()`: the same structure for the ship play area

For a typical Settings-view board with 6–10 rooms × 8 vertices each, plus ship polygon handles, that's roughly **200–400 SVG nodes created per call**, each with attribute sets and event listeners. On mobile this costs 5–15 ms per call.

At a touch input rate of 120 Hz = ~12 000 node operations/s and 600–1800 ms/s of main-thread DOM work. That saturates the main thread and produces the multi-second lag profile the user reports.

HF7's `draw()` pause and `scheduleNextLiveSnapshotPoll` gate are both keyed on `touchGestureActive`. For a mouse drag on desktop and for the HF4 touch gesture state machine's committed polygon drag path, `touchGestureActive` either is never set or gets cleared when the touch state machine transitions to `drag` mode. Either way, HF7's pauses don't cover the drag phase.

## Why HF5/HF6/HF7 Did Not Eliminate the Symptom
- HF5 rAF-throttled only the pan/zoom write path, not `renderRoomOverlay`.
- HF6 cached stage geometry and disabled the CSS transition during touch gestures. The drag path still rebuilds the SVG subtree synchronously.
- HF7 paused `draw()` + polling while `touchGestureActive` was true. The mouse drag path never flips that flag; the touch press-and-hold drag path leaves drag state active after the touch state machine transitions out of its own gesture.

## Fix Plan (feeds into P13-HF8-T3)

1. **`polygonDragActive` flag** — a module-level boolean flipped true inside every `begin*Drag` helper (`beginShipPolygonVertexDrag`, `beginPolygonVertexDrag`, `beginPendingPolygonAreaDrag`, `beginPolygonAreaDrag`) and cleared inside every `finish*` / `cancel*` / `clearPending*` helper. Ensures any mouse or touch drag, on any drag type, turns on the flag.

2. **Gate `draw()` and `scheduleNextLiveSnapshotPoll` on `touchGestureActive || polygonDragActive`** — reuses HF7's pause mechanisms with an OR condition so polygon drag pauses the heavy animation loop and HTTP polling exactly as touch pan/pinch did.

3. **`scheduleRoomOverlayRender()` rAF coalescer** — collapses multiple same-frame `renderRoomOverlay()` calls into one per animation frame. Drag pointermove handlers call the coalescer instead of the direct render. The rAF callback clears the pending flag and invokes `renderRoomOverlay()` once.

4. **Flush on drag end** — `finish*Drag` helpers call `renderRoomOverlay()` synchronously (bypassing the coalescer) so the final state is rendered immediately and the pending rAF handle is cleared.

5. **Kill in-flight poll on drag start** — in `begin*Drag` helpers, after flipping `polygonDragActive`, clear any in-flight `liveSync.pollTimerId` (same pattern as HF7 touch start).

## Non-Regression Concerns
- Animations stay paused throughout the drag. On Settings view this is imperceptible because the user is focused on editing, not watching.
- Live-sync polling pauses briefly during a drag (≤ few seconds), catching up immediately on drag end.
- The rAF coalescer delays visual feedback by at most one animation frame (~16 ms). Invisible to users.
- Final frame is rendered synchronously on drag end so the committed state is visible immediately.
- No change to drag commit / cancel semantics; the flag change is orthogonal to the existing state machine.
