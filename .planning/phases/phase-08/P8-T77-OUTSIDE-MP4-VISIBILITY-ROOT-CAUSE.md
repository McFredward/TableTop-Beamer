# P8-T77 Root-Cause Follow-up - Outside MP4 Visibility + Loop Continuity

Date: 2026-03-31
Status: FIXED

## Symptom (realbetrieb)
- Outside animations with `assetType=mp4` were not deterministically visible after start/stop/re-start and after save/reload/restart cycles.
- Operators observed intermittent black outside frames and visible replay breaks at loop boundaries.

## Reproduced path
1. Configure Outside animation as `assetType=mp4` with a valid `/resources/*.mp4` asset.
2. Start Outside, stop it, and start it again multiple times.
3. Repeat after applying outside changes and after save/reload/restart.
4. Observe occasional first-frame-black/no-visible-start and short black/flicker flashes near loop rollover.

## Root cause
- The render path cleared the frame each tick and drew mp4 only when `readyState >= 2`; transient readiness drops yielded visible black flashes because no continuity fallback frame existed.
- Native end-to-start replay could expose a short decode/replay gap, creating visible loop breaks/flicker in canvas draw mode.

## Fix strategy
- Add mp4 continuity fallback frame buffering for the outside layer to eliminate black flashes during transient decode stalls.
- Introduce deterministic loop/start offset handling for outside mp4 playback to avoid first-frame-black and replay boundary flicker.
- Keep existing apply/persistence flow unchanged (`outside-apply-changes`, profile persistence, save/load/restart).

## Files
- `src/app.js`

## Verification
- `node --check src/app.js` PASS
