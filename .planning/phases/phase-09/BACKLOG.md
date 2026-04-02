# Phase 9 Backlog (Replanned after critical P0 stream/control blocker)

## Acceptance Correction and Baseline
- 9-1 execution exists, but 9-1 is not accepted.
- 9-HF1 is completed baseline.
- 9-HF2 is completed baseline.
- 9-HF3 is completed baseline.
- New priority wave: 9-HF4 (mandatory stream/control decoupling + black-stream closure).

## Epics
- 9-HF4 Stream/Command Path Decoupling
- Control Ingest/Apply Availability Under Stream Load
- Black-Stream Board/Profile/Asset Closure
- Authoritative Stream Producer Hardening
- Restart-Free Fault Recovery
- Hard Regression + Artifact Sync Closure

## Story Mapping
- P9-HF4-S1 Build reproducible root-cause traces for control freeze when stream mode is enabled.
- P9-HF4-S2 Isolate stream consumer lifecycle from command ingest/apply execution path.
- P9-HF4-S3 Remove lock/queue starvation paths and enforce bounded command-path latency under stream pressure.
- P9-HF4-S4 Harden authoritative stream producer scheduling independent of client render/subscriber health.
- P9-HF4-S5 Fix black-stream rendering paths across board profiles/assets (including sandstorm).
- P9-HF4-S6 Add self-healing recovery for stream faults/reconnects without server restart.
- P9-HF4-S7 Preserve deterministic sync + align-mode contracts while isolation hardening is active.
- P9-HF4-S8 Validate control command parity with stream on/off and subscriber churn.
- P9-HF4-S9 Validate stream output parity to canonical `/output/final` contract after black-stream fixes.
- P9-HF4-S10 Synchronize all phase/global planning artifacts after HF4 closure.

## Prioritized Execution Wave (P0) - Plan 9-HF4 execute-ready
- Story P9-HF4-S1.
  - Goal: deterministic reproduction of freeze/black-stream with actionable traces.
- Story P9-HF4-S2 + P9-HF4-S3.
  - Goal: command ingest/apply remains fully live regardless of stream subscribers.
- Story P9-HF4-S4 + P9-HF4-S6.
  - Goal: authoritative producer and fault recovery operate restart-free.
- Story P9-HF4-S5 + P9-HF4-S9.
  - Goal: black-stream cases closed with maintained output contract parity.
- Story P9-HF4-S7 + P9-HF4-S8.
  - Goal: sync/align invariants preserved while controls stay responsive in stream on/off modes.
- Story P9-HF4-S10.
  - Goal: phase + global artifacts are fully synchronized.

## Follow-up Waves
- Plan 9-2 (after HF4 PASS): adapter cleanup, dependency hardening, optional diagnostics refinements.
- Plan 9-3 (after 9-2): production gate sweep and final sign-off.

## Execution Status Update

- Plan 9-1 executed and documented, but rejected by acceptance correction.
- Plan 9-HF1 completed and remains accepted as modularization baseline.
- Plan 9-HF2 completed with PASS evidence.
- Plan 9-HF3 completed with PASS evidence.
- Plan 9-HF4 is completed PASS with evidence artifacts; Plan 9-2 is now unblocked as the next wave.
