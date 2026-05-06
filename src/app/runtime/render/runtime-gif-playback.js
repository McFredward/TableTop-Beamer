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

  // Phase 30 B2 h8: GIF lifecycle probes. Diagnostic ground-truth for
  // Pi-side failures where GIFs don't start/stop. Logs only on /output/
  // (final-output role) and dedupes per (event:path:status) so the
  // console doesn't flood. Drop these tags after the issue is diagnosed.
  const _gifProbeLogged = new Set();
  function _gifProbe(event, payload = {}) {
    try {
      if (ctx?.outputRole !== ctx?.OUTPUT_ROLE_FINAL) return;
      const key = `${event}:${payload.path || ""}:${payload.status || ""}`;
      if (_gifProbeLogged.has(key)) return;
      _gifProbeLogged.add(key);
      // eslint-disable-next-line no-console
      console.log(`[h8-gif-probe] ${event}`, { ...payload, t: performance.now().toFixed(0) });
    } catch (_) { /* never let probe break render path */ }
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
    const _decodeStartedAt = performance.now();
    _gifProbe("decode-start", { path, attempt: entry?.failureAttemptCount || 0 });
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
    //
    // Phase 30 B2 h9: on /output/ ALWAYS use the parser path. The
    // ImageDecoder API allocates GPU-backed ImageBitmap per frame; on
    // Pi VC4 with large GIFs (slime.gif 22 MB ~150 frames × ~1 MB each
    // = ~150 MB GPU) the cumulative texture memory triggers
    // CONTEXT_LOST_WEBGL on the WebGL warp context — confirmed by user
    // UAT log showing the loss right after slime decode-start, with
    // subsequent "mesh-warp shader error: null" spam in the draw loop
    // and ALL further GIF decode promises hanging because the
    // ImageDecoder is killed by the context loss. The parser produces
    // canvas-backed frames in CPU memory: slower per frame but no GPU
    // pressure, so no context loss. Dashboard role keeps the
    // ImageDecoder fast path since dashboard doesn't have the WebGL
    // warp competing for GPU memory.
    const isFinalOutput = ctx.outputRole === ctx.OUTPUT_ROLE_FINAL;
    if (!isFinalOutput && ctx.gifDecoder.canDecodeGifFramesWithImageDecoder()) {
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
        _gifProbe("decode-success", {
          path,
          frames: frames.length,
          ms: Math.round(performance.now() - _decodeStartedAt),
        });
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

    // Parser path: always on /output/, fallback elsewhere. Parser is
    // ASYNC (Phase 30 B2 h11) so we await it. With
    // `yieldBetweenFrames=true` on /output/, the parser awaits
    // setTimeout(0) between frames — keeps the main thread responsive
    // and prevents Pi VC4 GPU driver from reaping the WebGL context
    // during long parses. Decoder sets entry.status="ready" on success.
    await ctx.gifDecoder.decodeGifPlaybackFramesWithParser(data, entry, {
      yieldBetweenFrames: isFinalOutput,
      // Phase 30 Plan 30-04 T11: skip the per-frame ImageBitmap
      // pre-bake on /output/. T9's bitmap path was great on
      // dashboard but on Pi VC4 the cumulative GPU allocation
      // (e.g. 150 frames × 512×288×4 = ~88 MB for slime) brought
      // back the CONTEXT_LOST_WEBGL pattern h10/h11 originally
      // closed. Falling back to the playback-canvas + putImageData
      // path keeps GIFs playable without GPU pressure; T7's
      // 512px-max-dim downsample makes the per-frame upload cheap.
      bakeImageBitmap: !isFinalOutput,
    });
    if (entry.status === "ready") {
      _gifProbe("decode-success", {
        path,
        frames: entry.frames.length,
        ms: Math.round(performance.now() - _decodeStartedAt),
        via: "parser",
      });
    }
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
        _gifProbe("decode-fail", { path, error: String(error?.message || error) });
        _gifProbe("status-fallback", { path, attempts: entry.failureAttemptCount });
      })
      .finally(() => {
        entry.promise = null;
      });
    return entry;
  }

  // Phase 30 B2 h10: shared playback canvas per cache entry. The parser
  // path stores frames as ImageData (CPU pixel buffers); the draw loop
  // needs a drawImage-compatible source. We allocate ONE 2D canvas per
  // GIF and putImageData on demand when the cursor advances to a new
  // frame index. Reduces the GPU-texture footprint from N-frames-per-GIF
  // (e.g. 150 for slime) to 1, which is what eliminated the
  // CONTEXT_LOST_WEBGL on Pi VC4 mid-decode.
  function _ensurePlaybackCanvas(entry) {
    if (entry._playbackCanvas) return entry._playbackCanvas;
    const w = entry.frameWidth || entry.frames[0]?.imageData?.width || 0;
    const h = entry.frameHeight || entry.frames[0]?.imageData?.height || 0;
    if (w <= 0 || h <= 0) return null;
    try {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      // Phase 30 B2 h12: GPU-backed playback canvas (default — no
      // willReadFrequently hint). h10's willReadFrequently:true
      // forced the canvas onto Chromium's CPU/software pipeline,
      // which made every per-frame `drawImage(playbackCanvas, …)`
      // onto the GPU-backed fx-canvas a CPU→GPU memcpy of the full
      // frame (~4-8 MB, ~30 ms on Pi VC4 PER active GIF). The
      // shared-canvas-per-GIF approach already addresses the
      // GPU-pressure concern (1 canvas vs 150) — willReadFrequently
      // was both unnecessary AND a major fps regression. Without it
      // putImageData costs more (CPU→GPU upload on frame change,
      // ~5 ms) but only fires when the cursor advances (typically
      // ≤30 Hz), while drawImage runs at full rAF rate (~60 Hz)
      // and is now a GPU→GPU blit.
      const cctx = c.getContext("2d");
      if (!cctx) return null;
      entry._playbackCanvas = c;
      entry._playbackCanvasCtx = cctx;
      entry._playbackCanvasFrameIndex = -1;
      return c;
    } catch (_) {
      return null;
    }
  }

  function _resolveFrameIndex(entry, elapsedSeconds) {
    const totalDurationMs = Math.max(16, entry.totalDurationMs || 0);
    let cursorMs =
      (((Number(elapsedSeconds) || 0) * 1000) % totalDurationMs + totalDurationMs) % totalDurationMs;
    for (let i = 0; i < entry.frames.length; i += 1) {
      const frame = entry.frames[i];
      if (cursorMs < frame.durationMs) return i;
      cursorMs -= frame.durationMs;
    }
    return entry.frames.length - 1;
  }

  function getGifPlaybackFrame(path, elapsedSeconds) {
    const entry = ensureGifPlaybackReady(path);
    if (!entry || entry.status !== "ready" || entry.frames.length === 0) {
      _gifProbe("trigger-null", { path, status: entry?.status || "missing" });
      return null;
    }
    const frameIdx = _resolveFrameIndex(entry, elapsedSeconds);
    const frame = entry.frames[frameIdx];
    if (!frame) return null;
    // ImageDecoder fast-path (dashboard only) stores `bitmap` —
    // ImageBitmap or HTMLCanvasElement, both directly drawable.
    if (frame.bitmap) return frame.bitmap;
    // Parser path (always on /output/, fallback elsewhere) stores
    // ImageData. Lazily blit into the shared playback canvas.
    if (frame.imageData) {
      const canvas = _ensurePlaybackCanvas(entry);
      if (!canvas) return null;
      if (entry._playbackCanvasFrameIndex !== frameIdx) {
        try {
          entry._playbackCanvasCtx.putImageData(frame.imageData, 0, 0);
          entry._playbackCanvasFrameIndex = frameIdx;
        } catch (_) {
          return null;
        }
      }
      return canvas;
    }
    return null;
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
  // Phase 30 Plan 30-04 T12: bumped 5000 → 30000. Pi VC4 parser
  // path takes 12-15 s for slime.gif (150 frames × 512×288 each
  // after T7 downsample). The original 5 s timeout fired during
  // decode, marked the entry "fallback", returned trigger-null,
  // then the actual decode resolved and flipped status="ready".
  // User-visible UX: animations "disappear and reappear" during
  // boot ("trying multiple modes"). 30 s easily covers parser
  // worst case; on the rare actual stall the queue still moves
  // on. Probe-tag "warm-timeout" is now exceptional, not routine.
  //
  // Phase 31 Plan 05 (Wave 5) — runtime-environment gate. Per
  // .planning/phases/phase-31/31-HOTFIX-AUDIT.md, T12 is `pi-only`:
  // the server-side SSR Chromium tab decodes the same GIFs in
  // <500 ms, so the original 5 s budget is more than sufficient and
  // surfaces real stalls earlier. ARM-UA defense-in-depth in
  // getRuntimeEnvironment clamps to "pi" on any ARM hardware
  // regardless of URL. Falls back to "pi" if the helper is missing
  // (Phase-30 behavior preserved).
  const __ttbEnv =
    (typeof window !== "undefined"
      && window.TT_BEAMER_RUNTIME_ENV?.getRuntimeEnvironment?.()) ?? "pi";
  const WARM_DECODE_TIMEOUT_MS = __ttbEnv === "pi" ? 30000 : 5000;
  function _enqueueOutputWarm(path) {
    _outputWarmQueue = _outputWarmQueue
      .then(async () => {
        const entry = ensureGifPlaybackReady(path);
        // Wait for the in-flight decode promise to settle (or null/sync
        // entries that don't have one — pass-through immediately).
        if (!entry || !entry.promise || typeof entry.promise.then !== "function") {
          return;
        }
        // Phase 30 B2 h8: per-decode timeout. Pi VC4 + large GIFs (e.g.
        // slime.gif 22 MB) can stall mid-decode; without a timeout the
        // serialized queue blocks indefinitely and subsequent GIFs never
        // warm. With timeout: stalled decode is abandoned, entry marked
        // "fallback" (so trigger-time retry via Candidate B), queue
        // continues. Worst case: a stalled GIF won't appear at first
        // trigger but the next trigger (after backoff) retries and may
        // succeed.
        let timer;
        try {
          const timeoutPromise = new Promise((resolve) => {
            timer = setTimeout(() => {
              if (entry.status === "loading") {
                entry.status = "fallback";
                entry.error = new Error("warm_decode_timeout");
                entry.lastFailureAt = Date.now();
                entry.failureAttemptCount = (entry.failureAttemptCount || 0) + 1;
                ctx.logRender?.warn?.("gif_warm_decode_timeout", {
                  event: "gif-warm-decode-timeout",
                  path,
                  timeoutMs: WARM_DECODE_TIMEOUT_MS,
                });
                _gifProbe("warm-timeout", { path, timeoutMs: WARM_DECODE_TIMEOUT_MS });
              }
              resolve();
            }, WARM_DECODE_TIMEOUT_MS);
          });
          await Promise.race([entry.promise.catch(() => undefined), timeoutPromise]);
        } finally {
          if (timer) clearTimeout(timer);
        }
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
    // Phase 30 B2 h10: drop the shared playback canvas so the next
    // decode allocates one sized to the new GIF (asset re-upload may
    // change dimensions).
    entry._playbackCanvas = null;
    entry._playbackCanvasCtx = null;
    entry._playbackCanvasFrameIndex = -1;
    entry.frameWidth = 0;
    entry.frameHeight = 0;
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
