---
phase: 31
slug: server-side-rendering-pivot
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `31-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node --test` (Node built-in test runner) |
| **Config file** | none — uses default discovery `test/**/*.test.mjs` |
| **Quick run command** | `node --test "test/**/*.test.mjs"` |
| **Full suite command** | `node --test "test/**/*.test.mjs"` (same — small enough) |
| **Estimated runtime** | ~2-5 seconds (current 40/40) + ~5-10 seconds for new SSR tests |

---

## Sampling Rate

- **After every task commit:** Run `node --test "test/**/*.test.mjs"`
- **After every plan wave:** Run full suite + Wave-0 audio smoke if SSR/audio paths touched
- **Before phase verification:** Full suite must be green + complete manual UAT (11 scenarios)
- **Max feedback latency:** ~10 seconds (full suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-00-* | 00 | 0 | M2 + D-D2 | — | Audio capture works in headful Chromium under Xvfb | smoke | `bash scripts/wave0-environment-check.sh` + `node test/ssr-audio-capture-smoke.test.mjs` | ❌ W0 | ⬜ pending |
| 31-01-* | 01 | 1 | M3 | T-31-V5 | SSR tab launches deterministically, no zombie processes | smoke | `node test/ssr-render-host-lifecycle.test.mjs` | ❌ W0 | ⬜ pending |
| 31-02-* | 02 | 2 | M4 | T-31-V5 | WebRTC signaling validates payload, mediasoup transport stable | unit + smoke | `node test/ssr-webrtc-signaling.test.mjs` | ❌ W0 | ⬜ pending |
| 31-03-* | 03 | 3 | M5 + D-C4 | — | Pi receiver detects disconnect via three indicators | unit + manual | `node test/ssr-receiver-disconnect-detection.test.mjs` + UAT 3+4 | ❌ W0 | ⬜ pending |
| 31-04-* | 04 | 4 | D-D1 + D-X7 | T-31-V5 | Align-corner-drag validated server-side, active-animations restored across restart | unit + manual | `node test/ssr-state-restore.test.mjs` + UAT 5+8 | ❌ W0 | ⬜ pending |
| 31-05-* | 05 | 5 | hard constraint | — | Phase-30 hotfixes correctly gated for SSR vs Pi | unit | `node --test "test/**/*.test.mjs"` (existing 40/40 stays green) | ✅ existing | ⬜ pending |
| 31-06-* | 06 | 6 | M7 | — | End-to-end UAT on Pi: ≥20 fps, all 11 scenarios pass | manual UAT | UAT scenarios 1-11 + 30min soak | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**Wave-0 is the BLOCKING audio-capture / environment-validation gate.** Per
RESEARCH.md § "Audio-Capture Risk Assessment", these tests/scripts must pass
before any downstream wave starts:

- [ ] `scripts/wave0-environment-check.sh` — verify Xvfb, Chromium, ffmpeg,
  ALSA/PipeWire, mediasoup native compile, VAAPI device available
- [ ] `test/ssr-audio-capture-smoke.test.mjs` — covers M2 / D-D2 / audio
  feasibility gate (play `resources/sounds/alarm.mp3` in tab, capture
  via puppeteer-stream, verify ffmpeg decode produces non-silent waveform)
- [ ] `test/ssr-render-host-lifecycle.test.mjs` — covers M3 (mocked Xvfb +
  puppeteer.launch + page.goto + tab health-check)
- [ ] `test/ssr-state-restore.test.mjs` — covers D-X7 / M6 (round-trip
  `config/runtime-active-animations.json` write + read + filter expired)
- [ ] `test/ssr-webrtc-signaling.test.mjs` — covers signaling protocol
  contract (mocked mediasoup; payload validation per V5 ASVS)
- [ ] `test/ssr-receiver-disconnect-detection.test.mjs` — covers D-C4
  three-indicator logic (WebRTC connectionState + last-frame timestamp +
  heartbeat WebSocket)

**If Wave-0 audio-capture smoke FAILS:**
1. Try PulseAudio-loopback fallback (Plan A backup) — server has PipeWire
   1.0.5, supports loopback module.
2. If that also fails, escalate to user: "D-D2 audio-in-stream is not
   reliably achievable. Revisit decision: fall back to Pi-local audio
   path (the original recommendation)?"

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ≥20 fps on Pi /output/ | M4 / M7 | Pi VC4 GPU performance only measurable on real Pi 4 hardware | Open `/output/?board=nemesis-lockdown-a` on Pi, observe diagnostic chip fps display, confirm ≥20 (target ≥24) |
| Align-Mode 4-corner drag responsiveness | D-D1 | Real touchscreen input + Pi WLAN latency | Activate Align-Mode, drag each corner, verify smooth update with <150ms perceived lag |
| Audio + video sync | D-D2 | Real audio output, real beamer | Trigger animation with sound (e.g., alarm), confirm audio plays from server speakers AND syncs with stream visual |
| Server-restart auto-reconnect | D-C2 | Real network disruption | Kill `node server.mjs`, restart, verify Pi shows "Reconnecting…" banner then resumes within ~5s |
| WLAN drop reconnect | D-C3 | Real WLAN disruption | Disconnect WLAN, reconnect within 30s, verify stream resumes without manual reload |
| No black screen on disconnect (BINDING) | D-B4 user-constraint | Real disconnect scenarios | Kill server during stream, verify Pi shows explicit error UI within 3s, NEVER blank/black |
| Mesh-warp pixel-identity | hard constraint | Visual comparison only | Compare pre-pivot screenshot vs post-pivot, vertex points within ±2px tolerance |
| 30-min soak stability | M7 | Real long-running test | Run system for 30min on Pi, observe no fps degradation, no memory leaks (server `top`), no GL context loss in browser console |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 + all tests written)
- [ ] D-D2 audio capture VERIFIED (Wave 0 smoke PASS, NOT escalated)
- [ ] User-constraint "kein schwarzer Bildschirm" verified in 3+ disconnect scenarios

**Approval:** pending
