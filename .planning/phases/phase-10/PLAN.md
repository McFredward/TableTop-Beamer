# Phase 10 Plan (Operator Speed UI/UX + Generic Polygon Hydration Hardening)

## Planning Mode Note
- Plan 10-HF1 remains PASS and baseline-valid.
- Plan 10-HF2 remains field-invalidated (historical context).
- Plan 10-HF3 is **completed PASS** with deterministic FAIL->PASS evidence and imported-board/browser matrix closure.
- New field-debug follow-up was closed in Plan 10-HF4 with PASS evidence.
- Plan 10-1 is now unblocked and execute-ready after HF4 closure.

## Critical Runtime Feedback (binding, P0)
1. `domain-modules-missing`: runtime panel module `TT_BEAMER_RUNTIME_PANELS` is missing at runtime in Firefox debug traces.
2. `settings-ownership-violation`: ownership checks still require `#outside-mode` and `#outside-direction` although controls can be conditionally unmounted.
3. `ship-clip-regression-violation`: inside/outside ship-clip checker currently accepts invalid ship polygons or rejects valid multi-play-area/legacy states.
4. Firefox/Chrome parity remains unstable in executable diagnostics for runtime-panel exposure and polygon/clip evaluation.
5. Final-output render path can still fall back to invalid defaults although canonical polygon data exists.

## Mandatory Goals (binding)
1. Root-cause analyse runtime panel module loading/order/global exposure for `TT_BEAMER_RUNTIME_PANELS` with deterministic RED tests first.
2. Harden settings ownership checks for conditional-unmount UI controls (`#outside-mode`, `#outside-direction`) using executable DOM-state diagnostics.
3. Correct ship-clip regression checker so valid multi-play-area and legacy states evaluate browser-neutrally and invalid polygons are rejected deterministically.
4. Prove Firefox/Chrome parity via executable diagnostics (same scenarios, same verdicts, no static-only closure).
5. Ensure `/output/final` never falls back to invalid-default clip/render paths when canonical polygon data is present and valid.

## Target State
Phase 10 closes with three outcomes: (1) generic polygon hydration/apply determinism across browsers and lifecycle paths, (2) HF4 hardening of runtime module exposure, ownership checks, ship-clip regression validation, and final-output canonical-fallback behavior, and (3) speed-first operator UX wave 10-1 executed only after that stable baseline.

## Binding Product Decisions
- Polygon semantics are schema-first and board-agnostic: runtime consumes one canonical polygon contract independent of board origin.
- Normalization is mandatory before any runtime apply/hydration: legacy aliases are converted into canonical fields and validated once.
- Valid persisted board polygons have precedence over generic defaults; fallback defaults are allowed only for missing or invalid geometry and must be explicit in diagnostics.
- `apply global defaults` must preserve board-owned polygons unless user intent explicitly requests polygon reset.
- Final-output render lifecycle must fail-open for polygon parsing/hydration edge cases when canonical valid polygons exist; no black-screen fallback is allowed from schema drift.
- Inside/outside/effects clipping must use identical canonical polygon sources across control and `/output/final`.
- Imported boards (existing and new) share the same normalization and fallback logic without board-specific conditions.
- Existing sync/control semantics remain unchanged (ordering/version/idempotent apply, stop/clear/global behavior).
- Runtime panel modules required by orchestration (especially `TT_BEAMER_RUNTIME_PANELS`) must be exposed deterministically independent of browser load-order differences.
- Settings ownership validation must be applicability-aware: unmounted non-applicable controls are valid and cannot be treated as violations.
- Ship-clip regression guards must evaluate canonical + legacy polygon states deterministically and browser-neutrally.

## Scope (Phase 10)
- Reproduce in tests: (a) missing `TT_BEAMER_RUNTIME_PANELS` exposure/load-order failure, (b) ownership false-positive for conditionally unmounted outside controls, (c) ship-clip checker parity failure for valid multi-play-area/legacy states, (d) final-output invalid-default fallback despite canonical polygons.
- Add executable diagnostics for runtime module load-order/global exposure and panel binding lifecycle.
- Add executable diagnostics for applicability-aware settings ownership checks under conditional mount/unmount transitions.
- Add executable diagnostics for ship-clip regression evaluation parity across Firefox/Chrome.
- Implement root-cause fixes only after failing tests/diagnostics are in place.
- Run Firefox/Chrome parity matrix plus imported-board non-regression and publish FAIL->PASS proof.
- Keep Plan 10-1 speed UX wave ready but hard-gated until HF4 closes.

## Out of Scope
- New visual effects unrelated to polygon hydration/render reliability.
- Redesign of existing stop/clear/global controls.
- New server protocol family or non-essential API redesign.
- Board-specific one-off fixes for `Nemesis Lockdown A` only.

## Prioritized Next Execution Wave (Plan 10-HF4, execute-ready, hard-gated)
1. Build deterministic failing tests for `domain-modules-missing` (`TT_BEAMER_RUNTIME_PANELS`) and load-order/global exposure failure modes.
2. Add executable diagnostics for runtime panel module exposure and orchestration binding lifecycle.
3. Build deterministic failing tests for `settings-ownership-violation` with conditional-unmount controls (`#outside-mode`, `#outside-direction`).
4. Harden ownership checks so non-applicable/unmounted controls are accepted and applicable controls remain strictly enforced.
5. Build deterministic failing tests for `ship-clip-regression-violation` (invalid polygon acceptance + valid multi-play-area/legacy rejection cases).
6. Correct ship-clip regression checker for browser-neutral canonical/legacy evaluation.
7. Add Firefox/Chrome parity diagnostics and execute matrix runs for HF4 scenarios.
8. Enforce canonical-data-first final-output behavior: no invalid-default fallback when canonical polygons are valid.
9. Re-run full HF4 suite and capture explicit FAIL->PASS proof.
10. Close only after PASS evidence and synchronized planning artifacts.

## Previously Closed Wave (Plan 10-HF1)
- Board-specific final-output blackout on `Nemesis Lockdown A` was root-caused and fixed via compositor fail-open clipping hardening.
- All-board final-output regression evidence is PASS and remains baseline input for HF3.

## Deferred Wave (Plan 10-1, blocked until HF4 PASS)
1. Define IA map for Settings sub-tabs and migrate existing controls into stable grouped sections.
2. Implement speed-mode state machine (`off`/`activate`/`deactivate`/`clear`) with explicit lifecycle guards.
3. Build Quick Activation/Deactivation/Clear flows for sequential room actions.
4. Add mobile sticky action rail and one-handed ergonomics.
5. Add observability + burst regression matrix for speed modes.

## Milestones
1. M0 HF1 Closure (already PASS): board-specific final-output blackout path closed.
2. M0 HF3 Closure (already PASS): deterministic symptom repro/diagnostics/source-selection closure completed.
3. M0 HF4 Runtime-Panel Root-Cause Closure: `TT_BEAMER_RUNTIME_PANELS` load/exposure contract is deterministic across load orders.
4. M0 HF4 Ownership Closure: settings ownership checks are conditional-unmount aware without losing strictness for applicable controls.
5. M0 HF4 Ship-Clip Closure: checker rejects invalid polygons and accepts valid multi-play-area/legacy states browser-neutrally.
6. M0 HF4 Final-Output Closure: canonical polygon presence blocks invalid-default fallback paths.
7. M0 HF4 Firefox/Chrome Parity Closure: executable diagnostics PASS on both browsers.
8. M0 HF4 FAIL->PASS Closure: failing tests and diagnostics are rerun to PASS.
9. M1 Settings IA Closure (10-1): sub-tabs grouped, navigable, scan-efficient.
10. M2-M6 Speed Closure (10-1): quick modes + mobile one-hand flow + determinism evidence PASS.

## Regression/Evidence Matrix Policy
- HF4-Domain-Modules-Missing-Repro-Test: deterministic pre-fix RED for missing `TT_BEAMER_RUNTIME_PANELS` runtime panel module exposure.
- HF4-Runtime-Panel-Load-Order-Diagnostics-Test: executable lifecycle assertions for module load-order and global exposure contract.
- HF4-Settings-Ownership-Conditional-Unmount-Test: ownership checks accept unmounted non-applicable controls and fail only on missing applicable controls.
- HF4-Ship-Clip-Regression-Validity-Test: invalid ship polygons are rejected; valid canonical/multi-play-area/legacy shapes are accepted.
- HF4-Firefox-Chrome-Parity-Test: identical diagnostic scenarios produce identical verdicts on Firefox and Chrome.
- HF4-Final-Output-Canonical-NoInvalidDefault-Fallback-Test: canonical valid polygons prevent invalid-default fallback clip/render path.
- HF4-FAIL-TO-PASS-Proof-Test: pre-fix FAIL log and post-fix PASS log are both committed.
- HF4-Imported-Boards-NonRegression-Test: imported boards preserve polygon behavior through save/reload/default-apply/final-output.
- HF4-Sync-Control-NonRegression-Test: ordering/version/idempotent apply and stop/clear/global semantics remain stable.
- 10-1 speed tests remain defined but execute only after HF4 PASS.

## Definition of Done
- Plan 10-HF4 hard gates are PASS: runtime-panel exposure, conditional ownership checks, ship-clip regression validation, browser parity, and canonical no-invalid-default fallback are closed with FAIL->PASS proof.
- Executable diagnostics cover runtime module load-order/exposure, ownership applicability, ship-clip evaluation, and Firefox/Chrome parity.
- Root-cause fix is generic across boards/imports/browsers (no board-specific branch).
- `/output/final` never falls back to invalid-default clip/render paths when canonical valid polygons exist.
- Imported boards pass strict non-regression under startup/reload/default-apply/final-output cycles.
- Cross-browser matrix is PASS (Chrome/Firefox desktop + mobile-class emulation where possible).
- Plan 10-1 remains ready and unblocked only after HF4 closure.
- Phase-10 and global planning artifacts are synchronized.
