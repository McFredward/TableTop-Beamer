# Phase 11 Acceptance

## Verification Strategy
- Recovery first: non-loop global suppression on `/output/final` is root-caused and fixed.
- Runtime integrity first: one-shot global trigger is visible on `/output/final` and runs full intended duration exactly once.
- Non-regression first: loop mode behavior remains unchanged.
- Safety first: existing `stop`/`clear` behavior remains unchanged and deterministic.
- Evidence first: FAIL->PASS proof demonstrates one-shot duration parity on control + `/output/final`.

## Hard Gates (Plan 11-HF4, mandatory)
- G11-HF4-1 NonLoop-Final-Suppression-RootCause-Gate: root cause for one-shot suppression on `/output/final` is isolated and documented.
- G11-HF4-2 NonLoop-Final-Visibility-Recovery-Gate: non-loop globals render on `/output/final` after trigger.
- G11-HF4-3 NonLoop-FullDuration-ExactlyOnce-Gate: one-shot globals complete full intended duration exactly once on `/output/final`.
- G11-HF4-4 Loop-Mode-NonRegression-Gate: loop path remains behaviorally unchanged.
- G11-HF4-5 Global-Stop-NonRegression-Gate: explicit stop behavior remains deterministic and unchanged.
- G11-HF4-6 Global-Clear-NonRegression-Gate: clear-all behavior remains deterministic and unchanged.
- G11-HF4-7 Control-Final-OneShot-Parity-Gate: one-shot duration parity remains PASS between control and `/output/final`.
- G11-HF4-8 Artifact-Sync-Gate: phase and global planning artifacts are fully synchronized.

## Strict Regression Matrix
- P11-HF4-NonLoop-Final-Suppression-RED-Test
- P11-HF4-NonLoop-Final-Visibility-Recovery-PASS-Test
- P11-HF4-NonLoop-Final-FullDuration-ExactlyOnce-Test
- P11-HF4-Loop-Mode-NonRegression-Test
- P11-HF4-Global-Stop-NonRegression-Test
- P11-HF4-Global-Clear-NonRegression-Test
- P11-HF4-Control-Final-OneShot-Duration-Parity-FAIL-PASS-Test

## Incremental Mandatory Gates
- After P11-HF4-T1..T2: one-shot suppression regression is reproduced and root-cause isolated.
- After P11-HF4-T3: one-shot final-output visibility + full-duration exactly-once recovery is PASS.
- After P11-HF4-T4..T5: loop and stop/clear safety semantics are confirmed non-regressed.
- After P11-HF4-T6: FAIL->PASS parity evidence is complete.
- After P11-HF4-T7: artifact sync closure is complete.

## Definition of Done
- All hard gates G11-HF4-1..G11-HF4-8 are PASS.
- Non-loop global animations render on `/output/final` and complete full intended duration exactly once.
- Loop mode remains non-regressed.
- Stop/clear semantics remain deterministic and unchanged.
- No regressions in control/final parity for one-shot full-duration playback.
- Phase and global trackers are fully synchronized.

## Plan 11-HF4 Evidence Reference
- Verification report: `.planning/phases/phase-11/11-HF4-VERIFICATION.md`
- Static regression artifact: `debug/p11-hf4-acceptance-regression-output.json`
