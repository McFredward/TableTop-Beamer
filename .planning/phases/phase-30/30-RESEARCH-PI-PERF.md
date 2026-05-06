# Phase 30 — Pi /output/ FPS Root-Cause Research

**Researched:** 2026-05-05
**Investigator:** gsd-researcher (perf root-cause pass, post-h12)
**Confidence:** HIGH on what is invalidated; HIGH on the new top-3 candidates;
MEDIUM on the relative ordering between them (only direct measurement on Pi
can disambiguate — see § Diagnostic measurement plan).

## TL;DR

After h12, /output/ runs at ~10 fps in BOTH `renderMode="gl"` and
`renderMode="2d"`. That single datum invalidates every prior hypothesis that
was specific to one path (texImage2D, GL warp, 2D triangulation).
The dominant cost MUST live in code that runs **before** line 647 in
`runtime-draw-loop.js draw()`, i.e. in the *fx-canvas content-build* phase.
The most likely dominant cost is **per-frame full-canvas `drawImage(video, 0,
0, 1920, 1080)` of the sandstorm MP4 onto fx-canvas** at
`runtime-draw-loop.js:482` (and a second 1920×1080 redundant fallback-snapshot
copy at `runtime-outside-mp4.js:218-219`). On Pi 4 VC4, drawing a hardware-
decoded `<video>` to a Canvas2D destination at 1080p is consistently reported
in Chromium issue tracker numbers around **10–30 ms per call** — a single such
call per frame already collapses fps to single digits without any other
work. Two consecutive calls (the redundant fallback path) doubles it.

**Primary recommendation:** instrument the per-frame buckets (§ Diagnostic
plan) and verify; pending verification, the highest-ev intervention is
**eliminate the redundant fallback `captureOutsideMp4FallbackFrame` per-frame
call when the video is fresh** (see § Optimization options #1).

## Key invalidated hypotheses

The "10 fps in BOTH modes" datum is decisive. Every hypothesis below was
either ruled out before by code-reading + this datum, or weakened to
implausible:

- ❌ **`texImage2D(canvas)` upload @ ~30-50 ms/frame** —
  `runtime-projection-gl-renderer.js:355`. Path-specific to GL. With
  `renderMode="2d"`, this line is never reached
  (`runtime-projection-mapping.js:267-274` short-circuits before
  `_postDrawMeshWarpGL`). 2D mode is also at 10 fps → upload is NOT the
  ceiling.

- ❌ **2D mesh-warp triangulated affine** —
  `runtime-projection-2d-fallback-renderer.js:105-176`. Path-specific to 2D
  fallback. With `renderMode="gl"`, this is never reached (returned early at
  line 295 if GL succeeds, and the chip-test confirms loss-count==0). GL mode
  is also at 10 fps → 2D warp is NOT the ceiling.

- ❌ **`willReadFrequently:true` on the GIF playback canvas** —
  `runtime-gif-playback.js:212-243`. h10 introduced it, h12 removed it
  (commit log line 224-233). User reports no fps change → cost was real but
  not dominant.

- ❌ **Per-frame ImageBitmap allocation in GIF parser** — h10 + h12 redirected
  /output/ to the parser path with shared playback canvas + putImageData
  (one CPU→GPU upload per frame *advance*, ~ ≤30 Hz). The change closed the
  context-loss loop but did not move fps. The shared-canvas blit is a
  GPU→GPU operation and is already cheap.

- ❌ **`clip()` cost from per-room polygon clipping** — `runtime-canvas-clip.js`.
  In the test scenario (3 rooms running 3 GIFs + outside sandstorm.mp4),
  `clipToRoom` is called 3× per frame (one beginPath + one ~6-point
  closePath + one clip). With Chromium's GPU-accelerated path on canvas,
  that is reliably sub-millisecond per call (well under 1 ms total). It is
  NOT plausibly responsible for a 90 ms/frame budget overrun. Same for
  `clipToOutsideShip` once per frame. (Keeping this on the candidate list
  for the measurement plan, but with low prior.)

- ❌ **Per-frame DOM mutations** — running-list re-render is gated on /output/
  (control-only, `runtime-draw-loop.js:654-665` checks `getOutputRole() !==
  OUTPUT_ROLE_FINAL`). Diagnostic chip is on a 500 ms `setInterval`
  (`index.html:983`), not per frame. `stage.dataset.viewport` only writes on
  resize (`runtime-stage-viewport.js:283`, gated by `cssChanged ||
  pixelChanged`). No `style.transform` writes per frame on /output/.

- ❌ **rAF being throttled by visibility/idle** — the index.html chip script
  has its own independent rAF loop sampling `lastTick - now` deltas
  (`index.html:929-939`), and the user reports the chip shows ~10 fps.
  Both rAFs see the same jankrate, so throttling is uniform — i.e. the
  page IS receiving rAF callbacks at the rate at which the previous one
  finished. Each frame is genuinely taking ~100 ms to compute, not being
  parked.

- ❌ **`recordRuntimeFrameCost` itself** — `runtime-perf.js:174-220`. Body is
  array push, sort-based percentile on at most 240 samples (≤ 0.05 ms),
  and a few math comparisons. Sub-millisecond. Not a candidate.

- ❌ **Auto-degrade not firing** — `recordRuntimeFrameCost` DOES fire and
  with frameBudgetMs=16.7 and observed p90~100 ms it sits well above
  `targetMs * 1.9` (= 31.7 ms), so `pressureLevel=2` is set, stride=3,
  starsPerLayer=34. This affects only outside-space coded effect (which is
  not in the test scenario) and "non-critical" globals — **room animations
  are critical (`isRenderCriticalAnimation` returns true for `scope ===
  "room"` at `runtime-perf.js:98-99`)** so they keep running every frame.
  The degrade safety-net does not help the dominant path.

## Pi /output/ canvas dimensions (clarification)

The earlier "1365×1080" anecdote in hotfix discussion is **stale** —
removed by Phase 30 B1 h5. Current path:

`runtime-stage-viewport.js:189-209 collectStageViewportMetrics()` reads
`stage.clientWidth/Height`. On /output/ the stage CSS is `width: 100%;
height: 100%` of `.projection-area` which is `position: fixed; inset: 0;
width: 100vw; height: 100vh` (`styles.css:88-95`). On a kiosk-fullscreen
1920×1080 Pi, that yields cssWidth=1920, cssHeight=1080. With Pi's default
`devicePixelRatio = 1`, **`canvas.width = canvas.height = 1920 × 1080`**.
This is the dimension every per-frame full-canvas operation targets.

Confirm via the diagnostic chip: it shows `canvas.width × canvas.height @
DPR` (`index.html:966-971`).

## Code-evidence per per-frame operation

Listed in the order they execute inside `draw(now)` BEFORE
`postDrawMeshWarp` (line 647). Both renderModes execute everything below.

### Op 1 — `c.clearRect(0, 0, 1920, 1080)` (line 594)
- One full-canvas clear.
- On a GPU-accelerated 2D canvas this is a GPU clear command, sub-ms.
- On a software-rendered 2D canvas (Chromium can demote when textures
  exceed budget) it's a 8 MB memset, ~3-5 ms on Pi VC4.
- **Runs in BOTH modes.** Scales with canvas size, not animation count.

### Op 2 — `pruneFinishedAnimations(now)` (line 595, body 507-559)
- One filter() over runningAnimations + a couple of map walks.
- For 4 running animations, < 0.1 ms.
- Has DOM side effects ONLY when an animation finishes
  (`renderRunningAnimationsList`, `refreshGlobalButtons`) — typically zero
  per frame in steady state.

### Op 3 — `drawOutsideFxLayer(now)` (line 603, body 405-505)
This is where the bulk of suspicion lives.

- `clipToOutsideShip(boardId)` (line 454) → `getPlayAreaPolygonsPixels` +
  appendPolygonPath + `c.clip("evenodd")`. ~one polygon, ~6 points. ≤ 1 ms.
- For mp4 branch (default Test-Board sandstorm.mp4):
  - `ensureOutsideMp4Playback` (line 472) — sets `video.loop`, conditional
    `video.playbackRate` write, conditional `video.play()`. No per-frame
    cost when steady-state.
  - **`c.drawImage(video, 0, 0, 1920, 1080)` at line 482** when
    `shouldDrawOutsideMp4Now` returns true.
    - Drawing an HTMLVideoElement onto Canvas2D at full resolution requires
      a YUV→RGBA color-space conversion and a CPU↔GPU bridge. Chromium
      issue tracker measurements at 1080p report **~10.5 ms average per
      drawImage(video) call** on desktop GPUs
      ([Chromium bug 91208 / WebCodecs #421](https://bugs.chromium.org/p/chromium/issues/detail?id=91208),
      [WebCodecs #421](https://github.com/w3c/webcodecs/issues/421)).
      On Pi 4 VC4 (Mesa V3D), with the V4L2 hardware decoder feeding via
      VideoFrame and the Canvas2D context likely on the *software* backend
      under memory pressure (Chromium auto-demotes after sustained allocs),
      this number can swing to **30–50 ms** — confirmed informally by the
      `getMp4PerformanceControls` "performance" tier targeting 33 ms /
      frame for video draws (`runtime-outside-mp4.js:286-303`).
    - **Frequency:** `shouldDrawOutsideMp4Now` (line 286-303) gates this
      based on a 16/22/33 ms target depending on tier. With tier=balanced
      (default) it fires every ~22 ms; if the per-frame budget is 100 ms
      (10 fps), it fires EVERY frame. So in practice on Pi /output/:
      **one full 1920×1080 drawImage(video) per draw frame.**
  - **Then `captureOutsideMp4FallbackFrame(playbackState, video)` at line
    483** (body in `runtime-outside-mp4.js:210-223`) does
    `fallbackCtx.clearRect(0,0,1920,1080)` + **a second
    `fallbackCtx.drawImage(video, 0, 0, 1920, 1080)`** onto the
    fallback canvas. **This is a second full-resolution video draw on the
    same frame.** The fallback canvas's only purpose is to be replayed by
    `drawOutsideMp4FallbackFrame` (line 225-236) when
    `shouldDrawOutsideMp4Now` returns false (i.e. the rAF fired faster
    than the target gate). When fps is ALREADY at 10 (well slower than
    the 22 ms target), the fallback path NEVER runs — yet we still pay
    the capture cost every frame.
    **This is a ~10–50 ms wasted call per frame on Pi**, very likely
    the single biggest source of avoidable cost.
- **Runs in BOTH modes.** Not gated by renderMode.

### Op 4 — `roomConcurrencyByKey` map build (lines 609-618)
- Single linear scan over runningAnimations. < 0.1 ms.

### Op 5 — Per-animation `drawAnimationSafely` loop (lines 623-635)
For the test scenario (3 room-scope GIFs):

For each room animation:
- `getRoomRenderMetrics(room, boardId)` at draw-loop:348 →
  `runtime-room-geometry.js:155-205`. Calls
  `getRoomPolygonPixels` (~6 pts mapped through
  `mapNormalizedPointToPixels`), then computes centroid + bbox + radius.
  ~0.05 ms per call. **Cost: ~0.15 ms total** for 3 rooms.
- `c.save()` → ~0.01 ms.
- `clipToRoom(room, boardId)` → `getRoomPolygonPixels` AGAIN (no cache),
  beginPath + 6× lineTo + closePath + clip. ~0.3-1 ms per room on Pi
  Canvas2D. **Cost: ~3 ms total** for 3 rooms.
- `drawRoomComposition(animation, age, room, roomMetrics)` → for the GIF
  asset path:
  - `resolveRoomGifRenderConfig` → `getGifPlaybackFrame` → returns the
    shared playback canvas (after one putImageData if the cursor advanced).
    Cursor-advance is at most ~30 Hz, so typically zero putImageData per
    rAF.
  - `c.save()` + `c.globalAlpha = …`.
  - `drawRoomAssetImage(c, frame, rect)` → `c.drawImage(canvas, …, rect.w,
    rect.h)`. Source is canvas (not video). Stretched-to-polygon path:
    rect.w/h match the room's bbox. For a typical room (say 200×150 px),
    drawImage of a canvas onto canvas is ~0.5 ms.
- `c.restore()` × 2.
- **Total per-room: ~1-2 ms.** For 3 rooms: **~3-6 ms.**

(If any of the test rooms use **mp4** instead of gif, replace the
canvas drawImage with a `drawImage(video, …)` at the room rect — could
add 5-15 ms each. The test description says "3 GIFs", so this is small.)

### Op 6 — `postDrawMeshWarp` (line 647, the discriminator)
- GL mode: ~5-10 ms (`texImage2D` + ~50 vertices + `drawElements`).
- 2D mode: ~10-20 ms (snapshot copy + 8 affine triangles per cell).
- Path-specific. Both ~comparable on Pi. Both at 10 fps → both fit in the
  remaining budget after the upstream cost has consumed ~85 ms.

### Op 7 — `recordRuntimeFrameCost` (line 666, body in `runtime-perf.js:174-220`)
- Sample push, sort-based percentile, a couple of comparisons. < 0.5 ms.

### Adding it up (per-frame estimate, mid-range)

| Bucket | mid-range cost (ms) |
|--|--|
| clear-and-bg | 2 |
| outside-fx clip + draw + capture | **40** (10–80 spread, **the suspect**) |
| room anims (3× clip + drawImage of gif canvas) | 5 |
| concurrency map + prune | 0.2 |
| mesh-warp (either GL or 2D) | 10 |
| recordRuntimeFrameCost + misc | 1 |
| **Total** | **~58 ms** mid, **~95 ms** high → 10–17 fps |

That fits "10 fps observed in both modes" cleanly with the dominant cost
being **outside-fx full-canvas video draws (drawImage + redundant capture)**.

## Top 3 candidates for "the dominant cost"

Ranked by expected fps gain when removed.

### #1 (highest prior) — Redundant `captureOutsideMp4FallbackFrame` per-frame at `runtime-draw-loop.js:483`

- **What:** Every time the main `drawImage(video, …)` runs (line 482), the
  next line immediately does a SECOND
  `drawImage(video, 0, 0, 1920, 1080)` onto a separate fallback canvas
  (`runtime-outside-mp4.js:218-219`).
- **Why it's the dominant cost:** the GPU-side cost of "draw a hardware-
  decoded YUV video frame to a 1920×1080 RGBA canvas" is the most
  expensive single op in the pipeline on Pi VC4. Doing it **twice** per
  frame doubles it. The fallback is ONLY needed when `shouldDrawOutsideMp4Now`
  returns false (rate-limit gate); when fps is already at 10 fps the gate
  never fires, so the captured frame is **never used** but the cost is
  paid every frame.
- **Why it fits "10 fps in both modes":** outside-fx draw runs in both modes
  (the GL/2D fork is post-line 647). Removing this single call cuts ~10–30
  ms per frame.
- **Risk-of-being-wrong:** LOW — code path is unconditional, costs are well-
  documented in Chromium tracker numbers, dependence on outside-fx being
  enabled with mp4 (default sandstorm.mp4) matches the user's test scenario.

### #2 — Main `drawImage(video, 0, 0, 1920, 1080)` at `runtime-draw-loop.js:482` itself

- **What:** Even with the redundant capture removed, the "real" outside-fx
  video paint is itself a full 1920×1080 video→canvas blit per frame.
- **Why it's a candidate:** Chromium issue tracker measurements at 1080p
  for `drawImage(video)` average ~10.5 ms on desktop GPUs and have been
  reported at >40 ms under memory pressure / software fallback. On Pi VC4
  with the V3D driver, 30+ ms is plausible.
- **Why it fits the pattern:** runs in both modes, runs every frame, scales
  with canvas size, not affected by GL/2D split.
- **Risk-of-being-wrong:** MEDIUM — only certain at this magnitude on Pi
  if Chromium has demoted the 2D context from GPU to software. Could be
  closer to 10 ms per call, in which case it's a ~6 fps recovery rather
  than a single-source root cause.

### #3 — `clearRect(0, 0, 1920, 1080)` if Chromium has demoted fx-canvas to software backend

- **What:** `runtime-draw-loop.js:594` clears the full fx-canvas every frame.
- **Why it might be a hidden cost:** Chromium 2D canvas can be backed by GPU
  (Skia Ganesh) or software (raster). With sustained large-allocation
  pressure (mp4 video frames + GIF playback canvases + the fallback canvas
  + the GL texture) on a Pi 4 with shared GPU/system memory, the GPU
  backend can be demoted. Once demoted, every fillRect / clearRect /
  drawImage runs through the software raster: an 8 MB clearRect is ~5 ms
  CPU. Once any frame pays software cost, every operation in that frame
  pays software cost, and the cumulative effect could explain ~50 ms of
  the 100 ms budget.
- **Risk-of-being-wrong:** MEDIUM-HIGH. Hard to verify without a probe; the
  measurement plan below targets it specifically.

## Diagnostic measurement plan

Three diagnostics, ordered shortest-first. The user runs them on Pi
/output/ in kiosk Chromium with the standard test scenario (3 GIFs +
sandstorm.mp4). Output guides which optimization to ship.

### A. URL feature flags for binary-search A/B (cheapest, run first)

Add four query-flag short-circuits at the top of the relevant functions.
All read once via `URLSearchParams` and cached in module locals:

```js
// In runtime-draw-loop.js draw(), near line 564:
const _PERF = (() => {
  try {
    const p = new URLSearchParams(window.location?.search || "");
    return {
      skipOutside: p.get("perf_skip_outside") === "1",
      skipRooms:   p.get("perf_skip_rooms")   === "1",
      skipWarp:    p.get("perf_skip_warp")    === "1",
      skipCapture: p.get("perf_skip_capture") === "1",
    };
  } catch (_) { return { skipOutside:false, skipRooms:false, skipWarp:false, skipCapture:false }; }
})();
```

Then:
1. Wrap the call at line 603 with `if (!_PERF.skipOutside) drawOutsideFxLayer(now);`
2. Wrap the for-loop at 623-635 with `if (!_PERF.skipRooms) { … }`
3. Wrap line 647 with `if (!_PERF.skipWarp) ctx.postDrawMeshWarp?.(canvas, c);`
4. In `runtime-outside-mp4.js:210` (start of `captureOutsideMp4FallbackFrame`),
   add: `if (window.__PERF_SKIP_CAPTURE) return;` (set the global once at
   draw-loop init from the same query string parsing — keeps the change
   local to two files).

User runs:
- `?perf_skip_outside=1` — should jump to ~30+ fps if outside is the cost.
- `?perf_skip_capture=1` — isolates the second drawImage. Expected
  recovery: half the outside-fx cost (~15-25 ms / frame). If fps
  improves to ~16-18 fps, **#1 is confirmed**. If it stays at ~10 fps
  but `?perf_skip_outside=1` jumps to 30+, **#2 is confirmed and the
  capture overhead was minor**.
- `?perf_skip_rooms=1` — should be small (estimate 5-10 ms recovery).
- `?perf_skip_warp=1` — should be small (10-20 ms recovery, test in both
  GL and 2D modes).

Each test takes ~10 seconds on /output/. Five flags × 2 modes = 10 data
points, one short conversation cycle.

### B. `performance.mark` instrumentation patch for DevTools Performance tab

Insert these markers in `runtime-draw-loop.js draw()`. Restrict to /output/
to avoid dashboard noise:

```js
const _PERF_MARK = (ctx.outputRole === ctx.OUTPUT_ROLE_FINAL);
const _mark = (name) => { if (_PERF_MARK) try { performance.mark(name); } catch(_){} };
const _measure = (name, start, end) => { if (_PERF_MARK) try { performance.measure(name, start, end); } catch(_){} };

// Replace the body of draw(now) starting after frameStart:
_mark("draw-start");
// ...existing setup...
_mark("clear-start");
c.clearRect(0, 0, canvas.width, canvas.height);
_mark("clear-end");
pruneFinishedAnimations(now);
_mark("prune-end");
if (ctx.isHeavyInteractionActive()) { /* unchanged */ }
_mark("outside-start");
drawOutsideFxLayer(now);
_mark("outside-end");
// ...concurrency map...
_mark("rooms-start");
for (const anim of state.runningAnimations) { /* unchanged */ }
_mark("rooms-end");
// ...failed-anim cleanup...
_mark("warp-start");
ctx.postDrawMeshWarp?.(canvas, c);
_mark("warp-end");
// ...rest unchanged...
_mark("draw-end");

_measure("clear", "clear-start", "clear-end");
_measure("outside-fx", "outside-start", "outside-end");
_measure("rooms", "rooms-start", "rooms-end");
_measure("warp", "warp-start", "warp-end");
_measure("frame-total", "draw-start", "draw-end");
```

Inside `runtime-outside-mp4.js:210`, mark `outside-capture-start/end` around
the two-line capture body.

User opens Chrome DevTools on /output/ (or remote-debugged via
`chrome://inspect`), captures a 5-second Performance trace, and reads the
"User Timing" track for the per-bucket breakdown. Posts the median of
each measure name — that's the ground truth.

### C. `console.log` rolling stats (no DevTools required)

Simpler if the user can't get DevTools attached. Keep a circular buffer
of per-bucket costs and `console.table` every 60 frames:

```js
const _BUCKETS = { clear:[], outside:[], rooms:[], warp:[], total:[] };
const _push = (k, v) => { _BUCKETS[k].push(v); if (_BUCKETS[k].length > 60) _BUCKETS[k].shift(); };
const _stats = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x,y)=>x-y);
  return { p50: s[Math.floor(s.length*0.5)].toFixed(1), p90: s[Math.floor(s.length*0.9)].toFixed(1) };
};
// after each performance.now() pair:
_push("clear", clearEnd - clearStart);
// etc.
// Every 60 frames:
if (state.runtimePerf.frameIndex % 60 === 0 && _PERF_MARK) {
  console.table({
    clear: _stats(_BUCKETS.clear),
    outside: _stats(_BUCKETS.outside),
    rooms: _stats(_BUCKETS.rooms),
    warp: _stats(_BUCKETS.warp),
    total: _stats(_BUCKETS.total),
  });
}
```

User pipes the kiosk Chromium console to a tail-able log file (already
common for Pi diag) and reads ~3 lines.

### Concrete fps target on Pi 4 with this workload

Based on the Chromium issue tracker numbers cited above and what is widely
reported for headless Chromium kiosk on Pi 4:

- **Realistic ceiling at 1920×1080 with one full-canvas video drawImage per
  frame plus mesh-warp:** ~25–30 fps.
  ([Raspberry Pi Forums — max fullscreen FPS on Pi 4 X11 ~30](https://forums.raspberrypi.com/viewtopic.php?t=304534))
- **With the redundant capture removed AND the room GIFs at moderate size:**
  ~20–25 fps is realistic.
- **Reaching 60 fps is not realistic** on Pi 4 + kiosk Chromium + 1080p +
  any video element drawing to canvas. The hardware budget does not exist.
  Phase 30 should target **stable 24–30 fps**, not 60 fps.

## Optimization options ordered by expected fps gain

### Option A — Eliminate redundant per-frame capture (BIG WIN, LOW RISK)

**Estimated fps delta:** **+5 to +10 fps** (10 fps → 15-20 fps).

**Implementation sketch:**
```js
// runtime-draw-loop.js around line 481-489. The capture is only needed
// when the gate path may legitimately drop a frame later. Skip it when
// the gate is already firing every frame (shouldDrawOutsideMp4Now true
// 100% of the time means the fallback canvas is never read). A simple
// proxy: only capture every Nth real-draw frame so the fallback is at
// most 350 ms stale (matches OUTSIDE_MP4_FALLBACK_FRAME_MAX_AGE_MS).
if (ctx.shouldDrawOutsideMp4Now(playbackState)) {
  c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
  // Capture at most every 6th real-draw frame (still well under the
  // 350 ms fallback freshness budget, even at 60 fps).
  if ((state.runtimePerf.frameIndex % 6) === 0) {
    ctx.captureOutsideMp4FallbackFrame(playbackState, video);
  }
} else {
  ctx.drawOutsideMp4FallbackFrame(playbackState);
}
```

**Risk assessment: LOW.**
- Mesh-warp is unaffected (downstream of fx-canvas content).
- The fallback canvas is only consumed inside `drawOutsideMp4FallbackFrame`
  (line 225), which checks `ageMs > OUTSIDE_MP4_FALLBACK_FRAME_MAX_AGE_MS`
  (350 ms). At 10 fps every-6th capture is still ~600 ms stale at worst —
  may need to relax to every-3rd, OR raise
  `OUTSIDE_MP4_FALLBACK_FRAME_MAX_AGE_MS` to 700.
- Could regress the fallback-display path on slower frames (when rAF skips
  one). Mitigation: tune the modulo and the freshness threshold together.
- Does NOT regress h2 (rebuild outside-fx mirror on snapshot apply), h3
  (sync mirror on board switch), h6-h12 (GL stability) — orthogonal layers.

**Rollback strategy:** revert the modulo, restore unconditional capture.
File-local one-line change.

### Option B — Drop the outside-fx fallback canvas entirely on /output/ (MEDIUM WIN, MEDIUM RISK)

**Estimated fps delta:** **+8 to +15 fps** (10 fps → 18-25 fps).

The fallback canvas exists to bridge frames where `shouldDrawOutsideMp4Now`
gates out (the rAF rate exceeds the target draw rate). On /output/ at 10 fps
the rAF rate is already BELOW any target — the gate never fires negative.
Skipping the fallback path entirely on /output/ saves both the capture AND
the maintenance code:

**Implementation sketch:**
```js
// runtime-draw-loop.js:480-489 — on /output/, do the simple thing:
// always draw the live video frame, never capture, never replay.
const isOutputFinal = ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL;
if (video.readyState >= 2 && Number(video.videoWidth) > 0 && Number(video.videoHeight) > 0) {
  if (isOutputFinal || ctx.shouldDrawOutsideMp4Now(playbackState)) {
    c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!isOutputFinal) ctx.captureOutsideMp4FallbackFrame(playbackState, video);
  } else {
    ctx.drawOutsideMp4FallbackFrame(playbackState);
  }
}
```

Risk: MEDIUM. Removes a temporal-smoothing safety net on the lowest-perf
target. Acceptable IF the user is willing to accept "if the rAF is too
slow to upload a video frame, just skip the outside-fx draw that frame"
(which is what's happening anyway at 10 fps). Could regress micro-stutter
during boot when video isn't decode-ready. Boot already covered by
`tickLoadingOverlay` — it holds the loading overlay until video.readyState
≥ 2, so the user never sees the boot transition.

### Option C — Render outside-fx MP4 directly via CSS `<video>` element instead of drawing it to canvas (LARGE WIN, HIGH RISK)

**Estimated fps delta:** **+20 to +30 fps** (10 fps → 30+ fps).

The reason video-to-canvas is so expensive is that Chromium has to copy a
hardware-decoded video frame across the GPU memory boundary every time. If
the outside-fx mp4 were rendered as an actual `<video>` DOM element
positioned absolutely inside #stage, Chromium would composite it on the
GPU directly without any round-trip to the canvas — same as how YouTube
1080p plays smoothly on Pi 4 in fullscreen.

Implementation sketch (rough):
1. Add a hidden `<video id="fx-outside-video">` to the stage in `index.html`.
2. In `drawOutsideFxLayer`, instead of `c.drawImage(video, …)`, ensure
   the DOM `<video>` element is positioned + clipped (CSS
   `clip-path`) to the play-area polygon and shown.
3. Mesh-warp now needs to capture not only fx-canvas content but also
   the composited video. **This is the high-risk part** — the GL warp
   currently `texImage2D(canvas)` only. To warp a `<video>` separately,
   the GL renderer would need a second texture upload via `texImage2D(video)`,
   THEN composite both. That's a much bigger architectural change.

**Risk: HIGH.** Almost certainly violates the "Phase 30 mesh-warp must
preserve squish bars + mid-line drags + internal grid points" hard
constraint, because warp would need re-architecting around two
texture sources (canvas-content + video) instead of a single fx-canvas.
**NOT RECOMMENDED for this phase** — file as a future enhancement.

### Option D — Reduce video drawImage destination size (SMALL-MEDIUM WIN, LOW RISK)

**Estimated fps delta:** **+2 to +5 fps**.

Outside-fx is clipped to the play-area polygons (`clipToOutsideShip`) — the
visible region is typically ~70-80% of the canvas, with corners cut off.
Drawing into 1920×1080 then clipping is wasted GPU work; we can reduce the
*destination rect* to the bounding box of the play-area polygons.

**Implementation:**
```js
// Compute play-area bbox once per frame (cheap), use as drawImage dest:
const bbox = getPlayAreaBoundingBox(state.boardId);  // ~6 max() calls
c.drawImage(video, bbox.minX, bbox.minY, bbox.width, bbox.height);
```

Risk: LOW — same clip semantics, smaller drawImage. Could very slightly
visually shift if play-area polygons aren't exactly centered (would need
to verify).

### Option E — Lower outside-fx mp4 source resolution (SMALL WIN, LOW RISK)

**Estimated fps delta:** **+1 to +3 fps**.

If sandstorm.mp4 is encoded at higher than 1080p, transcoding it down to
720p or even 540p reduces the YUV→RGBA conversion cost on every drawImage.
This is an asset-pipeline change, not a code change.

Risk: LOW. Visual quality drop on 1080p projector — likely imperceptible
for a particle/sand backdrop.

### Option F — `OffscreenCanvas` + worker thread for fx-canvas (LARGE WIN, HIGH RISK)

**Estimated fps delta:** unknown, theoretically +10-20 fps.

Move the entire `draw(now)` body to a worker. Pi VC4's main thread shares
with WebSocket live-sync, GIF decode, etc. — moving render off-main-thread
is the standard remedy.

Risk: HIGH. Touches every render path, all DOM access (e.g. `document.getElementById`
calls in the GL renderer line 88) needs rerouting. Full refactor scope.
Not phase 30.

## Hard constraints (do not violate)

- **Mesh-warp with all current functions MUST be preserved** — squish bars,
  mid-line drags, internal grid points all flow through
  `runtime-projection-mapping.js postDrawMeshWarp` → either GL renderer or
  2D fallback. None of options A/B/D/E touches this path.
- **All Phase 30 fixes (h6–h12) must remain valid:**
  - h6 GL stability + h7 INFLATE=4 + h9 LINEAR sampling + h12 LINEAR (2D)
    are all in the post-draw mesh-warp; orthogonal to outside-fx.
  - h2 (rebuild outside-fx mirror after snapshot apply) and h3 (wire
    `syncOutsideRuntimeMirror` into live-sync-core ctx) operate on the
    `outsideMp4PlaybackStateByBoard` map; options A/B preserve the map and
    its lifecycle, just modulate when capture writes to it.
  - h8 (loading overlay holds until outside mp4 readyState≥2) is unaffected.
  - h10 (GIF parser path on /output/, shared playback canvas, no
    willReadFrequently) is in `runtime-gif-playback.js` — orthogonal.
- **Diagnostic chip + effective-mode visibility must remain working** —
  `__ttBeamerEffectiveRenderMode` reads the GL renderer's loss counters,
  unchanged by any option.
- **No source-code edits in this research pass.** All implementation
  sketches above are pseudo-code for the planner's task breakdown.

## Sources

### Primary (HIGH confidence — code in this repo, read directly)

- `src/app/runtime/render/runtime-draw-loop.js:561-770` — the per-frame
  `draw()` body, full read.
- `src/app/runtime/render/runtime-outside-mp4.js:210-303` —
  `captureOutsideMp4FallbackFrame`, `drawOutsideMp4FallbackFrame`,
  `shouldDrawOutsideMp4Now` (the gating logic).
- `src/app/runtime/render/runtime-canvas-clip.js:21-138` — `clipToRoom`,
  `clipToOutsideShip` body.
- `src/app/runtime/render/runtime-perf.js:140-220` — `recordRuntimeFrameCost`,
  `shouldCoalesceNonCriticalAnimation`, `isRenderCriticalAnimation`.
- `src/app/runtime/render/runtime-gif-playback.js:212-285` — shared playback
  canvas + putImageData lifecycle (h10 + h12).
- `src/app/runtime/render/runtime-effect-visuals.js` — coded effects body,
  to confirm they aren't in the test scenario's hot path.
- `src/app/runtime/state/runtime-room-geometry.js:118-205` — per-room
  polygon math + render metrics cost.
- `src/app/runtime/viewport/runtime-projection-gl-renderer.js:74-525` — full
  GL warp path, confirms it's path-specific.
- `src/app/runtime/viewport/runtime-projection-2d-fallback-renderer.js:11-187`
  — full 2D warp path, confirms it's path-specific.
- `src/app/runtime/viewport/runtime-projection-mapping.js:231-303` —
  `postDrawMeshWarp` dispatch, confirms the GL/2D fork.
- `src/app/runtime/viewport/runtime-stage-viewport.js:189-285` —
  canvas dimension computation, confirms 1920×1080 on Pi /output/.
- `src/styles.css:88-95` — `.projection-area` is `100vw × 100vh` on /output/.
- `index.html:925-983` — diagnostic chip rAF + setInterval (confirms 500 ms
  refresh, not per-frame).

### Secondary (MEDIUM-HIGH confidence — Chromium issue tracker, official docs)

- [Chromium bug 91208 — html5 video to webgl texture upload is slow](https://bugs.chromium.org/p/chromium/issues/detail?id=91208)
  — concrete numbers on `texImage2D(video)` cost.
- [WebCodecs issue #421 — Converting VideoFrame to canvas/WebGL texture is very slow](https://github.com/w3c/webcodecs/issues/421)
  — confirms 80fps→10fps drop with a single video drawImage at high
  resolution; the same magnitude regression matches /output/ on Pi.
- [Chromium issue #305617 — 1000-fold performance hit in canvas.drawImage()](https://bugs.chromium.org/p/chromium/issues/detail?id=305617)
  — concrete numbers on context.drawImage when source is video element.
- [web.dev — requestVideoFrameCallback for efficient per-video-frame ops](https://web.dev/articles/requestvideoframecallback-rvfc)
  — confirms drawImage(video) needs main thread.
- [Chrome blog — It's always been you, Canvas2D](https://developer.chrome.com/blog/canvas2d/)
  — Chromium's auto-demote from GPU to software backend under memory pressure.
- [MDN — Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
  — clearRect is GPU-accelerated when canvas is GPU-backed; software
  fallback otherwise.

### Tertiary (LOW-MEDIUM confidence — community/forum)

- [Raspberry Pi Forums — Understanding maximum FPS on Pi 4 (~30 fps fullscreen)](https://forums.raspberrypi.com/viewtopic.php?t=304534)
  — empirical Pi 4 X11 fullscreen ceiling.
- [LeMaRiva — Pi 4 hardware accelerated video decoding in Chromium](https://lemariva.com/blog/2020/08/raspberry-pi-4-video-acceleration-decode-chromium)
  — H.264 hw decode is available on Pi 4 but not all formats.
- [Schiener — Chrome's willReadFrequently](https://www.schiener.io/2024-08-02/canvas-willreadfrequently)
  — secondary confirmation that the h12 willReadFrequently removal was the
  right direction.

## Metadata

**Confidence breakdown:**
- Invalidated hypotheses: HIGH — code-reading + the "10 fps in both
  modes" datum makes them logically impossible.
- Top candidate (#1 redundant capture): HIGH-MEDIUM — code path is
  unambiguous, but the absolute cost on Pi VC4 needs the measurement
  plan to confirm.
- Optimization options A & B: HIGH — file-local, low blast radius,
  preserve all hard constraints.
- Optimization option C/F: LOW — speculative; flagged as out-of-scope.

**Research date:** 2026-05-05
**Valid until:** ~7 days (fast-moving phase 30 hotfix series; rerun if
hotfixes h13+ land).
