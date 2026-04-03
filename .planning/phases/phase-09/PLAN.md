# Phase 9 Plan (Replanned after HF8 follow-up gate failure)

## Baseline and Correction Context
- User correction remains binding: Plan 9-1 is executed but not accepted.
- Plan 9-HF1 remains completed foundation (monolith reduction + modular seams).
- Plan 9-HF2 remains completed baseline (lifecycle no-replay + low-end hardening).
- Plan 9-HF3 remains completed baseline (initial server stream rollout).
- Plan 9-HF4 remains completed baseline (stream/control decoupling + black-stream closure).
- Plan 9-HF5 remains completed baseline (visual-only stream purity).
- Plan 9-HF6 remains completed baseline (command transport/apply/ack recovery).
- Plan 9-HF7 remains completed baseline.
- Plan 9-HF8 delivered the stream-authority pivot baseline, but follow-up verification reported one blocking gate failure (`compositorAlwaysOn=false`).
- Plan 9-2 is re-blocked until a dedicated P0 closure wave resolves the lifecycle gate and re-closes full parity.

## Critical Clarification (binding, implement exactly)
1. `/output/final` must be a pure video-stream receiver page only.
2. `/output/final` client must have no polling and no animation/state runtime orchestration logic.
3. Server must continuously compose the final output from global authoritative state and stream as video.
4. Stream composition lifecycle must run regardless of subscriber presence.
5. `/output/final` UI must be fullscreen stream display only.
6. Accepted state mutations must appear immediately without browser refresh.
7. HF8 follow-up blocker is explicit: `compositorAlwaysOn` must be true under all normal startup/runtime sequences.

## Mandatory Objectives for 9-HF9 (P0 blocker closure wave)
1. Fix always-on compositor lifecycle so `compositorAlwaysOn=true` under all normal startup/runtime sequences.
2. Re-run and close the full parity/acceptance matrix with no partial pass state.
3. Preserve unchanged guarantees: `/output/final` remains stream-only receiver, fullscreen-only, and no-polling/no-orchestration.
4. Refresh evidence artifacts with PASS outputs and synchronized planning/global trackers.

## Target State
Phase 9 closes HF9 by proving the HF8 architecture pivot is lifecycle-stable: `/output/final` stays strict receiver-only, server compositor is truly always-on in practice, parity matrix is fully PASS, and evidence is refreshed consistently.

## Scope (9-HF9)
- Harden compositor startup/runtime lifecycle transitions that can currently report `compositorAlwaysOn=false`.
- Verify always-on behavior across normal boot, zero-subscriber idle, first subscriber attach, churn, and reconnect sequences.
- Preserve strict receiver-only `/output/final` page contract (no polling, no client orchestration).
- Re-run parity and non-regression matrix (HF5/HF6 baselines included) and require full PASS.
- Regenerate evidence artifacts and synchronize all planning/global tracking files in one closure step.

## Out of Scope
- New feature work unrelated to final-output authority path correctness.
- Protocol redesign beyond targeted compositor lifecycle closure and parity evidence refresh.
- Reintroduction of `/output/final` client-render fallback, polling, or orchestration branches.

## Prioritized Next Execution Wave (Plan 9-HF9, execute-ready, hard-gated)
1. Reproduce and isolate the `compositorAlwaysOn=false` lifecycle failure path with deterministic trace evidence.
2. Fix compositor lifecycle so health/reporting and real runtime behavior stay always-on across normal startup/runtime sequences.
3. Re-validate strict stream-only `/output/final` receiver contract (no polling/no orchestration regressions).
4. Execute full parity/acceptance matrix with explicit `compositorAlwaysOn=true` PASS gate.
5. Re-run HF5/HF6 non-regression matrix under HF9 changes.
6. Close wave only after PASS evidence refresh and full artifact synchronization.

## Milestones
1. M1 HF1-HF7 Baseline Lock: previously completed guarantees remain non-regression constraints.
2. M2 HF8 Stream Endpoint Closure: canonical server-composed video stream endpoint is authoritative.
3. M3 HF8 Receiver-Only Client Closure: `/output/final` is fullscreen player-only with no runtime orchestration/polling.
4. M4 HF8 Continuous Compositor Closure: compositor lifecycle remains active with 0/1/N subscribers.
5. M5 HF8 Mutation Latency Closure: accepted mutations appear immediately on streamed output.
6. M6 HF8 Parity/Acceptance Closure: full matrix PASS with synchronized phase/global artifacts.
7. M7 HF9 Always-On Lifecycle Closure: `compositorAlwaysOn` gate is PASS across normal startup/runtime sequences.
8. M8 HF9 Definitive Evidence Refresh: parity matrix and non-regression artifacts are reissued as full PASS.

## Regression/Evidence Matrix Policy (9-HF9)
- True-Server-Video-Stream-Endpoint-Test: `/output/final` consumes canonical server-composed video stream.
- Final-Client-Receiver-Only-Test: client has no polling and no animation/state orchestration runtime path.
- Fullscreen-Only-Output-Test: final page renders fullscreen stream only.
- Compositor-Always-On-Subscriber-Independence-Test: compose loop remains active with 0/1/N subscribers and churn and reports `compositorAlwaysOn=true`.
- Authoritative-Full-State-Compose-Test: composed output tracks latest global authoritative state revision.
- Mutation-To-Stream-Latency-Gate-Test: start/stop/board/align accepted mutations become visible immediately.
- Multi-Client-Control-Determinism-Test: control clients remain deterministic/responsive with receiver-only final page.
- HF6-Transport-Apply-Ack-Non-Regression-Test: command transport/apply/ack guarantees remain PASS.
- HF5-Visual-Only-Stream-Non-Regression-Test: no text/info/diagnostic overlays re-enter stream output.

## Definition of Done
- `/output/final` is pure receiver-only fullscreen stream player.
- `/output/final` has no polling and no animation/state orchestration logic in active runtime.
- Server compositor continuously composes authoritative output independent of subscribers and health gate reports `compositorAlwaysOn=true`.
- Accepted mutations are immediately visible on stream output without browser refresh.
- Compose source is current global authoritative full state revision (no stale frame path).
- Control determinism, HF6 transport/apply/ack, and HF5 stream purity remain PASS.
- Hard regression matrix is PASS and phase/global planning artifacts are synchronized.

## Execution Update

- Plan 9-1 remains documented but not accepted.
- Plan 9-HF1 through Plan 9-HF7 remain completed baselines with existing evidence.
- Plan 9-HF8 stream-path closure remains baseline, but follow-up verification found one blocking gate failure: `compositorAlwaysOn=false`.
- Plan 9-HF9 completed PASS and closed the blocking lifecycle gate with refreshed parity/non-regression evidence (`9-HF9-VERIFICATION.md`).
- Plan 9-2 is unblocked after HF9 full PASS closure.
