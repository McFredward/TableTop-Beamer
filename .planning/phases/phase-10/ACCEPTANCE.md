# Phase 10 Acceptance

## Planning Mode Note
- This file defines execute gates only; no implementation is executed yet.
- Field feedback invalidated prior HF2 closure; HF3 has now closed with PASS evidence.

## HF3 Closure Status
- H3-1..H3-10: PASS (see `P10-HF3-T1-REPRO-TRACE.md`, `P10-HF3-T2-DEFAULTS-OVERRIDE-REPRO.md`, `P10-HF3-T3-FINAL-BLACK-REPRO.md`, `P10-HF3-T4-LIFECYCLE-DIAGNOSTICS.md`, `P10-HF3-T5-BOARD-SWITCH-FINAL-CONTRACT.md`, `P10-HF3-T6-CANONICAL-SOURCE-SELECTION.md`, `P10-HF3-T7-ROOT-CAUSE-FIX.md`, `P10-HF3-T8-FAIL-PASS-PROOF.md`, `P10-HF3-T9-BROWSER-IMPORTED-REGRESSION.md`).

## Verification Strategy
- Final-output continuity first: no board-specific black-screen path is allowed on `/output/final`.
- Board parity first: outside-media type or board selection must not disable final composition.
- Canonical polygon contract first: `inside`/`outside`/`playAreas` must hydrate and apply identically across browsers.
- No silent override first: valid persisted board polygons cannot be replaced by defaults during startup/reload/default-apply.
- Imported-board safety first: fixes must be generic for current and future imported boards.
- Speed-first usability: operators perform repeated room actions with fewer steps and lower context switching.
- Determinism-first runtime: rapid taps and mode switches remain idempotent and sync-safe.
- Mobile-first practicality: one-handed operation is feasible under real gameplay tempo.
- Safety-first controls: quick modes are explicit and reversible; no hidden destructive path.

## Hard Gates (Plan 10-HF3, mandatory before 10-1)
- H3-1 Symptom-Repro-Gate-A: deterministic failing test reproduces Lockdown A polygon-apply failure in Firefox/mobile-class path.
- H3-2 Symptom-Repro-Gate-B: deterministic failing test reproduces `apply global defaults` unexpected default-polygon takeover.
- H3-3 Symptom-Repro-Gate-C: deterministic failing test reproduces `/output/final` black/fallback rectangle with valid polygons.
- H3-4 Executable-Lifecycle-Diagnostics-Gate: startup/load/apply-defaults/reload assertions execute and enforce expected polygon ownership.
- H3-5 Final-Contract-Diagnostics-Gate: board-switch + `/output/final` render contract assertions execute and pass.
- H3-6 Canonical-Source-Selection-Gate: canonical polygon source assertions execute and pass for control + final-output paths.
- H3-7 Root-Cause-Fix-Gate: fix is proven root-cause-based and board-agnostic (imported-board compatible).
- H3-8 Fail-To-Pass-Proof-Gate: evidence includes explicit pre-fix FAIL and post-fix PASS for all H3 repro/diagnostic tests.
- H3-9 Imported-Board-NonRegression-Gate: existing and newly imported boards remain stable through save/reload/default-apply/final-output cycles.
- H3-10 Browser-Matrix-Gate: all-browser matrix PASS is documented (Chrome/Firefox desktop + mobile-class emulation where possible).
- H3-11 Sync-Control-NonRegression-Gate: ordering/version/idempotent apply plus stop/clear/global controls remain unchanged.

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
- HF3-Symptom-Repro-LockdownA-FirefoxMobile-Test: deterministic pre-fix FAIL reproduces Lockdown A polygon-apply mismatch in Firefox/mobile-class path.
- HF3-Symptom-Repro-Defaults-Override-Test: deterministic pre-fix FAIL reproduces unexpected default polygons after defaults-apply.
- HF3-Symptom-Repro-Final-Black-Or-Rectangle-Test: deterministic pre-fix FAIL reproduces black/fallback rectangle on `/output/final` with valid polygons.
- HF3-Lifecycle-Assertion-Diagnostics-Test: executable startup/load/apply-defaults/reload assertions validate ownership/apply order and fail on drift.
- HF3-BoardSwitch-Final-Contract-Test: executable contract asserts canonical board polygon continuity across board-switch and final-output render.
- HF3-Canonical-Source-Selection-Test: control and final-output choose identical canonical polygon source for inside/outside/playAreas.
- HF3-Fail-To-Pass-Proof-Test: same test suite is recorded as FAIL pre-fix and PASS post-fix.
- HF3-Imported-Board-Regression-Test: imported boards keep polygon behavior stable under save/reload/default-apply/restart.
- HF3-All-Browser-Matrix-Test: Chrome/Firefox desktop + mobile-class emulation matrix PASS.
- HF3-Sync-Control-NonRegression-Test: sync invariants and stop/clear/global semantics unchanged under HF3 flows.
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
- After P10-HF3-T1..T3: exact runtime symptom set is reproducible via deterministic failing tests.
- After P10-HF3-T4..T6: executable diagnostics are active for lifecycle/final-contract/canonical-source assertions.
- After P10-HF3-T7..T8: root-cause fix is merged with explicit FAIL->PASS proof.
- After P10-HF3-T9..T10: imported-board/browser matrix PASS and full artifact sync are complete.
- After P10-HF1-T1..T3: blackout root-cause and final-render continuity/co-render fix are stable.
- After P10-HF1-T4..T6: all-board non-regression PASS and full artifact sync are complete.
- After P10-T1..T2: Settings sub-tab IA and navigation shell are functionally stable.
- After P10-T3..T7: quick-mode core is deterministic and conflict-guarded.
- After P10-T8..T10: mobile one-handed path + explicit action feedback are stable.
- After P10-T11..T12: full matrix PASS and artifact sync are complete.

## Definition of Done
- P10-HF3 hard gates are PASS: exact field symptom set is reproduced pre-fix and closed post-fix.
- Executable diagnostics (not static-only checks) enforce lifecycle, board-switch/final-contract, and canonical source selection assertions.
- Root-cause fix is generic across all imported boards and browsers.
- Valid persisted board polygons are never silently overridden by defaults in startup/reload/default-apply paths.
- `/output/final` uses board-specific canonical polygons cross-browser with no valid-polygon black-screen path.
- Imported board non-regression matrix and all-browser matrix are PASS with evidence.
- P10-HF1 hard gates are PASS: no board-specific final-output blackout, and room+outside co-render parity is verified.
- All mandatory goals for Settings sub-tabs and quick modes are implemented and verified.
- Mobile one-handed operation and overview speed improvements are validated.
- Rapid operation remains deterministic and sync-safe on desktop/mobile.
- No regressions in stop/clear-all/global and `/output/final` paths.
- Phase-10 and global planning artifacts are synchronized.
