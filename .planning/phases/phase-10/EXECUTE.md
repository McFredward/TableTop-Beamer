# Execute Phase 10

## Planning Mode Note
- Plan 10 is prepared execute-ready; no execution has been run yet in this step.

## Critical Priority Override
- Plan 10-HF1 (P0 final-output blackout) is mandatory and blocks Plan 10-1.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 10-HF1 (binding, hard-gated wave)
1. P0 first: P10-HF1-T1 (reproduce/root-cause board-specific `/output/final` blackout on `Nemesis Lockdown A` with outside `sandstorm.mp4`).
2. P0 next: P10-HF1-T2 (fix render short-circuit so final composition path cannot collapse to persistent black frame).
3. P0 next: P10-HF1-T3 (enforce room+outside co-render on `/output/final` for all boards/media types).
4. P0 next: P10-HF1-T4 (verify sync/control semantics stay unchanged: ordering/version/idempotent apply and stop/clear/global controls).
5. P0 next: P10-HF1-T5 (run all-board regression matrix with explicit mp4 outside-background coverage).
6. P0 closure: P10-HF1-T6 (record evidence + synchronize all planning artifacts including global trackers).

## Priority Execution - Plan 10-1 (after 10-HF1 PASS)
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
- Do not start Plan 10-1 before full PASS of Plan 10-HF1 blackout, co-render, sync/control non-regression, and all-board matrix gates.
- Do not start P10-HF1-T3..T5 before P10-HF1-T1..T2 close root-cause and render-path recovery gates.
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
