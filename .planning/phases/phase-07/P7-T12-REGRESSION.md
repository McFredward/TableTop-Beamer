# P7-T12 Sync Regression Matrix

- Scope: single-click determinism, stale-drop/duplicate guards, bounded queue visibility.
- Script: `node debug/p7-t12-sync-regression.mjs`
- Expected: JSON output with `pass: true`, non-negative queue metrics, and live-state endpoint reachable.

## Result

- PASS (Plan 7-HF3): Telemetry verifier remains `hopsMs`-strict and now additionally validates snapshot lifecycle map availability (`runtime.globalTriggerRevisions`, `runtime.globalStopRevisions`).

## Evidence

- Command: `TT_BEAMER_BASE_URL=http://127.0.0.1:4173 node debug/p7-t12-sync-regression.mjs`
- Output: `debug/p7-hf3-t12-output.json`
- Key proof:
  - `schemaGuard.usesHopsMsOnly = true`
  - `schemaGuard.missingHopsMsRejected = true`
  - `gateSamples` object exists (`commandAccepted`, `snapshotVersionVisible`, `snapshotApplied`)
  - `lifecycleMaps` object exists (`globalTriggerKeys`, `globalStopKeys`)

## Open Verify Gap

- None for schema integrity; retained as active regression guard for HF3 snapshot-trigger lifecycle.
