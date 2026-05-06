---
phase: 32
slug: ssr-stream-performance-connection-stability
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in node 20+) |
| **Config file** | none — runs via `node --test` |
| **Quick run command** | `node --test "test/phase-32-*.test.mjs"` |
| **Full suite command** | `node --test "test/**/*.test.mjs"` |
| **Estimated runtime** | ~5 sec quick / ~25 sec full |
| **Baseline (post-h46)** | 215 total / 211 pass / 0 fail / 4 skipped |

---

## Sampling Rate

- **After every task commit:** Run `node --test "test/phase-32-*.test.mjs"` (Phase-32-only)
- **After every plan wave:** Run `node --test "test/**/*.test.mjs"` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green; Phase-29 baseline 40/40 still green inside the total
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Plan-checker fills this matrix after planner creates 32-NN-PLAN.md files.
> Each task gets one row. Test commands MUST be grep-able / programmatic.

| Task ID | Plan | Wave | Block | Test Type | Automated Command | Status |
|---------|------|------|-------|-----------|-------------------|--------|
| 32-NN-MM | NN | M | A/B | unit/integration | `{cmd}` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 establishes measurement infrastructure BEFORE patching.

- [ ] `test/phase-32-fps-baseline.test.mjs` — measures current SSR fps + stream fps via mediasoup `consumer.getStats()` + CDP performance domain. Captures baseline number for comparison.
- [ ] `test/phase-32-cold-boot-reconnect-repro.test.mjs` — deterministic repro of cold-boot reconnect storm by spinning up server + simulating Pi receiver consume-attempt before producer-ready.
- [ ] Test scaffolding for Wave-1 fixes (FPS lift, reconnect-storm-fix).
- [ ] Helper: `test/helpers/ssr-test-harness.mjs` — boots a real SSR server in test mode, returns mediasoup router + producer/consumer factories.

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Operator-perceived "real-time" align-mode drag fluidity | Subjective UX, must be felt by operator | Boot full server → /output/ → enter align-mode → drag handles → confirm "smooth, no lag" sensation |
| Pi VC4 actual decode-budget at 1080p@60 | Pi hardware required, not available in CI | Run on Pi, monitor CPU + frame-drops via `videoEl.getVideoPlaybackQuality()` |

---

## FPS Lift Validation (Block A)

| Acceptance criterion | Test method | Pass threshold |
|----------------------|-------------|----------------|
| SSR fps measurable via stats endpoint | unit test calls `getStats()` and parses framesPerSecond | endpoint exists, returns Number |
| Stream fps ≥ 30 (floor) under typical load | integration test boots server with default board, measures via consumer.getStats() | mean fps ≥ 30 over 5s window |
| Stream fps ≥ 45 with VAAPI on Raptor Lake-P | conditional test (skip if VAAPI absent) | mean fps ≥ 45 over 5s window |
| Stream fps cap setting takes effect | unit test: set cap=30, observe stats; set cap=60, observe stats | cap setting changes output rate |
| Align-mode boost auto-bumps fps during drag | integration test: enter align-mode, observe stats vs steady-state | fps ≥ cap-max during drag |
| Xvfb -fakescreenfps flag is set in spawn args | unit test reads spawn args | args contain "-fakescreenfps" |
| Encoder detect probes Chromium VAAPI | unit test: stub libva path, expect detected="vaapi" | result.encoder == "vaapi" when libva present |
| Settings persist to global-defaults | integration test: POST setting, restart, GET setting | persisted value matches POSTed |

---

## Connection Stability Validation (Block B)

| Acceptance criterion | Test method | Pass threshold |
|----------------------|-------------|----------------|
| `/api/ssr/ready` endpoint exists and responds | unit test: GET /api/ssr/ready before producer up → 200 with ready:false | endpoint returns JSON {ready: bool} |
| Pi waits for ready=true before consume() | unit test mocks ssr-ready=false then ssr-ready=true | consume not called until ready |
| Forever-retry: no MAX_RECONNECT_ATTEMPTS hard cap | grep test: file does NOT contain `MAX_RECONNECT_ATTEMPTS = 10` | regex absent |
| Adaptive backoff schedule | unit test: simulate failures, assert delays 1s/2s/5s/10s/30s/30s/30s | delay sequence matches |
| Backoff resets after stable connection ≥30s | unit test: stable for 30s → next failure delay = 1s | first delay after stable == 1000ms |
| Cold-boot reconnect-storm does NOT exhaust state | repro test: cold-start server, simulate Pi consume before producer | Pi recovers within 10s |
| Server-side proactive boot-cleanup | unit test: leave stale state, boot, verify cleanup | no dangling consumers/transports |
| Pi-side "RECONNECTING — Xs" overlay visible | unit test: trigger reconnect, query DOM | overlay element exists, countdown updates |
| Overlay disappears after stable ≥5s | integration test | overlay removed within 5500ms |

---

## Goal-Backward Verification

Phase exit criteria (from ROADMAP.md):
1. Stream + SSR FPS ≥40 (idealer Range 50-60) on Nemesis Lockdown Board A
2. Operator-perceived align-mode drag = "real-time"
3. Cold-boot server + Pi-receiver-connect stable ≥10 repetitions without stuck-Reconnect
4. Pi-Reload during running stream stable ≥10 repetitions without server-restart-need
5. Test-Suite weiterhin grün; new tests for FPS-floor + reconnect-repro

| Exit criterion | Validation source | Acceptance |
|----------------|-------------------|------------|
| 1. Stream FPS ≥40 | integration test measures over 5s window | mean ≥ 40 |
| 2. Real-time align-drag | manual UAT (subjective) | operator confirms |
| 3. Cold-boot stable ×10 | automated repro test loop | 10/10 connect within 10s |
| 4. Pi-reload stable ×10 | automated test simulates page reload | 10/10 reconnect without server restart |
| 5. Tests green | full suite | 215+ total, 0 fail |
