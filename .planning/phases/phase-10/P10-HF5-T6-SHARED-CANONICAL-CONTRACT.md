# P10-HF5-T6 Contract Check - shared canonical play-area resolver across control + `/output/final`

## Command

`node debug/p10-hf5-t6-shared-resolver-contract.mjs`

## Result

- `debug/p10-hf5-t6-shared-resolver-contract-output.json` -> `result: PASS`
- Control canonical resolver IDs: `valid-beta`, `valid-gamma`
- Final-output renderable polygon count matches canonical area count (`2`).

## Contract outcome

Invalid multi-area entries are dropped at canonical normalization, and both control and final render paths consume the same normalized area set.
