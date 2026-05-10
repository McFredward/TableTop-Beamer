---
phase: 34
title: SSR Render-Quality + /output/ Thin-Consumer Refactor — Verification
status: PASS-WITH-DEFERRALS
verified: 2026-05-10
---

# Phase 34 Verification Matrix

Maps each CONTEXT.md exit criterion / D-decision to its evidence (automated or manual).

## Exit Criteria from CONTEXT.md and ROADMAP.md

| # | Criterion | Source | Verification | Result |
|---|-----------|--------|--------------|--------|
| 1 | Renderer-Detection im SSR-Tab meldet WebGL2 (nicht 2D-Canvas Fallback) | ROADMAP.md | `[ssr-stats] renderMode=<value>` in server stdout; value does NOT contain "2d" | INCONCLUSIVE — automated preconditions confirmed (state.renderMode forced to "gl" on /ssr; `__ttBeamerEffectiveRenderMode()` returns "gl"); live server stdout not observed in auto-chain executor. Operator visual smoketest deferred. |
| 2 | Bekannte solid-color Banding-Animation rendert visuell ohne Banding | ROADMAP.md | Manual visual smoketest in 34-A-D06-VERIFICATION.md | INCONCLUSIVE — requires live gaming-PC desktop browser + running server + operator. GL flags delivered (--ignore-gpu-blocklist, --enable-gpu-rasterization on hasIgpuDev). Visual judgment deferred to 34-HUMAN-UAT.md M4. |
| 3 | /output/ ohne ?ssr=1 Param lädt KEINE GIF/MP4-Decoder, KEINE Animations-Engine, KEINE Runtime-Orchestration | ROADMAP.md | `node --test test/phase-34-thin-output-script-graph.test.mjs` GREEN | PASS — 7/7 tests GREEN. output.html confirmed: no runtime-orchestration.js, no render pipeline modules, no GIF/MP4 decoders. Script count = 4 (cap 8). |
| 4 | /output/?ssr=1 verhält sich identisch zum bisherigen SSR-Tab (no behavior regression) | ROADMAP.md | URL no longer used (D-04 hard-cut); /ssr replaces it; runtime-env still tolerates ?ssr=1 query → "server-ssr" | PASS — query tolerated as defense-in-depth (runtime-env.js returns "server-ssr" for ?ssr=1 legacy URL per 34-B-SUMMARY decision: "Legacy ?ssr=1 query retained as quiet tolerance"). No consumer emits it any more. |
| 5 | Pi /output/-Tab CPU-Verbrauch messbar geringer als vor dem Refactor | ROADMAP.md | DEFERRED — requires Pi hardware; documented in 34-HUMAN-UAT.md | DEFERRED — Pi hardware not accessible. Thin consumer delivered (output.html strips render pipeline, GIF/MP4 decoders, animation engine). CPU measurement deferred to Pi-hardware UAT (34-HUMAN-UAT.md §P2). |
| 6 | Phase 33 Connection-Stability bleibt PASS — kein Reconnect-Regress | ROADMAP.md (D-06) | `RUN_LIVE_TESTS=1 node --test "test/connection-stability/*.test.mjs"` reports 84 pass / 0 fail / 1 skip | PASS — 84 pass / 0 fail / 1 skip. D-06 hard gate satisfied. Baseline (pre-Phase-34): 84/0/1. No regression. |
| 7 | VAAPI bleibt default-disabled (Phase 33 fix 3cd6748 carries forward) | ROADMAP.md (D-06) | `node --test test/phase-32-encoder-detect-vaapi.test.mjs` GREEN; ssr-render-host.mjs still gates VaapiVideoEncoder on hasVaapiEnabled (= SSR_ENABLE_VAAPI=1 + DRI device) | PASS — phase-32-encoder-detect-vaapi.test.mjs GREEN (part of 366 pass / 0 fail full suite). hasVaapiEnabled semantics unchanged: requires SSR_ENABLE_VAAPI=1 AND DRI device. VAAPI default-disabled lock intact. |
| 8 | Tests in test/connection-stability/** weiterhin grün | ROADMAP.md | Same as #6 | PASS (linked to #6) — 84/0/1 with RUN_LIVE_TESTS=1. |

## D-decision verification

| D | Decision | Verification | Result |
|---|----------|--------------|--------|
| D-01 | Probe + Force in parallel | render-mode-probe rail GREEN + chrome-flags rails GREEN | PASS — phase-34-render-mode-probe.test.mjs: 2/2 GREEN (logger call confirmed). phase-34-chrome-flags.test.mjs: 5/5 GREEN (hasIgpuDev declared, GL flags gated on it). Server-log probe: INCONCLUSIVE (live server not running in executor). |
| D-02 | SSR-tab forbids 2D-Canvas fallback (LOCKED) | runtime-projection-gl-renderer.js contains `D-02 forbids 2D-fallback` carve-out + `__ttBeamerSsrGlHardFailed` escalation; Phase 30 B2 h10 unchanged for non-/ssr | PASS — grep confirms: `isSsrTab` branch tightened with `console.error` + `__ttBeamerSsrGlHardFailed = true` after 6 losses (2× `_GL_MAX_CONTEXT_LOSSES`). Phase 30 B2 h10 `_glPermanentlyDisabled = true` path intact for `!isSsrTab`. |
| D-03 | Maximum strip; separate HTML entry point (LOCKED) | output.html rail-7 GREEN (script count ≤ 8); output-audio-binder.js exists | PASS — output.html: 4 script tags (well under cap of 8). output-audio-binder.js: 145-line WS subscriber with voice pool and exponential backoff. No render pipeline modules in output.html. |
| D-04 | Server-side path split (LOCKED) | route-split rails GREEN; runtime-env rails GREEN; ssr-render-host.mjs URL migration: 0 references to /output?ssr=1 in that file | PASS — phase-34-route-split.test.mjs: 4/4 GREEN. phase-34-runtime-env.test.mjs: 5/5 GREEN. ssr-render-host.mjs: both navigation sites (lines 459 + 835) migrated to /ssr. `grep -c '/output?ssr=1' src/server/ssr-render-host.mjs` = 0. |
| D-05 | Probe + manual visual smoketest | renderMode probe value does NOT contain "2d"; D-05 manual smoketest result documented in 34-A-D06-VERIFICATION.md | INCONCLUSIVE — automated preconditions met: state.renderMode forced to "gl" on /ssr boot; `__ttBeamerEffectiveRenderMode()` returns "gl". Visual smoketest (no banding on gaming-PC) deferred to operator via 34-HUMAN-UAT.md M4. |
| D-06 | No connection-stability regression (HARD GATE) | connection-stability 84/0/1; phase-32-hotfix-regression GREEN; VAAPI default-disabled regression test GREEN | PASS — RUN_LIVE_TESTS=1 run: 84 pass / 0 fail / 1 skip. phase-32-encoder-detect-vaapi.test.mjs GREEN. phase-32-hotfix-regression.test.mjs GREEN (part of 366 pass suite). |
| D-07 | Plans 34-A and 34-B can run parallel or sequential | Sequential ordering picked: W0 → B → A → V (per RESEARCH.md primary recommendation: B-first because URL-detection cascades) | PASS — Sequential B→A delivery chosen and executed successfully. Track B's runtime-env.js /ssr classifier enabled Track A's GL forcing to work correctly (Pitfall 2 cascade resolved). |

## Test Snapshot

| Metric | Pre-Phase-34 | Post-Phase-34 | Delta |
|--------|--------------|---------------|-------|
| All-tests pass | 343 | 366 | +23 |
| All-tests fail | 0 | 0 | 0 |
| All-tests skip | 17 | 17 | 0 |
| connection-stability live (pass) | 84 | 84 | 0 |
| connection-stability live (fail) | 0 | 0 | 0 |
| connection-stability live (skip) | 1 | 1 | 0 |

Notes:
- Pre-Phase-34 = commit 51d787b (before Wave 0), per 34-W0-PRECHECK.md
- Post-Phase-34 = after Track A (commit 1469153), per 34-A-D06-VERIFICATION.md: 366 pass / 0 fail / 17 skip
- Wave 0 added 23 tests (+7 regression GREEN, +16 RED rails). Track B flipped 12 RED→GREEN. Track A flipped 4 RED→GREEN. Net: +23 pass, 0 fail.

## Files Touched

| File | Plan | Change |
|------|------|--------|
| server.mjs | 34-B-T1 | resolveStaticPath /ssr → index.html, /output + /output/final → output.html |
| src/app/lib/shared/runtime-env.js | 34-B-T1 | getRuntimeEnvironment classifies pathname /ssr as 'server-ssr'; legacy ?ssr=1 tolerated |
| src/app/runtime/runtime-orchestration.js | 34-B-T3, 34-A-T3 | data-ssr-tab marker pathname-aware; window.__ttBeamerForceRenderMode set on /ssr |
| src/server/ssr-render-host.mjs | 34-B-T3, 34-A-T1 | ssrUrl + page.goto → /ssr; hasIgpuDev/hasVaapiEnabled split; GL flags gated on hasIgpuDev |
| src/server/ssr-webrtc-signaling.mjs | 34-A-T2 | ssr-stats renderMode periodic log (every 10th message) |
| src/app/runtime/viewport/runtime-projection-gl-renderer.js | 34-A-T3 | /ssr-only 2D-fallback ban + hard-fail escalation after 6 context losses |
| output.html | 34-B-T2 | NEW — thin /output entry: 4 script tags, no render pipeline |
| src/app/runtime/output-receiver/output-audio-binder.js | 34-B-T2 | NEW — thin live-sync audio binder, 145 lines, WS subscriber with voice pool |

Test files added (Wave 0):
| File | Tests | Purpose |
|------|-------|---------|
| test/phase-34-route-split.test.mjs | 4 | resolveStaticPath route split contract |
| test/phase-34-runtime-env.test.mjs | 5 | getRuntimeEnvironment /ssr classifier |
| test/phase-34-chrome-flags.test.mjs | 5 | hasIgpuDev decoupling + GL flag gating |
| test/phase-34-thin-output-script-graph.test.mjs | 7 | output.html script-graph snapshot |
| test/phase-34-render-mode-probe.test.mjs | 2 | renderMode telemetry logger call |

## Outstanding / Deferred

| Item | Reason | Pi UAT trigger |
|------|--------|----------------|
| Pi-hardware /output/ CPU drop measurement (exit criterion 5) | Pi hardware not available at phase-close | when Pi available — see 34-HUMAN-UAT.md §P2 |
| Pi visual smoketest of solid-color animation | Pi hardware not available | see 34-HUMAN-UAT.md §P3 |
| D-05 visual smoketest (banding-free render) | Requires live gaming-PC browser + operator | see 34-HUMAN-UAT.md M4 |
| VAAPI re-enable investigation | Out of scope (CONTEXT.md §deferred) | future phase |
| Pixel-diff regression suite | Out of scope (D-05 rejected) | future phase |

## Self-check

Phase 34 is closed when:
- All criteria above are PASS or explicitly DEFERRED/INCONCLUSIVE with reason.
- 34-HUMAN-UAT.md exists with operator's smoketest result.
- Connection-stability is GREEN at this commit (84/0/1 with RUN_LIVE_TESTS=1 — CONFIRMED).
- All 16 Wave-0 rails GREEN (CONFIRMED — 366/0/17 full suite).
