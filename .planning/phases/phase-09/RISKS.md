# Phase 9 Risks

## Acceptance Correction Context
- 9-1 is not accepted; 9-HF1 and 9-HF2 are completed baselines.
- 9-HF3, 9-HF4, and 9-HF5 are completed baselines.
- 9-HF6 is the binding P0 blocker wave for control-command transport/apply/ack recovery under stream mode.

## R1 Hidden coupling still exists between stream lifecycle and command path
- Risk: a residual shared lock/state path still allows stream subscriber events to freeze command ingest/apply.
- Impact: Critical.
- Mitigation: explicit ownership boundaries, lock-domain split, and regression tests with churn/fault injection.

## R2 Queue starvation under burst subscribers or stream pressure
- Risk: stream workload monopolizes scheduler/queue and starves control commands.
- Impact: Critical.
- Mitigation: bounded queue budgets, priority class separation, and latency SLO checks for command path.

## R3 Transport gating regression from stream-purity changes
- Risk: stream-mode conditionals introduced for purity accidentally short-circuit control command transport.
- Impact: Critical.
- Mitigation: command transport path audit from client dispatch to server ingress with explicit no-stream-gate invariant.

## R4 Server apply is deferred behind stream producer timing
- Risk: accepted control commands are not applied immediately because apply is indirectly tied to stream producer cadence.
- Impact: Critical.
- Mitigation: decouple command apply from producer tick; enforce immediate authoritative apply path and ack timing assertions.

## R5 Ack appears successful while apply/snapshot propagation is stale
- Risk: client sees ack but command effect is delayed or absent in snapshot and `/output/final`.
- Impact: Critical.
- Mitigation: verify ack/apply/snapshot linkage and require immediate revision/projection propagation checks in matrix.

## R6 Multi-client race reintroduces start/stop no-op behavior
- Risk: fixes pass single-client but regress under concurrent controllers or reconnect churn.
- Impact: Critical.
- Mitigation: mandatory multi-client start/stop matrix including churn and `/output/final` observer parity.

## R7 Purity regression while restoring command reliability
- Risk: command-path fixes accidentally re-enable stream overlays/diagnostics text in `/output/final`.
- Impact: Critical.
- Mitigation: keep HF5 visual-only assertions as mandatory non-regression gates in HF6.

## R8 Isolation fix regresses deterministic sync/align contracts
- Risk: implementation accidentally changes ordering/version/idempotent apply behavior.
- Impact: Critical.
- Mitigation: enforce presentation-only boundary and run deterministic sync regression with stream enabled.

## R9 Observability gap slows root-cause closure
- Risk: missing lifecycle/queue/ack/apply timing metrics obscures post-fix regressions.
- Impact: High.
- Mitigation: structured traces for command dispatch, ingress, apply, ack, snapshot revision, and fanout latency.

## R10 Artifact drift across phase/global trackers
- Risk: phase files and global tracking files become inconsistent.
- Impact: High.
- Mitigation: mandatory full artifact sync in P9-HF6-T8.

## Execution Notes

- 9-HF1 and 9-HF2 baselines remain valid and are treated as non-regression gates.
- 9-HF3 closure remains valid for stream viability/fallback/parity baseline.
- 9-HF4 closure remains valid for stream/control decoupling baseline.
- 9-HF5 closure remains valid for stream visual-only purity baseline.
- HF6 closure reduces primary transport/apply/ack blocker risk with strict parity evidence and stream-purity non-regression PASS.
- Residual Phase 9 risk focus moves to post-HF6 hardening scope in Plan 9-2.
