# P10-HF6-T4 area-count browser parity assertions

## Command

```bash
node debug/p10-hf6-t4-area-count-parity.mjs
```

## Result (RED expected)

- Assertion failed: `Area-count parity must match across Chrome/Firefox/mobile-class and retain all canonical areas`
- Output (`debug/p10-hf6-t4-area-count-parity-output.json`):
  - Chrome `areaCount=2`
  - Firefox `areaCount=1`
  - mobile-chrome `areaCount=1`
  - `result: FAIL`
