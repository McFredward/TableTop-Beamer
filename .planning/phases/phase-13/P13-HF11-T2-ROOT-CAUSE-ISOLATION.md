# P13-HF11 Root Cause Isolation — Polygon Jump on Vertex Grab After HF10

## Symptom

After HF10 (`44e1688`) grabbing a vertex of a room polygon (desktop left-mouse or
mobile touch-hold) shifts the **whole polygon** by a fixed offset as soon as the
first `pointermove` fires, and on `pointerup` the polygon snaps back to its
original on-screen position. The vertex itself tracks correctly relative to the
(shifted) polygon, but the polygon is displaced from where the user saw it when
they grabbed.

This is present on **both desktop and mobile**, and only for **rooms that have
non-identity `roomGeometry`** (e.g. `offsetX`, `offsetY`, `stretchX`, `stretchY`)
or non-identity `hitareaCalibration` (`offsetX/offsetY/scale`). Rooms with
fully default identity transforms drag correctly. The ship polygon is not
affected (it has no transform path).

## Coordinate systems at play

The runtime has **two** coordinate spaces for a room polygon:

1. **Raw (normalized 0..1):** stored in `state.specialPolygonsByBoard` and
   mirrored into `room.polygon` / `room.points`. This is the untransformed
   source of truth and is what `getSpecialPolygonPoints(boardId, roomId)`
   returns. HF9's drag math reads and writes here via `setSpecialPolygonPoints`.

2. **Display (overlay units, transformed):** what `getRoomPoints(room, boardId)`
   returns. It applies, in order:
   - `getRoomTransform(room, boardId)` — `centerX = baseCenter.x + offsetX`,
     `stretchX` (and Y), from `state.roomGeometryByBoard[boardId][roomId]`.
   - `applyHitareaCalibration(x, y, calibration)` — `(x - 0.5) * scale + 0.5 +
     offsetX`, from `state.hitareaCalibrationByBoard[boardId]`.
   - A final `× 1000` into SVG viewBox units.

   `renderRoomOverlay()` builds every `.room-zone` polygon's `points` attribute
   from this display-space output. `renderPolygonEditorHandles()` places every
   vertex / edge hit-target, handle, and label from the same output. So the
   visible polygon and its vertex markers are **all in display space**.

For default geometry + calibration, the two spaces are the same modulo the
`× 1000` scale. The user has `offsetY: -0.049` on room `a-01` in
`config/global-defaults.json`, so for that room the two spaces differ by a
~49-pixel vertical offset.

## HF9 incremental renderer — drops the transform

HF9 introduced `applyIncrementalRoomDrag(refs, points)` so drag updates no
longer pay for a full `renderRoomOverlay()` rebuild. The helper goes:

```javascript
function applyIncrementalRoomDrag(refs, points) {
  applyIncrementalPolygonPointsToDom(refs.polygon, points);    // polygon.points
  applyIncrementalVertexHandlesToDom(refs, points);            // handle cx/cy
}

function applyIncrementalPolygonPointsToDom(polygonNode, points) {
  const value = points
    .map(([x, y]) => `${(x * 1000).toFixed(1)},${(y * 1000).toFixed(1)}`)
    .join(" ");
  polygonNode.setAttribute("points", value);
}
```

The argument `points` is always **raw normalized** — each caller either reads
`getSpecialPolygonPoints(boardId, roomId)` (vertex drag) or derives `shifted`
from `startPoints` via delta math (area drag). The helper just multiplies by
1000. The transform + calibration pipeline that `getRoomPoints` applies is
silently dropped.

So the first `pointermove` inside a drag rewrites the polygon's `points` and
every handle's `cx/cy` from `(raw × 1000)`, while they were previously set by
`renderRoomOverlay()` from `(transform(raw) × 1000)`. The polygon, the vertex
hit targets, the vertex handles, the vertex labels, and the edge markers **all
jump by the delta between the two spaces**. That delta is the room's
`(offsetX, offsetY)` plus the calibration translate, in overlay units — which
matches the user's observed "ein Stück weg" jump for `a-01` (~49 px up).

On `pointerup`, `endPolygonDragInteraction()` calls `renderRoomOverlay()`, which
rebuilds everything from `getRoomPoints` → display space. The polygon appears
to "snap back" to where it was before the drag (because the raw points did in
fact change during drag, but the visible jump masks the actual movement).

## Why HF9 seemed to work before HF10

Before HF10 the desktop vertex drag was broken by a different bug: the HF9
DOM refs pointed at detached nodes (because `renderRoomOverlay()` was called
**after** `beginPolygonVertexDrag`, wiping the DOM HF9 had just cached). The
incremental renderer wrote attributes on orphans, so **nothing visible**
happened during the drag — the transform-drop bug was invisible because no
drag rendering was actually reaching the screen.

HF10 correctly reordered `renderRoomOverlay()` **before** `begin*Drag`, so the
cached refs point at live nodes. The HF9 incremental renderer now actually
runs — and its transform-drop bug is immediately visible.

The mobile regression reported after HF10 ("ganzer Raum verschiebt sich während
man hält") is the same bug. The touch-hold branch of `commitTouchHoldDrag`
was correctly re-ordered by HF10, and the incremental renderer now runs
against live DOM on mobile too — so the transform-drop is also exposed there.

## Drag offset capture also lives in raw space

`beginPolygonVertexDrag` captures:

```javascript
const initialVertex = startPoints[vertexIndex];  // RAW
const [pointerX, pointerY] = getNormalizedOverlayPoint(event);  // pointer in
                                                                 // overlay-
                                                                 // normalized
state.polygonEditor.dragVertexOffsetX = initialVertex[0] - pointerX;
```

`getNormalizedOverlayPoint` returns the pointer position in the overlay's
normalized 0..1 space — i.e. where on the **display** the pointer is. For a
transformed room, the displayed vertex is at `transform(raw)`, not at `raw`.
So `initialVertex[0] - pointerX = raw.x - transform(raw).x = -offsetX` (for
`stretchX = 1` and identity calibration). The offset captures exactly the
**negative of the transform offset**, not the user's grab offset.

On the first pointermove with the pointer held still, the drag math computes
`next = pointer + stored_offset = transform(raw) + (-offsetX) = raw`. So the
vertex is snapped **back to its raw value**, which is the transform offset
away from where the user visually grabbed it. The incremental renderer then
paints the whole polygon in raw space, compounding the visible jump.

## Fix plan (feeds HF11-T3)

**Goal:** Keep all three drag families (vertex, area, pending→area) visually
consistent with `getRoomPoints`, so the polygon + handles never leave display
space until drag end.

Two changes, both in `src/app/runtime/runtime-orchestration.js`:

### 1. Apply the transform inside the incremental renderer

Rewrite `applyIncrementalRoomDrag(refs, rawPoints, roomId, boardId)` so it
computes the transformed display-space points once and writes those to both
the polygon and the handle nodes. The simplest implementation:

```javascript
function applyIncrementalRoomDrag(refs, rawPoints, roomId, boardId) {
  if (!refs) return;
  const room = getBoard(boardId).rooms.find((r) => r.id === roomId);
  if (!room) return;
  const displayPoints = getRoomPoints(room, boardId); // already in overlay
                                                      // units (0..1000)
  writePolygonPointsAttributeOverlayUnits(refs.polygon, displayPoints);
  writeVertexHandleAttributesOverlayUnits(refs, displayPoints);
}
```

`getRoomPoints` already reads `room.polygon`, which `setSpecialPolygonPoints`
has just updated from the raw drag math, so `displayPoints` reflects the
in-progress drag. It applies the same transform + calibration + × 1000 as the
full renderer, so the polygon and handles stay exactly where
`renderRoomOverlay()` would place them on release — **no snap**.

Equivalent treatment for `applyIncrementalShipDrag` is unnecessary (the ship
polygon is already rendered in raw × 1000 — no transform), but the signature
change should be applied consistently for clarity.

### 2. Capture the drag offset in display space

`beginPolygonVertexDrag` should capture:

```javascript
const displayPoints = getRoomPoints(room, boardId).map(([x, y]) => [x / 1000, y / 1000]);
const initialVertex = displayPoints[vertexIndex]; // DISPLAY-space, 0..1
const [pointerX, pointerY] = getNormalizedOverlayPoint(event);
state.polygonEditor.dragVertexOffsetX = initialVertex[0] - pointerX;
state.polygonEditor.dragVertexOffsetY = initialVertex[1] - pointerY;
```

On pointermove, `next = pointer + offset` is then in **display space**. We
convert it back to raw by inverting the transform before writing to
`state.specialPolygonsByBoard`. For the common case (`stretchX/Y = 1`,
calibration `scale = 1`), the transform is a pure additive translate, so the
inverse is equally simple:

```javascript
const rawNextX = nextDisplayX - (transformX - rawX);
```

We already know `(transformX - rawX)` at grab time: it is the difference
between `getRoomPoints(room)[vertexIndex]` and `getSpecialPolygonPoints()[vertexIndex]`.
Cache this once per drag as `transformDeltaX/Y` and subtract per-move. For
non-identity `stretch/scale` the inverse is affine; we cache the inverse
transform factors at drag start and apply them per move. Since we already
pass `roomId`/`boardId` into the helper, this is a few lines of math.

The same offset-capture change applies to `beginShipPolygonVertexDrag` for
parity, although the ship polygon has no transform today.

### 3. Room area drag

`beginPolygonAreaDrag` uses delta math on `startPoints` (raw). The displayed
polygon is `transform(startPoints)`. A pointer delta in display space maps to
the **same** raw delta **only when `stretchX/Y = 1`**. For `stretch != 1` we
must scale the pointer delta by `1 / stretch` before adding to raw points.
Cache `1 / stretchX` and `1 / stretchY` at drag start. For the common case
(stretch=1, calibration scale=1) this is a no-op.

After the raw points are mutated, `applyIncrementalRoomDrag(..., roomId,
boardId)` does the display-space rendering from `getRoomPoints(room)` as in
(1), so there is no extra bookkeeping on the renderer side.

## Non-regression

- HF7 (`draw()` + poll pause on `isHeavyInteractionActive`) — untouched.
- HF8 (`polygonDragActive`, `scheduleRoomOverlayRender`, begin/end interaction
  wrappers) — untouched.
- HF9 (DOM ref caching structure, offset capture slot on `state.polygonEditor`,
  vertex jump-free property) — preserved and corrected for display space.
- HF10 (render-before-begin in all four call sites) — untouched.
- Ship polygon — mathematically unchanged for default geometry (transform is
  identity on ship polygon today).
