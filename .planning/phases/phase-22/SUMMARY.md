# Phase 22 — Obsidian Design-System Migration (CLOSURE)

## Status

**CLOSED.** All five waves delivered. Feature parity with Phase 21
preserved; dark-first Obsidian theme ships across the entire control
UI. `/output` projection surface untouched (as scoped).

## Wave delivery

### Wave 1 — Foundations ✅
- `src/styles/design-system/foundations.css` — token set under
  `.dir-obsidian-dark` with a populated `.dir-obsidian-light` stub.
- `src/styles/design-system/components.css` — `.rd-btn*`, `.rd-card`,
  `.rd-segmented`, `.rd-toggle`, `.rd-slider*`, `.rd-chip`, `.rd-dot*`,
  `.rd-stage`, `.rd-scroll`.
- `src/styles/design-system/typography.css` — `.rd-h1`, `.rd-h2`,
  `.rd-body`, `.rd-sub`, `.rd-caption`, `.rd-eyebrow`, `.rd-num`.
- Inter + Inter Tight loaded via Google Fonts in `index.html`.
- `.dir-obsidian-dark` applied on `<html>`.
- Icon helper landed in `src/app/runtime/ui/icons.js` with the
  redesign's glyph set.

### Wave 2 — Dashboard (Play view) ✅
- Topbar: brand + board sub-line + running-count chip +
  Search/Settings/Align icon buttons.
- Stage wrapped in `.rd-stage` frame.
- Quick Mode rebranded as **Tap Action** (Off/Toggle/Clear segmented
  control, Toggle is the default).
- Running list grouped by room, per-animation × and per-room Clear.
- Dirty Apply/Discard bar restyled as sticky `.rd-card`.
- Align-mode indicator as `.rd-chip rd-dot-pulse`.
- Global (inside/outside) animation buttons on dashboard
  re-rendered by the refactored fx-panel sync (root-caused + fixed
  during W5).

### Wave 3 — Animation editor ✅
- Full-page editor at Settings → Animations: three-column layout
  (library list · editor pane · live preview).
- Icon picker in the Identity card; `animation.icon` persisted.
- Defaults card for opacity/speed/volume/loop.
- Live preview swatch reacts to slider changes BEFORE Apply.
- GIF/MP4 dropdown + upload/delete in Source card.
- Sound uploads integrated in the editor.
- Legacy Inside/Outside/Room sidebar panels removed; runtime
  null-guards their removed refs.
- Coded preview pre-scales age by speed.
- GIF preview uses the shared frame cache.

### Wave 4 — Settings rest ✅
- Board share panel folded into `.rd-card` with `.rd-segmented`
  tabs.
- Settings subtab switcher as horizontal segmented control.
- Polygon editor restyled: accent-palette polygon handles + room
  zones, Obsidian-themed handle dots/pills, Play Area dropdown.
- Align mode kept as dedicated surface, icon + "Align" label button
  in the topbar.
- System panel bundle/file cards + status lines.
- Polygon handle default visual trim to 0.75× (keeps touch hit
  targets at full size).

### Wave 5 — Mobile + light polish ✅
- `.dir-obsidian-light` palette populated in foundations.css
  (still behind an opt-in class; dark is the default for the
  production projection use case).
- Animation editor responsive at 1180/880 px (already shipped
  mid-wave).
- Dashboard + topbar responsive breakpoints (1180 / 980 / 920 /
  600 px) landed in theme-obsidian.css:
  - 1180: tighter topbar + chip padding.
  - 980: icon-only Align, smaller chip font.
  - 920: topbar wraps to two rows, chip fills row 2, 40-px hit
    target on buttons.
  - 600: compact card radii.
- WebGL mesh warp — seamless projection alignment on MP4
  backgrounds (was the blocker keeping alignment immersive on the
  physical board). RPi-friendly with context-lost fallback.

## Notable W5 fixes landed alongside the wave

- **First-tap-uses-stale-defaults bug**: Scanning/Slime at 1× speed
  on the very first room tap after a session start. Tracked
  `lastSyncedAnimationId` so the dispatcher re-seeds from definition
  when the draft isn't synced.
- **Vertex drag clamping**: room + play-area vertices now hug the
  board edge instead of drifting inward when the pointer leaves.
  Root cause: `normalizePolygonPoint` treated 0 as falsy
  (`Number(0) || 0.5 → 0.5`) — edge coords were being re-centred.
- **/output/ mesh seams**: replaced the 2D per-triangle clip+redraw
  with a WebGL renderer that samples a single texture via per-vertex
  UVs. No clip AA gaps, no transform mismatch between adjacent
  triangles. Raspberry Pi-friendly (lowPower + context-lost +
  graceful fallback to 2D).
- **DELETE on play-area vertices**: fixed via a
  `state.lastPolygonFocus` marker set by every polygon interaction
  (including both dropdowns). Dropdown-`<select>` also no longer
  counts as a typing target, unbreaking Ctrl+Z/DELETE after a
  dropdown change.
- **Zoom behaviour**: wheel up anchors at cursor (original UX), wheel
  down anchors at the viewport-frame centre (no directional drift,
  even at the board edge). Stage geometry cache refreshed per wheel
  event.
- **Running-count chip**: split into `N default` / `N custom` lines;
  outside-scope animations count toward "default" because they
  auto-start on reload via the outside-profile flag.
- **Last-opened board persists** in localStorage
  (`tt-beamer.last-board-id.v1`).
- **Active Play Area selection** no longer flips the dirty flag
  (captureCleanBaseline refresh when user was clean).
- **Active Play Area dropdown** no longer introduces orphaned
  focus (blur on change).
- **Room labels** shrunk from 14 px / 600-weight to 11 px / 500 with
  paint-order stroke-before-fill.
- **Polygon handles** default visual shrink to 0.75× without
  changing hit-target radii.
- **WebGL context** gracefully recovers on `webglcontextlost` (RPi
  thermal reset safe).

## Scope held

- `/output` surface untouched (as scoped).
- Bone / Inkwell redesign directions excluded.
- No new animation types; only the `animation.icon` data-model
  addition in Wave 3.

## Feature-parity checks (Phase 21 ↔ Phase 22)

- Tap-to-toggle room animations: ✓ (via Tap Action = Toggle default).
- Multi-animation-per-room stacking: ✓.
- Cluster animations: ✓ (optgroup Quick-Pick + cluster dispatch).
- Outside animation toggle: ✓ (reachable from fx-panel + count chip
  counts outside in "default").
- Live Editor per-running-animation: ✓.
- Align-mode flow: ✓ (topbar toggle; WebGL mesh warp fixes the
  projection seams).
- Polygon rotation / Ctrl+C / Ctrl+V: ✓.
- DELETE on room + play-area vertices: ✓.
- Import / export global defaults: ✓.

## Follow-ups (not phase-blocking)

- Light-mode palette needs a per-component audit pass before a
  public toggle (only foundations + stub component rules exist).
- Mobile artboard pixel-perfect recreation (the redesign's
  `Artboard-MobilePlay.jsx` / `Artboard-MobileEditor.jsx`) is
  achievable through the responsive breakpoints as-is; a further
  phase could tighten touch ergonomics.
- If MP4 frame rate on RPi drops under WebGL, consider a stride
  throttle on `texImage2D` upload (every-other-frame) — current
  renderer uploads at full display rate.

## Commits (W5, chronological slice)

```
71d882a fix(22-w3b): Dashboard room dropdown + readable <option> colours
04d2526 feat(22-w5): responsive breakpoints for the animation editor
b498d9b feat(22-w5): cluster quick-pick via optgroup; polish option/optgroup
8ff90ae feat(22-w5): Quick Mode default=Toggle, split running-count chip
4c844b1 fix(22-w5): Quick Mode default=Toggle; rename "Quick Mode" → "Tap Action"
e2430f3 fix(22-w5): forward running-count default/custom refs into ctx
ec1aab2 fix(22-w5): count outside animations as default in running-count chip
eeeefe9 fix(22-w5): Dashboard inside/outside global buttons render again
d914ed3 feat(22-w5): modern polygon + room-zone visuals in Obsidian theme
37c9c1b fix(22-w5): shrink default polygon handle visual size to 0.75×
254e926 fix(22-w5): bring back "Align" text label on the Align-mode toggle
93bcbf3 fix(22-w5): first-tap uses animation defaults, not stale session values
1ad8a3a fix(22-w5): 3 bugs — play-area-select dirty, vertex clamp, /output/ mesh seams
1ba2d97 fix(22-w5): vertex clamp hugs edges; DELETE on play-area; bigger mesh overlap
e26bfcf fix(22-w5): zero-coord falsy + skip mesh warp under sub-px drift
d9460d8 feat(22-w5): WebGL mesh warp — seamless projection alignment
5b31fa9 fix(22-w5): RPi-friendly GL init + DELETE on selected play-area vertex
687c1a4 fix(22-w5): DELETE keybinding disambiguates by active selection
8966cac feat(22-w5): wheel zoom centred, smaller room labels, sticky active board
70139e1 fix(22-w5): DELETE routes by lastPolygonFocus marker (reliable)
1de0c94 fix(22-w5): play-area / room dropdown changes update lastPolygonFocus
fd1023e fix(22-w5): <select> no longer blocks DELETE/Ctrl+Z shortcuts
d55f9d6 fix(22-w5): wheel zoom anchors at viewport frame, not stage rect
ecd4160 fix(22-w5): zoom-in cursor-anchored, zoom-out frame-anchored, cache refresh
9461031 feat(22-w5): responsive breakpoints for dashboard + topbar
```
