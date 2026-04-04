# Phase 10 Plan (Operator Speed UI/UX + Generic Polygon Hydration Hardening)

## Planning Mode Note
- Plan 10-HF1 remains PASS and baseline-valid.
- Plan 10-HF2 remains field-invalidated (historical context).
- Plan 10-HF3 is **completed PASS** with deterministic FAIL->PASS evidence and imported-board/browser matrix closure.
- New field-debug follow-up was closed in Plan 10-HF4 with PASS evidence.
- Plan 10-HF5 remains historically PASS but is field-invalidated by new concrete browser repro.
- Plan 10-HF6 is completed PASS with deterministic RED->GREEN evidence.
- Plan 10-1 is unblocked for next execution.

## Critical Runtime Feedback (binding, P0)
1. Concrete repro is binding: `Nemesis Lockdown Board A` renders two play areas (`Play Area 1` + `Bunker`) on Chrome, but Firefox and mobile-class Chrome render only `Play Area 1`; `Bunker` is dropped.
2. Failure signature indicates one play-area entry is lost in Firefox/mobile-class merge/apply path, causing fallback/default-only behavior.
3. Canonical source merge path (`saved profile` vs `defaults` vs `imported board payload`) is not deterministic for multi-area retention.
4. Fallback/default area may replace valid multi-area data when only a subset is present, which is forbidden.
5. Area-count parity and area-id-set parity must be explicit gates across browsers and across both surfaces (control-view + `/output/final`).

## Mandatory Goals (binding)
1. Reproduce and isolate exactly why one play-area entry is dropped in Firefox/mobile-class execution paths.
2. Trace and harden canonical source merge path (`saved profile` vs `defaults` vs `imported board payload`) for deterministic multi-area retention.
3. Prevent fallback/default area from replacing valid multi-area data when subset payloads are present.
4. Add explicit per-board area-count and area-id-set parity assertions across Chrome/Firefox/mobile-class Chrome.
5. Validate control-view and `/output/final` always consume identical canonical play-area sets.
6. Close with strict imported-board + multi-area regression matrix PASS and FAIL->PASS proof.

## Target State
Phase 10 closes with three outcomes: (1) generic polygon hydration/apply determinism across browsers and lifecycle paths including multi-play-area cases, (2) HF6 closure of play-area-drop/fallback-replacement drift with explicit area-count parity and control/final set parity, and (3) speed-first operator UX wave 10-1 executed only after that stable baseline.

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
- Keep Plan 10-1 speed UX wave ready but hard-gated until HF6 closes.

## Out of Scope
- New visual effects unrelated to polygon hydration/render reliability.
- Redesign of existing stop/clear/global controls.
- New server protocol family or non-essential API redesign.
- Board-specific one-off fixes for `Nemesis Lockdown A` only.

## Prioritized Next Execution Wave (Plan 10-HF6, execute-ready, hard-gated)
1. Build deterministic RED repro for `Nemesis Lockdown Board A` proving browser-specific area drop (`Play Area 1` retained, `Bunker` missing in Firefox/mobile-class).
2. Add executable diagnostics that trace per-source area merge lineage (`saved profile`, `defaults`, `imported payload`) and identify first-drop point.
3. Build deterministic RED repro for fallback replacement where default area overwrites valid multi-area subset states.
4. Add explicit browser parity assertions for `areaCount` and `areaIdSet` per board.
5. Add explicit parity assertions that control-view and `/output/final` consume identical canonical play-area sets.
6. Implement generic resolver/merge fix to retain all valid multi-area entries deterministically.
7. Enforce fallback guard: default area can only fill truly missing/invalid canonical data, never replace valid subset.
8. Run Firefox/Chrome/mobile-class parity matrix for single-area + multi-area scenarios.
9. Run strict imported-board + multi-area non-regression matrix across startup/reload/default-apply/board-switch.
10. Capture explicit FAIL->PASS evidence and synchronize planning/global artifacts.

## Previously Closed Wave (Plan 10-HF1)
- Board-specific final-output blackout on `Nemesis Lockdown A` was root-caused and fixed via compositor fail-open clipping hardening.
- All-board final-output regression evidence is PASS and remains baseline input for HF3.

## Deferred Wave (Plan 10-1, blocked until HF6 PASS)
1. Define IA map for Settings sub-tabs and migrate existing controls into stable grouped sections.
2. Implement speed-mode state machine (`off`/`activate`/`deactivate`/`clear`) with explicit lifecycle guards.
3. Build Quick Activation/Deactivation/Clear flows for sequential room actions.
4. Add mobile sticky action rail and one-handed ergonomics.
5. Add observability + burst regression matrix for speed modes.

## Milestones
1. M0 HF1 Closure (already PASS): board-specific final-output blackout path closed.
2. M0 HF3 Closure (already PASS): deterministic symptom repro/diagnostics/source-selection closure completed.
3. M0 HF4 Closure (already PASS): runtime-panel/ownership/ship-clip/final-canonical gates remain baseline-valid.
4. M0 HF6 Repro Closure: deterministic RED captures browser-specific area drop (`Play Area 1` only vs `Play Area 1` + `Bunker`).
5. M0 HF6 Merge-Lineage Closure: source merge diagnostics prove deterministic retention across saved/default/imported paths.
6. M0 HF6 Fallback-Guard Closure: default area no longer replaces valid multi-area subset payloads.
7. M0 HF6 Area-Parity Closure: area-count + area-id-set parity is PASS across Chrome/Firefox/mobile-class.
8. M0 HF6 Surface-Parity Closure: control-view and `/output/final` resolve identical canonical play-area sets.
9. M0 HF6 FAIL->PASS Closure: failing tests and diagnostics are rerun to PASS with imported/multi-area matrix PASS.
10. M1 Settings IA Closure (10-1): sub-tabs grouped, navigable, scan-efficient.
11. M2-M6 Speed Closure (10-1): quick modes + mobile one-hand flow + determinism evidence PASS.

## Regression/Evidence Matrix Policy
- HF6-LockdownA-AreaDrop-Repro-Test: deterministic pre-fix RED captures `Bunker` drop on Firefox/mobile-class while Chrome keeps both areas.
- HF6-Merge-Lineage-Diagnostics-Test: executable diagnostics trace source merge lineage and assert no valid area entry is dropped.
- HF6-No-Fallback-Replacement-On-Subset-Test: default/fallback area cannot replace valid multi-area subset data.
- HF6-AreaCount-Parity-Across-Browsers-Test: `areaCount` per board is identical on Chrome/Firefox/mobile-class.
- HF6-AreaIdSet-Parity-Across-Browsers-Test: canonical area-id-set per board is identical on Chrome/Firefox/mobile-class.
- HF6-Control-Final-PlayArea-Set-Parity-Test: control-view and `/output/final` use identical canonical play-area sets.
- HF6-Startup-Reload-Defaults-BoardSwitch-Lifecycle-Test: lifecycle paths remain deterministic and canonical-first.
- HF6-Imported-and-MultiArea-Regression-Test: imported boards and multi-area boards remain stable under save/reload/default-apply/board-switch/final-output.
- HF6-FAIL-TO-PASS-Proof-Test: pre-fix FAIL log and post-fix PASS log are both committed.
- HF6-Sync-Control-NonRegression-Test: ordering/version/idempotent apply and stop/clear/global semantics remain stable.
- 10-1 speed tests remain defined but execute only after HF6 PASS.

## Definition of Done
- Plan 10-HF4 hard gates remain PASS baseline-valid.
- Plan 10-HF6 hard gates are PASS: area-drop repro, source-merge diagnostics, fallback-replacement guard, area-count/id-set browser parity, control/final set parity, and imported/multi-area matrix closure with FAIL->PASS proof.
- Executable diagnostics cover Firefox headless/automation traces, Chrome/mobile-class parity traces, canonical source selection, and fallback-decision lifecycle assertions.
- Root-cause fix is generic across boards/imports/browsers (no board-specific branch).
- `/output/final` never falls back to invalid-default clip/render paths when canonical valid polygons exist.
- Browser-parity assertions enforce identical per-board area-count and area-id-set outputs.
- Control-view and `/output/final` consume identical canonical play-area sets for the same board state.
- Imported boards pass strict non-regression under startup/reload/default-apply/final-output cycles.
- Cross-browser matrix is PASS (Chrome/Firefox desktop + mobile-class emulation where possible).
- Plan 10-1 remains ready but blocked until HF6 closure.
- Phase-10 and global planning artifacts are synchronized.
