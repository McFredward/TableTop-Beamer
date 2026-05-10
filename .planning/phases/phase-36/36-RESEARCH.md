# Phase 36: Comprehensive Align-Mode-on-Thin-/output/ — Research

**Researched:** 2026-05-10
**Domain:** Browser-side thin-client refactor — JS module API design + Playwright Live-E2E test rail + DOM event-routing
**Confidence:** HIGH on facts about the existing codebase (all claims verified by source-grep against the working tree). MEDIUM on the proposed `bootHandleUi` API shape (proposal — must survive the planner's review). MEDIUM on the runtime-trace harness (the proposed Proxy approach is sound but unrun in this session).

---

## Summary

Phase 36 closes the gap between Phase 35-A's pure-extract attempt and a sustainable thin-/output/ that runs the full handle-ui locally. Phase 35-A's failure root cause was **NOT** that 60 ctx fields were missing — the four refactor-target files only directly access ~50 distinct `ctx.X` symbols total — the failure was that `ctx.state` is an OBJECT (not a function), and the code reads ~25 distinct sub-keys (`state.polygonEditor.dragVertexIndex`, `state.shipPolygonEditor.selectedEdgeIndex`, `state.uiView`, `state.alignMode`, etc.) plus three HIDDEN cross-IIFE bindings (`window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE.emitLiveMutation`, `window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE.notifyDirtyChanged/discardChanges`, `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE.broadcastGridSnapshot`) that are NOT visible to a `grep -E "ctx\."` scan. **This is what the runtime-trace must catch, and what the AST-only audit missed in Phase 35-A.**

The mutation surface is also smaller than implied by D-04/D-05/D-06: `align-grid-snapshot` is the SOLE write mutation type used by line-add/remove/drag/undo (verified in source). `align-corner-drag` is the legacy Phase-31 1-vertex mutation used only by `receiver-input-forwarder`. The dirty-flag has its OWN HTTP endpoint (`POST /api/align-mode-dirty`) — it does NOT piggyback live-sync mutations. CONTEXT.md D-06 says "broadcast piggybacks on align-grid-snapshot" — **that contradicts the existing implementation.** The planner must reconcile: either (a) keep the existing `/api/align-mode-dirty` POST path (recommended — lowest risk), or (b) actually piggyback by adding a `dirty` field to the align-grid-snapshot payload (server.mjs would need a new validation rule). The RESEARCH recommends (a).

**Primary recommendation:** Build `bootHandleUi({...})` as the SOLE entry-point that performs the full mapping/grid-state/handle-drag/handle-ui/profile-persistence/polygon-editor wiring. Treat the four IIFE modules as the implementation; the boot function is the explicit-arg shim. Accept ONE arg object with named fields covering the full inventory below. Both dashboard and /output/ converge on this single call. The 1756 LOC of handle-ui stays untouched (no modularization in Phase 36 — too risky).

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 — Refactor strategy:** Option H (first-class thin-export). `bootHandleUi({...})` exported entry-point. Every internal module-global → explicit named arg. Refactor is additive — dashboard's `runtime-orchestration.js` calls the same `bootHandleUi(...)` with the same wirings it implicitly had before. Single source of truth in `src/app/runtime/viewport/`.
- **D-02 — Event-handling architecture (option a):** When align-mode active on /output/, `#ssr-input-overlay` gets `pointer-events: none`. Handle DOM (z:9999) captures clicks directly. handle-ui's INTERNAL pointer handlers run unchanged. The Phase 35-A CSS rule (`body[data-output-role="final-output"].align-mode-active .projection-corner-handle{pointer-events:none !important}` etc.) is REMOVED. `receiver-input-forwarder` does NOT participate in align-mode (sleeps via overlay state). When align-mode toggles OFF: overlay re-activates.
- **D-03 — RED-test form:** Pure Live-E2E via Playwright + `/opt/google/chrome/chrome` under Xvfb DISPLAY=:98. All 10 RED tests (T1-T10) implemented under `test/live-e2e/`. Reuses Phase 35 W0 infrastructure (`scripts/with_server.py` + `conftest.py` fixtures + `@flaky_3x`). BLOCKING gate: no Phase 36 production code lands until all 10 tests exist as RED rails.
- **D-04 — Undo state:** Client-local on /output/. handle-ui's existing local history stack runs via `bootHandleUi(...)`. CTRL+Z pops local stack; result broadcasts via existing `align-grid-snapshot` mutation. No new server mutation type. No undo log.
- **D-05 — Right-click context menu:** Fully rendered in /output/ DOM. handle-ui's existing context-menu code runs locally. Add/remove-line use existing mutation types.
- **D-06 — Dirty-flag:** Local + broadcast via existing mutation type. handle-ui's `notifyDirtyChanged()` runs locally on /output/. Broadcast piggybacks on `align-grid-snapshot`. **(See note in Summary: existing implementation uses a separate `POST /api/align-mode-dirty` HTTP path — researcher recommends keeping it; planner needs to choose.)**
- **D-07 — ctx-inventur methodology:** Runtime-trace via Proxy (wraps dashboard's `ctx`, drives every align-mode interaction, collects access log) + AST scan (every `ctx.X` MemberExpression across the four target files). Union = authoritative inventory. Every union-field becomes an explicit `bootHandleUi` arg. No more grep-only audits.
- **D-08 — Connection-stability hard gate:** `test/connection-stability/**` MUST stay `fail=0`. VAAPI default-disabled UNCHANGED. `hasVaapiEnabled` Phase-34-h2 gate UNCHANGED.
- **D-09 — Lazy-load script-tag budget:** /output/ stays at ≤8 src-based script tags initial. Align-mode bundle continues to lazy-load via `output-align-mode-loader.js` pattern. BLOCKING grep-assertion in CI (`COUNT=$(grep -cE '<script[^>]*src=' output.html); [ "$COUNT" -le 8 ]`).
- **D-10 — Pi-hardware UAT deferred:** Same carry-forward pattern as Phase 33/34/35. `36-HUMAN-UAT.md` documents Pi items as `status: deferred`.

### Claude's Discretion

- Exact API shape of `bootHandleUi({...})` — researcher proposes (this doc), planner formalizes.
- Whether handle-ui / handle-drag / polygon-editor are split into smaller files during refactor — researcher recommends NO (preserves diff bound, existing architecture is internally cohesive).
- Exact ctx-trace harness implementation — researcher chooses (Proxy at `runtime-orchestration.js:1890` POLYGON_EDITOR.init wrap point + corresponding wrap at MAPPING.init at line 412 — both before init, capture every property access during operator-driven UAT).
- Wave parallelization within M3-M5 — researcher recommends sequential (file conflicts).
- Dashboard regression coverage form: researcher recommends keeping `test_phase35_dashboard_alignmode.py` as-is (the W0 file already POSTs to `/api/live/command`; the deferred-items.md "endpoint mismatch" was Phase 35-B's complaint about the original W0 task that targeted `/api/live/mutate` — that was already fixed during 35-A. The current failure is the `wait_for_function` timeout, which Phase 36 fixes by virtue of bringing up real handles).

### Deferred Ideas (OUT OF SCOPE)

- Pi-hardware visual UAT
- Internal modularization of handle-ui (1756 LOC monolith stays)
- Pixel-diff visual regression suite
- Phase 37 transformation banding
- Animation-engine refactor
- Server-side undo log
- Right-click forwarding to dashboard (D-05 lock is local rendering)

---

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` does NOT exist in the repo (verified via `ls`). No project-level enforcement rules apply beyond what CONTEXT.md and the existing `.planning/STATE.md` Decision Log carry forward (D-08 connection-stability invariant, VAAPI default-disabled, etc.).

---

## Phase Requirements

CONTEXT.md decisions D-01..D-10 ARE the requirement set (no separate REQ-IDs). Mapping each decision to the research support that enables it:

| Decision ID | Description | Research support |
|------------|------------|-----------------|
| D-01 | Option-H thin-export `bootHandleUi` | Full ctx inventory in §1; API shape proposal in §2 |
| D-02 | Overlay pointer-events:none on /output/ during align-mode | Receiver-bootstrap toggles overlay pointer-events at line 992 today; details in §3 |
| D-03 | 10 Playwright RED tests | Test design in §4; Phase 35 W0 fixtures + flake helper exist and are reusable (`conftest.py`, `with_server.py`, `_flake_retry.py`) |
| D-04 | Client-local undo via existing align-grid-snapshot | handle-ui line 1107 `undo()` + grid-state line 387 `broadcastGridSnapshot` already wired (verified) |
| D-05 | Local context menu (`.board-context-menu`) | handle-ui line 1278 `onContextMenu` + line 1378 `showContextMenu` create DOM with class `.board-context-menu` |
| D-06 | Dirty-flag broadcast | Existing pipeline uses `POST /api/align-mode-dirty` — see §5 reconciliation note |
| D-07 | ctx-inventur runtime-trace + AST union | Methodology + harness in §1.4 |
| D-08 | Connection-stability stays fail=0 | Regression check task in plan |
| D-09 | ≤8 src-based scripts | output.html currently has 1 src-based script tag (verified by grep) — budget healthy |
| D-10 | Pi UAT deferred | Carry-forward pattern |

---

## Standard Stack

This is a refactor inside existing TT Beamer code. No new dependencies introduced. Versions confirmed via `package.json` already in tree.

### Core (existing, reused)

| Module | Purpose | Why standard for this phase |
|--------|---------|----------------------------|
| `src/app/runtime/viewport/runtime-projection-handle-ui.js` (1756 LOC) | DOM lifecycle for grid handles, line canvas, context menu, toolbar | Refactor target — exposes new `bootHandleUi` |
| `src/app/runtime/viewport/runtime-projection-handle-drag.js` (941 LOC) | Drag handlers (vertex/midpoint/rotation/line/pan) | Refactor target — receives bootHandleUi-forwarded deps |
| `src/app/runtime/viewport/runtime-projection-mapping.js` (431 LOC) | Projection math, applyTransform, the existing parent init that fans out into grid-state/gl-renderer/2d-fallback/handle-ui/profile-persistence | Refactor target — `bootHandleUi` becomes a wrapper around `MAPPING.init(...)` |
| `src/app/runtime/viewport/runtime-projection-grid-state.js` | grid + srcXs/srcYs/points + undo stack + broadcastGridSnapshot | Init via MAPPING.init dependency-bag |
| `src/app/runtime/viewport/runtime-projection-profile-persistence.js` (732 LOC) | save/load/discard profile flows + dirty listeners + `notifyDirtyChanged` | Init via MAPPING.init dependency-bag |
| `src/app/runtime/polygon-editor/runtime-polygon-editor.js` (575 LOC) | renderRoomOverlay (the read path Phase 35-A audit missed) + drag sessions | Refactor target |
| `src/app/runtime/polygon-editor/runtime-polygon-editor-handles.js` (410 LOC) | SVG handle marker rendering | Init transitively from polygon-editor.js |
| `src/app/runtime/output-receiver/output-align-mode-loader.js` (381 LOC) | Phase 35-iter2 h1 lazy-loader + buildBoardAccess (real polygon data) | KEEP. Phase 36 swaps the call from `bootAlignMode` → `bootHandleUi` |
| `src/app/runtime/output-receiver/output-live-sync.js` (211 LOC) | thin WebSocket subscriber for /output/ — Phase 35-B | REUSE as-is — passed to `bootHandleUi` as the `liveSync` arg |
| `src/app/runtime/output-receiver/receiver-bootstrap.js` (1105 LOC) | WebRTC consumer + overlay pointer-events toggle | MODIFY: invert overlay-pointer-events logic per D-02 |

### Test (existing, reused)

| File | Purpose | Phase 36 use |
|-----|---------|--------------|
| `scripts/with_server.py` (249 LOC) | Server lifecycle wrapper (boots `node server.mjs` w/ tempdir config, polls `/api/ssr/ready`, captures stdout/stderr to file paths) | All Phase-36 Playwright tests use the `live_server` fixture from `conftest.py` which yields its `port` + `stderr_path` |
| `test/live-e2e/conftest.py` | Playwright fixtures (`live_server`, `chrome_browser`, `page`); skips on missing /opt/google/chrome/chrome | Reuse as-is |
| `test/live-e2e/_flake_retry.py` | `@flaky_3x` decorator (3× inline retry + opt-in skip on `WAVE0_FLAKE_TOLERANCE=1`) | Wrap every Phase 36 RED test |

**Verified versions** (from `npm view` is not applicable — these are first-party files. Phase 35-iter2 h2 commit `bb7f2e2` set the lazy-loader pattern that Phase 36 inherits.)

### Alternatives Considered

| Instead of `bootHandleUi` | Could use | Tradeoff |
|---------------------------|-----------|----------|
| Keep Phase 35-A `bootAlignMode` | Add 30 more named args to compensate for missing fields | Phase 35-iter2 proved this audit-and-stub spiral is bottomless. |
| Split handle-ui into 4 sub-modules | One file per concern (drag / handle-DOM / context-menu / toolbar) | Adds ~3000 LOC of refactor diff. The 1756-LOC file IS internally cohesive (Phase 27 split already drew the boundary at handle-drag); further split is internal cleanup, not Phase 36 scope (CONTEXT.md deferred). |
| Re-use `bootAlignMode` on /output/ + extend on dashboard | Two boot functions, dashboard inline | Defeats Option H "single boot function for both paths" (D-01). |

---

## Architecture Patterns

### Recommended file layout (additive, no moves)

```
src/app/runtime/
├── viewport/
│   ├── runtime-projection-handle-ui.js           # 1756 LOC (UNCHANGED INTERNAL — receives deps via init dep-bag)
│   ├── runtime-projection-handle-drag.js         # 941 LOC (UNCHANGED INTERNAL)
│   ├── runtime-projection-mapping.js             # 431 LOC (UNCHANGED INTERNAL — already does the fan-out init)
│   ├── runtime-projection-grid-state.js          # MODIFY ONE LINE: read `liveSyncCore` from explicit dep, fall back to window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE
│   └── runtime-projection-profile-persistence.js # 732 LOC (UNCHANGED INTERNAL — already exports notifyDirtyChanged via window namespace)
├── polygon-editor/                               # ALL UNCHANGED
└── output-receiver/
    ├── boot-handle-ui.js                         # NEW — Option-H entry. ~250 LOC.
    ├── output-align-mode-loader.js               # MODIFY: import bootHandleUi instead of bootAlignMode; pass full inventory
    ├── output-align-mode.js                      # KEEP as Phase-35-A historical reference, NOT loaded
    ├── output-live-sync.js                       # UNCHANGED (211 LOC)
    ├── receiver-bootstrap.js                     # MODIFY: invert overlay pointer-events logic per D-02
    └── receiver-input-forwarder.js               # UNCHANGED — goes dormant via overlay state
```

### Pattern 1: Single-arg-object boot function

Mirror of `bootReceiver(args)` / `bootOutputAudioBinder(args)` / `bootOutputLiveSync(args)` / `bootAlignMode(args)`. Each takes ONE plain object, named fields, returns `{ stop }`.

```js
// src/app/runtime/output-receiver/boot-handle-ui.js
export function bootHandleUi({
  // DOM roots
  stage, roomOverlay, videoEl,
  // State + role
  state, outputRole, OUTPUT_ROLE_FINAL, OUTPUT_ROLE_CONTROL,
  // Live-sync subscription (used for align-mode + profile change)
  liveSync,
  // Board / polygon data
  boardAccess, polygonContract, normalizers, polygonState,
  // Interaction guards
  interactions,
  // Persistence flow
  persistence,
  // Sync stubs (dashboard sync helpers — no-ops on /output/)
  sync, dashboard,
  // Cross-module callbacks owned by the caller
  renderRoomOverlay, showToast, getRenderMode, getBoardId,
  // Live-sync-core override (NEW — Phase 36): explicit broadcast channel
  // for grid mutations; if absent grid-state falls back to its global lookup.
  liveSyncCoreOverride,
  // Dirty-flag wiring (NEW — Phase 36): explicit POST URL or callback
  alignModeDirtyEndpoint,
  logger,
}) { ... return { stop } }
```

**When to use:** Always. This is the only entry-point both dashboard and /output/ call. Dashboard's existing `runtime-orchestration.js` MAPPING.init at line 412 + POLYGON_EDITOR.init at line 1890 BOTH get refactored to `bootHandleUi(...)` with identical args.

### Pattern 2: Lazy-loaded bundle with prefetch (Phase 35-iter2 h1)

`output-align-mode-loader.js` already implements: subscribe to `liveSync.onAlignModeChange`, on `true` `await loadBundleOnce()`, fetch `/api/boards` + `/api/live/snapshot`, build real `boardAccess`, call `bootAlignMode` (Phase 36: `bootHandleUi`). 2-second post-load background prefetch.

**Phase 36 modification:** swap the `bootAlignMode` call at line 268 to `bootHandleUi`. Pass the same args (already populated in the loader). Add the new args (e.g. `liveSyncCoreOverride: liveSync` so the loader passes the thin liveSync as the broadcast channel — see §1.5).

### Pattern 3: Anti-patterns to avoid (Phase 35 lessons reinforced)

- **Grep-based ctx audit.** Phase 35-A counted `ctx.X` directly and called the rest "no-op". `ctx.state` is an OBJECT, the IIFE files do `state.shipPolygonEditor.dragVertexIndex` — no `ctx.` prefix on the sub-key reads. Runtime-trace catches everything.
- **Hidden cross-IIFE bindings.** grid-state imports `window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE` for broadcast. handle-ui imports `window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE` for ESC/discard. NONE of these survive the AST scan because they're `window.X` accesses, not `ctx.X`. The runtime-trace must include a Proxy on `window` (or at minimum log every `window.TT_BEAMER_*` access) during the dashboard UAT.
- **Stub-by-grep for dashboard-only fields.** Replaced by D-07 inventory + explicit no-op-with-rationale stubs.
- **`<script defer>` for every IIFE.** Phase 35-iter2 h1 fixed; D-09 BLOCKING grep-assertion prevents regression.
- **Two competing event-handling models layered.** Phase 35-A iter2 layered hitTestVertex (model A) + handle DOM (model B). D-02 (a) eliminates by making one path active per align-mode state.

---

## §1 — ctx-Inventur (D-07)

### §1.1 — AST scan results (verified via `grep -oE "ctx\.[a-zA-Z_][a-zA-Z0-9_]*" <file> | sort -u`)

**runtime-projection-handle-ui.js** (1756 LOC) — 12 total references / 3 unique:
- `ctx.outputRole` — read only
- `ctx.OUTPUT_ROLE_FINAL` — read only
- `ctx.renderRoomOverlay` — call (post-line-add/remove + various rebuild paths)

**runtime-projection-handle-drag.js** (941 LOC) — 7 references / 1 unique:
- `ctx.renderRoomOverlay` — call (post-drag-end paths)

**runtime-projection-mapping.js** (431 LOC) — 4 references / 3 unique:
- `ctx.outputRole`
- `ctx.OUTPUT_ROLE_FINAL`
- `ctx.getRenderMode` — call

**runtime-polygon-editor.js** (575 LOC) — 109 references / 41 unique:

| Field | Type | Direct consumer | Audit-relevant |
|-------|------|-----------------|----------------|
| `ctx.state` | OBJECT (sub-keys read) | renderRoomOverlay + every drag handler | **READ — Phase 35-A's NUMBER ONE miss: state is destructured into 25+ sub-keys, none of which appear in a `ctx.X` grep.** |
| `ctx.roomOverlay` | DOM SVGElement | renderRoomOverlay (replaceChildren), drag setPointerCapture | READ |
| `ctx.outputRole` | string | renderRoomOverlay early-out | READ |
| `ctx.OUTPUT_ROLE_FINAL` | string | renderRoomOverlay early-out + remap-grid-point branch | READ |
| `ctx.OUTPUT_ROLE_CONTROL` | string | renderRoomOverlay click handler | READ |
| `ctx.triggerFeedback` | DOM elem | drag end paths (visual feedback) | READ — on /output/ this can be a hidden `<div>` |
| `ctx.getBoard` | fn() | renderRoomOverlay first call | CALL |
| `ctx.getRoomPoints` | fn(room, boardId) | renderRoomOverlay polygon points | CALL — **read path Phase 35-A missed** |
| `ctx.getRoomPolygonPoints` | fn(boardId, roomId) | drag commit | CALL |
| `ctx.setRoomPolygonPoints` | fn(boardId, roomId, points) | drag commit | CALL — no-op on /output/ (read-only) |
| `ctx.getShipPolygonPoints` | fn(boardId) | beginShipPolygonVertexDrag | CALL — **read path missed** |
| `ctx.setShipPolygonPoints` | fn(boardId, pts) | drag commit | CALL — no-op on /output/ |
| `ctx.getPlayAreas` | fn(boardId) | renderRoomOverlay handles | CALL |
| `ctx.getRoomLabelPosition` | fn(room, boardId) | renderRoomOverlay labels | CALL |
| `ctx.getSpecialRooms` | fn(boardId) | renderRoomOverlay special rooms | CALL |
| `ctx.getCurrentPolygonHandleScale` | fn() | renderRoomOverlay stroke width | CALL |
| `ctx.normalizeShipPolygon` | fn(pts) | various | CALL |
| `ctx.normalizePolygonPoint` | fn(pt) | drag math | CALL |
| `ctx.remapGridPoint` | fn(nx, ny) | renderRoomOverlay /output/ branch | CALL — **on /output/ this MUST point to projection-mapping.remapPoint** |
| `ctx.hasGridDisplacements` | fn() | renderRoomOverlay /output/ branch | CALL — **same** |
| `ctx.mapClientPointToNormalized` | fn(cx, cy) | drag start | CALL |
| `ctx.beginPolygonDragInteraction` | fn() | drag start | CALL |
| `ctx.endPolygonDragInteraction` | fn() | drag end | CALL |
| `ctx.isPanArbitrating` | fn() | renderRoomOverlay click guard | CALL |
| `ctx.isAcceptablePolygonPointerEvent` | fn(event) | drag start | CALL |
| `ctx.areRoomVerticesEditable` | fn() | drag start | CALL |
| `ctx.cacheRoomPolygonDragDomRefs` | fn(roomId) | drag start | CALL — Phase 35-A correctly identified as no-op-safe on /output/ |
| `ctx.cacheShipPolygonDragDomRefs` | fn() | drag start | CALL — same |
| `ctx.persistBoardProfiles` | fn() | drag commit | CALL — no-op on /output/ (server has its own persistence path) |
| `ctx.pushUndoState` | fn(desc) | drag start | CALL |
| `ctx.handleQuickModeRoomTap` | fn(roomId) | renderRoomOverlay click | CALL — dashboard-only; no-op on /output/ |
| `ctx.applyRoomDraftTargetFromRoomClick` | fn(roomId) | renderRoomOverlay click | CALL — dashboard-only; no-op on /output/ |
| `ctx.isQuickModeActive` | fn() | renderRoomOverlay click | CALL — dashboard-only; returns `false` on /output/ |
| `ctx.isRoomFrozen` | fn(boardId, roomId) | renderRoomOverlay class | CALL |
| `ctx.getActivePolygonRoomId` | fn(boardId) | drag/render | CALL |
| `ctx.setActivePolygonRoomId` | fn(boardId, roomId) | drag start | CALL |
| `ctx.refreshPersistentRoomSelectionVisualState` | fn() | drag end | CALL — dashboard-only; no-op on /output/ |
| `ctx.syncRoomPanelFromSelection` | fn(opts) | various | CALL — dashboard-only; no-op |
| `ctx.syncSelectedRoomStateForBoard` | fn(boardId) | renderRoomOverlay top | CALL — dashboard-only; no-op |
| `ctx.syncPolygonEditorPanel` | fn() | drag end | CALL — dashboard-only; no-op |
| `ctx.syncPolygonEditorStatus` | fn() | drag end | CALL — dashboard-only; no-op |
| `ctx.syncShipPolygonEditorStatus` | fn() | drag end | CALL — dashboard-only; no-op |

**runtime-polygon-editor-handles.js** (410 LOC) — additional surface:
- `ctx.shipPolygonEdgeSelect` — DOM `<select>` (dashboard-only; pass `null` on /output/ — but file dereferences it without nullcheck; needs `null` to be safe **or a stub object with `.value` setter**)
- `ctx.polygonEdgeSelect` — same pattern
- `ctx.getSelectedPlayAreaId` — fn(boardId)
- `ctx.getBoardZoom` — fn(boardId) — returns `{ scale }`
- `ctx.getPolygonEditorHandleMetrics` — fn(zoomScale, handleScale) — returns `{ size, ... }`
- `ctx.arePlayAreaVerticesEditable` — fn() — returns boolean
- `ctx.syncShipPolygonVertexSelect` — fn() — dashboard-only; no-op
- `ctx.syncPolygonVertexSelect` — fn(roomId) — dashboard-only; no-op
- `ctx.syncPolygonEdgeSelect` — fn(roomId) — dashboard-only; no-op
- `ctx.setPlayAreaPolygon` — fn(boardId, areaId, polygon) — write path; no-op on /output/

### §1.2 — `state` sub-key inventory (the Phase 35-A blind spot)

`ctx.state` is an OBJECT not a function. Every field below is read or written by direct sub-key access in runtime-polygon-editor.js (verified via `grep -oE "state\.[a-zA-Z_].*"`):

| Sub-key | Type | Read/Write | Purpose |
|---------|------|------------|---------|
| `state.boardId` | string | R | Active board (drives all data lookups) |
| `state.alignMode` | bool | R | renderRoomOverlay early-out gate |
| `state.uiView` | "settings"\|"dashboard" | R | Click handler branch (settings = polygon-edit; dashboard = quick-mode tap) |
| `state.selectedRoomId` | string\|null | R/W | Set on click |
| `state.selectedRoomByBoard` | obj | R/W | Per-board selection memory |
| `state.lastPolygonFocus` | obj | R/W | Drag focus retention |
| `state.polygonEditor.activeRoomIdByBoard` | obj | R/W | Active polygon-room |
| `state.polygonEditor.dragVertexIndex` | int\|null | R/W | Vertex drag session |
| `state.polygonEditor.dragPointerId` | int\|null | R/W |  |
| `state.polygonEditor.dragBoardId` | string | R/W |  |
| `state.polygonEditor.dragRoomId` | string | R/W |  |
| `state.polygonEditor.dragStartPoints` | arr | R/W |  |
| `state.polygonEditor.dragMoved` | bool | R/W |  |
| `state.polygonEditor.dragVertexOffsetX` | num | R/W |  |
| `state.polygonEditor.dragVertexOffsetY` | num | R/W |  |
| `state.polygonEditor.dragDomRefs` | obj\|null | R/W |  |
| `state.polygonEditor.dragAreaBoardId` | string | R/W | Area drag (whole-polygon-pan-by-handle) |
| `state.polygonEditor.dragAreaRoomId` | string | R/W |  |
| `state.polygonEditor.dragAreaPointerId` | int | R/W |  |
| `state.polygonEditor.dragAreaStartPointerPoint` | arr | R/W |  |
| `state.polygonEditor.dragAreaStartPoints` | arr | R/W |  |
| `state.polygonEditor.dragAreaMoved` | bool | R/W |  |
| `state.polygonEditor.dragAreaDomRefs` | obj | R/W |  |
| `state.polygonEditor.pendingAreaBoardId` | string | R/W | Pending (pre-promote) |
| `state.polygonEditor.pendingAreaRoomId` | string | R/W |  |
| `state.polygonEditor.pendingAreaPointerId` | int | R/W |  |
| `state.polygonEditor.pendingAreaStartPointerPoint` | arr | R/W |  |
| `state.polygonEditor.selectedVertexIndex` | int\|null | R/W |  |
| `state.polygonEditor.selectedEdgeIndex` | int\|null | R/W |  |
| `state.polygonEditor.vertexSelectionActive` | bool | R/W |  |
| `state.polygonEditor.suppressRoomClickUntil` | num | R/W | timestamp ms |
| `state.polygonEditor.roomNamesVisible` | bool | R |  |
| `state.polygonEditor.rotatingRoomId` | string\|null | R | renderRoomOverlay class |
| `state.shipPolygonEditor.dragVertexIndex` | int\|null | R/W | Ship-polygon drag session — same shape as polygonEditor.* |
| `state.shipPolygonEditor.dragPointerId` | int\|null | R/W |  |
| `state.shipPolygonEditor.dragBoardId` | string | R/W |  |
| `state.shipPolygonEditor.dragStartPoints` | arr | R/W |  |
| `state.shipPolygonEditor.dragMoved` | bool | R/W |  |
| `state.shipPolygonEditor.dragVertexOffsetX` | num | R/W |  |
| `state.shipPolygonEditor.dragVertexOffsetY` | num | R/W |  |
| `state.shipPolygonEditor.dragDomRefs` | obj | R/W |  |
| `state.shipPolygonEditor.selectedVertexIndex` | int\|null | R/W |  |
| `state.shipPolygonEditor.selectedEdgeIndex` | int\|null | R/W |  |
| `state.shipPolygonEditor._lastEdgeTap` | obj\|null | R/W | Double-tap heuristic |
| `state.renderMode` | "auto"\|"2d"\|"gl" | R | mapping init |
| `state.runtime.activeProjectionProfileId` | string\|null | R | Initial profile (from snapshot) |

**Action for Phase 36:** `bootHandleUi`'s `state` arg MUST contain ALL these sub-keys, fully initialized. The Phase 35-iter2 h1 loader already builds a stub state object at lines 238-249; the planner must extend it to cover the full table above. Recommendation: copy the dashboard's `createInitialState({})` from runtime-state.js (which produces the canonical shape) and adopt it on /output/.

### §1.3 — Hidden window-global accesses (Phase 35-A's silent killers)

Verified via `grep -nE "window\.TT_BEAMER_"` across the four files:

| Hidden access | File | Phase 36 fix |
|--------------|------|---------------|
| `window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_DRAG` (parse-time) | handle-ui.js:55 | Already present in lazy-loader bundle. **VERIFIED** loadable on /output/. |
| `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE` (call-time) | handle-ui.js:1173, 1644; handle-drag.js:67 | Already in bundle. |
| `window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE` (call-time) | handle-ui.js:662 (ESC/discardChanges); profile-persistence's own subscriber | Already in bundle. |
| `window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE` (call-time) | grid-state.js:389 (broadcastGridSnapshot) | **NOT IN /output/ BUNDLE.** Today the broadcast silently logs a warn and returns. Phase 36 needs an explicit fix: pass a thin `liveSync`-backed shim. |
| `window.TT_BEAMER_RUNTIME_POLYGON_EDITOR_HANDLES` (init-time) | polygon-editor.js:25, 548 | Already in bundle. |
| `window.TT_BEAMER_RUNTIME_POLYGON_CONTRACT` | (multiple) | In bundle. |
| `window.TT_BEAMER_RUNTIME_POLYGON_NORMALIZERS` | bundle / loader builds | In bundle. |

**Critical fix #1:** Phase 36 must wire `broadcastGridSnapshot` to use the thin `output-live-sync.js` (which sends WS frames directly to `/api/live/ws`) when run on /output/. Two options:
- (i) Add a `liveSyncCoreOverride` arg to grid-state init that, if present, replaces the `window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE` lookup. The override would be a thin wrapper exposing `emitLiveMutation(mutationType, payload)` that calls `ws.send(JSON.stringify({type: "live-mutation", mutationType, payload, ...}))`. The output-live-sync module's `ws` is private; we'd need to add a `ws.send` proxy method to its return shape.
- (ii) Change grid-state.js to DI: `let liveSyncCore = null; function init(deps) { liveSyncCore = deps.liveSyncCore || window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE; }`.

**Recommendation:** (ii). Smaller diff inside grid-state, parallel to how mapping-init already works. The output-live-sync module exports an `emitMutation(type, payload)` method (NEW) that the loader passes as `liveSyncCore` to bootHandleUi.

### §1.4 — Runtime-trace harness design (D-07)

Goal: confirm the AST scan + state-key inventory is complete by observing actual property accesses during operator UAT.

**Recommended structure:**

```js
// Drop into runtime-orchestration.js BEFORE lines 412 (MAPPING.init) and 1890 (POLYGON_EDITOR.init).
// Gate behind URL flag ?ctx-trace=1 so production runs are unaffected.
const _tracingEnabled = /[?&]ctx-trace=1\b/.test(location.search);
function _wrapCtxForTrace(ctx, label) {
  if (!_tracingEnabled) return ctx;
  const accessed = new Set();
  const handler = {
    get(target, key) {
      if (typeof key === "string") accessed.add(`${label}.${key}`);
      const v = target[key];
      // Recursively wrap state and any nested objects on first access.
      if (key === "state" && v && typeof v === "object") {
        return _wrapStateForTrace(v, `${label}.state`, accessed);
      }
      return v;
    },
    set(target, key, val) {
      if (typeof key === "string") accessed.add(`${label}.${key}=`);
      target[key] = val; return true;
    },
  };
  const proxy = new Proxy(ctx, handler);
  window._ctxTraceAccessed = window._ctxTraceAccessed || new Set();
  window._ctxTraceDump = () => Array.from(window._ctxTraceAccessed).sort();
  // Mirror onto global so the dashboard tester can `console.log(window._ctxTraceDump())` after UAT.
  setInterval(() => { for (const a of accessed) window._ctxTraceAccessed.add(a); }, 1000);
  return proxy;
}
function _wrapStateForTrace(state, label, accessed) {
  return new Proxy(state, {
    get(target, key) {
      if (typeof key === "string") accessed.add(`${label}.${key}`);
      const v = target[key];
      if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof HTMLElement)) {
        return _wrapStateForTrace(v, `${label}.${key}`, accessed);
      }
      return v;
    },
    set(target, key, val) {
      if (typeof key === "string") accessed.add(`${label}.${key}=`);
      target[key] = val; return true;
    },
  });
}

// Wrap before each init.
const tracedMappingCtx = _wrapCtxForTrace(mappingDepBag, "mapping.ctx");
window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING.init(tracedMappingCtx);
// ... and same for POLYGON_EDITOR.init.

// Also instrument every window.TT_BEAMER_* access by replacing the window
// namespace with a wrapper, OR — simpler — just `console.log` from inside
// the four target files at every named access, gated on the URL flag.
```

**UAT script for the operator (drives the trace):** open the dashboard with `?ctx-trace=1`, then in sequence:
1. Toggle align-mode ON
2. Drag corner handle (vertex 0 / TL)
3. Drag midpoint between two corners
4. Drag an interior vertex
5. Drag rotation handle
6. Click empty area, drag (image-pan)
7. Right-click on a line → context menu → "Add line through this point"
8. Right-click on the new line → "Delete this line"
9. CTRL+Z (undo)
10. Click "Save profile" toolbar button
11. Click "Discard" toolbar button
12. ESC
13. Toggle align-mode OFF
14. Switch boards
15. Switch back, repeat (3) and (10)

Then in devtools console: `copy(JSON.stringify(window._ctxTraceDump()))` and the planner pastes the result into PLAN.md as the authoritative inventory.

**Parallel: AST scan command.**

```bash
grep -hoE "ctx\.[a-zA-Z_][a-zA-Z0-9_]*" \
  src/app/runtime/viewport/runtime-projection-handle-ui.js \
  src/app/runtime/viewport/runtime-projection-handle-drag.js \
  src/app/runtime/viewport/runtime-projection-mapping.js \
  src/app/runtime/polygon-editor/runtime-polygon-editor.js \
  src/app/runtime/polygon-editor/runtime-polygon-editor-handles.js \
  src/app/runtime/polygon-editor/runtime-polygon-editor-panels.js \
  src/app/runtime/polygon-editor/runtime-polygon-context-menu.js \
  src/app/runtime/polygon-editor/runtime-polygon-rotation.js \
  src/app/runtime/polygon-editor/runtime-polygon-undo.js \
  | sort -u
```

Plus this one for `state.X` sub-keys:
```bash
grep -hoE "(^|[^.a-zA-Z_])state\.[a-zA-Z_][a-zA-Z0-9_.\[\]'\"]*" \
  <same files> | sed -E 's/^[^.a-zA-Z_]?//' | sort -u
```

Plus this one for `window.TT_BEAMER_*` accesses:
```bash
grep -hnE "window\.TT_BEAMER_[A-Z_]+" \
  src/app/runtime/viewport/*.js src/app/runtime/polygon-editor/*.js | sort -u
```

**Outcome:** AST union ∪ Runtime trace = authoritative inventory. Phase 35-A used only AST without `state.X` expansion → undercount by ~25 fields. Phase 36 uses both → empirically zero gap.

### §1.5 — Authoritative inventory table (proposed `bootHandleUi` arg shape)

The sections that follow group fields by their consumer-of-record. Stubs marked `🟡 no-op-on-/output/` are dashboard-only and have audit-traceable rationale.

#### DOM roots (pass HTMLElement / SVGElement actual references)

| Arg | Type | Source on dashboard | Source on /output/ |
|-----|------|---------------------|--------------------|
| `stage` | HTMLElement | `document.getElementById("stage")` from index.html | NEW: created by lazy-load bundle, appended to body |
| `roomOverlay` | SVGElement | `document.getElementById("room-overlay")` | NEW: created by lazy-load bundle, appended inside #stage |
| `videoEl` | HTMLVideoElement\|null | n/a (dashboard has no video) | `document.getElementById("ssr-video")` — already in output.html line 23 |

**Implication for output.html (Plan A3 file touch):** when align-mode loader fires, it APPENDS `<div id="stage">` containing an `<svg id="room-overlay">` to the body, NOT at page-init. /output/ stays at ≤8 src-based scripts (D-09 verified).

#### Live-sync subscription (D-04 / D-05 / D-06 wires)

| Arg | Type | Notes |
|-----|------|-------|
| `liveSync` | Object | Returned by `bootOutputLiveSync({...})` (Phase 35-B). Provides `onAlignModeChange`, `onProjectionProfileChange`, `getAlignMode`, `getActiveProjectionProfileId`, `getCurrentClientId`, `stop`. **Phase 36 may add `emitMutation(type, payload)` method to this module** — see §1.3 (i). |

#### Live-sync-core override (NEW for Phase 36)

| Arg | Type | Notes |
|-----|------|-------|
| `liveSyncCoreOverride` | `{emitLiveMutation: (type, payload) => Promise<void>}` \| null | If present, used by grid-state in place of the `window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE` global. On dashboard pass `null` (let it fall back to global, preserving existing behavior). On /output/ pass a thin wrapper around `liveSync.ws.send(...)`. |

Implementation hint:
```js
// In output-live-sync.js, expose ws.send as a dedicated method:
return { ..., emitLiveMutation: (mutationType, payload) => {
  ws?.send(JSON.stringify({
    type: "live-mutation",
    mutationId: `${mutationType}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    mutationType, payload,
    clientSentAt: new Date().toISOString(),
  }));
}};
```
Then loader passes `{ emitLiveMutation: liveSync.emitLiveMutation }` as `liveSyncCoreOverride`.

#### Board access (h2 boardAccess from Phase 35-iter2)

REUSE the existing `buildBoardAccess()` in `output-align-mode-loader.js:104-146`. Already wired with real `runtimeBoards`-backed methods. Pass as the `boardAccess` arg.

#### Polygon contract / normalizers / interactions / sync / dashboard / persistence

Same shape as Phase 35-A `bootAlignMode`'s arg bag (see `output-align-mode.js:54-213`). Phase 36 keeps the no-op stubs for dashboard-only fields BUT adds RATIONALE comments per stub (e.g. `// no-op on /output/: settings-panel sync runs only when uiView==="settings"; /output/'s state.uiView==="dashboard" so this branch never executes`).

#### Dirty endpoint (NEW for Phase 36)

| Arg | Type | Notes |
|-----|------|-------|
| `alignModeDirtyEndpoint` | string | Default `"/api/align-mode-dirty"`. profile-persistence currently hardcodes the path at line 598 — researcher recommends pass-through arg so /output/ tests can spy on it. |

#### Logger

| Arg | Type | Notes |
|-----|------|-------|
| `logger` | Console\|null | Defaults to `console`. |

---

## §2 — `bootHandleUi` API shape

### Full signature

```js
// src/app/runtime/output-receiver/boot-handle-ui.js
// Phase 36 D-01 (Option H) — first-class thin-export of the full handle-ui surface.
//
// Single entry-point that boots the align-mode UI for either /output/ (thin)
// or the dashboard (full). Calls MAPPING.init (which fans out into
// grid-state, gl-renderer, 2d-fallback, handle-ui, profile-persistence) and
// POLYGON_EDITOR.init in the right order with explicit named args. The four
// IIFE modules' internal init() signatures are NOT modified.
//
// Returns { stop, hitTestVertex }:
//   - stop()           — teardown
//   - hitTestVertex(x, y) — DOM-bbox lookup for receiver-input-forwarder
//                            (replaces Phase-34's 4-corner approximation
//                            when bootHandleUi is active)
export function bootHandleUi({
  // ── DOM roots ──
  stage,                    // HTMLElement — stage div
  roomOverlay,              // SVGElement — room overlay svg
  videoEl,                  // HTMLVideoElement|null — for letterbox-aware drag math
  feedbackEl,               // HTMLElement|null — visual-feedback target (defaults to detached div)
  // ── State + role ──
  state,                    // Object — full canonical shape (see §1.2)
  outputRole,               // "control"|"final-output"
  OUTPUT_ROLE_FINAL,        // "final-output"
  OUTPUT_ROLE_CONTROL,      // "control"
  // ── Live-sync ──
  liveSync,                 // Object — bootOutputLiveSync handle
  liveSyncCoreOverride,     // Object|null — { emitLiveMutation } shim for grid-state
  // ── Polygon data + normalizers ──
  polygonContract,          // Object|null
  normalizers,              // Object — { normalizePolygonPoint, getNormalizedPolygonArea, ... remapGridPoint, hasGridDisplacements }
  boardAccess,              // Object — { getBoard, getBoards, getRoomPolygonPoints, ... }
  polygonState,             // Object — { getActivePolygonRoomId, isRoomFrozen, getCurrentPolygonHandleScale, getPolygonEditorHandleMetrics }
  interactions,             // Object — { beginPolygonDragInteraction, endPolygonDragInteraction, isPanArbitrating, isAcceptablePolygonPointerEvent, areRoomVerticesEditable, mapClientPointToNormalized, setPlayAreaPolygon }
  // ── Persistence ──
  persistence,              // Object — { persistBoardProfiles, pushUndoState, saveProjectionMapping }
  alignModeDirtyEndpoint,   // string — defaults "/api/align-mode-dirty"
  // ── Sync (dashboard) and dashboard-only stubs ──
  sync,                     // Object — { syncShipPolygonEditorStatus, syncShipPolygonVertexSelect, syncPolygonVertexSelect, syncPolygonEdgeSelect, syncPolygonEditorStatus, syncPolygonEditorPanel, syncRoomPanelFromSelection, syncSelectedRoomStateForBoard, refreshPersistentRoomSelectionVisualState }
  dashboard,                // Object — { isQuickModeActive, handleQuickModeRoomTap, applyRoomDraftTargetFromRoomClick, cacheShipPolygonDragDomRefs, cacheRoomPolygonDragDomRefs }
  // ── Cross-module callbacks owned by the caller ──
  renderRoomOverlay,        // fn() — Optional override; if null, falls back to POLYGON_EDITOR.renderRoomOverlay
  showToast,                // fn(...args) — Optional
  getRenderMode,            // fn() — returns "auto"|"2d"|"gl"
  getBoardId,               // fn() — returns active board id
  // ── Diagnostic ──
  logger = console,
}) {
  // 1. Resolve IIFE modules from window.TT_BEAMER_*. Throw if missing.
  // 2. Patch grid-state's broadcast channel: if liveSyncCoreOverride passed,
  //    expose it on grid-state via a NEW init field `liveSyncCoreOverride`.
  // 3. Build mappingInitArgs — pass everything, MAPPING.init fans out.
  // 4. Build polygonCtx (the 60-field bag) — explicit field-by-field assembly
  //    with rationale comments on each no-op stub.
  // 5. Wire liveSync subscriptions: onAlignModeChange (toggle handles +
  //    body class), onProjectionProfileChange (reload profile),
  //    onDisconnect (warn).
  // 6. Window resize listener.
  // 7. hitTestVertex via HANDLE_UI.hitTestVertex (or DOM-bbox walk fallback).
  // 8. Return { stop, hitTestVertex } with clean teardown.
}
```

### Init-bundle question (research Q2)

CONTEXT.md raises: "is there a smaller 'init bundle' that handle-ui depends on (e.g., profile-persistence init) that should be exposed as its own `bootProfilePersistence({...})` and consumed by bootHandleUi?"

**Answer: NO additional sub-boots.** Verified architecture: `runtime-projection-mapping.js:344-410 init()` ALREADY does the fan-out: `gridState.init(...) → glRenderer.init(...) → fallback.init(...) → handleUi.init(...) → profilePersistence.init(...)`. Each receives `Object.assign({}, dependencies, {extra fields})`. **`bootHandleUi` becomes a thin wrapper around `MAPPING.init({...})` PLUS `POLYGON_EDITOR.init({...})` — the two existing entry points the dashboard already uses.**

The only NEW arg to push down through `MAPPING.init`'s `Object.assign` is `liveSyncCoreOverride`, which grid-state.init reads. No new `boot*` modules.

This is GOOD: it preserves the existing MAPPING.init parent-fan-out architecture and keeps the diff small. The plan must NOT extract a separate `bootProfilePersistence` (would re-enter Phase 35-A's "split everything" trap).

### Returned shape

```js
{
  stop(): void,                           // unmount handles, remove listeners, clean DOM, restore overlay pointer-events
  hitTestVertex(clientX, clientY): {row, col} | null,   // for receiver-input-forwarder fallback
  // Diagnostic:
  getInventoryActuallyExercised(): string[],   // optional — for AST/runtime trace cross-check
}
```

### Dashboard migration (additive, no breaking change)

Dashboard's `runtime-orchestration.js` lines 412-437 (MAPPING.init) and 1890-1951 (POLYGON_EDITOR.init) become a SINGLE `bootHandleUi(...)` call. Args populated from existing dashboard code (`stage`, `roomOverlay`, `state`, `boardAccess` derived from CONFIG_BOARDS, etc.). The two old inits become inside `bootHandleUi`'s body.

**Risk:** changing the dashboard's init order breaks regression. Mitigation:
- Keep both old inline inits in `runtime-orchestration.js` AS-IS for Phase 36 W0 + W1 wave.
- Add `bootHandleUi` as the NEW /output/-only entry-point first.
- ONLY after T1-T10 are GREEN, refactor the dashboard to also call `bootHandleUi` (last step of M3).
- Dashboard regression test (`test_phase35_dashboard_alignmode.py`) gates the dashboard-side migration.

---

## §3 — Event-handling implementation (D-02 (a))

### State transitions

| align-mode | overlay pointerEvents | handles pointerEvents | receiver-input-forwarder | Notes |
|-----------|----------------------|----------------------|--------------------------|-------|
| OFF | `"none"` (default in output.html line 51) | n/a (no handles in DOM) | dormant (no overlay events fire) | current Phase-34 fallback, dormant in operator usage |
| ON | `"none"` (Phase 36 invert) | `"auto"` (default — was `"none !important"` in Phase 35-A; Phase 36 REMOVES the `!important` rule) | dormant (overlay = none → no events) | Handle DOM (z:9999) captures clicks |

### Code changes

**File 1: `src/app/runtime/output-receiver/receiver-bootstrap.js`** (line 992)

```js
// CURRENT (Phase 34 + Phase 35-iter2):
overlayEl.style.pointerEvents = alignMode ? "auto" : "none";

// PHASE 36 (D-02 inversion):
// When align-mode is ON, the overlay must NOT capture clicks — handles
// (z:9999, pointer-events:auto) capture them directly via bootHandleUi.
// When align-mode is OFF, the overlay also stays "none" because /output/
// has no other interactive surface (the receiver is read-only outside
// align-mode). The legacy receiver-input-forwarder path is dormant.
overlayEl.style.pointerEvents = "none";
```

(Equivalent: just remove the toggle. Static `"none"` — already the default in output.html line 51 inline style.)

**File 2: `src/styles.css`** lines 198-213

```css
/* DELETE (Phase 35-A's pointer-events:none !important rule on handles): */
body[data-output-role="final-output"].align-mode-active .projection-corner-handle,
body[data-output-role="final-output"].align-mode-active .projection-grid-handle,
body[data-output-role="final-output"].align-mode-active #projection-grid-line-canvas {
  pointer-events: none !important;
}
```

After removal: handles' inline `pointer-events: auto` (set by handle-ui at handle-creation time) stays effective. No `!important` competition.

### Image-pan area routing

When operator clicks BETWEEN handles in free area:
- Click goes to `#stage` (z-index lower than handles, higher than `#ssr-input-overlay`'s `none`).
- `#projection-grid-line-canvas` has `z:9997` and `pointer-events:auto` — sits ABOVE the stage div. handle-ui's `lineCanvas.addEventListener("pointerdown", onLinePointerDown)` (line 1095 in handle-ui.js) catches it. `onLinePointerDown` runs hit-test: if line hit → line drag; if empty → pan drag.
- **CONCLUSION:** image-pan works via `lineCanvas` capturing clicks. The `#stage` div doesn't need its own pointer-events handler. No new code path needed.

### Race condition analysis

The CSS rule removal (Phase 36) is a static change. The only "transition race" risk is:
1. liveSync fires `onAlignModeChange(true)`
2. Loader calls `bootHandleUi({...})` — async because of `await loadBundleOnce()`
3. Between (1) and bundle-load-complete, handles do NOT exist in DOM — overlay capturing isn't a problem (overlay is `none`).
4. Bundle loads → `HANDLE_UI.showHandles()` runs → handles appear with `pointer-events: auto`.

Test T10 covers this: trigger gesture, count mutations — exactly ONE.

### Receiver-input-forwarder coexistence

`receiver-input-forwarder` calls `attachInputForwarder({overlayEl, ...})` (line 1018 receiver-bootstrap). Listeners are bound to `overlayEl`. With `overlayEl.style.pointerEvents === "none"` always, **NO pointer events ever reach the forwarder.** It's dormant by construction. No code changes to `receiver-input-forwarder.js` itself. T10 asserts no `[input-forwarder] sent phase=start` console line during a gesture.

---

## §4 — RED test design (D-03)

Each Phase 36 test under `test/live-e2e/test_phase36_*.py`. Reuses `live_server` + `page` fixtures from `conftest.py`. Wraps with `@flaky_3x`.

### Common test scaffold

```python
# test/live-e2e/test_phase36_align_handles.py
"""Phase 36 RED test rail — comprehensive align-mode on /output/.

T1-T10 from CONTEXT.md D-03. All BLOCKING: no Phase 36 production code lands
until these exist and FAIL. They transition to GREEN when the corresponding
implementation wave (M3-M5) lands.
"""
from __future__ import annotations
import json, time, urllib.request
import pytest
from _flake_retry import flaky_3x


def _trigger_align_mode(port: int, on: bool) -> None:
    body = json.dumps({"mutationType": "context-update",
                       "payload": {"alignMode": bool(on)}}).encode()
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}/api/live/command",
        data=body, headers={"content-type": "application/json"})
    urllib.request.urlopen(req, timeout=5).read()


def _open_output_align_on(live_server, page):
    page.goto(f"http://127.0.0.1:{live_server['port']}/output/",
              wait_until="domcontentloaded", timeout=15_000)
    page.wait_for_function(
        "document.querySelector('video.ssr-video, video')?.readyState === 4",
        timeout=10_000)
    _trigger_align_mode(live_server["port"], True)
    # bootHandleUi is lazy-loaded — wait for handles to render
    page.wait_for_function(
        "document.querySelectorAll('.projection-corner-handle').length > 0",
        timeout=8_000)
```

### Per-test design

#### T1 — Sizing (handle frame visually aligned with stream content)

```python
@flaky_3x
def test_t1_handle_frame_matches_stream_content(live_server, page):
    _open_output_align_on(live_server, page)
    # Compute video bbox + handle-frame bbox; assert bounds within 4px on each axis.
    rect = page.evaluate("""(() => {
        const v = document.querySelector('video.ssr-video');
        const h = document.querySelectorAll('.projection-corner-handle');
        if (!v || !h.length) return null;
        const vb = v.getBoundingClientRect();
        // 4 corner handles — TL/TR/BL/BR.
        const xs = Array.from(h).map(el => el.getBoundingClientRect());
        const minLeft = Math.min(...xs.map(r=>r.left+r.width/2));
        const minTop = Math.min(...xs.map(r=>r.top+r.height/2));
        const maxLeft = Math.max(...xs.map(r=>r.left+r.width/2));
        const maxTop = Math.max(...xs.map(r=>r.top+r.height/2));
        return { vb_l: vb.left, vb_t: vb.top, vb_r: vb.right, vb_b: vb.bottom,
                 hl: minLeft, ht: minTop, hr: maxLeft, hb: maxTop };
    })()""")
    assert rect is not None
    assert abs(rect["hl"] - rect["vb_l"]) < 4, f"handle-frame left misaligned: {rect}"
    assert abs(rect["ht"] - rect["vb_t"]) < 4, f"handle-frame top: {rect}"
    assert abs(rect["hr"] - rect["vb_r"]) < 4, f"handle-frame right: {rect}"
    assert abs(rect["hb"] - rect["vb_b"]) < 4, f"handle-frame bottom: {rect}"
```

#### T2 — Corner pulls (4 corners change stream)

```python
@flaky_3x
def test_t2_corner_pulls_emit_align_grid_snapshot(live_server, page):
    _open_output_align_on(live_server, page)
    for corner_idx in range(4):
        handle = page.locator(".projection-corner-handle").nth(corner_idx)
        b = handle.bounding_box()
        page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
        page.mouse.down()
        page.mouse.move(b["x"]+b["width"]/2 + 20, b["y"]+b["height"]/2 + 20, steps=4)
        page.mouse.up()
        time.sleep(0.5)
    # Server log should show ≥4 [align-grid-snapshot] EMIT lines (one per drag-end).
    with open(live_server["stdout_path"]) as f:
        log = f.read()
    n_emits = log.count("[align-grid-snapshot] server-recv")
    assert n_emits >= 4, f"expected ≥4 align-grid-snapshot mutations, got {n_emits}\nLog tail:\n{log[-2000:]}"
```

#### T3 — Vertex drag (right vertex grabs)

```python
@flaky_3x
def test_t3_vertex_drag_modifies_correct_vertex(live_server, page):
    _open_output_align_on(live_server, page)
    # Grab the SECOND vertex (data-row=0 data-col=1 in a 3x3 grid)
    handle = page.locator('.projection-corner-handle[data-row="0"][data-col="1"]').first
    b = handle.bounding_box()
    page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
    page.mouse.down()
    page.mouse.move(b["x"]+b["width"]/2 + 30, b["y"]+b["height"]/2, steps=5)
    page.mouse.up()
    time.sleep(0.5)
    # Server snapshot should show the vertex (row=0, col=1) shifted; (0,0) and (0,2) unchanged.
    snap = page.evaluate(f"""fetch('http://127.0.0.1:{live_server['port']}/api/live/snapshot')
        .then(r=>r.json())""")
    last = snap.get("snapshot", snap).get("runtime", {}).get("lastAlignGridSnapshot", {})
    pts = last.get("points", [])
    p_dragged = next((p for p in pts if p["row"]==0 and p["col"]==1), None)
    p_anchor = next((p for p in pts if p["row"]==0 and p["col"]==0), None)
    assert p_dragged and p_anchor
    # Dragged x should be substantially different from anchor (the gesture moved 30px right)
    assert p_dragged["x"] - p_anchor["x"] > 0.2, f"vertex (0,1) didn't move past (0,0): {pts}"
```

#### T4 — Midpoint drag (squish bar)

```python
@flaky_3x
def test_t4_midpoint_drag_emits_squish(live_server, page):
    _open_output_align_on(live_server, page)
    # Squish bars are .projection-grid-handle (or a dedicated subclass) — confirm via DOM.
    page.wait_for_function(
        "document.querySelectorAll('.projection-grid-handle').length > 0", timeout=4_000)
    bar = page.locator(".projection-grid-handle").first
    b = bar.bounding_box()
    page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
    page.mouse.down()
    page.mouse.move(b["x"]+b["width"]/2 + 15, b["y"]+b["height"]/2, steps=4)
    page.mouse.up()
    time.sleep(0.5)
    with open(live_server["stdout_path"]) as f:
        log = f.read()
    assert "[align-grid-snapshot] server-recv" in log
```

#### T5 — Rotation handle

```python
@flaky_3x
def test_t5_rotation_handle_emits_mutation(live_server, page):
    _open_output_align_on(live_server, page)
    page.wait_for_function(
        "document.querySelectorAll('.projection-rotation-handle, [data-handle-role=\"rotate\"]').length > 0",
        timeout=4_000)
    rot = page.locator(".projection-rotation-handle, [data-handle-role='rotate']").first
    b = rot.bounding_box()
    cx, cy = b["x"]+b["width"]/2, b["y"]+b["height"]/2
    page.mouse.move(cx, cy)
    page.mouse.down()
    # Trace an arc — 30 deg
    import math
    for angle_deg in range(0, 30, 5):
        a = math.radians(angle_deg)
        page.mouse.move(cx + 60*math.cos(a) - 60, cy + 60*math.sin(a))
    page.mouse.up()
    time.sleep(0.5)
    with open(live_server["stdout_path"]) as f:
        log = f.read()
    assert "[align-grid-snapshot] server-recv" in log
```

#### T6 — Image-pan (free-area drag pans content)

```python
@flaky_3x
def test_t6_image_pan_emits_mutation(live_server, page):
    _open_output_align_on(live_server, page)
    # Click in the CENTER of the viewport, far from any handle (assumed to be empty area).
    cx = page.evaluate("window.innerWidth/2")
    cy = page.evaluate("window.innerHeight/2")
    page.mouse.move(cx, cy)
    page.mouse.down()
    page.mouse.move(cx + 50, cy + 50, steps=8)
    page.mouse.up()
    time.sleep(0.5)
    with open(live_server["stdout_path"]) as f:
        log = f.read()
    # Pan triggers full grid translation — emits align-grid-snapshot
    assert "[align-grid-snapshot] server-recv" in log
```

#### T7 — Right-click context menu

```python
@flaky_3x
def test_t7_right_click_context_menu(live_server, page):
    _open_output_align_on(live_server, page)
    # Right-click on an interior line (in the center of the canvas)
    cx = page.evaluate("window.innerWidth/2")
    cy = page.evaluate("window.innerHeight/2")
    page.mouse.click(cx, cy, button="right")
    # Menu DOM appears with class .board-context-menu (verified in handle-ui.js:1381)
    page.wait_for_selector(".board-context-menu", timeout=2_000)
    items = page.locator(".board-context-menu .board-context-menu-item")
    count = items.count()
    assert count >= 2, f"expected ≥2 menu items, got {count}"
    # Click "Add line through this point" (text exact match, see handle-ui.js:1325)
    page.locator(".board-context-menu-item", has_text="Add line through this point").first.click()
    # Adding a line emits a notifyDirtyChanged → POST /api/align-mode-dirty
    # Plus the next render or drag will broadcast align-grid-snapshot.
    time.sleep(0.5)
    with open(live_server["stdout_path"]) as f:
        log = f.read()
    assert "/api/align-mode-dirty" in log or "[align-grid-snapshot] server-recv" in log
```

#### T8 — CTRL+Z undo

```python
@flaky_3x
def test_t8_ctrl_z_undoes_last_gesture(live_server, page):
    _open_output_align_on(live_server, page)
    handle = page.locator(".projection-corner-handle").first
    b = handle.bounding_box()
    # Record initial position
    initial = page.evaluate("""(() => {
        const h = document.querySelector('.projection-corner-handle');
        const r = h.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
    })()""")
    # Drag handle 50px right
    page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
    page.mouse.down()
    page.mouse.move(b["x"]+b["width"]/2 + 50, b["y"]+b["height"]/2, steps=5)
    page.mouse.up()
    time.sleep(0.4)
    # CTRL+Z
    page.keyboard.press("Control+z")
    time.sleep(0.4)
    final = page.evaluate("""(() => {
        const h = document.querySelector('.projection-corner-handle');
        const r = h.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
    })()""")
    # Handle returned to within 3px of initial position
    assert abs(final["x"] - initial["x"]) < 3, f"undo failed: {initial} -> {final}"
```

#### T9 — Dirty-flag propagates to dashboard

```python
@flaky_3x
def test_t9_dirty_flag_visible_on_dashboard(live_server, page, chrome_browser):
    # Open /output/ on `page`; spawn a SECOND page for the dashboard.
    dashboard_ctx = chrome_browser.new_context()
    dash = dashboard_ctx.new_page()
    try:
        dash.goto(f"http://127.0.0.1:{live_server['port']}/",
                  wait_until="domcontentloaded", timeout=15_000)
        dash.wait_for_selector("#align-mode-dirty-hint", timeout=10_000)

        _open_output_align_on(live_server, page)
        handle = page.locator(".projection-corner-handle").first
        b = handle.bounding_box()
        page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
        page.mouse.down(); page.mouse.move(b["x"]+30, b["y"]+30, steps=4); page.mouse.up()
        time.sleep(1.0)

        # Dashboard's #align-mode-dirty-hint is no longer hidden after the gesture
        dash.wait_for_function(
            "document.getElementById('align-mode-dirty-hint')?.hidden === false",
            timeout=5_000)
    finally:
        try: dashboard_ctx.close()
        except Exception: pass
```

#### T10 — Conflict-free (forwarder + bootHandleUi don't both fire)

```python
@flaky_3x
def test_t10_no_duplicate_mutations(live_server, page):
    console_lines: list[str] = []
    page.on("console", lambda m: console_lines.append(m.text))

    _open_output_align_on(live_server, page)
    handle = page.locator(".projection-corner-handle").first
    b = handle.bounding_box()
    page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2)
    page.mouse.down(); page.mouse.move(b["x"]+30, b["y"]+30, steps=4); page.mouse.up()
    time.sleep(0.6)

    # No `[input-forwarder] sent phase=start` (the forwarder must be dormant)
    forwarder_emits = [l for l in console_lines if "[input-forwarder] sent phase=start" in l]
    assert len(forwarder_emits) == 0, (
        f"receiver-input-forwarder fired during align-mode (expected dormant): {forwarder_emits}")

    # Server should have ONE align-grid-snapshot, ZERO align-corner-drag.
    with open(live_server["stdout_path"]) as f:
        log = f.read()
    n_grid = log.count("[align-grid-snapshot] server-recv")
    n_corner = log.count("[align-drag] received phase=start")
    assert n_grid == 1, f"expected 1 align-grid-snapshot, got {n_grid}"
    assert n_corner == 0, f"expected 0 align-corner-drag, got {n_corner}"
```

### Server log capture mechanism

`with_server.py` already tees server stdout AND stderr to file paths exposed in `live_server["stdout_path"]` / `live_server["stderr_path"]`. Tests `open()` and `read()` after gesture + sleep. Already validated by Phase 35 W0 `test_server_log_clean`.

### Selector strategy (verified in source)

| Element | Class | Source |
|---------|-------|--------|
| 4 corner handles + interior vertex handles | `.projection-corner-handle` | handle-ui builds with this class |
| Squish-bar / midpoint handles | `.projection-grid-handle` | handle-ui builds |
| Rotation handles | `.projection-rotation-handle` (existing in CSS) | OR `[data-handle-role="rotate"]` — confirm during Wave-0 RED authoring |
| Line canvas | `#projection-grid-line-canvas` | handle-ui.js:191 |
| Context menu | `.board-context-menu` | handle-ui.js:1381 |
| Context menu items | `.board-context-menu-item` | handle-ui.js:1389 |
| Align toolbar | `.projection-align-toolbar` | handle-ui.js:671 |
| Save button | `.projection-align-action-save` | handle-ui.js:721 |
| Discard button | `.projection-align-action-saveas` (existing) / `.projection-align-action-discard` (verify in handle-ui §659-) | handle-ui.js |
| Dashboard dirty hint | `#align-mode-dirty-hint` | index.html:188 |

### Mutation log format (verified in server.mjs)

| Mutation | Server log line |
|----------|----------------|
| `align-corner-drag` | `[align-drag] received phase=<phase> v=<vertexId> xy=(...) from=<role>/<clientId>` (line 1201) |
| `align-grid-snapshot` | `[align-grid-snapshot] server-recv from=<role>/<clientId> corners=TL(...)..BR(...) profile=<id>` (line 1240) |
| `/api/align-mode-dirty` POST | `<no specific log line — server sets state.alignModeDirtyOnOutput silently>` (Recommend Phase 36 add `console.log("[align-mode-dirty] received dirty=" + Boolean(payload.dirty))` for test assertion) |

**Action item for plan:** add a one-line `console.log` to server.mjs's `/api/align-mode-dirty` handler so T9 can assert the POST arrived (separate from dashboard-side DOM assertion).

### Flake budget

Phase 35 W0 currently has 4 tests passing in ~58s. Phase 36 adds 10 (T1-T10). Each ~10-15s including video-ready wait + gesture + sleep. **Total budget ~3 min**. Use `pytest-xdist -n 4` if needed (each test spawns its own server via `with_server` so they're parallel-safe). `@flaky_3x` collapses transient flakes.

### Dashboard regression rail (Phase 36 W0 BLOCKING in addition to T1-T10)

The existing `test/live-e2e/test_phase35_dashboard_alignmode.py` POSTs to `/api/live/command` (already correct). Failure mode is `wait_for_function` timeout for `.projection-corner-handle`. Phase 36's bootHandleUi-on-dashboard-too refactor (M3 final step) re-grees this test by ensuring the handles render. **Recommendation: keep the test file unchanged. Phase 36 implementation makes it GREEN by virtue of M3 dashboard migration.** No rewrite needed.

If the planner prefers a richer assertion set: add T-DASH-1 (handles GREEN), T-DASH-2 (CTRL+Z works on dashboard too), T-DASH-3 (right-click menu works on dashboard too) as additional coverage. But these duplicate T8/T7 assertion logic — only the URL changes (`http://.../` vs `http://.../output/`). RECOMMEND: parametrize T7/T8/T2 with `@pytest.mark.parametrize("path", ["/", "/output/"])` so dashboard regression coverage falls out automatically.

---

## §5 — Dashboard regression coverage (Q5)

See §4 last subsection. **Decision: keep `test_phase35_dashboard_alignmode.py` AS-IS**. Phase 36 implementation makes it GREEN by virtue of M3 dashboard migration. Add parametrized variants of T7/T8/T2 to cover dashboard explicitly.

The Phase 35 deferred-items.md complaint "endpoint mismatch" is OBSOLETE — Phase 35-A already migrated the test to `/api/live/command` (verified in source line 59).

---

## §6 — handle-ui internal modularization (Q6)

**Recommendation: do NOT modularize handle-ui in Phase 36.** Reasons:

1. handle-ui is ALREADY split. handle-drag.js (941 LOC) was extracted from it in Phase W3.6-Cextra. Further internal splits add 3000+ LOC of refactor diff with NO test coverage uplift (the IIFE structure is what's tested, not the file structure).
2. Internal cohesion is high. Reading handle-ui.js: section 1-657 is DOM lifecycle + handle creation; 658-1080 is align toolbar; 1080-1430 is interaction handlers (onKeyDown + context menu); 1430-1570 is line add/remove; 1570-1755 is show/hide + onAlignModeChange. Each section uses module-locals from the others — splitting requires either passing them as init refs (more args than just adding to bootHandleUi) or duplicating helper bodies.
3. Internal modularization is explicitly deferred in CONTEXT.md. The Claude's discretion section calls it "optional".

**If the planner disagrees:** the natural splits would be:
- `runtime-projection-align-toolbar.js` (~420 LOC) — chip + buttons + drag-to-reposition
- `runtime-projection-context-menu.js` (~150 LOC) — onContextMenu + showContextMenu + line add/remove
- `runtime-projection-handle-shell.js` (remaining ~1180 LOC) — DOM lifecycle, show/hide, onAlignModeChange

But this work is best left for a future cleanup phase (deferred in CONTEXT.md).

### Dashboard-only code paths inside handle-ui

Verified by grep — handle-ui has NO `if (outputRole === OUTPUT_ROLE_CONTROL)` branches. The toolbar at line 658 is gated by `_isSsrChromiumTab()` returning false, but that gate is for the SSR tab, not the dashboard vs /output/ split. **handle-ui is universal — same code runs on both.** Excellent for Option H.

handle-drag has one outputRole-conditional at line 91-100 (`_getDragLayout` reads `videoEl.getBoundingClientRect()` — works on both dashboard and /output/, but on dashboard `#ssr-video` doesn't exist and falls back to `window.innerWidth`).

---

## §7 — Validation Architecture (Nyquist Dimension 8)

### Test framework

| Property | Value |
|----------|-------|
| Framework | pytest (Phase 35 W0 baseline) + Playwright sync API for browser; node:test for JS unit |
| Config file | `pytest.ini` (existing) — `test/live-e2e/conftest.py` for fixtures |
| Quick run command | `pytest test/live-e2e/test_phase36_align_handles.py -x -v` |
| Full suite command | `pytest test/live-e2e/ -v` (~3 min) |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| D-01 | bootHandleUi exported, dashboard + /output/ both call it | E2E | `pytest -k "test_t1 or test_phase35_dashboard"` | ❌ Wave 0 (T1 NEW) |
| D-02 | overlay pointer-events:none on /output/ during align-mode; no `!important` CSS | E2E + manual CSS-grep | `grep -nE "pointer-events: none !important" src/styles.css \| grep -v 'projection-corner-handle' && pytest -k test_t10` | ❌ Wave 0 (T10 NEW) |
| D-03 | 10 RED tests exist as Playwright | E2E | `pytest test/live-e2e/test_phase36_*.py --collect-only \| grep -c test_t` should be ≥10 | ❌ Wave 0 NEW |
| D-04 | CTRL+Z undoes last gesture; broadcasts align-grid-snapshot | E2E | `pytest -k test_t8` | ❌ Wave 0 NEW |
| D-05 | Right-click → context menu; add/remove emit existing mutations | E2E | `pytest -k test_t7` | ❌ Wave 0 NEW |
| D-06 | Dirty-flag broadcast; dashboard dirty hint visible | E2E | `pytest -k test_t9` | ❌ Wave 0 NEW |
| D-07 | ctx inventory complete; runtime-trace dump exists | manual + AST | `node scripts/ctx-trace-validate.js` (NEW) | ❌ M1 RESEARCH artifact |
| D-08 | connection-stability fail=0 | E2E | `node test/connection-stability/run.mjs` (existing) | ✅ exists |
| D-09 | ≤8 src-based scripts in output.html | static grep | `[ "$(grep -cE '<script[^>]*src=' output.html)" -le 8 ]` | ✅ existing CI rule, integrate into Phase 36 plan |
| D-10 | Pi UAT deferred docs | docs | `test -f .planning/phases/phase-36/36-HUMAN-UAT.md` | ❌ M6 |

### Sampling rate (Nyquist)

The fastest signal that needs sampling is the broadcast throttle inside `broadcastGridSnapshot` — `_BROADCAST_MIN_INTERVAL_MS = 33` (~30 Hz). To detect duplicate emissions or missed emissions, the test must sample server log AT LEAST every 16ms (2× the broadcast rate, Nyquist).

**Practical:** tests sleep ~500ms after a gesture and read the log all at once. This works because:
- Server logs are persisted to disk (tee'd by `with_server.py`).
- A 500ms wait is well past any throttle window.
- Tests assert COUNTS, not timing — so sampling rate doesn't apply at the assertion level.

The only Nyquist-sensitive measure is `test_t10` "exactly ONE mutation": if the test runs 200ms after gesture-end, the throttle's last-emit-timer has already drained. Test sleeps 600ms — safe.

For DOM-level state-change detection (e.g. T8 undo handle position), we use `page.wait_for_function` which polls every ~250ms by default. That's well under the requestAnimationFrame cadence (~16ms). Adequate.

### Wave 0 Gaps

- [ ] `test/live-e2e/test_phase36_align_handles.py` — covers T1-T10
- [ ] `test/live-e2e/test_phase36_dashboard_parity.py` — parametrized T2/T7/T8 across dashboard + /output/ paths
- [ ] `scripts/ctx-trace-harness.html` (or inline in runtime-orchestration.js) — debug-flag-gated harness for D-07 runtime trace
- [ ] `scripts/ctx-trace-validate.js` — diffs the operator-collected runtime-trace dump against the AST-scan output
- [ ] (server.mjs) Add `console.log("[align-mode-dirty] received dirty=" + ...)` so T9 can assert (optional — alternative is checking `state.alignModeDirtyOnOutput` via `/api/live/snapshot` GET)

*(All other test infrastructure exists from Phase 35 W0.)*

---

## §8 — Threat model

| Pattern | STRIDE | Mitigation | Where in plan |
|---------|--------|-----------|---------------|
| DoS via mutation flood (drag at 60Hz, 1 mutation per frame) | DoS | `_BROADCAST_MIN_INTERVAL_MS=33` throttle inside `broadcastGridSnapshot` (existing); server's `align-grid-snapshot` validation at server.mjs:1138-1150 | KEEP existing throttle — already validated by Phase 31 |
| State divergence dashboard ↔ /output/ during simultaneous edits | Tampering / Repudiation | Both clients ARE live-sync clients receiving the same broadcast; last-writer-wins is the existing semantic; `originatorClientId` filter prevents echo (server.mjs:1228) | NO new code — existing model handles it. Document in PLAN.md as known-acceptable |
| Memory leak from local history stack (operator drags for hours) | Availability | grid-state's undo stack has no fixed cap (verified). At ~30Hz drag for 1 hour = ~108k entries. Each entry copies srcXs/srcYs/points (~200 bytes for 3x3). 21 MB worst-case. Acceptable but worth a TODO. | OPTIONAL: add cap in grid-state (e.g. last 1000 entries) |
| Right-click menu XSS via room name (handled inside `showContextMenu`) | Tampering | Menu items are `.textContent` set, not innerHTML. Verified in handle-ui.js:1390 | NO action — existing code is safe |
| `liveSync.emitLiveMutation` payload spoofing | Tampering | Server validates align-grid-snapshot payload at server.mjs:1138 (V5 ASVS). Existing | NO action |
| /output/ overlay pointer-events:none allows finger to fall through to OS (Pi browser quirk) | Repudiation | Pi 4 deferred per D-10. Test on gaming-PC; Phase 36-CLOSURE-EVIDENCE notes Pi behavior as deferred | DOCUMENT in 36-HUMAN-UAT.md |

---

## §9 — Wave parallelization feasibility (Q9)

CONTEXT.md notes: M1 (research, this doc) and M2 (RED tests) sequentially precede implementation waves M3 (sizing+corner = T1+T2), M4 (vertex+midpoint+rotation = T3+T4+T5), M5 (pan+ctxmenu+undo+dirty = T6+T7+T8+T9).

### File-conflict analysis

ALL waves modify the same files at minimum:
- `src/app/runtime/output-receiver/boot-handle-ui.js` (NEW) — every wave adds args / paths
- `src/app/runtime/output-receiver/output-align-mode-loader.js` — every wave updates the loader's bootHandleUi call
- `src/app/runtime/viewport/runtime-projection-grid-state.js` (M3 only — liveSyncCoreOverride)
- `output.html` (M3 only — re-add #stage + #room-overlay in lazy bundle)
- `src/styles.css` (M3 only — remove pointer-events:none rule)

After M3 lands the bootHandleUi shell + DOM + CSS, M4 and M5 only modify boot-handle-ui.js + the loader. M4 wires vertex/midpoint/rotation; M5 wires pan/ctxmenu/undo/dirty.

**Recommendation: SEQUENTIAL (M3 → M4 → M5).** Even though M4 and M5 touch only 2 files, both files concentrate per-feature wiring at boot-handle-ui.js. Parallel waves would merge-conflict on every feature added. Given that T1-T10 RED rails are GREEN-driven (each wave's exit criterion is "the corresponding T<n> test goes GREEN"), sequential execution gives clean per-wave verification. Total cost: ~3-day overhead vs parallel; accepting that for clarity.

If the planner WANTS parallel: M4 and M5 can run in parallel IF (and only if) M3 has landed. Then they merge into a final V wave.

---

## §10 — Concrete file touch list

| Plan | Files added (NEW) | Files modified | Files referenced |
|------|------------------|----------------|------------------|
| **W0** | `test/live-e2e/test_phase36_align_handles.py` (10 tests T1-T10), `test/live-e2e/test_phase36_dashboard_parity.py` (parametrized) | `server.mjs` (single-line console.log for /api/align-mode-dirty), `test/live-e2e/test_phase35_dashboard_alignmode.py` (no change unless planner picks "richer assertions" path) | `scripts/with_server.py`, `test/live-e2e/conftest.py`, `test/live-e2e/_flake_retry.py` |
| **A1** (Option-H thin export) | `src/app/runtime/output-receiver/boot-handle-ui.js` (~250 LOC) | `src/app/runtime/output-receiver/output-live-sync.js` (add `emitLiveMutation`), `src/app/runtime/viewport/runtime-projection-grid-state.js` (read `liveSyncCoreOverride` from init dep-bag) | All four refactor targets (handle-ui / handle-drag / mapping / polygon-editor) UNCHANGED internally |
| **A2** (loader integration) | — | `src/app/runtime/output-receiver/output-align-mode-loader.js` (swap `bootAlignMode` import → `bootHandleUi`; populate full §1.5 inventory; remove old IIFE list if needed) | `output-align-mode.js` stays as Phase-35-A historical reference, NOT loaded |
| **A3** (output.html DOM) | — | `output.html` (loader appends `<div id="stage">` + `<svg id="room-overlay">` to body INSIDE bundle, NOT as static markup — preserves D-09 budget) | — |
| **A4** (CSS) | — | `src/styles.css` (DELETE lines 198-213 `pointer-events:none !important` rule) | — |
| **A5** (receiver-bootstrap) | — | `src/app/runtime/output-receiver/receiver-bootstrap.js` (line 992: change overlay pointer-events to static `"none"`; verify forwarder dormancy) | `receiver-input-forwarder.js` UNCHANGED |
| **M3** (sizing + corner) | — | `boot-handle-ui.js`, `output-align-mode-loader.js` | T1, T2 GREEN |
| **M4** (vertex/midpoint/rotation) | — | `boot-handle-ui.js`, `output-align-mode-loader.js` | T3, T4, T5 GREEN |
| **M5** (pan + ctxmenu + undo + dirty) | — | `boot-handle-ui.js`, `output-align-mode-loader.js` | T6, T7, T8, T9 GREEN |
| **M3-LATE** (dashboard migration) | — | `src/app/runtime/runtime-orchestration.js` (replace MAPPING.init at line 412 + POLYGON_EDITOR.init at line 1890 with single `bootHandleUi(...)` call) | dashboard regression test stays GREEN |
| **V** (Wave-merge) | `36-VERIFICATION.md`, `36-HUMAN-UAT.md` | — | All Phase-36 tests + connection-stability + JS suite |

---

## Code Examples

### Verified pattern: addHorizontalLine with grid-state broadcast (existing)

```js
// src/app/runtime/viewport/runtime-projection-handle-ui.js:1439-1489
// VERIFIED: this is the existing implementation. Phase 36 does NOT modify
// internal logic — only the init dep-bag.
function addHorizontalLine(normY) {
  // ... compute insertIdx ...
  pushUndo();                              // → grid-state.pushUndo() — local stack
  grid.srcYs.splice(insertIdx, 0, newSrcY);
  grid.points.splice(insertIdx, 0, newRow);
  saveToLocalStorage();                    // local persistence
  if (handlesVisible) { rebuildHandleElements(); drawLines(); }
  if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  const _ppApi = _getProfilePersistApi();
  if (_ppApi?.notifyDirtyChanged) _ppApi.notifyDirtyChanged();   // dirty broadcast
  // NOTE: align-grid-snapshot broadcast does NOT fire here — it fires on
  // the NEXT drag (broadcastGridSnapshot in handle-drag's onDragEnd).
  // CONTEXT.md D-04/D-05 imply line-add re-broadcasts the grid; the
  // implementation defers until the next drag. Phase 36 may add an
  // explicit broadcastGridSnapshot({force:true}) call here for parity.
  // Decision deferred to planner.
}
```

### Verified pattern: receiver-bootstrap overlay toggle (existing)

```js
// src/app/runtime/output-receiver/receiver-bootstrap.js:986-996
// VERIFIED: Phase 34/35 current logic — overlay pointer-events follow alignMode.
// Phase 36 D-02 INVERTS this: overlay stays "none" so handles capture clicks.
if (liveSync) {
  alignMode = Boolean(liveSync.getAlignMode?.());
  currentProfileId = liveSync.getActiveProjectionProfileId?.() ?? null;
  overlayEl.style.pointerEvents = alignMode ? "auto" : "none";   // ← Phase 36: change to "none"
  offAlignModeChange = liveSync.onAlignModeChange?.((enabled) => {
    alignMode = Boolean(enabled);
    overlayEl.style.pointerEvents = alignMode ? "auto" : "none";  // ← Phase 36: change to "none"
  });
  ...
}
```

### Verified pattern: server's existing align-grid-snapshot logging (server.mjs:1239)

```js
// VERIFIED — already exists. T1-T10 tests use this server-recv log line.
console.log(
  `[align-grid-snapshot] server-recv from=${role}/${clientId} `
  + `corners=TL(${cornerTL?.x?.toFixed(2)},${cornerTL?.y?.toFixed(2)})..`
  + `BR(${cornerBR?.x?.toFixed(2)},${cornerBR?.y?.toFixed(2)}) `
  + `profile=${payload.profileId}`,
);
```

---

## State of the Art

| Old Approach (Phase 35-A) | Current Approach (Phase 36) | Why Changed | Impact |
|--------------------------|----------------------------|-------------|--------|
| `bootAlignMode` accepts grouped sub-objects (`boardAccess`, `polygonState`, `interactions`, ...) with no-op stubs by default | `bootHandleUi` accepts the SAME shape PLUS explicit `liveSyncCoreOverride` + `alignModeDirtyEndpoint` | Phase 35-A missed the hidden `window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE` dependency; explicit injection prevents recurrence | Cleaner contract, audit-traceable |
| ctx audit by grep | runtime-trace + AST union | Phase 35-A grep missed `state.X` sub-keys + `window.TT_BEAMER_*` accesses | Inventory matches reality |
| Overlay pointer-events:none on handles via `!important` CSS | overlay pointer-events:none on `#ssr-input-overlay` via inline style | Phase 35-A's CSS rule competed with handle-ui's inline `pointer-events:auto` and silently won, breaking handle clicks | Handles work as intended on /output/ |
| /output/ falls back to 4-corner approximation when align-mode-loader unavailable | Same fallback (Phase 34 hitTestVertex receiver-bootstrap), but only when bootHandleUi NOT loaded — i.e. align-mode OFF or bundle-load-error | D-02 makes this dormant during align-mode-ON | T10 verifies no double-firing |

**Deprecated:**
- The CSS rule `body[data-output-role="final-output"].align-mode-active .projection-corner-handle{pointer-events:none !important}` — was Phase 35-A's workaround, removed by Phase 36 D-02.
- `align-corner-drag` mutation — only used by `receiver-input-forwarder` which becomes dormant. Mutation type stays in server.mjs as legacy support but no client emits it during normal Phase-36 operation.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | [VERIFIED] handle-ui's `pushUndo` / `undo` are wired through grid-state.init's dep-bag and broadcast via `_broadcastDragSnapshot` | §3, §4 T8 | Low — verified in source |
| A2 | [VERIFIED] line add/remove emit `notifyDirtyChanged` (POST `/api/align-mode-dirty`) but DO NOT emit `align-grid-snapshot` until next drag | §10 code example | LOW — verified by reading `addHorizontalLine` |
| A3 | [ASSUMED] Phase 35 W0 dashboard-test failure mode is just "no handles render" (not endpoint mismatch) — fixable by Phase 36's M3 dashboard migration | §5 | MEDIUM — Phase 35 deferred-items.md is explicit; could be misread. Planner should confirm by running the test once before relying on this. |
| A4 | [ASSUMED] CONTEXT.md D-06 "broadcast piggybacks on align-grid-snapshot" is a misnomer — existing implementation uses `/api/align-mode-dirty`. Researcher recommends keeping the existing path (lower risk), planner reconciles. | Summary, §1.3 | MEDIUM — if planner insists on D-06 literal interpretation, server.mjs needs payload validation update for an extra `dirty` field on align-grid-snapshot. ~10 LOC server change + payload-shape contract refresh. |
| A5 | [VERIFIED] handle-ui has NO outputRole conditional internally (universal across dashboard + /output/) | §6 | LOW — grep-verified |
| A6 | [ASSUMED] Pi 4 hardware behavior under D-02 (a) overlay-`none` is acceptable; deferred to Pi UAT | §8 threat model | MEDIUM — same carry-forward pattern as Phases 33/34/35. Operator's call. |
| A7 | [ASSUMED] handle-ui's existing `notifyDirtyChanged` listener subscribed inside profile-persistence (line 618) survives the Option-H refactor unchanged | §1.3 | LOW — profile-persistence init is part of MAPPING.init dep-bag; bootHandleUi just wraps that. |
| A8 | [ASSUMED] `runtime-polygon-editor-handles.js`, `runtime-polygon-editor-panels.js`, `runtime-polygon-context-menu.js`, `runtime-polygon-rotation.js`, `runtime-polygon-undo.js` (sub-modules of polygon-editor) work without modification when polygon-editor.init is called via bootHandleUi | §6 | MEDIUM — polygon-editor.init at line 25 picks up `window.TT_BEAMER_RUNTIME_POLYGON_EDITOR_HANDLES`. Other sub-modules MAY do similar lookups not yet enumerated. **The runtime-trace harness (D-07) MUST also wrap `window.TT_BEAMER_*` to surface this.** |
| A9 | [VERIFIED] grid-state is the ONLY module that reads `window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE` for emitLiveMutation | §1.3 | LOW — grep-verified across all 4 files |
| A10 | [ASSUMED] The 30Hz throttle (`_BROADCAST_MIN_INTERVAL_MS=33`) is sufficient to keep 60Hz drag from saturating the WS link on Pi 4 | §8 | LOW — Phase 31 validated this throughput. |

---

## Open Questions for the planner (RESOLVED)

All 5 questions resolved during plan-phase iteration on 2026-05-10. Resolutions
locked in 36-W0-PLAN.md `<objective>` and propagated through downstream plans.

1. **Q1 D-06 literal interpretation:** keep `/api/align-mode-dirty` as separate POST endpoint (recommended) OR add `dirty` field to `align-grid-snapshot` payload (matches CONTEXT.md literal text)?
   - What we know: existing implementation uses `/api/align-mode-dirty`. The `align-grid-snapshot` payload has no `dirty` field today.
   - What's unclear: whether CONTEXT.md author meant "broadcast as a side effect of align-grid-snapshot" or "rely on the existing endpoint that already broadcasts".
   - Recommendation: keep existing endpoint. Document the reconciliation in PLAN.md.
   - **RESOLVED:** Use existing `POST /api/align-mode-dirty` endpoint. CONTEXT.md D-06 amended on 2026-05-10 with `[reconciliation 2026-05-10]` note documenting the corrected mechanism. User intent (dirty propagates from /output/ to dashboard) preserved; only the message-routing primitive differs from CONTEXT.md's original literal text.

2. **Q2 Dashboard regression test rewrite:** keep the file as-is and let M3 dashboard migration GREEN it, OR proactively rewrite with parametrized assertions covering T2/T7/T8?
   - What we know: existing test correctly POSTs to `/api/live/command` (verified at line 59). Failure mode is `wait_for_function` timeout for `.projection-corner-handle`.
   - Recommendation: keep + add parametrized variants of T2/T7/T8 with `[/, /output/]` for breadth.
   - **RESOLVED:** Keep `test_phase35_dashboard_alignmode.py` as-is + add NEW `test_phase36_dashboard_parity.py` with parametrized variants. The Phase 35 deferred-items.md endpoint-mismatch note is OBSOLETE (test already uses correct endpoint).

3. **Q3 Line-add immediate broadcast:** should `addHorizontalLine` / `addVerticalLine` / `removeHorizontalLine` / `removeVerticalLine` call `broadcastGridSnapshot({force:true})` to push the new srcXs/srcYs immediately, or wait for the next drag?
   - What we know: today they wait. T2 (corner pull AFTER add line) would still show the new structure.
   - Recommendation: ADD the explicit call. Cheap, removes a race condition, T7 can assert immediately.
   - **RESOLVED:** Add explicit `broadcastGridSnapshot({force:true})` call in all 4 line-mutation methods. Wired in M5 plan.

4. **Q4 handle-ui internal modularization:** I recommend NO. Planner has discretion. If splitting, propose: align-toolbar.js (~420 LOC) + context-menu.js (~150 LOC) + handle-shell.js (~1180 LOC).
   - **RESOLVED:** NO modularization in Phase 36. Preserves diff bound. CONTEXT.md `<deferred>` records this as a future cleanup option.

5. **Q5 Memory cap on undo stack:** add a 1000-entry cap?
   - What we know: no cap today; ~21 MB worst-case after 1h of dragging at 30Hz.
   - Recommendation: add a cap (cheap, defensive). 1 LOC change in grid-state.js.
   - **RESOLVED:** Add 1000-entry FIFO cap to grid-state.js undo stack. Wired in M5 plan as part of T8 wiring. Threat T-LB-1 mitigated.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| node (server.mjs) | server lifecycle | ✓ | node 20+ assumed | — |
| /opt/google/chrome/chrome | Playwright Live-E2E | ✓ on test rig | h264-capable | Tests skip if missing (conftest.py:38-47) |
| Xvfb DISPLAY=:98 | headful Chrome under headless rig | ✓ on Lenovo IdeaCentre Mini | — | — |
| pytest | Phase 35 W0 baseline | ✓ | from `pip` | — |
| playwright (Python sync) | E2E driver | ✓ via `pip install playwright` | — | conftest skips if missing |
| Pi 4 | Pi UAT | ✗ | n/a | DEFERRED per D-10 |

**Missing dependencies with no fallback:** none for automated rail. Pi UAT is operator-driven and explicitly deferred.

**Missing dependencies with fallback:** none.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 7.x + Playwright sync 1.x |
| Config file | `pytest.ini` + `test/live-e2e/conftest.py` |
| Quick run command | `pytest test/live-e2e/test_phase36_align_handles.py::test_t1_handle_frame_matches_stream_content -v` |
| Full suite command | `pytest test/live-e2e/ -v` (~3 min) |
| Connection-stability gate | `node test/connection-stability/run.mjs` (existing, must stay fail=0 — D-08) |

### Phase Requirements → Test Map

(See §7 above.)

### Sampling Rate

- **Per task commit:** quick-run for the relevant T<n> + the dashboard-parametrized variants
- **Per wave merge:** `pytest test/live-e2e/ -v` + `node test/connection-stability/run.mjs`
- **Phase gate:** Full suite green + connection-stability fail=0 + grep-assertion `[ "$(grep -cE '<script[^>]*src=' output.html)" -le 8 ]`

Smallest signal frequency to detect: 30Hz throttle inside broadcastGridSnapshot. Test sleeps ≥500ms after gestures (well over 16ms Nyquist window for 30Hz). Adequate.

### Wave 0 Gaps

- [ ] `test/live-e2e/test_phase36_align_handles.py` — covers T1-T10
- [ ] `test/live-e2e/test_phase36_dashboard_parity.py` — parametrized [`/`, `/output/`] variants of T2/T7/T8
- [ ] (server.mjs) one-line console.log for `/api/align-mode-dirty` POST handler so T9 can assert via stdout
- [ ] No new Python frameworks needed
- [ ] No new fixtures needed (Phase 35 W0's `live_server`, `chrome_browser`, `page` cover all T1-T10)

---

## Security Domain

`security_enforcement` not explicitly set in `.planning/config.json` → treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | (single-user kiosk) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Existing — `align-corner-drag` and `align-grid-snapshot` validators in server.mjs (lines 382-450, 1112-1150). Verified pre-existing per Phase 31 D-D1. Phase 36 does NOT add new mutation types — no new validation needed. |
| V6 Cryptography | no | (no crypto in this phase) |
| V8 Data Protection | no | — |
| V11 Business Logic | yes | The dirty-flag rate-limit (server.mjs:2112 — 100ms toggle floor) protects against client-side spam. T9 must NOT exercise this rate (test gestures are well under 100ms-rate). |

### Known Threat Patterns for Browser/Server JS Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via room name in context menu | Tampering | `.textContent` set, not innerHTML. Verified in handle-ui.js:1390. NO action. |
| WebSocket payload spoofing for align-grid-snapshot | Tampering | Server validates payload shape + size (V5 ASVS at server.mjs:1138). NO action. |
| Mutation flood DoS during drag | DoS | 30Hz client-side throttle (existing). 100ms server-side dirty-flag floor (existing). NO action. |
| Profile name traversal via "Save as" | Tampering | Server-side filename sanitation (existing in profile-persistence). NO action — handle-ui only sends raw name; server sanitizes. |

---

## Sources

### Primary (HIGH confidence)
- Source: `src/app/runtime/viewport/runtime-projection-handle-ui.js` (1756 LOC, every line read or grep-scanned)
- Source: `src/app/runtime/viewport/runtime-projection-handle-drag.js` (941 LOC, init + broadcast paths read)
- Source: `src/app/runtime/viewport/runtime-projection-mapping.js` (lines 340-410 init read; pattern verified)
- Source: `src/app/runtime/viewport/runtime-projection-grid-state.js` (lines 380-453 broadcast path read in full; line 389 hidden global access verified)
- Source: `src/app/runtime/viewport/runtime-projection-profile-persistence.js` (lines 580-625 dirty-flag listener path read; line 598 `/api/align-mode-dirty` POST verified)
- Source: `src/app/runtime/polygon-editor/runtime-polygon-editor.js` (lines 1-100 + 344-435 read; ctx surface grep-verified)
- Source: `src/app/runtime/polygon-editor/runtime-polygon-editor-handles.js` (ctx surface grep-verified)
- Source: `src/app/runtime/output-receiver/output-align-mode.js` (full 359 LOC read — Phase 35-A reference)
- Source: `src/app/runtime/output-receiver/output-align-mode-loader.js` (full 381 LOC read)
- Source: `src/app/runtime/output-receiver/output-live-sync.js` (full 211 LOC read)
- Source: `src/app/runtime/output-receiver/receiver-bootstrap.js` (lines 950-1050 input-forwarder + overlay toggle read)
- Source: `src/app/runtime/output-receiver/receiver-input-forwarder.js` (full 290 LOC read)
- Source: `src/app/runtime/runtime-orchestration.js` (lines 1-200, 412-450, 1880-1980 read)
- Source: `server.mjs` (mutation handlers at 1112-1280; align-mode-dirty endpoint at 4114-4120)
- Source: `output.html` (full 146 LOC read; D-09 budget verified — 1 src-based script today, 7 budget headroom)
- Source: `src/styles.css` (lines 100-230 read — D-02 CSS rule confirmed at 198-213)
- Source: `test/live-e2e/conftest.py` + `_flake_retry.py` + `test_phase35_alignmode_smoke.py` (full read)
- Source: `scripts/with_server.py` (full 249 LOC read)
- Source: `.planning/phases/phase-36/36-CONTEXT.md` (full read — locked decisions verbatim)
- Source: `.planning/phases/phase-35/35-CLOSURE-ITER2-ADDENDUM.md` (full read — root-cause analysis)
- Source: `.planning/phases/phase-35/deferred-items.md` (full read)
- Source: `.planning/ROADMAP.md` Phase 36 entry (lines 682-755 read)

### Secondary (MEDIUM confidence)
- AST grep counts above represent SURFACE access (`ctx.X`) only. They do NOT cover sub-key access on `ctx.state` (the Phase 35-A miss) — those are enumerated via a SECOND grep over `state.X` patterns and verified in §1.2.
- The proposed runtime-trace harness in §1.4 has not been executed in this research session. Recommended to run during M1 implementation and validate the inventory against this document's table.

### Tertiary (LOW confidence)
- Pi 4 behavior under D-02 (a) — DEFERRED per D-10. Operator UAT.

---

## Metadata

**Confidence breakdown:**
- ctx-inventur (§1): HIGH for AST + state-key inventory (grep-verified). MEDIUM for runtime-trace completeness (must be run).
- API shape (§2): MEDIUM — proposal stage; planner should validate.
- Event-handling (§3): HIGH — verified against current receiver-bootstrap code.
- RED tests (§4): HIGH — selectors verified in source, mutation log lines verified in server.mjs.
- Dashboard regression (§5): MEDIUM — assumes Phase 35 W0 deferred-items.md is the authoritative gap report.
- Modularization (§6): HIGH recommendation — verified universal handle-ui.
- Validation Architecture (§7): HIGH — Phase 35 W0 fixtures fully usable.
- Threat model (§8): HIGH — STRIDE-categorized against existing mitigations.
- Wave parallelization (§9): MEDIUM — file conflict reasoning is sound but not exhaustive.
- File-touch list (§10): HIGH — directly mapped to plan structure.

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days — codebase is stable in these areas; only Phase-36 implementation will move it)

## RESEARCH COMPLETE
