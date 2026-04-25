# Phase 23 — Identity polish + cluster trigger UI

## Goal

Two coupled improvements after the Phase 22 design-system migration:

1. **Identity polish.** The application is "TableTop Beamer" — that
   name and a matching beamer/projector icon should appear in every
   touchpoint (browser tab title + favicon + topbar mark).
2. **Cluster trigger UI.** Cluster animations are currently only
   reachable via the Quick-Pick dropdown. Promote them to first-class
   surfaces next to the board so the user can see which animation is
   active per cluster and toggle/clear with the same ergonomics as a
   single-room tap.

No regressions to the dispatch / live-sync paths — both goals are
presentation-only on top of the existing cluster-dispatch logic.

## Wave 1 — Identity (browser + topbar)

**Deliverables**
- `<title>` updated from "TT Beamer Control" to "TableTop Beamer".
- Favicon: a beamer/projector glyph wired as `<link rel="icon">`.
  Use a minimal SVG so it scales crisply on retina + works as the
  tab icon. Match the topbar mark style (accent-on-dark fill,
  rounded-square frame).
- Topbar mark SVG replaced from the current "compass-like" path to
  the same beamer glyph, kept inside the existing 30-px accent
  pill in `.rd-topbar-mark`.
- Document title remains stable across SPA route changes (no JS
  doc.title rewriting needed since this app doesn't currently
  rewrite it; just make sure no boot path overwrites it).

**Acceptance**
- Browser tab shows "TableTop Beamer" with the beamer glyph
  favicon on dashboard, settings, and `/output`.
- Topbar mark glyph matches the favicon visually.
- No JS regressions; smoke-load all three views.

## Wave 2 — Cluster trigger surfaces

**Deliverables**
- A new "Clusters" rail next to the stage that renders ONE button
  per cluster defined on the active board.
- Each cluster button shows:
  - Cluster name.
  - The icon of whichever animation is currently armed for it (or
    the cluster's saved default), styled like a Library-item
    chip.
  - A small "running" badge / dot if any of its rooms is
    currently animating from a cluster dispatch.
  - A small × control inline (Tap-Action = Clear behaviour).
- Tap on the cluster button = same effect as picking the cluster
  in the existing Quick-Pick dropdown and tapping any of its
  rooms (uses existing buildClusterDispatchPlan).
- Long-press / right-click = open the cluster's Live Editor (same
  affordance as right-click on a running animation today).
- The Tap-Action segmented control on the dashboard already drives
  the toggle/clear behaviour; cluster buttons inherit it (Off /
  Toggle / Clear).
- Live-sync coverage: another control client sees cluster trigger
  state in real time.

**Surface placement**
- Default: right column of the dashboard, between the stage and
  the existing sidebar — a vertical "Clusters" stack that
  collapses to icon-only on narrower viewports.
- Settings → Polygon editor's existing "Clusters" sub-panel keeps
  its full-fidelity create/rename/delete UI; the dashboard rail
  only triggers / displays state.

**Data model**
- No schema additions needed — clusters already carry name + room
  list. The "currently armed cluster animation" comes from the
  existing roomDraft state (when targetType === "cluster"). For
  the visible state on the rail, derive from
  state.runningAnimations entries with scope === "cluster".
- Add `cluster.icon: string` mirror of `animation.icon` from
  Phase 22 W3 IF the user wants per-cluster icons. Otherwise
  inherit the icon from the default animation set on the cluster.

**Feature-parity checks**
- Dropdown-based cluster trigger still works (don't remove the
  existing path; the rail is additive).
- Stagger start / stagger offset still controllable via Live
  Editor on a running cluster animation.
- Multi-cluster running stacks correctly (one cluster per rail
  button, multiple can be active).

**Acceptance**
- A board with N clusters renders N rail buttons.
- Tap on a button starts the cluster animation; tap again
  toggles off (when Tap-Action = Toggle).
- Per-button running indicator updates in real time.
- Cluster Live Editor reachable from the rail (long-press +
  right-click).
- Live-sync test: two control clients see the same rail state.

## Out of scope

- New cluster gameplay mechanics (e.g. cluster-only animation
  types, sequencing).
- Mobile-specific cluster UI redesign — desktop-first; mobile
  inherits the responsive breakpoints from Phase 22 W5 (the rail
  collapses to icon-only at narrow widths).
- Re-skinning the Settings → Polygon Editor cluster sub-panel
  beyond what the dashboard rail needs.

## Dependencies

- Phase 22 W3 icon picker (`animation.icon`) — used by the rail
  to render per-cluster icons.
- Phase 22 W2 Tap-Action segmented control — drives the cluster
  rail's toggle/clear behaviour.
- Existing `buildClusterDispatchPlan` + cluster scope in
  `state.runningAnimations` — reused as-is.

## Tracking

- Wave 1 = single commit (title + favicon + mark glyph).
- Wave 2 = several commits along the natural slices: rail
  scaffold + per-button render + dispatch wiring + responsive
  + live-sync verification.
