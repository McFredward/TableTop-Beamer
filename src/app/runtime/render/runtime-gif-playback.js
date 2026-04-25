// GIF playback cache + frame getter module.
//
// Owns the decoded-frame cache (per gif path), the lazy-decode
// pipeline (ImageDecoder fast path + parser fallback via the
// runtime-gif-decoder module), the per-frame getter used by the
// draw loop, and the asset prewarming helpers.
//
// Dependencies injected via ctx:
//   state                             — runtime state (for error logging)
//   logRender                         — log channel
//   gifDecoder                        — window.TT_BEAMER_RUNTIME_GIF_DECODER
//   ROOM_GIF_ANIMATION_ASSETS         — room-gif path map
//   clampGifPlaybackSpeed             — helper
//   clampRoomOpacity                  — helper
(() => {
  let ctx = null;

  const gifPlaybackCacheByPath = new Map();

  function init(dependencies) {
    ctx = dependencies;
  }

  function getGifPlaybackCacheEntry(path) {
    if (!path) {
      return null;
    }
    if (!gifPlaybackCacheByPath.has(path)) {
      const entry = {
        status: "idle",
        frames: [],
        totalDurationMs: 0,
        error: null,
        promise: null,
      };
      gifPlaybackCacheByPath.set(path, entry);
    }
    return gifPlaybackCacheByPath.get(path) ?? null;
  }

  async function decodeGifPlaybackFrames(path, entry) {
    const response = await fetch(path, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`GIF fetch failed (${response.status})`);
    }
    const data = await response.arrayBuffer();
    if (ctx.gifDecoder.canDecodeGifFramesWithImageDecoder()) {
      const decoder = new ImageDecoder({ data, type: "image/gif" });
      await decoder.tracks.ready;
      const frameCount = Math.max(1, Number(decoder.tracks?.selectedTrack?.frameCount) || 1);
      const frames = [];
      let totalDurationMs = 0;
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        const { image } = await decoder.decode({ frameIndex });
        const durationMs = Math.max(16, Math.round((Number(image.duration) || 100000) / 1000));
        const bitmap = await createImageBitmap(image);
        image.close();
        frames.push({ bitmap, durationMs });
        totalDurationMs += durationMs;
      }
      decoder.close?.();
      entry.frames = frames;
      entry.totalDurationMs = Math.max(16, totalDurationMs);
      entry.status = "ready";
      entry.error = null;
      return;
    }

    ctx.gifDecoder.decodeGifPlaybackFramesWithParser(data, entry);
  }

  function ensureGifPlaybackReady(path) {
    const entry = getGifPlaybackCacheEntry(path);
    if (!entry) {
      return null;
    }
    if (entry.status === "ready" || entry.status === "loading") {
      return entry;
    }
    entry.status = "loading";
    entry.promise = decodeGifPlaybackFrames(path, entry)
      .catch((error) => {
        ctx.logRender.warn("gif_decode_failed", {
          event: "gif-decode-failed",
          boardId: ctx.state.boardId,
          path,
          error: String(error?.message || error),
        });
        entry.status = "fallback";
        entry.error = error;
      })
      .finally(() => {
        entry.promise = null;
      });
    return entry;
  }

  function getGifPlaybackFrame(path, elapsedSeconds) {
    const entry = ensureGifPlaybackReady(path);
    if (!entry || entry.status !== "ready" || entry.frames.length === 0) {
      return null;
    }
    const totalDurationMs = Math.max(16, entry.totalDurationMs || 0);
    let cursorMs = (((Number(elapsedSeconds) || 0) * 1000) % totalDurationMs + totalDurationMs) % totalDurationMs;
    for (const frame of entry.frames) {
      if (cursorMs < frame.durationMs) {
        return frame.bitmap;
      }
      cursorMs -= frame.durationMs;
    }
    return entry.frames[entry.frames.length - 1]?.bitmap ?? null;
  }

  function resolveRoomGifRenderConfig(type, age, intensity, options = {}) {
    const gifPath = options.gifAssetPath ?? ctx.ROOM_GIF_ANIMATION_ASSETS[type];
    const timelineAge = Number(options.gifTimelineAgeSec ?? age) || 0;
    const playbackSpeed = ctx.clampGifPlaybackSpeed(options.gifPlaybackSpeed ?? 1);
    return {
      frame: getGifPlaybackFrame(gifPath, timelineAge * playbackSpeed),
      opacity: ctx.clampRoomOpacity(options.opacity ?? intensity),
    };
  }

  function warmGifAssetPath(path, { reason = "runtime" } = {}) {
    if (!path) {
      return;
    }
    const warm = () => {
      ensureGifPlaybackReady(path);
    };
    if (typeof window.requestIdleCallback === "function" && reason !== "trigger") {
      window.requestIdleCallback(() => warm(), { timeout: 450 });
      return;
    }
    warm();
  }

  function warmRoomGifAssets({ reason = "runtime" } = {}) {
    for (const assetPath of Object.values(ctx.ROOM_GIF_ANIMATION_ASSETS)) {
      warmGifAssetPath(assetPath, { reason });
    }
  }

  window.TT_BEAMER_RUNTIME_GIF_PLAYBACK = {
    init,
    getGifPlaybackCacheEntry,
    ensureGifPlaybackReady,
    getGifPlaybackFrame,
    resolveRoomGifRenderConfig,
    warmGifAssetPath,
    warmRoomGifAssets,
  };
})();
