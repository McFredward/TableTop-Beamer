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

    // Phase 15-9: standalone Sound Mapping panel removed — these two
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

    // Phase 15-7: Dashboard-side align mode toggle button.
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

    // Phase 20: unified per-board package export/import.
    // Phase 21-2: package and image imports are separate two-step flows —
    // pick a file (preview), then click Upload. Package imports peek at
    // the zip's package.json locally so the rename field can be prefilled
    // with the board's embedded label without a double-upload.
    (function wireBundleExportImport() {
      const exportButton = document.querySelector("#bundle-export-board");
      const tabButtons = Array.from(document.querySelectorAll(".bundle-import-tab"));
      const tabPanels = Array.from(document.querySelectorAll("[data-bundle-import-panel]"));
      const packageFileInput = document.querySelector("#bundle-import-package-file");
      const packageCard = document.querySelector("#bundle-import-package-card");
      const packageNameInput = document.querySelector("#bundle-import-package-name");
      const packageUploadButton = document.querySelector("#bundle-import-package-upload");
      const imageFileInput = document.querySelector("#bundle-import-image-file");
      const imageCard = document.querySelector("#bundle-import-image-card");
      const imageNameInput = document.querySelector("#bundle-import-image-name");
      const imageUploadButton = document.querySelector("#bundle-import-image-upload");
      const bundleStatus = document.querySelector("#bundle-status");
      const setStatus = (msg) => { if (bundleStatus) bundleStatus.textContent = msg; };

      let pendingPackageFile = null;
      let pendingImageFile = null;

      function switchTab(targetKey) {
        for (const btn of tabButtons) {
          const isActive = btn.dataset.bundleImportTab === targetKey;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", String(isActive));
        }
        for (const panel of tabPanels) {
          const isActive = panel.dataset.bundleImportPanel === targetKey;
          if (isActive) {
            panel.removeAttribute("hidden");
          } else {
            panel.setAttribute("hidden", "");
          }
        }
      }

      for (const btn of tabButtons) {
        btn.addEventListener("click", () => switchTab(btn.dataset.bundleImportTab));
      }

      function formatFileSize(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) return "";
        if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(0)} KB`;
      }

      function updateFileCard(cardRoot, file, { emptyIcon, filledIcon }) {
        if (!cardRoot) return;
        const iconEl = cardRoot.querySelector(".bundle-file-card-icon");
        const nameEl = cardRoot.querySelector(".bundle-file-card-name");
        const metaEl = cardRoot.querySelector(".bundle-file-card-meta");
        const clearEl = cardRoot.querySelector(".bundle-file-card-clear");
        if (!file) {
          cardRoot.classList.add("is-empty");
          if (iconEl) iconEl.textContent = emptyIcon;
          if (nameEl) nameEl.textContent = "No file selected";
          if (metaEl) metaEl.textContent = "";
          if (clearEl) clearEl.hidden = true;
          return;
        }
        cardRoot.classList.remove("is-empty");
        if (iconEl) iconEl.textContent = filledIcon;
        if (nameEl) nameEl.textContent = file.name;
        if (metaEl) metaEl.textContent = formatFileSize(file.size);
        if (clearEl) clearEl.hidden = false;
      }

      function updateFileCardMeta(cardRoot, metaText) {
        if (!cardRoot) return;
        const metaEl = cardRoot.querySelector(".bundle-file-card-meta");
        if (metaEl) metaEl.textContent = metaText;
      }

      document.querySelectorAll(".bundle-file-card-clear").forEach((button) => {
        button.addEventListener("click", () => {
          const which = button.dataset.bundleClear;
          if (which === "package") resetPackageForm();
          else if (which === "image") resetImageForm();
        });
      });

      exportButton?.addEventListener("click", async () => {
        const boardId = state.boardId;
        if (!boardId) { setStatus("No board selected."); return; }
        try {
          setStatus(`Preparing package for ${boardId}… (bundling assets, this can take a moment)`);
          const resp = await fetch(`/api/boards/bundle-export?boardId=${encodeURIComponent(boardId)}`);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          let downloadName = null;
          const cd = resp.headers.get("content-disposition") || "";
          const match = cd.match(/filename\s*=\s*"?([^";]+)"?/i);
          if (match) downloadName = match[1];
          if (!downloadName) {
            const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            downloadName = `tt-beamer-board-${boardId}-${stamp}.zip`;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = downloadName;
          document.body.append(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
          const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
          setStatus(`Saved ${downloadName} (${sizeMB} MB). Share this file.`);
        } catch (error) {
          setStatus(`Export failed: ${error?.message || error}`);
        }
      });

      // Browser-side reader: pulls package.json out of a zip File so we
      // can prefill the rename field from the board's embedded metadata
      // name without sending the whole package over the wire first.
      async function readPackageManifestFromZip(file) {
        const buf = await file.arrayBuffer();
        const view = new DataView(buf);
        const total = view.byteLength;
        const maxScan = Math.max(0, total - 65558);
        let eocd = -1;
        for (let i = total - 22; i >= maxScan; i--) {
          if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd === -1) throw new Error("not a valid .zip (no EOCD)");
        const totalEntries = view.getUint16(eocd + 10, true);
        const centralStart = view.getUint32(eocd + 16, true);
        let p = centralStart;
        const td = new TextDecoder("utf-8");
        for (let i = 0; i < totalEntries; i++) {
          if (view.getUint32(p, true) !== 0x02014b50) throw new Error("bad central directory");
          const method = view.getUint16(p + 10, true);
          const compressedSize = view.getUint32(p + 20, true);
          const nameLen = view.getUint16(p + 28, true);
          const extraLen = view.getUint16(p + 30, true);
          const commentLen = view.getUint16(p + 32, true);
          const localOffset = view.getUint32(p + 42, true);
          const filename = td.decode(new Uint8Array(buf, p + 46, nameLen));
          if (filename === "package.json") {
            if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("bad local header");
            const lnl = view.getUint16(localOffset + 26, true);
            const lel = view.getUint16(localOffset + 28, true);
            const dataStart = localOffset + 30 + lnl + lel;
            const raw = new Uint8Array(buf, dataStart, compressedSize);
            let json;
            if (method === 0) {
              json = td.decode(raw);
            } else if (method === 8) {
              const ds = new DecompressionStream("deflate-raw");
              const writer = ds.writable.getWriter();
              writer.write(raw);
              writer.close();
              const inflated = await new Response(ds.readable).arrayBuffer();
              json = td.decode(new Uint8Array(inflated));
            } else {
              throw new Error(`unsupported compression method ${method}`);
            }
            return JSON.parse(json);
          }
          p += 46 + nameLen + extraLen + commentLen;
        }
        throw new Error("package.json not found in zip");
      }

      function resetPackageForm() {
        pendingPackageFile = null;
        if (packageFileInput) packageFileInput.value = "";
        updateFileCard(packageCard, null, { emptyIcon: "📄", filledIcon: "📦" });
        if (packageNameInput) { packageNameInput.value = ""; packageNameInput.disabled = true; }
        if (packageUploadButton) packageUploadButton.disabled = true;
      }

      function resetImageForm() {
        pendingImageFile = null;
        if (imageFileInput) imageFileInput.value = "";
        updateFileCard(imageCard, null, { emptyIcon: "🖼️", filledIcon: "🖼️" });
        if (imageNameInput) { imageNameInput.value = ""; imageNameInput.disabled = true; }
        if (imageUploadButton) imageUploadButton.disabled = true;
      }

      packageFileInput?.addEventListener("change", async () => {
        const file = packageFileInput.files?.[0] ?? null;
        if (!file) { resetPackageForm(); return; }
        const mime = String(file.type || "").toLowerCase();
        const isPackage = /\.zip$/i.test(file.name)
          || mime === "application/zip"
          || mime === "application/x-zip-compressed";
        if (!isPackage) {
          setStatus(`Not a .zip package: ${file.name}`);
          resetPackageForm();
          return;
        }
        pendingPackageFile = file;
        updateFileCard(packageCard, file, { emptyIcon: "📄", filledIcon: "📦" });
        updateFileCardMeta(packageCard, `${formatFileSize(file.size)} · reading name…`);
        if (packageUploadButton) packageUploadButton.disabled = true;
        if (packageNameInput) { packageNameInput.disabled = true; packageNameInput.value = ""; }
        try {
          const manifest = await readPackageManifestFromZip(file);
          const embeddedName = String(
            manifest?.board?.metadata?.name
              ?? manifest?.board?.label
              ?? manifest?.boardId
              ?? "",
          ).trim();
          if (packageNameInput) {
            packageNameInput.value = embeddedName;
            packageNameInput.disabled = false;
          }
          if (packageUploadButton) packageUploadButton.disabled = false;
          updateFileCardMeta(packageCard, formatFileSize(file.size));
          setStatus(`Package ready: "${embeddedName || manifest?.boardId || "unknown"}" — review the name, then click Upload.`);
        } catch (error) {
          updateFileCardMeta(packageCard, formatFileSize(file.size));
          setStatus(`Could not read package metadata: ${error?.message || error}. You can still upload; the embedded name will be used.`);
          if (packageNameInput) { packageNameInput.value = ""; packageNameInput.disabled = false; }
          if (packageUploadButton) packageUploadButton.disabled = false;
        }
      });

      packageUploadButton?.addEventListener("click", async () => {
        if (!pendingPackageFile) return;
        const file = pendingPackageFile;
        const renameTo = packageNameInput?.value?.trim() ?? "";
        packageUploadButton.disabled = true;
        if (packageFileInput) packageFileInput.disabled = true;
        if (packageNameInput) packageNameInput.disabled = true;
        try {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
          setStatus(`Uploading ${file.name} (${sizeMB} MB)… — this can take a moment for packages with videos`);
          const url = renameTo
            ? `/api/boards/bundle-import?renameTo=${encodeURIComponent(renameTo)}`
            : "/api/boards/bundle-import";
          const resp = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/zip" },
            body: file,
          });
          if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            throw new Error(body?.error || `HTTP ${resp.status}`);
          }
          const body = await resp.json();
          const wrote = Number(body.resourcesWritten) || 0;
          const skipped = Number(body.resourcesSkipped) || 0;
          const extra = wrote || skipped
            ? ` · ${wrote} new asset${wrote === 1 ? "" : "s"}${skipped ? `, ${skipped} already on disk (skipped)` : ""}`
            : "";
          setStatus(`Imported "${body.boardId}"${extra}. Reload the page to see it in the list.`);
          triggerFeedback.textContent = `Status: Board ${body.boardId} imported`;
          resetPackageForm();
        } catch (error) {
          setStatus(`Import failed: ${error?.message || error}`);
          if (packageUploadButton) packageUploadButton.disabled = false;
          if (packageNameInput) packageNameInput.disabled = false;
        } finally {
          if (packageFileInput) packageFileInput.disabled = false;
        }
      });

      imageFileInput?.addEventListener("change", () => {
        const file = imageFileInput.files?.[0] ?? null;
        if (!file) { resetImageForm(); return; }
        const mime = String(file.type || "").toLowerCase();
        const isImage = mime.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name);
        if (!isImage) {
          setStatus(`Not a supported image: ${file.name}`);
          resetImageForm();
          return;
        }
        pendingImageFile = file;
        updateFileCard(imageCard, file, { emptyIcon: "🖼️", filledIcon: "🖼️" });
        if (imageNameInput) {
          const stem = file.name.replace(/\.[^.]+$/, "").trim();
          imageNameInput.value = stem;
          imageNameInput.disabled = false;
        }
        if (imageUploadButton) imageUploadButton.disabled = false;
        setStatus(`Image ready — edit the board name if you like, then click Upload.`);
      });

      imageUploadButton?.addEventListener("click", async () => {
        if (!pendingImageFile) return;
        const file = pendingImageFile;
        imageUploadButton.disabled = true;
        if (imageFileInput) imageFileInput.disabled = true;
        if (imageNameInput) imageNameInput.disabled = true;
        try {
          setStatus(`Uploading ${file.name}…`);
          const form = new FormData();
          form.append("image", file, file.name);
          const nameValue = imageNameInput?.value?.trim() ?? "";
          if (nameValue) form.append("boardName", nameValue);
          const resp = await fetch("/api/boards/import", { method: "POST", body: form });
          if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            throw new Error(body?.error || `HTTP ${resp.status}`);
          }
          const body = await resp.json();
          setStatus(`Created board "${body.boardId ?? body.board?.boardId ?? "(new)"}" — reload to see it.`);
          triggerFeedback.textContent = `Status: New board created from image`;
          resetImageForm();
        } catch (error) {
          setStatus(`Import failed: ${error?.message || error}`);
          if (imageUploadButton) imageUploadButton.disabled = false;
          if (imageNameInput) imageNameInput.disabled = false;
        } finally {
          if (imageFileInput) imageFileInput.disabled = false;
        }
      });
    })();

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
      event.returnValue = "You have unsaved changes.";
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
