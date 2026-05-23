# Changelog

All notable user-facing changes to TT-Beamer are documented in this file.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Cadence (operator-confirmed 2026-05-22): every closed phase ships a PATCH bump
(1.0.0 → 1.0.1 → 1.0.2 → …). MINOR bumps (e.g. 1.0.x → 1.1.0) are reserved
for operator-cut release milestones — multiple PATCH entries may be rolled
up into one MINOR release section at cut-time.

---

## [1.0.5] — 2026-05-24

Phase 54: Stream-quality preset → numeric bitrate slider.

### Changed
- **Settings → System → Stream-quality preset** is now a **numeric
  bitrate slider** (2–50 Mbit/s, integer steps) instead of a 5-option
  radio group. Operators can experiment freely with bits-per-frame
  to find the sweet spot for their hardware. Default 16 Mbit/s
  (equivalent to the old "extra-high" preset). (`<sha>`, Phase 54)
- **Inline soft-warning** appears below the slider when the value
  exceeds 20 Mbit/s: "the software encoder may stutter on weak CPUs;
  a hardware encoder is strongly recommended". The slider is NOT
  blocked — the operator can dismiss the warning by setting any value
  they want. (`<sha>`, Phase 54)
- The legacy `qualityPreset` enum field in `config/global-defaults.json`
  was migrated in-place to `streamBitrateMbps` (numeric). Mapping:
  low-latency → 4, balanced → 8, high-quality → 12, extra-high → 16,
  ultra-high → 20. SSR encoder + WebRTC sender now read the bitrate
  directly from the slider value via
  `deriveSimulcastBitrates({ configuredBitrate })`. (`<sha>`, Phase 54)
- The Pi-side diagnostic overlay's "preset=" field shows the literal
  Mbit/s value (e.g. `25Mbps`) instead of the preset name. (`<sha>`, Phase 54)

---

## [1.0.4] — 2026-05-24

Phase 53: Nemesis Lockdown A/B polygon Y-shift migration.

### Fixed
- **Nemesis Lockdown A/B rooms y-shifted on the dashboard** since v1.0.1
  (Phase 50). The PNG images for these two boards are rasterized at
  2500 × 1755 (aspect 1.4245), but the polygon coordinates were drawn
  against the original Nemesis print aspect 7978 × 5456 (= 1.4623).
  Phase 50 switched the dashboard stage from the hardcoded print
  aspect to the actual image aspect → the 0..1 normalized polygon Y
  values now mapped to a slightly different (1.3 % taller) image
  region, visibly shifting the room outlines on the dashboard.
  (`<sha>`, Phase 53)

### Migration
- One-time data migration applied to `config/boards/nemesis-lockdown-a.json`
  + `nemesis-lockdown-b.json` polygon Y coordinates (rooms + play
  areas) AND to `config/projection-profiles.json` `srcYs` arrays for
  every lockdown profile. Both shifted by `y * r + (1-r)/2` where
  `r = (2500/1755) / (7978/5456) ≈ 0.9742`. Co-migrating both keeps
  the projector-mesh calibrations aligned with the migrated polygons,
  so the operator does NOT need to re-calibrate the projection after
  this patch.
- Nemesis-board-a/-b unaffected — their JPGs are 7978 × 5456 already,
  so Phase 50 + the original polygon design aspect match exactly.
- Frostpunk unaffected — its polygons were drawn after Phase 50
  shipped against the natural PNG aspect.
- Migration scripts preserved at
  `.planning/phases/phase-53/migrate-lockdown-y-*.py` for audit.

---

## [1.0.3] — 2026-05-22

Phase 52: Per-animation transform editing + temporary-vs-permanent
distinction in the live editor.

### Added
- **Transform card in the animation editor** (Settings → Animations →
  pick a room animation that uses an MP4 or GIF asset). A new
  collapsible "Transform" section exposes the same sliders that were
  previously only reachable through the live editor: rotation, stretch
  to polygon, width scale, height scale, X / Y offset. Changes
  persist directly to the animation definition — no need to start the
  animation first to tune its placement. Hidden for scopes that don't
  support transforms (inside / outside, room coded effects).
  (`8e8d1aa`, Phase 52)
- **"Save as default for this animation" button** in the live editor,
  below Done / Discard. Commits the running animation's current
  live-editor values (opacity, intensity, speed, volume, color, mode,
  direction, transform) back to the animation definition so every
  future manual trigger applies those values. The button is the
  explicit-commit path. (`8e8d1aa`, Phase 52)

### Changed
- **Live editor "Done"** no longer silently persists transform values
  to the animation definition. Done now means "keep these tweaks on
  the running instance only — next manual trigger uses the un-tweaked
  defaults". The new "Save as default" button is the path that
  overrides the definition. (`8e8d1aa`, Phase 52)

---

## [1.0.2] — 2026-05-22

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
  the false→true dirty-flag transition only. (`91ac380`, Phase 51)

---

## [1.0.1] — 2026-05-21

Phase 50: Aspect-ratio-aware board import.

### Added
- Boards of arbitrary aspect ratio (square, portrait, ultrawide, etc.)
  now display at their **natural aspect ratio** instead of being forced
  into the Nemesis-specific 7978 × 5456 (~1.46:1) frame. Roughly-square
  imports like Frostpunk (1172 × 1080, ~1.085:1) used to be cropped at
  the top and bottom by `object-fit: cover` on the dashboard; they now
  show the full image. Polygons drawn on the board scale automatically
  because their coordinates are normalized to 0..1. (`9072b22`, Phase 50)

### Changed
- The stage element's `aspect-ratio` and width calculations now read
  from two CSS custom properties (`--board-aspect`, `--board-aspect-num`)
  that the runtime sets from the loaded board image's natural
  dimensions. Default fallbacks preserve the previous Nemesis ratio so
  existing boards display identically to v1.0.0. The `/output/` (Pi
  projection target) + SSR Chromium tab use the existing
  `body[data-output-role="final-output"] .stage { aspect-ratio: auto;
  width: 100%; height: 100%; }` override, so the projection stream is
  unaffected — the change is scoped to the operator-facing dashboard
  preview. (`9072b22`, Phase 50)

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
