# Phase 9 Risks

## Acceptance Correction Context
- 9-1 is not accepted; 9-HF1 and 9-HF2 are completed baselines.
- 9-HF3, 9-HF4, and 9-HF5 are completed baselines.
- 9-HF6 is completed baseline for control-command transport/apply/ack recovery under stream mode.
- 9-HF7 is completed baseline for strict `/output/final` stream authority and stale-frame closure.
- New binding clarification introduces 9-HF8 architecture pivot (true server video endpoint + receiver-only `/output/final`).

## R1 `/output/final` still contains runtime orchestration or polling logic
- Risk: receiver page keeps client-side polling/animation/state branches and violates pure receiver contract.
- Impact: Critical.
- Mitigation: hard-remove/dead-path runtime orchestration and add explicit receiver-only contract tests.

## R2 Canonical final-output stream endpoint not strictly server-authoritative
- Risk: multiple paths or compatibility branches allow non-canonical rendering behavior.
- Impact: Critical.
- Mitigation: enforce single canonical server-composed video stream endpoint for `/output/final`.

## R3 Compositor lifecycle still coupled to subscriber count
- Risk: compose loop pauses/degrades when subscriber count drops to zero or churns rapidly.
- Impact: Critical.
- Mitigation: enforce always-on compositor lifecycle independent of subscriber presence and churn matrix checks.

## R4 Stale frame/cache reuse in compose path
- Risk: producer emits previously composed frames or partial state views instead of current full authoritative revision.
- Impact: Critical.
- Mitigation: revision-bound compose assertions and explicit stale-frame regression tests.

## R5 Mutation visibility lag despite accepted command
- Risk: mutation is accepted/applied but stream output does not update immediately.
- Impact: Critical.
- Mitigation: enforce mutation->stream latency gates for start/stop/board/align across churn scenarios.

## R6 Receiver-only enforcement regresses control determinism
- Risk: final-page simplification accidentally introduces nondeterministic control behavior.
- Impact: Critical.
- Mitigation: preserve HF6 contracts and run mandatory multi-client control determinism matrix.

## R7 Fullscreen-only output contract drifts
- Risk: extra UI layers/debug/status text reappear on `/output/final`.
- Impact: Critical.
- Mitigation: enforce fullscreen stream-only rendering and keep HF5 purity checks mandatory.

## R8 Authority pivot regresses deterministic sync/align contracts
- Risk: implementation accidentally changes ordering/version/idempotent apply behavior.
- Impact: Critical.
- Mitigation: enforce presentation-only boundary and run deterministic sync regression with stream enabled.

## R9 Observability gap slows latency/root-cause closure
- Risk: missing lifecycle/queue/ack/apply timing metrics obscures post-fix regressions.
- Impact: High.
- Mitigation: structured traces for mutation revision, compose revision, fanout timestamp, and output visibility latency.

## R10 Artifact drift across phase/global trackers
- Risk: phase files and global tracking files become inconsistent.
- Impact: High.
- Mitigation: mandatory full artifact sync in P9-HF8-T8.

## Execution Notes

- 9-HF1 and 9-HF2 baselines remain valid and are treated as non-regression gates.
- 9-HF3 closure remains valid for stream viability/fallback/parity baseline.
- 9-HF4 closure remains valid for stream/control decoupling baseline.
- 9-HF5 closure remains valid for stream visual-only purity baseline.
- HF6 closure remains mandatory non-regression baseline for transport/apply/ack correctness.
- HF7 authority/staleness closure remains baseline; HF8 architecture-pivot risk matrix is now closed PASS.
- Plan 9-2 is unblocked following HF8 PASS evidence closure.
