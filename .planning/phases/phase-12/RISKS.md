# Phase 12 Risks

## R12-1 Hidden Upsert-By-Type in Start Path [HIGH]
The runtime currently contains an `upsertGlobalAnimation` style path that stops a prior running animation before starting a new one. If any equivalent exists for room-scope (even partial or conditional), removing it naively can break legitimate re-trigger semantics (e.g. restart-on-same-type).
- Mitigation: Treat re-trigger as "add independent instance"; only natural end or explicit stop/clear terminates a run. Keep a small test matrix proving "re-trigger while running" behaves deterministically (both instances visible or co-running to completion).

## R12-2 Canvas Clip Region Conflict [MEDIUM]
Room animations are drawn inside a per-room clip (`clipToRoom`). If two animations share identical clip geometry, additive composition depends on stable context save/restore and non-destructive drawing. A wrong clear/fill could mask the earlier frame.
- Mitigation: Verify `ctx.save()`/`ctx.restore()` wraps each animation drawRoomComposition; ensure no `ctx.clearRect` over the entire clip region between animations within the same frame.

## R12-3 Coalescing / Render Budget Skipping [MEDIUM]
`shouldCoalesceNonCriticalAnimation` and the `maxRenderAnimationsPerFrame` guard can skip animations under load. If two room animations compete and one is consistently skipped, the visible bug resembles occlusion.
- Mitigation: Ensure room animations inside the "visible" set of a given room are always rendered; only non-visible or stale animations may be coalesced. Add invariant tests.

## R12-4 Type-Specific Replacement Path [MEDIUM]
Per-type handlers (mp4/gif/coded) may have distinct mount/unmount side-effects (e.g. shared video element reuse, single gif decoder). A naive generic layering rule can fail for mp4 if only one `<video>` element is reused globally.
- Mitigation: Audit media handlers; ensure multiple concurrent mp4 playbacks either share decoder with per-instance frame sampling, or instantiate per-instance video elements, depending on existing architecture. Prefer keeping the existing single-shared pipeline but verify multi-instance state is tracked correctly.

## R12-5 Loop-Mode Regression [MEDIUM]
Loop animations must still terminate cleanly on explicit stop/clear and must not interfere with new one-shot starts in the same room.
- Mitigation: Dedicated loop non-regression matrix per type (T5).

## R12-6 `/output/final` Divergence [MEDIUM]
The `/output/final` renderer may have its own draw loop; any change in room animation collection semantics must be mirrored there.
- Mitigation: Include explicit control-vs-final parity test (T7) in the regression matrix.

## R12-7 Performance Under High Concurrency [LOW]
Additive layering on canvas is cheap per frame, but unbounded concurrent animations (especially mp4) could degrade low-end devices.
- Mitigation: Keep existing render budget but make it non-visible-first; document as follow-up if measured regressions emerge (potential Plan 12-3).

## R12-8 Planning-Artifact Drift [LOW]
Closing Phase 12 without a full tracker sync could re-introduce the same symptom that Phase 11 hotfix waves fought repeatedly.
- Mitigation: Hard gate G12-9; T8 must synchronize `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` before closure.
