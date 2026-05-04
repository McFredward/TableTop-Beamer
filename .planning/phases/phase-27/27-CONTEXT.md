# Phase 27: Align Mode Refinement - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

UX refinements to the Align Mode editor on top of the existing
projection-grid system (`runtime-projection-*`). Scope:
- Edge uniformity (B1): outer rectangle edges behave identically to
  inner lines.
- Trapezoid corners (B2): outer corners are freely draggable, but
  with **local-only deformation** — same behavior as inner points.
- Profile awareness (B3) + dirty-flag UX (B4) + multi-device save
  gate (B5) — surfaced minimally because we're targeting a
  single-Pi-on-/output/ deployment, not a generic multi-tenant setup.
- New default layout (B6): 80% rectangle + one mid horizontal +
  one mid vertical line, applied to **new** profiles only.
- Right-click menu correction (B7+B8): switch from a point-deletion
  model to a **line-deletion** model — points are intersections, not
  primary entities.
- Whole-board squish handles (B9): four bars (one per side) outside
  the outer rectangle that compress the whole grid with the
  opposite-side anchored.

Not in scope: anything outside the align-mode editor; new
projection-mapping features beyond B2/B9; deep multi-device
identity infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Edge uniformity (B1)
- **D-01:** The outer rectangle edges and outer corner points use
  the same drag/select/snapping logic as interior lines and
  intersections. No special-case code path for "outer" handles
  (except non-deletability — see D-09).

### Trapezoid corners (B2)
- **D-02:** Outer corner points are freely draggable, identical to
  interior intersections. **No automatic global remesh** — the
  drag deforms only the immediately adjacent grid segments (the
  same local-only behavior interior points already have). The user
  consciously rejected the "drag a corner → bilinearly redistribute
  all interior points" approach because it would couple unrelated
  edits.

### Profile awareness + dirty-flag UX (B3 + B4)
- **D-03:** **Claude's discretion** for placement, visual style,
  and copy. Recommended approach (locked unless user revisits):
  - Place a small **profile chip** in the align-mode toolbar (top
    edge of the screen during editing), showing the loaded profile
    name (or "Unsaved" if none loaded).
  - Dirty marker: append a small orange dot `●` before the profile
    name + change name color from neutral to the same accent orange
    used by the existing dirty-state convention in the rest of the
    app (if no convention exists, use `--c-warning` from the design
    tokens).
  - Two action buttons next to the chip: **Save** (primary —
    overwrites the loaded profile in place) and **Save as new...**
    (secondary — opens a text-input modal for the profile name).
    When no profile is loaded, "Save" is the same as "Save as new"
    and prompts for a name.
  - **Discard** button: direct revert, **no confirmation modal**
    (per user). Restores the loaded profile's last-saved geometry,
    or clears to default if no profile was loaded.
  - Dirty state is computed by comparing live grid state against
    the loaded profile's persisted geometry (deep-equal of
    `srcXs/srcYs/points`).

### Multi-device save-gate (B5)
- **D-04:** Simplification accepted: this product runs with **at
  most one /output/ client at a time** (the Pi connected to the
  beamer). Therefore no friendly-name UI, no per-device identity
  registry, no offline-timeout edge cases.
- **D-05:** When /output/ has unsaved align-mode changes, the
  dashboard's "Align Mode" toggle in System tab is **disabled**
  with a clear hint: e.g. "Unsaved changes on /output/ — save or
  discard there first." The dashboard cannot turn align mode off
  while /output/ is dirty.
- **D-06:** Server-enforced: dirty state is part of the
  align-mode broadcast payload (live-sync existing channel). When
  /output/ disconnects (websocket drop), the server clears the
  dirty flag after a short grace period (10 s — accommodates short
  reloads but doesn't lock the dashboard forever if the Pi reboots
  unexpectedly). This grace timer is reset every time the /output/
  client heartbeats with a still-dirty state.

### Default layout migration (B6)
- **D-07:** **No migration of existing profiles.** Profiles already
  saved on disk keep their stored geometry verbatim, regardless of
  whether they used the old default. Only profiles created **after
  Phase 27 lands** start from the new default (80% centered
  rectangle + one horizontal mid-line + one vertical mid-line =
  3×3 grid).
- **D-08:** Existing profile compatibility verified at load: every
  loaded profile must round-trip cleanly through the new code
  paths. If a profile fails to load (incompatible schema), surface
  a clear error and offer to reset to default — don't silently
  overwrite the file.

### Grid model (data-model clarification driven by B7)
- **D-09:** **Lines are the primary editable entities; points are
  derived as line intersections.** Existing data model already
  supports this (`grid.srcXs[]`, `grid.srcYs[]`,
  `grid.points[row][col]`). Phase 27 makes this explicit in the
  UI:
  - Add/remove operations work on lines (add a vertical line at
    column index N; remove the horizontal line at row index M).
  - Intersections are recomputed automatically when lines are
    added/removed; existing displaced positions are preserved
    where lines are not affected.
  - **Outer lines (the bounding rectangle) are NOT deletable.**
    `srcXs[0]`, `srcXs[length-1]`, `srcYs[0]`, `srcYs[length-1]`
    and the corresponding rows/columns in `points` are immutable
    array slots.
  - Inner lines ARE deletable. Adding/removing inner lines is
    free.

### Right-click menu rules (B7 + B8)
- **D-10:** Replace the existing point-centric menu with a
  line-centric menu. Hit-testing distinguishes three target types:
  - **On an inner line (≤ ~6 px from the rendered line, not on
    an intersection):** menu shows **"Delete this line"** plus
    **"Add line through this point"** (insert a perpendicular line
    at the click coordinate).
  - **On an intersection point (≤ ~10 px from the point):** menu
    shows **"Delete vertical line"** + **"Delete horizontal
    line"** + the same "Add line through this point" option. Each
    delete option is greyed out / hidden when the corresponding
    line is an outer (boundary) line.
  - **On empty canvas (not on a line, not on a point):** menu
    shows **only** "Add vertical line here" + "Add horizontal line
    here" — no delete options at all.
- **D-11:** Line deletion is end-to-end: the line is removed from
  `srcXs`/`srcYs`, the corresponding row/column is removed from
  `points`, the change is undoable (existing undo stack), and
  saves through the existing profile-persistence path.

### Squish handles (B9)
- **D-12:** **Four bars, one per outer side** (top, bottom, left,
  right) — not per-corner, not per-axis-pair. Each bar squishes
  the grid along the perpendicular axis of its side.
- **D-13:** **Opposite-side anchor** during squish drag — the
  side opposite the dragged bar stays fixed in screen space, so
  the board does not translate. Only the dragged side and all
  interior parallel lines move proportionally toward (or away
  from) the anchor.
  - Example: dragging the top bar downward by 50 px shrinks the
    board vertically by 50 px from the top, with the bottom edge
    pinned. All horizontal interior lines compress proportionally.
- **D-14:** **Claude's discretion** for visual style, exact
  position offset, and trapezoid-edge interaction:
  - Recommended visual: a slim rectangular bar (e.g. 60 px × 8 px
    on each side, perpendicular to the side) styled with the same
    accent color as the rotate handles but a clearly different
    shape (rectangular bar vs round button) so users don't confuse
    them.
  - Recommended position: same offset distance from the outer edge
    as the existing rotate handles (consistency with established
    pattern).
  - Recommended trapezoid handling: when B2 produces a trapezoid
    outer (i.e. the outer corners are no longer rectangle-aligned),
    the squish bars sit at the **midpoint of each outer edge** and
    the squish operates along the **edge-perpendicular** local
    axis, not world X/Y. The opposite-edge anchor still applies
    (against the opposite outer edge's midpoint).

### Folded Todos
[None — no pending todos in the GSD todo system matched Phase 27 scope.]

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 27 inputs
- `.planning/phases/phase-27/BACKLOG.md` — full B1..B9 user
  requirements with original test-feedback context.
- `.planning/ROADMAP.md` §`Phase 27 - Align Mode Refinement` —
  M1..M6 milestones and exit criteria.

### Existing align-mode code (must read before planning)
- `src/app/runtime/viewport/runtime-projection-mapping.js` — top-
  level orchestrator for the align-mode editor. Owns mode toggle,
  per-frame post-draw hook, and the bridge into render mode
  (auto/2d/gl).
- `src/app/runtime/viewport/runtime-projection-grid-state.js` —
  grid data model (`srcXs[]`, `srcYs[]`, `points[row][col]`),
  undo stack, localStorage+server persistence,
  `hasGridDisplacements()` displacement check, `resetGrid()`.
- `src/app/runtime/viewport/runtime-projection-handle-ui.js` —
  intersection-handle DOM, line-canvas overlay, **rotate handle**
  pattern (the reference for B9 squish-bar styling and
  positioning).
- `src/app/runtime/viewport/runtime-projection-handle-drag.js` —
  drag math for intersections and (currently) line moves. B9 will
  add a new drag mode for the squish bars.
- `src/app/runtime/viewport/runtime-projection-profile-persistence.js`
  — load/save profile JSON. B3/B4 dirty-flag must integrate with
  this (compare live state against last-loaded profile geometry).
- `src/app/runtime/viewport/runtime-projection-gl-renderer.js` —
  GL mesh-warp shader. Must continue to work after B2 outer-corner
  freedom (it already supports any quad layout — no shader
  changes expected, but verify).
- `src/app/runtime/polygon-editor/runtime-polygon-context-menu.js`
  — existing context-menu pattern (room polygons). Reuse the same
  positioning, dismiss-on-outside-click, and aria conventions for
  the new align-mode menu.
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — existing
  websocket fanout. B5 dirty-state broadcast extends this channel.
- `server.mjs` §`handleGlobalDefaultsSave` and the websocket
  broadcast helpers — server side of B5 dirty-flag enforcement.
- `config/projection-profiles.json` — current persisted profiles.
  Confirms what "compatibility" (D-08) means in practice.

### Phase 26 closure context
- `.planning/phases/phase-26/SUMMARY.md` — Phase 26 closed at
  v0.26.23 with the bundled Pi /output/ hardening; render-mode
  toggle + diagnostic overlay are now permanent infra Phase 27 can
  rely on.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`grid.srcXs/srcYs/points` data model** — already line-based at
  the source. Phase 27's "lines are primary" UI (D-09) maps
  directly onto this without a refactor.
- **Undo stack** (`pushUndo`, `undo`, `MAX_UNDO=50`) — line
  add/remove operations should snapshot through this same path.
- **Rotate handles** (`rotateHandleElements` in
  `runtime-projection-handle-ui.js`) — exact reference for B9 bar
  positioning and event-binding pattern. Same outside-the-board
  placement, same DOM-element-per-corner approach (but per-side
  for B9).
- **Live-sync `global-config-update` channel** — existing path for
  broadcasting state to all clients. B5 dirty-flag rides on this.
- **`runtime-polygon-context-menu.js`** — full reference impl for
  positioning, dismissing, and aria-labeling a context menu. The
  new align-mode menu should mirror this so users see consistent
  context-menu UX across the app.

### Established Patterns
- **Server-persisted runtime settings via `global-defaults.json` +
  WebSocket broadcast** — Phase 13/26 pattern. Used for
  renderMode, diagnosticOverlay, animationSpeed. Dirty-flag (D-06)
  follows the same pattern: server holds the truth, broadcasts on
  change.
- **`requestIdleCallback` is unreliable on Pi /output/** (Phase
  26-h9 finding). If any new Phase 27 work needs to defer work,
  bypass the idle queue when running under `OUTPUT_ROLE_FINAL`.
- **`replace_all: false` line-by-line edits** — match existing
  conventions when editing the grid-state file.

### Integration Points
- **Align-mode toggle button** lives in the dashboard's System tab
  (already wired). Adding D-05 disable + hint text is local to
  this control.
- **Profile-persistence module** is the natural home for D-08
  compatibility validation.
- **Stage gesture binders** (`runtime-wire-stage-gesture-binders.js`)
  already handle pointer events on the projection canvas — D-10
  right-click menu handler hooks in here.

</code_context>

<specifics>
## Specific Ideas

- **B7 conceptual correction (lines vs points).** This is the
  single most impactful clarification of the discussion: the user
  rejected "Delete point" as a UI concept entirely. The mental
  model is "the grid is defined by lines; points are just where
  lines cross." This drives D-09, D-10, and the right-click menu
  shape. The data model already supports this — only the UI shifts.
- **B9 anchoring is firm:** opposite-side fixed (D-13). The user
  explicitly rejected the alternatives ("the board itself should
  not move"). No symmetric-from-center mode.
- **Single /output/ assumption (B5):** the user explicitly scoped
  this down — "Eigentlich sollte nur ein Device (das mit dem
  beamer connected ist) den /output/ Pfad offen haben." Phase 27
  may surface a soft warning if a second /output/ client connects,
  but does NOT need to support multi-/output/ coordination.
- **Discard is direct (B4):** no confirm modal. The user is happy
  to lose unsaved changes on a Discard click — fewer clicks
  outweighs accidental-data-loss concern in this workflow because
  align-mode geometry is easy to redo.

</specifics>

<deferred>
## Deferred Ideas

- **Friendly device names / multi-device identity registry.** B5
  was scoped down to single-/output/; if the product later supports
  multiple beamers (Phase 28+?), revisit the friendly-name UI.
- **Symmetric-from-center squish mode.** Not in scope; if users
  later want it, add as a Cmd/Ctrl-modifier on the squish drag.
- **Save-as-new-profile UX polish** (folder/category picker, etc.)
  — basic name-input modal is enough for now.
- **Rotate-handles redesign** — out of scope. Rotate handles
  remain visually as-is; B9 bars are added next to them.

### Reviewed Todos (not folded)
[None — no todos were surfaced for review.]

</deferred>

---

*Phase: 27-align-mode-refinement*
*Context gathered: 2026-05-04*
