# Phase 9 Tasks

Status legend: TODO | IN-PROGRESS | DONE | REJECTED
Priority labels: [P0] critical | [P1] high | [P2] medium

## Plan 9-HF1 - Mandatory app.js decomposition recovery wave (completed baseline)
- [x] DONE P9-HF1-T1 [P0] Create extraction map for mandatory domains: editor, runtime orchestration, sync handlers, settings controllers, media handlers.
- [x] DONE P9-HF1-T2 [P0] Extract editor flows from `src/app.js` into dedicated modules with stable call contracts.
- [x] DONE P9-HF1-T3 [P0] Extract animation runtime orchestration from `src/app.js` into runtime/render modules.
- [x] DONE P9-HF1-T4 [P0] Extract sync command handlers from `src/app.js` into sync/api modules with deterministic routing.
- [x] DONE P9-HF1-T5 [P0] Extract settings controllers from `src/app.js` into dedicated UI controller modules.
- [x] DONE P9-HF1-T6 [P0] Extract media handlers from `src/app.js` into media-focused modules with unchanged behavior.
- [x] DONE P9-HF1-T7 [P0] Enforce thin-bootstrap ownership in `src/app.js`.
- [x] DONE P9-HF1-T8 [P0] Pass strict regression matrix: runtime lifecycle, editor flows, sync commands, settings sync, media playback, persistence, API save flow, `/output/final`.
- [x] DONE P9-HF1-T9 [P0] Enforce measurable gate: `wc -l src/app.js` <= 4200 lines.
- [x] DONE P9-HF1-T10 [P0] Synchronize all planning artifacts after PASS evidence.

## Plan 9-HF2 - Mandatory lifecycle/no-replay stabilization wave (completed baseline)
- [x] DONE P9-HF2-T1 [P0] Implement lifecycle rehydrate reconciliation for elapsed one-shot events as terminal/completed states.
- [x] DONE P9-HF2-T2 [P0] Add strict no-replay guard for expired one-shot events across reload/reconnect.
- [x] DONE P9-HF2-T3 [P0] Enforce deterministic lifecycle parity between rehydrate and synced reconnect/join apply.
- [x] DONE P9-HF2-T4 [P0] Introduce frame-budget-aware low-end hardening baseline.
- [x] DONE P9-HF2-T5 [P0] Add particle/effect caps and non-critical coalescing under pressure.
- [x] DONE P9-HF2-T6 [P0] Validate sync invariants under hardening logic.
- [x] DONE P9-HF2-T7 [P0] Execute long-run soak matrix with no-replay assertions.
- [x] DONE P9-HF2-T8 [P0] Execute low-end mobile stress matrix.
- [x] DONE P9-HF2-T9 [P0] Record evidence artifacts and synchronize planning files.

## Plan 9-HF3 - Video-performance wave (executed, gate revoked)
- [x] DONE P9-HF3-T1 [P0] Build reproducible video-heavy profiling baseline.
- [x] DONE P9-HF3-T2 [P0] Optimize video decode/render scheduling path.
- [x] DONE P9-HF3-T3 [P0] Implement deterministic video buffering/warmup path.
- [x] DONE P9-HF3-T4 [P0] Improve video draw strategy under load.
- [x] DONE P9-HF3-T5 [P0] Add final-output-first runtime prioritization.
- [x] DONE P9-HF3-T6 [P0] Preserve control-view responsiveness under priority policy.
- [x] DONE P9-HF3-T7 [P0] Add adaptive weak-device quality/load ladder.
- [x] DONE P9-HF3-T8 [P0] Execute strict video-heavy performance regression suite.
- [x] DONE P9-HF3-T9 [P0] Validate non-regression for sync/lifecycle/stop determinism.
- [x] REJECTED P9-HF3-GATE [P0] Real-runtime feedback reopens gate: start/stop reliability, startup duplication, board-switch parity, and `/output/final` load reliability are regressed.

## Plan 9-HF4 - Reliability-first stabilization and simplification wave (execute-ready, hard-gated)
- [x] DONE P9-HF4-T1 [P0] Capture deterministic FAIL reproductions for: unreliable start/stop, startup phantom/duplicate runs, board-switch image mismatch, and `/output/final` load failures.
- [x] DONE P9-HF4-T2 [P0] Unify start/stop runtime path into a single deterministic control flow; remove ambiguous competing paths.
- [x] DONE P9-HF4-T3 [P0] Enforce startup invariants: zero phantom running entries and zero duplicate outside runs after hydration/bootstrap.
- [x] DONE P9-HF4-T4 [P0] Implement atomic board switch apply pipeline so board image and polygons update together across all clients.
- [x] DONE P9-HF4-T5 [P0] Harden `/output/final` bootstrap and reconnect loading with deterministic readiness/attach guards.
- [x] DONE P9-HF4-T6 [P0] Re-evaluate HF3 scheduler complexity; remove or disable destabilizing paths while retaining only required low-end smoothness protections.
- [x] DONE P9-HF4-T7 [P0] Add fail-safe runtime feature flags/profile levels (`safe`/`balanced`/`aggressive`) with safe default and emergency disable path.
- [x] DONE P9-HF4-T8 [P0] Validate deterministic server-authoritative sync (ordering/version/idempotent apply) and mobile->pi reliability under simplified runtime.
- [x] DONE P9-HF4-T9 [P0] Execute explicit FAIL->PASS regression matrix and runtime smoke journeys for core operator flows.
- [ ] TODO P9-HF4-T10 [P0] Synchronize all planning artifacts (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`) after HF4 PASS.

## Plan 9-2 - Hardening wave (after 9-HF4 PASS)
- [ ] TODO P9-T13 [P1] Remove temporary compatibility adapters no longer needed after validated parity.
- [ ] TODO P9-T14 [P1] Refine module dependency graph and enforce import direction checks.
- [ ] TODO P9-T15 [P1] Expand diagnostics with focused debug traces for rare field issues (behind config gates).

## Plan 9-3 - Production gate wave (after 9-2)
- [ ] TODO P9-T16 [P1] Execute multi-client real-setup maintainability regression sweep (control + `/output/final`).
- [ ] TODO P9-T17 [P1] Final operator/developer sign-off and phase closure checklist.
