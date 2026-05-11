---
status: gathering
trigger: "Phase 38 W4 — three operator-reported bugs survive commits 9bea236 (W2) and 87b034b (W3). Tests pass but operator's real Pi /output/ device still desyncs. Find the test-vs-reality gap."
created: 2026-05-11T00:00:00Z
updated: 2026-05-11T00:00:00Z
---

## Current Focus

hypothesis: TBD — survey codebase first
test: read source + tests + W3 commit changes
expecting: identify falsifiable hypotheses for each of three bugs
next_action: read output-live-sync.js (W2 + W3 changes), runtime-projection-handle-drag.js, runtime-projection-grid-state.js, runtime-live-sync-core.js apply-paths, server-side broadcast gates

## Symptoms

expected:
- Bug 1: After fast drag + release on Pi /output/, Pi's overlay lines STAY at drag-end position (Pi is authoritative). Stream should converge to Pi's state.
- Bug 2: CPU usage stays low on Pi during transforms.
- Bug 3: Complex profile (xrandrv2 9×9, 81 points, non-uniform srcXs/srcYs) syncs Pi overlay == SSR stream perfectly, just like simple profile (test2 3×3).

actual:
- Bug 1: After release, Pi's overlay lines briefly show drag-end then snap BACK to stream's older state ("zappen zurück") — Pi loses its input, stream's old state wins. Operator quote: "damit die eingaben in /output/ immer respektiert werden und nicht verloren gehen".
- Bug 2: CPU is high during transforms (concerning for Pi hardware).
- Bug 3: With xrandrv2 (9×9) and similar complex profiles, Pi overlay lines and SSR stream stay at DIFFERENT positions until a manual small transform "kicks" it back in sync. Wiggle+release reproduces the desync.

errors: no errors — silent desync between Pi DOM overlay and SSR stream

reproduction (operator):
- Load complex profile (xrandrv2) on real Raspberry Pi
- From dashboard or via direct touchscreen interaction on Pi, fast-drag a handle and release
- Pi lines snap-back, or Pi lines diverge from stream
- Manual nudge restores sync

started: After commits 9bea236 (W2) and 87b034b (W3). Bug 1 + 3 + CPU are persistent across both.

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-05-11
  checked: source-read output-live-sync.js + grid-state.js + handle-drag.js + live-sync-core.js + server.mjs
  found:
    - Pi's `_lastLocalBroadcastAtMs` (Pi clock) is compared to `snap.at` (server clock) via `Date.parse(snap.at)`. With clock skew (Pi-clock != server-clock), `remoteAgeMs = Date.now() - snapAt` can be artificially LARGE → legitimate remote snapshots SKIPPED for 2s after any Pi broadcast.
    - Pi DOES emit `broadcastGridSnapshot({force:true})` on align-mode activate (output-align-mode-loader.js:644 iter2-h2). So `_lastLocalBroadcastAtMs` is set IMMEDIATELY on alignmode entry — the 2s protection window is active before any drag.
    - `/api/live/command` HTTP POST gets originatorClientId="http-command" (server.mjs:3686). Pi's clientId is different → originator-filter does NOT skip.
    - Tests run Pi as Chrome page on same x86 host as server → Pi-clock IS server-clock (zero skew). Test's HTTP POST broadcasts work because clocks are aligned.
    - Real Pi may have clock skew vs server. Even with NTP-sync, sub-second drift is normal.
    - Real Pi uses real `pointerdown/move/up` events → drag handler emits via WS (~30Hz rate-limited), not test's synthetic `g.broadcastGridSnapshot({force:true})`.
    - Test scenario uses HTTP POST baseline → page.evaluate(setPoint+broadcastGridSnapshot) → verifies Pi state. This BYPASSES the actual pointer event drag handler.
  implication: Hypotheses to test:
    H1 (Bug 1+3): clock-skew-based skew check + Pi's iter2-h2 activation broadcast → after any Pi broadcast, remote snapshots from dashboard (profile-load) within 2s are SKIPPED. Real Pi clock may differ from server clock by enough to make `remoteAgeMs > localAgeMs + 200` true.
    H2 (Bug 1+3): The skew check is too pessimistic even WITHOUT clock skew. After Pi's iter2-h2 broadcast (at activation), Pi sets `_lastLocalBroadcastAtMs`. Then dashboard does profile-load 1s later. `localAgeMs=1000`, `remoteAgeMs=10` (server processed quickly). Check `10 > 1000+200`? No, applies fine. So H2 alone doesn't break.
    H3 (Bug 3): Pi receives dashboard profileLoad broadcast with 9x9 dims (xrandrv2). `rebuildHandleElements` rebuilds DOM correctly. BUT the iter2-h2 activation broadcast Pi just emitted was 3x3 (or whatever was loaded BEFORE profile-load). When server applies Pi's old broadcast AFTER dashboard's profile-load (due to mutation queue ordering), the server's lastAlignGridSnapshot becomes OLD 3x3 → broadcast that to all → Pi reverts to 3x3 → DESYNC.
    H4 (Bug 1): On real pointer events, drag handler emits at ~30Hz THROUGHOUT drag. Each emit goes through queue/throttle. The DRAG-END force emit is sent. If the drag-end emit arrives at server BEFORE all drag-during emits are processed (queue ordering), the LAST applied state could be a stale drag-during state, not drag-end. Server then broadcasts that stale state, Pi's poll fetches it, originator-filter SKIPS (Pi is originator), Pi stays at drag-end. Wait — originator-filter skips, so Pi stays. So poll doesn't clobber. Unless poll snapshot's `originatorClientId` differs (e.g. after a reconnect, Pi's clientId changes!).
    H5 (Bug 1 strongest): On WS reconnect, Pi gets a NEW clientId. Pi's previous broadcasts were tagged with OLD clientId. After reconnect, originator-filter compares snap.originatorClientId (=OLD clientId from server's stored state) against NEW clientId → mismatch → NOT originator → APPLY. So Pi clobbers its own state after a WS reconnect.

## Evidence (cont.)

- timestamp: 2026-05-11T18:00
  checked: ran test_phase38_w4_diag_order — opens Pi /output/, reads window state BEFORE align-mode toggle, THEN toggles align-mode, reads again, then sends post-bundle broadcast.
  found:
    STATE 1 (after goto, BEFORE alignMode):
      window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE = false (undefined)
      window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI = false
    STATE 2 (after alignMode toggle, bundle loaded):
      window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE = true
      grid_srcXs_len = 3 ← 3x3 DEFAULT despite the pre-connect 9x9 broadcast!
      grid_tl = {x: 0, y: 0} ← default
      handle_count = 9
    STATE 3 (after post-bundle broadcast):
      grid_srcXs_len = 9 (9x9 NOW correct)
      grid_tl = {x: 0.3, y: 0.4}
      handle_count = 81
    Server log shows:
      [align-grid-snapshot] server-recv from=control/http-command profile=phase38-w4-pre  ← original 9x9 broadcast
      (no Pi-apply log because Pi silently no-op'd)
      [align-grid-snapshot] server-recv from=final-output/live-mp1f84mc-klzr8v corners=TL(0.00,0.00)..BR(1.00,1.00) profile=unsaved-nemesis-board-a  ← Pi's iter2-h2 broadcasts the 3x3 IDENTITY, overwriting server state!
      [ssr-tab RECV] originator=live-mp1f84mc accept=true profile=unsaved-nemesis-board-a points=9  ← SSR applies Pi's 3x3 OVERWRITE
  implication: ROOT CAUSE CONFIRMED.

## Root cause

**output-live-sync.js's `_applyAlignGridSnapshot` silently no-ops** when called BEFORE the lazy align-mode bundle has loaded (which happens on first alignMode=true toggle). Because Pi /output/ is the thin Phase-34 HTML that does NOT include `runtime-projection-grid-state.js` in its initial script set — that module is part of the IIFE bundle loaded by `output-align-mode-loader.js` on first alignMode toggle.

The check at line 184:
```js
const gs = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
if (!gs || typeof gs.restoreGridSnapshot !== "function") return;
```
returns silently. The W2 fix's live-hello-seed and 1Hz-poll-reconcile paths both go through this guarded function — but since they fire BEFORE bundle load, they ALL silently no-op.

**Worse**: when align-mode IS toggled on, `output-align-mode-loader.js`'s iter2-h2 fires `broadcastGridSnapshot({force:true})` with Pi's CURRENT grid (3x3 default, never seeded from server). Server records Pi's 3x3 as the authoritative `lastAlignGridSnapshot`, and broadcasts to all clients including SSR. **SSR + dashboard get DEMOTED back to 3x3 identity, wiping the operator's loaded profile.**

This explains:
- Bug 3 (complex profile desync): when Pi toggles align-mode AFTER dashboard loaded a 9x9 profile, Pi's identity broadcast wipes the 9x9 from server + SSR + dashboard. Pi shows 3x3 handles, stream shows 3x3 (no calibration), dashboard's loaded profile is gone.
- Bug 1 (lines snap back): same mechanism — Pi's stale local grid keeps winning the broadcast race.
- Bug 2 (CPU): less direct, but constant re-applies from the wipe-and-restore cycle add work.

## Resolution

root_cause: Pi /output/'s `_applyAlignGridSnapshot` silently no-ops before the lazy bundle loads, so live-hello + 1Hz poll fail to seed Pi's grid. Then Pi's iter2-h2 activation broadcast with its 3x3 default WIPES the server-side 9x9 + dashboard + SSR state.

fix: Two-part change.
  Part A — `src/app/runtime/output-receiver/output-live-sync.js`:
    Add `_pendingGridSnapshot` cache. When `_applyAlignGridSnapshot` is called and `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE` is not yet defined, STORE the snap in the cache instead of silently returning. Last-writer-wins.
    Expose `applyPendingGridSnapshot()` and `hasPendingGridSnapshot()` on the return object so the align-mode loader can drain the cache once the bundle is initialized.
  Part B — `src/app/runtime/output-receiver/output-align-mode-loader.js`:
    Between `bootHandleUi(...)` returning AND the iter2-h2 defensive broadcast firing, call `liveSync.applyPendingGridSnapshot()`. If the cache was empty, FETCH `/api/live/snapshot` directly and apply its `runtime.lastAlignGridSnapshot` to grid-state + rebuild handles. Either way, the iter2-h2 broadcast now carries the CORRECT seeded grid, not the 3x3 default.

verification:
  - Test `test_phase38_w4_real_drag_reproducer.py` (NEW W4 test that uses real `page.mouse.down/move/up` events and 9×9 baseline) FAILED on master commit 87b034b with "Expected 9×9 baseline, got srcXs len=3". After the W4 fix, both W4 tests PASS.
  - All 11 phase-38 live-E2E tests pass (incl. existing W2/W3 enforcement tests).
  - D-08 hard gate `RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs` still PASSES.
  - Server log evidence: pre-fix showed Pi emitting `corners=(0.00,0.00)..(1.00,1.00)` (3x3 identity overwrite); post-fix shows Pi emitting `corners=(0.30,0.40)..(1.00,1.00)` (the correctly seeded 9x9).

files_changed:
  - src/app/runtime/output-receiver/output-live-sync.js
  - src/app/runtime/output-receiver/output-align-mode-loader.js
  - test/live-e2e/test_phase38_w4_real_drag_reproducer.py (NEW W4 reproducer)
  - .planning/phases/phase-38/38-DEBUG-W4.md (debug log)
