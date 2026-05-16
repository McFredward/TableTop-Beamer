---
status: diagnosed
trigger: "Phase 46 iter3: cold-boot desync STILL reported by operator after commit 5da032d. UAT screenshot shows w10-batch-second profileId (never created by operator)."
created: 2026-05-16T16:00:00Z
updated: 2026-05-16T18:15:00Z
---

## Current Focus

hypothesis: After commits 43860eb + 5da032d, the actual grid/stream/handle alignment IS correct on cold boot. The operator's remaining complaint is rooted in (a) a stale profileId="w10-batch-second" persisted into runtime-active-grid.json by a TEST (test/phase-38-w10-ws-frame-fragmentation.test.mjs:330) that doesn't isolate its config dir, and (b) a minor UI chip refresh bug where captureRemoteBaseline doesn't repaint the align toolbar chip when the dirty state doesn't change.
test: Playwright cold-boot screenshots from /output/ + /api/diag/ssr-screenshot from the SSR Chromium tab, measured pixel-level extent of cyan handles vs grey-fill warp content
expecting: Handles and stream content extents within ±1% of each other
next_action: report diagnosis + recommendation; await operator decision on sanitization strategy

## Symptoms

expected: Handles + stream content edges align on cold boot in both scenarios (runtime-active-grid.json present, runtime-active-grid.json absent)
actual: They DO align. Operator's residual complaint is the bogus profileId="w10-batch-second" name persisting in runtime-active-grid.json (from prior test runs that contaminate operator-local config/).
errors: None (silent profile-name confusion)
reproduction:
  1. Fresh server cold boot
  2. /output/ Playwright probe + actual SSR canvas via /api/diag/ssr-screenshot
  3. Pixel measurement of cyan handles vs grey-fill content extents
  4. Both align within ±1%
started: After commits 43860eb + 5da032d, geometry is correct; the only remaining issue is the lingering stale profileId

## Eliminated

- hypothesis: SSR-tab eager-apply in poll path uses wrong envelope (line 117 still has OUTPUT_ROLE_FINAL gate)
  evidence: The gate IS still there, but the SSR tab navigates to /ssr which resolveOutputRoleFromLocation classifies as OUTPUT_ROLE_FINAL, so the gate is permissive for SSR. Boot log confirms `[align-grid-snapshot] live-hello eager-apply OK profile=... points=...` fires for the SSR tab.
  timestamp: 2026-05-16T17:30:00Z

- hypothesis: Video element object-fit causes display stretch
  evidence: object-fit: fill is applied. With both SSR canvas and /output/ video element at 1920×1080, content displays 1:1. Pixel measurement of stream content extents matches exactly between SSR canvas and /output/ video (within 0.001 of viewport).
  timestamp: 2026-05-16T18:00:00Z

- hypothesis: Polygon overlay drawn at wrong positions
  evidence: SVG overlay points run through remapGridPoint which uses same grid as the GL mesh-warp. Both produce identical positions for the room polygons.
  timestamp: 2026-05-16T18:05:00Z

- hypothesis: hasGridDisplacements returns false for 10/90 inset → identity warp
  evidence: Threshold is 0.001. Points at (0.07, 0.10) differ from defaults (0, 0) by 0.07 and 0.10 — both well above threshold. Warp IS applied.
  timestamp: 2026-05-16T17:45:00Z

## Evidence

- timestamp: 2026-05-16T17:00:00Z
  checked: config/runtime-active-grid.json on operator's machine + my test environment
  found: profileId="w10-batch-second" — a name that does NOT exist in projection-profiles.json. Grep of source: only hit is test/phase-38-w10-ws-frame-fragmentation.test.mjs:330 which calls `buildAlignGridSnapshotFrame("w10-batch-second", 4)`. The test spawns the server with `cwd: ROOT` (the repo root) and doesn't isolate config/, so its broadcast persists into config/runtime-active-grid.json via the live-grid-snapshot handler.
  implication: ROOT CAUSE of bogus profileId. The test contaminates operator-local config.

- timestamp: 2026-05-16T17:30:00Z
  checked: Cold-boot scenario A: runtime-active-grid.json present with profileId="w10-batch-second" (3x3 inset 0.07-0.87)
  found: Server boot log: `[active-grid] restored profile=w10-batch-second srcXs=3 srcYs=3 points=9 version=2 source=runtime-active-grid`. SSR tab log: `[grid-state] restoreGridSnapshot dims=3×3→3×3 TL=(0.100,0.100)→(0.070,0.105)` + `[align-grid-snapshot] live-hello eager-apply OK profile=w10-batch-second points=9`. Screenshots /tmp/ssr-desync-debug-12-cold-bogus-output.png and /tmp/ssr-desync-debug-13-cold-bogus-output-align.png show pixel-perfect alignment: handles X=0.033..0.906, grey fill X=0.032..0.907 (within 0.001).
  implication: Disk-restore path works correctly.

- timestamp: 2026-05-16T17:45:00Z
  checked: Cold-boot scenario B: no runtime-active-grid.json → W5 fallback
  found: Server boot log: `[active-grid] restored profile=Nemesis A with xrandr srcXs=6 srcYs=9 points=54 version=2 source=projection-profile/nemesis-board-a/Nemesis A with xrandr`. SSR tab log: `[grid-state] restoreGridSnapshot dims=3×3→9×6 TL=(0.100,0.100)→(0.204,0.106)` + `[align-grid-snapshot] live-hello eager-apply OK profile=Nemesis A with xrandr points=54`. Screenshot /tmp/ssr-desync-debug-11-cold-output-align-active.png shows pixel-perfect alignment: handles X=0.167..0.790, grey fill X=0.166..0.791.
  implication: W5 fallback path works correctly.

- timestamp: 2026-05-16T18:00:00Z
  checked: Side-by-side comparison of /api/diag/ssr-screenshot (the actual SSR tab capture, byte-identical to WebRTC source) vs /output/ video element rendering
  found: With overlays hidden on /output/, the grey-fill warped map content is at identical position in both captures (X=0.070..0.870, Y≈0.10..0.90).
  implication: Stream is identical. There is NO desync between what SSR renders and what /output/ displays.

- timestamp: 2026-05-16T18:10:00Z
  checked: captureRemoteBaseline → _refreshAlignToolbarVisual flow in runtime-projection-profile-persistence.js + runtime-projection-handle-ui.js
  found: captureRemoteBaseline sets _loadedProfileName then calls _recomputeAndNotifyDirty. That function has early-exit `if (next === _dirty) return` — when dirty was false and stays false, the chip refresh listener is never invoked. So after activate, _loadedProfileName is set internally but the chip text remains "Unsaved".
  implication: Cosmetic UI bug — does NOT cause geometric desync, but might confuse the operator about which profile is "loaded".

## Resolution

root_cause: Two SEPARATE issues remain after 43860eb + 5da032d:
  (1) ROOT CAUSE of bogus profileId="w10-batch-second" in runtime-active-grid.json: test/phase-38-w10-ws-frame-fragmentation.test.mjs:330 writes a synthetic profileId into operator-local config/ via the live-grid-snapshot persist path. The test does not isolate its config directory — it spawns server.mjs with cwd=ROOT.
  (2) COSMETIC: captureRemoteBaseline updates _loadedProfileName but does NOT call _refreshAlignToolbarVisual when dirty state doesn't change. The chip text in the align toolbar stays "Unsaved" after a cold-boot live-hello restore.
  GEOMETRY IS CORRECT: stream + handles pixel-aligned (<0.001 in horiz, <0.015 in vert which is the toolbar overhead at the top) in both cold-boot scenarios.

fix: NONE applied yet. The geometry is already fixed by 43860eb + 5da032d. Recommended fix is operator-validated:
  - Option A (defensive sanitization): in server.mjs W5 boot block, after loadActiveGrid, validate that profileId is non-null AND exists in projection-profiles.json[selectedBoard]. If not, clear profileId (set to null) before seeding into liveSessionState. This keeps the operator's saved geometry but unlinks the stale name.
  - Option B (delete stale runtime-active-grid.json): document the issue and ask operator to manually `rm config/runtime-active-grid.json` once.
  - Option C (chip refresh fix): force _refreshAlignToolbarVisual() at the end of captureRemoteBaseline so the chip always reflects the current loaded profile name.

Recommend Option A + Option C, both minimal and defensive.

verification: Pre-fix screenshots saved to /tmp/ssr-desync-debug-*.png:
  - /tmp/ssr-desync-debug-7-cold-output-full.png: cold-boot W5 fallback, /output/ no align mode — content centered, no handles (correct)
  - /tmp/ssr-desync-debug-9-cold-ssr-tab.jpg: same boot, SSR tab capture — identical content position
  - /tmp/ssr-desync-debug-11-cold-output-align-active.png: cold-boot W5 fallback, /output/ + align mode — handles X=0.167..0.790, grey-fill X=0.166..0.791 (pixel-perfect)
  - /tmp/ssr-desync-debug-12-cold-bogus-output.png: cold-boot with bogus runtime-active-grid.json, /output/ no align — content centered
  - /tmp/ssr-desync-debug-13-cold-bogus-output-align.png: cold-boot with bogus, /output/ + align — handles X=0.033..0.906, grey-fill X=0.032..0.907 (pixel-perfect)

files_changed: NONE yet
