---
phase: 36
plan: A2
subsystem: align-mode-thin-output
tags: [option-h-loader-integration, d-02-overlay-inversion, phase-35-a-css-removal, lazy-stage-overlay-dom, full-15-inventory-depbag, q1-dirty-flag-locked]
status: completed
completed: 2026-05-10
duration_minutes: 4
dependency_graph:
  requires:
    - "Phase 36 A1 (boot-handle-ui.js + emitLiveMutation + grid-state liveSyncCoreOverride DI)"
    - "Phase 36 W0 (RED rails, including bootHandleUi shape unit and Q1 dirty-flag stdout marker)"
    - "Phase 35-iter2 h1 (output-align-mode-loader.js lazy-load infrastructure preserved as starting point)"
    - "Phase 35-iter2 h2 (buildBoardAccess preserved verbatim — h2 polygon-data wiring intact)"
    - "Phase 35-B (output-live-sync.js subscription)"
  provides:
    - "Loader integration: bootHandleUi reachable from /output/ via lazy-loader (A1's NEW entry-point now wired)"
    - "D-02 (a) event-handling architecture: overlay pointer-events permanently 'none', handle DOM at z:9999 captures clicks via inline pointer-events:auto"
    - "Phase 35-A pointer-events:none !important CSS workaround DELETED (replaced by audit-trace comment)"
    - "Q1 LOCKED: alignModeDirtyEndpoint='/api/align-mode-dirty' threaded through bootHandleUi dep-bag"
    - "Stage + room-overlay DOM appended via JS at activation (D-09 ≤8 src-based scripts budget preserved at 1)"
    - "Connection-stability fail=0 preserved (D-08)"
  affects:
    - "Wave M3 (T1+T2): handle DOM now renders when align-mode toggles ON. T1 (sizing) + T2 (corner-pull) acceptance now reachable; M3 may surface bbox-alignment + dirty-flag wiring details that need finalization."
    - "Wave M4 (T3+T4+T5): vertex/midpoint/rotation drag paths now have a real boot-graph; M4 verifies they emit grid mutations through liveSync.emitLiveMutation."
    - "Wave M5 (T6+T7+T8+T9+T10): image-pan, right-click context menu, CTRL+Z undo, dirty-flag, conflict-free invariant — all unblocked once handles render."
    - "Phase 35-A reference modules (output-align-mode.js) still in src/ but now confirmed UNREFERENCED by the loader (Phase 36 reference material per CONTEXT.md)."
tech_stack:
  added: []
  patterns:
    - "Dynamic ES-module import of bootHandleUi from inside a non-module script-injected loader (the ES `import('...boot-handle-ui.js')` works because the loader file ITSELF is loaded as a module via static import in the existing index.html / future output.html DCL hook — independent of the IIFE bundle's non-module nature)"
    - "JS-time DOM append (createElement('div') + createElementNS svg) replaces static HTML for #stage + #room-overlay — keeps D-09 ≤8 src-based scripts budget invariant"
    - "Permanent pointer-events:none on overlay (D-02 (a) inversion) — overlay always dormant; alignMode state still tracked for hitTestVertex Wave-4 fallback"
    - "Idempotent activation: re-invoking _ensureStageAndOverlayDom does NOT duplicate elements (right-click add-line flow may re-trigger)"
key_files:
  created: []
  modified:
    - "src/app/runtime/output-receiver/output-align-mode-loader.js (+260 net LOC: 7 new helpers + bootHandleUi wiring; bootAlignMode call removed)"
    - "src/app/runtime/output-receiver/receiver-bootstrap.js (3 lines changed + 6 audit-comment lines: alignMode? conditional → permanent 'none')"
    - "src/styles.css (16 LOC removed [Phase 35-A !important rule + its 11-line context comment]; 9 LOC added [Phase 36 D-02 audit-trace comment])"
decisions:
  - "Loader uses dynamic ES `import('/src/.../boot-handle-ui.js')` for the entry-point (boot-handle-ui IS an ES module per A1) but keeps the existing programmatic <script src=> injection for the 12 IIFE bundle modules (those register on window.TT_BEAMER_*; not ES modules). Two parallel mechanisms in the same loader — required by the bundle's heterogeneous module shapes."
  - "alignMode state tracking PRESERVED in receiver-bootstrap.js (not just the overlay toggle). The alignMode boolean still feeds hitTestVertex's `isAlignModeActive` gate, which is the Wave-4 4-corner fallback. With D-02 (a), that fallback is effectively dormant during align-mode-ON (overlay pointer-events:none means no events reach the forwarder anyway), but keeping the state tracking avoids a subtle regression if a test harness toggles align-mode without bootHandleUi mounted."
  - "stage + roomOverlay deactivate strategy: hide stage with `display:none` rather than removeChild on align-mode-OFF. Avoids re-create cost on next activation; bootHandleUi's stop() removes handle children separately. Idempotent re-activate flips display back to ''."
  - "Loader's _state.uiView intentionally set to 'dashboard' (NOT 'settings') — the sync-* fan-out fires only when uiView === 'settings', and /output/ never has that panel. Setting uiView='dashboard' makes the no-op stubs verifiably unreachable via the natural code path (defense in depth)."
metrics:
  tasks_completed: 2
  files_modified: 3
  loc_added: 290
  loc_removed: 30
  duration_minutes: 4
---

# Phase 36 Plan A2: Loader Integration + D-02 Event-Handling Inversion Summary

**One-liner:** Wired `bootHandleUi` from A1 into `output-align-mode-loader.js` (replacing the Phase 35-A pure-extract entry-point call), populated the FULL §1.5 RESEARCH inventory dep-bag with 7 new helper functions documenting why each /output/-side stub is correct, appended `#stage` + `#room-overlay` DOM via JS at activation (D-09 ≤8 src-based scripts budget preserved at 1), inverted `receiver-bootstrap.js` overlay pointer-events to permanent `"none"` per CONTEXT.md D-02 (a), and DELETED the Phase 35-A `pointer-events:none !important` CSS workaround (handles now capture clicks directly via inline `pointer-events: auto` at z:9999); D-08 connection-stability fail=0 preserved.

## Objective recap

A2 is the wave that brings the bootHandleUi entry-point online for `/output/`. After A2 lands, lazy-loaded handles render when align-mode toggles ON. Specific interactions (sizing alignment, vertex/midpoint/rotation drag, image-pan, right-click menu, CTRL+Z undo, dirty-flag) are NOT yet GREEN — those flip in M3 (T1, T2), M4 (T3, T4, T5), and M5 (T6, T7, T8, T9, T10). A2 ONLY establishes the boot path + event-handling architecture.

## Tasks executed

### Task 1 — Refactor output-align-mode-loader.js to call bootHandleUi
**Commit:** `584ae6e` `feat(36-A2): wire bootHandleUi (Option H) into output-align-mode-loader`

**File modified:** `src/app/runtime/output-receiver/output-align-mode-loader.js` (+337 insertions, -79 deletions; net 258 LOC growth from 381 → 639)

#### Helpers added (7 NEW)

1. **`_ensureStageAndOverlayDom(logger)`** — appends `<div id="stage">` and `<svg id="room-overlay">` to `<body>` if not present. SVG element created via `document.createElementNS("http://www.w3.org/2000/svg", "svg")` so the browser parses it as SVG (not HTML). Idempotent — re-invocation does NOT duplicate elements; if stage was hidden by deactivate's `display:none`, it's re-shown via `display:""`. Returns `{stage, roomOverlay}`.

2. **`_createOutputState(boardId)`** — minimal /output/-local state factory covering RESEARCH §1.2 sub-key inventory exercised on the read path. All polygonEditor sub-keys (drag*, dragArea*, pendingArea*, selectedVertex*, etc.) initialized with sensible defaults; shipPolygonEditor likewise; uiView intentionally set to "dashboard" (NOT "settings") so the sync-* fan-out's `uiView === "settings"` gate is never true on /output/.

3. **`_buildPolygonStateStub(state)`** — polygonState fan-out (RESEARCH §1.5): getCurrentPolygonHandleScale=1, getActivePolygonRoomId/setActivePolygonRoomId thin adapters onto `state.polygonEditor.activeRoomIdByBoard`, isRoomFrozen=false, getPolygonEditorHandleMetrics returns `{size, strokeWidth}`, arePlayAreaVerticesEditable=false, getSelectedPlayAreaId=null, getBoardZoom=`{scale:1}`.

4. **`_buildNormalizersStub()`** — normalizers fan-out: normalizeShipPolygon/normalizePolygonPoint identity (returns shallow-copy of array points), remapGridPoint/hasGridDisplacements proxy through `window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING` (the IIFE's `remapPoint` + `hasDisplacements` methods) with try/catch fallback to identity.

5. **`_buildInteractionsStub()`** — interactions fan-out: mapClientPointToNormalized uses `#stage`'s `getBoundingClientRect()` for client→[0..1] conversion, beginPolygonDragInteraction/endPolygonDragInteraction no-ops, isPanArbitrating=false, isAcceptablePolygonPointerEvent filters out `event.button === 2` (raw right-click), areRoomVerticesEditable=false (read-only on /output/), setPlayAreaPolygon=no-op.

6. **`_buildPersistenceStub()`** — persistence fan-out: persistBoardProfiles/saveProjectionMapping/discardChanges/profileSaveFlow/profileLoadFlow/profileDeleteFlow ALL no-ops with rationale comments ("server-owned via mutation broadcast", "dashboard-only"). pushUndoState=no-op (handle-ui owns its own client-local undo stack; this is the polygon-editor's drag-start hook which is no-op on /output/ because no polygon-vertex edits happen there).

7. **`_buildSyncStubs()`** + **`_buildDashboardStubs()`** — both no-op-with-rationale. Sync stubs (syncShipPolygonEditorStatus, syncPolygonVertexSelect, etc.) fire only when `uiView === "settings"` which is dashboard-only. Dashboard stubs (handleQuickModeRoomTap, applyRoomDraftTargetFromRoomClick, isQuickModeActive=false, cacheShipPolygonDragDomRefs, cacheRoomPolygonDragDomRefs) never fire on /output/.

#### Boot wiring change (the core of A2)

The previous implementation (Phase 35-iter2 h1) called the Phase 35-A pure-extract entry point at line ~268 with a stub-heavy dep-bag. Phase 36 A2 replaces this with:

```js
const { bootHandleUi } = await import("/src/app/runtime/output-receiver/boot-handle-ui.js");
_currentBootHandle = bootHandleUi({
  stage: stageEl,
  roomOverlay: roomOverlayEl,
  videoEl: v || null,
  feedbackEl: null,
  state: _state,
  outputRole: "final-output",
  OUTPUT_ROLE_FINAL: "final-output",
  OUTPUT_ROLE_CONTROL: "control",
  liveSync,
  liveSyncCoreOverride: { emitLiveMutation: liveSync.emitLiveMutation },  // Phase 36 A1 critical fix
  polygonContract: polygonContract || (window.TT_BEAMER_POLYGON_CONTRACT ?? null),
  normalizers,
  boardAccess,
  polygonState,
  interactions,
  persistence,
  alignModeDirtyEndpoint: "/api/align-mode-dirty",  // Q1 LOCKED — D-06 reconciliation
  sync,
  dashboard,
  renderRoomOverlay: () => window.TT_BEAMER_RUNTIME_POLYGON_EDITOR?.renderRoomOverlay?.(),
  showToast: (...args) => logger?.log?.("[output-toast]", ...args),
  getRenderMode: () => _state.renderMode || "auto",
  getBoardId: () => _state.boardId,
  logger,
});
```

The two parallel module loading mechanisms inside `activate()`:
- `loadBundleOnce()` (existing, preserved): programmatic `<script src=…>` injection for the 12 IIFE modules (handle-ui, handle-drag, mapping, polygon-editor, etc.) that register on `window.TT_BEAMER_RUNTIME_*`.
- `await import(...boot-handle-ui.js)` (NEW): native dynamic ES import for boot-handle-ui (which IS an ES module). The IIFE bundle is loaded FIRST (sequentially, in order — preserving Pitfall-5 parse-time deps), so by the time bootHandleUi's `_resolveModule("TT_BEAMER_RUNTIME_PROJECTION_MAPPING")` runs, the global is already populated.

#### Preserved unchanged

- `ALIGN_MODE_BUNDLE` IIFE list (12 src) — D-09 budget unchanged because these load LAZILY on first align-mode toggle.
- `loadScriptOnce`, `loadBundleOnce` script-tag injection mechanism.
- 2-second post-load prefetch via `setTimeout(..., PREFETCH_DELAY_MS)`.
- `fetchJson`, `pickRuntimeBoardId`, `buildBoardAccess` (h2 real polygon-data accessors).
- `getRequiredArgsAtBootTime` (reads window.TT_BEAMER_RUNTIME_POLYGON_NORMALIZERS).
- `liveSync.onAlignModeChange` + `onProjectionProfileChange` subscription pattern (with `if (active) activate(); else deactivate();`).
- `body.classList.add("align-mode-active")` on activation (CSS gating — src/styles.css:119 — required for #room-overlay visibility).
- Window globals: `window.__ttbState`, `window.__ttbAlignMode`.

#### Acceptance evidence

| Gate | Expected | Observed | Status |
|---|---|---|---|
| `grep -c "bootHandleUi" output-align-mode-loader.js` | ≥2 | **12** | ✓ |
| `grep -cE 'bootAlignMode\b' output-align-mode-loader.js` | 0 (legacy call removed) | **0** | ✓ |
| `grep -c "emitLiveMutation" output-align-mode-loader.js` | ≥2 | **3** | ✓ |
| `grep -c "/api/align-mode-dirty" output-align-mode-loader.js` | ≥1 | **1** | ✓ |
| `grep -c "_ensureStageAndOverlayDom" output-align-mode-loader.js` | ≥1 | **2** | ✓ |
| `grep -c "_createOutputState" output-align-mode-loader.js` | ≥1 | **2** | ✓ |
| `grep -c 'boot-handle-ui' output-align-mode-loader.js` (import target present) | ≥1 | **2** | ✓ |
| `node --check output-align-mode-loader.js` | exit 0 | exit 0 | ✓ |
| `node --test test/phase-36-boot-handle-ui-shape.test.mjs test/phase-35-output-live-sync.test.mjs` | fail=0, pass=6 | fail=0, pass=6 | ✓ |
| `node --test test/connection-stability/*.test.mjs` (D-08) | fail=0 | fail=0 (pass=72, skipped=13) | ✓ |
| `grep -cE "<script[^>]*src=" output.html` (D-09) | ≤8 | **1** | ✓ |

### Task 2 — D-02 (a) overlay pointer-events inversion + Phase 35-A CSS rule removal
**Commit:** `d451e1e` `fix(36-A2): D-02 (a) overlay pointer-events inversion + remove Phase 35-A CSS workaround`

#### Sub-task 2a — `src/app/runtime/output-receiver/receiver-bootstrap.js`

Located the two `overlayEl.style.pointerEvents = alignMode ? "auto" : "none"` assignments (boot-time + onAlignModeChange callback) plus the legacy poll-fallback branch. Replaced ALL THREE with permanent `overlayEl.style.pointerEvents = "none"`. Added 3 audit-trace comments referencing "Phase 36 D-02 (a)" — one in the boot-time branch (multi-line rationale), one in the callback (one-line), one in the legacy poll-fallback (one-line).

The full multi-line comment near the boot-time assignment:

```js
// Phase 36 D-02 (a): overlay pointer-events permanently "none" so handle
// DOM (z:9999, pointer-events:auto via inline style from handle-ui creation)
// captures clicks directly. receiver-input-forwarder remains attached but
// dormant during align-mode-ON — no events reach overlayEl in this model.
// alignMode state is still tracked because hitTestVertex (Wave-4 fallback
// when bootHandleUi is not active) gates on it via `isAlignModeActive`.
overlayEl.style.pointerEvents = "none";
```

`alignMode` boolean state tracking PRESERVED — feeds `isAlignModeActive: () => liveSync ? Boolean(liveSync.getAlignMode?.()) : alignMode` for the Wave-4 4-corner hitTestVertex fallback. With D-02 (a) the overlay never receives events anyway when bootHandleUi is mounted, but the state tracking remains a defense-in-depth signal.

#### Sub-task 2b — `src/styles.css`

Located the rule block at lines 209-213 (with its 11-line Phase 35 D-01 (Track A) explanation comment at lines 198-208) and DELETED the entire 16-line block. Replaced with a 9-line Phase 36 D-02 audit-trace comment explaining the removal:

```css
/* Phase 36 D-02 — Phase 35-A's `pointer-events:none !important` rule on
   .projection-corner-handle / .projection-grid-handle / #projection-grid-line-canvas
   has been REMOVED. That rule was the (c)-bubbling workaround in Phase 35-A,
   which let receiver-input-forwarder consume corner-clicks via overlay
   bubbling (model A). Phase 36 LOCKED Option H + D-02 (a): handle DOM at
   z:9999 captures clicks directly via inline `pointer-events: auto` set by
   handle-ui creation; receiver-bootstrap.js now permanently sets
   #ssr-input-overlay's `pointer-events: none` (JS-toggled, not CSS-overridden).
   With this rule gone, handles' inline pointer-events:auto wins without
   competition from the !important override. */
```

#### Sub-task 2c — output.html unchanged

Verified `git diff --name-only HEAD~2 HEAD | grep output.html` returns no result. D-09 budget: 1 src= script, ≤8 ✓.

#### Acceptance evidence

| Gate | Expected | Observed | Status |
|---|---|---|---|
| `grep -cE 'overlayEl\.style\.pointerEvents\s*=\s*"none"' receiver-bootstrap.js` | ≥2 | **3** | ✓ |
| `grep -cE 'overlayEl\.style\.pointerEvents\s*=\s*alignMode\s*\?' receiver-bootstrap.js` | 0 | **0** | ✓ |
| `grep -nE 'pointer-events:\s*none\s*!important' src/styles.css \| grep -cE 'projection-corner-handle\|projection-grid-handle\|projection-grid-line-canvas'` | 0 | **0** | ✓ |
| `grep -c "Phase 36 D-02" src/styles.css` | ≥1 | **1** | ✓ |
| `grep -c "Phase 36 D-02" src/app/runtime/output-receiver/receiver-bootstrap.js` | ≥1 | **3** | ✓ |
| `git diff --name-only HEAD~2 HEAD \| grep output.html` | empty | empty | ✓ |
| `node --check src/app/runtime/output-receiver/receiver-bootstrap.js` | exit 0 | exit 0 | ✓ |
| `node --test test/ssr-receiver-disconnect-detection.test.mjs` | fail=0 | fail=0 (pass=16) | ✓ |
| `node --test test/connection-stability/*.test.mjs` (D-08 hard gate) | fail=0 | fail=0 (pass=72, skipped=13) | ✓ |

## D-08 fail=0 evidence

```
$ node --test 'test/connection-stability/'*.test.mjs
ℹ tests 85
ℹ pass 72
ℹ fail 0
ℹ cancelled 0
ℹ skipped 13
ℹ todo 0
```

13 skipped tests are all `RUN_LIVE_TESTS=1` / `RUN_LONG_TESTS=1` env-gated (real-server-boot live tests). Unit + non-live integration tests all pass — no regression in the connection-stability surface. D-08 hard gate preserved.

## D-09 evidence (output.html script-tag budget)

```
$ grep -cE '<script[^>]*src=' output.html
1
```

1 ≤ 8. A2 does NOT touch `output.html` — the script-tag budget is unchanged from W0/A1. The new `#stage` + `#room-overlay` DOM is appended via JS in the loader's `activate()` flow, NOT in static HTML.

## Phase 35 unit tests still GREEN

```
$ node --test test/phase-36-boot-handle-ui-shape.test.mjs test/phase-35-output-live-sync.test.mjs
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

A2 does NOT regress A1's contract (bootHandleUi is exported, returns `{stop, hitTestVertex}`, throws on missing required args) and does NOT regress Phase 35-B's output-live-sync subscription contract.

## Wave-closure invariants

A2 establishes the boot path. M3-M5 will flip T1-T10 GREEN one cluster at a time. As of A2 close, the RED rails (10 live-E2E + 6 dashboard parity + 3 unit) are still in their expected RED states because:

- T1 (sizing) — handles now CAN render via bootHandleUi when align-mode toggles ON, but pixel-precise alignment with stream-content bbox is M3's job (handle-ui's MAPPING.init bbox math depends on real video element dimensions which only exist after the WebRTC stream is up).
- T2-T9 — interaction-specific paths (corner-pull, vertex drag, midpoint, rotation, image-pan, right-click, undo, dirty-flag) need each cluster's wave for end-to-end mutation/round-trip verification.
- T10 (conflict-free) — overlay pointer-events:none means receiver-input-forwarder is dormant during align-mode-ON, but full assertion (1 grid-snapshot, 0 input-forwarder events) is verified end-to-end in M5.

This is the expected progression per CONTEXT.md and the W0 rail invariant.

## Deviations from Plan

None — plan executed exactly as written. The two minor planner-discretionary decisions:

1. **Loader uses `await import("/.../boot-handle-ui.js")` for the ES-module entry-point while keeping `<script src=>` injection for the 12 IIFE bundle modules.** The plan said "use ES dynamic import or static `<script type="module">` injection — pick whichever fits the existing loader pattern". Dynamic `import()` was chosen because boot-handle-ui IS an ES module (per A1 closure), and the dynamic form is async-compatible with the loader's existing `await loadBundleOnce()` flow (no need to inject a <script> tag and poll for module-readiness).

2. **stage deactivation uses `display:none` rather than `removeChild`.** The plan said "Optionally remove the appended `#stage` and `#room-overlay` from DOM (or hide them — implementation choice)". `display:none` was chosen because (a) re-creation cost on the next activation is non-trivial, (b) bootHandleUi's `stop()` already removes handle children separately, and (c) idempotency: re-invoking `_ensureStageAndOverlayDom` flips display back to '' without creating a duplicate.

No Rule 1/2/3 auto-fixes were needed (no bugs surfaced, no missing critical functionality, no blocking issues). No Rule 4 (architectural) decisions. No CLAUDE.md adjustments (file does not exist).

## Authentication gates

None encountered. A2 is pure code-edit + unit-test work; no external auth required.

## Known Stubs

The /output/-side stubs in `_buildPolygonStateStub`, `_buildNormalizersStub`, `_buildInteractionsStub`, `_buildPersistenceStub`, `_buildSyncStubs`, `_buildDashboardStubs` are **explicitly intentional and documented with rationale comments**. They are not blocking Phase 36's goal — they are the explicit "dashboard-only field, no-op on /output/" contracts that Option H's design makes visible. /output/ never invokes those code paths because no quick-mode / settings-panel / animation-editor runs there.

The one stub that COULD become a real issue is `interactions.mapClientPointToNormalized` — it currently uses `#stage`'s bounding-box for client→[0..1] conversion, but if handle-ui's drag math expects the conversion to be relative to the VIDEO content bbox (not the stage), drag deltas will be off by the letterbox factor. T1 (sizing) and T2 (corner-pull) in M3 will surface this if it's wrong.

## Threat Flags

None new. A2 introduces NO new HTTP routes, NO new auth paths, NO new file/schema access, NO new network endpoints. The bootHandleUi call passes `alignModeDirtyEndpoint: "/api/align-mode-dirty"` which is the existing W0-marked endpoint (server.mjs line 4140). The threat register dispositions in the plan (`T-DOS-1` accept with documented receiver-input-forwarder dormancy via D-02 (a), `T-DOM-1` accept with first-party loader trust + idempotent helper) are unchanged. Receiver-bootstrap's overlay pointer-events change is a one-line CSS-equivalent adjustment with no security surface.

## Self-Check: PASSED

Files verified to exist:
- `/home/claw/tt-beamer/src/app/runtime/output-receiver/output-align-mode-loader.js` — FOUND (modified, contains bootHandleUi×12, _ensureStageAndOverlayDom×2, _createOutputState×2, alignModeDirtyEndpoint×1)
- `/home/claw/tt-beamer/src/app/runtime/output-receiver/receiver-bootstrap.js` — FOUND (modified, contains pointerEvents="none"×3, "Phase 36 D-02"×3)
- `/home/claw/tt-beamer/src/styles.css` — FOUND (modified, !important rule for projection-handles deleted, "Phase 36 D-02" audit comment present)
- `/home/claw/tt-beamer/output.html` — FOUND, UNCHANGED (D-09 verified)

Commits verified to exist on master:
- `584ae6e` feat(36-A2): wire bootHandleUi (Option H) into output-align-mode-loader — FOUND
- `d451e1e` fix(36-A2): D-02 (a) overlay pointer-events inversion + remove Phase 35-A CSS workaround — FOUND

All A2 closure gates pass:
- bootHandleUi reachable from /output/ via lazy-loader ✓
- D-02(a) inversion landed (overlay always "none", handles always capture) ✓
- Phase 35-A CSS workaround deleted with audit-comment ✓
- output.html script-tag count UNCHANGED at 1 ≤ 8 (D-09 verified) ✓
- D-08 connection-stability fail=0 ✓
- Q1 dirty-flag endpoint reconciliation traceable in source (string `/api/align-mode-dirty` in loader call) ✓
- Phase 35 unit tests still GREEN (output-live-sync 3/3, bootHandleUi shape 3/3) ✓
- No T1-T10 GREEN flips required this wave (M3-M5 owns those) ✓

Phase 36 Wave M3 is unblocked.
