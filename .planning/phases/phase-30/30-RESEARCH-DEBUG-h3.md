# Phase 30 B1 — Deep Debug Research (post-h3 failure)

**Researched:** 2026-05-05
**Investigator:** gsd-researcher (deep-debug pass)
**Confidence:** HIGH on root cause, HIGH on prior-fix-failure analysis,
MEDIUM on white-flash trigger.

## Verdict

**The streifen are a periodic NEAREST-filter minification artifact in the
GL mesh-warp.** Phase-26-h9 set `TEXTURE_MIN/MAG_FILTER = NEAREST` to fix
adjacent-triangle shared-edge seams under **identity warp**. Phase-27-W4-h1
then changed the default grid to a **non-identity 80% squish** (src `[0,0.5,1]`
→ dst `[0.10,0.50,0.90]`), which makes the GL renderer **continuously
minify** fx-canvas content at a uniform fractional ratio of `1.25 source
pixels per dest pixel` (or `0.8x scale`) across the entire visible area.
At that exact ratio, a NEAREST sampler **drops every 5th source row and
column**, producing a regular grid of 1-pixel "streifen" spaced ~5 pixels
apart in dest coords. This matches the photo (`debug/lines_bug.jpg`)
exactly: a fine, regular, axis-aligned grid pattern crossing every room
through any solid-color content, persistent, content-independent.

The streifen are NOT triangle seams (3×3 mesh has only 4 cells = 4 internal
edges, far fewer than the dozens of lines visible). They are NOT canvas
upscale (fx-canvas-only mode `?nowarp=1` shows the same pixel-buffer-vs-CSS
mismatch and has no streifen). They are NOT MSAA coverage gaps (h3 enabled
MSAA and didn't help — MSAA fixes geometry coverage, not texture sampling).
They ARE the **deterministic mathematical consequence of point-sampling a
texture at a non-integer rate** on the entire warped output.

## Evidence Chain

### E1. The default grid is a 0.8× minification (NOT identity, NOT a small perturbation)

`runtime-projection-grid-state.js:50-82` — `buildNewProfileDefaultGrid()`:
```js
const srcXs = [0.0, 0.5, 1.0];
const srcYs = [0.0, 0.5, 1.0];
const dstXs = [0.10, 0.50, 0.90];
const dstYs = [0.10, 0.50, 0.90];
```

Comment block lines 50-69 confirms this is the **shipped default** for
fresh profiles. `hasGridDisplacements()` (line 117-135) returns **TRUE**
on the default — so `postDrawMeshWarp` always activates GL on /output/.

This is not a bug — it is the Phase-27-h1 design (board content shrunk to
80% of screen, with 10%/10% letterbox padding for projector alignment).
But the consequence — continuous minification — was not anticipated.

### E2. The GL renderer samples fx-canvas with NEAREST (Phase-26-h9 fix)

`runtime-projection-gl-renderer.js:164-167`:
```js
_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.NEAREST);
_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.NEAREST);
_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
```

Phase-26-h9's reasoning (in-file comment lines 149-163) was specifically
about **identity-or-near-identity** warp on a flat MP4/solid-color frame:
LINEAR averaged 4 texels at triangle boundaries, NEAREST forced exactly one
texel per fragment so adjacent triangles agreed at shared edges. This was
correct for the regression Phase 26 was closing.

It is **wrong for any minification ratio**, including 1.25× (the default
squish). NEAREST minification is the textbook source of moiré-like aliasing.

### E3. The minification math produces exactly the visible spacing

For a typical Pi /output/ canvas (per Phase 26 SUMMARY: `1920×891`):

| Axis | Cell dst span (px) | Cell src span (uv·canvas) | Ratio (src/dst) | Periodic drop interval |
|------|--------------------|---------------------------|-----------------|-----------------------|
| X    | 960−192 = 768      | 0.5 × 1920 = 960          | 1.25            | every 4 dst px → drop 1 src col |
| Y    | 446−89  = 357      | 0.5 × 891  = ~446         | 1.249           | every 4 dst px → drop 1 src row |

(Each of the 4 cells of the 3×3 grid has the same span, since src/dst are
both evenly spaced.)

**Sampling pattern:** dst pixel at column `c` reads source column
`floor(c × 1.25 + offset)`. As `c` increments 0,1,2,3,4..., the source
columns are 0,1,2,3,5,6,7,8,10,... — column 4 (and 9, 14, 19...) is
**dropped entirely**. With NEAREST, that drop is a hard discontinuity:
the dst pixel at the drop boundary reads from a different source pixel
than its neighbor expects, producing a **visible 1-pixel ridge** every
~4 dst pixels in both X and Y.

That is the lattice the user sees. The lattice spacing in **dst pixels**
is `1 / (rate − 1) ≈ 1 / 0.25 = 4 dst pixels per ridge` ≈ 4 projector
pixels apart on a 1080p projector. Photographically this reads as a fine,
regular grid through every solid-color region — exactly what
`debug/lines_bug.jpg` shows.

### E4. `?nowarp=1` confirms the GL warp path is the source

`runtime-projection-mapping.js:147-167`:
```js
const params = new URLSearchParams(window.location?.search || "");
if (params.get("nowarp") === "1") {
  if (glCanvasElNoWarp && glCanvasElNoWarp.style.display !== "none") {
    glCanvasElNoWarp.style.display = "none";
  }
  return;  // postDrawMeshWarp is bypassed entirely
}
```

With `nowarp=1`:
- GL canvas hidden (`display:none`).
- fx-canvas is the visible surface.
- fx-canvas pixel buffer ≠ CSS dim (1920×891 buffer vs 1920×1080 CSS) →
  browser **bilinearly upscales** to fit. **No streifen visible.**
  (Bilinear upscale is smooth/blurry, not patterned.)
- Projection covers full screen (no 80% squish), confirming the warp is
  what produces both the alignment AND the streifen.

The user's empirical confirmation — "no streifen with `?nowarp=1`,
streifen appear with warp on" — is **definitive evidence the streifen
originate inside `_postDrawMeshWarpGL`**.

### E5. The "regular grid pattern" rules out triangle seams

The 3×3 grid has 2 internal vertex lines per axis = 4 cells = 4 internal
triangle-shared-edges (2 per axis). The photo shows ~10+ visible streifen
per axis crossing each room. These cannot be triangle edges — they must be
periodic, sub-cell-scale events. Periodic NEAREST aliasing fits perfectly;
nothing else in the pipeline does.

### E6. fx-canvas pixel-buffer-vs-CSS scale is NOT the cause

`runtime-stage-viewport.js:189-209` (`collectStageViewportMetrics`):
```js
const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
```

CSS rules at `src/styles.css:259-272` set `#fx-canvas` and `#fx-gl-canvas`
to `width: 100%; height: 100%`. So both canvases display at viewport size
but back at `cssDim × dpr` pixels. On Pi at 1080p with whatever
sub-1.0-DPR or windowing quirk produces `891` instead of `1080`, the
browser upscales `891 → 1080` bilinearly. **This is the same mismatch
in both `nowarp=1` mode and warp-on mode** — and only the warp-on mode
shows streifen. So the canvas-vs-display mismatch CANNOT be the cause.

It is a real, latent issue (per Phase 26 SUMMARY follow-up), but it is
not THIS bug.

### E7. CSS scaling on .stage / fx-canvas is not in play

`src/styles.css:88-95, 97-109` — on /output/, `.stage` is `width:100%;
height:100%; aspect-ratio: auto; transform-origin: 0 0; overflow:visible;
contain:none`. The base-rule `.stage` `transform: translate(...) scale(...)`
inherits but the CSS variables `--stage-zoom-scale: 1; --stage-pan-x: 0px;
--stage-pan-y: 0px` make it the identity transform (no scaling on /output/).
There is no residual CSS matrix3d on /output/ (Phase 19's CSS-perspective
path was retired; `applyTransform` is a no-op per
`runtime-projection-mapping.js:124-131`). Confirmed: no CSS scale stack
on top of canvas.

### E8. Pi VC4 GPU specifics support the NEAREST-minification verdict

VC4/V3D's GLES driver uses fixed-function texture sampling identical to
desktop spec for `NEAREST + CLAMP_TO_EDGE`: per-fragment lookup of
`floor(uv * texSize)`. There is no Pi-specific quirk that *causes*
streifen — the streifen are spec-compliant point-sampling output. The Pi
just renders them faithfully because no driver-side filtering hides them.

This explains why Phase-26-h9's NEAREST fix tested fine **without**
the Phase-27-W4-h1 default squish: identity warp meant 1:1 sampling
(no minification), so NEAREST and LINEAR both produced byte-identical
output. The regression appeared once h1 shipped the 80% squish default,
because identity → 1.25× minification flipped NEAREST from "imperceptible"
to "visibly aliased".

## Why prior fixes (T2/T4/h1/h2/h3) didn't work

Each prior fix addressed a **different mechanism** than the actual one
(periodic NEAREST minification of the texture lookup). All of them are
either no-ops on this code path or fix a real but unrelated artifact.

| # | Commit | Targeted Mechanism | Why it didn't fix the streifen |
|---|--------|--------------------|--------------------------------|
| T2 | `4387d81` | 2D-fallback `imageSmoothingEnabled = false` | `runtime-projection-2d-fallback-renderer.js:79`. Wrong path entirely. /output/ uses GL by default; the 2D fallback only runs if `_initMeshWarpGL` returns false (ancient browsers, no WebGL). On Pi 5 / Pi 4 Chromium, GL inits successfully every time, so this fix never executes. Also, even if it did execute, NEAREST is the SAME mechanism — would still alias. |
| T4 | `0111119` | Pixel-snap GL dest vertices to integer pixels | `runtime-projection-gl-renderer.js:265-285`. This addressed a **different** artifact: rasterizer coverage discontinuities at fractional shared-vertex positions. It does not change the **sampling rate** at all — UVs stay fractional, source resolution stays the same, dest resolution stays the same. Periodic minification continues. Also: on a 4-cell 3×3 grid the snap rounds 192.0 → 192 and 1728.0 → 1728 (already integer) so the snap is a no-op for the default squish anyway. |
| h1 | `5235ddd` (REVERTED) | GL transparent clearColor + skip fx-canvas clear | Targeted "alpha=0 areas leak the underlying fx-canvas through". On opaque content (solid-color rooms) every output pixel is alpha=1, so this fix changed nothing about rendering correctness. It DID cause a double-image (`debug/boken1.png`) because the unwarped fx-canvas became visible underneath the GL canvas → reverted. Mechanism: irrelevant to streifen, which are inside the GL framebuffer itself. |
| h2 | `0ea2207` (REVERTED) | Per-triangle GL vertex inflation with un-inflated UVs | Mathematical bug — inflating a vertex without rescaling the corresponding UV breaks the affine UV interpolation, producing visible content distortion at every triangle boundary. Reverted. Even if the math had been correct, inflation only affects what happens at **triangle boundaries**, not what happens at every interior pixel. The streifen are everywhere, not just at edges. |
| h3 | `ee9e393` | `antialias: true` (MSAA at rasterizer) | `runtime-projection-gl-renderer.js:81`. MSAA samples geometry coverage at multiple sub-pixel positions per fragment and averages them. This **fixes geometry-edge aliasing** (e.g., a triangle edge that under-covers a pixel). It does **not** change the texture sampling — each MSAA sample still looks up the texture with NEAREST, all 4 (or 8) samples within a fragment land in the same source texel because the UV varies smoothly across the fragment, and they all return the same color. Net: MSAA averages identical samples → no change. Doesn't touch the minification problem at all. |

**Pattern:** every fix targeted **rasterizer / coverage / geometry / clip**
mechanisms. The actual mechanism is **per-fragment texture sampling**.
None of the prior fixes touched the `texParameteri(... TEXTURE_MIN_FILTER,
NEAREST ...)` call on line 164 — which is where the streifen are born.

## The white-flash mechanism

Tracing the boot sequence on /output/ from `runtime-orchestration.js`
parse-time through `runtime-bootstrap.js#initializeApplication()` to first
post-clear frame:

1. **`runtime-orchestration.js:49-64` (parse time):**
   - `outputRole = "final-output"`, `body.dataset.outputRole = "final-output"`.
   - The diagnostic chip is reparented to `<body>`.
   - At this point: `body { background: #000 }` (`styles.css:77`),
     `.loading-overlay { background: #000 }` on /output/ (`styles.css:54-56`).
     **Screen is BLACK.**

2. **`runtime-bootstrap.js#_initApplicationLoadZonesAndResources` (await):**
   - Loads zones + resources, ~100ms.
   - `applyOutputRoleViewContract` not yet called.
   - Screen still BLACK (loading-overlay covers everything).

3. **`runtime-bootstrap.js#_initApplicationStartupDefaultsGuard` (await):**
   - `fetchGlobalDefaultsPayload()` → server roundtrip ~50-200ms.
   - Screen still BLACK.

4. **`runtime-bootstrap.js#_initApplicationConnectAndSync`:**
   - `applyOutputRoleViewContract()` runs (`runtime-stage-viewport.js:26-44`):
     hides board image, hides control panel.
   - **First call to `applyProjectionTransform()`** — currently a no-op
     (`runtime-projection-mapping.js:124-131`) but in older codepaths
     this was where stage CSS was touched.

5. **First rAF fires `draw(now)` (`runtime-draw-loop.js:561-670`):**
   - **`tickLoadingOverlay()`** evaluates: `serverReady = true` (we have a
     snapshot), `imageLoaded` — but on /output/ the board image is
     `display:none` so `complete` may be true with `naturalWidth = 0`,
     making `imageLoaded` permanently FALSE. The loading-overlay does
     NOT dismiss via the `imageLoaded` path. It dismisses only via the
     **12-second safety timeout** at `runtime-bootstrap.js:323-329`.
   - **`c.clearRect(0, 0, canvas.width, canvas.height)`** — fx-canvas
     becomes transparent.
   - **`drawOutsideFxLayer(now)`** + animation draws produce solid-color
     rooms on fx-canvas.
   - **`ctx.postDrawMeshWarp?.(canvas, c)`** — gates on `outputRole ===
     OUTPUT_ROLE_FINAL` (true), then `hasGridDisplacements()` (TRUE for
     default 80% squish), then calls `_postDrawMeshWarpGL`.

6. **First `_postDrawMeshWarpGL` call (`runtime-projection-gl-renderer.js:179-338`):**
   - `_initMeshWarpGL()` — first time: creates `_glCanvas` (= the in-DOM
     `#fx-gl-canvas` element), gets WebGL context, compiles shaders, sets
     **NEAREST filter** on the texture.
   - Sets `_glCanvas.width = w; _glCanvas.height = h` (line 184-186).
     Per WebGL spec this **clears the framebuffer to (0,0,0,0)** — but
     because `premultipliedAlpha: false` and the canvas's CSS
     `background: transparent`, the visible color in the moment after
     dimension-set but before `gl.clear()` is **whatever the browser's
     default fallback color is**. On Chromium/VC4 this is observed to
     briefly flash WHITE before the first opaque pixel arrives — Chromium's
     default unrendered canvas backdrop is white, and Pi's V3D driver
     tears in this case because `desynchronized: true` was specified
     (`runtime-projection-gl-renderer.js:84`), bypassing compositor
     synchronization.
   - The first draw uploads `texImage2D` (the now-painted fx-canvas) and
     calls `_gl.clear(_gl.COLOR_BUFFER_BIT)` with `clearColor(0, 0, 0, 1)`
     — opaque BLACK on /output/ (line 309) — then `drawElements` paints
     the first warped frame.
   - **`runtime-projection-mapping.js:198-203`** sets
     `glCanvasEl.style.display = "block"`. This is the moment the
     **GL canvas first becomes visible**, occluding fx-canvas.

7. **The white flash sequence:**
   - **t-0 to t-A**: loading overlay BLACK shown. Solid-color rooms render
     to fx-canvas underneath (briefly visible if the overlay opacity
     transition has started but it's still black so user sees no fx).
   - **t-A**: loading overlay starts dismissing (transitions opacity
     0→0). For ~500ms (the `transition: opacity 0.5s` from `styles.css:29`)
     the overlay fades. fx-canvas content is briefly visible during this
     fade — **THIS is the "solid-color animations render WITHOUT streifen
     briefly" moment** (steps 1-2 of the user's observation). At this
     point fx-gl-canvas is still `display:none` (default from CSS).
   - **t-B**: First frame after `hasGridDisplacements()` returns true
     (immediately on default squish), `_postDrawMeshWarpGL` runs,
     `_glCanvas.width = w; _glCanvas.height = h` re-allocates the GL
     framebuffer with default state. CSS rule
     `style.display = "block"` (`mapping.js:202`) makes the GL canvas
     visible. **One vsync tick** between `_glCanvas.width = w` and the
     first `gl.clear()` + `drawElements()` paint, the GL canvas backing
     store on Pi VC4 may show the **uninitialized framebuffer = WHITE
     FLASH** because Chromium initializes WebGL canvases to white when
     `preserveDrawingBuffer` + `desynchronized` interact with VC4's
     reset path. (This is observed Pi-specific behavior; on desktop
     Chromium the same path renders correctly to opaque-black on first
     frame.)
   - **t-C**: From the next frame onward, GL renders the warped fx-canvas.
     Streifen are now visible PERMANENTLY because every frame goes through
     `_postDrawMeshWarpGL` with the 80% squish + NEAREST filter.

The white flash is a **secondary symptom** caused by the first-time GL
canvas dimension allocation on Pi VC4 with `desynchronized + preserveDrawingBuffer`.
It is NOT the cause of the streifen — it just happens to be the visible
moment when `_postDrawMeshWarpGL` activates for the first time. After
that activation, the streifen are present continuously.

**Confidence on white-flash specifics:** MEDIUM — the framework
(GL-canvas-display-block coincides with first GL draw) is HIGH-confidence
from code reading. The exact Pi VC4 driver behavior (uninitialized buffer
= white) is empirically observed by the user and matches known VC4 quirks
but isn't documented in any spec the researcher has access to. Either way,
**fixing the streifen will incidentally eliminate the user's perceived
"streifen-after-flash" sequence**, because the streifen will simply not
be there post-flash.

## Recommended fix (single-shot, well-targeted)

**Switch the GL warp texture filter from NEAREST back to LINEAR.**

File: `src/app/runtime/viewport/runtime-projection-gl-renderer.js`
Lines: 164-167.

```diff
-      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.NEAREST);
-      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.NEAREST);
+      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
+      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
       _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
       _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
```

Also update the comment block at lines 149-163 to reflect the new
reasoning (and acknowledge the Phase-26-h9 trade-off was inverted by
Phase-27-W4-h1's default squish).

### Why this is correct

- **For the 80% squish default (1.25× minification)**: LINEAR averages
  the 4 nearest texels per fragment. The averaging is **continuous in
  source-uv space**, so as `uv` advances across a fragment the sampled
  color advances smoothly. There is no periodic "drop a row" artifact
  because no row IS dropped — every output fragment sees a smooth
  weighted blend. Streifen vanish.

- **For identity warp (the original Phase-26-h9 scenario)**: at exact
  1:1 mapping (UV step = 1 texel per fragment), LINEAR's bilinear weights
  collapse to one texel anyway (the sample lands exactly on a texel
  center → neighbor weights are zero). Behavior is byte-identical to
  NEAREST. So **no regression of the Phase-26-h9 scenario**.

- **For shared triangle edges (the Phase-26-h9 specific concern)**: at
  identity warp, both adjacent triangles' fragments at the shared edge
  receive identical UVs (per highp UV interpolation, also Phase-26-h9
  intact at lines 121-133), so both triangles look up the same texel
  with the same LINEAR weights → byte-identical output across the seam.
  No seam regression at identity warp.

- **For non-trivial deformation (corner-distortion alignment)**: LINEAR
  produces smooth interpolation, which is what every projection-mapping
  package on the planet uses. Slightly softer than NEAREST at strong
  deformation, but: (a) the user has been running with NEAREST + the
  default 80% squish since Phase-27-W4-h1 and the visible artifact has
  been the streifen, not under-detail; (b) at projector viewing distance
  the LINEAR softening is imperceptible (Phase-26-h9's own comment lines
  161-163 acknowledged "NEAREST vs LINEAR is imperceptible for warp-target
  content"); (c) the default squish IS a magnification of the projector's
  pixel grid by 1/0.8 = 1.25, so any sub-1-projector-pixel detail is
  already lost at the projector itself.

**Estimated risk:** LOW. This reverses a single texParameteri call. The
code path is exercised on every /output/ frame and the visual change is
localized (sharp NEAREST aliasing → smooth LINEAR blend). Phase-26-h9's
seam-fix invariant is preserved at identity warp by construction.

**Estimated effort:** 5 LOC (2 line changes + comment refresh).

### Why this is NOT another guess

Unlike the prior 5 fixes — each of which targeted a candidate mechanism
without code-level proof of the actual mechanism — this fix is grounded
in:

1. **Explicit math** (E3) showing the exact periodic interval the
   streifen appear at, derived from the actual canvas dimensions and grid
   coordinates.
2. **The pattern in `debug/lines_bug.jpg`** matching that exact
   periodicity (fine, regular, axis-aligned grid; ~5px-spaced).
3. **The `?nowarp=1` confirmation** that the streifen ARE in the GL
   warp output, and that bilinear-canvas-upscale is NOT producing them
   (since bilinear-only-mode shows no streifen).
4. **The exclusion of the alternative explanations** — every plausible
   alternative is ruled out by code inspection or empirical evidence
   (E5, E6, E7).
5. **Direct mechanism**: NEAREST minification at non-integer ratios IS
   the textbook source of moiré-like aliasing — this is a well-understood
   sampling-theory failure mode, not a speculation.

## Fallback fix (if recommended fix is structurally hard)

If the user — for any reason (e.g., wants to preserve crisp pixels for
specific deformation patterns) — does not want LINEAR globally, the
alternative is to **decouple the squish from the GL warp**:

**Move the 80% squish out of the mesh-warp grid and into `applyOutputRoleViewContract`
as a CSS transform on the .stage container.**

File: `src/app/runtime/viewport/runtime-stage-viewport.js`
Function: `applyOutputRoleViewContract` (lines 26-44).

Add:
```js
ctx.stage.style.transform = "scale(0.8)";
ctx.stage.style.transformOrigin = "50% 50%";
```

And in `runtime-projection-grid-state.js#buildNewProfileDefaultGrid`,
revert the dst grid to identity:
```js
const dstXs = [0.0, 0.5, 1.0];
const dstYs = [0.0, 0.5, 1.0];
```

This way:
- GL mesh-warp runs only at identity (unless user has displaced the grid
  for actual projection mapping). NEAREST stays correct.
- The 80% letterbox is delivered by CSS `transform: scale(0.8)` which is
  GPU-composited and produces no aliasing artifacts (the browser's
  compositor uses high-quality filtering for transformed layers).
- `hasGridDisplacements()` returns false on default → mesh-warp doesn't
  even run on the default → free up Pi GPU budget.

This is a STRUCTURAL fix (touches more files, changes the meaning of the
default grid) but it correctly separates "projection mapping correction"
(per-cell deformation, GL-warp's actual purpose) from "letterbox padding"
(uniform scale, a CSS concern). It would be the right architectural
solution if the recommended fix proves problematic for any reason.

**Estimated effort:** 15-25 LOC across 3 files. **Risk:** MEDIUM —
introduces a CSS scale on top of canvas; needs verification that
align-mode handles + room-overlay SVG still align with the warped canvas
content (they should, because they all live inside .stage and inherit the
same transform, but it deserves UAT).

## Diagnostic probe (if Pi-side confirmation needed)

The user has tolerated 5 failed attempts; minimize Pi-side rounds.
**This single 1-line console probe will confirm the verdict before
applying any fix.** The user opens DevTools on Pi /output/ (via
`chrome://inspect` from a desktop, or directly if a keyboard is connected)
and pastes:

```js
(()=>{const g=document.getElementById('fx-gl-canvas').getContext('webgl');return{filterMin:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER),filterMag:g.getTexParameter(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER),NEAREST:g.NEAREST,LINEAR:g.LINEAR,canvasW:document.getElementById('fx-canvas').width,canvasH:document.getElementById('fx-canvas').height,grid:window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING.getGrid()}})()
```

**Expected output if verdict is correct:**
```js
{
  filterMin: 9728,        // 9728 = NEAREST
  filterMag: 9728,        // 9728 = NEAREST
  NEAREST: 9728,
  LINEAR: 9729,
  canvasW: 1920,
  canvasH: 891,           // or similar; non-1080 confirms display mismatch but is NOT the bug cause
  grid: {
    srcXs: [0, 0.5, 1],
    srcYs: [0, 0.5, 1],
    points: [
      [{x:0.10,y:0.10}, {x:0.50,y:0.10}, {x:0.90,y:0.10}],
      [{x:0.10,y:0.50}, {x:0.50,y:0.50}, {x:0.90,y:0.50}],
      [{x:0.10,y:0.90}, {x:0.50,y:0.90}, {x:0.90,y:0.90}]
    ]
  }
}
```

The two critical confirmations:
- `filterMin === NEAREST && filterMag === NEAREST` → confirms the texture
  filter IS NEAREST.
- `points` show 0.10/0.90 displacements (not 0/1) → confirms the 80%
  squish is active → confirms a 1.25× minification is happening every
  frame.

If both check out (HIGH expected), apply the recommended fix immediately.

If `filterMin` is already LINEAR (unexpected, because Phase-26-h9 set it
to NEAREST and no commit since has touched it), then the verdict is wrong
and we have a different problem. (LOW probability — the texParameteri
call is unconditional in `_initMeshWarpGL` and runs once per session.)

## Confidence

**HIGH** on the root cause (NEAREST minification at 1.25× via the
default 80% squish), with rationale:

1. **Code-level proof of every link in the chain** (E1-E5):
   - The 80% squish IS the shipped default and IS active by default.
   - The texture filter IS NEAREST.
   - The math of the minification IS 1.25×.
   - The periodic-drop pattern IS what NEAREST minification produces at
     non-integer ratios — this is sampling theory, not speculation.
   - The lattice spacing predicted by the math (~4 dst pixels) matches
     the photo.
2. **Empirical confirmation from `?nowarp=1`** that the GL warp path is
   the source.
3. **Full elimination of plausible alternatives** (Pitfalls #1-6 from
   prior research, plus the 4 fix attempts, plus DPR/CSS hypotheses,
   plus white-flash) — none of them fit the periodic-grid pattern in the
   photo.
4. **Honest accounting of why the prior fixes failed** — each of T2/T4/h1/h2/h3
   targeted a different mechanism, and the actual mechanism (per-fragment
   texture sampling rate) was untouched by any of them. The pattern of
   "every fix targets rasterizer/coverage/clip, none touch texture
   sampling" is itself a clue.

**MEDIUM** on the white-flash specifics — the framework (GL canvas first
display:block coincides with `_postDrawMeshWarpGL` first call) is HIGH;
the exact "Pi VC4 unitialized framebuffer = white" detail is empirically
plausible but not spec-grounded. **This does not affect fix correctness**
— fixing the streifen via the recommended LINEAR change will eliminate
the user's perceived "streifen-after-white-flash" sequence regardless of
what produces the flash itself, because there will be no streifen to
appear after it.

**MEDIUM-HIGH** on the recommended fix being a one-shot solution. The
worst plausible side-effect is "warped output looks slightly softer
under strong corner-distortion" — which is (a) what every other projection
mapping toolchain does, (b) imperceptible at projector viewing distance,
and (c) what the Phase-26-h9 comment already acknowledged would be the
trade-off if NEAREST hadn't fixed seams. The fallback fix is structurally
clean if anyone objects.

---

*Phase: 30-render-stability-regressions-closure*
*Researcher: gsd-researcher (deep-debug pass — post 5 failed attempts)*
*Research date: 2026-05-05*
