# Phase 9 Plan (Replanned after binding architecture pivot for `/output/final`)

## Baseline and Correction Context
- User correction remains binding: Plan 9-1 is executed but not accepted.
- Plan 9-HF1 remains completed foundation (monolith reduction + modular seams).
- Plan 9-HF2 remains completed baseline (lifecycle no-replay + low-end hardening).
- Plan 9-HF3 remains completed baseline (initial server stream rollout).
- Plan 9-HF4 remains completed baseline (stream/control decoupling + black-stream closure).
- Plan 9-HF5 remains completed baseline (visual-only stream purity).
- Plan 9-HF6 remains completed baseline (command transport/apply/ack recovery).
- Plan 9-HF7 remains completed baseline, but a new clarified P0 architecture pivot is now binding before 9-2.

## Critical Clarification (binding, implement exactly)
1. `/output/final` must be a pure video-stream receiver page only.
2. `/output/final` client must have no polling and no animation/state runtime orchestration logic.
3. Server must continuously compose the final output from global authoritative state and stream as video.
4. Stream composition lifecycle must run regardless of subscriber presence.
5. `/output/final` UI must be fullscreen stream display only.
6. Accepted state mutations must appear immediately without browser refresh.

## Mandatory Objectives for 9-HF8 (architecture pivot wave)
1. Deliver a true server-side composed video stream endpoint as the only final-output source.
2. Reduce `/output/final` to a minimal player-only client with zero runtime orchestration/polling branches.
3. Enforce continuous compositor lifecycle independent of subscriber count (0/1/N always-on behavior).
4. Gate mutation-to-stream latency so accepted mutations are visible immediately.
5. Close with parity and acceptance regression matrix proving no fallback/no stale/no refresh requirements.

## Target State
Phase 9 closes HF8 by pivoting `/output/final` to strict receiver-only behavior: server-side always-on compositor produces the authoritative video stream continuously, client only plays fullscreen stream, and accepted mutations are visible immediately without refresh.

## Scope (9-HF8)
- Implement/verify one canonical server-composed video stream endpoint for final output delivery.
- Remove active `/output/final` client polling, animation loop, and state orchestration code paths from runtime.
- Keep server compositor alive continuously independent of subscriber lifecycle and churn.
- Ensure compose source always uses current global authoritative state revisions.
- Enforce immediate mutation visibility for start/stop/board/align and related commands.
- Validate parity and regression coverage across control determinism, stream purity, and sync invariants.

## Out of Scope
- New feature work unrelated to final-output authority path correctness.
- Protocol redesign beyond targeted server-compositor and receiver-only client pivot.
- Reintroduction of `/output/final` client-render fallback, polling, or orchestration branches.

## Prioritized Next Execution Wave (Plan 9-HF8, execute-ready, hard-gated)
1. Build/lock true server-side composed video stream endpoint contract for `/output/final`.
2. Strip `/output/final` to minimal fullscreen player-only receiver (no polling/orchestration branch).
3. Enforce continuous server compositor lifecycle independent of subscribers.
4. Add and enforce mutation->stream update latency gates for accepted mutations.
5. Run strict parity/acceptance regression matrix for authority, freshness, determinism, and purity.
6. Close wave only after full artifact synchronization + PASS.

## Milestones
1. M1 HF1-HF7 Baseline Lock: previously completed guarantees remain non-regression constraints.
2. M2 HF8 Stream Endpoint Closure: canonical server-composed video stream endpoint is authoritative.
3. M3 HF8 Receiver-Only Client Closure: `/output/final` is fullscreen player-only with no runtime orchestration/polling.
4. M4 HF8 Continuous Compositor Closure: compositor lifecycle remains active with 0/1/N subscribers.
5. M5 HF8 Mutation Latency Closure: accepted mutations appear immediately on streamed output.
6. M6 HF8 Parity/Acceptance Closure: full matrix PASS with synchronized phase/global artifacts.

## Regression/Evidence Matrix Policy (9-HF8)
- True-Server-Video-Stream-Endpoint-Test: `/output/final` consumes canonical server-composed video stream.
- Final-Client-Receiver-Only-Test: client has no polling and no animation/state orchestration runtime path.
- Fullscreen-Only-Output-Test: final page renders fullscreen stream only.
- Compositor-Always-On-Subscriber-Independence-Test: compose loop remains active with 0/1/N subscribers and churn.
- Authoritative-Full-State-Compose-Test: composed output tracks latest global authoritative state revision.
- Mutation-To-Stream-Latency-Gate-Test: start/stop/board/align accepted mutations become visible immediately.
- Multi-Client-Control-Determinism-Test: control clients remain deterministic/responsive with receiver-only final page.
- HF6-Transport-Apply-Ack-Non-Regression-Test: command transport/apply/ack guarantees remain PASS.
- HF5-Visual-Only-Stream-Non-Regression-Test: no text/info/diagnostic overlays re-enter stream output.

## Definition of Done
- `/output/final` is pure receiver-only fullscreen stream player.
- `/output/final` has no polling and no animation/state orchestration logic in active runtime.
- Server compositor continuously composes authoritative output independent of subscribers.
- Accepted mutations are immediately visible on stream output without browser refresh.
- Compose source is current global authoritative full state revision (no stale frame path).
- Control determinism, HF6 transport/apply/ack, and HF5 stream purity remain PASS.
- Hard regression matrix is PASS and phase/global planning artifacts are synchronized.

## Execution Update

- Plan 9-1 remains documented but not accepted.
- Plan 9-HF1 through Plan 9-HF7 remain completed baselines with existing evidence.
- Plan 9-HF8 is completed PASS with canonical server-video endpoint and receiver-only `/output/final` closure.
- Plan 9-2 is unblocked after HF8 closure PASS.
