# Phase 11 Tasks

Status legend: TODO | IN-PROGRESS | DONE | REJECTED
Priority labels: [P0] critical | [P1] high | [P2] medium

## Plan 11-1 - Operator UX acceleration core wave (execute-ready)
- [x] DONE P11-T1 - P11-T12

## Plan 11-HF1 - Mandatory bugfix/feature package (execute-ready, hard-gated)
- [x] DONE P11-HF1-T1 - P11-HF1-T12

## Plan 11-HF2 - Critical global runtime recovery + dashboard loop UX correction
- [x] DONE P11-HF2-T1 - P11-HF2-T8

## Plan 11-HF3 - Global 1s-cancellation regression fix + Dashboard Audio Toggle (execute-ready, hard-gated)
- [x] DONE P11-HF3-T1 [P0] Create deterministic RED repro showing global animations canceling after 1s on `/output/final`.
- [x] DONE P11-HF3-T2 [P0] Root-cause and fix the 1s-cancellation bug to restore full ~4s playback duration.
- [x] DONE P11-HF3-T3 [P0] Add `Play sound` quick checkbox directly in Dashboard global controls (below Loop toggle).
- [x] DONE P11-HF3-T4 [P0] Wire per-trigger audio semantics synchronously with loop choice in the global trigger payload.
- [x] DONE P11-HF3-T5 [P0] Execute strict regression matrix proving full ~4s playback parity across control + peers + `/output/final`.
- [x] DONE P11-HF3-T6 [P0] Capture FAIL->PASS evidence proving global animations play fully and audio toggle works correctly.
- [x] DONE P11-HF3-T7 [P0] Synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 11-HF4 - Critical non-loop global suppression on `/output/final` (execute-ready, hard-gated)
- [x] DONE P11-HF4-T1 [P0] Build deterministic RED repro: non-loop global triggers are suppressed on `/output/final` while loop globals remain visible.
- [x] DONE P11-HF4-T2 [P0] Isolate root-cause lifecycle/trigger path divergence causing one-shot final-output suppression.
- [x] DONE P11-HF4-T3 [P0] Implement fix so one-shot globals render on `/output/final` and run full intended duration exactly once.
- [x] DONE P11-HF4-T4 [P0] Execute loop-mode non-regression matrix (start, sustain, stop) to confirm no regression.
- [x] DONE P11-HF4-T5 [P0] Execute explicit stop/clear non-regression matrix under mixed one-shot + loop sequences.
- [x] DONE P11-HF4-T6 [P0] Capture FAIL->PASS evidence for `/output/final` one-shot duration parity versus control.
- [x] DONE P11-HF4-T7 [P0] Synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 11-HF5 - Critical non-loop initiator-only sync regression (execute-ready, hard-gated)
- [x] DONE P11-HF5-T1 [P0] Build deterministic RED repro: non-loop global triggers run only on initiator while peers + `/output/final` miss the event; loop mode remains synchronized.
- [x] DONE P11-HF5-T2 [P0] Isolate root-cause branch for one-shot desync (command emission vs server apply vs snapshot/event fanout).
- [x] DONE P11-HF5-T3 [P0] Implement server-authoritative non-loop trigger replication so initiator + peers + `/output/final` receive exactly one run each.
- [x] DONE P11-HF5-T4 [P0] Remove/guard local optimistic one-shot render path so local success cannot mask missing distributed sync.
- [x] DONE P11-HF5-T5 [P0] Execute loop-mode non-regression matrix (start, sustain, stop) to confirm behavior remains unchanged.
- [x] DONE P11-HF5-T6 [P0] Execute explicit stop/clear non-regression matrix under mixed one-shot + loop sequences.
- [x] DONE P11-HF5-T7 [P0] Capture strict FAIL->PASS evidence proving non-loop full-duration parity across initiator + peers + `/output/final`.
- [x] DONE P11-HF5-T8 [P0] Synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 11-HF6 - Critical non-loop polling/hydration premature-cancel regression (execute-ready, hard-gated)
- [x] DONE P11-HF6-T1 [P0] Build deterministic RED repro: clients see non-loop trigger revision but polling/hydration cancels local playback before full visible duration.
- [ ] TODO P11-HF6-T2 [P0] Isolate root-cause ordering between trigger-revision observation and polling snapshot reconciliation/cancellation.
- [ ] TODO P11-HF6-T3 [P0] Implement seen-revision local playback contract: once started, non-loop one-shot plays exactly once for full configured duration.
- [ ] TODO P11-HF6-T4 [P0] Guard snapshot cancellation path so active one-shot is not canceled unless explicit stop/clear revision is observed.
- [ ] TODO P11-HF6-T5 [P0] Execute loop-mode non-regression matrix (start, sustain, stop) to confirm unchanged behavior.
- [ ] TODO P11-HF6-T6 [P0] Execute explicit stop/clear immediate-authority non-regression matrix under mixed one-shot + loop sequences.
- [ ] TODO P11-HF6-T7 [P0] Add and run deterministic multi-client polling tests for seen-once -> full local playback parity across initiator + peers + `/output/final`.
- [ ] TODO P11-HF6-T8 [P0] Capture FAIL->PASS evidence and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Next wave placeholder
- [ ] TODO P11-T13 [P1] Collect field telemetry/feedback from HF6 live sessions and prepare 11-2 refinement shortlist.
