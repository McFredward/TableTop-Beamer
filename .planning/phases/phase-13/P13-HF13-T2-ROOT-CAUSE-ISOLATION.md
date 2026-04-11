# P13-HF13 Root Cause Isolation — Stretch Origin Drifts With Polygon Edits

## Symptom

After HF12 the other vertices no longer drift **during** a vertex drag —
but the moment the pointer is released they all shift slightly, and the
dragged vertex itself ends up visibly off from where the user last saw it
during the drag. The shift is small (~0.1% of normalized space for the
user's config), but it is strictly non-zero for any room with
`stretch != 1` and compounds across edits.

## Where HF12 hid the bug

HF12 froze a snapshot of the transform at `beginPolygonVertexDrag` and
used it throughout the pointermove stream. That made non-dragged
vertices hold still **while the drag was active**. But `renderRoomOverlay()`
(called by `endPolygonDragInteraction()` on release) does not use the
frozen snapshot. It goes back through the live `getRoomPoints`, which
re-derives the stretch origin from the current polygon. So the frozen
snapshot was really just a drag-time overlay on top of a structurally
broken transform.

## The structural bug

`src/app/runtime/runtime-orchestration.js` ships these two functions:

```javascript
function getRoomTransform(room, boardId = state.boardId) {
  const geometry = getRoomGeometry(boardId, room.id);
  const baseCenter = getRawRoomCenter(room, boardId);      // (1)
  const centerX = geometry.mode === "absolute"
    ? geometry.absoluteX
    : baseCenter.x + geometry.offsetX;
  const centerY = geometry.mode === "absolute"
    ? geometry.absoluteY
    : baseCenter.y + geometry.offsetY;
  return { centerX, centerY, stretchX: geometry.stretchX, stretchY: geometry.stretchY };
}

function getRoomPoints(room, boardId = state.boardId) {
  const calibration = getHitareaCalibration(boardId);
  const transform = getRoomTransform(room, boardId);
  const sourcePoints = getRoomSourcePoints(room, boardId);
  if (sourcePoints.length >= 3) {
    const baseCenter = getRoomCenterFromPoints(sourcePoints);   // (2)
    return sourcePoints
      .map(([x, y]) => {
        const transformedX = transform.centerX + (x - baseCenter.x) * transform.stretchX;
        const transformedY = transform.centerY + (y - baseCenter.y) * transform.stretchY;
        return applyHitareaCalibration(transformedX, transformedY, calibration);
      })
      .map(([x, y]) => [x * 1000, y * 1000]);
  }
  ...
}
```

Both (1) and (2) compute **the polygon's own centroid** on every call.
Substituting `centerX = baseCenter.x + offsetX` (relative mode) into the
map body:

```
transformedX = (baseCenter.x + offsetX) + (x - baseCenter.x) * stretchX
             = stretchX * x + (1 - stretchX) * baseCenter.x + offsetX
```

The displayed position of **every** vertex depends on the live polygon
centroid — for any stretch other than exactly 1.0. The user's
`config/global-defaults.json` has `stretchX: 0.952`, `stretchY: 1.263`
on `a-01` (and similar non-unit stretches on the other rooms), so every
single vertex edit on any of those rooms shifts the centroid and
re-paints every other vertex.

For a 6-vertex room, dragging one vertex by `Δ = 0.1` shifts the
centroid by `Δ / 6 ≈ 0.0167`, and for `stretchX = 0.952` each
non-dragged vertex shifts by `(1 − 0.952) × 0.0167 ≈ 0.0008` in
normalized space (about a pixel at 1000 × 1000). It is visibly "the
polygon crept along with the finger".

## Why this is not a drag-path problem

The bug is independent of the drag code. Any code that writes to
`room.polygon` (vertex edit, area drag, JSON import, programmatic
geometry update, live-sync update, …) shifts the stretch origin for
rooms with `stretch != 1`. The drag path is just where the user noticed
it first because the edit frequency is highest there.

`getRoomPoints` is called from the full overlay rebuild, from hit
testing, from the polygon editor handle renderer, from the ship polygon
renderer's neighbour lookups, and from several other places. Every
consumer saw the drifted value.

## The correct fix — stable stretch anchor

Pre-stretch the polygon centroid is a **calibration input**, not a
derived value. When the user set `stretchY: 1.263` on room `a-01` they
were saying "stretch the polygon 1.263× vertically around the centre it
had at the moment I calibrated". That centre should be frozen at
calibration time and persist for the life of the room.

The fix:

1. Introduce a session-stable anchor cache keyed by `(boardId, roomId)`
   that holds `{ x, y }`. The anchor is initialized on first access to
   the current polygon's centroid. Subsequent vertex edits do **not**
   update it.

2. `getRoomTransform` and `getRoomPoints` read their `baseCenter` from
   the cache instead of calling `getRawRoomCenter` /
   `getRoomCenterFromPoints`. Every consumer — full render,
   incremental drag render, area drag render, hit testing, zoom
   centering, touch-hold dispatch — inherits the stable anchor via the
   same two public functions, so there is exactly one place to fix.

3. The cache is invalidated (single-room entry removed) when a room is
   re-hydrated from config or when the user explicitly resets the room
   (so a fresh anchor is computed from the incoming polygon). It is
   **not** invalidated on vertex edits.

4. For backwards-compatibility with saved configs, we do not add a new
   persisted field. On the next session load, the anchor for each room
   is recomputed once from the saved polygon's centroid. There is a
   theoretical save → reload discontinuity of `(1 − stretch) ×
   Δcentroid_accumulated_over_session` — which in the worst observed
   case is ≈0.0008 per edit. Users who care will not notice it; users
   who do can re-save after reload to bake the new anchor in.

## What to remove

HF12's `createFrozenRoomTransform` / `projectRawToDisplayWithFrozenTransform`
/ `projectDisplayToRawWithFrozenTransform` / `computeRoomDisplayOverlayPointsFrozen`
helpers become redundant: with a stable anchor the live `getRoomPoints`
already produces a consistent result across `begin → pointermove →
pointermove → pointerup → renderRoomOverlay`. The drag path can go back
to calling `getRoomPoints` directly.

Two HF12 pieces are kept because they are orthogonal fixes for the
separate edge-clamp issue:

- `clampDisplayNormalizedCoordinate` — clamping to the visible board
  `[0, 1]` instead of the permissive `[-0.2, 1.2]`. The HF13 drag path
  still needs this to stop vertices from escaping the board.
- The display-space grab-offset capture in `beginPolygonVertexDrag`,
  which is correct irrespective of the transform stability.

Inversion from clamped display to raw is now a one-liner using the
(stable) `getRoomTransform` instead of a stashed snapshot.

## Non-regression

- HF11: the HF11 incremental renderer's use of `getRoomPoints` for area
  drag still returns display-space points. Area drag was already
  centroid-stable because every vertex shifts by the same delta; HF13
  is a pure improvement for vertex drag without touching area drag's
  behaviour.
- HF10 / HF9 / HF8 / HF7: untouched — the stable anchor only changes
  the math inside two functions, not the lifecycle or the cached DOM
  refs.
- Phase 11 / 12 / 13-1: untouched — the animation path does not depend
  on centroid stability.
