---
phase: 34
plan: A
subsystem: ssr-chrome-flags, ssr-telemetry, runtime-gl-renderer, runtime-orchestration
tags: [gl-flag-fix, vaapi-decouple, 2d-fallback-ban, render-mode-telemetry, d01, d02, d05, d06]
dependency_graph:
  requires: [34-W0, 34-B]
  provides: [gl-flags-decoupled, ssr-2d-ban, render-mode-telemetry-sink]
  affects: [ssr-render-host, ssr-webrtc-signaling, runtime-orchestration, runtime-projection-gl-renderer]
tech_stack:
  added: []
  patterns: [hasIgpuDev-device-gate, window-hint-state-clamp, periodic-log-throttle]
key_files:
  created:
    - .planning/phases/phase-34/34-A-D06-VERIFICATION.md
  modified:
    - src/server/ssr-render-host.mjs
    - src/server/ssr-webrtc-signaling.mjs
    - src/app/runtime/runtime-orchestration.js
    - src/app/runtime/viewport/runtime-projection-gl-renderer.js
decisions:
  - "hasIgpuDev (DRI device presence only) decoupled from hasVaapiEnabled (device + SSR_ENABLE_VAAPI env); GL-helpful flags gated on hasIgpuDev"
  - "VAAPI default-disabled carry-forward (D-06 lock): SSR_ENABLE_VAAPI=1 is still the only re-enable path"
  - "renderMode force via window.__ttBeamerForceRenderMode hint set in /ssr marker block; clamped after state construction"
  - "SSR context-loss branch tightened with console.error + __ttBeamerSsrGlHardFailed escalation flag; Phase 30 B2 h10 path preserved for dashboard + /output"
  - "Telemetry throttled to every 10th ssr-stats message (~1 log line per 10s) to avoid log flooding (T-34-A-03 mitigated)"
metrics:
  duration_seconds: 225
  completed: "2026-05-10"
  tasks_completed: 4
  tasks_total: 4
  files_created: 1
  files_modified: 4
---

# Phase 34 Plan A: Track A — GL-flag fix + 2D-fallback ban on /ssr + render-mode telemetry sink Summary

GL-helpful Chrome flags decoupled from VAAPI gate (hasIgpuDev vs hasVaapiEnabled), /ssr 2D-fallback banned with hard-fail escalation, renderMode forced to "gl" on /ssr boot, and server-log telemetry sink emitting `[ssr-stats] renderMode=<value>` every 10s.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Decouple hasIgpuDev from hasVaapiEnabled — add unconditional GL flags | d41a449 | src/server/ssr-render-host.mjs |
| 2 | ssr-stats renderMode telemetry sink — periodic server log line | d4013ed | src/server/ssr-webrtc-signaling.mjs |
| 3 | Force renderMode='gl' on /ssr + ban 2D-fallback on /ssr only | 0563f62 | src/app/runtime/runtime-orchestration.js, src/app/runtime/viewport/runtime-projection-gl-renderer.js |
| 4 | D-06 hard-gate verification (auto-approved checkpoint) | 1469153 | .planning/phases/phase-34/34-A-D06-VERIFICATION.md |

## Files Modified

- **src/server/ssr-render-host.mjs** — Replaced single `hasIgpu` (VAAPI-gated) with `hasIgpuDev` (DRI-device-only) + `hasVaapiEnabled` (DRI + env-var). `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` now gated on `hasIgpuDev`. VAAPI features (`VaapiVideoEncoder` etc.) still gated on `hasVaapiEnabled`. Phase 33 commit 3cd6748 carry-forward intact.
- **src/server/ssr-webrtc-signaling.mjs** — Added `ssrStatsLogCounter` (function-scoped) and logging inside the `ssr-stats` handler: every 10th message emits `logger.info('[ssr-stats] renderMode=<value>')`. Existing `state.ssrStats` / `state.ssrStatsAtMs` storage unchanged.
- **src/app/runtime/runtime-orchestration.js** — Added `window.__ttBeamerForceRenderMode = "gl"` inside the `/ssr` marker block; added post-state-construction clamp `state.renderMode = window.__ttBeamerForceRenderMode` so `__ttBeamerEffectiveRenderMode()` returns `"gl"` on /ssr boot.
- **src/app/runtime/viewport/runtime-projection-gl-renderer.js** — Tightened `else if (isSsrTab)` branch: `console.error` + `window.__ttBeamerGlLossCount` surface + `window.__ttBeamerSsrGlHardFailed = true` after 6 losses (2× `_GL_MAX_CONTEXT_LOSSES`). Phase 30 B2 h10 `_glPermanentlyDisabled = true` path preserved intact for `!isSsrTab`.

## Wave-0 Rail Test Transition (Track A)

| Test file | Total | RED→GREEN (Track A) | Remaining RED |
|-----------|-------|---------------------|---------------|
| phase-34-chrome-flags.test.mjs | 5 | 3 | 0 |
| phase-34-render-mode-probe.test.mjs | 2 | 1 | 0 |
| **Track A total** | **7** | **4** | **0** |

**Phase 34 all-rails status after Track A:**

| Test file | Total | Status |
|-----------|-------|--------|
| phase-34-route-split.test.mjs | 4 | GREEN (Track B) |
| phase-34-runtime-env.test.mjs | 5 | GREEN (Track B) |
| phase-34-thin-output-script-graph.test.mjs | 7 | GREEN (Track B) |
| phase-34-chrome-flags.test.mjs | 5 | GREEN (Track A) |
| phase-34-render-mode-probe.test.mjs | 2 | GREEN (Track A) |
| **TOTAL** | **23** | **16/16 rails GREEN** |

## All-Tests Suite Delta

| Metric | W0 Baseline | After Track B | After Track A | Delta from W0 |
|--------|-------------|---------------|---------------|---------------|
| pass   | 350         | 362           | 366           | +16           |
| fail   | 16          | 4             | 0             | -16           |
| skip   | 17          | 17            | 17            | 0             |

## D-06 Hard Gate Status: PASS

Connection-stability suite (`node --test "test/connection-stability/*.test.mjs"`):
- **0 fail** (unchanged from W0 baseline — D-06 gate satisfied)
- 72 pass / 0 fail / 13 skip (non-live run; 13 live tests require `RUN_LIVE_TESTS=1` + running server + Chromium)

No connection-stability regression. All Track A changes are surgical: constant rename in ssr-render-host.mjs, new counter + log line in ssr-webrtc-signaling.mjs, window-hint + state-clamp in runtime-orchestration.js, SSR branch tightening in gl-renderer.

## D-05 Manual Smoketest Status: INCONCLUSIVE

Visual smoketest requires live server + gaming-PC desktop browser + operator. Not run in automated executor context.

**What Track A delivers for the smoketest:**
1. `--ignore-gpu-blocklist` + `--enable-gpu-rasterization` now added when `/dev/dri/renderD128|D129` exists (regardless of VAAPI). If iGPU DRI device is present, ANGLE reaches it rather than SwiftShader.
2. `state.renderMode = "gl"` forced on `/ssr` boot → `__ttBeamerEffectiveRenderMode()` returns `"gl"` (not `"2d"`).
3. Server stdout shows `[ssr-stats] renderMode=gl` every ~10s once SSR tab is running.

**If banding persists:** check `/dev/dri/renderD128` exists on server (`ls /dev/dri/`); check `webglRenderer` string in ssr-stats — if "llvmpipe" is shown, ANGLE reached software path; if banding is encoder artifact (not render-mode issue), escalate to encoder investigation (RESEARCH §A2).

## Server-Log Evidence (expected format)

```
[ssr-stats] renderMode=gl
```
(appears every 10th ssr-stats message at 1s probe cadence = ~every 10s)

## Deviations from Plan

### None — plan executed exactly as specified.

All edits match the plan's `<action>` blocks precisely:
- Task 1: exact constant rename + split as specified
- Task 2: counter + `% 10 === 1` throttle + `logger.info` call as specified
- Task 3: window hint + state clamp in orchestration; `else if (isSsrTab)` branch replacement with `_GL_MAX_CONTEXT_LOSSES * 2` hard-fail as specified
- Task 4: verification doc + auto-approval per auto_chain_mode

## Known Stubs

None. All code is functional:
- `window.__ttBeamerForceRenderMode` is set + consumed before first GL draw frame
- `ssrStatsLogCounter` is declared in the right scope (same function as `logger`)
- `window.__ttBeamerSsrGlHardFailed` is a real escalation flag (operator must watch for it in DevTools)
- The D-05 visual smoketest is INCONCLUSIVE, not FAIL — the automated preconditions are all met

## Threat Flags

No new threat surfaces beyond those in the plan's threat_model (T-34-A-01 through T-34-A-05). All mitigations applied as documented:
- T-34-A-01 (`--ignore-gpu-blocklist`): documented in code comment; failure mode = GPU process crash → Phase 33 watchdog respawns tab
- T-34-A-02 (renderMode in log): no PII; operator-only server stdout
- T-34-A-03 (log flood): throttled to every 10th message (ssrStatsLogCounter % 10 === 1)
- T-34-A-04 (window globals): same-origin only; /ssr is localhost-only
- T-34-A-05 (VAAPI gate): hasVaapiEnabled semantics unchanged; phase-32-encoder-detect-vaapi.test.mjs regression coverage confirmed GREEN

## Hand-Off Note to Verification Phase

Track A shipped GL-flag decoupling, /ssr 2D-fallback ban, and renderMode telemetry. If banding persists in spite of renderMode=gl, escalate to encoder investigation (RESEARCH §A2) — but the GL-flag fix is net-positive regardless. The visual smoketest (D-05) is the remaining open item for the operator.

## Self-Check: PASSED

Files modified:
- src/server/ssr-render-host.mjs: FOUND (d41a449)
- src/server/ssr-webrtc-signaling.mjs: FOUND (d4013ed)
- src/app/runtime/runtime-orchestration.js: FOUND (0563f62)
- src/app/runtime/viewport/runtime-projection-gl-renderer.js: FOUND (0563f62)
- .planning/phases/phase-34/34-A-D06-VERIFICATION.md: FOUND (1469153)

Commits:
- d41a449: FOUND
- d4013ed: FOUND
- 0563f62: FOUND
- 1469153: FOUND
