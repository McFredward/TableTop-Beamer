# Phase 9 Risks

## Acceptance Correction Context
- 9-1 is not accepted; 9-HF1 is completed foundation.
- 9-HF2 is completed baseline.
- 9-HF3 is the binding runtime bugfix wave for coordinate determinism, mixed-media lifecycle, weak-hardware controls, and explicit error feedback.

## R1 Cross-browser coordinate transform drift remains
- Risk: overlay mapping still differs across browser engines, fullscreen state, or DPR transitions.
- Impact: Critical.
- Mitigation: one canonical mapping pipeline with deterministic recompute on resize/orientation/fullscreen/DPR changes.

## R2 Partial mapping fix only covers one surface
- Risk: control view and `/output/final` use divergent coordinate transforms and drift apart.
- Impact: Critical.
- Mitigation: shared transform contract consumed by both render surfaces with parity regression checks.

## R3 Mixed-media lifecycle coupling regresses GIF path on final output
- Risk: starting room `mp4` (`malfunction`) tears down or starves room GIF renderer lifecycle on `/output/final`.
- Impact: Critical.
- Mitigation: isolate renderer ownership/lifecycle per media type and add mixed-media start/stop/restart regression matrix.

## R4 HF3 fix becomes sequence-specific and flaky
- Risk: bug appears fixed in one start order but fails in repeated mixed-media sequences.
- Impact: Critical.
- Mitigation: mandatory repeated-sequence tests (`mp4` then GIF, GIF then `mp4`, stop/restart loops) on `/output/final`.

## R5 Performance controls under-shed and weak hardware still collapses
- Risk: default quality/caps are too weak to prevent lag/freeze with many concurrent `mp4` streams.
- Impact: Critical.
- Mitigation: deterministic degradation ladder with explicit tiers, pressure thresholds, and weak-hardware stress validation.

## R6 Performance controls over-shed and produce unacceptable visual loss
- Risk: aggressive degradation keeps FPS but creates unacceptable playback quality or semantic loss.
- Impact: Critical.
- Mitigation: bounded floor, non-critical-only degradation, and explicit quality acceptance thresholds.

## R7 Degrade recovery oscillates or never restores quality
- Risk: runtime flips quality tiers rapidly or gets stuck in degraded mode after load drops.
- Impact: High.
- Mitigation: explicit recovery thresholds and soak tests with load ramp-up/ramp-down.

## R8 Error feedback is incomplete and silent failures remain
- Risk: some command/API failure and timeout branches still fail silently.
- Impact: Critical.
- Mitigation: central error-surface utility and forced-failure test matrix for command and API layers.

## R9 Error feedback causes noisy UX or duplicate toasts
- Risk: repeated retries flood operator with duplicate/non-actionable errors.
- Impact: High.
- Mitigation: dedup/throttle and actionable copy rules for feedback events.

## R10 Hardening introduces non-deterministic cross-client behavior
- Risk: performance/degrade logic diverges across clients and breaks sync determinism.
- Impact: Critical.
- Mitigation: keep adaptive logic local to rendering cost control only; sync/lifecycle semantics remain authoritative and versioned.

## R11 Artifact drift across phase/global trackers
- Risk: phase files and global tracking files become inconsistent.
- Impact: High.
- Mitigation: mandatory full artifact sync in P9-HF3-T9.

## R12 Regression escape in browser/final-output/weak-hardware edge conditions
- Risk: short smoke tests pass but field combinations still fail.
- Impact: Critical.
- Mitigation: mandatory browser matrix + mixed-media final-output regression + weak-hardware stress as closure gate.

## Execution Notes

- 9-HF1 baseline is complete and remains valid for modular ownership.
- 9-HF2 is completed and remains valid baseline for lifecycle no-replay and low-end hardening.
- 9-HF3 is completed; R1-R12 remain tracked for subsequent Plan 9-2/9-3 closure waves.
