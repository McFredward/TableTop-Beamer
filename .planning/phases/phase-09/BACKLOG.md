# Phase 9 Backlog (Replanned after critical P0 control-command transport blocker)

## Acceptance Correction and Baseline
- 9-1 execution exists, but 9-1 is not accepted.
- 9-HF1 is completed baseline.
- 9-HF2 is completed baseline.
- 9-HF3 is completed baseline.
- 9-HF4 is completed baseline.
- 9-HF5 is completed baseline (stream visual purity).
- New priority wave: 9-HF6 (command transport/apply/ack recovery under active stream mode).

## Epics
- 9-HF4 Stream/Command Path Decoupling (baseline preserved)
- 9-HF5 Stream-Output Purity Enforcement (baseline preserved)
- 9-HF6 Control Command Transport Reliability Under Stream Mode
- 9-HF6 Immediate Server Apply + Acknowledgement + Snapshot Propagation
- 9-HF6 Strict Multi-Client Start/Stop Regression Closure
- Hard Regression + Artifact Sync Closure

## Story Mapping
- P9-HF6-S1 Reproduce dropped/no-op control commands after stream-purity changes with deterministic traces.
- P9-HF6-S2 Isolate root cause in command transport path from client action to server ingest when stream mode is active.
- P9-HF6-S3 Fix transport so client start/stop actions always reach server command ingest independent of stream mode.
- P9-HF6-S4 Fix server apply path so accepted commands immediately mutate authoritative stream and snapshot state.
- P9-HF6-S5 Enforce immediate server acknowledgement semantics for accepted control commands.
- P9-HF6-S6 Validate immediate multi-client propagation (control clients + `/output/final`) for start/stop actions.
- P9-HF6-S7 Verify HF5 stream-purity non-regression while control reliability is restored.
- P9-HF6-S8 Synchronize all phase/global planning artifacts after HF6 closure.

## Prioritized Execution Wave (P0) - Plan 9-HF6 execute-ready
- Story P9-HF6-S1 + P9-HF6-S2.
  - Goal: deterministic root-cause closure for dropped/no-op command path.
- Story P9-HF6-S3 + P9-HF6-S4 + P9-HF6-S5.
  - Goal: immediate transport -> apply -> ack chain even with stream mode active.
- Story P9-HF6-S6 + P9-HF6-S7.
  - Goal: strict start/stop parity across stream on/off and multi-client `/output/final` without purity regression.
- Story P9-HF6-S8.
  - Goal: phase + global artifacts are fully synchronized.

## Follow-up Waves
- Plan 9-2 (after HF6 PASS): adapter cleanup, dependency hardening, optional diagnostics refinements.
- Plan 9-3 (after 9-2): production gate sweep and final sign-off.

## Execution Status Update

- Plan 9-1 executed and documented, but rejected by acceptance correction.
- Plan 9-HF1 completed and remains accepted as modularization baseline.
- Plan 9-HF2 completed with PASS evidence.
- Plan 9-HF3 completed with PASS evidence.
- Plan 9-HF4 completed PASS with evidence artifacts.
- Plan 9-HF5 completed PASS with stream-purity gates closed.
- Plan 9-HF6 completed PASS (`P9-HF6-T1-REPRO-TRACE.md`, `P9-HF6-T2-ROOT-CAUSE.md`, `P9-HF6-T3-TRANSPORT-FIX.md`, `P9-HF6-T4-APPLY-SNAPSHOT-STREAM.md`, `P9-HF6-T5-IMMEDIATE-ACK.md`, `P9-HF6-T6-START-STOP-PARITY-MATRIX.md`, `P9-HF6-T7-HF5-PURITY-NON-REGRESSION.md`).
- Plan 9-2 is unblocked as next hardening wave.
