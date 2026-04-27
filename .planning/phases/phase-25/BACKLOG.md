# Phase 25 — Bug & Polish Backlog

User-reported issues collected at the close of Phase 24
(2026-04-27). To be triaged into a ROADMAP at the start of
Phase 25.

Each item is captured verbatim from the user's report (translated
to English where helpful) plus a brief technical note on the
likely surface area, to accelerate Phase 25 planning.

---

## 1. Cluster fake-room legibility in white theme

**Report:** In the white theme the cluster fake-room turns white
itself, so the "CLUSTER" label can no longer be read. The white
theme should not affect the cluster fake-room appearance.

**Surface area:**
- `src/styles/design-system/theme-*.css` — cluster fake-room
  colour rules
- `src/app/runtime/animation/runtime-lifecycle-cluster-pads.js`
  and `src/app/runtime/board/runtime-board-cluster.js` (cluster
  fake-room render)

**Acceptance:** "CLUSTER" label is legible in every theme; the
cluster fake-room visual is theme-independent.

---

## 2. Versioning display

**Report:** Show a version number somewhere in small print that
will be incremented going forward.

**Surface area:**
- New: a `VERSION` constant (file or `package.json` field)
- Footer / topbar in `src/index.html` or
  `src/app/runtime/runtime-toolbar.js`

**Acceptance:** Version visible in a small, unobtrusive corner
(e.g. footer or settings panel). Bump scheme defined for future
phases (e.g. `MAJOR.MINOR.PATCH` tied to phase number).

---

## 3. Toggle animations not refreshing after board / animation change

**Report:** The toggle-animation tiles do not refresh directly
after a board switch or after an animation is edited — the user
must first switch tap-action mode to "Clear" or "Select" and then
back to "Toggle" before the tiles reflect the new state. They
should refresh directly.

**Surface area:**
- `src/app/runtime/runtime-tap-action.js` (toggle list builder)
- Board-switch + animation-save events in
  `src/app/runtime/runtime-orchestration.js` /
  `runtime-animation-lifecycle.js`

**Acceptance:** Toggle tiles reflect the latest animation set
immediately after every board switch and after every animation
edit/save.

---

## 4. Animation overlay behaviour in cluster fake-rooms

**Report:** In cluster fake-rooms, animation overlay does not yet
work like in normal rooms — order of dispatch still matters and
animations do not overlay. It should behave identically to all
other rooms.

**Surface area:**
- `src/app/runtime/animation/` (animation-engine + lifecycle —
  the overlay/composite path for cluster targets)
- `src/app/runtime/board/runtime-board-cluster.js`

**Acceptance:** Cluster fake-rooms compose multiple concurrent
animations identically to normal rooms (alpha-overlay
independent of dispatch order).

---

## 5. Cluster fake-rooms only visible on Dashboard view

**Report:** The cluster fake-rooms should only be visible when
"Dashboard" is the selected view. When "Settings" is selected
they should not be visible.

**Surface area:**
- `src/app/runtime/runtime-view.js` (view-switch logic)
- `src/app/runtime/animation/runtime-lifecycle-cluster-pads.js`
  (`renderClusterPads`)

**Acceptance:** Cluster pad rail / cluster fake-rooms hidden when
the active view is anything other than Dashboard. Verified via
view switches and via deep-link to non-dashboard views.

---

## 6. Optional invisible / disabled room name in Room Editor

**Report:** Add an option in the Room Editor to make the room
name invisible / disable its display.

**Surface area:**
- `src/app/runtime/ui/room-editor-*.js` (Room Editor panel)
- Room model: per-room `nameVisible: boolean` field +
  serialization
- Room render path (`src/app/runtime/runtime-rooms.js` or
  similar) honours the new field

**Acceptance:** Toggle in the Room Editor controls whether the
room name renders. Persists across save/load. Default = visible
(no behaviour change for existing rooms).

---

## 7. Drop the secondary delete-confirmation in Animation Editor

**Report:** When deleting in the Animation Editor, do not ask for
an extra confirmation — the dirty flag already covers the
intent.

**Surface area:**
- `src/app/runtime/ui/animation-editor-*.js` (delete handler)

**Acceptance:** Clicking delete on a clean state deletes
immediately; on a dirty state the existing dirty-flag prompt
covers the case. No second `confirm(...)` dialog.

---

## 8. Space animation runs at different speeds across views

**Report:** The Space animation feels different in speed between
Dashboard, `/output/`, and the Preview in the Animation Editor.
It should be identical everywhere.

**Surface area:**
- `src/app/runtime/animation/animation-space.js` (or wherever the
  Space animation tick is implemented)
- Preview-tick driver (animation editor) vs main draw loop vs
  `/output/` draw loop — likely a `dt`/`elapsed` parameter is
  inconsistent

**Acceptance:** Visual speed of Space animation is identical on
Dashboard, `/output/`, and Animation Editor preview at the same
configured `speed`.

---

## 9. Brief stutter on every animation start

**Report:** Every time an animation starts the program freezes
for a brief moment — particularly noticeable on mobile. Investigate
whether the start path can be decoupled to remove the hitch.

**Surface area:**
- `src/app/runtime/animation/runtime-animation-lifecycle.js`
  (start pipeline)
- Possible candidates: synchronous asset decode, large
  `JSON.parse` / `JSON.stringify`, layout thrash from DOM
  insertion, `localStorage` write on the start path

**Acceptance:** No measurable main-thread stall on animation
start, verified on mobile. Whatever sync work caused the hitch
is moved off the start path (deferred / async / cached).

---

## 10. Coded animation "Power Outage" ignores speed

**Report:** The coded animation "Power Outage" does not react to
the speed parameter.

**Surface area:**
- `src/app/runtime/animation/animation-coded-*.js` — find the
  Power Outage handler, check that it consumes the `speed`
  parameter (likely hardcoded interval).

**Acceptance:** Adjusting the Power Outage speed slider visibly
changes the cadence in Dashboard, `/output/`, and preview.

---

## 11. "Outside Sandstorm" animation icon not in selectable icon set

**Report:** The "Outside Sandstorm" animation has an icon that is
not in the selectable icon set in the Animation Editor. Every
icon used by an animation should be selectable.

**Surface area:**
- Icon registry / picker (likely in
  `src/app/runtime/ui/edit-pane-asset-picker.js` or similar)
- Default-animation seed data — wherever Outside Sandstorm's
  icon name is defined

**Acceptance:** The Outside Sandstorm icon (and all
default-animation icons) is present in the icon picker so the
user can re-select it from a fresh state. Audit pass: every
default animation's icon ∈ picker set.

---

## 12. Solid colour intensity at room-overlap regions

**Report:** Rooms can slightly overlap. When solid-colour mode is
on in each, the overlap area looks more intense. The overlap
should blend smoothly instead.

**Surface area:**
- Solid-colour render path for rooms (canvas composite mode —
  currently likely default `source-over` accumulating alpha) in
  `src/app/runtime/runtime-rooms.js` /
  `src/app/runtime/runtime-render.js`
- May need a per-pixel max / lighter / dedicated mask pass

**Acceptance:** Two overlapping rooms with the same solid colour
visually match a single room of that colour at the overlap (no
intensity bump). Two overlapping rooms with different solid
colours blend smoothly without a hard intensity edge.

---

## Triage notes (for Phase 25 ROADMAP author)

Suggested Phase 25 wave grouping (rough first cut, to be
validated during planning):

- **Wave 1 — UX polish (low-risk, decoupled):**
  Items 1, 2, 5, 6, 7, 11.
- **Wave 2 — Refresh / state propagation:**
  Item 3.
- **Wave 3 — Animation parity & engine:**
  Items 4, 8, 10.
- **Wave 4 — Render fidelity:**
  Item 12.
- **Wave 5 — Performance:**
  Item 9 (likely needs profiling first).

All work in Phase 25 must preserve the wire-protocol and
storage-key invariants documented in
`.planning/phases/phase-24/SUMMARY.md` (LOCKED literals).
