# Phase 6 Workspace

Planning and execution workspace for the transition from Nemesis-only operation to a board-agnostic runtime with dynamic board catalog, server-side board import, English-only operator flow, and room clusters.

- `PLAN.md`: target state, architecture decisions, scope, and migration strategy for Phase 6.
- `BACKLOG.md`: epic and story mapping for catalog/import, language unification, cluster flow, and legacy migration.
- `TASKS.md`: prioritized execution waves; Plan 6-1 is the first execute-ready P0 wave.
- `ACCEPTANCE.md`: mandatory quality matrix for catalog behavior, persistence, English-flow policy, clusters, and migration.
- `RISKS.md`: key risks for import safety, data integrity, cluster fanout consistency, and language drift.
- `EXECUTE.md`: binding execution order and gates.
- `P6-HF1-LANGUAGE-SWEEP.md`: dedicated closure artifact for the verify-work-6 P0 blocker (`English-only operator flow`).

## Status

- Plan 6-1 is complete.
- verify-work follow-up flagged a remaining P0 blocker for English-only operator flow.
- Plan 6-HF1 is the execute-ready hotfix wave before Plan 6-2 (Control/Settings/Final-flow language sweep + docs consistency + regression evidence).
- Plan 6-2 (hardening/operator polish) starts only after 6-HF1 closure evidence is complete.
