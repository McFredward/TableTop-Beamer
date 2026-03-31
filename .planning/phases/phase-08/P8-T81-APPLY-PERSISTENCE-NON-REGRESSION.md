# P8-T81 Non-Regression - Apply Changes + Persistence Stability

Date: 2026-03-31
Status: PASS

## Scope
- Verify HF10 mp4 visibility/loop fixes do not alter the existing outside apply and persistence behavior.

## Non-regression matrix

1. **Apply changes remains atomic**
   - Check: outside editor still commits Type/Resource/Mode/Direction/Intensity/Speed only through `Apply changes`.
   - Evidence: `src/app.js` (`outsideApplyChangesButton` handler + `buildOutsideProfileWithSelectedAnimationPatch`).
   - Result: PASS

2. **Persistence path remains unchanged**
   - Check: outside updates still persist via `persistBoardProfiles()` and reuse existing save/load/restart schema flow.
   - Evidence: `src/app.js` (`setOutsideFxProfile`, `updateOutsideFxProfile`, apply/toggle/select handlers).
   - Result: PASS

3. **Control visibility/apply UX unchanged**
   - Check: existing conditional visibility + apply-only commit path stays intact while mp4 runtime branch is hardened.
   - Evidence: `src/app.js` (`syncOutsideModeDirectionVisibility`, outside asset input handlers, apply handler).
   - Result: PASS

4. **Syntax/runtime guard**
   - Command: `node --check src/app.js`
   - Result: PASS
