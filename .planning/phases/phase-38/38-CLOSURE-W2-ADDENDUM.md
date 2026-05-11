---
phase: 38
slug: pi-output-grid-sync
status: ROOT-CAUSE-FIXED
closed: 2026-05-11
supersedes: 38-CLOSURE.md
---

# Phase 38 — W2 Addendum: Root-Cause Fix for Pi-Side Desync

## TL;DR

The W1 CDP-based tests verified the apply path SSR-tab-side and concluded
"no behavioral fix needed." That was correct for the SSR tab — but the
operator's reported desync was on the **Pi side**, which W1 didn't test.

A new test `test_phase38_pi_ssr_sync_enforcement.py` (queries Pi's grid
via `page.evaluate` AND SSR's grid via CDP) demonstrated:

> After a broadcast, Pi's `grid.points[0][0]` stays at `(0, 0)` (identity)
> while SSR's correctly updates to broadcast value.

Pi /output/ never applies `align-grid-snapshot` broadcasts.

## Root Cause

Pi /output/ is the **thin Phase-34 HTML** (`output.html`) that loads ONLY:
- `runtime-env.js`
- `output-live-sync.js` (thin WS subscriber)
- `receiver-bootstrap.js` (WebRTC consumer)
- `output-audio-binder.js`
- `output-align-mode-loader.js` (lazy-loaded on alignMode toggle)

It does NOT load `runtime-live-sync-core.js` (the full module that has
the `align-grid-snapshot` fast-path apply). The thin `output-live-sync.js`
dispatched ONLY these mutation types:
- context-update
- start-animation
- stop-animation
- clear-all

**Every `align-grid-snapshot` broadcast that arrived at Pi was silently
dropped** because `dispatch()` had no branch for it.

Pi's grid only ever changed via Pi's own local drag handler. When the
dashboard broadcast a profile-load (or any other client broadcast a grid
mutation), Pi's grid stayed at its localStorage default. Pi's overlay
lines were drawn from this stale grid → visible offset against the
SSR-tab's streamed mesh-warp, which DID apply broadcasts.

## Fix (commit 9bea236)

`src/app/runtime/output-receiver/output-live-sync.js`:

1. **New `_applyAlignGridSnapshot(snap)`**: rebuilds the `points2D`
   representation from the flat broadcast payload and calls
   `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE.restoreGridSnapshot`.
   Triggers handle-ui redraw if loaded. Originator-filtered.
2. **`dispatch()` routes align-grid-snapshot** envelopes through
   `_applyAlignGridSnapshot` and also emits `alignGridSnapshot` event.
3. **Live-hello seeds the grid** from `runtime.lastAlignGridSnapshot`
   so first paint after connect reflects server state, not localStorage.
4. **1Hz `pollOnce()` reconciles the grid** as a packet-loss safety net.
   If a single WS broadcast was dropped on the wire, Pi catches up via
   the HTTP poll within ~1s.
5. **New `onAlignGridSnapshot(handler)` subscription** for future consumers.

## Verification

```bash
python3 -m pytest test/live-e2e/test_phase38_pi_ssr_sync_enforcement.py -v
# test_phase38_pi_ssr_sync_after_single_shot PASSED
# test_phase38_pi_ssr_sync_after_drag_burst PASSED

python3 -m pytest test/live-e2e/test_phase38_ssr_grid_state_cdp.py \
                  test/live-e2e/test_phase38_ssr_visual_diff.py \
                  test/live-e2e/test_phase38_profile_load_ssr_sync.py \
                  test/live-e2e/test_phase38_pi_ssr_sync_enforcement.py -v
# 7 passed in 86s
```

D-08 connection-stability re-verified GREEN.

## Operator-Visible Behavior Change

After this fix, on every Pi /output/:
- Profile load broadcast from dashboard → Pi's overlay lines update
  within ~250ms (WS broadcast) or ~1s (poll safety-net)
- Drag broadcasts from another client → Pi tracks them in real time
- ESC discard broadcast from another client → Pi snaps to identity

Pi's own local drag is unaffected (originator-filter skips self-broadcasts).

## What stays

- All Phase 36-iter2 hotfixes h1-h7 + 1f7582e rate-limit removal
- W1 diagnostic endpoints `/api/diag/ssr-grid` + `/api/diag/ssr-screenshot`
- W1 CDP regression tests
- New W2 regression test `test_phase38_pi_ssr_sync_enforcement.py`

## Tag

`phase-38-w2-pi-sync-fix` at commit 9bea236.
