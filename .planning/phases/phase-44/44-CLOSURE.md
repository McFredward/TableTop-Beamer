---
phase: 44
slug: ssr-always-on
status: CLOSED
closed: 2026-05-16
predecessor: phase-43-closed (commit fd8b4b0)
tag: phase-44-closed
---

# Phase 44 — Retire SSR_RENDER_HOST / SSR_PUBLISH env gates

## TL;DR

`SSR_RENDER_HOST=1 SSR_PUBLISH=1` env-var gating retired. SSR is the
only render path since Phase 40; the env vars have been dead toggles
ever since. `node server.mjs` (no env vars) now always boots:

- mediasoup router + WebRTC signaling
- Xvfb virtual display
- Chromium SSR tab
- In-page WebRTC publisher (injected on tab boot)
- Encoder auto-detect → resolveEncoderConfig

Operator no longer needs to remember the env-var incantation.

## Side note — frequent consumer disconnect cycles

Operator UAT 2026-05-16 confirmed **Hypothesis B** from my earlier
diagnosis: Chromium throttles background tabs aggressively, which
pauses the consumer's setInterval-based heartbeat-stale evaluator.
Once 8 s of heartbeats have visibly arrived (but the JS handler
hasn't run because the tab is throttled), the monitor fires
`heartbeat-stale` → reconnect storm. Foreground tab → no cycles in
10 minutes.

No code fix in this phase; it's a Chromium platform behavior.
Documented for future operator UAT — keep `/output/` in the
foreground or in fullscreen on the projector display where Chrome
doesn't background-throttle.

## Changes

| File | Before | After |
|---|---|---|
| `server.mjs:4448` | `if (process.env.SSR_RENDER_HOST === "1") { (async () => { ... } )() }` | Block opens unconditionally |
| `server.mjs:2296` | `if (process.env.SSR_RENDER_HOST === "1") { persistRunningAnimations ... }` | Always persist (debounced) |
| `server.mjs:1315` | `needsRestart = SSR_RENDER_HOST=="1" && ...` | Drop env-var conjunct |
| `src/server/ssr-render-host.mjs:849` | `if (process.env.SSR_PUBLISH === "1") { injectInPagePublisher ... }` | Always inject |
| `src/app/lib/ui/settings/server-rendering-panel.js` | Fallback text mentioned `SSR_RENDER_HOST=1` | Cleaner message |
| Doc comments | Several places mentioned the env vars | Updated / removed |

## Verification

`PORT=18870 node server.mjs` (no env vars) → boot log shows:
```
[default-animations] Pre-loaded 13 default animation(s) for board nemesis-board-a
[ssr-mediasoup] router up — codecs: H264 …
[ssr-env] Ready: YES
[ssr-host] available encoders: x264-software
[ssr-host] qualityPreset=extra-high bitrate=16000000 fpsTarget=30 keyframeIntervalSec=2
[ssr-host] streamFpsCap=60 effectiveStreamFpsCap=60
```
`/api/health` → 200.

Tests: 408 / 388 pass / 1 fail (pre-existing baseline, unrelated).

## What stays

- All Phase 40-43 cleanups: GL-backend retirement, mobile-perf
  retirement, board-scoped pre-load, dirty-flag fixes, settings
  panel state propagation, SSR defaults (extra-high/1080p/60), no
  cold-boot animation restore.
- The `SSR_PUBLISHER_WS_STALE_MS` env var (watchdog tuning) — not
  related to the retired gating.

## Tag

`phase-44-closed` at commit `9aab5d9` + closure commit.
