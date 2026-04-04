# P10-HF6-T8 fallback/default replacement guard

## Guard behavior

- If snapshot payload is a strict subset of canonical IDs, canonical entries are retained.
- If snapshot payload contributes no valid entries, canonical selection wins.
- Default fallback is only allowed when both snapshot and canonical paths have no valid play-area geometry.

## Command

```bash
node debug/p10-hf6-t8-fallback-guard.mjs
```

## Result

- `debug/p10-hf6-t8-fallback-guard-output.json` -> `result: PASS`
- Scenarios `subset-default-only`, `subset-invalid-only`, and `empty-array` all keep:
  - `mergedAreaIdSet=[bunker, play-area-1]`
  - `selectedPlayAreaId=bunker`
  - `selectedIsDefaultFallbackHex=false`
