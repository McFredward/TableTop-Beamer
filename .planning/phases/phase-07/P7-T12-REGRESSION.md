# P7-T12 Sync Regression Matrix

- Scope: single-click determinism, stale-drop/duplicate guards, bounded queue visibility.
- Script: `node debug/p7-t12-sync-regression.mjs`
- Expected: JSON output with `pass: true`, non-negative queue metrics, and live-state endpoint reachable.

## Result

- PASS (Plan 7-HF1): Verifier enforces canonical `telemetry.hopsMs` only and includes a negative-path assertion that missing `hopsMs` is rejected.

## Evidence

- Command: `TT_BEAMER_BASE_URL=http://127.0.0.1:4273 node debug/p7-t12-sync-regression.mjs`
- Output: `debug/p7-hf1-t12-output.json`
- Key proof:
  - `schemaGuard.usesHopsMsOnly = true`
  - `schemaGuard.missingHopsMsRejected = true`

## Open Verify Gap

- Closed in Plan 7-HF1-T1.
