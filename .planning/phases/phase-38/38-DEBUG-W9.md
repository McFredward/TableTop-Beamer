---
status: investigation-incomplete (could not reproduce operator's bug)
trigger: "Operator: profile-load desync persists after W7+W8. ESC 3-6 times converges."
created: 2026-05-11
updated: 2026-05-11
---

# Phase 38 W9 — Multi-ESC-converge desync investigation

## Honest assessment

**I could not reproduce the operator's bug in synthetic Playwright tests.** Five distinct reproducer scenarios (W9-A through W9-E) all PASS on master b210473 + the W9 fix below. The operator's symptom may require characteristics of their real environment (RPi hardware, real network latency, long-running session state, specific interaction timing) that the test rig cannot replicate.

I made one defensive code fix (slow-path key-ordering bug) that is a real latent issue but cannot be proven to be the operator's root cause without operator UAT.

## What was investigated

### Hypothesis A: profileId clobber via Pi drag-end
- Pi's drag-end ESC sometimes broadcasts `unsaved-<boardId>` profileId
- **ELIMINATED**: ESC fires `discardChanges()` which restores to `_loadedProfileSnapshot`. After a profile-load via Pi's toolbar, `_loadedProfileName` is set to the loaded profile name. The broadcast carries the correct profile name. W8 already addresses Pi's clobber on align-mode activation; ESC after profile-load doesn't trip the same path.

### Hypothesis B: SSR mesh-warp GL not re-allocating on dim change
- **ELIMINATED via code reading**: `runtime-projection-gl-renderer.js:406-428` reallocates `_glPositions/_glUVs/_glIndices` whenever `_glCachedRows/_glCachedCols` change. Per-frame call from the RAF draw loop. Dimension changes are handled.

### Hypothesis C: Pi W3 `_lastLocalBroadcastAtMs` blocking apply of dashboard broadcasts to Pi
- **ELIMINATED via test**: W9-A test has dashboard load via Pi /output/'s toolbar (the only profile-picker UI in the repo) with a second dashboard browser context open. Pi's grid reaches the new dimensions correctly.

### Hypothesis D: Server's `lastBroadcastVersionByClient` per-client filter blocking fanout to SSR
- **ELIMINATED via test**: Multiple W9 scenarios. Server version monotonically increments per mutation. Each broadcast generates new mutationId. Filter at server.mjs:1606 (`nextVersion <= lastVersion`) skips only stale versions, not duplicates of the current. Test runs produce final version=4, 7, etc — fanout works.

### Hypothesis E: `_lastAppliedAlignGridSnapshotKey` set during failed apply, blocking future applies
- **CODE-AUDIT CONFIRMED REAL BUG**: Slow-path at `runtime-live-sync-core.js:621-647` (pre-W9) set the key BEFORE checking whether `gridState` was attached to `window`. If gridState was null at that moment (very-early boot, transient module reset), the key was marked applied without the grid actually being restored. Subsequent broadcasts/polls carrying the same `at` would see the key matching and SKIP.
- **HOW IT'S MITIGATED IN PRACTICE**: The fast-path at L986 doesn't use this key gate, so new broadcasts (with a fresh `at` post-boot) ARE applied via fast-path. The bug only persists if (a) the slow-path window catches the only authoritative snap and (b) no fast-path broadcast follows before the next user action.
- **FIX APPLIED**: Reorder so key-set happens AFTER successful `restoreGridSnapshot`. Add explicit warn log when gridState isn't ready. This is a defensive fix; cannot be proven to address the operator's bug without UAT.

### Hypothesis F: WebRTC encoder keyframe-interval lag
- **NOT FIXED** but unlikely to be root cause. Keyframe interval is 1-2s depending on quality preset (`ssr-render-host.mjs:89-91`). On a grid change the next P-frames carry the visual change, with full convergence at the next I-frame (≤2s). Operator's "3-6 ESC presses" is ~10+ seconds of total time — too long to be keyframe-lag alone.

### Hypothesis G: clock skew between SSR and server
- **ELIMINATED via architecture**: SSR Chromium tab is spawned by the server process on the same machine via Puppeteer. Clock skew is ~0ms.

## Tests run (5 new + all existing Phase 38 tests)

New W9 reproducer tests in `test/live-e2e/test_phase38_w9_picker_with_dashboard.py`:
- W9-A: dashboard + Pi /output/ + single profile load (xrandrv2 9×9) → **PASSES on master**
- W9-B: dashboard + Pi /output/ + chained loads (test → xrandrv2) → **PASSES on master**
- W9-C: dashboard + Pi /output/ + rapid loads (test → xrandrv2 → test → xrandrv2 at 0.5s) → **PASSES on master**
- W9-D: server boots with xrandrv2 seeded on disk, then load test (different dims) → **PASSES on master**
- W9-E: Pi /output/ localStorage seeded with stale test (5×6) grid, then load xrandrv2 → **PASSES on master**

All 20 Phase 38 e2e tests PASS after W9 fix. D-08 connection-stability live-fixture-smoke GREEN.

## Why W9 reproducers don't reproduce the operator's bug

Possible explanations:
1. **Hardware/timing**: real RPi has different timing than x86 Chromium test env. Slower CPU on Pi could create different race windows.
2. **Long-running session state**: operator has had Pi open for hours/days; localStorage, GC pressure, accumulated state. My tests are fresh-context.
3. **Network latency**: real Pi-to-server network has 1-5ms latency; tests are loopback (<1ms).
4. **Specific interaction pattern**: operator may be moving the toolbar, switching tabs, or doing some action concurrent with profile-load that my tests don't capture.
5. **Different "bug"**: operator's earlier evidence (`output_desync_load.png`, `ssr-grid.json`) is from PRE-W7. The current symptom after W7+W8 may be a different bug that doesn't match my mental model.

## Code change applied (W9 defensive fix)

File: `src/app/runtime/live-sync/runtime-live-sync-core.js`

```diff
-        if (acceptable && state._lastAppliedAlignGridSnapshotKey !== snapKey) {
-          state._lastAppliedAlignGridSnapshotKey = snapKey;
-          const gridState = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
-          if (gridState && typeof gridState.restoreGridSnapshot === "function") {
-            // ... apply ...
-            _redrawHandlesAfterCornerDrag();
-          }
-        }
+        if (acceptable && state._lastAppliedAlignGridSnapshotKey !== snapKey) {
+          // Phase 38 W9: set the snap-key gate AFTER the apply, not before.
+          // If gridState is null at this moment (window global not yet
+          // attached during very-early boot, or a transient module-reset
+          // window), pre-W9 code marked the key applied without the grid
+          // actually being restored. Subsequent broadcasts/polls carrying
+          // the SAME `at` snap would see the key matching and SKIP —
+          // leaving the grid stuck at the earlier state.
+          const gridState = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
+          if (gridState && typeof gridState.restoreGridSnapshot === "function") {
+            // ... apply ...
+            state._lastAppliedAlignGridSnapshotKey = snapKey;   // AFTER apply
+            _redrawHandlesAfterCornerDrag();
+            console.log(`[align-grid-snapshot] slow-path apply OK ...`);
+          } else {
+            console.warn(`[align-grid-snapshot] slow-path skipped: gridState not ready — key NOT set, will retry`);
+          }
+        }
```

## W9 diagnostic logging added

Slow-path now logs:
- `[align-grid-snapshot] slow-path apply OK dims=NxM profile=X at=Y` — on each successful apply
- `[align-grid-snapshot] slow-path skipped: gridState not ready (profile=X at=Y) — key NOT set, will retry` — when gridState is null

Combined with the existing fast-path `[align-grid-snapshot] RECV ageMs=... accept=...` logs, the operator's next UAT will show:
- Whether the broadcast arrived at SSR (RECV log)
- Whether fast-path accepted it (`accept=true/false`)
- Whether slow-path applied or skipped
- Comparison of `snap.at` timestamps to see if same snap is replayed

If the operator reports the bug after this lands, the SSR-tab stdout (via puppeteer log forwarding) will show exactly which path is failing.

## Preserved W9 in-flight fix

The user's in-flight change to `boot-handle-ui.js` (replacing `HANDLE_UI.showHandles?.(Boolean(on))` with `HANDLE_UI.onAlignModeChange(Boolean(on))`) is preserved. That's a separate bug fix for "overlay not disappearing on align-off" and is NOT reverted.

## Recommendation for operator UAT

1. Pull this branch. Restart server.
2. Reproduce the desync (load a profile via Pi /output/ toolbar with xrandrv2).
3. **Immediately** dump the server stdout, especially looking for:
   - `[align-grid-snapshot] server-recv from=...` lines (server side)
   - `[ssr-tab:log] [align-grid-snapshot] RECV ...` lines (SSR-tab side)
   - `[ssr-tab:log] [align-grid-snapshot] slow-path apply OK` lines (NEW W9)
   - `[ssr-tab:log] [align-grid-snapshot] slow-path skipped` lines (NEW W9)
   - `[ssr-tab:log] [align-grid-snapshot] poll eager-apply OK` lines
4. After each ESC, dump the server stdout again.
5. Compare: does the FIRST ESC produce an apply OK in SSR? Does the Nth one?

Without operator-side log evidence, this investigation cannot proceed further.
