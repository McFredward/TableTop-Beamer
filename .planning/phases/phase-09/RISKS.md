# Phase 9 Risks

## R1 Extraction order causes hidden coupling regressions
- Risk: moving blocks from `src/app.js` in wrong sequence breaks implicit dependencies.
- Impact: Critical.
- Mitigation: enforce boundary map + branch-by-abstraction sequence with parity checks per slice.

## R2 Thin bootstrap still keeps feature logic
- Risk: `src/app.js` remains partially monolithic after incomplete extraction.
- Impact: High.
- Mitigation: strict bootstrap ownership gate before closing 9-1.

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
- Mitigation: mandatory full artifact sync in P9-T12.

## Execution Notes

- R3/R4/R5 mitigated in 9-1 via adapter-preserving extraction and regression guard evidence.
- R8 mitigated in 9-1 by introducing scoped, level-gated structured logger (`warn` default).
