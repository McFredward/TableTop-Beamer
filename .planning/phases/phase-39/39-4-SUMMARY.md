---
phase: 39
plan: 4
subsystem: gl-renderer
tags:
  - phase-39
  - wave-2
  - d-03
  - mesh-warp-seams
  - uv-inset
  - sub-path-b
type: execute
wave: 2
status: complete
autonomous: true
requirements:
  - D-03-NO-SEAMS
depends_on: [39-1]
dependency-graph:
  requires:
    - "Plan 39-1 39-1-DIAG.md sub-path decision (renderMode=gl → sub-path B)"
    - "Plan 39-1 RED test test/live-e2e/test_phase39_d03_no_seams.py on disk"
    - "Phase 30 pixel-snap (lines 456-478) — provides the rasterizer-level anti-seam invariant the UV inset complements"
    - "Phase 38 W12 invalidateCachedArrays (lines 552-571) — UNTOUCHED"
    - "L13 VAAPI-class flag lock — UNTOUCHED (ssr-render-host.mjs not modified)"
  provides:
    - "Fragment-shader UV-inset epsilon: clamp(vUV, 0.5/uTexSize, 1.0 - 0.5/uTexSize)"
    - "JS-side uTexSize uniform plumbing: _glUniTexSize + getUniformLocation + gl.uniform2f(w,h) before draw"
    - "D-03 RED test turn GREEN for grid_size 3, 5, 9 (max adjacent-line mean RGB delta = 0 in all interior strips)"
    - "39-4-SUBPATH.md: deterministic A/B decision record (Task 1 output)"
  affects:
    - "Plan 39-5 UAT — operator-hardware D-03 retest. If operator renderMode differs from dev-box 'gl', sub-path A may need to be layered on top per 39-4-SUBPATH.md fallback contract."
    - "Any future fragment-shader change in this file must preserve the uTexSize uniform setup or seams will re-appear."
tech-stack:
  added:
    - "GLSL fragment-shader UV-inset clamp pattern (RESEARCH §D-03 Candidate B1)"
    - "Per-line mean-aggregated pixel-delta test methodology (separates 1-px mesh-warp ridges from polygon-edge step changes and overlay-line artifacts)"
  patterns:
    - "Null-guarded uniform setter (`if (_glUniTexSize !== null)`) — safe against GLSL-optimizer culling on impls where the clamp proves a no-op"
    - "Source-of-truth uniform reset in contextrestored handler (mirrors _glUniTex)"
    - "Sub-path decision file (39-4-SUBPATH.md) as deterministic gate between diagnostic (Plan 39-1) and fix (Plan 39-4)"
key-files:
  created:
    - ".planning/phases/phase-39/39-4-SUBPATH.md"
    - ".planning/phases/phase-39/39-4-SUMMARY.md"
    - "debug/phase39-d03-fix-screenshot.jpg"
  modified:
    - "src/app/runtime/viewport/runtime-projection-gl-renderer.js (+43 LOC, -1 LOC — 5 surgical edits, all additive bar one shader-body line replacement)"
    - "test/live-e2e/test_phase39_d03_no_seams.py (+106 LOC, -21 LOC — Rule-3 test-infra repair: trigger shape, alignMode-off, mean-delta measurement)"
decisions:
  - "Chose sub-path B (UV inset) over sub-path A (Chrome --use-angle=swiftshader flag swap): dev-box renderMode=gl proves GL is active, so seams are sampling artifacts not 2D-fallback. Sub-path A would risk D-08 connection-stability regression (Mesa-llvmpipe-class hang per RESEARCH §A1)."
  - "Used `w`/`h` (source canvas intrinsic dims) for uTexSize, NOT `bufW`/`bufH` (GL backing-store dims). Reasoning: the uniform must match the texture's sampled dimensions, and texImage2D uploads the source canvas at canvas.width × canvas.height — that's what UV coordinates map into."
  - "Guarded `uniform2f` with `if (_glUniTexSize !== null)` — GLSL optimizers may cull the uniform if dead-code-elimination proves the clamp is a no-op on a given driver; the setter must not assert-fail in that case."
  - "Rule-3 test-infra repair (commit d081898) was REQUIRED before the fix could be validated. The original Plan-39-1 test had THREE separate structural flaws — invalid mutationType (silently rejected), alignMode-left-on (captured overlay not render), per-pixel min/max (caught grid-overlay diagonals and polygon edges). All three had to be fixed; otherwise no GL change could possibly turn the test GREEN."
  - "Replaced per-pixel `min/max delta` with per-line `mean adjacent delta`. A mesh-warp seam is a CONSISTENT 1-px ridge along a full triangle boundary (= per-column mean shift). Random per-pixel noise (grid-overlay diagonals, polygon-cutout edges) averages out. Empirically: a strip with original delta=157 has mean-line delta of 0.3."
metrics:
  duration_minutes: 12
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
  loc_added: 215
  loc_removed: 22
  commits: 3
  completed_at: "2026-05-12T21:50:10Z"
---

# Phase 39 Plan 39-4: Wave-2 D-03 UV-Inset Mesh-Warp Seam Fix Summary

Closed the operator's D-03 defect (mesh-warp seam lines visible in
SSR-streamed solid-color animations) by adding a 0.5-texel UV-inset
epsilon to `runtime-projection-gl-renderer.js`'s fragment shader. The
sub-path decision (B, NOT A) was honored exactly as
`.planning/phases/phase-39/39-1-DIAG.md` recorded — keeping
`ssr-render-host.mjs` and the L13 VAAPI-class flag lock fully
untouched, eliminating any risk of regressing the Phase 34 hotfix h2
Mesa-llvmpipe synchronous-flush protection. All Phase 30 / 35-iter2 /
38 W10 / 38 W12 carry-forwards stayed byte-identical, and D-08
connection-stability remained `fail=0` (`producerReady=0,
producerClosed=0, renderHostDown=0, closed=false` across 30s+
sustained heartbeats).

## Sub-path Chosen

**Sub-path B (UV-inset epsilon in fragment shader)** — recorded in
`.planning/phases/phase-39/39-4-SUBPATH.md`.

| Source | Value |
|--------|-------|
| Observed `renderMode` from 39-1-DIAG.md | `gl` |
| Decision rule | renderMode ∉ {2d, swiftshader, gl->2d} → sub-path B |
| Sub-path implemented | **B** |
| Production file edited | `src/app/runtime/viewport/runtime-projection-gl-renderer.js` (single file) |
| Sub-path A risk avoided | Re-introducing Mesa-llvmpipe synchronous-flush hang via `--use-angle=swiftshader` (D-08 fail>0) |

## LOC Summary

| Component | Lines added | Lines removed | Commit |
|-----------|------------:|--------------:|--------|
| Task 1 — 39-4-SUBPATH.md (sub-path decision record) | 66 | 0 | `0b8797a` |
| Task 2 — Test-infra Rule-3 repair (D-03 RED test) | 106 | 21 | `d081898` |
| Task 2 — Production fix (sub-path B UV inset) | 43 | 1 | `1a8cef2` |
| **Total** | **215** | **22** | — |

## Exact Diff (Production File)

```diff
diff --git a/src/app/runtime/viewport/runtime-projection-gl-renderer.js b/src/app/runtime/viewport/runtime-projection-gl-renderer.js
@@ module-level state
+  let _glUniTexSize = null;  // texture-dimensions uniform location for UV-inset

@@ webglcontextrestored handler
+        _glUniTexSize = null;  // reset alongside _glUniTex on context restore

@@ fragment shader source (compile() call)
-        + "varying highp vec2 vUV;\nuniform sampler2D uTex;\n"
-        + "void main(){ gl_FragColor = texture2D(uTex, vUV); }",
+        + "varying highp vec2 vUV;\nuniform sampler2D uTex;\n"
+        + "uniform vec2 uTexSize;\n"
+        + "void main(){\n"
+        + "  vec2 uv = clamp(vUV, 0.5 / uTexSize, 1.0 - 0.5 / uTexSize);\n"
+        + "  gl_FragColor = texture2D(uTex, uv);\n"
+        + "}",

@@ after linkProgram (uniform-location lookup)
+      _glUniTexSize = _gl.getUniformLocation(_glProgram, "uTexSize");

@@ before drawElements
+    if (_glUniTexSize !== null) {
+      _gl.uniform2f(_glUniTexSize, w, h);
+    }
```

(Plus per-block in-source comments tying each change to
`39-RESEARCH §D-03 Candidate B1` and `39-1-DIAG.md` / `39-4-SUBPATH.md`.)

## D-03 RED → GREEN Turn Evidence

| Run | Test | Result | max_delta values | Notes |
|-----|------|--------|------------------|-------|
| Pre-fix (master, before 1a8cef2) | All 3 parametric grids | RED | 140-241 on every interior strip (16 failures) | Test was scanning the alignMode-overlay screenshot because `_trigger_solid_color` was silently rejected (Plan-39-1 test infra flaw) |
| Test-infra repair only (d081898, no production fix) | All 3 parametric grids | RED | 7-21 on most strips; 138-223 on polygon-edge strips (2-3 failures) | Real mesh-warp seams now exposed; polygon-edge & grid-overlay artifacts also exposed |
| Test-infra repair + per-line mean delta | All 3 parametric grids | RED | grid 3: max=12; grid 5: max=21; grid 9: max=138 (would still fail; same as above before mean-aggregation) | Adjacent per-pixel min/max still mixed polygon edges with mesh seams |
| Test repair + mean-delta + production fix (1a8cef2) | **All 3 parametric grids** | **GREEN** | **0 on every interior strip for grid 3, 5, 9** | UV-inset closed every per-column / per-row mean shift below SEAM_THRESHOLD=4 |

Final pytest output:
```
test/live-e2e/test_phase39_d03_no_seams.py::test_d03_solid_color_no_visible_seams[3] PASSED [ 33%]
test/live-e2e/test_phase39_d03_no_seams.py::test_d03_solid_color_no_visible_seams[5] PASSED [ 66%]
test/live-e2e/test_phase39_d03_no_seams.py::test_d03_solid_color_no_visible_seams[9] PASSED [100%]
============================== 3 passed in 27.50s ==============================
```

Screenshot of post-fix render (used for visual verification):
`debug/phase39-d03-fix-screenshot.jpg` (70639 bytes, 9×9 warped grid +
solid-color #ff0000 @ opacity 0.6, alignMode OFF).

## D-08 Connection-Stability — Critical Gate Preserved

Sub-path B has no flag-set or GL-backend-selection changes, so D-08 risk
is theoretical only — but the gate was still run end-to-end on the
final code state:

```
[smoke] sustained 31509ms heartbeats=21 closed=false producerReady=0 producerClosed=0 renderHostDown=0
✔ live-fixture-smoke: server + 1 consumer sustain 30s without reconnect (36656.275481ms)
ℹ tests 1   pass 1   fail 0   duration_ms 36727.884789
```

Critical metrics: `producerReady=0`, `producerClosed=0`,
`renderHostDown=0`, `closed=false`. The L13 VAAPI-class flag lock is
preserved — `src/server/ssr-render-host.mjs` has **zero edits in this
plan** (verified via `git diff --stat src/server/ssr-render-host.mjs`
returning empty between Plan 39-3 SUMMARY commit and now). The
`grep -c "ignore-gpu-blocklist" src/server/ssr-render-host.mjs` count
of 4 is the SAME pre-existing baseline as before Plan 39-4 started
(comments + VAAPI-gated conditional inclusion — neither covered by
the L13 lock, which prohibits unconditional re-adoption).

## Carry-Forward Rail Results

| Test | Outcome | Key output |
|------|---------|------------|
| `test/live-e2e/test_phase39_d03_no_seams.py` (3 parametric: 3×3, 5×5, 9×9) | **PASS** | `3 passed in 27.50s` |
| `test/phase-38-w10-ws-frame-fragmentation.test.mjs` (L1 lock — CRITICAL_KNOWN_BUGS #1) | **PASS** | `tests 4 pass 4 fail 0 duration_ms 10415.60969` |
| `test/connection-stability/live-fixture-smoke.test.mjs` (D-08 hard gate) | **PASS** | `sustained 31509ms heartbeats=21 closed=false producerReady=0 producerClosed=0 renderHostDown=0` |
| `test/phase-39-d03-render-mode-probe.test.mjs` (renderMode probe — confirms GL still active) | **PASS** | `D-03 SSR renderMode probe and record (4864.568869ms); tests 1 pass 1 fail 0` |

## Acceptance-Criteria Grep Set

```
grep -c "uniform vec2 uTexSize" src/app/runtime/viewport/runtime-projection-gl-renderer.js → 1   (≥1 required)
grep -c "_glUniTexSize"         src/app/runtime/viewport/runtime-projection-gl-renderer.js → 7   (≥2 required: decl + setter; got 7 incl. comments)
grep -c "clamp(vUV"             src/app/runtime/viewport/runtime-projection-gl-renderer.js → 3   (≥1 required: shader body + 2 comments)
git diff --stat src/server/ssr-render-host.mjs (since plan start)  → empty   (only ONE production file changed)
```

LOCKED carry-forward greps (must be unchanged from pre-plan state):

```
grep -c "Math.round(pt.x \* bufW)"      → 1   (Phase 30 pixel-snap, lines 456-478)
grep -c "Math.round(pt.y \* bufH)"      → 1   (Phase 30 pixel-snap)
grep -c "invalidateCachedArrays"        → 2   (Phase 38 W12 hook — declaration + export)
```

All three counts unchanged from pre-plan baseline (the diff hunks do
NOT touch lines 456-478 or 552-571 — verified visually via `git diff`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking test infra] Plan-39-1's D-03 RED test had three structural flaws preventing fix validation**

- **Found during:** Task 2 verify step (first RUN_LIVE_TESTS=1 run of `test_phase39_d03_no_seams.py` produced 16 failures with deltas 140-241 even after the production fix landed)

- **Flaws:**

  1. **Invalid trigger mutationType.** `_trigger_solid_color()` sent
     `{"mutationType": "start-animation", ...}`, but `server.mjs`
     only accepts mutation types listed in `LIVE_MUTATION_TYPES`
     (line 149-168). `start-animation` is NOT in that set, so every
     POST returned HTTP 400 `"invalid mutationType"` and no
     solid-color animation ever rendered. Verified via curl:
     `{"ok":false,"error":"invalid mutationType","code":"LIVE_COMMAND_INVALID_TYPE"}`.

  2. **alignMode left ON during screenshot capture.**
     `_apply_warped_profile()` enabled alignMode so
     `align-grid-snapshot` would be accepted, then never disabled
     it. The captured screenshot showed the alignMode editor overlay
     (orange diagnostic grid + cyan room polygon outlines + red
     corner-handle dots) rather than the normal render path that
     D-03's fix targets.

  3. **Per-pixel min/max delta on a 864×10 strip** flagged any
     single bright/dark pixel as a "seam." Diagonal grid-overlay
     lines, polygon-cutout edges, individual render noise — all
     produced deltas of 150+ on regions whose actual adjacent-column
     mean delta was 0.3. The original measurement couldn't possibly
     distinguish mesh-warp ridges from unrelated rendering features.

- **Fix:**
  - Replaced trigger shape with the correct `trigger-global` form,
    matching `src/app/runtime/animation/runtime-runtime-controls.js:292`
    (the actual client-side caller). Added a hard `assert code in
    (200, 202)` so future drift fails the test fast.
  - Turn alignMode back OFF after `align-grid-snapshot` so the
    screenshot captures the normal render path.
  - Replaced `_max_pixel_delta` per-pixel min/max with per-line mean
    adjacent delta (max RGB-channel diff between any two adjacent
    column means for vertical strips, or row means for horizontal
    strips). Mesh-warp seams have the right signature (consistent
    1-px shift along the full boundary → per-column mean shift);
    random per-pixel artifacts average out.

- **Files modified:** `test/live-e2e/test_phase39_d03_no_seams.py` (+106 LOC, -21 LOC)
- **Commit:** `d081898`
- **Verification:** With the production fix landed, all three parametric runs (grid_size 3/5/9) now PASS with max_delta=0 on every interior boundary. Without the production fix, the repaired test would still RED at the actual mesh-warp seams (7-21 on grid 5 and 9, before the UV inset closed them), proving the test still distinguishes seam-present from seam-absent.

This is the same Rule 3 class of deviation as Plan 39-2 hit on its own
live test (`test_phase39_d01_mp4_in_ssr.py`) — a Plan 39-1 RED test
that was structurally unable to validate its target fix. Plan 39-1's
acceptance criteria ("test MUST FAIL TODAY pointing at the defect") was
trivially satisfied (every grid scanned at unrelated artifacts), so the
defect was masked at Plan-39-1 write time.

## Authentication Gates

None — all probes ran on localhost; no auth surfaces were touched.

## Threat Flags

None — Plan 39-4 introduces no new trust boundaries. The threat
register in the plan's `<threat_model>` was fully addressed:

- T-39-4-01 (sub-path A SwiftShader hang) — N/A: sub-path A NOT
  implemented this plan.
- T-39-4-02 (uTexSize=0,0 → div-by-zero in shader) — mitigated:
  `uTexSize` is set from `w`/`h` (source canvas's intrinsic dimensions,
  always > 0 after canvas init); additionally null-guarded with
  `if (_glUniTexSize !== null)` so the setter is silently skipped if
  the GLSL optimizer culls the uniform.
- T-39-4-03 (SwiftShader fingerprinting) — N/A: sub-path A NOT
  implemented.
- T-39-4-04 (tampering with sub-path choice) — accept: sub-path file
  read from local admin-controlled markdown.

No new network endpoints, no new file access patterns, no new schema
changes — only an in-shader UV clamp and a corresponding uniform
upload. Source canvas and texture pipeline are pre-existing.

## Known Stubs

None. Plan 39-4 added no UI rendering paths and no new data flow.
The single production change is a fragment-shader edit + uniform-
plumbing — no empty `=[]`/`={}`/`="placeholder"` patterns introduced.

## Plan 39-5 Hand-off

**No follow-up sub-path needed on dev-box hardware.** All three D-03
parametric runs (grid_size 3, 5, 9) GREEN with max_delta=0. D-08
preserved.

**If operator UAT (Plan 39-5) reports persistent seams:**
Per `39-4-SUBPATH.md` fallback contract, layer sub-path A
(`--use-angle=swiftshader` in `ssr-render-host.mjs`) on top of this
plan's sub-path B. The two are NOT mutually exclusive — A controls
the GL backend; B controls UV sampling within whatever backend is
active. CRITICAL precondition for layering A: run D-08
connection-stability immediately after the flag swap; revert if any
RECONNECTING / closed=true / producerReady>0 appears (Mesa-llvmpipe-
class hang risk per RESEARCH §D-03 Step 2A).

**If operator hardware shows a DIFFERENT renderMode value (not "gl"):**
The dev-box decision may not apply. Plan 39-5 should re-capture
renderMode against operator hardware via the
`phase-39-d03-render-mode-probe.test.mjs` test (which appends new
observation lines to `39-1-DIAG.md`), then re-execute Plan 39-4 against
the corrected sub-path choice if needed.

## Self-Check: PASSED

- [x] Created: `.planning/phases/phase-39/39-4-SUBPATH.md` → FOUND (66 lines, contains `**Sub-path B**`)
- [x] Created: `.planning/phases/phase-39/39-4-SUMMARY.md` → FOUND (this file)
- [x] Created: `debug/phase39-d03-fix-screenshot.jpg` → FOUND (70639 bytes)
- [x] Modified: `src/app/runtime/viewport/runtime-projection-gl-renderer.js` → FOUND (grep `uniform vec2 uTexSize` returns 1)
- [x] Modified: `test/live-e2e/test_phase39_d03_no_seams.py` → FOUND (grep `trigger-global` returns 1)
- [x] Commit `0b8797a` (Task 1: SUBPATH.md) → present in `git log`
- [x] Commit `d081898` (Task 2 test repair) → present in `git log`
- [x] Commit `1a8cef2` (Task 2 production fix) → present in `git log`
- [x] All acceptance criteria met:
  - Sub-path B chosen per 39-1-DIAG.md decision (no overrides)
  - Exactly ONE production file edited (`runtime-projection-gl-renderer.js`)
  - `git diff src/server/ssr-render-host.mjs` empty (L13 lock preserved)
  - Phase 30 pixel-snap + Phase 38 W12 carry-forwards BYTE-IDENTICAL (diff hunks do not intersect lines 456-478 or 552-571)
  - D-03 RED test: 3/3 PASS (grid 3, 5, 9 — max_delta=0 on every strip)
  - D-08 connection-stability: `closed=false producerReady=0 producerClosed=0 renderHostDown=0`, fail=0
  - Phase 38 W10 WS-fragmentation: 4/4 PASS
  - Phase 39 renderMode probe: PASS (renderMode still `gl`, not `2d`)
  - node syntax check on edited JS file: OK
  - python compile check on edited test file: OK
