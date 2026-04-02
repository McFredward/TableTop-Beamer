# Phase 9 Acceptance

## Reopen context
- Binding correction remains: Plan 9-1 is not accepted.
- HF1 and HF2 remain valid foundational baselines.
- HF3 closure is revoked by critical runtime regressions.
- New mandatory closure target is Plan 9-HF4 (reliability-first stabilization).

## Verification strategy
- Core-function-first: recover start/stop determinism, board switch parity, and `/output/final` load reliability before advanced optimization.
- Simplification-first: runtime path complexity must be reduced and bounded.
- Invariant-first: startup must not create phantom runs or duplicate outside runs.
- Determinism-first: server-authoritative sync semantics remain unchanged.
- Evidence-first: each blocker requires explicit FAIL->PASS reproduction and runtime smoke proof.

## Hard gates (Plan 9-HF4, mandatory)
- G1 StartStop-Determinism-Gate: start/stop is first-action deterministic in repeated cycles.
- G2 Startup-Invariant-Gate: zero phantom running entries and zero duplicate outside runs after startup/hydration.
- G3 BoardSwitch-Parity-Gate: board image and polygons switch atomically and stay in sync across controller and `/output/final`.
- G4 FinalOutput-Load-Reliability-Gate: `/output/final` reliably loads/rehydrates without intermittent blank or stuck states.
- G5 Simplification-Safety-Gate: destabilizing scheduler branches are removed/gated; retained low-end protections are bounded and deterministic.
- G6 FeatureFlag-Failsafe-Gate: runtime profiles (`safe`, `balanced`, `aggressive`) exist with safe fallback and emergency disable capability.
- G7 ServerAuthoritative-Determinism-Gate: ordering/version/idempotent apply and stop determinism remain PASS under HF4 changes.
- G8 FailPass-Evidence-Gate: mandatory FAIL->PASS and core-journey smoke evidence is complete and reproducible.

## Mandatory thresholds (HF4)
- Start/Stop reliability:
  - 100 consecutive start/stop cycles per target scenario complete with 0 lost starts and 0 missed stops.
- Startup invariant reliability:
  - 50 startup/reload/reconnect cycles produce 0 phantom running entries and 0 duplicate outside runs.
- Board-switch parity:
  - 30 sequential board switches across mobile->pc->pi path show 0 image/polygon mismatch events.
- `/output/final` load reliability:
  - 30 open/reload/reconnect attempts complete with 30/30 successful render-ready state.
- Sync reliability (mobile->pi authoritative path):
  - 0 stale-apply violations, 0 ordering breaks, 0 idempotency failures in mandatory matrix.

## Strict regression matrix (Plan 9-HF4)
- R1 StartStop-Core-Repro-Test: reproduce current failure, apply fix, and prove PASS in the same script.
- R2 Startup-DuplicateOutside-Repro-Test: capture duplicate outside run failure and PASS with invariant guard.
- R3 Startup-PhantomRunning-Repro-Test: capture phantom running entry and PASS with clean startup state.
- R4 BoardSwitch-ImagePolygon-Parity-Test: reproduce split update (polygon-only) and PASS with atomic switch.
- R5 FinalOutput-Load-Repro-Test: reproduce intermittent `/output/final` load fail and PASS with reliable bootstrap.
- R6 Runtime-Simplification-NonRegression-Test: removed/gated complex branches do not regress low-end smoothness baseline.
- R7 Profile-Flag-Failsafe-Test: switch profiles at runtime and verify safe fallback behavior.
- R8 Sync-Determinism-Regression-Test: ordering/version/idempotent apply and stop semantics remain deterministic.
- R9 Core-Journey-Smoke-Test: operator journeys pass on mobile controller + PC controller + Raspberry Pi `/output/final`.

## Runtime smoke journeys (must pass)
- Journey A: cold start -> trigger room/global -> stop -> clear all -> restart.
- Journey B: startup with persisted state -> no phantom runs -> trigger outside once -> no duplicate run.
- Journey C: board A->B->A switching while active and idle -> image/polygon parity intact.
- Journey D: open `/output/final` fresh, reload, reconnect -> render-ready each time.
- Journey E: mobile trigger/edit/stop observed on pi output with deterministic authoritative apply.

## Definition of done
- All G1..G8 gates are PASS.
- FAIL->PASS reproduction evidence exists for each reported critical regression.
- Core runtime journeys are stable on mobile/PC/pi and reproducible.
- Planning artifacts are fully synchronized.

## Current gate status
- HF4 verification artifacts were added for FAIL->PASS reproduction and runtime smoke evidence.
