# Phase 10 Acceptance

## Planning Mode Note
- This file tracks execute gates and execution closure evidence.
- Field feedback invalidated prior HF2 closure; HF3 has now closed with PASS evidence.
- HF4 is closed PASS and remains baseline-valid.
- HF5 historical PASS is field-invalidated by new concrete browser repro.
- HF6 historical PASS is field-invalidated by clean-local-storage profile-loss repro.
- HF7 is historical PASS evidence but field-invalidated by new all-board canonical-load/defaults-reapply regression.
- HF8 is the mandatory blocker wave; Plan 10-1 remains blocked until HF8 FAIL->PASS closure.

## HF3 Closure Status
- H3-1..H3-10: PASS (see `P10-HF3-T1-REPRO-TRACE.md`, `P10-HF3-T2-DEFAULTS-OVERRIDE-REPRO.md`, `P10-HF3-T3-FINAL-BLACK-REPRO.md`, `P10-HF3-T4-LIFECYCLE-DIAGNOSTICS.md`, `P10-HF3-T5-BOARD-SWITCH-FINAL-CONTRACT.md`, `P10-HF3-T6-CANONICAL-SOURCE-SELECTION.md`, `P10-HF3-T7-ROOT-CAUSE-FIX.md`, `P10-HF3-T8-FAIL-PASS-PROOF.md`, `P10-HF3-T9-BROWSER-IMPORTED-REGRESSION.md`).

## HF4 Closure Status
- H4-1..H4-9: PASS (see `P10-HF4-T1-REPRO-TRACE.md`, `P10-HF4-T2-RUNTIME-PANEL-DIAGNOSTICS.md`, `P10-HF4-T3-ROOT-CAUSE-FIX.md`, `P10-HF4-T4-OWNERSHIP-REPRO.md`, `P10-HF4-T5-OWNERSHIP-FIX.md`, `P10-HF4-T6-SHIP-CLIP-REPRO.md`, `P10-HF4-T7-SHIP-CLIP-FIX.md`, `P10-HF4-T8-BROWSER-PARITY.md`, `P10-HF4-T9-FINAL-OUTPUT-CANONICAL.md`, `P10-HF4-T10-FAIL-PASS-PROOF.md`).

## HF5 Execution Status
- H5-1..H5-9: historical PASS evidence exists, but closure is field-invalidated by follow-up repro (`Nemesis Lockdown Board A`: Chrome shows `Play Area 1` + `Bunker`; Firefox/mobile-class shows only `Play Area 1`).

## HF6 Execution Status
- H6-1..H6-9: PASS (`P10-HF6-T1-LOCKDOWNA-AREA-DROP-REPRO.md`, `P10-HF6-T2-MERGE-LINEAGE-DIAGNOSTICS.md`, `P10-HF6-T3-FALLBACK-SUBSET-REPLACEMENT-REPRO.md`, `P10-HF6-T4-AREA-COUNT-PARITY.md`, `P10-HF6-T5-AREA-ID-SET-PARITY.md`, `P10-HF6-T6-CONTROL-FINAL-SET-PARITY.md`, `P10-HF6-T7-ROOT-CAUSE-FIX.md`, `P10-HF6-T8-FALLBACK-GUARD.md`, `P10-HF6-T9-BROWSER-IMPORTED-MULTIAREA-REGRESSION.md`, `P10-HF6-T10-FAIL-PASS-PROOF.md`).

## HF7 Execution Status
- H7-1..H7-8: PASS (`P10-HF7-T1-CLEAN-START-PROFILE-LOSS-REPRO.md`, `P10-HF7-T2-EXTRACTION-COUPLING-DIAGNOSTICS.md`, `P10-HF7-T3-UNKNOWN-KEY-MIGRATION-DROP-REPRO.md`, `P10-HF7-T4-CATALOG-INDEPENDENT-EXTRACTION.md`, `P10-HF7-T5-UNKNOWN-KEY-RETENTION.md`, `P10-HF7-T6-LIFECYCLE-MULTIAREA-RETENTION.md`, `P10-HF7-T7-BROWSER-IMPORTED-CLEANSTART-REGRESSION.md`, `P10-HF7-T8-FAIL-PASS-PROOF.md`).

## HF8 Execution Status
- H8-1..H8-10: PASS (`P10-HF8-T1-ALL-BOARD-FALLBACK-REPRO.md`, `P10-HF8-T2-DEFAULTS-REAPPLY-REPRO.md`, `P10-HF8-T3-CANONICAL-LINEAGE-DIAGNOSTICS.md`, `P10-HF8-T4-SILENT-FALLBACK-REPRO.md`, `P10-HF8-T5-CANONICAL-LOAD-RECOVERY.md`, `P10-HF8-T6-DEFAULTS-REAPPLY-RECOVERY.md`, `P10-HF8-T7-EXPLICIT-ERROR-SURFACE.md`, `P10-HF8-T8-CONTROL-FINAL-PARITY.md`, `P10-HF8-T9-ALL-BOARD-REGRESSION.md`, `P10-HF8-T10-FAIL-PASS-PROOF.md`).

## Verification Strategy
- Final-output continuity first: no board-specific black-screen path is allowed on `/output/final`.
- Board parity first: outside-media type or board selection must not disable final composition.
- Canonical polygon contract first: `inside`/`outside`/`playAreas` must hydrate and apply identically across browsers.
- No silent override first: valid persisted board polygons cannot be replaced by defaults during startup/reload/default-apply.
- Imported-board safety first: fixes must be generic for current and future imported boards.
- Speed-first usability: operators perform repeated room actions with fewer steps and lower context switching.
- Determinism-first runtime: rapid taps and mode switches remain idempotent and sync-safe.
- Multi-area correctness first: multi-play-area boards and single-play-area boards follow the same canonical resolver semantics.
- Surface parity first: control-view and `/output/final` consume identical canonical play-area results.
- No silent fallback first: canonical load/apply failures must be operator-visible (toast/status with context), never silently masked.
- Mobile-first practicality: one-handed operation is feasible under real gameplay tempo.
- Safety-first controls: quick modes are explicit and reversible; no hidden destructive path.

## Hard Gates (Plan 10-HF8, mandatory before 10-1)
- H8-1 AllBoard-Canonical-Load-Repro-Gate: deterministic failing test reproduces all-board fallback polygon apply despite canonical saved play-areas.
- H8-2 Defaults-Reapply-Repro-Gate: deterministic failing test reproduces `Load global defaults` failing to restore board-specific play-areas.
- H8-3 Canonical-Lineage-Diagnostics-Gate: executable diagnostics trace canonical source lineage and defaults-reapply decisions across lifecycle paths.
- H8-4 No-Silent-Fallback-Repro-Gate: deterministic failing test reproduces canonical load/apply failure without explicit user-visible error.
- H8-5 Canonical-Load-Recovery-Gate: all boards load/apply play-areas deterministically from canonical saved sources.
- H8-6 Defaults-Reapply-Recovery-Gate: `Load global defaults` re-applies board-specific canonical play-areas deterministically.
- H8-7 Explicit-Error-Surface-Gate: canonical load/apply failures emit explicit toast/status with board/source context; silent masking is disallowed.
- H8-8 Control-vs-Final-Parity-Gate: control-view and `/output/final` consume identical canonical play-area set, `areaCount`, and `areaIdSet`.
- H8-9 All-Board-Regression-Matrix-Gate: single-area, multi-area, and imported boards pass strict lifecycle + browser matrix.
- H8-10 Fail-To-Pass-Proof-Gate: evidence includes explicit pre-fix FAIL and post-fix PASS for all HF8 repro/diagnostic tests.

## Hard Gates (Plan 10-HF7, historical baseline)
- H7-1 CleanStorage-Repro-Gate: deterministic failing test reproduces missing play-area entries/default-play-area fallback after clean local storage startup.
- H7-2 Extraction-Independence-Diagnostics-Gate: executable diagnostics prove board-profile candidate extraction is independent of loaded board catalog IDs.
- H7-3 Unknown-Key-Retention-Repro-Gate: deterministic failing test reproduces migration drop of unknown board keys before fix.
- H7-4 Extraction-Fix-Gate: extraction path is catalog-independent and retains board-profile candidates deterministically.
- H7-5 Migration-Retention-Gate: migration retains unknown/imported board keys and their play-area data.
- H7-6 Lifecycle-Retention-Gate: startup/default-apply/reload keeps deterministic multi-play-area profile retention.
- H7-7 Browser-and-Import-Matrix-Gate: browser parity and imported/multi-area strict regression matrix PASS includes clean-start lane coverage.
- H7-8 Fail-To-Pass-Proof-Gate: evidence contains explicit pre-fix FAIL and post-fix PASS for all HF7 repro/diagnostic tests.

## Hard Gates (Plan 10-HF6, historical baseline)
- H6-1 LockdownA-AreaDrop-Repro-Gate: deterministic failing test reproduces browser-specific drop (`Play Area 1` + `Bunker` in Chrome vs `Play Area 1` only in Firefox/mobile-class).
- H6-2 Merge-Lineage-Diagnostics-Gate: executable diagnostics trace canonical source merge lineage (`saved profile`, `defaults`, `imported payload`) and identify first-drop origin.
- H6-3 Fallback-Replacement-Repro-Gate: deterministic failing test reproduces fallback/default replacement of valid multi-area subset states.
- H6-4 AreaCount-Parity-Gate: explicit assertions enforce identical per-board `areaCount` across Chrome/Firefox/mobile-class Chrome.
- H6-5 AreaIdSet-Parity-Gate: explicit assertions enforce identical per-board canonical `areaIdSet` across Chrome/Firefox/mobile-class Chrome.
- H6-6 Control-vs-Final-Set-Parity-Gate: control-view and `/output/final` consume identical canonical play-area sets for the same board state.
- H6-7 Root-Cause-Fix-Gate: fix is generic and retains valid multi-area entries while blocking fallback replacement (no board-specific branch).
- H6-8 Imported-and-MultiArea-Regression-Gate: imported boards and multi-area boards pass strict save/reload/default-apply/board-switch/final-output matrix.
- H6-9 Fail-To-Pass-Proof-Gate: evidence contains explicit pre-fix FAIL and post-fix PASS for all HF6 repro/diagnostic tests.

## Hard Gates (Plan 10-HF4, mandatory before 10-1)
- H4-1 Domain-Modules-Missing-Repro-Gate: deterministic failing test reproduces missing `TT_BEAMER_RUNTIME_PANELS` runtime-panel module exposure/load-order failure.
- H4-2 Runtime-Panel-Exposure-Diagnostics-Gate: executable lifecycle diagnostics enforce module load-order and global exposure contract.
- H4-3 Settings-Ownership-Conditional-Unmount-Repro-Gate: deterministic failing test reproduces false ownership violation when `#outside-mode`/`#outside-direction` are non-applicable and unmounted.
- H4-4 Settings-Ownership-Applicability-Gate: ownership checks pass when controls are correctly unmounted and fail only when applicable required controls are missing.
- H4-5 Ship-Clip-Regression-Repro-Gate: deterministic failing test reproduces invalid acceptance/rejection in ship-clip checker across canonical/legacy states.
- H4-6 Ship-Clip-Validity-Parity-Gate: ship-clip checker accepts valid multi-play-area/legacy states and rejects invalid polygons browser-neutrally.
- H4-7 Firefox-Chrome-Parity-Gate: executable diagnostics for HF4 scenarios are PASS on Firefox and Chrome.
- H4-8 Final-Output-Canonical-NoInvalidDefault-Gate: `/output/final` does not enter invalid-default fallback path when canonical valid polygons exist.
- H4-9 Fail-To-Pass-Proof-Gate: evidence contains explicit pre-fix FAIL and post-fix PASS for all HF4 repro/diagnostic tests.

## Hard Gates (Plan 10-HF3, mandatory baseline)
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

## Hard Gates (Plan 10-HF1, mandatory baseline)
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
- HF8-AllBoard-Canonical-Load-Repro-Test: deterministic pre-fix FAIL captures all-board fallback polygon apply despite canonical saved play-areas.
- HF8-Defaults-Reapply-Repro-Test: deterministic pre-fix FAIL captures `Load global defaults` failing to restore board-specific play-areas.
- HF8-Canonical-Lineage-Diagnostics-Test: executable diagnostics enforce deterministic canonical source lineage and defaults-reapply decision tracing.
- HF8-No-Silent-Fallback-Repro-Test: deterministic pre-fix FAIL captures canonical load/apply failure path without explicit user-visible error.
- HF8-Explicit-Error-Surface-Test: canonical load/apply failures emit toast/status with board/source context and no silent masking.
- HF8-AreaCount-Parity-Test: per-board `areaCount` is identical on Chrome/Firefox/mobile-class Chrome.
- HF8-AreaIdSet-Parity-Test: per-board canonical `areaIdSet` is identical on Chrome/Firefox/mobile-class Chrome.
- HF8-Control-Final-Set-Parity-Test: control-view and `/output/final` consume identical canonical play-area sets under identical lifecycle state.
- HF8-All-Board-Regression-Test: all boards (single-area, multi-area, imported) stay stable across startup/reload/default-apply/board-switch/final-output.
- HF8-Fail-To-Pass-Proof-Test: identical HF8 suite captured as FAIL pre-fix and PASS post-fix.
- HF7-CleanStorage-Missing-PlayArea-Repro-Test: historical baseline PASS from prior wave.
- HF7-Extraction-Independent-From-Loaded-Boards-Test: historical baseline PASS from prior wave.
- HF7-Migration-Retains-Unknown-Board-Keys-Test: historical baseline PASS from prior wave.
- HF7-Lifecycle-MultiArea-Retention-Test: historical baseline PASS from prior wave.
- HF7-AreaCount-Parity-Test: historical baseline PASS from prior wave.
- HF7-AreaIdSet-Parity-Test: historical baseline PASS from prior wave.
- HF7-Control-Final-Set-Parity-Test: historical baseline PASS from prior wave.
- HF7-Imported-MultiArea-Regression-Test: historical baseline PASS from prior wave.
- HF7-Fail-To-Pass-Proof-Test: historical baseline PASS from prior wave.
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
- HF4-Domain-Modules-Missing-Repro-Test: deterministic RED for missing `TT_BEAMER_RUNTIME_PANELS` exposure/load-order behavior.
- HF4-Runtime-Panel-Exposure-Diagnostics-Test: executable assertions verify module exposure and binding lifecycle contract.
- HF4-Settings-Ownership-Conditional-Unmount-Test: ownership checks correctly accept unmounted non-applicable controls.
- HF4-Ship-Clip-Regression-Validity-Test: canonical/multi-play-area/legacy valid states PASS and invalid states FAIL deterministically.
- HF4-Firefox-Chrome-Parity-Test: same HF4 diagnostic scenarios produce same verdicts in Firefox and Chrome.
- HF4-Final-Output-Canonical-NoInvalidDefault-Fallback-Test: canonical valid polygons prevent invalid-default fallback render path.
- HF4-Fail-To-Pass-Proof-Test: identical HF4 test set is captured as FAIL pre-fix and PASS post-fix.
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
- After P10-HF4-T1..T4: runtime panel exposure + ownership unmount violations are reproducible and diagnostics are active.
- After P10-HF4-T5..T7: ownership applicability and ship-clip validity parity fixes are merged with deterministic checks.
- After P10-HF4-T8..T10: Firefox/Chrome parity plus canonical no-invalid-default fallback gates are PASS with full artifact sync.
- After P10-HF7-T1..T3: clean-start profile-loss and unknown-key migration-drop repros are RED; extraction diagnostics are active.
- After P10-HF7-T4..T6: extraction/migration hardening is merged and lifecycle multi-area retention is deterministic.
- After P10-HF7-T7..T8: browser parity plus imported/multi-area matrices (with clean-start lanes) are PASS with explicit FAIL->PASS proof and full artifact sync.
- After P10-HF8-T1..T4: all-board canonical-load/defaults-reapply/silent-fallback regressions are reproducible as deterministic RED with diagnostics active.
- After P10-HF8-T5..T8: canonical-load/defaults-reapply recovery and explicit error-surface contract are merged with control/final parity checks.
- After P10-HF8-T9..T10: all-board browser/imported/multi-area matrix is PASS with explicit FAIL->PASS proof and full artifact sync.
- After P10-HF1-T1..T3: blackout root-cause and final-render continuity/co-render fix are stable.
- After P10-HF1-T4..T6: all-board non-regression PASS and full artifact sync are complete.
- After P10-T1..T2: Settings sub-tab IA and navigation shell are functionally stable.
- After P10-T3..T7: quick-mode core is deterministic and conflict-guarded.
- After P10-T8..T10: mobile one-handed path + explicit action feedback are stable.
- After P10-T11..T12: full matrix PASS and artifact sync are complete.

## Definition of Done
- P10-HF3 hard gates are PASS: exact field symptom set is reproduced pre-fix and closed post-fix.
- P10-HF4 hard gates are PASS: runtime module exposure, ownership applicability checks, ship-clip validity parity, browser parity, and canonical no-invalid-default fallback are closed with FAIL->PASS proof.
- P10-HF7 remains historical PASS evidence but is field-invalidated and is not closure baseline.
- P10-HF8 hard gates are PASS: all-board canonical-load recovery, defaults-reapply recovery, explicit no-silent-fallback error visibility, area-count/id-set parity, control/final set parity, and all-board matrix closure.
- Executable diagnostics (not static-only checks) enforce lifecycle, board-switch/final-contract, and canonical source selection assertions.
- Executable diagnostics (not static-only checks) enforce runtime-panel exposure, ownership applicability, ship-clip validity, and Firefox/Chrome parity assertions.
- Executable diagnostics (not static-only checks) enforce Firefox headless + Chrome/mobile parity traces for source-merge lineage, area-count/id-set parity, and fallback decisions.
- Root-cause fix is generic across all imported boards and browsers.
- Valid persisted board polygons are never silently overridden by defaults in startup/reload/default-apply paths.
- Canonical load/apply failures are always operator-visible (toast/status with board/source context), with no silent fallback masking.
- `/output/final` uses board-specific canonical polygons cross-browser with no valid-polygon black-screen path.
- Imported board non-regression matrix and all-browser matrix are PASS with evidence.
- Area-count and area-id-set parity per board are PASS across Chrome/Firefox/mobile-class Chrome.
- Control-view and `/output/final` consume identical canonical play-area sets under the same board state.
- P10-HF1 hard gates are PASS: no board-specific final-output blackout, and room+outside co-render parity is verified.
- All mandatory goals for Settings sub-tabs and quick modes are implemented and verified.
- Mobile one-handed operation and overview speed improvements are validated.
- Rapid operation remains deterministic and sync-safe on desktop/mobile.
- No regressions in stop/clear-all/global and `/output/final` paths.
- Phase-10 and global planning artifacts are synchronized.
