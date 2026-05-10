---
phase: 34
plan: W0
type: execute
wave: 1
depends_on: []
files_modified:
  - test/phase-34-route-split.test.mjs
  - test/phase-34-runtime-env.test.mjs
  - test/phase-34-chrome-flags.test.mjs
  - test/phase-34-thin-output-script-graph.test.mjs
  - test/phase-34-render-mode-probe.test.mjs
autonomous: true
requirements: []
must_haves:
  truths:
    - "All four Wave-0 contract tests run and FAIL with the current codebase (RED state proves they actually test the target behavior)."
    - "When 34-B and 34-A land, the same tests transition to PASS without modification — they are the rails."
    - "test/connection-stability/** still passes after Wave 0 (no production code touched)."
  artifacts:
    - path: "test/phase-34-route-split.test.mjs"
      provides: "Contract tests for resolveStaticPath('/ssr')→index.html, resolveStaticPath('/output')→output.html, resolveStaticPath('/output/final')→output.html, normalizeRoutePath('/output?ssr=1')→'/output' (regression)."
      min_lines: 40
    - path: "test/phase-34-runtime-env.test.mjs"
      provides: "Contract tests for getRuntimeEnvironment({pathname:'/ssr'})→'server-ssr', getRuntimeEnvironment({pathname:'/output'})→'pi' (regression), and that '/ssr/anything' also classifies as server-ssr."
      min_lines: 30
    - path: "test/phase-34-chrome-flags.test.mjs"
      provides: "Static-source-grep test that ssr-render-host.mjs adds '--ignore-gpu-blocklist' and '--enable-gpu-rasterization' under a path NOT gated by SSR_ENABLE_VAAPI (i.e. an hasIgpuDev-style identifier independent of hasVaapiEnabled)."
      min_lines: 30
    - path: "test/phase-34-thin-output-script-graph.test.mjs"
      provides: "Snapshot test that asserts output.html (when it exists) does NOT reference any of: runtime-orchestration.js, runtime-gif-decoder.js, runtime-gif-playback.js, runtime-outside-mp4.js, runtime-draw-loop.js, runtime-projection-gl-renderer.js, runtime-animation-lifecycle.js, runtime-live-sync-core.js. Asserts output.html DOES reference: receiver-bootstrap.js, runtime-env.js. Skips with explicit 'output.html missing — Wave 0 gap, will fail post-Track-B if not created' if the file does not exist yet."
      min_lines: 35
    - path: "test/phase-34-render-mode-probe.test.mjs"
      provides: "Pure-function contract for the render-mode probe contract. Verifies that the server-side code path that logs ssr-stats renderMode (in ssr-webrtc-signaling.mjs or ssr-render-host.mjs, planner picks the actual sink) emits a recognizable line whenever an ssr-stats message arrives carrying a renderMode field. Mocks ws + msg, asserts log invocation."
      min_lines: 30
  key_links:
    - from: "test/phase-34-route-split.test.mjs"
      to: "server.mjs:resolveStaticPath()"
      via: "dynamic import of server.mjs (or direct extraction of the function)"
      pattern: "resolveStaticPath\\(.+/ssr.+\\).*output\\.html|resolveStaticPath\\(.+/ssr.+\\).*index\\.html"
    - from: "test/phase-34-runtime-env.test.mjs"
      to: "src/app/lib/shared/runtime-env.js:getRuntimeEnvironment"
      via: "load via vm + getRuntimeEnvironment({location:{pathname:'/ssr',search:''}})"
      pattern: "server-ssr"
    - from: "test/phase-34-chrome-flags.test.mjs"
      to: "src/server/ssr-render-host.mjs"
      via: "readFileSync of source string + regex assertions on the flag-build code"
      pattern: "hasIgpuDev|--ignore-gpu-blocklist"
---

<objective>
Wave 0: produce ALL contract tests for Phase 34 BEFORE any production code is changed. These tests must FAIL on the current master (RED) and PASS once 34-B and 34-A land. They are the rails for the rest of the phase — no production code change in 34-B or 34-A is "done" until the corresponding Wave-0 test transitions RED→GREEN.

Purpose: enforce TDD discipline. Phase 33's hard-lesson was "telemetry first". Phase 34's parallel hard-lesson is "tests first" — the URL-migration cascade in `runtime-env.js` (RESEARCH §Pitfall 2) is the kind of subtle break that is invisible without an explicit contract test. Same for the GL-flag gating bug (RESEARCH §Pitfall 1). Same for the script-graph regression in the new output.html.

Output: 5 new test files under `test/phase-34-*.test.mjs`. No production code touched. `test/connection-stability/**` must remain GREEN at the end of Wave 0 (verified via the D-06 gate task).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-34/34-CONTEXT.md
@.planning/phases/phase-34/34-RESEARCH.md
@.planning/phases/phase-34/34-VALIDATION.md
@.planning/phases/phase-33/33-CLOSURE.md

# Source of truth for the contracts under test:
@server.mjs
@src/app/lib/shared/runtime-env.js
@src/server/ssr-render-host.mjs
@index.html

# Reference patterns for similar tests already in the codebase:
@test/ssr-chromium-flags-merge.test.mjs
@test/runtime-env-environment.test.mjs
@test/ssr-receiver-disconnect-detection.test.mjs

<interfaces>
<!-- Key contract surfaces these tests must pin. Extracted from codebase. -->

From server.mjs:
```javascript
// server.mjs:3444-3449 — current logic (these tests assert the post-34-B logic)
function resolveStaticPath(urlValue, routePath) {
  if (routePath === "/output/final" || routePath === "/output") {
    return path.join(ROOT_DIR, "index.html");
  }
  return toSafePath(urlValue || "/");
}

// server.mjs:2243-2251 — already-correct, regression-only
function normalizeRoutePath(urlValue = "/") {
  // strips query strings, trailing slashes
}
```

From src/app/lib/shared/runtime-env.js:50-69:
```javascript
function getRuntimeEnvironment({ location: loc, userAgent: ua } = {}) {
  // returns: "pi" | "server-ssr" | "desktop"
  // CURRENT classifier: ?ssr=1 in search → "server-ssr"
  // POST-34-B classifier: pathname === "/ssr" || startsWith("/ssr/") → "server-ssr"
}
```

From src/server/ssr-render-host.mjs:492-494, 590:
```javascript
// CURRENT — VAAPI-gated:
const hasIgpu =
  process.env.SSR_ENABLE_VAAPI === "1" &&
  (existsSync("/dev/dri/renderD128") || existsSync("/dev/dri/renderD129"));
// ... later:
...(hasIgpu ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : []),

// POST-34-A target (decoupled):
const hasIgpuDev = existsSync("/dev/dri/renderD128") || existsSync("/dev/dri/renderD129");
const hasVaapiEnabled = process.env.SSR_ENABLE_VAAPI === "1" && hasIgpuDev;
// ...
...(hasIgpuDev ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : []),
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Route-split + runtime-env contract tests (Track B rails)</name>
  <files>test/phase-34-route-split.test.mjs, test/phase-34-runtime-env.test.mjs</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-04 path split is the contract under test)
    - .planning/phases/phase-34/34-RESEARCH.md (Track B: Server Route Split + Runtime-Env Detection Migration sections)
    - server.mjs lines 2243-2251 (normalizeRoutePath) and 3444-3449 (resolveStaticPath)
    - src/app/lib/shared/runtime-env.js (full file — 79 lines)
    - test/ssr-chromium-flags-merge.test.mjs (reference pattern for source-string testing)
    - test/runtime-env-environment.test.mjs (reference pattern for runtime-env vm-loading)
  </read_first>
  <action>
    Create TWO test files using `node:test`.

    **File 1: `test/phase-34-route-split.test.mjs`**

    Strategy: import `resolveStaticPath` from server.mjs is non-trivial (it's a top-level non-exported function inside a 4000-line file). Use the SAME pattern as `test/ssr-chromium-flags-merge.test.mjs` — read the source as a string and assert the post-34-B logic via regex. Plus a behavioral test that loads the function via a small evaluation harness if feasible; if not, source-grep is the contract.

    Write tests:
    1. `test("resolveStaticPath(/ssr) returns index.html path", ...)` — assert the source contains a branch that maps `routePath === "/ssr"` to `path.join(ROOT_DIR, "index.html")`. Regex: `/routePath\s*===\s*["']\/ssr["']/` AND within the same `if` body the resolution path contains `"index.html"`. RED on master (no `/ssr` route exists yet).
    2. `test("resolveStaticPath(/output) returns output.html path (post-Track-B)", ...)` — assert source contains `routePath === "/output"` mapping to `output.html` (NOT `index.html`). RED on master because today it returns `index.html`.
    3. `test("resolveStaticPath(/output/final) returns output.html path (post-Track-B)", ...)` — same regex but on `"/output/final"`. RED on master.
    4. `test("normalizeRoutePath strips ?ssr=1 query (regression)", ...)` — load `normalizeRoutePath` via dynamic-import of a tiny extracted-helper file OR copy the 8-line function body into the test (it's pure). Assert `normalizeRoutePath("/output?ssr=1") === "/output"`. GREEN on master (regression coverage — must STAY green).

    Each `test()` invocation MUST include a comment line above it that says either `// EXPECTED: RED on master, GREEN after 34-B` or `// EXPECTED: GREEN on master (regression)`.

    Use `readFileSync("server.mjs", "utf8")` at the top. No mocking — pure source-grep + regex match.

    **File 2: `test/phase-34-runtime-env.test.mjs`**

    Strategy: load `runtime-env.js` via the same vm+sandbox pattern used in `test/runtime-env-environment.test.mjs` (which already does this — copy its loader). The file exposes `window.TT_BEAMER_RUNTIME_ENV` with `getRuntimeEnvironment`.

    Write tests:
    1. `test("getRuntimeEnvironment returns 'server-ssr' for pathname=/ssr (post-Track-B)", ...)` — call `getRuntimeEnvironment({location:{pathname:"/ssr",search:""}, userAgent:""})`. Assert `=== "server-ssr"`. RED on master because current code only checks `?ssr=1`.
    2. `test("getRuntimeEnvironment returns 'server-ssr' for pathname=/ssr/something (post-Track-B)", ...)` — same with `pathname:"/ssr/foo"`. RED on master.
    3. `test("getRuntimeEnvironment returns 'pi' for /output without ?ssr=1 (regression)", ...)` — call with `pathname:"/output", search:""`. Assert `=== "pi"`. GREEN on master.
    4. `test("getRuntimeEnvironment returns 'server-ssr' for /output?ssr=1 (legacy regression — must keep working until hard-cut)", ...)` — call with `pathname:"/output", search:"?ssr=1"`. Assert `=== "server-ssr"`. GREEN on master. Track B will hard-cut `?ssr=1` (RESEARCH §Open Q3 — recommendation: hard-cut, no redirect), but until that commit lands this test stays GREEN. Comment: `// Track B may DELETE this test if the legacy ?ssr=1 path is fully removed; until then it asserts the existing behavior.`
    5. `test("getRuntimeEnvironment returns 'pi' for ARM UA regardless of pathname (regression)", ...)` — call with `userAgent:"Linux armv7l"`. Assert `=== "pi"`. GREEN on master.
  </action>
  <verify>
    <automated>node --test test/phase-34-route-split.test.mjs test/phase-34-runtime-env.test.mjs 2>&1 | tee /tmp/wave0-task1.out; grep -E "^# fail [1-9]|^# pass [1-9]" /tmp/wave0-task1.out</automated>
  </verify>
  <acceptance_criteria>
    - File `test/phase-34-route-split.test.mjs` exists and contains exactly 4 `test(` invocations (no more, no fewer).
    - File `test/phase-34-runtime-env.test.mjs` exists and contains exactly 5 `test(` invocations.
    - Running `node --test test/phase-34-route-split.test.mjs` reports 3 FAIL + 1 PASS (the `normalizeRoutePath` regression).
    - Running `node --test test/phase-34-runtime-env.test.mjs` reports 2 FAIL (the two `/ssr` pathname tests) + 3 PASS (the regression tests).
    - Each test has a comment line above it indicating `// EXPECTED: RED on master, GREEN after 34-B` OR `// EXPECTED: GREEN on master (regression)`.
    - `grep -c "test(" test/phase-34-route-split.test.mjs` returns 4.
    - `grep -c "test(" test/phase-34-runtime-env.test.mjs` returns 5.
  </acceptance_criteria>
  <done>
    Both test files exist; running each individually shows the expected mix of failing (rails for Track B) and passing (regression coverage) tests. The total count of FAIL on this task's 9 tests is exactly 5 (3 from route-split, 2 from runtime-env).
  </done>
</task>

<task type="auto">
  <name>Task 2: Chrome-flags + thin-output-script-graph + render-mode-probe contract tests (Track A + Track B rails)</name>
  <files>test/phase-34-chrome-flags.test.mjs, test/phase-34-thin-output-script-graph.test.mjs, test/phase-34-render-mode-probe.test.mjs</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-01 probe + force, D-03 thin output)
    - .planning/phases/phase-34/34-RESEARCH.md (Track A: GL-Force Flag Architecture; Pitfall 1; Code Examples §Chrome Flag Fix; Track B: Minimum Script Set for output.html)
    - src/server/ssr-render-host.mjs lines 487-595 (current Chrome flag build + hasIgpu + enabledFeatures)
    - src/server/ssr-stream-publisher.mjs lines 380-440 (existing ssr-stats envelope that already calls __ttBeamerEffectiveRenderMode)
    - src/server/ssr-webrtc-signaling.mjs lines 440-460 (existing ssr-stats handler — the planner picks where renderMode is logged)
    - index.html lines 991-1191 (full script load list — the SET that output.html must NOT contain)
    - test/ssr-chromium-flags-merge.test.mjs (reference: how to read ssr-render-host.mjs source as a string)
  </read_first>
  <action>
    Create THREE test files.

    **File 1: `test/phase-34-chrome-flags.test.mjs`**

    Strategy: source-string regex on `src/server/ssr-render-host.mjs`, same pattern as `test/ssr-chromium-flags-merge.test.mjs`.

    Tests:
    1. `test("ssr-render-host declares hasIgpuDev separately from hasVaapiEnabled (post-34-A)", ...)` — assert source contains a binding named `hasIgpuDev` that DOES NOT include `process.env.SSR_ENABLE_VAAPI` on its right-hand side. Regex: source matches `/const\s+hasIgpuDev\s*=/` AND the line containing `hasIgpuDev =` (and the next line if multi-line) does NOT contain `SSR_ENABLE_VAAPI`. RED on master (no such binding exists; current code is `const hasIgpu = process.env.SSR_ENABLE_VAAPI === "1" && (existsSync...)`).
    2. `test("ssr-render-host adds --ignore-gpu-blocklist gated on hasIgpuDev not hasVaapiEnabled (post-34-A)", ...)` — assert that the line containing `--ignore-gpu-blocklist` is preceded (within the same ternary/spread) by `hasIgpuDev` token, NOT by a token that pulls in `SSR_ENABLE_VAAPI`. Concrete check: a regex like `/\.{3}\(\s*hasIgpuDev\s*\?\s*\[\s*"--ignore-gpu-blocklist"/` must match. RED on master.
    3. `test("ssr-render-host adds --enable-gpu-rasterization gated on hasIgpuDev (post-34-A)", ...)` — same regex pattern with `--enable-gpu-rasterization`. RED on master.
    4. `test("ssr-render-host VAAPI features still gated on hasVaapiEnabled (regression)", ...)` — assert that the `enabledFeatures` array includes `"VaapiVideoEncoder"` only when `hasVaapiEnabled` is truthy (or `hasIgpu` if planner kept the legacy name). The test must be tolerant: accept either `hasVaapiEnabled` or `hasIgpu` token before `["VaapiVideoEncoder"`. GREEN on master (current code is `hasIgpu`); MUST STAY GREEN after 34-A renames it to `hasVaapiEnabled`.
    5. `test("ssr-render-host --use-gl=angle still present (regression — h9 fix)", ...)` — assert source contains `"--use-gl=angle"`. GREEN on master, must stay GREEN.

    **File 2: `test/phase-34-thin-output-script-graph.test.mjs`**

    Strategy: read `output.html` (if exists) as string, regex-assert script-tag inclusion/exclusion. If file does not exist, skip with a clear message.

    Tests:
    1. `test("output.html exists at repo root (post-Track-B)", ...)` — assert `existsSync("output.html")`. RED on master.
    2. `test("output.html does NOT load runtime-orchestration.js (post-Track-B)", ...)` — if file exists, assert source does NOT contain `runtime-orchestration.js`. If file doesn't exist, fail with message `output.html missing — Wave 0 gap, will pass after 34-B creates it`. RED on master.
    3. `test("output.html does NOT load any of the render pipeline modules (post-Track-B)", ...)` — assert source does NOT contain any of: `runtime-gif-decoder.js`, `runtime-gif-playback.js`, `runtime-outside-mp4.js`, `runtime-draw-loop.js`, `runtime-projection-gl-renderer.js`, `runtime-projection-2d-fallback-renderer.js`, `runtime-animation-lifecycle.js`, `runtime-live-sync-core.js`, `runtime-orchestration-ctx-builder.js`. RED on master.
    4. `test("output.html DOES load receiver-bootstrap.js (post-Track-B)", ...)` — assert source contains `receiver-bootstrap.js`. RED on master.
    5. `test("output.html DOES load runtime-env.js (post-Track-B)", ...)` — assert source contains `runtime-env.js`. RED on master.
    6. `test("output.html DOES load output-audio-binder.js (post-Track-B)", ...)` — assert source contains `output-audio-binder.js` (this is the new minimal audio module D-03 mandates; named per RESEARCH §Audio Binder Coupling Option-3). RED on master.
    7. `test("output.html script-graph snapshot < 600 bytes script-block (heuristic strip check)", ...)` — count occurrences of `<script` in the file; assert `<= 8` (5 required: receiver-bootstrap + runtime-env + output-audio-binder + diagnostic chip inline + 1 reserve). The full app has ~85 scripts. RED on master (file doesn't exist).

    **File 3: `test/phase-34-render-mode-probe.test.mjs`**

    Strategy: source-string regex on `src/server/ssr-webrtc-signaling.mjs` and/or `src/server/ssr-render-host.mjs` to assert that whenever an `ssr-stats` message arrives carrying `renderMode`, the server emits a recognizable log line. The actual sink-of-truth is planner's call (decided in 34-A); this Wave-0 test pins the contract: a log line MUST exist that includes the renderMode value.

    Tests:
    1. `test("server logs ssr-stats renderMode for D-01 telemetry (post-34-A)", ...)` — assert that one of `src/server/ssr-webrtc-signaling.mjs` or `src/server/ssr-render-host.mjs` contains a logger call (matching `logger\.(info|log|warn)\(.*renderMode`) gated on `msg.type === "ssr-stats"` or inside the ssr-stats handler. RED on master (current handler at signaling.mjs:447 stores stats but does NOT log renderMode periodically). Test reads BOTH files into one combined source string and applies the regex to the combination.
    2. `test("__ttBeamerEffectiveRenderMode is referenced in ssr-stream-publisher (regression)", ...)` — assert `src/server/ssr-stream-publisher.mjs` contains `__ttBeamerEffectiveRenderMode`. GREEN on master, must stay GREEN.
  </action>
  <verify>
    <automated>node --test test/phase-34-chrome-flags.test.mjs test/phase-34-thin-output-script-graph.test.mjs test/phase-34-render-mode-probe.test.mjs 2>&1 | tee /tmp/wave0-task2.out; grep -E "^# (pass|fail) [0-9]+" /tmp/wave0-task2.out</automated>
  </verify>
  <acceptance_criteria>
    - File `test/phase-34-chrome-flags.test.mjs` contains exactly 5 `test(` invocations.
    - File `test/phase-34-thin-output-script-graph.test.mjs` contains exactly 7 `test(` invocations.
    - File `test/phase-34-render-mode-probe.test.mjs` contains exactly 2 `test(` invocations.
    - Running `node --test test/phase-34-chrome-flags.test.mjs` reports 3 FAIL (the three "post-34-A" tests) + 2 PASS (the two regression tests).
    - Running `node --test test/phase-34-thin-output-script-graph.test.mjs` reports 7 FAIL (output.html does not exist on master).
    - Running `node --test test/phase-34-render-mode-probe.test.mjs` reports 1 FAIL + 1 PASS.
    - Each test has a `// EXPECTED: ...` comment.
    - `grep -c "test(" test/phase-34-chrome-flags.test.mjs` = 5; `grep -c "test(" test/phase-34-thin-output-script-graph.test.mjs` = 7; `grep -c "test(" test/phase-34-render-mode-probe.test.mjs` = 2.
  </acceptance_criteria>
  <done>
    Three test files exist; total FAIL count across the three is 11 (3 chrome-flags + 7 thin-output + 1 render-mode-probe), total PASS is 3.
  </done>
</task>

<task type="auto">
  <name>Task 3: D-06 hard-gate baseline — connection-stability suite must stay green after Wave 0</name>
  <files>.planning/phases/phase-34/34-W0-PRECHECK.md</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-06 hard gate language)
    - .planning/phases/phase-33/33-CLOSURE.md (carry-forward defensive layers)
    - test/connection-stability/_harness.mjs
    - package.json (scripts.test:live, scripts.test:live:isolated)
  </read_first>
  <action>
    Wave 0 changes ZERO production source. The contract tests added in Tasks 1 and 2 only read source as strings and call pure functions via vm. There should be no impact on `test/connection-stability/**`. This task PROVES that with two commands and writes the result.

    Steps:
    1. Run `node --test "test/**/*.test.mjs" 2>&1 | tail -25` and capture the summary.
    2. Run `RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -25` and capture the summary. NOTE: live tests require running infrastructure (Xvfb, Chromium snap); if the executor environment cannot run them, document that with the exact failure mode rather than skipping silently.
    3. Write `.planning/phases/phase-34/34-W0-PRECHECK.md` with the exact pre-Wave-0 baseline counts (pass / fail / skip) for both runs, plus the post-Wave-0 numbers (which must equal the pre-Wave-0 numbers + the 14 newly-failing Wave-0 contract tests + the 6 newly-passing regression tests, depending on which test files are in scope of `test/**/*.test.mjs`).

    The file should look like:

    ```
    # Phase 34 Wave 0 — Pre-Track-B/A Baseline

    Date: <iso>
    Commit-before-Wave-0: <git rev-parse HEAD before Wave 0>
    Commit-after-Wave-0: <git rev-parse HEAD after Wave 0>

    ## All-tests run (`node --test "test/**/*.test.mjs"`)

    Before Wave 0:
      pass: <N>, fail: <N>, skip: <N>
    After Wave 0:
      pass: <N+6>, fail: <N+14>, skip: <N>
      Delta: +6 pass (regression coverage), +14 fail (rails for 34-B and 34-A)

    ## Connection-stability suite (`RUN_LIVE_TESTS=1 node --test test/connection-stability/`)

    Before Wave 0:
      pass: 80, fail: 0
    After Wave 0:
      pass: 80, fail: 0  ← D-06 hard-gate: must equal pre.

    If RUN_LIVE_TESTS could not execute (e.g. no Xvfb), document why and the planned post-track-B re-verification.
    ```

    The exact "+14 fail / +6 pass" delta from the table above must match what Tasks 1 and 2 produced. If the executor finds a different delta, that is the actual delta — record it; do not fudge.
  </action>
  <verify>
    <automated>node --test "test/**/*.test.mjs" 2>&1 | tail -3 | tee /tmp/wave0-d06.out; test -f .planning/phases/phase-34/34-W0-PRECHECK.md</automated>
  </verify>
  <acceptance_criteria>
    - File `.planning/phases/phase-34/34-W0-PRECHECK.md` exists.
    - File contains a literal `Before Wave 0:` line and a literal `After Wave 0:` line for both the all-tests run and the connection-stability run.
    - File records the connection-stability suite as `fail: 0` after Wave 0 (or, if live tests could not execute, an explicit reason and a TODO marker for re-verification at the end of Track B).
    - The all-tests "after" pass count equals the "before" pass count plus the number of regression-tests added (~6).
    - The all-tests "after" fail count equals the "before" fail count plus the number of post-34-B/post-34-A rail-tests (~14).
    - File contains both git revision hashes (before and after Wave 0).
  </acceptance_criteria>
  <done>
    Wave 0 baseline file written. Connection-stability suite is unchanged from Phase 33 baseline (80 pass / 0 fail) — the D-06 hard-gate is verified to be intact at the start of Phase 34. The exact RED count from the new test files is recorded so Tracks B and A know how many tests they need to flip GREEN.
  </done>
</task>

</tasks>

<threat_model>
**Wave 0 introduces no new attack surface.** All work is test-only:

- The three contract tests read source files as strings via `readFileSync` (no execution of untrusted input).
- The runtime-env contract test loads `runtime-env.js` via `vm` in a sandbox that exposes only a synthetic `window` object (existing pattern from `test/runtime-env-environment.test.mjs`).
- No new HTTP routes, no network code, no user input handling.

`<threat_model>No threats — change is test-only / no production code touched / no user input / no new network surface.</threat_model>`

The localhost-only restriction for the future `/ssr` HTTP route (Track B threat surface) is documented in 34-B-PLAN.md, not here. The role-based localhost restriction at `ssr-webrtc-signaling.mjs:269` is unchanged by Wave 0.
</threat_model>

<verification>
- All five new test files exist under `test/phase-34-*.test.mjs`.
- Total `test(` count across the new files is 23 (4 + 5 + 5 + 7 + 2).
- Total FAIL count from the new files is 16 (3 + 2 + 3 + 7 + 1).
- Total PASS count from the new files is 7 (1 + 3 + 2 + 0 + 1).
- `34-W0-PRECHECK.md` exists with documented before/after counts.
- `RUN_LIVE_TESTS=1 node --test test/connection-stability/` reports 80 pass / 0 fail (or documented blocker).
</verification>

<success_criteria>
Wave 0 is complete when:
- All 5 contract test files exist with the exact `test(` count specified per file.
- The mix of FAIL (rails) vs PASS (regression) matches Task 1 + Task 2 acceptance criteria.
- D-06 hard gate baseline is captured in `34-W0-PRECHECK.md`: connection-stability suite is GREEN at Wave-0-end.
- No production source file (.js / .mjs / .html under src/, server.mjs, index.html) has been modified.
</success_criteria>

<output>
After completion, create `.planning/phases/phase-34/34-W0-SUMMARY.md` with:
- Files created (5 test files + 1 precheck doc).
- Test counts: total tests added, total FAIL (= rails for 34-B/34-A), total PASS (= regression coverage).
- Connection-stability suite status (D-06 baseline).
- Hand-off note to 34-B: "These N tests must flip RED→GREEN as part of Track B; if any fails to flip, Track B is incomplete."
- Hand-off note to 34-A: same pattern for the chrome-flags + render-mode-probe rails.
</output>
