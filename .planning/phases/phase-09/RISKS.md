# Phase 9 Risks

## Reopen context
- HF3 introduced critical regressions in field behavior.
- HF4 is now the binding P0 stabilization wave with reliability-first simplification.

## R1 Start/stop remains non-deterministic after partial fixes
- Risk: mixed lifecycle paths still race and produce lost starts/missed stops.
- Impact: Critical.
- Mitigation: single canonical control path, remove ambiguous alternate dispatch/apply branches, hard cycle tests.

## R2 Startup hydration still creates phantom/duplicate runs
- Risk: bootstrap and hydration phases apply stale or repeated run entries.
- Impact: Critical.
- Mitigation: startup idempotency guards, run-list dedup invariants, strict boot ordering.

## R3 Board switch parity still broken
- Risk: polygon context updates before board image or vice versa, causing split visuals.
- Impact: Critical.
- Mitigation: atomic board-context transaction with explicit image+polygon parity checks and rollback-safe apply.

## R4 `/output/final` intermittently fails to become render-ready
- Risk: bootstrap race/reconnect drift leaves final output blank/stuck.
- Impact: Critical.
- Mitigation: deterministic bootstrap readiness state machine and retry-safe attach flow.

## R5 Over-simplification regresses low-end smoothness
- Risk: removing complex scheduling may reintroduce weak-device stutter.
- Impact: High.
- Mitigation: retain only proven low-end guards, validate against bounded smoothness baseline before closure.

## R6 Aggressive optimizations cannot be safely disabled
- Risk: problematic runtime path remains always-on in field.
- Impact: Critical.
- Mitigation: runtime profiles (`safe`/`balanced`/`aggressive`) with safe default and emergency disable switch.

## R7 Sync determinism regresses while fixing runtime logic
- Risk: reliability fixes accidentally change authoritative ordering/version/idempotent semantics.
- Impact: Critical.
- Mitigation: mandatory determinism regression suite and invariant assertions in each gate step.

## R8 Mobile->pi propagation becomes inconsistent under stabilization changes
- Risk: controller actions apply differently across devices under reconnect/load.
- Impact: Critical.
- Mitigation: cross-role smoke matrix (mobile/pc/pi) with deterministic convergence and stop parity checks.

## R9 FAIL->PASS evidence quality is weak or non-reproducible
- Risk: closures rely on ad hoc PASS logs without confirmed original failure reproduction.
- Impact: High.
- Mitigation: each blocker requires scripted FAIL capture plus post-fix PASS in same evidence bundle.

## R10 Artifact drift across phase/global trackers
- Risk: plan updates diverge across phase docs and global state files.
- Impact: High.
- Mitigation: mandatory final sync task covering `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## HF4 execution note
- Reliability-first mitigations were implemented with startup invariants, atomic board switching, idempotent bootstrap, and runtime profile fail-safes.
