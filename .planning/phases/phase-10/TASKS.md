# Phase 10 Tasks

Status legend: TODO | IN-PROGRESS | DONE | REJECTED
Priority labels: [P0] critical | [P1] high | [P2] medium

## Plan 10-HF1 - Critical final-output blackout hotfix wave (execute-ready, hard-gated)
- [x] DONE P10-HF1-T1 [P0] Reproduce and root-cause `/output/final` black-screen regression on board `Nemesis Lockdown A` with outside `sandstorm.mp4`.
- [x] DONE P10-HF1-T2 [P0] Fix board/media-specific render short-circuit so final-output composition path cannot collapse to black.
- [ ] TODO P10-HF1-T3 [P0] Enforce guaranteed co-render contract on `/output/final`: active room animations and active outside animations both render.
- [ ] TODO P10-HF1-T4 [P0] Preserve sync determinism and existing controls (`stop outside`, `clear all`, global toggles, ordering/version/idempotent apply).
- [ ] TODO P10-HF1-T5 [P0] Execute full board regression matrix including mp4 outside-background boards and non-mp4 boards with PASS evidence.
- [ ] TODO P10-HF1-T6 [P0] Synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` after HF1 PASS.

## Plan 10-1 - Operator Speed Core Wave (execute-ready, hard-gated)
- [ ] TODO P10-T1 [P0] Define Settings IA and sub-tab grouping map (navigation model + ownership of each existing control).
- [ ] TODO P10-T2 [P0] Implement Settings sub-tab UI shell with sticky, low-friction switching and preserved form state.
- [ ] TODO P10-T3 [P0] Introduce shared quick-mode state machine (`off`/`activate`/`deactivate`/`clear`) with explicit mode indicator.
- [ ] TODO P10-T4 [P0] Add quick activation mode: lock selected animation and apply to sequentially clicked rooms without draft reset.
- [ ] TODO P10-T5 [P0] Add quick deactivation mode: lock selected animation and remove it from sequentially clicked rooms deterministically.
- [ ] TODO P10-T6 [P0] Add quick clear mode: clear all room animations on sequential room clicks with immediate feedback.
- [ ] TODO P10-T7 [P0] Add conflict guards for rapid mode switching, duplicate taps, and inflight command overlap.
- [ ] TODO P10-T8 [P0] Implement mobile one-handed action rail (thumb zone placement, large tap targets, sticky visibility).
- [ ] TODO P10-T9 [P0] Improve mobile overview behavior during speed modes (board visibility + actionable controls without context loss).
- [ ] TODO P10-T10 [P0] Add deterministic operator feedback for each quick-mode action (status + error/timeout signal, no silent no-op).
- [ ] TODO P10-T11 [P0] Execute rapid-operation regression matrix for desktop + mobile, including sync ordering/version/idempotency assertions.
- [ ] TODO P10-T12 [P0] Synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` after PASS evidence.

## Plan 10-2 - Refinement Wave (after 10-1 PASS)
- [ ] TODO P10-T13 [P1] Apply UX polish from first field cycle (label clarity, spacing, visual hierarchy).
- [ ] TODO P10-T14 [P1] Optimize rapid-action responsiveness under sustained burst input.
- [ ] TODO P10-T15 [P1] Add targeted diagnostics for rare mode-transition race reports behind config gate.

## Plan 10-3 - Optional Preset Wave (after 10-2)
- [ ] TODO P10-T16 [P2] Evaluate quick-mode preset slots for common activation/deactivation combinations.
- [ ] TODO P10-T17 [P2] Validate preset safety semantics and prevent accidental broad-scoped application.
