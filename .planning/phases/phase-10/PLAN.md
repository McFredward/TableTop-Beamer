# Phase 10 Plan (Operator Speed UI/UX + Generic Polygon Hydration Hardening)

## Planning Mode Note
- Plan 10-HF1 remains PASS and baseline-valid.
- Plan 10-HF2 is PASS (generic cross-browser polygon load/apply/final-output hardening delivered).
- Plan 10-1 stays execute-ready and is unblocked.

## Critical Runtime Feedback (binding, P0)
1. On `Nemesis Lockdown A`, saved inside/outside polygons are partially not loaded on Firefox/Chrome mobile-class clients.
2. After `apply global defaults`, default polygons can override persisted board polygons.
3. `/output/final` can remain black outside Chrome and effects can clip against a default rectangle instead of board-specific polygons.
4. Fix must be generic and schema-driven for all current and future imported boards (no board-specific patching).

## Mandatory Goals (binding)
1. Deliver robust browser-neutral polygon load/apply for `inside`/`outside` + `playAreas` on startup/reload/default-apply.
2. Introduce canonical schema normalization + strict fallbacks without silent default override of valid persisted board polygons.
3. Harden final-output hydration/render path to be browser-neutral and prevent black-screen when polygons are valid.
4. Add strict non-regression for imported boards and future imports.
5. Ship all-browser regression matrix (Chrome/Firefox desktop + mobile-class emulation where possible).

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
- Reproduce cross-browser polygon hydration/apply regressions for startup/reload/default-apply and `/output/final`.
- Implement canonical polygon schema normalization pipeline for persisted settings/defaults/imported boards.
- Harden fallback routing to avoid silent override with default polygons.
- Harden final-output hydration/render path for browser neutrality and valid-polygon no-black guarantee.
- Add imported-board non-regression matrix and cross-browser matrix.
- Keep Plan 10-1 speed UX wave ready but gated until HF2 closes.

## Out of Scope
- New visual effects unrelated to polygon hydration/render reliability.
- Redesign of existing stop/clear/global controls.
- New server protocol family or non-essential API redesign.
- Board-specific one-off fixes for `Nemesis Lockdown A` only.

## Prioritized Next Execution Wave (Plan 10-HF2, execute-ready, hard-gated)
1. Reproduce + trace polygon-hydration failures on Firefox/Chrome desktop + mobile-class for startup/reload/default-apply.
2. Implement canonical polygon schema normalization for `inside`/`outside`/`playAreas` with deterministic validation.
3. Enforce apply-precedence contract: persisted board polygons cannot be silently replaced by defaults.
4. Harden final-output hydration/render path to consume canonical polygons browser-neutrally and avoid black frames with valid polygons.
5. Execute strict non-regression for imported boards (existing and newly imported samples).
6. Run browser matrix regression: Chrome/Firefox desktop + mobile-class emulation where possible.
7. Close only after PASS evidence and synchronized planning artifacts.

## Previously Closed Wave (Plan 10-HF1)
- Board-specific final-output blackout on `Nemesis Lockdown A` was root-caused and fixed via compositor fail-open clipping hardening.
- All-board final-output regression evidence is PASS and remains baseline for HF2.

## Deferred Wave (Plan 10-1, blocked by HF2)
1. Define IA map for Settings sub-tabs and migrate existing controls into stable grouped sections.
2. Implement speed-mode state machine (`off`/`activate`/`deactivate`/`clear`) with explicit lifecycle guards.
3. Build Quick Activation/Deactivation/Clear flows for sequential room actions.
4. Add mobile sticky action rail and one-handed ergonomics.
5. Add observability + burst regression matrix for speed modes.

## Milestones
1. M0 HF1 Closure (already PASS): board-specific final-output blackout path closed.
2. M0 HF2 Repro Closure: cross-browser polygon hydration/apply failures are deterministically reproduced and traced.
3. M0 HF2 Canonical Schema Closure: one normalization contract for `inside`/`outside`/`playAreas` is active across load/apply paths.
4. M0 HF2 Precedence Closure: persisted board polygons are protected from silent default override.
5. M0 HF2 Final-Hydration Closure: `/output/final` hydrates and renders against canonical polygons browser-neutrally.
6. M0 HF2 Imported-Board Closure: imported board matrix PASS with strict non-regression.
7. M0 HF2 Browser-Matrix Closure: Chrome/Firefox desktop + mobile-class matrix PASS.
8. M1 Settings IA Closure (10-1): sub-tabs grouped, navigable, scan-efficient.
9. M2-M6 Speed Closure (10-1): quick modes + mobile one-hand flow + determinism evidence PASS.

## Regression/Evidence Matrix Policy
- HF2-Startup-Reload-Hydration-Test: startup/reload always resolves persisted canonical polygons on all test browsers.
- HF2-Defaults-Apply-Precedence-Test: `apply global defaults` does not overwrite valid board polygons silently.
- HF2-Canonical-Normalization-Test: legacy aliases normalize to canonical schema with deterministic validation/fallback logs.
- HF2-Final-Output-Polygon-Hydration-Test: `/output/final` clips to board polygons (no default-rectangle drift) across browsers.
- HF2-No-Black-With-Valid-Polygon-Test: valid canonical polygons never produce black final-output frame from hydration path.
- HF2-Imported-Boards-NonRegression-Test: existing and newly imported boards preserve polygon behavior through save/reload/default-apply.
- HF2-All-Browser-Matrix-Test: Chrome/Firefox desktop plus mobile-class emulation where possible.
- HF2-Sync-Control-NonRegression-Test: ordering/version/idempotent apply and stop/clear/global semantics remain stable.
- 10-1 Speed tests remain defined but execute only after HF2 PASS.

## Definition of Done
- Plan 10-HF2 hard gates are PASS: canonical polygon hydration/apply is browser-neutral and generic across boards.
- `apply global defaults` respects persisted board polygon precedence; no silent default override.
- `/output/final` hydrates/renders from canonical board polygons browser-neutrally and avoids black screen for valid polygons.
- Imported boards pass strict non-regression under startup/reload/default-apply/final-output cycles.
- Cross-browser matrix is PASS (Chrome/Firefox desktop + mobile-class emulation where possible).
- Plan 10-1 remains ready and unblocked only after HF2 closure.
- Phase-10 and global planning artifacts are synchronized.
