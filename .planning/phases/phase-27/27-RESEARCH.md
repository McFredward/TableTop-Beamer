# Phase 27: Align Mode Refinement — Research

**Researched:** 2026-05-04
**Domain:** Vanilla JS projection-grid editor UX — DOM handle management, canvas overlay, WebSocket dirty-state broadcast, server-side grace timer, context menu hit-testing, squish-bar drag math
**Confidence:** HIGH (all findings verified from source code read directly in this session)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Outer edges use same drag/select/snapping logic as inner lines. No special-case code for "outer" handles except non-deletability (D-09).
- **D-02:** Outer corner points freely draggable; no automatic global remesh. Local-only deformation identical to interior points.
- **D-03:** Profile chip placement, visual style, copy — Claude's discretion (see below). Locked approach: profile chip in align-mode toolbar top-center; dirty dot `●` + amber name; Save / Save as new… / Discard buttons.
- **D-04:** Single /output/ client assumption. No friendly-name UI, no per-device identity registry.
- **D-05:** Dashboard align-mode toggle disabled with hint when /output/ is dirty.
- **D-06:** Server-enforced dirty state. 10s grace timer on /output/ disconnect. Timer resets on each dirty heartbeat.
- **D-07:** No migration of existing profiles. New default only for new profiles.
- **D-08:** Compatibility validation at load time; clear error + reset-to-default offer on incompatible schema.
- **D-09:** Lines are primary entities. Outer lines (srcXs[0], srcXs[last], srcYs[0], srcYs[last]) are NOT deletable.
- **D-10:** Line-centric right-click menu. Three hit-test results: inner-line-only, intersection, empty. Exact thresholds: 10px intersection, 6px line.
- **D-11:** Line deletion is end-to-end: srcXs/srcYs + points[row][col] splice, undoable, persists through profile-persistence path.
- **D-12:** Four squish bars, one per outer side.
- **D-13:** Opposite-side anchor during squish drag.
- **D-14:** Claude's discretion for squish bar visual style/position/trapezoid interaction. Locked approach: 60×10px bar at outer edge midpoint, 30px outward offset, edge-perpendicular local axis for trapezoid.

### Claude's Discretion
- D-03 profile chip: placement top-center, visual style per 27-UI-SPEC.md
- D-14 squish bar: 60×10px, 30px outward, `projection-squish-bar` CSS class, edge-perpendicular for trapezoid

### Deferred Ideas (OUT OF SCOPE)
- Friendly device names / multi-device identity registry
- Symmetric-from-center squish mode
- Save-as-new-profile UX polish (folder/category picker)
- Rotate-handles redesign
</user_constraints>

---

## Summary

Phase 27 is a focused UX refinement on top of an already-modular projection-grid system. The grid data model (`srcXs[]`, `srcYs[]`, `points[row][col]`) already treats lines as primary entities — Phase 27 makes the UI match. The six problem areas (B1..B9) each hook into specific, already-identified files. No new architectural patterns are required; only targeted mutations to existing code.

**Primary recommendation:** Work file-by-file in dependency order: grid-state (B6 default + B1 outer-line color removal) → handle-drag (B2 outer-corner freedom + B9 squish math) → handle-ui (B1/B9 DOM + B7/B8 context menu rewrite) → profile-persistence (B3/B4 dirty-flag + save/discard) → server.mjs (B5 dirty broadcast + grace timer) → index.html (B5 dashboard disable hint).

The single most non-trivial piece of new code is the B9 squish-bar drag handler, which needs new `dragState` branches in `runtime-projection-handle-drag.js` alongside the existing rotate-drag and line-drag states.

---

## Standard Stack

### Core — no new dependencies
| Library/Pattern | Version | Purpose | Why Standard |
|-----------------|---------|---------|--------------|
| Vanilla JS IIFEs | — | All align-mode modules | Matches 100% of existing projection-* modules |
| DOM + pointer events | — | Handle DOM, drag, context menu | Existing pattern throughout handle-ui |
| Canvas 2D API | — | Line canvas overlay | Already used in `drawLines()` |
| WebSocket (server.mjs) | — | Dirty-flag broadcast | Existing `global-config-update` channel |
| CSS custom properties | — | Tokens `--c-*` and legacy `--glow` | Both token layers confirmed present |

**Installation:** No new npm packages. [VERIFIED: codebase read]

---

## Architecture Patterns

### Module map (Phase 27 touch surface)

```
src/app/runtime/viewport/
├── runtime-projection-grid-state.js     ← B6 default layout, undo/snapshot
├── runtime-projection-handle-ui.js      ← B1 outer line color, B7/B8 context menu,
│                                            B9 squish bar DOM + positioning
├── runtime-projection-handle-drag.js    ← B2 outer corner freedom (remove isEdge
│                                            proportional scale from onDragMove),
│                                            B9 squish bar drag handlers
├── runtime-projection-profile-persistence.js  ← B3/B4 dirty-flag, profile chip,
│                                                  loaded profile snapshot, save/discard
└── runtime-projection-mapping.js        ← orchestrator shim (verify no shader changes
                                             needed for B2 trapezoid)
server.mjs                               ← B5 server-side dirty flag + grace timer
index.html                               ← B5 dashboard toggle disable + hint
src/styles.css                           ← `.projection-squish-bar` CSS class (new)
```

### Pattern 1: IIFE module with init-injected dependencies
All projection-* modules follow this pattern verbatim. New code must follow it too.

```javascript
// Source: runtime-projection-handle-ui.js lines 25-781
(() => {
  let ctx = null;
  let grid = null;
  // ... injected refs

  function init(dependencies) {
    ctx = dependencies;
    if (dependencies?.grid) grid = dependencies.grid;
    // etc.
  }

  window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI = { init, ... };
})();
```

### Pattern 2: Rotate-handle DOM pattern (reference for squish bars)
[VERIFIED: runtime-projection-handle-ui.js lines 169-228]

```javascript
// Four handles, one per corner — reference for B9 four-bar squish
const ROTATE_CORNERS = [
  { key: "TL", rowFn: () => 0, colFn: () => 0, offX: -30, offY: -30 },
  { key: "TR", rowFn: () => 0, colFn: () => grid.srcXs.length - 1, offX: 30, offY: -30 },
  { key: "BR", rowFn: () => grid.srcYs.length - 1, colFn: () => grid.srcXs.length - 1, offX: 30, offY: 30 },
  { key: "BL", rowFn: () => grid.srcYs.length - 1, colFn: () => 0, offX: -30, offY: 30 },
];

function positionRotateHandles() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  for (let i = 0; i < ROTATE_CORNERS.length; i++) {
    const c = ROTATE_CORNERS[i];
    const pt = getPoint(c.rowFn(), c.colFn());
    rotateHandleElements[i].style.left = `${pt.x * vw + c.offX}px`;
    rotateHandleElements[i].style.top  = `${pt.y * vh + c.offY}px`;
  }
}
```

For B9 squish bars: replace corner-lookup with edge-midpoint-lookup. Top bar = average of `getPoint(0,0)` and `getPoint(0, lastCol)`, minus 30px in Y.

### Pattern 3: pushUndo before grid mutation
[VERIFIED: runtime-projection-handle-ui.js lines 589, 656, 670; handle-drag.js lines 71, 147, 317]

Every function that mutates `grid.srcXs`, `grid.srcYs`, or `grid.points` calls `pushUndo()` first. This is the pre-existing invariant; line add/remove and squish drag must follow it.

### Pattern 4: broadcastLiveSession + global-config-update
[VERIFIED: server.mjs lines 2789-2793]

```javascript
// Existing pattern — global-defaults save triggers broadcast
broadcastLiveSession("global-config-update", {
  target: "config/global-defaults.json",
  savedAt: next.savedAt,
  source: next.source,
});
```

Client receives `global-config-update` and calls `fetchGlobalDefaultsPayload()` + `applyGlobalDefaultsPayloadToState()` to pick up new fields. Adding `alignModeDirtyOnOutput: boolean` to the broadcast payload is a 2-line extension on both sides (server broadcast + client apply).

### Anti-Patterns to Avoid
- **Greying out outer-line delete options in context menu:** D-10 specifies hidden (removed entirely), not greyed. A hidden item avoids confusion; a greyed item invites frustrated clicking.
- **Using `requestIdleCallback` for new Phase 27 deferred work on /output/:** Phase 26-h9 confirmed Pi Chromium's idle queue can starve. Use direct call or `setTimeout(fn, 0)` when on `OUTPUT_ROLE_FINAL`.
- **Bilinear remesh on B2 outer-corner drag:** D-02 explicitly rejects this. The `isEdge` proportional-scale code in `onDragMove` (handle-drag.js lines 199-248) currently does a global remesh when edge points move. B2 requires removing this for outer corner points.

---

## Investigation Results

### Investigation 1: Grid Model Audit — Outer vs. Inner Branching

All outer-vs-inner distinctions are in four locations. [VERIFIED: source read]

**`runtime-projection-handle-ui.js` `drawLines()` (lines 273-298):**
```javascript
const isEdge = row === 0 || row === rows - 1;
lineCtx.strokeStyle = isEdge ? "rgba(220, 30, 30, 0.7)" : "rgba(0, 220, 180, 0.45)";
lineCtx.lineWidth = isEdge ? 2 : 1;
// Same for vertical: col === 0 || col === cols - 1
```
**B1 fix:** Remove both `isEdge` branches. Use the single inner-line color `rgba(0, 220, 180, 0.45)` and lineWidth `1` for all lines.

**`runtime-projection-handle-ui.js` `onContextMenu()` (lines 448-462):**
Current context menu only checks interior lines (`for (let i = 1; i < grid.srcYs.length - 1; i++)`). Outer lines are already excluded from the hit-test loop. This is correct behavior per D-09 — only refactor the menu items and add proper screen-space hit-testing.

**`runtime-projection-handle-drag.js` `onDragMove()` (lines 199-248):**
```javascript
const isEdge = r === 0 || r === lastRow || c === 0 || c === lastCol;
if (isEdge) {
  // proportionally redistributes all interior points
}
```
**B2 fix:** Remove the `isEdge` block entirely (or keep it only for line-drag, not point-drag). After B2, dragging a corner point only moves that point (same as interior points). The `onLineDragMove()` function at lines 440-494 ALSO has `isEdgeRow`/`isEdgeCol` proportional scaling — this should be KEPT because it is the "line drag moves whole row/column" behavior that is expected for the edge lines. Only the per-point `isEdge` block in `onDragMove` needs removal.

**`runtime-projection-handle-drag.js` `onLineDragMove()` (lines 445-494):**
```javascript
const isEdgeRow = row === 0 || row === lastRow;
if (isEdgeRow) {
  // proportionally adjust all inner rows
}
```
This implements "drag outer edge → whole board scales proportionally." This is the behavior that makes line-dragging the outer edge useful. It should be KEPT. B1 just wants the visual (color) to match; D-01 says "same drag behavior" which this already is for line-drag.

**`runtime-projection-handle-ui.js` `removeHorizontalLine()` / `removeVerticalLine()` (lines 655-674):**
```javascript
function removeHorizontalLine(index) {
  if (grid.srcYs.length <= 3) return;
  if (index === 0 || index === grid.srcYs.length - 1) return; // outer guard — KEEP
```
The outer-line deletion guard is already present. No change needed.

### Investigation 2: Add/Remove Line Operations

[VERIFIED: runtime-projection-handle-ui.js lines 558-674]

All four operations exist and are fully implemented:
- `addHorizontalLine(normY)` — inserts a new row, interpolates new points, calls `pushUndo()`, saves to localStorage
- `addVerticalLine(normX)` — inserts a new column, same pattern
- `removeHorizontalLine(index)` — guards outer lines, splices srcYs + points, calls `pushUndo()`
- `removeVerticalLine(index)` — guards outer lines, splices srcXs + row columns, calls `pushUndo()`

**B7 context menu work:** These operations already exist. The planner's task is to:
1. Rewrite `onContextMenu()` to use screen-space hit-testing (6px/10px, per D-10) against actual displaced line positions rather than the current normalized `srcYs/srcXs` lookup with `nearLineThreshold = 0.03`.
2. Replace the current flat menu items with the three-case menu structure from D-10.
3. Rename "Remove this horizontal line" → "Delete horizontal line" / "Delete this line" per copywriting contract.

**Critical hit-test refactor needed:** The current `onContextMenu()` compares `Math.abs(grid.srcYs[i] - normY) < 0.03` using the baseline srcY values, not the actual displaced point positions. After B2 (trapezoid corners), this would be wrong — lines are no longer straight horizontal/vertical. The correct approach matches what `onLineHover()` already does: compute average screen-space position across all points on a line segment (lines 276-291 in handle-drag.js).

### Investigation 3: Profile Dirty Detection

[VERIFIED: runtime-projection-profile-persistence.js — no dirty-flag logic exists yet]

Currently `profileLoadFlow()` calls `applyGridPayload(body?.data)` but **does not store a snapshot** of the loaded geometry for comparison. The profile chip + dirty detection requires:

1. A module-level variable in `runtime-projection-profile-persistence.js` (e.g., `let _loadedProfileSnapshot = null; let _loadedProfileName = null;`) set at the end of `profileLoadFlow()` via `snapshotGridState()`.
2. A `isDirty()` function that deep-compares the current `snapshotGridState()` against `_loadedProfileSnapshot` (same fields: `srcXs`, `srcYs`, `points`).
3. Call `isDirty()` to update the profile chip UI after any drag-end, undo, line add/remove, or reset.

**Snapshotting is available:** `snapshotGridState()` is already exported from `runtime-projection-grid-state.js` (line 270) and does exactly the deep-copy needed.

**Comparison strategy:** Compare `srcXs.length`, `srcYs.length`, then each value, then each `points[r][c].x/y`. The `hasGridDisplacements()` function at grid-state.js lines 87-97 shows the 0.001 threshold pattern to tolerate float drift — the dirty comparison should use the same threshold.

### Investigation 4: Live-Sync Dirty Broadcast

[VERIFIED: server.mjs, runtime-live-sync-core.js, runtime-global-defaults.js]

**Channel:** `global-config-update` WebSocket message triggers all clients to call `fetchGlobalDefaultsPayload()` + `applyGlobalDefaultsPayloadToState()` (runtime-live-sync-core.js lines 501-528, runtime-global-defaults.js lines 390-433).

**Server broadcast:** `broadcastLiveSession("global-config-update", { ... })` sends to all connected clients (server.mjs lines 2789-2793).

**Smallest viable change for B5 dirty flag:**

*Server side (server.mjs):*
- Add `alignModeDirtyOnOutput: false` to `liveSessionState` initial state (line 72-84 area).
- Add a new HTTP endpoint (e.g., `POST /api/align-mode-dirty`) that accepts `{ dirty: boolean }` and updates `liveSessionState.alignModeDirtyOnOutput`, then calls `broadcastLiveSession("global-config-update", { alignModeDirtyOnOutput: ... })`.
- Alternatively, the existing `/output/` WebSocket handler can receive a `live-mutation` of type `align-mode-dirty-update` — but a simple POST endpoint is simpler and consistent with how `handleGlobalDefaultsSave` works.

*Client side (runtime-global-defaults.js `applyGlobalDefaultsPayloadToState`):*
- Add a check: `if (Object.prototype.hasOwnProperty.call(payload, 'alignModeDirtyOnOutput')) { state.alignModeDirtyOnOutput = Boolean(payload.alignModeDirtyOnOutput); }`
- After state update, call a new `syncAlignModeToggleDirtyState()` that enables/disables the dashboard `#align-mode-button`.

**Role identification:** The `/output/` client connects with `role="final-output"` on the WebSocket URL (runtime-env.js lines 20-25). The server stores this as `client.role === "final-output"` (server.mjs lines 1386-1388). This is how the server can identify which client to track for dirty state.

### Investigation 5: Server-Side Disconnect Grace Timer

[VERIFIED: server.mjs lines 1483-1499]

```javascript
socket.on("close", () => {
  liveClients.delete(clientId);
  lastBroadcastVersionByClient.delete(clientId);
  logSessionEvent("disconnect", { clientId, role, connectedClients: liveClients.size });
});
socket.on("error", (error) => {
  liveClients.delete(clientId);
  // ...
});
```

The `close` handler fires immediately on disconnect. There is currently **no grace timer**. Adding the D-06 10s grace timer requires:

1. A server-level variable `let _outputDirtyGraceTimer = null;`
2. On `close` or `error` when `role === "final-output"`:
   - If `liveSessionState.alignModeDirtyOnOutput === true`, start a `setTimeout` of 10s before clearing the dirty flag and broadcasting.
   - If `liveSessionState.alignModeDirtyOnOutput === false`, no timer needed (nothing to clear).
3. On reconnect (`liveClients.set` when new `role === "final-output"` arrives), cancel any pending timer with `clearTimeout(_outputDirtyGraceTimer)`.
4. The dirty-flag POST handler resets the timer when the /output/ client sends a still-dirty state (D-06: "timer is reset every time /output/ client heartbeats with still-dirty state").

**Heartbeat mechanism:** The simplest implementation is: `/output/ client` calls the dirty POST endpoint on every `onDragEnd`/`pushUndo` while dirty. That POST resets the grace timer. No separate heartbeat interval needed.

### Investigation 6: Squish-Bar Drag Math

[VERIFIED: coordinate system — normalized 0..1, same as all existing drag math]

**Rectangular grid squish (D-13 opposite-side anchor):**

Top bar dragged down by screen-delta `Δy` (in normalized coords `dy = Δy / vh`):
- Anchor: bottom edge — all bottom-row points stay fixed.
- Old top Y = `getPoint(0, col).y` for each col (averaged or per-column).
- New top Y = `oldTopY + dy`.
- For each interior row `r` (r from 1 to lastRow-1):
  - `t = (startPts[r][c].y - startPts[0][c].y) / (startPts[lastRow][c].y - startPts[0][c].y)`
  - `newY = getPoint(0, c).y + t * (getPoint(lastRow, c).y - getPoint(0, c).y)`
  - This is exactly the same proportional interpolation as `onLineDragMove` for edge rows (handle-drag.js lines 453-467). **Reuse that math verbatim.**

This is essentially "drag top edge as a line" + proportional interior scaling. The code for this already exists in `onLineDragMove` for the `isEdgeRow` case. The squish-drag handler can call the same logic, just triggered from a different DOM element.

**Trapezoid squish (D-14 edge-perpendicular axis):**

When B2 has deformed the outer corners into a trapezoid:
- Top edge: vector from `getPoint(0, 0)` to `getPoint(0, lastCol)` in screen space.
- Edge normal: perpendicular to that vector (rotate 90°).
- The squish direction is the edge normal (in screen space), not world Y.
- Squish amount: project the drag delta onto the edge normal.
- Anchor: opposite edge midpoint.

Math (screen-space):
```
// Top edge vector
let edgeVx = (getPoint(0, lastCol).x - getPoint(0, 0).x) * vw;
let edgeVy = (getPoint(0, lastCol).y - getPoint(0, 0).y) * vh;
// Normal (perpendicular, pointing inward for top = downward)
let normalX = -edgeVy / edgeLen;  // normalized
let normalY =  edgeVx / edgeLen;
// Project drag onto normal
let squishAmount = (dx * vw * normalX + dy * vh * normalY);  // pixels
// Apply: move each top-edge point along normal by squishAmount
// ... then proportional interior scaling
```

For the rectangular case, `normalX = 0, normalY = 1`, which reduces to the simple Y-only squish. So the trapezoid math is a superset — implement trapezoid math from the start and it handles the rectangular case for free.

**Coordinate caution:** Points are in normalized 0..1 coords, but aspect ratio matters when computing perpendiculars. Compute edge vectors in pixel space (multiply by `vw`/`vh`), then convert the squish displacement back to normalized coords before calling `setPoint`.

### Investigation 7: Right-Click Hit-Test Refactor

[VERIFIED: current onContextMenu code at handle-ui.js lines 435-503]

**Current bug:** The hit-test at lines 444-462 uses `Math.abs(grid.srcYs[i] - normY) < 0.03` — comparing against the baseline srcY values, not the actual displaced average positions. On a heavily warped grid, this would miss lines entirely.

**Correct approach:** Match `onLineHover()` in handle-drag.js (lines 270-298) which computes `avgY` across actual displaced point positions. The context menu hit-test should use the same average-position approach.

**New hit-test algorithm per D-10:**
1. Compute all intersection positions in screen-space pixels.
2. For each intersection `getPoint(row, col)` → pixel coords → test Euclidean distance from click. If < 10px: intersection hit, record `{row, col}`.
3. If no intersection hit: for each line segment (between adjacent points), compute perpendicular distance from click to segment. If < 6px AND cursor is not within 10px of either endpoint: line hit.
4. Return `{ type: "intersection", row, col }` or `{ type: "line", axis: "h"|"v", lineIndex }` or `{ type: "empty" }`.

**Inner/outer discrimination for menu:** A line is "outer" if `lineIndex === 0 || lineIndex === lastIndex`. Menu items for the outer-line direction are hidden (not rendered, per D-10).

### Investigation 8: Default Layout Migration (B6)

[VERIFIED: runtime-projection-grid-state.js lines 41-66]

**Current default:**
```javascript
const DEFAULT_COUNT = 5; // 5 lines = 4 columns/rows (full 0..1 coverage)
function makeEvenLines(n) {
  const lines = [];
  for (let i = 0; i < n; i++) lines.push(i / (n - 1));
  return lines;
}
```
This creates `[0, 0.25, 0.5, 0.75, 1]` for 5 lines. Combined with `buildDefaultPoints()`, this creates a 5×5 grid of evenly-spaced points covering 0..1.

**B6 target default (80% centered, 3 lines per axis = 3×3 grid):**
```
srcXs = [0.1, 0.5, 0.9]   // outer at 10%/90%, one mid at 50%
srcYs = [0.1, 0.5, 0.9]   // outer at 10%/90%, one mid at 50%
```
This is 3 lines per axis (outer-left, mid, outer-right), creating 9 intersection points (3×3).

**Where to change:** The default is constructed in two places:
1. Module initialization at lines 50-66 (IIFE body — runs at parse time).
2. `resetGrid()` at lines 140-152 — calls `makeEvenLines(DEFAULT_COUNT)`.

**D-07: no migration.** Profiles already saved in `config/projection-profiles.json` are loaded via `applyGridPayload()` which reads the profile's own `srcXs/srcYs`. A profile with the old 5-line layout still loads correctly because `applyGridPayload` replaces `grid.srcXs/srcYs` wholesale.

**The "fresh profile" path:** When no profile is loaded (or when `resetGrid()` is called after Discard with no loaded profile), the grid falls back to the module-level defaults. Only this initialization path needs changing for B6. Both locations (IIFE init and `resetGrid`) should reference a new `buildNewProfileDefaultLayout()` helper instead of `makeEvenLines(DEFAULT_COUNT)`.

### Investigation 9: Theme Token Verification

[VERIFIED: src/styles/design-system/foundations.css, lines 60-109]

Phase 27 tokens are confirmed present in both themes:

| Token | Dark value | Light value | Status |
|-------|-----------|-------------|--------|
| `--c-accent` | `#32D3A3` | `#0F9E75` | CONFIRMED |
| `--c-accent-2` | `#1FA378` | `#0B7A5A` | CONFIRMED |
| `--c-accent-bg` | `rgba(50,211,163,0.14)` | `rgba(15,158,117,0.12)` | CONFIRMED |
| `--c-accent-fg` | `#06110C` | `#FFFFFF` | CONFIRMED |
| `--c-warn` | `#F5B544` | `#B9801F` | CONFIRMED |
| `--c-danger` | `#FF5B5B` | `#D94141` | CONFIRMED |
| `--c-danger-bg` | `rgba(255,91,91,0.12)` | `rgba(217,65,65,0.10)` | CONFIRMED |
| `--c-text` | `#f2f4f7` | `#111418` | CONFIRMED |
| `--c-text-2` | `rgba(242,244,247,0.68)` | `rgba(17,20,24,0.64)` | CONFIRMED |
| `--c-border` | `rgba(255,255,255,0.08)` | `rgba(10,10,14,0.08)` | CONFIRMED |
| `--c-border-str` | `rgba(255,255,255,0.14)` | `rgba(10,10,14,0.16)` | CONFIRMED |

Themes are scoped to `.dir-obsidian-dark` / `.dir-obsidian-light` CSS classes (not `[data-theme]`). New Phase 27 components that use `var(--c-*)` tokens automatically inherit both themes.

Legacy tokens used by existing handle code (`--glow`, `--danger`, `--panel`) are in `:root` in `src/styles.css` — no theming; they do not change between themes. Existing handle inline styles are untouched per 27-UI-SPEC.md.

### Investigation 10: GL Renderer — Trapezoid Verification

[VERIFIED: src/app/runtime/viewport/runtime-projection-gl-renderer.js — no corner-specific code]

The GL renderer works by iterating every cell in `grid.points` and computing UV coordinates from the normalized positions. It does not have any concept of "outer corners should form a rectangle." The mesh-warp reads whatever positions are in `grid.points[row][col]` without branching on row/col indices. After B2 removes the proportional-remesh from `onDragMove`, the GL renderer will automatically handle trapezoid outer shapes. **No shader changes are needed.** [VERIFIED: confirmed no outer-corner references in GL renderer source]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deep-equal grid snapshot comparison | Custom recursive equals | `snapshotGridState()` + field-by-field loop with 0.001 threshold | Already has the right structure and float-tolerance |
| Context menu DOM | New menu component | `showContextMenu()` in handle-ui.js (lines 505-541) | Positioning, overflow-clamp, dismiss-on-outside, aria — all implemented |
| Modal for "Save as new" | Custom dialog | `.tt-modal-backdrop` + `.tt-modal` pattern (styles.css lines 1941+) | Animation, accessibility, button styles already present |
| Undo snapshot for line ops | Manual snapshot | `pushUndo()` from grid-state (call before any grid mutation) | Stack management + MAX_UNDO capped at 50 already handled |
| Proportional interior scaling during squish | New math | Reuse the `onLineDragMove` `isEdgeRow` block pattern (handle-drag.js lines 452-467) | Exact same math — proportional t-based interpolation |
| Profile persistence HTTP round-trips | New fetch wrappers | `buildGridPayload()` / `applyGridPayload()` in profile-persistence.js | Serialization + sort/filter already handles edge cases |

---

## Common Pitfalls

### Pitfall 1: Context menu hit-test uses srcYs not actual displaced positions
**What goes wrong:** After a trapezoid deformation (B2), `grid.srcYs[i]` no longer matches the screen position of the i-th horizontal line. The current `onContextMenu` code checks `Math.abs(grid.srcYs[i] - normY) < 0.03` — this will miss displaced lines entirely.
**Why it happens:** The original context menu was written before arbitrary outer-corner displacement existed. `srcYs` was a reliable proxy for screen Y when the grid was axis-aligned.
**How to avoid:** Always compute hit-test positions from `getPoint(row, col)` actual displaced coordinates, then compute the line's average screen position (same as `onLineHover` does).
**Warning signs:** Right-click near a visually displaced line shows the "empty canvas" menu instead of the line menu.

### Pitfall 2: Removing isEdge from onDragMove breaks the squish-bar drag behavior
**What goes wrong:** The `onLineDragMove` `isEdgeRow/isEdgeCol` proportional scaling (lines 445-494) is the correct behavior for *line* drags on the outer edges. The `onDragMove` `isEdge` block (lines 199-248) applies global remesh to *point* drags on outer edges. Only the latter should be removed for B2.
**How to avoid:** B2 removes the `isEdge` block from `onDragMove` only. The `isEdgeRow/isEdgeCol` blocks in `onLineDragMove` remain untouched — they are correct behavior.

### Pitfall 3: Profile chip DOM present on /control/ client but should only activate on /output/
**What goes wrong:** The profile chip + toolbar are /output/-only UI (the beamer client, not the dashboard). If created on the dashboard too, they'd interfere with the dashboard layout.
**How to avoid:** Gate toolbar creation in `showHandles()` with `if (ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;`. The `onAlignModeChange` path already gates on `OUTPUT_ROLE_FINAL` (handle-ui.js line 709).

### Pitfall 4: Undo stack dimension mismatch when lines are added/removed
**What goes wrong:** After adding a row (5×5 → 6×5 grid), the undo stack contains a snapshot of the old 5×5 shape. `restoreGridSnapshot` replaces `grid.srcYs` wholesale (grid-state.js line 113) — this is correct behavior. The undo does restore the old dimensions correctly because `snapshotGridState` captures `srcXs.slice()`, `srcYs.slice()`, and a deep copy of `points`.
**Why it matters to know:** Adding/removing lines through the new context menu items must call `pushUndo()` before the mutation — same as `addHorizontalLine` and `removeHorizontalLine` already do. No extra logic needed; the existing undo mechanism handles dimension changes correctly.

### Pitfall 5: Squish bars must be removed in removeHandles()
**What goes wrong:** If `rebuildSquishBars()` appends to `document.body` but `removeHandles()` doesn't clean up squish bar elements, they persist after align mode is deactivated.
**How to avoid:** Store squish bar elements in a `squishBarElements = []` array (mirror `rotateHandleElements`). Add cleanup loop in `removeHandles()` (handle-ui.js lines 99-122 pattern).

### Pitfall 6: The grace timer must be per-/output/-session, not global
**What goes wrong:** If multiple /output/ clients somehow connect (even briefly), the grace timer could be reset by a reconnecting second client, leaving the dirty flag perpetually set.
**How to avoid:** Track the grace timer by `clientId` of the last /output/ client that sent a dirty state. On reconnect, only cancel the grace timer if the reconnecting client ID is the same as the one that disconnected — or simply cancel any pending grace timer when any /output/ client reconnects (safe for the single-/output/ assumption per D-04).

### Pitfall 7: Profile chip z-index stacking
**What goes wrong:** The toolbar at z-index 9998 could be obscured by intersection handles at z-index 9999.
**How to avoid:** The toolbar is at the top-center of the viewport, above the grid area. Handles are positioned at grid intersection points (typically in the center/lower portion of the screen). In practice there is no overlap. But if the grid moves to the top edge (possible after pan), a handle at z-index 9999 would render above the toolbar. The UI-SPEC sets toolbar z-index 9998, which is intentional — the toolbar should not cover draggable handles. This is the correct tradeoff per the spec.

---

## Code Examples

### B1 — Remove outer line red color from drawLines()
```javascript
// Source: runtime-projection-handle-ui.js lines 273-299
// BEFORE:
const isEdge = row === 0 || row === rows - 1;
lineCtx.strokeStyle = isEdge ? "rgba(220, 30, 30, 0.7)" : "rgba(0, 220, 180, 0.45)";
lineCtx.lineWidth = isEdge ? 2 : 1;

// AFTER (D-01: all lines same teal):
lineCtx.strokeStyle = "rgba(0, 220, 180, 0.45)";
lineCtx.lineWidth = 1;
// (Same change for vertical lines — col === 0 || col === cols - 1)
```

### B2 — Remove proportional remesh from onDragMove()
```javascript
// Source: runtime-projection-handle-drag.js lines 199-248
// Delete the entire isEdge block:
// const isEdge = r === 0 || r === lastRow || c === 0 || c === lastCol;
// if (isEdge) { ... }
// After B2: all points drag freely regardless of position in grid.
```

### B6 — New default layout function
```javascript
// Source: runtime-projection-grid-state.js (new function)
function buildNewProfileDefaultGrid() {
  // 80% centered rectangle + one mid horizontal + one mid vertical = 3×3
  return {
    srcXs: [0.1, 0.5, 0.9],
    srcYs: [0.1, 0.5, 0.9],
  };
}
// Replace makeEvenLines(DEFAULT_COUNT) calls in grid init and resetGrid()
// with buildNewProfileDefaultGrid() output.
```

### B9 — Squish bar DOM creation (mirrors rebuildRotateHandles pattern)
```javascript
// Source: mirrors runtime-projection-handle-ui.js lines 179-214
const SQUISH_SIDES = [
  { key: "TOP",    axis: "h", cursor: "ns-resize", offsetAxis: "y", offsetDir: -1 },
  { key: "BOTTOM", axis: "h", cursor: "ns-resize", offsetAxis: "y", offsetDir:  1 },
  { key: "LEFT",   axis: "v", cursor: "ew-resize", offsetAxis: "x", offsetDir: -1 },
  { key: "RIGHT",  axis: "v", cursor: "ew-resize", offsetAxis: "x", offsetDir:  1 },
];

function rebuildSquishBars() {
  for (const el of squishBarElements) {
    el.removeEventListener("pointerdown", onSquishBarPointerDown);
    el.remove();
  }
  squishBarElements = [];
  for (const side of SQUISH_SIDES) {
    const el = document.createElement("div");
    el.className = "projection-squish-bar";
    el.dataset.squishSide = side.key;
    // Width/height: 60×10 for h-bars, 10×60 for v-bars
    const isH = side.axis === "h";
    el.style.cssText = `
      width: ${isH ? 60 : 10}px;
      height: ${isH ? 10 : 60}px;
      background: rgba(50,211,163,0.80);
      border: 1.5px solid rgba(255,255,255,0.85);
      border-radius: 5px;
      cursor: ${side.cursor};
    `;
    // Inner ridge div for drag affordance
    const ridge = document.createElement("div");
    ridge.style.cssText = `
      position: absolute;
      ${isH ? "left:50%; top:50%; transform:translate(-50%,-50%); width:2px; height:80%;" : "top:50%; left:50%; transform:translate(-50%,-50%); height:2px; width:80%;"}
      background: rgba(5,50,40,0.55);
      border-radius:1px;
      pointer-events:none;
    `;
    el.appendChild(ridge);
    el.addEventListener("pointerdown", onSquishBarPointerDown);
    document.body.appendChild(el);
    squishBarElements.push(el);
  }
}
```

### B9 — Squish bar positioning (midpoint of each outer edge, 30px outward)
```javascript
// Source: mirrors positionRotateHandles() in runtime-projection-handle-ui.js
function positionSquishBars() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const lastRow = grid.srcYs.length - 1;
  const lastCol = grid.srcXs.length - 1;
  const midCol = Math.floor(lastCol / 2);
  const midRow = Math.floor(lastRow / 2);

  // Top bar: midpoint of top edge
  const topLeft  = getPoint(0, 0);
  const topRight = getPoint(0, lastCol);
  const topMidX  = ((topLeft.x + topRight.x) / 2) * vw;
  const topMidY  = ((topLeft.y + topRight.y) / 2) * vh;
  squishBarElements[0].style.left = `${topMidX}px`;
  squishBarElements[0].style.top  = `${topMidY - 30}px`;

  // Bottom bar: midpoint of bottom edge
  // Left bar: midpoint of left edge
  // Right bar: midpoint of right edge
  // ... (same pattern, offsets +30 / -30 in corresponding axis)
}
```

### B5 — Adding alignModeDirtyOnOutput to global-config-update broadcast
```javascript
// Source: server.mjs — inside the dirty-state POST handler (new endpoint)
liveSessionState.alignModeDirtyOnOutput = Boolean(dirty);
broadcastLiveSession("global-config-update", {
  alignModeDirtyOnOutput: liveSessionState.alignModeDirtyOnOutput,
  source: "align-mode-dirty-update",
  savedAt: new Date().toISOString(),
});
```

```javascript
// Source: runtime-global-defaults.js — applyGlobalDefaultsPayloadToState
if (Object.prototype.hasOwnProperty.call(payload, "alignModeDirtyOnOutput")) {
  state.alignModeDirtyOnOutput = Boolean(payload.alignModeDirtyOnOutput);
  // Trigger dashboard toggle disable/enable
  ctx.syncAlignModeToggleDirtyState?.();
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Profile snapshot for dirty comparison | Custom serializer | `snapshotGridState()` (grid-state.js line 103) | Handles all three arrays with deep copy |
| Context menu positioning + overflow clamp | New logic | `showContextMenu(x, y, items)` (handle-ui.js lines 505-541) | rAF overflow clamp + dismiss-on-outside already done |
| Save-as modal | Custom dialog | `.tt-modal-backdrop` + `.tt-modal` CSS pattern | 120ms animation, focus ring, button classes — all present |
| Squish proportional interior scaling | New math | Reuse `onLineDragMove` isEdgeRow block pattern | Proven formula, handles float precision edge cases |
| Line segment perpendicular distance | Custom math | See Pitfall 1 — use avgY/avgX approach from onLineHover | Already handles curved/displaced lines correctly |

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 27 |
|---|---|---|
| Outer lines red (rgba(220,30,30,0.7)) | Same teal as inner (B1) | drawLines() color branch removed |
| Corner drag causes proportional interior remesh | Corner drag moves corner only (B2) | isEdge block removed from onDragMove |
| Context menu uses srcYs normalized coords | Screen-space actual positions (B7) | Full hit-test rewrite |
| No dirty-flag tracking | Profile snapshot + deep-compare (B3/B4) | New state in profile-persistence module |
| Line deletion only in context menu (3 lines guard) | Correct guard + end-to-end with undo | removeHorizontalLine already correct, menu update needed |

**Deprecated/outdated:**
- `nearLineThreshold = 0.03` normalized comparison in `onContextMenu`: replaced by screen-space pixel hit-test
- Profile chip UI via `window.prompt()` in `profileSaveFlow`: replaced by modal + toolbar buttons

---

## Validation Architecture

**Config:** `.planning/config.json` has `workflow._auto_chain_active: false`. No `nyquist_validation` key found — treat as enabled (default).

**Framework:** No existing test framework detected (no `jest.config.*`, `vitest.config.*`, `pytest.ini`, or `tests/` directory). Project is a vanilla JS app without a bundler — browser-only runtime.

**Recommendation: Hand-test checklist mode.** Each B-item gets explicit "given X, click Y, observe Z" steps.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — manual browser acceptance tests |
| Config file | N/A |
| Quick run command | Open browser → /output/ → toggle align mode |
| Full suite command | Execute full B1..B9 acceptance checklist below |

### Phase Requirements → Acceptance Checklist

| Req | Behavior | Test Type | Acceptance Criterion |
|-----|----------|-----------|---------------------|
| B1 | Outer lines are teal, not red | Visual | After align mode ON: all grid lines including outer rectangle are `rgba(0,220,180,0.45)` teal — no red lines visible |
| B1 | Outer line drag behaves as inner | Interaction | Drag outer edge → cursor shows ns-resize/ew-resize; line moves; interior scales proportionally |
| B2 | Outer corner draggable, no remesh | Interaction | Drag top-left corner → only corner moves; interior points remain in original positions relative to each other |
| B3 | Profile name visible in toolbar | Visual | Load a profile → toolbar shows profile name; no profile loaded → shows "Unsaved" |
| B4 | Dirty flag on any mutation | Visual | Drag any handle → dirty dot `●` appears; name turns amber; Save/Discard buttons activate |
| B4 | Save overwrites loaded profile | Function | In dirty state, click "Save profile" → profile updates on disk; toolbar returns to clean state |
| B4 | Discard without confirm | Function | In dirty state, click "Discard" → no confirm modal; grid reverts to last-saved geometry |
| B5 | Dashboard toggle disabled when /output/ dirty | Function | /output/ is dirty → on dashboard: #align-mode-button has `disabled` attribute; hint text visible |
| B5 | Dashboard toggle re-enables after save/discard | Function | /output/ saves or discards → dashboard toggle re-enables within ~500ms |
| B5 | Grace timer clears dirty after disconnect | Function | /output/ is dirty → disconnect → wait 10s → dashboard toggle re-enables |
| B6 | New profile has 80% default layout | Visual | Call resetGrid() (or Discard with no profile) → grid is 3×3 at 10%/50%/90% positions |
| B7 | Right-click empty canvas: no delete options | Menu | Right-click on empty area → menu shows only "Add horizontal line here" + "Add vertical line here" |
| B7 | Right-click inner line: delete + add options | Menu | Right-click near inner line → menu shows "Delete this line" + "Add line through this point" |
| B7 | Right-click intersection: per-line deletes | Menu | Right-click near inner intersection → menu shows "Delete vertical line" + "Delete horizontal line" + "Add line through this point" |
| B7 | Right-click outer intersection: outer delete hidden | Menu | Right-click on top-left corner intersection → no "Delete horizontal line" (outer) option; no "Delete vertical line" (outer) option |
| B8 | Line deletion end-to-end | Function | Delete a line via context menu → line disappears from canvas; undo (Ctrl+Z) restores it; reload page → deleted line not restored from last-saved profile |
| B9 | Squish bars visible outside board | Visual | Align mode ON → four teal rectangular bars visible outside the grid rectangle, one per side |
| B9 | Top bar squish compresses from top | Interaction | Drag top bar down → top edge moves down; bottom edge stays; interior lines compress proportionally |
| B9 | Squish is undoable | Function | Squish → Ctrl+Z → grid restores to pre-squish positions |

### Wave 0 Gaps
None — no automated test framework exists and none is introduced. All validation is manual acceptance testing via the above checklist. The planner should generate a `27-VALIDATION.md` with the above checklist as the phase gate.

---

## Environment Availability

Step 2.6: SKIPPED. Phase 27 is purely code/config changes within the existing running Node.js + browser app. No new external CLI tools, databases, or runtime services are introduced. The existing `node server.mjs` + browser stack is the target environment.

---

## Security Domain

No new authentication, session management, or cryptography surface is introduced. All Phase 27 changes are editor UX on an already-trusted /output/ endpoint (LAN-only, no public exposure).

**V5 Input Validation applicable:** Profile save accepts user-supplied profile name. Existing server.mjs `sanitizeProfileName()` already validates profile names (confirmed by usage at lines 3287, 3310). New "Save as new..." input must pass through this same validation or equivalent client-side check (empty/whitespace guard per UI-SPEC).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GL renderer has no outer-corner-specific code | Investigation 10 | If it does, B2 may require a shader change — inspect full GL renderer source if issues arise |
| A2 | Single /output/ client is the deployment invariant | Investigations 4/5 | If two /output/ clients connect simultaneously, the grace timer logic becomes ambiguous; D-04 scopes this down intentionally |
| A3 | Profile chip z-index 9998 does not conflict with handle z-index 9999 in practice | Code Examples | In extreme pan positions (grid moved to top of screen), a handle could visually overlap the toolbar — acceptable per UI-SPEC |

**If this table were empty:** All claims were verified from source code in this session. The three items above are verified structurally but have minor edge-case risks.

---

## Open Questions (RESOLVED)

1. **Does `resetGrid()` count as "no profile loaded" for the Discard button?**
   - What we know: `resetGrid()` clears the grid to default positions and clears localStorage.
   - What's unclear: Whether pressing Discard (= revert to loaded profile) when no profile is loaded should call `resetGrid()` or simply be disabled.
   - Recommendation: UI-SPEC implies Discard is disabled (ghost, `pointer-events:none`) when clean. When dirty with no loaded profile, Discard should call `resetGrid()` to revert to the new B6 default.
   - **RESOLUTION:** Discard with no profile loaded calls `resetGrid()` (matches researcher recommendation). Implemented in Plan 27-02 Task 1's `discardChanges()` — when `_loadedProfileSnapshot === null`, the function constructs a fresh snapshot from `buildNewProfileDefaultGrid()` and restores it (functionally equivalent to `resetGrid()` but reuses the snapshot/restore path so undo + dirty re-evaluation are consistent).

2. **"Add line through this point" in the intersection context menu — which axis?**
   - What we know: UI-SPEC says this item appears on line hits and intersection hits. For a "line" hit, it inserts a perpendicular line (on a horizontal line: add vertical line; on vertical line: add horizontal line). For an intersection hit, it's ambiguous.
   - What's unclear: When right-clicking on an intersection, should "Add line through this point" add both a perpendicular horizontal AND perpendicular vertical? Or should it be two separate items ("Add horizontal line here" + "Add vertical line here")?
   - Recommendation: For intersections, show both "Add horizontal line here" and "Add vertical line here" as separate items (matching the "empty canvas" menu). The "Add line through this point" label makes sense for a single-line hit; for intersections it degrades to two explicit add items.
   - **RESOLUTION:** Emit a SINGLE menu item labeled `"Add line through this point"` per locked decision **D-10** and the locked **27-UI-SPEC** Copywriting Contract. The action of that single item adds BOTH a perpendicular horizontal AND a perpendicular vertical line at the click coordinate, so the user gets both lines through the point with one click — this matches the intuitive reading of the label. **NOTE:** The previous research recommendation of two separate items (`"Add horizontal line here"` + `"Add vertical line here"`) was OVERRIDDEN by the locked CONTEXT decision D-10 + the UI-SPEC Component Specifications "Right-Click Context Menu" table row for intersections. Implemented in Plan 27-03 Task 1's intersection branch as `{ label: "Add line through this point", action: () => { addHorizontalLine(normY); addVerticalLine(normX); } }`.

3. **Does profile save via the new modal replace `profileSaveFlow()` entirely, or does the old save flow remain as a fallback?**
   - What we know: The old `profileSaveFlow()` uses `window.prompt()` (profile-persistence.js line 79).
   - What's unclear: Should the old prompt-based flow be removed entirely, or kept as a fallback in the context menu?
   - Recommendation: Remove the old `window.prompt()` path entirely. The new modal is the only save UI. The old context menu items ("Save profile...", "Load profile...", "Delete profile...") should be removed from `onContextMenu()` as part of the B3/B4/B7 rewrite.
   - **RESOLUTION:** The `window.prompt()`-based `profileSaveFlow` is removed entirely (matches researcher recommendation). Replaced by the toolbar `Save` / `Save as new…` modal in Plan 27-02 Task 1 (`saveLoadedProfileFlow` / `saveAsNewProfileFlow` + the locked-copy `_promptProfileNameModal`). Plan 27-03 Task 1 also removes the legacy `Save profile…` / `Load profile…` / `Delete profile…` / `Reset all` items from the right-click menu.

---

## Sources

### Primary (HIGH confidence — verified from source code)
- `src/app/runtime/viewport/runtime-projection-grid-state.js` — full read; data model, undo stack, defaults, persistence
- `src/app/runtime/viewport/runtime-projection-handle-ui.js` — full read; DOM lifecycle, rotate handles, context menu, line add/remove, drawLines()
- `src/app/runtime/viewport/runtime-projection-handle-drag.js` — full read; all drag handlers, isEdge branching, LINE_HIT_THRESHOLD
- `src/app/runtime/viewport/runtime-projection-profile-persistence.js` — full read; save/load/delete flows, applyGridPayload
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — full read; WebSocket lifecycle, global-config-update handler
- `server.mjs` lines 72-89, 1213-1240, 1361-1499, 2712-2804, 3271-3341 — WebSocket connect/disconnect, broadcastLiveSession, handleGlobalDefaultsSave, projection-profiles API
- `src/app/runtime/live-sync/runtime-global-defaults.js` lines 386-433 — applyGlobalDefaultsPayloadToState
- `src/app/runtime/viewport/runtime-stage-viewport.js` lines 46-118 — syncAlignModePanel, setAlignMode
- `src/app/lib/shared/runtime-env.js` — OUTPUT_ROLE_FINAL, resolveLiveWebSocketUrl with role param
- `src/styles.css` lines 1867-1897, 1941-2042 — board-context-menu, tt-modal CSS classes confirmed
- `src/styles/design-system/foundations.css` — all `--c-*` tokens confirmed for dark + light themes
- `config/projection-profiles.json` — existing profile structure (srcXs, srcYs, points flat array)

### Secondary (MEDIUM confidence)
- `.planning/phases/phase-27/27-CONTEXT.md` — locked decisions
- `.planning/phases/phase-27/27-UI-SPEC.md` — visual contracts, squish bar dimensions, z-index values
- `.planning/phases/phase-26/SUMMARY.md` — Pi /output/ hardening context, requestIdleCallback warning

---

## Metadata

**Confidence breakdown:**
- Grid model audit (B1/B2): HIGH — read source directly, all branching documented
- Line add/remove ops (B7/B8): HIGH — existing `addHorizontalLine`/`removeHorizontalLine` confirmed complete
- Dirty detection (B3/B4): HIGH — confirmed no snapshot currently stored; approach is clear
- Live-sync broadcast (B5): HIGH — channel structure confirmed; smallest change documented
- Server grace timer (B5): HIGH — `socket.on("close")` confirmed; location for new timer is clear
- Squish math (B9): HIGH — coordinate system confirmed; math derived from existing `onLineDragMove` pattern
- Default layout (B6): HIGH — `DEFAULT_COUNT` and `makeEvenLines` confirmed; change scope is one function
- Theme tokens: HIGH — both `--c-*` themes confirmed present in foundations.css
- GL trapezoid support: HIGH — confirmed no outer-corner-specific branching in GL renderer

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (stable codebase; no fast-moving upstream dependencies)
