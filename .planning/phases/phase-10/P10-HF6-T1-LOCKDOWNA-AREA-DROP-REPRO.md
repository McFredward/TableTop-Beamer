# P10-HF6-T1 Lockdown A browser area-drop RED repro

## Command

```bash
node debug/p10-hf6-t1-lockdown-a-area-drop-repro.mjs
```

## Result (RED expected)

- Assertion failed: `Lockdown A must retain both canonical play-areas (Play Area 1 + Bunker) across Chrome/Firefox/mobile-class lanes`
- `debug/p10-hf6-t1-lockdown-a-area-drop-repro-output.json` reports:
  - Chrome: `areaCount=2`, `areaIdSet=[bunker, play-area-1]`
  - Firefox: `areaCount=1`, `areaIdSet=[play-area-1]`
  - mobile-chrome: `areaCount=1`, `areaIdSet=[play-area-1]`
  - `result: FAIL`

## Interpretation

The RED repro deterministically captures the field symptom: Firefox/mobile-class lanes drop `Bunker` while Chrome retains the complete canonical set.
