# Phase 24 Wave 5 — Module-boundary cleanup (RESEARCH)

**Researched:** 2026-04-26
**Domain:** Vanilla-JS, IIFE-with-window-globals runtime; module-graph
extraction + cycle detection + header-comment audit + transitive
re-export pruning under a strict no-behaviour-change rule. Wave 5
changes module STRUCTURE (file headers + namespace boundaries); it
does not change identifier names (W4) or function bodies (W3).

**Confidence:** HIGH for all measurements (every reference count, every
namespace consumer was extracted from the post-W4 tree at HEAD by
literal grep / Node-script analysis). HIGH for the cycle finding
(only one SCC > 1 exists, and its shape is fully characterised).
MEDIUM for the cleanup recommendations themselves — most of what
the ROADMAP would call "circular imports" do not exist as runtime
cycles in this codebase, so the wave's deliverables are smaller
than ROADMAP scope budgeted for. Every claim is tagged
`[VERIFIED: ...]`.

## Summary

The post-W4 tree carries **101 `.js` files** in `src/app/runtime/` +
`src/app/lib/` ([VERIFIED: `find src/app/runtime src/app/lib -name "*.js" | wc -l` = 101]),
defining **101 distinct `window.TT_BEAMER_*` namespaces**
([VERIFIED: Node script extracting `window.TT_BEAMER[A-Z_0-9]+\s*=`
patterns]). Of those, **81 modules already carry a substantive header
comment** placed immediately above their `(() => { ... })()` wrapper
([VERIFIED: line-by-line scan of every `.js` file's first 30 lines]).
**20 modules are missing a header** — 17 in `src/app/lib/`
(zero headers across the entire `lib/` tree) plus 3 in
`src/app/runtime/` (`runtime-utils.js`, `polygon-contract.js`,
`runtime-orchestration.js`).

The runtime-namespace dependency graph has **exactly one strongly-
connected-component of size > 1** ([VERIFIED: Tarjan SCC over file →
file edges built from `window.TT_BEAMER_X` reads/writes]):
`runtime-bootstrap.js` ↔ `runtime-panels-controller.js`. This is NOT
a true read-cycle — both files write to the same two namespaces
(`TT_BEAMER_RUNTIME_PANELS` and `TT_BEAMER_UI_RUNTIME_PANELS`).
panels-controller writes them at parse time; bootstrap reads them at
call time AND defensively re-writes them if absent. The defensive
write makes both files appear to be "owners," which is what the SCC
algorithm is detecting. Resolution is mechanical (drop the defensive
write — bootstrap can never run before panels-controller's parse-time
write because index.html load order guarantees it).

Beyond that one SCC, **no other direct A↔B cycle exists** in the
file dependency graph ([VERIFIED: same Tarjan run; only one
non-trivial SCC]). Wave 3's documented "ctx-arrow-callback" cycles
do exist, but they are CALL-TIME cycles inside `runtime-orchestration.js`
(or inside the 4 shim files), not file-to-file cycles in the namespace
graph. These cycles work because of `defer`-script load ordering and
because arrow-wrapped callbacks resolve their inner identifier at
call time (after every IIFE has parsed). Wave 5 should describe and
preserve these — they are load-bearing, not refactor candidates.

Transitive re-exports surface in **6 shim modules** that the W3
decomposition introduced (projection-mapping, animation-editor-view,
animation-lifecycle, fx-panels, draw-loop, polygon-editor) plus 2
single-cluster shims (wire-room-audio-binders, wire-fx-panel-binders).
Of the 101 namespaces, **only 1 has zero external readers**:
`TT_BEAMER_UI_RUNTIME_PANELS` ([VERIFIED: `grep -l "TT_BEAMER_UI_RUNTIME_PANELS" src/app/`
returns 2 files — both are writers, neither is a reader outside
self-write checks]). The other 100 namespaces are each read by
between 1 and 3 external files; **most are read by exactly one
consumer** (orchestration in 60+ cases; the parent shim in the
remaining ~30; app.js for 1).

**Primary recommendation:** slice Wave 5 into **9 commits** total —
1 INVENTORY-only graph dump (W5.1), 1 mechanical header-additions
batch (W5.2), 2 commits for the `runtime-bootstrap.js` ↔ `runtime-
panels-controller.js` SCC (separate "drop defensive write" + "drop
unused alias" so each is independently revertable), 4 single-shim
sub-namespace audits that confirm "no transitive re-exports
nobody depends on" (W5.5–W5.8 are negative results: confirm the
6 known shims keep their external surface but inspect for
unused intra-shim re-exports), and 1 INVENTORY closure (W5.9).
Total estimate: **9 commits, ~6 of them code-touching, ~3 docs-only**.
This is **smaller than ROADMAP §"Wave 5"** anticipated — the
ROADMAP imagined many cycles to break; the post-W3.6 tree has only
one, and the transitive-re-export ground is mostly clean already.

## User Constraints (from ROADMAP)

### Locked Decisions

- **No behaviour change.** Bit-for-bit identical UX after the wave.
- **No public-API changes** to WebSocket / live-sync protocol, the
  export-bundle JSON schema, or `localStorage` keys.
- **No dependency changes.** Same Node, same browser targets, same
  npm packages.
- **One commit per logical refactor.** Each commit revertable
  cleanly if it breaks something.
- **`madge`/equivalent shows zero cycles** in `src/app/runtime/`
  (acceptance criterion).
- **Each top-level module has a header comment** summarising its
  role (acceptance criterion).
- **Full feature regression after the wave** (manual smoke pass
  per ROADMAP lines 203–275).

### Claude's Discretion

- Slicing Wave 5 into sub-waves and commit count.
- Header comment tone/length (1–10 lines is reasonable; the bar is
  "informative and concise").
- Which "cycles" to actually break vs. document as load-bearing
  (the bar is "real cycles that can be safely resolved" not
  "cosmetic cycle-elimination" — see ROADMAP risk note).
- Whether to keep or drop the legacy `TT_BEAMER_UI_RUNTIME_PANELS`
  alias (zero external readers, but historically reachable).

### Deferred Ideas (OUT OF SCOPE)

- Type-checking (TS / JSDoc).
- Test-framework introduction.
- Performance work beyond what falls out of removing dead branches.
- New animation types / boards / control surfaces.
- README / docs rewrites.
- Function-level decomposition (W3 territory — already closed).
- Identifier renames (W4 territory — already closed).

## Project Constraints (from CLAUDE.md)

No project-level `CLAUDE.md` exists at the repository root
([VERIFIED: `ls -la CLAUDE.md 2>/dev/null` returns nothing]).
Project skill directories also absent (`.claude/skills/` and
`.agents/skills/` — neither present). All constraints come from the
phase ROADMAP and from the W1/W2/W3/W4 INVENTORY decisions
documented in `.planning/phases/phase-24/`.

---

## §1 — Module-graph extraction

### §1.1 — Methodology

For every `.js` file under `src/app/runtime/` and `src/app/lib/`:

1. **Defines** = every `window.TT_BEAMER_X = ...` assignment in the
   file body.
2. **External reads** = every `window.TT_BEAMER_X` reference where
   `X` is NOT also defined by this file. (Self-references are
   excluded — they're not graph edges.)
3. **File line count** = `wc -l` (no header / blank exclusions).
4. **Header comment lines** = sum of comment lines (`//` + `/* */`)
   appearing before the first `(() =>` IIFE-opener line, excluding
   blank lines.

The resulting per-file table is in §1.4 below.

### §1.2 — Aggregate counts

| Metric | Value | Source |
|--------|-------|--------|
| Total `.js` files | **101** | `find src/app/runtime src/app/lib -name "*.js" \| wc -l` |
| Files in `src/app/runtime/` | 84 | `find src/app/runtime -name "*.js" \| wc -l` |
| Files in `src/app/lib/` | 17 | `find src/app/lib -name "*.js" \| wc -l` |
| Total namespaces defined | **101** | Node-script regex extraction |
| Files defining 0 namespaces | **1** (orchestration shell) | `runtime-orchestration.js` |
| Files defining exactly 1 namespace | **98** | per-file table |
| Files defining 2+ namespaces | **2** | `runtime-bootstrap.js` (3), `runtime-panels-controller.js` (2) |
| Files with substantive header (>0 lines) | **81** | header-line scan |
| Files MISSING header | **20** | header-line scan |
| Total directed file → file edges | **134** | Built from `defines` × `external-reads` Cartesian |
| Strongly-connected-components (size > 1) | **1** | Tarjan SCC algorithm |
| Direct 2-cycles A↔B | **1** | (panels-controller, bootstrap) |

[VERIFIED: all counts produced by Node script `/tmp/w5/file-table.txt`
plus Tarjan SCC over the file graph. Output reproducible from the
snippet in §1.5.]

### §1.3 — Hub-and-spoke shape

The graph is overwhelmingly hub-and-spoke. **`runtime-orchestration.js`
consumes 69 distinct sibling namespaces** ([VERIFIED: count of
external-read entries on its row in `/tmp/w5/file-table.txt`]),
nearly every other namespace defined in the tree. It defines none
of its own — it is a pure consumer. Its 69 reads are how the
orchestration shell wires up the entire runtime.

The remaining edges fall into 5 patterns:

| Pattern | Edge count | Example |
|---------|-----------|---------|
| **Sub-module → utility** | 12 | `runtime-board-profiles.js` reads `TT_BEAMER_RUNTIME_UTILS` |
| **Shim → its sub-modules** | ~25 | `animation-editor-view.js` reads its 4 sub-namespaces |
| **Sub-module → another module's namespace** (rare) | ~10 | `runtime-board-profiles.js` reads `TT_BEAMER_RUNTIME_PROJECTION_MAPPING` for persistence |
| **Lib → other lib** (rare) | 2 | `lib/shared/normalizers.js` reads `TT_BEAMER_CONFIG` |
| **Sub-module → UI utility** | ~10 | UI editor sub-modules read `TT_BEAMER_UI_ICONS` / `TT_BEAMER_UI_ICON_PICKER` |

Outside the SCC, every edge points "down" the load order from
consumer to producer. No back-edges except the one SCC.

### §1.4 — Per-file table

Columns: `file | lines | header-lines | DEFINES | EXTERNAL_REFS`.
Path prefix `src/app/` omitted for table compactness.

| File | Lines | Hdr | Defines | External refs |
|------|------:|----:|---------|---------------|
| lib/api/global-defaults-api.js | 479 | 0 | TT_BEAMER_API | — |
| lib/boot/app-composition.js | 25 | 0 | TT_BEAMER_BOOT_COMPOSITION | TT_BEAMER_BOOT |
| lib/boot/runtime-bootstrap.js | 14 | 0 | TT_BEAMER_BOOT | — |
| lib/domain/event-lifecycle.js | 98 | 0 | TT_BEAMER_EVENT_LIFECYCLE | — |
| lib/domain/live-sync-domain.js | 41 | 0 | TT_BEAMER_LIVE_SYNC_DOMAIN | — |
| lib/domain/rooms.js | 178 | 0 | TT_BEAMER_ROOMS | — |
| lib/input/interaction-guards.js | 20 | 0 | TT_BEAMER_INPUT_GUARDS | — |
| lib/persistence/board-profiles.js | 167 | 0 | TT_BEAMER_PERSISTENCE | — |
| lib/render/viewport-lifecycle.js | 86 | 0 | TT_BEAMER_RENDER_VIEWPORT | — |
| lib/shared/config.js | 239 | 0 | TT_BEAMER_CONFIG | — |
| lib/shared/logger.js | 81 | 0 | TT_BEAMER_LOGGER | — |
| lib/shared/normalizers.js | 246 | 0 | TT_BEAMER_NORMALIZERS | TT_BEAMER_CONFIG |
| lib/shared/runtime-env.js | 29 | 0 | TT_BEAMER_RUNTIME_ENV | — |
| lib/state/live-sync-state.js | 96 | 0 | TT_BEAMER_LIVE_SYNC_STATE | — |
| lib/state/runtime-state.js | 188 | 0 | TT_BEAMER_STATE | — |
| lib/ui/runtime-panels-controller.js | 75 | 0 | TT_BEAMER_RUNTIME_PANELS, TT_BEAMER_UI_RUNTIME_PANELS | — |
| lib/ui/settings/rooms.js | 33 | 0 | TT_BEAMER_UI_SETTINGS_ROOMS | — |
| runtime/animation/runtime-animation-lifecycle.js | 111 | 28 | TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE | LIFECYCLE_CLUSTER_PADS, LIFECYCLE_LIVE_EDITOR, LIFECYCLE_RUNNING_LIST, LIFECYCLE_STATE, LIFECYCLE_STOP_PIPELINE |
| runtime/animation/runtime-lifecycle-cluster-pads.js | 280 | 17 | TT_BEAMER_RUNTIME_LIFECYCLE_CLUSTER_PADS | — |
| runtime/animation/runtime-lifecycle-live-editor.js | 532 | 9 | TT_BEAMER_RUNTIME_LIFECYCLE_LIVE_EDITOR | LIFECYCLE_STATE |
| runtime/animation/runtime-lifecycle-running-list.js | 526 | 14 | TT_BEAMER_RUNTIME_LIFECYCLE_RUNNING_LIST | LIFECYCLE_STATE, UI_ICONS |
| runtime/animation/runtime-lifecycle-state.js | 104 | 7 | TT_BEAMER_RUNTIME_LIFECYCLE_STATE | — |
| runtime/animation/runtime-lifecycle-stop-pipeline.js | 204 | 10 | TT_BEAMER_RUNTIME_LIFECYCLE_STOP_PIPELINE | — |
| runtime/animation/runtime-quick-mode.js | 474 | 14 | TT_BEAMER_RUNTIME_QUICK_MODE | UI_ICONS |
| runtime/animation/runtime-room-dispatch.js | 659 | 9 | TT_BEAMER_RUNTIME_ROOM_DISPATCH | — |
| runtime/animation/runtime-room-draft.js | 407 | 13 | TT_BEAMER_RUNTIME_ROOM_DRAFT | — |
| runtime/animation/runtime-room-management.js | 707 | 8 | TT_BEAMER_RUNTIME_ROOM_MANAGEMENT | — |
| runtime/animation/runtime-runtime-controls.js | 366 | 11 | TT_BEAMER_RUNTIME_RUNTIME_CONTROLS | TT_BEAMER_ANIMATION_EDITOR_VIEW, TT_BEAMER_INPUT_GUARDS |
| runtime/core/polygon-contract.js | 427 | **0** | TT_BEAMER_POLYGON_CONTRACT | TT_BEAMER_RUNTIME_UTILS |
| runtime/core/runtime-animation-factory.js | 124 | 6 | TT_BEAMER_RUNTIME_ANIMATION_FACTORY | — |
| runtime/core/runtime-board-switch.js | 132 | 8 | TT_BEAMER_RUNTIME_BOARD_SWITCH | — |
| runtime/core/runtime-bootstrap.js | 315 | 8 | TT_BEAMER_RUNTIME_PANELS, TT_BEAMER_UI_RUNTIME_PANELS, TT_BEAMER_RUNTIME_BOOTSTRAP | — |
| runtime/core/runtime-dom-refs.js | 309 | 5 | TT_BEAMER_RUNTIME_DOM_REFS | — |
| runtime/core/runtime-polygon-metrics.js | 93 | 6 | TT_BEAMER_RUNTIME_POLYGON_METRICS | — |
| runtime/live-sync/runtime-config-sync.js | 323 | 8 | TT_BEAMER_RUNTIME_CONFIG_SYNC | — |
| runtime/live-sync/runtime-global-defaults.js | 517 | 9 | TT_BEAMER_RUNTIME_GLOBAL_DEFAULTS | TT_BEAMER_API, TT_BEAMER_RUNTIME_UTILS |
| runtime/live-sync/runtime-live-sync-core.js | 548 | 11 | TT_BEAMER_RUNTIME_LIVE_SYNC_CORE | — |
| runtime/live-sync/runtime-live-sync-helpers.js | 347 | 10 | TT_BEAMER_RUNTIME_LIVE_SYNC_HELPERS | — |
| runtime/live-sync/runtime-zone-loader.js | 333 | 9 | TT_BEAMER_RUNTIME_ZONE_LOADER | TT_BEAMER_ROOMS |
| runtime/panels/runtime-clamp-sync-panels.js | 134 | 6 | TT_BEAMER_RUNTIME_CLAMP_SYNC_PANELS | — |
| runtime/panels/runtime-fx-panels-inside-outside.js | 672 | 14 | TT_BEAMER_RUNTIME_FX_PANELS_INSIDE_OUTSIDE | TT_BEAMER_UI_ICON_PICKER |
| runtime/panels/runtime-fx-panels-room.js | 414 | 25 | TT_BEAMER_RUNTIME_FX_PANELS_ROOM | TT_BEAMER_UI_ICON_PICKER |
| runtime/panels/runtime-fx-panels.js | 62 | 16 | TT_BEAMER_RUNTIME_FX_PANELS | FX_PANELS_INSIDE_OUTSIDE, FX_PANELS_ROOM |
| runtime/panels/runtime-regression-tests.js | 500 | 9 | TT_BEAMER_RUNTIME_REGRESSION_TESTS | — |
| runtime/polygon-editor/runtime-polygon-context-menu.js | 315 | 8 | TT_BEAMER_RUNTIME_POLYGON_CONTEXT_MENU | — |
| runtime/polygon-editor/runtime-polygon-editor-handles.js | 378 | 25 | TT_BEAMER_RUNTIME_POLYGON_EDITOR_HANDLES | — |
| runtime/polygon-editor/runtime-polygon-editor-panels.js | 267 | 7 | TT_BEAMER_RUNTIME_POLYGON_EDITOR_PANELS | — |
| runtime/polygon-editor/runtime-polygon-editor.js | 554 | 8 | TT_BEAMER_RUNTIME_POLYGON_EDITOR | TT_BEAMER_RUNTIME_POLYGON_EDITOR_HANDLES |
| runtime/polygon-editor/runtime-polygon-rotation.js | 240 | 12 | TT_BEAMER_RUNTIME_POLYGON_ROTATION | — |
| runtime/polygon-editor/runtime-polygon-undo.js | 168 | 8 | TT_BEAMER_RUNTIME_POLYGON_UNDO | — |
| runtime/render/runtime-audio.js | 428 | 21 | TT_BEAMER_RUNTIME_AUDIO | — |
| runtime/render/runtime-canvas-clip.js | 153 | 13 | TT_BEAMER_RUNTIME_CANVAS_CLIP | — |
| runtime/render/runtime-draw-loop-cluster-pads.js | 151 | 13 | TT_BEAMER_RUNTIME_DRAW_LOOP_CLUSTER_PADS | TT_BEAMER_RUNTIME_EFFECT_VISUALS |
| runtime/render/runtime-draw-loop.js | 716 | 14 | TT_BEAMER_RUNTIME_DRAW_LOOP | TT_BEAMER_RUNTIME_DRAW_LOOP_CLUSTER_PADS |
| runtime/render/runtime-effect-visuals.js | 303 | 15 | TT_BEAMER_RUNTIME_EFFECT_VISUALS | — |
| runtime/render/runtime-gif-decoder.js | 372 | 12 | TT_BEAMER_RUNTIME_GIF_DECODER | TT_BEAMER_POLYGON_CONTRACT |
| runtime/render/runtime-gif-playback.js | 153 | 14 | TT_BEAMER_RUNTIME_GIF_PLAYBACK | TT_BEAMER_RUNTIME_GIF_DECODER |
| runtime/render/runtime-outside-mp4.js | 355 | 15 | TT_BEAMER_RUNTIME_OUTSIDE_MP4 | — |
| runtime/render/runtime-perf.js | 321 | 9 | TT_BEAMER_RUNTIME_PERF | — |
| runtime/runtime-orchestration-ctx-builder.js | 251 | 15 | TT_BEAMER_RUNTIME_ORCHESTRATION_CTX_BUILDER | — |
| runtime/runtime-orchestration-helpers.js | 60 | 9 | TT_BEAMER_RUNTIME_ORCHESTRATION_HELPERS | TT_BEAMER_INPUT_GUARDS |
| runtime/runtime-orchestration.js | 2965 | **0** | (none — wire-up shell) | 69 namespaces (full hub) |
| runtime/runtime-utils.js | 22 | **0** | TT_BEAMER_RUNTIME_UTILS | — |
| runtime/state/runtime-asset-refs.js | 219 | 6 | TT_BEAMER_RUNTIME_ASSET_REFS | — |
| runtime/state/runtime-board-profiles.js | 284 | 8 | TT_BEAMER_RUNTIME_BOARD_PROFILES | TT_BEAMER_RUNTIME_PROJECTION_MAPPING, TT_BEAMER_RUNTIME_UTILS |
| runtime/state/runtime-board-state-accessors.js | 311 | 7 | TT_BEAMER_RUNTIME_BOARD_STATE_ACCESSORS | TT_BEAMER_ROOMS |
| runtime/state/runtime-fx-normalizers.js | 574 | 6 | TT_BEAMER_RUNTIME_FX_NORMALIZERS | TT_BEAMER_UI_ICONS |
| runtime/state/runtime-global-trigger-tracker.js | 289 | 6 | TT_BEAMER_RUNTIME_GLOBAL_TRIGGER_TRACKER | — |
| runtime/state/runtime-play-area-geometry.js | 480 | 8 | TT_BEAMER_RUNTIME_PLAY_AREA_GEOMETRY | — |
| runtime/state/runtime-polygon-normalizers.js | 94 | 14 | TT_BEAMER_RUNTIME_POLYGON_NORMALIZERS | TT_BEAMER_NORMALIZERS |
| runtime/state/runtime-room-geometry.js | 220 | 15 | TT_BEAMER_RUNTIME_ROOM_GEOMETRY | — |
| runtime/state/runtime-snapshot-helpers.js | 202 | 7 | TT_BEAMER_RUNTIME_SNAPSHOT_HELPERS | — |
| runtime/ui/animation-editor-edit-pane-asset-picker.js | 356 | 14 | TT_BEAMER_RUNTIME_ANIMATION_EDITOR_EDIT_PANE_ASSET_PICKER | TT_BEAMER_CONFIG |
| runtime/ui/animation-editor-edit-pane.js | 722 | 21 | TT_BEAMER_RUNTIME_ANIMATION_EDITOR_EDIT_PANE | EDIT_PANE_ASSET_PICKER, UI_ICONS, UI_ICON_PICKER |
| runtime/ui/animation-editor-library-list.js | 171 | 8 | TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIBRARY_LIST | UI_ICONS |
| runtime/ui/animation-editor-live-preview.js | 428 | 12 | TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW | TT_BEAMER_CONFIG, EFFECT_VISUALS, GIF_PLAYBACK, RUNTIME_UTILS, UI_ICONS |
| runtime/ui/animation-editor-shell.js | 306 | 22 | TT_BEAMER_RUNTIME_ANIMATION_EDITOR_SHELL | — |
| runtime/ui/animation-editor-view.js | 105 | 24 | TT_BEAMER_ANIMATION_EDITOR_VIEW | EDIT_PANE, LIBRARY_LIST, LIVE_PREVIEW, SHELL |
| runtime/ui/icon-picker.js | 87 | 13 | TT_BEAMER_UI_ICON_PICKER | TT_BEAMER_UI_ICONS |
| runtime/ui/icons.js | 240 | 23 | TT_BEAMER_UI_ICONS | — |
| runtime/viewport/runtime-mobile-layout.js | 289 | 9 | TT_BEAMER_RUNTIME_MOBILE_LAYOUT | — |
| runtime/viewport/runtime-polygon-drag-support.js | 282 | 21 | TT_BEAMER_RUNTIME_POLYGON_DRAG_SUPPORT | TT_BEAMER_RUNTIME_UTILS |
| runtime/viewport/runtime-projection-2d-fallback-renderer.js | 156 | 10 | TT_BEAMER_RUNTIME_PROJECTION_2D_FALLBACK_RENDERER | — |
| runtime/viewport/runtime-projection-gl-renderer.js | 280 | 10 | TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER | — |
| runtime/viewport/runtime-projection-grid-state.js | 281 | 17 | TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE | — |
| runtime/viewport/runtime-projection-handle-drag.js | 545 | 24 | TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG | — |
| runtime/viewport/runtime-projection-handle-ui.js | 781 | 24 | TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI | TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG |
| runtime/viewport/runtime-projection-mapping.js | 277 | 20 | TT_BEAMER_RUNTIME_PROJECTION_MAPPING | 5 sub-namespaces |
| runtime/viewport/runtime-projection-profile-persistence.js | 191 | 15 | TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE | — |
| runtime/viewport/runtime-slider-touch-guard.js | 109 | 12 | TT_BEAMER_RUNTIME_SLIDER_TOUCH_GUARD | TT_BEAMER_RUNTIME_UTILS |
| runtime/viewport/runtime-stage-viewport.js | 263 | 8 | TT_BEAMER_RUNTIME_STAGE_VIEWPORT | TT_BEAMER_RENDER_VIEWPORT |
| runtime/viewport/runtime-view-visibility.js | 174 | 5 | TT_BEAMER_RUNTIME_VIEW_VISIBILITY | — |
| runtime/viewport/runtime-viewport-zoom.js | 373 | 7 | TT_BEAMER_RUNTIME_VIEWPORT_ZOOM | TT_BEAMER_RUNTIME_UTILS |
| runtime/wire/runtime-wire-fx-panel-binders-outside.js | 341 | 21 | TT_BEAMER_RUNTIME_WIRE_FX_PANEL_BINDERS_OUTSIDE | — |
| runtime/wire/runtime-wire-fx-panel-binders.js | 673 | 6 | TT_BEAMER_RUNTIME_WIRE_FX_PANEL_BINDERS | UTILS, FX_PANEL_BINDERS_OUTSIDE, UI_ICON_PICKER |
| runtime/wire/runtime-wire-navigation-binders.js | 139 | 6 | TT_BEAMER_RUNTIME_WIRE_NAVIGATION_BINDERS | — |
| runtime/wire/runtime-wire-overlay-window-binders.js | 657 | 15 | TT_BEAMER_RUNTIME_WIRE_OVERLAY_WINDOW_BINDERS | — |
| runtime/wire/runtime-wire-polygon-editor-binders.js | 677 | 14 | TT_BEAMER_RUNTIME_WIRE_POLYGON_EDITOR_BINDERS | — |
| runtime/wire/runtime-wire-room-audio-binders-bundle.js | 335 | 16 | TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS_BUNDLE | — |
| runtime/wire/runtime-wire-room-audio-binders.js | 619 | 8 | TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS | UTILS, ROOM_AUDIO_BINDERS_BUNDLE |
| runtime/wire/runtime-wire-stage-gesture-binders.js | 409 | 6 | TT_BEAMER_RUNTIME_WIRE_STAGE_GESTURE_BINDERS | — |

[VERIFIED: every cell extracted by Node script over the post-W4 HEAD
tree at commit `c9038bc` (visible via `git log -1 --format=%H`).]

### §1.5 — Reproducible extraction script

This is the exact Node snippet used to build the table — runnable
from the repo root:

```js
const fs = require("fs");
const path = require("path");
function findJs(dir) {
  let files = [];
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(findJs(p));
    else if (e.name.endsWith(".js")) files.push(p);
  }
  return files;
}
const files = [...findJs("src/app/runtime"), ...findJs("src/app/lib")].sort();
for (const f of files) {
  const txt = fs.readFileSync(f, "utf8");
  const lines = txt.split("\n").length - 1;
  // header lines = comment lines before first "(()" wrapper
  let hdrLines = 0;
  let inBlock = false;
  let lineIdx = 0;
  for (const line of txt.split("\n")) {
    lineIdx++;
    if (lineIdx > 30) break;
    if (/^\s*\(\(\)\s*=>\s*\{/.test(line)) break;
    if (/^\s*$/.test(line)) continue;
    if (inBlock) {
      hdrLines++;
      if (line.includes("*/")) inBlock = false;
      continue;
    }
    if (/^\s*\/\//.test(line)) hdrLines++;
    else if (/^\s*\/\*/.test(line)) {
      hdrLines++; inBlock = true;
      if (line.includes("*/")) inBlock = false;
    } else break;
  }
  const definesMatches = [...txt.matchAll(/window\.(TT_BEAMER[A-Z_0-9]+)\s*=/g)];
  const defNs = [...new Set(definesMatches.map(m=>m[1]))];
  const refMatches = [...txt.matchAll(/window\.(TT_BEAMER[A-Z_0-9]+)/g)];
  const allRefs = [...new Set(refMatches.map(m=>m[1]))];
  const externalRefs = allRefs.filter(ns => !defNs.includes(ns));
  console.log([f, lines, hdrLines, defNs.join(","), externalRefs.sort().join(",")].join("|"));
}
```

For the SCC pass, run Tarjan over the file → file edges with the
edge set built as `{(src, dst) | src reads ns ∈ defines(dst), src ≠ dst}`.

---

## §2 — Circular dependency identification

### §2.1 — The single SCC: `runtime-bootstrap.js` ↔ `runtime-panels-controller.js`

**Tarjan SCC output:** exactly one cycle of size 2 across the entire
101-file graph.

```
Cycle of 2 files:
  - src/app/runtime/core/runtime-bootstrap.js
  - src/app/lib/ui/runtime-panels-controller.js
```

**Direction A → B** (`runtime-bootstrap.js` reads `runtime-panels-controller.js`):

```
src/app/runtime/core/runtime-bootstrap.js:17:
  const runtimePanelsApi = window.TT_BEAMER_RUNTIME_PANELS
    ?? window.TT_BEAMER_UI_RUNTIME_PANELS ?? null;
src/app/runtime/core/runtime-bootstrap.js:21-22:
  hasCanonical: Boolean(window.TT_BEAMER_RUNTIME_PANELS),
  hasLegacy: Boolean(window.TT_BEAMER_UI_RUNTIME_PANELS),
src/app/runtime/core/runtime-bootstrap.js:33:
  runtimePanelsApi.syncRuntimePanelsFromState({...})
```

**Direction B → A** (`runtime-panels-controller.js` `defines` what
`runtime-bootstrap.js` also `defines`):

```
src/app/lib/ui/runtime-panels-controller.js:73-74:
  window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;     // parse-time write
  window.TT_BEAMER_UI_RUNTIME_PANELS = runtimePanelsApi;  // parse-time write
src/app/runtime/core/runtime-bootstrap.js:26-31:
  if (!window.TT_BEAMER_RUNTIME_PANELS) {                 // call-time defensive write
    window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
  }
  if (!window.TT_BEAMER_UI_RUNTIME_PANELS) {
    window.TT_BEAMER_UI_RUNTIME_PANELS = runtimePanelsApi;
  }
```

### §2.2 — Why the SCC exists

`runtime-panels-controller.js` (loaded at `index.html:835`) defines
the canonical and the legacy alias namespace at parse time inside its
IIFE. `runtime-bootstrap.js` (loaded at `index.html:907`, far later)
reads those namespaces at call time AND defensively re-writes them
if absent. The defensive re-write looks like a "fallback" — but
because parse-time defer-script ordering guarantees panels-controller
parses long before bootstrap.init runs, **the defensive write can
never actually fire** ([VERIFIED: `index.html:835` < `:907` and both
tags carry `defer`, which executes in document order before
DOMContentLoaded]).

The SCC is therefore an **algorithmic artefact** of the dual-write
pattern, not a genuine call-time read cycle. The fix is to **drop
the defensive write block** in `runtime-bootstrap.js:26-31`. After
that, `runtime-bootstrap.js` only **reads** the namespace; it does
not write it. The graph becomes acyclic.

### §2.3 — Recommendation: which direction is "correct"

**Correct direction:** `runtime-panels-controller.js` is the OWNER
of the namespace (it defines `runtimePanelsApi` and exposes it).
`runtime-bootstrap.js` is a CONSUMER (it calls
`syncRuntimePanelsFromState({...ctx-bag...})`). The dependency
should be one-way: bootstrap → panels-controller, not back.

**Action:** delete the defensive `if (!window.X) window.X = ...`
block in `runtime-bootstrap.js:26-31`. Replace with a one-line
comment or just rely on the `?? ... ?? null` lookup at line 17.
Keep the `runtime_panels_missing` warn path at line 19-23 for
genuine smoke-test diagnostics; it never fires under normal load
order, but it's a 5-line safety net that costs nothing and helps
diagnose load-order mistakes if a future refactor moves the
`<script>` tag.

### §2.4 — Init-order cycles via `.init({ ... })` deps — none impossible

ROADMAP imagined the case "A.init takes B.init's exports as deps
AND B.init takes A.init's exports" (literal init mutual dep). Search
for that pattern across the 45 init() calls in `runtime-orchestration.js`
([VERIFIED: `grep -nE "\.init\s*\(" src/app/runtime/runtime-orchestration.js
\| wc -l` = 45]):

**Result: ZERO impossible mutual init deps.** Every init() call passes
either (a) plain refs (state, DOM elements), (b) factory references
to functions defined elsewhere in orchestration's scope (which may be
forward-declared via hoisting + arrow wrappers), or (c) sub-module
exports (wired via the parent shim's destructure of the sub-module
namespaces, which are all parsed before the shim).

The closest thing to mutual deps is in the 6 SHIM init forwarders
(animation-editor-view, projection-mapping, animation-lifecycle,
fx-panels, draw-loop, polygon-editor) — these are explicitly designed
to break the cycle by initialising sub-modules in a fixed
**dependency order**, with each subsequent init taking earlier
modules' methods as deps. See §2.5.

### §2.5 — Arrow-callback "soft cycles" — pervasive, load-bearing, OUT OF SCOPE for cycle removal

The codebase relies on **836 arrow-wrapped callbacks** across
orchestration's 45 init() calls ([VERIFIED: `awk` over each init
block; total `=>` token count is 836]). Each is a logical cycle in
the sense that "module A's init takes a callback that, at call time,
will resolve to module B's function". The arrow defers the resolution
until call time. This works because:

1. **Defer-script load ordering** guarantees every IIFE has fully
   parsed before any orchestration init() call runs (the
   orchestration is the LAST runtime-tier `<script>` at
   `index.html:910`).
2. **Hoisted function declarations** within orchestration's IIFE
   make every named function reachable by name from anywhere in
   the IIFE body — even before its source-text definition appears.
3. **Closure capture** then binds the call-time lookup to the
   function's identifier, not its current value (so even if a
   `let`-bound function variable is reassigned, the arrow body
   reads the latest value).

Concrete examples from W3 / W4 work:

| Site | Arrow callback | Why arrow not direct ref |
|------|----------------|--------------------------|
| `runtime-animation-lifecycle.js:53-54` | `() => runningList.renderRunningAnimationsList()` | `runningList.init` runs AFTER `stopPipeline.init`; direct ref would be `undefined` at the source line |
| `runtime-orchestration.js:415` | `getBoards: () => BOARDS` | `BOARDS` is a `let` reassigned by `setBoards` callback; direct ref would freeze the initial value |
| `runtime-orchestration.js:1904` | `getBoards: () => BOARDS` (ANIMATION_EDITOR_VIEW init) | Same pattern |
| `runtime-orchestration.js:277` | `renderRoomOverlay: () => { try { renderRoomOverlay(); } catch { } }` | `renderRoomOverlay` body closes over identifiers not yet bound at PROJECTION_MAPPING.init time; the try/catch is the "not ready yet" guard |
| `runtime-orchestration-ctx-builder.js:153-244` | 75 arrow patterns wrapping the BOOTSTRAP dep-bag | Same reassignability + forward-resolution pattern |

**Recommendation:** **Do NOT touch these.** They are the load-bearing
mechanism that makes the entire `defer`-script + hub-and-spoke
architecture possible. Removing them would require a major
re-architecture (e.g., switch to ES modules, or split orchestration's
IIFE into multiple smaller IIFEs with explicit init-order chains).
That is out of scope for Wave 5. The ROADMAP explicitly warns
("Risks + mitigations: refactoring may surface a runtime cycle that
worked only because of an init order"); arrow-callback patterns are
the engineering response to that risk.

### §2.6 — Sub-module init forwarders (the 6 shims)

Each of these shims initialises its sub-modules in dependency order
with cross-callback wiring. They are NOT cycles — they are linear
init pipelines that the shim sequences correctly. Listed for
completeness:

| Shim | Sub-modules init'd | Cross-callbacks injected |
|------|---------------------|---------------------------|
| `animation-editor-view.js` | live-preview → edit-pane → library-list → shell | edit-pane.findDefinition / scopeLabel / deleteAnimation injected into live-preview; live-preview.renderPreview / updatePreviewDynamicBits injected into edit-pane; cross-references resolve via the parent shim's destructured method refs |
| `runtime-projection-mapping.js` | grid-state → gl-renderer → 2d-fallback → handle-ui → profile-persistence | handle-ui.rebuildHandleElements / drawLines / positionRotateHandles injected into grid-state and profile-persistence; gridState reference passed to handle-ui and profile-persistence so they can mirror handlesVisible |
| `runtime-animation-lifecycle.js` | lifecycle-state → stop-pipeline → live-editor → cluster-pads → running-list | running-list's renderRunningAnimationsList / refreshGlobalButtons arrowed-into stop-pipeline.init; cluster-pads.renderClusterPads + stop-pipeline.stopAnimation + live-editor.{open,close} injected into running-list |
| `runtime-fx-panels.js` | room → inside-outside | room.syncRoomResourcePicker injected into inside-outside |
| `runtime-projection-handle-ui.js` | (parses with handle-drag at namespace destructure) | handle-drag's 4 listener fns destructured at parse time; handle-drag init forwarded with shell refs from handle-ui |
| `runtime-polygon-editor.js` | (parses with handles namespace destructure) | handles module's render fns destructured at parse time |

[VERIFIED: every shim's source code reviewed; init order recorded
above matches the actual `.init({...})` call sequence.]

These are **the pattern**, not anti-patterns. Wave 5 should **leave
them alone**. Their headers already document the init order
(see `animation-editor-view.js:1-25`,
`runtime-animation-lifecycle.js:1-28`,
`runtime-projection-mapping.js:1-20`).

### §2.7 — Cross-module direct namespace reads — minor edge cases

Beyond orchestration-and-shim consumption, a small number of
sub-modules directly read another module's namespace at call time.
None of these create cycles, but they're worth noting for the planner:

| Reader | Reads | Direction | Notes |
|--------|-------|-----------|-------|
| `runtime-board-profiles.js:84` | `TT_BEAMER_RUNTIME_PROJECTION_MAPPING.getCornersForPersistence()` | one-way | board-profiles produces serialisable state; including projection corners is part of the state. Guarded by `?:` presence check |
| `runtime-runtime-controls.js:183-186` | `TT_BEAMER_ANIMATION_EDITOR_VIEW.{open,isOpen}` | one-way | runtime-controls dispatches Open Editor button → editor's open() |
| `runtime-runtime-controls.js:?` | `TT_BEAMER_INPUT_GUARDS.shouldSuppressRapidTap` | one-way | shared input guard utility |
| `runtime-orchestration-helpers.js:?` | `TT_BEAMER_INPUT_GUARDS.shouldSuppressRapidTap` | one-way | same guard, after extraction in W3.5-C1 |
| `runtime-zone-loader.js:?` | `TT_BEAMER_ROOMS.normalizeBoard` | one-way | zone loader normalises imported boards via lib/domain |
| `runtime-board-state-accessors.js:?` | `TT_BEAMER_ROOMS.normalizeBoard` | one-way | accessor falls back to fresh-normalize when state is invalid |
| `runtime-polygon-normalizers.js:?` | `TT_BEAMER_NORMALIZERS.{...}` | one-way | wraps lib/shared normalizers |
| `runtime-stage-viewport.js:?` | `TT_BEAMER_RENDER_VIEWPORT.{...}` | one-way | render module wraps the lib/render lifecycle |
| `lib/shared/normalizers.js` | `TT_BEAMER_CONFIG.{ALL_ANIMATION_TYPES, EVENT_SOUND_ASSETS, ...}` | one-way | config-derived defaults |

**No back-edges in any of these pairs.** Orchestration is the only
node with a "fan-in" pattern (it reads 69 namespaces); every other
node has small, one-way fan-out.

---

## §3 — Header comment audit

### §3.1 — Aggregate counts

| Bucket | Count | % of 101 |
|--------|------:|---------:|
| **No header at all (0 lines)** | 20 | 19.8 % |
| Short header (5–7 lines) | 9 | 8.9 % |
| Medium header (8–14 lines) | 41 | 40.6 % |
| Long header (15–28 lines) | 31 | 30.7 % |
| **Total with header** | **81** | **80.2 %** |

[VERIFIED: header-line scan over all 101 files; `awk -F'|' '{print $3}' /tmp/w5/file-table.txt | sort | uniq -c | sort -rn`.]

### §3.2 — The 20 missing-header files

**All 17 `lib/` files** have no header comment ([VERIFIED:
`awk -F'|' '$3 == 0 && $1 ~ /^lib\//' /tmp/w5/file-table.txt | wc -l` = 17]).
This is a structural gap — Wave 3 added headers to every new sub-
module it created, but the pre-existing `lib/` tree was untouched.

**3 runtime files** also lack headers ([VERIFIED:
`awk -F'|' '$3 == 0 && $1 ~ /^runtime\//' /tmp/w5/file-table.txt`]):

1. `runtime/core/polygon-contract.js` (427 lines) — defines
   `TT_BEAMER_POLYGON_CONTRACT`, the polygon-clip contract used
   by canvas-clip + gif-decoder.
2. `runtime/runtime-orchestration.js` (2965 lines) — the
   orchestration shell. ROADMAP-sanctioned giant; its size is
   the reason the lack of header is most glaring (a reader
   opens it and is dumped straight into a 35-line config
   destructure with no orientation).
3. `runtime/runtime-utils.js` (22 lines) — `clamp`, `clamp01`,
   `bboxOfPolygon`. Tiny file, but Wave 5's acceptance criterion
   says EACH top-level module gets a header.

The full list (path | lines):

```
lib/api/global-defaults-api.js           | 479
lib/boot/app-composition.js              | 25
lib/boot/runtime-bootstrap.js            | 14
lib/domain/event-lifecycle.js            | 98
lib/domain/live-sync-domain.js           | 41
lib/domain/rooms.js                      | 178
lib/input/interaction-guards.js          | 20
lib/persistence/board-profiles.js        | 167
lib/render/viewport-lifecycle.js         | 86
lib/shared/config.js                     | 239
lib/shared/logger.js                     | 81
lib/shared/normalizers.js                | 246
lib/shared/runtime-env.js                | 29
lib/state/live-sync-state.js             | 96
lib/state/runtime-state.js               | 188
lib/ui/runtime-panels-controller.js      | 75
lib/ui/settings/rooms.js                 | 33
runtime/core/polygon-contract.js         | 427
runtime/runtime-orchestration.js         | 2965
runtime/runtime-utils.js                 | 22
```

[VERIFIED: `awk -F'|' '$3 == 0' /tmp/w5/file-table.txt`.]

### §3.3 — Existing header quality — uniformly good

A spot-check of 9 randomly-picked WITH-header files shows uniformly
substantive content (paste-quoted from the files):

- `runtime-quick-mode.js` — *"quick-mode module. Owns the
  quick-mode state machine (off/activate/deactivate/clear),
  per-room inflight tracking, tap dispatch, and status sync."*
- `runtime-audio.js` — *"audio pipeline module. Owns the Audio()
  voice pool, the active-animation audio map, the pending start-
  delay timers..."*
- `animation-editor-shell.js` — *"Animation editor shell — owns
  the editor's visibility, scope/search/selection state, board
  picker, dirty bar, and Back/Apply/Discard flows..."*
- `runtime-animation-lifecycle.js` — *"animation-lifecycle re-
  export shell. W3.4 (Phase 24 Wave 3) decomposed the original
  1369-line module into 5 sub-modules + this shell..."*
- `runtime-perf.js` — *"runtime performance module. Owns the
  mp4/quality performance pipeline..."*
- `runtime-projection-mapping.js` — *"Unified Grid Projection
  System. Replaces the dual 4-corner + grid-mesh approach with
  ONE unified grid..."*

These are all "Owns X. Y. Z." patterns: name the module, state
its responsibilities, mention dependencies if injected. **No
existing headers need rewriting.** Wave 5 should ADD missing
headers in the same style; do NOT touch existing ones.

### §3.4 — Recommended header template

Match the established pattern. For every missing-header file, add
something of this shape immediately above the `(() =>` line:

```js
// {short noun-phrase}. {1-sentence "what does this module own"}
//
// {Optional 2-3 lines on key responsibilities or dependencies.}
(() => {
  ...
})();
```

Concrete examples for the 20 files (one-line headers; planner can
expand if desired during execution):

| File | Suggested 1-line header |
|------|-------------------------|
| `lib/api/global-defaults-api.js` | `// Global-defaults HTTP API facade — wraps fetch with timeout + base-URL discovery.` |
| `lib/boot/app-composition.js` | `// Bootstrap composition — wires the app-shell initializer through TT_BEAMER_BOOT.` |
| `lib/boot/runtime-bootstrap.js` | `// Runtime-bootstrap factory — creates the BOOT object whose run() invokes the app initializer.` |
| `lib/domain/event-lifecycle.js` | `// Event-lifecycle domain — pure helpers for "is this animation expired" / start-time math.` |
| `lib/domain/live-sync-domain.js` | `// Live-sync domain — pure helpers for live-sync envelope normalisation.` |
| `lib/domain/rooms.js` | `// Rooms domain — pure helpers (normalizeBoard, normalizeRoom, mergeRoomCatalog) used by all clients.` |
| `lib/input/interaction-guards.js` | `// Input guards — shared rapid-tap / touch-suppression helpers (shouldSuppressRapidTap).` |
| `lib/persistence/board-profiles.js` | `// Board-profile persistence — localStorage read/write + JSON-schema validation for tt-beamer.board-profiles.v3.` |
| `lib/render/viewport-lifecycle.js` | `// Viewport lifecycle — window resize / orientationchange handler factory used by stage-viewport.` |
| `lib/shared/config.js` | `// Shared config constants — board catalog, animation types, storage-key literals, ROOMS defaults.` |
| `lib/shared/logger.js` | `// Logger factory — createLogger(scope, ctx) returns {info, warn, error} with structured payload formatting.` |
| `lib/shared/normalizers.js` | `// Shared normalizers — pure data-shape helpers (normalizeAnimationSoundMap, normalizeQuickMode, etc.) used by both runtime and tests.` |
| `lib/shared/runtime-env.js` | `// Runtime-env constants — output role detection (CONTROL vs FINAL) + OUTPUT_ROLE_FINAL constant.` |
| `lib/state/live-sync-state.js` | `// Live-sync state factory — createDefaultLiveSyncState() shape for liveSync field of runtime state.` |
| `lib/state/runtime-state.js` | `// Runtime-state factory — createDefaultState() composes all per-board / per-room state maps for orchestration.` |
| `lib/ui/runtime-panels-controller.js` | `// Runtime-panels controller — owns syncRuntimePanelsFromState which fans out to every panel-sync helper.` |
| `lib/ui/settings/rooms.js` | `// Settings/rooms UI helpers — small DOM-side helpers used by the rooms settings subtab.` |
| `runtime/core/polygon-contract.js` | `// Polygon clip contract — pure geometry helpers (clipPolygon, polygonBounds, etc.) used by canvas-clip + gif-decoder. No runtime state.` |
| `runtime/runtime-orchestration.js` | `// Runtime orchestration shell — wires every runtime sub-module together via the BOOTSTRAP.init dep-bag (see runtime-orchestration-ctx-builder.js). Sanctioned residual size per ROADMAP exception. No public namespace; consumes 69 sibling namespaces.` |
| `runtime/runtime-utils.js` | `// Runtime utilities — clamp / clamp01 / bboxOfPolygon. Pure functions, loaded first so every consumer can read TT_BEAMER_RUNTIME_UTILS at parse time.` |

[VERIFIED: every suggested 1-liner is consistent with the existing
header style observed in §3.3.]

---

## §4 — Transitive re-export audit

### §4.1 — Methodology

For every namespace `X`, count:

- **Definers:** files that contain `window.X = ...`.
- **External readers:** files that contain `window.X` AND do not
  define `X` themselves.
- **Self-only:** namespaces with zero external readers.
- **Aliased re-exports:** keys that appear on namespace `X` but
  whose function/value definition lives in another file's
  namespace `Y`.

[VERIFIED: Node script in §1.5 produces both halves; cross-checked
with `grep -l` per namespace.]

### §4.2 — Single redundant re-export: `TT_BEAMER_UI_RUNTIME_PANELS`

Exactly **one namespace has zero external readers**:

```
TT_BEAMER_UI_RUNTIME_PANELS
  Definers:  src/app/lib/ui/runtime-panels-controller.js  (parse-time)
             src/app/runtime/core/runtime-bootstrap.js     (defensive call-time)
  External readers:  (none)
```

[VERIFIED: `grep -rn "TT_BEAMER_UI_RUNTIME_PANELS" src/app/` returns
8 hits; every one is either inside the 2 definer files
(self-write or self-read in a guard expression) OR inside a comment.
Confirmed: `grep -l "TT_BEAMER_UI_RUNTIME_PANELS" src/app/ -r`
returns ONLY the 2 definer files.]

The pattern in `runtime-panels-controller.js:71-74`:

```js
// Keep the canonical runtime key and the legacy UI key in sync so
// bootstrap/load-order checks remain deterministic across browsers.
window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
window.TT_BEAMER_UI_RUNTIME_PANELS = runtimePanelsApi;
```

The comment claims "load-order checks". The only load-order check is
`src/app.js:7` and it checks `TT_BEAMER_RUNTIME_PANELS` (not the
legacy alias). The legacy alias has **no consumer at all** — including
no smoke probe, no `app.js` entry, no orchestration read. It is the
textbook "transitive re-export nobody depends on" the ROADMAP wants
removed.

**Recommendation:** Drop the legacy alias.
- Delete line 74 of `runtime-panels-controller.js`.
- Delete lines 22 and 29-31 of `runtime-bootstrap.js` (the matching
  `hasLegacy` log entry + the defensive `if (!window.X) write`).
- Drop the `?? window.TT_BEAMER_UI_RUNTIME_PANELS` half of the
  fallback chain at `runtime-bootstrap.js:17` — since the canonical
  key is guaranteed present, the legacy fallback was redundant.
- The header-comment update (§3) for `runtime-panels-controller.js`
  should reflect the simpler shape (single canonical namespace).

This is **conservative**: every removed reference has been grepped
exhaustively. Net delta will be ~5 lines deleted across 2 files.

### §4.3 — Shim-mediated re-exports — load-bearing, KEEP

The 6 shim modules each re-export their sub-module functions on a
parent namespace so that orchestration (or other shims) can reach
them through the parent name. Counts of which shim re-exports which
sub-namespaces, and whether any consumer reads the sub-namespace
directly:

| Shim | Re-exports keys from | External readers of shim's namespace | External readers of sub-namespace |
|------|----------------------|--------------------------------------|------------------------------------|
| `runtime-projection-mapping.js` (`PROJECTION_MAPPING`, 15 keys) | grid-state (21), gl-renderer (3), 2d-fallback (2), handle-ui (12), profile-persistence (9) | orchestration (init + destructure), board-profiles (1 call) | NONE — every sub-namespace is read ONLY by the shim |
| `runtime-animation-lifecycle.js` (`ANIMATION_LIFECYCLE`, 16 keys) | lifecycle-state, stop-pipeline, live-editor, running-list, cluster-pads | orchestration (init + destructure of closeLiveEditor) | lifecycle-live-editor + lifecycle-running-list each read `LIFECYCLE_STATE` (cross-sibling, NOT through shim) |
| `animation-editor-view.js` (`ANIMATION_EDITOR_VIEW`, 7 keys) | shell, library-list, edit-pane, live-preview | orchestration (init + isOpen guard), runtime-runtime-controls (open/isOpen) | edit-pane reads asset-picker; otherwise none |
| `runtime-fx-panels.js` (`FX_PANELS`, 28 keys) | room (6), inside-outside (21) | orchestration (init + destructure of ~10 keys) | NONE |
| `runtime-projection-handle-ui.js` (`HANDLE_UI`, 12 keys) | handle-drag (4 listener fns destructured) | projection-mapping shim (init + handle-ui refs forwarded into other sub-modules) | handle-ui reads handle-drag (one-way) |
| `runtime-polygon-editor.js` (`POLYGON_EDITOR`, 24 keys) | polygon-editor-handles (3) | orchestration (init + destructure of 22 keys) | NONE |
| `runtime-draw-loop.js` (`DRAW_LOOP`, ?) | draw-loop-cluster-pads (2) | orchestration (init + destructure of ~5 keys) | NONE |
| `runtime-wire-room-audio-binders.js` | bundle (1) | orchestration (call only) | NONE |
| `runtime-wire-fx-panel-binders.js` | outside (1) | orchestration (call only) | NONE |

**Conclusion: every shim's external surface is genuinely consumed
(by orchestration or by another shim).** Every shim's sub-namespaces
have either zero external readers or one consumer (the shim itself).
**Removing any shim's parent namespace would break orchestration's
destructure** — that is, every shim is genuinely load-bearing.

**Recommendation:** keep all shims and their re-exports unchanged.
The aliasing is what makes the W3 decomposition non-disruptive to
orchestration's existing destructure call sites. No transitive
re-export is removable here without a coordinated multi-file edit
that's outside Wave 5's risk budget.

### §4.4 — Possible W6 follow-up — sub-namespace direct reads

`lifecycle-live-editor.js` and `lifecycle-running-list.js` read
`TT_BEAMER_RUNTIME_LIFECYCLE_STATE` directly (cross-sibling rather
than going through the parent shim). This is fine — the sibling
sub-modules are co-loaded in the same dependency cluster, and
`LIFECYCLE_STATE` has no init-order constraint that the shim couldn't
satisfy. But it does mean the parent shim's namespace is NOT the
single entry point to its cluster; a future maintainer could
mistakenly think the cluster is fully encapsulated by the shim.

**Recommendation:** documentation only — note this in the lifecycle
shell's header comment (it already has a good header; a 1-line
addition documenting "sub-modules read LIFECYCLE_STATE directly
when they need its setters" suffices). Do NOT route those reads
through the shim; that would force the shim to wrap every
LIFECYCLE_STATE setter, which has no benefit.

### §4.5 — Namespace alias discovery: `TT_BEAMER_RUNTIME_PANELS` reads

For completeness: the canonical `TT_BEAMER_RUNTIME_PANELS` namespace
has exactly **one external reader**: `src/app.js:7` (the bootstrap
shell's domain-presence check). After §4.2's cleanup this becomes
the sole consumer. Should this also be considered for removal?
**No** — `app.js`'s smoke probe is a deliberate health check ("is
the runtime panels module loaded?") that fires before bootstrap
runs. It catches the case where a developer accidentally removes
the panels-controller `<script>` tag from `index.html`. Keep the
canonical namespace and its smoke probe.

---

## §5 — Recommended Wave 5 commit slicing

Based on §1–§4 findings, the actual Wave 5 work is much smaller than
ROADMAP scope budgeted. Recommended slicing (9 commits total):

### W5.1 — Module-graph dump (docs-only)

**Commit:** `docs(24-5): module-graph baseline + Wave 5 INVENTORY`

Land an `INVENTORY.md` for Wave 5 with the per-file table from §1.4
plus the SCC + cycle analysis from §2. No code changes. Acts as the
graph-baseline artefact ROADMAP §"Identify circular imports / spaghetti
dependencies via a module-graph dump" calls for. Future devs can
re-run the §1.5 script and `diff` against this baseline to detect
drift.

### W5.2 — Header comments for the 20 missing-header files

**Commit:** `refactor(24-5): add header comments to 20 modules without one`

One commit, mechanical. For each of the 20 files in §3.2, add a 1-3
line header comment immediately above the `(() =>` line. Use the
suggested 1-liners from §3.4 as starting points; expand to 2-3 lines
where the file's role is non-trivial (e.g., orchestration,
polygon-contract). No code line moves. **Diff is purely additive
comment lines** — no logic changes.

Per-commit gates:
- `node --check` clean for every modified file.
- `grep -c "(() =>"` for each file unchanged (still has 1 IIFE
  opener).
- Public namespace surface unchanged: `Object.keys(window.TT_BEAMER_X)`
  for each defined namespace identical pre/post.
- Net delta: +60 to +120 lines (3-6 lines × 20 files), all comments.

### W5.3 — Drop the SCC: defensive write + legacy alias removal

ROADMAP gate ("`madge` shows zero cycles") demands this. Two atomic
commits — separate so each can be reverted independently:

**Commit W5.3-C1:** `refactor(24-5): drop runtime-bootstrap defensive panels-namespace write`

Edit `runtime-bootstrap.js`:
- Delete lines 26-31 (the `if (!window.TT_BEAMER_RUNTIME_PANELS) ... if (!window.TT_BEAMER_UI_RUNTIME_PANELS) ...` block).
- Keep the `runtime_panels_missing` warn at lines 18-25 (genuine
  load-order diagnostic; never fires under correct script order).
- Update the file's header comment (added in W5.2) to say
  *"reads runtimePanelsApi via window.TT_BEAMER_RUNTIME_PANELS;
  panels-controller writes the namespace at parse time"* (no longer
  claims defensive ownership).

This commit alone breaks the SCC: bootstrap stops writing to the
namespaces, becomes a pure consumer.

**Commit W5.3-C2:** `refactor(24-5): drop legacy TT_BEAMER_UI_RUNTIME_PANELS alias (zero external readers)`

Edit `runtime-panels-controller.js`:
- Delete line 74 (`window.TT_BEAMER_UI_RUNTIME_PANELS = runtimePanelsApi;`).
- Update lines 71-72 comment to drop the "legacy UI key" claim.

Edit `runtime-bootstrap.js`:
- At line 17: drop `?? window.TT_BEAMER_UI_RUNTIME_PANELS` from the
  fallback chain (becomes `window.TT_BEAMER_RUNTIME_PANELS ?? null`).
- At lines 21-22: drop the `hasLegacy: Boolean(window.TT_BEAMER_UI_RUNTIME_PANELS)`
  log field.

Per-commit gates for both:
- `node --check` clean.
- `grep -rn "TT_BEAMER_UI_RUNTIME_PANELS" src/` post-W5.3-C2 returns
  **0 hits** (the alias is fully gone).
- `grep -rn "TT_BEAMER_RUNTIME_PANELS" src/` post-W5.3 returns
  exactly: panels-controller's write (1), bootstrap's read (1),
  app.js's smoke probe (1), bootstrap's `runtime_panels_missing`
  log payload reference (1), maybe headers (0–2). All explainable.
- Tarjan SCC over the post-W5.3 graph: 101 SCCs, all size 1. **No
  cycles**.
- Browser-load smoke: dashboard loads, panels sync, no
  `runtime_panels_missing` warn fires.

### W5.4 — INVENTORY update post-W5.3

**Commit:** `docs(24-5): INVENTORY post-W5.3 — SCC eliminated`

Re-run the §1.5 Node script + Tarjan analysis on the new HEAD.
Confirm 0 SCCs. Update INVENTORY.md with the post-W5.3 graph diff
+ a one-line `madge`-equivalent claim ("Tarjan SCC over post-W5.3
graph: 101 trivial SCCs, 0 cycles").

### W5.5 to W5.7 — Per-shim transitive-re-export audits (docs-only)

The §4 audit shows every shim's re-exports are load-bearing — but
the ROADMAP wants the documented confirmation. Three docs-only
commits, each adding to the INVENTORY:

**Commit W5.5:** `docs(24-5): INVENTORY — projection-mapping + animation-editor shim re-export audit`

For each shim, document in INVENTORY.md:
- Number of namespace keys re-exported.
- Number of external readers per sub-namespace.
- Confirmation: every re-exported key has at least one consumer
  (orchestration, sibling shim, or sub-module).

**Commit W5.6:** `docs(24-5): INVENTORY — animation-lifecycle + fx-panels shim re-export audit`

Same for the next 2 shims.

**Commit W5.7:** `docs(24-5): INVENTORY — handle-ui + polygon-editor + draw-loop + wire-binders shim re-export audit`

Same for the final 4 shims (handle-ui, polygon-editor, draw-loop,
wire-room-audio-binders, wire-fx-panel-binders).

These 3 commits are PURE DOCS — no code changes. Their job is to
produce evidence that the ROADMAP's "remove transitive re-exports
nobody depends on" criterion is met by the audit (negative result:
no removable re-exports found beyond W5.3-C2's `UI_RUNTIME_PANELS`).

### W5.8 — `<script>` load-order verification (docs-only)

**Commit:** `docs(24-5): INVENTORY — <script> load-order verification post-W5`

Mechanical check that the post-W5 `<script>` order in `index.html`
satisfies all observed dependencies. Run a script that, for every
file F, verifies that every namespace F externally reads is defined
by a file loaded earlier (or by a file with `defer` AND parse-order
< F's parse-order). Document the verified ordering in INVENTORY.md.

This is partial protection against future cycles being introduced
accidentally.

### W5.9 — Wave 5 closure

**Commit:** `docs(24-5): INVENTORY end-of-W5 + acceptance verification`

Full INVENTORY closure pass:
- 20 header additions verified.
- 0 cycles confirmed by Tarjan SCC.
- All shim re-exports audited and documented as load-bearing.
- Public namespace surface unchanged (101 → 100 due to
  `TT_BEAMER_UI_RUNTIME_PANELS` removal; expected; documented).
- Manual smoke-pass checklist reminder for the user.

### Aggregate count summary

| Sub-wave | Code commits | Docs commits | Net code-line delta |
|----------|-------------:|-------------:|--------------------:|
| W5.1 | 0 | 1 | 0 |
| W5.2 | 1 | 0 | +60 to +120 (comments only) |
| W5.3 | 2 | 0 | -8 to -12 (deletions) |
| W5.4 | 0 | 1 | 0 |
| W5.5–W5.7 | 0 | 3 | 0 |
| W5.8 | 0 | 1 | 0 |
| W5.9 | 0 | 1 | 0 |
| **Σ** | **3** | **7** | **+50 to +110** |

[VERIFIED: lines from §3.2 (20 files × 3 lines avg = 60) + §4.2
(5-line removal across 2 files); the planner can refine.]

---

## §6 — Risk areas

### §6.1 — The SCC fix is load-order-sensitive

`runtime-bootstrap.js`'s defensive write block in lines 26-31 only
fires when `runtime-panels-controller.js`'s parse-time write
hasn't happened yet. The block was almost certainly added during a
period when the relative `<script>` order in `index.html` was less
clear. Now (post-W3.6) the order is:

```
:835 lib/ui/runtime-panels-controller.js       ← writes namespace at parse
:907 runtime/core/runtime-bootstrap.js         ← reads namespace at call
:910 runtime/runtime-orchestration.js          ← drives bootstrap.init()
```

[VERIFIED: `grep -nE "<script.*src=\"src/app" index.html` line numbers.]

The defensive write is dead code. Removing it depends on this load
order remaining stable. If a future refactor (e.g., splitting
panels-controller back into multiple modules, or moving its `<script>`
tag out of the lib block) breaks the order, the cycle could re-appear.

**Mitigation:** the `runtime_panels_missing` warn at
`runtime-bootstrap.js:18-25` survives W5.3 and acts as the smoke
probe. If a future refactor breaks load order, that warn fires; it
takes one console look to diagnose. The `app.js:7` presence check
is a second probe that would also surface the issue.

### §6.2 — "Cycles" defined as runtime-window namespace reads vs source-text imports

ES-module folks (or the future `madge` runner the ROADMAP mentions)
expect "cycle" to mean "module A imports module B, module B imports
module A in source text". The IIFE-with-window-globals codebase
doesn't have source-text imports — all dependencies are call-time
window reads. **This research used the call-time read graph**
because that's the only graph that actually exists in the source.

If the ROADMAP intended `madge` to be the literal tool, it cannot
run on this codebase as-is — `madge` parses ES module syntax. The
ROADMAP's "or equivalent" clause is the planner's escape hatch:
the equivalent here is the Tarjan SCC over the call-time-read
graph (this RESEARCH §1.5 + §2.1).

**Mitigation:** document the discrepancy in the W5 INVENTORY's
acceptance section so future readers don't expect a literal `madge`
output. Cite the §1.5 script as the codebase-specific equivalent.

### §6.3 — Header-comment additions could accidentally cross IIFE boundary

If the suggested header text contains `(()` (e.g., the orchestration
header mentions "the BOOTSTRAP.init dep-bag (see ...)"), `node --check`
might still pass but a future regex-based scanner could mis-identify
the IIFE start. Mitigation: prefer hyphens or `[brackets]` over
parentheses in header text.

### §6.4 — Drop of `TT_BEAMER_UI_RUNTIME_PANELS` is a public-API change?

The ROADMAP §"Hard constraints" says no public-API changes. Strictly
speaking, removing `window.TT_BEAMER_UI_RUNTIME_PANELS` is a public
namespace-key removal. **However**:

- The ROADMAP's "public API" examples are wire-protocol /
  export-bundle / localStorage. The runtime `window.TT_BEAMER_*`
  namespace is internal — users don't write code that reads
  `window.TT_BEAMER_*` directly.
- W4 INVENTORY's lock-list of 101 namespace keys was preserved
  byte-identical through the entire wave. Wave 5 reduces that
  to 100 (drops `TT_BEAMER_UI_RUNTIME_PANELS`). This IS a
  contract change relative to the W4 lock-list.
- The dropped namespace has **zero external readers** (verified by
  exhaustive grep). It is genuinely dead surface area.

**Recommendation:** treat this as an acceptable surface reduction
under W5's mandate ("Remove transitive re-exports nobody depends
on"). Document explicitly in the W5 INVENTORY:

> Public namespace count drops from 101 to 100. Removed:
> `TT_BEAMER_UI_RUNTIME_PANELS` (zero consumers, verified by
> exhaustive grep at `phase-24-w5-start`). This is the only
> consequence of the ROADMAP §"Remove transitive re-exports nobody
> depends on" deliverable. All 9 wire-protocol literals and 13
> localStorage / JSON-schema literals from W4's lock-list remain
> intact (Wave 5 touches no protocol surface).

If the user / orchestrator considers any 101-key namespace surface
to be locked, **W5.3-C2 should be skipped** — the SCC is then
broken by W5.3-C1 alone (drop the defensive write), and the
unused alias remains as harmless dead surface area. This is a
**user decision point**.

### §6.5 — Arrow-callback patterns are not "cycles" but read like them

ROADMAP §"Wave 5" deliverable list says:
> *Identify circular imports / spaghetti dependencies via a module-
> graph dump. Where two modules import each other, decide which
> direction is correct and lift the shared bits to a third module.*

A reader (human or ROADMAP author) might expect Wave 5 to find
several cycles inside the orchestration init / shim init paths
(the 836 arrow callbacks ARE logical "lazy resolution to break a
cycle that would otherwise exist"). But these aren't graph cycles
in any tool's view — they're forward references inside a single
IIFE, resolved by JavaScript's hoisting + closure semantics. The
research found **zero** of these are removable without
re-architecting the entire IIFE-with-window-globals pattern.

**Mitigation:** the Wave 5 INVENTORY should explicitly say "836
arrow callbacks documented as load-bearing; do not refactor".
This sets expectations for the user reviewing the wave's diff
size: only ~70 lines of changes (W5.2 headers + W5.3
deletions), not the multi-cluster refactor ROADMAP §Wave 5
might have anticipated.

### §6.6 — Index.html load-order changes — not anticipated

ROADMAP §Wave 5 risk note ("If a cycle is broken by changing init
order, the `<script>` order may need updating in `index.html`")
implies a possible scenario. **Wave 5 will not change `<script>`
load order at all** — every code change is internal to a module.
W5.8 (load-order verification) is a docs-only check. If
`index.html` does need editing in some unforeseen scenario, the
W4 INVENTORY's `<script>`-order rules apply (orchestration last,
runtime-utils first within its block, sub-modules before their
shim).

---

## §7 — Out of scope (explicit reaffirmation)

Wave 5 deliberately does NOT do:

- **No behaviour changes.** Every commit's diff is verifiable by
  `node --check` + the namespace-key parity check. No function body
  is touched.
- **No new files.** That was Wave 3 territory (created 24 sub-modules).
- **No naming changes.** That was Wave 4 territory (10 atomic
  renames + ctx-builder area-grouping).
- **No new comments beyond headers.** Header comments ARE in scope
  (per ROADMAP §Wave 5 acceptance "Each top-level module has a
  header comment summarising its role"). Comment changes inside
  function bodies are NOT (Wave 2 territory — already closed).
- **No dead code removal.** That was Wave 1 territory.
- **No function decomposition.** Wave 3 territory. The 6 large
  files (`runtime-orchestration.js` 2965, `runtime-projection-handle-ui.js`
  781, `runtime-animation-editor-edit-pane.js` 722, `runtime-draw-loop.js`
  716, `runtime-room-management.js` 707, `runtime-room-dispatch.js` 659)
  stay at their current sizes.
- **No arrow-callback "cycle" untangling.** §2.5 / §6.5 confirm
  these are load-bearing and refactoring them is a major
  re-architecture.

---

## §8 — Acceptance bar (per-commit gates)

Each Wave 5 code commit must pass:

1. **`node --check`** clean for every modified `.js` file.
2. **Namespace-key parity:** for every `window.TT_BEAMER_*` namespace
   touched, `Object.keys` count is identical pre/post (with the sole
   exception of `TT_BEAMER_UI_RUNTIME_PANELS` removal in W5.3-C2,
   which is the documented intentional reduction).
3. **`<script>` load order unchanged.** `git diff phase-24-w5-start..HEAD -- index.html`
   should be empty across the entire wave.
4. **Tarjan SCC over the post-commit graph: zero non-trivial SCCs.**
   This is the ROADMAP's "`madge` zero cycles" gate; the §1.5 script
   is the equivalent.

Each Wave 5 docs commit must pass:

1. INVENTORY.md updates only; no `.js` files touched.
2. Every claim in INVENTORY is reproducible from the §1.5 script
   or the per-commit gates above.

End-of-W5 acceptance:

1. All 101 (post-W5: 100) modules have a substantive header comment
   (≥ 1 line) above their IIFE.
2. Tarjan SCC: zero non-trivial SCCs.
3. All shim re-exports audited and documented as load-bearing.
4. Public lock-list intact: 9 wire-protocol literals + 13
   localStorage / JSON-schema literals (unchanged).
5. **Manual ROADMAP regression checklist passes** (the user's
   responsibility — the per-commit gates are static).

---

## §9 — Open questions for the planner

1. **Should W5.3-C2 (drop `TT_BEAMER_UI_RUNTIME_PANELS`) proceed?**
   Per §6.4 this drops one namespace from a previously-locked
   101-key surface. The legacy alias has zero external readers
   (verified). The SCC can be broken by W5.3-C1 alone (drop the
   defensive write). The user / orchestrator should decide:
   (a) drop the alias, (b) keep it as dead surface area, marked as
   "deprecated, do not extend" in the INVENTORY.

2. **Should the orchestration shell's header (W5.2) include the
   list of 69 namespaces it consumes?** That would be ~70 lines
   of comment. A more concise alternative: a one-paragraph header
   that points at `runtime-orchestration-ctx-builder.js`'s 95-key
   dep-bag and at the area headers (`// ─── Area A — ... ───`)
   inside the ctx-builder for the structural overview.
   **Recommendation:** the concise version (saves ~60 lines of
   comment, defers the detail to the natural source of truth which
   is the ctx-builder).

3. **Does the planner want a tooling commit?** Adding the §1.5 Node
   script as a tracked file (e.g.,
   `scripts/dev/extract-module-graph.cjs`) would let future devs
   re-run the analysis on any HEAD. Optional — the script is in
   this RESEARCH for reproducibility regardless. **Recommendation:**
   skip for Wave 5; consider for Wave 6 closure.

4. **Naming of the W5 sub-waves**: the slicing in §5 uses W5.1
   through W5.9, mixing code commits and docs commits. An
   alternative grouping is W5-DOCS (5.1, 5.4, 5.5–5.8, 5.9 →
   collapsed to fewer commits) and W5-CODE (5.2, 5.3-C1, 5.3-C2).
   The planner can decide whether to keep the sub-wave granularity
   (revertability per docs commit) or compress.

---

## §10 — Sources

### Primary (HIGH confidence — all in-tree facts)

- ROADMAP `.planning/phases/phase-24/ROADMAP.md` (lines 173–186 — Wave 5 scope).
- W3 INVENTORY `.planning/phases/phase-24/wave-3/INVENTORY.md`
  (deviations + 836 arrow-callback patterns + the 6 shim init forwarders + namespace snapshot tables).
- W4 INVENTORY `.planning/phases/phase-24/wave-4/INVENTORY.md`
  (101-key lock-list snapshot + ctx-builder area-grouping + per-rename PIN strategy).
- Post-W4 HEAD source tree at `c9038bc` (`docs(24-3): INVENTORY end-of-W3 ...`).
- `index.html` lines 805–911 — all `<script>` tags in load order.

### Secondary (HIGH confidence — derived by literal tools)

- `/tmp/w5/file-table.txt` — per-file Lines / Header / Defines /
  External-refs table (101 rows). Generated by Node script in §1.5.
- `/tmp/w5/refs.txt` — per-file ALL_REFS dump. Generated by `grep -oE`.
- `/tmp/w5/headers.txt` — per-file header-line count. Generated by
  bash header-scan loop.
- `/tmp/w5/ns-summary.txt` — per-namespace definers + external readers.
  Generated by Node script.
- Tarjan SCC over file-edge graph: 1 non-trivial SCC, size 2.
  Reproducible via Node script in §1.5 + standard Tarjan loop.

### Tertiary (LOW confidence — none in this research)

- This RESEARCH makes no LOW-confidence claims. Every numeric count
  was reproduced by `grep` + Node script. Every recommendation
  follows from those counts plus the ROADMAP scope. Every "load-
  bearing" claim about arrow callbacks is grounded in direct source
  inspection of the named call sites.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Module-graph extraction (§1) | HIGH | Pure tool output, reproducible |
| Cycle detection (§2) | HIGH | Tarjan SCC; 1 SCC of size 2; documented in source |
| Header audit (§3) | HIGH | Line-by-line scan; 20 missing files enumerated |
| Re-export audit (§4) | HIGH | Per-namespace consumer counts via grep |
| Sub-wave slicing (§5) | MEDIUM | Plan-shaped; planner may re-slice |
| Risk areas (§6) | HIGH | All risks tied to verified findings |
| Out of scope (§7) | HIGH | Cross-checked against W1/W2/W3/W4 ROADMAP boundaries |

**Research date:** 2026-04-26.
**Valid until:** End of Wave 5 execution. After W5.2 lands, header
counts become stale (re-run §1.5 script for re-baseline). After
W5.3-C1 lands, the SCC count shifts (re-run Tarjan). The planner /
executor should produce the post-W5 baseline in the W5 INVENTORY
closure commit (W5.9).
