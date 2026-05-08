---
phase: 32
phase_id: 32
title: SSR Stream Performance + Connection Stability
slug: ssr-stream-performance-connection-stability
status: FAILED-AT-MANUAL-UAT
status_detail: "delivered to UAT 2026-05-07; 12 post-UAT hotfixes (h1-h12) applied 2026-05-07/08 night; manual UAT 2026-05-08 reports image-hang + persistent reconnect-loop — connection stability NOT achieved. Phase superseded by Phase 33 (Connection Stability Deep Dive)."
delivered_to_uat: 2026-05-07T20:00:00Z
hotfix_window_start: 2026-05-07T22:00:00Z
hotfix_window_end: 2026-05-08T05:00:00Z
manual_uat_outcome: 2026-05-08T07:00:00Z
closed: 2026-05-08T08:00:00Z
superseded_by: phase-33-connection-stability-deep-dive
tags: [ssr, webrtc, mediasoup, h264, reconnect-storm, connection-stability, hotfix-audit, failed-at-manual-uat, supersede]
---

# Phase 32 Closure Addendum — FAILED AT MANUAL UAT

**Date:** 2026-05-08
**Outcome:** FAILED-AT-MANUAL-UAT — Block A (FPS Lift) and Block B (Connection Stability) automated coverage was complete (13/13 PASS, test suite 270 pass / 0 fail), but the manual Pi-hardware UAT scenario "Cold-boot stable ×10" + "Pi-reload stable ×10" reproduced the original symptom: persistent reconnect-loop with image-hang. Twelve nightly hotfixes (h1-h12) materially improved the path but did **not** eliminate the regression. Phase 32 is **closed as failed-at-manual** and connection-stability work is escalated to a dedicated **Phase 33** with deeper analysis + comprehensive testing.

---

## What Phase 32 Delivered (Automated PASS)

Block A — Stream FPS Lift:
- Xvfb `-fakescreenfps` arg (later h3-tuned to 60Hz)
- Chromium VAAPI libva runtime probe
- `serverRendering.streamFpsCap` schema (30/60/90/120/Native)
- Publisher cap-wiring + reactive align-mode boost
- System & Performance UI controls

Block B — Connection Stability:
- `/api/ssr/ready` producer-readiness gate
- `MAX_RECONNECT_ATTEMPTS` hard-cap removed
- Adaptive backoff [1s, 2s, 5s, 10s, 30s] forever-retry
- `sessionStorage` backoff state survives reload
- "RECONNECTING — Xs (attempt N)" countdown overlay
- Server-side proactive boot mediasoup-worker purge

**Test suite at delivery:** 274 total / 270 pass / 0 fail / 4 skipped.

---

## Post-UAT Hotfix Window 2026-05-07 22:00 → 2026-05-08 05:00 (12 hotfixes, h4 reverted)

User reported three regressions after Phase-32 closure:
1. "RECONNECTION — 0s (attempt 1) steht jetzt dauerhaft oben und verschwindet nicht!" (overlay stuck)
2. FPS still ~25, drag in align-mode laggy
3. "die outside sandstorm animation bei nemesis Lockdown A ist eine mp4 Animation - die bleibt schwarz"

Twelve hotfixes were applied autonomously across the night per user delegation ("Spawne so viel researcher und debugger wie du brauchst — mache eigenständig tests um das Problem nachzuvollziehen und zu isolieren und löse das Problem"):

| # | Commit  | Fix                                                                                          |
|---|---------|----------------------------------------------------------------------------------------------|
| h1 | ff9e186 | overlay visibility — `hidden` attribute vs `style.display` mechanism conflict                |
| h2 | aff08c6 | revert `qualityPreset` from `high-quality` to `balanced` (Phase-32 unauthorized deviation)   |
| h3 | ee3852c | Xvfb `-fakescreenfps 120` → `60` + per-5s rAF/track-fps diag log                             |
| h4 | a774180 | `--use-gl=egl` → `--use-gl=angle` for Chrome 131 GPU-process crash — **REVERTED 97d4dd3**    |
| h5 | 9b12ea4 | connect race — `waitForProducer` moved BEFORE `monitorInterval = setInterval(...)`           |
| h6 | 9162bc0 | `tryConnectInFlight` flag replaces `reconnectAttempts === 0` monitor guard                   |
| h7 | b26daac | wrap entire `tryConnect()` body in try/catch/finally for in-flight cleanup                   |
| h8 | 775d1b3 | force `useSimulcast = false` — Phase-32 VAAPI false-positive caused 3-layer SW encode       |
| h9 | c7fc99b | re-apply `--use-gl=angle --use-angle=default` (after h7 try/finally bulletproofing)         |
| h10 | c7fc99b | scope `connectionsByAddr.set` to `role === "consumer"` — h38 stale-guard killed ssr-tab WS  |
| h11 | c7fc99b | countdown UX past 0s — show "Connecting… (attempt N)" instead of frozen "0s"                |
| h12 | 7ab856a | bounded WS-open 10s timeout (matches publisher + per-RPC ceiling)                           |

**Connection-establishment path post-h12 — all timeouts bounded:**
- WS open: 10s (h12)
- Server produce-hold: 8s (h19, Phase 31)
- Per-RPC ceiling: 15s
- Backoff schedule: 1s → 2s → 5s → 10s → 30s forever-retry
- Worst-case broken-network → next retry: ~10s (vs ~75s pre-h12)

**Live-boot verification** (isolated worktree, T+70s stable): producer up at T+5s, `/api/ssr/ready={"ready":true}`, encoder=vaapi simulcast=single-layer, qualityPreset=balanced bitrate=8M, no errors/disconnects.

---

## Manual UAT 2026-05-08 (FAILED)

User report after waking up: *"Aktuell hängt das Bild und es kommt wieder zu dauerhaften Verbindungsabbrüchen — so ist es unter keinen Umstände nutzbar."*

Despite the 12 hotfixes + 70s isolated-worktree green test, the production-Pi UAT still reproduces the failure mode. Static analysis + isolated-boot is insufficient — the problem requires **live multi-cycle Pi-hardware testing** to root-cause.

---

## Why Phase 32 is Closed FAILED Instead of Re-Hotfixed Again

Twelve hotfixes in one night did not close the gap. Continuing to apply h13/h14/… in this phase risks:
1. **Hotfix fatigue** — each hotfix targets a single symptom but the underlying contract is unclear. We need a written contract first.
2. **No reproducible test harness** — Phase 32's automated tests pass but don't reproduce the live failure (because they isolate concerns instead of stressing the full WebRTC + mediasoup + Chrome 131 + VC4 pipeline under cold-boot conditions).
3. **No "best practices" baseline** — we are reverse-engineering Chrome 131 + mediasoup behavior from logs. A research pass for production WebRTC reconnect best-practices (e.g. Twilio/Daily/Jitsi patterns) is overdue.

Phase 33 will give the connection stability problem the full GSD treatment: discuss → research (best-practices) → plan with isolation tests → execute → verify with multi-cycle live UAT.

---

## Outstanding Items Carried into Phase 33

1. **Image-hang** under reconnect — symptom reported 2026-05-08
2. **Persistent reconnect loop** under unknown trigger (cold-boot? specific timing?) — not fully isolated
3. **mp4 outside sandstorm animation black** — not yet root-caused (h9 GPU-process fix may have helped but unconfirmed)
4. **FPS still observed at ~25** under load — h8 single-layer simulcast may have helped on hardware but unconfirmed
5. **BUG-B (rare)** — ssr-tab WS close doesn't trigger `scheduleRestart` in some paths (carried from `phase-32-connect-head-trace.md`)
6. **purgeStaleMediasoupWorker** = system-wide pkill — collateral kill risk (deployment-only issue, low priority but worth fixing)

---

## Diagnostic Artifacts Available for Phase 33

Five debug docs written autonomously during the hotfix window:

- `.planning/debug/phase-32-connect-baseline-p31.md` — Phase-31 stable-boot reference
- `.planning/debug/phase-32-connect-head-trace.md` — HEAD failure-trace + root-cause analysis
- `.planning/debug/phase-32-connection-comprehensive-audit.md` — full Phase-31→HEAD audit
- `.planning/debug/phase-32-connection-broken-research.md` — h5/h6 connect-race research
- `.planning/debug/phase-32-connection-broken-debug.md` — h6/h7 in-flight flag live debug

These are **mandatory inputs** for Phase 33 research/planning.

---

## Phase 32 Final Test Snapshot

| Stage                  | Total | Pass | Skip | Fail |
|------------------------|-------|------|------|------|
| 32-W0 (after)          | 263   | 217  | 46   | 0    |
| 32-01 (after)          | 267   | 243  | 24   | 0    |
| 32-02 (after)          | 268   | 264  | 4    | 0    |
| 32-03 (after, delivered) | 274 | 270  | 4    | 0    |
| Post-h12 (closure)     | 274   | 270  | 4    | 0    |

Test suite stayed green through all 12 hotfixes. **The green tests do not reflect the live failure** — this is the central gap Phase 33 must close.

---

## Closure Tag

Updated tag: `phase-32-closed-failed-manual` (replaces previous `phase-32-delivered-to-uat`).

---

*Phase: 32-ssr-stream-performance-connection-stability · Closure Addendum · FAILED-AT-MANUAL-UAT · 2026-05-08 · Superseded by Phase 33*
