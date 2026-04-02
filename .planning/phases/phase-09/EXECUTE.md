# Execute Phase 9

## Acceptance Correction
- Plan 9-1 execution is documented but not accepted.
- Plan 9-HF1 is completed baseline.
- Plan 9-HF2 is completed baseline.
- Plan 9-HF3 has been executed and closed with PASS evidence.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 9-HF3 (binding, hard-gated wave)
1. P0 first: P9-HF3-T1 (profile video-heavy Raspberry/mobile bottlenecks with reproducible traces).
2. P0 next: P9-HF3-T2 (optimize decode/render scheduling to prevent frame starvation).
3. P0 next: P9-HF3-T3 (implement deterministic video buffering/warmup to avoid startup/seek hitch spikes).
4. P0 next: P9-HF3-T4 (optimize video draw strategy for smooth pacing under contention).
5. P0 next: P9-HF3-T5 (enforce final-output-first priority so `/output/final` stays fluid under load).
6. P0 next: P9-HF3-T6 (preserve control-view responsiveness while priority policy is active).
7. P0 next: P9-HF3-T7 (activate deterministic adaptive quality/load-shedding ladder for weak devices).
8. P0 closure: P9-HF3-T8 (run strict video-heavy performance matrix with measurable thresholds).
9. P0 closure: P9-HF3-T9 (validate sync/lifecycle/stop non-regression under HF3 hardening).
10. P0 closure: P9-HF3-T10 (full artifact sync including global tracking files).

## Priority Execution - Plan 9-2 (after 9-HF3 PASS)
1. P1 first: P9-T13 (remove temporary adapters with proven parity).
2. P1 next: P9-T14 (tighten dependency direction and import graph hygiene).
3. P1 closure: P9-T15 (optional advanced diagnostics behind config gates).

## Priority Execution - Plan 9-3 (after 9-2)
1. P1 first: P9-T16 (multi-client real-setup maintainability regression sweep).
2. P1 closure: P9-T17 (final sign-off and closure checklist).

## Gate Rules
- No progress to P9-HF3-T5+ before P9-HF3-T1..T4 close core video render-path bottlenecks.
- No progress to P9-HF3-T8+ before P9-HF3-T5..T7 validate final-output priority and adaptive weak-device behavior.
- No Plan 9-2 before full PASS of Plan 9-HF3 strict performance and non-regression matrices.
- No wave closure without full artifact sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Update task status in `TASKS.md` after each completed item.
- Capture relevant architecture decisions in `.planning/STATE.md` decision log.
- When scope changes, synchronize `PLAN.md`, `BACKLOG.md`, and `ACCEPTANCE.md` in the same step.

## Execution Record

- Plan 9-1: executed with evidence in `9-1-VERIFICATION.md`, but acceptance status corrected to not accepted.
- Plan 9-HF1: completed with hard reduction gate PASS (`src/app.js`: 12163 -> 28 lines), extraction evidence in `9-HF1-BOUNDARY-MAP.md`, `9-HF1-VERIFICATION.md`, and `9-HF1-LINE-COUNT.md`.
- Plan 9-HF2: completed with PASS artifacts for sync invariants, long-run no-replay soak, and low-end stress hardening (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
- Plan 9-HF3: completed P0 wave with PASS evidence for baseline profiling, scheduler/warmup/draw hardening, final-output priority, control responsiveness, adaptive ladder behavior, strict performance thresholds, and deterministic non-regression (`P9-HF3-T1-VIDEO-PROFILING-BASELINE.md`, `P9-HF3-T2-VIDEO-SCHEDULER.md`, `P9-HF3-T3-VIDEO-WARMUP.md`, `P9-HF3-T4-VIDEO-DRAW-STRATEGY.md`, `P9-HF3-T5-FINAL-OUTPUT-PRIORITY.md`, `P9-HF3-T6-CONTROL-RESPONSIVENESS.md`, `P9-HF3-T7-ADAPTIVE-LADDER.md`, `P9-HF3-T8-VIDEO-PERFORMANCE-SUITE.md`, `P9-HF3-T9-DETERMINISM-REGRESSION.md`).
