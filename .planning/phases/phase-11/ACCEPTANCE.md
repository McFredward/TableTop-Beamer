# Phase 11 Acceptance

## Verification Strategy
- Speed first: operators can chain room actions rapidly without reopening settings.
- Clarity first: active mode is always visible and explicit.
- Safety first: mode conflicts and inflight overlaps are deterministic.
- Mobile first: one-handed path is practical under live usage constraints.
- Non-regression first: sync/render/stop-clear behavior remains unchanged.

## Hard Gates (Plan 11-1, mandatory)
- G11-1 Settings-SubTab-IA-Gate: settings sub-tabs are logically grouped and navigable with stable tab state.
- G11-2 Quick-Activate-Gate: selected animation is applied correctly via sequential room taps/clicks.
- G11-3 Quick-Deactivate-Gate: selected animation is removed correctly via sequential room taps/clicks.
- G11-4 Quick-Clear-Gate: all animations are removed from tapped rooms in clear mode.
- G11-5 Mode-Conflict-Guard-Gate: rapid mode switching/inflight overlaps are deterministic and safe.
- G11-6 Feedback-Visibility-Gate: action success/failure/timeout is explicitly surfaced (status/toast), no silent no-op.
- G11-7 Mobile-OneHand-Gate: sticky action rail and tap ergonomics are usable one-handed in portrait/landscape.
- G11-8 Mobile-Board-Overview-Gate: board context remains visible/stable while operating quickly.
- G11-9 Sync-Determinism-NonRegression-Gate: ordering/version/idempotent apply remains PASS.
- G11-10 Render-Correctness-NonRegression-Gate: control/final parity remains PASS.
- G11-11 Stop-Clear-Safety-NonRegression-Gate: safety controls remain first-click deterministic.
- G11-12 Artifact-Sync-Gate: phase and global planning artifacts are fully synchronized.

## Strict Regression Matrix
- P11-Settings-SubTab-Navigation-Test
- P11-QuickMode-Activate-Sequential-Taps-Test
- P11-QuickMode-Deactivate-Sequential-Taps-Test
- P11-QuickMode-Clear-Sequential-Taps-Test
- P11-QuickMode-ModeSwitch-Conflict-Guard-Test
- P11-QuickMode-Feedback-Visibility-Test
- P11-Mobile-OneHand-ActionRail-Ergonomics-Test
- P11-Mobile-Board-Overview-Stability-Test
- P11-Sync-Determinism-NonRegression-Test
- P11-Render-Correctness-NonRegression-Test
- P11-Stop-Clear-Safety-NonRegression-Test

## Incremental Mandatory Gates
- After P11-T1..T2: settings IA sub-tabs are implemented and state retention is verified.
- After P11-T3..T6: quick modes operate correctly for activate/deactivate/clear sequential flows.
- After P11-T7..T8: mode conflict guards and explicit feedback are verified.
- After P11-T9..T10: mobile one-hand and board-overview gates are verified.
- After P11-T11..T12: full matrix PASS and artifact sync closure are complete.

## Definition of Done
- All hard gates G11-1..G11-12 are PASS.
- Quick modes are explicit, deterministic, and fast across desktop/mobile.
- Settings IA is measurably faster to navigate without losing edits.
- Mobile one-handed operation supports rapid live reactions.
- No regressions in sync determinism, render correctness, and safety stop/clear behavior.
- Phase and global trackers are fully synchronized.

## Plan 11-1 Evidence Reference
- Verification report: `.planning/phases/phase-11/11-1-VERIFICATION.md`
- Static regression artifact: `debug/p11-1-acceptance-regression-output.json`
