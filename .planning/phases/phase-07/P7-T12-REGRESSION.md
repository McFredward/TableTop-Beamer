# P7-T12 Sync Regression Matrix

- Scope: single-click determinism, stale-drop/duplicate guards, bounded queue visibility, HF4 draft-immutability guards, plus HF5 align/context and board-switch running-clear source guards.
- Script: `node debug/p7-t12-sync-regression.mjs`
- Expected: JSON output with `pass: true`, non-negative queue metrics, and live-state endpoint reachable.

## Result

- PASS (Plan 7-HF5): Telemetry verifier remains `hopsMs`-strict and now additionally enforces HF4 draft-immutability invariants and HF5 code guards (align toggle via `context-update`, strict stale/equal-version reject in poll+reconnect paths, board-switch running-clear in context patch, final-output align apply parity).

## Evidence

- Command: `TT_BEAMER_BASE_URL=http://127.0.0.1:4173 node debug/p7-t12-sync-regression.mjs`
- Output: `debug/p7-hf5-t12-output.json`
- Key proof:
  - `schemaGuard.usesHopsMsOnly = true`
  - `schemaGuard.missingHopsMsRejected = true`
  - `gateSamples` object exists (`commandAccepted`, `snapshotVersionVisible`, `snapshotApplied`)
  - `lifecycleMaps` object exists (`globalTriggerKeys`, `globalStopKeys`)
  - `hf4DraftImmutabilityGuard.startPathDraftMutationBlocked = true`
  - `hf4DraftImmutabilityGuard.snapshotControlDraftApplyBlocked = true`
  - `hf5AlignBoardSwitchGuards.alignToggleCommandUsesContextUpdate = true`
  - `hf5AlignBoardSwitchGuards.alignSnapshotApplySynchronizesPanelsOnAllRoles = true`
  - `hf5AlignBoardSwitchGuards.boardSwitchClearsRunningInContextPatch = true`
  - `hf5AlignBoardSwitchGuards.staleEqualVersionRejectEnabledForPollAndReconnect = true`

## Open Verify Gap

- None for schema integrity; retained as active regression guard for HF4+HF5 invariants.
