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
    // Phase 21-1: opt-in hull-flicker ⇒ solid-color coupling. When any
    // running animation in this exact room resolves to hull-flicker AND its
    // definition has breaksSolidColor=true, the flicker's off-gate overrides
    // the solid-color fill so the lamp actually goes dark instead of just
    // blinking on top of a lit surface.
    if (effectType === "solid-color") {
      const gate = findActiveHullFlickerGate(animation.boardId, room?.id);
      if (gate && ctx.isHullFlickerLampOff(gate.age, gate.speed, gate.intensity)) {
        return;
      }
    }
    // Phase 21-1: when hull-flicker in this exact room has the
    // breaksSolidColor flag on AND a sibling solid-color animation is
    // running in the same room, the FLICKER is delivered purely by
    // gating the solid-color fill on/off — the hull-flicker's own
    // yellow-tube + black-dim overlay would double up and look like
    // an extra bright strobe on top of the lamp. Suppress the
    // hull-flicker visual in that case. In rooms without a
    // solid-color sibling, hull-flicker draws normally (unchanged).
    if (effectType === "hull-flicker") {
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

  // Phase 21-1: scan running animations for a room-scoped (or cluster-member)
  // animation on (boardId, roomId) whose definition resolves to hull-flicker
  // with breaksSolidColor=true. Returns { age, speed, intensity } for the
  // first match, or null. Age is computed in the same units the hull-flicker
  // render branch uses (seconds since start × state.animationSpeed × per-
  // animation speed) so the gate function sees identical timeline math.
  function findActiveHullFlickerGate(boardId, roomId) {
    if (!boardId || !roomId) return null;
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
        if (resolved !== "hull-flicker") continue;
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
          if (resolved !== "hull-flicker") continue;
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

  // Phase 21-1: does (boardId, roomId) currently have any running
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
    // Phase 21-1: align outside with the room/instance model — when a
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
        const frame = ctx.getGifPlaybackFrame(selectedDefinition.assetRef, timeline.timeline);
        if (frame) {
          c.globalAlpha = ctx.clampOutsideIntensity(effectiveIntensity) * (Number.isFinite(effectiveOpacity) ? effectiveOpacity : 1);
          c.drawImage(frame, 0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        return;
      }
      if (selectedDefinition.assetType === "mp4") {
        const videoEntry = ctx.getOutsideVideoElement(selectedDefinition.assetRef);
        if (videoEntry?.video) {
          const video = videoEntry.video;
          const targetRate = Math.max(0.15, Math.min(4, ctx.clampOutsideSpeed(effectiveSpeed) * state.animationSpeed));
          const playbackState = ctx.ensureOutsideMp4Playback(video, {
            boardId: state.boardId,
            lifecycleKey: outsideLifecycleKey,
            assetRef: selectedDefinition.assetRef,
            targetRate,
          });
          ctx.maybeWrapOutsideMp4Loop(video, playbackState);
          c.globalAlpha = ctx.clampOutsideIntensity(effectiveIntensity) * (Number.isFinite(effectiveOpacity) ? effectiveOpacity : 1);
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
      ctx.drawEffectVisual(codedEffectType, timeline.timeline, effectiveIntensity, null, null, {
        outsideMode: effectiveMode,
        outsideSpeed: effectiveSpeed,
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

  // Phase 23 W2 v10: minimal pad renderer — covers solid-color
  // (the user's primary smoke test) explicitly, falls back to a
  // soft accent-tinted indicator for other animation types. The
  // ctx-swap + drawRoomComposition approach (v9) leaked geometry
  // lookups via ctx.getRoomLabelPosition for the synthetic room
  // and painted the animation at the wrong on-screen location.
  // Direct fillRect-based painting is decoupled from any board
  // polygon math and produces a fully-filled pad rect every time.
  function drawClusterPadCanvases(now) {
    const state = ctx.state;
    const padContainer = document.getElementById("cluster-pads");
    if (!padContainer) return;
    const dpr = window.devicePixelRatio || 1;
    const origCanvas = ctx.canvas;
    const origCanvasCtx = ctx.canvasCtx;
    // Group cluster-scope running animations by clusterId so multiple
    // animations on the same cluster all paint into the same pad.
    const byCluster = new Map();
    for (const anim of state.runningAnimations) {
      if (anim?.scope !== "cluster") continue;
      if (anim.boardId !== state.boardId) continue;
      const clusterId = String(anim.clusterId || "").trim();
      if (!clusterId) continue;
      if (!byCluster.has(clusterId)) byCluster.set(clusterId, []);
      byCluster.get(clusterId).push(anim);
    }
    for (const [clusterId, anims] of byCluster) {
      const pad = padContainer.querySelector(`.cluster-pad[data-cluster-id="${clusterId.replace(/"/g, '\\"')}"]`);
      if (!pad) continue;
      const padCanvas = pad.querySelector(".cluster-pad-canvas");
      if (!padCanvas) continue;
      const cssRect = padCanvas.getBoundingClientRect();
      if (cssRect.width <= 0 || cssRect.height <= 0) continue;
      const targetW = Math.max(1, Math.round(cssRect.width * dpr));
      const targetH = Math.max(1, Math.round(cssRect.height * dpr));
      if (padCanvas.width !== targetW) padCanvas.width = targetW;
      if (padCanvas.height !== targetH) padCanvas.height = targetH;
      const padCtx = padCanvas.getContext("2d");
      padCtx.clearRect(0, 0, padCanvas.width, padCanvas.height);

      // Synthetic full-rect "room" + complete metrics so any effect's
      // fallback to ctx.getRoomLabelPosition is never reached (the
      // metrics have everything drawEffectVisual reads). Polygon as
      // unit square so any clip-to-room test passes for the full canvas.
      const fakeRoom = {
        id: `__cluster_pad_${clusterId}`,
        polygon: [[0, 0], [1, 0], [1, 1], [0, 1]],
        center: { x: 0.5, y: 0.5 },
        radius: 0.5,
      };
      const fakeRoomMetrics = {
        centerX: padCanvas.width / 2,
        centerY: padCanvas.height / 2,
        width: padCanvas.width,
        height: padCanvas.height,
        radius: Math.min(padCanvas.width, padCanvas.height) / 2,
        minX: 0,
        minY: 0,
      };

      // Hijack ctx so per-effect drawers paint into THIS pad canvas.
      ctx.canvas = padCanvas;
      ctx.canvasCtx = padCtx;
      try {
        // Stack every cluster animation that's running on this
        // cluster — same multi-animation behavior as a real room.
        for (const anim of anims) {
          let memberViews = [];
          try { memberViews = ctx.buildClusterMemberRuntimeViews(anim) || []; } catch { /* defensive */ }
          const memberAnim = memberViews[0]?.animation || anim;
          if (!memberAnim) continue;
          const speed = ctx.clampRoomSpeed
            ? ctx.clampRoomSpeed(memberAnim.speed ?? 1)
            : Math.max(0.1, Number(memberAnim.speed) || 1);
          const age = ((now - Number(memberAnim.startedAt || 0)) / 1000)
            * Number(state.animationSpeed || 1)
            * speed;
          try {
            drawRoomComposition(memberAnim, age, fakeRoom, fakeRoomMetrics);
          } catch (error) {
            // Defensive — never crash on a single effect render error.
            if (typeof console !== "undefined") {
              console.warn("[cluster-pad] drawRoomComposition error", error);
            }
          }
        }
      } finally {
        ctx.canvas = origCanvas;
        ctx.canvasCtx = origCanvasCtx;
      }
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

      c.clearRect(0, 0, canvas.width, canvas.height);
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

      // Phase 19-4: post-draw mesh warp — deform canvas through grid if needed
      ctx.postDrawMeshWarp?.(canvas, c);

      // Phase 23 W2 v7: blit each cluster animation's first member
      // room region into its pad canvas. Pads are off-stage DOM
      // elements that mirror the cluster's rendered animation as a
      // miniature room. Runs only on dashboard (control role); /output/
      // doesn't render the rail at all.
      if (ctx.getOutputRole() !== ctx.OUTPUT_ROLE_FINAL) {
        drawClusterPadCanvases(now);
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
