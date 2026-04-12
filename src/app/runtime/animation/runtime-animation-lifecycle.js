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
      const value = Math.max(0.1, Math.min(3, Number(ctx.liveEditorWidth.value)));
      ctx.liveEditorWidthValue.textContent = value.toFixed(2);
      applyLiveEditorValue("widthScale", value);
    });
    ctx.liveEditorHeight.addEventListener("input", () => {
      const value = Math.max(0.1, Math.min(3, Number(ctx.liveEditorHeight.value)));
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
    };
    ctx.liveEditorPanel.hidden = false;
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

      const widthScale = Math.max(0.1, Math.min(3, Number(animation.widthScale ?? 1)));
      ctx.liveEditorWidth.value = String(widthScale);
      ctx.liveEditorWidthValue.textContent = widthScale.toFixed(2);

      const heightScale = Math.max(0.1, Math.min(3, Number(animation.heightScale ?? 1)));
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
        // Emit live-sync mutation so other clients see the edit.
        if (ctx.getOutputRole() === ctx.OUTPUT_ROLE_CONTROL) {
          void ctx.emitLiveMutation("edit-room", {
            animationId: animation.id,
            animation: ctx.buildAnimationSnapshotForLiveSync(animation),
          }).catch(() => {});
        }
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
      ...(targetScope === "global" && targetType === "outside-space" ? { outsideHint: true } : {}),
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
    if (target?.scope === "global" && target.type === "outside-space") {
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
    if (listAnimations.length === 0) {
      const empty = document.createElement("li");
      empty.className = "running-empty";
      empty.textContent = "No active animations";
      runningAnimationsList.append(empty);
      return;
    }

    const sortedAnimations = [...listAnimations].sort((a, b) => {
      const startedDelta = Number(b.startedAt || 0) - Number(a.startedAt || 0);
      if (startedDelta !== 0) {
        return startedDelta;
      }
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
    for (const anim of sortedAnimations) {
      const li = document.createElement("li");
      li.className = "running-item";
      const title = document.createElement("div");
      title.className = "running-title";
      const effectLabel = (anim.scope === "room" || anim.scope === "cluster") && anim.animationName
        ? anim.animationName
        : anim.scope === "room" || anim.scope === "cluster"
          ? getRoomAnimationLabelById(anim.type, anim.boardId)
          : getAnimationLabel(anim.type);
      const animationBoard = getBoard(anim.boardId);
      const roomLabel = anim.scope === "room"
        ? animationBoard.rooms.find((r) => r.id === anim.roomId)?.label ?? anim.roomId
        : anim.scope === "cluster"
          ? anim.clusterName ?? getClusterTargetById(anim.clusterId, anim.boardId)?.name ?? anim.clusterId ?? "Cluster"
          : "Global";
      const scopeLabel = anim.scope === "room"
        ? "ROOM"
        : anim.scope === "cluster"
          ? "CLUSTER"
          : getGlobalCategoryRuntimeLabel(anim.type);
      const scopeBadge = document.createElement("span");
      scopeBadge.className = `running-scope-badge running-scope-badge-${scopeLabel.toLowerCase()}`;
      scopeBadge.textContent = scopeLabel;
      title.append(scopeBadge, document.createTextNode(` ${effectLabel} - ${roomLabel}`));

      const meta = document.createElement("div");
      meta.className = "running-meta";
      const remaining = anim.durationMs
        ? `${Math.max(0, Math.ceil((anim.startedAt + anim.durationMs - performance.now()) / 1000))}s`
        : "hold";
      const roomMeta = anim.scope === "room"
        ? ` | Opacity: ${clampRoomOpacity(anim.opacity ?? 0.9).toFixed(2)} | Speed: ${clampRoomSpeed(anim.speed ?? anim.playbackSpeed ?? 1).toFixed(2)}x${getRoomGifAssetFileName(anim.type, anim.boardId) ? ` | GIF: ${getRoomGifAssetFileName(anim.type, anim.boardId)}` : ""}${getRoomEquivalentType(anim.type, anim.boardId) ? ` | GlobalEq: ${getRoomEquivalentType(anim.type, anim.boardId)}` : ""} | Sound: ${Math.round(
          clampRoomSoundVolume(anim.soundVolume ?? 1) * 100,
        )}%`
        : anim.scope === "cluster"
          ? ` | Cluster: ${anim.clusterName ?? getClusterTargetById(anim.clusterId, anim.boardId)?.name ?? anim.clusterId ?? "unknown"} | Members: ${Math.max(
            0,
            getClusterMemberAnimationIds(anim).length,
          )} | Start: ${(anim.clusterStartMode ?? "synchronous") === "staggered" ? "staggered" : "synchronous"}${(anim.clusterStartMode ?? "synchronous") === "staggered" ? ` (${clampClusterStaggerOffsetMs(anim.clusterStartOffsetMs)}ms)` : ""}`
          : "";
      meta.textContent = `Instance: ${anim.id} | Type: ${anim.type} | Board: ${getBoard(anim.boardId).label} | Intensity: ${anim.intensity.toFixed(2)}${roomMeta} | Remaining: ${remaining}`;

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

      if (anim.scope === "room" || anim.scope === "cluster") {
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
    closeLiveEditor,
  };
})();
