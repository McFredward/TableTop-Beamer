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

## Plan 10-HF4 - Critical runtime diagnostics follow-up wave (execute-ready, hard-gated)
- [x] DONE P10-HF4-T1 [P0] Create deterministic failing tests for `domain-modules-missing` covering `TT_BEAMER_RUNTIME_PANELS` load-order and global exposure failure modes.
- [x] DONE P10-HF4-T2 [P0] Add executable diagnostics for runtime panel module binding lifecycle and required global exposure contract.
- [x] DONE P10-HF4-T3 [P0] Implement root-cause fix for runtime panel module exposure/load-order path (browser-neutral, no board-specific branch).
- [x] DONE P10-HF4-T4 [P0] Create deterministic failing tests for `settings-ownership-violation` when `#outside-mode`/`#outside-direction` are conditionally unmounted.
- [x] DONE P10-HF4-T5 [P0] Harden settings ownership checks to validate only applicable mounted controls while preserving strict ownership for required controls.
- [x] DONE P10-HF4-T6 [P0] Create deterministic failing tests for `ship-clip-regression-violation` (invalid polygon accepted + valid multi-play-area/legacy states rejected).
- [x] DONE P10-HF4-T7 [P0] Correct ship-clip regression checker for canonical+legacy validity semantics and browser-neutral evaluation.
- [x] DONE P10-HF4-T8 [P0] Add Firefox/Chrome executable parity diagnostics and run matrix for HF4 scenarios.
- [x] DONE P10-HF4-T9 [P0] Enforce canonical-data-first `/output/final` render path so invalid-default fallback never wins when valid canonical polygons exist.
- [x] DONE P10-HF4-T10 [P0] Capture explicit FAIL->PASS evidence for T1..T9 and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 10-HF5 - Multi-play-area canonical fallback blocker wave (execute-ready, hard-gated)
- [x] DONE P10-HF5-T1 [P0] Create deterministic failing repro tests that contrast multi-play-area boards vs single-play-area boards under startup/reload/default-apply.
- [x] DONE P10-HF5-T2 [P0] Create deterministic failing repro for `Nemesis Lockdown A` showing default play area/fallback hex visibility despite valid canonical saved play-areas.
- [x] DONE P10-HF5-T3 [P0] Add Firefox-specific headless/automation diagnostics with parity traces against Chrome desktop and mobile-class Chrome.
- [x] DONE P10-HF5-T4 [P0] Add executable canonical source-selection + fallback-decision diagnostics for control-view and `/output/final`.
- [x] DONE P10-HF5-T5 [P0] Implement generic root-cause fix for wrong fallback to default play area on multi-area canonical payloads (no board-specific branch).
- [x] DONE P10-HF5-T6 [P0] Enforce one shared canonical play-area resolver contract across control-view and `/output/final`.
- [x] DONE P10-HF5-T7 [P0] Add lifecycle assertions for startup/reload/default-apply/board-switch parity with canonical saved play-areas.
- [x] DONE P10-HF5-T8 [P0] Execute Firefox/Chrome/mobile-class browser parity matrix for single-area + multi-area scenarios.
- [x] DONE P10-HF5-T9 [P0] Execute strict regression matrix for imported boards + multi-play-area boards.
- [x] DONE P10-HF5-T10 [P0] Capture explicit FAIL->PASS evidence for T1..T9 and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 10-HF6 - Multi-area retention parity blocker wave (execute-ready, hard-gated)
- [x] DONE P10-HF6-T1 [P0] Create deterministic RED repro for `Nemesis Lockdown Board A` proving area-drop in Firefox/mobile-class (`Play Area 1` only) versus Chrome (`Play Area 1` + `Bunker`).
- [x] DONE P10-HF6-T2 [P0] Add executable diagnostics to trace canonical source merge lineage (`saved profile`, `defaults`, `imported board payload`) and isolate first drop point.
- [x] DONE P10-HF6-T3 [P0] Create deterministic RED repro where fallback/default area replaces valid multi-area subset payloads.
- [x] DONE P10-HF6-T4 [P0] Add explicit cross-browser assertions for per-board `areaCount` parity (Chrome/Firefox/mobile-class Chrome).
- [x] DONE P10-HF6-T5 [P0] Add explicit cross-browser assertions for per-board canonical `areaIdSet` parity.
- [x] DONE P10-HF6-T6 [P0] Add explicit surface parity assertions that control-view and `/output/final` consume identical canonical play-area sets.
- [x] DONE P10-HF6-T7 [P0] Implement generic root-cause fix in merge/resolver path to retain valid multi-area entries deterministically (no board-specific branch).
- [x] DONE P10-HF6-T8 [P0] Enforce fallback guard so default area only fills truly missing/invalid data and never replaces valid subset multi-area data.
- [x] DONE P10-HF6-T9 [P0] Execute browser parity matrix + imported-board/multi-area strict non-regression matrix (startup/reload/default-apply/board-switch/final-output).
- [x] DONE P10-HF6-T10 [P0] Capture explicit FAIL->PASS evidence for T1..T9 and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 10-HF7 - Clean-start board-profile retention blocker wave (execute-ready, hard-gated)
- [x] DONE P10-HF7-T1 [P0] Create deterministic RED repro for clean local storage startup where valid multi-area board profile entries are missing and default play area is applied.
- [x] DONE P10-HF7-T2 [P0] Add executable diagnostics proving board-profile candidate extraction currently depends on loaded board catalog IDs.
- [x] DONE P10-HF7-T3 [P0] Create deterministic RED repro where migration drops unknown board keys (including imported/multi-area boards) when key set is not loaded yet.
- [x] DONE P10-HF7-T4 [P0] Implement root-cause fix: board-profile candidate extraction independent from loaded board list.
- [x] DONE P10-HF7-T5 [P0] Implement migration hardening to retain unknown board keys without fallback-loss side effects.
- [x] DONE P10-HF7-T6 [P0] Add deterministic lifecycle assertions for multi-play-area retention across startup/default-apply/reload.
- [x] DONE P10-HF7-T7 [P0] Execute browser parity + imported/multi-area strict non-regression matrix with clean-start coverage.
- [x] DONE P10-HF7-T8 [P0] Capture explicit FAIL->PASS evidence for T1..T7 and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 10-HF8 - All-board canonical play-area recovery blocker wave (execute-ready, hard-gated)
- [x] DONE P10-HF8-T1 [P0] Create deterministic RED repro proving all boards currently apply default fallback polygon instead of canonical saved play-areas.
- [x] DONE P10-HF8-T2 [P0] Create deterministic RED repro proving `Load global defaults` does not restore board-specific canonical play-areas.
- [x] DONE P10-HF8-T3 [P0] Add executable diagnostics for canonical source lineage and defaults-reapply decisions across startup/reload/default-apply/board-switch.
- [x] DONE P10-HF8-T4 [P0] Create deterministic RED repro proving canonical polygon load/apply failures are silently masked without explicit user-visible error.
- [x] DONE P10-HF8-T5 [P0] Implement generic canonical-load recovery fix so all boards load/apply play-areas from canonical saved sources deterministically.
- [x] DONE P10-HF8-T6 [P0] Implement defaults-reapply recovery fix so `Load global defaults` re-applies board-specific canonical play-areas.
- [x] DONE P10-HF8-T7 [P0] Enforce explicit error-surface contract (toast/status with board/source context) for canonical load/apply failures; no silent fallback masking.
- [ ] TODO P10-HF8-T8 [P0] Enforce strict control-view vs `/output/final` parity for canonical play-area set, `areaCount`, and `areaIdSet`.
- [ ] TODO P10-HF8-T9 [P0] Execute all-board regression matrix (single-area + multi-area + imported) across startup/reload/default-apply/board-switch/final-output on Chrome/Firefox/mobile-class.
- [ ] TODO P10-HF8-T10 [P0] Capture explicit FAIL->PASS evidence for T1..T9 and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 10-1 - Operator Speed Core Wave (execute-ready)
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
