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

  function getMediaVideoElement(cacheMap, path) {
    const normalizedPath = String(path || "").trim();
    if (!normalizedPath) {
      return null;
    }
    // Phase 28 B5: resolve the hash-suffixed URL. Map key stays as the raw
    // `normalizedPath` so the asset-picker delete logic and the rest of the
    // render layer continue to find cache entries by canonical path. Only
    // `<video>.src` gets the `?v=<hash>` suffix.
    const resolveHashUrl = () =>
      window.TT_BEAMER_RUNTIME_ASSET_MANIFEST?.resolveAssetUrlWithHash?.(normalizedPath) ?? normalizedPath;
    if (!cacheMap.has(normalizedPath)) {
      const video = document.createElement("video");
      video.src = resolveHashUrl();
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      video.muted = true;
      video.loop = false;
      video.playsInline = true;
      cacheMap.set(normalizedPath, {
        status: "loading",
        video,
        durationSec: null,
      });
      const entry = cacheMap.get(normalizedPath);
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
      const entry = cacheMap.get(normalizedPath);
      const video = entry?.video;
      if (video) {
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
    return cacheMap.get(normalizedPath) ?? null;
  }

  function getOutsideVideoElement(path) {
    return getMediaVideoElement(outsideVideoCacheByPath, path);
  }

  function getRoomVideoElement(path) {
    return getMediaVideoElement(roomVideoCacheByPath, path);
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
    if (!video || !playbackState || playbackState.videoFrameCallbackBound) {
      return;
    }
    if (typeof video.requestVideoFrameCallback !== "function") {
      return;
    }
    playbackState.videoFrameCallbackBound = true;
    const onVideoFrame = (_t, metadata) => {
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

  // Phase 57 v1.1.5 (2026-06-02): stamp the decoded-frame counter on
  // the playback state AFTER a successful live paint so the next
  // hasNewDecodedFrame() call returns false until rVFC fires again.
  function markMp4FramePainted(playbackState) {
    if (!playbackState) return;
    playbackState._lastPaintedDecodedCount = Number(playbackState._decodedFrameCount || 0);
    playbackState.lastDrawAtMs = performance.now();
  }

  function ensureOutsideMp4Playback(video, { boardId, lifecycleKey = "", assetRef = "", targetRate = 1 } = {}) {
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

    video.loop = true;
    video.muted = true;
    video.playsInline = true;

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

    if (video.paused || didLifecycleChange) {
      void video.play().catch(() => undefined);
    }

    const previousHasVisibleFrame = previous?.assetRef === normalizedAssetRef
      ? Boolean(previous?.hasVisibleFrame)
      : false;
    const playbackState = {
      lifecycleKey: normalizedLifecycleKey,
      assetRef: normalizedAssetRef,
      fallbackCanvas: previous?.fallbackCanvas ?? null,
      fallbackCtx: previous?.fallbackCtx ?? null,
      lastVisibleFrameAtMs: previous?.lastVisibleFrameAtMs ?? 0,
      lastDecodedFrameAtMs: previous?.lastDecodedFrameAtMs ?? 0,
      lastLoopWrapAtMs: previous?.lastLoopWrapAtMs ?? 0,
      lastDrawAtMs: previous?.lastDrawAtMs ?? 0,
      videoFrameCallbackBound: previous?.videoFrameCallbackBound ?? false,
      hasVisibleFrame: previousHasVisibleFrame,
    };
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

  function _roomMp4Key(assetRef) {
    return String(assetRef || "").trim() || "?";
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
    const ready = _ensureRoomMp4FallbackCanvas(state, video);
    if (!ready) return;
    state.fallbackCtx.clearRect(0, 0, state.fallbackCanvas.width, state.fallbackCanvas.height);
    state.fallbackCtx.drawImage(video, 0, 0, state.fallbackCanvas.width, state.fallbackCanvas.height);
    state.lastVisibleFrameAtMs = performance.now();
    state.lastDecodedFrameAtMs = state.lastVisibleFrameAtMs;
    state.hasVisibleFrame = true;
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

  function maybeWrapRoomMp4Loop(video, state) {
    if (!video || !state || video.seeking) return;
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
    if (!video || !state || state.videoFrameCallbackBound) return;
    if (typeof video.requestVideoFrameCallback !== "function") return;
    state.videoFrameCallbackBound = true;
    const onFrame = (_t, metadata) => {
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

  function ensureRoomMp4Playback(video, { assetRef = "", targetRate = 1 } = {}) {
    if (!video) return null;
    const key = _roomMp4Key(assetRef);
    const previous = roomMp4PlaybackStateByKey.get(key) ?? null;
    // Manual-wrap mode: native loop attribute OFF so maybeWrapRoomMp4Loop
    // can preempt the seam-producing native EOS reset.
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
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
    if (video.paused) {
      void video.play().catch(() => undefined);
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
    ensureOutsideMp4Playback,
    // Room MP4 seam machinery (Phase 50 2026-05-25)
    ensureRoomMp4Playback,
    maybeWrapRoomMp4Loop,
    captureRoomMp4FallbackFrame,
    getRoomMp4FallbackSource,
    // Phase 57 diag (2026-06-02) — instrumentation only, gated on window.TT_MP4_DIAG
    recordMp4PaintDiag,
  };
})();
