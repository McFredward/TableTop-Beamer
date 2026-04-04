# Execute Phase 10

## Planning Mode Note
- Plan 10-HF2 closure is reopened by critical field feedback.
- Plan 10-HF3 execution wave is complete and PASS.
- Plan 10-HF4 execution wave is complete and PASS.
- New multi-play-area blocker opens Plan 10-HF5 as mandatory P0 hotfix wave.

## Critical Priority Override
- HF5 is now the active P0 blocker; Plan 10-1 remains blocked until HF5 PASS.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 10-HF5 (binding, hard-gated wave)
1. P0 first: P10-HF5-T1 (deterministic RED repro split multi-play-area vs single-play-area behavior).
2. P0 next: P10-HF5-T2 (deterministic RED repro for Lockdown A default play area/fallback hex visibility despite valid canonical saved play-areas).
3. P0 next: P10-HF5-T3 (Firefox headless/automation diagnostics + parity traces versus Chrome and mobile-class Chrome).
4. P0 next: P10-HF5-T4 (executable canonical source/fallback decision diagnostics for control-view and `/output/final`).
5. P0 next: P10-HF5-T5 (generic root-cause fix in canonical resolver/fallback path; no board-specific branch).
6. P0 next: P10-HF5-T6 (shared canonical play-area resolver contract across control-view and `/output/final`).
7. P0 next: P10-HF5-T7 (lifecycle assertions for startup/reload/default-apply/board-switch parity).
8. P0 next: P10-HF5-T8 (Firefox/Chrome/mobile-class parity matrix for single-area + multi-area scenarios).
9. P0 next: P10-HF5-T9 (imported-board + multi-area strict regression matrix).
10. P0 closure: P10-HF5-T10 (explicit FAIL->PASS evidence and synchronized planning/global artifacts).

## Previously Closed Execution - Plan 10-HF1
1. P10-HF1-T1..T6 are complete and PASS (board-specific blackout closure baseline remains valid).

## Priority Execution - Plan 10-1 (after 10-HF5 PASS)
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
- Do not start Plan 10-1 before full PASS of Plan 10-HF5 repro, executable-diagnostics, root-cause-fix, browser/surface parity, imported+multi-area regression, and FAIL->PASS proof gates.
- Do not start P10-HF5-T5/P10-HF5-T6 before corresponding RED repro + diagnostics gates are closed.
- Do not close Plan 10-HF5 without explicit FAIL->PASS evidence for the same tests.
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
- Plan 10-HF4 completed with PASS closure evidence:
  - Runtime panel module exposure/load-order is deterministic for `TT_BEAMER_RUNTIME_PANELS`.
  - Settings ownership checks are applicability-aware for conditional unmount controls.
  - Ship-clip validity semantics reject invalid polygons and accept valid canonical/multi-play-area/legacy states.
  - Browser parity + final-output canonical-no-invalid-default fallback diagnostics are PASS.
- Plan 10-HF5 completed with PASS closure evidence:
  - RED repros captured and preserved for multi-vs-single mismatch and Lockdown fallback-hex visibility.
  - Generic canonical resolver fix now rejects invalid multi-area entries and preserves valid canonical area precedence.
  - Control-view and `/output/final` share the same canonical play-area resolver contract and lifecycle behavior.
  - Firefox/Chrome/mobile-class parity plus imported-board/multi-area regression matrices are PASS.
  - FAIL->PASS proof is closed (`P10-HF5-T10-FAIL-PASS-PROOF.md`).
