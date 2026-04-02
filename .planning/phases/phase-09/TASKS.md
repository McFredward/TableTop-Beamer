# Phase 9 Tasks

Status legend: TODO | IN-PROGRESS | DONE
Priority labels: [P0] critical | [P1] high | [P2] medium

## Plan 9-1 - Modular Refactor + Maintainability Uplift Core Wave (first execute-ready wave)
- [x] DONE P9-T1 [P0] Create and commit the extraction boundary map from `src/app.js` to `src/app/{boot,state,domain,render,ui,input,persistence,api,gif,shared}`.
- [x] DONE P9-T2 [P0] Introduce thin bootstrap contract in `src/app.js` and move composition wiring to `src/app/boot/*` with parity adapters.
- [x] DONE P9-T3 [P0] Extract pure/shared helper blocks first into `src/app/shared/*` and replace inline duplicates with imports.
- [x] DONE P9-T4 [P0] Extract state transition/selectors/runtime lifecycle helpers into `src/app/state/*` while preserving current state schema.
- [x] DONE P9-T5 [P0] Extract domain operations (room/play-area/animation business rules) into `src/app/domain/*` with unchanged behavior.
- [x] DONE P9-T6 [P0] Extract UI controllers/bindings (dashboard/settings sync) into `src/app/ui/*` using explicit interface contracts.
- [x] DONE P9-T7 [P0] Extract input arbitration (pointer/keyboard/touch/pan guards) into `src/app/input/*` and keep deterministic interactions.
- [x] DONE P9-T8 [P0] Extract render and media lifecycle blocks into `src/app/render/*` and `src/app/gif/*` without `/output/final` regressions.
- [x] DONE P9-T9 [P0] Add meaningful English comments at non-obvious lifecycle/state/render/integration hotspots across extracted modules.
- [ ] TODO P9-T10 [P0] Implement centralized structured logging utility and migrate high-value diagnostics checkpoints.
- [ ] TODO P9-T11 [P0] Execute staged regression matrix (runtime, settings/dashboard, save/load, API save flow, `/output/final`) and record evidence.
- [ ] TODO P9-T12 [P0] Complete artifact sync: `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 9-2 - Hardening Wave (after 9-1)
- [ ] TODO P9-T13 [P1] Remove temporary compatibility adapters no longer needed after validated extraction parity.
- [ ] TODO P9-T14 [P1] Refine module dependency graph and enforce import direction checks.
- [ ] TODO P9-T15 [P1] Expand diagnostics with focused debug traces for rare field issues (behind config gates).

## Plan 9-3 - Production Gate Wave (after 9-2)
- [ ] TODO P9-T16 [P1] Execute multi-client real-setup maintainability regression sweep (control + `/output/final`).
- [ ] TODO P9-T17 [P1] Final operator/developer sign-off and phase closure checklist.
