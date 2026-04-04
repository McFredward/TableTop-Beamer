# Phase 10 Plan (Operator Speed UI/UX + Generic Polygon Hydration Hardening)

## Planning Mode Note
- Plan 10-HF1 remains PASS and baseline-valid.
- Plan 10-HF2 remains field-invalidated (historical context).
- Plan 10-HF3 is **completed PASS** with deterministic FAIL->PASS evidence and imported-board/browser matrix closure.
- New field-debug follow-up was closed in Plan 10-HF4 with PASS evidence.
- Plan 10-HF5 is completed PASS with explicit FAIL->PASS and browser/imported-board matrix evidence.
- Plan 10-1 is unblocked and remains the next execute-ready wave.

## Critical Runtime Feedback (binding, P0)
1. In Firefox and mobile-class Chrome, `Nemesis Lockdown A` still loads wrong polygons (default play area/fallback hex becomes visible).
2. Real-world symptom points to a likely multi-play-area handling drift (boards with multiple disconnected play areas differ from single-area boards).
3. Canonical saved play areas are not applied deterministically across browser/runtime lifecycle paths (startup/reload/default-apply).
4. `/output/final` and control-view can diverge and fall back to default geometry although valid canonical board geometry exists.
5. Imported boards and multi-area boards need a strict shared regression matrix before closure.

## Mandatory Goals (binding)
1. Build explicit RED repro split for multi-play-area boards vs single-play-area boards.
2. Add Firefox-specific executable diagnostics (headless/automation + parity traces against Chrome/mobile-class Chrome).
3. Implement root-cause fix that removes wrong fallback to default play area/fallback hex.
4. Enforce browser-neutral canonical play-area application for persisted board data.
5. Guarantee parity for both surfaces: control-view and `/output/final` consume the same canonical play-area result.
6. Close with regression matrix PASS for imported boards + multi-area boards.

## Target State
Phase 10 closes with three outcomes: (1) generic polygon hydration/apply determinism across browsers and lifecycle paths including multi-play-area cases, (2) HF5 closure of default-play-area/fallback-hex drift with Firefox/mobile-class parity for control + `/output/final`, and (3) speed-first operator UX wave 10-1 executed only after that stable baseline.

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
- Keep Plan 10-1 speed UX wave ready but hard-gated until HF5 closes.

## Out of Scope
- New visual effects unrelated to polygon hydration/render reliability.
- Redesign of existing stop/clear/global controls.
- New server protocol family or non-essential API redesign.
- Board-specific one-off fixes for `Nemesis Lockdown A` only.

## Prioritized Next Execution Wave (Plan 10-HF5, execute-ready, hard-gated)
1. Build deterministic failing repro tests that separate multi-play-area boards vs single-play-area boards for polygon apply/hydration.
2. Add Firefox-specific diagnostics (headless/automation) with parity trace capture against Chrome/mobile-class Chrome.
3. Build deterministic failing tests for wrong fallback behavior (default play area/fallback hex visible despite valid canonical saved play-areas).
4. Implement root-cause fix for canonical play-area resolver/fallback decision path (no board-specific branches).
5. Enforce shared canonical source contract for control-view and `/output/final`.
6. Build deterministic tests for startup/reload/default-apply and board-switch lifecycle parity.
7. Execute Firefox/Chrome/mobile-class parity matrix for single-area + multi-area scenarios.
8. Execute imported-board + multi-area strict non-regression matrix.
9. Capture explicit FAIL->PASS evidence for HF5 repro/diagnostic set.
10. Close only after PASS evidence and synchronized planning artifacts.

## Previously Closed Wave (Plan 10-HF1)
- Board-specific final-output blackout on `Nemesis Lockdown A` was root-caused and fixed via compositor fail-open clipping hardening.
- All-board final-output regression evidence is PASS and remains baseline input for HF3.

## Deferred Wave (Plan 10-1, blocked until HF5 PASS)
1. Define IA map for Settings sub-tabs and migrate existing controls into stable grouped sections.
2. Implement speed-mode state machine (`off`/`activate`/`deactivate`/`clear`) with explicit lifecycle guards.
3. Build Quick Activation/Deactivation/Clear flows for sequential room actions.
4. Add mobile sticky action rail and one-handed ergonomics.
5. Add observability + burst regression matrix for speed modes.

## Milestones
1. M0 HF1 Closure (already PASS): board-specific final-output blackout path closed.
2. M0 HF3 Closure (already PASS): deterministic symptom repro/diagnostics/source-selection closure completed.
3. M0 HF4 Closure (already PASS): runtime-panel/ownership/ship-clip/final-canonical gates remain baseline-valid.
4. M0 HF5 Repro Closure: deterministic RED captures multi-play-area vs single-play-area mismatch and wrong fallback visibility.
5. M0 HF5 Firefox Diagnostics Closure: executable Firefox headless traces plus Chrome/mobile-class parity traces are stable.
6. M0 HF5 Root-Cause Closure: canonical play-area resolver/fallback path is fixed generically.
7. M0 HF5 Surface-Parity Closure: control-view and `/output/final` resolve and apply identical canonical play-areas.
8. M0 HF5 Regression Closure: imported-board + multi-area matrix is PASS.
9. M0 HF5 FAIL->PASS Closure: failing tests and diagnostics are rerun to PASS.
10. M1 Settings IA Closure (10-1): sub-tabs grouped, navigable, scan-efficient.
11. M2-M6 Speed Closure (10-1): quick modes + mobile one-hand flow + determinism evidence PASS.

## Regression/Evidence Matrix Policy
- HF5-Multi-vs-Single-Repro-Test: deterministic pre-fix RED isolates multi-play-area failure against single-area control boards.
- HF5-Firefox-Headless-Diagnostics-Test: executable Firefox automation traces capture canonical source and fallback path decisions.
- HF5-Chrome-Mobile-Parity-Trace-Test: same scenarios produce parity traces on Chrome desktop and mobile-class Chrome.
- HF5-No-Default-Fallback-When-Canonical-Valid-Test: valid canonical saved play-areas block default play area/fallback hex on all lifecycle paths.
- HF5-Control-Final-Canonical-Source-Parity-Test: control-view and `/output/final` use identical canonical source for apply/clip.
- HF5-Startup-Reload-Defaults-Lifecycle-Test: startup/reload/default-apply path remains canonical-first and browser-neutral.
- HF5-Imported-and-MultiArea-Regression-Test: imported boards and multi-area boards remain stable under save/reload/default-apply/board-switch/final-output.
- HF5-FAIL-TO-PASS-Proof-Test: pre-fix FAIL log and post-fix PASS log are both committed.
- HF5-Sync-Control-NonRegression-Test: ordering/version/idempotent apply and stop/clear/global semantics remain stable.
- 10-1 speed tests remain defined but execute only after HF5 PASS.

## Definition of Done
- Plan 10-HF4 hard gates remain PASS baseline-valid.
- Plan 10-HF5 hard gates are PASS: multi-vs-single repro, Firefox diagnostics parity, root-cause fix, canonical no-default-fallback behavior, control/final parity, and imported/multi-area matrix closure with FAIL->PASS proof.
- Executable diagnostics cover Firefox headless/automation traces, Chrome/mobile-class parity traces, canonical source selection, and fallback-decision lifecycle assertions.
- Root-cause fix is generic across boards/imports/browsers (no board-specific branch).
- `/output/final` never falls back to invalid-default clip/render paths when canonical valid polygons exist.
- Imported boards pass strict non-regression under startup/reload/default-apply/final-output cycles.
- Cross-browser matrix is PASS (Chrome/Firefox desktop + mobile-class emulation where possible).
- Plan 10-1 remains ready but blocked until HF5 closure.
- Phase-10 and global planning artifacts are synchronized.
