# Phase 6 Workspace

Planning and execution workspace for the transition from Nemesis-only operation to a board-agnostic runtime with dynamic board catalog, server-side board import, English-only operator flow, room clusters, and the new polygon-editor safety/generalization wave.

- `PLAN.md`: target state, architecture decisions, scope, and migration strategy for Phase 6.
- `BACKLOG.md`: epic and story mapping for catalog/import, language unification, cluster flow, polygon-editor safety, and legacy migration.
- `TASKS.md`: prioritized execution waves; HF6 is completed and Plan 6-3 is the next wave.
- `ACCEPTANCE.md`: mandatory quality matrix for catalog behavior, persistence, English-flow policy, clusters, polygon-editor safety, and migration.
- `RISKS.md`: key risks for import safety, data integrity, cluster fanout consistency, language drift, and polygon-template integrity.
- `EXECUTE.md`: binding execution order and gates.
- `P6-HF1-LANGUAGE-SWEEP.md`: dedicated closure artifact for the verify-work-6 P0 blocker (`English-only operator flow`).

## Status

- Plan 6-1 is complete.
- Plan 6-HF1 is complete; the verify-work-6 language blocker is closed via dedicated sweep artifact.
- Plan 6-2 is complete (polygon safety split, Play-Area generalization, no-special-room visuals, room-from-template).
- Plan 6-HF2, 6-HF3, 6-HF4, 6-HF5, and 6-HF6 are complete; HF6 closes the vertex-click selection regression and adds a low-risk room-drag text-selection guard.
- Plan 6-3 is now the next hardening/operator verification wave.
