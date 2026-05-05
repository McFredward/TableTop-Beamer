// W3.5-C2 — BOOTSTRAP.init dep-bag builder extracted from
// runtime-orchestration.js. Hosts the 95-key context bag construction
// for the runtime bootstrap module. Per PLAN W3.5-C2 arrow-pattern
// rule: every `(args) => fnName(args)` wrapper from the orchestration
// dep-bag is preserved verbatim here — fnName resolves to the
// destructured local accepted via `refs`. Reassignability semantics
// (e.g., for BOARDS, which is reassigned via runtime-zone-loader's
// setBoards callback) are preserved by keeping arrow wrappers around
// accessor refs rather than reducing to direct function refs.
//
// W4.1-C1 — Reorganised the 95-key bag into 17 natural areas with
// in-source banner headers (per PLAN §4.1.1). Keys, names, and value
// expressions are PRESERVED VERBATIM; only the in-source order
// changes (destructure block + return literal both follow the same
// area sequence).
(() => {
  function buildBootstrapCtx(refs) {
    const {
      // ─── Area A — Runtime state + globals ───────────────────────
      state,
      liveSync,
      logBootstrap,
      triggerFeedback,
      // ─── Area B — DOM refs (panel inputs / status nodes) ────────
      globalDefaultsStatus,
      apiDiagnoseStatus,
      animationSpeedInput,
      roomAnimationSelect,
      roomOpacityInput,
      roomOpacityValue,
      roomIntensityValue,
      roomSpeedValue,
      roomSoundVolumeValue,
      roomDurationInput,
      audioEnabledInput,
      audioVolumeInput,
      audioVolumeValue,
      // ─── Area C — Boards ────────────────────────────────────────
      getBoards,
      switchBoard,
      // ─── Area D — Clamps ────────────────────────────────────────
      clampRoomOpacity,
      clampRoomSpeed,
      clampRoomSoundVolume,
      clampAnimationSpeed,
      // ─── Area E — Panel sync ────────────────────────────────────
      syncRoomDraftActionButton,
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
      syncMp4PerformanceControlsPanel,
      syncMobileStickyOffsets,
      syncQuickModePanel,
      syncBoardSelectOptions,
      // ─── Area F — Status sync ───────────────────────────────────
      syncAudioStatus,
      syncMobilePerformanceStatus,
      // ─── Area G — Audio side-effects ────────────────────────────
      syncAudioGain,
      enforceAudioLifecycleGuard,
      playSoundForAnimation,
      // ─── Area H — View + viewport ───────────────────────────────
      applyOutputRoleViewContract,
      loadProjectionCornersFromConfig,
      applyProjectionTransform,
      setActiveView,
      setPanCursorState,
      // ─── Area I — Default-data factories ────────────────────────
      createDefaultHitareaCalibrationMap,
      createDefaultRoomTombstonesByBoard,
      createDefaultRoomGeometryByBoard,
      createDefaultSpecialPolygonsByBoard,
      createDefaultPlayAreasByBoard,
      createDefaultSelectedPlayAreaIdByBoard,
      createDefaultInsideFxByBoard,
      createDefaultRoomFxByBoard,
      createDefaultOutsideFxByBoard,
      createDefaultBoardZoomByBoard,
      createDefaultAnimationSoundMap,
      // ─── Area J — Domain getters / normalizers ──────────────────
      getShipPolygonPoints,
      normalizeQuickMode,
      normalizeAnimationSoundMap,
      // ─── Area K — Boot-flow ─────────────────────────────────────
      fetchGlobalDefaultsPayload,
      loadBoardProfiles,
      captureCleanBaseline,
      restoreSettingsSubtabPreference,
      loadExternalBoardZones,
      loadOutsideResourceAssets,
      // ─── Area L — Error / overlay UI ────────────────────────────
      buildResolveSnapshot,
      formatResolveSnapshot,
      renderServerUnreachableOverlay,
      // ─── Area M — Live-sync ─────────────────────────────────────
      connectLiveSyncSocket,
      scheduleNextLiveSnapshotPoll,
      emitLiveMutation,
      buildAnimationSnapshotForLiveSync,
      // ─── Area N — Asset warm-up ─────────────────────────────────
      warmEventSoundAssets,
      warmRoomGifAssets,
      prewarmBoardOutsideMp4Asset,
      // ─── Area O — Regression tests ──────────────────────────────
      runViewVisibilityRegression,
      runLayoutScrollRegression,
      runStartupDefaultsGuardRegression,
      runZoomPanEditRegression,
      runPanPointerCaptureRegression,
      runOrientationStateRegression,
      runNavigationStateRegression,
      runMobileProjectionVisibilityGuard,
      runOutsideIsolationRegression,
      runShipClipRegression,
      // ─── Area P — Animation lifecycle hooks ─────────────────────
      renderRunningAnimationsList,
      refreshGlobalButtons,
      draw,
      createAnimation,
      // ─── Area Q — Diagnostics ───────────────────────────────────
      getLiveTraceSnapshot,
    } = refs;
    // Phase 28 B5: asset manifest resolver. Every render-layer module that
    // turns a raw assetRef into a network URL goes through ctx.resolveAssetUrlWithHash
    // so `?v=<hash>` cache-busting is enforced consistently.
    const resolveAssetUrlWithHash = (rawPath) => {
      const m = window.TT_BEAMER_RUNTIME_ASSET_MANIFEST;
      return m && typeof m.resolveAssetUrlWithHash === "function"
        ? m.resolveAssetUrlWithHash(rawPath)
        : rawPath;
    };
    return {
      // ─── Area A — Runtime state + globals ───────────────────────
      state,
      liveSync,
      logBootstrap,
      triggerFeedback,
      // ─── Area B — DOM refs (panel inputs / status nodes) ────────
      globalDefaultsStatus,
      apiDiagnoseStatus,
      animationSpeedInput,
      roomAnimationSelect,
      roomOpacityInput,
      roomOpacityValue,
      roomIntensityValue,
      roomSpeedValue,
      roomSoundVolumeValue,
      roomDurationInput,
      audioEnabledInput,
      audioVolumeInput,
      audioVolumeValue,
      // ─── Area C — Boards ────────────────────────────────────────
      getBoards: () => getBoards(),
      switchBoard: (boardId, opts) => switchBoard(boardId, opts),
      // ─── Area D — Clamps ────────────────────────────────────────
      clampRoomOpacity: (v) => clampRoomOpacity(v),
      clampRoomSpeed: (v) => clampRoomSpeed(v),
      clampRoomSoundVolume: (v) => clampRoomSoundVolume(v),
      clampAnimationSpeed: (v) => clampAnimationSpeed(v),
      // ─── Area E — Panel sync ────────────────────────────────────
      syncRoomDraftActionButton: () => syncRoomDraftActionButton(),
      syncAudioMappingPanel: () => syncAudioMappingPanel(),
      syncAnimationSpeedPanel: () => syncAnimationSpeedPanel(),
      syncHitareaCalibrationPanel: () => syncHitareaCalibrationPanel(),
      syncRoomGeometryPanel: () => syncRoomGeometryPanel(),
      syncPolygonEditorPanel: () => syncPolygonEditorPanel(),
      syncShipPolygonEditorPanel: () => syncShipPolygonEditorPanel(),
      syncRoomFxPanel: () => syncRoomFxPanel(),
      syncOutsideFxPanel: () => syncOutsideFxPanel(),
      syncAlignModePanel: () => syncAlignModePanel(),
      syncBoardZoomPanel: () => syncBoardZoomPanel(),
      syncDashboardZoneVisibility: () => syncDashboardZoneVisibility(),
      syncMp4PerformanceControlsPanel: () => syncMp4PerformanceControlsPanel(),
      syncMobileStickyOffsets: () => syncMobileStickyOffsets(),
      syncQuickModePanel: () => syncQuickModePanel(),
      syncBoardSelectOptions: () => syncBoardSelectOptions(),
      // ─── Area F — Status sync ───────────────────────────────────
      syncAudioStatus: () => syncAudioStatus(),
      syncMobilePerformanceStatus: () => syncMobilePerformanceStatus(),
      // ─── Area G — Audio side-effects ────────────────────────────
      syncAudioGain: () => syncAudioGain(),
      enforceAudioLifecycleGuard: () => enforceAudioLifecycleGuard(),
      playSoundForAnimation: (animation) => playSoundForAnimation(animation),
      // ─── Area H — View + viewport ───────────────────────────────
      applyOutputRoleViewContract: () => applyOutputRoleViewContract(),
      loadProjectionCornersFromConfig: (config) => loadProjectionCornersFromConfig(config),
      applyProjectionTransform: () => applyProjectionTransform(),
      setActiveView: (view, opts) => setActiveView(view, opts),
      setPanCursorState: () => setPanCursorState(),
      // ─── Area I — Default-data factories ────────────────────────
      createDefaultHitareaCalibrationMap: () => createDefaultHitareaCalibrationMap(),
      createDefaultRoomTombstonesByBoard: () => createDefaultRoomTombstonesByBoard(),
      createDefaultRoomGeometryByBoard: () => createDefaultRoomGeometryByBoard(),
      createDefaultSpecialPolygonsByBoard: () => createDefaultSpecialPolygonsByBoard(),
      createDefaultPlayAreasByBoard: () => createDefaultPlayAreasByBoard(),
      createDefaultSelectedPlayAreaIdByBoard: () => createDefaultSelectedPlayAreaIdByBoard(),
      createDefaultInsideFxByBoard: () => createDefaultInsideFxByBoard(),
      createDefaultRoomFxByBoard: () => createDefaultRoomFxByBoard(),
      createDefaultOutsideFxByBoard: () => createDefaultOutsideFxByBoard(),
      createDefaultBoardZoomByBoard: () => createDefaultBoardZoomByBoard(),
      createDefaultAnimationSoundMap,
      // ─── Area J — Domain getters / normalizers ──────────────────
      getShipPolygonPoints: (boardId) => getShipPolygonPoints(boardId),
      normalizeQuickMode: (mode) => normalizeQuickMode(mode),
      normalizeAnimationSoundMap,
      // ─── Area K — Boot-flow ─────────────────────────────────────
      fetchGlobalDefaultsPayload: () => fetchGlobalDefaultsPayload(),
      loadBoardProfiles: () => loadBoardProfiles(),
      captureCleanBaseline: () => captureCleanBaseline(),
      restoreSettingsSubtabPreference: () => restoreSettingsSubtabPreference(),
      loadExternalBoardZones: () => loadExternalBoardZones(),
      loadOutsideResourceAssets: () => loadOutsideResourceAssets(),
      // ─── Area L — Error / overlay UI ────────────────────────────
      buildResolveSnapshot: (opts) => buildResolveSnapshot(opts),
      formatResolveSnapshot: (snapshot) => formatResolveSnapshot(snapshot),
      renderServerUnreachableOverlay: (error) => renderServerUnreachableOverlay(error),
      // ─── Area M — Live-sync ─────────────────────────────────────
      connectLiveSyncSocket: () => connectLiveSyncSocket(),
      scheduleNextLiveSnapshotPoll: (delay) => scheduleNextLiveSnapshotPoll(delay),
      emitLiveMutation: (type, payload) => emitLiveMutation(type, payload),
      buildAnimationSnapshotForLiveSync: (animation) => buildAnimationSnapshotForLiveSync(animation),
      // ─── Area N — Asset warm-up ─────────────────────────────────
      warmEventSoundAssets: () => warmEventSoundAssets(),
      warmRoomGifAssets: (opts) => warmRoomGifAssets(opts),
      prewarmBoardOutsideMp4Asset: (boardId, opts) => prewarmBoardOutsideMp4Asset(boardId, opts),
      // ─── Area O — Regression tests ──────────────────────────────
      runViewVisibilityRegression: () => runViewVisibilityRegression(),
      runLayoutScrollRegression: () => runLayoutScrollRegression(),
      runStartupDefaultsGuardRegression: () => runStartupDefaultsGuardRegression(),
      runZoomPanEditRegression: () => runZoomPanEditRegression(),
      runPanPointerCaptureRegression: () => runPanPointerCaptureRegression(),
      runOrientationStateRegression: () => runOrientationStateRegression(),
      runNavigationStateRegression: () => runNavigationStateRegression(),
      runMobileProjectionVisibilityGuard: (opts) => runMobileProjectionVisibilityGuard(opts),
      runOutsideIsolationRegression: () => runOutsideIsolationRegression(),
      runShipClipRegression: () => runShipClipRegression(),
      // ─── Area P — Animation lifecycle hooks ─────────────────────
      renderRunningAnimationsList: () => renderRunningAnimationsList(),
      refreshGlobalButtons: () => refreshGlobalButtons(),
      draw: (timestamp) => draw(timestamp),
      createAnimation: (opts) => createAnimation(opts),
      // ─── Area Q — Diagnostics ───────────────────────────────────
      getLiveTraceSnapshot,
      // ─── Area R — Asset manifest resolver (Phase 28 B5) ──────────
      resolveAssetUrlWithHash,
    };
  }

  window.TT_BEAMER_RUNTIME_ORCHESTRATION_CTX_BUILDER = {
    buildBootstrapCtx,
  };
})();
