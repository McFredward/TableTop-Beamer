// application bootstrap module.
//
// Owns syncRuntimePanelsFromState (runtime panel wire-up via
// the TT_BEAMER_RUNTIME_PANELS namespace) and
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
    const runtimePanelsApi = window.TT_BEAMER_RUNTIME_PANELS ?? null;
    if (!runtimePanelsApi || typeof runtimePanelsApi.syncRuntimePanelsFromState !== "function") {
      ctx.logBootstrap.warn("runtime_panels_missing", {
        event: "runtime-panels-missing",
        hasCanonical: Boolean(window.TT_BEAMER_RUNTIME_PANELS),
      });
      return;
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
      syncDiagnosticOverlayPanel: ctx.syncDiagnosticOverlayPanel,
    });
    ctx.syncDiagnosticOverlayPanel?.();
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

  // W3.6-C7 Phase 2: per-board state initialization (legacy hitarea/
  // geometry stubs, all per-board DEFAULT maps, quick-mode normalize,
  // animation sound map + speed clamp).
  //
  // Phase 50 (2026-05-25, follow-up): the board-id selection logic was
  // EXTRACTED from this function into `_pickInitialBoardId()`, which
  // runs AFTER the global-defaults guard (so the server's selectedBoard
  // hint is available). The previous attempt at re-ordering the whole
  // function broke things — the default-map init (state.playAreasByBoard
  // = createDefaultPlayAreasByBoard()) ran AFTER loadBoardProfiles() and
  // silently overwrote the hydrated per-board data. Operator UAT
  // (2026-05-25): "Alle play-areas sind kaputt in jedem Board!! Ich
  // sehe in jedem boards jeweils nur die default play area und nicht
  // mehr die von mir gezeichneten Play areas". This split keeps Phase 2
  // running in its original slot (before Phase 3), so defaults are set
  // first and then loadBoardProfiles() overlays the real per-board data
  // on top, as it has always done. Only the boardId pick moves later.
  function _initApplicationSetupBoardState() {
    const state = ctx.state;
    // Apply persisted local UI prefs (toggle states, polygon corner
    // size, tap-action mode, mobile zone) over the defaults set in
    // runtime-state.js. Quiet on missing/corrupt payloads.
    try {
      window.TT_BEAMER_LOCAL_UI_PREFS?.loadLocalUiPrefs?.(state);
    } catch { /* defensive — never block boot */ }
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
    // Phase 29 h1: state.specialPolygonsByBoard is gone — room.polygon
    // is now the single source for room polygons.
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

  // Phase 50 (2026-05-25): initial board-id resolution. Runs AFTER the
  // global-defaults guard so it can see the server's live-session
  // `selectedBoard` hint (embedded into __TT_BEAMER_BOOTSTRAP_CONFIG__).
  // Priority:
  //   1. Server hint (window.__TT_BEAMER_BOOTSTRAP_CONFIG__.selectedBoard)
  //   2. localStorage's last-board-id (per-device preference)
  //   3. BOARDS[0] (alphabetic first — sensible default)
  // Mobile cold-start (no localStorage) lands on the right board on
  // first paint without the previous ~1 min "wrong board → switch".
  function _pickInitialBoardId() {
    const state = ctx.state;
    const BOARDS = ctx.getBoards();
    let serverHintBoardId = "";
    try {
      const bp = window.__TT_BEAMER_BOOTSTRAP_CONFIG__;
      if (bp && typeof bp === "object" && typeof bp.selectedBoard === "string") {
        serverHintBoardId = bp.selectedBoard;
      }
    } catch { /* defensive */ }
    let persistedBoardId = "";
    try {
      persistedBoardId = window.localStorage?.getItem("tt-beamer.last-board-id.v1") || "";
    } catch { /* private mode / quota — ignore */ }
    if (!state.boardId || !BOARDS.some((board) => board.id === state.boardId)) {
      if (serverHintBoardId && BOARDS.some((board) => board.id === serverHintBoardId)) {
        state.boardId = serverHintBoardId;
      } else if (persistedBoardId && BOARDS.some((board) => board.id === persistedBoardId)) {
        state.boardId = persistedBoardId;
      } else {
        state.boardId = BOARDS[0]?.id ?? "";
      }
    }
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

    // Phase 30 B3 h1: belt-and-suspenders force-apply of persisted
    // diagnosticOverlay so a /output/ reload with overlay ON shows the
    // chip immediately at boot. The apply-path through
    // applyPersistedRuntimeSettings + syncRuntimePanelsFromState above
    // SHOULD already set this, but in practice on /output/ the chip can
    // stay hidden after reload until the next dashboard toggle. This block
    // reads the bootstrap config payload directly (root + common nested
    // shapes) and force-syncs the panel. No-op when the field is missing.
    try {
      const bootstrapPayload = window.__TT_BEAMER_BOOTSTRAP_CONFIG__ ?? null;
      if (bootstrapPayload && typeof bootstrapPayload === "object") {
        let overlayValue;
        if (Object.prototype.hasOwnProperty.call(bootstrapPayload, "diagnosticOverlay")) {
          overlayValue = Boolean(bootstrapPayload.diagnosticOverlay);
        } else if (
          bootstrapPayload.runtimeFlags
          && typeof bootstrapPayload.runtimeFlags === "object"
          && Object.prototype.hasOwnProperty.call(bootstrapPayload.runtimeFlags, "diagnosticOverlay")
        ) {
          overlayValue = Boolean(bootstrapPayload.runtimeFlags.diagnosticOverlay);
        }
        if (typeof overlayValue === "boolean") {
          ctx.state.diagnosticOverlay = overlayValue;
        }
      }
      if (typeof ctx.syncDiagnosticOverlayPanel === "function") {
        ctx.syncDiagnosticOverlayPanel();
      }
    } catch (error) {
      ctx.logBootstrap?.warn?.("diagnostic_overlay_boot_apply_failed", {
        event: "diagnostic-overlay-boot-apply-failed",
        error: String(error?.message || error || "unknown"),
      });
    }
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

  // Phase 50 (2026-05-24): loading-overlay state + 12s safety timer.
  // Operator UAT: mobile dashboard stuck on "Loading..." forever.
  // Root cause (debugger trace): this safety timer used to live in
  // Phase 7 — the LAST step of initializeApplication() — running AFTER
  // six async phases. If anything in Phases 1-6 hung (e.g. a raw
  // fetch on a flaky mobile network), the safety timer never registered
  // and the loading overlay sat forever. Split into TWO functions:
  //   - _registerLoadingOverlaySafety(): registers state + 12s safety
  //     IMMEDIATELY at the top of initializeApplication.
  //   - _startApplicationDrawLoop(): kicks off requestAnimationFrame,
  //     stays at the end (depends on ctx.draw being wired by Phase 6).
  function _registerLoadingOverlaySafety() {
    const state = ctx.state;
    state._loading = {
      overlay: document.getElementById("loading-overlay"),
      dismissed: false,
      initBoardSrc: ctx.boardImage?.src || "",
      lastSeenSrc: ctx.boardImage?.src || "",
      stableFrames: 0,
    };
    // Defense in depth: ALWAYS dismiss after 12s, regardless of which
    // bootstrap phase is currently running or hung. The draw-loop's
    // tickLoadingOverlay() will dismiss earlier on the happy path
    // (server-snapshot + image-loaded + 3 stable frames).
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
  }

  function _startApplicationDrawLoop() {
    requestAnimationFrame(ctx.draw);
  }

  async function initializeApplication() {
    ctx.logBootstrap.info("init_start", { event: "init-start" });
    // Phase 50 (2026-05-24): register the 12s safety FIRST so any
    // subsequent hang in the async phases still releases the user
    // from the loading screen.
    _registerLoadingOverlaySafety();
    await _initApplicationLoadZonesAndResources();
    // Phase 50 (2026-05-25, revised): restore original ordering of
    // setupBoardState BEFORE startupDefaultsGuard. The intermediate
    // reorder (2026-05-24) had setupBoardState run AFTER the guard so
    // it could see the server's selectedBoard hint — but setupBoardState
    // ALSO initializes per-board default maps (state.playAreasByBoard =
    // createDefaultPlayAreasByBoard(), etc.), and those overwrote the
    // hydrated per-board data that loadBoardProfiles() had just loaded.
    // Operator UAT (2026-05-25): "Alle play-areas sind kaputt in jedem
    // Board".
    // The board-id-selection logic was extracted into
    // `_pickInitialBoardId()` which runs AFTER the guard. Defaults are
    // set first, loadBoardProfiles overlays real data on top, then we
    // pick the initial boardId from the (now-available) server hint.
    _initApplicationSetupBoardState();
    const startupDefaultsSnapshot = await _initApplicationStartupDefaultsGuard();
    _pickInitialBoardId();
    _initApplicationConnectAndSync();
    _initApplicationApplyHydrationStatus(startupDefaultsSnapshot);
    _initApplicationWarmupAndRegress();
    _startApplicationDrawLoop();
  }

  window.TT_BEAMER_RUNTIME_BOOTSTRAP = {
    init,
    syncRuntimePanelsFromState,
    initializeApplication,
  };
})();
