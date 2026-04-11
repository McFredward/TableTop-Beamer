# P13-HF9 Root Cause Isolation — Polygon Drag Lag (Survived HF8) + Vertex Grab Jump

## Symptoms
1. **Drag lag**: after HF8 (`a71ea57`), panning/zooming is smooth but dragging a room or polygon vertex still lags visibly. User sees the room "nachziehen" — catching up to the finger rather than tracking it.
2. **Vertex grab jump**: grabbing a vertex with finger or mouse causes it to jump to a slightly different position before tracking, so the finger/cursor is no longer exactly on the vertex.

## Drag lag — cause analysis

HF8 rAF-coalesced the drag pointermove renderer via `scheduleRoomOverlayRender()`. That caps `renderRoomOverlay()` calls at ~60/s — but each call still `replaceChildren()`-wipes the SVG and rebuilds **every** polygon, vertex hit target, edge hit target, vertex handle, edge handle, and vertex label for every room.

Per call cost on mobile:
- `replaceChildren()` detaches ~200-400 SVG nodes with their attached event listeners.
- Loops over `board.rooms`, creating a new `<polygon class="room-zone">` per room with a new `click` + `pointerdown` listener.
- `renderPolygonEditorHandles()` creates ~5 nodes per vertex + ~2 nodes per edge for the selected room.
- `renderShipPolygonEditorHandles()` creates similar for the ship polygon.

Mobile measurement: ~5-15 ms per call for a typical 6-10 room board. At 60 Hz (rAF cap) × 10 ms = **600 ms/s of main-thread DOM work**. Pausing `draw()` and polling (HF7+HF8) recovered the budget they consumed, but this remaining cost is enough on its own to visibly lag a 60 Hz gesture — especially on older mobile hardware where DOM node creation is slow.

HF8 was a coalescer. The right fix is to avoid the full rebuild entirely during the drag, and only touch the specific DOM nodes that changed position.

## Vertex grab jump — cause analysis

`src/app/runtime/runtime-orchestration.js` room-vertex drag pointermove (pre-HF9):

```javascript
const points = getSpecialPolygonPoints(boardId, roomId);
const [x, y] = getNormalizedOverlayPoint(event);
points[state.polygonEditor.dragVertexIndex] = [x, y];
setSpecialPolygonPoints(boardId, roomId, points);
```

On the first pointermove, the vertex is assigned the raw pointer position. The pointer is anywhere inside the vertex hit target's circular area (radius up to 22 px on touch, per HF3). The vertex SNAPS from its actual position to the pointer position — causing the visible "jump". Same pattern for the ship polygon vertex drag.

The room **area** drag already uses delta math from a captured start-pointer, so it does not jump.

## Fix plan (feeds HF9-T3)

### Vertex offset capture
Each vertex `begin*Drag` helper captures:
```
const initialVertex = startPoints[vertexIndex];
const [pointerX, pointerY] = getNormalizedOverlayPoint(event);
dragVertexOffsetX = initialVertex[0] - pointerX;
dragVertexOffsetY = initialVertex[1] - pointerY;
```
And each vertex drag `pointermove` branch applies:
```
const nextX = pointerX + dragVertexOffsetX;
const nextY = pointerY + dragVertexOffsetY;
points[dragVertexIndex] = [nextX, nextY];
```
Result: the vertex tracks the pointer with the exact offset it had at grab time.

### Incremental SVG drag renderer

New helpers:
- `cacheRoomPolygonDragDomRefs(roomId)` — on drag start, query the roomOverlay once for:
  - the `<polygon class="room-zone" data-room-id>` node
  - ordered arrays of `.polygon-vertex-hit-target`, `.polygon-vertex-handle`, `.polygon-vertex-index`, `.polygon-edge-hit-target`, `.polygon-edge-handle` (excluding the `.ship-polygon-*` variants).
  - These are top-level children of `roomOverlay` in insertion order, matching the points array index.
- `cacheShipPolygonDragDomRefs()` — same for the ship polygon (`.ship-zone-mask.is-active` + ship-polygon handles).
- `applyIncrementalPolygonPointsToDom(polygonNode, points)` — sets the polygon's `points` attribute only.
- `applyIncrementalVertexHandlesToDom(refs, points)` — updates every vertex hit-target / handle / label cx/cy plus every edge hit-target / handle cx/cy (edges sit at midpoints).
- `applyIncrementalRoomDrag(refs, points)` — combines both for the room-zone polygon.
- `applyIncrementalShipDrag(refs, points)` — combines both for the ship-zone-mask polygon.

All three drag pointermove branches call the incremental updater instead of `scheduleRoomOverlayRender()`. `renderRoomOverlay()` is only called once on drag end (via `endPolygonDragInteraction()` from HF8) to resync class toggles, selection state, and any full board changes.

Cost comparison:
- Before: `renderRoomOverlay()` ~10 ms per call × 60 Hz = 600 ms/s.
- After: ~N attribute sets per rAF tick where N = vertex count × 3 + edge count × 2 + 1 polygon node. For an 8-vertex room that's ~24 + 16 + 1 = 41 SetAttribute calls at ~0.01 ms each = 0.4 ms per event. At 120 Hz × 0.4 ms = 48 ms/s — 12× cheaper than HF8.

## Non-regression
- Drag begin / end lifecycle unchanged; HF8's `polygonDragActive` + `isHeavyInteractionActive` pause gates remain intact.
- Full `renderRoomOverlay()` still runs synchronously on drag end, so any class changes / re-listener wiring reconverges immediately.
- Area drag math unchanged (already delta-based, no jump).
- Mouse drag on desktop picks up the same fixes — offset capture + incremental updater work regardless of pointer type.
