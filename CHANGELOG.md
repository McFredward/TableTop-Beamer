# Changelog

All notable user-facing changes to TT-Beamer are documented in this file.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Cadence (operator-confirmed 2026-05-22): every closed phase ships a PATCH bump
(1.0.0 → 1.0.1 → 1.0.2 → …). MINOR bumps (e.g. 1.0.x → 1.1.0) are reserved
for operator-cut release milestones — multiple PATCH entries may be rolled
up into one MINOR release section at cut-time.

---

---

## [1.2.2] — 2026-06-04

Phase 58 Wave 3.1 — fix mp4 playback modes and editor preview parity.

### Fixed
- **mp4 play-once-disappear / play-then-freeze actually freeze /
  disappear** instead of looping. Three converging root causes:
  - `ensureRoomMp4Playback` / `ensureOutsideMp4Playback`
    unconditionally called `video.play()` whenever the video was
    paused — restarting the playback the lifecycle handler had just
    paused at EOS. Added `isFrozenAtEnd` guard that skips auto-play
    when `video.ended === true` and mode ∈ {play-once-disappear,
    play-then-freeze}.
  - `maybeWrapRoomMp4Loop` / `maybeWrapOutsideMp4Loop` skipped only
    play-once and play-then-freeze, NOT boomerang — but for
    boomerang the wrap also preempted the natural EOS so the
    ended-listener src-swap never fired. Gate tightened to: only
    plain `loop` keeps the seam-preventing wrap.
  - `getMediaVideoElement` cache-hit logic detected a `video.src`
    mismatch (after boomerang src-swap) and reset back to the
    canonical forward URL → boomerang cycled forever as forward-only
    loop with rapid ABORTs (operator-observed `[ssr-tab:reqfailed]
    net::ERR_ABORTED` for both forward and reverse URLs). Cache
    reset now skipped when the current src matches the stamped
    boomerang reverse URL.
- **Re-trigger after play-once-disappear plays from the beginning**
  instead of inheriting the previous instance's `video.ended=true`
  state (which would make the new instance freeze immediately). Both
  ensure functions now stamp `_tt58InstanceId` on the video element;
  a different id resets `currentTime = 0` so the new playthrough
  starts fresh.
- **Editor preview respects per-animation playback mode + direction**
  (`animation-editor-live-preview.js`). Previously the preview
  hardcoded `video.loop = true`. Now: `loop` only when mode is
  `loop`; reverse direction loads the
  `/api/animation-reverse?asset=...` URL; play-once modes freeze at
  EOS; boomerang src-swaps. The edit-pane forces a full preview
  rebuild when `playbackMode` or `playbackDirection` change in the
  patch so the new flags actually apply (numeric-patch fast path was
  silently skipping the rebuild for these fields).

## [1.2.1] — 2026-06-04

Phase 58 follow-up: Wave 2.5 (cleanup-dispatch + bug fix) + Wave 3
(gif reverse / boomerang + mp4 ffmpeg-reverse infrastructure +
direction field).

### Fixed
- **play-once-disappear correctly disappears** instead of freezing
  at the last frame. The render layer now detects video.ended (mp4)
  or cursor-past-total (gif) and dispatches `stopAnimation(id)`
  exactly once per instance (idempotent via
  `animation._endedDispatched`). The animation cleanly removes from
  the running list. Wired in all three render paths (room-mp4,
  inside-mp4, outside-mp4) and all three gif paths.

### Added
- **Per-animation Direction control** (Forward / Reverse) in the
  editor, separate from playback mode. Reverse plays the animation
  from end to start. Combined with a mode:
  - Loop + Reverse = reverse-loop (plays backwards forever)
  - Play-once-disappear + Reverse = plays once backward then
    disappears
  - Play-then-freeze + Reverse = plays once backward, freezes at the
    first frame
  - Boomerang + Reverse = starts reverse, then ping-pongs
- **gif reverse playback** via cursor math in
  `_resolveFrameIndex` (`runtime-gif-playback.js`). Boomerang
  ping-pongs the cursor across `[0, 2 * totalDurationMs)`; the
  second half mirrors back so the same frame-walk produces a
  reverse playthrough. No frame buffering needed.
- **mp4 reverse playback** via server-side ffmpeg pre-compute. New
  `/api/animation-reverse?asset=<path>` endpoint
  (`server.mjs::getOrEncodeReverseMp4`) spawns `ffmpeg -vf reverse`
  on first request, caches the output under
  `resources/.reverse-cache/<basename>-<mtime>.mp4`. Subsequent
  requests serve from disk (typical: 1.8s first encode, 5ms cache
  hit). Path-traversal guarded; in-flight encodes deduped via a
  shared promise.
- **mp4 boomerang** via src-swap on `ended`. The lifecycle handler
  alternates between the forward asset URL and the
  `/api/animation-reverse?...` URL so the same `<video>` element
  alternates direction. Brief load-and-play stall (50-300ms) at
  each swap is bridged by the Phase 57 fallback canvas.
- New schema field `playbackDirection` on every gif/mp4 animation
  definition (default `"forward"`). Persisted to disk; carried
  through `createAnimation` → instance → render.

### Notes
- Phase 8 boomerang lesson (`P8-T47-REVERSE-ROOT-CAUSE.md`) honored:
  zero `video.currentTime` seeks per rAF. mp4 reverse uses
  pre-encoded files via ffmpeg; mp4 boomerang src-swaps between
  forward and reverse files at EOS.
- Still deferred to Phase 59: reverse-then-X sub-options of
  play-then-freeze (the on-retrigger reverse-playback). These need
  per-instance phase tracking (frozen-last → reverse → frozen-first /
  disappeared) plus the dashboard per-trigger mode override.

## [1.2.0] — 2026-06-04

Phase 58 — Per-animation playback modes. Operator can now configure
each gif / mp4 animation in the editor with one of four playback
modes: **Loop** (default, legacy behavior), **Play once and
disappear**, **Play once and freeze** (with three On-retrigger sub-
options: Disappear / Reverse-to-first-freeze / Reverse-to-first-
disappear), and **Boomerang**. Applies to all three animation
scopes (room + inside + outside).

### Added
- **Per-animation `playbackMode` + `onRetrigger` schema fields**
  on every gif/mp4 animation definition (`src/app/runtime/state/
  runtime-fx-normalizers.js`). Backwards-compat: definitions without
  the new fields default to `playbackMode = "loop"`. Legacy
  `loopUntilStopped = false` infers `play-once-disappear` on read.
- **Stufenweise picker in the animation editor**: Mode dropdown
  (Loop / Play-once-disappear / Play-then-freeze / Boomerang) plus
  a conditional On-retrigger sub-dropdown that appears only when
  Mode = Play-then-freeze. Lives in the Defaults card alongside the
  existing sliders (`animation-editor-edit-pane.js`). Replaces the
  legacy inside-only Loop toggle with a unified picker available in
  all three scopes for gif/mp4.

### Changed
- **Runtime state machine for non-reverse modes** carries
  `playbackMode` + `onRetrigger` through `createAnimation`,
  `upsertGlobalAnimation`, and the room-dispatch path onto every
  running animation instance. Render layer reads `animation.playbackMode`
  to decide loop semantics:
  - `loop` — `video.loop = true` (mp4) / gif modulo-wrap (legacy).
  - `play-once-disappear` — mp4: `video.loop = false`, native EOS
    pause; gif: cursor clamps to final frame.
  - `play-then-freeze + instant-disappear` — same as play-once-
    disappear visually (video frozen at last frame); re-trigger uses
    existing upsert→stop flow for instant cleanup.
  - `attachMp4LifecycleHandlers` installs an idempotent `ended`
    listener that pauses the video for non-loop modes; the per-mode
    flag lives on the video element so mid-playback mode changes
    take effect at the next EOS.
  - `maybeWrapRoomMp4Loop` / `maybeWrapOutsideMp4Loop` skip the
    near-EOS seek-back for non-loop modes so the freeze-at-end
    actually persists.

### Deferred (selectable in UI but not yet fully implemented; will
ship in Phase 59)
- **`boomerang` mode** — falls back to loop behavior at runtime.
  Requires reverse-playback infrastructure (mp4: server-side ffmpeg
  pre-compute + cache + WS progress event; gif: frame-walk-backward
  via the existing `_resolveFrameIndex` cursor math).
- **`reverse-then-freeze-first` + `reverse-then-disappear` sub-
  options** of `play-then-freeze` — currently behave the same as
  `instant-disappear` because the reverse-playback infrastructure
  above isn't wired yet. The On-retrigger dropdown still saves the
  operator's choice; once Phase 59 lands the selected behavior takes
  effect automatically without an editor re-save.
- **Dashboard per-trigger mode override** — operator-confirmed scope
  but not yet wired. Today's `loopUntilStopped` per-trigger toggle
  stays as-is. Phase 59 will replace it with the same stufenweise
  picker plus a `Use animation default` first option.

### Notes
- Phase 8 Boomerang lesson (`P8-T47-REVERSE-ROOT-CAUSE.md`) is
  honored: the Wave 2 implementation does NOT use `video.currentTime`
  seeks per rAF for reverse playback. The Phase 59 reverse pipeline
  will use ffmpeg pre-computed reverse mp4 files (cached on disk) +
  the existing Phase 57 mp4 playback pipeline pointed at the reversed
  source. gif reverse will use ImageDecoder frame-index walking via
  `runtime-gif-decoder.js`.
- Per-board JSON files now persist the new schema fields. Operators
  can configure modes today; Loop / Play-once-disappear / Play-then-
  freeze + Instant-disappear are visible at runtime. Selecting
  Boomerang or a reverse-on-retrigger sub-option saves correctly and
  becomes active when Phase 59 lands.

## [1.1.7] — 2026-06-02

Phase 57 Sammelphase continuation: closes two operator-reported
follow-up bugs surfaced when overlaying mp4 animations on the same
board after v1.1.6 shipped.

### Fixed
- **Bug A — Strobo / black-flicker on overlaid mp4** (`src/app/
  runtime/render/runtime-outside-mp4.js` + `runtime-draw-loop.js`).
  The v1.1.5 rVFC paint gate's fallback branch returned `null` from
  `getRoomMp4FallbackSource` / `drawOutsideMp4FallbackFrame` when the
  fallback canvas was older than 1500 ms OR when the fallback hadn't
  been captured yet. The paint sites in turn left the region
  UNPAINTED → the main rAF's `clearRect` bled black through →
  operator-visible random black flashes when two mp4s overlay with
  desynced decode cadences (operator UAT 2026-06-02: snow.mp4 inside-
  animation + generator_boost.mp4 room animation). Three-part fix:
  (1) drop the 1500 ms age guard on both fallback helpers (returning a
  stale fallback is strictly better than returning null);
  (2) eagerly capture the fallback canvas inside the rVFC frame
  callback so the fallback is always populated after the first
  decoded frame regardless of the paint site's `haveLiveFrame` check;
  (3) add a "paint live `<video>` directly" last-resort branch in all
  three mp4 paint sites for the initial-state case where no fallback
  has been captured yet. Linux Playwright verification with both
  mp4s overlay: post-startup `no-frame` paint count is **0/0** across
  21+ one-second samples (down from ~2 % pre-fix); snow-only regression
  baseline preserved (0 stale, 0 no-frame).
- **Bug B — Inside animation overwrites room animations** (`src/app/
  runtime/render/runtime-draw-loop.js`). Phase 12 room-room
  concurrency lifts `globalCompositeOperation` to `"lighter"` via
  `roomConcurrencyByKey` but that map only counts `scope === "room"`
  entries — inside (`scope === "global"`) animations were never
  counted, so a room+inside combination drew the inside animation
  opaquely on top of the room region (operator quote: "Wenn erst
  raum animationen gestartet werden und dann die inside animation —
  dann sieht man die room animationen nicht mehr"). Fix: build
  parallel `insideAnimationCountByBoard` and
  `roomAnimationCountByBoard` maps each rAF; both room-scope draw
  branches (cluster member + single room) and the inside-animation
  draw branch now lift to additive composite when the other side is
  concurrently active, mirroring the Phase 12 pattern. Layering is
  order-independent regardless of trigger order.

### Notes
- Linux Playwright verification with the snow.mp4 (inside) +
  generator_boost.mp4 (room) overlay scenario; visual frames captured
  on /output/ show both animations visible continuously with no black
  flashes.

---

## [1.1.6] — 2026-06-02

Phase 57 Sammelphase continuation: closes the residual SSR-tab
dropped-frame gap left after v1.1.5.

v1.1.5 fixed the paint gate (rVFC-driven, no more stale paints) but
the operator's Linux UAT still showed `vpq.droppedFps≈4-7/s` in the
SSR Chromium tab — Chromium's video pipeline was dropping decoded
frames UPSTREAM of any paint logic, even after `--disable-renderer-
backgrounding` / `--disable-background-timer-throttling` /
`--disable-backgrounding-occluded-windows` etc. Root cause: the
ANGLE backend was defaulting to Mesa llvmpipe (software GL), which
made the Chromium compositor too slow to keep up with 24fps content,
so the compositor scheduler dropped frames between decode and
display.

### Changed
- **`--use-angle=default` → `--use-angle=vulkan` on Linux SSR
  Chromium** (`src/server/ssr-render-host.mjs#buildChromiumLaunchArgs`).
  ANGLE now selects a Vulkan ICD (Intel / RADV / nouveau on real
  hardware; Mesa lavapipe as software fallback) instead of GL over
  llvmpipe. Measured impact on Linux dev box driving the Phase 57
  Playwright SSR-tab harness against snow.mp4 (23.976fps source,
  loop-until-stopped, 26+ one-second samples per run):

  | Metric (SSR-tab, post-settle) | v1.1.5 baseline | v1.1.6 (Vulkan) |
  |---|---|---|
  | `vpq.droppedFps` mean | 4.27 / s | **0.39 / s** |
  | `vpq.droppedFps` median | 4 | **0** |
  | `vpq.droppedFps` max | 6 | **1** |
  | Decoded frames / s | 19.77 | **24.0** (matches source) |
  | Live mp4 paints / s | 19.77 | **24.0** |
  | Gated-out paints / s | 32.1 | **0.97** |
  | Stream HUD drops (60s) | non-zero | **0/67** |

  88% reduction in `droppedFps`; the median sample now has zero
  drops. Decoded frame rate fully matches source. ANGLE's automatic
  fallback to GL (and then SwiftShader) is preserved — if a Linux
  host has no Vulkan ICD at all the worst case is the v1.1.5
  baseline; no new failure mode is introduced. On Win32 the
  `--use-gl=`/`--use-angle=` pair is still dropped under the
  headless-new default (`dropOnHeadlessNew` gate from Phase 47
  Wave 2) — Win32 behavior unchanged. The SSR_WIN_HEADLESS=0
  escape-hatch path on Win32 picks up the new Vulkan backend, which
  on Windows means ANGLE→D3D11 (Vulkan absent on most Win Chrome
  builds) — same fallback chain as today, just a different default
  preference order.

### Notes — investigation
- Tried and reverted (no measurable impact on `droppedFps`):
  `--disable-features=VideoBackgroundedFrameDropping`,
  `--disable-features=BackgroundVideoTrackOptimization`,
  `--disable-features=MediaSessionService`,
  `--disable-features=UseSurfaceLayerForVideo`,
  `--disable-background-media-suspend`. The Phase 57 prior debugger
  had flagged these as the "standard suspects" for backgrounded-tab
  video dropping. Empirically none changed the measured droppedFps
  more than noise — confirming the drops were NOT a tab-
  backgrounding optimization but a compositor-throughput limit.
- `--ignore-gpu-blocklist --enable-gpu-rasterization` (ungated)
  also tried and reverted: same regression as documented in Phase 34
  h2 (snow.mp4 fetch aborts with ERR_ABORTED, JS thread blocks).
  The Vulkan ANGLE backend is the only path that gives the
  compositor a real GPU without re-triggering Phase 34's hot-loop.

---

## [1.1.5] — 2026-06-02

Phase 57 Sammelphase: follow-up to v1.1.4 after operator UAT
(2026-06-01) reported residual mp4 stutter: "Immer noch die selben
kleine hänger wie zuvor, es ist nicht das es komplett freezed,
sondern eher immer wieder eine frame drop auftaucht — aber nur bei
dem mp4 video während die SSR und Stream fps stabil bleiben."

### Changed
- **mp4 paint gate now consumes the rVFC `hasVisibleFrame` signal
  instead of a pure time throttle.** The Phase 57 v1.1.4 fix tier-
  gated paints to 22 ms (45 fps in balanced tier) but ignored
  the `requestVideoFrameCallback` signal that
  `bindOutsideMp4FrameCallback` was already producing. Linux
  Playwright diagnostic (this version's new instrumentation, see
  below) showed the SSR-tab inside-mp4 path painting ~30
  `drawImage(video)` per second of which ~12 (40%) re-drew the
  prior decoded frame (no new rVFC tick) — perfectly identical
  bytes, but a wasted pipeline op and a misleading paint cadence.
  New `hasNewDecodedFrame(state)` helper consumes the rVFC
  `_decodedFrameCount` counter; paint sites in
  `runtime-draw-loop.js` (inside / room / outside-final) now only
  paint the live `<video>` when a new decoded frame is available
  since the previous paint, and `markMp4FramePainted(state)`
  stamps the counter after each successful live paint. On rAF
  ticks without a new frame, the fallback canvas (the most recent
  decoded frame) is replayed — same pixels as the prior
  duplicate-paint would have produced, so the Win32 canvas-damage
  budget is preserved at one `drawImage` per rAF
  (`project_win32_ssr_canvas_damage.md`). On browsers without
  `requestVideoFrameCallback` (none modern), the v1.1.4 time gate
  remains as a fallback.

### Added
- **`SSR_PUBLISHER_DEBUG=1` now also forwards `[mp4-diag]`
  console lines from the SSR Chromium tab to the server log**
  (`src/server/ssr-render-host.mjs`) and appends `?mp4diag=1` to
  the SSR navigation URL so the in-page diagnostic activates
  automatically. The diagnostic emits one JSON line per
  playback-state per second with `decoded` (rVFC ticks),
  `decodeFps`, `paints` (broken down into `live` / `stale` /
  `gated-out` / `fallback` / `no-frame`), `rafTicks`, and
  `vpq` (Chromium's `getVideoPlaybackQuality()` snapshot:
  `totalFps`, `droppedFps`, `currentTime`, `readyState`). This
  is the operator-facing toolkit for capturing the Win11 RTX 4090
  symptom in detail: `droppedFps > 0` indicates Chromium's
  video presentation pipeline is dropping decoded frames upstream
  of our paint code; `stale > 0` (should be ≈ 0 after the rVFC
  gate above) indicates the paint gate logic regressed. In-page
  flag also accepts `?mp4diag=1` or `window.TT_MP4_DIAG = true`.

### Notes — root-cause investigation summary
- Linux Playwright (headless Chromium + Xvfb SSR tab): snow.mp4
  is a 23.976 fps source (`r_frame_rate=24000/1001`, 198 frames
  in 8.26 s). Dashboard `getVideoPlaybackQuality` reports
  `totalFps=24, droppedFps=0` (no drops). **SSR tab** reports
  `totalFps=24, droppedFps=6` — Chromium's video presentation
  pipeline drops ~6 frames/s in the SSR tab, so only ~18 unique
  decoded frames per second reach the canvas even though the
  source delivered all 24. `rVFC` fires only for the non-dropped
  frames, so the paint code is already painting every available
  frame; the visible "frame drop" residue likely reflects that
  upstream-drop pattern. Win11 testing with the new
  `SSR_PUBLISHER_DEBUG=1` build will tell us whether Win11 has the
  same upstream-drop pattern; if `droppedFps=0` on Win11 and
  stutter is still reported, the symptom is encoder-side and needs
  its own phase. If `droppedFps>0` on Win11, the next plan is to
  suppress Chromium's hidden-tab video throttling.

---

## [1.1.4] — 2026-06-01

Post-v1.1.3 hotfix. Resolves the operator-reported "konstantes
leichtes Stockeln" on snow.mp4 in the SSR `/output/` stream.

### Fixed
- **SSR mp4 stream stutter ("constant low-FPS feel") on the
  `/output/` WebRTC consumer.** Universal root cause: the three
  internal mp4 render paths (inside-mp4, room-mp4, outside-mp4
  final-output) were painting `<video>` to the canvas on every rAF
  tick (~60 Hz on a modern PC) without rate-gating to the source
  cadence. snow.mp4 is 30 fps source, so every other rAF tick was
  sampling the same decoded frame → the SSR encoder picked this up
  as visible duplicate frames and the consumer saw 23–26 fps
  stuttery video while the dashboard rendered the same mp4 smoothly
  at full 30 fps. Fix is symmetric: all three paths now route
  through the same defense pattern that outside-mp4 (non-final-
  output) has used since Phase 30 — `shouldDrawOutsideMp4Now()`
  tier-gates the live paint to 33/22/16 ms (= 30/45/60 fps per
  perf tier), and a fallback canvas bridges the gated-out ticks so
  the SSR capture pipeline still sees a canvas op every frame
  (Win32 capture budget preserved per
  `project_win32_ssr_canvas_damage.md`). Inside-mp4 also gained
  the manual loop-wrap + fallback machinery it never had —
  previously a bare `video.loop=true` with no `readyState` check
  and no fallback canvas, making it the worst-case path. The
  Phase 30 T4 "always paint on `/output/`" optimization was
  removed: it was correct on Pi (~16 fps rAF, gate never fired)
  but wrong on modern Win11 / RTX 4090 (~60 Hz rAF, gate fires
  often) — that asymmetry is what produced the operator's reported
  stutter. No platform branches added; the fix is universal. Phase
  50's outside-mp4 loop-seam machinery is reused, not modified.

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
