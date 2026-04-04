# Phase 10 Plan (Operator Speed UI/UX + Generic Polygon Hydration Hardening)

## Planning Mode Note
- Plan 10-HF1 remains PASS and baseline-valid.
- Plan 10-HF2 remains field-invalidated (historical context).
- Plan 10-HF3 is **completed PASS** with deterministic FAIL->PASS evidence and imported-board/browser matrix closure.
- New field-debug follow-up was closed in Plan 10-HF4 with PASS evidence.
- Plan 10-HF5 remains historically PASS but is field-invalidated by new concrete browser repro.
- Plan 10-HF6 is historical PASS but field-invalidated by clean-local-storage repro (missing play-area entries on startup).
- Plan 10-HF7 is completed PASS with deterministic FAIL->PASS evidence; Plan 10-1 is unblocked.

## Critical Runtime Feedback (binding, P0)
1. Concrete repro is binding: `Nemesis Lockdown Board A` renders two play areas (`Play Area 1` + `Bunker`) on Chrome, but Firefox and mobile-class Chrome render only `Play Area 1`; `Bunker` is dropped.
2. Failure signature indicates one play-area entry is lost in Firefox/mobile-class merge/apply path, causing fallback/default-only behavior.
3. Canonical source merge path (`saved profile` vs `defaults` vs `imported board payload`) is not deterministic for multi-area retention.
4. Fallback/default area may replace valid multi-area data when only a subset is present, which is forbidden.
5. Area-count parity and area-id-set parity must be explicit gates across browsers and across both surfaces (control-view + `/output/final`).
6. Root-cause confirmation is binding: board-profile candidate extraction/migration depended on currently loaded board catalog IDs; unknown board keys could be dropped and force default play-area fallback.

## Mandatory Goals (binding)
1. Reproduce and isolate exactly why one play-area entry is dropped in Firefox/mobile-class execution paths.
2. Trace and harden canonical source merge path (`saved profile` vs `defaults` vs `imported board payload`) for deterministic multi-area retention.
3. Prevent fallback/default area from replacing valid multi-area data when subset payloads are present.
4. Add explicit per-board area-count and area-id-set parity assertions across Chrome/Firefox/mobile-class Chrome.
5. Validate control-view and `/output/final` always consume identical canonical play-area sets.
6. Close with strict imported-board + multi-area regression matrix PASS and FAIL->PASS proof.
7. Decouple board-profile candidate extraction from loaded board list and retain unknown board keys through migration.
8. Prove deterministic retention of multi-play-area profiles across startup/default-apply/reload lifecycle paths.

## Target State
Phase 10 closes with three outcomes: (1) generic polygon hydration/apply determinism across browsers and lifecycle paths including multi-play-area cases, (2) HF7 closure of clean-start board-profile retention drift with extraction/migration/lifecycle determinism and explicit area-count/control/final parity, and (3) speed-first operator UX wave 10-1 executed only after that stable baseline.

## Binding Product Decisions
- Polygon semantics are schema-first and board-agnostic: runtime consumes one canonical polygon contract independent of board origin.
- Normalization is mandatory before any runtime apply/hydration: legacy aliases are converted into canonical fields and validated once.
- Valid persisted board polygons have precedence over generic defaults; fallback defaults are allowed only for missing or invalid geometry and must be explicit in diagnostics.
- `apply global defaults` must preserve board-owned polygons unless user intent explicitly requests polygon reset.
- Final-output render lifecycle must fail-open for polygon parsing/hydration edge cases when canonical valid polygons exist; no black-screen fallback is allowed from schema drift.
- Inside/outside/effects clipping must use identical canonical polygon sources across control and `/output/final`.
- Imported boards (existing and new) share the same normalization and fallback logic without board-specific conditions.
- Existing sync/control semantics remain unchanged (ordering/version/idempotent apply, stop/clear/global behavior).
- Multi-play-area and single-play-area boards must pass through the same canonical resolver path and produce deterministic parity.
- `/output/final` and control-view must share one canonical play-area source selection contract.

## Scope (Phase 10)
- Reproduce in tests: (a) multi-play-area board fallback to default play area/fallback hex, (b) single-play-area board control-case (no wrong fallback), (c) control-view and `/output/final` divergence under same persisted data.
- Add executable diagnostics for Firefox-specific polygon resolution traces with Chrome/mobile-class parity traces.
- Add executable diagnostics for canonical source selection and fallback-decision path under startup/reload/default-apply/board-switch.
- Implement root-cause fixes only after failing tests/diagnostics are in place.
- Run Firefox/Chrome/mobile-class parity matrix plus imported-board + multi-area non-regression and publish FAIL->PASS proof.
- Keep Plan 10-1 speed UX wave ready as the next execution wave after HF7 closure.

## Out of Scope
- New visual effects unrelated to polygon hydration/render reliability.
- Redesign of existing stop/clear/global controls.
- New server protocol family or non-essential API redesign.
- Board-specific one-off fixes for `Nemesis Lockdown A` only.

## Prioritized Next Execution Wave (Plan 10-HF7, execute-ready, hard-gated)
1. Build deterministic RED repro for clean-local-storage startup where valid board-profile entries disappear and default play area is applied.
2. Add executable diagnostics that trace board-profile candidate extraction independently from loaded board catalog IDs.
3. Add deterministic RED repro proving migration currently drops unknown board keys (including imported/multi-area keys) when catalog IDs are partial.
4. Implement root-cause fix so board-profile candidate extraction is catalog-independent and migration retains unknown board keys.
5. Add lifecycle parity assertions for deterministic multi-play-area retention across startup/default-apply/reload.
6. Keep control-view and `/output/final` canonical play-area set parity + area-count/id-set parity as hard gates.
7. Run Firefox/Chrome/mobile-class parity matrix and imported/multi-area strict non-regression matrix after fix.
8. Capture explicit FAIL->PASS evidence and synchronize phase/global artifacts for the HF7 wave.

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
4. M0 HF7 Clean-Storage Repro Closure: deterministic RED captures board-profile loss/default fallback after clean local storage startup.
5. M0 HF7 Extraction Closure: board-profile candidate extraction is independent of loaded board catalog IDs.
6. M0 HF7 Migration Closure: migration retains unknown board keys and never drops imported/multi-area profiles.
7. M0 HF7 Lifecycle Closure: startup/default-apply/reload retain deterministic multi-play-area profile sets.
8. M0 HF7 Parity Closure: area-count/id-set and control/final set parity remain PASS across Chrome/Firefox/mobile-class.
9. M0 HF7 FAIL->PASS Closure: failing tests and diagnostics are rerun to PASS with imported/multi-area matrix PASS.
10. M1 Settings IA Closure (10-1): sub-tabs grouped, navigable, scan-efficient.
11. M2-M6 Speed Closure (10-1): quick modes + mobile one-hand flow + determinism evidence PASS.

## Regression/Evidence Matrix Policy
- HF7-CleanStorage-Missing-PlayArea-Repro-Test: deterministic pre-fix RED captures profile-loss/default-play-area fallback after clean local storage startup.
- HF7-Extraction-Independent-From-Loaded-Boards-Test: diagnostics prove board-profile candidate extraction does not depend on currently loaded catalog IDs.
- HF7-Migration-Retains-Unknown-Board-Keys-Test: migration keeps unknown/imported board keys instead of dropping them.
- HF7-Lifecycle-MultiArea-Retention-Test: startup/default-apply/reload retain deterministic multi-play-area profiles.
- HF7-AreaCount-Parity-Across-Browsers-Test: `areaCount` per board is identical on Chrome/Firefox/mobile-class.
- HF7-AreaIdSet-Parity-Across-Browsers-Test: canonical area-id-set per board is identical on Chrome/Firefox/mobile-class.
- HF7-Control-Final-PlayArea-Set-Parity-Test: control-view and `/output/final` use identical canonical play-area sets.
- HF7-Imported-and-MultiArea-Regression-Test: imported boards and multi-area boards remain stable under clean-start/save/reload/default-apply/board-switch/final-output.
- HF7-FAIL-TO-PASS-Proof-Test: pre-fix FAIL log and post-fix PASS log are both committed.
- HF7-Sync-Control-NonRegression-Test: ordering/version/idempotent apply and stop/clear/global semantics remain stable.
- 10-1 speed tests remain defined but execute only after HF7 PASS.

## Definition of Done
- Plan 10-HF4 hard gates remain PASS baseline-valid.
- Plan 10-HF7 hard gates are PASS: clean-storage repro, extraction/migration hardening, deterministic lifecycle retention, area-count/id-set browser parity, control/final set parity, and imported/multi-area matrix closure with FAIL->PASS proof.
- Executable diagnostics cover Firefox headless/automation traces, Chrome/mobile-class parity traces, canonical source selection, and fallback-decision lifecycle assertions.
- Root-cause fix is generic across boards/imports/browsers (no board-specific branch).
- `/output/final` never falls back to invalid-default clip/render paths when canonical valid polygons exist.
- Browser-parity assertions enforce identical per-board area-count and area-id-set outputs.
- Control-view and `/output/final` consume identical canonical play-area sets for the same board state.
- Imported boards and unknown board keys pass strict non-regression under clean-start/startup/reload/default-apply/final-output cycles.
- Cross-browser matrix is PASS (Chrome/Firefox desktop + mobile-class emulation where possible).
- Plan 10-1 is next and execute-ready after HF7 closure.
- Phase-10 and global planning artifacts are synchronized.
