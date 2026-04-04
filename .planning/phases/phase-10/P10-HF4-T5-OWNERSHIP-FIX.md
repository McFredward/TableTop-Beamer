# P10-HF4-T5 Fix - applicability-aware settings ownership checks

## Change

- `validateSettingsControlOwnership` now evaluates outside mode/direction applicability from current outside definition.
- Missing `#outside-mode` / `#outside-direction` are accepted when controls are non-applicable and intentionally unmounted.
- Strict ownership remains enforced for all other settings controls and for outside controls when applicable.

## Verification

- `node debug/p10-hf4-t4-settings-ownership-repro.mjs` -> PASS
