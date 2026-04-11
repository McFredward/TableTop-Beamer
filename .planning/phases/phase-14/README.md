# Phase 14 — Refactoring + Module Split

Non-functional consolidation phase after the Phase 13 HF wave.

**Goal.** No new features. Shrink the repo's largest file (`src/app/runtime/runtime-orchestration.js`, 14.6k LOC), remove dead/legacy code, and split the monolith into thematic modules with a soft cap of ~1500 LOC each.

**Non-negotiable guard.** Every Phase 11 / 12 / 13 acceptance-regression harness must remain GREEN after every task in this phase. Behavior does not change.

## Plans

1. **Plan 14-1** — Inventory + Dead Code Purge.
2. **Plan 14-2** — Runtime Module Split (`runtime-orchestration.js` → domain modules).

## Context

`src/app/runtime/runtime-orchestration.js` grew from ~10k to ~14.6k LOC across Phases 11, 12, 13, and the thirteen Phase 13 hotfixes. It contains 549 top-level `function` declarations, most of which depend on shared module-scope state (`state`, `liveSync`, DOM refs, stage-geometry cache, polygon drag session, touch gesture machine, etc.).

Splitting it naively would explode the import graph. The refactor must therefore:

- Decide module boundaries that match domain cohesion (draw loop, room polygon editor, touch gesture machine, zoom, live-sync glue, UI panel binding, startup/hydrate, etc.).
- Introduce shared state accessors where modules need to read/write the same store, instead of importing `state` directly from multiple files.
- Preserve the existing single-file startup order — the runtime file is currently loaded as one script and relies on hoisting and declaration order.
- Ship in atomic, verifiable slices: each extraction leaves the runtime in a green state; no half-extracted module stays on `master`.
