# Phase 9 Risks

## Acceptance Correction Context
- 9-1 is not accepted; 9-HF1 and 9-HF2 are completed baselines.
- 9-HF3, 9-HF4, and 9-HF5 are completed baselines.
- 9-HF6 is completed baseline for control-command transport/apply/ack recovery under stream mode.
- 9-HF7 is completed baseline for strict `/output/final` stream authority and stale-frame closure.

## R1 Residual fallback branch still active for `/output/final`
- Risk: auto/manual client fallback code path still exists and can activate under transient stream conditions.
- Impact: Critical.
- Mitigation: remove fallback branches from active runtime path and add explicit no-fallback gate tests.

## R2 Producer lifecycle still coupled to subscriber count
- Risk: compose loop pauses/degrades when subscriber count drops to zero or churns rapidly.
- Impact: Critical.
- Mitigation: enforce always-on producer lifecycle independent of subscriber presence and churn matrix checks.

## R3 Stale frame/cache reuse in stream compose path
- Risk: producer emits previously composed frames or partial state views instead of current full state revision.
- Impact: Critical.
- Mitigation: revision-bound compose assertions and explicit stale-frame regression tests.

## R4 Mutation visibility lag despite accepted command
- Risk: mutation is accepted/applied but `/output/final` composition does not update immediately.
- Impact: Critical.
- Mitigation: enforce apply-to-compose immediacy checks for start/stop/board/align across churn scenarios.

## R5 Strict stream-only enforcement regresses control determinism
- Risk: removal of fallback paths accidentally introduces nondeterministic control behavior.
- Impact: Critical.
- Mitigation: preserve HF6 contracts and run mandatory multi-client control determinism matrix.

## R6 Legacy mode toggles leak through config/UI paths
- Risk: hidden mode switches (`auto`/`client`) remain reachable and silently reactivate non-authoritative behavior.
- Impact: Critical.
- Mitigation: sanitize mode config surface and enforce single authoritative stream mode for `/output/final`.

## R7 Purity regression while tightening producer authority
- Risk: authority-path fixes accidentally re-enable stream overlays/diagnostics text in `/output/final`.
- Impact: Critical.
- Mitigation: keep HF5 visual-only assertions as mandatory non-regression gates in HF7.

## R8 Authority/staleness fix regresses deterministic sync/align contracts
- Risk: implementation accidentally changes ordering/version/idempotent apply behavior.
- Impact: Critical.
- Mitigation: enforce presentation-only boundary and run deterministic sync regression with stream enabled.

## R9 Observability gap slows root-cause closure
- Risk: missing lifecycle/queue/ack/apply timing metrics obscures post-fix regressions.
- Impact: High.
- Mitigation: structured traces for mutation revision, compose revision, fanout timestamp, and output visibility latency.

## R10 Artifact drift across phase/global trackers
- Risk: phase files and global tracking files become inconsistent.
- Impact: High.
- Mitigation: mandatory full artifact sync in P9-HF7-T8.

## Execution Notes

- 9-HF1 and 9-HF2 baselines remain valid and are treated as non-regression gates.
- 9-HF3 closure remains valid for stream viability/fallback/parity baseline.
- 9-HF4 closure remains valid for stream/control decoupling baseline.
- 9-HF5 closure remains valid for stream visual-only purity baseline.
- HF6 closure remains mandatory non-regression baseline for transport/apply/ack correctness.
- HF7 authority/staleness closure is complete; current risk focus moves to Plan 9-2 hardening follow-ups.
