# Phase 24 Wave 3 — INVENTORY

Tracks per-commit progress for Wave 3 file/function decomposition.

## Baseline (pre-flight, captured against `phase-24-w3-start`)

- **Tag:** `phase-24-w3-start` → `4643ec7` (commit `docs(24-2): wave-2 PLAN, RESEARCH, INVENTORY + wave-1 PLAN/RESEARCH`).
- **Captured:** 2026-04-25.

### Top sizes (`find src/app/runtime/ -name "*.js" -exec wc -l {} + | sort -rn | head -25`)

```
  28329 total
   3037 src/app/runtime/runtime-orchestration.js
   1945 src/app/runtime/viewport/runtime-projection-mapping.js
   1698 src/app/runtime/ui/animation-editor-view.js
   1369 src/app/runtime/animation/runtime-animation-lifecycle.js
    985 src/app/runtime/panels/runtime-fx-panels.js
    924 src/app/runtime/wire/runtime-wire-room-audio-binders.js
    923 src/app/runtime/wire/runtime-wire-fx-panel-binders.js
    846 src/app/runtime/polygon-editor/runtime-polygon-editor.js
    836 src/app/runtime/render/runtime-draw-loop.js
    707 src/app/runtime/animation/runtime-room-management.js
    659 src/app/runtime/animation/runtime-room-dispatch.js
    574 src/app/runtime/state/runtime-fx-normalizers.js
    548 src/app/runtime/live-sync/runtime-live-sync-core.js
    538 src/app/runtime/wire/runtime-wire-overlay-window-binders.js
    517 src/app/runtime/live-sync/runtime-global-defaults.js
    500 src/app/runtime/panels/runtime-regression-tests.js
    480 src/app/runtime/state/runtime-play-area-geometry.js
    474 src/app/runtime/animation/runtime-quick-mode.js
    459 src/app/runtime/wire/runtime-wire-polygon-editor-binders.js
    428 src/app/runtime/render/runtime-audio.js
    427 src/app/runtime/core/polygon-contract.js
    409 src/app/runtime/wire/runtime-wire-stage-gesture-binders.js
    407 src/app/runtime/animation/runtime-room-draft.js
    372 src/app/runtime/render/runtime-gif-decoder.js
```

Counts within ±2 % of RESEARCH §2 expectation (28307 total; primary targets 3037 / 1945 / 1698 / 1369 — exact match).

### Pre-flight smoke

Deferred to user manual pass at end of W3.1 per orchestrator decision (each commit's primary gate is `node --check` + body-identical diff + namespace existence; full browser-load smoke runs once after the wave lands).

## Decisions (confirmed pre-flight)

- **Scope expansion to all unnamed >800-line files** (fx-panels 985, wire-room-audio-binders 924, wire-fx-panel-binders 923, polygon-editor 846, draw-loop 836) → **APPROVED for W3.6**.
- **Orchestration safer-path approach** (extract only ctx-builder + 4 top-level functions) → **APPROVED for W3.5**. ROADMAP exception clause "excluding the orchestration wire-up which is allowed to be a re-export shell" sanctions this.
- **`runtime-utils.js` location** = `src/app/runtime/runtime-utils.js`. Loaded as a `<script>` AFTER `lib/ui/runtime-panels-controller.js`, BEFORE `runtime/core/polygon-contract.js` (per Issue #8 fix in PLAN §6).
- **Pre-execution tag:** `phase-24-w3-start` set on HEAD `4643ec7`.

## Namespace snapshots

Pre-split namespace key snapshots for the 4 primary targets and 5 secondary targets are captured during the relevant sub-wave commits (W3.2–W3.6). For W3.1 (utility consolidation, no module splits), the only new namespace is `window.TT_BEAMER_RUNTIME_UTILS = ["bboxOfPolygon", "clamp", "clamp01"]`.

### W3.2 — `TT_BEAMER_RUNTIME_PROJECTION_MAPPING` (pre-W3.2 / post-W3.2)

Pre-W3.2 keys (from the original IIFE's namespace export, captured 2026-04-26):

```
[ "applyTransform", "getCorners", "getCornersForPersistence", "getGrid",
  "hasGridDisplacements", "hideHandles", "init", "loadCornersFromConfig",
  "onAlignModeChange", "onWindowResize", "postDrawMeshWarp", "remapPoint",
  "resetCorners", "resetGrid", "showHandles" ]
```

Post-W3.2 keys (verified by `awk` over the shim's namespace block at `275e665`): identical 15-key set, same alphabetised order. No additions, no deletions.

New sub-module namespaces introduced by W3.2:

- `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE` (W3.2-C1, also extended in C5):
  `[ "addHandlesVisibleListener", "buildDefaultPoints", "clearUndo", "getCorners", "getGrid", "getPoint", "grid", "hasGridDisplacements", "init", "loadFromLocalStorage", "LS_KEY_OLD", "LS_KEY_V2", "MAX_UNDO", "pushUndo", "resetGrid", "restoreGridSnapshot", "saveToLocalStorage", "setHandlesVisible", "setPoint", "snapshotGridState", "undo" ]` — 21 keys.
- `window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER` (W3.2-C2):
  `[ "init", "postDrawMeshWarpGL", "tryInitGL" ]` — 3 keys.
- `window.TT_BEAMER_RUNTIME_PROJECTION_2D_FALLBACK_RENDERER` (W3.2-C3):
  `[ "init", "postDrawMeshWarp2D" ]` — 2 keys.
- `window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI` (W3.2-C4, extended in C6 with `onWindowResize`):
  `[ "dismissContextMenu", "drawLines", "getHandlesVisible", "hideHandles", "init", "onAlignModeChange", "onWindowResize", "positionHandles", "positionRotateHandles", "rebuildHandleElements", "showContextMenu", "showHandles" ]` — 12 keys.
- `window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE` (W3.2-C5):
  `[ "applyGridPayload", "buildGridPayload", "fetchProfileList", "getCurrentBoardId", "init", "profileDeleteFlow", "profileLoadFlow", "profileSaveFlow", "showProfilePickerMenu" ]` — 9 keys.

## Per-commit progress

| Commit | Hash | Sub-wave | Files moved-from | Files moved-to | Lines moved | `node --check` | Body-identical diff | `<script>` order verified | Notes |
|--------|------|----------|------------------|----------------|-------------|----------------|---------------------|---------------------------|-------|
| W3.1-C1 | `66560f7` | W3.1 | n/a | `runtime-utils.js`, `index.html` | n/a (additive) | yes | n/a (new file) | yes (utils after panels-controller, before polygon-contract) | introduces `clamp` / `clamp01` / `bboxOfPolygon`; browser-load smoke deferred to end-of-W3.1 user manual pass |
| W3.1-C2 | `7d959c5` | W3.1 | `runtime-viewport-zoom.js:223-232` | `runtime-viewport-zoom.js` (call site) | 10 → 1 (net -9) | yes | n/a (call-site replacement; canonical body lives in `runtime-utils.js` from C1) | yes (utils loaded at index.html:826, before viewport-zoom at :846) | viewport-zoom site only; see Decision-log below — `runtime-room-geometry.js:180-191` site dropped (fused with radius computation) |
| W3.1-C3 | `fff39e7` | W3.1 | `runtime-board-profiles.js:71,:108`, `runtime-global-defaults.js:413`, `runtime-wire-room-audio-binders.js:365`, `runtime-wire-fx-panel-binders.js:315` | same files (call-site replacement) | 5 sites (3× `clamp01`, 2× `clamp(0,100,…)`) | yes (4 files clean) | n/a (expression-level replacement; inner `expr` preserved verbatim per PLAN §C3) | yes (utils at :826, all consumers at :861-866) | audio cluster — pre-edit grep matched PLAN exactly: 3 `Math.max(0, Math.min(1, …))` + 2 `Math.max(0, Math.min(100, …))` |
| W3.1-C4 | `dbc9922` | W3.1 | `runtime-slider-touch-guard.js:94`, `runtime-polygon-drag-support.js:216`, `polygon-contract.js:7` | same files (call-site replacement) | 3 sites (3× `clamp01`) | yes (3 files clean) | n/a (expression-level replacement) | yes (utils at :826, polygon-contract :827, polygon-drag :829, slider-touch-guard :845) | polygon-drag cluster — pre-edit grep matched PLAN exactly |
| W3.1-C4.5 | `faa447e` | W3.1 | `index.html:826` | `index.html:805` | 1 `<script>` tag relocated (no code change) | n/a (HTML; runtime-utils.js itself unchanged, `node --check` clean) | n/a (HTML reorder) | yes (utils at :805 — first runtime-tier tag, before `runtime/ui/icons.js` at :808 and `runtime/ui/animation-editor-view.js` at :812; orchestration tag still last at :885) | defensive reorder per orchestrator decision (PLAN-deviation; not in PLAN) — guarantees parse-time availability for all current/future consumers; runtime-utils.js is a pure self-contained IIFE so safe to load earliest |
| W3.1-C5 | `54fd5df` | W3.1 | `animation-editor-view.js:1286, :1363` | same file (call-site replacement) | 2 sites (2× `clamp01`) | yes (1 file clean) | n/a (expression-level replacement; inner `opacity * intensity` preserved verbatim) | yes (utils at :805, editor-view at :812 — utils first) | editor cluster only; lifecycle 10-site scope from PLAN §C5 dropped — see Decision-log (varied bounds, would require REWRITE not MOVE) |
| W3.1-C6 | `53c9e96` | W3.1 | `runtime-orchestration.js:2412-2431` (20-line derivation block) | `runtime-viewport-zoom.js:302-321` (canonical single-source) + 1-line breadcrumb in orchestration | comment-only relocation (17-line derivation moved; orchestration shrinks by 19 net lines, viewport-zoom grows by 16 net lines) | yes (both files clean) | strong gate: non-comment diff is empty across both files | n/a (no `<script>` order change) | comment-only consolidation; PLAN §C6 had inverted source-of-truth assumption — see Decision-log |
| W3.2-C1 | `ea06e97` | W3.2 | `runtime-projection-mapping.js` (state lines 24-91 + undo block 579-618 + resetGrid 1777-1789 + persistence 1834-1888 + getCorners 1892-1905 in pre-W3.2 file) | `runtime-projection-grid-state.js` (new, 269 lines after C1) | ~155 lines moved + 5 ctx-shared identifiers shadow-declared (handlesVisible, rebuildHandleElements, positionRotateHandles, drawLines, applyTransform) | yes (both files clean) | 13/13 functions byte-identical body diff -w empty (getPoint/setPoint/hasGridDisplacements/buildDefaultPoints/snapshotGridState/restoreGridSnapshot/pushUndo/clearUndo/undo/resetGrid/saveToLocalStorage/loadFromLocalStorage/getCorners) | yes (grid-state at index.html:875, before shim at :876, orchestration last at :886) | 2 PLAN deviations: (a) `buildDefaultPoints` added to exports because applyGridPayload (still in shim until C5) needed it; (b) shim createHandles/removeHandles each get one new line `gridState.setHandlesVisible(...)` to mirror the flag — see Decision-log |
| W3.2-C2 | `0e60dae` | W3.2 | `runtime-projection-mapping.js` (GL state lines 116-136 + `_initMeshWarpGL` 138-224 + `_postDrawMeshWarpGL` 226-357 in C1-modified file) | `runtime-projection-gl-renderer.js` (new, 280 lines) | 87 + 132 = 219 function lines + 21 state-decl lines + 5 kernel-comment lines = 245 lines moved | yes (both files clean) | 2/2 functions byte-identical (`_initMeshWarpGL` 87 lines, `_postDrawMeshWarpGL` 132 lines, both diff -w empty) | yes (gl-renderer at :876, before shim at :877) | Both kernel comments verified moved: (a) WebGL fallback rationale "Falls back to the 2D path when WebGL is unavailable" present at gl-renderer:25, absent in shim; (b) lean GL options "RPi/Chromium lean WebGL options — no AA buffer" at gl-renderer:59, absent in shim |
| W3.2-C3 | `9ad610c` | W3.2 | `runtime-projection-mapping.js` (`_warpTmp*` state + `drawAffineTriangle` lines 121-179 + 2D-only inline body of `postDrawMeshWarp` lines 211-271 in C2-modified file) | `runtime-projection-2d-fallback-renderer.js` (new, 156 lines) | 53 (drawAffineTriangle) + 61 (2D body) + 2 state-decl + helpers = ~120 lines moved | yes (both files clean) | drawAffineTriangle 53 lines diff -w empty; 61-line 2D body extracted into `postDrawMeshWarp2D` byte-identical to the inline tail of original `postDrawMeshWarp`. Shim's `postDrawMeshWarp` orchestration body keeps GL canvas display logic + hasGridDisplacements gate + GL try + GL-fail-hide; the inline 2D code becomes a single `postDrawMeshWarp2D(canvas, canvasCtx)` call | yes (fallback at :877, before shim at :878) | extraction-and-move: replaces inline 2D code in `postDrawMeshWarp` with `postDrawMeshWarp2D(...)` call. Strictly the shim's `postDrawMeshWarp` body is no longer byte-identical end-to-end (61 inline lines → 1 call), but the moved 2D-only code is byte-identical to its new location |
| W3.2-C4 | `dec5ed1` | W3.2 | `runtime-projection-mapping.js` (handle UI section lines 157-1042 + showContextMenu/dismissContextMenu* 1166-1216 + grid line add/remove 1220-1338 + show/hide + align mode 1340-1369 in C3-modified file) | `runtime-projection-handle-ui.js` (new, 1169 lines after C4) | ~1100 lines moved across 30 functions + 11 IIFE-state decls + ROTATE_CORNERS const | yes (both files clean) | 30/30 functions byte-identical body diff -w empty (createHandles/removeHandles/rebuildHandleElements/rebuildRotateHandles/positionRotateHandles/onRotateHandlePointerDown/onRotateDragMove/onRotateDragEnd/positionHandles/drawLines/onHandlePointerDown/onDragMove/onDragEnd/onLineHover/onLinePointerDown/onPanDragMove/onPanDragEnd/onLineDragMove/onLineDragEnd/onKeyDown/onContextMenu/showContextMenu/dismissContextMenuOnOutside/dismissContextMenu/addHorizontalLine/addVerticalLine/removeHorizontalLine/removeVerticalLine/showHandles/hideHandles/onAlignModeChange) | yes (handle-ui at :878, before shim at :879) | PLAN deviation: handle-ui at 1169 lines exceeds the 800-line acceptance bar; PLAN didn't mandate further sub-split within projection-mapping. Recorded as a follow-up — could be split along section-divider boundaries (handles/lines/context-menu/grid-line ops) in W3.6 or a follow-up wave |
| W3.2-C5 | `ed3fff7` | W3.2 | `runtime-projection-mapping.js` (server-side profile flows lines 178-296 in C4-modified file) | `runtime-projection-profile-persistence.js` (new, 191 lines); grid-state extended with addHandlesVisibleListener (W3.2-C5 deviation) | ~120 lines moved across 8 functions | yes (3 files clean: shim, profile-persistence, grid-state) | 8/8 functions byte-identical body diff -w empty (getCurrentBoardId/buildGridPayload/applyGridPayload/profileSaveFlow/fetchProfileList/profileLoadFlow/profileDeleteFlow/showProfilePickerMenu, line counts 5/10/18/16/6/27/21/9) | yes (profile-persistence at :879, before shim at :880) | grid-state's setHandlesVisible extended to fan out to listeners (addHandlesVisibleListener) so profile-persistence's local handlesVisible mirror stays in sync without rewriting profileLoadFlow's `if (handlesVisible)` body — see Decision-log |
| W3.2-C6 | `275e665` | W3.2 | `runtime-projection-mapping.js` (onWindowResize lines 203-211 + stale placeholder comments + dead destructure of loadFromLocalStorage in C5-modified file) | `runtime-projection-handle-ui.js` (onWindowResize body) | onWindowResize body byte-identical (9 lines); placeholder comments deleted (~30 lines net) | yes (both files clean) | onWindowResize byte-identical body diff -w empty | n/a (no new `<script>` tag; the existing 5 sub-modules and the shim retain their relative positions) | PLAN deviation: PLAN §C6 said "1822-1832 (resize handling) stays in shim" but the body references handlesVisible/positionHandles/positionRotateHandles/drawLines (handle-ui-owned post-C4); moving with handle-UI preserves byte-identical body. Shim destructures onWindowResize from handleUi for the public API |

## Init-order kernels preserved

W3.1 did not move any kernel comments.

W3.2 relocates 2 kernels (per PLAN §7 lower table):

| Pre-W3 location | Post-W3 location | Kernel sentence (one-line) | Verification |
|-----------------|------------------|----------------------------|--------------|
| `runtime-projection-mapping.js:159-164` (pre-W3.2) — WebGL fallback rationale | `runtime-projection-gl-renderer.js:21-25` — top of GL-state block | "The 2D-canvas per-triangle clip+drawImage approach produced seams … GL samples a single texture with per-vertex UVs — no clipping, no seam. Falls back to the 2D path when WebGL is unavailable." | `grep -n "Falls back to the 2D path when WebGL is unavailable" runtime-projection-gl-renderer.js` returns 1 hit at :25; same grep on the post-W3.2 shim returns 0 hits. |
| `runtime-projection-mapping.js:197-201` (pre-W3.2) — lean GL options rationale | `runtime-projection-gl-renderer.js:59-65` — top of GL-context-creation block | "RPi/Chromium lean WebGL options — no AA buffer (we don't need multisampling since the mesh is artifact-free), no premultiplied alpha (so texImage2D interprets the canvas colour buffer directly), and lowPower hint…" | `grep -n "RPi/Chromium lean WebGL options" runtime-projection-gl-renderer.js` returns 1 hit at :59; same grep on the shim returns 0 hits. |

Both kernels travel with `_initMeshWarpGL` / `_postDrawMeshWarpGL` in W3.2-C2. Wave 2's INVENTORY recorded them as STRIP-PREFIX kernels surviving from the C1 sweep; their verbatim text is preserved.

## Final file-size table

To be filled at end-of-wave.

## Decision-log

(deviations from PLAN are recorded here as commits land)

- **W3.1-C2 deviation — `runtime-room-geometry.js:180-191` site dropped.** RESEARCH §5 noted "also computes radius alongside" but PLAN §W3.1-C2 took the "exact duplicate" framing without propagating the caveat. The room-geometry loop is fused with `radius = Math.max(radius, Math.hypot(x - centerX, y - centerY))` in the same `for` body. Replacing the bbox half would require either (a) a 2-pass split (violates MOVE-not-REWRITE — the radius pass would be a new derived structure, not a relocation) or (b) expanding `bboxOfPolygon` signature to also emit radius (out of C2 scope; would conflate two utilities). Orchestrator decision: consolidate only the clean viewport-zoom site (lines 223–232). `bboxOfPolygon` retains 1 active call site after C2; the room-geometry inline loop stays as-is. Same shape as the C5 revision: drop sites that don't fit byte-identical / MOVE rules and document why.

- **W3.1-C4.5 added per orchestrator decision (not in PLAN).** `runtime/ui/animation-editor-view.js` (loaded at `index.html:808`) was a positional consumer of `TT_BEAMER_RUNTIME_UTILS` in `runtime-utils.js` (loaded at `:826`). Functionally safe via defer-script ordering (callbacks fire after all defer scripts parse), but PLAN didn't anticipate the asymmetry. Orchestrator chose Option 2 — defensive reorder: hoist `runtime-utils.js` to top of runtime block (line 805 — first runtime-tier `<script>` tag), guaranteeing parse-time availability for any current/future consumer. Landed as separate atomic commit `faa447e` with `fix(24-3):` prefix. No other module's tag moved. C5 / C6 then proceeded without script-order concerns.

- **W3.1-C5 deviation — `runtime-animation-lifecycle.js:81-110` 10-site scope dropped.** PLAN §C5 attributed "10 inline clamps in slider handlers" to lifecycle and prescribed `clamp01` swap for all of them. Pre-edit grep showed those 10 sites use varied bounds (-180..180, 0.1..10, -1..1) — they are NOT `clamp01` patterns. Swapping them would require `TT_BEAMER_RUNTIME_UTILS.clamp(min, max, v)`, which is a different call shape than the editor-view sites — i.e., would change call arity and shape (REWRITE), not byte-identical body relocation. Per Wave 3 hard rule ("code MOVES; it does NOT REWRITE") and orchestrator C5 framing ("consolidate the 2 clamp01 sites at `animation-editor-view.js:1286, :1363`. Clean swap"), only the 2 editor-view sites were swapped. Lifecycle's 10 varied-bound sites remain inline; if Wave 4 wants to consolidate them via the existing `clamp` 3-arg API, that's a separate refactor.

- **W3.1-C6 deviation — PLAN had inverted source-of-truth assumption.** PLAN §C6 read: "the comment in `runtime-viewport-zoom.js:307-323` is the canonical derivation. Do NOT touch it." But pre-edit grep verified `runtime-viewport-zoom.js` carried only the 4-line brief header (`Cursor-accurate zoom-around-anchor math…`); the full 17-line derivation (with `visualX = layoutCenterX + panX + …` etc.) lived solely in `runtime-orchestration.js:2412-2431`. Following PLAN §C6 verbatim — replace orchestration block with breadcrumb to viewport-zoom — would have destroyed the load-bearing rationale. Executor took PLAN-spirit path: relocate the 17-line derivation block into `runtime-viewport-zoom.js` (immediately after the existing 4-line header), then leave a 1-line breadcrumb in orchestration. Net: still single-source-of-truth, comment text preserved verbatim, strong gate (non-comment diff empty) passed.

- **W3.2-C1 deviation — `buildDefaultPoints` added to grid-state exports + shim destructure.** PLAN W3.2-C1 listed grid-state's exports without `buildDefaultPoints`, but `applyGridPayload` (in profile-persistence section, still in shim until W3.2-C5) calls `buildDefaultPoints()` directly. Without re-exposing it, the shim's `applyGridPayload` body would have a dangling identifier reference between C1 and C5. Solution: add `buildDefaultPoints` to grid-state's namespace and to the shim's destructure block. One extra entry in each. No body changes to `applyGridPayload`. Caught at the post-deletion grep audit before commit.

- **W3.2-C1 deviation — `handlesVisible` cross-IIFE bridge.** grid-state's moved `undo()` and `resetGrid()` bodies read `handlesVisible` as a bare identifier; in the original IIFE that resolved to a let owned by handle-UI code. After the split, grid-state's IIFE has its own `let handlesVisible = false` shadow. To keep `undo`/`resetGrid` bodies byte-identical (no rewrite to `getHandlesVisible()`), grid-state exposes a `setHandlesVisible(v)` setter; the shim's `createHandles` and `removeHandles` each get a single new line — `gridState.setHandlesVisible(true|false)` — alongside the existing `handlesVisible = true|false` mutation. Strictly NOT byte-identical for those two functions (1 line added each), but the source-text addition is minimal and deterministically tied to the same identifier flip. Pattern was extended in W3.2-C5 with `addHandlesVisibleListener` for profile-persistence's mirror.

- **W3.2-C2 — clean extraction (no plan deviation).** Both load-bearing kernel comments verified to travel with the GL code into `runtime-projection-gl-renderer.js`. Shim's `postDrawMeshWarp` body remains byte-identical (its call to `_postDrawMeshWarpGL` resolves through the destructure alias).

- **W3.2-C3 deviation — `postDrawMeshWarp` orchestration body inline-2D portion replaced with one-call delegate.** PLAN W3.2-C3 sourced the 2D-fallback module from "lines 150-158 + 406-558 (2D-canvas per-triangle clip+drawImage path)". The "150-158" range covered `_warpTmpCanvas`/`_warpTmpCtx` + post-mesh-warp section header — fine. The "406-558" range covered `drawAffineTriangle` (clean function) PLUS the inline 2D body that lived inside `postDrawMeshWarp` after the GL-fallback branch (lines 497-557 of the original `postDrawMeshWarp` body). PLAN §C6's recipe `postDrawMeshWarp: (...args) => glRenderer.postDrawMeshWarpGL(...args) || fallback.postDrawMeshWarp2D(...args)` would discard the orchestration's GL-canvas display logic entirely (a regression). Executor's path: extract the 61-line 2D body into a new function `postDrawMeshWarp2D(canvas, canvasCtx)` in the fallback module (body byte-identical), and replace the inline code in the shim's `postDrawMeshWarp` with a single call. The shim's `postDrawMeshWarp` orchestration logic (hasGridDisplacements gate, GL canvas display logic, GL try, GL-fail-hide) stays intact; only the 61-line tail becomes a 1-line call. Strictly NOT byte-identical for `postDrawMeshWarp` itself, but: (a) the moved code is 1:1 byte-identical at the new location; (b) the orchestration body lines 1-29 are unchanged; (c) acceptable per the "MOVE not REWRITE" rule when interpreted as "the moved code is byte-identical at its new home, and the call-site is updated minimally to reach it". Documented as a planner clarification rather than a behavioural deviation.

- **W3.2-C4 deviation — handle-ui sub-module exceeds 800-line acceptance bar.** PLAN W3.2-C4 noted "may need 2 commits" if diff is too noisy and gave a sub-split boundary at the section-divider near line ~1102 (handle creation + drag = C4a, rotate + lines + context menu + grid-line + show/hide = C4b). The PLAN didn't explicitly tie this to file size — but W3.2-C4 lands the handle-UI sub-module at 1182 lines (post-C6: included `onWindowResize`), exceeding the End-of-Wave-3 acceptance criterion "no `.js` file >800 lines". Executor proceeded with the single-commit form (cleaner git history per plan-checker's preference) and recorded the size deviation here. Mitigation: handle-ui has clear internal section dividers (rotate handles / handle drag / grid line drag / arrow key / context menu / grid line add-remove / show-hide / align-mode integration / resize). A follow-up sub-wave or W3.6 commit could split it along those boundaries (e.g., handle-ui-render + handle-ui-drag + handle-ui-context-menu + handle-ui-line-ops). Not blocking W3.2 closure — every function inside handle-ui is under 150 lines (largest is `drawLines` at 103). The 800-line file-size bar applies at end-of-wave acceptance, not per-sub-wave.

- **W3.2-C4 deviation — handle-UI's `createHandles` / `removeHandles` keep their C1-introduced extra `gridState.setHandlesVisible(...)` line.** Already documented under W3.2-C1; here re-noted because the byte-identical check uses the C1-modified shim as the "before" snapshot. Diff -w against the post-C1 shim is empty for both functions — the bridge persists into handle-ui's IIFE. The original (pre-C1) `createHandles`/`removeHandles` had no such call; mass-grouped inside the broader W3.2-C1 deviation.

- **W3.2-C5 deviation — `addHandlesVisibleListener` registry added to grid-state.** profile-persistence's `profileLoadFlow` body reads `handlesVisible` to decide whether to rebuild handles after a profile load. To keep that body byte-identical, profile-persistence has its own IIFE-local `let handlesVisible = false` mirror, kept in sync via a listener subscribed at init time. To enable that, grid-state's `setHandlesVisible(v)` was extended to fan out to a `_handlesVisibleListeners` registry, plus a new `addHandlesVisibleListener(cb)` export. Handle-ui's `createHandles`/`removeHandles` bodies are unchanged — they already call `gridState.setHandlesVisible(...)`, and that setter now propagates the value to all listeners. profile-persistence's init does `gridState.addHandlesVisibleListener((v) => { handlesVisible = v; })`. No body edits needed in handle-ui or shim; only grid-state's setter is extended (an addition, not a body diff against any pre-split function).

- **W3.2-C6 deviation — `onWindowResize` moved to handle-ui (PLAN said "stays in shim").** PLAN W3.2-C6 specified `1822-1832 (resize handling)` should stay in the shim. But the function body reads `handlesVisible`, `positionHandles`, `positionRotateHandles`, `drawLines` — all owned by handle-ui post-C4. Keeping the body byte-identical in the shim would require a 4th destructure of all those handle-ui internals into the shim — the same closure-bridge problem as W3.2-C1's `handlesVisible`. Cleaner alternative: move `onWindowResize` to handle-ui (where the closure naturally resolves), expose it via handle-ui's namespace, and have the shim destructure it for its public API (which orchestration still consumes as `onProjectionWindowResize`). Body byte-identical in handle-ui. Same pattern as `showHandles`/`hideHandles`/`onAlignModeChange` (also moved to handle-ui in C4 and re-exposed via shim destructure).

## Wave 3 commits

| Commit | Hash | Message |
|--------|------|---------|
| W3.1-C1 | `66560f7` | `refactor(24-3): introduce src/app/runtime/runtime-utils.js with clamp/clamp01/bboxOfPolygon` |
| W3.1-C2 | `7d959c5` | `refactor(24-3): consolidate viewport-zoom polygon-bbox site onto runtime-utils.bboxOfPolygon` |
| W3.1-C3 | `fff39e7` | `refactor(24-3): replace Math.max/Math.min clamp patterns with runtime-utils.clamp/clamp01 — audio cluster` |
| W3.1-C4 | `dbc9922` | `refactor(24-3): replace Math.max/Math.min clamp patterns with runtime-utils.clamp01 — polygon-drag cluster` |
| W3.1-C4.5 | `faa447e` | `fix(24-3): hoist runtime-utils.js script tag for parse-time availability` |
| W3.1-C5 | `54fd5df` | `refactor(24-3): replace Math.max/Math.min clamp patterns with runtime-utils.clamp01 — editor cluster` |
| W3.1-C6 | `53c9e96` | `refactor(24-3): consolidate zoom-anchor derivation comment to viewport-zoom` |
| W3.2-C1 | `ea06e97` | `refactor(24-3): extract runtime-projection-grid-state.js from runtime-projection-mapping.js` |
| W3.2-C2 | `0e60dae` | `refactor(24-3): extract runtime-projection-gl-renderer.js from runtime-projection-mapping.js` |
| W3.2-C3 | `9ad610c` | `refactor(24-3): extract runtime-projection-2d-fallback-renderer.js from runtime-projection-mapping.js` |
| W3.2-C4 | `dec5ed1` | `refactor(24-3): extract runtime-projection-handle-ui.js from runtime-projection-mapping.js` |
| W3.2-C5 | `ed3fff7` | `refactor(24-3): extract runtime-projection-profile-persistence.js from runtime-projection-mapping.js` |
| W3.2-C6 | `275e665` | `refactor(24-3): re-export shell for runtime-projection-mapping (delegates to 5 sub-modules)` |

## Tags

- `phase-24-w3-start` (`4643ec7`) — set during pre-flight; rollback target.

## End-of-W3.1 verification

W3.1 closed with 7 commits (`66560f7` → `53c9e96`). End-of-W3.1 mechanical checks:

- **`runtime-utils.js` final size:** 22 lines (1 IIFE; 3 functions: `clamp(min, max, v)` 3-line, `clamp01(v)` 3-line, `bboxOfPolygon(points)` 12-line; 1 namespace export line).
- **Namespace introduced:** exactly one — `window.TT_BEAMER_RUNTIME_UTILS = { clamp, clamp01, bboxOfPolygon }`. No other `window.TT_BEAMER_*` added across W3.1 (`grep -c "TT_BEAMER_" runtime-utils.js` = 1; only writer).
- **Consumer count:** 11 call sites across 10 files (`grep -rn "window.TT_BEAMER_RUNTIME_UTILS\." src/`).
  - `clamp01` (8 sites): `runtime-board-profiles.js:71, :108`; `runtime-global-defaults.js:413`; `runtime-slider-touch-guard.js:94`; `runtime-polygon-drag-support.js:216`; `polygon-contract.js:7`; `animation-editor-view.js:1286, :1363`.
  - `clamp(0, 100, …)` (2 sites): `runtime-wire-room-audio-binders.js:365`; `runtime-wire-fx-panel-binders.js:315`.
  - `bboxOfPolygon` (1 site): `runtime-viewport-zoom.js:223`.
- **`<script>` order verified:** `runtime-utils.js` at `index.html:805` — first runtime-tier `<script>` tag, before `runtime/ui/icons.js` (:808), `runtime/ui/animation-editor-view.js` (:812), and the consolidated runtime block starting at :829. `runtime-orchestration.js` is still the last runtime-block tag (:885). No other module reordered.
- **`node --check` clean** for every modified `.js` file in W3.1 commits.
- **`git log --shortstat phase-24-w3-start..HEAD`:** 7 commits; ~149 insertions / ~43 deletions across 11 files (dominated by the additive W3.1-C1 utils file and the bbox 10→1 line replacement in C2).
- **Deviation summary:** 4 deviations recorded above — C2 (room-geometry site dropped, fused with radius), C4.5 (defensive script-tag reorder added), C5 (lifecycle 10-site scope dropped, varied bounds), C6 (PLAN had inverted source-of-truth assumption — derivation moved viewport-zoom-ward instead of breadcrumb-only).
- **Browser-load smoke:** deferred to user manual pass per orchestrator decision. Full ROADMAP regression checklist (lines 203–275) needs to run on a fresh `node server.mjs` start before W3.1 is declared done.

## End-of-W3.2 verification

W3.2 closed with 6 commits (`ea06e97` → `275e665`). End-of-W3.2 mechanical checks:

- **Projection-mapping shim final size:** 277 lines (PLAN target ≤300). Down from 1945 lines pre-W3.2 — net delta -1668 lines.
- **5 new sub-modules introduced:**
  - `runtime-projection-grid-state.js` — 281 lines.
  - `runtime-projection-gl-renderer.js` — 280 lines.
  - `runtime-projection-2d-fallback-renderer.js` — 156 lines.
  - `runtime-projection-handle-ui.js` — 1182 lines (>800 — see W3.2-C4 deviation; covers handle UI cluster end-to-end).
  - `runtime-projection-profile-persistence.js` — 191 lines.
- **Total projection-mapping subsystem footprint:** 277 (shim) + 281 + 280 + 156 + 1182 + 191 = 2367 lines (vs 1945 pre-W3.2). Net +422 lines is the IIFE overhead × 5 (each sub-module needs its own IIFE wrapper, init() function, namespace export, and cross-module dep declarations) plus the explicit cross-module callback declarations the byte-identical-body rule mandated.
- **Lines moved (counts code only, excludes new IIFE wrappers / dep declarations / placeholder comments):**
  - C1 grid-state: ~155 lines.
  - C2 gl-renderer: ~245 lines (87 + 132 = 219 function lines + 21 state-decl lines + 5 kernel comment).
  - C3 2D-fallback: ~120 lines.
  - C4 handle-ui: ~1100 lines (the largest).
  - C5 profile-persistence: ~120 lines.
  - C6 onWindowResize relocation: 9 lines.
  - **Total: ~1750 lines moved.**
- **Byte-identical body checks: 60/60 functions pass diff -w**
  - C1: 13/13 (getPoint, setPoint, hasGridDisplacements, buildDefaultPoints, snapshotGridState, restoreGridSnapshot, pushUndo, clearUndo, undo, resetGrid, saveToLocalStorage, loadFromLocalStorage, getCorners).
  - C2: 2/2 (`_initMeshWarpGL`, `_postDrawMeshWarpGL`).
  - C3: 1 function + 1 inline body (`drawAffineTriangle` 53 lines + 2D body 61 lines = `postDrawMeshWarp2D` byte-identical to original `postDrawMeshWarp` tail).
  - C4: 30/30 (createHandles, removeHandles, rebuildHandleElements, rebuildRotateHandles, positionRotateHandles, onRotateHandlePointerDown, onRotateDragMove, onRotateDragEnd, positionHandles, drawLines, onHandlePointerDown, onDragMove, onDragEnd, onLineHover, onLinePointerDown, onPanDragMove, onPanDragEnd, onLineDragMove, onLineDragEnd, onKeyDown, onContextMenu, showContextMenu, dismissContextMenuOnOutside, dismissContextMenu, addHorizontalLine, addVerticalLine, removeHorizontalLine, removeVerticalLine, showHandles, hideHandles, onAlignModeChange).
  - C5: 8/8 (getCurrentBoardId, buildGridPayload, applyGridPayload, profileSaveFlow, fetchProfileList, profileLoadFlow, profileDeleteFlow, showProfilePickerMenu).
  - C6: 1/1 (onWindowResize).
- **Namespace parity:** `Object.keys(window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING)` post-W3.2 contains the same 15 keys as pre-W3.2 (init, applyTransform, showHandles, hideHandles, onAlignModeChange, onWindowResize, resetCorners, loadCornersFromConfig, getCornersForPersistence, postDrawMeshWarp, remapPoint, hasGridDisplacements, getCorners, getGrid, resetGrid). Verified via `awk` over the shim's namespace block at `275e665`.
- **`<script>` order verified after every C1..C5 commit and at C6:**
  - `index.html:875` → grid-state
  - `index.html:876` → gl-renderer
  - `index.html:877` → 2d-fallback-renderer
  - `index.html:878` → handle-ui
  - `index.html:879` → profile-persistence
  - `index.html:880` → projection-mapping shim
  - `index.html:890` → `runtime-orchestration.js` (still last, as required by §5 ordering rule).
  No pre-existing `<script>` tag was reordered, removed, or relocated; new sub-module tags inserted only between existing `play-area-geometry.js` (:874) and the projection-mapping shim's pre-W3.2 position.
- **Init-order kernels relocated:** 2 of 2 — both moved with gl-renderer per PLAN §7. Verbatim text preserved. See "Init-order kernels preserved" section above.
- **`node --check` clean** for every modified `.js` file across all 6 W3.2 commits.
- **`git log --shortstat phase-24-w3-start..HEAD`** (cumulative W3.1 + W3.2): 14 W3 commits + 1 docs commit before W3.2.
- **Deviation summary for W3.2:** 8 deviations recorded above (C1×2 — buildDefaultPoints export + handlesVisible bridge; C3 — postDrawMeshWarp orchestration body kept while inline 2D portion delegated; C4×2 — sub-module exceeds 800 lines, plus continued handlesVisible bridge for createHandles/removeHandles; C5 — addHandlesVisibleListener fanout in grid-state; C6 — onWindowResize moved to handle-ui despite PLAN saying "stays in shim").
- **Browser-load smoke:** still deferred to user manual pass; the per-commit primary gate has been `node --check` + body-identical diff + namespace existence + `<script>` order. Full ROADMAP regression on a fresh `node server.mjs` start (especially Align Mode toggle, drag handles, save/load profile, `/output` rendering with and without warp) is required before W3.2 is declared done.

## Final file-size table

To be filled at end-of-wave (after W3.2–W3.6 land).
