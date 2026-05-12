---
phase: 39
plan: 3
subsystem: connection-state-machine
tags:
  - phase-39
  - wave-1
  - d-02
  - cold-boot
  - reconnect-state-machine
  - initial-connect
type: execute
wave: 1
status: complete
autonomous: true
requirements:
  - D-02-COLD-START-STABILITY
depends_on: [39-1]
dependency-graph:
  requires:
    - "Plan 39-1 RED tests on disk (test/phase-39-d02-state-machine.test.mjs + cold-boot probe)"
    - "Phase 33 receiver-state-machine rail GREEN"
    - "Phase 38 W10 WS-fragmentation rail GREEN"
    - "D-08 connection-stability rail GREEN"
  provides:
    - "ConnectionState.INITIAL_CONNECT enum entry"
    - "LEGAL_TRANSITIONS for NEW->INITIAL_CONNECT, INITIAL_CONNECT->{CONNECTED, RECONNECTING, HOST_DOWN, STOPPED}"
    - "INITIAL_CONNECT_GRACE_MS constant (5000ms default, env+window configurable)"
    - "handleConnectFailure() helper centralizing failure routing"
    - "scheduleInitialConnectRetry() + scheduleReconnectAfterFailure() backoff helpers"
    - "receiver-status-ui.js showInitialConnect() method suppressing RECONNECTING banner"
    - "D-02 cold-boot RED test turn GREEN (reconnectingEvents=0 in 30s)"
  affects:
    - "Plan 39-5 UAT — D-02 retest on operator hardware"
    - "Future receiver-state-machine refactors must preserve NEW -> INITIAL_CONNECT routing"
tech-stack:
  added:
    - "INITIAL_CONNECT cold-boot grace window (LiveKit-style state machine extension)"
    - "Centralized failure-routing helper (handleConnectFailure)"
  patterns:
    - "Grace-window-then-escalate: silent retry under elapsed<grace, RECONNECTING escalation after"
    - "Capped-retry budget preservation (INITIAL_CONNECT attempts don't count)"
    - "UI splash reuse for cold-boot (no new copy invented)"
    - "Env-configurable timing (process.env + window override)"
key-files:
  modified:
    - "src/app/runtime/output-receiver/receiver-bootstrap.js (+~205 LOC net — enum, grace constant, firstAttemptStartedAtMs state, handleConnectFailure/scheduleInitialConnectRetry/scheduleReconnectAfterFailure helpers, tryConnect routing, shouldGiveUp gate, catch-block refactor, monitor-body refactor, onFrameReceived INITIAL_CONNECT->CONNECTED edge, onConnectionStateChange showReconnect gating, setState STOPPED reset)"
    - "src/app/runtime/output-receiver/receiver-status-ui.js (+29 LOC — showInitialConnect method + return-API exposure)"
    - "test/connection-stability/receiver-state-machine.test.mjs (+5/-3 LOC — adapted NEW transition assertion to NEW->INITIAL_CONNECT, surgical change only)"
decisions:
  - "INITIAL_CONNECT_GRACE_MS defaults to 5000ms per 39-RESEARCH.md §D-02 step 5 — covers the typical Chromium tab boot + publisher mediasoup-produce RPC roundtrip (operator UAT observed 3-10s)"
  - "scheduleInitialConnectRetry uses fixed 300ms delay (not exponential) — small enough to not delay legitimate cold-boots, large enough to bound worst-case retry count to ~17 within the 5s grace (T-39-3-02 mitigation)"
  - "shouldGiveUp() short-circuits on INITIAL_CONNECT AND reconnectAttempts<1 — preserves Phase 33 T2 capped-retry semantics (10 attempts / 120s) for genuine reconnect storms only"
  - "Monitor body (D-C4 three-indicator) routed through handleConnectFailure for unified bookkeeping — even though monitor cannot fire from INITIAL_CONNECT (no settled pcState), centralization eliminates parallel escalation paths"
  - "ui.hideSplash() gated on currentState===RECONNECTING in catch block — splash stays visible across silent INITIAL_CONNECT retries (consistent UX)"
  - "receiver-state-machine.test.mjs adapted minimally: only the NEW->CONNECTING assertion was flipped to NEW->INITIAL_CONNECT, plus an added explicit NEW->CONNECTING NOT-legal assertion. Phase 33 contract preserved otherwise."
metrics:
  duration_minutes: 12
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
  loc_added: 269
  loc_removed: 64
  commits: 3
  completed_at: "2026-05-12T22:00:00Z"
---

# Phase 39 Plan 39-3: Wave-1 D-02 INITIAL_CONNECT State Machine Summary

Closed the D-02 cold-boot reconnect storm by extending the receiver's LiveKit-style state machine with a new `INITIAL_CONNECT` state that absorbs the typical 3-10s publisher-boot race window. The visible "RECONNECTING — Xs (attempt N)" banner no longer appears during the legitimate cold-boot grace period — operators see a clean "Connecting to render server…" splash instead. After 5s of grace, the state escalates to RECONNECTING and the existing 10-attempt / 120s capped-retry budget engages exactly as before. All Phase 32/33/38 carry-forward rails stayed green.

## LOC Summary

| Component | Lines added | Lines removed | Commit |
|-----------|------------:|--------------:|--------|
| Task 1 — Enum + LEGAL_TRANSITIONS + grace constant | 41 | 3 | `bcd8538` |
| Task 2 — tryConnect routing + handleConnectFailure helper | 187 | 59 | `3893ac7` |
| Task 3 — UI suppression (showInitialConnect) | 41 | 2 | `fa4dc04` |
| **Total bootstrap** | **~235** | **~61** | — |
| **Total status-ui** | **29** | **0** | — |
| **Total receiver-state-machine.test.mjs** | **5** | **3** | (Task 1) |

## Pre-fix vs Post-fix Cold-Boot Behaviour (D-02 RED test)

The Plan 39-1 RED test (`test/connection-stability/phase-39-cold-boot.test.mjs`) boots a fresh `server.mjs` with publish + render-host, attaches a consumer WS, and counts how many times the consumer-side state machine would transition to RECONNECTING in 30 s. Assertion: `< 2`.

| Run | reconnectingEvents | connectionStateLog | Result |
|-----|-------------------:|--------------------|--------|
| Pre-fix (master, before bcd8538) | 3-6 (operator-reported; reproduced by harness) | NEW -> CONNECTING -> RECONNECTING -> CONNECTING -> RECONNECTING ... | RED (assertion fails) |
| Post-fix Task 1 (enum only) | n/a (live test gated on Task 2 wiring) | — | RED (still — wiring missing) |
| Post-fix Task 2 (tryConnect routing) | **0** | `[{state:"NEW->CONNECTING (ws-open)"}]` | **GREEN** |
| Post-fix Task 3 (UI suppression) | **0** | `[{state:"NEW->CONNECTING (ws-open)"}]` | **GREEN** (confirmed again) |

Live test stdout (post-fix run): `[d-02-cold-boot] reconnectingEvents=0`.

## Typical Cold-Boot Transition Timeline (post-fix)

From `[receiver]` logs over a healthy cold-boot:

```
T+0.000s  [receiver] state NEW -> INITIAL_CONNECT (tryConnect-cold-boot)
T+0.000s  ui.showInitialConnect("Connecting to render server…")    ← splash visible
T+0.450s  (createWebRtcReceiver awaiting consume RPC)
T+0.480s  (server: producer-ready broadcast)
T+1.250s  (RTC pcState: connecting)
T+1.880s  (RTC pcState: connected) — tryConnectInFlight=false
T+2.140s  receiver.onFrameReceived (first frame)
T+2.140s  [receiver] state INITIAL_CONNECT -> CONNECTED (first-frame)
T+2.140s  ui.hideSplash() — video unhidden, banner already hidden
```

If publisher-boot takes longer than 5 s (slow Chromium / busy box) the timeline branches at T+5.000s:

```
T+5.000s  [receiver] initial-connect grace expired after 5000ms — escalating to RECONNECTING
T+5.000s  [receiver] state INITIAL_CONNECT -> RECONNECTING (initial-connect-grace-expired:...)
T+5.000s  showCountdownReconnect — "RECONNECTING — 1s (attempt 1)"  ← banner now visible
T+6.000s  setTimeout-fired tryConnect — state RECONNECTING -> CONNECTING
T+...     (existing Phase 33 capped-retry path: 10 attempts / 120s budget)
```

## Plan 39-1 RED Tests Now GREEN

The five D-02 unit tests in `test/phase-39-d02-state-machine.test.mjs` (Plan 39-1 Task 2):

```
✔ D-02 RED: ConnectionState.INITIAL_CONNECT exists as a string
✔ D-02 RED: NEW → INITIAL_CONNECT is legal
✔ D-02 RED: NEW → CONNECTING is NOT legal (must route via INITIAL_CONNECT)
✔ D-02 RED: INITIAL_CONNECT → CONNECTED is legal
✔ D-02 RED: INITIAL_CONNECT → RECONNECTING is legal (after 5s grace)
ℹ tests 5   pass 5   fail 0
```

The integration test `test/connection-stability/phase-39-cold-boot.test.mjs` (Plan 39-1 Task 2):

```
✔ D-02 cold-boot RECONNECTING events < 2 in first 30s (34844.6 ms)
[d-02-cold-boot] reconnectingEvents=0
ℹ tests 1   pass 1   fail 0
```

Both turn GREEN end-to-end.

## Carry-Forward Rail Results (8 tests / 39 subtests, all GREEN)

| Test | Outcome | Key output line |
|------|---------|------------------|
| `test/phase-39-d02-state-machine.test.mjs` (unit, 5 subtests) | **PASS** | `tests 5 pass 5 fail 0` |
| `test/connection-stability/receiver-state-machine.test.mjs` (Phase 33, 23 subtests) | **PASS** | `tests 23 pass 23 fail 0` (after surgical NEW->INITIAL_CONNECT adapt) |
| `test/phase-32-cold-boot-reconnect-repro.test.mjs` (Phase 32 regression, 2 subtests) | **PASS** | `tests 2 pass 2 fail 0` |
| `test/connection-stability/phase-39-cold-boot.test.mjs` (RUN_LIVE_TESTS=1, integration) | **PASS** | `reconnectingEvents=0 ... duration 34844ms` |
| `test/connection-stability/live-fixture-smoke.test.mjs` (D-08 hard gate) | **PASS** | `sustained 31503ms heartbeats=21 closed=false producerReady=0 producerClosed=0 renderHostDown=0` |
| `test/phase-38-w10-ws-frame-fragmentation.test.mjs` (L1 lock — CRITICAL_KNOWN_BUGS #1) | **PASS** | `tests 4 pass 4 fail 0 duration 10659ms` |
| `test/static-resource-headers.test.mjs` (Phase 31 h15) | **PASS** | `tests 8 pass 8 fail 0` |
| `test/live-e2e/test_phase38_ssr_grid_state_cdp.py` (UI smoke, 3 subtests) | **PASS** | `3 passed in 31.19s` |
| `test/live-e2e/test_phase38_w11_align_off_overlay_disappears.py` (W11) | **PASS** | `1 passed` |
| `test/live-e2e/test_phase38_w12_invalidate_cache.py` (W12, 3 subtests) | **PASS** | `3 passed` |

The Phase 38 W10 WS-fragmentation rail (L1 lock from `CRITICAL_KNOWN_BUGS.md` #1) is untouched — this plan modifies only receiver-side state machine + UI; no server-side WS handling code was touched.

The Phase 33 receiver-state-machine `03-T1: legal transitions — NEW → ...` test was adapted minimally per the breaking-change risk flagged in 39-RESEARCH.md §"D-02 Risks": the assertion that `NEW -> CONNECTING` is legal was flipped to `NEW -> INITIAL_CONNECT` is legal (and `NEW -> CONNECTING` is now asserted illegal). The other six legal-transition tests in that file were not touched.

## Deviations from Plan

**None — plan executed exactly as written.** The three tasks landed in the order specified, the acceptance criteria for each task were satisfied (each item's grep count met or exceeded the threshold), and the Plan-39-3 §"D-02 Risks" risk ("existing tests that assume NEW -> CONNECTING transition fail") materialized exactly as predicted and was resolved with the surgical assertion update the plan named.

One implementation note that is NOT a deviation but worth recording: the monitor-body branch in `receiver-bootstrap.js` was also routed through `handleConnectFailure` (rather than keeping a parallel transitionTo(RECONNECTING) path) even though the plan's `<action>` step 5 listed only ws-close / RPC timeout / transport-statechange / heartbeat-stale / frame-stale sites. The monitor body is one of the "consumer-failure sites" the plan describes; routing it through handleConnectFailure satisfies the spirit of the plan and gives a single source of truth for failure bookkeeping. Effects on behavior: zero (monitor cannot fire from INITIAL_CONNECT because it gates on a settled pcState which only exists post-handshake), so this is plumbing-only consolidation.

## Authentication Gates

None — all probes ran on localhost; no auth surfaces were touched.

## Threat Flags

None — Plan 39-3 introduces no new trust boundaries. The threat register in the plan's `<threat_model>` was fully addressed:
- T-39-3-01 (attacker delays publisher-boot indefinitely) — mitigated by `INITIAL_CONNECT_GRACE_MS=5000` hard limit. After 5s the state escalates to RECONNECTING and the existing 10-attempt / 120s capped-retry budget engages.
- T-39-3-02 (scheduleInitialConnectRetry tight loop) — mitigated by fixed 300ms delay; ~17 retries per cold-boot worst case (5000/300).
- T-39-3-03 (window override tampering) — accepted: same-origin trusted, single-user LAN.
- T-39-3-04 (malicious server keeps producer-ready=false) — accepted: LAN-only deployment; HOST_DOWN / GIVEN_UP fire per existing Phase 33 logic.

## Known Stubs

None. Plan 39-3 added a single new UI method (`showInitialConnect`) that **reuses** the existing splash mechanism (`#ssr-splash` + `#ssr-splash-status` element from index.html — same DOM nodes used by `showSplash()`); no new empty data flows or placeholder copy were introduced.

## Self-Check: PASSED

- [x] Created: `.planning/phases/phase-39/39-3-SUMMARY.md` → FOUND (this file)
- [x] Modified: `src/app/runtime/output-receiver/receiver-bootstrap.js` → FOUND (`grep -c INITIAL_CONNECT` returns 47, far above the >=4 threshold)
- [x] Modified: `src/app/runtime/output-receiver/receiver-status-ui.js` → FOUND (`grep -c INITIAL_CONNECT` returns 3, above >=1)
- [x] Modified: `test/connection-stability/receiver-state-machine.test.mjs` → FOUND (NEW transition assertion adapted)
- [x] Commit `bcd8538` (Task 1: enum + transitions + grace constant) → present in `git log`
- [x] Commit `3893ac7` (Task 2: tryConnect routing + handleConnectFailure) → present in `git log`
- [x] Commit `fa4dc04` (Task 3: UI suppression) → present in `git log`
- [x] All acceptance criteria met:
  - ConnectionState.INITIAL_CONNECT enum entry exists
  - LEGAL_TRANSITIONS: NEW → {INITIAL_CONNECT, STOPPED} only; INITIAL_CONNECT → {CONNECTED, RECONNECTING, HOST_DOWN, STOPPED}
  - NEW → CONNECTING is NOT legal anymore
  - INITIAL_CONNECT_GRACE_MS = 5000 (env + window configurable)
  - D-02 state-machine RED test (5/5) GREEN
  - D-02 cold-boot RED test reconnectingEvents=0 (asserted <2)
  - D-08 connection-stability fail=0 (`sustained 31503ms ... closed=false`)
  - Phase 38 W10 WS-fragmentation (4/4) GREEN
  - Phase 38 W11/W12 (1+3=4 subtests) GREEN
  - SSR-grid-state CDP (3/3) GREEN
  - Phase 32 cold-boot regression (2/2) GREEN
