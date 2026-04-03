# Phase 9 Backlog (Replanned after HF8 follow-up blocker)

## Acceptance Correction and Baseline
- 9-1 execution exists, but 9-1 is not accepted.
- 9-HF1 is completed baseline.
- 9-HF2 is completed baseline.
- 9-HF3 is completed baseline.
- 9-HF4 is completed baseline.
- 9-HF5 is completed baseline (stream visual purity).
- 9-HF6 is completed baseline (command transport/apply/ack recovery under active stream mode).
- 9-HF7 is completed baseline (strict stream-only authority + stale-frame closure for `/output/final`).
- 9-HF8 is completed baseline for stream-authority pivot, but follow-up verification found a blocking gate failure (`compositorAlwaysOn=false`).
- New user clarification is binding and introduces Plan 9-HF9 as immediate P0 blocker wave.

## Epics
- 9-HF4 Stream/Command Path Decoupling (baseline preserved)
- 9-HF5 Stream-Output Purity Enforcement (baseline preserved)
- 9-HF8 True Server-Side Composed Video Stream Endpoint
- 9-HF8 `/output/final` Receiver-Only Minimal Client (No Polling/Orchestration)
- 9-HF8 Continuous Server Compositor Lifecycle Independent Of Clients
- 9-HF8 Mutation-to-Stream Immediate Visibility Latency Gates
- 9-HF8 Parity + Acceptance Regression Matrix Closure
- 9-HF9 Always-On Compositor Lifecycle Definitive Closure
- 9-HF9 Full Parity Matrix Re-Closure (No Partial Pass)
- 9-HF9 Stream-Only/No-Polling Contract Preservation
- 9-HF9 PASS Evidence Refresh + Artifact Sync
- Hard Regression + Artifact Sync Closure

## Story Mapping
- P9-HF8-S1 Deliver true canonical server-side composed video stream endpoint for `/output/final`.
- P9-HF8-S2 Strip `/output/final` to fullscreen receiver-only player (no polling, no client animation/state orchestration).
- P9-HF8-S3 Enforce always-running compositor lifecycle independent of subscriber presence/churn.
- P9-HF8-S4 Gate compose freshness to current authoritative full state revision and forbid stale reuse.
- P9-HF8-S5 Enforce mutation->stream immediacy gates for start/stop/board/align and related commands.
- P9-HF8-S6 Preserve deterministic control-view behavior while final page remains receiver-only.
- P9-HF8-S7 Validate HF5 visual-only purity and HF6 transport/apply/ack non-regression.
- P9-HF8-S8 Execute parity/acceptance regression matrix and synchronize all phase/global planning artifacts.
- P9-HF9-S1 Reproduce and isolate HF8 follow-up failure where `compositorAlwaysOn=false` despite working stream path.
- P9-HF9-S2 Fix compositor lifecycle/reporting so always-on gate is true across normal startup/runtime sequences.
- P9-HF9-S3 Validate no regression of receiver-only `/output/final` contract (stream-only, fullscreen, no polling/orchestration).
- P9-HF9-S4 Re-run full parity/acceptance matrix and require full PASS (no partial closure).
- P9-HF9-S5 Re-run HF5/HF6 non-regression suites and refresh evidence artifacts with PASS.
- P9-HF9-S6 Synchronize all planning/global artifacts and keep Plan 9-2 blocked until HF9 closure.

## Prioritized Execution Wave (P0) - Plan 9-HF9 execute-ready
- Story P9-HF9-S1 + P9-HF9-S2.
  - Goal: close `compositorAlwaysOn=false` root cause and make always-on lifecycle gate true under normal startup/runtime.
- Story P9-HF9-S3.
  - Goal: keep `/output/final` strict receiver-only stream client unchanged (no polling/orchestration).
- Story P9-HF9-S4 + P9-HF9-S5.
  - Goal: full parity PASS plus HF5/HF6 non-regression PASS with refreshed evidence artifacts.
- Story P9-HF9-S6.
  - Goal: synchronized artifact closure and explicit unblock rule for 9-2 only after HF9 PASS.

## Follow-up Waves
- Plan 9-2 (after HF9 PASS): adapter cleanup, dependency hardening, optional diagnostics refinements.
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
- Plan 9-HF8 stream-path pivot remains completed baseline.
- Plan 9-HF9 is completed PASS: lifecycle/reporting gate closure (`compositorAlwaysOn=true`) plus full parity + HF5/HF6 non-regression evidence refresh (`9-HF9-VERIFICATION.md`).
- Plan 9-2 is unblocked after HF9 closure.
