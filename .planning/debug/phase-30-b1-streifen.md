---
status: investigating
trigger: "Persistent 1-px streifen on Pi /output/ projection-mapped output. 5 fix attempts (T2/T4/h1/h2/h3) failed."
created: 2026-05-05T22:00:00Z
updated: 2026-05-05T22:00:00Z
---

## Current Focus

hypothesis: |
  H1 (TOP): The visible streifen are produced by the **browser/compositor
  upscaling the GL drawing-buffer to the projector's native resolution**,
  NOT by anything inside the GL or 2D mesh-warp draw passes.

  Evidence chain:
  - Phase-26 SUMMARY (`Known limitations`, line 144-147) flagged it
    explicitly: "Diagnostic chip canvas shows 1920×891 not 1920×1080.
    Suggests the /output/ stage CSS is not at full HD (probably the
    Chromium window isn't truly fullscreen on the Pi). Not a
    render-correctness bug, but worth investigating if perfect 1:1
    projection is desired."
  - 1920×891 ÷ 1080 ≈ 0.825 — i.e. each source canvas pixel maps to
    ~1.213 display pixels in Y. Browser CSS-scaling with this
    non-integer ratio produces a 1-display-pixel scaling artefact
    every ~5 source rows.
  - With nowarp=1 the fx-canvas is also displayed at the same sub-1080
    backing-store size, BUT the content is uniform (no per-region
    hand-off) so the artefact distributes as imperceptible
    sub-pixel softening across the whole image. With mesh-warp
    active, every cell has an independent affine sampling kernel —
    the shared cell edges are seam-stable in the GL framebuffer
    but become **discontinuity boundaries when CSS-upscaled** because
    the upscaling kernel reads across adjacent-triangle source pixels
    that were each sampled with a slightly different affine.
  - This perfectly predicts: T2 (2D NEAREST), T4 (NDC pixel-snap), h3
    (4× MSAA) all happen INSIDE the GL framebuffer and ALL fail to
    fix the streifen — because the streifen are not in that framebuffer.
  - The "white flash" boot sequence is consistent with the loading
    overlay's `transition: opacity 0.5s ease, visibility 0.5s ease`
    fade-out (see styles.css:18-29) — but more importantly, the
    moment fx-gl-canvas first turns `display: block` (mapping.js:
    198-203) is when the GL output replaces the fx-canvas-direct
    path, and that's when streifen appear "permanently".

test: |
  ONE-LINE Pi DevTools console probe (paste at /output/?board=… without
  ?nowarp=1 once page is loaded):

      ((c, gc) => ({
        fxCanvas:    c   ? `${c.width}x${c.height}@dpr${devicePixelRatio}` : "missing",
        glCanvas:    gc  ? `${gc.width}x${gc.height}` : "missing",
        fxCSS:       c   ? c.getBoundingClientRect() : "missing",
        glCSS:       gc  ? gc.getBoundingClientRect() : "missing",
        screen:      `${innerWidth}x${innerHeight}`,
        stageRect:   document.getElementById("stage").getBoundingClientRect(),
      }))(document.getElementById("fx-canvas"), document.getElementById("fx-gl-canvas"))

  This single object readout discriminates H1 vs every other hypothesis
  in <30s without changing any code.

expecting: |
  H1 confirmed if either of:
   (a) glCanvas.height < 1080 OR glCanvas.width < 1920, AND
       glCSS.height ≈ 1080 (CSS upscaling explicit), OR
   (b) glCanvas dims = 1920×891 (matches Phase-26 documented value) and
       innerHeight = 1080 (chromium kiosk not fullscreen, stage area
       sized by clientHeight which excludes browser chrome / margins).

  H1 refuted if glCanvas.width = 1920 AND glCanvas.height = 1080 AND
  CSS rect matches 1:1. Then the streifen come from somewhere else and
  H2/H3/H4 are next.

next_action: |
  ASK USER: Paste the above 7-line snippet into Pi /output/'s DevTools
  console (chrome://inspect → remote-debug; or attach keyboard if no
  remote inspect available) and report the printed object. After that,
  the fix is one of three concrete code-level changes — see Section
  "Targeted fix(es) for top hypothesis" below. No new render code is
  written until the readout discriminates the mechanism.


## Symptoms

expected: |
  - On Pi /output/, projection-mapped output is seam-free. Solid-color
    rooms render uniformly. No 1-px streifen, ridges, or grid-pattern
    visible at projector viewing distance.
  - Animations (Malfunction, Fire, Slime, Scanning, Flicker, Alarm,
    solid-color) all render without internal seam-lines, in BOTH 2d
    and gl render modes.

actual: |
  - 1-px streifen forming a regular grid pattern visible through ALL
    animations on Pi /output/. Identical in 2D and GL modes. Identical
    on multiple boards. Identical with outside-animation enabled or
    disabled.
  - User boot sequence:
      1. Solid-color room animations briefly render WITHOUT streifen.
      2. Full-screen WHITE FLASH happens.
      3. All animations re-render WITH streifen permanently from then on.
  - With ?nowarp=1: NO streifen, but projection covers full-screen (not
    board-aligned). → mesh-warp is in the seam path.
  - APP_VERSION chip reads "0.30.0-debug" → bundle is fresh, all 5 fixes
    ARE running on the Pi.

errors: |
  No JS errors. No WebGL context-lost events reported. No render
  pipeline failures. Pure visual/render-quality issue.

reproduction: |
  1. Pi 5 in Chromium kiosk-mode at the projector. Open
     `/output/?board=Nemesis Lockdown Board A`.
  2. Wait for boot sequence to complete (white flash → streifen visible).
  3. Trigger any room animation (especially solid-color) from dashboard.
  4. Streifen visible at projector viewing distance, regardless of
     animation type or render mode.
  5. Add `?nowarp=1` to URL → streifen disappear, but projection no
     longer aligned to board.

started: |
  Phase 26 closure noted "triangulation lines on solid-color rooms" —
  Phase 26 h9 fix (highp + NEAREST) was supposed to close it, but
  user verification was deferred. Phase 27 W4 added 80%-default-grid
  (always-warp on /output/), making any residual seam mechanism
  always-visible. Phase 30 B1 is the closure attempt. 5 fix attempts
  (T2 2D-NEAREST, T4 GL pixel-snap, h1 transparent-clear [reverted],
  h2 vertex-inflate [reverted], h3 antialias=true) all failed.


## Eliminated

- hypothesis: "2D-fallback bilinear filtering causes the streifen"
  evidence: |
    T2 (commit 4387d81) set imageSmoothingEnabled=false in
    drawAffineTriangle. Streifen unchanged. Also: the bug is documented
    to occur in BOTH 2d AND gl render modes — gl mode never executes
    the 2D fallback. → 2D bilinear cannot be the cause for gl-mode
    streifen, and even when it ran for 2D-mode it failed to remove them.
  timestamp: 2026-05-05 (Phase 30 B1 T2 fix verification)

- hypothesis: "GL rasterizer fractional-pixel coverage gaps at shared
  triangle edges (the 'classic' WebGL mesh-warp seam mechanism)"
  evidence: |
    T4 (commit 0111119) snapped each destination vertex to integer
    pixel coords in NDC space (Math.round(pt.x * w)). Per WebGL spec
    + the comment in gl-renderer.js:264, this guarantees both adjacent
    triangles see byte-identical pixel boundaries at their shared
    edge — the rasterizer's diamond-exit fill rule produces consistent
    coverage. Streifen unchanged. → rasterizer-side coverage gaps at
    shared edges are NOT the mechanism (or T4 would have closed them).
  timestamp: 2026-05-05 (Phase 30 B1 T4 fix verification)

- hypothesis: "WebGL drawing-buffer needed MSAA to fill sub-pixel
  rasterization gaps"
  evidence: |
    h3 (commit ee9e393) flipped antialias=false → antialias=true,
    enabling 4× MSAA. Streifen unchanged. This rules out:
      (a) MSAA-fillable rasterizer gaps as the mechanism, AND
      (b) any class of seam that exists in the GL framebuffer at
          sub-pixel scale. MSAA samples 4 positions per pixel and
          averages — if seams existed there, MSAA would have at
          minimum visibly softened them.
  timestamp: 2026-05-05 (Phase 30 B1 h3 fix verification)

- hypothesis: "Map-key inconsistency or in-flight texture upload race
  in the per-frame texImage2D"
  evidence: |
    The h2 attempt (commit 0ea2207) modified the GL upload path
    (per-triangle vertex inflation + non-indexed drawArrays). It
    introduced UV math errors and was reverted. The streifen pattern
    is stable across thousands of frames — not a one-off race. Texture
    upload races would produce intermittent flicker, not a stable grid.
  timestamp: 2026-05-05 (Phase 30 B1 h2 revert)


## Evidence

- timestamp: 2026-05-05T22:00:00Z
  checked: |
    Phase-26 closure SUMMARY (.planning/phases/phase-26/SUMMARY.md
    lines 144-147) for documented post-closure follow-ups
  found: |
    Phase 26 explicitly noted: "Diagnostic chip canvas shows 1920×891
    not 1920×1080. Suggests the /output/ stage CSS is not at full HD
    (probably the Chromium window isn't truly fullscreen on the Pi).
    Not a render-correctness bug, but worth investigating if perfect
    1:1 projection is desired."
  implication: |
    The Pi /output/ canvas backing-store has been at 1920×891 (or
    similar sub-1080 dimensions) since Phase 26. The browser composites
    that 1920×891 buffer onto the 1080-px-tall projector via CSS
    upscaling. This is the documented "follow-up to investigate" and
    matches the user's "white flash, then streifen permanent" symptom
    timeline (the moment GL canvas first becomes display:block + gets
    upscaled to 100% of stage).

- timestamp: 2026-05-05T22:00:00Z
  checked: |
    runtime-stage-viewport.js:189-209 (collectStageViewportMetrics)
    + runtime-projection-gl-renderer.js:182-187 (GL canvas sizing)
  found: |
    GL canvas dims are slaved to fx-canvas dims:
      `if (_glCanvas.width !== w) _glCanvas.width = w;`
      `if (_glCanvas.height !== h) _glCanvas.height = h;`
    where w, h come from `canvas.width`, `canvas.height` (fx-canvas).
    fx-canvas dims come from `stage.clientWidth * dpr`,
    `stage.clientHeight * dpr` (stage-viewport.js:200-201).
    Stage CSS on /output/ is `width:100%; height:100%`
    (styles.css:97-109), and `.projection-area` is
    `position:fixed; inset:0; width:100vw; height:100vh`
    (styles.css:88-95). So if `innerHeight === 1080` AND DPR === 1,
    fx-canvas should be 1920×1080. If it's NOT, either innerHeight is
    less than 1080 (Chromium not truly fullscreen) or DPR is fractional
    (Pi connected to a high-DPR display setting).
  implication: |
    Whatever value the chip reports for canvas dims is the GL
    backing-store size. The CSS rect (getBoundingClientRect) tells us
    what size the browser is rendering it AT. If those differ ⇒ browser
    is upscaling/downscaling the canvas image to display.

- timestamp: 2026-05-05T22:00:00Z
  checked: |
    runtime-projection-mapping.js:198-211 (GL→2D fallback handling +
    fx-gl-canvas display:block toggle)
  found: |
    On /output/ when warp is active, line 201-203 sets
    `glCanvasEl.style.display = "block"` (the GL canvas becomes the
    visible surface). Before that point fx-canvas is shown directly
    (the GL canvas is `display: none` per styles.css:281). The
    transition from "fx-canvas direct" → "fx-gl-canvas overlay" is
    irreversible during normal operation (display:none reverted only
    on render-mode change or no-warp default).
  implication: |
    Matches the user's observation:
      - Boot frame 1: fx-canvas shown direct (no warp yet → no streifen).
      - White flash: fade-out of #loading-overlay (styles.css:31-35
        opacity 0.5s ease).
      - First warp activation: GL canvas becomes display:block +
        starts being upscaled by browser → streifen appear permanently.
    The "permanence" is structural: the GL canvas keeps display:block
    for as long as the warp is active.

- timestamp: 2026-05-05T22:00:00Z
  checked: |
    runtime-projection-gl-renderer.js:79-85 (GL context options)
  found: |
    `preserveDrawingBuffer: true` set explicitly. This is a known
    performance + memory penalty on Pi-class GPUs and forces an extra
    framebuffer copy on every frame. NOT directly causing streifen,
    but worth noting if pivoting to a deeper rewrite.
  implication: |
    Tangential to the streifen mechanism but a follow-up cleanup
    candidate if the GL layer is touched. Not part of the H1 fix.

- timestamp: 2026-05-05T22:00:00Z
  checked: |
    User-uploaded photo `debug/lines_bug.jpg`
  found: |
    Visible diagonal + horizontal + vertical streifen forming a regular
    grid pattern across the orange playfield. Lines have a subtle
    cyan/green tint distinct from the orange background — consistent
    with a sampling-discontinuity colour at the upscale-kernel boundary
    rather than a black/transparent gap. Pattern matches a 3×3 mesh
    grid + per-cell TL-BR diagonal triangulation: 1 vertical mid-line,
    1 horizontal mid-line, 4 diagonals.
  implication: |
    Geometric pattern matches mesh-warp triangulation exactly →
    confirms the streifen are correlated with the mesh structure. The
    cyan/green tint (not black) refutes the "coverage hole" hypothesis
    (a hole would show the opaque clearColor, which is black per
    gl-renderer.js:309). It IS consistent with bilinear upscaling
    averaging adjacent pixels at a discontinuity.


## Resolution

root_cause: |
  PENDING readout from one-line console probe (see Current Focus). H1
  is the strongest candidate but must be confirmed before code change.

fix: |
  PENDING root-cause confirmation. See "Targeted fix(es) for top
  hypothesis" section below for the three concrete CASE-A/B/C patches
  ready to apply once H1 is confirmed.

verification: |
  PENDING fix.

files_changed: []


---


## Hypothesis Ranking (4 hypotheses, priority order)

### H1 — Browser CSS-upscaling of sub-1080 GL drawing-buffer (PRIORITY 1)

**Mechanism:** The Pi /output/ stage CSS resolves to `100% × 100%` of the
viewport (`.projection-area` `inset:0; width:100vw; height:100vh`). On
the Pi, Chromium kiosk-mode is NOT truly fullscreen — viewport
`innerHeight` < 1080 (Phase-26 SUMMARY measured 891 directly from the
diagnostic chip). The fx-canvas backing-store is sized via
`stage.clientWidth × dpr`, `stage.clientHeight × dpr`
(stage-viewport.js:200-201), so the GL canvas (slaved to fx-canvas dims,
gl-renderer.js:184-187) is also sub-1080. The browser then CSS-scales
that GL framebuffer to the projector's native 1920×1080 for compositing.

The mesh-warp triangulation places shared cell-edges at exact GL-pixel
boundaries. CSS upscaling with non-integer ratio (e.g., 891 → 1080 = 1.213×)
produces a 1-display-pixel sampling artefact at every ~5th source row,
amplified at triangle-shared-edges where the warp's affine kernels
sampled the source from different texel neighbourhoods on each side.

**Predicted observable signature:** Streifen pattern is a 2D grid of
horizontal + vertical lines + cell-diagonals matching the mesh
triangulation. Stable across frames. Identical in GL and 2D modes (both
draw to the same upscaled drawing-buffer). Disappears when ?nowarp=1
because then fx-canvas is shown directly without any per-region
discontinuity (uniform upscaling produces uniformly-soft sub-pixel
artefact, not a discrete grid). All 5 prior fixes operate INSIDE the
framebuffer (T2: 2D draw, T4: NDC vertex coords, h1/h2: clear+vertex,
h3: MSAA) — none touches the upscale path → none of them helped.

**Code-level evidence:**
- `runtime-stage-viewport.js:200-201` — canvas dims derived from
  `stage.clientWidth/Height`, NOT from explicit projector resolution.
- `runtime-projection-gl-renderer.js:184-187` — GL canvas dims slaved
  to fx-canvas dims (no override for /output/).
- `src/styles.css:97-109` — stage uses `width:100%; height:100%` on
  /output/, so any sub-fullscreen viewport propagates directly to
  canvas dims.
- `.planning/phases/phase-26/SUMMARY.md:144-147` — Phase-26 closure
  explicitly flagged this geometry mismatch (1920×891 vs 1080) as
  the "investigate if perfect 1:1 projection is desired" follow-up.

**Diagnostic test (Pi-side, ≤30s):** One-line console probe — see
"Current Focus.test". Reads canvas dims, CSS rect, and viewport size
in a single object print. Discriminates H1 vs all others without code
change.

**Disconfirming evidence that would refute H1:**
- Canvas dims === 1920×1080 AND CSS rect === 1920×1080 (perfect 1:1
  mapping; no upscaling). Then H1 is wrong; pivot to H2/H3/H4.

---

### H2 — Pi VC4/VC6 driver-level texture-upload non-pixel-aligned UV interpolation (PRIORITY 2)

**Mechanism:** The Pi 5 VideoCore VII (and VC6 on Pi 4) has a known
quirk where vertex-attribute interpolation can produce 1-LSB
floating-point drift in `varying highp vec2 vUV` along the long
edge of triangles whose vertices span the framebuffer. The drift
is below the texel-quantization threshold for NEAREST sampling on
small grids (≤2×2) but adds up across a 3×3 grid where each
triangle covers ~50% of a 800-pixel-wide region — a 1-LSB UV drift
× 800px → 1 texel of drift at the far end. The seam appears at the
shared edge between triangles that approached it from opposite
directions in their vertex order.

**Predicted observable signature:** Streifen pattern visible
specifically on /output/-resolution rendering on Pi hardware,
NOT on dev-machine Chromium with same GL canvas dims. Pattern is
oriented along triangle long-edges (the shared diagonals + the
mesh row/column lines). Disappears entirely if highp is forced
to mediump (would expose hardware difference) — or worsens if
mediump is the actual problem.

**Code-level evidence:**
- `runtime-projection-gl-renderer.js:121-132` — vUV declared
  highp explicitly. The fragment-shader fallback to mediump
  (#else branch) would activate on hardware without GLSL highp.
  Pi 5 VC7 advertises highp support, but vendor reports show
  intermittent precision regressions across firmware versions.
- Phase-26 h9 fix block already addressed the easy-mode of this
  (highp + NEAREST). Residual drift below texel quantization is
  the only mechanism left in this category.

**Diagnostic test (Pi-side):** Run the ?nowarp=1 test on a 2×2
grid (only 4 cells, edges align to viewport corners + center).
If streifen appear at THE SAME geometric positions as on a 3×3
grid (per-cell TL-BR diagonals) it's H1 (CSS upscale, geometry-
fixed). If the streifen pattern reduces from 6 lines to 2, it's
H2 (interpolation drift, edge-count-dependent).

**Disconfirming evidence:** Streifen appear on dev machine at the
same GL canvas dims (1920×891) → not Pi-specific → H2 wrong, H1
or another mechanism.

---

### H3 — `preserveDrawingBuffer: true` causes Pi compositor to read a stale framebuffer mid-paint (PRIORITY 3)

**Mechanism:** GL context option `preserveDrawingBuffer: true` (line 82
of gl-renderer.js) forces the browser to keep the drawing-buffer's
contents across frames, which on Pi-class GPUs forces an extra
synchronous CPU-readback every frame. If the readback completes
mid-display-refresh, the compositor can sample from a partially-
updated framebuffer, producing tear-like 1-pixel artefacts at the
boundaries between regions that were drawn at different sub-frame
times (which would correlate with mesh triangle order).

**Predicted observable signature:** Streifen positions correlate with
draw-order of triangles (TL-first → TR diagonals brighter than
BL-first → BR diagonals, etc.). Frame-rate dependent — at 30fps the
pattern is stable; at 60fps it can shift. Disappears with
preserveDrawingBuffer=false.

**Code-level evidence:**
- `runtime-projection-gl-renderer.js:82` — explicit
  `preserveDrawingBuffer: true`.
- WebGL spec: this option is documented to disable the
  composer-side optimization where the drawing-buffer is auto-cleared
  pre-frame. On Pi (KMS+EGL stack) this is known to interact poorly
  with desynchronized: true (line 84).

**Diagnostic test (Pi-side):** Edit gl-renderer.js:82 to
`preserveDrawingBuffer: false` (single-character change). Reload Pi.
If streifen disappear → H3 confirmed. If unchanged → H3 ruled out.

**Note:** Lower priority because Phase 26 SUMMARY notes the GL canvas
worked seam-free at 1920×891 immediately after h9 closure (user
reported h9 fixed seams initially, before they re-appeared in
Phase 27/30). preserveDrawingBuffer was already on at h9-closure
time, so it's unlikely to be the new cause — but it's still a known
artefact source worth crossing off.

---

### H4 — Underlying SVG `#room-overlay` is rendering grid alignment lines on top in /output/ even outside align-mode (PRIORITY 4)

**Mechanism:** The room-overlay SVG (index.html:79) has CSS
`body[data-output-role="final-output"] #stage > *:not(#fx-canvas):not(#room-overlay):not(#fx-gl-canvas) { display: none !important; }`
(styles.css:187-189) — the room-overlay is explicitly KEPT
visible on /output/. The runtime-projection-handle-ui.js draws
alignment grid lines at `lineCtx.fillStyle = "#fff"` (handle-ui.js:
904, 922). If those grid-line elements are rendered into the
room-overlay even when `align-mode` is off, they'd be visible as
white streifen on /output/.

**Predicted observable signature:** Streifen are pure white (not
cyan-green), align with the GRID (not the triangulation diagonals
— SVG lines wouldn't include the per-cell TL-BR diagonals).
Disappears when align-mode is OFF (state.alignMode === false).
Disappears if room-overlay is forcibly hidden via DevTools.

**Code-level evidence:**
- `src/styles.css:119-123` — `body[data-output-role="final-output"].align-mode-active
  #room-overlay { display: block !important }` — explicit gate that
  ALIGN-MODE-ACTIVE controls room-overlay display on /output/.
  When align-mode is OFF, room-overlay should be `display:none` per
  the rule at styles.css:111-117. Verify state.
- `runtime-projection-handle-ui.js:904, 922` — white fill style for
  grid-line canvas elements (separate canvas, not SVG). Element ID
  `projection-grid-line-canvas` (styles.css:170-175) is `position:
  fixed; inset: 0; pointer-events: auto; z-index: 9997`. THIS
  CANVAS IS ALWAYS VISIBLE if it has content drawn — the CSS
  doesn't hide it.

**Diagnostic test (Pi-side):** DevTools console one-liner:
`document.getElementById("projection-grid-line-canvas")?.getBoundingClientRect()`
+ check inline style. Refute H4 if grid-line-canvas display:none or
its bounding rect is 0×0.

**Note:** Photo shows lines with cyan-green tint, NOT white — partial
refutation already. But projection-grid-line-canvas overlap with
align-mode flow on /output/ deserves a single console-probe verification.

---


## Recommended Top Hypothesis: H1 (CSS upscale of sub-1080 GL framebuffer)

**Strongest evidence:**
1. **Phase 26 closure SUMMARY directly predicted this exact follow-up.**
   The 1920×891 measurement was already on file. No prior B1 attempt
   has tested it.
2. **Explains why all 5 prior attempts failed.** T2/T4/h1/h2/h3 ALL
   operate inside the GL framebuffer; the streifen are introduced by
   compositing OUTSIDE the framebuffer.
3. **Explains the boot-time "white flash → streifen permanent"
   sequence.** GL canvas first becomes display:block at the moment
   warp activates → that's when CSS upscaling begins.
4. **Explains nowarp=1 disappearing the streifen.** With nowarp=1
   fx-canvas is the visible layer (uniform upscale, no
   per-region discontinuity). With warp, GL canvas is the visible
   layer and the per-triangle affine kernels create boundary
   discontinuities that the upscale exposes.
5. **Photo geometry matches a 3×3 mesh exactly:** 1 vertical + 1
   horizontal mid-line + 4 cell diagonals = the visible pattern.

**Smallest possible Pi-side test (1-line probe):**

Paste this into Pi /output/ DevTools console (no code change):

```js
((c, gc) => ({ fxCanvas: c ? `${c.width}x${c.height}@dpr${devicePixelRatio}` : "missing", glCanvas: gc ? `${gc.width}x${gc.height}` : "missing", fxCSS: c ? c.getBoundingClientRect() : "missing", glCSS: gc ? gc.getBoundingClientRect() : "missing", screen: `${innerWidth}x${innerHeight}`, stageRect: document.getElementById("stage").getBoundingClientRect(), }))(document.getElementById("fx-canvas"), document.getElementById("fx-gl-canvas"))
```

**Expected H1-confirming readout:**
```
fxCanvas:  "1920x891@dpr1.00"   ← OR similar sub-1080 dim
glCanvas:  "1920x891"            ← matches fxCanvas
fxCSS:     {width: 1920, height: 1080, ...}  ← BROWSER UPSCALES TO 1080
glCSS:     {width: 1920, height: 1080, ...}  ← BROWSER UPSCALES TO 1080
screen:    "1920x891"            ← Chromium NOT truly fullscreen
```

If glCanvas height differs from glCSS height → H1 confirmed.
If they match (e.g., both 1920×1080) → H1 refuted; pivot to H3 or H2.


---


## Targeted fix(es) for H1 (apply ONLY after H1 confirmed)

The fix space is constrained: we need to make the GL drawing-buffer
match the **actual display pixel grid** so the browser doesn't have to
upscale at all. Three concrete options, in order of preference:

### CASE A — Snap GL canvas dims to projector's known native resolution (1920×1080) on /output/

**Patch location:** `src/app/runtime/viewport/runtime-projection-gl-renderer.js:182-187`

Replace:
```js
const w = canvas.width;
const h = canvas.height;
if (_glCanvas.width !== w || _glCanvas.height !== h) {
  _glCanvas.width = w;
  _glCanvas.height = h;
}
```

With:
```js
// On /output/ the GL canvas is composited directly to the
// projector. If the fx-canvas backing-store is smaller than the
// projector's native resolution (Phase 26 SUMMARY documented
// 1920×891 vs 1080 on Pi kiosk), the browser CSS-upscales the GL
// framebuffer for display, producing 1-display-pixel scaling
// artefacts that show as streifen at mesh-triangle boundaries.
// Bypass by sizing the GL backing-store to match the displayed
// CSS rect (which the browser has already laid out to the actual
// projector pixel size).
const isOutput = ctx.outputRole === ctx.OUTPUT_ROLE_FINAL;
let w = canvas.width;
let h = canvas.height;
if (isOutput) {
  const cssRect = _glCanvas.getBoundingClientRect();
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  const targetW = Math.round(cssRect.width * dpr);
  const targetH = Math.round(cssRect.height * dpr);
  if (targetW > 0 && targetH > 0) { w = targetW; h = targetH; }
}
if (_glCanvas.width !== w || _glCanvas.height !== h) {
  _glCanvas.width = w;
  _glCanvas.height = h;
}
```

**Why this works:** The GL backing-store now matches the projector's
actual pixel grid. The browser upscales nothing (1:1 CSS-to-buffer
mapping). All triangle-edges land on real display pixels. No upscale
sampling kernel is involved.

**Risk:** The texture upload (`texImage2D(canvas, ...)` line 200)
samples the source fx-canvas at fx-canvas resolution (still 1920×891).
The GL framebuffer is then 1920×1080 with NEAREST sampling → some
fx-canvas pixels are sampled twice along Y. Visually identical to the
status-quo browser-level upscale, BUT now the upscale happens
**inside** the GL pipeline with NEAREST filter (deterministic, no
sampling-kernel boundary artefacts) instead of in the browser
compositor (bilinear by default, kernel introduces seams).

**Acceptance:** Streifen disappear; trapezoid + squish geometry
unchanged (still uses normalized grid coords).

---

### CASE B — Force fx-canvas backing-store to projector resolution (cascading fix)

**Patch location:** `src/app/runtime/viewport/runtime-stage-viewport.js:189-209`

Add a /output/-specific override in `collectStageViewportMetrics`:

```js
function collectStageViewportMetrics() {
  const stage = ctx.stage;
  const rawWidth = stage?.clientWidth || ctx.projectionArea?.clientWidth || window.innerWidth || 1;
  const rawHeight = stage?.clientHeight || ctx.projectionArea?.clientHeight || window.innerHeight || 1;
  let cssWidth = Math.max(1, Math.round(rawWidth));
  let cssHeight = Math.max(1, Math.round(rawHeight));
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  // /output/ pinning: align the canvas pixel grid to the actual
  // projector pixel grid by reading the displayed CSS rect (which
  // the browser has computed against the real viewport, including
  // any kiosk-mode chrome / margin). Phase 30 B1: removes the
  // mesh-warp streifen produced by browser-level CSS upscaling.
  if (ctx.outputRole === ctx.OUTPUT_ROLE_FINAL) {
    const stageRect = stage?.getBoundingClientRect?.();
    if (stageRect && stageRect.width > 0 && stageRect.height > 0) {
      cssWidth = Math.round(stageRect.width);
      cssHeight = Math.round(stageRect.height);
    }
  }
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
  return { cssWidth, cssHeight, dpr, pixelWidth, pixelHeight };
}
```

**Why this works:** Same effect as CASE A but at the **fx-canvas**
level. fx-canvas now matches projector pixel grid. GL canvas inherits
that (line 184-187 unchanged). No browser CSS upscaling anywhere.

**Risk:** If clientHeight is the truncated 891-px value while
getBoundingClientRect.height is the full 1080-px CSS-resolved value,
this fix correctly snaps to 1080. But if BOTH dimensions are 891
(e.g., the stage CSS is 891-px in both descriptions because the
viewport is 891-px), then there's nothing to snap to — the projector
itself is being driven at sub-1080. In that case CASE A is the only
viable fix (it reads the projector's actual pixel grid via
getBoundingClientRect on the canvas element directly).

**Acceptance:** Same as CASE A.

---

### CASE C — Disable browser CSS upscaling via `image-rendering: pixelated` on canvases (cosmetic-only fallback)

**Patch location:** `src/styles.css:259-272`

Add to the `#fx-canvas, #fx-gl-canvas` rule:
```css
#fx-canvas, #fx-gl-canvas {
  /* … existing rules … */
  image-rendering: pixelated;   /* or: crisp-edges */
}
```

**Why this works:** Forces the browser compositor to use NEAREST
upscaling instead of the default bilinear. Sampling-kernel-boundary
seams disappear because there's no kernel — each display pixel reads
exactly one canvas pixel.

**Risk:** Visually-rougher upscaling (visible block-pixelation on the
projection if the canvas is materially smaller than 1080). Acceptable
on solid-color content (which is the worst-case for streifen anyway —
no detail to alias). May produce slight visual ridges on
content-rich animations (Fire, Slime) at projector viewing distance,
but the comment says NEAREST vs LINEAR is "imperceptible at
projector viewing distance" already (gl-renderer.js:160-162) — same
trade-off applies here.

**Acceptance:** Streifen gone, but trade for slight pixelation
visible on content with fine detail. Lowest-risk patch (one line
of CSS) but lowest visual quality.

**Recommendation:** Apply CASE A as the primary fix. CASE B is the
fallback if CASE A's per-frame `getBoundingClientRect` cost is
measurable on Pi (it's a forced layout, ~1-3ms on Pi 5). CASE C is
the trivial-rollback fallback if neither A nor B works structurally.

---


## Probe instrumentation plan (if H1 readout is inconclusive)

If the one-line probe reveals canvas dims === 1920×1080 (H1
refuted), here's a single-round 3-probe instrumentation that
discriminates H2 vs H3 vs H4:

### Probe P1 — Insert at `runtime-projection-gl-renderer.js:188` (right after the canvas-dim sync, before any draw)

```js
// PHASE 30 B1 PROBE — remove after diagnosis
if (!window.__streifenProbeP1Logged) {
  console.log("[B1-streifen-probe] post-canvas-sync", {
    glCanvas: `${_glCanvas.width}x${_glCanvas.height}`,
    glCanvasCSS: _glCanvas.getBoundingClientRect(),
    glOptsAntialias: _gl.getContextAttributes().antialias,
    glOptsPreserve: _gl.getContextAttributes().preserveDrawingBuffer,
    maxRenderbufferSize: _gl.getParameter(_gl.MAX_RENDERBUFFER_SIZE),
    samples: _gl.getParameter(_gl.SAMPLES),
    glVendor: _gl.getParameter(_gl.VENDOR),
    glRenderer: _gl.getParameter(_gl.RENDERER),
  });
  window.__streifenProbeP1Logged = true;
}
```

**Reads on first frame.** Output discriminates:
- `samples > 0` confirms MSAA active. If streifen visible despite
  samples > 0 → H3 confirmed (preserveDrawingBuffer interaction).
- `glRenderer` containing "VC4" or "VC6" or "V3D" confirms Pi
  hardware path. Cross-reference with Mesa version known issues.
- `glCanvasCSS.height !== _glCanvas.height` confirms H1 (browser
  upscale) — but the one-line probe in Section "Current Focus"
  already discriminates this.

### Probe P2 — Insert at `runtime-projection-gl-renderer.js:285` (right before drawElements, AFTER positions/UVs are filled)

```js
// PHASE 30 B1 PROBE — remove after diagnosis
if (!window.__streifenProbeP2Logged) {
  // Sample 4 representative vertices: (0,0), (1,0), (0,1), (1,1)
  // and the centre (1,1) of a 3x3 grid.
  const cells = grid.srcXs.length * grid.srcYs.length;
  console.log("[B1-streifen-probe] vertices-pre-draw", {
    cells,
    cols: grid.srcXs.length,
    rows: grid.srcYs.length,
    sampleNDC: {
      tl: [_glPositions[0], _glPositions[1]],
      tr: [_glPositions[2 * (grid.srcXs.length - 1)], _glPositions[2 * (grid.srcXs.length - 1) + 1]],
      mid: [_glPositions[2 * Math.floor(cells / 2)], _glPositions[2 * Math.floor(cells / 2) + 1]],
    },
    sampleUVs: {
      tl: [_glUVs[0], _glUVs[1]],
      tr: [_glUVs[2 * (grid.srcXs.length - 1)], _glUVs[2 * (grid.srcXs.length - 1) + 1]],
      mid: [_glUVs[2 * Math.floor(cells / 2)], _glUVs[2 * Math.floor(cells / 2) + 1]],
    },
  });
  window.__streifenProbeP2Logged = true;
}
```

**Reads on first warp frame.** Output discriminates:
- All sampleNDC values exact-pixel-aligned (i.e. `(pxX/w)*2-1` produces
  values matching expected snap) → H2 (interpolation drift)
  candidate. The vertex math IS correct; drift would be in the
  hardware interpolator, not the inputs.
- UVs are exactly at grid.srcXs/Ys boundaries → no drift in input
  data; rules out an input-side bug.

### Probe P3 — Insert at `runtime-projection-handle-ui.js:902` (line drawing entry, right before any draw call to projection-grid-line-canvas)

```js
// PHASE 30 B1 PROBE — remove after diagnosis
if (!window.__streifenProbeP3Logged) {
  const lineCanvas = document.getElementById("projection-grid-line-canvas");
  console.log("[B1-streifen-probe] grid-line-canvas-state", {
    exists: !!lineCanvas,
    display: lineCanvas?.style?.display,
    inlineStyle: lineCanvas?.getAttribute("style"),
    visibility: lineCanvas ? getComputedStyle(lineCanvas).display : "n/a",
    zIndex: lineCanvas ? getComputedStyle(lineCanvas).zIndex : "n/a",
    canvasContent: lineCanvas
      ? `${lineCanvas.width}x${lineCanvas.height}`
      : "n/a",
    handlesVisible: window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE?.getGrid?.()
      ? "(grid loaded)" : "(grid missing)",
    alignModeActive: document.body.classList.contains("align-mode-active"),
  });
  window.__streifenProbeP3Logged = true;
}
```

**Reads once when handle-ui's drawLines is invoked.** Output
discriminates H4 (alignment grid bleeding through):
- `alignModeActive: false` AND `display: 'block'` AND `canvasContent
  > 0×0` → H4 confirmed (grid-line-canvas is rendering even outside
  align-mode on /output/).
- `display: 'none'` OR `canvasContent: 0x0` → H4 refuted.

**Pi-side workflow:** Apply all 3 probes in a single commit, single
hard-reload on Pi, single user-reported screenshot of console output.
Three log lines, deterministic readout, discriminates H2 vs H3 vs H4
in one round.

---


## Anti-recurrence strategy

**Tier 1 — Code-level invariant (immediate, this phase):**

Add a runtime assertion at the bottom of `_postDrawMeshWarpGL` that
verifies GL framebuffer dimensions match the displayed CSS rect on
/output/. Log a `console.warn` once if mismatched. This catches H1-class
regressions immediately on any future Pi /output/ session — visible in
the first ~10 frames of operation.

Suggested location: `runtime-projection-gl-renderer.js:336` (after the
clearRect/drawImage block, before `return true`):

```js
if (isOutput && !window.__glDimsValidated) {
  const glRect = _glCanvas.getBoundingClientRect();
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  const expectedW = Math.round(glRect.width * dpr);
  const expectedH = Math.round(glRect.height * dpr);
  if (Math.abs(expectedW - _glCanvas.width) > 1
      || Math.abs(expectedH - _glCanvas.height) > 1) {
    console.warn(
      "[mesh-warp] GL framebuffer mismatched display rect — "
      + "browser will CSS-upscale and produce mesh seams. "
      + `framebuffer: ${_glCanvas.width}×${_glCanvas.height}, `
      + `display: ${expectedW}×${expectedH}`,
    );
  }
  window.__glDimsValidated = true;
}
```

**Tier 2 — Diagnostic-overlay extension (next phase):**

Extend the existing `output-status-chip` (index.html:186-196) to
include a "compositor" segment that explicitly shows
`fxCanvas-px / projector-px` ratio. If !=1.00, render the chip in
warning yellow. Phase 30 already has the chip wiring — adding a
ratio metric is ≤10 LOC.

**Tier 3 — Phase-32 follow-up (deferred):**

Actually fix the underlying Chromium-kiosk-not-fullscreen problem on
Pi. Options: chrome.exe `--start-fullscreen --kiosk
--window-size=1920,1080 --window-position=0,0`, OR investigate why
viewport innerHeight reports 891 instead of 1080 (Wayland compositor
issue? overscan setting in `/boot/firmware/config.txt`?).
