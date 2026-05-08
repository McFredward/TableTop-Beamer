# Phase 33: Connection Stability Deep Dive — Context

**Gathered:** 2026-05-08
**Status:** Ready for research + planning
**Mode:** Investigation-first. The 12 nightly Phase-32 hotfixes did not close the gap. This phase prioritises **understanding** before further code change.

<domain>
## Phase Boundary

**Single objective:** make the SSR → Pi WebRTC connection rock-solid under all realistic operator usage. No image-hang. No persistent reconnect loops. No "Server-Restart hilft" workarounds. The system runs for hours without intervention. Page-reload recovers in <10s. Server cold-boot recovers in <10s. Pi cold-boot recovers in <10s.

**Why a dedicated phase:** Phase 32 delivered 13/13 automated must-haves PASS but the manual UAT on production hardware fails (image-hang + dauerhafte Verbindungsabbrüche). Twelve hotfixes h1-h12 across one night (h4 reverted) materially improved the path but did not eliminate the regression. The pattern — "test suite green, hardware broken" — signals that we are missing a **reproducible test harness** that mirrors the live failure mode AND a **research baseline** of how production WebRTC services (Twilio, Daily, Jitsi, LiveKit, mediasoup-demo) handle these exact scenarios.

**Test-Hardware:**
- Server: Lenovo IdeaCentre Mini, Intel Core 7 240H, Raptor Lake-P iGPU, Mesa llvmpipe, Linux + Xvfb
- Pi: Raspberry Pi 4 with VC4 H264 hardware decoder, Chromium kiosk mode at `/output/`
- Test board: Nemesis Lockdown Board A
- Network: gigabit ethernet LAN (no WAN/TURN)

**Trigger:** User report 2026-05-08 after 12-hotfix night: *"Aktuell hängt das Bild und es kommt wieder zu dauerhaften Verbindungsabbrüchen — so ist es unter keinen Umstände nutzbar."*

**Phase 32 outcomes carried forward (LOCKED, do not re-open):**
- D-A1: WebRTC + h264 + mediasoup architecture (Phase 31)
- D-A3: Headful Chromium 131 + Xvfb + puppeteer-stream
- Pi-local audio (D-D2 reversal, Phase 31)
- Server-authoritative state (Phase 13 + Phase 31 h41/h42)
- `config/global-defaults.json` → `serverRendering` schema (Phase 31/32)
- `streamFpsCap` + `alignModeBoost` settings (Phase 32 Block A)

**Explicit OUT of scope:**
- New animation types or render features
- Audio path changes (Pi-local stays)
- Codec change away from H264
- Pi-side render fallback (server unreachable → operator restarts)
- WAN / TURN / Internet routing
- mp4 black-screen issue (separate symptom — track in Phase 34 if not absorbed by Mesa-llvmpipe fix here)
- FPS-lift work (Phase 32 Block A delivered settings + cap; further FPS work is post-stability)

**Investigation reuse from Phase 32 hotfix night (REQUIRED inputs for research):**
1. `.planning/debug/phase-32-connect-baseline-p31.md` — Phase-31 stable-boot trace (45s rock-stable reference)
2. `.planning/debug/phase-32-connect-head-trace.md` — HEAD failure-trace + identified BUG-A (stale-guard kills ssr-tab) and BUG-B (ssr-tab WS close doesn't trigger restart)
3. `.planning/debug/phase-32-connection-comprehensive-audit.md` — full Phase-31→HEAD diff with all suspect files
4. `.planning/debug/phase-32-connection-broken-research.md` — phantom-disconnect race during waitForProducer
5. `.planning/debug/phase-32-connection-broken-debug.md` — in-flight flag bulletproofing live-debug

**12 hotfixes (h1-h12, h4 reverted) — context for what was tried:**

| # | Layer | Fix |
|---|-------|-----|
| h1 | UI | overlay visibility — `hidden` attr vs `style.display` conflict |
| h2 | Config | revert `qualityPreset=high-quality` → `balanced` |
| h3 | Xvfb | `-fakescreenfps 120` → `60` + per-5s rAF/track-fps diag |
| h5 | Pi-bootstrap | `waitForProducer` moved BEFORE `monitorInterval` (phantom-disconnect race) |
| h6 | Pi-bootstrap | `tryConnectInFlight` flag replaces `reconnectAttempts === 0` guard |
| h7 | Pi-bootstrap | wrap `tryConnect()` in try/catch/finally for in-flight cleanup |
| h8 | Server publisher | force `useSimulcast = false` (VAAPI false-positive caused 3-layer SW encode overload) |
| h9 | Chrome flags | `--use-gl=egl` → `--use-gl=angle --use-angle=default` (Chrome 131 GPU-process crash) |
| h10 | Server signaling | scope `connectionsByAddr.set` to `role === "consumer"` (h38 stale-guard killed ssr-tab WS) |
| h11 | UI | countdown UX past 0s — show "Connecting… (attempt N)" |
| h12 | Pi receiver | bounded WS-open 10s timeout (TCP-stalled scenarios) |

</domain>

<decisions>
## Implementation Decisions

### D-01: Investigation BEFORE Code

The next code change happens AFTER three artefacts exist:

1. **A documented WebRTC-reconnect best-practices brief** — survey of how Twilio Video, Daily.co, Jitsi Meet, LiveKit, and the mediasoup-demo handle: (a) producer-readiness on cold-boot, (b) consumer reconnect with exponential backoff, (c) ICE-restart vs full-tear-down, (d) heartbeat / liveness probing, (e) the specific Chrome-131-as-publisher-as-tab-under-Xvfb topology. Output: `33-RESEARCH.md`.
2. **A reproducible failure harness** — a script (or pair of scripts) that runs unattended on the actual server hardware and provokes the failure within 5 minutes. We need to be able to bisect against this harness. Output: `33-REPRO-HARNESS.md` + scripts under `test/manual/`.
3. **A written contract for the connection state-machine** — what each side believes about each state, what messages cross the wire, what timers exist. Output: `33-STATE-MACHINE.md`.

### D-02: Comprehensive Test Coverage Strategy

Phase 32 had 13/13 must-haves PASS but the live failure was not caught. This phase MUST add:

- **Live-fixture integration tests** — boot the actual server (or a thin variant of it) in CI/local-test, connect a headless consumer, exercise full reconnect cycles. Differs from Phase-32 unit tests which mocked the WS or stubbed the producer.
- **Multi-cycle stress tests** — N consecutive cold-boots, N consecutive Pi-reloads, N "kill-mediasoup-worker-from-outside" scenarios. Each cycle reports timing + success.
- **Network-failure injection** — TCP RST, DNS fail, partial packet-loss simulation (`tc qdisc`), WS close codes 1000/1006/4xxx. Verifies the recovery path under realistic LAN faults.
- **Backoff-schedule property tests** — verify the [1s, 2s, 5s, 10s, 30s] schedule is monotonic, sessionStorage survives reload, and the upper-bound is finite (never explodes to minutes).
- **State-leak tests** — after N reconnects, verify no zombie peer-connections, no leaked WS sockets, no lingering mediasoup transports, no growing memory footprint.

### D-03: Three-Layer Isolation

Each layer must be isolatable for testing:

1. **Server publisher (`ssr-stream-publisher.mjs`)** — can produce a test stream without a real Chromium tab.
2. **Server signaling (`ssr-webrtc-signaling.mjs`)** — can serve a synthetic consumer without a real publisher.
3. **Pi receiver (`receiver-bootstrap.js` + `receiver-webrtc-client.js`)** — can connect to a fake signaling endpoint.

This decoupling lets us identify which layer is the actual culprit when the live system fails. Currently we suspect them all roughly equally.

### D-04: Operator Telemetry Surface

When connection breaks, the operator must be able to **see why** without devtools. Add a status-detail line under the existing RECONNECTING countdown:

- Last error message (one line)
- Current attempt + total attempts since last success
- Last successful connect timestamp ("connected 2m 17s")

This is partly UX, partly a forcing function — if we can't articulate the failure cleanly enough to display it, we don't understand it.

### D-05: Multi-Phase Acceptance Matrix

Phase 33 acceptance is a multi-cycle live-hardware test. Lock the acceptance matrix BEFORE writing fix code:

- ≥10 consecutive cold-boots, each connect <10s, zero stuck-reconnect
- ≥10 consecutive Pi-reloads, each connect <10s
- ≥1 hour steady-state run, zero spontaneous reconnects
- ≥3 "force-reconnect" tests (kill server, kill mediasoup-worker, drop network briefly), each recovery <30s
- mp4 outside-sandstorm playback verified (incidental — confirms h9 GPU fix on hardware)

The matrix lives in `33-HUMAN-UAT.md` and is the gate for PASS.

### D-06: No "Just Try Another Hotfix" Pattern

Phase 32 produced 12 hotfixes in one night because each fix was symptom-targeted. Phase 33 explicitly forbids this pattern:

- Each fix must reference the state-machine contract (D-01.3) it enforces.
- Each fix must come with a regression test that fails before + passes after.
- Each fix must include a one-line root-cause statement (why the contract was violated).
- Hotfixes-after-delivery are still possible but go through the same contract-first gate.

### D-07: Acceptance of Architectural Refactor If Needed

If the research (D-01.1) reveals that production-grade reconnect requires architectural change — e.g. the consumer should use ICE-restart instead of full tear-down, or the publisher should never auto-restart but rather wait for explicit signal — the phase scope INCLUDES that refactor. We are not aiming for the smallest diff; we are aiming for a stable system.

</decisions>

<assumptions>
## Working Assumptions (verify or invalidate during research)

- **A1: Chrome 131 GPU-process crash without `--use-angle=default`** is real (h9). Mesa llvmpipe via ANGLE is the right rendering path. To verify: boot with the flag removed and confirm crash; boot with the flag and confirm stability.

- **A2: VAAPI detection is a false-positive on Raptor Lake-P** in current Chrome 131 builds — the libva runtime probe succeeds but Chrome's VaapiVideoEncoder feature flag is no-op (Phase 32 finding). Encoder falls back to OpenH264 software. Single-layer h8 forced this. To verify: inspect `chrome://gpu` from inside the SSR tab + verify mediasoup-publisher reports software-encode in stats.

- **A3: The reconnect-loop trigger is a specific timing race** — possibly producer not yet ready when first consumer arrives, or producer transient drop during operator's first action (animation trigger / align-mode toggle). Multi-cycle stress will reveal the trigger window.

- **A4: The image-hang is independent of the reconnect-loop** — possibly mp4 frame stall in Chrome 131 software-render path, not a consumer-side issue. Could share root cause with sandstorm-black or be its own thing. Research must distinguish.

- **A5: The 12 hotfixes are net-positive but not net-sufficient** — keeping them is the baseline. Only revert if a specific hotfix is shown to mask a deeper bug.

- **A6: `purgeStaleMediasoupWorker` (Phase 32 D-B4) is system-wide pkill** — will collateral-kill any other mediasoup process. Production-deployment problem (multi-tenant scenario). Should be PID-scoped or process-name-prefixed for safety.

</assumptions>

<dependencies>
## Required Inputs

- The 5 Phase-32-hotfix-night debug docs (referenced under "Investigation reuse" in the domain section).
- 32-CLOSURE-ADDENDUM.md (this phase's parent context).
- Live access to the production server hardware for hardware testing — without that, this phase **cannot complete**. The operator must be able to perform multi-cycle UAT runs.

## Output Artefacts (this phase will produce)

- `33-RESEARCH.md` — WebRTC-reconnect best-practices survey
- `33-STATE-MACHINE.md` — connection state-machine contract
- `33-REPRO-HARNESS.md` + scripts — reproducible failure harness
- `33-PLAN.md` — execution plan with concrete tasks
- `33-HUMAN-UAT.md` — multi-cycle acceptance matrix
- `33-VERIFICATION.md` — goal-backward verification report
- `33-SUMMARY.md` — phase closure document
- New tests under `test/connection-stability/**` — live-fixture + stress + fault-injection
- Source-code fixes (TBD — driven by the state-machine contract)

</dependencies>

<test_strategy>
## Test Strategy Skeleton

Three test categories, each as its own suite:

1. **Unit / contract tests** — state-machine transitions, backoff math, timer bounds.
2. **Integration / live-fixture tests** — boot real signaling+publisher, connect synthetic consumer, run full reconnect cycle. These run on every CI invocation and reproduce the live failure if it ever returns.
3. **Stress / fault-injection tests** — multi-cycle (N=50) cold-boot, Pi-reload, network-fault scenarios. These run on-demand (slow) but produce a deterministic pass/fail.

The integration tests are the part Phase 32 missed and are non-negotiable for Phase 33 completion.

</test_strategy>

---

*Phase: 33-connection-stability-deep-dive · Context · 2026-05-08 · supersedes Phase 32 connection scope*
