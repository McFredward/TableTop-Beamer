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
    // Phase 28 B5: append `?v=<hash>` to the network URL so a re-upload of the
    // same path (different bytes) bypasses (a) the browser HTTP cache and
    // (b) keeps the in-memory `gifPlaybackCacheByPath` Map keyed by the raw
    // `path` (so asset-picker delete logic still finds the right entry). The
    // resolver returns `path` unchanged when the manifest has no entry (e.g.
    // built-in `coded-effect.fallback` paths).
    const resolvedUrl = window.TT_BEAMER_RUNTIME_ASSET_MANIFEST?.resolveAssetUrlWithHash?.(path) ?? path;
    const response = await fetch(resolvedUrl, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`GIF fetch failed (${response.status})`);
    }
    const data = await response.arrayBuffer();
    // Pi/Chromium reports canDecodeGifFramesWithImageDecoder=true but
    // a specific GIF can still throw mid-decode (memory pressure on
    // large GIFs, malformed frames, transient decoder state). Without
    // a try/catch the failure left entry.status="fallback" and
    // getGifPlaybackFrame returned null forever for that GIF, even
    // though the parser path could have decoded it. Wrapping the
    // ImageDecoder block lets us fall through to the parser exactly
    // as if the API weren't available — the path is byte-identical
    // for the synchronous JS GIF parser.
    if (ctx.gifDecoder.canDecodeGifFramesWithImageDecoder()) {
      try {
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
      } catch (error) {
        ctx.logRender.warn("gif_image_decoder_failed_fallback_to_parser", {
          event: "gif-image-decoder-failed",
          path,
          error: String(error?.message || error),
        });
        // intentional fall-through to the parser branch below
      }
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
    // Phase 30 B2 Candidate B: "fallback" is no longer terminal. After a
    // backoff (default 1000ms, doubling per attempt up to 8000ms) we reset
    // to "idle" and re-attempt the decode. This addresses transient Pi
    // ImageDecoder failures under load (slime.gif 22 MB + concurrent
    // decodes) where the original Phase-26-h9 try/catch fell through to
    // the parser, but the parser ALSO failed under the same memory
    // pressure → entry stayed in "fallback" until page reload.
    if (entry.status === "fallback") {
      const now = Date.now();
      const lastAttemptAt = entry.lastFailureAt || 0;
      const attemptCount = entry.failureAttemptCount || 1;
      const backoffMs = Math.min(8000, 1000 * Math.pow(2, attemptCount - 1));
      if (now - lastAttemptAt < backoffMs) {
        return entry; // still in backoff window
      }
      // Reset to idle for a fresh attempt; preserve attemptCount so the
      // next failure backoff is longer.
      entry.status = "idle";
    }
    entry.status = "loading";
    // Phase 30 B2 Candidate C foundation: remember the URL the bytes were
    // decoded from so a manifest hash change can invalidate the cache.
    const resolvedUrlAtDecode =
      window.TT_BEAMER_RUNTIME_ASSET_MANIFEST?.resolveAssetUrlWithHash?.(path) ?? path;
    entry.decodedFromUrl = resolvedUrlAtDecode;
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
        entry.lastFailureAt = Date.now();
        entry.failureAttemptCount = (entry.failureAttemptCount || 0) + 1;
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

  // Phase 30 B2 Candidate A: serialized warm queue on /output/. Without
  // this, warmRoomGifAssets({reason: "startup"}) on Test-Board Nemesis
  // Lockdown Board A fired N concurrent ImageDecoder decodes (incl. the
  // 22 MB slime.gif), overwhelming Pi memory + decode slots. Some
  // decodes threw mid-stream; the parser fallback also failed under the
  // same pressure → entries ended up in `status="fallback"` with empty
  // frames. With Candidate B (fallback-retry) those would eventually
  // succeed, but serializing the queue avoids the failure in the first
  // place AND lets the retry-loop run with calm GPU memory state.
  let _outputWarmQueue = Promise.resolve();
  function _enqueueOutputWarm(path) {
    _outputWarmQueue = _outputWarmQueue
      .then(() => {
        const entry = ensureGifPlaybackReady(path);
        // Wait for the in-flight decode promise to settle (or null/sync
        // entries that don't have one — pass-through immediately).
        if (entry && entry.promise && typeof entry.promise.then === "function") {
          return entry.promise.catch(() => undefined);
        }
        return undefined;
      })
      .then(() => new Promise((resolve) => setTimeout(resolve, 200)))
      .catch(() => undefined);
  }

  function warmGifAssetPath(path, { reason = "runtime" } = {}) {
    if (!path) {
      return;
    }
    // /output/ on a Raspberry Pi reliably starves requestIdleCallback —
    // the page is busy decoding board image, mp4s, gifs, and starting
    // the WebSocket; the idle queue may not fire for seconds. That made
    // GIFs intermittently fail to play because the lazy on-demand decode
    // path inside getGifPlaybackFrame couldn't catch up before short
    // animations finished. On the final-output role we always warm
    // immediately. Dashboard keeps the idle deferral.
    const isFinalOutput = ctx.outputRole === ctx.OUTPUT_ROLE_FINAL;
    if (!isFinalOutput && typeof window.requestIdleCallback === "function" && reason !== "trigger") {
      window.requestIdleCallback(() => ensureGifPlaybackReady(path), { timeout: 450 });
      return;
    }
    // Phase 30 B2 Candidate A: on /output/, serialize warmup whenever
    // it is NOT a user-trigger event. This covers all three call sites
    // that exert N-concurrent-decode pressure on Pi /output/:
    //   - reason="startup": initial /output/ boot warmup
    //   - reason="board-switch": runtime-board-switch.js:117 invocation
    //   - reason="runtime"/other: live-sync runtime defaults reapply
    // Trigger-reason warms (user explicitly triggered an animation) bypass
    // the queue — they need to start ASAP and are by nature one-shot
    // (no concurrent-decode pressure).
    if (isFinalOutput && reason !== "trigger") {
      _enqueueOutputWarm(path);
      return;
    }
    ensureGifPlaybackReady(path);
  }

  function warmRoomGifAssets({ reason = "runtime" } = {}) {
    for (const assetPath of Object.values(ctx.ROOM_GIF_ANIMATION_ASSETS)) {
      warmGifAssetPath(assetPath, { reason });
    }
    // Also warm every per-board GIF definition currently in state.
    // ROOM_GIF_ANIMATION_ASSETS is the static fallback map; each board
    // can also have custom GIF animations defined in its roomFx
    // profile. Without warming those here, a GIF triggered from
    // dashboard for a board not yet rendered on /output/ would land in
    // the lazy-decode path where Pi timing makes frames intermittently
    // unavailable.
    if (typeof ctx.getBoards === "function") {
      try {
        for (const board of ctx.getBoards()) {
          const profile = ctx.state?.roomFxByBoard?.[board.id];
          const animations = Array.isArray(profile?.animations) ? profile.animations : [];
          for (const def of animations) {
            if (def?.assetType === "gif" && typeof def.assetRef === "string" && def.assetRef) {
              warmGifAssetPath(def.assetRef, { reason });
            }
          }
        }
      } catch {
        // never let warmup throw — render path is more important
      }
    }
  }

  /**
   * Phase 30 B2 Candidate C: invalidate the in-memory cache entry for a
   * given path so the next ensureGifPlaybackReady call re-decodes from
   * the freshly-uploaded bytes. Symmetric to the MP4 path at
   * runtime-outside-mp4.js:75-94 which already does this for <video>.src.
   *
   * Caller passes the new resolved URL (with `?v=<hash>`); we compare to
   * the entry's recorded `decodedFromUrl`. On mismatch we reset the entry
   * so the next ensureGifPlaybackReady triggers a fresh decode.
   */
  function invalidateGifCacheForPath(path) {
    const entry = getGifPlaybackCacheEntry(path);
    if (!entry) {
      return false;
    }
    const desiredUrl =
      window.TT_BEAMER_RUNTIME_ASSET_MANIFEST?.resolveAssetUrlWithHash?.(path) ?? path;
    if (entry.decodedFromUrl && entry.decodedFromUrl === desiredUrl) {
      return false; // bytes match; no invalidation needed
    }
    // Mismatch (or never decoded) → reset entry so next ensureGifPlaybackReady
    // re-decodes. Preserve the cache slot itself; downstream getGifPlaybackFrame
    // will return null while status is "idle" / "loading" — same as a fresh
    // unwarmed entry.
    entry.status = "idle";
    entry.frames = [];
    entry.totalDurationMs = 0;
    entry.error = null;
    entry.decodedFromUrl = null;
    entry.lastFailureAt = 0;
    entry.failureAttemptCount = 0;
    return true;
  }

  window.TT_BEAMER_RUNTIME_GIF_PLAYBACK = {
    init,
    getGifPlaybackCacheEntry,
    ensureGifPlaybackReady,
    getGifPlaybackFrame,
    resolveRoomGifRenderConfig,
    warmGifAssetPath,
    warmRoomGifAssets,
    invalidateGifCacheForPath,
  };
})();
