---
phase: 32
plan: 03
subsystem: settings-ui-ssr
tags: [settings-ui, stream-fps-cap, align-mode-boost, server-rendering-panel, d-a2, d-a3]

# Dependency graph
requires:
  - phase: 32
    plan: "01"
    provides: "streamFpsCap + alignModeBoost schema fields, STREAM_FPS_CAP_VALUES validator, disk persistence"
provides:
  - "Stream FPS Cap radio group in System & Performance > Server-side Rendering panel (30/45/60/0=native)"
  - "Align-Mode Boost checkbox in same panel"
  - "reflectConfig round-trip: config → DOM for both new fields"
  - "sendPatch round-trip: DOM change → emitLiveMutation → server validator → config/global-defaults.json"
  - "6 isolated UI round-trip tests (vm.runInContext per test)"
affects:
  - "index.html — #settings-server-rendering section"
  - "runtime-dom-refs.js — ssrStreamFpsCapRadios + ssrAlignModeBoostToggle refs"
  - "runtime-orchestration.js — destructure + panel-init pass-through"
  - "server-rendering-panel.js — reflectConfig + change handlers"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vm.runInContext IIFE isolation for per-test fresh module load (no ESM cache issues)"
    - "Number(r.value) coercion for radio-to-int comparison (threat T-32-03-01)"
    - "Boolean(e.target.checked) coercion for checkbox-to-bool (threat T-32-03-02)"

key-files:
  created:
    - test/phase-32-settings-ui.test.mjs
  modified:
    - index.html
    - src/app/runtime/core/runtime-dom-refs.js
    - src/app/runtime/runtime-orchestration.js
    - src/app/lib/ui/settings/server-rendering-panel.js

key-decisions:
  - "vm.runInContext chosen over ESM cache-busting (?cb= URL) — cleaner isolation, no import() edge cases"
  - "Change handlers added BEFORE ssrAudioRouteToggle handler in the wire-controls block (ordering mirrors DOM)"
  - "Number() coercion on both sides of radio checked comparison (handles value='0' vs Number 0)"
  - "Boolean() coercion on checkbox checked before sendPatch (defense-in-depth per threat model)"

# Metrics
duration: ~25min
completed: 2026-05-07
---

# Phase 32 Plan 03: Wave 2 Settings UI — Stream FPS Cap + Align-Mode Boost Summary

**Two new operator controls wired end-to-end into the Server-side Rendering panel: Stream FPS Cap radio group (30/45/60/Native) and Align-Mode Boost checkbox, persisting through the existing serverRendering-update live-sync pipeline**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-05-07
- **Tasks:** 2
- **Files modified:** 4 source + 1 new test file

## Accomplishments

### Task 1: DOM controls + refs (commit `4849d94`)

**`index.html` `#settings-server-rendering`:**
- Inserted `<fieldset class="ssr-radio-group">` with 4 radio inputs (`name="ssr-stream-fps-cap"`, values `30/45/60/0`) immediately after the legacy "Stream FPS target" fieldset and before the audio-route block
- Inserted `<label class="inline-checkbox" id="ssr-align-mode-boost-label">` containing `<input id="ssr-align-mode-boost-toggle" type="checkbox" />` immediately after the new cap fieldset
- Existing 5 controls (encoder, qualityPreset, resolutionPreference, fpsTarget, audioRoute) untouched

**`src/app/runtime/core/runtime-dom-refs.js`:**
- Added `ssrStreamFpsCapRadios: Array.from(document.querySelectorAll('input[name="ssr-stream-fps-cap"]'))` after `ssrServerRenderingStatus`
- Added `ssrAlignModeBoostToggle: document.querySelector("#ssr-align-mode-boost-toggle")` after `ssrStreamFpsCapRadios`

**`src/app/runtime/runtime-orchestration.js`:**
- Extended destructure block (line ~217-219) with `ssrStreamFpsCapRadios, ssrAlignModeBoostToggle`
- Extended panel-init refs object (line ~2980-2982) with both new refs so `server-rendering-panel.js` can wire them

### Task 2: Panel wiring + tests (commit `36cfa2e`)

**`src/app/lib/ui/settings/server-rendering-panel.js`:**
- `reflectConfig`: after fpsTarget block, added streamFpsCap reflection (Number-coerced value match across all 4 radios) and alignModeBoost reflection (boolean check sets toggle.checked)
- `initServerRenderingPanel` wire-controls block: added streamFpsCap change handlers (for-each radio, `if (r.checked) sendPatch({streamFpsCap: Number(r.value)})`) and alignModeBoost change handler (`sendPatch({alignModeBoost: Boolean(e.target.checked)})`)
- Existing 5 control handlers untouched

**`test/phase-32-settings-ui.test.mjs`** (new, 6 tests):

| Test ID | Description |
|---------|-------------|
| A1 | reflectConfig sets streamFpsCap=45 radio checked; alignModeBoost=true sets toggle |
| A2 | reflectConfig sets streamFpsCap=0 (Native, value="0") radio checked; alignModeBoost=false unsets toggle |
| A3 | alignModeBoost boolean transitions: true→checked, false→unchecked across two isolated panel instances |
| A4 | User selects 60fps cap radio → emitLiveMutation("serverRendering-update", {streamFpsCap: 60}) |
| A5 | User toggles boost OFF then ON → 2+ emits with {alignModeBoost: false} then {alignModeBoost: true} |
| A6 | init is a no-op (no throw) when ssrEncoderSelect ref absent; also safe when only new refs present |

## Test Results

| Metric | Before (32-02 close) | After (32-03) | Delta |
|--------|---------------------|---------------|-------|
| Total tests | 268 | 274 | +6 |
| Pass | 264 | 270 | +6 |
| Fail | 0 | 0 | 0 |
| Skip | 4 | 4 | 0 |

## Commit SHAs

| Task | Hash | Message |
|------|------|---------|
| T1 | `4849d94` | feat(32-03-T1): add Stream FPS Cap + Align-Mode Boost DOM controls + refs (D-A2/D-A3) |
| T2 | `36cfa2e` | feat(32-03-T2): wire streamFpsCap + alignModeBoost in settings panel + UI round-trip tests |

## Deviations from Plan

None — plan executed exactly as written. The vm.runInContext approach was the plan's own fallback suggestion and was selected over ESM cache-busting because it is cleaner and avoids Node ESM URL-specifier edge cases.

## Manual UAT Checklist (Operator)

### Stream FPS Cap control

1. Open System Settings > System & Performance > Server-side Rendering tab
2. Confirm "Stream FPS cap" fieldset is visible with 4 options: 30 fps, 45 fps, 60 fps, Native (no cap)
3. Confirm currently selected option matches `config/global-defaults.json > serverRendering.streamFpsCap` (default: 60)
4. Select "30 fps" → observe server log: `serverRendering-update` mutation received, config file updated
5. Reload page → "30 fps" radio should still be selected (persisted)
6. On the SSR stream diagnostic overlay, observe FPS chip drop toward 30 fps (allows ~10s to stabilize)
7. Select "60 fps" → observe FPS chip lift back toward 60 fps
8. Select "Native (no cap)" → observe FPS climbs to hardware ceiling (may exceed 60 if hardware allows)

### Align-Mode Boost control

1. Confirm "Boost stream FPS during align-mode drag (recommended)" checkbox is visible and checked by default
2. Enter align-mode (drag a room corner handle)
3. With boost ON: check `videoTrack.getSettings().frameRate` in SSR tab console — should spike to 60 during drag
4. Exit align-mode — frame rate should return to configured cap
5. Uncheck "Boost stream FPS during align-mode drag" → server log shows `alignModeBoost: false` applied
6. Re-enter align-mode: frame rate should NOT spike (stays at cap)
7. Reload page → checkbox remains unchecked (persisted to config/global-defaults.json)

### Regression: existing 5 controls

8. Confirm encoder dropdown, quality preset radios, resolution preference radios, FPS target radios, and audio route toggle all still function and reflect their saved values on load.

## Known Stubs

None. Both controls are fully wired: DOM → change handler → sendPatch → emitLiveMutation → server validateServerRenderingPatch (32-01-T2) → config/global-defaults.json → reflectConfig on next load/snapshot.

## Threat Flags

None. The new surface is bounded by:
- T-32-03-01: Number() coercion client-side + STREAM_FPS_CAP_VALUES enum validation server-side (32-01-T2)
- T-32-03-02: Boolean() coercion client-side + typeof boolean check server-side (32-01-T2)

## Self-Check: PASSED

- FOUND: index.html contains 4 × `name="ssr-stream-fps-cap"` radios (values 30/45/60/0)
- FOUND: index.html contains `id="ssr-align-mode-boost-toggle"`
- FOUND: runtime-dom-refs.js `ssrStreamFpsCapRadios` (1 occurrence)
- FOUND: runtime-dom-refs.js `ssrAlignModeBoostToggle` (1 occurrence)
- FOUND: runtime-orchestration.js `ssrStreamFpsCapRadios` (2 occurrences — destructure + panel-init)
- FOUND: runtime-orchestration.js `ssrAlignModeBoostToggle` (2 occurrences)
- FOUND: server-rendering-panel.js `streamFpsCap` (3 occurrences — comment + reflect + handler)
- FOUND: server-rendering-panel.js `alignModeBoost` (3 occurrences — comment + reflect + handler)
- FOUND: test/phase-32-settings-ui.test.mjs (6 tests, 6 pass, 0 fail)
- FOUND commit 4849d94 (T1)
- FOUND commit 36cfa2e (T2)
- Full suite: 274 tests, 270 pass, 0 fail, 4 skip
