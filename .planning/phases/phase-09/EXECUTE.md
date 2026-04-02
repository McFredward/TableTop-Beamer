# Execute Phase 9

## Acceptance Correction
- Plan 9-1 execution is documented but not accepted.
- Plan 9-HF1 and Plan 9-HF2 are completed baselines.
- Plan 9-HF3 is now the binding next wave.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 9-HF3 (binding, hard-gated wave)
1. P0 first: P9-HF3-T1 (complete architecture decision and feasibility evidence for server-composed `/output/final` stream).
2. P0 next: P9-HF3-T2 (implement server compositor pipeline fed by authoritative snapshots).
3. P0 next: P9-HF3-T3 (deliver stream endpoint + `/output/final` stream playback integration).
4. P0 next: P9-HF3-T4 (add stream health monitoring + deterministic auto-fallback to existing client render).
5. P0 next: P9-HF3-T5 (add explicit operator override for stream/fallback mode).
6. P0 next: P9-HF3-T6 (enforce align-mode parity between stream and fallback outputs).
7. P0 next: P9-HF3-T7 (validate deterministic sync invariants remain unchanged under stream mode).
8. P0 closure: P9-HF3-T8 (validate control-view interactivity while stream pipeline is active).
9. P0 closure: P9-HF3-T9 (execute weak-hardware matrix for smooth playback and fallback resilience).
10. P0 closure: P9-HF3-T10 (full artifact sync including global tracking files).

## Priority Execution - Plan 9-2 (after 9-HF3 PASS)
1. P1 first: P9-T13 (remove temporary adapters with proven parity).
2. P1 next: P9-T14 (tighten dependency direction and import graph hygiene).
3. P1 closure: P9-T15 (optional advanced diagnostics behind config gates).

## Priority Execution - Plan 9-3 (after 9-2)
1. P1 first: P9-T16 (multi-client real-setup maintainability regression sweep).
2. P1 closure: P9-T17 (final sign-off and closure checklist).

## Gate Rules
- No progress to P9-HF3-T2+ before P9-HF3-T1 closes feasibility with explicit go/no-go criteria.
- No progress to P9-HF3-T6+ before P9-HF3-T4..T5 fallback safety is PASS.
- No progress to P9-HF3-T8+ before P9-HF3-T6..T7 pass align/sync contract checks.
- No Plan 9-2 before full PASS of Plan 9-HF3 weak-hardware and fallback matrices.
- No wave closure without full artifact sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Update task status in `TASKS.md` after each completed item.
- Capture relevant architecture decisions in `.planning/STATE.md` decision log.
- When scope changes, synchronize `PLAN.md`, `BACKLOG.md`, and `ACCEPTANCE.md` in the same step.

## Execution Record

- Plan 9-1: executed with evidence in `9-1-VERIFICATION.md`, but acceptance status corrected to not accepted.
- Plan 9-HF1: completed with hard reduction gate PASS (`src/app.js`: 12163 -> 28 lines), extraction evidence in `9-HF1-BOUNDARY-MAP.md`, `9-HF1-VERIFICATION.md`, and `9-HF1-LINE-COUNT.md`.
- Plan 9-HF2: completed with PASS artifacts for sync invariants, long-run no-replay soak, and low-end stress hardening (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
- Plan 9-HF3: completed with PASS artifacts for ADR, stream delivery, auto/manual fallback, align parity, sync invariants, control responsiveness, and weak-hardware matrix (`P9-HF3-T1-STREAM-ADR.md`, `P9-HF3-T6-ALIGN-PARITY.md`, `P9-HF3-T7-SYNC-INVARIANTS.md`, `P9-HF3-T8-CONTROL-RESPONSIVENESS.md`, `P9-HF3-T9-WEAK-HARDWARE-MATRIX.md`).
