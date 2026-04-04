# P10-HF3-T1 Repro Trace - Lockdown A Firefox/mobile-class polygon apply drift

## Command

`node debug/p10-hf3-t1-lockdown-firefox-mobile-repro.mjs`

## Result

- Status: **FAIL (expected RED baseline)**
- Assertion: `Lockdown A polygon ownership must hydrate from snapshot/runtime path for Firefox/mobile-class parity`
- Actual selected play area: `play-area-1`
- Expected selected play area: `lockdown-outside`

## Console Output (excerpt)

```text
AssertionError [ERR_ASSERTION]: Lockdown A polygon ownership must hydrate from snapshot/runtime path for Firefox/mobile-class parity
+ actual - expected

+ 'play-area-1'
- 'lockdown-outside'
```

## Artifact

- `debug/p10-hf3-t1-lockdown-firefox-mobile-repro-output.json`
