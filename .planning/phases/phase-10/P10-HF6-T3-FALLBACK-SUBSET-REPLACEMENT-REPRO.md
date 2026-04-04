# P10-HF6-T3 fallback subset replacement RED repro

## Command

```bash
node debug/p10-hf6-t3-fallback-subset-replacement-repro.mjs
```

## Result (RED expected)

- Assertion failed: `Fallback/default subset payload must not replace valid canonical multi-area state`
- `debug/p10-hf6-t3-fallback-subset-replacement-repro-output.json` shows all lanes resolve:
  - `mergedAreaCount=1`
  - `mergedAreaIdSet=[play-area-1]`
  - `selectedPlayAreaId=play-area-1`
  - `selectedIsDefaultFallbackHex=true`
  - `result: FAIL`

## Interpretation

When only a subset payload is present, fallback/default currently replaces valid canonical multi-area data instead of preserving full canonical retention.
