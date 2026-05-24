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
      audioVolumeInput,
      audioVolumeValue,
      animationSpeedInput,
      startRoomAnimationButton,
      mobileStartRoomButton,
      alignModeToggleInput,
      alignModeButton,
      exportGlobalDefaultsButton,
      diagnosticOverlayToggle,
      setDiagnosticOverlay,
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
      percentile,
      getMp4TierDefaults,
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
      // Mirror the value into the Tap-Action picker (added in
      // Phase 25) so both inputs stay in lockstep.
      const quickPicker = document.querySelector("#quick-mode-color-picker");
      if (quickPicker && quickPicker.value !== roomColorPicker.value) {
        quickPicker.value = roomColorPicker.value;
      }
    });

    // Tap-Action colour picker mirror — writes the same draft state
    // and pushes the value back into the sidebar picker for symmetry.
    const quickModeColorPicker = document.querySelector("#quick-mode-color-picker");
    quickModeColorPicker?.addEventListener("input", () => {
      state.roomDraft.colorHex = quickModeColorPicker.value;
      if (roomColorPicker && roomColorPicker.value !== quickModeColorPicker.value) {
        roomColorPicker.value = quickModeColorPicker.value;
      }
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
      // Reset colorHex to the animation's stored default whenever the
      // user picks a (different) animation. The dashboard color picker
      // is intentionally a "short-term override" only — switching away
      // and back should re-show the animation's saved default, not the
      // overridden value. (Phase 25 user feedback.)
      const defHex = String(definition?.colorHex || "").trim();
      if (/^#[0-9a-f]{6}$/i.test(defHex)) {
        state.roomDraft.colorHex = defHex;
        if (roomColorPicker) roomColorPicker.value = defHex;
        const quickPicker = document.querySelector("#quick-mode-color-picker");
        if (quickPicker) quickPicker.value = defHex;
      }
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
      const isSolidColor = normalizeRoomAssetType(definition?.assetType) === "coded"
        && String(definition?.assetRef || "").toLowerCase() === "solid-color";
      if (roomColorPickerLabel) {
        roomColorPickerLabel.style.display = isSolidColor ? "" : "none";
      }
      // Mirror visibility into the Tap-Action picker so dropdown
      // changes also reveal/hide it (Phase 25 user feedback).
      const tapPickerLabel = document.querySelector("#quick-mode-color-picker-label");
      if (tapPickerLabel) {
        tapPickerLabel.style.display = isSolidColor ? "" : "none";
      }
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
      // Persist immediately so /output/ and any other connected view
      // pick up the new global speed multiplier — without this they
      // keep running at the previously-saved value and animations
      // visibly drift relative to the dashboard.
      const persisted = persistRuntimeSoundSettingsChange(
        `Status: Animation Speed ${state.animationSpeed.toFixed(2)}x (persistence failed)`,
      );
      triggerFeedback.textContent = persisted
        ? `Status: Animation Speed ${state.animationSpeed.toFixed(2)}x`
        : `Status: Animation Speed ${state.animationSpeed.toFixed(2)}x (persistence failed)`;
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

    diagnosticOverlayToggle?.addEventListener("change", () => {
      setDiagnosticOverlay(diagnosticOverlayToggle.checked);
    });

    // Phase 31 Plan 05 (publishability) — wire the System & Performance
    // subtab Server-side Rendering section to live-sync. Initialised once
    // here per ctx; the panel module no-ops if its DOM section is absent
    // (e.g. on Pi /output/). The panel itself uses fetch("/api/global-defaults")
    // for the initial config snapshot — keeps the dashboard the
    // single point-of-truth even when SSR is disabled (server simply
    // returns the persisted serverRendering block).
    try {
      const ssrPanel = window.TT_BEAMER_SETTINGS_SERVER_RENDERING_PANEL;
      if (ssrPanel && typeof ssrPanel.initServerRenderingPanel === "function") {
        ssrPanel.initServerRenderingPanel({
          refs: ctx,
          emitLiveMutation: ctx.emitLiveMutation,
          // Phase 50: wire markLocalConfigDirty so the bitrate slider
          // can flag pending changes to the global Apply bar without
          // immediately restarting the SSR Chromium tab.
          markLocalConfigDirty: (reason) => {
            try { window.TT_BEAMER_RUNTIME_CONFIG_SYNC?.markLocalConfigDirty?.(reason); } catch { /* ignore */ }
          },
        });
      }
    } catch (err) {
      // Defensive: never let a settings-panel init failure break the
      // wider settings binders chain.
      // eslint-disable-next-line no-console
      console.warn("[31-05] initServerRenderingPanel failed:", err?.message || err);
    }

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
