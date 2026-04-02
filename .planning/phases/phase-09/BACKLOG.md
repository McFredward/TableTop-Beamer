# Phase 9 Backlog (Replanned after mandatory final-output performance direction)

## Acceptance Correction
- 9-1 execution exists, but 9-1 is not accepted.
- 9-HF1 is completed baseline.
- 9-HF2 is completed baseline.
- New priority wave: 9-HF3 (mandatory server-composed `/output/final` stream path with fallback).

## Epics
- 9-HF3 Final-Output Stream Architecture Wave
- Server-Composed `/output/final` Delivery
- Stream Health and Deterministic Fallback
- Deterministic Sync + Align-Mode Contract Preservation
- Weak-Hardware Smooth Playback Validation
- Phase/Global Artifact Sync Closure

## Story Mapping
- P9-HF3-S1 Evaluate server-side composition feasibility and capture latency/quality/capacity tradeoffs.
- P9-HF3-S2 Implement server compositor pipeline driven by authoritative session snapshots.
- P9-HF3-S3 Deliver stream transport endpoint and `/output/final` playback integration.
- P9-HF3-S4 Add stream health probes with deterministic auto-fallback to existing client render.
- P9-HF3-S5 Add explicit operator override for stream-vs-fallback mode to de-risk deployment.
- P9-HF3-S6 Guarantee align-mode parity across stream and fallback output paths.
- P9-HF3-S7 Validate deterministic sync invariants remain unchanged (presentation-only stream path).
- P9-HF3-S8 Keep control views interactive and low-latency during stream operation.
- P9-HF3-S9 Execute weak-hardware evidence matrix (Raspberry Pi class) for smooth playback and fallback resilience.
- P9-HF3-S10 Synchronize all phase/global planning artifacts after HF3 closure.

## Prioritized Execution Wave (P0) - Plan 9-HF3 execute-ready
- Story P9-HF3-S1.
  - Goal: architecture decision closure with measured feasibility and explicit go/no-go guardrails.
- Story P9-HF3-S2 + P9-HF3-S3.
  - Goal: operational server-composed stream path for `/output/final`.
- Story P9-HF3-S4 + P9-HF3-S5.
  - Goal: safe rollout via health-based auto-fallback and manual operator override.
- Story P9-HF3-S6 + P9-HF3-S7.
  - Goal: align-mode and deterministic sync contracts remain unchanged.
- Story P9-HF3-S8 + P9-HF3-S9.
  - Goal: interactive control views plus smooth weak-hardware playback proven by evidence.
- Story P9-HF3-S10.
  - Goal: phase + global artifacts are fully synchronized.

## Follow-up Waves
- Plan 9-2 (after HF3 PASS): adapter cleanup, dependency hardening, optional diagnostics refinements.
- Plan 9-3 (after 9-2): production gate sweep and final sign-off.

## Execution Status Update

- Plan 9-1 executed and documented, but rejected by acceptance correction.
- Plan 9-HF1 completed and remains accepted as modularization baseline.
- Plan 9-HF2 completed with PASS evidence.
- Plan 9-HF3 completed with PASS evidence; next prioritized wave is Plan 9-2.
