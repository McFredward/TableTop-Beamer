# Phase 10 Plan (Operator Speed UI/UX + Generic Polygon Hydration Hardening)

## Planning Mode Note
- Plan 10-HF1 remains PASS and baseline-valid.
- Plan 10-HF2 remains field-invalidated (historical context).
- Plan 10-HF3 is **completed PASS** with deterministic FAIL->PASS evidence and imported-board/browser matrix closure.
- Plan 10-1 is now unblocked and becomes the next execution wave.

## Critical Runtime Feedback (binding, P0)
1. On `Nemesis Lockdown A`, saved inside/outside polygons are partially not loaded on Firefox/Chrome mobile-class clients.
2. After `apply global defaults`, default polygons can override persisted board polygons.
3. `/output/final` can remain black outside Chrome and effects can clip against a default rectangle instead of board-specific polygons.
4. Fix must be generic and schema-driven for all current and future imported boards (no board-specific patching).

## Mandatory Goals (binding)
1. Reproduce the exact three real-world failures as deterministic failing tests before any fix work.
2. Add direct executable diagnostics (not static-only checks) for lifecycle, board-switch/final-output contract, and canonical polygon source selection.
3. Fix root cause only after failing tests/diagnostics are in place.
4. Prove FAIL->PASS in the same wave evidence set.
5. Keep fix generic for all imported boards and browsers (no board-specific conditionals).

## Target State
Phase 10 closes with two outcomes: (1) generic polygon hydration/apply determinism across browsers and lifecycle paths (startup/reload/default-apply/final-output), and (2) speed-first operator UX wave 10-1 (Settings sub-tabs + quick activate/deactivate/clear + mobile one-hand flow) executed on top of that stable baseline.

## Binding Product Decisions
- Polygon semantics are schema-first and board-agnostic: runtime consumes one canonical polygon contract independent of board origin.
- Normalization is mandatory before any runtime apply/hydration: legacy aliases are converted into canonical fields and validated once.
- Valid persisted board polygons have precedence over generic defaults; fallback defaults are allowed only for missing or invalid geometry and must be explicit in diagnostics.
- `apply global defaults` must preserve board-owned polygons unless user intent explicitly requests polygon reset.
- Final-output render lifecycle must fail-open for polygon parsing/hydration edge cases when canonical valid polygons exist; no black-screen fallback is allowed from schema drift.
- Inside/outside/effects clipping must use identical canonical polygon sources across control and `/output/final`.
- Imported boards (existing and new) share the same normalization and fallback logic without board-specific conditions.
- Existing sync/control semantics remain unchanged (ordering/version/idempotent apply, stop/clear/global behavior).

## Scope (Phase 10)
- Reproduce in tests: (a) Lockdown A polygons not applied in Firefox/mobile-class path, (b) `apply global defaults` unexpectedly showing default polygons, (c) `/output/final` black/fallback rectangle despite valid polygons.
- Add executable diagnostics for startup/load/apply-defaults/reload lifecycle assertions.
- Add executable diagnostics for board-switch + final-output render contract assertions.
- Add executable diagnostics for canonical polygon source selection assertions.
- Implement root-cause fix based on failing tests and diagnostics.
- Run strict imported-board/browsers non-regression and publish FAIL->PASS proof.
- Keep Plan 10-1 speed UX wave ready but gated until HF3 closes.

## Out of Scope
- New visual effects unrelated to polygon hydration/render reliability.
- Redesign of existing stop/clear/global controls.
- New server protocol family or non-essential API redesign.
- Board-specific one-off fixes for `Nemesis Lockdown A` only.

## Prioritized Next Execution Wave (Plan 10-HF3, execute-ready, hard-gated)
1. Build reproducible failing tests for the exact symptom set (Lockdown A Firefox/mobile-class polygon apply, defaults-apply override, final-output black/fallback rectangle).
2. Add direct executable diagnostics for startup/load/apply-defaults/reload lifecycle assertions.
3. Add board-switch + final-output render contract assertions.
4. Add canonical polygon source selection assertions.
5. Implement root-cause fix driven by failing tests.
6. Re-run targeted and matrix tests to prove FAIL->PASS.
7. Confirm generic behavior for all imported boards and browsers.
8. Close only after PASS evidence and synchronized planning artifacts.

## Previously Closed Wave (Plan 10-HF1)
- Board-specific final-output blackout on `Nemesis Lockdown A` was root-caused and fixed via compositor fail-open clipping hardening.
- All-board final-output regression evidence is PASS and remains baseline input for HF3.

## Deferred Wave (Plan 10-1, now unblocked after HF3 PASS)
1. Define IA map for Settings sub-tabs and migrate existing controls into stable grouped sections.
2. Implement speed-mode state machine (`off`/`activate`/`deactivate`/`clear`) with explicit lifecycle guards.
3. Build Quick Activation/Deactivation/Clear flows for sequential room actions.
4. Add mobile sticky action rail and one-handed ergonomics.
5. Add observability + burst regression matrix for speed modes.

## Milestones
1. M0 HF1 Closure (already PASS): board-specific final-output blackout path closed.
2. M0 HF3 Repro Closure: three real-world failures are reproduced as deterministic failing tests.
3. M0 HF3 Diagnostics Closure: executable lifecycle/contract/source assertions are active and failing pre-fix.
4. M0 HF3 Root-Cause Closure: one generic cause is fixed without board-specific branches.
5. M0 HF3 FAIL->PASS Closure: failing tests and diagnostics are rerun to PASS.
6. M0 HF3 Imported-Board Closure: imported board matrix PASS with strict non-regression.
7. M0 HF3 Browser-Matrix Closure: Chrome/Firefox desktop + mobile-class matrix PASS.
8. M1 Settings IA Closure (10-1): sub-tabs grouped, navigable, scan-efficient.
9. M2-M6 Speed Closure (10-1): quick modes + mobile one-hand flow + determinism evidence PASS.

## Regression/Evidence Matrix Policy
- HF3-Symptom-Repro-LockdownA-FirefoxMobile-Test: Lockdown A board polygons fail deterministically in Firefox/mobile-class pre-fix.
- HF3-Symptom-Repro-Defaults-Override-Test: `apply global defaults` reproduces unexpected default-polygon takeover pre-fix.
- HF3-Symptom-Repro-Final-Black-Or-Rectangle-Test: `/output/final` reproduces black/fallback rectangle pre-fix with valid polygons.
- HF3-Lifecycle-Diagnostics-Test: startup/load/apply-defaults/reload assertions execute and enforce expected polygon ownership.
- HF3-BoardSwitch-Final-Contract-Test: board switch keeps final-output render contract tied to canonical board polygons.
- HF3-Canonical-Source-Selection-Test: one canonical polygon source is selected deterministically for control + final-output.
- HF3-FAIL-TO-PASS-Proof-Test: pre-fix FAIL log and post-fix PASS log are both committed.
- HF3-Imported-Boards-NonRegression-Test: existing and newly imported boards preserve polygon behavior through save/reload/default-apply/final-output.
- HF3-All-Browser-Matrix-Test: Chrome/Firefox desktop plus mobile-class emulation where possible.
- HF3-Sync-Control-NonRegression-Test: ordering/version/idempotent apply and stop/clear/global semantics remain stable.
- 10-1 Speed tests remain defined but execute only after HF3 PASS.

## Definition of Done
- Plan 10-HF3 hard gates are PASS: exact real-world symptom set is reproducible pre-fix and fully closed post-fix.
- Executable diagnostics cover lifecycle, board-switch/final-output contract, and canonical source selection paths.
- Root-cause fix is generic across boards/imports/browsers (no board-specific branch).
- `apply global defaults` respects persisted board polygon precedence; no silent default override.
- `/output/final` hydrates/renders from canonical board polygons browser-neutrally and avoids black screen for valid polygons.
- Imported boards pass strict non-regression under startup/reload/default-apply/final-output cycles.
- Cross-browser matrix is PASS (Chrome/Firefox desktop + mobile-class emulation where possible).
- Plan 10-1 remains ready and unblocked only after HF3 closure.
- Phase-10 and global planning artifacts are synchronized.
