// Runtime-panels controller. Owns syncRuntimePanelsFromState which
// fans out to every panel-sync helper - room list, animation editor,
// align-mode panel, board zoom, dashboard-zone visibility, mobile
// performance status. Exposes TT_BEAMER_RUNTIME_PANELS for bootstrap
// to invoke during initial load.

(() => {
  function syncRuntimePanelsFromState({
    state,
    switchBoard,
    roomAnimationSelect,
    roomOpacityInput,
    roomOpacityValue,
    clampRoomOpacity,
    roomIntensityValue,
    roomSpeedValue,
    clampRoomSpeed,
    roomSoundVolumeValue,
    clampRoomSoundVolume,
    roomDurationInput,
    syncRoomDraftActionButton,
    audioEnabledInput,
    audioVolumeInput,
    audioVolumeValue,
    syncAudioGain,
    enforceAudioLifecycleGuard,
    syncAudioStatus,
    syncAnimationSpeedPanel,
    syncHitareaCalibrationPanel,
    syncRoomGeometryPanel,
    syncPolygonEditorPanel,
    syncShipPolygonEditorPanel,
    syncRoomFxPanel,
    syncOutsideFxPanel,
    syncInsideFxPanel,
    syncAlignModePanel,
    syncBoardZoomPanel,
    syncDashboardZoneVisibility,
    syncDiagnosticOverlayPanel,
  }) {
    switchBoard(state.boardId, { announceStatus: false });
    roomAnimationSelect.value = state.roomDraft.animationId;
    roomOpacityInput.value = String(clampRoomOpacity(state.roomDraft.opacity));
    roomOpacityValue.textContent = clampRoomOpacity(state.roomDraft.opacity).toFixed(2);
    roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
    roomSpeedValue.textContent = `${clampRoomSpeed(state.roomDraft.speed).toFixed(2)}x`;
    roomSoundVolumeValue.textContent = `${Math.round(clampRoomSoundVolume(state.roomDraft.soundVolume) * 100)}%`;
    roomDurationInput.value = "0";
    roomDurationInput.disabled = true;
    syncRoomDraftActionButton();
    audioEnabledInput.checked = state.audio.enabled;
    audioVolumeInput.value = String(Math.round(state.audio.volume * 100));
    audioVolumeValue.textContent = `${Math.round(state.audio.volume * 100)}%`;
    syncAudioGain();
    enforceAudioLifecycleGuard();
    syncAudioStatus();
    syncAnimationSpeedPanel();
    syncHitareaCalibrationPanel();
    syncRoomGeometryPanel();
    syncPolygonEditorPanel();
    syncShipPolygonEditorPanel();
    syncRoomFxPanel();
    syncOutsideFxPanel();
    if (typeof syncInsideFxPanel === "function") syncInsideFxPanel();
    syncAlignModePanel();
    syncBoardZoomPanel();
    syncDashboardZoneVisibility();
    if (typeof syncDiagnosticOverlayPanel === "function") syncDiagnosticOverlayPanel();
  }

  const runtimePanelsApi = {
    syncRuntimePanelsFromState,
  };

  // Expose the runtime panels API so bootstrap can read it and
  // sync via syncRuntimePanelsFromState during initial load.
  window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
})();
