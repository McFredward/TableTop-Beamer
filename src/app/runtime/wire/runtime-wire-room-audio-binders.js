// room panel + audio + global config + mp4 perf binders.
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
      dashboardTransformOptions,
      dashboardRotationDegInput,
      dashboardRotationDegValue,
      dashboardStretchToPolygonInput,
      dashboardWidthScaleInput,
      dashboardWidthScaleValue,
      dashboardHeightScaleInput,
      dashboardHeightScaleValue,
      dashboardOffsetXScaleInput,
      dashboardOffsetXScaleValue,
      dashboardOffsetYScaleInput,
      dashboardOffsetYScaleValue,
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
      alignModeButton,
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
      syncAudioGain,
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
      syncMobilePerformanceStatus,
      percentile,
      normalizeMp4PerformanceTier,
      getMp4TierDefaults,
      updateMp4PerformanceControls,
      roomFrozenCheckbox,
      roomColorPicker,
      roomColorPickerLabel,
      setRoomFrozen,
      syncSelectedRoomStateForBoard,
      persistBoardProfiles,
      renderRoomOverlay,
      pushUndoState,
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
      if (typeof pushUndoState === "function") pushUndoState("Create room");
      createRoomFromSettings();
    });

    roomDeleteButton?.addEventListener("click", () => {
      if (typeof pushUndoState === "function") pushUndoState("Delete room");
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

    roomRenameInput?.addEventListener("focus", () => {
      if (typeof pushUndoState === "function") pushUndoState("Rename room");
    });
    roomRenameInput?.addEventListener("input", () => {
      renameSelectedRoom(roomRenameInput.value);
    });

    roomFrozenCheckbox?.addEventListener("change", () => {
      const roomId = syncSelectedRoomStateForBoard(state.boardId);
      if (roomId) {
        setRoomFrozen(state.boardId, roomId, roomFrozenCheckbox.checked);
        persistBoardProfiles();
        syncRoomTargetSelect();
        renderRoomOverlay();
      }
    });

    function syncDashboardTransformInputs(def) {
      const rot = Number(def?.rotationDeg) || 0;
      const stretch = def?.stretchToPolygon !== false;
      const ws = stretch ? 1 : (Number(def?.widthScale) || 1);
      const hs = stretch ? 1 : (Number(def?.heightScale) || 1);
      const ox = stretch ? 0 : (Number(def?.offsetXScale) || 0);
      const oy = stretch ? 0 : (Number(def?.offsetYScale) || 0);

      state.roomDraft.rotationDeg = rot;
      state.roomDraft.stretchToPolygon = stretch;
      state.roomDraft.widthScale = ws;
      state.roomDraft.heightScale = hs;
      state.roomDraft.offsetXScale = ox;
      state.roomDraft.offsetYScale = oy;

      if (dashboardRotationDegInput) dashboardRotationDegInput.value = rot;
      if (dashboardRotationDegValue) dashboardRotationDegValue.textContent = `${rot}°`;
      if (dashboardStretchToPolygonInput) dashboardStretchToPolygonInput.checked = stretch;
      if (dashboardWidthScaleInput) dashboardWidthScaleInput.value = ws;
      if (dashboardWidthScaleValue) dashboardWidthScaleValue.textContent = ws.toFixed(2);
      if (dashboardHeightScaleInput) dashboardHeightScaleInput.value = hs;
      if (dashboardHeightScaleValue) dashboardHeightScaleValue.textContent = hs.toFixed(2);
      if (dashboardOffsetXScaleInput) dashboardOffsetXScaleInput.value = ox;
      if (dashboardOffsetXScaleValue) dashboardOffsetXScaleValue.textContent = ox.toFixed(2);
      if (dashboardOffsetYScaleInput) dashboardOffsetYScaleInput.value = oy;
      if (dashboardOffsetYScaleValue) dashboardOffsetYScaleValue.textContent = oy.toFixed(2);

      if (dashboardWidthScaleInput) dashboardWidthScaleInput.disabled = stretch;
      if (dashboardHeightScaleInput) dashboardHeightScaleInput.disabled = stretch;
      if (dashboardOffsetXScaleInput) dashboardOffsetXScaleInput.disabled = stretch;
      if (dashboardOffsetYScaleInput) dashboardOffsetYScaleInput.disabled = stretch;

      // Only show transform options for mp4/gif, not coded.
      const assetType = normalizeRoomAssetType(def?.assetType);
      const isTransformable = assetType === "gif" || assetType === "mp4";
      if (dashboardTransformOptions) {
        dashboardTransformOptions.hidden = !isTransformable;
      }
    }

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
      syncDashboardTransformInputs(selectedDefinition);
      syncColorPickerVisibility(selectedDefinition);
      applyDefinitionDefaultsToDraft(selectedDefinition);
    });

    roomColorPicker?.addEventListener("input", () => {
      state.roomDraft.colorHex = roomColorPicker.value;
    });

    function applyDefinitionDefaultsToDraft(definition) {
      state.roomDraft.opacity = clampRoomOpacity(definition?.opacity ?? 0.9);
      state.roomDraft.intensity = clampRoomIntensity(definition?.intensity ?? 0.8);
      state.roomDraft.speed = clampRoomSpeed(definition?.speed ?? 1);
      state.roomDraft.soundVolume = clampRoomSoundVolume(definition?.soundVolume ?? 1);
      state.roomDraft.rotationDeg = definition?.rotationDeg ?? 0;
      state.roomDraft.stretchToPolygon = definition?.stretchToPolygon !== false;
      state.roomDraft.widthScale = definition?.widthScale ?? 1;
      state.roomDraft.heightScale = definition?.heightScale ?? 1;
      state.roomDraft.offsetXScale = definition?.offsetXScale ?? 0;
      state.roomDraft.offsetYScale = definition?.offsetYScale ?? 0;
      // Mark the draft as synced with this animation so
      // the dispatch path can tell whether a re-sync is needed before
      // firing (first-ever tap ships the stale session defaults
      // otherwise — see bug ticket on Scanning/Slime first-tap speed).
      state.roomDraft.lastSyncedAnimationId = definition?.id ?? null;
      // colorHex is intentionally NOT reset — user's color persists
      roomOpacityInput.value = String(state.roomDraft.opacity);
      roomOpacityValue.textContent = state.roomDraft.opacity.toFixed(2);
      roomIntensityInput.value = String(state.roomDraft.intensity);
      roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
      roomSpeedInput.value = String(state.roomDraft.speed);
      roomSpeedValue.textContent = `${state.roomDraft.speed.toFixed(2)}x`;
      roomSoundVolumeInput.value = String(Math.round(state.roomDraft.soundVolume * 100));
      roomSoundVolumeValue.textContent = `${Math.round(state.roomDraft.soundVolume * 100)}%`;
      syncDashboardTransformInputs(definition);
    }

    function syncColorPickerVisibility(definition) {
      if (!roomColorPickerLabel) {
        return;
      }
      const isSolidColor = normalizeRoomAssetType(definition?.assetType) === "coded"
        && String(definition?.assetRef || "").toLowerCase() === "solid-color";
      roomColorPickerLabel.style.display = isSolidColor ? "" : "none";
    }

    // Dashboard per-start transform override inputs.
    dashboardRotationDegInput?.addEventListener("input", () => {
      const v = Number(dashboardRotationDegInput.value) || 0;
      state.roomDraft.rotationDeg = v;
      if (dashboardRotationDegValue) dashboardRotationDegValue.textContent = `${v}°`;
    });

    dashboardStretchToPolygonInput?.addEventListener("change", () => {
      const stretch = Boolean(dashboardStretchToPolygonInput.checked);
      state.roomDraft.stretchToPolygon = stretch;
      const scaleDisabled = stretch;
      if (dashboardWidthScaleInput) dashboardWidthScaleInput.disabled = scaleDisabled;
      if (dashboardHeightScaleInput) dashboardHeightScaleInput.disabled = scaleDisabled;
      if (dashboardOffsetXScaleInput) dashboardOffsetXScaleInput.disabled = scaleDisabled;
      if (dashboardOffsetYScaleInput) dashboardOffsetYScaleInput.disabled = scaleDisabled;
    });

    dashboardWidthScaleInput?.addEventListener("input", () => {
      const v = Number(dashboardWidthScaleInput.value) || 1;
      state.roomDraft.widthScale = v;
      if (dashboardWidthScaleValue) dashboardWidthScaleValue.textContent = v.toFixed(2);
    });

    dashboardHeightScaleInput?.addEventListener("input", () => {
      const v = Number(dashboardHeightScaleInput.value) || 1;
      state.roomDraft.heightScale = v;
      if (dashboardHeightScaleValue) dashboardHeightScaleValue.textContent = v.toFixed(2);
    });

    dashboardOffsetXScaleInput?.addEventListener("input", () => {
      const v = Number(dashboardOffsetXScaleInput.value) || 0;
      state.roomDraft.offsetXScale = v;
      if (dashboardOffsetXScaleValue) dashboardOffsetXScaleValue.textContent = v.toFixed(2);
    });

    dashboardOffsetYScaleInput?.addEventListener("input", () => {
      const v = Number(dashboardOffsetYScaleInput.value) || 0;
      state.roomDraft.offsetYScale = v;
      if (dashboardOffsetYScaleValue) dashboardOffsetYScaleValue.textContent = v.toFixed(2);
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
      const volume = window.TT_BEAMER_RUNTIME_UTILS.clamp(0, 100, Number(roomSoundVolumeInput.value) || 0);
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
      syncAudioGain();
      enforceAudioLifecycleGuard();
      syncAudioStatus();
      persistRuntimeSoundSettingsChange("Status: Audio toggle applied, but persistence failed");
    });

    // Standalone Sound Mapping panel removed — these two
    // event listeners are no longer needed since sound is now
    // per-animation-definition. Guard with ?. for null-safety.
    audioMappingAnimationSelect?.addEventListener("change", () => {
      syncAudioMappingPanel();
    });

    audioMappingSoundSelect?.addEventListener("change", () => {
      const animationType = audioMappingAnimationSelect?.value;
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
      syncAudioGain();
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

    // Dashboard-side align mode toggle button.
    alignModeButton?.addEventListener("click", () => {
      setAlignMode(!state.alignMode);
    });

    exportGlobalDefaultsButton?.addEventListener("click", () => {
      const fileName = downloadGlobalDefaultsFallback();
      if (globalDefaultsStatus) {
        globalDefaultsStatus.textContent = `Global config: exported (${fileName})`;
      }
      triggerFeedback.textContent = `Status: Config exported to ${fileName}`;
    });

    // Unified per-board package export/import — the
    // `wireBundleExportImport` IIFE (309 lines) moved to
    // runtime-wire-room-audio-binders-bundle.js in W3.6-C2 (Option B
    // minimal split — file drops 924 → ~615 to clear ≤800). Sub-binder
    // is invoked here so this point in the binder-call sequence stays
    // identical (any DOM-ready timing assumptions inside the IIFE are
    // preserved by keeping its call site at the same step).
    window.TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS_BUNDLE
      .wireRoomAudioBindersBundle(ctx);

    // Import-from-file wiring.
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

    // Apply / Discard buttons.
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

    // Browser-native "Leave site?" prompt when dirty.
    window.addEventListener("beforeunload", (event) => {
      if (!state.localConfigDirty) return undefined;
      event.preventDefault();
      event.returnValue = "You have unsaved changes.";
      return event.returnValue;
    });

    runMobilePerformanceCheckButton?.addEventListener("click", () => {
      syncMobilePerformanceStatus();
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

    // Initial sync so dashboard transform inputs match the
    // currently-selected animation definition on first load.
    const initialDef = getRoomAnimationDefinitionById(state.roomDraft.animationId, state.boardId);
    syncDashboardTransformInputs(initialDef);
    syncColorPickerVisibility(initialDef);
  }

  window.TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS = {
    wireRoomAudioBinders,
  };
})();
