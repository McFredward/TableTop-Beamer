# Execute Phase 9

## Acceptance Correction
- Plan 9-1 execution is documented but not accepted.
- Plan 9-HF1 and 9-HF2 are completed baselines.
- Plan 9-HF3 is now the binding next wave.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 9-HF3 (binding, hard-gated wave)
1. P0 first: P9-HF3-T1 (ship canonical coordinate mapping contract shared by control and `/output/final`).
2. P0 next: P9-HF3-T2 (close browser/DPR/fullscreen alignment drift with deterministic recompute).
3. P0 next: P9-HF3-T3 (reproduce/root-cause mixed-media bug: room `malfunction` `mp4` start suppresses room GIF on `/output/final`).
4. P0 next: P9-HF3-T4 (fix mixed-media lifecycle to keep room GIF and room `mp4` rendering independent/stable).
5. P0 next: P9-HF3-T5 (add configurable quality/performance controls for concurrent `mp4` pressure).
6. P0 next: P9-HF3-T6 (implement deterministic degrade/recover strategy for weak hardware).
7. P0 next: P9-HF3-T7 (add explicit toast/error feedback for command/API failure and timeout paths).
8. P0 next: P9-HF3-T8 (validate deterministic sync invariants under HF3 paths).
9. P0 closure: P9-HF3-T9 (execute full matrix + full artifact sync including global tracking files).

## Priority Execution - Plan 9-2 (after 9-HF3 PASS)
1. P1 first: P9-T13 (remove temporary adapters with proven parity).
2. P1 next: P9-T14 (tighten dependency direction and import graph hygiene).
3. P1 closure: P9-T15 (optional advanced diagnostics behind config gates).

## Priority Execution - Plan 9-3 (after 9-2)
1. P1 first: P9-T16 (multi-client real-setup maintainability regression sweep).
2. P1 closure: P9-T17 (final sign-off and closure checklist).

## Gate Rules
- No progress to P9-HF3-T3+ before P9-HF3-T1..T2 close coordinate determinism gates.
- No progress to P9-HF3-T5+ before P9-HF3-T3..T4 close mixed-media `/output/final` lifecycle bug.
- No progress to P9-HF3-T8+ before P9-HF3-T5..T7 pass weak-hardware controls and explicit feedback checks.
- No Plan 9-2 before full PASS of Plan 9-HF3 browser/final-output/weak-hardware/feedback matrices.
- No wave closure without full artifact sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Update task status in `TASKS.md` after each completed item.
- Capture relevant architecture decisions in `.planning/STATE.md` decision log.
- When scope changes, synchronize `PLAN.md`, `BACKLOG.md`, and `ACCEPTANCE.md` in the same step.

## Execution Record

- Plan 9-1: executed with evidence in `9-1-VERIFICATION.md`, but acceptance status corrected to not accepted.
- Plan 9-HF1: completed with hard reduction gate PASS (`src/app.js`: 12163 -> 28 lines), extraction evidence in `9-HF1-BOUNDARY-MAP.md`, `9-HF1-VERIFICATION.md`, and `9-HF1-LINE-COUNT.md`.
- Plan 9-HF2: completed with PASS artifacts for sync invariants, long-run no-replay soak, and low-end stress hardening (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
- Plan 9-HF3: completed with PASS evidence (`9-HF3-SUMMARY.md`, `P9-HF3-REGRESSION-EVIDENCE.md`); Plan 9-2 is unblocked.
