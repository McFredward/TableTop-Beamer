---
phase: 33
phase_id: 33
title: Connection Stability Deep Dive — Closure (Root Cause Found)
status: CLOSED-PASS-WITH-LIVE-FIX
closed: 2026-05-09T10:00:00Z
fix_root_cause_commit: 3cd6748
---

# Phase 33 Closure — Root Cause Was VAAPI

## TL;DR

**Symptom (user-reported):** /output/ shows briefly "connecting", then black screen, "RECONNECTING — Xs (attempt N)" countdown, retry, RECONNECTING, eventually GIVEN_UP. Loop repeats forever. Pi + gaming-PC desktop browser both affected.

**Root cause (found 2026-05-09 via live console + server log inspection):** Phase 32 introduced VAAPI hardware-encoder auto-detection on the SSR-tab Chromium. On Intel iGPU hardware, VAAPI's synchronous-flush calls inside Chromium's video encode pipeline blocked the SSR-tab's JS main thread for many seconds (60+s observed). During this freeze:

- Chrome DevTools Protocol probes (Phase 33's own watchdog!) timed out → watchdog killed the tab → endless restart loop.
- WebRTC RTP packets stopped flowing → consumer's H264 decoder stalled → consumer's `frame-stale` monitor fired → reconnect.
- WebSocket heartbeats stopped → consumer's monitor fired `heartbeat-stale` → reconnect.

Each reconnect attempt landed on a tab that was either dying or just-restarted, perpetuating the loop.

**Fix (commit `3cd6748`, iter-4c):** Default-disable VAAPI in encoder selection AND in Chrome's `--enable-features` list. Software encoder (OpenH264/x264-software) does NOT have the synchronous-flush issue. Phase-31 SSR worked because Phase-31 didn't have VAAPI auto-pick. Opt-in via `SSR_ENABLE_VAAPI=1` env var.

```diff
- const hasIgpu = existsSync("/dev/dri/renderD128") || ...;
+ const hasIgpu = process.env.SSR_ENABLE_VAAPI === "1" &&
+                 (existsSync("/dev/dri/renderD128") || ...);
```

Cost: software-encoding uses ~2-4× more CPU than VAAPI at 8Mbps/30fps. Modern hardware handles this comfortably.

**Verification (Playwright + system Chrome with H264, Xvfb):**
- 60s sustained: PASS (currentTime advanced 0→43s linear, 0 reconnects, 0 monitor fires)
- Server log: ZERO `health ping failed` entries
- User confirmed connection stable on gaming PC desktop browser 2026-05-09

## What I chased (false leads)

Four iter-cycles before finding the root cause. Each addressed real bugs but NONE fixed the user's actual blocker:

| Iter | Commit | What | Why it didn't fix the user's issue |
|------|--------|------|-------------------------------------|
| iter-2 | dff8334 | frame-stale threshold 8s→30s | More tolerant for GIF-decode, but VAAPI freeze >30s anyway |
| iter-3 | 95bb485 | force keyframe on consumer resume | Real fix for second-consumer scenario, but moot under VAAPI freeze |
| iter-4 | 6586dd4 | heartbeat-reset + RPC timeout 10→20s + PLI burst + publisher periodic kf | Fixes heartbeat-stale-after-retry loop UX, but VAAPI freeze persists |
| iter-4b | e2ae15a | watchdog tolerance 3→30 ticks (15s→150s) + revert PLI burst + revert publisher periodic kf | Watchdog stopped killing the tab — but the freeze was still there |
| **iter-4c** | **3cd6748** | **default-disable VAAPI** | **THE ACTUAL FIX** |

Lesson: I should have looked at the **server stdout** much earlier. The very first `[ssr-host] health ping failed (X/3): Runtime.evaluate timed out` lines were diagnostic gold — they pointed directly at "SSR-tab is freezing." Instead I spent days on the consumer-side state machine. The user provided their server log only on day 2 of debugging. The root cause was visible from the first server log they shared.

## What landed (carries forward)

The earlier iter-fixes are still in master and provide real value beyond the immediate VAAPI fix:

- **iter-2 (frame-stale 30s)**: more tolerant of legitimate frame-pause scenarios (GIF decode in /output/ when consumer-side renders happen).
- **iter-3 (keyframe on resume)**: closes the second-consumer-on-same-producer keyframe gap.
- **iter-4 (heartbeat reset on retry)**: fixes the heartbeat-stale-after-retry instant-fail loop.
- **iter-4 (RPC timeout 10→20s)**: more headroom for slow consume RPCs.
- **iter-4b (watchdog 30 ticks tolerance + 4s per-ping timeout via Promise.race)**: prevents watchdog from killing healthy tabs during transient load bursts.

If a future commit re-enables VAAPI by default, these fixes are still net-positive defensive layers.

## Outstanding (deferred to Phase 34)

Two real issues the user identified after connection was restored — they are NOT connection bugs and need their own scope:

1. **GL → 2D fallback:** SSR-tab's runtime app picks 2D canvas instead of WebGL on this hardware (visible as banding artifacts in solid-color animations). Need explicit GL forcing in SSR-tab + harden Chrome GPU init flags.

2. **/output/ duplicates work:** Consumer page loads the FULL app (including GIF-decoder, animation engine, runtime-orchestration) instead of being a thin video+pointer-forwarding consumer. Needs split into two boot paths:
   - `/output/?ssr=1` (full app, runs in SSR-tab) — keep as-is
   - `/output/` (no param) — strip down to `<video>` + receiver-bootstrap + align pointer-forwarder

Phase 34 should pick these up.

## Final tag

`phase-33-end` (after closure commit). Tests still 364/347/0/17.
