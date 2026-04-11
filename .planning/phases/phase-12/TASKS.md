# Phase 12 Tasks

Status legend: TODO | IN-PROGRESS | DONE | REJECTED
Priority labels: [P0] critical | [P1] high | [P2] medium

## Plan 12-1 - Concurrent Room Animation Layering (CLOSED PASS)

Closure evidence: `.planning/phases/phase-12/12-1-VERIFICATION.md`, `debug/p12-1-acceptance-regression-output.json`.

- [x] DONE P12-T1 [P0] Build deterministic RED repro showing order-dependent occlusion: `malfunction -> alarm` hides `alarm`, while `alarm -> malfunction` keeps both visible. Capture trace under `.planning/phases/phase-12/P12-T1-ORDER-OCCLUSION-RED.md` and `debug/p12-t1-repro.json`.
- [x] DONE P12-T2 [P0] Isolate root cause in `src/app/runtime/runtime-orchestration.js` along candidate branches: (a) implicit `stopAnimation` / upsert in room start path, (b) draft edit-target overwrite, (c) coalescing / render-budget skip, (d) canvas clip region overwrite, (e) z-order collision, (f) type-specific replacement path. Document findings in `P12-T2-ROOT-CAUSE-ISOLATION.md` with explicit file:line references.
- [x] DONE P12-T3 [P0] Remove/guard implicit start-time replacement for room-scope animations so that starting a new animation never unmounts or hides an existing running room animation. Preserve natural-duration-end and explicit stop/clear termination paths unchanged.
- [x] DONE P12-T4 [P0] Verify/implement a generic additive layering pass in the canvas render loop that composes coded, mp4, and gif room animations within the same room additively with no type-specific replacement. No special case per type.
- [x] DONE P12-T5 [P0] Execute loop-mode non-regression matrix across coded/mp4/gif: start, sustain across 5s+, stop via explicit stop; confirm no regression vs Phase 11 baseline.
- [x] DONE P12-T6 [P0] Execute explicit stop/clear non-regression matrix under mixed same-room one-shot + loop sequences across all three types.
- [x] DONE P12-T7 [P0] Add deterministic order-invariance tests: `A->B` and `B->A` with overlapping durations produce identical stable visual composition on control-view and `/output/final`. Include at least one coded/mp4/gif mixed triple.
- [x] DONE P12-T8 [P0] Capture FAIL->PASS evidence (`12-1-VERIFICATION.md` + `debug/p12-1-acceptance-regression-output.json`) and synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.
