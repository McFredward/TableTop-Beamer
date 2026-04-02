# Phase 9 Plan (Replanned after 9-1 rejection)

## Acceptance Correction
- User correction is binding: Plan 9-1 is executed but not accepted.
- New mandatory execution wave is Plan 9-HF1 and supersedes 9-2 as immediate next step.

## Target State
Phase 9 delivers a maintainability-first refactor that turns `src/app.js` (current baseline: 12163 lines via `wc -l src/app.js`) into a conventional modular runtime while preserving behavior. The application keeps the same operator-visible functionality, but ownership moves into predictable module boundaries: bootstrapping, state, domain, render, UI, input, persistence, API, media, and shared utilities. The result is a thin bootstrap entry, explicit integration seams, improved readability through focused English comments, and a practical structured logging strategy for runtime diagnosis.

## Mandatory Triggers
- `src/app.js` has become oversized and mixes many responsibilities in one file.
- Existing architecture folders under `src/app/*` exist but are only partially adopted.
- Debugging runtime lifecycle and sync/render issues is expensive due to sparse/inconsistent logs.
- Critical logic lacks comments where intent and transitions are not obvious.

## Binding Architecture Decisions
- Keep `src/app.js` as a thin bootstrap/composition entry only; feature logic must move to modules.
- Use domain-oriented boundaries, not technical dumping grounds:
  - `src/app/boot/*`: startup/composition orchestration.
  - `src/app/state/*`: runtime state contracts, reducers/selectors, lifecycle state transitions.
  - `src/app/domain/*`: business rules and model transforms.
  - `src/app/render/*`: rendering pipeline, clipping/masking, frame lifecycle.
  - `src/app/ui/*`: UI bindings, settings/dashboard controllers, sync from state to controls.
  - `src/app/input/*`: pointer/keyboard/touch interaction handling and guard arbitration.
  - `src/app/persistence/*`: storage schema, migrations, profile save/load.
  - `src/app/api/*`: API clients, transport/preflight/error classification.
  - `src/app/gif/*`: GIF/media playback abstractions.
  - `src/app/shared/*`: pure utilities/constants/normalizers only.
- Migration strategy is branch-by-abstraction: extract module -> wire adapter -> parity check -> remove legacy inline block.
- Logging is structured and tagged (`scope`, `event`, `boardId`, `animationId`, `version`, `source`) with explicit levels (`debug`, `info`, `warn`, `error`).
- Logging must be low-noise by default and controllable through a central config gate.
- Comment policy: add English comments only where behavior is non-obvious (state transitions, lifecycle ordering, sync contracts, rendering invariants, integration boundaries).
- No functional redesign in 9-HF1; only safe extraction + parity guards.

## Scope
- Decompose `src/app.js` into modular files with explicit ownership.
- Establish a stable composition root with dependency wiring and integration boundaries.
- Add targeted English comments in extracted modules and high-risk lifecycle logic.
- Implement centralized structured runtime logger and replace ad-hoc critical logs.
- Add regression guard strategy for extraction parity and rollback safety.
- Keep behavior parity across dashboard/settings, running lifecycle, render paths, persistence, API save flow, and final output.

## Out of Scope
- New operator features or UI redesign.
- Protocol changes to server APIs.
- Deep performance optimization beyond guard-level checks.
- Large schema redesign unrelated to extraction safety.

## Prioritized Next Execution Wave (Plan 9-HF1, execute-ready, hard-gated)
1. Extract large feature domains out of `src/app.js` first-class and completely: editor flows, animation runtime orchestration, sync command handlers, settings controllers, media handlers.
2. Keep `src/app.js` as thin orchestration/bootstrap only; move feature decisions and handlers into `src/app/*` modules.
3. Preserve behavior with strict regression matrix after each extraction slice and again at wave closure.
4. Enforce measurable monolith reduction gate from baseline 12163 lines to <= 4200 lines in `src/app.js` (>= 65% shrink required, no exceptions).
5. Maintain branch-by-abstraction safety: extract -> wire -> parity checks -> remove old inline block.
6. Close only after full artifact sync and explicit PASS evidence.

## Milestones
1. M1 Extraction Blueprint: canonical boundary map and dependency contract.
2. M2 Thin Bootstrap: `src/app.js` reduced to composition and startup orchestration.
3. M3 State/Domain Isolation: transitions and model logic leave monolith.
4. M4 UI/Input Isolation: controllers and interaction guards become modular.
5. M5 Render/Media Isolation: rendering and playback lifecycle moved behind module seams.
6. M6 Comment Uplift: high-value English comments added at non-obvious logic hotspots.
7. M7 Observability Uplift: structured logs with level discipline and runtime context.
8. M8 Regression Closure: behavior parity evidence and safe rollback path documented.

## Safe Incremental Migration Strategy
1. Baseline snapshot: capture current behavior and smoke matrix before extraction.
2. Extract pure functions first; keep call sites unchanged.
3. Extract state/domain sections with compatibility wrappers.
4. Extract UI/input sections with explicit event wiring adapters.
5. Extract render/media sections last in 9-1 due to highest runtime sensitivity.
6. After each extraction slice: run targeted smoke + non-regression checks.
7. Keep temporary adapters only until parity is verified, then remove dead inline blocks.
8. Maintain a rollback note per task to revert a single extraction step safely.

## Logging Strategy (Phase 9 binding)
- Add `createLogger` utility with scope labels and stable metadata fields.
- Log integration boundaries and lifecycle transitions, not every frame or input event.
- Required high-value log classes in 9-1:
  - bootstrap lifecycle (`init-start`, `init-ready`, `init-fail`)
  - state transition checkpoints for run start/stop/clear and board/context switch
  - persistence save/load/migration outcomes
  - API preflight/save endpoint resolution outcomes
  - render lifecycle guard failures and fallback paths
- Add guard against log spam in hot loops (frame/render/input move).

## Definition of Done
- `src/app.js` is a thin bootstrap entry, not a behavior monolith.
- Extracted modules follow predictable boundary ownership under `src/app/*`.
- Non-obvious lifecycle/state/render/integration code has meaningful English comments.
- Structured logging is centralized, contextual, and non-noisy by default.
- Parity checks show no regressions in runtime behavior, persistence, API save flow, and `/output/final`.
- `src/app.js` passes the hard size gate: <= 4200 lines and >= 65% reduction from 12163 baseline.
- Phase-09 artifacts and global trackers are synchronized.

## Execution Update

- Plan 9-1 remains documented but is not accepted per user correction.
- Plan 9-HF1 is complete with hard-gate evidence and measurable shrink (`src/app.js`: 12163 -> 28 lines).
