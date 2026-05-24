# Changelog

All notable user-facing changes to TT-Beamer are documented in this file.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Cadence (operator-confirmed 2026-05-22): every closed phase ships a PATCH bump
(1.0.0 → 1.0.1 → 1.0.2 → …). MINOR bumps (e.g. 1.0.x → 1.1.0) are reserved
for operator-cut release milestones — multiple PATCH entries may be rolled
up into one MINOR release section at cut-time.

---

## [1.0.13] — 2026-05-24

Phase 62: Reset recv-anchor on peer-connection rebuild.

### Fixed
- **`recv=?` stuck after triggering many animations.** Operator UAT
  (2026-05-24): "Anfänglich hat das mit dem Wert ohne ? funktioniert,
  dann habe ich aber viele animationen gestartet und 'recv' ist
  wieder dauerhaft auf '?' ohne einen Wert anzuzeigen. Beim board
  wechsel hat es wieder geklappt".
  Root cause: when the SSR Chromium tab restarts (codec switch, board
  switch, animation surge that exceeds the watchdog), the consumer's
  RTCPeerConnection is rebuilt and inbound-rtp's `bytesReceived`
  counter rolls back to 0. The Phase 61 anchor still held the OLD
  high bytes/timestamp from the previous PC → `curBytes >= anchor`
  AND `curT > anchor.timestamp` both failed forever → derivedRecvBps
  stuck at the stale value until cache expired to "?". Board switch
  manually rebuilt state and got past it.
  **Fix:** detect rollback explicitly — if `curBytes < anchor.bytes`
  OR `curT < anchor.timestamp`, treat it as a counter reset, reseed
  the anchor with the new values, and skip the diff this tick.
  The next tick's diff is computed against the fresh anchor. (`<sha>`,
  Phase 62)

### Notes
- If you still see `recv=8kbps` consistently for BOTH H.264 and VP9
  with lots of animations active, the SSR Chromium tab is likely
  CPU-bound — encoder produces few frames, network really does carry
  ~8 kbps. Check `start.log` for `[ssr-publisher] enc-stats
  framesPerSecond=X sendBps=Y` to confirm. If `framesPerSecond` is
  e.g. 3 instead of 30, the SSR-tab can't sustain the render rate
  under the animation load. That's a separate CPU/render budget
  issue, not a wiring problem.

---

## [1.0.12] — 2026-05-24

Phase 61: Robust recv-bitrate via persistent anchor + stale indicator.

### Fixed
- **`recv=?` still flickering even after Phase 60's sticky cache.**
  Operator UAT (2026-05-24): "etwa 3 bis 4 sekunden ist 'recv' ?,
  dann kurz für eine halbe Sekunde sehe ich was, dann wieder ?".
  Phase 60 cached the last-good value at module scope in
  `receiver-status-ui.js`, but the cache was recomputed inside the
  formatter — and the formatter ran on every 1 s tick regardless of
  whether `pollRtcStats()` had actually resolved. On a Pi where
  Chromium's internal RTCStats refresh ticks at ~2 s (not 1 s), every
  other tick saw `bytesReceived` unchanged → my Phase-60 guard
  returned the cached value but a 0-byte tick still flashed
  "?" on alternating renders.
- Restructure: recv-bitrate computation moved into
  `receiver-bootstrap.js#pollRtcStats()`, which runs ONLY when
  getStats() actually resolves. A persistent "anchor sample" lives
  in module scope and only advances on real forward progress (positive
  timestamp + positive bytesReceived). The anchor is diffed against
  the new sample each poll; the result is stored on
  `rtcStats.derivedRecvBps` (sticky 15 s if the next poll can't
  compute fresh). The formatter just reads that field — no per-render
  computation.
- **Stale indicator:** when the cached value is being shown
  (because the latest poll didn't produce a fresh diff), the chip
  renders `recv=12.3Mbps~` (trailing tilde). Lets the operator
  distinguish "still flowing at this rate" from "this is the last
  reading I had, but I'm not sure right now". After 15 s of no fresh
  data the value falls back to `?` (real stream-loss signal).
- (`<sha>`, Phase 61)

### Note for operator
- After this patch lands, **hard-reload the Pi /output/ tab**
  (Ctrl+Shift+R or close+reopen the browser tab). Browser HTTP cache
  may otherwise hold the older receiver-status-ui.js. Same for any
  open dashboard tabs.

---

## [1.0.11] — 2026-05-24

Phase 60: Stabilize `recv=` field in the diagnostic overlay.

### Fixed
- **`recv=?` no longer flickers most of the time on the /output/
  diagnostic overlay.** Operator UAT (2026-05-24): "ich sehe nur ganz
  kurz manchmal einen Wert". Root cause: the raw RTCStats diff in
  `formatDiagnosticOverlay` had three failure modes —
  1. The init-stub `rtcStats` has `bytesReceived=0` and `timestamp=0`
     for the first ~2 polls before WebRTC populates inbound-rtp;
     diffing against that produces garbage.
  2. Some `getStats()` polls return no inbound-rtp entry at all
     (transient during ICE renegotiation, codec switches, decode
     stalls); `next.inbound` stays at the zero stub.
  3. When `dBytes` is 0 between polls (idle frames), we returned 0,
     which formatted as "?" via `fmtBitrate(0 ≤ 0) → "?"`.
  **Fix:** require both `cur.timestamp` and `prev.timestamp` to be
  populated (>0) and strictly increasing (>100ms gap); cache the last
  good value at module level for 5 s so brief gaps don't flicker the
  chip. Empirical bench: stability went from "~1 in 8 samples is a
  real value" (operator report) to 39/40 samples = 97.5% real value.
  (`<sha>`, Phase 60)

---

## [1.0.10] — 2026-05-24

Phase 59: VP9 codec + content-hint operator levers — actual stream
quality knobs that move the needle.

### Added
- **Video codec dropdown** in Settings → System → Server-side Rendering.
  Operator can pick:
  - **H.264** (default, broad compatibility) — uses Chromium-bundled
    OpenH264 software encoder.
  - **VP9** — uses libvpx; 2-3× more bytes per second at the same
    bitrate cap on the same content, and noticeably crisper text/edge
    rendering. Trade-off: software libvpx runs ~23 fps vs OpenH264's
    ~30 fps on the bench (CPU-bound; hardware encoder removes this
    gap). Mediasoup router now advertises both codecs; publisher
    selects at produce-time. (`<sha>`, Phase 59)
- **Content optimization dropdown** in Settings → System → Server-side
  Rendering. Sets `videoTrack.contentHint` AND `degradationPreference`
  on the WebRTC sender:
  - **Detail (default)** — `contentHint="detail"` +
    `degradationPreference="maintain-resolution"`. Encoder preserves
    fine spatial detail; if CPU/network pressure forces a degradation,
    framerate drops before resolution does. Right call for game
    boards with hexagons, room outlines, text labels.
  - **Text** — `contentHint="text"` + same as Detail. Even higher
    spatial priority. For very text-heavy boards.
  - **Motion** — `contentHint="motion"` +
    `degradationPreference="maintain-framerate"`. Encoder fills more
    of the bitrate budget (visible byte rate goes up ~6× on static
    content) and prioritizes frame-to-frame smoothness. For boards
    with high-motion FX (sandstorm, fire animations).
  - **Default (auto)** — no hint. Encoder uses Chromium's built-in
    heuristics (typically defaults to motion for screen capture).
  (`<sha>`, Phase 59)
- **Publisher-side console diagnostics** for every produce(): logs
  resolved codec, content hint, degradation preference, sender params
  readback, and outbound-rtp stats poll (targetBitrate / bytesSent /
  qualityLimitationReason / encoderImplementation) at t+8/12/18s.
  Visible in start.log under `[ssr-publisher] ...`. (`<sha>`, Phase 59)

### Changed
- `[ssr-publisher]` console lines from the SSR-tab are now forwarded
  to the main start.log instead of silently dropped. The original
  "already logged" comment was wrong — they had nowhere else to go.
  (`<sha>`, Phase 59)

### Verified empirically
- 3-stage Playwright bench on nemesis-lockdown-a with 14 active
  animations + sandstorm-mp4:
  - H.264 + motion: sendBps=775 kbps, recv=0.75 Mbps, 30 fps, OpenH264
  - H.264 + detail: sendBps=138 kbps, recv=0.13 Mbps, 30 fps, OpenH264
  - VP9 + detail:   sendBps=348 kbps, recv=0.34 Mbps, 23 fps, libvpx
- End-to-end UI flow: operator picks VP9 in dashboard → server gets
  `serverRendering-update` mutation → SSR Chromium tab restarts →
  /output/ overlay reports codec=VP9 within ~15s.

### Did NOT help (investigated, ruled out)
- `videoGoogleMinBitrate`: Chromium's OpenH264 ignored a min-bitrate
  of 5 Mbit/s and stayed at ~140 kbps. Not exposed in the UI; would
  have been Augenwischerei.
- Bitrate slider alone: Phase 57 readback confirmed `maxBitrate`
  reaches the RTCRtpSender at the slider value but the encoder's
  rate-control only fills the budget when content motion demands it.
  Phase 58's `initialAvailableOutgoingBitrate` change still in place
  but is not the actual quality lever.

---

## [1.0.9] — 2026-05-24

Phase 58: Slider value reaches the wire — fixed two upstream caps.

### Fixed
- **Bitrate slider value now actually visible in image quality.**
  Operator UAT (2026-05-24): "Keinen Unterschied zwischen 2 und 50
  Mbit/s feststellbar — die Qualität scheint identisch zu sein."
  The slider was reaching the publisher's `RTCRtpSender.maxBitrate`
  correctly (Phase 57 readback confirmed this part), but two other
  upstream caps were silently bottlenecking the pipeline at ~8 Mbit/s
  regardless of slider:
  1. `createWebRtcTransport`'s `initialAvailableOutgoingBitrate` was
     hardcoded to 8 Mbit/s. This is the WebRTC GCC (Google Congestion
     Control) bandwidth estimator's STARTING point. GCC ramps slowly
     (~few % per second) and only probes higher when the publisher
     actively pushes more data — which a low-motion board-game scene
     never does. Net: pipeline stuck at 8 Mbit/s start regardless of
     publisher cap. **Fix:** the consumer-side transport now reads the
     current `streamBitrateMbps` slider value from
     `config/global-defaults.json` at transport-creation time
     (2s in-process cache for FS-pressure relief) and starts GCC at
     that value, not 8 Mbit/s.
  2. `codecOptions.videoGoogleStartBitrate` was hardcoded to 1000 (kbps,
     i.e. 1 Mbit/s) — the encoder's initial target. Combined with #1
     above, the encoder began at 1 Mbit/s and GCC never gave it a
     reason to ramp. **Fix:** the start bitrate now matches the
     slider's `maxBitrate` so the encoder reaches the target
     immediately. (`<sha>`, Phase 58)

### Diagnosis
- The `recv=NMbps` field added in Phase 57 made the bottleneck
  visible: even with high-motion content, the receiver showed
  `recv≈8 Mbps` at slider=50 AND slider=2. With the Phase 57
  `[ssr-publisher] sender params` readback already confirming the
  publisher's encodings was set to e.g. `maxBitrate=50000000`, the
  bottleneck had to be downstream of the publisher. Tracing the
  mediasoup config path located both caps above.

---

## [1.0.8] — 2026-05-24

Phase 57: Diagnostic — actual received bitrate in the overlay.

### Added
- **STREAM line in the /output/ diagnostic overlay now shows
  `recv=<X>Mbps`** — the actual received bitrate computed from the
  `bytesReceived` delta over the RTCStats timestamp delta (inbound-rtp).
  Operator can now compare the configured slider value (`preset=` on
  the ENCODE line) against what's actually flowing on the wire:
  - `preset=40Mbps recv=2.5Mbps` with low-motion content → wiring is
    fine, encoder simply doesn't need the budget (H.264 only fills
    the cap when motion demands it).
  - `preset=40Mbps recv=2.5Mbps` AND `preset=2Mbps recv=2.5Mbps`
    → wiring problem, `maxBitrate` isn't reaching the encoder.
  (`<sha>`, Phase 57)
- **SSR-tab now logs the RTCRtpSender encodings parameters at t+500ms
  and t+5s after `transport.produce()`** — confirms whether the
  `maxBitrate` from the publisher script's `encodings: [{ maxBitrate }]`
  actually reached Chromium's encoder. Surfaces in start.log under
  `[ssr-publisher] sender params [t+500ms]: [{"maxBitrate":...}]`.
  (`<sha>`, Phase 57)

---

## [1.0.7] — 2026-05-24

Phase 56: SSR restart on bitrate change.

### Fixed
- Applying a bitrate slider change now actually restarts the SSR
  Chromium tab so /output/ reflects the new value. server.mjs's
  `restartKeys` list still referenced the removed `qualityPreset`
  key — `streamBitrateMbps` wasn't in there, so applying a slider
  change persisted the new value to global-defaults.json but the
  running SSR tab kept the previous bitrate (and the Pi diagnostic
  overlay kept showing the old Mbps). (`<sha>`, Phase 56)

---

## [1.0.6] — 2026-05-24

Phase 55: SSR settings go through the global dirty-flag / Apply flow.

### Changed
- **Bitrate slider no longer restarts the SSR Chromium tab on every
  drag tick.** Slider input now accumulates the pending value into a
  client-side buffer, marks the global config dirty, and surfaces the
  standard "Apply changes" bar. The SSR `serverRendering-update`
  live-mutation only fires when the operator clicks **Apply** —
  resulting in a single restart with the final committed bitrate.
  Discard rolls the slider back to the persisted server value.
  Status line shows "pending — click Apply to push" during drag.
  (`<sha>`, Phase 55)

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
