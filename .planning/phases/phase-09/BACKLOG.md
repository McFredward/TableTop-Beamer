# Phase 9 Backlog (Replanned)

## Acceptance Correction
- 9-1 execution exists, but 9-1 is not accepted.
- New priority wave: 9-HF1 (mandatory monolith reduction + hard gates).

## Epics
- 9-HF1 Mandatory Monolith Reduction Recovery
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
- P9-HF1-S1 Extract editor flows from `src/app.js` into `src/app/ui/*` + `src/app/domain/*` modules with explicit interfaces.
- P9-HF1-S2 Extract animation runtime orchestration from `src/app.js` into `src/app/render/*` and runtime orchestration modules.
- P9-HF1-S3 Extract sync command handlers from `src/app.js` into `src/app/api/*` or sync-focused modules with deterministic command routing.
- P9-HF1-S4 Extract settings controllers from `src/app.js` into `src/app/ui/*` with state-synced controller boundaries.
- P9-HF1-S5 Extract media handlers from `src/app.js` into `src/app/gif/*` and media lifecycle modules with parity contracts.
- P9-HF1-S6 Enforce thin-bootstrap-only ownership for `src/app.js` and remove remaining feature logic.
- P9-HF1-S7 Enforce measurable reduction gate: `src/app.js` must be <= 4200 lines (from 12163 baseline).
- P9-HF1-S8 Execute strict regression matrix (runtime, editor, sync, settings, media, persistence, API save, `/output/final`) with evidence.
- P9-HF1-S9 Synchronize all phase/global planning artifacts after HF1 closure.

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

## Prioritized Execution Wave (P0) - Plan 9-HF1 execute-ready
- Story P9-HF1-S1 + P9-HF1-S4.
  - Goal: editor flows + settings controllers leave `src/app.js` and become modular UI/domain units.
- Story P9-HF1-S2 + P9-HF1-S5.
  - Goal: animation runtime orchestration + media handlers leave `src/app.js` with parity-safe module seams.
- Story P9-HF1-S3.
  - Goal: sync command handling leaves `src/app.js` and becomes deterministic through dedicated handlers.
- Story P9-HF1-S6.
  - Goal: `src/app.js` becomes thin bootstrap/composition layer only.
- Story P9-HF1-S7.
  - Goal: enforce hard measurable shrink gate (`src/app.js` <= 4200 lines, baseline 12163).
- Story P9-HF1-S8.
  - Goal: strict full regression matrix is PASS and evidence-backed.
- Story P9-HF1-S9.
  - Goal: phase + global artifacts are fully synchronized.

## Execution Status Update

- Plan 9-1 executed and documented, but rejected by acceptance correction.
- Plan 9-HF1 recovery wave completed; hard gates and reduction target are PASS.
