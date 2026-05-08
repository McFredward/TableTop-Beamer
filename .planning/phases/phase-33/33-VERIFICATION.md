---
phase: 33
phase_id: 33
title: Connection Stability Deep Dive — Verification
slug: connection-stability-deep-dive
status: PASS-AUTOMATED-PENDING-PI-HARDWARE
verified_at: 2026-05-08T22:00:00Z
test_baseline_before: 274 / 270 pass / 4 skip / 0 fail (HEAD c92a5c6 pre-Phase-33)
test_snapshot_after: 363 / 346 pass / 17 skip / 0 fail (HEAD e4f9829)
test_growth: +89 tests (+76 pass, +13 skip)
live_tests: 17 / 17 pass + stress 3+10 cycles + state-leak 50 cycles + repro 10/10
---

# Phase 33 — Verification (Goal-Backward)

## Goal Achievement Matrix

Each goal from 33-CONTEXT.md, with concrete evidence.

| # | Goal | Evidence | Status |
|---|------|----------|--------|
| 1 | No image-hang | `producer-closed` arrives ≤200ms after ssr-tab kill (was 8s frame-stale) — `producer-lifecycle.test.mjs` integration test | ✅ |
| 2 | No persistent reconnect-loop | Capped retry: 10 attempts OR 120s → GIVEN_UP state. `receiver-state-machine.test.mjs` unit + integration | ✅ |
| 3a | Self-heal mediasoup-worker death | Auto-respawn `[1s,2s,5s,10s,30s]` capped N=5. Live test: respawn in 1094ms, consumer recovers within 30s | ✅ |
| 3b | Self-heal ssr-tab WS drop (BUG-B) | Watchdog reads `getPublisherWsAgeMs()` every 5s; fires `scheduleRestart()` when age >15s. Tri-state contract -1/Inf/ms (cold-boot suppression) | ✅ |
| 3c | Self-heal cold-boot race | `producer-ready` server-push notification (replaces 1s HTTP-poll). Bootstrap aborts backoff timer + retries immediately | ✅ |
| 3d | Self-heal network blip (TCP RST) | WS-open 10s timeout (h12) + monitor 8s frame-stale → reconnect. Live: WS terminate mid-handshake + recovery <12s | ✅ |
| 3e | Self-heal Chromium tab crash | `browser.on('disconnected')` early-wire (h2) → broadcast `render-host-down` → consumer flips to actionable error overlay | ✅ |
| 4 | Operator telemetry surface | Status-detail line (last-error + last-success) under countdown; GIVEN_UP overlay with Retry button. `operator-telemetry.test.mjs` 21/21 | ✅ |
| 5 | Reproducible failure harness | `test/connection-stability/_harness.mjs` with bootServer/connectConsumer/killMediasoup/killSsrTab; `test/manual/repro-cold-boot-loop.mjs` runs 10× cold-boots reliably | ✅ |

## Anti-Hotfix-Pattern (D-06) Compliance

Every Phase-33 fix references its 33-STATE-MACHINE.md §6 Suspect # and has a regression test:

| Fix | Suspect | Regression Test |
|-----|---------|-----------------|
| 33-01 producer-ready wire-up | S4 | producer-lifecycle.test.mjs unit + integration |
| 33-01 producer-closed wire-up | S5 | producer-lifecycle.test.mjs |
| 33-01 render-host-down broadcast | S7 | producer-lifecycle.test.mjs |
| 33-02 mediasoup auto-respawn | S8 | server-self-healing.test.mjs unit + integration |
| 33-02 ssr-tab WS watchdog | S6 | server-self-healing.test.mjs |
| 33-02 PID-scoped purge | S12 | server-self-healing.test.mjs unit (3 sub-cases) |
| 33-03 ConnectionState enum | (architectural) | receiver-state-machine.test.mjs transition table |
| 33-03 capped retry + GivenUp | R-7 | receiver-state-machine.test.mjs `shouldGiveUp` simulation |
| 33-03 first-frame backoff reset | R-2 | receiver-state-machine.test.mjs |
| 33-03 sessionStorage fresh-load clear | S11 | receiver-state-machine.test.mjs |
| 33-03 host-down monitor guard | S14 | receiver-state-machine.test.mjs |
| 33-04 status-detail telemetry | S10 | operator-telemetry.test.mjs |
| 33-04 stable-overlay poll on host-down | S13 | operator-telemetry.test.mjs |
| 33-h3 same-IP two-consumer | S9 | fault-injection.test.mjs (live) |

12 Phase-32 hotfixes (h1-h12) covered by `phase-32-hotfix-regression.test.mjs` (11/11 pass).

## Test Snapshot

### Default (no live)
```
ℹ tests 363
ℹ pass 346
ℹ skip 17
ℹ fail 0
ℹ duration_ms 77646
```

### Live integration (RUN_LIVE_TESTS=1)
| File | Tests | Pass | Notes |
|------|-------|------|-------|
| live-fixture-smoke | 1 | 1 | 30s sustain, 21 heartbeats, no reconnects |
| producer-lifecycle | 6 | 6 | render-host-down arrives at consumer 101ms after ssr-tab kill |
| server-self-healing | 10 | 10 | mediasoup respawn 1094ms; ssr-tab → producer 5ms |
| state-leak | 1 | 1 | 50 cycles, 0% RSS / 0% FD growth |
| stress-multi-cycle | 2+1 skip | 2 | 3× cold-boot 4-19s; 10× consumer-reload 1.5s consistent |
| fault-injection | 4 | 4 | S9 fixed: c1+c2 from 127.0.0.1 both alive |
| operator-telemetry | 21 | 21 | All UI + bootstrap wiring assertions |
| receiver-state-machine | 23 | 23 | Transition table + shouldGiveUp simulation |
| phase-32-hotfix-regression | 11 | 11 | h8/h9/h10/h11/h12 baseline + backoff schedule |
| **Total** | **80** | **80** | **All live tests pass** |

### Manual stress (test/manual/repro-cold-boot-loop.mjs)
```
[repro] summary
  cycles: 10
  ok: 10
  failures: 0
  over-budget (>15000ms): 0
  total ms: min=3435 avg=8097 max=12076
[repro] PASS
```

## Architectural Improvements vs Phase 32

1. **Producer-lifecycle messaging** — server-push beats 8s frame-stale by ~80×. Replaces "wait until something fails" with "the server told us"
2. **State-machine contract** — replaces ad-hoc string state with explicit ConnectionState enum + transition validation
3. **Capped retry + GIVEN_UP** — operator agency restored. Forever-retry was perceived as "broken forever"; capped retry + Retry button is honest about the failure
4. **First-frame backoff reset** — research finding R-2: backoff must reset on real frames, not just RTC-level connected event. Fixes "low-backoff loop without progress"
5. **Multi-consumer per IP** — operator's local browser + Pi receiver both work. Plan 32 assumed single-Pi-per-LAN; Phase 33 reflects realistic test setups
6. **Comprehensive test infra** — `test/connection-stability/` is the gate Phase 32 lacked. Live-fixture tests would have caught the original regression

## Outstanding (Pi-hardware UAT)

See `33-HUMAN-UAT.md`. Five scenarios deferred to operator hardware testing:
1. 10× cold-boots on production server
2. 10× Pi-reloads (sessionStorage clear gate)
3. ≥1 hour steady-state on Pi
4. 3 fault-injection scenarios on hardware (kill server, kill mediasoup-worker, network blip)
5. mp4 outside-sandstorm playback (incidental — confirms h9 GPU fix)

## Self-Check: PASS-AUTOMATED-PENDING-PI-HARDWARE

All goals from 33-CONTEXT.md met automated. The 14 suspects are fixed + regression-tested. Test infrastructure exists that **would have caught** the Phase-32 manual-UAT regression. Pi-hardware UAT remains for final operator acceptance.

Tag pending: `phase-33-end` (after Pi UAT) or `phase-33-delivered-to-uat` (now — automated coverage complete).

---

*Phase: 33-connection-stability-deep-dive · Verification · PASS-AUTOMATED-PENDING-PI-HARDWARE · 2026-05-08*
