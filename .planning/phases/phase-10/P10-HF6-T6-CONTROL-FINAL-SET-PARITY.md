# P10-HF6-T6 control vs /output/final play-area set parity

## Command

```bash
node debug/p10-hf6-t6-control-final-set-parity.mjs
```

## Result (RED expected)

- Assertion failed: `Control-view and /output/final must consume identical full canonical play-area sets in every browser lane`
- Output (`debug/p10-hf6-t6-control-final-set-parity-output.json`):
  - In Firefox/mobile lanes, control and final are internally parity-true but both resolve only `[play-area-1]`
  - Expected canonical full set is `[bunker, play-area-1]`
  - `result: FAIL`

## Interpretation

Surface parity alone is insufficient if both surfaces are fed the same dropped subset. Canonical completeness must be enforced in addition to control/final parity.
