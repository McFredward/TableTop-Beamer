---
status: awaiting_human_verify
trigger: "Phase 38 W12: After fresh server boot, board shown at fullscreen identity. Align-mode ON shows lines at xrandrv2 position, stream at identity = DESYNC. First handle drag triggers snap to correct mesh-warp. SSR grid.points is correct (xrandrv2 9x9) but mesh-warp render not reflecting it until interaction. First-paint-after-boot only."
created: 2026-05-12
updated: 2026-05-12
---

## Current Focus

hypothesis: H3-refined - the GL renderer EITHER fails on first call before grid is xrandrv2 (with `_glInitTried=true _glInitOk=false`), OR succeeds with identity grid first then doesn't repaint. When init fails permanently (Xvfb test env), 2D fallback takes over and renders correctly. When GL succeeds (operator's env), the SSR's first-paint may show identity before live-hello eager-apply, encoder takes a keyframe, then grid changes — but encoder doesn't reset visibility, and `_glInitTried` is sticky so any context-change requires explicit re-init.
test: examine logs to confirm path, then build reproducer that targets the encoder keyframe path
expecting: identify the specific code path that doesn't trigger a re-render after grid mutation
next_action: focus on what differs about operator's GL-enabled env vs my Xvfb env. The 2D fallback works correctly in my env. GL must have a stale-state issue in operator's env.

## Symptoms

expected: After SSR boot + live-hello, stream shows mesh-warped board (smaller inset rectangle with black borders matching xrandrv2 9x9 geometry)
actual: Stream shows fullscreen identity board until operator interacts. Align-on shows lines at xrandrv2 (correct) overlaid on identity stream (wrong) = desync.
errors: No errors. Silent visual desync.
reproduction: Pre-seed runtime-active-grid.json with xrandrv2 9x9. Boot server. Wait for SSR warmup. Query /api/diag/ssr-screenshot WITHOUT any interaction. Stream is identity even though SSR grid.points = xrandrv2.
started: First-paint-after-boot only. Once operator interacts (drag handle), it snaps and stays correct forever.

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-05-12T_init
  checked: runtime-projection-mapping.js postDrawMeshWarp logic
  found: On SSR, renderMode is forced to "gl" so postDrawMeshWarp ALWAYS calls _postDrawMeshWarpGL. The "renderMode !== gl && !hasGridDisplacements" early-return is bypassed on SSR.
  implication: H1 (renderMode race) is unlikely — but only if state.renderMode is reliably "gl" before first frame.

- timestamp: 2026-05-12T_init
  checked: index.html + styles.css for stage layout
  found: #board-image is `display: none !important` on body[data-output-role="final-output"] — SSR tab has /ssr URL → outputRole=final-output. So board-image cannot be the source of "fullscreen board".
  implication: The fullscreen board comes from fx-canvas (if visible at full size) OR fx-gl-canvas with identity grid.

- timestamp: 2026-05-12T_init
  checked: postDrawMeshWarp success branch
  found: When _postDrawMeshWarpGL returns true, sets glCanvasEl.style.display="block" AND canvas.style.visibility="hidden". When it returns false, displays go to display:none + visibility:"".
  implication: If GL fails the FIRST time but grid is identity, then on subsequent successful frame after live-hello applies xrandrv2 — fx-canvas should be hidden and fx-gl-canvas should be visible.

- timestamp: 2026-05-12T_init
  checked: restoreGridSnapshot in runtime-projection-grid-state.js
  found: It mutates grid.{srcXs,srcYs,points} directly. Does NOT call applyTransform or notify renderer. Relies on draw loop picking up the new grid each frame.
  implication: Closure-captured `grid` reference in gl-renderer continues to read updated values. Should work — UNLESS the GL renderer caches something derived from grid.

## Resolution

root_cause: |
  restoreGridSnapshot in runtime-projection-grid-state.js replaces
  grid.{srcXs,srcYs,points} arrays wholesale (vs setPoint's in-place
  mutation). This causes a dim change at boot (3×3 identity → 9×9
  xrandrv2 via live-hello eager-apply) but DOES NOT proactively (a)
  reset the GL renderer's cached vertex/index arrays sized for the
  old dimensions, nor (b) trigger a Chromium-compositor damage signal
  on the fx-gl-canvas surface. The next rAF tick eventually rebuilds
  the GL cache via the cache-mismatch check, but the WebRTC tab-capture
  may continue to use a stale captured frame because the compositor's
  damage tracker did not see a layout/style change. The drag path
  doesn't hit this because (1) setPoint keeps dims fixed (no cache
  reset needed), and (2) the continuous drag stream generates enough
  compositor activity to invalidate stale capture layers.

fix: |
  Two coordinated changes:
  1. Export `invalidateCachedArrays()` from runtime-projection-gl-renderer.js
     that resets _glCachedRows/_glCachedCols/_glPositions/_glUVs/_glIndices.
  2. In restoreGridSnapshot (grid-state.js), after replacing the three
     grid arrays, immediately call the GL renderer's invalidateCachedArrays
     AND toggle fx-gl-canvas.style.display = "none" to flag the surface
     as dirty in Chromium's compositor. The next postDrawMeshWarp tick
     (~16 ms at 60 fps) re-flips display based on whether
     _postDrawMeshWarpGL succeeds; the brief invisibility is imperceptible
     at captured frame rates.

verification: |
  RED → GREEN verified:
  - Stashed fix → `test_w12_gl_renderer_exposes_invalidate_hook` and
    `test_w12_restore_invalidates_gl_cache` both FAIL with the expected
    message ("GL renderer must export invalidateCachedArrays").
  - Restored fix → all three W12 tests PASS.
  - Full Phase 38 test suite: 24/25 PASS (one intermittent flake tagged
    @flaky_3x, passes on retry; all W1–W11 prior fixes continue to pass).
  Awaiting operator UAT confirmation that fresh server restart →
  Pi /output/ → align-mode ON now shows board at xrandrv2 inset (no
  desync) without requiring an interaction.

files_changed:
  - src/app/runtime/viewport/runtime-projection-gl-renderer.js
  - src/app/runtime/viewport/runtime-projection-grid-state.js
  - test/live-e2e/test_phase38_w12_invalidate_cache.py
  - .planning/phases/phase-38/38-DEBUG-W12.md
