# P10-HF3-T6 Diagnostics - canonical source selection parity (control + final)

## Command

`node debug/p10-hf3-t6-canonical-source-selection.mjs`

## Result

- Status: **FAIL (expected RED baseline)**
- Assertion: `Control path must pick canonical play-area source from snapshot/runtime payload`
- Control selected play area: `play-area-1`
- Final selected play area: `play-area-1`
- Expected canonical source: `canonical-source-area`

## Console Output (excerpt)

```text
AssertionError [ERR_ASSERTION]: Control path must pick canonical play-area source from snapshot/runtime payload
+ actual - expected

+ 'play-area-1'
- 'canonical-source-area'
```

## Artifact

- `debug/p10-hf3-t6-canonical-source-selection-output.json`
