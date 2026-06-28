# Phase 58 — GIF cluster re-trigger desync on /output/ + re-trigger flash (v1.2.22)

Operator reports (2026-06-06, v1.2.21):

1. **Cluster gif desync (Finding 1)**: cluster re-trigger (Freeze gif,
   play-then-freeze + reverse-then-freeze-first, 12 members) on /output/
   leaves SOME member rooms untouched while others flip; repeating
   compounds into opposite-direction desync. Dashboard always
   consistent. "Von allerhöchster Wichtigkeit, dass immer ALLE Räume
   des Clusters affektiert werden."
2. **Re-trigger Blitz (Finding 2)**: re-triggering a frozen gif makes
   the frozen image disappear for a brief moment before reverse starts.
   "Es MUSS direkt beim gefreezten image beginnen ohne jegliche kurze
   Unterbrechung."

Environment: isolated server PORT=4560 (own with_server instance, own
SSR_DISPLAY=:111 — operator's 4173 server + Xvfb :99 untouched),
Playwright Chromium headless; CONTROL = dashboard page, FINAL = /ssr
page + the server-spawned SSR render tab (sampled via
/api/diag/ssr-eval-in-tab). Board: frostpunk, cluster-1
(room-21..room-32, 12 rooms), animation room-mq1j9ugv-5 "Freeze gif"
(freeze.gif, 280 frames / 10 s).

## Timeline

- timestamp: 2026-06-06T (pre-fix baseline)
  checked: 10 cluster re-trigger cycles, unthrottled localhost FINAL (/ssr page)
  found: 0/10 desynced — WS edit-room broadcasts always apply before the poll resolves on a loopback link
  implication: the desync needs realistic FINAL load/latency; the race is between the HTTP snapshot poll and the WS broadcast stream

- timestamp: 2026-06-06T (pre-fix, realistic load)
  checked: same 10 cycles with CDP CPU throttle ×6 + 60 ms network latency on FINAL (12 gif members decoding ≈ SSR tab / Pi under load), operator-realistic context-update (room-draft-sync) interleaved with the tap
  found: 4/10 cycles DESYNCED — e.g. cycle 3: rooms 25/30/31/32 stuck "forward" while CONTROL + 8 others "reverse"; cycle 4: room-32 alone OPPOSITE direction (compounding)
  implication: exact operator symptom reproduced (script .planning/debug/_repro_gif_cluster_desync.py)

- timestamp: 2026-06-06T (instrumented netlog, room-32, desynced cycle)
  checked: page-level WS-frame + poll-response + local-state arrival log (.planning/debug/_repro_gif_desync_instrumented.py)
  found: |
    WS edit-room v59..v69 carry room-32 still reverse@epoch3092 (other members' edits).
    t=39484: poll-response applies → local-state becomes "reverse@epoch5773" — NEW epoch accepted, OLD phase kept (RENDER_PLAYBACK_FIELDS preservation on mutationType=snapshot-poll).
    t=39577/39591: WS edit-room v70/v71 arrive carrying room-32 forward@epoch5773 — REJECTED (version ≤ lastAppliedVersion, already consumed by the poll).
    FINAL ends reverse@5773 vs CONTROL forward@5773 — permanently stuck until the next flip carrier.
  implication: root cause = unconditional playbackPhase preservation on non-edit-room snapshot applies + monotonic version gate rejecting the late WS flip carriers. MP4 was equally affected in principle (same phase field) but the gif report surfaced it because gif rendering is purely timeline/phase-driven.

- timestamp: 2026-06-06T (Finding 2, pre-fix pixel probe)
  checked: per-rAF fx-canvas pixel sampling at the room centroid across a single-room frozen-last→reverse re-trigger on CONTROL (.planning/debug/_repro_gif_flash.py)
  found: exactly ONE zero-alpha tick at the flip — `t=27651.8 phase=reverse alpha=0 dStart=+3.7` — the re-stamped startedAt (performance.now() in the dispatch task) sits 3.7 ms in the FUTURE of the next rAF timestamp (vsync begin time); drawAnimation's `now < startedAt` guard bare-returned, the per-rAF clearRect left the region transparent. Second cycle had dStart=-10 → no hole (probabilistic 0–1-frame flash per tap).
  implication: suspect (a) confirmed; on FINAL the same guard fires after edit-room snapshot apply re-hydrates startedAt (epoch clamp → startedAt = performance.now()). Fourth occurrence of the "bare return on a clearing canvas" class.

- timestamp: 2026-06-06T (FINAL probe method note)
  checked: fx-canvas getImageData on /ssr returned empty even while the gif painted
  found: the GL mesh-warp path (runtime-projection-gl-renderer.js L611/625) clearRects the fx-canvas after uploading it as a texture each frame
  implication: FINAL flash verification uses a drawImage-call interceptor (per-rAF paint detector + painted-frame-index identity match) instead of pixel sampling (.planning/debug/_repro_gif_flash2.py)

## Resolution

root_cause: |
  FINDING 1 — re-trigger re-stamp lost on FINAL. The cluster flip emits
  one edit-room per member; every WS broadcast also schedules an
  immediate HTTP snapshot poll. Under load/latency the poll response
  (carrying server versions PAST the not-yet-arrived WS frames) applies
  first with mutationType="snapshot-poll"; the v1.2.16/17
  RENDER_PLAYBACK_FIELDS preservation then unconditionally reverted the
  incoming playbackPhase to the local stale value while the timestamp
  hydration accepted the NEW startedAtEpochMs; the late WS edit-room
  frames were version-rejected as stale. Members whose only flip
  carriers were those rejected frames stay stuck — random per race,
  compounding direction inversion on repeated taps.

  FINDING 2 — 1-frame paint hole on re-trigger. The dispatch flip
  re-stamps startedAt = performance.now() inside the current frame's
  input/WS task; the next draw(now) rAF timestamp is the frame's vsync
  begin time, which can PREDATE the re-stamp (measured +3.7 ms). The
  `now < startedAt` stagger guard skipped that tick's paint on a canvas
  that clears every rAF → transparent room region for one frame = the
  operator's Blitz (gif AND mp4 paths share the guard).

fix: |
  FINDING 1 (runtime-live-sync-core.js, ctx wiring in
  runtime-orchestration.js): re-trigger re-stamp detection in the
  non-edit-room preservation block, symmetric on ALL roles — when the
  incoming animation's startedAtEpochMs is >250 ms NEWER than the
  previously known epoch for the same id, the incoming
  playbackPhase/_endedDispatched/_phaseChangedAt are authoritative
  (preservation skipped; permanent `[58] re-stamp-accepted` log).
  Identical/older epochs keep the preservation — the original
  anti-revert purpose (client-derived forward→frozen-last transitions,
  mid-reverse src stability) is untouched. A bare phase-difference is
  deliberately NOT a trigger: frozen-* phases are client-derived and
  legitimately differ from the server's stale copy. CONTROL-only
  LIVE_EDIT_FIELDS preservation unchanged.

  FINDING 2 (runtime-draw-loop.js): shouldSkipNotYetStartedAnimation —
  play-then-freeze instances with a playbackPhase set (every re-stamp
  sets one; fresh staggered dispatches never do) are exempt from the
  not-yet-started skip; their age is clamped to 0, which renders
  exactly the frozen boundary frame (reverse@age0 = last frame =
  frozen-last image; forward@age0 = first frame = frozen-first image).
  Genuine staggered future starts keep the skip. Negative-age clamp
  added to both the room and cluster-member age computations.

verification: |
  All on isolated PORT=4560 (own Xvfb :111), scripts in .planning/debug/:
  - _repro_gif_cluster_desync.py (gif, throttled FINAL): pre-fix 4/10
    cycles desynced → post-fix 0/10; per cycle ALL 12 members matched
    CONTROL's phase on the /ssr FINAL page AND the server-spawned SSR
    render tab (ssr-eval-in-tab), 10 consecutive cycles.
  - same script with ANIM=room-mq1iu4h3-4 (mp4 cluster regression):
    0/10 desynced post-fix.
  - _repro_gif_flash2.py (per-rAF paint detector, 4 re-trigger cycles ×
    CONTROL + FINAL): zero unpainted ticks across every transition;
    flip ticks paint frame 279 → 278 → … (frozen-last→reverse) and
    0 → 1 → … (frozen-first→forward) — frame-perfect continuity, no
    frame-0 jump. Pre-fix pixel probe (_repro_gif_flash.py) showed the
    1-frame zero-alpha hole at dStart=+3.7 on CONTROL.
  - _verify_single_cycle.py: full phase cycle (forward → frozen-last →
    reverse → frozen-first → forward → frozen-last) for gif AND mp4,
    single room, same instance id throughout, phases asserted on
    CONTROL + FINAL — 20/20 PASS.
  - npm test: same 29 pre-existing failures as the stashed baseline
    (diff of failure lists identical, timing-only differences);
    node --check clean on all edited files.

files_changed:
  - src/app/runtime/live-sync/runtime-live-sync-core.js (re-trigger re-stamp detection in snapshot preservation, [58] re-stamp-accepted diagnostic)
  - src/app/runtime/runtime-orchestration.js (getAnimationStartedAtEpochMs wired into live-sync-core ctx)
  - src/app/runtime/render/runtime-draw-loop.js (shouldSkipNotYetStartedAnimation + age clamps)
