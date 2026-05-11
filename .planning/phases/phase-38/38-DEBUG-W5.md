# Phase 38 W5 — Stream Desync Debug Log

## Operator's surviving bugs after W4

- **Bug A**: profile-load on dashboard → Pi /output/'s edge+points update immediately, but the STREAM (WebRTC video from SSR Chromium tab) stays at OLD profile's mesh-warp. Especially with complex profiles (xrandrv2 9×9). Simple "test2" (3×3) works fine.
- **Bug B**: Boot path — after server start, the projected board fills full screen with NO mesh-warp distortion (identity grid). Only when operator starts align mode does it snap into the correct geometry.

## Honest assessment of W1-W4 failures

The pattern: I kept fixing the **Pi-side apply chain** and verifying via "SSR's grid.points matches the broadcast". I never visually compared the SSR canvas's rendered output against the expected mesh-warp.

- **W1** (`52b7dba`): CDP diagnostics added. Tests posted broadcasts directly via HTTP, verified SSR's `grid.points`. Did NOT use the dashboard's `profileLoadFlow`, did NOT visually verify the stream.
- **W2** (`9bea236`): Pi /output/ thin sync started consuming `align-grid-snapshot`. Pi-side only.
- **W3** (`87b034b`): Local-clobber protection + dedup. Pi-side only.
- **W4** (`945addc`): `_pendingGridSnapshot` cache + drain on bundle load. Pi-side. Fixed the wackel-test by stopping Pi from broadcasting its stale identity over the loaded profile.

What was never tested: complex-profile dimension change (3×3 → 9×9) via the actual dashboard `profileLoadFlow`, with screenshot diff of SSR's rendered canvas.

What was never tested for boot: that SSR's `grid.points` after fresh server boot actually equals the disk-persisted profile's mesh.

---

## Phase 0: Knowledge base check

`.planning/debug/knowledge-base.md` did not exist; proceeded with open-ended hypotheses.

## Phase 1: Initial hypotheses

- **H1 (Bug B)**: `_tryApplyDiskRestoredGrid` in `runtime-board-switch.js` is wired only for Pi /output/; SSR boots with default.
- **H2 (Bug B, server-side)**: Server's `runtime.lastAlignGridSnapshot` is not seeded from disk → live-hello carries no snapshot.
- **H3 (Bug A)**: `profileLoadFlow` does not emit an `align-grid-snapshot` broadcast for the new profile.
- **H4 (Bug A)**: GL renderer's cached typed arrays don't reallocate on dimension change.
- **H5 (Bug A)**: Server's `lastBroadcastVersionByClient` gate skips delivery to SSR.
- **H6 (Bug A)**: SSR's own activate broadcast (Phase 36 iter2 h2) overwrites the just-applied snapshot.
- **H7 (Bug A)**: SSR's profile-persistence reverts the grid after apply.

---

## Phase 2: Evidence gathering — eliminating Bug A hypotheses

### Probe 1: SSR boot with operator's persisted xrandrv2 grid

Set up: `config/runtime-active-grid.json` contains the operator's 9×9 xrandrv2 (TL at ~0.21, BR at ~0.76).

```
SSR grid: dim=9x9
Server lastAlignGridSnapshot: profile=xrandrv2 points=81 at=2026-05-11T17:30:17.083Z
```

Screenshot saved as `/tmp/ssr_boot_screenshot.jpg`: board is correctly squeezed into the projected rectangle (mesh-warp is applied). **H1, H2 falsified for the on-disk case** — when disk has a valid grid, SSR boot apply path works.

### Probe 2: SSR boot with disk REMOVED

Set up: temporarily delete `config/runtime-active-grid.json` (cold start, fresh install scenario).

```
SSR grid: srcXs len=3 srcYs len=3
TL={'x': 0, 'y': 0}
Server lastAlignGridSnapshot: None
```

Screenshot `/tmp/ssr_boot_no_disk.jpg`: board fills the entire screen with NO mesh-warp distortion — **exactly matching the operator's Bug B description**.

**Root cause of Bug B confirmed**: when `runtime-active-grid.json` is absent (or empty), `loadActiveGrid` returns null → server's `runtime.lastAlignGridSnapshot` stays null → live-hello carries no snapshot. Every client (SSR, dashboard, Pi /output/) falls through `autoLoadRememberedProjectionProfile` → `_tryApplyDiskRestoredGrid` returns false → `applyDefaultAndCaptureSnapshot()` produces 3×3 identity → `hasGridDisplacements()` returns false → `postDrawMeshWarp` returns at the no-warp guard → fx-canvas is the visible surface, board fills full screen.

### Probe 3: HTTP-direct profile-load broadcast (Bug A precursor)

Set up: server boots with simple 3×3 disk grid (warped TL). Then HTTP-POST a broadcast to load xrandrv2 9×9.

```
INIT SSR grid: dim=3x3 TL={'x': 0.15, 'y': 0.15}
AFTER SSR grid: dim=9x9 TL={'x': 0.20364583333333333, 'y': 0.10555555555555556}
JPEG diff rate: 89.88%
```

Screenshots `/tmp/ssr_simple_3x3.jpg` vs `/tmp/ssr_after_load_xrandrv2.jpg`: clearly different mesh-warps; the second one shows the xrandrv2-style triangulation. **H4, H5 falsified** — GL renderer reallocates correctly on dimension change AND server-side version gate does not skip SSR.

### Probe 4: Real dashboard profileLoadFlow via Playwright

I drove a Playwright reproducer that:
1. Opens Pi /output/ (where the "Load profile…" toolbar button lives — the picker is gated to `outputRole === OUTPUT_ROLE_FINAL` per `runtime-projection-handle-ui.js:1660`)
2. Toggles align mode (so the lazy bundle loads → toolbar appears)
3. Captures SSR screenshot (baseline)
4. Drives the exact `profileLoadFlow.onPick` body via `page.evaluate` (same code path the menu click fires: HTTP-load profile → `applyGridPayload` → `setLoadedProfileName` → `broadcastGridSnapshot({force:true})`)
5. Waits for SSR's grid to become 9×9
6. Captures SSR screenshot (post-load)
7. Asserts byte diff > 3%

**Result: Bug A did NOT reproduce in master.** Test passes (post-load screenshot differs from baseline ≫ 3%).

Why my reproducer does not reproduce Bug A:
- W4 (commit `945addc`) addressed the most likely failure mode (Pi clobbering server with stale 3×3 default on alignMode toggle).
- After W4, `profileLoadFlow` → `broadcastGridSnapshot({force:true})` reaches the server, fans out, SSR applies, GL renderer redraws — verified end-to-end.

The operator's continuing reports of Bug A may correspond to a remaining condition I have not reproduced. Possibilities I could not definitively rule out without a real Pi:
- Real-Pi-only timing (clock skew, WS handshake latency, encoder GOP-boundary delay).
- A specific operator sequence that involves alignMode being toggled at a precise moment relative to profileLoadFlow.
- A specific browser-state interaction (stale localStorage, leftover `_loadedProfileSnapshot` causing isDirty to misfire).

What I CAN confirm: the visible-stream pipeline from `broadcastGridSnapshot({force:true})` to SSR's encoded frame works on the test rig with the W4 fix in place. Therefore Bug A — as described — is not reproducible in our test environment. The W5 fix focuses on Bug B (which IS reproducible) and the side-effect of seeding `runtime.lastAlignGridSnapshot` on every cold boot incidentally hardens the boot path against the Bug-A-adjacent identity-default race.

---

## Phase 3: Fix design

**Bug B root cause** (confirmed by reproducer):

| Stage | State |
|-------|-------|
| Disk: no `runtime-active-grid.json` | (file missing) |
| Server boot `loadActiveGrid` | returns null |
| `liveSessionState.snapshot.runtime.lastAlignGridSnapshot` | null |
| `liveSessionState.version` | 0 |
| SSR live-hello | snapshot has no grid |
| SSR eager-apply gate (`live-sync-core.js:812`) | `helloGridSnap` is null → no-op |
| SSR `autoLoadRememberedProjectionProfile` | `board.lastUsedProfileName` is null in disk → `_tryApplyDiskRestoredGrid` → live-snapshot has no grid → fallback `applyDefaultAndCaptureSnapshot()` |
| SSR grid.points | 3×3 identity |
| `hasGridDisplacements()` | false |
| `postDrawMeshWarp` | early return |
| GL canvas | hidden |
| Visible surface | fx-canvas (no warp) → board fills full screen |

**Fix** (server.mjs around line 4263, inside the `loadActiveGrid` block):

When `loadActiveGrid` returns null OR an empty grid, scan `config/boards/<id>.json` for the active board (or the first board with calibration). For that board, prefer `lastUsedProfileName` from disk, otherwise the alphabetically-first profile name from `config/projection-profiles.json[boardId]`. Build a grid snapshot from that profile and seed `liveSessionState.snapshot.runtime.lastAlignGridSnapshot` with originator `"server-disk-restore"`. Also seed `liveSessionState.snapshot.selectedBoard` if not already set. Bump `liveSessionState.version` so the eager-apply gate fires.

This ensures every cold boot starts the SSR's mesh-warp on real geometry, not identity.

## Phase 4: Verification

### Bug B test (RED → GREEN)

`test/live-e2e/test_phase38_w5_stream_desync.py::test_phase38_w5_bug_b_boot_ssr_has_persisted_profile`

Pre-fix (master `945addc`):

```
AssertionError: BUG B REPRODUCED — Cold-start SSR has IDENTITY grid (displaced=0). 
Server lastAlignGridSnapshot=None.
```

Post-fix:

```
PASSED [100%]
```

Visual: `/tmp/ssr_boot_no_disk.jpg` (pre-fix, board fills screen) vs `/tmp/ssr_postfix_coldboot.jpg` (post-fix, board correctly mesh-warped into projected rect). Cold-boot now adopts "Nemesis A with xrandr" (6×9, 54 displaced points) — the alphabetically-first profile for `nemesis-board-a`.

### Bug A test (passes both before and after fix)

`test/live-e2e/test_phase38_w5_stream_desync.py::test_phase38_w5_bug_a_profile_load_stream_updates_complex`

Drives the real `profileLoadFlow.onPick` body on Pi /output/ (where the Load profile… picker lives per `runtime-projection-handle-ui.js:1660`). Loads xrandrv2 (9×9), waits for SSR grid to become 9×9, screenshot diff > 3%.

Passes pre-W5 and post-W5. As documented in Phase 2 Probe 4, I could not reproduce Bug A in the test environment after W4. The test guards against any regression in the dashboard-driven profile-load path.

### Full Phase 38 regression

```
test/live-e2e/test_phase38_pi_ssr_sync_enforcement.py             PASSED (x2)
test/live-e2e/test_phase38_profile_load_ssr_sync.py               PASSED
test/live-e2e/test_phase38_ssr_grid_state_cdp.py                  PASSED (x3)
test/live-e2e/test_phase38_ssr_visual_diff.py                     PASSED
test/live-e2e/test_phase38_w3_input_priority.py                   PASSED (x2)
test/live-e2e/test_phase38_w4_real_drag_reproducer.py             PASSED (x2)
test/live-e2e/test_phase38_w5_stream_desync.py                    PASSED (x2)

13 passed in 157s
```

### D-08 hard gate

```
$ RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs
✔ live-fixture-smoke: server + 1 consumer sustain 30s without reconnect (36357ms)
tests 1 / pass 1 / fail 0
```

## Files changed

- `server.mjs` — boot-time fallback from `loadActiveGrid` null to `config/boards/<id>.json` + `config/projection-profiles.json` (~75 added lines)
- `test/live-e2e/test_phase38_w5_stream_desync.py` — new W5 reproducers (Bug A + Bug B)
- `.planning/debug/phase-38-w5-stream-desync.md` — debug session metadata
- `.planning/phases/phase-38/38-DEBUG-W5.md` — this document

## Honest summary

**Bug B was real and is fixed.** The bug reproduces deterministically when `runtime-active-grid.json` is absent. The fix seeds the disk-restore grid from the active board's profile catalog (preferring `lastUsedProfileName`, falling back to the alphabetically-first profile). The SSR's mesh-warp now has real geometry on every cold boot. Screenshot diff (pre vs post fix) is visually unambiguous.

**Bug A could not be reproduced in the test environment after W4.** The dashboard-driven profileLoadFlow → SSR-stream pipeline works end-to-end on simple AND complex profile loads (verified via screenshot diff). If the operator continues to see Bug A on the real Pi, the residual cause is likely real-Pi-only (timing/clock-skew/encoder-GOP) and would need a Pi-attached UAT to capture. The W5 test stands as a regression guard.
