# P9-HF4-T9 - Output Parity + Black-Stream Regression Matrix

## Method

- Load board catalog and iterate all board IDs.
- For each board, switch context to stream mode and trigger outside-space animation using `sandstorm.mp4` asset mapping.
- Read stream frame payloads and validate:
  - frame board ID matches selected board,
  - board image source is present,
  - outside-space animation is represented in running stream payload.

## Evidence

- Script: `debug/p9-hf4-t9-output-parity-matrix.mjs`
- Output: `debug/p9-hf4-t9-output-parity-matrix-output.json`

## Result

- Board/profile matrix remains stream-visible with valid board payloads.
- Sandstorm outside path remains present in stream payload across board iterations.
- PASS confirms black-stream regression guard for affected board/asset combinations.
