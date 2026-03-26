# P7-T12 Sync Regression Matrix

- Scope: single-click determinism, stale-drop/duplicate guards, bounded queue visibility.
- Script: `node debug/p7-t12-sync-regression.mjs`
- Expected: JSON output with `pass: true`, non-negative queue metrics, and live-state endpoint reachable.

## Result

- PASS (static regression contract checks and telemetry endpoint invariants validated).
