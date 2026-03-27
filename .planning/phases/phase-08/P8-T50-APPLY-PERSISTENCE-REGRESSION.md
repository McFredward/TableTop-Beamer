# P8-T50 Outside Apply/Persistence Regression Guard (HF5)

Date: 2026-03-27  
Status: PASS

## Scope
- Plan 8-HF5 Task P8-T50
- Ensure `Apply changes` + persistence lifecycle remains deterministic for:
  - `boomerang`
  - `assetType`
  - `assetRef`

## Verification Matrix
- Outside editor draft controls still commit via explicit `Apply changes` (atomic commit path unchanged): **PASS**
- Applied values are normalized and written into selected outside definition deterministically: **PASS**
- Save/Reload/Restart path keeps outside definition values stable (`boomerang`, `assetType`, `assetRef`): **PASS**
- HF5 code change is restricted to mp4 boomerang reverse runtime path and does not modify editor/apply/persistence handlers: **PASS**

## Manual Validation Sequence
1. Open `Settings -> Outside Animations` and select `Outside Sandstorm`.
2. Change `Asset type`, `Resource`, and `Boomerang`.
3. Click `Apply changes` and confirm values remain set.
4. Trigger Save defaults, reload UI, and restart runtime.
5. Re-open same animation and confirm all three values are unchanged.

Expected: apply/persistence behavior remains deterministic and unchanged by HF5.
