---
phase: 40
slug: ssr-align-mode-cleanup
status: CLOSED
closed: 2026-05-16
predecessor: phase-39-closed (commit 392fadb)
tag: phase-40-closed
---

# Phase 40 — SSR + Align-Mode Cleanup & Settings Retirement

## TL;DR

Comprehensive cleanup of the SSR + align-mode codebase after the Phase 31–39
experimentation cycle. Removed the GL-backend selector (Mesa-only), retired
five Settings → System sections, deleted the dead alignModeBoost and in-stream
audio code paths, collapsed the per-board renderMode plumbing, and quieted
the noisiest steady-state server logs. No new test regressions.

**Test status:** 408 tests, 388 pass, 1 fail (pre-existing `04-T3 receiver-bootstrap
setReconnectDetail` baseline failure unrelated to Phase 40), 19 skipped.
**Smoke test:** Server boots clean, `/`, `/output/`, `/api/global-defaults`
all 200.

## Settings UI removed

| Section | Removed because |
|---|---|
| **Render mode (/output/)** | obsolete since SSR pivot — /output/ is a thin stream consumer, doesn't decide GL/2D locally |
| **GL backend (SSR-Tab)** | SwiftShader path was broken and Mesa is universal on Linux (llvmpipe fallback inside the Mesa stack itself) |
| **MP4 performance controls** | tier/render-cap/quality-floor/degrade/recover were pre-SSR adaptive-quality knobs; the adaptive feedback loop stays inside `runtime-perf.js` but locked to the "balanced" tier with no UI tuning |
| **Boost stream FPS during align-mode drag** | publisher polling loop on `__TT_BEAMER_STATE_FOR_DIAG__.alignMode` removed; stream runs at the configured `streamFpsCap` |
| **Use in-stream audio** | always disabled in the UI, Pi-local audio is the only path; D-D2 reversal addendum is moot |

The **Show diagnostic overlay** checkbox stayed — operator requirement — but
moved to its own minimal `<h2>Diagnostics</h2>` section under System.

## Code removed / collapsed

### State / persistence

- `state.renderMode` removed from `runtime-state.js`, `runtime-board-profiles.js`,
  `runtime-global-defaults.js`, `runtime-snapshot-helpers.js`,
  `runtime-live-sync-core.js`, `output-align-mode.js`, `output-align-mode-loader.js`,
  `boot-handle-ui.js`, and the legacy server-side `next.renderMode` field in
  `server.mjs:saveGlobalDefaults`.
- `normalizeRenderMode`, `setRenderMode`, `syncRenderModePanel`,
  `RENDER_MODE_LABELS`, `getRenderMode`, `__ttBeamerForceRenderMode` — all deleted.
- `state.runtimePerf.mp4Controls` persistence + `mp4Performance` envelope key
  removed. `getMp4PerformanceControls()` now returns frozen balanced defaults.
- `normalizeMp4PerformanceTier`, `normalizeMp4PerformanceControls`,
  `updateMp4PerformanceControls`, `syncMp4PerformanceControlsPanel` — deleted.

### Server-side

- `SUPPORTED_GL_BACKENDS`, `RUNTIME_SYSTEM_PATH`, `loadRuntimeSystem`,
  `saveRuntimeSystem`, `detectIgpuDev`, `/api/system/info`,
  `/api/system/gl-backend` POST endpoint — all removed from `server.mjs`.
- `config/runtime-system.json` deleted (only held `glBackend` key).
- `ssr-render-host.mjs`: GL-backend resolve logic (lines 515–538) removed;
  `--use-angle=default` hardcoded. Dead `SSR_FORCE_WEBGL` commentary stripped.
- `ssr-server-rendering-config.mjs`: `AUDIO_ROUTE_VALUES`,
  `ALIGN_MODE_BOOST_DEFAULT`, `alignModeBoost` + `audioRoute` schema keys —
  all removed. Defaults shrunk from 7 keys to 5.
- `ssr-stream-publisher.mjs`: align-mode-boost polling loop + fps-diag
  every-5s log — removed. Publisher script is now ~25 lines shorter.
- `gl-backend-panel.js` (frontend module) — deleted entirely.

### Log restructuring

- `[ssr-stats] renderMode=gl` (Phase 34 D-01 telemetry) — was every 10s
  identical-value spam at steady state. Now logged only on **transitions**
  (GL context loss/recovery) with `(was X)` context.
- `[ssr-publisher] fps-diag rafFps=...` — every 5s diagnostic, removed.
- `[align-grid-snapshot] server-recv` — kept (proof-of-decode signal for
  phase-38-w10 tests) but only fires during active align-mode drag, not
  steady-state.
- `[align-drag] received phase=...` — now gated behind `SSR_ALIGN_DEBUG=1`.
- SSR-tab console forwarding (`[ssr-tab:log] ...`) — warn/error always
  forwarded; info/log gated behind `SSR_TAB_CONSOLE_VERBOSE=1`.

## What stays

- 2D-fallback renderer (`runtime-projection-2d-fallback-renderer.js`) — kept as
  the auto-fallback when GL fails to init on operator hardware. The earlier
  Phase 39 attempt to retire it was reverted (commit `e21b6a2`) and is now
  formally accepted as the policy.
- The `runtime-perf.js` adaptive feedback loop (`recordRuntimeFrameCost`,
  `shouldSkipRoomMp4Frame`, etc.) — still drives quality scaling at frame
  time, just locked to balanced defaults. No operator-tunable knob.
- The `ssrStats.renderMode` field from the SSR-tab telemetry — still surfaced
  in the receiver diagnostic overlay (`SSR mode=...`). `__ttBeamerEffectiveRenderMode()`
  is the source; values are now `gl`, `gl-failed`, or `gl (loss xN)`.

## Test changes

- `test/ssr-server-rendering-config.test.mjs` rewritten — `AUDIO_ROUTE_VALUES`
  no longer exported; tests no longer assert audioRoute or alignModeBoost.
- `test/phase-32-fps-baseline.test.mjs` — Baseline 3 (alignModeBoost in
  defaults) removed.
- `test/phase-32-server-rendering-config.test.mjs` — A5a/b/c
  alignModeBoost-validation tests + A6/A7 alignModeBoost assertions removed.
- `test/phase-32-fps-presets.test.mjs` — A3c/A3d alignModeBoost publisher
  polling tests removed.
- `test/phase-32-settings-ui.test.mjs` — A3, A5 alignModeBoost UI tests
  removed; A1/A2 stripped of toggle assertions; A6 ref cleanup.

## What was NOT changed

- WebRTC signaling reassembly (Phase 38 W10) — byte-identical.
- Phase 39 D-01/D-02/D-03 fixes — unchanged.
- Connection-stability guards (Phase 33 VAAPI default-disabled, Phase 32
  retry backoff) — preserved.
- Profile persistence schema — `renderMode` field silently dropped on the
  read side; older profile files still parse without error.

## Operator UAT

- Server smoke-test: `/`, `/output/`, `/api/global-defaults` all 200.
  `/api/global-defaults` JSON no longer contains `renderMode`.
- Settings → System tab now shows: Diagnostics, Server-side Rendering,
  Mobile Performance-Checks. The five removed sections are gone.
- Real-hardware UAT (align-mode drag + profile load/save) deferred to the
  operator; no behavior changes expected since the removed knobs were either
  dead or had no observable effect at their default values.

## Tag

`phase-40-closed` at the cleanup commit.
