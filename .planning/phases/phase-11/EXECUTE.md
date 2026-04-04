# Execute Phase 11

## Priority
- Plan 11-1 remains completed PASS baseline.
- Plan 11-HF1 remains historical PASS but is field-corrected by new critical feedback.
- Execute Plan 11-HF2 immediately as mandatory P0 recovery wave.
- Plan 11-2 stays queued until 11-HF2 PASS.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 11-HF2 (binding)
1. P0 first: P11-HF2-T1 + P11-HF2-T2 (global runtime failure RED + rollback-first recovery).
2. P0 next: P11-HF2-T3 + P11-HF2-T4 (dashboard quick loop checkbox + per-trigger loop semantics).
3. P0 next: P11-HF2-T5 (preserve stop/clear semantics unchanged).
4. P0 closure: P11-HF2-T6 + P11-HF2-T7 (strict regression parity + FAIL->PASS evidence).
5. P0 final closure: P11-HF2-T8 (full artifact sync).

## Gate Rules
- Do not close HF2 without deterministic PASS proving global animations start/run again.
- Do not close HF2 without dashboard-level per-trigger loop toggle PASS.
- Do not close HF2 if loop behavior requires definition editing (hard fail).
- Do not close HF2 without explicit stop/clear non-regression PASS.
- Do not close wave without control/final parity PASS for global start/stop lifecycle.
- No closure without full planning tracker synchronization (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Update task status in `TASKS.md` after each completed item.
- Capture binding decisions in `.planning/STATE.md`.
- Keep `PLAN.md`, `BACKLOG.md`, `ACCEPTANCE.md`, and `RISKS.md` synchronized when scope changes.

## Execution Record
- Phase 11 started immediately after Phase 10 closure baseline (`10-HF9` PASS).
- First execution wave is Plan 11-1 (operator UX acceleration core package).
- Plan 11-1 implementation completed with quick-mode tap flows (`activate`/`deactivate`/`clear`), settings sub-tabs, and mobile one-hand rail safeguards.
- Verification evidence captured in `11-1-VERIFICATION.md` and `debug/p11-1-acceptance-regression-output.json`.
- New mandatory Phase-11 P0 package activates Plan 11-HF1 before 11-2:
  - Bugfix A: outside mode sync requires second apply click.
  - Bugfix B: expired global one-shot events replay on reload/reconnect.
  - Feature C: per-global-animation loop option (`until explicit stop`).
  - Feature D: room animation hold simplification (always hold; remove checkbox).
  - Feature E: board model/storage unification (remove imported/non-imported split).
- Critical correction after HF1 activates Plan 11-HF2 before 11-2:
  - Recovery A: global animations are currently broken and must be restored immediately via rollback/fix.
  - UX correction B: `Loop until stopped` is a dashboard global trigger checkbox (per trigger), not a definition-edit requirement.
  - Safety C: existing global `stop`/`clear` behavior must remain unchanged and proven by regression evidence.
