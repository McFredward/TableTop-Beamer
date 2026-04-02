# Phase 9 Acceptance

## Acceptance Correction
- Binding correction: Plan 9-1 is not accepted.
- Plan 9-HF1, Plan 9-HF2, Plan 9-HF3, Plan 9-HF4, and Plan 9-HF5 are completed baselines.
- New mandatory closure target is Plan 9-HF6 with hard gates below.

## Regression and Verification Strategy
- Contract-first: deterministic sync invariants remain authoritative and unchanged.
- Transport-first: client control actions must always reach server command ingest regardless of stream mode.
- Apply-first: server accepted commands must mutate authoritative state immediately (no stream-mode defer/no-op).
- Ack-first: immediate server acknowledgement is mandatory for accepted commands.
- Propagation-first: updated snapshot/stream state must be immediately visible across clients and `/output/final`.
- Purity-preservation-first: HF5 visual-only stream contract must remain intact.
- Evidence-first: every P0 HF6 item requires reproducible pre-fix and post-fix evidence.

## Hard Gates (Plan 9-HF6, mandatory)
- G1 Root-Cause-Repro-and-Fix-Gate: dropped/no-op control command path is reproducibly demonstrated pre-fix and closed post-fix.
- G2 Command-Transport-Gate: start/stop transport from client to server ingest is deterministic with stream on and off.
- G3 Immediate-Apply-Gate: server accepted commands are applied immediately under active stream mode.
- G4 Immediate-Ack-Gate: server returns immediate acknowledgement for accepted control commands.
- G5 Snapshot-Propagation-Gate: apply results propagate immediately to snapshot consumers and `/output/final`.
- G6 Multi-Client-Start-Stop-Parity-Gate: start/stop parity holds across multiple control clients and `/output/final`.
- G7 Churn-Reconnect-Non-Drop-Gate: join/leave/reconnect churn cannot reintroduce drop/no-op command behavior.
- G8 Deterministic-Contract-Gate: ordering/version/idempotent apply and align semantics remain unchanged.
- G9 Stream-Purity-Non-Regression-Gate: no text/info/diagnostic overlays reappear in `/output/final` stream frames.
- G10 Strict-Regression-Gate: full matrix below is PASS with synchronized evidence.

## Strict Regression Matrix (Plan 9-HF6)
- HF6-PreFix-Repro-Test: deterministic evidence of no-op/dropped start/stop under stream mode before fix.
- Stream-On-Start-Stop-Command-Transport-Test: start/stop always reaches server ingest with stream mode ON.
- Stream-Off-Start-Stop-Baseline-Test: start/stop behavior remains baseline-correct with stream mode OFF.
- Immediate-Ack-Latency-Test: accepted commands emit immediate ack in stream ON/OFF scenarios.
- Immediate-Apply-Snapshot-Revision-Test: accepted commands increment and propagate authoritative snapshot state immediately.
- Multi-Client-Control-Propagation-Test: action initiated on one control client appears deterministically on other clients and `/output/final`.
- Churn-Reconnect-Command-Continuity-Test: subscriber/control reconnect churn does not cause command no-op/drop.
- Align-and-Sync-Parity-Test: align behavior and deterministic sync invariants stay unchanged.
- HF5-Visual-Only-Stream-Non-Regression-Test: no recurring overlays (`SERVER STREAM ACTIVE`, active animation list, diagnostics text) in stream output.
- Full-Workflow-Non-Regression-Test: operator workflow, persistence, and API command flow remain equivalent.

## Incremental Mandatory Gates
- After P9-HF6-T1..T2: deterministic no-op/drop root-cause repro and analysis are complete.
- After P9-HF6-T3..T5: transport/apply/ack chain is fixed and immediate under stream mode.
- After P9-HF6-T6..T7: strict start/stop matrix PASS and HF5 purity non-regression PASS.
- After P9-HF6-T8: all phase/global planning artifacts are synchronized.

## Definition of Done
- Control commands (start/stop at minimum) do not drop/no-op under active stream mode.
- Client actions immediately reach server command path in stream ON and stream OFF modes.
- Server accepted commands immediately apply authoritative mutations and snapshot propagation.
- Immediate acknowledgement behavior is verifiably present.
- Multi-client and `/output/final` propagation parity is deterministic.
- HF5 visual-only stream purity remains intact with no overlay regressions.
- Evidence matrix is PASS and phase/global tracking files are synchronized.

## Plan 9 Baseline Notes

- 9-1 evidence remains documented in `9-1-VERIFICATION.md` but stays not accepted.
- 9-HF1 hard reduction gate is PASS (`src/app.js`: 12163 -> 28).
- 9-HF2 gates are PASS with artifacts:
  - `.planning/phases/phase-09/P9-HF2-T6-SYNC-INVARIANTS.md`
  - `.planning/phases/phase-09/P9-HF2-T7-LONG-RUN-SOAK.md`
  - `.planning/phases/phase-09/P9-HF2-T8-LOW-END-STRESS.md`
- 9-HF3 gates are PASS with artifacts:
  - `.planning/phases/phase-09/P9-HF3-T1-STREAM-ADR.md`
  - `.planning/phases/phase-09/P9-HF3-T6-ALIGN-PARITY.md`
  - `.planning/phases/phase-09/P9-HF3-T7-SYNC-INVARIANTS.md`
  - `.planning/phases/phase-09/P9-HF3-T8-CONTROL-RESPONSIVENESS.md`
  - `.planning/phases/phase-09/P9-HF3-T9-WEAK-HARDWARE-MATRIX.md`
- 9-HF4 is completed PASS with evidence artifacts and closes the stream/control freeze baseline.
- 9-HF5 is completed PASS with stream-purity gates closed.
- 9-HF6 hard gates are closed PASS with deterministic evidence artifacts (`P9-HF6-T1`..`P9-HF6-T7`).
- Plan 9-2 is unblocked for follow-up hardening.
