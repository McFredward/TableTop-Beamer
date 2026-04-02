# Execute Phase 9

## Acceptance Correction
- Plan 9-1 execution is documented but not accepted.
- Plan 9-HF1 is completed baseline.
- Plan 9-HF2 is now the binding next wave.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 9-HF2 (binding, hard-gated wave)
1. P0 first: P9-HF2-T1 (rehydrate lifecycle reconciliation marks elapsed one-shot events as terminal).
2. P0 next: P9-HF2-T2 (enforce no-replay guard for expired one-shot events across reload/reconnect).
3. P0 next: P9-HF2-T3 (align deterministic lifecycle semantics between local rehydrate and synced reconnect).
4. P0 next: P9-HF2-T4 (enable frame-budget aware load-shedding ladder for weak/mobile devices).
5. P0 next: P9-HF2-T5 (apply particle/effect caps and coalescing for non-critical updates under pressure).
6. P0 next: P9-HF2-T6 (validate deterministic sync invariants under hardening paths).
7. P0 closure: P9-HF2-T7 (long-run soak matrix PASS with replay assertions).
8. P0 closure: P9-HF2-T8 (low-end mobile stress matrix PASS with stability evidence).
9. P0 closure: P9-HF2-T9 (full artifact sync including global tracking files).

## Priority Execution - Plan 9-2 (after 9-HF2 PASS)
1. P1 first: P9-T13 (remove temporary adapters with proven parity).
2. P1 next: P9-T14 (tighten dependency direction and import graph hygiene).
3. P1 closure: P9-T15 (optional advanced diagnostics behind config gates).

## Priority Execution - Plan 9-3 (after 9-2)
1. P1 first: P9-T16 (multi-client real-setup maintainability regression sweep).
2. P1 closure: P9-T17 (final sign-off and closure checklist).

## Gate Rules
- No progress to P9-HF2-T3+ before P9-HF2-T1..T2 close lifecycle reconciliation and no-replay guard.
- No progress to P9-HF2-T6+ before P9-HF2-T4..T5 pass low-end hardening checks.
- No Plan 9-2 before full PASS of Plan 9-HF2 long-run and mobile matrices.
- No wave closure without full artifact sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Update task status in `TASKS.md` after each completed item.
- Capture relevant architecture decisions in `.planning/STATE.md` decision log.
- When scope changes, synchronize `PLAN.md`, `BACKLOG.md`, and `ACCEPTANCE.md` in the same step.

## Execution Record

- Plan 9-1: executed with evidence in `9-1-VERIFICATION.md`, but acceptance status corrected to not accepted.
- Plan 9-HF1: completed with hard reduction gate PASS (`src/app.js`: 12163 -> 28 lines), extraction evidence in `9-HF1-BOUNDARY-MAP.md`, `9-HF1-VERIFICATION.md`, and `9-HF1-LINE-COUNT.md`.
- Plan 9-HF2: completed with PASS artifacts for sync invariants, long-run no-replay soak, and low-end stress hardening (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
