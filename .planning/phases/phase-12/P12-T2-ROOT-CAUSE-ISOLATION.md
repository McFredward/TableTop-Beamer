# P12-T2 Root Cause Isolation — Order-Dependent Room Animation Occlusion

## Symptom
Triggering two room animations (e.g. `alarm` then `malfunction`) in the same room produces order-dependent visual results on the shared canvas:
- `malfunction -> alarm`: both visibly present (user PASS observation).
- `alarm -> malfunction`: `alarm` no longer visible (user FAIL observation).

## Candidate Branches Audited
| Candidate | Suspicion | Verdict | Evidence |
|---|---|---|---|
| A. Implicit `stopAnimation` / upsert in room start path | High | **Not the root cause** | `startRoomAnimationFromDraft` (`src/app/runtime/runtime-orchestration.js:9968`) creates fresh animations via `createAnimation(...)` and emits `trigger-room` mutations; no upsert/stop side-effect on an existing same-room animation outside explicit `editTargetId` edit mode. |
| B. Draft edit-target overwrite | Medium | **Not the root cause** | Overwrite only occurs when `state.roomDraft.editTargetId` is set (lines 10137-10161), i.e. explicit edit of a running animation, not a new trigger. |
| C. Coalescing / render budget skip | Medium | **Not the root cause** | `shouldCoalesceNonCriticalAnimation` + `maxRenderAnimationsPerFrame` (lines 11511-11518) only drops animations under pressure; not the trigger here. |
| D. Cluster member shadowing | Low | **Not the root cause** | Cluster-member skip (lines 11065-11071) applies only when a parent cluster controller is present. Two independent room animations share no cluster controller. |
| E. `clipToRoom` destructive clear | Medium | **Not the root cause** | `clipToRoom` (line 10935) sets a clip path; it does not `clearRect`. Each animation is wrapped in `ctx.save()/ctx.restore()` (lines 11084-11093), so clip state resets per animation but pixels persist across animations within one frame. |
| F. Order-dependent alpha blending due to near-opaque coded fills | **High** | **CONFIRMED ROOT CAUSE** | See below. |

## Confirmed Root Cause (Branch F)

### Evidence 1 — Render loop iterates in insertion order, default source-over blend
`src/app/runtime/runtime-orchestration.js:11479-11548`

```javascript
function draw(now) {
  ...
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pruneFinishedAnimations(now);
  drawOutsideFxLayer(now);

  const failedAnimationIds = [];
  let renderedCount = 0;
  const maxRenderAnimationsPerFrame = Math.max(1, Number(state.runtimePerf.maxRenderAnimationsPerFrame) || 96);
  for (const anim of state.runningAnimations) {        // ← insertion order
    if (shouldCoalesceNonCriticalAnimation(anim)) {
      continue;
    }
    if (!isRenderCriticalAnimation(anim) && renderedCount >= maxRenderAnimationsPerFrame) {
      continue;
    }
    const ok = drawAnimationSafely(anim, now);         // ← default globalCompositeOperation ("source-over")
    renderedCount += 1;
    ...
  }
  ...
}
```
No per-room concurrency guard. No composite-mode switch. Rendering order equals `state.runningAnimations` insertion order.

### Evidence 2 — Room animations share a clip region for drawing
`src/app/runtime/runtime-orchestration.js:11075-11094`

```javascript
if (animation.scope === "room") {
  if (animation.boardId !== state.boardId) {
    return;
  }
  const room = getBoard(animation.boardId).rooms.find((entry) => entry.id === animation.roomId);
  if (!room) {
    return;
  }
  const roomMetrics = getRoomRenderMetrics(room, animation.boardId);
  ctx.save();
  try {
    const clipped = clipToRoom(room, animation.boardId);
    if (!clipped) {
      return;
    }
    drawRoomComposition(animation, age, room, roomMetrics);   // ← draws into shared clip
  } finally {
    ctx.restore();
  }
  return;
}
```
Each room animation is wrapped in its own `save()/restore()` pair, but all animations targeting the same `roomId` paint into the same clipped region of the canvas in sequence. Default `globalCompositeOperation = "source-over"` means the later draw can alpha-blend over (and at near-opaque alpha, fully obscure) the earlier draw.

### Evidence 3 — Coded effects use near-opaque full-clip fills
`src/app/runtime/runtime-orchestration.js:11340-11361` (`power-outage` — the likely "malfunction" effect):

```javascript
if (type === "power-outage") {
  const pulse = (Math.sin(age * 20) + 1) / 2;
  const alpha = 0.76 + pulse * 0.2;                       // peak alpha up to 0.96
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, w, h);                               // full clip fill

  const flash = Math.random() > 0.88;
  if (flash) {
    ctx.fillStyle = `rgba(122, 182, 255, ${0.15 * intensity})`;
    ctx.fillRect(0, 0, w, h);
  }

  for (let i = 0; i < 4; i += 1) {
    const y = h * (0.2 + i * 0.2);
    ctx.strokeStyle = `rgba(125, 191, 255, ${(0.07 + pulse * 0.07) * intensity})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  return;
}
```

`src/app/runtime/runtime-orchestration.js:11333-11338` (`intruder-alert` — the likely "alarm" effect):

```javascript
if (type === "intruder-alert") {
  const pulse = (Math.sin(age * 9) + 1) / 2;
  ctx.fillStyle = `rgba(255, 45, 45, ${(0.1 + pulse * 0.24) * intensity})`;  // peak alpha 0.34
  ctx.fillRect(0, 0, w, h);
  return;
}
```

Both effects call `ctx.fillRect(0, 0, w, h)`. Inside the active room clip, that fill is clipped to the room polygon — but within the polygon, it paints every pixel uniformly. The relative alphas (0.96 vs 0.34) mean:
- When `power-outage` is drawn LAST, its near-opaque black fill obscures the prior red tint from `intruder-alert` (0.96 alpha over 0.34 alpha ≈ only 4% of prior red remains).
- When `intruder-alert` is drawn LAST, its red tint (0.34 alpha) blends over the dark but preserves the dark underneath visibly.

The alpha-blend simulation in `debug/p12-t1-order-occlusion-red.mjs` confirms this quantitatively:

| Order | Result `r` | Interpretation |
|---|---|---|
| alarm → malfunction | 3.996 | alarm hidden behind malfunction's dark fill |
| malfunction → alarm | 87.228 | alarm's red tint clearly visible over dark |

## Why This Is Type-Independent
The same root-cause class applies regardless of asset type:
- **coded** — full-canvas `fillRect` inside clip, near-opaque alpha (demonstrated above).
- **mp4** — `ctx.drawImage(video, ...)` at `ctx.globalAlpha = opacity` (`src/app/runtime/runtime-orchestration.js:9856-9860`). If `opacity ≈ 1`, the video frame is effectively opaque and obscures prior animations in the same clip.
- **gif** — `ctx.drawImage(gifRenderConfig.frame, ...)` at `ctx.globalAlpha = gifRenderConfig.opacity` (lines 9830-9834). Same problem.

Any asset type that produces a nearly-opaque region in the shared clip will occlude the previous animation under `source-over`.

## Fix Direction (for P12-T3/T4)
Introduce a generic, type-independent additive layering guard in the draw pipeline:
1. In `draw()`, build a per-frame map `roomConcurrencyByKey` counting running animations per `(boardId, roomId)`.
2. In the per-animation `ctx.save()` scope for `scope === "room"`, if the count for this animation's room is ≥ 2, switch `ctx.globalCompositeOperation = "lighter"` before invoking `drawRoomComposition`.
3. `"lighter"` blend is commutative: any two draws produce identical RGB output regardless of order.
4. Single-animation rooms keep default `"source-over"` — no visual regression.
5. No per-type code path changes: coded/mp4/gif all go through the same `drawRoomComposition` wrapper and inherit the composite switch.
6. No start-path changes — no implicit replacement to introduce.
7. `ctx.save()`/`ctx.restore()` already persists the composite-op change within the animation scope and resets it on exit — lifecycle-safe.

## Non-Regression Considerations
- Loop-mode animations and one-shot animations use the same draw path → loop behavior is unaffected by the concurrency guard when only a single animation is in the room.
- Explicit `stopAnimation` / `clear-all` removes entries from `state.runningAnimations`; once removed, the concurrency count decreases and the remaining single animation returns to `source-over` on the next frame. No lingering composite-op state.
- Global-scope (`clipToInsideShip`) and outside-scope (`drawOutsideFxLayer`) paths are outside the room-scope branch and remain unchanged.
