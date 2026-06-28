// outside MP4 playback module.
//
// Owns the outside (and room) MP4/video playback caches, lifecycle
// state, prewarm logic, fallback canvas capture/replay, and the
// video-frame-callback binding. This is a self-contained domain:
// every map + constant it reads or writes lives inside the module.
//
// Dependencies injected via ctx:
//   state                 — runtime state for boardId lookup + outside def
//   canvas                — DOM canvas element (width/height)
//   canvasCtx             — 2d rendering context (bound as "renderingCtx"
//                            inside the module to avoid shadowing our
//                            dependency-injection `ctx`)
//   getSelectedOutsideAnimationDefinition
//   getMp4PerformanceControls
(() => {
  let ctx = null;

  // Module-private caches and timeline state. Previously these lived
  // as module-level Maps at the top of runtime-orchestration.js.
  const outsideVideoCacheByPath = new Map();
  const roomVideoCacheByPath = new Map();
  const outsideMp4PlaybackStateByBoard = new Map();
  const outsideTimelineStateByBoard = new Map();
  // Phase 50 (2026-05-25): room-mp4 loop-wrap machinery, mirrors the
  // outside-mp4 fallback path keyed by assetRef instead of boardId.
  // Operator UAT (2026-05-25): "Bei Animationen bei denen eine mp4
  // hinterlegt ist, sieht man eine ganz kurze Unterbrechung im SSR
  // (/output/) am Ende des Videos … Es soll komplett fließend direkt
  // neu starten". Root cause: bare native `<video loop>` stalls for
  // 1 capture frame at loop wrap; the dashboard's canvas re-paint
  // hides it but the SSR's getDisplayMedia capture + encoder show
  // it as a held frame + I-frame insertion. Fix: same manual-wrap +
  // fallback-frame pattern as outside MP4.
  const roomMp4PlaybackStateByKey = new Map();

  // Loop/fallback tuning constants (previously module-scope in the
  // runtime file).
  const OUTSIDE_MP4_LOOP_START_OFFSET_SEC = 0.05;
  const OUTSIDE_MP4_LOOP_WRAP_LEAD_SEC = 0.08;
  const OUTSIDE_MP4_LOOP_WRAP_COOLDOWN_MS = 220;
  // Phase 30 Plan 30-04 T16: bumped 350 → 1500 ms.
  // T13 captures the fallback every 5th rAF; on Pi at 12 fps that's
  // ~417 ms between captures, sometimes slipping past the 350 ms
  // freshness gate → drawOutsideMp4FallbackFrame returned false →
  // outside region went black during the loop-wrap seek window
  // (the visible "hiccup" the user reports). 1500 ms is generously
  // above any plausible capture cadence on Pi (would need <0.7 fps
  // to miss the gate); the captured frame is still very close to
  // the live frame visually for a slow-moving particle/sand backdrop.
  const OUTSIDE_MP4_FALLBACK_FRAME_MAX_AGE_MS = 1500;

  function init(dependencies) {
    ctx = dependencies;
  }

  function getMediaVideoElement(cacheMap, path, opts = {}) {
    const normalizedPath = String(path || "").trim();
    if (!normalizedPath) {
      return null;
    }
    // Phase 58 Wave 3.2: per-instance video element for non-loop modes
    // so multiple rooms running the same play-then-freeze animation
    // have INDEPENDENT lifecycles. Without this, Room B's just-triggered
    // animation inherits Room A's already-frozen video and shows the
    // last frame immediately (operator UAT 2026-06-04).
    // Loop mode keeps the shared per-path cache (legacy behavior;
    // identical content stays in sync across multiple targets).
    const usePerInstance =
      opts.instanceId
      && opts.playbackMode
      && opts.playbackMode !== "loop";
    const cacheKey = usePerInstance
      ? `${normalizedPath}#${opts.instanceId}`
      : normalizedPath;
    // Phase 28 B5: resolve the hash-suffixed URL. Map key stays as the raw
    // `normalizedPath` so the asset-picker delete logic and the rest of the
    // render layer continue to find cache entries by canonical path. Only
    // `<video>.src` gets the `?v=<hash>` suffix.
    const resolveHashUrl = () =>
      window.TT_BEAMER_RUNTIME_ASSET_MANIFEST?.resolveAssetUrlWithHash?.(normalizedPath) ?? normalizedPath;
    if (!cacheMap.has(cacheKey)) {
      const video = document.createElement("video");
      video.src = resolveHashUrl();
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      video.muted = true;
      video.loop = false;
      video.playsInline = true;
      cacheMap.set(cacheKey, {
        status: "loading",
        video,
        durationSec: null,
      });
      const entry = cacheMap.get(cacheKey);
      video.addEventListener("loadedmetadata", () => {
        const durationSec = Number(video.duration);
        if (entry) {
          entry.status = Number.isFinite(durationSec) && durationSec > 0 ? "ready" : "error";
          entry.durationSec = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : null;
        }
      });
      video.addEventListener("error", () => {
        if (entry) {
          entry.status = "error";
        }
      });
    } else {
      // Phase 28 B5: cache hit — re-upload between this and last call may have
      // changed the resolved hash. If so, refresh the element's src so the
      // browser bypasses HTTP cache AND the <video> reloads new bytes.
      const entry = cacheMap.get(cacheKey);
      const video = entry?.video;
      if (video) {
        // Phase 58 Wave 3.7 fix: when the playback mode owns video.src
        // (boomerang src-swap on EOS; reverse-on-retrigger phase swap
        // via ensureRoomMp4Playback's expectedSrcUrl), do NOT fight it
        // with the Phase 28 hash-bust reset. The two swaps were
        // round-tripping the src every rAF — video stuck at
        // readyState=0, never painted, fallback canvas showed last
        // frozen frame (operator UAT 2026-06-05). Per-instance video
        // elements only live for one instance — re-uploads of the
        // asset can't happen mid-playback, so the hash-bust is
        // unnecessary for non-loop modes anyway.
        const playbackOwnsSrc =
          video._tt58PlaybackMode
          && video._tt58PlaybackMode !== "loop";
        if (!playbackOwnsSrc) {
          const desired = resolveHashUrl();
          if (video.src !== desired && desired) {
            // src setter is relative; compare canonical absolute strings.
            const currentAbs = video.src;
            const desiredAbs = new URL(desired, window.location.href).href;
            if (currentAbs !== desiredAbs) {
              video.src = desired;
              try { video.currentTime = 0; } catch { /* DOM may reject */ }
              try { video.load(); } catch { /* harmless */ }
              entry.status = "loading";
              entry.durationSec = null;
            }
          }
        }
      }
    }
    return cacheMap.get(cacheKey) ?? null;
  }

  function getOutsideVideoElement(path, opts) {
    return getMediaVideoElement(outsideVideoCacheByPath, path, opts);
  }

  function getRoomVideoElement(path, opts) {
    return getMediaVideoElement(roomVideoCacheByPath, path, opts);
  }

  // Phase 58 Wave 3.2: cleanup hook for per-instance video elements.
  // Called from the running-list-prune path so stale instances release
  // their dedicated video elements instead of leaking. Composite keys
  // have the form `${path}#${instanceId}`; this function removes any
  // entries whose suffix matches the supplied instanceId.
  function releaseMp4VideoElementsForInstance(instanceId) {
    if (!instanceId) return;
    const suffix = `#${instanceId}`;
    const releasedKeys = [];
    for (const cacheMap of [outsideVideoCacheByPath, roomVideoCacheByPath]) {
      for (const key of Array.from(cacheMap.keys())) {
        if (key.endsWith(suffix)) {
          releasedKeys.push(key);
        }
      }
    }
    // Phase 58 Wave 3.7i (2026-06-05): PERMANENT diagnostic (operator
    // request). This line immediately precedes any Firefox "Ungültige
    // URI. Laden der Medienressource fehlgeschlagen." console error
    // (caused by the src="" below — the only such site), so the
    // operator's console shows WHICH instance was released. Pair with
    // the [58] anim-removed / [58] prune-release logs for the WHY.
    if (releasedKeys.length > 0) {
      console.warn("[58] release-video", JSON.stringify({ instanceId, keys: releasedKeys }));
    }
    for (const cacheMap of [outsideVideoCacheByPath, roomVideoCacheByPath]) {
      for (const key of Array.from(cacheMap.keys())) {
        if (key.endsWith(suffix)) {
          const entry = cacheMap.get(key);
          try {
            entry?.video?.pause?.();
            if (entry?.video) entry.video.src = "";
          } catch { /* defensive */ }
          cacheMap.delete(key);
        }
      }
    }
    // Phase 58 Wave 3.7h (2026-06-05): ALSO purge the per-instance
    // playback states. These were leaking forever — and because
    // animation ids used to collide across page loads (anim-N counter
    // reset), a NEW instance reusing an id inherited the stale state:
    // videoFrameCallbackBound=true blocked the rVFC bind, the stale
    // fallbackCanvas (previous animation's last frame) replayed
    // permanently. See phase-58-bugB-flicker.md root cause (2).
    for (const key of Array.from(roomMp4PlaybackStateByKey.keys())) {
      if (key.endsWith(suffix)) {
        roomMp4PlaybackStateByKey.delete(key);
      }
    }
  }

  // Phase 58 Wave 3.7i (2026-06-05): compare video srcs ignoring the
  // Phase 28 `?v=<hash>` cache-bust suffix. The Wave 3.6 expectedSrcUrl
  // swap compared the element's hash-suffixed src against the PLAIN
  // forward URL → mismatch every rAF → swap to plain → the Phase 28
  // hash-bust in getMediaVideoElement (active for loop mode) swapped
  // BACK to the hashed URL → src round-trip every frame, video stuck at
  // readyState=0: loop-mode room mp4s whose asset has a manifest hash
  // never played (verified pre-existing on v1.2.14 via Playwright
  // Chromium probe). The hash never changes which CONTENT direction the
  // src points at, so phase-swap decisions must ignore it.
  function _srcEqualsIgnoringHash(currentAbsUrl, desiredAbsUrl) {
    const strip = (u) => String(u || "").replace(/[?&]v=[0-9a-f]+$/i, "");
    return strip(currentAbsUrl) === strip(desiredAbsUrl);
  }

  // Phase 58 Wave 3: returns the asset URL to use as <video>.src
  // depending on the requested initial direction. For direction=reverse
  // returns the ffmpeg-reverse-cached URL served by the server's
  // /api/animation-reverse endpoint. For direction=forward returns the
  // raw asset path unchanged.
  // Phase 58 Wave 3.7n: optional third param `qualityTier` — when
  // "proxy480" (adaptive video quality downswitch) the forward URL
  // routes through /api/animation-proxy?height=480 and the reverse URL
  // carries &height=480, both server-side ffmpeg caches. Omitted /
  // "full" keeps the pre-3.7n behavior (backward compatible).
  const ADAPTIVE_PROXY_HEIGHT = 480;
  function resolveMp4AssetUrlForDirection(assetPath, direction, qualityTier = "full") {
    const trimmed = String(assetPath || "").trim();
    const isServableMp4 = trimmed.startsWith("/resources/animations/") && /\.mp4$/i.test(trimmed);
    const useProxy = qualityTier === "proxy480" && isServableMp4;
    if (direction !== "reverse") {
      if (useProxy) {
        return `/api/animation-proxy?asset=${encodeURIComponent(trimmed)}&height=${ADAPTIVE_PROXY_HEIGHT}`;
      }
      return assetPath;
    }
    if (!isServableMp4) return assetPath;
    if (useProxy) {
      return `/api/animation-reverse?asset=${encodeURIComponent(trimmed)}&height=${ADAPTIVE_PROXY_HEIGHT}`;
    }
    return `/api/animation-reverse?asset=${encodeURIComponent(trimmed)}`;
  }

  // Phase 58 Wave 3.7n: which quality tier is CURRENTLY applied to a
  // video element's src? Both proxy-tier URL shapes carry a height
  // query param (/api/animation-proxy?…&height=480 and
  // /api/animation-reverse?…&height=480); the full tier never does.
  // Used by the draw loop to keep FROZEN instances pinned at their
  // applied tier — a tier change must not src-swap a frozen instance
  // (it swaps naturally on the next phase change).
  function getAppliedVideoQualityTier(video) {
    const src = String(video?.src || "");
    return /[?&]height=\d+/.test(src) ? "proxy480" : "full";
  }

  function prewarmBoardOutsideMp4Asset(boardId, { reason = "board-switch" } = {}) {
    const definition = ctx.getSelectedOutsideAnimationDefinition(boardId);
    if (!definition || definition.assetType !== "mp4") {
      return;
    }
    const videoEntry = getOutsideVideoElement(definition.assetRef);
    const video = videoEntry?.video;
    if (!video) {
      return;
    }
    video.preload = "auto";
    if (video.readyState >= 2) {
      return;
    }
    const prime = () => {
      void video.play()
        .then(() => {
          video.pause();
        })
        .catch(() => undefined);
    };
    if (reason === "startup") {
      prime();
      return;
    }
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => prime(), { timeout: 400 });
      return;
    }
    window.setTimeout(() => prime(), 40);
  }

  function clearOutsideMp4PlaybackState(boardId) {
    outsideMp4PlaybackStateByBoard.delete(boardId ?? ctx.state.boardId);
  }

  function clearOutsideTimelineState(boardId) {
    outsideTimelineStateByBoard.delete(boardId ?? ctx.state.boardId);
  }

  function buildOutsideLifecycleKey(boardId, definition) {
    if (!definition || typeof definition !== "object") {
      return `${boardId}:outside:missing-definition`;
    }
    // Lifecycle key only includes asset identity — NOT speed or
    // intensity. Speed/intensity changes should adjust playback rate and
    // opacity without restarting the video. Including them caused the mp4
    // to restart whenever a live-sync snapshot arrived (e.g. room animation
    // start/stop) because normalization could produce slightly different values.
    return [
      String(boardId || "global").trim() || "global",
      String(definition.id || "outside").trim() || "outside",
      String(definition.assetType || "coded").trim() || "coded",
      String(definition.assetRef || "outside-space").trim() || "outside-space",
      String(definition.mode || "standard").trim() || "standard",
      String(definition.direction || "forward").trim() || "forward",
    ].join("|");
  }

  function resolveOutsideElapsedSeconds(now, { boardId, lifecycleKey = "" } = {}) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const normalizedLifecycleKey = String(lifecycleKey || "").trim() || `${effectiveBoardId}:outside:default`;
    const existing = outsideTimelineStateByBoard.get(effectiveBoardId) ?? null;
    if (!existing || existing.lifecycleKey !== normalizedLifecycleKey) {
      outsideTimelineStateByBoard.set(effectiveBoardId, {
        lifecycleKey: normalizedLifecycleKey,
        startedAt: Number(now) || performance.now(),
      });
      return 0;
    }
    const elapsedMs = Math.max(0, (Number(now) || 0) - Number(existing.startedAt || 0));
    return elapsedMs / 1000;
  }

  function getOutsideMp4LoopStartTime(durationSec) {
    const duration = Number(durationSec);
    if (!Number.isFinite(duration) || duration <= 0) {
      return 0;
    }
    return Math.min(Math.max(0.01, OUTSIDE_MP4_LOOP_START_OFFSET_SEC), Math.max(0, duration - 0.02));
  }

  function ensureOutsideMp4FallbackCanvas(playbackState) {
    if (!playbackState) {
      return null;
    }
    if (!playbackState.fallbackCanvas || !playbackState.fallbackCtx) {
      const fallbackCanvas = document.createElement("canvas");
      const fallbackCtx = fallbackCanvas.getContext("2d", { alpha: true });
      if (!fallbackCtx) {
        return null;
      }
      playbackState.fallbackCanvas = fallbackCanvas;
      playbackState.fallbackCtx = fallbackCtx;
    }
    const mainCanvas = ctx.canvas;
    if (playbackState.fallbackCanvas.width !== mainCanvas.width || playbackState.fallbackCanvas.height !== mainCanvas.height) {
      playbackState.fallbackCanvas.width = mainCanvas.width;
      playbackState.fallbackCanvas.height = mainCanvas.height;
    }
    return playbackState;
  }

  function captureOutsideMp4FallbackFrame(playbackState, video) {
    if (!playbackState || !video) {
      return;
    }
    // Phase 58 Wave 3.7i (2026-06-05): ended-video blank-frame guard.
    // On Firefox, drawImage of an ENDED video can intermittently yield
    // a BLANK frame under load (the decoder reclaims the frame buffer).
    // Capturing that blank frame would clobber the good frozen fallback
    // → operator-visible flicker on frozen rooms. Skip the capture when
    // the video has ended UNLESS the state has no visible frame yet
    // (first capture is strictly better than nothing).
    if (video.ended === true && playbackState.hasVisibleFrame && playbackState.fallbackCanvas) {
      return;
    }
    const fallbackState = ensureOutsideMp4FallbackCanvas(playbackState);
    if (!fallbackState?.fallbackCtx) {
      return;
    }
    fallbackState.fallbackCtx.clearRect(0, 0, fallbackState.fallbackCanvas.width, fallbackState.fallbackCanvas.height);
    fallbackState.fallbackCtx.drawImage(video, 0, 0, fallbackState.fallbackCanvas.width, fallbackState.fallbackCanvas.height);
    fallbackState.lastVisibleFrameAtMs = performance.now();
    fallbackState.lastDecodedFrameAtMs = fallbackState.lastVisibleFrameAtMs;
    fallbackState.hasVisibleFrame = true;
  }

  function drawOutsideMp4FallbackFrame(playbackState) {
    // Phase 57 v1.1.7 (2026-06-02): drop the 1500ms age guard. Bug A
    // (strobo / black-flicker on overlaid mp4) traced to this guard
    // returning false on rAF ticks where rVFC hasn't fired in >1500ms
    // under load (two mp4s simultaneously). When this returned false,
    // the paint site left the region UNPAINTED → main rAF's clearRect
    // bled black through → operator-visible strobe. The fallback
    // canvas reflects the last good decoded frame; painting it even
    // when "stale" is strictly better than painting nothing.
    if (!playbackState?.fallbackCanvas || !playbackState.hasVisibleFrame) {
      return false;
    }
    const mainCanvas = ctx.canvas;
    ctx.canvasCtx.drawImage(playbackState.fallbackCanvas, 0, 0, mainCanvas.width, mainCanvas.height);
    return true;
  }

  function maybeWrapOutsideMp4Loop(video, playbackState) {
    if (!video || !playbackState || video.seeking) {
      return;
    }
    // Phase 58: only the explicit "loop" mode keeps the seam-preventing
    // manual wrap. Boomerang needs the natural EOS so the lifecycle
    // handler can src-swap forward ⇄ reverse; play-once-disappear and
    // play-then-freeze need it so the freeze-at-end / cleanup-dispatch
    // logic actually triggers.
    const mode = playbackState.playbackMode;
    if (mode && mode !== "loop") {
      return;
    }
    const durationSec = Number(video.duration);
    const currentTime = Number(video.currentTime);
    if (!Number.isFinite(durationSec) || durationSec <= 0 || !Number.isFinite(currentTime)) {
      return;
    }
    const loopStartSec = getOutsideMp4LoopStartTime(durationSec);
    const loopLeadSec = Math.min(
      Math.max(0.03, OUTSIDE_MP4_LOOP_WRAP_LEAD_SEC),
      Math.max(0.04, durationSec * 0.25),
    );
    if (durationSec <= loopStartSec + loopLeadSec) {
      return;
    }
    const nowMs = performance.now();
    if (nowMs - Number(playbackState.lastLoopWrapAtMs || 0) < OUTSIDE_MP4_LOOP_WRAP_COOLDOWN_MS) {
      return;
    }
    if (currentTime < durationSec - loopLeadSec) {
      return;
    }
    try {
      video.currentTime = loopStartSec;
      playbackState.lastLoopWrapAtMs = nowMs;
    } catch {
      // ignore transient seek errors near loop boundaries
    }
  }

  function bindOutsideMp4FrameCallback(video, playbackState) {
    // Phase 58 Wave 3.7h (2026-06-05): bind per (state, video-element)
    // PAIR, not per state. The old boolean `videoFrameCallbackBound`
    // guard meant a brand-new <video> element attached to a preserved /
    // stale playback state was NEVER rVFC-bound (counters frozen →
    // hasNewDecodedFrame false forever → permanent stale-fallback
    // paint). See phase-58-bugB-flicker.md root cause (2).
    if (!video || !playbackState || playbackState._rvfcBoundVideo === video) {
      return;
    }
    if (typeof video.requestVideoFrameCallback !== "function") {
      return;
    }
    playbackState.videoFrameCallbackBound = true;
    playbackState._rvfcBoundVideo = video;
    const onVideoFrame = (_t, metadata) => {
      // Phase 58 Wave 3.7h: freshness stamp consumed by isRvfcFresh —
      // lets the draw loop detect Firefox rVFC starvation and degrade
      // to the time-gate instead of replaying a frozen fallback.
      playbackState._lastRvfcFireAtMs = performance.now();
      playbackState.lastDecodedFrameAtMs = performance.now();
      playbackState.hasVisibleFrame = true;
      // Phase 57 diag: count rVFC decode events for instrumentation
      playbackState._decodedFrameCount = (playbackState._decodedFrameCount || 0) + 1;
      if (metadata && typeof metadata.mediaTime === "number") {
        playbackState._lastMediaTime = metadata.mediaTime;
      }
      if (metadata && typeof metadata.presentedFrames === "number") {
        playbackState._lastPresentedFrames = metadata.presentedFrames;
      }
      // Phase 57 v1.1.7 (2026-06-02): Bug A — eagerly capture the
      // fallback canvas on every rVFC fire (not only after a successful
      // live paint). Closes the race where the paint site's
      // `haveLiveFrame` check fails transiently (seek window /
      // readyState dip) → no capture happens → fallback stays null →
      // `getRoomMp4FallbackSource` returns null → region painted BLACK
      // (operator-visible strobe). rVFC firing proves Chromium has a
      // presentable frame in the texture, so the capture is safe.
      try {
        captureOutsideMp4FallbackFrame(playbackState, video);
      } catch {
        // canvas surface may be transiently unavailable during page tear-down
      }
      video.requestVideoFrameCallback(onVideoFrame);
    };
    video.requestVideoFrameCallback(onVideoFrame);
  }

  function shouldDrawOutsideMp4Now(playbackState) {
    if (!playbackState) {
      return true;
    }
    const controls = ctx.getMp4PerformanceControls();
    const targetFrameMs = controls.tier === "performance"
      ? 33
      : controls.tier === "balanced"
        ? 22
        : 16;
    const nowMs = performance.now();
    const elapsed = nowMs - Number(playbackState.lastDrawAtMs || 0);
    if (!Number.isFinite(elapsed) || elapsed >= targetFrameMs) {
      playbackState.lastDrawAtMs = nowMs;
      return true;
    }
    return false;
  }

  // Phase 57 v1.1.5 (2026-06-02): consume the rVFC "new decoded frame
  // available" signal and report whether painting the live <video>
  // would yield NEW pixels relative to the prior live paint. When no
  // new decoded frame has arrived since the last live paint, the bare
  // drawImage(video) emits the same pixels twice → the encoder's
  // frame N+1 is a duplicate of N (visible as a "frame drop" to the
  // viewer on motion-heavy content like snow.mp4). The time-throttle
  // gate in shouldDrawOutsideMp4Now does NOT detect this; this gate
  // does, by comparing the rVFC-incremented _decodedFrameCount against
  // the count stamped on the last live paint.
  //
  // Returns false when the rVFC binding isn't active (e.g. browsers
  // without requestVideoFrameCallback) — callers must fall back to
  // the time gate in that case.
  function hasNewDecodedFrame(playbackState) {
    if (!playbackState) return false;
    if (!playbackState.videoFrameCallbackBound) return false;
    const decoded = Number(playbackState._decodedFrameCount || 0);
    const lastPainted = Number(playbackState._lastPaintedDecodedCount || 0);
    return decoded > lastPainted;
  }

  // Phase 58 Wave 3.7h (2026-06-05): is the rVFC chain DEMONSTRABLY
  // delivering? `videoFrameCallbackBound === true` only proves a
  // registration happened once — Firefox throttles rVFC delivery for
  // multiple concurrent off-DOM <video> elements to an irregular
  // 3-13 fires/s for a 25fps source (measured, phase-58-bugB-flicker.md
  // 15:30Z/16:20Z), so the draw loop must NOT trust the bound flag
  // alone. 150ms threshold: a healthy ≥12fps source has ≤83ms gaps →
  // stays in rVFC mode (Chromium/SSR behavior identical to before);
  // Firefox starvation gaps are typically >150ms → callers degrade to
  // the proven pre-v1.1.5 tier time-gate with per-paint fallback
  // capture.
  const RVFC_FRESH_MS = 150;
  function isRvfcFresh(playbackState) {
    if (!playbackState || !playbackState.videoFrameCallbackBound) return false;
    return performance.now() - Number(playbackState._lastRvfcFireAtMs || 0) < RVFC_FRESH_MS;
  }

  // Phase 57 v1.1.5 (2026-06-02): stamp the decoded-frame counter on
  // the playback state AFTER a successful live paint so the next
  // hasNewDecodedFrame() call returns false until rVFC fires again.
  function markMp4FramePainted(playbackState) {
    if (!playbackState) return;
    playbackState._lastPaintedDecodedCount = Number(playbackState._decodedFrameCount || 0);
    playbackState.lastDrawAtMs = performance.now();
  }

  function ensureOutsideMp4Playback(video, { boardId, lifecycleKey = "", assetRef = "", targetRate = 1, playbackMode = "loop", boomerangForwardSrc = null, boomerangReverseSrc = null, instanceId = "", expectedSrcUrl = "", playbackPhase = "" } = {}) {
    // Phase 58 Wave 3.6: same phase-transition src-swap as
    // ensureRoomMp4Playback. Outside mp4 keeps its board-scoped
    // playback state cache (one outside animation per board) so the
    // fallback canvas survives forward↔reverse transitions.
    // Phase 58 Wave 3.7: track whether the in-place src swap fired
    // this tick. See ensureRoomMp4Playback for full rationale —
    // briefly: video.ended stays true for a microtask window after
    // video.load(), making isFrozenAtEnd below skip play() on the
    // exact tick we swapped to the reverse URL.
    let srcWasSwapped = false;
    // Phase 58 Wave 3.7i: the expectedSrcUrl swap exists ONLY for the
    // play-then-freeze forward<->reverse phase transitions. Loop mode
    // never changes direction — and its shared video element is owned
    // by the Phase 28 hash-bust, which this swap would fight every rAF
    // (see _srcEqualsIgnoringHash). Compare hash-insensitively so a
    // freshly created hash-suffixed element in phase forward is not
    // spuriously swapped to the plain URL.
    // Phase 58 Wave 3.7t (2026-06-06): boomerang OWNS its src via the
    // EOS ping-pong in attachMp4LifecycleHandlers. Boomerang manages no
    // playbackPhase (stays "forward"), so the caller's expectedSrcUrl is
    // ALWAYS the forward URL — this swap yanked the reverse leg straight
    // back to forward on the very next rAF after the ended handler's
    // forward→reverse swap, making mp4 boomerang visually identical to
    // loop (operator UAT 2026-06-06). Skip the swap entirely for
    // boomerang; adaptive quality-tier changes apply at the next EOS
    // swap instead (the handler reads _tt58ForwardSrc/_tt58ReverseSrc,
    // which attachMp4LifecycleHandlers re-stamps with tier-aware URLs
    // on every ensure call).
    if (video && expectedSrcUrl && playbackMode !== "loop" && playbackMode !== "boomerang") {
      try {
        const desiredAbs = new URL(expectedSrcUrl, window.location.href).href;
        if (video.src && !_srcEqualsIgnoringHash(video.src, desiredAbs)) {
          const fromSrc = String(video.src).replace(window.location.origin, "");
          video.src = expectedSrcUrl;
          try { video.currentTime = 0; } catch { /* DOM may reject */ }
          try { video.load(); } catch { /* harmless */ }
          srcWasSwapped = true;
          // Phase 58 Wave 3.7i: permanent diagnostic — src swaps only
          // happen on phase transitions (forward<->reverse), low freq.
          console.warn("[58] src-swap", JSON.stringify({
            instanceId,
            from: fromSrc,
            to: String(expectedSrcUrl).replace(window.location.origin, ""),
            phase: playbackPhase || null,
          }));
        }
      } catch { /* defensive */ }
    }
    if (!video) {
      return null;
    }
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const normalizedLifecycleKey = String(lifecycleKey || "").trim();
    const normalizedAssetRef = String(assetRef || "").trim();
    const previous = outsideMp4PlaybackStateByBoard.get(effectiveBoardId) ?? null;
    const didLifecycleChange =
      !previous
      || previous.lifecycleKey !== normalizedLifecycleKey
      || previous.assetRef !== normalizedAssetRef;

    // Phase 58: non-loop modes flip video.loop=false so the native
    // `ended` event fires once and the render path can freeze the last
    // frame (play-then-freeze) or trigger cleanup (play-once-disappear).
    // Loop and boomerang stay on the native loop path so the underlying
    // mp4 keeps producing decoded frames continuously.
    // Phase 58 Wave 3: boomerang uses src-swap on ended, so native
    // loop is OFF for boomerang too (only true loop uses native loop).
    const useNativeLoop = playbackMode === "loop";
    video.loop = useNativeLoop;
    video.muted = true;
    video.playsInline = true;
    attachMp4LifecycleHandlers(video, playbackMode, {
      forwardSrc: boomerangForwardSrc,
      reverseSrc: boomerangReverseSrc,
    });

    if (Math.abs((Number(video.defaultPlaybackRate) || 1) - targetRate) > 0.01) {
      video.defaultPlaybackRate = targetRate;
    }
    if (Math.abs((Number(video.playbackRate) || 1) - targetRate) > 0.01) {
      video.playbackRate = targetRate;
    }

    if (didLifecycleChange) {
      const durationSec = Number(video.duration);
      if (Number.isFinite(durationSec) && durationSec > 0) {
        try {
          video.currentTime = getOutsideMp4LoopStartTime(durationSec);
        } catch {
          // ignore transient seek errors until media is ready
        }
      }
    }

    // Phase 58 Wave 3.1: detect new animation instance (re-trigger).
    // Stamping instanceId on the video element lets us tell apart
    // "previous instance frozen at EOS" from "fresh trigger" — the
    // latter must reset currentTime so the new playthrough starts at
    // the beginning instead of immediately hitting our freeze guard.
    if (instanceId && video._tt58InstanceId !== instanceId) {
      video._tt58InstanceId = instanceId;
      // Reset to start so video.ended falls back to false; the play()
      // call below kicks off the new instance's playback cleanly.
      try { video.currentTime = 0; } catch { /* DOM may reject */ }
    }
    // Do NOT auto-play when a non-loop mode has intentionally paused
    // the video at EOS. Without this guard the ensure function (called
    // every rAF) restarts the video → the operator perceives the
    // animation as looping despite mode being play-once-disappear or
    // play-then-freeze.
    // Phase 58 Wave 3.7t: boomerang included — at natural EOS the ended
    // handler owns the restart (src ping-pong + play()). Without the
    // gate, this per-rAF ensure could race the queued 'ended' task and
    // call play() on the ended video, which per spec seeks to 0 and
    // replays FORWARD before the handler swaps to the reverse leg.
    const isFrozenAtEnd = !srcWasSwapped
      && video.ended === true
      && (playbackMode === "play-once-disappear" || playbackMode === "play-then-freeze" || playbackMode === "boomerang");
    if (!isFrozenAtEnd && (video.paused || didLifecycleChange)) {
      void video.play().catch(() => undefined);
    }

    // Phase 58 Wave 3.7i (2026-06-05): REUSE the previous playback-state
    // object instead of recreating it every rAF. Wave 3.7h's per
    // (state, video) rVFC binding (`_rvfcBoundVideo`) made the old
    // recreate-per-call pattern pathological: every fresh object failed
    // the `_rvfcBoundVideo === video` identity check, registering ONE
    // NEW perpetual rVFC capture chain per rAF tick (~60 chains/s,
    // each doing a full-res fallback capture per decoded frame).
    // Load accumulated for as long as an outside mp4 was on-screen —
    // a strong contributor to the operator's "after some seconds all
    // frozen rooms start flickering" UAT (2026-06-05). The room-mp4
    // path always reused its state object and is unaffected.
    const playbackState = previous ?? {
      fallbackCanvas: null,
      fallbackCtx: null,
      lastVisibleFrameAtMs: 0,
      lastDecodedFrameAtMs: 0,
      lastLoopWrapAtMs: 0,
      lastDrawAtMs: 0,
      videoFrameCallbackBound: false,
      hasVisibleFrame: false,
    };
    if (playbackState.assetRef !== normalizedAssetRef) {
      // Asset changed under the same board key — the captured fallback
      // shows the OLD asset; invalidate it.
      playbackState.hasVisibleFrame = false;
    }
    playbackState.lifecycleKey = normalizedLifecycleKey;
    playbackState.assetRef = normalizedAssetRef;
    // Phase 58: stamp mode so maybeWrapOutsideMp4Loop can branch
    // without needing to plumb the value through the call site.
    playbackState.playbackMode = playbackMode;
    bindOutsideMp4FrameCallback(video, playbackState);
    // Phase 57 diag stash — used by recordMp4PaintDiag to query
    // getVideoPlaybackQuality without touching paint sites
    playbackState._videoForDiag = video;
    outsideMp4PlaybackStateByBoard.set(effectiveBoardId, playbackState);
    return playbackState;
  }

  // ── Room MP4 loop-seam machinery ────────────────────────────────
  //
  // Mirrors the outside-mp4 helpers but the playback cache is keyed
  // by assetRef (multiple rooms sharing the same MP4 share one video
  // element, and therefore share the playback state). The fallback
  // canvas matches the video's natural dimensions; drawImage handles
  // any rect transformation downstream via drawRoomAssetImage.

  // Phase 58 Wave 3.6: composite key (assetRef + instanceId) for
  // non-loop modes so each running animation instance gets its OWN
  // playback state (fallback canvas, rVFC binding, mode marker).
  // Without this, multiple rooms running the same mp4 with
  // play-then-freeze share state — Room A's rVFC binding wins, Room
  // A's fallback canvas leaks into Room B's polygon, and the wrap /
  // freeze logic uses whichever room last called ensureRoomMp4Playback.
  // Operator UAT 2026-06-05: "die Räume syncen sich, jeder Raum
  // zeigt das gefreezte Bild des anderen". Loop mode keeps the
  // shared-per-path key (multi-room loop sync is intentional).
  function _roomMp4Key(assetRef, instanceId, playbackMode) {
    const ref = String(assetRef || "").trim() || "?";
    if (instanceId && playbackMode && playbackMode !== "loop") {
      return `${ref}#${instanceId}`;
    }
    return ref;
  }

  function _ensureRoomMp4FallbackCanvas(state, video) {
    if (!state || !video) return null;
    const w = Math.max(1, Math.floor(Number(video.videoWidth) || 0));
    const h = Math.max(1, Math.floor(Number(video.videoHeight) || 0));
    if (w === 0 || h === 0) return null;
    if (!state.fallbackCanvas || !state.fallbackCtx) {
      const canvas = document.createElement("canvas");
      const fctx = canvas.getContext("2d", { alpha: true });
      if (!fctx) return null;
      state.fallbackCanvas = canvas;
      state.fallbackCtx = fctx;
    }
    if (state.fallbackCanvas.width !== w || state.fallbackCanvas.height !== h) {
      state.fallbackCanvas.width = w;
      state.fallbackCanvas.height = h;
    }
    return state;
  }

  function captureRoomMp4FallbackFrame(state, video) {
    if (!state || !video) return;
    // Phase 58 Wave 3.7i (2026-06-05): ended-video blank-frame guard —
    // see captureOutsideMp4FallbackFrame. Prevents a blank ended-video
    // frame from ever clobbering a good frozen fallback from ANY call
    // site (paint path, rVFC callback, transition hook).
    if (video.ended === true && state.hasVisibleFrame && state.fallbackCanvas) return;
    const ready = _ensureRoomMp4FallbackCanvas(state, video);
    if (!ready) return;
    state.fallbackCtx.clearRect(0, 0, state.fallbackCanvas.width, state.fallbackCanvas.height);
    state.fallbackCtx.drawImage(video, 0, 0, state.fallbackCanvas.width, state.fallbackCanvas.height);
    state.lastVisibleFrameAtMs = performance.now();
    state.lastDecodedFrameAtMs = state.lastVisibleFrameAtMs;
    state.hasVisibleFrame = true;
    // Phase 58 Wave 3.9f (2026-06-08, FROZEN FPS): the fallback canvas
    // content changed in-place — invalidate any cached pre-scaled frozen
    // bitmap (getFrozenScaledBitmap keys on this generation so a re-freeze
    // rebuilds the bitmap from the NEW freeze frame).
    state._fallbackGen = Number(state._fallbackGen || 0) + 1;
  }

  // Phase 58 Wave 3.9f (2026-06-08): pre-scaled frozen-frame bitmap cache.
  //
  // ROOT CAUSE this addresses: v1.2.15 (Wave 3.7i) made a FROZEN room/
  // inside/outside mp4 paint EXCLUSIVELY from the fallback canvas — "one
  // cheap blit per rAF". But that blit DOWNSCALES the full-resolution
  // fallback canvas (e.g. 1280x720) into the much smaller room rect every
  // frame, and Firefox's 2D-canvas downscale RESAMPLE is ~100x slower
  // than Chromium's GPU path (measured: 0.158ms vs 0.0014ms per blit,
  // .planning/debug/_bench_blit.py). On the operator's Firefox dashboard
  // a "freeze-vid" therefore kept costing meaningful fps AFTER freezing,
  // even though the decoder is idle and the JS is negligible — the cost
  // is purely the per-frame resample. Chromium (the SSR/dev env) never
  // showed it, so v1.2.15's "cheap blit" claim held only there.
  //
  // FIX: build an ImageBitmap of the frozen frame ALREADY scaled to the
  // destination rect's pixel size, then blit it 1:1 each rAF (no resample).
  // Firefox per-blit drops 14x (0.158ms -> 0.011ms); Chromium stays
  // negligible (0.016ms). Build is async (createImageBitmap returns a
  // Promise) — the caller blits the full-res fallback until the bitmap is
  // ready (1-2 frames), so there is never an unpainted/strobing frame.
  // The bitmap is keyed on (destW, destH, _fallbackGen): a room resize or
  // a re-freeze (new capture bumps _fallbackGen) rebuilds it.
  function getFrozenScaledBitmap(state, destW, destH) {
    if (!state || typeof createImageBitmap !== "function") return null;
    const src = getRoomMp4FallbackSource(state);
    if (!src) return null;
    const rw = Math.max(1, Math.round(Number(destW) || 0));
    const rh = Math.max(1, Math.round(Number(destH) || 0));
    if (rw <= 1 || rh <= 1) return null;
    const gen = Number(state._fallbackGen || 0);
    // Skip the bitmap path only when the source is ALREADY the exact dest
    // pixel size (the blit is then 1:1 — no resample to eliminate, a
    // bitmap would only add memory). Any other size means the per-frame
    // drawImage resamples (up or down), which is the Firefox cost we are
    // eliminating, so build the pre-scaled bitmap.
    const srcW = Number(src.width || src.videoWidth || 0);
    const srcH = Number(src.height || src.videoHeight || 0);
    if (srcW > 0 && srcH > 0 && srcW === rw && srcH === rh) return null;
    if (state._frozenBmp
        && state._frozenBmpW === rw
        && state._frozenBmpH === rh
        && state._frozenBmpGen === gen) {
      return state._frozenBmp;
    }
    const buildKey = `${rw}x${rh}@${gen}`;
    if (state._frozenBmpBuilding !== buildKey) {
      state._frozenBmpBuilding = buildKey;
      try {
        createImageBitmap(src, { resizeWidth: rw, resizeHeight: rh, resizeQuality: "low" })
          .then((bmp) => {
            // A newer build may have superseded this one (rect/gen change).
            if (state._frozenBmpBuilding !== buildKey) {
              try { bmp.close && bmp.close(); } catch { /* ignore */ }
              return;
            }
            try { state._frozenBmp && state._frozenBmp.close && state._frozenBmp.close(); } catch { /* ignore */ }
            state._frozenBmp = bmp;
            state._frozenBmpW = rw;
            state._frozenBmpH = rh;
            state._frozenBmpGen = gen;
          })
          .catch(() => {
            // createImageBitmap can reject on a transiently-zero-sized
            // source; clear the guard so a later frame retries.
            if (state._frozenBmpBuilding === buildKey) state._frozenBmpBuilding = null;
          });
      } catch {
        state._frozenBmpBuilding = null;
      }
    }
    // Reuse a same-size bitmap from a prior generation as a cheap bridge
    // while the new one builds (avoids the full-res resample for the 1-2
    // build frames; pixels differ only if the freeze frame actually
    // changed, which is imperceptible for that brief window).
    if (state._frozenBmp && state._frozenBmpW === rw && state._frozenBmpH === rh) {
      return state._frozenBmp;
    }
    return null;
  }

  function getRoomMp4FallbackSource(state) {
    // Phase 57 v1.1.7 (2026-06-02): drop the 1500ms age guard. Bug A
    // (strobo / black-flicker on overlaid mp4) traced to this guard
    // returning null on rAF ticks where rVFC hasn't fired in >1500ms
    // under load (two mp4s simultaneously). When this returned null,
    // the inside-mp4 / room-mp4 paint sites left the region UNPAINTED
    // → main rAF's clearRect bled black → operator-visible strobe.
    // The fallback canvas reflects the last good decoded frame;
    // returning it even when "stale" is strictly better than null.
    if (!state?.fallbackCanvas || !state.hasVisibleFrame) return null;
    return state.fallbackCanvas;
  }

  // Phase 58: idempotent ended-listener installer. The mp4 video
  // elements are persistent (one per assetRef) so we must guard against
  // double-binding. Stores a per-mode flag on the video element so the
  // handler reads the current mode at ended-event time (not the bind-
  // time mode, which may be stale if the operator switched modes
  // mid-playback).
  function attachMp4LifecycleHandlers(video, playbackMode, opts = {}) {
    if (!video) return;
    // Update the latest-mode marker every call so the handler reads
    // the current value even if mode changed since the last bind.
    video._tt58PlaybackMode = playbackMode;
    // Phase 58 Wave 3: stamp boomerang src-swap targets only when
    // we're actually in boomerang mode. Wave 3.2: clear them when
    // mode is anything else so the cache-skip in getMediaVideoElement
    // doesn't preserve a stale reverse URL across mode changes.
    if (playbackMode === "boomerang") {
      if (opts.forwardSrc) video._tt58ForwardSrc = opts.forwardSrc;
      if (opts.reverseSrc) video._tt58ReverseSrc = opts.reverseSrc;
    } else {
      delete video._tt58ForwardSrc;
      delete video._tt58ReverseSrc;
    }
    if (video._tt58EndedBound) return;
    video._tt58EndedBound = true;
    video.addEventListener("ended", () => {
      const currentMode = video._tt58PlaybackMode || "loop";
      if (currentMode === "loop") return;
      if (currentMode === "boomerang") {
        // Phase 58 Wave 3: ping-pong between forward and reverse
        // cached sources. The src-swap incurs a brief load+play
        // stall (~50-300ms) — the Phase 57 fallback canvas bridges
        // this window so the operator sees the last good frame
        // instead of black.
        const forward = video._tt58ForwardSrc;
        const reverse = video._tt58ReverseSrc;
        // Phase 58 Wave 3.7t: forward === reverse means
        // resolveMp4AssetUrlForDirection could not produce a reverse
        // variant (asset outside /resources/animations/ or non-.mp4) —
        // boomerang silently degrades to loop semantics. Permanent warn
        // (once per element) so the degrade is diagnosable in the field.
        const degraded = !forward || !reverse || forward === reverse;
        if (degraded) {
          if (!video._tt58BoomerangDegradedWarned) {
            video._tt58BoomerangDegradedWarned = true;
            console.warn("[58] boomerang-degraded", JSON.stringify({
              forward: forward || null,
              reverse: reverse || null,
            }));
          }
          // No reverse cached — fall back to loop semantics
          // (re-seek to start, play forward).
          try { video.currentTime = 0; video.play().catch(() => undefined); } catch { /* ignore */ }
          return;
        }
        // Phase 58 Wave 3.7t: determine the CURRENT leg's direction by
        // ROUTE (/api/animation-reverse), not by exact URL equality with
        // _tt58ForwardSrc. The adaptive quality tier (v1.2.19) re-stamps
        // _tt58ForwardSrc/_tt58ReverseSrc with proxy variants mid-leg;
        // an exact compare against the re-stamped forward URL would then
        // misclassify the playing full-tier forward leg as "not forward"
        // and replay forward instead of ping-ponging. Route-based
        // detection keeps the ping-pong correct AND adopts the new tier
        // at this EOS swap (documented choice: tier changes apply at the
        // next leg boundary, never mid-leg — no src fight).
        const currentIsReverse = /\/api\/animation-reverse\b/.test(String(video.src));
        const next = currentIsReverse ? forward : reverse;
        try {
          video.src = next;
          video.currentTime = 0;
          void video.play().catch(() => undefined);
        } catch { /* ignore */ }
        return;
      }
      // play-once-disappear, play-then-freeze: pause-at-end so the
      // canvas continues painting the final frame. The actual cleanup
      // (removing the running animation instance) for
      // play-once-disappear is dispatched by the draw loop via
      // maybeDispatchPlaybackCleanup, which has the animation id in
      // scope.
      try { video.pause(); } catch { /* ignore */ }
    });
  }

  // Phase 58 Wave 2.5: render-driven cleanup dispatcher. Called from
  // the draw loop AFTER painting the animation. For
  // play-once-disappear, when the underlying media has finished
  // (mp4 video.ended OR gif cursor past totalDurationMs), emit
  // stopAnimation exactly once so the running list cleans up.
  // Idempotency via animation._endedDispatched flag on the instance.
  function maybeDispatchPlaybackCleanup(animation, mediaSignals) {
    if (!ctx || !animation || animation._endedDispatched) return;
    const mode = animation.playbackMode || "loop";
    if (mode !== "play-once-disappear") return;
    if (mode === "play-once-disappear" && !mediaSignals?.hasReachedEnd) return;
    animation._endedDispatched = true;
    // stopAnimation handles role-aware dispatch (CONTROL emits via WS;
    // /output/ removes locally + also emits). Server-side stop-pending
    // dedup catches races between multiple clients observing ended at
    // slightly different times.
    try {
      if (typeof ctx.stopAnimation === "function") {
        ctx.stopAnimation(animation.id);
      }
    } catch (err) {
      // Defensive — don't break the draw loop on cleanup failures.
      console.warn("[58] cleanup dispatch failed", err);
    }
  }

  // Phase 58 Wave 3.4: phase transition handler for play-then-freeze +
  // reverse-on-retrigger. Called from the draw loop after each render
  // tick; observes video.ended and advances the instance's
  // playbackPhase based on the configured onRetrigger sub-option.
  //
  // State machine for play-then-freeze:
  //   forward (active)        --(ended)-->  frozen-last
  //   reverse (active)        --(ended)-->  frozen-first         (reverse-then-freeze-first)
  //   reverse (active)        --(ended)-->  disappear(stop)      (reverse-then-disappear)
  //   frozen-last  --(operator re-trigger)-->  reverse           (handled by upsertGlobalAnimation)
  //   frozen-first --(operator re-trigger)-->  forward           (handled by upsertGlobalAnimation)
  //
  // Idempotency: only transitions when the phase is an active phase
  // AND video.ended is true. After transition, the new phase is
  // frozen-* (or removed) so subsequent calls are no-ops.
  // Phase 58 Wave 3.7i: optional third param `playbackState` — at the
  // moment of freezing, the last decoded frame is still good, so this
  // is the ideal point to make sure the fallback canvas holds the
  // freeze frame. captureRoomMp4FallbackFrame's ended-guard makes the
  // call a no-op when a good fallback already exists (the common case:
  // rVFC captured the final decoded frame during playback).
  function _logPhaseTransition(animation, video, from, to) {
    console.warn("[58] phase", JSON.stringify({
      id: animation?.id ?? null,
      from,
      to,
      ct: Number((Number(video?.currentTime) || 0).toFixed(2)),
      dur: Number((Number(video?.duration) || 0).toFixed(2)),
    }));
  }

  function maybeTransitionPlaybackPhase(animation, video, playbackState = null) {
    if (!ctx || !animation || !video) return;
    if (!video.ended) return;
    // Phase 58 Wave 3.7c (2026-06-05): HTML spec — after video.load(),
    // the resource-selection reset is queued as a task, so video.ended
    // remains `true` for a microtask window observable by synchronous
    // callers. Without the cross-check below, the very rAF that swapped
    // src forward→reverse triggers a spurious phase transition (e.g.
    // reverse→frozen-first) BEFORE the reverse playback even started
    // → operator UAT "trotz reverse on re-trigger verschwindet das Bild".
    // Require currentTime to actually be near duration before treating
    // `ended` as legitimate; right after load() currentTime is 0.
    const durationSec = Number(video.duration);
    const currentSec = Number(video.currentTime);
    if (
      !Number.isFinite(durationSec)
      || durationSec <= 0
      || !Number.isFinite(currentSec)
      || currentSec < durationSec - 0.5
    ) {
      return;
    }
    const mode = animation.playbackMode || "loop";
    if (mode !== "play-then-freeze") return;
    const phase = animation.playbackPhase || "forward";
    const onRet = animation.onRetrigger || "instant-disappear";
    if (phase === "forward") {
      animation.playbackPhase = "frozen-last";
      _logPhaseTransition(animation, video, "forward", "frozen-last");
      if (playbackState) {
        try { captureRoomMp4FallbackFrame(playbackState, video); } catch { /* defensive */ }
      }
      return;
    }
    if (phase === "reverse") {
      if (onRet === "reverse-then-freeze-first") {
        animation.playbackPhase = "frozen-first";
        _logPhaseTransition(animation, video, "reverse", "frozen-first");
        if (playbackState) {
          try { captureRoomMp4FallbackFrame(playbackState, video); } catch { /* defensive */ }
        }
      } else if (onRet === "reverse-then-disappear") {
        if (!animation._endedDispatched) {
          animation._endedDispatched = true;
          _logPhaseTransition(animation, video, "reverse", "disappear");
          try {
            if (typeof ctx.stopAnimation === "function") {
              ctx.stopAnimation(animation.id);
            }
          } catch (err) {
            console.warn("[58] reverse-then-disappear dispatch failed", err);
          }
        }
      } else {
        // onRet === "instant-disappear" but somehow phase = reverse.
        // Defensive: treat as frozen-last to avoid getting stuck.
        animation.playbackPhase = "frozen-last";
        _logPhaseTransition(animation, video, "reverse", "frozen-last");
      }
    }
  }

  // Phase 58 Wave 3.7p: gif-equivalent of maybeTransitionPlaybackPhase.
  // The gif render path is timeline-based (no <video>, no `ended`), so
  // EOS is "the scaled timeline cursor passed the decoded gif's total
  // duration". Called from the draw loop's room-gif branch each frame
  // with the SAME elapsedScaledSec the frame resolver consumes, so the
  // transition fires exactly when the cursor clamps at the boundary.
  //
  // State machine (identical to the mp4 one):
  //   forward (active)  --(cursor >= total)-->  frozen-last
  //   reverse (active)  --(cursor reaches 0)--> frozen-first         (reverse-then-freeze-first)
  //   reverse (active)  --(cursor reaches 0)--> disappear(stop)      (reverse-then-disappear)
  //   frozen-*          --(operator re-trigger)--> reverse/forward   (runtime-room-dispatch.js)
  //
  // Idempotency: frozen-* phases return immediately; the disappear
  // branch is guarded by animation._endedDispatched (mirrors mp4).
  function maybeTransitionGifPlaybackPhase(animation, { totalDurationSec = 0, elapsedScaledSec = 0 } = {}) {
    if (!ctx || !animation) return;
    const mode = animation.playbackMode || "loop";
    if (mode !== "play-then-freeze") return;
    // Gif not decoded yet (duration unknown) — can't judge EOS.
    if (!Number.isFinite(totalDurationSec) || totalDurationSec <= 0) return;
    const phase = animation.playbackPhase || "forward";
    if (phase !== "forward" && phase !== "reverse") return; // frozen-* are terminal until re-trigger
    if (!Number.isFinite(elapsedScaledSec) || elapsedScaledSec < totalDurationSec) return;
    // Synthetic "video" for the shared [58] phase log: ct/dur carry the
    // gif timeline cursor + total duration so the log stays grep-able
    // in the same shape as the mp4 transitions.
    const timelineForLog = { currentTime: elapsedScaledSec, duration: totalDurationSec };
    if (phase === "forward") {
      animation.playbackPhase = "frozen-last";
      _logPhaseTransition(animation, timelineForLog, "forward", "frozen-last");
      return;
    }
    // phase === "reverse"
    const onRet = animation.onRetrigger || "instant-disappear";
    if (onRet === "reverse-then-freeze-first") {
      animation.playbackPhase = "frozen-first";
      _logPhaseTransition(animation, timelineForLog, "reverse", "frozen-first");
    } else if (onRet === "reverse-then-disappear") {
      if (!animation._endedDispatched) {
        animation._endedDispatched = true;
        _logPhaseTransition(animation, timelineForLog, "reverse", "disappear");
        try {
          if (typeof ctx.stopAnimation === "function") {
            ctx.stopAnimation(animation.id);
          }
        } catch (err) {
          console.warn("[58] gif reverse-then-disappear dispatch failed", err);
        }
      }
    } else {
      // onRet === "instant-disappear" but somehow phase = reverse.
      // Defensive: treat as frozen-last to avoid getting stuck (same
      // fallback as the mp4 machine).
      animation.playbackPhase = "frozen-last";
      _logPhaseTransition(animation, timelineForLog, "reverse", "frozen-last");
    }
  }

  function maybeWrapRoomMp4Loop(video, state) {
    if (!video || !state || video.seeking) return;
    // Phase 58: only explicit "loop" keeps the seam-preventing wrap.
    // Boomerang needs natural EOS so the lifecycle handler src-swaps;
    // non-loop modes need it so the freeze / cleanup take effect.
    if (state.playbackMode && state.playbackMode !== "loop") return;
    const durationSec = Number(video.duration);
    const currentTime = Number(video.currentTime);
    if (!Number.isFinite(durationSec) || durationSec <= 0 || !Number.isFinite(currentTime)) return;
    const loopStartSec = getOutsideMp4LoopStartTime(durationSec);
    const loopLeadSec = Math.min(
      Math.max(0.03, OUTSIDE_MP4_LOOP_WRAP_LEAD_SEC),
      Math.max(0.04, durationSec * 0.25),
    );
    if (durationSec <= loopStartSec + loopLeadSec) return;
    const nowMs = performance.now();
    if (nowMs - Number(state.lastLoopWrapAtMs || 0) < OUTSIDE_MP4_LOOP_WRAP_COOLDOWN_MS) return;
    if (currentTime < durationSec - loopLeadSec) return;
    try {
      video.currentTime = loopStartSec;
      state.lastLoopWrapAtMs = nowMs;
    } catch {
      // ignore transient seek errors near loop boundary
    }
  }

  function _bindRoomMp4FrameCallback(video, state) {
    // Phase 58 Wave 3.7h (2026-06-05): bind per (state, video-element)
    // PAIR — see bindOutsideMp4FrameCallback comment. A new video
    // element under a preserved/stale state must always re-bind.
    if (!video || !state || state._rvfcBoundVideo === video) return;
    if (typeof video.requestVideoFrameCallback !== "function") return;
    state.videoFrameCallbackBound = true;
    state._rvfcBoundVideo = video;
    const onFrame = (_t, metadata) => {
      // Phase 58 Wave 3.7h: freshness stamp for isRvfcFresh.
      state._lastRvfcFireAtMs = performance.now();
      state.lastDecodedFrameAtMs = performance.now();
      state.hasVisibleFrame = true;
      // Phase 57 diag: count rVFC decode events for instrumentation
      state._decodedFrameCount = (state._decodedFrameCount || 0) + 1;
      if (metadata && typeof metadata.mediaTime === "number") {
        state._lastMediaTime = metadata.mediaTime;
      }
      if (metadata && typeof metadata.presentedFrames === "number") {
        state._lastPresentedFrames = metadata.presentedFrames;
      }
      // Phase 57 v1.1.7 (2026-06-02): Bug A — eagerly capture the
      // fallback canvas on every rVFC fire (see bindOutsideMp4Frame-
      // Callback comment for full rationale). Ensures fallback is
      // always non-null after the first decoded frame, preventing the
      // operator-visible black-flash strobe when overlaying mp4s.
      try {
        captureRoomMp4FallbackFrame(state, video);
      } catch {
        // canvas surface may be transiently unavailable during teardown
      }
      video.requestVideoFrameCallback(onFrame);
    };
    video.requestVideoFrameCallback(onFrame);
  }

  function ensureRoomMp4Playback(video, { assetRef = "", targetRate = 1, playbackMode = "loop", boomerangForwardSrc = null, boomerangReverseSrc = null, instanceId = "", expectedSrcUrl = "", playbackPhase = "" } = {}) {
    if (!video) return null;
    // Phase 58 Wave 3.6: composite per-instance key — see _roomMp4Key.
    const key = _roomMp4Key(assetRef, instanceId, playbackMode);
    const previous = roomMp4PlaybackStateByKey.get(key) ?? null;
    // Phase 58 Wave 3.6: phase transitions (forward → reverse on
    // re-trigger; reverse → forward) swap video.src in-place INSTEAD
    // of creating a new playback state under a different cache key.
    // Keeping the same playback state preserves the fallback canvas
    // so during the brief reverse-URL fetch window the operator
    // sees the last forward frame instead of an unpainted region
    // (operator UAT 2026-06-05: "es verschwindet direkt").
    // Phase 58 Wave 3.7: track whether the in-place src swap fired this
    // tick. After video.load() the resource selection task is queued
    // async; video.ended remains true for a microtask window. Without
    // this flag the isFrozenAtEnd gate below would skip play() on the
    // very tick that swapped to the reverse URL → reverse never started
    // → operator reported "verschwindet" instead of reverse playback
    // (operator UAT 2026-06-05, post-v1.2.7).
    let srcWasSwapped = false;
    // Phase 58 Wave 3.7i: gate + hash-insensitive compare — see
    // ensureOutsideMp4Playback comment. Without the mode gate, the
    // Phase 28 hash-bust and this swap round-tripped video.src every
    // rAF for loop-mode room mp4s with a manifest hash (readyState
    // pinned at 0 → mp4 never played; pre-existing on v1.2.14).
    // Phase 58 Wave 3.7t (2026-06-06): boomerang excluded too — it owns
    // its src via the EOS ping-pong; this swap (expectedSrcUrl is always
    // the forward URL for boomerang, which has no playbackPhase) killed
    // the reverse leg one rAF after the ended handler started it →
    // boomerang degenerated to loop (see ensureOutsideMp4Playback).
    if (expectedSrcUrl && playbackMode !== "loop" && playbackMode !== "boomerang") {
      try {
        const desiredAbs = new URL(expectedSrcUrl, window.location.href).href;
        if (video.src && !_srcEqualsIgnoringHash(video.src, desiredAbs)) {
          const fromSrc = String(video.src).replace(window.location.origin, "");
          // Phase 58 Wave 3.7n: distinguish DIRECTION swaps (forward ⇄
          // reverse phase transitions — playback restarts at 0 by
          // design) from QUALITY-ONLY swaps (same direction, adaptive
          // tier change full ⇄ proxy480 — playback position must be
          // PRESERVED so the operator sees no restart). Direction is
          // identified by the /api/animation-reverse route; the tier
          // only changes the height query param / proxy route.
          const currentIsReverse = /\/api\/animation-reverse\b/.test(String(video.src));
          const desiredIsReverse = /\/api\/animation-reverse\b/.test(desiredAbs);
          const isQualityOnlySwap = currentIsReverse === desiredIsReverse;
          if (isQualityOnlySwap) {
            const resumeAtSec = Math.max(0, Number(video.currentTime) || 0);
            const wasPlaying = !video.paused && !video.ended;
            video.src = expectedSrcUrl;
            try { video.load(); } catch { /* harmless */ }
            video.addEventListener("loadedmetadata", () => {
              try {
                const durationSec = Number(video.duration);
                video.currentTime = Number.isFinite(durationSec) && durationSec > 0
                  ? Math.min(resumeAtSec, Math.max(0, durationSec - 0.05))
                  : resumeAtSec;
              } catch { /* DOM may reject */ }
              if (wasPlaying) void video.play().catch(() => undefined);
            }, { once: true });
            srcWasSwapped = true;
            // Phase 58 Wave 3.7n: permanent diagnostic — quality swaps
            // only happen on adaptive tier changes, low freq.
            console.warn("[58] quality-swap", JSON.stringify({
              instanceId,
              from: fromSrc,
              to: String(expectedSrcUrl).replace(window.location.origin, ""),
              resumeAtSec: Number(resumeAtSec.toFixed(2)),
            }));
          } else {
            video.src = expectedSrcUrl;
            try { video.currentTime = 0; } catch { /* DOM may reject */ }
            try { video.load(); } catch { /* harmless */ }
            srcWasSwapped = true;
            // Phase 58 Wave 3.7i: permanent diagnostic — src swaps only
            // happen on phase transitions (forward<->reverse), low freq.
            console.warn("[58] src-swap", JSON.stringify({
              instanceId,
              from: fromSrc,
              to: String(expectedSrcUrl).replace(window.location.origin, ""),
              phase: playbackPhase || null,
            }));
          }
        }
      } catch { /* defensive */ }
    }
    // Manual-wrap mode: native loop attribute OFF so maybeWrapRoomMp4Loop
    // can preempt the seam-producing native EOS reset.
    // Phase 58: stamp playbackMode on the playback state so
    // maybeWrapRoomMp4Loop can skip the wrap for non-loop modes (the
    // wrap would re-seek to start and prevent the freeze-at-end
    // behavior).
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    attachMp4LifecycleHandlers(video, playbackMode, {
      forwardSrc: boomerangForwardSrc,
      reverseSrc: boomerangReverseSrc,
    });
    if (Math.abs((Number(video.defaultPlaybackRate) || 1) - targetRate) > 0.01) {
      video.defaultPlaybackRate = targetRate;
    }
    if (Math.abs((Number(video.playbackRate) || 1) - targetRate) > 0.01) {
      video.playbackRate = targetRate;
    }
    if (!previous) {
      const durationSec = Number(video.duration);
      if (Number.isFinite(durationSec) && durationSec > 0) {
        try { video.currentTime = getOutsideMp4LoopStartTime(durationSec); } catch { /* ignore */ }
      }
    }
    // Phase 58 Wave 3.1: same instance-id reset + EOS-pause guard as
    // ensureOutsideMp4Playback (see comments there).
    // Phase 58 Wave 3.7l (2026-06-05): loop mode is EXEMPT from the
    // instance-change rewind. Loop-mode rooms share ONE per-path video
    // element (getMediaVideoElement keeps the legacy shared cache so
    // identical content stays in sync across targets), so with N>1
    // rooms on the same asset each room's per-frame ensure call saw a
    // DIFFERENT instanceId on the shared element and rewound
    // currentTime=0 every frame — the video could never advance
    // (multi-room same-asset loop playback was stuck at frame 0,
    // showing only fallback stills/black). The Wave 3.1 rewind exists
    // to restart per-INSTANCE videos (non-loop modes) when a new
    // animation instance adopts a cached element; for the shared loop
    // element a restart is wrong by design.
    if (instanceId && playbackMode !== "loop" && video._tt58InstanceId !== instanceId) {
      video._tt58InstanceId = instanceId;
      try { video.currentTime = 0; } catch { /* DOM may reject */ }
    }
    // Phase 58 Wave 3.7t: boomerang included — see the matching comment
    // in ensureOutsideMp4Playback (the EOS ping-pong handler owns the
    // restart; ensure must not race it with a play() on the ended video).
    const isFrozenAtEnd = !srcWasSwapped
      && video.ended === true
      && (playbackMode === "play-once-disappear" || playbackMode === "play-then-freeze" || playbackMode === "boomerang");
    if (!isFrozenAtEnd && video.paused) {
      void video.play().catch((err) => {
        if (window.TT_DEBUG_58) {
          console.warn("[58-diag] play() rejected", { instanceId, src: video.src, msg: err?.message });
        }
      });
    }
    // Phase 58 Wave 3.7 (diag): instrument the room-mp4 playback path
    // behind window.TT_DEBUG_58 so the operator can paste console
    // output for forensic analysis. Throttled to once per second per
    // video element to keep the output legible.
    if (window.TT_DEBUG_58) {
      const nowMs = performance.now();
      const lastLog = Number(video._tt58LastDiagLogMs || 0);
      if (srcWasSwapped || nowMs - lastLog > 1000) {
        video._tt58LastDiagLogMs = nowMs;
        console.warn("[58-diag] room", {
          instanceId,
          mode: playbackMode,
          src: video.src.replace(window.location.origin, ""),
          expectedSrc: expectedSrcUrl,
          swapped: srcWasSwapped,
          ended: video.ended,
          paused: video.paused,
          readyState: video.readyState,
          curTime: Number(video.currentTime.toFixed(2)),
          duration: Number((video.duration || 0).toFixed(2)),
          videoWidth: video.videoWidth,
        });
      }
    }
    const state = previous ?? {
      key,
      fallbackCanvas: null,
      fallbackCtx: null,
      lastVisibleFrameAtMs: 0,
      lastDecodedFrameAtMs: 0,
      lastLoopWrapAtMs: 0,
      videoFrameCallbackBound: false,
      hasVisibleFrame: false,
    };
    // Phase 58: stamp the mode so maybeWrapRoomMp4Loop can branch.
    state.playbackMode = playbackMode;
    _bindRoomMp4FrameCallback(video, state);
    // Phase 57 diag stash
    state._videoForDiag = video;
    roomMp4PlaybackStateByKey.set(key, state);
    return state;
  }

  // Phase 57 diag: record one paint event for instrumentation. Outcome is
  // one of "live" (drew live decoded frame), "fallback" (drew stale
  // fallback canvas), "gated-out" (skipped paint entirely), "stale"
  // (drew live frame even though no new decoded frame since last paint),
  // "no-frame" (decoder not ready / seeking). Emits a single console
  // line every ~1000ms when window.TT_MP4_DIAG is truthy.
  function recordMp4PaintDiag(playbackState, label, outcome) {
    if (!playbackState) return;
    const diag = playbackState._diag || (playbackState._diag = {
      windowStartMs: performance.now(),
      paints: { live: 0, fallback: 0, "gated-out": 0, stale: 0, "no-frame": 0 },
      rafTicks: 0,
      decodedAtStart: Number(playbackState._decodedFrameCount || 0),
      lastDecodedSeenForPaint: Number(playbackState._decodedFrameCount || 0),
    });
    diag.rafTicks += 1;
    const decodedNow = Number(playbackState._decodedFrameCount || 0);
    // detect stale-live paint: outcome=="live" but no NEW decoded frame
    // since the previous live paint
    if (outcome === "live") {
      if (decodedNow <= diag.lastDecodedSeenForPaint) {
        outcome = "stale";
      }
      diag.lastDecodedSeenForPaint = decodedNow;
    }
    diag.paints[outcome] = (diag.paints[outcome] || 0) + 1;

    const nowMs = performance.now();
    const elapsed = nowMs - diag.windowStartMs;
    // Diag gate: explicit window.TT_MP4_DIAG flag OR ?mp4diag=1 URL query
    const diagOn = typeof window !== "undefined" && (
      window.TT_MP4_DIAG === true
      || (typeof window.location !== "undefined" && /[?&]mp4diag=1\b/.test(String(window.location.search || "")))
    );
    if (elapsed >= 1000 && diagOn) {
      const decodedDelta = decodedNow - diag.decodedAtStart;
      const totalPaints = diag.paints.live + diag.paints.fallback + diag.paints["gated-out"] + diag.paints.stale + diag.paints["no-frame"];
      // Snapshot Chromium decoder stats (when available) to expose
      // whether the source mp4's 30fps is being decoded fully or the
      // pipeline is dropping frames upstream of our paint code.
      let vpq = null;
      try {
        // _videoForDiag is stashed by callers; safe-guard if missing
        const vid = playbackState._videoForDiag;
        if (vid && typeof vid.getVideoPlaybackQuality === "function") {
          const q = vid.getVideoPlaybackQuality();
          if (!diag._lastVpq) diag._lastVpq = q;
          const totalDelta = (Number(q.totalVideoFrames) || 0) - (Number(diag._lastVpq.totalVideoFrames) || 0);
          const droppedDelta = (Number(q.droppedVideoFrames) || 0) - (Number(diag._lastVpq.droppedVideoFrames) || 0);
          vpq = {
            totalFps: Math.round((totalDelta * 1000) / elapsed),
            droppedFps: Math.round((droppedDelta * 1000) / elapsed),
            playbackRate: Number(vid.playbackRate) || 1,
            currentTime: Number(vid.currentTime) || 0,
            duration: Number(vid.duration) || 0,
            readyState: Number(vid.readyState) || 0,
          };
          diag._lastVpq = q;
        }
      } catch (_) { /* ignore */ }
      // eslint-disable-next-line no-console
      console.log(`[mp4-diag] ${label}`, JSON.stringify({
        windowMs: Math.round(elapsed),
        rafTicks: diag.rafTicks,
        decoded: decodedDelta,
        decodeFps: Math.round((decodedDelta * 1000) / elapsed),
        paints: diag.paints,
        paintTotal: totalPaints,
        live: diag.paints.live,
        stale: diag.paints.stale,
        gatedOut: diag.paints["gated-out"],
        fallback: diag.paints.fallback,
        noFrame: diag.paints["no-frame"],
        vpq,
      }));
      // reset window
      diag.windowStartMs = nowMs;
      diag.paints = { live: 0, fallback: 0, "gated-out": 0, stale: 0, "no-frame": 0 };
      diag.rafTicks = 0;
      diag.decodedAtStart = decodedNow;
    }
  }

  window.TT_BEAMER_RUNTIME_OUTSIDE_MP4 = {
    init,
    getOutsideVideoElement,
    getRoomVideoElement,
    prewarmBoardOutsideMp4Asset,
    clearOutsideMp4PlaybackState,
    clearOutsideTimelineState,
    buildOutsideLifecycleKey,
    resolveOutsideElapsedSeconds,
    getOutsideMp4LoopStartTime,
    ensureOutsideMp4FallbackCanvas,
    captureOutsideMp4FallbackFrame,
    drawOutsideMp4FallbackFrame,
    maybeWrapOutsideMp4Loop,
    bindOutsideMp4FrameCallback,
    shouldDrawOutsideMp4Now,
    // Phase 57 v1.1.5 (2026-06-02) — rVFC-driven paint gates
    hasNewDecodedFrame,
    markMp4FramePainted,
    // Phase 58 Wave 3.7h (2026-06-05) — rVFC delivery freshness gate
    isRvfcFresh,
    ensureOutsideMp4Playback,
    // Phase 58 Wave 2.5: render-driven cleanup
    maybeDispatchPlaybackCleanup,
    // Phase 58 Wave 3.4: playback phase transitions on EOS
    maybeTransitionPlaybackPhase,
    maybeTransitionGifPlaybackPhase,
    // Phase 58 Wave 3: pick forward or reverse cached URL for mp4
    resolveMp4AssetUrlForDirection,
    // Phase 58 Wave 3.7n: adaptive video quality — tier applied to a
    // video element's current src (full | proxy480)
    getAppliedVideoQualityTier,
    // Phase 58 Wave 3.2: per-instance video element cleanup
    releaseMp4VideoElementsForInstance,
    // Room MP4 seam machinery (Phase 50 2026-05-25)
    ensureRoomMp4Playback,
    maybeWrapRoomMp4Loop,
    captureRoomMp4FallbackFrame,
    getRoomMp4FallbackSource,
    getFrozenScaledBitmap,
    // Phase 57 diag (2026-06-02) — instrumentation only, gated on window.TT_MP4_DIAG
    recordMp4PaintDiag,
  };
})();
