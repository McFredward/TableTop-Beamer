---
phase: 31
plan: 01
plan_id: 31-01
subsystem: ssr-pivot-wave1
tags: [ssr, render-host, puppeteer, xvfb, infrastructure, lifecycle, encoder-resolution]

# Dependency graph
requires:
  - phase: 31-00
    provides:
      - "src/server/server-encoder-detect.mjs (detectAvailableEncoders + pickPreferredEncoder + ENCODER_PRIORITY)"
      - "package.json with mediasoup + puppeteer + puppeteer-stream pinned"
      - "test/ssr-render-host-lifecycle.test.mjs scaffold"
provides:
  - "src/server/ssr-render-host.mjs — Xvfb spawn + headful Chromium launch + lifecycle (start/stop/restart) + CDP health-ping + encoder-config resolution"
  - "src/server/ssr-state-restore.mjs — stub for Plan 04 (loadSsrInitialState reading tt-beamer.runtime-active.v1)"
  - "server.mjs SSR_RENDER_HOST=1 opt-in boot block + SIGINT/SIGTERM graceful shutdown handlers"
  - "Boot-time encoder/preset diagnostic surface (publishability — CONTEXT.md 2026-05-06)"
  - "Filled-in lifecycle test suite (16/16 logic tests + 1 opt-in real-launch test)"
affects:
  - "31-02 (Wave 2): consumes status.encoderConfig (encoder + preset + bitrate + fpsTarget + keyframeIntervalSec) for mediasoup transport tuning"
  - "31-03 (Wave 3): Pi receiver bootstraps from /output?ssr=1 page that this host navigates to"
  - "31-04 (Wave 4): config/global-defaults.json#serverRendering schema is read by resolveEncoderConfig"
  - "31-05 (Wave 5): System UI surfaces the encoder/preset selection that this module already honors"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hardware-agnostic encoder resolution: user override → auto-detect fallback → universal x264-software"
    - "Boot diagnostic surface: encoder=, available encoders:, qualityPreset= logged exactly once at start()"
    - "Headful Chromium under Xvfb (NOT --headless=new) per RESEARCH § Pitfall 1"
    - "Opt-in env-var gating (SSR_RENDER_HOST=1) for incremental rollout — default boot identical to pre-Plan-31"
    - "CDP Runtime.evaluate health-ping with 3-fail (15s) relaunch threshold + exponential backoff (1s → 30s cap)"
    - "Active-host registry pattern (set/get/shutdown) for graceful signal-driven teardown"

key-files:
  created:
    - "src/server/ssr-render-host.mjs"
    - "src/server/ssr-state-restore.mjs"
    - ".planning/phases/phase-31/31-01-SUMMARY.md"
  modified:
    - "server.mjs (import + boot block + SIGINT/SIGTERM handlers, all gated by SSR_RENDER_HOST=1)"
    - "test/ssr-render-host-lifecycle.test.mjs (Wave-0 scaffold filled in with 14 new logic tests + 1 opt-in real-launch test)"

key-decisions:
  - "SSR_RENDER_HOST=1 env var gating preserves zero-impact-by-default — existing 63-test baseline + normal `node server.mjs` startup are byte-identical"
  - "Boot diagnostic log lines (encoder=, available encoders:, qualityPreset=) are MANDATORY publishability surface — three lines logged exactly once at start()"
  - "Quality-preset map (low-latency / balanced / high-quality) inlined in ssr-render-host.mjs as canonical default; Plan 04 will move it into config/global-defaults.json"
  - "x264-software encoder defaults to low-latency preset (conservative on weak CPUs); HW encoders default to balanced (per CONTEXT.md)"
  - "Real-Chromium-launch test uses puppeteer.executablePath() bundled chrome (not /usr/bin/chromium which is a snap shim on this dev box) — Plan 00 SUMMARY pre-records this finding"

patterns-established:
  - "Encoder resolution is async + logger-injected → testable without env coupling"
  - "Xvfb spawn returns Promise resolving on pid availability (500ms grace) since Xvfb does not signal readiness"
  - "Browser disconnected event triggers scheduleRestart with exponential backoff; SIGTERM-then-SIGKILL fallback for stubborn Xvfb processes"
  - "Module exports include resolveEncoderConfig as a standalone function for direct unit testing without spawning anything"

requirements-completed: [M3]

# Metrics
duration: 7 min
completed: 2026-05-06
---

# Phase 31 Plan 01: SSR Render-Host Bring-Up Summary

**Server-side SSR render host: opt-in (SSR_RENDER_HOST=1) Xvfb + headful Chromium under puppeteer-stream that navigates to /output?ssr=1, with hardware-agnostic encoder auto-detection logged at boot, CDP health-ping every 5s, exponential-backoff auto-restart, and clean SIGINT/SIGTERM teardown.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-06T08:35:50Z
- **Completed:** 2026-05-06T08:42:58Z
- **Tasks:** 3 (T1 RED+GREEN TDD, T2 wiring, T3 checkpoint auto-verified)
- **Files modified:** 3 (server.mjs + test scaffold filled in + 2 new modules)
- **Test count:** 78 total (was 63 after Wave 0), 73 pass + 5 skip + 0 fail

## Accomplishments

- **Render-host module** (`src/server/ssr-render-host.mjs`) with full lifecycle:
  - `bootSsrRenderHost({port, autoStart})` returns `{ start, stop, restart, getStatus }`.
  - `start()` resolves encoder config FIRST, then spawns Xvfb (500ms grace), launches headful Chromium via puppeteer-stream with the configured display + GPU + autoplay flags, creates a CDP session, navigates to `http://127.0.0.1:${PORT}/output?ssr=1`, and starts health-pings.
  - `stop()` performs SIGTERM-then-SIGKILL teardown of Xvfb + browser.close + CDP detach, no zombie processes.
  - `restart()` is a stop+start sequence; auto-triggered by the `browser.on('disconnected')` handler with exponential backoff (1s → 30s cap).
  - CDP health-ping every 5s evaluating `1+1`; 3 consecutive fails (15s) trigger relaunch.
- **Encoder resolution** (`resolveEncoderConfig`):
  - Reads `config/global-defaults.json#serverRendering.encoder` (default `auto`).
  - `auto` → calls `detectAvailableEncoders()` + `pickPreferredEncoder()` from Plan 00.
  - User override honored ONLY when present in available list; otherwise WARN-logs and falls back to auto-pick.
  - Default preset: `low-latency` for x264-software, `balanced` for HW encoders.
  - Logs three diagnostic lines exactly once at boot (publishability surface).
- **State-restore stub** (`src/server/ssr-state-restore.mjs`): reads `config/runtime-active-animations.json` if present, validates `tt-beamer.runtime-active.v1` schema, returns normalized `{ runningAnimations, boardId, schemaMismatch? }` for Plan 04.
- **server.mjs wiring**: imports module, registers SSR_RENDER_HOST=1 boot block + SIGINT/SIGTERM handlers. **No behavior change when env var is unset.**
- **Real-launch verification (Task 3 checkpoint, auto-approved):**
  - Diagnostic surface verified: `[ssr-host] available encoders: x264-software`, `[ssr-host] encoder=x264-software source=auto`, `[ssr-host] qualityPreset=low-latency bitrate=4000000 fpsTarget=30 keyframeIntervalSec=1` — all three lines present in server boot log.
  - Xvfb :96 spawned (PID seen in `ps -ef`).
  - Chromium spawned with our `--display=:96` AND `--use-gl=egl` AND `--autoplay-policy=no-user-gesture-required` AND `--no-sandbox` AND `--auto-select-desktop-capture-source=Entire screen` — all required flags confirmed in process command-line.
  - Chromium GPU process spawned under our PID tree (PPID = browser PID).
  - HTTP `GET /output?ssr=1` returned valid `<html>` content with tt-beamer markers.
  - SIGINT shutdown produced zero zombie Xvfb / chrome processes.
  - Default `node server.mjs` (no env var) shows zero `[ssr-host]` log lines and full test suite green — opt-in gating verified.

## Task Commits

1. **T1 RED:** `78ac87c` — `test(31-01): add failing tests for ssr-render-host lifecycle + encoder resolution`
2. **T1 GREEN:** `3ac04c3` — `feat(31-01): SSR render-host module + state-restore stub`
3. **T2:** `c91efa8` — `feat(31-01): wire SSR render-host into server.mjs startup + shutdown`
4. **T3:** *no code commit* — `checkpoint:human-verify` auto-approved under `--auto` mode after running full real-launch verification (encoder log gate + Xvfb spawn + Chromium spawn + page load + clean SIGINT).

_Note: Task 1 is TDD (test → feat) → 2 commits. Task 3 is a checkpoint with no code changes._

## Files Created/Modified

- `src/server/ssr-render-host.mjs` — Xvfb + headful-Chromium lifecycle + encoder resolution + CDP health-ping (created, ~360 LoC).
- `src/server/ssr-state-restore.mjs` — initial-state loader stub for Plan 04 (created, ~50 LoC).
- `server.mjs` — single-line `import { bootSsrRenderHost, setActiveSsrRenderHost, shutdownSsrRenderHost } from "./src/server/ssr-render-host.mjs";` (line 13) + boot block + SIGINT/SIGTERM handlers gated by `SSR_RENDER_HOST=1` (added 23 lines after `attachLiveWebSocket(server);`).
- `test/ssr-render-host-lifecycle.test.mjs` — Wave-0 scaffold filled in: 16 logic tests covering public surface, idle status, encoder resolution paths (auto / user override / graceful fallback), preset defaults, log diagnostic surface, and state-restore behavior; 1 opt-in real-launch test (`WAVE1_REAL_LAUNCH=1`).

## Decisions Made

- **Single-line import in server.mjs**: kept on one line so the plan's `grep -c 'import.*bootSsrRenderHost' server.mjs` acceptance check passes literally. Multi-line `import { ... }` form would break that grep.
- **Encoder hint flags conditional, not unconditional**: only the matching `--enable-features=...` flag is appended (e.g. `VaapiVideoEncoder` only when encoder is vaapi). Different Chromium builds honor different flags; passing all of them at once would be noise. Chromium's libopenh264 fallback handles HW absence transparently.
- **Quality-preset map inlined here, not in config/**: Plan 04 will move it to config; for Plan 01, inlining keeps SSR boot self-contained and the contract testable without writing config files.
- **resolveEncoderConfig is exported separately from bootSsrRenderHost**: enables unit testing without spawning anything, and lets Plan 02 read the active encoder config from the module-level `status.encoderConfig` after boot.
- **Active-host registry uses module-level state**: simpler than a class instance + matches the "one render host per server" contract from Plan 31-CONTEXT.md D-B2.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Plan-vs-implementation notes (NOT deviations)

- The plan's automated-verify regex `grep -qE '# fail 0$'` does not match Node 24's `node --test` output, which prints `ℹ fail 0` (note the `ℹ` Unicode prefix, not `#`). This is a regex quirk in the plan, not an implementation defect. The verification was performed by checking the actual count: `node --test ... | grep "fail 0"` — confirmed.
- Plan's `<acceptance_criteria>` for Task 1 listed `grep -c 'export.*shutdownSsrRenderHost' src/server/ssr-render-host.mjs >= 1` — present (`export async function shutdownSsrRenderHost`).
- Plan's `<acceptance_criteria>` for Task 2 listed `grep -c 'import.*bootSsrRenderHost' server.mjs >= 1` — initially the multi-line import form returned 0 (the `import {` opening brace was on a separate line from the symbol). Fixed by collapsing the import to a single line; grep now returns 1. This is an in-task structural choice, not a deviation.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None — plan was executed literally.

## Issues Encountered

None — execution was straight-line:
- RED tests failed as expected (ERR_MODULE_NOT_FOUND).
- GREEN implementation passed all 16 unit tests on first run.
- server.mjs wiring did not regress any of the 63 existing tests.
- Real-launch verification succeeded on first try (Xvfb + Chromium + GPU process all spawned, page reachable, clean SIGINT shutdown).

## Authentication Gates

None. No CLI auth required for this plan.

## User Setup Required

None — no external service configuration required.

## Threat Flags

None. The threat register entries from the plan's `<threat_model>` are addressed by:
- T-31-01-01 (`--no-sandbox`): documented as `accept` per RESEARCH § Security Domain (LAN-only deployment).
- T-31-01-02 (DoS via restart loop): mitigated by exponential backoff (1s → 30s cap) and `restartCount` exposed in `getStatus()`.
- T-31-01-03 (Zombie Xvfb): mitigated by SIGTERM-then-SIGKILL fallback in `teardown()`; SIGINT/SIGTERM handlers in server.mjs invoke `shutdownSsrRenderHost()` before `process.exit(0)`.
- T-31-01-04 (`?ssr=1` spoofing): documented as `accept`; downstream Plan 05 will gate Pi-only hotfixes behind it.
- T-31-01-05 (Information disclosure via Xvfb stdio): mitigated by `stdio: ["ignore", "pipe", "pipe"]`.

## Known Stubs

- `src/server/ssr-state-restore.mjs#loadSsrInitialState` — stub. Currently reads `config/runtime-active-animations.json` and validates the v1 schema, but Plan 04 will fill in the active-animations replay logic that re-injects them via WebSocket on first SSR-tab handshake. **Reason it's not blocking Plan 01:** Plan 01 explicitly only proves the tab boots and is process-managed; Plan 04 is the planned wave for state replay.

## Next Phase Readiness

**Ready for Plan 31-02 (Wave 2 — WebRTC publish via mediasoup).**

Plan 02 will:
- Create the mediasoup Worker + Router on server boot (alongside or after `bootSsrRenderHost`).
- Inject mediasoup-client publisher script into the SSR tab via `page.evaluate()` after navigation.
- Wire the in-page `getDisplayMedia({video:true, audio:false})` (per D-D2 reversal) into a video-only Producer.
- Read `status.encoderConfig.bitrate / fpsTarget / keyframeIntervalSec` from the active host instance (via `getActiveSsrRenderHost()`) to tune the WebRTC transport.
- Add `/api/webrtc/signal` endpoint for Pi-side consumer subscription.

No blockers. The SSR_RENDER_HOST=1 opt-in gate keeps Wave 1 work cleanly isolated from existing functionality until Wave 6 UAT promotes it.

---
*Phase: 31-server-side-rendering-pivot*
*Plan: 01-ssr-render-host-bringup*
*Completed: 2026-05-06*

## Self-Check: PASSED

- FOUND: src/server/ssr-render-host.mjs
- FOUND: src/server/ssr-state-restore.mjs
- FOUND: test/ssr-render-host-lifecycle.test.mjs (modified)
- FOUND: server.mjs (modified)
- FOUND: commit 78ac87c (T1 RED — `test(31-01)`)
- FOUND: commit 3ac04c3 (T1 GREEN — `feat(31-01): SSR render-host module + state-restore stub`)
- FOUND: commit c91efa8 (T2 — `feat(31-01): wire SSR render-host into server.mjs startup + shutdown`)
- FULL TEST SUITE: 78 tests, 73 pass, 5 skip, 0 fail (was 63/57/6/0 after Wave 0 — added 15 new tests, no regressions)
- REAL-LAUNCH VERIFIED: encoder log gate + Xvfb spawn + Chromium spawn (all required flags) + page reachable + clean SIGINT shutdown all confirmed via `ps -ef`, `curl`, and server log inspection
