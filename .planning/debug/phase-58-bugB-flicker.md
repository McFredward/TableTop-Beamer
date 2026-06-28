---
status: resolved
trigger: "Bug B: flicker/blinking with 5+ concurrent room mp4 videos on Frostpunk board; CONTROL + FINAL roles; vanishes with devtools open; persisted through v1.2.10-13; operator uses FIREFOX on LAN"
created: 2026-06-05T00:00:00Z
updated: 2026-06-05T18:30:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED (two stacked defects, same broken assumption)
test: completed — Playwright Firefox 148 + Chromium, live page at localhost:4173, 6 rapid triggers of "test" (generator_boost.mp4, play-then-freeze) in rooms 3-8
expecting: —
next_action: hand off to fix agent

reasoning_checkpoint:
  hypothesis: "The mp4 paint pipeline treats `videoFrameCallbackBound === true` as proof that rVFC will fire per decoded frame and keep the fallback canvas fresh. Two independent failures break that assumption: (1) Firefox delivers rVFC for off-DOM <video> elements only sporadically (3-13 fires/s for a 25fps source) once ~4+ decoders run concurrently; (2) per-instance playback states in roomMp4PlaybackStateByKey are never purged on instance release, and animation ids (anim-N, module counter reset on page load) are reused across page sessions, so a brand-new video element inherits a stale state with bound=true and is NEVER rVFC-bound at all. In both cases drawNow stays false on most/all rAF ticks and the room replays a stale fallback frame, punctuated by jump-forward live paints — the operator's flicker/blinking."
  confirming_evidence:
    - "TT_DEBUG_58 paint outcomes during 11s playback, Firefox: per instance ~30 'gated-out'/s, total 'live' = 1 for the entire playback; videoReady=4, paused=false, currentTime advancing"
    - "Per-instance _decodedFrameCount frozen for 7+ s while an isolated control video on the SAME page fired rVFC at full 23/s for 8s"
    - "Fresh probe callback registered on the SAME 'dead' video elements fired 69-90 times/3s; getVideoPlaybackQuality showed 90 decoded frames/3s — decoder healthy, runtime chain dead"
    - "rVFC prototype instrumentation: the 6 new per-instance videos got ZERO requestVideoFrameCallback registrations (bind skipped); the previous session's leftover videos (same anim-N ids) were the ones holding the states with bound=true"
    - "Control experiment burning the id counter to anim-101 (no collisions): all 6 chains bind and stay alive — but Firefox delivers only 3-13 fires/s vs 25fps source (plain-DOM-free 6-video test reproduces this outside the runtime: 0-15 fires/s, irregular); Chromium delivers steadily"
  falsification_test: "If with fresh, non-colliding ids on Chromium the paint outcomes were also all gated-out, the id-collision mechanism would be wrong (it wasn't: Chromium+fresh ids paints live per decoded frame). If Firefox with 1 video starved, the N-decoder starvation claim would be wrong (it doesn't: 1 video = full 25fps delivery)."
  fix_rationale: "Gate must trust rVFC only while it is demonstrably delivering (recent fire), otherwise degrade to the pre-v1.1.5 tier time-gate with per-paint fallback capture; binding must be tracked per (state, video-element) pair so a new element always gets bound; releasing an instance must purge its playback state. Together these remove both failure modes at the root instead of patching symptoms."
  blind_spots: "Headless+software-rendering exaggerates Firefox starvation; on operator hardware delivery is better but still irregular (matches 'flicker' not 'freeze', and 'vanishes with devtools open' = scheduling change). Did not verify /output/ FINAL role separately — same draw-loop code path, same browsers. Did not reproduce the live-sync omission variant (no gap events, no releases observed during rapid triggers in 12 runs)."

## Symptoms

expected: 5+ concurrent mp4 room animations play smoothly on dashboard (/) and /output/
actual: videos flicker/blink; vanishes when devtools open (timing signature)
errors: "Ungültige URI. Laden der Medienressource fehlgeschlagen" console lines
reproduction: trigger mp4 room animations ("test" = generator_boost.mp4, play-then-freeze) in 5+ Frostpunk rooms rapidly, Firefox
started: persisted through v1.2.10, v1.2.11, v1.2.12, v1.2.13 (all targeted the live-sync snapshot layer — wrong layer)

## Eliminated

- hypothesis: Firefox lacks requestVideoFrameCallback → videoFrameCallbackBound stays false → time-gate path analysis
  evidence: Firefox 148 supports rVFC; off-DOM video fired 74 times/3s (≈25fps). bound IS true; the failure is delivery/binding, not support.
  timestamp: 2026-06-05T15:05Z
- hypothesis: live-sync snapshot wholesale-replace transiently drops animations >500ms old in phase "forward" → unpainted polygons
  evidence: rAF presence sampler across 6 rapid triggers: zero disappear/reappear events, zero premature releases; no "no-frame" paint outcomes (0 of ~2000 paints). The v1.2.10/11 merge holds in this scenario.
  timestamp: 2026-06-05T15:10Z
- hypothesis: per-paint fallback capture branch (v1.2.12, gated to !videoFrameCallbackBound) is unreachable on Firefox and fallback goes stale-null
  evidence: fallback is non-null (hasVisibleFrame true); the defect is upstream — drawNow never authorizes live paints, so the (fresh-enough) fallback is replayed forever. The v1.2.12 gate IS part of the problem surface but only because `videoFrameCallbackBound` is a lie (see root cause).
  timestamp: 2026-06-05T15:40Z
- hypothesis: rVFC chain death by exception inside onFrame (missing re-registration)
  evidence: instrumented reg/fire/throw lifecycle: zero throws; every fire was followed by a re-registration; for colliding-id instances there were ZERO registrations ever (bind skipped), and for fresh-id instances chains stay alive.
  timestamp: 2026-06-05T16:05Z

## Evidence

- timestamp: 2026-06-05T15:00Z
  checked: Firefox 148 (Playwright) rVFC support, off-DOM video
  found: supported; 74 fires/3s off-DOM, 48/2s in-DOM-hidden
  implication: rVFC-unsupported theory dead; bound=true on operator's Firefox

- timestamp: 2026-06-05T15:10Z
  checked: 6 rapid "test" triggers (rooms 3-8), TT_DEBUG_58 paint outcomes, Firefox
  found: per instance per second: ~30 "gated-out", 0 "live" (1 live total at start), 0 "no-frame"; videoReady=4, paused=false; currentTime advances normally to EOS
  implication: rooms repaint a stale fallback canvas on every rAF for the entire playback; flicker = stale-frame replay + rare jump paints, NOT transparent/black frames

- timestamp: 2026-06-05T15:20Z
  checked: per-instance playbackState._decodedFrameCount sampled 1/s during playback + isolated control video on same page
  found: counters frozen (18-33) for 7+s; control video fired 182/8s continuously
  implication: runtime rVFC chains dead while browser delivery works for a plain element

- timestamp: 2026-06-05T15:30Z
  checked: plain 6 off-DOM videos in Firefox (no runtime code)
  found: rVFC fires continuous but starved + irregular: 0-15 fires/s per video vs 25fps source
  implication: Firefox throttles rVFC delivery for multiple concurrent off-DOM (non-composited) videos — N≈4-6 is the cliff; Chromium plain-6 delivers steadily (~12/s headless cadence, regular)

- timestamp: 2026-06-05T15:50Z
  checked: post-freeze probe — fresh requestVideoFrameCallback on the dead videos + getVideoPlaybackQuality
  found: probe fired 69-90/3s; 90-96 frames decoded/3s; both Firefox and Chromium
  implication: element + decoder healthy; the runtime's registration is simply absent

- timestamp: 2026-06-05T16:00Z
  checked: HTMLVideoElement.prototype.requestVideoFrameCallback + src setter instrumentation across full trigger flow
  found: the 6 NEW per-instance videos (created on trigger) received ZERO rVFC registrations; the 6 videos that DID have registrations were the previous page-session's leftovers (same anim-N ids, served back by the server snapshot at boot), later released via src="" (the operator's "Ungültige URI" console lines — they come from releaseMp4VideoElementsForInstance, NOT audio)
  implication: _bindRoomMp4FrameCallback was skipped for the new elements because the per-instance playback state already existed with videoFrameCallbackBound=true

- timestamp: 2026-06-05T16:10Z
  checked: id generation (runtime-animation-factory.js L9/L52) + release path (runtime-outside-mp4.js L161-176)
  found: ids are `anim-${counter++}` with a module counter that RESETS TO 1 ON PAGE LOAD; releaseMp4VideoElementsForInstance deletes outsideVideoCacheByPath/roomVideoCacheByPath entries but NEVER deletes roomMp4PlaybackStateByKey entries (`${assetRef}#${instanceId}`)
  implication: any id reuse (page reload of a control client, second client like the mobile dashboard whose counter also starts at 1, projector running for hours accumulating states) attaches a brand-new <video> to a stale state: bound=true (never re-binds), stale fallbackCanvas (previous animation's last frame), frozen counters → hasNewDecodedFrame false forever → permanent stale paint

- timestamp: 2026-06-05T16:20Z
  checked: control experiment — burn id counter to anim-101, then trigger 6 rooms (no collisions), Firefox
  found: all 6 states bind, chains stay alive entire playback; BUT delivery is 3-13 fires/s (irregular) vs 25fps source while currentTime advances smoothly 1.0/s
  implication: even without the state-leak bug, Firefox starvation alone reduces room mp4 painting to irregular 3-13Hz: every silent stretch replays the frozen fallback, every fire causes a jump-forward live paint → 6 rooms pulsing/jumping out of sync = operator's "Flackern/Blinken"; devtools-open changes Firefox scheduling → starvation eases → symptom vanishes. Chromium fires per decoded frame → prior Chromium repros could never see it.

## Resolution

root_cause: |
  Two stacked defects sharing one broken assumption — "videoFrameCallbackBound === true means rVFC fires per decoded frame and keeps the fallback canvas fresh":

  (1) FIREFOX rVFC STARVATION (the flicker): Firefox delivers requestVideoFrameCallback for off-DOM (never-composited) <video> elements only sporadically once several decoders run concurrently (measured 3-13 fires/s for a 25fps source at 6 videos; full rate at 1 video). The Phase-57 v1.1.5 gate (runtime-draw-loop.js L170-172, also L501-503, L823-825) makes `drawNow = hasNewDecodedFrame()` whenever bound, and v1.2.12 removed the per-paint fallback capture when bound — so on every rAF without a recent rVFC fire the room paints the fallback canvas frozen at the LAST fire, then jumps forward on the next fire. 5+ rooms jumping irregularly and unsynchronized = operator-visible flicker/blinking on CONTROL and FINAL. Disappears with devtools open (scheduling change). Chromium fires per decoded frame, which is why all prior Chromium repro attempts (v1.2.6-1.2.13) missed it.

  (2) STALE PLAYBACK-STATE INHERITANCE ON ID REUSE (the freeze/stale-frame variant): releaseMp4VideoElementsForInstance (runtime-outside-mp4.js L161-176) purges the video-element caches but NOT roomMp4PlaybackStateByKey. Animation ids are `anim-${counter++}` with the counter resetting to 1 per page load (runtime-animation-factory.js L9). On id reuse (control page reload, second control client e.g. mobile, long-lived projector) a brand-new <video> element gets attached to the stale state: videoFrameCallbackBound=true blocks _bindRoomMp4FrameCallback (L821) → rVFC NEVER fires for the new element → hasNewDecodedFrame false forever → the room permanently replays the stale fallbackCanvas (potentially the PREVIOUS animation's last frame). Fully reproduced: new per-instance videos received zero rVFC registrations; with collision-free ids they bind correctly.

fix: |
  APPLIED in v1.2.14 (Phase 58 Wave 3.7h), exactly as proposed below,
  plus the collision-free animation ids (root cause 2's enabler):
  runtime-animation-factory.js now generates
  `anim-<sessionSuffix>-<counter>` where sessionSuffix is unique per
  page load (Date.now base36 + random), so reloads / second clients can
  no longer reuse ids of still-running instances. Ids are opaque
  strings everywhere (server + client compare only); global-* ids
  unchanged. Original proposal:

  A) runtime-outside-mp4.js — make rVFC liveness observable + bind per element + purge state on release:
     1. In `_bindRoomMp4FrameCallback` (L820-848): change the guard from
        `if (!video || !state || state.videoFrameCallbackBound) return;` to
        `if (!video || !state || state._rvfcBoundVideo === video) return;`
        and after the typeof check set BOTH `state.videoFrameCallbackBound = true;` and `state._rvfcBoundVideo = video;`.
        Inside `onFrame`, add `state._lastRvfcFireAtMs = performance.now();` as the first line.
        (Guarantees a NEW video element under a preserved/stale state always gets bound — heals defect 2 even if a stale state survives.)
     2. Same two changes in `bindOutsideMp4FrameCallback` (L366-401) for the outside path.
     3. In `releaseMp4VideoElementsForInstance` (L161-176): after the video-cache loop, add
        `for (const key of Array.from(roomMp4PlaybackStateByKey.keys())) { if (key.endsWith(suffix)) roomMp4PlaybackStateByKey.delete(key); }`
        (Removes the stale-state leak: fallback canvas, counters, mode markers.)
     4. Add + export helper:
        `const RVFC_FRESH_MS = 150;`
        `function isRvfcFresh(playbackState) { if (!playbackState || !playbackState.videoFrameCallbackBound) return false; return performance.now() - Number(playbackState._lastRvfcFireAtMs || 0) < RVFC_FRESH_MS; }`
        (150ms: a healthy ≥12fps source has ≤83ms gaps → stays in rVFC mode; Firefox starvation gaps are typically >150ms → degrades to time-gate. SSR Chromium gaps ~33-40ms → unchanged, so the v1.1.5 duplicate-frame protection and the v1.2.12 FPS optimization both stay effective where they matter.)

  B) runtime-draw-loop.js — trust rVFC only while fresh; capture per paint while it is not:
     - Room path L170-172: replace with
       `const rvfcFreshR = playbackState && ctx.isRvfcFresh(playbackState);`
       `const newFrameR = playbackState && ctx.hasNewDecodedFrame(playbackState);`
       `const drawNow = playbackState ? (newFrameR || (!rvfcFreshR && ctx.shouldDrawOutsideMp4Now(playbackState))) : true;`
     - Room path L187: change capture condition from `!playbackState.videoFrameCallbackBound` to `!rvfcFreshR` (fallback must be refreshed by the paint site whenever rVFC is not doing it).
     - Inside path L501-503: same drawNow restructure (`gateAllows = newFrame || (!rvfcFresh && ctx.shouldDrawOutsideMp4Now(playbackState))`); the inside path already captures per live paint — leave its capture as-is.
     - Outside path L823-825: same restructure for `drawNowO`; outside already captures per live paint.

  C) runtime-orchestration.js — wire the new helper:
     - Add `isRvfcDelivering`/`isRvfcFresh` to the destructure at ~L1291 and to the ctx wiring at ~L2535 (`isRvfcFresh: (playbackState) => isRvfcFresh(playbackState),`).

  Resulting behavior: healthy rVFC (Chromium, SSR, Firefox single video) → identical to today. Starved or dead rVFC (Firefox N videos, stale-state inheritance, future browsers) → after 150ms of silence the path degrades to the proven pre-v1.1.5 tier time-gate: live paints of the smoothly-advancing video at 30-45fps + per-paint fallback capture → no flicker, no freeze. Frozen-at-EOS videos: time-gate paints the static last frame; first capture re-syncs the fallback so fallback==live (no shimmer). Optional perf refinement for the fixer: skip the per-paint capture when `video.ended === true` after one post-ended capture (flag on state) to avoid redundant blits for frozen videos.

  Note for fixer/operator: the "Ungültige URI. Laden der Medienressource fehlgeschlagen" Firefox console lines are produced by releaseMp4VideoElementsForInstance setting `video.src = ""` on released elements (runtime-outside-mp4.js L170) — benign teardown noise, not audio (audio path null-guards soundAssetRef "none"). Setting `video.removeAttribute("src"); video.load();` instead of `src = ""` silences them if desired.

verification: |
  Repro harness (Playwright Firefox 148, live dev server): .planning/debug/_repro_bugB_ff.py + inline scripts (diagnose session).
  - Pre-fix, colliding ids: 0 rVFC registrations on new videos; all paints "gated-out"; decoded counters frozen.
  - Pre-fix, fresh ids (counter burned): chains alive but 3-13 fires/s vs 25fps; paints ~1 live per fire, fallback replay between fires.
  - POST-FIX (v1.2.14, .planning/debug/_verify_v1214.py, Playwright
    Firefox 148, isolated server 4555 — 17/17 checks pass): reload
    mid-running → rehydrated instance gets a NEW video element that
    re-binds rVFC (boundToCurrentVideo=true) and decodes continuously
    (_decodedFrameCount 182 over ~8.9s); a NEW post-reload trigger gets
    a collision-free session-suffixed id (anim-mq14jh4vbr7xg7-2 vs
    pre-reload anim-mq14jb15z5dssx-2) and its _decodedFrameCount
    increments (49 → 90 over 2s) with the binding attached to the
    current element. Live-sync omission survival + explicit-stop
    removal verified in the same run (see Bug A file). npm test: same
    29 pre-existing failures as HEAD, zero new failures. node --check
    clean on all edited files.

files_changed:
  - src/app/runtime/render/runtime-outside-mp4.js (per-element rVFC bind via _rvfcBoundVideo, _lastRvfcFireAtMs stamps, isRvfcFresh export, playback-state purge in releaseMp4VideoElementsForInstance)
  - src/app/runtime/render/runtime-draw-loop.js (room/inside/outside gates: newFrame || (!isRvfcFresh && time-gate); room per-paint fallback capture while !fresh)
  - src/app/runtime/runtime-orchestration.js (isRvfcFresh destructure + ctx wiring)
  - src/app/runtime/core/runtime-animation-factory.js (anim-<session>-<counter> collision-free ids)
  - src/app/runtime/live-sync/runtime-live-sync-core.js (absence-grace snapshot merge, see Bug A file)
