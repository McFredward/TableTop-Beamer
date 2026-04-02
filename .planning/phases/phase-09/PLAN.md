# Phase 9 Plan (Replanned after critical P0 `/output/final` authority/staleness blocker)

## Baseline and Correction Context
- User correction remains binding: Plan 9-1 is executed but not accepted.
- Plan 9-HF1 remains completed foundation (monolith reduction + modular seams).
- Plan 9-HF2 remains completed baseline (lifecycle no-replay + low-end hardening).
- Plan 9-HF3 remains completed baseline (server stream + fallback + parity evidence).
- Plan 9-HF4 remains completed baseline (stream/control decoupling + black-stream closure).
- Plan 9-HF5 remains completed baseline (visual-only stream purity, no recurring overlays).
- Plan 9-HF6 remains completed baseline (command transport/apply/ack recovery under stream mode).
- Plan 9-HF7 is completed baseline and 9-2 is restored as immediate next step.

## New Critical P0 Blocker from Production Behavior (binding)
1. `/output/final` still exhibits fallback/stale behavior (new room animations are not reflected immediately).
2. `/output/final` must be true server-composed stream only; any client-render fallback path is disallowed.
3. Stream composition authority must stay server-side continuously and must not depend on subscriber count.
4. Any accepted mutation (start/stop/board/align/etc.) must update composed output immediately without refresh.
5. Stream producer must always compose from current full authoritative state; stale frame reuse is forbidden.

## Mandatory Objectives for 9-HF7 (hard requirements)
1. Remove client-render fallback for `/output/final` entirely (no auto/manual fallback path there).
2. Enforce always-authoritative, continuously composed server stream independent of subscriber count.
3. Guarantee immediate output update after every accepted authoritative mutation (start/stop/board/align/etc.).
4. Guarantee producer composes from current full state revision, not stale frame/cache snapshots.
5. Preserve deterministic, responsive control views while stream authority is made strict.

## Target State
Phase 9 remains on HF1/HF2/HF3/HF4/HF5/HF6 baselines and closes HF7 by enforcing strict authoritative streaming on `/output/final`: no client fallback, continuous server composition independent of subscribers, immediate mutation-to-output propagation from full current state, and deterministic control-view behavior.

## Scope (9-HF7)
- Remove `/output/final` client fallback code paths, toggles, and mode switches (`auto`/`client`) from active runtime behavior.
- Ensure stream producer lifecycle is always-on authoritative compose and does not pause/degrade due to zero or changing subscribers.
- Bind composed frame source to current authoritative full state revision for every mutation cycle.
- Ensure start/stop/board/align and related control mutations are reflected immediately in composed stream output.
- Preserve control-plane determinism and responsiveness while tightening stream authority guarantees.
- Add strict evidence matrix for no-fallback authority, stale-frame prevention, and mutation immediacy.

## Out of Scope
- New UX feature development unrelated to control-command reliability.
- Protocol redesign beyond targeted stream-authority/compose freshness correctness fixes.
- Reintroduction of diagnostic/text overlays into `/output/final` stream output.
- Reintroduction of any `/output/final` client-render fallback path.

## Prioritized Next Execution Wave (Plan 9-HF7, execute-ready, hard-gated)
1. Reproduce and trace stale/fallback behavior in `/output/final` under active mutation churn.
2. Remove all `/output/final` fallback code paths (auto/manual/client mode branches) from runtime path.
3. Enforce always-on server producer compose independent of subscriber count and subscriber lifecycle.
4. Bind producer compose to current authoritative full state revision (no stale frame/cache reuse path).
5. Validate immediate mutation-to-output propagation for start/stop/board/align and related commands.
6. Run strict multi-client control determinism regression while `/output/final` remains stream-only authoritative.
7. Verify HF5 visual-only purity and HF6 transport/apply/ack guarantees remain PASS.
8. Close wave only after full artifact synchronization + PASS.

## Milestones
1. M1 HF1-HF5 Baseline Lock: completed guarantees remain non-regression constraints.
2. M2 HF7 Fallback Elimination Closure: `/output/final` has no active client fallback path.
3. M3 HF7 Producer Authority Closure: producer compose remains active and authoritative independent of subscribers.
4. M4 HF7 Fresh-State Compose Closure: composed frames are generated from current full authoritative state revisions.
5. M5 HF7 Immediate Mutation Visibility Closure: accepted mutations are visible immediately on `/output/final`.
6. M6 HF7 Control Determinism Preservation: control views remain deterministic/responsive with stream-only final output.
7. M7 HF7 Evidence Closure: strict regression matrix PASS with synchronized artifacts.

## Regression/Evidence Matrix Policy (9-HF7)
- HF7-PreFix-Stale-Or-Fallback-Repro-Test: deterministic pre-fix evidence of stale/fallback behavior.
- No-Fallback-Path-Test: `/output/final` runs without auto/manual fallback branches or mode downgrade.
- Producer-Subscriber-Independence-Test: compose loop stays authoritative with 0/1/N subscribers and churn.
- Full-State-Revision-Compose-Test: each output frame references current authoritative full state revision.
- Immediate-Mutation-Visibility-Test: start/stop/board/align mutations appear immediately on `/output/final`.
- Multi-Client-Control-Determinism-Test: control views remain deterministic and responsive under strict stream-only output.
- HF6-Transport-Apply-Ack-Non-Regression-Test: command transport/apply/ack guarantees remain PASS.
- HF5-Stream-Purity-Non-Regression-Test: `/output/final` remains visual-only with no text/info/diagnostic overlays.
- Full-Workflow-Non-Regression-Test: align/sync invariants, persistence, and operator workflow remain stable.

## Definition of Done
- `/output/final` has no client-render fallback path in active runtime.
- Server stream producer remains continuously authoritative independent of subscriber count.
- Accepted mutations are immediately reflected in composed `/output/final` output without refresh.
- Producer composes from current full authoritative state (no stale frame path).
- Control views remain deterministic/responsive; HF6 transport/apply/ack behavior remains intact.
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
- Plan 9-HF7 is completed PASS with strict stream-only authority, stale-frame closure, and immediate mutation visibility on `/output/final` (`9-HF7-VERIFICATION.md`).
- Plan 9-2 is unblocked and ready after HF7 closure PASS.
