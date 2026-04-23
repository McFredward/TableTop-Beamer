// Phase 14-2: room draft + cluster runtime helpers module.
//
// Owns the room draft UI state (captureRoomDraftUiSnapshot,
// restoreRoomDraftUiSnapshot, normalizeRoomDraftUiField,
// ROOM_DRAFT_UI_IMMUTABLE_FIELDS, clearRoomDraftEditTarget,
// applyRoomDraftTargetFromRoomClick, syncRoomPanelFromSelection,
// syncRoomTargetSelect, syncRoomDraftActionButton,
// resolveRoomDraftTargets), the cluster runtime helpers
// (getClusterTargetById, getClusterMemberAnimationIds,
// buildClusterMemberRuntimeViews, resolveClusterMemberFallbackDelayMs,
// buildClusterDispatchPlan, getRunningAnimationsForList).
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function resolveRoomDraftTargets() {
    const state = ctx.state;
    const board = ctx.getBoard();
    const room = ctx.getSelectedRoom();
    const fallbackRoomId = room?.id ?? board.rooms[0]?.id ?? null;
    const clusters = ctx.getBoardRoomClusters(state.boardId);
    const clusterById = new Map(clusters.map((cluster) => [cluster.clusterId, cluster]));
    const hasRoom = (roomId) => board.rooms.some((entry) => entry.id === roomId);
    const isUsable = (roomId) => hasRoom(roomId) && !ctx.isRoomFrozen(state.boardId, roomId);

    if (state.roomDraft.targetType === "cluster") {
      const cluster = clusterById.get(state.roomDraft.targetId);
      if (cluster && cluster.roomIds.length > 0) {
        return cluster.roomIds.filter((roomId) => isUsable(roomId));
      }
    }

    const selectedRoomId = state.roomDraft.targetType === "room" ? state.roomDraft.targetId : fallbackRoomId;
    if (selectedRoomId && isUsable(selectedRoomId)) {
      return [selectedRoomId];
    }
    if (fallbackRoomId && isUsable(fallbackRoomId)) {
      return [fallbackRoomId];
    }
    return [];
  }

  function buildClusterDispatchPlan(roomIds, {
    staggerStart = false,
    staggerOffsetMs = ctx.CLUSTER_STAGGER_OFFSET_DEFAULT_MS,
  } = {}) {
    const normalizedRoomIds = Array.from(new Set((Array.isArray(roomIds) ? roomIds : [])
      .map((roomId) => String(roomId || "").trim())
      .filter(Boolean)));
    const effectiveOffsetMs = ctx.clampClusterStaggerOffsetMs(staggerOffsetMs);
    return normalizedRoomIds.map((roomId, index) => ({
      roomId,
      startDelayMs: staggerStart ? index * effectiveOffsetMs : 0,
    }));
  }

  function getClusterTargetById(clusterId, boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const normalizedClusterId = String(clusterId || "").trim();
    if (!normalizedClusterId) {
      return null;
    }
    return ctx.getBoardRoomClusters(effectiveBoardId).find((cluster) => cluster.clusterId === normalizedClusterId) ?? null;
  }

  function getClusterMemberAnimationIds(clusterAnimation) {
    const state = ctx.state;
    if (!clusterAnimation || clusterAnimation.scope !== "cluster") {
      return [];
    }
    const directMembers = Array.isArray(clusterAnimation.memberAnimationIds)
      ? clusterAnimation.memberAnimationIds
        .map((animationId) => String(animationId || "").trim())
        .filter(Boolean)
      : [];
    const linkedMembers = state.runningAnimations
      .filter((entry) => entry?.scope === "room" && entry?.parentClusterRunId === clusterAnimation.id)
      .map((entry) => entry.id);
    return Array.from(new Set([...directMembers, ...linkedMembers]));
  }

  function getRunningAnimationsForList() {
    const state = ctx.state;
    const activeClusterIds = new Set(
      state.runningAnimations
        .filter((entry) => entry?.scope === "cluster" && typeof entry?.id === "string")
        .map((entry) => entry.id),
    );
    return state.runningAnimations.filter((entry) => !(
      entry?.scope === "room"
      && entry?.parentClusterRunId
      && activeClusterIds.has(entry.parentClusterRunId)
    ));
  }

  function resolveClusterMemberFallbackDelayMs(clusterAnimation, roomId) {
    if (!clusterAnimation || typeof roomId !== "string") {
      return 0;
    }
    const delayMap = clusterAnimation.memberStartDelays;
    if (!delayMap || typeof delayMap !== "object") {
      return 0;
    }
    const delay = Number(delayMap[roomId]);
    return Number.isFinite(delay) && delay > 0 ? delay : 0;
  }

  function buildClusterMemberRuntimeViews(clusterAnimation) {
    const state = ctx.state;
    if (!clusterAnimation || clusterAnimation.scope !== "cluster") {
      return [];
    }
    const memberByRoomId = new Map();
    for (const member of state.runningAnimations) {
      if (member?.scope !== "room" || member?.parentClusterRunId !== clusterAnimation.id) {
        continue;
      }
      const roomId = String(member.roomId || "").trim();
      if (!roomId || memberByRoomId.has(roomId)) {
        continue;
      }
      memberByRoomId.set(roomId, member);
    }
    const memberRoomIds = Array.isArray(clusterAnimation.memberRoomIds)
      ? clusterAnimation.memberRoomIds.map((roomId) => String(roomId || "").trim()).filter(Boolean)
      : [];
    const orderedRoomIds = memberRoomIds.length > 0
      ? memberRoomIds
      : Array.from(memberByRoomId.keys());
    return orderedRoomIds.map((roomId) => {
      const linkedMember = memberByRoomId.get(roomId) ?? null;
      if (linkedMember) {
        return {
          roomId,
          animation: linkedMember,
        };
      }
      const baseStartedAt = Number.isFinite(Number(clusterAnimation.startedAt))
        ? Number(clusterAnimation.startedAt)
        : performance.now();
      const baseStartedAtEpochMs = Number.isFinite(Number(clusterAnimation.startedAtEpochMs))
        ? Number(clusterAnimation.startedAtEpochMs)
        : Date.now();
      const fallbackDelayMs = resolveClusterMemberFallbackDelayMs(clusterAnimation, roomId);
      return {
        roomId,
        animation: {
          ...clusterAnimation,
          scope: "room",
          roomId,
          startedAt: baseStartedAt + fallbackDelayMs,
          startedAtEpochMs: baseStartedAtEpochMs + fallbackDelayMs,
        },
      };
    });
  }

  function syncRoomTargetSelect() {
    const state = ctx.state;
    if (!ctx.roomTargetSelect) {
      return;
    }
    const options = ctx.getRoomTargetOptions(state.boardId);
    ctx.roomTargetSelect.replaceChildren();
    // Phase 22 W5 polish: clusters are typically the quick-pick items
    // the user wants at the top. Split into <optgroup>s so the native
    // dropdown shows a bold "Clusters" header group above the full
    // room list — no more scrolling to the bottom to pick a cluster.
    const clusters = options.filter((entry) => entry.targetType === "cluster");
    const rooms = options.filter((entry) => entry.targetType === "room");
    const appendOption = (parent, entry) => {
      const option = document.createElement("option");
      option.value = entry.value;
      // Optgroups already communicate the kind, so drop the "Room: "
      // / "Cluster: " prefix from the option label itself.
      option.textContent = entry.label.replace(/^(Room|Cluster):\s*/, "");
      parent.append(option);
    };
    if (clusters.length) {
      const clusterGroup = document.createElement("optgroup");
      clusterGroup.label = "Clusters";
      for (const entry of clusters) appendOption(clusterGroup, entry);
      ctx.roomTargetSelect.append(clusterGroup);
    }
    if (rooms.length) {
      const roomGroup = document.createElement("optgroup");
      roomGroup.label = "Rooms";
      for (const entry of rooms) appendOption(roomGroup, entry);
      ctx.roomTargetSelect.append(roomGroup);
    }

    const room = ctx.getSelectedRoom();
    const fallbackValue = room ? `room:${room.id}` : options[0]?.value ?? "";
    const currentValue = state.roomDraft.targetType && state.roomDraft.targetId
      ? `${state.roomDraft.targetType}:${state.roomDraft.targetId}`
      : fallbackValue;
    const existing = options.some((entry) => entry.value === currentValue) ? currentValue : fallbackValue;
    const parsed = ctx.parseRoomTargetValue(existing);
    if (parsed) {
      state.roomDraft.targetType = parsed.targetType;
      state.roomDraft.targetId = parsed.targetId;
      ctx.roomTargetSelect.value = existing;
      if (ctx.roomStaggerStartInput) {
        ctx.roomStaggerStartInput.disabled = parsed.targetType !== "cluster";
      }
      if (ctx.roomStaggerOffsetInput) {
        ctx.roomStaggerOffsetInput.disabled = parsed.targetType !== "cluster";
      }
      ctx.syncRoomStaggerOffsetControl();
    }
  }

  function syncRoomPanelFromSelection({ preserveDraftState = false } = {}) {
    const state = ctx.state;
    const room = ctx.getSelectedRoom();
    if (!room) {
      ctx.roomSelected.textContent = "Selected room: click a room polygon on the board";
      ctx.startRoomAnimationButton.disabled = true;
      ctx.roomOpacityInput.disabled = true;
      if (ctx.roomTargetSelect) {
        ctx.roomTargetSelect.disabled = false;
      }
      syncRoomTargetSelect();
      if (ctx.roomStaggerStartInput) {
        ctx.roomStaggerStartInput.disabled = state.roomDraft.targetType !== "cluster";
      }
      if (ctx.roomStaggerOffsetInput) {
        ctx.roomStaggerOffsetInput.disabled = state.roomDraft.targetType !== "cluster";
      }
      ctx.syncRoomStaggerOffsetControl();
      ctx.syncRoomGeometryPanel();
      ctx.syncDashboardZoneVisibility();
      if (ctx.roomColorPickerLabel) {
        ctx.roomColorPickerLabel.style.display = "none";
      }
      return;
    }
    ctx.startRoomAnimationButton.disabled = false;
    ctx.roomOpacityInput.disabled = false;
    if (ctx.roomTargetSelect) {
      ctx.roomTargetSelect.disabled = false;
    }
    if (ctx.roomStaggerStartInput) {
      ctx.roomStaggerStartInput.disabled = false;
    }
    if (!preserveDraftState) {
      const roomFx = ctx.getRoomFxProfile(state.boardId);
      state.roomDraft.animationId = roomFx.animations.some((entry) => entry.id === state.roomDraft.animationId)
        ? state.roomDraft.animationId
        : roomFx.animations[0]?.id ?? "kaputt";
    }
    ctx.roomAnimationSelect.value = state.roomDraft.animationId;
    if (ctx.roomColorPickerLabel) {
      const def = ctx.getRoomAnimationDefinitionById(state.roomDraft.animationId, state.boardId);
      const isSolidColor = ctx.normalizeRoomAssetType(def?.assetType) === "coded"
        && String(def?.assetRef || "").toLowerCase() === "solid-color";
      ctx.roomColorPickerLabel.style.display = isSolidColor ? "" : "none";
    }
    ctx.roomOpacityInput.value = String(ctx.clampRoomOpacity(state.roomDraft.opacity));
    ctx.roomOpacityValue.textContent = ctx.clampRoomOpacity(state.roomDraft.opacity).toFixed(2);
    state.roomDraft.intensity = ctx.clampRoomIntensity(state.roomDraft.intensity);
    state.roomDraft.speed = ctx.clampRoomSpeed(state.roomDraft.speed);
    state.roomDraft.soundVolume = ctx.clampRoomSoundVolume(state.roomDraft.soundVolume);
    state.roomDraft.durationSec = ctx.clampRoomDurationSec(state.roomDraft.durationSec);
    ctx.roomIntensityInput.value = String(state.roomDraft.intensity);
    ctx.roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
    ctx.roomSpeedInput.value = String(state.roomDraft.speed);
    ctx.roomSpeedValue.textContent = `${state.roomDraft.speed.toFixed(2)}x`;
    ctx.roomSoundVolumeInput.value = String(Math.round(state.roomDraft.soundVolume * 100));
    ctx.roomSoundVolumeValue.textContent = `${Math.round(state.roomDraft.soundVolume * 100)}%`;
    ctx.roomDurationInput.value = String(state.roomDraft.durationSec);
    state.roomDraft.staggerStart = Boolean(state.roomDraft.staggerStart);
    state.roomDraft.staggerOffsetMs = ctx.clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);
    if (ctx.roomStaggerStartInput) {
      ctx.roomStaggerStartInput.checked = state.roomDraft.staggerStart;
      ctx.roomStaggerStartInput.disabled = state.roomDraft.targetType !== "cluster";
    }
    ctx.syncRoomStaggerOffsetControl();
    if (!state.roomDraft.targetType || !state.roomDraft.targetId) {
      state.roomDraft.targetType = "room";
      state.roomDraft.targetId = room.id;
    }
    syncRoomTargetSelect();
    ctx.roomSelected.textContent = `Selected room: ${room.name ?? room.label}`;
    if (ctx.roomRenameInput) {
      ctx.roomRenameInput.value = room.name ?? room.label ?? "";
    }
    if (ctx.roomNameInput) {
      ctx.roomNameInput.value = room.name ?? room.label ?? "";
    }
    ctx.syncRoomGeometryPanel();
    ctx.syncRoomManagementPanel();
    ctx.syncDashboardZoneVisibility();
  }

  function syncRoomDraftActionButton() {
    const isEditMode = Boolean(ctx.state.roomDraft.editTargetId);
    ctx.startRoomAnimationButton.textContent = isEditMode
      ? "Update running instance"
      : "Start room animation";
  }

  function clearRoomDraftEditTarget() {
    ctx.state.roomDraft.editTargetId = null;
    syncRoomDraftActionButton();
  }

  function applyRoomDraftTargetFromRoomClick(roomId) {
    const normalizedRoomId = typeof roomId === "string" ? roomId.trim() : "";
    if (!normalizedRoomId) {
      return;
    }
    ctx.state.roomDraft.targetType = "room";
    ctx.state.roomDraft.targetId = normalizedRoomId;
  }

  const ROOM_DRAFT_UI_IMMUTABLE_FIELDS = [
    "animationId",
    "targetType",
    "targetId",
    "opacity",
    "intensity",
    "speed",
    "soundVolume",
    "staggerStart",
    "staggerOffsetMs",
    "durationSec",
    "hold",
  ];

  function normalizeRoomDraftUiField(field, value) {
    switch (field) {
      case "opacity":
        return ctx.clampRoomOpacity(value);
      case "intensity":
        return ctx.clampRoomIntensity(value);
      case "speed":
        return ctx.clampRoomSpeed(value);
      case "soundVolume":
        return ctx.clampRoomSoundVolume(value);
      case "staggerStart":
        return Boolean(value);
      case "staggerOffsetMs":
        return ctx.clampClusterStaggerOffsetMs(value);
      case "durationSec":
        return ctx.clampRoomDurationSec(value);
      case "hold":
        return Boolean(value);
      default:
        return value;
    }
  }

  function captureRoomDraftUiSnapshot() {
    const state = ctx.state;
    const snapshot = {};
    for (const field of ROOM_DRAFT_UI_IMMUTABLE_FIELDS) {
      snapshot[field] = normalizeRoomDraftUiField(field, state.roomDraft[field]);
    }
    return snapshot;
  }

  function restoreRoomDraftUiSnapshot(snapshot, reason = "room-start") {
    const state = ctx.state;
    let mutated = false;
    for (const field of ROOM_DRAFT_UI_IMMUTABLE_FIELDS) {
      const nextValue = normalizeRoomDraftUiField(field, snapshot?.[field]);
      const currentValue = normalizeRoomDraftUiField(field, state.roomDraft[field]);
      if (currentValue !== nextValue) {
        state.roomDraft[field] = nextValue;
        mutated = true;
      }
    }
    if (mutated) {
      syncRoomPanelFromSelection({ preserveDraftState: true });
      ctx.logRuntime.warn("draft_immutability_restore", {
        event: "draft-immutability-restore",
        reason,
        boardId: state.boardId,
      });
    }
  }

  window.TT_BEAMER_RUNTIME_ROOM_DRAFT = {
    init,
    resolveRoomDraftTargets,
    buildClusterDispatchPlan,
    getClusterTargetById,
    getClusterMemberAnimationIds,
    getRunningAnimationsForList,
    resolveClusterMemberFallbackDelayMs,
    buildClusterMemberRuntimeViews,
    syncRoomTargetSelect,
    syncRoomPanelFromSelection,
    syncRoomDraftActionButton,
    clearRoomDraftEditTarget,
    applyRoomDraftTargetFromRoomClick,
    normalizeRoomDraftUiField,
    captureRoomDraftUiSnapshot,
    restoreRoomDraftUiSnapshot,
  };
})();
