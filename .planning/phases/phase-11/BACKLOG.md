# Phase 11 Backlog (Mandatory HF4 Non-Loop Final-Output Recovery Package)

## Epics
- Non-Loop Global Final-Output Suppression Root-Cause Isolation [P0]
- One-Shot Global Final-Output Visibility + Full-Duration Recovery [P0]
- Loop Mode Non-Regression Protection [P0]
- Stop/Clear Lifecycle Semantics Preservation [P0]
- Final-Output One-Shot Duration Parity FAIL->PASS Evidence Closure [P0]
- Planning Artifact Synchronization [P0]

## Story Mapping
- P11-HF4-S1 Reproduce P0 regression: non-loop global triggers do not appear on `/output/final` while loop mode still works.
- P11-HF4-S2 Isolate root-cause suppression path for one-shot globals in final-output runtime/lifecycle.
- P11-HF4-S3 Implement deterministic one-shot fix so `/output/final` renders full intended duration exactly once.
- P11-HF4-S4 Execute loop-mode non-regression matrix to ensure sustained looping/start-stop behavior remains intact.
- P11-HF4-S5 Execute stop/clear non-regression matrix across mixed one-shot + loop runs.
- P11-HF4-S6 Capture FAIL->PASS evidence for `/output/final` one-shot duration parity with control.
- P11-HF4-S7 Synchronize phase and global planning trackers.

## Prioritized Execution Wave (P0) - Plan 11-HF4 (execute-ready now)
- Story P11-HF4-S1 + P11-HF4-S2.
  - Goal: deterministic RED + root-cause isolation for one-shot suppression on `/output/final`.
- Story P11-HF4-S3.
  - Goal: one-shot global trigger renders on `/output/final` for full intended duration exactly once.
- Story P11-HF4-S4 + P11-HF4-S5.
  - Goal: preserve loop mode and stop/clear semantics with explicit non-regression evidence.
- Story P11-HF4-S6.
  - Goal: strict FAIL->PASS parity proof for one-shot duration on control vs `/output/final`.
- Story P11-HF4-S7.
  - Goal: full planning artifact sync closure.

## Follow-up Waves
- Plan 11-2: post-HF4 UX polish and optional operator ergonomics refinements.
- Plan 11-3: optional presets/macros after HF4 stability confirmation.
