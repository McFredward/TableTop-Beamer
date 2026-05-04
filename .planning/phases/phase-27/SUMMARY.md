# Phase 27 — Align Mode Refinement (CLOSURE)

## Status

**CLOSED.** All 9 backlog items (B1..B9) shipped as 5 plans across 5
sequential waves, then 17 hotfixes (h1..h17) addressed interactive-test
findings on Pi /output/ + dashboard. Phase scope was bounded entirely
to the align-mode editor; no other runtime surfaces were touched.

## Source

User-test multi-session feedback captured 2026-05-04. All B1..B9 items
documented verbatim in `.planning/phases/phase-27/BACKLOG.md`. All 14
gray-area decisions captured in `.planning/phases/phase-27/27-CONTEXT.md`.

## Wave delivery

### W1 — Grid foundation (B1, B2, B6) — Plan 27-01

- **27-01-T1** `f49c0fe` — `buildNewProfileDefaultGrid()` in
  `runtime-projection-grid-state.js` produces the new
  80%-centred 3×3 default. Both module init and `resetGrid()` use it.
- **27-01-T2** `1a81768` — `isEdge` proportional-remesh block (59 lines)
  removed from `onDragMove` in `runtime-projection-handle-drag.js`.
  Outer corner drag (B2) is now local-only.
- **27-01-T3** `788cf3f` — `drawLines()` in
  `runtime-projection-handle-ui.js` renders all grid lines with uniform
  teal `rgba(0,220,180,0.45)` — outer/inner visual unification (B1).

### W2 — Profile chip + dirty UX (B3, B4) — Plan 27-02

- **27-02-T1** `b97fda2` — Profile-persistence module gains snapshot,
  dirty detection, `addDirtyListener` API, `saveLoadedProfileFlow` /
  `saveAsNewProfileFlow` / `discardChanges`, D-08 schema validation.
- **27-02-T2** `3c5a10a` — Toolbar pill (top-center on /output/) with
  profile chip, Save profile / Save as new… / Discard buttons.
  `notifyDirtyChanged` wired at 9 mutation sites (4 handle-ui + 4
  handle-drag + 1 grid-state undo).

### W3 — Right-click menu (B7, B8) — Plan 27-03

- **27-03-T1** `224ace2` — Three-shape context menu via screen-space
  hit-test (`_hitTestAlignContext`). Empty / line / intersection
  branches with the locked Copywriting Contract labels. Outer-line
  delete entries hidden per D-10. Legacy "Save / Load / Delete profile"
  + "Reset all" right-click items removed.

### W4 — Squish bars (B9) — Plan 27-04

- **27-04-T1** `c01db0a` — Four squish-bar DOM elements in handle-ui
  with `SQUISH_SIDES` config + lifecycle wiring + CSS.
- **27-04-T2** `39cfeaf` — Drag handlers in handle-drag with
  edge-perpendicular drag math + opposite-side-anchored proportional
  interior scaling (mirrors `onLineDragMove` `isEdgeRow/isEdgeCol`).

### W5 — Multi-device save-gate (B5) — Plan 27-05

- **27-05-T1** `add3230` — Server-side: `liveSessionState.snapshot.alignModeDirtyOnOutput`,
  `POST /api/align-mode-dirty` endpoint with strict boolean validation +
  100 ms rate limit + 10 s grace timer on `/output/` socket close.
- **27-05-T2** `3ac4af4` — Client-side: `runtime-state` field,
  `runtime-global-defaults` apply path,
  `runtime-live-sync-core` snapshot fanout + `live-hello` seed,
  dashboard `syncAlignModeDirtyDashboardState()` toggles `disabled`
  + locked hint copy `"Unsaved changes on /output/ — save or discard
  there first."`

### Hotfix series (h1..h17) — interactive-test findings

| # | Commit | Fix |
|---|--------|-----|
| h1 | `5dcf1d8` | B6 default — pre-displace `points` so GL warp shrinks board to 80%; `srcXs/srcYs = [0,0.5,1]` while `points` at 80% means `hasGridDisplacements()` returns true on the fresh default. |
| h2 | `821243e` | "Load profile…" button added to toolbar (between Save-as-new and Discard); legacy `showProfilePickerMenu` "Cancel" → "Keep editing". |
| h3 | `1c4e846` | B5 wiring fixed: `applyGlobalDefaultsPayloadToState` ctx-wrappers preserve the `runtimeExtras` second arg + `syncAlignModeDirtyDashboardState` added to global-defaults init ctx + intersection handles forward `contextmenu` to `onContextMenu`. |
| h4 | `d736fcf` | "Save as new…" toolbar button renamed to **"New"** with new semantics: prompt name → load default geometry → save as new profile. Modal title "Create new profile". |
| h5 | `d736fcf` | `Esc` keypress now calls `discardChanges()` (not `resetGrid`). `discardChanges` no-profile branch uses `def.points` not synthesized identity. |
| h6 | `d30ce6c` | Toolbar **draggable** by the profile chip; position persisted to localStorage + included in saved profile JSON (`toolbarPosition: {x, y}`). |
| h7 | `d30ce6c` | Visible amber `● Unsaved on /output/` chip near the disabled align button + `cursor:not-allowed` + `opacity: 0.55` styling. |
| h8 | `6b3c80a` | Outer-line drag now identical to inner-line drag (no global remesh); inner mid-line deletable on default 3×3 grid; hint copy shortened (long form stays in `title`). |
| h9 | `f4d7d6c` | `isDirty()` no-profile branch uses `def.points` (matches h1's displaced default); right-click on handles no longer starts phantom drag (button-checks added); hint chip moved below topbar (`top: 116px`) so it doesn't push theme-toggle to a new row. |
| h10 | `b7dd1dc` | Reload-resilience: `_loadedProfileName` + `_loadedProfileSnapshot` persisted to localStorage. Mid-edit reload preserves profile name + dirty state. |
| h11 | `d009581` | Pan-drag (empty-canvas drag → translate whole grid) now triggers dirty flag. |
| h12 | `7f53058` | **NEW FEATURE**: four corner scale handles for proportional whole-board scaling around centroid. Uniform scale (preserves aspect); aspect-distortion is what squish bars are for. |
| h13 | `0f0f13f` | Scale-handle offset increased from ±50 to ±62 px for visual breathing room next to rotate handles. |
| h14 | `b0e0bf7` | Scale-handle cursor restored to corner-specific diagonal (TL/BR → `nwse-resize`, TR/BL → `nesw-resize`) after drag-end (was stuck on "grabbing"). |
| h15 | `cfd1aa2` | (Reverted by h16) Suppress dashboard selected-room highlight on /output/ via CSS. |
| h16 | `e775da5` | (Reverted by h17) Restore default room-zone outline on /output/ — over-suppression in h15 made selected room invisible. |
| h17 | `6530b2a` | Final fix: `is-selected` class never applied on /output/ at all. Dashboard selection has zero visual effect on projected output. |
| docs | `704d4c8` | README align-mode section refreshed; APP_VERSION → 0.27.0. |

## Aggregate metrics

- **Commits since `phase-26-end-h9` (`d98c19c`):** 35 total
  (5 feat-plan commits ×2 with summaries + 17 hotfix commits + closure docs).
- **Plan hierarchy:** 5 plans × 5 waves (serialized due to all 4 UI plans
  touching `runtime-projection-handle-ui.js`).
- **Final version:** `0.27.0` (chip).

## Decision coverage (D-01..D-14)

All 14 locked decisions from `27-CONTEXT.md` implemented at full fidelity:

| Decision | Implemented in |
|----------|----------------|
| D-01 (edge uniformity) | 27-01-T3 + h8 (line drag) |
| D-02 (corner = local-only) | 27-01-T2 |
| D-03 (profile chip + dirty + Save / New / Discard UX) | 27-02 + h2 (Load) + h4 (New semantics) + h6 (drag) + h7 (hint) |
| D-04..D-06 (single-/output/ save-gate + 10 s grace) | 27-05 + h3 (wiring) + h11 (pan dirty) |
| D-07 (no migration of existing profiles) | 27-01-T1 (default applies only to fresh) |
| D-08 (D-08 schema validation on load) | 27-02-T1 |
| D-09..D-11 (line-centric model, outer non-deletable, right-click rules) | 27-03 + h8 (mid-line deletable) |
| D-12..D-14 (4 squish bars, opposite-side anchor, trapezoid-aware) | 27-04 |

## Backlog coverage (B1..B9)

| Backlog | Status |
|---------|--------|
| B1 — outer = inner uniformity | ✓ |
| B2 — trapezoid corners (local-only) | ✓ |
| B3 — profile awareness chip | ✓ |
| B4 — dirty flag + Save / Discard / New | ✓ |
| B5 — multi-device save-gate | ✓ |
| B6 — 80%/3×3 default | ✓ |
| B7 — line-centric right-click menu | ✓ |
| B8 — line deletion end-to-end | ✓ |
| B9 — whole-board squish handles | ✓ |
| **+ scale handles (h12)** | ✓ (added during testing as bonus feature) |

## Bonus features added during testing

- **Four corner scale handles (h12)** — proportional whole-board scaling
  around centroid. Complements squish bars (which scale per-side and
  preserve opposite-side anchor).
- **README refresh (`704d4c8`)** — align-mode section rewritten in
  user-friendly tone covering all the new tools.

## Known limitations

- **Pan-drag uses arrow cursor** during the gesture, not "grabbing" —
  cosmetic, not blocking.
- **Toolbar position is per-device-per-profile**: switching profile
  restores its saved position; if no position saved, toolbar stays
  where it was. Not a bug, just a gentle UX choice (no "global default"
  override).
- **Scale handles are uniform-only** (preserve aspect ratio). For
  non-uniform scaling the user has the four squish bars per axis.

## Tags

| Tag | Hash | Marker |
|-----|------|--------|
| `phase-26-end-h9` | `d98c19c` | Phase 27 starts at this commit |
| `phase-27-end` | (HEAD) | Phase 27 closed — align-mode refinement complete |

## Closure marker

- Tag: `phase-27-end` (this closure commit).
- Final version: `0.27.0`.
- Phase artifact: this `SUMMARY.md` (W1..W5 + h1..h17 + bonus).
- All commits land on `master` between `phase-26-end-h9` (`d98c19c`)
  and the closure marker.
