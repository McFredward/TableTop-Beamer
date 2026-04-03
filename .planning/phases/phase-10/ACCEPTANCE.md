# Phase 10 Acceptance

## Planning Mode Note
- This file defines execute gates only; no implementation is executed yet.

## Verification Strategy
- Final-output continuity first: no board-specific black-screen path is allowed on `/output/final`.
- Board parity first: outside-media type or board selection must not disable final composition.
- Speed-first usability: operators perform repeated room actions with fewer steps and lower context switching.
- Determinism-first runtime: rapid taps and mode switches remain idempotent and sync-safe.
- Mobile-first practicality: one-handed operation is feasible under real gameplay tempo.
- Safety-first controls: quick modes are explicit and reversible; no hidden destructive path.

## Hard Gates (Plan 10-HF1, mandatory before 10-1)
- H1 Blackout-Root-Cause-Gate: board-specific blackout on `Nemesis Lockdown A` is reproduced and root cause is explicitly documented.
- H2 Final-Render-Path-Gate: `/output/final` render composition path remains active for all boards (including mp4 outside-background boards).
- H3 Room-Outside-CoRender-Gate: room and outside animations both render on final output whenever both are active.
- H4 Sync-Control-NonRegression-Gate: ordering/version/idempotent apply and existing stop/clear/global controls remain unchanged.
- H5 All-Board-Regression-Gate: regression matrix PASS covers all boards with explicit mp4 outside-background evidence.

### HF1 Gate Status (execution)
- H1 PASS (`P10-HF1-T1-REPRO-TRACE.md`)
- H2 PASS (clip fail-open compositor guard in `src/app/runtime/runtime-orchestration.js`)
- H3 PASS (`P10-HF1-T3-CO-RENDER-CONTRACT.md`)
- H4 PASS (`P10-HF1-T4-SYNC-CONTROL-NON-REGRESSION.md`)
- H5 PASS (`P10-HF1-T5-ALL-BOARD-REGRESSION.md`, `debug/p10-hf1-all-board-final-render-regression-output.json`)

## Hard Gates (Plan 10-1, mandatory)
- G1 Settings-SubTab-IA-Gate: Settings are split into logical sub-tabs with stable navigation and state retention.
- G2 Quick-Activation-Gate: one selected animation can be applied to multiple rooms via sequential taps/clicks without draft drift.
- G3 Quick-Deactivation-Gate: one selected animation can be removed from multiple rooms via sequential taps/clicks deterministically.
- G4 Quick-Clear-Gate: clear mode removes all animations from each tapped room with no cross-room side effects.
- G5 Mobile-One-Hand-Gate: key rapid actions are reachable and usable one-handed on common phone viewport sizes.
- G6 Sync-Integrity-Gate: ordering/version/idempotent apply remains stable under burst quick-mode usage.
- G7 Non-Regression-Gate: stop/clear-all/global flows and `/output/final` behavior remain unchanged.

## Strict Regression Matrix
- HF1-Blackout-Reproduction-Test: deterministic reproduction trace for black `/output/final` on `Nemesis Lockdown A` + outside `sandstorm.mp4`.
- HF1-All-Boards-Render-Continuity-Test: no board can force final output into persistent black frame.
- HF1-CoRender-Parity-Test: room + outside concurrent rendering remains visible for all boards/media types.
- HF1-MP4-Outside-Board-Regression-Test: mp4 outside-background boards pass start/stop/restart/edit cycles on final output.
- HF1-Control-Sync-NonRegression-Test: stop outside/clear all/global toggles + sync invariants remain deterministic.
- Settings-Nav-Stability-Test: tab switch preserves unsaved draft context where expected; no control remount drift.
- Activation-Sequence-Burst-Test: repeated room taps apply selected animation once per room (no duplicate runtime entries).
- Deactivation-Sequence-Burst-Test: repeated room taps remove selected animation deterministically even under rapid cadence.
- Clear-Sequence-Burst-Test: per-room clear mode removes all room effects only from clicked target rooms.
- Mode-Transition-Conflict-Test: switching between activate/deactivate/clear during inflight updates does not orphan state.
- Mobile-Reachability-Test: portrait + landscape verify thumb-reachable quick controls and readable room context.
- Sync-Determinism-Test: multi-client burst operations remain versioned, ordered, and idempotent.
- Baseline-Behavior-Test: existing non-speed workflows (manual trigger/edit/stop/global controls) remain intact.

## Incremental Mandatory Gates
- After P10-HF1-T1..T3: blackout root-cause and final-render continuity/co-render fix are stable.
- After P10-HF1-T4..T6: all-board non-regression PASS and full artifact sync are complete.
- After P10-T1..T2: Settings sub-tab IA and navigation shell are functionally stable.
- After P10-T3..T7: quick-mode core is deterministic and conflict-guarded.
- After P10-T8..T10: mobile one-handed path + explicit action feedback are stable.
- After P10-T11..T12: full matrix PASS and artifact sync are complete.

## Definition of Done
- P10-HF1 hard gates are PASS: no board-specific final-output blackout, and room+outside co-render parity is verified.
- All mandatory goals for Settings sub-tabs and quick modes are implemented and verified.
- Mobile one-handed operation and overview speed improvements are validated.
- Rapid operation remains deterministic and sync-safe on desktop/mobile.
- No regressions in stop/clear-all/global and `/output/final` paths.
- Phase-10 and global planning artifacts are synchronized.
