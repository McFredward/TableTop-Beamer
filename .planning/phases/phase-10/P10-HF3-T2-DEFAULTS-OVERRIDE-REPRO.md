# P10-HF3-T2 Repro Trace - Defaults apply polygon override drift

## Command

`node debug/p10-hf3-t2-defaults-override-repro.mjs`

## Result

- Status: **FAIL (expected RED baseline)**
- Assertion: `Apply-defaults flow must preserve persisted board polygon ownership instead of default fallback takeover`
- Actual selected play area: `play-area-1`
- Expected selected play area: `persisted-board-area`

## Console Output (excerpt)

```text
AssertionError [ERR_ASSERTION]: Apply-defaults flow must preserve persisted board polygon ownership instead of default fallback takeover
+ actual - expected

+ 'play-area-1'
- 'persisted-board-area'
```

## Artifact

- `debug/p10-hf3-t2-defaults-override-repro-output.json`
