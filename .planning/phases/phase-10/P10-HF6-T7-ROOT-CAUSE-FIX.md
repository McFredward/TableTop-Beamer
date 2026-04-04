# P10-HF6-T7 generic merge/resolver root-cause fix

## Root cause

`applySnapshotPolygonState` gave strict precedence to `snapshot.playAreasByBoard[boardId]` whenever present.
If that snapshot payload was a subset (e.g. only `play-area-1`), it replaced richer canonical data from board profiles (`play-area-1` + `bunker`).

## Fix

- Added `mergeSnapshotAndCanonicalPlayAreas(...)` to merge snapshot + canonical sets deterministically.
- Added strict-subset detection: when snapshot is a strict subset of canonical IDs, canonical entries are retained and not overwritten.
- Selected area precedence now prefers contracted canonical selection when strict-subset snapshots are detected.

## Verification

```bash
node debug/p10-hf6-t1-lockdown-a-area-drop-repro.mjs && \
node debug/p10-hf6-t2-merge-lineage-diagnostics.mjs && \
node debug/p10-hf6-t3-fallback-subset-replacement-repro.mjs
```

All three suites now report `result: PASS` after the fix.
