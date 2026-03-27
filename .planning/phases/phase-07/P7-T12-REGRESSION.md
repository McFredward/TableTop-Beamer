# P7-T12 Sync Regression Matrix

- Scope: single-click determinism, stale-drop/duplicate guards, bounded queue visibility, and HF4 draft-immutability code guards.
- Script: `node debug/p7-t12-sync-regression.mjs`
- Expected: JSON output with `pass: true`, non-negative queue metrics, and live-state endpoint reachable.

## Result

- PASS (Plan 7-HF4): Telemetry verifier remains `hopsMs`-strict and now additionally enforces HF4 draft-immutability invariants (`start` path contains no draft UI assignments, control snapshot apply is guarded from `roomDraft` overwrite).

## Evidence

- Command: `TT_BEAMER_BASE_URL=http://127.0.0.1:4173 node debug/p7-t12-sync-regression.mjs`
- Output: `debug/p7-hf4-t12-output.json`
- Key proof:
  - `schemaGuard.usesHopsMsOnly = true`
  - `schemaGuard.missingHopsMsRejected = true`
  - `gateSamples` object exists (`commandAccepted`, `snapshotVersionVisible`, `snapshotApplied`)
  - `lifecycleMaps` object exists (`globalTriggerKeys`, `globalStopKeys`)
  - `hf4DraftImmutabilityGuard.startPathDraftMutationBlocked = true`
  - `hf4DraftImmutabilityGuard.snapshotControlDraftApplyBlocked = true`

## Open Verify Gap

- None for schema integrity; retained as active regression guard for HF4 draft-immutability invariants.
