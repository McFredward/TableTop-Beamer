---
phase: 39
plan: 4
type: execute
wave: 2
depends_on: [39-1]
files_modified:
  - src/server/ssr-render-host.mjs
  - src/app/runtime/viewport/runtime-projection-gl-renderer.js
autonomous: true
requirements:
  - D-03-NO-SEAMS
must_haves:
  truths:
    - "Plan 39-1's 39-1-DIAG.md is READ FIRST and its sub-path decision (A or B) is honored exactly"
    - "If sub-path A: ssr-render-host.mjs Chrome flag set is swapped from --use-angle=default to --use-angle=swiftshader"
    - "If sub-path B: runtime-projection-gl-renderer.js fragment shader applies a 0.5-texel UV inset; texture-size uniform is wired"
    - "After the fix: solid-color animation rendered over 3×3, 5×5, 9×9 grids shows max boundary pixel RGB delta < 4 (SEAM_THRESHOLD) — Plan 39-1's D-03 RED test turns GREEN"
    - "Phase 30 pixel-snap, Phase 35-iter2 h3 Bayer dither, Phase 38 W12 GL cache invalidation, and the L13 VAAPI hard-lock are all preserved unchanged"
    - "D-08 connection-stability remains fail=0 (CRITICAL — D-03 sub-path A risks a Mesa-llvmpipe-class hang per research §A1)"
  artifacts:
    - path: ".planning/phases/phase-39/39-1-DIAG.md"
      provides: "renderMode telemetry + sub-path decision (READ ONLY)"
      contains: "Decision for Plan 39-4:"
    - path: "src/server/ssr-render-host.mjs"
      provides: "Updated Chrome flag set IF sub-path A (otherwise unchanged)"
    - path: "src/app/runtime/viewport/runtime-projection-gl-renderer.js"
      provides: "UV-inset epsilon in fragment shader + texture-size uniform IF sub-path B (otherwise unchanged)"
  key_links:
    - from: "Plan 39-1 39-1-DIAG.md sub-path decision"
      to: "Task 1 of this plan"
      via: "file read"
      pattern: "Decision for Plan 39-4:"
    - from: "Plan 39-1 RED test test/live-e2e/test_phase39_d03_no_seams.py"
      to: "this plan's fix"
      via: "RED → GREEN turn"
      pattern: "max_delta"
---

<objective>
Fix D-03: mesh-warp seam lines visible in SSR-streamed solid-color animations.

This plan has TWO sub-paths, gated on the operator renderMode telemetry captured in Plan 39-1's 39-1-DIAG.md:

- **Sub-path A** (renderMode contains "2d" / "swiftshader" / "gl->2d"): the GL path is being bypassed and the 2D fallback's per-triangle clip+drawImage inherently produces seams. Fix: swap Chrome flag `--use-angle=default` → `--use-angle=swiftshader` in ssr-render-host.mjs (Phase 37 deferred path).
- **Sub-path B** (renderMode is "webgl" / "webgl2"): GL is active but the rasterizer/sampling still produces 1-pixel ridges at triangle boundaries on this Chromium GL implementation. Fix: add a 0.5-texel UV inset epsilon in runtime-projection-gl-renderer.js's fragment shader + pass texture dimensions as a uniform.

Task 1 is BLOCKING: it reads 39-1-DIAG.md and writes the sub-path choice to a deterministic local file. Task 2 implements that one sub-path. The other sub-path is NOT implemented in this plan — if Task 2's fix proves insufficient, Plan 39-5 (verification) will trigger a follow-up to layer the other sub-path on top, or the orchestrator will re-execute this plan against a different DIAG decision.

Output:
- One small edit to either ssr-render-host.mjs OR runtime-projection-gl-renderer.js (not both, on first pass)
- Plan 39-1's D-03 RED tests turn GREEN
- All Phase 30 / 35-iter2 / 38 W12 / VAAPI-lock carry-forwards remain intact
- D-08 connection-stability fail=0 preserved (critical for sub-path A)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/CRITICAL_KNOWN_BUGS.md
@.planning/phases/phase-39/39-RESEARCH.md
@.planning/phases/phase-39/39-1-PLAN.md
@.planning/phases/phase-39/39-1-DIAG.md
@.planning/phases/phase-30/30-02-GL-ESCALATION.md
@.planning/phases/phase-34/34-CLOSURE-ADDENDUM.md

<interfaces>
<!-- The exact code locations and current state, with sub-path-specific verbatim snippets. -->

From src/server/ssr-render-host.mjs:558-570 (current Chrome flag block — sub-path A swaps ONE flag value):
```javascript
// Current flags (verified in code 2026-05-12):
"--use-gl=angle",
"--use-angle=default",          // ← sub-path A changes this line to "--use-angle=swiftshader"
"--enable-unsafe-swiftshader",
// ... other flags ...
```

From src/app/runtime/viewport/runtime-projection-gl-renderer.js:264-275 (current fragment shader — sub-path B edits this):
```glsl
// Current fragment shader (approximate — read file for exact text):
precision highp float;
varying highp vec2 vUV;
uniform sampler2D uTex;
void main() {
  gl_FragColor = texture2D(uTex, vUV);
}
```

Sub-path B target state (verbatim from 39-RESEARCH.md §"D-03 Candidate B1: UV inset"):
```glsl
precision highp float;
varying highp vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uTexSize;
void main() {
  // Phase 39 Plan 39-4 D-03 sub-path B: shrink UV by half a texel on each
  // side so cells sampling at a shared boundary land on the SAME interior
  // texel from both sides. Prevents 1-px ridges from rasterizer-coverage
  // disagreement at triangle edges. 39-RESEARCH §D-03 Candidate B1.
  vec2 uv = clamp(vUV, 0.5 / uTexSize, 1.0 - 0.5 / uTexSize);
  gl_FragColor = texture2D(uTex, uv);
}
```

Plus the JS-side uniform plumbing (also in runtime-projection-gl-renderer.js — search for `getUniformLocation` and `uniform1i`/`uniform2f` calls to find the existing pattern):
```javascript
// After compiling the shader program:
const uTexSizeLoc = gl.getUniformLocation(program, "uTexSize");

// Before each draw call:
gl.uniform2f(uTexSizeLoc, fxCanvas.width, fxCanvas.height);  // dimensions of the texture being sampled
```

From src/app/runtime/viewport/runtime-projection-gl-renderer.js lines that MUST NOT be changed:
- Line 116-122: glOpts (Phase 30 h7) — keep `premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: false, powerPreference: "low-power", desynchronized: false`
- Line 264 (precision highp float — keep)
- Line 307-310: LINEAR + CLAMP_TO_EDGE (Phase 30 h4 — keep)
- Line 361-372: backing-store sizing (Phase 30 h12 — keep)
- Line 456-478: pixel-snap destination vertices (Phase 30 anti-seam invariant — KEEP)
- Line 552-571: invalidateCachedArrays hook (Phase 38 W12 — keep)

From .planning/phases/phase-39/39-RESEARCH.md §"D-03 Implementation Step 2A":
```
Sub-path A SwiftShader risks:
- A1: --use-angle=swiftshader may cause synchronous-flush issue similar to Mesa-llvmpipe
  → if D-08 connection-stability fails after the flag swap, REVERT immediately and fall back to sub-path B
- Phase 35 RESEARCH §A3 says SwiftShader does NOT have Mesa's sync-flush issue (UNVERIFIED, marked TERTIARY confidence in research)
```

From .planning/CRITICAL_KNOWN_BUGS.md (LOCKED carry-forwards that this plan must NOT break):
- Phase 38 W10 WS-fragmentation reassembly in server.mjs (untouched by this plan — no risk)
- Phase 38 W11 align-off teardown ordering (untouched — no risk)
- Phase 38 W12 GL cache invalidation on grid replace (LIVES IN THIS FILE for sub-path B — DO NOT remove `invalidateCachedArrays` hook at lines 552-571)
- Phase 33 VAAPI-default-disabled (untouched — no risk)

From .planning/phases/phase-34/34-CLOSURE-ADDENDUM.md (h2):
```
Phase 34 h2 EXPLICITLY REVERTED --ignore-gpu-blocklist + --enable-gpu-rasterization
because Mesa-llvmpipe's synchronous flush blocked the SSR-tab JS main thread →
D-08 connection-stability fail>0. L13 LOCK prohibits re-adding these flags.
```
=> Sub-path A swaps `--use-angle=default` to `--use-angle=swiftshader` ONLY. Does NOT re-add the L13-locked flags. Does NOT touch `--enable-unsafe-swiftshader` (already present).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1 (BLOCKING DIAGNOSTIC GATE): Read 39-1-DIAG.md, select sub-path, write 39-4-SUBPATH.md</name>
  <read_first>
    - .planning/phases/phase-39/39-1-DIAG.md (Plan 39-1 Task 3 produced this file) — REQUIRED INPUT. If this file is missing, this plan CANNOT proceed.
    - .planning/phases/phase-39/39-RESEARCH.md §"D-03 Implementation Step 1 (mandatory)" — the gate rule for sub-path A vs B
    - src/server/ssr-webrtc-signaling.mjs lines 480-495 — to verify the renderMode log format if the executor needs to re-capture telemetry
  </read_first>
  <files>.planning/phases/phase-39/39-4-SUBPATH.md</files>
  <behavior>
    - If 39-1-DIAG.md exists AND contains a `Decision for Plan 39-4:` line with value "sub-path A" or "sub-path B": copy that decision into 39-4-SUBPATH.md verbatim along with the observed renderMode value
    - If 39-1-DIAG.md contains "UNKNOWN" (Plan 39-1 Task 3 failed to capture renderMode): re-capture by booting the server fresh and probing /api/diag/ssr-eval-in-tab. If the re-capture also fails, default to sub-path B (UV-inset shader edit is the SAFER default — it has no D-08 connection-stability risk and is reversible)
    - If 39-1-DIAG.md is missing entirely: STOP — flag a workflow violation and report to the orchestrator (Plan 39-1 was supposed to produce it as a Wave-0 deliverable)
    - The output file 39-4-SUBPATH.md must record: (a) the observed renderMode value (verbatim string), (b) the chosen sub-path (A or B), (c) a one-sentence justification, (d) a fallback note: "if Task 2's fix proves insufficient, Plan 39-5 verification will trigger the OTHER sub-path layered on top"
  </behavior>
  <action>
1. Read .planning/phases/phase-39/39-1-DIAG.md.

2. Grep for the decision line:
   ```bash
   grep -E "Decision for Plan 39-4:.*sub-path [AB]" .planning/phases/phase-39/39-1-DIAG.md
   ```
   AND
   ```bash
   grep -E "Observed value:" .planning/phases/phase-39/39-1-DIAG.md
   ```

3. If both grep commands return a match:
   - Extract the sub-path letter (A or B)
   - Extract the renderMode value
   - Proceed to step 5

4. If 39-1-DIAG.md exists but lacks a decision OR observed renderMode is "UNKNOWN":
   - Boot the server with SSR enabled and re-probe:
     ```bash
     SSR_RENDER_HOST=1 SSR_PUBLISH=1 SSR_DIAG_ENABLE=1 node server.mjs 2>&1 | tee /tmp/p39-4-stdout.log &
     SERVER_PID=$!
     sleep 30
     RENDERMODE=$(grep "\[ssr-stats\] renderMode=" /tmp/p39-4-stdout.log | tail -1 | grep -oE 'renderMode=[^ ]+' | cut -d= -f2)
     echo "Captured renderMode=$RENDERMODE"
     kill $SERVER_PID
     wait $SERVER_PID 2>/dev/null
     ```
   - If RENDERMODE is empty, default to sub-path B (safest reversible option per research).
   - If RENDERMODE matches `^webgl|^webgl2|^gl$` → sub-path B.
   - If RENDERMODE matches `2d|swiftshader|gl->2d` → sub-path A.

5. If 39-1-DIAG.md is missing entirely: STOP. Print:
   ```
   ERROR: 39-1-DIAG.md missing — Plan 39-1 Task 3 must have produced it.
   This plan cannot proceed. Please re-execute Plan 39-1 Task 3.
   ```
   Exit with non-zero.

6. Write `.planning/phases/phase-39/39-4-SUBPATH.md` with this exact structure:

```markdown
# Phase 39 Plan 39-4 — Sub-path Selection

**Selected by:** Plan 39-4 Task 1
**Date:** <ISO timestamp>
**Source:** .planning/phases/phase-39/39-1-DIAG.md (and live re-capture if applicable)

## Observed renderMode

`<exact string from DIAG.md or live re-capture, e.g. "webgl2" or "gl->2d (gl-disabled)" or "UNKNOWN — re-capture failed">`

## Chosen sub-path

**Sub-path <A | B>**

## Justification

<one-sentence rationale, e.g. "renderMode value 'webgl2' indicates GL is active; seams must originate from rasterizer/sampling at triangle boundaries — sub-path B (UV inset) addresses this">

## Fallback contract

If Task 2's implementation lands but Plan 39-5 verification reveals the seams persist:
1. Plan 39-5 will explicitly trigger a follow-up wave to LAYER the OTHER sub-path on top of this one.
2. Sub-path A and sub-path B are NOT mutually exclusive — they can coexist; A controls the GL backend, B controls UV sampling within that backend.
3. If Plan 39-5 D-08 connection-stability fail>0 after sub-path A is applied: REVERT the Chrome-flag change immediately and re-execute this plan against sub-path B.

## Implementation target for Task 2

- Sub-path A: `src/server/ssr-render-host.mjs` — change line `"--use-angle=default"` to `"--use-angle=swiftshader"`
- Sub-path B: `src/app/runtime/viewport/runtime-projection-gl-renderer.js` — add `uTexSize` uniform + UV clamp in fragment shader
```

7. Verify the file was written:
```bash
cat .planning/phases/phase-39/39-4-SUBPATH.md | grep -E "Sub-path [AB]"
```

DO NOT modify any production code in this task. DO NOT modify any tests.
  </action>
  <verify>
    <automated>test -f .planning/phases/phase-39/39-4-SUBPATH.md && grep -qE "^\*\*Sub-path [AB]\*\*" .planning/phases/phase-39/39-4-SUBPATH.md && echo "ok"</automated>
  </verify>
  <acceptance_criteria>
    - File exists: .planning/phases/phase-39/39-4-SUBPATH.md
    - grep -qE "^\*\*Sub-path [AB]\*\*" 39-4-SUBPATH.md (exactly one sub-path chosen)
    - grep -q "Observed renderMode" 39-4-SUBPATH.md
    - grep -q "Implementation target for Task 2" 39-4-SUBPATH.md
    - File length wc -l > 20
    - No production code modified: `git status --porcelain src/ server.mjs test/` returns empty (only .planning/phases/phase-39/ files changed)
  </acceptance_criteria>
  <done>39-4-SUBPATH.md exists with a deterministic sub-path A or B decision recorded, ready for Task 2 to consume.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement the chosen sub-path (A OR B — not both)</name>
  <read_first>
    - .planning/phases/phase-39/39-4-SUBPATH.md (Task 1 output — DETERMINES which sub-path to implement)
    - If sub-path A:
        - src/server/ssr-render-host.mjs lines 540-580 (Chrome flag construction) — see exact form of `--use-angle=default`
        - test/connection-stability/live-fixture-smoke.test.mjs — the D-08 hard gate the flag swap risks breaking
        - .planning/phases/phase-34/34-CLOSURE-ADDENDUM.md — the L13 lock context (DO NOT re-add `--ignore-gpu-blocklist` or `--enable-gpu-rasterization`)
    - If sub-path B:
        - src/app/runtime/viewport/runtime-projection-gl-renderer.js lines 250-310 (shader source + uniform setup) — see exact uniform declaration pattern used by existing uniforms
        - src/app/runtime/viewport/runtime-projection-gl-renderer.js lines 380-410 (texImage2D call site) — to know the canvas/texture-size that the new uTexSize uniform must reflect
        - src/app/runtime/viewport/runtime-projection-gl-renderer.js lines 552-571 — Phase 38 W12 invalidateCachedArrays hook (MUST NOT BE TOUCHED)
        - .planning/phases/phase-30/30-02-GL-ESCALATION.md — the pixel-snap context (DO NOT break the Phase 30 pixel-snap destination-vertex code at lines 456-478)
  </read_first>
  <files>src/server/ssr-render-host.mjs OR src/app/runtime/viewport/runtime-projection-gl-renderer.js (exactly ONE of these — determined by Task 1's sub-path choice)</files>
  <behavior>
    SUB-PATH A behavior:
      - ssr-render-host.mjs Chrome flag set transitions from `"--use-angle=default"` to `"--use-angle=swiftshader"`
      - All other flags unchanged (--use-gl=angle stays; --enable-unsafe-swiftshader stays; NO --ignore-gpu-blocklist; NO --enable-gpu-rasterization)
      - SSR Chromium boots successfully under the new flag set; ssr-stats renderMode after boot is "webgl"/"webgl2" (the swap moves the SSR tab from 2D fallback to SwiftShader GL — the seam fix follows because Phase 30 pixel-snap now applies)
      - D-08 connection-stability live-fixture-smoke.test.mjs PASSES (no synchronous-flush hang per research §A1 — if it FAILS, immediately revert the flag and report)

    SUB-PATH B behavior:
      - Fragment shader has a new `uniform vec2 uTexSize;` declaration
      - Fragment shader gl_FragColor reads `texture2D(uTex, clamp(vUV, 0.5/uTexSize, 1.0 - 0.5/uTexSize))` instead of `texture2D(uTex, vUV)`
      - JS-side: a uTexSize uniform location is fetched after program link and set with `gl.uniform2f(uTexSizeLoc, textureWidth, textureHeight)` before each draw call
      - The texture dimensions passed to uTexSize must match the dimensions of the canvas/texture that texImage2D uploaded (search the file for `texImage2D(` and use the same source's width/height)
      - All other shader logic unchanged (precision highp; LINEAR sampling; pixel-snap dest vertices; W12 cache invalidation)
      - WebGL context still initializes without errors; getShaderInfoLog returns empty after recompile

    BOTH sub-paths:
      - Plan 39-1's RED test test/live-e2e/test_phase39_d03_no_seams.py turns GREEN for grid_size=3, 5, 9 (max boundary pixel RGB delta < 4)
      - Phase 30 pixel-snap (lines 456-478) UNCHANGED
      - Phase 35-iter2 h3 Bayer dither in runtime-effect-visuals.js UNCHANGED
      - Phase 38 W12 invalidateCachedArrays hook UNCHANGED
      - Phase 33 VAAPI-default-disabled UNCHANGED
      - D-08 connection-stability fail=0 PRESERVED
      - test/phase-38-w10-ws-frame-fragmentation.test.mjs PASSES
  </behavior>
  <action>
1. Read .planning/phases/phase-39/39-4-SUBPATH.md. Determine if sub-path is A or B.

2. **If sub-path A:**

   a. Edit src/server/ssr-render-host.mjs. Find the line:
   ```javascript
   "--use-angle=default",
   ```
   (around line 564). Replace it with:
   ```javascript
   "--use-angle=swiftshader",  // Phase 39 Plan 39-4 D-03 sub-path A: was "default" — swap to SwiftShader to keep GL active and let Phase 30 pixel-snap eliminate mesh-warp seams. See 39-1-DIAG.md (renderMode contained "2d") and 39-RESEARCH.md §D-03 Step 2A.
   ```

   b. DO NOT touch any other flags. DO NOT add `--ignore-gpu-blocklist` or `--enable-gpu-rasterization` (L13 lock, would re-introduce Mesa-llvmpipe hang).

   c. Boot the SSR server and verify the flag is honored:
   ```bash
   SSR_RENDER_HOST=1 SSR_PUBLISH=1 SSR_DIAG_ENABLE=1 node server.mjs 2>&1 | tee /tmp/p39-4-A.log &
   sleep 30
   grep "\[ssr-stats\] renderMode=" /tmp/p39-4-A.log | tail -3
   # → must show renderMode=webgl or webgl2 (not "2d")
   kill %1
   ```

   d. Run the D-08 hard gate IMMEDIATELY (this is the kill-switch for sub-path A):
   ```bash
   RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs 2>&1 | tee /tmp/p39-4-A-d08.log
   ```
   If this FAILS (any RECONNECTING, any closed=true, any producerReady>0 in the smoke output): IMMEDIATELY revert the flag change with `git checkout -- src/server/ssr-render-host.mjs` and STOP. Report to orchestrator: "Sub-path A breaks D-08. Need to re-execute Plan 39-4 against sub-path B."

3. **If sub-path B:**

   a. Read src/app/runtime/viewport/runtime-projection-gl-renderer.js fully. Locate the fragment shader source (it's a string literal — search for `precision highp float` or `varying highp vec2 vUV` to find the shader source assignment).

   b. Edit the fragment shader source. Replace the body that reads `gl_FragColor = texture2D(uTex, vUV);` (or similar) with the snippet from <interfaces>:

   ```glsl
   precision highp float;
   varying highp vec2 vUV;
   uniform sampler2D uTex;
   uniform vec2 uTexSize;
   void main() {
     // Phase 39 Plan 39-4 D-03 sub-path B: shrink UV by half a texel on each
     // side so cells sampling at a shared boundary land on the SAME interior
     // texel from both sides. Prevents 1-px ridges from rasterizer-coverage
     // disagreement at triangle edges. 39-RESEARCH §D-03 Candidate B1.
     vec2 uv = clamp(vUV, 0.5 / uTexSize, 1.0 - 0.5 / uTexSize);
     gl_FragColor = texture2D(uTex, uv);
   }
   ```

   Preserve the existing `precision highp float` and `varying highp vec2 vUV` declarations (Phase 30 h9 lock).

   c. After the shader-program-link step (search for `gl.linkProgram(`), add the uniform-location lookup. Use the same pattern as the existing uniform lookups in the file (e.g. `uTexLoc = gl.getUniformLocation(program, "uTex")`):

   ```javascript
   const uTexSizeLoc = gl.getUniformLocation(program, "uTexSize");
   ```

   Store uTexSizeLoc in the same scope/object the other uniform locations live in (module-level variable, or a renderer-state object — read the existing pattern in the file).

   d. Before each draw call (find the `gl.drawElements` or `gl.drawArrays` call — usually near the texImage2D upload), add:

   ```javascript
   // Phase 39 Plan 39-4 D-03 sub-path B: pass texture dimensions for UV-inset epsilon.
   if (uTexSizeLoc) {
     gl.uniform2f(uTexSizeLoc, fxCanvas.width, fxCanvas.height);
   }
   ```

   Use the EXACT canvas/texture-source variable that the existing `gl.texImage2D(...)` call uses for its width/height. (Search the file for `texImage2D(` to confirm.) If the source is `fxCanvas`, use `fxCanvas.width` / `.height`. If it's a different variable (offscreen canvas, video element, etc.), match that source.

   e. DO NOT touch:
   - Lines 116-122 (glOpts — Phase 30 h7)
   - LINEAR/CLAMP_TO_EDGE sampler setup (Phase 30 h4)
   - Pixel-snap destination vertices at lines 456-478 (Phase 30 anti-seam invariant)
   - invalidateCachedArrays hook at lines 552-571 (Phase 38 W12)

   f. Run shader-compile smoke:
   ```bash
   # Boot the SSR server and observe the SSR tab's console (CDP-relayed to server stdout) for any "[gl-shader]" / "[gl-error]" lines:
   SSR_RENDER_HOST=1 SSR_PUBLISH=1 SSR_DIAG_ENABLE=1 node server.mjs 2>&1 | tee /tmp/p39-4-B.log &
   sleep 20
   grep -iE "gl-shader|gl-error|getShaderInfoLog|getProgramInfoLog" /tmp/p39-4-B.log
   # → should be empty or show only successful compile logs
   kill %1
   ```

4. **Common (both sub-paths):**

   Run the D-03 RED test from Plan 39-1:
   ```bash
   python3 -m pytest test/live-e2e/test_phase39_d03_no_seams.py -v 2>&1 | tee /tmp/p39-4-d03.log
   ```
   Expected: PASSES for all three grid_size values (3, 5, 9).

   Also run the renderMode probe test:
   ```bash
   RUN_LIVE_TESTS=1 node --test test/phase-39-d03-render-mode-probe.test.mjs 2>&1 | tee /tmp/p39-4-rm.log
   ```
   Expected: PASSES (renderMode does not contain "2d").
  </action>
  <verify>
    <automated>python3 -m pytest test/live-e2e/test_phase39_d03_no_seams.py -v && RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs</automated>
  </verify>
  <acceptance_criteria>
    - Exactly ONE of these is true:
        - (Sub-path A) `grep -c "use-angle=swiftshader" src/server/ssr-render-host.mjs` ≥ 1 AND `grep -c "use-angle=default" src/server/ssr-render-host.mjs` returns 0 (the default flag is removed)
        - (Sub-path B) `grep -c "uniform vec2 uTexSize" src/app/runtime/viewport/runtime-projection-gl-renderer.js` ≥ 1 AND `grep -c "uTexSizeLoc" src/app/runtime/viewport/runtime-projection-gl-renderer.js` ≥ 2 (declaration + setter call) AND `grep -c "clamp(vUV" src/app/runtime/viewport/runtime-projection-gl-renderer.js` ≥ 1
    - `python3 -m pytest test/live-e2e/test_phase39_d03_no_seams.py -v` exits 0 (PASS for grid_size=3, 5, 9)
    - `RUN_LIVE_TESTS=1 node --test test/phase-39-d03-render-mode-probe.test.mjs` exits 0 AND its DIAG.md update shows renderMode does NOT contain "2d"
    - `RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs` exits 0 AND shows `sustained >=30000ms heartbeats>=20 closed=false producerReady=0 producerClosed=0 renderHostDown=0` (D-08 hard gate preserved — CRITICAL for sub-path A)
    - `node --test test/phase-38-w10-ws-frame-fragmentation.test.mjs` exits 0
    - For sub-path A: grep -c "ignore-gpu-blocklist" src/server/ssr-render-host.mjs returns 0 (L13 lock — must NOT be re-added). grep -c "enable-gpu-rasterization" src/server/ssr-render-host.mjs returns 0 (L13 lock).
    - For sub-path B: Phase 30 pixel-snap destination-vertex code (search for `Math.round(pt.x * bufW)` or similar at lines ~456-478) is BYTE-IDENTICAL to before — `git diff src/app/runtime/viewport/runtime-projection-gl-renderer.js` shows ZERO changes in that block
    - For sub-path B: Phase 38 W12 invalidateCachedArrays code (lines ~552-571) is BYTE-IDENTICAL to before
    - Only ONE file modified by this plan (besides Plan 39-1's DIAG.md and this plan's SUBPATH.md): either ssr-render-host.mjs OR runtime-projection-gl-renderer.js, not both
  </acceptance_criteria>
  <done>The chosen sub-path is implemented in exactly one production file. D-03 seam test passes for all three grid sizes. D-08 connection-stability fail=0 preserved. Phase 30 / 35-iter2 / 38 W12 carry-forwards untouched. L13 VAAPI-class flag lock preserved.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Host process → SSR Chromium tab launch | Chrome command-line flags affect GL backend selection |
| SSR Chromium tab → fragment shader execution | Shader receives uniform values from JS; bad values can produce visual artifacts |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-39-4-01 | DoS | Sub-path A: `--use-angle=swiftshader` causes Mesa-llvmpipe-class synchronous-flush hang | mitigate | Run D-08 connection-stability immediately after the flag swap; revert if fail>0 (Task 2 step 2d) |
| T-39-4-02 | DoS | Sub-path B: uTexSize=0,0 causes division-by-zero in shader → undefined UV → render hang | mitigate | uTexSize is set from fxCanvas.width / .height which are always > 0 after canvas init; no runtime path produces 0×0 |
| T-39-4-03 | Information disclosure | A different Chrome backend (SwiftShader) might fingerprint differently if telemetry leaked | accept | tt-beamer is LAN-only single-user; no remote telemetry collection |
| T-39-4-04 | Tampering | An attacker influences the renderMode value to force sub-path A or B | accept | Sub-path choice is read from a local .md file produced by an admin-controlled workflow; no untrusted input crosses this boundary |
</threat_model>

<verification>
Plan 39-4 phase-level gate:

```bash
# D-03 fix verification
python3 -m pytest test/live-e2e/test_phase39_d03_no_seams.py -v
RUN_LIVE_TESTS=1 node --test test/phase-39-d03-render-mode-probe.test.mjs

# D-08 connection-stability (CRITICAL — sub-path A's kill switch)
RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs

# Phase 30 / 35 / 38 carry-forwards
node --test test/phase-38-w10-ws-frame-fragmentation.test.mjs
python3 -m pytest test/live-e2e/test_phase38_w12_invalidate_cache.py -v
node --test test/phase-35-bayer-dither.test.mjs

# Visual regression: solid-color over warped grid (manual screenshot capture for SUMMARY)
SSR_RENDER_HOST=1 SSR_PUBLISH=1 SSR_DIAG_ENABLE=1 node server.mjs &
sleep 30
curl -s http://127.0.0.1:4173/api/diag/ssr-screenshot | jq -r .base64 | base64 -d > debug/phase39-d03-fix-screenshot.jpg
kill %1
```

All exit codes 0; D-08 smoke output must show `producerReady=0 renderHostDown=0 closed=false`.
</verification>

<success_criteria>
- 39-4-SUBPATH.md exists with the deterministic A/B decision read from 39-1-DIAG.md
- Exactly ONE production file modified (ssr-render-host.mjs OR runtime-projection-gl-renderer.js)
- D-03 live seam test PASSES for grid_size 3, 5, 9
- renderMode probe confirms GL is active (no "2d" in value)
- D-08 connection-stability fail=0 preserved (critical for sub-path A)
- Phase 38 W10 WS-fragmentation test PASSES
- Phase 38 W12 cache-invalidate test PASSES
- Phase 30 pixel-snap, Phase 35-iter2 h3 Bayer dither, L13 VAAPI-class flag lock all preserved BYTE-IDENTICAL
</success_criteria>

<output>
After completion, create `.planning/phases/phase-39/39-4-SUMMARY.md` containing:
- Sub-path chosen (A or B) + the renderMode value that drove the choice
- Exact diff (`git diff <file>` snippet) of the one production file edited
- D-03 RED → GREEN turn evidence (pre-fix `max_delta=` value vs post-fix `max_delta=` for grid_size=3)
- D-08 smoke output post-fix
- A side-by-side comparison of pre-Phase-39 vs post-Phase-39 SSR screenshot (path to debug/phase39-d03-fix-screenshot.jpg)
- Plan 39-5 hand-off: state whether the OTHER sub-path needs to be layered (only if seams not fully closed)
</output>
