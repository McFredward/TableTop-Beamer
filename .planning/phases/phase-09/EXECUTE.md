# Execute Phase 9

## Acceptance Correction
- Plan 9-1 execution is documented but not accepted.
- Plan 9-HF1, 9-HF2, and 9-HF3 are completed baselines.
- Plan 9-HF4 is now the binding next wave.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 9-HF4 (binding, hard-gated wave)
1. P0 first: P9-HF4-T1 (reproduce/root-cause restart coupling: room start rewinds outside sandstorm playback).
2. P0 next: P9-HF4-T2 (isolate outside playback state ownership from room/cluster/global-inside lifecycle).
3. P0 next: P9-HF4-T3 (add strict guard so outside media cache/reset cannot fire on unrelated starts).
4. P0 next: P9-HF4-T4 (preserve explicit outside stop/clear semantics with unchanged deterministic behavior).
5. P0 next: P9-HF4-T5 (validate deterministic sync invariants under HF4 lifecycle isolation paths).
6. P0 next: P9-HF4-T6 (execute repeated room-start regression proving no outside restart).
7. P0 closure: P9-HF4-T7 (record evidence + full artifact sync including global tracking files).

## Priority Execution - Plan 9-2 (after 9-HF4 PASS)
1. P1 first: P9-T13 (remove temporary adapters with proven parity).
2. P1 next: P9-T14 (tighten dependency direction and import graph hygiene).
3. P1 closure: P9-T15 (optional advanced diagnostics behind config gates).

## Priority Execution - Plan 9-3 (after 9-2)
1. P1 first: P9-T16 (multi-client real-setup maintainability regression sweep).
2. P1 closure: P9-T17 (final sign-off and closure checklist).

## Gate Rules
- No progress to P9-HF4-T3+ before P9-HF4-T1..T2 close lifecycle coupling isolation gate.
- No progress to P9-HF4-T5+ before P9-HF4-T3..T4 close cache-reset and stop/clear semantics gates.
- No Plan 9-2 before full PASS of Plan 9-HF4 repeated-room-start/cross-scope/stop-clear/sync matrices.
- No wave closure without full artifact sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Update task status in `TASKS.md` after each completed item.
- Capture relevant architecture decisions in `.planning/STATE.md` decision log.
- When scope changes, synchronize `PLAN.md`, `BACKLOG.md`, and `ACCEPTANCE.md` in the same step.

## Execution Record

- Plan 9-1: executed with evidence in `9-1-VERIFICATION.md`, but acceptance status corrected to not accepted.
- Plan 9-HF1: completed with hard reduction gate PASS (`src/app.js`: 12163 -> 28 lines), extraction evidence in `9-HF1-BOUNDARY-MAP.md`, `9-HF1-VERIFICATION.md`, and `9-HF1-LINE-COUNT.md`.
- Plan 9-HF2: completed with PASS artifacts for sync invariants, long-run no-replay soak, and low-end stress hardening (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
- Plan 9-HF3: completed with PASS evidence (`9-HF3-SUMMARY.md`, `P9-HF3-REGRESSION-EVIDENCE.md`).
- Plan 9-HF4: completed PASS with outside lifecycle isolation and repeated room-start non-restart evidence (`9-HF4-VERIFICATION.md`, `P9-HF4-T6-REPEATED-ROOM-START-REGRESSION.md`).
