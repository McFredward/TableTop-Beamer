# Phase 10 Risks

## R0a Command timeout recurrence on mobile/low-end
- Risk: `trigger-room`/`stop` time out under normal burst load.
- Impact: Critical.
- Mitigation: deterministic timeout budget + ack tracking + resend closure with explicit status/toast diagnostics.

## R0b Ack/resend drift creates duplicate or lost outcomes
- Risk: retries are non-deterministic (double apply or accepted-but-never-applied).
- Impact: Critical.
- Mitigation: idempotent command keys, deterministic resend policy, explicit terminal states.

## R0c Queue starvation under mixed command bursts
- Risk: long trigger bursts starve stop/clear commands.
- Impact: Critical.
- Mitigation: fairness scheduler with safety-priority lanes and starvation guard assertions.

## R0d No-drop semantics violated under load
- Risk: accepted commands disappear before apply/ack.
- Impact: Critical.
- Mitigation: no-drop invariants, queue durability checks, end-to-end pipeline tracing.

## R0e Apply-loop latency spikes on weak hardware
- Risk: apply path monopolizes main thread and delays command visibility.
- Impact: Critical.
- Mitigation: bounded apply slices, backpressure control, critical fast-lane processing.

## R0f Lockdown `sandstorm.mp4` decode/render stutter
- Risk: low-end devices drop frames heavily or restart-seek thrash occurs.
- Impact: Critical.
- Mitigation: adaptive perf profile, decode/render caps, prewarm and buffering safeguards.

## R0g Board-switch latency and stale residue
- Risk: board-switch remains slow and leaves stale frame/context artifacts.
- Impact: Critical.
- Mitigation: board-switch prewarm/prefetch path + deterministic cleanup and latency gate.

## R0h Fixes regress sync determinism
- Risk: reliability/perf fixes alter ordering/version/idempotent behavior.
- Impact: Critical.
- Mitigation: strict sync non-regression matrix as mandatory closure gate.

## R0i Fixes regress render correctness
- Risk: low-end optimizations break control/final parity or canonical clip correctness.
- Impact: Critical.
- Mitigation: strict control-vs-final parity + render correctness matrix across browser/device classes.

## R1 Artifact drift across planning files
- Risk: PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE and global trackers diverge.
- Impact: High.
- Mitigation: explicit closure task for full artifact sync.

## Mitigation Status Update
- HF1..HF8 historical mitigation baseline remains valid and documented.
- R0a..R0i are mitigated for HF9 scope with PASS diagnostics; continue monitoring in Plan 10-1 runtime regression matrix.
