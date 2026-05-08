---
phase: 33
phase_id: 33
title: Connection Stability Deep Dive
slug: connection-stability-deep-dive
status: PLANNING
test_board: nemesis-lockdown-a
started: 2026-05-08T08:30:00Z
inputs:
  - .planning/phases/phase-33/33-CONTEXT.md
  - .planning/phases/phase-33/33-RESEARCH.md
  - .planning/phases/phase-33/33-STATE-MACHINE.md
  - .planning/phases/phase-32/32-CLOSURE-ADDENDUM.md
  - .planning/debug/phase-32-connect-baseline-p31.md
  - .planning/debug/phase-32-connect-head-trace.md
  - .planning/debug/phase-32-connection-comprehensive-audit.md
tags: [webrtc, mediasoup, reconnect, stability, contract-first, livekit-pattern, suspect-driven]
---

# Phase 33 — Plan

## Goal

Make the SSR → Pi WebRTC connection rock-solid. Specifically:

1. **No image-hang** — frame-stalls are detected within 8 s and recovered within 30 s.
2. **No persistent reconnect-loop** — every retry cycle either succeeds or escalates to a `GivenUp` state with an operator-actionable Retry button. Forever-retry is **forbidden** (research finding R-7).
3. **Self-heal across all reasonable failure paths** — mediasoup-worker death, ssr-tab WS drop, server cold-boot, Pi reload, network blip, GPU crash, two-consumers-same-IP.
4. **Operator telemetry surface** — operator sees last-error + attempts + last-success without devtools (D-04).
5. **Reproducible failure harness** — live-fixture integration tests exist that **would have caught** the Phase-32 manual-UAT regression.

## Anti-Hotfix-Pattern (D-06)

**Each fix MUST:**
- Reference the state-machine contract entry it enforces (33-STATE-MACHINE.md §6 Suspect numbers).
- Come with a regression test that fails before + passes after.
- Include a one-line root-cause statement (why the contract was violated).

**No symptom-targeted hotfixes.** If a symptom can't be traced to a contract violation, the contract is incomplete — update 33-STATE-MACHINE.md first.

## Carry-Forward Baseline (LOCKED, do not revert)

The 12 nightly Phase-32 hotfixes h1-h12 (h4 reverted) remain net-positive baseline. Specifically:
- h8 (single-layer simulcast) — confirmed by research (Twilio/Daily prefer single-layer for LAN).
- h9 (`--use-gl=angle --use-angle=default`) — confirmed by Chromium issue tracker.
- h10 (consumer-only `connectionsByAddr` scope) — eliminates ssr-tab collision.
- h11 (countdown UX past 0s) — eliminates "0s hang" perception.
- h12 (WS-open 10s timeout) — bounded retry on TCP-stalled connections.

Each of these gets a regression test in Plan 33-05 to prevent future revert.

---

## Wave Structure

```
Wave 0 (parallel-safe):     Test infrastructure + repro harness
Wave 1 (sequential):        Plan 33-01 → Plan 33-02 → Plan 33-03 (each plan touches non-overlapping files)
Wave 2 (parallel-safe):     Plan 33-04 + Plan 33-05 (UX + test suite)
Wave 3 (sequential):        Live UAT execution + closure
```

## Plans

### Plan 33-W0 — Test Infrastructure (Wave 0, parallel-safe)

**Goal:** Build the integration-test infrastructure that Phase 32 lacked. This is the gate — no Wave-1 work commits until W0 lands a green live-fixture run.

**Tasks:**

1. **W0-T1: Integration-test harness module** (`test/connection-stability/_harness.mjs`)
   - Boot a real server in a child process, port-randomized, isolated `config/` dir
   - Wait until `/api/ssr/ready === { ready: true, ... }`
   - Open a synthetic mediasoup-client consumer (via the same `/vendor/mediasoup-client.min.js` that the Pi uses, run under Node with `wrtc` polyfill or a headless Puppeteer page)
   - Provide helpers: `bootServer()`, `waitReady()`, `connectConsumer()`, `disconnectConsumer()`, `killMediasoupWorker(serverPid)`, `killSsrTab(serverPid)`, `simulateNetworkBlip(durationMs)`, `teardown()`
   - Each helper reports timing + success boolean

2. **W0-T2: Repro harness script** (`test/manual/repro-cold-boot-loop.mjs`)
   - 10 consecutive cold-boots: boot server → connect consumer → confirm CONNECTED + first-frame within 10 s → teardown → repeat
   - Logs each cycle: boot-time, ready-time, connect-time, first-frame-time, total
   - Fails if any cycle exceeds 10 s OR gets stuck

3. **W0-T3: State-leak baseline test** (`test/connection-stability/state-leak.test.mjs`)
   - Boot server, run 50 connect/disconnect cycles
   - After each cycle, sample: server RSS, open FD count, WebSocket listener count, mediasoup transport count
   - Fail if any metric grows >20% from baseline

4. **W0-T4: Live-fixture smoke test** (`test/connection-stability/live-fixture-smoke.test.mjs`)
   - Boot server + 1 consumer, sustain for 60 s, verify >100 frames received, no reconnects
   - This is the canary: if it ever fails, something is fundamentally broken

**Acceptance:**
- All 4 tests run via `node --test test/connection-stability/`
- Tests are SLOW (≥30 s each) — gate them behind `RUN_LIVE_TESTS=1` env flag in package.json scripts
- W0-T4 PASS green is the merge gate for Wave 1

**Touched files:** `test/connection-stability/**`, `test/manual/**`, `package.json` (test script)

---

### Plan 33-01 — Producer Lifecycle Wire-Up (Wave 1, T1)

**Goal:** Eliminate the 8s `frame-stale` recovery window by wiring producer lifecycle events end-to-end. Server already broadcasts `producer-ready` and `producer-closed` (Phase-32 D-B5) — receiver doesn't handle them. Server never broadcasts `render-host-down` despite receiver being wired for it.

**Suspects addressed:** S4, S5, S7 (33-STATE-MACHINE.md §6).

**Tasks:**

1. **01-T1: Wire `producer-ready` on receiver** (`receiver-webrtc-client.js:140-170`)
   - Add `if (m.type === "producer-ready") { emit("producer-ready"); return; }` in WS message handler
   - Bootstrap subscribes: when received, IF currently in `RECONNECTING-WAITING-FOR-PRODUCER` state, abort backoff timer + immediately call `tryConnect()`
   - Eliminates up-to-1s `pollIntervalMs` of `waitForProducer` after producer comes up

2. **01-T2: Wire `producer-closed` on receiver** (`receiver-webrtc-client.js`)
   - Add `if (m.type === "producer-closed") { emit("connectionState", "producer-gone"); return; }`
   - Bootstrap reacts: immediately call `restart()` (don't wait 8s frame-stale)
   - Eliminates 8s window after server-side Chromium restart

3. **01-T3: Send `render-host-down` from server** (`ssr-render-host.mjs` + `ssr-webrtc-signaling.mjs`)
   - When `startHealthPings` ticks 3 consecutive failures (the `--restart=` decision point), broadcast `{ type: "render-host-down" }` to all consumers BEFORE calling `scheduleRestart()`
   - Receiver already handles it (`receiver-webrtc-client.js:159`) — flips overlay to "Render host crashed" actionable error
   - Operator distinguishes "transient blip" from "host crashed"

4. **01-T4: Tests**
   - Unit: WS message handler dispatch for `producer-ready`/`producer-closed`/`render-host-down`
   - Integration (uses W0 harness): kill ssr-tab → confirm consumer receives `producer-closed` within 200 ms (vs 8 s before) and reconnects
   - Integration: kill render-host-process → confirm consumer receives `render-host-down` within health-ping-cycle and shows error overlay

**Acceptance:**
- After server-side ssr-tab restart, recovery time **<2 s** (was 8-10 s).
- After render-host crash, Pi UI shows "Render host crashed" overlay (was generic reconnect banner).
- New tests pass; existing 274/270/0/4 stays green.

**Touched files:** `receiver-webrtc-client.js`, `receiver-bootstrap.js`, `ssr-render-host.mjs`, `ssr-webrtc-signaling.mjs`, `test/connection-stability/producer-lifecycle.test.mjs`

---

### Plan 33-02 — Server Self-Healing (Wave 1, T2)

**Goal:** The server must self-heal from all server-side failures without operator intervention.

**Suspects addressed:** S6 (BUG-B render-host doesn't recover), S8 (mediasoup-worker died no respawn), S12 (purgeStaleMediasoupWorker collateral kill).

**Tasks:**

1. **02-T1: Mediasoup-worker auto-respawn** (`ssr-mediasoup-router.mjs:96-100`)
   - On `worker.on("died")`, do NOT just null references — call `bootMediasoupRouter()` again
   - Implement backoff: 1s → 2s → 5s → 10s, capped at N=5 attempts before logging fatal + giving up (operator must restart)
   - Broadcast `render-host-down` to consumers during the retry window
   - On successful respawn, broadcast `producer-ready` after the publisher script re-establishes

2. **02-T2: ssr-tab WS-drop watchdog** (`ssr-render-host.mjs`)
   - Track `publisherWsLastPongMs` — server signaling fires this on every heartbeat from the publisher script
   - Health-ping check: if Chromium CDP is responsive BUT `publisherWsLastPongMs` is stale >15s → log "publisher WS dropped, restarting render-host" + call `scheduleRestart()`
   - Closes BUG-B: stuck publisher → render-host doesn't notice → never recovers

3. **02-T3: PID-scope `purgeStaleMediasoupWorker`** (`ssr-mediasoup-router.mjs`)
   - Don't blanket `pkill -f mediasoup-worker`. Read `~/.tt-beamer/server.pid` if it exists; only kill mediasoup-worker children of that PID via `pgrep -P <pid>`
   - Falls back to current behavior if no PID file (single-deployment case)
   - Eliminates dev-rebuild-killing-prod-server collateral

4. **02-T4: Tests**
   - Integration (W0 harness): inject `worker.kill()` → confirm respawn + consumer recovery within 30 s
   - Integration: simulate publisher WS drop (close from inside publisher script via `injectScript`) → confirm render-host restart within 20 s + consumer recovery within 35 s
   - Unit: `purgeStaleMediasoupWorker` PID-scoped behavior with mock pgrep

**Acceptance:**
- Mediasoup-worker kill → automatic recovery, no operator action needed.
- ssr-tab WS drop → automatic render-host restart, no operator action needed.
- Two server processes can run on same host without collateral kill.

**Touched files:** `src/server/ssr-mediasoup-router.mjs`, `src/server/ssr-render-host.mjs`, `src/server/ssr-webrtc-signaling.mjs`, `test/connection-stability/server-self-healing.test.mjs`

---

### Plan 33-03 — Receiver State-Machine Refactor (Wave 1, T3)

**Goal:** Replace ad-hoc connection state tracking with an explicit LiveKit-style ConnectionState enum + capped retry + correct backoff-reset gate.

**Suspects addressed:** S11 (sessionStorage cross-page-load), S14 (host-down monitor guard never clears), R-1/R-2/R-7 from research (cap retry, reset on first-frame, ConnectionState enum).

**Tasks:**

1. **03-T1: ConnectionState enum** (`receiver-bootstrap.js`)
   - Replace string-based state strings (`"connected"`, `"ws-closed"`, `"host-down"`, etc.) with a single `enum ConnectionState { NEW, CONNECTING, CONNECTED, RECONNECTING, GIVEN_UP, HOST_DOWN, STOPPED }`
   - Centralize state transition logic; make illegal transitions throw (will catch contract violations during tests)
   - Emit a single `onConnectionStateChange(prev, next, reason)` callback for UI

2. **03-T2: Capped retry + GivenUp state** (`receiver-bootstrap.js`)
   - After N=10 failed reconnect attempts OR T=2 min total elapsed, enter `GIVEN_UP`
   - Stop the auto-retry monitor; clear sessionStorage backoff state
   - UI shows actionable "Verbindung verloren — manuelle Wiederverbindung nötig" overlay with Retry button
   - Operator clicks Retry → reset attempts counter → call `tryConnect()` from clean slate
   - Forever-retry is gone

3. **03-T3: Backoff reset on first-frame Connected** (`receiver-bootstrap.js`)
   - Currently: backoff resets on `pcConnectionState === "connected"` (i.e. RTC peer-connection state, before any RTP arrives)
   - Fix: reset on first `frame` event (the `requestVideoFrameCallback` / `timeupdate` proxy)
   - This is research finding R-2 — without this, repeated `connected` events without frames keep cycling at low backoff and never escalate to `GIVEN_UP`

4. **03-T4: sessionStorage clear on fresh page-load** (`receiver-bootstrap.js`)
   - At top of `bootReceiver`, BEFORE `loadBackoffState`, check `performance.navigation.type` (or `PerformanceNavigationTiming.type` for the modern API)
   - If `"reload"` or `"navigate"` (i.e. fresh page load, not a programmatic recovery) → `clearBackoffState(backoffStorage)` first
   - Prevents the "first retry waits 30s" bug after prior failed session

5. **03-T5: Host-down monitor guard fix** (`receiver-bootstrap.js:418`)
   - Current: `if (dec.disconnected && pcState !== "host-down") tryConnect()`
   - Problem: after operator clicks Retry on host-down, `pcState` is still "host-down" → monitor stays gated
   - Fix: clear `pcState` to `RECONNECTING` at top of retry handler, so monitor is re-armed after manual retry succeeds enough to start consuming again

6. **03-T6: Tests**
   - Unit: state-machine transition table (every legal/illegal transition asserted)
   - Unit: capped-retry exits to GIVEN_UP after 10 attempts; sessionStorage cleared on entry
   - Unit: backoff-reset gate fires on `frame` event, not `connectionState=connected`
   - Integration (W0 harness): simulate 11 consecutive failures → confirm GIVEN_UP + Retry button visible
   - Integration: full reload-recovery cycle without 30s wait penalty

**Acceptance:**
- Forever-retry pattern eliminated.
- GIVEN_UP state visible to operator after 10 failures.
- Fresh page-load recovers in <10s regardless of prior state.
- All 274 existing tests stay green.

**Touched files:** `src/app/runtime/output-receiver/receiver-bootstrap.js`, `src/app/runtime/output-receiver/receiver-status-ui.js` (Retry button + GIVEN_UP overlay), `test/connection-stability/receiver-state-machine.test.mjs`

---

### Plan 33-04 — Operator Telemetry Surface (Wave 2, parallel)

**Goal:** Operator sees connection diagnostics without devtools (D-04 from 33-CONTEXT.md).

**Suspects addressed:** S10, S13.

**Tasks:**

1. **04-T1: Status-detail line under countdown** (`receiver-status-ui.js`)
   - Below "RECONNECTING — Xs (attempt N)" countdown, append a small italic line:
     - Last error message (truncated to 80 chars, e.g., "no-producer-yet" / "ws open timeout (10s)" / "consume failed: rtp-capabilities-mismatch")
     - "letzte Verbindung: 2m 17s" (time since last successful CONNECTED)
   - Updates each tick (1s)

2. **04-T2: GivenUp state UI** (`receiver-status-ui.js`)
   - When state transitions to GIVEN_UP: hide countdown, show big actionable error overlay:
     - "Verbindung verloren"
     - "Letzter Fehler: <reason>"
     - "Versuche: 10 / Letzte erfolgreiche Verbindung: <timestamp>"
     - Big "Erneut verbinden" button → triggers retry handler

3. **04-T3: Stable-overlay-hide poll cleanup on host-down** (`receiver-bootstrap.js:208-220`)
   - Add `host-down` to the list of state-changes that clear the poll timer (S13 fix)

4. **04-T4: Tests**
   - Unit: status-detail-line content rendering
   - Unit: GIVEN_UP overlay rendering + Retry button click handler
   - Integration: poll cleared on host-down

**Acceptance:**
- Operator can read connection failure reason without devtools.
- GIVEN_UP shows clear actionable next step.
- No overlay/host-down render races.

**Touched files:** `src/app/runtime/output-receiver/receiver-status-ui.js`, `src/app/runtime/output-receiver/receiver-bootstrap.js`, `test/connection-stability/operator-telemetry.test.mjs`

---

### Plan 33-05 — Comprehensive Test Suite + Regression Tests (Wave 2, parallel)

**Goal:** Live-fixture + stress + fault-injection + regression coverage that **would have caught** the Phase-32 manual-UAT regression.

**Tasks:**

1. **05-T1: Multi-cycle stress runner** (`test/connection-stability/stress-multi-cycle.test.mjs`)
   - 10× cold-boot cycles
   - 10× consumer-only-reload cycles (server stays up)
   - 1-hour steady-state run (gated behind `RUN_LONG_TESTS=1`, skip in CI)
   - Each cycle: timing, success boolean, RSS/FD/transport-count delta

2. **05-T2: Fault-injection suite** (`test/connection-stability/fault-injection.test.mjs`)
   - Network blip simulation: drop RTP packets via local routing for 1s, confirm recovery <30s
   - WS RST simulation: forcibly close consumer's WS at random point during handshake, confirm recovery
   - mediasoup-worker SIGKILL: confirm 02-T1 auto-respawn
   - ssr-tab WS drop: confirm 02-T2 watchdog restart
   - Two-consumers-same-IP: open 2 consumers from 127.0.0.1 simultaneously, confirm both stay connected (S9 needs additional fix; if not done in this phase, document the limitation)

3. **05-T3: Regression tests for Phase-32 hotfixes**
   - h8 (single-layer simulcast): assert publisher emits encodings array of length 1 regardless of detected encoder
   - h9 (`--use-gl=angle`): assert ssr-render-host args contain both `--use-gl=angle` and `--use-angle=default`
   - h10 (consumer-only addr-scope): assert `connectionsByAddr.set` only fires when `role === "consumer"`
   - h11 (countdown UX past 0s): assert overlay text changes to "Connecting…" after remainSec ≤ 0
   - h12 (WS-open 10s timeout): assert WS open promise rejects within 10s on a stalled-server fixture

4. **05-T4: Same-IP two-consumer fix** (S9, if scope permits)
   - Replace per-IP `connectionsByAddr` with per-WS-key registry; allow N consumers per IP
   - Test: 2 consumers from 127.0.0.1, both stay connected, no thrash

**Acceptance:**
- All stress + fault-injection + regression tests pass green
- 5+ regression tests document each Phase-32 hotfix to prevent revert
- 50+ multi-cycle stress runs zero leaks

**Touched files:** `test/connection-stability/**`, possibly `src/server/ssr-webrtc-signaling.mjs` (if 05-T4 in scope)

---

### Plan 33-W3 — Live UAT + Closure (Wave 3, manual-driven)

**Goal:** Verify on production hardware with the multi-cycle acceptance matrix.

**Tasks:**

1. **W3-T1: 33-HUMAN-UAT.md** — Acceptance matrix:
   - 10× cold-boots ×10s connect: PASS/FAIL
   - 10× Pi-reloads ×10s connect: PASS/FAIL
   - 1h steady-state (zero spontaneous reconnects): PASS/FAIL
   - 3 fault-injection scenarios (kill server, kill mediasoup-worker, drop network): PASS/FAIL
   - mp4 outside-sandstorm playback: PASS/FAIL (incidental — confirms h9 GPU fix on hardware)

2. **W3-T2: 33-VERIFICATION.md** — Goal-backward analysis:
   - All 7 milestones from 33-CONTEXT.md achieved?
   - Acceptance matrix from 33-HUMAN-UAT.md PASS?
   - All 14 suspects from 33-STATE-MACHINE.md addressed (fixed, regression-tested, or documented as deferred)?

3. **W3-T3: 33-SUMMARY.md** — Phase closure with:
   - Files touched
   - Tests added
   - Suspect resolution table
   - Final test snapshot

4. **W3-T4: Update CURRENT_PHASE.md / PHASES.md / ROADMAP.md** to reflect Phase 33 closure.

5. **W3-T5: Tag** — `phase-33-end` (full PASS) or `phase-33-closed-partial` (some suspects deferred).

---

## Suspect Resolution Map

| # | Suspect (33-STATE-MACHINE.md §6) | Plan | Status target |
|---|----------------------------------|------|---------------|
| 1 | Countdown overlay 0s perceived hang | 33-05-T3 (regression) | regression-tested (already fixed by h11) |
| 2 | --use-gl=egl GPU crash | 33-05-T3 (regression) | regression-tested (already fixed by h9) |
| 3 | WS-open hang on TCP-stalled | 33-05-T3 (regression) | regression-tested (already fixed by h12) |
| 4 | producer-ready dead-wired | 33-01-T1 | FIXED |
| 5 | producer-closed dead-wired | 33-01-T2 | FIXED |
| 6 | Render-host stuck if WS dropped | 33-02-T2 | FIXED |
| 7 | render-host-down never sent | 33-01-T3 | FIXED |
| 8 | Mediasoup worker no auto-respawn | 33-02-T1 | FIXED |
| 9 | Two consumers same IP thrash | 33-05-T4 (if scope) | FIXED or DEFERRED |
| 10 | Operator telemetry surface | 33-04-T1, T2 | FIXED |
| 11 | sessionStorage cross-page-load | 33-03-T4 | FIXED |
| 12 | purgeStaleMediasoupWorker pkill | 33-02-T3 | FIXED |
| 13 | Stable-overlay poll on host-down | 33-04-T3 | FIXED |
| 14 | Monitor host-down guard never clears | 33-03-T5 | FIXED |

---

## Total Files Touched (estimate)

**Source:**
- `src/server/ssr-mediasoup-router.mjs` — auto-respawn, PID-scope purge
- `src/server/ssr-render-host.mjs` — ssr-tab WS watchdog, render-host-down broadcast
- `src/server/ssr-webrtc-signaling.mjs` — render-host-down dispatch (already broadcasts ready/closed; ensure dispatch on health-ping)
- `src/app/runtime/output-receiver/receiver-bootstrap.js` — ConnectionState enum, capped retry, GIVEN_UP, backoff-reset, sessionStorage, monitor guard
- `src/app/runtime/output-receiver/receiver-webrtc-client.js` — producer-ready/producer-closed handlers
- `src/app/runtime/output-receiver/receiver-status-ui.js` — status-detail line, GIVEN_UP overlay, Retry button

**Test:**
- `test/connection-stability/_harness.mjs` — integration test infrastructure
- `test/connection-stability/live-fixture-smoke.test.mjs` — canary
- `test/connection-stability/state-leak.test.mjs` — leak baseline
- `test/connection-stability/producer-lifecycle.test.mjs` — Plan 33-01
- `test/connection-stability/server-self-healing.test.mjs` — Plan 33-02
- `test/connection-stability/receiver-state-machine.test.mjs` — Plan 33-03
- `test/connection-stability/operator-telemetry.test.mjs` — Plan 33-04
- `test/connection-stability/stress-multi-cycle.test.mjs` — Plan 33-05
- `test/connection-stability/fault-injection.test.mjs` — Plan 33-05
- `test/connection-stability/phase-32-hotfix-regression.test.mjs` — Plan 33-05 regression

**Manual:**
- `test/manual/repro-cold-boot-loop.mjs` — failure reproduction
- `.planning/phases/phase-33/33-HUMAN-UAT.md` — acceptance matrix
- `.planning/phases/phase-33/33-VERIFICATION.md` — goal-backward verify
- `.planning/phases/phase-33/33-SUMMARY.md` — closure

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| W0 harness can't simulate Pi VC4 hardware decoder | Use Puppeteer Chromium consumer; document VC4-specific concerns as Pi-only manual UAT |
| Mediasoup-worker auto-respawn could mask root-cause crashes | Log every respawn loudly; cap N=5 attempts before fatal-and-give-up |
| GIVEN_UP after 10 attempts may surprise operators used to "infinite retry" | UX: clear messaging + one-click Retry; document in 33-HUMAN-UAT.md |
| sessionStorage clear on fresh page-load may break in-flight reconnect-during-reload | Test: simulate reload during reconnect-loop, confirm fresh attempts cycle is correct behavior |
| Plan 33-02 ssr-tab WS watchdog may flag legitimate health-ping latency as a drop | Tune threshold based on baseline observation; default 15s |

---

*Phase: 33-connection-stability-deep-dive · Plan · 2026-05-08 · driven by 33-RESEARCH.md + 33-STATE-MACHINE.md*
