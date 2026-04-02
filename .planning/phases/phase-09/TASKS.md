# Phase 9 Tasks

Status legend: TODO | IN-PROGRESS | DONE | REJECTED
Priority labels: [P0] critical | [P1] high | [P2] medium

## Plan 9-HF1 - Mandatory app.js decomposition recovery wave (execute-ready, hard-gated)
- [x] DONE P9-HF1-T1 [P0] Create the HF1 extraction map for mandatory domains: editor flows, animation runtime orchestration, sync command handlers, settings controllers, media handlers.
- [x] DONE P9-HF1-T2 [P0] Extract editor flows out of `src/app.js` into dedicated modules and keep call contracts stable.
- [x] DONE P9-HF1-T3 [P0] Extract animation runtime orchestration out of `src/app.js` into dedicated runtime/render modules.
- [x] DONE P9-HF1-T4 [P0] Extract sync command handlers out of `src/app.js` into dedicated sync/api modules with deterministic routing.
- [x] DONE P9-HF1-T5 [P0] Extract settings controllers out of `src/app.js` into dedicated UI controller modules.
- [x] DONE P9-HF1-T6 [P0] Extract media handlers out of `src/app.js` into `src/app/gif/*` or media-focused modules with unchanged behavior.
- [x] DONE P9-HF1-T7 [P0] Enforce thin-bootstrap ownership in `src/app.js` and remove remaining large feature blocks.
- [x] DONE P9-HF1-T8 [P0] Pass strict regression matrix: runtime lifecycle, editor flows, sync commands, settings sync, media playback, persistence, API save flow, `/output/final`.
- [x] DONE P9-HF1-T9 [P0] Enforce measurable gate: `wc -l src/app.js` must report <= 4200 lines (baseline 12163, >= 65% reduction).
- [x] DONE P9-HF1-T10 [P0] Sync all planning artifacts (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`) after PASS evidence.

## Plan 9-HF2 - Mandatory stability hotfix wave (execute-ready, hard-gated)
- [x] DONE P9-HF2-T1 [P0] Implement lifecycle rehydrate reconciliation so elapsed one-shot events are restored as terminal/completed states.
- [x] DONE P9-HF2-T2 [P0] Add strict no-replay guard for expired one-shot events (`Intruder Alert`, `Power Outage`, and same class) across reload/reconnect.
- [x] DONE P9-HF2-T3 [P0] Enforce deterministic lifecycle parity between local rehydrate and synced reconnect/join apply paths.
- [x] DONE P9-HF2-T4 [P0] Introduce frame-budget aware runtime hardening for weak/mobile devices (load shedding ladder + bounded degradation).
- [x] DONE P9-HF2-T5 [P0] Add particle/effect caps and non-critical update coalescing under pressure without semantic event loss.
- [x] DONE P9-HF2-T6 [P0] Validate deterministic sync invariants remain intact (ordering/version/idempotent apply) under hardening logic.
- [x] DONE P9-HF2-T7 [P0] Execute long-run soak matrix with reload/reconnect checkpoints and expired-event replay assertions.
- [x] DONE P9-HF2-T8 [P0] Execute low-end mobile stress matrix for frame stability, memory pressure tolerance, and graceful degradation behavior.
- [x] DONE P9-HF2-T9 [P0] Record evidence artifacts and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` after PASS.

## Plan 9-HF3 - Mandatory `/output/final` server-composed stream wave (execute-ready, hard-gated)
- [x] DONE P9-HF3-T1 [P0] Produce architecture decision record for `/output/final` server-composed stream feasibility (latency, quality, CPU shift, complexity, deployment).
- [x] DONE P9-HF3-T2 [P0] Implement server-side compositor pipeline fed by authoritative state snapshots without changing mutation/sync contracts.
- [x] DONE P9-HF3-T3 [P0] Expose stream delivery endpoint for `/output/final` and integrate final-output playback client path.
- [ ] TODO P9-HF3-T4 [P0] Add stream health monitoring and deterministic auto-fallback to existing client render path on stream degradation.
- [ ] TODO P9-HF3-T5 [P0] Add explicit operator override toggle for stream mode vs fallback mode to support rollout safety.
- [ ] TODO P9-HF3-T6 [P0] Preserve align-mode behavior parity across stream and fallback outputs (global authoritative ON/OFF semantics unchanged).
- [ ] TODO P9-HF3-T7 [P0] Validate deterministic sync invariants remain unchanged (ordering/version/idempotent apply) with stream mode enabled.
- [ ] TODO P9-HF3-T8 [P0] Validate control views remain interactive and responsive while final output uses server stream.
- [ ] TODO P9-HF3-T9 [P0] Execute weak-hardware evidence matrix (Raspberry Pi class) for smooth playback, quality floor, and fallback recovery.
- [ ] TODO P9-HF3-T10 [P0] Record evidence artifacts and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` after PASS.

## Plan 9-1 - Modular Refactor + Maintainability Uplift Core Wave (executed, not accepted)
- [x] REJECTED P9-1-GATE [P0] Acceptance gate status: not accepted by user correction; superseded by Plan 9-HF1 hard-gate recovery.
- [x] DONE P9-T1 [P0] Create and commit the extraction boundary map from `src/app.js` to `src/app/{boot,state,domain,render,ui,input,persistence,api,gif,shared}`.
- [x] DONE P9-T2 [P0] Introduce thin bootstrap contract in `src/app.js` and move composition wiring to `src/app/boot/*` with parity adapters.
- [x] DONE P9-T3 [P0] Extract pure/shared helper blocks first into `src/app/shared/*` and replace inline duplicates with imports.
- [x] DONE P9-T4 [P0] Extract state transition/selectors/runtime lifecycle helpers into `src/app/state/*` while preserving current state schema.
- [x] DONE P9-T5 [P0] Extract domain operations (room/play-area/animation business rules) into `src/app/domain/*` with unchanged behavior.
- [x] DONE P9-T6 [P0] Extract UI controllers/bindings (dashboard/settings sync) into `src/app/ui/*` using explicit interface contracts.
- [x] DONE P9-T7 [P0] Extract input arbitration (pointer/keyboard/touch/pan guards) into `src/app/input/*` and keep deterministic interactions.
- [x] DONE P9-T8 [P0] Extract render and media lifecycle blocks into `src/app/render/*` and `src/app/gif/*` without `/output/final` regressions.
- [x] DONE P9-T9 [P0] Add meaningful English comments at non-obvious lifecycle/state/render/integration hotspots across extracted modules.
- [x] DONE P9-T10 [P0] Implement centralized structured logging utility and migrate high-value diagnostics checkpoints.
- [x] DONE P9-T11 [P0] Execute staged regression matrix (runtime, settings/dashboard, save/load, API save flow, `/output/final`) and record evidence.
- [x] DONE P9-T12 [P0] Complete artifact sync: `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 9-2 - Hardening Wave (after 9-HF3 PASS)
- [ ] TODO P9-T13 [P1] Remove temporary compatibility adapters no longer needed after validated extraction parity.
- [ ] TODO P9-T14 [P1] Refine module dependency graph and enforce import direction checks.
- [ ] TODO P9-T15 [P1] Expand diagnostics with focused debug traces for rare field issues (behind config gates).

## Plan 9-3 - Production Gate Wave (after 9-2)
- [ ] TODO P9-T16 [P1] Execute multi-client real-setup maintainability regression sweep (control + `/output/final`).
- [ ] TODO P9-T17 [P1] Final operator/developer sign-off and phase closure checklist.
