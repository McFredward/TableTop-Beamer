# P8-T65 Root Cause - Outside MP4 Playback Regression

Date: 2026-03-30
Status: FIXED

## Symptom
- Outside animations with `assetType=mp4` stopped rendering, while `gif` and coded outside effects still rendered.

## Reproduced Failure Path
1. Select an outside animation with `assetType=mp4` (for example `Outside Sandstorm`).
2. Enable outside animations and start global outside runtime.
3. Observe that the outside layer can remain blank/no-op for mp4 assets.

## Root Cause
- The outside mp4 renderer path depended on a strict metadata gate (`durationSec` must be finite and > 0) and used a direction-coupled playback state branch.
- In non-boomerang runtime, this extra state/metadata coupling was unnecessary and could prevent the draw path from activating reliably.

## Fix
- Simplified outside mp4 runtime path to deterministic non-boomerang forward loop playback:
  - Always set `video.loop = true`.
  - Always apply target playback rate.
  - Always attempt `video.play()` when paused.
  - Draw current frame directly without reverse-seek lifecycle.
- Removed obsolete outside mp4 playback-state map for reverse branch orchestration.

## Files
- `src/app.js`

## Verification
- `node --check src/app.js` passes.
