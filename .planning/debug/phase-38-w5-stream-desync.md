---
status: awaiting_human_verify
trigger: "Phase 38 W5 — W4 fixed Pi-side wackel-test but two operator bugs SURVIVE. Bug A: profile-load on dashboard updates Pi /output/'s edge+points immediately but STREAM stays at old mesh-warp, especially with complex profiles (xrandrv2 9×9). Bug B: After server boot SSR Chromium tab's stream shows identity grid (full-screen, no mesh-warp). Only kicked into sync when operator starts align-mode."
created: 2026-05-11T00:00:00Z
updated: 2026-05-11T19:00:00Z
---

## Current Focus

hypothesis: Bug B is the real reproducible bug — server boot with no runtime-active-grid.json leaves runtime.lastAlignGridSnapshot null → SSR boots at 3×3 identity → board fills full screen.
test: Bug B Playwright reproducer + visual screenshot diff (board correctly mesh-warped post-fix vs full-screen pre-fix).
expecting: Server-side fallback to projection-profiles.json + boards/<id>.json `lastUsedProfileName` seeds the snapshot on cold boot.
next_action: User confirms post-fix behavior on real Pi.

## Symptoms

expected:
- Bug A: Dashboard profile-load with complex profile → SSR stream visibly updates to new mesh-warp within 1s.
- Bug B: After server boot (without operator interaction), SSR's `grid.points` and rendered video must reflect the persisted profile, not 3×3 identity.

actual:
- Bug A: Pi /output/ edge+points update immediately. STREAM (WebRTC from SSR tab) stays at OLD profile's mesh-warp. Most pronounced with complex profiles (xrandrv2 9×9, non-uniform spacing, many displaced points). Simple test2 (3×3) works.
- Bug B: After server boot, before operator does anything, the projected board fills full screen — NO mesh-warp distortion. SSR has identity grid, not the disk-persisted profile. Toggling align mode causes correct snap.

errors: silent desync — no console errors

reproduction (operator):
- Bug B: cold start server → check Pi /output/'s stream → board fills full screen (no warp)
- Bug A: load xrandrv2 from dashboard's "Load Profile" picker → Pi's overlay matches new geometry, but the underlying stream image does NOT change

started: post commit 945addc (W4). Bug A + Bug B are NEW or LONG-STANDING, not directly W4 regressions.

## Eliminated

- hypothesis: GL renderer doesn't reallocate typed arrays on dimension change.
  evidence: HTTP-direct broadcast 3×3 → 9×9 produces visibly different SSR screenshots (JPEG diff 89.88%); `_glCachedRows !== rows` check fires correctly.
  timestamp: 2026-05-11
- hypothesis: Server's `lastBroadcastVersionByClient` gate suppresses delivery to SSR.
  evidence: Probe 3 broadcast was delivered to SSR (SSR's `grid.points` updated to xrandrv2 9×9 dims and screenshot changed) — version gate did not skip.
  timestamp: 2026-05-11
- hypothesis: profileLoadFlow doesn't broadcast.
  evidence: `runtime-projection-profile-persistence.js:578` calls `_gridStateApi?.broadcastGridSnapshot?.({ force: true })`. Reproducer driving the same code path shows the broadcast lands on SSR.
  timestamp: 2026-05-11
- hypothesis: SSR's activate broadcast overwrites the just-applied snapshot (Bug A).
  evidence: Bug A test passed both pre and post W5 — SSR's stream visibly updates after the loaded profile's broadcast.
  timestamp: 2026-05-11

## Evidence

- timestamp: 2026-05-11T18:00
  checked: boot SSR with operator's persisted 9×9 xrandrv2 runtime-active-grid.json
  found: SSR grid is 9×9, screenshot shows mesh-warped board, server snapshot carries xrandrv2 profile.
  implication: Disk-restore path WORKS when disk has a valid grid.
- timestamp: 2026-05-11T18:05
  checked: boot SSR after removing runtime-active-grid.json (cold start)
  found: SSR grid is 3×3 identity; server's `lastAlignGridSnapshot` is null; screenshot shows board filling entire screen with no mesh-warp.
  implication: BUG B ROOT CAUSE — when disk file is missing, there is no server-side fallback; SSR boots at identity → `hasGridDisplacements()` false → fx-canvas takes over → full-screen board.
- timestamp: 2026-05-11T18:30
  checked: HTTP-direct broadcast 3×3 → 9×9 via /api/live/command
  found: SSR's grid AND screenshot both change; JPEG diff 89.88%.
  implication: Broadcast → SSR's grid.points → GL renderer pipeline works end-to-end. Falsifies H4/H5/H6/H7 for HTTP-direct.
- timestamp: 2026-05-11T18:50
  checked: Playwright reproducer driving real profileLoadFlow on Pi /output/
  found: SSR grid changes 3×3 → 9×9 AND screenshot diff > 3% (test passes on master).
  implication: Bug A as described does not reproduce in test environment after W4. Either already fixed by W4 or requires real-Pi-only conditions (clock skew, encoder GOP, etc.).

## Resolution

root_cause: At server boot, when `config/runtime-active-grid.json` is absent or empty, `loadActiveGrid` returns null and `liveSessionState.snapshot.runtime.lastAlignGridSnapshot` stays null. The SSR Chromium tab's live-hello eager-apply gate sees no grid → no apply. SSR's `autoLoadRememberedProjectionProfile` falls back to `applyDefaultAndCaptureSnapshot()` which produces a 3×3 identity grid. `hasGridDisplacements()` returns false → `postDrawMeshWarp` returns at the no-warp guard → GL canvas hidden → fx-canvas (unwarped board) is the visible surface → operator sees "board fills the entire screen with no mesh-warp distortion".

fix: server.mjs — after the existing `loadActiveGrid` block, if no grid was restored, scan `loadCanonicalBoardsFromStorage()` for the first board with at least one entry in `loadProjectionProfilesRaw()`. Prefer the board's `lastUsedProfileName` if it points to an existing profile, otherwise pick the alphabetically-first profile name. Build a grid snapshot from that profile's `{srcXs, srcYs, points}` and seed `liveSessionState.snapshot.runtime.lastAlignGridSnapshot` with originator `"server-disk-restore"` and `at = new Date().toISOString()`. Also seed `liveSessionState.snapshot.selectedBoard` if it wasn't already set. Bump `liveSessionState.version` so the eager-apply gate fires.

verification:
  - Test `test_phase38_w5_bug_b_boot_ssr_has_persisted_profile` FAILS on master (commit 945addc): "Cold-start SSR has IDENTITY grid (displaced=0). Server lastAlignGridSnapshot=None." → PASSES after fix.
  - Visual: pre-fix cold-boot screenshot shows board filling entire screen; post-fix shows board correctly mesh-warped into the projected rect using "Nemesis A with xrandr" (6×9, 54 displacements) — the alphabetically-first profile for nemesis-board-a.
  - All 13 Phase 38 tests pass.
  - D-08 hard gate `RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs` PASSES (30s sustain).
  - Bug A test passes pre AND post W5; Bug A as described could not be reproduced — see 38-DEBUG-W5.md Phase 2 Probe 4 for the honest analysis.

files_changed:
  - server.mjs
  - test/live-e2e/test_phase38_w5_stream_desync.py
  - .planning/phases/phase-38/38-DEBUG-W5.md
