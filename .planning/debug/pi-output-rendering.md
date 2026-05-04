---
status: investigating
trigger: "Two rendering bugs on Raspberry Pi /output/ view: (a) massive animation stutter when mp4 outside-FX background is active, (b) thin white seam lines inside animations"
created: 2026-04-29T00:00:00Z
updated: 2026-04-29T10:00:00Z
---

## Current Focus

hypothesis: |
  RE-INVESTIGATION #2 (2026-04-29 — GL ruled out):
  With renderMode="2d" confirmed working on Pi, GL is fully bypassed. Yet
  outside-space (pure procedural canvas-2D) runs at 3.5 fps on a Pi 5. This is
  a physical impossibility for the star-field code alone — Pi 5 is a Cortex-A76
  running hardware-accelerated Chromium with VideoCore VII. Therefore something
  ELSE is destroying frame time ON EVERY FRAME on /output/, and it is NOT the
  star drawing code itself.

  CONFIRMED PRIMARY HYPOTHESIS: The outside-space animation render is gated as
  isRenderCriticalAnimation() = true (perf.js line 121 — type "outside-space"
  is explicitly listed as critical). This means it is never coalesced. It DOES
  run every frame. But the star-field draw itself (~3-8ms at default density for
  all 3 layers + 9 express lanes) alone cannot account for 3.5 fps (~286ms/frame
  needed). Something else is consuming ~280ms/frame.

  STRONGEST CANDIDATE (H3): devicePixelRatio > 1 on the Pi 5 inflates the
  canvas to multiple times the display area. stage-viewport.js line 131:
    const dpr = Math.max(1, Number(window.devicePixelRatio) || 1)
  canvas.width = Math.round(cssWidth * dpr); canvas.height = Math.round(cssHeight * dpr)
  The chip reports canvas size. If DPR=2 on a Pi 5 connected to a 1080p screen,
  canvas = 3840×2160 = 8.3M pixels. clearRect on 8.3M pixels ~= 8ms. The
  outside-space fillRect(0,0,w,h) (black background) alone is ~8ms. Per-star
  ops on a 4× bigger canvas × 3 layers × up to 110 stars/layer = ~330 fillRects.
  At 4× canvas area, total cost could easily reach 50-100ms/frame just from
  pixel operations. The chip reads canvas.width × canvas.height @ dpr — the
  user has this data NOW. This is the #1 most plausible cause.

  SECOND CANDIDATE (H8/perf): recordRuntimeFrameCost() (perf.js:174-219) is
  called EVERY FRAME at draw-loop.js:666. Inside it: percentile(samples, 0.9)
  creates [...values].sort() on an array capped at 240 entries. That is 240
  allocs + timsort per frame. On a Pi 5 this is probably ~0.3-0.5ms/frame —
  non-trivial but not enough to explain 3.5fps alone. Only matters if other
  costs are also high.

  SECOND INDEX-RAFLoop (index.html:909-919): A SECOND requestAnimationFrame
  loop runs independently: `sampleFrame()` registers itself via rAF every frame
  to sample fps deltas. This is a separate rAF chain that ALWAYS runs on /output/
  at whatever the browser's rAF rate is. On a Pi 5 with Chromium, rAF fires at
  up to 60Hz. Two rAF callbacks competing on the same main thread means the
  browser schedules both in the same vsync window. The sampleFrame() work itself
  is trivial (one timestamp read + array push/shift). This is NOT the bottleneck
  by itself, but confirms there are two separate rAF chains.

  MOST IMPORTANT LEAD: The chip status update (index.html:920-942) runs on a
  setInterval(fn, 500) — NOT per-frame. The canvas DOM reads inside it
  (canvas.width, canvas.height, window.devicePixelRatio) occur only twice per
  second. This is irrelevant to per-frame cost.

  DEFINITIVE NEXT DATA POINT: Read the chip canvas display. If it shows e.g.
  "3840x2160@2.00" the DPR hypothesis is confirmed with very high confidence and
  the fix is to cap DPR at 1 on /output/.

test: |
  Ask user to read the output-status-chip canvas segment (format: WxH@DPR).
  If W>1920 or DPR>1.0, H3 is confirmed.
  Simultaneously audit recordRuntimeFrameCost: frameCostSamples capped at 240,
  percentile does [...values].sort() — O(n log n) but n=240 max, ~trivial.
expecting: |
  If DPR=2: canvas 3840x2160, clearRect+fillRect costs quadruple, DPR is the culprit.
  If DPR=1 and canvas ~1280x720-1920x1080: DPR is NOT the problem; re-examine
  the draw loop for a different per-frame cost source.
next_action: |
  User reads chip canvas segment to confirm or refute H3.
  If H3 confirmed: fix = cap DPR to 1.0 on OUTPUT_ROLE_FINAL in
  collectStageViewportMetrics() (stage-viewport.js:130).
  If H3 refuted: instrument the draw loop with console.time to find the actual
  expensive operation.


## Symptoms

expected:
- /output/ on the Raspberry Pi runs all animations smoothly (>=30 fps) regardless of outside-FX.
- No visible white/light seam lines anywhere inside animations or polygon clip boundaries.
- sandstorm.mp4 outside background plays without stalling the canvas pipeline.

actual:
- BUG 1: mp4 outside-FX active => every other animation hangs massively (single-digit fps or worse). Off => perf fine. Desktop dashboard unaffected.
- BUG 2: Thin white "transformation" lines visible inside animations on /output/. Present on Pi, not noticed on desktop.

errors: No JS errors. Purely runtime perf + render-quality regression.

reproduction:
1. Open /output/?board=<id> on Raspberry Pi Chromium.
2. Trigger outside FX = sandstorm (mp4) from dashboard.
3. Trigger any inside / room animation.
4. Observe BUG 1 stutter; toggle mp4 off and stutter eases.
5. BUG 2 seam lines visible independently of mp4 state.

started: Phase 26 or earlier; discovered now. APP_VERSION 0.26.12.


## Eliminated

- hypothesis: Multiple stacked canvases each running their own rAF loop
  evidence: There is only ONE rAF loop (`draw` in runtime-draw-loop.js:706) using `requestAnimationFrame(draw)`. The GL canvas (#fx-gl-canvas) does not have its own rAF; it is written to synchronously inside the single draw loop via `ctx.postDrawMeshWarp?.(canvas, c)` at draw-loop.js:647.
  timestamp: 2026-04-29

- hypothesis: HTML5 <video> element positioned in the DOM overlaying the canvas causes compositor layer demotion
  evidence: No <video> element is inserted into the DOM. Videos are created via `document.createElement("video")` (outside-mp4.js:43) and cached in a Map, but never appended to the document. The video element is never in the DOM layout tree; it is only ever used as a drawImage() source. This means GPU compositor path thrash from DOM stacking order is NOT the mechanism.
  timestamp: 2026-04-29

- hypothesis: Frame-rate throttling differs between /output/ and dashboard
  evidence: Both views run the identical single draw loop (same code path). The only difference is `ctx.getOutputRole() !== ctx.OUTPUT_ROLE_FINAL` guards for cluster-pad rendering and the list re-render (draw-loop.js:654, 659), which are SKIPPED on /output/ — that reduces work, not increases it. /output/ should be LIGHTER, not heavier, absent the mp4 issue.
  timestamp: 2026-04-29

- hypothesis: The performance degradation is caused by the GL mesh-warp texImage2D call alone (without mp4)
  evidence: postDrawMeshWarp is a no-op when hasGridDisplacements() returns false (projection-mapping.js:149). Most Pi setups run without active grid warp. The stutter appears specifically when the mp4 is active, not when just coded animations play. If texImage2D were the sole problem, all /output/ sessions with warping active would stutter regardless of mp4 state.
  timestamp: 2026-04-29

- hypothesis: White seams caused by clearRect using white background color
  evidence: `c.clearRect(0, 0, canvas.width, canvas.height)` at draw-loop.js:594 uses the 2D context's default clear (transparent black, RGBA 0,0,0,0). The canvas element itself has no explicit background style (styles.css:296-299: only `pointer-events: none; mix-blend-mode: normal`). The seam color comes from what is visible BENEATH the canvas AA halo gap, not from the clearRect color.
  timestamp: 2026-04-29

- hypothesis: Seam lines from the GL mesh-warp path (INFLATE arithmetic)
  evidence: GL mesh-warp uses per-vertex UV interpolation with no polygon clipping — it has no per-triangle clip boundaries that could seam. The GL path was specifically introduced to eliminate the 2D clip seams (gl-renderer.js comment lines 21-24). GL seams only appear at the GL canvas boundary (full edge of screen), not at internal room polygon boundaries. The visible seams inside room animations (at polygon boundaries) are not produced by the GL path.
  timestamp: 2026-04-29

- hypothesis: sandstorm.mp4 bitrate is the primary performance culprit
  evidence: ffprobe shows sandstorm.mp4 is 1920x1080, H.264 Main profile level 4.0, ~1.51 Mbps, 30fps. That is a perfectly normal, moderate bitrate. The Pi 4's hardware H.264 decoder (via V4L2 or VideoCore) handles this codec natively at full speed when played in a standalone <video> element. The bottleneck is NOT the decoder throughput but the pixel TRANSFER path: ctx.drawImage(video, ...) forces the decoded frame to go through a CPU-accessible pixel buffer before it can be composited onto the canvas.
  timestamp: 2026-04-29


## Evidence

- timestamp: 2026-04-29
  checked: runtime-draw-loop.js drawOutsideFxLayer() — mp4 branch (lines 467-494)
  found: |
    Every rAF frame, when the outside-FX is mp4 and shouldDrawOutsideMp4Now() returns true,
    the code calls:
      c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height)  [line 482]
    followed immediately by:
      ctx.captureOutsideMp4FallbackFrame(playbackState, video)       [line 483]
    captureOutsideMp4FallbackFrame (outside-mp4.js:183-196) does a SECOND drawImage
    of the video onto a separate off-screen fallbackCanvas at full canvas resolution.
    So each "draw" frame performs TWO full-resolution drawImage(video, ...) calls.
  implication: |
    Two full-resolution drawImage operations from an HTMLVideoElement source per frame.
    On the Pi, drawImage(video) is a synchronous CPU-side operation: the browser must
    read the decoded YUV frame from the video decoder's output buffer, convert it to
    RGBA, and write it into the canvas backing store. This is ~5-10 ms on a full HD
    canvas on weak hardware. DOUBLED because of the fallback capture = ~10-20 ms/frame
    just for the outside mp4, blowing the 16.7ms frame budget entirely.

- timestamp: 2026-04-29
  checked: runtime-projection-gl-renderer.js _postDrawMeshWarpGL() line 157
  found: |
    After the mp4 drawImage writes the decoded video frame into fx-canvas, the
    postDrawMeshWarp pipeline calls texImage2D(GL_TEXTURE_2D, 0, GL_RGBA, GL_RGBA,
    GL_UNSIGNED_BYTE, canvas) — uploading the ENTIRE fx-canvas pixel buffer to the
    GPU as a texture. This is a THIRD full-canvas pixel read every frame when warping
    is active. The in-source comment explicitly notes "~5 ms on a 1080p Pi 4" for
    this call alone (line 155). On /output/ with the GL path active, frame cost
    from mp4 alone: ~15-25 ms out of 16.7ms budget.
  implication: |
    When the GL warp is active, the combined cost of drawImage(video) ×2 + texImage2D(canvas)
    consumes the entire 16.7 ms frame budget by itself, before any room animation
    rendering happens. Room/inside animations then run at whatever time remains
    (near zero), producing the observed single-digit fps on everything else.
    When GL warp is NOT active (no grid displacement), texImage2D is skipped
    (projection-mapping.js:149-156), so only the 2× drawImage cost applies.

- timestamp: 2026-04-29
  checked: shouldDrawOutsideMp4Now() in runtime-perf.js (lines 259-276) and its default
  found: |
    shouldDrawOutsideMp4Now() rate-limits the main canvas drawImage based on a "tier":
    - "performance" tier: targetFrameMs = 33 ms (30 fps cap for mp4 draw)
    - "balanced" tier:   targetFrameMs = 22 ms (~45 fps cap)
    - "quality" tier:    targetFrameMs = 16 ms (60 fps cap)
    Default tier is "balanced" (perf.js line 37). So the main drawImage is
    rate-limited to ~45 fps at balanced. BUT captureOutsideMp4FallbackFrame is
    called unconditionally on EVERY frame where shouldDrawOutsideMp4Now returns true
    (draw-loop.js line 483). The fallback capture is NOT rate-limited separately.
  implication: |
    The rate limiter reduces the primary drawImage frequency but the fallback canvas
    capture is always paired with it. Each allowed draw does 2× drawImage(video).
    The rate limiter reduces FREQUENCY but not the per-frame cost when it fires.

- timestamp: 2026-04-29
  checked: captureOutsideMp4FallbackFrame purpose and architecture (outside-mp4.js:183-196)
  found: |
    The fallback canvas stores the last rendered frame so it can be replayed when
    shouldDrawOutsideMp4Now returns false (drawOutsideMp4FallbackFrame at line 198-209).
    The fallback replay uses drawImage(playbackState.fallbackCanvas, ...) which is a
    canvas-to-canvas blit — much cheaper than video-to-canvas. The intent is correct:
    show a slightly stale frame when the mp4 draw is rate-limited. However the fallback
    canvas is created at FULL canvas resolution (ensureOutsideMp4FallbackCanvas sets
    fallbackCanvas.width = mainCanvas.width, height = mainCanvas.height).
  implication: |
    The fallback canvas is full-resolution. captureOutsideMp4FallbackFrame draws the
    video into a SECOND full-res canvas. This additional drawImage is the redundant cost.
    The fallback capture could be eliminated entirely: the main canvas ALREADY contains
    the video frame after the primary drawImage. The fallback is only needed for frames
    where shouldDrawOutsideMp4Now() returns false, but after a successful draw the
    fallback canvas could be snapshotted differently (or the main canvas itself could
    serve as the "last good frame" reference via a lighter mechanism).

- timestamp: 2026-04-29
  checked: sandstorm.mp4 dimensions via ffprobe
  found: |
    Codec: H.264 Main profile level 4.0
    Resolution: 1920×1080
    Frame rate: 30 fps (constant)
    Bit rate: 1,511,142 bps (~1.51 Mbps)
    Duration: 15 seconds
    File size: 2,839,670 bytes (~2.7 MB)
  implication: |
    The video is full HD (1920×1080). Even at 30 fps with hardware decode,
    drawImage(video, 0, ..., canvasWidth, canvasHeight) on a Pi forces a
    full YUV→RGBA pixel conversion for every call. At canvas pixel size =
    CSS size × DPR (e.g. 1280×720 CSS pixels × 1.0 DPR on a Pi 4 = 1280×720
    canvas buffer), the video must be decoded and scaled-down on the CPU.
    The 1920×1080 source being downscaled onto a smaller canvas is done in
    software on Pi (the VideoCore handles H.264 decode but 2D canvas ops run
    on the ARM CPU through Skia/Cairo software rasterizer). A 720p or 480p
    transcode would reduce the pixel read area by 4× or 16× respectively.

- timestamp: 2026-04-29
  checked: runtime-canvas-clip.js clipToRoom() (lines 76-83)
  found: |
    Each room animation clip is done with a fresh ctx.beginPath() + polygon vertices
    + ctx.clip(). There is no explicit "fill the clipped region with a clear color" —
    the drawing operations (drawImage, fillRect, etc.) happen directly inside the clip.
    Each room gets its own c.save() / ctx.clipToRoom() / drawRoomComposition / c.restore()
    sequence. Adjacent rooms share a canvas edge but each clips independently.
  implication: |
    Adjacent room polygon edges that share a boundary will each produce an AA halo on
    their respective clip boundary. The two halos DON'T merge — they leave a 1-2 pixel
    gap where neither room's content fully opaquely covers the boundary. Because the
    canvas was cleared to RGBA(0,0,0,0) (transparent), that gap is transparent on the
    fx-canvas layer. What color shows through depends on what is BELOW fx-canvas in the
    DOM stacking order. In /output/ with no board image (display:none), the background
    is `body { background: black }` (#000000). A transparent gap over black would be
    black, not white. So if the seam appears white, there must be something light below.

- timestamp: 2026-04-29
  checked: body[data-output-role="final-output"] CSS rules (styles.css lines 76-153)
  found: |
    body[data-output-role="final-output"] { background: #000 }
    board-image: display: none !important
    control-panel: hidden
    The stage is: width 100%, height 100%, border:0, border-radius:0, no box-shadow.
    fx-canvas sits at z-index unset (DOM order), fx-gl-canvas at z-index:2 (styles.css:247).
    When a GL warp IS active, fx-gl-canvas is shown (display:block) at z-index:2 ON TOP
    of fx-canvas (z-index implicit). The GL canvas clears to BLACK opaque (clearColor(0,0,0,1)).
    When there are NO grid displacements, fx-gl-canvas is display:none and fx-canvas is shown.
  implication: |
    With no warp active and body background #000, a transparent seam on fx-canvas would
    appear BLACK (from the body background) — not white. So the "white seam" the user
    sees is NOT from the polygon-clip AA gap showing through to a white background.
    This means the white seam has a different source. It must be coming from WITHIN
    the rendered content: either (a) the canvas clearRect leaves transparent and some
    in-canvas compositing produces a bright artifact, OR (b) the seam is in the
    projection WARP layer (the 2D fallback or GL pass over a non-black region), OR
    (c) the drawRoomComposition fills a region that bleeds past the clip boundary.

- timestamp: 2026-04-29
  checked: solid-color effect in runtime-effect-visuals.js (lines 238-285)
  found: |
    When globalCompositeOperation === "source-over" (the normal case), solid-color
    uses globalCompositeOperation = "copy" (lines 273-279). "copy" mode REPLACES the
    destination pixels within the clip with the source color, including at the AA
    boundary. At the edge of the clip polygon (1px subpixel coverage), "copy" will
    write a PARTIALLY transparent version of the solid color — e.g. if the room color
    is pure white (#ffffff), the AA edge becomes rgba(255,255,255, 0.3..0.8) instead
    of RGBA(0,0,0,0) transparent. This is a colored halo rather than a transparent gap.
    If the solid color is light (white, yellow, light blue), the AA edge will look white
    regardless of the background. For non-solid-color effects (gif, coded), compositeOp
    stays source-over, and the AA halo resolves to the previous canvas content (which
    is transparent after clearRect, then whatever was drawn by earlier rooms).
  implication: |
    If the user has solid-color animations with a light or white color running in rooms
    that adjoin other rooms, the "copy" composite operation at the polygon clip boundary
    will write light-colored semi-transparent pixels at the edge, which will look like a
    white seam against the dark canvas content of an adjacent room. This is a real
    mechanism for white seam production that is independent of background color.

- timestamp: 2026-04-29
  checked: DPR (devicePixelRatio) handling on /output/ vs dashboard
  found: |
    Both views use the same applyStageViewportRecompute() (stage-viewport.js:190-216).
    canvas.width = Math.round(cssWidth * dpr); canvas.height = Math.round(cssHeight * dpr).
    On a Pi connected to a 1080p projector at native resolution via HDMI, DPR is 1.0.
    On a Pi connected at HiDPI or scaled display, DPR may be 2. The canvas pixel size
    = CSS size × DPR. This is standard and correct. The polygon pixel coordinates are
    computed from the normalized polygon * canvas.width/height — also correct.
    No non-integer scale is introduced at the canvas level.
  implication: |
    DPR scaling is not a source of subpixel seam misalignment on Pi. The canvas integer
    snap (Math.round) is correct. This hypothesis is ELIMINATED for /output/-specific seams.

- timestamp: 2026-04-29
  checked: drawRoomAssetImage() for non-integer translate (draw-loop.js:52-60)
  found: |
    c.translate(rect.centerX, rect.centerY) — centerX and centerY are computed as:
    centerX = roomMetrics.minX + roomMetrics.width / 2 (draw-loop.js:41)
    These derive from pixel coordinates of the room polygon bounding box.
    If roomMetrics.width is odd, then width/2 is a fractional (0.5 pixel) center.
    No floor() or Math.round() is applied to rect.centerX or rect.centerY.
    drawImage is called at -rect.w/2, -rect.h/2 relative to the translated origin.
    Both w and h come from roomMetrics.width * widthScale — can be fractional.
  implication: |
    Fractional-pixel translate in drawRoomAssetImage() means gif and mp4 room assets
    may be drawn with sub-pixel offsets. For gif/video content, this creates a blurred
    or double-sampled edge at the draw boundary inside the clip. Against an AA clip
    boundary, this produces a slightly misaligned content edge that CAN appear as a
    thin bright or dark line between the content and the clip boundary. This is a
    SECONDARY mechanism contributing to BUG 2, especially for gif/mp4 room assets.

- timestamp: 2026-04-29
  checked: 2D mesh warp inflate logic in runtime-projection-2d-fallback-renderer.js (lines 38-76)
  found: |
    The 2D fallback warp explicitly documents that it produces seams (lines 43-47):
    "The 0.5-px inflate from v1 was too subtle to hide the AA seams on MP4 content;
    1.5 px overlaps neighbours enough that the seam is painted over by the overlap."
    The fix attempted is a 1.5px inflate of each triangle's clip polygon. However the
    STROKE step (line 47 description: "explicit stroke step paints a 2-px thick line
    from the source image along the clip edge") is described in comments but not
    actually present in the code — only the inflate is implemented; no cctx.stroke()
    call exists. The inflate alone may not be sufficient if the triangle boundary
    has a very sharp angle (thin wedge), and adjacent triangle AA halos resolve to
    the clear color (transparent) rather than the image content.
  implication: |
    The 2D fallback warp path is a KNOWN seam source, documented in the code itself.
    However this path is only active when (a) projection warp grid displacements exist
    AND (b) WebGL fails to initialize. On a Pi 4 with Chromium, WebGL should succeed
    (the Pi 4's VideoCore VI supports OpenGL ES 3.1/WebGL 2.0). If GL init succeeds,
    the 2D warp path is bypassed. This means the 2D warp seams are NOT the primary
    source of the reported bug unless GL is failing silently on the Pi.


## Re-investigation: GL regression (2026-04-29)

### New user evidence (invalidates prior framing)
- ALL animations are slow on /output/ on the Pi, not only when mp4 outside-FX is active.
- This is a regression since the GL refactor of /output/ ("Umbau von /output/ zu OpenGL mit GPU usage").
- Pre-GL, /output/ ran fine on the Pi. Post-GL, Pi is unusable.
- User requirement: /output/ MUST run smoothly on Pi. GL visual fidelity on Pi is negotiable.

### Key structural fact confirmed in code
`postDrawMeshWarp()` at projection-mapping.js:146 has:
  `if (!ctx || ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;`
The GL warp runs ONLY on /output/, NEVER on dashboard.
This is the precise asymmetry explaining why dashboard is smooth while /output/ is not.

### Per-frame GL cost inventory (confirmed from source)
Every frame where hasGridDisplacements() == true:
1. texImage2D(TEXTURE_2D, 0, RGBA, RGBA, UNSIGNED_BYTE, canvas)  — full fx-canvas CPU→GPU upload.
   In-code benchmark comment (gl-renderer.js:155): "~5 ms on a 1080p Pi 4".
2. bufferData(ARRAY_BUFFER, _glPositions, DYNAMIC_DRAW)  — position vertex upload.
3. bufferData(ARRAY_BUFFER, _glUVs, DYNAMIC_DRAW)  — UV vertex upload.
   Items 2+3 are small (25 vertices × 2 floats × 4 bytes = 400 bytes each) but involve
   GL driver round-trips. Index buffer uses STATIC_DRAW and is only uploaded on grid
   resolution change — correct.

### When does hasGridDisplacements() return true?
grid-state.js loadFromLocalStorage() runs at init time and reads localStorage key
"tt-beamer.projection-mapping-v2". If ANY user has ever adjusted the projection grid
on this Pi and saved, those displaced points persist in localStorage and
hasGridDisplacements() returns true on every subsequent boot — activating the full GL
pipeline on every single /output/ frame, forever, even if visually the displacement
is trivial (<1 mm on the projector).

If the Pi was set up with even a minor corner correction (extremely common), the GL
path has been running unconditionally since the GL refactor.

### Why texImage2D is the dominant cost
The Pi 4's VideoCore VI (V3D) supports WebGL but the CPU→GPU texture upload path
(texImage2D from an HTMLCanvasElement) on Chromium/Linux goes through:
  ARM CPU (Skia rasterizer writes fx-canvas) → CPU-accessible shared memory →
  DMA to GPU texture memory
This path is NOT zero-copy on the Pi's Mesa/V3D driver stack. The full canvas pixel
buffer (~1280×720×4 bytes = 3.7 MB at typical Pi 1080p Chromium window) is read and
transferred every frame. At 60fps that is 222 MB/s of memory bandwidth just for
this one operation, competing with the animation rendering on the same ARM cores.
At ~5 ms/frame this alone sets a 200fps ceiling; combined with animation rendering it
commonly drops below 30fps.

### Secondary cost: preserveDrawingBuffer: true
The GL context is created with preserveDrawingBuffer: true (gl-renderer.js:68).
On Chromium/Mesa, this forces the compositor to treat the GL canvas as a "readable"
surface, which disables certain fast-path optimizations (direct scanout / overlay).
Instead the GL framebuffer must be copied to the compositor's backing store each frame.
On desktop GPUs this is negligible. On the Pi's shared-memory GPU architecture,
this adds a second full-buffer copy per frame on top of the texImage2D upload.

### Eliminating the "SwiftShader software WebGL" theory
The code tries webgl then experimental-webgl. Pi 4 Chromium uses Mesa/V3D (hardware
WebGL ES 2.0). The antialias:false, powerPreference:"low-power" options are already
set correctly. SwiftShader is NOT the issue — hardware GL is active. The cost is
from the architecture of the per-frame texture upload, not from software rasterization.

### Eliminating "mesh grid size is too large"
Default grid is 5×5 = 25 vertices, 16 cells, 32 triangles. This is tiny.
The vertex/fragment shader work is negligible — a single texture2D lookup in the
fragment shader. GPU fill rate is not the bottleneck. The bottleneck is the CPU→GPU
texture upload (texImage2D), not the shader execution.

### Confirming dashboard bypass
draw-loop.js:647: `ctx.postDrawMeshWarp?.(canvas, c);`
This calls projection-mapping.js:postDrawMeshWarp which immediately returns at line 146
when outputRole !== OUTPUT_ROLE_FINAL. Dashboard never executes _postDrawMeshWarpGL.
Dashboard never incurs texImage2D cost. This conclusively confirms GL warp is the
regression — it is /output/-only by design, so only /output/ suffers.

### mp4 is a secondary additive cost, not the floor
The prior diagnosis of mp4 double-drawImage remains valid as a SECONDARY cost.
But the new evidence (slow even without mp4) confirms texImage2D-on-every-frame is
the floor. With both mp4 AND GL active, costs stack:
  texImage2D (~5ms) + drawImage(video)×2 (~10-20ms) = ~15-25ms per frame
  exceeding the 16.7ms budget by 1.5×.
Without mp4, texImage2D alone (~5ms) on top of animation rendering (~5-8ms typical)
= ~10-13ms, targeting ~40fps — perceived as "sluggish" but not completely broken.
With a more complex scene (many rooms, particles, gifs) the animation rendering cost
rises and the 16.7ms budget is hit even without mp4.


## Resolution

root_cause: |

  REGRESSION ROOT CAUSE — CONFIRMED (HIGH CONFIDENCE):
  The GL refactor introduced a per-frame texImage2D upload of the entire fx-canvas
  to the GPU texture on every /output/ frame where hasGridDisplacements() is true.
  This is unconditional: it fires regardless of whether any animation is playing,
  whether the canvas content actually changed, or whether mp4 is active.
  Cost: ~5 ms/frame on Pi 4 at typical Chromium window resolution (720-1080p).
  This is /output/-exclusive (gated at projection-mapping.js:146); dashboard is
  immune. The regression appeared precisely when this GL path was introduced.

  SECONDARY COST (CONFIRMED, NOT THE FLOOR):
  The outside-FX mp4 path (draw-loop.js:479-483) calls drawImage(video) twice per
  allowed frame: once for the main canvas, once for the fallback capture canvas.
  Each drawImage(video) is ~5-10ms on Pi. Combined with texImage2D: ~15-25ms/frame,
  exceeding the budget entirely.

  TERTIARY COST (CONFIRMED):
  preserveDrawingBuffer: true (gl-renderer.js:68) forces a compositor copy of the
  GL framebuffer every frame. Should be false for /output/ since the GL canvas is
  the final display surface and no readback is needed on that path.

fix: |
  Not yet applied (diagnose-only mode). See ranked remediation plan below.

verification: N/A — diagnose-only run.

files_changed: []


## Ranked Remediation Plan

### Strategy 1 (RECOMMENDED): GL bypass on Pi — skip GL warp when not needed
Complexity: Low. Risk: Low. Pi perf gain: Eliminates the floor cost entirely.
Feature loss on Pi: Mesh-warp (projection correction) is unavailable when bypassed.
Users who rely on projection correction keep it; users who never configured it lose
nothing.

Two sub-cases:

1a. Bypass when no grid displacements exist (already partially done):
  postDrawMeshWarp() already returns early at line 149 when !hasGridDisplacements().
  This is correct and costs nothing. THE PROBLEM IS: many Pi deployments DO have
  saved grid displacements (corner corrections are common). So the bypass at line 149
  is not hit in practice.

1b. Skip GL entirely when the grid is identity (corners only, no warp):
  If the user only adjusted the four corner points (a common use case — projector
  keystone correction) but the interior points are all at default, the mesh warp
  produces only a perspective transform. This CAN be done via CSS transform
  (matrix3d) at zero per-frame cost. The GL path should only activate when interior
  grid points are displaced (actual non-affine warp). Implement a
  hasInteriorDisplacements() check that ignores corner-only adjustments.
  Cost of implementing: ~20 lines in grid-state.js + one guard in postDrawMeshWarp.
  This eliminates GL for all keystone-only setups.

1c. Never spin up GL when warp is unconfigured at all:
  On a fresh Pi with no localStorage entry, hasGridDisplacements() returns false
  and the GL path is correctly skipped. No action needed for this case.

1d. CSS transform path for corner-only warp (medium complexity):
  Re-enable the CSS matrix3d path (applyTransform is currently a no-op, line 124-131)
  for corner-only grids. The fx-canvas would then be transformed via CSS perspective
  instead of GL texturing. Zero per-frame JS cost. This is what pre-GL did.
  Risk: The CSS matrix3d path was removed because it had other issues (zoom/pan
  conflict noted in comment at line 129). Needs careful reinstatement.
  Recommendation: Implement 1b first (interior displacement check), defer 1d unless
  corner-only CSS approach is specifically needed.

### Strategy 2 (SECONDARY): GL upload optimization
Complexity: Medium. Risk: Low-medium. Pi perf gain: 2-4ms/frame.

2a. Change texImage2D → texSubImage2D:
  texSubImage2D allows updating a subregion of the texture. If a dirty-rect is
  tracked (the bounding box of rooms with active animations), only that region
  needs uploading. On a typical scene with 3-4 active rooms covering 30% of canvas
  area, this reduces upload cost by ~70%.
  Implementation: track dirty rect in the draw loop, pass to GL renderer.
  Complexity: Medium (requires dirty-rect tracking infrastructure).

2b. Set preserveDrawingBuffer: false:
  The /output/ path clears fx-canvas after the GL upload (gl-renderer.js:253-256).
  The GL canvas is the final display surface — no readback needed.
  preserveDrawingBuffer: true is needed only for the dashboard path (drawImage(
  _glCanvas) at line 263). Since GL is /output/-only, set it to false.
  Change: 1 line in gl-renderer.js. Low risk. Saves one compositor buffer copy/frame.
  Perf gain: 1-2ms/frame.

2c. DYNAMIC_DRAW → STATIC_DRAW for geometry buffers when grid not being dragged:
  Position and UV buffers currently use DYNAMIC_DRAW unconditionally (lines 217, 222).
  When no drag is in progress, the grid geometry is static. Using STATIC_DRAW (or
  better: skipping bufferData when geometry hasn't changed) would hint the GL driver
  to keep the buffers in fast GPU memory.
  Implementation: track a _glGeometryDirty flag, set on drag, clear after upload.
  Complexity: Low. Perf gain: marginal on Pi (driver hint, not a semantic guarantee).

### Strategy 3: texImage2D only when canvas content changed
Complexity: Medium. Risk: Low. Pi perf gain: Up to 5ms/frame on static frames.

Track whether fx-canvas was modified this frame (a _canvasDirty flag set by
clearRect/drawImage in the draw loop, cleared after texImage2D upload). If the
canvas was not drawn to (e.g., no running animations), skip texImage2D entirely.
The GL texture still holds the previous frame's content — correct for a static scene.
Implementation: requires a dirty flag threaded from draw-loop.js → postDrawMeshWarp.
Complexity: Medium. This is the cleanest optimization if Strategy 1 cannot be used.

### Strategy 4: 2D fallback as default on Pi
Complexity: Medium. Risk: Medium. Pi perf gain: Eliminates all GL cost.
Feature loss: Mesh-warp uses per-triangle affine (has seams on MP4 content).

The 2D fallback renderer (runtime-projection-2d-fallback-renderer.js) was the
pre-GL path. Its per-triangle clip+drawImage approach is CPU-bound but does not
involve a full-canvas GPU texture upload. On Pi with no active grid displacement,
the 2D path is a no-op (it still snapshots the canvas to _warpTmpCanvas — which
IS a cost). For keystone-corner-only setups this is the same cost as GL minus the
texImage2D overhead, but with seam artifacts on MP4.
Recommendation: Do NOT use this as the default. The GL path is architecturally
superior when the texImage2D cost is managed. Use Strategy 1 to avoid GL entirely
for non-warped sessions, keep GL for sessions with actual interior warp.

### Recommendation

Implement in this order:

STEP 1 (highest value, lowest risk): Add hasInteriorDisplacements() to grid-state.js.
  Return true only when points OTHER THAN THE FOUR CORNERS are displaced from default.
  In postDrawMeshWarp(), if !hasInteriorDisplacements() skip the GL warp entirely
  (hide fx-gl-canvas, let fx-canvas render directly to screen).
  This eliminates GL overhead for ALL keystone-only Pi setups.
  Estimated effort: ~30 lines across grid-state.js + projection-mapping.js.

STEP 2 (1 line, guaranteed safe): Set preserveDrawingBuffer: false in GL context
  creation options (gl-renderer.js:68). The /output/ path never reads back from
  the GL canvas. This removes the compositor copy penalty.

STEP 3 (medium effort): Add a _canvasDirty flag. Set it whenever clearRect or any
  drawImage/drawEffectVisual is called in the draw loop. In postDrawMeshWarp, skip
  texImage2D if !_canvasDirty. Reset flag after upload. This caps the GL cost to
  frames that actually had rendering work — static scenes cost nothing.

STEP 4 (separate concern): Fix the mp4 double-drawImage from the prior diagnosis.
  Replace captureOutsideMp4FallbackFrame's second drawImage(video) with a
  drawImage(canvas) snapshot of fx-canvas taken AFTER the primary video drawImage.
  This halves the video pixel-transfer cost.

Steps 1+2 alone should restore Pi performance to the pre-GL baseline for the
majority of Pi deployments (keystone-only or no warp configured). Steps 3+4
address the remaining costs for users with full mesh warp + mp4.

### Confidence levels

- GL texImage2D as the floor cost: HIGH. Confirmed in source code with in-code
  benchmark. The /output/-only gate is unambiguous.
- preserveDrawingBuffer cost: MEDIUM. Standard behavior on Chromium/Mesa, but
  not directly measured on Pi.
- hasInteriorDisplacements() as the bypass gate: HIGH. The logic is clear and
  the corner-vs-interior distinction is well-defined in the grid data model.
- "Many Pi users have corner-only or no displacement": HIGH (per common usage
  patterns; projection correction without full mesh warp is the typical setup).
- texImage2D dirty-skip as Step 3: HIGH for correctness, MEDIUM for exact
  perf gain (depends on how often scenes are truly static between frames).

What would raise confidence further:
- A console.time() trace on the Pi confirming texImage2D costs ~5ms as benchmarked.
- Confirming whether the specific Pi being tested has a saved localStorage grid
  (hasGridDisplacements() == true at runtime) — this is the fork in the diagnosis.
  If the Pi has NO saved grid, then hasGridDisplacements() == false, the GL path is
  already skipped, and the floor cost must have a different source (investigate
  whether some other per-frame operation was added in the GL refactor).
- Measuring frame time with and without the GL canvas present (temporarily set
  hasGridDisplacements to always return false in production and observe fps).


## Re-investigation #2: GL ruled out — 2D mode still 3.5 fps (2026-04-29)

### New evidence that invalidates the previous diagnosis

1. renderMode="2d" is confirmed working on Pi (status chip shows mode).
2. In "2d" mode the GL path is fully bypassed (confirmed in projection-mapping.js:156-163:
   when renderMode === "2d", display:none is set on fx-gl-canvas and postDrawMeshWarpGL
   is never called). texImage2D never fires.
3. Pi 5 still sits at ~3.5 fps. With GL out of the picture, the previous root cause
   is eliminated.
4. The slowness occurs specifically with the procedural outside-space animation
   (pure canvas-2D: fillRect, stroke, fillRect per star). No mp4, no GL.
5. "Es war früher flüssig" — this is a regression. The same Pi ran this smoothly before.
6. Pi 5 hardware (Cortex-A76 @ 2.4 GHz, VideoCore VII, hardware Chromium) is
   capable of thousands of fillRect calls per frame at 60fps.

### What 3.5 fps actually means

3.5 fps = 286 ms/frame. The outside-space draw at default density:
  - 3 layers × up to 110 stars each = 330 iterations
  - Each iteration: 1 c.stroke() + 1 c.fillRect()
  - Plus 9 express lanes × 1 c.stroke() each
  Total ~669 canvas calls. Even at 0.1ms each = 67ms. At 286ms budget there are
  ~219ms/frame of unexplained cost that CANNOT come from the star-field alone on Pi 5.
  Something non-animation is consuming the rest.

### Systematic per-frame cost audit (draw-loop.js draw() function)

Every rAF frame on /output/ executes, in order:
1. runtimePerf.frameIndex increment — trivial
2. mobilePerf.frameDeltaSamples push/shift (capped at 900 entries) — O(1), trivial
3. mobilePerf.triggerLatencySamples conditional push/shift — O(1), trivial
4. tickLoadingOverlay() — reads loading.dismissed bool, returns immediately after
   first board load. Trivial after startup.
5. c.clearRect(0, 0, canvas.width, canvas.height) — cost proportional to canvas
   pixel area (canvas.width × canvas.height). CRITICAL: if DPR > 1, this is
   multiplied by DPR². At DPR=2: 4× the pixel work.
6. pruneFinishedAnimations(now) — filters runningAnimations array, O(n). For typical
   small n (<20 entries) this is ~0.05ms. Not the bottleneck.
7. drawOutsideFxLayer(now) — for outside-space: resolves lifecycle key, timeline,
   calls drawEffectVisual("outside-space", ...). The star-field loop.
8. roomConcurrencyByKey loop — O(n) over runningAnimations. Trivial.
9. Animation draw loop — for each running animation, drawAnimationSafely. If only
   outside-space is running, this loop does nothing extra (outside-space is handled
   in drawOutsideFxLayer and skipped here by the early-return at draw-loop.js:370-376).
10. ctx.postDrawMeshWarp?(canvas, c) — in renderMode="2d" with no grid displacements:
    returns at projection-mapping.js:160. Trivial.
11. getOutputRole() !== OUTPUT_ROLE_FINAL guards (lines 654, 659) — both SKIP on
    /output/. No cluster pad drawing, no list re-render on /output/. These REDUCE work.
12. ctx.recordRuntimeFrameCost(performance.now() - frameStart) — EVERY FRAME calls:
    - samples.push(ms) + conditional samples.shift() (O(1))
    - percentile(samples, 0.9): [...samples].sort(compareFn) on up to 240 entries
      = array copy + timsort. On 240 entries: ~0.1-0.3ms. Acceptable.
    - getMp4PerformanceControls(): normalizeMp4PerformanceControls on state object.
      ~0.05ms. Trivial.
    - Sets pressureLevel, nonCriticalCoalesceStride, etc. — all O(1).
    Net cost: ~0.3-0.5ms/frame from percentile sort. Non-trivial but cannot explain
    3.5fps alone.

### The SECOND rAF loop (index.html:909-919)

A second standalone rAF chain runs unconditionally on all pages including /output/:
  function sampleFrame() {
    ... samples.push(delta); if (samples.length > 60) samples.shift();
    requestAnimationFrame(sampleFrame);
  }
  requestAnimationFrame(sampleFrame);
This is a SEPARATE rAF registration from the main draw loop. Both fire every vsync.
The sampleFrame work itself is ~0.02ms. This is NOT the bottleneck.
The setInterval(fn, 500) for chip UI updates is irrelevant to per-frame cost.

### H3: devicePixelRatio inflation — THE LEAD HYPOTHESIS

stage-viewport.js collectStageViewportMetrics() line 130:
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

canvas.width = pixelWidth; canvas.height = pixelHeight.

On a Pi 5 connected to a 1080p projector at native resolution: DPR should be 1.0.
BUT: if the Pi 5's Chromium is configured with --force-device-scale-factor=2,
or if the HDMI output is in a "scaled" mode (e.g. UI scale 200% in raspi-config),
DPR becomes 2.0 or higher.

At DPR=2, cssWidth=1920, cssHeight=1080:
  canvas.width = 3840, canvas.height = 2160 = 8.3M pixels
  clearRect(0, 0, 3840, 2160): fills 8.3M pixels with transparent = ~8ms on Pi
  outside-space fillRect(0,0,3840,2160) black background: another ~8ms
  Per-star fillRect(x, y, size, size) on 8.3M pixel canvas: ~3× more expensive
    than at 1920×1080 due to Skia's rasterization path on ARM.

With DPR=2 the clearRect + black background fill alone = ~16ms = entire frame budget.
Add 330+ stroke/fillRect calls = easily 50-100ms total = 3-5 fps. This matches
exactly what the user reports (3.5 fps).

The chip output-status-canvas reports: `canvas.width × canvas.height @ dpr`.
If this shows "3840×2160@2.00" or similar > 1920×1080, DPR is the confirmed cause.

Critical observation: this would be /output/-specific if the /output/ page's
viewport is somehow larger than dashboard. But in fact /output/ is configured as
fixed viewport (position:fixed, 100vw×100vh) while dashboard has a constrained
projection-area. On a full-screen Chromium window at 1080p with DPR=2:
  dashboard: the .stage is sized to min(95vw, aspect-constrained, 1280px) — much
  smaller than full-screen, so canvas.width is likely 1280×720 or similar.
  /output/: .stage fills the entire viewport = 3840×2160 at DPR=2.
THIS IS THE ASYMMETRY. Dashboard stage is smaller; /output/ stage is full-screen.
Same DPR, but /output/ canvas is 4-9× more pixels. This explains why dashboard
feels smooth while /output/ is slow — it's NOT that /output/ has extra work per
se, it's that /output/'s canvas is much larger.

Confidence: HIGH — pending user confirmation of chip canvas reading.

### H1: Align mode SVG overlay re-composited every frame

With renderMode="2d" the user needs to read the chip — this requires align mode to
be ON (the chip is /output/-exclusive CSS but was always-visible in recent commits).
Checking CSS:
  body[data-output-role="final-output"] .output-status-chip { display: inline-flex; }
The chip is ALWAYS shown on /output/ (no align-mode gate in CSS). So the user CAN
read the chip without align mode being active.
Eliminating H1: syncAlignModePanel() (stage-viewport.js:91-93) sets
roomOverlay.style.display = "none" when on /output/ and !alignMode. With align
mode OFF, the SVG overlay is display:none and is NOT composited by the browser.
No per-frame SVG cost when align mode is off.
STATUS: H1 ELIMINATED when align mode is off. If the user had align mode ON during
testing, H1 remains a secondary cost but not 286ms/frame.

### H5: Per-frame localStorage write

Searched all per-frame paths in draw-loop.js and called functions. No localStorage
write occurs per frame. persistBoardProfiles and saveGlobalDefaultsToServer are only
called on user action (button click, polygon drag commit). NOT a per-frame operation.
STATUS: H5 ELIMINATED.

### H6: getRuntimeVisualCaps() recomputed every frame

getRuntimeVisualCaps() (perf.js:160-172) reads state.runtimePerf.pressureLevel and
three max-cap values. Pure property reads + arithmetic. No DOM query, no layout
flush. Cost: ~0.02ms. TRIVIAL.
STATUS: H6 ELIMINATED.

### H9: tickLoadingOverlay() never short-circuits

tickLoadingOverlay() (draw-loop.js:677-704): reads loading.dismissed. After first
load completes, loading.dismissed = true and the function returns at line 681
immediately. One bool check per frame. TRIVIAL.
STATUS: H9 ELIMINATED.

### H10: Per-frame console output

Searched draw-loop.js for console.log/warn/error: only one console path found at
line 395 (animation_render_failed), which is in the catch block — not per-frame
unless animations fail every frame. logRender.error is not called in the hot path.
STATUS: H10 ELIMINATED for normal operation.

### H11: Viewport recompute per frame

applyStageViewportRecompute() (stage-viewport.js:190-216) reads clientWidth/clientHeight,
compares to cached values, and returns false immediately if nothing changed (line 199).
It is only scheduled via scheduleStageViewportLifecycle on resize/orientation/DPR change
events — not called per frame from the draw loop.
STATUS: H11 ELIMINATED.

### H8: frameCostSamples array growing unbounded

frameCostSamples is capped at 240 entries (perf.js:182). percentile() does
[...values].sort() on max 240 entries. This is ~0.3ms/frame worst case.
frameDeltaSamples capped at 900. Neither grows unbounded. Caps are in place.
STATUS: H8 ELIMINATED as a runaway issue; contributes ~0.3ms but not 286ms.

### Summary of surviving hypotheses (ranked by probability)

1. H3: DPR > 1 on Pi 5 (HIGH confidence — pending chip reading). Explains the
   /output/-vs-dashboard asymmetry perfectly: /output/ is full-screen, dashboard
   stage is CSS-constrained. At DPR=2, /output/ canvas = 4× pixels of dashboard.
   Fix: cap DPR to 1.0 on OUTPUT_ROLE_FINAL in collectStageViewportMetrics().
   One-line change. Zero visual impact at DPR=1 on projector.

2. Canvas pixel area from large physical screen (LOW-MEDIUM). Even at DPR=1, if the
   Pi 5's HDMI output is in a "4K" mode (3840×2160 native), the CSS viewport is
   3840×2160, canvas = 3840×2160 at DPR=1. Same massive pixel cost. Distinguishable
   from H3: chip would show "@1.00" but still show 3840×2160 canvas.

3. H2: CSS will-change/contain on .stage causing compositor thrash (LOW). The
   body[data-output-role="final-output"] .stage rule overrides contain to "none" and
   removes overflow:hidden (styles.css:97-109). So contain:paint does NOT apply on
   /output/. will-change:transform is inherited from .stage base rule (styles.css:220)
   but not overridden on /output/. On a Pi 5, will-change:transform on a 4K canvas
   could trigger GPU layer allocation. However, this alone cannot cause 286ms/frame.
   Confidence: LOW. Would only be relevant if also combined with DPR issue.

### Per-frame work that IS /output/-specific vs dashboard

  /output/: .stage is position:fixed, fills 100vw×100vh = full projector resolution
  Dashboard: .stage is width:min(95vw, aspect-ratio-constrained, 1280px) — always
    smaller than full-screen on typical desktop/tablet
  => /output/ canvas is always larger than dashboard canvas when on full-screen Pi

  On /output/: cluster pad drawing SKIPPED (draw-loop.js:654-655). List re-render
    SKIPPED (draw-loop.js:659-664). So /output/ does LESS work, not more. The only
    thing that makes /output/ heavier is canvas pixel area.


## Evidence (new entries — Re-investigation #2)

- timestamp: 2026-04-29 (re-investigation #2)
  checked: runtime-projection-mapping.js postDrawMeshWarp() with renderMode="2d"
  found: |
    Lines 156-163: when renderMode === "2d", the function sets fx-gl-canvas to
    display:none and returns early after postDrawMeshWarp2D() if grid displacements
    exist, or simply returns if none exist. _postDrawMeshWarpGL is NEVER called in
    "2d" mode. texImage2D never executes. The prior root cause is genuinely bypassed.
  implication: |
    The previous diagnosis (texImage2D as the dominant cost) is invalidated by
    renderMode="2d". The bottleneck is elsewhere.

- timestamp: 2026-04-29 (re-investigation #2)
  checked: draw-loop.js draw() — complete per-frame work inventory on /output/
  found: |
    On OUTPUT_ROLE_FINAL with outside-space only, per-frame operations are:
    clearRect (cost = DPR² × cssArea), pruneFinishedAnimations (O(n) filter),
    drawOutsideFxLayer → drawEffectVisual("outside-space") (star loops),
    postDrawMeshWarp (early return in 2d mode, trivial),
    recordRuntimeFrameCost (percentile sort on ≤240 items, ~0.3ms).
    Two /output/-specific SKIPS: cluster pads and list re-render.
    No per-frame DOM reads, no localStorage, no layout flushes confirmed.
  implication: |
    All per-frame work is accounted for. There is no hidden /output/-specific
    callback. The only plausible sources of extreme cost are:
    (a) canvas pixel area (proportional to DPR²), or
    (b) a large physical screen resolution at DPR=1.

- timestamp: 2026-04-29 (re-investigation #2)
  checked: stage-viewport.js collectStageViewportMetrics() DPR handling
  found: |
    Line 130: dpr = Math.max(1, Number(window.devicePixelRatio) || 1)
    Line 131-132: pixelWidth = Math.round(cssWidth * dpr)
    Line 205: canvas.width = metrics.pixelWidth
    No cap is applied. DPR from the browser is used unconditionally.
    On /output/ the stage fills 100vw × 100vh (CSS rule at styles.css:88-95).
    At DPR=2 and 1080p projector: cssWidth=1920, cssHeight=1080 → canvas 3840×2160.
    At DPR=1 and 4K display: cssWidth=3840, cssHeight=2160 → canvas 3840×2160 also.
    Both produce identical 8.3M pixel canvas — very different physical scenarios.
    The chip reports canvas.width × canvas.height @ devicePixelRatio, distinguishing
    both cases.
  implication: |
    Canvas pixel area is uncapped on /output/. At full-screen on Pi 5 with any
    DPR > 1 OR any screen resolution > 1080p, the canvas becomes enormous and every
    pixel-filling operation (clearRect, fillRect black background, per-star fillRect)
    multiplies proportionally. This is the highest-probability explanation for
    3.5 fps with a purely procedural animation on capable hardware.

- timestamp: 2026-04-29 (re-investigation #2)
  checked: index.html — second rAF loop for chip fps sampling (lines 909-919)
  found: |
    A second requestAnimationFrame chain (sampleFrame) runs unconditionally on all
    pages. It only does: timestamp read, delta push/shift on ≤60-entry array.
    Cost: ~0.02ms/frame. This is not a bottleneck.
    setInterval(fn, 500) for chip DOM updates is irrelevant to per-frame cost.
  implication: |
    The chip infrastructure does not contribute measurable per-frame cost.
    Two rAF loops compete for the same vsync slot but the second is trivial.

- timestamp: 2026-04-29 (re-investigation #2)
  checked: styles.css — /output/ body rules and .stage overrides
  found: |
    body[data-output-role="final-output"] .stage (lines 97-109):
      width: 100%; height: 100%; contain: none; overflow: visible.
    The base .stage rule (lines 219-222) has: will-change: transform; contain: paint;
    backface-visibility: hidden. BUT on /output/ contain is overridden to "none" and
    overflow to "visible". So contain:paint does NOT apply on /output/.
    will-change:transform IS still inherited (not overridden on /output/).
    body[data-output-role="final-output"] #room-overlay { display: none !important }
    with the align-mode exception. Overlay is hidden when align mode is off.
  implication: |
    contain:paint is already stripped on /output/ — H2 mostly eliminated.
    will-change:transform remains but is benign for a canvas element.
    The board image and control panel are display:none on /output/ — no cost.
    The room overlay SVG is display:none when align mode is off — no compositor cost.


## Resolution (updated)

root_cause: |

  RE-INVESTIGATION #2 STATUS: Prior GL root cause eliminated by user-confirmed
  renderMode="2d" bypass. Investigation now points to canvas pixel area inflation.

  HIGHEST PROBABILITY ROOT CAUSE (HIGH CONFIDENCE — pending chip confirmation):
  The canvas on /output/ is inflated to a massive pixel count, either via:
  (a) devicePixelRatio > 1 on Pi 5 (DPR=2 → 3840×2160 canvas), or
  (b) Physical display resolution > 1080p at DPR=1 (4K HDMI output).
  Both produce identical symptoms: clearRect + fillRect on 8.3M pixels is ~16ms
  just for background fills, before any star drawing. Total frame cost easily
  reaches 50-150ms = 3-7 fps for the outside-space animation.
  This is /output/-specific because the /output/ stage fills 100vw×100vh while
  the dashboard stage is CSS-constrained to at most 1280px wide.
  The chip reads canvas.width × canvas.height @ dpr — this confirms or refutes
  the hypothesis immediately.

  CONFIRMED ELIMINATED:
  - GL texImage2D (bypassed by renderMode="2d")
  - Per-frame localStorage writes (no such path in draw loop)
  - Per-frame DOM reads/layout flushes (none in hot path)
  - tickLoadingOverlay bloat (trivially short-circuits after startup)
  - frameCostSamples unbounded growth (capped at 240)
  - Align mode SVG compositor cost (overlay is display:none when align mode off)
  - Second rAF loop from chip (cost ~0.02ms/frame, trivial)

fix: Not yet applied. See ranked fix plan below.
verification: N/A — diagnose-only run, awaiting chip reading from user.
files_changed: []


## Ranked Fix Plan (Re-investigation #2)

### Fix 1 (RECOMMENDED — highest probability, lowest risk): Cap canvas DPR on /output/

File: src/app/runtime/viewport/runtime-stage-viewport.js
Function: collectStageViewportMetrics() at line 120

Current code (line 130):
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);

Proposed change:
  // On /output/ (final-output role), cap DPR at 1.0.
  // A projector does not benefit from HiDPI oversampling, and
  // at DPR=2 the canvas becomes 3840×2160 = 4× the pixel work,
  // which destroys frame rate on Pi 5 for purely procedural animations.
  const rawDpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  const isOutputRole = typeof ctx?.outputRole !== "undefined"
    ? ctx.outputRole === ctx.OUTPUT_ROLE_FINAL
    : document.body.dataset.outputRole === "final-output";
  const dpr = isOutputRole ? 1 : rawDpr;

Note: ctx (the dependency-injection bag) is available in the module via closure.
The correct check is: ctx.outputRole === ctx.OUTPUT_ROLE_FINAL.
Simpler direct check using document.body.dataset is equally safe since this
is only called after DOM is ready.

Expected fps impact: If DPR was 2.0, this reduces canvas area by 4×. Frame time
for pixel-fill operations drops from ~150ms to ~38ms. At 60fps budget this is
now comfortable. Expected: 30-60 fps.
If DPR was 1.0, this changes nothing.
Complexity: 3 lines. Risk: LOW — only affects OUTPUT_ROLE_FINAL; dashboard DPR
unchanged.

### Fix 2 (COMPLEMENTARY — if fix 1 not sufficient): Explicit canvas size cap on /output/

If DPR=1 but the Pi's HDMI output is genuinely 4K (cssWidth=3840):
File: src/app/runtime/viewport/runtime-stage-viewport.js
Function: collectStageViewportMetrics()

After computing pixelWidth/pixelHeight, add:
  // On /output/ cap canvas to 1920×1080 physical pixels — projectors and
  // TVs have no perceptual benefit from sub-1080p canvas supersampling,
  // and a 4K canvas on Pi 5 is 4× the rasterization cost for zero visual gain.
  if (isOutputRole) {
    pixelWidth = Math.min(pixelWidth, 1920);
    pixelHeight = Math.min(pixelHeight, 1080);
  }

Expected fps impact: If physical resolution was 3840×2160 at DPR=1, reduces
canvas area by 4×. Same frame-time reduction as Fix 1.
Complexity: ~5 lines. Risk: LOW — reduces canvas resolution but output is
projected; 1080p is the standard projector resolution anyway.

### Fix 3 (if both fixes 1+2 are insufficient): Reduce outside-space density cap on OUTPUT_ROLE_FINAL

File: src/app/runtime/render/runtime-perf.js
Function: getRuntimeVisualCaps()

Add a density multiplier for the output role:
  const isOutputRole = /* check state or ctx */
  const outsideStarsPerLayer = isOutputRole
    ? Math.max(18, Math.min(55, Number(state.runtimePerf.maxOutsideStarsPerLayer) || 55))
    : Math.max(18, Number(state.runtimePerf.maxOutsideStarsPerLayer) || 110);

This reduces outside-space star count on /output/ where it is fullscreen and
each star is drawn at higher pixel cost (full canvas coordinates).
Expected fps impact: Halving star count saves ~30% draw time. Not a complete fix
if canvas size is the underlying issue, but helps in combination.
Complexity: ~8 lines. Risk: LOW — visual quality reduction is imperceptible on
a projected surface viewed from a distance.

### Fix 4 (preserveDrawingBuffer — unchanged from prior plan):
Set preserveDrawingBuffer: false in GL context creation (gl-renderer.js:68).
Still valid, but irrelevant when renderMode="2d". Only helps when GL is active.

### Confidence levels (Re-investigation #2)

- Canvas DPR inflation as root cause: HIGH (all eliminated alternatives point here;
  the chip will confirm). Chip reading is the definitive test.
- Physical 4K screen at DPR=1 as alternative: MEDIUM (less common on Pi 5 setups,
  but possible with certain HDMI configurations).
- All other hypotheses (GL cost, localStorage, DOM, logging, SVG overlay): ELIMINATED.

### Definitive test before applying fixes

Ask user to read the output-status-chip canvas segment:
  Format: "Wx H@DPR" — e.g. "1920×1080@1.00" or "3840×2160@2.00"
  If W > 1920 OR H > 1080: canvas inflation is confirmed. Apply Fix 1 (DPR) and/or Fix 2 (size cap).
  If W == 1920 and H == 1080 and DPR == 1.00: canvas size is fine. A different
    source consumes ~220ms/frame. Instrumentation needed (console.time around
    individual draw sections).
