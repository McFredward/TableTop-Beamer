# Phase 11 Tasks

Status legend: TODO | IN-PROGRESS | DONE | REJECTED
Priority labels: [P0] critical | [P1] high | [P2] medium

## Plan 11-1 - Operator UX acceleration core wave (execute-ready)
- [x] DONE P11-T1 [P0] Define settings sub-tab IA map and logical grouping taxonomy.
- [x] DONE P11-T2 [P0] Implement settings sub-tab shell and preserve draft state across tab switches.
- [x] DONE P11-T3 [P0] Implement shared quick-mode state machine (`off`/`activate`/`deactivate`/`clear`) with explicit visible mode indicator.
- [x] DONE P11-T4 [P0] Implement rapid activation mode: apply selected animation by sequential room taps/clicks.
- [x] DONE P11-T5 [P0] Implement rapid deactivation mode: remove selected animation by sequential room taps/clicks.
- [x] DONE P11-T6 [P0] Implement rapid clear mode: remove all animations from tapped rooms.
- [x] DONE P11-T7 [P0] Add mode-switch/inflight conflict guards and deterministic arbitration.
- [x] DONE P11-T8 [P0] Add explicit operator feedback for quick-mode action success/failure/timeout.
- [x] DONE P11-T9 [P0] Implement mobile-first one-handed action rail (sticky placement, thumb reach, large taps).
- [x] DONE P11-T10 [P0] Preserve mobile board overview during rapid operations (no control occlusion drift).
- [x] DONE P11-T11 [P0] Execute rapid-operation acceptance and non-regression matrix on desktop + mobile.
- [x] DONE P11-T12 [P0] Synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/README/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 11-HF1 - Mandatory bugfix/feature package (execute-ready, hard-gated)
- [x] DONE P11-HF1-T1 [P0] Create deterministic RED repro for outside mode first-apply sync lag (`Apply changes` required twice).
- [x] DONE P11-HF1-T2 [P0] Implement deterministic first-apply outside snapshot/apply propagation to `/output/final` and all connected clients.
- [x] DONE P11-HF1-T3 [P0] Create deterministic RED repro for expired one-shot global replay after reload/reconnect.
- [x] DONE P11-HF1-T4 [P0] Implement terminal lifecycle persistence/hydration guard so expired one-shot globals never replay.
- [x] DONE P11-HF1-T5 [P0] Add per-global-animation checkbox `Loop until stopped` in settings/editor with deterministic draft/apply semantics.
- [x] DONE P11-HF1-T6 [P0] Implement global runtime loop behavior for checked animations and explicit stop closure semantics.
- [x] DONE P11-HF1-T7 [P0] Remove room animation `Hold until I stop` checkbox from UI and settings schema usage.
- [x] DONE P11-HF1-T8 [P0] Enforce room animations as always-hold until stop and migrate legacy hold fields compatibly.
- [x] DONE P11-HF1-T9 [P0] Refactor board model/storage to remove imported-vs-non-imported split in folder structure and runtime paths.
- [x] DONE P11-HF1-T10 [P0] Add deterministic migration/compatibility path from legacy board storage layout to canonical catalog model.
- [x] DONE P11-HF1-T11 [P0] Execute strict acceptance and non-regression matrix for sync lifecycle, reload no-replay, loop/stop, room hold, and board model unification.
- [x] DONE P11-HF1-T12 [P0] Synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 11-HF2 - Critical global runtime recovery + dashboard loop UX correction (execute-ready, hard-gated)
- [x] DONE P11-HF2-T1 [P0] Create deterministic RED repro showing post-HF global animation start/runtime failure.
- [x] DONE P11-HF2-T2 [P0] Implement rollback-first recovery so global animations start/run deterministically again immediately.
- [ ] TODO P11-HF2-T3 [P0] Add `Loop until stopped` quick checkbox directly in Dashboard global controls (trigger-level control surface).
- [ ] TODO P11-HF2-T4 [P0] Wire per-trigger loop semantics into global trigger payload/runtime (`one-shot` vs `until explicit stop`) without editing animation definitions.
- [ ] TODO P11-HF2-T5 [P0] Preserve explicit `stop` and `clear` semantics unchanged for both per-trigger loop modes.
- [ ] TODO P11-HF2-T6 [P0] Execute regression matrix proving global start/stop/clear correctness on control + peers + `/output/final`.
- [ ] TODO P11-HF2-T7 [P0] Capture FAIL->PASS evidence that global animations start/stop correctly again after recovery patch.
- [ ] TODO P11-HF2-T8 [P0] Synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Next wave placeholder
- [ ] TODO P11-T13 [P1] Collect field telemetry/feedback from HF2 live sessions and prepare 11-2 refinement shortlist.
