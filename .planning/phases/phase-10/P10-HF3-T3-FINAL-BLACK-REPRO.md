# P10-HF3-T3 Repro Trace - `/output/final` black/fallback rectangle drift

## Command

`node debug/p10-hf3-t3-final-black-rectangle-repro.mjs`

## Result

- Status: **FAIL (expected RED baseline)**
- Assertion: `Final output must hydrate selected canonical play area from runtime snapshot`
- Actual selected play area: `play-area-1`
- Expected selected play area: `valid-render-area`
- Clip path result: fallback path remains active because canonical polygon was not hydrated.

## Console Output (excerpt)

```text
AssertionError [ERR_ASSERTION]: Final output must hydrate selected canonical play area from runtime snapshot
+ actual - expected

+ 'play-area-1'
- 'valid-render-area'
```

## Artifact

- `debug/p10-hf3-t3-final-black-rectangle-repro-output.json`
