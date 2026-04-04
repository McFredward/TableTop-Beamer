# Phase 11 Plan (Hotfix Wave: 11-HF4 Non-Loop Global Final-Output Recovery)

## Planning Mode Note
- Plan 11-1, 11-HF1, 11-HF2, and 11-HF3 remain historical implementation baselines (`11-1-*`, `11-HF1-*`, `11-HF2-*`, `11-HF3-*`).
- New critical P0 field regression after HF3 reopens Phase 11 before 11-2.
- Plan 11-HF4 is now the execute-ready priority wave.

## Mandatory Objectives (binding)
1. Isolate root cause for non-loop global animation suppression on `/output/final` introduced after HF3.
2. Fix runtime so non-loop global trigger renders on `/output/final` and runs full intended duration exactly once.
3. Preserve loop-mode behavior (no regression for global loop path).
4. Preserve explicit `stop` and `clear` semantics unchanged.
5. Produce explicit FAIL->PASS evidence for `/output/final` one-shot duration parity.

## Target State
Phase 11 exits HF4 with non-loop global animations reliably visible on `/output/final`, playing full intended duration exactly once, while loop behavior and stop/clear semantics remain unchanged and evidence-backed.

## Binding Product Decisions
- Non-loop global trigger path is required to execute on `/output/final` exactly once per trigger invocation and for full configured duration.
- Loop and non-loop global paths share deterministic lifecycle semantics but remain behaviorally distinct (repeat vs one-shot).
- Existing explicit `stop` and `clear` actions retain authority and lifecycle behavior.
- HF4 scope does not relax HF3 audio-toggle semantics; this wave focuses on non-loop `/output/final` suppression recovery.

## Scope (Plan 11-HF4, execute-ready)
- Isolate root cause for post-HF3 suppression where non-loop globals fail to appear on `/output/final`.
- Implement deterministic fix so one-shot global trigger renders and runs once for full intended duration on `/output/final`.
- Validate no regression in loop-mode path.
- Validate explicit stop/clear semantics remain unchanged.
- Run regression matrix focused on `/output/final` one-shot duration parity and control-vs-final equivalence.
- Synchronize all phase/global planning artifacts.

## Out of Scope
- New animation content packs beyond audio/loop control.
- Non-phase-11 UX redesign not required for the mandatory items.
- Protocol-family rewrite beyond deterministic lifecycle/audio fixes in scope.

## Prioritized Next Execution Wave (Plan 11-HF4, execute-ready)
1. Create deterministic RED repro for non-loop suppression on `/output/final` (loop path remains visible).
2. Isolate root-cause branch/contract mismatch between loop and one-shot global lifecycle handling.
3. Implement fix ensuring one-shot `/output/final` trigger visibility and full-duration exactly-once completion.
4. Verify no loop-mode regression (start, sustained loop, stop).
5. Verify stop/clear non-regression in mixed one-shot + loop sequences.
6. Execute strict control-vs-final parity matrix for one-shot duration completion.
7. Capture explicit FAIL->PASS evidence and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Milestones
1. M1 Non-Loop Suppression Root-Cause Isolation Closure.
2. M2 One-Shot Final-Output Visibility + Full-Duration Exactly-Once Fix Closure.
3. M3 Loop/Stop/Clear Non-Regression Closure.
4. M4 `/output/final` One-Shot Duration Parity FAIL->PASS Closure.
5. M5 Artifact Sync Closure.

## Regression/Evidence Matrix Policy
- P11-HF4-NonLoop-Final-Suppression-RED-Test
- P11-HF4-NonLoop-Final-Visibility-Recovery-PASS-Test
- P11-HF4-NonLoop-Final-FullDuration-ExactlyOnce-Test
- P11-HF4-Loop-Mode-NonRegression-Test
- P11-HF4-Global-Stop-NonRegression-Test
- P11-HF4-Global-Clear-NonRegression-Test
- P11-HF4-Control-Final-OneShot-Duration-Parity-FAIL-PASS-Test

## Definition of Done
- All Plan 11-HF4 hard gates pass.
- Non-loop global triggers render on `/output/final` and complete full intended duration exactly once.
- Loop-mode behavior remains PASS and unchanged.
- Stop/clear semantics remain deterministic and unchanged.
- `/output/final` one-shot duration parity is closed with explicit FAIL->PASS evidence.
- Phase and global planning artifacts are synchronized (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).
