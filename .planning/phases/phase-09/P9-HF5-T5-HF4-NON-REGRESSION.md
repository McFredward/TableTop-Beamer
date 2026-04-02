# P9-HF5-T5 - HF4 Non-Regression Verification

## Scope

Validate that HF5 stream-purity changes preserve HF4 guarantees:

- Command responsiveness with stream on/off
- Output parity across boards/assets
- Restart-free recovery under stream reconnect/fault behavior

## Evidence

- `debug/p9-hf4-t8-control-matrix.mjs` -> `debug/p9-hf4-t8-control-matrix-output.json`
- `debug/p9-hf4-t9-output-parity-matrix.mjs` -> `debug/p9-hf4-t9-output-parity-matrix-output.json`
- `debug/p9-hf4-t6-restart-free-recovery.mjs` -> `debug/p9-hf4-t6-restart-free-recovery-output.json`

## Results

- Control matrix PASS (`stream p95=2ms`, `client p95=1ms`, queue bounded).
- Output parity matrix PASS (all 3 boards match selected board and outside animation visibility contract).
- Restart-free recovery PASS (producer healthy/running after reconnect, source version advances, queue bounded).

## Conclusion

HF4 non-regression gate remains PASS after HF5 overlay-removal and visual-contract enforcement.
