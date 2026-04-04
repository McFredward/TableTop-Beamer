# P10-HF6-T5 area-id-set browser parity assertions

## Command

```bash
node debug/p10-hf6-t5-area-id-set-parity.mjs
```

## Result (RED expected)

- Assertion failed: `Area-id-set parity must match across Chrome/Firefox/mobile-class lanes`
- Output (`debug/p10-hf6-t5-area-id-set-parity-output.json`):
  - Chrome `areaIdSet=[bunker, play-area-1]`
  - Firefox/mobile-chrome `areaIdSet=[play-area-1]`
  - `result: FAIL`
