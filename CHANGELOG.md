# Changelog

All notable user-facing changes to TT-Beamer are documented in this file.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The project ships a new version with every closed phase (see
`.planning/ROADMAP.md`). Patch bumps for small-fix phases, minor for new
user-facing features, major for big architectural shifts.

---

## [1.1.1] — 2026-05-22

Phase 51: Animation Name input keystroke focus loss.

### Fixed
- Typing in the animation **Name** field no longer ends the input
  session after every keystroke. On desktop the caret stayed inside
  the input but the field was being blurred + re-focused on each
  letter; on mobile this dismissed the soft keyboard after each
  letter, making the field effectively unusable. Root cause: Phase 49
  gap-closure-25 added a defensive `document.activeElement.blur()`
  inside `syncDirtyBar()` (to dismiss the keyboard when the dirty bar
  first appears) — but the blur fired on every syncDirtyBar call,
  including the ~one per keystroke during a Name edit. Now gated to
  the false→true dirty-flag transition only. (`<sha>`, Phase 51)

---

## [1.1.0] — 2026-05-21

Phase 50: Aspect-ratio-aware board import.

### Added
- Boards of arbitrary aspect ratio (square, portrait, ultrawide, etc.)
  now display at their **natural aspect ratio** instead of being forced
  into the Nemesis-specific 7978 × 5456 (~1.46:1) frame. Roughly-square
  imports like Frostpunk (1172 × 1080, ~1.085:1) used to be cropped at
  the top and bottom by `object-fit: cover`; they now show the full
  image. Polygons drawn on the board scale automatically because their
  coordinates are normalized to 0..1. (`9072b22`, Phase 50)

### Changed
- The stage element's `aspect-ratio` and width calculations now read
  from two CSS custom properties (`--board-aspect`, `--board-aspect-num`)
  that the runtime sets from the loaded board image's natural
  dimensions. Default fallbacks preserve the previous Nemesis ratio so
  existing boards display identically to v1.0.0. (`9072b22`, Phase 50)

---

## [1.0.0] — 2026-05-19

Initial public release. Phase 49 closure shipped the first live build
after a long iteration cycle of operator UAT polish on top of the
Phase 47 Windows process-supervision work. Highlights below — the
full per-fix list is in `git log --grep "49-gap-closure-"`.

### Added
- **"Import from other board" button** in the projection profile UI:
  one-click flow to copy a profile from another board into the active
  one. (`3eb4e92`, Phase 49 / gap-closure-25)

### Changed
- **Mobile portrait viewport** zoom-out + cluster-rail clipping rework
  so the rail (cluster pads) is visible by default without horizontal
  swipe, and never overlays the dashboard controls when the board is
  panned. (`756e21e` + `167d660`, Phase 49 / gap-closure-34/35)
- **Animation editor dirty-bar** redesigned for mobile: shrink-wrapped
  bar (no more right-edge clipping), no auto-focus on touch devices
  (no more soft-keyboard popping up on entry), hover styles gated to
  real-hover devices via `@media (hover: hover)`, Discard handler
  reworked to fire syncDirtyBar AFTER the async server reload finishes
  (no more "first-tap-did-nothing" perception on slow networks).
  (`de7af52` + `37fb6a9` + `3ac579b` + `7b32e04`, Phase 49 / gap-closure-25 through 28)
- **Mobile drag-to-reorder** in the animation library list now
  preserves native scrolling AND drag with auto-scroll-during-drag
  (Sortable.js-style `touchmove.preventDefault()` pattern instead of
  static `touch-action: none`). (`c935da6`, Phase 49 / gap-closure-23)
- **Board switch** falls back to the first available saved profile
  when no profile is remembered, instead of forcing the 80%-inset
  default. (`c9ea5e4`, Phase 49 / gap-closure-26)
- **Polygon edits** now broadcast to /output/ SSR + Pi immediately on
  save, not only after a full page reload. (`69e6f4d`, Phase 49 / gap-closure-23)

### Fixed
- **Align-mode fresh-boot desync**: typo in the polygon-editor hook
  meant the /output/ tab silently skipped the warp-grid apply path on
  cold boot. (`b79a9b3`, Phase 49 / gap-closure-22)
- **Dashboard CPU drain** when a remote operator was align-dragging
  on /output/: dashboard was running a self-perpetuating 8 Hz
  poll-and-apply loop, draining battery + starving animations.
  Three-round empirical debug located the documentVisible fast-mode
  trigger as the actual culprit (after fixing two earlier red
  herrings). (`c868c75` + `10eac9a` + `ca573f9`, Phase 49 / gap-closure-27/29/32)
- **Undo to baseline on /output/** now correctly clears the dashboard's
  "Unsaved on /output/" chip. (`92ab41d`, Phase 49 / gap-closure-30)
- **Reorder back to baseline** in the animation editor now auto-clears
  the dirty flag (was pinned at true because the fast-path skipped
  the baseline comparison). (`432e3f5`, Phase 49 / gap-closure-24)
- **Board-switch loses cross-board profile** when the operator picked
  a board that didn't have a saved profile. (`c74a406`, Phase 49 / gap-closure-24)
- **Win32**: dashboard rendered a white page on first boot
  (path.normalize root issue) + verdict-line crashed on a producerIds
  shape mismatch. (`b8ad1f1` + `db0b53a`, Phase 49 gap-closure-8/9)
- Numerous mobile-touch interaction polishes — see
  `git log --grep "49-gap-closure-1" --grep "49-gap-closure-2"` for
  the full sequence.

### Process
- TT-Beamer went LIVE with this build (2026-05-19). Going forward
  every closed phase ships a version bump + a CHANGELOG entry.
