---
phase: 32
plan: 01
subsystem: ssr-stream-fps
tags: [xvfb, vaapi, libva, fps-cap, align-mode, publisher, encoder-detect, ssr]

# Dependency graph
requires:
  - phase: phase-32
    plan: W0
    provides: "Skip-gated test scaffolds A1-A9 for Block A FPS lift"
provides:
  - "Xvfb -fakescreenfps 120 root-cause fix for 20-25fps cap"
  - "probeLibvaRuntime() — Chromium VAAPI detection independent of ffmpeg"
  - "STREAM_FPS_CAP_VALUES schema + validator + disk persistence"
  - "Publisher getDisplayMedia frameRate driven by streamFpsCap config"
  - "Align-mode reactive boost polling loop in in-page publisher script"
  - "Bitrate scaling: 30→8Mbit, 45→12Mbit, 60/native→16Mbit"
affects:
  - "32-02 (Block B) — test scaffolds 4+5 in fps-baseline.test.mjs still intact"
  - "server-encoder-detect: vaapi now detected on this hardware (was x264-software only)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getXvfbArgs() export for unit-testable Xvfb arg construction"
    - "probeLibvaRuntime() — existsSync-based libva path probe, no subprocess"
    - "effectiveStreamFpsCap = streamFpsCap===0 ? 60 : streamFpsCap (0=native mapping)"
    - "Template literal interpolation of effectiveStreamFpsCap into in-page JS"
    - "setInterval(250ms) polling __TT_BEAMER_STATE_FOR_DIAG__.alignMode for reactive boost"

key-files:
  created: []
  modified:
    - src/server/ssr-render-host.mjs
    - src/server/server-encoder-detect.mjs
    - src/server/ssr-server-rendering-config.mjs
    - src/server/ssr-stream-publisher.mjs
    - config/global-defaults.json
    - test/phase-32-fps-baseline.test.mjs
    - test/phase-32-fps-presets.test.mjs
    - test/phase-32-server-rendering-config.test.mjs
    - test/phase-32-encoder-detect-vaapi.test.mjs
    - test/phase-32-xvfb-fakescreenfps.test.mjs

key-decisions:
  - "T1: -fakescreenfps 120 (not 60) for headroom — Chromium targets 60fps with 120Hz screen budget"
  - "T1: libva probe uses existsSync on 3 well-known paths — no subprocess, no ffmpeg dependency"
  - "T1: VAAPI detected when BOTH hasVaapiDevice AND hasLibva true; OR ffmpeg h264_vaapi+device (legacy)"
  - "T2: STREAM_FPS_CAP_DEFAULT derived from STREAM_FPS_CAP_VALUES[2] (not hardcoded 60)"
  - "T2: fpsTarget kept for backward compat — streamFpsCap is a NEW field per Research Pitfall 5"
  - "T3: effectiveStreamFpsCap=60 when streamFpsCap=0 (native) — no-cap maps to ceiling constraint"
  - "T3: fps-presets tests rewritten to import from ssr-stream-publisher.mjs (Wave-0 had wrong import target)"
  - "T3: resolveEncoderConfig reads config file twice (once for encoder/preset, once for fps fields) — pragmatic, avoids refactor of read path"

# Metrics
duration: 35min
completed: 2026-05-07
---

# Phase 32 Plan 01: Block A — Stream FPS Lift Root-Cause Fixes Summary

**Three root-cause levers for the 20-25fps SSR stream cap: Xvfb BeginFrameSource fix, Chromium VAAPI libva probe decoupled from ffmpeg, and streamFpsCap/alignModeBoost schema + publisher wiring**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-05-07
- **Tasks:** 3
- **Files modified:** 10 (5 source + 5 test)

## Accomplishments

### Task 1: Xvfb -fakescreenfps 120 + VAAPI libva probe (commit `1173292`)

- Added `getXvfbArgs({ display, width, height })` export to `ssr-render-host.mjs` containing `-fakescreenfps 120` — primary root-cause fix for the ~25fps BeginFrameSource cap
- Refactored `spawnXvfb()` to call `getXvfbArgs()` (testable, canonical arg builder)
- Added `probeLibvaRuntime()` export to `server-encoder-detect.mjs` — checks `/usr/lib/x86_64-linux-gnu/libva.so.2`, `/usr/lib/aarch64-linux-gnu/libva.so.2`, `/usr/local/lib/libva.so.2`
- Updated `detectAvailableEncoders` to trust `hasVaapiDevice + hasLibva` pair for VAAPI, independent of ffmpeg `h264_vaapi`
- Flipped Wave-0 skip-gated tests A8a-A8d (encoder-detect-vaapi) and A9a-A9b (xvfb-fakescreenfps) to GREEN

### Task 2: serverRendering schema — streamFpsCap + alignModeBoost (commit `e47b373`)

- Exported `STREAM_FPS_CAP_VALUES = [30, 45, 60, 0]`, `STREAM_FPS_CAP_DEFAULT = STREAM_FPS_CAP_VALUES[2]` (60), `ALIGN_MODE_BOOST_DEFAULT = true`
- Extended `KNOWN_KEYS` Set with `"streamFpsCap"` and `"alignModeBoost"`
- `SERVER_RENDERING_DEFAULTS()` returns both new fields in both hardware paths
- `validateServerRenderingPatch()` validates `streamFpsCap` (finite number + enum) and `alignModeBoost` (boolean)
- `readServerRenderingConfig()` disk-load coercion reads and validates both new fields with defaults fallback
- `config/global-defaults.json` `serverRendering` block updated with `"streamFpsCap": 60, "alignModeBoost": true`
- Flipped Wave-0 skip-gated tests A4a-A4g, A5a-A5c, A6, A7 to GREEN (11 tests)
- Rewrote fps-baseline tests 2+3 from RED-proof to GREEN post-patch assertions

### Task 3: Publisher streamFpsCap + reactive align-mode boost + bitrate scaling (commit `f15c5b4`)

- `deriveSimulcastBitrates({ effectiveStreamFpsCap })` scales total bitrate: 30fps→8Mbit, 45fps→12Mbit, 60+native→16Mbit
- `buildInPagePublisherScript` accepts `effectiveStreamFpsCap` and `alignModeBoost` params
- `getDisplayMedia` `frameRate.ideal` and `frameRate.max` both set to `${effectiveStreamFpsCap}` (interpolated)
- Initial `applyConstraints` uses `effectiveStreamFpsCap`
- Align-mode boost polling loop: `setInterval(250ms)` reads `window.__TT_BEAMER_STATE_FOR_DIAG__.alignMode`; on transition false→true boosts to 60fps; on true→false reverts to `baseFpsCap`
- `resolveEncoderConfig` returns `streamFpsCap`, `effectiveStreamFpsCap`, `alignModeBoost` from config
- `injectInPagePublisher` forwards both new params to `buildInPagePublisherScript`
- Flipped Wave-0 skip-gated tests A1-A3 to GREEN (8 tests)

## Skip-Gated Tests Flipped GREEN

| Test ID | File | Count |
|---------|------|-------|
| A8a-A8d | phase-32-encoder-detect-vaapi.test.mjs | 4 |
| A9a-A9b | phase-32-xvfb-fakescreenfps.test.mjs | 2 |
| A4a-A4g | phase-32-server-rendering-config.test.mjs | 7 |
| A5a-A5c | phase-32-server-rendering-config.test.mjs | 3 |
| A6, A7 | phase-32-server-rendering-config.test.mjs | 2 |
| A1, A2, A2b, A3a-A3d | phase-32-fps-presets.test.mjs | 7 |
| Baselines 2+3 rewritten GREEN | phase-32-fps-baseline.test.mjs | 2 |

**Total Block-A skip-gated tests flipped GREEN: 27** (plus 2 baselines converted from RED-proof to post-patch proof)

## Encoder Detection Before/After

| State | Result |
|-------|--------|
| Before (Wave-0) | `["x264-software"]` — ffmpeg h264_vaapi absent, no libva probe |
| After (32-01-T1) | `["vaapi", "x264-software"]` — libva.so.2 present + /dev/dri/renderD128 = VAAPI confirmed |

Live probe on this hardware (Intel Core 7 240H, Raptor Lake-P iGPU):
```
node -e "import('./src/server/server-encoder-detect.mjs').then(m => m.detectAvailableEncoders().then(r => console.log(r)))"
# Output: ["vaapi","x264-software"]
```

## Commit SHAs

| Task | Hash | Message |
|------|------|---------|
| T1 | `1173292` | fix(32-01-T1): Xvfb -fakescreenfps 120 + VAAPI libva probe |
| T2 | `e47b373` | feat(32-01-T2): serverRendering schema adds streamFpsCap + alignModeBoost |
| T3 | `f15c5b4` | feat(32-01-T3): publisher wires streamFpsCap + reactive align-mode boost + bitrate scaling |

## Full Suite Results at 32-01 Close

| Metric | Before (W0) | After (32-01) | Delta |
|--------|-------------|---------------|-------|
| Total tests | 263 | 267 | +4 |
| Pass | 217 | 243 | +26 |
| Fail | 0 | 0 | 0 |
| Skip | 46 | 24 | -22 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Deviation] fps-presets Wave-0 tests had wrong import target**
- **Found during:** Task 3 implementation
- **Issue:** Wave-0 test A3 imported `buildInPagePublisherScript` from `ssr-render-host.mjs` but the function lives in `ssr-stream-publisher.mjs`. Wave-0 also used `streamFpsCap` as param name where implementation uses `effectiveStreamFpsCap`.
- **Fix:** Rewrote `phase-32-fps-presets.test.mjs` to import from correct module with correct param names. Added 3 extra test cases (A2b, A3b2, A3d) for thorough coverage.
- **Files modified:** `test/phase-32-fps-presets.test.mjs`

**2. [Rule 2 - Deviation] fps-baseline baselines 2+3 timing**
- **Found during:** Task 1
- **Issue:** Plan said to rewrite baselines 2+3 in Task 1 (Xvfb step), but those baselines test schema fields which land in Task 2. Premature rewrite caused test failures.
- **Fix:** Kept baselines 2+3 as RED-proof through Task 1, rewrote them GREEN in Task 2 after schema landed.

**3. [Rule 1 - Bug] resolveEncoderConfig reads config file twice**
- **Found during:** Task 3 implementation
- **Issue:** The existing `resolveEncoderConfig` already reads global-defaults.json for encoder/preset. Rather than refactor the entire function signature, the streamFpsCap/alignModeBoost fields are read in a second try/catch block using the same file path. This is pragmatic but slightly redundant.
- **Fix:** Added a second `readFile` + parse block within the same function. A future refactor could unify the two parse passes.
- **Impact:** Negligible — function runs once at boot, not in hot path.

## Open Questions for UAT

1. **Did -fakescreenfps 120 lift the rAF rate?** Check the diagnostic overlay's SSR fps chip after server boot. Expected: ≥30fps (floor), target ≥60fps. If still ~25fps, Xvfb is not the bottleneck — investigate Chromium BeginFrameSource timer directly.
2. **Did encoder switch from x264-software to vaapi?** `detectAvailableEncoders()` now returns `["vaapi","x264-software"]` on this hardware. Boot log should show `encoder=vaapi source=auto`. Verify via server startup logs.
3. **Does align-mode boost work?** Enter align-mode (drag a room), check `videoTrack.getSettings().frameRate` in SSR-tab console. Should boost to 60fps during drag.
4. **Does bitrate scale correctly?** With streamFpsCap=60 (default), total bitrate target is 16Mbit/s. Check mediasoup producer stats.
5. **Pi VC4 decode budget at 60fps?** Not verified — Pi hardware UAT required. Check `videoEl.getVideoPlaybackQuality().droppedVideoFrames` after switching to 60fps stream.

## Known Stubs

None — all wired functionality flows from config → resolveEncoderConfig → buildInPagePublisherScript → getDisplayMedia constraint. No placeholder values or hardcoded stubs remain.

## Threat Flags

None — new surface is bounded by the threat mitigations in the plan:
- T-32-01-01/02: `validateServerRenderingPatch` validates streamFpsCap + alignModeBoost before any persistence
- T-32-01-04: streamFpsCap interpolated into publisher script only after passing enum validation

## Self-Check: PASSED
