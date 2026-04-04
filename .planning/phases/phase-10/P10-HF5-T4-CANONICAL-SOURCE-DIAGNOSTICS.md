# P10-HF5-T4 Diagnostics - canonical source selection + fallback decision (control vs `/output/final`)

## Command

`node debug/p10-hf5-t4-canonical-source-diagnostics.mjs`

## Observed RED result

- Assertion failed: `Control surface must resolve canonical play-area source instead of fallback-selected invalid area`
- `debug/p10-hf5-t4-canonical-source-diagnostics-output.json` reports `result: FAIL`
- Control and `/output/final` both resolve `invalid-alpha` and mark fallback decision `default-fallback-selected` even though `valid-beta` exists.

## Why this is the expected RED baseline

The diagnostics make source-selection and fallback decisions executable for both surfaces and prove the canonical resolver still permits default fallback takeover in the multi-area path.
