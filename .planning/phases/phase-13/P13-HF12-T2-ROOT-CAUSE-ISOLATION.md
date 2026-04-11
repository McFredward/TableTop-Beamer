# P13-HF12 Root Cause Isolation — Other-Vertices Drift + Edge Glitch After HF11

## Symptoms

After HF11 (`3ad41e0`) fixed the polygon jump, two remaining defects were
reported on room-vertex drag:

1. **Drift**: while dragging one vertex of a room polygon, the other vertices
   slowly shift along with it — not by the full drag delta, but noticeably
   (a few percent). The whole room therefore wanders instead of only the
   grabbed vertex moving.

2. **Edge glitch**: dragging a vertex to the board edge and beyond causes the
   vertex to "glitch" past the visible edge. Instead of sticking to the
   maximum on-board position, the vertex ends up outside the 0..1 range and
   on release the room snaps elsewhere.

Both defects are **only visible on rooms with non-identity `roomGeometry`** —
specifically rooms whose `stretchX` or `stretchY` is not exactly 1.0. The
user's `config/global-defaults.json` has e.g.:

```json
"a-01": {
  "mode": "relative",
  "offsetX": 0,
  "offsetY": -0.049,
  "stretchX": 0.952,
  ...
}
```

Rooms with fully default geometry (`stretchX: 1`) behave correctly.

## Drift — cause analysis

`getRoomPoints(room, boardId)` goes:

```javascript
const transform = getRoomTransform(room, boardId);   // uses getRawRoomCenter
const sourcePoints = getRoomSourcePoints(room, boardId);
const baseCenter = getRoomCenterFromPoints(sourcePoints); // centroid of current polygon
return sourcePoints
  .map(([x, y]) => {
    const transformedX = transform.centerX + (x - baseCenter.x) * transform.stretchX;
    const transformedY = transform.centerY + (y - baseCenter.y) * transform.stretchY;
    return applyHitareaCalibration(transformedX, transformedY, calibration);
  })
  .map(([x, y]) => [x * 1000, y * 1000]);
```

For `stretchX = 1` the per-point formula simplifies to `displayedX = rawX +
offsetX`, i.e. a pure additive translate. The centroid `baseCenter` drops out
and the output is centroid-independent. Everything works fine.

For `stretchX != 1` the formula cannot be simplified: `displayedX =
baseCenter.x * (1 - stretchX) + offsetX + stretchX * rawX`. The displayed
position depends on `baseCenter.x`, which is the **centroid of the current
polygon**. During a vertex drag we mutate `points[draggedIndex]` and call
`setSpecialPolygonPoints`. The centroid shifts by
`(new_draggedVertex - old_draggedVertex) / n_vertices`. Every **other**
vertex, whose `rawX` is unchanged, gets a new `displayedX` equal to
`old_displayedX + delta_baseCenter * (1 - stretchX)`.

For `a-01` (`stretchX = 0.952`, 6-vertex polygon) and a 0.1 normalized
horizontal drag, `delta_baseCenter = 0.1 / 6 ≈ 0.0167`, so other vertices
drift by `0.0167 * 0.048 ≈ 0.0008` in normalized space — small but visible as
the polygon wandering alongside the finger. HF11 reinstated the correct
transform pipeline via `getRoomPoints`, which recomputes `baseCenter` on
every pointermove — so the drift is now faithfully applied every frame.

The fix is to **freeze** the transform (crucially, `baseCenter`) at drag
start and apply it unchanged for the duration of the drag. The dragged
vertex's display position is then computed against the frozen centroid, and
every other vertex's display position stays exactly where it was at
`pointerdown`.

Area drag does not suffer from this: when every vertex shifts by the same
delta, `baseCenter` shifts by the same delta, and the two terms cancel —
`old_display + delta` regardless of stretch. So area drag can keep calling
`getRoomPoints(room, boardId)` on each frame.

## Edge glitch — cause analysis

The room-vertex drag pointermove uses:

```javascript
const [pointerX, pointerY] = getNormalizedOverlayPoint(event); // clamp [-0.2, 1.2]
const nextX = pointerX + dragVertexOffsetX;
const nextY = pointerY + dragVertexOffsetY;
points[dragVertexIndex] = [nextX, nextY];
setSpecialPolygonPoints(boardId, roomId, points); // clamp per-point [-0.2, 1.2]
```

`mapClientPointToNormalized` clamps the pointer to `[-0.2, 1.2]` via
`clampRoomAbsoluteCoordinate`, and `normalizePolygonPoint` clamps the stored
point the same way. That 20% slack exists so programmatic transforms can
legitimately write off-screen intermediate values, but it is **not** the
bound a user dragging a vertex expects. When the pointer is dragged past the
visible board edge, the vertex races 20% past the edge and then sits there;
the "glitch somewhere else" the user observes happens because display space
is bounded by the board (0..1), so the vertex quickly leaves the rendered
viewport and is no longer visually tracking the cursor.

For a direct-manipulation vertex grab, the correct bound is **display space
[0, 1]** — the vertex must stop at the board edge. The inverse transform
then maps that clamped display position back to whatever raw value is
required to produce it, so the raw may legitimately be `< 0` or `> 1` for
rooms with `stretch != 1` or non-identity `offset`, but the displayed vertex
is glued to the edge.

## Fix plan (feeds HF12-T3)

### Frozen transform at drag start

In `beginPolygonVertexDrag`, capture a frozen copy of the full transform
pipeline:

```javascript
const frozen = createFrozenRoomTransform(roomId, boardId);
// { baseCenterX, baseCenterY, centerX, centerY, stretchX, stretchY, calibration }
state.polygonEditor.dragFrozenTransform = frozen;
```

All subsequent drag pointermoves use this frozen transform instead of calling
`getRoomPoints`. Two helpers are needed:

1. `projectRawToDisplayWithFrozenTransform(x, y, frozen)` — maps a raw point
   to display overlay units (0..1000) using the frozen baseCenter. Mirrors
   `getRoomPoints` but without the per-call centroid recomputation.
2. `projectDisplayToRawWithFrozenTransform(displayX, displayY, frozen)` —
   inverts the transform so the pointer position (in display space) can be
   written back to raw storage.

On each vertex drag pointermove:

```javascript
const [px, py] = getNormalizedOverlayPoint(event);
const nextDisplayX = clamp01(px + offsetX);   // clamp [0, 1]
const nextDisplayY = clamp01(py + offsetY);
const [rawX, rawY] = projectDisplayToRawWithFrozenTransform(
  nextDisplayX, nextDisplayY, frozen,
);
points[dragIndex] = [rawX, rawY];
setSpecialPolygonPoints(boardId, roomId, points);
const overlayPoints = points.map(([x, y]) =>
  projectRawToDisplayWithFrozenTransform(x, y, frozen),
);
applyIncrementalRoomDrag(dragDomRefs, overlayPoints);
```

Because the frozen transform uses a `baseCenter` that never changes during
the drag, every non-dragged vertex's `overlayPoints[i]` equals its value at
drag start. Only the dragged index produces a new display value.

### Grab-offset capture lives in display space

The HF9 offset capture computed `initialVertex[0] - pointerX` where
`initialVertex` was raw but `pointerX` was in display-normalized space. For
stretch=1 the two spaces differ only by a constant offset, so the algebra
happens to produce the right drag delta. For stretch != 1 that happy
accident fails: the offset captured has the wrong scale.

HF12 recomputes the offset in display space at begin:

```javascript
const initialVertexOverlay = projectRawToDisplayWithFrozenTransform(
  startPoints[vertexIndex][0], startPoints[vertexIndex][1], frozen,
);
const initialVertexDisplayX = initialVertexOverlay[0] / 1000;
const initialVertexDisplayY = initialVertexOverlay[1] / 1000;
state.polygonEditor.dragVertexOffsetX = initialVertexDisplayX - pointerX;
state.polygonEditor.dragVertexOffsetY = initialVertexDisplayY - pointerY;
```

### Edge clamping

The display clamp is `[0, 1]` — the visible board — applied to
`pointer + offset` before inverting to raw. The inverse transform can
produce raw values outside `[-0.2, 1.2]` for heavily stretched rooms, so we
`clampRoomAbsoluteCoordinate` the raw result as a final safety net. The
dragged vertex visually sticks to the board edge and cannot escape it.

### Area drag and ship-vertex drag

Area drag keeps using `getRoomPoints(room, boardId)` — its per-frame delta
is shared across every vertex so `baseCenter` shifts by the same delta and
the transform output is `old + delta` regardless of stretch. No change
needed beyond the already-HF11 call signature.

Ship polygon has no transform today (identity everywhere). The ship vertex
drag still benefits from the `[0, 1]` clamp so users cannot drag the ship
polygon past the board edge. No frozen-transform needed.

## Non-regression

- HF7 / HF8 / HF9 / HF10 / HF11 intact.
- Area drag path is unchanged.
- Ship area / ship vertex drag preserved (clamp tightened on ship vertex
  only).
- `getRoomPoints` unchanged — HF12 only introduces a frozen-transform
  alternative for the vertex-drag hot path.
