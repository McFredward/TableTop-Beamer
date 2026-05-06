---
phase: 30
plan: 04
type: execute
wave: 4
depends_on:
  - 30-01
  - 30-02
  - 30-03
files_modified:
  - src/app/runtime/render/runtime-draw-loop.js
  - src/app/runtime/render/runtime-outside-mp4.js
autonomous: false
requirements:
  - PI-PERF
user_setup: []
tags:
  - performance
  - pi-output
  - render-stability
  - outside-fx-mp4

must_haves:
  truths:
    - "On Pi /output/ kiosk Chromium with Test-Board Nemesis Lockdown Board A (3 room GIFs + sandstorm.mp4 outside-fx) the diagnostic chip reports stable 24-30 fps in BOTH renderMode='gl' AND renderMode='2d' (post-Step-2)."
    - "Step 1 diagnostic flags (?perf_skip_outside=1 / ?perf_skip_capture=1 / ?perf_skip_rooms=1 / ?perf_skip_warp=1) work on /output/ and produce per-flag fps deltas the user can read off the diagnostic chip."
    - "Mesh-warp with squish bars + mid-line drags + internal grid points is preserved (per RESEARCH § Hard constraints — no changes to runtime-projection-{gl-renderer,2d-fallback-renderer,mapping}.js)."
    - "Phase 30 hotfixes h2/h3/h6/h7/h8/h9/h10/h12 remain valid (no streifen reappear, boot context-loss does not return, GIFs still trigger reliably, outside-fx mirror still rebuilds on snapshot apply)."
    - "Diagnostic chip + __ttBeamerEffectiveRenderMode visibility unchanged."
    - "After the optimization ships (T2 and/or T3), the temporary URL feature flags from T1 are removed from production code (T5)."
    - "The 40-test non-regression baseline stays 40/40 green throughout the plan."
  artifacts:
    - path: "src/app/runtime/render/runtime-draw-loop.js"
      provides: "T1: 4 URL-flag short-circuits gating outside/rooms/warp/capture for Pi A/B (removed in T5). T2: gated capture invocation (every Nth frame OR final-output role short-circuit per Option A). T3: optional final-output force-draw branch (Option B, conditional on T1 results)."
    - path: "src/app/runtime/render/runtime-outside-mp4.js"
      provides: "T1: window.__PERF_SKIP_CAPTURE early return at top of captureOutsideMp4FallbackFrame (removed in T5). T3: optional new exported helper shouldSkipOutsideMp4FallbackOnFinalOutput() if Option B is taken."
  key_links:
    - from: "URL ?perf_skip_capture=1 on /output/"
      to: "captureOutsideMp4FallbackFrame() short-circuit (skip second 1920x1080 drawImage)"
      via: "module-local const _PERF parsed once + window.__PERF_SKIP_CAPTURE global checked at function head"
      pattern: "perf_skip_capture|__PERF_SKIP_CAPTURE"
    - from: "runtime-draw-loop.js draw() outside-fx branch (line ~482-489)"
      to: "Conditional captureOutsideMp4FallbackFrame call (Option A: every Nth frame; Option B: never on final-output)"
      via: "state.runtimePerf.frameIndex modulo OR ctx.getOutputRole() === ctx.OUTPUT_ROLE_FINAL guard"
      pattern: "captureOutsideMp4FallbackFrame|OUTSIDE_MP4_FALLBACK_FRAME_MAX_AGE_MS"
    - from: "Diagnostic chip rAF loop (index.html:929-939)"
      to: "Per-flag fps readout (the user reads the chip after each ?perf_skip_*=1 reload)"
      via: "Existing chip; no code change"
      pattern: "lastTick|outputStatusChip"
---

<objective>
Plan 30-04 (Pi /output/ FPS recovery): the Pi /output/ kiosk renders the
standard test scenario (3 GIFs + sandstorm.mp4 outside-fx) at a stable
24-30 fps in BOTH renderMode='gl' and renderMode='2d', without regressing
any Phase 30 hotfix h2/h3/h6/h7/h8/h9/h10/h12, and without touching the
mesh-warp pipeline.

Per RESEARCH (`30-RESEARCH-PI-PERF.md`) the dominant cost almost certainly
lives in the per-frame full-canvas video draw on fx-canvas — specifically
the redundant second `drawImage(video, 0, 0, 1920, 1080)` inside
`captureOutsideMp4FallbackFrame` at `runtime-outside-mp4.js:218-219`,
called unconditionally every frame from `runtime-draw-loop.js:483`. That
hypothesis has HIGH-MEDIUM confidence; absolute fps recovery is MEDIUM.
We therefore SHIP IN TWO STEPS:

  - **Step 1 (Diagnose)** — T1 lands four URL feature flags so the user
    can A/B which optimization actually moves fps on their Pi BEFORE we
    commit a code change. ~10 minutes of user effort, fully reversible.
  - **Step 2 (Ship)** — T2 lands Option A (gated capture), T3 conditionally
    lands Option B (drop fallback canvas on /output/ entirely), depending
    on what T1 reveals. T5 removes the diagnostic scaffold.

Options C (DOM `<video>` + dual-texture warp) and F (OffscreenCanvas +
worker) are explicitly OUT OF SCOPE — both violate the mesh-warp
preservation constraint or require full-architectural refactor (RESEARCH
§ Option C, § Option F). Options D (smaller drawImage destination via
play-area bbox) and E (lower-resolution mp4 asset) are MAYBE / future-phase
items if Step 2 doesn't reach 24-30 fps.

Purpose: close the Pi /output/ ~10 fps regression without touching the
Phase-30-stabilized mesh-warp / GL / 2D-fallback / GIF / live-sync paths.
Output: a measured, evidence-driven optimization shipped to /output/.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/phase-30/30-CONTEXT.md
@.planning/phases/phase-30/30-RESEARCH-PI-PERF.md
@.planning/phases/phase-30/30-VALIDATION.md

@src/app/runtime/render/runtime-draw-loop.js
@src/app/runtime/render/runtime-outside-mp4.js
@src/app/runtime/render/runtime-perf.js
@index.html

<interfaces>
<!-- Exact file:line anchors. Extracted from RESEARCH § Code-evidence per per-frame operation. Use these directly — no codebase exploration. -->

runtime-draw-loop.js draw(now) body, anchors:
  ~line 482-489 — outside-fx mp4 draw + redundant capture (Option A/B target)
  ~line 564     — top of draw(), site for the once-per-load _PERF flag parse (T1)
  ~line 594     — c.clearRect(0, 0, 1920, 1080)
  ~line 603     — drawOutsideFxLayer(now) call site (perf_skip_outside gate)
  ~line 623-635 — per-animation drawAnimationSafely loop (perf_skip_rooms gate)
  ~line 647     — postDrawMeshWarp dispatch (perf_skip_warp gate)
  ~line 666     — recordRuntimeFrameCost

runtime-outside-mp4.js, anchors:
  ~line 210-223 — captureOutsideMp4FallbackFrame body (perf_skip_capture gate at line 210)
  ~line 225-236 — drawOutsideMp4FallbackFrame body (consumer of captured frame)
  ~line 286-303 — shouldDrawOutsideMp4Now gate (16/22/33ms tier targeting)
  OUTSIDE_MP4_FALLBACK_FRAME_MAX_AGE_MS const — fallback freshness budget (350 ms)

Render-mode discriminator (do NOT touch in this plan):
  src/app/runtime/viewport/runtime-projection-mapping.js:267-274 — GL/2D fork
  src/app/runtime/viewport/runtime-projection-gl-renderer.js:355 — texImage2D(canvas)
  src/app/runtime/viewport/runtime-projection-2d-fallback-renderer.js:105-176 — 2D triangulated affine

Diagnostic chip readout (no code change in this plan):
  index.html:929-939 — independent rAF for fps sampling
  index.html:966-971 — chip text: canvas.width × canvas.height @ DPR + fps + mode

Output role helper:
  ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL — the gate for "are we on /output/?"
  (used elsewhere: e.g. 30-01 Plan B3 fix Case A)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1 (Step 1, Diagnose): Add 4 URL feature flags so the user can A/B which optimization moves fps on Pi</name>
  <files>
    src/app/runtime/render/runtime-draw-loop.js,
    src/app/runtime/render/runtime-outside-mp4.js
  </files>
  <read_first>
    src/app/runtime/render/runtime-draw-loop.js (lines 480-670 — the draw() body),
    src/app/runtime/render/runtime-outside-mp4.js (lines 200-240 — captureOutsideMp4FallbackFrame),
    .planning/phases/phase-30/30-RESEARCH-PI-PERF.md §"Diagnostic measurement plan A"
  </read_first>
  <action>
Add four URL query-string feature flags so the user can A/B per-bucket cost on
Pi /output/ without recompiling. Match RESEARCH § Diagnostic measurement plan A
verbatim. Flags are TEMPORARY — Task 5 removes them.

Edit 1 (runtime-draw-loop.js, near line 564 inside draw() module scope, BEFORE the draw function — module-local once-parsed const):

```js
// Phase 30 T-04 Step 1 (TEMPORARY — removed in Task 5).
// URL-flag A/B so the user can isolate the dominant per-frame cost on Pi.
const _PERF = (() => {
  try {
    const p = new URLSearchParams(window.location?.search || "");
    return {
      skipOutside: p.get("perf_skip_outside") === "1",
      skipRooms:   p.get("perf_skip_rooms")   === "1",
      skipWarp:    p.get("perf_skip_warp")    === "1",
      skipCapture: p.get("perf_skip_capture") === "1",
    };
  } catch (_) {
    return { skipOutside: false, skipRooms: false, skipWarp: false, skipCapture: false };
  }
})();
if (typeof window !== "undefined") {
  // Surface skipCapture as a global so runtime-outside-mp4.js can short-circuit
  // captureOutsideMp4FallbackFrame() without an import dependency.
  window.__PERF_SKIP_CAPTURE = _PERF.skipCapture;
}
```

Edit 2 (runtime-draw-loop.js, line ~603) — wrap the outside-fx call:

```js
if (!_PERF.skipOutside) drawOutsideFxLayer(now);
```

Edit 3 (runtime-draw-loop.js, line ~623-635) — wrap the per-animation loop. Use a guard around the for-loop (do NOT delete the loop body; only add a single `if (!_PERF.skipRooms) { ... }` wrapper around the existing for-of):

```js
if (!_PERF.skipRooms) {
  for (const anim of state.runningAnimations) {
    // ...existing body unchanged...
  }
}
```

Edit 4 (runtime-draw-loop.js, line ~647) — wrap the mesh-warp dispatch:

```js
if (!_PERF.skipWarp) ctx.postDrawMeshWarp?.(canvas, c);
```

Edit 5 (runtime-outside-mp4.js, line 210, AS THE FIRST STATEMENT of captureOutsideMp4FallbackFrame):

```js
// Phase 30 T-04 Step 1 (TEMPORARY — removed in Task 5).
if (typeof window !== "undefined" && window.__PERF_SKIP_CAPTURE) return;
```

DO NOT add any other behavioral changes. DO NOT remove or modify the existing
shouldDrawOutsideMp4Now gate, the fallback canvas, or the mp4 playback state
machine. The flags are purely additive short-circuits. All flags default to
false (no behavior change for users without the URL params).

Verification: every file still parses; the 40-test suite stays 40/40.
  </action>
  <verify>
    <automated>node --test "test/**/*.test.mjs" 2>&amp;1 | tail -5</automated>
    <grep>grep -c "perf_skip" src/app/runtime/render/runtime-draw-loop.js</grep>
  </verify>
  <acceptance_criteria>
    - `node --test "test/**/*.test.mjs"` reports `tests 40` and `pass 40`, `fail 0`.
    - `grep -c "perf_skip" src/app/runtime/render/runtime-draw-loop.js` returns >= 4 (one per flag).
    - `grep -c "__PERF_SKIP_CAPTURE" src/app/runtime/render/runtime-outside-mp4.js` returns >= 1.
    - `grep -c "_PERF.skipOutside" src/app/runtime/render/runtime-draw-loop.js` returns 1.
    - `grep -c "_PERF.skipRooms" src/app/runtime/render/runtime-draw-loop.js` returns 1.
    - `grep -c "_PERF.skipWarp" src/app/runtime/render/runtime-draw-loop.js` returns 1.
    - No syntax errors (browser-side; smoke via `node -e "require('fs').readFileSync('src/app/runtime/render/runtime-draw-loop.js','utf8')"`).
    - Default behavior unchanged: with no URL params, all four wrappers fall through to the existing code path.
  </acceptance_criteria>
  <done>
    Four URL feature flags wired into draw() and captureOutsideMp4FallbackFrame.
    Default (no query params) behavior is byte-equivalent. 40-test suite green.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2 (Step 1 UAT): User runs the 4-flag A/B matrix on Pi /output/ and reports fps deltas</name>
  <files>(no code files modified — checkpoint task)</files>
  <action>This is a human-verify checkpoint. The executor MUST PAUSE here and surface the &lt;what-built&gt;, &lt;how-to-verify&gt; instructions, and &lt;resume-signal&gt; below. Do NOT auto-resolve. Wait for the user's measurements before proceeding to Task 3.</action>
  <verify><manual>See &lt;how-to-verify&gt; below.</manual></verify>
  <what-built>
    Four URL feature flags (`?perf_skip_outside=1`, `?perf_skip_capture=1`,
    `?perf_skip_rooms=1`, `?perf_skip_warp=1`) plumbed into the draw loop and
    the captureOutsideMp4FallbackFrame entry point, so the user can A/B per-
    bucket cost on Pi /output/ via the existing diagnostic chip fps readout.
  </what-built>
  <how-to-verify>
    1. Ensure the diagnostic overlay is ON (System tab → Show diagnostic overlay).
       Verify the chip is visible on Pi /output/.
    2. Test-Board: Nemesis Lockdown Board A (3 room GIFs + sandstorm.mp4 outside-fx).
    3. For each renderMode (`gl` and `2d`), reload Pi /output/ with each of the
       following query strings and read the chip fps after 5 seconds steady-state:
       - Baseline:          `/output/`                                  → record fps
       - A:                 `/output/?perf_skip_capture=1`              → record fps
       - B:                 `/output/?perf_skip_outside=1`              → record fps
       - C:                 `/output/?perf_skip_rooms=1`                → record fps
       - D:                 `/output/?perf_skip_warp=1`                 → record fps
    4. Optional combo: `/output/?perf_skip_capture=1&perf_skip_warp=1`  → record fps
       (helps disambiguate if both Option A and warp matter additively).
    5. Report the 10 data points (5 flags × 2 modes) as a small table.

    Interpretation guide (per RESEARCH § Diagnostic measurement plan A):
    - If `perf_skip_capture=1` alone jumps fps to ~16-18: Option A (gated capture, T3)
      is the right ship. Likely root cause #1 confirmed.
    - If `perf_skip_capture=1` is small but `perf_skip_outside=1` jumps to 30+:
      Option A is insufficient; need Option B (T4: drop fallback canvas on /output/
      entirely OR else accept Option D/E for future).
    - If `perf_skip_rooms=1` is the biggest mover (>10 fps gain): re-investigate;
      RESEARCH considers this unlikely (estimated 3-6 ms/frame).
    - If `perf_skip_warp=1` is the biggest mover: re-investigate; would contradict
      RESEARCH's "10 fps in BOTH modes" datum. Unlikely but possible if Phase-30 hotfixes
      changed the warp cost profile.
  </how-to-verify>
  <resume-signal>
    Paste the 10-data-point fps table (5 flags × 2 modes), explicitly state which
    flag(s) moved fps the most, and pick the recommended ship branch:
      - "ship Option A only" (T3 yes, T4 no)
      - "ship Option A + Option B" (T3 yes, T4 yes)
      - "Option A insufficient, ship Option B only" (T3 no, T4 yes)
      - "neither A nor B helped enough — re-research" (escalate)
  </resume-signal>
  <acceptance_criteria>
    - User reports 10 fps measurements (5 flags × 2 modes).
    - User picks one of the four ship branches above.
    - Mesh-warp visual integrity confirmed in baseline (`?perf_skip_warp=0` default,
      i.e. no flag): squish bars, mid-line drags, internal grid points all rendering
      correctly. (Sanity check that the flag-scaffold itself didn't regress h6-h12.)
  </acceptance_criteria>
  <done>
    Decision recorded for Task 3 (Option A) and Task 4 (Option B): each is either
    GO or NO-GO with the user's per-flag fps evidence behind it.
  </done>
</task>

<task type="auto">
  <name>Task 3 (Step 2, Option A — LOW RISK, BIG WIN): Eliminate redundant per-frame outside-mp4 fallback capture</name>
  <files>
    src/app/runtime/render/runtime-draw-loop.js
  </files>
  <read_first>
    src/app/runtime/render/runtime-draw-loop.js (lines 478-495 — the outside-fx
    mp4 draw + capture branch),
    src/app/runtime/render/runtime-outside-mp4.js (lines 210-260 —
    captureOutsideMp4FallbackFrame, drawOutsideMp4FallbackFrame, the const
    OUTSIDE_MP4_FALLBACK_FRAME_MAX_AGE_MS at the top of the file),
    .planning/phases/phase-30/30-RESEARCH-PI-PERF.md §"Option A —
    Eliminate redundant per-frame capture",
    Task 2 resume-signal (the user's flag evidence)
  </read_first>
  <action>
GO/NO-GO: skip this task entirely if Task 2 resume-signal said "Option A
insufficient, ship Option B only" or "neither A nor B helped enough". Otherwise
proceed.

Apply RESEARCH § Option A's implementation sketch verbatim. The change is local
to the outside-fx mp4 branch in `draw(now)` at runtime-draw-loop.js around line
481-489. Replace the unconditional `captureOutsideMp4FallbackFrame(...)` call
with a frame-index-gated version so the fallback canvas is refreshed at most
every 6th real-draw frame, well within the 350ms freshness budget at
even 5 fps:

Replace:
```js
if (ctx.shouldDrawOutsideMp4Now(playbackState)) {
  c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.captureOutsideMp4FallbackFrame(playbackState, video);
} else {
  ctx.drawOutsideMp4FallbackFrame(playbackState);
}
```
With:
```js
// Phase 30 T-04 Step 2 Option A: capture-throttle.
// The fallback canvas only matters when shouldDrawOutsideMp4Now gates a
// frame OUT (i.e. rAF fired faster than the per-tier target). At Pi-class
// frame budgets the gate rarely-or-never fires negative, so the captured
// frame is essentially never read but the cost is paid every frame.
// Refresh the fallback at most every 6th real draw — at 30 fps that's
// ~200ms staleness, at 10 fps it's ~600ms (which exceeds the 350ms
// freshness budget; the consumer drawOutsideMp4FallbackFrame already
// handles the stale case by skipping). See research § Option A.
if (ctx.shouldDrawOutsideMp4Now(playbackState)) {
  c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
  const frameIdx = ctx.state?.runtimePerf?.frameIndex ?? 0;
  if ((frameIdx % 6) === 0) {
    ctx.captureOutsideMp4FallbackFrame(playbackState, video);
  }
} else {
  ctx.drawOutsideMp4FallbackFrame(playbackState);
}
```

DO NOT change `OUTSIDE_MP4_FALLBACK_FRAME_MAX_AGE_MS` in this task — at 24-30 fps
target post-Step-2, every-6th-frame yields ~200-250ms staleness which fits the
350ms budget. If the user later reports outside-fx flicker on slow frames,
the follow-up tweak is to relax the modulo (e.g. % 3) OR raise the freshness
const — captured as an Option D-style follow-up, not landed here.

DO NOT touch the existing `shouldDrawOutsideMp4Now` tier targeting, the
ensureOutsideMp4Playback path, or the mp4 playback state machine. Mesh-warp,
GL renderer, 2D fallback renderer, GIF playback, live-sync, and the diagnostic
chip are all untouched.

Cross-reference: this preserves h2 (rebuild outside-fx mirror after snapshot
apply), h3 (sync mirror on board switch), h6-h12 (mesh-warp stability) per
RESEARCH § Hard constraints. The change is one branch, three lines, fully
revertable.

Verification: 40-test suite stays 40/40.
  </action>
  <verify>
    <automated>node --test "test/**/*.test.mjs" 2>&amp;1 | tail -5</automated>
    <grep>grep -c "frameIdx % 6" src/app/runtime/render/runtime-draw-loop.js</grep>
  </verify>
  <acceptance_criteria>
    - `node --test "test/**/*.test.mjs"` reports `tests 40` and `pass 40`, `fail 0`.
    - `grep -c "frameIdx % 6" src/app/runtime/render/runtime-draw-loop.js` returns 1
      OR equivalent modulo gate (e.g. `frameIdx % 6 === 0`) is grep-able.
    - The unconditional `ctx.captureOutsideMp4FallbackFrame(playbackState, video);`
      call previously at line ~483 is now inside the `if ((frameIdx % 6) === 0)` block.
    - `OUTSIDE_MP4_FALLBACK_FRAME_MAX_AGE_MS` in runtime-outside-mp4.js is unchanged.
    - The Task 1 diagnostic flags are STILL present (Task 5 removes them).
  </acceptance_criteria>
  <done>
    Option A (capture-throttle) shipped to runtime-draw-loop.js. Reverts to single
    `git revert` on commit. Mesh-warp untouched. 40-test suite stays 40/40.
  </done>
</task>

<task type="auto">
  <name>Task 4 (Step 2, Option B — MEDIUM WIN, MEDIUM RISK, conditional): Drop outside-fx fallback canvas entirely on /output/ final-output role</name>
  <files>
    src/app/runtime/render/runtime-draw-loop.js
  </files>
  <read_first>
    src/app/runtime/render/runtime-draw-loop.js (lines 478-495 — outside-fx
    branch as modified by Task 3),
    src/app/runtime/render/runtime-outside-mp4.js (lines 210-260),
    .planning/phases/phase-30/30-RESEARCH-PI-PERF.md §"Option B — Drop the
    outside-fx fallback canvas entirely on /output/",
    Task 2 resume-signal (the user's flag evidence — required to pick this)
  </read_first>
  <action>
GO/NO-GO: skip this task entirely if Task 2 resume-signal said "ship Option A
only". Proceed only on "ship Option A + Option B" or "Option A insufficient,
ship Option B only".

Apply RESEARCH § Option B's implementation sketch. On the final-output role
(/output/), bypass the rate-limit gate AND the fallback-capture path entirely:
always paint the live video frame, never capture, never replay the fallback.
Non-/output/ contexts (dashboard preview etc.) keep the existing tier-gate +
fallback path unchanged.

Replace the Task 3 block:
```js
if (ctx.shouldDrawOutsideMp4Now(playbackState)) {
  c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
  const frameIdx = ctx.state?.runtimePerf?.frameIndex ?? 0;
  if ((frameIdx % 6) === 0) {
    ctx.captureOutsideMp4FallbackFrame(playbackState, video);
  }
} else {
  ctx.drawOutsideMp4FallbackFrame(playbackState);
}
```
With:
```js
// Phase 30 T-04 Step 2 Option B: on /output/ (final-output role), the rAF
// rate is already lower than any tier target, so the gate never fires
// negative and the fallback canvas is dead weight. Paint the live frame
// every rAF, skip both the gate AND the capture. Non-/output/ contexts
// keep the original tier-gated + capture-throttled path. See research
// § Option B.
const isFinalOutput = ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL;
if (isFinalOutput) {
  if (video.readyState >= 2 && Number(video.videoWidth) > 0 && Number(video.videoHeight) > 0) {
    c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
  }
} else if (ctx.shouldDrawOutsideMp4Now(playbackState)) {
  c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
  const frameIdx = ctx.state?.runtimePerf?.frameIndex ?? 0;
  if ((frameIdx % 6) === 0) {
    ctx.captureOutsideMp4FallbackFrame(playbackState, video);
  }
} else {
  ctx.drawOutsideMp4FallbackFrame(playbackState);
}
```

Boot transition is already covered by `tickLoadingOverlay` (per RESEARCH §
Option B Risk paragraph): the loading overlay holds until `video.readyState ≥ 2`,
so the user never sees the bare frame transition. The `video.readyState >= 2`
guard above is redundant defense-in-depth — it preserves the existing semantics
where outside-fx does NOT paint a black/uninitialized frame.

DO NOT remove `captureOutsideMp4FallbackFrame` exports or
`drawOutsideMp4FallbackFrame` from runtime-outside-mp4.js — they remain in use
on non-/output/ contexts. DO NOT touch h8 (loading overlay holds until video
ready). DO NOT touch h2/h3 (outside-fx mirror lifecycle on snapshot
apply / board switch — the playbackState map and its sync logic are untouched
here).

Verification: 40-test suite stays 40/40.
  </action>
  <verify>
    <automated>node --test "test/**/*.test.mjs" 2>&amp;1 | tail -5</automated>
    <grep>grep -c "isFinalOutput" src/app/runtime/render/runtime-draw-loop.js</grep>
  </verify>
  <acceptance_criteria>
    - `node --test "test/**/*.test.mjs"` reports `tests 40` and `pass 40`, `fail 0`.
    - `grep -c "isFinalOutput" src/app/runtime/render/runtime-draw-loop.js` returns >= 1.
    - The non-/output/ branch (`else if (ctx.shouldDrawOutsideMp4Now(...))`) still
      contains the Task 3 capture-throttle block (modulo gate present).
    - The video.readyState >= 2 guard is present in the final-output branch.
    - h8 loading overlay code (tickLoadingOverlay path) is untouched in this diff.
  </acceptance_criteria>
  <done>
    Option B (final-output bypass) shipped, conditional on Task 2 user evidence.
    Mesh-warp untouched. h2/h3/h8 untouched. 40-test stays 40/40.
  </done>
</task>

<task type="auto">
  <name>Task 5: Remove the 4 URL diagnostic flags (T1 scaffold cleanup)</name>
  <files>
    src/app/runtime/render/runtime-draw-loop.js,
    src/app/runtime/render/runtime-outside-mp4.js
  </files>
  <read_first>
    git diff for the Task 1 commit to find the exact lines to remove:
    `git log --oneline -- src/app/runtime/render/runtime-draw-loop.js | head -5`
    then identify the Task 1 commit and inspect it,
    plus the current state of runtime-draw-loop.js around line 480-660
  </read_first>
  <action>
Remove every line introduced by Task 1 — the four URL feature flags. The Task 3
(and optionally Task 4) shipped optimization stays. Specifically:

1. Remove the `_PERF` IIFE block + `window.__PERF_SKIP_CAPTURE` assignment from
   runtime-draw-loop.js (the once-per-load const introduced in Task 1).
2. Unwrap `if (!_PERF.skipOutside) drawOutsideFxLayer(now);` back to a bare
   `drawOutsideFxLayer(now);` call.
3. Unwrap `if (!_PERF.skipRooms) { for (const anim of state.runningAnimations) { ... } }`
   back to a bare `for (const anim of state.runningAnimations) { ... }` loop.
4. Unwrap `if (!_PERF.skipWarp) ctx.postDrawMeshWarp?.(canvas, c);` back to a bare
   `ctx.postDrawMeshWarp?.(canvas, c);` call.
5. Remove the `if (typeof window !== "undefined" && window.__PERF_SKIP_CAPTURE) return;`
   line at the top of `captureOutsideMp4FallbackFrame` in runtime-outside-mp4.js.

DO NOT remove the Task 3 capture-throttle code (the `frameIdx % 6` block).
DO NOT remove the Task 4 isFinalOutput branch (if it landed).

Verification: every `perf_skip` and `__PERF_SKIP_CAPTURE` token is gone from
src/, but `frameIdx % 6` (Task 3) and/or `isFinalOutput` (Task 4) remain.
40-test suite stays 40/40.
  </action>
  <verify>
    <automated>node --test "test/**/*.test.mjs" 2>&amp;1 | tail -5</automated>
    <grep>grep -rn "perf_skip\|__PERF_SKIP_CAPTURE\|_PERF\." src/app/ 2&gt;/dev/null</grep>
  </verify>
  <acceptance_criteria>
    - `grep -rn "perf_skip" src/app/` returns 0 matches.
    - `grep -rn "__PERF_SKIP_CAPTURE" src/app/` returns 0 matches.
    - `grep -rn "_PERF\." src/app/` returns 0 matches.
    - `grep -c "frameIdx % 6" src/app/runtime/render/runtime-draw-loop.js` returns >= 1
      (Task 3 retained).
    - If Task 4 landed: `grep -c "isFinalOutput" src/app/runtime/render/runtime-draw-loop.js`
      returns >= 1.
    - `drawOutsideFxLayer(now);`, `for (const anim of state.runningAnimations)`,
      and `ctx.postDrawMeshWarp?.(canvas, c)` are all bare (no `if (!_PERF.*)` wrapper).
    - `node --test "test/**/*.test.mjs"` reports `tests 40` and `pass 40`, `fail 0`.
  </acceptance_criteria>
  <done>
    Diagnostic scaffold removed. Production code carries only the Task 3
    (and optionally Task 4) shipped optimization. 40-test suite stays 40/40.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 6 (Final UAT): Pi /output/ stable 24-30 fps in BOTH renderModes, with all Phase 30 hotfixes intact</name>
  <files>(no code files modified — checkpoint task)</files>
  <action>This is a human-verify checkpoint. The executor MUST PAUSE here. Do NOT auto-resolve.</action>
  <verify><manual>See &lt;how-to-verify&gt; below.</manual></verify>
  <what-built>
    Production-ready Plan 30-04: Option A (Task 3) and optionally Option B
    (Task 4) shipped. Diagnostic scaffold removed. Mesh-warp untouched.
  </what-built>
  <how-to-verify>
    1. Reload Pi /output/ (clean, no URL params). Confirm diagnostic chip is on.
    2. Test-Board: Nemesis Lockdown Board A (3 GIFs + sandstorm.mp4 outside-fx).
    3. renderMode=auto: read fps after 30s steady-state. Target: 24-30 fps.
    4. Switch to renderMode=2d via System tab → reload /output/ → read fps.
       Target: 24-30 fps.
    5. Switch to renderMode=gl → reload → read fps. Target: 24-30 fps.
    6. Mesh-warp visual check: confirm squish bars / mid-line drags / internal
       grid points all render correctly (Phase 30 h6-h12 non-regression).
    7. h2/h3 spot-check: change board (canonical board switch), then back —
       outside-fx mirror should still rebuild correctly (no streifen, no black
       outside region).
    8. h10 spot-check: trigger 3 GIFs from the dashboard. All trigger reliably
       on first click (no Pi GIF reliability regression).
    9. h8 spot-check: full /output/ reload — loading overlay holds until video
       ready, then transitions cleanly (no flash of bare canvas).
    10. 40-test suite: `node --test "test/**/*.test.mjs"` → 40/40.
  </how-to-verify>
  <resume-signal>
    Type "PASS" if fps target met in both 2d and gl modes AND all 4 hotfix spot-
    checks (h6-h12, h2/h3, h10, h8) pass. Otherwise paste the chip readouts +
    describe the regression.
  </resume-signal>
  <acceptance_criteria>
    - User reports stable 24-30 fps on /output/ in BOTH renderMode=2d and renderMode=gl.
    - h6-h12 mesh-warp visual integrity confirmed.
    - h2/h3 outside-fx mirror rebuild on board switch confirmed.
    - h10 GIF trigger reliability on Pi /output/ confirmed.
    - h8 loading overlay transition confirmed clean.
    - 40-test suite reports 40/40.
  </acceptance_criteria>
  <done>
    Plan 30-04 shipped. Pi /output/ regression closed. All Phase 30 hotfixes
    intact. Mesh-warp invariant.
  </done>
</task>

</tasks>

<deferred_options>
## Out of Scope (per RESEARCH § Hard constraints)

- **Option C — DOM `<video>` element + dual-texture warp.** RESEARCH § Option C
  paragraph 3 explicitly states: "Almost certainly violates the 'Phase 30
  mesh-warp must preserve squish bars + mid-line drags + internal grid points'
  hard constraint, because warp would need re-architecting around two texture
  sources (canvas-content + video) instead of a single fx-canvas. NOT
  RECOMMENDED for this phase — file as a future enhancement."
- **Option F — OffscreenCanvas + worker thread.** RESEARCH § Option F:
  "Touches every render path, all DOM access (e.g. `document.getElementById`
  calls in the GL renderer line 88) needs rerouting. Full refactor scope. Not
  phase 30."

## MAYBE / Future-Phase (only if Step 2 doesn't reach 24-30 fps)

- **Option D — Smaller drawImage destination via play-area bbox.**
  RESEARCH § Option D estimates +2 to +5 fps. LOW RISK. If Task 6 UAT shows
  the chip stuck at 18-22 fps after T3+T4, plan a follow-up that computes
  `getPlayAreaBoundingBox(boardId)` once per frame and shrinks the
  drawImage dest rect to the bbox.
- **Option E — Lower outside-fx mp4 source resolution.**
  RESEARCH § Option E estimates +1 to +3 fps. Asset-pipeline change, not code.
  If Task 6 UAT is borderline, transcode `config/boards/assets/sandstorm.mp4`
  from current resolution to 720p or 540p. Visual quality drop on a
  particle/sand backdrop is likely imperceptible at projector distance.
</deferred_options>

<branch_alternatives>
## Step 1 Result → Step 2 Branch

| T2 user verdict                      | T3 (Option A) | T4 (Option B) | T6 expected fps target |
|--------------------------------------|---------------|---------------|------------------------|
| ship Option A only                   | GO            | NO-GO         | 15-25 fps              |
| ship Option A + Option B             | GO            | GO            | 25-30+ fps             |
| Option A insufficient, B only        | NO-GO         | GO            | 18-25 fps              |
| neither A nor B helped enough        | NO-GO         | NO-GO         | (escalate research)    |

If T2 returns "neither A nor B helped enough — re-research", abort the plan
mid-flight, run T5 to clean up the diagnostic scaffold, and open a new
research pass. Likely re-investigation focus: Option C feasibility (despite
the mesh-warp risk), Option F (worker-thread refactor scope), or a
deeper-than-RESEARCH look at Chromium's GPU→software demote on Pi VC4 (the
RESEARCH §"#3 — clearRect if Chromium has demoted fx-canvas" hypothesis that
was MEDIUM-HIGH-risk-of-being-wrong).
</branch_alternatives>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| URL query string → renderer | `?perf_skip_*=1` flags read from `window.location.search`; only present in T1, removed in T5. |
| Render pipeline → mesh-warp | T3/T4 modify outside-fx draw; mesh-warp downstream is unaffected (read-only on its inputs). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-30-04-01 | Tampering | URL feature flags (`perf_skip_*`) | accept | Flags only short-circuit local rendering; cannot mutate state, network, or storage. Removed in T5 anyway. |
| T-30-04-02 | Denial of Service (visual) | T3 capture-throttle (`% 6`) on slow rAF | mitigate | At <5 fps the `% 6` modulo could exceed 350ms freshness budget; downstream `drawOutsideMp4FallbackFrame` already handles stale-skip. Worst case: outside-fx flickers, never renders bad data. |
| T-30-04-03 | Denial of Service (visual) | T4 final-output bypass on boot | accept | Boot transition guarded by h8 (`tickLoadingOverlay` waits for `video.readyState ≥ 2`). T4 has redundant `video.readyState >= 2` check inside the bypass branch. |

Phase 30 T-04 introduces no new external surface. The optimization is local
to the per-frame draw loop.
</threat_model>

<verification>
- 40-test non-regression baseline: `node --test "test/**/*.test.mjs"` returns 40/40 green at every task boundary.
- All `perf_skip` / `__PERF_SKIP_CAPTURE` tokens removed from `src/` after T5: `grep -rn "perf_skip\|__PERF_SKIP_CAPTURE" src/` returns 0 matches.
- T3 retained: `grep -c "frameIdx % 6" src/app/runtime/render/runtime-draw-loop.js` returns >= 1.
- T4 retained (if landed): `grep -c "isFinalOutput" src/app/runtime/render/runtime-draw-loop.js` returns >= 1.
- Manual UAT on Pi /output/: stable 24-30 fps in BOTH renderMode=2d AND renderMode=gl with Test-Board Nemesis Lockdown Board A (3 GIFs + sandstorm.mp4).
- Phase 30 hotfix non-regression spot-checks: h2 / h3 / h6 / h7 / h8 / h9 / h10 / h12 all visually confirmed (no streifen, no boot context-loss, GIFs trigger, mesh-warp squish/drag/grid intact, outside-fx mirror rebuilds on board switch).
- Mesh-warp pipeline files untouched: `git diff HEAD~6 HEAD -- src/app/runtime/viewport/` returns no entries.
</verification>

<success_criteria>
- Pi /output/ stable 24-30 fps in both renderMode=2d and renderMode=gl
  (RESEARCH § Concrete fps target — "Phase 30 should target stable 24-30 fps,
  not 60 fps").
- The diagnostic scaffold (T1 flags) is fully removed after the optimization ships.
- The shipped optimization is one of Option A (T3) or Option A + Option B (T3+T4),
  picked by the user based on the T2 evidence.
- Mesh-warp with squish bars + mid-line drags + internal grid points is byte-
  identical (`git diff HEAD~6 HEAD -- src/app/runtime/viewport/runtime-projection-*.js`
  is empty).
- All Phase 30 hotfixes h2/h3/h6/h7/h8/h9/h10/h12 are visually non-regressed
  on Pi-hardware UAT.
- 40-test non-regression baseline stays 40/40.
- Out-of-scope items (Options C, F) are explicitly deferred; MAYBE items
  (Options D, E) are filed as follow-up if T6 doesn't land in target.
</success_criteria>

<goal_backward_verification>
## Acceptance criterion in user's words

> **"stable 24-30 fps on Pi /output/ with 3 GIFs + sandstorm.mp4 active in
> both renderMode='gl' AND renderMode='2d'"**

## Tasks that must land for that criterion to PASS

| # | Task | Required for PASS? | Rationale |
|---|------|--------------------|-----------|
| 1 | T1 — diagnostic flags | YES (transient) | Without measurement we can't tell whether T3 or T3+T4 is the right ship. T1 evidence drives T2's branch decision. |
| 2 | T2 — user A/B UAT | YES | Gate that picks T3-only vs T3+T4 vs T4-only vs escalate. |
| 3 | T3 — Option A capture-throttle | CONDITIONAL on T2 | If T2 says Option A moved fps (likeliest, per RESEARCH HIGH-MEDIUM prior on candidate #1), T3 is the primary fps win. |
| 4 | T4 — Option B final-output bypass | CONDITIONAL on T2 | If T3 alone reaches target, T4 is unnecessary; if T3 falls short, T4 closes the gap. |
| 5 | T5 — remove diagnostic scaffold | YES | Production code MUST NOT carry the `perf_skip_*` flags. |
| 6 | T6 — final UAT | YES | The acceptance bar IS this UAT. Without user confirmation in BOTH modes the criterion isn't measured. |

## Mapping to RESEARCH § Hard constraints (preservation)

- Mesh-warp preservation → satisfied because T3/T4 only touch the outside-fx
  branch in `runtime-draw-loop.js`. The mesh-warp dispatch at line 647 +
  `runtime-projection-{gl-renderer,2d-fallback-renderer,mapping}.js` are
  untouched.
- h6-h12 (mesh-warp stability) → orthogonal layer; T3/T4 cannot regress them.
- h2/h3 (outside-fx mirror lifecycle) → preserved; T3/T4 modulate WHEN capture
  writes to the mirror, never WHETHER the mirror exists.
- h8 (loading overlay holds until video ready) → preserved; T4 has
  defense-in-depth `video.readyState >= 2` guard.
- h10 (GIF reliability on Pi) → orthogonal file (runtime-gif-playback.js);
  not touched.
- Diagnostic chip + effective-mode visibility → orthogonal; not touched.

## Failure-mode handling

- If T6 reports fps stuck at 18-22 after T3+T4: open follow-up plan for
  Option D (play-area bbox drawImage) and/or Option E (lower-res mp4 asset).
  Both are LOW RISK, additive, do not regress mesh-warp.
- If T6 reports fps regression below baseline (~10 fps got WORSE): instant
  rollback via `git revert <T3-commit> [<T4-commit>]`. The whole plan is one
  file's worth of localized branches; revert is single-step.
- If T2 reveals "perf_skip_warp=1" was the dominant fps mover (contradicting
  RESEARCH): escalate. Indicates Phase 30 hotfixes h6-h12 changed the warp
  cost profile in a way RESEARCH didn't model. New research pass needed.
</goal_backward_verification>

<output>
After completion, create `.planning/phases/phase-30/30-04-SUMMARY.md` documenting:
- The 10-data-point T2 fps table (5 flags × 2 modes) the user reported.
- The ship branch chosen (A only / A+B / B only / escalated).
- The exact diff for T3 (and T4 if landed), including before/after line counts.
- Pi UAT verification stamp (date + measured fps in 2d and gl modes).
- Confirmation that all 4 perf_skip flags + __PERF_SKIP_CAPTURE were removed.
- Phase 30 hotfix non-regression spot-check results (h2/h3/h6-h12/h8/h10).
- 40/40 test suite stamp.
</output>
