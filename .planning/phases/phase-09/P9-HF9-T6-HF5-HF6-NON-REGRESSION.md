# P9-HF9-T6 HF5/HF6 Non-Regression Matrix

## Goal

Confirm HF9 changes do not regress HF6 transport/apply/ack behavior and HF5 visual-only stream purity guarantees.

## Verification Run

Executed against `http://127.0.0.1:4211`:

1. `node debug/p9-hf6-t6-start-stop-parity-matrix.mjs`
   - Output: `debug/p9-hf6-t6-start-stop-parity-matrix-output.json`
2. `node debug/p9-hf6-t7-stream-purity-non-regression.mjs`
   - Output: `debug/p9-hf6-t7-stream-purity-non-regression-output.json`
3. `node debug/p9-hf5-t6-stream-purity-matrix.mjs`
   - Output: `debug/p9-hf5-t6-stream-purity-matrix-output.json`

## Result

- PASS: HF6 start/stop parity matrix remains green.
- PASS: HF6 stream purity non-regression remains green.
- PASS: HF5 visual-only stream purity matrix remains green.

## Conclusion

HF9 lifecycle gate hardening preserved transport/apply/ack determinism and stream-purity constraints without reintroducing diagnostic overlays or client-side orchestration behavior.
