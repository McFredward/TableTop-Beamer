# Execute Phase 9

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 9-1 (binding, first execute-ready wave)
1. P0 first: P9-T1 (finalize extraction ownership map and dependency contracts).
2. P0 next: P9-T2 (thin bootstrap composition root with compatibility adapters).
3. P0 next: P9-T3 (extract shared/pure helpers first for low-risk momentum).
4. P0 next: P9-T4..P9-T5 (state + domain extraction with transition parity checks).
5. P0 next: P9-T6..P9-T7 (UI controller and input guard extraction).
6. P0 next: P9-T8 (render/media extraction with `/output/final` parity gate).
7. P0 next: P9-T9..P9-T10 (English comment uplift + structured logging rollout).
8. P0 closure: P9-T11 (full staged regression matrix + evidence).
9. P0 closure: P9-T12 (full artifact sync including global tracking files).

## Priority Execution - Plan 9-2 (after 9-1)
1. P1 first: P9-T13 (remove temporary adapters with proven parity).
2. P1 next: P9-T14 (tighten dependency direction and import graph hygiene).
3. P1 closure: P9-T15 (optional advanced diagnostics behind config gates).

## Priority Execution - Plan 9-3 (after 9-2)
1. P1 first: P9-T16 (multi-client real-setup maintainability regression sweep).
2. P1 closure: P9-T17 (final sign-off and closure checklist).

## Gate Rules
- No progress to P9-T2+ before P9-T1 fixes module boundaries and extraction order.
- No progress to P9-T4+ before P9-T3 completes shared utility extraction safely.
- No progress to P9-T6+ before P9-T5 passes state/domain parity checks.
- No progress to P9-T9+ before P9-T8 passes render/media and `/output/final` parity checks.
- No Plan 9-2 before full PASS of Plan 9-1 with regression evidence.
- No wave closure without full artifact sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Update task status in `TASKS.md` after each completed item.
- Capture relevant architecture decisions in `.planning/STATE.md` decision log.
- When scope changes, synchronize `PLAN.md`, `BACKLOG.md`, and `ACCEPTANCE.md` in the same step.

## Plan 9-1 Execution Record

- Completed with per-task incremental commits.
- Regression evidence documented in `9-1-VERIFICATION.md`.
- Phase artifacts synchronized in P9-T12.
