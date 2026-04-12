# Phase 15 — UX polish + legacy removal + animation features + mp4 performance

Follow-up phase triggered by a 12-item user bug/feature list after
`/output/final` was validated in the browser (Phase 14 hotfix). The
items span UX polish, legacy removal, new animation features, audio
behavior, and video playback performance. They are structured into
four plans with atomic commits.

## Goal

Close every item in the user-reported list without regressing the
Phase 14 module contract or breaking existing boards / persisted
state. Each plan gets its own atomic commit; each commit keeps the
four live harnesses + the Phase 14 smoke tests GREEN.

## Plans

### Plan 15-1 — Dirty flag + Create-animation UX (items #1, #8)

**Problem**

- Item #1: The "unsaved changes" banner fires on pure dropdown
  selection, not only on actual field mutation. Selecting an existing
  value from a dropdown (e.g. to inspect it) marks state dirty even
  though nothing changed.
- Item #8: When creating a new animation, current dropdown values
  are discarded. The user has to create a blank entry first, then
  edit it — two steps for one intent.

**Scope**

- Introduce a mutation gate that compares proposed values against
  current persisted values and only calls `markLocalConfigDirty`
  when they actually differ.
- On "Create Animation" (room / inside / outside), prefill the new
  entry from the currently-selected draft dropdown values instead
  of defaults.

**Out of scope**

- Undo/redo stack. Preserving dropdown state across page reloads.

### Plan 15-2 — Legacy removal: Hitarea + Room geometry (item #5)

**Problem**

- Hitarea calibration (offset X/Y + scale) and per-room rectangle
  geometry were pre-polygon features. Since polygons fully replace
  both, the panels are visual noise and their settings can drift
  out of sync with the live polygon state.

**Scope**

- Remove the hitarea calibration panel + persist path + state.
- Remove the room geometry panel + persist path + state.
- Migrate existing saved board profiles: strip `hitareaCalibration`
  and `roomGeometry`/`roomGeometryByBoard`. Keep polygons untouched.
- Remove corresponding runtime state maps, clamp helpers,
  normalizers, and panel sync code.
- Remove the legacy hitarea/geometry event binders in
  `runtime-wire-calibration-binders.js` (or fold them out entirely).

**Out of scope**

- Redesigning the Settings layout around the removal (keep it
  functional — cleanup of gaps is OK, no visual overhaul).

### Plan 15-3 — Board upload, Align mode button, Sound mapping inline (items #4, #7, #9)

**Problem**

- Item #4: Board upload form asks for both name AND ID. ID should
  be derived from the name, with conflict-resolution suffix.
- Item #7: Align mode is buried in Settings — it's a runtime-ops
  feature, not a config, and belongs on the Dashboard.
- Item #9: The Sound Mapping panel is a global lookup. Users want
  sound selection inline with each animation definition (default:
  no sound).

**Scope**

- Item #4: Remove board ID textbox from the import form. Derive
  `boardId = slugify(name)`; if collision, append `-2`, `-3`, ….
- Item #7: Add an Align Mode toggle button to the Dashboard view
  (near Stop-All). Keep it in sync with the existing state.alignMode.
  Remove the Settings-tab control.
- Item #9: Add a `soundAssetRef` field to each room / inside / outside
  animation definition. Render a sound selector in the animation
  editor block. Remove the separate Sound Mapping panel. Migrate
  existing `animationSoundMap` → per-animation `soundAssetRef`.

**Out of scope**

- Per-animation volume overrides (already exist as room sound volume).

### Plan 15-4 — Animation transform options + graceful sound stop + mp4 perf (items #2, #3, #6, #10, #11, #12)

**Problem**

- Item #2: Board pan/zoom gestures work in Settings but not in
  Dashboard. Users want the same gesture set in Dashboard.
- Item #3: Room animations (mp4/gif) always stretch to the polygon
  bbox. Users want rotation, optional stretch, and manual
  width/height/x/y offsets when stretch is disabled.
- Item #6: Global inside animations cut audio mid-sample when
  stopped. Should let the current sound iteration play out.
- Item #10: `sandstrom.mp4` on Nemesis Lockdown A plays in Chrome
  but not Firefox. Likely codec / container issue.
- Item #11: MP4 playback stutters on Raspberry Pi + mobile despite
  the performance tier settings. Must deliver smooth playback.
- Item #12: On Nemesis A with sandstorm outside FX, mobile zoom is
  blocked (likely due to #11 lag starving the gesture thread).

**Scope**

- Item #2: Enable board pan/zoom in Dashboard view. Share the same
  gesture handlers; guard against conflicts with room click.
- Item #3: Extend room animation schema with `rotationDeg`,
  `stretchToPolygon` (default true), `widthPx`, `heightPx`,
  `offsetX`, `offsetY`. Render pipeline respects them. Editor
  block: rotation slider, stretch checkbox, conditional w/h/x/y.
- Item #6: When stopping a non-loop global inside animation,
  schedule `stopAnimationSound` for the `ended` event instead of
  calling it immediately. Loop-until-stop animations still stop
  immediately.
- Item #10: Investigate `sandstrom.mp4` codec. Re-encode with
  broad-compat profile (H.264 baseline + MP4 `-movflags
  +faststart`) OR add WebM fallback.
- Item #11: Profile + optimize mp4 render. Likely fixes: lower
  default quality floor on low-end devices, skip frames when the
  frame cost exceeds the budget, switch to off-screen canvas pre-render
  if available, hardware-accelerate via `requestVideoFrameCallback`
  where supported.
- Item #12: After #11 fix, validate gesture responsiveness. Ensure
  the touch gesture state machine isn't starved. Add a backpressure
  check if needed (skip video frames during active gestures).

**Out of scope**

- Full codec transcoding automation — one-off re-encode of
  `sandstrom.mp4` is fine.

## Ordering

The four plans are sequenced by risk and dependency:

1. **15-1** first — pure behavior fix, minimal blast radius.
2. **15-2** second — legacy removal + data migration. Needs to land
   before 15-3 because 15-3 changes state shape and we don't want
   migrations layered on top of migrations.
3. **15-3** third — upload UX + inline sound + align button. Touches
   state schema (new `soundAssetRef`), needs clean migration base.
4. **15-4** last — biggest plan. Splits into four commits: (a)
   gestures, (b) transform options, (c) graceful sound stop, (d)
   mp4 perf + sandstorm fix.

## Success criteria

- All 12 user-reported items resolved and verified in-browser
- Existing saved boards still load with no visual regression
- Four live harnesses + five Phase 14 smoke tests stay GREEN
  through every commit
- `runtime-orchestration.js` LOC stays within Phase 14's envelope
- No new TDZ or undeclared-identifier regressions
