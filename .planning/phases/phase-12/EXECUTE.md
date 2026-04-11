# Execute Phase 12

## Priority
- Phase 11 is CLOSED PASS (final: 11-HF6).
- Plan 12-1 is the sole execute-ready priority wave for Phase 12.
- Plan 12-2 / 12-3 are conditional follow-ups and remain queued until 12-1 closure.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 12-1 (binding)
1. P0 first: P12-T1 + P12-T2 (deterministic RED + root-cause isolation for order-dependent occlusion).
2. P0 next: P12-T3 + P12-T4 (no-implicit-replace guard on start path + generic additive layering for coded/mp4/gif).
3. P0 closure: P12-T5 + P12-T6 (loop and stop/clear non-regression).
4. P0 evidence: P12-T7 (order-invariance + control-vs-final parity).
5. P0 final closure: P12-T8 (FAIL->PASS evidence + full tracker sync).

## Gate Rules
- Do not close 12-1 without a deterministic RED repro of the order-dependent occlusion captured before any fix lands.
- Do not close 12-1 without explicit root-cause isolation with file:line references.
- Do not close 12-1 without proof that starting a new room animation never hides or unmounts a still-running room animation.
- Do not close 12-1 without proof that coded, mp4, AND gif room animations compose additively in a single room.
- Do not close 12-1 without explicit loop-mode non-regression PASS across all three types.
- Do not close 12-1 without explicit stop/clear immediate-authority non-regression PASS.
- Do not close 12-1 without deterministic order-invariance PASS (A->B == B->A).
- Do not close 12-1 without control-view vs `/output/final` parity PASS.
- No closure without full planning tracker synchronization (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Update task status in `TASKS.md` after each completed item.
- Capture binding decisions in `.planning/STATE.md`.
- Keep `PLAN.md`, `BACKLOG.md`, `ACCEPTANCE.md`, and `RISKS.md` synchronized when scope changes.

## Execution Record
- Phase 12 activated 2026-04-11 after Phase 11 closure (11-HF6 PASS).
- First execution wave is Plan 12-1 (Concurrent Room Animation Layering).
- Problem statement baseline: `alarm` disappears when triggered after `malfunction` in the same room; `malfunction -> alarm` both visible, `alarm -> malfunction` only `malfunction` visible. Must become order-invariant and generic across coded/mp4/gif.
