# P9-HF7-T6 Control Determinism Matrix

## Goal

Verify control-plane determinism/responsiveness remains intact while `/output/final` is strict stream-only.

## Verification

- Script: `node debug/p9-hf7-t6-control-determinism-matrix.mjs`
- Output: `debug/p9-hf7-t6-control-determinism-matrix-output.json`
- Matrix:
  - Alternating `control-a` / `control-b`
  - `align` toggles + `start` + `stop` sequences
  - Version-correlated frame confirmation for every command
- PASS thresholds:
  - max ack latency `<= 700ms`
  - max stream visibility latency `<= 1500ms`

## Verdict

Control commands remain deterministic and responsive under strict stream-only final output.
