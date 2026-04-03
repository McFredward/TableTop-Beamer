# Phase 10 Plan (Operator Speed UI/UX + P0 final-output blackout hotfix)

## Planning Mode Note
- Plan 10-HF1 is executed and PASS in this wave (root-cause + blackout hotfix + all-board evidence).
- Critical next priority is Plan 10-1 (speed UX wave).

## Critical Runtime Feedback (binding, P0)
1. `/output/final` turns fully black on board `Nemesis Lockdown A` (board using outside `sandstorm.mp4`).
2. On that board, neither room animations nor outside animations render on final output.
3. Other boards still render, so the regression is board-specific and final-output-path specific.

## Mandatory Goals (binding)
1. Add more sub-tabs inside Settings, grouped logically for faster navigation.
2. Add quick activation mode: pick one animation once, then apply it rapidly by sequential room taps/clicks.
3. Add quick deactivation mode: pick one animation once, then remove it from rooms via sequential room taps/clicks.
4. Add general clear mode: remove all animations from each clicked room.
5. Improve overview and one-handed operation on mobile for rapid gameplay reaction.

## Target State
Phase 10 now closes with two mandatory outcomes: (1) `/output/final` never drops into board-specific black-screen render starvation (including mp4 outside-background boards), while room + outside animations remain concurrently visible and sync-deterministic; (2) speed-first operator UX lands with segmented Settings sub-tabs and quick activate/deactivate/clear flows for one-handed rapid operation.

## Binding Product Decisions
- Board-specific final-render path must remain deterministic and non-blocking: no board may disable final composition due to outside-background media type (`mp4`/`gif`/`coded`) or clip-path edge cases.
- Final output keeps a single active composition contract for all boards: outside layer, room layer, and effect overlays share one guarded render lifecycle and cannot early-return to black frame fallback.
- Outside mp4 decode/readiness guards must fail open (skip frame and continue pipeline) rather than fail closed (abort/black canvas).
- Room + outside co-rendering parity on `/output/final` is mandatory for every selected board.
- Existing sync contract and control semantics stay unchanged (ordering/version/idempotent apply, stop/clear/global controls).
- Speed actions are explicit mode tools (`activate`, `deactivate`, `clear`) with always-visible active mode state and a one-tap mode exit.
- Sequential room operations are idempotent and deterministic: repeated taps do not create duplicate running entries or stale stop loops.
- Room click remains canonical selection input; quick-mode actions are built on top of existing room hit-testing, not a parallel input model.
- Mobile-first control strip is always reachable with thumb in portrait and landscape, with sticky placement and large tap targets.
- Settings information architecture is split into operator-meaningful sub-tabs to reduce scan time and accidental cross-section edits.
- Existing stop/clear-all/global sync semantics remain unchanged unless explicitly documented in this phase.

## Scope (Phase 10)
- Reproduce and root-cause board-specific final-output blackout on `Nemesis Lockdown A` with outside `sandstorm.mp4`.
- Fix final-output render lifecycle so board selection cannot deactivate full composition path.
- Guarantee concurrent room + outside animation rendering on `/output/final` for all boards and outside media types.
- Preserve sync determinism and existing operator controls while fixing the blackout.
- Add cross-board regression evidence for final-output board parity (including mp4 outside-background boards).
- Design and implement Settings sub-tab structure with logical grouping and fast tab switching.
- Implement Quick Activation Mode for sequential room apply of selected room animation draft.
- Implement Quick Deactivation Mode for sequential room stop/remove of one selected animation type.
- Implement Quick Clear Mode for sequential room clear-all actions.
- Add mobile speed controls for overview + one-handed operation.
- Add deterministic visual feedback for mode status, action success/failure, and conflict guards.
- Add regression and performance evidence focused on rapid repeated room operations.

## Out of Scope
- New visual effects unrelated to blackout root-cause remediation.
- Behavior redesign of existing stop/clear/global controls.
- New animation rendering engines or media format expansions.
- New server protocol family or non-essential API redesign.
- Full visual redesign of non-speed-related dashboards.
- Board/model schema migration unrelated to speed-mode ownership.

## Prioritized Next Execution Wave (Plan 10-HF1, execute-ready, hard-gated)
1. Reproduce and lock root cause for board-specific `/output/final` blackout on `Nemesis Lockdown A` with outside `sandstorm.mp4`.
2. Implement render-lifecycle fix so final composition path cannot be short-circuited by board/media-specific outside state.
3. Enforce all-board render contract: room + outside animations always co-render on `/output/final` when active.
4. Validate sync/control non-regression (ordering/version/idempotent apply, stop/clear/global behaviors unchanged).
5. Run full board matrix regression, explicitly including mp4 outside-background boards and non-mp4 boards.
6. Close only after PASS evidence and synchronized planning artifacts.

## HF1 Root-Cause Analysis Focus (execute baseline)
- Validate whether board-specific outside-definition resolution for `Nemesis Lockdown A` yields an invalid/empty outside render source that currently triggers fail-closed black fallback.
- Validate whether outside mp4 readiness/error state is currently coupled to compositor-level early-return instead of per-layer skip semantics.
- Validate whether board clip/mask guards for this board incorrectly mark the full frame as non-renderable and suppress both room/outside layers.
- Validate whether final-output stage lifecycle (`resize`/board-switch/media-start) can leave compositor in stale black-only frame state for this board.
- Root cause is considered locked only when one deterministic failure chain is reproduced with trace evidence and a mapped fix location.

## Prioritized Next Execution Wave (Plan 10-1, execute-ready)
1. Define IA map for Settings sub-tabs and migrate existing controls into stable grouped sections.
2. Implement speed-mode state machine (`off`/`activate`/`deactivate`/`clear`) with explicit lifecycle guards.
3. Build Quick Activation flow with selected animation lock and multi-room sequential apply.
4. Build Quick Deactivation flow with selected animation lock and multi-room sequential removal.
5. Build Quick Clear flow with per-room clear-all on room tap/click.
6. Add mobile sticky action rail and one-handed ergonomics (tap size, reachable placement, reduced mode-switch friction).
7. Add observability + regression matrix for burst room taps on desktop/mobile, including sync/idempotency checks.
8. Close only after PASS evidence and artifact synchronization.

## Milestones
1. M0 HF1 Root-Cause Closure: board-specific blackout path is reproduced and bounded.
2. M0 HF1 Final-Render Recovery: `/output/final` composition stays active for all boards including mp4 outside-background boards.
3. M0 HF1 Co-Render Parity: room + outside animations both render on final output for every board.
4. M0 HF1 Non-Regression Closure: sync semantics and existing controls remain unchanged with PASS matrix.
5. M1 Settings IA Closure: sub-tabs are grouped, navigable, and scan-efficient.
6. M2 Quick Mode Core: shared mode state machine + status UI is deterministic.
7. M3 Activation Flow Closure: one-select-many-rooms activation works in rapid sequence.
8. M4 Deactivation Flow Closure: one-select-many-rooms deactivation works in rapid sequence.
9. M5 Clear Flow Closure: per-room clear mode is fast and safe.
10. M6 Mobile Speed Closure: one-handed operation and viewport overview are improved for gameplay reaction.
11. M7 Evidence Closure: desktop/mobile rapid-operation matrix PASS with non-regression for existing semantics.

## Regression/Evidence Matrix Policy
- HF1-Blackout-Repro-Test: deterministic repro of black `/output/final` on `Nemesis Lockdown A` with outside `sandstorm.mp4`, with trace showing where render path is short-circuited.
- HF1-All-Board-Final-Render-Test: every board preserves active final composition path (no board-specific black fallback).
- HF1-Room-Outside-CoRender-Test: room and outside animations render concurrently on `/output/final` across all boards/media types.
- HF1-MP4-Outside-Board-Test: mp4 outside-background boards keep final-output rendering live under start/stop/edit/restart cycles.
- HF1-Control-NonRegression-Test: stop/clear-all/global controls and existing sync semantics remain unchanged.
- HF1-Sync-Determinism-Test: ordering/version/idempotent apply remains stable during blackout-fix scenarios.
- Mode-State-Integrity Test: mode transitions are explicit, visible, and recoverable (`Esc`/cancel/switch tab).
- Rapid-Sequence-Activation Test: same animation can be applied to many rooms via successive taps without draft drift.
- Rapid-Sequence-Deactivation Test: selected animation removal from many rooms is deterministic and idempotent.
- Rapid-Sequence-Clear Test: clear mode removes all room animations from clicked rooms with no cross-room leakage.
- Conflict-Guard Test: mode switch during inflight action cannot produce duplicate or orphan running entries.
- Mobile-One-Hand Test: core actions reachable and usable in portrait/landscape with thumb-only flow.
- Sync-Determinism Test: ordering/version/idempotent apply remains stable under burst room interactions.
- Non-Regression Test: stop/clear-all/global triggers and `/output/final` behavior remain intact.

## Definition of Done
- Board-specific blackout root cause is documented and fixed for `/output/final`.
- Final output composition path remains active for all boards, including mp4 outside-background boards.
- Room + outside animations both render on final output for every supported board.
- Sync behavior and existing controls are unchanged and verified PASS.
- Cross-board regression evidence is documented with explicit mp4-board coverage.
- Settings has logical sub-tabs that reduce operator scan and navigation time.
- Quick Activation mode supports one-animation sequential room apply flow.
- Quick Deactivation mode supports one-animation sequential room removal flow.
- Quick Clear mode supports sequential per-room clear-all flow.
- Mobile operation is improved for overview and one-handed rapid reaction.
- Deterministic sync, stop semantics, and non-regression matrix are PASS with evidence.
- Phase-10 and global planning artifacts are synchronized.
