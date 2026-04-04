# P10-HF5-T9 Regression Matrix - imported boards + multi-play-area stability

## Command

`node debug/p10-hf5-t9-imported-multiarea-regression.mjs`

## Result

- `debug/p10-hf5-t9-imported-multiarea-regression-output.json` -> `result: PASS`
- Matrix dimensions: `2 boards x 4 lifecycle phases x 2 surfaces = 16 probes`
- Imported multi-area board (`nemesis-lockdown-a`) and builtin single-area control board both remain canonical-first.

## Regression contract

Across startup/reload/default-apply/board-switch and control/final surfaces, no probe fell back to default hex when valid canonical play-areas were present.
