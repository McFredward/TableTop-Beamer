# P10-HF4-T4 Repro Trace - settings ownership false-positive on conditional unmount

## Command

`node debug/p10-hf4-t4-settings-ownership-repro.mjs`

## Observed RED result

- Assertion failed: `Settings ownership checks must accept conditionally unmounted non-applicable outside controls`
- `debug/p10-hf4-t4-settings-ownership-repro-output.json` reports `result: FAIL`
- Diagnostics include `settings-ownership-violation` caused by missing `#outside-mode`/`#outside-direction`

## Why this is expected RED

Current ownership validation treats all IDs in `SETTINGS_EXCLUSIVE_CONTROL_IDS` as always-required, even when outside mode/direction controls are intentionally unmounted in non-applicable contexts.
