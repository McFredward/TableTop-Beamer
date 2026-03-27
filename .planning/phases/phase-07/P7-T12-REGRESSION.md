# P7-T12 Sync Regression Matrix

- Scope: single-click determinism, stale-drop/duplicate guards, bounded queue visibility, HF4 draft-immutability guards, HF5 align/context and board-switch running-clear source guards, HF6 board-context sanitizer/filter guards, HF7 stop-only routing/source guards, plus HF8 global-stop semantics + running-hover stability guards.
- Script: `node debug/p7-t12-sync-regression.mjs`
- Expected: JSON output with `pass: true`, non-negative queue metrics, and live-state endpoint reachable.

## Result

- PASS (Plan 7-HF8): Telemetry verifier remains `hopsMs`-strict and now additionally enforces HF4/HF5/HF6/HF7 guards plus HF8 global-stop semantics/hover-stability source guards.

## Evidence

- Command: `TT_BEAMER_BASE_URL=http://127.0.0.1:4273 node debug/p7-t12-sync-regression.mjs`
- Output: `debug/p7-hf8-t12-output.json`
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
- `hf6BoardResidueEliminationGuards.boardSwitchAtomicClearTransactionGuard = true`
- `hf6BoardResidueEliminationGuards.serverSanitizeBeforePersistBroadcast = true`
- `hf6BoardResidueEliminationGuards.reconnectBoardContextFilterHardEnforced = true`
- `hf7StopDeterminismGuards.stopRoutingUsesStopMutationOnly = true`
- `hf7StopDeterminismGuards.immediateStopSnapshotApplyOnLiveSessionUpdate = true`
- `hf7StopDeterminismGuards.pendingStopInflightUiGuardActive = true`
- `hf7StopDeterminismGuards.serverStopNoopAndClusterReconciliation = true`
- `hf8GlobalStopHoverGuards.stopCommandCarriesGlobalTargetMetadata = true`
- `hf8GlobalStopHoverGuards.serverGlobalStopSemanticsUnifiedForInsideOutside = true`
- `hf8GlobalStopHoverGuards.serverGlobalOutsideStopDisablesOutsideFx = true`
- `hf8GlobalStopHoverGuards.runningListHoverInteractionGuardActive = true`

## Open Verify Gap

- None for schema integrity; retained as active regression guard for HF4+HF5+HF6+HF7+HF8 invariants.
