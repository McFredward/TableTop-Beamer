# Phase 9 Plan (Replanned after critical P0 stream/control blocker)

## Baseline and Correction Context
- User correction remains binding: Plan 9-1 is executed but not accepted.
- Plan 9-HF1 remains completed foundation (monolith reduction + modular seams).
- Plan 9-HF2 remains completed baseline (lifecycle no-replay + low-end hardening).
- Plan 9-HF3 remains completed baseline (server stream + fallback + parity evidence).
- New mandatory execution wave is Plan 9-HF4 and supersedes 9-2 as immediate next step.

## Critical P0 Blocker from Real Usage (binding)
1. Enabling `/output/final` stream mode from any device can make control clients non-responsive.
2. Controls impacted include start/stop, board switch, align toggle, and related command actions.
3. Some board profiles/assets show black stream output (observed example: sandstorm board).
4. Recovery can require server restart, which is unacceptable for live operation.

## Mandatory Objectives for 9-HF4 (hard requirements)
1. Decouple stream consumer lifecycle from control command path (no global lock, queue starvation, or shared-state freeze).
2. Ensure command ingest/apply remains fully operational regardless of stream subscribers.
3. Fix black-stream cases across board profiles/assets.
4. Guarantee stream producer is server-side authoritative and independent of client render health.
5. Add hard regression tests: stream on/off control parity, restart-free recovery, and output parity.

## Target State
Phase 9 closes with HF1/HF2/HF3 guarantees preserved and HF4 removing the remaining operational blocker: stream subscribers can join/leave/fail without impacting command ingest/apply, black-stream paths are closed across board profiles, and `/output/final` remains available without requiring server restart.

## Scope (9-HF4)
- Isolate stream subscriber/session lifecycle from the command intake and authoritative apply pipeline.
- Split or re-prioritize queues/locks so control commands cannot be blocked by stream backpressure.
- Harden stream producer and frame composition lifecycle as server-authoritative service.
- Add board/profile/asset-safe rendering guards to prevent black frame pipelines.
- Add watchdog and self-healing recovery so stream faults recover without process restart.
- Add deterministic regression matrix for command responsiveness with stream on/off and multi-subscriber churn.

## Out of Scope
- New UX features unrelated to stream/control stability.
- Mutation protocol redesign beyond required isolation hardening.
- Changes to existing deterministic ordering/version/idempotency contracts.

## Prioritized Next Execution Wave (Plan 9-HF4, execute-ready, hard-gated)
1. Reproduce and instrument P0 freeze + black-stream failures with trace points across ingest/apply/stream lifecycle.
2. Refactor runtime boundaries so stream lifecycle cannot block command ingest/apply.
3. Implement independent authoritative stream producer scheduling and bounded subscriber isolation.
4. Fix board/profile/asset black-stream root causes (including sandstorm path) with compatibility guards.
5. Implement restart-free fault recovery (subscriber drop/reconnect, producer error, encode hiccups).
6. Execute hard regression matrix (stream on/off parity, no control freeze, no restart requirement, output parity) and close only after artifact synchronization + PASS.

## Milestones
1. M1 HF3 Baseline Lock: stream/fallback/sync/align contracts remain intact.
2. M2 Repro + Root Cause Closure: freeze and black-stream failures are deterministically reproduced and isolated.
3. M3 Command-Path Isolation: control command ingest/apply is independent from stream subscriber lifecycle.
4. M4 Producer Authority Hardening: stream producer remains authoritative and resilient to client render/subscriber health.
5. M5 Black-Stream Closure: board/profile/asset black output cases are resolved.
6. M6 Recovery Closure: no operational path requires server restart.
7. M7 Evidence Closure: hard regression matrix is PASS and artifacts are synchronized.

## Regression/Evidence Matrix Policy (9-HF4)
- Stream-On Control Responsiveness Test: commands remain responsive under active stream subscribers.
- Stream-Off Control Responsiveness Test: parity baseline remains unchanged.
- Subscriber Churn Isolation Test: rapid join/leave/fail subscribers do not starve command path.
- Queue/Lock Starvation Guard Test: ingest/apply throughput remains bounded during stream stress.
- Black-Stream Board Matrix Test: all board profiles/assets (including sandstorm) render non-black output.
- Producer Authority Test: stream output remains driven by server authoritative state independent of client render health.
- Restart-Free Recovery Test: injected stream faults recover without server restart.
- Output Parity Test: stream output remains semantically aligned with canonical `/output/final` rendering contract.

## Definition of Done
- HF1/HF2/HF3 guarantees remain intact with no regression.
- Command ingest/apply stays fully operational with stream on, off, degraded, and subscriber churn.
- Black-stream cases are closed across board profiles/assets.
- Stream producer is server-authoritative and independent from client render health.
- Fault recovery is restart-free in tested failure paths.
- Hard regression matrix is PASS and phase/global planning artifacts are synchronized.

## Execution Update

- Plan 9-1 remains documented but not accepted.
- Plan 9-HF1 remains completed foundation (`src/app.js`: 12163 -> 28 lines).
- Plan 9-HF2 remains completed with PASS evidence (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
- Plan 9-HF3 remains completed with PASS evidence (`P9-HF3-T1-STREAM-ADR.md`, `P9-HF3-T6-ALIGN-PARITY.md`, `P9-HF3-T7-SYNC-INVARIANTS.md`, `P9-HF3-T8-CONTROL-RESPONSIVENESS.md`, `P9-HF3-T9-WEAK-HARDWARE-MATRIX.md`).
- Plan 9-HF4 completed PASS: stream producer is decoupled from command ingest/apply lifecycle, black-stream paths are closed, restart-free recovery is verified, and hard control/output parity matrices are recorded.
