# Phase 9 Backlog (Replanned after mandatory video-performance P0 feedback)

## Acceptance Correction
- 9-1 execution exists, but 9-1 is not accepted.
- 9-HF1 is completed baseline, but not final closure.
- 9-HF2 is completed baseline, but not final closure.
- New priority wave: 9-HF3 (mandatory video performance and final-output stability).

## Epics
- 9-HF3 Mandatory Video Performance Hotfix Wave
- Video Render Path Optimization (decode/render scheduling, warmup, draw arbitration)
- Final-Output-First Load Prioritization
- Adaptive Weak-Device Quality and Load Shedding (Raspberry/mobile)
- Video-Heavy Performance Regression and Threshold Enforcement
- Deterministic Sync/Lifecycle/Stop Non-Regression Guard

## Story Mapping
- P9-HF3-S1 Build reproducible video-heavy profiling baseline for mobile + Raspberry Pi bottlenecks.
- P9-HF3-S2 Optimize video decode/render scheduling to avoid frame-budget starvation.
- P9-HF3-S3 Add deterministic buffering/warmup strategy to remove start/seek hitch spikes.
- P9-HF3-S4 Optimize draw strategy for video layers to reduce main-thread contention and overdraw.
- P9-HF3-S5 Enforce final-output-first scheduling and budget protection under load contention.
- P9-HF3-S6 Keep control-view responsiveness stable while final-output priority is active.
- P9-HF3-S7 Implement adaptive quality/load-shedding ladder for weak devices with bounded degradation + recovery hysteresis.
- P9-HF3-S8 Add hard performance regression suite for video-heavy scenarios with measurable thresholds.
- P9-HF3-S9 Prove no regression for sync ordering/version/idempotent apply, lifecycle no-replay, and stop determinism.
- P9-HF3-S10 Synchronize all phase/global planning artifacts after HF3 closure.

## Prioritized Execution Wave (P0) - Plan 9-HF3 execute-ready
- Story P9-HF3-S1.
  - Goal: deterministic bottleneck baseline for video-heavy workloads.
- Story P9-HF3-S2 + P9-HF3-S3 + P9-HF3-S4.
  - Goal: stable decode/render path with reduced stalls and smoother playback.
- Story P9-HF3-S5.
  - Goal: `/output/final` remains fluid and prioritized under contention.
- Story P9-HF3-S6 + P9-HF3-S7.
  - Goal: control views stay responsive and weak devices degrade gracefully.
- Story P9-HF3-S8.
  - Goal: measurable video-heavy performance gates are PASS with evidence.
- Story P9-HF3-S9.
  - Goal: no regression in sync/lifecycle/stop determinism.
- Story P9-HF3-S10.
  - Goal: phase + global artifacts are fully synchronized.

## Follow-up Waves
- Plan 9-2 (after HF3 PASS): adapter cleanup, dependency hardening, optional diagnostics refinements.
- Plan 9-3 (after 9-2): production gate sweep and final sign-off.

## Execution Status Update

- Plan 9-1 executed and documented, but rejected by acceptance correction.
- Plan 9-HF1 completed and remains accepted as modularization baseline.
- Plan 9-HF2 completed and remains accepted as lifecycle/no-replay + low-end hardening baseline.
- Plan 9-HF3 is completed with PASS evidence (`P9-HF3-T1-VIDEO-PROFILING-BASELINE.md` .. `P9-HF3-T9-DETERMINISM-REGRESSION.md`); Plan 9-2 is now unblocked as next wave.
