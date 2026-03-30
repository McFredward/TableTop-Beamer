# P8-T66 Regression Guard - Outside MP4 Restore Non-Regression

Date: 2026-03-30
Status: PASS

## Scope
- Verify HF8 mp4 restore does not regress stable outside paths (`gif`, coded `outside-space`).

## Guard Matrix

1. **Outside mp4 forward-loop path restored**
   - Check: Outside mp4 branch now uses deterministic forward loop and draw path.
   - Evidence: `src/app.js` (`drawOutsideFxLayer` mp4 branch).
   - Result: PASS

2. **Outside coded path unchanged**
   - Check: coded rendering still resolves through `drawEffectVisual(... outside-space ...)`.
   - Evidence: `src/app.js` (`resolveOutsideCodedEffectType`, coded fallback branch in `drawOutsideFxLayer`).
   - Result: PASS

3. **Outside gif path unchanged**
   - Check: gif frame decode/playback path remains unchanged.
   - Evidence: `src/app.js` (`getGifPlaybackFrame`, gif branch in `drawOutsideFxLayer`).
   - Result: PASS

4. **Syntax guard**
   - Command: `node --check src/app.js`
   - Result: PASS
