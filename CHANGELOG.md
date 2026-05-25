# Changelog

All notable user-facing changes to TT-Beamer are documented in this file.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Cadence (operator-confirmed 2026-05-22): every closed phase ships a PATCH bump
(1.0.0 → 1.0.1 → 1.0.2 → …). MINOR bumps (e.g. 1.0.x → 1.1.0) are reserved
for operator-cut release milestones — multiple PATCH entries may be rolled
up into one MINOR release section at cut-time.

---

---

## [1.1.3] — 2026-05-25

Post-v1.1.1 hotfix.

### Fixed
- **Align handles + grid lines persist on `/output/` after a
  board switch with align mode OFF.** Reproducible sequence:
  toggle align mode ON, then OFF, then switch to a different
  board → the corner / rotate / scale / squish handles + the
  grid line overlay reappear on `/output/` even though align is
  off. Two distinct internal causes, both fixed: (a) the
  WebSocket grid-snapshot handler in the receiver rebuilt the
  handle DOM unconditionally whenever a new board's saved grid
  arrived, even when align was off — gated now on
  `getHandlesVisible() === true`; (b) the polygon-editor's
  room-overlay SVG (the "points") was repopulated by profile-
  persistence during the async board refresh, and a brief class
  flicker exposed it — `deactivate()` now also empties the
  `#room-overlay` children, and the `onProjectionProfileChange`
  handler pre-scrubs before awaiting any network refresh. The
  grid state itself is still restored by `restoreGridSnapshot`
  so the next align-mode activation rebuilds handles against
  the correct grid for the new board.

---

## [1.1.1] — 2026-05-25

Hotfix release. Restores the SSR stream on Windows after v1.1.0
shipped a regression that pinned `/output/` to ~1 fps on Win32
operator boxes (Linux unaffected).

### Fixed
- **Win32 SSR stream stuck at 1-2 fps with `outside-space` mode
  active.** The v1.0.31 starfield render optimization
  (`f6383b2`) batched ~600-800 per-frame canvas state changes down
  to ~30. On Linux+Xvfb this was a clean win (smoother SSR for the
  outside-space animation). On Win32 Chrome headless=new the
  drastic reduction in canvas state changes removed an implicit
  page-composition damage signal — Chromiums compositor stopped
  committing frames at 60 Hz and the tab-capture pipeline starved
  to ~1 fps. Revert restores the original per-star draw on all
  platforms; the Linux outside-space smoothness regression that
  motivated f6383b2 returns but is strictly better than the Win32
  1-fps break. Empirically root-caused via git-bisect on operator
  Win11 RTX 4090 box (2026-05-25 UAT: cef4da7/d4e8b6f/8527c77/
  2559e77 all smooth; f6383b2 broken).

### Added
- **`SSR_PUBLISHER_DEBUG=1` env var.** Gates two in-page diagnostic
  log lines emitted by the publisher: `[ssr-publisher] gpu-probe:
  vendor=... renderer=...` once at boot, and `[ssr-publisher]
  track-state [t+...]:` per encoder-stats poll showing
  `videoTrack.muted`, `readyState`, and source dimensions. Off by
  default so prod logs stay clean. Built up during the v1.1.0
  regression hunt — kept in gated form because they distinguish
  capture-pipeline from encoder-pipeline issues in one operator run.

---

## [1.1.0] — 2026-05-25

First MINOR release since the 1.0.0 cut on 2026-05-19. Rolls up
Phase 50, the post-launch operator-led Sammelphase: production fixes
from real-world use, animation-editor UX polish, SSR streaming
quality + smoothness, and broader board-aspect-ratio support so
any board game (not just Nemesis-shaped) displays without
distortion.

### Added
- **Boards of any aspect ratio.** Imported boards (square,
  rectangular, ultrawide) now render at their natural pixel ratio
  instead of being letterboxed into the original Nemesis-specific
  1.46:1 frame. Polygons stored as normalized [0..1] coordinates so
  they scale automatically. Server probes PNG/JPEG dimensions on
  import and attaches them to the runtime board record.
- **Aspect-aware play-area + align-mode defaults.** When you create
  a new play-area polygon (or hit Reset) the default hexagon now
  preserves the board image's width/height ratio. When you create
  a new align-mode profile, the default destination rectangle has
  the board's pixel proportions instead of the screen's 16:9.
  Equal-pixel margins on all four sides regardless of board shape.
- **VP9 codec option** alongside H.264 in Settings → Server Side
  Rendering. Most operators stay on H.264 (lower CPU); VP9 trades
  CPU for sharper detail at the same bitrate.
- **Content-hint dropdown** (`detail` / `motion` / `auto`) biases
  the encoder for either crisp particle/text/UI or smooth motion.
- **3-button bitrate preset radio** (Low 3 Mbit / Standard 10 Mbit
  / Maximum 30 Mbit) replaces the misleading raw-number slider in
  Settings → Server Side Rendering.
- **Live transform preview in the Animation Editor.** Rotation /
  width / height / X / Y offset edits now show on the preview
  thumbnail in real time. The preview clips to its box so
  `scale(4)` doesn't bleed across the page.
- **"Import from other board"** button in the projection profile
  UI for one-click profile copy.
- **`?ttApiBase=…` / `?apiBase=…` URL parameter** to point the
  client at a non-default API host (legacy carryover from 1.0.0,
  now exposed in the troubleshooting docs).

### Changed
- **"Save as default for this animation"** in the live editor now
  also closes the editor (was: two clicks — Save then Done).
- **"Default animation (auto-start on load)" checkbox renamed to
  "Auto-start animation"** for clarity. DOM IDs unchanged.
- **Animation editor: Transform sliders grey out** when "Stretch
  to polygon" is on, so the operator can see at a glance that the
  switch is what blocks the slider (was: sliders disabled
  internally but looked active).
- **`/api/global-defaults` now embeds the live `selectedBoard`**
  so a mobile cold-start lands directly on the right board (was:
  briefly displayed the alphabetically-first board, then switched
  ~60 s later when the WebSocket snapshot arrived).
- **All user-facing strings are now English.** Six leftover
  German strings (overlay text, reconnect status, host-down errors)
  translated. Operator UAT quotes kept verbatim in code comments.
- **Settings → System polish:** detected-encoders badge now has 3
  honest states (probing / software-only / hardware-list) instead
  of getting stuck at "(auto-detection in progress…)". Codec /
  Optimization help text moved from a wall-of-text into `ⓘ`
  info-icon tooltips.
- **Optimization mode + content-hint visible in /output/ overlay**
  on the ENCODE line (`hint=detail · target=2.0Mbps · 30fps`).
- **`recv=` field in /output/ overlay now stable.** No more
  flickering between a value and `?` — module-level persistent
  anchor + 15 s sticky cache + counter-rollback detection across
  peer-connection rebuilds.
- **Cadence note (operator-confirmed 2026-05-22):** every closed
  phase ships a PATCH bump (1.0.X). MINOR bumps (1.1.0, 1.2.0, …)
  are operator-cut release milestones rolling up multiple PATCH
  entries — this release is the first such cut.

### Fixed
- **Editor transform edits are now respected at trigger time.** The
  six `createAnimation()` call sites in `runtime-room-dispatch.js`
  silently dropped `rotationDeg / stretchToPolygon / widthScale /
  heightScale / offsetXScale / offsetYScale` from the spread —
  factory defaults (`stretchToPolygon: true, widthScale: 1, …`)
  then overwrote whatever the operator had edited. Animation edits
  now actually take effect on next Start.
- **MP4 loop seam in SSR stream eliminated.** Room MP4 animations
  used native `<video loop>` which stalls for 1 capture frame at
  EOS — invisible on the dashboard (canvas re-paint hides it) but
  captured + amplified by the SSR encoder. Ported the existing
  outside-MP4 seam machinery (manual early-wrap + cached fallback
  frame during `seeking`) to the room path. Operator UAT: "es
  darf NIEMALS zu einer Unterbrechung kommen". Now smooth.
- **outside-space (parallax starfield) smoothness in SSR.** The
  effect emitted ~600-800 canvas state changes per frame. Batched
  by 4 alpha buckets per layer → ~30 state changes per frame.
  Visually identical (natural sine-driven twinkle quantizes
  imperceptibly into the buckets). Was choppy in SSR only;
  dashboard's real GPU batched these into a few draw-calls so the
  operator never saw the cost.
- **Mobile loading-stuck root cause** (`/api/resources` had no
  AbortController + 12 s safety timer registered too late +
  onError didn't dismiss overlay). Three coordinated fixes:
  AbortController on the raw fetch, safety timer registered FIRST
  in initializeApplication, error path explicitly hides loading
  overlay. Loading-screen-forever no longer reproducible.
- **`API_REQUEST_TIMEOUT_MS` bumped 3 s → 8 s** so mobile cold-
  start DNS + LAN hop + first-byte doesn't trip the timeout.
- **Animation Name field keeps focus on dirty transition.** Was:
  typing the first letter dismissed the soft keyboard mid-word
  (the syncDirtyBar handler blurred the active input). Fix: skip
  blur when activeElement is a text-entry input/textarea.
- **Asset upload syncs def.assetRef.** Uploading a new GIF/MP4 in
  the editor auto-selected it in the dropdown but kept the old
  `assetRef` in state — renderer played the old file until the
  operator manually bounced the dropdown. Fix: any uploaded path
  that differs from the def's current `assetRef` fires a
  patchAnimation.
- **Per-board play areas restored** after a v1.0.17 regression
  where the boot reorder caused setupBoardState's default maps
  to overwrite hydrated per-board data. Fix: split off the board-
  ID picker into its own step so setupBoardState stays in the
  original slot (before hydration).
- **Active-bind preflight catches the VS Code "Code"-named server
  squatter** on Windows so the launcher doesn't accidentally bind
  to it. Plus the new `start.ps1` PowerShell 5 compatibility
  fixes (em-dash removal, `::new` → `New-Object`).
- **Win32 verdict-line crash on `producerIds` shape.** Pi
  diagnostic overlay no longer crashes when the live snapshot's
  `producerIds` field arrives as an unexpected shape.
- **Windows dashboard white-page** on first launch
  (path.normalize root).
- **Dashboard hiccup on align-mode exit** smoothed.
- **Cross-board profile leak on board switch** — switching boards
  no longer keeps the previous board's projection profile on the
  new board's stream.
- **Undo on /output/ now clears the dashboard's dirty flag** so
  the topbar chip doesn't stay yellow after a remote undo.
- **Dashboard CPU spike during /output/ align drag** smoothed
  (per-rAF accumulation moved to a single batched paint).
- **Polygon edit propagation to SSR** (handle-drag was racing the
  live-sync broadcast).
- **Mobile default board scale** so the cluster rail is visible
  out of the box.
- **`recv=?` flicker in /output/ overlay** (three iterations,
  final fix is the persistent anchor + counter-rollback).

### Phase 50 commit detail
The Sammelphase shipped as 31 PATCH releases (1.0.1 → 1.0.31)
each documented in commit messages. Older CHANGELOG entries
covering the same ground have been rolled up into this section
for the release notes — see `git log --since=2026-05-19
--grep="^fix(50)"` for the chronological detail.

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
