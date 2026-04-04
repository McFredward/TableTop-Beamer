# Phase 10 Plan (Operator Speed + Runtime Reliability/Performance Hardening)

## Planning Mode Note
- Plan 10-HF1..10-HF8 remain documented with PASS baseline evidence.
- New mandatory P0 field feedback reopens Phase 10 before 10-1.
- Plan 10-HF9 closure is PASS (`T1..T15` complete with FAIL->PASS proof); Plan 10-1 is unblocked.

## Critical Runtime Feedback (binding, P0)
1. Mobile/low-end controllers report command timeouts (`trigger-room` and `stop`), including under normal stop flows.
2. Command handling must be deterministic and immediate under load; no dropped commands are acceptable.
3. `Nemesis Lockdown Board A` is too slow on phone/Raspberry Pi (slow board load/switch, stutter in `sandstorm.mp4`).
4. Final target is fluid playback on weak hardware without sync determinism regression.
5. Closure requires explicit FAIL->PASS evidence for command reliability, low-latency apply, low-end mp4 smoothness, and board-switch latency.

## Mandatory Goals (binding)
1. Harden command pipeline end-to-end (timeout/resend/ack path, queue fairness, no-drop semantics).
2. Guarantee low-latency command apply under burst load, including deterministic `stop`/`clear` priority behavior.
3. Restore smooth `mp4` playback on low-end devices via adaptive decode/render strategy and prewarm/buffering safeguards.
4. Reduce board-switch latency and stale-frame residue on control and `/output/final`.
5. Preserve strict sync determinism and render correctness (ordering/version/idempotent apply, canonical source parity).

## Target State
Phase 10 proceeds with HF9 first: command and render runtime become deterministic and low-latency on mobile/Raspberry Pi, `sandstorm.mp4` playback is fluid on low-end profiles, board-switch cost is reduced, and all changes are closed with strict sync/render non-regression evidence. Only then Plan 10-1 speed UX wave executes.

## Binding Product Decisions
- Command delivery contract is at-least-once with deterministic dedup/idempotent apply; dropped command outcomes are forbidden.
- Timeouts are explicit state transitions, not silent failures; resend/backoff rules are deterministic and observable.
- Queue arbitration is fairness-first with explicit priority lanes for safety-critical actions (`stop`, `clear-all`, `stop outside`).
- Runtime apply loop uses bounded work slices to prevent starvation and long main-thread monopolization.
- Weak hardware receives adaptive runtime profile controls (decode/render caps, quality floor, degrade/recover thresholds).
- `mp4` lifecycle for outside playback uses prewarm + readiness guards; no aggressive restart/seek thrash under load.
- Board-switch is treated as performance-critical lifecycle path with prefetch/prepare + stale-residue cleanup invariants.
- Control-view and `/output/final` stay on identical canonical source and render-contract semantics.

## Scope (Plan 10-HF9)
- Reproduce deterministic RED cases for command timeouts, missing ack/resend closure, queue unfairness, and no-drop violations.
- Add executable command-pipeline diagnostics (ingest/queue/dispatch/ack/timeout/resend/apply timing).
- Implement command pipeline hardening (ack tracking, resend policy, fairness scheduling, no-drop guarantees).
- Implement low-latency apply hardening under load (bounded apply slices, critical-path prioritization, backpressure guards).
- Implement low-end `mp4` smoothness package (`sandstorm.mp4` decode/render strategy, adaptive profile, prewarm/buffering safeguards).
- Implement board-switch latency reduction and verify no stale frame/context residue.
- Run desktop/mobile/low-end matrix and capture FAIL->PASS proof.

## Out of Scope
- Net-new visual feature design unrelated to runtime reliability/performance.
- Protocol-family rewrite or architecture replacement beyond targeted hardening.
- Plan 10-1 IA/quick-mode UX implementation before HF9 closure.

## Prioritized Next Execution Wave (Plan 10-HF9, execute-ready, hard-gated)
1. Build deterministic RED repro for mobile command timeout (`trigger-room`, `stop`) under burst and moderate load.
2. Build deterministic RED repro for missing/noisy ack path and resend gaps.
3. Build deterministic RED repro for queue unfairness/starvation and no-drop contract violations.
4. Add executable command-pipeline tracing gates (ingest->queue->dispatch->ack->apply latency + retries).
5. Implement command hardening: timeout policy + deterministic resend + ack closure + dedup-safe idempotent apply.
6. Implement queue fairness and no-drop semantics with safety-priority lanes for stop/clear actions.
7. Implement low-latency apply under load (bounded apply budget, critical command fast-lane, backpressure safeguards).
8. Implement low-end `mp4` package for `sandstorm.mp4` (adaptive perf profile, prewarm/buffering, decode/render strategy).
9. Implement board-switch latency optimizations and stale-frame cleanup guards.
10. Run strict non-regression + low-end matrix and capture explicit FAIL->PASS proof with synchronized artifacts.

## Deferred Wave (Plan 10-1)
- Settings IA sub-tabs, quick activation/deactivation/clear flows, mobile one-hand action rail.
- Starts only after HF9 PASS.

## Milestones
1. M0 HF9 Timeout Repro Closure: deterministic command-timeout RED cases exist.
2. M0 HF9 Ack/Resend Closure: ack gap and resend-policy failures are reproduced and traced.
3. M0 HF9 Queue Fairness Closure: starvation/no-drop REDs are reproduced and diagnosed.
4. M0 HF9 Command Hardening Closure: ack/resend/timeout/fairness/no-drop pipeline is fixed generically.
5. M0 HF9 Low-Latency Apply Closure: apply loop remains responsive under burst load.
6. M0 HF9 Low-End MP4 Closure: `sandstorm.mp4` is smooth on weak hardware profile.
7. M0 HF9 Board-Switch Closure: board-switch latency is reduced with clean context transitions.
8. M0 HF9 Non-Regression Closure: sync determinism + render correctness stay PASS.
9. M0 HF9 FAIL->PASS Closure: identical gate set is captured pre-fix FAIL and post-fix PASS.
10. M1 Plan 10-1 Start Gate: operator speed UX wave unblocked only after HF9 PASS.

## Regression/Evidence Matrix Policy
- HF9-Command-Timeout-Repro-Test
- HF9-Ack-Path-Determinism-Test
- HF9-Timeout-Resend-Closure-Test
- HF9-Queue-Fairness-No-Starvation-Test
- HF9-NoDrop-Semantics-Test
- HF9-LowLatency-Apply-Under-Load-Test
- HF9-MP4-LowEnd-Smoothness-Test
- HF9-Adaptive-Perf-Profile-Degrade-Recover-Test
- HF9-BoardSwitch-Latency-Reduction-Test
- HF9-Control-Final-Render-Correctness-NonRegression-Test
- HF9-Sync-Determinism-NonRegression-Test
- HF9-FAIL-TO-PASS-Proof-Test

## Definition of Done
- HF9 hard gates pass for command pipeline reliability, low-latency apply, low-end mp4 smoothness, and board-switch latency.
- Command pipeline guarantees deterministic ack/timeout/resend behavior with fairness and no-drop semantics.
- Safety commands remain first-click deterministic under load; no starvation side effects.
- `sandstorm.mp4` playback on low-end profile is fluid and free from decode/restart thrash regressions.
- Board-switch latency improvement is measured and verified on mobile/low-end profile.
- Sync determinism (ordering/version/idempotent apply) remains PASS.
- Render correctness (control/final parity + canonical clip correctness) remains PASS.
- Phase/local/global planning artifacts are synchronized (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).
