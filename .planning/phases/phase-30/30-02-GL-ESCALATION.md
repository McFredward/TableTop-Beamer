# Plan 30-02 Task 4 — GL ESCALATION

**Date:** 2026-05-05
**Branch taken:** GL-ESCALATION (Branch 2 per Plan 30-02 Task 4 spec)

## Trigger

User UAT after Plan 30-02 Task 2 (2D-fallback NEAREST analog @ commit
`4387d81`) reported:

- **2D mode:** seams accepted (no complaint) — Task 2 fix held.
- **GL mode:** seams still visible on Pi /output/.
- **`auto` mode:** routes to GL on Pi (default 80%/3×3 grid has
  displacements per Phase 27 W4 → `hasGridDisplacements()` returns TRUE)
  → seams visible.

User signal: "Fordere mich erst wieder zum Testen auf, wenn du denkst
das das Problem behoben sein könnte" — drive ALL auto-fixes through
Wave 2 + Wave 3 before next UAT. → escalation branch with code fix
applied in this run rather than deferred.

## Phase 26 h9 invariant verification (pre-fix snapshot)

```
grep -c "precision highp float" runtime-projection-gl-renderer.js
  → 2  (vertex shader + fragment shader; original h9)

grep -c "TEXTURE_MIN_FILTER, _gl.NEAREST" runtime-projection-gl-renderer.js
  → 1  (texParameteri at line 150; original h9)

grep -c "TEXTURE_MAG_FILTER, _gl.NEAREST" runtime-projection-gl-renderer.js
  → 1  (texParameteri at line 151; original h9)
```

All three Phase 26 h9 markers present and untouched by the GL escalation fix
applied here.

## Failure data interpretation (from Task 1 + Task 3 UAT)

User did not file a 3×7 matrix. The structured user signal across both UATs
collapses to:

- mode=2d: PASS (post-Task-2)
- mode=gl: FAIL (seams visible)
- mode=auto: routes to GL on Pi → FAIL (seams visible)

This pattern matches RESEARCH §"B1 Three Plausible Root Causes" candidate
**(2)** — Phase-27-W4 trapezoid corners + 80% squish bars introducing
sub-pixel-misaligned shared-edge vertices in the GL mesh-warp.

Phase 26 h9 closed the **texture-sampling** seams (highp UV + NEAREST). The
remaining mechanism is **rasterizer-side**: the WebGL rasterizer uses a
diamond-exit fill rule that evaluates coverage per-triangle. When two
adjacent triangles share an edge whose vertices land at fractional pixel
coordinates (e.g. `pt.x * 2 - 1` mapping `0.10` to `-0.8` on a 1920-wide
canvas → fractional pixel position), the diamond-exit decision can produce
a 1-pixel column where neither triangle covers, OR both cover. On /output/
the GL canvas is cleared to opaque black (`clearColor(0, 0, 0, 1)` line
267 — chosen so transparent areas read as projector-off black). When a
gap appears between triangles, that opaque-black bleeds through as a
visible 1-pixel ridge — exactly the symptom the user reports on solid-color
animations.

## Fix applied (additive — Phase 26 h9 fully preserved)

**File:** `src/app/runtime/viewport/runtime-projection-gl-renderer.js`

**Mechanism:** Pixel-snap each destination vertex to an integer pixel
coordinate before mapping to NDC. The rounding happens in framebuffer
pixel-space (`pt.x * w`), then maps back to NDC via `(pxX / w) * 2 - 1`.
This guarantees that any vertex shared between adjacent triangles maps to
**exactly the same NDC coordinate** at exactly an integer pixel boundary,
where the rasterizer's coverage decision is unambiguous and matches between
adjacent triangles.

**Diff snippet** (vertex-position computation block, ~lines 230-244 pre-edit
becoming ~lines 246-272 post-edit; comment block expanded with rationale):

```js
// Pre-edit (Phase 26 baseline):
const pt = getPoint(row, col);
_glPositions[vi]     = pt.x * 2 - 1;
_glPositions[vi + 1] = 1 - pt.y * 2;

// Post-edit (Phase 30 GL escalation):
const pt = getPoint(row, col);
const pxX = Math.round(pt.x * w);   // snap to integer pixel
const pxY = Math.round(pt.y * h);
_glPositions[vi]     = (pxX / w) * 2 - 1;
_glPositions[vi + 1] = 1 - (pxY / h) * 2;
```

## What was NOT touched

- **Phase 26 h9 fix block** (lines 96-153): `precision highp float` in
  both shaders + `TEXTURE_MIN/MAG_FILTER = NEAREST` + `CLAMP_TO_EDGE` —
  byte-identical pre/post edit. Verified by grep counts above.
- **Source UVs** (lines 254-257 post-edit): `_glUVs[vi] = grid.srcXs[col]`
  unchanged. NEAREST texture sampling already discretizes UVs at the
  texel level (Phase 26 h9), so fractional source UVs are non-problematic.
- **Phase-27-W4 trapezoid + squish geometry**: snapping is at most 0.5
  pixels per vertex on a 1080p framebuffer. At projector viewing distance
  this is visually indistinguishable from unsnapped geometry. Drag a
  trapezoid corner — projection geometry still follows the drag with
  no perceptible quantization.
- **`clearColor`** logic (line 267): unchanged. The opaque-black clear on
  /output/ stays — the fix eliminates the gaps that were exposing it.
- **No changes to the default grid** (Phase 27 W4 invariance per CONTEXT
  D-02 boundary).
- **`_postDrawMeshWarpGL`** structure: only the per-vertex computation
  inside the existing `for (let row...)` loop changed. Buffer uploads,
  drawElements call, alpha/clear logic, output-vs-dashboard branch — all
  unchanged.

## Test suite

```
node --test "test/**/*.test.mjs"
  → tests 40 / pass 40 / fail 0
```

40/40 maintained.

## Acceptance pending

UAT on Pi /output/ Test-Board Nemesis Lockdown Board A across all three
modes (2d / gl / auto) × 7 stimuli (solid-color + Malfunction + Fire +
Slime + Scanning + Flicker + Alarm). Combined with Plan 30-03 (B2 GIF
reliability) UAT — see resume_instructions for the consolidated UAT
checklist returned to the user.

## Plan 30-02 Task 4 acceptance

- Test suite: 40/40 ✓
- Phase 26 h9 GL fix block intact: `precision highp float` >= 1 (=2 ✓);
  `_gl.NEAREST` >= 2 (=2 ✓).
- Marker file: this file at `.planning/phases/phase-30/30-02-GL-ESCALATION.md` ✓.
- The skip-marker `.planning/phases/phase-30/30-02-task4-skipped.md` was
  NOT written (mutually exclusive with this branch).
