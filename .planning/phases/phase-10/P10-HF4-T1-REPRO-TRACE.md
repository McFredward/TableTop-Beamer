# P10-HF4-T1 Repro Trace - runtime panel exposure/load-order (`TT_BEAMER_RUNTIME_PANELS`)

## Command

`node debug/p10-hf4-t1-runtime-panels-repro.mjs`

## Observed RED result

- Assertion failed: `TT_BEAMER_RUNTIME_PANELS must be globally exposed before app-shell domain checks`
- `debug/p10-hf4-t1-runtime-panels-repro-output.json` reports `result: FAIL`
- `domain-modules-missing` contains `TT_BEAMER_RUNTIME_PANELS`

## Why this is the expected RED baseline

The app-shell contract in `src/app.js` requires `TT_BEAMER_RUNTIME_PANELS`, but runtime panel controller exposure is currently not satisfying that global key, reproducing the field-reported `domain-modules-missing` symptom.
