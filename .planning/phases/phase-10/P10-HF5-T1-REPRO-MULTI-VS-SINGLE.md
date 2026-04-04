# P10-HF5-T1 Repro Trace - multi-play-area vs single-play-area canonical apply

## Command

`node debug/p10-hf5-t1-multi-vs-single-repro.mjs`

## Observed RED result

- Assertion failed: `Multi-area canonical path must not select invalid/default fallback when valid areas exist`
- `debug/p10-hf5-t1-multi-vs-single-repro-output.json` reports `result: FAIL`
- Single-area control lane remains PASS while multi-area lane selects `invalid-alpha` and falls back to default hex.

## Why this is the expected RED baseline

This reproduces the blocker symptom split: canonical selection remains stable on single-area boards, but multi-area payloads can still resolve to default fallback geometry although a valid canonical area exists.
