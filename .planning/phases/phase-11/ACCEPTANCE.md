# Phase 11 Acceptance

## Verification Strategy
- Recovery first: broken global runtime behavior is restored immediately (start path deterministic again).
- Operator-speed first: loop choice is available where trigger happens (Dashboard global controls).
- UX contract first: per-trigger loop mode does not require editing animation definitions.
- Safety first: existing `stop`/`clear` behavior remains unchanged and deterministic.
- Evidence first: FAIL->PASS proof demonstrates global start/stop correctness on control + `/output/final` + peers.

## Hard Gates (Plan 11-HF2, mandatory)
- G11-HF2-1 Global-Start-Recovery-Gate: global animations start/run deterministically again after rollback/fix.
- G11-HF2-2 Global-Start-Visibility-Gate: recovered global runs are visible on control + `/output/final` + peers without extra operator retries.
- G11-HF2-3 Dashboard-Loop-Toggle-Gate: `Loop until stopped` exists directly in Dashboard global controls.
- G11-HF2-4 PerTrigger-Loop-Semantics-Gate: loop choice applies per trigger invocation (`one-shot` vs `until explicit stop`).
- G11-HF2-5 No-Definition-Edit-Required-Gate: operator can choose loop mode without entering animation definition editor.
- G11-HF2-6 Global-Stop-NonRegression-Gate: explicit stop behavior remains deterministic and unchanged.
- G11-HF2-7 Global-Clear-NonRegression-Gate: clear-all behavior remains deterministic and unchanged.
- G11-HF2-8 Control-Final-Parity-Gate: global start/stop parity remains PASS between control and `/output/final`.
- G11-HF2-9 Artifact-Sync-Gate: phase and global planning artifacts are fully synchronized.

## Strict Regression Matrix
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

## Incremental Mandatory Gates
- After P11-HF2-T1..T2: global runtime regression is reproduced then closed via recovery patch.
- After P11-HF2-T3..T4: dashboard per-trigger loop choice is closed without definition-edit dependency.
- After P11-HF2-T5: stop/clear safety semantics are confirmed non-regressed.
- After P11-HF2-T6..T7: full FAIL->PASS matrix and parity evidence are complete.
- After P11-HF2-T8: artifact sync closure is complete.

## Definition of Done
- All hard gates G11-HF2-1..G11-HF2-9 are PASS.
- Global animations start/stop correctly again after recovery.
- Loop mode is selected per trigger from dashboard global controls.
- Operator does not need to edit animation definitions to choose loop behavior.
- Stop/clear semantics remain deterministic and unchanged.
- No regressions in control/final parity for global lifecycle behavior.
- Phase and global trackers are fully synchronized.

## Plan 11-HF2 Evidence Reference
- Verification report: `.planning/phases/phase-11/11-HF2-VERIFICATION.md`
- Static regression artifact: `debug/p11-hf2-acceptance-regression-output.json`
