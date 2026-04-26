// application bootstrap module.
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
      syncAudioGain: ctx.syncAudioGain,
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
      syncInsideFxPanel: ctx.syncInsideFxPanel,
      syncAlignModePanel: ctx.syncAlignModePanel,
      syncBoardZoomPanel: ctx.syncBoardZoomPanel,
      syncDashboardZoneVisibility: ctx.syncDashboardZoneVisibility,
      updateMobilePerformanceStatus: ctx.updateMobilePerformanceStatus,
      syncMp4PerformanceControlsPanel: ctx.syncMp4PerformanceControlsPanel,
    });
    ctx.syncMp4PerformanceControlsPanel();
  }

  // W3.6-C7 Phase 1: zone loader + outside resource assets + board
  // select options + zone fallback feedback.
  async function _initApplicationLoadZonesAndResources() {
    const state = ctx.state;
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
  }

  // W3.6-C7 Phase 2: per-board state initialization (board-id resolve,
  // legacy hitarea/geometry stubs, all per-board default maps, quick-
  // mode normalize, animation sound map + speed clamp).
  function _initApplicationSetupBoardState() {
    const state = ctx.state;
    const BOARDS = ctx.getBoards();
    // Honour the last-opened board id from localStorage
    // before falling back to the first available board. Server-side
    // state may carry its own boardId too — prefer that over the
    // persisted one if set, otherwise use the stored preference.
    let persistedBoardId = "";
    try {
      persistedBoardId = window.localStorage?.getItem("tt-beamer.last-board-id.v1") || "";
    } catch { /* private mode / quota — ignore */ }
    if (!state.boardId || !BOARDS.some((board) => board.id === state.boardId)) {
      if (persistedBoardId && BOARDS.some((board) => board.id === persistedBoardId)) {
        state.boardId = persistedBoardId;
      } else {
        state.boardId = BOARDS[0]?.id ?? "";
      }
    }
    // hitarea + geometry are legacy identity stubs. The
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
  }

  // W3.6-C7 Phase 3: server-first global-defaults hydration with
  // explicit failure overlay. Returns the resolve snapshot (or null
  // if hydration failed) so the caller can apply the post-hydration
  // status messaging.
  async function _initApplicationStartupDefaultsGuard() {
    const state = ctx.state;
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

    return startupDefaultsSnapshot;
  }

  // W3.6-C7 Phase 4: post-hydration panel sync + projection transform
  // application + live-sync socket connection + first poll schedule.
  function _initApplicationConnectAndSync() {
    syncRuntimePanelsFromState();

    ctx.restoreSettingsSubtabPreference();
    ctx.syncQuickModePanel();
    ctx.syncMobileStickyOffsets();
    ctx.applyOutputRoleViewContract();
    // Apply projection mapping transform on /output.
    // Corners are loaded from localStorage in the module's init() — no need
    // to overwrite them from server config (localStorage is per-client).
    if (typeof ctx.applyProjectionTransform === "function") {
      ctx.applyProjectionTransform();
    }
    ctx.connectLiveSyncSocket();
    ctx.scheduleNextLiveSnapshotPoll(0);
  }

  // W3.6-C7 Phase 5: status messaging from the resolved hydration
  // snapshot (operator visibility into where defaults came from).
  function _initApplicationApplyHydrationStatus(startupDefaultsSnapshot) {
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
  }

  // W3.6-C7 Phase 6: asset warmup (event sounds, room GIFs, outside
  // MP4 prewarm) + view activation + cursor state + 10 regression
  // self-tests with consolidated warning log on any failure.
  function _initApplicationWarmupAndRegress() {
    const state = ctx.state;
    const liveSync = ctx.liveSync;
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
      ctx.logBootstrap.warn("regression_check_failed", {
        event: "regression-check-failed",
        view: !viewRegressionOk, layout: !layoutRegressionOk,
        startup: !startupGuardRegressionOk, zoomPan: !zoomPanRegressionOk,
      });
    }
    ctx.triggerFeedback.textContent = "Status: ready";
    ctx.renderRunningAnimationsList();
    ctx.refreshGlobalButtons();
    ctx.logBootstrap.info("init_ready", {
      event: "init-ready",
      boardId: state.boardId,
      version: liveSync.lastAppliedVersion,
    });
  }

  // W3.6-C7 Phase 7: loading-overlay state setup + 12s safety
  // dismissal + first frame kickoff via requestAnimationFrame.
  function _initApplicationLoadingOverlayAndDraw() {
    const state = ctx.state;
    // Loading overlay state — tickLoadingOverlay() in the draw
    // loop checks this every frame and dismisses when ready. Two paths:
    //   FAST: no board switch + image loaded → dismiss after 3 stable frames
    //   SLOW: board switch detected → wait for server snapshot + new image
    state._loading = {
      overlay: document.getElementById("loading-overlay"),
      dismissed: false,
      initBoardSrc: ctx.boardImage?.src || "",
      lastSeenSrc: ctx.boardImage?.src || "",
      stableFrames: 0,
    };
    // Safety: always dismiss after 12s
    const loadingOverlay = state._loading.overlay;
    if (loadingOverlay) {
      setTimeout(() => {
        if (!state._loading.dismissed) {
          state._loading.dismissed = true;
          loadingOverlay.classList.add("is-hidden");
          loadingOverlay.addEventListener("transitionend", () => loadingOverlay.remove(), { once: true });
        }
      }, 12000);
    }
    requestAnimationFrame(ctx.draw);
  }

  async function initializeApplication() {
    ctx.logBootstrap.info("init_start", { event: "init-start" });
    await _initApplicationLoadZonesAndResources();
    _initApplicationSetupBoardState();
    const startupDefaultsSnapshot = await _initApplicationStartupDefaultsGuard();
    _initApplicationConnectAndSync();
    _initApplicationApplyHydrationStatus(startupDefaultsSnapshot);
    _initApplicationWarmupAndRegress();
    _initApplicationLoadingOverlayAndDraw();
  }

  window.TT_BEAMER_RUNTIME_BOOTSTRAP = {
    init,
    syncRuntimePanelsFromState,
    initializeApplication,
  };
})();
