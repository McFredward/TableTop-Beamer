# Phase 10 Acceptance

## Planning Mode Note
- HF1..HF8 are closed and remain baseline evidence.
- New mandatory P0 runtime feedback activates HF9 as blocker wave.
- Plan 10-1 is blocked until HF9 FAIL->PASS closure.

## Historical Gate Baseline
- H1..H8 historical wave gates: PASS (see existing HF1..HF8 verification artifacts in `phase-10`).

## Verification Strategy (HF9)
- Command determinism first: no silent timeout/no-drop behavior under load.
- Ack/resend correctness first: deterministic closure with observable lifecycle.
- Fairness first: mixed command bursts must not starve stop/clear paths.
- Low-latency first: apply loop remains responsive on mobile/low-end hardware.
- Media smoothness first: `sandstorm.mp4` remains fluid on weak devices.
- Board-switch speed first: faster switch, no stale frame/context residue.
- Non-regression first: sync determinism + render correctness stay unchanged.

## Hard Gates (Plan 10-HF9, mandatory before 10-1)
- H9-1 Command-Timeout-Repro-Gate: deterministic pre-fix RED reproduces mobile timeout for `trigger-room` under load.
- H9-2 Stop-Timeout-Repro-Gate: deterministic pre-fix RED reproduces timeout/late-apply for `stop` under load.
- H9-3 Ack-Path-Repro-Gate: deterministic pre-fix RED reproduces ack instability (missing/late ack drift).
- H9-4 Resend-Path-Repro-Gate: deterministic pre-fix RED reproduces non-deterministic resend behavior.
- H9-5 Queue-Fairness-Repro-Gate: deterministic pre-fix RED reproduces starvation/unfair scheduling under mixed bursts.
- H9-6 NoDrop-Repro-Gate: deterministic pre-fix RED reproduces accepted-command no-apply/no-ack outcomes.
- H9-7 Pipeline-Diagnostics-Gate: executable tracing covers ingest/queue/dispatch/ack/resend/apply with timing assertions.
- H9-8 Command-Hardening-Gate: timeout/resend/ack contract is deterministic and idempotent-safe.
- H9-9 Fairness-NoDrop-Gate: queue fairness + no-drop semantics pass under burst load.
- H9-10 LowLatency-Apply-Gate: low-latency apply remains PASS under sustained mixed load.
- H9-11 MP4-LowEnd-Smoothness-Gate: `sandstorm.mp4` playback is smooth on phone/Raspberry-Pi-class profile.
- H9-12 BoardSwitch-Latency-Gate: board-switch latency is reduced with no stale frame/context residue.
- H9-13 Sync-Determinism-NonRegression-Gate: ordering/version/idempotent apply remains PASS.
- H9-14 Render-Correctness-NonRegression-Gate: control/final canonical parity and render correctness remain PASS.
- H9-15 Fail-To-Pass-Proof-Gate: same HF9 gate set captured as pre-fix FAIL and post-fix PASS.

## Hard Gates (Plan 10-1, queued)
- G1 Settings-SubTab-IA-Gate
- G2 Quick-Activation-Gate
- G3 Quick-Deactivation-Gate
- G4 Quick-Clear-Gate
- G5 Mobile-One-Hand-Gate
- G6 Sync-Integrity-Gate
- G7 Non-Regression-Gate

## Strict Regression Matrix
- HF9-Command-Timeout-Repro-Test
- HF9-Stop-Timeout-Repro-Test
- HF9-Ack-Path-Determinism-Test
- HF9-Timeout-Resend-Closure-Test
- HF9-Queue-Fairness-NoStarvation-Test
- HF9-NoDrop-Semantics-Test
- HF9-LowLatency-Apply-Under-Load-Test
- HF9-MP4-LowEnd-Smoothness-Test
- HF9-Adaptive-Perf-Profile-Degrade-Recover-Test
- HF9-BoardSwitch-Latency-Reduction-Test
- HF9-Control-Final-Render-Correctness-NonRegression-Test
- HF9-Sync-Determinism-NonRegression-Test
- HF9-Fail-To-Pass-Proof-Test

## Incremental Mandatory Gates
- After P10-HF9-T1..T6: timeout/ack/resend/fairness/no-drop failures are reproducible as deterministic RED.
- After P10-HF9-T7..T10: pipeline tracing and core command/apply hardening are merged and deterministic.
- After P10-HF9-T11..T12: low-end mp4 smoothness and board-switch latency improvements are merged.
- After P10-HF9-T13..T15: full matrix PASS + explicit FAIL->PASS proof + full artifact sync are complete.

## Definition of Done
- All HF9 hard gates H9-1..H9-15 are PASS.
- Command pipeline is deterministic under load with explicit timeout/resend/ack closure, fairness, and no-drop guarantees.
- Mobile/low-end command operations (`trigger-room`, `stop`) are immediate and reliable.
- `sandstorm.mp4` playback on weak hardware profile is fluid and regression-safe.
- Board-switch latency is reduced and free from stale render/context residue.
- Sync determinism and render correctness remain strictly non-regressed.
- Phase and global planning artifacts are synchronized.

## Execution Status Update (HF9)
- HF9 gate-set is closed PASS with executable artifacts `P10-HF9-T1..T14` and consolidated FAIL->PASS matrix (`P10-HF9-T13-FAIL-PASS-MATRIX.md`).
