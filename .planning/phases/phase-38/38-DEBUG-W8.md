---
status: awaiting_human_verify
trigger: "Operator reproduces Bug A AGAIN after W7. Pi /output/ emits stale grid snapshot on align-mode toggle, clobbering SSR's correct test profile grid."
created: 2026-05-11
updated: 2026-05-11
---

# Phase 38 W8 — Pi-side stale grid broadcast on align-mode toggle

## Current Focus

hypothesis: CONFIRMED — Pi /output/'s defensive activate broadcast clobbers the server's authoritative profileId from `test` to `unsaved-<boardId>` (because Pi's `_loadedProfileName` is null on fresh-context activation). Server persists the corrupted profileId to runtime-active-grid.json. Compounds on every server boot.
test: W8 reproducer test_phase38_w8_pi_emit_stale_on_align_toggle.py — seeds test profile, opens Pi /output/, toggles align-mode, asserts server + disk profileId stays `test`.
expecting: RED→GREEN on Fix B (remove Pi's defensive activate broadcast).
next_action: Await operator UAT confirmation that Bug A no longer reproduces on their installation after this fix.

## Symptoms

expected: After server restores test profile (5x6, TL=0.16/0.15) and SSR applies it via eager-apply poll, toggling align-mode should NOT change the grid. The only EMITs (if any) should carry test's geometry (corners 0.16, 0.15..0.81, 0.83, profile=test).

actual: Operator's log shows:
- Server: `[active-grid] restored profile=test srcXs=6 srcYs=5 points=30`
- SSR: `[grid-state] restoreGridSnapshot dims=3×3→5×6 TL=(0.000,0.000)→(0.067,0.107)`
- SSR: `[align-grid-snapshot] poll eager-apply OK profile=test points=30`
- align-mode toggled on (SSR `[align-mode] onAlignModeChange enabled=true outputRole=final-output ssrTab=true`)
- SSR: `[align-grid-snapshot] SSR onAlignModeChange(true) — broadcast SUPPRESSED (W7: SSR pulls, never pushes)` — W7 works
- BUT: `[align-grid-snapshot-log] EMIT force=true dims=5×6 corners=(0.07,0.11)..(0.72,0.79) profile=unsaved-nemesis-board-a` ← STALE!
- Then: `[align-grid-snapshot-log] EMIT force=true dims=5×6 corners=(0.16,0.15)..(0.81,0.83) profile=test` ← correct (too late)
- SSR's mesh-warp ends up showing wrong geometry from the stale clobber.

errors: No exceptions. Pure logic bug. SSR shows wrong geometry. Profile name in stale EMIT is "unsaved-nemesis-board-a" → Pi's `_loadedProfileName` is null/stale.

reproduction: 
1. Boot server with test profile pre-loaded as runtime-active-grid.json (5x6, 30 points, TL=0.16/0.15)
2. Open Pi /output/
3. Toggle align-mode ON (via context-update broadcast OR by click)
4. Observe: an EMIT with non-test corners appears in stdout BEFORE the test-corners EMIT
5. Observe: SSR's grid query at end shows clobbered state, not test's

started: After W7 shipped (commit 4149b86)

## Eliminated

- hypothesis: "Pi's grid-state init() reads localStorage AFTER the W4 drain, clobbering the drained snapshot."
  evidence: Code-trace shows order is (1) bundle loads, grid IIFE registers default 3x3; (2) bootHandleUi → MAPPING.init → gridState.init → loadFromLocalStorage; (3) THEN drain runs. Drain wins — restoreGridSnapshot overwrites whatever LS loaded. Confirmed by reading output-align-mode-loader.js lines 525-708.
  timestamp: 2026-05-11

- hypothesis: "Operator's first EMIT has corners that don't match what SSR applied (geometry corruption)."
  evidence: Reading operator's log carefully: SSR's poll-eager-apply log shows `TL=(0.067,0.107)` — and the first EMIT corners `(0.07, 0.11)` MATCH those (within display rounding 0.067→0.07, 0.107→0.11). So Pi's grid IS in sync with what server has — geometry is NOT corrupted in the broadcast. The "0.16,0.15" the operator quotes is from projection-profiles.json's canonical `test`, NOT from runtime-active-grid.json's drifted state.
  timestamp: 2026-05-11

## Evidence

- timestamp: 2026-05-11T00:01:00 (initial review)
  checked: Operator's provided log (excerpt above) on commit 4149b86
  found: Two consecutive EMIT lines on Pi /output/. First has profile=unsaved-nemesis-board-a with corners (0.07,0.11)..(0.72,0.79). Second has profile=test with corners (0.16,0.15)..(0.81,0.83). Both dims=5×6.
  implication: Pi has a "profileId=null" state at first EMIT moment → synthesizes unsaved-*. Second emit (with corners matching the canonical `test`) likely comes from the dashboard (which has the canonical `test` profile loaded in LS).

- timestamp: 2026-05-11T00:02:00 (file-on-disk inspection)
  checked: /home/claw/tt-beamer/config/runtime-active-grid.json + config/projection-profiles.json
  found: runtime-active-grid.json has profileId="test", TL=(0.1045, 0.1405), 5x6, 30 points. projection-profiles.json[nemesis-board-a][test] has TL=(0.1589, 0.1476). They DON'T MATCH. The disk file has DRIFTED from the canonical profile.
  implication: Earlier `unsaved-*` broadcasts wrote drifted data to runtime-active-grid.json. The "test" profileId label on disk is misleading — it's not actually canonical test geometry. This is the corruption-feedback-loop.

- timestamp: 2026-05-11T00:03:00 (server.mjs persist path)
  checked: server.mjs lines 1245-1277, runtime mutation handler for align-grid-snapshot
  found: EVERY align-grid-snapshot mutation (including Pi's `unsaved-*` emits) writes BOTH the in-memory `lastAlignGridSnapshot` AND debounced-disk-persists via persistActiveGrid({ rootDir: ROOT_DIR }). The profileId carried by Pi's broadcast (e.g. `unsaved-nemesis-board-a`) OVERWRITES the profileId on disk.
  implication: Pi's defensive broadcast actively CORRUPTS the server's authoritative profile-label state by writing `unsaved-*` to runtime-active-grid.json. This compounds every time Pi /output/ activates align-mode.

- timestamp: 2026-05-11T00:04:00 (W8 reproducer test run #1)
  checked: test/live-e2e/test_phase38_w8_pi_emit_stale_on_align_toggle.py
  found: Test PASSES on master 4149b86. Pi emits ONE EMIT after align-toggle with corners=(0.16,0.15)..(0.81,0.83) — matching seeded test profile. Profile name is `unsaved-nemesis-board-a` (no LS), but geometry is correct.
  implication: With a fresh Playwright context (no Pi LS), W4 drain works correctly — Pi adopts server's seeded grid. The CORNER-mismatch reproducer doesn't fail because there's no corruption. The REAL bug is the profileId clobber, not the geometry. Need to rewrite test to assert on profile name corruption + disk drift.

## Resolution

root_cause: Pi /output/'s defensive activate broadcast (originally added in Phase 36 iter2 h2/h3 to fix a profile-load-stream-desync that has since been properly addressed by W5+W6+W7) emits with profileId=`unsaved-<boardId>` whenever `_loadedProfileName` is null (no LS-stored profile match for the current grid). grid-state.broadcastGridSnapshot synthesizes the unsaved-* label; server.mjs:1245-1277's align-grid-snapshot mutation handler persists this profileId to runtime-active-grid.json via persistActiveGrid, OVERWRITING the operator's previously-saved profileId (e.g. `test`). Every Pi-/output/ align-mode activation re-clobbers the disk file. On next server boot, the corrupted profileId is loaded — and Pi adopts the drifted grid via W4 drain, then re-broadcasts the drift with `unsaved-*` again on the next align-mode toggle. Feedback loop. Pi /output/ should NOT broadcast its grid on activate (mirroring W7's SSR-side fix); Pi is a downstream consumer of server state via live-hello, 1Hz poll, WS broadcasts, and W4 drain.

fix: Fix B from operator's task description. Removed Pi /output/'s defensive activate broadcastGridSnapshot in src/app/runtime/output-receiver/output-align-mode-loader.js. The Phase 36 iter2 h2/h3 fireResyncBroadcast block (lines ~715-755) replaced with a single suppression-log line mirroring W7's SSR-side suppression. W4's drain (lines 647-707 in the same file) still ensures Pi's local grid matches server state by the time activate() returns; no broadcast needed because the server already HAS the authoritative state.

verification:
  - W8 reproducer test FAILED on master 4149b86: server's profileId clobbered from `test` to `unsaved-nemesis-board-a` after Pi /output/ align-mode toggle. Disk file also clobbered.
  - After Fix B: W8 reproducer PASSED. Zero EMIT lines from Pi after toggle. Server profileId stayed `test`. Disk profileId stayed `test`.
  - All 15 Phase 38 e2e tests PASSED including the new W8 test (208.84s total).
  - D-08 connection-stability live-fixture-smoke PASSED on retry (35.6s) — earlier 60s waitReady timeout was a pre-existing transient (also fails on unmodified master 4149b86), unrelated to W8.

files_changed:
  - src/app/runtime/output-receiver/output-align-mode-loader.js  (Fix B: removed defensive activate broadcast)
  - test/live-e2e/test_phase38_w8_pi_emit_stale_on_align_toggle.py  (NEW: W8 RED→GREEN reproducer)
  - .planning/phases/phase-38/38-DEBUG-W8.md  (this debug log)
