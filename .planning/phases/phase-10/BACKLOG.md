# Phase 10 Backlog (Operator Speed + Runtime Reliability/Performance)

## Planning Mode Note
- Plan 10-HF1..10-HF8 remain documented as historical closure baseline.
- New mandatory P0 runtime feedback opens Plan 10-HF9 as blocker wave.
- Plan 10-1 stays queued and blocked behind HF9 PASS.

## Epics
- Command Pipeline Hardening (timeout/resend/ack, fairness, no-drop) [P0]
- Low-Latency Apply Under Load [P0]
- Lockdown Low-End MP4 Smoothness (`sandstorm.mp4`) [P0]
- Board-Switch Latency Reduction [P0]
- Sync Determinism + Render Correctness Non-Regression [P0]
- Operator Speed UX (Settings IA + quick modes) [P1, blocked by HF9]

## Story Mapping
- P10-HF9-S1 Reproduce deterministic command timeout on mobile (`trigger-room` under load).
- P10-HF9-S2 Reproduce deterministic command timeout for `stop` path under load.
- P10-HF9-S3 Reproduce ack-path instability and missing timeout closure transitions.
- P10-HF9-S4 Reproduce resend path gaps (retry timing drift, duplicate/no-apply edge cases).
- P10-HF9-S5 Reproduce queue unfairness/starvation under mixed command bursts.
- P10-HF9-S6 Reproduce no-drop violation scenarios and define no-drop invariants.
- P10-HF9-S7 Add executable command pipeline diagnostics (ingest/queue/dispatch/ack/resend/apply latency tracing).
- P10-HF9-S8 Implement pipeline hardening for deterministic timeout/resend/ack closure.
- P10-HF9-S9 Implement fairness scheduler + no-drop semantics with safety-priority lanes.
- P10-HF9-S10 Implement low-latency apply safeguards under load (bounded slices, fast-lane stop/clear).
- P10-HF9-S11 Implement low-end `mp4` smoothness package (adaptive profile, prewarm/buffering, decode/render strategy).
- P10-HF9-S12 Implement board-switch latency reduction and stale-frame cleanup guards.
- P10-HF9-S13 Execute strict low-end/mobile matrix and capture FAIL->PASS proof.
- P10-HF9-S14 Synchronize all planning trackers at closure.
- P10-S1..P10-S12 Operator speed wave (Settings IA + quick modes + mobile rail) remains queued after HF9.

## Prioritized Execution Wave (P0) - Plan 10-HF9 execute-ready
- Story P10-HF9-S1 + P10-HF9-S2 + P10-HF9-S3 + P10-HF9-S4.
  - Goal: deterministic RED repro for timeout/ack/resend failure modes.
- Story P10-HF9-S5 + P10-HF9-S6 + P10-HF9-S7.
  - Goal: queue fairness/no-drop RED repro plus executable pipeline diagnostics.
- Story P10-HF9-S8 + P10-HF9-S9 + P10-HF9-S10.
  - Goal: deterministic command pipeline hardening + low-latency apply under load.
- Story P10-HF9-S11 + P10-HF9-S12.
  - Goal: low-end mp4 smoothness and board-switch latency recovery.
- Story P10-HF9-S13 + P10-HF9-S14.
  - Goal: FAIL->PASS closure, strict non-regression, full artifact sync.

## Deferred Wave (P1) - Plan 10-1
- Story P10-S1..P10-S12.
  - Goal: operator speed UX package after runtime reliability/performance baseline is restored.

## Follow-up Waves
- Plan 10-1: settings IA + quick action modes + mobile one-hand flow (**unblocked after HF9 PASS closure**).
- Plan 10-2: targeted UX/perf polish after field validation.
- Plan 10-3: optional presets if still needed after live usage.
