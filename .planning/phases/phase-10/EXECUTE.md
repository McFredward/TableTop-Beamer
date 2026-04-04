# Execute Phase 10

## Planning Mode Note
- Plan 10-HF2 closure is reopened by critical field feedback.
- Plan 10-HF3 execution wave is complete and PASS.

## Critical Priority Override
- HF3 gate is closed; Plan 10-1 can now proceed.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 10-HF3 (binding, hard-gated wave)
1. P0 first: P10-HF3-T1..T3 (create deterministic failing tests for exact symptom set: Lockdown A Firefox/mobile-class polygon apply, defaults-apply override, final-output black/fallback rectangle with valid polygons).
2. P0 next: P10-HF3-T4 (add executable lifecycle assertions for startup/load/apply-defaults/reload).
3. P0 next: P10-HF3-T5 (add board-switch + final-output render contract assertions).
4. P0 next: P10-HF3-T6 (add canonical polygon source-selection assertions).
5. P0 next: P10-HF3-T7 (implement generic root-cause fix driven by failing tests/diagnostics; no board-specific conditionals).
6. P0 next: P10-HF3-T8 (re-run full suite and capture explicit FAIL->PASS proof).
7. P0 next: P10-HF3-T9 (run imported-board non-regression + Chrome/Firefox desktop + mobile-class matrix).
8. P0 closure: P10-HF3-T10 (record evidence + synchronize all planning artifacts including global trackers).

## Previously Closed Execution - Plan 10-HF1
1. P10-HF1-T1..T6 are complete and PASS (board-specific blackout closure baseline remains valid).

## Priority Execution - Plan 10-1 (after 10-HF3 PASS)
1. P0 first: P10-T1 (define Settings IA/sub-tab grouping and ownership map).
2. P0 next: P10-T2 (implement Settings sub-tab navigation shell with stable state retention).
3. P0 next: P10-T3 (implement shared quick-mode state machine with explicit active-mode UX).
4. P0 next: P10-T4 (implement sequential room quick activation from selected animation).
5. P0 next: P10-T5 (implement sequential room quick deactivation for selected animation).
6. P0 next: P10-T6 (implement sequential room quick clear-all per clicked room).
7. P0 next: P10-T7 (add race/conflict guards for burst taps and inflight overlap).
8. P0 next: P10-T8 + P10-T9 (mobile one-handed rail + improved overview behavior).
9. P0 next: P10-T10 (explicit operator feedback for action success/fail/timeout).
10. P0 closure: P10-T11 (run desktop/mobile rapid-operation matrix + sync determinism checks).
11. P0 closure: P10-T12 (full artifact synchronization including global trackers).

## Priority Execution - Plan 10-2 (after 10-1 PASS)
1. P1 first: P10-T13 (UX polish informed by first live cycle).
2. P1 next: P10-T14 (performance micro-optimizations for sustained burst operation).
3. P1 closure: P10-T15 (config-gated diagnostics for rare race reports).

## Priority Execution - Plan 10-3 (after 10-2)
1. P2 first: P10-T16 (evaluate optional quick-mode presets).
2. P2 closure: P10-T17 (preset safety hardening and deterministic behavior checks).

## Gate Rules
- Do not start Plan 10-1 before full PASS of Plan 10-HF3 repro, executable-diagnostics, root-cause-fix, imported-board non-regression, and browser matrix gates.
- Do not start P10-HF3-T7 before P10-HF3-T1..T6 close failing-test + executable-diagnostics gates.
- Do not close Plan 10-HF3 without explicit FAIL->PASS evidence for the same tests.
- Do not start P10-T4..T7 before P10-T1..T3 stabilize IA + mode-state ownership.
- Do not start P10-T11 before P10-T8..T10 close mobile ergonomics + explicit feedback gates.
- Do not progress to 10-2 before full PASS of activation/deactivation/clear burst matrices and sync integrity checks.
- No wave closure without full artifact sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Update task status in `TASKS.md` after each completed item.
- Capture architecture/runtime decisions in `.planning/STATE.md` decision log.
- When scope changes, sync `PLAN.md`, `BACKLOG.md`, and `ACCEPTANCE.md` together.

## Execution Record
- Plan 10-HF1 completed (P10-HF1-T1..T6):
  - Root cause locked: fail-closed clip geometry path could suppress outside/room rendering and collapse `/output/final` to persistent black.
  - Fix shipped: final compositor clipping now fail-opens on invalid/degenerate play-area and room polygons.
  - Evidence shipped: all-board regression PASS including mp4 outside board `nemesis-lockdown-a` (`sandstorm.mp4`).
  - Non-regression recorded: sync/control semantics unchanged.
- Plan 10-HF2 was previously marked PASS but is reopened by field failure evidence:
  - Symptom set remains active in real-world runtime (`Nemesis Lockdown A` Firefox/mobile-class apply drift, defaults-apply override, `/output/final` black/fallback rectangle).
  - Resolution path is promoted to Plan 10-HF3 with mandatory test-driven repro + executable diagnostics + root-cause first closure.
- Plan 10-HF3 completed (P10-HF3-T1..T10):
  - Repro diagnostics T1..T6 captured deterministic RED failures for the exact field symptom set.
  - Root cause fixed generically in canonical snapshot polygon hydration path (no board-specific branching).
  - FAIL->PASS proof and imported-board/browser matrix are PASS (`P10-HF3-T8-FAIL-PASS-PROOF.md`, `P10-HF3-T9-BROWSER-IMPORTED-REGRESSION.md`).
