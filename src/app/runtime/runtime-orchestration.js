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

// Phase 14-2 reorg fix: polygon normalizers module needs to be pulled
// into orchestration scope explicitly — orchestration call sites
// reference `normalizeSpecialPolygon` / `isValidSpecialPolygon` both
// directly (object-shorthand at line ~821) and inside ctx-arrow
// wrappers. Without this destructure the direct shorthand throws
// `ReferenceError: normalizeSpecialPolygon is not defined` during
// module-load wiring, which blocks the rest of orchestration from
// binding event handlers.
const {
  normalizePolygonPoint,
  getNormalizedPolygonArea,
  isRenderableNormalizedPolygon,
  normalizeSpecialPolygon,
  isValidSpecialPolygon,
} = window.TT_BEAMER_RUNTIME_POLYGON_NORMALIZERS;

const {
  stage, boardImage, canvas, roomOverlay, boardSelect, boardImportFileInput,
  boardImportImageInput, boardImportNameInput, boardImportIdInput, boardImportButton,
  boardStatus, zonesStatus, alignModeToggleInput, alignModeButton, alignModeStatus,
  exportGlobalDefaultsButton, globalDefaultsStatus, apiDiagnoseStatus, triggerFeedback,
  stopAllButton, stopAllIncludeDefaultsCheckbox, roomSelected, roomTargetSelect, roomAnimationSelect, roomColorPicker,
  roomColorPickerLabel, roomAnimationSettingsSelect, roomAnimationSettingsNameInput,
  roomAnimationSettingsCreateButton, roomAnimationSettingsDeleteButton,
  roomAssetTypeInput, roomAssetRefInput, roomResourceSelect, roomSoundRefSelect,
  roomTransformDetails, roomRotationDegInput, roomRotationDegValue,
  roomStretchToPolygonInput, roomWidthScaleInput, roomWidthScaleValue,
  roomHeightScaleInput, roomHeightScaleValue, roomOffsetXScaleInput,
  roomOffsetXScaleValue, roomOffsetYScaleInput, roomOffsetYScaleValue,
  roomApplyChangesButton,
  roomDefOpacityInput, roomDefOpacityValue, roomDefIntensityInput, roomDefIntensityValue,
  roomDefSpeedInput, roomDefSpeedValue, roomDefSoundVolumeInput, roomDefSoundVolumeValue,
  roomOpacityInput, roomOpacityValue, roomIntensityInput, roomIntensityValue,
  roomSpeedInput, roomSpeedValue, roomSoundVolumeInput, roomSoundVolumeValue,
  roomDurationInput, roomStaggerStartInput, roomStaggerOffsetInput, roomStaggerOffsetValue,
  startRoomAnimationButton, runningAnimationsList,
  liveEditorPanel, liveEditorTitle, liveEditorClose,
  liveEditorOpacity, liveEditorOpacityValue, liveEditorIntensity, liveEditorIntensityValue,
  liveEditorSpeed, liveEditorSpeedValue, liveEditorSoundVolume, liveEditorSoundVolumeValue,
  liveEditorTransform, liveEditorRotation, liveEditorRotationValue,
  liveEditorStretch, liveEditorWidth, liveEditorWidthValue,
  liveEditorHeight, liveEditorHeightValue, liveEditorOffsetX, liveEditorOffsetXValue,
  liveEditorOffsetY, liveEditorOffsetYValue, liveEditorDiscard, liveEditorDefault, dashboardDefaultAnimation,
  audioEnabledInput, audioVolumeInput,
  audioVolumeValue, audioStatus, audioMappingAnimationSelect, audioMappingSoundSelect,
  audioMappingStatus, animationSpeedInput, animationSpeedValue, animationSpeedStatus,
  hitareaOffsetXInput, hitareaOffsetXValue, hitareaOffsetYInput, hitareaOffsetYValue,
  hitareaScaleInput, hitareaScaleValue, hitareaSaveButton, hitareaResetButton, hitareaStatus,
  roomGeometryModeInput, roomGeometryXInput, roomGeometryXValue, roomGeometryYInput,
  roomGeometryYValue, roomGeometryStretchXInput, roomGeometryStretchXValue,
  roomGeometryStretchYInput, roomGeometryStretchYValue, roomGeometryStatus,
  openDashboardViewButton, openSettingsViewButton, openTriggerZoneButton, openManageZoneButton,
  mobileStartRoomButton, mobileLayoutStatus, quickModePanel, quickAnimationPicker, quickModeStatus,
  quickModeOffButton, quickModeActivateButton, quickModeDeactivateButton, quickModeClearButton,
  controlPanel, projectionArea, primaryViewSwitch, dashboardStickyShell, mobileZoneSwitch,
  runningOverviewPanel, globalAnimationPanel, runMobilePerformanceCheckButton, mobilePerformanceStatus,
  mp4PerformanceTierInput, mp4RenderCapInput, mp4RenderCapValue, mp4QualityFloorInput,
  mp4QualityFloorValue, mp4DegradeThresholdInput, mp4DegradeThresholdValue,
  mp4RecoverThresholdInput, mp4RecoverThresholdValue, mp4PerformanceStatus, toastStack,
  polygonRoomSelect, showRoomVerticesInput, polygonVertexSelect, polygonEdgeSelect,
  polygonInsertVertexButton, polygonDeleteVertexButton, polygonResetRoomButton,
  polygonFocusRoomButton, polygonEditorStatus, roomNameInput, roomCreateShapeSelect,
  roomCreateButton, roomDeleteButton, roomManagementStatus, roomFrozenCheckbox,
  clusterSelect, clusterNameInput,
  clusterRoomIdsSelect, clusterCreateButton, clusterSaveButton, clusterDeleteButton,
  clusterManagementStatus, roomRenameInput, polygonUndoButton, polygonRedoButton,
  showPlayAreaVerticesInput, playAreaSelect,
  playAreaNameInput, playAreaCreateButton, playAreaDeleteButton, shipPolygonVertexSelect,
  shipPolygonEdgeSelect, shipPolygonInsertVertexButton, shipPolygonDeleteVertexButton,
  shipPolygonResetButton, shipPolygonEditorStatus, outsideAnimationSelect,
  outsideAnimationNameInput, outsideAnimationCreateButton, outsideEnabledInput,
  outsideIntensityInput, outsideIntensityValue, outsideSpeedInput, outsideSpeedValue,
  outsideModeInput, outsideDirectionInput, outsideAssetTypeInput, outsideAssetRefInput,
  outsideResourceSelect, outsideSoundRefSelect, outsideApplyChangesButton, insideAnimationSelect,
  insideAnimationNameInput, insideAnimationCreateButton, insideIntensityInput,
  insideIntensityValue, insideSpeedInput, insideSpeedValue, insideAssetTypeInput,
  insideAssetRefInput, insideResourceSelect, insideSoundRefSelect, insideLoopUntilStopInput, insideApplyChangesButton,
  insideGlobalButtons, dashboardGlobalLoopUntilStopInput, dashboardGlobalPlaySoundInput,
  dashboardTransformOptions, dashboardRotationDegInput, dashboardRotationDegValue,
  dashboardStretchToPolygonInput, dashboardWidthScaleInput, dashboardWidthScaleValue,
  dashboardHeightScaleInput, dashboardHeightScaleValue, dashboardOffsetXScaleInput,
  dashboardOffsetXScaleValue, dashboardOffsetYScaleInput, dashboardOffsetYScaleValue,
  polygonHandleSizeInput, polygonHandleSizeValue, boardZoomFitButton, boardZoomResetButton,
  boardZoomStatus, boardPanStatus, settingsSubtabStatus,
  dashboardViewGroups, settingsViewGroups, dashboardZoneGroups, settingsSubtabButtons,
  settingsTabbedSections,
} = window.TT_BEAMER_RUNTIME_DOM_REFS.collectDomRefs();

const outsideModeField = outsideModeInput?.closest("label") ?? null;
const outsideDirectionField = outsideDirectionInput?.closest("label") ?? null;
const outsideModeFieldMount = createConditionalFieldMountSlot(outsideModeField, "outside-mode");
const outsideDirectionFieldMount = createConditionalFieldMountSlot(outsideDirectionField, "outside-direction");
const outsideAnimationsPanel = outsideApplyChangesButton?.closest("section") ?? null;
const SETTINGS_SUBTAB_STORAGE_KEY = "tt-beamer.settings-subtab.v1";
const SETTINGS_SUBTAB_LABELS = {
  board: "Board",
  animations: "Animations",
  system: "System",
};

const SETTINGS_EXCLUSIVE_CONTROL_IDS = [
  "board-select",
  "board-import-file",
  "board-import-image",
  "board-import-name",
  "board-import-button",
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
  "polygon-handle-size",
  "board-zoom-fit",
  "board-zoom-reset",
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
  "inside-animation-select",
  "inside-animation-name",
  "inside-animation-create",
  "inside-intensity",
  "inside-speed",
  "inside-asset-type",
  "inside-asset-ref",
  "inside-resource-select",
  "inside-loop-until-stop",
  "room-animation-settings-select",
  "room-animation-settings-name",
  "room-animation-settings-create",
  "room-animation-settings-delete",
  "room-asset-type",
  "room-asset-ref",
  "room-resource-select",
];

// Phase 14-2: stage viewport cluster (applyOutputRoleViewContract,
// syncAlignModePanel, setAlignMode, collectStageViewportMetrics,
// getCanonicalViewportRect, mapClientPointToNormalized,
// mapNormalizedPointToPixels, applyStageViewportRecompute,
// runStageViewportLifecycle, scheduleStageViewportLifecycle,
// handleDevicePixelRatioChange, bindDevicePixelRatioWatcher) moved to
// src/app/runtime/runtime-stage-viewport.js.
const ctx = canvas.getContext("2d");

window.TT_BEAMER_RUNTIME_STAGE_VIEWPORT.init({
  canvas,
  stage,
  projectionArea,
  roomOverlay,
  boardImage,
  controlPanel,
  triggerFeedback,
  alignModeToggleInput,
  alignModeButton,
  alignModeStatus,
  outputRole,
  OUTPUT_ROLE_FINAL,
  OUTPUT_ROLE_CONTROL,
  get state() { return state; },
  clampRoomAbsoluteCoordinate: (v) => clampRoomAbsoluteCoordinate(v),
  emitLiveMutation: (type, payload) => emitLiveMutation(type, payload),
  renderRoomOverlay: () => renderRoomOverlay(),
  onAlignModeChanged: (enabled) => {
    // Phase 19-2: projection mapping align mode integration
    if (typeof onProjectionAlignModeChange === "function") {
      onProjectionAlignModeChange(enabled);
    }
  },
  getBoardZoom: (boardId) => getBoardZoom(boardId),
  updateCurrentBoardZoom: (zoom, reason) => updateCurrentBoardZoom(zoom, reason),
  setPanCursorState: () => setPanCursorState(),
  syncDashboardZoneVisibility: () => syncDashboardZoneVisibility(),
  syncMobileStickyOffsets: () => syncMobileStickyOffsets(),
  updateMobilePerformanceStatus: () => updateMobilePerformanceStatus(),
  validateViewExclusivity: (view, opts) => validateViewExclusivity(view, opts),
  validateViewNavigationVisibility: (opts) => validateViewNavigationVisibility(opts),
  runMobileProjectionVisibilityGuard: (opts) => runMobileProjectionVisibilityGuard(opts),
  runLayoutScrollRegression: () => runLayoutScrollRegression(),
  runNavigationStateRegression: () => runNavigationStateRegression(),
});
const {
  applyOutputRoleViewContract,
  syncAlignModePanel,
  setAlignMode,
  collectStageViewportMetrics,
  getCanonicalViewportRect,
  mapClientPointToNormalized,
  mapNormalizedPointToPixels,
  applyStageViewportRecompute,
  runStageViewportLifecycle,
  scheduleStageViewportLifecycle,
  handleDevicePixelRatioChange,
  bindDevicePixelRatioWatcher,
} = window.TT_BEAMER_RUNTIME_STAGE_VIEWPORT;

// Phase 19-2: projection mapping — 4-corner warp for /output.
window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING.init({
  stage,
  outputRole,
  OUTPUT_ROLE_FINAL,
  OUTPUT_ROLE_CONTROL,
  renderRoomOverlay: () => { try { renderRoomOverlay(); } catch { /* not ready yet */ } },
  // Current board for server-side profile scoping
  getBoardId: () => state?.boardId ?? null,
  saveProjectionMapping: () => {
    // Phase 19-2: persist projection corners via the existing global-defaults
    // save pipeline. buildPersistedRuntimeSettingsFromState() already includes
    // projectionMapping from the module, so a normal save captures everything.
    try {
      saveGlobalDefaultsToServer().catch(() => {});
    } catch { /* best-effort — saveGlobalDefaultsToServer may not be ready yet */ }
  },
});
const {
  applyTransform: applyProjectionTransform,
  showHandles: showProjectionHandles,
  hideHandles: hideProjectionHandles,
  loadCornersFromConfig: loadProjectionCornersFromConfig,
  getCornersForPersistence: getProjectionCornersForPersistence,
  resetCorners: resetProjectionCorners,
  onAlignModeChange: onProjectionAlignModeChange,
  onWindowResize: onProjectionWindowResize,
  // Phase 19-4: post-draw mesh warp (replaces begin/end grid warp)
  postDrawMeshWarp: projectionPostDrawMeshWarp,
  remapPoint: projectionRemapPoint,
  hasGridDisplacements: projectionHasGridDisplacements,
} = window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING;

const state = window.TT_BEAMER_STATE.createInitialState({
  defaultBoardId: BOARDS[0]?.id ?? "",
  defaultRoomAnimationId: createDefaultRoomAnimationDefinitions()[0]?.id ?? ROOM_ANIMATIONS[0]?.id ?? "kaputt",
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
  off: "Select",
  activate: "Start",
  deactivate: "Stop",
  clear: "Clear",
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

// Phase 14-2: global trigger revision + one-shot replay tracking
// moved to src/app/runtime/runtime-global-trigger-tracker.js.
window.TT_BEAMER_RUNTIME_GLOBAL_TRIGGER_TRACKER.init({
  liveSync,
  isFiniteDurationGlobalAnimation: (a) => isFiniteDurationGlobalAnimation(a),
  shouldSuppressTerminalOneShotReplay: (a) => shouldSuppressTerminalOneShotReplay(a),
  getGlobalTriggerKey: (a) => getGlobalTriggerKey(a),
  getAnimationStartedAtEpochMs: (a) => getAnimationStartedAtEpochMs(a),
});
const {
  replayPendingLiveMutations,
  getGlobalTriggerRevision,
  observeGlobalStopRevisions,
  observeGlobalClearRevision,
  buildSeenOneShotRunRevisionKey,
  rememberSeenOneShotRun,
  retainActiveSeenOneShotRuns,
  primeGlobalTriggerRuntimeTimestamps,
} = window.TT_BEAMER_RUNTIME_GLOBAL_TRIGGER_TRACKER;

// Phase 14-2: snapshot builder + polling scheduler + toast/error
// + canonical-polygon issue helpers moved to
// src/app/runtime/runtime-snapshot-helpers.js.
window.TT_BEAMER_RUNTIME_SNAPSHOT_HELPERS.init({
  state,
  liveSync,
  polygonContract,
  triggerFeedback,
  toastStack,
  outputRole,
  OUTPUT_ROLE_FINAL,
  SHIP_POLYGON_DEFAULT,
  TOAST_DEFAULT_TIMEOUT_MS,
  TOAST_DEDUPE_COOLDOWN_MS,
  TOAST_MAX_ENTRIES,
  LIVE_POLL_FAST_MS,
  LIVE_POLL_IDLE_MS,
  getBoards: () => BOARDS,
  normalizeInsideFxProfile: (profile) => normalizeInsideFxProfile(profile),
  normalizeOutsideFxProfile: (profile) => normalizeOutsideFxProfile(profile),
  normalizeRoomFxProfile: (profile) => normalizeRoomFxProfile(profile),
  getAnimationStartedAtEpochMs: (a) => getAnimationStartedAtEpochMs(a),
  getMp4PerformanceControls: () => getMp4PerformanceControls(),
  isHeavyInteractionActive: () => isHeavyInteractionActive(),
  pollLiveSnapshotOnce: () => pollLiveSnapshotOnce(),
  recordMutationTrace: (id, stage) => recordMutationTrace(id, stage),
});
const {
  buildRuntimeSnapshotForLiveSync,
  getAdaptivePollingIntervalMs,
  scheduleNextLiveSnapshotPoll,
  showToast,
  reportActionError,
  collectCanonicalPlayAreaIssuesFromProfiles,
  reportCanonicalPolygonIssues,
  normalizeSnapshotEnvelope,
  resolvePendingMutationsByVersion,
} = window.TT_BEAMER_RUNTIME_SNAPSHOT_HELPERS;

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
  shouldSuppressBroadcastReapply: () => shouldSuppressBroadcastReapply(),
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

// Phase 14-2: polygon metrics + global animation helpers moved to
// src/app/runtime/runtime-polygon-metrics.js.
window.TT_BEAMER_RUNTIME_POLYGON_METRICS.init({
  state,
  GLOBAL_ANIMATIONS,
  SOUND_MAPPING_NONE,
  getGlobalAnimationCategoryFromModule,
  getGlobalCategoryRuntimeLabelFromModule,
  normalizeAnimationSoundPath,
  cloneRoomBoard,
});
const {
  getGlobalAnimationCategory,
  getGlobalCategoryRuntimeLabel,
  getMappedSoundPathForAnimation,
  cloneBoardEntry,
  clampRoomStretch,
  clampPolygonHandleScale,
  getCurrentPolygonHandleScale,
  getCoarsePointerHitMultiplier,
  getPolygonEditorHandleMetrics,
} = window.TT_BEAMER_RUNTIME_POLYGON_METRICS;

// Phase 14-2: animation factory + flickerNoise + hitarea/geometry
// update helpers moved to src/app/runtime/runtime-animation-factory.js.
window.TT_BEAMER_RUNTIME_ANIMATION_FACTORY.init({
  state,
  hitareaStatus,
  triggerFeedback,
  clampRoomSpeed: (v) => clampRoomSpeed(v),
  clampRoomOpacity: (v) => clampRoomOpacity(v),
  clampRoomSoundVolume: (v) => clampRoomSoundVolume(v),
  setHitareaCalibration: (boardId, calibration) => setHitareaCalibration(boardId, calibration),
  getHitareaCalibration: (boardId) => getHitareaCalibration(boardId),
  syncHitareaCalibrationPanel: () => syncHitareaCalibrationPanel(),
  renderRoomOverlay: () => renderRoomOverlay(),
  getSelectedRoom: () => getSelectedRoom(),
  updateRoomGeometry: (boardId, roomId, partial) => updateRoomGeometry(boardId, roomId, partial),
  persistBoardProfiles: () => persistBoardProfiles(),
  syncRoomGeometryPanel: () => syncRoomGeometryPanel(),
});
const {
  createAnimation,
  flickerNoise,
  updateActiveBoardHitareaCalibration,
  updateSelectedRoomGeometry,
} = window.TT_BEAMER_RUNTIME_ANIMATION_FACTORY;

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
const BOARD_ZOOM_SCALE_MAX = 8.0;

// Phase 14-2: viewport zoom functions now live in runtime-viewport-zoom.js.
// Init + destructure block is placed later in the file (after touchGestureActive
// and polygon-drag-support are initialized, since the zoom module needs
// getCachedStageGeometry and getTouchGestureActive at call time).


// Phase 13-3: shared guard for polygon vertex/edge pointerdown handlers.
// Accepts touch pointers (which may report button === -1 on some browsers)
// while still rejecting right-click / middle-click mouse events.
// Phase 14-2: polygon contract + play areas + ship polygon +
// room geometry + tombstones moved to
// src/app/runtime/runtime-play-area-geometry.js.
window.TT_BEAMER_RUNTIME_PLAY_AREA_GEOMETRY.init({
  state,
  SHIP_POLYGON_DEFAULT,
  ROOM_GEOMETRY_DEFAULT,
  polygonContract,
  getBoard: (boardId) => getBoard(boardId),
  getBoards: () => BOARDS,
  getRoomSourcePoints: (room, boardId) => getRoomSourcePoints(room, boardId),
  getSpecialRooms: (boardId) => getSpecialRooms(boardId),
  clampRoomAbsoluteCoordinate: (v) => clampRoomAbsoluteCoordinate(v),
  clampRoomRelativeOffset: (v) => clampRoomRelativeOffset(v),
  clampRoomStretch: (v) => clampRoomStretch(v),
  normalizeSpecialPolygon: (points, fallback) => normalizeSpecialPolygon(points, fallback),
  isValidSpecialPolygon: (points) => isValidSpecialPolygon(points),
  normalizeRoomFxProfile: (profile) => normalizeRoomFxProfile(profile),
  normalizeInsideFxProfile: (profile) => normalizeInsideFxProfile(profile),
  normalizeOutsideFxProfile: (profile) => normalizeOutsideFxProfile(profile),
});
const {
  isAcceptablePolygonPointerEvent,
  normalizeRoomGeometryMode,
  getRawRoomCenter,
  normalizeRoomGeometry,
  createDefaultRoomGeometryMap,
  createDefaultRoomGeometryByBoard,
  normalizeRoomTombstoneIds,
  createDefaultRoomTombstonesByBoard,
  markRoomTombstone,
  clearRoomTombstone,
  mergeSpecialPolygonMaps,
  filterRoomCatalogByDeletedIds,
  mergeBoardProfilesForGlobalExport,
  resolveProfilePolygonContract,
  applyPolygonPrecedence,
  createDefaultSpecialPolygonMap,
  createDefaultSpecialPolygonsByBoard,
  normalizeShipPolygon,
  normalizePlayAreaId,
  normalizePlayAreaEntry,
  normalizePlayAreasCollection,
  createDefaultPlayAreasByBoard,
  createDefaultSelectedPlayAreaIdByBoard,
  getPlayAreas,
  getSelectedPlayAreaId,
  setSelectedPlayAreaId,
  setPlayAreas,
  getSelectedPlayArea,
  getShipPolygonPoints,
  setShipPolygonPoints,
  normalizeRoomGeometryMap,
  normalizeSpecialPolygonMap,
} = window.TT_BEAMER_RUNTIME_PLAY_AREA_GEOMETRY;

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
  createDefaultRoomStateProfileMap: (boardId) => createDefaultRoomStateProfileMap(boardId),
  createDefaultSpecialPolygonMap,
  createDefaultRoomAnimationDefinitions,
  createDefaultInsideAnimationDefinitions,
  normalizePlayAreasCollection,
  normalizeShipPolygon,
  normalizeRoomTombstoneIds,
  normalizeRoomGeometryMap,
  normalizeRoomStateProfileMap: (map, boardId) => normalizeRoomStateProfileMap(map, boardId),
  normalizeSpecialPolygonMap,
  normalizeFrozenRoomsMap: (raw, boardId) => normalizeFrozenRoomsMap(raw, boardId),
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
  buildBoardProfilesFromState: () => buildBoardProfilesFromState(),
  buildPersistedRuntimeSettingsFromState: () => buildPersistedRuntimeSettingsFromState(),
});
const {
  persistBoardProfiles,
  markLocalConfigDirty,
  clearLocalConfigDirty,
  refreshApplyDiscardButtonsUi,
  applyLocalConfigToServer,
  discardLocalConfigAndReloadFromServer,
  renderServerUnreachableOverlay,
  captureCleanBaseline,
  saveAndCaptureCleanBaseline,
  shouldSuppressBroadcastReapply,
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
  getGlobalDefaultsApiFacade,
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

// Phase 14-2: per-board state accessors (hitarea, geometry,
// special polygons, room state profiles, clamp helpers, room type
// predicates) moved to src/app/runtime/runtime-board-state-accessors.js.
window.TT_BEAMER_RUNTIME_BOARD_STATE_ACCESSORS.init({
  state,
  HITAREA_CALIBRATION_DEFAULT,
  INLINE_FALLBACK_BOARDS,
  ROOM_STATE_DEFAULT,
  ROOM_GLOBAL_EQUIVALENT_MAP,
  ROOM_GIF_ANIMATION_ASSETS,
  getBoard: (boardId) => getBoard(boardId),
  getBoards: () => BOARDS,
  normalizeHitareaCalibration,
  normalizeRoomGeometry: (geometry, room, boardId) => normalizeRoomGeometry(geometry, room, boardId),
  normalizeSpecialPolygon,
  createDefaultRoomGeometryMap: (boardId) => createDefaultRoomGeometryMap(boardId),
  createDefaultSpecialPolygonMap: (boardId) => createDefaultSpecialPolygonMap(boardId),
  getRoomAnimationDefinitionById: (id, boardId) => getRoomAnimationDefinitionById(id, boardId),
  normalizeRoomAssetType: (v) => normalizeRoomAssetType(v),
  resolveRoomCodedEffectType: (ref) => resolveRoomCodedEffectType(ref),
});
const {
  createDefaultHitareaCalibrationMap,
  getHitareaCalibration,
  setHitareaCalibration,
  getRoomGeometry,
  setRoomGeometry,
  updateRoomGeometry,
  getSpecialPolygonPoints,
  setSpecialPolygonPoints,
  getDefaultRoomPolygon,
  getRoomSourcePoints,
  getSpecialRooms,
  getActivePolygonRoomId,
  resolvePolygonEditingRoomId,
  syncSelectedRoomStateForBoard,
  setActivePolygonRoomId,
  clampRoomIntensity,
  clampRoomOpacity,
  clampGifPlaybackSpeed,
  clampRoomDurationSec,
  clampAlienCount,
  normalizeRoomStateProfile,
  createDefaultRoomStateProfileMap,
  createDefaultRoomStateProfilesByBoard,
  normalizeRoomStateProfileMap,
  getRoomStateProfile,
  setRoomStateProfile,
  isRoomAnimationType,
  isRoomGlobalEquivalent,
  resolveRoomAnimationEffectType,
  getRoomEquivalentType,
  getRoomGifAssetFileName,
  isRoomFrozen,
  setRoomFrozen,
  normalizeFrozenRoomsMap,
} = window.TT_BEAMER_RUNTIME_BOARD_STATE_ACCESSORS;

// Phase 14-2 reorg fix: three runtime modules (AUDIO, ROOM_GEOMETRY,
// LIVE_SYNC_HELPERS) lost their init() + destructure blocks during the
// T51 folder reorganization, leaving orchestration with bare references
// to `playSoundForAnimation`, `getRoomPoints`, `emitOutsideFxMutation`,
// etc. that threw ReferenceError at first call. Restore all three
// blocks here. They are placed after BOARD_STATE_ACCESSORS destructure
// because ROOM_GEOMETRY needs its direct refs (getHitareaCalibration,
// getRoomGeometry). All other cross-module helpers used by these three
// modules are injected via ctx arrows so they late-bind to later
// destructures in orchestration.
window.TT_BEAMER_RUNTIME_AUDIO.init({
  state,
  liveSync,
  outputRole,
  OUTPUT_ROLE_FINAL,
  audioStatus,
  triggerFeedback,
  animationSpeedInput,
  animationSpeedValue,
  animationSpeedStatus,
  audioMappingAnimationSelect,
  audioMappingStatus,
  audioMappingSoundSelect,
  ALL_SOUND_ASSET_PATHS,
  ALL_ANIMATION_TYPES,
  GLOBAL_ANIMATIONS,
  SOUND_MAPPING_NONE,
  persistBoardProfiles: () => persistBoardProfiles(),
  clampAnimationSpeed: (v) => clampAnimationSpeed(v),
  clampRoomSoundVolume: (v) => clampRoomSoundVolume(v),
  getGlobalTriggerRevision: (a) => getGlobalTriggerRevision(a),
  getGlobalTriggerKey: (a) => getGlobalTriggerKey(a),
  getAnimationStartedAtEpochMs: (a) => getAnimationStartedAtEpochMs(a),
  getMappedSoundPathForAnimation: (t) => getMappedSoundPathForAnimation(t),
  getAnimationLabel: (t) => getAnimationLabel(t),
  normalizeAnimationSoundPath: (type, path) => normalizeAnimationSoundPath(type, path),
  getGlobalAnimationCategory: (t) => getGlobalAnimationCategory(t),
});
const {
  syncAudioStatus,
  isOutputAudibleRole,
  isAudioPlaybackAllowed,
  persistRuntimeSoundSettingsChange,
  syncAnimationSpeedPanel,
  createAudioAssetVoice,
  getAudioAssetPool,
  warmEventSoundAssets,
  applyAudioGain,
  stopAllAudioVoices,
  stopAnimationSound,
  getAnimationAudioLifecycleKey,
  stopSoundsForInactiveAnimations,
  enforceAudioLifecycleGuard,
  playSoundForAnimation,
  syncAudioMappingStatus,
  syncAudioMappingPanel,
  clearAllActiveAnimationAudio,
} = window.TT_BEAMER_RUNTIME_AUDIO;

window.TT_BEAMER_RUNTIME_ROOM_GEOMETRY.init({
  state,
  canvas,
  polygonContract,
  SHIP_POLYGON_DEFAULT,
  getRoomSourcePoints: (room, boardId) => getRoomSourcePoints(room, boardId),
  getRawRoomCenter: (room, boardId) => getRawRoomCenter(room, boardId),
  getRoomGeometry: (boardId, roomId) => getRoomGeometry(boardId, roomId),
  getHitareaCalibration: (boardId) => getHitareaCalibration(boardId),
  getShipPolygonPoints: (boardId) => getShipPolygonPoints(boardId),
  getPlayAreas: (boardId) => getPlayAreas(boardId),
  mapNormalizedPointToPixels: (x, y, w, h) => mapNormalizedPointToPixels(x, y, w, h),
  normalizePolygonPoint: (p) => normalizePolygonPoint(p),
  isRenderableNormalizedPolygon: (p) => isRenderableNormalizedPolygon(p),
});
const {
  applyHitareaCalibration,
  getRoomCenterFromPoints,
  getStableRoomStretchAnchor,
  getRoomTransform,
  getRoomPoints,
  getRoomLabelPosition,
  getRoomPolygonPixels,
  getShipPolygonPixels,
  getPlayAreaPolygonsPixels,
  getRoomRenderMetrics,
} = window.TT_BEAMER_RUNTIME_ROOM_GEOMETRY;

window.TT_BEAMER_RUNTIME_LIVE_SYNC_HELPERS.init({
  state,
  liveSync,
  OUTPUT_ROLE_CONTROL,
  getOutputRole: () => outputRole,
  emitLiveMutation: (type, payload) => emitLiveMutation(type, payload),
  normalizeOutsideFxProfile: (profile) => normalizeOutsideFxProfile(profile),
  clampClusterStaggerOffsetMs: (value) => clampClusterStaggerOffsetMs(value),
  getAnimationStartedAtEpochMs: (animation) => getAnimationStartedAtEpochMs(animation),
  getClusterTargetById: (id, boardId) => getClusterTargetById(id, boardId),
  reconcileHydratedRunningAnimations: (runningAnimations, now) => reconcileHydratedRunningAnimations(runningAnimations, now),
  logRuntime,
  getGlobalTriggerKey: (animation) => getGlobalTriggerKey(animation),
});
const {
  normalizeLiveMutationPayload,
  emitOutsideFxMutation,
  emitRoomDraftSyncMutation,
  scheduleRoomDraftSync,
  hydrateRunningAnimationStartTimestamps,
  reconcileHydratedAnimations,
  isFiniteDurationGlobalAnimation,
  buildTerminalOneShotFingerprint,
  rememberTerminalOneShotReplay,
  shouldSuppressTerminalOneShotReplay,
  filterRunningAnimationsForBoard,
  isControlCriticalMutationEnvelope,
  sendLiveMutationReceiveAck,
  sendLiveMutationApplyAck,
  shouldApplyMutationEnvelope,
} = window.TT_BEAMER_RUNTIME_LIVE_SYNC_HELPERS;

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

// Phase 14-2: clamp helpers + hitarea/room-geometry panel syncs
// moved to src/app/runtime/runtime-clamp-sync-panels.js.
window.TT_BEAMER_RUNTIME_CLAMP_SYNC_PANELS.init({
  state,
  OUTSIDE_FX_DEFAULT,
  CLUSTER_STAGGER_OFFSET_MIN_MS,
  CLUSTER_STAGGER_OFFSET_MAX_MS,
  CLUSTER_STAGGER_OFFSET_DEFAULT_MS,
  hitareaOffsetXInput,
  hitareaOffsetYInput,
  hitareaScaleInput,
  hitareaOffsetXValue,
  hitareaOffsetYValue,
  hitareaScaleValue,
  hitareaStatus,
  roomStaggerOffsetInput,
  roomStaggerOffsetValue,
  roomGeometryModeInput,
  roomGeometryXInput,
  roomGeometryYInput,
  roomGeometryXValue,
  roomGeometryYValue,
  roomGeometryStretchXInput,
  roomGeometryStretchYInput,
  roomGeometryStretchXValue,
  roomGeometryStretchYValue,
  roomGeometryStatus,
  getHitareaCalibration: (boardId) => getHitareaCalibration(boardId),
  getSelectedRoom: () => getSelectedRoom(),
  getRoomGeometry: (boardId, roomId) => getRoomGeometry(boardId, roomId),
});
const {
  clampRoomSpeed,
  clampRoomSoundVolume,
  clampClusterStaggerOffsetMs,
  syncRoomStaggerOffsetControl,
  clampAudioVolumePercent,
  clampAnimationSpeed,
  clampOutsideIntensity,
  clampOutsideSpeed,
  normalizeOutsideMode,
  normalizeOutsideDirection,
  formatHitareaValue,
  syncHitareaStatus,
  syncHitareaCalibrationPanel,
  formatRoomGeometryValue,
  syncRoomGeometryStatus,
  syncRoomGeometryPanel,
} = window.TT_BEAMER_RUNTIME_CLAMP_SYNC_PANELS;

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
  stopAllIncludeDefaultsCheckbox,
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
  getInsideFxProfile: (boardId) => getInsideFxProfile(boardId),
  getOutsideFxProfile: (boardId) => getOutsideFxProfile(boardId),
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
  quickAnimationPicker,
  triggerFeedback,
  roomAnimationSelect,
  showToast: (message, options) => showToast(message, options),
  startRoomAnimationFromDraft: () => startRoomAnimationFromDraft(),
  syncRoomTargetSelect: () => syncRoomTargetSelect(),
  stopAnimation: (animationId) => stopAnimation(animationId),
  getBoard: (boardId) => getBoard(boardId),
  getRoomFxProfile: (boardId) => getRoomFxProfile(boardId),
  getRoomAnimationLabelById: (type, boardId) => getRoomAnimationLabelById(type, boardId),
  preserveMobileBoardOverview: (reason) => preserveMobileBoardOverview(reason),
  isRoomFrozen: (boardId, roomId) => isRoomFrozen(boardId, roomId),
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

// Phase 14-2: view visibility + exclusivity + setActiveView moved to
// src/app/runtime/runtime-view-visibility.js.
window.TT_BEAMER_RUNTIME_VIEW_VISIBILITY.init({
  state,
  controlPanel,
  triggerFeedback,
  settingsViewGroups,
  dashboardViewGroups,
  openDashboardViewButton,
  openSettingsViewButton,
  SETTINGS_EXCLUSIVE_CONTROL_IDS,
  logUi,
  getSelectedOutsideAnimationDefinition: (boardId) => getSelectedOutsideAnimationDefinition(boardId),
  isOutsideModeDirectionApplicable: (def) => isOutsideModeDirectionApplicable(def),
  applyLocalConfigToServer: () => applyLocalConfigToServer(),
  endPanMode: (e, o) => endPanMode(e, o),
  ensurePrimaryNavigationVisible: () => ensurePrimaryNavigationVisible(),
  syncSettingsSubtabVisibility: () => syncSettingsSubtabVisibility(),
  resetClearAllGuard: () => resetClearAllGuard(),
  syncPolygonEditorPanel: () => syncPolygonEditorPanel(),
  syncShipPolygonEditorPanel: () => syncShipPolygonEditorPanel(),
  syncDashboardZoneVisibility: () => syncDashboardZoneVisibility(),
  syncMobileStickyOffsets: () => syncMobileStickyOffsets(),
  syncStageZoomTransform: () => syncStageZoomTransform(),
  setPanCursorState: () => setPanCursorState(),
  renderRoomOverlay: () => renderRoomOverlay(),
  validateViewNavigationVisibility: (opts) => validateViewNavigationVisibility(opts),
  runMobileProjectionVisibilityGuard: (opts) => runMobileProjectionVisibilityGuard(opts),
});
const {
  setViewGroupVisibility,
  isViewGroupVisible,
  validateSettingsControlOwnership,
  validateViewExclusivity,
  setActiveView,
} = window.TT_BEAMER_RUNTIME_VIEW_VISIBILITY;

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
  ALL_SOUND_ASSET_PATHS,
  SOUND_MAPPING_NONE,
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
  insideSoundRefSelect,
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
  roomSoundRefSelect,
  roomTransformDetails,
  roomRotationDegInput,
  roomRotationDegValue,
  roomStretchToPolygonInput,
  roomWidthScaleInput,
  roomWidthScaleValue,
  roomHeightScaleInput,
  roomHeightScaleValue,
  roomOffsetXScaleInput,
  roomOffsetXScaleValue,
  roomOffsetYScaleInput,
  roomOffsetYScaleValue,
  roomAssetTypeInput,
  roomAssetRefInput,
  roomAnimationSelect,
  roomAnimationSettingsSelect,
  roomDefOpacityInput,
  roomDefOpacityValue,
  roomDefIntensityInput,
  roomDefIntensityValue,
  roomDefSpeedInput,
  roomDefSpeedValue,
  roomDefSoundVolumeInput,
  roomDefSoundVolumeValue,
  roomAnimationSettingsDeleteButton,
  outsideResourceSelect,
  outsideSoundRefSelect,
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
  ALL_SOUND_ASSET_PATHS,
  SOUND_MAPPING_NONE,
  getAnimationLabel: (type) => getAnimationLabel(type),
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
  isRoomFrozen: (boardId, roomId) => isRoomFrozen(boardId, roomId),
  pushUndoState: (desc) => pushUndoState(desc),
  normalizePolygonPoint: (p) => normalizePolygonPoint(p),
  remapGridPoint: (nx, ny) => projectionRemapPoint(nx, ny),
  hasGridDisplacements: () => projectionHasGridDisplacements(),
  getPlayAreas: (boardId) => getPlayAreas(boardId),
  setPlayAreaPolygon: (boardId, areaId, polygon) => {
    const areas = getPlayAreas(boardId);
    const area = areas.find((a) => a.id === areaId);
    if (area) {
      area.polygon = polygon;
      setShipPolygonPoints(boardId, getSelectedPlayArea(boardId)?.polygon || polygon);
    }
  },
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

// Phase 14-2: board switch cluster moved to
// src/app/runtime/runtime-board-switch.js.
window.TT_BEAMER_RUNTIME_BOARD_SWITCH.init({
  state,
  ROOM_GEOMETRY_DEFAULT,
  ROOM_STATE_DEFAULT,
  canvas,
  canvasCtx: ctx,
  boardImage,
  boardSelect,
  boardStatus,
  triggerFeedback,
  getBoard: (boardId) => getBoard(boardId),
  emitLiveMutation: (type, payload) => emitLiveMutation(type, payload),
  clearOutsideMp4PlaybackState: (boardId) => clearOutsideMp4PlaybackState(boardId),
  clearOutsideTimelineState: (boardId) => clearOutsideTimelineState(boardId),
  warmRoomGifAssets: (opts) => warmRoomGifAssets(opts),
  prewarmBoardOutsideMp4Asset: (boardId, opts) => prewarmBoardOutsideMp4Asset(boardId, opts),
  syncRoomPanelFromSelection: (opts) => syncRoomPanelFromSelection(opts),
  syncHitareaCalibrationPanel: () => syncHitareaCalibrationPanel(),
  syncRoomGeometryPanel: () => syncRoomGeometryPanel(),
  syncPolygonEditorPanel: () => syncPolygonEditorPanel(),
  syncShipPolygonEditorPanel: () => syncShipPolygonEditorPanel(),
  syncRoomFxPanel: () => syncRoomFxPanel(),
  syncInsideFxPanel: () => syncInsideFxPanel(),
  syncOutsideFxPanel: () => syncOutsideFxPanel(),
  syncOutsideRuntimeMirror: (boardId) => syncOutsideRuntimeMirror(boardId),
  syncBoardZoomPanel: () => syncBoardZoomPanel(),
  setPanCursorState: () => setPanCursorState(),
  renderRoomOverlay: () => renderRoomOverlay(),
  refreshGlobalButtons: () => refreshGlobalButtons(),
  normalizeRoomGeometry: (geometry, room, boardId) => normalizeRoomGeometry(geometry, room, boardId),
  normalizeRoomStateProfile: (profile) => normalizeRoomStateProfile(profile),
  normalizeRoomTombstoneIds: (ids, boardId) => normalizeRoomTombstoneIds(ids, boardId),
  clearUndoStack: () => { if (typeof clearUndoStack === "function") clearUndoStack(); },
});
const {
  emitBoardLayoutContextMutation,
  shouldPreserveLifecycleStatusFeedback,
  switchBoard,
  ensureBoardRoomStateMaps,
} = window.TT_BEAMER_RUNTIME_BOARD_SWITCH;

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
  isRoomFrozen: (boardId, roomId) => isRoomFrozen(boardId, roomId),
  setRoomFrozen: (boardId, roomId, frozen) => setRoomFrozen(boardId, roomId, frozen),
  roomFrozenCheckbox,
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
  syncRoomFrozenCheckbox,
} = window.TT_BEAMER_RUNTIME_ROOM_MANAGEMENT;

// Phase 18-3: board context menu for right-click / long-press room creation.
window.TT_BEAMER_RUNTIME_POLYGON_CONTEXT_MENU.init({
  state,
  roomOverlay,
  triggerFeedback,
  mapClientPointToNormalized: (x, y) => mapClientPointToNormalized(x, y),
  isPanArbitrating: () => isPanArbitrating(),
  getBoard: (boardId) => getBoard(boardId),
  createRoomId: (board) => createRoomId(board),
  createHexagonPolygon: (opts) => createHexagonPolygon(opts),
  ensureBoardRoomStateMaps: (boardId) => ensureBoardRoomStateMaps(boardId),
  clearRoomTombstone: (boardId, roomId) => clearRoomTombstone(boardId, roomId),
  setSpecialPolygonPoints: (boardId, roomId, points) => setSpecialPolygonPoints(boardId, roomId, points),
  setActivePolygonRoomId: (boardId, roomId) => setActivePolygonRoomId(boardId, roomId),
  persistBoardProfiles: () => persistBoardProfiles(),
  syncRoomPanelFromSelection: (opts) => syncRoomPanelFromSelection(opts),
  syncPolygonEditorPanel: () => syncPolygonEditorPanel(),
  renderRoomOverlay: () => renderRoomOverlay(),
  pushUndoState: (desc) => pushUndoState(desc),
});

// Phase 18-3: undo/redo system for polygon editing operations.
window.TT_BEAMER_RUNTIME_POLYGON_UNDO.init({
  state,
  triggerFeedback,
  undoButton: polygonUndoButton,
  redoButton: polygonRedoButton,
  getBoard: (boardId) => getBoard(boardId),
  getSpecialPolygonPoints: (boardId, roomId) => getSpecialPolygonPoints(boardId, roomId),
  setSpecialPolygonPoints: (boardId, roomId, points) => setSpecialPolygonPoints(boardId, roomId, points),
  ensureBoardRoomStateMaps: (boardId) => ensureBoardRoomStateMaps(boardId),
  clearRoomTombstone: (boardId, roomId) => clearRoomTombstone(boardId, roomId),
  markRoomTombstone: (boardId, roomId) => markRoomTombstone(boardId, roomId),
  persistBoardProfiles: () => persistBoardProfiles(),
  syncPolygonEditorPanel: () => syncPolygonEditorPanel(),
  syncShipPolygonEditorPanel: () => syncShipPolygonEditorPanel(),
  syncRoomPanelFromSelection: (opts) => syncRoomPanelFromSelection(opts),
  renderRoomOverlay: () => renderRoomOverlay(),
  getPlayAreas: (boardId) => getPlayAreas(boardId),
  setPlayAreaPolygon: (boardId, areaId, polygon) => {
    const areas = getPlayAreas(boardId);
    const area = areas.find((a) => a.id === areaId);
    if (area) {
      area.polygon = polygon;
      setShipPolygonPoints(boardId, getSelectedPlayArea(boardId)?.polygon || polygon);
    }
  },
});
const {
  pushUndoState,
  undo: polygonUndo,
  redo: polygonRedo,
  clearUndoStack,
  syncUndoRedoButtons,
} = window.TT_BEAMER_RUNTIME_POLYGON_UNDO;

// Wire undo/redo button clicks
polygonUndoButton?.addEventListener("click", () => polygonUndo());
polygonRedoButton?.addEventListener("click", () => polygonRedo());

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
  isRoomFrozen: (boardId, roomId) => isRoomFrozen(boardId, roomId),
  roomColorPickerLabel,
  getRoomAnimationDefinitionById: (id, boardId) => getRoomAnimationDefinitionById(id, boardId),
  normalizeRoomAssetType: (v) => normalizeRoomAssetType(v),
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
  dashboardDefaultAnimation,
  saveAndCaptureCleanBaseline: () => saveAndCaptureCleanBaseline(),
  syncRoomPanelFromSelection: (opts) => syncRoomPanelFromSelection(opts),
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
  liveEditorPanel,
  liveEditorTitle,
  liveEditorClose,
  liveEditorOpacity,
  liveEditorOpacityValue,
  liveEditorIntensity,
  liveEditorIntensityValue,
  liveEditorSpeed,
  liveEditorSpeedValue,
  liveEditorSoundVolume,
  liveEditorSoundVolumeValue,
  liveEditorTransform,
  liveEditorRotation,
  liveEditorRotationValue,
  liveEditorStretch,
  liveEditorWidth,
  liveEditorWidthValue,
  liveEditorHeight,
  liveEditorHeightValue,
  liveEditorOffsetX,
  liveEditorOffsetXValue,
  liveEditorOffsetY,
  liveEditorOffsetYValue, liveEditorDiscard, liveEditorDefault,
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
  buildAnimationSnapshotForLiveSync: (animation) => buildAnimationSnapshotForLiveSync(animation),
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
  buildAnimationSnapshotForLiveSync: (animation) => buildAnimationSnapshotForLiveSync(animation),
  getRoomFxProfile: (boardId) => getRoomFxProfile(boardId),
  setRoomFxProfile: (boardId, profile) => setRoomFxProfile(boardId, profile),
  normalizeRoomFxProfile: (profile) => normalizeRoomFxProfile(profile),
  saveAndCaptureCleanBaseline: () => saveAndCaptureCleanBaseline(),
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
  closeLiveEditor,
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
  boardImage,
  liveSync,
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
  getRoomAnimationDefinitionById: (id, boardId) => getRoomAnimationDefinitionById(id, boardId),
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
  // Phase 19-4: post-draw mesh warp (unified grid projection)
  postDrawMeshWarp: (canvas, canvasCtx) => projectionPostDrawMeshWarp(canvas, canvasCtx),
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

// Phase 14-2: navigation + board import + quick mode binders moved to
// src/app/runtime/runtime-wire-navigation-binders.js.
window.TT_BEAMER_RUNTIME_WIRE_NAVIGATION_BINDERS.wireNavigationBinders({
  state,
  triggerFeedback,
  boardSelect,
  boardImportButton,
  boardImportFileInput,
  boardImportImageInput,
  boardImportNameInput,
  boardImportIdInput,
  boardStatus,
  openDashboardViewButton,
  openSettingsViewButton,
  settingsSubtabButtons,
  quickModeOffButton,
  quickModeActivateButton,
  quickModeDeactivateButton,
  quickModeClearButton,
  openTriggerZoneButton,
  openManageZoneButton,
  SETTINGS_SUBTAB_LABELS,
  switchBoard: (boardId, opts) => switchBoard(boardId, opts),
  importBoardFromFile: (file) => importBoardFromFile(file),
  importBoardFromImage: (file, opts) => importBoardFromImage(file, opts),
  setActiveView: (view, opts) => setActiveView(view, opts),
  syncShipPolygonEditorPanel: () => syncShipPolygonEditorPanel(),
  getBoard: (boardId) => getBoard(boardId),
  reportActionError: (statusText, opts) => reportActionError(statusText, opts),
  normalizeSettingsSubtab: (tab) => normalizeSettingsSubtab(tab),
  setSettingsSubtab: (tab) => setSettingsSubtab(tab),
  setQuickMode: (mode) => setQuickMode(mode),
  setDashboardZone: (zone, opts) => setDashboardZone(zone, opts),
});




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

// Phase 14-2: stage wheel + touch gesture state machine moved to
// src/app/runtime/runtime-wire-stage-gesture-binders.js.
window.TT_BEAMER_RUNTIME_WIRE_STAGE_GESTURE_BINDERS.wireStageGestureBinders({
  state,
  liveSync,
  stage,
  roomOverlay,
  outputRole,
  OUTPUT_ROLE_FINAL,
  getBoardZoom: (boardId) => getBoardZoom(boardId),
  applyZoomScaleAroundClientPoint: (scale, x, y, label) => applyZoomScaleAroundClientPoint(scale, x, y, label),
  clampBoardZoomScale: (scale) => clampBoardZoomScale(scale),
  canStartPanModeFromEvent: (event) => canStartPanModeFromEvent(event),
  startPanMode: (event, trigger) => startPanMode(event, trigger),
  endPanMode: (event, opts) => endPanMode(event, opts),
  setPanCursorState: () => setPanCursorState(),
  refreshStageGeometryCache: () => refreshStageGeometryCache(),
  scheduleNextLiveSnapshotPoll: (delay) => scheduleNextLiveSnapshotPoll(delay),
  setTouchGestureActive: (v) => { touchGestureActive = v; },
  finishShipPolygonVertexDrag: (event, opts) => finishShipPolygonVertexDrag(event, opts),
  finishPolygonAreaDrag: (event, opts) => finishPolygonAreaDrag(event, opts),
  finishPolygonVertexDrag: (event, opts) => finishPolygonVertexDrag(event, opts),
  beginShipPolygonVertexDrag: (event, index) => beginShipPolygonVertexDrag(event, index),
  beginPolygonVertexDrag: (event, roomId, index) => beginPolygonVertexDrag(event, roomId, index),
  beginPendingPolygonAreaDrag: (event, roomId) => beginPendingPolygonAreaDrag(event, roomId),
  setActivePolygonRoomId: (boardId, roomId) => setActivePolygonRoomId(boardId, roomId),
  syncPolygonRoomSelection: (roomId) => syncPolygonRoomSelection(roomId),
  syncPolygonVertexSelect: (roomId) => syncPolygonVertexSelect(roomId),
  syncPolygonEdgeSelect: (roomId) => syncPolygonEdgeSelect(roomId),
  syncPolygonEditorPanel: () => syncPolygonEditorPanel(),
  syncRoomPanelFromSelection: (opts) => syncRoomPanelFromSelection(opts),
  renderRoomOverlay: () => renderRoomOverlay(),
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
  pushUndoState("Delete vertex");
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
  pushUndoState: (desc) => pushUndoState(desc),
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
  roomDefOpacityInput,
  roomDefOpacityValue,
  roomDefIntensityInput,
  roomDefIntensityValue,
  roomDefSpeedInput,
  roomDefSpeedValue,
  roomDefSoundVolumeInput,
  roomDefSoundVolumeValue,
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
  clampRoomOpacity: (v) => clampRoomOpacity(v),
  clampRoomIntensity: (v) => clampRoomIntensity(v),
  clampRoomSpeed: (v) => clampRoomSpeed(v),
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

// Phase 14-2: roomOverlay pointer + document keyboard + window-level
// event binders moved to src/app/runtime/runtime-wire-overlay-window-binders.js.
window.TT_BEAMER_RUNTIME_WIRE_OVERLAY_WINDOW_BINDERS.wireOverlayWindowBinders({
  state,
  liveSync,
  roomOverlay,
  triggerFeedback,
  dashboardGlobalLoopUntilStopInput,
  dashboardGlobalPlaySoundInput,
  outputRole,
  OUTPUT_ROLE_CONTROL,
  GLOBAL_ONE_SHOT_DURATION_SEC,
  arePlayAreaVerticesEditable: () => arePlayAreaVerticesEditable(),
  areRoomVerticesEditable: () => areRoomVerticesEditable(),
  getShipPolygonPoints: (boardId) => getShipPolygonPoints(boardId),
  setShipPolygonPoints: (boardId, points) => setShipPolygonPoints(boardId, points),
  getNormalizedOverlayPoint: (event) => getNormalizedOverlayPoint(event),
  clampDisplayNormalizedCoordinate: (v) => clampDisplayNormalizedCoordinate(v),
  applyIncrementalShipDrag: (refs, points) => applyIncrementalShipDrag(refs, points),
  applyIncrementalRoomDrag: (refs, points) => applyIncrementalRoomDrag(refs, points),
  syncShipPolygonEditorStatus: () => syncShipPolygonEditorStatus(),
  syncPolygonEditorStatus: () => syncPolygonEditorStatus(),
  maybePromotePendingPolygonAreaDrag: (event) => maybePromotePendingPolygonAreaDrag(event),
  clampRoomAbsoluteCoordinate: (v) => clampRoomAbsoluteCoordinate(v),
  setSpecialPolygonPoints: (boardId, roomId, points) => setSpecialPolygonPoints(boardId, roomId, points),
  getSpecialPolygonPoints: (boardId, roomId) => getSpecialPolygonPoints(boardId, roomId),
  getBoard: (boardId) => getBoard(boardId),
  getRoomPoints: (room, boardId) => getRoomPoints(room, boardId),
  projectDisplayNormalizedToRoomRaw: (x, y, room, boardId) => projectDisplayNormalizedToRoomRaw(x, y, room, boardId),
  finishShipPolygonVertexDrag: (event, opts) => finishShipPolygonVertexDrag(event, opts),
  finishPolygonAreaDrag: (event, opts) => finishPolygonAreaDrag(event, opts),
  finishPolygonVertexDrag: (event, opts) => finishPolygonVertexDrag(event, opts),
  preserveRoomSelectionAfterPointerLifecycle: () => preserveRoomSelectionAfterPointerLifecycle(),
  clearPendingPolygonAreaDragSession: () => clearPendingPolygonAreaDragSession(),
  canStartPanModeFromEvent: (event) => canStartPanModeFromEvent(event),
  startPanMode: (event, trigger) => startPanMode(event, trigger),
  endPanMode: (event, opts) => endPanMode(event, opts),
  isPanArbitrating: () => isPanArbitrating(),
  scheduleZoomUpdate: (update) => scheduleZoomUpdate(update),
  setPanCursorState: () => setPanCursorState(),
  clearSelectedRoomSelection: (reason) => clearSelectedRoomSelection(reason),
  isTypingShortcutTarget: (target) => isTypingShortcutTarget(target),
  isPlayAreaShortcutContext: (target) => isPlayAreaShortcutContext(target),
  copySelectedRoomToClipboard: () => copySelectedRoomToClipboard(),
  pasteRoomFromClipboard: () => pasteRoomFromClipboard(),
  deleteSelectedPolygonVertex: () => deleteSelectedPolygonVertex(),
  deleteSelectedRoom: () => deleteSelectedRoom(),
  getActivePolygonRoomId: (boardId) => getActivePolygonRoomId(boardId),
  polygonUndo: () => polygonUndo(),
  polygonRedo: () => polygonRedo(),
  resetClearAllGuard: () => resetClearAllGuard(),
  clearAllQuickModeInflight: () => clearAllQuickModeInflight(),
  scheduleNextLiveSnapshotPoll: (delay) => scheduleNextLiveSnapshotPoll(delay),
  scheduleStageViewportLifecycle: (reason) => scheduleStageViewportLifecycle(reason),
  syncDashboardZoneVisibility: () => syncDashboardZoneVisibility(),
  syncMobileStickyOffsets: () => syncMobileStickyOffsets(),
  runOrientationStateRegression: () => runOrientationStateRegression(),
  runNavigationStateRegression: () => runNavigationStateRegression(),
  runMobileProjectionVisibilityGuard: (opts) => runMobileProjectionVisibilityGuard(opts),
  validateViewNavigationVisibility: (opts) => validateViewNavigationVisibility(opts),
  shouldSuppressRapidTap: (key) => shouldSuppressRapidTap(key),
  recordTriggerIntent: () => recordTriggerIntent(),
  setDashboardZone: (zone) => setDashboardZone(zone),
  upsertGlobalAnimation: (type, duration, opts) => upsertGlobalAnimation(type, duration, opts),
});

// Phase 14-2: room panel + audio + global config + mp4 perf binders
// moved to src/app/runtime/runtime-wire-room-audio-binders.js.
window.TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS.wireRoomAudioBinders({
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
  armClearAllGuard: () => armClearAllGuard(),
  resetClearAllGuard: () => resetClearAllGuard(),
  setDashboardZone: (zone) => setDashboardZone(zone),
  executeClearAll: () => executeClearAll(),
  createRoomFromSettings: () => createRoomFromSettings(),
  deleteSelectedRoom: () => deleteSelectedRoom(),
  syncClusterManagementPanel: () => syncClusterManagementPanel(),
  createClusterFromSettings: () => createClusterFromSettings(),
  updateClusterFromSettings: () => updateClusterFromSettings(),
  deleteSelectedClusterFromSettings: () => deleteSelectedClusterFromSettings(),
  renameSelectedRoom: (name) => renameSelectedRoom(name),
  getRoomFxProfile: (boardId) => getRoomFxProfile(boardId),
  getRoomAnimationDefinitionById: (id, boardId) => getRoomAnimationDefinitionById(id, boardId),
  normalizeRoomAssetType: (v) => normalizeRoomAssetType(v),
  warmGifAssetPath: (path, opts) => warmGifAssetPath(path, opts),
  parseRoomTargetValue: (value) => parseRoomTargetValue(value),
  syncRoomTargetSelect: () => syncRoomTargetSelect(),
  getSelectedRoom: () => getSelectedRoom(),
  syncRoomPanelFromSelection: (opts) => syncRoomPanelFromSelection(opts),
  clampRoomOpacity: (v) => clampRoomOpacity(v),
  clampRoomIntensity: (v) => clampRoomIntensity(v),
  clampRoomSpeed: (v) => clampRoomSpeed(v),
  clampRoomSoundVolume: (v) => clampRoomSoundVolume(v),
  clampRoomDurationSec: (v) => clampRoomDurationSec(v),
  clampClusterStaggerOffsetMs: (v) => clampClusterStaggerOffsetMs(v),
  clampAnimationSpeed: (v) => clampAnimationSpeed(v),
  clampAudioVolumePercent: (v) => clampAudioVolumePercent(v),
  scheduleRoomDraftSync: (reason, delay) => scheduleRoomDraftSync(reason, delay),
  syncRoomStaggerOffsetControl: () => syncRoomStaggerOffsetControl(),
  stopAnimationSound: (id) => stopAnimationSound(id),
  stopAllAudioVoices: () => stopAllAudioVoices(),
  playSoundForAnimation: (animation) => playSoundForAnimation(animation),
  applyAudioGain: () => applyAudioGain(),
  enforceAudioLifecycleGuard: () => enforceAudioLifecycleGuard(),
  syncAudioStatus: () => syncAudioStatus(),
  persistRuntimeSoundSettingsChange: (msg) => persistRuntimeSoundSettingsChange(msg),
  syncAudioMappingPanel: () => syncAudioMappingPanel(),
  normalizeAnimationSoundPath: (type, path) => normalizeAnimationSoundPath(type, path),
  getAnimationLabel: (type) => getAnimationLabel(type),
  syncAnimationSpeedPanel: () => syncAnimationSpeedPanel(),
  shouldSuppressRapidTap: (key) => shouldSuppressRapidTap(key),
  recordTriggerIntent: () => recordTriggerIntent(),
  startRoomAnimationFromDraft: () => startRoomAnimationFromDraft(),
  setAlignMode: (enabled, opts) => setAlignMode(enabled, opts),
  downloadGlobalDefaultsFallback: () => downloadGlobalDefaultsFallback(),
  getGlobalDefaultsApiFacade: () => getGlobalDefaultsApiFacade(),
  applyLocalConfigToServer: () => applyLocalConfigToServer(),
  discardLocalConfigAndReloadFromServer: () => discardLocalConfigAndReloadFromServer(),
  refreshApplyDiscardButtonsUi: () => refreshApplyDiscardButtonsUi(),
  updateMobilePerformanceStatus: () => updateMobilePerformanceStatus(),
  percentile: (samples, p) => percentile(samples, p),
  normalizeMp4PerformanceTier: (v) => normalizeMp4PerformanceTier(v),
  getMp4TierDefaults: (tier) => getMp4TierDefaults(tier),
  updateMp4PerformanceControls: (partial, opts) => updateMp4PerformanceControls(partial, opts),
  roomFrozenCheckbox,
  roomColorPicker,
  roomColorPickerLabel,
  setRoomFrozen: (boardId, roomId, frozen) => setRoomFrozen(boardId, roomId, frozen),
  syncSelectedRoomStateForBoard: (boardId) => syncSelectedRoomStateForBoard(boardId),
  persistBoardProfiles: () => persistBoardProfiles(),
  renderRoomOverlay: () => renderRoomOverlay(),
  pushUndoState: (desc) => pushUndoState(desc),
});

const resizeObserver = new ResizeObserver((entries) => {
  void entries;
  scheduleStageViewportLifecycle("resize-observer");
  // Phase 19-2: recompute projection mapping on resize
  onProjectionWindowResize();
});

resizeObserver.observe(stage);
if (projectionArea) {
  resizeObserver.observe(projectionArea);
}
bindDevicePixelRatioWatcher();
scheduleStageViewportLifecycle("startup-bind");

// Phase 18: initialize slider touch guard for mobile scroll protection
if (window.TT_BEAMER_RUNTIME_SLIDER_TOUCH_GUARD) {
  window.TT_BEAMER_RUNTIME_SLIDER_TOUCH_GUARD.init();
}

// Phase 14-2: syncRuntimePanelsFromState + initializeApplication
// moved to src/app/runtime/runtime-bootstrap.js.
window.TT_BEAMER_RUNTIME_BOOTSTRAP.init({
  state,
  liveSync,
  logBootstrap,
  triggerFeedback,
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
  getBoards: () => BOARDS,
  switchBoard: (boardId, opts) => switchBoard(boardId, opts),
  clampRoomOpacity: (v) => clampRoomOpacity(v),
  clampRoomSpeed: (v) => clampRoomSpeed(v),
  clampRoomSoundVolume: (v) => clampRoomSoundVolume(v),
  clampAnimationSpeed: (v) => clampAnimationSpeed(v),
  syncRoomDraftActionButton: () => syncRoomDraftActionButton(),
  applyAudioGain: () => applyAudioGain(),
  enforceAudioLifecycleGuard: () => enforceAudioLifecycleGuard(),
  syncAudioStatus: () => syncAudioStatus(),
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
  updateMobilePerformanceStatus: () => updateMobilePerformanceStatus(),
  syncMp4PerformanceControlsPanel: () => syncMp4PerformanceControlsPanel(),
  loadExternalBoardZones: () => loadExternalBoardZones(),
  loadOutsideResourceAssets: () => loadOutsideResourceAssets(),
  syncBoardSelectOptions: () => syncBoardSelectOptions(),
  createDefaultHitareaCalibrationMap: () => createDefaultHitareaCalibrationMap(),
  createDefaultRoomTombstonesByBoard: () => createDefaultRoomTombstonesByBoard(),
  createDefaultRoomGeometryByBoard: () => createDefaultRoomGeometryByBoard(),
  createDefaultRoomStateProfilesByBoard: () => createDefaultRoomStateProfilesByBoard(),
  createDefaultSpecialPolygonsByBoard: () => createDefaultSpecialPolygonsByBoard(),
  createDefaultPlayAreasByBoard: () => createDefaultPlayAreasByBoard(),
  createDefaultSelectedPlayAreaIdByBoard: () => createDefaultSelectedPlayAreaIdByBoard(),
  createDefaultInsideFxByBoard: () => createDefaultInsideFxByBoard(),
  createDefaultRoomFxByBoard: () => createDefaultRoomFxByBoard(),
  createDefaultOutsideFxByBoard: () => createDefaultOutsideFxByBoard(),
  createDefaultBoardZoomByBoard: () => createDefaultBoardZoomByBoard(),
  createDefaultAnimationSoundMap,
  getShipPolygonPoints: (boardId) => getShipPolygonPoints(boardId),
  normalizeQuickMode: (mode) => normalizeQuickMode(mode),
  normalizeAnimationSoundMap,
  fetchGlobalDefaultsPayload: () => fetchGlobalDefaultsPayload(),
  loadBoardProfiles: () => loadBoardProfiles(),
  captureCleanBaseline: () => captureCleanBaseline(),
  buildResolveSnapshot: (opts) => buildResolveSnapshot(opts),
  formatResolveSnapshot: (snapshot) => formatResolveSnapshot(snapshot),
  renderServerUnreachableOverlay: (error) => renderServerUnreachableOverlay(error),
  restoreSettingsSubtabPreference: () => restoreSettingsSubtabPreference(),
  syncQuickModePanel: () => syncQuickModePanel(),
  syncMobileStickyOffsets: () => syncMobileStickyOffsets(),
  applyOutputRoleViewContract: () => applyOutputRoleViewContract(),
  loadProjectionCornersFromConfig: (config) => loadProjectionCornersFromConfig(config),
  applyProjectionTransform: () => applyProjectionTransform(),
  connectLiveSyncSocket: () => connectLiveSyncSocket(),
  scheduleNextLiveSnapshotPoll: (delay) => scheduleNextLiveSnapshotPoll(delay),
  warmEventSoundAssets: () => warmEventSoundAssets(),
  warmRoomGifAssets: (opts) => warmRoomGifAssets(opts),
  prewarmBoardOutsideMp4Asset: (boardId, opts) => prewarmBoardOutsideMp4Asset(boardId, opts),
  setActiveView: (view, opts) => setActiveView(view, opts),
  setPanCursorState: () => setPanCursorState(),
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
  renderRunningAnimationsList: () => renderRunningAnimationsList(),
  refreshGlobalButtons: () => refreshGlobalButtons(),
  getLiveTraceSnapshot,
  draw: (timestamp) => draw(timestamp),
  createAnimation: (opts) => createAnimation(opts),
  playSoundForAnimation: (animation) => playSoundForAnimation(animation),
  emitLiveMutation: (type, payload) => emitLiveMutation(type, payload),
  buildAnimationSnapshotForLiveSync: (animation) => buildAnimationSnapshotForLiveSync(animation),
});
const {
  syncRuntimePanelsFromState,
  initializeApplication,
} = window.TT_BEAMER_RUNTIME_BOOTSTRAP;

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
