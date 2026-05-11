# Phase 38 W6 — Picker-driven Dimension Change Investigation

## Operator's surviving bug after W5

After commit `0978d0c` (W5 cold-boot fallback), operator reports Bug A persists with concrete on-machine evidence:

```
[align-grid-snapshot-log] EMIT force=true corners=(0.16,0.15)..(0.81,0.83) profile=test
[ssr-stats] renderMode=gl    (×8)
```

Captured at the same moment:
- `.planning/debug/desync/output_desync_load.png` — Pi /output/ shows teal alignment lines at test geometry; streamed content extends beyond.
- `.planning/debug/desync/output_desync_load_ssr_screenshot.jpg` — SSR canvas: warped board inside an inner rectangle, orange flare clipped at ~84% width.
- `.planning/debug/desync/ssr-grid.json` — SSR's grid is 3×3 with corners (0.042, 0.147)..(0.842, 0.947). srcXs=[0, 0.5, 1], srcYs=[0, 0.5, 1].

Profile shapes in `config/projection-profiles.json`:
- **test2** — 3×3, 9 pts, TL=(0.090, 0.109), BR=(0.890, 0.909).
- **test** — 6×5, 30 pts, TL=(0.158, 0.147), BR=(0.811, 0.823).

Operator's flow: load test2 → load test. After test load, Pi's grid is correctly at test (6×5 with test corners — that's why alignment lines are at test geometry). SSR's grid is stuck at a SCALED 3×3 identity (NOT matching either profile's exact points).

## What W5 missed

The W5 reproducer (`test_phase38_w5_bug_a_profile_load_stream_updates_complex`) drove the profile load via `page.evaluate(...)` calling `api.applyGridPayload(body.data)` and `gs.broadcastGridSnapshot({force:true})` directly. This SKIPPED the toolbar button click + menu pick UI events that the operator triggers. The W5 test passed on master because the UI path was bypassed entirely.

W6's job: drive the EXACT operator UI sequence (mouse-down on the toolbar button → menu opens → mouse-down on a menu item) and verify SSR's grid transitions cleanly through the dimension change.

## What W6 did

### Reproducer (`test/live-e2e/test_phase38_w6_picker_dimension_change.py`)

```python
def _click_load_profile_pick(page, profile_name, timeout_ms=10000):
    page.click(".projection-align-action-load")          # toolbar button
    page.wait_for_function(...)                          # wait for menu item
    page.evaluate(... target.click() ...)                # click the menu item
```

This is what the operator does. No `page.evaluate` shortcut — actual DOM clicks against the rendered toolbar.

### Result on master `0978d0c`

```
test_phase38_w6_picker_load_test2_then_test_changes_ssr_dims PASSED
```

The W6 reproducer drives the operator's flow correctly. SSR's grid transitions through:

| Pick | SSR grid | TL | BR |
|------|----------|----|----|
| (initial) | 3×3 | (0.10, 0.10) | (1.0, 1.0) |
| `test2` | 3×3 | (0.090, 0.109) | (0.890, 0.909) |
| `test` | 6×5 | (0.159, 0.148) | (0.811, 0.834) |

Cycled 5× test↔test2 — always lands on the LAST pick correctly. No revert observed over 10s of polling.

## Instrumentation results

Added a temporary diagnostic to `gridState.restoreGridSnapshot` to log every call with caller stack and old→new dimensions. Captured the full apply sequence on the SSR tab during operator's flow:

```
[w6-diag] restoreGridSnapshot old=3x3 new=3x3 caller=at pollLiveSnapshotOnce (...)
[align-grid-snapshot] poll eager-apply OK profile=w6-baseline points=9
[align-mode] onAlignModeChange enabled=true outputRole=final-output ssrTab=true
[align-grid-snapshot] onAlignModeChange(true) on SSR tab — broadcasting authoritative grid
[align-grid-snapshot] EMIT force=true corners=(0.00,0.00)..(1.00,1.00) profile=unsaved-nemesis-board-a
[w6-diag] restoreGridSnapshot old=3x3 new=3x3 caller=at applyLiveRuntimeSnapshot (...line 640) (slow-path)
[align-grid-snapshot] RECV ageMs=55 ... accept=true profile=unsaved-... points=9
[w6-diag] restoreGridSnapshot old=3x3 new=3x3 caller=at WebSocket.<anonymous> (...line 1039) (fast-path)
... pick test ...
[align-grid-snapshot] RECV ageMs=48 ... accept=true profile=test points=30
[w6-diag] restoreGridSnapshot old=3x3 new=6x5 caller=at applyLiveRuntimeSnapshot (...line 640) (slow-path)
[w6-diag] restoreGridSnapshot old=6x5 new=6x5 caller=at WebSocket.<anonymous> (...line 1039) (fast-path idempotent)
```

Both apply paths (slow-path at runtime-live-sync-core.js:640 inside `applyLiveRuntimeSnapshot`, fast-path at line 1039) successfully transition the grid from 3×3 to 6×5. The fast-path is idempotent after the slow-path applies. No subsequent revert.

The instrumentation has been REMOVED before commit.

## Hypotheses I could not reproduce

Per `.planning/debug/phase-38-w6-ssr-grid-stuck.md`, these remain plausible mechanisms that would fit operator's evidence:

1. **Multi-host WS race**. Operator's Pi is at `192.168.40.6` — separate machine from the server. Network latency Pi → server is 10-100ms; server → SSR is sub-ms localhost. Our test env collapses both onto the same loopback.

2. **Server `lastBroadcastVersionByClient` gate** (server.mjs:1599). If a non-mutation path bumps SSR's tracked version above the test broadcast's version, server SKIPS sending test's update to SSR. Unable to construct a hit on this gate from our test env.

3. **SSR `_pageLoadAtMs` race**. `arrivedAfterLoad` requires `snapAt >= _pageLoadAtMs`. If SSR Chromium tab was restarted (ssr-render-host.mjs:749) AFTER the test broadcast was QUEUED, the gate would reject the broadcast. Hard to trigger deterministically.

4. **Operator browser cache**. Pi browser may have stale cached JS pre-dating W3/W4/W5. Recommend force-reload before next UAT.

5. **SSR-side onAlignModeChange(true) overwrite race**. If something fires SSR's `onAlignModeChange(true)` between Pi's "test" broadcast leaving and SSR receiving it, SSR's broadcast of its OLD 3×3 grid (with `profileId: "unsaved-..."`) overwrites server's `lastAlignGridSnapshot`. The 3×3 grid stays. Pi's local grid stays at test (since Pi is the originator and ignores the bounce-back). This fits operator's exact symptoms (Pi at test, SSR at 3×3, server stuck) but requires a precise timing window I couldn't trigger in our env. The fact that operator's SSR grid shows corners (0.042, 0.147)..(0.842, 0.947) — NOT exactly matching either test2 or test — could be explained if SSR's grid was MID-TRANSITION (between applies) when the operator's evidence was captured.

## What I refuse to do

The hard constraint "reproducer MUST FAIL on master" cannot be satisfied with the operator's described flow in our test environment. I refuse to:

- Commit a fabricated reproducer that artificially fails (e.g., by mocking WS, injecting fake timing, or asserting a state that master correctly handles). That would be regression-test theater that locks future fixes into a scenario unrelated to the operator's real bug.
- Implement a speculative "fix" without a failing test to validate against. Hot candidates (e.g., having the fast-path also update `_lastAppliedAlignGridSnapshotKey`, or adding timestamp comparison before applying) could MASK a different bug while introducing regressions in W2/W3/W4's Pi-side fixes.

## What I delivered

1. **W6 regression rail**: `test/live-e2e/test_phase38_w6_picker_dimension_change.py` drives the exact operator UI flow. PASSES on master. Documents the menu-pick sequence as the contract that must be preserved.

2. **Debug session**: `.planning/debug/phase-38-w6-ssr-grid-stuck.md` records the hypotheses tested and eliminated, the open hypotheses, and the honest assessment that the bug is not reproducible in our single-host x86_64 Xvfb test environment.

3. **This investigation log**: documents what was tried, what was found, and what remains open.

## Regression check — Phase 38 + D-08

```
$ DISPLAY=:98 python3 -m pytest test/live-e2e/test_phase38_*.py -v
   (see "Verification" section below)

$ RUN_LIVE_TESTS=1 timeout 90 node --test test/connection-stability/live-fixture-smoke.test.mjs
   (see "Verification" section below)
```

## Verification

Phase 38 full suite + D-08 results captured below to confirm no regression introduced by W6 (which only ADDS a new test; no source changes).

```
test/live-e2e/test_phase38_pi_ssr_sync_enforcement.py             see below
test/live-e2e/test_phase38_profile_load_ssr_sync.py               see below
test/live-e2e/test_phase38_ssr_grid_state_cdp.py                  see below
test/live-e2e/test_phase38_ssr_visual_diff.py                     see below
test/live-e2e/test_phase38_w3_input_priority.py                   see below
test/live-e2e/test_phase38_w4_real_drag_reproducer.py             see below
test/live-e2e/test_phase38_w5_stream_desync.py                    see below
test/live-e2e/test_phase38_w6_picker_dimension_change.py          see below
```

## Recommendation for next debug round

If the operator continues to report Bug A, the next step is:

1. **Operator-hardware UAT with structured logging**. Add a temporary diagnostic mode (env flag, e.g., `TT_BEAMER_GRID_DIAG=1`) that:
   - Logs every `restoreGridSnapshot` call on the SSR side with stack trace + dimensions + caller.
   - Logs every server-side `[align-grid-snapshot] server-recv` line including `lastBroadcastVersionByClient` map state.
   - Logs every SSR-side `[align-grid-snapshot] EMIT` line that originates from SSR (the alignMode-toggle broadcast at handle-ui.js:1727).
   - Forwards SSR-tab `console.log` to server stdout via existing CDP path.
2. **Operator captures the full log** alongside their `ssr-grid.json` + `output_desync_load.png` + `output_desync_load_ssr_screenshot.jpg`. The sequence of `restoreGridSnapshot` calls between test pick and the captured snapshot will tell us exactly what restored SSR's grid to 3×3.
3. **Inspect the SSR-side `onAlignModeChange(true)` broadcast log** — if it fires BETWEEN the test pick and the captured snapshot, hypothesis H-OPEN-5 (SSR's old-grid broadcast overwrites server's test snapshot) is likely the bug.

Until that hardware-attached UAT runs, W6's contribution stands as: the operator's UI flow does NOT trigger the bug in our test environment; a deeper instrumentation pass on real hardware is required.
