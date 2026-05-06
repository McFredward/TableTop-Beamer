---
phase: 31-server-side-rendering-pivot
title: Server-Side Rendering Pivot
verified: 2026-05-06T09:40:30Z
status: PARTIAL — automated_complete + manual_pending
score: automated 9/9 PASS · manual 0/15 (PENDING — Pi hardware required)
test_board: nemesis-lockdown-a
human_verification:
  - test: "11 baseline UAT scenarios on Pi 4 connected to Test-Board (Nemesis Lockdown Board A) via 5GHz WLAN"
    expected: "All 11 scenarios from RESEARCH.md § Test/UAT Strategy pass per the criteria documented in 31-HUMAN-UAT.md"
    why_human: "Pi VC4 GPU performance, real WLAN behaviour, real beamer audio output, real touch latency — none can be measured by an automated executor. Phase-26 + Phase-30 set the precedent."
  - test: "3 publishability UAT scenarios (UI encoder change, forced x264-software, software-only environment)"
    expected: "Operator can change encoder via UI, system survives forced x264 fallback, software-only deployment produces usable 720p stream"
    why_human: "Settings UI flow on real dashboard + Pi reconnect timing under WLAN; forced fallback fps measurement; software-only requires CPU-only host"
  - test: "Scenario 6 (D-D2 reversal): Audio plays from Pi-local Audio when triggered"
    expected: "Trigger animation with sound from dashboard → audio plays from Pi audio output (jack/HDMI/USB) within ~100ms of visual"
    why_human: "Pi-local-audio path is exercised by physical hardware (Pi audio HW + WebSocket trigger) — no automated harness exists for end-to-end audio output"
  - test: "Scenario 15 (D-D2 reversal NEW): audioRoute toggle in System UI graceful disabled-state"
    expected: "User opens dashboard System & Performance, attempts to flip audioRoute to in-stream → toggle is disabled with tooltip 'Currently deferred…'; flipping does not crash; if forced via API, server validator silently rejects"
    why_human: "Visual UI affordance + tooltip rendering require human visual confirmation"
  - test: "30-min soak — fps stable, no memory leak, no GL context loss, no audio drift"
    expected: "Pi diagnostic chip fps stays >24 throughout 30 min of mixed animation + align-mode + WS-trigger usage; server tab RAM stable ±50 MB; no GL_CONTEXT_LOST in browser console"
    why_human: "Long-running stability cannot be parallelised in CI; must run on real Pi against real server with real animations"
---

# Phase 31: Server-Side Rendering Pivot Verification Report

**Phase Goal:** Pivot from client-side rendering on Pi 4 (Phase-30 plateau ~12 fps) to thin-client model — server runs the render pipeline in headless Chromium, Pi /output/ consumes a finalized H264 WebRTC stream + Pi-local audio (D-D2 reversal). User-facing contracts (align mode, mesh-warp, layering, all animation types) preserved bit-for-bit.

**Verified:** 2026-05-06T09:40:30Z
**Status:** PARTIAL — automated gates 9/9 PASS · manual UAT 15/15 PENDING (Pi hardware required, see `31-HUMAN-UAT.md`)
**Re-verification:** No — initial verification; will be re-tagged after manual UAT closes.

## Outcome

Wave 0..5 delivered the SSR pivot end-to-end and exited each plan with green automated gates. Wave 6 (this plan) closes the AUTOMATED side: 137 tests / 135 pass / 0 fail / 2 skip (Phase-29 40 baseline + 97 Phase-31 additions). The MANUAL side — 15 UAT scenarios on Pi 4 + 30-min soak — is documented in `31-HUMAN-UAT.md` and is BLOCKING for closure (CLOSE PASS / CLOSE PARTIAL gate).

The implementation is **DELIVERED-TO-UAT**. After the user runs through the manual scenarios on real hardware, this document will be re-stamped to `status: complete` (or `status: partial` with deferred items) and Phase 31 will be tagged `phase-31-end` (or `phase-31-end-partial`).

## Acceptance Matrix

| Requirement | Source | Result | Evidence |
|-------------|--------|--------|----------|
| M1 Discuss-phase closure | CONTEXT.md | DONE | `.planning/phases/phase-31/31-CONTEXT.md` (gathered 2026-05-06; 14 decisions D-A1..D-X8 locked) |
| M2 Research-phase closure | RESEARCH.md + Wave 0 | PARTIAL | RESEARCH.md present (~80 KB); Wave 0 audio-smoke ESCALATED → D-D2 reversed (see 31-D-D2-REVERSAL-ADDENDUM.md); other 4 Wave-0 scaffolds PASS |
| M3 SSR bring-up | Plan 01 | PASS | 31-01-SUMMARY.md: Xvfb + Chromium + puppeteer-stream lifecycle, encoder auto-detection, opt-in via `SSR_RENDER_HOST=1` |
| M4 Stream transport | Plan 02 | PASS | 31-02-SUMMARY.md: mediasoup H264 (video-only per D-D2 reversal), `/api/webrtc/signal` WS, in-page publisher via `getDisplayMedia({video:true,audio:false})` |
| M5 User-contract parity | Plans 03+04 | PARTIAL | 31-03 + 31-04-SUMMARY.md: receiver bootstrap + align-corner-drag forwarding + state-restore — automated tests PASS; manual UAT 5+8+9 PENDING (Pi hardware) |
| M6 Resilience | Plans 03+04 | PARTIAL | D-C4 three-indicator detection unit-tested (PASS); D-X7 active-anims persistence unit-tested (PASS); manual UAT 2+3+4 PENDING (Pi hardware) |
| M7 UAT ≥20 fps | Plan 06 (this) | PENDING | Pi hardware required — see 31-HUMAN-UAT.md scenario 11 (30-min soak) |
| Hard: Phase-29 40/40 | n/a | PASS | `node --test "test/**/*.test.mjs"` — 137 tests / 135 pass / 0 fail / 2 skip; Phase-29 baseline 40 tests still green |
| Hard: Phase-12 layering | UAT 8 | PENDING | Manual UAT scenario 8 (Pi hardware) |
| Hard: Phase-13 server-auth | n/a | PASS | No browser-storage references regress; serverRendering follows Phase-13 pattern (server-authoritative + 200ms debounced writer) |
| Hard: Phase-26 h9 / 28 B6 / 30 B1+B2+B3 | UAT 8-10 | PENDING | Manual UAT scenarios 8, 9, 10 (Pi hardware) |
| D-B4 no-black-screen BINDING | UAT 2-4, 12 | PENDING | 4 disconnect scenarios documented in 31-HUMAN-UAT.md; receiver-status-ui unit tests assert evaluateDisconnect emits explicit reason codes (PASS) but live-on-Pi visual confirmation BLOCKING |
| D-D2 audio Pi-local | UAT 6 | PENDING | Plan 03 receiver-bootstrap keeps `runtime-wire-room-audio-binders.js` ACTIVE on /output/ (verified by source grep); UAT scenario 6 confirms physical audio output |
| D-D1 align-mode roundtrip | UAT 5 | PENDING | Plan 04 align-corner-drag mutation + V5 ASVS validator + Pitfall 6 SVG ghost (PASS automated); UAT scenario 5 confirms <200ms perceived latency on Pi |
| D-X7 active-anims persistence | UAT 2 | PENDING | Plan 04 `loadSsrInitialState` + `persistRunningAnimations` + `filterExpired` — 9 unit tests PASS; UAT scenario 2 confirms animation resumes after server restart |
| Publishability — UI encoder change auto-restart | UAT 12 | PENDING | Plan 05 server-rendering-panel.js + server.mjs encoder-change restart (PASS automated source-greps); UAT 12 confirms dashboard System & Performance UX |
| Publishability — forced x264-software fallback | UAT 13 | PENDING | Plan 01 + Plan 04 user-override path (PASS automated); UAT 13 confirms degraded-but-working stream |
| Publishability — software-only environment | UAT 14 | PENDING | Plan 00 encoder priority + universal x264-software fallback (PASS unit-tested); UAT 14 confirms ≥720p / ≥25 fps on weak hardware |
| D-D2 REVERSAL — Scenario 6 (renamed) | UAT 6 | PENDING | Per 31-D-D2-REVERSAL-ADDENDUM.md: Audio plays from Pi-local Audio when triggered (Pi HW audio output, not server) |
| D-D2 REVERSAL — Scenario 15 (NEW) | UAT 15 | PENDING | Per 31-D-D2-REVERSAL-ADDENDUM.md: audioRoute toggle in System UI shows graceful tooltip/banner; Plan 04 validator + Plan 05 disabled-attribute (PASS automated) |

## Performance Achieved

| Metric | Target | Achieved | Δ vs Phase 30 |
|--------|--------|----------|---------------|
| Pi /output/ fps | ≥20 (target 24, ideal 30) | **PENDING** (Pi hardware) | Phase-30 plateau ~12 fps |
| Operator → pixel latency | <150ms | **PENDING** (Pi hardware) | new metric (was direct render in Phase 30) |
| Server CPU | <80% one core | **PENDING** (Pi hardware) | new metric |
| Pi CPU | <20% (was ~95% Phase 30) | **PENDING** (Pi hardware) | target -75 percentage points |
| Bandwidth | <8 Mbit/s | **PENDING** (Pi hardware) | new metric |

## Phase Contracts Non-Regression

| Phase | Contract | Verified | Method |
|-------|----------|----------|--------|
| 11 HF6 | seen-once full-duration playback | PASS | `filterExpired` matches Phase-11-HF6 + Phase-12 verbatim (loop=keep, durationMs=null=keep, expired non-loop=drop, malformed=drop); 4 unit tests cover every branch |
| 12 | A→B == B→A additive layering | PENDING | Manual UAT scenario 8 (Pi hardware) — Phase-12 verification preserved by running existing render pipeline 1:1 in headless Chromium |
| 13 | Server-authoritative config (no browser-storage) | PASS | grep guards in test suite; Plan-04 serverRendering schema follows Phase-13 200ms debounced writer pattern |
| 19/27 | Align-mode + 4-corner projection mapping | PENDING | Manual UAT scenario 9 (Pi hardware) |
| 26 h9 | GL-triangle seam fix on solid-color | PENDING | Visual confirmation on aligned mesh-warp (Pi hardware) |
| 28 B6 | Diagnostic-overlay live-sync | PENDING | Manual UAT scenario 7 (multi-client cross-window) |
| 29 | Schema v4 + 40/40 tests | PASS | `node --test` exits 0 with `# fail 0`; baseline 40 still green within the 137-total |
| 30 | B1 seam, B2 GIF reliability, B3 overlay sync | PENDING | Hotfix-audit (31-HOTFIX-AUDIT.md) classified T4/T13/T14/T16 as server-keep, T7+T15 as regression-risk-gated, T12 as pi-only-gated, T11 as dashboard-only-already-gated; 11 unit tests in runtime-env-environment.test.mjs verify gate presence; live UAT confirms Pi defense-in-depth still works |

## D-D2 Reversal Summary

Per `31-D-D2-REVERSAL-ADDENDUM.md` (BINDING — supersedes original D-D2 in CONTEXT.md/RESEARCH.md/conflicting plan acceptance criteria):

- **D-D2 redefined:** Audio is Pi-local via WebSocket-Trigger (NOT in WebRTC stream).
- **Trigger:** Wave-0 audio-capture smoke ESCALATED on 2026-05-06 due to puppeteer-stream `activeTab permission` failure on Chrome 131 + headful Xvfb (3 auto-fix attempts exhausted).
- **User decision (2026-05-06):** Plan B — revert to researcher's original recommendation.
- **Plan-by-plan adjustments applied:** 31-00 (audio-smoke skipped), 31-02 (mediasoup video-only), 31-03 (receiver-bootstrap keeps audio-binders ACTIVE), 31-04 (audioRoute default = pi-local), 31-05 (System UI in-stream toggle DISABLED + tooltip), 31-06 (Scenario 6 renamed, Scenario 15 NEW).

## Forwarded / Deferred

- **In-stream audio (D-D2 future-feature):** preserved as feature-flag `WAVE0_AUDIO_CAPTURE_VERIFIED` (currently `false`); enum value `audioRoute=in-stream` retained in schema; flipping the flag + removing `disabled` attribute is a future one-line change once a cross-platform audio-capture path stabilises.
- **Multi-server / cluster render** — Phase 31 is single-server; deferred per CONTEXT.md.
- **WAN / TURN-server streaming** — Phase 31 is LAN-only; deferred per CONTEXT.md.
- **Auto-fallback to local Pi render** — Phase 31 deactivates this by design (D-B4); deferred per CONTEXT.md.
- **Adaptive FPS-senkung** — WebRTC-native; deferred per CONTEXT.md.
- **30-min soak (UAT 11)** — documented in 31-HUMAN-UAT.md but not executed automatically; runs as part of the operator's UAT pass.
- **Manual UAT scenarios 1-15** — listed in 31-HUMAN-UAT.md; user runs on Pi hardware to close the gate.

## Tag

`phase-31-end` (or `phase-31-end-partial`) at the closure commit, AFTER manual UAT completes via `31-HUMAN-UAT.md`. Until then: **DELIVERED-TO-UAT**.

---

*Phase: 31-server-side-rendering-pivot · Wave 6 closure pending manual UAT · 2026-05-06*
