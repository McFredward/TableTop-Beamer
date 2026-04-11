# Phase 12 Acceptance

## Verification Strategy
- Root-cause first: the order-dependent occlusion is deterministically reproduced and isolated to a specific code path before any fix lands.
- Layering correctness first: concurrent room animations layer additively on the shared canvas regardless of type (coded/mp4/gif) or trigger order.
- Non-replacement guard first: starting a room animation never implicitly stops, unmounts, overwrites, or hides a still-running room animation.
- Non-regression first: loop-mode start/sustain/stop and explicit stop/clear authority remain fully intact across all three animation types.
- Evidence first: deterministic FAIL->PASS proof demonstrates order-invariance (A->B == B->A) and control-vs-final parity.

## Hard Gates (Plan 12-1, mandatory)
- G12-1 Order-Dependent-Occlusion-RED-Gate: deterministic RED repro is captured before any fix is applied.
- G12-2 Root-Cause-Isolation-Gate: exact file:line(s) causing the regression are documented with reasoning.
- G12-3 No-Implicit-Replace-Gate: room-scope start path does not stop/unmount/hide any running room animation; only natural end and explicit stop/clear can terminate.
- G12-4 Generic-Additive-Layering-Gate: coded/mp4/gif room animations compose additively in a single room with no type-specific replacement path.
- G12-5 Loop-Mode-NonRegression-Gate: loop start/sustain/stop remains unchanged across all three types.
- G12-6 Stop-Clear-Immediate-Authority-Gate: explicit stop and clear remain immediate, deterministic, and authoritative for mixed same-room one-shot + loop.
- G12-7 Order-Invariance-Gate: `A->B` and `B->A` trigger sequences yield identical stable visual composition while both animations overlap.
- G12-8 Control-Final-Parity-Gate: control-view and `/output/final` show equivalent layered output under the same trigger sequence.
- G12-9 Artifact-Sync-Gate: phase and global planning artifacts are fully synchronized.

## Strict Regression Matrix
- P12-RoomAnimation-OrderDependentOcclusion-RED-Test
- P12-RoomAnimation-StartPath-NoImplicitReplace-Test
- P12-RoomAnimation-AdditiveLayering-Coded-Test
- P12-RoomAnimation-AdditiveLayering-MP4-Test
- P12-RoomAnimation-AdditiveLayering-GIF-Test
- P12-RoomAnimation-MixedType-Layering-Test (coded + mp4 + gif within one room)
- P12-Loop-Mode-NonRegression-Test (per type)
- P12-Stop-Clear-Immediate-Authority-Test
- P12-OrderInvariance-A-B-vs-B-A-Test
- P12-ControlFinal-Parity-Test
- P12-MultiClient-Layering-FAIL-PASS-Test

## Incremental Mandatory Gates
- After P12-T1..T2: RED + root-cause isolation is PASS.
- After P12-T3..T4: no-implicit-replace + generic additive layering are PASS.
- After P12-T5..T6: loop and stop/clear non-regression are PASS.
- After P12-T7: order-invariance and control-vs-final parity are PASS.
- After P12-T8: artifact sync closure is complete.

## Definition of Done
- All hard gates G12-1..G12-9 are PASS.
- `alarm` and `malfunction` (and any equivalent pair) are simultaneously fully visible in the same room regardless of trigger order for the intersection of their durations.
- The layering contract is type-independent: coded, mp4, and gif animations compose identically without replacement side-effects.
- Loop-mode behavior and stop/clear authority remain non-regressed with explicit evidence.
- Deterministic order-invariance and control-vs-final parity are closed with PASS evidence.
- Phase and global trackers are fully synchronized.

## Plan 12-1 Evidence Reference (produced during execution)
- Verification report: `.planning/phases/phase-12/12-1-VERIFICATION.md`
- Static regression artifact: `debug/p12-1-acceptance-regression-output.json`
