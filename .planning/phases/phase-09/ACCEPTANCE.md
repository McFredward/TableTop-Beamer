# Phase 9 Acceptance

## Regression and Verification Strategy
- Safety-first extraction: behavior parity is mandatory at each modularization slice.
- Interface-first: each module boundary must have explicit ownership and dependency direction.
- Comment-quality-first: comments explain intent/invariants, not obvious code mechanics.
- Diagnostics-first: logs must improve operability with structured context and low noise.
- Evidence-first: every P0 extraction step requires smoke or regression evidence.

## Mandatory Matrix (Plan 9-1)
- Monolith-Boundary-Map-Test: extraction ownership map exists and covers all major `src/app.js` responsibility groups.
- Thin-Bootstrap-Test: `src/app.js` is reduced to startup/composition orchestration with no major feature logic blocks.
- Shared-Utility-Extraction-Test: duplicated helpers are consolidated in `src/app/shared/*` and behavior remains unchanged.
- State-Transition-Parity-Test: start/stop/clear/board-switch state transitions remain deterministic after extraction.
- Domain-Parity-Test: room/play-area/animation business rules stay functionally identical under extracted domain modules.
- UI-Controller-Parity-Test: settings/dashboard controls remain synchronized with runtime state.
- Input-Arbitration-Parity-Test: pointer/keyboard/touch/pan guard semantics remain deterministic and non-regressive.
- Render-Lifecycle-Parity-Test: render/update/clip lifecycle remains stable in control view and `/output/final`.
- Media-Playback-Parity-Test: GIF/mp4/coded playback behavior remains unchanged under modularized media paths.
- Persistence-Parity-Test: save/reload/restart/defaults and migration behavior remains deterministic.
- API-Save-Parity-Test: preflight/endpoint resolution/save diagnostics remain functionally equivalent.
- Comment-Coverage-Quality-Test: non-obvious state/render/sync/integration logic has meaningful English comments.
- Structured-Logging-Contract-Test: logs use centralized structured format with scope/level/context fields.
- Logging-Noise-Guard-Test: hot paths do not flood logs under normal runtime conditions.
- Non-Regression-Full-Matrix-Test: core runtime lifecycle and operator flows remain stable after extraction wave.

## Incremental Mandatory Gates
- After P9-T1: extraction boundary map is approved and rollback strategy per slice is documented.
- After P9-T2..P9-T3: thin bootstrap + shared utility extraction are parity-safe.
- After P9-T4..P9-T5: state/domain extraction passes lifecycle and model parity checks.
- After P9-T6..P9-T7: UI/input extraction passes deterministic interaction and control-sync checks.
- After P9-T8: render/media extraction passes visual and lifecycle parity checks including `/output/final`.
- After P9-T9..P9-T10: comment and logging uplift checks pass (quality + low-noise).
- After P9-T11..P9-T12: full regression evidence is PASS and all planning artifacts are synchronized.

## Definition of Done
- `src/app.js` is no longer a feature monolith and acts as a thin bootstrap entry.
- Module layout under `src/app/*` is coherent, predictable, and aligned to boundary ownership.
- Non-obvious lifecycle and integration logic is documented with meaningful English comments.
- Structured logging is centralized, contextual, and operationally useful without excessive noise.
- No regression in runtime behavior, persistence/migration, API save flow, or `/output/final`.
- Phase-09 artifacts and global tracking files are synchronized.

## Plan 9-1 Closure Note

- Acceptance matrix evidence is recorded in `9-1-VERIFICATION.md`.
- Logging contract moved to centralized scoped logger with low-noise default level gate.
