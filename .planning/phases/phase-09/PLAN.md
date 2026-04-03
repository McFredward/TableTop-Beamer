# Phase 9 Plan (Replanned after runtime P0 bugfix package)

## Acceptance Correction
- User correction remains binding: Plan 9-1 is executed but not accepted.
- Plan 9-HF1 and 9-HF2 remain completed as foundations.
- New mandatory execution wave is Plan 9-HF3 and supersedes 9-2 as immediate next step.

## New Mandatory Runtime Feedback (binding)
1. Polygon overlay alignment is offset in some browsers; deterministic coordinate mapping is required across browser/DPR/fullscreen states.
2. Critical `/output/final` render bug: after starting room `malfunction` (`mp4`), room GIF animations stop rendering in final output while still rendering in control view.
3. Weak hardware lags with many concurrent `mp4` streams; configurable quality/performance controls are mandatory to keep stable playback.
4. Action feedback gap: command/API failures and timeouts must always surface explicit user-facing errors (no silent no-op).

## Target State
Phase 9 now closes with browser-deterministic overlay coordinates, lifecycle-correct mixed media rendering on `/output/final`, weak-hardware performance controls for concurrent `mp4` load, and explicit operator-visible error feedback on command/API failure paths.

## Binding Architecture Decisions
- Preserve HF1 module boundaries; stability fixes land in dedicated lifecycle/runtime modules, not as new monolith blocks.
- Coordinate mapping ownership is explicit: one canonical viewport->stage->overlay transform shared by control and final render surfaces.
- Fullscreen, resize, and DPR transitions must recompute mapping deterministically without browser-specific drift.
- Mixed media lifecycle is explicit: `mp4` and GIF renderer lifecycles are isolated so one room start cannot starve/tear down unrelated renderers.
- Performance hardening uses deterministic degradation ladders (quality tiers/compression/defer) and must not alter sync correctness.
- Operator feedback contract is explicit: every failed/timeout command path emits actionable UI error feedback.
- Deterministic sync contract stays binding: idempotent apply, version monotonicity, no optimistic drift.

## Scope (9-HF3)
- Fix polygon overlay offset with deterministic coordinate mapping across browsers, DPR changes, and fullscreen transitions.
- Root-cause and fix mixed-media `/output/final` lifecycle bug where room `mp4` start (`malfunction`) suppresses room GIF rendering.
- Add configurable quality/performance profile controls for concurrent `mp4` pressure with deterministic degradation/recovery strategy.
- Add explicit toast/error feedback for failed or timed-out command/API actions; remove silent failures.
- Preserve deterministic multi-client sync and final-output parity under all hotfix paths.
- Produce cross-browser and weak-hardware evidence matrix with reproducible PASS criteria.

## Out of Scope
- New operator-facing features or UI redesign.
- Protocol redesign or non-essential server API changes.
- Non-deterministic adaptive behavior that can diverge across clients.
- Cosmetic tuning without measurable stability impact.

## Prioritized Next Execution Wave (Plan 9-HF3, execute-ready, hard-gated)
1. Implement canonical coordinate mapping and fullscreen/DPR recompute path to remove polygon overlay drift.
2. Fix mixed-media renderer lifecycle on `/output/final` so room GIF playback remains active after room `mp4` starts.
3. Add configurable quality/performance controls with deterministic `mp4` degrade strategy for weak hardware.
4. Add explicit toast/error surface for command/API failure and timeout outcomes (no silent no-op path).
5. Keep deterministic sync invariant intact (ordering/version/idempotent apply unchanged).
6. Execute browser matrix + final-output mixed-media regression + weak-hardware stress evidence.
7. Close only after full artifact synchronization and explicit gate PASS.

## Milestones
1. M1 Coordinate Determinism: polygon overlay maps identically across browser/DPR/fullscreen states.
2. M2 Mixed Media Lifecycle Fix: `/output/final` renders room GIF and room `mp4` animations without cross-type starvation.
3. M3 Performance Controls: quality tiers and degrade/recover strategy keep weak hardware stable under concurrent `mp4` load.
4. M4 Action Feedback Reliability: command/API failures and timeouts are always visible to operators.
5. M5 Determinism Preservation: sync behavior remains version-stable and idempotent under hotfix logic.
6. M6 Evidence Closure: browser/final-output/weak-hardware matrix passes with documented traces.

## Regression/Evidence Matrix Policy
- Browser mapping matrix: Chrome/Firefox/Safari-equivalent paths validate overlay coordinate parity with resize/fullscreen/DPR transitions.
- Mixed-media final-output lifecycle: start `malfunction` (`mp4`) then run room GIF flows; `/output/final` must keep GIF rendering parity with control view.
- Weak-hardware stress: concurrent `mp4` runs validate tiered degradation and stable playback without freeze/crash.
- Error feedback matrix: forced command/API failure and timeout paths must show explicit operator-visible error feedback.
- Deterministic sync: cross-client parity checks for ordering/version/idempotent apply under pressure.

## Definition of Done
- Polygon overlay alignment is deterministic across supported browsers and viewport/DPR/fullscreen transitions.
- `/output/final` mixed-media rendering remains stable: room `mp4` start does not suppress room GIF rendering.
- Runtime remains stable under concurrent `mp4` pressure on weak hardware via configurable quality/performance controls.
- Command/API failures and timeouts always produce explicit user-facing errors.
- Deterministic sync invariants remain intact with no ordering/version regressions.
- Regression/evidence matrix is PASS for browser mapping, mixed-media final-output, weak-hardware stress, and failure feedback.
- Phase-09 and global planning artifacts are synchronized.

## Execution Update

- Plan 9-1 remains documented but not accepted.
- Plan 9-HF1 remains completed foundation (`src/app.js`: 12163 -> 28 lines).
- Plan 9-HF2 is completed with lifecycle no-replay reconciliation, frame-budget hardening, and PASS evidence (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
- Plan 9-HF3 is completed with PASS evidence (`9-HF3-SUMMARY.md`, `P9-HF3-REGRESSION-EVIDENCE.md`) and unlocks Plan 9-2.
