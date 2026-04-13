// Phase 14-2: application bootstrap module.
//
// Owns syncRuntimePanelsFromState (runtime panel wire-up via the
// canonical/legacy TT_BEAMER_RUNTIME_PANELS delegation) and
// initializeApplication (the full startup sequence: zone loader,
// outside resources, default state maps, server-first config hydration
// with blocking overlay on failure, panel sync, live-sync connect,
// asset warmup, regression self-tests, initial draw loop kickoff).
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function syncRuntimePanelsFromState() {
    const runtimePanelsApi = window.TT_BEAMER_RUNTIME_PANELS ?? window.TT_BEAMER_UI_RUNTIME_PANELS ?? null;
    if (!runtimePanelsApi || typeof runtimePanelsApi.syncRuntimePanelsFromState !== "function") {
      ctx.logBootstrap.warn("runtime_panels_missing", {
        event: "runtime-panels-missing",
        hasCanonical: Boolean(window.TT_BEAMER_RUNTIME_PANELS),
        hasLegacy: Boolean(window.TT_BEAMER_UI_RUNTIME_PANELS),
      });
      return;
    }
    if (!window.TT_BEAMER_RUNTIME_PANELS) {
      window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
    }
    if (!window.TT_BEAMER_UI_RUNTIME_PANELS) {
      window.TT_BEAMER_UI_RUNTIME_PANELS = runtimePanelsApi;
    }

    runtimePanelsApi.syncRuntimePanelsFromState({
      state: ctx.state,
      switchBoard: ctx.switchBoard,
      roomAnimationSelect: ctx.roomAnimationSelect,
      roomOpacityInput: ctx.roomOpacityInput,
      roomOpacityValue: ctx.roomOpacityValue,
      clampRoomOpacity: ctx.clampRoomOpacity,
      roomIntensityValue: ctx.roomIntensityValue,
      roomSpeedValue: ctx.roomSpeedValue,
      clampRoomSpeed: ctx.clampRoomSpeed,
      roomSoundVolumeValue: ctx.roomSoundVolumeValue,
      clampRoomSoundVolume: ctx.clampRoomSoundVolume,
      roomDurationInput: ctx.roomDurationInput,
      syncRoomDraftActionButton: ctx.syncRoomDraftActionButton,
      audioEnabledInput: ctx.audioEnabledInput,
      audioVolumeInput: ctx.audioVolumeInput,
      audioVolumeValue: ctx.audioVolumeValue,
      applyAudioGain: ctx.applyAudioGain,
      enforceAudioLifecycleGuard: ctx.enforceAudioLifecycleGuard,
      syncAudioStatus: ctx.syncAudioStatus,
      syncAudioMappingPanel: ctx.syncAudioMappingPanel,
      syncAnimationSpeedPanel: ctx.syncAnimationSpeedPanel,
      syncHitareaCalibrationPanel: ctx.syncHitareaCalibrationPanel,
      syncRoomGeometryPanel: ctx.syncRoomGeometryPanel,
      syncPolygonEditorPanel: ctx.syncPolygonEditorPanel,
      syncShipPolygonEditorPanel: ctx.syncShipPolygonEditorPanel,
      syncRoomFxPanel: ctx.syncRoomFxPanel,
      syncOutsideFxPanel: ctx.syncOutsideFxPanel,
      syncAlignModePanel: ctx.syncAlignModePanel,
      syncBoardZoomPanel: ctx.syncBoardZoomPanel,
      syncDashboardZoneVisibility: ctx.syncDashboardZoneVisibility,
      updateMobilePerformanceStatus: ctx.updateMobilePerformanceStatus,
      syncMp4PerformanceControlsPanel: ctx.syncMp4PerformanceControlsPanel,
    });
    ctx.syncMp4PerformanceControlsPanel();
  }

  async function initializeApplication() {
    const state = ctx.state;
    const liveSync = ctx.liveSync;
    ctx.logBootstrap.info("init_start", { event: "init-start" });
    await ctx.loadExternalBoardZones();
    await ctx.loadOutsideResourceAssets();
    ctx.syncBoardSelectOptions();
    const zoneFallbackCount = Object.values(state.zoneLoader.classificationByBoard).filter(
      (entry) => entry && entry !== "ZONE_LOADED",
    ).length;
    if (zoneFallbackCount > 0) {
      ctx.triggerFeedback.textContent =
        `Status: Zone fallback active (${zoneFallbackCount} board) - see zone-source status in Settings panel`;
    }
    const BOARDS = ctx.getBoards();
    if (!state.boardId || !BOARDS.some((board) => board.id === state.boardId)) {
      state.boardId = BOARDS[0]?.id ?? "";
    }
    // Phase 15-5: hitarea + geometry are legacy identity stubs. The
    // maps still need to exist (empty objects per board) so code
    // that reads them via getHitareaCalibration / getRoomGeometry
    // doesn't crash on undefined property access.
    state.hitareaCalibrationByBoard = Object.fromEntries(
      ctx.getBoards().map((board) => [board.id, { offsetX: 0, offsetY: 0, scale: 1 }]),
    );
    state.roomGeometryByBoard = Object.fromEntries(
      ctx.getBoards().map((board) => [board.id, {}]),
    );
    state.roomTombstonesByBoard = ctx.createDefaultRoomTombstonesByBoard();
    state.roomStateProfilesByBoard = ctx.createDefaultRoomStateProfilesByBoard();
    state.specialPolygonsByBoard = ctx.createDefaultSpecialPolygonsByBoard();
    state.playAreasByBoard = ctx.createDefaultPlayAreasByBoard();
    state.selectedPlayAreaIdByBoard = ctx.createDefaultSelectedPlayAreaIdByBoard();
    state.shipPolygonsByBoard = Object.fromEntries(
      ctx.getBoards().map((board) => [board.id, ctx.getShipPolygonPoints(board.id)]),
    );
    state.insideFxByBoard = ctx.createDefaultInsideFxByBoard();
    state.roomFxByBoard = ctx.createDefaultRoomFxByBoard();
    state.outsideFxByBoard = ctx.createDefaultOutsideFxByBoard();
    state.boardZoomByBoard = ctx.createDefaultBoardZoomByBoard();
    state.quickMode = {
      mode: ctx.normalizeQuickMode(state.quickMode?.mode),
      inflightByRoom: state.quickMode?.inflightByRoom && typeof state.quickMode.inflightByRoom === "object"
        ? state.quickMode.inflightByRoom
        : {},
    };
    state.animationSoundMap = ctx.normalizeAnimationSoundMap(ctx.createDefaultAnimationSoundMap());
    state.animationSpeed = ctx.clampAnimationSpeed(ctx.animationSpeedInput.value);

    state.startupDefaultsGuard.fallbackRequired = true;
    state.startupDefaultsGuard.attempted = false;
    state.startupDefaultsGuard.applied = false;
    state.startupDefaultsGuard.outcome = "pending";
    state.startupDefaultsGuard.detail = "server-first-hydration-required";

    let startupDefaultsSnapshot = null;

    try {
      const loaded = await ctx.fetchGlobalDefaultsPayload();
      window.__TT_BEAMER_BOOTSTRAP_CONFIG__ = loaded.payload;
      ctx.loadBoardProfiles();
      ctx.captureCleanBaseline();
      state.startupDefaultsGuard.attempted = true;
      state.startupDefaultsGuard.applied = true;
      state.startupDefaultsGuard.outcome = "applied";
      state.startupDefaultsGuard.detail = loaded.endpoint || "server-config";
      startupDefaultsSnapshot = ctx.buildResolveSnapshot({
        routing: loaded.routing,
        endpoint: loaded.endpoint,
        method: "GET",
      });
    } catch (error) {
      state.startupDefaultsGuard.attempted = true;
      state.startupDefaultsGuard.applied = false;
      state.startupDefaultsGuard.outcome = "failed-explicit";
      state.startupDefaultsGuard.detail = String(error?.message || error || "server-unreachable");
      ctx.loadBoardProfiles();
      ctx.captureCleanBaseline();
      ctx.renderServerUnreachableOverlay(error);
      if (ctx.globalDefaultsStatus) {
        ctx.globalDefaultsStatus.textContent =
          "Global config: server not reachable — no local fallback. Click Retry to try again.";
      }
    }

    syncRuntimePanelsFromState();

    ctx.restoreSettingsSubtabPreference();
    ctx.syncQuickModePanel();
    ctx.syncMobileStickyOffsets();
    ctx.applyOutputRoleViewContract();
    ctx.connectLiveSyncSocket();
    ctx.scheduleNextLiveSnapshotPoll(0);
    if (startupDefaultsSnapshot) {
      if (ctx.globalDefaultsStatus) {
        ctx.globalDefaultsStatus.textContent =
          `Global Defaults: automatically loaded & applied (${ctx.formatResolveSnapshot(startupDefaultsSnapshot)})`;
      }
      ctx.triggerFeedback.textContent =
        `Status: Startup defaults active (${ctx.formatResolveSnapshot(startupDefaultsSnapshot)})`;
      if (ctx.apiDiagnoseStatus) {
        ctx.apiDiagnoseStatus.textContent =
          `API diagnostics: startup load OK (${ctx.formatResolveSnapshot(startupDefaultsSnapshot)})`;
      }
    }
    ctx.warmEventSoundAssets();
    ctx.warmRoomGifAssets({ reason: "startup" });
    ctx.prewarmBoardOutsideMp4Asset(state.boardId, { reason: "startup" });
    ctx.setActiveView("dashboard");
    ctx.setPanCursorState();
    const viewRegressionOk = ctx.runViewVisibilityRegression();
    const layoutRegressionOk = ctx.runLayoutScrollRegression();
    const startupGuardRegressionOk = ctx.runStartupDefaultsGuardRegression();
    const zoomPanRegressionOk = ctx.runZoomPanEditRegression();
    const panPointerRegressionOk = ctx.runPanPointerCaptureRegression();
    const orientationRegressionOk = ctx.runOrientationStateRegression();
    const navigationRegressionOk = ctx.runNavigationStateRegression();
    const projectionVisibilityOk = ctx.runMobileProjectionVisibilityGuard({ silent: true, context: "startup" });
    const outsideIsolationRegressionOk = ctx.runOutsideIsolationRegression();
    const shipClipRegressionOk = ctx.runShipClipRegression();
    if (
      !viewRegressionOk ||
      !layoutRegressionOk ||
      !startupGuardRegressionOk ||
      !zoomPanRegressionOk ||
      !panPointerRegressionOk ||
      !orientationRegressionOk ||
      !navigationRegressionOk ||
      !projectionVisibilityOk ||
      !outsideIsolationRegressionOk ||
      !shipClipRegressionOk
    ) {
      ctx.triggerFeedback.textContent =
        "Status: Regression failed (startup/view/layout/zoom-pan/orientation/navigation/projection + outside isolation + ship clip)";
    } else {
      ctx.triggerFeedback.textContent =
        "Status: Regression ok (Startup + View/Layout + Zoom-Pan-Edit + Orientation + Navigation + Projection + Pointer-Capture + Outside-Isolation + Ship-Clip)";
    }
    ctx.renderRunningAnimationsList();
    ctx.refreshGlobalButtons();
    window.TT_BEAMER_LIVE_SYNC_DEBUG = {
      getLiveTraceSnapshot: ctx.getLiveTraceSnapshot,
    };
    ctx.logBootstrap.info("init_ready", {
      event: "init-ready",
      boardId: state.boardId,
      version: liveSync.lastAppliedVersion,
    });
    // Phase 18: dismiss loading overlay using stability-based detection.
    // The startup sequence involves async steps (server fetch, board switch,
    // image load, animation start) that happen over several seconds. Instead
    // of trying to hook each step, we poll every 200ms and require ALL
    // conditions to be met simultaneously for 3 consecutive checks (~600ms
    // of stability). Any change resets the counter.
    //
    // Ready conditions:
    //   - Board image loaded (complete + naturalWidth > 0)
    //   - Board image src hasn't changed since last check
    //   - Draw loop is advancing (frameIndex > 10 = several frames rendered)
    //   - WebSocket connected OR at least one poll cycle done
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      const boardImage = ctx.boardImage;
      let lastCheckedSrc = "";
      let consecutiveReadyChecks = 0;
      const REQUIRED_STABLE_CHECKS = 2;

      const dismiss = () => {
        loadingOverlay.classList.add("is-hidden");
        loadingOverlay.addEventListener("transitionend", () => loadingOverlay.remove(), { once: true });
      };

      const checkStable = () => {
        const currentSrc = boardImage?.src || "";
        const imageLoaded = boardImage && boardImage.complete && boardImage.naturalWidth > 0;
        const srcStable = currentSrc === lastCheckedSrc && currentSrc !== "";
        const drawRunning = (state.runtimePerf?.frameIndex || 0) > 3;
        const socketReady = liveSync.socket?.readyState === 1;
        const pollDone = liveSync.lastAppliedVersion > 0;
        const syncReady = socketReady || pollDone;

        lastCheckedSrc = currentSrc;

        if (imageLoaded && srcStable && drawRunning && syncReady) {
          consecutiveReadyChecks += 1;
        } else {
          consecutiveReadyChecks = 0;
        }

        if (consecutiveReadyChecks >= REQUIRED_STABLE_CHECKS) {
          dismiss();
          return;
        }
        setTimeout(checkStable, 150);
      };
      setTimeout(checkStable, 100);
      // Safety: always dismiss after 15s
      setTimeout(() => {
        if (!loadingOverlay.classList.contains("is-hidden")) dismiss();
      }, 15000);
    }
    requestAnimationFrame(ctx.draw);
  }

  window.TT_BEAMER_RUNTIME_BOOTSTRAP = {
    init,
    syncRuntimePanelsFromState,
    initializeApplication,
  };
})();
