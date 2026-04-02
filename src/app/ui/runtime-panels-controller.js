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
    roomHoldInput,
    roomDurationInput,
    syncRoomDraftActionButton,
    audioEnabledInput,
    audioVolumeInput,
    audioVolumeValue,
    applyAudioGain,
    enforceAudioLifecycleGuard,
    syncAudioStatus,
    syncAudioMappingPanel,
    syncAnimationSpeedPanel,
    syncHitareaCalibrationPanel,
    syncRoomGeometryPanel,
    syncPolygonEditorPanel,
    syncShipPolygonEditorPanel,
    syncRoomFxPanel,
    syncOutsideFxPanel,
    syncAlignModePanel,
    syncBoardZoomPanel,
    syncDashboardZoneVisibility,
    updateMobilePerformanceStatus,
  }) {
    switchBoard(state.boardId, { announceStatus: false });
    roomAnimationSelect.value = state.roomDraft.animationId;
    roomOpacityInput.value = String(clampRoomOpacity(state.roomDraft.opacity));
    roomOpacityValue.textContent = clampRoomOpacity(state.roomDraft.opacity).toFixed(2);
    roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
    roomSpeedValue.textContent = `${clampRoomSpeed(state.roomDraft.speed).toFixed(2)}x`;
    roomSoundVolumeValue.textContent = `${Math.round(clampRoomSoundVolume(state.roomDraft.soundVolume) * 100)}%`;
    roomHoldInput.checked = true;
    roomDurationInput.value = "0";
    roomDurationInput.disabled = true;
    syncRoomDraftActionButton();
    audioEnabledInput.checked = state.audio.enabled;
    audioVolumeInput.value = String(Math.round(state.audio.volume * 100));
    audioVolumeValue.textContent = `${Math.round(state.audio.volume * 100)}%`;
    applyAudioGain();
    enforceAudioLifecycleGuard();
    syncAudioStatus();
    syncAudioMappingPanel();
    syncAnimationSpeedPanel();
    syncHitareaCalibrationPanel();
    syncRoomGeometryPanel();
    syncPolygonEditorPanel();
    syncShipPolygonEditorPanel();
    syncRoomFxPanel();
    syncOutsideFxPanel();
    syncAlignModePanel();
    syncBoardZoomPanel();
    syncDashboardZoneVisibility();
    updateMobilePerformanceStatus();
  }

  window.TT_BEAMER_UI_RUNTIME_PANELS = {
    syncRuntimePanelsFromState,
  };
})();
