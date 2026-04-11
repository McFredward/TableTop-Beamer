# Plan 12-1 Verification — Concurrent Room Animation Layering

## Outcome
**PASS** — all hard gates G12-1..G12-9 closed.

## Problem Recap
Multiple animations triggered in the same room were order-dependent: `alarm -> malfunction` hid the alarm while `malfunction -> alarm` kept both visible. The requirement was a generic, type-independent (coded/mp4/gif) layering contract where any combination of concurrent room animations stays visible regardless of trigger order, without touching loop or stop/clear semantics.

## Root Cause
`src/app/runtime/runtime-orchestration.js` iterates `state.runningAnimations` in insertion order inside `draw()` and drew each room animation under the default `source-over` composite. Room-scope coded effects (`power-outage`, `intruder-alert`) paint full-clip `fillRect` fills at alpha up to 0.96, so whichever animation was drawn last obscured the previous one. `drawImage` calls for mp4 frames and gif frames at high opacity had the same class of defect. Full analysis in `P12-T2-ROOT-CAUSE-ISOLATION.md`.

## Fix
A generic additive layering guard was added to the draw pipeline:

1. `draw()` builds a per-frame `roomConcurrencyByKey` map counting running animations per `boardId::roomId` and exposes it on `state.runtimePerf`.
2. Inside `drawAnimation()`, the room-scope branch reads the count inside its existing `ctx.save()` / `clipToRoom()` scope. When the count is ≥ 2, it sets `ctx.globalCompositeOperation = "lighter"` before invoking `drawRoomComposition`.
3. The cluster-member render path in `drawAnimation()` (for cluster-scoped animations whose members target rooms) has the same concurrency-gated guard.
4. Single-animation rooms keep the default `source-over` — no visual regression for lone effects.
5. The composite-op switch applies uniformly to coded (`fillRect`, `stroke`, `arc`, `bezier`), mp4 (`drawImage(video, ...)`), and gif (`drawImage(gifFrame, ...)`) because all three share the same `drawRoomComposition` wrapper inside the `ctx.save()` scope.
6. `ctx.restore()` at the end of each draw scope pops the composite-op change, so the next animation starts with a clean state. No persistent global mutation.

Commits:
- `cb6849d` — test(12-1): P12-T1 RED repro — order-dependent occlusion baseline.
- `d6d3822` — docs(12-1): P12-T2 root-cause isolation.
- `778efcd` — test(12-1): P12-T3 guard — start path has no implicit room replacement.
- `9a4e602` — fix(12-1): P12-T4 order-invariant additive room animation layering.
- `f1e8d5b` — test(12-1): P12-T5 loop-mode non-regression.
- `7ee639e` — test(12-1): P12-T6 stop/clear immediate-authority non-regression.
- `a13ba66` — test(12-1): P12-T7 order-invariance FAIL->PASS proof.

## Gate Matrix

| Gate | Verdict | Evidence |
|---|---|---|
| G12-1 Order-Dependent-Occlusion-RED | PASS (baseline frozen) | `debug/p12-t1-order-occlusion-red-output.json` — alarm→malfunction r=3.996 vs malfunction→alarm r=87.228, orderInvariant=false. |
| G12-2 Root-Cause-Isolation | PASS | `.planning/phases/phase-12/P12-T2-ROOT-CAUSE-ISOLATION.md` — five candidate branches audited, Branch F confirmed. |
| G12-3 No-Implicit-Replace | PASS | `debug/p12-t3-no-implicit-replace-guard-output.json` — 5/5 checks pass: no unguarded `stopAnimation`, no room upsert-by-type, additive `createAnimation`, stop-animation emissions only in `editTargetId` branch (brace-scanned), legitimate edit path preserved. |
| G12-4 Generic-Additive-Layering | PASS | `debug/p12-t7-order-invariance-fail-pass-proof-output.json` — 4 static code assertions + order-invariance across 6 pair tests and 1 triple permutation (coded + mp4 + gif). |
| G12-5 Loop-Mode-NonRegression | PASS | `debug/p12-t5-loop-non-regression-output.json` — 5/5 checks: guard gated on count≥2, no loop-lifecycle field references in composite-op scope, pruneFinishedAnimations predicate preserved, upsertGlobalAnimation loop branch intact, concurrency map build read-only. |
| G12-6 Stop-Clear-Immediate-Authority | PASS | `debug/p12-t6-stop-clear-non-regression-output.json` — 6/6 checks: `stopAnimation` filter path, `clear-all` snapshot branch, `pruneFinishedAnimations` contract, draw()-only-expected mutations, concurrency loop stop-free, global stop/clear revision observers. |
| G12-7 Order-Invariance | PASS | `debug/p12-t7-order-invariance-fail-pass-proof-output.json` — alarm+malfunction produces identical RGB pixel (r=106.7, g=37.3, b=45.3) for both orderings; all 6 triple permutations match. |
| G12-8 Control-Final-Parity | PASS (architectural invariant) | `draw()` and `drawAnimation()` are the only render paths for both `OUTPUT_ROLE_CONTROL` and `OUTPUT_ROLE_FINAL` — there is no separate final-output renderer module. The additive layering guard applies uniformly to both roles. |
| G12-9 Artifact-Sync | PASS (this commit) | Tracker sync in the T8 closure commit — `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`. |

## Aggregate Regression Result
`debug/p12-1-acceptance-regression-output.json` — all five sub-harnesses pass (RED frozen, T3 PASS, T5 PASS, T6 PASS, T7 PASS).

## Non-Regression Notes
- Single-animation rooms: `compositeWithFix([malfunction])` equals `srcOver(roomBackground, malfunction)` — lone effects retain their original visual design.
- Loop-mode lifecycle fields (`loopUntilStopped`, `anim.hold`, `durationMs`) are not referenced inside the composite-op switch window (400-char neighborhood check).
- Explicit `stopAnimation` / `clear-all` paths continue to filter `state.runningAnimations` authoritatively; their removal of an entry drops the concurrency count on the next frame, returning remaining rooms to `source-over` seamlessly.
- Phase 11 HF6 seen-once retention (`activeSeenOneShotRunByTriggerRevision`) and global stop/clear revision observers remain wired.

## Design Tradeoff (Documented)
When a room hosts ≥ 2 concurrent animations, the composite mode switches from `source-over` to `lighter` (pure additive RGB). This has two observable effects:
1. **Darkening effects lose their darkening contribution when stacked.** A solo `power-outage` still darkens the room via `source-over`; when stacked with another animation it contributes only its bright flickers/flashes/stroke lines, and its black fill contributes zero under additive blend. This is the direct consequence of the requirement "all animations visible regardless of order" — order-invariance and opacity-preserving-darkening are mutually exclusive.
2. **Bright saturation can clip to white.** Many concurrent bright effects in one room can saturate channels. The current render budget (`maxRenderAnimationsPerFrame = 96`) and the current effect palette make this unlikely in practice. If this becomes visible under real content, Plan 12-3 is reserved for render budget / effect design tuning.

## Status
Plan 12-1 closed PASS. Phase 12 exit criteria met.
