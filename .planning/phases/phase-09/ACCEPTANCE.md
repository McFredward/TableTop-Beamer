# Phase 9 Acceptance

## Acceptance Correction
- Binding correction: Plan 9-1 is not accepted.
- New mandatory closure target is Plan 9-HF1 with hard gates below.

## Regression and Verification Strategy
- Safety-first extraction: behavior parity is mandatory at each modularization slice.
- Interface-first: each module boundary must have explicit ownership and dependency direction.
- Comment-quality-first: comments explain intent/invariants, not obvious code mechanics.
- Diagnostics-first: logs must improve operability with structured context and low noise.
- Evidence-first: every P0 extraction step requires smoke or regression evidence.

## Hard Gates (Plan 9-HF1, mandatory)
- G1 Mandatory-Domain-Extraction-Gate: `src/app.js` no longer contains large inlined feature blocks for editor flows, animation runtime orchestration, sync command handlers, settings controllers, or media handlers.
- G2 Thin-Bootstrap-Gate: `src/app.js` contains bootstrap/composition/orchestration only; feature decisions, controllers, and runtime handlers live in dedicated modules.
- G3 Strict-Regression-Gate: full matrix below must be PASS with evidence.
- G4 Measurable-Reduction-Gate: `src/app.js` must shrink from baseline 12163 lines to <= 4200 lines (`wc -l src/app.js`), equivalent to >= 65% reduction.

## Strict Regression Matrix (Plan 9-HF1)
- Boundary-Ownership-Test: extraction ownership map is current and maps all mandatory domains to concrete modules.
- Thin-Bootstrap-Test: startup still initializes all app flows while `src/app.js` remains orchestration-only.
- Editor-Flow-Parity-Test: selection, polygon edit, apply/save triggers, and settings panel flows remain deterministic.
- Runtime-Orchestration-Parity-Test: animation start/edit/stop/clear, lifecycle guards, and running list semantics remain unchanged.
- Sync-Command-Parity-Test: command dispatch/apply/ack behavior stays deterministic across clients.
- Settings-Controller-Parity-Test: dashboard/settings controls remain synchronized with runtime state.
- Media-Handler-Parity-Test: GIF/mp4/coded playback lifecycle remains stable.
- Persistence-Parity-Test: save/reload/restart/defaults and migrations remain deterministic.
- API-Save-Parity-Test: preflight/endpoint resolution/save diagnostics remain functionally equivalent.
- Render-Lifecycle-Parity-Test: control view and `/output/final` remain visually and lifecycle stable.
- Comment-Coverage-Quality-Test: only non-obvious logic receives meaningful English comments.
- Structured-Logging-Contract-Test: scoped structured logs remain centralized and low-noise by default.
- Non-Regression-Full-Matrix-Test: core operator runtime behavior remains stable end-to-end.

## Incremental Mandatory Gates
- After P9-HF1-T1: mandatory-domain extraction map and rollback sequence are approved.
- After P9-HF1-T2..T6: each extracted domain passes targeted parity checks before next domain extraction.
- After P9-HF1-T7: `src/app.js` ownership is bootstrap-only with no residual major feature blocks.
- After P9-HF1-T8: strict regression matrix is PASS.
- After P9-HF1-T9: measurable reduction gate is PASS (`src/app.js` <= 4200 lines).
- After P9-HF1-T10: all phase/global planning artifacts are synchronized.

## Definition of Done
- `src/app.js` is no longer a feature monolith and acts as a thin bootstrap entry.
- Module layout under `src/app/*` is coherent, predictable, and aligned to boundary ownership.
- Non-obvious lifecycle and integration logic is documented with meaningful English comments.
- Structured logging is centralized, contextual, and operationally useful without excessive noise.
- No regression in runtime behavior, persistence/migration, API save flow, or `/output/final`.
- `src/app.js` meets measurable shrink gate: <= 4200 lines from 12163 baseline (>= 65% reduction).
- Phase-09 artifacts and global tracking files are synchronized.

## Plan 9-1 Closure Note

- 9-1 evidence remains documented in `9-1-VERIFICATION.md`.
- Acceptance status is corrected to NOT ACCEPTED; closure now depends on Plan 9-HF1 hard gates.

## Plan 9-HF1 Closure Note

- Hard reduction gate achieved: `src/app.js` reduced from 12163 to 28 lines.
- Mandatory extraction artifacts are documented in `9-HF1-BOUNDARY-MAP.md` and `9-HF1-VERIFICATION.md`.
