# Execute Phase 9

## Acceptance Correction
- Plan 9-1 execution is documented but not accepted.
- Plan 9-HF1 is now the binding next wave.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 9-HF1 (binding, hard-gated wave)
1. P0 first: P9-HF1-T1 (freeze mandatory extraction map for editor/runtime/sync/settings/media).
2. P0 next: P9-HF1-T2 (extract editor flows from `src/app.js`).
3. P0 next: P9-HF1-T3 (extract animation runtime orchestration from `src/app.js`).
4. P0 next: P9-HF1-T4 (extract sync command handlers from `src/app.js`).
5. P0 next: P9-HF1-T5 (extract settings controllers from `src/app.js`).
6. P0 next: P9-HF1-T6 (extract media handlers from `src/app.js`).
7. P0 next: P9-HF1-T7 (enforce bootstrap-only ownership in `src/app.js`).
8. P0 closure: P9-HF1-T8 (strict regression matrix PASS with evidence).
9. P0 closure: P9-HF1-T9 (line-count gate PASS: `wc -l src/app.js` <= 4200 from 12163 baseline).
10. P0 closure: P9-HF1-T10 (full artifact sync including global tracking files).

## Priority Execution - Plan 9-2 (after 9-HF1 PASS)
1. P1 first: P9-T13 (remove temporary adapters with proven parity).
2. P1 next: P9-T14 (tighten dependency direction and import graph hygiene).
3. P1 closure: P9-T15 (optional advanced diagnostics behind config gates).

## Priority Execution - Plan 9-3 (after 9-2)
1. P1 first: P9-T16 (multi-client real-setup maintainability regression sweep).
2. P1 closure: P9-T17 (final sign-off and closure checklist).

## Gate Rules
- No progress to P9-HF1-T2+ before P9-HF1-T1 fixes mandatory extraction boundaries and order.
- No progress between mandatory domain slices unless the previous slice passes targeted parity checks.
- No progress to P9-HF1-T8+ before P9-HF1-T7 confirms bootstrap-only ownership for `src/app.js`.
- No Plan 9-2 before full PASS of Plan 9-HF1 regression matrix and measurable line-count gate.
- No wave closure without full artifact sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Update task status in `TASKS.md` after each completed item.
- Capture relevant architecture decisions in `.planning/STATE.md` decision log.
- When scope changes, synchronize `PLAN.md`, `BACKLOG.md`, and `ACCEPTANCE.md` in the same step.

## Execution Record

- Plan 9-1: executed with evidence in `9-1-VERIFICATION.md`, but acceptance status corrected to not accepted.
- Plan 9-HF1: completed with hard reduction gate PASS (`src/app.js`: 12163 -> 28 lines), extraction evidence in `9-HF1-BOUNDARY-MAP.md`, `9-HF1-VERIFICATION.md`, and `9-HF1-LINE-COUNT.md`.
