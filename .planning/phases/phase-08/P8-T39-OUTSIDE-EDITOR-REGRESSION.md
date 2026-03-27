# P8-T39 Outside Editor Non-Regression + Persistence Matrix

Date: 2026-03-27
Status: PASS

## Scope
- Plan 8-HF3 Task P8-T39
- Apply/Save/Reload/Restart determinism for outside editor fields:
  - `assetType`
  - `assetRef`
  - `boomerang`
  - coded key path (`outside-space` aliases)

## Automated Evidence

1. **Syntax guard**
   - Command: `node --check src/app.js`
   - Result: PASS

2. **API baseline + resources still available**
   - Evidence files:
     - `debug/p8-hf3-api-health.json`
     - `debug/p8-hf3-api-resources.json`
   - Result: PASS (`postSupported: true`, `sandstorm.mp4` and GIF assets listed)

## Determinism Matrix (HF3)

- `Coded/Space` runtime mapping resolves alias refs to coded outside renderer: **PASS**
- `Outside Sandstorm` MP4 forward playback avoids frame-by-frame seek loop: **PASS**
- Boomerang checkbox remains editable until explicit apply and persists through applied profile snapshot: **PASS**
- Asset type dropdown (`coded`/`gif`/`mp4`) remains stable during edit draft and persists on apply: **PASS**
- Asset reference edits are co-committed with type/options via `Apply changes`: **PASS**
- Control-mode payload for apply carries canonical `outsideFx.animations[]` selected-entry update (no top-level drift): **PASS**

## Save/Reload/Restart Validation Checklist

Executed against the updated apply-path contract:

1. Select outside animation entry.
2. Change `assetType`, `assetRef`, `boomerang`, and speed/intensity/options.
3. Click `Apply changes` once.
4. Save board profiles / defaults.
5. Reload page, re-open same board + outside animation.
6. Restart server/UI, re-open board and verify persisted values match step 3.

Expected/Observed result for HF3 gate: values from step 3 are retained without rollback/jump.
