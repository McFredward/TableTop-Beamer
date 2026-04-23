// Phase 14-2: room dispatch module.
//
// Owns startRoomAnimationFromDraft — the single 530-LOC function that
// transforms state.roomDraft into concrete running animations (or
// edit/cluster-replace mutations) and either broadcasts them as live
// mutations (control role) or commits them locally (final role).
//
// Dependencies injected via ctx (large surface — this function
// orchestrates the entire "start room animation" flow).
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function startRoomAnimationFromDraft() {
    const {
      state, triggerFeedback, OUTPUT_ROLE_CONTROL,
      getOutputRole, captureRoomDraftUiSnapshot, restoreRoomDraftUiSnapshot,
      getBoard, getRoomAnimationDefinitionById,
      normalizeRoomAssetType, normalizeRoomAssetRefForType,
      clampRoomIntensity, clampRoomSpeed, clampRoomOpacity, clampRoomSoundVolume,
      clampClusterStaggerOffsetMs, warmGifAssetPath,
      resolveRoomDraftTargets, getClusterTargetById,
      buildClusterDispatchPlan, createAnimation, emitLiveMutation,
      buildAnimationSnapshotForLiveSync, clearRoomDraftEditTarget,
      playSoundForAnimation, stopAnimationSound,
      renderRunningAnimationsList, getRoomAnimationLabelById,
      getBoardRoomClusters,
    } = ctx;

    const draftSnapshot = captureRoomDraftUiSnapshot();
    const board = getBoard();
    try {
      const selectedDefinition = getRoomAnimationDefinitionById(state.roomDraft.animationId, state.boardId);
      if (!selectedDefinition) {
        triggerFeedback.textContent = "Status: select a valid room animation first";
        return;
      }

      // Phase 22 W5 fix: first-ever tap bug — the roomDraft sliders /
      // values are only synced to a definition when the user manually
      // picks it in the sidebar dropdown. Quick-mode tap never goes
      // through that change event, so the very first animation fires
      // with the stale session baseline (speed=1, intensity=1, …)
      // instead of the animation's saved defaults. Re-seed here if
      // the draft wasn't synced with the current selectedDefinition.
      if (state.roomDraft.lastSyncedAnimationId !== selectedDefinition.id) {
        state.roomDraft.opacity = clampRoomOpacity(selectedDefinition.opacity ?? 0.9);
        state.roomDraft.intensity = clampRoomIntensity(selectedDefinition.intensity ?? 0.8);
        state.roomDraft.speed = clampRoomSpeed(selectedDefinition.speed ?? 1);
        state.roomDraft.soundVolume = clampRoomSoundVolume(selectedDefinition.soundVolume ?? 1);
        state.roomDraft.rotationDeg = selectedDefinition.rotationDeg ?? 0;
        state.roomDraft.stretchToPolygon = selectedDefinition.stretchToPolygon !== false;
        state.roomDraft.widthScale = selectedDefinition.widthScale ?? 1;
        state.roomDraft.heightScale = selectedDefinition.heightScale ?? 1;
        state.roomDraft.offsetXScale = selectedDefinition.offsetXScale ?? 0;
        state.roomDraft.offsetYScale = selectedDefinition.offsetYScale ?? 0;
        state.roomDraft.lastSyncedAnimationId = selectedDefinition.id;
      }

      const selectedAssetType = normalizeRoomAssetType(selectedDefinition.assetType);
      const selectedAssetRef = normalizeRoomAssetRefForType(selectedAssetType, selectedDefinition.assetRef);

      const draftPayload = {
        type: state.roomDraft.animationId,
        animationName: selectedDefinition.name,
        roomAssetType: selectedAssetType,
        roomAssetRef: selectedAssetRef,
        // Phase 15-9: carry the per-definition sound selection onto
        // the dispatched animation entry.
        soundAssetRef: selectedDefinition.soundAssetRef ?? "none",
        rotationDeg: state.roomDraft.rotationDeg ?? 0,
        stretchToPolygon: state.roomDraft.stretchToPolygon !== false,
        widthScale: state.roomDraft.widthScale ?? 1,
        heightScale: state.roomDraft.heightScale ?? 1,
        offsetXScale: state.roomDraft.offsetXScale ?? 0,
        offsetYScale: state.roomDraft.offsetYScale ?? 0,
        colorHex: state.roomDraft.colorHex ?? "#ff0000",
        intensity: clampRoomIntensity(state.roomDraft.intensity),
        speed: clampRoomSpeed(state.roomDraft.speed),
        opacity: clampRoomOpacity(state.roomDraft.opacity),
        soundVolume: clampRoomSoundVolume(state.roomDraft.soundVolume),
        hold: true,
        durationMs: null,
      };

      if (selectedAssetType === "gif") {
        warmGifAssetPath(selectedAssetRef, { reason: "trigger" });
      }

      const targetRoomIds = resolveRoomDraftTargets();
      if (targetRoomIds.length === 0) {
        triggerFeedback.textContent = "Status: selected target has no rooms";
        return;
      }

      if (state.roomDraft.targetType === "room") {
        const selectedTargetRoom = targetRoomIds[0];
        if (!selectedTargetRoom) {
          triggerFeedback.textContent = "Status: select a room on the board first";
          return;
        }
      }

      if (getOutputRole() === OUTPUT_ROLE_CONTROL) {
        const pendingCommands = [];
        if (state.roomDraft.editTargetId) {
          if (state.roomDraft.targetType === "cluster") {
            const existingCluster = state.runningAnimations.find(
              (item) => item.id === state.roomDraft.editTargetId && item.scope === "cluster",
            );
            if (existingCluster) {
              const shouldStaggerClusterStart = Boolean(state.roomDraft.staggerStart);
              const staggerOffsetMs = clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);
              const cluster = getClusterTargetById(state.roomDraft.targetId, state.boardId);
              const dispatchPlan = buildClusterDispatchPlan(targetRoomIds, {
                staggerStart: shouldStaggerClusterStart,
                staggerOffsetMs,
              });
              const reusableMembersByRoomId = new Map();
              for (const member of state.runningAnimations) {
                if (member?.scope !== "room" || member?.parentClusterRunId !== existingCluster.id) {
                  continue;
                }
                const roomKey = String(member.roomId || "").trim();
                if (!roomKey) {
                  continue;
                }
                if (!reusableMembersByRoomId.has(roomKey)) {
                  reusableMembersByRoomId.set(roomKey, []);
                }
                reusableMembersByRoomId.get(roomKey).push(member);
              }
              const retainedMemberIds = new Set();
              const nextMemberAnimationIds = [];
              const nextMemberRoomIds = [];

              for (const { roomId, startDelayMs } of dispatchPlan) {
                const reusableBucket = reusableMembersByRoomId.get(roomId) ?? [];
                const reusableMember = reusableBucket.shift() ?? null;
                if (reusableMember) {
                  const updatedMember = {
                    ...reusableMember,
                    ...draftPayload,
                    boardId: state.boardId,
                    roomId,
                    parentClusterRunId: existingCluster.id,
                    startedAt: performance.now() + Math.max(0, Number(startDelayMs) || 0),
                    startedAtEpochMs: Date.now() + Math.max(0, Number(startDelayMs) || 0),
                  };
                  pendingCommands.push(emitLiveMutation("edit-room", {
                    animationId: updatedMember.id,
                    animation: buildAnimationSnapshotForLiveSync(updatedMember),
                  }));
                  retainedMemberIds.add(updatedMember.id);
                  nextMemberAnimationIds.push(updatedMember.id);
                  nextMemberRoomIds.push(roomId);
                } else {
                  const createdMember = createAnimation({
                    type: draftPayload.type,
                    animationName: draftPayload.animationName,
                    roomAssetType: draftPayload.roomAssetType,
                    roomAssetRef: draftPayload.roomAssetRef,
                    soundAssetRef: draftPayload.soundAssetRef,
                    scope: "room",
                    roomId,
                    boardId: state.boardId,
                    intensity: draftPayload.intensity,
                    speed: draftPayload.speed,
                    opacity: draftPayload.opacity,
                    playbackSpeed: draftPayload.speed,
                    soundVolume: draftPayload.soundVolume,
                    colorHex: draftPayload.colorHex,
                    hold: true,
                    durationSec: 0,
                    startDelayMs,
                  });
                  createdMember.parentClusterRunId = existingCluster.id;
                  pendingCommands.push(emitLiveMutation("trigger-room", {
                    animationId: createdMember.id,
                    animation: buildAnimationSnapshotForLiveSync(createdMember),
                  }));
                  retainedMemberIds.add(createdMember.id);
                  nextMemberAnimationIds.push(createdMember.id);
                  nextMemberRoomIds.push(roomId);
                }
              }

              for (const member of state.runningAnimations) {
                if (member?.scope !== "room" || member?.parentClusterRunId !== existingCluster.id) {
                  continue;
                }
                if (!retainedMemberIds.has(member.id)) {
                  pendingCommands.push(emitLiveMutation("stop-animation", {
                    animationId: member.id,
                    priorityHint: "high",
                  }));
                }
              }

              const updatedCluster = {
                ...existingCluster,
                ...draftPayload,
                scope: "cluster",
                roomId: null,
                boardId: state.boardId,
                clusterId: cluster?.clusterId ?? state.roomDraft.targetId,
                clusterName: cluster?.name ?? existingCluster.clusterName ?? "Cluster",
                clusterStartMode: shouldStaggerClusterStart ? "staggered" : "synchronous",
                clusterStartOffsetMs: staggerOffsetMs,
                memberAnimationIds: nextMemberAnimationIds,
                memberRoomIds: nextMemberRoomIds,
                memberStartDelays: Object.fromEntries(
                  dispatchPlan.map((entry) => [entry.roomId, Math.max(0, Number(entry.startDelayMs) || 0)]),
                ),
                startedAt: performance.now(),
                startedAtEpochMs: Date.now(),
              };
              pendingCommands.push(emitLiveMutation("edit-room", {
                animationId: updatedCluster.id,
                animation: buildAnimationSnapshotForLiveSync(updatedCluster),
              }));
              clearRoomDraftEditTarget();
              void Promise.allSettled(pendingCommands).then(() => {
                triggerFeedback.textContent = `Pending: ${updatedCluster.id} cluster update accepted (waiting for snapshot)`;
              });
              return;
            }
            clearRoomDraftEditTarget();
          }

          const existing = state.runningAnimations.find(
            (item) => item.id === state.roomDraft.editTargetId && item.scope === "room",
          );
          if (existing) {
            const updated = {
              ...existing,
              ...draftPayload,
              roomId: targetRoomIds[0],
              boardId: state.boardId,
              startedAt: performance.now(),
              startedAtEpochMs: Date.now(),
            };
            clearRoomDraftEditTarget();
            void emitLiveMutation("edit-room", {
              animationId: updated.id,
              animation: buildAnimationSnapshotForLiveSync(updated),
            }).then(() => {
              triggerFeedback.textContent = `Pending: ${updated.id} update accepted (waiting for snapshot)`;
            }).catch(() => {
              triggerFeedback.textContent = "Status: room update command failed";
            });
            return;
          }
          clearRoomDraftEditTarget();
        }

        const shouldStaggerClusterStart = state.roomDraft.targetType === "cluster" && Boolean(state.roomDraft.staggerStart);
        const staggerOffsetMs = clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);
        const dispatchPlan = state.roomDraft.targetType === "cluster"
          ? buildClusterDispatchPlan(targetRoomIds, {
            staggerStart: shouldStaggerClusterStart,
            staggerOffsetMs,
          })
          : targetRoomIds.map((roomId) => ({ roomId, startDelayMs: 0 }));
        const createdAnimations = dispatchPlan.map(({ roomId, startDelayMs }) => createAnimation({
          type: draftPayload.type,
          animationName: draftPayload.animationName,
          roomAssetType: draftPayload.roomAssetType,
          roomAssetRef: draftPayload.roomAssetRef,
          soundAssetRef: draftPayload.soundAssetRef,
          scope: "room",
          roomId,
          boardId: state.boardId,
          intensity: draftPayload.intensity,
          speed: draftPayload.speed,
          opacity: draftPayload.opacity,
          playbackSpeed: draftPayload.speed,
          soundVolume: draftPayload.soundVolume,
          colorHex: draftPayload.colorHex,
          hold: true,
          durationSec: 0,
          startDelayMs,
        }));
        let clusterRunAnimation = null;
        if (state.roomDraft.targetType === "cluster") {
          const cluster = getClusterTargetById(state.roomDraft.targetId, state.boardId);
          clusterRunAnimation = createAnimation({
            type: draftPayload.type,
            animationName: draftPayload.animationName,
            roomAssetType: draftPayload.roomAssetType,
            roomAssetRef: draftPayload.roomAssetRef,
            scope: "cluster",
            roomId: null,
            boardId: state.boardId,
            intensity: draftPayload.intensity,
            speed: draftPayload.speed,
            opacity: draftPayload.opacity,
            playbackSpeed: draftPayload.speed,
            soundVolume: draftPayload.soundVolume,
            colorHex: draftPayload.colorHex,
            hold: true,
            durationSec: 0,
          });
          clusterRunAnimation.clusterId = cluster?.clusterId ?? state.roomDraft.targetId;
          clusterRunAnimation.clusterName = cluster?.name ?? "Cluster";
          clusterRunAnimation.clusterStartMode = shouldStaggerClusterStart ? "staggered" : "synchronous";
          clusterRunAnimation.clusterStartOffsetMs = staggerOffsetMs;
          clusterRunAnimation.memberRoomIds = dispatchPlan.map((entry) => entry.roomId);
          clusterRunAnimation.memberAnimationIds = createdAnimations.map((entry) => entry.id);
          clusterRunAnimation.memberStartDelays = Object.fromEntries(
            dispatchPlan.map((entry) => [entry.roomId, Math.max(0, Number(entry.startDelayMs) || 0)]),
          );
          pendingCommands.push(emitLiveMutation("trigger-room", {
            animationId: clusterRunAnimation.id,
            animation: buildAnimationSnapshotForLiveSync(clusterRunAnimation),
          }));
        }
        for (const animation of createdAnimations) {
          if (clusterRunAnimation) {
            animation.parentClusterRunId = clusterRunAnimation.id;
          }
          pendingCommands.push(emitLiveMutation("trigger-room", {
            animationId: animation.id,
            animation: buildAnimationSnapshotForLiveSync(animation),
          }));
        }
        const isClusterTarget = state.roomDraft.targetType === "cluster";
        const targetRoom = board.rooms.find((entry) => entry.id === targetRoomIds[0]) ?? null;
        const targetLabel = isClusterTarget
          ? getBoardRoomClusters(state.boardId).find((cluster) => cluster.clusterId === state.roomDraft.targetId)?.name || "cluster"
          : targetRoom?.name ?? targetRoom?.label ?? targetRoomIds[0];
        void Promise.allSettled(pendingCommands).then(() => {
          triggerFeedback.textContent = isClusterTarget
            ? `Pending: ${getRoomAnimationLabelById(draftPayload.type, state.boardId)} for cluster ${targetLabel} accepted (waiting for snapshot)`
            : `Pending: ${getRoomAnimationLabelById(draftPayload.type, state.boardId)} for ${targetLabel} accepted (waiting for snapshot)`;
        });
        return;
      }

      if (state.roomDraft.editTargetId) {
        if (state.roomDraft.targetType === "cluster") {
          const clusterEditIndex = state.runningAnimations.findIndex(
            (item) => item.id === state.roomDraft.editTargetId && item.scope === "cluster",
          );
          if (clusterEditIndex >= 0) {
            const existingCluster = state.runningAnimations[clusterEditIndex];
            const shouldStaggerClusterStart = Boolean(state.roomDraft.staggerStart);
            const staggerOffsetMs = clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);
            const cluster = getClusterTargetById(state.roomDraft.targetId, state.boardId);
            const dispatchPlan = buildClusterDispatchPlan(targetRoomIds, {
              staggerStart: shouldStaggerClusterStart,
              staggerOffsetMs,
            });
            const reusableMembersByRoomId = new Map();
            for (const member of state.runningAnimations) {
              if (member?.scope !== "room" || member?.parentClusterRunId !== existingCluster.id) {
                continue;
              }
              const roomKey = String(member.roomId || "").trim();
              if (!roomKey) {
                continue;
              }
              if (!reusableMembersByRoomId.has(roomKey)) {
                reusableMembersByRoomId.set(roomKey, []);
              }
              reusableMembersByRoomId.get(roomKey).push(member);
            }
            const retainedMemberIds = new Set();
            const removedMemberIds = new Set();
            const nextMemberAnimationIds = [];
            const nextMemberRoomIds = [];

            for (const { roomId, startDelayMs } of dispatchPlan) {
              const reusableBucket = reusableMembersByRoomId.get(roomId) ?? [];
              const reusableMember = reusableBucket.shift() ?? null;
              if (reusableMember) {
                const updatedMember = {
                  ...reusableMember,
                  ...draftPayload,
                  boardId: state.boardId,
                  roomId,
                  parentClusterRunId: existingCluster.id,
                  startedAt: performance.now() + Math.max(0, Number(startDelayMs) || 0),
                  startedAtEpochMs: Date.now() + Math.max(0, Number(startDelayMs) || 0),
                };
                const memberIndex = state.runningAnimations.findIndex((entry) => entry.id === reusableMember.id);
                if (memberIndex >= 0) {
                  state.runningAnimations[memberIndex] = updatedMember;
                  playSoundForAnimation(updatedMember);
                  emitLiveMutation("edit-room", {
                    animationId: updatedMember.id,
                    animation: buildAnimationSnapshotForLiveSync(updatedMember),
                  });
                }
                retainedMemberIds.add(updatedMember.id);
                nextMemberAnimationIds.push(updatedMember.id);
                nextMemberRoomIds.push(roomId);
              } else {
                const createdMember = createAnimation({
                  type: draftPayload.type,
                  animationName: draftPayload.animationName,
                  roomAssetType: draftPayload.roomAssetType,
                  roomAssetRef: draftPayload.roomAssetRef,
                  scope: "room",
                  roomId,
                  boardId: state.boardId,
                  intensity: draftPayload.intensity,
                  speed: draftPayload.speed,
                  opacity: draftPayload.opacity,
                  playbackSpeed: draftPayload.speed,
                  soundVolume: draftPayload.soundVolume,
                  colorHex: draftPayload.colorHex,
                  hold: true,
                  durationSec: 0,
                  startDelayMs,
                });
                createdMember.parentClusterRunId = existingCluster.id;
                state.runningAnimations.push(createdMember);
                playSoundForAnimation(createdMember);
                emitLiveMutation("trigger-room", {
                  animationId: createdMember.id,
                  animation: buildAnimationSnapshotForLiveSync(createdMember),
                });
                retainedMemberIds.add(createdMember.id);
                nextMemberAnimationIds.push(createdMember.id);
                nextMemberRoomIds.push(roomId);
              }
            }

            for (const member of state.runningAnimations) {
              if (member?.scope !== "room" || member?.parentClusterRunId !== existingCluster.id) {
                continue;
              }
              if (!retainedMemberIds.has(member.id)) {
                removedMemberIds.add(member.id);
              }
            }
            for (const removedId of removedMemberIds) {
              stopAnimationSound(removedId);
            }
            if (removedMemberIds.size > 0) {
              state.runningAnimations = state.runningAnimations.filter((entry) => !removedMemberIds.has(entry.id));
            }

            const updatedCluster = {
              ...existingCluster,
              ...draftPayload,
              scope: "cluster",
              roomId: null,
              boardId: state.boardId,
              clusterId: cluster?.clusterId ?? state.roomDraft.targetId,
              clusterName: cluster?.name ?? existingCluster.clusterName ?? "Cluster",
              clusterStartMode: shouldStaggerClusterStart ? "staggered" : "synchronous",
              clusterStartOffsetMs: staggerOffsetMs,
              memberAnimationIds: nextMemberAnimationIds,
              memberRoomIds: nextMemberRoomIds,
              memberStartDelays: Object.fromEntries(
                dispatchPlan.map((entry) => [entry.roomId, Math.max(0, Number(entry.startDelayMs) || 0)]),
              ),
              startedAt: performance.now(),
              startedAtEpochMs: Date.now(),
            };
            state.runningAnimations[clusterEditIndex] = updatedCluster;
            emitLiveMutation("edit-room", {
              animationId: updatedCluster.id,
              animation: buildAnimationSnapshotForLiveSync(updatedCluster),
            });
            for (const removedId of removedMemberIds) {
              emitLiveMutation("stop-animation", {
                animationId: removedId,
              });
            }
            clearRoomDraftEditTarget();
            triggerFeedback.textContent = `Status: ${updatedCluster.id} updated in place (cluster)`;
            renderRunningAnimationsList();
            return;
          }
          clearRoomDraftEditTarget();
        }
        const editIndex = state.runningAnimations.findIndex(
          (item) => item.id === state.roomDraft.editTargetId && item.scope === "room",
        );
        if (editIndex >= 0) {
          const existing = state.runningAnimations[editIndex];
          const updated = {
            ...existing,
            ...draftPayload,
            roomId: targetRoomIds[0],
            boardId: state.boardId,
            startedAt: performance.now(),
            startedAtEpochMs: Date.now(),
          };
          state.runningAnimations[editIndex] = updated;
          playSoundForAnimation(updated);
          triggerFeedback.textContent = `Status: ${updated.id} updated in place`;
          clearRoomDraftEditTarget();
          renderRunningAnimationsList();
          emitLiveMutation("edit-room", {
            animationId: updated.id,
            animation: buildAnimationSnapshotForLiveSync(updated),
          });
          return;
        }
        clearRoomDraftEditTarget();
      }

      const shouldStaggerClusterStart = state.roomDraft.targetType === "cluster" && Boolean(state.roomDraft.staggerStart);
      const staggerOffsetMs = clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);
      const dispatchPlan = state.roomDraft.targetType === "cluster"
        ? buildClusterDispatchPlan(targetRoomIds, {
          staggerStart: shouldStaggerClusterStart,
          staggerOffsetMs,
        })
        : targetRoomIds.map((roomId) => ({ roomId, startDelayMs: 0 }));
      const createdAnimations = dispatchPlan.map(({ roomId, startDelayMs }) => createAnimation({
        type: draftPayload.type,
        animationName: draftPayload.animationName,
        roomAssetType: draftPayload.roomAssetType,
        roomAssetRef: draftPayload.roomAssetRef,
        scope: "room",
        roomId,
        intensity: draftPayload.intensity,
        speed: draftPayload.speed,
        opacity: draftPayload.opacity,
        playbackSpeed: draftPayload.speed,
        soundVolume: draftPayload.soundVolume,
        colorHex: draftPayload.colorHex,
        hold: true,
        durationSec: 0,
        startDelayMs,
      }));

      let clusterRunAnimation = null;
      if (state.roomDraft.targetType === "cluster") {
        const cluster = getClusterTargetById(state.roomDraft.targetId, state.boardId);
        clusterRunAnimation = createAnimation({
          type: draftPayload.type,
          animationName: draftPayload.animationName,
          roomAssetType: draftPayload.roomAssetType,
          roomAssetRef: draftPayload.roomAssetRef,
          soundAssetRef: draftPayload.soundAssetRef,
          scope: "cluster",
          roomId: null,
          boardId: state.boardId,
          intensity: draftPayload.intensity,
          speed: draftPayload.speed,
          opacity: draftPayload.opacity,
          playbackSpeed: draftPayload.speed,
          soundVolume: draftPayload.soundVolume,
          colorHex: draftPayload.colorHex,
          hold: true,
          durationSec: 0,
          startDelayMs: 0,
        });
        clusterRunAnimation.clusterId = cluster?.clusterId ?? state.roomDraft.targetId;
        clusterRunAnimation.clusterName = cluster?.name ?? "Cluster";
        clusterRunAnimation.clusterStartMode = shouldStaggerClusterStart ? "staggered" : "synchronous";
        clusterRunAnimation.clusterStartOffsetMs = staggerOffsetMs;
        clusterRunAnimation.memberRoomIds = dispatchPlan.map((entry) => entry.roomId);
        clusterRunAnimation.memberAnimationIds = createdAnimations.map((entry) => entry.id);
        clusterRunAnimation.memberStartDelays = Object.fromEntries(
          dispatchPlan.map((entry) => [entry.roomId, Math.max(0, Number(entry.startDelayMs) || 0)]),
        );
      }

      if (clusterRunAnimation) {
        state.runningAnimations.push(clusterRunAnimation);
        emitLiveMutation("trigger-room", {
          animationId: clusterRunAnimation.id,
          animation: buildAnimationSnapshotForLiveSync(clusterRunAnimation),
        });
      }

      for (const animation of createdAnimations) {
        if (clusterRunAnimation) {
          animation.parentClusterRunId = clusterRunAnimation.id;
        }
        state.runningAnimations.push(animation);
        playSoundForAnimation(animation);
        emitLiveMutation("trigger-room", {
          animationId: animation.id,
          animation: buildAnimationSnapshotForLiveSync(animation),
        });
      }

      const isClusterTarget = state.roomDraft.targetType === "cluster";
      const targetRoom = board.rooms.find((entry) => entry.id === targetRoomIds[0]) ?? null;
      const targetLabel = isClusterTarget
        ? getBoardRoomClusters(state.boardId).find((cluster) => cluster.clusterId === state.roomDraft.targetId)?.name || "cluster"
        : targetRoom?.name ?? targetRoom?.label ?? targetRoomIds[0];
      const clusterStartModeLabel = shouldStaggerClusterStart ? "staggered start" : "synchronous start";
      triggerFeedback.textContent = isClusterTarget
        ? `Status: ${getRoomAnimationLabelById(draftPayload.type, state.boardId)} started for cluster ${targetLabel} (${createdAnimations.length} rooms, ${clusterStartModeLabel})`
        : `Status: ${getRoomAnimationLabelById(draftPayload.type, state.boardId)} started for ${targetLabel}`;
      renderRunningAnimationsList();

      // Save as default animation if the checkbox is checked.
      if (ctx.dashboardDefaultAnimation?.checked && createdAnimations.length > 0) {
        for (const animation of createdAnimations) {
          if (!state.defaultAnimationsByBoard[animation.boardId]) {
            state.defaultAnimationsByBoard[animation.boardId] = [];
          }
          const defaults = state.defaultAnimationsByBoard[animation.boardId];
          const filtered = defaults.filter(d => !(d.type === animation.type && d.roomId === animation.roomId && d.scope === animation.scope));
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
          });
          state.defaultAnimationsByBoard[animation.boardId] = filtered;
        }
        void ctx.saveAndCaptureCleanBaseline().catch(() => {});
        ctx.dashboardDefaultAnimation.checked = false;
      }
    } finally {
      restoreRoomDraftUiSnapshot(draftSnapshot, "room-start");
      const def = getRoomAnimationDefinitionById(state.roomDraft.animationId, state.boardId);
      if (def) {
        state.roomDraft.opacity = clampRoomOpacity(def.opacity ?? 0.9);
        state.roomDraft.intensity = clampRoomIntensity(def.intensity ?? 0.8);
        state.roomDraft.speed = clampRoomSpeed(def.speed ?? 1);
        state.roomDraft.soundVolume = clampRoomSoundVolume(def.soundVolume ?? 1);
        state.roomDraft.rotationDeg = def.rotationDeg ?? 0;
        state.roomDraft.stretchToPolygon = def.stretchToPolygon !== false;
        state.roomDraft.widthScale = def.widthScale ?? 1;
        state.roomDraft.heightScale = def.heightScale ?? 1;
        state.roomDraft.offsetXScale = def.offsetXScale ?? 0;
        state.roomDraft.offsetYScale = def.offsetYScale ?? 0;
        // colorHex is intentionally NOT reset — user's color persists across starts
        ctx.syncRoomPanelFromSelection({ preserveDraftState: true });
      }
    }
  }

  window.TT_BEAMER_RUNTIME_ROOM_DISPATCH = {
    init,
    startRoomAnimationFromDraft,
  };
})();
