# P11-HF4-T1 Non-Loop Final Suppression RED

- Script: `debug/p11-hf4-t1-non-loop-suppression-red.mjs`
- Output: `debug/p11-hf4-t1-non-loop-suppression-red-output.json`

## Result

- **FAIL (expected RED):** non-loop one-shot is suppressed on `/output/final` under cross-device clock skew while loop mode remains visible.

## Deterministic Repro Contract

1. Simulate trigger start epoch authored by control client.
2. Simulate server/final clocks running +9s ahead.
3. Observe that one-shot (`duration=4s`) is already elapsed for final-output timeline.
4. Observe loop path remains active because loop ignores finite duration expiry.

This reproduces the field symptom profile exactly: loop globals still render, non-loop globals do not.
