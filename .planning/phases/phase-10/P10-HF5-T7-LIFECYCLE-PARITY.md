# P10-HF5-T7 Lifecycle Assertions - startup/reload/default-apply/board-switch parity

## Command

`node debug/p10-hf5-t7-lifecycle-parity.mjs`

## Result

- `debug/p10-hf5-t7-lifecycle-parity-output.json` -> `result: PASS`
- Single-area board keeps canonical selection `single-a` across startup/reload/default-apply and board-switch cycles.
- Multi-area board keeps canonical selection `valid-beta` across startup/reload/default-apply and board-switch cycles.

## Lifecycle contract

Canonical saved play-areas remain deterministic across lifecycle transitions and board switches without default fallback takeover.
