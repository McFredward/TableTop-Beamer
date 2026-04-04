# Execute Phase 10

## Planning Mode Note
- HF1..HF8 are complete and remain recorded baseline.
- New mandatory P0 feedback activates HF9 as blocker wave.
- Plan 10-1 is blocked until HF9 PASS.

## Critical Priority Override
- Execute Plan 10-HF9 first.
- Do not execute Plan 10-1 before HF9 FAIL->PASS closure.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 10-HF9 (binding, hard-gated)
1. P0 first: P10-HF9-T1 + P10-HF9-T2 (deterministic RED for mobile timeout on `trigger-room` and `stop`).
2. P0 next: P10-HF9-T3 + P10-HF9-T4 (ack/resend instability repro).
3. P0 next: P10-HF9-T5 + P10-HF9-T6 (queue fairness/no-drop RED repro).
4. P0 next: P10-HF9-T7 (executable command pipeline diagnostics with timing/retry assertions).
5. P0 next: P10-HF9-T8 (timeout/resend/ack hardening with deterministic closure and idempotent apply).
6. P0 next: P10-HF9-T9 (fairness scheduler + safety fast-lane + no-drop invariants).
7. P0 next: P10-HF9-T10 (low-latency apply hardening under load).
8. P0 next: P10-HF9-T11 (low-end `sandstorm.mp4` smoothness package via adaptive profile + buffering/prewarm safeguards).
9. P0 next: P10-HF9-T12 (board-switch latency reduction + stale residue cleanup).
10. P0 closure: P10-HF9-T13 + P10-HF9-T14 + P10-HF9-T15 (strict matrix PASS, FAIL->PASS proof, full artifact sync).

## Deferred Execution - Plan 10-1 (blocked)
1. P10-T1..P10-T12 execute only after HF9 PASS.

## Gate Rules
- Do not start HF9 fixes (T8+) before RED repro gates (T1..T6) and diagnostics gate (T7) are in place.
- Do not close HF9 without explicit FAIL->PASS evidence for the same gate set.
- Do not start Plan 10-1 before full HF9 PASS.
- No wave closure without full artifact sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Update task status in `TASKS.md` after each completed item.
- Capture decisions and binding runtime rules in `.planning/STATE.md`.
- Keep `PLAN.md`, `BACKLOG.md`, `ACCEPTANCE.md`, and `RISKS.md` synchronized when scope changes.

## Execution Record
- HF1..HF8: completed PASS (historical baseline retained).
- HF9 kickoff: mandatory blocker set from field runtime.
  - Problem A: mobile command timeouts (`trigger-room`, `stop`) under load.
  - Problem B: poor Lockdown board performance on phone/Raspberry Pi (load/switch latency and `sandstorm.mp4` stutter).
  - Binding closure target: deterministic command pipeline + low-latency apply + low-end smooth mp4 + board-switch latency reduction + strict non-regression.
- HF9 closure: PASS (`P10-HF9-T1..T14` artifacts + FAIL->PASS matrix) and full artifact synchronization complete.
