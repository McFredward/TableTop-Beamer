---
status: gaps_found
phase: 39-ssr-stabilization-round-2
created: 2026-05-13
verified_by: operator UAT 2026-05-13
phase_tag: phase-39-closed-automated
---

# Phase 39 Verification — Operator UAT 2026-05-13

## Summary

Phase 39 was tagged `phase-39-closed-automated` on 2026-05-12 after all
automated regression rails went green (16/16 sections). Operator
performed visual UAT on 2026-05-13 and reported **three open gaps**.
One Phase 39 success carries forward: **D-01 MP4 playback works**
(operator-confirmed "Ich sehe das MP4 Video im Stream").

## Gaps

### Gap 1 — Default/Autostart Animation Shows Flickering Instead of Solid-Color

**Severity:** blocker
**Reported as:** Issue 1 (operator UAT 2026-05-13)
**Operator-Quote:** "Die default/autostart solid-color animation für alle Räume ist plötzlich die inside-Animation mit flackerndem Licht."

**What was expected:** When the app boots / autostarts, all rooms should
show their saved default solid-color animation (uniform red light per
`config/boards/nemesis-lockdown-a.json#defaultAnimations` — 13× solid-color).

**What operator sees:** A flickering inside-style light animation in
place of the uniform solid-color.

**Investigation findings:**
- `config/runtime-active-animations.json` shows 13× solid-color, NO
  hull-flicker entries
- `config/boards/nemesis-lockdown-a.json#defaultAnimations` shows 13×
  solid-color, NO hull-flicker entries
- Phase 39 did NOT modify any animation-render code paths (only
  server.mjs, receiver-bootstrap.js, receiver-status-ui.js,
  runtime-projection-gl-renderer.js)
- Data layer says solid-color. Render layer perceived as flickering.

**Strongest hypothesis:** Perceived "flickering" is the same root cause
as Gap 2 — H.264 codec temporal noise at mesh-cell-boundary pixels
creates frame-to-frame variation that the operator perceives as
flickering lighting. If Gap 2 is fixed, Gap 1 may resolve simultaneously.

**Alternative hypothesis:** A separate animation pipeline path is
overriding solid-color rendering with a hull-flicker code path — needs
investigation of `runtime-draw-loop.js` solid-color branch (lines
118-147) and `findActiveBreakingGate()` logic.

**Verification rail for fix:** Operator UAT with Nemesis Lockdown A
autostart shows uniform red light in all rooms, no flickering.

### Gap 2 — Mesh-Warp Seams STILL Visible in Operator's H.264 Stream

**Severity:** blocker (the entire D-03 fix in Phase 39-4 was applied to
the wrong layer)
**Reported as:** Issue 2 (operator UAT 2026-05-13)
**Operator-Quote:** "Die Streifen sind weiterhin da und sichtbar bei
Animationen, insbesondere solid-color."

**Root cause analysis:**

The Phase 39-4 fix added a 0.5-texel UV-inset epsilon to the mesh-warp
fragment shader at `src/app/runtime/viewport/runtime-projection-gl-renderer.js:288-295`.
This clamps UV coordinates to `[0.5/uTexSize, 1-0.5/uTexSize]` — but
this only affects sampling at the **texture's outer boundary**, NOT
between adjacent mesh cells where the operator's seams actually appear.

The verification test (`test/live-e2e/test_phase39_d03_no_seams.py`)
captured JPEG screenshots via CDP `Page.captureScreenshot` (quality=60)
and reported `max_delta=0` — but the operator views the stream via:
1. `getDisplayMedia()` capture at system compositor level
2. H.264 WebRTC encoding (8 Mbps balanced preset, hardware/software)
3. Pi WebRTC decoder

The seams visible to the operator are H.264 macroblock-boundary
quantization artifacts at mesh grid cell edges. The UV-inset shader
cannot address these — it only smooths GL output which is then
lossy-compressed by H.264, reintroducing block-boundary artifacts.

**Operator-approved fix path (combined):**
1. **H.264 bitrate bump**: `config/global-defaults.json#serverRendering.bitrate`
   from balanced (~8 Mbps) to high (12+ Mbps). Reduces quantization at
   block boundaries.
2. **2-Pixel mesh-cell-overlap**: each triangle of the mesh-warp renders
   1-2 extra pixels into its neighbors' territory. Eliminates the
   rasterizer's diamond-exit ambiguity at shared edges, which (combined
   with H.264) produces the visible stripes.

**Verification rail for fix:** Operator UAT showing solid-color
animation rendered over a non-identity 9×9 warp grid in the SSR-streamed
video on the Pi (NOT a CDP JPEG screenshot) shows no visible seams.
Plus a new automated test that captures from the actual WebRTC stream,
not the JPEG diagnostic endpoint.

**The UV-inset shader fix from 39-4 stays** — it's a real
texture-boundary fix and harms nothing. Just isn't sufficient alone.

### Gap 3 — Board-Switch Shows Partial Align Mode + Spurious Dirty Flag

**Severity:** blocker
**Reported as:** Issue 3 (operator UAT 2026-05-13)
**Operator-Quote:** "Bei einem Wechsel vom Board wird, warum auch immer,
Teile des Align Modes angezeigt (nur die Handles, nicht die Linien des
Overlays) und ohne das ich was verändert hab wird die dirty flag
getriggert was durch 'unsaved on /output/' dann verhindert, dass ich den
Align Mode aktivieren kann."

**Root cause hypothesis (HIGH confidence):**

`src/app/runtime/output-receiver/output-align-mode-loader.js:808-816` —
`onProjectionProfileChange` handler calls `await activate()` async.
`activate()` includes a dynamic import of `boot-handle-ui.js` (line
525), which yields control during the await. Meanwhile,
`switchBoard → autoLoadRememberedProjectionProfile → applyDefaultAndCaptureSnapshot()`
(`runtime-board-switch.js:108-140`) mutates the global grid state.

Race window: the new `_state` object is created with the new
`activeBoardId` (line 497), but during the async import:
- The old `_state` (with old boardId) is still referenced by the
  `_currentBootHandle`
- The grid is mutated by `applyDefaultAndCaptureSnapshot()` immediately
- After import, the new bootHandleUi renders handles with the
  fresh grid — but `renderRoomOverlay` reads polygons from the new
  boardId asynchronously, lagging behind
- Result: handles visible (grid is fresh), but overlay lines absent
  (polygons not yet loaded)

The dirty-flag question is less certain — `applyDefaultAndCaptureSnapshot()`
should set `_loadedProfileSnapshot = current`, making `isDirty()` return
false. Either there's a SECOND broadcast (align-grid-snapshot from
server) that arrives after applyDefault and mutates the grid again, OR
the dirty=true post is from a prior state that wasn't cleared.

**Fix path:**
1. Make board-switch align-mode teardown SYNCHRONOUS: call
   `_currentBootHandle.stop()` BEFORE `applyDefaultAndCaptureSnapshot()`
   to avoid the race
2. Add a guard: only post dirty=true when the change is user-initiated
   (drag, line-add) — never from board-switch / profile-restore paths
3. Add diagnostic logging in `notifyDirtyChanged()` to identify the
   actual caller during a real board-switch reproduction

**Verification rail for fix:** Operator UAT: switch boards N times,
verify each time that (a) align mode UI is fully cleaned up between
boards (no partial handles), (b) dirty flag stays false until user
makes an actual change.

## Cross-Defect Notes

- **Gap 1 may resolve when Gap 2 is fixed** if "flickering" is a
  perception of H.264 temporal noise at seam boundaries. Verify by
  running Gap 2 fix first and re-doing operator UAT.
- **Gap 2's combined fix** (bitrate + cell-overlap) was operator-approved
  via AskUserQuestion on 2026-05-13.
- **Gap 3 is independent** of Gaps 1 and 2 — Phase 38 W11 fix didn't
  cover this code path because the W11 fix targeted Set-iteration race
  during align-OFF, not the board-switch async-import race.

## Phase 38 Carry-Forwards (still verified intact)

- WS frame reassembly (W10) — green
- align-off teardown (W11) — green
- GL cache invalidation (W12) — green
- 10/90 inset default (W13) — green
- D-08 connection-stability fail=0 — green
- VAAPI default-disabled (Phase 33 L6) — green

## Recommended Next Step

`/gsd-plan-phase 39.1` — fresh phase to address all three gaps with a
research-first approach focusing on the H.264 stream-capture pipeline
and the board-switch async-import race.
