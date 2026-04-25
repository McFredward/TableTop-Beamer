# Phase 23 — Identity polish + cluster trigger UI (CLOSURE)

## Status

**CLOSED.** Three waves delivered. No regressions to existing
dispatch / live-sync paths; all additions are presentation-only on
top of the established cluster-dispatch logic. `/output` performance
recovered after the Phase 22 W5 mesh-warp landed and was further
optimised in Wave 3.

## Wave delivery

### Wave 1 — Identity ✅
- Browser tab title set to **TableTop Beamer** across all routes.
- Inline-data-URL beamer SVG wired as `<link rel="icon">` so the
  glyph ships with the bundle (no extra request) and scales
  crisply on retina.
- Topbar mark replaced with the same beamer glyph (ceiling-
  mounted projector + lens highlight + trapezoidal light cone).
  Three iterations to drop the "stem-as-stand" reading; final
  version reads as a downward beamer at every size.
- `readme-assets/tt-beamer-logo.svg` extracted as a standalone
  scalable asset for the README hero.

### Wave 2 — Cluster trigger surfaces ✅
- `<div id="cluster-pads">` rail with header `Cluster` and inner
  scrollable `#cluster-pads-list`. Pads diff-render against the
  current board's clusters from `state.runningAnimations` /
  `getBoardRoomClusters`.
- Rail uses **`position: fixed`** + JS-mirrored stage rect
  (`--rail-left/top/height/scale`) so it side-steps the parent
  overflow / stacking-context chain that kept hiding it inside
  `#stage`. Continuous rAF tracker (`updateClusterPadsRect`) keeps
  the rail in visual sync with stage pan/zoom.
- Each pad is a real render surface: a per-pad `<canvas
  class="cluster-pad-canvas">` is repainted by the draw loop's
  `drawClusterPadCanvases` pass on every frame, using the existing
  effect-visuals pipeline via `withPreviewCanvas` to re-route both
  the draw-loop's ctx AND the visuals module's ctx to the pad
  canvas.
- Tap routes through the active **Tap-Action** mode (Off / Toggle
  / Clear). Toggle is type-aware — multi-animation stacking on a
  cluster works the same as on a regular room (fire + scanning +
  flicker can run together; tapping fire toggles only fire).
- Clear stops every cluster-scope animation on that cluster.
- Empty-state placeholder when no clusters exist on the active
  board.
- Mobile: touch-momentum scrolling, `overscroll-behavior: contain`,
  rail stays visible at narrow viewports (down to 92 px wide on
  phones).
- `/output` doesn't render the rail at all (gated by output role).

### Wave 3 — `/output` perf + polish ✅
- **Direct GL display in `/output`.** A new on-stage
  `<canvas id="fx-gl-canvas">` (declared in HTML so its WebGL
  drawing buffer lives on a real DOM element from the very first
  frame) becomes the visible warp surface. The previous design did
  `drawImage(_glCanvas, 0, 0)` back to fx-canvas every frame —
  that GPU→CPU readback was the dominant per-frame cost on RPi
  (~5–10 ms at 1080p).
- Two more memcpy operations eliminated: skip the `_warpTmpCanvas`
  hop on the source side (texImage2D accepts the source canvas
  directly) and stop allocating fresh `Float32Array` /
  `Uint16Array` for positions / UVs / indices every frame.
  Total RPi savings: ~16 MB of bandwidth per frame at 1080p.
- Opaque clearColor in `/output` (the projector's "no light"
  colour). fx-canvas is cleared after the texImage2D upload so its
  now-stale unwarped content can't leak through alpha=0 areas of
  the GL framebuffer.
- Stage clipping restored: `.projection-area` and `#stage` are
  back to `overflow: hidden`. Cluster pads no longer need the
  exemption since W2 v6 made them `position: fixed`.
- Room labels now scale by **both** handle-size slider (existing)
  AND polygon size (new). Bounding-box shorter side mapped to a
  multiplier in `[0.4, 1.4]` and the final font size clamped to
  `[8, 38] px`.

## Notable W3 fixes landed alongside the wave

- **`/output` black** after the first GL-overlay attempt — the
  mid-frame DOM insertion + alpha=0 GL canvas combination produced
  a fully transparent overlay over an under-cleared fx-canvas.
  Resolved by declaring the canvas in HTML (so it's in the DOM
  from page load) and using opaque clearColor.
- **Animation alpha leak through the GL overlay**: where the
  warped triangle's source was transparent (outside-room areas of
  the texture), alpha=0 was written to the GL framebuffer and
  fx-canvas underneath leaked through, showing the unwarped
  animation simultaneously with the warped one. Fix: clearRect on
  fx-canvas after texImage2D so there's nothing left underneath
  to leak.
- **Cluster pad cluster animation rendered at board top-left**:
  `drawRoomComposition` was using draw-loop's ctx to paint into
  the pad canvas, but coded effects (solid-color, hull-flicker)
  read from the effect-visuals module's separate ctx. Solved by
  wrapping the call in `visualsModule.withPreviewCanvas(...)` so
  BOTH ctxes swap to the pad canvas during the call.
- **Cluster pad shows last frame after Clear**: renderer only
  painted into pads with running animations; non-running pads
  never got cleared. Fix: clearRect every pad canvas at frame
  start, then paint only the running ones.

## Scope held

- No new animation types or dispatch primitives.
- `/output` projection logic unchanged at the protocol level —
  only the GL display path changed.
- No data-model migration for cluster pads (uses the existing
  `state.runningAnimations` scope === "cluster" entries).

## Feature-parity checks (Phase 22 ↔ Phase 23)

- Room tap → animation: ✓.
- Cluster Quick-Pick (dropdown) → cluster animation: ✓.
- Multi-animation stacking on rooms: ✓.
- Multi-animation stacking on clusters via the new pads: ✓.
- Tap-Action Off/Toggle/Clear: ✓ on rooms AND cluster pads.
- Live Editor per-running-animation: ✓.
- Align Mode + WebGL mesh warp: ✓ (now on the optimised GL output).
- Polygon edit + rotation + Ctrl+C/V: ✓.
- Light/dark theme: ✓.
- Import/export (per-board + global): ✓.

## Follow-ups (not phase-blocking)

- Long-press on a cluster pad to open the cluster's Live Editor
  (Wave 2 step 4 from the ROADMAP — descoped after Tap-Action
  routing settled the trigger UX cleanly).
- Per-cluster icons (`cluster.icon`) — the data slot exists from
  Phase 22 W3 but the cluster pad currently uses a generic dot;
  could mirror the animation icon picker if the user wants
  glyph-per-cluster.
- Cluster Live Editor sync verification across multiple control
  clients (Wave 2 step 5 — single-client tested only).
- README cluster-pad screenshot/GIF (placeholder structure ready
  in `readme-assets/`, just needs capturing).
- Debug instrumentation that landed during the cluster-pad
  iteration is still in place gated by `window.__TT_CLUSTER_DEBUG__`
  / `window.__TT_GL_DEBUG__`. Phase 24 is the right place to
  inventory and remove all debug-only logs.

## Commits (chronological)

```
2676e5a feat(23-w1): identity polish — title, favicon, beamer mark
a809b93 feat(23-w2): cluster pads — DOM scaffold + toggle/clear wiring
0d84dab fix(23): cluster pads — left side; ceiling-beamer icon redesign
9900235 fix(23): cluster pads — empty-state hint + debug logging; icon v3
449e683 fix(23): cluster pads — projection-area overflow + pre-rendered hint
1851405 fix(23): cluster pads — debug iteration with fixed-position rail
9ee2bcd fix(23): cluster pads — recouple to stage transform, relax overflow
fc6db1b debug(23): force-visible cluster rail + computed-style probe
690da29 fix(23): cluster rail position:fixed + JS-mirrored to stage rect
bc453ef fix(23): cluster pad — drop ×, use Tap-Action; continuous rAF sync
11213aa feat(23-w2): cluster pads render the cluster animation live
6c621f8 fix(23): cluster pad fills with animation, no polygon-shape edges
2f22410 fix(23): cluster pad renders animation directly, decoupled from polygon
bdf162d fix(23): cluster pad direct-fill render + dispatch logging
55edf2f debug(23): cluster pad tap shows status + comprehensive log
8b7b452 debug(23): cluster pad — log toggle entry path + catch dispatch throws
a0112df fix(23): cluster pad toggle is type-aware (multi-anim per cluster)
5bc0121 fix(23): cluster pad — stop calls + multi-anim render via ctx-swap
d22be46 fix(23): cluster pad — coded effects route via withPreviewCanvas
b3d9d05 feat(23-w2): cluster rail — header + scrollable list, mobile-friendly
13ab558 perf(23-w3): /output/ mesh warp — direct GL display, no readback
2e52e8e fix(23-w3): /output/ black — restore GL→fx-canvas readback
b39f24b perf(23-w3): /output/ direct GL display v2 — opaque overlay
552726a fix(23-w3): /output/ — clear fx-canvas to stop alpha leak
e9b23e7 fix(23-w3): clip stage on zoom/pan + size-aware room labels
0c24fee docs: rewrite README — modern layout + new feature coverage
```
