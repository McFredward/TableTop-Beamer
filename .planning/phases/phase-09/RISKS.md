# Phase 9 Risks

## Acceptance Correction Context
- 9-1 is not accepted; 9-HF1 and 9-HF2 are completed baselines.
- 9-HF3 and 9-HF4 are completed baselines; 9-HF5 is the binding P0 stream-purity wave.

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
- Mitigation: mandatory full artifact sync in P9-HF5-T8.

## R12 Overlay source is duplicated across compose/debug paths
- Risk: overlay text removal in one path leaves secondary compose/debug injection path active.
- Impact: Critical.
- Mitigation: remove overlays at authoritative compose source and enforce single-stream purity guard.

## R13 Diagnostics overlay can re-enter via fallback/reconnect lifecycle
- Risk: reconnect or fallback transitions re-enable debug overlay state in stream frames.
- Impact: Critical.
- Mitigation: lifecycle tests for reconnect/churn plus explicit no-overlay assertions on each stream mode transition.

## R14 Overlay removal accidentally regresses HF4 stability guarantees
- Risk: stream purity fix touches producer/command boundaries and reintroduces responsiveness or recovery regressions.
- Impact: Critical.
- Mitigation: mandatory HF4 non-regression matrix is part of HF5 gate before any wave closure.

## Execution Notes

- 9-HF1 and 9-HF2 baselines remain valid and are treated as non-regression gates.
- 9-HF3 closure remains valid for stream viability/fallback/parity baseline.
- 9-HF4 closures are implemented and verified and remain mandatory non-regression gates for HF5.
- HF5 stream-output purity risks are closed with evidence (`P9-HF5-T6-STREAM-PURITY-MATRIX.md`, `P9-HF5-T7-OUTPUT-PARITY-NO-OVERLAY.md`).
- Residual Phase 9 risk focus shifts to 9-2 adapter/dependency cleanup.
