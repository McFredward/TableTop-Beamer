# P10-HF6-T2 canonical merge-lineage diagnostics

## Command

```bash
node debug/p10-hf6-t2-merge-lineage-diagnostics.mjs
```

## Result (RED expected)

- Assertion failed: `Canonical source merge must retain all valid play-areas and produce no first-drop point in any browser lane`
- `debug/p10-hf6-t2-merge-lineage-diagnostics-output.json` shows:
  - Chrome keeps merged `areaIdSet=[bunker, play-area-1]`
  - Firefox/mobile-chrome merged `areaIdSet=[play-area-1]`
  - `missingFromMerge=[bunker]`
  - `firstDropPoint=snapshot-playAreasByBoard-precedence`
  - `result: FAIL`

## Interpretation

The first deterministic drop point is in canonical merge precedence: runtime snapshot `playAreasByBoard` subset currently overwrites richer canonical profile data.
