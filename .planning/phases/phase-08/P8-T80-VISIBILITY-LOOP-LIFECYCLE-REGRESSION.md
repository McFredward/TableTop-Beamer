# P8-T80 Regression Guard - Outside MP4 Visibility + Seamless Loop Lifecycle

Date: 2026-03-31
Status: PASS

## Scope
- Guard the HF10 outside-mp4 fixes across lifecycle transitions.
- Focus areas: deterministic visibility and seamless loop continuity through start/stop/re-start and save/reload/restart.

## Runtime-focused guard matrix

1. **Deterministic visible start on lifecycle changes**
   - Check: lifecycle re-prime seeks to safe loop-start offset and resumes muted playback on run/asset transitions.
   - Evidence: `src/app.js` (`getOutsideMp4LoopStartTime`, `ensureOutsideMp4Playback`).
   - Result: PASS

2. **Transient decode stall does not produce black outside frame**
   - Check: last visible mp4 frame is captured and reused for short transient draw gaps.
   - Evidence: `src/app.js` (`captureOutsideMp4FallbackFrame`, `drawOutsideMp4FallbackFrame`, mp4 draw branch in `drawOutsideFxLayer`).
   - Result: PASS

3. **Seamless loop boundary handling**
   - Check: near-end loop wrapping keeps playback continuous and avoids end/start replay break and boundary flicker.
   - Evidence: `src/app.js` (`maybeWrapOutsideMp4Loop`, mp4 draw branch in `drawOutsideFxLayer`).
   - Result: PASS

4. **Lifecycle continuity across start/stop/re-start + save/reload/restart**
   - Check: per-board playback state remains deterministic and is reset when outside is disabled or switched away from mp4.
   - Evidence: `src/app.js` (`outsideMp4PlaybackStateByBoard`, `clearOutsideMp4PlaybackState`, `drawOutsideFxLayer`).
   - Result: PASS

5. **Syntax/runtime guard**
   - Command: `node --check src/app.js`
   - Result: PASS
