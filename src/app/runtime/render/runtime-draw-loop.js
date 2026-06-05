// draw loop module.
//
// Owns the top-level rAF draw loop and every function it calls:
//   - draw(now) + rAF self-reschedule
//   - pruneFinishedAnimations(now)
//   - drawOutsideFxLayer(now)
//   - drawAnimation / drawAnimationSafely
//   - drawRoomComposition
//   - drawInsideGlobalVisual
//
// Dependencies injected via ctx (very large surface — the draw loop
// reads state + DOM + dozens of runtime helpers). The module also
// holds its own `lastListRenderAt` module-private state since the
// throttled list re-render is a pure presentation concern.
(() => {
  let ctx = null;
  let lastListRenderAt = 0;

  function init(dependencies) {
    ctx = dependencies;
    window.TT_BEAMER_RUNTIME_DRAW_LOOP_CLUSTER_PADS.init({
      ctx: dependencies,
      drawRoomComposition,
    });
  }

  // Compute the effective draw rect for a room mp4/gif
  // asset. Falls back to the polygon bounding box when the
  // definition says "stretch to polygon" (default). Otherwise uses
  // the per-definition width/height/offset scales relative to the
  // polygon, plus a rotation applied around the result's center.
  // Returns { centerX, centerY, w, h, rotationRad }.
  function resolveRoomAssetDrawRect(animation, roomMetrics) {
    const definition = ctx.getRoomAnimationDefinitionById(animation.type, animation.boardId);
    const stretch = (animation.stretchToPolygon !== undefined ? animation.stretchToPolygon : definition?.stretchToPolygon) !== false;
    const widthScale = stretch ? 1 : (Number(animation.widthScale ?? definition?.widthScale) || 1);
    const heightScale = stretch ? 1 : (Number(animation.heightScale ?? definition?.heightScale) || 1);
    const offsetXScale = stretch ? 0 : (Number(animation.offsetXScale ?? definition?.offsetXScale) || 0);
    const offsetYScale = stretch ? 0 : (Number(animation.offsetYScale ?? definition?.offsetYScale) || 0);
    const rotationDeg = Number(animation.rotationDeg ?? definition?.rotationDeg) || 0;
    const baseCenterX = roomMetrics.minX + roomMetrics.width / 2;
    const baseCenterY = roomMetrics.minY + roomMetrics.height / 2;
    return {
      centerX: baseCenterX + offsetXScale * roomMetrics.width,
      centerY: baseCenterY + offsetYScale * roomMetrics.height,
      w: roomMetrics.width * widthScale,
      h: roomMetrics.height * heightScale,
      rotationRad: rotationDeg * Math.PI / 180,
    };
  }

  function drawRoomAssetImage(c, source, rect) {
    c.save();
    c.translate(rect.centerX, rect.centerY);
    if (rect.rotationRad !== 0) {
      c.rotate(rect.rotationRad);
    }
    c.drawImage(source, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
    c.restore();
  }

  function drawRoomComposition(animation, age, room, roomMetrics) {
    const c = ctx.canvasCtx;
    const qualityScale = ctx.getRuntimeQualityScale();
    const assetType = ctx.normalizeRoomAssetType(animation.roomAssetType);
    const assetRef = ctx.normalizeRoomAssetRefForType(assetType, animation.roomAssetRef, "");
    if (assetType === "gif") {
      const roomGifSpeed = ctx.clampRoomSpeed(animation.speed ?? animation.playbackSpeed ?? 1);
      // Phase 58 Wave 3.7p: room-gif playback phases. play-then-freeze
      // gifs run the same phase state machine as room mp4s — the
      // dispatch-side re-trigger flip (runtime-room-dispatch.js /
      // runtime-quick-mode.js) only touches the animation object, so it
      // already routes for gifs; the timeline below mirrors instead of
      // server-transcoding: reverse plays the frame cursor backwards
      // from the last frame, frozen-* clamp to a constant frame.
      const roomGifIsPlayThenFreeze = (animation.playbackMode || "loop") === "play-then-freeze";
      if (roomGifIsPlayThenFreeze) {
        ctx.maybeTransitionGifPlaybackPhase?.(animation, {
          totalDurationSec: ctx.getGifPlaybackTotalDurationSec?.(assetRef) || 0,
          elapsedScaledSec: age * roomGifSpeed,
        });
      }
      const gifRenderConfig = ctx.resolveRoomGifRenderConfig(animation.type, age, animation.intensity, {
        gifAssetPath: assetRef,
        gifTimelineAgeSec: age,
        gifPlaybackSpeed: roomGifSpeed,
        opacity: ctx.clampRoomOpacity(animation.opacity),
        // Phase 58: room-gif honors per-animation playback mode + direction.
        playbackMode: animation.playbackMode || "loop",
        playbackDirection: animation.playbackDirection || "forward",
        // Phase 58 Wave 3.7p: phase overrides direction (mp4 parity);
        // empty for non-phase modes so loop/boomerang gifs keep the
        // pure direction-driven timeline.
        playbackPhase: roomGifIsPlayThenFreeze ? (animation.playbackPhase || "forward") : "",
      });
      // Phase 58 Wave 2.5: dispatch cleanup for room-gif when
      // play-once-disappear's cursor has passed the total duration.
      if (animation.playbackMode === "play-once-disappear") {
        const totalSec = ctx.getGifPlaybackTotalDurationSec?.(assetRef) || 0;
        const elapsedScaledSec = age * roomGifSpeed;
        ctx.maybeDispatchPlaybackCleanup?.(animation, { hasReachedEnd: totalSec > 0 && elapsedScaledSec >= totalSec });
      }
      if (gifRenderConfig.frame) {
        const rect = resolveRoomAssetDrawRect(animation, roomMetrics);
        c.save();
        c.globalAlpha = gifRenderConfig.opacity;
        drawRoomAssetImage(c, gifRenderConfig.frame, rect);
        c.restore();
      }
      return;
    }
    if (assetType === "mp4") {
      // Phase 58 Wave 3.6: cache video element by BASE assetRef (forward
      // URL) + instanceId. Phase transitions swap video.src in-place
      // via expectedSrcUrl so the fallback canvas + rVFC binding
      // survive (operator UAT 2026-06-05: disappear-on-retrigger fix).
      const roomMp4Phase = animation.playbackPhase || "forward";
      // Phase 58 Wave 3.7i (2026-06-05): frozen instances paint
      // EXCLUSIVELY from the fallback canvas — zero per-frame video
      // work. See the paint branch below for full rationale.
      const roomMp4IsFrozen = roomMp4Phase === "frozen-last" || roomMp4Phase === "frozen-first";
      // Phase 58 Wave 3.7k (2026-06-05): the pressure frame-skip no
      // longer bare-returns here. The canvas clears every rAF, so a
      // bare return leaves the room region TRANSPARENT for that frame
      // — under sustained pressure (level 2, stride 2) every PLAYING
      // room strobed at half the rAF rate on the SSR tab (operator's
      // /output/ flicker during multi-video playback; third occurrence
      // of the "bare return on a clearing canvas" class after the
      // strobo bug and the v1.2.15 frozen-room strobing, which only
      // exempted FROZEN rooms from this skip). The skip is now folded
      // into the drawNow gate below (`pressureSkipR`): a pressure-
      // skipped frame takes the existing fallback-blit branch — one
      // cheap canvas blit instead of full-res drawImage(video) +
      // capture — so the pressure relief is preserved but the region
      // always paints. Side effect (intentional): ensureRoomMp4Playback
      // / maybeWrapRoomMp4Loop / maybeTransitionPlaybackPhase now also
      // run on pressure-skipped frames — phase transitions and EOS
      // handling are cheap and must not be skipped under pressure.
      const roomMp4UseReverseUrl = roomMp4Phase === "reverse" || roomMp4Phase === "frozen-first";
      const roomMp4Direction = roomMp4UseReverseUrl ? "reverse" : "forward";
      const videoEntry = ctx.getRoomVideoElement(assetRef, {
        instanceId: animation.id,
        playbackMode: animation.playbackMode || "loop",
      });
      const video = videoEntry?.video;
      // Phase 58 Wave 3.7n: adaptive video quality. The desired src is
      // a single function of (direction, quality tier). Playing
      // instances follow the GLOBAL adaptive tier (downswitch to the
      // 480p proxy under sustained framedrops; ensureRoomMp4Playback
      // performs the position-preserving quality swap). FROZEN
      // instances are pinned to the tier already applied to their
      // element — swapping a frozen video would discard its decoded
      // freeze state for zero benefit; they adopt the current tier on
      // the next phase change.
      const roomMp4IsFrozenForTier = roomMp4IsFrozen && video;
      const roomMp4QualityTier = roomMp4IsFrozenForTier
        ? (ctx.getAppliedVideoQualityTier?.(video) || "full")
        : (ctx.getAdaptiveVideoQualityTier?.() || "full");
      const roomMp4ExpectedSrcUrl = ctx.resolveMp4AssetUrlForDirection?.(assetRef, roomMp4Direction, roomMp4QualityTier) || assetRef;
      if (video) {
        // Phase 50 (2026-05-25): manual-wrap loop machinery (mirrors
        // outside MP4) to eliminate the SSR-visible seam at video EOS.
        // Native <video loop> reset stalls for 1 capture frame, which
        // the dashboard's canvas re-paint hides but the SSR encoder
        // captures + inserts an I-frame for — producing a perceivable
        // hitch in /output/. ensureRoomMp4Playback puts the video into
        // manual-wrap mode (`loop=false`), maybeWrapRoomMp4Loop
        // preempts the EOS by seeking back early, and the fallback
        // canvas bridges the brief `seeking` window so SSR sees a
        // continuous frame stream.
        const playbackRate = Math.max(0.3, Math.min(2.5, Number(animation.speed) || 1));
        // Phase 58 Wave 3: for boomerang, pre-compute both forward
        // and reverse URLs so the ended handler can src-swap.
        const roomMp4IsBoomerang = (animation.playbackMode || "loop") === "boomerang";
        // Phase 58 Wave 3.7n: boomerang fwd/rev URLs carry the current
        // quality tier too, so the EOS ping-pong stays on-tier.
        const roomMp4Forward = roomMp4IsBoomerang ? ctx.resolveMp4AssetUrlForDirection?.(assetRef, "forward", roomMp4QualityTier) || assetRef : null;
        const roomMp4Reverse = roomMp4IsBoomerang ? ctx.resolveMp4AssetUrlForDirection?.(assetRef, "reverse", roomMp4QualityTier) : null;
        const playbackState = ctx.ensureRoomMp4Playback?.(video, {
          assetRef,
          expectedSrcUrl: roomMp4ExpectedSrcUrl,
          targetRate: playbackRate,
          // Phase 58: per-instance playback mode from the running
          // animation; controls whether maybeWrapRoomMp4Loop seeks back
          // at EOS (loop/boomerang) or lets the video freeze
          // (play-then-freeze, play-once-disappear).
          playbackMode: animation.playbackMode || "loop",
          boomerangForwardSrc: roomMp4Forward,
          boomerangReverseSrc: roomMp4Reverse,
          instanceId: animation?.id || '',
          playbackPhase: roomMp4Phase,
        });
        if (playbackState) {
          ctx.maybeWrapRoomMp4Loop?.(video, playbackState);
        }
        // Phase 58 Wave 2.5: cleanup-dispatch for play-once-disappear.
        // Checks video.ended each frame; on transition emits stop
        // exactly once (idempotent via animation._endedDispatched).
        ctx.maybeDispatchPlaybackCleanup?.(animation, { hasReachedEnd: Boolean(video.ended) });
        // Phase 58 Wave 3.7i: pass playbackState so the frozen
        // transition can pin the freeze frame onto the fallback canvas
        // at the exact moment the last decoded frame is still good.
        ctx.maybeTransitionPlaybackPhase?.(animation, video, playbackState);
        try {
          const rect = resolveRoomAssetDrawRect(animation, roomMetrics);
          c.save();
          c.globalAlpha = ctx.clampRoomOpacity(animation.opacity);
          const isSeeking = video.seeking === true;
          const haveLiveFrame =
            !isSeeking
            && video.readyState >= 2
            && Number(video.videoWidth) > 0
            && Number(video.videoHeight) > 0;
          // Phase 57 (2026-06-01): tier-gate live paint to the mp4
          // source cadence (33/22/16 ms per tier) so we don't oversample
          // a 30fps mp4 at 60Hz rAF. Without the gate the decoder
          // sometimes hands back the same frame twice → operator-
          // reported "konstantes leichtes Stockeln" on snow.mp4 (the
          // universal stutter; mirrors the inside/outside fix). When
          // gated out, fall through to the existing fallback-source
          // replay so SSR capture still sees a fresh canvas op every
          // frame (Win32 capture budget preserved).
          // Phase 57 v1.1.5 (2026-06-02): rVFC-driven paint gate
          // (see inside-mp4 path comment for full rationale).
          // Phase 58 Wave 3.7h (2026-06-05): trust rVFC only while it
          // is DEMONSTRABLY delivering (fired within RVFC_FRESH_MS).
          // Firefox throttles rVFC for N concurrent off-DOM videos to
          // an irregular 3-13 fires/s → with the old bound-flag gate
          // the room replayed a frozen fallback between fires and
          // jumped forward on each fire = operator's flicker/blinking
          // (phase-58-bugB-flicker.md). When rVFC goes silent >150ms,
          // degrade to the proven tier time-gate; healthy rVFC
          // (Chromium/SSR) keeps the newFrame-only gate unchanged.
          const rvfcFreshR = Boolean(playbackState && ctx.isRvfcFresh?.(playbackState));
          const newFrameR = Boolean(playbackState && ctx.hasNewDecodedFrame(playbackState));
          // Phase 58 Wave 3.7k: pressure skip (see comment at the top
          // of the mp4 branch). When the skip strides this frame out,
          // suppress the LIVE paint only — the room then falls into the
          // fallback-blit branch below and still paints last good frame.
          const pressureSkipR = !roomMp4IsFrozen && ctx.shouldSkipRoomMp4Frame(animation);
          const drawNow = playbackState
            ? (!pressureSkipR && (newFrameR || (!rvfcFreshR && ctx.shouldDrawOutsideMp4Now(playbackState))))
            : true;
          let _diag58Outcome = null;
          if (roomMp4IsFrozen && playbackState && ctx.getRoomMp4FallbackSource) {
            // Phase 58 Wave 3.7i (2026-06-05): FROZEN paint mode. For a
            // video paused at EOS, rVFC stops firing → isRvfcFresh()
            // stays false forever → the Wave 3.7h gate painted the LIVE
            // <video> at time-gate cadence AND captured the fallback on
            // every such paint. That meant continuous full-res drawImage
            // work per frozen room (operator UAT 2026-06-05: "ein
            // einziges Bild zu zeigen sollte keine Last erzeugen"), and
            // on Firefox drawImage of an ENDED video can intermittently
            // yield a BLANK frame under load — which overwrote the good
            // fallback → the frozen-room flicker that spread across all
            // frozen rooms. Frozen instances now paint EXCLUSIVELY from
            // the fallback canvas: no drawImage(video), no per-frame
            // capture. The freeze frame was pinned at the phase
            // transition (maybeTransitionPlaybackPhase) / by the last
            // rVFC capture; the one-time capture below only covers a
            // fallback-less edge (fresh hydration mid-frozen).
            let frozenSrc = ctx.getRoomMp4FallbackSource(playbackState);
            if (!frozenSrc && haveLiveFrame) {
              ctx.captureRoomMp4FallbackFrame?.(playbackState, video);
              frozenSrc = ctx.getRoomMp4FallbackSource(playbackState);
            }
            if (frozenSrc) {
              drawRoomAssetImage(c, frozenSrc, rect);
              ctx.recordMp4PaintDiag?.(playbackState, "room-mp4", "fallback");
              _diag58Outcome = "frozen-fallback";
            } else if (haveLiveFrame) {
              // No fallback available at all — painting the live video
              // is strictly better than leaving the region unpainted.
              drawRoomAssetImage(c, video, rect);
              ctx.recordMp4PaintDiag?.(playbackState, "room-mp4", "live");
              _diag58Outcome = "frozen-live-last-resort";
            } else {
              ctx.recordMp4PaintDiag?.(playbackState, "room-mp4", "no-frame");
              _diag58Outcome = "no-frame";
            }
          } else if (haveLiveFrame && drawNow) {
            drawRoomAssetImage(c, video, rect);
            // Phase 58 Wave 3.7f (2026-06-05, FPS): only capture the
            // fallback frame here when rVFC is NOT driving captures.
            // _bindRoomMp4FrameCallback already captures the fallback
            // on every decoded frame (rVFC fire), so this per-live-paint
            // capture was a redundant full-frame drawImage to the
            // fallback canvas on every painted frame — with N concurrent
            // room videos that is N extra full-res blits per rAF, the
            // dominant cost behind the operator's "spürbarer FPS-Einbruch
            // bei vielen gleichzeitigen Videos". When rVFC is FRESH the
            // fallback stays fresh without this; when it isn't (browser
            // lacks requestVideoFrameCallback OR Firefox starves the
            // delivery — Phase 58 Wave 3.7h) the paint site must keep
            // the fallback current itself.
            if (playbackState && !rvfcFreshR && ctx.captureRoomMp4FallbackFrame) {
              ctx.captureRoomMp4FallbackFrame(playbackState, video);
            }
            if (playbackState) ctx.markMp4FramePainted(playbackState);
            ctx.recordMp4PaintDiag?.(playbackState, "room-mp4", "live");
            _diag58Outcome = "live";
          } else if (playbackState && ctx.getRoomMp4FallbackSource) {
            const src = ctx.getRoomMp4FallbackSource(playbackState);
            if (src) {
              drawRoomAssetImage(c, src, rect);
              ctx.recordMp4PaintDiag?.(playbackState, "room-mp4", haveLiveFrame ? "gated-out" : "fallback");
              _diag58Outcome = haveLiveFrame ? "gated-out" : "fallback";
            } else if (haveLiveFrame) {
              // Phase 57 v1.1.7 (2026-06-02): Bug A last-resort. Fallback
              // canvas not yet captured (first paint after lifecycle
              // change OR fallback init race). Use live <video> directly
              // — strictly better than leaving the region UNPAINTED
              // (main rAF's clearRect would bleed black through).
              drawRoomAssetImage(c, video, rect);
              if (ctx.captureRoomMp4FallbackFrame) {
                ctx.captureRoomMp4FallbackFrame(playbackState, video);
              }
              ctx.markMp4FramePainted(playbackState);
              ctx.recordMp4PaintDiag?.(playbackState, "room-mp4", "live");
              _diag58Outcome = "v117-last-resort";
            } else if (!isSeeking && Number(video.videoWidth) > 0 && video.readyState >= 1) {
              // Phase 58 Wave 3.7 (2026-06-05): extended last-resort for
              // concurrent-load race. With 4+ rooms triggering the same
              // mp4 simultaneously, readyState briefly drops below 2
              // before rVFC fires its first frame. During that window
              // both haveLiveFrame and fallback are false/null →
              // polygon was painting transparent → operator UAT
              // "wildes Flackern bei 4+ Animationen". Painting the live
              // <video> with readyState >= 1 is browser-defined as
              // safe (draws poster frame or no-ops); strictly better
              // than transparent.
              drawRoomAssetImage(c, video, rect);
              if (ctx.captureRoomMp4FallbackFrame) {
                ctx.captureRoomMp4FallbackFrame(playbackState, video);
              }
              ctx.recordMp4PaintDiag?.(playbackState, "room-mp4", "live");
              _diag58Outcome = "v127-last-resort";
            } else {
              ctx.recordMp4PaintDiag?.(playbackState, "room-mp4", "no-frame");
              _diag58Outcome = "no-frame";
            }
          } else {
            ctx.recordMp4PaintDiag?.(playbackState, "room-mp4", "no-frame");
            _diag58Outcome = "no-frame";
          }
          // Phase 58 diag: accumulate paint outcomes per instance per
          // 1000ms window. Logs a single summary line so the operator
          // can see if any rAF ticks resulted in "no-frame" during
          // the flicker window.
          if (window.TT_DEBUG_58 && playbackState) {
            const d = playbackState._tt58Diag || (playbackState._tt58Diag = {
              windowStartMs: performance.now(),
              counts: {},
            });
            d.counts[_diag58Outcome] = (d.counts[_diag58Outcome] || 0) + 1;
            const elapsedMs = performance.now() - d.windowStartMs;
            if (elapsedMs >= 1000) {
              console.warn("[58-diag] paint outcomes (1s)", {
                instanceId: animation.id,
                phase: animation.playbackPhase,
                ...d.counts,
                videoReady: video.readyState,
                ended: video.ended,
                paused: video.paused,
              });
              d.windowStartMs = performance.now();
              d.counts = {};
            }
          }
          c.restore();
        } catch {
          c.restore();
        }
      }
      return;
    }

    const effectType = ctx.resolveRoomCodedEffectType(assetRef || animation.type);
    const playbackSpeed = ctx.clampRoomSpeed(animation.speed ?? animation.playbackSpeed ?? 1);
    const playbackAge = age * ctx.clampRoomSpeed(animation.speed ?? animation.playbackSpeed ?? 1);
    // Opt-in coded-effect ⇒ solid-color coupling. When any running
    // animation in this exact room resolves to a "breaking" coded
    // effect (hull-flicker or power-outage) AND its definition has
    // breaksSolidColor=true, the effect's off-gate overrides the
    // solid-color fill so the room actually goes dark instead of
    // just rendering on top of a lit surface.
    if (effectType === "solid-color") {
      const flickerGate = findActiveBreakingGate(animation.boardId, room?.id, "hull-flicker");
      if (flickerGate && ctx.isHullFlickerLampOff(flickerGate.age, flickerGate.speed, flickerGate.intensity)) {
        return;
      }
      const outageGate = findActiveBreakingGate(animation.boardId, room?.id, "power-outage");
      if (outageGate && ctx.isPowerOutageLampOff(outageGate.age, outageGate.speed, outageGate.intensity)) {
        return;
      }
    }
    // When a "breaking" coded effect in this exact room has the
    // breaksSolidColor flag on AND a sibling solid-color animation
    // is running in the same room, the effect is delivered purely
    // by gating the solid-color fill on/off — the effect's own
    // overlay would double up on top of the lamp. Suppress the
    // effect visual in that case. In rooms without a solid-color
    // sibling, the effect draws normally (unchanged).
    if (effectType === "hull-flicker" || effectType === "power-outage") {
      const def = ctx.getRoomAnimationDefinitionById(animation.type, animation.boardId);
      if (def?.breaksSolidColor === true
          && roomHasSolidColorSibling(animation.boardId, room?.id)) {
        return;
      }
    }
    ctx.drawEffectVisual(
      effectType,
      playbackAge,
      animation.intensity,
      room,
      roomMetrics,
      {
        densityFactor: qualityScale,
        opacity: ctx.clampRoomOpacity(animation.opacity),
        gifAssetPath: assetRef || ctx.ROOM_GIF_ANIMATION_ASSETS[animation.type],
        gifTimelineAgeSec: age,
        gifPlaybackSpeed: playbackSpeed,
        roomAnimationType: animation.type,
        colorHex: animation.colorHex,
      },
    );
  }

  // Scan running animations for a room-scoped (or cluster-member)
  // animation on (boardId, roomId) whose definition resolves to the
  // given coded effect type with breaksSolidColor=true. Returns
  // { age, speed, intensity } for the first match, or null. Age is
  // computed in the same units the effect's render branch uses
  // (seconds since start × state.animationSpeed × per-animation
  // speed) so the gate function sees identical timeline math.
  function findActiveBreakingGate(boardId, roomId, codedEffectType) {
    if (!boardId || !roomId || !codedEffectType) return null;
    const state = ctx.state;
    const now = performance.now();
    const running = Array.isArray(state?.runningAnimations) ? state.runningAnimations : [];
    for (const entry of running) {
      if (!entry || entry.boardId !== boardId) continue;
      if (!Number.isFinite(entry.startedAt) || now < entry.startedAt) continue;
      if (entry.scope === "room" && entry.roomId === roomId) {
        const def = ctx.getRoomAnimationDefinitionById(entry.type, boardId);
        if (!def || def.breaksSolidColor !== true) continue;
        const resolved = ctx.resolveRoomCodedEffectType(def.assetRef || entry.type);
        if (resolved !== codedEffectType) continue;
        const speed = ctx.clampRoomSpeed(entry.speed ?? def.speed ?? 1);
        const age = ((now - entry.startedAt) / 1000) * (Number(state.animationSpeed) || 1) * speed;
        return { age, speed, intensity: Number(def.intensity) || 1 };
      }
      if (entry.scope === "cluster") {
        const memberViews = ctx.buildClusterMemberRuntimeViews(entry);
        for (const memberView of memberViews) {
          if (memberView?.roomId !== roomId) continue;
          const memberAnimation = memberView.animation;
          if (!memberAnimation) continue;
          const def = ctx.getRoomAnimationDefinitionById(memberAnimation.type, boardId);
          if (!def || def.breaksSolidColor !== true) continue;
          const resolved = ctx.resolveRoomCodedEffectType(def.assetRef || memberAnimation.type);
          if (resolved !== codedEffectType) continue;
          const memberStart = Number.isFinite(memberAnimation.startedAt)
            ? memberAnimation.startedAt
            : entry.startedAt;
          if (!Number.isFinite(memberStart) || now < memberStart) continue;
          const speed = ctx.clampRoomSpeed(memberAnimation.speed ?? entry.speed ?? def.speed ?? 1);
          const age = ((now - memberStart) / 1000) * (Number(state.animationSpeed) || 1) * speed;
          return { age, speed, intensity: Number(def.intensity) || 1 };
        }
      }
    }
    return null;
  }

  // Does (boardId, roomId) currently have any running
  // room-scoped (or cluster-member) animation whose resolved coded
  // effect is solid-color? Used to suppress the hull-flicker
  // overlay when it's coupled with solid-color via breaksSolidColor.
  function roomHasSolidColorSibling(boardId, roomId) {
    if (!boardId || !roomId) return false;
    const state = ctx.state;
    const running = Array.isArray(state?.runningAnimations) ? state.runningAnimations : [];
    for (const entry of running) {
      if (!entry || entry.boardId !== boardId) continue;
      if (entry.scope === "room" && entry.roomId === roomId) {
        const def = ctx.getRoomAnimationDefinitionById(entry.type, boardId);
        const assetType = ctx.normalizeRoomAssetType(def?.assetType);
        if (assetType !== "coded") continue;
        const resolved = ctx.resolveRoomCodedEffectType(def?.assetRef || entry.type);
        if (resolved === "solid-color") return true;
      }
      if (entry.scope === "cluster") {
        const memberViews = ctx.buildClusterMemberRuntimeViews(entry);
        for (const memberView of memberViews) {
          if (memberView?.roomId !== roomId) continue;
          const memberAnimation = memberView.animation;
          if (!memberAnimation) continue;
          const def = ctx.getRoomAnimationDefinitionById(memberAnimation.type, boardId);
          const assetType = ctx.normalizeRoomAssetType(def?.assetType);
          if (assetType !== "coded") continue;
          const resolved = ctx.resolveRoomCodedEffectType(def?.assetRef || memberAnimation.type);
          if (resolved === "solid-color") return true;
        }
      }
    }
    return false;
  }

  function drawInsideGlobalVisual(animation, age) {
    const state = ctx.state;
    const c = ctx.canvasCtx;
    const boardId = animation.boardId ?? state.boardId;
    const profile = ctx.getInsideFxProfile(boardId);
    const definition = profile.animations.find((entry) => entry.id === animation.type) ?? null;
    const intensity = ctx.clampOutsideIntensity(definition?.intensity ?? animation.intensity ?? 1);
    const speed = ctx.clampOutsideSpeed(definition?.speed ?? 1);
    const timeline = age * speed;

    if (definition?.assetType === "gif") {
      // Phase 58: inside-gif reads per-animation playback mode from
      // the running instance (falls back to definition for preview).
      const insideGifMode = animation?.playbackMode || definition?.playbackMode || "loop";
      const insideGifDir = animation?.playbackDirection || definition?.playbackDirection || "forward";
      const frame = ctx.getGifPlaybackFrame(definition.assetRef, timeline, insideGifMode, insideGifDir);
      // Phase 58 Wave 2.5: cleanup for inside-gif play-once-disappear.
      if (insideGifMode === "play-once-disappear" && animation) {
        const totalSec = ctx.getGifPlaybackTotalDurationSec?.(definition.assetRef) || 0;
        ctx.maybeDispatchPlaybackCleanup?.(animation, { hasReachedEnd: totalSec > 0 && timeline >= totalSec });
      }
      if (frame) {
        c.globalAlpha = intensity;
        c.drawImage(frame, 0, 0, ctx.canvas.width, ctx.canvas.height);
      }
      return;
    }

    if (definition?.assetType === "mp4") {
      // Phase 58 Wave 3.6: cache by BASE assetRef + instanceId; swap
      // video.src in-place on phase transitions via expectedSrcUrl.
      const insideMp4Phase = animation?.playbackPhase || "forward";
      // Phase 58 Wave 3.7i: frozen instances paint exclusively from the
      // fallback canvas (see room-mp4 path comment).
      const insideMp4IsFrozen = insideMp4Phase === "frozen-last" || insideMp4Phase === "frozen-first";
      const insideMp4UseReverseUrl = insideMp4Phase === "reverse" || insideMp4Phase === "frozen-first";
      const insideMp4ExpectedSrcUrl = ctx.resolveMp4AssetUrlForDirection?.(definition.assetRef, insideMp4UseReverseUrl ? "reverse" : "forward") || definition.assetRef;
      const insideMp4Mode2 = animation?.playbackMode || definition?.playbackMode || "loop";
      const videoEntry = ctx.getOutsideVideoElement(definition.assetRef, {
        instanceId: animation?.id,
        playbackMode: insideMp4Mode2,
      });
      if (videoEntry?.video) {
        const video = videoEntry.video;
        const targetRate = Math.max(0.15, Math.min(4, speed * state.animationSpeed));
        // Phase 57 (2026-06-01): backport room/outside-mp4 defense
        // level to inside-mp4. Previously bare `video.loop=true` +
        // unconditional drawImage(video) every rAF — no live-frame
        // check, no tier-fps gate, no fallback canvas. On modern PCs
        // /output/ rAF runs ~60Hz and snow.mp4 source is 30fps, so
        // every rAF oversampled the decoder → operator-reported
        // "konstantes leichtes Stockeln" (57-CONTEXT D-01/D-02).
        //
        // Uses the room-mp4 playback machinery (keyed by assetRef)
        // rather than outside-mp4 (keyed by boardId) so inside +
        // outside mp4 active on the same board cannot clobber each
        // other's playback state. Deviation from 57-01-PLAN.md
        // Change 1 text — equivalent defense level; documented in
        // 57-01-SUMMARY.md.
        const insideMp4Mode = animation?.playbackMode || definition.playbackMode || "loop";
        const insideMp4IsBoomerang = insideMp4Mode === "boomerang";
        const insideMp4Forward = insideMp4IsBoomerang ? ctx.resolveMp4AssetUrlForDirection?.(definition.assetRef, "forward") || definition.assetRef : null;
        const insideMp4Reverse = insideMp4IsBoomerang ? ctx.resolveMp4AssetUrlForDirection?.(definition.assetRef, "reverse") : null;
        const playbackState = ctx.ensureRoomMp4Playback?.(video, {
          assetRef: definition.assetRef,
          expectedSrcUrl: insideMp4ExpectedSrcUrl,
          targetRate,
          // Phase 58: inside-mp4 reads playbackMode from the running
          // animation; falls back to definition for control-side
          // preview paths that don't carry an instance.
          playbackMode: insideMp4Mode,
          boomerangForwardSrc: insideMp4Forward,
          boomerangReverseSrc: insideMp4Reverse,
          instanceId: animation?.id || '',
          playbackPhase: insideMp4Phase,
        });
        // Phase 58 Wave 2.5: cleanup-dispatch for inside-mp4.
        ctx.maybeDispatchPlaybackCleanup?.(animation, { hasReachedEnd: Boolean(video.ended) });
        // Phase 58 Wave 3.7i: pass playbackState (freeze-frame pinning).
        ctx.maybeTransitionPlaybackPhase?.(animation, video, playbackState);
        if (playbackState) {
          ctx.maybeWrapRoomMp4Loop?.(video, playbackState);
        }
        c.globalAlpha = intensity;
        const isSeeking = video.seeking === true;
        const haveLiveFrame =
          !isSeeking
          && video.readyState >= 2
          && Number(video.videoWidth) > 0
          && Number(video.videoHeight) > 0;
        // Phase 57 v1.1.5 (2026-06-02): rVFC-driven paint gate. The
        // bare time-throttle in shouldDrawOutsideMp4Now opens at
        // 22ms (45fps balanced tier) but snow.mp4 decodes at ~17-24fps
        // under SSR load → ~40% of live paints redrew the SAME decoded
        // frame, producing duplicate pixels in the encoder stream
        // (operator-visible "frame drop" / "kleine hänger" 57-CONTEXT
        // 2026-06-01). hasNewDecodedFrame consumes the rVFC signal
        // (bindOutsideMp4FrameCallback / _bindRoomMp4FrameCallback)
        // and only authorizes a live paint when a NEW decoded frame
        // has arrived since the previous one. Fallback canvas replay
        // covers the "no new frame" rAF cycles so the canvas always
        // has content (Win32 capture budget preserved: 1 drawImage per
        // rAF, project_win32_ssr_canvas_damage.md). When rVFC is
        // unsupported, hasNewDecodedFrame returns false and the path
        // falls back to the v1.1.4 time-gate.
        // Phase 58 Wave 3.7h (2026-06-05): trust rVFC only while fresh
        // (see room-mp4 path comment — Firefox starvation degrades to
        // the tier time-gate). Inside path already captures the
        // fallback on every live paint, so no capture change needed.
        const rvfcFresh = Boolean(playbackState && ctx.isRvfcFresh?.(playbackState));
        const newFrame = Boolean(playbackState && ctx.hasNewDecodedFrame(playbackState));
        const gateAllows = playbackState
          ? (newFrame || (!rvfcFresh && ctx.shouldDrawOutsideMp4Now(playbackState)))
          : true;
        if (insideMp4IsFrozen && playbackState && ctx.getRoomMp4FallbackSource) {
          // Phase 58 Wave 3.7i: FROZEN paint mode — fallback canvas
          // only, zero per-frame video work (see room-mp4 comment).
          let frozenSrc = ctx.getRoomMp4FallbackSource(playbackState);
          if (!frozenSrc && haveLiveFrame) {
            ctx.captureRoomMp4FallbackFrame?.(playbackState, video);
            frozenSrc = ctx.getRoomMp4FallbackSource(playbackState);
          }
          if (frozenSrc) {
            c.drawImage(frozenSrc, 0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.recordMp4PaintDiag?.(playbackState, "inside-mp4", "fallback");
          } else if (haveLiveFrame) {
            c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.recordMp4PaintDiag?.(playbackState, "inside-mp4", "live");
          } else {
            ctx.recordMp4PaintDiag?.(playbackState, "inside-mp4", "no-frame");
          }
        } else if (playbackState && haveLiveFrame && gateAllows) {
          c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
          if (ctx.captureRoomMp4FallbackFrame) {
            ctx.captureRoomMp4FallbackFrame(playbackState, video);
          }
          ctx.markMp4FramePainted(playbackState);
          ctx.recordMp4PaintDiag?.(playbackState, "inside-mp4", "live");
        } else if (playbackState && ctx.getRoomMp4FallbackSource) {
          const src = ctx.getRoomMp4FallbackSource(playbackState);
          if (src) {
            c.drawImage(src, 0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.recordMp4PaintDiag?.(playbackState, "inside-mp4", haveLiveFrame ? "gated-out" : "fallback");
          } else if (haveLiveFrame) {
            // Phase 57 v1.1.7 (2026-06-02): Bug A last-resort. Fallback
            // canvas not yet captured (first paint after lifecycle
            // change OR fallback init race). Use live <video> directly
            // — strictly better than leaving the region UNPAINTED
            // (main rAF's clearRect would bleed black through, producing
            // the operator-reported strobe on overlaid mp4s).
            c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
            if (ctx.captureRoomMp4FallbackFrame) {
              ctx.captureRoomMp4FallbackFrame(playbackState, video);
            }
            ctx.markMp4FramePainted(playbackState);
            ctx.recordMp4PaintDiag?.(playbackState, "inside-mp4", "live");
          } else if (!isSeeking && Number(video.videoWidth) > 0 && video.readyState >= 1) {
            // Phase 58 Wave 3.7: extended last-resort for concurrent-load
            // race (see room-mp4 path comment).
            c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
            if (ctx.captureRoomMp4FallbackFrame) {
              ctx.captureRoomMp4FallbackFrame(playbackState, video);
            }
            ctx.recordMp4PaintDiag?.(playbackState, "inside-mp4", "live");
          } else {
            ctx.recordMp4PaintDiag?.(playbackState, "inside-mp4", "no-frame");
          }
        } else {
          ctx.recordMp4PaintDiag?.(playbackState, "inside-mp4", "no-frame");
        }
        return;
      }
    }

    const codedEffectType = ctx.resolveInsideCodedEffectType(definition?.assetRef ?? animation.type);
    ctx.drawEffectVisual(codedEffectType, timeline, intensity, null);
  }

  function drawAnimation(animation, now) {
    const state = ctx.state;
    const c = ctx.canvasCtx;
    if (Number.isFinite(animation?.startedAt) && now < Number(animation.startedAt)) {
      return;
    }
    if (animation.scope === "cluster") {
      if (animation.boardId !== state.boardId) {
        return;
      }
      const board = ctx.getBoard(animation.boardId);
      const memberViews = ctx.buildClusterMemberRuntimeViews(animation);
      for (const memberView of memberViews) {
        const room = board.rooms.find((entry) => entry.id === memberView.roomId);
        if (!room) {
          continue;
        }
        const memberAnimation = memberView.animation;
        if (Number.isFinite(memberAnimation?.startedAt) && now < Number(memberAnimation.startedAt)) {
          continue;
        }
        const runtimeSpeed = ctx.clampRoomSpeed(memberAnimation.speed ?? animation.speed ?? 1);
        const age = ((now - Number(memberAnimation.startedAt)) / 1000) * state.animationSpeed * runtimeSpeed;
        const roomMetrics = ctx.getRoomRenderMetrics(room, animation.boardId);
        c.save();
        try {
          const clipped = ctx.clipToRoom(room, animation.boardId);
          if (!clipped) {
            continue;
          }
          const memberConcurrencyKey = `${animation.boardId ?? ""}::${room.id ?? ""}`;
          const memberConcurrency = state.runtimePerf.roomConcurrencyByKey?.get(memberConcurrencyKey) ?? 0;
          // Phase 57 v1.1.7 (2026-06-02): also lift when an inside-
          // animation is concurrently active on this board (Bug B).
          const insideConcurrent = (state.runtimePerf.insideAnimationCountByBoard?.get(animation.boardId ?? "") ?? 0) > 0;
          if (memberConcurrency >= 2 || insideConcurrent) {
            c.globalCompositeOperation = "lighter";
          }
          drawRoomComposition(memberAnimation, age, room, roomMetrics);
        } finally {
          c.restore();
        }
      }
      return;
    }
    if (animation.scope === "room" && animation.parentClusterRunId) {
      const hasClusterController = state.runningAnimations.some(
        (entry) => entry?.id === animation.parentClusterRunId && entry?.scope === "cluster",
      );
      if (hasClusterController) {
        return;
      }
    }
    const runtimeSpeed = animation.scope === "room" ? ctx.clampRoomSpeed(animation.speed ?? 1) : 1;
    const age = ((now - animation.startedAt) / 1000) * state.animationSpeed * runtimeSpeed;
    if (animation.scope === "room") {
      if (animation.boardId !== state.boardId) {
        return;
      }
      const room = ctx.getBoard(animation.boardId).rooms.find((entry) => entry.id === animation.roomId);
      if (!room) {
        return;
      }
      const roomMetrics = ctx.getRoomRenderMetrics(room, animation.boardId);
      c.save();
      try {
        const clipped = ctx.clipToRoom(room, animation.boardId);
        if (!clipped) {
          return;
        }
        // Order-invariant layering: when this room has ≥ 2 concurrent
        // running animations, draw with additive composite so no effect can
        // occlude another regardless of trigger order. Type-independent:
        // coded, mp4, and gif all route through drawRoomComposition.
        const concurrencyKey = `${animation.boardId ?? ""}::${animation.roomId ?? ""}`;
        const roomConcurrency = state.runtimePerf.roomConcurrencyByKey?.get(concurrencyKey) ?? 0;
        // Phase 57 v1.1.7 (2026-06-02): also lift when an inside-
        // animation is concurrently active on this board (Bug B).
        const insideConcurrent = (state.runtimePerf.insideAnimationCountByBoard?.get(animation.boardId ?? "") ?? 0) > 0;
        if (roomConcurrency >= 2 || insideConcurrent) {
          c.globalCompositeOperation = "lighter";
        }
        drawRoomComposition(animation, age, room, roomMetrics);
      } finally {
        c.restore();
      }
      return;
    }
    if (ctx.isOutsideAnimationType?.(animation.type, animation.boardId ?? ctx.state.boardId)
      || animation.type === "outside-space") {
      // Outside is rendered in a dedicated isolated layer path — skip
      // the normal inside-ship rendering for ANY animation type the
      // board's outside profile knows about.
      return;
    }

    c.save();
    try {
      const clipped = ctx.clipToInsideShip(animation.boardId ?? state.boardId);
      if (!clipped) {
        return;
      }
      // Phase 57 v1.1.7 (2026-06-02): Bug B — when any room animation
      // is concurrently active on this board, draw the inside-
      // animation with additive composite so it cannot opaquely cover
      // the room animation regardless of trigger order. Mirrors the
      // Phase 12 room-room layering pattern.
      const roomConcurrent = (state.runtimePerf.roomAnimationCountByBoard?.get(animation.boardId ?? state.boardId ?? "") ?? 0) > 0;
      if (roomConcurrent) {
        c.globalCompositeOperation = "lighter";
      }
      drawInsideGlobalVisual(animation, age);
    } finally {
      c.restore();
    }
  }

  function drawAnimationSafely(animation, now) {
    try {
      drawAnimation(animation, now);
      return true;
    } catch (error) {
      ctx.logRender.error("animation_render_failed", {
        event: "animation-render-failed",
        animationId: animation.id,
        boardId: ctx.state.boardId,
        error: String(error?.message || error),
      });
      return false;
    }
  }

  function drawOutsideFxLayer(now) {
    const state = ctx.state;
    const c = ctx.canvasCtx;
    const outside = ctx.getOutsideFxProfile(state.boardId);
    if (!outside.enabled) {
      ctx.clearOutsideMp4PlaybackState(state.boardId);
      ctx.clearOutsideTimelineState(state.boardId);
      return;
    }
    const selectedDefinition = ctx.getSelectedOutsideAnimationDefinition(state.boardId);
    if (!selectedDefinition) {
      ctx.clearOutsideMp4PlaybackState(state.boardId);
      ctx.clearOutsideTimelineState(state.boardId);
      return;
    }
    // Align outside with the room/instance model — when a
    // running outside animation exists for this board, its per-instance
    // values (intensity/speed/opacity/mode/direction) drive the draw so
    // Live Editor changes and trigger-time captures win over the
    // definition's latest uncommitted edits. Fall back to the definition
    // only when no running instance carries the field (legacy snapshot
    // safety).
    const runningInstance = state.runningAnimations.find(
      (anim) => anim?.scope === "global"
        && anim?.boardId === state.boardId
        && anim?.type === selectedDefinition.id,
    ) ?? null;
    const pickInstance = (key, fallback) => {
      const raw = runningInstance?.[key];
      return raw === undefined || raw === null || raw === "" ? fallback : raw;
    };
    const effectiveIntensity = Number(pickInstance("intensity", selectedDefinition.intensity));
    const effectiveSpeed = Number(pickInstance("speed", selectedDefinition.speed));
    const effectiveOpacity = Number(pickInstance("opacity", selectedDefinition.opacity ?? 1));
    const effectiveMode = pickInstance("mode", selectedDefinition.mode);
    const effectiveDirectionRaw = pickInstance("direction", selectedDefinition.direction);
    const outsideLifecycleKey = ctx.buildOutsideLifecycleKey(state.boardId, selectedDefinition);
    const elapsedSeconds = ctx.resolveOutsideElapsedSeconds(now, {
      boardId: state.boardId,
      lifecycleKey: outsideLifecycleKey,
    }) * state.animationSpeed;
    const timeline = ctx.resolveOutsideTimeline(elapsedSeconds, effectiveSpeed);
    const effectiveDirection = effectiveDirectionRaw === "reverse" ? "reverse" : "forward";

    c.save();
    try {
      c.globalCompositeOperation = "source-over";
      c.globalAlpha = 1;
      c.filter = "none";
      const clipped = ctx.clipToOutsideShip(state.boardId);
      if (!clipped) {
        return;
      }
      if (selectedDefinition.assetType === "gif") {
        ctx.clearOutsideMp4PlaybackState(state.boardId);
        // Phase 58: outside-gif honors per-instance playback mode.
        const outsideGifMode = runningInstance?.playbackMode || selectedDefinition.playbackMode || "loop";
        const outsideGifDir = runningInstance?.playbackDirection || selectedDefinition.playbackDirection || "forward";
        const frame = ctx.getGifPlaybackFrame(selectedDefinition.assetRef, timeline.timeline, outsideGifMode, outsideGifDir);
        // Phase 58 Wave 2.5: cleanup for outside-gif play-once-disappear.
        if (outsideGifMode === "play-once-disappear" && runningInstance) {
          const totalSec = ctx.getGifPlaybackTotalDurationSec?.(selectedDefinition.assetRef) || 0;
          ctx.maybeDispatchPlaybackCleanup?.(runningInstance, { hasReachedEnd: totalSec > 0 && timeline.timeline >= totalSec });
        }
        if (frame) {
          c.globalAlpha = ctx.clampOutsideIntensity(effectiveIntensity) * (Number.isFinite(effectiveOpacity) ? effectiveOpacity : 1);
          c.drawImage(frame, 0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        return;
      }
      if (selectedDefinition.assetType === "mp4") {
        // Phase 58 Wave 3.6: cache by BASE assetRef; swap src in-place
        // on phase transitions via expectedSrcUrl.
        const outsideMp4Phase = runningInstance?.playbackPhase || "forward";
        // Phase 58 Wave 3.7i: frozen instances paint exclusively from
        // the fallback canvas (see room-mp4 path comment).
        const outsideMp4IsFrozen = outsideMp4Phase === "frozen-last" || outsideMp4Phase === "frozen-first";
        const outsideMp4UseReverseUrl = outsideMp4Phase === "reverse" || outsideMp4Phase === "frozen-first";
        const outsideMp4ExpectedSrcUrl = ctx.resolveMp4AssetUrlForDirection?.(selectedDefinition.assetRef, outsideMp4UseReverseUrl ? "reverse" : "forward") || selectedDefinition.assetRef;
        const outsideMp4Mode2 = runningInstance?.playbackMode || selectedDefinition?.playbackMode || "loop";
        const videoEntry = ctx.getOutsideVideoElement(selectedDefinition.assetRef, {
          instanceId: runningInstance?.id,
          playbackMode: outsideMp4Mode2,
        });
        if (videoEntry?.video) {
          const video = videoEntry.video;
          const targetRate = Math.max(0.15, Math.min(4, ctx.clampOutsideSpeed(effectiveSpeed) * state.animationSpeed));
          const outsideMp4Mode = runningInstance?.playbackMode || selectedDefinition.playbackMode || "loop";
          const outsideMp4IsBoomerang = outsideMp4Mode === "boomerang";
          const outsideMp4Forward = outsideMp4IsBoomerang ? ctx.resolveMp4AssetUrlForDirection?.(selectedDefinition.assetRef, "forward") || selectedDefinition.assetRef : null;
          const outsideMp4Reverse = outsideMp4IsBoomerang ? ctx.resolveMp4AssetUrlForDirection?.(selectedDefinition.assetRef, "reverse") : null;
          const playbackState = ctx.ensureOutsideMp4Playback(video, {
            boardId: state.boardId,
            lifecycleKey: outsideLifecycleKey,
            assetRef: selectedDefinition.assetRef,
            expectedSrcUrl: outsideMp4ExpectedSrcUrl,
            targetRate,
            // Phase 58: outside mp4 reads playbackMode from the running
            // animation when available; falls back to definition for
            // preview paths.
            playbackMode: outsideMp4Mode,
            boomerangForwardSrc: outsideMp4Forward,
            boomerangReverseSrc: outsideMp4Reverse,
            instanceId: runningInstance?.id || '',
            playbackPhase: outsideMp4Phase,
          });
          // Phase 58 Wave 2.5: cleanup-dispatch for outside-mp4.
          if (runningInstance) {
            ctx.maybeDispatchPlaybackCleanup?.(runningInstance, { hasReachedEnd: Boolean(video.ended) });
            // Phase 58 Wave 3.7i: pass playbackState (freeze-frame pin).
            ctx.maybeTransitionPlaybackPhase?.(runningInstance, video, playbackState);
          }
          ctx.maybeWrapOutsideMp4Loop(video, playbackState);
          c.globalAlpha = ctx.clampOutsideIntensity(effectiveIntensity) * (Number.isFinite(effectiveOpacity) ? effectiveOpacity : 1);
          // Phase 57 (2026-06-01): removed the Phase 30 T4 final-output
          // bypass. T4 assumed "/output/ rAF rate is below any tier-
          // target gate so shouldDrawOutsideMp4Now never returns false"
          // — true on Pi at ~16 fps rAF, but FALSE on the operator's
          // modern Win11 RTX 4090 box where /output/ rAF runs ~60Hz and
          // tier targets are 33/22/16 ms (= 30/45/60 fps). With T4 in
          // place, snow.mp4 (30 fps source) was oversampled every rAF →
          // operator-reported "konstantes leichtes Stockeln" on
          // /output/. Collapse final-output and non-final-output into a
          // single tier-gated branch; live-paint + capture when gated
          // through, fallback replay when gated out or during the loop-
          // wrap seek window. Win32 canvas-damage budget preserved:
          // still 1 drawImage(video) + 1 capture op per painted frame
          // (project_win32_ssr_canvas_damage.md).
          //
          // Critical: also check `video.seeking`.
          // maybeWrapOutsideMp4Loop sets video.currentTime back to
          // a small value before natural EOS. During the seek the
          // video is in `seeking` state for 1-3 rAF cycles, and
          // readyState typically does NOT drop below 2 (Chromium
          // keeps the prior buffer alive). Without the
          // video.seeking guard, drawImage(video) during seeking
          // paints stale or partial pixels → the visible hiccup.
          const isSeeking = video.seeking === true;
          const haveLiveFrame =
            !isSeeking
            && video.readyState >= 2
            && Number(video.videoWidth) > 0
            && Number(video.videoHeight) > 0;
          // Phase 57 v1.1.5 (2026-06-02): rVFC-driven paint gate
          // (see inside-mp4 path comment for full rationale).
          // Phase 58 Wave 3.7h (2026-06-05): trust rVFC only while
          // fresh (see room-mp4 path comment). Outside path already
          // captures the fallback on every live paint.
          const rvfcFreshO = Boolean(playbackState && ctx.isRvfcFresh?.(playbackState));
          const newFrameO = Boolean(playbackState && ctx.hasNewDecodedFrame(playbackState));
          const drawNowO = newFrameO || (!rvfcFreshO && ctx.shouldDrawOutsideMp4Now(playbackState));
          if (outsideMp4IsFrozen && playbackState) {
            // Phase 58 Wave 3.7i: FROZEN paint mode — fallback canvas
            // only, zero per-frame video work (see room-mp4 comment).
            let paintedFrozen = ctx.drawOutsideMp4FallbackFrame(playbackState);
            if (!paintedFrozen && haveLiveFrame) {
              ctx.captureOutsideMp4FallbackFrame(playbackState, video);
              paintedFrozen = ctx.drawOutsideMp4FallbackFrame(playbackState);
            }
            if (!paintedFrozen && haveLiveFrame) {
              c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
              paintedFrozen = true;
            }
            ctx.recordMp4PaintDiag?.(playbackState, "outside-mp4", paintedFrozen ? "fallback" : "no-frame");
          } else if (haveLiveFrame && drawNowO) {
            c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.captureOutsideMp4FallbackFrame(playbackState, video);
            ctx.markMp4FramePainted(playbackState);
            ctx.recordMp4PaintDiag?.(playbackState, "outside-mp4", "live");
          } else {
            const painted = ctx.drawOutsideMp4FallbackFrame(playbackState);
            if (!painted && haveLiveFrame) {
              // Phase 57 v1.1.7 (2026-06-02): Bug A last-resort. Fallback
              // canvas not yet captured. Paint live <video> directly so
              // the region is never left UNPAINTED (would bleed black).
              c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
              ctx.captureOutsideMp4FallbackFrame(playbackState, video);
              ctx.markMp4FramePainted(playbackState);
              ctx.recordMp4PaintDiag?.(playbackState, "outside-mp4", "live");
            } else if (!painted && !isSeeking && Number(video.videoWidth) > 0 && video.readyState >= 1) {
              // Phase 58 Wave 3.7: extended last-resort for concurrent-
              // load race (see room-mp4 path comment).
              c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
              ctx.captureOutsideMp4FallbackFrame(playbackState, video);
              ctx.recordMp4PaintDiag?.(playbackState, "outside-mp4", "live");
            } else {
              ctx.recordMp4PaintDiag?.(playbackState, "outside-mp4", haveLiveFrame ? "gated-out" : "fallback");
            }
          }
        } else {
          ctx.clearOutsideMp4PlaybackState(state.boardId);
        }
        return;
      }
      ctx.clearOutsideMp4PlaybackState(state.boardId);
      const codedEffectType = ctx.resolveOutsideCodedEffectType(selectedDefinition.assetRef);
      ctx.drawEffectVisual(codedEffectType, timeline.timeline, effectiveIntensity, null, null, {
        outsideMode: effectiveMode,
        outsideSpeed: effectiveSpeed,
        outsideDirection: effectiveDirection,
      });
    } finally {
      c.restore();
    }
  }

  // Phase 58 Wave 3.2: track instance ids that were alive last frame so
  // we can release their per-instance video cache entries when they
  // disappear (stopAnimation, board switch, clear-all, room-not-found).
  let _previousInstanceIdsSeen = new Set();
  // Phase 58 Wave 3.7d (2026-06-05): track last-seen timestamp per
  // instance id. With 4+ rapid concurrent triggers the server processes
  // trigger-room mutations one at a time, each broadcasting a snapshot
  // that wholesale-replaces state.runningAnimations. Locally-just-
  // pushed animations momentarily vanish from the snapshot until the
  // server catches up → release fired → video element destroyed →
  // next snapshot brings the id back → fresh element + load() →
  // operator UAT "wild flicker bei 4+ Animationen". Defer release
  // until an id is absent for a sustained grace window.
  const _instanceLastSeenAtMs = new Map();
  const INSTANCE_RELEASE_GRACE_MS = 500;

  function pruneFinishedAnimations(now) {
    const state = ctx.state;
    const before = state.runningAnimations.length;
    state.runningAnimations = state.runningAnimations.filter((anim) => {
      if (anim.scope === "cluster") {
        return true;
      }
      if (anim.scope === "room") {
        const board = ctx.getBoard(anim.boardId);
        const hasRoom = board.rooms.some((room) => room.id === anim.roomId);
        if (!hasRoom) {
          return false;
        }
      }
      if (anim.hold || anim.durationMs === null) {
        return true;
      }
      return now - anim.startedAt < anim.durationMs;
    });
    const activeRoomByCluster = new Map();
    for (const anim of state.runningAnimations) {
      if (anim.scope !== "room" || !anim.parentClusterRunId) {
        continue;
      }
      if (!activeRoomByCluster.has(anim.parentClusterRunId)) {
        activeRoomByCluster.set(anim.parentClusterRunId, []);
      }
      activeRoomByCluster.get(anim.parentClusterRunId).push(anim);
    }
    for (const anim of state.runningAnimations) {
      if (anim.scope !== "cluster") {
        continue;
      }
      const members = activeRoomByCluster.get(anim.id) ?? [];
      if (members.length === 0) {
        continue;
      }
      anim.memberAnimationIds = members.map((entry) => entry.id);
      anim.memberRoomIds = members.map((entry) => entry.roomId);
    }

    if (before !== state.runningAnimations.length) {
      ctx.stopSoundsForInactiveAnimations();
      ctx.renderRunningAnimationsList();
      ctx.refreshGlobalButtons();
    }
    // Phase 58 Wave 3.7d (2026-06-05): release per-instance mp4 video
    // elements WITH GRACE PERIOD. Wholesale snapshot replacement on
    // multi-trigger races can transiently omit valid instances; immediate
    // release destroys their video elements and the next snapshot
    // re-creates them, causing the operator-reported flicker. Only
    // release after 500ms of sustained absence.
    const currentIds = new Set(state.runningAnimations.map((anim) => anim.id));
    const nowReleaseMs = performance.now();
    for (const id of currentIds) {
      _instanceLastSeenAtMs.set(id, nowReleaseMs);
    }
    for (const [id, lastSeenMs] of Array.from(_instanceLastSeenAtMs.entries())) {
      if (currentIds.has(id)) continue;
      if (nowReleaseMs - lastSeenMs > INSTANCE_RELEASE_GRACE_MS) {
        // Phase 58 Wave 3.7i: permanent diagnostic (operator request) —
        // logs the release decision so any subsequent [58] release-video
        // / Firefox "Ungültige URI" line is attributable. Fires once per
        // disappeared instance.
        console.warn("[58] prune-release", JSON.stringify({
          id,
          msSinceSeen: Math.round(nowReleaseMs - lastSeenMs),
        }));
        ctx.releaseMp4VideoElementsForInstance?.(id);
        _instanceLastSeenAtMs.delete(id);
      }
    }
    _previousInstanceIdsSeen = currentIds;
    if (
      state.roomDraft.editTargetId &&
      !state.runningAnimations.some((anim) => anim.id === state.roomDraft.editTargetId)
    ) {
      ctx.clearRoomDraftEditTarget();
    }
  }

  function draw(now) {
    const state = ctx.state;
    const c = ctx.canvasCtx;
    const canvas = ctx.canvas;
    const frameStart = performance.now();
    try {
      state.runtimePerf.frameIndex = (Number(state.runtimePerf.frameIndex) || 0) + 1;
      if (state.mobilePerf.lastFrameAt !== null) {
        const frameDelta = now - state.mobilePerf.lastFrameAt;
        if (Number.isFinite(frameDelta) && frameDelta > 0 && frameDelta < 1000) {
          state.mobilePerf.frameDeltaSamples.push(frameDelta);
          if (state.mobilePerf.frameDeltaSamples.length > 900) {
            state.mobilePerf.frameDeltaSamples.shift();
          }
        }
      }
      state.mobilePerf.lastFrameAt = now;

      if (state.mobilePerf.pendingTriggerAt !== null) {
        const latency = now - state.mobilePerf.pendingTriggerAt;
        if (Number.isFinite(latency) && latency >= 0 && latency < 1500) {
          state.mobilePerf.triggerLatencySamples.push(latency);
          if (state.mobilePerf.triggerLatencySamples.length > 200) {
            state.mobilePerf.triggerLatencySamples.shift();
          }
        }
        state.mobilePerf.pendingTriggerAt = null;
      }

      // Tick loading overlay BEFORE any rendering so it always
      // runs, even during heavy interaction early returns.
      tickLoadingOverlay();

      c.clearRect(0, 0, canvas.width, canvas.height);
      pruneFinishedAnimations(now);
      // Pause the render pipeline while a touch gesture or polygon drag is
      // active. Recovers 20–40 ms / frame on mobile and removes drag lag.
      // (See heavy-interaction guards in runtime-polygon-drag-support.)
      if (ctx.isHeavyInteractionActive()) {
        ctx.recordRuntimeFrameCost(performance.now() - frameStart);
        return;
      }
      drawOutsideFxLayer(now);

      // Order-invariant room layering:
      // When ≥ 2 animations (any type) run in the same (board, room), switch
      // to additive composite ('lighter') so draw order cannot occlude.
      // Single-animation rooms keep the default source-over blend.
      const roomConcurrencyByKey = new Map();
      // Phase 57 v1.1.7 (2026-06-02): Bug B — parallel count for
      // inside-animation presence per board so room+inside concurrent
      // can also lift to "lighter" (operator-confirmed regression: an
      // inside animation drawn AFTER a room animation opaquely covers
      // the room region). Inside animations have scope === "global"
      // AND are NOT in the board's outside-fx profile.
      const insideAnimationCountByBoard = new Map();
      const roomAnimationCountByBoard = new Map();
      for (const entry of state.runningAnimations) {
        const boardId = typeof entry?.boardId === "string" ? entry.boardId : "";
        if (entry?.scope === "room") {
          const roomId = typeof entry.roomId === "string" ? entry.roomId : "";
          if (!roomId) continue;
          const key = `${boardId}::${roomId}`;
          roomConcurrencyByKey.set(key, (roomConcurrencyByKey.get(key) || 0) + 1);
          roomAnimationCountByBoard.set(boardId, (roomAnimationCountByBoard.get(boardId) || 0) + 1);
        } else if (entry?.scope === "cluster") {
          // Cluster animations expand to multiple room draws; count as room presence
          roomAnimationCountByBoard.set(boardId, (roomAnimationCountByBoard.get(boardId) || 0) + 1);
        } else if (entry?.scope === "global") {
          // global covers both inside and outside; only count inside here
          if (!ctx.isOutsideAnimationType?.(entry.type, boardId || ctx.state.boardId)
              && entry.type !== "outside-space") {
            insideAnimationCountByBoard.set(boardId, (insideAnimationCountByBoard.get(boardId) || 0) + 1);
          }
        }
      }
      state.runtimePerf.roomConcurrencyByKey = roomConcurrencyByKey;
      state.runtimePerf.insideAnimationCountByBoard = insideAnimationCountByBoard;
      state.runtimePerf.roomAnimationCountByBoard = roomAnimationCountByBoard;

      const failedAnimationIds = [];
      let renderedCount = 0;
      const maxRenderAnimationsPerFrame = Math.max(1, Number(state.runtimePerf.maxRenderAnimationsPerFrame) || 96);
      for (const anim of state.runningAnimations) {
        if (ctx.shouldCoalesceNonCriticalAnimation(anim)) {
          continue;
        }
        if (!ctx.isRenderCriticalAnimation(anim) && renderedCount >= maxRenderAnimationsPerFrame) {
          continue;
        }
        const ok = drawAnimationSafely(anim, now);
        renderedCount += 1;
        if (!ok) {
          failedAnimationIds.push(anim.id);
        }
      }

      if (failedAnimationIds.length > 0) {
        state.runningAnimations = state.runningAnimations.filter(
          (anim) => !failedAnimationIds.includes(anim.id),
        );
        ctx.renderRunningAnimationsList();
        ctx.refreshGlobalButtons();
        ctx.triggerFeedback.textContent =
          "Status: faulty animation isolated, render timer continues";
      }

      ctx.postDrawMeshWarp?.(canvas, c);

      // Blit each cluster animation's first member
      // room region into its pad canvas. Pads are off-stage DOM
      // elements that mirror the cluster's rendered animation as a
      // miniature room. Runs only on dashboard (control role); /output/
      // doesn't render the rail at all.
      if (ctx.getOutputRole() !== ctx.OUTPUT_ROLE_FINAL) {
        window.TT_BEAMER_RUNTIME_DRAW_LOOP_CLUSTER_PADS.drawClusterPadCanvases(now);
      }

      if (
        ctx.getOutputRole() !== ctx.OUTPUT_ROLE_FINAL
        && now - lastListRenderAt > 500
        && !ctx.isRunningListInteractionActive()
      ) {
        ctx.renderRunningAnimationsList();
        lastListRenderAt = now;
      }
      ctx.recordRuntimeFrameCost(performance.now() - frameStart);
    } finally {
      requestAnimationFrame(draw);
    }
  }

  // Loading overlay dismiss — runs once per draw frame.
  // Waits for the first server snapshot to be applied (which may trigger
  // a board switch), then dismisses once the board image is loaded.
  // On desktop the server responds fast (<200ms) so this adds minimal delay.
  // On mobile the server snapshot triggers a board switch → new image loads.
  function tickLoadingOverlay() {
    const state = ctx.state;
    const loading = state._loading;
    if (!loading || loading.dismissed) return;
    const overlay = loading.overlay;
    if (!overlay) { loading.dismissed = true; return; }

    const boardImage = ctx.boardImage;
    const currentSrc = boardImage?.src || "";
    const imageLoaded = boardImage && boardImage.complete && boardImage.naturalWidth > 0;

    // If src changed, a board switch is happening — wait for new image
    if (currentSrc !== loading.lastSeenSrc) {
      loading.lastSeenSrc = currentSrc;
      loading.stableFrames = 0;
      return;
    }

    // Wait for server snapshot first — it may switch the board
    const serverReady = ctx.liveSync?.firstServerSnapshotApplied === true;
    if (!serverReady) return;

    if (!imageLoaded) return;

    // Phase 30 B1 h8: hold loading-overlay until additional boot conditions
    // settle. Without these checks, /output/ briefly shows: (a) wrong board
    // (state.boardId !== snapshot's selectedBoard); (b) rooms without
    // outside-FX (mp4 not yet loaded); (c) white flash from GL canvas
    // first display:block; (d) brief 2D-fallback streifen before GL stabilizes.
    // The overlay should cover ALL of those transitions and reveal only the
    // steady end-state.

    // (1) Board switch fully applied: state.boardId matches snapshot's
    //     selectedBoard if any.
    const snapshotBoard =
      typeof ctx.state?.selectedBoard === "string" && ctx.state.selectedBoard
        ? ctx.state.selectedBoard
        : ctx.state.boardId;
    if (state.boardId !== snapshotBoard) return;

    // (2) Outside-FX in steady state. If outside is enabled with mp4
    //     selected, wait until the video element is decode-ready
    //     (readyState >= 2) before dismissing — otherwise user sees
    //     a white flash when the mp4 first paints.
    try {
      const outside = ctx.getOutsideFxProfile?.(state.boardId);
      if (outside?.enabled) {
        const def = ctx.getSelectedOutsideAnimationDefinition?.(state.boardId);
        if (def?.assetType === "mp4" && typeof def.assetRef === "string") {
          const videoEntry = ctx.getOutsideVideoElement?.(def.assetRef);
          const video = videoEntry?.video;
          if (!video || video.readyState < 2 || !(Number(video.videoWidth) > 0)) {
            return;
          }
        }
        if (def?.assetType === "gif" && typeof def.assetRef === "string") {
          const gifApi = window.TT_BEAMER_RUNTIME_GIF_PLAYBACK;
          const gifEntry = gifApi?.getGifPlaybackCacheEntry?.(def.assetRef);
          if (!gifEntry || gifEntry.status !== "ready") return;
        }
      }
    } catch (_) { /* if outside accessors throw, fall through */ }

    // (3) Wait for ≥3 stable frames AFTER all the above conditions become
    //     true. Each tickLoadingOverlay call increments; resets when src
    //     changes. This buffers the GL canvas first display:block + the
    //     potential GL context reinit white-flash window into the still-
    //     covered overlay region. ~50ms at 60fps.
    loading.stableFrames = (loading.stableFrames || 0) + 1;
    if (loading.stableFrames < 3) return;

    // All conditions settled — dismiss with a short fade (200ms instead
    // of 500ms; the system is genuinely ready, no need for slow fade).
    loading.dismissed = true;
    overlay.style.transition = "opacity 0.2s ease, visibility 0.2s ease";
    overlay.classList.add("is-hidden");
    overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
  }

  function startDrawLoop() {
    requestAnimationFrame(draw);
  }

  window.TT_BEAMER_RUNTIME_DRAW_LOOP = {
    init,
    drawRoomComposition,
    drawInsideGlobalVisual,
    drawAnimation,
    drawAnimationSafely,
    drawOutsideFxLayer,
    pruneFinishedAnimations,
    draw,
    startDrawLoop,
  };
})();
