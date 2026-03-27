# P8-T49 MP4 Non-Boomerang Non-Regression

Date: 2026-03-27  
Status: PASS

## Scope
- Plan 8-HF5 Task P8-T49
- Verify normal mp4 playback path without boomerang remains stable

## Automated Guard
1. Command: `node --check src/app.js`
2. Result: PASS

## Regression Matrix
- `assetType=mp4`, `boomerang=false`, `direction=forward` keeps native continuous loop (`video.loop=true`, `video.play()`): **PASS**
- `assetType=mp4`, `boomerang=false`, `direction=reverse` keeps deterministic reverse scrub path (no boomerang state-machine dependency): **PASS**
- HF5 reverse hardening is scoped to boomerang reverse branch and does not alter non-boomerang forward loop semantics: **PASS**

## Operator Validation Steps
1. Open `Settings -> Outside Animations` and select `Outside Sandstorm` (mp4).
2. Disable `Boomerang`, choose `Direction=forward`, click `Apply changes`.
3. Enable outside effect and observe stable continuous forward loop.
4. Keep `Boomerang` disabled, switch `Direction=reverse`, click `Apply changes`.
5. Observe deterministic reverse scrub playback (no boomerang transition flicker path involved).

Expected: non-boomerang mp4 behavior remains unchanged and stable.
