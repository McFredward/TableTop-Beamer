# P10-HF8-T1 — All-board canonical fallback collapse repro (RED)

- Script: `node debug/p10-hf8-t1-all-board-fallback-collapse-repro.mjs`
- Output: `debug/p10-hf8-t1-all-board-fallback-collapse-repro-output.json`
- Result: **FAIL (expected RED)**

## Observation

Legacy defaults-apply merge (`applyPolygonPrecedence(migratedProfiles, localProfiles)`) collapses all tested boards to fallback `play-area-1` and ignores canonical saved selections/area-id sets.

## Evidence

- `nemesis-board-a`: expected `single-a`, observed `play-area-1`
- `nemesis-lockdown-a`: expected `bunker`, observed `play-area-1`
- `imported-lockdown-multi`: expected `cargo`, observed `play-area-1`

This deterministically reproduces the all-board collapse blocker.
