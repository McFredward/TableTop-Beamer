---
phase: 34
phase_id: 34
title: SSR Render-Quality + /output/ Thin-Consumer Refactor — Closure
status: PASS-AUTOMATED-PENDING-PI-HARDWARE
closed: 2026-05-10T01:10:00Z
test_board: nemesis-lockdown-a
---

# Phase 34 Closure

## Outcome

Phase 34 delivered both tracks in full: Track B atomically split the server routing so `/ssr` serves the full SSR-tab app (index.html) and `/output` serves a new thin consumer (output.html), eliminating the render pipeline from the Pi kiosk path; Track A decoupled the iGPU-device detection from the VAAPI gate so GL-helpful Chrome flags are now added whenever a DRI device is present, forced `state.renderMode = "gl"` on the `/ssr` route, and banned the 2D-fallback in the SSR-tab. All 16 Wave-0 contract rails are GREEN. The D-06 connection-stability hard gate passes: 84/0/1 with `RUN_LIVE_TESTS=1`. Pi-hardware visual UAT (CPU measurement, banding visual on Pi, Pi reload stress) is deferred to when hardware is available, following the Phase 33 PASS-AUTOMATED-PENDING-PI-HARDWARE precedent.

## What Phase 34 Delivered

### Track B — URL split + thin consumer
- `/ssr` route added; SSR Chromium tab navigates here (was /output?ssr=1).
- `/output` and `/output/final` now serve the new thin `output.html` (was index.html).
- `runtime-env.js` classifies pathname `/ssr` as `server-ssr` so the GL renderer's permanent-disable threshold is correctly skipped (the cascade RESEARCH §Pitfall 2 warned about).
- `output.html` is a thin entry: video, splash, banner, error overlay, diagnostic chip, plus 4 script tags (runtime-env, receiver-bootstrap, output-audio-binder, inline diagnostic-chip rAF). NO render pipeline, NO decoders, NO orchestration.
- `output-audio-binder.js` (NEW, ~145 lines): minimal live-sync WS subscriber (`/api/live/ws?role=final-output`), plays `animation.sound` paths via HTMLAudioElement voice pool (max 4 per asset), exponential-backoff reconnect `[500, 1000, 2000, 5000, 10000, 30000]` ms.
- Legacy `?ssr=1` query retained as quiet tolerance — no consumer emits it but classifying stale links as `server-ssr` is the safe direction.

### Track A — GL flag fix + 2D-fallback ban + telemetry
- `hasIgpuDev` decoupled from `hasVaapiEnabled` in `ssr-render-host.mjs`.
- GL-helpful Chrome flags `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` added unconditionally on `hasIgpuDev` (default-on when /dev/dri/renderD128 or /dev/dri/renderD129 exists, regardless of VAAPI opt-in).
- VAAPI features still gated on `SSR_ENABLE_VAAPI=1` — D-06 default-disabled lock UNCHANGED.
- On `/ssr`, `state.renderMode` forced to `"gl"` so `__ttBeamerEffectiveRenderMode()` returns `"gl"` — a string explicitly NOT containing `"2d"`.
- On `/ssr`, the 2D-fallback is banned (D-02 LOCKED): GL renderer logs LOUD on context loss + escalates `window.__ttBeamerSsrGlHardFailed = true` after 6 losses (2× `_GL_MAX_CONTEXT_LOSSES`). Phase 30 B2 h10 fallback is preserved on dashboard + `/output` (the unchanged paths).
- `ssr-stats` handler's `renderMode` field is now logged to server stdout every 10th message: `[ssr-stats] renderMode=<value>` (D-01 telemetry). Throttled to prevent log flooding.

## Test Snapshot

| Stage | Pass | Fail | Skip |
|-------|------|------|------|
| Pre-Phase-34 (master, commit 51d787b) | 343 | 0 | 17 |
| Wave 0 (rails added) | 350 | 16 | 17 |
| After Track B (commit 9006c4b) | 362 | 4 | 17 |
| After Track A (commit 1469153) | 366 | 0 | 17 |
| After Phase-34 close (this commit) | 366 | 0 | 17 |

Connection-stability live tests:
| Stage | Pass | Fail | Skip |
|-------|------|------|-------|
| Phase 33 close / Phase 34 start (pre-Wave-0) | 84 | 0 | 1 |
| After Wave 0 | 84 | 0 | 1 |
| After Track B | 84 | 0 | 1 |
| After Track A | 84 | 0 | 1 |
| Phase 34 close (this verification, RUN_LIVE_TESTS=1) | 84 | 0 | 1 |

Notes:
- Non-live connection-stability (without RUN_LIVE_TESTS=1): 72 pass / 0 fail / 13 skip throughout (12 live tests become skips; consistent baseline).
- The 1 skip in live mode = "1-hour steady-state" test requiring `RUN_LONG_TESTS=1` (separate from live tests flag).

## Files Touched

Source:
- `server.mjs` (Track B Task 1 — `resolveStaticPath` route split; commit ad18c68)
- `src/app/lib/shared/runtime-env.js` (Track B Task 1 — getRuntimeEnvironment /ssr classifier; commit ad18c68)
- `src/app/runtime/runtime-orchestration.js` (Track B Task 3 — data-ssr-tab pathname-aware; Track A Task 3 — `__ttBeamerForceRenderMode = "gl"` set on /ssr; commits fe57cd7, 0563f62)
- `src/server/ssr-render-host.mjs` (Track B Task 3 — ssrUrl + page.goto → /ssr; Track A Task 1 — hasIgpuDev/hasVaapiEnabled split + GL flags decoupling; commits fe57cd7, d41a449)
- `src/server/ssr-webrtc-signaling.mjs` (Track A Task 2 — ssr-stats renderMode log; commit d4013ed)
- `src/app/runtime/viewport/runtime-projection-gl-renderer.js` (Track A Task 3 — /ssr 2D-fallback ban + hard-fail escalation; commit 0563f62)

New:
- `output.html` (Track B Task 2 — thin /output/ entry; commit b0c8c99)
- `src/app/runtime/output-receiver/output-audio-binder.js` (Track B Task 2 — thin live-sync audio binder; commit b0c8c99)

Tests (new — Wave 0):
- `test/phase-34-route-split.test.mjs` (W0 Task 1; commit aad4fad)
- `test/phase-34-runtime-env.test.mjs` (W0 Task 1; commit aad4fad)
- `test/phase-34-chrome-flags.test.mjs` (W0 Task 2; commit bcfb7ac)
- `test/phase-34-thin-output-script-graph.test.mjs` (W0 Task 2; commit bcfb7ac)
- `test/phase-34-render-mode-probe.test.mjs` (W0 Task 2; commit bcfb7ac)

Planning docs (new — Wave 0, Track B, Track A, Verification):
- `.planning/phases/phase-34/34-W0-PRECHECK.md` (W0 Task 3; commit cc59941)
- `.planning/phases/phase-34/34-B-D06-VERIFICATION.md` (Track B Task 4; commit 9006c4b)
- `.planning/phases/phase-34/34-A-D06-VERIFICATION.md` (Track A Task 4; commit 1469153)
- `.planning/phases/phase-34/34-VALIDATION.md` (V Task 1 — populated; commit a48e363)
- `.planning/phases/phase-34/34-VERIFICATION.md` (V Task 1 — new; commit a48e363)
- `.planning/phases/phase-34/34-HUMAN-UAT.md` (V Task 2 — new; commit 763a068)
- `.planning/phases/phase-34/34-CLOSURE.md` (V Task 3 — new; this commit)

## Outstanding (Pi-hardware UAT)

See `34-HUMAN-UAT.md` §Deferred. Four scenarios deferred:
1. Pi browser /output visual rendering parity (P1)
2. Pi /output CPU-Verbrauch measurement vs pre-Phase-34 — thin consumer expected to significantly reduce CPU (P2)
3. Pi solid-color banding visual smoketest (P3)
4. 10× Pi-reload connection-stability repro on actual Pi (P4)

## Self-Check: PASS-AUTOMATED-PENDING-PI-HARDWARE

All automated gates satisfied:
- 366 pass / 0 fail / 17 skip (full suite, post-Phase-34)
- 84 pass / 0 fail / 1 skip (connection-stability with RUN_LIVE_TESTS=1 — D-06 hard gate)
- All 16 Phase-34 Wave-0 rails GREEN
- VAAPI default-disabled carry-forward confirmed (phase-32-encoder-detect-vaapi.test.mjs GREEN)

Pi-hardware UAT deferred per Phase 33 precedent (33-CLOSURE.md pattern).

Tag recommendation: `phase-34-delivered-to-uat` (now — automated coverage complete + Phase 34 close documented). `phase-34-end` tag to be applied after Pi UAT completes (P1-P4 above).
