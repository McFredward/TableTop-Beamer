# Phase 34 Wave 0 — Pre-Track-B/A Baseline

Date: 2026-05-10T00:36:01Z
Commit-before-Wave-0: 51d787b0c8dcc5c6b1cbe20a4c71941951ad7d59
Commit-after-Wave-0: bcfb7acfdeb105bae072bd92c9739810b043b179

## All-tests run (`node --test "test/**/*.test.mjs"`)

Before Wave 0:
  pass: 343, fail: 0, skip: 17

After Wave 0:
  pass: 350, fail: 16, skip: 17
  Delta: +7 pass (regression coverage), +16 fail (rails for 34-B and 34-A)

### Wave 0 RED breakdown (16 failing rails)

Track B rails (must flip GREEN when 34-B lands):
  test/phase-34-route-split.test.mjs:
    - resolveStaticPath(/ssr) returns index.html path           [RED]
    - resolveStaticPath(/output) returns output.html path       [RED]
    - resolveStaticPath(/output/final) returns output.html path [RED]
  test/phase-34-runtime-env.test.mjs:
    - getRuntimeEnvironment returns 'server-ssr' for /ssr       [RED]
    - getRuntimeEnvironment returns 'server-ssr' for /ssr/*     [RED]
  test/phase-34-thin-output-script-graph.test.mjs:
    - output.html exists at repo root                           [RED]
    - output.html does NOT load runtime-orchestration.js        [RED]
    - output.html does NOT load any render pipeline modules     [RED]
    - output.html DOES load receiver-bootstrap.js               [RED]
    - output.html DOES load runtime-env.js                      [RED]
    - output.html DOES load output-audio-binder.js              [RED]
    - output.html script-graph snapshot <= 8 <script tags       [RED]

Track A rails (must flip GREEN when 34-A lands):
  test/phase-34-chrome-flags.test.mjs:
    - ssr-render-host declares hasIgpuDev separately            [RED]
    - --ignore-gpu-blocklist gated on hasIgpuDev                [RED]
    - --enable-gpu-rasterization gated on hasIgpuDev            [RED]
  test/phase-34-render-mode-probe.test.mjs:
    - server logs ssr-stats renderMode for D-01 telemetry       [RED]

### Wave 0 GREEN regression coverage (7 passing baseline tests)

  test/phase-34-route-split.test.mjs:
    - normalizeRoutePath strips ?ssr=1 query                    [GREEN]
  test/phase-34-runtime-env.test.mjs:
    - getRuntimeEnvironment returns 'pi' for /output (no ssr)   [GREEN]
    - getRuntimeEnvironment returns 'server-ssr' for ?ssr=1     [GREEN]
    - getRuntimeEnvironment ARM UA always returns 'pi'          [GREEN]
  test/phase-34-chrome-flags.test.mjs:
    - VAAPI features gated on hasVaapiEnabled or hasIgpu        [GREEN]
    - --use-gl=angle still present (h9 regression)              [GREEN]
  test/phase-34-render-mode-probe.test.mjs:
    - __ttBeamerEffectiveRenderMode in ssr-stream-publisher      [GREEN]

## Connection-stability suite (`RUN_LIVE_TESTS=1 node --test "test/connection-stability/*.test.mjs"`)

NOTE: The suite is invoked as `node --test "test/connection-stability/*.test.mjs"` (glob).
`node --test test/connection-stability/` (directory) fails with MODULE_NOT_FOUND because
node:test requires a file entry point, not a directory.

Before Wave 0:
  pass: 84, fail: 0, skip: 1

After Wave 0:
  pass: 84, fail: 0, skip: 1  ← D-06 hard-gate: fail count equals pre.

Wave 0 changes ZERO production source files — the connection-stability suite is
completely unaffected. All 5 new test files are test-only, read source files as
strings (no exec), and call pure functions via Function constructor. No server
modules are imported or executed.

## D-06 Hard Gate Verdict

PASS. Connection-stability fail count = 0 before and after Wave 0. The D-06 gate
is intact at the start of Phase 34.

## Hand-off Notes

### To Track B (34-B plan):
These 12 tests must flip RED→GREEN as part of Track B:
  - phase-34-route-split.test.mjs: 3 tests (resolveStaticPath /ssr + /output + /output/final)
  - phase-34-runtime-env.test.mjs: 2 tests (getRuntimeEnvironment pathname=/ssr)
  - phase-34-thin-output-script-graph.test.mjs: 7 tests (output.html creation + script graph)

If any of these 12 remain RED after Track B, Track B is incomplete.

### To Track A (34-A plan):
These 4 tests must flip RED→GREEN as part of Track A:
  - phase-34-chrome-flags.test.mjs: 3 tests (hasIgpuDev decoupling + GL flag gating)
  - phase-34-render-mode-probe.test.mjs: 1 test (renderMode logger call in ssr-stats handler)

If any of these 4 remain RED after Track A, Track A is incomplete.
