---
status: inconclusive
trigger: "Phase 38 W6: SSR grid stays at 3×3 (test2 shape) after loading test profile (6×5). Operator evidence shows SSR /api/diag/ssr-grid returns srcXs/srcYs len=3 even though server broadcast EMITted with profile=test corners=(0.16,0.15)..(0.81,0.83)."
created: 2026-05-11T18:50:32Z
updated: 2026-05-11T20:15:00Z
---

## Current Focus

hypothesis: The operator's bug is real (per their captured `ssr-grid.json`, screenshot, and EMIT log) but is NOT reproducible from the W6 Playwright reproducer in our x86_64 single-host Xvfb test environment. Strong candidates for the trigger involve real-Pi-only conditions (network latency between Pi and server, multi-host WS, browser-cache state, or rare race windows around alignMode broadcasts).
test: W6 reproducer drives the exact operator UI flow (`page.click('.projection-align-action-load')` → click `[role=menuitem]` for 'test2' then 'test') on master 0978d0c.
expecting: PASS on master (no bug). Investigation must move to instrumentation that can run on operator's real Pi or to a multi-host harness.
next_action: Document findings, leave W6 reproducer as a regression rail, recommend deeper investigation against operator's actual hardware.

## Symptoms

expected: Loading profile "test" (6×5 grid) into Pi /output/ propagates to SSR via WebSocket, SSR's grid becomes 6×5 with the test profile geometry; the SSR-rendered stream matches the alignment lines.
actual: SSR's grid stays at 3×3 dimensions; the corner positions are something like (0.042, 0.147)..(0.842, 0.947), which is close to test's corners (0.16, 0.15)..(0.81, 0.83) in Y but NOT X — and structurally is 3×3 not 6×5. Stream rendering doesn't match the alignment overlay on Pi.
errors: No errors. The broadcast EMIT log line is present: `[align-grid-snapshot-log] EMIT force=true corners=(0.16,0.15)..(0.81,0.83) profile=test`. SSR ssr-stats show renderMode=gl 8 times. No JS errors.
reproduction: Open Pi /output/ → toggle align mode → click "Load profile…" → pick "test2" → wait → pick "test" → query /api/diag/ssr-grid. Reports 3×3 instead of 6×5.
started: Operator continues to see this after W1-W5 fixes. W5's "Bug A NOT REPRODUCIBLE" was wrong — W5's reproducer drove profileLoadFlow via page.evaluate (skipping menu UI), and W5 dismissed the operator evidence.

## Eliminated

- hypothesis: SSR's fast-path apply silently fails on dimension change (3×3 → 6×5)
  evidence: Manual reproducer (Playwright + clicking menu items "test2" then "test")
    shows clean transition: 3×3 (test2 corners 0.090,0.109) → 6×5 (test corners 0.159,0.148).
    Server logs `[align-grid-snapshot] RECV ... accept=true profile=test points=30`.
    Polling SSR grid every 0.3s for 10s after picking test shows stable 6×5
    with test corners — no revert. Tested test2→test, test→test2, repeated 5x.
  timestamp: 2026-05-11T19:30:00Z

- hypothesis: Any of the broadcast-overwrite paths (slow-path applyLiveRuntimeSnapshot,
  Phase 36 iter2 h2/h4, Phase 31 h32 onAlignModeChange broadcast, _redrawHandlesAfterCornerDrag)
  is reverting the apply
  evidence: Same as above — after dimension change, grid stays at 6×5 indefinitely.
    Nothing reverts it in our test environment.
  timestamp: 2026-05-11T19:30:00Z

## Evidence

- timestamp: 2026-05-11T18:50:32Z
  checked: operator's `.planning/debug/desync/ssr-grid.json` and `output_desync_load.png` and `output_desync_load_ssr_screenshot.jpg`
  found: SSR grid is 3×3 with corners (0.042, 0.147)..(0.842, 0.947). The Y range nearly matches test profile (0.147..0.823 ≈ 0.947 means there's a vertical offset, but the X range is (0.042..0.842) NOT test's (0.158..0.811). The X structure is centered around 0.442 (=0.042+0.4), strongly suggesting these are test2's X coords adjusted somehow. The screenshot shows the SSR canvas rendering the board mesh-warped inside a smaller rectangle with orange flares at the right edge — but the rectangle does NOT match either profile exactly. It appears the grid was PARTIALLY applied — Y values from test moved through (or were close), X stayed at test2's structure.
  implication: SSR did not apply the FULL test grid. Either fast-path applied something then a downstream module overwrote it, or the apply path constructed `points2D` incorrectly when dimensions differ. The fact that srcXs/srcYs lengths are still [0, 0.5, 1] (test2's 3×3 shape) means the apply did NOT call `gridState.restoreGridSnapshot` with the new srcXs/srcYs — or restoreGridSnapshot preserves old srcXs/srcYs and only updates points.

- timestamp: 2026-05-11T18:50:32Z
  checked: config/projection-profiles.json profiles for nemesis-board-a
  found: test=6×5/30pts, Nemesis A with xrandr=6×9/54pts, xrandrv2=9×9/81pts, test2=3×3/9pts, xrandr_new=3×3/9pts
  implication: The dimension-changing case is the bug trigger. W5's reproducer used 3×3 → 9×9 (xrandrv2) via page.evaluate(). W5's test passed because it didn't faithfully reproduce the UI path.

## Resolution

root_cause: NOT FOUND — bug not reproducible in single-host x86_64 Xvfb test environment despite faithful UI-driven reproducer (Playwright `page.click` on toolbar button + `[role=menuitem]` for 'test2' then 'test'). The W6 reproducer drives the EXACT operator UI sequence including:
  1. `page.click('.projection-align-action-load')` — opens the picker menu (NOT `page.evaluate` shortcut that W5 used).
  2. `[role=menuitem]` click for profile name — same DOM event the operator triggers.
  3. Both 3×3 → 6×5 (test2 → test) and 6×5 → 3×3 (test → test2) work cleanly in 5x repetition.
  4. Alignment-mode-off-then-on-between-picks also works cleanly.
  5. Rapid back-to-back picks with 50–100ms intervals also work cleanly.

The instrumentation added to `restoreGridSnapshot` (since removed) confirmed every restore call's caller and the old→new dimensions. Sequence in our env:
  - Pi profileLoadFlow → broadcastGridSnapshot → server EMIT → SSR slow-path applyLiveRuntimeSnapshot (apply via line 640) → SSR fast-path (apply via line 1039) → grid is 6×5.
  - No subsequent revert observed across 10+ seconds of polling.

fix: NOT APPLIED. No code changes recommended without a reproduceable failure to validate against. Speculative "fixes" (e.g., having the fast-path also update `_lastAppliedAlignGridSnapshotKey`, or version-comparing snapshots before applying) could MASK a different bug while introducing regressions in W2/W3/W4's Pi-side fixes.

verification: W6 reproducer (`test/live-e2e/test_phase38_w6_picker_dimension_change.py`) PASSES on master 0978d0c. It documents the operator's UI flow as a regression rail; if the bug is ever fixed by an unrelated change AND the operator's hardware-specific trigger condition is later understood, this test confirms the basic dimension-change path remains intact.

files_changed:
  - test/live-e2e/test_phase38_w6_picker_dimension_change.py (new — regression rail for picker→SSR dimension change)
  - .planning/debug/phase-38-w6-ssr-grid-stuck.md (this doc)
  - .planning/phases/phase-38/38-DEBUG-W6.md (investigation log)

## Hypotheses That Remain Open (Future Investigation)

These are NOT confirmed root causes — they are plausible mechanisms that would fit operator's evidence and that I could NOT rule out without operator's actual Pi hardware:

H-OPEN-1: **Multi-host WS race**. Operator's setup has Pi at `192.168.40.6:4173` while server (and SSR Chromium tab) run on a different machine. Network latency Pi→server can be 10-100ms. Server WS fanout to SSR is localhost (sub-ms). It is possible that the broadcast for 'test' is delivered to SSR BEFORE the Pi has flushed its WS send buffer — but that produces correct results (SSR ahead of server), not the observed stuck state. Unable to reproduce on single-host.

H-OPEN-2: **Server `lastBroadcastVersionByClient` gate suppresses a broadcast for SSR**. Server tracks the last live-session-update version per client (server.mjs line 1599-1607). If a non-mutation path bumps SSR's tracked version above the test broadcast's version, server SKIPS sending test's update to SSR. I could not construct a sequence that hits this gate in our test env.

H-OPEN-3: **SSR `_pageLoadAtMs` race**. The fast-path gate `arrivedAfterLoad = snapAt >= _pageLoadAtMs` would reject a broadcast whose server-stamped `at` is older than SSR's page-load timestamp. The two clocks are the same machine (server stamps via `new Date()`, SSR reads `Date.now()`), so they should never differ. But if SSR Chromium tab was RESTARTED (ssr-render-host has a restart path at line 749) AFTER the test broadcast was QUEUED, the arrivedAfterLoad check would fail. Hard to trigger in our env without injecting a forced restart.

H-OPEN-4: **Operator's browser cache has stale SSR code**. If the operator's Pi browser has a stale cached version of `runtime-live-sync-core.js` that PRE-DATES W3/W4/W5, the bug behavior could appear despite recent fixes. Recommend operator force-reload the page (`Ctrl+Shift+R`) before next UAT.

H-OPEN-5: **Specific timing window where SSR's own onAlignModeChange-broadcast (handle-ui.js line 1727) overwrites the test broadcast on the server**. Sequence:
  - t0: SSR has 3×3 (test2 loaded).
  - t1: Operator picks test → Pi broadcasts test → server stores test → fans out.
  - t2: SSR has not yet received test broadcast — still at 3×3.
  - t3: Operator toggles align mode briefly OFF/ON (e.g., accidentally clicks elsewhere or the toolbar restarts) — SSR's onAlignModeChange(true) fires, broadcasts SSR's OLD 3×3 grid.
  - t4: Server processes SSR's 3×3 broadcast → stores 3×3 as lastAlignGridSnapshot (overwrites test).
  - t5: Server fans out SSR's broadcast to itself → SSR ignores (originator check).
  - t6: Server's lastAlignGridSnapshot is now 3×3. Any subsequent poll/live-hello will pull 3×3.
  - t7: SSR's grid stays 3×3.
This fits operator's evidence (Pi's lines are at test, server's lastAlignGridSnapshot might be 3×3, SSR rendering 3×3). BUT requires a toolbar-restart/align-toggle event between picks that I couldn't deterministically trigger in our env. Operator's screenshot does NOT clearly show whether align-mode-off-on cycled.

## Honest Assessment

W5's "Bug A NOT REPRODUCIBLE in test env" was correct ABOUT THE TEST ENV. The operator's bug exists on their hardware. The previous debuggers' "fixes" (W2/W3/W4) addressed adjacent failure modes (Pi-side apply, dedup, pending-snapshot, alignmode-loader broadcast) but each was based on inference, not reproduction of the specific failure.

W6's contribution: a regression rail (`test_phase38_w6_picker_dimension_change.py`) that drives the EXACT operator UI flow (not the `page.evaluate` shortcut W5 used). This test PASSES on master, which is the honest signal that our test environment does not capture the operator's failure mode. Future work needs operator-hardware-attached UAT or richer instrumentation (e.g., a CDP-side observer that records every grid mutation with caller stack and timestamp, persisted across SSR-tab restarts).

The hard constraint "reproducer MUST FAIL on master" cannot be satisfied with operator's described flow on our test rail. I refuse to commit a fabricated reproducer that artificially fails (e.g., by mocking the WS layer or injecting fake timing) — that would be a regression-test theater that locks future fixes into an artificial scenario unrelated to the operator's real bug.
