---
phase: 31
phase_id: 31
title: Server-Side Rendering Pivot
slug: server-side-rendering-pivot
status: DELIVERED-TO-UAT
status_detail: "automated 9/9 PASS · manual 0/15 PENDING (Pi hardware required)"
test_board: nemesis-lockdown-a
started: 2026-05-06T08:35:00Z
delivered_to_uat: 2026-05-06T09:50:00Z
closed: null
tags: [ssr, server-side-rendering, webrtc, mediasoup, puppeteer, h264, thin-client, pi, publishability, d-d2-reversal, hotfix-audit, regression]

# Phase plans
plans:
  - { id: "31-00", name: "Wave 0 — bring-up + audio-capture smoke (D-D2 escalation)", status: "PASS (D-D2 reversed)" }
  - { id: "31-01", name: "Wave 1 — SSR render-host (Xvfb + headful Chromium + lifecycle)", status: "PASS" }
  - { id: "31-02", name: "Wave 2 — mediasoup H264 video-only Producer + signaling", status: "PASS" }
  - { id: "31-03", name: "Wave 3 — Pi /output/ thin-client receiver + reconnect/error UI", status: "PASS" }
  - { id: "31-04", name: "Wave 4 — align-mode round-trip + state-restore + serverRendering config", status: "PASS" }
  - { id: "31-05", name: "Wave 5 — Phase-30 hotfix audit + System & Performance UI + ?ssr-preview=1", status: "PASS" }
  - { id: "31-06", name: "Wave 6 — UAT preparation + acceptance matrix + closure documents", status: "DELIVERED-TO-UAT" }

# Phase milestones
milestones:
  M1: { name: "Discuss-phase closure", status: "DONE" }
  M2: { name: "Research-phase closure (Wave-0 audio-smoke escalated → D-D2 reversal)", status: "PARTIAL" }
  M3: { name: "SSR bring-up", status: "PASS" }
  M4: { name: "Stream transport (WebRTC h264 video-only)", status: "PASS" }
  M5: { name: "User-contract parity (align mode + layering)", status: "PASS-AUTOMATED, PENDING-MANUAL" }
  M6: { name: "Resilience (D-C4 + D-X7 + D-B4)", status: "PASS-AUTOMATED, PENDING-MANUAL" }
  M7: { name: "UAT ≥20 fps on Pi hardware", status: "PENDING (manual UAT)" }

# Hard constraints
hard_constraints:
  phase29_40_40: "PASS"
  phase12_layering: "PENDING (manual UAT 8)"
  phase13_server_auth: "PASS"
  phase19_27_align_features: "PENDING (manual UAT 9)"
  phase26_h9_gl_seam: "PENDING (manual UAT 9)"
  phase28_b6_overlay_sync: "PENDING (manual UAT 7)"
  phase30_b1_b2_b3: "PENDING (manual UAT 8, 9, 10)"
  D_B4_no_black_screen_BINDING: "PENDING (manual UAT 2-4, 12 — 4 disconnect scenarios)"

# Key artifacts
artifacts:
  - ".planning/phases/phase-31/31-CONTEXT.md (Discuss-phase closure, 14 decisions D-A1..D-X8)"
  - ".planning/phases/phase-31/31-RESEARCH.md (~80 KB; risk assessment + UAT strategy + audio-capture risk)"
  - ".planning/phases/phase-31/31-VALIDATION.md (test infrastructure + sampling rate + per-task verification map)"
  - ".planning/phases/phase-31/31-HOTFIX-AUDIT.md (Phase-30 T4..T16 server-keep / pi-only / regression-risk classification)"
  - ".planning/phases/phase-31/31-D-D2-REVERSAL-ADDENDUM.md (binding: audio = Pi-local; supersedes original D-D2)"
  - ".planning/phases/phase-31/31-VERIFICATION.md (phase-level acceptance matrix, status PARTIAL)"
  - ".planning/phases/phase-31/31-HUMAN-UAT.md (15 UAT scenarios for operator)"
  - ".planning/phases/phase-31/31-UAT-RESULTS.md (per-scenario detailed log template)"
  - "debug/p31-acceptance-output.json (machine-readable acceptance matrix)"
  - "debug/p31-acceptance-regression-output.json (alias not generated; the canonical file is p31-acceptance-output.json — orchestrator brief mentioned the alias but plan path uses the unsuffixed filename)"

# Test summary at delivery
tests:
  total: 137
  pass: 135
  fail: 0
  skip: 2
  exit_code: 0
  phase29_baseline_preserved: true
  phase31_added_tests: 97

# Server stack ready
boot_command: "cd /home/claw/tt-beamer && SSR_RENDER_HOST=1 SSR_PUBLISH=1 node server.mjs"
pi_url: "http://<server-ip>:4173/output/"
dashboard_url: "http://<server-ip>:4173/"
---

# Phase 31: Server-Side Rendering Pivot — Phase Summary

**Goal:** Pivot the Pi 4 from renderer to thin-display-client. Server (Lenovo IdeaCentre Mini, Intel Core 7 240H, 32 GiB, Intel Raptor Lake-P iGPU) runs the entire render pipeline in headless Chromium (Xvfb + puppeteer-stream); Pi `/output/` consumes a single H264 WebRTC stream + Pi-local audio (D-D2 reversal). User-facing contracts (align mode, mesh-warp, layering, all animation types) preserved bit-for-bit by re-hosting the existing render pipeline in headless Chromium 1:1.

**Trigger:** Phase 30 plateaued at ~12 fps on Pi VC4 despite a 16-task optimisation wave (T1-T16). Per-frame load (`fx-canvas` + N rooms + Mesh-Warp + GIF putImageData + mp4 drawImage) exceeded the Pi-VC4 budget at 1920×1080.

**Test-Board:** Nemesis Lockdown Board A.

**Status:** **DELIVERED-TO-UAT** — automated gates PASS; manual UAT on Pi hardware pending.

---

## Wave Outcomes

### Wave 0 — Bring-up + audio-capture smoke (Plan 31-00)

- 4 of 5 tasks PASS automated.
- T0: package.json + mediasoup@3.19.22 + puppeteer@23.11.1 + puppeteer-stream@3.0.22 pinned.
- T1: `scripts/wave0-environment-check.sh` validates Xvfb/Chromium/ffmpeg/Node/PipeWire/DRI; PASS on dev box.
- T2/T2b: encoder auto-detection (`src/server/server-encoder-detect.mjs`) — 11/11 unit tests; priority order LOCKED `nvenc > vaapi > videotoolbox > x264-software`; x264-software ALWAYS appended (publishability).
- **T3 ESCALATED:** audio-capture smoke failed with `puppeteer-stream activeTab permission` error on Chrome 131 + headful Xvfb. 3 auto-fix attempts exhausted (file:// → http://, executablePath resolve, video:true). User decision 2026-05-06: **Plan B — revert D-D2 to Pi-local audio (researcher's original recommendation).** See `31-D-D2-REVERSAL-ADDENDUM.md`.
- Net effect: Wave 0 PASS via D-D2 reversal; `test/ssr-audio-capture-smoke.test.mjs` stays as future-feature scaffold (`t.skip()`).

### Wave 1 — SSR render-host (Plan 31-01)

- `src/server/ssr-render-host.mjs` — Xvfb spawn + headful Chromium launch + lifecycle (start/stop/restart) + CDP health-ping every 5 s + 3-fail (15 s) relaunch + exponential-backoff (1 s → 30 s cap).
- Boot diagnostic surface (publishability — CONTEXT.md 2026-05-06): `[ssr-host] available encoders: …`, `[ssr-host] encoder=… source=…`, `[ssr-host] qualityPreset=… bitrate=… fpsTarget=… keyframeIntervalSec=…`.
- Opt-in via `SSR_RENDER_HOST=1` — zero-impact-by-default.
- 16/16 logic tests + 1 opt-in real-launch test; total 78 tests at end of Plan 01.

### Wave 2 — Stream transport (Plan 31-02)

- `src/server/ssr-mediasoup-router.mjs` — mediasoup Worker + Router with **H264 video-only mediaCodecs (D-D2 reversal: NO audio/opus)**.
- `src/server/ssr-webrtc-signaling.mjs` — `/api/webrtc/signal` raw-WebSocket handler with V5 ASVS validators + role-based access (ssr-tab vs consumer); `'consume' kind=audio` returns `'audio-not-in-stream-use-pi-local-audio'` error.
- `src/server/ssr-stream-publisher.mjs` — in-page WebRTC publisher script with `getDisplayMedia({video:true, audio:false})` (D-D2 reversal); esbuild-bundled mediasoup-client browser blob (~218 KB) cached at `public/vendor/`.
- 3-RID simulcast (low/mid/high) per D-A3 with bitrate split derived from quality preset.
- Total 86 tests at end of Plan 02.

### Wave 3 — Pi thin-client receiver (Plan 31-03)

- `src/app/runtime/output-receiver/receiver-bootstrap.js` + `receiver-webrtc-client.js` + `receiver-status-ui.js`.
- Three-indicator disconnect detection (D-C4): `RTCPeerConnection.connectionState` + last-frame-via-`requestVideoFrameCallback` + heartbeat WS — ANY one >3 s triggers reconnect UI.
- D-B4 BINDING: every disconnect renders explicit reconnect banner OR error overlay with Retry button — never falls to black screen. Reason codes: `pc-failed | pc-disconnected | pc-closed | frame-stale | heartbeat-stale | host-down | ws-closed | bootstrap-load-failed`.
- TT-Beamer splash + `<video>` + reconnect banner + error overlay — 4 SSR overlay DOM slots in `index.html`, Phase-22 obsidian-themed in `src/styles.css`.
- D-D2 reversal preserved: existing `runtime-wire-room-audio-binders.js` STAYS ACTIVE on Pi `/output/` (verified by source grep + acceptance criterion).
- Total 98 tests at end of Plan 03.

### Wave 4 — Align-mode + persistence + config (Plan 31-04)

- D-D1 align-corner-drag round-trip: `attachInputForwarder` on Pi → WebSocket → `validateAlignCornerDragPayload` (V5 ASVS) → `align-corner-drag` mutation (intentionally coalescible) → server applies → SSR Chromium tab renders new mesh frame → Pi `<video>` shows update. Pitfall 6 SVG ghost provides <16 ms visual feedback.
- D-X7 active-anims persistence: `src/server/ssr-state-restore.mjs` — `loadSsrInitialState`, `persistRunningAnimations` (200 ms debounced), `filterExpired` (Phase-11-HF6 + Phase-12 contract verbatim), `flushRunningAnimations` (synchronous flush at SIGINT/SIGTERM).
- Publishability `serverRendering` config schema: 5 enum keys (encoder/qualityPreset/resolutionPreference/fpsTarget/audioRoute) in `config/global-defaults.json`. Phase-13 server-authoritative + 200 ms debounced writer pattern.
- D-D2 REVERSAL preserved: `audioRoute` enum stays `[in-stream, pi-local]`, default = `pi-local`; `in-stream` server-side branch is no-op until cross-platform audio-capture stabilises.
- Total 126 tests at end of Plan 04.

### Wave 5 — Phase-30 hotfix audit + System UI (Plan 31-05)

- `31-HOTFIX-AUDIT.md` — every Phase-30 hotfix T4..T16 classified: server-keep (T4/T13/T14/T16 — environment-agnostic or beneficial in both), regression-risk (T7+T15 GIF max-dim cap — gated), pi-only (T12 30 s warm timeout — gated), dashboard-only (T11 — already gated).
- `src/app/lib/shared/runtime-env.js` extended with `getRuntimeEnvironment()` returning `'pi' | 'server-ssr' | 'desktop'`; ARM-UA defense-in-depth clamps to `'pi'` regardless of URL.
- `runtime-gif-decoder.js` (T7+T15 cap) + `runtime-gif-playback.js` (T12 timeout) gated behind `getRuntimeEnvironment() === 'pi'`. Server keeps native GIF resolution → Pi `<video>` displays full-quality stream.
- System & Performance UI: new `<section id='settings-server-rendering'>` with 5 controls (encoder dropdown, presets, resolution, fps, audioRoute toggle) + Detected-encoders badge. `audioRoute` in-stream toggle DISABLED with tooltip per D-D2 reversal.
- `?ssr-preview=1` opt-in dashboard preview hook reuses receiver-bootstrap (Hybrid fallback per RESEARCH § Q3).
- Encoder change → `shutdownSsrRenderHost` + `bootSsrRenderHost` → Pi reconnect banner (D-C2 + D-B4).
- Total 137 tests at end of Plan 05.

### Wave 6 — UAT preparation + closure (Plan 31-06 — THIS WAVE)

- Automated 9/9 PASS gates: test suite green, Phase-29 40/40 baseline preserved, ssr-encoder-detect / ssr-state-restore / ssr-server-rendering-config / ssr-webrtc-signaling / ssr-receiver-disconnect-detection / runtime-env-environment unit tests PASS, schema-drift PASS.
- `debug/p31-acceptance-output.json` — machine-readable acceptance matrix (automated PASS-marked, manual PENDING-marked).
- `31-VERIFICATION.md` — phase-level acceptance matrix (M1-M7 + hard constraints + D-B4 + D-D2-reversal entries; status PARTIAL).
- `31-HUMAN-UAT.md` — 15 UAT scenarios (11 baseline + 3 publishability + 1 D-D2-reversal-NEW Scenario 15) with measurements, D-B4 audit table, performance targets, closure decision options.
- `31-UAT-RESULTS.md` — per-scenario detailed log template for operator.
- D-D2 reversal applied throughout: Scenario 6 RENAMED ("Audio plays from Pi-local Audio when triggered"); Scenario 15 NEW (audioRoute toggle graceful disabled-state).
- **Manual portion (Task 2 + Task 4)** deferred to operator on Pi hardware: 11+3+1 UAT scenarios + 30-min soak + closure decision.

---

## Architectural Outcome

| Property | Phase 30 (Pre-Pivot) | Phase 31 (Post-Pivot) |
|----------|----------------------|------------------------|
| Pi `/output/` render | full pipeline (fx-canvas + rooms + mesh-warp + GIF + mp4) | `<video>` element only (HW h264 decode via VC4) |
| Pi runtime state | full (animations, polygons, fx-config, mesh) | none (thin client; status overlays + Pi-local audio binders only) |
| Render location | Pi VC4 GPU | Server Intel Raptor Lake-P iGPU + headless Chromium |
| Render pipeline code | unchanged (re-hosted 1:1 in server's headless Chromium tab — Phase-26 h9 + Phase-27 mesh-warp + Phase-28 B5 asset hashes + Phase-30 T4..T16 hotfixes all preserved) |
| Stream transport | n/a (direct render) | WebRTC h264 video-only (mediasoup) |
| Audio | Pi-local HTML5-Audio + WebSocket trigger | **Pi-local HTML5-Audio + WebSocket trigger (UNCHANGED — D-D2 reversal)** |
| Resilience | n/a | D-C4 three-indicator + D-B4 explicit-UI + Plan-01 backoff relaunch + D-X7 active-anims persistence |
| User-facing contracts | Phase 12 / 13 / 19 / 26 / 27 / 28 / 29 / 30 active | identical contracts preserved (verified by code-grep + automated tests; manual UAT confirms on Pi hardware) |
| Multi-client | one renderer per client | one renderer total, fanned out to N consumers via mediasoup SFU |

## D-D2 Reversal Note

Per `31-D-D2-REVERSAL-ADDENDUM.md` (BINDING):
- Audio is Pi-local via WebSocket-Trigger (NOT in WebRTC stream).
- WebRTC stream is video-only.
- `audioRoute` enum retained as `[in-stream, pi-local]` for future feature flip; default = `pi-local`.
- `WAVE0_AUDIO_CAPTURE_VERIFIED` feature flag controls UI affordance + server validator gate.
- All 6 affected plans (00, 02, 03, 04, 05, 06) updated.
- Trigger: Wave-0 puppeteer-stream `activeTab permission` failure on Chrome 131 + headful Xvfb (3 auto-fix attempts exhausted).

## Closure Path

**Until manual UAT runs:**
- Phase 31 status remains `DELIVERED-TO-UAT`.
- 137-test baseline stays green; future plans/phases inherit this baseline.
- `runtime-active-animations.json` is the on-disk state-restore contract for SSR runs.
- Phase-30 stability hotfixes are gated correctly per `31-HOTFIX-AUDIT.md`.

**After manual UAT runs (operator):**
1. Operator runs all 15 scenarios + 30-min soak per `31-HUMAN-UAT.md`.
2. Operator fills `31-UAT-RESULTS.md` + replaces `PENDING_MANUAL` keys in `debug/p31-acceptance-output.json` with PASS/FAIL.
3. Operator updates `D_B4_no_black_screen` audit table (all 4 must be NO).
4. Operator records performance numbers in acceptance JSON.
5. Operator types one of: `close-pass` / `close-partial` / `reopen-wave-N`.
6. STATE.md decision log + ROADMAP.md Phase-31 row updated.
7. Tag: `phase-31-end` (CLOSE PASS) or `phase-31-end-partial` (CLOSE PARTIAL).
8. If `reopen-wave-N`, the corresponding Wave plan is re-opened for hotfix.

## Total Test Count Trajectory

- Phase 30 closure baseline: 40 tests (all pass)
- After Plan 31-00: 63 tests (57 pass + 6 skip)
- After Plan 31-01: 78 tests (73 pass + 5 skip)
- After Plan 31-02: 86 tests (83 pass + 3 skip)
- After Plan 31-03: 98 tests (96 pass + 2 skip)
- After Plan 31-04: 126 tests (124 pass + 2 skip)
- After Plan 31-05: 137 tests (135 pass + 2 skip)
- After Plan 31-06: 137 tests (135 pass + 2 skip) — Plan 06 is observation+documentation; no new tests.
- Phase-29 baseline 40/40 preserved throughout.

## Files Map (top-level)

### Server-side modules (new)
- `src/server/server-encoder-detect.mjs`
- `src/server/ssr-render-host.mjs`
- `src/server/ssr-state-restore.mjs`
- `src/server/ssr-server-rendering-config.mjs`
- `src/server/ssr-mediasoup-router.mjs`
- `src/server/ssr-webrtc-signaling.mjs`
- `src/server/ssr-stream-publisher.mjs`

### Pi receiver modules (new)
- `src/app/runtime/output-receiver/receiver-bootstrap.js`
- `src/app/runtime/output-receiver/receiver-webrtc-client.js`
- `src/app/runtime/output-receiver/receiver-status-ui.js`
- `src/app/runtime/output-receiver/receiver-input-forwarder.js`

### Settings UI module (new)
- `src/app/lib/ui/settings/server-rendering-panel.js`

### Shared helper extension
- `src/app/lib/shared/runtime-env.js` — extended with `getRuntimeEnvironment()`

### Hotfix gates (Plan 05)
- `src/app/runtime/render/runtime-gif-decoder.js` — T7+T15 cap gated to Pi
- `src/app/runtime/render/runtime-gif-playback.js` — T12 timeout gated to Pi

### Top-level wiring (modified)
- `server.mjs` — SSR boot block + signaling + state-restore + encoder-change-restart + mutation handlers
- `index.html` — SSR overlay DOM slots + System UI section
- `src/styles.css` — SSR overlay theme + canvas-hide rules + System UI section
- `src/app/runtime/runtime-orchestration.js` — receiver-bootstrap dynamic-import + ssr-preview hook + ctx forward
- `src/app/runtime/wire/runtime-wire-room-audio-binders.js` — System UI panel init invocation

### Config schema
- `config/global-defaults.json` — `serverRendering` 5-key block (D-D2 reversal: default `audioRoute='pi-local'`)

### Documentation
- `.planning/phases/phase-31/31-CONTEXT.md`
- `.planning/phases/phase-31/31-RESEARCH.md`
- `.planning/phases/phase-31/31-VALIDATION.md`
- `.planning/phases/phase-31/31-HOTFIX-AUDIT.md`
- `.planning/phases/phase-31/31-D-D2-REVERSAL-ADDENDUM.md`
- `.planning/phases/phase-31/31-{00..06}-PLAN.md` and `31-{00..06}-SUMMARY.md`
- `.planning/phases/phase-31/31-VERIFICATION.md`
- `.planning/phases/phase-31/31-HUMAN-UAT.md`
- `.planning/phases/phase-31/31-UAT-RESULTS.md`
- `.planning/phases/phase-31/31-SUMMARY.md` (this file)

### Acceptance artifact
- `debug/p31-acceptance-output.json`

---

## Self-Check: PASSED

Files verified at delivery time:
- `.planning/phases/phase-31/31-CONTEXT.md` — present
- `.planning/phases/phase-31/31-RESEARCH.md` — present
- `.planning/phases/phase-31/31-VALIDATION.md` — present
- `.planning/phases/phase-31/31-HOTFIX-AUDIT.md` — present
- `.planning/phases/phase-31/31-D-D2-REVERSAL-ADDENDUM.md` — present
- `.planning/phases/phase-31/31-{00..06}-PLAN.md` — all 7 present
- `.planning/phases/phase-31/31-{00..06}-SUMMARY.md` — all 7 present
- `.planning/phases/phase-31/31-VERIFICATION.md` — present
- `.planning/phases/phase-31/31-HUMAN-UAT.md` — present
- `.planning/phases/phase-31/31-UAT-RESULTS.md` — present
- `debug/p31-acceptance-output.json` — present, valid JSON

Test suite:
- `node --test "test/**/*.test.mjs"` — 137 tests / 135 pass / 0 fail / 2 skip / exit 0 (regression-free)
- Phase-29 baseline 40/40 still green within the 137-total

Tag pending: `phase-31-end` (CLOSE PASS) or `phase-31-end-partial` (CLOSE PARTIAL) — set by operator after UAT pass.

---

*Phase: 31-server-side-rendering-pivot · Phase Summary · DELIVERED-TO-UAT · 2026-05-06*
