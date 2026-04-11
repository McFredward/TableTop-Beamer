# Phase 12 Plan (Plan 12-1: Concurrent Room Animation Layering)

## Planning Mode Note
- Phase 11 closed PASS at 11-HF6.
- Phase 12 opens with Plan 12-1 as the execute-ready priority wave.

## Mandatory Objectives (binding)
1. Multiple room animations triggered in the same room must all remain fully visible until each reaches its natural end or is terminated by an explicit `stop`/`clear`.
2. Trigger order must not affect the visible result: sequences `A -> B` and `B -> A` with both running concurrently must produce the identical stable visual composition.
3. The layering contract must be generic across all animation types (`coded`, `mp4`, `gif`) — no type-specific replacement or occlusion paths.
4. Starting a new room animation must never implicitly unmount/cancel/overwrite a still-running room animation of the same room (or any other room).
5. Loop-mode, global-trigger pipeline, stop/clear semantics, and `/output/final` parity must remain non-regressed.
6. Produce deterministic FAIL->PASS evidence for order-invariance across control-view and `/output/final`.

## Target State
Phase 12 exits when the room-animation runtime composes an arbitrary set of concurrently running animations in any single room as an additive, order-independent layered visual output, with no implicit replacement on start, uniform lifecycle handling for coded/mp4/gif, and proven non-regression for loop-mode, stop/clear, and `/output/final` parity.

## Binding Product Decisions
- A room can hold an unbounded (within runtime safety caps) number of concurrent running animations, identified by independent animation instance IDs.
- The render loop composes all currently-running room animations of a given room additively onto the shared canvas with stable z-ordering that does NOT make earlier animations invisible.
- The start path for a new room animation MUST NOT call `stopAnimation` / unmount / overwrite an existing animation in the same room as a side-effect. The only implicit termination is `pruneFinishedAnimations` on natural duration end.
- If a same-type animation is re-triggered while one is still running, both run as independent instances; there is no "upsert by type" for room scope.
- Loop-mode animations and one-shot animations follow the same layering rule: starting a new animation never cancels a running one.
- Global-scope animations retain their existing authoritative semantics; Phase 12 changes apply to room-scope only unless evidence shows global-scope also has the same class of defect.

## Scope (Plan 12-1, execute-ready)
- Reproduce the order-dependent occlusion deterministically (RED repro).
- Isolate root-cause: which code path unmounts/hides the earlier room animation when a later one starts? Candidates: implicit `stopAnimation` upsert in start path, draft edit-target overwrite, coalescing/render budget skipping, z-ordering, canvas clip region, or type-specific replacement.
- Implement a generic, type-independent layering contract for room animations (coded/mp4/gif).
- Remove any implicit start-time replacement for room-scope animations.
- Preserve global-scope contract unchanged.
- Preserve loop/stop/clear semantics unchanged with explicit regression evidence.
- Add deterministic tests for order invariance (A->B and B->A produce identical stable composition).
- Capture FAIL->PASS evidence on control-view and `/output/final`.
- Synchronize all phase and global planning artifacts.

## Out of Scope
- New animation content packs or new animation types.
- UX redesign for room-animation controls beyond what is required to expose multiple running instances.
- Global-scope animation semantics (unless investigation proves the same root-cause applies).
- Protocol/transport redesign beyond runtime lifecycle correctness.

## Prioritized Next Execution Wave (Plan 12-1, execute-ready)
1. P12-T1 [P0] Build deterministic RED repro showing `alarm` hidden after `malfunction -> alarm` sequence vs both visible after `alarm -> malfunction`.
2. P12-T2 [P0] Isolate root-cause (implicit replacement, coalescing, z-order, clip, or type-specific path) in `runtime-orchestration.js` start/draw paths.
3. P12-T3 [P0] Remove implicit start-time replacement for room-scope animations and enforce "start adds, never replaces".
4. P12-T4 [P0] Implement/verify generic additive layering on the shared canvas for coded, mp4, and gif within a single room.
5. P12-T5 [P0] Execute loop-mode non-regression matrix.
6. P12-T6 [P0] Execute explicit stop/clear non-regression matrix (including mixed same-room one-shot + loop).
7. P12-T7 [P0] Add deterministic order-invariance tests (A->B vs B->A) across control-view and `/output/final`.
8. P12-T8 [P0] Capture explicit FAIL->PASS evidence and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Milestones
1. M1 Order-Dependent Occlusion Root-Cause Isolation.
2. M2 Generic Additive Layering Contract Closure (coded/mp4/gif unified).
3. M3 Start-Path No-Implicit-Replace Guard Closure.
4. M4 Loop/Stop/Clear Non-Regression Closure.
5. M5 Order-Invariance Deterministic Evidence Closure.
6. M6 Control-View + `/output/final` Parity Closure.
7. M7 Artifact Sync Closure.

## Regression/Evidence Matrix Policy
- P12-RoomAnimation-OrderDependentOcclusion-RED-Test
- P12-RoomAnimation-RootCause-Isolation-Report
- P12-RoomAnimation-StartPath-NoImplicitReplace-Test
- P12-RoomAnimation-AdditiveLayering-Coded-Test
- P12-RoomAnimation-AdditiveLayering-MP4-Test
- P12-RoomAnimation-AdditiveLayering-GIF-Test
- P12-RoomAnimation-MixedType-Layering-Test
- P12-Loop-Mode-NonRegression-Test
- P12-Stop-Clear-Immediate-Authority-Test
- P12-OrderInvariance-A-B-vs-B-A-Test
- P12-ControlFinal-Parity-Test
- P12-MultiClient-Layering-FAIL-PASS-Test

## Definition of Done
- Starting a new room animation never hides a still-running room animation.
- `alarm` + `malfunction` (and any equivalent pair) are both fully visible regardless of trigger order while both are within their configured duration.
- The layering rule holds identically for coded, mp4, and gif animation types.
- Loop-mode and stop/clear semantics remain non-regressed with explicit PASS evidence.
- Deterministic A->B vs B->A order-invariance proof is PASS on control-view and `/output/final`.
- Phase and global planning trackers are fully synchronized.
