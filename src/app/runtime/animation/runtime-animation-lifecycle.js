// Phase 14-2: animation lifecycle module.
//
// Owns the animation stop/edit dispatch pipeline:
//   - collectAnimationStopIds / buildStopCommandTargetMeta
//   - stopAnimation / emitStopAnimationCommand
//   - editAnimation
//   - renderRunningAnimationsList / isRunningListInteractionActive
//   - validateRunningListParity
//   - refreshGlobalButtons
//   - liveSync pendingStopAnimationIds helpers
//
// Dependencies injected via ctx (large surface — this module touches
// the entire running-animations lifecycle from stop commands through
// list rendering).
(() => {
  let ctx = null;
  let liveEditorAnimationId = null;
  let liveEditorSnapshot = null;

  function init(dependencies) {
    ctx = dependencies;

    // Phase 23 W2 v6: continuous rAF tracking of the cluster rail
    // position. CSS transitions on .stage's transform mean the
    // bounding rect interpolates over ~120 ms after every pan/zoom
    // commit; one-shot rAF after the commit catches the START of
    // the transition but the rail then drifts until the next
    // render tick. A continuous rAF with diff-skip (only writes
    // CSS variables when the rect actually changed) is cheap and
    // keeps the rail perfectly glued.
    let lastRailKey = "";
    function rafTick() {
      const stage = ctx?.stage || document.getElementById("stage");
      const rail = document.getElementById("cluster-pads");
      if (stage && rail) {
        const rect = stage.getBoundingClientRect();
        if (rect.width > 0) {
          const layoutWidth = stage.clientWidth || rect.width;
          const scale = rect.width / Math.max(1, layoutWidth);
          const key = `${rect.left.toFixed(1)}|${rect.top.toFixed(1)}|${rect.height.toFixed(1)}|${scale.toFixed(4)}`;
          if (key !== lastRailKey) {
            lastRailKey = key;
            rail.style.setProperty("--rail-left", `${rect.left}px`);
            rail.style.setProperty("--rail-top", `${rect.top}px`);
            rail.style.setProperty("--rail-height", `${rect.height}px`);
            rail.style.setProperty("--rail-scale", String(scale));
          }
        }
      }
      window.requestAnimationFrame(rafTick);
    }
    window.requestAnimationFrame(rafTick);

    // Wire live editor close + discard buttons.
    ctx.liveEditorClose.addEventListener("click", closeLiveEditor);
    ctx.liveEditorDiscard?.addEventListener("click", discardLiveEditor);

    // Wire live editor sliders.
    ctx.liveEditorOpacity.addEventListener("input", () => {
      const value = ctx.clampRoomOpacity(Number(ctx.liveEditorOpacity.value));
      ctx.liveEditorOpacityValue.textContent = value.toFixed(2);
      applyLiveEditorValue("opacity", value);
    });
    ctx.liveEditorIntensity.addEventListener("input", () => {
      const value = ctx.clampRoomIntensity(Number(ctx.liveEditorIntensity.value));
      ctx.liveEditorIntensityValue.textContent = value.toFixed(2);
      applyLiveEditorValue("intensity", value);
    });
    ctx.liveEditorSpeed.addEventListener("input", () => {
      const value = ctx.clampRoomSpeed(Number(ctx.liveEditorSpeed.value));
      ctx.liveEditorSpeedValue.textContent = `${value.toFixed(2)}x`;
      applyLiveEditorValue("speed", value);
      applyLiveEditorValue("playbackSpeed", value);
    });
    ctx.liveEditorSoundVolume.addEventListener("input", () => {
      const raw = Number(ctx.liveEditorSoundVolume.value);
      ctx.liveEditorSoundVolumeValue.textContent = `${Math.round(raw)}%`;
      applyLiveEditorValue("soundVolume", ctx.clampRoomSoundVolume(raw / 100));
    });
    ctx.liveEditorRotation.addEventListener("input", () => {
      const value = Math.max(-180, Math.min(180, Number(ctx.liveEditorRotation.value)));
      ctx.liveEditorRotationValue.textContent = `${value}°`;
      applyLiveEditorValue("rotationDeg", value);
    });
    ctx.liveEditorStretch.addEventListener("change", () => {
      const checked = ctx.liveEditorStretch.checked;
      applyLiveEditorValue("stretchToPolygon", checked);
      ctx.liveEditorWidth.disabled = checked;
      ctx.liveEditorHeight.disabled = checked;
      ctx.liveEditorOffsetX.disabled = checked;
      ctx.liveEditorOffsetY.disabled = checked;
    });
    ctx.liveEditorWidth.addEventListener("input", () => {
      const value = Math.max(0.1, Math.min(10, Number(ctx.liveEditorWidth.value)));
      ctx.liveEditorWidthValue.textContent = value.toFixed(2);
      applyLiveEditorValue("widthScale", value);
    });
    ctx.liveEditorHeight.addEventListener("input", () => {
      const value = Math.max(0.1, Math.min(10, Number(ctx.liveEditorHeight.value)));
      ctx.liveEditorHeightValue.textContent = value.toFixed(2);
      applyLiveEditorValue("heightScale", value);
    });
    ctx.liveEditorOffsetX.addEventListener("input", () => {
      const value = Math.max(-1, Math.min(1, Number(ctx.liveEditorOffsetX.value)));
      ctx.liveEditorOffsetXValue.textContent = value.toFixed(2);
      applyLiveEditorValue("offsetXScale", value);
    });
    ctx.liveEditorOffsetY.addEventListener("input", () => {
      const value = Math.max(-1, Math.min(1, Number(ctx.liveEditorOffsetY.value)));
      ctx.liveEditorOffsetYValue.textContent = value.toFixed(2);
      applyLiveEditorValue("offsetYScale", value);
    });
    // Phase 21-1: outside-specific knobs. Populated + shown in
    // openLiveEditor when the target is a running outside global
    // animation.
    ctx.liveEditorOutsideMode?.addEventListener("change", () => {
      const value = ctx.liveEditorOutsideMode.value === "immersive" ? "immersive" : "standard";
      applyLiveEditorValue("mode", value);
    });
    ctx.liveEditorOutsideDirection?.addEventListener("change", () => {
      const value = ctx.liveEditorOutsideDirection.value === "reverse" ? "reverse" : "forward";
      applyLiveEditorValue("direction", value);
    });
    // Phase 21-1: coded-specific Color picker — only surfaced when the
    // underlying coded effect is `solid-color`. Keeps non-solid-color
    // animations uncluttered.
    ctx.liveEditorColor?.addEventListener("input", () => {
      const raw = String(ctx.liveEditorColor.value || "").trim();
      const value = /^#[0-9a-f]{6}$/i.test(raw) ? raw : "#ff0000";
      applyLiveEditorValue("colorHex", value);
    });
  }

  let liveEditorDirty = false;

  function markLiveEditorDirty() {
    if (liveEditorDirty) return;
    liveEditorDirty = true;
    if (ctx.liveEditorPanel) {
      ctx.liveEditorPanel.classList.add("has-unsaved");
    }
    if (ctx.liveEditorClose) {
      ctx.liveEditorClose.textContent = "Done (save)";
    }
  }

  function openLiveEditor(animationId) {
    const { state } = ctx;
    const animation = state.runningAnimations.find((item) => item?.id === animationId);
    if (!animation) {
      closeLiveEditor();
      return;
    }
    liveEditorAnimationId = animationId;
    liveEditorDirty = false;
    // Snapshot the original values so Discard can restore them.
    liveEditorSnapshot = {
      opacity: animation.opacity,
      intensity: animation.intensity,
      speed: animation.speed,
      playbackSpeed: animation.playbackSpeed,
      soundVolume: animation.soundVolume,
      rotationDeg: animation.rotationDeg,
      stretchToPolygon: animation.stretchToPolygon,
      widthScale: animation.widthScale,
      heightScale: animation.heightScale,
      offsetXScale: animation.offsetXScale,
      offsetYScale: animation.offsetYScale,
      // Phase 21-1: outside instance fields.
      mode: animation.mode,
      direction: animation.direction,
      // Phase 21-1: coded-specific (solid-color) per-instance color.
      colorHex: animation.colorHex,
    };
    ctx.liveEditorPanel.hidden = false;
    // Phase 21-1: auto-scroll the panel into view so the user sees the
    // editor open. The running-animations list can sit far below the
    // viewport and a silent panel-unhide was easy to miss.
    if (typeof ctx.liveEditorPanel.scrollIntoView === "function") {
      try {
        ctx.liveEditorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
        ctx.liveEditorPanel.scrollIntoView();
      }
    }
    if (ctx.liveEditorPanel) {
      ctx.liveEditorPanel.classList.remove("has-unsaved");
    }
    if (ctx.liveEditorClose) {
      ctx.liveEditorClose.textContent = "Done";
    }

    // Build a descriptive title: animation name + room/cluster name.
    const effectLabel = animation.animationName || animation.type || "Animation";
    const board = ctx.getBoard(animation.boardId);
    let targetLabel = "";
    if (animation.scope === "room" && animation.roomId) {
      const room = board.rooms.find((r) => r.id === animation.roomId);
      targetLabel = room?.name ?? room?.label ?? animation.roomId;
    } else if (animation.scope === "cluster") {
      const cluster = ctx.getClusterTargetById(animation.clusterId, animation.boardId);
      targetLabel = cluster?.name ?? animation.clusterName ?? "Cluster";
    }
    ctx.liveEditorTitle.textContent = targetLabel
      ? `Editing: ${effectLabel} — ${targetLabel}`
      : `Editing: ${effectLabel}`;

    // Populate sliders from current animation values.
    const opacity = ctx.clampRoomOpacity(animation.opacity ?? 0.9);
    ctx.liveEditorOpacity.value = String(opacity);
    ctx.liveEditorOpacityValue.textContent = opacity.toFixed(2);

    const intensity = ctx.clampRoomIntensity(animation.intensity ?? 1);
    ctx.liveEditorIntensity.value = String(intensity);
    ctx.liveEditorIntensityValue.textContent = intensity.toFixed(2);

    const speed = ctx.clampRoomSpeed(animation.speed ?? 1);
    ctx.liveEditorSpeed.value = String(speed);
    ctx.liveEditorSpeedValue.textContent = `${speed.toFixed(2)}x`;

    const soundVolume = Math.round(ctx.clampRoomSoundVolume(animation.soundVolume ?? 1) * 100);
    ctx.liveEditorSoundVolume.value = String(soundVolume);
    ctx.liveEditorSoundVolumeValue.textContent = `${soundVolume}%`;

    // Transform fields — only visible for mp4/gif asset types.
    const assetType = String(animation.roomAssetType ?? "").toLowerCase();
    const showTransform = assetType === "mp4" || assetType === "gif";
    ctx.liveEditorTransform.hidden = !showTransform;

    if (showTransform) {
      const rotationDeg = Math.max(-180, Math.min(180, Number(animation.rotationDeg ?? 0)));
      ctx.liveEditorRotation.value = String(rotationDeg);
      ctx.liveEditorRotationValue.textContent = `${rotationDeg}°`;

      const stretched = Boolean(animation.stretchToPolygon);
      ctx.liveEditorStretch.checked = stretched;

      const widthScale = Math.max(0.1, Math.min(10, Number(animation.widthScale ?? 1)));
      ctx.liveEditorWidth.value = String(widthScale);
      ctx.liveEditorWidthValue.textContent = widthScale.toFixed(2);

      const heightScale = Math.max(0.1, Math.min(10, Number(animation.heightScale ?? 1)));
      ctx.liveEditorHeight.value = String(heightScale);
      ctx.liveEditorHeightValue.textContent = heightScale.toFixed(2);

      const offsetXScale = Math.max(-1, Math.min(1, Number(animation.offsetXScale ?? 0)));
      ctx.liveEditorOffsetX.value = String(offsetXScale);
      ctx.liveEditorOffsetXValue.textContent = offsetXScale.toFixed(2);

      const offsetYScale = Math.max(-1, Math.min(1, Number(animation.offsetYScale ?? 0)));
      ctx.liveEditorOffsetY.value = String(offsetYScale);
      ctx.liveEditorOffsetYValue.textContent = offsetYScale.toFixed(2);

      ctx.liveEditorWidth.disabled = stretched;
      ctx.liveEditorHeight.disabled = stretched;
      ctx.liveEditorOffsetX.disabled = stretched;
      ctx.liveEditorOffsetY.disabled = stretched;
    }

    // Phase 21-1: solid-color coded backbone — surface the Color picker
    // in the Live Editor only when the currently-running animation's
    // coded effect resolves to solid-color. Covers room-scoped coded
    // solid-color triggers (the main use case — "white lamp" clusters).
    if (ctx.liveEditorColor || ctx.liveEditorColorLabel) {
      let showColor = false;
      let effectiveColor = "#ff0000";
      if ((animation.scope === "room" || animation.scope === "cluster")
        && typeof ctx.resolveRoomCodedEffectType === "function") {
        const assetType = typeof ctx.normalizeRoomAssetType === "function"
          ? ctx.normalizeRoomAssetType(animation.roomAssetType)
          : animation.roomAssetType;
        if (assetType === "coded") {
          const resolved = ctx.resolveRoomCodedEffectType(animation.roomAssetRef || animation.type);
          showColor = resolved === "solid-color";
        }
      }
      if (showColor) {
        const def = typeof ctx.getRoomAnimationDefinitionById === "function"
          ? ctx.getRoomAnimationDefinitionById(animation.type, animation.boardId)
          : null;
        const raw = String(animation.colorHex ?? def?.colorHex ?? "#ff0000").trim();
        effectiveColor = /^#[0-9a-f]{6}$/i.test(raw) ? raw : "#ff0000";
      }
      if (ctx.liveEditorColorLabel) {
        ctx.liveEditorColorLabel.style.display = showColor ? "" : "none";
      }
      if (ctx.liveEditorColor && showColor) {
        ctx.liveEditorColor.value = effectiveColor;
      }
    }

    // Phase 21-1: outside-specific knobs (mode/direction) for coded
    // outside backbones. Only show for global-scope animations whose
    // type is in the board's outside profile — other globals (inside)
    // don't have these concepts.
    const showOutsideFx = animation.scope === "global"
      && typeof ctx.isOutsideAnimationType === "function"
      && ctx.isOutsideAnimationType(animation.type, animation.boardId);
    if (ctx.liveEditorOutsideFx) {
      ctx.liveEditorOutsideFx.hidden = !showOutsideFx;
    }
    if (showOutsideFx) {
      // Fallback to the definition when the instance doesn't carry
      // mode/direction yet (e.g. legacy running animation pre-Phase 21).
      const outsideProfile = ctx.getOutsideFxProfile(animation.boardId);
      const definition = outsideProfile?.animations?.find((entry) => entry?.id === animation.type) ?? null;
      const effectiveMode = animation.mode ?? definition?.mode ?? "standard";
      const effectiveDirection = animation.direction ?? definition?.direction ?? "forward";
      if (ctx.liveEditorOutsideMode) {
        ctx.liveEditorOutsideMode.value = effectiveMode === "immersive" ? "immersive" : "standard";
      }
      if (ctx.liveEditorOutsideDirection) {
        ctx.liveEditorOutsideDirection.value = effectiveDirection === "reverse" ? "reverse" : "forward";
      }
    }

    const defaults = ctx.state.defaultAnimationsByBoard[animation.boardId] || [];
    const isDefault = defaults.some(d => d.type === animation.type && d.roomId === animation.roomId && d.scope === animation.scope);
    if (ctx.liveEditorDefault) ctx.liveEditorDefault.checked = isDefault;
  }

  function discardLiveEditor() {
    if (liveEditorAnimationId !== null && liveEditorSnapshot) {
      const animation = ctx.state.runningAnimations.find(
        (item) => item?.id === liveEditorAnimationId,
      );
      if (animation) {
        Object.assign(animation, liveEditorSnapshot);
      }
    }
    liveEditorAnimationId = null;
    liveEditorSnapshot = null;
    liveEditorDirty = false;
    ctx.liveEditorPanel.hidden = true;
  }

  function closeLiveEditor() {
    if (liveEditorAnimationId !== null) {
      const animation = ctx.state.runningAnimations.find(
        (item) => item?.id === liveEditorAnimationId,
      );
      if (animation) {
        const makeDefault = Boolean(ctx.liveEditorDefault?.checked);
        if (!ctx.state.defaultAnimationsByBoard[animation.boardId]) {
          ctx.state.defaultAnimationsByBoard[animation.boardId] = [];
        }
        const defaults = ctx.state.defaultAnimationsByBoard[animation.boardId];
        // Remove any existing default for same type+roomId+scope
        const filtered = defaults.filter(d => !(d.type === animation.type && d.roomId === animation.roomId && d.scope === animation.scope));
        if (makeDefault) {
          filtered.push({
            type: animation.type,
            animationName: animation.animationName,
            scope: animation.scope,
            roomId: animation.roomId,
            boardId: animation.boardId,
            clusterId: animation.clusterId,
            clusterName: animation.clusterName,
            roomAssetType: animation.roomAssetType,
            roomAssetRef: animation.roomAssetRef,
            soundAssetRef: animation.soundAssetRef,
            opacity: animation.opacity,
            intensity: animation.intensity,
            speed: animation.speed,
            soundVolume: animation.soundVolume,
            rotationDeg: animation.rotationDeg,
            stretchToPolygon: animation.stretchToPolygon,
            widthScale: animation.widthScale,
            heightScale: animation.heightScale,
            offsetXScale: animation.offsetXScale,
            offsetYScale: animation.offsetYScale,
            // Phase 21-1: persist the per-instance color on the default
            // so autostart reloads pick it back up. Without this, the
            // autostart path re-created the animation with the red
            // factory default every time.
            colorHex: animation.colorHex,
          });
        }
        ctx.state.defaultAnimationsByBoard[animation.boardId] = filtered;
        // Persist transform changes back to the animation definition
        // so they survive a page reload. Uses the direct
        // saveAndCaptureCleanBaseline path so the apply/discard bar
        // does NOT appear — the live editor "Done" button is the
        // user's explicit commit action.
        if (animation.scope === "room" || animation.scope === "cluster") {
          const profile = ctx.getRoomFxProfile(animation.boardId);
          const definition = profile.animations.find(
            (entry) => entry.id === animation.type,
          );
          if (definition) {
            const nextProfile = ctx.normalizeRoomFxProfile({
              ...profile,
              animations: profile.animations.map((entry) =>
                entry.id !== definition.id
                  ? entry
                  : {
                    ...entry,
                    rotationDeg: animation.rotationDeg ?? entry.rotationDeg,
                    stretchToPolygon: animation.stretchToPolygon ?? entry.stretchToPolygon,
                    widthScale: animation.widthScale ?? entry.widthScale,
                    heightScale: animation.heightScale ?? entry.heightScale,
                    offsetXScale: animation.offsetXScale ?? entry.offsetXScale,
                    offsetYScale: animation.offsetYScale ?? entry.offsetYScale,
                  },
              ),
            });
            ctx.setRoomFxProfile(animation.boardId, nextProfile);
            // Save directly to server + advance the clean baseline so
            // the dirty-flag bar doesn't trigger.
            void ctx.saveAndCaptureCleanBaseline().catch(() => {});
          }
        }
        // Broadcast the updated animation values to all clients
        // (including /output/final) via an edit-room live mutation.
        void ctx.emitLiveMutation("edit-room", {
          animationId: animation.id,
          animation: ctx.buildAnimationSnapshotForLiveSync(animation),
        }).catch(() => {});
        // Phase 21-1: for cluster-scope edits, also broadcast each
        // linked room child so the server + other clients carry the
        // propagated field values. Without this, the next snapshot
        // from the server reverts member intensity/opacity back to
        // the pre-edit state (server never saw the child updates).
        if (animation.scope === "cluster") {
          for (const child of ctx.state.runningAnimations) {
            if (child?.parentClusterRunId === animation.id && child?.scope === "room") {
              void ctx.emitLiveMutation("edit-room", {
                animationId: child.id,
                animation: ctx.buildAnimationSnapshotForLiveSync(child),
              }).catch(() => {});
            }
          }
        }
      }
    }
    liveEditorAnimationId = null;
    ctx.liveEditorPanel.hidden = true;
  }

  function applyLiveEditorValue(field, value) {
    const { state } = ctx;
    if (liveEditorAnimationId === null) {
      return;
    }
    const animation = state.runningAnimations.find((item) => item?.id === liveEditorAnimationId);
    if (animation) {
      animation[field] = value;
      // Phase 21-1: for cluster-scope edits, propagate the field to every
      // linked room-scoped child. Without this, the draw loop reads
      // memberAnimation[field] on each child (which never changes after
      // spawn) and the Live Editor slider appears inert — most obvious
      // with solid-color intensity/opacity in an "all rooms" cluster.
      if (animation.scope === "cluster") {
        for (const entry of state.runningAnimations) {
          if (entry?.parentClusterRunId === animation.id && entry?.scope === "room") {
            entry[field] = value;
          }
        }
      }
      markLiveEditorDirty();
    }
  }

  function collectAnimationStopIds(targetAnimation, { mutateClusterMembership = false } = {}) {
    const { state, getClusterMemberAnimationIds } = ctx;
    const idsToStop = new Set();
    if (!targetAnimation || typeof targetAnimation.id !== "string") {
      return idsToStop;
    }
    idsToStop.add(targetAnimation.id);
    if (targetAnimation.scope === "cluster") {
      for (const memberId of getClusterMemberAnimationIds(targetAnimation)) {
        idsToStop.add(memberId);
      }
    }
    if (targetAnimation.scope === "room" && targetAnimation.parentClusterRunId) {
      const parentCluster = state.runningAnimations.find(
        (entry) => entry?.id === targetAnimation.parentClusterRunId && entry?.scope === "cluster",
      );
      if (parentCluster) {
        const nextMemberAnimationIds = getClusterMemberAnimationIds(parentCluster)
          .filter((memberId) => memberId !== targetAnimation.id);
        if (mutateClusterMembership) {
          parentCluster.memberAnimationIds = nextMemberAnimationIds;
          parentCluster.memberRoomIds = nextMemberAnimationIds
            .map((memberId) => state.runningAnimations.find((entry) => entry?.id === memberId)?.roomId ?? null)
            .filter(Boolean);
        }
        if (nextMemberAnimationIds.length === 0) {
          idsToStop.add(parentCluster.id);
        }
      }
    }
    return idsToStop;
  }

  function isStopPendingForAnimationId(animationId) {
    return typeof animationId === "string" && ctx.liveSync.pendingStopAnimationIds.has(animationId);
  }

  function markStopPending(animationIds) {
    for (const animationId of animationIds) {
      if (typeof animationId === "string" && animationId) {
        ctx.liveSync.pendingStopAnimationIds.add(animationId);
      }
    }
  }

  function clearStopPending(animationIds) {
    for (const animationId of animationIds) {
      if (typeof animationId === "string" && animationId) {
        ctx.liveSync.pendingStopAnimationIds.delete(animationId);
      }
    }
  }

  function reconcileStopPendingFromSnapshot() {
    const { state, liveSync } = ctx;
    if (liveSync.pendingStopAnimationIds.size === 0) {
      return;
    }
    const runningIds = new Set(
      state.runningAnimations
        .map((animation) => (typeof animation?.id === "string" ? animation.id : null))
        .filter(Boolean),
    );
    for (const pendingId of [...liveSync.pendingStopAnimationIds]) {
      if (!runningIds.has(pendingId)) {
        liveSync.pendingStopAnimationIds.delete(pendingId);
      }
    }
  }

  function buildStopCommandTargetMeta(targetAnimation) {
    if (!targetAnimation || typeof targetAnimation !== "object") {
      return {};
    }
    const targetScope = typeof targetAnimation.scope === "string" ? targetAnimation.scope.trim() : "";
    const targetType = typeof targetAnimation.type === "string" ? targetAnimation.type.trim() : "";
    const boardId = typeof targetAnimation.boardId === "string" ? targetAnimation.boardId.trim() : "";
    return {
      ...(targetScope ? { targetScope } : {}),
      ...(targetType ? { targetType } : {}),
      ...(boardId ? { boardId } : {}),
      ...(targetScope === "global"
        && (ctx.isOutsideAnimationType?.(targetType, boardId) || targetType === "outside-space")
        ? { outsideHint: true }
        : {}),
    };
  }

  function emitStopAnimationCommand(animationId, { priorityHint = "high", targetAnimation = null } = {}) {
    const { state, emitLiveMutation, STOP_ANIMATION_MUTATION_TYPE } = ctx;
    if (typeof animationId !== "string" || !animationId.trim()) {
      return Promise.reject(new Error("invalid animationId for stop command"));
    }
    const animationForMeta =
      targetAnimation
      ?? state.runningAnimations.find((entry) => entry?.id === animationId)
      ?? null;
    return emitLiveMutation(STOP_ANIMATION_MUTATION_TYPE, {
      animationId,
      priorityHint,
      ...buildStopCommandTargetMeta(animationForMeta),
    });
  }

  function stopAnimation(animationId) {
    const {
      state, getOutputRole, OUTPUT_ROLE_CONTROL,
      triggerFeedback, stopAnimationSound, clearRoomDraftEditTarget,
      updateOutsideFxProfile, persistBoardProfiles, syncOutsideFxPanel,
    } = ctx;
    const target = state.runningAnimations.find((item) => item.id === animationId) ?? null;
    if (!target) {
      return;
    }
    const idsToStop = collectAnimationStopIds(target, { mutateClusterMembership: true });
    if (getOutputRole() === OUTPUT_ROLE_CONTROL) {
      const idsToDispatch = [...idsToStop].filter((id) => !isStopPendingForAnimationId(id));
      if (idsToDispatch.length === 0) {
        triggerFeedback.textContent = `Pending: stop command for ${idsToStop.size} animation(s) already in flight`;
        return;
      }
      markStopPending(idsToDispatch);
      const commandPairs = idsToDispatch.map((id) => {
        const commandTarget = state.runningAnimations.find((entry) => entry?.id === id) ?? (id === target.id ? target : null);
        return [id, emitStopAnimationCommand(id, {
          priorityHint: "high",
          targetAnimation: commandTarget,
        })];
      });
      void Promise.allSettled(commandPairs.map(([, promise]) => promise)).then((results) => {
        const failedIds = results
          .map((result, index) => (result.status === "rejected" ? commandPairs[index][0] : null))
          .filter(Boolean);
        if (failedIds.length > 0) {
          clearStopPending(failedIds);
          triggerFeedback.textContent = `Status: stop command failed for ${failedIds.length} animation(s)`;
          return;
        }
        triggerFeedback.textContent = `Pending: stop command for ${idsToDispatch.length} animation(s) accepted (waiting for snapshot)`;
      });
      return;
    }
    for (const id of idsToStop) {
      stopAnimationSound(id);
    }
    state.runningAnimations = state.runningAnimations.filter((item) => !idsToStop.has(item.id));
    if (state.roomDraft.editTargetId && idsToStop.has(state.roomDraft.editTargetId)) {
      clearRoomDraftEditTarget();
    }
    if (target?.scope === "global"
      && (ctx.isOutsideAnimationType?.(target.type, target.boardId)
        || target.type === "outside-space")) {
      updateOutsideFxProfile(target.boardId, { enabled: false });
      persistBoardProfiles();
      if (target.boardId === state.boardId) {
        syncOutsideFxPanel();
      }
    }
    renderRunningAnimationsList();
    refreshGlobalButtons();
    for (const id of idsToStop) {
      const commandTarget = state.runningAnimations.find((entry) => entry?.id === id) ?? (id === target.id ? target : null);
      void emitStopAnimationCommand(id, {
        priorityHint: "high",
        targetAnimation: commandTarget,
      });
    }
  }

  function editAnimation(animationId) {
    const {
      state, switchBoard, getClusterTargetById, getRoomAnimationDefinitionById,
      normalizeRoomAssetType, normalizeRoomAssetRefForType, clampRoomOpacity,
      clampRoomIntensity, clampRoomSpeed, clampRoomSoundVolume, clampRoomDurationSec,
      clampClusterStaggerOffsetMs, isRoomAnimationType,
      roomAnimationSelect, roomOpacityInput, roomOpacityValue,
      roomIntensityInput, roomIntensityValue, roomSpeedInput, roomSpeedValue,
      roomSoundVolumeInput, roomSoundVolumeValue, roomDurationInput,
      roomStaggerStartInput, syncRoomStaggerOffsetControl, syncRoomDraftActionButton,
      syncRoomPanelFromSelection, renderRoomOverlay, triggerFeedback,
    } = ctx;
    const animation = state.runningAnimations.find((item) => item.id === animationId);
    if (!animation || (animation.scope !== "room" && animation.scope !== "cluster") || !isRoomAnimationType(animation.type)) {
      return;
    }
    switchBoard(animation.boardId, {
      emitLiveContext: true,
      reason: "edit-room-focus",
    });
    const isClusterScope = animation.scope === "cluster";
    const clusterTarget = isClusterScope
      ? getClusterTargetById(animation.clusterId, animation.boardId)
      : null;
    const fallbackRoomId = isClusterScope
      ? clusterTarget?.roomIds?.[0] ?? null
      : animation.roomId;
    state.selectedRoomId = fallbackRoomId;
    if (fallbackRoomId) {
      state.selectedRoomByBoard[animation.boardId] = fallbackRoomId;
    }
    state.roomDraft.targetType = isClusterScope ? "cluster" : "room";
    state.roomDraft.targetId = isClusterScope
      ? (clusterTarget?.clusterId ?? animation.clusterId ?? null)
      : animation.roomId;
    const roomDefinition = getRoomAnimationDefinitionById(animation.type, animation.boardId);
    const definitionAssetType = normalizeRoomAssetType(
      animation.roomAssetType ?? roomDefinition?.assetType,
    );
    const definitionAssetRef = normalizeRoomAssetRefForType(
      definitionAssetType,
      animation.roomAssetRef ?? roomDefinition?.assetRef,
      roomDefinition?.assetRef,
    );
    state.roomDraft.editTargetId = animation.id;
    state.roomDraft.animationId = animation.type;
    state.roomDraft.opacity = clampRoomOpacity(animation.opacity ?? 0.9);
    state.roomDraft.intensity = clampRoomIntensity(animation.intensity);
    state.roomDraft.speed = clampRoomSpeed(animation.speed ?? 1);
    state.roomDraft.soundVolume = clampRoomSoundVolume(animation.soundVolume ?? 1);
    state.roomDraft.durationSec = animation.durationMs
      ? clampRoomDurationSec(Math.round(animation.durationMs / 1000))
      : 18;
    state.roomDraft.staggerStart = isClusterScope
      ? animation.clusterStartMode === "staggered"
      : state.roomDraft.staggerStart;
    state.roomDraft.staggerOffsetMs = isClusterScope
      ? clampClusterStaggerOffsetMs(animation.clusterStartOffsetMs)
      : clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);

    if (!animation.roomAssetType || !animation.roomAssetRef) {
      animation.roomAssetType = definitionAssetType;
      animation.roomAssetRef = definitionAssetRef;
    }

    roomAnimationSelect.value = state.roomDraft.animationId;
    roomOpacityInput.value = String(state.roomDraft.opacity);
    roomOpacityValue.textContent = state.roomDraft.opacity.toFixed(2);
    roomIntensityInput.value = String(state.roomDraft.intensity);
    roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
    roomSpeedInput.value = String(state.roomDraft.speed);
    roomSpeedValue.textContent = `${state.roomDraft.speed.toFixed(2)}x`;
    roomSoundVolumeInput.value = String(Math.round(state.roomDraft.soundVolume * 100));
    roomSoundVolumeValue.textContent = `${Math.round(state.roomDraft.soundVolume * 100)}%`;
    roomDurationInput.value = String(state.roomDraft.durationSec);
    if (roomStaggerStartInput) {
      roomStaggerStartInput.checked = state.roomDraft.staggerStart;
    }
    syncRoomStaggerOffsetControl();
    syncRoomDraftActionButton();

    syncRoomPanelFromSelection({ preserveDraftState: true });
    renderRoomOverlay();
    triggerFeedback.textContent = `Status: ${animation.id} loaded into editor${isClusterScope ? " (cluster)" : ""}`;
  }

  function renderRunningAnimationsList() {
    const {
      state, runningAnimationsList, triggerFeedback,
      getRunningAnimationsForList, getRoomAnimationLabelById, getAnimationLabel,
      getBoard, getClusterTargetById, getGlobalCategoryRuntimeLabel,
      clampRoomOpacity, clampRoomSpeed, clampRoomSoundVolume,
      clampClusterStaggerOffsetMs, getRoomGifAssetFileName, getRoomEquivalentType,
      getClusterMemberAnimationIds, shouldSuppressRapidTap, setDashboardZone,
    } = ctx;
    // Auto-close live editor if the animation it targets no longer exists.
    if (liveEditorAnimationId !== null) {
      const editorAnimationStillRunning = state.runningAnimations.some(
        (item) => item?.id === liveEditorAnimationId,
      );
      if (!editorAnimationStillRunning) {
        closeLiveEditor();
      }
    }
    const parity = validateRunningListParity();
    runningAnimationsList.replaceChildren();
    const listAnimations = getRunningAnimationsForList();
    // Phase 22 W2b / W5: topbar running-count chip — split into
    // default (auto-restoring) and custom (ad-hoc) animation counts.
    // An animation counts as "default" when its (type, roomId, scope)
    // triple is present in state.defaultAnimationsByBoard for its
    // board; everything else is "custom". Each line hides when its
    // count is zero; the whole chip hides when both are zero.
    const allRunning = Array.isArray(state.runningAnimations)
      ? state.runningAnimations
      : [];
    const totalRunning = allRunning.length;
    const defaultsByBoard = state.defaultAnimationsByBoard || {};
    let defaultCount = 0;
    for (const anim of allRunning) {
      const defs = defaultsByBoard[anim?.boardId] || [];
      const explicitDefault = defs.some(
        (d) => d.type === anim.type && d.roomId === anim.roomId && d.scope === anim.scope,
      );
      // Phase 22 W5 fix: outside animations persist via the outside
      // profile's `enabled` flag, not through defaultAnimationsByBoard.
      // They still auto-restart on reload, so they belong in the
      // "default" count. scope === "global" covers outside-ship
      // animations that the outside FX panel pushes into runningAnimations.
      const impliedAutostart = anim?.scope === "global";
      if (explicitDefault || impliedAutostart) defaultCount += 1;
    }
    const customCount = totalRunning - defaultCount;
    if (ctx.runningCountChip) {
      ctx.runningCountChip.hidden = totalRunning === 0;
    }
    if (ctx.runningCountChipLabelDefault) {
      ctx.runningCountChipLabelDefault.hidden = defaultCount === 0;
      ctx.runningCountChipLabelDefault.textContent = `${defaultCount} default`;
    }
    if (ctx.runningCountChipLabelCustom) {
      ctx.runningCountChipLabelCustom.hidden = customCount === 0;
      ctx.runningCountChipLabelCustom.textContent = `${customCount} custom`;
    }
    if (ctx.runningCountChipLabel) {
      // Keep the single-line summary for screen readers + legacy
      // consumers.
      ctx.runningCountChipLabel.textContent = `${totalRunning} running`;
    }
    if (listAnimations.length === 0) {
      const empty = document.createElement("li");
      empty.className = "running-empty";
      empty.textContent = "No active animations";
      runningAnimationsList.append(empty);
      return;
    }

    // Phase 21-1: categorize into Outside / Inside / Cluster / Room /
    // Frozen sections with a heading per section, and sort newest-first
    // (by startedAt) within each section. Empty sections are omitted.
    // Frozen-room animations are pulled out of the Room/Cluster buckets
    // so the user can see at-a-glance what's playing in rooms they've
    // explicitly frozen.
    const isFrozenRoomAnim = (anim) => {
      if (typeof ctx.isRoomFrozen !== "function") return false;
      if (anim.scope === "room" && anim.roomId) {
        return ctx.isRoomFrozen(anim.boardId, anim.roomId);
      }
      return false;
    };
    const bucketFor = (anim) => {
      if (isFrozenRoomAnim(anim)) return "freezed";
      if (anim.scope === "cluster") return "cluster";
      if (anim.scope === "room") return "room";
      // scope === "global" — split outside vs inside by category label.
      const label = typeof getGlobalCategoryRuntimeLabel === "function"
        ? String(getGlobalCategoryRuntimeLabel(anim.type)).toLowerCase()
        : "";
      if (label === "outside" || label.includes("outside")) return "outside";
      return "inside";
    };
    const buckets = { outside: [], inside: [], cluster: [], room: [], freezed: [] };
    for (const anim of listAnimations) {
      const key = bucketFor(anim);
      if (buckets[key]) buckets[key].push(anim);
    }
    for (const key of Object.keys(buckets)) {
      buckets[key].sort((a, b) => {
        const startedDelta = Number(b.startedAt || 0) - Number(a.startedAt || 0);
        if (startedDelta !== 0) return startedDelta;
        return String(a.id || "").localeCompare(String(b.id || ""));
      });
    }
    const sectionMeta = [
      { key: "outside", label: "Outside" },
      { key: "inside", label: "Inside" },
      { key: "cluster", label: "Cluster" },
      { key: "room", label: "Room" },
      { key: "freezed", label: "Frozen Rooms" },
    ];
    // Phase 22 W2d: within Room / Cluster / Frozen sections, animations
    // are further grouped by the room or cluster they target so the
    // user can see at a glance when multiple animations are stacked
    // inside one room. Outside + Inside stay flat (they apply board-
    // wide). The secondary sort is still newest-first within each
    // subgroup so the most-recently-triggered anim is on top.
    const GROUPED_SECTIONS = new Set(["room", "cluster", "freezed"]);
    const subgroupKeyFor = (anim) => {
      if (anim.scope === "room") return `room:${anim.roomId}`;
      if (anim.scope === "cluster") return `cluster:${anim.clusterId}`;
      return null;
    };
    const subgroupLabelFor = (anim) => {
      if (anim.scope === "room") {
        const board = getBoard(anim.boardId);
        return board.rooms.find((r) => r.id === anim.roomId)?.label ?? anim.roomId;
      }
      if (anim.scope === "cluster") {
        return anim.clusterName
          ?? getClusterTargetById(anim.clusterId, anim.boardId)?.name
          ?? anim.clusterId
          ?? "Cluster";
      }
      return "";
    };
    const sortedAnimations = [];
    const sectionKeyByAnimationId = new Map();
    const sectionLabelByKey = new Map();
    const sectionCountByKey = new Map();
    for (const { key, label } of sectionMeta) {
      const entries = buckets[key];
      if (!entries || entries.length === 0) continue;
      sectionLabelByKey.set(key, label);
      sectionCountByKey.set(key, entries.length);
      let orderedEntries = entries;
      if (GROUPED_SECTIONS.has(key)) {
        // Cluster members (rooms) together; rooms with more active
        // animations appear first so stacks are visually prominent.
        const byKey = new Map();
        for (const anim of entries) {
          const k = subgroupKeyFor(anim) ?? `_:${anim.id}`;
          if (!byKey.has(k)) byKey.set(k, []);
          byKey.get(k).push(anim);
        }
        const orderedKeys = [...byKey.keys()].sort((a, b) => {
          const la = byKey.get(a).length;
          const lb = byKey.get(b).length;
          if (lb !== la) return lb - la;
          return String(a).localeCompare(String(b));
        });
        orderedEntries = [];
        for (const k of orderedKeys) {
          const rooms = byKey.get(k);
          rooms.sort((a, b) =>
            Number(b.startedAt || 0) - Number(a.startedAt || 0),
          );
          orderedEntries.push(...rooms);
        }
      }
      for (const anim of orderedEntries) {
        sectionKeyByAnimationId.set(anim.id, key);
        sortedAnimations.push(anim);
      }
    }
    let lastSectionKey = null;
    let lastSubgroupKey = null;
    const subgroupCounts = new Map();
    // Pre-count so we know which rooms/clusters have a real stack
    // (> 1 anim) and therefore deserve a visual sub-cluster header.
    // Rooms with a single animation stay flat so the list doesn't
    // gain an extra heading per row in the common case.
    for (const anim of sortedAnimations) {
      const sk = sectionKeyByAnimationId.get(anim.id);
      if (!GROUPED_SECTIONS.has(sk)) continue;
      const gk = subgroupKeyFor(anim);
      if (!gk) continue;
      subgroupCounts.set(gk, (subgroupCounts.get(gk) || 0) + 1);
    }
    const stackedSubgroups = new Set();
    for (const [gk, count] of subgroupCounts) {
      if (count > 1) stackedSubgroups.add(gk);
    }
    for (const anim of sortedAnimations) {
      const sectionKey = sectionKeyByAnimationId.get(anim.id);
      if (sectionKey && sectionKey !== lastSectionKey) {
        const heading = document.createElement("li");
        heading.className = `running-section-heading running-section-${sectionKey}`;
        heading.setAttribute("role", "presentation");
        heading.textContent = `${sectionLabelByKey.get(sectionKey)} (${sectionCountByKey.get(sectionKey)})`;
        runningAnimationsList.append(heading);
        lastSectionKey = sectionKey;
        lastSubgroupKey = null;
      }
      const subKey = GROUPED_SECTIONS.has(sectionKey) ? subgroupKeyFor(anim) : null;
      const isStacked = subKey && stackedSubgroups.has(subKey);
      if (isStacked && subKey !== lastSubgroupKey) {
        const subLabel = subgroupLabelFor(anim);
        const count = subgroupCounts.get(subKey);
        const subHeading = document.createElement("li");
        subHeading.className = "running-subgroup-heading";
        subHeading.setAttribute("role", "presentation");
        const name = document.createElement("span");
        name.className = "running-subgroup-name";
        name.textContent = subLabel;
        subHeading.append(name);
        const countChip = document.createElement("span");
        countChip.className = "running-subgroup-count";
        countChip.textContent = `${count} anims`;
        subHeading.append(countChip);
        runningAnimationsList.append(subHeading);
        lastSubgroupKey = subKey;
      } else if (!isStacked) {
        lastSubgroupKey = null;
      }
      const li = document.createElement("li");
      li.className = "running-item";
      if (isStacked) {
        li.classList.add("running-item-grouped");
      }
      // Phase 22 W2d: icon tile prepended to each row. Tint driven by
      // data-scope; glyph resolved from the animation definition via
      // ctx.getRoomAnimationDefinitionById (room + cluster scope), or
      // synthesized directly from anim.type for global scope (type IS
      // the coded key there — fire / malfunction / hull-flicker / …).
      const iconWrap = document.createElement("span");
      iconWrap.className = "running-item-icon";
      iconWrap.dataset.scope = sectionKey || "inside";
      iconWrap.setAttribute("aria-hidden", "true");
      const iconsApi = window.TT_BEAMER_UI_ICONS;
      if (iconsApi && typeof iconsApi.createIcon === "function") {
        let def = null;
        if ((anim.scope === "room" || anim.scope === "cluster")
            && typeof ctx.getRoomAnimationDefinitionById === "function") {
          def = ctx.getRoomAnimationDefinitionById(anim.type, anim.boardId);
        }
        const resolverInput = {
          icon: def?.icon ?? null,
          name: def?.name ?? anim.animationName ?? getAnimationLabel(anim.type),
          type: def?.type ?? (anim.scope === "global" ? "coded" : anim.type),
          codedEffectType:
            def?.codedEffectType
            ?? (anim.scope === "global" ? anim.type : null),
          codedKey: def?.codedKey ?? (anim.scope === "global" ? anim.type : null),
          assetType: def?.assetType ?? null,
          assetRef: def?.assetRef ?? null,
        };
        const iconName = iconsApi.resolveAnimationIcon
          ? iconsApi.resolveAnimationIcon(resolverInput)
          : "sparkles";
        iconWrap.append(iconsApi.createIcon(iconName, { size: 18 }));
      }
      li.append(iconWrap);
      const title = document.createElement("div");
      title.className = "running-title";
      const effectLabel = (anim.scope === "room" || anim.scope === "cluster") && anim.animationName
        ? anim.animationName
        : anim.scope === "room" || anim.scope === "cluster"
          ? getRoomAnimationLabelById(anim.type, anim.boardId)
          : getAnimationLabel(anim.type);
      title.textContent = effectLabel;

      // Phase 22 W2d: compact single-line sub-meta. For non-stacked
      // rooms/clusters we prefix the target name so the user still
      // knows WHICH room/cluster the animation belongs to — stacked
      // rows omit it because the subgroup header already shows it.
      // Outside / Inside sections are board-wide so no target prefix.
      // The "hold" state (no durationMs) is the default for most
      // animations, so we omit the timer entirely in that case —
      // showing "hold" on every row just adds noise.
      const meta = document.createElement("div");
      meta.className = "running-meta";
      const hasTimer = Number(anim.durationMs) > 0;
      const timerLabel = hasTimer
        ? `in ${Math.max(0, Math.ceil((anim.startedAt + anim.durationMs - performance.now()) / 1000))}s`
        : null;
      let targetLabel = null;
      if (!isStacked) {
        if (anim.scope === "room") {
          const board = getBoard(anim.boardId);
          targetLabel = board.rooms.find((r) => r.id === anim.roomId)?.label
            ?? anim.roomId
            ?? null;
        } else if (anim.scope === "cluster") {
          targetLabel = anim.clusterName
            ?? getClusterTargetById(anim.clusterId, anim.boardId)?.name
            ?? anim.clusterId
            ?? null;
        }
      }
      if (targetLabel) {
        const targetEl = document.createElement("span");
        targetEl.className = "running-meta-target";
        targetEl.textContent = targetLabel;
        meta.append(targetEl);
        if (timerLabel) {
          const sep = document.createElement("span");
          sep.className = "running-meta-sep";
          sep.setAttribute("aria-hidden", "true");
          sep.textContent = "·";
          const timerEl = document.createElement("span");
          timerEl.className = "running-meta-timer";
          timerEl.textContent = timerLabel;
          meta.append(sep, timerEl);
        }
      } else if (timerLabel) {
        meta.textContent = timerLabel;
      } else {
        meta.hidden = true;
      }

      const actions = document.createElement("div");
      actions.className = "running-actions";
      const stopButton = document.createElement("button");
      stopButton.type = "button";
      const stopPending = [...collectAnimationStopIds(anim)].some((id) => isStopPendingForAnimationId(id));
      stopButton.textContent = stopPending ? "Stopping..." : "Stop";
      stopButton.disabled = stopPending;
      stopButton.addEventListener("click", () => {
        const pendingAtClick = [...collectAnimationStopIds(anim)].some((id) => isStopPendingForAnimationId(id));
        if (pendingAtClick) {
          return;
        }
        if (shouldSuppressRapidTap(`running-stop-${anim.id}`)) {
          return;
        }
        setDashboardZone("manage");
        stopAnimation(anim.id);
      });
      actions.append(stopButton);

      // Phase 21-1: also allow Live Editor on scope="global" so outside
      // (and inside) running animations can have their per-instance
      // intensity/speed edited, independent of the definition defaults.
      if (anim.scope === "room" || anim.scope === "cluster" || anim.scope === "global") {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => {
          if (shouldSuppressRapidTap(`running-edit-${anim.id}`)) {
            return;
          }
          setDashboardZone("manage");
          openLiveEditor(anim.id);
        });
        actions.append(editButton);
      }

      li.append(title, meta, actions);
      runningAnimationsList.append(li);
    }

    if (!parity.ok) {
      triggerFeedback.textContent = `Status: Running-Liste-Guard meldet Drift (${parity.reason})`;
    }
  }

  function isRunningListInteractionActive() {
    const { runningAnimationsList } = ctx;
    if (!runningAnimationsList) {
      return false;
    }
    if (runningAnimationsList.matches(":hover") || runningAnimationsList.matches(":focus-within")) {
      return true;
    }
    const activeElement = document.activeElement;
    return Boolean(activeElement && runningAnimationsList.contains(activeElement));
  }

  function validateRunningListParity() {
    const { state } = ctx;
    const seenIds = new Set();
    const activeClusterIds = new Set();
    for (const entry of state.runningAnimations) {
      if (!entry?.id || seenIds.has(entry.id)) {
        return { ok: false, reason: "duplicate-or-missing-id" };
      }
      seenIds.add(entry.id);
      if (entry.scope === "cluster") {
        activeClusterIds.add(entry.id);
      }
    }
    for (const entry of state.runningAnimations) {
      if (entry?.scope !== "room" || !entry?.parentClusterRunId) {
        continue;
      }
      if (activeClusterIds.has(entry.parentClusterRunId)) {
        continue;
      }
      return { ok: false, reason: "orphaned-cluster-member" };
    }
    return { ok: true, reason: "ok" };
  }

  function refreshGlobalButtons() {
    const { state } = ctx;
    document.querySelectorAll("button[data-global]").forEach((button) => {
      const type = button.dataset.global;
      const isActive = state.runningAnimations.some(
        (anim) => anim.scope === "global" && anim.type === type && anim.boardId === state.boardId,
      );
      button.classList.toggle("active", isActive);
    });
    // Phase 23 W2: cluster pads share the same state-driven update
    // cadence as the global buttons — running scope flips and board
    // switches both reach refreshGlobalButtons through the existing
    // lifecycle hooks. Piggyback on it instead of wiring a parallel
    // call site.
    try { renderClusterPads(); } catch { /* defensive — never crash render loop */ }
  }

  // Phase 23 W2: cluster pads — artificial mini-rooms next to the
  // board. One pad per cluster on the active board. Each pad is a
  // square div carrying the cluster name + a running-state dot +
  // a clear (×) control. Tap = toggle cluster dispatch via the
  // existing quick-mode flow (sets roomDraft.targetType="cluster"
  // then stops or starts via startRoomAnimationFromDraft).
  // Animation rendering INSIDE the pad lands in the next commit;
  // for now the pad shows name + state only.
  // Phase 23 W2 v6: sync the position:fixed cluster rail to the
  // stage's current screen rect. Called on every renderClusterPads
  // tick + on window resize so the rail tracks pan/zoom in real
  // time. The rail sits outside #stage in the DOM (avoiding the
  // overflow:hidden chain inside the dashboard tree) but visually
  // behaves as if attached to the stage's left edge.
  function updateClusterPadsRect() {
    const container = document.getElementById("cluster-pads");
    if (!container) return;
    const stage = ctx?.stage || document.getElementById("stage");
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0) return;
    // CSS variables — the rail's `transform: translateX(-100%) scale(s)`
    // pulls it leftward by its own width (so its right edge aligns
    // with --rail-left, i.e. stage's left edge), and scales by the
    // current stage scale so pan + zoom track together.
    container.style.setProperty("--rail-left", `${rect.left}px`);
    container.style.setProperty("--rail-top", `${rect.top}px`);
    container.style.setProperty("--rail-height", `${rect.height}px`);
    // Approximate stage scale from rect width vs layout width.
    const layoutWidth = stage.clientWidth || rect.width;
    const scale = rect.width / Math.max(1, layoutWidth);
    container.style.setProperty("--rail-scale", String(scale));
  }

  function renderClusterPads() {
    const { state } = ctx;
    const container = document.getElementById("cluster-pads");
    if (!container) {
      console.warn("[cluster-pads] container element missing from DOM");
      return;
    }
    updateClusterPadsRect();
    const clusters = (typeof ctx.getBoardRoomClusters === "function")
      ? (ctx.getBoardRoomClusters(state.boardId) || [])
      : [];
    if (window.__TT_CLUSTER_DEBUG__) {
      console.info(
        "[cluster-pads] board=", state.boardId,
        "clusters=", clusters.length,
        "names=", clusters.map((c) => c.name).join(",") || "(none)",
        "ctx.getBoardRoomClusters=", typeof ctx.getBoardRoomClusters,
      );
    }

    // Sync DOM children with cluster list. Reuse existing pads when
    // their clusterId matches so we don't churn DOM on every state
    // update — only running-state class flips.
    const existingByClusterId = new Map();
    let emptyHint = null;
    for (const child of Array.from(container.children)) {
      const clusterId = child?.dataset?.clusterId;
      if (clusterId) existingByClusterId.set(clusterId, child);
      else if (child?.classList?.contains("cluster-pads-empty")) emptyHint = child;
    }
    const seen = new Set();
    for (const cluster of clusters) {
      const clusterId = String(cluster.clusterId || "").trim();
      if (!clusterId) continue;
      seen.add(clusterId);
      let pad = existingByClusterId.get(clusterId);
      if (!pad) {
        pad = document.createElement("div");
        pad.className = "cluster-pad";
        pad.dataset.clusterId = clusterId;
        const render = document.createElement("div");
        render.className = "cluster-pad-render";
        // Phase 23 W2 v7: per-pad canvas. Animation pixels for the
        // cluster's first member room get blitted in here every frame
        // by the draw loop's drawClusterPadCanvases pass — see
        // runtime-draw-loop.js. The pad now visually IS the running
        // animation, not a static label.
        const canvas = document.createElement("canvas");
        canvas.className = "cluster-pad-canvas";
        render.appendChild(canvas);
        const dot = document.createElement("span");
        dot.className = "cluster-pad-dot";
        dot.setAttribute("aria-hidden", "true");
        const label = document.createElement("div");
        label.className = "cluster-pad-label";
        pad.append(render, dot, label);
        // Phase 23 W2 v6: pad behaves exactly like a room — tap
        // dispatches via the active Tap-Action (Off / Toggle /
        // Clear). No inline × control; mode is set globally on
        // the dashboard.
        pad.addEventListener("click", () => {
          console.info("[cluster-pad] click", {
            clusterId,
            mode: ctx?.state?.quickMode?.mode,
            armedAnimation: ctx?.state?.roomDraft?.animationId,
          });
          dispatchClusterByTapAction(clusterId);
        });
        container.append(pad);
      }
      // Always sync label text (name may have changed in editor).
      const labelEl = pad.querySelector(".cluster-pad-label");
      if (labelEl) labelEl.textContent = cluster.name || clusterId;
      // Sync running state.
      const isRunning = state.runningAnimations.some(
        (anim) => anim?.scope === "cluster"
          && String(anim.clusterId || "").trim() === clusterId
          && String(anim.boardId || "").trim() === String(state.boardId || "").trim(),
      );
      pad.classList.toggle("is-running", isRunning);
    }
    // Remove pads for clusters that no longer exist.
    for (const [clusterId, pad] of existingByClusterId) {
      if (!seen.has(clusterId)) pad.remove();
    }
    // Empty-state hint: show a soft "no clusters" pill when there
    // are zero clusters on the active board so the rail position
    // is verifiable at a glance + the user knows the surface
    // exists.
    if (clusters.length === 0) {
      if (!emptyHint) {
        emptyHint = document.createElement("div");
        emptyHint.className = "cluster-pads-empty";
        emptyHint.textContent = "No clusters on this board";
        container.append(emptyHint);
      }
    } else if (emptyHint) {
      emptyHint.remove();
    }
  }

  // Phase 23 W2 v6: pad tap routes through the active Tap-Action
  // mode just like room taps. Off = no-op; Toggle = toggle dispatch;
  // Clear = stop everything for this cluster.
  function dispatchClusterByTapAction(clusterId) {
    const { state } = ctx;
    const mode = String(state.quickMode?.mode || "toggle").toLowerCase();
    const armedId = String(state.roomDraft?.animationId || "").trim();
    if (ctx.triggerFeedback) {
      ctx.triggerFeedback.textContent =
        `Status: cluster pad tap (mode=${mode}, armed=${armedId || "(none)"})`;
    }
    console.info("[cluster-pad] tap-action route", { clusterId, mode, armedId });
    if (mode === "off") return;
    if (mode === "clear") {
      dispatchClusterClear(clusterId);
      return;
    }
    // mode === "toggle" (default)
    dispatchClusterToggle(clusterId);
  }

  function dispatchClusterToggle(clusterId) {
    const { state } = ctx;
    const normalizedClusterId = String(clusterId || "").trim();
    if (!normalizedClusterId) return;
    const beforeCount = state.runningAnimations.length;
    const beforeClusterCount = state.runningAnimations.filter(
      (a) => a?.scope === "cluster" && String(a.clusterId || "").trim() === normalizedClusterId,
    ).length;
    const isRunning = state.runningAnimations.some(
      (anim) => anim?.scope === "cluster"
        && String(anim.clusterId || "").trim() === normalizedClusterId
        && String(anim.boardId || "").trim() === String(state.boardId || "").trim(),
    );
    if (isRunning) {
      dispatchClusterClear(normalizedClusterId);
      return;
    }
    // Start: temporarily flip roomDraft to target this cluster, then
    // call startRoomAnimationFromDraft (the same path the dropdown
    // + room-tap pipeline uses).
    const previousTargetType = state.roomDraft.targetType;
    const previousTargetId = state.roomDraft.targetId;
    const previousEditTargetId = state.roomDraft.editTargetId;
    state.roomDraft.targetType = "cluster";
    state.roomDraft.targetId = normalizedClusterId;
    state.roomDraft.editTargetId = null;
    if (typeof ctx.startRoomAnimationFromDraft === "function") {
      ctx.startRoomAnimationFromDraft();
    } else {
      console.warn("[cluster-pad] ctx.startRoomAnimationFromDraft is not a function");
    }
    state.roomDraft.targetType = previousTargetType;
    state.roomDraft.targetId = previousTargetId;
    state.roomDraft.editTargetId = previousEditTargetId;
    if (typeof ctx.syncRoomTargetSelect === "function") {
      ctx.syncRoomTargetSelect();
    }
    const afterCount = state.runningAnimations.length;
    const afterClusterCount = state.runningAnimations.filter(
      (a) => a?.scope === "cluster" && String(a.clusterId || "").trim() === normalizedClusterId,
    ).length;
    console.info("[cluster-pad] dispatch toggle result", {
      clusterId: normalizedClusterId,
      armedAnimationId: state.roomDraft?.animationId,
      animationsCountBefore: beforeCount,
      animationsCountAfter: afterCount,
      clusterEntriesBefore: beforeClusterCount,
      clusterEntriesAfter: afterClusterCount,
      delta: afterCount - beforeCount,
    });
  }

  function dispatchClusterClear(clusterId) {
    const { state } = ctx;
    const normalizedClusterId = String(clusterId || "").trim();
    if (!normalizedClusterId) return;
    const matches = state.runningAnimations.filter(
      (anim) => anim?.scope === "cluster"
        && String(anim.clusterId || "").trim() === normalizedClusterId
        && String(anim.boardId || "").trim() === String(state.boardId || "").trim(),
    );
    for (const anim of matches) {
      if (typeof ctx.stopAnimation === "function") ctx.stopAnimation(anim.id);
    }
  }

  window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE = {
    init,
    collectAnimationStopIds,
    isStopPendingForAnimationId,
    markStopPending,
    clearStopPending,
    reconcileStopPendingFromSnapshot,
    buildStopCommandTargetMeta,
    emitStopAnimationCommand,
    stopAnimation,
    editAnimation,
    renderRunningAnimationsList,
    isRunningListInteractionActive,
    validateRunningListParity,
    refreshGlobalButtons,
    renderClusterPads,
    closeLiveEditor,
  };
})();
