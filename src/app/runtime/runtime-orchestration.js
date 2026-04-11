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
let insideLoopUntilStopInput = document.querySelector("#inside-loop-until-stop");
const insideApplyChangesButton = document.querySelector("#inside-apply-changes");
const outsideModeField = outsideModeInput?.closest("label") ?? null;
const outsideDirectionField = outsideDirectionInput?.closest("label") ?? null;
const outsideModeFieldMount = createConditionalFieldMountSlot(outsideModeField, "outside-mode");
const outsideDirectionFieldMount = createConditionalFieldMountSlot(outsideDirectionField, "outside-direction");
const outsideAnimationsPanel = outsideApplyChangesButton?.closest("section") ?? null;
const insideGlobalButtons = document.querySelector("#inside-global-buttons");
const dashboardGlobalLoopUntilStopInput = document.querySelector("#dashboard-global-loop-until-stop");
const dashboardGlobalPlaySoundInput = document.querySelector("#dashboard-global-play-sound");
// Phase 13-2: zoom slider removed — wheel + pinch gestures replace it.
// The two DOM constants below (boardZoomRangeInput, boardZoomValue) are
// no longer read. Leaving placeholders at null preserves any optional
// downstream access via `?.` patterns without exception.
const boardZoomRangeInput = null;
const boardZoomValue = null;
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

function ensureInsideLoopUntilStopControl() {
  if (insideLoopUntilStopInput) {
    return;
  }
  const panel = insideApplyChangesButton?.closest("section") ?? null;
  if (!panel) {
    return;
  }
  const label = document.createElement("label");
  label.className = "inline-checkbox";
  const input = document.createElement("input");
  input.id = "inside-loop-until-stop";
  input.type = "checkbox";
  label.append(input, "Loop until stopped");
  const anchor = insideAssetTypeInput?.closest("label") ?? insideApplyChangesButton;
  if (anchor && anchor.parentElement === panel) {
    panel.insertBefore(label, anchor);
  } else {
    panel.append(label);
  }
  insideLoopUntilStopInput = input;
}

function removeLegacyRoomHoldControl() {
  const roomHoldLabel = document.querySelector("#room-hold")?.closest("label") ?? null;
  roomHoldLabel?.remove();
}

ensureInsideLoopUntilStopControl();
removeLegacyRoomHoldControl();
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

function shouldApplySnapshotVersion(incomingVersion) {
  if (!Number.isFinite(Number(incomingVersion))) {
    return false;
  }
  const normalizedIncomingVersion = Number(incomingVersion);
  // Snapshot polling is strictly monotonic; stale snapshots are ignored to avoid visual rollback.
  if (normalizedIncomingVersion <= liveSync.lastAppliedVersion) {
    liveSync.applyRejectCounters.staleVersion += 1;
    return false;
  }
  return true;
}

async function pollLiveSnapshotOnce() {
  if (!liveSync.pollingEnabled || liveSync.pollInFlight) {
    return;
  }
  liveSync.pollInFlight = true;
  try {
    const params = new URLSearchParams({
      sinceVersion: String(Math.max(0, Number(liveSync.lastAppliedVersion) || 0)),
    });
    const response = await fetch(`/api/live/snapshot?${params.toString()}`, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`snapshot fetch failed (${response.status})`);
    }
    const payload = await response.json();
    const envelope = normalizeSnapshotEnvelope(payload);
    const incomingVersion = envelope.version;
    if (incomingVersion !== null) {
      liveSync.lastSessionVersion = Math.max(liveSync.lastSessionVersion, incomingVersion);
    }
    if (shouldApplySnapshotVersion(incomingVersion) && envelope.snapshot) {
      const applied = applyLiveRuntimeSnapshot(envelope.snapshot, {
        version: incomingVersion,
        mutationEnvelope: null,
        mutationType: "snapshot-poll",
      });
      if (applied) {
        resolvePendingMutationsByVersion(incomingVersion);
      }
    }
    liveSync.pollBackoffMs = 0;
    const hasPending = liveSync.pendingMutations.size > 0;
    if (!hasPending && triggerFeedback && outputRole === OUTPUT_ROLE_CONTROL) {
      if (triggerFeedback.textContent?.includes("Pending:")) {
        triggerFeedback.textContent = "Status: snapshot synchronized";
      }
    }
    scheduleNextLiveSnapshotPoll();
  } catch {
    const nextBackoff = liveSync.pollBackoffMs > 0 ? Math.min(LIVE_POLL_MAX_BACKOFF_MS, Math.floor(liveSync.pollBackoffMs * 2)) : 400;
    const jitter = Math.floor(Math.random() * 120);
    liveSync.pollBackoffMs = Math.min(LIVE_POLL_MAX_BACKOFF_MS, nextBackoff + jitter);
    scheduleNextLiveSnapshotPoll(liveSync.pollBackoffMs);
  } finally {
    liveSync.pollInFlight = false;
  }
}

async function emitLiveMutation(mutationType, payload = {}) {
  const normalizedPayload = normalizeLiveMutationPayload(mutationType, payload);
  const mutationId = `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const queuedAt = Date.now();
  if (mutationType === "context-update") {
    for (const [pendingMutationId, entry] of liveSync.pendingMutations.entries()) {
      if (entry?.mutationType === "context-update") {
        liveSync.pendingMutations.delete(pendingMutationId);
      }
    }
  }
  liveSync.pendingMutations.set(mutationId, {
    mutationId,
    mutationType,
    queuedAt,
    acceptedVersion: null,
  });
  recordMutationTrace(mutationId, "command_emit");
  try {
    let ack = null;
    for (let attempt = 1; attempt <= LIVE_COMMAND_RETRY_MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, LIVE_COMMAND_TIMEOUT_MS);
      try {
        const response = await fetch("/api/live/command", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            mutationId,
            mutationType,
            role: outputRole,
            clientId: liveSync.clientId ?? undefined,
            payload: {
              ...normalizedPayload,
              retryAttempt: attempt,
              retryMaxAttempts: LIVE_COMMAND_RETRY_MAX_ATTEMPTS,
            },
          }),
        });
        if (!response.ok) {
          const serverError = new Error(`command rejected (${response.status})`);
          serverError.status = response.status;
          throw serverError;
        }
        ack = await response.json();
        break;
      } catch (error) {
        const timeoutLike = error instanceof DOMException && error.name === "AbortError";
        const status = Number(error?.status);
        const retryable = timeoutLike || (Number.isFinite(status) && status >= 500);
        if (!retryable || attempt >= LIVE_COMMAND_RETRY_MAX_ATTEMPTS) {
          throw error;
        }
        const backoffMs = Math.min(1200, Math.round(LIVE_COMMAND_RETRY_BASE_DELAY_MS * (2 ** (attempt - 1))));
        recordMutationTrace(mutationId, `command_retry_${attempt}`);
        await new Promise((resolve) => {
          window.setTimeout(resolve, backoffMs);
        });
      } finally {
        window.clearTimeout(timeoutId);
      }
    }
    if (!ack) {
      throw new Error("command acknowledgement missing");
    }
    liveSync.lastCommandAcceptedAt = Date.now();
    if (Number.isFinite(Number(ack?.version))) {
      const version = Number(ack.version);
      liveSync.lastCommandAcceptedVersion = Math.max(liveSync.lastCommandAcceptedVersion, version);
      liveSync.lastSessionVersion = Math.max(liveSync.lastSessionVersion, version);
      const pendingEntry = liveSync.pendingMutations.get(mutationId);
      if (pendingEntry) {
        pendingEntry.acceptedVersion = version;
        liveSync.pendingMutations.set(mutationId, pendingEntry);
      }
    }
    recordMutationTrace(mutationId, "command_accepted");
    liveSync.preferFastPollingUntil = Date.now() + 2000;
    scheduleNextLiveSnapshotPoll(0);
    return ack;
  } catch (error) {
    const timeoutLike = error instanceof DOMException && error.name === "AbortError";
    const statusDetail = timeoutLike
      ? `Status: ${mutationType} command timed out after ${LIVE_COMMAND_TIMEOUT_MS}ms`
      : `Status: ${mutationType} command failed`;
    const backgroundContextSync = mutationType === "context-update"
      && String(payload?.reason || "").includes("room-draft-sync");
    if (outputRole === OUTPUT_ROLE_CONTROL && !backgroundContextSync) {
      reportActionError(statusDetail, {
        toastText: timeoutLike
          ? `Command timeout: ${mutationType} did not respond`
          : `Command failed: ${mutationType}`,
        dedupeKey: `command-${mutationType}-${timeoutLike ? "timeout" : "failed"}`,
      });
    }
    liveSync.pendingMutations.delete(mutationId);
    throw error;
  }
}

function normalizeLiveMutationPayload(mutationType, payload = {}) {
  const nextPayload = payload && typeof payload === "object"
    ? structuredClone(payload)
    : {};
  const currentBoardId = typeof state.boardId === "string" ? state.boardId.trim() : "";

  if (mutationType === "trigger-room") {
    const animation = nextPayload.animation && typeof nextPayload.animation === "object"
      ? nextPayload.animation
      : null;
    const boardId =
      (typeof nextPayload.boardId === "string" && nextPayload.boardId.trim())
      || (typeof animation?.boardId === "string" && animation.boardId.trim())
      || currentBoardId
      || null;
    const targetScope =
      (typeof nextPayload.targetScope === "string" && nextPayload.targetScope.trim())
      || (typeof animation?.scope === "string" && animation.scope.trim())
      || "room";
    const targetType =
      (typeof nextPayload.targetType === "string" && nextPayload.targetType.trim())
      || (typeof animation?.type === "string" && animation.type.trim())
      || null;

    if (boardId) {
      nextPayload.boardId = boardId;
      if (animation && !animation.boardId) {
        animation.boardId = boardId;
      }
    }
    if (targetScope) {
      nextPayload.targetScope = targetScope;
    }
    if (targetType) {
      nextPayload.targetType = targetType;
    }
    if (!nextPayload.dispatchTraceId) {
      nextPayload.dispatchTraceId = `dispatch-${mutationType}-${Date.now().toString(36)}`;
    }
    nextPayload.dispatchLayer = "control-client";
    return nextPayload;
  }

  if (mutationType === "trigger-global") {
    const animation = nextPayload.animation && typeof nextPayload.animation === "object"
      ? nextPayload.animation
      : null;
    const boardId =
      (typeof nextPayload.boardId === "string" && nextPayload.boardId.trim())
      || (typeof animation?.boardId === "string" && animation.boardId.trim())
      || currentBoardId
      || null;
    const targetType =
      (typeof nextPayload.animationType === "string" && nextPayload.animationType.trim())
      || (typeof animation?.type === "string" && animation.type.trim())
      || null;

    if (boardId) {
      nextPayload.boardId = boardId;
      if (animation && !animation.boardId) {
        animation.boardId = boardId;
      }
    }
    nextPayload.targetScope = "global";
    if (targetType) {
      nextPayload.targetType = targetType;
      if (!nextPayload.animationType) {
        nextPayload.animationType = targetType;
      }
    }
    if (!nextPayload.dispatchTraceId) {
      nextPayload.dispatchTraceId = `dispatch-${mutationType}-${Date.now().toString(36)}`;
    }
    nextPayload.dispatchLayer = "control-client";
    return nextPayload;
  }

  return nextPayload;
}

function emitOutsideFxMutation(boardId = state.boardId, reason = "outside-settings") {
  const normalizedProfile = normalizeOutsideFxProfile(state.outsideFxByBoard[boardId]);
  emitLiveMutation("outside-update", {
    outsideBoardId: boardId,
    reason,
    outsideFx: normalizedProfile,
    outsideFxByBoard: {
      [boardId]: normalizedProfile,
    },
  });
}

let roomDraftSyncTimerId = null;

function emitRoomDraftSyncMutation(reason = "room-draft-sync") {
  if (outputRole !== OUTPUT_ROLE_CONTROL) {
    return;
  }
  const roomDraftPayload = {
    ...(state.roomDraft && typeof state.roomDraft === "object" ? state.roomDraft : {}),
    staggerStart: Boolean(state.roomDraft.staggerStart),
    staggerOffsetMs: clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs),
  };
  void emitLiveMutation("context-update", {
    reason,
    draftBoardId: state.boardId,
    runtime: {
      roomDraft: roomDraftPayload,
    },
  }).catch(() => undefined);
}

function scheduleRoomDraftSync(reason = "room-draft-sync", delayMs = 120) {
  if (outputRole !== OUTPUT_ROLE_CONTROL) {
    return;
  }
  if (roomDraftSyncTimerId !== null) {
    window.clearTimeout(roomDraftSyncTimerId);
  }
  roomDraftSyncTimerId = window.setTimeout(() => {
    roomDraftSyncTimerId = null;
    emitRoomDraftSyncMutation(reason);
  }, Math.max(0, Number(delayMs) || 0));
}

function hydrateRunningAnimationStartTimestamps(runningAnimations) {
  return (Array.isArray(runningAnimations) ? runningAnimations : []).map((animation) => {
    const startedAtEpochMs = getAnimationStartedAtEpochMs(animation);
    const ageMs = Math.max(0, Date.now() - startedAtEpochMs);
    const normalizedClusterMemberRoomIds = animation?.scope === "cluster"
      ? (() => {
        const directRoomIds = Array.isArray(animation.memberRoomIds)
          ? animation.memberRoomIds.map((roomId) => String(roomId || "").trim()).filter(Boolean)
          : [];
        if (directRoomIds.length > 0) {
          return Array.from(new Set(directRoomIds));
        }
        const fallbackCluster = getClusterTargetById(animation.clusterId, animation.boardId);
        return Array.from(new Set(
          Array.isArray(fallbackCluster?.roomIds)
            ? fallbackCluster.roomIds.map((roomId) => String(roomId || "").trim()).filter(Boolean)
            : [],
        ));
      })()
      : undefined;
    return {
      ...animation,
      ...(animation?.scope === "cluster"
        ? {
          memberRoomIds: normalizedClusterMemberRoomIds,
        }
        : {}),
      startedAtEpochMs,
      startedAt: performance.now() - ageMs,
    };
  });
}

function reconcileHydratedAnimations(runningAnimations) {
  const reconciled = reconcileHydratedRunningAnimations(runningAnimations, Date.now());
  for (const terminalAnimation of reconciled?.terminalAnimations ?? []) {
    rememberTerminalOneShotReplay(terminalAnimation);
  }
  const activeAnimations = (reconciled?.activeAnimations ?? []).filter((animation) => !shouldSuppressTerminalOneShotReplay(animation));
  if (Array.isArray(reconciled?.terminalAnimations) && reconciled.terminalAnimations.length > 0) {
    logRuntime.info("rehydrate_terminal_events", {
      event: "rehydrate-terminal-events",
      droppedCount: reconciled.terminalAnimations.length,
      boardId: state.boardId,
    });
  }
  return activeAnimations;
}

function isFiniteDurationGlobalAnimation(animation) {
  if (!animation || animation.scope !== "global") {
    return false;
  }
  if (animation.hold === true) {
    return false;
  }
  const durationMs = Number(animation.durationMs);
  return Number.isFinite(durationMs) && durationMs > 0;
}

function buildTerminalOneShotFingerprint(animation) {
  const scope = typeof animation?.scope === "string" ? animation.scope : "unknown";
  const boardId = typeof animation?.boardId === "string" ? animation.boardId : "unknown";
  const type = typeof animation?.type === "string" ? animation.type : "unknown";
  const startedAtEpochMs = Math.trunc(getAnimationStartedAtEpochMs(animation));
  const durationMs = Math.trunc(Number(animation?.durationMs) || 0);
  return `${scope}|${boardId}|${type}|${startedAtEpochMs}|${durationMs}`;
}

function rememberTerminalOneShotReplay(animation) {
  if (!isFiniteDurationGlobalAnimation(animation)) {
    return;
  }
  const triggerKey = getGlobalTriggerKey(animation);
  const triggerRevision = Number(animation?.triggerRevision);
  if (triggerKey && Number.isInteger(triggerRevision) && triggerRevision > 0) {
    const previous = Number(liveSync.terminalOneShotRevisionByKey.get(triggerKey) ?? 0);
    if (triggerRevision > previous) {
      liveSync.terminalOneShotRevisionByKey.set(triggerKey, triggerRevision);
    }
  }
  const fingerprint = buildTerminalOneShotFingerprint(animation);
  liveSync.terminalOneShotFingerprints.set(fingerprint, Date.now());
  if (liveSync.terminalOneShotFingerprints.size > 1800) {
    const oldestKey = liveSync.terminalOneShotFingerprints.keys().next().value;
    if (oldestKey) {
      liveSync.terminalOneShotFingerprints.delete(oldestKey);
    }
  }
}

function shouldSuppressTerminalOneShotReplay(animation) {
  if (!isFiniteDurationGlobalAnimation(animation)) {
    return false;
  }
  const triggerKey = getGlobalTriggerKey(animation);
  const triggerRevision = Number(animation?.triggerRevision);
  if (triggerKey && Number.isInteger(triggerRevision) && triggerRevision > 0) {
    const terminalRevision = Number(liveSync.terminalOneShotRevisionByKey.get(triggerKey) ?? 0);
    if (terminalRevision >= triggerRevision) {
      return true;
    }
  }
  const fingerprint = buildTerminalOneShotFingerprint(animation);
  return liveSync.terminalOneShotFingerprints.has(fingerprint);
}

function filterRunningAnimationsForBoard(runningAnimations, boardId) {
  const normalizedBoardId = typeof boardId === "string" ? boardId.trim() : "";
  const inferredBoardId = normalizedBoardId || (Array.isArray(runningAnimations)
    ? runningAnimations.reduce((first, animation) => {
      if (first) {
        return first;
      }
      const animationBoardId = typeof animation?.boardId === "string" ? animation.boardId.trim() : "";
      return animationBoardId || "";
    }, "")
    : "");
  return (Array.isArray(runningAnimations) ? runningAnimations : []).filter((animation) => {
    if (!animation || typeof animation !== "object") {
      return false;
    }
    const animationBoardId = typeof animation.boardId === "string" ? animation.boardId.trim() : "";
    if (!inferredBoardId || !animationBoardId) {
      return false;
    }
    return animationBoardId === inferredBoardId;
  });
}

function isControlCriticalMutationEnvelope(envelope) {
  return envelope?.priority === "high" || envelope?.mutationClass === "control-critical";
}

function sendLiveMutationReceiveAck(envelope) {
  if (!envelope?.mutationId || !liveSync.wsConnected || !liveSync.socket || liveSync.socket.readyState !== WebSocket.OPEN) {
    return;
  }
  liveSync.socket.send(JSON.stringify({
    type: "live-receive-ack",
    mutationEnvelope: envelope,
    receivedAt: new Date().toISOString(),
  }));
}

function sendLiveMutationApplyAck(envelope) {
  if (!envelope?.mutationId || !liveSync.wsConnected || !liveSync.socket || liveSync.socket.readyState !== WebSocket.OPEN) {
    return;
  }
  liveSync.socket.send(JSON.stringify({
    type: "live-apply-ack",
    mutationEnvelope: envelope,
    appliedAt: new Date().toISOString(),
  }));
}

function shouldApplyMutationEnvelope(version, mutationEnvelope) {
  const numericVersion = Number.isFinite(version) ? Number(version) : null;
  if (numericVersion !== null && numericVersion <= liveSync.lastAppliedVersion) {
    liveSync.applyRejectCounters.staleVersion += 1;
    return false;
  }
  const envelopeVersion = Number.isFinite(Number(mutationEnvelope?.serverVersion))
    ? Number(mutationEnvelope.serverVersion)
    : null;
  const effectiveVersion = envelopeVersion ?? numericVersion;
  if (effectiveVersion !== null && effectiveVersion <= liveSync.lastAppliedVersion) {
    liveSync.applyRejectCounters.staleVersion += 1;
    return false;
  }
  if (mutationEnvelope?.mutationId && liveSync.appliedMutationIds.has(mutationEnvelope.mutationId)) {
    liveSync.applyRejectCounters.duplicateMutation += 1;
    return false;
  }
  return true;
}

function applyLiveRuntimeSnapshot(snapshot, { version = null, mutationEnvelope = null, mutationType = null } = {}) {
  const numericVersion = Number.isFinite(version) ? Number(version) : null;
  const envelopeVersion = Number.isFinite(Number(mutationEnvelope?.serverVersion))
    ? Number(mutationEnvelope.serverVersion)
    : null;
  const effectiveVersion = envelopeVersion ?? numericVersion;
  if (!shouldApplyMutationEnvelope(version, mutationEnvelope)) {
    return false;
  }
  const runtime = snapshot?.runtime;
  if (!runtime || typeof runtime !== "object") {
    return false;
  }
  const sharedOutsideFxByBoard =
    snapshot?.outsideFxByBoard && typeof snapshot.outsideFxByBoard === "object"
      ? snapshot.outsideFxByBoard
      : runtime?.outsideFxByBoard && typeof runtime.outsideFxByBoard === "object"
        ? runtime.outsideFxByBoard
        : null;
  const sharedInsideFxByBoard =
    snapshot?.insideFxByBoard && typeof snapshot.insideFxByBoard === "object"
      ? snapshot.insideFxByBoard
      : runtime?.insideFxByBoard && typeof runtime.insideFxByBoard === "object"
        ? runtime.insideFxByBoard
        : null;
  const sharedRoomFxByBoard =
    snapshot?.roomFxByBoard && typeof snapshot.roomFxByBoard === "object"
      ? snapshot.roomFxByBoard
      : runtime?.roomFxByBoard && typeof runtime.roomFxByBoard === "object"
        ? runtime.roomFxByBoard
        : null;
  const selectedBoard =
    (typeof snapshot?.selectedBoard === "string" && snapshot.selectedBoard) ||
    (typeof snapshot?.selectedLayout === "string" && snapshot.selectedLayout) ||
    (typeof runtime.selectedBoard === "string" && runtime.selectedBoard) ||
    (typeof runtime.selectedLayout === "string" && runtime.selectedLayout) ||
    (typeof runtime.boardId === "string" && runtime.boardId) ||
    (Array.isArray(runtime.runningAnimations)
      ? runtime.runningAnimations.reduce((first, animation) => {
        if (first) {
          return first;
        }
        const animationBoardId = typeof animation?.boardId === "string" ? animation.boardId.trim() : "";
        return animationBoardId || "";
      }, "")
      : "") ||
    state.boardId;
  state.boardId = selectedBoard;
  state.selectedBoard = selectedBoard;
  state.selectedLayout =
    (typeof snapshot?.selectedLayout === "string" && snapshot.selectedLayout) ||
    (typeof runtime.selectedLayout === "string" && runtime.selectedLayout) ||
    selectedBoard;
  state.selectedRoomId = runtime.selectedRoomId ?? state.selectedRoomId;
  state.selectedRoomByBoard =
    runtime.selectedRoomByBoard && typeof runtime.selectedRoomByBoard === "object"
      ? runtime.selectedRoomByBoard
      : state.selectedRoomByBoard;
  if (polygonContract?.applySnapshotPolygonState) {
    const polygonHydration = polygonContract.applySnapshotPolygonState({
      state,
      snapshot,
      runtime,
      boardIds: BOARDS.map((board) => board.id),
      shipPolygonDefault: SHIP_POLYGON_DEFAULT,
    });
    if (polygonHydration && typeof polygonHydration === "object") {
      state.playAreasByBoard = polygonHydration.playAreasByBoard ?? state.playAreasByBoard;
      state.selectedPlayAreaIdByBoard = polygonHydration.selectedPlayAreaIdByBoard ?? state.selectedPlayAreaIdByBoard;
      reportCanonicalPolygonIssues(polygonHydration.issues, {
        sourceLabel: "live-snapshot",
      });
      state.shipPolygonsByBoard = Object.fromEntries(
        BOARDS.map((board) => [board.id, normalizeShipPolygon(getSelectedPlayArea(board.id)?.polygon ?? SHIP_POLYGON_DEFAULT)]),
      );
    }
  }
  if (sharedOutsideFxByBoard) {
    state.outsideFxByBoard = {
      ...state.outsideFxByBoard,
      ...Object.fromEntries(
        BOARDS.map((board) => [
          board.id,
          normalizeOutsideFxProfile(sharedOutsideFxByBoard[board.id] ?? state.outsideFxByBoard[board.id]),
        ]),
      ),
    };
  }
  if (sharedInsideFxByBoard) {
    state.insideFxByBoard = {
      ...state.insideFxByBoard,
      ...Object.fromEntries(
        BOARDS.map((board) => [
          board.id,
          normalizeInsideFxProfile(sharedInsideFxByBoard[board.id] ?? state.insideFxByBoard[board.id]),
        ]),
      ),
    };
  }
  if (sharedRoomFxByBoard) {
    state.roomFxByBoard = {
      ...state.roomFxByBoard,
      ...Object.fromEntries(
        BOARDS.map((board) => [
          board.id,
          normalizeRoomFxProfile(sharedRoomFxByBoard[board.id] ?? state.roomFxByBoard?.[board.id]),
        ]),
      ),
    };
  }
  observeGlobalStopRevisions(runtime);
  observeGlobalClearRevision(runtime);
  if (mutationType === "clear-all") {
    liveSync.activeSeenOneShotRunByTriggerRevision.clear();
    liveSync.lastObservedGlobalClearRevision = Math.max(
      Number(liveSync.lastObservedGlobalClearRevision) || 0,
      1,
    );
  }
  const previousAnimationsById = new Map(
    state.runningAnimations
      .filter((animation) => animation && typeof animation.id === "string")
      .map((animation) => [animation.id, animation]),
  );
  const boardBoundRunningAnimations = filterRunningAnimationsForBoard(runtime.runningAnimations, selectedBoard);
  const primedRunningAnimations = primeGlobalTriggerRuntimeTimestamps(boardBoundRunningAnimations, previousAnimationsById);
  const reconciledRunningAnimations = reconcileHydratedAnimations(primedRunningAnimations);
  const retainedRunningAnimations = retainActiveSeenOneShotRuns(reconciledRunningAnimations);
  state.runningAnimations = hydrateRunningAnimationStartTimestamps(retainedRunningAnimations);
  reconcileStopPendingFromSnapshot();
  if (outputRole !== OUTPUT_ROLE_CONTROL && runtime.roomDraft && typeof runtime.roomDraft === "object") {
    state.roomDraft = {
      ...state.roomDraft,
      ...runtime.roomDraft,
    };
  }
  state.animationSpeed = clampAnimationSpeed(runtime.animationSpeed ?? state.animationSpeed);
  if (runtime.audio && typeof runtime.audio === "object") {
    state.audio.enabled = Boolean(runtime.audio.enabled);
    state.audio.volume = clampAudioVolumePercent(Math.round(Number(runtime.audio.volume ?? state.audio.volume) * 100)) / 100;
  }
  if (runtime.mp4Performance && typeof runtime.mp4Performance === "object") {
    state.runtimePerf.mp4Controls = normalizeMp4PerformanceControls(runtime.mp4Performance);
    syncMp4PerformanceControlsPanel();
  }
  if (typeof snapshot?.alignMode === "boolean") {
    state.alignMode = snapshot.alignMode;
  } else if (typeof runtime.alignMode === "boolean") {
    state.alignMode = runtime.alignMode;
  }

  if (mutationType === "clear-all" || mutationType === "stop-animation") {
    hardStopRuntimeEffects({ clearVisuals: true });
  }

  const isFastFinalApply = outputRole === OUTPUT_ROLE_FINAL && isControlCriticalMutationEnvelope(mutationEnvelope);

  enforceAudioLifecycleGuard();
  stopSoundsForInactiveAnimations();
  for (const animation of state.runningAnimations) {
    playSoundForAnimation(animation);
  }

  syncAlignModePanel();

  if (!isFastFinalApply && outputRole !== OUTPUT_ROLE_FINAL) {
    syncRuntimePanelsFromState();
    renderRunningAnimationsList();
    refreshGlobalButtons();
  }
  renderRoomOverlay();
  if (numericVersion !== null) {
    liveSync.lastSessionVersion = Math.max(liveSync.lastSessionVersion, numericVersion);
  }
  if (effectiveVersion !== null) {
    liveSync.lastAppliedVersion = Math.max(liveSync.lastAppliedVersion, effectiveVersion);
  }
  if (mutationEnvelope?.mutationId) {
    rememberAppliedMutationId(mutationEnvelope.mutationId);
    recordMutationTrace(mutationEnvelope.mutationId, "client_apply");
    if (mutationType === "stop-animation" || mutationType === "clear-all") {
      recordMutationTrace(mutationEnvelope.mutationId, "client_visual_clear");
      recordMutationTrace(mutationEnvelope.mutationId, "client_audio_stop");
    }
    sendLiveMutationApplyAck(mutationEnvelope);
  }
  return true;
}

function connectLiveSyncSocket() {
  try {
    const socket = new WebSocket(resolveLiveWebSocketUrl());
    const socketGeneration = liveSync.socketGeneration + 1;
    liveSync.socketGeneration = socketGeneration;
    liveSync.socket = socket;
    socket.addEventListener("open", () => {
      if (liveSync.socket !== socket || liveSync.socketGeneration !== socketGeneration) {
        return;
      }
      liveSync.wsConnected = true;
    });
    socket.addEventListener("message", (event) => {
      if (liveSync.socket !== socket || liveSync.socketGeneration !== socketGeneration) {
        return;
      }
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === "live-hello") {
          liveSync.clientId = payload.clientId ?? null;
          liveSync.dirtyHintUntil = Date.now() + 1200;
          if (Number.isFinite(payload?.session?.version)) {
            const helloVersion = Number(payload.session.version);
            liveSync.lastSessionVersion = Math.max(liveSync.lastSessionVersion, helloVersion);
            const helloSnapshot = payload?.session?.snapshot;
            if (helloSnapshot && shouldApplySnapshotVersion(helloVersion)) {
              applyLiveRuntimeSnapshot(helloSnapshot, {
                version: helloVersion,
                mutationEnvelope: null,
                mutationType: "live-hello",
              });
            }
          }
          scheduleNextLiveSnapshotPoll(0);
        }
        if (payload?.type === "live-session-update") {
          const sessionVersion = Number(payload?.session?.version ?? 0);
          const mutationType = typeof payload?.mutationType === "string" ? payload.mutationType : null;
          const shouldApplyImmediateStopSnapshot =
            mutationType === STOP_ANIMATION_MUTATION_TYPE || mutationType === "clear-all";
          if (
            shouldApplyImmediateStopSnapshot
            && Number.isFinite(sessionVersion)
            && shouldApplySnapshotVersion(sessionVersion)
            && payload?.session?.snapshot
          ) {
            applyLiveRuntimeSnapshot(payload.session.snapshot, {
              version: sessionVersion,
              mutationEnvelope: payload?.mutationEnvelope ?? null,
              mutationType,
            });
          }
          scheduleNextLiveSnapshotPoll(0);
        }
        if (payload?.type === "state-dirty" || payload?.wake === true) {
          liveSync.dirtyHintUntil = Date.now() + 1500;
          scheduleNextLiveSnapshotPoll(0);
        }
        // Phase 13-1: server broadcasts `global-config-update` after every
        // successful POST /api/global-defaults.
        // Phase 13-HF3: if local config is dirty, suppress the refetch.
        // The user's unsaved edits win until they explicitly Apply or
        // Discard. We set `remoteConfigUpdateAwaiting` so the UI shows a
        // banner and the Apply / Discard buttons both mention the remote.
        if (payload?.type === "global-config-update") {
          if (state.localConfigDirty) {
            state.remoteConfigUpdateAwaiting = true;
            refreshApplyDiscardButtonsUi();
          } else {
            void (async () => {
              try {
                const loaded = await fetchGlobalDefaultsPayload();
                applyGlobalDefaultsPayloadToState(loaded.payload);
                syncRuntimePanelsFromState();
                renderRunningAnimationsList();
                refreshGlobalButtons();
                if (globalDefaultsStatus) {
                  globalDefaultsStatus.textContent =
                    `Global config: updated from peer (${loaded.endpoint || "server"})`;
                }
              } catch (refetchError) {
                console.warn(
                  "[global-config] broadcast refetch failed:",
                  refetchError?.message || refetchError,
                );
              }
            })();
          }
        }
      } catch {
        // ignore malformed live-sync payloads
      }
    });
    socket.addEventListener("close", () => {
      if (liveSync.socket !== socket || liveSync.socketGeneration !== socketGeneration) {
        return;
      }
      liveSync.wsConnected = false;
      window.setTimeout(connectLiveSyncSocket, 1200);
    });
    socket.addEventListener("error", () => {
      if (liveSync.socket !== socket || liveSync.socketGeneration !== socketGeneration) {
        return;
      }
      liveSync.wsConnected = false;
    });
  } catch {
    liveSync.wsConnected = false;
  }
}

const { getBoard, getSelectedRoom } = window.TT_BEAMER_STATE.createStateSelectors({
  getBoards: () => BOARDS,
  getState: () => state,
});

let animationIdCounter = 1;
const ashParticles = [];
let lastListRenderAt = 0;
const audioAssetPoolByPath = new Map();
const gifPlaybackCacheByPath = new Map();
const outsideVideoCacheByPath = new Map();
const roomVideoCacheByPath = new Map();
const outsideMp4PlaybackStateByBoard = new Map();
const outsideTimelineStateByBoard = new Map();
const OUTSIDE_MP4_LOOP_START_OFFSET_SEC = 0.05;
const OUTSIDE_MP4_LOOP_WRAP_LEAD_SEC = 0.08;
const OUTSIDE_MP4_LOOP_WRAP_COOLDOWN_MS = 220;
const OUTSIDE_MP4_FALLBACK_FRAME_MAX_AGE_MS = 350;
const audioAssetCursorByEffect = {};
const audioAssetVoiceCursorByPath = {};
const activeAnimationAudioById = new Map();
const pendingAnimationAudioStartTimers = new Map();
const startedGlobalAudioRevisionByTriggerKey = new Map();
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
  writeJson: writePersistenceJson,
  extractBoardProfilesCandidate: extractBoardProfilesCandidateFromPersistence,
  loadLegacyRoomGeometryByBoard: loadLegacyRoomGeometryByBoardFromPersistence,
  loadLegacySpecialPolygonsByBoard: loadLegacySpecialPolygonsByBoardFromPersistence,
  loadHitareaCalibrationMap: loadHitareaCalibrationMapFromPersistence,
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


function syncZoneLoaderStatus() {
  if (!zonesStatus) {
    return;
  }
  const boardIds = BOARDS.map((board) => board.id);
  const boards = boardIds.map((boardId) => {
    const mode = state.zoneLoader.classificationByBoard[boardId] ?? "UNKNOWN";
    const fallback = state.zoneLoader.fallbackBoards[boardId] || "none";
    return `${boardId}: ${mode}${fallback !== "none" ? ` (${fallback})` : ""}`;
  });
  zonesStatus.textContent = `Board source: ${boards.join(" | ")}`;
}

async function loadExternalBoardZones() {
  try {
    const response = await fetchWithTimeout("/api/boards", {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });
    if (response.ok) {
      const payload = await response.json();
      const runtimeBoards = Array.isArray(payload?.runtimeBoards)
        ? payload.runtimeBoards
        : Array.isArray(payload?.boards)
          ? payload.boards.map((entry) => ({
            id: entry?.boardId,
            label: entry?.metadata?.name,
            src: entry?.metadata?.imageSrc,
            rooms: entry?.roomCatalog,
            roomClusters: entry?.roomClusters,
          }))
          : [];
      const normalizedBoards = runtimeBoards
        .map((board) => window.TT_BEAMER_ROOMS.normalizeBoard(board))
        .filter((board) => board?.id && Array.isArray(board.rooms));
      if (normalizedBoards.length > 0) {
        BOARDS = normalizedBoards;
        for (const board of BOARDS) {
          state.zoneLoader.loadedBoards[board.id] = "/api/boards";
          state.zoneLoader.fallbackBoards[board.id] = "none";
          state.zoneLoader.classificationByBoard[board.id] = "CATALOG_LOADED";
          state.zoneLoader.detailByBoard[board.id] = "ok";
        }
        syncZoneLoaderStatus();
        return;
      }
    }
  } catch {
    // fall back to static zone files below
  }

  const loadedByBoardId = new Map();
  const loadedBoards = {};
  const fallbackBoards = {};
  const classificationByBoard = {};
  const detailByBoard = {};

  for (const source of ZONE_CONFIG_SOURCES) {
    const fallbackInline = INLINE_FALLBACK_BOARDS.find((board) => board.id === source.boardId);
    const fallbackLastKnown = lastKnownGoodBoardById.get(source.boardId) ?? fallbackInline;
    let responseStatus = null;
    try {
      const response = await fetchWithTimeout(source.endpoint, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      });
      responseStatus = response.status;
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw Object.assign(new Error("malformed JSON"), { zoneCode: "ZONE_MALFORMED_JSON" });
      }

      const requiredRoomIds = (fallbackInline?.rooms ?? []).map((room) => room.id);
      const validated = validateZonePayload(payload, source.boardId, requiredRoomIds);
      if (!validated.ok || !validated.normalizedBoard) {
        throw Object.assign(new Error(validated.issues.join("; ")), {
          zoneCode: validated.code,
        });
      }

      const board = cloneBoardEntry(validated.normalizedBoard);
      loadedByBoardId.set(source.boardId, board);
      lastKnownGoodBoardById.set(source.boardId, cloneBoardEntry(board));
      loadedBoards[source.boardId] = source.endpoint;
      fallbackBoards[source.boardId] = "none";
      classificationByBoard[source.boardId] = "ZONE_LOADED";
      detailByBoard[source.boardId] = "ok";
    } catch (error) {
      const zoneCode =
        error && typeof error === "object" && "zoneCode" in error ? String(error.zoneCode || "") : "";
      const classification = classifyZoneFallback(responseStatus, zoneCode);
      const fallbackType = lastKnownGoodBoardById.has(source.boardId) ? "fallback:last-known-good" : "fallback:inline";
      loadedByBoardId.set(source.boardId, cloneBoardEntry(fallbackLastKnown));
      loadedBoards[source.boardId] = "fallback";
      fallbackBoards[source.boardId] = fallbackType;
      classificationByBoard[source.boardId] = classification;
      detailByBoard[source.boardId] =
        error instanceof Error ? error.message : zoneCode || `status=${responseStatus ?? "n/a"}`;
    }
  }

  BOARDS = INLINE_FALLBACK_BOARDS.map(
    (fallbackBoard) => cloneBoardEntry(loadedByBoardId.get(fallbackBoard.id) ?? fallbackBoard),
  );
  state.zoneLoader.loadedBoards = loadedBoards;
  state.zoneLoader.fallbackBoards = fallbackBoards;
  state.zoneLoader.classificationByBoard = classificationByBoard;
  state.zoneLoader.detailByBoard = detailByBoard;
  syncZoneLoaderStatus();
}

async function importBoardFromFile(file) {
  if (!file) {
    throw new Error("Please select a JSON file first");
  }
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Selected file is not valid JSON");
  }

  const response = await fetchWithTimeout("/api/boards/import", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message = parsed?.error || parsed?.code || `HTTP ${response.status}`;
    throw new Error(`Board import failed: ${message}`);
  }

  await loadExternalBoardZones();
  ensureImportedBoardInCatalog(parsed);
  syncBoardSelectOptions();
  if (parsed?.boardId) {
    const activated = activateImportedBoard(parsed.boardId, "board-import");
    if (!activated) {
      throw new Error(`Board import succeeded but activation failed: ${parsed.boardId}`);
    }
  }
  return parsed;
}

function normalizeImportedBoardFromResponse(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const boardId = String(parsed?.boardId || parsed?.board?.boardId || parsed?.board?.id || "").trim();
  if (!boardId) {
    return null;
  }
  const boardPayload = parsed?.board;
  const roomCatalog = Array.isArray(boardPayload?.roomCatalog)
    ? boardPayload.roomCatalog
    : Array.isArray(boardPayload?.rooms)
      ? boardPayload.rooms
      : [];
  const roomClusters = Array.isArray(boardPayload?.roomClusters)
    ? boardPayload.roomClusters
    : Array.isArray(boardPayload?.clusters)
      ? boardPayload.clusters
      : [];
  const fallbackImagePath = String(parsed?.imagePath || "").trim();
  const fallbackImageSrc = fallbackImagePath ? `/${fallbackImagePath.replace(/^\/+/, "")}` : "";
  const runtimeCandidate = {
    id: boardId,
    label: String(boardPayload?.metadata?.name || boardPayload?.label || boardPayload?.name || boardId).trim() || boardId,
    src: String(boardPayload?.metadata?.imageSrc || boardPayload?.src || fallbackImageSrc).trim(),
    rooms: roomCatalog.map((room) => ({
      id: room?.id,
      name: room?.name,
      label: room?.name ?? room?.label,
      polygon: room?.polygon ?? room?.points,
      points: room?.polygon ?? room?.points,
      x: room?.x,
      y: room?.y,
      radius: room?.radius,
      meta: room?.meta,
    })),
    roomClusters,
  };
  if (!runtimeCandidate.src) {
    return null;
  }
  return window.TT_BEAMER_ROOMS.normalizeBoard(runtimeCandidate);
}

function ensureImportedBoardInCatalog(parsed) {
  const board = normalizeImportedBoardFromResponse(parsed);
  if (!board?.id || BOARDS.some((entry) => entry.id === board.id)) {
    return false;
  }
  BOARDS = [...BOARDS, board];
  state.zoneLoader.loadedBoards[board.id] = "import-response";
  state.zoneLoader.fallbackBoards[board.id] = "none";
  state.zoneLoader.classificationByBoard[board.id] = "CATALOG_LOADED";
  state.zoneLoader.detailByBoard[board.id] = "import-response";
  syncZoneLoaderStatus();
  return true;
}

function activateImportedBoard(boardId, reason) {
  const targetId = String(boardId || "").trim();
  if (!targetId || !BOARDS.some((board) => board.id === targetId)) {
    return false;
  }
  switchBoard(targetId, { emitLiveContext: true, reason });
  return state.boardId === targetId;
}

async function importBoardFromImage(file, { boardName = "", boardId = "" } = {}) {
  if (!file) {
    throw new Error("Please select an image file first");
  }
  const formData = new FormData();
  formData.append("image", file, file.name || "board-image");
  const trimmedName = String(boardName || "").trim();
  const trimmedId = String(boardId || "").trim();
  if (trimmedName) {
    formData.append("boardName", trimmedName);
  }
  if (trimmedId) {
    formData.append("boardId", trimmedId);
  }

  const response = await fetchWithTimeout("/api/boards/import", {
    method: "POST",
    headers: {
      accept: "application/json",
    },
    body: formData,
  });

  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message = parsed?.error || parsed?.code || `HTTP ${response.status}`;
    throw new Error(`Image board import failed: ${message}`);
  }

  await loadExternalBoardZones();
  ensureImportedBoardInCatalog(parsed);
  syncBoardSelectOptions();
  if (parsed?.boardId) {
    const activated = activateImportedBoard(parsed.boardId, "board-import-image");
    if (!activated) {
      throw new Error(`Image import succeeded but activation failed: ${parsed.boardId}`);
    }
  }
  return parsed;
}

function syncBoardSelectOptions() {
  boardSelect.replaceChildren();
  for (const board of BOARDS) {
    const option = document.createElement("option");
    option.value = board.id;
    option.textContent = board.label;
    boardSelect.append(option);
  }
  if (!BOARDS.some((board) => board.id === state.boardId)) {
    state.boardId = BOARDS[0]?.id ?? "";
  }
  boardSelect.value = state.boardId;
}

// Phase 13-2: zoom range extended to [0.25, 4.0]. Wheel + pinch gestures
// replace the zoom slider; pan clamping still keeps the board visible at
// extreme zoom-outs.
const BOARD_ZOOM_SCALE_MIN = 0.25;
const BOARD_ZOOM_SCALE_MAX = 4.0;

function clampBoardZoomScale(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(BOARD_ZOOM_SCALE_MIN, Math.min(BOARD_ZOOM_SCALE_MAX, numeric));
}

function normalizeBoardZoomProfile(profile) {
  const scale = clampBoardZoomScale(Number(profile?.scale) || BOARD_ZOOM_DEFAULT.scale);
  return clampPanToBounds({
    scale,
    panX: Number(profile?.panX) || 0,
    panY: Number(profile?.panY) || 0,
  });
}

function getStagePanBounds(scale) {
  const width = stage?.clientWidth || 0;
  const height = stage?.clientHeight || 0;
  const maxPanX = Math.max(0, (width * (scale - 1)) / 2);
  const maxPanY = Math.max(0, (height * (scale - 1)) / 2);
  return { maxPanX, maxPanY };
}

function clampPanToBounds(profile) {
  const scale = clampBoardZoomScale(Number(profile?.scale) || 1);
  const { maxPanX, maxPanY } = getStagePanBounds(scale);
  return {
    scale,
    panX: Math.max(-maxPanX, Math.min(maxPanX, Number(profile?.panX) || 0)),
    panY: Math.max(-maxPanY, Math.min(maxPanY, Number(profile?.panY) || 0)),
  };
}

function computePanForZoomFocus(scale, focus = null) {
  const width = stage?.clientWidth || 0;
  const height = stage?.clientHeight || 0;
  const center = focus ?? { x: 0.5, y: 0.5 };
  const rawPanX = -((center.x - 0.5) * width * scale);
  const rawPanY = -((center.y - 0.5) * height * scale);
  return clampPanToBounds({ scale, panX: rawPanX, panY: rawPanY });
}

function createDefaultBoardZoomByBoard() {
  return Object.fromEntries(BOARDS.map((board) => [board.id, { ...BOARD_ZOOM_DEFAULT }]));
}

function getBoardZoom(boardId = state.boardId) {
  return normalizeBoardZoomProfile(state.boardZoomByBoard[boardId]);
}

function setBoardZoom(boardId, profile) {
  state.boardZoomByBoard[boardId] = normalizeBoardZoomProfile(profile);
}

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

function normalizePolygonPoint(point) {
  const objectLikePoint = point && typeof point === "object" && !Array.isArray(point)
    ? point
    : null;
  const rawX = Array.isArray(point)
    ? point[0]
    : objectLikePoint?.x ?? objectLikePoint?.[0];
  const rawY = Array.isArray(point)
    ? point[1]
    : objectLikePoint?.y ?? objectLikePoint?.[1];
  return [
    clampRoomAbsoluteCoordinate(Number(rawX) || 0.5),
    clampRoomAbsoluteCoordinate(Number(rawY) || 0.5),
  ];
}

function getNormalizedPolygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return 0;
  }
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!Array.isArray(current) || !Array.isArray(next)) {
      return 0;
    }
    area += Number(current[0]) * Number(next[1]) - Number(next[0]) * Number(current[1]);
  }
  return Math.abs(area / 2);
}

function isRenderableNormalizedPolygon(points, { minArea = 0.00003 } = {}) {
  if (!Array.isArray(points) || points.length < 3) {
    return false;
  }
  return getNormalizedPolygonArea(points) >= minArea;
}

function normalizeSpecialPolygon(points, fallbackPoints = []) {
  const source = Array.isArray(points) && points.length >= 3 ? points : fallbackPoints;
  const normalized = source.map((entry) => normalizePolygonPoint(entry));
  if (isRenderableNormalizedPolygon(normalized)) {
    return normalized;
  }
  const normalizedFallback = (Array.isArray(fallbackPoints) ? fallbackPoints : [])
    .map((entry) => normalizePolygonPoint(entry));
  if (isRenderableNormalizedPolygon(normalizedFallback)) {
    return normalizedFallback;
  }
  return [
    [0.45, 0.45],
    [0.55, 0.45],
    [0.5, 0.55],
  ];
}

function isValidSpecialPolygon(points) {
  return Array.isArray(points) && points.length >= 3;
}

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

function normalizeInsideAssetType(value) {
  return OUTSIDE_ANIMATION_ASSET_TYPES.includes(value) ? value : "coded";
}

function normalizeInsideAnimationId(value, fallback = "hull-flicker") {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
}

function normalizeInsideAnimationDefinition(definition, fallbackIndex = 0) {
  const fallbackDefaults = createDefaultInsideAnimationDefinitions()[0] ?? {
    id: `inside-${fallbackIndex + 1}`,
    name: `Inside Animation ${fallbackIndex + 1}`,
    assetType: "coded",
    assetRef: "hull-flicker",
    intensity: 1,
    speed: 1,
  };
  const id = normalizeInsideAnimationId(definition?.id, fallbackDefaults.id);
  const name = String(definition?.name || "").trim() || fallbackDefaults.name;
  const assetType = normalizeInsideAssetType(definition?.assetType);
  const rawAssetRef = String(definition?.assetRef || "").trim();
  const fallbackAssetRef = assetType === "coded" ? id : "";
  const assetRef = normalizeInsideAssetRefForType(assetType, rawAssetRef, fallbackAssetRef);
  return {
    id,
    name,
    assetType,
    assetRef,
    intensity: clampOutsideIntensity(definition?.intensity),
    speed: clampOutsideSpeed(definition?.speed),
    loopUntilStopped: Boolean(definition?.loopUntilStopped ?? definition?.hold),
  };
}

function normalizeInsideAnimationDefinitions(definitions) {
  const incoming = Array.isArray(definitions) ? definitions : [];
  const normalized = incoming
    .map((entry, index) => normalizeInsideAnimationDefinition(entry, index))
    .filter((entry) => entry && typeof entry === "object");
  const uniqueById = [];
  const seen = new Set();
  for (const entry of normalized) {
    if (seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    uniqueById.push(entry);
  }
  if (uniqueById.length > 0) {
    return uniqueById;
  }
  return createDefaultInsideAnimationDefinitions().map((entry, index) => normalizeInsideAnimationDefinition(entry, index));
}

function normalizeInsideFxProfile(profile) {
  const legacyProfile = profile && typeof profile === "object" ? profile : {};
  const animations = normalizeInsideAnimationDefinitions(legacyProfile?.animations ?? legacyProfile?.insideAnimations);
  const preferredId = normalizeInsideAnimationId(
    legacyProfile?.selectedAnimationId ?? legacyProfile?.selectedInsideAnimationId,
    animations[0]?.id ?? "hull-flicker",
  );
  const selectedAnimation = animations.find((entry) => entry.id === preferredId) ?? animations[0];
  return {
    selectedAnimationId: selectedAnimation.id,
    animations,
    intensity: selectedAnimation.intensity,
    speed: selectedAnimation.speed,
    assetType: selectedAnimation.assetType,
    assetRef: selectedAnimation.assetRef,
    loopUntilStopped: Boolean(selectedAnimation.loopUntilStopped),
  };
}

function createDefaultInsideFxByBoard() {
  return Object.fromEntries(
    BOARDS.map((board) => [board.id, normalizeInsideFxProfile({ animations: createDefaultInsideAnimationDefinitions() })]),
  );
}

function getInsideFxProfile(boardId = state.boardId) {
  return normalizeInsideFxProfile(state.insideFxByBoard?.[boardId]);
}

function setInsideFxProfile(boardId, profile) {
  state.insideFxByBoard[boardId] = normalizeInsideFxProfile(profile);
}

function getSelectedInsideAnimationDefinition(boardId = state.boardId) {
  const profile = getInsideFxProfile(boardId);
  const selectedId = normalizeInsideAnimationId(profile.selectedAnimationId, profile.animations[0]?.id);
  return profile.animations.find((entry) => entry.id === selectedId) ?? profile.animations[0] ?? null;
}

function createInsideAnimationDefinition(name, existingDefinitions = []) {
  const baseName = String(name || "").trim() || "Inside Animation";
  const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "inside-animation";
  let candidateId = slug;
  const existingIds = new Set(existingDefinitions.map((entry) => String(entry.id || "").trim()));
  let suffix = 2;
  while (existingIds.has(candidateId)) {
    candidateId = `${slug}-${suffix}`;
    suffix += 1;
  }
  return normalizeInsideAnimationDefinition({
    id: candidateId,
    name: baseName,
    assetType: "coded",
    assetRef: "hull-flicker",
    intensity: 1,
    speed: 1,
  });
}

function normalizeOutsideAssetType(value) {
  return OUTSIDE_ANIMATION_ASSET_TYPES.includes(value) ? value : "coded";
}

function normalizeOutsideAnimationId(value, fallback = "outside-space") {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
}

function normalizeOutsideAnimationDefinition(definition, fallbackIndex = 0) {
  // Legacy payloads may still contain boomerang-related keys.
  // We intentionally ignore them so load stays backward-compatible as a no-op.
  const fallbackDefaults = createDefaultOutsideAnimationDefinitions()[0] ?? {
    id: `outside-${fallbackIndex + 1}`,
    name: `Outside Animation ${fallbackIndex + 1}`,
    assetType: "coded",
    assetRef: "outside-space",
    intensity: 0.7,
    speed: 1,
    mode: "standard",
    direction: "forward",
    soundEnabled: false,
  };
  const id = normalizeOutsideAnimationId(definition?.id, fallbackDefaults.id);
  const name = String(definition?.name || "").trim() || fallbackDefaults.name;
  const assetType = normalizeOutsideAssetType(definition?.assetType);
  const rawAssetRef = String(definition?.assetRef || "").trim();
  const fallbackAssetRef =
    assetType === "coded"
      ? "outside-space"
      : normalizeOutsideAssetRefForType(assetType, fallbackDefaults.assetRef, "");
  const assetRef = normalizeOutsideAssetRefForType(assetType, rawAssetRef, fallbackAssetRef);
  return {
    id,
    name,
    assetType,
    assetRef,
    intensity: clampOutsideIntensity(definition?.intensity),
    speed: clampOutsideSpeed(definition?.speed),
    mode: normalizeOutsideMode(definition?.mode),
    direction: normalizeOutsideDirection(definition?.direction),
    soundEnabled: Boolean(definition?.soundEnabled),
  };
}

function normalizeOutsideAnimationDefinitions(definitions, legacyProfile = null) {
  const incoming = Array.isArray(definitions) ? definitions : [];
  const normalized = incoming
    .map((entry, index) => normalizeOutsideAnimationDefinition(entry, index))
    .filter((entry) => entry && typeof entry === "object");
  const uniqueById = [];
  const seen = new Set();
  for (const entry of normalized) {
    if (seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    uniqueById.push(entry);
  }
  if (uniqueById.length > 0) {
    return uniqueById;
  }
  const defaults = createDefaultOutsideAnimationDefinitions();
  if (!legacyProfile || typeof legacyProfile !== "object") {
    return defaults.map((entry, index) => normalizeOutsideAnimationDefinition(entry, index));
  }
  return defaults.map((entry, index) => {
    if (index !== 0) {
      return normalizeOutsideAnimationDefinition(entry, index);
    }
    return normalizeOutsideAnimationDefinition(
      {
        ...entry,
        intensity: legacyProfile?.intensity,
        speed: legacyProfile?.speed,
        mode: legacyProfile?.mode,
        direction: legacyProfile?.direction,
      },
      index,
    );
  });
}

function normalizeOutsideFxProfile(profile) {
  const legacyProfile = profile && typeof profile === "object" ? profile : OUTSIDE_FX_DEFAULT;
  const animations = normalizeOutsideAnimationDefinitions(
    legacyProfile?.animations ?? legacyProfile?.outsideAnimations,
    legacyProfile,
  );
  const preferredId = normalizeOutsideAnimationId(
    legacyProfile?.selectedAnimationId ?? legacyProfile?.selectedOutsideAnimationId,
    animations[0]?.id ?? "outside-space",
  );
  const selectedAnimation = animations.find((entry) => entry.id === preferredId) ?? animations[0];
  return {
    enabled: Boolean(legacyProfile?.enabled),
    selectedAnimationId: selectedAnimation.id,
    animations,
    intensity: selectedAnimation.intensity,
    speed: selectedAnimation.speed,
    mode: selectedAnimation.mode,
    direction: selectedAnimation.direction,
    assetType: selectedAnimation.assetType,
    assetRef: selectedAnimation.assetRef,
  };
}

function createDefaultOutsideFxByBoard() {
  return Object.fromEntries(
    BOARDS.map((board) => [board.id, normalizeOutsideFxProfile(OUTSIDE_FX_DEFAULT)]),
  );
}

function getOutsideFxProfile(boardId = state.boardId) {
  return normalizeOutsideFxProfile(state.outsideFxByBoard[boardId]);
}

function setOutsideFxProfile(boardId, profile) {
  state.outsideFxByBoard[boardId] = normalizeOutsideFxProfile(profile);
}

function updateOutsideFxProfile(boardId, partial) {
  const current = getOutsideFxProfile(boardId);
  const merged = { ...current, ...partial };
  const definitions = normalizeOutsideAnimationDefinitions(merged.animations, merged);
  const selectedId = normalizeOutsideAnimationId(merged.selectedAnimationId, definitions[0]?.id);
  const selectedDefinition = definitions.find((entry) => entry.id === selectedId) ?? definitions[0];
  const updatedDefinitions = definitions.map((entry) => (entry.id === selectedDefinition.id
    ? {
      ...entry,
      intensity: clampOutsideIntensity(merged.intensity),
      speed: clampOutsideSpeed(merged.speed),
      mode: normalizeOutsideMode(merged.mode),
      direction: normalizeOutsideDirection(merged.direction),
      assetType: normalizeOutsideAssetType(merged.assetType),
      assetRef: String(merged.assetRef || "").trim() || entry.assetRef,
    }
    : entry));
  setOutsideFxProfile(boardId, {
    ...merged,
    selectedAnimationId: selectedDefinition.id,
    animations: updatedDefinitions,
  });
}

function getSelectedOutsideAnimationDefinition(boardId = state.boardId) {
  const profile = getOutsideFxProfile(boardId);
  const selectedId = normalizeOutsideAnimationId(profile.selectedAnimationId, profile.animations[0]?.id);
  return profile.animations.find((entry) => entry.id === selectedId) ?? profile.animations[0] ?? null;
}

function resolveOutsideTimeline(elapsedSeconds, speed) {
  const normalizedElapsed = Math.max(0, Number(elapsedSeconds) || 0);
  const normalizedSpeed = clampOutsideSpeed(speed);
  return {
    timeline: normalizedElapsed * normalizedSpeed,
  };
}

function createOutsideAnimationDefinition(name, existingDefinitions = []) {
  const baseName = String(name || "").trim() || "Outside Animation";
  const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "outside-animation";
  let candidateId = slug;
  const existingIds = new Set(existingDefinitions.map((entry) => String(entry.id || "").trim()));
  let suffix = 2;
  while (existingIds.has(candidateId)) {
    candidateId = `${slug}-${suffix}`;
    suffix += 1;
  }
  return normalizeOutsideAnimationDefinition({
    id: candidateId,
    name: baseName,
    assetType: "coded",
    assetRef: "outside-space",
    intensity: 0.7,
    speed: 1,
    mode: "standard",
    direction: "forward",
    soundEnabled: false,
  });
}

function normalizeRoomAssetType(value) {
  return OUTSIDE_ANIMATION_ASSET_TYPES.includes(value) ? value : "coded";
}

function normalizeRoomAnimationId(value, fallback = "kaputt") {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
}

function normalizeRoomAnimationDefinition(definition, fallbackIndex = 0) {
  const fallbackDefaults = createDefaultRoomAnimationDefinitions()[0] ?? {
    id: `room-animation-${fallbackIndex + 1}`,
    name: `Room Animation ${fallbackIndex + 1}`,
    assetType: "coded",
    assetRef: "intruder-alert",
  };
  const id = normalizeRoomAnimationId(definition?.id, fallbackDefaults.id);
  const name = String(definition?.name || "").trim() || fallbackDefaults.name;
  const assetType = normalizeRoomAssetType(definition?.assetType);
  const rawAssetRef = String(definition?.assetRef || "").trim();
  const fallbackAssetRef = normalizeRoomAssetRefForType(assetType, fallbackDefaults.assetRef, "");
  const assetRef = normalizeRoomAssetRefForType(assetType, rawAssetRef, fallbackAssetRef);
  return {
    id,
    name,
    assetType,
    assetRef,
  };
}

function normalizeRoomAnimationDefinitions(definitions) {
  const incoming = Array.isArray(definitions) ? definitions : [];
  const normalized = incoming
    .map((entry, index) => normalizeRoomAnimationDefinition(entry, index))
    .filter((entry) => entry && typeof entry === "object");
  const uniqueById = [];
  const seen = new Set();
  for (const entry of normalized) {
    if (seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    uniqueById.push(entry);
  }
  if (uniqueById.length > 0) {
    return uniqueById;
  }
  return createDefaultRoomAnimationDefinitions().map((entry, index) => normalizeRoomAnimationDefinition(entry, index));
}

function normalizeRoomFxProfile(profile) {
  const legacyProfile = profile && typeof profile === "object" ? profile : {};
  const animations = normalizeRoomAnimationDefinitions(
    legacyProfile?.animations ?? legacyProfile?.roomAnimations,
  );
  const preferredId = normalizeRoomAnimationId(
    legacyProfile?.selectedAnimationId ?? legacyProfile?.selectedRoomAnimationId,
    animations[0]?.id ?? "kaputt",
  );
  const selectedAnimation = animations.find((entry) => entry.id === preferredId) ?? animations[0];
  return {
    selectedAnimationId: selectedAnimation.id,
    animations,
  };
}

function createDefaultRoomFxByBoard() {
  return Object.fromEntries(
    BOARDS.map((board) => [board.id, normalizeRoomFxProfile({ animations: createDefaultRoomAnimationDefinitions() })]),
  );
}

function getRoomFxProfile(boardId = state.boardId) {
  return normalizeRoomFxProfile(state.roomFxByBoard?.[boardId]);
}

function setRoomFxProfile(boardId, profile) {
  state.roomFxByBoard[boardId] = normalizeRoomFxProfile(profile);
}

function getSelectedRoomAnimationDefinition(boardId = state.boardId) {
  const profile = getRoomFxProfile(boardId);
  const selectedId = normalizeRoomAnimationId(profile.selectedAnimationId, profile.animations[0]?.id);
  return profile.animations.find((entry) => entry.id === selectedId) ?? profile.animations[0] ?? null;
}

function getRoomAnimationDefinitionById(animationId, boardId = state.boardId) {
  const profile = getRoomFxProfile(boardId);
  const normalizedId = normalizeRoomAnimationId(animationId, profile.animations[0]?.id ?? "kaputt");
  return profile.animations.find((entry) => entry.id === normalizedId) ?? null;
}

function createRoomAnimationDefinition(name, existingDefinitions = []) {
  const baseName = String(name || "").trim() || "Room Animation";
  const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "room-animation";
  let candidateId = slug;
  const existingIds = new Set(existingDefinitions.map((entry) => String(entry.id || "").trim()));
  let suffix = 2;
  while (existingIds.has(candidateId)) {
    candidateId = `${slug}-${suffix}`;
    suffix += 1;
  }
  return normalizeRoomAnimationDefinition({
    id: candidateId,
    name: baseName,
    assetType: "coded",
    assetRef: "intruder-alert",
  });
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

function createDefaultBoardProfiles() {
  return Object.fromEntries(
    BOARDS.map((board) => [
      board.id,
      {
        roomCatalog: board.rooms.map((room) => roomToCatalogEntry(room)),
        deletedRoomIds: [],
        roomClusters: Array.isArray(board.roomClusters) ? board.roomClusters.map((cluster) => ({ ...cluster })) : [],
        hitareaCalibration: { ...HITAREA_CALIBRATION_DEFAULT },
        roomGeometry: createDefaultRoomGeometryMap(board.id),
        roomStateProfiles: createDefaultRoomStateProfileMap(board.id),
        specialPolygons: createDefaultSpecialPolygonMap(board.id),
        playAreas: normalizePlayAreasCollection(null, SHIP_POLYGON_DEFAULT),
        selectedPlayAreaId: "play-area-1",
        playAreaPolygon: normalizeShipPolygon(SHIP_POLYGON_DEFAULT),
        roomFx: normalizeRoomFxProfile({ animations: createDefaultRoomAnimationDefinitions() }),
        insideFx: normalizeInsideFxProfile({ animations: createDefaultInsideAnimationDefinitions() }),
        outsideFx: normalizeOutsideFxProfile(OUTSIDE_FX_DEFAULT),
      },
    ]),
  );
}

function buildBoardProfilesFromState() {
  return Object.fromEntries(
    BOARDS.map((board) => [
      board.id,
      {
        roomCatalog: board.rooms.map((room) => roomToCatalogEntry(room)),
        deletedRoomIds: normalizeRoomTombstoneIds(state.roomTombstonesByBoard?.[board.id], board.id),
        roomClusters: Array.isArray(board.roomClusters) ? board.roomClusters.map((cluster) => ({ ...cluster })) : [],
        hitareaCalibration: normalizeHitareaCalibration(state.hitareaCalibrationByBoard[board.id]),
        roomGeometry: normalizeRoomGeometryMap(state.roomGeometryByBoard[board.id], board.id),
        roomStateProfiles: normalizeRoomStateProfileMap(state.roomStateProfilesByBoard[board.id], board.id),
        specialPolygons: normalizeSpecialPolygonMap(state.specialPolygonsByBoard[board.id], board.id),
        playAreas: getPlayAreas(board.id).map((area) => ({
          id: area.id,
          name: area.name,
          polygon: normalizeShipPolygon(area.polygon),
        })),
        selectedPlayAreaId: getSelectedPlayAreaId(board.id),
        playAreaPolygon: normalizeShipPolygon(state.shipPolygonsByBoard[board.id]),
        roomFx: normalizeRoomFxProfile(state.roomFxByBoard?.[board.id]),
        insideFx: normalizeInsideFxProfile(state.insideFxByBoard[board.id]),
        outsideFx: normalizeOutsideFxProfile(state.outsideFxByBoard[board.id]),
      },
    ]),
  );
}

function buildPersistedRuntimeSettingsFromState() {
  const mp4Controls = getMp4PerformanceControls();
  return {
    audio: {
      enabled: Boolean(state.audio.enabled),
      volume: Math.max(0, Math.min(1, Number(state.audio.volume) || 0)),
    },
    animationSpeed: clampAnimationSpeed(state.animationSpeed),
    animationSoundMap: normalizeAnimationSoundMap(state.animationSoundMap),
    mp4Performance: {
      tier: mp4Controls.tier,
      renderCap: mp4Controls.renderCap,
      qualityFloor: mp4Controls.qualityFloor,
      degradeThreshold: mp4Controls.degradeThreshold,
      recoverThreshold: mp4Controls.recoverThreshold,
    },
  };
}

function buildBoardProfileStoragePayload() {
  return {
    schema: "tt-beamer.board-profiles.v3",
    savedAt: new Date().toISOString(),
    boards: buildBoardProfilesFromState(),
    ...buildPersistedRuntimeSettingsFromState(),
  };
}

function applyPersistedRuntimeSettings(payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  if (payload.audio && typeof payload.audio === "object") {
    state.audio.enabled = Boolean(payload.audio.enabled);
    const nextVolume = Number(payload.audio.volume);
    if (Number.isFinite(nextVolume)) {
      state.audio.volume = Math.max(0, Math.min(1, nextVolume));
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "animationSpeed")) {
    state.animationSpeed = clampAnimationSpeed(payload.animationSpeed);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "animationSoundMap")) {
    state.animationSoundMap = normalizeAnimationSoundMap(payload.animationSoundMap);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "mp4Performance")) {
    state.runtimePerf.mp4Controls = normalizeMp4PerformanceControls(payload.mp4Performance);
  }
}

function applyBoardProfilesToState(profiles) {
  BOARDS = BOARDS.map((board) => {
    const deletedRoomIds = normalizeRoomTombstoneIds(
      profiles?.[board.id]?.deletedRoomIds ?? profiles?.[board.id]?.roomTombstones,
      board.id,
    );
    const roomCatalog = profiles?.[board.id]?.roomCatalog ?? profiles?.[board.id]?.rooms ?? null;
    const nextBoard = applyRoomCatalog(board, roomCatalog, deletedRoomIds);
    nextBoard.roomClusters = Array.isArray(profiles?.[board.id]?.roomClusters)
      ? profiles[board.id].roomClusters.map((cluster) => ({ ...cluster }))
      : Array.isArray(nextBoard.roomClusters)
        ? nextBoard.roomClusters.map((cluster) => ({ ...cluster }))
        : [];
    return nextBoard;
  });
  state.roomTombstonesByBoard = Object.fromEntries(
    BOARDS.map((board) => [
      board.id,
      normalizeRoomTombstoneIds(
        profiles?.[board.id]?.deletedRoomIds ?? profiles?.[board.id]?.roomTombstones,
        board.id,
      ),
    ]),
  );
  state.hitareaCalibrationByBoard = Object.fromEntries(
    BOARDS.map((board) => [
      board.id,
      normalizeHitareaCalibration(profiles?.[board.id]?.hitareaCalibration),
    ]),
  );
  state.roomGeometryByBoard = Object.fromEntries(
    BOARDS.map((board) => [
      board.id,
      normalizeRoomGeometryMap(profiles?.[board.id]?.roomGeometry, board.id),
    ]),
  );
  state.roomStateProfilesByBoard = Object.fromEntries(
    BOARDS.map((board) => [
      board.id,
      normalizeRoomStateProfileMap(profiles?.[board.id]?.roomStateProfiles, board.id),
    ]),
  );
  state.specialPolygonsByBoard = Object.fromEntries(
    BOARDS.map((board) => [
      board.id,
      normalizeSpecialPolygonMap(
        profiles?.[board.id]?.specialPolygons,
        board.id,
        state.specialPolygonsByBoard?.[board.id],
      ),
    ]),
  );
  state.playAreasByBoard = Object.fromEntries(
    BOARDS.map((board) => {
      const profile = profiles?.[board.id] ?? {};
      const migratedPlayAreas = normalizePlayAreasCollection(
        profile.playAreas,
        profile.playAreaPolygon ?? profile.shipPolygon ?? profile.shipMask ?? SHIP_POLYGON_DEFAULT,
      );
      return [board.id, migratedPlayAreas];
    }),
  );
  state.selectedPlayAreaIdByBoard = Object.fromEntries(
    BOARDS.map((board) => {
      const profile = profiles?.[board.id] ?? {};
      const areas = state.playAreasByBoard[board.id] ?? normalizePlayAreasCollection(null, SHIP_POLYGON_DEFAULT);
      const preferred = String(profile.selectedPlayAreaId || "").trim();
      const selected = areas.some((area) => area.id === preferred) ? preferred : areas[0]?.id ?? "play-area-1";
      return [board.id, selected];
    }),
  );
  state.shipPolygonsByBoard = Object.fromEntries(
    BOARDS.map((board) => {
      const selected = getSelectedPlayArea(board.id);
      return [board.id, normalizeShipPolygon(selected?.polygon ?? SHIP_POLYGON_DEFAULT)];
    }),
  );
  state.outsideFxByBoard = Object.fromEntries(
    BOARDS.map((board) => [board.id, normalizeOutsideFxProfile(profiles?.[board.id]?.outsideFx)]),
  );
  state.roomFxByBoard = Object.fromEntries(
    BOARDS.map((board) => [board.id, normalizeRoomFxProfile(profiles?.[board.id]?.roomFx)]),
  );
  state.insideFxByBoard = Object.fromEntries(
    BOARDS.map((board) => [board.id, normalizeInsideFxProfile(profiles?.[board.id]?.insideFx)]),
  );
}

function extractBoardProfilesCandidate(raw) {
  return extractBoardProfilesCandidateFromPersistence(raw, BOARDS);
}

// Phase 13-1: legacy localStorage readers are disabled. The server-stored
// global config is the only persistent source. These stubs return defaults
// so the migration path into buildMigratedBoardProfiles still works.
function loadLegacyRoomGeometryByBoard() {
  return createDefaultRoomGeometryByBoard();
}

function loadLegacySpecialPolygonsByBoard() {
  return createDefaultSpecialPolygonsByBoard();
}

function buildMigratedBoardProfiles(candidate, legacyHitarea, legacyRoomGeometry, legacySpecialPolygons) {
  return buildMigratedBoardProfilesFromPersistence({
    boards: BOARDS,
    candidate,
    legacyHitarea,
    legacyRoomGeometry,
    legacySpecialPolygons,
    createDefaultBoardProfiles,
    createDefaultRoomGeometryMap,
    createDefaultRoomStateProfileMap,
    createDefaultSpecialPolygonMap,
    HITAREA_CALIBRATION_DEFAULT,
    SHIP_POLYGON_DEFAULT,
    createDefaultRoomAnimationDefinitions,
    createDefaultInsideAnimationDefinitions,
    OUTSIDE_FX_DEFAULT,
  });
}

// Phase 13-1: localStorage hydration is replaced. The startup path calls
// `hydrateFromBootstrapGlobalConfig` with the payload already fetched from
// the server. If no payload is available, we apply defaults so the runtime
// still has valid state (the blocking error overlay handles user-visible
// messaging separately).
function loadBoardProfiles() {
  const legacyHitarea = loadHitareaCalibrationMap();
  const legacyRoomGeometry = loadLegacyRoomGeometryByBoard();
  const legacySpecialPolygons = loadLegacySpecialPolygonsByBoard();

  const bootstrapPayload = window.__TT_BEAMER_BOOTSTRAP_CONFIG__ || null;
  if (bootstrapPayload && typeof bootstrapPayload === "object") {
    const candidate = extractBoardProfilesCandidate(bootstrapPayload);
    if (candidate) {
      const migratedProfiles = buildMigratedBoardProfiles(
        candidate,
        legacyHitarea,
        legacyRoomGeometry,
        legacySpecialPolygons,
      );
      applyBoardProfilesToState(migratedProfiles);
      applyPersistedRuntimeSettings(bootstrapPayload);
      return;
    }
  }

  const migratedLegacyProfiles = buildMigratedBoardProfiles(
    null,
    legacyHitarea,
    legacyRoomGeometry,
    legacySpecialPolygons,
  );
  applyBoardProfilesToState(migratedLegacyProfiles);
}

// Phase 13-HF3: opt-in save. Every mutation flips the local dirty flag.
// No server traffic until the user clicks the Apply button. This is a
// direct reversal of Phase 13-1's debounced auto-save, per user feedback:
// they want fewer accidental config changes to reach the global state.
function persistBoardProfiles() {
  markLocalConfigDirty("board-profiles-mutated");
  return { ok: true, target: "local-dirty", routing: "opt-in" };
}

function markLocalConfigDirty(reason) {
  state.localConfigDirty = true;
  refreshApplyDiscardButtonsUi();
  if (globalDefaultsStatus) {
    globalDefaultsStatus.textContent =
      `Local config: unsaved changes (${reason || "mutation"}). Click Apply to push to server.`;
  }
}

function clearLocalConfigDirty(reasonText) {
  state.localConfigDirty = false;
  state.remoteConfigUpdateAwaiting = false;
  refreshApplyDiscardButtonsUi();
  if (globalDefaultsStatus) {
    globalDefaultsStatus.textContent = reasonText || "Global config: synced";
  }
}

function refreshApplyDiscardButtonsUi() {
  const bar = document.getElementById("apply-global-config-bar");
  const applyButton = document.getElementById("apply-global-config");
  const discardButton = document.getElementById("discard-global-config");
  const indicator = document.getElementById("apply-global-config-indicator");
  const dirty = Boolean(state.localConfigDirty);
  const remoteAwaiting = Boolean(state.remoteConfigUpdateAwaiting);
  if (bar) {
    bar.classList.toggle("is-dirty", dirty || remoteAwaiting);
  }
  if (applyButton) {
    applyButton.disabled = !dirty;
    applyButton.textContent = dirty
      ? `Apply changes (unsaved)${remoteAwaiting ? " - overrides remote" : ""}`
      : "Apply changes (no pending edits)";
    applyButton.classList.toggle("has-unsaved", dirty);
  }
  if (discardButton) {
    discardButton.disabled = !(dirty || remoteAwaiting);
    discardButton.textContent = remoteAwaiting
      ? "Discard (load server version)"
      : "Discard local changes";
  }
  if (indicator) {
    if (remoteAwaiting) {
      indicator.textContent =
        "Server-Config wurde von einem anderen Client geaendert. Apply ueberschreibt die Serverversion, Discard laedt sie.";
      indicator.style.display = "";
    } else if (dirty) {
      indicator.textContent = "Lokale Aenderungen sind nicht gespeichert.";
      indicator.style.display = "";
    } else {
      indicator.textContent = "";
      indicator.style.display = "none";
    }
  }
}

async function applyLocalConfigToServer() {
  if (!state.localConfigDirty) return { ok: true, nothingToDo: true };
  try {
    await saveGlobalDefaultsToServer();
    clearLocalConfigDirty("Global config: pushed local changes to server");
    return { ok: true };
  } catch (error) {
    const message = String(error?.message || error || "unknown");
    console.warn("[global-config] apply failed:", message);
    if (globalDefaultsStatus) {
      globalDefaultsStatus.textContent = `Global config: apply failed (${message})`;
    }
    return { ok: false, error: message };
  }
}

async function discardLocalConfigAndReloadFromServer() {
  try {
    const loaded = await fetchGlobalDefaultsPayload();
    applyGlobalDefaultsPayloadToState(loaded.payload);
    syncRuntimePanelsFromState();
    renderRunningAnimationsList();
    refreshGlobalButtons();
    clearLocalConfigDirty("Global config: discarded local changes, reloaded from server");
    return { ok: true };
  } catch (error) {
    const message = String(error?.message || error || "unknown");
    console.warn("[global-config] discard reload failed:", message);
    if (globalDefaultsStatus) {
      globalDefaultsStatus.textContent = `Global config: discard reload failed (${message})`;
    }
    return { ok: false, error: message };
  }
}

// Phase 13-1: blocking error overlay shown when the server is unreachable
// at startup. User sees "Server nicht erreichbar — Retry". Clicking Retry
// re-attempts the hydration; on success the overlay disappears.
function renderServerUnreachableOverlay(error) {
  const existing = document.getElementById("tt-beamer-server-unreachable-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "tt-beamer-server-unreachable-overlay";
  overlay.setAttribute("role", "alertdialog");
  overlay.setAttribute("aria-live", "assertive");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(10, 12, 18, 0.94)",
    color: "#f4f7ff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "18px",
    fontFamily: "system-ui, sans-serif",
    fontSize: "16px",
    zIndex: "99999",
    padding: "32px",
    textAlign: "center",
  });

  const title = document.createElement("h1");
  title.textContent = "Server nicht erreichbar";
  title.style.fontSize = "24px";
  title.style.margin = "0";
  overlay.append(title);

  const detail = document.createElement("p");
  detail.textContent = String(error?.message || error || "Unknown error");
  detail.style.margin = "0";
  detail.style.maxWidth = "640px";
  detail.style.opacity = "0.85";
  overlay.append(detail);

  const info = document.createElement("p");
  info.textContent =
    "Die globale Config wird ausschließlich vom Server geladen. "
    + "Starte den Server und klicke Retry, um die App zu laden.";
  info.style.margin = "0";
  info.style.maxWidth = "640px";
  info.style.opacity = "0.75";
  overlay.append(info);

  const retryButton = document.createElement("button");
  retryButton.textContent = "Retry";
  retryButton.type = "button";
  Object.assign(retryButton.style, {
    padding: "10px 24px",
    fontSize: "16px",
    background: "#4c8bff",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  });
  retryButton.addEventListener("click", async () => {
    retryButton.disabled = true;
    retryButton.textContent = "Retrying...";
    try {
      const loaded = await fetchGlobalDefaultsPayload();
      window.__TT_BEAMER_BOOTSTRAP_CONFIG__ = loaded.payload;
      applyGlobalDefaultsPayloadToState(loaded.payload);
      syncRuntimePanelsFromState();
      overlay.remove();
      if (globalDefaultsStatus) {
        globalDefaultsStatus.textContent =
          `Global config: recovered after retry (${loaded.endpoint || "server-config"})`;
      }
    } catch (retryError) {
      retryButton.disabled = false;
      retryButton.textContent = "Retry";
      detail.textContent = String(retryError?.message || retryError || "Unknown error");
    }
  });
  overlay.append(retryButton);

  document.body.append(overlay);
}

function buildGlobalDefaultsPayload() {
  // Phase 13-1: state is the single source of truth. No localStorage merge.
  const stateProfiles = buildBoardProfilesFromState();

  return {
    schema: "tt-beamer.global-defaults.v1",
    savedAt: new Date().toISOString(),
    source: "runtime-state",
    boardProfiles: stateProfiles,
    ...buildPersistedRuntimeSettingsFromState(),
  };
}

async function saveGlobalDefaultsToServer() {
  const payload = buildGlobalDefaultsPayload();
  return getGlobalDefaultsApiFacade().saveGlobalDefaults(payload);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw buildGlobalDefaultsSaveError({
        code: "API_UNREACHABLE",
        details: `timeout after ${API_REQUEST_TIMEOUT_MS}ms`,
        endpoint: url,
        method: options.method ?? "GET",
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

let globalDefaultsApiFacade = null;

function getGlobalDefaultsApiFacade() {
  if (globalDefaultsApiFacade) {
    return globalDefaultsApiFacade;
  }
  globalDefaultsApiFacade = window.TT_BEAMER_API.createGlobalDefaultsApiFacade({
    // Phase 13-1: apiBase override no longer consults localStorage.
    apiBaseUrlParamKeys: API_BASE_URL_PARAM_KEYS,
    apiPortFallbacks: API_PORT_FALLBACKS,
    localApiHosts: LOCAL_API_HOSTS,
    requestTimeoutMs: API_REQUEST_TIMEOUT_MS,
    fetchWithTimeout,
    location: window.location,
  });
  return globalDefaultsApiFacade;
}

async function runApiPreflight(saveEndpoint) {
  return getGlobalDefaultsApiFacade().runApiPreflight(saveEndpoint);
}

function classifyHttpStatus(status) {
  return getGlobalDefaultsApiFacade().classifyHttpStatus(status);
}

function getApiBaseFromSaveEndpoint(saveEndpoint) {
  try {
    const url = new URL(saveEndpoint);
    return url.origin;
  } catch {
    return window.location?.origin || "http://127.0.0.1:4173";
  }
}

function resolveGlobalDefaultsApiCandidates() {
  return getGlobalDefaultsApiFacade().resolveGlobalDefaultsApiCandidates();
}

function readConfiguredApiBase() {
  const globalBase = normalizeApiBase(window.__TT_BEAMER_API_BASE__);
  if (globalBase) {
    return {
      base: globalBase,
      source: "override:window.__TT_BEAMER_API_BASE__",
    };
  }

  const queryBase = readApiBaseFromQuery();
  if (queryBase) {
    return queryBase;
  }

  // Phase 13-1: no localStorage fallback. Window global or URL query only.
  return null;
}

function readApiBaseFromQuery() {
  try {
    const params = new URLSearchParams(window.location?.search || "");
    for (const key of API_BASE_URL_PARAM_KEYS) {
      const value = normalizeApiBase(params.get(key));
      if (value) {
        return {
          base: value,
          source: `override:url(${key})`,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeApiBase(value) {
  return getGlobalDefaultsApiFacade().normalizeApiBase(value);
}

function getUiHostName() {
  try {
    return String(window.location?.hostname || "").toLowerCase();
  } catch {
    return "";
  }
}

function getUiProtocol() {
  const protocol = String(window.location?.protocol || "http:").toLowerCase();
  return protocol === "https:" ? "https:" : "http:";
}

function isLocalApiHost(hostname) {
  if (!hostname) {
    return false;
  }
  const normalized = String(hostname).toLowerCase();
  return LOCAL_API_HOSTS.has(normalized) || normalized.startsWith("127.");
}

function classifyFailedSaveResponse(response, details) {
  return getGlobalDefaultsApiFacade().classifyFailedSaveResponse(response, details);
}

function classifyFailedHealthResponse(response, details) {
  if (isStaticOnlyHealthResponse(response, details)) {
    return "STATIC_ONLY_SERVER";
  }
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const body = String(details || "").toLowerCase();
  if (contentType.includes("text/html") || body.includes("<html") || body.includes("<!doctype")) {
    return "API_HTML_ERROR";
  }
  if (response.status >= 500) {
    return "API_SERVER_ERROR";
  }
  return "API_HEALTH_FAILED";
}

function isStaticOnlyHealthResponse(response, details) {
  const status = Number(response?.status);
  if (status !== 404) {
    return false;
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const serverHeader = String(response.headers.get("server") || "").toLowerCase();
  const body = String(details || "").toLowerCase();

  const headerSignals =
    serverHeader.includes("simplehttp") ||
    serverHeader.includes("python") ||
    serverHeader.includes("http.server") ||
    serverHeader.includes("static") ||
    serverHeader.includes("file");
  const bodySignals =
    body.includes("error response") ||
    body.includes("error code: 404") ||
    body.includes("file not found") ||
    body.includes("directory listing") ||
    body.includes("/api/health") ||
    body.includes("cannot get /api/health") ||
    body.includes("not found");

  return headerSignals || (contentType.includes("text/html") && bodySignals);
}

function buildGlobalDefaultsSaveError({
  code,
  status = null,
  statusClass = "n/a",
  details = "",
  endpoint = "",
  method = "POST",
  routing = null,
}) {
  return getGlobalDefaultsApiFacade().buildGlobalDefaultsSaveError({
    code,
    status,
    statusClass,
    details,
    endpoint,
    method,
    routing,
  });
}

function getApiHostName(base) {
  try {
    return String(new URL(base).hostname || "").toLowerCase();
  } catch {
    return "";
  }
}

function formatGlobalDefaultsSaveError(error) {
  const code = error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN";
  const endpoint =
    error && typeof error === "object" && "endpoint" in error ? String(error.endpoint || "") : "unknown";
  const method =
    error && typeof error === "object" && "method" in error ? String(error.method || "POST") : "POST";
  const status = error && typeof error === "object" && "status" in error ? error.status : null;
  const statusClass =
    error && typeof error === "object" && "statusClass" in error
      ? String(error.statusClass || classifyHttpStatus(status))
      : classifyHttpStatus(status);
  const routing = error && typeof error === "object" && "routing" in error ? error.routing : null;
  const snapshot = buildResolveSnapshot({ routing, endpoint, method });
  const endpointMeta = `${method} ${endpoint} | Status ${status ?? "n/a"} (${statusClass})`;
  const startHint = buildGuidedFixHint({ routing, endpoint });
  const hostMeta = formatResolveSnapshot(snapshot);
  if (code === "STATIC_ONLY_SERVER") {
    return {
      statusText: `Save blocked - static-only server active, save not possible (${hostMeta}; ${endpointMeta}).`,
      feedbackText:
        `Status: Static-only server active, save not possible (${hostMeta}; ${endpointMeta}). ${startHint}`,
      diagnoseStatusText: `API diagnostics: static-only server active, save not possible (${hostMeta}; ${endpointMeta})`,
    };
  }
  if (
    code === "API_UNREACHABLE" ||
    code === "API_HTML_ERROR" ||
    code === "API_METHOD_UNAVAILABLE" ||
    code === "API_HEALTH_FAILED"
  ) {
    return {
      statusText: `Save failed - API endpoint is not save-capable (${hostMeta}; ${endpointMeta}).`,
      feedbackText: `Status: API for global defaults is not available (${hostMeta}; ${endpointMeta}). ${startHint}`,
      diagnoseStatusText: `API diagnostics: API endpoint is not save-capable (${hostMeta}; ${endpointMeta})`,
    };
  }
  if (code === "API_SERVER_ERROR") {
    return {
      statusText: `Save failed - API server error (${hostMeta}; ${endpointMeta}).`,
      feedbackText: `Status: API server did not process the save request (${hostMeta}; ${endpointMeta}).`,
      diagnoseStatusText: `API diagnostics: API server error (${hostMeta}; ${endpointMeta})`,
    };
  }
  return {
    statusText: `Save failed - please check the save setup (${hostMeta}; ${endpointMeta}).`,
    feedbackText: `Status: Save failed (${hostMeta}; ${endpointMeta}). ${startHint}`,
    diagnoseStatusText: `API diagnostics: failed (${hostMeta}; ${endpointMeta})`,
  };
}

function formatResolverSourceLabel(source) {
  return source || "unknown";
}

function buildResolveSnapshot({ routing = null, endpoint = "", method = "POST" } = {}) {
  return {
    uiHost: routing?.uiHost || getUiHostName() || "unknown",
    apiHost: routing?.apiHost || getApiHostName(getApiBaseFromSaveEndpoint(endpoint)) || "unknown",
    source: formatResolverSourceLabel(routing?.source),
    endpoint,
    method,
  };
}

function formatResolveSnapshot(snapshot) {
  if (!snapshot) {
    return "UI host unknown -> API host unknown | Source unknown | Endpoint unknown";
  }
  return `UI host ${snapshot.uiHost} -> API host ${snapshot.apiHost} | Source ${snapshot.source} | Endpoint ${snapshot.method} ${snapshot.endpoint}`;
}

function formatHostFlow(routing) {
  const uiHost = routing?.uiHost || getUiHostName() || "unknown";
  const apiHost = routing?.apiHost || "unknown";
  return `UI host ${uiHost} -> API host ${apiHost}`;
}

function getRemoteMismatchHint(routing) {
  const uiHost = routing?.uiHost || getUiHostName();
  const apiHost = routing?.apiHost || "";
  if (!uiHost || !apiHost) {
    return null;
  }
  if (!isLocalApiHost(uiHost) && isLocalApiHost(apiHost)) {
    return "Remote/LAN hint: UI is running remotely, but API points to localhost. Set ?ttApiBase=http://<SERVER-IP>:4173 or open the UI directly from the server host.";
  }
  return null;
}

function buildGuidedFixHint({ routing, endpoint } = {}) {
  const port = getEndpointPort(endpoint);
  const uiHost = routing?.uiHost || getUiHostName() || "<SERVER-IP>";
  const apiHost = routing?.apiHost || uiHost;
  const remoteHint = getRemoteMismatchHint(routing);
  const serverStartCmd = `node server.mjs --host 0.0.0.0 --port ${port}`;
  const envStartCmd = `HOST=0.0.0.0 PORT=${port} node server.mjs`;
  const verifyUrl = `http://${apiHost}:${port}`;
  const uiUrl = `http://${uiHost}:${port}`;
  const baseHint =
    `Next steps (headless/LAN): stop \`python3 -m http.server ${port}\` if running (static-only) and start \`${serverStartCmd}\` ` +
    `(alternative: \`${envStartCmd}\`). Then verify API at ${verifyUrl}/api/health and open the UI at ${uiUrl}.`;
  return remoteHint ? `${baseHint} ${remoteHint}` : baseHint;
}

function getEndpointPort(endpoint) {
  try {
    const parsed = new URL(endpoint);
    if (parsed.port) {
      return Number(parsed.port) || 4173;
    }
    return parsed.protocol === "https:" ? 443 : 80;
  } catch {
    return 4173;
  }
}

function downloadGlobalDefaultsFallback() {
  const payload = buildGlobalDefaultsPayload();
  const stamp = payload.savedAt.replace(/[.:]/g, "-");
  const fileName = `global-defaults-download-export-${stamp}.json`;
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return fileName;
}

function hasStoredBoardProfilesInLocalStorage() {
  // Phase 13-1: localStorage board-profile persistence was removed. The
  // function name is kept for ABI stability of downstream callers but it
  // now always returns false — the server is the only persistent source.
  return false;
}

function listGlobalDefaultsLoadCandidates() {
  const seen = new Set();
  const candidates = [];

  function addCandidate(endpoint, source, routing = null) {
    if (!endpoint || seen.has(endpoint)) {
      return;
    }
    seen.add(endpoint);
    candidates.push({ endpoint, source, routing });
  }

  for (const candidate of resolveGlobalDefaultsApiCandidates()) {
    addCandidate(candidate.endpoint, candidate.source, candidate);
  }

  const origin = window.location?.origin;
  if (origin) {
    addCandidate(`${origin}/config/global-defaults.json`, "static:ui-origin-config");
  }
  addCandidate("/config/global-defaults.json", "static:relative-config");

  return candidates;
}

async function fetchGlobalDefaultsPayload() {
  return getGlobalDefaultsApiFacade().fetchGlobalDefaultsPayload();
}

function applyGlobalDefaultsPayloadToState(payload) {
  const boardCandidate = extractBoardProfilesCandidate(payload);
  if (boardCandidate) {
    const migratedProfiles = buildMigratedBoardProfiles(
      boardCandidate,
      state.hitareaCalibrationByBoard,
      state.roomGeometryByBoard,
      state.specialPolygonsByBoard,
    );
    const canonicalIssues = collectCanonicalPlayAreaIssuesFromProfiles(boardCandidate, {
      sourceLabel: "global-defaults",
    });
    applyBoardProfilesToState(migratedProfiles);
    reportCanonicalPolygonIssues(canonicalIssues, {
      sourceLabel: "global-defaults",
    });
  }

  if (payload?.audio && typeof payload.audio === "object") {
    state.audio.enabled = Boolean(payload.audio.enabled);
    const nextVolume = Number(payload.audio.volume);
    if (Number.isFinite(nextVolume)) {
      state.audio.volume = Math.max(0, Math.min(1, nextVolume));
    }
  }

  if (payload && Object.prototype.hasOwnProperty.call(payload, "animationSpeed")) {
    state.animationSpeed = clampAnimationSpeed(payload.animationSpeed);
  }

  if (payload && Object.prototype.hasOwnProperty.call(payload, "animationSoundMap")) {
    state.animationSoundMap = normalizeAnimationSoundMap(payload.animationSoundMap);
  }
}

async function autoLoadGlobalDefaultsForFreshDevice({ force = false } = {}) {
  if (!force && hasStoredBoardProfilesInLocalStorage()) {
    return {
      attempted: false,
      applied: false,
      reason: "local-profiles-present",
    };
  }

  const loaded = await fetchGlobalDefaultsPayload();
  applyGlobalDefaultsPayloadToState(loaded.payload);
  const persisted = persistBoardProfiles();
  return {
    attempted: true,
    applied: true,
    persisted,
    source: loaded.source,
    endpoint: loaded.endpoint,
    routing: loaded.routing,
  };
}

async function loadAndApplyGlobalDefaults({ sourceLabel = "manual" } = {}) {
  const loaded = await fetchGlobalDefaultsPayload();
  applyGlobalDefaultsPayloadToState(loaded.payload);
  const persisted = persistBoardProfiles();
  syncRuntimePanelsFromState();
  renderRunningAnimationsList();
  refreshGlobalButtons();

  const snapshot = buildResolveSnapshot({
    routing: loaded.routing,
    endpoint: loaded.endpoint,
    method: "GET",
  });
  globalDefaultsStatus.textContent =
    `Global Defaults: loaded & applied (${formatResolveSnapshot(snapshot)} | Source ${sourceLabel})`;
  apiDiagnoseStatus.textContent =
    `API diagnostics: OK (${formatResolveSnapshot(snapshot)} | GET /api/global-defaults or config/global-defaults.json)`;
  triggerFeedback.textContent =
    `Status: Defaults loaded & applied (${formatResolveSnapshot(snapshot)} | ${sourceLabel})`;

  return {
    snapshot,
    persisted,
    endpoint: loaded.endpoint,
    routing: loaded.routing,
  };
}

function createDefaultHitareaCalibrationMap() {
  return Object.fromEntries(
    BOARDS.map((board) => [board.id, { ...HITAREA_CALIBRATION_DEFAULT }]),
  );
}

function loadHitareaCalibrationMap() {
  // Phase 13-1: localStorage persistence removed; defaults only. Per-board
  // calibration now flows through the server-backed global-defaults payload
  // (boardProfiles[*].hitareaCalibration).
  return createDefaultHitareaCalibrationMap();
}

function persistHitareaCalibrationMap() {
  return persistBoardProfiles();
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

function getRoomCenterForZoom(boardId = state.boardId, roomId = getActivePolygonRoomId(boardId)) {
  const room = getBoard(boardId).rooms.find((entry) => entry.id === roomId);
  if (!room) {
    return {
      x: BOARD_ZOOM_DEFAULT.originX,
      y: BOARD_ZOOM_DEFAULT.originY,
    };
  }
  const points = getRoomPoints(room, boardId);
  if (!points.length) {
    const fallback = getRawRoomCenter(room, boardId);
    return { x: fallback.x, y: fallback.y };
  }
  const center = points.reduce(
    (acc, [x, y]) => ({ x: acc.x + x / 1000, y: acc.y + y / 1000 }),
    { x: 0, y: 0 },
  );
  return {
    x: center.x / points.length,
    y: center.y / points.length,
  };
}

function syncStageZoomTransform() {
  const zoom = state.uiView === "settings"
    ? getBoardZoom(state.boardId)
    : BOARD_ZOOM_DEFAULT;
  stage.style.setProperty("--stage-zoom-scale", String(zoom.scale));
  stage.style.setProperty("--stage-pan-x", `${zoom.panX.toFixed(2)}px`);
  stage.style.setProperty("--stage-pan-y", `${zoom.panY.toFixed(2)}px`);
}

function syncBoardZoomStatus() {
  const zoom = getBoardZoom(state.boardId);
  const percent = Math.round(zoom.scale * 100);
  const bounds = getStagePanBounds(zoom.scale);
  const modeLabel = state.panMode.active
    ? "PAN active (dragging)"
    : state.panMode.spacePressed
      ? "PAN ready (Space pressed)"
      : "Edit mode";
  boardZoomStatus.textContent = `Zoom: ${percent}% (Min ${Math.round(BOARD_ZOOM_SCALE_MIN * 100)}%, Max ${Math.round(BOARD_ZOOM_SCALE_MAX * 100)}%) | Pan X ${Math.round(zoom.panX)}px, Y ${Math.round(zoom.panY)}px | Bounds ±${Math.round(bounds.maxPanX)}px/±${Math.round(bounds.maxPanY)}px`;
  if (boardPanStatus) {
    const hint = zoom.scale > 1
      ? "Space + drag or middle mouse button: move board"
      : "Pan is available above zoom > 100%";
    boardPanStatus.textContent = `Pan status: ${modeLabel} | ${hint}`;
  }
}

function syncBoardZoomPanel() {
  // Phase 13-2: zoom slider removed. This function is kept for ABI stability
  // of the ~20 call sites that use it — it still refreshes the status line
  // and the stage transform, it just no longer writes to a slider/label.
  syncPolygonHandleSizePanel();
  syncBoardZoomStatus();
  syncStageZoomTransform();
}

function syncPolygonHandleSizePanel() {
  const percent = Math.round(getCurrentPolygonHandleScale() * 100);
  if (polygonHandleSizeInput) {
    polygonHandleSizeInput.value = String(percent);
  }
  if (polygonHandleSizeValue) {
    polygonHandleSizeValue.textContent = `${percent}%`;
  }
}

function updateCurrentBoardZoom(partial, statusText = null) {
  const current = getBoardZoom(state.boardId);
  const next = clampPanToBounds({
    ...current,
    ...partial,
  });
  setBoardZoom(state.boardId, next);
  syncBoardZoomPanel();
  setPanCursorState();
  if (statusText) {
    triggerFeedback.textContent = `Status: ${statusText}`;
  }
}

// Phase 13-HF5: rAF-coalesced zoom/pan writer. Called from high-frequency
// pan/zoom pointermove paths (touch pan, mouse wheel, pinch). Collapses
// many same-frame calls into a single updateCurrentBoardZoom() + DOM
// write per animation frame, which eliminates the mobile lag seen in
// HF4 touch pan.
let pendingZoomUpdate = null;
let pendingZoomFrameHandle = null;
function scheduleZoomUpdate(partial, statusText = null) {
  pendingZoomUpdate = pendingZoomUpdate
    ? { ...pendingZoomUpdate, ...partial, statusText: statusText ?? pendingZoomUpdate.statusText }
    : { ...partial, statusText };
  if (pendingZoomFrameHandle !== null) return;
  pendingZoomFrameHandle = window.requestAnimationFrame(() => {
    pendingZoomFrameHandle = null;
    const payload = pendingZoomUpdate || {};
    pendingZoomUpdate = null;
    const { statusText: pendingStatus, ...rest } = payload;
    updateCurrentBoardZoom(rest, pendingStatus ?? null);
  });
}

function fitZoomToActiveSpecialRoom() {
  const roomId = getActivePolygonRoomId(state.boardId);
  const room = getBoard(state.boardId).rooms.find((entry) => entry.id === roomId);
  if (!room) {
    updateCurrentBoardZoom(BOARD_ZOOM_DEFAULT, "Zoom reset to default");
    return;
  }

  const points = getRoomPoints(room, state.boardId).map(([x, y]) => [x / 1000, y / 1000]);
  if (!points.length) {
    updateCurrentBoardZoom(BOARD_ZOOM_DEFAULT, "Zoom reset to default");
    return;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const boxSize = Math.max(0.05, maxX - minX, maxY - minY);
  const targetCoverage = 0.45;
  const scale = clampBoardZoomScale(targetCoverage / boxSize);
  const center = getRoomCenterForZoom(state.boardId, room.id);
  const viewport = computePanForZoomFocus(scale, center);
  updateCurrentBoardZoom(viewport, `${room.name ?? room.label} zoomed (${Math.round(scale * 100)}%)`);
}

function canStartPanModeFromEvent(event) {
  if (state.uiView !== "settings") {
    return false;
  }
  const zoom = getBoardZoom(state.boardId);
  if (zoom.scale <= 1) {
    return false;
  }
  // Phase 13-HF4: touch gestures are routed through the central touch
  // gesture manager (see `touchGesture` state machine below). Mouse pan
  // still uses middle-click or space-drag.
  return event.button === 1 || state.panMode.spacePressed;
}

function isPanArbitrating() {
  return state.panMode.spacePressed || state.panMode.active;
}

function setPanCursorState() {
  const zoom = getBoardZoom(state.boardId);
  const interactive = state.uiView === "settings" && zoom.scale > 1;
  stage.classList.toggle("is-panning", state.panMode.active);
  roomOverlay.classList.toggle("is-pan-enabled", interactive);
  roomOverlay.classList.toggle("is-pan-ready", interactive && state.panMode.spacePressed && !state.panMode.active);
  roomOverlay.classList.toggle("is-panning", state.panMode.active);
  syncBoardZoomStatus();
}

function startPanMode(event, trigger) {
  const zoom = getBoardZoom(state.boardId);
  state.panMode.active = true;
  state.panMode.pointerId = event.pointerId;
  state.panMode.startClientX = event.clientX;
  state.panMode.startClientY = event.clientY;
  state.panMode.startPanX = zoom.panX;
  state.panMode.startPanY = zoom.panY;
  state.panMode.trigger = trigger;
  try {
    roomOverlay.setPointerCapture(event.pointerId);
  } catch {
    // ignore unsupported pointer capture
  }
  setPanCursorState();
  triggerFeedback.textContent = "Status: Pan mode active (moving board)";
}

function endPanMode(event, { canceled = false } = {}) {
  if (!state.panMode.active) {
    return;
  }
  const pointerId = state.panMode.pointerId;
  if (pointerId !== null && event && roomOverlay.hasPointerCapture(pointerId)) {
    roomOverlay.releasePointerCapture(pointerId);
  }
  state.panMode.active = false;
  state.panMode.pointerId = null;
  state.panMode.trigger = null;
  setPanCursorState();
  triggerFeedback.textContent = canceled
    ? "Status: Pan mode canceled"
    : "Status: Pan mode ended";
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

function canDecodeGifFramesWithImageDecoder() {
  return typeof ImageDecoder === "function" && typeof createImageBitmap === "function";
}

function readGifSubBlocks(bytes, startOffset) {
  const chunks = [];
  let cursor = startOffset;
  while (cursor < bytes.length) {
    const chunkLength = bytes[cursor];
    cursor += 1;
    if (chunkLength === 0) {
      break;
    }
    const chunk = bytes.subarray(cursor, cursor + chunkLength);
    chunks.push(chunk);
    cursor += chunkLength;
  }
  return {
    data: chunks,
    nextOffset: cursor,
  };
}

function concatGifSubBlocks(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function decodeGifLzwIndices(minCodeSize, compressedData, expectedPixelCount) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let dictionary = [];

  const resetDictionary = () => {
    dictionary = [];
    const baseSize = 1 << minCodeSize;
    for (let i = 0; i < baseSize; i += 1) {
      dictionary[i] = [i];
    }
    dictionary[clearCode] = [];
    dictionary[endCode] = null;
    codeSize = minCodeSize + 1;
  };

  resetDictionary();

  let bitBuffer = 0;
  let bitCount = 0;
  let byteCursor = 0;

  const readCode = () => {
    while (bitCount < codeSize) {
      if (byteCursor >= compressedData.length) {
        return null;
      }
      bitBuffer |= compressedData[byteCursor] << bitCount;
      bitCount += 8;
      byteCursor += 1;
    }
    const codeMask = (1 << codeSize) - 1;
    const code = bitBuffer & codeMask;
    bitBuffer >>= codeSize;
    bitCount -= codeSize;
    return code;
  };

  const output = [];
  let previous = null;

  while (true) {
    const code = readCode();
    if (code === null || code === endCode) {
      break;
    }
    if (code === clearCode) {
      resetDictionary();
      previous = null;
      continue;
    }

    let entry;
    if (dictionary[code]) {
      entry = dictionary[code];
    } else if (previous) {
      entry = previous.concat(previous[0]);
    } else {
      entry = [];
    }

    for (const value of entry) {
      output.push(value);
      if (output.length >= expectedPixelCount) {
        return output;
      }
    }

    if (previous && entry.length > 0) {
      dictionary.push(previous.concat(entry[0]));
      if (dictionary.length === 1 << codeSize && codeSize < 12) {
        codeSize += 1;
      }
    }

    previous = entry;
  }

  return output;
}

function deinterlaceGifIndices(indices, width, height) {
  const output = new Array(width * height);
  const passes = [
    { start: 0, step: 8 },
    { start: 4, step: 8 },
    { start: 2, step: 4 },
    { start: 1, step: 2 },
  ];
  let sourceCursor = 0;
  for (const pass of passes) {
    for (let y = pass.start; y < height; y += pass.step) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x += 1) {
        output[rowOffset + x] = indices[sourceCursor] ?? 0;
        sourceCursor += 1;
      }
    }
  }
  return output;
}

function readGifColorTable(bytes, offset, tableSize) {
  const colors = [];
  let cursor = offset;
  for (let i = 0; i < tableSize; i += 1) {
    const r = bytes[cursor] ?? 0;
    const g = bytes[cursor + 1] ?? 0;
    const b = bytes[cursor + 2] ?? 0;
    colors.push([r, g, b]);
    cursor += 3;
  }
  return {
    colors,
    nextOffset: cursor,
  };
}

function applyDisposalToGifCanvas(canvasPixels, frameMeta, bgColorRgba) {
  if (!frameMeta) {
    return;
  }
  if (frameMeta.disposal === 2) {
    const [bgR, bgG, bgB, bgA] = bgColorRgba;
    const xStart = Math.max(0, frameMeta.left);
    const yStart = Math.max(0, frameMeta.top);
    const xEnd = Math.min(frameMeta.canvasWidth, frameMeta.left + frameMeta.width);
    const yEnd = Math.min(frameMeta.canvasHeight, frameMeta.top + frameMeta.height);
    for (let y = yStart; y < yEnd; y += 1) {
      for (let x = xStart; x < xEnd; x += 1) {
        const index = (y * frameMeta.canvasWidth + x) * 4;
        canvasPixels[index] = bgR;
        canvasPixels[index + 1] = bgG;
        canvasPixels[index + 2] = bgB;
        canvasPixels[index + 3] = bgA;
      }
    }
  } else if (frameMeta.disposal === 3 && frameMeta.previousCanvasPixels) {
    canvasPixels.set(frameMeta.previousCanvasPixels);
  }
}

function decodeGifPlaybackFramesWithParser(data, entry) {
  const bytes = new Uint8Array(data);
  if (bytes.length < 13) {
    throw new Error("GIF parse failed: payload too small");
  }
  const header = String.fromCharCode(...bytes.subarray(0, 6));
  if (header !== "GIF89a" && header !== "GIF87a") {
    throw new Error(`GIF parse failed: unsupported header ${header}`);
  }

  const logicalWidth = bytes[6] | (bytes[7] << 8);
  const logicalHeight = bytes[8] | (bytes[9] << 8);
  const packed = bytes[10];
  const hasGlobalColorTable = (packed & 0x80) !== 0;
  const globalColorTableSize = hasGlobalColorTable ? 1 << ((packed & 0x07) + 1) : 0;
  const backgroundColorIndex = bytes[11] ?? 0;

  let cursor = 13;
  let globalColorTable = null;
  if (hasGlobalColorTable) {
    const table = readGifColorTable(bytes, cursor, globalColorTableSize);
    globalColorTable = table.colors;
    cursor = table.nextOffset;
  }

  const bgColor = globalColorTable?.[backgroundColorIndex] ?? [0, 0, 0];
  const bgColorRgba = [bgColor[0], bgColor[1], bgColor[2], 0];
  const canvasPixels = new Uint8ClampedArray(logicalWidth * logicalHeight * 4);
  const frames = [];
  let totalDurationMs = 0;

  let pendingGce = {
    delayMs: 100,
    disposal: 0,
    transparentIndex: null,
  };
  let previousFrameMeta = null;

  while (cursor < bytes.length) {
    const blockType = bytes[cursor];
    cursor += 1;

    if (blockType === 0x3b) {
      break;
    }

    if (blockType === 0x21) {
      const label = bytes[cursor];
      cursor += 1;
      if (label === 0xf9) {
        const byteSize = bytes[cursor] ?? 0;
        cursor += 1;
        const gcePacked = bytes[cursor] ?? 0;
        const delayCs = (bytes[cursor + 1] ?? 0) | ((bytes[cursor + 2] ?? 0) << 8);
        const transparentIndex = (gcePacked & 0x01) === 0x01 ? bytes[cursor + 3] ?? null : null;
        const disposal = (gcePacked >> 2) & 0x07;
        cursor += byteSize;
        if (bytes[cursor] === 0x00) {
          cursor += 1;
        }
        pendingGce = {
          delayMs: Math.max(16, delayCs * 10 || 100),
          disposal,
          transparentIndex,
        };
      } else {
        if (label === 0x01 || label === 0xff) {
          const blockSize = bytes[cursor] ?? 0;
          cursor += 1 + blockSize;
        }
        const skipped = readGifSubBlocks(bytes, cursor);
        cursor = skipped.nextOffset;
      }
      continue;
    }

    if (blockType !== 0x2c) {
      throw new Error(`GIF parse failed: unexpected block ${blockType}`);
    }

    applyDisposalToGifCanvas(canvasPixels, previousFrameMeta, bgColorRgba);

    const left = bytes[cursor] | (bytes[cursor + 1] << 8);
    const top = bytes[cursor + 2] | (bytes[cursor + 3] << 8);
    const width = bytes[cursor + 4] | (bytes[cursor + 5] << 8);
    const height = bytes[cursor + 6] | (bytes[cursor + 7] << 8);
    const descriptorPacked = bytes[cursor + 8];
    cursor += 9;

    const hasLocalColorTable = (descriptorPacked & 0x80) !== 0;
    const interlaced = (descriptorPacked & 0x40) !== 0;
    const localColorTableSize = hasLocalColorTable ? 1 << ((descriptorPacked & 0x07) + 1) : 0;

    let activeColorTable = globalColorTable;
    if (hasLocalColorTable) {
      const localTable = readGifColorTable(bytes, cursor, localColorTableSize);
      activeColorTable = localTable.colors;
      cursor = localTable.nextOffset;
    }
    if (!activeColorTable || activeColorTable.length === 0) {
      throw new Error("GIF parse failed: missing color table");
    }

    const lzwMinCodeSize = bytes[cursor] ?? 0;
    cursor += 1;
    const imageDataBlocks = readGifSubBlocks(bytes, cursor);
    cursor = imageDataBlocks.nextOffset;
    const compressedData = concatGifSubBlocks(imageDataBlocks.data);

    const expectedPixelCount = width * height;
    const decodedIndices = decodeGifLzwIndices(lzwMinCodeSize, compressedData, expectedPixelCount);
    const indices = interlaced ? deinterlaceGifIndices(decodedIndices, width, height) : decodedIndices;

    const previousCanvasPixels =
      pendingGce.disposal === 3 ? new Uint8ClampedArray(canvasPixels) : null;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const sourceIndex = y * width + x;
        const paletteIndex = indices[sourceIndex] ?? 0;
        if (pendingGce.transparentIndex !== null && paletteIndex === pendingGce.transparentIndex) {
          continue;
        }
        const color = activeColorTable[paletteIndex] ?? [0, 0, 0];
        const targetX = left + x;
        const targetY = top + y;
        if (targetX < 0 || targetY < 0 || targetX >= logicalWidth || targetY >= logicalHeight) {
          continue;
        }
        const targetOffset = (targetY * logicalWidth + targetX) * 4;
        canvasPixels[targetOffset] = color[0];
        canvasPixels[targetOffset + 1] = color[1];
        canvasPixels[targetOffset + 2] = color[2];
        canvasPixels[targetOffset + 3] = 255;
      }
    }

    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = logicalWidth;
    frameCanvas.height = logicalHeight;
    const frameCtx = frameCanvas.getContext("2d");
    if (!frameCtx) {
      throw new Error("GIF parse failed: 2d context unavailable");
    }
    frameCtx.putImageData(new ImageData(new Uint8ClampedArray(canvasPixels), logicalWidth, logicalHeight), 0, 0);

    const durationMs = pendingGce.delayMs;
    frames.push({ bitmap: frameCanvas, durationMs });
    totalDurationMs += durationMs;

    previousFrameMeta = {
      disposal: pendingGce.disposal,
      left,
      top,
      width,
      height,
      canvasWidth: logicalWidth,
      canvasHeight: logicalHeight,
      previousCanvasPixels,
    };

    pendingGce = {
      delayMs: 100,
      disposal: 0,
      transparentIndex: null,
    };
  }

  if (frames.length === 0) {
    throw new Error("GIF parse failed: no frames decoded");
  }

  entry.frames = frames;
  entry.totalDurationMs = Math.max(16, totalDurationMs);
  entry.status = "ready";
  entry.error = null;
}

function getGifPlaybackCacheEntry(path) {
  if (!path) {
    return null;
  }
  if (!gifPlaybackCacheByPath.has(path)) {
    const entry = {
      status: "idle",
      frames: [],
      totalDurationMs: 0,
      error: null,
      promise: null,
    };
    gifPlaybackCacheByPath.set(path, entry);
  }
  return gifPlaybackCacheByPath.get(path) ?? null;
}

async function decodeGifPlaybackFrames(path, entry) {
  const response = await fetch(path, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`GIF fetch failed (${response.status})`);
  }
  const data = await response.arrayBuffer();
  if (canDecodeGifFramesWithImageDecoder()) {
    const decoder = new ImageDecoder({ data, type: "image/gif" });
    await decoder.tracks.ready;
    const frameCount = Math.max(1, Number(decoder.tracks?.selectedTrack?.frameCount) || 1);
    const frames = [];
    let totalDurationMs = 0;
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const { image } = await decoder.decode({ frameIndex });
      const durationMs = Math.max(16, Math.round((Number(image.duration) || 100000) / 1000));
      const bitmap = await createImageBitmap(image);
      image.close();
      frames.push({ bitmap, durationMs });
      totalDurationMs += durationMs;
    }
    decoder.close?.();
    entry.frames = frames;
    entry.totalDurationMs = Math.max(16, totalDurationMs);
    entry.status = "ready";
    entry.error = null;
    return;
  }

  decodeGifPlaybackFramesWithParser(data, entry);
}

function ensureGifPlaybackReady(path) {
  const entry = getGifPlaybackCacheEntry(path);
  if (!entry) {
    return null;
  }
  if (entry.status === "ready" || entry.status === "loading") {
    return entry;
  }
  entry.status = "loading";
  entry.promise = decodeGifPlaybackFrames(path, entry)
    .catch((error) => {
      logRender.warn("gif_decode_failed", {
        event: "gif-decode-failed",
        boardId: state.boardId,
        path,
        error: String(error?.message || error),
      });
      entry.status = "fallback";
      entry.error = error;
    })
    .finally(() => {
      entry.promise = null;
    });
  return entry;
}

function getGifPlaybackFrame(path, elapsedSeconds) {
  const entry = ensureGifPlaybackReady(path);
  if (!entry || entry.status !== "ready" || entry.frames.length === 0) {
    return null;
  }
  const totalDurationMs = Math.max(16, entry.totalDurationMs || 0);
  let cursorMs = (((Number(elapsedSeconds) || 0) * 1000) % totalDurationMs + totalDurationMs) % totalDurationMs;
  for (const frame of entry.frames) {
    if (cursorMs < frame.durationMs) {
      return frame.bitmap;
    }
    cursorMs -= frame.durationMs;
  }
  return entry.frames[entry.frames.length - 1]?.bitmap ?? null;
}

function resolveRoomGifRenderConfig(type, age, intensity, options = {}) {
  const gifPath = options.gifAssetPath ?? ROOM_GIF_ANIMATION_ASSETS[type];
  const timelineAge = Number(options.gifTimelineAgeSec ?? age) || 0;
  const playbackSpeed = clampGifPlaybackSpeed(options.gifPlaybackSpeed ?? 1);
  return {
    frame: getGifPlaybackFrame(gifPath, timelineAge * playbackSpeed),
    opacity: clampRoomOpacity(options.opacity ?? intensity),
  };
}

function warmGifAssetPath(path, { reason = "runtime" } = {}) {
  if (!path) {
    return;
  }
  const warm = () => {
    ensureGifPlaybackReady(path);
  };
  if (typeof window.requestIdleCallback === "function" && reason !== "trigger") {
    window.requestIdleCallback(() => warm(), { timeout: 450 });
    return;
  }
  warm();
}

function warmRoomGifAssets({ reason = "runtime" } = {}) {
  for (const assetPath of Object.values(ROOM_GIF_ANIMATION_ASSETS)) {
    warmGifAssetPath(assetPath, { reason });
  }
}

function getMediaVideoElement(cacheMap, path) {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) {
    return null;
  }
  if (!cacheMap.has(normalizedPath)) {
    const video = document.createElement("video");
    video.src = normalizedPath;
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;
    video.loop = false;
    video.playsInline = true;
    cacheMap.set(normalizedPath, {
      status: "loading",
      video,
      durationSec: null,
    });
    const entry = cacheMap.get(normalizedPath);
    video.addEventListener("loadedmetadata", () => {
      const durationSec = Number(video.duration);
      if (entry) {
        entry.status = Number.isFinite(durationSec) && durationSec > 0 ? "ready" : "error";
        entry.durationSec = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : null;
      }
    });
    video.addEventListener("error", () => {
      if (entry) {
        entry.status = "error";
      }
    });
  }
  return cacheMap.get(normalizedPath) ?? null;
}

function getOutsideVideoElement(path) {
  return getMediaVideoElement(outsideVideoCacheByPath, path);
}

function prewarmBoardOutsideMp4Asset(boardId, { reason = "board-switch" } = {}) {
  const definition = getSelectedOutsideAnimationDefinition(boardId);
  if (!definition || definition.assetType !== "mp4") {
    return;
  }
  const videoEntry = getOutsideVideoElement(definition.assetRef);
  const video = videoEntry?.video;
  if (!video) {
    return;
  }
  video.preload = "auto";
  if (video.readyState >= 2) {
    return;
  }
  const prime = () => {
    void video.play()
      .then(() => {
        video.pause();
      })
      .catch(() => undefined);
  };
  if (reason === "startup") {
    prime();
    return;
  }
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => prime(), { timeout: 400 });
    return;
  }
  window.setTimeout(() => prime(), 40);
}

function getRoomVideoElement(path) {
  return getMediaVideoElement(roomVideoCacheByPath, path);
}

function clearOutsideMp4PlaybackState(boardId = state.boardId) {
  outsideMp4PlaybackStateByBoard.delete(boardId);
}

function clearOutsideTimelineState(boardId = state.boardId) {
  outsideTimelineStateByBoard.delete(boardId);
}

function buildOutsideLifecycleKey(boardId, definition) {
  if (!definition || typeof definition !== "object") {
    return `${boardId}:outside:missing-definition`;
  }
  return [
    String(boardId || "global").trim() || "global",
    String(definition.id || "outside").trim() || "outside",
    String(definition.assetType || "coded").trim() || "coded",
    String(definition.assetRef || "outside-space").trim() || "outside-space",
    String(definition.mode || "standard").trim() || "standard",
    String(definition.direction || "forward").trim() || "forward",
    Number(definition.speed || 1).toFixed(3),
    Number(definition.intensity || 1).toFixed(3),
  ].join("|");
}

function resolveOutsideElapsedSeconds(now, { boardId = state.boardId, lifecycleKey = "" } = {}) {
  const normalizedLifecycleKey = String(lifecycleKey || "").trim() || `${boardId}:outside:default`;
  const existing = outsideTimelineStateByBoard.get(boardId) ?? null;
  if (!existing || existing.lifecycleKey !== normalizedLifecycleKey) {
    outsideTimelineStateByBoard.set(boardId, {
      lifecycleKey: normalizedLifecycleKey,
      startedAt: Number(now) || performance.now(),
    });
    return 0;
  }
  const elapsedMs = Math.max(0, (Number(now) || 0) - Number(existing.startedAt || 0));
  return elapsedMs / 1000;
}

function getOutsideMp4LoopStartTime(durationSec) {
  const duration = Number(durationSec);
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return Math.min(Math.max(0.01, OUTSIDE_MP4_LOOP_START_OFFSET_SEC), Math.max(0, duration - 0.02));
}

function ensureOutsideMp4FallbackCanvas(playbackState) {
  if (!playbackState) {
    return null;
  }
  if (!playbackState.fallbackCanvas || !playbackState.fallbackCtx) {
    const fallbackCanvas = document.createElement("canvas");
    const fallbackCtx = fallbackCanvas.getContext("2d", { alpha: true });
    if (!fallbackCtx) {
      return null;
    }
    playbackState.fallbackCanvas = fallbackCanvas;
    playbackState.fallbackCtx = fallbackCtx;
  }
  if (playbackState.fallbackCanvas.width !== canvas.width || playbackState.fallbackCanvas.height !== canvas.height) {
    playbackState.fallbackCanvas.width = canvas.width;
    playbackState.fallbackCanvas.height = canvas.height;
  }
  return playbackState;
}

function captureOutsideMp4FallbackFrame(playbackState, video) {
  if (!playbackState || !video) {
    return;
  }
  const fallbackState = ensureOutsideMp4FallbackCanvas(playbackState);
  if (!fallbackState?.fallbackCtx) {
    return;
  }
  fallbackState.fallbackCtx.clearRect(0, 0, fallbackState.fallbackCanvas.width, fallbackState.fallbackCanvas.height);
  fallbackState.fallbackCtx.drawImage(video, 0, 0, fallbackState.fallbackCanvas.width, fallbackState.fallbackCanvas.height);
  fallbackState.lastVisibleFrameAtMs = performance.now();
  fallbackState.lastDecodedFrameAtMs = fallbackState.lastVisibleFrameAtMs;
  fallbackState.hasVisibleFrame = true;
}

function drawOutsideMp4FallbackFrame(playbackState) {
  if (!playbackState?.fallbackCanvas || !playbackState.hasVisibleFrame) {
    return false;
  }
  const ageMs = performance.now() - Number(playbackState.lastVisibleFrameAtMs || 0);
  if (!Number.isFinite(ageMs) || ageMs > OUTSIDE_MP4_FALLBACK_FRAME_MAX_AGE_MS) {
    return false;
  }
  ctx.drawImage(playbackState.fallbackCanvas, 0, 0, canvas.width, canvas.height);
  return true;
}

function maybeWrapOutsideMp4Loop(video, playbackState) {
  if (!video || !playbackState || video.seeking) {
    return;
  }
  const durationSec = Number(video.duration);
  const currentTime = Number(video.currentTime);
  if (!Number.isFinite(durationSec) || durationSec <= 0 || !Number.isFinite(currentTime)) {
    return;
  }
  const loopStartSec = getOutsideMp4LoopStartTime(durationSec);
  const loopLeadSec = Math.min(
    Math.max(0.03, OUTSIDE_MP4_LOOP_WRAP_LEAD_SEC),
    Math.max(0.04, durationSec * 0.25),
  );
  if (durationSec <= loopStartSec + loopLeadSec) {
    return;
  }
  const nowMs = performance.now();
  if (nowMs - Number(playbackState.lastLoopWrapAtMs || 0) < OUTSIDE_MP4_LOOP_WRAP_COOLDOWN_MS) {
    return;
  }
  if (currentTime < durationSec - loopLeadSec) {
    return;
  }
  try {
    video.currentTime = loopStartSec;
    playbackState.lastLoopWrapAtMs = nowMs;
  } catch {
    // ignore transient seek errors near loop boundaries
  }
}

function bindOutsideMp4FrameCallback(video, playbackState) {
  if (!video || !playbackState || playbackState.videoFrameCallbackBound) {
    return;
  }
  if (typeof video.requestVideoFrameCallback !== "function") {
    return;
  }
  playbackState.videoFrameCallbackBound = true;
  const onVideoFrame = () => {
    playbackState.lastDecodedFrameAtMs = performance.now();
    playbackState.hasVisibleFrame = true;
    video.requestVideoFrameCallback(onVideoFrame);
  };
  video.requestVideoFrameCallback(onVideoFrame);
}

function shouldDrawOutsideMp4Now(playbackState) {
  if (!playbackState) {
    return true;
  }
  const controls = getMp4PerformanceControls();
  const targetFrameMs = controls.tier === "performance"
    ? 33
    : controls.tier === "balanced"
      ? 22
      : 16;
  const nowMs = performance.now();
  const elapsed = nowMs - Number(playbackState.lastDrawAtMs || 0);
  if (!Number.isFinite(elapsed) || elapsed >= targetFrameMs) {
    playbackState.lastDrawAtMs = nowMs;
    return true;
  }
  return false;
}

function ensureOutsideMp4Playback(video, { boardId = state.boardId, lifecycleKey = "", assetRef = "", targetRate = 1 } = {}) {
  if (!video) {
    return null;
  }
  const normalizedLifecycleKey = String(lifecycleKey || "").trim();
  const normalizedAssetRef = String(assetRef || "").trim();
  const previous = outsideMp4PlaybackStateByBoard.get(boardId) ?? null;
  const didLifecycleChange =
    !previous
    || previous.lifecycleKey !== normalizedLifecycleKey
    || previous.assetRef !== normalizedAssetRef;

  video.loop = true;
  video.muted = true;
  video.playsInline = true;

  if (Math.abs((Number(video.defaultPlaybackRate) || 1) - targetRate) > 0.01) {
    video.defaultPlaybackRate = targetRate;
  }
  if (Math.abs((Number(video.playbackRate) || 1) - targetRate) > 0.01) {
    video.playbackRate = targetRate;
  }

  if (didLifecycleChange) {
    const durationSec = Number(video.duration);
    if (Number.isFinite(durationSec) && durationSec > 0) {
      try {
        video.currentTime = getOutsideMp4LoopStartTime(durationSec);
      } catch {
        // ignore transient seek errors until media is ready
      }
    }
  }

  if (video.paused || didLifecycleChange) {
    void video.play().catch(() => undefined);
  }

  const previousHasVisibleFrame = previous?.assetRef === normalizedAssetRef
    ? Boolean(previous?.hasVisibleFrame)
    : false;
  const playbackState = {
    lifecycleKey: normalizedLifecycleKey,
    assetRef: normalizedAssetRef,
    fallbackCanvas: previous?.fallbackCanvas ?? null,
    fallbackCtx: previous?.fallbackCtx ?? null,
    lastVisibleFrameAtMs: previous?.lastVisibleFrameAtMs ?? 0,
    lastDecodedFrameAtMs: previous?.lastDecodedFrameAtMs ?? 0,
    lastLoopWrapAtMs: previous?.lastLoopWrapAtMs ?? 0,
    lastDrawAtMs: previous?.lastDrawAtMs ?? 0,
    videoFrameCallbackBound: previous?.videoFrameCallbackBound ?? false,
    hasVisibleFrame: previousHasVisibleFrame,
  };
  bindOutsideMp4FrameCallback(video, playbackState);
  outsideMp4PlaybackStateByBoard.set(boardId, playbackState);
  return playbackState;
}

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

function isMobileViewport() {
  return window.matchMedia("(max-width: 920px)").matches;
}

function isMobilePortraitViewport() {
  return window.matchMedia("(max-width: 920px) and (orientation: portrait)").matches;
}

function getMobileOrientationLabel() {
  return window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
}

function isElementRendered(element) {
  if (!element || element.hidden) {
    return false;
  }
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function measureRenderedHeight(element) {
  if (!isElementRendered(element)) {
    return 0;
  }
  return Math.max(0, Math.round(element.getBoundingClientRect().height));
}

function syncMobileStickyOffsets() {
  if (!controlPanel) {
    return;
  }
  let navOffset = 0;
  if (isMobileViewport() && state.uiView === "dashboard") {
    navOffset += measureRenderedHeight(primaryViewSwitch);
    navOffset += measureRenderedHeight(dashboardStickyShell);
  }
  controlPanel.style.setProperty("--mobile-projection-offset", `${navOffset}px`);
  controlPanel.style.setProperty("--mobile-nav-offset", `${navOffset}px`);
  if (projectionArea) {
    projectionArea.style.scrollMarginTop = `${Math.max(0, navOffset) + 8}px`;
  }
}

function preserveMobileBoardOverview(context = "quick-mode") {
  if (!isMobileViewport() || state.uiView !== "dashboard") {
    return;
  }
  setDashboardZone("trigger");
  syncMobileStickyOffsets();
  const projectionOk = runMobileProjectionVisibilityGuard({ silent: true, context });
  if (!projectionOk) {
    triggerFeedback.textContent = "Status: Mobile board overview guard detected control overlap";
  }
}

function ensurePrimaryNavigationVisible() {
  if (!primaryViewSwitch) {
    return;
  }
  primaryViewSwitch.toggleAttribute("hidden", false);
  primaryViewSwitch.setAttribute("aria-hidden", "false");
  if ("inert" in primaryViewSwitch) {
    primaryViewSwitch.inert = false;
  }
}

function syncMobileLayoutStatus() {
  if (!controlPanel || !mobileLayoutStatus) {
    return;
  }
  const orientation = getMobileOrientationLabel();
  const isMobile = isMobileViewport();
  controlPanel.dataset.mobileViewport = isMobile ? "true" : "false";
  controlPanel.dataset.mobileOrientation = orientation;
  const zoneLabel = state.dashboardZone === "manage" ? "Manage running" : "Trigger";
  mobileLayoutStatus.textContent = isMobile
    ? `Mobile (${orientation}): focus ${zoneLabel}`
    : "Desktop: Trigger and Manage sections visible in parallel";
}

function syncDashboardZoneVisibility() {
  ensurePrimaryNavigationVisible();
  const mobilePortrait = isMobilePortraitViewport();
  for (const entry of dashboardZoneGroups) {
    const zone = entry.dataset.dashboardZone;
    const shouldHide = mobilePortrait && zone && zone !== state.dashboardZone;
    entry.classList.toggle("dashboard-zone-hidden", shouldHide);
  }

  if (openTriggerZoneButton && openManageZoneButton) {
    const showSwitch = isMobileViewport() && state.uiView === "dashboard";
    openTriggerZoneButton.parentElement?.classList.toggle("mobile-zone-switch-hidden", !showSwitch);
    openTriggerZoneButton.classList.toggle("active", state.dashboardZone === "trigger");
    openManageZoneButton.classList.toggle("active", state.dashboardZone === "manage");
    openTriggerZoneButton.setAttribute("aria-pressed", state.dashboardZone === "trigger" ? "true" : "false");
    openManageZoneButton.setAttribute("aria-pressed", state.dashboardZone === "manage" ? "true" : "false");
  }

  if (mobileStartRoomButton) {
    const roomSelectedNow = Boolean(getSelectedRoom());
    const showStart = isMobileViewport() && state.uiView === "dashboard";
    mobileStartRoomButton.toggleAttribute("hidden", !showStart);
    mobileStartRoomButton.disabled = !roomSelectedNow;
  }

  syncMobileStickyOffsets();
  syncMobileLayoutStatus();
}

function validateViewNavigationVisibility({ silent = false, context = "runtime" } = {}) {
  const issues = [];
  const navButtons = [
    ["dashboard", openDashboardViewButton],
    ["settings", openSettingsViewButton],
  ];

  for (const [key, button] of navButtons) {
    if (!button) {
      issues.push(`missing navigation button: ${key}`);
      continue;
    }
    const style = window.getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    if (
      button.hidden ||
      button.disabled ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.pointerEvents === "none" ||
      rect.width < 1 ||
      rect.height < 1
    ) {
      issues.push(`navigation button unreachable: ${key}`);
    }
  }

  if (!isElementRendered(primaryViewSwitch)) {
    issues.push("navigation container hidden");
  }

  if (controlPanel?.dataset.activeView !== state.uiView) {
    issues.push(`navigation state drift: dataset=${controlPanel?.dataset.activeView} state=${state.uiView}`);
  }

  if (issues.length > 0) {
    if (!silent) {
      logUi.error("navigation_visibility_violation", {
        event: "navigation-visibility-violation",
        context,
        issues,
      });
      triggerFeedback.textContent =
        "Status: Navigation guard reported a failure (Dashboard/Settings not continuously visible)";
    }
    return false;
  }
  return true;
}

function runMobileProjectionVisibilityGuard({ silent = false, context = "runtime" } = {}) {
  if (!isMobileViewport() || !projectionArea) {
    return true;
  }

  const issues = [];
  const projectionRect = projectionArea.getBoundingClientRect();
  if (projectionRect.width < 1 || projectionRect.height < 1) {
    return true;
  }

  const blockers = [
    primaryViewSwitch,
    state.uiView === "dashboard" ? dashboardStickyShell : null,
    state.uiView === "dashboard" ? mobileZoneSwitch : null,
    state.uiView === "dashboard" ? runningOverviewPanel : null,
  ].filter(Boolean);
  for (const blocker of blockers) {
    if (!isElementRendered(blocker)) {
      continue;
    }
    const blockerStyle = window.getComputedStyle(blocker);
    if (blockerStyle.position === "sticky" || blockerStyle.position === "fixed") {
      issues.push(`mobile control uses sticky/fixed: ${blocker.className || blocker.id || blocker.tagName}`);
    }
    const rect = blocker.getBoundingClientRect();
    const probeX = projectionRect.left + projectionRect.width * 0.5;
    const probeY = projectionRect.top + projectionRect.height * 0.5;
    const intersectsProbe =
      probeX >= rect.left && probeX <= rect.right && probeY >= rect.top && probeY <= rect.bottom;
    if (intersectsProbe) {
      const probeTarget = document.elementFromPoint(probeX, probeY);
      if (probeTarget && !projectionArea.contains(probeTarget) && probeTarget !== projectionArea) {
        issues.push(`projection overlap by ${blocker.className || blocker.id || blocker.tagName}`);
      }
    }
  }

  const projectionStyle = window.getComputedStyle(projectionArea);
  if (projectionStyle.pointerEvents === "none") {
    issues.push("projection pointer-events disabled");
  }

  const probePoints = [
    [projectionRect.left + projectionRect.width * 0.5, projectionRect.top + projectionRect.height * 0.5],
    [projectionRect.left + projectionRect.width * 0.2, projectionRect.top + projectionRect.height * 0.35],
    [projectionRect.left + projectionRect.width * 0.8, projectionRect.top + projectionRect.height * 0.65],
  ];
  for (const [probeX, probeY] of probePoints) {
    if (!Number.isFinite(probeX) || !Number.isFinite(probeY)) {
      continue;
    }
    const probeTarget = document.elementFromPoint(probeX, probeY);
    if (probeTarget && !projectionArea.contains(probeTarget) && probeTarget !== projectionArea) {
      issues.push(`projection pointer path blocked by ${probeTarget.className || probeTarget.id || probeTarget.tagName}`);
      break;
    }
  }

  if (issues.length > 0) {
    if (!silent) {
      logUi.error("mobile_projection_visibility_violation", {
        event: "mobile-projection-visibility-violation",
        context,
        issues,
      });
      triggerFeedback.textContent =
        "Status: Mobile projection guard reported overlap (board must not be covered by controls)";
    }
    return false;
  }
  return true;
}

function setDashboardZone(zone, { announce = false } = {}) {
  const nextZone = zone === "manage" ? "manage" : "trigger";
  if (nextZone !== "manage") {
    resetClearAllGuard();
  }
  state.dashboardZone = nextZone;
  syncDashboardZoneVisibility();
  if (announce && state.uiView === "dashboard") {
    triggerFeedback.textContent =
      nextZone === "manage"
        ? "Status: Mobile focus set to Manage running"
        : "Status: Mobile focus set to Trigger";
  }
}

function shouldSuppressRapidTap(actionKey, thresholdMs = 320) {
  return window.TT_BEAMER_INPUT_GUARDS.shouldSuppressRapidTap({
    state,
    actionKey,
    thresholdMs,
  });
}

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function getRuntimeQualityScale() {
  const controls = getMp4PerformanceControls();
  return Math.max(controls.qualityFloor, Math.min(1, Number(state.runtimePerf.qualityScale) || 1));
}

function normalizeMp4PerformanceTier(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "quality" || normalized === "performance") {
    return normalized;
  }
  return "balanced";
}

function getMp4TierDefaults(tier) {
  if (tier === "quality") {
    return {
      renderCap: 72,
      qualityFloor: 0.78,
      degradeThreshold: 1.55,
      recoverThreshold: 0.9,
    };
  }
  if (tier === "performance") {
    return {
      renderCap: 32,
      qualityFloor: 0.55,
      degradeThreshold: 1.2,
      recoverThreshold: 0.8,
    };
  }
  return {
    renderCap: 48,
    qualityFloor: 0.68,
    degradeThreshold: 1.35,
    recoverThreshold: 0.92,
  };
}

function normalizeMp4PerformanceControls(raw = {}) {
  const tier = normalizeMp4PerformanceTier(raw.tier);
  const defaults = getMp4TierDefaults(tier);
  const degradeThreshold = Math.max(1.05, Math.min(2, Number(raw.degradeThreshold) || defaults.degradeThreshold));
  const recoverThreshold = Math.max(0.55, Math.min(1.2, Number(raw.recoverThreshold) || defaults.recoverThreshold));
  return {
    tier,
    renderCap: Math.max(8, Math.min(96, Math.round(Number(raw.renderCap) || defaults.renderCap))),
    qualityFloor: Math.max(0.45, Math.min(1, Number(raw.qualityFloor) || defaults.qualityFloor)),
    degradeThreshold,
    recoverThreshold: Math.min(degradeThreshold - 0.05, recoverThreshold),
  };
}

function getMp4PerformanceControls() {
  state.runtimePerf.mp4Controls = normalizeMp4PerformanceControls(state.runtimePerf.mp4Controls);
  return state.runtimePerf.mp4Controls;
}

function computeAnimationCoalesceSeed(animation) {
  const id = typeof animation?.id === "string" ? animation.id : "";
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 33 + id.charCodeAt(index)) % 997;
  }
  return hash;
}

function isRenderCriticalAnimation(animation) {
  if (!animation || typeof animation !== "object") {
    return false;
  }
  if (animation.scope === "cluster" || animation.scope === "room") {
    return true;
  }
  if (animation.scope === "global") {
    const durationMs = Number(animation.durationMs);
    if (Number.isFinite(durationMs) && durationMs > 0) {
      return true;
    }
    const type = typeof animation.type === "string" ? animation.type : "";
    return type === "outside-space";
  }
  return false;
}

function shouldCoalesceNonCriticalAnimation(animation) {
  if (isRenderCriticalAnimation(animation)) {
    return false;
  }
  const stride = Math.max(1, Number(state.runtimePerf.nonCriticalCoalesceStride) || 1);
  if (stride <= 1) {
    return false;
  }
  const frameIndex = Number(state.runtimePerf.frameIndex) || 0;
  const seed = computeAnimationCoalesceSeed(animation);
  return (frameIndex + seed) % stride !== 0;
}

function shouldSkipRoomMp4Frame(animation) {
  const controls = getMp4PerformanceControls();
  const pressureLevel = Math.max(0, Math.min(2, Number(state.runtimePerf.pressureLevel) || 0));
  if (pressureLevel <= 0 && controls.tier !== "performance") {
    return false;
  }
  const stride = controls.tier === "performance"
    ? (pressureLevel >= 2 ? 3 : 2)
    : pressureLevel >= 2
      ? 2
      : 1;
  if (stride <= 1) {
    return false;
  }
  const frameIndex = Number(state.runtimePerf.frameIndex) || 0;
  const seed = computeAnimationCoalesceSeed(animation);
  return (frameIndex + seed) % stride !== 0;
}

function getRuntimeVisualCaps() {
  const pressureLevel = Math.max(0, Math.min(2, Number(state.runtimePerf.pressureLevel) || 0));
  const outsideStarsPerLayer = Math.max(18, Number(state.runtimePerf.maxOutsideStarsPerLayer) || 110);
  const ashParticlesCap = Math.max(32, Number(state.runtimePerf.maxAshParticles) || 240);
  const nonCriticalDensityScale = pressureLevel >= 2 ? 0.54 : pressureLevel === 1 ? 0.74 : 1;
  return {
    pressureLevel,
    outsideStarsPerLayer,
    ashParticlesCap,
    nonCriticalDensityScale,
  };
}

function recordRuntimeFrameCost(frameCostMs) {
  if (!Number.isFinite(frameCostMs) || frameCostMs <= 0) {
    return;
  }
  const samples = state.runtimePerf.frameCostSamples;
  samples.push(frameCostMs);
  if (samples.length > 240) {
    samples.shift();
  }
  const p90 = percentile(samples, 0.9);
  const targetMs = Number(state.runtimePerf.frameBudgetMs) || 16.7;
  const controls = getMp4PerformanceControls();
  const mp4LoadCount = state.runningAnimations.filter((animation) => {
    if (!animation || animation.scope !== "room" || animation.boardId !== state.boardId) {
      return false;
    }
    return normalizeRoomAssetType(animation.roomAssetType) === "mp4";
  }).length;
  const loadPenalty = mp4LoadCount >= 12 ? 0.18 : mp4LoadCount >= 8 ? 0.1 : mp4LoadCount >= 4 ? 0.04 : 0;
  const degradeThreshold = Math.max(1.05, controls.degradeThreshold - loadPenalty);
  const recoverThreshold = Math.max(0.55, Math.min(degradeThreshold - 0.05, controls.recoverThreshold));
  if (p90 > targetMs * degradeThreshold) {
    state.runtimePerf.qualityScale = Math.max(controls.qualityFloor, getRuntimeQualityScale() - 0.03);
  } else if (p90 < targetMs * recoverThreshold) {
    state.runtimePerf.qualityScale = Math.min(1, getRuntimeQualityScale() + 0.015);
  }
  if (p90 > targetMs * 1.9) {
    state.runtimePerf.pressureLevel = 2;
    state.runtimePerf.nonCriticalCoalesceStride = 3;
    state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(controls.renderCap, 28);
    state.runtimePerf.maxAshParticles = 80;
    state.runtimePerf.maxOutsideStarsPerLayer = 34;
  } else if (p90 > targetMs * 1.35) {
    state.runtimePerf.pressureLevel = 1;
    state.runtimePerf.nonCriticalCoalesceStride = 2;
    state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(controls.renderCap, 56);
    state.runtimePerf.maxAshParticles = 150;
    state.runtimePerf.maxOutsideStarsPerLayer = 64;
  } else {
    state.runtimePerf.pressureLevel = 0;
    state.runtimePerf.nonCriticalCoalesceStride = 1;
    state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(controls.renderCap, 96);
    state.runtimePerf.maxAshParticles = 240;
    state.runtimePerf.maxOutsideStarsPerLayer = 110;
  }
}

function updateMobilePerformanceStatus() {
  if (!mobilePerformanceStatus) {
    return;
  }
  const trigger = state.mobilePerf.triggerLatencySamples;
  const frames = state.mobilePerf.frameDeltaSamples;
  if (trigger.length === 0 || frames.length === 0) {
    mobilePerformanceStatus.textContent = "Mobile performance: no snapshot yet";
    return;
  }
  const p95Trigger = percentile(trigger, 0.95);
  const p95Frame = percentile(frames, 0.95);
  const approxFps = p95Frame > 0 ? (1000 / p95Frame).toFixed(1) : "0.0";
  const jankFrames = frames.filter((delta) => delta >= 40).length;
  const jankRate = frames.length > 0 ? (jankFrames / frames.length) * 100 : 0;
  const quality = Math.round(getRuntimeQualityScale() * 100);
  mobilePerformanceStatus.textContent =
    `Mobile Performance: Trigger p95 ${p95Trigger.toFixed(1)}ms | Frame p95 ${p95Frame.toFixed(1)}ms (~${approxFps} FPS) | Jank>=40ms ${jankRate.toFixed(1)}% | Quality ${quality}%`;
}

function syncMp4PerformanceControlsPanel() {
  const controls = getMp4PerformanceControls();
  state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(
    Number(state.runtimePerf.maxRenderAnimationsPerFrame) || 96,
    controls.renderCap,
  );
  if (mp4PerformanceTierInput) {
    mp4PerformanceTierInput.value = controls.tier;
  }
  if (mp4RenderCapInput) {
    mp4RenderCapInput.value = String(controls.renderCap);
  }
  if (mp4RenderCapValue) {
    mp4RenderCapValue.textContent = String(controls.renderCap);
  }
  if (mp4QualityFloorInput) {
    mp4QualityFloorInput.value = controls.qualityFloor.toFixed(2);
  }
  if (mp4QualityFloorValue) {
    mp4QualityFloorValue.textContent = controls.qualityFloor.toFixed(2);
  }
  if (mp4DegradeThresholdInput) {
    mp4DegradeThresholdInput.value = controls.degradeThreshold.toFixed(2);
  }
  if (mp4DegradeThresholdValue) {
    mp4DegradeThresholdValue.textContent = controls.degradeThreshold.toFixed(2);
  }
  if (mp4RecoverThresholdInput) {
    mp4RecoverThresholdInput.value = controls.recoverThreshold.toFixed(2);
  }
  if (mp4RecoverThresholdValue) {
    mp4RecoverThresholdValue.textContent = controls.recoverThreshold.toFixed(2);
  }
  if (mp4PerformanceStatus) {
    const pressure = Math.max(0, Math.min(2, Number(state.runtimePerf.pressureLevel) || 0));
    mp4PerformanceStatus.textContent =
      `MP4 controls: ${controls.tier} | cap ${controls.renderCap}/frame | floor ${controls.qualityFloor.toFixed(2)} | pressure ${pressure}`;
  }
}

function updateMp4PerformanceControls(partial, { announce = true } = {}) {
  state.runtimePerf.mp4Controls = normalizeMp4PerformanceControls({
    ...getMp4PerformanceControls(),
    ...partial,
  });
  state.runtimePerf.maxRenderAnimationsPerFrame = Math.min(
    Number(state.runtimePerf.maxRenderAnimationsPerFrame) || 96,
    state.runtimePerf.mp4Controls.renderCap,
  );
  syncMp4PerformanceControlsPanel();
  persistRuntimeSoundSettingsChange("Status: MP4 controls updated, but persistence failed");
  if (announce) {
    const controls = getMp4PerformanceControls();
    triggerFeedback.textContent =
      `Status: MP4 controls updated (${controls.tier}, cap ${controls.renderCap}/frame, floor ${controls.qualityFloor.toFixed(2)})`;
  }
}

function recordTriggerIntent() {
  window.TT_BEAMER_INPUT_GUARDS.recordTriggerIntent(state);
}

function hardStopRuntimeEffects({ clearVisuals = true } = {}) {
  for (const animation of state.runningAnimations) {
    stopAnimationSound(animation.id);
  }
  for (const timeoutId of pendingAnimationAudioStartTimers.values()) {
    window.clearTimeout(timeoutId);
  }
  pendingAnimationAudioStartTimers.clear();
  activeAnimationAudioById.clear();
  if (clearVisuals) {
    ashParticles.length = 0;
  }
}

function executeClearAll() {
  if (outputRole === OUTPUT_ROLE_CONTROL) {
    void emitLiveMutation("clear-all", {
      priorityHint: "high",
      reason: "control-clear-all",
    }).then(() => {
      triggerFeedback.textContent = "Pending: Clear All command accepted (waiting for snapshot)";
    }).catch(() => {
      triggerFeedback.textContent = "Status: Clear All command failed";
    });
    return;
  }
  hardStopRuntimeEffects({ clearVisuals: true });
  for (const board of BOARDS) {
    updateOutsideFxProfile(board.id, { enabled: false });
  }
  persistBoardProfiles();
  state.runningAnimations = [];
  clearRoomDraftEditTarget();
  syncOutsideFxPanel();
  renderRunningAnimationsList();
  refreshGlobalButtons();
  triggerFeedback.textContent = "Status: Clear All executed";
  void emitLiveMutation("clear-all", {
    priorityHint: "high",
  });
}

function resetClearAllGuard() {
  if (state.clearAllGuard.timeoutId !== null) {
    window.clearTimeout(state.clearAllGuard.timeoutId);
  }
  state.clearAllGuard.armedUntil = 0;
  state.clearAllGuard.timeoutId = null;
  if (stopAllButton) {
    stopAllButton.textContent = "Clear All";
    stopAllButton.classList.remove("is-armed");
  }
}

function armClearAllGuard() {
  resetClearAllGuard();
  state.clearAllGuard.armedUntil = performance.now() + 2600;
  if (stopAllButton) {
    stopAllButton.textContent = "Confirm Clear All";
    stopAllButton.classList.add("is-armed");
  }
  state.clearAllGuard.timeoutId = window.setTimeout(() => {
    resetClearAllGuard();
  }, 2700);
}

function normalizeSettingsSubtab(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "animations" || normalized === "system") {
    return normalized;
  }
  return "board";
}

function persistSettingsSubtab(nextSubtab) {
  // Phase 13-1: subtab memory is ephemeral per browser-tab session. No
  // persistent storage. sessionStorage is cleared when the tab closes.
  try {
    window.sessionStorage.setItem(SETTINGS_SUBTAB_STORAGE_KEY, nextSubtab);
  } catch {
    // Best-effort only.
  }
}

function syncSettingsSubtabVisibility() {
  const activeSubtab = normalizeSettingsSubtab(state.settingsSubtab);
  for (const button of settingsSubtabButtons) {
    const tabId = normalizeSettingsSubtab(button.dataset.settingsSubtab);
    const isActive = tabId === activeSubtab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
  for (const section of settingsTabbedSections) {
    const tabId = normalizeSettingsSubtab(section.dataset.settingsTab);
    const isActive = tabId === activeSubtab;
    section.classList.toggle("settings-subtab-hidden", !isActive);
    section.setAttribute("aria-hidden", isActive ? "false" : "true");
    if ("inert" in section) {
      section.inert = !isActive;
    }
  }
  if (settingsSubtabStatus) {
    settingsSubtabStatus.textContent = `Settings focus: ${SETTINGS_SUBTAB_LABELS[activeSubtab] ?? SETTINGS_SUBTAB_LABELS.board}`;
  }
}

function setSettingsSubtab(nextSubtab, { persist = true } = {}) {
  state.settingsSubtab = normalizeSettingsSubtab(nextSubtab);
  syncSettingsSubtabVisibility();
  if (persist) {
    persistSettingsSubtab(state.settingsSubtab);
  }
}

function restoreSettingsSubtabPreference() {
  // Phase 13-1: ephemeral sessionStorage memory (per browser tab).
  let stored = "";
  try {
    stored = window.sessionStorage.getItem(SETTINGS_SUBTAB_STORAGE_KEY) || "";
  } catch {
    stored = "";
  }
  setSettingsSubtab(stored || state.settingsSubtab || "board", { persist: false });
}

function normalizeQuickMode(mode) {
  const normalized = String(mode || "").trim().toLowerCase();
  return QUICK_MODE_VALUES.has(normalized) ? normalized : "off";
}

function getQuickModeInflightMap() {
  if (!state.quickMode || typeof state.quickMode !== "object") {
    state.quickMode = { mode: "off", inflightByRoom: {} };
  }
  if (!state.quickMode.inflightByRoom || typeof state.quickMode.inflightByRoom !== "object") {
    state.quickMode.inflightByRoom = {};
  }
  return state.quickMode.inflightByRoom;
}

function getQuickModeInflightCount() {
  return Object.keys(getQuickModeInflightMap()).length;
}

function markQuickModeRoomInflight(roomId, holdMs = 520) {
  const normalizedRoomId = String(roomId || "").trim();
  if (!normalizedRoomId) {
    return false;
  }
  const inflightMap = getQuickModeInflightMap();
  if (inflightMap[normalizedRoomId]) {
    return false;
  }
  const timeoutId = window.setTimeout(() => {
    clearQuickModeRoomInflight(normalizedRoomId);
  }, Math.max(180, Number(holdMs) || 520));
  inflightMap[normalizedRoomId] = timeoutId;
  syncQuickModePanel();
  return true;
}

function clearQuickModeRoomInflight(roomId) {
  const normalizedRoomId = String(roomId || "").trim();
  if (!normalizedRoomId) {
    return;
  }
  const inflightMap = getQuickModeInflightMap();
  const timeoutId = inflightMap[normalizedRoomId];
  if (timeoutId) {
    window.clearTimeout(timeoutId);
  }
  delete inflightMap[normalizedRoomId];
  syncQuickModePanel();
}

function clearAllQuickModeInflight() {
  const inflightMap = getQuickModeInflightMap();
  for (const roomId of Object.keys(inflightMap)) {
    clearQuickModeRoomInflight(roomId);
  }
}

function syncQuickModePanel() {
  const mode = normalizeQuickMode(state.quickMode?.mode);
  const inflightCount = getQuickModeInflightCount();
  const buttonMap = {
    off: quickModeOffButton,
    activate: quickModeActivateButton,
    deactivate: quickModeDeactivateButton,
    clear: quickModeClearButton,
  };
  for (const [value, button] of Object.entries(buttonMap)) {
    if (!button) {
      continue;
    }
    const isActive = mode === value;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
  if (quickModeStatus) {
    quickModeStatus.textContent = inflightCount > 0
      ? `Quick mode: ${QUICK_MODE_LABELS[mode] ?? QUICK_MODE_LABELS.off} | busy: ${inflightCount}`
      : `Quick mode: ${QUICK_MODE_LABELS[mode] ?? QUICK_MODE_LABELS.off}`;
  }
  if (quickModePanel) {
    quickModePanel.dataset.mode = mode;
    quickModePanel.classList.toggle("is-busy", inflightCount > 0);
  }
}

function setQuickMode(nextMode, { announce = true } = {}) {
  const normalizedMode = normalizeQuickMode(nextMode);
  const currentMode = normalizeQuickMode(state.quickMode?.mode);
  const inflightCount = getQuickModeInflightCount();
  if (
    normalizedMode !== currentMode
    && normalizedMode !== "off"
    && currentMode !== "off"
    && inflightCount > 0
  ) {
    triggerFeedback.textContent = "Status: Quick mode switch blocked while room actions are in flight";
    showToast("Quick mode switch blocked until in-flight room actions settle", {
      kind: "error",
      dedupeKey: "quick-mode-switch-blocked",
    });
    syncQuickModePanel();
    return;
  }
  state.quickMode.mode = normalizedMode;
  syncQuickModePanel();
  if (announce) {
    triggerFeedback.textContent = `Status: Quick mode ${QUICK_MODE_LABELS[normalizedMode] ?? QUICK_MODE_LABELS.off}`;
  }
}

function isQuickModeActive() {
  return normalizeQuickMode(state.quickMode?.mode) !== "off";
}

function getQuickModeRoomLabel(roomId) {
  return getBoard(state.boardId).rooms.find((entry) => entry.id === roomId)?.name ?? roomId;
}

function activateRoomAnimationByQuickTap(roomId) {
  const normalizedRoomId = String(roomId || "").trim();
  if (!normalizedRoomId) {
    return;
  }
  const previousTargetType = state.roomDraft.targetType;
  const previousTargetId = state.roomDraft.targetId;
  const previousEditTargetId = state.roomDraft.editTargetId;
  state.roomDraft.targetType = "room";
  state.roomDraft.targetId = normalizedRoomId;
  state.roomDraft.editTargetId = null;
  startRoomAnimationFromDraft();
  state.roomDraft.targetType = previousTargetType;
  state.roomDraft.targetId = previousTargetId;
  state.roomDraft.editTargetId = previousEditTargetId;
  syncRoomTargetSelect();
  return {
    ok: true,
    action: "activate",
    roomLabel: getQuickModeRoomLabel(normalizedRoomId),
  };
}

function collectQuickTapRoomAnimationIds(roomId, { onlyType = null } = {}) {
  const normalizedRoomId = String(roomId || "").trim();
  const normalizedType = typeof onlyType === "string" ? onlyType.trim() : "";
  if (!normalizedRoomId) {
    return [];
  }
  return state.runningAnimations
    .filter((animation) => {
      if (animation?.scope !== "room") {
        return false;
      }
      if (String(animation.roomId || "").trim() !== normalizedRoomId) {
        return false;
      }
      if (String(animation.boardId || "").trim() !== String(state.boardId || "").trim()) {
        return false;
      }
      if (!normalizedType) {
        return true;
      }
      return String(animation.type || "").trim() === normalizedType;
    })
    .map((animation) => animation.id)
    .filter(Boolean);
}

function deactivateRoomAnimationByQuickTap(roomId) {
  const selectedAnimationType = String(state.roomDraft.animationId || "").trim();
  if (!selectedAnimationType) {
    return {
      ok: false,
      action: "deactivate",
      roomLabel: getQuickModeRoomLabel(roomId),
      reason: "missing-animation-selection",
      message: "Quick deactivate needs a selected animation",
    };
  }
  const targetIds = collectQuickTapRoomAnimationIds(roomId, { onlyType: selectedAnimationType });
  if (targetIds.length === 0) {
    const roomLabel = getQuickModeRoomLabel(roomId);
    return {
      ok: false,
      action: "deactivate",
      roomLabel,
      reason: "no-target",
      message: `No ${getRoomAnimationLabelById(selectedAnimationType, state.boardId)} running in ${roomLabel}`,
    };
  }
  for (const animationId of targetIds) {
    stopAnimation(animationId);
  }
  return {
    ok: true,
    action: "deactivate",
    roomLabel: getQuickModeRoomLabel(roomId),
    count: targetIds.length,
  };
}

function clearRoomAnimationsByQuickTap(roomId) {
  const targetIds = collectQuickTapRoomAnimationIds(roomId);
  if (targetIds.length === 0) {
    const roomLabel = getQuickModeRoomLabel(roomId);
    return {
      ok: false,
      action: "clear",
      roomLabel,
      reason: "no-target",
      message: `Clear mode found no running room animations in ${roomLabel}`,
    };
  }
  for (const animationId of targetIds) {
    stopAnimation(animationId);
  }
  return {
    ok: true,
    action: "clear",
    roomLabel: getQuickModeRoomLabel(roomId),
    count: targetIds.length,
  };
}

function reportQuickModeTapOutcome(mode, outcome, roomId) {
  if (!outcome) {
    return;
  }
  const roomLabel = outcome.roomLabel ?? getQuickModeRoomLabel(roomId);
  if (!outcome.ok) {
    const message = outcome.message || `Quick ${mode} had no effect in ${roomLabel}`;
    triggerFeedback.textContent = `Status: ${message}`;
    showToast(`Quick ${mode}: ${message}`, {
      kind: "error",
      dedupeKey: `quick-${mode}-${outcome.reason || "no-effect"}`,
      timeoutMs: 3200,
    });
    return;
  }
  const countSuffix = Number(outcome.count) > 0 ? ` (${outcome.count})` : "";
  triggerFeedback.textContent = `Pending: quick ${mode} accepted for ${roomLabel}${countSuffix}`;
  showToast(`Quick ${mode}: ${roomLabel}${countSuffix}`, {
    kind: "success",
    dedupeKey: `quick-${mode}-ok-${roomId}`,
    timeoutMs: 2200,
  });
}

function handleQuickModeRoomTap(roomId) {
  const mode = normalizeQuickMode(state.quickMode?.mode);
  preserveMobileBoardOverview("quick-mode-room-tap");
  if (!markQuickModeRoomInflight(roomId)) {
    triggerFeedback.textContent = "Status: Quick mode room action already in flight";
    return;
  }
  if (mode === "activate") {
    const outcome = activateRoomAnimationByQuickTap(roomId);
    reportQuickModeTapOutcome(mode, outcome, roomId);
    return;
  }
  if (mode === "deactivate") {
    const outcome = deactivateRoomAnimationByQuickTap(roomId);
    reportQuickModeTapOutcome(mode, outcome, roomId);
    return;
  }
  if (mode === "clear") {
    const outcome = clearRoomAnimationsByQuickTap(roomId);
    reportQuickModeTapOutcome(mode, outcome, roomId);
    return;
  }
  clearQuickModeRoomInflight(roomId);
  triggerFeedback.textContent = `Status: Quick mode ${QUICK_MODE_LABELS[mode] ?? mode} is OFF`;
}

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

function runViewVisibilityRegression() {
  const originalView = state.uiView;
  let ok = true;
  for (let i = 0; i < 10; i += 1) {
    const target = i % 2 === 0 ? "settings" : "dashboard";
    setActiveView(target, { skipGuard: true });
    ok = validateViewExclusivity(target, { silent: true, context: `toggle-${i + 1}` }) && ok;
  }
  const viewportContext = window.matchMedia("(max-width: 760px)").matches
    ? "small-screen"
    : "desktop";
  ok = validateViewExclusivity(state.uiView, { silent: true, context: viewportContext }) && ok;
  ok = validateSettingsControlOwnership({ silent: true, context: `${viewportContext}-settings-ownership` }) && ok;
  setActiveView(originalView, { skipGuard: true });
  return ok;
}

function runLayoutScrollRegression() {
  const issues = [];
  const mobileViewport = isMobileViewport();
  syncMobileStickyOffsets();
  const panelOverflowY = controlPanel ? window.getComputedStyle(controlPanel).overflowY : "";
  const expectedPanelOverflow = mobileViewport ? ["visible", "auto", "scroll"] : ["auto", "scroll"];
  if (!expectedPanelOverflow.includes(panelOverflowY)) {
    issues.push(`control overflowY=${panelOverflowY || "missing"}`);
  }

  const projectionPosition = projectionArea
    ? window.getComputedStyle(projectionArea).position
    : "";
  if (projectionPosition !== "sticky" && projectionPosition !== "fixed") {
    issues.push(`projection position=${projectionPosition || "missing"}`);
  }

  const bodyOverflowY = window.getComputedStyle(document.body).overflowY;
  const expectedBodyOverflow = mobileViewport ? ["auto", "visible"] : ["hidden"];
  if (!expectedBodyOverflow.includes(bodyOverflowY)) {
    issues.push(`body overflowY=${bodyOverflowY}`);
  }

  if (dashboardStickyShell) {
    const stickyShellPosition = window.getComputedStyle(dashboardStickyShell).position;
    if (mobileViewport) {
      if (state.uiView === "dashboard" && !["static", "relative"].includes(stickyShellPosition)) {
        issues.push(`mobile trigger cluster must not be sticky/fixed (position=${stickyShellPosition || "missing"})`);
      }
    } else if (!["static", "relative"].includes(stickyShellPosition)) {
      issues.push(`desktop sticky-shell regression position=${stickyShellPosition || "missing"}`);
    }
  }

  if (primaryViewSwitch) {
    const navPosition = window.getComputedStyle(primaryViewSwitch).position;
    if (mobileViewport) {
      if (!["static", "relative"].includes(navPosition)) {
        issues.push(`mobile view nav must not be sticky/fixed (position=${navPosition || "missing"})`);
      }
    } else if (!["static", "relative"].includes(navPosition)) {
      issues.push(`desktop nav regression position=${navPosition || "missing"}`);
    }
  } else {
    issues.push("primary view switch missing");
  }

  if (!runningOverviewPanel || !globalAnimationPanel) {
    issues.push("running/global panel missing");
  } else {
    const runningPosition = window.getComputedStyle(runningOverviewPanel).position;
    const expectedRunningPositions = ["static", "relative"];
    if (!expectedRunningPositions.includes(runningPosition)) {
      issues.push(`running panel position=${runningPosition || "missing"}`);
    }

    if (!runningAnimationsList) {
      issues.push("running list missing");
    } else {
      const runningListStyle = window.getComputedStyle(runningAnimationsList);
      const overflowY = runningListStyle.overflowY;
      if (!mobileViewport && !["auto", "scroll"].includes(overflowY)) {
        issues.push(`running list overflowY=${overflowY || "missing"}`);
      }
      const maxHeight = runningListStyle.maxHeight;
      if (!mobileViewport && (!maxHeight || maxHeight === "none")) {
        issues.push(`running list maxHeight=${maxHeight || "missing"}`);
      }
    }

    const orderMask = runningOverviewPanel.compareDocumentPosition(globalAnimationPanel);
    if ((orderMask & Node.DOCUMENT_POSITION_FOLLOWING) === 0) {
      issues.push("running panel not before trigger groups");
    }

    if (mobileViewport) {
      const mobileClusterEntries = [
        ["mobile zone switch", mobileZoneSwitch],
        ["mobile start room", mobileStartRoomButton],
        ["running panel", runningOverviewPanel],
      ];
      for (const [label, element] of mobileClusterEntries) {
        if (!element || !isElementRendered(element)) {
          continue;
        }
        const position = window.getComputedStyle(element).position;
        if (position === "sticky" || position === "fixed") {
          issues.push(`${label} must not be sticky/fixed (position=${position})`);
        }
      }
    }
  }

  if (issues.length > 0) {
    logUi.error("layout_regression_violation", {
      event: "layout-regression-violation",
      issues,
    });
    return false;
  }
  return true;
}

function runStartupDefaultsGuardRegression() {
  const guard = state.startupDefaultsGuard;
  if (!guard?.fallbackRequired) {
    return true;
  }
  const attempted = guard.attempted === true;
  const explicitOutcome = guard.outcome === "applied" || guard.outcome === "failed-explicit";
  if (!attempted || !explicitOutcome) {
    logRuntime.error("startup_defaults_guard_violation", {
      event: "startup-defaults-guard-violation",
      fallbackRequired: guard.fallbackRequired,
      attempted: guard.attempted,
      outcome: guard.outcome,
      detail: guard.detail,
    });
    return false;
  }
  return true;
}

function runZoomPanEditRegression() {
  const issues = [];
  const previousView = state.uiView;
  const previousSpacePressed = state.panMode.spacePressed;
  const previousZoom = getBoardZoom(state.boardId);

  try {
    setActiveView("settings", { skipGuard: true });
    const focus = getRoomCenterForZoom(state.boardId);
    const zoomed = computePanForZoomFocus(2, focus);
    updateCurrentBoardZoom(zoomed);

    const bounds = getStagePanBounds(2);
    updateCurrentBoardZoom({ scale: 2, panX: bounds.maxPanX * 4, panY: -bounds.maxPanY * 4 });
    const clamped = getBoardZoom(state.boardId);
    if (Math.abs(clamped.panX) - bounds.maxPanX > 0.5 || Math.abs(clamped.panY) - bounds.maxPanY > 0.5) {
      issues.push("pan bounds clamp failed");
    }

    state.panMode.spacePressed = true;
    const canPanWithSpace = canStartPanModeFromEvent({ button: 0 });
    if (!canPanWithSpace) {
      issues.push("space+drag pan gate failed");
    }
    state.panMode.spacePressed = false;

    const canPanWithoutSpace = canStartPanModeFromEvent({ button: 0 });
    if (canPanWithoutSpace) {
      issues.push("edit mode incorrectly blocked by pan gate");
    }

    const canPanWithMiddle = canStartPanModeFromEvent({ button: 1 });
    if (!canPanWithMiddle) {
      issues.push("middle-button pan alias failed");
    }

    fitZoomToActiveSpecialRoom();
    boardZoomResetButton.click();
    const reset = getBoardZoom(state.boardId);
    if (reset.scale !== 1 || Math.abs(reset.panX) > 0.5 || Math.abs(reset.panY) > 0.5) {
      issues.push("zoom/pan reset roundtrip failed");
    }
  } finally {
    state.panMode.spacePressed = previousSpacePressed;
    updateCurrentBoardZoom(previousZoom);
    setActiveView(previousView, { skipGuard: true });
    setPanCursorState();
  }

  if (issues.length > 0) {
    logUi.error("zoom_pan_edit_regression_violation", {
      event: "zoom-pan-edit-regression-violation",
      issues,
    });
    return false;
  }
  return true;
}

function runPanPointerCaptureRegression() {
  const issues = [];
  const prevView = state.uiView;
  const prevZoom = getBoardZoom(state.boardId);
  const prevPanMode = { ...state.panMode };

  try {
    setActiveView("settings", { skipGuard: true });
    updateCurrentBoardZoom(computePanForZoomFocus(2, getRoomCenterForZoom(state.boardId)));

    state.panMode.spacePressed = true;
    startPanMode({
      pointerId: 999,
      clientX: 10,
      clientY: 10,
    }, "space");

    if (!state.panMode.active) {
      issues.push("pan mode did not activate");
    }

    endPanMode(null, { canceled: false });
    if (state.panMode.active || state.panMode.pointerId !== null) {
      issues.push("pan mode did not clear pointer session");
    }
  } catch {
    issues.push("pan pointer-capture regression threw unexpectedly");
  } finally {
    state.panMode = {
      ...prevPanMode,
      active: false,
      pointerId: null,
      trigger: null,
    };
    updateCurrentBoardZoom(prevZoom);
    setActiveView(prevView, { skipGuard: true });
    setPanCursorState();
  }

  if (issues.length > 0) {
    logUi.error("pan_pointer_regression_violation", {
      event: "pan-pointer-regression-violation",
      issues,
    });
    return false;
  }
  return true;
}

function runOrientationStateRegression() {
  const before = {
    boardId: state.boardId,
    selectedRoomId: state.selectedRoomId,
    uiView: state.uiView,
    dashboardZone: state.dashboardZone,
    runningIds: state.runningAnimations.map((entry) => entry.id).join("|"),
  };

  syncDashboardZoneVisibility();
  syncMobileLayoutStatus();
  syncDashboardZoneVisibility();

  const after = {
    boardId: state.boardId,
    selectedRoomId: state.selectedRoomId,
    uiView: state.uiView,
    dashboardZone: state.dashboardZone,
    runningIds: state.runningAnimations.map((entry) => entry.id).join("|"),
  };

  const same =
    before.boardId === after.boardId &&
    before.selectedRoomId === after.selectedRoomId &&
    before.uiView === after.uiView &&
    before.dashboardZone === after.dashboardZone &&
    before.runningIds === after.runningIds;
  if (!same) {
    logUi.error("orientation_regression_violation", {
      event: "orientation-regression-violation",
      before,
      after,
    });
  }
  return same;
}

function runNavigationStateRegression() {
  const previousView = state.uiView;
  const previousZone = state.dashboardZone;
  let ok = true;

  const checkpoints = [
    { view: "dashboard", zone: "trigger", label: "dashboard-trigger" },
    { view: "settings", zone: "trigger", label: "settings" },
    { view: "dashboard", zone: "manage", label: "dashboard-manage" },
  ];

  try {
    for (const checkpoint of checkpoints) {
      setActiveView(checkpoint.view, { skipGuard: true });
      if (checkpoint.view === "dashboard") {
        setDashboardZone(checkpoint.zone);
      }
      syncDashboardZoneVisibility();
      syncMobileLayoutStatus();
      syncMobileStickyOffsets();
      ok =
        validateViewNavigationVisibility({
          silent: true,
          context: `navigation-${checkpoint.label}`,
        }) && ok;
      ok = runMobileProjectionVisibilityGuard({
        silent: true,
        context: `projection-${checkpoint.label}`,
      }) && ok;

      for (let i = 0; i < 3; i += 1) {
        syncDashboardZoneVisibility();
        syncMobileLayoutStatus();
        syncMobileStickyOffsets();
        ok = validateViewNavigationVisibility({
          silent: true,
          context: `navigation-resync-${checkpoint.label}-${i + 1}`,
        }) && ok;
      }
    }

    ok = runLayoutScrollRegression() && ok;
  } finally {
    setActiveView(previousView, { skipGuard: true });
    setDashboardZone(previousZone);
    syncDashboardZoneVisibility();
    syncMobileStickyOffsets();
  }

  if (!ok) {
    logUi.error("navigation_regression_violation", {
      event: "navigation-regression-violation",
      view: state.uiView,
      zone: state.dashboardZone,
    });
  }
  return ok;
}

function runOutsideIsolationRegression() {
  const issues = [];
  const boardId = state.boardId;
  const previousProfile = getOutsideFxProfile(boardId);

  const captureNonOutsideIds = () =>
    state.runningAnimations
      .filter((animation) => !(animation.scope === "global" && animation.type === "outside-space"))
      .map((animation) => animation.id)
      .sort();

  const before = captureNonOutsideIds();

  try {
    updateOutsideFxProfile(boardId, { enabled: true });
    syncOutsideRuntimeMirror(boardId);
    const during = captureNonOutsideIds();
    if (during.join("|") !== before.join("|")) {
      issues.push("outside enable changed non-outside runtime entries");
    }

    updateOutsideFxProfile(boardId, { enabled: false });
    syncOutsideRuntimeMirror(boardId);
    const after = captureNonOutsideIds();
    if (after.join("|") !== before.join("|")) {
      issues.push("outside disable changed non-outside runtime entries");
    }
  } catch {
    issues.push("outside isolation regression threw unexpectedly");
  } finally {
    setOutsideFxProfile(boardId, previousProfile);
    syncOutsideRuntimeMirror(boardId);
    syncOutsideFxPanel();
    refreshGlobalButtons();
  }

  if (issues.length > 0) {
    logRender.error("outside_isolation_regression_violation", {
      event: "outside-isolation-regression-violation",
      issues,
    });
    return false;
  }
  return true;
}

function runShipClipRegression() {
  const boardId = state.boardId;
  const previousPlayAreas = getPlayAreas(boardId).map((area) => ({ ...area, polygon: [...area.polygon] }));
  const previousSelectedPlayAreaId = getSelectedPlayAreaId(boardId);
  const issues = [];

  try {
    ctx.save();
    const insideValid = clipToInsideShip(boardId);
    ctx.restore();
    if (!insideValid) {
      issues.push("inside clip rejected valid ship polygon");
    }

    ctx.save();
    const outsideValid = clipToOutsideShip(boardId);
    ctx.restore();
    if (!outsideValid) {
      issues.push("outside clip rejected valid ship polygon");
    }

    state.playAreasByBoard[boardId] = [
      {
        id: "invalid-area",
        name: "Invalid",
        polygon: [
          [0.2, 0.2],
          [0.8, 0.8],
        ],
      },
    ];
    state.selectedPlayAreaIdByBoard[boardId] = "invalid-area";

    ctx.save();
    const insideInvalid = clipToInsideShip(boardId);
    ctx.restore();
    if (insideInvalid) {
      issues.push("inside clip accepted invalid ship polygon");
    }

    ctx.save();
    const outsideInvalid = clipToOutsideShip(boardId);
    ctx.restore();
    if (outsideInvalid) {
      issues.push("outside clip accepted invalid ship polygon");
    }
  } catch {
    issues.push("ship clip regression threw unexpectedly");
  } finally {
    setPlayAreas(boardId, previousPlayAreas, { selectedPlayAreaId: previousSelectedPlayAreaId });
  }

  if (issues.length > 0) {
    logRender.error("ship_clip_regression_violation", {
      event: "ship-clip-regression-violation",
      issues,
    });
    return false;
  }
  return true;
}

function syncPolygonEditorStatus() {
  const selectedRoomId = syncSelectedRoomStateForBoard(state.boardId);
  if (!selectedRoomId) {
    polygonEditorStatus.textContent = "Polygon editor: no active room selected";
    return;
  }
  const roomId = selectedRoomId;
  const room = getBoard().rooms.find((entry) => entry.id === roomId);
  if (!room) {
    polygonEditorStatus.textContent = "Polygon editor: no rooms available on this board";
    return;
  }
  const points = getSpecialPolygonPoints(state.boardId, room.id);
  if (!areRoomVerticesEditable()) {
    polygonEditorStatus.textContent = `Polygon editor (${room.name ?? room.label}): vertices hidden (editing disabled)`;
    return;
  }
  const activeVertex = Math.max(0, Math.min(points.length - 1, state.polygonEditor.selectedVertexIndex));
  const activeEdge = Math.max(0, Math.min(points.length - 1, state.polygonEditor.selectedEdgeIndex));
  const handleSize = Math.round(getCurrentPolygonHandleScale() * 100);
  polygonEditorStatus.textContent = `Polygon editor (${room.name ?? room.label}): ${points.length} vertices | active vertex ${activeVertex + 1} | edge ${activeEdge + 1} | handle ${handleSize}%`;
}

function syncPolygonVertexSelect(roomId) {
  polygonVertexSelect.replaceChildren();
  const roomVerticesVisible = state.polygonEditor.roomVerticesVisible !== false;
  const room = getBoard().rooms.find((entry) => entry.id === roomId);
  if (!room) {
    polygonVertexSelect.disabled = true;
    return;
  }
  const points = getSpecialPolygonPoints(state.boardId, room.id);
  for (let i = 0; i < points.length; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `Vertex ${i + 1}`;
    polygonVertexSelect.append(option);
  }
  const maxIndex = Math.max(0, points.length - 1);
  state.polygonEditor.selectedVertexIndex = Math.min(state.polygonEditor.selectedVertexIndex, maxIndex);
  state.polygonEditor.selectedEdgeIndex = Math.min(state.polygonEditor.selectedEdgeIndex, maxIndex);
  polygonVertexSelect.value = String(state.polygonEditor.selectedVertexIndex);
  polygonVertexSelect.disabled = points.length === 0 || !roomVerticesVisible;
  polygonDeleteVertexButton.disabled = points.length <= 3 || !roomVerticesVisible;
}

function syncPolygonEdgeSelect(roomId) {
  polygonEdgeSelect.replaceChildren();
  const roomVerticesVisible = state.polygonEditor.roomVerticesVisible !== false;
  const room = getBoard().rooms.find((entry) => entry.id === roomId);
  if (!room) {
    polygonEdgeSelect.disabled = true;
    return;
  }
  const points = getSpecialPolygonPoints(state.boardId, room.id);
  for (let i = 0; i < points.length; i += 1) {
    const option = document.createElement("option");
    const next = i === points.length - 1 ? 1 : i + 2;
    option.value = String(i);
    option.textContent = `Edge ${i + 1} (Vertex ${i + 1} -> ${next})`;
    polygonEdgeSelect.append(option);
  }
  const maxIndex = Math.max(0, points.length - 1);
  state.polygonEditor.selectedEdgeIndex = Math.min(state.polygonEditor.selectedEdgeIndex, maxIndex);
  polygonEdgeSelect.value = String(state.polygonEditor.selectedEdgeIndex);
  polygonEdgeSelect.disabled = points.length === 0 || !roomVerticesVisible;
}

function syncPolygonEditorPanel() {
  const rooms = getSpecialRooms(state.boardId);
  const previous = polygonRoomSelect.value;
  const preferred = getActivePolygonRoomId(state.boardId);
  const activeRoomId = rooms.some((room) => room.id === preferred)
    ? preferred
    : rooms.some((room) => room.id === previous)
      ? previous
      : rooms[0]?.id;
  syncRoomSelect(polygonRoomSelect, rooms, activeRoomId);
  if (activeRoomId) {
    setActivePolygonRoomId(state.boardId, activeRoomId);
  }
  const disabled = rooms.length === 0;
  polygonInsertVertexButton.disabled = disabled;
  polygonResetRoomButton.disabled = disabled;
  polygonFocusRoomButton.disabled = disabled;
  if (roomRenameInput) {
    const activeRoom = getBoard().rooms.find((entry) => entry.id === activeRoomId);
    roomRenameInput.value = activeRoom?.name ?? activeRoom?.label ?? "";
    roomRenameInput.disabled = disabled;
  }
  const roomVerticesVisible = state.polygonEditor.roomVerticesVisible !== false;
  if (showRoomVerticesInput) {
    showRoomVerticesInput.checked = roomVerticesVisible;
  }
  polygonVertexSelect.disabled = disabled || !roomVerticesVisible;
  polygonEdgeSelect.disabled = disabled || !roomVerticesVisible;
  polygonInsertVertexButton.disabled = disabled || !roomVerticesVisible;
  polygonDeleteVertexButton.disabled = disabled || !roomVerticesVisible;
  syncPolygonVertexSelect(activeRoomId);
  syncPolygonEdgeSelect(activeRoomId);
  syncPolygonEditorStatus();
}

function syncShipPolygonEditorStatus() {
  const points = getShipPolygonPoints(state.boardId);
  const selectedArea = getSelectedPlayArea(state.boardId);
  if (!arePlayAreaVerticesEditable()) {
    shipPolygonEditorStatus.textContent = "Play Area editor: vertices hidden (editing disabled)";
    return;
  }
  const activeVertex = Math.max(0, Math.min(points.length - 1, state.shipPolygonEditor.selectedVertexIndex));
  const activeEdge = Math.max(0, Math.min(points.length - 1, state.shipPolygonEditor.selectedEdgeIndex));
  const handleSize = Math.round(getCurrentPolygonHandleScale() * 100);
  shipPolygonEditorStatus.textContent =
    `Play Area editor (${selectedArea?.name ?? "n/a"}): ${points.length} vertices | active vertex ${activeVertex + 1} | edge ${activeEdge + 1} | handle ${handleSize}%`;
}

function syncShipPolygonVertexSelect() {
  shipPolygonVertexSelect.replaceChildren();
  const playAreaVerticesVisible = state.polygonEditor.playAreaVerticesVisible !== false;
  const points = getShipPolygonPoints(state.boardId);
  for (let i = 0; i < points.length; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `Vertex ${i + 1}`;
    shipPolygonVertexSelect.append(option);
  }
  const maxIndex = Math.max(0, points.length - 1);
  state.shipPolygonEditor.selectedVertexIndex = Math.min(state.shipPolygonEditor.selectedVertexIndex, maxIndex);
  state.shipPolygonEditor.selectedEdgeIndex = Math.min(state.shipPolygonEditor.selectedEdgeIndex, maxIndex);
  shipPolygonVertexSelect.value = String(state.shipPolygonEditor.selectedVertexIndex);
  shipPolygonDeleteVertexButton.disabled = points.length <= 3 || !playAreaVerticesVisible;
  shipPolygonVertexSelect.disabled = !playAreaVerticesVisible;
}

function syncShipPolygonEdgeSelect() {
  shipPolygonEdgeSelect.replaceChildren();
  const playAreaVerticesVisible = state.polygonEditor.playAreaVerticesVisible !== false;
  const points = getShipPolygonPoints(state.boardId);
  for (let i = 0; i < points.length; i += 1) {
    const option = document.createElement("option");
    const next = i === points.length - 1 ? 1 : i + 2;
    option.value = String(i);
    option.textContent = `Edge ${i + 1} (Vertex ${i + 1} -> ${next})`;
    shipPolygonEdgeSelect.append(option);
  }
  const maxIndex = Math.max(0, points.length - 1);
  state.shipPolygonEditor.selectedEdgeIndex = Math.min(state.shipPolygonEditor.selectedEdgeIndex, maxIndex);
  shipPolygonEdgeSelect.value = String(state.shipPolygonEditor.selectedEdgeIndex);
  shipPolygonEdgeSelect.disabled = !playAreaVerticesVisible;
}

function syncShipPolygonEditorPanel() {
  const playAreas = getPlayAreas(state.boardId);
  const selectedPlayAreaId = getSelectedPlayAreaId(state.boardId);
  if (playAreaSelect) {
    playAreaSelect.replaceChildren();
    for (const area of playAreas) {
      const option = document.createElement("option");
      option.value = area.id;
      option.textContent = `${area.name} (${area.id})`;
      playAreaSelect.append(option);
    }
    playAreaSelect.value = selectedPlayAreaId;
    playAreaSelect.disabled = playAreas.length === 0;
  }
  if (playAreaNameInput) {
    const selectedArea = getSelectedPlayArea(state.boardId);
    playAreaNameInput.value = selectedArea?.name ?? "";
    playAreaNameInput.disabled = playAreas.length === 0;
  }
  if (playAreaDeleteButton) {
    playAreaDeleteButton.disabled = playAreas.length <= 1;
  }
  if (playAreaCreateButton) {
    playAreaCreateButton.disabled = false;
  }
  const playAreaVerticesVisible = state.polygonEditor.playAreaVerticesVisible !== false;
  if (showPlayAreaVerticesInput) {
    showPlayAreaVerticesInput.checked = playAreaVerticesVisible;
  }
  shipPolygonVertexSelect.disabled = !playAreaVerticesVisible;
  shipPolygonEdgeSelect.disabled = !playAreaVerticesVisible;
  shipPolygonInsertVertexButton.disabled = !playAreaVerticesVisible;
  shipPolygonDeleteVertexButton.disabled = !playAreaVerticesVisible;
  syncShipPolygonVertexSelect();
  syncShipPolygonEdgeSelect();
  syncShipPolygonEditorStatus();
}

function areRoomVerticesEditable() {
  return state.polygonEditor.roomVerticesVisible !== false;
}

function arePlayAreaVerticesEditable() {
  return state.polygonEditor.playAreaVerticesVisible !== false;
}

function getOutsideCodedAssetKeys() {
  const knownOutsideRendererIds = OUTSIDE_SHIP_GLOBAL_ANIMATIONS
    .map((entry) => normalizeOutsideAnimationId(entry?.id, ""))
    .filter(Boolean);
  return Array.from(new Set(["outside-space", ...knownOutsideRendererIds]));
}

function getInsideCodedAssetKeys() {
  const knownInsideRendererIds = createDefaultInsideAnimationDefinitions()
    .map((entry) => normalizeInsideAnimationId(entry?.id, ""))
    .filter(Boolean);
  return Array.from(new Set(knownInsideRendererIds));
}

function getRoomCodedAssetKeys() {
  const knownDefaultRefs = createDefaultRoomAnimationDefinitions()
    .filter((entry) => normalizeRoomAssetType(entry?.assetType) === "coded")
    .map((entry) => String(entry?.assetRef || "").trim().toLowerCase())
    .filter(Boolean);
  const knownInsideRendererIds = getInsideCodedAssetKeys();
  return Array.from(new Set([
    ...knownInsideRendererIds,
    ...knownDefaultRefs,
    "special-slime",
    "special-scanning",
  ]));
}

function normalizeRoomCodedAssetRef(assetRef, fallbackAssetRef = "intruder-alert") {
  const normalizedRef = String(assetRef || "").trim().toLowerCase();
  if (getRoomCodedAssetKeys().includes(normalizedRef)) {
    return normalizedRef;
  }
  const normalizedFallback = String(fallbackAssetRef || "").trim().toLowerCase();
  if (getRoomCodedAssetKeys().includes(normalizedFallback)) {
    return normalizedFallback;
  }
  return getRoomCodedAssetKeys()[0] ?? "intruder-alert";
}

function getRoomAssetCandidates(assetType) {
  const normalizedType = normalizeRoomAssetType(assetType);
  if (normalizedType === "coded") {
    return getRoomCodedAssetKeys();
  }
  const extension = normalizedType === "mp4" ? ".mp4" : ".gif";
  return outsideResourceAssets.filter((entry) => entry.toLowerCase().endsWith(extension));
}

function normalizeRoomAssetRefForType(assetType, assetRef, fallbackAssetRef = "") {
  const normalizedType = normalizeRoomAssetType(assetType);
  const rawRef = String(assetRef || "").trim();
  if (normalizedType === "coded") {
    return normalizeRoomCodedAssetRef(rawRef, fallbackAssetRef);
  }

  const expectedExtension = normalizedType === "mp4" ? ".mp4" : ".gif";
  const isValidResourceRef = rawRef.startsWith("/resources/") && rawRef.toLowerCase().endsWith(expectedExtension);
  if (isValidResourceRef) {
    return rawRef;
  }

  const normalizedFallback = String(fallbackAssetRef || "").trim();
  const fallbackValid =
    normalizedFallback.startsWith("/resources/") && normalizedFallback.toLowerCase().endsWith(expectedExtension);
  if (fallbackValid) {
    return normalizedFallback;
  }

  const firstCandidate = getRoomAssetCandidates(normalizedType)[0];
  return firstCandidate || "";
}

function resolveRoomCodedEffectType(assetRef) {
  return normalizeRoomCodedAssetRef(assetRef);
}

function normalizeInsideCodedAssetRef(assetRef, fallbackAssetRef = "hull-flicker") {
  const normalizedRef = String(assetRef || "").trim().toLowerCase();
  if (getInsideCodedAssetKeys().includes(normalizedRef)) {
    return normalizedRef;
  }
  const normalizedFallback = String(fallbackAssetRef || "").trim().toLowerCase();
  if (getInsideCodedAssetKeys().includes(normalizedFallback)) {
    return normalizedFallback;
  }
  return getInsideCodedAssetKeys()[0] ?? "hull-flicker";
}

function getInsideAssetCandidates(assetType) {
  const normalizedType = normalizeInsideAssetType(assetType);
  if (normalizedType === "coded") {
    return getInsideCodedAssetKeys();
  }
  const extension = normalizedType === "mp4" ? ".mp4" : ".gif";
  return outsideResourceAssets.filter((entry) => entry.toLowerCase().endsWith(extension));
}

function normalizeInsideAssetRefForType(assetType, assetRef, fallbackAssetRef = "") {
  const normalizedType = normalizeInsideAssetType(assetType);
  const rawRef = String(assetRef || "").trim();
  if (normalizedType === "coded") {
    return normalizeInsideCodedAssetRef(rawRef, fallbackAssetRef);
  }

  const expectedExtension = normalizedType === "mp4" ? ".mp4" : ".gif";
  const isValidResourceRef = rawRef.startsWith("/resources/") && rawRef.toLowerCase().endsWith(expectedExtension);
  if (isValidResourceRef) {
    return rawRef;
  }

  const normalizedFallback = String(fallbackAssetRef || "").trim();
  const fallbackValid =
    normalizedFallback.startsWith("/resources/") && normalizedFallback.toLowerCase().endsWith(expectedExtension);
  if (fallbackValid) {
    return normalizedFallback;
  }

  const firstCandidate = getInsideAssetCandidates(normalizedType)[0];
  return firstCandidate || "";
}

function resolveInsideCodedEffectType(assetRef) {
  const normalized = normalizeInsideCodedAssetRef(assetRef);
  return getInsideCodedAssetKeys().includes(normalized) ? normalized : "hull-flicker";
}

function normalizeOutsideCodedAssetRef(assetRef) {
  const normalizedRef = String(assetRef || "").trim().toLowerCase();
  if (getOutsideCodedAssetKeys().includes(normalizedRef)) {
    return normalizedRef;
  }
  return "outside-space";
}

function getOutsideAssetCandidates(assetType) {
  const normalizedType = normalizeOutsideAssetType(assetType);
  if (normalizedType === "coded") {
    return getOutsideCodedAssetKeys();
  }
  const extension = normalizedType === "mp4" ? ".mp4" : ".gif";
  return outsideResourceAssets.filter((entry) => entry.toLowerCase().endsWith(extension));
}

function normalizeOutsideAssetRefForType(assetType, assetRef, fallbackAssetRef = "") {
  const normalizedType = normalizeOutsideAssetType(assetType);
  const rawRef = String(assetRef || "").trim();
  if (normalizedType === "coded") {
    return normalizeOutsideCodedAssetRef(rawRef);
  }

  const expectedExtension = normalizedType === "mp4" ? ".mp4" : ".gif";
  const isValidResourceRef = rawRef.startsWith("/resources/") && rawRef.toLowerCase().endsWith(expectedExtension);
  if (isValidResourceRef) {
    return rawRef;
  }

  const normalizedFallback = String(fallbackAssetRef || "").trim();
  const fallbackValid =
    normalizedFallback.startsWith("/resources/") && normalizedFallback.toLowerCase().endsWith(expectedExtension);
  if (fallbackValid) {
    return normalizedFallback;
  }

  const firstCandidate = getOutsideAssetCandidates(normalizedType)[0];
  return firstCandidate || "";
}

function resolveOutsideCodedEffectType(assetRef) {
  if (getOutsideCodedAssetKeys().includes(normalizeOutsideCodedAssetRef(assetRef))) {
    return "outside-space";
  }
  return "outside-space";
}

function isOutsideModeDirectionApplicable(definition) {
  if (!definition) {
    return false;
  }
  if (normalizeOutsideAssetType(definition.assetType) !== "coded") {
    return false;
  }
  return resolveOutsideCodedEffectType(definition.assetRef) === "outside-space";
}

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

function syncOutsideModeDirectionVisibility(definition) {
  const visible = isOutsideModeDirectionApplicable(definition);
  setConditionalFieldMounted(outsideModeFieldMount, visible);
  setConditionalFieldMounted(outsideDirectionFieldMount, visible);
  if (outsideAnimationsPanel) {
    outsideAnimationsPanel.dataset.outsideModeDirectionVisible = visible ? "true" : "false";
  }
  if (outsideModeField) {
    outsideModeField.hidden = false;
    outsideModeField.setAttribute("aria-hidden", "false");
  }
  if (outsideDirectionField) {
    outsideDirectionField.hidden = false;
    outsideDirectionField.setAttribute("aria-hidden", "false");
  }
  if (outsideModeInput) {
    if (!visible) {
      outsideModeInput.value = "standard";
    }
    outsideModeInput.disabled = !visible;
  }
  if (outsideDirectionInput) {
    if (!visible) {
      outsideDirectionInput.value = "forward";
    }
    outsideDirectionInput.disabled = !visible;
  }
}

function buildInsideProfileWithSelectedAnimationPatch(boardId = state.boardId, patch = {}, profileOverride = null) {
  const baseProfile = normalizeInsideFxProfile(profileOverride ?? getInsideFxProfile(boardId));
  const selectedDefinition =
    baseProfile.animations.find((entry) => entry.id === baseProfile.selectedAnimationId) ?? baseProfile.animations[0];
  if (!selectedDefinition) {
    return baseProfile;
  }
  const nextAnimations = baseProfile.animations.map((entry) => {
    if (entry.id !== selectedDefinition.id) {
      return entry;
    }
    return normalizeInsideAnimationDefinition({
      ...entry,
      ...patch,
    });
  });
  return normalizeInsideFxProfile({
    ...baseProfile,
    selectedAnimationId: selectedDefinition.id,
    animations: nextAnimations,
  });
}

function syncInsideResourcePicker(assetTypeOverride = null, selectedAssetRef = "") {
  if (!insideResourceSelect) {
    return;
  }
  const assetType = normalizeInsideAssetType(assetTypeOverride ?? insideAssetTypeInput?.value);
  const candidateAssets = getInsideAssetCandidates(assetType);
  insideResourceSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent =
    candidateAssets.length > 0
      ? assetType === "coded"
        ? "Select coded renderer key…"
        : `Select ${assetType.toUpperCase()} resource asset…`
      : assetType === "coded"
        ? "No coded renderer keys available"
        : `No ${assetType.toUpperCase()} resource assets available`;
  insideResourceSelect.append(placeholder);
  for (const assetPath of candidateAssets) {
    const option = document.createElement("option");
    option.value = assetPath;
    option.textContent = assetType === "coded" ? assetPath : assetPath.replace(/^\//, "");
    insideResourceSelect.append(option);
  }
  insideResourceSelect.value = candidateAssets.includes(selectedAssetRef) ? selectedAssetRef : "";
}

function getInsideEditorDraft(boardId = state.boardId, selectedDefinition = null) {
  const definition = selectedDefinition ?? getSelectedInsideAnimationDefinition(boardId);
  if (!definition) {
    delete insideEditorDraftByBoard[boardId];
    return null;
  }
  const existing = insideEditorDraftByBoard[boardId];
  if (existing && existing.animationId === definition.id) {
    return existing;
  }
  const next = {
    animationId: definition.id,
    intensity: clampOutsideIntensity(definition.intensity),
    speed: clampOutsideSpeed(definition.speed),
    assetType: normalizeInsideAssetType(definition.assetType),
    assetRef: String(definition.assetRef || "").trim(),
    loopUntilStopped: Boolean(definition.loopUntilStopped),
  };
  insideEditorDraftByBoard[boardId] = next;
  return next;
}

function setInsideEditorDraft(boardId = state.boardId, partial = {}) {
  const base = getInsideEditorDraft(boardId);
  if (!base) {
    return null;
  }
  const next = {
    ...base,
    ...partial,
    intensity: clampOutsideIntensity(partial?.intensity ?? base.intensity),
    speed: clampOutsideSpeed(partial?.speed ?? base.speed),
    assetType: normalizeInsideAssetType(partial?.assetType ?? base.assetType),
    assetRef: String(partial?.assetRef ?? base.assetRef ?? "").trim(),
    loopUntilStopped: Boolean(partial?.loopUntilStopped ?? base.loopUntilStopped),
  };
  insideEditorDraftByBoard[boardId] = next;
  return next;
}

function collectInsideEditorDraftFromInputs(boardId = state.boardId) {
  const assetType = normalizeInsideAssetType(insideAssetTypeInput?.value);
  const assetRef = normalizeInsideAssetRefForType(
    assetType,
    String(insideAssetRefInput?.value || "").trim(),
  );
  return setInsideEditorDraft(boardId, {
    intensity: clampOutsideIntensity(insideIntensityInput?.value),
    speed: clampOutsideSpeed(insideSpeedInput?.value),
    assetType,
    assetRef,
    loopUntilStopped: Boolean(insideLoopUntilStopInput?.checked),
  });
}

function syncInsideFxPanel() {
  const inside = getInsideFxProfile(state.boardId);
  const selectedDefinition = getSelectedInsideAnimationDefinition(state.boardId);
  const draft = getInsideEditorDraft(state.boardId, selectedDefinition);
  if (insideAnimationSelect) {
    insideAnimationSelect.replaceChildren();
    for (const definition of inside.animations) {
      const option = document.createElement("option");
      option.value = definition.id;
      option.textContent = `${definition.name} (${definition.id})`;
      insideAnimationSelect.append(option);
    }
    insideAnimationSelect.value = selectedDefinition?.id ?? inside.animations[0]?.id ?? "";
  }
  const intensity = draft?.intensity ?? selectedDefinition?.intensity ?? inside.intensity;
  const speed = draft?.speed ?? selectedDefinition?.speed ?? inside.speed;
  const assetType = normalizeInsideAssetType(draft?.assetType ?? selectedDefinition?.assetType ?? inside.assetType);
  const assetRef = normalizeInsideAssetRefForType(
    assetType,
    draft?.assetRef ?? selectedDefinition?.assetRef ?? inside.assetRef ?? "",
    selectedDefinition?.assetRef ?? inside.assetRef ?? "",
  );
  if (draft && (draft.assetType !== assetType || draft.assetRef !== assetRef)) {
    setInsideEditorDraft(state.boardId, { assetType, assetRef });
  }
  insideIntensityInput.value = String(intensity);
  insideSpeedInput.value = String(speed);
  if (insideAssetTypeInput) {
    insideAssetTypeInput.value = assetType;
  }
  if (insideAssetRefInput) {
    insideAssetRefInput.value = assetRef;
  }
  if (insideLoopUntilStopInput) {
    insideLoopUntilStopInput.checked = Boolean(
      draft?.loopUntilStopped
      ?? selectedDefinition?.loopUntilStopped
      ?? inside.loopUntilStopped,
    );
  }
  syncInsideResourcePicker(assetType, assetRef);
  insideIntensityValue.textContent = intensity.toFixed(2);
  insideSpeedValue.textContent = `${speed.toFixed(2)}x`;
  renderInsideGlobalButtons();
}

function renderInsideGlobalButtons() {
  if (!insideGlobalButtons) {
    return;
  }
  const inside = getInsideFxProfile(state.boardId);
  insideGlobalButtons.replaceChildren();
  for (const definition of inside.animations) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.global = definition.id;
    button.textContent = definition.name;
    insideGlobalButtons.append(button);
  }
}

function getRoomAnimationLabelById(animationId, boardId = state.boardId) {
  const definition = getRoomAnimationDefinitionById(animationId, boardId);
  if (definition?.name) {
    return definition.name;
  }
  return ROOM_ANIMATIONS.find((item) => item.id === animationId)?.label ?? animationId;
}

function syncRoomResourcePicker(assetTypeOverride = null, selectedAssetRef = "") {
  if (!roomResourceSelect) {
    return;
  }
  const assetType = normalizeRoomAssetType(assetTypeOverride ?? roomAssetTypeInput?.value);
  const candidateAssets = getRoomAssetCandidates(assetType);
  roomResourceSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent =
    candidateAssets.length > 0
      ? assetType === "coded"
        ? "Select coded renderer key…"
        : `Select ${assetType.toUpperCase()} resource asset…`
      : assetType === "coded"
        ? "No coded renderer keys available"
        : `No ${assetType.toUpperCase()} resource assets available`;
  roomResourceSelect.append(placeholder);
  for (const assetPath of candidateAssets) {
    const option = document.createElement("option");
    option.value = assetPath;
    option.textContent = assetType === "coded" ? assetPath : assetPath.replace(/^\//, "");
    roomResourceSelect.append(option);
  }
  roomResourceSelect.value = candidateAssets.includes(selectedAssetRef) ? selectedAssetRef : "";
}

function getRoomEditorDraft(boardId = state.boardId, selectedDefinition = null) {
  const definition = selectedDefinition ?? getSelectedRoomAnimationDefinition(boardId);
  if (!definition) {
    delete roomEditorDraftByBoard[boardId];
    return null;
  }
  const existing = roomEditorDraftByBoard[boardId];
  if (existing && existing.animationId === definition.id) {
    return existing;
  }
  const next = {
    animationId: definition.id,
    assetType: normalizeRoomAssetType(definition.assetType),
    assetRef: String(definition.assetRef || "").trim(),
  };
  roomEditorDraftByBoard[boardId] = next;
  return next;
}

function setRoomEditorDraft(boardId = state.boardId, partial = {}) {
  const base = getRoomEditorDraft(boardId);
  if (!base) {
    return null;
  }
  const next = {
    ...base,
    ...partial,
    assetType: normalizeRoomAssetType(partial?.assetType ?? base.assetType),
    assetRef: String(partial?.assetRef ?? base.assetRef ?? "").trim(),
  };
  roomEditorDraftByBoard[boardId] = next;
  return next;
}

function collectRoomEditorDraftFromInputs(boardId = state.boardId) {
  const assetType = normalizeRoomAssetType(roomAssetTypeInput?.value);
  const assetRef = normalizeRoomAssetRefForType(
    assetType,
    String(roomAssetRefInput?.value || "").trim(),
  );
  return setRoomEditorDraft(boardId, {
    assetType,
    assetRef,
  });
}

function syncRoomFxPanel() {
  const roomFx = getRoomFxProfile(state.boardId);
  const selectedDefinition = getSelectedRoomAnimationDefinition(state.boardId);
  const draft = getRoomEditorDraft(state.boardId, selectedDefinition);

  if (roomAnimationSettingsSelect) {
    roomAnimationSettingsSelect.replaceChildren();
    for (const definition of roomFx.animations) {
      const option = document.createElement("option");
      option.value = definition.id;
      option.textContent = `${definition.name} (${definition.id})`;
      roomAnimationSettingsSelect.append(option);
    }
    roomAnimationSettingsSelect.value = selectedDefinition?.id ?? roomFx.animations[0]?.id ?? "";
  }

  if (roomAnimationSelect) {
    roomAnimationSelect.replaceChildren();
    for (const definition of roomFx.animations) {
      const option = document.createElement("option");
      option.value = definition.id;
      option.textContent = definition.name;
      roomAnimationSelect.append(option);
    }
    const selectedDraftId = normalizeRoomAnimationId(
      state.roomDraft.animationId,
      selectedDefinition?.id ?? roomFx.animations[0]?.id ?? "kaputt",
    );
    const validSelectedDraftId = roomFx.animations.some((entry) => entry.id === selectedDraftId)
      ? selectedDraftId
      : roomFx.animations[0]?.id ?? "kaputt";
    state.roomDraft.animationId = validSelectedDraftId;
    roomAnimationSelect.value = validSelectedDraftId;
  }

  const assetType = normalizeRoomAssetType(draft?.assetType ?? selectedDefinition?.assetType);
  const assetRef = normalizeRoomAssetRefForType(
    assetType,
    draft?.assetRef ?? selectedDefinition?.assetRef ?? "",
    selectedDefinition?.assetRef ?? "",
  );
  if (draft && (draft.assetType !== assetType || draft.assetRef !== assetRef)) {
    setRoomEditorDraft(state.boardId, { assetType, assetRef });
  }
  if (roomAssetTypeInput) {
    roomAssetTypeInput.value = assetType;
  }
  if (roomAssetRefInput) {
    roomAssetRefInput.value = assetRef;
  }
  if (roomAnimationSettingsDeleteButton) {
    roomAnimationSettingsDeleteButton.disabled = roomFx.animations.length <= 1;
  }
  syncRoomResourcePicker(assetType, assetRef);
}

function buildOutsideProfileWithSelectedAnimationPatch(boardId = state.boardId, patch = {}, profileOverride = null) {
  const baseProfile = normalizeOutsideFxProfile(profileOverride ?? getOutsideFxProfile(boardId));
  const selectedDefinition =
    baseProfile.animations.find((entry) => entry.id === baseProfile.selectedAnimationId) ?? baseProfile.animations[0];
  if (!selectedDefinition) {
    return baseProfile;
  }
  const nextAnimations = baseProfile.animations.map((entry) => {
    if (entry.id !== selectedDefinition.id) {
      return entry;
    }
    return normalizeOutsideAnimationDefinition({
      ...entry,
      ...patch,
    });
  });
  return normalizeOutsideFxProfile({
    ...baseProfile,
    selectedAnimationId: selectedDefinition.id,
    animations: nextAnimations,
  });
}

function syncOutsideResourcePicker(assetTypeOverride = null, selectedAssetRef = "") {
  if (!outsideResourceSelect) {
    return;
  }
  const assetType = normalizeOutsideAssetType(assetTypeOverride ?? outsideAssetTypeInput?.value);
  const candidateAssets = getOutsideAssetCandidates(assetType);
  outsideResourceSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent =
    candidateAssets.length > 0
      ? assetType === "coded"
        ? "Select coded renderer key…"
        : `Select ${assetType.toUpperCase()} resource asset…`
      : assetType === "coded"
        ? "No coded renderer keys available"
        : `No ${assetType.toUpperCase()} resource assets available`;
  outsideResourceSelect.append(placeholder);
  for (const assetPath of candidateAssets) {
    const option = document.createElement("option");
    option.value = assetPath;
    option.textContent = assetType === "coded" ? assetPath : assetPath.replace(/^\//, "");
    outsideResourceSelect.append(option);
  }
  outsideResourceSelect.value = candidateAssets.includes(selectedAssetRef) ? selectedAssetRef : "";
}

async function loadOutsideResourceAssets() {
  try {
    const response = await fetch("/api/resources");
    if (!response.ok) {
      throw new Error(`resource list failed (${response.status})`);
    }
    const payload = await response.json();
    const files = Array.isArray(payload?.files) ? payload.files : [];
    outsideResourceAssets = files
      .map((entry) => String(entry || "").trim())
      .filter((entry) => entry.startsWith("/resources/") && /\.(gif|mp4)$/i.test(entry))
      .sort();
  } catch {
    outsideResourceAssets = [];
  }
  syncOutsideResourcePicker(outsideAssetTypeInput?.value, String(outsideAssetRefInput?.value || "").trim());
  syncInsideResourcePicker(insideAssetTypeInput?.value, String(insideAssetRefInput?.value || "").trim());
  syncRoomResourcePicker(roomAssetTypeInput?.value, String(roomAssetRefInput?.value || "").trim());
}

function getOutsideEditorDraft(boardId = state.boardId, selectedDefinition = null) {
  const definition = selectedDefinition ?? getSelectedOutsideAnimationDefinition(boardId);
  if (!definition) {
    delete outsideEditorDraftByBoard[boardId];
    return null;
  }
  const existing = outsideEditorDraftByBoard[boardId];
  if (existing && existing.animationId === definition.id) {
    return existing;
  }
  const next = {
    animationId: definition.id,
    intensity: clampOutsideIntensity(definition.intensity),
    speed: clampOutsideSpeed(definition.speed),
    mode: normalizeOutsideMode(definition.mode),
    direction: normalizeOutsideDirection(definition.direction),
    assetType: normalizeOutsideAssetType(definition.assetType),
    assetRef: String(definition.assetRef || "").trim(),
  };
  outsideEditorDraftByBoard[boardId] = next;
  return next;
}

function setOutsideEditorDraft(boardId = state.boardId, partial = {}) {
  const base = getOutsideEditorDraft(boardId);
  if (!base) {
    return null;
  }
  const next = {
    ...base,
    ...partial,
    intensity: clampOutsideIntensity(partial?.intensity ?? base.intensity),
    speed: clampOutsideSpeed(partial?.speed ?? base.speed),
    mode: normalizeOutsideMode(partial?.mode ?? base.mode),
    direction: normalizeOutsideDirection(partial?.direction ?? base.direction),
    assetType: normalizeOutsideAssetType(partial?.assetType ?? base.assetType),
    assetRef: String(partial?.assetRef ?? base.assetRef ?? "").trim(),
  };
  outsideEditorDraftByBoard[boardId] = next;
  return next;
}

function collectOutsideEditorDraftFromInputs(boardId = state.boardId) {
  const assetType = normalizeOutsideAssetType(outsideAssetTypeInput?.value);
  const assetRef = normalizeOutsideAssetRefForType(
    assetType,
    String(outsideAssetRefInput?.value || "").trim(),
  );
  const allowModeDirection = isOutsideModeDirectionApplicable({ assetType, assetRef });
  return setOutsideEditorDraft(boardId, {
    intensity: clampOutsideIntensity(outsideIntensityInput?.value),
    speed: clampOutsideSpeed(outsideSpeedInput?.value),
    mode: allowModeDirection ? normalizeOutsideMode(outsideModeInput?.value) : "standard",
    direction: allowModeDirection ? normalizeOutsideDirection(outsideDirectionInput?.value) : "forward",
    assetType,
    assetRef,
  });
}

function syncOutsideDraftVisibilityFromInputs(boardId = state.boardId) {
  const assetType = normalizeOutsideAssetType(outsideAssetTypeInput?.value);
  const assetRef = normalizeOutsideAssetRefForType(assetType, String(outsideAssetRefInput?.value || "").trim());
  setOutsideEditorDraft(boardId, {
    assetType,
    assetRef,
  });
  if (outsideAssetRefInput) {
    outsideAssetRefInput.value = assetRef;
  }
  syncOutsideModeDirectionVisibility({ assetType, assetRef });
  syncOutsideResourcePicker(assetType, assetRef);
}

function syncOutsideFxPanel() {
  const outside = getOutsideFxProfile(state.boardId);
  const selectedDefinition = getSelectedOutsideAnimationDefinition(state.boardId);
  const draft = getOutsideEditorDraft(state.boardId, selectedDefinition);
  if (outsideAnimationSelect) {
    outsideAnimationSelect.replaceChildren();
    for (const definition of outside.animations) {
      const option = document.createElement("option");
      option.value = definition.id;
      option.textContent = `${definition.name} (${definition.id})`;
      outsideAnimationSelect.append(option);
    }
    outsideAnimationSelect.value = selectedDefinition?.id ?? outside.animations[0]?.id ?? "";
  }
  outsideEnabledInput.checked = outside.enabled;
  const intensity = draft?.intensity ?? selectedDefinition?.intensity ?? outside.intensity;
  const speed = draft?.speed ?? selectedDefinition?.speed ?? outside.speed;
  const mode = isOutsideModeDirectionApplicable(selectedDefinition)
    ? draft?.mode ?? selectedDefinition?.mode ?? outside.mode
    : "standard";
  const direction = isOutsideModeDirectionApplicable(selectedDefinition)
    ? draft?.direction ?? selectedDefinition?.direction ?? outside.direction
    : "forward";
  const assetType = normalizeOutsideAssetType(draft?.assetType ?? selectedDefinition?.assetType ?? outside.assetType);
  const assetRef = normalizeOutsideAssetRefForType(
    assetType,
    draft?.assetRef ?? selectedDefinition?.assetRef ?? outside.assetRef ?? "",
    selectedDefinition?.assetRef ?? outside.assetRef ?? "",
  );
  if (draft && (draft.assetType !== assetType || draft.assetRef !== assetRef)) {
    setOutsideEditorDraft(state.boardId, { assetType, assetRef });
  }
  outsideIntensityInput.value = String(intensity);
  outsideSpeedInput.value = String(speed);
  outsideModeInput.value = mode;
  outsideDirectionInput.value = direction;
  if (outsideAssetTypeInput) {
    outsideAssetTypeInput.value = assetType;
  }
  if (outsideAssetRefInput) {
    outsideAssetRefInput.value = assetRef;
  }
  syncOutsideModeDirectionVisibility({
    ...selectedDefinition,
    assetType,
    assetRef,
  });
  syncOutsideResourcePicker(assetType, assetRef);
  outsideIntensityValue.textContent = intensity.toFixed(2);
  outsideSpeedValue.textContent = `${speed.toFixed(2)}x`;
}

function findOutsideGlobalAnimation(boardId) {
  return state.runningAnimations.find(
    (animation) =>
      animation.scope === "global" && animation.type === "outside-space" && animation.boardId === boardId,
  );
}

function syncOutsideRuntimeMirror(boardId = state.boardId) {
  const outsideEnabled = getOutsideFxProfile(boardId).enabled;
  const existing = findOutsideGlobalAnimation(boardId);

  if (outsideEnabled && !existing) {
    const outsideAnimation = createAnimation({
      boardId,
      type: "outside-space",
      scope: "global",
      intensity: 1,
      hold: true,
      durationSec: 0,
    });
    state.runningAnimations.push(outsideAnimation);
    playSoundForAnimation(outsideAnimation);
    return true;
  }

  if (!outsideEnabled && existing) {
    stopAnimationSound(existing.id);
    state.runningAnimations = state.runningAnimations.filter((animation) => animation.id !== existing.id);
    clearOutsideMp4PlaybackState(boardId);
    clearOutsideTimelineState(boardId);
    return true;
  }

  return false;
}

function beginShipPolygonVertexDrag(event, vertexIndex) {
  state.shipPolygonEditor.dragVertexIndex = vertexIndex;
  state.shipPolygonEditor.dragPointerId = event.pointerId;
  state.shipPolygonEditor.dragBoardId = state.boardId;
  state.shipPolygonEditor.dragStartPoints = getShipPolygonPoints(state.boardId);
  state.shipPolygonEditor.dragMoved = false;
  try {
    roomOverlay.setPointerCapture(event.pointerId);
  } catch {
    // pointer capture can fail on unsupported devices; drag still continues
  }
}

function clearShipPolygonDragSession() {
  state.shipPolygonEditor.dragVertexIndex = null;
  state.shipPolygonEditor.dragPointerId = null;
  state.shipPolygonEditor.dragBoardId = null;
  state.shipPolygonEditor.dragStartPoints = null;
  state.shipPolygonEditor.dragMoved = false;
}

function commitShipPolygonDrag() {
  const persisted = persistBoardProfiles();
  triggerFeedback.textContent = persisted
    ? "Status: Play Area vertex moved"
    : "Status: Play Area vertex moved (persistence failed)";
}

function cancelShipPolygonDrag() {
  const { dragBoardId, dragStartPoints } = state.shipPolygonEditor;
  if (dragBoardId && Array.isArray(dragStartPoints)) {
    setShipPolygonPoints(dragBoardId, dragStartPoints);
  }
  renderRoomOverlay();
  syncShipPolygonEditorStatus();
  triggerFeedback.textContent = "Status: Play Area drag canceled";
}

function finishShipPolygonVertexDrag(event, { cancel = false } = {}) {
  const pointerId = state.shipPolygonEditor.dragPointerId;
  if (pointerId !== null && event && roomOverlay.hasPointerCapture(pointerId)) {
    roomOverlay.releasePointerCapture(pointerId);
  }
  const moved = state.shipPolygonEditor.dragMoved;
  if (cancel) {
    cancelShipPolygonDrag();
  } else if (moved) {
    commitShipPolygonDrag();
  }
  clearShipPolygonDragSession();
}

function renderShipPolygonEditorHandles() {
  if (state.uiView !== "settings") {
    return;
  }
  if (state.polygonEditor.playAreaVerticesVisible === false) {
    return;
  }
  const selectedPlayAreaId = getSelectedPlayAreaId(state.boardId);
  const allAreas = getPlayAreas(state.boardId);
  const selectedArea = allAreas.find((entry) => entry.id === selectedPlayAreaId) ?? allAreas[0];
  const points = normalizeShipPolygon(selectedArea?.polygon).map(([x, y]) => [x * 1000, y * 1000]);
  if (points.length < 3) {
    return;
  }
  const zoomScale = getBoardZoom(state.boardId).scale;
  const {
    edgeHitRadius,
    edgeHandleRadius,
    vertexHitRadius,
    vertexHandleRadius,
    vertexLabelSize,
  } = getPolygonEditorHandleMetrics(zoomScale, getCurrentPolygonHandleScale());

  for (const area of allAreas) {
    const areaPoints = normalizeShipPolygon(area?.polygon).map(([x, y]) => [x * 1000, y * 1000]);
    if (areaPoints.length < 3) {
      continue;
    }
    const maskPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    maskPolygon.classList.add("ship-zone-mask");
    if (area.id === selectedPlayAreaId) {
      maskPolygon.classList.add("is-active");
    }
    maskPolygon.setAttribute("points", areaPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
    roomOverlay.append(maskPolygon);
  }

  for (let index = 0; index < points.length; index += 1) {
    const [aX, aY] = points[index];
    const [bX, bY] = points[(index + 1) % points.length];
    const edgeMarker = document.createElementNS("http://www.w3.org/2000/svg", "g");
    edgeMarker.classList.add("polygon-edge-marker", "ship-polygon-edge-marker");
    const edgeHitTarget = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    edgeHitTarget.classList.add("polygon-edge-hit-target", "ship-polygon-edge-hit-target");
    const edgeHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    edgeHandle.classList.add("polygon-edge-handle", "ship-polygon-edge-handle");
    if (index === state.shipPolygonEditor.selectedEdgeIndex) {
      edgeHandle.classList.add("is-active");
      edgeHitTarget.classList.add("is-active");
    }
    const centerX = ((aX + bX) / 2).toFixed(1);
    const centerY = ((aY + bY) / 2).toFixed(1);
    edgeHitTarget.setAttribute("cx", centerX);
    edgeHitTarget.setAttribute("cy", centerY);
    edgeHitTarget.setAttribute("r", edgeHitRadius.toFixed(2));
    edgeHandle.setAttribute("cx", centerX);
    edgeHandle.setAttribute("cy", centerY);
    edgeHandle.setAttribute("r", edgeHandleRadius.toFixed(2));
    edgeHitTarget.addEventListener("pointerdown", (event) => {
      if (isPanArbitrating() || !isAcceptablePolygonPointerEvent(event) || !arePlayAreaVerticesEditable()) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      state.shipPolygonEditor.selectedEdgeIndex = index;
      shipPolygonEdgeSelect.value = String(index);
      renderRoomOverlay();
      syncShipPolygonEditorStatus();
    });
    edgeMarker.append(edgeHitTarget, edgeHandle);
    roomOverlay.append(edgeMarker);
  }

  points.forEach(([x, y], index) => {
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
    marker.classList.add("polygon-vertex-marker", "ship-polygon-vertex-marker");
    const hitTarget = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hitTarget.classList.add("polygon-vertex-hit-target", "ship-polygon-vertex-hit-target");
    const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    handle.classList.add("polygon-vertex-handle", "ship-polygon-vertex-handle");
    if (index === state.shipPolygonEditor.selectedVertexIndex) {
      handle.classList.add("is-active");
      marker.classList.add("is-active");
      hitTarget.classList.add("is-active");
    }
    hitTarget.dataset.vertexIndex = String(index);
    hitTarget.setAttribute("cx", x.toFixed(1));
    hitTarget.setAttribute("cy", y.toFixed(1));
    hitTarget.setAttribute("r", vertexHitRadius.toFixed(2));
    handle.setAttribute("cx", x.toFixed(1));
    handle.setAttribute("cy", y.toFixed(1));
    handle.setAttribute("r", vertexHandleRadius.toFixed(2));

    const indexLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    indexLabel.classList.add("polygon-vertex-index", "ship-polygon-vertex-index");
    if (index === state.shipPolygonEditor.selectedVertexIndex) {
      indexLabel.classList.add("is-active");
    }
    indexLabel.style.fontSize = `${vertexLabelSize.toFixed(2)}px`;
    indexLabel.setAttribute("x", x.toFixed(1));
    indexLabel.setAttribute("y", (y + 3).toFixed(1));
    indexLabel.textContent = String(index + 1);

    hitTarget.addEventListener("pointerdown", (event) => {
      if (isPanArbitrating() || !isAcceptablePolygonPointerEvent(event) || !arePlayAreaVerticesEditable()) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      beginShipPolygonVertexDrag(event, index);
      state.shipPolygonEditor.selectedVertexIndex = index;
      syncShipPolygonVertexSelect();
    });
    marker.append(hitTarget, handle, indexLabel);
    roomOverlay.append(marker);
  });
}

function syncPolygonRoomSelection(roomId) {
  if (!roomId) {
    return;
  }
  const rooms = getSpecialRooms(state.boardId);
  if (!rooms.some((room) => room.id === roomId)) {
    return;
  }
  const previousRoomId = getActivePolygonRoomId(state.boardId);
  const roomChanged = previousRoomId !== roomId;
  setActivePolygonRoomId(state.boardId, roomId);
  state.selectedRoomId = roomId;
  state.selectedRoomByBoard[state.boardId] = roomId;
  if (roomChanged) {
    state.polygonEditor.selectedVertexIndex = 0;
    state.polygonEditor.selectedEdgeIndex = 0;
    state.polygonEditor.vertexSelectionActive = false;
  }
}

function renderPolygonEditorHandles() {
  if (state.uiView !== "settings") {
    return;
  }
  if (state.polygonEditor.roomVerticesVisible === false) {
    return;
  }
  const roomId = syncSelectedRoomStateForBoard(state.boardId);
  if (!roomId) {
    return;
  }
  setActivePolygonRoomId(state.boardId, roomId);
  const room = getBoard().rooms.find((entry) => entry.id === roomId);
  if (!room) {
    return;
  }
  const points = getRoomPoints(room, state.boardId);
  const zoomScale = getBoardZoom(state.boardId).scale;
  const {
    edgeHitRadius,
    edgeHandleRadius,
    vertexHitRadius,
    vertexHandleRadius,
    vertexLabelSize,
  } = getPolygonEditorHandleMetrics(zoomScale, getCurrentPolygonHandleScale());
  for (let index = 0; index < points.length; index += 1) {
    const [aX, aY] = points[index];
    const [bX, bY] = points[(index + 1) % points.length];
    const edgeMarker = document.createElementNS("http://www.w3.org/2000/svg", "g");
    edgeMarker.classList.add("polygon-edge-marker");
    const edgeHitTarget = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    edgeHitTarget.classList.add("polygon-edge-hit-target");
    const edgeHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    edgeHandle.classList.add("polygon-edge-handle");
    if (index === state.polygonEditor.selectedEdgeIndex) {
      edgeHandle.classList.add("is-active");
      edgeHitTarget.classList.add("is-active");
    }
    const centerX = ((aX + bX) / 2).toFixed(1);
    const centerY = ((aY + bY) / 2).toFixed(1);
    edgeHitTarget.setAttribute("cx", centerX);
    edgeHitTarget.setAttribute("cy", centerY);
    edgeHitTarget.setAttribute("r", edgeHitRadius.toFixed(2));
    edgeHandle.setAttribute("cx", centerX);
    edgeHandle.setAttribute("cy", centerY);
    edgeHandle.setAttribute("r", edgeHandleRadius.toFixed(2));
    edgeHitTarget.addEventListener("pointerdown", (event) => {
      if (isPanArbitrating() || !isAcceptablePolygonPointerEvent(event) || !areRoomVerticesEditable()) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      state.selectedRoomId = room.id;
      state.selectedRoomByBoard[state.boardId] = room.id;
      syncPolygonRoomSelection(room.id);
      state.polygonEditor.selectedEdgeIndex = index;
      state.polygonEditor.suppressRoomClickUntil = performance.now() + 220;
      syncPolygonEditorPanel();
      syncRoomPanelFromSelection({ preserveDraftState: true });
      polygonEdgeSelect.value = String(index);
      renderRoomOverlay();
      syncPolygonEditorStatus();
    });
    edgeMarker.append(edgeHitTarget, edgeHandle);
    roomOverlay.append(edgeMarker);
  }

  points.forEach(([x, y], index) => {
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
    marker.classList.add("polygon-vertex-marker");
    const hitTarget = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hitTarget.classList.add("polygon-vertex-hit-target");
    const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    handle.classList.add("polygon-vertex-handle");
    if (index === state.polygonEditor.selectedVertexIndex) {
      handle.classList.add("is-active");
      marker.classList.add("is-active");
      hitTarget.classList.add("is-active");
    }
    handle.dataset.vertexIndex = String(index);
    hitTarget.dataset.vertexIndex = String(index);
    // Phase 13-HF4: expose roomId so the central touch gesture manager
    // can look up which room this vertex belongs to.
    hitTarget.dataset.roomId = room.id;
    hitTarget.setAttribute("cx", x.toFixed(1));
    hitTarget.setAttribute("cy", y.toFixed(1));
    hitTarget.setAttribute("r", vertexHitRadius.toFixed(2));
    handle.setAttribute("cx", x.toFixed(1));
    handle.setAttribute("cy", y.toFixed(1));
    handle.setAttribute("r", vertexHandleRadius.toFixed(2));

    const indexLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    indexLabel.classList.add("polygon-vertex-index");
    if (index === state.polygonEditor.selectedVertexIndex) {
      indexLabel.classList.add("is-active");
    }
    indexLabel.style.fontSize = `${vertexLabelSize.toFixed(2)}px`;
    indexLabel.setAttribute("x", x.toFixed(1));
    indexLabel.setAttribute("y", (y + 3).toFixed(1));
    indexLabel.textContent = String(index + 1);

    hitTarget.addEventListener("pointerdown", (event) => {
      if (isPanArbitrating() || !isAcceptablePolygonPointerEvent(event) || !areRoomVerticesEditable()) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      state.selectedRoomId = room.id;
      state.selectedRoomByBoard[state.boardId] = room.id;
      setActivePolygonRoomId(state.boardId, room.id);
      state.polygonEditor.selectedVertexIndex = index;
      state.polygonEditor.selectedEdgeIndex = index;
      state.polygonEditor.vertexSelectionActive = true;
      syncPolygonVertexSelect(room.id);
      syncPolygonEdgeSelect(room.id);
      syncRoomPanelFromSelection({ preserveDraftState: true });
      beginPolygonVertexDrag(event, room.id, index);
      renderRoomOverlay();
      syncPolygonEditorStatus();
    });
    marker.append(hitTarget, handle, indexLabel);
    roomOverlay.append(marker);
  });
}

function getNormalizedOverlayPoint(event) {
  return mapClientPointToNormalized(event.clientX, event.clientY);
}

function beginPolygonVertexDrag(event, roomId, vertexIndex) {
  state.polygonEditor.dragVertexIndex = vertexIndex;
  state.polygonEditor.dragPointerId = event.pointerId;
  state.polygonEditor.dragRoomId = roomId;
  state.polygonEditor.dragBoardId = state.boardId;
  state.polygonEditor.dragStartPoints = getSpecialPolygonPoints(state.boardId, roomId);
  state.polygonEditor.dragMoved = false;
  try {
    roomOverlay.setPointerCapture(event.pointerId);
  } catch {
    // pointer capture can fail on unsupported devices; drag still continues
  }
}

function beginPendingPolygonAreaDrag(event, roomId) {
  state.polygonEditor.pendingAreaPointerId = event.pointerId;
  state.polygonEditor.pendingAreaRoomId = roomId;
  state.polygonEditor.pendingAreaBoardId = state.boardId;
  state.polygonEditor.pendingAreaStartPointerPoint = getNormalizedOverlayPoint(event);
}

function clearPendingPolygonAreaDragSession() {
  state.polygonEditor.pendingAreaPointerId = null;
  state.polygonEditor.pendingAreaRoomId = null;
  state.polygonEditor.pendingAreaBoardId = null;
  state.polygonEditor.pendingAreaStartPointerPoint = null;
}

function preserveRoomSelectionAfterPointerLifecycle() {
  state.polygonEditor.suppressRoomClickUntil = performance.now() + 220;
  refreshPersistentRoomSelectionVisualState();
}

function beginPolygonAreaDrag(event, roomId, { boardId = state.boardId, startPointerPoint = null } = {}) {
  const startPoints = getSpecialPolygonPoints(boardId, roomId);
  if (!Array.isArray(startPoints) || startPoints.length < 3) {
    return;
  }
  state.polygonEditor.dragAreaPointerId = event.pointerId;
  state.polygonEditor.dragAreaRoomId = roomId;
  state.polygonEditor.dragAreaBoardId = boardId;
  state.polygonEditor.dragAreaStartPoints = startPoints;
  state.polygonEditor.dragAreaStartPointerPoint = Array.isArray(startPointerPoint)
    ? [...startPointerPoint]
    : getNormalizedOverlayPoint(event);
  state.polygonEditor.dragAreaMoved = false;
  clearPendingPolygonAreaDragSession();
  roomOverlay.classList.add("is-room-dragging");
  try {
    roomOverlay.setPointerCapture(event.pointerId);
  } catch {
    // pointer capture can fail on unsupported devices; drag still continues
  }
}

function clearPolygonAreaDragSession() {
  state.polygonEditor.dragAreaPointerId = null;
  state.polygonEditor.dragAreaRoomId = null;
  state.polygonEditor.dragAreaBoardId = null;
  state.polygonEditor.dragAreaStartPoints = null;
  state.polygonEditor.dragAreaStartPointerPoint = null;
  state.polygonEditor.dragAreaMoved = false;
  roomOverlay.classList.remove("is-room-dragging");
}

function maybePromotePendingPolygonAreaDrag(event) {
  if (state.polygonEditor.dragAreaPointerId !== null) {
    return;
  }
  const pendingPointerId = state.polygonEditor.pendingAreaPointerId;
  if (pendingPointerId === null || pendingPointerId !== event.pointerId) {
    return;
  }
  if (state.uiView !== "settings" || !areRoomVerticesEditable()) {
    clearPendingPolygonAreaDragSession();
    return;
  }
  const startPointerPoint = state.polygonEditor.pendingAreaStartPointerPoint;
  const roomId = state.polygonEditor.pendingAreaRoomId;
  const boardId = state.polygonEditor.pendingAreaBoardId;
  if (!roomId || !boardId || !Array.isArray(startPointerPoint)) {
    clearPendingPolygonAreaDragSession();
    return;
  }
  const [currentX, currentY] = getNormalizedOverlayPoint(event);
  const [startX, startY] = startPointerPoint;
  const movedDistance = Math.hypot(currentX - startX, currentY - startY);
  if (movedDistance < 0.0025) {
    return;
  }
  beginPolygonAreaDrag(event, roomId, { boardId, startPointerPoint });
}

function clearPolygonDragSession() {
  state.polygonEditor.dragVertexIndex = null;
  state.polygonEditor.dragPointerId = null;
  state.polygonEditor.dragRoomId = null;
  state.polygonEditor.dragBoardId = null;
  state.polygonEditor.dragStartPoints = null;
  state.polygonEditor.dragMoved = false;
}

function commitPolygonDrag() {
  const persisted = persistBoardProfiles();
  triggerFeedback.textContent = persisted
    ? "Status: Polygon vertex moved"
    : "Status: Polygon vertex moved (persistence failed)";
}

function cancelPolygonDrag() {
  const { dragBoardId, dragRoomId, dragStartPoints } = state.polygonEditor;
  if (dragBoardId && dragRoomId && Array.isArray(dragStartPoints)) {
    setSpecialPolygonPoints(dragBoardId, dragRoomId, dragStartPoints);
  }
  renderRoomOverlay();
  syncPolygonEditorStatus();
  triggerFeedback.textContent = "Status: Polygon drag canceled";
}

function cancelPolygonAreaDrag() {
  const { dragAreaBoardId, dragAreaRoomId, dragAreaStartPoints } = state.polygonEditor;
  if (dragAreaBoardId && dragAreaRoomId && Array.isArray(dragAreaStartPoints)) {
    setSpecialPolygonPoints(dragAreaBoardId, dragAreaRoomId, dragAreaStartPoints);
  }
  renderRoomOverlay();
  syncPolygonEditorStatus();
  triggerFeedback.textContent = "Status: Room area drag canceled";
}

function finishPolygonVertexDrag(event, { cancel = false } = {}) {
  const pointerId = state.polygonEditor.dragPointerId;
  if (pointerId !== null && event && roomOverlay.hasPointerCapture(pointerId)) {
    roomOverlay.releasePointerCapture(pointerId);
  }
  const moved = state.polygonEditor.dragMoved;
  if (cancel) {
    cancelPolygonDrag();
  } else if (moved) {
    commitPolygonDrag();
  }
  clearPolygonDragSession();
}

function finishPolygonAreaDrag(event, { cancel = false } = {}) {
  const pointerId = state.polygonEditor.dragAreaPointerId;
  if (pointerId !== null && event && roomOverlay.hasPointerCapture(pointerId)) {
    roomOverlay.releasePointerCapture(pointerId);
  }
  const moved = state.polygonEditor.dragAreaMoved;
  if (cancel) {
    cancelPolygonAreaDrag();
  } else if (moved) {
    const persisted = persistBoardProfiles();
    state.polygonEditor.suppressRoomClickUntil = performance.now() + 220;
    triggerFeedback.textContent = persisted
      ? "Status: Room polygon moved as an area"
      : "Status: Room polygon moved as an area (persistence failed)";
  }
  clearPolygonAreaDragSession();
}

function syncAudioStatus() {
  const volumePercent = Math.round(state.audio.volume * 100);
  const roleMuted = outputRole !== OUTPUT_ROLE_FINAL;
  const mode = state.audio.enabled ? "ON" : "OFF";
  audioStatus.textContent = roleMuted
    ? `Audio: muted in Control view (final-output-only, mapping ${mode}, ${volumePercent}%)`
    : `Audio: ${mode} (${volumePercent}%)`;
}

function isOutputAudibleRole() {
  return outputRole === OUTPUT_ROLE_FINAL;
}

function isAudioPlaybackAllowed() {
  return isOutputAudibleRole() && state.audio.enabled;
}

function persistRuntimeSoundSettingsChange(failureMessage) {
  const persisted = persistBoardProfiles();
  if (!persisted) {
    triggerFeedback.textContent = failureMessage;
  }
  return persisted;
}

function syncAnimationSpeedPanel() {
  const speed = clampAnimationSpeed(state.animationSpeed);
  state.animationSpeed = speed;
  animationSpeedInput.value = String(speed);
  animationSpeedValue.textContent = `${speed.toFixed(2)}x`;
  animationSpeedStatus.textContent = `Animation Speed: ${speed.toFixed(2)}x`;
}

function createAudioAssetVoice(path) {
  const voice = new Audio(path);
  voice.preload = "auto";
  return voice;
}

function getAudioAssetPool(path) {
  if (!audioAssetPoolByPath.has(path)) {
    const pool = [
      createAudioAssetVoice(path),
      createAudioAssetVoice(path),
      createAudioAssetVoice(path),
      createAudioAssetVoice(path),
      createAudioAssetVoice(path),
    ];
    audioAssetPoolByPath.set(path, pool);
  }
  return audioAssetPoolByPath.get(path);
}

function warmEventSoundAssets() {
  const paths = new Set(ALL_SOUND_ASSET_PATHS);
  for (const path of paths) {
    const pool = getAudioAssetPool(path);
    for (const voice of pool) {
      voice.volume = isAudioPlaybackAllowed() ? state.audio.volume : 0;
      voice.load();
    }
  }
}

function applyAudioGain() {
  const targetVolume = isAudioPlaybackAllowed() ? state.audio.volume : 0;
  for (const pool of audioAssetPoolByPath.values()) {
    for (const voice of pool) {
      voice.volume = targetVolume;
    }
  }
  for (const [animationId, active] of activeAnimationAudioById.entries()) {
    if (!active?.voice) {
      continue;
    }
    const instanceVolume = isAudioPlaybackAllowed() ? state.audio.volume * clampRoomSoundVolume(active.soundVolume ?? 1) : 0;
    active.voice.volume = instanceVolume;
    activeAnimationAudioById.set(animationId, {
      ...active,
      soundVolume: clampRoomSoundVolume(active.soundVolume ?? 1),
    });
  }
}

function stopAllAudioVoices() {
  for (const pool of audioAssetPoolByPath.values()) {
    for (const voice of pool) {
      voice.pause();
      voice.currentTime = 0;
    }
  }
}

function stopAnimationSound(animationId) {
  const pendingTimer = pendingAnimationAudioStartTimers.get(animationId);
  if (pendingTimer) {
    window.clearTimeout(pendingTimer);
    pendingAnimationAudioStartTimers.delete(animationId);
  }
  const active = activeAnimationAudioById.get(animationId);
  if (!active) {
    return;
  }
  const { voice, onEnded } = active;
  if (voice && onEnded) {
    voice.removeEventListener("ended", onEnded);
  }
  if (voice) {
    voice.pause();
    voice.currentTime = 0;
  }
  activeAnimationAudioById.delete(animationId);
}

function getAnimationAudioLifecycleKey(animation) {
  if (!animation || !animation.id) {
    return null;
  }
  const triggerRevision = getGlobalTriggerRevision(animation);
  if (animation.scope === "global" && triggerRevision !== null) {
    return `global:${animation.id}:${triggerRevision}`;
  }
  const startedAtEpochMs = getAnimationStartedAtEpochMs(animation);
  return `default:${animation.id}:${startedAtEpochMs}`;
}

function stopSoundsForInactiveAnimations() {
  const activeIds = new Set(state.runningAnimations.map((anim) => anim.id));
  for (const animationId of activeAnimationAudioById.keys()) {
    if (!activeIds.has(animationId)) {
      stopAnimationSound(animationId);
    }
  }
}

function enforceAudioLifecycleGuard() {
  if (isAudioPlaybackAllowed()) {
    return;
  }
  for (const animationId of Array.from(activeAnimationAudioById.keys())) {
    stopAnimationSound(animationId);
  }
  stopAllAudioVoices();
}

function playSoundForAnimation(animation) {
  if (!animation || !isAudioPlaybackAllowed()) {
    return;
  }
  if (animation.scope === "global" && animation.type === "outside-space") {
    stopAnimationSound(animation.id);
    return;
  }
  if (animation.scope === "cluster") {
    return;
  }
  const lifecycleKey = getAnimationAudioLifecycleKey(animation);
  const triggerKey = animation.scope === "global" ? getGlobalTriggerKey(animation) : null;
  const triggerRevision = animation.scope === "global" ? getGlobalTriggerRevision(animation) : null;
  if (triggerKey && triggerRevision !== null) {
    const stopRevision = Number(liveSync.globalStopRevisionSeenByKey.get(triggerKey) ?? 0);
    if (stopRevision >= triggerRevision) {
      stopAnimationSound(animation.id);
      return;
    }
    const lastStartedRevision = Number(startedGlobalAudioRevisionByTriggerKey.get(triggerKey) ?? 0);
    if (triggerRevision < lastStartedRevision) {
      stopAnimationSound(animation.id);
      return;
    }
  }
  const active = activeAnimationAudioById.get(animation.id);
  if (active?.lifecycleKey && lifecycleKey && active.lifecycleKey === lifecycleKey) {
    if (active.voice) {
      const soundVolume = clampRoomSoundVolume(animation.soundVolume ?? active.soundVolume ?? 1);
      const instanceVolume = isAudioPlaybackAllowed() ? state.audio.volume * soundVolume : 0;
      active.voice.volume = instanceVolume;
      activeAnimationAudioById.set(animation.id, {
        ...active,
        soundVolume,
      });
    }
    return;
  }
  const startDelayMs = Math.max(0, Math.ceil((Number(animation.startedAt) || 0) - performance.now()));
  if (startDelayMs > 0) {
    stopAnimationSound(animation.id);
    const expectedLifecycleKey = lifecycleKey;
    const timerId = window.setTimeout(() => {
      pendingAnimationAudioStartTimers.delete(animation.id);
      const currentAnimation = state.runningAnimations.find((item) => item.id === animation.id) ?? null;
      const stillRunning = Boolean(currentAnimation);
      const currentLifecycleKey = currentAnimation ? getAnimationAudioLifecycleKey(currentAnimation) : null;
      if (expectedLifecycleKey && currentLifecycleKey && expectedLifecycleKey !== currentLifecycleKey) {
        return;
      }
      if (!stillRunning) {
        return;
      }
      playSoundForAnimation(currentAnimation);
    }, startDelayMs);
    pendingAnimationAudioStartTimers.set(animation.id, timerId);
    return;
  }
  const path = getMappedSoundPathForAnimation(animation.type);
  if (!path) {
    stopAnimationSound(animation.id);
    return;
  }
  const pool = getAudioAssetPool(path);
  if (!pool?.length) {
    return;
  }
  stopAnimationSound(animation.id);
  const nextIndex = audioAssetVoiceCursorByPath[path] ?? 0;
  const reusable = pool[nextIndex % pool.length];
  audioAssetVoiceCursorByPath[path] = (nextIndex + 1) % pool.length;
  const onEnded = () => {
    const stillRunning = state.runningAnimations.some((item) => item.id === animation.id);
    const stillActive = activeAnimationAudioById.get(animation.id)?.voice === reusable;
    if (!stillRunning || !stillActive || !isAudioPlaybackAllowed()) {
      stopAnimationSound(animation.id);
      return;
    }
    reusable.currentTime = 0;
    reusable.play().catch(() => {
      stopAnimationSound(animation.id);
    });
  };
  reusable.addEventListener("ended", onEnded);
  reusable.pause();
  reusable.currentTime = 0;
  const soundVolume = clampRoomSoundVolume(animation.soundVolume ?? 1);
  reusable.volume = state.audio.volume * soundVolume;
  activeAnimationAudioById.set(animation.id, {
    voice: reusable,
    onEnded,
    soundVolume,
    lifecycleKey,
  });
  if (triggerKey && triggerRevision !== null) {
    startedGlobalAudioRevisionByTriggerKey.set(triggerKey, triggerRevision);
  }
  reusable.play().catch(() => undefined);
}

function syncAudioMappingStatus() {
  const animationType = audioMappingAnimationSelect.value || ALL_ANIMATION_TYPES[0]?.id;
  if (!animationType) {
    audioMappingStatus.textContent = "Sound mapping: no animations available";
    return;
  }
  const label = getAnimationLabel(animationType);
  const mapped = normalizeAnimationSoundPath(animationType, state.animationSoundMap[animationType]);
  if (mapped === SOUND_MAPPING_NONE) {
    audioMappingStatus.textContent = `Sound-Mapping: ${label} -> none`;
    return;
  }
  const fileName = mapped.split("/").pop() ?? mapped;
  audioMappingStatus.textContent = `Sound-Mapping: ${label} -> ${fileName}`;
}

function syncAudioMappingPanel() {
  if (audioMappingAnimationSelect.childElementCount === 0) {
    for (const animation of ALL_ANIMATION_TYPES) {
      const option = document.createElement("option");
      option.value = animation.id;
      if (GLOBAL_ANIMATIONS.some((entry) => entry.id === animation.id)) {
        const categoryLabel = getGlobalAnimationCategory(animation.id) === "outside-ship"
          ? "Outside ship"
          : "Inside ship";
        option.textContent = `[${categoryLabel}] ${animation.label}`;
      } else {
        option.textContent = animation.label;
      }
      audioMappingAnimationSelect.append(option);
    }
  }

  const selectedAnimationType = ALL_ANIMATION_TYPES.some((entry) => entry.id === audioMappingAnimationSelect.value)
    ? audioMappingAnimationSelect.value
    : ALL_ANIMATION_TYPES[0]?.id;
  if (!selectedAnimationType) {
    return;
  }
  audioMappingAnimationSelect.value = selectedAnimationType;

  audioMappingSoundSelect.replaceChildren();
  const noneOption = document.createElement("option");
  noneOption.value = SOUND_MAPPING_NONE;
  noneOption.textContent = "none (no sound)";
  audioMappingSoundSelect.append(noneOption);

  for (const soundPath of ALL_SOUND_ASSET_PATHS) {
    const option = document.createElement("option");
    option.value = soundPath;
    option.textContent = soundPath.replace("resources/nemesis/sounds/", "");
    audioMappingSoundSelect.append(option);
  }

  const mapped = normalizeAnimationSoundPath(
    selectedAnimationType,
    state.animationSoundMap[selectedAnimationType],
  );
  const previousMapped = state.animationSoundMap[selectedAnimationType];
  state.animationSoundMap[selectedAnimationType] = mapped;
  if (previousMapped !== mapped) {
    persistRuntimeSoundSettingsChange(
      "Status: Sound mapping normalized, but persistence failed",
    );
  }
  audioMappingSoundSelect.value = mapped;
  syncAudioMappingStatus();
}

function applyHitareaCalibration(x, y, calibration) {
  const scaledX = (x - 0.5) * calibration.scale + 0.5 + calibration.offsetX;
  const scaledY = (y - 0.5) * calibration.scale + 0.5 + calibration.offsetY;
  return [Math.max(-0.2, Math.min(1.2, scaledX)), Math.max(-0.2, Math.min(1.2, scaledY))];
}

function getRoomCenterFromPoints(points) {
  if (!points.length) {
    return { x: 0.5, y: 0.5 };
  }
  const center = points.reduce(
    (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
    { x: 0, y: 0 },
  );
  return {
    x: center.x / points.length,
    y: center.y / points.length,
  };
}

function getRoomTransform(room, boardId = state.boardId) {
  const geometry = getRoomGeometry(boardId, room.id);
  const baseCenter = getRawRoomCenter(room, boardId);
  const centerX = geometry.mode === "absolute" ? geometry.absoluteX : baseCenter.x + geometry.offsetX;
  const centerY = geometry.mode === "absolute" ? geometry.absoluteY : baseCenter.y + geometry.offsetY;
  return {
    centerX,
    centerY,
    stretchX: geometry.stretchX,
    stretchY: geometry.stretchY,
  };
}

function getRoomPoints(room, boardId = state.boardId) {
  const calibration = getHitareaCalibration(boardId);
  const transform = getRoomTransform(room, boardId);
  const sourcePoints = getRoomSourcePoints(room, boardId);
  if (sourcePoints.length >= 3) {
    const baseCenter = getRoomCenterFromPoints(sourcePoints);
    return sourcePoints
      .map(([x, y]) => {
        const transformedX = transform.centerX + (x - baseCenter.x) * transform.stretchX;
        const transformedY = transform.centerY + (y - baseCenter.y) * transform.stretchY;
        return applyHitareaCalibration(transformedX, transformedY, calibration);
      })
      .map(([x, y]) => [x * 1000, y * 1000]);
  }
  const points = [];
  const cx = transform.centerX;
  const cy = transform.centerY;
  const r = room.radius;
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i;
    const point = applyHitareaCalibration(
      cx + Math.cos(angle) * r * transform.stretchX,
      cy + Math.sin(angle) * r * transform.stretchY,
      calibration,
    );
    points.push([point[0] * 1000, point[1] * 1000]);
  }
  return points;
}

function getRoomLabelPosition(room, boardId = state.boardId) {
  const points = getRoomPoints(room, boardId);
  if (points.length === 0) {
    return { x: 0.5, y: 0.5 };
  }
  const center = points.reduce(
    (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
    { x: 0, y: 0 },
  );
  return {
    x: center.x / points.length / 1000,
    y: center.y / points.length / 1000,
  };
}

function getRoomPolygonPixels(room, width, height, boardId = state.boardId) {
  return getRoomPoints(room, boardId).map(([x, y]) => mapNormalizedPointToPixels(x / 1000, y / 1000, width, height));
}

function getShipPolygonPixels(width = canvas.width, height = canvas.height, boardId = state.boardId) {
  return getShipPolygonPoints(boardId).map(([x, y]) => mapNormalizedPointToPixels(x, y, width, height));
}

function getPlayAreaPolygonsPixels(width = canvas.width, height = canvas.height, boardId = state.boardId) {
  const sourceAreas = getPlayAreas(boardId);
  const normalizedPolygons = polygonContract?.extractRenderablePlayAreaPolygons
    ? polygonContract.extractRenderablePlayAreaPolygons(sourceAreas, {
      fallbackPolygon: SHIP_POLYGON_DEFAULT,
      allowDefaultFallbackWhenEmpty: true,
    })
    : sourceAreas
      .map((area) => (Array.isArray(area?.polygon) ? area.polygon.map((point) => normalizePolygonPoint(point)) : []))
      .filter((polygon) => isRenderableNormalizedPolygon(polygon));

  return normalizedPolygons.map((polygon) => polygon.map(([x, y]) => mapNormalizedPointToPixels(x, y, width, height)));
}

function getRoomRenderMetrics(room, boardId = state.boardId) {
  const polygon = getRoomPolygonPixels(room, canvas.width, canvas.height, boardId);
  if (polygon.length === 0) {
    return {
      polygon,
      centerX: canvas.width * 0.5,
      centerY: canvas.height * 0.5,
      minX: canvas.width * 0.4,
      maxX: canvas.width * 0.6,
      minY: canvas.height * 0.4,
      maxY: canvas.height * 0.6,
      width: Math.max(20, canvas.width * 0.2),
      height: Math.max(20, canvas.height * 0.2),
      radius: Math.max(10, Math.min(canvas.width, canvas.height) * 0.08),
    };
  }

  const center = polygon.reduce(
    (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
    { x: 0, y: 0 },
  );
  const centerX = center.x / polygon.length;
  const centerY = center.y / polygon.length;

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let radius = 0;
  for (const [x, y] of polygon) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    radius = Math.max(radius, Math.hypot(x - centerX, y - centerY));
  }

  return {
    polygon,
    centerX,
    centerY,
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(12, maxX - minX),
    height: Math.max(12, maxY - minY),
    radius: Math.max(8, radius),
  };
}

function renderRoomOverlay() {
  const board = getBoard();
  syncSelectedRoomStateForBoard(state.boardId);
  roomOverlay.replaceChildren();

  if (outputRole === OUTPUT_ROLE_FINAL && !state.alignMode) {
    return;
  }

  for (const room of board.rooms) {
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.classList.add("room-zone");
    if (state.uiView === "settings") {
      polygon.classList.add("is-draggable");
    }
    polygon.dataset.roomId = room.id;
    polygon.setAttribute(
      "points",
      getRoomPoints(room, state.boardId)
        .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
        .join(" "),
    );
    polygon.addEventListener("click", (event) => {
      if (performance.now() < (state.polygonEditor.suppressRoomClickUntil || 0)) {
        return;
      }
      if (isPanArbitrating()) {
        return;
      }
      if (outputRole === OUTPUT_ROLE_CONTROL && state.uiView === "dashboard" && isQuickModeActive()) {
        event.preventDefault();
        event.stopPropagation();
        handleQuickModeRoomTap(room.id);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      state.selectedRoomId = room.id;
      state.selectedRoomByBoard[state.boardId] = room.id;
      applyRoomDraftTargetFromRoomClick(room.id);
      state.polygonEditor.vertexSelectionActive = false;
      syncPolygonRoomSelection(room.id);
      syncPolygonEditorPanel();
      syncRoomPanelFromSelection({ preserveDraftState: true });
      renderRoomOverlay();
    });
    polygon.addEventListener("pointerdown", (event) => {
      if (state.uiView !== "settings" || isPanArbitrating() || !isAcceptablePolygonPointerEvent(event) || !areRoomVerticesEditable()) {
        return;
      }
      if (
        state.polygonEditor.dragVertexIndex !== null ||
        state.shipPolygonEditor.dragVertexIndex !== null ||
        state.polygonEditor.dragAreaPointerId !== null
      ) {
        return;
      }
      state.selectedRoomId = room.id;
      state.selectedRoomByBoard[state.boardId] = room.id;
      state.polygonEditor.vertexSelectionActive = false;
      syncPolygonRoomSelection(room.id);
      syncPolygonEditorPanel();
      syncRoomPanelFromSelection({ preserveDraftState: true });
      beginPendingPolygonAreaDrag(event, room.id);
      renderRoomOverlay();
    });
    if (state.selectedRoomId === room.id) {
      polygon.classList.add("is-selected");
    }
    roomOverlay.append(polygon);

    if (outputRole !== OUTPUT_ROLE_FINAL) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.classList.add("room-zone-label");
      const labelPosition = getRoomLabelPosition(room, state.boardId);
      label.setAttribute("x", String((labelPosition.x * 1000).toFixed(1)));
      label.setAttribute("y", String((labelPosition.y * 1000 + 8).toFixed(1)));
      const roomName = room.name ?? room.label;
      label.textContent = roomName.startsWith("Hex ") ? roomName.replace("Hex ", "") : roomName;
      roomOverlay.append(label);
    }
  }

  renderPolygonEditorHandles();
  renderShipPolygonEditorHandles();
}

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

function syncRoomManagementPanel(statusText = null) {
  const board = getBoard();
  syncSelectedRoomStateForBoard(state.boardId);
  const selectedRoom = getSelectedRoom();
  syncRoomCreateShapeOptions(board);
  if (roomDeleteButton) {
    roomDeleteButton.disabled = board.rooms.length <= 1 || !selectedRoom;
  }
  if (roomNameInput && selectedRoom) {
    roomNameInput.value = selectedRoom.name ?? selectedRoom.label ?? "";
  }
  if (roomManagementStatus && statusText) {
    roomManagementStatus.textContent = statusText;
  }
  syncClusterManagementPanel();
}

function syncRoomCreateShapeOptions(board = getBoard()) {
  if (!roomCreateShapeSelect) {
    return;
  }
  const previousValue = roomCreateShapeSelect.value;
  const options = [
    { value: "hexagon", label: "Hexagon (starter template)" },
    { value: "free", label: "Free triangle (starter template)" },
    { value: "template-play-area", label: "Create room from existing polygon: Play Area" },
    ...board.rooms.map((room) => ({
      value: `template-room:${room.id}`,
      label: `Create room from existing polygon: ${room.name ?? room.label ?? room.id}`,
    })),
  ];
  roomCreateShapeSelect.replaceChildren();
  for (const entry of options) {
    const option = document.createElement("option");
    option.value = entry.value;
    option.textContent = entry.label;
    roomCreateShapeSelect.append(option);
  }
  const hasPrevious = options.some((entry) => entry.value === previousValue);
  roomCreateShapeSelect.value = hasPrevious ? previousValue : "hexagon";
}

function getSelectedOptionValues(selectEl) {
  if (!selectEl) {
    return [];
  }
  return Array.from(selectEl.selectedOptions || [])
    .map((option) => String(option.value || "").trim())
    .filter(Boolean);
}

function createClusterId(board) {
  const existing = new Set(
    (Array.isArray(board?.roomClusters) ? board.roomClusters : [])
      .map((cluster) => String(cluster?.clusterId || cluster?.id || "").trim())
      .filter(Boolean),
  );
  let index = existing.size + 1;
  let candidate = `cluster-${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `cluster-${index}`;
  }
  return candidate;
}

function normalizeClusterRoomIds(roomIds, board = getBoard()) {
  const validIds = new Set((board.rooms || []).map((room) => room.id));
  return Array.from(new Set((Array.isArray(roomIds) ? roomIds : [])
    .map((roomId) => String(roomId || "").trim())
    .filter((roomId) => validIds.has(roomId))));
}

function getSelectedClusterForBoard(board = getBoard()) {
  if (!clusterSelect) {
    return null;
  }
  const clusters = getBoardRoomClusters(board.id);
  const selectedId = String(clusterSelect.value || "").trim();
  return clusters.find((cluster) => cluster.clusterId === selectedId) ?? null;
}

function syncClusterRoomMultiSelect(board, selectedRoomIds = []) {
  if (!clusterRoomIdsSelect) {
    return;
  }
  const normalizedSelection = new Set(normalizeClusterRoomIds(selectedRoomIds, board));
  clusterRoomIdsSelect.replaceChildren();
  for (const room of board.rooms) {
    const option = document.createElement("option");
    option.value = room.id;
    option.textContent = room.name ?? room.label ?? room.id;
    option.selected = normalizedSelection.has(room.id);
    clusterRoomIdsSelect.append(option);
  }
  clusterRoomIdsSelect.disabled = board.rooms.length === 0;
}

function syncClusterManagementPanel(statusText = null, { preferredClusterId = null } = {}) {
  if (!clusterSelect || !clusterNameInput || !clusterRoomIdsSelect) {
    return;
  }
  const board = getBoard();
  const clusters = getBoardRoomClusters(board.id);
  const previousSelection = String(clusterSelect.value || "").trim();
  clusterSelect.replaceChildren();
  for (const cluster of clusters) {
    const option = document.createElement("option");
    option.value = cluster.clusterId;
    option.textContent = `${cluster.name} (${cluster.roomIds.length} rooms)`;
    clusterSelect.append(option);
  }

  const fallbackClusterId = clusters[0]?.clusterId ?? "";
  const nextClusterId = clusters.some((cluster) => cluster.clusterId === preferredClusterId)
    ? preferredClusterId
    : clusters.some((cluster) => cluster.clusterId === previousSelection)
      ? previousSelection
      : fallbackClusterId;
  clusterSelect.value = nextClusterId;
  const selectedCluster = clusters.find((cluster) => cluster.clusterId === nextClusterId) ?? null;
  clusterNameInput.value = selectedCluster?.name ?? "";
  syncClusterRoomMultiSelect(board, selectedCluster?.roomIds ?? []);
  clusterSelect.disabled = clusters.length === 0;
  if (clusterSaveButton) {
    clusterSaveButton.disabled = !selectedCluster;
  }
  if (clusterDeleteButton) {
    clusterDeleteButton.disabled = !selectedCluster;
  }
  if (clusterManagementStatus && statusText) {
    clusterManagementStatus.textContent = statusText;
  }
}

function createClusterFromSettings() {
  const board = getBoard();
  const selectedRoomIds = normalizeClusterRoomIds(getSelectedOptionValues(clusterRoomIdsSelect), board);
  if (selectedRoomIds.length === 0) {
    syncClusterManagementPanel("Cluster management: select at least one room");
    return false;
  }
  const clusterId = createClusterId(board);
  const fallbackName = `Cluster ${getBoardRoomClusters(board.id).length + 1}`;
  const name = String(clusterNameInput?.value || "").trim() || fallbackName;
  const nextClusters = [
    ...getBoardRoomClusters(board.id),
    {
      clusterId,
      name,
      roomIds: selectedRoomIds,
    },
  ];
  board.roomClusters = nextClusters;
  const persisted = persistBoardProfiles();
  syncRoomTargetSelect();
  syncClusterManagementPanel(
    persisted
      ? `Cluster management: ${name} created`
      : `Cluster management: ${name} created (persistence failed)`,
    { preferredClusterId: clusterId },
  );
  return persisted;
}

function updateClusterFromSettings() {
  const board = getBoard();
  const selectedCluster = getSelectedClusterForBoard(board);
  if (!selectedCluster) {
    syncClusterManagementPanel("Cluster management: update skipped (no cluster selected)");
    return false;
  }
  const selectedRoomIds = normalizeClusterRoomIds(getSelectedOptionValues(clusterRoomIdsSelect), board);
  if (selectedRoomIds.length === 0) {
    syncClusterManagementPanel("Cluster management: select at least one room");
    return false;
  }
  const name = String(clusterNameInput?.value || "").trim() || selectedCluster.name || "Cluster";
  board.roomClusters = getBoardRoomClusters(board.id).map((cluster) => (
    cluster.clusterId === selectedCluster.clusterId
      ? {
        ...cluster,
        name,
        roomIds: selectedRoomIds,
      }
      : cluster
  ));
  const persisted = persistBoardProfiles();
  syncRoomTargetSelect();
  syncClusterManagementPanel(
    persisted
      ? `Cluster management: ${name} updated`
      : `Cluster management: ${name} updated (persistence failed)`,
    { preferredClusterId: selectedCluster.clusterId },
  );
  return persisted;
}

function deleteSelectedClusterFromSettings() {
  const board = getBoard();
  const selectedCluster = getSelectedClusterForBoard(board);
  if (!selectedCluster) {
    syncClusterManagementPanel("Cluster management: delete skipped (no cluster selected)");
    return false;
  }
  board.roomClusters = getBoardRoomClusters(board.id).filter((cluster) => cluster.clusterId !== selectedCluster.clusterId);
  if (state.roomDraft.targetType === "cluster" && state.roomDraft.targetId === selectedCluster.clusterId) {
    state.roomDraft.targetType = "room";
    state.roomDraft.targetId = state.selectedRoomId;
  }
  const persisted = persistBoardProfiles();
  syncRoomTargetSelect();
  syncClusterManagementPanel(
    persisted
      ? `Cluster management: ${selectedCluster.name} deleted`
      : `Cluster management: ${selectedCluster.name} deleted (persistence failed)`,
  );
  return persisted;
}

function calculatePolygonCenterAndRadius(polygon, fallbackCenter = { x: 0.5, y: 0.5 }, fallbackRadius = 0.055) {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return {
      center: fallbackCenter,
      radius: fallbackRadius,
    };
  }
  const center = polygon.reduce(
    (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
    { x: 0, y: 0 },
  );
  const normalizedCenter = {
    x: clampRoomAbsoluteCoordinate(center.x / polygon.length),
    y: clampRoomAbsoluteCoordinate(center.y / polygon.length),
  };
  const radius = polygon.reduce(
    (maxRadius, [x, y]) => Math.max(maxRadius, Math.hypot(x - normalizedCenter.x, y - normalizedCenter.y)),
    fallbackRadius,
  );
  return {
    center: normalizedCenter,
    radius: Math.max(0.01, Math.min(0.25, radius)),
  };
}

function cloneRoomSnapshot(room) {
  if (!room) {
    return null;
  }
  return {
    ...room,
    polygon: (room.polygon || room.points || []).map((point) => normalizeRoomPoint(point)),
    points: (room.points || room.polygon || []).map((point) => normalizeRoomPoint(point)),
    meta: {
      ...(room.meta || {}),
    },
  };
}

function buildCopiedRoomName(board, sourceRoom) {
  const baseName = `${sourceRoom?.name ?? sourceRoom?.label ?? sourceRoom?.id ?? "Room"} Copy`;
  const existing = new Set((board.rooms || []).map((room) => String(room.name ?? room.label ?? "").trim()));
  if (!existing.has(baseName)) {
    return baseName;
  }
  let suffix = 2;
  let candidate = `${baseName} ${suffix}`;
  while (existing.has(candidate)) {
    suffix += 1;
    candidate = `${baseName} ${suffix}`;
  }
  return candidate;
}

function copySelectedRoomToClipboard() {
  const roomId = syncSelectedRoomStateForBoard(state.boardId);
  const room = roomId ? getSelectedRoom() : null;
  if (!room) {
    syncRoomManagementPanel("Room management: copy skipped (no room selected)");
    return false;
  }
  state.roomClipboard = {
    boardId: state.boardId,
    roomId: room.id,
    room: cloneRoomSnapshot(room),
    geometry: {
      ...getRoomGeometry(state.boardId, room.id),
    },
  };
  syncRoomManagementPanel(`Room management: copied ${room.name ?? room.label ?? room.id}`);
  return true;
}

function pasteRoomFromClipboard() {
  const board = getBoard();
  const clipboard = state.roomClipboard;
  if (!clipboard?.room) {
    syncRoomManagementPanel("Room management: paste skipped (clipboard empty)");
    return false;
  }
  const id = createRoomId(board);
  const sourceRoom = cloneRoomSnapshot(clipboard.room);
  const name = buildCopiedRoomName(board, sourceRoom);
  const room = {
    ...sourceRoom,
    id,
    name,
    label: name,
    polygon: (sourceRoom.polygon || sourceRoom.points || []).map((point) => normalizeRoomPoint(point)),
    points: (sourceRoom.points || sourceRoom.polygon || []).map((point) => normalizeRoomPoint(point)),
    meta: {
      ...(sourceRoom.meta || {}),
      copiedFromBoardId: clipboard.boardId,
      copiedFromRoomId: clipboard.roomId,
    },
  };
  board.rooms.push(room);
  ensureBoardRoomStateMaps(state.boardId);
  clearRoomTombstone(state.boardId, id);
  setSpecialPolygonPoints(state.boardId, id, room.polygon);
  setRoomGeometry(state.boardId, id, clipboard.geometry);
  state.selectedRoomId = id;
  state.selectedRoomByBoard[state.boardId] = id;
  state.roomDraft.targetType = "room";
  state.roomDraft.targetId = id;
  state.polygonEditor.vertexSelectionActive = false;
  setActivePolygonRoomId(state.boardId, id);
  const persisted = persistBoardProfiles();
  syncRoomPanelFromSelection();
  syncPolygonEditorPanel();
  renderRoomOverlay();
  syncRoomManagementPanel(
    persisted
      ? `Room management: ${name} pasted from clipboard`
      : `Room management: ${name} pasted from clipboard (persistence failed)`,
  );
  return persisted;
}

function clearSelectedRoomSelection(statusText = null) {
  if (!state.selectedRoomId) {
    if (statusText) {
      syncRoomManagementPanel(statusText);
    }
    return;
  }
  state.selectedRoomId = null;
  state.selectedRoomByBoard[state.boardId] = null;
  state.polygonEditor.vertexSelectionActive = false;
  setActivePolygonRoomId(state.boardId, null);
  clearRoomDraftEditTarget();
  syncRoomPanelFromSelection({ preserveDraftState: true });
  syncRoomManagementPanel(statusText ?? "Room management: selection cleared");
  renderRoomOverlay();
}

function isTypingShortcutTarget(target) {
  if (!target || !(target instanceof Element)) {
    return false;
  }
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function isPlayAreaShortcutContext(target) {
  if (state.shipPolygonEditor.dragVertexIndex !== null) {
    return true;
  }
  if (!target || !(target instanceof Element)) {
    return false;
  }
  return Boolean(
    target.closest(
      "#show-play-area-vertices, #ship-polygon-vertex-select, #ship-polygon-edge-select, #ship-polygon-insert-vertex, #ship-polygon-delete-vertex, #ship-polygon-reset, #outside-enabled, #outside-intensity, #outside-speed, #outside-mode, #outside-direction",
    ),
  );
}

function createRoomFromSettings() {
  const board = getBoard();
  const id = createRoomId(board);
  const selectedRoom = getSelectedRoom() ?? board.rooms[0] ?? null;
  const selectedCenter = selectedRoom ? getRawRoomCenter(selectedRoom) : { x: 0.5, y: 0.5 };
  const createMode = roomCreateShapeSelect?.value ?? "hexagon";
  const spawnShape = createMode === "free" ? "free" : createMode === "hexagon" ? "hexagon" : "template";
  const fallbackName = `Room ${board.rooms.length + 1}`;
  const name = normalizeRoomName(roomNameInput?.value, fallbackName);
  let templateLabel = null;
  let polygon = null;
  let copiedGeometry = null;
  let copiedTransform = null;
  if (createMode === "template-play-area") {
    templateLabel = "Play Area";
    polygon = getShipPolygonPoints(state.boardId).map((point) => normalizeRoomPoint(point));
  } else if (createMode.startsWith("template-room:")) {
    const templateRoomId = createMode.slice("template-room:".length);
    const templateRoom = board.rooms.find((room) => room.id === templateRoomId);
    templateLabel = templateRoom?.name ?? templateRoom?.label ?? templateRoomId;
    polygon = getSpecialPolygonPoints(state.boardId, templateRoomId).map((point) => normalizeRoomPoint(point));
    copiedGeometry = templateRoom ? getRoomGeometry(state.boardId, templateRoom.id) : null;
    copiedTransform = templateRoom
      ? {
        x: Number.isFinite(Number(templateRoom.x)) ? Number(templateRoom.x) : null,
        y: Number.isFinite(Number(templateRoom.y)) ? Number(templateRoom.y) : null,
        radius: Number.isFinite(Number(templateRoom.radius)) ? Number(templateRoom.radius) : null,
      }
      : null;
  }

  if (!Array.isArray(polygon) || polygon.length < 3) {
    polygon = spawnShape === "hexagon"
      ? createHexagonPolygon({ x: selectedCenter.x, y: selectedCenter.y, radius: selectedRoom?.radius ?? 0.055 })
      : [
        normalizeRoomPoint([selectedCenter.x - 0.03, selectedCenter.y - 0.03]),
        normalizeRoomPoint([selectedCenter.x + 0.04, selectedCenter.y]),
        normalizeRoomPoint([selectedCenter.x - 0.02, selectedCenter.y + 0.04]),
      ];
    templateLabel = null;
  }

  const { center, radius } = calculatePolygonCenterAndRadius(
    polygon,
    selectedCenter,
    selectedRoom?.radius ?? 0.055,
  );
  const room = {
    id,
    name,
    label: name,
    polygon: polygon.map((point) => [...point]),
    points: polygon.map((point) => [...point]),
    radius: copiedTransform?.radius ?? radius,
    x: copiedTransform?.x ?? center.x,
    y: copiedTransform?.y ?? center.y,
    meta: {
      schema: "tt-beamer.room.v2",
      spawnShape,
      templateSource:
        createMode === "template-play-area"
          ? "play-area"
          : createMode.startsWith("template-room:")
            ? createMode.slice("template-room:".length)
            : null,
    },
  };
  board.rooms.push(room);
  ensureBoardRoomStateMaps(state.boardId);
  clearRoomTombstone(state.boardId, id);
  if (copiedGeometry) {
    setRoomGeometry(state.boardId, id, copiedGeometry);
  }
  state.selectedRoomId = id;
  state.selectedRoomByBoard[state.boardId] = id;
  state.roomDraft.targetType = "room";
  state.roomDraft.targetId = id;
  state.polygonEditor.vertexSelectionActive = false;
  setActivePolygonRoomId(state.boardId, id);
  const persisted = persistBoardProfiles();
  syncRoomPanelFromSelection();
  syncPolygonEditorPanel();
  renderRoomOverlay();
  syncRoomManagementPanel(
    persisted
      ? `Room management: ${name} created (${templateLabel ? `template copy from ${templateLabel}` : spawnShape === "hexagon" ? "hexagon starter" : "free starter"})`
      : `Room management: ${name} created (persistence failed)`,
  );
}

function deleteSelectedRoom({ roomId = null } = {}) {
  const board = getBoard();
  const selectedRoomId = roomId ?? syncSelectedRoomStateForBoard(state.boardId);
  const room = board.rooms.find((entry) => entry.id === selectedRoomId) ?? null;
  if (!room) {
    syncRoomManagementPanel("Room management: delete skipped (no room selected)");
    return false;
  }
  if (board.rooms.length <= 1) {
    syncRoomManagementPanel("Room management: at least one room must remain");
    return false;
  }
  const nextRooms = board.rooms.filter((entry) => entry.id !== room.id);
  board.rooms = nextRooms;
  board.roomClusters = getBoardRoomClusters(state.boardId)
    .map((cluster) => ({
      ...cluster,
      roomIds: cluster.roomIds.filter((roomId) => roomId !== room.id),
    }))
    .filter((cluster) => cluster.roomIds.length > 0);
  state.runningAnimations = state.runningAnimations.filter((anim) => {
    if (anim.scope !== "room") {
      return true;
    }
    const sameBoard = anim.boardId === state.boardId;
    const sameRoom = anim.roomId === room.id;
    if (sameBoard && sameRoom) {
      stopAnimationSound(anim.id);
      return false;
    }
    return true;
  });
  if (state.roomGeometryByBoard[state.boardId]) {
    delete state.roomGeometryByBoard[state.boardId][room.id];
  }
  if (state.roomStateProfilesByBoard[state.boardId]) {
    delete state.roomStateProfilesByBoard[state.boardId][room.id];
  }
  if (state.specialPolygonsByBoard[state.boardId]) {
    delete state.specialPolygonsByBoard[state.boardId][room.id];
  }
  markRoomTombstone(state.boardId, room.id);
  const fallbackRoomId = nextRooms[0]?.id ?? null;
  state.selectedRoomId = fallbackRoomId;
  state.selectedRoomByBoard[state.boardId] = fallbackRoomId;
  state.polygonEditor.vertexSelectionActive = false;
  state.roomDraft.targetType = "room";
  state.roomDraft.targetId = fallbackRoomId;
  setActivePolygonRoomId(state.boardId, fallbackRoomId);
  clearRoomDraftEditTarget();
  const persisted = persistBoardProfiles();
  syncRoomPanelFromSelection();
  syncPolygonEditorPanel();
  renderRoomOverlay();
  renderRunningAnimationsList();
  syncRoomManagementPanel(
    persisted
      ? `Room management: ${room.name ?? room.label ?? room.id} deleted`
      : `Room management: ${room.name ?? room.label ?? room.id} deleted (persistence failed)`,
  );
  return persisted;
}

function refreshPersistentRoomSelectionVisualState() {
  const selectedRoomId = syncSelectedRoomStateForBoard(state.boardId);
  syncPolygonRoomSelection(selectedRoomId);
  syncPolygonEditorPanel();
  syncRoomPanelFromSelection({ preserveDraftState: true });
  renderRoomOverlay();
}

function renameSelectedRoom(nextName) {
  const roomId = syncSelectedRoomStateForBoard(state.boardId);
  const room = roomId ? getSelectedRoom() : null;
  if (!room) {
    return;
  }
  const normalized = normalizeRoomName(nextName, room.name ?? room.label ?? room.id);
  room.name = normalized;
  room.label = normalized;
  const persisted = persistBoardProfiles();
  syncRoomPanelFromSelection({ preserveDraftState: true });
  syncPolygonEditorPanel();
  renderRoomOverlay();
  syncRoomManagementPanel(
    persisted
      ? `Room management: name updated (${normalized})`
      : `Room management: name updated (${normalized}, persistence failed)`,
  );
}

function getBoardRoomClusters(boardId = state.boardId) {
  const board = getBoard(boardId);
  const roomIds = new Set(board.rooms.map((room) => room.id));
  const clusters = Array.isArray(board.roomClusters) ? board.roomClusters : [];
  return clusters
    .map((cluster, index) => {
      const clusterId = String(cluster?.clusterId || cluster?.id || "").trim() || `cluster-${index + 1}`;
      const name = String(cluster?.name || cluster?.label || "").trim() || `Cluster ${index + 1}`;
      const roomIdsInCluster = Array.from(
        new Set(
          (Array.isArray(cluster?.roomIds) ? cluster.roomIds : [])
            .map((roomId) => String(roomId || "").trim())
            .filter((roomId) => roomIds.has(roomId)),
        ),
      );
      return {
        clusterId,
        name,
        roomIds: roomIdsInCluster,
      };
    })
    .filter((cluster) => cluster.roomIds.length > 0);
}

function getRoomTargetOptions(boardId = state.boardId) {
  const board = getBoard(boardId);
  const roomTargets = board.rooms.map((room) => ({
    value: `room:${room.id}`,
    label: `Room: ${room.name ?? room.label}`,
    targetType: "room",
    targetId: room.id,
  }));
  const clusterTargets = getBoardRoomClusters(boardId).map((cluster) => ({
    value: `cluster:${cluster.clusterId}`,
    label: `Cluster: ${cluster.name} (${cluster.roomIds.length})`,
    targetType: "cluster",
    targetId: cluster.clusterId,
  }));
  return [...roomTargets, ...clusterTargets];
}

function parseRoomTargetValue(value) {
  const [targetType, ...rest] = String(value || "").split(":");
  const targetId = rest.join(":");
  if ((targetType === "room" || targetType === "cluster") && targetId) {
    return { targetType, targetId };
  }
  return null;
}

function resolveRoomDraftTargets() {
  const board = getBoard();
  const room = getSelectedRoom();
  const fallbackRoomId = room?.id ?? board.rooms[0]?.id ?? null;
  const clusters = getBoardRoomClusters(state.boardId);
  const clusterById = new Map(clusters.map((cluster) => [cluster.clusterId, cluster]));
  const hasRoom = (roomId) => board.rooms.some((entry) => entry.id === roomId);

  if (state.roomDraft.targetType === "cluster") {
    const cluster = clusterById.get(state.roomDraft.targetId);
    if (cluster && cluster.roomIds.length > 0) {
      return cluster.roomIds;
    }
  }

  const selectedRoomId = state.roomDraft.targetType === "room" ? state.roomDraft.targetId : fallbackRoomId;
  if (selectedRoomId && hasRoom(selectedRoomId)) {
    return [selectedRoomId];
  }
  if (fallbackRoomId && hasRoom(fallbackRoomId)) {
    return [fallbackRoomId];
  }
  return [];
}

function buildClusterDispatchPlan(roomIds, {
  staggerStart = false,
  staggerOffsetMs = CLUSTER_STAGGER_OFFSET_DEFAULT_MS,
} = {}) {
  const normalizedRoomIds = Array.from(new Set((Array.isArray(roomIds) ? roomIds : [])
    .map((roomId) => String(roomId || "").trim())
    .filter(Boolean)));
  const effectiveOffsetMs = clampClusterStaggerOffsetMs(staggerOffsetMs);
  return normalizedRoomIds.map((roomId, index) => ({
    roomId,
    startDelayMs: staggerStart ? index * effectiveOffsetMs : 0,
  }));
}

function getClusterTargetById(clusterId, boardId = state.boardId) {
  const normalizedClusterId = String(clusterId || "").trim();
  if (!normalizedClusterId) {
    return null;
  }
  return getBoardRoomClusters(boardId).find((cluster) => cluster.clusterId === normalizedClusterId) ?? null;
}

function getClusterMemberAnimationIds(clusterAnimation) {
  if (!clusterAnimation || clusterAnimation.scope !== "cluster") {
    return [];
  }
  const directMembers = Array.isArray(clusterAnimation.memberAnimationIds)
    ? clusterAnimation.memberAnimationIds
      .map((animationId) => String(animationId || "").trim())
      .filter(Boolean)
    : [];
  const linkedMembers = state.runningAnimations
    .filter((entry) => entry?.scope === "room" && entry?.parentClusterRunId === clusterAnimation.id)
    .map((entry) => entry.id);
  return Array.from(new Set([...directMembers, ...linkedMembers]));
}

function getRunningAnimationsForList() {
  const activeClusterIds = new Set(
    state.runningAnimations
      .filter((entry) => entry?.scope === "cluster" && typeof entry?.id === "string")
      .map((entry) => entry.id),
  );
  return state.runningAnimations.filter((entry) => !(
    entry?.scope === "room"
    && entry?.parentClusterRunId
    && activeClusterIds.has(entry.parentClusterRunId)
  ));
}

function resolveClusterMemberFallbackDelayMs(clusterAnimation, roomId) {
  if (!clusterAnimation || typeof roomId !== "string") {
    return 0;
  }
  const delayMap = clusterAnimation.memberStartDelays;
  if (!delayMap || typeof delayMap !== "object") {
    return 0;
  }
  const delay = Number(delayMap[roomId]);
  return Number.isFinite(delay) && delay > 0 ? delay : 0;
}

function buildClusterMemberRuntimeViews(clusterAnimation) {
  if (!clusterAnimation || clusterAnimation.scope !== "cluster") {
    return [];
  }
  const memberByRoomId = new Map();
  for (const member of state.runningAnimations) {
    if (member?.scope !== "room" || member?.parentClusterRunId !== clusterAnimation.id) {
      continue;
    }
    const roomId = String(member.roomId || "").trim();
    if (!roomId || memberByRoomId.has(roomId)) {
      continue;
    }
    memberByRoomId.set(roomId, member);
  }
  const memberRoomIds = Array.isArray(clusterAnimation.memberRoomIds)
    ? clusterAnimation.memberRoomIds.map((roomId) => String(roomId || "").trim()).filter(Boolean)
    : [];
  const orderedRoomIds = memberRoomIds.length > 0
    ? memberRoomIds
    : Array.from(memberByRoomId.keys());
  return orderedRoomIds.map((roomId) => {
    const linkedMember = memberByRoomId.get(roomId) ?? null;
    if (linkedMember) {
      return {
        roomId,
        animation: linkedMember,
      };
    }
    const baseStartedAt = Number.isFinite(Number(clusterAnimation.startedAt))
      ? Number(clusterAnimation.startedAt)
      : performance.now();
    const baseStartedAtEpochMs = Number.isFinite(Number(clusterAnimation.startedAtEpochMs))
      ? Number(clusterAnimation.startedAtEpochMs)
      : Date.now();
    const fallbackDelayMs = resolveClusterMemberFallbackDelayMs(clusterAnimation, roomId);
    return {
      roomId,
      animation: {
        ...clusterAnimation,
        scope: "room",
        roomId,
        startedAt: baseStartedAt + fallbackDelayMs,
        startedAtEpochMs: baseStartedAtEpochMs + fallbackDelayMs,
      },
    };
  });
}

function syncRoomTargetSelect() {
  if (!roomTargetSelect) {
    return;
  }
  const options = getRoomTargetOptions(state.boardId);
  roomTargetSelect.replaceChildren();
  for (const optionEntry of options) {
    const option = document.createElement("option");
    option.value = optionEntry.value;
    option.textContent = optionEntry.label;
    roomTargetSelect.append(option);
  }

  const room = getSelectedRoom();
  const fallbackValue = room ? `room:${room.id}` : options[0]?.value ?? "";
  const currentValue = state.roomDraft.targetType && state.roomDraft.targetId
    ? `${state.roomDraft.targetType}:${state.roomDraft.targetId}`
    : fallbackValue;
  const existing = options.some((entry) => entry.value === currentValue) ? currentValue : fallbackValue;
  const parsed = parseRoomTargetValue(existing);
  if (parsed) {
    state.roomDraft.targetType = parsed.targetType;
    state.roomDraft.targetId = parsed.targetId;
    roomTargetSelect.value = existing;
    if (roomStaggerStartInput) {
      roomStaggerStartInput.disabled = parsed.targetType !== "cluster";
    }
    if (roomStaggerOffsetInput) {
      roomStaggerOffsetInput.disabled = parsed.targetType !== "cluster";
    }
    syncRoomStaggerOffsetControl();
  }
}

function syncRoomPanelFromSelection({ preserveDraftState = false } = {}) {
  const room = getSelectedRoom();
  if (!room) {
    roomSelected.textContent = "Selected room: click a room polygon on the board";
    startRoomAnimationButton.disabled = true;
    roomOpacityInput.disabled = true;
    if (roomTargetSelect) {
      roomTargetSelect.disabled = false;
    }
    syncRoomTargetSelect();
    if (roomStaggerStartInput) {
      roomStaggerStartInput.disabled = state.roomDraft.targetType !== "cluster";
    }
    if (roomStaggerOffsetInput) {
      roomStaggerOffsetInput.disabled = state.roomDraft.targetType !== "cluster";
    }
    syncRoomStaggerOffsetControl();
    syncRoomGeometryPanel();
    syncDashboardZoneVisibility();
    return;
  }
  startRoomAnimationButton.disabled = false;
  roomOpacityInput.disabled = false;
  if (roomTargetSelect) {
    roomTargetSelect.disabled = false;
  }
  if (roomStaggerStartInput) {
    roomStaggerStartInput.disabled = false;
  }
  if (!preserveDraftState) {
    const roomFx = getRoomFxProfile(state.boardId);
    state.roomDraft.animationId = roomFx.animations.some((entry) => entry.id === state.roomDraft.animationId)
      ? state.roomDraft.animationId
      : roomFx.animations[0]?.id ?? "kaputt";
  }
  roomAnimationSelect.value = state.roomDraft.animationId;
  roomOpacityInput.value = String(clampRoomOpacity(state.roomDraft.opacity));
  roomOpacityValue.textContent = clampRoomOpacity(state.roomDraft.opacity).toFixed(2);
  state.roomDraft.intensity = clampRoomIntensity(state.roomDraft.intensity);
  state.roomDraft.speed = clampRoomSpeed(state.roomDraft.speed);
  state.roomDraft.soundVolume = clampRoomSoundVolume(state.roomDraft.soundVolume);
  state.roomDraft.durationSec = clampRoomDurationSec(state.roomDraft.durationSec);
  roomIntensityInput.value = String(state.roomDraft.intensity);
  roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
  roomSpeedInput.value = String(state.roomDraft.speed);
  roomSpeedValue.textContent = `${state.roomDraft.speed.toFixed(2)}x`;
  roomSoundVolumeInput.value = String(Math.round(state.roomDraft.soundVolume * 100));
  roomSoundVolumeValue.textContent = `${Math.round(state.roomDraft.soundVolume * 100)}%`;
  roomDurationInput.value = String(state.roomDraft.durationSec);
  state.roomDraft.staggerStart = Boolean(state.roomDraft.staggerStart);
  state.roomDraft.staggerOffsetMs = clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);
  if (roomStaggerStartInput) {
    roomStaggerStartInput.checked = state.roomDraft.staggerStart;
    roomStaggerStartInput.disabled = state.roomDraft.targetType !== "cluster";
  }
  syncRoomStaggerOffsetControl();
  if (!state.roomDraft.targetType || !state.roomDraft.targetId) {
    state.roomDraft.targetType = "room";
    state.roomDraft.targetId = room.id;
  }
  syncRoomTargetSelect();
  roomSelected.textContent = `Selected room: ${room.name ?? room.label}`;
  if (roomRenameInput) {
    roomRenameInput.value = room.name ?? room.label ?? "";
  }
  if (roomNameInput) {
    roomNameInput.value = room.name ?? room.label ?? "";
  }
  syncRoomGeometryPanel();
  syncRoomManagementPanel();
  syncDashboardZoneVisibility();
}

function syncRoomDraftActionButton() {
  const isEditMode = Boolean(state.roomDraft.editTargetId);
  startRoomAnimationButton.textContent = isEditMode
    ? "Update running instance"
    : "Start room animation";
}

function clearRoomDraftEditTarget() {
  state.roomDraft.editTargetId = null;
  syncRoomDraftActionButton();
}

function applyRoomDraftTargetFromRoomClick(roomId) {
  const normalizedRoomId = typeof roomId === "string" ? roomId.trim() : "";
  if (!normalizedRoomId) {
    return;
  }
  state.roomDraft.targetType = "room";
  state.roomDraft.targetId = normalizedRoomId;
}

const ROOM_DRAFT_UI_IMMUTABLE_FIELDS = [
  "animationId",
  "targetType",
  "targetId",
  "opacity",
  "intensity",
  "speed",
  "soundVolume",
  "staggerStart",
  "staggerOffsetMs",
  "durationSec",
  "hold",
];

function normalizeRoomDraftUiField(field, value) {
  switch (field) {
    case "opacity":
      return clampRoomOpacity(value);
    case "intensity":
      return clampRoomIntensity(value);
    case "speed":
      return clampRoomSpeed(value);
    case "soundVolume":
      return clampRoomSoundVolume(value);
    case "staggerStart":
      return Boolean(value);
    case "staggerOffsetMs":
      return clampClusterStaggerOffsetMs(value);
    case "durationSec":
      return clampRoomDurationSec(value);
    case "hold":
      return Boolean(value);
    default:
      return value;
  }
}

function captureRoomDraftUiSnapshot() {
  const snapshot = {};
  for (const field of ROOM_DRAFT_UI_IMMUTABLE_FIELDS) {
    snapshot[field] = normalizeRoomDraftUiField(field, state.roomDraft[field]);
  }
  return snapshot;
}

function restoreRoomDraftUiSnapshot(snapshot, reason = "room-start") {
  let mutated = false;
  for (const field of ROOM_DRAFT_UI_IMMUTABLE_FIELDS) {
    const nextValue = normalizeRoomDraftUiField(field, snapshot?.[field]);
    const currentValue = normalizeRoomDraftUiField(field, state.roomDraft[field]);
    if (currentValue !== nextValue) {
      state.roomDraft[field] = nextValue;
      mutated = true;
    }
  }
  if (mutated) {
    syncRoomPanelFromSelection({ preserveDraftState: true });
    logRuntime.warn("draft_immutability_restore", {
      event: "draft-immutability-restore",
      reason,
      boardId: state.boardId,
    });
  }
}

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

function drawRoomComposition(animation, age, room, roomMetrics) {
  const qualityScale = getRuntimeQualityScale();
  const assetType = normalizeRoomAssetType(animation.roomAssetType);
  const assetRef = normalizeRoomAssetRefForType(assetType, animation.roomAssetRef, "");
  if (assetType === "gif") {
    const gifRenderConfig = resolveRoomGifRenderConfig(animation.type, age, animation.intensity, {
      gifAssetPath: assetRef,
      gifTimelineAgeSec: age,
      gifPlaybackSpeed: clampRoomSpeed(animation.speed ?? animation.playbackSpeed ?? 1),
      opacity: clampRoomOpacity(animation.opacity),
    });
    if (gifRenderConfig.frame) {
      ctx.save();
      ctx.globalAlpha = gifRenderConfig.opacity;
      ctx.drawImage(gifRenderConfig.frame, roomMetrics.minX, roomMetrics.minY, roomMetrics.width, roomMetrics.height);
      ctx.restore();
    }
    return;
  }
  if (assetType === "mp4") {
    if (shouldSkipRoomMp4Frame(animation)) {
      return;
    }
    const videoEntry = getRoomVideoElement(assetRef);
    const video = videoEntry?.video;
    if (video) {
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      const playbackRate = Math.max(0.3, Math.min(2.5, Number(animation.speed) || 1));
      if (Math.abs((Number(video.playbackRate) || 1) - playbackRate) > 0.01) {
        video.playbackRate = playbackRate;
      }
      if (video.paused) {
        void video.play().catch(() => undefined);
      }
      if (video.readyState >= 2 && Number(video.videoWidth) > 0 && Number(video.videoHeight) > 0) {
        try {
          ctx.save();
          ctx.globalAlpha = clampRoomOpacity(animation.opacity);
          ctx.drawImage(video, roomMetrics.minX, roomMetrics.minY, roomMetrics.width, roomMetrics.height);
          ctx.restore();
        } catch {
          ctx.restore();
        }
      }
    }
    return;
  }

  const effectType = resolveRoomCodedEffectType(assetRef || animation.type);
  const playbackSpeed = clampRoomSpeed(animation.speed ?? animation.playbackSpeed ?? 1);
  const playbackAge = age * clampRoomSpeed(animation.speed ?? animation.playbackSpeed ?? 1);
  drawEffectVisual(
    effectType,
    playbackAge,
    animation.intensity,
    room,
    roomMetrics,
    {
      densityFactor: qualityScale,
      opacity: clampRoomOpacity(animation.opacity),
      gifAssetPath: assetRef || ROOM_GIF_ANIMATION_ASSETS[animation.type],
      gifTimelineAgeSec: age,
      gifPlaybackSpeed: playbackSpeed,
      roomAnimationType: animation.type,
    },
  );
}

function upsertGlobalAnimation(type, defaultDurationSec, { loopUntilStopped = false, playSound = true } = {}) {
  const existing = state.runningAnimations.find(
    (anim) => anim.scope === "global" && anim.type === type && anim.boardId === state.boardId,
  );
  const isOutside = getGlobalAnimationCategory(type) === "outside-ship";
  const normalizedDefaultDurationSec = Number(defaultDurationSec);
  const effectiveDefaultDurationSec = loopUntilStopped
    ? null
    : (Number.isFinite(normalizedDefaultDurationSec) && normalizedDefaultDurationSec > 0
      ? normalizedDefaultDurationSec
      : null);
  if (outputRole === OUTPUT_ROLE_CONTROL) {
    if (existing) {
      stopAnimation(existing.id);
    } else {
      const animation = createAnimation({
        type,
        scope: "global",
        boardId: state.boardId,
        intensity: 1,
        soundVolume: playSound ? 1 : 0,
        hold: effectiveDefaultDurationSec === null,
        durationSec: effectiveDefaultDurationSec ?? 0,
      });
      void emitLiveMutation("trigger-global", {
        animationType: type,
        action: "start",
        boardId: state.boardId,
        outsideHint: isOutside,
        loopUntilStopped: effectiveDefaultDurationSec === null,
        playSound,
        animation: buildAnimationSnapshotForLiveSync(animation),
      }).then(() => {
        triggerFeedback.textContent = `Pending: ${getAnimationLabel(type)} start accepted (waiting for snapshot)`;
      }).catch(() => {
        triggerFeedback.textContent = `Status: ${getAnimationLabel(type)} start command failed`;
      });
    }
    return;
  }
  if (existing) {
    stopAnimationSound(existing.id);
    state.runningAnimations = state.runningAnimations.filter((anim) => anim.id !== existing.id);
    if (isOutside) {
      updateOutsideFxProfile(existing.boardId, { enabled: false });
      persistBoardProfiles();
      syncOutsideFxPanel();
    }
    triggerFeedback.textContent = `Status: ${getAnimationLabel(type)} stopped`;
    void emitStopAnimationCommand(existing.id, {
      priorityHint: "high",
      targetAnimation: existing,
    });
  } else {
    const animation = createAnimation({
      type,
      scope: "global",
      intensity: 1,
      soundVolume: playSound ? 1 : 0,
      hold: effectiveDefaultDurationSec === null,
      durationSec: effectiveDefaultDurationSec ?? 0,
    });
    triggerFeedback.textContent = `Pending: ${getAnimationLabel(type)} start accepted (waiting for snapshot)`;
    void emitLiveMutation("trigger-global", {
      animationType: type,
      action: "start",
      boardId: state.boardId,
      outsideHint: isOutside,
      loopUntilStopped: effectiveDefaultDurationSec === null,
      playSound,
      animation: buildAnimationSnapshotForLiveSync(animation),
    }).catch(() => {
      triggerFeedback.textContent = `Status: ${getAnimationLabel(type)} start command failed`;
    });
  }
  renderRunningAnimationsList();
  refreshGlobalButtons();
}

function startRoomAnimationFromDraft() {
  const draftSnapshot = captureRoomDraftUiSnapshot();
  const board = getBoard();
  try {
    const selectedDefinition = getRoomAnimationDefinitionById(state.roomDraft.animationId, state.boardId);
    if (!selectedDefinition) {
      triggerFeedback.textContent = "Status: select a valid room animation first";
      return;
    }

    const selectedAssetType = normalizeRoomAssetType(selectedDefinition.assetType);
    const selectedAssetRef = normalizeRoomAssetRefForType(selectedAssetType, selectedDefinition.assetRef);

    const draftPayload = {
      type: state.roomDraft.animationId,
      animationName: selectedDefinition.name,
      roomAssetType: selectedAssetType,
      roomAssetRef: selectedAssetRef,
      intensity: clampRoomIntensity(state.roomDraft.intensity),
      speed: clampRoomSpeed(state.roomDraft.speed),
      opacity: clampRoomOpacity(state.roomDraft.opacity),
      soundVolume: clampRoomSoundVolume(state.roomDraft.soundVolume),
      hold: true,
      durationMs: null,
    };

    if (selectedAssetType === "gif") {
      warmGifAssetPath(selectedAssetRef, { reason: "trigger" });
    }

    const targetRoomIds = resolveRoomDraftTargets();
    if (targetRoomIds.length === 0) {
      triggerFeedback.textContent = "Status: selected target has no rooms";
      return;
    }

    if (state.roomDraft.targetType === "room") {
      const selectedTargetRoom = targetRoomIds[0];
      if (!selectedTargetRoom) {
        triggerFeedback.textContent = "Status: select a room on the board first";
        return;
      }
    }

    if (outputRole === OUTPUT_ROLE_CONTROL) {
      const pendingCommands = [];
      if (state.roomDraft.editTargetId) {
        if (state.roomDraft.targetType === "cluster") {
          const existingCluster = state.runningAnimations.find(
            (item) => item.id === state.roomDraft.editTargetId && item.scope === "cluster",
          );
          if (existingCluster) {
            const shouldStaggerClusterStart = Boolean(state.roomDraft.staggerStart);
            const staggerOffsetMs = clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);
            const cluster = getClusterTargetById(state.roomDraft.targetId, state.boardId);
            const dispatchPlan = buildClusterDispatchPlan(targetRoomIds, {
              staggerStart: shouldStaggerClusterStart,
              staggerOffsetMs,
            });
            const reusableMembersByRoomId = new Map();
            for (const member of state.runningAnimations) {
              if (member?.scope !== "room" || member?.parentClusterRunId !== existingCluster.id) {
                continue;
              }
              const roomKey = String(member.roomId || "").trim();
              if (!roomKey) {
                continue;
              }
              if (!reusableMembersByRoomId.has(roomKey)) {
                reusableMembersByRoomId.set(roomKey, []);
              }
              reusableMembersByRoomId.get(roomKey).push(member);
            }
            const retainedMemberIds = new Set();
            const nextMemberAnimationIds = [];
            const nextMemberRoomIds = [];

            for (const { roomId, startDelayMs } of dispatchPlan) {
              const reusableBucket = reusableMembersByRoomId.get(roomId) ?? [];
              const reusableMember = reusableBucket.shift() ?? null;
              if (reusableMember) {
                const updatedMember = {
                  ...reusableMember,
                  ...draftPayload,
                  boardId: state.boardId,
                  roomId,
                  parentClusterRunId: existingCluster.id,
                  startedAt: performance.now() + Math.max(0, Number(startDelayMs) || 0),
                  startedAtEpochMs: Date.now() + Math.max(0, Number(startDelayMs) || 0),
                };
                pendingCommands.push(emitLiveMutation("edit-room", {
                  animationId: updatedMember.id,
                  animation: buildAnimationSnapshotForLiveSync(updatedMember),
                }));
                retainedMemberIds.add(updatedMember.id);
                nextMemberAnimationIds.push(updatedMember.id);
                nextMemberRoomIds.push(roomId);
              } else {
                const createdMember = createAnimation({
                  type: draftPayload.type,
                  animationName: draftPayload.animationName,
                  roomAssetType: draftPayload.roomAssetType,
                  roomAssetRef: draftPayload.roomAssetRef,
                  scope: "room",
                  roomId,
                  boardId: state.boardId,
                  intensity: draftPayload.intensity,
                  speed: draftPayload.speed,
                  opacity: draftPayload.opacity,
                  playbackSpeed: draftPayload.speed,
                  soundVolume: draftPayload.soundVolume,
                  hold: true,
                  durationSec: 0,
                  startDelayMs,
                });
                createdMember.parentClusterRunId = existingCluster.id;
                pendingCommands.push(emitLiveMutation("trigger-room", {
                  animationId: createdMember.id,
                  animation: buildAnimationSnapshotForLiveSync(createdMember),
                }));
                retainedMemberIds.add(createdMember.id);
                nextMemberAnimationIds.push(createdMember.id);
                nextMemberRoomIds.push(roomId);
              }
            }

            for (const member of state.runningAnimations) {
              if (member?.scope !== "room" || member?.parentClusterRunId !== existingCluster.id) {
                continue;
              }
              if (!retainedMemberIds.has(member.id)) {
                pendingCommands.push(emitLiveMutation("stop-animation", {
                  animationId: member.id,
                  priorityHint: "high",
                }));
              }
            }

            const updatedCluster = {
              ...existingCluster,
              ...draftPayload,
              scope: "cluster",
              roomId: null,
              boardId: state.boardId,
              clusterId: cluster?.clusterId ?? state.roomDraft.targetId,
              clusterName: cluster?.name ?? existingCluster.clusterName ?? "Cluster",
              clusterStartMode: shouldStaggerClusterStart ? "staggered" : "synchronous",
              clusterStartOffsetMs: staggerOffsetMs,
              memberAnimationIds: nextMemberAnimationIds,
              memberRoomIds: nextMemberRoomIds,
              memberStartDelays: Object.fromEntries(
                dispatchPlan.map((entry) => [entry.roomId, Math.max(0, Number(entry.startDelayMs) || 0)]),
              ),
              startedAt: performance.now(),
              startedAtEpochMs: Date.now(),
            };
            pendingCommands.push(emitLiveMutation("edit-room", {
              animationId: updatedCluster.id,
              animation: buildAnimationSnapshotForLiveSync(updatedCluster),
            }));
            clearRoomDraftEditTarget();
            void Promise.allSettled(pendingCommands).then(() => {
              triggerFeedback.textContent = `Pending: ${updatedCluster.id} cluster update accepted (waiting for snapshot)`;
            });
            return;
          }
          clearRoomDraftEditTarget();
        }

        const existing = state.runningAnimations.find(
          (item) => item.id === state.roomDraft.editTargetId && item.scope === "room",
        );
        if (existing) {
          const updated = {
            ...existing,
            ...draftPayload,
            roomId: targetRoomIds[0],
            boardId: state.boardId,
            startedAt: performance.now(),
            startedAtEpochMs: Date.now(),
          };
          clearRoomDraftEditTarget();
          void emitLiveMutation("edit-room", {
            animationId: updated.id,
            animation: buildAnimationSnapshotForLiveSync(updated),
          }).then(() => {
            triggerFeedback.textContent = `Pending: ${updated.id} update accepted (waiting for snapshot)`;
          }).catch(() => {
            triggerFeedback.textContent = "Status: room update command failed";
          });
          return;
        }
        clearRoomDraftEditTarget();
      }

      const shouldStaggerClusterStart = state.roomDraft.targetType === "cluster" && Boolean(state.roomDraft.staggerStart);
      const staggerOffsetMs = clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);
      const dispatchPlan = state.roomDraft.targetType === "cluster"
        ? buildClusterDispatchPlan(targetRoomIds, {
          staggerStart: shouldStaggerClusterStart,
          staggerOffsetMs,
        })
        : targetRoomIds.map((roomId) => ({ roomId, startDelayMs: 0 }));
      const createdAnimations = dispatchPlan.map(({ roomId, startDelayMs }) => createAnimation({
        type: draftPayload.type,
        animationName: draftPayload.animationName,
        roomAssetType: draftPayload.roomAssetType,
        roomAssetRef: draftPayload.roomAssetRef,
        scope: "room",
        roomId,
        boardId: state.boardId,
        intensity: draftPayload.intensity,
        speed: draftPayload.speed,
        opacity: draftPayload.opacity,
        playbackSpeed: draftPayload.speed,
        soundVolume: draftPayload.soundVolume,
        hold: true,
        durationSec: 0,
        startDelayMs,
      }));
      let clusterRunAnimation = null;
      if (state.roomDraft.targetType === "cluster") {
        const cluster = getClusterTargetById(state.roomDraft.targetId, state.boardId);
        clusterRunAnimation = createAnimation({
          type: draftPayload.type,
          animationName: draftPayload.animationName,
          roomAssetType: draftPayload.roomAssetType,
          roomAssetRef: draftPayload.roomAssetRef,
          scope: "cluster",
          roomId: null,
          boardId: state.boardId,
          intensity: draftPayload.intensity,
          speed: draftPayload.speed,
          opacity: draftPayload.opacity,
          playbackSpeed: draftPayload.speed,
          soundVolume: draftPayload.soundVolume,
          hold: true,
          durationSec: 0,
        });
        clusterRunAnimation.clusterId = cluster?.clusterId ?? state.roomDraft.targetId;
        clusterRunAnimation.clusterName = cluster?.name ?? "Cluster";
        clusterRunAnimation.clusterStartMode = shouldStaggerClusterStart ? "staggered" : "synchronous";
        clusterRunAnimation.clusterStartOffsetMs = staggerOffsetMs;
        clusterRunAnimation.memberRoomIds = dispatchPlan.map((entry) => entry.roomId);
        clusterRunAnimation.memberAnimationIds = createdAnimations.map((entry) => entry.id);
        clusterRunAnimation.memberStartDelays = Object.fromEntries(
          dispatchPlan.map((entry) => [entry.roomId, Math.max(0, Number(entry.startDelayMs) || 0)]),
        );
        pendingCommands.push(emitLiveMutation("trigger-room", {
          animationId: clusterRunAnimation.id,
          animation: buildAnimationSnapshotForLiveSync(clusterRunAnimation),
        }));
      }
      for (const animation of createdAnimations) {
        if (clusterRunAnimation) {
          animation.parentClusterRunId = clusterRunAnimation.id;
        }
        pendingCommands.push(emitLiveMutation("trigger-room", {
          animationId: animation.id,
          animation: buildAnimationSnapshotForLiveSync(animation),
        }));
      }
      const isClusterTarget = state.roomDraft.targetType === "cluster";
      const targetRoom = board.rooms.find((entry) => entry.id === targetRoomIds[0]) ?? null;
      const targetLabel = isClusterTarget
        ? getBoardRoomClusters(state.boardId).find((cluster) => cluster.clusterId === state.roomDraft.targetId)?.name || "cluster"
        : targetRoom?.name ?? targetRoom?.label ?? targetRoomIds[0];
      void Promise.allSettled(pendingCommands).then(() => {
        triggerFeedback.textContent = isClusterTarget
          ? `Pending: ${getRoomAnimationLabelById(draftPayload.type, state.boardId)} for cluster ${targetLabel} accepted (waiting for snapshot)`
          : `Pending: ${getRoomAnimationLabelById(draftPayload.type, state.boardId)} for ${targetLabel} accepted (waiting for snapshot)`;
      });
      return;
    }

    if (state.roomDraft.editTargetId) {
      if (state.roomDraft.targetType === "cluster") {
        const clusterEditIndex = state.runningAnimations.findIndex(
          (item) => item.id === state.roomDraft.editTargetId && item.scope === "cluster",
        );
        if (clusterEditIndex >= 0) {
          const existingCluster = state.runningAnimations[clusterEditIndex];
          const shouldStaggerClusterStart = Boolean(state.roomDraft.staggerStart);
          const staggerOffsetMs = clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);
          const cluster = getClusterTargetById(state.roomDraft.targetId, state.boardId);
          const dispatchPlan = buildClusterDispatchPlan(targetRoomIds, {
            staggerStart: shouldStaggerClusterStart,
            staggerOffsetMs,
          });
          const reusableMembersByRoomId = new Map();
          for (const member of state.runningAnimations) {
            if (member?.scope !== "room" || member?.parentClusterRunId !== existingCluster.id) {
              continue;
            }
            const roomKey = String(member.roomId || "").trim();
            if (!roomKey) {
              continue;
            }
            if (!reusableMembersByRoomId.has(roomKey)) {
              reusableMembersByRoomId.set(roomKey, []);
            }
            reusableMembersByRoomId.get(roomKey).push(member);
          }
          const retainedMemberIds = new Set();
          const removedMemberIds = new Set();
          const nextMemberAnimationIds = [];
          const nextMemberRoomIds = [];

          for (const { roomId, startDelayMs } of dispatchPlan) {
            const reusableBucket = reusableMembersByRoomId.get(roomId) ?? [];
            const reusableMember = reusableBucket.shift() ?? null;
            if (reusableMember) {
              const updatedMember = {
                ...reusableMember,
                ...draftPayload,
                boardId: state.boardId,
                roomId,
                parentClusterRunId: existingCluster.id,
                startedAt: performance.now() + Math.max(0, Number(startDelayMs) || 0),
                startedAtEpochMs: Date.now() + Math.max(0, Number(startDelayMs) || 0),
              };
              const memberIndex = state.runningAnimations.findIndex((entry) => entry.id === reusableMember.id);
              if (memberIndex >= 0) {
                state.runningAnimations[memberIndex] = updatedMember;
                playSoundForAnimation(updatedMember);
                emitLiveMutation("edit-room", {
                  animationId: updatedMember.id,
                  animation: buildAnimationSnapshotForLiveSync(updatedMember),
                });
              }
              retainedMemberIds.add(updatedMember.id);
              nextMemberAnimationIds.push(updatedMember.id);
              nextMemberRoomIds.push(roomId);
            } else {
              const createdMember = createAnimation({
                type: draftPayload.type,
                animationName: draftPayload.animationName,
                roomAssetType: draftPayload.roomAssetType,
                roomAssetRef: draftPayload.roomAssetRef,
                scope: "room",
                roomId,
                boardId: state.boardId,
                intensity: draftPayload.intensity,
                speed: draftPayload.speed,
                opacity: draftPayload.opacity,
                playbackSpeed: draftPayload.speed,
                soundVolume: draftPayload.soundVolume,
                hold: true,
                durationSec: 0,
                startDelayMs,
              });
              createdMember.parentClusterRunId = existingCluster.id;
              state.runningAnimations.push(createdMember);
              playSoundForAnimation(createdMember);
              emitLiveMutation("trigger-room", {
                animationId: createdMember.id,
                animation: buildAnimationSnapshotForLiveSync(createdMember),
              });
              retainedMemberIds.add(createdMember.id);
              nextMemberAnimationIds.push(createdMember.id);
              nextMemberRoomIds.push(roomId);
            }
          }

          for (const member of state.runningAnimations) {
            if (member?.scope !== "room" || member?.parentClusterRunId !== existingCluster.id) {
              continue;
            }
            if (!retainedMemberIds.has(member.id)) {
              removedMemberIds.add(member.id);
            }
          }
          for (const removedId of removedMemberIds) {
            stopAnimationSound(removedId);
          }
          if (removedMemberIds.size > 0) {
            state.runningAnimations = state.runningAnimations.filter((entry) => !removedMemberIds.has(entry.id));
          }

          const updatedCluster = {
            ...existingCluster,
            ...draftPayload,
            scope: "cluster",
            roomId: null,
            boardId: state.boardId,
            clusterId: cluster?.clusterId ?? state.roomDraft.targetId,
            clusterName: cluster?.name ?? existingCluster.clusterName ?? "Cluster",
            clusterStartMode: shouldStaggerClusterStart ? "staggered" : "synchronous",
            clusterStartOffsetMs: staggerOffsetMs,
            memberAnimationIds: nextMemberAnimationIds,
            memberRoomIds: nextMemberRoomIds,
            memberStartDelays: Object.fromEntries(
              dispatchPlan.map((entry) => [entry.roomId, Math.max(0, Number(entry.startDelayMs) || 0)]),
            ),
            startedAt: performance.now(),
            startedAtEpochMs: Date.now(),
          };
          state.runningAnimations[clusterEditIndex] = updatedCluster;
          emitLiveMutation("edit-room", {
            animationId: updatedCluster.id,
            animation: buildAnimationSnapshotForLiveSync(updatedCluster),
          });
          for (const removedId of removedMemberIds) {
            emitLiveMutation("stop-animation", {
              animationId: removedId,
            });
          }
          clearRoomDraftEditTarget();
          triggerFeedback.textContent = `Status: ${updatedCluster.id} updated in place (cluster)`;
          renderRunningAnimationsList();
          return;
        }
        clearRoomDraftEditTarget();
      }
      const editIndex = state.runningAnimations.findIndex(
        (item) => item.id === state.roomDraft.editTargetId && item.scope === "room",
      );
      if (editIndex >= 0) {
        const existing = state.runningAnimations[editIndex];
        const updated = {
          ...existing,
          ...draftPayload,
          roomId: targetRoomIds[0],
          boardId: state.boardId,
          startedAt: performance.now(),
          startedAtEpochMs: Date.now(),
        };
        state.runningAnimations[editIndex] = updated;
        playSoundForAnimation(updated);
        triggerFeedback.textContent = `Status: ${updated.id} updated in place`;
        clearRoomDraftEditTarget();
        renderRunningAnimationsList();
        emitLiveMutation("edit-room", {
          animationId: updated.id,
          animation: buildAnimationSnapshotForLiveSync(updated),
        });
        return;
      }
      clearRoomDraftEditTarget();
    }

    const shouldStaggerClusterStart = state.roomDraft.targetType === "cluster" && Boolean(state.roomDraft.staggerStart);
    const staggerOffsetMs = clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);
    const dispatchPlan = state.roomDraft.targetType === "cluster"
      ? buildClusterDispatchPlan(targetRoomIds, {
        staggerStart: shouldStaggerClusterStart,
        staggerOffsetMs,
      })
      : targetRoomIds.map((roomId) => ({ roomId, startDelayMs: 0 }));
    const createdAnimations = dispatchPlan.map(({ roomId, startDelayMs }) => createAnimation({
      type: draftPayload.type,
      animationName: draftPayload.animationName,
      roomAssetType: draftPayload.roomAssetType,
      roomAssetRef: draftPayload.roomAssetRef,
      scope: "room",
      roomId,
      intensity: draftPayload.intensity,
      speed: draftPayload.speed,
      opacity: draftPayload.opacity,
      playbackSpeed: draftPayload.speed,
      soundVolume: draftPayload.soundVolume,
      hold: true,
      durationSec: 0,
      startDelayMs,
    }));

    let clusterRunAnimation = null;
    if (state.roomDraft.targetType === "cluster") {
      const cluster = getClusterTargetById(state.roomDraft.targetId, state.boardId);
      clusterRunAnimation = createAnimation({
        type: draftPayload.type,
        animationName: draftPayload.animationName,
        roomAssetType: draftPayload.roomAssetType,
        roomAssetRef: draftPayload.roomAssetRef,
        scope: "cluster",
        roomId: null,
        boardId: state.boardId,
        intensity: draftPayload.intensity,
        speed: draftPayload.speed,
        opacity: draftPayload.opacity,
        playbackSpeed: draftPayload.speed,
        soundVolume: draftPayload.soundVolume,
        hold: true,
        durationSec: 0,
        startDelayMs: 0,
      });
      clusterRunAnimation.clusterId = cluster?.clusterId ?? state.roomDraft.targetId;
      clusterRunAnimation.clusterName = cluster?.name ?? "Cluster";
      clusterRunAnimation.clusterStartMode = shouldStaggerClusterStart ? "staggered" : "synchronous";
      clusterRunAnimation.clusterStartOffsetMs = staggerOffsetMs;
      clusterRunAnimation.memberRoomIds = dispatchPlan.map((entry) => entry.roomId);
      clusterRunAnimation.memberAnimationIds = createdAnimations.map((entry) => entry.id);
      clusterRunAnimation.memberStartDelays = Object.fromEntries(
        dispatchPlan.map((entry) => [entry.roomId, Math.max(0, Number(entry.startDelayMs) || 0)]),
      );
    }

    if (clusterRunAnimation) {
      state.runningAnimations.push(clusterRunAnimation);
      emitLiveMutation("trigger-room", {
        animationId: clusterRunAnimation.id,
        animation: buildAnimationSnapshotForLiveSync(clusterRunAnimation),
      });
    }

    for (const animation of createdAnimations) {
      if (clusterRunAnimation) {
        animation.parentClusterRunId = clusterRunAnimation.id;
      }
      state.runningAnimations.push(animation);
      playSoundForAnimation(animation);
      emitLiveMutation("trigger-room", {
        animationId: animation.id,
        animation: buildAnimationSnapshotForLiveSync(animation),
      });
    }

    const isClusterTarget = state.roomDraft.targetType === "cluster";
    const targetRoom = board.rooms.find((entry) => entry.id === targetRoomIds[0]) ?? null;
    const targetLabel = isClusterTarget
      ? getBoardRoomClusters(state.boardId).find((cluster) => cluster.clusterId === state.roomDraft.targetId)?.name || "cluster"
      : targetRoom?.name ?? targetRoom?.label ?? targetRoomIds[0];
    const clusterStartModeLabel = shouldStaggerClusterStart ? "staggered start" : "synchronous start";
    triggerFeedback.textContent = isClusterTarget
      ? `Status: ${getRoomAnimationLabelById(draftPayload.type, state.boardId)} started for cluster ${targetLabel} (${createdAnimations.length} rooms, ${clusterStartModeLabel})`
      : `Status: ${getRoomAnimationLabelById(draftPayload.type, state.boardId)} started for ${targetLabel}`;
    renderRunningAnimationsList();
  } finally {
    restoreRoomDraftUiSnapshot(draftSnapshot, "room-start");
  }
}

function collectAnimationStopIds(targetAnimation, { mutateClusterMembership = false } = {}) {
  const idsToStop = new Set();
  if (!targetAnimation || typeof targetAnimation.id !== "string") {
    return idsToStop;
  }
  idsToStop.add(targetAnimation.id);
  if (targetAnimation.scope === "cluster") {
    for (const memberId of getClusterMemberAnimationIds(targetAnimation)) {
      idsToStop.add(memberId);
    }
  }
  if (targetAnimation.scope === "room" && targetAnimation.parentClusterRunId) {
    const parentCluster = state.runningAnimations.find(
      (entry) => entry?.id === targetAnimation.parentClusterRunId && entry?.scope === "cluster",
    );
    if (parentCluster) {
      const nextMemberAnimationIds = getClusterMemberAnimationIds(parentCluster)
        .filter((memberId) => memberId !== targetAnimation.id);
      if (mutateClusterMembership) {
        parentCluster.memberAnimationIds = nextMemberAnimationIds;
        parentCluster.memberRoomIds = nextMemberAnimationIds
          .map((memberId) => state.runningAnimations.find((entry) => entry?.id === memberId)?.roomId ?? null)
          .filter(Boolean);
      }
      if (nextMemberAnimationIds.length === 0) {
        idsToStop.add(parentCluster.id);
      }
    }
  }
  return idsToStop;
}

function isStopPendingForAnimationId(animationId) {
  return typeof animationId === "string" && liveSync.pendingStopAnimationIds.has(animationId);
}

function markStopPending(animationIds) {
  for (const animationId of animationIds) {
    if (typeof animationId === "string" && animationId) {
      liveSync.pendingStopAnimationIds.add(animationId);
    }
  }
}

function clearStopPending(animationIds) {
  for (const animationId of animationIds) {
    if (typeof animationId === "string" && animationId) {
      liveSync.pendingStopAnimationIds.delete(animationId);
    }
  }
}

function reconcileStopPendingFromSnapshot() {
  if (liveSync.pendingStopAnimationIds.size === 0) {
    return;
  }
  const runningIds = new Set(
    state.runningAnimations
      .map((animation) => (typeof animation?.id === "string" ? animation.id : null))
      .filter(Boolean),
  );
  for (const pendingId of [...liveSync.pendingStopAnimationIds]) {
    if (!runningIds.has(pendingId)) {
      liveSync.pendingStopAnimationIds.delete(pendingId);
    }
  }
}

function buildStopCommandTargetMeta(targetAnimation) {
  if (!targetAnimation || typeof targetAnimation !== "object") {
    return {};
  }
  const targetScope = typeof targetAnimation.scope === "string" ? targetAnimation.scope.trim() : "";
  const targetType = typeof targetAnimation.type === "string" ? targetAnimation.type.trim() : "";
  const boardId = typeof targetAnimation.boardId === "string" ? targetAnimation.boardId.trim() : "";
  return {
    ...(targetScope ? { targetScope } : {}),
    ...(targetType ? { targetType } : {}),
    ...(boardId ? { boardId } : {}),
    ...(targetScope === "global" && targetType === "outside-space" ? { outsideHint: true } : {}),
  };
}

function emitStopAnimationCommand(animationId, { priorityHint = "high", targetAnimation = null } = {}) {
  if (typeof animationId !== "string" || !animationId.trim()) {
    return Promise.reject(new Error("invalid animationId for stop command"));
  }
  const animationForMeta =
    targetAnimation
    ?? state.runningAnimations.find((entry) => entry?.id === animationId)
    ?? null;
  return emitLiveMutation(STOP_ANIMATION_MUTATION_TYPE, {
    animationId,
    priorityHint,
    ...buildStopCommandTargetMeta(animationForMeta),
  });
}

function stopAnimation(animationId) {
  const target = state.runningAnimations.find((item) => item.id === animationId) ?? null;
  if (!target) {
    return;
  }
  const idsToStop = collectAnimationStopIds(target, { mutateClusterMembership: true });
  if (outputRole === OUTPUT_ROLE_CONTROL) {
    const idsToDispatch = [...idsToStop].filter((id) => !isStopPendingForAnimationId(id));
    if (idsToDispatch.length === 0) {
      triggerFeedback.textContent = `Pending: stop command for ${idsToStop.size} animation(s) already in flight`;
      return;
    }
    markStopPending(idsToDispatch);
    const commandPairs = idsToDispatch.map((id) => {
      const commandTarget = state.runningAnimations.find((entry) => entry?.id === id) ?? (id === target.id ? target : null);
      return [id, emitStopAnimationCommand(id, {
        priorityHint: "high",
        targetAnimation: commandTarget,
      })];
    });
    void Promise.allSettled(commandPairs.map(([, promise]) => promise)).then((results) => {
      const failedIds = results
        .map((result, index) => (result.status === "rejected" ? commandPairs[index][0] : null))
        .filter(Boolean);
      if (failedIds.length > 0) {
        clearStopPending(failedIds);
        triggerFeedback.textContent = `Status: stop command failed for ${failedIds.length} animation(s)`;
        return;
      }
      triggerFeedback.textContent = `Pending: stop command for ${idsToDispatch.length} animation(s) accepted (waiting for snapshot)`;
    });
    return;
  }
  for (const id of idsToStop) {
    stopAnimationSound(id);
  }
  state.runningAnimations = state.runningAnimations.filter((item) => !idsToStop.has(item.id));
  if (state.roomDraft.editTargetId && idsToStop.has(state.roomDraft.editTargetId)) {
    clearRoomDraftEditTarget();
  }
  if (target?.scope === "global" && target.type === "outside-space") {
    updateOutsideFxProfile(target.boardId, { enabled: false });
    persistBoardProfiles();
    if (target.boardId === state.boardId) {
      syncOutsideFxPanel();
    }
  }
  renderRunningAnimationsList();
  refreshGlobalButtons();
  for (const id of idsToStop) {
    const commandTarget = state.runningAnimations.find((entry) => entry?.id === id) ?? (id === target.id ? target : null);
    void emitStopAnimationCommand(id, {
      priorityHint: "high",
      targetAnimation: commandTarget,
    });
  }
}

function editAnimation(animationId) {
  const animation = state.runningAnimations.find((item) => item.id === animationId);
  if (!animation || (animation.scope !== "room" && animation.scope !== "cluster") || !isRoomAnimationType(animation.type)) {
    return;
  }
  switchBoard(animation.boardId, {
    emitLiveContext: true,
    reason: "edit-room-focus",
  });
  const isClusterScope = animation.scope === "cluster";
  const clusterTarget = isClusterScope
    ? getClusterTargetById(animation.clusterId, animation.boardId)
    : null;
  const fallbackRoomId = isClusterScope
    ? clusterTarget?.roomIds?.[0] ?? null
    : animation.roomId;
  state.selectedRoomId = fallbackRoomId;
  if (fallbackRoomId) {
    state.selectedRoomByBoard[animation.boardId] = fallbackRoomId;
  }
  state.roomDraft.targetType = isClusterScope ? "cluster" : "room";
  state.roomDraft.targetId = isClusterScope
    ? (clusterTarget?.clusterId ?? animation.clusterId ?? null)
    : animation.roomId;
  const roomDefinition = getRoomAnimationDefinitionById(animation.type, animation.boardId);
  const definitionAssetType = normalizeRoomAssetType(
    animation.roomAssetType ?? roomDefinition?.assetType,
  );
  const definitionAssetRef = normalizeRoomAssetRefForType(
    definitionAssetType,
    animation.roomAssetRef ?? roomDefinition?.assetRef,
    roomDefinition?.assetRef,
  );
  state.roomDraft.editTargetId = animation.id;
  state.roomDraft.animationId = animation.type;
  state.roomDraft.opacity = clampRoomOpacity(animation.opacity ?? 0.9);
  state.roomDraft.intensity = clampRoomIntensity(animation.intensity);
  state.roomDraft.speed = clampRoomSpeed(animation.speed ?? 1);
  state.roomDraft.soundVolume = clampRoomSoundVolume(animation.soundVolume ?? 1);
  state.roomDraft.durationSec = animation.durationMs
    ? clampRoomDurationSec(Math.round(animation.durationMs / 1000))
    : 18;
  state.roomDraft.staggerStart = isClusterScope
    ? animation.clusterStartMode === "staggered"
    : state.roomDraft.staggerStart;
  state.roomDraft.staggerOffsetMs = isClusterScope
    ? clampClusterStaggerOffsetMs(animation.clusterStartOffsetMs)
    : clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);

  if (!animation.roomAssetType || !animation.roomAssetRef) {
    animation.roomAssetType = definitionAssetType;
    animation.roomAssetRef = definitionAssetRef;
  }

  roomAnimationSelect.value = state.roomDraft.animationId;
  roomOpacityInput.value = String(state.roomDraft.opacity);
  roomOpacityValue.textContent = state.roomDraft.opacity.toFixed(2);
  roomIntensityInput.value = String(state.roomDraft.intensity);
  roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
  roomSpeedInput.value = String(state.roomDraft.speed);
  roomSpeedValue.textContent = `${state.roomDraft.speed.toFixed(2)}x`;
  roomSoundVolumeInput.value = String(Math.round(state.roomDraft.soundVolume * 100));
  roomSoundVolumeValue.textContent = `${Math.round(state.roomDraft.soundVolume * 100)}%`;
  roomDurationInput.value = String(state.roomDraft.durationSec);
  if (roomStaggerStartInput) {
    roomStaggerStartInput.checked = state.roomDraft.staggerStart;
  }
  syncRoomStaggerOffsetControl();
  syncRoomDraftActionButton();

  syncRoomPanelFromSelection({ preserveDraftState: true });
  renderRoomOverlay();
  triggerFeedback.textContent = `Status: ${animation.id} loaded into editor${isClusterScope ? " (cluster)" : ""}`;
}

function renderRunningAnimationsList() {
  const parity = validateRunningListParity();
  runningAnimationsList.replaceChildren();
  const listAnimations = getRunningAnimationsForList();
  if (listAnimations.length === 0) {
    const empty = document.createElement("li");
    empty.className = "running-empty";
    empty.textContent = "No active animations";
    runningAnimationsList.append(empty);
    return;
  }

  const sortedAnimations = [...listAnimations].sort((a, b) => {
    const startedDelta = Number(b.startedAt || 0) - Number(a.startedAt || 0);
    if (startedDelta !== 0) {
      return startedDelta;
    }
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
  for (const anim of sortedAnimations) {
    const li = document.createElement("li");
    li.className = "running-item";
    const title = document.createElement("div");
    title.className = "running-title";
    const effectLabel = (anim.scope === "room" || anim.scope === "cluster") && anim.animationName
      ? anim.animationName
      : anim.scope === "room" || anim.scope === "cluster"
        ? getRoomAnimationLabelById(anim.type, anim.boardId)
        : getAnimationLabel(anim.type);
    const animationBoard = getBoard(anim.boardId);
    const roomLabel = anim.scope === "room"
      ? animationBoard.rooms.find((r) => r.id === anim.roomId)?.label ?? anim.roomId
      : anim.scope === "cluster"
        ? anim.clusterName ?? getClusterTargetById(anim.clusterId, anim.boardId)?.name ?? anim.clusterId ?? "Cluster"
        : "Global";
    const scopeLabel = anim.scope === "room"
      ? "ROOM"
      : anim.scope === "cluster"
        ? "CLUSTER"
        : getGlobalCategoryRuntimeLabel(anim.type);
    const scopeBadge = document.createElement("span");
    scopeBadge.className = `running-scope-badge running-scope-badge-${scopeLabel.toLowerCase()}`;
    scopeBadge.textContent = scopeLabel;
    title.append(scopeBadge, document.createTextNode(` ${effectLabel} - ${roomLabel}`));

    const meta = document.createElement("div");
    meta.className = "running-meta";
    const remaining = anim.durationMs
      ? `${Math.max(0, Math.ceil((anim.startedAt + anim.durationMs - performance.now()) / 1000))}s`
      : "hold";
    const roomMeta = anim.scope === "room"
      ? ` | Opacity: ${clampRoomOpacity(anim.opacity ?? 0.9).toFixed(2)} | Speed: ${clampRoomSpeed(anim.speed ?? anim.playbackSpeed ?? 1).toFixed(2)}x${getRoomGifAssetFileName(anim.type, anim.boardId) ? ` | GIF: ${getRoomGifAssetFileName(anim.type, anim.boardId)}` : ""}${getRoomEquivalentType(anim.type, anim.boardId) ? ` | GlobalEq: ${getRoomEquivalentType(anim.type, anim.boardId)}` : ""} | Sound: ${Math.round(
        clampRoomSoundVolume(anim.soundVolume ?? 1) * 100,
      )}%`
      : anim.scope === "cluster"
        ? ` | Cluster: ${anim.clusterName ?? getClusterTargetById(anim.clusterId, anim.boardId)?.name ?? anim.clusterId ?? "unknown"} | Members: ${Math.max(
          0,
          getClusterMemberAnimationIds(anim).length,
        )} | Start: ${(anim.clusterStartMode ?? "synchronous") === "staggered" ? "staggered" : "synchronous"}${(anim.clusterStartMode ?? "synchronous") === "staggered" ? ` (${clampClusterStaggerOffsetMs(anim.clusterStartOffsetMs)}ms)` : ""}`
        : "";
    meta.textContent = `Instance: ${anim.id} | Type: ${anim.type} | Board: ${getBoard(anim.boardId).label} | Intensity: ${anim.intensity.toFixed(2)}${roomMeta} | Remaining: ${remaining}`;

    const actions = document.createElement("div");
    actions.className = "running-actions";
    const stopButton = document.createElement("button");
    stopButton.type = "button";
    const stopPending = [...collectAnimationStopIds(anim)].some((id) => isStopPendingForAnimationId(id));
    stopButton.textContent = stopPending ? "Stopping..." : "Stop";
    stopButton.disabled = stopPending;
    stopButton.addEventListener("click", () => {
      const pendingAtClick = [...collectAnimationStopIds(anim)].some((id) => isStopPendingForAnimationId(id));
      if (pendingAtClick) {
        return;
      }
      if (shouldSuppressRapidTap(`running-stop-${anim.id}`)) {
        return;
      }
      setDashboardZone("manage");
      stopAnimation(anim.id);
    });
    actions.append(stopButton);

    if (anim.scope === "room" || anim.scope === "cluster") {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        if (shouldSuppressRapidTap(`running-edit-${anim.id}`)) {
          return;
        }
        setDashboardZone("manage");
        editAnimation(anim.id);
      });
      actions.append(editButton);
    }

    li.append(title, meta, actions);
    runningAnimationsList.append(li);
  }

  if (!parity.ok) {
    triggerFeedback.textContent = `Status: Running-Liste-Guard meldet Drift (${parity.reason})`;
  }
}

function isRunningListInteractionActive() {
  if (!runningAnimationsList) {
    return false;
  }
  if (runningAnimationsList.matches(":hover") || runningAnimationsList.matches(":focus-within")) {
    return true;
  }
  const activeElement = document.activeElement;
  return Boolean(activeElement && runningAnimationsList.contains(activeElement));
}

function validateRunningListParity() {
  const seenIds = new Set();
  const activeClusterIds = new Set();
  for (const entry of state.runningAnimations) {
    if (!entry?.id || seenIds.has(entry.id)) {
      return { ok: false, reason: "duplicate-or-missing-id" };
    }
    seenIds.add(entry.id);
    if (entry.scope === "cluster") {
      activeClusterIds.add(entry.id);
    }
  }
  for (const entry of state.runningAnimations) {
    if (entry?.scope !== "room" || !entry?.parentClusterRunId) {
      continue;
    }
    if (activeClusterIds.has(entry.parentClusterRunId)) {
      continue;
    }
    return { ok: false, reason: "orphaned-cluster-member" };
  }
  return { ok: true, reason: "ok" };
}

function refreshGlobalButtons() {
  document.querySelectorAll("button[data-global]").forEach((button) => {
    const type = button.dataset.global;
    const isActive = state.runningAnimations.some(
      (anim) => anim.scope === "global" && anim.type === type && anim.boardId === state.boardId,
    );
    button.classList.toggle("active", isActive);
  });
}

function clipToPolygon(polygon, { evenodd = false } = {}) {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }
  ctx.beginPath();
  polygon.forEach(([x, y], index) => {
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
  if (evenodd) {
    ctx.clip("evenodd");
  } else {
    ctx.clip();
  }
  return true;
}

function isFiniteCanvasPoint(point) {
  return Array.isArray(point)
    && point.length >= 2
    && Number.isFinite(Number(point[0]))
    && Number.isFinite(Number(point[1]));
}

function getPolygonSignedArea(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return 0;
  }
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    if (!isFiniteCanvasPoint(current) || !isFiniteCanvasPoint(next)) {
      return 0;
    }
    area += Number(current[0]) * Number(next[1]) - Number(next[0]) * Number(current[1]);
  }
  return area / 2;
}

function isRenderableCanvasPolygon(polygon, { minArea = 8 } = {}) {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }
  if (!polygon.every((point) => isFiniteCanvasPoint(point))) {
    return false;
  }
  return Math.abs(getPolygonSignedArea(polygon)) >= minArea;
}

function clipToRoom(room, boardId = state.boardId) {
  const polygon = getRoomPolygonPixels(room, canvas.width, canvas.height, boardId);
  if (!isRenderableCanvasPolygon(polygon)) {
    return true;
  }
  return clipToPolygon(polygon);
}

function getShipClipPolygon(boardId = state.boardId) {
  const selected = getShipPolygonPixels(canvas.width, canvas.height, boardId);
  return selected.length >= 3 ? selected : null;
}

function getPlayAreaClipPolygons(boardId = state.boardId) {
  return getPlayAreaPolygonsPixels(canvas.width, canvas.height, boardId)
    .filter((polygon) => isRenderableCanvasPolygon(polygon));
}

function appendPolygonPath(polygon) {
  polygon.forEach(([x, y], index) => {
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
}

function clipToOutsideShip(boardId = state.boardId) {
  const playAreaPolygons = getPlayAreaClipPolygons(boardId);
  if (playAreaPolygons.length === 0) {
    return false;
  }
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  for (const polygon of playAreaPolygons) {
    appendPolygonPath(polygon);
  }
  ctx.clip("evenodd");
  return true;
}

function clipToInsideShip(boardId = state.boardId) {
  const playAreaPolygons = getPlayAreaClipPolygons(boardId);
  if (playAreaPolygons.length === 0) {
    return false;
  }
  ctx.beginPath();
  for (const polygon of playAreaPolygons) {
    appendPolygonPath(polygon);
  }
  ctx.clip();
  return true;
}

function drawInsideGlobalVisual(animation, age) {
  const boardId = animation.boardId ?? state.boardId;
  const profile = getInsideFxProfile(boardId);
  const definition = profile.animations.find((entry) => entry.id === animation.type) ?? null;
  const intensity = clampOutsideIntensity(definition?.intensity ?? animation.intensity ?? 1);
  const speed = clampOutsideSpeed(definition?.speed ?? 1);
  const timeline = age * speed;

  if (definition?.assetType === "gif") {
    const frame = getGifPlaybackFrame(definition.assetRef, timeline);
    if (frame) {
      ctx.globalAlpha = intensity;
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
    }
    return;
  }

  if (definition?.assetType === "mp4") {
    const videoEntry = getOutsideVideoElement(definition.assetRef);
    if (videoEntry?.video) {
      const video = videoEntry.video;
      const playbackRate = Math.max(0.15, Math.min(4, speed * state.animationSpeed));
      video.loop = true;
      if (Math.abs((Number(video.playbackRate) || 1) - playbackRate) > 0.01) {
        video.playbackRate = playbackRate;
      }
      if (video.paused) {
        void video.play().catch(() => undefined);
      }
      ctx.globalAlpha = intensity;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return;
    }
  }

  const codedEffectType = resolveInsideCodedEffectType(definition?.assetRef ?? animation.type);
  drawEffectVisual(codedEffectType, timeline, intensity, null);
}

function drawAnimation(animation, now) {
  if (Number.isFinite(animation?.startedAt) && now < Number(animation.startedAt)) {
    return;
  }
  if (animation.scope === "cluster") {
    if (animation.boardId !== state.boardId) {
      return;
    }
    const board = getBoard(animation.boardId);
    const memberViews = buildClusterMemberRuntimeViews(animation);
    for (const memberView of memberViews) {
      const room = board.rooms.find((entry) => entry.id === memberView.roomId);
      if (!room) {
        continue;
      }
      const memberAnimation = memberView.animation;
      if (Number.isFinite(memberAnimation?.startedAt) && now < Number(memberAnimation.startedAt)) {
        continue;
      }
      const runtimeSpeed = clampRoomSpeed(memberAnimation.speed ?? animation.speed ?? 1);
      const age = ((now - Number(memberAnimation.startedAt)) / 1000) * state.animationSpeed * runtimeSpeed;
      const roomMetrics = getRoomRenderMetrics(room, animation.boardId);
      ctx.save();
      try {
        const clipped = clipToRoom(room, animation.boardId);
        if (!clipped) {
          continue;
        }
        const memberConcurrencyKey = `${animation.boardId ?? ""}::${room.id ?? ""}`;
        const memberConcurrency = state.runtimePerf.roomConcurrencyByKey?.get(memberConcurrencyKey) ?? 0;
        if (memberConcurrency >= 2) {
          ctx.globalCompositeOperation = "lighter";
        }
        drawRoomComposition(memberAnimation, age, room, roomMetrics);
      } finally {
        ctx.restore();
      }
    }
    return;
  }
  if (animation.scope === "room" && animation.parentClusterRunId) {
    const hasClusterController = state.runningAnimations.some(
      (entry) => entry?.id === animation.parentClusterRunId && entry?.scope === "cluster",
    );
    if (hasClusterController) {
      return;
    }
  }
  const runtimeSpeed = animation.scope === "room" ? clampRoomSpeed(animation.speed ?? 1) : 1;
  const age = ((now - animation.startedAt) / 1000) * state.animationSpeed * runtimeSpeed;
  if (animation.scope === "room") {
    if (animation.boardId !== state.boardId) {
      return;
    }
    const room = getBoard(animation.boardId).rooms.find((entry) => entry.id === animation.roomId);
    if (!room) {
      return;
    }
    const roomMetrics = getRoomRenderMetrics(room, animation.boardId);
    ctx.save();
    try {
      const clipped = clipToRoom(room, animation.boardId);
      if (!clipped) {
        return;
      }
      // P12-1 order-invariant layering: when this room has ≥ 2 concurrent
      // running animations, draw with additive composite so no effect can
      // occlude another regardless of trigger order. Type-independent:
      // coded, mp4, and gif all route through drawRoomComposition.
      const concurrencyKey = `${animation.boardId ?? ""}::${animation.roomId ?? ""}`;
      const roomConcurrency = state.runtimePerf.roomConcurrencyByKey?.get(concurrencyKey) ?? 0;
      if (roomConcurrency >= 2) {
        ctx.globalCompositeOperation = "lighter";
      }
      drawRoomComposition(animation, age, room, roomMetrics);
    } finally {
      ctx.restore();
    }
    return;
  }
  if (animation.type === "outside-space") {
    // Outside is rendered in a dedicated isolated layer path.
    return;
  }

  ctx.save();
  try {
    const clipped = clipToInsideShip(animation.boardId ?? state.boardId);
    if (!clipped) {
      return;
    }
    drawInsideGlobalVisual(animation, age);
  } finally {
    ctx.restore();
  }
}

function drawAnimationSafely(animation, now) {
  try {
    drawAnimation(animation, now);
    return true;
  } catch (error) {
    logRender.error("animation_render_failed", {
      event: "animation-render-failed",
      animationId: animation.id,
      boardId: state.boardId,
      error: String(error?.message || error),
    });
    return false;
  }
}

function drawOutsideFxLayer(now) {
  const outside = getOutsideFxProfile(state.boardId);
  if (!outside.enabled) {
    clearOutsideMp4PlaybackState(state.boardId);
    clearOutsideTimelineState(state.boardId);
    return;
  }
  const selectedDefinition = getSelectedOutsideAnimationDefinition(state.boardId);
  if (!selectedDefinition) {
    clearOutsideMp4PlaybackState(state.boardId);
    clearOutsideTimelineState(state.boardId);
    return;
  }
  const outsideLifecycleKey = buildOutsideLifecycleKey(state.boardId, selectedDefinition);
  const elapsedSeconds = resolveOutsideElapsedSeconds(now, {
    boardId: state.boardId,
    lifecycleKey: outsideLifecycleKey,
  }) * state.animationSpeed;
  const timeline = resolveOutsideTimeline(elapsedSeconds, selectedDefinition.speed);
  const effectiveDirection = selectedDefinition.direction === "reverse" ? "reverse" : "forward";

  ctx.save();
  try {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.filter = "none";
    const clipped = clipToOutsideShip(state.boardId);
    if (!clipped) {
      return;
    }
    if (selectedDefinition.assetType === "gif") {
      clearOutsideMp4PlaybackState(state.boardId);
      const frame = getGifPlaybackFrame(selectedDefinition.assetRef, timeline.timeline);
      if (frame) {
        ctx.globalAlpha = clampOutsideIntensity(selectedDefinition.intensity);
        ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
      }
      return;
    }
    if (selectedDefinition.assetType === "mp4") {
      const videoEntry = getOutsideVideoElement(selectedDefinition.assetRef);
      if (videoEntry?.video) {
        const video = videoEntry.video;
        const targetRate = Math.max(0.15, Math.min(4, clampOutsideSpeed(selectedDefinition.speed) * state.animationSpeed));
        const playbackState = ensureOutsideMp4Playback(video, {
          boardId: state.boardId,
          lifecycleKey: outsideLifecycleKey,
          assetRef: selectedDefinition.assetRef,
          targetRate,
        });
        maybeWrapOutsideMp4Loop(video, playbackState);
        ctx.globalAlpha = clampOutsideIntensity(selectedDefinition.intensity);
        if (video.readyState >= 2 && Number(video.videoWidth) > 0 && Number(video.videoHeight) > 0) {
          if (shouldDrawOutsideMp4Now(playbackState)) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            captureOutsideMp4FallbackFrame(playbackState, video);
          } else {
            drawOutsideMp4FallbackFrame(playbackState);
          }
        } else {
          drawOutsideMp4FallbackFrame(playbackState);
        }
      } else {
        clearOutsideMp4PlaybackState(state.boardId);
      }
      return;
    }
    clearOutsideMp4PlaybackState(state.boardId);
    const codedEffectType = resolveOutsideCodedEffectType(selectedDefinition.assetRef);
    drawEffectVisual(codedEffectType, timeline.timeline, selectedDefinition.intensity, null, null, {
      outsideMode: selectedDefinition.mode,
      outsideSpeed: selectedDefinition.speed,
      outsideDirection: effectiveDirection,
    });
  } finally {
    ctx.restore();
  }
}

function flickerNoise(seed) {
  const raw = Math.sin(seed * 127.1) * 43758.5453123;
  return raw - Math.floor(raw);
}

function drawEffectVisual(type, age, intensity, room, roomMetrics = null, options = {}) {
  const w = canvas.width;
  const h = canvas.height;
  const roomCenter = room ? getRoomLabelPosition(room, state.boardId) : { x: 0.5, y: 0.5 };
  const roomX = roomMetrics?.centerX ?? roomCenter.x * w;
  const roomY = roomMetrics?.centerY ?? roomCenter.y * h;
  const roomRadius = roomMetrics?.radius ?? room?.radius * Math.min(w, h) ?? Math.min(w, h) * 0.08;
  const roomWidth = roomMetrics?.width ?? roomRadius * 2;
  const roomHeight = roomMetrics?.height ?? roomRadius * 2;
  const roomMinX = roomMetrics?.minX ?? roomX - roomWidth / 2;
  const roomMinY = roomMetrics?.minY ?? roomY - roomHeight / 2;
  const visualCaps = getRuntimeVisualCaps();

  if (type === "outside-space") {
    const immersive = options.outsideMode === "immersive";
    const speedInfluence = clampOutsideSpeed(options.outsideSpeed ?? 1);
    const speedFactor = (immersive ? 1.45 : 1) * (0.75 + speedInfluence * 0.45);
    const directionMultiplier = options.outsideDirection === "reverse" ? -1 : 1;

    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.fillRect(0, 0, w, h);

    const parallaxLayers = immersive
      ? [
        { density: 46, speed: 190, size: 0.9, alpha: 0.16, wave: 0.008 },
        { density: 66, speed: 310, size: 1.2, alpha: 0.26, wave: 0.011 },
        { density: 82, speed: 470, size: 1.6, alpha: 0.38, wave: 0.014 },
        { density: 98, speed: 660, size: 2, alpha: 0.52, wave: 0.017 },
      ]
      : [
        { density: 32, speed: 130, size: 0.85, alpha: 0.14, wave: 0.006 },
        { density: 50, speed: 230, size: 1.1, alpha: 0.22, wave: 0.009 },
        { density: 68, speed: 360, size: 1.45, alpha: 0.32, wave: 0.012 },
      ];

    for (let layerIndex = 0; layerIndex < parallaxLayers.length; layerIndex += 1) {
      const layer = parallaxLayers[layerIndex];
      const starCount = Math.max(
        16,
        Math.min(
          visualCaps.outsideStarsPerLayer,
          Math.round(layer.density * intensity * visualCaps.nonCriticalDensityScale),
        ),
      );
      const layerSpeed = layer.speed * (0.8 + intensity * 0.75) * speedFactor;
      const layerWave = h * layer.wave;

      for (let i = 0; i < starCount; i += 1) {
        const seedX = ((i * 97.173 + layerIndex * 31.7) % 1000) / 1000;
        const seedY = ((i * 57.913 + layerIndex * 79.1) % 1000) / 1000;
        const progressRaw = (seedX * (w + 8) - age * layerSpeed * directionMultiplier) % (w + 8);
        const x = progressRaw < 0 ? progressRaw + w + 8 : progressRaw;
        const y = seedY * h + Math.sin(age * 0.35 + i * 0.07 + layerIndex) * layerWave;
        const twinkle = (Math.sin(age * (2 + layerIndex * 0.7) + i * 0.9) + 1) / 2;
        const alpha = Math.min(0.95, layer.alpha * (0.8 + intensity * 0.7) * (0.75 + twinkle * 0.45));
        const size = layer.size * (0.8 + (((i * 19.9) % 100) / 100) * 0.7);
        const streakLength =
          (3.5 + layerIndex * 3.2 + speedInfluence * 4.2 + intensity * 2.8) * (immersive ? 1.25 : 1);
        const streakWidth = Math.max(0.8, size * (0.65 + layerIndex * 0.08));

        ctx.strokeStyle = `rgba(232, 238, 255, ${Math.min(0.9, alpha * 0.72)})`;
        ctx.lineWidth = streakWidth;
        ctx.beginPath();
        ctx.moveTo(x + streakLength * directionMultiplier, y);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.fillStyle = `rgba(245, 248, 255, ${alpha})`;
        ctx.fillRect(x, y, size, size);
      }
    }

    const expressLanes = Math.max(
      4,
      Math.min(22, Math.round((immersive ? 14 : 9) * intensity * visualCaps.nonCriticalDensityScale)),
    );
    for (let i = 0; i < expressLanes; i += 1) {
      const laneY = (((i * 63.17) % 1000) / 1000) * h;
      const pulse = ((age * (0.82 + i * 0.045)) % 1) * (w + 210);
      const laneLength = 140 + speedInfluence * 55 + intensity * 70;
      const laneAlpha = (0.04 + ((Math.sin(age * 4.6 + i) + 1) / 2) * 0.15) * (immersive ? 1.2 : 0.92);
      ctx.strokeStyle = `rgba(224, 233, 255, ${Math.min(0.48, laneAlpha)})`;
      ctx.lineWidth = 0.8 + ((i % 3) + 1) * 0.38;
      ctx.beginPath();
      const laneHeadX = directionMultiplier > 0 ? w - pulse : pulse;
      ctx.moveTo(laneHeadX + laneLength * directionMultiplier, laneY);
      ctx.lineTo(laneHeadX, laneY);
      ctx.stroke();
    }
    return;
  }

  if (type === "hull-flicker") {
    const timeline = age * (1.6 + intensity * 0.5);
    const step = Math.floor(timeline * 6);

    const gate = flickerNoise(step * 0.08 + 3.9);
    const isOnPeriod = gate > 0.72;

    let flickerIntensity = 0;
    if (isOnPeriod) {
      const baseFlicker = (flickerNoise(step * 0.22 + 7.4) * 0.55 +
        flickerNoise(step * 0.55 + 15.2) * 0.35 +
        flickerNoise(step * 1.1 + 28.6) * 0.1);
      flickerIntensity = (0.4 + baseFlicker * 0.6) * intensity;
    }

    const dipAlpha = isOnPeriod && flickerIntensity < 0.35 ? (0.35 - flickerIntensity) * 0.5 * intensity : 0;
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.3, dipAlpha)})`;
    ctx.fillRect(0, 0, w, h);

    const tubeColor = "240, 235, 190";
    const overlayAlpha = Math.min(0.4, flickerIntensity);
    if (overlayAlpha > 0.015 && isOnPeriod) {
      ctx.fillStyle = `rgba(${tubeColor}, ${overlayAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    return;
  }

  if (type === "intruder-alert") {
    const pulse = (Math.sin(age * 9) + 1) / 2;
    ctx.fillStyle = `rgba(255, 45, 45, ${(0.1 + pulse * 0.24) * intensity})`;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  if (type === "power-outage") {
    const pulse = (Math.sin(age * 20) + 1) / 2;
    const alpha = 0.76 + pulse * 0.2;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, w, h);

    const flash = Math.random() > 0.88;
    if (flash) {
      ctx.fillStyle = `rgba(122, 182, 255, ${0.15 * intensity})`;
      ctx.fillRect(0, 0, w, h);
    }

    for (let i = 0; i < 4; i += 1) {
      const y = h * (0.2 + i * 0.2);
      ctx.strokeStyle = `rgba(125, 191, 255, ${(0.07 + pulse * 0.07) * intensity})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    return;
  }

  if (type === "special-slime") {
    const densityFactor = Number(options.densityFactor) || 1;
    const bands = Math.max(3, Math.round(9 * intensity * densityFactor * visualCaps.nonCriticalDensityScale));
    for (let i = 0; i < bands; i += 1) {
      const wave = Math.sin(age * 1.8 + i * 0.9);
      const y = roomMinY + roomHeight * (0.14 + (i / Math.max(1, bands - 1)) * 0.72);
      const thickness = Math.max(4, roomHeight * 0.06);
      const startX = roomMinX - roomWidth * 0.15;
      const endX = roomMinX + roomWidth * 1.15;
      const gradient = ctx.createLinearGradient(startX, y, endX, y + thickness);
      gradient.addColorStop(0, `rgba(58, 255, 162, ${(0.08 + i * 0.01) * intensity})`);
      gradient.addColorStop(0.5, `rgba(132, 255, 196, ${(0.2 + wave * 0.06) * intensity})`);
      gradient.addColorStop(1, `rgba(41, 149, 92, ${(0.12 + i * 0.015) * intensity})`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(startX, y + Math.sin(age + i) * 6);
      ctx.bezierCurveTo(
        roomX - roomWidth * 0.35,
        y + wave * 14,
        roomX + roomWidth * 0.3,
        y - wave * 12,
        endX,
        y + Math.cos(age * 1.2 + i) * 6,
      );
      ctx.lineTo(endX, y + thickness);
      ctx.lineTo(startX, y + thickness);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }

  if (type === "special-scanning") {
    const densityFactor = Number(options.densityFactor) || 1;
    const rings = Math.max(3, Math.round(7 * intensity * densityFactor * visualCaps.nonCriticalDensityScale));
    const maxRadius = Math.max(roomWidth, roomHeight) * 0.72;
    for (let i = 0; i < rings; i += 1) {
      const progress = ((age * 0.9 + i / rings) % 1);
      const radius = Math.max(6, progress * maxRadius);
      const alpha = (1 - progress) * 0.38 * intensity;
      ctx.strokeStyle = `rgba(178, 230, 255, ${alpha})`;
      ctx.lineWidth = Math.max(1.5, roomWidth * 0.01);
      ctx.beginPath();
      ctx.arc(roomX, roomY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    const streaks = Math.max(6, Math.round(14 * visualCaps.nonCriticalDensityScale));
    for (let i = 0; i < streaks; i += 1) {
      const angle = (Math.PI * 2 * i) / streaks + age * 1.2;
      const inner = Math.max(10, Math.min(roomWidth, roomHeight) * 0.1);
      const outer = maxRadius * (0.8 + Math.sin(age * 2 + i) * 0.1);
      ctx.strokeStyle = `rgba(212, 245, 255, ${(0.12 + ((i % 3) * 0.04)) * intensity})`;
      ctx.lineWidth = Math.max(1, roomWidth * 0.006);
      ctx.beginPath();
      ctx.moveTo(roomX + Math.cos(angle) * inner, roomY + Math.sin(angle) * inner);
      ctx.lineTo(roomX + Math.cos(angle) * outer, roomY + Math.sin(angle) * outer);
      ctx.stroke();
    }
    return;
  }
}

function pruneFinishedAnimations(now) {
  const before = state.runningAnimations.length;
  state.runningAnimations = state.runningAnimations.filter((anim) => {
    if (anim.scope === "cluster") {
      return true;
    }
    if (anim.scope === "room") {
      const board = getBoard(anim.boardId);
      const hasRoom = board.rooms.some((room) => room.id === anim.roomId);
      if (!hasRoom) {
        return false;
      }
    }
    if (anim.hold || anim.durationMs === null) {
      return true;
    }
    return now - anim.startedAt < anim.durationMs;
  });
  const activeRoomByCluster = new Map();
  for (const anim of state.runningAnimations) {
    if (anim.scope !== "room" || !anim.parentClusterRunId) {
      continue;
    }
    if (!activeRoomByCluster.has(anim.parentClusterRunId)) {
      activeRoomByCluster.set(anim.parentClusterRunId, []);
    }
    activeRoomByCluster.get(anim.parentClusterRunId).push(anim);
  }
  for (const anim of state.runningAnimations) {
    if (anim.scope !== "cluster") {
      continue;
    }
    const members = activeRoomByCluster.get(anim.id) ?? [];
    if (members.length === 0) {
      continue;
    }
    anim.memberAnimationIds = members.map((entry) => entry.id);
    anim.memberRoomIds = members.map((entry) => entry.roomId);
  }

  if (before !== state.runningAnimations.length) {
    stopSoundsForInactiveAnimations();
    renderRunningAnimationsList();
    refreshGlobalButtons();
  }
  if (
    state.roomDraft.editTargetId &&
    !state.runningAnimations.some((anim) => anim.id === state.roomDraft.editTargetId)
  ) {
    clearRoomDraftEditTarget();
  }
}

function draw(now) {
  const frameStart = performance.now();
  try {
    state.runtimePerf.frameIndex = (Number(state.runtimePerf.frameIndex) || 0) + 1;
    if (state.mobilePerf.lastFrameAt !== null) {
      const frameDelta = now - state.mobilePerf.lastFrameAt;
      if (Number.isFinite(frameDelta) && frameDelta > 0 && frameDelta < 1000) {
        state.mobilePerf.frameDeltaSamples.push(frameDelta);
        if (state.mobilePerf.frameDeltaSamples.length > 900) {
          state.mobilePerf.frameDeltaSamples.shift();
        }
      }
    }
    state.mobilePerf.lastFrameAt = now;

    if (state.mobilePerf.pendingTriggerAt !== null) {
      const latency = now - state.mobilePerf.pendingTriggerAt;
      if (Number.isFinite(latency) && latency >= 0 && latency < 1500) {
        state.mobilePerf.triggerLatencySamples.push(latency);
        if (state.mobilePerf.triggerLatencySamples.length > 200) {
          state.mobilePerf.triggerLatencySamples.shift();
        }
      }
      state.mobilePerf.pendingTriggerAt = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pruneFinishedAnimations(now);
    drawOutsideFxLayer(now);

    // Order-invariant room layering (P12-1):
    // When ≥ 2 animations (any type) run in the same (board, room), switch
    // to additive composite ('lighter') so draw order cannot occlude.
    // Single-animation rooms keep the default source-over blend.
    const roomConcurrencyByKey = new Map();
    for (const entry of state.runningAnimations) {
      if (entry?.scope !== "room") continue;
      const boardId = typeof entry.boardId === "string" ? entry.boardId : "";
      const roomId = typeof entry.roomId === "string" ? entry.roomId : "";
      if (!roomId) continue;
      const key = `${boardId}::${roomId}`;
      roomConcurrencyByKey.set(key, (roomConcurrencyByKey.get(key) || 0) + 1);
    }
    state.runtimePerf.roomConcurrencyByKey = roomConcurrencyByKey;

    const failedAnimationIds = [];
    let renderedCount = 0;
    const maxRenderAnimationsPerFrame = Math.max(1, Number(state.runtimePerf.maxRenderAnimationsPerFrame) || 96);
    for (const anim of state.runningAnimations) {
      if (shouldCoalesceNonCriticalAnimation(anim)) {
        continue;
      }
      if (!isRenderCriticalAnimation(anim) && renderedCount >= maxRenderAnimationsPerFrame) {
        continue;
      }
      const ok = drawAnimationSafely(anim, now);
      renderedCount += 1;
      if (!ok) {
        failedAnimationIds.push(anim.id);
      }
    }

    if (failedAnimationIds.length > 0) {
      state.runningAnimations = state.runningAnimations.filter(
        (anim) => !failedAnimationIds.includes(anim.id),
      );
      renderRunningAnimationsList();
      refreshGlobalButtons();
      triggerFeedback.textContent =
        "Status: faulty animation isolated, render timer continues";
    }

    if (
      outputRole !== OUTPUT_ROLE_FINAL
      && now - lastListRenderAt > 500
      && !isRunningListInteractionActive()
    ) {
      renderRunningAnimationsList();
      lastListRenderAt = now;
    }
    recordRuntimeFrameCost(performance.now() - frameStart);
  } finally {
    requestAnimationFrame(draw);
  }
}

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

hitareaOffsetXInput.addEventListener("input", () => {
  const offsetX = clampHitareaOffset(Number(hitareaOffsetXInput.value));
  updateActiveBoardHitareaCalibration({ offsetX });
});

hitareaOffsetYInput.addEventListener("input", () => {
  const offsetY = clampHitareaOffset(Number(hitareaOffsetYInput.value));
  updateActiveBoardHitareaCalibration({ offsetY });
});

hitareaScaleInput.addEventListener("input", () => {
  const scale = clampHitareaScale(Number(hitareaScaleInput.value));
  updateActiveBoardHitareaCalibration({ scale });
});

hitareaSaveButton.addEventListener("click", () => {
  const persisted = persistHitareaCalibrationMap();
  syncHitareaCalibrationPanel();
  triggerFeedback.textContent = persisted
    ? "Status: Board profile (hit area + geometry + shapes) saved"
    : "Status: Board profile could not be saved";
});

hitareaResetButton.addEventListener("click", () => {
  setHitareaCalibration(state.boardId, HITAREA_CALIBRATION_DEFAULT);
  const persisted = persistHitareaCalibrationMap();
  syncHitareaCalibrationPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? "Status: Hit area calibration reset to default"
    : "Status: Hit area default applied, persistence failed";
});

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

roomGeometryModeInput.addEventListener("change", () => {
  const room = getSelectedRoom();
  if (!room) {
    return;
  }
  const current = getRoomGeometry(state.boardId, room.id);
  const baseCenter = getRawRoomCenter(room);
  const nextMode = normalizeRoomGeometryMode(roomGeometryModeInput.value);
  if (nextMode === "absolute") {
    const absoluteX = clampRoomAbsoluteCoordinate(baseCenter.x + current.offsetX);
    const absoluteY = clampRoomAbsoluteCoordinate(baseCenter.y + current.offsetY);
    updateSelectedRoomGeometry({ mode: nextMode, absoluteX, absoluteY }, "set to ABS mode");
  } else {
    const offsetX = clampRoomRelativeOffset(current.absoluteX - baseCenter.x);
    const offsetY = clampRoomRelativeOffset(current.absoluteY - baseCenter.y);
    updateSelectedRoomGeometry({ mode: nextMode, offsetX, offsetY }, "set to REL mode");
  }
});

roomGeometryXInput.addEventListener("input", () => {
  const room = getSelectedRoom();
  if (!room) {
    return;
  }
  const geometry = getRoomGeometry(state.boardId, room.id);
  if (geometry.mode === "absolute") {
    const absoluteX = clampRoomAbsoluteCoordinate(Number(roomGeometryXInput.value));
    updateSelectedRoomGeometry({ absoluteX }, "X calibrated (ABS)");
  } else {
    const offsetX = clampRoomRelativeOffset(Number(roomGeometryXInput.value));
    updateSelectedRoomGeometry({ offsetX }, "X calibrated (REL)");
  }
});

roomGeometryYInput.addEventListener("input", () => {
  const room = getSelectedRoom();
  if (!room) {
    return;
  }
  const geometry = getRoomGeometry(state.boardId, room.id);
  if (geometry.mode === "absolute") {
    const absoluteY = clampRoomAbsoluteCoordinate(Number(roomGeometryYInput.value));
    updateSelectedRoomGeometry({ absoluteY }, "Y calibrated (ABS)");
  } else {
    const offsetY = clampRoomRelativeOffset(Number(roomGeometryYInput.value));
    updateSelectedRoomGeometry({ offsetY }, "Y calibrated (REL)");
  }
});

roomGeometryStretchXInput.addEventListener("input", () => {
  const stretchX = clampRoomStretch(Number(roomGeometryStretchXInput.value));
  updateSelectedRoomGeometry({ stretchX }, "Stretch X set");
});

roomGeometryStretchYInput.addEventListener("input", () => {
  const stretchY = clampRoomStretch(Number(roomGeometryStretchYInput.value));
  updateSelectedRoomGeometry({ stretchY }, "Stretch Y set");
});

// Phase 13-2: zoom slider removed. Wheel + pinch gestures below replace it.
// Mouse wheel over the stage: exponential scale delta, cursor-anchored.
// Two-finger pinch: midpoint-anchored scale via pointer pair distance ratio.

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
function applyZoomScaleAroundClientPoint(nextScale, clientX, clientY, reason) {
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const layoutWidth = stage.clientWidth || 0;
  const layoutHeight = stage.clientHeight || 0;
  if (layoutWidth <= 0 || layoutHeight <= 0) return;

  const current = getBoardZoom(state.boardId);
  const currentScale = Math.max(0.0001, Number(current.scale) || 1);
  const clamped = clampBoardZoomScale(nextScale);
  if (!Number.isFinite(clamped) || clamped <= 0) return;

  const fracX = (clientX - rect.left) / rect.width;
  const fracY = (clientY - rect.top) / rect.height;
  const stageLocalX = fracX * layoutWidth;
  const stageLocalY = fracY * layoutHeight;

  const scaleDelta = clamped - currentScale;
  const newPanX = current.panX + (layoutWidth / 2 - stageLocalX) * scaleDelta;
  const newPanY = current.panY + (layoutHeight / 2 - stageLocalY) * scaleDelta;

  // Phase 13-HF5: rAF-throttle zoom writes too. Mouse wheel + pinch
  // both call this function at high frequency.
  scheduleZoomUpdate(
    clampPanToBounds({ scale: clamped, panX: newPanX, panY: newPanY }),
    reason || `Board zoom -> ${Math.round(clamped * 100)}%`,
  );
  setPanCursorState();
}

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
        beginPolygonVertexDrag(syntheticEvent, touchGesture.primaryHitRoomId, touchGesture.primaryHitIndex);
      } else if (kind === "room-area" && touchGesture.primaryHitRoomId) {
        // Select the room first (so the polygon-area drag has context).
        state.selectedRoomId = touchGesture.primaryHitRoomId;
        state.selectedRoomByBoard[state.boardId] = touchGesture.primaryHitRoomId;
        syncPolygonRoomSelection(touchGesture.primaryHitRoomId);
        syncPolygonEditorPanel();
        syncRoomPanelFromSelection({ preserveDraftState: true });
        beginPendingPolygonAreaDrag(syntheticEvent, touchGesture.primaryHitRoomId);
        renderRoomOverlay();
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

polygonHandleSizeInput?.addEventListener("input", () => {
  const handleScale = clampPolygonHandleScale((Number(polygonHandleSizeInput.value) || 100) / 100);
  state.polygonEditor.handleScale = handleScale;
  syncPolygonHandleSizePanel();
  syncPolygonEditorStatus();
  syncShipPolygonEditorStatus();
  renderRoomOverlay();
  triggerFeedback.textContent = `Status: Polygon handle size (including Play Area) set to ${Math.round(handleScale * 100)}%`;
});

boardZoomFitButton.addEventListener("click", () => {
  endPanMode(null, { canceled: true });
  fitZoomToActiveSpecialRoom();
  setPanCursorState();
});

boardZoomResetButton.addEventListener("click", () => {
  updateCurrentBoardZoom(BOARD_ZOOM_DEFAULT, "Board zoom reset");
  endPanMode(null, { canceled: true });
  setPanCursorState();
});

polygonRoomSelect.addEventListener("change", () => {
  const roomId = polygonRoomSelect.value;
  syncPolygonRoomSelection(roomId);
  const zoom = getBoardZoom(state.boardId);
  const center = getRoomCenterForZoom(state.boardId, roomId);
  updateCurrentBoardZoom(computePanForZoomFocus(zoom.scale, center));
  syncRoomPanelFromSelection();
  syncPolygonEditorPanel();
  renderRoomOverlay();
  setPanCursorState();
});

showRoomVerticesInput?.addEventListener("change", () => {
  state.polygonEditor.roomVerticesVisible = showRoomVerticesInput.checked;
  if (!showRoomVerticesInput.checked) {
    if (state.polygonEditor.dragVertexIndex !== null) {
      finishPolygonVertexDrag(null, { cancel: true });
    }
    if (state.polygonEditor.dragAreaPointerId !== null) {
      finishPolygonAreaDrag(null, { cancel: true });
    }
  }
  syncPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = `Status: Room vertices ${showRoomVerticesInput.checked ? "shown" : "hidden"}`;
});

showPlayAreaVerticesInput?.addEventListener("change", () => {
  state.polygonEditor.playAreaVerticesVisible = showPlayAreaVerticesInput.checked;
  if (!showPlayAreaVerticesInput.checked && state.shipPolygonEditor.dragVertexIndex !== null) {
    finishShipPolygonVertexDrag(null, { cancel: true });
  }
  syncShipPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = `Status: Play Area vertices ${showPlayAreaVerticesInput.checked ? "shown" : "hidden"}`;
});

polygonVertexSelect.addEventListener("change", () => {
  if (!areRoomVerticesEditable()) {
    return;
  }
  state.polygonEditor.selectedVertexIndex = Math.max(0, Number(polygonVertexSelect.value) || 0);
  state.polygonEditor.selectedEdgeIndex = state.polygonEditor.selectedVertexIndex;
  state.polygonEditor.vertexSelectionActive = true;
  syncPolygonEdgeSelect(getActivePolygonRoomId(state.boardId));
  renderRoomOverlay();
  syncPolygonEditorStatus();
});

polygonEdgeSelect.addEventListener("change", () => {
  if (!areRoomVerticesEditable()) {
    return;
  }
  state.polygonEditor.selectedEdgeIndex = Math.max(0, Number(polygonEdgeSelect.value) || 0);
  renderRoomOverlay();
  syncPolygonEditorStatus();
});

polygonInsertVertexButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan active - polygon edit paused";
    return;
  }
  if (!areRoomVerticesEditable()) {
    triggerFeedback.textContent = "Status: Room vertices hidden - polygon edit paused";
    return;
  }
  const roomId = resolvePolygonEditingRoomId(state.boardId);
  if (!roomId) {
    triggerFeedback.textContent = "Status: No active room selected for polygon insert";
    return;
  }
  const points = getSpecialPolygonPoints(state.boardId, roomId);
  const index = Math.max(0, Math.min(points.length - 1, state.polygonEditor.selectedEdgeIndex));
  const nextIndex = (index + 1) % points.length;
  const a = points[index];
  const b = points[nextIndex];
  const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  points.splice(nextIndex, 0, normalizePolygonPoint(midpoint));
  setSpecialPolygonPoints(state.boardId, roomId, points);
  const persisted = persistBoardProfiles();
  state.polygonEditor.selectedEdgeIndex = index;
  state.polygonEditor.selectedVertexIndex = nextIndex;
  syncPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? "Status: Polygon vertex inserted"
    : "Status: Polygon vertex inserted (persistence failed)";
});

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

polygonDeleteVertexButton.addEventListener("click", () => {
  deleteSelectedPolygonVertex();
});

polygonResetRoomButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan active - polygon edit paused";
    return;
  }
  if (!areRoomVerticesEditable()) {
    triggerFeedback.textContent = "Status: Room vertices hidden - polygon edit paused";
    return;
  }
  const roomId = getActivePolygonRoomId(state.boardId);
  if (!roomId) {
    return;
  }
  const fallbackPolygon = getDefaultRoomPolygon(state.boardId, roomId);
  if (!fallbackPolygon) {
    triggerFeedback.textContent = "Status: No board default available for this room";
    return;
  }
  setSpecialPolygonPoints(state.boardId, roomId, fallbackPolygon);
  const persisted = persistBoardProfiles();
  state.polygonEditor.selectedVertexIndex = 0;
  syncPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? "Status: Room polygon reset to default"
    : "Status: Room polygon reset to default (persistence failed)";
});

polygonFocusRoomButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan active - polygon edit paused";
    return;
  }
  const roomId = getActivePolygonRoomId(state.boardId);
  if (!roomId) {
    return;
  }
  state.selectedRoomId = roomId;
  state.selectedRoomByBoard[state.boardId] = roomId;
  syncRoomPanelFromSelection();
  renderRoomOverlay();
  triggerFeedback.textContent = "Status: Special room focused in overlay";
});

playAreaSelect?.addEventListener("change", () => {
  setSelectedPlayAreaId(state.boardId, playAreaSelect.value);
  state.shipPolygonEditor.selectedVertexIndex = 0;
  state.shipPolygonEditor.selectedEdgeIndex = 0;
  state.shipPolygonsByBoard[state.boardId] = getShipPolygonPoints(state.boardId);
  persistBoardProfiles();
  syncShipPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = "Status: Active Play Area selected";
});

playAreaNameInput?.addEventListener("change", () => {
  const areas = getPlayAreas(state.boardId);
  const selectedId = getSelectedPlayAreaId(state.boardId);
  const nextName = String(playAreaNameInput.value || "").trim();
  const updated = areas.map((area) => (
    area.id === selectedId
      ? {
        ...area,
        name: nextName || area.name,
      }
      : area
  ));
  setPlayAreas(state.boardId, updated, { selectedPlayAreaId: selectedId });
  const persisted = persistBoardProfiles();
  syncShipPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? "Status: Play Area name updated"
    : "Status: Play Area name updated (persistence failed)";
});

playAreaCreateButton?.addEventListener("click", () => {
  const currentAreas = getPlayAreas(state.boardId);
  const nextIndex = currentAreas.length + 1;
  const baseId = normalizePlayAreaId(`play-area-${nextIndex}`, nextIndex - 1);
  const idCandidates = new Set(currentAreas.map((entry) => entry.id));
  let nextId = baseId;
  let suffix = 2;
  while (idCandidates.has(nextId)) {
    nextId = `${baseId}-${suffix}`;
    suffix += 1;
  }
  const template = getSelectedPlayArea(state.boardId)?.polygon ?? SHIP_POLYGON_DEFAULT;
  const nextArea = {
    id: nextId,
    name: `Play Area ${nextIndex}`,
    polygon: normalizeShipPolygon(template),
  };
  setPlayAreas(state.boardId, [...currentAreas, nextArea], { selectedPlayAreaId: nextId });
  state.shipPolygonEditor.selectedVertexIndex = 0;
  state.shipPolygonEditor.selectedEdgeIndex = 0;
  const persisted = persistBoardProfiles();
  syncShipPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? `Status: Created ${nextArea.name}`
    : `Status: Created ${nextArea.name} (persistence failed)`;
});

playAreaDeleteButton?.addEventListener("click", () => {
  const currentAreas = getPlayAreas(state.boardId);
  if (currentAreas.length <= 1) {
    triggerFeedback.textContent = "Status: At least one Play Area is required";
    return;
  }
  const selectedArea = getSelectedPlayArea(state.boardId);
  if (!selectedArea) {
    return;
  }
  const confirmed = window.confirm(`Delete ${selectedArea.name}? This removes its polygon.`);
  if (!confirmed) {
    return;
  }
  const remaining = currentAreas.filter((area) => area.id !== selectedArea.id);
  const fallbackSelectedId = remaining[0]?.id ?? "play-area-1";
  setPlayAreas(state.boardId, remaining, { selectedPlayAreaId: fallbackSelectedId });
  state.shipPolygonEditor.selectedVertexIndex = 0;
  state.shipPolygonEditor.selectedEdgeIndex = 0;
  const persisted = persistBoardProfiles();
  syncShipPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? `Status: Deleted ${selectedArea.name}`
    : `Status: Deleted ${selectedArea.name} (persistence failed)`;
});

shipPolygonVertexSelect.addEventListener("change", () => {
  if (!arePlayAreaVerticesEditable()) {
    return;
  }
  state.shipPolygonEditor.selectedVertexIndex = Math.max(0, Number(shipPolygonVertexSelect.value) || 0);
  state.shipPolygonEditor.selectedEdgeIndex = state.shipPolygonEditor.selectedVertexIndex;
  syncShipPolygonEdgeSelect();
  renderRoomOverlay();
  syncShipPolygonEditorStatus();
});

shipPolygonEdgeSelect.addEventListener("change", () => {
  if (!arePlayAreaVerticesEditable()) {
    return;
  }
  state.shipPolygonEditor.selectedEdgeIndex = Math.max(0, Number(shipPolygonEdgeSelect.value) || 0);
  renderRoomOverlay();
  syncShipPolygonEditorStatus();
});

shipPolygonInsertVertexButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan active - Play Area edit paused";
    return;
  }
  if (!arePlayAreaVerticesEditable()) {
    triggerFeedback.textContent = "Status: Play Area vertices hidden - polygon edit paused";
    return;
  }
  const points = getShipPolygonPoints(state.boardId);
  const index = Math.max(0, Math.min(points.length - 1, state.shipPolygonEditor.selectedEdgeIndex));
  const nextIndex = (index + 1) % points.length;
  const a = points[index];
  const b = points[nextIndex];
  const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  points.splice(nextIndex, 0, normalizePolygonPoint(midpoint));
  setShipPolygonPoints(state.boardId, points);
  const persisted = persistBoardProfiles();
  state.shipPolygonEditor.selectedEdgeIndex = index;
  state.shipPolygonEditor.selectedVertexIndex = nextIndex;
  syncShipPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? "Status: Play Area vertex inserted"
    : "Status: Play Area vertex inserted (persistence failed)";
});

shipPolygonDeleteVertexButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan active - Play Area edit paused";
    return;
  }
  if (!arePlayAreaVerticesEditable()) {
    triggerFeedback.textContent = "Status: Play Area vertices hidden - polygon edit paused";
    return;
  }
  const points = getShipPolygonPoints(state.boardId);
  if (points.length <= 3) {
    triggerFeedback.textContent = "Status: Play Area requires at least 3 vertices";
    return;
  }
  const index = Math.max(0, Math.min(points.length - 1, state.shipPolygonEditor.selectedVertexIndex));
  points.splice(index, 1);
  setShipPolygonPoints(state.boardId, points);
  const persisted = persistBoardProfiles();
  state.shipPolygonEditor.selectedVertexIndex = Math.max(0, Math.min(index, points.length - 1));
  state.shipPolygonEditor.selectedEdgeIndex = state.shipPolygonEditor.selectedVertexIndex;
  syncShipPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? "Status: Play Area vertex deleted"
    : "Status: Play Area vertex deleted (persistence failed)";
});

shipPolygonResetButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan active - Play Area edit paused";
    return;
  }
  if (!arePlayAreaVerticesEditable()) {
    triggerFeedback.textContent = "Status: Play Area vertices hidden - polygon edit paused";
    return;
  }
  setShipPolygonPoints(state.boardId, SHIP_POLYGON_DEFAULT);
  const persisted = persistBoardProfiles();
  state.shipPolygonEditor.selectedVertexIndex = 0;
  state.shipPolygonEditor.selectedEdgeIndex = 0;
  syncShipPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? "Status: Play Area polygon reset to default"
    : "Status: Play Area polygon reset to default (persistence failed)";
});

roomAnimationSettingsCreateButton?.addEventListener("click", () => {
  const profile = getRoomFxProfile(state.boardId);
  const definition = createRoomAnimationDefinition(roomAnimationSettingsNameInput?.value, profile.animations);
  const nextProfile = {
    ...profile,
    animations: [...profile.animations, definition],
    selectedAnimationId: definition.id,
  };
  setRoomFxProfile(state.boardId, nextProfile);
  const persisted = persistBoardProfiles();
  delete roomEditorDraftByBoard[state.boardId];
  if (roomAnimationSettingsNameInput) {
    roomAnimationSettingsNameInput.value = "";
  }
  syncRoomFxPanel();
  triggerFeedback.textContent = persisted
    ? `Status: Room animation ${definition.name} created`
    : `Status: Room animation ${definition.name} created (persistence failed)`;
});

roomAnimationSettingsSelect?.addEventListener("change", () => {
  const selectedAnimationId = normalizeRoomAnimationId(roomAnimationSettingsSelect.value);
  const profile = getRoomFxProfile(state.boardId);
  setRoomFxProfile(state.boardId, {
    ...profile,
    selectedAnimationId,
  });
  const persisted = persistBoardProfiles();
  delete roomEditorDraftByBoard[state.boardId];
  syncRoomFxPanel();
  triggerFeedback.textContent = persisted
    ? "Status: Room animation selection updated"
    : "Status: Room animation selection updated (persistence failed)";
});

roomAnimationSettingsDeleteButton?.addEventListener("click", () => {
  const profile = getRoomFxProfile(state.boardId);
  if (profile.animations.length <= 1) {
    triggerFeedback.textContent = "Status: Keep at least one room animation definition";
    return;
  }
  const selectedId = normalizeRoomAnimationId(profile.selectedAnimationId, profile.animations[0]?.id ?? "kaputt");
  const selectedDefinition = profile.animations.find((entry) => entry.id === selectedId) ?? profile.animations[0];
  const nextAnimations = profile.animations.filter((entry) => entry.id !== selectedDefinition.id);
  const nextSelected = nextAnimations[0]?.id ?? "kaputt";
  setRoomFxProfile(state.boardId, {
    ...profile,
    animations: nextAnimations,
    selectedAnimationId: nextSelected,
  });
  if (state.roomDraft.animationId === selectedDefinition.id) {
    state.roomDraft.animationId = nextSelected;
  }
  delete roomEditorDraftByBoard[state.boardId];
  const persisted = persistBoardProfiles();
  syncRoomFxPanel();
  triggerFeedback.textContent = persisted
    ? `Status: Room animation ${selectedDefinition.name} deleted`
    : `Status: Room animation ${selectedDefinition.name} deleted (persistence failed)`;
});

roomAssetTypeInput?.addEventListener("change", () => {
  const assetType = normalizeRoomAssetType(roomAssetTypeInput.value);
  const currentAssetRef = String(roomAssetRefInput?.value || "").trim();
  const normalizedAssetRef = normalizeRoomAssetRefForType(assetType, currentAssetRef);
  setRoomEditorDraft(state.boardId, {
    assetType,
    assetRef: normalizedAssetRef,
  });
  if (roomAssetRefInput) {
    roomAssetRefInput.value = normalizedAssetRef;
  }
  syncRoomResourcePicker(assetType, normalizedAssetRef);
  triggerFeedback.textContent = "Status: Room draft updated - apply changes to commit";
});

roomAssetRefInput?.addEventListener("change", () => {
  const assetType = normalizeRoomAssetType(roomAssetTypeInput?.value);
  const assetRef = normalizeRoomAssetRefForType(assetType, String(roomAssetRefInput.value || "").trim());
  roomAssetRefInput.value = assetRef;
  setRoomEditorDraft(state.boardId, { assetRef });
  syncRoomResourcePicker(assetType, assetRef);
  triggerFeedback.textContent = "Status: Room draft updated - apply changes to commit";
});

roomAssetRefInput?.addEventListener("input", () => {
  const assetType = normalizeRoomAssetType(roomAssetTypeInput?.value);
  const assetRef = normalizeRoomAssetRefForType(assetType, String(roomAssetRefInput.value || "").trim());
  setRoomEditorDraft(state.boardId, { assetRef });
  syncRoomResourcePicker(assetType, assetRef);
});

roomResourceSelect?.addEventListener("change", () => {
  const selectedAsset = String(roomResourceSelect.value || "").trim();
  if (!selectedAsset) {
    return;
  }
  if (roomAssetRefInput) {
    roomAssetRefInput.value = selectedAsset;
  }
  setRoomEditorDraft(state.boardId, { assetRef: selectedAsset });
  triggerFeedback.textContent = "Status: Room draft updated - apply changes to commit";
});

roomApplyChangesButton?.addEventListener("click", () => {
  const draft = collectRoomEditorDraftFromInputs(state.boardId);
  if (!draft) {
    triggerFeedback.textContent = "Status: Room apply failed - no animation selected";
    return;
  }
  const profile = getRoomFxProfile(state.boardId);
  const selectedDefinition = profile.animations.find((entry) => entry.id === profile.selectedAnimationId) ?? profile.animations[0];
  const nextProfile = normalizeRoomFxProfile({
    ...profile,
    animations: profile.animations.map((entry) => (entry.id === selectedDefinition.id
      ? {
        ...entry,
        assetType: draft.assetType,
        assetRef: draft.assetRef,
      }
      : entry)),
  });
  setRoomFxProfile(state.boardId, nextProfile);
  const persisted = persistBoardProfiles();
  syncRoomFxPanel();
  triggerFeedback.textContent = persisted
    ? "Status: Room changes applied"
    : "Status: Room changes applied (persistence failed)";
});

insideAnimationCreateButton?.addEventListener("click", () => {
  const profile = getInsideFxProfile(state.boardId);
  const definition = createInsideAnimationDefinition(insideAnimationNameInput?.value, profile.animations);
  const nextProfile = {
    ...profile,
    animations: [...profile.animations, definition],
    selectedAnimationId: definition.id,
  };
  setInsideFxProfile(state.boardId, nextProfile);
  const persisted = persistBoardProfiles();
  syncInsideFxPanel();
  renderRunningAnimationsList();
  refreshGlobalButtons();
  if (insideAnimationNameInput) {
    insideAnimationNameInput.value = "";
  }
  delete insideEditorDraftByBoard[state.boardId];
  triggerFeedback.textContent = persisted
    ? `Status: Inside animation ${definition.name} created`
    : `Status: Inside animation ${definition.name} created (persistence failed)`;
});

insideAnimationSelect?.addEventListener("change", () => {
  const selectedAnimationId = normalizeInsideAnimationId(insideAnimationSelect.value);
  const profile = getInsideFxProfile(state.boardId);
  setInsideFxProfile(state.boardId, {
    ...profile,
    selectedAnimationId,
  });
  const persisted = persistBoardProfiles();
  delete insideEditorDraftByBoard[state.boardId];
  syncInsideFxPanel();
  triggerFeedback.textContent = persisted
    ? "Status: Inside animation selection updated"
    : "Status: Inside animation selection updated (persistence failed)";
});

insideIntensityInput?.addEventListener("input", () => {
  const intensity = clampOutsideIntensity(insideIntensityInput.value);
  setInsideEditorDraft(state.boardId, { intensity });
  insideIntensityValue.textContent = intensity.toFixed(2);
});

insideSpeedInput?.addEventListener("input", () => {
  const speed = clampOutsideSpeed(insideSpeedInput.value);
  setInsideEditorDraft(state.boardId, { speed });
  insideSpeedValue.textContent = `${speed.toFixed(2)}x`;
});

insideAssetTypeInput?.addEventListener("change", () => {
  const assetType = normalizeInsideAssetType(insideAssetTypeInput.value);
  const currentAssetRef = String(insideAssetRefInput?.value || "").trim();
  const normalizedAssetRef = normalizeInsideAssetRefForType(assetType, currentAssetRef);
  setInsideEditorDraft(state.boardId, {
    assetType,
    assetRef: normalizedAssetRef,
  });
  if (insideAssetRefInput) {
    insideAssetRefInput.value = normalizedAssetRef;
  }
  syncInsideResourcePicker(assetType, normalizedAssetRef);
  triggerFeedback.textContent = "Status: Inside draft updated - apply changes to commit";
});

insideAssetRefInput?.addEventListener("change", () => {
  const assetType = normalizeInsideAssetType(insideAssetTypeInput?.value);
  const assetRef = normalizeInsideAssetRefForType(assetType, String(insideAssetRefInput.value || "").trim());
  insideAssetRefInput.value = assetRef;
  setInsideEditorDraft(state.boardId, { assetRef });
  syncInsideResourcePicker(assetType, assetRef);
  triggerFeedback.textContent = "Status: Inside draft updated - apply changes to commit";
});

insideLoopUntilStopInput?.addEventListener("change", () => {
  setInsideEditorDraft(state.boardId, {
    loopUntilStopped: Boolean(insideLoopUntilStopInput.checked),
  });
  triggerFeedback.textContent = "Status: Inside draft updated - apply changes to commit";
});

insideApplyChangesButton?.addEventListener("click", () => {
  const draft = collectInsideEditorDraftFromInputs(state.boardId);
  if (!draft) {
    triggerFeedback.textContent = "Status: Inside apply failed - no animation selected";
    return;
  }
  const nextProfile = buildInsideProfileWithSelectedAnimationPatch(state.boardId, {
    intensity: draft.intensity,
    speed: draft.speed,
    assetType: draft.assetType,
    assetRef: draft.assetRef,
    loopUntilStopped: Boolean(draft.loopUntilStopped),
  });
  setInsideFxProfile(state.boardId, nextProfile);
  const persisted = persistBoardProfiles();
  syncInsideFxPanel();
  triggerFeedback.textContent = persisted
    ? "Status: Inside changes applied"
    : "Status: Inside changes applied (persistence failed)";
});

outsideEnabledInput.addEventListener("change", () => {
  if (outputRole === OUTPUT_ROLE_CONTROL) {
    const nextProfile = {
      ...getOutsideFxProfile(state.boardId),
      enabled: Boolean(outsideEnabledInput.checked),
    };
    void emitLiveMutation("outside-update", {
      outsideBoardId: state.boardId,
      reason: "outside-enabled-toggle",
      outsideFx: nextProfile,
      outsideFxByBoard: {
        [state.boardId]: nextProfile,
      },
    }).then(() => {
      triggerFeedback.textContent = `Pending: Outside Space ${outsideEnabledInput.checked ? "enabled" : "disabled"} (waiting for snapshot)`;
    }).catch(() => {
      triggerFeedback.textContent = "Status: Outside toggle command failed";
      syncOutsideFxPanel();
    });
    return;
  }
  updateOutsideFxProfile(state.boardId, { enabled: outsideEnabledInput.checked });
  const persisted = persistBoardProfiles();
  syncOutsideRuntimeMirror(state.boardId);
  syncOutsideFxPanel();
  renderRunningAnimationsList();
  refreshGlobalButtons();
  emitOutsideFxMutation(state.boardId, "outside-enabled-toggle");
  triggerFeedback.textContent = persisted
    ? `Status: Outside Space ${outsideEnabledInput.checked ? "enabled" : "disabled"}`
    : `Status: Outside Space ${outsideEnabledInput.checked ? "enabled" : "disabled"} (persistence failed)`;
});

outsideAnimationCreateButton?.addEventListener("click", () => {
  const profile = getOutsideFxProfile(state.boardId);
  const definition = createOutsideAnimationDefinition(outsideAnimationNameInput?.value, profile.animations);
  const nextAnimations = [...profile.animations, definition];
  const nextProfile = {
    ...profile,
    animations: nextAnimations,
    selectedAnimationId: definition.id,
  };
  if (outputRole === OUTPUT_ROLE_CONTROL) {
    void emitLiveMutation("outside-update", {
      outsideBoardId: state.boardId,
      reason: "outside-animation-create",
      outsideFx: nextProfile,
      outsideFxByBoard: {
        [state.boardId]: nextProfile,
      },
    }).then(() => {
      if (outsideAnimationNameInput) {
        outsideAnimationNameInput.value = "";
      }
      triggerFeedback.textContent = `Pending: Outside animation ${definition.name} created (waiting for snapshot)`;
    }).catch(() => {
      triggerFeedback.textContent = "Status: Outside animation create command failed";
    });
    return;
  }
  updateOutsideFxProfile(state.boardId, {
    animations: nextAnimations,
    selectedAnimationId: definition.id,
  });
  const persisted = persistBoardProfiles();
  syncOutsideFxPanel();
  emitOutsideFxMutation(state.boardId, "outside-animation-create");
  if (outsideAnimationNameInput) {
    outsideAnimationNameInput.value = "";
  }
  triggerFeedback.textContent = persisted
    ? `Status: Outside animation ${definition.name} created`
    : `Status: Outside animation ${definition.name} created (persistence failed)`;
});

outsideAnimationSelect?.addEventListener("change", () => {
  const selectedAnimationId = normalizeOutsideAnimationId(outsideAnimationSelect.value);
  if (outputRole === OUTPUT_ROLE_CONTROL) {
    const nextProfile = {
      ...getOutsideFxProfile(state.boardId),
      selectedAnimationId,
    };
    void emitLiveMutation("outside-update", {
      outsideBoardId: state.boardId,
      reason: "outside-animation-select",
      outsideFx: nextProfile,
      outsideFxByBoard: {
        [state.boardId]: nextProfile,
      },
    }).then(() => {
      triggerFeedback.textContent = "Pending: Outside animation selection command accepted (waiting for snapshot)";
    }).catch(() => {
      triggerFeedback.textContent = "Status: Outside animation selection command failed";
      syncOutsideFxPanel();
    });
    return;
  }
  updateOutsideFxProfile(state.boardId, { selectedAnimationId });
  const persisted = persistBoardProfiles();
  syncOutsideFxPanel();
  emitOutsideFxMutation(state.boardId, "outside-animation-select");
  triggerFeedback.textContent = persisted
    ? "Status: Outside animation selection updated"
    : "Status: Outside animation selection updated (persistence failed)";
});

outsideIntensityInput.addEventListener("input", () => {
  const intensity = clampOutsideIntensity(outsideIntensityInput.value);
  setOutsideEditorDraft(state.boardId, { intensity });
  outsideIntensityValue.textContent = intensity.toFixed(2);
});

outsideSpeedInput.addEventListener("input", () => {
  const speed = clampOutsideSpeed(outsideSpeedInput.value);
  setOutsideEditorDraft(state.boardId, { speed });
  outsideSpeedValue.textContent = `${speed.toFixed(2)}x`;
});

outsideModeInput.addEventListener("change", () => {
  if (outsideModeInput.disabled) {
    return;
  }
  setOutsideEditorDraft(state.boardId, { mode: normalizeOutsideMode(outsideModeInput.value) });
  triggerFeedback.textContent = "Status: Outside draft updated - apply changes to commit";
});

outsideDirectionInput.addEventListener("change", () => {
  if (outsideDirectionInput.disabled) {
    return;
  }
  setOutsideEditorDraft(state.boardId, {
    direction: normalizeOutsideDirection(outsideDirectionInput.value),
  });
  triggerFeedback.textContent = "Status: Outside draft updated - apply changes to commit";
});

outsideAssetTypeInput?.addEventListener("change", () => {
  syncOutsideDraftVisibilityFromInputs(state.boardId);
  triggerFeedback.textContent = "Status: Outside draft updated - apply changes to commit";
});

outsideAssetRefInput?.addEventListener("change", () => {
  syncOutsideDraftVisibilityFromInputs(state.boardId);
  triggerFeedback.textContent = "Status: Outside draft updated - apply changes to commit";
});

outsideAssetRefInput?.addEventListener("input", () => {
  syncOutsideDraftVisibilityFromInputs(state.boardId);
  triggerFeedback.textContent = "Status: Outside draft updated - apply changes to commit";
});

outsideApplyChangesButton?.addEventListener("click", () => {
  const draft = collectOutsideEditorDraftFromInputs(state.boardId);
  if (!draft) {
    triggerFeedback.textContent = "Status: Outside apply failed - no animation selected";
    return;
  }
  const nextProfile = buildOutsideProfileWithSelectedAnimationPatch(state.boardId, {
    intensity: draft.intensity,
    speed: draft.speed,
    mode: draft.mode,
    direction: draft.direction,
    assetType: draft.assetType,
    assetRef: draft.assetRef,
  });
  if (outputRole === OUTPUT_ROLE_CONTROL) {
    void emitLiveMutation("outside-update", {
      outsideBoardId: state.boardId,
      reason: "outside-apply-changes",
      outsideFx: nextProfile,
      outsideFxByBoard: {
        [state.boardId]: nextProfile,
      },
    }).then(() => {
      triggerFeedback.textContent = "Pending: Outside changes applied atomically (waiting for snapshot)";
    }).catch(() => {
      triggerFeedback.textContent = "Status: Outside apply command failed";
      syncOutsideFxPanel();
    });
    return;
  }
  setOutsideFxProfile(state.boardId, nextProfile);
  const persisted = persistBoardProfiles();
  syncOutsideFxPanel();
  emitOutsideFxMutation(state.boardId, "outside-apply-changes");
  triggerFeedback.textContent = persisted
    ? "Status: Outside changes applied"
    : "Status: Outside changes applied (persistence failed)";
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
    const [x, y] = getNormalizedOverlayPoint(event);
    points[state.shipPolygonEditor.dragVertexIndex] = [x, y];
    setShipPolygonPoints(boardId, points);
    state.shipPolygonEditor.dragMoved = true;
    renderRoomOverlay();
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
    renderRoomOverlay();
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
  const points = getSpecialPolygonPoints(boardId, roomId);
  const [x, y] = getNormalizedOverlayPoint(event);
  points[state.polygonEditor.dragVertexIndex] = [x, y];
  setSpecialPolygonPoints(boardId, roomId, points);
  state.polygonEditor.dragMoved = true;
  renderRoomOverlay();
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
