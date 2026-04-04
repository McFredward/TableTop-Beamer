# P11-HF4-T6 Control vs `/output/final` One-Shot Duration Parity (FAIL -> PASS)

- Script: `debug/p11-hf4-t6-control-final-parity-fail-pass.mjs`
- Output: `debug/p11-hf4-t6-control-final-parity-fail-pass-output.json`

## Result

- **PASS (FAIL->PASS proof complete)**

## Evidence Summary

1. **Pre-fix (FAIL):** one-shot parity can fail under control/final clock-origin divergence; loop mode not affected.
2. **Post-fix (PASS):** server-authoritative start epoch yields parity across checkpoints (`120ms`, `3900ms`, `4100ms`).
3. **Duration contract preserved:** one-shot remains active through the near-end checkpoint and finishes after full configured duration exactly once.
