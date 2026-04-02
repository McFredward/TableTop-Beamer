# Phase 9 Plan (Replanned after critical P0 control-command transport blocker)

## Baseline and Correction Context
- User correction remains binding: Plan 9-1 is executed but not accepted.
- Plan 9-HF1 remains completed foundation (monolith reduction + modular seams).
- Plan 9-HF2 remains completed baseline (lifecycle no-replay + low-end hardening).
- Plan 9-HF3 remains completed baseline (server stream + fallback + parity evidence).
- Plan 9-HF4 remains completed baseline (stream/control decoupling + black-stream closure).
- Plan 9-HF5 remains completed baseline (visual-only stream purity, no recurring overlays).
- New mandatory execution wave is Plan 9-HF6 and supersedes 9-2 as immediate next step.

## New Critical P0 Blocker from Real Usage (binding)
1. After recent stream-purity changes, control actions (especially room start/stop) no longer trigger reliably from clients.
2. Under active stream mode, command transport can drop or no-op before reaching the authoritative server command path.
3. Requirement is strict: client actions must immediately reach server command ingest/apply path.
4. Server must update stream state and snapshot state immediately, with immediate acknowledgement, even when stream mode is active.
5. Stream-purity guarantees from HF5 must remain intact while control functionality is restored.

## Mandatory Objectives for 9-HF6 (hard requirements)
1. Produce deterministic root-cause analysis for dropped/no-op control commands under active stream mode.
2. Fix command transport from client action to server command ingest so stream mode cannot suppress delivery.
3. Fix server apply path so command apply, stream-state update, snapshot update, and ack are immediate and authoritative.
4. Preserve HF5 visual-only stream purity contract with no text/info/diagnostic overlay regression.
5. Execute strict start/stop regression matrix for stream on/off across multiple control clients and `/output/final`.

## Target State
Phase 9 remains on HF1/HF2/HF3/HF4/HF5 baselines and closes HF6 by restoring deterministic control command responsiveness under active stream mode: client actions immediately reach server command path, server apply emits immediate ack and snapshot/stream propagation, and `/output/final` stays visual-only with no overlay regression.

## Scope (9-HF6)
- Reproduce and isolate command drop/no-op path introduced after stream-purity changes.
- Repair client-to-server command transport for start/stop and related control actions under stream mode.
- Repair server command apply scheduling/ordering so stream mode does not delay or bypass authoritative mutation + snapshot propagation.
- Enforce immediate server acknowledgement semantics for accepted commands.
- Keep HF5 stream-purity guardrails active and verified.
- Add strict multi-client regression evidence for stream on/off parity including `/output/final`.

## Out of Scope
- New UX feature development unrelated to control-command reliability.
- Protocol redesign beyond targeted transport/apply/ack correctness fixes.
- Reintroduction of diagnostic/text overlays into `/output/final` stream output.

## Prioritized Next Execution Wave (Plan 9-HF6, execute-ready, hard-gated)
1. Reproduce and trace dropped/no-op control commands with stream mode active (start/stop first).
2. Isolate root cause in command transport path (client dispatch -> request envelope -> server ingest).
3. Repair transport so client actions are always delivered to server command ingest independent of stream mode.
4. Repair server apply path so accepted commands immediately mutate authoritative stream+snapshot state and emit ack.
5. Verify snapshot propagation and `/output/final` visibility update latency parity under stream on/off.
6. Run strict regression matrix across start/stop, multi-client control surfaces, stream mode on/off, and `/output/final`.
7. Verify HF5 stream-purity non-regression (no recurring overlays, visual-only contract maintained).
8. Close wave only after full artifact synchronization + PASS.

## Milestones
1. M1 HF1-HF5 Baseline Lock: completed guarantees remain non-regression constraints.
2. M2 HF6 Root-Cause Closure: command drop/no-op path under stream mode is reproducibly isolated.
3. M3 HF6 Transport Closure: client command actions deterministically reach server ingest in all stream modes.
4. M4 HF6 Apply/Ack Closure: server apply is immediate, authoritative, and acknowledgement is immediate.
5. M5 HF6 Snapshot Propagation Closure: stream + snapshot state updates propagate immediately across clients and `/output/final`.
6. M6 HF6 Purity Preservation: HF5 visual-only stream contract remains intact.
7. M7 HF6 Evidence Closure: strict regression matrix PASS with synchronized artifacts.

## Regression/Evidence Matrix Policy (9-HF6)
- HF6-Root-Cause-Repro-Test: deterministic pre-fix repro for dropped/no-op commands with stream mode active.
- Stream-On-Start-Stop-Transport-Test: start/stop commands always reach server command ingest with stream mode enabled.
- Stream-Off-Start-Stop-Baseline-Test: start/stop behavior remains parity-correct when stream mode is disabled.
- Immediate-Ack-Test: accepted commands return immediate server acknowledgement under stream on/off.
- Immediate-Apply-and-Snapshot-Test: accepted commands immediately update authoritative state and snapshot revisions.
- Multi-Client-Propagation-Test: changes propagate deterministically across multiple control clients and `/output/final`.
- Churn-and-Reconnect-Non-Drop-Test: join/leave/reconnect churn does not cause transport drop/no-op.
- HF5-Stream-Purity-Non-Regression-Test: `/output/final` stream remains visual-only with no text/info/diagnostic overlays.
- Full-Workflow-Non-Regression-Test: align/sync invariants, persistence, and operator workflow remain stable.

## Definition of Done
- Root cause of dropped/no-op commands is documented with deterministic repro and closure evidence.
- Client control actions immediately reach server command path with stream mode on and off.
- Server apply path is immediate and authoritative; stream state and snapshot state update in the same mutation cycle.
- Immediate server acknowledgement is present for accepted commands.
- Start/stop behavior is deterministic across multiple clients and `/output/final`.
- HF5 visual-only stream purity remains intact (no recurring overlays).
- Hard regression matrix is PASS and phase/global planning artifacts are synchronized.

## Execution Update

- Plan 9-1 remains documented but not accepted.
- Plan 9-HF1 remains completed foundation (`src/app.js`: 12163 -> 28 lines).
- Plan 9-HF2 remains completed with PASS evidence (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
- Plan 9-HF3 remains completed with PASS evidence (`P9-HF3-T1-STREAM-ADR.md`, `P9-HF3-T6-ALIGN-PARITY.md`, `P9-HF3-T7-SYNC-INVARIANTS.md`, `P9-HF3-T8-CONTROL-RESPONSIVENESS.md`, `P9-HF3-T9-WEAK-HARDWARE-MATRIX.md`).
- Plan 9-HF4 is completed PASS: stream producer is decoupled from command ingest/apply lifecycle, black-stream paths are closed, restart-free recovery is verified, and hard control/output parity matrices are recorded.
- Plan 9-HF5 is completed PASS: recurring overlays are removed, visual-only payload contract is enforced, and HF4 stability/parity gates remain PASS.
- Plan 9-HF6 is completed PASS with deterministic repro/root-cause closure, transport/apply/ack fixes, strict start/stop parity evidence, and HF5 stream-purity non-regression.
- Plan 9-2 is unblocked and remains the next hardening wave after HF6 closure.
