---
phase: 34
plan: W0
subsystem: test-infrastructure
tags: [tdd, wave-0, contract-tests, track-a, track-b, red-rail]
dependency_graph:
  requires: []
  provides: [34-B-rails, 34-A-rails, d06-baseline]
  affects: [phase-34-chrome-flags, phase-34-route-split, phase-34-runtime-env, phase-34-thin-output-script-graph, phase-34-render-mode-probe]
tech_stack:
  added: []
  patterns: [source-grep-contract-tests, brace-walker-function-extractor, node-test-native]
key_files:
  created:
    - test/phase-34-route-split.test.mjs
    - test/phase-34-runtime-env.test.mjs
    - test/phase-34-chrome-flags.test.mjs
    - test/phase-34-thin-output-script-graph.test.mjs
    - test/phase-34-render-mode-probe.test.mjs
    - .planning/phases/phase-34/34-W0-PRECHECK.md
  modified: []
decisions:
  - "Source-grep strategy used for resolveStaticPath (server.mjs is a 4000-line non-exported module — same pattern as ssr-chromium-flags-merge.test.mjs avoids complex import harness)"
  - "thin-output tests use assert.fail with explicit 'Wave 0 gap' message instead of skip — produces RED not skip, which is the correct TDD state"
  - "connection-stability invoked as glob pattern not directory (node:test requires file entry point)"
metrics:
  duration_seconds: 384
  completed: "2026-05-10"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 0
---

# Phase 34 Plan W0: Wave 0 Contract Tests Summary

Wave 0 TDD rails for Phase 34 SSR Render-Quality + /output/ Thin-Consumer Refactor. 5 test files assert the post-34-A and post-34-B target behavior and fail correctly on master (RED), establishing the TDD rails before any production code is changed.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Route-split + runtime-env contract tests (Track B rails) | aad4fad | test/phase-34-route-split.test.mjs, test/phase-34-runtime-env.test.mjs |
| 2 | Chrome-flags + thin-output-script-graph + render-mode-probe (Track A + Track B rails) | bcfb7ac | test/phase-34-chrome-flags.test.mjs, test/phase-34-thin-output-script-graph.test.mjs, test/phase-34-render-mode-probe.test.mjs |
| 3 | D-06 hard-gate baseline — connection-stability suite verification | cc59941 | .planning/phases/phase-34/34-W0-PRECHECK.md |

## Files Created

### Test Files (5 new)

| File | Tests | RED (rails) | GREEN (regression) |
|------|-------|-------------|-------------------|
| test/phase-34-route-split.test.mjs | 4 | 3 | 1 |
| test/phase-34-runtime-env.test.mjs | 5 | 2 | 3 |
| test/phase-34-chrome-flags.test.mjs | 5 | 3 | 2 |
| test/phase-34-thin-output-script-graph.test.mjs | 7 | 7 | 0 |
| test/phase-34-render-mode-probe.test.mjs | 2 | 1 | 1 |
| **TOTAL** | **23** | **16** | **7** |

### Baseline Document (1 new)

- `.planning/phases/phase-34/34-W0-PRECHECK.md` — before/after counts, D-06 gate verdict, hand-off instructions for 34-B and 34-A

## Test Counts

**Total test() invocations added:** 23 (4 + 5 + 5 + 7 + 2)

**RED rails (must flip GREEN before Phase 34 exits):** 16
- Track B rails (12): resolveStaticPath /ssr + /output + /output/final; getRuntimeEnvironment /ssr + /ssr/*; all 7 output.html script-graph tests
- Track A rails (4): hasIgpuDev declaration; --ignore-gpu-blocklist on hasIgpuDev; --enable-gpu-rasterization on hasIgpuDev; renderMode logger call

**GREEN regression coverage (must stay GREEN throughout Phase 34):** 7
- normalizeRoutePath strips ?ssr=1
- getRuntimeEnvironment returns 'pi' for /output without ?ssr=1
- getRuntimeEnvironment returns 'server-ssr' for legacy ?ssr=1 (until hard-cut)
- getRuntimeEnvironment ARM UA defense-in-depth
- VAAPI features gated on hasVaapiEnabled or hasIgpu
- --use-gl=angle still present (h9 regression)
- __ttBeamerEffectiveRenderMode in ssr-stream-publisher

## All-Tests Run Delta

| Metric | Before Wave 0 | After Wave 0 | Delta |
|--------|--------------|--------------|-------|
| pass | 343 | 350 | +7 |
| fail | 0 | 16 | +16 |
| skip | 17 | 17 | 0 |

## Connection-Stability Suite — D-06 Hard Gate

| Metric | Before Wave 0 | After Wave 0 |
|--------|--------------|--------------|
| pass | 84 | 84 |
| fail | 0 | 0 |
| skip | 1 | 1 |

**D-06 gate: PASS.** Zero production source files were modified in Wave 0. Connection-stability suite is completely unaffected.

Note: invocation is `node --test "test/connection-stability/*.test.mjs"` (glob required; directory path fails with MODULE_NOT_FOUND in node:test).

## Deviations from Plan

### Plan said 80 pass / 0 fail for connection-stability; actual is 84 pass + 1 skip / 0 fail

**Found during:** Task 3
**Issue:** Plan's PRECHECK.md template said `pass: 80` for connection-stability. Actual count on this machine is 84 pass + 1 skip, 0 fail.
**Fix:** Recorded actual counts (84/1/0). The D-06 gate criterion is `fail: 0` — that is satisfied.
**Impact:** No issue. The gate passes.

### Plan said 14 RED / 6 PASS delta; actual is 16 RED / 7 PASS

**Found during:** Task 3
**Issue:** Plan's verification section stated 16 RED + 7 PASS across all 5 files (which matches), but the PRECHECK.md template said "+14 fail / +6 pass". The plan body's own verification section (line 328-332) says 16 RED + 7 PASS — that matches actual.
**Fix:** Recorded actual delta (+16 fail, +7 pass) in PRECHECK.md and this SUMMARY.
**Impact:** None — the plan's verification section was authoritative (23 total, 16 RED, 7 PASS) and matches exactly.

## Hand-Off Notes

### To Track B (34-B plan)
These 12 tests must flip RED→GREEN as part of Track B delivery:
- phase-34-route-split.test.mjs: 3 tests (resolveStaticPath /ssr + /output* → output.html)
- phase-34-runtime-env.test.mjs: 2 tests (getRuntimeEnvironment pathname=/ssr → server-ssr)
- phase-34-thin-output-script-graph.test.mjs: 7 tests (output.html creation + script graph)

Track B is NOT complete until all 12 tests show GREEN.

### To Track A (34-A plan)
These 4 tests must flip RED→GREEN as part of Track A delivery:
- phase-34-chrome-flags.test.mjs: 3 tests (hasIgpuDev decoupling + GL flag gating)
- phase-34-render-mode-probe.test.mjs: 1 test (renderMode logger call in ssr-stats handler)

Track A is NOT complete until all 4 tests show GREEN.

## Known Stubs

None. Wave 0 is test-only — no production code created, no stubs introduced.

## Threat Flags

None — Wave 0 introduces no new attack surface. All changes are test-only.

## Self-Check: PASSED

Files created:
- test/phase-34-route-split.test.mjs: FOUND
- test/phase-34-runtime-env.test.mjs: FOUND
- test/phase-34-chrome-flags.test.mjs: FOUND
- test/phase-34-thin-output-script-graph.test.mjs: FOUND
- test/phase-34-render-mode-probe.test.mjs: FOUND
- .planning/phases/phase-34/34-W0-PRECHECK.md: FOUND

Commits:
- aad4fad: FOUND (Task 1)
- bcfb7ac: FOUND (Task 2)
- cc59941: FOUND (Task 3)
