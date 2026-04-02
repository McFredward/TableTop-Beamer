# P9-HF4-T7 - Deterministic Sync + Align Parity

## Method

- Execute align-mode toggles via live command API while stream mode is active.
- Capture command versions, final session snapshot, queue telemetry, and stream health.
- Assert version monotonicity and align-state parity.

## Evidence

- Script: `debug/p9-hf4-t7-sync-align-parity.mjs`
- Output: `debug/p9-hf4-t7-sync-align-parity-output.json`

## Result

- Version progression remains monotonic.
- Align mode remains authoritative in shared snapshot state.
- Queue and producer health remain within bounded non-regression limits.
