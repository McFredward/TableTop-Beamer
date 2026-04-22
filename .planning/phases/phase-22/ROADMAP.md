# Phase 22 — Design-System Migration (Obsidian, dark-first)

## Goal

Recreate the **Obsidian** direction of the Claude Design redesign
(`.planning/design-system/redesign/`) across the entire TableTop Beamer
control UI. Dark mode first; light mode is optional and deferred.
The `/output` projection surface is untouched — it already renders only
FX canvas + room overlay and has no "UI chrome" to redesign.

**Feature parity is mandatory.** Every feature shipped through Phase 21
must still be reachable after Phase 22, even if the workflow changes.
Where the redesign reshapes interaction (e.g. "armed + tap-to-toggle" vs.
today's dropdown-then-Start), the new workflow takes over — but no
feature gets dropped silently.

## User-confirmed constraints

1. **Direction:** Obsidian only (dark); light mode optional, later.
2. **Multi-animation-per-room:** already supported and works today — keep
   the existing stacking logic and overlap drawing. Redesign just
   surfaces it better in the Running list.
3. **Icons:** user picks one per animation in the Settings → Animations
   editor. For existing animations, we seed sensible defaults.
4. **One phase, iterative waves** — this file.
5. **Dark-first.** Light is Wave 5 (optional polish).

## Waves

### Wave 1 — Foundations
Drop the redesign tokens, fonts, and primitive components into the repo
without rewriting any existing screen. Everything keeps looking like it
does today, but the new primitives are available for Waves 2–5 to use.

**Deliverables**
- `src/styles/design-system/foundations.css` — `--c-*`, `--rd-*`, `--rd-s-*`,
  `--rd-r-*`, `--rd-t-*` tokens under `.dir-obsidian-dark` (+ empty
  `.dir-obsidian-light` stub).
- `src/styles/design-system/components.css` — `.rd-btn`, `.rd-btn-primary`,
  `.rd-btn-ghost`, `.rd-btn-danger`, `.rd-icon-btn`, `.rd-card`,
  `.rd-segmented`, `.rd-list` + `.rd-row`, `.rd-toggle`, `.rd-slider*`,
  `.rd-chip`, `.rd-dot*`, `.rd-stage`, `.rd-scroll`.
- `src/styles/design-system/typography.css` — `.rd-h1`, `.rd-h2`, `.rd-body`,
  `.rd-sub`, `.rd-caption`, `.rd-eyebrow`, `.rd-num`.
- Load Inter + Inter Tight via Google Fonts in `index.html`.
- Add `.dir-obsidian-dark` class on `<html>` (or `<body>`).
- `src/app/runtime/ui/icons.js` — SVG icon component/helper with the
  redesign's icon set (bell, flame, bolt, sparkles, drop, scan, power,
  check, x, plus, more, search, settings, play, trash, eye, info, target,
  edit, frame, clock, layers, room, chev-right, sound-on, sound-off,
  rocket, wifi).
- No user-visible change yet — existing CSS tokens (`--glow`, `--panel`,
  etc.) still drive all current components.

**Acceptance**
- Page still looks identical to end-of-Phase-21.
- `.rd-btn` class renders a correct pill button when sprinkled in the
  DOM inspector.
- Inter + Inter Tight load without FOUT flashes.
- `node -c` + manual smoke load: Dashboard, Settings, `/output` all
  render with zero regressions.

### Wave 2 — Dashboard (Play view)
Replace the dashboard's top chrome, stage frame, Quick Mode, Armed
library, parameter card, and Running list with the redesign's layout.
Keep the current Quick Mode "Off / Start / Stop / Clear" states mapped
onto the new "Tap = Toggle / Tap = Clear" segmented control — the model
maps cleanly.

**Surface changes**
- Top bar: app mark + board label + running-count chip + icon buttons
  (Search/Settings/Align/Edit).
- Stage: rounded `.rd-stage` frame with quick-mode border/glow when armed.
- Sidebar: Armed header (big icon + name + param summary), Library grid
  (4-col icon picker, searchable), Parameters card (Opacity/Speed/Sound
  via `.rd-slider-accent` + `.rd-toggle`), Running list grouped by room
  with per-anim × and per-room Clear.
- Dirty Apply/Discard bar restyled as a top-sticky `.rd-card` with
  primary/ghost buttons.
- Align-mode indicator → `.rd-chip` with pulsing dot.

**Feature-parity checks**
- Room click → toggles the armed animation (same effect as today's
  Start/Stop buttons).
- Multi-animation-per-room still works (stacks rendered overlapping).
- Cluster animations trigger via the same armed flow (hitting any room
  in the cluster triggers it; visually obvious from the Running list).
- Outside animation toggle still reachable (icon button or dedicated
  Outside chip at stage top).
- Live Editor (per-running-animation tweak) opens from the Running
  list row → reuses the current Live Editor logic.
- Stagger delay (cluster) reachable from Live Editor.
- Room stagger offset reachable from Live Editor.

**Acceptance**
- Every Phase 21 dashboard feature invocable in ≤3 taps.
- No regressions in live-sync between dashboard and `/output`.
- Automated regression tests pass.

### Wave 3 — Animation editor
Recreate the Settings → Animations workspace as per the redesign's
`Artboard-AnimationEditor.jsx` — three-column layout (library list ·
editor pane · live preview). Add the **icon picker** here since this is
the surface the user confirmed icons get assigned on.

**Surface changes**
- Left column: searchable scrollable animation list with icon + name +
  loop/oneshot indicator, `+ Add` button, `Import/More` footer.
- Middle column: Identity card (name + color + icon picker), Defaults
  card (opacity, speed, volume, loop), Preview/Save buttons top-right.
- Right column: live preview swatch + "Test on board" + delete.

**Data model additions**
- `animation.icon: string` — id of a glyph from the redesign's icon set.
  Default-seeded for existing animations (`intruder-alert → bell`,
  `fire → flame`, `hull-flicker → bolt`, `malfunction → bolt`,
  `burst → sparkles`, `slime → drop`, `scanning → scan`,
  `power-out → power`, `solid-color → lightbulb` [new glyph], …).
- Migration path: `normalizeAnimationDefinition` backfills a default icon
  if missing.

**Feature-parity checks**
- All coded-effect-specific fields (e.g. solid-color `colorHex`) still
  editable in the editor.
- Hull-flicker `breaksSolidColor` checkbox still editable.
- GIF / video / asset pickers still reachable.
- Audio mapping (per-animation sound selection + enabled + volume) still
  there.
- Rename an animation — now the name field in the Identity card.

**Acceptance**
- Round-trip edit flow: open → change → Apply → Discard works, respects
  dirty-flag semantics.
- Icon picker grid renders all ~30 icons.
- Existing JSON profile files load with backfilled icons.

### Wave 4 — Settings rest (Board, Polygon editor, Align, System)
Restyle the remaining Settings sub-panels with redesign primitives.
Keep the current information architecture (Board / Animations / System
subtabs) — only visual and grouping changes.

**Sub-surfaces**
- **Board share panel** — fold Phase 21's tabbed import UI (package /
  image) into `.rd-card` with `.rd-segmented` tabs, `.rd-btn-primary` for
  Upload, `.rd-chip` for file card.
- **Room editor + polygon editor** — the "Edit rooms" icon button from
  the dashboard opens this. Use `.rd-card` blocks for room create /
  polygon editor / cluster management. The polygon context menu keeps
  its existing behavior (rotate / add-vertex / delete etc.) with
  redesign styling.
- **Align mode** — promote to its own surface (not just an icon button).
  Keep projection profile save/load flow. Use `.rd-chip rd-dot-pulse`
  for the "Align active" indicator.
- **System** — polygon handle size, mobile perf, mp4 perf, global
  defaults export/import, API diagnostics, regression tests output.
- **Freeze room** checkbox stays where room-level rename + polygon
  live, restyled as `.rd-toggle`.

**Acceptance**
- Every Settings feature from Phase 21 accessible and styled.
- Align mode flow still works end-to-end on a real board.
- Polygon rotation + Ctrl+C/Ctrl+V paste still functional.

### Wave 5 — Mobile + light-mode polish
- Mobile dashboard recreation (ref: `Artboard-MobilePlay.jsx`).
- Mobile editor recreation (ref: `Artboard-MobileEditor.jsx`).
- Tighten responsive breakpoints (≤920px portrait stacks; ≤1080px
  narrower sidebar; landscape phone = desktop-like — same as today).
- **Optional:** light-mode palette under `.dir-obsidian-light`. Ship
  only if the rest of the phase lands cleanly.

**Acceptance**
- Phone viewports (375×812) present the mobile layouts.
- No features hidden behind hover-only interactions on touch.

## Out of scope

- `/output` view (projection surface; no UI chrome to restyle).
- Bone + Inkwell directions (reference only — not shipping).
- Any new animation types or gameplay mechanics.
- Rewriting the server / runtime pipelines. This is presentation only,
  except for the `animation.icon` field in Wave 3.

## Dependencies

- The existing CSS `:root` tokens (`--glow`, `--panel`, …) stay in
  place throughout the phase and are progressively replaced wave-by-
  wave. Removing them is the last step of Wave 4 (after every
  old-style class has a redesign-style replacement).
- Google Fonts network access required for Inter + Inter Tight at
  runtime. Same pattern as the existing Barlow Condensed / Space
  Grotesk loads.
- Reference artboards live at `.planning/design-system/redesign/`.
  Every wave opens that folder for pixel reference before writing CSS.

## Tracking

- One commit per logical unit of work (wave sub-goal), not a single
  giant Wave commit. This keeps `git bisect` usable if a visual
  regression appears later.
- Update this ROADMAP with a `## Progress log` section as waves land.
