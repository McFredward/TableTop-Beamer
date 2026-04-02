# Execute Phase 9

## Reopen and priority context
- Plan 9-1 is documented but not accepted.
- Plan 9-HF1 and 9-HF2 remain valid foundations.
- Plan 9-HF3 gate is reopened due to critical reliability regressions.
- Immediate execution target is Plan 9-HF4 (P0 stabilization with controlled simplification).

## Input pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority execution - Plan 9-HF4 (binding, hard-gated)
1. P0 first: P9-HF4-T1 (capture deterministic FAIL reproductions for all critical regressions).
2. P0 next: P9-HF4-T2 (unify start/stop into one deterministic runtime path).
3. P0 next: P9-HF4-T3 (enforce startup invariants; remove phantom/duplicate run behavior).
4. P0 next: P9-HF4-T4 (implement atomic board switch apply with image+polygon parity).
5. P0 next: P9-HF4-T5 (harden `/output/final` bootstrap/load/reconnect reliability).
6. P0 next: P9-HF4-T6 (remove/gate destabilizing scheduler complexity; keep only required low-end guards).
7. P0 next: P9-HF4-T7 (ship runtime profiles and fail-safe feature flags with safe default).
8. P0 closure: P9-HF4-T8 (validate deterministic server-authoritative sync and mobile->pi reliability).
9. P0 closure: P9-HF4-T9 (run FAIL->PASS matrix and core runtime smoke journeys).
10. P0 closure: P9-HF4-T10 (synchronize all planning artifacts including global trackers).

## Priority execution - Plan 9-2 (after 9-HF4 PASS)
1. P1 first: P9-T13 (remove temporary adapters with proven parity).
2. P1 next: P9-T14 (tighten dependency direction and import graph hygiene).
3. P1 closure: P9-T15 (focused diagnostics behind config gates).

## Priority execution - Plan 9-3 (after 9-2)
1. P1 first: P9-T16 (multi-client real-setup maintainability regression sweep).
2. P1 closure: P9-T17 (final sign-off and closure checklist).

## Gate rules
- No optimization-heavy work before G1..G4 core reliability gates are PASS.
- No progression beyond P9-HF4-T5 until startup/start-stop/board-switch/final-load failures are demonstrably fixed.
- No Plan 9-2 before full PASS of HF4 gates including FAIL->PASS evidence and smoke matrix.
- No wave closure without full artifact sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update rules
- Update task status in `TASKS.md` after each completed item.
- Record architecture/runtime simplification decisions in `.planning/STATE.md` decision log.
- If scope or gates shift, sync `PLAN.md`, `BACKLOG.md`, and `ACCEPTANCE.md` together in the same step.

## Execution record
- Plan 9-HF1 remains PASS as modularization baseline.
- Plan 9-HF2 remains PASS as lifecycle/no-replay baseline.
- Plan 9-HF3 execution artifacts remain documented, but closure is revoked by regression feedback.
- Plan 9-HF4 is now the authoritative execute-ready stabilization wave.
- Plan 9-HF4 execution completed with fail/pass evidence and smoke artifacts (`P9-HF4-T1-FAIL-BASELINES.md`, `P9-HF4-T9-FAIL-PASS-SMOKE.md`).
