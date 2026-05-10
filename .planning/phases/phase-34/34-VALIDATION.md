---
phase: 34
slug: render-quality-thin-consumer
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — node test runner default |
| **Quick run command** | `node --test "test/connection-stability/*.test.mjs"` |
| **Full suite command** | `node --test "test/**/*.test.mjs"` |
| **Estimated runtime** | ~6s for full suite (non-live); ~60s with RUN_LIVE_TESTS=1 |

---

## Sampling Rate

- **After every task commit:** Run `node --test "test/**/*.test.mjs"` (must stay 0 fail)
- **After every plan wave:** Run `node --test "test/**/*.test.mjs"` + `RUN_LIVE_TESTS=1 node --test "test/connection-stability/*.test.mjs"`
- **Before `/gsd-verify-work`:** Full suite must be green; D-06 connection-stability must be 0 fail
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Plan | Task | Behavior under test | Automated command | Manual? |
|------|------|---------------------|-------------------|---------|
| W0 | 1 | Route-split + runtime-env contract tests written and produce expected RED count | `node --test test/phase-34-route-split.test.mjs test/phase-34-runtime-env.test.mjs` | no |
| W0 | 2 | Chrome-flags + thin-output + render-mode-probe contract tests written | `node --test test/phase-34-chrome-flags.test.mjs test/phase-34-thin-output-script-graph.test.mjs test/phase-34-render-mode-probe.test.mjs` | no |
| W0 | 3 | D-06 baseline captured; no production code touched | `node --test "test/**/*.test.mjs" 2>&1 \| tail -3` (compare to 34-W0-PRECHECK.md) | no |
| B  | 1 | Server route split + runtime-env classifier update | `node --test test/phase-34-route-split.test.mjs test/phase-34-runtime-env.test.mjs` (all GREEN) | no |
| B  | 2 | Thin output.html + output-audio-binder.js created | `node --test test/phase-34-thin-output-script-graph.test.mjs` (all GREEN) | no |
| B  | 3 | SSR navigation URL migration to /ssr (TWO sites) + body-marker fix | `grep -cE '127\.0\.0\.1:\$\{port\}/ssr' src/server/ssr-render-host.mjs` returns ≥2; `grep -cE '/output\?ssr=1' src/server/ssr-render-host.mjs` returns 0 | no |
| B  | 4 | D-06 hard-gate verification + Track-B manual smoketest | `RUN_LIVE_TESTS=1 node --test "test/connection-stability/*.test.mjs"` reports 80/0; manual smoketest of /, /output, /ssr documented | yes (smoketest part) |
| A  | 1 | Decouple hasIgpuDev from hasVaapiEnabled; add unconditional GL flags | `node --test test/phase-34-chrome-flags.test.mjs test/ssr-chromium-flags-merge.test.mjs test/phase-32-encoder-detect-vaapi.test.mjs` (all GREEN) | no |
| A  | 2 | ssr-stats renderMode telemetry log line | `node --test test/phase-34-render-mode-probe.test.mjs` (GREEN); + manual: server stdout shows `[ssr-stats] renderMode=...` lines | partial |
| A  | 3 | Force renderMode='gl' on /ssr + ban 2D-fallback on /ssr only | `grep -nE '__ttBeamerForceRenderMode' src/app/runtime/runtime-orchestration.js` ≥2; `grep -nE 'D-02 forbids 2D-fallback' src/app/runtime/viewport/runtime-projection-gl-renderer.js` ≥1 | no |
| A  | 4 | D-06 + D-05 manual visual smoketest | `RUN_LIVE_TESTS=1 node --test "test/connection-stability/*.test.mjs"` reports 80/0; D-05 visual smoketest documented in 34-A-D06-VERIFICATION.md | yes (D-05 visual) |
| V  | 1 | Validation map + verification matrix populated | `test -s .planning/phases/phase-34/34-VERIFICATION.md` exits 0; this very file > 100 lines | no |
| V  | 2 | HUMAN-UAT checklist written + operator sign-off captured | `test -s .planning/phases/phase-34/34-HUMAN-UAT.md` exits 0; sign-off section present | yes (operator sign-off) |
| V  | 3 | Final phase closure check (D-06 + summary count parity) | `RUN_LIVE_TESTS=1 node --test "test/connection-stability/*.test.mjs"` 80/0 + `node --test "test/**/*.test.mjs" 2>&1 \| tail -3` matches 34-A-SUMMARY post-Track-A counts | no |

---

## Wave 0 Requirements

- Render-mode probe contract test — assertion that `__ttBeamerEffectiveRenderMode()` is exposed and returns one of `webgl|webgl2|2d|auto` (Track A pre-req). **DELIVERED:** `test/phase-34-render-mode-probe.test.mjs` (W0 Task 2)
- Route-resolver contract test — assertion that `/output` resolves to thin HTML and `/ssr` resolves to full HTML (Track B pre-req). **DELIVERED:** `test/phase-34-route-split.test.mjs` (W0 Task 1)
- Thin-output script-graph snapshot — capture the minimum-viable script set so regressions are caught. **DELIVERED:** `test/phase-34-thin-output-script-graph.test.mjs` (W0 Task 2)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Banding-free SSR render | D-05 | Visual perception cannot be reliably automated for solid-color gradient banding | Operator plays known solid-color animation on gaming-PC desktop browser, confirms no banding. Logged in `34-HUMAN-UAT.md`. |
| Pi-hardware /output/ thin-mode CPU drop | Track B exit | Requires actual Pi hardware | Deferred until Pi available — `34-HUMAN-UAT.md §Deferred`. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (rows above)
- [x] Sampling continuity: every task in B and A has automated verify or routes through Wave 0 contracts
- [x] Wave 0 covers all rail tests for B and A
- [x] No watch-mode flags
- [x] Feedback latency < 90s (each verify command runs in < 60s)
- [x] `nyquist_compliant: true` set in frontmatter (update on save — flip from false to true)
- [x] D-06 hard gate: `test/connection-stability/**` green at 34-B Task 4 AND 34-A Task 4 AND 34-V Task 3

**Approval:** PASS — populated 2026-05-10 by 34-V-PLAN.md Task 1.
