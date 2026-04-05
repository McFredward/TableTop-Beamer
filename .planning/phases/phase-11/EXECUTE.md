# Execute Phase 11

## Priority
- Plan 11-1, 11-HF1, 11-HF2, 11-HF3, and 11-HF4 remain historical implementation baselines but are field-corrected by new critical feedback.
- Plan 11-HF5 remains implemented but is field-invalidated under polling/hydration behavior.
- Execute Plan 11-HF6 immediately as mandatory P0 recovery wave.
- Plan 11-2 stays queued until 11-HF6 PASS.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 11-HF6 (binding)
1. P0 first: P11-HF6-T1 + P11-HF6-T2 (polling/hydration RED + root-cause isolation).
2. P0 next: P11-HF6-T3 + P11-HF6-T4 (seen-revision full-playback contract + explicit-cancel-only guard).
3. P0 closure: P11-HF6-T5 + P11-HF6-T6 + P11-HF6-T7 (loop/stop/clear non-regression + deterministic multi-client polling FAIL->PASS evidence).
4. P0 final closure: P11-HF6-T8 (full artifact sync).

## Gate Rules
- Do not close HF6 without deterministic PASS proving seen non-loop revisions complete exactly one full-duration local playback per client.
- Do not close HF6 while polling/hydration snapshots can cancel started one-shots without explicit stop/clear revision.
- Do not close HF6 without explicit loop-mode non-regression PASS.
- Do not close HF6 without explicit stop/clear immediate-authority non-regression PASS.
- Do not close wave without strict deterministic multi-client polling parity PASS (initiator + peers + `/output/final`).
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
- Critical correction after HF4 activates Plan 11-HF5 before 11-2:
  - Recovery A: loop mode remains synchronized, but non-loop globals currently run only on initiating client.
  - Recovery B: one-shot non-loop path must be server-authoritative and replicated exactly once to initiator + peers + `/output/final`.
  - Recovery C: local optimistic one-shot rendering must be removed/guarded to prevent false-local PASS.
- HF5 execution closure:
  - Completed A: non-loop global start fanout is server-authoritative with canonical trigger revision/id payload.
  - Completed B: local optimistic global one-shot masking path is removed; runtime waits for distributed snapshot confirmation.
  - Completed C: strict multi-client FAIL->PASS parity is documented in `11-HF5-VERIFICATION.md` and `P11-HF5-T7-FAIL-PASS-PROOF.md`.
- Critical P0 follow-up after HF5 activates Plan 11-HF6 before 11-2:
  - Recovery A: non-loop globals seen on peer clients or `/output/final` still do not visibly complete due to polling/hydration premature cancellation.
  - Recovery B: once a non-loop trigger revision is seen, local playback must run exactly once for full configured duration.
  - Recovery C: polling snapshots must never cancel started one-shots unless explicit stop/clear revision is observed.
  - Recovery D: loop behavior stays unchanged; stop/clear remains authoritative and immediate.
- HF6 execution closure:
  - Completed A: seen non-loop trigger revisions now lock local one-shot playback exactly once for full configured duration.
  - Completed B: polling snapshot reconciliation no longer cancels started one-shots without explicit stop/clear authority.
  - Completed C: loop and stop/clear non-regression are PASS, including explicit clear revision authority under polling.
  - Completed D: deterministic multi-client FAIL->PASS parity is documented in `11-HF6-VERIFICATION.md` and `P11-HF6-T7-FAIL-PASS-PROOF.md`.
