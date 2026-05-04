---
phase: 27
plan: "02"
subsystem: align-mode-profile-ux
tags: [B3, B4, D-08, dirty-flag, toolbar, profile-persistence, save-modal]
dependency_graph:
  requires: [27-01]
  provides: [profile-chip, dirty-flag-toolbar, save-loaded-flow, save-as-new-modal, discard-flow, addDirtyListener-api, isCurrentlyDirty-api, D-08-schema-validation]
  affects:
    - src/app/runtime/viewport/runtime-projection-profile-persistence.js
    - src/app/runtime/viewport/runtime-projection-handle-ui.js
    - src/app/runtime/viewport/runtime-projection-handle-drag.js
    - src/app/runtime/viewport/runtime-projection-grid-state.js
    - src/app/runtime/viewport/runtime-projection-mapping.js
    - src/styles.css
tech_stack:
  added: []
  patterns: [vanilla-js-iife, module-init-injection, promise-based-modal, dirty-listener-registry, css-token-inline-style-hybrid]
key_files:
  created: []
  modified:
    - src/app/runtime/viewport/runtime-projection-profile-persistence.js
    - src/app/runtime/viewport/runtime-projection-handle-ui.js
    - src/app/runtime/viewport/runtime-projection-handle-drag.js
    - src/app/runtime/viewport/runtime-projection-grid-state.js
    - src/app/runtime/viewport/runtime-projection-mapping.js
    - src/styles.css
decisions:
  - "saveLoadedProfileFlow + saveAsNewProfileFlow replace legacy window.prompt-based profileSaveFlow entirely; context menu in handle-ui now calls saveLoadedProfileFlow via the saveLoadedProfileFlow dependency key"
  - "_validateGridPayloadSchema bounds: srcXs/srcYs in [0,1], points x/y in [-0.05,1.05] — small slack for float drift; window.confirm for D-08 recovery only (rare error path per D-04 rule)"
  - "notifyDirtyChanged wired at 8 mutation-end sites: 4 in handle-ui (add/remove H+V line), 3 in handle-drag (onDragEnd, onLineDragEnd, onRotateDragEnd), 1 in grid-state (undo)"
  - "gridStateApi injected as alias for gridState in mapping.js bootstrap — profile-persistence uses it for snapshotGridState/restoreGridSnapshot/buildNewProfileDefaultGrid"
metrics:
  duration_minutes: 5
  completed_date: "2026-05-04"
  tasks_total: 2
  tasks_completed: 2
  files_modified: 6
  lines_added: ~510
  lines_deleted: ~28
---

# Phase 27 Plan 02: Align-Mode Toolbar + Dirty-Flag UX Summary

**One-liner:** Profile chip + Save/Save-as-new/Discard toolbar with live dirty-flag observer wired at 8 mutation sites, replacing the legacy `window.prompt` save flow with a modal-based UX and D-08 schema validation on profile load.

---

## Tasks Completed

| Task | Name | Commit | Files | +/- Lines |
|------|------|--------|-------|-----------|
| T1 | Extend profile-persistence with snapshot, dirty detection, save/discard flows + D-08 schema validation | b97fda2 | runtime-projection-profile-persistence.js, runtime-projection-mapping.js | +256 / -24 |
| T2 | Build align-mode toolbar DOM + wire dirty observers at all mutation sites | 3c5a10a | runtime-projection-handle-ui.js, runtime-projection-handle-drag.js, runtime-projection-grid-state.js, runtime-projection-mapping.js, src/styles.css | +250 / -4 |

---

## Files Modified

| File | Change |
|------|--------|
| runtime-projection-profile-persistence.js | Added dirty-flag state, _snapshotsEqual, isDirty, isCurrentlyDirty, addDirtyListener, removeDirtyListener, notifyDirtyChanged, _validateGridPayloadSchema, saveLoadedProfileFlow, saveAsNewProfileFlow, discardChanges, _promptProfileNameModal, _showAlignErrorToast; replaced profileLoadFlow with D-08-validating version; removed profileSaveFlow export |
| runtime-projection-handle-ui.js | Added alignToolbar state vars, rebuildAlignToolbar(), _refreshAlignToolbarVisual(), removeAlignToolbar(); wired toolbar lifecycle in showHandles/removeHandles; added notifyDirtyChanged at 4 line-mutation sites; updated init to accept saveLoadedProfileFlow |
| runtime-projection-handle-drag.js | Added notifyDirtyChanged at onDragEnd, onLineDragEnd, onRotateDragEnd |
| runtime-projection-grid-state.js | Added notifyDirtyChanged at end of undo() |
| runtime-projection-mapping.js | Added gridStateApi: gridState injection; replaced profileSaveFlow with saveLoadedProfileFlow in handleUi.init |
| src/styles.css | Appended .projection-align-toolbar + focus-visible + hover rules |

---

## Acceptance Criteria Verification

### B3 — Profile name visible in align mode

- `_loadedProfileName` is set in profileLoadFlow after successful load; `getLoadedProfileName()` returns it.
- Toolbar chip shows the loaded name in `--c-text` when clean; "Unsaved" in `--c-text-2` when no profile loaded.
- Both states observable via: `window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE.getLoadedProfileName()` in DevTools.

### B4 — Dirty-flag mutations + Save/Discard flows

| Row | Criterion | Verification |
|-----|-----------|--------------|
| Save overwrites | `saveLoadedProfileFlow()` with profile loaded → POST to /api/projection-profiles → re-snapshots → dirty becomes false | grep `_loadedProfileSnapshot = _gridStateApi.snapshotGridState()` in save flow |
| Save no profile = name modal | `saveLoadedProfileFlow()` with `_loadedProfileName=null` delegates to `saveAsNewProfileFlow()` which opens modal | grep `if (!_loadedProfileName) { return saveAsNewProfileFlow(); }` |
| Save-as modal exact copy | title "Save as new profile", body "Give this alignment a name so you can reload it later.", input placeholder "e.g. Main stage, Angled left", confirm "Save profile", cancel "Keep editing" | grep evidence below |
| Discard no confirm | `discardChanges()` restores snapshot synchronously; no `window.confirm` in discard path | grep `window.confirm` returns only D-08 path |

grep evidence — copy strings verified:
```
title.textContent = "Save as new profile"                   (persistence.js line 239)
body.textContent = "Give this alignment a name..."          (persistence.js line 242)
input.placeholder = "e.g. Main stage, Angled left"         (persistence.js line 245)
confirmBtn.textContent = "Save profile"                     (persistence.js line 255)
cancelBtn.textContent = "Keep editing"                      (persistence.js line 252)
saveBtn.textContent = "Save profile"                        (handle-ui.js line 301)
saveAsBtn.textContent = "Save as new…"                      (handle-ui.js line 321)
discardBtn.textContent = "Discard"                          (handle-ui.js line 328)
```

### D-08 — Schema validation on profile load

- `_validateGridPayloadSchema(body?.data)` called before `applyGridPayload` in profileLoadFlow.
- On failure: `window.confirm("Could not load profile \"{name}\" — format may be incompatible. Reset to default?")` is shown.
- On confirm: grid reset to `buildNewProfileDefaultGrid()` snapshot; `_loadedProfileName = null; _loadedProfileSnapshot = null`.
- `window.confirm` is present ONLY in the D-08 error path — Discard uses no confirm (D-04 compliant).

Synthetic test: POST a malformed profile (`srcXs: ["bad"]`) via DevTools fetch, then load it → confirm dialog fires.

---

## notifyDirtyChanged Callsite Inventory (for plan 27-05)

| Site | File | Location |
|------|------|----------|
| addHorizontalLine | runtime-projection-handle-ui.js | After saveToLocalStorage + renderRoomOverlay |
| addVerticalLine | runtime-projection-handle-ui.js | After saveToLocalStorage + renderRoomOverlay |
| removeHorizontalLine | runtime-projection-handle-ui.js | After saveToLocalStorage + renderRoomOverlay |
| removeVerticalLine | runtime-projection-handle-ui.js | After saveToLocalStorage + renderRoomOverlay |
| onDragEnd (intersection drag) | runtime-projection-handle-drag.js | After saveToLocalStorage |
| onLineDragEnd (row/col drag) | runtime-projection-handle-drag.js | After saveToLocalStorage |
| onRotateDragEnd (whole-grid rotate) | runtime-projection-handle-drag.js | After saveToLocalStorage |
| undo() | runtime-projection-grid-state.js | After applyTransform + renderRoomOverlay |

8 sites total. Plan 27-05 wires the WebSocket dirty-broadcast onto `addDirtyListener(cb)` — no further callsite additions needed.

---

## Wave-5 Public API Surface (addDirtyListener + isCurrentlyDirty)

Confirmed present on `window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE`:

```javascript
addDirtyListener(cb)      // (boolean) -> void; Set-based (no duplicates)
removeDirtyListener(cb)   // cleanup
isCurrentlyDirty()        // returns last computed _dirty value
notifyDirtyChanged()      // triggers recompute + fan-out to listeners
getLoadedProfileName()    // returns _loadedProfileName (String|null)
isDirty()                 // live recompute via snapshotGridState deep-equal
```

Plan 27-05 uses `addDirtyListener` to register a WebSocket broadcast callback.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Context menu still referenced removed profileSaveFlow**
- **Found during:** Task 2
- **Issue:** `runtime-projection-handle-ui.js` had `let profileSaveFlow` wired to context-menu "Save profile..." item. After Task 1 removed `profileSaveFlow` from profile-persistence exports, this would silently call a no-op.
- **Fix:** Updated handle-ui `init()` to preferentially accept `saveLoadedProfileFlow` dependency key (falling back to `profileSaveFlow` for safety); updated `runtime-projection-mapping.js` to destructure and pass `saveLoadedProfileFlow` instead of `profileSaveFlow` to `handleUi.init`.
- **Files modified:** runtime-projection-handle-ui.js, runtime-projection-mapping.js
- **Commits:** included in T2 commit (3c5a10a)

---

## Known Stubs

None. All features deliver the full B3/B4 contract. No placeholder values, no hardcoded empty data, no deferred wiring.

---

## Threat Flags

No new network endpoints, auth paths, or file access patterns beyond those already in the plan's threat model (T-27-04 and T-27-05, both mitigated within this plan).

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| runtime-projection-profile-persistence.js exists | FOUND |
| runtime-projection-handle-ui.js exists | FOUND |
| runtime-projection-handle-drag.js exists | FOUND |
| runtime-projection-grid-state.js exists | FOUND |
| runtime-projection-mapping.js exists | FOUND |
| src/styles.css contains .projection-align-toolbar | FOUND |
| Commit b97fda2 (T1) exists | FOUND |
| Commit 3c5a10a (T2) exists | FOUND |
| addDirtyListener exported | FOUND |
| isCurrentlyDirty exported | FOUND |
| profileSaveFlow NOT in export | CONFIRMED |
| window.prompt NOT in persistence.js (code, not comments) | CONFIRMED |
| "Save profile" copy in modal confirm | FOUND |
| "Keep editing" copy in modal cancel | FOUND |
