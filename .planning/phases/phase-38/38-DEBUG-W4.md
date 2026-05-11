---
phase: 38
wave: W4
slug: pi-output-grid-seed-on-bundle-load
status: ROOT-CAUSE-FOUND-AND-FIXED
investigator: gsd-debugger
date: 2026-05-11
---

# Phase 38 — W4: Root-cause fix for three persistent operator-reported bugs

## TL;DR

Operator reported three regressions persisting after W2 (commit `9bea236`) and
W3 (commit `87b034b`):

1. **Bug 1 — Wrong sync direction:** drag fast + release → Pi lines briefly
   show drag-end then snap BACK to the stream's older state.
2. **Bug 2 — High CPU during transforms** on the Pi.
3. **Bug 3 — Complex profile desync:** xrandrv2 (9×9) reproduces the desync
   the operator originally reported; test2 (3×3) does not.

My pre-W4 tests passed but operator's reality differed. The test-vs-reality
gap turned out to be a **module-load-order race** that the existing tests
didn't exercise: every test wrote to grid-state *after* the lazy align-mode
bundle had been loaded by some earlier toggle.

## Root cause

`src/app/runtime/output-receiver/output-live-sync.js` `_applyAlignGridSnapshot`
silently no-ops when `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE` is not
yet defined. That global is registered by an IIFE inside the align-mode
**lazy bundle**, which Pi /output/ only loads on the first `alignMode=true`
toggle (output-align-mode-loader.js `loadBundleOnce`).

Consequence chain:

1. Pi page loads. WS connects. Live-hello carries the latest server
   `runtime.lastAlignGridSnapshot` (e.g. the dashboard's just-loaded 9×9
   xrandrv2 profile).
2. `_applyAlignGridSnapshot(helloGrid)` runs. Grid-state module not yet
   loaded → silent return. **Pi loses the 9×9 data.**
3. 1Hz poll (`pollOnce`) fetches the same snapshot. Same silent return
   on every poll while bundle isn't loaded.
4. Operator toggles align-mode on Pi. Loader's `activate()` runs:
   - `loadBundleOnce()` injects 12 IIFE scripts including grid-state.
   - grid-state IIFE registers `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE`
     and initializes `grid` to `buildNewProfileDefaultGrid()` (3×3 identity).
   - `bootHandleUi(...)` initializes handle-ui against grid-state's 3×3.
   - **iter2-h2 defensive broadcast fires `broadcastGridSnapshot({force:true})`
     with Pi's 3×3 default state.**
5. Server receives Pi's 3×3 broadcast, records it as the authoritative
   `lastAlignGridSnapshot` with `originatorClientId=Pi`. Server fans out
   to SSR + dashboard.
6. SSR receives, originator-filter does not match → applies. **SSR's
   mesh-warp collapses to 3×3 identity (no calibration).**
7. Dashboard receives → applies. Dashboard's loaded profile dirty-flags
   appear/disappear unpredictably; user-visible grid reverts to identity.

End-state: Pi shows 3×3 handles, stream encodes no warp, dashboard's
operator-loaded 9×9 profile is silently wiped from the server.

This is Bug 3 directly. Bug 1's "lines snap back after a short time" is
the same mechanism with Pi's local drag interleaved: Pi's iter2-h2 broadcast
(or a later activation in a re-toggle) clobbers the just-finished drag,
making Pi's overlay lines snap to the wiped state. Bug 2's CPU symptom is a
secondary effect — the wipe-and-restore cycle doubles DOM/canvas work
each poll cycle, and SSR's "broadcast on alignModeChange" feedback loop
adds another full grid serialization.

## How the existing tests missed it

- `test_phase38_w3_complex_profile_propagates_to_pi`: opens Pi, toggles
  align-mode, waits 0.5 s, **then** broadcasts 9×9. By the time the
  broadcast arrives, the bundle is loaded → `_applyAlignGridSnapshot`
  works correctly. The test never exercises the
  "broadcast → bundle-load → seed" order that is the operator's reality.
- `test_phase38_w3_pi_drag_not_clobbered_by_stale_poll`: uses
  `page.evaluate(g.setPoint + g.broadcastGridSnapshot)` to simulate a
  drag. This BYPASSES the actual pointer-event drag handler AND ensures
  the bundle is already loaded (because `g` is the grid-state global,
  which only exists post-bundle-load).
- `test_phase38_pi_ssr_sync_after_*`: same pattern — broadcasts happen
  after bundle is loaded.

The W3 fix added `rebuildHandleElements`, which would fix the DOM-handle
count for dimension changes — but only on the *post-bundle* code path.
Pre-bundle dimensions were lost forever.

## Reproducer

`test/live-e2e/test_phase38_w4_real_drag_reproducer.py` adds two NEW
tests that exercise the operator's real scenario:

1. **`test_phase38_w4_real_drag_persists_through_poll_cycle`**: broadcast
   9×9 baseline BEFORE Pi opens. Open Pi, toggle align-mode. Wait 2 s
   (so iter2-h2 broadcast has settled). Sanity-assert Pi grid is 9×9
   baseline. Then use real `page.mouse.down/move/up` to drag the TL
   corner handle to (0.40, 0.45). Wait 3 s. Assert Pi grid is STILL at
   drag-end position (no poll clobber), and SSR has the same state.
2. **`test_phase38_w4_pi_ssr_match_after_real_drag_complex_profile`**:
   broadcast 9×9, open Pi, toggle align-mode, real-drag an INNER point
   (row=4, col=4) with a "wiggle" pattern. Assert Pi.grid and SSR.grid
   match within 0.02 tolerance for every one of the 81 points.

**Before the fix (commit 87b034b):**
- Test 1 fails: `Expected 9×9 baseline, got srcXs len=3` (Pi's sanity
  assertion fails — the pre-connect 9×9 broadcast was lost).
- Test 2 fails: `Inner handle (4,4) not present — grid may not be 9×9`
  (Pi's grid never made it to 9×9, so the `[data-row="4"][data-col="4"]`
  selector finds nothing).

**After the fix:**
- Both new W4 tests PASS.
- All 11 Phase-38 live-E2E tests pass.
- D-08 connection-stability rail (`RUN_LIVE_TESTS=1 node --test
  test/connection-stability/live-fixture-smoke.test.mjs`) PASSES.

## Fix (two parts)

### Part A — `src/app/runtime/output-receiver/output-live-sync.js`

Add a private `_pendingGridSnapshot` field. When `_applyAlignGridSnapshot`
hits the `!gs` early-return path, **store** the snap instead of dropping
it. Subsequent calls overwrite (last-writer-wins; idempotent for grid-
snapshots). Expose two new methods on the return object:

```js
applyPendingGridSnapshot() {
  if (!_pendingGridSnapshot) return false;
  const snap = _pendingGridSnapshot;
  _pendingGridSnapshot = null;
  try {
    _applyAlignGridSnapshot(snap);
    return true;
  } catch (err) {
    logger?.warn?.("[output-live-sync] applyPendingGridSnapshot threw:", err?.message || err);
    return false;
  }
},
hasPendingGridSnapshot: () => !!_pendingGridSnapshot,
```

### Part B — `src/app/runtime/output-receiver/output-align-mode-loader.js`

Between `bootHandleUi(...)` returning (grid-state + handle-ui now live)
and the iter2-h2 defensive broadcast firing, drain the pending cache
AND fall back to a direct `/api/live/snapshot` fetch if the cache is
empty:

```js
try {
  let seeded = false;
  if (typeof liveSync.applyPendingGridSnapshot === "function") {
    seeded = liveSync.applyPendingGridSnapshot();
    if (seeded) logger?.log?.("[align-loader] W4 seed: applied pending grid snapshot from cache");
  }
  if (!seeded) {
    const resp = await fetch("/api/live/snapshot");
    if (resp.ok) {
      const j = await resp.json();
      const snap = j?.snapshot ?? j?.session?.snapshot ?? j ?? {};
      const gridSnap = snap?.runtime?.lastAlignGridSnapshot;
      if (gridSnap && Array.isArray(gridSnap.srcXs)
          && Array.isArray(gridSnap.srcYs)
          && Array.isArray(gridSnap.points)) {
        const gs = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
        const localClientId = liveSync.getCurrentClientId?.() ?? null;
        const isOriginator = !!localClientId
          && gridSnap.originatorClientId === localClientId;
        if (gs && typeof gs.restoreGridSnapshot === "function" && !isOriginator) {
          // rebuild points2D + restoreGridSnapshot + handle-ui redraw
          ...
          seeded = true;
          logger?.log?.("[align-loader] W4 seed: applied grid from /api/live/snapshot fetch");
        }
      }
    }
  }
  if (!seeded) {
    logger?.log?.("[align-loader] W4 seed: no pending grid + no server grid — Pi will broadcast its initialized default");
  }
} catch (err) {
  logger?.warn?.("[align-loader] W4 seed failed:", err?.message || err);
}
```

The fetch fallback handles the (legitimate) case where Pi opens *first*,
no broadcasts have happened, and only later the bundle loads. In that
case there's nothing to cache yet, but the server may have a disk-
restored grid (Phase 31 h41 path at server.mjs:4271) that we should
adopt before clobbering it.

## Why this also explains Bug 1 and Bug 2 indirectly

- **Bug 1** ("lines snap back"): with W4 in place, Pi's iter2-h2 broadcast
  carries the correct grid → server's `lastAlignGridSnapshot` stays
  authoritative → subsequent polls return Pi's-own state → originator-
  filter skips → Pi's drag-end state persists. The W3 `_lastLocalBroadcastAtMs`
  protection window remains as defense-in-depth but is no longer the
  hot path.
- **Bug 2** (CPU): each wipe-and-restore cycle was forcing a full
  DOM rebuild (`rebuildHandleElements`) AND a 30-Hz drag burst re-apply
  on both Pi and SSR. With the wipe gone, the steady-state is "broadcast
  → apply → idle" with no thrash.

## Test-vs-reality gap (the test author lesson)

The gap was: every existing test exercised paths *after* the bundle was
loaded. The operator's bug only reproduces on the
`broadcast → bundle-load → seed → broadcast` sequence, which requires
either:
1. The dashboard to broadcast a profile BEFORE Pi enters align-mode, OR
2. The Pi page to open AFTER the dashboard's profile load.

Both are completely normal operator workflows but never exercised by
the test rail. W4's new reproducer fixes this gap.

## Files changed

- `src/app/runtime/output-receiver/output-live-sync.js` — add
  `_pendingGridSnapshot` cache + `applyPendingGridSnapshot` /
  `hasPendingGridSnapshot` exports.
- `src/app/runtime/output-receiver/output-align-mode-loader.js` —
  drain pending snapshot (with fetch-fallback) BEFORE the iter2-h2
  defensive broadcast fires.
- `test/live-e2e/test_phase38_w4_real_drag_reproducer.py` — NEW: two
  W4 tests using real pointer events + complex profile.

## Verification command summary

```bash
# All 11 Phase-38 live-E2E tests
python3 -m pytest test/live-e2e/test_phase38_*.py -v

# D-08 hard gate
RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs
```
