# Phase 9 Risks

## Acceptance Correction Context
- 9-1 is not accepted; 9-HF1 is completed foundation.
- 9-HF2 is completed lifecycle/no-replay baseline.
- 9-HF3 is the binding P0 wave for video-performance stability on mobile + Raspberry Pi.

## R1 Video decode/render contention still starves frame budget
- Risk: decode bursts and draw work contend on the same budget, causing visible stalls.
- Impact: Critical.
- Mitigation: explicit decode/render scheduling, bounded decode cadence, and frame-budget arbitration.

## R2 Warmup/startup path causes hitch spikes
- Risk: first-frame/start/seek path triggers blocking warmup and decoder thrash.
- Impact: Critical.
- Mitigation: deterministic prebuffer/warmup pipeline, readiness guards, and staged start strategy.

## R3 Overdraw/compositing path overloads weak GPUs
- Risk: layered video draws and clipping produce excessive per-frame cost on Raspberry/mobile GPUs.
- Impact: Critical.
- Mitigation: draw strategy optimization, batching/cadence tuning, and bounded quality levels.

## R4 Final-output priority not enforced under mixed load
- Risk: control-view spikes steal budget from `/output/final`, causing beamer jitter.
- Impact: Critical.
- Mitigation: explicit final-output-first priority policy with protected render budget.

## R5 Control views become sluggish when final-output priority is active
- Risk: aggressive prioritization keeps final smooth but degrades controls to unusable state.
- Impact: Critical.
- Mitigation: minimum responsiveness floor for control-path updates and interaction latency guardrails.

## R6 Adaptive ladder too aggressive (visible quality collapse)
- Risk: load shedding drops quality too fast and appears broken.
- Impact: High.
- Mitigation: bounded degradation levels, non-critical-only shedding, and recovery hysteresis.

## R7 Adaptive ladder too weak (runtime still collapses)
- Risk: load shedding fails to prevent stalls on weak devices.
- Impact: Critical.
- Mitigation: pressure-level escalation tuned against Raspberry/mobile stress matrix.

## R8 Recovery path sticks in degraded mode
- Risk: after pressure drops, quality does not recover and remains unnecessarily degraded.
- Impact: High.
- Mitigation: explicit recovery thresholds and timed recovery checks in soak tests.

## R9 Performance instrumentation overhead distorts results
- Risk: telemetry itself adds enough overhead to hide or create regressions.
- Impact: High.
- Mitigation: sampled/low-noise instrumentation and strict separation of profiling vs production logging modes.

## R10 Deterministic sync/lifecycle regressions under performance hardening
- Risk: adaptive paths accidentally alter ordering/version/lifecycle behavior.
- Impact: Critical.
- Mitigation: keep adaptation visual-only; run mandatory sync/lifecycle/stop determinism regression gates.

## R11 Stop determinism regresses in video-heavy paths
- Risk: stop/clear under high load lags or becomes non-deterministic.
- Impact: Critical.
- Mitigation: explicit stop-path stress matrix under video load with hard latency assertions.

## R12 Artifact drift across phase/global trackers
- Risk: phase files and global tracking files diverge during fast hotfix execution.
- Impact: High.
- Mitigation: mandatory full artifact sync in P9-HF3-T10.

## Execution Notes

- 9-HF1 baseline remains valid for modular ownership.
- 9-HF2 baseline remains valid for lifecycle no-replay and low-end runtime hardening.
- 9-HF3 risk-closure wave is completed: decode/render starvation, warmup hitching, overdraw contention, final-output budget contention, control responsiveness, adaptive recovery, and determinism regressions are closed with PASS evidence across T1..T9 artifacts.
