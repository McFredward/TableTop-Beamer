---
status: resolved
trigger: "Bug A persists in v1.2.13: re-trigger of frozen play-then-freeze room animation makes frozen image DISAPPEAR instead of playing reverse. Operator uses FIREFOX (German console) on LAN. All prior repro was Chromium. 10x 'Ungültige URI' media errors after page load. Vanishes with devtools/TT_DEBUG_58."
created: 2026-06-05T12:00:00Z
updated: 2026-06-05T18:30:00Z
---

## Current Focus

hypothesis: Firefox-specific media element behavior (ended timing / rvfc absence / src-swap handling) breaks the frozen-last phase detection or the reverse src swap, causing either a fall-through to NORMAL trigger (second instance) or a blank video paint.
test: Reproduce under Playwright Firefox against localhost:4173 with HTMLMediaElement src/load/play instrumentation
next_action: Read key files (runtime-room-dispatch.js L130-205, runtime-outside-mp4.js, runtime-draw-loop.js L94-260), install Playwright Firefox, build repro script

## Symptoms

expected: "Per room: trigger -> plays forward -> freezes last frame; re-trigger -> plays REVERSE -> freezes first frame; re-trigger -> forward again. Config: playbackMode=play-then-freeze, onRetrigger=reverse-then-freeze-first, playbackDirection=forward, asset generator_boost.mp4, board Frostpunk, animation 'test'."
actual: "Re-trigger makes the frozen image DISAPPEAR. Reproduces WITHOUT devtools; vanishes when devtools open / TT_DEBUG_58=true. Operator on Firefox (German), LAN http://192.168.0.80:4173, verified running v1.2.13 (console line ref runtime-live-sync-core.js:996 matches). 10x 'Ungültige URI. Laden der Medienressource fehlgeschlagen.' right after page-load preload warnings."
errors: "10x 'Ungültige URI. Laden der Medienressource fehlgeschlagen.' (Firefox: invalid URI, loading media resource failed) right after page load"
reproduction: "Frostpunk board, room animation 'test' (generator_boost.mp4). Trigger once (plays, freezes last frame). Trigger again -> frozen image disappears."
started: "Phase 58 Wave 3. Persists v1.2.6 through v1.2.13 (7 failed fixes)."

## Eliminated

- hypothesis: Stale client cache (operator running old build)
  evidence: Operator console line ref runtime-live-sync-core.js:996 matches current v1.2.13 file (was :977 pre-v1.2.13)
  timestamp: 2026-06-05 (given)

- hypothesis: Role-gated in-flight merge drops animation on FINAL role (prior session root cause)
  evidence: Fixed in v1.2.11 (bcff07f) + v1.2.13 (b751f41 unconditional frozen-phase preservation); bug persists per operator
  timestamp: 2026-06-05 (given)

## Evidence

- timestamp: 2026-06-05T12:30Z
  checked: "Ungültige URI" source via HTMLMediaElement src-setter instrumentation (init script, stack capture) under Playwright Firefox 148
  found: ONLY producer of empty-src media loads is releaseMp4VideoElementsForInstance (runtime-outside-mp4.js L170 video.src="") called from pruneFinishedAnimations release debounce (runtime-draw-loop.js L944). Sound voices (warmEventSoundAssets, 20 Audio elements) all load with valid paths, no errors. Firefox logs "Invalid URI. Load of media resource failed." exactly once per src="" set.
  implication: operator's 10x "Ungültige URI" right after page load = 10 per-instance VIDEO elements released within seconds of page load = ~10 running animation instances were wholesale-removed from state.runningAnimations for >500ms shortly after the operator's page loaded. NOT audio.

- timestamp: 2026-06-05T12:40Z
  checked: full re-trigger cycle on ISOLATED server (port 4555, no concurrent agent noise), Firefox headless, CONTROL role, TT_DEBUG_58 off
  found: trigger -> forward plays 11.3s -> phase frozen-last (ended=true ct=dur) -> re-trigger -> candidate matched, phase reverse, src swapped in-place to /api/animation-reverse, load+play OK (rs 0->4 in ~70ms), reverse plays. NO disappear, NO state drop.
  implication: basic Firefox media behavior (ended timing, rvfc, src swap, autoplay) is NOT broken; bug needs additional environmental factor (longer frozen wait, multi-client, multiple cycles, real-UI path, or concurrent animations).

- timestamp: 2026-06-05T12:40Z
  checked: first-ever ensureRoomMp4Playback call after video element creation (media log)
  found: getMediaVideoElement creates video with HASH-suffixed src (?v=2437bdc3c310), then the very first ensureRoomMp4Playback immediately re-swaps src to the UNHASHED expectedSrcUrl (resolveMp4AssetUrlForDirection returns raw assetRef without hash) and calls load() again
  implication: redundant double-load at instance start; also means expectedSrcUrl comparison operates on unhashed URLs - any code path that resets src to hashed version will fight the playback-owned src. Noted, not yet proven harmful.

- timestamp: 2026-06-05T12:25Z
  checked: shared dev server 4173 during first repro run
  found: 6 concurrent "test" instances in rooms 3-8 appeared from a single trigger; transient total-wipe of runningAnimations at t=10s
  implication: Bug B agent is actively mutating the shared server - all experiments moved to isolated server on port 4555.

- timestamp: 2026-06-05T13:30Z
  checked: two full retrigger cycles (fwd->frozen-last->rev->frozen-first->fwd->frozen-last->rev) with 20s frozen waits, dashboard Firefox + /output tab open, isolated server
  found: all 4 phase transitions + src swaps correct; zero snapshot-diff events; zero releases
  implication: long frozen waits + passive FINAL client do not trigger the bug

- timestamp: 2026-06-05T13:50Z
  checked: SSR projector tab (Chromium, real render host) state + JPEG pixels through a full re-trigger cycle (via /api/diag/ssr-eval-in-tab + /api/diag/ssr-screenshot)
  found: SSR tab transitions frozen-last -> reverse (src REV, rs4, plays) -> frozen-first; frozen frame VISIBLE in screenshot pixels
  implication: v1.2.13 projector path is healthy in clean conditions

- timestamp: 2026-06-05T14:00Z
  checked: operator-realistic multi-room scenario - same animation frozen in 6 rooms, re-trigger one room
  found: target room reversed cleanly; other 5 stayed frozen-last; count stayed 6 throughout
  implication: multi-instance per-room independence works

- timestamp: 2026-06-05T14:05Z
  checked: protection coverage in applyLiveRuntimeSnapshot (L555-596)
  found: in-flight merge covers startedAtEpochMs < 500ms; isClientHeldPlaybackPhase covers ONLY frozen-last/frozen-first/reverse. Phase "forward" (initial trigger AND frozen-first->forward retrigger, 11.3s of playback) has NO protection after the 500ms grace. Additionally stop-animation/clear-all snapshots skip ALL protection (isExplicitRemoveMutation).
  implication: an interleaved snapshot that omits a forward-playing instance >500ms after (re)trigger wholesale-removes it. Observed organically on shared server 4173 (t=10s full wipe of 6 forward-phase anims during Bug B agent churn).

## Resolution

root_cause: |
  Design flaw in applyLiveRuntimeSnapshot (runtime-live-sync-core.js):
  snapshot apply wholesale-replaces state.runningAnimations, so a
  TRANSIENT snapshot omission was indistinguishable from removal. The
  v1.2.10-13 patches protected only (a) instances with
  startedAtEpochMs < 500ms old and (b) frozen-last/frozen-first/reverse
  phases — phase "forward" instances older than 500ms (initial trigger
  AND frozen-first→forward re-trigger, 11.3s of playback for
  generator_boost.mp4) had NO protection (14:05Z evidence). An
  interleaved snapshot omitting such an instance removed it → the draw
  loop's release debounce killed its per-instance <video> via src=""
  → Firefox "Ungültige URI. Laden der Medienressource fehlgeschlagen"
  (the operator's 10× console lines = 10 released video elements after
  a wholesale wipe, observed organically on the shared server at t=10s).
  Compounding factors fixed alongside (Bug B file): animation id
  collisions across page loads attaching new videos to stale playback
  states, and Firefox rVFC starvation.

fix: |
  v1.2.14 (Phase 58 Wave 3.7h), runtime-live-sync-core.js — replaced
  the patchwork with an absence-grace model: module-level
  absentSinceMsById Map + ABSENCE_REMOVAL_GRACE_MS = 2000. In the merge
  loop, a previous animation NOT present in the snapshot is (1) dropped
  immediately if not bound to the selected board, (2) preserved
  unconditionally if in a client-held phase (frozen-last / frozen-first
  / reverse — never expire by absence), (3) otherwise stamped on first
  absence and preserved until absent > 2s, then dropped. Ids present in
  the snapshot clear their absence stamp. Explicit remove mutations
  (stop-animation / clear-all) bypass the merge entirely (immediate
  removal) and clear the map; board switch clears the map. The old
  500ms startedAtEpochMs check was removed (subsumed). An animation is
  now removed only by explicit remove mutation, board mismatch, or
  sustained absence (>2s) from snapshots.

verification: |
  Playwright Firefox 148, isolated server port 4555
  (.planning/debug/_verify_v1214.py), 17/17 checks pass:
  (a) full re-trigger cycle on Frostpunk "test" room-3: trigger →
  frozen-last → re-trigger → reverse (same instance id) → frozen-first
  → re-trigger → forward (same id) → frozen-last; instance present in
  state.runningAnimations at every 100ms sample; clear-all removes it.
  (b) 5 rooms triggered (phase forward, >500ms old), synthetic snapshot
  omitting all animations with fresh version → all 5 SURVIVE; second
  omitting snapshot at ~0.8s → still survive; omitting snapshot after
  >2s sustained absence → removed; explicit stop-animation snapshot →
  removed immediately with no grace.
  npm test: same 29 pre-existing failures as HEAD (encoder-preset /
  SSR-receiver suites), zero new failures.

files_changed:
  - src/app/runtime/live-sync/runtime-live-sync-core.js (absence-grace merge, absentSinceMsById, board-switch + explicit-remove clearing)
  - src/app/runtime/core/runtime-animation-factory.js (session-suffixed collision-free ids, see Bug B file)
  - src/app/runtime/render/runtime-outside-mp4.js (per-element rVFC bind + state purge on release, see Bug B file)
  - src/app/runtime/render/runtime-draw-loop.js (rVFC freshness gate, see Bug B file)
  - src/app/runtime/runtime-orchestration.js (isRvfcFresh ctx wiring)
