# Phase 9 Acceptance

## Acceptance Correction
- Binding correction: Plan 9-1 is not accepted.
- Plan 9-HF1, Plan 9-HF2, Plan 9-HF3, Plan 9-HF4, Plan 9-HF5, and Plan 9-HF6 are completed baselines.
- Plan 9-HF7 closure target is completed PASS with hard gates satisfied.

## Regression and Verification Strategy
- Authority-first: `/output/final` is server-composed stream-only; client render fallback paths are not allowed.
- Continuous-compose-first: server producer remains authoritative independent of subscriber count/churn.
- Fresh-state-first: composed output must come from current full authoritative state revisions (no stale frame reuse).
- Mutation-immediacy-first: accepted mutations must be visible on `/output/final` immediately without refresh.
- Control-determinism-first: control views remain deterministic and responsive while stream-only authority is enforced.
- Purity-preservation-first: HF5 visual-only stream contract must remain intact.
- Evidence-first: every P0 HF7 item requires reproducible pre-fix and post-fix evidence.

## Hard Gates (Plan 9-HF7, mandatory)
- G1 Repro-and-Fix-Gate: stale/fallback `/output/final` behavior is reproducibly demonstrated pre-fix and closed post-fix.
- G2 No-Fallback-Gate: `/output/final` has no active auto/manual client fallback runtime path.
- G3 Producer-Independence-Gate: server compose remains authoritative with 0/1/N subscribers and churn.
- G4 Fresh-Full-State-Compose-Gate: composed frames are derived from current full authoritative state revisions.
- G5 Immediate-Mutation-Visibility-Gate: accepted start/stop/board/align mutations appear immediately on `/output/final`.
- G6 Control-Determinism-Gate: control views remain deterministic/responsive while `/output/final` stays stream-only.
- G7 HF6-Non-Regression-Gate: transport/apply/ack guarantees remain intact under HF7 changes.
- G8 Deterministic-Contract-Gate: ordering/version/idempotent apply and align semantics remain unchanged.
- G9 Stream-Purity-Non-Regression-Gate: no text/info/diagnostic overlays reappear in `/output/final` stream frames.
- G10 Strict-Regression-Gate: full matrix below is PASS with synchronized evidence.

## Strict Regression Matrix (Plan 9-HF7)
- HF7-PreFix-Stale-Or-Fallback-Repro-Test: deterministic evidence of stale/fallback output before fix.
- No-Fallback-Path-Test: `/output/final` does not degrade to client-render path (auto/manual).
- Producer-Subscriber-Independence-Test: compose authority remains stable under 0/1/N subscribers and churn.
- Full-State-Revision-Compose-Test: composed frames track current authoritative state revision without stale reuse.
- Immediate-Mutation-Visibility-Test: start/stop/board/align mutations appear immediately on `/output/final`.
- Multi-Client-Control-Determinism-Test: control action effects remain deterministic across clients while final output is stream-only.
- HF6-Transport-Apply-Ack-Non-Regression-Test: command transport/apply/ack behavior remains immediate and authoritative.
- Align-and-Sync-Parity-Test: align behavior and deterministic sync invariants stay unchanged.
- HF5-Visual-Only-Stream-Non-Regression-Test: no recurring overlays (`SERVER STREAM ACTIVE`, active animation list, diagnostics text) in stream output.
- Full-Workflow-Non-Regression-Test: operator workflow, persistence, and API command flow remain equivalent.

## Incremental Mandatory Gates
- After P9-HF7-T1..T2: deterministic stale/fallback repro closure and fallback-path removal are complete.
- After P9-HF7-T3..T5: producer authority + full-state compose + immediate mutation visibility are PASS.
- After P9-HF7-T6..T7: control determinism PASS and HF5/HF6 non-regression PASS.
- After P9-HF7-T8: all phase/global planning artifacts are synchronized.

## Definition of Done
- `/output/final` runs as server-composed stream-only output with no client fallback path.
- Server producer composes continuously as authoritative source independent of subscriber count.
- Accepted mutations are visible on `/output/final` immediately without refresh.
- Composed frames are generated from current full authoritative state revisions.
- Control views remain deterministic/responsive and HF6 transport/apply/ack behavior remains intact.
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
- 9-HF7 is completed PASS for strict stream-only authority and stale-frame elimination on `/output/final` (`9-HF7-VERIFICATION.md`).
- Plan 9-2 is unblocked after 9-HF7 PASS.
