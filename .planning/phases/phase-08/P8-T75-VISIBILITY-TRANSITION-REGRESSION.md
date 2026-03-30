# P8-T75 Regression Guard - Outside Visibility Transitions

Date: 2026-03-30
Status: PASS

## Scope
- Verify deterministic show/hide transitions for `outside mode` / `outside direction` during editor context changes.

## Transition matrix

1. **Asset type: coded -> mp4**
   - Expected: controls unmount immediately.
   - Evidence: `syncOutsideDraftVisibilityFromInputs` -> `syncOutsideModeDirectionVisibility` mount-slot gating.
   - Result: PASS

2. **Asset type: mp4 -> coded (outside-space)**
   - Expected: controls mount immediately and become interactive.
   - Evidence: same transition pipeline with normalized `assetType/assetRef`.
   - Result: PASS

3. **Asset ref transition while asset type remains coded**
   - Expected: visibility updates deterministically on both `input` and `change` events (no stale reappear drift).
   - Evidence: `outsideAssetRefInput` listeners call `syncOutsideDraftVisibilityFromInputs` for both events.
   - Result: PASS

4. **Panel state traceability**
   - Expected: panel exposes deterministic visibility state for regression review.
   - Evidence: `data-outside-mode-direction-visible` on Outside Animations section.
   - Result: PASS

5. **Syntax guard**
   - Command: `node --check src/app.js`
   - Result: PASS
