# Phase 10 Plan (Operator Speed UI/UX + Generic Polygon Hydration Hardening)

## Planning Mode Note
- Plan 10-HF1 remains PASS and baseline-valid.
- Plan 10-HF2 remains field-invalidated (historical context).
- Plan 10-HF3 is **completed PASS** with deterministic FAIL->PASS evidence and imported-board/browser matrix closure.
- New field-debug follow-up was closed in Plan 10-HF4 with PASS evidence.
- Plan 10-HF5 remains historically PASS but is field-invalidated by new concrete browser repro.
- Plan 10-HF6 is historical PASS but field-invalidated by clean-local-storage repro (missing play-area entries on startup).
- Plan 10-HF7 is completed PASS with deterministic FAIL->PASS evidence, but is field-invalidated by new P0 regression (all-board fallback polygon apply).
- Plan 10-HF8 is completed PASS and no longer blocks Plan 10-1.

## Critical Runtime Feedback (binding, P0)
1. Critical field repro after HF7 is binding: all boards currently resolve to default fallback polygon; canonical saved board play-areas are not applied.
2. `Load global defaults` currently fails to restore board-specific play-areas and can leave boards on fallback/default geometry.
3. Silent masking is forbidden: canonical polygon load/apply failures currently can be hidden by fallback behavior without explicit operator-visible error.
4. Recovery must preserve strict parity between control-view and `/output/final` for canonical play-area source, area-count, and area-id-set.
5. Closure requires deterministic FAIL->PASS evidence and an all-board regression matrix (single-area + multi-area + imported boards).

## Mandatory Goals (binding)
1. Restore deterministic loading/apply of play-areas for all boards from canonical saved sources.
2. Ensure `Load global defaults` correctly reapplies board-specific play-areas instead of default fallback geometry.
3. Remove silent fallback masking for canonical polygon load/apply failures.
4. Emit explicit user-visible error feedback (toast/status) with board/source context whenever canonical load/apply fails.
5. Keep control-view and `/output/final` on one shared canonical resolver contract with strict parity assertions.
6. Close with deterministic FAIL->PASS evidence and an all-board regression matrix.

## Target State
Phase 10 closes with three outcomes: (1) generic polygon hydration/apply determinism across browsers and lifecycle paths including multi-play-area cases, (2) HF8 closure of all-board canonical-load/defaults-reapply/error-visibility regressions with explicit control/final parity and all-board FAIL->PASS evidence, and (3) speed-first operator UX wave 10-1 executed only after that stable baseline.

## Binding Product Decisions
- Polygon semantics are schema-first and board-agnostic: runtime consumes one canonical polygon contract independent of board origin.
- Normalization is mandatory before any runtime apply/hydration: legacy aliases are converted into canonical fields and validated once.
- Valid persisted board polygons have precedence over generic defaults; fallback defaults are allowed only for missing or invalid geometry and must be explicit in diagnostics.
- `apply global defaults` must reapply board-specific canonical play-areas deterministically; default fallback cannot silently replace valid board-owned polygons.
- Final-output render lifecycle must fail-open for polygon parsing/hydration edge cases when canonical valid polygons exist; no black-screen fallback is allowed from schema drift.
- Inside/outside/effects clipping must use identical canonical polygon sources across control and `/output/final`.
- Imported boards (existing and new) share the same normalization and fallback logic without board-specific conditions.
- Existing sync/control semantics remain unchanged (ordering/version/idempotent apply, stop/clear/global behavior).
- Multi-play-area and single-play-area boards must pass through the same canonical resolver path and produce deterministic parity.
- `/output/final` and control-view must share one canonical play-area source selection contract.

## Scope (Phase 10)
- Reproduce in tests: (a) all-board canonical play-area load regression to default fallback polygon, (b) broken `Load global defaults` board-specific reapply behavior, (c) control-view and `/output/final` divergence under same persisted data.
- Add executable diagnostics for canonical source selection, defaults-reapply contract, and fallback-decision/error-notification path under startup/reload/default-apply/board-switch.
- Implement root-cause fixes only after failing tests/diagnostics are in place.
- Run Firefox/Chrome/mobile-class parity matrix plus all-board imported/multi-area non-regression and publish FAIL->PASS proof.
- Keep Plan 10-1 speed UX wave queued and blocked until HF8 closure.

## Out of Scope
- New visual effects unrelated to polygon hydration/render reliability.
- Redesign of existing stop/clear/global controls.
- New server protocol family or non-essential API redesign.
- Board-specific one-off fixes for `Nemesis Lockdown A` only.

## Prioritized Next Execution Wave (Plan 10-HF8, execute-ready, hard-gated)
1. Build deterministic RED repro proving all-board canonical play-area load regresses to default fallback polygon.
2. Build deterministic RED repro proving `Load global defaults` does not restore board-specific canonical play-areas.
3. Add executable diagnostics for canonical source lineage and defaults-reapply decisions across startup/reload/default-apply/board-switch.
4. Add deterministic RED repro that canonical load/apply failures are currently silent (missing explicit toast/status context).
5. Implement root-cause fix to restore canonical-first all-board loading/apply determinism.
6. Implement defaults-reapply fix so `Load global defaults` restores board-specific canonical play-areas.
7. Implement explicit error-surface contract: canonical load/apply failures always produce user-visible toast/status with board/source context; no silent masking.
8. Keep control-view and `/output/final` canonical play-area set parity + area-count/id-set parity as hard gates.
9. Run Firefox/Chrome/mobile-class all-board matrix (single/multi/imported) and capture explicit FAIL->PASS proof.
10. Synchronize phase/global artifacts for HF8 closure.

## Previously Closed Wave (Plan 10-HF1)
- Board-specific final-output blackout on `Nemesis Lockdown A` was root-caused and fixed via compositor fail-open clipping hardening.
- All-board final-output regression evidence is PASS and remains baseline input for HF3.

## Deferred Wave (Plan 10-1, next execute-ready wave)
1. Define IA map for Settings sub-tabs and migrate existing controls into stable grouped sections.
2. Implement speed-mode state machine (`off`/`activate`/`deactivate`/`clear`) with explicit lifecycle guards.
3. Build Quick Activation/Deactivation/Clear flows for sequential room actions.
4. Add mobile sticky action rail and one-handed ergonomics.
5. Add observability + burst regression matrix for speed modes.

## Milestones
1. M0 HF1 Closure (already PASS): board-specific final-output blackout path closed.
2. M0 HF3 Closure (already PASS): deterministic symptom repro/diagnostics/source-selection closure completed.
3. M0 HF4 Closure (already PASS): runtime-panel/ownership/ship-clip/final-canonical gates remain baseline-valid.
4. M0 HF7 Clean-Storage Repro Closure: deterministic RED captured board-profile loss/default fallback after clean local storage startup (historical PASS evidence).
5. M0 HF7 Extraction Closure: board-profile candidate extraction is independent of loaded board catalog IDs (historical PASS evidence).
6. M0 HF7 Migration Closure: migration retains unknown board keys and never drops imported/multi-area profiles (historical PASS evidence).
7. M0 HF7 Lifecycle Closure: startup/default-apply/reload retained deterministic multi-play-area profile sets (historical PASS evidence).
8. M0 HF8 All-Board Canonical Load Closure: all boards load/apply play-areas deterministically from canonical saved sources.
9. M0 HF8 Defaults-Reapply Closure: `Load global defaults` deterministically restores board-specific canonical play-areas.
10. M0 HF8 Explicit Error Visibility Closure: canonical load/apply failures emit explicit operator-visible toast/status context; silent fallback masking is removed.
11. M0 HF8 Parity Closure: area-count/id-set and control/final set parity remain PASS across Chrome/Firefox/mobile-class for all boards.
12. M0 HF8 FAIL->PASS Closure: failing tests and diagnostics are rerun to PASS with all-board matrix PASS.
13. M1 Settings IA Closure (10-1): sub-tabs grouped, navigable, scan-efficient.
14. M2-M6 Speed Closure (10-1): quick modes + mobile one-hand flow + determinism evidence PASS.

## Regression/Evidence Matrix Policy
- HF8-AllBoard-Canonical-Load-Repro-Test: deterministic pre-fix RED captures all-board fallback-polygon apply despite canonical saved play-areas.
- HF8-Defaults-Reapply-Repro-Test: deterministic pre-fix RED captures `Load global defaults` failing to restore board-specific play-areas.
- HF8-Canonical-Lineage-Diagnostics-Test: executable diagnostics trace canonical source lineage and defaults-reapply decisions deterministically.
- HF8-No-Silent-Fallback-Repro-Test: deterministic pre-fix RED captures canonical load/apply failure paths lacking explicit user-visible error.
- HF8-Explicit-Error-Surface-Test: canonical load/apply failures emit toast/status with board/source context and no silent masking.
- HF8-AreaCount-Parity-Across-Browsers-Test: `areaCount` per board is identical on Chrome/Firefox/mobile-class.
- HF8-AreaIdSet-Parity-Across-Browsers-Test: canonical area-id-set per board is identical on Chrome/Firefox/mobile-class.
- HF8-Control-Final-PlayArea-Set-Parity-Test: control-view and `/output/final` use identical canonical play-area sets.
- HF8-All-Board-Regression-Matrix-Test: single-area, multi-area, and imported boards remain stable under startup/reload/default-apply/board-switch/final-output.
- HF8-FAIL-TO-PASS-Proof-Test: pre-fix FAIL logs and post-fix PASS logs are both committed.
- HF8-Sync-Control-NonRegression-Test: ordering/version/idempotent apply and stop/clear/global semantics remain stable.
- 10-1 speed tests remain defined but execute only after HF8 PASS.

## Definition of Done
- Plan 10-HF4 hard gates remain PASS baseline-valid.
- Plan 10-HF7 remains historical PASS evidence but is field-invalidated and not closure baseline.
- Plan 10-HF8 hard gates are PASS: all-board canonical-load recovery, defaults-reapply recovery, explicit no-silent-fallback error visibility, area-count/id-set browser parity, control/final set parity, and all-board matrix closure with FAIL->PASS proof.
- Executable diagnostics cover Firefox headless/automation traces, Chrome/mobile-class parity traces, canonical source selection, and fallback-decision lifecycle assertions.
- Root-cause fix is generic across boards/imports/browsers (no board-specific branch).
- `/output/final` never falls back to invalid-default clip/render paths when canonical valid polygons exist.
- Browser-parity assertions enforce identical per-board area-count and area-id-set outputs.
- Control-view and `/output/final` consume identical canonical play-area sets for the same board state.
- Imported boards and unknown board keys pass strict non-regression under clean-start/startup/reload/default-apply/final-output cycles.
- Canonical load/apply failure paths are explicitly surfaced to operator (toast/status with context) and are never silently masked by fallback polygons.
- Cross-browser matrix is PASS (Chrome/Firefox desktop + mobile-class emulation where possible).
- Plan 10-1 is next and execute-ready only after HF8 closure.
- Phase-10 and global planning artifacts are synchronized.
