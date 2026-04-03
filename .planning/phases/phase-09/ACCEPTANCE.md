# Phase 9 Acceptance

## Acceptance Correction
- Binding correction: Plan 9-1 is not accepted.
- Plan 9-HF1, Plan 9-HF2, Plan 9-HF3, Plan 9-HF4, Plan 9-HF5, Plan 9-HF6, and Plan 9-HF7 are completed baselines.
- Binding clarification introduces Plan 9-HF8 as the active acceptance gate before Plan 9-2.

## Regression and Verification Strategy
- Video-authority-first: `/output/final` consumes canonical server-composed video stream only.
- Receiver-only-client-first: `/output/final` client has no polling and no animation/state orchestration runtime logic.
- Continuous-compose-first: server compositor runs continuously independent of subscriber count/churn.
- Fresh-state-first: composed output comes from current global authoritative full-state revisions (no stale frame reuse).
- Mutation-immediacy-first: accepted mutations are visible immediately on `/output/final` without refresh.
- Control-determinism-first: control views remain deterministic/responsive while receiver-only final page is enforced.
- Purity-preservation-first: HF5 visual-only stream contract and HF6 transport/apply/ack guarantees remain intact.

## Hard Gates (Plan 9-HF8, mandatory)
- G1 True-Server-Video-Endpoint-Gate: canonical server-composed video stream endpoint is the authority path for `/output/final`.
- G2 Receiver-Only-Client-Gate: `/output/final` has no polling and no animation/state orchestration runtime branch.
- G3 Fullscreen-Only-UI-Gate: `/output/final` renders fullscreen stream output only.
- G4 Compositor-Independence-Gate: compositor lifecycle remains active and authoritative with 0/1/N subscribers and churn.
- G5 Fresh-Full-State-Compose-Gate: composed output is derived from current global authoritative full state revisions.
- G6 Immediate-Mutation-Visibility-Gate: accepted start/stop/board/align mutations appear immediately on `/output/final`.
- G7 Control-Determinism-Gate: control views remain deterministic/responsive while final page is receiver-only.
- G8 HF6-Non-Regression-Gate: transport/apply/ack guarantees remain intact under HF8 changes.
- G9 Stream-Purity-Non-Regression-Gate: no text/info/diagnostic overlays reappear in `/output/final` stream output.
- G10 Strict-Regression-Gate: full matrix below is PASS with synchronized evidence.

## Strict Regression Matrix (Plan 9-HF8)
- True-Server-Video-Stream-Endpoint-Test: `/output/final` consumes canonical server-composed video stream endpoint.
- Receiver-Only-Client-Contract-Test: no polling and no animation/state orchestration code path is active on `/output/final`.
- Fullscreen-Stream-Only-UI-Test: final page displays stream fullscreen only.
- Compositor-Subscriber-Independence-Test: compose authority remains active under 0/1/N subscribers and churn.
- Full-State-Revision-Compose-Test: composed output tracks current authoritative full state revision without stale reuse.
- Immediate-Mutation-Visibility-Test: start/stop/board/align mutations appear immediately on `/output/final`.
- Multi-Client-Control-Determinism-Test: control effects remain deterministic across clients while final output is receiver-only.
- HF6-Transport-Apply-Ack-Non-Regression-Test: command transport/apply/ack behavior remains immediate and authoritative.
- Align-and-Sync-Parity-Test: align behavior and deterministic sync invariants stay unchanged.
- HF5-Visual-Only-Stream-Non-Regression-Test: no recurring overlays (`SERVER STREAM ACTIVE`, active animation list, diagnostics text) in stream output.

## Incremental Mandatory Gates
- After P9-HF8-T1..T3: server video endpoint + receiver-only client contract + fullscreen-only UI are complete.
- After P9-HF8-T4..T6: compositor always-on independence + fresh-state compose + immediate mutation visibility are PASS.
- After P9-HF8-T7: parity matrix PASS and HF5/HF6 non-regression PASS.
- After P9-HF8-T8: all phase/global planning artifacts are synchronized.

## Definition of Done
- `/output/final` is pure fullscreen video-stream receiver page only.
- `/output/final` contains no polling and no animation/state orchestration runtime logic.
- Server compositor composes continuously as authoritative source independent of subscriber count.
- Accepted mutations are visible on `/output/final` immediately without refresh.
- Composed output is generated from current global authoritative full state revisions.
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
- 9-HF8 is completed PASS with strict server-video authority, receiver-only `/output/final`, compositor independence, and immediate mutation visibility evidence (`P9-HF8-T7-PARITY-ACCEPTANCE-MATRIX.md`, `9-HF8-VERIFICATION.md`).
- Plan 9-2 is unblocked after 9-HF8 PASS.
