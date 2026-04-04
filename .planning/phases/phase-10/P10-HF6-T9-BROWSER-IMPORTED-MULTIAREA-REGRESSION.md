# P10-HF6-T9 browser + imported/multi-area regression matrix

## Command

```bash
node debug/p10-hf6-t9-browser-imported-multiarea-regression.mjs
```

## Result

- `debug/p10-hf6-t9-browser-imported-multiarea-regression-output.json` -> `result: PASS`
- Matrix covers browsers: `chrome`, `firefox`, `mobile-chrome`
- Matrix covers lifecycle: `startup`, `reload`, `apply-defaults`, `board-switch`
- Matrix covers surfaces: `control`, `/output/final`
- Matrix covers board classes:
  - built-in multi-area (`nemesis-lockdown-a`)
  - imported multi-area (`nemesis-lockdown-a` imported payload)
  - built-in single-area (`nemesis-board-a`)

All rows satisfy expected `areaCount`, `areaIdSet`, `selectedPlayAreaId`, and browser parity signatures.
