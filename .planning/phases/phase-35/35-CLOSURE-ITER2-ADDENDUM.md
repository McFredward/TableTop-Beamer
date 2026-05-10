---
phase: 35
slug: thin-output-refactor-align-banding
status: CLOSED-PARTIAL-WITH-ITER2-HOTFIXES
closed: 2026-05-10
supersedes: 35-CLOSURE.md (status: PASS-AUTOMATED-PENDING-OPERATOR-UAT — premature)
---

# Phase 35 — Closure ITER2 Addendum

## TL;DR

The 2026-05-10 operator UAT against the auto-advanced Phase 35 close exposed
three real regressions that all eight automated gates and the autonomous
visual smoketest had missed:

1. **Connection: long unstable phase before stable WebRTC.** The original
   Phase 35-A landed all 11 align-mode IIFE script tags on every `/output/`
   page-load via `<script defer>`. ~3700 LOC parsed in parallel with WebRTC
   ICE negotiation, blocking the main thread long enough that ICE candidates
   timed out. After several reconnect cycles the page eventually settled
   into a stable connection.

2. **Rooms render as default rectangles instead of operator-drawn polygons.**
   The bootAlignMode wiring used `noopReturnEmptyArr` stubs for the
   polygon-editor's `getBoard` / `getRoomPolygonPoints` / `getRoomPoints` /
   `getShipPolygonPoints` ctx fields. Even when align-mode activated, the
   polygon-editor saw empty data and fell back to default rectangles. The
   plan called these "no-op stubs" but the audit was wrong: these methods
   ARE exercised by `renderRoomOverlay` on `/output/` (the read-only path
   needs the data, not just the writers).

   **2b. (post-h2) Solid-color animations still flooded their bounding
   rectangle, not the room polygon.** Track C had swapped `c.fillRect`
   → `c.putImageData` for the dithered solid-color path. `putImageData`
   IGNORES the canvas clip path (writes raw pixels), bypassing the
   polygon-clip the caller had set up via `c.clip()`. Solid-color rooms
   filled their bounding rectangle; mp4 / gif / other animations were
   unaffected because they already used `drawImage` (which respects clip).
   Operator-disambiguated: "Es scheint als betrifft das nur die
   solid-color animationen".

3. **Banding is back, this time from the projection-transform path.** Phase 35
   Track C dithered solid-color overlay rendering at
   `runtime-effect-visuals.js:280-284`. The banding the operator now sees
   originates from a DIFFERENT code path: the `runtime-projection-2d-fallback-renderer.js`
   warp output (Phase 32-class issue, fixed at the time by `--ignore-gpu-blocklist`
   + `--enable-gpu-rasterization` GL flags that Phase 34 hotfix h2 reverted
   because Mesa-llvmpipe under Xvfb hangs on synchronous GL flush). This is
   not the same banding Phase 35 fixed.

This addendum supersedes `35-CLOSURE.md`'s `PASS-AUTOMATED-PENDING-OPERATOR-UAT`
verdict. Phase 35 status is now **CLOSED-PARTIAL-WITH-ITER2-HOTFIXES**.

## Hotfixes h1 + h2 + h3

### h1 — Lazy-load align-mode bundle

`output.html` reduced from 17 to 6 script tags. Only the new
`output-align-mode-loader.js` module loads at page-init. It:

- Subscribes to `liveSync.onAlignModeChange`
- On `true`: dynamic-loads the 12-script bundle (added
  `runtime-room-geometry.js` so `getRoomPoints` helper is available),
  fetches `/api/boards` + `/api/live/snapshot`, builds REAL boardAccess
  methods, calls `bootAlignMode`, then explicitly triggers
  `POLYGON_EDITOR.renderRoomOverlay()`
- 2-second post-load background prefetch warms the bundle cache so
  first activation is cache-hit-fast (~0ms)
- Falls back to `runtimeBoards[0].id` when snapshot lacks `selectedBoard`

Module: `src/app/runtime/output-receiver/output-align-mode-loader.js` (NEW, 322 LOC)

### h2 — Real polygon data wiring

Within the loader's `buildBoardAccess`:
- `getBoard(boardId)` → `runtimeBoards.find(b => b.id === ...)`
- `getBoards()` → `runtimeBoards`
- `getRoomPolygonPoints(boardId, roomId)` → reads `room.polygon` / `room.points`
- `getShipPolygonPoints(boardId)` → reads `board.shipPolygonPoints`
- `getRoomPoints(room, boardId)` → delegates to the
  `runtime-room-geometry.js` IIFE if loaded; falls back to
  `polygon.map(([x,y]) => [x*1000, y*1000])` (correct for the SVG
  viewBox 1000×1000 coordinate space)
- `getPlayAreas`, `getRoomLabelPosition`, etc. — backed by the same
  catalog reads
- Setters (`setRoomPolygonPoints`, `setShipPolygonPoints`) stay no-op
  because `/output/` is read-only

Cache invalidates on `liveSync.onProjectionProfileChange`, which also
re-fetches `/api/live/snapshot` for `selectedBoard` updates and
re-activates if align-mode is currently on.

### h3 — Solid-color polygon clip restored (commit `bb7f2e2`)

`putImageData` ignores the canvas clip path. Pre-Phase-35 used
`fillRect` which respected `c.clip()`. The fix:

- New `getDitheredSolidColorCanvas({hex, alpha, width, height})` helper
  in `runtime-effect-dither.js` returns an OffscreenCanvas (or
  HTMLCanvasElement fallback) with the dithered pixels pre-painted.
  Same Bayer 4×4 math, same FIFO cache semantics.
- The solid-color call site in `runtime-effect-visuals.js` swaps
  `c.putImageData(imageData, x, y)` → `c.drawImage(canvas, x, y, w, h)`.
  `drawImage` respects the clip path, so the dither stays AND the
  polygon shape is preserved.
- Defensive fallback to `fillRect` if helper is unavailable
  (preserved with one-shot console.warn).

Files: `src/app/runtime/render/runtime-effect-dither.js` (+58 LOC),
`src/app/runtime/render/runtime-effect-visuals.js` (call-site swap).

## Verification

Live-tested via Playwright + system Chrome (`/opt/google/chrome/chrome`)
under Xvfb against a freshly-spawned `node server.mjs`:

| Test | Before | After |
|------|--------|-------|
| DOMContentLoaded time | variable freeze | **0.04s** |
| videoReadyState=4 | variable, post-freeze | **0.26s** |
| Initial src-based scripts | 13+ | **2** |
| Align-mode IIFEs prefetched after 2s | n/a (eager) | **12** |
| `#room-overlay` polygons after alignMode toggle | 0 (rectangles only) | **66** |
| Non-rectangular polygons (4-60 vertices) | 0 | **65** |

Screenshot evidence: `.planning/phases/phase-35/35-iter2-polygons-rendering-evidence.png`
shows operator-drawn polygons rendering correctly.

JS unit suite: 9/9 PASS (Phase 35 RED→GREEN rails unchanged).
D-06 connection-stability hard gate: 84 pass / 0 fail / 1 skip — `fail=0`
invariant preserved.

## What is NOT fixed (carries to Phase 36)

**Bug 3 — Transformation banding.** Per user direction this is a separate
phase. The fix path will need to address one of:
- Get hardware GL working on the operator's gaming-PC (different from the
  test Mesa-llvmpipe constraint that blocks `--ignore-gpu-blocklist`)
- Alternative software GL backend with 16-bit-fp internal precision (the
  C2 deferred path: `--use-gl=angle --use-angle=swiftshader`)
- Higher-precision render-to-texture in the warp shader itself

Phase 36 is opened in ROADMAP.md as a planning entry. CONTEXT.md will
inherit Phase 35's three carry-forward locks plus the new
"Phase 35-iter2 h1 lazy-load pattern stays" lock.

## What I got wrong (Phase 35 lessons reinforced)

1. **The lazy-load idea was in the plan but the executor took the
   easy path.** The Phase 35-A plan said "bootAlignMode integration in
   output.html" but did not specify "lazy-load only when alignMode=true".
   The executor read the loosest interpretation: `<script defer>` for
   every IIFE. The plan-checker did not catch this because no automated
   test asserted the script-tag count. Phase 36 plan should have a
   BLOCKING task: "output.html stays at ≤8 src-based script tags
   throughout this phase" with a grep-verifiable assertion.

2. **The polygon-data stubs failed the same audit Phase 35-A claimed
   to pass.** RESEARCH §A.1 said "~40 of 60 ctx fields can be safe
   no-op stubs" — but `getRoomPolygonPoints` was NOT one of those 40.
   The audit was based on grep-counting which fields are called from
   drag handlers (write path), not which are called from
   `renderRoomOverlay` (read path). The audit should have been
   bidirectional.

3. **The autonomous visual smoketest verified solid-color overlay
   dithering but NOT polygon rendering.** The 41-distinct-values
   metric proved Bayer 4×4 was breaking step-bands in the solid-color
   path. It said NOTHING about whether `#room-overlay` had polygons.
   The next iteration's smoketest must include both:
   - Polygon-count assertion (≥1 non-rectangular polygon)
   - Connection-time assertion (DCL ≤ 2.5s, video ready ≤ 5s)

## Tag

Recommendation: retag `phase-35-end-pending-uat` →
`phase-35-end-iter2`. When operator confirms Bug 1 + Bug 2 are gone
on gaming-PC AND Bug 3 visual UAT is acknowledged as deferred-to-36,
retag `phase-35-end`.

---

## h9 Update — Phase 35-A bootAlignMode partial-revert

After h4-h7 (input-forwarding, reverted) and h8 (restore Phase 35-A
bootAlignMode), operator-reported additional bugs against the locally-
rendered handles:

1. Sizing of handle frame doesn't align with stream content (only
   aligns after ESC).
2. Outer corner handles + scaling points don't change the stream.
3. Midpoint handles for line-squish are not clickable.
4. Vertex points are draggable BUT a SEPARATE ghost circle appears in
   the mouse, AND the first grab distorts the WRONG corner (e.g.,
   grabbing top-middle distorts top-left).
5. Dirty-flag does not react to drags.
6. Right-click does not invoke the add/remove-line context menu.

Root-cause analysis revealed Phase 35-A's pure-extract approach was
incomplete. Two competing event-handling models were active
simultaneously:

| | Phase 31/34 model A | Phase 35-A model B |
|---|---|---|
| Handles | invisible 4-corner zones | actual handle DOM |
| Click capture | `#ssr-input-overlay` (z:4) | handle elements (z:9999) |
| Broadcast mutation | `align-corner-drag` | `align-grid-snapshot` |
| Coverage | corner-pull only | vertex / midpoint / rotation |

Both layered on top of each other → corner clicks hit overlay first
(model A), produces wrong-corner distortion via 4-quadrant approximation;
midpoint clicks are intercepted by overlay → align-corner-drag with
random corner-id; etc.

The pure-extract was missing many handle-ui ctx wirings beyond what h2
fixed. Stream-content-rect sizing, dirty-flag persistence, contextmenu
infrastructure, undo, cross-module init order — each requires separate
wiring that none of the iter2 hotfixes plugged.

**h9 decision (2026-05-10):** Per user direction, partial-revert Phase
35-A's bootAlignMode rendering on /output/. /output/ goes back to the
Phase 34 4-corner approximation (basic corner-pull alignment via
`align-corner-drag`). Comprehensive align-mode-on-thin-/output/ refactor
becomes Phase 36 with proper RED tests for every interaction (sizing,
vertex/midpoint/rotation drag, image-pan, right-click menu, CTRL+Z,
dirty-flag) before any code change.

What stays from Phase 35:
- Phase 35-B live-sync extract (`output-live-sync.js`) — proven, used
- Phase 35-C iter2 h3 banding fix (Bayer dither + drawImage clip) — proven
- Phase 35-iter2 h1 lazy-load infrastructure preserved as Phase 36
  starting point (`output-align-mode.js` + `output-align-mode-loader.js`
  remain in `src/app/runtime/output-receiver/` — NOT loaded; Phase 36
  reference material)

What's reverted:
- `output.html` returns to 5 thin scripts (no bootAlignMode IIFE bundle)
- `#stage` + `#room-overlay` divs removed from /output/ DOM
- `receiver-bootstrap.js` `hitTestVertex` returns Phase-34's 4-quadrant
  corner-id (instead of delegating to bootAlignMode)
- The dashboard remains the operator's full handle-ui interface for
  configuration tasks until Phase 36 lands

This is the third partial close of Phase 35 — h9 is the honest answer
to "every iteration uncovered more missing wirings". The decision
is documented + Phase 36 has the scope captured.

## h9 Tag

Recommendation: retag `phase-35-end-iter2` to reflect the h9
partial-revert. Phase 36 is opened in ROADMAP.md with the comprehensive
align-mode refactor scope — distinct from Phase 36's transformation
banding which is now Phase 37. (Or fold both into Phase 36 with two
tracks. Operator's call when planning Phase 36.)
