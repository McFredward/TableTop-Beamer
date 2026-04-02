# Phase 9 Backlog (Replanned after mandatory P0 stream-output purity refinement)

## Acceptance Correction and Baseline
- 9-1 execution exists, but 9-1 is not accepted.
- 9-HF1 is completed baseline.
- 9-HF2 is completed baseline.
- 9-HF3 is completed baseline.
- 9-HF4 is completed baseline.
- New priority wave: 9-HF5 (mandatory overlay removal + stream visual-only purity).

## Epics
- 9-HF4 Stream/Command Path Decoupling
- Control Ingest/Apply Availability Under Stream Load
- Black-Stream Board/Profile/Asset Closure
- Authoritative Stream Producer Hardening
- Restart-Free Fault Recovery
- Hard Regression + Artifact Sync Closure
- Stream-Output Purity Enforcement (no text/info/diagnostic overlays)

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
- P9-HF5-S1 Reproduce recurring overlay injection (`SERVER STREAM ACTIVE` + active animation list) in `/output/final` stream.
- P9-HF5-S2 Remove recurring overlay emission from stream compose pipeline at source.
- P9-HF5-S3 Enforce visual-only stream contract for `/output/final` (no text/info/diagnostic overlays).
- P9-HF5-S4 Add stream-purity guardrails to prevent diagnostics overlays from re-entering final stream frames.
- P9-HF5-S5 Validate HF4 non-regression (control responsiveness, producer authority, black-stream closure, restart-free recovery).
- P9-HF5-S6 Validate overlay absence across stream on/off, reconnect/churn, and board/profile matrix.
- P9-HF5-S7 Synchronize all phase/global planning artifacts after HF5 closure.

## Prioritized Execution Wave (P0) - Plan 9-HF5 execute-ready
- Story P9-HF5-S1 + P9-HF5-S2.
  - Goal: deterministic overlay root-cause trace and full source-path removal.
- Story P9-HF5-S3 + P9-HF5-S4.
  - Goal: hard visual-only stream contract with anti-regression guardrails.
- Story P9-HF5-S5 + P9-HF5-S6.
  - Goal: preserve HF4 stability while proving overlay-free stream output in all mandatory matrices.
- Story P9-HF5-S7.
  - Goal: phase + global artifacts are fully synchronized.

## Follow-up Waves
- Plan 9-2 (after HF5 PASS): adapter cleanup, dependency hardening, optional diagnostics refinements.
- Plan 9-3 (after 9-2): production gate sweep and final sign-off.

## Execution Status Update

- Plan 9-1 executed and documented, but rejected by acceptance correction.
- Plan 9-HF1 completed and remains accepted as modularization baseline.
- Plan 9-HF2 completed with PASS evidence.
- Plan 9-HF3 completed with PASS evidence.
- Plan 9-HF4 is completed PASS with evidence artifacts.
- Plan 9-HF5 is completed PASS; Plan 9-2 is unblocked as next wave.
