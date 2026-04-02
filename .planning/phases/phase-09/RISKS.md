# Phase 9 Risks

## Acceptance Correction Context
- 9-1 is not accepted; 9-HF1 is completed foundation.
- 9-HF2 is the binding stability wave for lifecycle correctness and low-end hardening.

## R1 Rehydrate misclassifies elapsed events as active
- Risk: reload/reconnect rebuilds expired one-shot events as pending/active.
- Impact: Critical.
- Mitigation: canonical terminal-state reconciliation during rehydrate before schedule/apply.

## R2 Missing replay guard on reconnect path
- Risk: reload is fixed but reconnect/rejoin still replays expired one-shot events.
- Impact: Critical.
- Mitigation: enforce no-replay checks in all hydration/apply entry points with shared guard utility.

## R3 Clock/version boundary drift at expiry edge
- Risk: near-expiry timing drift causes inconsistent terminal vs active decisions.
- Impact: Critical.
- Mitigation: evaluate expiry against deterministic lifecycle contract with version/time guard and boundary tests.

## R4 Over-aggressive load shedding causes visible feature loss
- Risk: hardening drops too much visual behavior and looks broken.
- Impact: Critical.
- Mitigation: bounded degradation ladder with defined floors and non-critical-only shedding.

## R5 Under-shedding still allows runtime collapse on weak mobile
- Risk: caps/coalescing insufficient under sustained pressure.
- Impact: Critical.
- Mitigation: frame-budget-driven escalation with recovery hysteresis and stress validation.

## R6 Hardening introduces non-deterministic cross-client behavior
- Risk: adaptive paths diverge across clients and break sync determinism.
- Impact: Critical.
- Mitigation: keep adaptive logic local to rendering cost control only; lifecycle/sync semantics remain authoritative and versioned.

## R7 Recovery path fails to return from degraded mode
- Risk: once degraded, quality never recovers after load drops.
- Impact: High.
- Mitigation: explicit recovery thresholds and soak tests with load ramp-up/ramp-down.

## R8 `/output/final` parity regression during hardening
- Risk: final output diverges from control runtime behavior under capped/coalesced paths.
- Impact: Critical.
- Mitigation: dedicated final-output regression checks in long-run and mobile matrices.

## R9 Diagnostics overhead worsens low-end performance
- Risk: added telemetry/logging for hardening consumes scarce frame budget.
- Impact: High.
- Mitigation: keep diagnostics sampled/gated; no hot-loop verbose logging in production mode.

## R10 Artifact drift across phase/global trackers
- Risk: phase files and global tracking files become inconsistent.
- Impact: High.
- Mitigation: mandatory full artifact sync in P9-HF2-T9.

## R11 Regression escape in long-run/mobile edge conditions
- Risk: short smoke tests pass but long-run or low-end constraints still fail in field.
- Impact: Critical.
- Mitigation: mandatory soak + mobile evidence matrix as closure gate.

## Execution Notes

- 9-HF1 baseline is complete and remains valid for modular ownership.
- 9-HF2 is completed; R1-R8 mitigations are implemented and validated through HF2 evidence artifacts.
