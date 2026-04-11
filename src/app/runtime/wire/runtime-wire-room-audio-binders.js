// Phase 14-2: room panel + audio + global config + mp4 perf binders.
//
// Wires dashboard global trigger mode, stopAll, room/cluster CRUD,
// room animation select + draft inputs, audio enable/mapping/volume,
// animation speed, start room animation buttons, align mode,
// global defaults export/import/apply/discard, beforeunload guard,
// mobile performance, and mp4 performance controls.
// Exposed as wireRoomAudioBinders(ctx).
(() => {
  function wireRoomAudioBinders(ctx) {
    const {
      state,
      triggerFeedback,
      globalDefaultsStatus,
      dashboardGlobalLoopUntilStopInput,
      dashboardGlobalPlaySoundInput,
      stopAllButton,
      roomCreateButton,
      roomDeleteButton,
      clusterSelect,
      clusterCreateButton,
      clusterSaveButton,
      clusterDeleteButton,
      roomRenameInput,
      roomAnimationSelect,
      roomTargetSelect,
      roomOpacityInput,
      roomOpacityValue,
      roomIntensityInput,
      roomIntensityValue,
      roomSpeedInput,
      roomSpeedValue,
      roomSoundVolumeInput,
      roomSoundVolumeValue,
      roomDurationInput,
      roomStaggerStartInput,
      roomStaggerOffsetInput,
      audioEnabledInput,
      audioMappingAnimationSelect,
      audioMappingSoundSelect,
      audioVolumeInput,
      audioVolumeValue,
      animationSpeedInput,
      startRoomAnimationButton,
      mobileStartRoomButton,
      alignModeToggleInput,
      exportGlobalDefaultsButton,
      runMobilePerformanceCheckButton,
      mp4PerformanceTierInput,
      mp4RenderCapInput,
      mp4QualityFloorInput,
      mp4DegradeThresholdInput,
      mp4RecoverThresholdInput,
      armClearAllGuard,
      resetClearAllGuard,
      setDashboardZone,
      executeClearAll,
      createRoomFromSettings,
      deleteSelectedRoom,
      syncClusterManagementPanel,
      createClusterFromSettings,
      updateClusterFromSettings,
      deleteSelectedClusterFromSettings,
      renameSelectedRoom,
      getRoomFxProfile,
      getRoomAnimationDefinitionById,
      normalizeRoomAssetType,
      warmGifAssetPath,
      parseRoomTargetValue,
      syncRoomTargetSelect,
      getSelectedRoom,
      syncRoomPanelFromSelection,
      clampRoomOpacity,
      clampRoomIntensity,
      clampRoomSpeed,
      clampRoomSoundVolume,
      clampRoomDurationSec,
      clampClusterStaggerOffsetMs,
      clampAnimationSpeed,
      clampAudioVolumePercent,
      scheduleRoomDraftSync,
      syncRoomStaggerOffsetControl,
      stopAnimationSound,
      stopAllAudioVoices,
      playSoundForAnimation,
      applyAudioGain,
      enforceAudioLifecycleGuard,
      syncAudioStatus,
      persistRuntimeSoundSettingsChange,
      syncAudioMappingPanel,
      normalizeAnimationSoundPath,
      getAnimationLabel,
      syncAnimationSpeedPanel,
      shouldSuppressRapidTap,
      recordTriggerIntent,
      startRoomAnimationFromDraft,
      setAlignMode,
      downloadGlobalDefaultsFallback,
      getGlobalDefaultsApiFacade,
      applyLocalConfigToServer,
      discardLocalConfigAndReloadFromServer,
      refreshApplyDiscardButtonsUi,
      updateMobilePerformanceStatus,
      percentile,
      normalizeMp4PerformanceTier,
      getMp4TierDefaults,
      updateMp4PerformanceControls,
    } = ctx;

    dashboardGlobalLoopUntilStopInput?.addEventListener("change", () => {
      const modeLabel = dashboardGlobalLoopUntilStopInput.checked ? "loop until stop" : "one-shot";
      const soundLabel = dashboardGlobalPlaySoundInput?.checked ? "with sound" : "muted";
      triggerFeedback.textContent = `Status: global trigger mode set to ${modeLabel} (${soundLabel})`;
    });

    dashboardGlobalPlaySoundInput?.addEventListener("change", () => {
      const modeLabel = dashboardGlobalLoopUntilStopInput?.checked ? "loop until stop" : "one-shot";
      const soundLabel = dashboardGlobalPlaySoundInput.checked ? "with sound" : "muted";
      triggerFeedback.textContent = `Status: global trigger mode set to ${modeLabel} (${soundLabel})`;
    });

    stopAllButton.addEventListener("click", () => {
      const now = performance.now();
      if (state.clearAllGuard.armedUntil <= now) {
        armClearAllGuard();
        setDashboardZone("manage");
        triggerFeedback.textContent = "Status: Clear All is armed - tap again to confirm";
        return;
      }
      resetClearAllGuard();
      executeClearAll();
    });

    roomCreateButton?.addEventListener("click", () => {
      createRoomFromSettings();
    });

    roomDeleteButton?.addEventListener("click", () => {
      deleteSelectedRoom();
    });

    clusterSelect?.addEventListener("change", () => {
      syncClusterManagementPanel();
    });

    clusterCreateButton?.addEventListener("click", () => {
      createClusterFromSettings();
    });

    clusterSaveButton?.addEventListener("click", () => {
      updateClusterFromSettings();
    });

    clusterDeleteButton?.addEventListener("click", () => {
      deleteSelectedClusterFromSettings();
    });

    roomRenameInput?.addEventListener("input", () => {
      renameSelectedRoom(roomRenameInput.value);
    });

    roomAnimationSelect.addEventListener("change", () => {
      const selected = roomAnimationSelect.value;
      const roomFx = getRoomFxProfile(state.boardId);
      state.roomDraft.animationId = roomFx.animations.some((entry) => entry.id === selected)
        ? selected
        : roomFx.animations[0]?.id ?? "kaputt";
      roomAnimationSelect.value = state.roomDraft.animationId;
      const selectedDefinition = getRoomAnimationDefinitionById(state.roomDraft.animationId, state.boardId);
      if (normalizeRoomAssetType(selectedDefinition?.assetType) === "gif") {
        warmGifAssetPath(selectedDefinition?.assetRef, { reason: "trigger" });
      }
    });

    roomTargetSelect?.addEventListener("change", () => {
      const parsed = parseRoomTargetValue(roomTargetSelect.value);
      if (!parsed) {
        return;
      }
      state.roomDraft.targetType = parsed.targetType;
      state.roomDraft.targetId = parsed.targetId;
      syncRoomTargetSelect();
      if (getSelectedRoom()) {
        syncRoomPanelFromSelection({ preserveDraftState: true });
      }
    });

    roomOpacityInput.addEventListener("input", () => {
      state.roomDraft.opacity = clampRoomOpacity(roomOpacityInput.value);
      roomOpacityValue.textContent = state.roomDraft.opacity.toFixed(2);
    });

    roomIntensityInput.addEventListener("input", () => {
      state.roomDraft.intensity = clampRoomIntensity(Number(roomIntensityInput.value));
      roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
    });

    roomSpeedInput.addEventListener("input", () => {
      state.roomDraft.speed = clampRoomSpeed(Number(roomSpeedInput.value));
      roomSpeedValue.textContent = `${state.roomDraft.speed.toFixed(2)}x`;
    });

    roomSoundVolumeInput.addEventListener("input", () => {
      const volume = Math.max(0, Math.min(100, Number(roomSoundVolumeInput.value) || 0));
      state.roomDraft.soundVolume = clampRoomSoundVolume(volume / 100);
      roomSoundVolumeValue.textContent = `${Math.round(state.roomDraft.soundVolume * 100)}%`;
    });

    roomDurationInput.addEventListener("input", () => {
      state.roomDraft.durationSec = clampRoomDurationSec(Number(roomDurationInput.value) || 1);
    });

    roomStaggerStartInput?.addEventListener("change", () => {
      state.roomDraft.staggerStart = Boolean(roomStaggerStartInput.checked);
      scheduleRoomDraftSync("room-draft-stagger-start", 40);
    });

    roomStaggerOffsetInput?.addEventListener("input", () => {
      state.roomDraft.staggerOffsetMs = clampClusterStaggerOffsetMs(roomStaggerOffsetInput.value);
      syncRoomStaggerOffsetControl();
      scheduleRoomDraftSync("room-draft-stagger-offset", 80);
    });

    audioEnabledInput.addEventListener("change", () => {
      state.audio.enabled = audioEnabledInput.checked;
      if (!state.audio.enabled) {
        for (const animation of state.runningAnimations) {
          stopAnimationSound(animation.id);
        }
        stopAllAudioVoices();
      } else {
        for (const animation of state.runningAnimations) {
          playSoundForAnimation(animation);
        }
      }
      applyAudioGain();
      enforceAudioLifecycleGuard();
      syncAudioStatus();
      persistRuntimeSoundSettingsChange("Status: Audio toggle applied, but persistence failed");
    });

    audioMappingAnimationSelect.addEventListener("change", () => {
      syncAudioMappingPanel();
    });

    audioMappingSoundSelect.addEventListener("change", () => {
      const animationType = audioMappingAnimationSelect.value;
      if (!animationType) {
        return;
      }
      state.animationSoundMap[animationType] = normalizeAnimationSoundPath(
        animationType,
        audioMappingSoundSelect.value,
      );
      const persisted = persistRuntimeSoundSettingsChange(
        `Status: Sound mapping for ${getAnimationLabel(animationType)} updated (persistence failed)`,
      );
      syncAudioMappingPanel();
      triggerFeedback.textContent = persisted
        ? `Status: Sound mapping for ${getAnimationLabel(animationType)} updated`
        : `Status: Sound mapping for ${getAnimationLabel(animationType)} updated (persistence failed)`;
    });

    audioVolumeInput.addEventListener("input", () => {
      const volumePercent = clampAudioVolumePercent(Number(audioVolumeInput.value));
      state.audio.volume = volumePercent / 100;
      audioVolumeValue.textContent = `${volumePercent}%`;
      applyAudioGain();
      syncAudioStatus();
      persistRuntimeSoundSettingsChange("Status: Audio volume set, but persistence failed");
    });

    animationSpeedInput.addEventListener("input", () => {
      state.animationSpeed = clampAnimationSpeed(animationSpeedInput.value);
      syncAnimationSpeedPanel();
      triggerFeedback.textContent = `Status: Animation Speed ${state.animationSpeed.toFixed(2)}x`;
    });

    startRoomAnimationButton.addEventListener("click", () => {
      if (shouldSuppressRapidTap("room-start")) {
        return;
      }
      recordTriggerIntent();
      setDashboardZone("trigger");
      startRoomAnimationFromDraft();
    });

    mobileStartRoomButton?.addEventListener("click", () => {
      if (shouldSuppressRapidTap("room-start-mobile")) {
        return;
      }
      setDashboardZone("trigger");
      recordTriggerIntent();
      startRoomAnimationFromDraft();
    });

    alignModeToggleInput?.addEventListener("change", () => {
      setAlignMode(Boolean(alignModeToggleInput.checked));
    });

    exportGlobalDefaultsButton?.addEventListener("click", () => {
      const fileName = downloadGlobalDefaultsFallback();
      if (globalDefaultsStatus) {
        globalDefaultsStatus.textContent = `Global config: exported (${fileName})`;
      }
      triggerFeedback.textContent = `Status: Config exported to ${fileName}`;
    });

    // Phase 13-1: Import-from-file wiring.
    (function wireImportGlobalDefaultsButton() {
      const importButton = document.querySelector("#import-global-defaults");
      if (!importButton) return;
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "application/json,.json";
      fileInput.style.display = "none";
      document.body.append(fileInput);

      importButton.addEventListener("click", () => {
        fileInput.click();
      });

      fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        fileInput.value = "";
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (!parsed || typeof parsed !== "object") {
            throw new Error("JSON payload must be an object");
          }
          importButton.disabled = true;
          if (globalDefaultsStatus) {
            globalDefaultsStatus.textContent = "Global config: import in progress ...";
          }
          await getGlobalDefaultsApiFacade().saveGlobalDefaults(parsed);
          if (globalDefaultsStatus) {
            globalDefaultsStatus.textContent =
              `Global config: imported (${file.name}) — broadcast to all clients`;
          }
          triggerFeedback.textContent =
            `Status: Imported ${file.name}; server broadcast will update all connected clients`;
        } catch (error) {
          const message = String(error?.message || error || "unknown");
          if (globalDefaultsStatus) {
            globalDefaultsStatus.textContent = `Global config: import failed (${message})`;
          }
          triggerFeedback.textContent = `Status: Import failed — ${message}`;
        } finally {
          importButton.disabled = false;
        }
      });
    })();

    // Phase 13-HF3: Apply / Discard buttons.
    (function wireApplyDiscardGlobalConfigButtons() {
      const applyButton = document.getElementById("apply-global-config");
      const discardButton = document.getElementById("discard-global-config");
      if (applyButton) {
        applyButton.addEventListener("click", async () => {
          applyButton.disabled = true;
          const result = await applyLocalConfigToServer();
          if (!result.ok) {
            refreshApplyDiscardButtonsUi();
          }
        });
      }
      if (discardButton) {
        discardButton.addEventListener("click", async () => {
          discardButton.disabled = true;
          const result = await discardLocalConfigAndReloadFromServer();
          if (!result.ok) {
            refreshApplyDiscardButtonsUi();
          }
        });
      }
      refreshApplyDiscardButtonsUi();
    })();

    // Phase 13-HF3: browser-native "Leave site?" prompt when dirty.
    window.addEventListener("beforeunload", (event) => {
      if (!state.localConfigDirty) return undefined;
      event.preventDefault();
      event.returnValue = "Lokale Aenderungen sind nicht gespeichert.";
      return event.returnValue;
    });

    runMobilePerformanceCheckButton?.addEventListener("click", () => {
      updateMobilePerformanceStatus();
      const jankFrames = state.mobilePerf.frameDeltaSamples.filter((delta) => delta >= 40).length;
      state.mobilePerf.lastSnapshot = {
        measuredAt: new Date().toISOString(),
        triggerSampleCount: state.mobilePerf.triggerLatencySamples.length,
        frameSampleCount: state.mobilePerf.frameDeltaSamples.length,
        triggerP95Ms: percentile(state.mobilePerf.triggerLatencySamples, 0.95),
        frameP95Ms: percentile(state.mobilePerf.frameDeltaSamples, 0.95),
        jankRatePct:
          state.mobilePerf.frameDeltaSamples.length > 0
            ? (jankFrames / state.mobilePerf.frameDeltaSamples.length) * 100
            : 0,
      };
      const snapshot = state.mobilePerf.lastSnapshot;
      triggerFeedback.textContent =
        `Status: Mobile snapshot created (Trigger p95 ${snapshot.triggerP95Ms.toFixed(1)}ms, Frame p95 ${snapshot.frameP95Ms.toFixed(1)}ms, Jank ${snapshot.jankRatePct.toFixed(1)}%)`;
    });

    mp4PerformanceTierInput?.addEventListener("change", () => {
      const tier = normalizeMp4PerformanceTier(mp4PerformanceTierInput.value);
      const defaults = getMp4TierDefaults(tier);
      updateMp4PerformanceControls({ tier, ...defaults });
    });

    mp4RenderCapInput?.addEventListener("input", () => {
      updateMp4PerformanceControls({ renderCap: Number(mp4RenderCapInput.value) }, { announce: false });
    });

    mp4QualityFloorInput?.addEventListener("input", () => {
      updateMp4PerformanceControls({ qualityFloor: Number(mp4QualityFloorInput.value) }, { announce: false });
    });

    mp4DegradeThresholdInput?.addEventListener("input", () => {
      updateMp4PerformanceControls({ degradeThreshold: Number(mp4DegradeThresholdInput.value) }, { announce: false });
    });

    mp4RecoverThresholdInput?.addEventListener("input", () => {
      updateMp4PerformanceControls({ recoverThreshold: Number(mp4RecoverThresholdInput.value) }, { announce: false });
    });
  }

  window.TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS = {
    wireRoomAudioBinders,
  };
})();
