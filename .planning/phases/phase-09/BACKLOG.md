# Phase 9 Backlog (Replanned after critical P0 `/output/final` authority/staleness blocker)

## Acceptance Correction and Baseline
- 9-1 execution exists, but 9-1 is not accepted.
- 9-HF1 is completed baseline.
- 9-HF2 is completed baseline.
- 9-HF3 is completed baseline.
- 9-HF4 is completed baseline.
- 9-HF5 is completed baseline (stream visual purity).
- 9-HF6 is completed baseline (command transport/apply/ack recovery under active stream mode).
- 9-HF7 is completed baseline (strict stream-only authority + stale-frame closure for `/output/final`).

## Epics
- 9-HF4 Stream/Command Path Decoupling (baseline preserved)
- 9-HF5 Stream-Output Purity Enforcement (baseline preserved)
- 9-HF7 Remove `/output/final` Client Fallback Paths Entirely
- 9-HF7 Always-Authoritative Producer Independence From Subscriber Count
- 9-HF7 Immediate Mutation-to-Output Visibility + Fresh Full-State Compose
- 9-HF7 Control Determinism Preservation Under Stream-Only Output
- Hard Regression + Artifact Sync Closure

## Story Mapping
- P9-HF7-S1 Reproduce deterministic stale/fallback behavior where `/output/final` does not reflect fresh mutations immediately.
- P9-HF7-S2 Remove all auto/manual/client fallback paths for `/output/final` runtime output.
- P9-HF7-S3 Enforce continuous authoritative server compose independent of subscriber count/churn.
- P9-HF7-S4 Ensure compose source uses current full authoritative state revision on every mutation cycle.
- P9-HF7-S5 Validate immediate update visibility for start/stop/board/align and related control mutations.
- P9-HF7-S6 Preserve deterministic control-view behavior while `/output/final` is strict stream-only.
- P9-HF7-S7 Verify HF5 visual-only purity and HF6 transport/apply/ack non-regression.
- P9-HF7-S8 Synchronize all phase/global planning artifacts after HF7 closure.

## Prioritized Execution Wave (P0) - Plan 9-HF7 execute-ready
- Story P9-HF7-S1 + P9-HF7-S2.
  - Goal: deterministic stale/fallback root-cause closure and strict fallback elimination.
- Story P9-HF7-S3 + P9-HF7-S4 + P9-HF7-S5.
  - Goal: always-on authoritative compose from current full state with immediate mutation visibility.
- Story P9-HF7-S6 + P9-HF7-S7.
  - Goal: keep control deterministic while preserving HF5/HF6 non-regression contracts.
- Story P9-HF7-S8.
  - Goal: phase + global artifacts are fully synchronized.

## Follow-up Waves
- Plan 9-2 (after HF7 PASS): adapter cleanup, dependency hardening, optional diagnostics refinements.
- Plan 9-3 (after 9-2): production gate sweep and final sign-off.

## Execution Status Update

- Plan 9-1 executed and documented, but rejected by acceptance correction.
- Plan 9-HF1 completed and remains accepted as modularization baseline.
- Plan 9-HF2 completed with PASS evidence.
- Plan 9-HF3 completed with PASS evidence.
- Plan 9-HF4 completed PASS with evidence artifacts.
- Plan 9-HF5 completed PASS with stream-purity gates closed.
- Plan 9-HF6 completed PASS (`P9-HF6-T1-REPRO-TRACE.md`, `P9-HF6-T2-ROOT-CAUSE.md`, `P9-HF6-T3-TRANSPORT-FIX.md`, `P9-HF6-T4-APPLY-SNAPSHOT-STREAM.md`, `P9-HF6-T5-IMMEDIATE-ACK.md`, `P9-HF6-T6-START-STOP-PARITY-MATRIX.md`, `P9-HF6-T7-HF5-PURITY-NON-REGRESSION.md`).
- Plan 9-HF7 completed PASS (`P9-HF7-T1-STALE-FALLBACK-REPRO-TRACE.md`, `P9-HF7-T2-NO-FALLBACK-PATH.md`, `P9-HF7-T3-PRODUCER-SUBSCRIBER-INDEPENDENCE.md`, `P9-HF7-T4-FULL-STATE-REVISION-COMPOSE.md`, `P9-HF7-T5-IMMEDIATE-MUTATION-VISIBILITY.md`, `P9-HF7-T6-CONTROL-DETERMINISM-MATRIX.md`, `P9-HF7-T7-HF5-HF6-NON-REGRESSION.md`).
- Plan 9-2 is unblocked after HF7 PASS.
