---
phase: 32
phase_id: 32
title: SSR Stream Performance + Connection Stability
slug: ssr-stream-performance-connection-stability
status: FAILED-AT-MANUAL-UAT
status_detail: "automated 13/13 PASS · 12 nightly hotfixes h1-h12 applied 2026-05-07/08 · manual UAT 2026-05-08 reports image-hang + persistent reconnect-loop · connection stability NOT achieved · superseded by Phase 33. See 32-CLOSURE-ADDENDUM.md for the full hotfix log + outstanding items."
test_board: nemesis-lockdown-a
started: 2026-05-06T22:35:00Z
delivered_to_uat: 2026-05-07T00:30:00Z
closed: 2026-05-08T08:00:00Z
superseded_by: phase-33-connection-stability-deep-dive
tags: [ssr, fps-lift, reconnect-stability, vaapi, xvfb, fakescreenfps, mediasoup, pi, root-cause, failed-at-manual-uat, supersede]

# Phase plans
plans:
  - { id: "32-W0", name: "Wave 0 — measurement infrastructure (11 test scaffolds + harness)", status: "PASS" }
  - { id: "32-01", name: "Wave 1 Block A — Stream FPS Lift (Xvfb -fakescreenfps + VAAPI libva probe + streamFpsCap schema + publisher wiring)", status: "PASS" }
  - { id: "32-02", name: "Wave 1 Block B — Connection Stability (/api/ssr/ready + forever-retry adaptive backoff + RECONNECTING countdown overlay + boot mediasoup purge)", status: "PASS" }
  - { id: "32-03", name: "Wave 2 — Settings UI (Stream FPS Cap radio + Align-Mode Boost checkbox in System & Performance > Server-side Rendering)", status: "PASS" }

# Phase milestones
milestones:
  M1: { name: "Discuss-phase closure", status: "DONE" }
  M2: { name: "Research-phase closure (root causes identified — Xvfb gap + MAX_RECONNECT_ATTEMPTS=10 cap + ghost fpsTarget)", status: "DONE" }
  M3: { name: "Wave 0 measurement infra (skip-gated baseline tests)", status: "PASS" }
  M4: { name: "Stream FPS Lift root-cause fixes", status: "PASS-AUTOMATED" }
  M5: { name: "Reconnect storm root-cause fixes", status: "PASS-AUTOMATED" }
  M6: { name: "Operator-configurable Stream FPS Cap UI", status: "PASS" }
  M7: { name: "Live-hardware UAT (Pi VC4 + drag fluidity + cold-boot ×10)", status: "PENDING (manual UAT)" }

# Hard constraints
hard_constraints:
  phase31_baseline: "PASS (211 prior tests still green inside the 270-pass total)"
  phase31_locked_arch: "PASS (WebRTC/h264/mediasoup/Xvfb/headful Chromium/Pi-local-audio untouched)"
  lan_only_assumption: "PASS (no WAN/TURN code added)"
  server_authoritative_state: "PASS (settings via /api/live/command, no per-client localStorage)"

# Key artifacts
artifacts:
  - ".planning/phases/phase-32/32-CONTEXT.md (Discuss-phase — D-A1..D-A6, D-B1..D-B5)"
  - ".planning/phases/phase-32/32-RESEARCH.md (root causes — Xvfb gap, MAX_RECONNECT_ATTEMPTS cap, fpsTarget ghost field; Open Questions RESOLVED)"
  - ".planning/phases/phase-32/32-VALIDATION.md (per-block acceptance matrix)"
  - ".planning/phases/phase-32/32-W0-PLAN.md, 32-01-PLAN.md, 32-02-PLAN.md, 32-03-PLAN.md"
  - ".planning/phases/phase-32/32-W0-SUMMARY.md, 32-01-SUMMARY.md, 32-02-SUMMARY.md, 32-03-SUMMARY.md"
  - ".planning/phases/phase-32/32-VERIFICATION.md (automated 13/13 PASS, 5 manual UAT items)"
  - ".planning/phases/phase-32/32-HUMAN-UAT.md (manual UAT scenarios — Pi-hardware required)"

# Test summary at delivery
tests:
  total: 274
  pass: 270
  fail: 0
  skip: 4
  exit_code: 0
  phase31_baseline_preserved: true
  phase32_added_tests: 59

# Server stack ready
boot_command: "cd /home/claw/tt-beamer && SSR_RENDER_HOST=1 SSR_PUBLISH=1 node server.mjs"
pi_url: "http://<server-ip>:4173/output/"
dashboard_url: "http://<server-ip>:4173/"
---

# Phase 32: SSR Stream Performance + Connection Stability — Phase Summary

**Goal:** Two post-Phase-31 release-blockers that surfaced in live testing.
(A) Stream FPS plateaued at ~25 fps on potent server hardware despite preset
target 30 — operator-configurable cap with align-mode boost, root-cause
investigation rather than symptom patches. (B) Cold-boot reconnect-storm
on the Pi — sometimes after server start the receiver reconnects forever
without recovery, only server-restart helps. Both blocks closed via
research-driven root-cause fixes.

**Test-Board:** Nemesis Lockdown Board A.

**Trigger:** Phase 31 closed CLOSED-WITH-HOTFIXES at h46. Two release-blockers
were carried forward — Phase 31's hotfixes (h24-h26, h36-h38) had partially
mitigated the reconnect storm but not eliminated it; FPS investigation in
h17/h18 had lifted the nominal target but real-world cap stayed at ~25.

---

## What was delivered

### Block A — Stream FPS Lift (root-cause-first)

The research uncovered three root causes the original Phase-31 hotfix
campaign had not addressed:

1. **Xvfb `-fakescreenfps` flag was missing.** Xvfb's BeginFrameSource
   defaults to a slow internal tick when `-fakescreenfps` is absent.
   Chromium's rAF / paint pipeline inherits this, so headful Chromium
   under Xvfb runs at ~25 fps regardless of `getDisplayMedia`'s
   `frameRate.ideal: 60` request.
   - **Fix:** `getXvfbArgs()` in `src/server/ssr-render-host.mjs` now passes
     `-fakescreenfps 120`. Lifts the rAF cap so the encoder can be fed
     at the requested rate. (32-01-T1, commit 1173292)

2. **VAAPI detection probed the wrong path.** `server-encoder-detect.mjs`
   probed `ffmpeg -encoders | grep h264_vaapi` — but Chromium's WebRTC
   encoder doesn't go through ffmpeg. The host has VAAPI via libva
   (`intel-media-va-driver` + `renderD128`) but ffmpeg lacked the
   h264_vaapi build, so detection fell back to x264-software.
   - **Fix:** New `probeLibvaRuntime()` checks for `libva.so.2` at four
     candidate paths. `detectAvailableEncoders()` now returns
     `["vaapi", "x264-software"]` on this hardware (was `["x264-software"]`).
     Encoder fallback chain: nvenc > vaapi > videotoolbox > x264-software
     (Phase 31 D-A4 preserved). (32-01-T1, commit 1173292)

3. **`fpsTarget` was a ghost field.** The schema persisted `fpsTarget`
   but the publisher hardcoded `frameRate: { ideal: 60, max: 60 }` in
   `getDisplayMedia` regardless. Operator could not actually cap the
   stream.
   - **Fix:** New `streamFpsCap` field in `serverRendering` schema with
     enum `[30, 45, 60, 0]` (0 = native/no cap, default 60). Publisher's
     `buildInPagePublisherScript` interpolates `effectiveStreamFpsCap`
     into the `frameRate` constraint. Bitrate scales proportionally
     (30→8 Mbit/s, 45→12 Mbit/s, ≥60→16 Mbit/s). Align-mode boost (D-A2)
     wired via 250 ms polling loop that calls `applyConstraints` to
     bump `frameRate` to cap-max during align-mode drag, snaps back
     when idle. (32-01-T2 + 32-01-T3, commits e47b373 + f15c5b4)

4. **Operator UI** in System & Performance > Server-side Rendering panel:
   4-radio Stream FPS Cap fieldset (30 / 45 / 60 / Native) + Align-Mode
   Boost checkbox. Persists via `/api/live/command` →
   `validateServerRenderingPatch` → `config/global-defaults.json`,
   server-authoritative (Phase 13 + h41/h42 pattern). (32-03)

### Block B — Connection Stability (root-cause-first)

The research uncovered three independent causes of the cold-boot fail-mode:

1. **`MAX_RECONNECT_ATTEMPTS = 10` hard cap.** The Pi receiver gave up
   after 10 failures and showed an error overlay. The cold-boot race
   (producer takes 4-8s to register, consume hold is 8s) easily exhausted
   the 10 slots before the producer was actually up.
   - **Fix:** Removed the hard cap. New `RECONNECT_BACKOFF_MS = [1000,
     2000, 5000, 10000, 30000]` schedule (D-B2 — adaptive backoff with
     forever-retry, LAN-only justifies no give-up). Last value (30000)
     repeats indefinitely. `attempts` count persists in sessionStorage
     (`ssr-reconnect-state` key) so page-reloads don't reset to a 1s
     rapid-fire storm. After connection ≥30s stable, `attempts` resets
     to 0. (32-02-T2, commit 496b3d3)

2. **No producer-readiness gate.** Pi receiver dove into WebRTC signaling
   without checking whether the SSR-tab producer was actually up.
   Cold-boot race fired the storm before the producer could register.
   - **Fix:** New `/api/ssr/ready` endpoint in `server.mjs` returns
     `{ready: bool, reason: string}`. Pi-side `waitForProducer()` polls
     this before the first `tryConnect()` (with WS event fast-path —
     server broadcasts `producer-ready` on producer-up so Pi doesn't
     have to poll if it's already connected). Eliminates the producer-
     startup race at root. (32-02-T1, commit b147dcd)

3. **No server-side proactive boot-cleanup.** Stale mediasoup state from
   a previous run (after crash / kill -9) could survive into the new boot,
   causing producer/transport conflicts.
   - **Fix:** `purgeStaleMediasoupWorker()` in `ssr-mediasoup-router.mjs`
     runs in `server.mjs` boot BEFORE `bootMediasoupRouter()`. Terminates
     any leftover worker process, frees ports, ensures clean slate.
     (32-02-T3, commit 7acf16b)

4. **Pi-side status overlay** (D-B3 = B2=a). New `showCountdownReconnect`
   exported from `receiver-status-ui.js` paints "RECONNECTING — Xs (attempt N)"
   countdown text. `markConnectionStable` + `evaluateOverlayHide` hide
   the overlay once connection has been stable ≥5 s. (32-02-T3, commit 7acf16b)

---

## Test summary

| Stage | Total | Pass | Skip | Fail |
|-------|-------|------|------|------|
| Phase 31 closure (h46) | 215 | 211 | 4 | 0 |
| Phase 32 W0 (after) | 263 | 217 | 46 | 0 |
| Phase 32 01 (after) | 267 | 243 | 24 | 0 |
| Phase 32 02 (after) | 268 | 264 | 4 | 0 |
| Phase 32 03 (after) | **274** | **270** | **4** | **0** |

**59 new tests added** covering Block A (encoder detect, Xvfb args, schema,
publisher integration, FPS presets, settings UI round-trip) and Block B
(producer-ready endpoint + Pi gate, reconnect-backoff schedule, boot
cleanup, status overlay, cold-boot reconnect repro). All Phase-31 hotfix
tests (h12-h46) preserved inside the 270 passing.

---

## Goal-backward exit criteria — automated coverage

| Exit criterion | Automated | Manual UAT |
|----------------|-----------|------------|
| Stream FPS ≥40 on Pi | code wired (cap=60 default + VAAPI on Raptor Lake-P + Xvfb 120Hz) | required (#1) |
| Real-time align-drag | code wired (boost loop) | required (#2 — subjective) |
| Cold-boot stable ×10 | unit tests for /api/ssr/ready + waitForProducer + boot purge | required (#3) |
| Pi-reload stable ×10 | unit tests for sessionStorage backoff + countdown | required (#4) |
| Tests green | 270/0/4 PASS | n/a |

---

## Outstanding (Pi-hardware UAT)

See `32-HUMAN-UAT.md`. Five scenarios deferred to live operator testing:

1. FPS lift measurable on hardware (≥30 fps floor, ideally ≥45 with VAAPI)
2. Align-mode drag fluidity (subjective "real-time" perception)
3. Cold-boot stable ×10 cycles (10 server-restarts, no stuck-reconnect)
4. Pi-reload stable ×10 cycles (10 page-reloads, sessionStorage survival)
5. Pi VC4 1080p@60 decode budget (`droppedVideoFrames` ratio < 1%)

---

## Self-Check: FAILED-AT-MANUAL-UAT (closure 2026-05-08)

Automated coverage complete (270/0/4) but manual UAT 2026-05-08 reproduced
the original failure mode (image-hang + persistent reconnect-loop) despite
12 nightly hotfixes (h1-h12, h4 reverted). Phase closed FAILED-AT-MANUAL
and connection-stability work escalated to **Phase 33 — Connection
Stability Deep Dive**. See `32-CLOSURE-ADDENDUM.md` for the full hotfix
log + outstanding items + diagnostic-artifact inventory.

Tag: `phase-32-closed-failed-manual` (replaces `phase-32-delivered-to-uat`).

---

*Phase: 32-ssr-stream-performance-connection-stability · Phase Summary · FAILED-AT-MANUAL-UAT · closed 2026-05-08 · superseded by Phase 33*
