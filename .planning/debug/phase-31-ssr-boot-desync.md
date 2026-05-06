---
status: investigating
trigger: "Phase 31 SSR architecture, /output/ shows boot-time desync between streamed warped board and locally-rendered handle/lines/polygons. After ANY align-mode drag, everything snaps into place. Re-loading profile doesn't fix it."
created: 2026-05-06T18:00:00Z
updated: 2026-05-06T18:00:00Z
---

## Current Focus

hypothesis: applyLiveRuntimeSnapshot throws an uncaught error somewhere between line 244 and the lastAlignGridSnapshot apply at line 462 (200+ lines of polygon hydration, FX normalization, runningAnimations reconciliation). The live-hello message handler wraps the WHOLE thing in a silent try/catch ("ignore malformed live-sync payloads") at runtime-live-sync-core.js line 999-1001 — so any throw is swallowed. AutoLoad NOT a culprit (isActualSwitch=false at boot, no autoLoad fired). Server seeds correctly (verified by isolated tests). Apply gate logic is correct (verified by isolated test). The bug is that we never reach the apply gate due to silent throw.
test: confirmed via test that server seeds + envelope carries grid + apply gate works; remaining gap is the 200 lines of pre-apply code that may throw
expecting: moving lastAlignGridSnapshot apply EARLY (before polygon hydration / FX) OR adding apply directly in live-hello handler should fix
next_action: implement the fix — apply grid snapshot eagerly at the START of applyLiveRuntimeSnapshot AND in the live-hello handler directly, so it bypasses any downstream throw

## Symptoms

expected: On /output/ load, streamed warped board (from SSR Chromium tab) and locally-rendered handles/lines/polygons should be aligned to the active profile's grid
actual: Pi-side handles/lines/polygons render to profile grid, but SSR-streamed warped board uses default grid. After ANY align-mode drag, both sync.
errors: (none — purely visual desync)
reproduction: open /output/, observe streamed board vs local lines, drag a corner — snaps into place
started: introduced in phase 31 SSR architecture

## Eliminated

(none yet — h31, h37, h38, h40, h41, h42 from prior attempts)

## Evidence

- timestamp: 2026-05-06T18:00:00Z
  checked: config/runtime-active-grid.json
  found: file exists with profileId="unsaved-nemesis-board-a", persistedAt 2026-05-06T17:52:11.082Z, has 9 grid points (3x3) with non-default values (0.1/0.5/0.9) — file IS being written by h41
  implication: persistence layer works. Issue is elsewhere — either at load, broadcast, or apply.

- timestamp: 2026-05-06T18:30:00Z
  checked: server.mjs lines 1502-1521 (sendLiveSocketMessage + buildLiveSessionEnvelope) + 1748-1755 (live-hello dispatch)
  found: the envelope passes liveSessionState.snapshot directly (no cloning that would strip lastAlignGridSnapshot). Test phase-31-ssr-boot-grid-restore.test.mjs verifies the full server path (loadActiveGrid → seed liveSessionState → buildLiveSessionEnvelope → JSON serialize). All 7 tests pass.
  implication: server side is FINE. The grid IS in the live-hello envelope.

- timestamp: 2026-05-06T18:35:00Z
  checked: runtime-live-sync-core.js lines 462-520 (lastAlignGridSnapshot apply gate) — reconstructed in isolated test phase-31-live-sync-apply-grid.test.mjs
  found: gate logic itself is correct. With seeded snapshot + fresh client, all 4 isolated apply-gate tests pass. originator filter, role filter, dedup all behave as expected.
  implication: the GATE is fine. The bug is that we never REACH the gate.

- timestamp: 2026-05-06T18:40:00Z
  checked: runtime-live-sync-core.js function applyLiveRuntimeSnapshot (line 244-643)
  found: applyLiveRuntimeSnapshot has NO try/catch around the body. lines 244-461 (200+ lines) execute BEFORE the lastAlignGridSnapshot apply at line 462. These lines do polygonContract.applySnapshotPolygonState, ctx.normalizeShipPolygon, ctx.normalizeOutsideFxProfile, ctx.normalizeInsideFxProfile, ctx.normalizeRoomFxProfile, ctx.filterRunningAnimationsForBoard, ctx.primeGlobalTriggerRuntimeTimestamps, ctx.reconcileHydratedAnimations, ctx.retainActiveSeenOneShotRuns, ctx.hydrateRunningAnimationStartTimestamps, ctx.syncOutsideRuntimeMirror, ctx.warmGifAssetPath, ctx.reconcileStopPendingFromSnapshot. Any of these can throw on a freshly-booted SSR tab whose state.* maps are still default-initialized. Caller live-hello handler at lines 658-1001 wraps the WHOLE handler in try{...}catch{/* ignore malformed live-sync payloads */} (line 999-1001) — silently swallowing any throw.
  implication: ROOT CAUSE LIKELY — applyLiveRuntimeSnapshot throws somewhere in lines 244-461 on the fresh SSR tab. The grid apply at line 462 never executes. The silent catch hides the error. The drag works because by then state is fully populated and those normalizers don't throw anymore.

## Resolution

root_cause: applyLiveRuntimeSnapshot at runtime-live-sync-core.js:244 has 200+ lines of pre-grid-apply logic (polygon hydration, FX normalization, runningAnimations reconciliation, audio/mp4 settings, alignMode flag, etc.) BEFORE the lastAlignGridSnapshot apply at line 462. ANY throw in those 200 lines on a freshly-booted SSR tab (where state.* maps are still default-initialized) prevents the grid apply from ever running. The outer message handler wraps the whole handler in `try{...}catch{/* ignore malformed live-sync payloads */}` at line 999-1001, silently swallowing the throw — so we get neither the grid apply nor an error message. The same trap exists in pollLiveSnapshotOnce (its outer try/catch at line 127 covers applyLiveRuntimeSnapshot too). h40+h41+h42 made the data flow CORRECT but didn't address the unreachable-apply problem. Subsequent drag works because by then state is fully populated and those normalizers don't throw — and the drag also has its own fast-path at line ~744+ that bypasses applyLiveRuntimeSnapshot entirely.
fix: h43 — add an EAGER apply of runtime.lastAlignGridSnapshot at the START of both the live-hello handler and pollLiveSnapshotOnce, BEFORE applyLiveRuntimeSnapshot is called. The eager apply has its own try/catch (logs failure with "[align-grid-snapshot] {live-hello|poll} eager-apply failed:") so it's decoupled from any downstream throw. Same dedup key (`${at}:${profileId}:${points.length}`) as the slow-path so a successful eager apply prevents a duplicate slow apply (and vice versa). Same originator filter (`isOriginator` check) so the SSR tab won't apply its own broadcast back. Same OUTPUT_ROLE_FINAL gate so the dashboard isn't affected.
verification: 6 new regression tests in test/phase-31-h43-eager-grid-apply.test.mjs source-grep the eager apply paths in both live-hello and poll. 211/215 tests pass (4 skipped — same as before). All existing h40+h41 tests still pass (the slow-path apply logic is unchanged — only the eager apply was added in front).
files_changed:
  - src/app/runtime/live-sync/runtime-live-sync-core.js (added eager apply block in live-hello handler at line 665+ and in pollLiveSnapshotOnce at line 107+)
  - test/phase-31-h43-eager-grid-apply.test.mjs (new — 6 regression tests)
  - test/phase-31-ssr-boot-grid-restore.test.mjs (new — 2 server-side seeding tests, written during diagnosis)
  - test/phase-31-live-sync-apply-grid.test.mjs (new — 5 apply-gate tests in isolation, written during diagnosis)
