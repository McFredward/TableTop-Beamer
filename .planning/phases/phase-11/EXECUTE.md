# Execute Phase 11

## Priority
- Plan 11-1, 11-HF1, 11-HF2, and 11-HF3 remain historical implementation baselines but are field-corrected by new critical feedback.
- Execute Plan 11-HF4 immediately as mandatory P0 recovery wave.
- Plan 11-2 stays queued until 11-HF4 PASS.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 11-HF4 (binding)
1. P0 first: P11-HF4-T1 + P11-HF4-T2 (non-loop suppression RED + root-cause isolation).
2. P0 next: P11-HF4-T3 (one-shot final-output visibility + full-duration exactly-once fix).
3. P0 closure: P11-HF4-T4 + P11-HF4-T5 + P11-HF4-T6 (loop/stop/clear non-regression + FAIL->PASS parity evidence).
4. P0 final closure: P11-HF4-T7 (full artifact sync).

## Gate Rules
- Do not close HF4 without deterministic PASS proving non-loop globals render on `/output/final` and complete full intended duration exactly once.
- Do not close HF4 without explicit loop-mode non-regression PASS.
- Do not close HF4 without explicit stop/clear non-regression PASS.
- Do not close wave without control/final parity PASS for one-shot duration completion.
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
- Critical correction after HF2 activates Plan 11-HF3 before 11-2:
  - Recovery A: global one-shot animations cancel after 1s on `/output/final`.
  - Feature B: `Play sound` dashboard checkbox for global trigger audio toggle.
- Critical correction after HF3 activates Plan 11-HF4 before 11-2:
  - Recovery A: global loop animations still work, but non-loop globals are suppressed on `/output/final`.
  - Recovery B: non-loop globals must render on `/output/final` for full intended duration exactly once.
