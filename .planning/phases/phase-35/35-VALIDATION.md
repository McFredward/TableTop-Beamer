---
phase: 35
slug: thin-output-refactor-align-banding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (JS)** | Node.js built-in `node:test` |
| **Framework (Python)** | `pytest` (NEW in Wave-0 — D-05) |
| **Config file** | none — invoked directly |
| **Quick run command** | `node --test "test/**/*.test.mjs"` |
| **Full suite command** | `RUN_LIVE_TESTS=1 node --test "test/**/*.test.mjs" && python -m pytest test/live-e2e/ -v` |
| **Live E2E command** | `python -m pytest test/live-e2e/ -v` |
| **Connection-stability hard gate** | `RUN_LIVE_TESTS=1 node --test test/connection-stability/` |
| **Estimated runtime (full)** | ~180 seconds (60s JS + 120s live-e2e Playwright) |

---

## Sampling Rate

- **Per task commit:** `node --test "test/**/*.test.mjs"` (JS unit/contract suite)
- **Per task commit (touches `ssr-render-host.mjs`, `ssr-stream-publisher.mjs`, `ssr-webrtc-signaling.mjs`, `receiver-bootstrap.js`, `runtime-env.js`):** ALSO run `RUN_LIVE_TESTS=1 node --test test/connection-stability/` (D-06 hard rule)
- **Per wave merge:** Full JS suite + `python -m pytest test/live-e2e/`
- **Before `/gsd-verify-work`:** Full suite + manual visual UAT must be green
- **Max feedback latency:** 60 seconds (JS quick) / 180 seconds (full)

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| D-01-A1 | `bootAlignMode` exported from `output-align-mode.js` | unit | `node --test test/phase-35-bootalignmode-shape.test.mjs` | ❌ W0 | ⬜ pending |
| D-01-A2 | Dashboard align-mode toggle still renders handles after refactor | live integration | `python -m pytest test/live-e2e/test_phase35_dashboard_alignmode.py` | ❌ W0 | ⬜ pending |
| D-01-A3 | output.html align-mode toggle renders handles | live integration | `python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py::test_handles_visible` | ❌ W0 | ⬜ pending |
| D-02-B1 | `bootOutputLiveSync` exports + emits onAnimationStart on mock WS | unit | `node --test test/phase-35-output-live-sync.test.mjs` | ❌ W0 | ⬜ pending |
| D-02-B2 | `output-audio-binder.js` consumes new live-sync (callback wiring) | unit | same file | ❌ W0 | ⬜ pending |
| D-02-B3 | Live: audio plays when start-animation arrives via WS | live integration | extend `test_output_smoke` | ❌ W0 | ⬜ pending |
| D-03-C1 | Bayer dither produces non-uniform pixel values for solid color | unit | `node --test test/phase-35-bayer-dither.test.mjs` | ❌ W0 | ⬜ pending |
| D-03-C1-V | Visual: solid-color animation has no visible bands | manual | operator UAT — captured in `35-HUMAN-UAT.md` | ❌ W0 | ⬜ pending |
| D-04 | FPS impact of dithering ≤ 5 fps at 1080p@30fps | live measurement | `python -m pytest test/live-e2e/test_phase35_fps_benchmark.py` | ❌ W0 | ⬜ pending |
| D-05-a | `videoReadyState === 4` within 10s | live integration | `test_output_smoke::test_ready_state` | ❌ W0 | ⬜ pending |
| D-05-b | `videoCurrentTime > 5` after 8s wait | live integration | `test_output_smoke::test_current_time` | ❌ W0 | ⬜ pending |
| D-05-c | body `backgroundColor === rgb(0, 0, 0)` | live integration | `test_output_smoke::test_bg_color` | ❌ W0 | ⬜ pending |
| D-05-d | Zero `health ping failed` in server log | live integration | `test_output_smoke::test_server_log_clean` | ❌ W0 | ⬜ pending |
| D-05-e | Handles exist + visible when alignMode=true | live integration | `test_output_smoke::test_handles_visible` | ❌ W0 | ⬜ pending |
| D-05-f | Pointer-drag triggers align-corner-drag mutation | live integration | `test_output_smoke::test_drag_triggers_mutation` | ❌ W0 | ⬜ pending |
| D-06 | `test/connection-stability/**` stays 72/0/13 | live integration | `RUN_LIVE_TESTS=1 node --test test/connection-stability/` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/with_server.py` — server-spawn helper (NEW; subprocess wrapper around `node server.mjs`, modeled on `test/connection-stability/_harness.mjs:bootServer()`)
- [ ] `test/live-e2e/conftest.py` — shared fixtures for Playwright + Xvfb + system Chrome (`/opt/google/chrome/chrome`)
- [ ] `test/live-e2e/test_phase35_alignmode_smoke.py` — D-05 a–f assertions
- [ ] `test/live-e2e/test_phase35_dashboard_alignmode.py` — dashboard regression for D-01-A2
- [ ] `test/live-e2e/test_phase35_fps_benchmark.py` — D-04 FPS measurement (extends after C1 lands)
- [ ] `test/phase-35-bootalignmode-shape.test.mjs` — D-01-A1 unit test (RED before refactor)
- [ ] `test/phase-35-output-live-sync.test.mjs` — D-02-B1/B2 unit tests (RED before extract)
- [ ] `test/phase-35-bayer-dither.test.mjs` — D-03-C1 unit test (RED before C1)
- [ ] CI integration: `pytest test/live-e2e/` invocation step after `node --test`, before `verify-work`
- [ ] Flake-handling per A5: 3× retry inside test + opt-in skip-on-flake under `WAVE0_FLAKE_TOLERANCE=1`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No visible step-bands on known solid-color animation | D-03-C1-V | Visual perception cannot be reliably auto-asserted at this fidelity (Phase 34 demonstrated 2M vs 32M screenshots looked "the same" to pixel-diff but operator-reported banding). | Operator on gaming-PC desktop browser, trigger known solid-color fade animation, take before/after screenshots, compare visually. Documented in `35-HUMAN-UAT.md`. |
| Pi-hardware visual UAT | D-08 | Pi 4 hardware not always accessible; same pattern as Phase 33/34. | Documented in `35-HUMAN-UAT.md` as `status: deferred`. |

---

## Regression Tests That Must Stay Green (D-06 hard gate)

- `test/connection-stability/*.test.mjs` (10 files, 72/0/13 ratio per CONTEXT.md)
- `test/ssr-receiver-disconnect-detection.test.mjs`
- `test/phase-32-hotfix-regression.test.mjs`
- `test/phase-32-xvfb-fakescreenfps.test.mjs`
- `test/phase-34-*.test.mjs` (24 GREEN per Phase 34 closure addendum)

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`scripts/with_server.py`, `test/live-e2e/`, RED unit tests for D-01/D-02/D-03)
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
