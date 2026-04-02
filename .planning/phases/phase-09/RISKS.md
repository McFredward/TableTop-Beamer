# Phase 9 Risks

## Acceptance Correction Context
- 9-1 is not accepted; 9-HF1 and 9-HF2 are completed baselines.
- 9-HF3 is completed baseline; 9-HF4 is the binding P0 stabilization wave.

## R1 Hidden coupling still exists between stream lifecycle and command path
- Risk: a residual shared lock/state path still allows stream subscriber events to freeze command ingest/apply.
- Impact: Critical.
- Mitigation: explicit ownership boundaries, lock-domain split, and regression tests with churn/fault injection.

## R2 Queue starvation under burst subscribers or stream pressure
- Risk: stream workload monopolizes scheduler/queue and starves control commands.
- Impact: Critical.
- Mitigation: bounded queue budgets, priority class separation, and latency SLO checks for command path.

## R3 Black-stream root cause is multi-factor and partially hidden
- Risk: only one board/profile is fixed while other asset/pipeline variants remain black.
- Impact: High.
- Mitigation: board/profile/asset matrix coverage with shared render guards and explicit fail-closed diagnostics.

## R4 Stream producer unintentionally depends on client render health
- Risk: client-side failures feed back into producer timing/state causing output stalls.
- Impact: Critical.
- Mitigation: server-authoritative producer ownership with one-way consumer boundaries.

## R5 Restart requirement persists in certain fault paths
- Risk: rare producer/subscriber fault leaves system unrecoverable without server restart.
- Impact: Critical.
- Mitigation: watchdog recovery, circuit-breaker resets, and restart-free fault injection tests.

## R6 Isolation fix regresses deterministic sync/align contracts
- Risk: implementation accidentally changes ordering/version/idempotent apply behavior.
- Impact: Critical.
- Mitigation: enforce presentation-only boundary and run deterministic sync regression with stream enabled.

## R7 Control command responsiveness degrades under mixed stream/load states
- Risk: controls pass in steady state but regress under subscriber churn or partial outages.
- Impact: Critical.
- Mitigation: mandatory stream on/off + churn matrices with command latency and success-rate gates.

## R8 Observability gap slows root-cause closure
- Risk: missing lifecycle/queue metrics obscures post-fix regressions.
- Impact: High.
- Mitigation: structured traces for queue depth, lock wait, producer health, and command ingest/apply timings.

## R9 Broad fix accidentally over-couples fallback path
- Risk: stabilization changes break deterministic fallback or output parity behavior.
- Impact: Critical.
- Mitigation: keep fallback contract tests in mandatory matrix; validate both stream and fallback in every gate.

## R10 Lifecycle/no-replay regression reintroduced indirectly
- Risk: stream integration bypasses HF2 lifecycle guards and shows stale replay artifacts.
- Impact: Critical.
- Mitigation: keep stream fed from authoritative post-reconcile state and re-run no-replay regression.

## R11 Artifact drift across phase/global trackers
- Risk: phase files and global tracking files become inconsistent.
- Impact: High.
- Mitigation: mandatory full artifact sync in P9-HF4-T10.

## Execution Notes

- 9-HF1 and 9-HF2 baselines remain valid and are treated as non-regression gates.
- 9-HF3 closure remains valid for stream viability/fallback/parity baseline.
- 9-HF4 closures are implemented and verified; residual Phase 9 risk focus shifts to 9-2 adapter/dependency cleanup without regressing HF4 gates.
