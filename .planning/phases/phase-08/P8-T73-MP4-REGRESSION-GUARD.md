# P8-T73 Regression Guard - MP4 Lifecycle Hardening Non-Regression

Date: 2026-03-30
Status: PASS

## Scope
- Validate that the HF9 mp4 lifecycle hardening keeps existing stable paths intact.
- Explicitly protect gif/coded outside rendering and Apply/Persistenz flows.

## Guard matrix

1. **Outside mp4 lifecycle hardening active**
   - Check: per-board lifecycle state (`runId + assetRef`) re-primes playback on restart.
   - Evidence: `src/app.js` (`outsideMp4PlaybackStateByBoard`, `ensureOutsideMp4Playback`, `drawOutsideFxLayer`).
   - Result: PASS

2. **Outside gif rendering unchanged**
   - Check: gif branch remains frame-based and clears mp4 lifecycle state cleanly.
   - Evidence: `src/app.js` (`drawOutsideFxLayer` gif branch).
   - Result: PASS

3. **Outside coded rendering unchanged**
   - Check: coded branch still resolves through `resolveOutsideCodedEffectType` + `drawEffectVisual`.
   - Evidence: `src/app.js` (coded fallback branch in `drawOutsideFxLayer`).
   - Result: PASS

4. **Apply flow remains atomic**
   - Check: `outside-apply-changes` still commits Type/Ref/Mode/Direction in one profile patch.
   - Evidence: `src/app.js` (`outsideApplyChangesButton` handler + `buildOutsideProfileWithSelectedAnimationPatch`).
   - Result: PASS

5. **Persistence flow remains stable**
   - Check: outside profile updates continue through existing `persistBoardProfiles()` path without schema drift.
   - Evidence: `src/app.js` (`updateOutsideFxProfile`, `setOutsideFxProfile`, apply/toggle handlers).
   - Result: PASS

6. **Syntax guard**
   - Command: `node --check src/app.js`
   - Result: PASS
