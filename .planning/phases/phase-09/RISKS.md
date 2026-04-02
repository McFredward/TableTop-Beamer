# Phase 9 Risks

## Acceptance Correction Context
- 9-1 is not accepted; 9-HF1 introduces hard gates with measurable `src/app.js` reduction.

## R1 Extraction order causes hidden coupling regressions
- Risk: moving blocks from `src/app.js` in wrong sequence breaks implicit dependencies.
- Impact: Critical.
- Mitigation: enforce boundary map + branch-by-abstraction sequence with parity checks per slice.

## R2 Thin bootstrap still keeps feature logic
- Risk: `src/app.js` remains partially monolithic after incomplete extraction.
- Impact: High.
- Mitigation: strict bootstrap ownership gate in 9-HF1 + mandatory domain extraction checklist.

## R2b app.js reduction is marginal instead of significant
- Risk: extraction exists but file-size reduction is too small to improve maintainability.
- Impact: Critical.
- Mitigation: hard acceptance gate `wc -l src/app.js <= 4200` from baseline 12163 (>= 65% reduction).

## R3 State transition drift during extraction
- Risk: start/stop/clear/board-switch semantics change subtly.
- Impact: Critical.
- Mitigation: extract with compatibility wrappers and run lifecycle parity matrix after each state/domain slice.

## R4 UI and input arbitration regressions
- Risk: pointer/keyboard/touch guards regress due to split event ownership.
- Impact: Critical.
- Mitigation: isolate input module contracts and execute deterministic interaction regression tests.

## R5 Render lifecycle regressions in `/output/final`
- Risk: render pipeline extraction introduces visual or timing drift in final output.
- Impact: Critical.
- Mitigation: keep render extraction late in 9-1 and gate with dedicated `/output/final` parity checks.

## R6 Persistence/API behavior drifts while moving code
- Risk: save/load/migration or API preflight behavior changes unintentionally.
- Impact: Critical.
- Mitigation: preserve existing contracts; run persistence and API parity tests before each merge slice.

## R7 Comment uplift becomes noise instead of clarity
- Risk: comments duplicate code and reduce readability.
- Impact: Medium.
- Mitigation: enforce comment policy: only non-obvious intent, invariants, and lifecycle boundaries.

## R8 Structured logs become too noisy
- Risk: logging expansion floods console and obscures useful diagnostics.
- Impact: High.
- Mitigation: centralized logger with level gates, scoped events, and explicit hot-path suppression.

## R9 Temporary adapters become permanent debt
- Risk: compatibility shims stay after extraction and increase complexity.
- Impact: High.
- Mitigation: mark each adapter with removal criteria and close with Plan 9-2 cleanup tasks.

## R10 Artifact drift across phase/global trackers
- Risk: phase files and global tracking files become inconsistent.
- Impact: High.
- Mitigation: mandatory full artifact sync in P9-HF1-T10.

## R11 Regression escape during mandatory domain extractions
- Risk: editor/runtime/sync/settings/media extraction introduces hidden behavior drift.
- Impact: Critical.
- Mitigation: strict regression matrix after each domain slice and full-matrix rerun before closure.

## Execution Notes

- 9-1 evidence exists but acceptance remains open due to unmet mandatory reduction objective.
- 9-HF1 hard-gate wave executed with measurable monolith shrink PASS (`src/app.js` now 28 lines).
