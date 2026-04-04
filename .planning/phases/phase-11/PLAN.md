# Phase 11 Plan (Hotfix Wave: Global Runtime Recovery + Dashboard Loop Toggle)

## Planning Mode Note
- Plan 11-1 and 11-HF1 remain historical PASS baselines (`11-1-*`, `11-HF1-*`).
- Critical user correction reopens Phase 11 before 11-2.
- Plan 11-HF2 is now the execute-ready priority wave.

## Mandatory Objectives (binding)
1. Recover global animation runtime behavior immediately (rollback/fix) so global triggers start and render again deterministically.
2. Add a dashboard-level quick loop checkbox in global controls so operator chooses per trigger: one-shot vs run-until-stop.
3. Enforce UX rule: loop selection must not require editing global animation definitions.
4. Preserve existing `stop` and `clear` semantics while introducing the per-trigger loop choice.
5. Produce explicit regression evidence that global animations start/stop correctly again across control and `/output/final`.

## Target State
Phase 11 exits HF2 with restored global animation runtime reliability, operator-facing per-trigger loop choice in dashboard global controls, unchanged stop/clear safety semantics, and evidence-backed start/stop parity across control and `/output/final`.

## Binding Product Decisions
- Global animation start path is fail-open and deterministic for all global trigger scopes; no post-HF silent start failure is acceptable.
- Loop behavior is chosen at trigger time from dashboard controls (quick checkbox), not by editing animation definitions.
- Trigger-time loop choice is applied per trigger invocation and does not mutate persisted animation definitions.
- Existing explicit `stop` and `clear` actions retain authority and lifecycle behavior for both one-shot and looping runs.
- Recovery work is prioritized as rollback-first where safest, then minimal forward fix for dashboard loop UX.

## Scope (Plan 11-HF2, execute-ready)
- Reproduce and close critical post-HF regression where global animations fail to run.
- Implement rollback/recovery on global runtime start/lifecycle path with deterministic behavior.
- Add dashboard quick loop checkbox for global trigger controls (`one-shot` vs `loop until stopped`).
- Wire trigger payload/runtime so per-trigger loop mode applies without editing definitions.
- Verify stop/clear non-regression for global one-shot and looping paths.
- Run regression matrix for global start/stop/clear parity, control/final parity, and trigger-loop UX behavior.
- Synchronize all phase/global planning artifacts.

## Out of Scope
- New animation content packs beyond loop control.
- Non-phase-11 UX redesign not required for the five mandatory items.
- Protocol-family rewrite beyond deterministic lifecycle fixes in scope.

## Prioritized Next Execution Wave (Plan 11-HF2, execute-ready)
1. Create deterministic RED repro for broken global animation start/runtime behavior.
2. Apply rollback-first runtime recovery patch for global animations.
3. Verify immediate PASS for global start visibility on control + `/output/final`.
4. Add dashboard-level quick loop checkbox in global trigger controls.
5. Implement per-trigger loop semantics in command payload/runtime apply path (no definition edit required).
6. Execute stop/clear non-regression matrix for one-shot and looping global runs.
7. Execute cross-client parity matrix (control peers + `/output/final`) for global start/stop.
8. Capture FAIL->PASS evidence and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Milestones
1. M1 Global Runtime Recovery Closure.
2. M2 Dashboard Per-Trigger Loop Toggle Closure.
3. M3 Stop/Clear Semantics Non-Regression Closure.
4. M4 Cross-Client Start/Stop Evidence Closure.
5. M5 Artifact Sync Closure.

## Regression/Evidence Matrix Policy
- P11-HF2-Global-Start-Regression-RED-Test
- P11-HF2-Global-Start-Recovery-PASS-Test
- P11-HF2-Dashboard-Loop-Toggle-PerTrigger-Test
- P11-HF2-PerTrigger-Loop-NoDefinitionEdit-Test
- P11-HF2-Global-Loop-Stop-Behavior-Test
- P11-HF2-Global-OneShot-Completion-Behavior-Test
- P11-HF2-Global-Stop-NonRegression-Test
- P11-HF2-Global-Clear-NonRegression-Test
- P11-HF2-Control-Final-StartStop-Parity-Test
- P11-HF2-CrossClient-Trigger-Parity-Test

## Definition of Done
- All Plan 11-HF2 hard gates pass for global runtime recovery and dashboard loop UX clarification.
- Global animations start deterministically again without rollback side effects.
- Global loop mode is chosen per trigger in dashboard controls without editing definitions.
- Stop and clear behavior remains unchanged and deterministic.
- Cross-client start/stop parity (including `/output/final`) is PASS with evidence.
- Phase and global planning artifacts are synchronized (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).
