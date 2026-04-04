# Phase 10 Tasks

Status legend: TODO | IN-PROGRESS | DONE | REJECTED
Priority labels: [P0] critical | [P1] high | [P2] medium

## Historical Closure Baseline
- [x] DONE P10-HF1-T1..T6 [P0] Final-output blackout blocker wave closed.
- [x] DONE P10-HF2-T1..T8 [P0] Generic polygon hydration hardening wave (historical, field-invalidated context).
- [x] DONE P10-HF3-T1..T10 [P0] Mandatory recovery wave closed.
- [x] DONE P10-HF4-T1..T10 [P0] Runtime diagnostics follow-up wave closed.
- [x] DONE P10-HF5-T1..T10 [P0] Historical closure baseline (field-invalidated context).
- [x] DONE P10-HF6-T1..T10 [P0] Historical closure baseline (clean-start field-invalidated context).
- [x] DONE P10-HF7-T1..T8 [P0] Historical closure baseline (all-board fallback field-invalidated context).
- [x] DONE P10-HF8-T1..T10 [P0] All-board canonical recovery wave closed.

## Plan 10-HF9 - Command reliability + low-end performance blocker wave (execute-ready, hard-gated)
- [x] DONE P10-HF9-T1 [P0] Create deterministic RED repro for mobile `trigger-room` command timeout under burst and sustained mixed load.
- [x] DONE P10-HF9-T2 [P0] Create deterministic RED repro for `stop` timeout under load and verify immediate-apply expectation fails pre-fix.
- [x] DONE P10-HF9-T3 [P0] Create deterministic RED repro for ack-path instability (missing/late ack causing false timeout or duplicate resend side effects).
- [ ] TODO P10-HF9-T4 [P0] Create deterministic RED repro for resend-path drift (retry cadence/jitter causing non-deterministic command completion).
- [ ] TODO P10-HF9-T5 [P0] Create deterministic RED repro for queue unfairness/starvation under mixed `trigger` + `stop` + `clear` command bursts.
- [ ] TODO P10-HF9-T6 [P0] Create deterministic RED repro for no-drop contract violations (accepted command never applied/acknowledged).
- [ ] TODO P10-HF9-T7 [P0] Add executable command-pipeline diagnostics (`ingest -> queue -> dispatch -> ack -> resend -> apply`) with per-command latency and retry telemetry.
- [ ] TODO P10-HF9-T8 [P0] Implement command timeout/ack/resend hardening with deterministic closure semantics and idempotent dedup-safe apply.
- [ ] TODO P10-HF9-T9 [P0] Implement queue fairness scheduler with explicit safety fast-lane (`stop`, `clear-all`, `stop outside`) and no-drop guarantees.
- [ ] TODO P10-HF9-T10 [P0] Implement low-latency apply hardening under load (bounded apply budget, backpressure guard, non-blocking command progression).
- [ ] TODO P10-HF9-T11 [P0] Implement low-end `sandstorm.mp4` smoothness package (adaptive profile, decode/render strategy, prewarm/buffering safeguards).
- [ ] TODO P10-HF9-T12 [P0] Implement board-switch latency reduction and stale-frame/context cleanup for control + `/output/final`.
- [ ] TODO P10-HF9-T13 [P0] Execute strict matrix on desktop/mobile/low-end (phone + Raspberry-Pi-class profile) for FAIL->PASS closure.
- [ ] TODO P10-HF9-T14 [P0] Execute strict non-regression gates for sync determinism and render correctness.
- [ ] TODO P10-HF9-T15 [P0] Synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` after HF9 PASS.

## Plan 10-1 - Operator Speed Core Wave (queued, blocked by HF9)
- [ ] TODO P10-T1 [P1] Define Settings IA and sub-tab grouping map.
- [ ] TODO P10-T2 [P1] Implement Settings sub-tab UI shell with preserved draft state.
- [ ] TODO P10-T3 [P1] Introduce shared quick-mode state machine (`off`/`activate`/`deactivate`/`clear`).
- [ ] TODO P10-T4 [P1] Add quick activation sequential room flow.
- [ ] TODO P10-T5 [P1] Add quick deactivation sequential room flow.
- [ ] TODO P10-T6 [P1] Add quick clear sequential room flow.
- [ ] TODO P10-T7 [P1] Add conflict guards for rapid mode switching/inflight overlaps.
- [ ] TODO P10-T8 [P1] Implement mobile one-handed action rail.
- [ ] TODO P10-T9 [P1] Improve mobile board overview during speed actions.
- [ ] TODO P10-T10 [P1] Add explicit operator feedback for quick-mode action success/failure/timeout.
- [ ] TODO P10-T11 [P1] Execute rapid-operation regression matrix for desktop + mobile.
- [ ] TODO P10-T12 [P1] Synchronize all planning trackers after PASS evidence.
