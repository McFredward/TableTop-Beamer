# Execute Phase 9

## Acceptance Correction
- Plan 9-1 execution is documented but not accepted.
- Plan 9-HF1, Plan 9-HF2, Plan 9-HF3, Plan 9-HF4, Plan 9-HF5, and Plan 9-HF6 are completed baselines.
- Plan 9-HF7 and 9-HF8 are completed baselines, but HF8 follow-up verification failed one blocking gate (`compositorAlwaysOn=false`).
- Plan 9-HF9 is now the binding next wave.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 9-HF9 (binding, hard-gated wave)
1. P0 first: P9-HF9-T1 (deterministic repro of follow-up mismatch: stream path works while `compositorAlwaysOn=false`).
2. P0 next: P9-HF9-T2 (root-cause isolate lifecycle/reporting divergence in normal startup/runtime paths).
3. P0 next: P9-HF9-T3 (fix always-on lifecycle so gate is true across boot/idle/attach/churn/reconnect).
4. P0 next: P9-HF9-T4 (verify `/output/final` contract remains stream-only fullscreen receiver with no polling/orchestration).
5. P0 closure: P9-HF9-T5 (full parity/acceptance matrix PASS, no partial pass state).
6. P0 closure: P9-HF9-T6 (HF5/HF6 non-regression PASS under HF9 changes).
7. P0 closure: P9-HF9-T7 (refresh PASS evidence artifacts and synchronize all phase/global tracking files).

## Priority Execution - Plan 9-2 (after 9-HF9 PASS)
1. P1 first: P9-T13 (remove temporary adapters with proven parity).
2. P1 next: P9-T14 (tighten dependency direction and import graph hygiene).
3. P1 closure: P9-T15 (optional advanced diagnostics behind config gates).

## Priority Execution - Plan 9-3 (after 9-2)
1. P1 first: P9-T16 (multi-client real-setup maintainability regression sweep).
2. P1 closure: P9-T17 (final sign-off and closure checklist).

## Gate Rules
- No progress to P9-HF9-T4+ before P9-HF9-T1..T3 close deterministic repro + root cause + always-on lifecycle fix.
- No progress to P9-HF9-T6+ before P9-HF9-T4..T5 receiver-only contract and full parity gates are PASS.
- No Plan 9-2 before full PASS of Plan 9-HF9 matrix plus HF5/HF6 non-regression checks.
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
- Plan 9-HF8: completed PASS with canonical `/api/final-stream/video`, strict receiver-only `output-final.html`, always-on compositor independence, mutation-latency gate telemetry, and parity matrix evidence (`P9-HF8-T7-PARITY-ACCEPTANCE-MATRIX.md`, `9-HF8-VERIFICATION.md`).
- HF8 follow-up verification mismatch is reproduced and closed in HF9 (`P9-HF9-T1-REPRO-TRACE.md`, `P9-HF9-T2-ROOT-CAUSE.md`).
- Plan 9-HF9: completed PASS with lifecycle-aware always-on gate hardening (`compositorAlwaysOn=true`), strict receiver-only contract revalidation, full parity matrix PASS, and HF5/HF6 non-regression PASS (`9-HF9-VERIFICATION.md`).
- Plan 9-2: unblocked after HF9 full PASS closure.
