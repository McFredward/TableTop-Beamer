# Execute Phase 9

## Acceptance Correction
- Plan 9-1 execution is documented but not accepted.
- Plan 9-HF1, Plan 9-HF2, Plan 9-HF3, Plan 9-HF4, Plan 9-HF5, and Plan 9-HF6 are completed baselines.
- Plan 9-HF7 is now the binding next wave.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 9-HF7 (binding, hard-gated wave)
1. P0 first: P9-HF7-T1 (deterministic repro + traces for stale/fallback `/output/final` behavior).
2. P0 next: P9-HF7-T2 (remove client fallback runtime paths for `/output/final` entirely).
3. P0 next: P9-HF7-T3 (enforce always-on authoritative producer independent of subscriber count/churn).
4. P0 next: P9-HF7-T4 (bind compose to current full authoritative state revision; close stale-frame path).
5. P0 next: P9-HF7-T5 (guarantee immediate mutation-to-output visibility for start/stop/board/align/etc.).
6. P0 closure: P9-HF7-T6 (strict control determinism matrix with stream-only `/output/final`).
7. P0 closure: P9-HF7-T7 (HF5/HF6 non-regression matrices: visual purity + transport/apply/ack).
8. P0 closure: P9-HF7-T8 (full artifact sync including global tracking files).

## Priority Execution - Plan 9-2 (after 9-HF7 PASS)
1. P1 first: P9-T13 (remove temporary adapters with proven parity).
2. P1 next: P9-T14 (tighten dependency direction and import graph hygiene).
3. P1 closure: P9-T15 (optional advanced diagnostics behind config gates).

## Priority Execution - Plan 9-3 (after 9-2)
1. P1 first: P9-T16 (multi-client real-setup maintainability regression sweep).
2. P1 closure: P9-T17 (final sign-off and closure checklist).

## Gate Rules
- No progress to P9-HF7-T3+ before P9-HF7-T1..T2 capture deterministic repro and fallback-path removal closure.
- No progress to P9-HF7-T6+ before P9-HF7-T3..T5 producer authority/fresh-state/immediate-visibility fixes are PASS.
- No Plan 9-2 before full PASS of Plan 9-HF7 strict stream-only authority matrix plus HF5/HF6 non-regression checks.
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
- Plan 9-HF4: completed with PASS evidence for repro tracing, command-path decoupling, queue/starvation guards, producer lifecycle hardening, black-stream closure, restart-free recovery, sync/align parity, control matrix, and output parity matrix (`P9-HF4-T1-REPRO-TRACE.md`, `P9-HF4-T3-STARVATION-GUARD.md`, `P9-HF4-T4-PRODUCER-LIFECYCLE.md`, `P9-HF4-T5-BLACK-STREAM-FIX.md`, `P9-HF4-T6-RESTART-FREE-RECOVERY.md`, `P9-HF4-T7-SYNC-ALIGN-PARITY.md`, `P9-HF4-T8-CONTROL-MATRIX.md`, `P9-HF4-T9-OUTPUT-PARITY-MATRIX.md`).
- Plan 9-HF5: completed PASS with overlay-free `/output/final` stream output, visual-only payload contract, HF4 non-regression, and synchronized HF5 evidence artifacts.
- Plan 9-HF6: completed PASS with deterministic pre-fix repro + root-cause isolation, transport/apply/ack fixes, strict stream on/off start-stop parity matrix, and HF5 purity non-regression evidence (`9-HF6-VERIFICATION.md`).
- Plan 9-HF7: completed PASS for strict stream-only `/output/final`, subscriber-independent compose authority, fresh full-state frames, and immediate mutation visibility (`9-HF7-VERIFICATION.md`).
- Plan 9-2: unblocked after HF7 closure PASS.
