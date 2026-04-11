const {
  BOARDS: CONFIG_BOARDS,
  INLINE_FALLBACK_BOARDS,
  ZONE_CONFIG_SOURCES,
  ROOM_GIF_ANIMATION_ASSETS,
  ROOM_GLOBAL_EQUIVALENT_MAP,
  ROOM_ANIMATIONS,
  INSIDE_SHIP_GLOBAL_ANIMATIONS,
  OUTSIDE_SHIP_GLOBAL_ANIMATIONS,
  GLOBAL_ANIMATIONS,
  ALL_ANIMATION_TYPES,
  SOUND_MAPPING_NONE,
  EVENT_SOUND_ASSETS,
  ALL_SOUND_ASSET_PATHS,
  HITAREA_CALIBRATION_DEFAULT,
  HITAREA_CALIBRATION_STORAGE_KEY,
  BOARD_PROFILE_STORAGE_KEY,
  ROOM_GEOMETRY_STORAGE_KEY,
  SPECIAL_POLYGON_STORAGE_KEY,
  API_BASE_STORAGE_KEY,
  API_BASE_URL_PARAM_KEYS,
  API_PORT_FALLBACKS,
  API_REQUEST_TIMEOUT_MS,
  LOCAL_API_HOSTS,
  ROOM_GEOMETRY_DEFAULT,
  BOARD_ZOOM_DEFAULT,
  SHIP_POLYGON_DEFAULT,
  OUTSIDE_ANIMATION_ASSET_TYPES,
  createDefaultRoomAnimationDefinitions,
  createDefaultInsideAnimationDefinitions,
  createDefaultOutsideAnimationDefinitions,
  OUTSIDE_FX_DEFAULT,
  ROOM_STATE_DEFAULT,
} = window.TT_BEAMER_CONFIG;

let BOARDS = CONFIG_BOARDS.map((board) => window.TT_BEAMER_ROOMS.normalizeBoard(board));

const {
  OUTPUT_ROLE_CONTROL,
  OUTPUT_ROLE_FINAL,
  resolveOutputRoleFromLocation,
  resolveLiveWebSocketUrl,
} = window.TT_BEAMER_RUNTIME_ENV;

const outputRole = resolveOutputRoleFromLocation(window.location);
document.body.dataset.outputRole = outputRole;

const logBootstrap = window.TT_BEAMER_LOGGER.createLogger("bootstrap", { source: outputRole });
const logRender = window.TT_BEAMER_LOGGER.createLogger("render", { source: outputRole });
const logUi = window.TT_BEAMER_LOGGER.createLogger("ui", { source: outputRole });
const logRuntime = window.TT_BEAMER_LOGGER.createLogger("runtime", { source: outputRole });
const polygonContract = window.TT_BEAMER_POLYGON_CONTRACT ?? null;

const stage = document.querySelector("#stage");
const boardImage = document.querySelector("#board-image");
const canvas = document.querySelector("#fx-canvas");
const roomOverlay = document.querySelector("#room-overlay");
const boardSelect = document.querySelector("#board-select");
const boardImportFileInput = document.querySelector("#board-import-file");
const boardImportImageInput = document.querySelector("#board-import-image");
const boardImportNameInput = document.querySelector("#board-import-name");
const boardImportIdInput = document.querySelector("#board-import-id");
const boardImportButton = document.querySelector("#board-import-button");
const boardStatus = document.querySelector("#board-status");
const zonesStatus = document.querySelector("#zones-status");
const alignModeToggleInput = document.querySelector("#align-mode-toggle");
const alignModeStatus = document.querySelector("#align-mode-status");
// Phase 13-1: Save-to-global and Load-and-apply buttons removed from DOM.
// Export-to-file retained; Import-from-file added (wired via
// wireImportGlobalDefaultsButton() below).
const exportGlobalDefaultsButton = document.querySelector("#export-global-defaults");
const globalDefaultsStatus = document.querySelector("#global-defaults-status");
const apiDiagnoseStatus = document.querySelector("#api-diagnose-status");
const triggerFeedback = document.querySelector("#trigger-feedback");
const stopAllButton = document.querySelector("#stop-all");
const roomSelected = document.querySelector("#room-selected");
const roomTargetSelect = document.querySelector("#room-target-select");
const roomAnimationSelect = document.querySelector("#room-animation-select");
const roomAnimationSettingsSelect = document.querySelector("#room-animation-settings-select");
const roomAnimationSettingsNameInput = document.querySelector("#room-animation-settings-name");
const roomAnimationSettingsCreateButton = document.querySelector("#room-animation-settings-create");
const roomAnimationSettingsDeleteButton = document.querySelector("#room-animation-settings-delete");
const roomAssetTypeInput = document.querySelector("#room-asset-type");
const roomAssetRefInput = document.querySelector("#room-asset-ref");
const roomResourceSelect = document.querySelector("#room-resource-select");
const roomApplyChangesButton = document.querySelector("#room-apply-changes");
const roomOpacityInput = document.querySelector("#room-opacity");
const roomOpacityValue = document.querySelector("#room-opacity-value");
const roomIntensityInput = document.querySelector("#room-intensity");
const roomIntensityValue = document.querySelector("#room-intensity-value");
const roomSpeedInput = document.querySelector("#room-speed");
const roomSpeedValue = document.querySelector("#room-speed-value");
const roomSoundVolumeInput = document.querySelector("#room-sound-volume");
const roomSoundVolumeValue = document.querySelector("#room-sound-volume-value");
const roomDurationInput = document.querySelector("#room-duration");
const roomStaggerStartInput = document.querySelector("#room-stagger-start");
const roomStaggerOffsetInput = document.querySelector("#room-stagger-offset");
const roomStaggerOffsetValue = document.querySelector("#room-stagger-offset-value");
const startRoomAnimationButton = document.querySelector("#start-room-animation");
const runningAnimationsList = document.querySelector("#running-animations");
const audioEnabledInput = document.querySelector("#audio-enabled");
const audioVolumeInput = document.querySelector("#audio-volume");
const audioVolumeValue = document.querySelector("#audio-volume-value");
const audioStatus = document.querySelector("#audio-status");
const audioMappingAnimationSelect = document.querySelector("#audio-mapping-animation");
const audioMappingSoundSelect = document.querySelector("#audio-mapping-sound");
const audioMappingStatus = document.querySelector("#audio-mapping-status");
const animationSpeedInput = document.querySelector("#animation-speed");
const animationSpeedValue = document.querySelector("#animation-speed-value");
const animationSpeedStatus = document.querySelector("#animation-speed-status");
const hitareaOffsetXInput = document.querySelector("#hitarea-offset-x");
const hitareaOffsetXValue = document.querySelector("#hitarea-offset-x-value");
const hitareaOffsetYInput = document.querySelector("#hitarea-offset-y");
const hitareaOffsetYValue = document.querySelector("#hitarea-offset-y-value");
const hitareaScaleInput = document.querySelector("#hitarea-scale");
const hitareaScaleValue = document.querySelector("#hitarea-scale-value");
const hitareaSaveButton = document.querySelector("#hitarea-save");
const hitareaResetButton = document.querySelector("#hitarea-reset");
const hitareaStatus = document.querySelector("#hitarea-status");
const roomGeometryModeInput = document.querySelector("#room-geometry-mode");
const roomGeometryXInput = document.querySelector("#room-geometry-x");
const roomGeometryXValue = document.querySelector("#room-geometry-x-value");
const roomGeometryYInput = document.querySelector("#room-geometry-y");
const roomGeometryYValue = document.querySelector("#room-geometry-y-value");
const roomGeometryStretchXInput = document.querySelector("#room-geometry-stretch-x");
const roomGeometryStretchXValue = document.querySelector("#room-geometry-stretch-x-value");
const roomGeometryStretchYInput = document.querySelector("#room-geometry-stretch-y");
const roomGeometryStretchYValue = document.querySelector("#room-geometry-stretch-y-value");
const roomGeometryStatus = document.querySelector("#room-geometry-status");
const openDashboardViewButton = document.querySelector("#open-dashboard-view");
const openSettingsViewButton = document.querySelector("#open-settings-view");
const openTriggerZoneButton = document.querySelector("#open-trigger-zone");
const openManageZoneButton = document.querySelector("#open-manage-zone");
const mobileStartRoomButton = document.querySelector("#mobile-start-room");
const mobileLayoutStatus = document.querySelector("#mobile-layout-status");
const quickModePanel = document.querySelector("#quick-mode-panel");
const quickModeStatus = document.querySelector("#quick-mode-status");
const quickModeOffButton = document.querySelector("#quick-mode-off");
const quickModeActivateButton = document.querySelector("#quick-mode-activate");
const quickModeDeactivateButton = document.querySelector("#quick-mode-deactivate");
const quickModeClearButton = document.querySelector("#quick-mode-clear");
const controlPanel = document.querySelector("#control-panel");
const projectionArea = document.querySelector(".projection-area");
const primaryViewSwitch = document.querySelector(".primary-view-switch");
const dashboardStickyShell = document.querySelector(".dashboard-sticky-shell");
const mobileZoneSwitch = document.querySelector("#mobile-zone-switch");
const runningOverviewPanel = document.querySelector("#running-overview-panel");
const globalAnimationPanel = document.querySelector("#global-animation-panel");
const runMobilePerformanceCheckButton = document.querySelector("#run-mobile-performance-check");
const mobilePerformanceStatus = document.querySelector("#mobile-performance-status");
const mp4PerformanceTierInput = document.querySelector("#mp4-performance-tier");
const mp4RenderCapInput = document.querySelector("#mp4-render-cap");
const mp4RenderCapValue = document.querySelector("#mp4-render-cap-value");
const mp4QualityFloorInput = document.querySelector("#mp4-quality-floor");
const mp4QualityFloorValue = document.querySelector("#mp4-quality-floor-value");
const mp4DegradeThresholdInput = document.querySelector("#mp4-degrade-threshold");
const mp4DegradeThresholdValue = document.querySelector("#mp4-degrade-threshold-value");
const mp4RecoverThresholdInput = document.querySelector("#mp4-recover-threshold");
const mp4RecoverThresholdValue = document.querySelector("#mp4-recover-threshold-value");
const mp4PerformanceStatus = document.querySelector("#mp4-performance-status");
const toastStack = document.querySelector("#toast-stack");
const polygonRoomSelect = document.querySelector("#polygon-room-select");
const showRoomVerticesInput = document.querySelector("#show-room-vertices");
const polygonVertexSelect = document.querySelector("#polygon-vertex-select");
const polygonEdgeSelect = document.querySelector("#polygon-edge-select");
const polygonInsertVertexButton = document.querySelector("#polygon-insert-vertex");
const polygonDeleteVertexButton = document.querySelector("#polygon-delete-vertex");
const polygonResetRoomButton = document.querySelector("#polygon-reset-room");
const polygonFocusRoomButton = document.querySelector("#polygon-focus-room");
const polygonEditorStatus = document.querySelector("#polygon-editor-status");
const roomNameInput = document.querySelector("#room-name-input");
const roomCreateShapeSelect = document.querySelector("#room-create-shape");
const roomCreateButton = document.querySelector("#room-create");
const roomDeleteButton = document.querySelector("#room-delete");
const roomManagementStatus = document.querySelector("#room-management-status");
const clusterSelect = document.querySelector("#cluster-select");
const clusterNameInput = document.querySelector("#cluster-name-input");
const clusterRoomIdsSelect = document.querySelector("#cluster-room-ids");
const clusterCreateButton = document.querySelector("#cluster-create");
const clusterSaveButton = document.querySelector("#cluster-save");
const clusterDeleteButton = document.querySelector("#cluster-delete");
const clusterManagementStatus = document.querySelector("#cluster-management-status");
const roomRenameInput = document.querySelector("#room-rename-input");
const showPlayAreaVerticesInput = document.querySelector("#show-play-area-vertices");
const playAreaSelect = document.querySelector("#play-area-select");
const playAreaNameInput = document.querySelector("#play-area-name");
const playAreaCreateButton = document.querySelector("#play-area-create");
const playAreaDeleteButton = document.querySelector("#play-area-delete");
const shipPolygonVertexSelect = document.querySelector("#ship-polygon-vertex-select");
const shipPolygonEdgeSelect = document.querySelector("#ship-polygon-edge-select");
const shipPolygonInsertVertexButton = document.querySelector("#ship-polygon-insert-vertex");
const shipPolygonDeleteVertexButton = document.querySelector("#ship-polygon-delete-vertex");
const shipPolygonResetButton = document.querySelector("#ship-polygon-reset");
const shipPolygonEditorStatus = document.querySelector("#ship-polygon-editor-status");
const outsideAnimationSelect = document.querySelector("#outside-animation-select");
const outsideAnimationNameInput = document.querySelector("#outside-animation-name");
const outsideAnimationCreateButton = document.querySelector("#outside-animation-create");
const outsideEnabledInput = document.querySelector("#outside-enabled");
const outsideIntensityInput = document.querySelector("#outside-intensity");
const outsideIntensityValue = document.querySelector("#outside-intensity-value");
const outsideSpeedInput = document.querySelector("#outside-speed");
const outsideSpeedValue = document.querySelector("#outside-speed-value");
const outsideModeInput = document.querySelector("#outside-mode");
const outsideDirectionInput = document.querySelector("#outside-direction");
const outsideAssetTypeInput = document.querySelector("#outside-asset-type");
const outsideAssetRefInput = document.querySelector("#outside-asset-ref");
const outsideResourceSelect = document.querySelector("#outside-resource-select");
const outsideApplyChangesButton = document.querySelector("#outside-apply-changes");
const insideAnimationSelect = document.querySelector("#inside-animation-select");
const insideAnimationNameInput = document.querySelector("#inside-animation-name");
const insideAnimationCreateButton = document.querySelector("#inside-animation-create");
const insideIntensityInput = document.querySelector("#inside-intensity");
const insideIntensityValue = document.querySelector("#inside-intensity-value");
const insideSpeedInput = document.querySelector("#inside-speed");
const insideSpeedValue = document.querySelector("#inside-speed-value");
const insideAssetTypeInput = document.querySelector("#inside-asset-type");
const insideAssetRefInput = document.querySelector("#inside-asset-ref");
const insideResourceSelect = document.querySelector("#inside-resource-select");
const insideLoopUntilStopInput = document.querySelector("#inside-loop-until-stop");
const insideApplyChangesButton = document.querySelector("#inside-apply-changes");
const outsideModeField = outsideModeInput?.closest("label") ?? null;
const outsideDirectionField = outsideDirectionInput?.closest("label") ?? null;
const outsideModeFieldMount = createConditionalFieldMountSlot(outsideModeField, "outside-mode");
const outsideDirectionFieldMount = createConditionalFieldMountSlot(outsideDirectionField, "outside-direction");
const outsideAnimationsPanel = outsideApplyChangesButton?.closest("section") ?? null;
const insideGlobalButtons = document.querySelector("#inside-global-buttons");
const dashboardGlobalLoopUntilStopInput = document.querySelector("#dashboard-global-loop-until-stop");
const dashboardGlobalPlaySoundInput = document.querySelector("#dashboard-global-play-sound");
const polygonHandleSizeInput = document.querySelector("#polygon-handle-size");
const polygonHandleSizeValue = document.querySelector("#polygon-handle-size-value");
const boardZoomFitButton = document.querySelector("#board-zoom-fit");
const boardZoomResetButton = document.querySelector("#board-zoom-reset");
const boardZoomStatus = document.querySelector("#board-zoom-status");
const boardPanStatus = document.querySelector("#board-pan-status");
const dashboardViewGroups = Array.from(document.querySelectorAll('[data-view="dashboard"]'));
const settingsViewGroups = Array.from(document.querySelectorAll('[data-view="settings"]'));
const dashboardZoneGroups = Array.from(document.querySelectorAll("[data-dashboard-zone]"));
const settingsSubtabButtons = Array.from(document.querySelectorAll("[data-settings-subtab]"));
const settingsSubtabStatus = document.querySelector("#settings-subtab-status");
const settingsTabbedSections = Array.from(document.querySelectorAll('[data-view="settings"][data-settings-tab]'));
const SETTINGS_SUBTAB_STORAGE_KEY = "tt-beamer.settings-subtab.v1";
const SETTINGS_SUBTAB_LABELS = {
  board: "Board & Geometry",
  animations: "Animations",
  system: "System & Performance",
};

const SETTINGS_EXCLUSIVE_CONTROL_IDS = [
  "board-select",
  "board-import-file",
  "board-import-image",
  "board-import-name",
  "board-import-id",
  "board-import-button",
  // Phase 13-1: save-global-defaults + load-apply-global-defaults removed.
  "export-global-defaults",
  "import-global-defaults",
  "mp4-performance-tier",
  "mp4-render-cap",
  "mp4-quality-floor",
  "mp4-degrade-threshold",
  "mp4-recover-threshold",
  "animation-speed",
  "audio-enabled",
  "audio-volume",
  "audio-mapping-animation",
  "audio-mapping-sound",
  // Phase 13-2: board-zoom-range slider removed in favor of wheel + pinch.
  "polygon-handle-size",
  "board-zoom-fit",
  "board-zoom-reset",
  "hitarea-offset-x",
  "hitarea-offset-y",
  "hitarea-scale",
  "hitarea-save",
  "hitarea-reset",
  "room-geometry-mode",
  "room-geometry-x",
  "room-geometry-y",
  "room-geometry-stretch-x",
  "room-geometry-stretch-y",
  "room-name-input",
  "room-create-shape",
  "room-create",
  "room-delete",
  "cluster-select",
  "cluster-name-input",
  "cluster-room-ids",
  "cluster-create",
  "cluster-save",
  "cluster-delete",
  "room-rename-input",
  "show-room-vertices",
  "polygon-room-select",
  "polygon-vertex-select",
  "polygon-edge-select",
  "polygon-insert-vertex",
  "polygon-delete-vertex",
  "polygon-reset-room",
  "polygon-focus-room",
  "ship-polygon-vertex-select",
  "ship-polygon-edge-select",
  "ship-polygon-insert-vertex",
  "ship-polygon-delete-vertex",
  "ship-polygon-reset",
  "play-area-select",
  "play-area-name",
  "play-area-create",
  "play-area-delete",
  "show-play-area-vertices",
  "outside-animation-select",
  "outside-animation-name",
  "outside-animation-create",
  "outside-enabled",
  "outside-intensity",
  "outside-speed",
  "outside-mode",
  "outside-direction",
  "outside-asset-type",
  "outside-asset-ref",
  "outside-resource-select",
  "outside-apply-changes",
  "inside-animation-select",
  "inside-animation-name",
  "inside-animation-create",
  "inside-intensity",
  "inside-speed",
  "inside-asset-type",
  "inside-asset-ref",
  "inside-resource-select",
  "inside-loop-until-stop",
  "inside-apply-changes",
  "room-animation-settings-select",
  "room-animation-settings-name",
  "room-animation-settings-create",
  "room-animation-settings-delete",
  "room-asset-type",
  "room-asset-ref",
  "room-resource-select",
  "room-apply-changes",
];

function applyOutputRoleViewContract() {
  if (outputRole !== OUTPUT_ROLE_FINAL) {
    return;
  }
  document.body.dataset.finalFxOnly = "true";
  if (controlPanel) {
    controlPanel.hidden = true;
    controlPanel.setAttribute("aria-hidden", "true");
    controlPanel.setAttribute("inert", "");
  }
  if (boardImage) {
    boardImage.setAttribute("aria-hidden", "true");
    boardImage.style.display = "none";
  }
  if (projectionArea) {
    projectionArea.setAttribute("aria-label", "Final Output FX-only");
  }
  triggerFeedback.textContent = "Status: Final-Output aktiv (FX-only, ohne Controller-UI)";
}

function syncAlignModePanel() {
  const enabled = Boolean(state.alignMode);
  if (alignModeToggleInput) {
    alignModeToggleInput.checked = enabled;
  }
  if (alignModeStatus) {
    alignModeStatus.textContent = `Align-Mode: ${enabled ? "ON" : "OFF"}`;
  }
  document.body.classList.toggle("align-mode-active", enabled);
  if (roomOverlay) {
    if (outputRole === OUTPUT_ROLE_CONTROL) {
      roomOverlay.style.display = "";
      roomOverlay.setAttribute("aria-hidden", "false");
      return;
    }
    const hiddenInFinal = outputRole === OUTPUT_ROLE_FINAL && !enabled;
    roomOverlay.style.display = hiddenInFinal ? "none" : "block";
    roomOverlay.setAttribute("aria-hidden", hiddenInFinal ? "true" : "false");
  }
}

function setAlignMode(enabled, { emit = true } = {}) {
  const nextAlignMode = Boolean(enabled);
  if (emit && outputRole === OUTPUT_ROLE_CONTROL) {
    void emitLiveMutation("context-update", {
      reason: "align-toggle",
      alignMode: nextAlignMode,
      runtime: {
        alignMode: nextAlignMode,
      },
    }).then(() => {
      triggerFeedback.textContent = `Pending: align mode ${nextAlignMode ? "ON" : "OFF"} (waiting for snapshot)`;
    }).catch(() => {
      triggerFeedback.textContent = "Status: align-mode command failed";
      syncAlignModePanel();
    });
    return;
  }
  state.alignMode = nextAlignMode;
  syncAlignModePanel();
  renderRoomOverlay();
}

const ctx = canvas.getContext("2d");

const stageViewport = {
  rafId: null,
  pendingReasons: new Set(),
  lastCssWidth: 0,
  lastCssHeight: 0,
  lastPixelWidth: 0,
  lastPixelHeight: 0,
  lastDpr: 0,
  dprMediaQuery: null,
};

function collectStageViewportMetrics() {
  const stageRect = stage?.getBoundingClientRect();
  const fallbackRect = projectionArea?.getBoundingClientRect();
  const rawWidth = stageRect?.width || fallbackRect?.width || window.innerWidth || 1;
  const rawHeight = stageRect?.height || fallbackRect?.height || window.innerHeight || 1;
  const cssWidth = Math.max(1, Math.round(rawWidth));
  const cssHeight = Math.max(1, Math.round(rawHeight));
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
  return {
    cssWidth,
    cssHeight,
    dpr,
    pixelWidth,
    pixelHeight,
  };
}

function getCanonicalViewportRect() {
  const stageRect = stage?.getBoundingClientRect?.();
  if (stageRect && stageRect.width > 0 && stageRect.height > 0) {
    return stageRect;
  }
  const fallbackRect = projectionArea?.getBoundingClientRect?.();
  if (fallbackRect && fallbackRect.width > 0 && fallbackRect.height > 0) {
    return fallbackRect;
  }
  return {
    left: 0,
    top: 0,
    width: Math.max(1, Number(window.innerWidth) || 1),
    height: Math.max(1, Number(window.innerHeight) || 1),
  };
}

function mapClientPointToNormalized(clientX, clientY) {
  const rect = getCanonicalViewportRect();
  const normalizedX = (Number(clientX) - rect.left) / Math.max(1, rect.width);
  const normalizedY = (Number(clientY) - rect.top) / Math.max(1, rect.height);
  return [
    clampRoomAbsoluteCoordinate(normalizedX),
    clampRoomAbsoluteCoordinate(normalizedY),
  ];
}

function mapNormalizedPointToPixels(normalizedX, normalizedY, width, height) {
  return [
    clampRoomAbsoluteCoordinate(normalizedX) * Math.max(1, Number(width) || 1),
    clampRoomAbsoluteCoordinate(normalizedY) * Math.max(1, Number(height) || 1),
  ];
}

function applyStageViewportRecompute(reason = "unknown") {
  const metrics = collectStageViewportMetrics();
  const cssChanged =
    metrics.cssWidth !== stageViewport.lastCssWidth || metrics.cssHeight !== stageViewport.lastCssHeight;
  const dprChanged = metrics.dpr !== stageViewport.lastDpr;
  const pixelChanged =
    metrics.pixelWidth !== stageViewport.lastPixelWidth ||
    metrics.pixelHeight !== stageViewport.lastPixelHeight;
  if (!cssChanged && !dprChanged && !pixelChanged) {
    return false;
  }

  canvas.style.width = `${metrics.cssWidth}px`;
  canvas.style.height = `${metrics.cssHeight}px`;
  canvas.width = metrics.pixelWidth;
  canvas.height = metrics.pixelHeight;

  stageViewport.lastCssWidth = metrics.cssWidth;
  stageViewport.lastCssHeight = metrics.cssHeight;
  stageViewport.lastPixelWidth = metrics.pixelWidth;
  stageViewport.lastPixelHeight = metrics.pixelHeight;
  stageViewport.lastDpr = metrics.dpr;

  const reasonSuffix = reason ? ` (${reason})` : "";
  stage.dataset.viewport = `${metrics.cssWidth}x${metrics.cssHeight}@${metrics.dpr.toFixed(2)}${reasonSuffix}`;
  return true;
}

function runStageViewportLifecycle(reason = "unknown") {
  window.TT_BEAMER_RENDER_VIEWPORT.runStageViewportLifecycle({
    applyStageViewportRecompute,
    getBoardZoom,
    state,
    updateCurrentBoardZoom,
    setPanCursorState,
    syncDashboardZoneVisibility,
    syncMobileStickyOffsets,
    updateMobilePerformanceStatus,
    validateViewExclusivity,
    validateViewNavigationVisibility,
    runMobileProjectionVisibilityGuard,
    runLayoutScrollRegression,
    runNavigationStateRegression,
    triggerFeedback,
    reason,
  });
}

function scheduleStageViewportLifecycle(reason = "unknown") {
  window.TT_BEAMER_RENDER_VIEWPORT.scheduleStageViewportLifecycle({
    stageViewport,
    requestAnimationFrame,
    run: (scheduledReason) => {
      runStageViewportLifecycle(scheduledReason);
    },
    reason,
  });
}

function handleDevicePixelRatioChange() {
  bindDevicePixelRatioWatcher();
  scheduleStageViewportLifecycle("dpr-change");
}

function bindDevicePixelRatioWatcher() {
  window.TT_BEAMER_RENDER_VIEWPORT.bindDevicePixelRatioWatcher({
    stageViewport,
    windowLike: window,
    onDprChange: handleDevicePixelRatioChange,
  });
}

const state = window.TT_BEAMER_STATE.createInitialState({
  defaultBoardId: BOARDS[0].id,
  defaultRoomAnimationId: createDefaultRoomAnimationDefinitions()[0]?.id ?? ROOM_ANIMATIONS[0].id,
  roomOpacity: roomOpacityInput?.value,
  roomIntensity: roomIntensityInput?.value,
  roomSpeed: roomSpeedInput?.value,
  roomSoundVolume: roomSoundVolumeInput?.value,
});

// Phase 13-HF3: opt-in save. Local config edits stay local (dirty) until
// the user clicks the Apply button. `localConfigDirty` is the dirty flag.
// `remoteConfigUpdateAwaiting` is set when a peer pushed a new config
// while we were dirty — the refetch is suppressed until the user either
// applies (our changes win) or discards (peer's changes win).
state.localConfigDirty = false;
state.remoteConfigUpdateAwaiting = false;

// Phase 13-HF13: stable stretch-anchor cache. Keyed as
// `${boardId}::${roomId}` → { x, y }. The anchor is the polygon
// centroid captured on first access and held for the life of the
// session (cleared on rehydration). Using a stable anchor makes
// `getRoomTransform` and `getRoomPoints` independent of the live
// polygon centroid, so vertex edits no longer shift the displayed
// position of non-dragged vertices when stretch != 1.
// See .planning/phases/phase-13/P13-HF13-T2-ROOT-CAUSE-ISOLATION.md.
state.roomStretchAnchorCache = new Map();

const liveSync = window.TT_BEAMER_LIVE_SYNC_STATE.createLiveSyncState();

const LIVE_APPLIED_MUTATION_LIMIT = 4000;
const LIVE_POLL_FAST_MS = 120;
const LIVE_POLL_IDLE_MS = 250;
const LIVE_POLL_MAX_BACKOFF_MS = 2000;
const LIVE_COMMAND_TIMEOUT_MS = 6500;
const LIVE_COMMAND_RETRY_MAX_ATTEMPTS = 3;
const LIVE_COMMAND_RETRY_BASE_DELAY_MS = 180;
const TOAST_MAX_ENTRIES = 4;
const TOAST_DEDUPE_COOLDOWN_MS = 2200;
const TOAST_DEFAULT_TIMEOUT_MS = 5000;
const CLUSTER_STAGGER_OFFSET_MIN_MS = 0;
const CLUSTER_STAGGER_OFFSET_MAX_MS = 4000;
const CLUSTER_STAGGER_OFFSET_DEFAULT_MS = 140;
const STOP_ANIMATION_MUTATION_TYPE = "stop-animation";
const QUICK_MODE_VALUES = new Set(["off", "activate", "deactivate", "clear"]);
const QUICK_MODE_LABELS = {
  off: "SELECT",
  activate: "ACTIVATE",
  deactivate: "DEACTIVATE",
  clear: "CLEAR",
};
const GLOBAL_ONE_SHOT_DURATION_SEC = 4;

const {
  rememberAppliedMutationId,
  recordMutationTrace,
  getLiveTraceSnapshot,
} = window.TT_BEAMER_LIVE_SYNC_STATE.createLiveSyncHelpers({
  liveSync,
  mutationLimit: LIVE_APPLIED_MUTATION_LIMIT,
});

const {
  getAnimationStartedAtEpochMs,
  getGlobalTriggerKey,
  buildAnimationSnapshotForLiveSync,
} = window.TT_BEAMER_LIVE_SYNC_DOMAIN;

const {
  reconcileHydratedRunningAnimations,
} = window.TT_BEAMER_EVENT_LIFECYCLE;

function replayPendingLiveMutations() {
  // polling mode keeps pending entries until a newer snapshot version confirms them.
}

function getGlobalTriggerRevision(animation) {
  const revision = Number(animation?.triggerRevision);
  return Number.isInteger(revision) && revision > 0 ? revision : null;
}

function observeGlobalStopRevisions(runtime) {
  const stopRevisions = runtime?.globalStopRevisions;
  if (!stopRevisions || typeof stopRevisions !== "object") {
    return;
  }
  for (const [triggerKey, rawRevision] of Object.entries(stopRevisions)) {
    if (!triggerKey) {
      continue;
    }
    const revision = Number(rawRevision);
    if (!Number.isInteger(revision) || revision <= 0) {
      continue;
    }
    const previous = Number(liveSync.globalStopRevisionSeenByKey.get(triggerKey) ?? 0);
    if (revision > previous) {
      liveSync.globalStopRevisionSeenByKey.set(triggerKey, revision);
    }
  }
}

function observeGlobalClearRevision(runtime) {
  const revision = Number(runtime?.globalClearRevision);
  if (!Number.isInteger(revision) || revision <= 0) {
    return;
  }
  if (revision <= liveSync.lastObservedGlobalClearRevision) {
    return;
  }
  liveSync.lastObservedGlobalClearRevision = revision;
  liveSync.activeSeenOneShotRunByTriggerRevision.clear();
}

function buildSeenOneShotRunRevisionKey(triggerKey, triggerRevision) {
  if (!triggerKey) {
    return null;
  }
  const normalizedRevision = Number(triggerRevision);
  if (!Number.isInteger(normalizedRevision) || normalizedRevision <= 0) {
    return null;
  }
  return `${triggerKey}#${triggerRevision}`;
}

function rememberSeenOneShotRun(animation, {
  triggerKey,
  triggerRevision,
  nowEpochMs,
  nowPerfMs,
} = {}) {
  if (!isFiniteDurationGlobalAnimation(animation)) {
    return null;
  }
  const revisionKey = buildSeenOneShotRunRevisionKey(triggerKey, triggerRevision);
  if (!revisionKey) {
    return null;
  }
  const stopRevision = Number(liveSync.globalStopRevisionSeenByKey.get(triggerKey) ?? 0);
  if (stopRevision >= triggerRevision) {
    liveSync.activeSeenOneShotRunByTriggerRevision.delete(revisionKey);
    return null;
  }
  const existing = liveSync.activeSeenOneShotRunByTriggerRevision.get(revisionKey) ?? null;
  const durationMs = Math.max(1, Math.trunc(Number(animation.durationMs) || 0));
  if (existing) {
    const merged = {
      ...existing,
      id: String(animation.id || existing.id || ""),
      durationMs: durationMs > 0 ? durationMs : existing.durationMs,
      animationTemplate: {
        ...existing.animationTemplate,
        ...animation,
        triggerKey,
        triggerRevision,
      },
    };
    liveSync.activeSeenOneShotRunByTriggerRevision.set(revisionKey, merged);
    return merged;
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }
  const record = {
    revisionKey,
    triggerKey,
    triggerRevision,
    id: String(animation.id || ""),
    durationMs,
    startedAtEpochMs: nowEpochMs,
    startedAt: nowPerfMs,
    animationTemplate: {
      ...animation,
      triggerKey,
      triggerRevision,
      startedAtEpochMs: nowEpochMs,
      startedAt: nowPerfMs,
      durationMs,
    },
  };
  liveSync.activeSeenOneShotRunByTriggerRevision.set(revisionKey, record);
  return record;
}

function retainActiveSeenOneShotRuns(runningAnimations, { nowEpochMs = Date.now(), nowPerfMs = performance.now() } = {}) {
  const nextAnimations = Array.isArray(runningAnimations) ? [...runningAnimations] : [];
  const seenRevisionKeys = new Set();
  for (const animation of nextAnimations) {
    const triggerKey = getGlobalTriggerKey(animation);
    const triggerRevision = getGlobalTriggerRevision(animation);
    const revisionKey = buildSeenOneShotRunRevisionKey(triggerKey, triggerRevision);
    if (!revisionKey) {
      continue;
    }
    seenRevisionKeys.add(revisionKey);
  }

  for (const [revisionKey, record] of liveSync.activeSeenOneShotRunByTriggerRevision.entries()) {
    const triggerKey = record?.triggerKey ?? null;
    const triggerRevision = Number(record?.triggerRevision);
    const stopRevision = Number(triggerKey ? liveSync.globalStopRevisionSeenByKey.get(triggerKey) : 0);
    const durationMs = Math.max(0, Number(record?.durationMs) || 0);
    const startedAtEpochMs = Number(record?.startedAtEpochMs);
    const finished = !Number.isFinite(startedAtEpochMs)
      || !Number.isFinite(durationMs)
      || durationMs <= 0
      || nowEpochMs - startedAtEpochMs >= durationMs;
    if (
      !triggerKey
      || !Number.isInteger(triggerRevision)
      || triggerRevision <= 0
      || stopRevision >= triggerRevision
      || finished
    ) {
      liveSync.activeSeenOneShotRunByTriggerRevision.delete(revisionKey);
      continue;
    }
    if (seenRevisionKeys.has(revisionKey)) {
      continue;
    }
    const template = record?.animationTemplate;
    if (!template || !String(template.id || "").trim()) {
      continue;
    }
    nextAnimations.push({
      ...template,
      id: record.id,
      hold: false,
      durationMs,
      triggerKey,
      triggerRevision,
      startedAtEpochMs,
      startedAt: Number.isFinite(Number(record?.startedAt)) ? Number(record.startedAt) : nowPerfMs,
    });
  }

  return nextAnimations;
}

function primeGlobalTriggerRuntimeTimestamps(runningAnimations, previousAnimationsById = new Map()) {
  const nextNowEpoch = Date.now();
  const nextNowPerf = performance.now();
  return (Array.isArray(runningAnimations) ? runningAnimations : []).map((animation) => {
    if (!animation || animation.scope !== "global") {
      return animation;
    }
    if (shouldSuppressTerminalOneShotReplay(animation)) {
      return null;
    }
    const triggerKey = getGlobalTriggerKey(animation);
    const triggerRevision = getGlobalTriggerRevision(animation);
    const previous = previousAnimationsById.get(animation.id);
    if (triggerKey && triggerRevision !== null) {
      // Global triggers are revision-driven: a stop with same/higher revision must win over stale starts.
      const stopRevision = Number(liveSync.globalStopRevisionSeenByKey.get(triggerKey) ?? 0);
      if (stopRevision >= triggerRevision) {
        const revisionKey = buildSeenOneShotRunRevisionKey(triggerKey, triggerRevision);
        if (revisionKey) {
          liveSync.activeSeenOneShotRunByTriggerRevision.delete(revisionKey);
        }
        return null;
      }
      const highestSeenRevision = Number(liveSync.globalTriggerRevisionSeenByKey.get(triggerKey) ?? 0);
      const previousRevision = getGlobalTriggerRevision(previous);
      const isSameRevisionAsCurrent = previous && previousRevision === triggerRevision;
      if (triggerRevision > highestSeenRevision) {
        liveSync.globalTriggerRevisionSeenByKey.set(triggerKey, triggerRevision);
        const seenOneShotRun = rememberSeenOneShotRun(animation, {
          triggerKey,
          triggerRevision,
          nowEpochMs: nextNowEpoch,
          nowPerfMs: nextNowPerf,
        });
        if (seenOneShotRun) {
          return {
            ...animation,
            triggerKey,
            triggerRevision,
            startedAtEpochMs: seenOneShotRun.startedAtEpochMs,
            startedAt: seenOneShotRun.startedAt,
            durationMs: seenOneShotRun.durationMs,
          };
        }
        if (!isSameRevisionAsCurrent) {
          const startedAtEpochMs = getAnimationStartedAtEpochMs(animation);
          const ageMs = Math.max(0, nextNowEpoch - startedAtEpochMs);
          return {
            ...animation,
            triggerKey,
            triggerRevision,
            startedAtEpochMs,
            startedAt: nextNowPerf - ageMs,
          };
        }
      }
      if (isSameRevisionAsCurrent) {
        const seenOneShotRun = rememberSeenOneShotRun(animation, {
          triggerKey,
          triggerRevision,
          nowEpochMs: nextNowEpoch,
          nowPerfMs: nextNowPerf,
        });
        if (seenOneShotRun) {
          return {
            ...animation,
            triggerKey,
            triggerRevision,
            startedAtEpochMs: seenOneShotRun.startedAtEpochMs,
            startedAt: seenOneShotRun.startedAt,
            durationMs: seenOneShotRun.durationMs,
          };
        }
        return {
          ...animation,
          triggerKey,
          triggerRevision,
          startedAtEpochMs: getAnimationStartedAtEpochMs(previous),
          startedAt: Number(previous.startedAt) || nextNowPerf,
        };
      }
      return null;
    }
    if (previous) {
      return {
        ...animation,
        startedAtEpochMs: getAnimationStartedAtEpochMs(previous),
        startedAt: Number(previous.startedAt) || nextNowPerf,
      };
    }
    return animation;
  }).filter(Boolean);
}

function buildRuntimeSnapshotForLiveSync() {
  return {
    boardId: state.boardId,
    selectedBoard: state.selectedBoard ?? state.boardId,
    selectedLayout: state.selectedLayout ?? state.boardId,
    selectedRoomId: state.selectedRoomId,
    selectedRoomByBoard: state.selectedRoomByBoard,
    insideFxByBoard: Object.fromEntries(
      BOARDS.map((board) => [board.id, normalizeInsideFxProfile(state.insideFxByBoard[board.id])]),
    ),
    roomFxByBoard: Object.fromEntries(
      BOARDS.map((board) => [board.id, normalizeRoomFxProfile(state.roomFxByBoard?.[board.id])]),
    ),
    outsideFxByBoard: Object.fromEntries(
      BOARDS.map((board) => [board.id, normalizeOutsideFxProfile(state.outsideFxByBoard[board.id])]),
    ),
    runningAnimations: state.runningAnimations.map((animation) => ({
      ...animation,
      startedAtEpochMs: getAnimationStartedAtEpochMs(animation),
    })),
    roomDraft: state.roomDraft,
    animationSpeed: state.animationSpeed,
    audio: state.audio,
    alignMode: state.alignMode,
    mp4Performance: getMp4PerformanceControls(),
  };
}

function getAdaptivePollingIntervalMs() {
  const now = Date.now();
  const documentVisible = document.visibilityState === "visible";
  const fastMode =
    liveSync.pendingMutations.size > 0 ||
    liveSync.dirtyHintUntil > now ||
    liveSync.preferFastPollingUntil > now ||
    documentVisible;
  return fastMode ? LIVE_POLL_FAST_MS : LIVE_POLL_IDLE_MS;
}

function scheduleNextLiveSnapshotPoll(delayOverrideMs = null) {
  if (!liveSync.pollingEnabled) {
    return;
  }
  // Phase 13-HF7: pause polling while a touch gesture is in flight.
  // applyLiveRuntimeSnapshot iterates boards + rehydrates polygon
  // state, ~10–30 ms per call on mobile, which starves the gesture
  // rAF path. Resumed when the gesture ends.
  // Phase 13-HF8: also pause during polygon drag (same rationale).
  if (isHeavyInteractionActive()) {
    if (liveSync.pollTimerId !== null) {
      window.clearTimeout(liveSync.pollTimerId);
      liveSync.pollTimerId = null;
    }
    return;
  }
  if (liveSync.pollTimerId !== null) {
    window.clearTimeout(liveSync.pollTimerId);
    liveSync.pollTimerId = null;
  }
  const adaptive = getAdaptivePollingIntervalMs();
  const backoff = Math.max(0, Number(liveSync.pollBackoffMs) || 0);
  const delayMs = Math.max(0, Number.isFinite(delayOverrideMs) ? Number(delayOverrideMs) : Math.max(adaptive, backoff));
  liveSync.pollTimerId = window.setTimeout(() => {
    liveSync.pollTimerId = null;
    void pollLiveSnapshotOnce();
  }, delayMs);
}

const toastDedupByKey = new Map();

function showToast(message, { kind = "error", timeoutMs = TOAST_DEFAULT_TIMEOUT_MS, dedupeKey = "" } = {}) {
  if (!toastStack || !message || outputRole === OUTPUT_ROLE_FINAL) {
    return;
  }
  const key = String(dedupeKey || message).trim();
  const now = Date.now();
  if (key) {
    const previousAt = Number(toastDedupByKey.get(key) || 0);
    if (now - previousAt < TOAST_DEDUPE_COOLDOWN_MS) {
      return;
    }
    toastDedupByKey.set(key, now);
  }
  const node = document.createElement("div");
  node.className = `toast toast-${kind}`;
  node.textContent = String(message);
  toastStack.prepend(node);
  while (toastStack.childElementCount > TOAST_MAX_ENTRIES) {
    toastStack.lastElementChild?.remove();
  }
  window.setTimeout(() => {
    node.remove();
  }, Math.max(1200, Number(timeoutMs) || TOAST_DEFAULT_TIMEOUT_MS));
}

function reportActionError(statusText, {
  toastText = statusText,
  dedupeKey = "runtime-action-error",
} = {}) {
  if (triggerFeedback) {
    triggerFeedback.textContent = statusText.startsWith("Status:") ? statusText : `Status: ${statusText}`;
  }
  showToast(toastText, { kind: "error", dedupeKey });
}

function collectCanonicalPlayAreaIssuesFromProfiles(boardProfilesById, { sourceLabel = "unknown" } = {}) {
  const issues = [];
  if (!boardProfilesById || typeof boardProfilesById !== "object") {
    return issues;
  }
  for (const [boardId, profile] of Object.entries(boardProfilesById)) {
    const sourcePlayAreas = Array.isArray(profile?.playAreas) ? profile.playAreas : [];
    if (sourcePlayAreas.length === 0) {
      continue;
    }
    const renderable = polygonContract?.extractRenderablePlayAreaPolygons
      ? polygonContract.extractRenderablePlayAreaPolygons(sourcePlayAreas, {
        fallbackPolygon: SHIP_POLYGON_DEFAULT,
        allowDefaultFallbackWhenEmpty: false,
      })
      : [];
    if (!Array.isArray(renderable) || renderable.length === 0) {
      issues.push({
        code: "canonical-play-areas-invalid",
        boardId,
        source: sourceLabel,
        detail: "No renderable canonical play-area polygon found in source payload",
      });
    }
  }
  return issues;
}

function reportCanonicalPolygonIssues(issues, { sourceLabel = "runtime" } = {}) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return;
  }
  const first = issues[0] ?? {};
  const boardId = String(first.boardId || state.boardId || "unknown-board");
  const source = String(first.source || sourceLabel || "unknown-source");
  const detail = String(first.detail || first.code || "canonical load/apply failed");
  const statusText = `Status: Canonical polygon load/apply warning (${boardId} | source=${source}) - ${detail}`;
  if (triggerFeedback) {
    triggerFeedback.textContent = statusText;
  }
  for (const issue of issues) {
    const issueBoard = String(issue?.boardId || boardId);
    const issueSource = String(issue?.source || source);
    const issueDetail = String(issue?.detail || issue?.code || detail);
    showToast(`Canonical polygon issue: ${issueBoard} (${issueSource}) - ${issueDetail}`, {
      kind: "error",
      dedupeKey: `canonical-polygon-issue:${issueBoard}:${issueSource}:${issue?.code || "unknown"}`,
    });
  }
}

function normalizeSnapshotEnvelope(payload) {
  const session = payload?.session;
  const version = Number.isFinite(Number(session?.version)) ? Number(session.version) : null;
  return {
    version,
    snapshot: session?.snapshot ?? null,
    changed: payload?.changed === true,
  };
}

function resolvePendingMutationsByVersion(appliedVersion) {
  for (const [mutationId, entry] of liveSync.pendingMutations.entries()) {
    const acceptedVersion = Number(entry?.acceptedVersion ?? 0);
    if (acceptedVersion > 0 && Number(appliedVersion) >= acceptedVersion) {
      liveSync.pendingMutations.delete(mutationId);
      recordMutationTrace(mutationId, "snapshot_applied");
    }
  }
}

// Phase 14-2: live-sync core (shouldApplySnapshotVersion,
// pollLiveSnapshotOnce, emitLiveMutation, applyLiveRuntimeSnapshot,
// connectLiveSyncSocket — ~510 LOC) moved to
// src/app/runtime/runtime-live-sync-core.js.
window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE.init({
  state,
  liveSync,
  polygonContract,
  triggerFeedback,
  globalDefaultsStatus,
  OUTPUT_ROLE_CONTROL,
  OUTPUT_ROLE_FINAL,
  STOP_ANIMATION_MUTATION_TYPE,
  SHIP_POLYGON_DEFAULT,
  LIVE_POLL_MAX_BACKOFF_MS,
  LIVE_COMMAND_TIMEOUT_MS,
  LIVE_COMMAND_RETRY_MAX_ATTEMPTS,
  LIVE_COMMAND_RETRY_BASE_DELAY_MS,
  getOutputRole: () => outputRole,
  getBoards: () => BOARDS,
  normalizeSnapshotEnvelope: (payload) => normalizeSnapshotEnvelope(payload),
  normalizeLiveMutationPayload: (type, payload) => normalizeLiveMutationPayload(type, payload),
  resolvePendingMutationsByVersion: (version) => resolvePendingMutationsByVersion(version),
  scheduleNextLiveSnapshotPoll: (delay) => scheduleNextLiveSnapshotPoll(delay),
  recordMutationTrace: (mutationId, event) => recordMutationTrace(mutationId, event),
  reportActionError: (text, opts) => reportActionError(text, opts),
  shouldApplyMutationEnvelope: (version, envelope) => shouldApplyMutationEnvelope(version, envelope),
  reportCanonicalPolygonIssues: (issues, opts) => reportCanonicalPolygonIssues(issues, opts),
  normalizeShipPolygon: (polygon) => normalizeShipPolygon(polygon),
  getSelectedPlayArea: (boardId) => getSelectedPlayArea(boardId),
  normalizeOutsideFxProfile: (profile) => normalizeOutsideFxProfile(profile),
  normalizeInsideFxProfile: (profile) => normalizeInsideFxProfile(profile),
  normalizeRoomFxProfile: (profile) => normalizeRoomFxProfile(profile),
  observeGlobalStopRevisions: (runtime) => observeGlobalStopRevisions(runtime),
  observeGlobalClearRevision: (runtime) => observeGlobalClearRevision(runtime),
  filterRunningAnimationsForBoard: (running, boardId) => filterRunningAnimationsForBoard(running, boardId),
  primeGlobalTriggerRuntimeTimestamps: (running, prev) => primeGlobalTriggerRuntimeTimestamps(running, prev),
  reconcileHydratedAnimations: (running) => reconcileHydratedAnimations(running),
  retainActiveSeenOneShotRuns: (running) => retainActiveSeenOneShotRuns(running),
  hydrateRunningAnimationStartTimestamps: (running) => hydrateRunningAnimationStartTimestamps(running),
  reconcileStopPendingFromSnapshot: () => reconcileStopPendingFromSnapshot(),
  clampAnimationSpeed: (value) => clampAnimationSpeed(value),
  clampAudioVolumePercent: (value) => clampAudioVolumePercent(value),
  normalizeMp4PerformanceControls: (raw) => normalizeMp4PerformanceControls(raw),
  syncMp4PerformanceControlsPanel: () => syncMp4PerformanceControlsPanel(),
  hardStopRuntimeEffects: (opts) => hardStopRuntimeEffects(opts),
  isControlCriticalMutationEnvelope: (envelope) => isControlCriticalMutationEnvelope(envelope),
  enforceAudioLifecycleGuard: () => enforceAudioLifecycleGuard(),
  stopSoundsForInactiveAnimations: () => stopSoundsForInactiveAnimations(),
  playSoundForAnimation: (animation) => playSoundForAnimation(animation),
  syncAlignModePanel: () => syncAlignModePanel(),
  syncRuntimePanelsFromState: () => syncRuntimePanelsFromState(),
  renderRunningAnimationsList: () => renderRunningAnimationsList(),
  refreshGlobalButtons: () => refreshGlobalButtons(),
  renderRoomOverlay: () => renderRoomOverlay(),
  rememberAppliedMutationId: (id) => rememberAppliedMutationId(id),
  sendLiveMutationApplyAck: (envelope) => sendLiveMutationApplyAck(envelope),
  resolveLiveWebSocketUrl: () => resolveLiveWebSocketUrl(),
  refreshApplyDiscardButtonsUi: () => refreshApplyDiscardButtonsUi(),
  fetchGlobalDefaultsPayload: () => fetchGlobalDefaultsPayload(),
  applyGlobalDefaultsPayloadToState: (payload) => applyGlobalDefaultsPayloadToState(payload),
});
const {
  shouldApplySnapshotVersion,
  pollLiveSnapshotOnce,
  emitLiveMutation,
  applyLiveRuntimeSnapshot,
  connectLiveSyncSocket,
} = window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE;

const { getBoard, getSelectedRoom } = window.TT_BEAMER_STATE.createStateSelectors({
  getBoards: () => BOARDS,
  getState: () => state,
});

let animationIdCounter = 1;
const ashParticles = [];
let lastListRenderAt = 0;
// Phase 14-2: audio pools + timers moved to runtime-audio.js
// (module-private state). GIF playback cache moved to
// runtime-gif-playback.js. Outside-mp4 caches + loop/fallback
// constants moved to runtime-outside-mp4.js.
const audioAssetCursorByEffect = {};
let outsideResourceAssets = [];
const outsideEditorDraftByBoard = {};
const insideEditorDraftByBoard = {};
const roomEditorDraftByBoard = {};

const {
  createDefaultAnimationSoundMap,
  getAnimationLabel,
  getGlobalAnimationCategory: getGlobalAnimationCategoryFromModule,
  getGlobalCategoryRuntimeLabel: getGlobalCategoryRuntimeLabelFromModule,
  normalizeAnimationSoundPath,
  normalizeAnimationSoundMap,
  isFiniteUnitValue,
  normalizeZoneRoom,
  validateZonePayload,
  classifyZoneFallback,
  clampHitareaOffset,
  clampHitareaScale,
  normalizeHitareaCalibration,
  clampRoomRelativeOffset,
  clampRoomAbsoluteCoordinate,
} = window.TT_BEAMER_NORMALIZERS;

const {
  cloneBoard: cloneRoomBoard,
  createHexagonPolygon,
  normalizePoint: normalizeRoomPoint,
  normalizeRoomName,
  roomToCatalogEntry,
  applyRoomCatalog,
  createRoomId,
} = window.TT_BEAMER_ROOMS;

const { syncRoomSelect } = window.TT_BEAMER_UI_SETTINGS_ROOMS;

const {
  extractBoardProfilesCandidate: extractBoardProfilesCandidateFromPersistence,
  buildMigratedBoardProfiles: buildMigratedBoardProfilesFromPersistence,
} = window.TT_BEAMER_PERSISTENCE;

function getGlobalAnimationCategory(animationType) {
  return getGlobalAnimationCategoryFromModule(animationType, GLOBAL_ANIMATIONS);
}

function getGlobalCategoryRuntimeLabel(animationType) {
  return getGlobalCategoryRuntimeLabelFromModule(animationType, GLOBAL_ANIMATIONS);
}

function getMappedSoundPathForAnimation(animationType) {
  const mapped = normalizeAnimationSoundPath(animationType, state.animationSoundMap[animationType]);
  if (mapped === SOUND_MAPPING_NONE) {
    return null;
  }
  return mapped;
}

function cloneBoardEntry(board) {
  return cloneRoomBoard(board);
}

const lastKnownGoodBoardById = new Map(INLINE_FALLBACK_BOARDS.map((board) => [board.id, cloneBoardEntry(board)]));


// Phase 14-2: zone loader + board import (~295 LOC) moved to
// src/app/runtime/runtime-zone-loader.js. BOARDS is reassigned via
// the setBoards callback since the module cannot mutate the outer
// let directly.
window.TT_BEAMER_RUNTIME_ZONE_LOADER.init({
  state,
  zonesStatus,
  boardSelect,
  ZONE_CONFIG_SOURCES,
  INLINE_FALLBACK_BOARDS,
  getBoards: () => BOARDS,
  setBoards: (next) => { BOARDS = next; },
  fetchWithTimeout: (url, options) => fetchWithTimeout(url, options),
  cloneBoardEntry: (board) => cloneBoardEntry(board),
  validateZonePayload: (payload, boardId, requiredRoomIds) => validateZonePayload(payload, boardId, requiredRoomIds),
  classifyZoneFallback: (status, code) => classifyZoneFallback(status, code),
  switchBoard: (boardId, opts) => switchBoard(boardId, opts),
});
const {
  syncZoneLoaderStatus,
  loadExternalBoardZones,
  importBoardFromFile,
  normalizeImportedBoardFromResponse,
  ensureImportedBoardInCatalog,
  activateImportedBoard,
  importBoardFromImage,
  syncBoardSelectOptions,
} = window.TT_BEAMER_RUNTIME_ZONE_LOADER;

// Phase 13-2: zoom range extended to [0.25, 4.0]. Wheel + pinch gestures
// replace the zoom slider; pan clamping still keeps the board visible at
// extreme zoom-outs.
const BOARD_ZOOM_SCALE_MIN = 0.25;
const BOARD_ZOOM_SCALE_MAX = 4.0;

// Phase 14-2: viewport zoom functions now live in runtime-viewport-zoom.js.
// Init + destructure block is placed later in the file (after touchGestureActive
// and polygon-drag-support are initialized, since the zoom module needs
// getCachedStageGeometry and getTouchGestureActive at call time).

function clampRoomStretch(value) {
  return Math.max(0.6, Math.min(1.6, value));
}

function clampPolygonHandleScale(value) {
  return Math.max(0.1, Math.min(1, Number(value) || 1));
}

function getCurrentPolygonHandleScale() {
  return clampPolygonHandleScale(state.polygonEditor.handleScale);
}

// Phase 13-3: coarse-pointer detection — touch/pen primary devices get
// ~1.8x larger hit targets so fingertips can reliably grab polygon
// vertices and edges. Re-evaluated on each call so `matchMedia` changes
// (dock/undock, external pointer connect) reflect immediately.
function getCoarsePointerHitMultiplier() {
  try {
    if (typeof window.matchMedia === "function") {
      if (window.matchMedia("(pointer: coarse)").matches) return 1.8;
      if (window.matchMedia("(any-pointer: coarse)").matches) return 1.5;
    }
  } catch {
    // fall through to default
  }
  return 1;
}

function getPolygonEditorHandleMetrics(zoomScale, handleScale = 1) {
  const safeZoomScale = Math.max(0.1, Number(zoomScale) || 1);
  const inverseZoom = 1 / safeZoomScale;
  const normalizedHandleScale = clampPolygonHandleScale(handleScale);
  const coarse = getCoarsePointerHitMultiplier();
  return {
    edgeHitRadius: Math.max(8, 12 * inverseZoom) * normalizedHandleScale * coarse,
    edgeHandleRadius: Math.max(4, 5.5 * inverseZoom) * normalizedHandleScale,
    vertexHitRadius: Math.max(10, 16 * inverseZoom) * normalizedHandleScale * coarse,
    vertexHandleRadius: Math.max(5, 7.5 * inverseZoom) * normalizedHandleScale,
    vertexLabelSize: Math.max(9, 11 * inverseZoom) * Math.max(0.9, normalizedHandleScale * 0.95),
  };
}

// Phase 13-3: shared guard for polygon vertex/edge pointerdown handlers.
// Accepts touch pointers (which may report button === -1 on some browsers)
// while still rejecting right-click / middle-click mouse events.
function isAcceptablePolygonPointerEvent(event) {
  if (!event) return false;
  const pointerType = String(event.pointerType || "").toLowerCase();
  if (pointerType === "touch" || pointerType === "pen") return true;
  return event.button === 0;
}

function normalizeRoomGeometryMode(mode) {
  return mode === "absolute" ? "absolute" : "relative";
}

function getRawRoomCenter(room, boardId = state.boardId) {
  const sourcePoints = getRoomSourcePoints(room, boardId);
  if (sourcePoints.length) {
    const center = sourcePoints.reduce(
      (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
      { x: 0, y: 0 },
    );
    return {
      x: center.x / sourcePoints.length,
      y: center.y / sourcePoints.length,
    };
  }
  return {
    x: Number(room?.x) || 0.5,
    y: Number(room?.y) || 0.5,
  };
}

function normalizeRoomGeometry(geometry, room, boardId = state.boardId) {
  const mode = normalizeRoomGeometryMode(geometry?.mode);
  const baseCenter = getRawRoomCenter(room, boardId);
  const offsetX = clampRoomRelativeOffset(Number(geometry?.offsetX) || 0);
  const offsetY = clampRoomRelativeOffset(Number(geometry?.offsetY) || 0);
  const absoluteX = Number.isFinite(Number(geometry?.absoluteX))
    ? clampRoomAbsoluteCoordinate(Number(geometry?.absoluteX))
    : baseCenter.x;
  const absoluteY = Number.isFinite(Number(geometry?.absoluteY))
    ? clampRoomAbsoluteCoordinate(Number(geometry?.absoluteY))
    : baseCenter.y;
  return {
    mode,
    offsetX,
    offsetY,
    absoluteX,
    absoluteY,
    stretchX: clampRoomStretch(Number(geometry?.stretchX) || 1),
    stretchY: clampRoomStretch(Number(geometry?.stretchY) || 1),
  };
}

function createDefaultRoomGeometryMap(boardId) {
  const board = getBoard(boardId);
  return Object.fromEntries(
    board.rooms.map((room) => [room.id, normalizeRoomGeometry(ROOM_GEOMETRY_DEFAULT, room, boardId)]),
  );
}

function createDefaultRoomGeometryByBoard() {
  return Object.fromEntries(
    BOARDS.map((board) => [board.id, createDefaultRoomGeometryMap(board.id)]),
  );
}

function normalizeRoomTombstoneIds(ids, boardId) {
  void boardId;
  return Array.from(
    new Set(
      (Array.isArray(ids) ? ids : [])
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );
}

function createDefaultRoomTombstonesByBoard() {
  return Object.fromEntries(BOARDS.map((board) => [board.id, []]));
}

function markRoomTombstone(boardId, roomId) {
  if (!boardId || !roomId) {
    return;
  }
  const current = state.roomTombstonesByBoard?.[boardId] ?? [];
  const next = normalizeRoomTombstoneIds([...current, roomId], boardId);
  if (!state.roomTombstonesByBoard) {
    state.roomTombstonesByBoard = {};
  }
  state.roomTombstonesByBoard[boardId] = next;
}

function clearRoomTombstone(boardId, roomId) {
  if (!boardId || !roomId) {
    return;
  }
  const current = state.roomTombstonesByBoard?.[boardId] ?? [];
  if (!current.includes(roomId)) {
    return;
  }
  if (!state.roomTombstonesByBoard) {
    state.roomTombstonesByBoard = {};
  }
  state.roomTombstonesByBoard[boardId] = normalizeRoomTombstoneIds(
    current.filter((entry) => entry !== roomId),
    boardId,
  );
}

// Phase 14-2: polygon normalizers moved to
// src/app/runtime/runtime-polygon-normalizers.js
const {
  normalizePolygonPoint,
  getNormalizedPolygonArea,
  isRenderableNormalizedPolygon,
  normalizeSpecialPolygon,
  isValidSpecialPolygon,
} = window.TT_BEAMER_RUNTIME_POLYGON_NORMALIZERS;

function mergeSpecialPolygonMaps(primaryMap, fallbackMap) {
  const merged = { ...(fallbackMap && typeof fallbackMap === "object" ? fallbackMap : {}) };
  if (!primaryMap || typeof primaryMap !== "object") {
    return merged;
  }
  for (const [roomId, polygon] of Object.entries(primaryMap)) {
    if (isValidSpecialPolygon(polygon)) {
      merged[roomId] = polygon;
    }
  }
  return merged;
}

function filterRoomCatalogByDeletedIds(roomCatalog, deletedRoomIds) {
  if (!Array.isArray(roomCatalog)) {
    return null;
  }
  const tombstones = new Set(normalizeRoomTombstoneIds(deletedRoomIds));
  if (tombstones.size === 0) {
    return roomCatalog;
  }
  return roomCatalog.filter((room) => !tombstones.has(String(room?.id || "").trim()));
}

function mergeBoardProfilesForGlobalExport(primaryProfiles, fallbackProfiles) {
  const merged = {};
  const boardIds = new Set([
    ...Object.keys(fallbackProfiles ?? {}),
    ...Object.keys(primaryProfiles ?? {}),
  ]);

  for (const boardId of boardIds) {
    const primary = primaryProfiles?.[boardId] ?? {};
    const fallback = fallbackProfiles?.[boardId] ?? {};
    const mergedPlayAreas = normalizePlayAreasCollection(
      Array.isArray(primary.playAreas) && primary.playAreas.length > 0
        ? primary.playAreas
        : Array.isArray(fallback.playAreas)
          ? fallback.playAreas
          : null,
      primary.playAreaPolygon
      ?? primary.shipPolygon
      ?? fallback.playAreaPolygon
      ?? fallback.shipPolygon
      ?? SHIP_POLYGON_DEFAULT,
    );
    const preferredSelectedPlayAreaId = String(primary.selectedPlayAreaId || fallback.selectedPlayAreaId || "").trim();
    const selectedPlayAreaId = mergedPlayAreas.some((area) => area.id === preferredSelectedPlayAreaId)
      ? preferredSelectedPlayAreaId
      : mergedPlayAreas[0].id;
    const selectedPlayArea = mergedPlayAreas.find((area) => area.id === selectedPlayAreaId) ?? mergedPlayAreas[0];
    const deletedRoomIds = normalizeRoomTombstoneIds([
      ...(Array.isArray(fallback.deletedRoomIds) ? fallback.deletedRoomIds : fallback.roomTombstones ?? []),
      ...(Array.isArray(primary.deletedRoomIds) ? primary.deletedRoomIds : primary.roomTombstones ?? []),
    ]);
    const roomCatalog = filterRoomCatalogByDeletedIds(
      Array.isArray(primary.roomCatalog)
        ? primary.roomCatalog
        : Array.isArray(fallback.roomCatalog)
          ? fallback.roomCatalog
          : null,
      deletedRoomIds,
    );

    merged[boardId] = {
      ...fallback,
      ...primary,
      roomCatalog,
      deletedRoomIds,
      specialPolygons: mergeSpecialPolygonMaps(primary.specialPolygons, fallback.specialPolygons),
      playAreas: mergedPlayAreas,
      selectedPlayAreaId,
      playAreaPolygon: normalizeShipPolygon(selectedPlayArea?.polygon ?? SHIP_POLYGON_DEFAULT),
      roomFx: normalizeRoomFxProfile(primary.roomFx ?? fallback.roomFx),
      insideFx: normalizeInsideFxProfile(primary.insideFx ?? fallback.insideFx),
      outsideFx: normalizeOutsideFxProfile(primary.outsideFx ?? fallback.outsideFx),
    };
  }

  return merged;
}

function resolveProfilePolygonContract(profile = {}, fallbackProfile = {}) {
  const profilePlayAreas = Array.isArray(profile.playAreas) ? profile.playAreas : null;
  const fallbackPlayAreas = Array.isArray(fallbackProfile.playAreas) ? fallbackProfile.playAreas : null;
  const candidatePlayAreas = Array.isArray(profilePlayAreas) && profilePlayAreas.length > 0
    ? profilePlayAreas
    : Array.isArray(fallbackPlayAreas) && fallbackPlayAreas.length > 0
      ? fallbackPlayAreas
      : null;
  const candidateFallbackPolygon =
    profile.playAreaPolygon
    ?? profile.shipPolygon
    ?? profile.shipMask
    ?? profile.insidePolygon
    ?? profile.outsidePolygon
    ?? profile.inside?.polygon
    ?? profile.inside?.playAreaPolygon
    ?? profile.outside?.polygon
    ?? profile.outside?.playAreaPolygon
    ?? fallbackProfile.playAreaPolygon
    ?? fallbackProfile.shipPolygon
    ?? fallbackProfile.shipMask
    ?? fallbackProfile.insidePolygon
    ?? fallbackProfile.outsidePolygon
    ?? fallbackProfile.inside?.polygon
    ?? fallbackProfile.inside?.playAreaPolygon
    ?? fallbackProfile.outside?.polygon
    ?? fallbackProfile.outside?.playAreaPolygon
    ?? SHIP_POLYGON_DEFAULT;
  const playAreas = normalizePlayAreasCollection(candidatePlayAreas, candidateFallbackPolygon);
  const preferredSelectedId = String(profile.selectedPlayAreaId || fallbackProfile.selectedPlayAreaId || "").trim();
  const selectedPlayAreaId = playAreas.some((entry) => entry.id === preferredSelectedId)
    ? preferredSelectedId
    : playAreas[0]?.id ?? "play-area-1";
  const selectedPlayArea = playAreas.find((entry) => entry.id === selectedPlayAreaId) ?? playAreas[0];
  return {
    playAreas,
    selectedPlayAreaId,
    playAreaPolygon: normalizeShipPolygon(selectedPlayArea?.polygon ?? candidateFallbackPolygon ?? SHIP_POLYGON_DEFAULT),
  };
}

function applyPolygonPrecedence(baseProfiles = {}, polygonOwnerProfiles = {}) {
  const merged = {};
  const boardIds = new Set([
    ...Object.keys(baseProfiles ?? {}),
    ...Object.keys(polygonOwnerProfiles ?? {}),
    ...BOARDS.map((board) => board.id),
  ]);

  for (const boardId of boardIds) {
    const baseProfile = baseProfiles?.[boardId] ?? {};
    const polygonOwnerProfile = polygonOwnerProfiles?.[boardId] ?? {};
    const polygonContract = resolveProfilePolygonContract(polygonOwnerProfile, baseProfile);
    merged[boardId] = {
      ...baseProfile,
      ...polygonContract,
    };
  }

  return merged;
}

function createDefaultSpecialPolygonMap(boardId) {
  const board = getBoard(boardId);
  const specials = board.rooms.filter((room) => room.id.startsWith("special-") && getRoomSourcePoints(room, boardId).length >= 3);
  return Object.fromEntries(
    specials.map((room) => [room.id, normalizeSpecialPolygon(getRoomSourcePoints(room, boardId), getRoomSourcePoints(room, boardId))]),
  );
}

function createDefaultSpecialPolygonsByBoard() {
  return Object.fromEntries(
    BOARDS.map((board) => [board.id, createDefaultSpecialPolygonMap(board.id)]),
  );
}

function normalizeShipPolygon(points) {
  return normalizeSpecialPolygon(points, SHIP_POLYGON_DEFAULT);
}

function normalizePlayAreaId(value, fallbackIndex = 0) {
  const raw = String(value || "").trim().toLowerCase();
  const sanitized = raw
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (sanitized) {
    return sanitized;
  }
  return `play-area-${fallbackIndex + 1}`;
}

function normalizePlayAreaEntry(entry, fallbackIndex = 0) {
  const id = normalizePlayAreaId(entry?.id, fallbackIndex);
  const fallbackName = `Play Area ${fallbackIndex + 1}`;
  const name = String(entry?.name || "").trim() || fallbackName;
  const polygon = normalizeShipPolygon(entry?.polygon ?? entry?.points ?? entry);
  return {
    id,
    name,
    polygon,
  };
}

function normalizePlayAreasCollection(playAreas, fallbackPolygon = SHIP_POLYGON_DEFAULT) {
  const source = Array.isArray(playAreas) ? playAreas : [];
  const normalized = [];
  const seenIds = new Set();

  for (let index = 0; index < source.length; index += 1) {
    const area = normalizePlayAreaEntry(source[index], index);
    let uniqueId = area.id;
    let suffix = 2;
    while (seenIds.has(uniqueId)) {
      uniqueId = `${area.id}-${suffix}`;
      suffix += 1;
    }
    seenIds.add(uniqueId);
    normalized.push({
      ...area,
      id: uniqueId,
    });
  }

  if (normalized.length === 0) {
    normalized.push({
      id: "play-area-1",
      name: "Play Area 1",
      polygon: normalizeShipPolygon(fallbackPolygon),
    });
  }

  return normalized;
}

function createDefaultPlayAreasByBoard() {
  return Object.fromEntries(
    BOARDS.map((board) => [
      board.id,
      normalizePlayAreasCollection(null, SHIP_POLYGON_DEFAULT),
    ]),
  );
}

function createDefaultSelectedPlayAreaIdByBoard() {
  return Object.fromEntries(
    BOARDS.map((board) => {
      const defaults = normalizePlayAreasCollection(null, SHIP_POLYGON_DEFAULT);
      return [board.id, defaults[0].id];
    }),
  );
}

function getPlayAreas(boardId = state.boardId) {
  const source = state.playAreasByBoard?.[boardId];
  const normalizeCollection = polygonContract?.normalizePlayAreasCollection ?? normalizePlayAreasCollection;
  const normalized = normalizeCollection(source, SHIP_POLYGON_DEFAULT);
  state.playAreasByBoard[boardId] = normalized;
  return normalized;
}

function getSelectedPlayAreaId(boardId = state.boardId) {
  const areas = getPlayAreas(boardId);
  const preferred = String(state.selectedPlayAreaIdByBoard?.[boardId] || "").trim();
  if (areas.some((area) => area.id === preferred)) {
    return preferred;
  }
  const fallback = areas[0]?.id ?? "play-area-1";
  state.selectedPlayAreaIdByBoard[boardId] = fallback;
  return fallback;
}

function setSelectedPlayAreaId(boardId, playAreaId) {
  const areas = getPlayAreas(boardId);
  const preferred = String(playAreaId || "").trim();
  const next = areas.some((area) => area.id === preferred) ? preferred : areas[0]?.id;
  if (next) {
    state.selectedPlayAreaIdByBoard[boardId] = next;
  }
}

function setPlayAreas(boardId, playAreas, { selectedPlayAreaId = null } = {}) {
  const normalized = normalizePlayAreasCollection(playAreas, SHIP_POLYGON_DEFAULT);
  state.playAreasByBoard[boardId] = normalized;
  const preferred = String(selectedPlayAreaId || state.selectedPlayAreaIdByBoard?.[boardId] || "").trim();
  const selected = normalized.some((area) => area.id === preferred) ? preferred : normalized[0].id;
  state.selectedPlayAreaIdByBoard[boardId] = selected;
  state.shipPolygonsByBoard[boardId] = normalizeShipPolygon(
    normalized.find((area) => area.id === selected)?.polygon ?? normalized[0].polygon,
  );
}

function getSelectedPlayArea(boardId = state.boardId) {
  const areas = getPlayAreas(boardId);
  const selectedId = getSelectedPlayAreaId(boardId);
  return areas.find((area) => area.id === selectedId) ?? areas[0];
}

function getShipPolygonPoints(boardId = state.boardId) {
  return normalizeShipPolygon(getSelectedPlayArea(boardId)?.polygon ?? SHIP_POLYGON_DEFAULT);
}

function setShipPolygonPoints(boardId, points) {
  const areas = getPlayAreas(boardId);
  const selectedId = getSelectedPlayAreaId(boardId);
  const nextPolygon = normalizeShipPolygon(points);
  const updated = areas.map((area) => (area.id === selectedId
    ? { ...area, polygon: nextPolygon }
    : { ...area, polygon: normalizeShipPolygon(area.polygon) }));
  setPlayAreas(boardId, updated, { selectedPlayAreaId: selectedId });
}


function normalizeRoomGeometryMap(roomGeometry, boardId) {
  const defaults = createDefaultRoomGeometryMap(boardId);
  for (const room of getBoard(boardId).rooms) {
    defaults[room.id] = normalizeRoomGeometry(roomGeometry?.[room.id], room, boardId);
  }
  return defaults;
}

function normalizeSpecialPolygonMap(polygonMap, boardId, preservedPolygonMap = null) {
  const defaults = createDefaultSpecialPolygonMap(boardId);
  for (const room of getSpecialRooms(boardId)) {
    const preserved = preservedPolygonMap?.[room.id];
    const fallbackPoints = isValidSpecialPolygon(preserved) ? preserved : room.points ?? [];
    const source = isValidSpecialPolygon(polygonMap?.[room.id])
      ? polygonMap[room.id]
      : fallbackPoints;
    defaults[room.id] = normalizeSpecialPolygon(source, fallbackPoints);
  }
  return defaults;
}

// Phase 14-2: board profile hydration moved to
// src/app/runtime/runtime-board-profiles.js. fx-normalizers and
// perf controls are injected via ctx arrows because their
// destructures sit below this position in orchestration.
window.TT_BEAMER_RUNTIME_BOARD_PROFILES.init({
  state,
  HITAREA_CALIBRATION_DEFAULT,
  SHIP_POLYGON_DEFAULT,
  OUTSIDE_FX_DEFAULT,
  getBoards: () => BOARDS,
  setBoards: (next) => { BOARDS = next; },
  roomToCatalogEntry,
  applyRoomCatalog,
  normalizeHitareaCalibration,
  normalizeAnimationSoundMap,
  extractBoardProfilesCandidateFromPersistence,
  buildMigratedBoardProfilesFromPersistence,
  createDefaultRoomGeometryMap,
  createDefaultRoomStateProfileMap,
  createDefaultSpecialPolygonMap,
  createDefaultRoomAnimationDefinitions,
  createDefaultInsideAnimationDefinitions,
  normalizePlayAreasCollection,
  normalizeShipPolygon,
  normalizeRoomTombstoneIds,
  normalizeRoomGeometryMap,
  normalizeRoomStateProfileMap,
  normalizeSpecialPolygonMap,
  getPlayAreas,
  getSelectedPlayAreaId,
  getSelectedPlayArea,
  clampAnimationSpeed: (v) => clampAnimationSpeed(v),
  normalizeRoomFxProfile: (profile) => normalizeRoomFxProfile(profile),
  normalizeInsideFxProfile: (profile) => normalizeInsideFxProfile(profile),
  normalizeOutsideFxProfile: (profile) => normalizeOutsideFxProfile(profile),
  getMp4PerformanceControls: () => getMp4PerformanceControls(),
  normalizeMp4PerformanceControls: (raw) => normalizeMp4PerformanceControls(raw),
});
const {
  createDefaultBoardProfiles,
  buildBoardProfilesFromState,
  buildPersistedRuntimeSettingsFromState,
  buildBoardProfileStoragePayload,
  applyPersistedRuntimeSettings,
  applyBoardProfilesToState,
  extractBoardProfilesCandidate,
  buildMigratedBoardProfiles,
  loadBoardProfiles,
} = window.TT_BEAMER_RUNTIME_BOARD_PROFILES;

// Phase 14-2: config-sync (persist/apply/discard, dirty flag
// lifecycle, server-unreachable overlay ~180 LOC) moved to
// src/app/runtime/runtime-config-sync.js. Init + destructure so
// existing call sites resolve the same names.
window.TT_BEAMER_RUNTIME_CONFIG_SYNC.init({
  state,
  globalDefaultsStatus,
  saveGlobalDefaultsToServer: () => saveGlobalDefaultsToServer(),
  fetchGlobalDefaultsPayload: () => fetchGlobalDefaultsPayload(),
  applyGlobalDefaultsPayloadToState: (payload) => applyGlobalDefaultsPayloadToState(payload),
  syncRuntimePanelsFromState: () => syncRuntimePanelsFromState(),
  renderRunningAnimationsList: () => renderRunningAnimationsList(),
  refreshGlobalButtons: () => refreshGlobalButtons(),
});
const {
  persistBoardProfiles,
  markLocalConfigDirty,
  clearLocalConfigDirty,
  refreshApplyDiscardButtonsUi,
  applyLocalConfigToServer,
  discardLocalConfigAndReloadFromServer,
  renderServerUnreachableOverlay,
} = window.TT_BEAMER_RUNTIME_CONFIG_SYNC;

// Phase 14-2: global defaults API facade + error/hint formatters +
// load/save/apply glue moved to src/app/runtime/runtime-global-defaults.js.
// board-profiles helpers are injected as direct refs (already
// destructured above). fx/config-sync helpers used only by
// loadAndApplyGlobalDefaults come from ctx arrows so downstream
// destructures can resolve later.
window.TT_BEAMER_RUNTIME_GLOBAL_DEFAULTS.init({
  state,
  globalDefaultsStatus,
  apiDiagnoseStatus,
  triggerFeedback,
  API_REQUEST_TIMEOUT_MS,
  API_BASE_URL_PARAM_KEYS,
  API_PORT_FALLBACKS,
  LOCAL_API_HOSTS,
  buildBoardProfilesFromState,
  buildPersistedRuntimeSettingsFromState,
  extractBoardProfilesCandidate,
  buildMigratedBoardProfiles,
  applyBoardProfilesToState,
  collectCanonicalPlayAreaIssuesFromProfiles: (p, o) => collectCanonicalPlayAreaIssuesFromProfiles(p, o),
  reportCanonicalPolygonIssues: (issues, o) => reportCanonicalPolygonIssues(issues, o),
  clampAnimationSpeed: (v) => clampAnimationSpeed(v),
  normalizeAnimationSoundMap,
  persistBoardProfiles: () => persistBoardProfiles(),
  syncRuntimePanelsFromState: () => syncRuntimePanelsFromState(),
  renderRunningAnimationsList: () => renderRunningAnimationsList(),
  refreshGlobalButtons: () => refreshGlobalButtons(),
});
const {
  buildGlobalDefaultsPayload,
  saveGlobalDefaultsToServer,
  fetchWithTimeout,
  runApiPreflight,
  classifyHttpStatus,
  getApiBaseFromSaveEndpoint,
  resolveGlobalDefaultsApiCandidates,
  readConfiguredApiBase,
  readApiBaseFromQuery,
  normalizeApiBase,
  getUiHostName,
  getUiProtocol,
  isLocalApiHost,
  classifyFailedSaveResponse,
  classifyFailedHealthResponse,
  isStaticOnlyHealthResponse,
  buildGlobalDefaultsSaveError,
  getApiHostName,
  formatGlobalDefaultsSaveError,
  formatResolverSourceLabel,
  buildResolveSnapshot,
  formatResolveSnapshot,
  formatHostFlow,
  getRemoteMismatchHint,
  buildGuidedFixHint,
  getEndpointPort,
  downloadGlobalDefaultsFallback,
  hasStoredBoardProfilesInLocalStorage,
  listGlobalDefaultsLoadCandidates,
  fetchGlobalDefaultsPayload,
  applyGlobalDefaultsPayloadToState,
  autoLoadGlobalDefaultsForFreshDevice,
  loadAndApplyGlobalDefaults,
} = window.TT_BEAMER_RUNTIME_GLOBAL_DEFAULTS;

function createDefaultHitareaCalibrationMap() {
  return Object.fromEntries(
    BOARDS.map((board) => [board.id, { ...HITAREA_CALIBRATION_DEFAULT }]),
  );
}

function getHitareaCalibration(boardId = state.boardId) {
  return (
    state.hitareaCalibrationByBoard[boardId] ?? {
      ...HITAREA_CALIBRATION_DEFAULT,
    }
  );
}

function setHitareaCalibration(boardId, calibration) {
  state.hitareaCalibrationByBoard[boardId] = normalizeHitareaCalibration(calibration);
}

function getRoomGeometry(boardId, roomId) {
  const boardGeometry = state.roomGeometryByBoard[boardId] ?? {};
  const room = getBoard(boardId).rooms.find((entry) => entry.id === roomId);
  return normalizeRoomGeometry(boardGeometry[roomId], room, boardId);
}

function setRoomGeometry(boardId, roomId, geometry) {
  if (!state.roomGeometryByBoard[boardId]) {
    state.roomGeometryByBoard[boardId] = createDefaultRoomGeometryMap(boardId);
  }
  const room = getBoard(boardId).rooms.find((entry) => entry.id === roomId);
  state.roomGeometryByBoard[boardId][roomId] = normalizeRoomGeometry(geometry, room, boardId);
}

function updateRoomGeometry(boardId, roomId, partial) {
  const previous = getRoomGeometry(boardId, roomId);
  setRoomGeometry(boardId, roomId, { ...previous, ...partial });
}

function getSpecialPolygonPoints(boardId, roomId) {
  const boardPolygons = state.specialPolygonsByBoard[boardId] ?? {};
  const room = getBoard(boardId).rooms.find((entry) => entry.id === roomId);
  return normalizeSpecialPolygon(boardPolygons[roomId], room?.polygon ?? room?.points ?? []);
}

function setSpecialPolygonPoints(boardId, roomId, points) {
  if (!state.specialPolygonsByBoard[boardId]) {
    state.specialPolygonsByBoard[boardId] = createDefaultSpecialPolygonMap(boardId);
  }
  const room = getBoard(boardId).rooms.find((entry) => entry.id === roomId);
  const normalized = normalizeSpecialPolygon(points, room?.polygon ?? room?.points ?? []);
  state.specialPolygonsByBoard[boardId][roomId] = normalized;
  if (room) {
    room.polygon = normalized.map((point) => [...point]);
    room.points = normalized.map((point) => [...point]);
  }
}

function getDefaultRoomPolygon(boardId, roomId) {
  const fallbackBoard = INLINE_FALLBACK_BOARDS.find((board) => board.id === boardId);
  const fallbackRoom = fallbackBoard?.rooms?.find((room) => room.id === roomId);
  const normalizedRoom = fallbackRoom ? window.TT_BEAMER_ROOMS.normalizeRoom(fallbackRoom) : null;
  if (normalizedRoom?.polygon?.length >= 3) {
    return normalizedRoom.polygon;
  }
  return null;
}

function getRoomSourcePoints(room, boardId = state.boardId) {
  if (Array.isArray(room?.polygon) && room.polygon.length >= 3) {
    return room.polygon;
  }
  if (Array.isArray(room?.points) && room.points.length >= 3) {
    return room.points;
  }
  return [];
}

function getSpecialRooms(boardId = state.boardId) {
  return getBoard(boardId).rooms;
}

function getActivePolygonRoomId(boardId = state.boardId) {
  const available = getSpecialRooms(boardId);
  const preferred = state.polygonEditor.roomIdByBoard[boardId];
  if (available.some((room) => room.id === preferred)) {
    return preferred;
  }
  return available[0]?.id ?? null;
}

function resolvePolygonEditingRoomId(boardId = state.boardId) {
  const rooms = getSpecialRooms(boardId);
  const selectedRoomId = syncSelectedRoomStateForBoard(boardId);
  if (rooms.some((room) => room.id === selectedRoomId)) {
    setActivePolygonRoomId(boardId, selectedRoomId);
    return selectedRoomId;
  }
  return getActivePolygonRoomId(boardId);
}

function syncSelectedRoomStateForBoard(boardId = state.boardId) {
  const rooms = getSpecialRooms(boardId);
  const remembered = state.selectedRoomByBoard[boardId];
  const current = boardId === state.boardId ? state.selectedRoomId : remembered;
  const nextRoomId = rooms.some((room) => room.id === current)
    ? current
    : rooms.some((room) => room.id === remembered)
      ? remembered
      : null;
  state.selectedRoomByBoard[boardId] = nextRoomId;
  if (boardId === state.boardId) {
    state.selectedRoomId = nextRoomId;
  }
  return nextRoomId;
}

function setActivePolygonRoomId(boardId, roomId) {
  state.polygonEditor.roomIdByBoard[boardId] = roomId;
}

function clampRoomIntensity(value) {
  return Math.max(0.2, Math.min(1.5, value));
}

function clampRoomOpacity(value) {
  return Math.max(0.1, Math.min(1, Number(value) || 1));
}

function clampGifPlaybackSpeed(value) {
  return Math.max(0.25, Math.min(3, Number(value) || 1));
}

function clampRoomDurationSec(value) {
  return Math.max(1, Math.min(180, value));
}

function clampAlienCount(value) {
  return Math.max(0, Math.min(2, Math.round(Number(value) || 0)));
}

function normalizeRoomStateProfile(profile) {
  return {
    broken: Boolean(profile?.broken),
    burning: Boolean(profile?.burning),
    alienCount: clampAlienCount(profile?.alienCount),
    corpse: Boolean(profile?.corpse),
  };
}

function createDefaultRoomStateProfileMap(boardId) {
  const board = getBoard(boardId);
  return Object.fromEntries(
    board.rooms.map((room) => [room.id, normalizeRoomStateProfile(ROOM_STATE_DEFAULT)]),
  );
}

function createDefaultRoomStateProfilesByBoard() {
  return Object.fromEntries(
    BOARDS.map((board) => [board.id, createDefaultRoomStateProfileMap(board.id)]),
  );
}

function normalizeRoomStateProfileMap(profiles, boardId) {
  const defaults = createDefaultRoomStateProfileMap(boardId);
  for (const room of getBoard(boardId).rooms) {
    defaults[room.id] = normalizeRoomStateProfile(profiles?.[room.id]);
  }
  return defaults;
}

function getRoomStateProfile(boardId, roomId) {
  return normalizeRoomStateProfile(state.roomStateProfilesByBoard?.[boardId]?.[roomId]);
}

function setRoomStateProfile(boardId, roomId, profile) {
  if (!state.roomStateProfilesByBoard[boardId]) {
    state.roomStateProfilesByBoard[boardId] = createDefaultRoomStateProfileMap(boardId);
  }
  state.roomStateProfilesByBoard[boardId][roomId] = normalizeRoomStateProfile(profile);
}

function isRoomAnimationType(type) {
  return Boolean(getRoomAnimationDefinitionById(type, state.boardId));
}

function isRoomGlobalEquivalent(type) {
  return Boolean(getRoomEquivalentType(type, state.boardId));
}

function resolveRoomAnimationEffectType(type, boardId = state.boardId) {
  const definition = getRoomAnimationDefinitionById(type, boardId);
  if (definition && normalizeRoomAssetType(definition.assetType) === "coded") {
    return resolveRoomCodedEffectType(definition.assetRef);
  }
  if (type === "scanning") {
    return "special-scanning";
  }
  return ROOM_GLOBAL_EQUIVALENT_MAP[type] ?? type;
}

function getRoomEquivalentType(type, boardId = state.boardId) {
  const definition = getRoomAnimationDefinitionById(type, boardId);
  if (definition && normalizeRoomAssetType(definition.assetType) === "coded") {
    const resolved = resolveRoomCodedEffectType(definition.assetRef);
    if (resolved === "intruder-alert" || resolved === "hull-flicker") {
      return resolved;
    }
    return null;
  }
  return ROOM_GLOBAL_EQUIVALENT_MAP[type] ?? null;
}

function getRoomGifAssetFileName(type, boardId = state.boardId) {
  const definition = getRoomAnimationDefinitionById(type, boardId);
  const path = definition && normalizeRoomAssetType(definition.assetType) === "gif"
    ? definition.assetRef
    : ROOM_GIF_ANIMATION_ASSETS[type];
  return path ? path.split("/").pop() ?? path : null;
}

// Phase 14-2: GIF decoder moved to runtime-gif-decoder.js.
const {
  canDecodeGifFramesWithImageDecoder,
  decodeGifPlaybackFramesWithParser,
} = window.TT_BEAMER_RUNTIME_GIF_DECODER;

// Phase 14-2: GIF playback cache + frame getter live in
// runtime-gif-playback.js. Init + destructure so call sites resolve
// the same names.
window.TT_BEAMER_RUNTIME_GIF_PLAYBACK.init({
  state,
  logRender,
  gifDecoder: window.TT_BEAMER_RUNTIME_GIF_DECODER,
  ROOM_GIF_ANIMATION_ASSETS,
  clampGifPlaybackSpeed: (value) => clampGifPlaybackSpeed(value),
  clampRoomOpacity: (value) => clampRoomOpacity(value),
});
const {
  getGifPlaybackCacheEntry,
  ensureGifPlaybackReady,
  getGifPlaybackFrame,
  resolveRoomGifRenderConfig,
  warmGifAssetPath,
  warmRoomGifAssets,
} = window.TT_BEAMER_RUNTIME_GIF_PLAYBACK;

// Phase 14-2: outside MP4 playback + caches live in
// src/app/runtime/runtime-outside-mp4.js. Init + destructure so the
// existing call sites (draw loop, outside apply, prewarm, …) resolve
// the same names they did before the extraction.
window.TT_BEAMER_RUNTIME_OUTSIDE_MP4.init({
  state,
  canvas,
  canvasCtx: ctx,
  getSelectedOutsideAnimationDefinition: (boardId) => getSelectedOutsideAnimationDefinition(boardId),
  getMp4PerformanceControls: () => getMp4PerformanceControls(),
});
const {
  getOutsideVideoElement,
  getRoomVideoElement,
  prewarmBoardOutsideMp4Asset,
  clearOutsideMp4PlaybackState,
  clearOutsideTimelineState,
  buildOutsideLifecycleKey,
  resolveOutsideElapsedSeconds,
  getOutsideMp4LoopStartTime,
  ensureOutsideMp4FallbackCanvas,
  captureOutsideMp4FallbackFrame,
  drawOutsideMp4FallbackFrame,
  maybeWrapOutsideMp4Loop,
  bindOutsideMp4FrameCallback,
  shouldDrawOutsideMp4Now,
  ensureOutsideMp4Playback,
} = window.TT_BEAMER_RUNTIME_OUTSIDE_MP4;

function clampRoomSpeed(value) {
  return Math.max(0.1, Math.min(2.5, Number(value) || 1));
}

function clampRoomSoundVolume(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function clampClusterStaggerOffsetMs(value) {
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) {
    return CLUSTER_STAGGER_OFFSET_DEFAULT_MS;
  }
  return Math.max(CLUSTER_STAGGER_OFFSET_MIN_MS, Math.min(CLUSTER_STAGGER_OFFSET_MAX_MS, numeric));
}

function syncRoomStaggerOffsetControl() {
  const offsetMs = clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);
  state.roomDraft.staggerOffsetMs = offsetMs;
  if (roomStaggerOffsetInput) {
    roomStaggerOffsetInput.value = String(offsetMs);
    roomStaggerOffsetInput.disabled = state.roomDraft.targetType !== "cluster";
  }
  if (roomStaggerOffsetValue) {
    roomStaggerOffsetValue.textContent = `${offsetMs}ms`;
  }
}

function clampAudioVolumePercent(value) {
  return Math.max(0, Math.min(100, value));
}

function clampAnimationSpeed(value) {
  return Math.max(0.5, Math.min(2.5, Number(value) || 1));
}

function clampOutsideIntensity(value) {
  return Math.max(0.2, Math.min(1.5, Number(value) || OUTSIDE_FX_DEFAULT.intensity));
}

function clampOutsideSpeed(value) {
  return Math.max(0.3, Math.min(2.5, Number(value) || OUTSIDE_FX_DEFAULT.speed));
}

function normalizeOutsideMode(value) {
  return value === "immersive" ? "immersive" : "standard";
}

function normalizeOutsideDirection(value) {
  return value === "reverse" ? "reverse" : "forward";
}

function formatHitareaValue(value) {
  const numeric = Number(value) || 0;
  return numeric.toFixed(3);
}

function syncHitareaStatus() {
  const calibration = getHitareaCalibration();
  hitareaStatus.textContent = `Hitarea: X ${formatHitareaValue(calibration.offsetX)}, Y ${formatHitareaValue(calibration.offsetY)}, Scale ${formatHitareaValue(calibration.scale)}`;
}

function syncHitareaCalibrationPanel() {
  const calibration = getHitareaCalibration();
  hitareaOffsetXInput.value = String(calibration.offsetX);
  hitareaOffsetYInput.value = String(calibration.offsetY);
  hitareaScaleInput.value = String(calibration.scale);
  hitareaOffsetXValue.textContent = formatHitareaValue(calibration.offsetX);
  hitareaOffsetYValue.textContent = formatHitareaValue(calibration.offsetY);
  hitareaScaleValue.textContent = formatHitareaValue(calibration.scale);
  syncHitareaStatus();
}

function formatRoomGeometryValue(value) {
  return (Number(value) || 0).toFixed(3);
}

function syncRoomGeometryStatus() {
  const room = getSelectedRoom();
  if (!room) {
    roomGeometryStatus.textContent = "Room geometry: select a room on the board";
    return;
  }
  const geometry = getRoomGeometry(state.boardId, room.id);
  if (geometry.mode === "absolute") {
    roomGeometryStatus.textContent = `Room geometry (${room.name ?? room.label}): ABS X ${formatRoomGeometryValue(geometry.absoluteX)}, Y ${formatRoomGeometryValue(geometry.absoluteY)} | Stretch ${formatRoomGeometryValue(geometry.stretchX)}:${formatRoomGeometryValue(geometry.stretchY)}`;
    return;
  }
  roomGeometryStatus.textContent = `Room geometry (${room.name ?? room.label}): REL dX ${formatRoomGeometryValue(geometry.offsetX)}, dY ${formatRoomGeometryValue(geometry.offsetY)} | Stretch ${formatRoomGeometryValue(geometry.stretchX)}:${formatRoomGeometryValue(geometry.stretchY)}`;
}

function syncRoomGeometryPanel() {
  const room = getSelectedRoom();
  const disabled = !room;
  roomGeometryModeInput.disabled = disabled;
  roomGeometryXInput.disabled = disabled;
  roomGeometryYInput.disabled = disabled;
  roomGeometryStretchXInput.disabled = disabled;
  roomGeometryStretchYInput.disabled = disabled;
  if (!room) {
    roomGeometryModeInput.value = "relative";
    roomGeometryXInput.value = "0";
    roomGeometryYInput.value = "0";
    roomGeometryXValue.textContent = "0.000";
    roomGeometryYValue.textContent = "0.000";
    roomGeometryStretchXInput.value = "1";
    roomGeometryStretchYInput.value = "1";
    roomGeometryStretchXValue.textContent = "1.000";
    roomGeometryStretchYValue.textContent = "1.000";
    syncRoomGeometryStatus();
    return;
  }
  const geometry = getRoomGeometry(state.boardId, room.id);
  roomGeometryModeInput.value = geometry.mode;
  const usesAbsolute = geometry.mode === "absolute";
  roomGeometryXInput.min = usesAbsolute ? "-0.2" : "-0.25";
  roomGeometryXInput.max = usesAbsolute ? "1.2" : "0.25";
  roomGeometryYInput.min = usesAbsolute ? "-0.2" : "-0.25";
  roomGeometryYInput.max = usesAbsolute ? "1.2" : "0.25";
  const xValue = usesAbsolute ? geometry.absoluteX : geometry.offsetX;
  const yValue = usesAbsolute ? geometry.absoluteY : geometry.offsetY;
  roomGeometryXInput.value = String(xValue);
  roomGeometryYInput.value = String(yValue);
  roomGeometryXValue.textContent = formatRoomGeometryValue(xValue);
  roomGeometryYValue.textContent = formatRoomGeometryValue(yValue);
  roomGeometryStretchXInput.value = String(geometry.stretchX);
  roomGeometryStretchYInput.value = String(geometry.stretchY);
  roomGeometryStretchXValue.textContent = formatRoomGeometryValue(geometry.stretchX);
  roomGeometryStretchYValue.textContent = formatRoomGeometryValue(geometry.stretchY);
  syncRoomGeometryStatus();
}

// Phase 14-2: mobile layout + view visibility + setDashboardZone
// (~250 LOC) moved to src/app/runtime/runtime-mobile-layout.js.
// Init + destructure so existing call sites resolve the same names.
window.TT_BEAMER_RUNTIME_MOBILE_LAYOUT.init({
  state,
  controlPanel,
  primaryViewSwitch,
  dashboardStickyShell,
  projectionArea,
  mobileLayoutStatus,
  dashboardZoneGroups,
  openTriggerZoneButton,
  openManageZoneButton,
  mobileStartRoomButton,
  mobileZoneSwitch,
  runningOverviewPanel,
  openDashboardViewButton,
  openSettingsViewButton,
  triggerFeedback,
  logUi,
  getSelectedRoom: () => getSelectedRoom(),
  resetClearAllGuard: () => resetClearAllGuard(),
});
const {
  isMobileViewport,
  isMobilePortraitViewport,
  getMobileOrientationLabel,
  isElementRendered,
  measureRenderedHeight,
  syncMobileStickyOffsets,
  preserveMobileBoardOverview,
  ensurePrimaryNavigationVisible,
  syncMobileLayoutStatus,
  syncDashboardZoneVisibility,
  validateViewNavigationVisibility,
  runMobileProjectionVisibilityGuard,
  setDashboardZone,
} = window.TT_BEAMER_RUNTIME_MOBILE_LAYOUT;

function shouldSuppressRapidTap(actionKey, thresholdMs = 320) {
  return window.TT_BEAMER_INPUT_GUARDS.shouldSuppressRapidTap({
    state,
    actionKey,
    thresholdMs,
  });
}

// Phase 14-2: runtime performance (mp4 quality loop, mobile
// status, mp4 controls panel ~265 LOC) moved to
// src/app/runtime/runtime-perf.js.
window.TT_BEAMER_RUNTIME_PERF.init({
  state,
  mobilePerformanceStatus,
  mp4PerformanceTierInput,
  mp4RenderCapInput,
  mp4RenderCapValue,
  mp4QualityFloorInput,
  mp4QualityFloorValue,
  mp4DegradeThresholdInput,
  mp4DegradeThresholdValue,
  mp4RecoverThresholdInput,
  mp4RecoverThresholdValue,
  mp4PerformanceStatus,
  triggerFeedback,
  normalizeRoomAssetType: (assetType) => normalizeRoomAssetType(assetType),
  persistRuntimeSoundSettingsChange: (message) => persistRuntimeSoundSettingsChange(message),
});
const {
  percentile,
  getRuntimeQualityScale,
  normalizeMp4PerformanceTier,
  getMp4TierDefaults,
  normalizeMp4PerformanceControls,
  getMp4PerformanceControls,
  computeAnimationCoalesceSeed,
  isRenderCriticalAnimation,
  shouldCoalesceNonCriticalAnimation,
  shouldSkipRoomMp4Frame,
  getRuntimeVisualCaps,
  recordRuntimeFrameCost,
  updateMobilePerformanceStatus,
  syncMp4PerformanceControlsPanel,
  updateMp4PerformanceControls,
} = window.TT_BEAMER_RUNTIME_PERF;

// Phase 14-2: runtime controls (~200 LOC: recordTriggerIntent,
// hardStopRuntimeEffects, executeClearAll, clear-all guard, settings
// subtab state machine, upsertGlobalAnimation) moved to
// src/app/runtime/runtime-runtime-controls.js. Init + destructure
// so existing call sites resolve the same names.
window.TT_BEAMER_RUNTIME_RUNTIME_CONTROLS.init({
  state,
  ashParticles,
  stopAllButton,
  settingsSubtabButtons,
  settingsTabbedSections,
  settingsSubtabStatus,
  triggerFeedback,
  OUTPUT_ROLE_CONTROL,
  SETTINGS_SUBTAB_STORAGE_KEY,
  SETTINGS_SUBTAB_LABELS,
  getOutputRole: () => outputRole,
  getBoards: () => BOARDS,
  stopAnimationSound: (animationId) => stopAnimationSound(animationId),
  clearAllActiveAnimationAudio: () => clearAllActiveAnimationAudio(),
  emitLiveMutation: (type, payload) => emitLiveMutation(type, payload),
  updateOutsideFxProfile: (boardId, partial) => updateOutsideFxProfile(boardId, partial),
  persistBoardProfiles: () => persistBoardProfiles(),
  clearRoomDraftEditTarget: () => clearRoomDraftEditTarget(),
  syncOutsideFxPanel: () => syncOutsideFxPanel(),
  renderRunningAnimationsList: () => renderRunningAnimationsList(),
  refreshGlobalButtons: () => refreshGlobalButtons(),
  getGlobalAnimationCategory: (type) => getGlobalAnimationCategory(type),
  stopAnimation: (animationId) => stopAnimation(animationId),
  createAnimation: (opts) => createAnimation(opts),
  buildAnimationSnapshotForLiveSync: (animation) => buildAnimationSnapshotForLiveSync(animation),
  getAnimationLabel: (type) => getAnimationLabel(type),
  emitStopAnimationCommand: (animationId, opts) => emitStopAnimationCommand(animationId, opts),
});
const {
  recordTriggerIntent,
  hardStopRuntimeEffects,
  executeClearAll,
  resetClearAllGuard,
  armClearAllGuard,
  normalizeSettingsSubtab,
  persistSettingsSubtab,
  syncSettingsSubtabVisibility,
  setSettingsSubtab,
  restoreSettingsSubtabPreference,
  upsertGlobalAnimation,
} = window.TT_BEAMER_RUNTIME_RUNTIME_CONTROLS;

// Phase 14-2: quick-mode state machine lives in
// src/app/runtime/runtime-quick-mode.js. Init + destructure so call
// sites resolve the same names they did before the extraction.
window.TT_BEAMER_RUNTIME_QUICK_MODE.init({
  state,
  QUICK_MODE_VALUES,
  QUICK_MODE_LABELS,
  quickModeOffButton,
  quickModeActivateButton,
  quickModeDeactivateButton,
  quickModeClearButton,
  quickModeStatus,
  quickModePanel,
  triggerFeedback,
  showToast: (message, options) => showToast(message, options),
  startRoomAnimationFromDraft: () => startRoomAnimationFromDraft(),
  syncRoomTargetSelect: () => syncRoomTargetSelect(),
  stopAnimation: (animationId) => stopAnimation(animationId),
  getBoard: (boardId) => getBoard(boardId),
  getRoomAnimationLabelById: (type, boardId) => getRoomAnimationLabelById(type, boardId),
  preserveMobileBoardOverview: (reason) => preserveMobileBoardOverview(reason),
});
const {
  normalizeQuickMode,
  getQuickModeInflightMap,
  getQuickModeInflightCount,
  markQuickModeRoomInflight,
  clearQuickModeRoomInflight,
  clearAllQuickModeInflight,
  syncQuickModePanel,
  setQuickMode,
  isQuickModeActive,
  getQuickModeRoomLabel,
  activateRoomAnimationByQuickTap,
  collectQuickTapRoomAnimationIds,
  deactivateRoomAnimationByQuickTap,
  clearRoomAnimationsByQuickTap,
  reportQuickModeTapOutcome,
  handleQuickModeRoomTap,
} = window.TT_BEAMER_RUNTIME_QUICK_MODE;

function setViewGroupVisibility(groups, visible) {
  for (const entry of groups) {
    const shouldHide = !visible;
    entry.classList.toggle("view-hidden", shouldHide);
    entry.toggleAttribute("hidden", shouldHide);
    entry.setAttribute("aria-hidden", shouldHide ? "true" : "false");
    if ("inert" in entry) {
      entry.inert = shouldHide;
    }
  }
}

function isViewGroupVisible(entry) {
  return !entry.hidden && !entry.classList.contains("view-hidden") && entry.getAttribute("aria-hidden") !== "true";
}

function validateSettingsControlOwnership({ silent = false, context = "runtime" } = {}) {
  const outsideDefinition = getSelectedOutsideAnimationDefinition(state.boardId);
  const outsideModeDirectionApplicable = isOutsideModeDirectionApplicable(outsideDefinition);
  const leaks = [];
  for (const id of SETTINGS_EXCLUSIVE_CONTROL_IDS) {
    const element = document.getElementById(id);
    if (!element) {
      if ((id === "outside-mode" || id === "outside-direction") && !outsideModeDirectionApplicable) {
        continue;
      }
      leaks.push(`missing control: #${id}`);
      continue;
    }
    const viewOwner = element.closest("[data-view]");
    const ownerView = viewOwner?.dataset?.view;
    if (ownerView !== "settings") {
      leaks.push(`settings-control leak: #${id} mounted in ${ownerView ?? "unknown"}`);
      break;
    }
  }

  if (leaks.length > 0) {
    if (!silent) {
      logUi.error("settings_ownership_violation", {
        event: "settings-ownership-violation",
        context,
        leaks,
      });
      triggerFeedback.textContent =
        "Status: Configuration leak detected (settings control found outside Settings view)";
    }
    return false;
  }
  return true;
}

function validateViewExclusivity(expectedView, { silent = false, context = "runtime" } = {}) {
  const leaks = [];
  const expectSettings = expectedView === "settings";
  const rootView = controlPanel?.dataset.activeView;

  if (rootView !== expectedView) {
    leaks.push(`root-view mismatch: expected ${expectedView}, got ${rootView ?? "missing"}`);
  }

  if (expectSettings && settingsViewGroups.every((entry) => !isViewGroupVisible(entry))) {
    leaks.push("settings groups unexpectedly hidden");
  }
  if (!expectSettings && dashboardViewGroups.every((entry) => !isViewGroupVisible(entry))) {
    leaks.push("dashboard groups unexpectedly hidden");
  }

  for (const entry of settingsViewGroups) {
    if (isViewGroupVisible(entry) !== expectSettings) {
      leaks.push(`settings leak: ${entry.tagName.toLowerCase()}`);
      break;
    }
  }
  for (const entry of dashboardViewGroups) {
    if (isViewGroupVisible(entry) === expectSettings) {
      leaks.push(`dashboard leak: ${entry.tagName.toLowerCase()}`);
      break;
    }
  }

  if (leaks.length > 0) {
    if (!silent) {
      logUi.error("view_exclusivity_violation", {
        event: "view-exclusivity-violation",
        context,
        leaks,
      });
      triggerFeedback.textContent = "Status: Tab exclusivity violated (visible leftover block detected)";
    }
    return false;
  }
  return validateSettingsControlOwnership({ silent, context });
}

function setActiveView(view, { skipGuard = false } = {}) {
  const nextView = view === "settings" ? "settings" : "dashboard";
  // Phase 13-HF4: block the Dashboard switch while local config edits are
  // unsaved. User must Apply or Discard first. Settings → Dashboard is
  // the only direction blocked (Dashboard → Settings is always allowed,
  // since edits only live in Settings).
  if (
    !skipGuard
    && nextView === "dashboard"
    && state.uiView === "settings"
    && state.localConfigDirty
  ) {
    const accepted = window.confirm(
      "Du hast ungespeicherte lokale Aenderungen.\n\n"
      + "OK  = Apply (auf Server pushen und dann zum Dashboard wechseln)\n"
      + "Abbrechen = im Settings bleiben (Discard-Button benutzen um zu verwerfen)",
    );
    if (!accepted) {
      return;
    }
    void applyLocalConfigToServer().then((result) => {
      if (result.ok) {
        setActiveView("dashboard", { skipGuard: true });
      }
    });
    return;
  }
  if (nextView !== "settings") {
    state.panMode.spacePressed = false;
    endPanMode(null, { canceled: true });
  }
  state.uiView = nextView;
  ensurePrimaryNavigationVisible();
  if (controlPanel) {
    controlPanel.dataset.activeView = nextView;
  }
  const showSettings = nextView === "settings";
  setViewGroupVisibility(settingsViewGroups, showSettings);
  setViewGroupVisibility(dashboardViewGroups, !showSettings);
  openDashboardViewButton.classList.toggle("active", !showSettings);
  openSettingsViewButton.classList.toggle("active", showSettings);
  openDashboardViewButton.setAttribute("aria-pressed", showSettings ? "false" : "true");
  openSettingsViewButton.setAttribute("aria-pressed", showSettings ? "true" : "false");
  syncSettingsSubtabVisibility();
  if (showSettings) {
    resetClearAllGuard();
    syncPolygonEditorPanel();
    syncShipPolygonEditorPanel();
  }
  syncDashboardZoneVisibility();
  syncMobileStickyOffsets();
  syncStageZoomTransform();
  setPanCursorState();
  renderRoomOverlay();
  if (!skipGuard) {
    validateViewExclusivity(nextView, { context: "set-active-view" });
    validateViewNavigationVisibility({ context: "set-active-view" });
    runMobileProjectionVisibilityGuard({ context: "set-active-view" });
  }
}

// Phase 14-2: 9 run*Regression runtime self-tests moved to
// src/app/runtime/runtime-regression-tests.js. Init + destructure so
// existing call sites resolve the same names.
window.TT_BEAMER_RUNTIME_REGRESSION_TESTS.init({
  state,
  canvasCtx: ctx,
  controlPanel,
  projectionArea,
  dashboardStickyShell,
  primaryViewSwitch,
  runningOverviewPanel,
  globalAnimationPanel,
  runningAnimationsList,
  mobileZoneSwitch,
  mobileStartRoomButton,
  boardZoomResetButton,
  isMobileViewport: () => isMobileViewport(),
  isElementRendered: (element) => isElementRendered(element),
  syncMobileStickyOffsets: () => syncMobileStickyOffsets(),
  syncMobileLayoutStatus: () => syncMobileLayoutStatus(),
  syncDashboardZoneVisibility: () => syncDashboardZoneVisibility(),
  setActiveView: (view, opts) => setActiveView(view, opts),
  setDashboardZone: (zone) => setDashboardZone(zone),
  validateViewExclusivity: (view, opts) => validateViewExclusivity(view, opts),
  validateViewNavigationVisibility: (opts) => validateViewNavigationVisibility(opts),
  validateSettingsControlOwnership: (opts) => validateSettingsControlOwnership(opts),
  runMobileProjectionVisibilityGuard: (opts) => runMobileProjectionVisibilityGuard(opts),
  computePanForZoomFocus: (scale, focus) => computePanForZoomFocus(scale, focus),
  getRoomCenterForZoom: (boardId, roomId) => getRoomCenterForZoom(boardId, roomId),
  getBoardZoom: (boardId) => getBoardZoom(boardId),
  updateCurrentBoardZoom: (partial, statusText) => updateCurrentBoardZoom(partial, statusText),
  getStagePanBounds: (scale) => getStagePanBounds(scale),
  canStartPanModeFromEvent: (event) => canStartPanModeFromEvent(event),
  fitZoomToActiveSpecialRoom: () => fitZoomToActiveSpecialRoom(),
  setPanCursorState: () => setPanCursorState(),
  startPanMode: (event, trigger) => startPanMode(event, trigger),
  endPanMode: (event, opts) => endPanMode(event, opts),
  getOutsideFxProfile: (boardId) => getOutsideFxProfile(boardId),
  setOutsideFxProfile: (boardId, profile) => setOutsideFxProfile(boardId, profile),
  updateOutsideFxProfile: (boardId, partial) => updateOutsideFxProfile(boardId, partial),
  syncOutsideRuntimeMirror: (boardId) => syncOutsideRuntimeMirror(boardId),
  syncOutsideFxPanel: () => syncOutsideFxPanel(),
  refreshGlobalButtons: () => refreshGlobalButtons(),
  getPlayAreas: (boardId) => getPlayAreas(boardId),
  setPlayAreas: (boardId, areas, opts) => setPlayAreas(boardId, areas, opts),
  getSelectedPlayAreaId: (boardId) => getSelectedPlayAreaId(boardId),
  clipToInsideShip: (boardId) => clipToInsideShip(boardId),
  clipToOutsideShip: (boardId) => clipToOutsideShip(boardId),
  logUi,
  logRuntime,
  logRender,
});
const {
  runViewVisibilityRegression,
  runLayoutScrollRegression,
  runStartupDefaultsGuardRegression,
  runZoomPanEditRegression,
  runPanPointerCaptureRegression,
  runOrientationStateRegression,
  runNavigationStateRegression,
  runOutsideIsolationRegression,
  runShipClipRegression,
} = window.TT_BEAMER_RUNTIME_REGRESSION_TESTS;

// Phase 14-2: polygon editor panel syncs moved to
// src/app/runtime/runtime-polygon-editor-panels.js.
window.TT_BEAMER_RUNTIME_POLYGON_EDITOR_PANELS.init({
  state,
  polygonEditorStatus,
  polygonVertexSelect,
  polygonEdgeSelect,
  polygonDeleteVertexButton,
  polygonRoomSelect,
  polygonInsertVertexButton,
  polygonResetRoomButton,
  polygonFocusRoomButton,
  roomRenameInput,
  showRoomVerticesInput,
  shipPolygonEditorStatus,
  shipPolygonVertexSelect,
  shipPolygonEdgeSelect,
  shipPolygonDeleteVertexButton,
  shipPolygonInsertVertexButton,
  playAreaSelect,
  playAreaNameInput,
  playAreaDeleteButton,
  playAreaCreateButton,
  showPlayAreaVerticesInput,
  getBoard: (boardId) => getBoard(boardId),
  getSpecialPolygonPoints: (boardId, roomId) => getSpecialPolygonPoints(boardId, roomId),
  getSpecialRooms: (boardId) => getSpecialRooms(boardId),
  getActivePolygonRoomId: (boardId) => getActivePolygonRoomId(boardId),
  setActivePolygonRoomId: (boardId, roomId) => setActivePolygonRoomId(boardId, roomId),
  getShipPolygonPoints: (boardId) => getShipPolygonPoints(boardId),
  getPlayAreas: (boardId) => getPlayAreas(boardId),
  getSelectedPlayArea: (boardId) => getSelectedPlayArea(boardId),
  getSelectedPlayAreaId: (boardId) => getSelectedPlayAreaId(boardId),
  getCurrentPolygonHandleScale: () => getCurrentPolygonHandleScale(),
  syncSelectedRoomStateForBoard: (boardId) => syncSelectedRoomStateForBoard(boardId),
  syncRoomSelect: (select, rooms, activeRoomId) => syncRoomSelect(select, rooms, activeRoomId),
});
const {
  areRoomVerticesEditable,
  arePlayAreaVerticesEditable,
  syncPolygonEditorStatus,
  syncPolygonVertexSelect,
  syncPolygonEdgeSelect,
  syncPolygonEditorPanel,
  syncShipPolygonEditorStatus,
  syncShipPolygonVertexSelect,
  syncShipPolygonEdgeSelect,
  syncShipPolygonEditorPanel,
} = window.TT_BEAMER_RUNTIME_POLYGON_EDITOR_PANELS;

// Phase 14-2: asset-ref normalizers moved to
// src/app/runtime/runtime-asset-refs.js.
window.TT_BEAMER_RUNTIME_ASSET_REFS.init({
  OUTSIDE_SHIP_GLOBAL_ANIMATIONS,
  normalizeOutsideAnimationId: (id, fallback) => normalizeOutsideAnimationId(id, fallback),
  normalizeInsideAnimationId: (id, fallback) => normalizeInsideAnimationId(id, fallback),
  createDefaultInsideAnimationDefinitions: () => createDefaultInsideAnimationDefinitions(),
  createDefaultRoomAnimationDefinitions: () => createDefaultRoomAnimationDefinitions(),
  normalizeRoomAssetType: (v) => normalizeRoomAssetType(v),
  normalizeInsideAssetType: (v) => normalizeInsideAssetType(v),
  normalizeOutsideAssetType: (v) => normalizeOutsideAssetType(v),
  getOutsideResourceAssets: () => outsideResourceAssets,
});
const {
  getOutsideCodedAssetKeys,
  getInsideCodedAssetKeys,
  getRoomCodedAssetKeys,
  normalizeRoomCodedAssetRef,
  getRoomAssetCandidates,
  normalizeRoomAssetRefForType,
  resolveRoomCodedEffectType,
  normalizeInsideCodedAssetRef,
  getInsideAssetCandidates,
  normalizeInsideAssetRefForType,
  resolveInsideCodedEffectType,
  normalizeOutsideCodedAssetRef,
  getOutsideAssetCandidates,
  normalizeOutsideAssetRefForType,
  resolveOutsideCodedEffectType,
  isOutsideModeDirectionApplicable,
} = window.TT_BEAMER_RUNTIME_ASSET_REFS;


// Phase 14-2: inside/outside/room FX profile normalizers moved to
// src/app/runtime/runtime-fx-normalizers.js. The asset-ref normalizers
// are injected via ctx arrows because the asset-refs destructure above
// supplies them as top-level consts.
window.TT_BEAMER_RUNTIME_FX_NORMALIZERS.init({
  state,
  OUTSIDE_ANIMATION_ASSET_TYPES,
  OUTSIDE_FX_DEFAULT,
  getBoards: () => BOARDS,
  createDefaultInsideAnimationDefinitions: () => createDefaultInsideAnimationDefinitions(),
  createDefaultOutsideAnimationDefinitions: () => createDefaultOutsideAnimationDefinitions(),
  createDefaultRoomAnimationDefinitions: () => createDefaultRoomAnimationDefinitions(),
  normalizeInsideAssetRefForType: (type, ref, fallback) => normalizeInsideAssetRefForType(type, ref, fallback),
  normalizeOutsideAssetRefForType: (type, ref, fallback) => normalizeOutsideAssetRefForType(type, ref, fallback),
  normalizeRoomAssetRefForType: (type, ref, fallback) => normalizeRoomAssetRefForType(type, ref, fallback),
  clampOutsideIntensity: (v) => clampOutsideIntensity(v),
  clampOutsideSpeed: (v) => clampOutsideSpeed(v),
  normalizeOutsideMode: (v) => normalizeOutsideMode(v),
  normalizeOutsideDirection: (v) => normalizeOutsideDirection(v),
});
const {
  normalizeInsideAssetType,
  normalizeInsideAnimationId,
  normalizeInsideAnimationDefinition,
  normalizeInsideAnimationDefinitions,
  normalizeInsideFxProfile,
  createDefaultInsideFxByBoard,
  getInsideFxProfile,
  setInsideFxProfile,
  getSelectedInsideAnimationDefinition,
  createInsideAnimationDefinition,
  normalizeOutsideAssetType,
  normalizeOutsideAnimationId,
  normalizeOutsideAnimationDefinition,
  normalizeOutsideAnimationDefinitions,
  normalizeOutsideFxProfile,
  createDefaultOutsideFxByBoard,
  getOutsideFxProfile,
  setOutsideFxProfile,
  updateOutsideFxProfile,
  getSelectedOutsideAnimationDefinition,
  resolveOutsideTimeline,
  createOutsideAnimationDefinition,
  normalizeRoomAssetType,
  normalizeRoomAnimationId,
  normalizeRoomAnimationDefinition,
  normalizeRoomAnimationDefinitions,
  normalizeRoomFxProfile,
  createDefaultRoomFxByBoard,
  getRoomFxProfile,
  setRoomFxProfile,
  getSelectedRoomAnimationDefinition,
  getRoomAnimationDefinitionById,
  createRoomAnimationDefinition,
} = window.TT_BEAMER_RUNTIME_FX_NORMALIZERS;

function createConditionalFieldMountSlot(field, anchorName) {
  if (!field || !field.parentElement) {
    return null;
  }
  const parent = field.parentElement;
  const anchor = document.createComment(`${anchorName}-mount-anchor`);
  parent.insertBefore(anchor, field.nextSibling);
  return {
    field,
    parent,
    anchor,
  };
}

function setConditionalFieldMounted(slot, mounted) {
  if (!slot?.field || !slot.parent || !slot.anchor) {
    return;
  }
  if (mounted) {
    if (!slot.field.isConnected) {
      slot.parent.insertBefore(slot.field, slot.anchor);
    }
    return;
  }
  if (slot.field.isConnected) {
    slot.field.remove();
  }
}

// Phase 14-2: FX panel syncs (~560 LOC) moved to
// src/app/runtime/runtime-fx-panels.js. Init + destructure so
// existing call sites resolve the same names. Editor draft storage
// and outsideResourceAssets remain in orchestration scope (passed
// by reference) — mutations to the objects propagate naturally.
window.TT_BEAMER_RUNTIME_FX_PANELS.init({
  state,
  ROOM_ANIMATIONS,
  insideEditorDraftByBoard,
  roomEditorDraftByBoard,
  outsideEditorDraftByBoard,
  setOutsideResourceAssets: (files) => { outsideResourceAssets = files; },
  insideResourceSelect,
  insideAssetTypeInput,
  insideAssetRefInput,
  insideAnimationSelect,
  insideIntensityInput,
  insideSpeedInput,
  insideIntensityValue,
  insideSpeedValue,
  insideLoopUntilStopInput,
  insideGlobalButtons,
  roomResourceSelect,
  roomAssetTypeInput,
  roomAssetRefInput,
  roomAnimationSelect,
  roomAnimationSettingsSelect,
  roomAnimationSettingsDeleteButton,
  outsideResourceSelect,
  outsideAssetTypeInput,
  outsideAssetRefInput,
  outsideAnimationSelect,
  outsideEnabledInput,
  outsideIntensityInput,
  outsideSpeedInput,
  outsideIntensityValue,
  outsideSpeedValue,
  outsideModeFieldMount,
  outsideDirectionFieldMount,
  outsideAnimationsPanel,
  outsideModeField,
  outsideDirectionField,
  outsideModeInput,
  outsideDirectionInput,
  isOutsideModeDirectionApplicable: (definition) => isOutsideModeDirectionApplicable(definition),
  setConditionalFieldMounted: (mount, visible) => setConditionalFieldMounted(mount, visible),
  normalizeInsideFxProfile: (profile) => normalizeInsideFxProfile(profile),
  normalizeInsideAnimationDefinition: (entry) => normalizeInsideAnimationDefinition(entry),
  normalizeInsideAssetType: (assetType) => normalizeInsideAssetType(assetType),
  normalizeInsideAssetRefForType: (assetType, ref, fallback) => normalizeInsideAssetRefForType(assetType, ref, fallback),
  getInsideFxProfile: (boardId) => getInsideFxProfile(boardId),
  getInsideAssetCandidates: (assetType) => getInsideAssetCandidates(assetType),
  getSelectedInsideAnimationDefinition: (boardId) => getSelectedInsideAnimationDefinition(boardId),
  normalizeRoomAssetType: (assetType) => normalizeRoomAssetType(assetType),
  normalizeRoomAssetRefForType: (assetType, ref, fallback) => normalizeRoomAssetRefForType(assetType, ref, fallback),
  normalizeRoomAnimationId: (id, fallback) => normalizeRoomAnimationId(id, fallback),
  getRoomFxProfile: (boardId) => getRoomFxProfile(boardId),
  getRoomAssetCandidates: (assetType) => getRoomAssetCandidates(assetType),
  getSelectedRoomAnimationDefinition: (boardId) => getSelectedRoomAnimationDefinition(boardId),
  getRoomAnimationDefinitionById: (type, boardId) => getRoomAnimationDefinitionById(type, boardId),
  normalizeOutsideFxProfile: (profile) => normalizeOutsideFxProfile(profile),
  normalizeOutsideAnimationDefinition: (entry) => normalizeOutsideAnimationDefinition(entry),
  normalizeOutsideAssetType: (assetType) => normalizeOutsideAssetType(assetType),
  normalizeOutsideAssetRefForType: (assetType, ref, fallback) => normalizeOutsideAssetRefForType(assetType, ref, fallback),
  normalizeOutsideMode: (mode) => normalizeOutsideMode(mode),
  normalizeOutsideDirection: (direction) => normalizeOutsideDirection(direction),
  getOutsideFxProfile: (boardId) => getOutsideFxProfile(boardId),
  getOutsideAssetCandidates: (assetType) => getOutsideAssetCandidates(assetType),
  getSelectedOutsideAnimationDefinition: (boardId) => getSelectedOutsideAnimationDefinition(boardId),
  clampOutsideIntensity: (value) => clampOutsideIntensity(value),
  clampOutsideSpeed: (value) => clampOutsideSpeed(value),
  createAnimation: (opts) => createAnimation(opts),
  playSoundForAnimation: (animation) => playSoundForAnimation(animation),
  stopAnimationSound: (animationId) => stopAnimationSound(animationId),
  clearOutsideMp4PlaybackState: (boardId) => clearOutsideMp4PlaybackState(boardId),
  clearOutsideTimelineState: (boardId) => clearOutsideTimelineState(boardId),
});
const {
  syncOutsideModeDirectionVisibility,
  buildInsideProfileWithSelectedAnimationPatch,
  syncInsideResourcePicker,
  getInsideEditorDraft,
  setInsideEditorDraft,
  collectInsideEditorDraftFromInputs,
  syncInsideFxPanel,
  renderInsideGlobalButtons,
  getRoomAnimationLabelById,
  syncRoomResourcePicker,
  getRoomEditorDraft,
  setRoomEditorDraft,
  collectRoomEditorDraftFromInputs,
  syncRoomFxPanel,
  buildOutsideProfileWithSelectedAnimationPatch,
  syncOutsideResourcePicker,
  loadOutsideResourceAssets,
  getOutsideEditorDraft,
  setOutsideEditorDraft,
  collectOutsideEditorDraftFromInputs,
  syncOutsideDraftVisibilityFromInputs,
  syncOutsideFxPanel,
  findOutsideGlobalAnimation,
  syncOutsideRuntimeMirror,
} = window.TT_BEAMER_RUNTIME_FX_PANELS;

// Phase 14-2: polygon editor drag/render + renderRoomOverlay moved to
// src/app/runtime/runtime-polygon-editor.js. Init + destructure so
// existing call sites resolve the same names. All cross-module deps
// are injected via ctx arrows so downstream destructures (room-geometry,
// room-management, room-draft, viewport-zoom) can land later without TDZ.
window.TT_BEAMER_RUNTIME_POLYGON_EDITOR.init({
  state,
  roomOverlay,
  triggerFeedback,
  shipPolygonEdgeSelect,
  polygonEdgeSelect,
  outputRole,
  OUTPUT_ROLE_FINAL,
  OUTPUT_ROLE_CONTROL,
  mapClientPointToNormalized: (x, y) => mapClientPointToNormalized(x, y),
  getShipPolygonPoints: (boardId) => getShipPolygonPoints(boardId),
  setShipPolygonPoints: (boardId, points) => setShipPolygonPoints(boardId, points),
  getSelectedPlayAreaId: (boardId) => getSelectedPlayAreaId(boardId),
  getPlayAreas: (boardId) => getPlayAreas(boardId),
  normalizeShipPolygon: (points) => normalizeShipPolygon(points),
  getBoardZoom: (boardId) => getBoardZoom(boardId),
  getPolygonEditorHandleMetrics: (scale, handleScale) => getPolygonEditorHandleMetrics(scale, handleScale),
  getCurrentPolygonHandleScale: () => getCurrentPolygonHandleScale(),
  syncShipPolygonEditorStatus: () => syncShipPolygonEditorStatus(),
  syncShipPolygonVertexSelect: () => syncShipPolygonVertexSelect(),
  isPanArbitrating: () => isPanArbitrating(),
  isAcceptablePolygonPointerEvent: (event) => isAcceptablePolygonPointerEvent(event),
  arePlayAreaVerticesEditable: () => arePlayAreaVerticesEditable(),
  areRoomVerticesEditable: () => areRoomVerticesEditable(),
  cacheShipPolygonDragDomRefs: () => cacheShipPolygonDragDomRefs(),
  cacheRoomPolygonDragDomRefs: (roomId) => cacheRoomPolygonDragDomRefs(roomId),
  beginPolygonDragInteraction: () => beginPolygonDragInteraction(),
  endPolygonDragInteraction: () => endPolygonDragInteraction(),
  persistBoardProfiles: () => persistBoardProfiles(),
  getSpecialPolygonPoints: (boardId, roomId) => getSpecialPolygonPoints(boardId, roomId),
  setSpecialPolygonPoints: (boardId, roomId, points) => setSpecialPolygonPoints(boardId, roomId, points),
  getBoard: (boardId) => getBoard(boardId),
  getRoomPoints: (room, boardId) => getRoomPoints(room, boardId),
  getRoomLabelPosition: (room, boardId) => getRoomLabelPosition(room, boardId),
  getSpecialRooms: (boardId) => getSpecialRooms(boardId),
  getActivePolygonRoomId: (boardId) => getActivePolygonRoomId(boardId),
  setActivePolygonRoomId: (boardId, roomId) => setActivePolygonRoomId(boardId, roomId),
  refreshPersistentRoomSelectionVisualState: () => refreshPersistentRoomSelectionVisualState(),
  syncPolygonVertexSelect: (roomId) => syncPolygonVertexSelect(roomId),
  syncPolygonEdgeSelect: (roomId) => syncPolygonEdgeSelect(roomId),
  syncPolygonEditorStatus: () => syncPolygonEditorStatus(),
  syncPolygonEditorPanel: () => syncPolygonEditorPanel(),
  syncRoomPanelFromSelection: (opts) => syncRoomPanelFromSelection(opts),
  syncSelectedRoomStateForBoard: (boardId) => syncSelectedRoomStateForBoard(boardId),
  isQuickModeActive: () => isQuickModeActive(),
  handleQuickModeRoomTap: (roomId) => handleQuickModeRoomTap(roomId),
  applyRoomDraftTargetFromRoomClick: (roomId) => applyRoomDraftTargetFromRoomClick(roomId),
});
const {
  getNormalizedOverlayPoint,
  beginShipPolygonVertexDrag,
  clearShipPolygonDragSession,
  commitShipPolygonDrag,
  cancelShipPolygonDrag,
  finishShipPolygonVertexDrag,
  renderShipPolygonEditorHandles,
  syncPolygonRoomSelection,
  renderPolygonEditorHandles,
  beginPolygonVertexDrag,
  beginPendingPolygonAreaDrag,
  clearPendingPolygonAreaDragSession,
  preserveRoomSelectionAfterPointerLifecycle,
  beginPolygonAreaDrag,
  clearPolygonAreaDragSession,
  maybePromotePendingPolygonAreaDrag,
  clearPolygonDragSession,
  commitPolygonDrag,
  cancelPolygonDrag,
  cancelPolygonAreaDrag,
  finishPolygonVertexDrag,
  finishPolygonAreaDrag,
  renderRoomOverlay,
} = window.TT_BEAMER_RUNTIME_POLYGON_EDITOR;

function emitBoardLayoutContextMutation(boardId = state.boardId, reason = "board-select") {
  const contextSwitchTransactionId = `context-switch-${boardId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  emitLiveMutation("context-update", {
    reason,
    contextSwitchTransactionId,
    selectedBoard: boardId,
    selectedLayout: boardId,
    boardId,
    layoutId: boardId,
  });
}

function shouldPreserveLifecycleStatusFeedback() {
  const text = typeof triggerFeedback?.textContent === "string" ? triggerFeedback.textContent : "";
  if (!text) {
    return false;
  }
  return /Pending:|\bstarted\b|\baccepted\b|\bStopping\.\.\.\b/i.test(text);
}

function switchBoard(boardId, { emitLiveContext = false, reason = "board-switch", announceStatus = true } = {}) {
  const switchStartedAt = performance.now();
  const previousBoardId = state.boardId;
  const previousRoomId = state.selectedRoomId;
  if (previousBoardId && previousRoomId) {
    state.selectedRoomByBoard[previousBoardId] = previousRoomId;
  }

  const board = getBoard(boardId);
  state.boardId = board.id;
  state.selectedBoard = board.id;
  state.selectedLayout = board.id;
  boardImage.src = board.src;
  boardSelect.value = board.id;
  boardStatus.textContent = `Active board: ${board.label}`;
  const rememberedRoom = state.selectedRoomByBoard[board.id];
  state.selectedRoomId = board.rooms.some((room) => room.id === rememberedRoom)
    ? rememberedRoom
    : board.rooms[0]?.id ?? null;
  state.selectedRoomByBoard[board.id] = state.selectedRoomId;
  ensureBoardRoomStateMaps(board.id);
  clearOutsideMp4PlaybackState(previousBoardId);
  clearOutsideTimelineState(previousBoardId);
  warmRoomGifAssets({ reason: "board-switch" });
  prewarmBoardOutsideMp4Asset(board.id, { reason });
  syncRoomPanelFromSelection();
  syncHitareaCalibrationPanel();
  syncRoomGeometryPanel();
  syncPolygonEditorPanel();
  syncShipPolygonEditorPanel();
  syncRoomFxPanel();
  syncInsideFxPanel();
  syncOutsideFxPanel();
  syncOutsideRuntimeMirror(board.id);
  syncBoardZoomPanel();
  setPanCursorState();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderRoomOverlay();
  refreshGlobalButtons();
  if (announceStatus && !shouldPreserveLifecycleStatusFeedback()) {
    const durationMs = Math.round(Math.max(0, performance.now() - switchStartedAt));
    triggerFeedback.textContent = `Status: board switched (${durationMs}ms)`;
  }
  if (emitLiveContext) {
    emitBoardLayoutContextMutation(board.id, reason);
  }
}

function ensureBoardRoomStateMaps(boardId) {
  const board = getBoard(boardId);
  const geometryMap = state.roomGeometryByBoard[boardId] ?? {};
  const stateMap = state.roomStateProfilesByBoard[boardId] ?? {};
  const tombstones = state.roomTombstonesByBoard?.[boardId] ?? [];
  for (const room of board.rooms) {
    if (!geometryMap[room.id]) {
      geometryMap[room.id] = normalizeRoomGeometry(ROOM_GEOMETRY_DEFAULT, room, boardId);
    }
    if (!stateMap[room.id]) {
      stateMap[room.id] = normalizeRoomStateProfile(ROOM_STATE_DEFAULT);
    }
  }
  state.roomGeometryByBoard[boardId] = geometryMap;
  state.roomStateProfilesByBoard[boardId] = stateMap;
  if (!state.roomTombstonesByBoard) {
    state.roomTombstonesByBoard = {};
  }
  state.roomTombstonesByBoard[boardId] = normalizeRoomTombstoneIds(tombstones, boardId);
}

// Phase 14-2: room + cluster management (~615 LOC) moved to
// src/app/runtime/runtime-room-management.js. Init + destructure
// so existing call sites resolve the same names.
window.TT_BEAMER_RUNTIME_ROOM_MANAGEMENT.init({
  state,
  clusterSelect,
  clusterNameInput,
  clusterRoomIdsSelect,
  clusterSaveButton,
  clusterDeleteButton,
  clusterManagementStatus,
  roomCreateShapeSelect,
  roomDeleteButton,
  roomNameInput,
  roomManagementStatus,
  getBoard: (boardId) => getBoard(boardId),
  getSelectedRoom: () => getSelectedRoom(),
  syncSelectedRoomStateForBoard: (boardId) => syncSelectedRoomStateForBoard(boardId),
  syncRoomTargetSelect: () => syncRoomTargetSelect(),
  syncRoomPanelFromSelection: (opts) => syncRoomPanelFromSelection(opts),
  syncPolygonEditorPanel: () => syncPolygonEditorPanel(),
  syncPolygonRoomSelection: (roomId) => syncPolygonRoomSelection(roomId),
  persistBoardProfiles: () => persistBoardProfiles(),
  renderRoomOverlay: () => renderRoomOverlay(),
  renderRunningAnimationsList: () => renderRunningAnimationsList(),
  clampRoomAbsoluteCoordinate: (value) => clampRoomAbsoluteCoordinate(value),
  normalizeRoomPoint: (point) => normalizeRoomPoint(point),
  normalizeRoomName: (value, fallback) => normalizeRoomName(value, fallback),
  createHexagonPolygon: (opts) => createHexagonPolygon(opts),
  getSpecialPolygonPoints: (boardId, roomId) => getSpecialPolygonPoints(boardId, roomId),
  setSpecialPolygonPoints: (boardId, roomId, points) => setSpecialPolygonPoints(boardId, roomId, points),
  getShipPolygonPoints: (boardId) => getShipPolygonPoints(boardId),
  createRoomId: (board) => createRoomId(board),
  getRawRoomCenter: (room) => getRawRoomCenter(room),
  getRoomGeometry: (boardId, roomId) => getRoomGeometry(boardId, roomId),
  setRoomGeometry: (boardId, roomId, geometry) => setRoomGeometry(boardId, roomId, geometry),
  ensureBoardRoomStateMaps: (boardId) => ensureBoardRoomStateMaps(boardId),
  clearRoomTombstone: (boardId, roomId) => clearRoomTombstone(boardId, roomId),
  markRoomTombstone: (boardId, roomId) => markRoomTombstone(boardId, roomId),
  setActivePolygonRoomId: (boardId, roomId) => setActivePolygonRoomId(boardId, roomId),
  clearRoomDraftEditTarget: () => clearRoomDraftEditTarget(),
  stopAnimationSound: (animationId) => stopAnimationSound(animationId),
});
const {
  syncRoomManagementPanel,
  syncRoomCreateShapeOptions,
  getSelectedOptionValues,
  createClusterId,
  normalizeClusterRoomIds,
  getSelectedClusterForBoard,
  syncClusterRoomMultiSelect,
  syncClusterManagementPanel,
  createClusterFromSettings,
  updateClusterFromSettings,
  deleteSelectedClusterFromSettings,
  calculatePolygonCenterAndRadius,
  cloneRoomSnapshot,
  buildCopiedRoomName,
  copySelectedRoomToClipboard,
  pasteRoomFromClipboard,
  clearSelectedRoomSelection,
  isTypingShortcutTarget,
  isPlayAreaShortcutContext,
  createRoomFromSettings,
  deleteSelectedRoom,
  refreshPersistentRoomSelectionVisualState,
  renameSelectedRoom,
  getBoardRoomClusters,
  getRoomTargetOptions,
  parseRoomTargetValue,
} = window.TT_BEAMER_RUNTIME_ROOM_MANAGEMENT;

// Phase 14-2: room draft UI state + cluster runtime helpers
// (~330 LOC) moved to src/app/runtime/runtime-room-draft.js.
// Init + destructure so existing call sites resolve the same names.
window.TT_BEAMER_RUNTIME_ROOM_DRAFT.init({
  state,
  CLUSTER_STAGGER_OFFSET_DEFAULT_MS,
  roomTargetSelect,
  roomSelected,
  startRoomAnimationButton,
  roomOpacityInput,
  roomOpacityValue,
  roomAnimationSelect,
  roomIntensityInput,
  roomIntensityValue,
  roomSpeedInput,
  roomSpeedValue,
  roomSoundVolumeInput,
  roomSoundVolumeValue,
  roomDurationInput,
  roomStaggerStartInput,
  roomStaggerOffsetInput,
  roomRenameInput,
  roomNameInput,
  logRuntime,
  getBoard: (boardId) => getBoard(boardId),
  getSelectedRoom: () => getSelectedRoom(),
  getBoardRoomClusters: (boardId) => getBoardRoomClusters(boardId),
  getRoomTargetOptions: (boardId) => getRoomTargetOptions(boardId),
  parseRoomTargetValue: (value) => parseRoomTargetValue(value),
  getRoomFxProfile: (boardId) => getRoomFxProfile(boardId),
  clampClusterStaggerOffsetMs: (value) => clampClusterStaggerOffsetMs(value),
  clampRoomOpacity: (value) => clampRoomOpacity(value),
  clampRoomIntensity: (value) => clampRoomIntensity(value),
  clampRoomSpeed: (value) => clampRoomSpeed(value),
  clampRoomSoundVolume: (value) => clampRoomSoundVolume(value),
  clampRoomDurationSec: (value) => clampRoomDurationSec(value),
  syncRoomStaggerOffsetControl: () => syncRoomStaggerOffsetControl(),
  syncRoomGeometryPanel: () => syncRoomGeometryPanel(),
  syncDashboardZoneVisibility: () => syncDashboardZoneVisibility(),
  syncRoomManagementPanel: (statusText) => syncRoomManagementPanel(statusText),
});
const {
  resolveRoomDraftTargets,
  buildClusterDispatchPlan,
  getClusterTargetById,
  getClusterMemberAnimationIds,
  getRunningAnimationsForList,
  resolveClusterMemberFallbackDelayMs,
  buildClusterMemberRuntimeViews,
  syncRoomTargetSelect,
  syncRoomPanelFromSelection,
  syncRoomDraftActionButton,
  clearRoomDraftEditTarget,
  applyRoomDraftTargetFromRoomClick,
  normalizeRoomDraftUiField,
  captureRoomDraftUiSnapshot,
  restoreRoomDraftUiSnapshot,
} = window.TT_BEAMER_RUNTIME_ROOM_DRAFT;

function createAnimation({
  type,
  animationName = "",
  roomAssetType = "",
  roomAssetRef = "",
  scope,
  boardId = state.boardId,
  roomId = null,
  intensity = 0.8,
  speed = 1,
  opacity = 0.9,
  soundVolume = 1,
  hold = false,
  durationSec = 15,
  startDelayMs = 0,
}) {
  const normalizedStartDelayMs = Math.max(0, Number(startDelayMs) || 0);
  const startedAt = performance.now() + normalizedStartDelayMs;
  const startedAtEpochMs = Date.now() + normalizedStartDelayMs;
  const effectiveHold = scope === "room" || scope === "cluster" ? true : hold;
  return {
    id: `anim-${animationIdCounter++}`,
    boardId,
    type,
    animationName: String(animationName || "").trim() || undefined,
    roomAssetType: String(roomAssetType || "").trim() || undefined,
    roomAssetRef: String(roomAssetRef || "").trim() || undefined,
    scope,
    roomId,
    intensity,
    speed: clampRoomSpeed(speed),
    opacity: clampRoomOpacity(opacity),
    playbackSpeed: clampRoomSpeed(speed),
    soundVolume: clampRoomSoundVolume(soundVolume),
    hold: effectiveHold,
    durationMs: effectiveHold ? null : Math.max(1000, durationSec * 1000),
    startedAt,
    startedAtEpochMs,
  };
}

// Phase 14-2: drawRoomComposition now lives in runtime-draw-loop.js
// along with the rest of the draw pipeline. Init + destructure is
// deferred until after all upstream helpers (drawEffectVisual,
// clipToRoom, etc.) have been destructured — see the init block
// after flickerNoise below.

// Phase 14-2: startRoomAnimationFromDraft moved to
// src/app/runtime/runtime-room-dispatch.js. Init + destructure so
// existing call sites resolve the same name.
window.TT_BEAMER_RUNTIME_ROOM_DISPATCH.init({
  state,
  triggerFeedback,
  OUTPUT_ROLE_CONTROL,
  getOutputRole: () => outputRole,
  captureRoomDraftUiSnapshot: () => captureRoomDraftUiSnapshot(),
  restoreRoomDraftUiSnapshot: (snapshot, reason) => restoreRoomDraftUiSnapshot(snapshot, reason),
  getBoard: (boardId) => getBoard(boardId),
  getRoomAnimationDefinitionById: (type, boardId) => getRoomAnimationDefinitionById(type, boardId),
  normalizeRoomAssetType: (assetType) => normalizeRoomAssetType(assetType),
  normalizeRoomAssetRefForType: (assetType, ref, fallback) => normalizeRoomAssetRefForType(assetType, ref, fallback),
  clampRoomIntensity: (value) => clampRoomIntensity(value),
  clampRoomSpeed: (value) => clampRoomSpeed(value),
  clampRoomOpacity: (value) => clampRoomOpacity(value),
  clampRoomSoundVolume: (value) => clampRoomSoundVolume(value),
  clampClusterStaggerOffsetMs: (value) => clampClusterStaggerOffsetMs(value),
  warmGifAssetPath: (path, opts) => warmGifAssetPath(path, opts),
  resolveRoomDraftTargets: () => resolveRoomDraftTargets(),
  getClusterTargetById: (id, boardId) => getClusterTargetById(id, boardId),
  buildClusterDispatchPlan: (roomIds, opts) => buildClusterDispatchPlan(roomIds, opts),
  createAnimation: (opts) => createAnimation(opts),
  emitLiveMutation: (type, payload) => emitLiveMutation(type, payload),
  buildAnimationSnapshotForLiveSync: (animation) => buildAnimationSnapshotForLiveSync(animation),
  clearRoomDraftEditTarget: () => clearRoomDraftEditTarget(),
  playSoundForAnimation: (animation) => playSoundForAnimation(animation),
  stopAnimationSound: (animationId) => stopAnimationSound(animationId),
  renderRunningAnimationsList: () => renderRunningAnimationsList(),
  getRoomAnimationLabelById: (type, boardId) => getRoomAnimationLabelById(type, boardId),
  getBoardRoomClusters: (boardId) => getBoardRoomClusters(boardId),
});
const { startRoomAnimationFromDraft } = window.TT_BEAMER_RUNTIME_ROOM_DISPATCH;


// Phase 14-2: animation lifecycle (stop/edit/list + stop-pending
// liveSync helpers) moved to
// src/app/runtime/runtime-animation-lifecycle.js. Init + destructure
// so existing call sites resolve the same names.
window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE.init({
  state,
  liveSync,
  triggerFeedback,
  runningAnimationsList,
  roomAnimationSelect,
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
  STOP_ANIMATION_MUTATION_TYPE,
  OUTPUT_ROLE_CONTROL,
  getOutputRole: () => outputRole,
  getClusterMemberAnimationIds: (animation) => getClusterMemberAnimationIds(animation),
  emitLiveMutation: (type, payload) => emitLiveMutation(type, payload),
  stopAnimationSound: (animationId) => stopAnimationSound(animationId),
  clearRoomDraftEditTarget: () => clearRoomDraftEditTarget(),
  updateOutsideFxProfile: (boardId, partial) => updateOutsideFxProfile(boardId, partial),
  persistBoardProfiles: () => persistBoardProfiles(),
  syncOutsideFxPanel: () => syncOutsideFxPanel(),
  switchBoard: (boardId, opts) => switchBoard(boardId, opts),
  getClusterTargetById: (clusterId, boardId) => getClusterTargetById(clusterId, boardId),
  getRoomAnimationDefinitionById: (type, boardId) => getRoomAnimationDefinitionById(type, boardId),
  normalizeRoomAssetType: (assetType) => normalizeRoomAssetType(assetType),
  normalizeRoomAssetRefForType: (assetType, ref, fallback) => normalizeRoomAssetRefForType(assetType, ref, fallback),
  clampRoomOpacity: (value) => clampRoomOpacity(value),
  clampRoomIntensity: (value) => clampRoomIntensity(value),
  clampRoomSpeed: (value) => clampRoomSpeed(value),
  clampRoomSoundVolume: (value) => clampRoomSoundVolume(value),
  clampRoomDurationSec: (value) => clampRoomDurationSec(value),
  clampClusterStaggerOffsetMs: (value) => clampClusterStaggerOffsetMs(value),
  isRoomAnimationType: (type) => isRoomAnimationType(type),
  syncRoomStaggerOffsetControl: () => syncRoomStaggerOffsetControl(),
  syncRoomDraftActionButton: () => syncRoomDraftActionButton(),
  syncRoomPanelFromSelection: (opts) => syncRoomPanelFromSelection(opts),
  renderRoomOverlay: () => renderRoomOverlay(),
  getRunningAnimationsForList: () => getRunningAnimationsForList(),
  getRoomAnimationLabelById: (type, boardId) => getRoomAnimationLabelById(type, boardId),
  getAnimationLabel: (type) => getAnimationLabel(type),
  getBoard: (boardId) => getBoard(boardId),
  getGlobalCategoryRuntimeLabel: (type) => getGlobalCategoryRuntimeLabel(type),
  getRoomGifAssetFileName: (type, boardId) => getRoomGifAssetFileName(type, boardId),
  getRoomEquivalentType: (type, boardId) => getRoomEquivalentType(type, boardId),
  shouldSuppressRapidTap: (key, threshold) => shouldSuppressRapidTap(key, threshold),
  setDashboardZone: (zone) => setDashboardZone(zone),
});
const {
  collectAnimationStopIds,
  isStopPendingForAnimationId,
  markStopPending,
  clearStopPending,
  reconcileStopPendingFromSnapshot,
  buildStopCommandTargetMeta,
  emitStopAnimationCommand,
  stopAnimation,
  editAnimation,
  renderRunningAnimationsList,
  isRunningListInteractionActive,
  validateRunningListParity,
  refreshGlobalButtons,
} = window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE;

// Phase 14-2: canvas clip helpers live in
// src/app/runtime/runtime-canvas-clip.js. Init + destructure so
// existing call sites resolve the same names.
window.TT_BEAMER_RUNTIME_CANVAS_CLIP.init({
  state,
  canvas,
  canvasCtx: ctx,
  getRoomPolygonPixels: (room, w, h, boardId) => getRoomPolygonPixels(room, w, h, boardId),
  getShipPolygonPixels: (w, h, boardId) => getShipPolygonPixels(w, h, boardId),
  getPlayAreaPolygonsPixels: (w, h, boardId) => getPlayAreaPolygonsPixels(w, h, boardId),
});
const {
  clipToPolygon,
  isFiniteCanvasPoint,
  getPolygonSignedArea,
  isRenderableCanvasPolygon,
  clipToRoom,
  getShipClipPolygon,
  getPlayAreaClipPolygons,
  appendPolygonPath,
  clipToOutsideShip,
  clipToInsideShip,
} = window.TT_BEAMER_RUNTIME_CANVAS_CLIP;

function flickerNoise(seed) {
  const raw = Math.sin(seed * 127.1) * 43758.5453123;
  return raw - Math.floor(raw);
}

// Phase 14-2: drawEffectVisual lives in
// src/app/runtime/runtime-effect-visuals.js. Init + destructure so
// existing call sites resolve the same name.
window.TT_BEAMER_RUNTIME_EFFECT_VISUALS.init({
  state,
  canvas,
  canvasCtx: ctx,
  getRoomLabelPosition: (room, boardId) => getRoomLabelPosition(room, boardId),
  getRuntimeVisualCaps: () => getRuntimeVisualCaps(),
  clampOutsideSpeed: (value) => clampOutsideSpeed(value),
  flickerNoise: (seed) => flickerNoise(seed),
});
const { drawEffectVisual } = window.TT_BEAMER_RUNTIME_EFFECT_VISUALS;

// Phase 14-2: draw loop (draw, pruneFinishedAnimations, drawOutsideFxLayer,
// drawAnimation(Safely), drawInsideGlobalVisual, drawRoomComposition)
// moved to src/app/runtime/runtime-draw-loop.js. Init + destructure so
// existing call sites (e.g., applyClearAllResultToRuntime calling
// drawAnimation or the rAF self-reschedule) resolve the same names.
window.TT_BEAMER_RUNTIME_DRAW_LOOP.init({
  state,
  canvas,
  canvasCtx: ctx,
  logRender,
  triggerFeedback,
  OUTPUT_ROLE_FINAL,
  ROOM_GIF_ANIMATION_ASSETS,
  getOutputRole: () => outputRole,
  isHeavyInteractionActive: () => isHeavyInteractionActive(),
  getRuntimeQualityScale: () => getRuntimeQualityScale(),
  shouldCoalesceNonCriticalAnimation: (animation) => shouldCoalesceNonCriticalAnimation(animation),
  isRenderCriticalAnimation: (animation) => isRenderCriticalAnimation(animation),
  shouldSkipRoomMp4Frame: (animation) => shouldSkipRoomMp4Frame(animation),
  recordRuntimeFrameCost: (ms) => recordRuntimeFrameCost(ms),
  normalizeRoomAssetType: (assetType) => normalizeRoomAssetType(assetType),
  normalizeRoomAssetRefForType: (assetType, ref, fallback) => normalizeRoomAssetRefForType(assetType, ref, fallback),
  resolveRoomCodedEffectType: (assetRef) => resolveRoomCodedEffectType(assetRef),
  resolveInsideCodedEffectType: (assetRef) => resolveInsideCodedEffectType(assetRef),
  resolveOutsideCodedEffectType: (assetRef) => resolveOutsideCodedEffectType(assetRef),
  resolveRoomGifRenderConfig: (type, age, intensity, options) => resolveRoomGifRenderConfig(type, age, intensity, options),
  getGifPlaybackFrame: (path, elapsed) => getGifPlaybackFrame(path, elapsed),
  getRoomVideoElement: (path) => getRoomVideoElement(path),
  getOutsideVideoElement: (path) => getOutsideVideoElement(path),
  buildOutsideLifecycleKey: (boardId, definition) => buildOutsideLifecycleKey(boardId, definition),
  resolveOutsideElapsedSeconds: (now, opts) => resolveOutsideElapsedSeconds(now, opts),
  resolveOutsideTimeline: (elapsed, speed) => resolveOutsideTimeline(elapsed, speed),
  clearOutsideMp4PlaybackState: (boardId) => clearOutsideMp4PlaybackState(boardId),
  clearOutsideTimelineState: (boardId) => clearOutsideTimelineState(boardId),
  ensureOutsideMp4Playback: (video, opts) => ensureOutsideMp4Playback(video, opts),
  maybeWrapOutsideMp4Loop: (video, playbackState) => maybeWrapOutsideMp4Loop(video, playbackState),
  shouldDrawOutsideMp4Now: (playbackState) => shouldDrawOutsideMp4Now(playbackState),
  captureOutsideMp4FallbackFrame: (playbackState, video) => captureOutsideMp4FallbackFrame(playbackState, video),
  drawOutsideMp4FallbackFrame: (playbackState) => drawOutsideMp4FallbackFrame(playbackState),
  getInsideFxProfile: (boardId) => getInsideFxProfile(boardId),
  getOutsideFxProfile: (boardId) => getOutsideFxProfile(boardId),
  getSelectedOutsideAnimationDefinition: (boardId) => getSelectedOutsideAnimationDefinition(boardId),
  clipToRoom: (room, boardId) => clipToRoom(room, boardId),
  clipToInsideShip: (boardId) => clipToInsideShip(boardId),
  clipToOutsideShip: (boardId) => clipToOutsideShip(boardId),
  getBoard: (boardId) => getBoard(boardId),
  buildClusterMemberRuntimeViews: (clusterAnimation) => buildClusterMemberRuntimeViews(clusterAnimation),
  getRoomRenderMetrics: (room, boardId) => getRoomRenderMetrics(room, boardId),
  clampRoomSpeed: (value) => clampRoomSpeed(value),
  clampRoomOpacity: (value) => clampRoomOpacity(value),
  clampOutsideIntensity: (value) => clampOutsideIntensity(value),
  clampOutsideSpeed: (value) => clampOutsideSpeed(value),
  stopSoundsForInactiveAnimations: () => stopSoundsForInactiveAnimations(),
  renderRunningAnimationsList: () => renderRunningAnimationsList(),
  refreshGlobalButtons: () => refreshGlobalButtons(),
  isRunningListInteractionActive: () => isRunningListInteractionActive(),
  drawEffectVisual: (type, age, intensity, room, roomMetrics, options) => drawEffectVisual(type, age, intensity, room, roomMetrics, options),
  clearRoomDraftEditTarget: () => clearRoomDraftEditTarget(),
});
const {
  drawRoomComposition,
  drawInsideGlobalVisual,
  drawAnimation,
  drawAnimationSafely,
  drawOutsideFxLayer,
  pruneFinishedAnimations,
  draw,
  startDrawLoop,
} = window.TT_BEAMER_RUNTIME_DRAW_LOOP;

boardSelect.addEventListener("change", () => switchBoard(boardSelect.value, {
  emitLiveContext: true,
  reason: "board-select",
}));

boardImportButton?.addEventListener("click", async () => {
  const jsonFile = boardImportFileInput?.files?.[0] ?? null;
  const imageFile = boardImportImageInput?.files?.[0] ?? null;
  boardImportButton.disabled = true;
  try {
    let result;
    if (jsonFile) {
      result = await importBoardFromFile(jsonFile);
    } else if (imageFile) {
      result = await importBoardFromImage(imageFile, {
        boardName: boardImportNameInput?.value ?? "",
        boardId: boardImportIdInput?.value ?? "",
      });
      setActiveView("settings");
      syncShipPolygonEditorPanel();
      triggerFeedback.textContent =
        `Status: image board imported (${result?.boardId || "unknown"}) - start manual Play Area and room polygon drawing in Settings`;
    } else {
      throw new Error("Please choose either a JSON board file or an image file");
    }
    const importedBoardId = result?.boardId || "unknown";
    if (!imageFile) {
      triggerFeedback.textContent = `Status: board import succeeded (${importedBoardId})`;
    }
    boardStatus.textContent = `Active board: ${getBoard().label}`;
    if (boardImportFileInput) {
      boardImportFileInput.value = "";
    }
    if (boardImportImageInput) {
      boardImportImageInput.value = "";
    }
    if (boardImportNameInput) {
      boardImportNameInput.value = "";
    }
    if (boardImportIdInput) {
      boardImportIdInput.value = "";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Board import failed";
    reportActionError(`Status: ${message}`, {
      toastText: `Board import failed: ${message}`,
      dedupeKey: "board-import-failed",
    });
  } finally {
    boardImportButton.disabled = false;
  }
});

openDashboardViewButton.addEventListener("click", () => {
  setActiveView("dashboard");
});

openSettingsViewButton.addEventListener("click", () => {
  setActiveView("settings");
});

for (const button of settingsSubtabButtons) {
  button.addEventListener("click", () => {
    const nextTab = normalizeSettingsSubtab(button.dataset.settingsSubtab);
    if (nextTab === normalizeSettingsSubtab(state.settingsSubtab)) {
      return;
    }
    setSettingsSubtab(nextTab);
    triggerFeedback.textContent = `Status: Settings tab switched to ${SETTINGS_SUBTAB_LABELS[nextTab] ?? SETTINGS_SUBTAB_LABELS.board}`;
  });
}

quickModeOffButton?.addEventListener("click", () => {
  setQuickMode("off");
});

quickModeActivateButton?.addEventListener("click", () => {
  setQuickMode("activate");
});

quickModeDeactivateButton?.addEventListener("click", () => {
  setQuickMode("deactivate");
});

quickModeClearButton?.addEventListener("click", () => {
  setQuickMode("clear");
});

openTriggerZoneButton?.addEventListener("click", () => {
  setDashboardZone("trigger", { announce: true });
});

openManageZoneButton?.addEventListener("click", () => {
  setDashboardZone("manage", { announce: true });
});

function updateActiveBoardHitareaCalibration(partial) {
  setHitareaCalibration(state.boardId, {
    ...getHitareaCalibration(state.boardId),
    ...partial,
  });
  syncHitareaCalibrationPanel();
  renderRoomOverlay();
  hitareaStatus.textContent = `${hitareaStatus.textContent} (not saved)`;
}

function updateSelectedRoomGeometry(partial, statusSuffix = "") {
  const room = getSelectedRoom();
  if (!room) {
    return;
  }
  updateRoomGeometry(state.boardId, room.id, partial);
  const persisted = persistBoardProfiles();
  renderRoomOverlay();
  syncRoomGeometryPanel();
  if (statusSuffix) {
    triggerFeedback.textContent = persisted
      ? `Status: ${room.name ?? room.label} ${statusSuffix}`
      : `Status: ${room.name ?? room.label} ${statusSuffix} (persistence failed)`;
  }
}


// Phase 14-2: hitarea + room geometry event binders moved to
// src/app/runtime/runtime-wire-calibration-binders.js.
window.TT_BEAMER_RUNTIME_WIRE_CALIBRATION_BINDERS.wireCalibrationBinders({
  state,
  hitareaOffsetXInput,
  hitareaOffsetYInput,
  hitareaScaleInput,
  hitareaSaveButton,
  hitareaResetButton,
  roomGeometryModeInput,
  roomGeometryXInput,
  roomGeometryYInput,
  roomGeometryStretchXInput,
  roomGeometryStretchYInput,
  HITAREA_CALIBRATION_DEFAULT,
  clampHitareaOffset,
  clampHitareaScale,
  clampRoomAbsoluteCoordinate,
  clampRoomRelativeOffset,
  clampRoomStretch: (v) => clampRoomStretch(v),
  updateActiveBoardHitareaCalibration: (partial) => updateActiveBoardHitareaCalibration(partial),
  setHitareaCalibration: (boardId, calibration) => setHitareaCalibration(boardId, calibration),
  persistBoardProfiles: () => persistBoardProfiles(),
  syncHitareaCalibrationPanel: () => syncHitareaCalibrationPanel(),
  renderRoomOverlay: () => renderRoomOverlay(),
  triggerFeedback,
  getSelectedRoom: () => getSelectedRoom(),
  getRoomGeometry: (boardId, roomId) => getRoomGeometry(boardId, roomId),
  getRawRoomCenter: (room, boardId) => getRawRoomCenter(room, boardId),
  normalizeRoomGeometryMode: (mode) => normalizeRoomGeometryMode(mode),
  updateSelectedRoomGeometry: (partial, suffix) => updateSelectedRoomGeometry(partial, suffix),
});

// Phase 13-2: zoom slider removed. Wheel + pinch gestures below replace it.
// Mouse wheel over the stage: exponential scale delta, cursor-anchored.
// Two-finger pinch: midpoint-anchored scale via pointer pair distance ratio.

// Phase 13-HF6: global "touch gesture in progress" flag. When true,
// heavy DOM-read paths skip their work to keep the rAF path pure
// writes — no forced reflows. Set by the touch gesture state machine.
let touchGestureActive = false;

// Phase 14-2: polygon-drag support module (polygon drag flag, rAF
// overlay render coalescer, cached drag DOM refs, incremental SVG
// writer, heavy-interaction lifecycle, cached stage geometry).
window.TT_BEAMER_RUNTIME_POLYGON_DRAG_SUPPORT.init({
  state,
  liveSync,
  stage,
  roomOverlay,
  getTouchGestureActive: () => touchGestureActive,
  getRoomTransform: (room, boardId) => getRoomTransform(room, boardId),
  getHitareaCalibration: (boardId) => getHitareaCalibration(boardId),
  renderRoomOverlay: () => renderRoomOverlay(),
  scheduleNextLiveSnapshotPoll: (delay) => scheduleNextLiveSnapshotPoll(delay),
});
const {
  isHeavyInteractionActive,
  scheduleRoomOverlayRender,
  flushPendingRoomOverlayRender,
  cacheRoomPolygonDragDomRefs,
  cacheShipPolygonDragDomRefs,
  applyIncrementalRoomDrag,
  applyIncrementalShipDrag,
  projectDisplayNormalizedToRoomRaw,
  clampDisplayNormalizedCoordinate,
  beginPolygonDragInteraction,
  endPolygonDragInteraction,
  refreshStageGeometryCache,
  getCachedStageGeometry,
} = window.TT_BEAMER_RUNTIME_POLYGON_DRAG_SUPPORT;

// Phase 13-HF4: cursor-accurate zoom-around-anchor math for the stage's
// CSS `transform-origin: 50% 50%`. HF1's attempt used the parent rect +
// offsetLeft which implicitly assumes `transform-origin: 0 0` and
// produced the wrong anchor on every zoom.
//
// Derivation (transform-origin 50% 50%):
//   visualX = layoutCenterX + panX + (stageLocalX - layoutWidth/2) * scale
//
// Given a cursor at (clientX, clientY) we read fracX/fracY from the
// TRANSFORMED getBoundingClientRect(), which gives the cursor's position
// as a 0..1 fraction inside the visible stage. That fraction equals the
// same fraction in UNTRANSFORMED stage-local coordinates:
//   stageLocalX = fracX * stage.clientWidth
//
// To keep the stage-local point under the cursor after rescaling, we need
//   clientX = layoutCenterX + newPanX + (stageLocalX - layoutWidth/2) * newScale
// Subtracting the current equation and solving for newPanX:
//   newPanX = panX + (layoutWidth/2 - stageLocalX) * (newScale - scale)
//
// No layoutLeft / layoutCenterX required — the math is differential.
// Phase 14-2: viewport zoom + pan (~300 LOC scattered across 4
// regions) moved to src/app/runtime/runtime-viewport-zoom.js.
// Init + destructure so existing call sites resolve the same names.
window.TT_BEAMER_RUNTIME_VIEWPORT_ZOOM.init({
  state,
  stage,
  roomOverlay,
  boardZoomStatus,
  boardPanStatus,
  polygonHandleSizeInput,
  polygonHandleSizeValue,
  triggerFeedback,
  BOARD_ZOOM_DEFAULT,
  BOARD_ZOOM_SCALE_MIN,
  BOARD_ZOOM_SCALE_MAX,
  getBoards: () => BOARDS,
  getBoard: (boardId) => getBoard(boardId),
  getActivePolygonRoomId: (boardId) => getActivePolygonRoomId(boardId),
  getRoomPoints: (room, boardId) => getRoomPoints(room, boardId),
  getRawRoomCenter: (room, boardId) => getRawRoomCenter(room, boardId),
  getCurrentPolygonHandleScale: () => getCurrentPolygonHandleScale(),
  getCachedStageGeometry: () => getCachedStageGeometry(),
  getTouchGestureActive: () => touchGestureActive,
});
const {
  clampBoardZoomScale,
  normalizeBoardZoomProfile,
  getStagePanBounds,
  clampPanToBounds,
  computePanForZoomFocus,
  createDefaultBoardZoomByBoard,
  getBoardZoom,
  setBoardZoom,
  getRoomCenterForZoom,
  syncStageZoomTransform,
  syncBoardZoomStatus,
  syncBoardZoomPanel,
  syncPolygonHandleSizePanel,
  updateCurrentBoardZoom,
  scheduleZoomUpdate,
  fitZoomToActiveSpecialRoom,
  canStartPanModeFromEvent,
  isPanArbitrating,
  setPanCursorState,
  startPanMode,
  endPanMode,
  applyZoomScaleAroundClientPoint,
} = window.TT_BEAMER_RUNTIME_VIEWPORT_ZOOM;

if (stage) {
  stage.addEventListener(
    "wheel",
    (event) => {
      if (!event.target || !stage.contains(event.target)) return;
      event.preventDefault();
      const current = getBoardZoom(state.boardId);
      // Phase 13-HF1: halve the per-tick zoom step. A typical deltaY of 100
      // at 0.0009 gives exp(-0.09) ≈ 0.914 ≈ ~9% per tick.
      const step = Math.exp(-event.deltaY * 0.0009);
      const nextScale = current.scale * step;
      applyZoomScaleAroundClientPoint(
        nextScale,
        event.clientX,
        event.clientY,
        `Board zoom wheel -> ${Math.round(clampBoardZoomScale(nextScale) * 100)}%`,
      );
    },
    { passive: false },
  );

  // Phase 13-HF4: centralised touch gesture state machine.
  //
  // The stage intercepts touch/pen pointerdowns at CAPTURE phase so it
  // runs BEFORE the polygon/vertex/edge/room-area element handlers. It
  // arbitrates between pan, pinch, and press-and-hold drag. Mouse events
  // are untouched and still flow through the existing pointerdown
  // listeners on the polygon elements and the overlay pan handler.
  //
  // States:
  //   idle        -> no touch tracked
  //   tentative   -> one touch down, waiting to determine intent
  //   panning     -> committed single-finger pan
  //   pinching    -> two touches down, zoom
  //   drag        -> press-and-hold expired, polygon/vertex/room drag
  //                  committed through the existing drag handlers
  const TOUCH_HOLD_MS = 350;
  const TOUCH_MOVE_THRESHOLD_PX = 12;

  const touchGesture = {
    mode: "idle",
    primaryPointerId: null,
    primaryStartClientX: 0,
    primaryStartClientY: 0,
    primaryHitKind: "empty",
    primaryHitNode: null,
    primaryHitIndex: -1,
    primaryHitRoomId: null,
    holdTimerId: null,
    pinchPointers: new Map(),
    pinchLastDistance: 0,
  };

  function classifyTouchHitTarget(target) {
    if (!target?.closest) return { kind: "empty", node: null, index: -1, roomId: null };
    const node = target.closest(
      ".ship-polygon-vertex-hit-target, .ship-polygon-edge-hit-target, "
      + ".polygon-vertex-hit-target, .polygon-edge-hit-target, "
      + "polygon.room-zone",
    );
    if (!node) return { kind: "empty", node: null, index: -1, roomId: null };
    const indexAttr = Number(node.dataset?.vertexIndex ?? node.dataset?.edgeIndex);
    const index = Number.isFinite(indexAttr) ? indexAttr : -1;
    const roomId = node.dataset?.roomId ?? null;
    if (node.classList.contains("ship-polygon-vertex-hit-target")) {
      return { kind: "ship-vertex", node, index, roomId: null };
    }
    if (node.classList.contains("ship-polygon-edge-hit-target")) {
      return { kind: "ship-edge", node, index, roomId: null };
    }
    if (node.classList.contains("polygon-vertex-hit-target")) {
      return { kind: "room-vertex", node, index, roomId };
    }
    if (node.classList.contains("polygon-edge-hit-target")) {
      return { kind: "room-edge", node, index, roomId };
    }
    if (node.tagName === "polygon" && node.classList.contains("room-zone")) {
      return { kind: "room-area", node, index: -1, roomId: node.dataset?.roomId ?? null };
    }
    return { kind: "empty", node: null, index: -1, roomId: null };
  }

  function cancelActiveSingleFingerDragsForPinchTakeover() {
    try {
      if (state?.shipPolygonEditor?.dragVertexIndex !== null) {
        finishShipPolygonVertexDrag(null, { cancel: true });
      }
    } catch { /* best effort */ }
    try {
      if (state?.polygonEditor?.dragAreaPointerId !== null) {
        finishPolygonAreaDrag(null, { cancel: true });
      }
    } catch { /* best effort */ }
    try {
      if (state?.polygonEditor?.dragVertexIndex !== null) {
        finishPolygonVertexDrag(null, { cancel: true });
      }
    } catch { /* best effort */ }
    try {
      if (state?.panMode?.active === true) {
        endPanMode(null, { canceled: true });
      }
    } catch { /* best effort */ }
  }

  function touchGesturePinchDistance() {
    const pts = [...touchGesture.pinchPointers.values()];
    if (pts.length !== 2) return 0;
    return Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
  }
  function touchGesturePinchMidpoint() {
    const pts = [...touchGesture.pinchPointers.values()];
    if (pts.length !== 2) return { clientX: 0, clientY: 0 };
    return {
      clientX: (pts[0].clientX + pts[1].clientX) / 2,
      clientY: (pts[0].clientY + pts[1].clientY) / 2,
    };
  }

  function clearTouchHoldTimer() {
    if (touchGesture.holdTimerId !== null) {
      window.clearTimeout(touchGesture.holdTimerId);
      touchGesture.holdTimerId = null;
    }
  }

  function resetTouchGestureToIdle() {
    clearTouchHoldTimer();
    touchGesture.mode = "idle";
    touchGesture.primaryPointerId = null;
    touchGesture.primaryHitKind = "empty";
    touchGesture.primaryHitNode = null;
    touchGesture.primaryHitIndex = -1;
    touchGesture.primaryHitRoomId = null;
    touchGesture.pinchPointers.clear();
    touchGesture.pinchLastDistance = 0;
  }

  function startTouchPanFromPrimary() {
    if (touchGesture.mode === "panning") return;
    const zoom = getBoardZoom(state.boardId);
    if (zoom.scale <= 1 && state.uiView !== "settings") {
      // Settings view is a pre-condition for pan; outside settings we
      // still go to 'panning' but startPanMode will bail — harmless.
    }
    // Use a synthetic event object. startPanMode uses only clientX/Y,
    // pointerId, and pointerCapture.
    const syntheticEvent = {
      clientX: touchGesture.primaryStartClientX,
      clientY: touchGesture.primaryStartClientY,
      pointerId: touchGesture.primaryPointerId,
      pointerType: "touch",
      button: 0,
    };
    // startPanMode requires the pan pre-conditions be met. If scale<=1
    // it will no-op visually, but that's acceptable: mode flips but no
    // pan math runs until scale > 1. Users who touch-drag at scale 1
    // simply see no board movement.
    if (canStartPanModeFromEvent({ button: 1, pointerType: "touch" })) {
      try { roomOverlay.setPointerCapture(touchGesture.primaryPointerId); } catch { /* best effort */ }
      startPanMode(syntheticEvent, "touch");
    }
    touchGesture.mode = "panning";
  }

  function commitTouchHoldDrag() {
    // Hold timer fired without cancellation — activate polygon editing
    // on the primary hit target. Relies on the existing drag handlers'
    // state machinery. For room-area: the polygon pointerdown handler
    // was blocked at capture, so we call beginPendingPolygonAreaDrag
    // with a synthetic event.
    const kind = touchGesture.primaryHitKind;
    if (kind === "empty") {
      // Nothing to do — hold on empty just becomes a pan.
      startTouchPanFromPrimary();
      return;
    }
    const syntheticEvent = {
      clientX: touchGesture.primaryStartClientX,
      clientY: touchGesture.primaryStartClientY,
      pointerId: touchGesture.primaryPointerId,
      pointerType: "touch",
      button: 0,
      preventDefault() {},
      stopPropagation() {},
    };
    try {
      if (kind === "ship-vertex" && touchGesture.primaryHitIndex >= 0) {
        beginShipPolygonVertexDrag(syntheticEvent, touchGesture.primaryHitIndex);
      } else if (kind === "room-vertex" && touchGesture.primaryHitIndex >= 0 && touchGesture.primaryHitRoomId) {
        // Phase 13-HF10: ensure the target room is selected + the
        // editor handles for that room are freshly rendered BEFORE
        // beginPolygonVertexDrag caches HF9 DOM refs, otherwise refs
        // point to the previously-selected room's handles or none.
        const roomId = touchGesture.primaryHitRoomId;
        state.selectedRoomId = roomId;
        state.selectedRoomByBoard[state.boardId] = roomId;
        setActivePolygonRoomId(state.boardId, roomId);
        state.polygonEditor.selectedVertexIndex = touchGesture.primaryHitIndex;
        state.polygonEditor.selectedEdgeIndex = touchGesture.primaryHitIndex;
        state.polygonEditor.vertexSelectionActive = true;
        syncPolygonRoomSelection(roomId);
        syncPolygonVertexSelect(roomId);
        syncPolygonEdgeSelect(roomId);
        syncPolygonEditorPanel();
        syncRoomPanelFromSelection({ preserveDraftState: true });
        renderRoomOverlay();
        beginPolygonVertexDrag(syntheticEvent, roomId, touchGesture.primaryHitIndex);
      } else if (kind === "room-area" && touchGesture.primaryHitRoomId) {
        // Select the room first (so the polygon-area drag has context).
        state.selectedRoomId = touchGesture.primaryHitRoomId;
        state.selectedRoomByBoard[state.boardId] = touchGesture.primaryHitRoomId;
        syncPolygonRoomSelection(touchGesture.primaryHitRoomId);
        syncPolygonEditorPanel();
        syncRoomPanelFromSelection({ preserveDraftState: true });
        // Phase 13-HF10: render BEFORE begin (same rationale).
        renderRoomOverlay();
        beginPendingPolygonAreaDrag(syntheticEvent, touchGesture.primaryHitRoomId);
      } else {
        // Unknown kind (ship-edge, room-edge) - fall back to pan.
        startTouchPanFromPrimary();
        return;
      }
      touchGesture.mode = "drag";
    } catch (error) {
      console.warn("[touch-gesture] commit drag failed:", error?.message || error);
      startTouchPanFromPrimary();
    }
  }

  stage.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      // Stop the existing polygon/room/overlay pointerdown handlers from
      // reacting to this touch — we route everything through this state
      // machine so press-and-hold semantics are consistent.
      event.stopImmediatePropagation();
      event.preventDefault?.();

      // Second pointer — enter pinch no matter the previous state.
      if (touchGesture.pinchPointers.size === 1 && touchGesture.primaryPointerId !== event.pointerId) {
        clearTouchHoldTimer();
        cancelActiveSingleFingerDragsForPinchTakeover();
        touchGesture.pinchPointers.set(event.pointerId, {
          clientX: event.clientX,
          clientY: event.clientY,
        });
        touchGesture.pinchLastDistance = touchGesturePinchDistance();
        touchGesture.mode = "pinching";
        return;
      }

      // First pointer — enter tentative state.
      if (touchGesture.mode === "idle" || touchGesture.mode === "panning") {
        resetTouchGestureToIdle();
        // Phase 13-HF6: refresh the stage geometry cache ONCE at the
        // start of a gesture. All subsequent pan/pinch math reads from
        // the cache — no forced reflows in pointermove.
        refreshStageGeometryCache();
        // Phase 13-HF6: flag gesture active so heavy DOM-read paths
        // skip their work for the duration of the gesture.
        touchGestureActive = true;
        stage.classList.add("is-touch-gesture");
        // Phase 13-HF7: kill any in-flight live-sync poll timer so the
        // ~20 ms applyLiveRuntimeSnapshot hit cannot land inside the
        // gesture's rAF window. scheduleNextLiveSnapshotPoll is now
        // also gated on touchGestureActive so re-scheduling no-ops.
        try {
          if (liveSync?.pollTimerId !== null && liveSync?.pollTimerId !== undefined) {
            window.clearTimeout(liveSync.pollTimerId);
            liveSync.pollTimerId = null;
          }
        } catch { /* best effort */ }
        touchGesture.mode = "tentative";
        touchGesture.primaryPointerId = event.pointerId;
        touchGesture.primaryStartClientX = event.clientX;
        touchGesture.primaryStartClientY = event.clientY;
        const hit = classifyTouchHitTarget(event.target);
        touchGesture.primaryHitKind = hit.kind;
        touchGesture.primaryHitNode = hit.node;
        touchGesture.primaryHitIndex = hit.index;
        touchGesture.primaryHitRoomId = hit.roomId;
        touchGesture.pinchPointers.set(event.pointerId, {
          clientX: event.clientX,
          clientY: event.clientY,
        });
        touchGesture.holdTimerId = window.setTimeout(() => {
          touchGesture.holdTimerId = null;
          if (touchGesture.mode !== "tentative") return;
          commitTouchHoldDrag();
        }, TOUCH_HOLD_MS);
      }
    },
    { capture: true },
  );

  stage.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      if (!touchGesture.pinchPointers.has(event.pointerId)) return;
      touchGesture.pinchPointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });

      if (touchGesture.mode === "pinching" && touchGesture.pinchPointers.size === 2) {
        const distance = touchGesturePinchDistance();
        if (touchGesture.pinchLastDistance <= 0) {
          touchGesture.pinchLastDistance = distance;
          return;
        }
        const ratio = distance / touchGesture.pinchLastDistance;
        if (!Number.isFinite(ratio) || ratio <= 0) return;
        touchGesture.pinchLastDistance = distance;
        const midpoint = touchGesturePinchMidpoint();
        const current = getBoardZoom(state.boardId);
        applyZoomScaleAroundClientPoint(
          current.scale * ratio,
          midpoint.clientX,
          midpoint.clientY,
          `Board zoom pinch -> ${Math.round(clampBoardZoomScale(current.scale * ratio) * 100)}%`,
        );
        return;
      }

      if (touchGesture.mode === "tentative" && event.pointerId === touchGesture.primaryPointerId) {
        const dx = event.clientX - touchGesture.primaryStartClientX;
        const dy = event.clientY - touchGesture.primaryStartClientY;
        if (Math.hypot(dx, dy) > TOUCH_MOVE_THRESHOLD_PX) {
          clearTouchHoldTimer();
          startTouchPanFromPrimary();
        }
      }
    },
    { capture: true },
  );

  function endTouchGestureForPointer(event) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    touchGesture.pinchPointers.delete(event.pointerId);

    if (event.pointerId === touchGesture.primaryPointerId) {
      clearTouchHoldTimer();
      if (touchGesture.mode === "panning") {
        try { endPanMode(null, { canceled: false }); } catch { /* best effort */ }
      }
      if (touchGesture.mode === "drag") {
        // Existing drag finish handlers (on the overlay) capture pointerup
        // on the captured pointer. Here we just drop state so this stage
        // state machine returns to idle.
      }
      touchGesture.primaryPointerId = null;
    }

    if (touchGesture.mode === "pinching" && touchGesture.pinchPointers.size < 2) {
      touchGesture.mode = "idle";
      touchGesture.pinchLastDistance = 0;
      touchGesture.pinchPointers.clear();
    }
    if (touchGesture.pinchPointers.size === 0) {
      resetTouchGestureToIdle();
      // Phase 13-HF6: clear gesture-active flag and refresh the status
      // line once the user has lifted all fingers. Also flush any
      // pending rAF update synchronously so the final frame reflects
      // the last pointer position, not the penultimate one.
      touchGestureActive = false;
      stage.classList.remove("is-touch-gesture");
      setPanCursorState();
      // Phase 13-HF7: resume live-sync polling immediately so the
      // client catches up on any state changes that happened during
      // the gesture.
      try { scheduleNextLiveSnapshotPoll(0); } catch { /* best effort */ }
    }
  }
  stage.addEventListener("pointerup", endTouchGestureForPointer, { capture: true });
  stage.addEventListener("pointercancel", endTouchGestureForPointer, { capture: true });
  // Phase 13-HF5: do NOT end gestures on pointerleave. On mobile the
  // browser can briefly fire pointerleave when the finger crosses the
  // stage bounds while panning, and the previous behaviour cancelled
  // the pan after a few pixels. Pointer capture keeps pointermove
  // events coming regardless, so leaving the hit box is safe.

  // Phase 13-HF5: long-press on a mobile browser fires a contextmenu
  // event for images; blocking it prevents the native "image options"
  // popup from taking over the press-and-hold room-selection gesture.
  stage.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}

function deleteSelectedPolygonVertex() {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan active - polygon edit paused";
    return false;
  }
  if (!areRoomVerticesEditable()) {
    triggerFeedback.textContent = "Status: Room vertices hidden - polygon edit paused";
    return false;
  }
  const roomId = getActivePolygonRoomId(state.boardId);
  if (!roomId) {
    return false;
  }
  const points = getSpecialPolygonPoints(state.boardId, roomId);
  if (points.length <= 3) {
    triggerFeedback.textContent = "Status: Polygon requires at least 3 vertices";
    return false;
  }
  const index = Math.max(0, Math.min(points.length - 1, state.polygonEditor.selectedVertexIndex));
  points.splice(index, 1);
  setSpecialPolygonPoints(state.boardId, roomId, points);
  const persisted = persistBoardProfiles();
  state.polygonEditor.selectedVertexIndex = Math.max(0, Math.min(index, points.length - 1));
  state.polygonEditor.selectedEdgeIndex = state.polygonEditor.selectedVertexIndex;
  state.polygonEditor.vertexSelectionActive = true;
  syncPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? "Status: Polygon vertex deleted"
    : "Status: Polygon vertex deleted (persistence failed)";
  return persisted;
}


// Phase 14-2: polygon editor + play area event binders moved to
// src/app/runtime/runtime-wire-polygon-editor-binders.js.
window.TT_BEAMER_RUNTIME_WIRE_POLYGON_EDITOR_BINDERS.wirePolygonEditorBinders({
  state,
  polygonHandleSizeInput,
  boardZoomFitButton,
  boardZoomResetButton,
  polygonRoomSelect,
  showRoomVerticesInput,
  showPlayAreaVerticesInput,
  polygonVertexSelect,
  polygonEdgeSelect,
  polygonInsertVertexButton,
  polygonDeleteVertexButton,
  polygonResetRoomButton,
  polygonFocusRoomButton,
  playAreaSelect,
  playAreaNameInput,
  playAreaCreateButton,
  playAreaDeleteButton,
  shipPolygonVertexSelect,
  shipPolygonEdgeSelect,
  shipPolygonInsertVertexButton,
  shipPolygonDeleteVertexButton,
  shipPolygonResetButton,
  SHIP_POLYGON_DEFAULT,
  BOARD_ZOOM_DEFAULT,
  triggerFeedback,
  clampPolygonHandleScale: (v) => clampPolygonHandleScale(v),
  normalizePolygonPoint: (p) => normalizePolygonPoint(p),
  normalizeShipPolygon: (points) => normalizeShipPolygon(points),
  normalizePlayAreaId: (id, idx) => normalizePlayAreaId(id, idx),
  syncPolygonHandleSizePanel: () => syncPolygonHandleSizePanel(),
  syncPolygonEditorStatus: () => syncPolygonEditorStatus(),
  syncShipPolygonEditorStatus: () => syncShipPolygonEditorStatus(),
  syncPolygonEditorPanel: () => syncPolygonEditorPanel(),
  syncShipPolygonEditorPanel: () => syncShipPolygonEditorPanel(),
  syncRoomPanelFromSelection: (opts) => syncRoomPanelFromSelection(opts),
  syncPolygonEdgeSelect: (roomId) => syncPolygonEdgeSelect(roomId),
  syncShipPolygonEdgeSelect: () => syncShipPolygonEdgeSelect(),
  renderRoomOverlay: () => renderRoomOverlay(),
  endPanMode: (e, o) => endPanMode(e, o),
  fitZoomToActiveSpecialRoom: () => fitZoomToActiveSpecialRoom(),
  setPanCursorState: () => setPanCursorState(),
  updateCurrentBoardZoom: (zoom, reason) => updateCurrentBoardZoom(zoom, reason),
  getBoardZoom: (boardId) => getBoardZoom(boardId),
  getRoomCenterForZoom: (boardId, roomId) => getRoomCenterForZoom(boardId, roomId),
  computePanForZoomFocus: (scale, center) => computePanForZoomFocus(scale, center),
  syncPolygonRoomSelection: (roomId) => syncPolygonRoomSelection(roomId),
  areRoomVerticesEditable: () => areRoomVerticesEditable(),
  arePlayAreaVerticesEditable: () => arePlayAreaVerticesEditable(),
  finishPolygonVertexDrag: (e, o) => finishPolygonVertexDrag(e, o),
  finishPolygonAreaDrag: (e, o) => finishPolygonAreaDrag(e, o),
  finishShipPolygonVertexDrag: (e, o) => finishShipPolygonVertexDrag(e, o),
  getActivePolygonRoomId: (boardId) => getActivePolygonRoomId(boardId),
  isPanArbitrating: () => isPanArbitrating(),
  resolvePolygonEditingRoomId: (boardId) => resolvePolygonEditingRoomId(boardId),
  getSpecialPolygonPoints: (boardId, roomId) => getSpecialPolygonPoints(boardId, roomId),
  setSpecialPolygonPoints: (boardId, roomId, points) => setSpecialPolygonPoints(boardId, roomId, points),
  getShipPolygonPoints: (boardId) => getShipPolygonPoints(boardId),
  setShipPolygonPoints: (boardId, points) => setShipPolygonPoints(boardId, points),
  persistBoardProfiles: () => persistBoardProfiles(),
  getDefaultRoomPolygon: (boardId, roomId) => getDefaultRoomPolygon(boardId, roomId),
  setSelectedPlayAreaId: (boardId, id) => setSelectedPlayAreaId(boardId, id),
  getPlayAreas: (boardId) => getPlayAreas(boardId),
  getSelectedPlayAreaId: (boardId) => getSelectedPlayAreaId(boardId),
  getSelectedPlayArea: (boardId) => getSelectedPlayArea(boardId),
  setPlayAreas: (boardId, areas, opts) => setPlayAreas(boardId, areas, opts),
  deleteSelectedPolygonVertex: () => deleteSelectedPolygonVertex(),
});

// Phase 14-2: room/inside/outside FX panel event binders moved to
// src/app/runtime/runtime-wire-fx-panel-binders.js.
window.TT_BEAMER_RUNTIME_WIRE_FX_PANEL_BINDERS.wireFxPanelBinders({
  state,
  roomAnimationSettingsCreateButton,
  roomAnimationSettingsSelect,
  roomAnimationSettingsDeleteButton,
  roomAnimationSettingsNameInput,
  roomAssetTypeInput,
  roomAssetRefInput,
  roomResourceSelect,
  roomApplyChangesButton,
  insideAnimationCreateButton,
  insideAnimationNameInput,
  insideAnimationSelect,
  insideIntensityInput,
  insideIntensityValue,
  insideSpeedInput,
  insideSpeedValue,
  insideAssetTypeInput,
  insideAssetRefInput,
  insideLoopUntilStopInput,
  insideApplyChangesButton,
  outsideEnabledInput,
  outsideAnimationCreateButton,
  outsideAnimationNameInput,
  outsideAnimationSelect,
  outsideIntensityInput,
  outsideIntensityValue,
  outsideSpeedInput,
  outsideSpeedValue,
  outsideModeInput,
  outsideDirectionInput,
  outsideAssetTypeInput,
  outsideAssetRefInput,
  outsideApplyChangesButton,
  triggerFeedback,
  roomEditorDraftByBoard,
  insideEditorDraftByBoard,
  outputRole,
  OUTPUT_ROLE_CONTROL,
  getRoomFxProfile,
  setRoomFxProfile,
  getInsideFxProfile,
  setInsideFxProfile,
  getOutsideFxProfile,
  setOutsideFxProfile,
  updateOutsideFxProfile,
  createRoomAnimationDefinition,
  createInsideAnimationDefinition,
  createOutsideAnimationDefinition,
  normalizeRoomAnimationId,
  normalizeInsideAnimationId,
  normalizeOutsideAnimationId,
  normalizeRoomAssetType,
  normalizeInsideAssetType,
  normalizeRoomAssetRefForType,
  normalizeInsideAssetRefForType,
  normalizeOutsideMode: (v) => normalizeOutsideMode(v),
  normalizeOutsideDirection: (v) => normalizeOutsideDirection(v),
  normalizeRoomFxProfile,
  clampOutsideIntensity: (v) => clampOutsideIntensity(v),
  clampOutsideSpeed: (v) => clampOutsideSpeed(v),
  setRoomEditorDraft,
  setInsideEditorDraft,
  setOutsideEditorDraft,
  collectRoomEditorDraftFromInputs,
  collectInsideEditorDraftFromInputs,
  collectOutsideEditorDraftFromInputs,
  buildInsideProfileWithSelectedAnimationPatch,
  buildOutsideProfileWithSelectedAnimationPatch,
  syncRoomFxPanel,
  syncInsideFxPanel,
  syncOutsideFxPanel,
  syncRoomResourcePicker,
  syncInsideResourcePicker,
  syncOutsideDraftVisibilityFromInputs,
  syncOutsideRuntimeMirror,
  persistBoardProfiles: () => persistBoardProfiles(),
  renderRunningAnimationsList: () => renderRunningAnimationsList(),
  refreshGlobalButtons: () => refreshGlobalButtons(),
  emitLiveMutation: (type, payload) => emitLiveMutation(type, payload),
  emitOutsideFxMutation: (boardId, reason) => emitOutsideFxMutation(boardId, reason),
});

roomOverlay.addEventListener("pointermove", (event) => {
  if (state.panMode.active) {
    if (state.panMode.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - state.panMode.startClientX;
    const deltaY = event.clientY - state.panMode.startClientY;
    // Phase 13-HF5: rAF-throttle. Coalesces many same-frame pointermove
    // updates into one DOM write per animation frame on mobile.
    scheduleZoomUpdate({
      panX: state.panMode.startPanX + deltaX,
      panY: state.panMode.startPanY + deltaY,
    });
    return;
  }
  if (state.shipPolygonEditor.dragVertexIndex !== null && state.uiView === "settings") {
    if (!arePlayAreaVerticesEditable()) {
      finishShipPolygonVertexDrag(event, { cancel: true });
      return;
    }
    if (state.shipPolygonEditor.dragPointerId !== event.pointerId) {
      return;
    }
    const boardId = state.shipPolygonEditor.dragBoardId;
    const points = getShipPolygonPoints(boardId);
    const [pointerX, pointerY] = getNormalizedOverlayPoint(event);
    // Phase 13-HF12: clamp to visible board edge [0, 1] so the ship
    // vertex cannot escape the rendered area. Ship polygon has no
    // transform today, so display == raw.
    const nextX = clampDisplayNormalizedCoordinate(
      pointerX + (state.shipPolygonEditor.dragVertexOffsetX || 0),
    );
    const nextY = clampDisplayNormalizedCoordinate(
      pointerY + (state.shipPolygonEditor.dragVertexOffsetY || 0),
    );
    points[state.shipPolygonEditor.dragVertexIndex] = [nextX, nextY];
    setShipPolygonPoints(boardId, points);
    state.shipPolygonEditor.dragMoved = true;
    // Phase 13-HF12: ship polygon has no transform, so display == raw
    // × 1000. Compute once inline and pass to the writer.
    const shipRaw = getShipPolygonPoints(boardId);
    const shipOverlay = shipRaw.map(([x, y]) => [x * 1000, y * 1000]);
    applyIncrementalShipDrag(state.shipPolygonEditor.dragDomRefs, shipOverlay);
    syncShipPolygonEditorStatus();
    return;
  }
  maybePromotePendingPolygonAreaDrag(event);
  if (state.polygonEditor.dragAreaPointerId !== null && state.uiView === "settings") {
    if (!areRoomVerticesEditable()) {
      finishPolygonAreaDrag(event, { cancel: true });
      return;
    }
    if (state.polygonEditor.dragAreaPointerId !== event.pointerId) {
      return;
    }
    const roomId = state.polygonEditor.dragAreaRoomId;
    const boardId = state.polygonEditor.dragAreaBoardId;
    const startPoints = state.polygonEditor.dragAreaStartPoints;
    const startPointer = state.polygonEditor.dragAreaStartPointerPoint;
    if (!roomId || !boardId || !Array.isArray(startPoints) || !Array.isArray(startPointer)) {
      return;
    }
    const [currentX, currentY] = getNormalizedOverlayPoint(event);
    const [startX, startY] = startPointer;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    const moved = Math.hypot(deltaX, deltaY) >= 0.0005;
    const shifted = startPoints.map(([x, y]) => [
      clampRoomAbsoluteCoordinate(x + deltaX),
      clampRoomAbsoluteCoordinate(y + deltaY),
    ]);
    setSpecialPolygonPoints(boardId, roomId, shifted);
    state.polygonEditor.dragAreaMoved = state.polygonEditor.dragAreaMoved || moved;
    // Phase 13-HF12: area drag recomposes all points by the same delta,
    // so the live centroid shifts by the same delta and getRoomPoints
    // produces `old + delta` for every vertex. No frozen transform
    // needed — just recompute from the mutated room state.
    const areaBoard = getBoard(boardId);
    const areaRoom = areaBoard?.rooms?.find((entry) => entry.id === roomId);
    if (areaRoom) {
      applyIncrementalRoomDrag(
        state.polygonEditor.dragAreaDomRefs,
        getRoomPoints(areaRoom, boardId),
      );
    }
    syncPolygonEditorStatus();
    return;
  }
  if (state.polygonEditor.dragVertexIndex === null || state.uiView !== "settings") {
    return;
  }
  if (!areRoomVerticesEditable()) {
    finishPolygonVertexDrag(event, { cancel: true });
    return;
  }
  if (state.polygonEditor.dragPointerId !== event.pointerId) {
    return;
  }
  const roomId = state.polygonEditor.dragRoomId;
  const boardId = state.polygonEditor.dragBoardId;
  if (!roomId) {
    return;
  }
  const vertexBoard = getBoard(boardId);
  const vertexRoom = vertexBoard?.rooms?.find((entry) => entry.id === roomId);
  if (!vertexRoom) {
    return;
  }
  const [pointerX, pointerY] = getNormalizedOverlayPoint(event);
  // Phase 13-HF13: next display position = pointer + grab-offset,
  // clamped to visible board [0, 1]. Vertex stops at the board edge
  // instead of escaping via clampRoomAbsoluteCoordinate([-0.2, 1.2]).
  const nextDisplayX = clampDisplayNormalizedCoordinate(
    pointerX + (state.polygonEditor.dragVertexOffsetX || 0),
  );
  const nextDisplayY = clampDisplayNormalizedCoordinate(
    pointerY + (state.polygonEditor.dragVertexOffsetY || 0),
  );
  // Phase 13-HF13: invert the live (stable, anchored) room transform
  // to produce the raw value that renders to exactly nextDisplay.
  const [rawNextX, rawNextY] = projectDisplayNormalizedToRoomRaw(
    nextDisplayX, nextDisplayY, vertexRoom, boardId,
  );
  const points = getSpecialPolygonPoints(boardId, roomId);
  points[state.polygonEditor.dragVertexIndex] = [rawNextX, rawNextY];
  setSpecialPolygonPoints(boardId, roomId, points);
  state.polygonEditor.dragMoved = true;
  // Phase 13-HF13: render via the live transform pipeline. Because
  // the stretch anchor (inside getRoomTransform) is session-stable,
  // non-dragged vertices map to the same display position they had
  // at drag start on every frame — no frozen snapshot needed.
  applyIncrementalRoomDrag(
    state.polygonEditor.dragDomRefs,
    getRoomPoints(vertexRoom, boardId),
  );
  syncPolygonEditorStatus();
});

roomOverlay.addEventListener("pointerup", (event) => {
  if (state.panMode.active && state.panMode.pointerId === event.pointerId) {
    endPanMode(event, { canceled: false });
    return;
  }
  if (
    state.shipPolygonEditor.dragVertexIndex !== null &&
    state.shipPolygonEditor.dragPointerId === event.pointerId
  ) {
    finishShipPolygonVertexDrag(event, { cancel: false });
    return;
  }
  if (
    state.polygonEditor.dragAreaPointerId !== null &&
    state.polygonEditor.dragAreaPointerId === event.pointerId
  ) {
    finishPolygonAreaDrag(event, { cancel: false });
    preserveRoomSelectionAfterPointerLifecycle();
    return;
  }
  if (state.polygonEditor.pendingAreaPointerId === event.pointerId) {
    clearPendingPolygonAreaDragSession();
    preserveRoomSelectionAfterPointerLifecycle();
    return;
  }
  if (
    state.polygonEditor.dragVertexIndex === null ||
    state.polygonEditor.dragPointerId !== event.pointerId
  ) {
    return;
  }
  finishPolygonVertexDrag(event, { cancel: false });
  preserveRoomSelectionAfterPointerLifecycle();
});

roomOverlay.addEventListener("pointercancel", (event) => {
  if (state.panMode.active && state.panMode.pointerId === event.pointerId) {
    endPanMode(event, { canceled: true });
    return;
  }
  if (state.shipPolygonEditor.dragPointerId === event.pointerId) {
    finishShipPolygonVertexDrag(event, { cancel: true });
    return;
  }
  if (state.polygonEditor.dragAreaPointerId === event.pointerId) {
    finishPolygonAreaDrag(event, { cancel: true });
    return;
  }
  if (state.polygonEditor.pendingAreaPointerId === event.pointerId) {
    clearPendingPolygonAreaDragSession();
    return;
  }
  if (state.polygonEditor.dragPointerId !== event.pointerId) {
    return;
  }
  finishPolygonVertexDrag(event, { cancel: true });
});

roomOverlay.addEventListener("pointerdown", (event) => {
  if (!canStartPanModeFromEvent(event)) {
    return;
  }
  // Phase 13-HF2: single-finger touch pan only takes over when the touch
  // landed on the empty overlay — not on a vertex/edge/area hit target.
  // Those hit elements stop propagation during their own pointerdown, so
  // if this listener receives the event, it's a safe empty-area touch.
  const pointerType = String(event.pointerType || "").toLowerCase();
  const isTouchPointer = pointerType === "touch" || pointerType === "pen";
  clearPendingPolygonAreaDragSession();
  if (state.shipPolygonEditor.dragVertexIndex !== null) {
    finishShipPolygonVertexDrag(event, { cancel: true });
  }
  if (state.polygonEditor.dragAreaPointerId !== null) {
    finishPolygonAreaDrag(event, { cancel: true });
  }
  if (state.polygonEditor.dragVertexIndex !== null) {
    finishPolygonVertexDrag(event, { cancel: true });
  }
  event.preventDefault();
  event.stopPropagation();
  const trigger = isTouchPointer
    ? "touch"
    : event.button === 1
      ? "middle"
      : "space";
  startPanMode(event, trigger);
});

roomOverlay.addEventListener("click", (event) => {
  if (performance.now() < (state.polygonEditor.suppressRoomClickUntil || 0)) {
    return;
  }
  if (event.target !== roomOverlay) {
    return;
  }
  if (isPanArbitrating()) {
    return;
  }
  if (
    state.polygonEditor.dragVertexIndex !== null ||
    state.polygonEditor.dragAreaPointerId !== null ||
    state.shipPolygonEditor.dragVertexIndex !== null ||
    state.polygonEditor.pendingAreaPointerId !== null
  ) {
    return;
  }
  clearSelectedRoomSelection("Room management: selection cleared (empty board click)");
});

document.addEventListener("keydown", (event) => {
  if (state.uiView === "settings" && outputRole === OUTPUT_ROLE_CONTROL && !event.defaultPrevented) {
    const key = String(event.key || "").toLowerCase();
    const modifierPressed = event.ctrlKey || event.metaKey;
    const typingTarget = isTypingShortcutTarget(event.target);
    const playAreaContext = isPlayAreaShortcutContext(event.target);
    if (!typingTarget && !playAreaContext && modifierPressed && !event.altKey && !event.shiftKey && key === "c") {
      event.preventDefault();
      copySelectedRoomToClipboard();
      return;
    }
    if (!typingTarget && !playAreaContext && modifierPressed && !event.altKey && !event.shiftKey && key === "v") {
      event.preventDefault();
      pasteRoomFromClipboard();
      return;
    }
    if (
      !typingTarget &&
      !playAreaContext &&
      !modifierPressed &&
      !event.altKey &&
      (key === "delete" || event.code === "Delete")
    ) {
      event.preventDefault();
      const shouldDeleteVertex =
        state.polygonEditor.vertexSelectionActive &&
        areRoomVerticesEditable() &&
        Boolean(getActivePolygonRoomId(state.boardId));
      if (shouldDeleteVertex) {
        deleteSelectedPolygonVertex();
      } else {
        deleteSelectedRoom();
      }
      return;
    }
  }
  if (event.code === "Space") {
    if (event.repeat) {
      return;
    }
    state.panMode.spacePressed = true;
    if (state.polygonEditor.dragVertexIndex !== null) {
      finishPolygonVertexDrag(null, { cancel: true });
    }
    if (state.polygonEditor.dragAreaPointerId !== null) {
      finishPolygonAreaDrag(null, { cancel: true });
    }
    if (state.polygonEditor.pendingAreaPointerId !== null) {
      clearPendingPolygonAreaDragSession();
    }
    if (state.shipPolygonEditor.dragVertexIndex !== null) {
      finishShipPolygonVertexDrag(null, { cancel: true });
    }
    setPanCursorState();
    return;
  }
  if (event.key === "Escape") {
    if (state.polygonEditor.dragVertexIndex !== null) {
      finishPolygonVertexDrag(null, { cancel: true });
      return;
    }
    if (state.polygonEditor.dragAreaPointerId !== null) {
      finishPolygonAreaDrag(null, { cancel: true });
      return;
    }
    if (state.shipPolygonEditor.dragVertexIndex !== null) {
      finishShipPolygonVertexDrag(null, { cancel: true });
    }
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code !== "Space") {
    return;
  }
  state.panMode.spacePressed = false;
  if (state.panMode.active && state.panMode.trigger === "space") {
    endPanMode(null, { canceled: false });
  } else {
    setPanCursorState();
  }
});

window.addEventListener("blur", () => {
  state.panMode.spacePressed = false;
  if (state.shipPolygonEditor.dragVertexIndex !== null) {
    finishShipPolygonVertexDrag(null, { cancel: true });
  }
  if (state.polygonEditor.dragAreaPointerId !== null) {
    finishPolygonAreaDrag(null, { cancel: true });
  }
  if (state.polygonEditor.pendingAreaPointerId !== null) {
    clearPendingPolygonAreaDragSession();
  }
  endPanMode(null, { canceled: true });
  resetClearAllGuard();
  clearAllQuickModeInflight();
  setPanCursorState();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    liveSync.preferFastPollingUntil = Date.now() + 2000;
    scheduleNextLiveSnapshotPoll(0);
    return;
  }
  scheduleNextLiveSnapshotPoll();
});

window.addEventListener("orientationchange", () => {
  scheduleStageViewportLifecycle("orientationchange");
  syncDashboardZoneVisibility();
  syncMobileStickyOffsets();
  const orientationOk = runOrientationStateRegression();
  const navigationOk = runNavigationStateRegression();
  const projectionOk = runMobileProjectionVisibilityGuard({ context: "orientationchange" });
  const ok = orientationOk && navigationOk && projectionOk;
  triggerFeedback.textContent = ok
    ? "Status: Orientation changed, UI state/navigation/board visibility stable"
    : "Status: Orientation guard detected drift in state, navigation, or board visibility";
});

window.addEventListener("resize", () => {
  scheduleStageViewportLifecycle("window-resize");
});

document.addEventListener("fullscreenchange", () => {
  scheduleStageViewportLifecycle("fullscreenchange");
});

window.addEventListener(
  "scroll",
  () => {
    syncMobileStickyOffsets();
    const navigationOk = validateViewNavigationVisibility({ silent: true, context: "scroll" });
    const projectionOk = runMobileProjectionVisibilityGuard({ silent: true, context: "scroll" });
    if (!navigationOk || !projectionOk) {
      triggerFeedback.textContent =
        "Status: Scroll guard detected navigation/board overlap in mobile layout";
    }
  },
  { passive: true },
);

document.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("button[data-global]") : null;
  if (!button) {
    return;
  }
  const type = button.dataset.global;
  if (shouldSuppressRapidTap(`global-${type}`)) {
    return;
  }
  recordTriggerIntent();
  setDashboardZone("trigger");
  const loopUntilStopped = Boolean(dashboardGlobalLoopUntilStopInput?.checked);
  const playSound = dashboardGlobalPlaySoundInput ? dashboardGlobalPlaySoundInput.checked : true;
  upsertGlobalAnimation(type, GLOBAL_ONE_SHOT_DURATION_SEC, { loopUntilStopped, playSound });
});

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

// Phase 13-1: Save-to-global and Load-and-apply buttons removed. Every
// mutation already writes to the server via debounced persistBoardProfiles,
// so explicit save is redundant. Load-and-apply is subsumed by the blocking
// startup hydration and the live-sync `global-config-update` broadcast
// refetch. Export download is preserved. Import-from-file is new.

exportGlobalDefaultsButton?.addEventListener("click", () => {
  const fileName = downloadGlobalDefaultsFallback();
  if (globalDefaultsStatus) {
    globalDefaultsStatus.textContent = `Global config: exported (${fileName})`;
  }
  triggerFeedback.textContent = `Status: Config exported to ${fileName}`;
});

// Phase 13-1: Import-from-file. User picks a JSON backup, client POSTs it
// to /api/global-defaults (overwrites server config atomically), server
// broadcasts, all clients (including this one) refetch and apply.
function wireImportGlobalDefaultsButton() {
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
}
wireImportGlobalDefaultsButton();

// Phase 13-HF3: Apply / Discard buttons and beforeunload guard.
function wireApplyDiscardGlobalConfigButtons() {
  const applyButton = document.getElementById("apply-global-config");
  const discardButton = document.getElementById("discard-global-config");
  if (applyButton) {
    applyButton.addEventListener("click", async () => {
      applyButton.disabled = true;
      const result = await applyLocalConfigToServer();
      if (!result.ok) {
        // Re-enable so the user can retry.
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
}
wireApplyDiscardGlobalConfigButtons();

// Phase 13-HF3: browser-native "Leave site?" prompt when local changes
// are unsaved. Modern browsers show a generic, non-customizable dialog.
window.addEventListener("beforeunload", (event) => {
  if (!state.localConfigDirty) return undefined;
  event.preventDefault();
  // Legacy browsers honor the returnValue string. Modern browsers show a
  // generic "Leave site? Changes you made may not be saved." prompt.
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

const resizeObserver = new ResizeObserver((entries) => {
  void entries;
  scheduleStageViewportLifecycle("resize-observer");
});

resizeObserver.observe(stage);
if (projectionArea) {
  resizeObserver.observe(projectionArea);
}
bindDevicePixelRatioWatcher();
scheduleStageViewportLifecycle("startup-bind");

function syncRuntimePanelsFromState() {
  const runtimePanelsApi = window.TT_BEAMER_RUNTIME_PANELS ?? window.TT_BEAMER_UI_RUNTIME_PANELS ?? null;
  if (!runtimePanelsApi || typeof runtimePanelsApi.syncRuntimePanelsFromState !== "function") {
    logBootstrap.warn("runtime_panels_missing", {
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
    syncMp4PerformanceControlsPanel,
  });
  syncMp4PerformanceControlsPanel();
}

async function initializeApplication() {
  logBootstrap.info("init_start", { event: "init-start" });
  await loadExternalBoardZones();
  await loadOutsideResourceAssets();
  syncBoardSelectOptions();
  const zoneFallbackCount = Object.values(state.zoneLoader.classificationByBoard).filter(
    (entry) => entry && entry !== "ZONE_LOADED",
  ).length;
  if (zoneFallbackCount > 0) {
    triggerFeedback.textContent =
      `Status: Zone fallback active (${zoneFallbackCount} board) - see zone-source status in Settings panel`;
  }
  if (!state.boardId || !BOARDS.some((board) => board.id === state.boardId)) {
    state.boardId = BOARDS[0]?.id ?? "";
  }
  state.hitareaCalibrationByBoard = createDefaultHitareaCalibrationMap();
  state.roomTombstonesByBoard = createDefaultRoomTombstonesByBoard();
  state.roomGeometryByBoard = createDefaultRoomGeometryByBoard();
  state.roomStateProfilesByBoard = createDefaultRoomStateProfilesByBoard();
  state.specialPolygonsByBoard = createDefaultSpecialPolygonsByBoard();
  state.playAreasByBoard = createDefaultPlayAreasByBoard();
  state.selectedPlayAreaIdByBoard = createDefaultSelectedPlayAreaIdByBoard();
  state.shipPolygonsByBoard = Object.fromEntries(
    BOARDS.map((board) => [board.id, getShipPolygonPoints(board.id)]),
  );
  state.insideFxByBoard = createDefaultInsideFxByBoard();
  state.roomFxByBoard = createDefaultRoomFxByBoard();
  state.outsideFxByBoard = createDefaultOutsideFxByBoard();
  state.boardZoomByBoard = createDefaultBoardZoomByBoard();
  state.quickMode = {
    mode: normalizeQuickMode(state.quickMode?.mode),
    inflightByRoom: state.quickMode?.inflightByRoom && typeof state.quickMode.inflightByRoom === "object"
      ? state.quickMode.inflightByRoom
      : {},
  };
  state.animationSoundMap = normalizeAnimationSoundMap(createDefaultAnimationSoundMap());
  state.animationSpeed = clampAnimationSpeed(animationSpeedInput.value);

  // Phase 13-1: server is the single source of truth. Block startup on a
  // successful GET /api/global-defaults. On failure, render the blocking
  // error overlay and stop further hydration until the user clicks Retry.
  state.startupDefaultsGuard.fallbackRequired = true;
  state.startupDefaultsGuard.attempted = false;
  state.startupDefaultsGuard.applied = false;
  state.startupDefaultsGuard.outcome = "pending";
  state.startupDefaultsGuard.detail = "server-first-hydration-required";

  let startupDefaultsSnapshot = null;
  let bootstrapError = null;

  try {
    const loaded = await fetchGlobalDefaultsPayload();
    window.__TT_BEAMER_BOOTSTRAP_CONFIG__ = loaded.payload;
    loadBoardProfiles();
    state.startupDefaultsGuard.attempted = true;
    state.startupDefaultsGuard.applied = true;
    state.startupDefaultsGuard.outcome = "applied";
    state.startupDefaultsGuard.detail = loaded.endpoint || "server-config";
    startupDefaultsSnapshot = buildResolveSnapshot({
      routing: loaded.routing,
      endpoint: loaded.endpoint,
      method: "GET",
    });
  } catch (error) {
    bootstrapError = error;
    state.startupDefaultsGuard.attempted = true;
    state.startupDefaultsGuard.applied = false;
    state.startupDefaultsGuard.outcome = "failed-explicit";
    state.startupDefaultsGuard.detail = String(error?.message || error || "server-unreachable");
    // Apply in-memory defaults so the UI doesn't crash while the overlay
    // is visible; the user can still click Retry.
    loadBoardProfiles();
    renderServerUnreachableOverlay(error);
    if (globalDefaultsStatus) {
      globalDefaultsStatus.textContent =
        "Global config: server not reachable — no local fallback. Click Retry to try again.";
    }
  }

  syncRuntimePanelsFromState();
  restoreSettingsSubtabPreference();
  syncQuickModePanel();
  syncMobileStickyOffsets();
  applyOutputRoleViewContract();
  connectLiveSyncSocket();
  scheduleNextLiveSnapshotPoll(0);
  if (startupDefaultsSnapshot) {
    globalDefaultsStatus.textContent =
      `Global Defaults: automatically loaded & applied (${formatResolveSnapshot(startupDefaultsSnapshot)})`;
    triggerFeedback.textContent =
      `Status: Startup defaults active (${formatResolveSnapshot(startupDefaultsSnapshot)})`;
    apiDiagnoseStatus.textContent =
      `API diagnostics: startup load OK (${formatResolveSnapshot(startupDefaultsSnapshot)})`;
  }
  warmEventSoundAssets();
  warmRoomGifAssets({ reason: "startup" });
  prewarmBoardOutsideMp4Asset(state.boardId, { reason: "startup" });
  setActiveView("dashboard");
  setPanCursorState();
  const viewRegressionOk = runViewVisibilityRegression();
  const layoutRegressionOk = runLayoutScrollRegression();
  const startupGuardRegressionOk = runStartupDefaultsGuardRegression();
  const zoomPanRegressionOk = runZoomPanEditRegression();
  const panPointerRegressionOk = runPanPointerCaptureRegression();
  const orientationRegressionOk = runOrientationStateRegression();
  const navigationRegressionOk = runNavigationStateRegression();
  const projectionVisibilityOk = runMobileProjectionVisibilityGuard({ silent: true, context: "startup" });
  const outsideIsolationRegressionOk = runOutsideIsolationRegression();
  const shipClipRegressionOk = runShipClipRegression();
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
    triggerFeedback.textContent =
      "Status: Regression failed (startup/view/layout/zoom-pan/orientation/navigation/projection + outside isolation + ship clip)";
  } else {
    triggerFeedback.textContent =
      "Status: Regression ok (Startup + View/Layout + Zoom-Pan-Edit + Orientation + Navigation + Projection + Pointer-Capture + Outside-Isolation + Ship-Clip)";
  }
  renderRunningAnimationsList();
  refreshGlobalButtons();
  window.TT_BEAMER_LIVE_SYNC_DEBUG = {
    getLiveTraceSnapshot,
  };
  logBootstrap.info("init_ready", {
    event: "init-ready",
    boardId: state.boardId,
    version: liveSync.lastAppliedVersion,
  });
  requestAnimationFrame(draw);
}

void window.TT_BEAMER_BOOT_COMPOSITION.runApplicationBootstrap({
  initializer: initializeApplication,
  onError: (error) => {
    triggerFeedback.textContent = "Status: Bootstrap failed (see console diagnostics)";
    logBootstrap.error("init_fail", {
      event: "init-fail",
      error: String(error?.message || error),
    });
  },
});
