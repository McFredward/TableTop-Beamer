# Phase 39 Plan 39-4 — Sub-path Selection

**Selected by:** Plan 39-4 Task 1
**Date:** 2026-05-12T21:38:30Z
**Source:** .planning/phases/phase-39/39-1-DIAG.md (Plan 39-1 Task 3 capture; no live re-capture needed)

## Observed renderMode

`gl`

(From `39-1-DIAG.md`'s `**Observed value:** \`gl\`` line, corroborated by
two `[ssr-stats] renderMode=gl` heartbeats AND the live CDP probe
`window.__ttBeamerEffectiveRenderMode?.()` returning `"gl"`. Both sources
agree, so this sub-path decision is deterministic — no re-capture
required.)

## Chosen sub-path

**Sub-path B**

(UV-inset epsilon in fragment shader of
`src/app/runtime/viewport/runtime-projection-gl-renderer.js`.)

## Justification

renderMode value `gl` indicates GL is active on the SSR Chromium tab —
the Phase 30 pixel-snap fixes ARE firing, but seams persist. Per
39-RESEARCH.md §"D-03 Implementation Step 2B", this is a fragment-shader
rasterizer/sampling artifact at shared cell edges. Sub-path B (UV inset
`clamp(vUV, 0.5/uTexSize, 1.0 - 0.5/uTexSize)`) addresses exactly that
class of failure. Sub-path A (Chrome flag swap to
`--use-angle=swiftshader`) is NOT needed and would carry an unwarranted
risk of regressing the Phase 34 hotfix h2 revert that protects against
the Mesa-llvmpipe-class synchronous-flush hang (D-08 connection-stability
`fail>0`).

## Fallback contract

If Task 2's implementation lands but Plan 39-5 verification reveals the
seams persist:

1. Plan 39-5 will explicitly trigger a follow-up wave to LAYER the OTHER
   sub-path (A — `--use-angle=swiftshader` flag swap) on top of this
   one.
2. Sub-path A and sub-path B are NOT mutually exclusive — they can
   coexist; A controls the GL backend, B controls UV sampling within
   that backend.
3. If Plan 39-5 D-08 connection-stability `fail>0` after sub-path A is
   applied: REVERT the Chrome-flag change immediately and re-execute
   this plan against sub-path B (which is already the present plan's
   output, so the revert is a clean no-op on this side).

## Implementation target for Task 2

- **Sub-path B (chosen):**
  `src/app/runtime/viewport/runtime-projection-gl-renderer.js` — add
  `uniform vec2 uTexSize;` declaration to the fragment shader, replace
  the `gl_FragColor = texture2D(uTex, vUV);` body with `vec2 uv =
  clamp(vUV, 0.5 / uTexSize, 1.0 - 0.5 / uTexSize); gl_FragColor =
  texture2D(uTex, uv);`, fetch `uTexSizeLoc` after `linkProgram`, and
  set it with `gl.uniform2f(uTexSizeLoc, canvas.width, canvas.height)`
  before each draw call (where `canvas` is the source-image canvas that
  the existing `gl.texImage2D(... canvas)` call at line ~391 uploads).
- Sub-path A: not implemented this pass (would have edited
  `src/server/ssr-render-host.mjs` to change line `"--use-angle=default"`
  to `"--use-angle=swiftshader"`).
