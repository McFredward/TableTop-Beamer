// Phase 14-2: draw loop module.
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
  }

  // Phase 15-3: compute the effective draw rect for a room mp4/gif
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
      const gifRenderConfig = ctx.resolveRoomGifRenderConfig(animation.type, age, animation.intensity, {
        gifAssetPath: assetRef,
        gifTimelineAgeSec: age,
        gifPlaybackSpeed: ctx.clampRoomSpeed(animation.speed ?? animation.playbackSpeed ?? 1),
        opacity: ctx.clampRoomOpacity(animation.opacity),
      });
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
      if (ctx.shouldSkipRoomMp4Frame(animation)) {
        return;
      }
      const videoEntry = ctx.getRoomVideoElement(assetRef);
      const video = videoEntry?.video;
      if (video) {
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        const playbackRate = Math.max(0.3, Math.min(2.5, Number(animation.speed) || 1));
        if (Math.abs((Number(video.playbackRate) || 1) - playbackRate) > 0.01) {
          video.playbackRate = playbackRate;
        }
        if (video.paused) {
          void video.play().catch(() => undefined);
        }
        if (video.readyState >= 2 && Number(video.videoWidth) > 0 && Number(video.videoHeight) > 0) {
          try {
            const rect = resolveRoomAssetDrawRect(animation, roomMetrics);
            c.save();
            c.globalAlpha = ctx.clampRoomOpacity(animation.opacity);
            drawRoomAssetImage(c, video, rect);
            c.restore();
          } catch {
            c.restore();
          }
        }
      }
      return;
    }

    const effectType = ctx.resolveRoomCodedEffectType(assetRef || animation.type);
    const playbackSpeed = ctx.clampRoomSpeed(animation.speed ?? animation.playbackSpeed ?? 1);
    const playbackAge = age * ctx.clampRoomSpeed(animation.speed ?? animation.playbackSpeed ?? 1);
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
      const frame = ctx.getGifPlaybackFrame(definition.assetRef, timeline);
      if (frame) {
        c.globalAlpha = intensity;
        c.drawImage(frame, 0, 0, ctx.canvas.width, ctx.canvas.height);
      }
      return;
    }

    if (definition?.assetType === "mp4") {
      const videoEntry = ctx.getOutsideVideoElement(definition.assetRef);
      if (videoEntry?.video) {
        const video = videoEntry.video;
        const playbackRate = Math.max(0.15, Math.min(4, speed * state.animationSpeed));
        video.loop = true;
        if (Math.abs((Number(video.playbackRate) || 1) - playbackRate) > 0.01) {
          video.playbackRate = playbackRate;
        }
        if (video.paused) {
          void video.play().catch(() => undefined);
        }
        c.globalAlpha = intensity;
        c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
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
          if (memberConcurrency >= 2) {
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
        // P12-1 order-invariant layering: when this room has ≥ 2 concurrent
        // running animations, draw with additive composite so no effect can
        // occlude another regardless of trigger order. Type-independent:
        // coded, mp4, and gif all route through drawRoomComposition.
        const concurrencyKey = `${animation.boardId ?? ""}::${animation.roomId ?? ""}`;
        const roomConcurrency = state.runtimePerf.roomConcurrencyByKey?.get(concurrencyKey) ?? 0;
        if (roomConcurrency >= 2) {
          c.globalCompositeOperation = "lighter";
        }
        drawRoomComposition(animation, age, room, roomMetrics);
      } finally {
        c.restore();
      }
      return;
    }
    if (animation.type === "outside-space") {
      // Outside is rendered in a dedicated isolated layer path.
      return;
    }

    c.save();
    try {
      const clipped = ctx.clipToInsideShip(animation.boardId ?? state.boardId);
      if (!clipped) {
        return;
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
    const outsideLifecycleKey = ctx.buildOutsideLifecycleKey(state.boardId, selectedDefinition);
    const elapsedSeconds = ctx.resolveOutsideElapsedSeconds(now, {
      boardId: state.boardId,
      lifecycleKey: outsideLifecycleKey,
    }) * state.animationSpeed;
    const timeline = ctx.resolveOutsideTimeline(elapsedSeconds, selectedDefinition.speed);
    const effectiveDirection = selectedDefinition.direction === "reverse" ? "reverse" : "forward";

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
        const frame = ctx.getGifPlaybackFrame(selectedDefinition.assetRef, timeline.timeline);
        if (frame) {
          c.globalAlpha = ctx.clampOutsideIntensity(selectedDefinition.intensity);
          c.drawImage(frame, 0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        return;
      }
      if (selectedDefinition.assetType === "mp4") {
        const videoEntry = ctx.getOutsideVideoElement(selectedDefinition.assetRef);
        if (videoEntry?.video) {
          const video = videoEntry.video;
          const targetRate = Math.max(0.15, Math.min(4, ctx.clampOutsideSpeed(selectedDefinition.speed) * state.animationSpeed));
          const playbackState = ctx.ensureOutsideMp4Playback(video, {
            boardId: state.boardId,
            lifecycleKey: outsideLifecycleKey,
            assetRef: selectedDefinition.assetRef,
            targetRate,
          });
          ctx.maybeWrapOutsideMp4Loop(video, playbackState);
          c.globalAlpha = ctx.clampOutsideIntensity(selectedDefinition.intensity);
          if (video.readyState >= 2 && Number(video.videoWidth) > 0 && Number(video.videoHeight) > 0) {
            if (ctx.shouldDrawOutsideMp4Now(playbackState)) {
              c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
              ctx.captureOutsideMp4FallbackFrame(playbackState, video);
            } else {
              ctx.drawOutsideMp4FallbackFrame(playbackState);
            }
          } else {
            ctx.drawOutsideMp4FallbackFrame(playbackState);
          }
        } else {
          ctx.clearOutsideMp4PlaybackState(state.boardId);
        }
        return;
      }
      ctx.clearOutsideMp4PlaybackState(state.boardId);
      const codedEffectType = ctx.resolveOutsideCodedEffectType(selectedDefinition.assetRef);
      ctx.drawEffectVisual(codedEffectType, timeline.timeline, selectedDefinition.intensity, null, null, {
        outsideMode: selectedDefinition.mode,
        outsideSpeed: selectedDefinition.speed,
        outsideDirection: effectiveDirection,
      });
    } finally {
      c.restore();
    }
  }

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

      // Phase 18: tick loading overlay BEFORE any rendering so it always
      // runs, even during heavy interaction early returns.
      tickLoadingOverlay();

      // Phase 19-3: grid mesh warp — if active, swap render target to offscreen.
      // IMPORTANT: re-read c/canvas from ctx AFTER swap so all rendering
      // (including sub-functions that read ctx.canvasCtx) uses the offscreen.
      const warpTarget = ctx.beginGridWarpFrame?.(canvas);
      let activeC = c;
      let activeCanvas = canvas;
      if (warpTarget) {
        ctx.canvasCtx = warpTarget.ctx;
        ctx.canvas = warpTarget.canvas;
        activeC = warpTarget.ctx;
        activeCanvas = warpTarget.canvas;
      }

      activeC.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
      pruneFinishedAnimations(now);
      // Phase 13-HF7: pause the heavy animation render pipeline while a
      // touch gesture is in flight. The gesture is brief (typically
      // under 2 s) and the user is actively interacting, not staring at
      // background animations. Skipping the outside-fx layer + the
      // drawAnimationSafely loop recovers 20–40 ms of main-thread time
      // per frame on mobile.
      // Phase 13-HF8: also pause during polygon drag. Same rationale —
      // the user is editing, not watching — and drag lag was the
      // remaining symptom after HF7.
      if (ctx.isHeavyInteractionActive()) {
        // Phase 19-3: restore original canvas refs if warp was active
        if (warpTarget) { ctx.canvasCtx = c; ctx.canvas = canvas; }
        ctx.recordRuntimeFrameCost(performance.now() - frameStart);
        return;
      }
      drawOutsideFxLayer(now);

      // Order-invariant room layering (P12-1):
      // When ≥ 2 animations (any type) run in the same (board, room), switch
      // to additive composite ('lighter') so draw order cannot occlude.
      // Single-animation rooms keep the default source-over blend.
      const roomConcurrencyByKey = new Map();
      for (const entry of state.runningAnimations) {
        if (entry?.scope !== "room") continue;
        const boardId = typeof entry.boardId === "string" ? entry.boardId : "";
        const roomId = typeof entry.roomId === "string" ? entry.roomId : "";
        if (!roomId) continue;
        const key = `${boardId}::${roomId}`;
        roomConcurrencyByKey.set(key, (roomConcurrencyByKey.get(key) || 0) + 1);
      }
      state.runtimePerf.roomConcurrencyByKey = roomConcurrencyByKey;

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

      // Phase 19-3: end grid mesh warp — copy offscreen to visible canvas
      if (warpTarget) {
        ctx.canvasCtx = c;
        ctx.canvas = canvas;
        ctx.endGridWarpFrame?.(canvas, c);
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

  // Phase 18: loading overlay dismiss — runs once per draw frame.
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
      return;
    }

    // Wait for server snapshot first — it may switch the board
    const serverReady = ctx.liveSync?.firstServerSnapshotApplied === true;
    if (!serverReady) return;

    // Server confirmed — dismiss when image is loaded
    if (imageLoaded) {
      loading.dismissed = true;
      overlay.classList.add("is-hidden");
      overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
    }
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
