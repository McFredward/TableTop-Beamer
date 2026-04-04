# Execute Phase 10

## Planning Mode Note
- Plan 10-HF2 closure is reopened by critical field feedback.
- Plan 10-HF3 execution wave is complete and PASS.
- Plan 10-HF4 execution wave is complete and PASS.
- Plan 10-HF5 historical PASS is field-invalidated by concrete follow-up repro.
- Plan 10-HF6 historical PASS is field-invalidated by clean-local-storage profile-loss repro.
- Plan 10-HF7 execution wave is complete and PASS.

## Critical Priority Override
- Plan 10-1 is unblocked after HF7 PASS closure.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 10-HF7 (binding, hard-gated wave)
1. P0 first: P10-HF7-T1 (deterministic RED repro for clean-local-storage startup profile-loss/default-play-area fallback).
2. P0 next: P10-HF7-T2 (executable diagnostics for extraction coupling to loaded board IDs).
3. P0 next: P10-HF7-T3 (deterministic RED repro for unknown-board-key drop in migration).
4. P0 next: P10-HF7-T4 + P10-HF7-T5 (catalog-independent extraction and migration retention fix for unknown/imported keys).
5. P0 next: P10-HF7-T6 (lifecycle assertions for deterministic multi-area retention across startup/default-apply/reload).
6. P0 next: P10-HF7-T7 (Firefox/Chrome/mobile-class parity matrix + imported-board/multi-area strict non-regression matrix with clean-start lanes).
7. P0 closure: P10-HF7-T8 (explicit FAIL->PASS evidence and synchronized planning/global artifacts).

## Previously Closed Execution - Plan 10-HF1
1. P10-HF1-T1..T6 are complete and PASS (board-specific blackout closure baseline remains valid).

## Priority Execution - Plan 10-1
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
- Do not start Plan 10-1 before full PASS of Plan 10-HF7 clean-start repro, extraction diagnostics, migration-retention fix, lifecycle retention gates, browser/surface parity, imported+multi-area regression, and FAIL->PASS proof gates.
- Do not start P10-HF7-T4/P10-HF7-T5 before corresponding RED repro + diagnostics gates are closed.
- Do not close Plan 10-HF7 without explicit FAIL->PASS evidence for the same tests.
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
- HF5 field-invalidated follow-up (new blocker for HF6):
  - Concrete repro is mandatory baseline: `Nemesis Lockdown Board A` shows two areas in Chrome (`Play Area 1` + `Bunker`) but only one in Firefox/mobile-class (`Play Area 1`).
  - Root-cause focus is updated to deterministic multi-source merge retention and fallback replacement prevention.
  - Plan 10-1 is re-blocked until HF6 area-count/id-set/browser/surface parity gates are PASS.
- Plan 10-HF6 completed with PASS closure evidence:
  - RED repros for area-drop, merge-lineage, fallback replacement, area-count parity, area-id-set parity and control/final set parity were captured first.
  - Canonical merge now retains full valid multi-area sets when snapshot payloads are subsets and selection remains canonical-first.
  - Fallback guard blocks default replacement when valid subset/multi-area canonical data exists.
  - Browser + imported/multi-area lifecycle matrix is PASS (`P10-HF6-T9-BROWSER-IMPORTED-MULTIAREA-REGRESSION.md`).
  - FAIL->PASS proof is closed (`P10-HF6-T10-FAIL-PASS-PROOF.md`); Plan 10-1 is unblocked.
- HF6 field-invalidated follow-up (new blocker for HF7):
  - Root cause confirmed: board-profile extraction/migration depended on currently loaded board catalog IDs.
  - If a board profile key is not in that loaded list yet (for example imported/multi-area boards), migration can drop that key and force default play-area fallback.
  - Plan 10-1 is re-blocked until HF7 closes with extraction/migration hardening, lifecycle determinism, and FAIL->PASS evidence.
- Plan 10-HF7 completed with PASS closure evidence:
  - RED repros for clean-start profile-loss, extraction coupling and unknown-key migration drop were captured first.
  - Extraction is now catalog-independent and migration retains unknown/imported board keys with multi-area selections.
  - Startup/default-apply/reload lifecycle retention is deterministic and browser/imported clean-start parity matrix is PASS.
  - FAIL->PASS proof is closed (`P10-HF7-T8-FAIL-PASS-PROOF.md`); Plan 10-1 is unblocked.
