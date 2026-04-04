# Phase 10 Tasks

Status legend: TODO | IN-PROGRESS | DONE | REJECTED
Priority labels: [P0] critical | [P1] high | [P2] medium

## Plan 10-HF1 - Critical final-output blackout hotfix wave (execute-ready, hard-gated)
- [x] DONE P10-HF1-T1 [P0] Reproduce and root-cause `/output/final` black-screen regression on board `Nemesis Lockdown A` with outside `sandstorm.mp4`.
- [x] DONE P10-HF1-T2 [P0] Fix board/media-specific render short-circuit so final-output composition path cannot collapse to black.
- [x] DONE P10-HF1-T3 [P0] Enforce guaranteed co-render contract on `/output/final`: active room animations and active outside animations both render.
- [x] DONE P10-HF1-T4 [P0] Preserve sync determinism and existing controls (`stop outside`, `clear all`, global toggles, ordering/version/idempotent apply).
- [x] DONE P10-HF1-T5 [P0] Execute full board regression matrix including mp4 outside-background boards and non-mp4 boards with PASS evidence.
- [x] DONE P10-HF1-T6 [P0] Synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` after HF1 PASS.

## Plan 10-HF2 - Generic polygon hydration/apply hardening wave (execute-ready, hard-gated)
- [x] DONE P10-HF2-T1 [P0] Reproduce cross-browser polygon load/apply failures (`inside`/`outside` + `playAreas`) on startup/reload/default-apply (Chrome/Firefox desktop + mobile-class emulation where possible).
- [x] DONE P10-HF2-T2 [P0] Implement canonical polygon schema normalization for persisted payloads and defaults (legacy aliases -> canonical contract).
- [x] DONE P10-HF2-T3 [P0] Add deterministic validation + fallback contract that never silently overwrites valid persisted board polygons.
- [x] DONE P10-HF2-T4 [P0] Enforce `apply global defaults` precedence rules so board-specific polygons survive defaults apply unless explicit reset path is requested.
- [x] DONE P10-HF2-T5 [P0] Harden `/output/final` hydration/render path to use canonical polygons browser-neutrally (no default-rectangle clipping drift).
- [x] DONE P10-HF2-T6 [P0] Eliminate valid-polygon black-screen path outside Chrome by fail-open hydration guards and canonical clip-source wiring.
- [x] DONE P10-HF2-T7 [P0] Run strict imported-board non-regression + all-browser regression matrix with PASS evidence.
- [x] DONE P10-HF2-T8 [P0] Synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` after HF2 PASS.

## Plan 10-HF3 - Mandatory P0 recovery wave (execute-ready, hard-gated)
- [x] DONE P10-HF3-T1 [P0] Create deterministic failing test for symptom A: `Nemesis Lockdown A` polygons are not applied in Firefox/mobile-class behavior path.
- [x] DONE P10-HF3-T2 [P0] Create deterministic failing test for symptom B: `apply global defaults` unexpectedly shows default polygons over valid board polygons.
- [x] DONE P10-HF3-T3 [P0] Create deterministic failing test for symptom C: `/output/final` renders black or fallback rectangle when valid polygons exist.
- [x] DONE P10-HF3-T4 [P0] Add executable lifecycle diagnostics with assertions for startup/load/apply-defaults/reload polygon ownership and apply order.
- [x] DONE P10-HF3-T5 [P0] Add board-switch + `/output/final` render contract assertions (canonical polygon clip source must remain board-specific).
- [x] DONE P10-HF3-T6 [P0] Add canonical polygon source selection assertions for control + final-output paths.
- [x] DONE P10-HF3-T7 [P0] Implement generic root-cause fix based on failing tests/diagnostics (no board-specific conditions).
- [x] DONE P10-HF3-T8 [P0] Re-run tests and capture explicit FAIL->PASS evidence for T1..T6.
- [x] DONE P10-HF3-T9 [P0] Run imported-board and browser matrix non-regression after fix (Chrome/Firefox desktop + mobile-class emulation where possible).
- [x] DONE P10-HF3-T10 [P0] Synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` after HF3 PASS.

## Plan 10-1 - Operator Speed Core Wave (execute-ready, unblocked after HF3 PASS)
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
