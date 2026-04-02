# Phase 9 Backlog (Prepared)

## Epics
- Monolith Decomposition Blueprint
- Thin Bootstrap and Composition Root
- State and Domain Extraction
- UI and Input Controller Extraction
- Render and Media Lifecycle Extraction
- Shared Utilities Consolidation
- English Comment Uplift
- Structured Logging and Diagnostics Uplift
- Regression and Rollback Hardening

## Story Mapping
- P9-S1.1 Define the canonical extraction map from `src/app.js` to `src/app/*` boundaries.
- P9-S1.2 Document dependency directions and anti-coupling rules for new modules.
- P9-S1.3 Establish incremental extraction order with rollback notes per slice.

- P9-S2.1 Reduce `src/app.js` to bootstrap responsibilities only.
- P9-S2.2 Move startup wiring into `src/app/boot/*` composition helpers.
- P9-S2.3 Keep bootstrap parity via adapter layer until extraction completion.

- P9-S3.1 Extract runtime state transition helpers from monolith into `src/app/state/*`.
- P9-S3.2 Extract domain model operations into `src/app/domain/*`.
- P9-S3.3 Preserve existing state schema and migration compatibility.

- P9-S4.1 Extract settings/dashboard UI controllers into `src/app/ui/*`.
- P9-S4.2 Extract pointer/keyboard/touch arbitration into `src/app/input/*`.
- P9-S4.3 Keep event lifecycle deterministic with explicit module interfaces.

- P9-S5.1 Extract rendering orchestration and clipping/layer lifecycle into `src/app/render/*`.
- P9-S5.2 Extract media/GIF playback responsibilities into `src/app/gif/*`.
- P9-S5.3 Keep `/output/final` and control-view rendering behavior parity.

- P9-S6.1 Consolidate pure helpers/constants/normalizers under `src/app/shared/*`.
- P9-S6.2 Remove duplicated helper logic from extracted modules.
- P9-S6.3 Enforce pure utility boundaries (no side-effects in shared helpers).

- P9-S7.1 Add meaningful English comments for non-obvious state transitions.
- P9-S7.2 Add meaningful English comments for render/sync lifecycle and integration boundaries.
- P9-S7.3 Avoid obvious/noise comments; comments must explain intent/invariants.

- P9-S8.1 Implement centralized structured logger utility with scope and level control.
- P9-S8.2 Add high-value logs for bootstrap/state/api/persistence/render checkpoints.
- P9-S8.3 Add low-noise guards and metadata conventions for diagnostics.

- P9-S9.1 Execute staged regression matrix after each extraction slice.
- P9-S9.2 Record parity evidence and known-risk outcomes for 9-1 closure.
- P9-S9.3 Synchronize phase and global planning artifacts.

## Prioritized First Execution Wave (P0) - Plan 9-1 execute-ready
- Story P9-S1.1 + P9-S1.2 + P9-S1.3.
  - Goal: extraction map and dependency safety contract are fixed before edits.
- Story P9-S2.1 + P9-S2.2 + P9-S2.3.
  - Goal: monolith entry shrinks to thin bootstrap with compatibility adapters.
- Story P9-S3.1 + P9-S3.2 + P9-S3.3.
  - Goal: state/domain isolation without schema/runtime behavior drift.
- Story P9-S4.1 + P9-S4.2 + P9-S4.3.
  - Goal: UI/input lifecycle becomes modular with deterministic event ownership.
- Story P9-S5.1 + P9-S5.2 + P9-S5.3.
  - Goal: render/media lifecycles are isolated while preserving visual parity.
- Story P9-S6.1 + P9-S6.2 + P9-S6.3.
  - Goal: shared utility layer is clean, pure, and reused.
- Story P9-S7.1 + P9-S7.2 + P9-S7.3.
  - Goal: comment coverage improves comprehension at high-risk logic points.
- Story P9-S8.1 + P9-S8.2 + P9-S8.3.
  - Goal: structured diagnostics improve operability with controlled noise.
- Story P9-S9.1 + P9-S9.2 + P9-S9.3.
  - Goal: regression evidence and synchronized artifacts close 9-1 safely.

## Execution Status Update

- Plan 9-1 executed and committed incrementally.
- Verification artifacts: `9-1-BOUNDARY-MAP.md`, `9-1-VERIFICATION.md`.
