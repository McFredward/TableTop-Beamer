// room dispatch module.
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

  // Coalesced rAF defer for renderRunningAnimationsList. The running-
  // list rebuild is the heaviest synchronous work on the start path and
  // isn't required for the animation to appear on the canvas — the next
  // draw frame handles that. Deferring shaves perceptible latency off
  // the tap → paint loop on mobile where every ms of main-thread work
  // delays the next compositor frame. Multiple starts within one frame
  // collapse to a single rAF render. (Phase 25 BACKLOG #9)
  let pendingRunningListFrame = 0;
  function deferRenderRunningList() {
    if (pendingRunningListFrame) return;
    pendingRunningListFrame = window.requestAnimationFrame(() => {
      pendingRunningListFrame = 0;
      try { ctx.renderRunningAnimationsList(); } catch { /* defensive */ }
    });
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

      // First-ever tap bug — the roomDraft sliders /
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
        // Carry the per-definition sound selection onto
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
        // Phase 58: carry per-definition playback mode + on-retrigger
        // onto every dispatched instance (room / cluster / member).
        // Default to "loop" preserves legacy behavior for animations
        // not yet configured with a mode.
        playbackMode: selectedDefinition.playbackMode ?? "loop",
        onRetrigger: selectedDefinition.onRetrigger ?? "instant-disappear",
        playbackDirection: selectedDefinition.playbackDirection ?? "forward",
        // Phase 58-w3.8g: heat coded-effect options. Per-definition
        // (like playbackMode) — carried onto every dispatched instance.
        // Same Phase 50 factory-default-mask trap as the transform
        // fields: every createAnimation call site below must forward
        // these explicitly.
        heatShowSource: selectedDefinition.heatShowSource !== false,
        heatSyncNearestSource: selectedDefinition.heatSyncNearestSource === true,
        // Phase 58-w3.8i: merged city-workers options — per-definition,
        // carried onto every dispatched instance (same Phase 50
        // factory-default-mask trap: all createAnimation call sites
        // below forward these explicitly).
        workerStyle: selectedDefinition.workerStyle === "lit" ? "lit" : "dark",
        workerCount: selectedDefinition.workerCount ?? null,
        workerGroups: selectedDefinition.workerGroups ?? "normal",
        workerLanternShare: selectedDefinition.workerLanternShare ?? 30,
        workerTrails: selectedDefinition.workerTrails !== false,
        workerSize: selectedDefinition.workerSize ?? 1,
        workerClothingBrightness: selectedDefinition.workerClothingBrightness ?? 1,
        workerTrailIntensity: selectedDefinition.workerTrailIntensity ?? 100,
        workerCenterExclusion: selectedDefinition.workerCenterExclusion === true,
        workerCenterExclusionRadius: selectedDefinition.workerCenterExclusionRadius ?? 25,
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

      // Phase 58 Wave 3.4: phase-advance for reversible-freeze room
      // animations. If the operator re-triggers the same animation in
      // the same room while a frozen instance exists, transition its
      // phase instead of creating a new instance. Skips edit mode
      // (existing edit path replaces the instance entirely) and
      // cluster mode (cluster phase transitions deferred).
      if (
        !state.roomDraft.editTargetId
        && state.roomDraft.targetType === "room"
        && targetRoomIds.length === 1
      ) {
        const targetRoomId = targetRoomIds[0];
        // Phase 58 Wave 3.7m (2026-06-05): accept ANY phase, not just
        // frozen-*. Operator UAT: "wenn man mitten während dem
        // abspielen drückt, möchte ich dass es trotzdem vom letzten
        // frame bzw. ersten frame an in der anderen Richtung abspielt"
        // — a tap mid-playback flips the direction (forward →
        // reverse-from-last-frame; reverse → forward-from-first-frame),
        // same as if the playthrough had already frozen. The src swap
        // in ensureRoomMp4Playback resets currentTime to 0 of the
        // OTHER file, which is exactly the requested entry point.
        const candidate = state.runningAnimations.find((item) => (
          item
          && item.scope === "room"
          && item.boardId === state.boardId
          && item.roomId === targetRoomId
          && item.type === draftPayload.type
          && item.playbackMode === "play-then-freeze"
          && (
            item.onRetrigger === "reverse-then-freeze-first"
            || item.onRetrigger === "reverse-then-disappear"
          )
        ));
        // forward/frozen-last (incl. unset = forward default) → reverse;
        // reverse/frozen-first → forward.
        const nextPhaseForCandidate = candidate
          ? (
            (candidate.playbackPhase || "forward") === "forward"
            || candidate.playbackPhase === "frozen-last"
              ? "reverse"
              : "forward"
          )
          : null;
        // Phase 58 Wave 3.7i (2026-06-05): PERMANENT diagnostic
        // (operator request — always on). Logs every room-trigger's
        // re-trigger check so a frozen animation that disappears
        // instead of reversing is explainable from console output:
        // candidateMatched=false + a frozen same-room instance in
        // `sameRoom` means the phase-advance was bypassed. User-action
        // frequency only.
        const samesScope = state.runningAnimations.filter((a) => (
          a && a.scope === "room"
          && a.boardId === state.boardId
          && a.roomId === targetRoomId
          && a.type === draftPayload.type
        ));
        console.warn("[58] re-trigger", JSON.stringify({
          roomId: targetRoomId,
          type: draftPayload.type,
          candidateMatched: !!candidate,
          candidateId: candidate?.id ?? null,
          phaseBefore: candidate?.playbackPhase ?? null,
          phaseAfter: nextPhaseForCandidate,
          sameRoomCount: samesScope.length,
          sameRoom: samesScope.map((a) => ({
            id: a.id,
            phase: a.playbackPhase ?? null,
            mode: a.playbackMode ?? null,
            onRetrigger: a.onRetrigger ?? null,
          })),
        }));
        if (candidate) {
          // Phase 58 Wave 3.5: advance phase, do NOT use a custom
          // mutation type (server's LIVE_MUTATION_TYPES would reject
          // unknown actions and silently drop the broadcast). Reuse
          // edit-room with the mutated snapshot so /output/ clients
          // pick up the new phase via the standard pipeline.
          candidate.playbackPhase = nextPhaseForCandidate;
          candidate._endedDispatched = false;
          candidate._phaseChangedAt = performance.now();
          // Re-stamp startedAt so the per-instance video element seeks
          // back to 0 (instanceId tracking in ensure*Mp4Playback uses
          // the unchanged id, but the next ensure call detects the
          // phase change because the cached src URL differs).
          candidate.startedAt = performance.now();
          candidate.startedAtEpochMs = Date.now();
          try {
            void emitLiveMutation("edit-room", {
              animationId: candidate.id,
              animation: buildAnimationSnapshotForLiveSync(candidate),
            }).catch(() => undefined);
          } catch { /* defensive */ }
          triggerFeedback.textContent = `Status: ${draftPayload.animationName} ${candidate.playbackPhase === "reverse" ? "reversing" : "playing"}`;
          deferRenderRunningList();
          return;
        }
      }

      // Phase 58 Wave 3.7o (2026-06-06): CLUSTER-level phase-advance —
      // the cluster counterpart of the single-room block above (which
      // was explicitly gated `targetType === "room" && length === 1`,
      // deferring cluster phase transitions). Operator spec: re-trigger
      // of a cluster whose members run a play-then-freeze +
      // reverse-onRetrigger animation must flip the playback direction
      // of ALL member instances instead of stopping them ("aktuell …
      // VERSCHWINDEN alle Animationen im Cluster"). Each member is
      // flipped by ITS OWN phase (per-member mapping, v1.2.18 rules:
      // forward/unset/frozen-last → reverse; reverse/frozen-first →
      // forward) so mixed phases — e.g. one room individually
      // re-triggered between cluster taps — stay independent.
      // Stagger note: all members flip SIMULTANEOUSLY even when the
      // cluster instance was started in staggered mode — per-member
      // staggered reversal is intentionally not implemented (spec
      // 2026-06-06 allows the simultaneous flip as the simplest
      // consistent behavior). Per-instance video src swaps (incl.
      // reverse URLs + adaptive 480p tier) are handled downstream by
      // the existing expectedSrcUrl machinery — nothing duplicated
      // here.
      if (
        !state.roomDraft.editTargetId
        && state.roomDraft.targetType === "cluster"
      ) {
        const targetClusterId = String(state.roomDraft.targetId || "").trim();
        const isReverseRetriggerable = (item) => (
          item
          && item.playbackMode === "play-then-freeze"
          && (
            item.onRetrigger === "reverse-then-freeze-first"
            || item.onRetrigger === "reverse-then-disappear"
          )
        );
        // v1.2.18 flip mapping (same as the single-room candidate).
        const flipPhaseOf = (item) => (
          (item.playbackPhase || "forward") === "forward"
          || item.playbackPhase === "frozen-last"
            ? "reverse"
            : "forward"
        );
        const clusterEntry = state.runningAnimations.find((item) => (
          item
          && item.scope === "cluster"
          && item.boardId === state.boardId
          && String(item.clusterId || "").trim() === targetClusterId
          && item.type === draftPayload.type
        )) ?? null;
        // Member candidates: room-scope instances of the same type that
        // belong to the running cluster instance (parentClusterRunId)
        // OR — defensive, e.g. after membership drift — simply sit in
        // one of the cluster's member rooms. Members in other playback
        // modes / without a reverse onRetrigger are left untouched.
        const memberCandidates = state.runningAnimations.filter((item) => (
          item
          && item.scope === "room"
          && item.boardId === state.boardId
          && item.type === draftPayload.type
          && isReverseRetriggerable(item)
          && (
            (clusterEntry && item.parentClusterRunId === clusterEntry.id)
            || targetRoomIds.includes(item.roomId)
          )
        ));
        const memberFlips = memberCandidates.map((member) => ({
          id: member.id,
          roomId: member.roomId,
          phaseBefore: member.playbackPhase ?? "forward",
          phaseAfter: flipPhaseOf(member),
        }));
        // PERMANENT diagnostic (mirrors [58] re-trigger for rooms):
        // user-action frequency only.
        console.warn("[58] cluster-retrigger", JSON.stringify({
          clusterId: targetClusterId,
          type: draftPayload.type,
          candidateMatched: memberCandidates.length > 0,
          clusterEntryId: clusterEntry?.id ?? null,
          memberCount: memberCandidates.length,
          members: memberFlips,
        }));
        if (memberCandidates.length > 0) {
          for (const member of memberCandidates) {
            member.playbackPhase = flipPhaseOf(member);
            member._endedDispatched = false;
            member._phaseChangedAt = performance.now();
            // Re-stamp startedAt — same rationale as the single-room
            // block: the per-instance video element keeps its id, the
            // next ensure call detects the phase via the changed
            // expected src URL.
            member.startedAt = performance.now();
            member.startedAtEpochMs = Date.now();
            try {
              void emitLiveMutation("edit-room", {
                animationId: member.id,
                animation: buildAnimationSnapshotForLiveSync(member),
              }).catch(() => undefined);
            } catch { /* defensive */ }
          }
          // Keep the cluster-scope parent consistent for pad UI /
          // snapshots: it mirrors the flip mapping applied to its OWN
          // phase field (it starts unset = forward and alternates with
          // every cluster re-trigger — intentionally independent of
          // the members' potentially mixed phases).
          if (clusterEntry && isReverseRetriggerable(clusterEntry)) {
            clusterEntry.playbackPhase = flipPhaseOf(clusterEntry);
            clusterEntry._endedDispatched = false;
            clusterEntry._phaseChangedAt = performance.now();
            clusterEntry.startedAt = performance.now();
            clusterEntry.startedAtEpochMs = Date.now();
            try {
              void emitLiveMutation("edit-room", {
                animationId: clusterEntry.id,
                animation: buildAnimationSnapshotForLiveSync(clusterEntry),
              }).catch(() => undefined);
            } catch { /* defensive */ }
          }
          const anyReversing = memberFlips.some((entry) => entry.phaseAfter === "reverse");
          triggerFeedback.textContent = `Status: ${draftPayload.animationName} ${anyReversing ? "reversing" : "playing"} (cluster, ${memberFlips.length} rooms)`;
          deferRenderRunningList();
          return;
        }
        // No retriggerable member → fall through to the existing
        // behavior (fresh cluster dispatch / replace).
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
                    // Phase 50 (2026-05-25) — pass transform fields through
                    // so the running animation carries the operator's edits.
                    // Without this, createAnimation's factory defaults
                    // (stretchToPolygon=true, widthScale=1, …) silently
                    // overwrite the def values that draftPayload already
                    // contains. Symptom: "die Transformation … wird nicht
                    // respektiert" (operator UAT 2026-05-25).
                    rotationDeg: draftPayload.rotationDeg,
                    stretchToPolygon: draftPayload.stretchToPolygon,
                    widthScale: draftPayload.widthScale,
                    heightScale: draftPayload.heightScale,
                    offsetXScale: draftPayload.offsetXScale,
                    offsetYScale: draftPayload.offsetYScale,
                    playbackMode: draftPayload.playbackMode,
                    onRetrigger: draftPayload.onRetrigger,
                    playbackDirection: draftPayload.playbackDirection,
                    // Phase 58-w3.8g: heat options — explicit pass-through
                    // (factory-default-mask trap, see draftPayload comment).
                    heatShowSource: draftPayload.heatShowSource,
                    heatSyncNearestSource: draftPayload.heatSyncNearestSource,
                    // Phase 58-w3.8i: city-workers options — explicit pass-through
                    // (factory-default-mask trap, see draftPayload comment).
                    workerStyle: draftPayload.workerStyle,
                    workerCount: draftPayload.workerCount,
                    workerGroups: draftPayload.workerGroups,
                    workerLanternShare: draftPayload.workerLanternShare,
                    workerTrails: draftPayload.workerTrails,
                    workerSize: draftPayload.workerSize,
                    workerClothingBrightness: draftPayload.workerClothingBrightness,
                    workerTrailIntensity: draftPayload.workerTrailIntensity,
                    workerCenterExclusion: draftPayload.workerCenterExclusion,
                    workerCenterExclusionRadius: draftPayload.workerCenterExclusionRadius,
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
          // Phase 50 (2026-05-25): see comment at the cluster-member
          // call site above — same factory-default-mask bug.
          rotationDeg: draftPayload.rotationDeg,
          stretchToPolygon: draftPayload.stretchToPolygon,
          widthScale: draftPayload.widthScale,
          heightScale: draftPayload.heightScale,
          offsetXScale: draftPayload.offsetXScale,
          offsetYScale: draftPayload.offsetYScale,
          playbackMode: draftPayload.playbackMode,
          onRetrigger: draftPayload.onRetrigger,
          playbackDirection: draftPayload.playbackDirection,
          // Phase 58-w3.8g: heat options — explicit pass-through
          // (factory-default-mask trap, see draftPayload comment).
          heatShowSource: draftPayload.heatShowSource,
          heatSyncNearestSource: draftPayload.heatSyncNearestSource,
          // Phase 58-w3.8i: city-workers options — explicit pass-through
          // (factory-default-mask trap, see draftPayload comment).
          workerStyle: draftPayload.workerStyle,
          workerCount: draftPayload.workerCount,
          workerGroups: draftPayload.workerGroups,
          workerLanternShare: draftPayload.workerLanternShare,
          workerTrails: draftPayload.workerTrails,
          workerSize: draftPayload.workerSize,
          workerClothingBrightness: draftPayload.workerClothingBrightness,
          workerTrailIntensity: draftPayload.workerTrailIntensity,
          workerCenterExclusion: draftPayload.workerCenterExclusion,
          workerCenterExclusionRadius: draftPayload.workerCenterExclusionRadius,
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
            rotationDeg: draftPayload.rotationDeg,
            stretchToPolygon: draftPayload.stretchToPolygon,
            widthScale: draftPayload.widthScale,
            heightScale: draftPayload.heightScale,
            offsetXScale: draftPayload.offsetXScale,
            offsetYScale: draftPayload.offsetYScale,
            playbackMode: draftPayload.playbackMode,
            onRetrigger: draftPayload.onRetrigger,
            playbackDirection: draftPayload.playbackDirection,
            // Phase 58-w3.8g: heat options — explicit pass-through
            // (factory-default-mask trap, see draftPayload comment).
            heatShowSource: draftPayload.heatShowSource,
            heatSyncNearestSource: draftPayload.heatSyncNearestSource,
            // Phase 58-w3.8i: city-workers options — explicit pass-through
            // (factory-default-mask trap, see draftPayload comment).
            workerStyle: draftPayload.workerStyle,
            workerCount: draftPayload.workerCount,
            workerGroups: draftPayload.workerGroups,
            workerLanternShare: draftPayload.workerLanternShare,
            workerTrails: draftPayload.workerTrails,
            workerSize: draftPayload.workerSize,
            workerClothingBrightness: draftPayload.workerClothingBrightness,
            workerTrailIntensity: draftPayload.workerTrailIntensity,
            workerCenterExclusion: draftPayload.workerCenterExclusion,
            workerCenterExclusionRadius: draftPayload.workerCenterExclusionRadius,
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
                  rotationDeg: draftPayload.rotationDeg,
                  stretchToPolygon: draftPayload.stretchToPolygon,
                  widthScale: draftPayload.widthScale,
                  heightScale: draftPayload.heightScale,
                  offsetXScale: draftPayload.offsetXScale,
                  offsetYScale: draftPayload.offsetYScale,
                  playbackMode: draftPayload.playbackMode,
                  onRetrigger: draftPayload.onRetrigger,
                  playbackDirection: draftPayload.playbackDirection,
                  // Phase 58-w3.8g: heat options — explicit pass-through
                  // (factory-default-mask trap, see draftPayload comment).
                  heatShowSource: draftPayload.heatShowSource,
                  heatSyncNearestSource: draftPayload.heatSyncNearestSource,
                  // Phase 58-w3.8i: city-workers options — explicit pass-through
                  // (factory-default-mask trap, see draftPayload comment).
                  workerStyle: draftPayload.workerStyle,
                  workerCount: draftPayload.workerCount,
                  workerGroups: draftPayload.workerGroups,
                  workerLanternShare: draftPayload.workerLanternShare,
                  workerTrails: draftPayload.workerTrails,
                  workerSize: draftPayload.workerSize,
                  workerClothingBrightness: draftPayload.workerClothingBrightness,
                  workerTrailIntensity: draftPayload.workerTrailIntensity,
                  workerCenterExclusion: draftPayload.workerCenterExclusion,
                  workerCenterExclusionRadius: draftPayload.workerCenterExclusionRadius,
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
            deferRenderRunningList();
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
          deferRenderRunningList();
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
        rotationDeg: draftPayload.rotationDeg,
        stretchToPolygon: draftPayload.stretchToPolygon,
        widthScale: draftPayload.widthScale,
        heightScale: draftPayload.heightScale,
        offsetXScale: draftPayload.offsetXScale,
        offsetYScale: draftPayload.offsetYScale,
        playbackMode: draftPayload.playbackMode,
        onRetrigger: draftPayload.onRetrigger,
        playbackDirection: draftPayload.playbackDirection,
        // Phase 58-w3.8g: heat options — explicit pass-through
        // (factory-default-mask trap, see draftPayload comment).
        heatShowSource: draftPayload.heatShowSource,
        heatSyncNearestSource: draftPayload.heatSyncNearestSource,
        // Phase 58-w3.8i: city-workers options — explicit pass-through
        // (factory-default-mask trap, see draftPayload comment).
        workerStyle: draftPayload.workerStyle,
        workerCount: draftPayload.workerCount,
        workerGroups: draftPayload.workerGroups,
        workerLanternShare: draftPayload.workerLanternShare,
        workerTrails: draftPayload.workerTrails,
        workerSize: draftPayload.workerSize,
        workerClothingBrightness: draftPayload.workerClothingBrightness,
        workerTrailIntensity: draftPayload.workerTrailIntensity,
        workerCenterExclusion: draftPayload.workerCenterExclusion,
        workerCenterExclusionRadius: draftPayload.workerCenterExclusionRadius,
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
          rotationDeg: draftPayload.rotationDeg,
          stretchToPolygon: draftPayload.stretchToPolygon,
          widthScale: draftPayload.widthScale,
          heightScale: draftPayload.heightScale,
          offsetXScale: draftPayload.offsetXScale,
          offsetYScale: draftPayload.offsetYScale,
          playbackMode: draftPayload.playbackMode,
          onRetrigger: draftPayload.onRetrigger,
          playbackDirection: draftPayload.playbackDirection,
          // Phase 58-w3.8g: heat options — explicit pass-through
          // (factory-default-mask trap, see draftPayload comment).
          heatShowSource: draftPayload.heatShowSource,
          heatSyncNearestSource: draftPayload.heatSyncNearestSource,
          // Phase 58-w3.8i: city-workers options — explicit pass-through
          // (factory-default-mask trap, see draftPayload comment).
          workerStyle: draftPayload.workerStyle,
          workerCount: draftPayload.workerCount,
          workerGroups: draftPayload.workerGroups,
          workerLanternShare: draftPayload.workerLanternShare,
          workerTrails: draftPayload.workerTrails,
          workerSize: draftPayload.workerSize,
          workerClothingBrightness: draftPayload.workerClothingBrightness,
          workerTrailIntensity: draftPayload.workerTrailIntensity,
          workerCenterExclusion: draftPayload.workerCenterExclusion,
          workerCenterExclusionRadius: draftPayload.workerCenterExclusionRadius,
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
      deferRenderRunningList();

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
