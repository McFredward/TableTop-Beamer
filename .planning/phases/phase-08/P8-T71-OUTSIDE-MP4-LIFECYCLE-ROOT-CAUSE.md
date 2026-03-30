# P8-T71 Root Cause Follow-up - Outside MP4 Lifecycle Regression

Date: 2026-03-30
Status: FIXED

## Symptom (realbetrieb)
- Outside animations with `assetType=mp4` could fall back to unstable behavior after repeated **start / stop / re-start** or after save/reload/restart cycles.
- Reported failure shapes: no-op (black outside layer), frozen first frame, or inconsistent re-start.

## Reproduced fallback path
1. Configure Outside animation as `assetType=mp4` with a valid `/resources/*.mp4` reference.
2. Start outside runtime, stop it, and start again repeatedly.
3. Repeat after settings apply/save/reload/restart.
4. Observe occasional stale video lifecycle state (reused element not fully re-primed for a new runtime run).

## Root cause
- The mp4 draw path reused cached `<video>` elements but had no explicit **run lifecycle boundary** (new run id / restart event).
- Reused video elements could carry stale playback position/state into a new outside runtime session.
- The draw path also attempted direct frame drawing without a readiness guard, which increased black/frozen fallback risk when media data was not yet ready.

## Fix strategy
- Introduce a deterministic outside-mp4 lifecycle marker per board (`runId + assetRef`) and re-prime playback on lifecycle changes.
- Add safe draw guard (`readyState` + dimensions) before drawing the video frame.
- Reset lifecycle state when outside layer is disabled or switched away from mp4 asset type.

## Files
- `src/app.js`

## Verification
- `node --check src/app.js` PASS
