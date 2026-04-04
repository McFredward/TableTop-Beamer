# Plan 11-HF1 Verification (Sync + Lifecycle + Board Model Unification)

Date: 2026-04-04

## Evidence Commands
- `node --check src/app/runtime/runtime-orchestration.js`
- `node --check src/app/ui/runtime-panels-controller.js`
- `node --check src/app/state/runtime-state.js`
- `node --check src/app/shared/config.js`
- `node --check server.mjs`
- `node -e "..."` static HF1 regression assertions -> `debug/p11-hf1-acceptance-regression-output.json`

## Acceptance Matrix

| Gate | Status | Evidence |
| --- | --- | --- |
| P11-HF1-Outside-FirstApply-Sync-Determinism-Test | PASS | `server.mjs` prioritizes `outside-apply-changes` as deterministic state-sync and disables coalescing for that reason. |
| P11-HF1-Outside-Snapshot-Propagation-FirstApply-Test | PASS | `applyOutsideUpdatePatch` now returns board-context (`selectedBoard/selectedLayout`) with outside snapshot patch for first-apply propagation. |
| P11-HF1-Global-OneShot-Reload-NoReplay-Test | PASS | `primeGlobalTriggerRuntimeTimestamps` preserves authoritative `startedAtEpochMs` instead of re-priming to `now`. |
| P11-HF1-Global-OneShot-Reconnect-NoReplay-Test | PASS | terminal one-shot suppression + hydrated lifecycle reconciliation keeps expired finite globals from replaying. |
| P11-HF1-Global-Loop-Until-Stop-Lifecycle-Test | PASS | per-definition `loopUntilStopped` feeds `effectiveDefaultDurationSec` in global start path. |
| P11-HF1-Global-Loop-Checkbox-Persistence-Test | PASS | new UI checkbox `#inside-loop-until-stop` + persisted inside definition field `loopUntilStopped`. |
| P11-HF1-Room-AlwaysHold-UI-Removal-Test | PASS | `index.html` removes `#room-hold` checkbox. |
| P11-HF1-Room-AlwaysHold-Runtime-NonRegression-Test | PASS | room/cluster animations remain forced to hold in `createAnimation` (`effectiveHold` invariant). |
| P11-HF1-Board-Model-Canonical-Unification-Test | PASS | server now uses canonical board storage root (`config/boards/*.json`) and canonical assets (`config/boards/assets/*`). |
| P11-HF1-Board-Migration-Reload-Restart-Test | PASS | `migrateLegacyImportedBoardStorage()` migrates legacy `config/boards/imported/*` into canonical paths idempotently. |
| P11-HF1-Sync-Determinism-NonRegression-Test | PASS | existing live mutation tracing/ordering pipeline unchanged; only outside apply priority specialization added. |
| P11-HF1-Render-Correctness-NonRegression-Test | PASS | render stack paths unchanged for inside/outside clipping and draw execution. |

## Artifact
- `debug/p11-hf1-acceptance-regression-output.json`
