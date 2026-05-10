---
phase: 34
phase_id: 34
title: Phase 34 — Post-UAT Reality Check + Hotfixes h1/h2
status: CLOSED-PARTIAL-WITH-DEFERRED-WORK
closed: 2026-05-10
supersedes: 34-CLOSURE.md (status: CLOSED-PASS-WITH-DEFERRED-PI-UAT — premature)
---

# Phase 34 — Closure Addendum (post-UAT reality)

## TL;DR

Phase 34's first /output/ UAT exposed two bugs my automated verification missed:

1. **`resolveOutputRoleFromLocation` missed `/ssr`** — Track B updated `getRuntimeEnvironment` (one of two pathname classifiers in `runtime-env.js`) but the parallel function `resolveOutputRoleFromLocation` was not updated. Result: SSR Chromium tab booted in `OUTPUT_ROLE_CONTROL` (dashboard mode) instead of `OUTPUT_ROLE_FINAL`, captured stream showed the operator dashboard view, and full dashboard orchestration ran in the SSR tab pegging the CPU. **Hotfix h1 (`fd8a92d`)** added `/ssr` to the FINAL classification.

2. **Track A T1 GL-flag decoupling caused a Phase-33-class main-thread hang** — the hypothesis "decouple `--ignore-gpu-blocklist`/`--enable-gpu-rasterization` from VAAPI to fix banding" was correct in motivation but wrong on this hardware. Mesa-llvmpipe under Xvfb has the same synchronous-flush behavior as VAAPI did, just routed through GPU paint paths instead of the encode pipeline. Server logs showed `cdp-ping-timeout-4s` (exact Phase-33 symptom), getDisplayMedia frame pump stalled, consumers hung in CONNECTING. **Hotfix h2 (`5557e70`)** reverted the GL-flag decoupling to the Phase 33 baseline (gated on `hasVaapiEnabled`).

3. **`output.html` had wrong stylesheet path** (`/styles.css` vs `/src/styles.css`) — same h2 commit fixed it.

## What's actually delivered (post-h2 reality)

| Item | Status | Notes |
|------|--------|-------|
| Track A T1: GL-flag decoupling | **REVERTED (h2)** | Caused Phase-33-class hang on operator hardware |
| Track A T2: ssr-stats renderMode telemetry | LANDED | Harmless, useful for diagnostics |
| Track A T3: force-renderMode=gl on /ssr + SSR carve-out | LANDED | Marginal effect since GL flags are gated on VAAPI off; renderer still falls to 2D |
| Track B: server-side path split (/output/, /ssr) | LANDED | Confirmed working |
| Track B: thin output.html | LANDED | Stream playback works, BUT align-mode visuals are missing (deep-coupling to dashboard polygon-editor not loaded) |
| Track B: ssr-render-host /ssr migration | LANDED | Both sites updated |
| Track B: runtime-env classifier for /ssr | LANDED + h1 fix | h1 added the missed second classifier |
| Phase 33 connection-stability | **PASS — no regression** | 72/0 D-06 gate green throughout |
| Solid-color banding fix (Phase 34's stated goal) | **NOT FIXED** | Source-side render limitation; encoder-bitrate is not the lever |

## Banding investigation findings

Live-tested via Playwright against running server: screenshots at 2 Mbps and 32 Mbps encoder bitrate are visually identical. **The banding originates in the SSR-tab canvas render, not in H264 encoding.** Without GPU hardware acceleration (which causes hangs on this Mesa-llvmpipe + Xvfb hardware), Chrome's 2D canvas falls back to 8-bit-per-channel software rendering. Solid-color overlays with non-1.0 opacity blend in 8-bit space, producing visible step-bands in the gradient transitions the operator reported.

**Real fixes (deferred to Phase 35 scope discussion):**
- Source-side dithering in the 2D-canvas color-overlay path
- Try `--use-gl=swiftshader` instead of `--use-gl=angle` (different software GL backend, may not have the synchronous-flush issue)
- Re-enable `SSR_ENABLE_VAAPI=1` only after confirming the operator's hardware can handle it (one workstation may differ from another)

## Outstanding work for Phase 35 (per user direction)

The user explicitly requested Phase 35 to be a comprehensive refactor:

1. **Thin /output/ + working align-mode** — decouple `runtime-projection-handle-ui.js` (1756 LOC) + `runtime-projection-handle-drag.js` (941 LOC) from the dashboard's runtime-orchestration init chain so they can be loaded standalone in `output.html`. Today they require many injected refs (grid-state, applyTransform, profileSaveFlow, ctx, etc.).
2. **Banding fix** — pick one of the three real-fix paths above and implement.
3. **Live-sync minimal subset extraction** — extract the WebSocket-trigger-event subscription that the audio binder needs, isolate from runtime-orchestration so output.html doesn't need to load the full dashboard for that either.

## What I got wrong

The auto-advance pipeline reported "PHASE COMPLETE" before live UAT. The plan-checker passed all 11 dimensions. The verifier passed all automated must_haves. The 16 Wave-0 rails were GREEN. **None of that caught the two real bugs**, because:
- The contract tests asserted code shape, not user-visible behavior
- No live `/output/` smoke-test ran with both Tracks landed
- The Track B "atomic D-04" plan listed `runtime-env.js` updates but only enumerated `getRuntimeEnvironment`; the parallel `resolveOutputRoleFromLocation` was never named, never tested
- The Track A T1 hypothesis was tested in isolation (chrome-flag merge unit test) but never lived under load

Phase 35 plan should add a **live-end-to-end smoke test** as a wave-0 rail before any code change.

## Tag

`phase-34-closed-partial` — set after this addendum is committed.
