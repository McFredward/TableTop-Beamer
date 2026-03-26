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
  OUTSIDE_FX_DEFAULT,
  ROOM_STATE_DEFAULT,
} = window.TT_BEAMER_CONFIG;

let BOARDS = CONFIG_BOARDS.map((board) => window.TT_BEAMER_ROOMS.normalizeBoard(board));

const OUTPUT_ROLE_CONTROL = "control";
const OUTPUT_ROLE_FINAL = "final-output";

function resolveOutputRoleFromLocation() {
  const pathname = window.location.pathname || "/";
  return pathname === "/output/final" || pathname.startsWith("/output/final/")
    ? OUTPUT_ROLE_FINAL
    : OUTPUT_ROLE_CONTROL;
}

const outputRole = resolveOutputRoleFromLocation();
document.body.dataset.outputRole = outputRole;

function resolveLiveWebSocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/live/ws?role=${encodeURIComponent(outputRole)}`;
}

const stage = document.querySelector("#stage");
const boardImage = document.querySelector("#board-image");
const canvas = document.querySelector("#fx-canvas");
const roomOverlay = document.querySelector("#room-overlay");
const boardSelect = document.querySelector("#board-select");
const boardImportFileInput = document.querySelector("#board-import-file");
const boardImportButton = document.querySelector("#board-import-button");
const boardStatus = document.querySelector("#board-status");
const zonesStatus = document.querySelector("#zones-status");
const alignModeToggleInput = document.querySelector("#align-mode-toggle");
const alignModeStatus = document.querySelector("#align-mode-status");
const saveGlobalDefaultsButton = document.querySelector("#save-global-defaults");
const loadApplyGlobalDefaultsButton = document.querySelector("#load-apply-global-defaults");
const exportGlobalDefaultsButton = document.querySelector("#export-global-defaults");
const globalDefaultsStatus = document.querySelector("#global-defaults-status");
const apiDiagnoseStatus = document.querySelector("#api-diagnose-status");
const triggerFeedback = document.querySelector("#trigger-feedback");
const stopAllButton = document.querySelector("#stop-all");
const roomSelected = document.querySelector("#room-selected");
const roomTargetSelect = document.querySelector("#room-target-select");
const roomAnimationSelect = document.querySelector("#room-animation-select");
const roomOpacityInput = document.querySelector("#room-opacity");
const roomOpacityValue = document.querySelector("#room-opacity-value");
const roomPlaybackSpeedInput = document.querySelector("#room-playback-speed");
const roomPlaybackSpeedValue = document.querySelector("#room-playback-speed-value");
const roomIntensityInput = document.querySelector("#room-intensity");
const roomIntensityValue = document.querySelector("#room-intensity-value");
const roomSpeedInput = document.querySelector("#room-speed");
const roomSpeedValue = document.querySelector("#room-speed-value");
const roomSoundVolumeInput = document.querySelector("#room-sound-volume");
const roomSoundVolumeValue = document.querySelector("#room-sound-volume-value");
const roomDurationInput = document.querySelector("#room-duration");
const roomHoldInput = document.querySelector("#room-hold");
const roomStaggerStartInput = document.querySelector("#room-stagger-start");
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
const controlPanel = document.querySelector("#control-panel");
const projectionArea = document.querySelector(".projection-area");
const primaryViewSwitch = document.querySelector(".primary-view-switch");
const dashboardStickyShell = document.querySelector(".dashboard-sticky-shell");
const mobileZoneSwitch = document.querySelector("#mobile-zone-switch");
const runningOverviewPanel = document.querySelector("#running-overview-panel");
const globalAnimationPanel = document.querySelector("#global-animation-panel");
const runMobilePerformanceCheckButton = document.querySelector("#run-mobile-performance-check");
const mobilePerformanceStatus = document.querySelector("#mobile-performance-status");
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
const shipPolygonVertexSelect = document.querySelector("#ship-polygon-vertex-select");
const shipPolygonEdgeSelect = document.querySelector("#ship-polygon-edge-select");
const shipPolygonInsertVertexButton = document.querySelector("#ship-polygon-insert-vertex");
const shipPolygonDeleteVertexButton = document.querySelector("#ship-polygon-delete-vertex");
const shipPolygonResetButton = document.querySelector("#ship-polygon-reset");
const shipPolygonEditorStatus = document.querySelector("#ship-polygon-editor-status");
const outsideEnabledInput = document.querySelector("#outside-enabled");
const outsideIntensityInput = document.querySelector("#outside-intensity");
const outsideIntensityValue = document.querySelector("#outside-intensity-value");
const outsideSpeedInput = document.querySelector("#outside-speed");
const outsideSpeedValue = document.querySelector("#outside-speed-value");
const outsideModeInput = document.querySelector("#outside-mode");
const outsideDirectionInput = document.querySelector("#outside-direction");
const boardZoomRangeInput = document.querySelector("#board-zoom-range");
const boardZoomValue = document.querySelector("#board-zoom-value");
const polygonHandleSizeInput = document.querySelector("#polygon-handle-size");
const polygonHandleSizeValue = document.querySelector("#polygon-handle-size-value");
const boardZoomFitButton = document.querySelector("#board-zoom-fit");
const boardZoomResetButton = document.querySelector("#board-zoom-reset");
const boardZoomStatus = document.querySelector("#board-zoom-status");
const boardPanStatus = document.querySelector("#board-pan-status");
const dashboardViewGroups = Array.from(document.querySelectorAll('[data-view="dashboard"]'));
const settingsViewGroups = Array.from(document.querySelectorAll('[data-view="settings"]'));
const dashboardZoneGroups = Array.from(document.querySelectorAll("[data-dashboard-zone]"));
const SETTINGS_EXCLUSIVE_CONTROL_IDS = [
  "board-select",
  "board-import-file",
  "board-import-button",
  "save-global-defaults",
  "load-apply-global-defaults",
  "export-global-defaults",
  "animation-speed",
  "audio-enabled",
  "audio-volume",
  "audio-mapping-animation",
  "audio-mapping-sound",
  "board-zoom-range",
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
  "show-play-area-vertices",
  "outside-enabled",
  "outside-intensity",
  "outside-speed",
  "outside-mode",
  "outside-direction",
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
  state.alignMode = Boolean(enabled);
  syncAlignModePanel();
  renderRoomOverlay();
  if (emit) {
    emitLiveMutation("align-toggle", {
      alignMode: state.alignMode,
    });
  }
}

const ctx = canvas.getContext("2d");

const state = window.TT_BEAMER_STATE.createInitialState({
  defaultBoardId: BOARDS[0].id,
  defaultRoomAnimationId: ROOM_ANIMATIONS[0].id,
  roomOpacity: roomOpacityInput?.value,
  roomPlaybackSpeed: roomPlaybackSpeedInput?.value,
  roomIntensity: roomIntensityInput?.value,
  roomSpeed: roomSpeedInput?.value,
  roomSoundVolume: roomSoundVolumeInput?.value,
});

const liveSync = {
  socket: null,
  connected: false,
  clientId: null,
  lastAckAt: null,
  lastAckedMutationId: null,
  lastAckedVersion: 0,
  lastSessionVersion: 0,
  nextClientSequence: 1,
  pendingMutations: new Map(),
};

function replayPendingLiveMutations() {
  if (!liveSync.connected || !liveSync.socket || liveSync.socket.readyState !== WebSocket.OPEN) {
    return;
  }
  const pendingEntries = [...liveSync.pendingMutations.values()].sort((a, b) => a.clientSequence - b.clientSequence);
  for (const entry of pendingEntries) {
    if (!entry?.wirePayload) {
      continue;
    }
    liveSync.socket.send(entry.wirePayload);
  }
}

function getAnimationStartedAtEpochMs(animation) {
  if (Number.isFinite(animation?.startedAtEpochMs)) {
    return Number(animation.startedAtEpochMs);
  }
  const startedAt = Number(animation?.startedAt);
  if (!Number.isFinite(startedAt)) {
    return Date.now();
  }
  return Date.now() - (performance.now() - startedAt);
}

function buildRuntimeSnapshotForLiveSync() {
  return {
    boardId: state.boardId,
    selectedBoard: state.selectedBoard ?? state.boardId,
    selectedLayout: state.selectedLayout ?? state.boardId,
    selectedRoomId: state.selectedRoomId,
    selectedRoomByBoard: state.selectedRoomByBoard,
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
  };
}

function buildAnimationSnapshotForLiveSync(animation) {
  if (!animation || typeof animation !== "object") {
    return null;
  }
  return {
    ...animation,
    startedAtEpochMs: getAnimationStartedAtEpochMs(animation),
  };
}

function emitLiveMutation(mutationType, payload = {}) {
  if (!liveSync.connected || !liveSync.socket || liveSync.socket.readyState !== WebSocket.OPEN) {
    return;
  }
  const mutationId = `m-${Date.now().toString(36)}-${liveSync.nextClientSequence.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const clientSequence = liveSync.nextClientSequence;
  liveSync.nextClientSequence += 1;
  liveSync.pendingMutations.set(mutationId, {
    mutationType,
    queuedAt: Date.now(),
    clientSequence,
    wirePayload: null,
  });
  const wirePayload = JSON.stringify({
    type: "live-mutation",
    mutationId,
    clientSequence,
    mutationType,
    payload: {
      ...payload,
      baseVersion: liveSync.lastSessionVersion,
      runtime: buildRuntimeSnapshotForLiveSync(),
    },
  });
  liveSync.pendingMutations.set(mutationId, {
    mutationType,
    queuedAt: Date.now(),
    clientSequence,
    wirePayload,
  });
  liveSync.socket.send(wirePayload);
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

function hydrateRunningAnimationStartTimestamps(runningAnimations) {
  return (Array.isArray(runningAnimations) ? runningAnimations : []).map((animation) => {
    const startedAtEpochMs = getAnimationStartedAtEpochMs(animation);
    const ageMs = Math.max(0, Date.now() - startedAtEpochMs);
    return {
      ...animation,
      startedAtEpochMs,
      startedAt: performance.now() - ageMs,
    };
  });
}

function applyLiveRuntimeSnapshot(snapshot, { version = null } = {}) {
  if (Number.isFinite(version) && Number(version) < liveSync.lastSessionVersion) {
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
  const selectedBoard =
    (typeof snapshot?.selectedBoard === "string" && snapshot.selectedBoard) ||
    (typeof snapshot?.selectedLayout === "string" && snapshot.selectedLayout) ||
    (typeof runtime.selectedBoard === "string" && runtime.selectedBoard) ||
    (typeof runtime.selectedLayout === "string" && runtime.selectedLayout) ||
    (typeof runtime.boardId === "string" && runtime.boardId) ||
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
  state.runningAnimations = hydrateRunningAnimationStartTimestamps(runtime.runningAnimations);
  state.roomDraft = {
    ...state.roomDraft,
    ...(runtime.roomDraft && typeof runtime.roomDraft === "object" ? runtime.roomDraft : {}),
  };
  state.animationSpeed = clampAnimationSpeed(runtime.animationSpeed ?? state.animationSpeed);
  if (runtime.audio && typeof runtime.audio === "object") {
    state.audio.enabled = Boolean(runtime.audio.enabled);
    state.audio.volume = clampAudioVolumePercent(Math.round(Number(runtime.audio.volume ?? state.audio.volume) * 100)) / 100;
  }
  if (typeof snapshot?.alignMode === "boolean") {
    state.alignMode = snapshot.alignMode;
  } else if (typeof runtime.alignMode === "boolean") {
    state.alignMode = runtime.alignMode;
  }
  enforceAudioLifecycleGuard();
  stopSoundsForInactiveAnimations();
  for (const animation of state.runningAnimations) {
    playSoundForAnimation(animation);
  }
  syncRuntimePanelsFromState();
  renderRunningAnimationsList();
  refreshGlobalButtons();
  renderRoomOverlay();
  if (Number.isFinite(version)) {
    liveSync.lastSessionVersion = Math.max(liveSync.lastSessionVersion, Number(version));
  }
  return true;
}

function connectLiveSyncSocket() {
  try {
    const socket = new WebSocket(resolveLiveWebSocketUrl());
    liveSync.socket = socket;
    socket.addEventListener("open", () => {
      liveSync.connected = true;
    });
    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === "live-hello") {
          liveSync.clientId = payload.clientId ?? null;
          applyLiveRuntimeSnapshot(payload?.session?.snapshot, {
            version: payload?.session?.version,
          });
          replayPendingLiveMutations();
        }
        if (payload?.type === "live-ack") {
          liveSync.lastAckAt = Date.now();
          if (typeof payload?.mutationId === "string") {
            liveSync.pendingMutations.delete(payload.mutationId);
            liveSync.lastAckedMutationId = payload.mutationId;
          }
          if (Number.isFinite(payload?.version)) {
            const version = Number(payload.version);
            liveSync.lastAckedVersion = Math.max(liveSync.lastAckedVersion, version);
            liveSync.lastSessionVersion = Math.max(liveSync.lastSessionVersion, version);
          }
        }
        if (payload?.type === "live-session-update") {
          applyLiveRuntimeSnapshot(payload?.session?.snapshot, {
            version: payload?.session?.version,
          });
        }
      } catch {
        // ignore malformed live-sync payloads
      }
    });
    socket.addEventListener("close", () => {
      liveSync.connected = false;
      window.setTimeout(connectLiveSyncSocket, 1200);
    });
    socket.addEventListener("error", () => {
      liveSync.connected = false;
    });
  } catch {
    liveSync.connected = false;
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
const audioAssetCursorByEffect = {};
const audioAssetVoiceCursorByPath = {};
const activeAnimationAudioById = new Map();
const pendingAnimationAudioStartTimers = new Map();

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
        .filter((board) => board?.id && Array.isArray(board.rooms) && board.rooms.length > 0);
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
  syncBoardSelectOptions();
  if (parsed?.boardId && BOARDS.some((board) => board.id === parsed.boardId)) {
    switchBoard(parsed.boardId, { emitLiveContext: true, reason: "board-import" });
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

function clampBoardZoomScale(value) {
  return Math.max(1, Math.min(3, value));
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

function getPolygonEditorHandleMetrics(zoomScale, handleScale = 1) {
  const safeZoomScale = Math.max(0.1, Number(zoomScale) || 1);
  const inverseZoom = 1 / safeZoomScale;
  const normalizedHandleScale = clampPolygonHandleScale(handleScale);
  return {
    edgeHitRadius: Math.max(8, 12 * inverseZoom) * normalizedHandleScale,
    edgeHandleRadius: Math.max(4, 5.5 * inverseZoom) * normalizedHandleScale,
    vertexHitRadius: Math.max(10, 16 * inverseZoom) * normalizedHandleScale,
    vertexHandleRadius: Math.max(5, 7.5 * inverseZoom) * normalizedHandleScale,
    vertexLabelSize: Math.max(9, 11 * inverseZoom) * Math.max(0.9, normalizedHandleScale * 0.95),
  };
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
  return [
    clampRoomAbsoluteCoordinate(Number(point?.[0]) || 0.5),
    clampRoomAbsoluteCoordinate(Number(point?.[1]) || 0.5),
  ];
}

function normalizeSpecialPolygon(points, fallbackPoints = []) {
  const source = Array.isArray(points) && points.length >= 3 ? points : fallbackPoints;
  const normalized = source.map((entry) => normalizePolygonPoint(entry));
  if (normalized.length >= 3) {
    return normalized;
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
    const primaryPlayAreaPolygon = isValidSpecialPolygon(primary.playAreaPolygon)
      ? primary.playAreaPolygon
      : isValidSpecialPolygon(primary.shipPolygon)
        ? primary.shipPolygon
        : null;
    const fallbackPlayAreaPolygon = isValidSpecialPolygon(fallback.playAreaPolygon)
      ? fallback.playAreaPolygon
      : isValidSpecialPolygon(fallback.shipPolygon)
        ? fallback.shipPolygon
        : null;
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
      playAreaPolygon: primaryPlayAreaPolygon ?? fallbackPlayAreaPolygon ?? SHIP_POLYGON_DEFAULT,
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

function createDefaultShipPolygonsByBoard() {
  return Object.fromEntries(BOARDS.map((board) => [board.id, normalizeShipPolygon(SHIP_POLYGON_DEFAULT)]));
}

function getShipPolygonPoints(boardId = state.boardId) {
  return normalizeShipPolygon(state.shipPolygonsByBoard[boardId]);
}

function setShipPolygonPoints(boardId, points) {
  state.shipPolygonsByBoard[boardId] = normalizeShipPolygon(points);
}

function normalizeOutsideFxProfile(profile) {
  return {
    enabled: Boolean(profile?.enabled),
    intensity: clampOutsideIntensity(profile?.intensity),
    speed: clampOutsideSpeed(profile?.speed),
    mode: normalizeOutsideMode(profile?.mode),
    direction: normalizeOutsideDirection(profile?.direction),
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
  setOutsideFxProfile(boardId, { ...current, ...partial });
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
        playAreaPolygon: normalizeShipPolygon(SHIP_POLYGON_DEFAULT),
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
        playAreaPolygon: normalizeShipPolygon(state.shipPolygonsByBoard[board.id]),
        outsideFx: normalizeOutsideFxProfile(state.outsideFxByBoard[board.id]),
      },
    ]),
  );
}

function buildPersistedRuntimeSettingsFromState() {
  return {
    audio: {
      enabled: Boolean(state.audio.enabled),
      volume: Math.max(0, Math.min(1, Number(state.audio.volume) || 0)),
    },
    animationSpeed: clampAnimationSpeed(state.animationSpeed),
    animationSoundMap: normalizeAnimationSoundMap(state.animationSoundMap),
  };
}

function buildBoardProfileStoragePayload() {
  return {
    schema: "tt-beamer.board-profiles.v2",
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
  state.shipPolygonsByBoard = Object.fromEntries(
    BOARDS.map((board) => [
      board.id,
      normalizeShipPolygon(
        profiles?.[board.id]?.playAreaPolygon ?? profiles?.[board.id]?.shipPolygon ?? profiles?.[board.id]?.shipMask,
      ),
    ]),
  );
  state.outsideFxByBoard = Object.fromEntries(
    BOARDS.map((board) => [board.id, normalizeOutsideFxProfile(profiles?.[board.id]?.outsideFx)]),
  );
}

function extractBoardProfilesCandidate(raw) {
  return extractBoardProfilesCandidateFromPersistence(raw, BOARDS);
}

function loadLegacyRoomGeometryByBoard() {
  return loadLegacyRoomGeometryByBoardFromPersistence({
    storage: window.localStorage,
    key: ROOM_GEOMETRY_STORAGE_KEY,
    boards: BOARDS,
    createDefault: createDefaultRoomGeometryByBoard,
    normalizeMap: normalizeRoomGeometryMap,
  });
}

function loadLegacySpecialPolygonsByBoard() {
  return loadLegacySpecialPolygonsByBoardFromPersistence({
    storage: window.localStorage,
    key: SPECIAL_POLYGON_STORAGE_KEY,
    boards: BOARDS,
    createDefault: createDefaultSpecialPolygonsByBoard,
    normalizeMap: normalizeSpecialPolygonMap,
  });
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
    OUTSIDE_FX_DEFAULT,
  });
}

function loadBoardProfiles() {
  const legacyHitarea = loadHitareaCalibrationMap();
  const legacyRoomGeometry = loadLegacyRoomGeometryByBoard();
  const legacySpecialPolygons = loadLegacySpecialPolygonsByBoard();

  try {
    const raw = window.localStorage.getItem(BOARD_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const candidate = extractBoardProfilesCandidate(parsed);
      if (candidate) {
        const migratedProfiles = buildMigratedBoardProfiles(
          candidate,
          legacyHitarea,
          legacyRoomGeometry,
          legacySpecialPolygons,
        );
        applyBoardProfilesToState(migratedProfiles);
        applyPersistedRuntimeSettings(parsed);
        persistBoardProfiles();
        return;
      }
    }
  } catch {
    // ignore and continue with fallback/defaults
  }

  const migratedLegacyProfiles = buildMigratedBoardProfiles(
    null,
    legacyHitarea,
    legacyRoomGeometry,
    legacySpecialPolygons,
  );
  applyBoardProfilesToState(migratedLegacyProfiles);
  persistBoardProfiles();
}

function persistBoardProfiles() {
  return writePersistenceJson(window.localStorage, BOARD_PROFILE_STORAGE_KEY, buildBoardProfileStoragePayload());
}

function buildGlobalDefaultsPayload() {
  let localStorageProfiles = null;
  try {
    const raw = window.localStorage.getItem(BOARD_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const candidate = extractBoardProfilesCandidate(parsed);
      if (candidate) {
        localStorageProfiles = buildMigratedBoardProfiles(
          candidate,
          state.hitareaCalibrationByBoard,
          state.roomGeometryByBoard,
          state.specialPolygonsByBoard,
        );
      }
    }
  } catch {
    localStorageProfiles = null;
  }

  const stateProfiles = buildBoardProfilesFromState();
  const mergedProfiles = mergeBoardProfilesForGlobalExport(stateProfiles, localStorageProfiles);

  return {
    schema: "tt-beamer.global-defaults.v1",
    savedAt: new Date().toISOString(),
    source: "browser-local-state",
    boardProfiles: mergedProfiles,
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
    apiBaseStorageKey: API_BASE_STORAGE_KEY,
    apiBaseUrlParamKeys: API_BASE_URL_PARAM_KEYS,
    apiPortFallbacks: API_PORT_FALLBACKS,
    localApiHosts: LOCAL_API_HOSTS,
    requestTimeoutMs: API_REQUEST_TIMEOUT_MS,
    fetchWithTimeout,
    location: window.location,
    localStorage: window.localStorage,
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

  try {
    const localBase = normalizeApiBase(window.localStorage.getItem(API_BASE_STORAGE_KEY));
    if (localBase) {
      return {
        base: localBase,
        source: `override:localStorage(${API_BASE_STORAGE_KEY})`,
      };
    }
  } catch {
    // ignore localStorage failures
  }

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
  try {
    const raw = window.localStorage.getItem(BOARD_PROFILE_STORAGE_KEY);
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw);
    const candidate = extractBoardProfilesCandidate(parsed);
    if (!candidate || typeof candidate !== "object") {
      return false;
    }
    return BOARDS.some((board) => candidate[board.id] && typeof candidate[board.id] === "object");
  } catch {
    return false;
  }
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
    applyBoardProfilesToState(migratedProfiles);
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

async function autoLoadGlobalDefaultsForFreshDevice() {
  if (hasStoredBoardProfilesInLocalStorage()) {
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
  return loadHitareaCalibrationMapFromPersistence({
    storage: window.localStorage,
    key: HITAREA_CALIBRATION_STORAGE_KEY,
    boards: BOARDS,
    createDefault: createDefaultHitareaCalibrationMap,
    normalize: normalizeHitareaCalibration,
  });
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
  boardZoomStatus.textContent = `Zoom: ${percent}% (Min 100%, Max 300%) | Pan X ${Math.round(zoom.panX)}px, Y ${Math.round(zoom.panY)}px | Bounds ±${Math.round(bounds.maxPanX)}px/±${Math.round(bounds.maxPanY)}px`;
  if (boardPanStatus) {
    const hint = zoom.scale > 1
      ? "Space + drag or middle mouse button: move board"
      : "Pan is available above zoom > 100%";
    boardPanStatus.textContent = `Pan status: ${modeLabel} | ${hint}`;
  }
}

function syncBoardZoomPanel() {
  const zoom = getBoardZoom(state.boardId);
  const percent = Math.round(zoom.scale * 100);
  boardZoomRangeInput.value = String(percent);
  boardZoomValue.textContent = `${percent}%`;
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

function isGifRoomAnimation(type) {
  return Boolean(ROOM_GIF_ANIMATION_ASSETS[type]);
}

function isRoomAnimationType(type) {
  return ROOM_ANIMATIONS.some((entry) => entry.id === type);
}

function isRoomGlobalEquivalent(type) {
  return Boolean(ROOM_GLOBAL_EQUIVALENT_MAP[type]);
}

function resolveRoomAnimationEffectType(type) {
  if (type === "nest") {
    return "special-nest";
  }
  if (type === "dekompression") {
    return "special-decompression";
  }
  return ROOM_GLOBAL_EQUIVALENT_MAP[type] ?? type;
}

function getRoomEquivalentType(type) {
  return ROOM_GLOBAL_EQUIVALENT_MAP[type] ?? null;
}

function getRoomGifAssetFileName(type) {
  const path = ROOM_GIF_ANIMATION_ASSETS[type];
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
      console.warn(`GIF decode failed for ${path}`, error);
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

function clampRoomSpeed(value) {
  return Math.max(0.1, Math.min(2.5, Number(value) || 1));
}

function clampRoomSoundVolume(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
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

function syncMobileStickyOffsets() {
  if (!controlPanel) {
    return;
  }
  controlPanel.style.setProperty("--mobile-projection-offset", "0px");
  controlPanel.style.setProperty("--mobile-nav-offset", "0px");
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
      console.error(`Navigation visibility violation (${context})`, issues);
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
      console.error(`Mobile projection visibility violation (${context})`, issues);
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
  const now = performance.now();
  const lastAt = state.touchActionGuard[actionKey] ?? 0;
  if (now - lastAt < thresholdMs) {
    return true;
  }
  state.touchActionGuard[actionKey] = now;
  return false;
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
  return Math.max(0.68, Math.min(1, Number(state.runtimePerf.qualityScale) || 1));
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
  const targetMs = 16.7;
  if (p90 > targetMs * 1.25) {
    state.runtimePerf.qualityScale = Math.max(0.68, getRuntimeQualityScale() - 0.03);
  } else if (p90 < targetMs * 0.92) {
    state.runtimePerf.qualityScale = Math.min(1, getRuntimeQualityScale() + 0.015);
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

function recordTriggerIntent() {
  state.mobilePerf.pendingTriggerAt = performance.now();
}

function executeClearAll() {
  for (const animation of state.runningAnimations) {
    stopAnimationSound(animation.id);
  }
  for (const board of BOARDS) {
    updateOutsideFxProfile(board.id, { enabled: false });
  }
  persistBoardProfiles();
  state.runningAnimations = [];
  clearRoomDraftEditTarget();
  ashParticles.length = 0;
  syncOutsideFxPanel();
  renderRunningAnimationsList();
  refreshGlobalButtons();
  triggerFeedback.textContent = "Status: Clear All executed";
  emitLiveMutation("clear-all", {});
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
  const leaks = [];
  for (const id of SETTINGS_EXCLUSIVE_CONTROL_IDS) {
    const element = document.getElementById(id);
    if (!element) {
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
      console.error(`Settings ownership violation (${context})`, leaks);
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
      console.error(`View exclusivity violation (${context})`, leaks);
      triggerFeedback.textContent = "Status: Tab exclusivity violated (visible leftover block detected)";
    }
    return false;
  }
  return validateSettingsControlOwnership({ silent, context });
}

function setActiveView(view, { skipGuard = false } = {}) {
  const nextView = view === "settings" ? "settings" : "dashboard";
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
    console.error("Layout regression violation", issues);
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
    console.error("Startup defaults guard violation", {
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
    console.error("Zoom+Pan+Edit regression violation", issues);
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
    console.error("Pan pointer regression violation", issues);
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
    console.error("Orientation regression violation", { before, after });
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
    console.error("Navigation regression violation", {
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
    console.error("Outside isolation regression violation", issues);
    return false;
  }
  return true;
}

function runShipClipRegression() {
  const boardId = state.boardId;
  const previousShipPolygon = getShipPolygonPoints(boardId);
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

    state.shipPolygonsByBoard[boardId] = [
      [0.2, 0.2],
      [0.8, 0.8],
    ];

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
    setShipPolygonPoints(boardId, previousShipPolygon);
  }

  if (issues.length > 0) {
    console.error("Ship clip regression violation", issues);
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
  if (!arePlayAreaVerticesEditable()) {
    shipPolygonEditorStatus.textContent = "Play Area editor: vertices hidden (editing disabled)";
    return;
  }
  const activeVertex = Math.max(0, Math.min(points.length - 1, state.shipPolygonEditor.selectedVertexIndex));
  const activeEdge = Math.max(0, Math.min(points.length - 1, state.shipPolygonEditor.selectedEdgeIndex));
  const handleSize = Math.round(getCurrentPolygonHandleScale() * 100);
  shipPolygonEditorStatus.textContent =
    `Play Area editor: ${points.length} vertices | active vertex ${activeVertex + 1} | edge ${activeEdge + 1} | handle ${handleSize}%`;
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

function syncOutsideFxPanel() {
  const outside = getOutsideFxProfile(state.boardId);
  outsideEnabledInput.checked = outside.enabled;
  outsideIntensityInput.value = String(outside.intensity);
  outsideSpeedInput.value = String(outside.speed);
  outsideModeInput.value = outside.mode;
  outsideDirectionInput.value = outside.direction;
  outsideIntensityValue.textContent = outside.intensity.toFixed(2);
  outsideSpeedValue.textContent = `${outside.speed.toFixed(2)}x`;
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
  const points = getShipPolygonPoints(state.boardId).map(([x, y]) => [x * 1000, y * 1000]);
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

  const maskPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  maskPolygon.classList.add("ship-zone-mask");
  maskPolygon.setAttribute("points", points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
  roomOverlay.append(maskPolygon);

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
      if (isPanArbitrating() || event.button !== 0 || !arePlayAreaVerticesEditable()) {
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
      if (isPanArbitrating() || event.button !== 0 || !arePlayAreaVerticesEditable()) {
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
      if (isPanArbitrating() || event.button !== 0 || !areRoomVerticesEditable()) {
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
      if (isPanArbitrating() || event.button !== 0 || !areRoomVerticesEditable()) {
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
  if (typeof roomOverlay.createSVGPoint === "function") {
    const svgPoint = roomOverlay.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const ctm = roomOverlay.getScreenCTM();
    if (ctm && typeof ctm.inverse === "function") {
      const local = svgPoint.matrixTransform(ctm.inverse());
      return [
        clampRoomAbsoluteCoordinate(local.x / 1000),
        clampRoomAbsoluteCoordinate(local.y / 1000),
      ];
    }
  }
  const rect = roomOverlay.getBoundingClientRect();
  const rawX = (event.clientX - rect.left) / rect.width;
  const rawY = (event.clientY - rect.top) / rect.height;
  return [clampRoomAbsoluteCoordinate(rawX), clampRoomAbsoluteCoordinate(rawY)];
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
  if (animation.scope === "cluster") {
    return;
  }
  const startDelayMs = Math.max(0, Math.ceil((Number(animation.startedAt) || 0) - performance.now()));
  if (startDelayMs > 0) {
    stopAnimationSound(animation.id);
    const timerId = window.setTimeout(() => {
      pendingAnimationAudioStartTimers.delete(animation.id);
      const stillRunning = state.runningAnimations.some((item) => item.id === animation.id);
      if (!stillRunning) {
        return;
      }
      playSoundForAnimation(animation);
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
  });
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
  return getRoomPoints(room, boardId).map(([x, y]) => [
    (x / 1000) * width,
    (y / 1000) * height,
  ]);
}

function getShipPolygonPixels(width = canvas.width, height = canvas.height, boardId = state.boardId) {
  return getShipPolygonPoints(boardId).map(([x, y]) => [x * width, y * height]);
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
    polygon.addEventListener("click", () => {
      if (performance.now() < (state.polygonEditor.suppressRoomClickUntil || 0)) {
        return;
      }
      if (isPanArbitrating()) {
        return;
      }
      state.selectedRoomId = room.id;
      state.selectedRoomByBoard[state.boardId] = room.id;
      state.roomDraft.targetType = "room";
      state.roomDraft.targetId = room.id;
      state.polygonEditor.vertexSelectionActive = false;
      syncPolygonRoomSelection(room.id);
      syncPolygonEditorPanel();
      syncRoomPanelFromSelection({ preserveDraftState: true });
      renderRoomOverlay();
    });
    polygon.addEventListener("pointerdown", (event) => {
      if (state.uiView !== "settings" || isPanArbitrating() || event.button !== 0 || !areRoomVerticesEditable()) {
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
  emitLiveMutation("context-update", {
    reason,
    selectedBoard: boardId,
    selectedLayout: boardId,
    boardId,
    layoutId: boardId,
  });
}

function switchBoard(boardId, { emitLiveContext = false, reason = "board-switch" } = {}) {
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
  syncRoomPanelFromSelection();
  syncHitareaCalibrationPanel();
  syncRoomGeometryPanel();
  syncPolygonEditorPanel();
  syncShipPolygonEditorPanel();
  syncOutsideFxPanel();
  syncOutsideRuntimeMirror(board.id);
  syncBoardZoomPanel();
  setPanCursorState();
  renderRoomOverlay();
  refreshGlobalButtons();
  triggerFeedback.textContent = "Status: board switched";
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

function buildClusterDispatchPlan(roomIds, { staggerStart = false } = {}) {
  const normalizedRoomIds = Array.from(new Set((Array.isArray(roomIds) ? roomIds : [])
    .map((roomId) => String(roomId || "").trim())
    .filter(Boolean)));
  return normalizedRoomIds.map((roomId) => ({
    roomId,
    startDelayMs: staggerStart ? Math.floor(Math.random() * 280) + 40 : 0,
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
  if (directMembers.length > 0) {
    return directMembers;
  }
  return state.runningAnimations
    .filter((entry) => entry?.scope === "room" && entry?.parentClusterRunId === clusterAnimation.id)
    .map((entry) => entry.id);
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
  }
}

function syncRoomPanelFromSelection({ preserveDraftState = false } = {}) {
  const room = getSelectedRoom();
  if (!room) {
    roomSelected.textContent = "Selected room: click a room polygon on the board";
    startRoomAnimationButton.disabled = true;
    roomOpacityInput.disabled = true;
    roomPlaybackSpeedInput.disabled = true;
    if (roomTargetSelect) {
      roomTargetSelect.disabled = false;
    }
    syncRoomTargetSelect();
    if (roomStaggerStartInput) {
      roomStaggerStartInput.disabled = state.roomDraft.targetType !== "cluster";
    }
    syncRoomGeometryPanel();
    syncDashboardZoneVisibility();
    return;
  }
  startRoomAnimationButton.disabled = false;
  roomOpacityInput.disabled = false;
  roomPlaybackSpeedInput.disabled = false;
  if (roomTargetSelect) {
    roomTargetSelect.disabled = false;
  }
  if (roomStaggerStartInput) {
    roomStaggerStartInput.disabled = false;
  }
  if (!preserveDraftState) {
    state.roomDraft.animationId = ROOM_ANIMATIONS.some((entry) => entry.id === state.roomDraft.animationId)
      ? state.roomDraft.animationId
      : ROOM_ANIMATIONS[0].id;
  }
  roomAnimationSelect.value = state.roomDraft.animationId;
  roomOpacityInput.value = String(clampRoomOpacity(state.roomDraft.opacity));
  roomOpacityValue.textContent = clampRoomOpacity(state.roomDraft.opacity).toFixed(2);
  roomPlaybackSpeedInput.value = String(clampGifPlaybackSpeed(state.roomDraft.playbackSpeed));
  roomPlaybackSpeedValue.textContent = `${clampGifPlaybackSpeed(state.roomDraft.playbackSpeed).toFixed(2)}x`;
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
  syncGifRoomControls();
  roomHoldInput.checked = true;
  state.roomDraft.staggerStart = Boolean(state.roomDraft.staggerStart);
  if (roomStaggerStartInput) {
    roomStaggerStartInput.checked = state.roomDraft.staggerStart;
    roomStaggerStartInput.disabled = state.roomDraft.targetType !== "cluster";
  }
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

function syncGifRoomControls() {
  const isGif = isGifRoomAnimation(state.roomDraft.animationId);
  roomOpacityInput.disabled = !isGif;
  roomPlaybackSpeedInput.disabled = !isGif;
}

function clearRoomDraftEditTarget() {
  state.roomDraft.editTargetId = null;
  syncRoomDraftActionButton();
}

function createAnimation({
  type,
  scope,
  boardId = state.boardId,
  roomId = null,
  intensity = 0.8,
  speed = 1,
  opacity = 0.9,
  playbackSpeed = 1,
  soundVolume = 1,
  hold = false,
  durationSec = 15,
  startDelayMs = 0,
}) {
  const normalizedStartDelayMs = Math.max(0, Number(startDelayMs) || 0);
  const startedAt = performance.now() + normalizedStartDelayMs;
  const startedAtEpochMs = Date.now() + normalizedStartDelayMs;
  const effectiveHold = scope === "room" ? true : hold;
  return {
    id: `anim-${animationIdCounter++}`,
    boardId,
    type,
    scope,
    roomId,
    intensity,
    speed: clampRoomSpeed(speed),
    opacity: clampRoomOpacity(opacity),
    playbackSpeed: clampGifPlaybackSpeed(playbackSpeed),
    soundVolume: clampRoomSoundVolume(soundVolume),
    hold: effectiveHold,
    durationMs: effectiveHold ? null : Math.max(1000, durationSec * 1000),
    startedAt,
    startedAtEpochMs,
  };
}

function drawRoomComposition(animation, age, room, roomMetrics) {
  const qualityScale = getRuntimeQualityScale();
  const effectType = resolveRoomAnimationEffectType(animation.type);
  const playbackSpeed = clampGifPlaybackSpeed(animation.playbackSpeed ?? 1);
  const playbackAge = isGifRoomAnimation(animation.type)
    ? age
    : age * clampGifPlaybackSpeed(animation.playbackSpeed ?? animation.speed ?? 1);
  drawEffectVisual(
    effectType,
    playbackAge,
    animation.intensity,
    room,
    roomMetrics,
    {
      densityFactor: qualityScale,
      opacity: clampRoomOpacity(animation.opacity),
      gifAssetPath: ROOM_GIF_ANIMATION_ASSETS[animation.type],
      gifTimelineAgeSec: age,
      gifPlaybackSpeed: playbackSpeed,
      roomAnimationType: animation.type,
    },
  );
}

function upsertGlobalAnimation(type, defaultDurationSec) {
  const existing = state.runningAnimations.find(
    (anim) => anim.scope === "global" && anim.type === type && anim.boardId === state.boardId,
  );
  const isOutside = getGlobalAnimationCategory(type) === "outside-ship";
  if (existing) {
    stopAnimationSound(existing.id);
    state.runningAnimations = state.runningAnimations.filter((anim) => anim.id !== existing.id);
    if (isOutside) {
      updateOutsideFxProfile(existing.boardId, { enabled: false });
      persistBoardProfiles();
      syncOutsideFxPanel();
    }
    triggerFeedback.textContent = `Status: ${getAnimationLabel(type)} stopped`;
  } else {
    const animation = createAnimation({
      type,
      scope: "global",
      intensity: 1,
      hold: defaultDurationSec === null,
      durationSec: defaultDurationSec ?? 0,
    });
    state.runningAnimations.push(animation);
    if (isOutside) {
      updateOutsideFxProfile(animation.boardId, { enabled: true });
      persistBoardProfiles();
      syncOutsideFxPanel();
    }
    playSoundForAnimation(animation);
    triggerFeedback.textContent = `Status: ${getAnimationLabel(type)} started`;
  }
  renderRunningAnimationsList();
  refreshGlobalButtons();
  emitLiveMutation("trigger-global", {
    animationType: type,
  });
}

function startRoomAnimationFromDraft() {
  const board = getBoard();

  if (!isRoomAnimationType(state.roomDraft.animationId)) {
    state.roomDraft.animationId = ROOM_ANIMATIONS[0]?.id ?? "kaputt";
    roomAnimationSelect.value = state.roomDraft.animationId;
  }

  const draftPayload = {
    type: state.roomDraft.animationId,
    intensity: clampRoomIntensity(state.roomDraft.intensity),
    speed: clampRoomSpeed(state.roomDraft.speed),
    opacity: clampRoomOpacity(state.roomDraft.opacity),
    playbackSpeed: clampGifPlaybackSpeed(state.roomDraft.playbackSpeed),
    soundVolume: clampRoomSoundVolume(state.roomDraft.soundVolume),
    hold: true,
    durationMs: null,
  };

  state.roomDraft.animationId = draftPayload.type;
  state.roomDraft.intensity = draftPayload.intensity;
  state.roomDraft.speed = draftPayload.speed;
  state.roomDraft.opacity = draftPayload.opacity;
  state.roomDraft.playbackSpeed = draftPayload.playbackSpeed;
  state.roomDraft.soundVolume = draftPayload.soundVolume;

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

  if (state.roomDraft.editTargetId) {
    if (state.roomDraft.targetType === "cluster") {
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
  const dispatchPlan = state.roomDraft.targetType === "cluster"
    ? buildClusterDispatchPlan(targetRoomIds, { staggerStart: shouldStaggerClusterStart })
    : targetRoomIds.map((roomId) => ({ roomId, startDelayMs: 0 }));
  const createdAnimations = dispatchPlan.map(({ roomId, startDelayMs }) => createAnimation({
    type: draftPayload.type,
    scope: "room",
    roomId,
    intensity: draftPayload.intensity,
    speed: draftPayload.speed,
    opacity: draftPayload.opacity,
    playbackSpeed: draftPayload.playbackSpeed,
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
      scope: "cluster",
      roomId: null,
      boardId: state.boardId,
      intensity: draftPayload.intensity,
      speed: draftPayload.speed,
      opacity: draftPayload.opacity,
      playbackSpeed: draftPayload.playbackSpeed,
      soundVolume: draftPayload.soundVolume,
      hold: true,
      durationSec: 0,
      startDelayMs: 0,
    });
    clusterRunAnimation.clusterId = cluster?.clusterId ?? state.roomDraft.targetId;
    clusterRunAnimation.clusterName = cluster?.name ?? "Cluster";
    clusterRunAnimation.clusterStartMode = shouldStaggerClusterStart ? "staggered" : "synchronous";
    clusterRunAnimation.memberRoomIds = dispatchPlan.map((entry) => entry.roomId);
    clusterRunAnimation.memberAnimationIds = createdAnimations.map((entry) => entry.id);
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
    ? `Status: ${ROOM_ANIMATIONS.find((item) => item.id === draftPayload.type)?.label ?? draftPayload.type} started for cluster ${targetLabel} (${createdAnimations.length} rooms, ${clusterStartModeLabel})`
    : `Status: ${ROOM_ANIMATIONS.find((item) => item.id === draftPayload.type)?.label ?? draftPayload.type} started for ${targetLabel}`;
  renderRunningAnimationsList();
}

function stopAnimation(animationId) {
  const target = state.runningAnimations.find((item) => item.id === animationId) ?? null;
  if (!target) {
    return;
  }
  const idsToStop = new Set([animationId]);
  if (target.scope === "cluster") {
    for (const memberId of getClusterMemberAnimationIds(target)) {
      idsToStop.add(memberId);
    }
  }
  if (target.scope === "room" && target.parentClusterRunId) {
    const parentCluster = state.runningAnimations.find(
      (entry) => entry?.id === target.parentClusterRunId && entry?.scope === "cluster",
    );
    if (parentCluster) {
      parentCluster.memberAnimationIds = getClusterMemberAnimationIds(parentCluster)
        .filter((memberId) => memberId !== target.id);
      parentCluster.memberRoomIds = (Array.isArray(parentCluster.memberRoomIds) ? parentCluster.memberRoomIds : [])
        .filter((roomId) => roomId !== target.roomId);
      if (parentCluster.memberAnimationIds.length === 0) {
        idsToStop.add(parentCluster.id);
      }
    }
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
    emitLiveMutation("stop-animation", {
      animationId: id,
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
  state.roomDraft.editTargetId = animation.id;
  state.roomDraft.animationId = animation.type;
  state.roomDraft.opacity = clampRoomOpacity(animation.opacity ?? 0.9);
  state.roomDraft.playbackSpeed = clampGifPlaybackSpeed(animation.playbackSpeed ?? animation.speed ?? 1);
  state.roomDraft.intensity = clampRoomIntensity(animation.intensity);
  state.roomDraft.speed = clampRoomSpeed(animation.speed ?? 1);
  state.roomDraft.soundVolume = clampRoomSoundVolume(animation.soundVolume ?? 1);
  state.roomDraft.durationSec = animation.durationMs
    ? clampRoomDurationSec(Math.round(animation.durationMs / 1000))
    : 18;
  state.roomDraft.staggerStart = isClusterScope
    ? animation.clusterStartMode === "staggered"
    : state.roomDraft.staggerStart;
  state.roomDraft.hold = true;

  roomAnimationSelect.value = state.roomDraft.animationId;
  roomOpacityInput.value = String(state.roomDraft.opacity);
  roomOpacityValue.textContent = state.roomDraft.opacity.toFixed(2);
  roomPlaybackSpeedInput.value = String(state.roomDraft.playbackSpeed);
  roomPlaybackSpeedValue.textContent = `${state.roomDraft.playbackSpeed.toFixed(2)}x`;
  roomIntensityInput.value = String(state.roomDraft.intensity);
  roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
  roomSpeedInput.value = String(state.roomDraft.speed);
  roomSpeedValue.textContent = `${state.roomDraft.speed.toFixed(2)}x`;
  roomSoundVolumeInput.value = String(Math.round(state.roomDraft.soundVolume * 100));
  roomSoundVolumeValue.textContent = `${Math.round(state.roomDraft.soundVolume * 100)}%`;
  roomDurationInput.value = String(state.roomDraft.durationSec);
  roomHoldInput.checked = true;
  if (roomStaggerStartInput) {
    roomStaggerStartInput.checked = state.roomDraft.staggerStart;
  }
  syncRoomDraftActionButton();

  syncRoomPanelFromSelection({ preserveDraftState: true });
  renderRoomOverlay();
  triggerFeedback.textContent = `Status: ${animation.id} loaded into editor${isClusterScope ? " (cluster)" : ""}`;
}

function renderRunningAnimationsList() {
  const parity = validateRunningListParity();
  runningAnimationsList.replaceChildren();
  if (state.runningAnimations.length === 0) {
    const empty = document.createElement("li");
    empty.className = "running-empty";
    empty.textContent = "No active animations";
    runningAnimationsList.append(empty);
    return;
  }

  const sortedAnimations = [...state.runningAnimations].sort((a, b) => b.startedAt - a.startedAt);
  for (const anim of sortedAnimations) {
    const li = document.createElement("li");
    li.className = "running-item";
    const title = document.createElement("div");
    title.className = "running-title";
    const effectLabel = ROOM_ANIMATIONS.find((item) => item.id === anim.type)?.label ?? anim.type;
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
      ? ` | Opacity: ${clampRoomOpacity(anim.opacity ?? 0.9).toFixed(2)} | Playback: ${clampGifPlaybackSpeed(anim.playbackSpeed ?? 1).toFixed(2)}x | Speed: ${clampRoomSpeed(anim.speed ?? 1).toFixed(2)}x${getRoomGifAssetFileName(anim.type) ? ` | GIF: ${getRoomGifAssetFileName(anim.type)}` : ""}${getRoomEquivalentType(anim.type) ? ` | GlobalEq: ${getRoomEquivalentType(anim.type)}` : ""} | Sound: ${Math.round(
        clampRoomSoundVolume(anim.soundVolume ?? 1) * 100,
      )}%`
      : anim.scope === "cluster"
        ? ` | Cluster: ${anim.clusterName ?? getClusterTargetById(anim.clusterId, anim.boardId)?.name ?? anim.clusterId ?? "unknown"} | Members: ${Math.max(
          0,
          getClusterMemberAnimationIds(anim).length,
        )} | Start: ${(anim.clusterStartMode ?? "synchronous") === "staggered" ? "staggered" : "synchronous"}`
      : "";
    meta.textContent = `Instance: ${anim.id} | Type: ${anim.type} | Board: ${getBoard(anim.boardId).label} | Intensity: ${anim.intensity.toFixed(2)}${roomMeta} | Remaining: ${remaining}`;

    const actions = document.createElement("div");
    actions.className = "running-actions";
    const stopButton = document.createElement("button");
    stopButton.type = "button";
    stopButton.textContent = "Stop";
    stopButton.addEventListener("click", () => {
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

function validateRunningListParity() {
  const seenIds = new Set();
  for (const entry of state.runningAnimations) {
    if (!entry?.id || seenIds.has(entry.id)) {
      return { ok: false, reason: "duplicate-or-missing-id" };
    }
    seenIds.add(entry.id);
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
    ctx.beginPath();
    ctx.rect(0, 0, 0, 0);
    ctx.clip();
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

function clipToRoom(room, boardId = state.boardId) {
  const polygon = getRoomPolygonPixels(room, canvas.width, canvas.height, boardId);
  return clipToPolygon(polygon);
}

function getShipClipPolygon(boardId = state.boardId) {
  const shipPolygon = getShipPolygonPixels(canvas.width, canvas.height, boardId);
  return shipPolygon.length >= 3 ? shipPolygon : null;
}

function clipToOutsideShip(boardId = state.boardId) {
  const shipPolygon = getShipClipPolygon(boardId);
  if (!shipPolygon) {
    return clipToPolygon(null);
  }
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  shipPolygon.forEach(([x, y], index) => {
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
  ctx.clip("evenodd");
  return true;
}

function clipToInsideShip(boardId = state.boardId) {
  const shipPolygon = getShipClipPolygon(boardId);
  return clipToPolygon(shipPolygon);
}

function drawAnimation(animation, now) {
  if (Number.isFinite(animation?.startedAt) && now < Number(animation.startedAt)) {
    return;
  }
  if (animation.scope === "cluster") {
    return;
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
    drawEffectVisual(animation.type, age, animation.intensity, null);
  } finally {
    ctx.restore();
  }
}

function drawAnimationSafely(animation, now) {
  try {
    drawAnimation(animation, now);
    return true;
  } catch (error) {
    console.error(`Animation ${animation.id} failed`, error);
    return false;
  }
}

function drawOutsideFxLayer(now) {
  const outside = getOutsideFxProfile(state.boardId);
  if (!outside.enabled) {
    return;
  }
  ctx.save();
  try {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.filter = "none";
    const clipped = clipToOutsideShip(state.boardId);
    if (!clipped) {
      return;
    }
    drawEffectVisual(
      "outside-space",
      (now / 1000) * outside.speed * state.animationSpeed,
      outside.intensity,
      null,
      null,
      {
        outsideMode: outside.mode,
        outsideSpeed: outside.speed,
        outsideDirection: outside.direction,
      },
    );
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
      const starCount = Math.max(24, Math.round(layer.density * intensity));
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

    const expressLanes = Math.max(6, Math.round((immersive ? 14 : 9) * intensity));
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

  if (type === "ambient-drift") {
    const alpha = (0.07 + Math.sin(age * 1.4) * 0.03) * intensity;
    const g = ctx.createRadialGradient(w * 0.52, h * 0.56, h * 0.03, w * 0.52, h * 0.56, h * 0.9);
    g.addColorStop(0, `rgba(95, 145, 180, ${alpha})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  if (type === "ash-fall") {
    if (Math.random() > 0.72) {
      ashParticles.push({
        x: Math.random() * w,
        y: -8,
        life: 1,
        size: 0.8 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.3 + Math.random() * 0.7,
      });
    }
    for (let i = ashParticles.length - 1; i >= 0; i -= 1) {
      const p = ashParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.006;
      if (p.life <= 0) {
        ashParticles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = `rgba(204, 221, 239, ${p.life * 0.42 * intensity})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    return;
  }

  if (type === "hull-flicker") {
    const timeline = age * (1.2 + intensity * 1.1);
    const step = Math.floor(timeline * 26);
    const burstSeed = flickerNoise(step + 17.13);
    const colorSeed = flickerNoise(step * 0.87 + 91.4);
    const sparkSeed = flickerNoise(step * 1.47 + 211.8);

    const ambientAlpha = (0.02 + flickerNoise(step * 0.23 + 8.1) * 0.035) * intensity;
    const burstAlpha = burstSeed > 0.86 ? (0.14 + burstSeed * 0.26) * intensity : 0;
    const dipAlpha = burstSeed < 0.12 ? 0.18 + (0.12 - burstSeed) * 0.9 : 0;

    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.72, dipAlpha)})`;
    ctx.fillRect(0, 0, w, h);

    const cool = colorSeed > 0.58;
    const overlayColor = cool ? "122, 246, 228" : "255, 232, 182";
    const overlayAlpha = Math.min(0.38, ambientAlpha + burstAlpha);
    if (overlayAlpha > 0.008) {
      ctx.fillStyle = `rgba(${overlayColor}, ${overlayAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (sparkSeed > 0.68) {
      const sparkCount = 2 + Math.floor(sparkSeed * 6);
      for (let i = 0; i < sparkCount; i += 1) {
        const sparkX = flickerNoise(step * 2.31 + i * 13.7) * w;
        const sparkY = flickerNoise(step * 3.11 + i * 7.3) * h;
        const sparkSize = 12 + flickerNoise(step * 5.1 + i) * 48;
        const sparkAlpha = (0.03 + flickerNoise(step * 4.7 + i * 0.5) * 0.12) * intensity;
        const gradient = ctx.createRadialGradient(sparkX, sparkY, 0, sparkX, sparkY, sparkSize);
        gradient.addColorStop(0, `rgba(${overlayColor}, ${Math.min(0.28, sparkAlpha)})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(sparkX - sparkSize, sparkY - sparkSize, sparkSize * 2, sparkSize * 2);
      }
    }
    return;
  }

  if (type === "intruder-alert") {
    const pulse = (Math.sin(age * 9) + 1) / 2;
    ctx.fillStyle = `rgba(255, 45, 45, ${(0.1 + pulse * 0.24) * intensity})`;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  if (type === "reactor-pulse") {
    const radius = (0.12 + (age % 3) * 0.22) * Math.max(w, h);
    const g = ctx.createRadialGradient(w * 0.5, h * 0.5, radius * 0.08, w * 0.5, h * 0.5, radius);
    g.addColorStop(0, `rgba(255, 157, 55, ${0.35 * intensity})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
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

  if (type === "special-nest") {
    const densityFactor = Number(options.densityFactor) || 1;
    const cells = Math.max(10, Math.round(22 * intensity * densityFactor));
    for (let i = 0; i < cells; i += 1) {
      const seed = ((i * 71.97) % 1000) / 1000;
      const seedB = ((i * 33.41 + 17) % 1000) / 1000;
      const pulse = (Math.sin(age * 4.3 + i * 1.11) + 1) / 2;
      const x = roomMinX + roomWidth * (0.08 + seed * 0.84);
      const y = roomMinY + roomHeight * (0.1 + seedB * 0.8);
      const rx = Math.max(4, roomWidth * (0.04 + (seed * 0.03)));
      const ry = rx * (0.75 + pulse * 0.28);
      ctx.fillStyle = `rgba(152, 205, 88, ${(0.2 + pulse * 0.22) * intensity})`;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, pulse * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(222, 255, 188, ${(0.18 + pulse * 0.2) * intensity})`;
      ctx.lineWidth = Math.max(1, rx * 0.12);
      ctx.stroke();
    }
    return;
  }

  if (type === "special-slime") {
    const densityFactor = Number(options.densityFactor) || 1;
    const bands = Math.max(5, Math.round(9 * intensity * densityFactor));
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

  if (type === "special-decompression") {
    const densityFactor = Number(options.densityFactor) || 1;
    const rings = Math.max(4, Math.round(7 * intensity * densityFactor));
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
    const streaks = 14;
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

  if (type === "kaputt") {
    const gifRenderConfig = resolveRoomGifRenderConfig(type, age, intensity, options);
    if (!gifRenderConfig.frame) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = gifRenderConfig.opacity;
    ctx.drawImage(gifRenderConfig.frame, roomMinX, roomMinY, roomWidth, roomHeight);
    ctx.restore();
    return;
  }

  if (type === "feuer" || type === "schleim") {
    const gifRenderConfig = resolveRoomGifRenderConfig(type, age, intensity, options);
    if (!gifRenderConfig.frame) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = gifRenderConfig.opacity;
    ctx.drawImage(gifRenderConfig.frame, roomMinX, roomMinY, roomWidth, roomHeight);
    ctx.restore();
    return;
  }

  if (type === "state-broken") {
    const densityFactor = Number(options.densityFactor) || 1;
    const crackCount = Math.max(4, Math.round(6 * densityFactor));
    ctx.strokeStyle = `rgba(186, 210, 226, ${0.58 * intensity})`;
    ctx.lineWidth = Math.max(1.2, Math.min(roomWidth, roomHeight) * 0.012);
    for (let i = 0; i < crackCount; i += 1) {
      const px = roomMinX + roomWidth * ((i + 1) / (crackCount + 1));
      const phase = Math.sin(age * 1.6 + i * 0.9) * roomHeight * 0.08;
      ctx.beginPath();
      ctx.moveTo(px - roomWidth * 0.1, roomY + phase - roomHeight * 0.18);
      ctx.lineTo(px + roomWidth * 0.03, roomY + phase);
      ctx.lineTo(px - roomWidth * 0.07, roomY + phase + roomHeight * 0.2);
      ctx.stroke();
    }
    return;
  }

  if (type === "state-burning") {
    const densityFactor = Number(options.densityFactor) || 1;
    const flames = Math.max(8, Math.round(11 * densityFactor));
    for (let i = 0; i < flames; i += 1) {
      const phase = (age * 1.7 + i * 0.17) % 1;
      const x = roomMinX + roomWidth * (((i * 0.41) % 1) * 0.92 + 0.04);
      const y = roomMinY + roomHeight * (0.9 - phase * 0.82);
      const radius = Math.max(5, roomWidth * (0.04 + ((i % 3) * 0.01)));
      const alpha = (0.18 + (1 - phase) * 0.28) * intensity;
      ctx.fillStyle = `rgba(255, 132, 49, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (type === "state-corpse") {
    const markerW = Math.max(8, roomWidth * 0.16);
    const markerH = Math.max(5, roomHeight * 0.08);
    const markerX = roomX - markerW * 0.5;
    const markerY = roomY + roomHeight * 0.2;
    ctx.fillStyle = `rgba(192, 71, 71, ${0.5 * intensity})`;
    ctx.fillRect(markerX, markerY, markerW, markerH);
    ctx.strokeStyle = `rgba(255, 216, 216, ${0.75 * intensity})`;
    ctx.lineWidth = Math.max(1, markerH * 0.16);
    ctx.beginPath();
    ctx.moveTo(markerX, markerY);
    ctx.lineTo(markerX + markerW, markerY + markerH);
    ctx.moveTo(markerX + markerW, markerY);
    ctx.lineTo(markerX, markerY + markerH);
    ctx.stroke();
    return;
  }

  if (type === "state-aliens") {
    const count = clampAlienCount(options.alienCount ?? options.roomState?.alienCount ?? 0);
    const densityFactor = Number(options.densityFactor) || 1;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * roomWidth * 0.22;
      const pulse = (Math.sin(age * 5 + i * 1.9) + 1) / 2;
      const x = roomX + offset;
      const y = roomY - roomHeight * 0.1;
      const r = Math.max(8, Math.min(roomWidth, roomHeight) * 0.12 * densityFactor);
      ctx.fillStyle = `rgba(153, 255, 102, ${(0.22 + pulse * 0.2) * intensity})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(32, 53, 23, ${(0.5 + pulse * 0.25) * intensity})`;
      ctx.beginPath();
      ctx.arc(x - r * 0.25, y - r * 0.1, Math.max(2, r * 0.17), 0, Math.PI * 2);
      ctx.arc(x + r * 0.25, y - r * 0.1, Math.max(2, r * 0.17), 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (type === "scanner-sweep") {
    const r = Math.max(roomRadius * 1.35, Math.max(roomWidth, roomHeight) * 0.75);
    const angle = age * 1.9;
    ctx.fillStyle = `rgba(84, 255, 218, ${0.2 * intensity})`;
    ctx.beginPath();
    ctx.moveTo(roomX, roomY);
    ctx.arc(roomX, roomY, r, angle, angle + Math.PI / 3);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (type === "steam-vent") {
    const columns = 6;
    const plumeTravel = roomHeight * 1.2;
    for (let i = 0; i < columns; i += 1) {
      const columnOffset = (i / (columns - 1 || 1)) * roomWidth;
      const phase = (age * 0.9 + i * 0.19) % 1;
      const rise = roomMinY + roomHeight - phase * plumeTravel;
      const radius = Math.max(7, roomWidth * 0.06 + ((age * 16 + i * 7) % (roomWidth * 0.08)));
      const sway = Math.sin(age * 2 + i) * roomWidth * 0.04;
      ctx.fillStyle = `rgba(225, 236, 255, ${0.085 * intensity})`;
      ctx.beginPath();
      ctx.arc(roomMinX + columnOffset + sway, rise, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (type === "contamination") {
    const alpha = (0.1 + Math.sin(age * 2.6) * 0.04) * intensity;
    const g = ctx.createRadialGradient(roomX, roomY, 4, roomX, roomY, Math.max(roomWidth, roomHeight) * 0.72);
    g.addColorStop(0, `rgba(96, 232, 142, ${alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(roomMinX - roomWidth * 0.35, roomMinY - roomHeight * 0.35, roomWidth * 1.7, roomHeight * 1.7);
    return;
  }

  if (type === "electrical-arc") {
    ctx.strokeStyle = `rgba(120, 200, 255, ${0.8 * intensity})`;
    ctx.lineWidth = Math.max(2, Math.min(roomWidth, roomHeight) * 0.015);
    ctx.beginPath();
    for (let i = 0; i < 9; i += 1) {
      const px = roomMinX + roomWidth * (0.08 + Math.random() * 0.84);
      const py = roomMinY + roomHeight * (0.08 + Math.random() * 0.84);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    return;
  }

  if (type === "fire-pocket") {
    const alpha = (0.2 + Math.sin(age * 12) * 0.1) * intensity;
    const g = ctx.createRadialGradient(roomX, roomY, 6, roomX, roomY, Math.max(roomWidth, roomHeight) * 0.68);
    g.addColorStop(0, `rgba(255, 123, 61, ${alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(roomMinX - roomWidth * 0.25, roomMinY - roomHeight * 0.25, roomWidth * 1.5, roomHeight * 1.5);
    return;
  }

  if (type === "alarm-beacon") {
    const pulse = (Math.sin(age * 8) + 1) / 2;
    const g = ctx.createRadialGradient(roomX, roomY, 4, roomX, roomY, Math.max(roomWidth, roomHeight) * (0.55 + pulse * 0.12));
    g.addColorStop(0, `rgba(255, 60, 60, ${(0.12 + pulse * 0.18) * intensity})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(roomMinX - roomWidth * 0.35, roomMinY - roomHeight * 0.35, roomWidth * 1.7, roomHeight * 1.7);
  }
}

function pruneFinishedAnimations(now) {
  const before = state.runningAnimations.length;
  const activeClusterIds = new Set(
    state.runningAnimations
      .filter((entry) => entry?.scope === "cluster")
      .map((entry) => entry.id),
  );
  state.runningAnimations = state.runningAnimations.filter((anim) => {
    if (anim.scope === "cluster") {
      return true;
    }
    if (anim.scope === "room") {
      if (anim.parentClusterRunId && !activeClusterIds.has(anim.parentClusterRunId)) {
        return false;
      }
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
  state.runningAnimations = state.runningAnimations.filter((anim) => {
    if (anim.scope !== "cluster") {
      return true;
    }
    const members = activeRoomByCluster.get(anim.id) ?? [];
    if (members.length === 0) {
      return false;
    }
    anim.memberAnimationIds = members.map((entry) => entry.id);
    anim.memberRoomIds = members.map((entry) => entry.roomId);
    return true;
  });

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

    const failedAnimationIds = [];
    for (const anim of state.runningAnimations) {
      const ok = drawAnimationSafely(anim, now);
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

    if (now - lastListRenderAt > 500) {
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
  const file = boardImportFileInput?.files?.[0] ?? null;
  boardImportButton.disabled = true;
  try {
    const result = await importBoardFromFile(file);
    const importedBoardId = result?.boardId || "unknown";
    triggerFeedback.textContent = `Status: board import succeeded (${importedBoardId})`;
    boardStatus.textContent = `Active board: ${getBoard().label}`;
    if (boardImportFileInput) {
      boardImportFileInput.value = "";
    }
  } catch (error) {
    triggerFeedback.textContent = `Status: ${error instanceof Error ? error.message : "Board import failed"}`;
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

boardZoomRangeInput.addEventListener("input", () => {
  const scale = clampBoardZoomScale((Number(boardZoomRangeInput.value) || 100) / 100);
  const center = getRoomCenterForZoom(state.boardId);
  updateCurrentBoardZoom(computePanForZoomFocus(scale, center), `Board zoom set to ${Math.round(scale * 100)}%`);
  setPanCursorState();
});

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

outsideEnabledInput.addEventListener("change", () => {
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

outsideIntensityInput.addEventListener("input", () => {
  updateOutsideFxProfile(state.boardId, { intensity: clampOutsideIntensity(outsideIntensityInput.value) });
  const persisted = persistBoardProfiles();
  syncOutsideFxPanel();
  emitOutsideFxMutation(state.boardId, "outside-intensity-update");
  triggerFeedback.textContent = persisted
      ? "Status: Outside intensity updated"
      : "Status: Outside intensity updated (persistence failed)";
});

outsideSpeedInput.addEventListener("input", () => {
  updateOutsideFxProfile(state.boardId, { speed: clampOutsideSpeed(outsideSpeedInput.value) });
  const persisted = persistBoardProfiles();
  syncOutsideFxPanel();
  emitOutsideFxMutation(state.boardId, "outside-speed-update");
  triggerFeedback.textContent = persisted
      ? "Status: Outside speed updated"
      : "Status: Outside speed updated (persistence failed)";
});

outsideModeInput.addEventListener("change", () => {
  updateOutsideFxProfile(state.boardId, { mode: normalizeOutsideMode(outsideModeInput.value) });
  const persisted = persistBoardProfiles();
  syncOutsideFxPanel();
  emitOutsideFxMutation(state.boardId, "outside-mode-update");
  triggerFeedback.textContent = persisted
      ? `Status: Outside mode ${outsideModeInput.value === "immersive" ? "Immersive" : "Standard"} enabled`
      : `Status: Outside mode ${outsideModeInput.value === "immersive" ? "Immersive" : "Standard"} enabled (persistence failed)`;
});

outsideDirectionInput.addEventListener("change", () => {
  updateOutsideFxProfile(state.boardId, {
    direction: normalizeOutsideDirection(outsideDirectionInput.value),
  });
  const persisted = persistBoardProfiles();
  syncOutsideFxPanel();
  emitOutsideFxMutation(state.boardId, "outside-direction-update");
  triggerFeedback.textContent = persisted
      ? `Status: Outside direction ${outsideDirectionInput.value === "reverse" ? "Reverse" : "Forward"} enabled`
      : `Status: Outside direction ${outsideDirectionInput.value === "reverse" ? "Reverse" : "Forward"} enabled (persistence failed)`;
});

roomOverlay.addEventListener("pointermove", (event) => {
  if (state.panMode.active) {
    if (state.panMode.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - state.panMode.startClientX;
    const deltaY = event.clientY - state.panMode.startClientY;
    updateCurrentBoardZoom({
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
  const trigger = event.button === 1 ? "middle" : "space";
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
  setPanCursorState();
});

window.addEventListener("orientationchange", () => {
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

document.querySelectorAll("button[data-global]").forEach((button) => {
  button.addEventListener("click", () => {
    const type = button.dataset.global;
    if (shouldSuppressRapidTap(`global-${type}`)) {
      return;
    }
    recordTriggerIntent();
    setDashboardZone("trigger");
    const mode = type === "ambient-drift" || type === "ash-fall" || type === "hull-flicker" || type === "outside-space"
      ? null
      : 6;
    upsertGlobalAnimation(type, mode);
  });
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
  state.roomDraft.animationId = isRoomAnimationType(selected) ? selected : ROOM_ANIMATIONS[0]?.id ?? "kaputt";
  roomAnimationSelect.value = state.roomDraft.animationId;
  syncGifRoomControls();
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

roomPlaybackSpeedInput.addEventListener("input", () => {
  state.roomDraft.playbackSpeed = clampGifPlaybackSpeed(roomPlaybackSpeedInput.value);
  roomPlaybackSpeedValue.textContent = `${state.roomDraft.playbackSpeed.toFixed(2)}x`;
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

roomHoldInput.addEventListener("change", () => {
  roomHoldInput.checked = true;
  state.roomDraft.hold = true;
});

roomStaggerStartInput?.addEventListener("change", () => {
  state.roomDraft.staggerStart = Boolean(roomStaggerStartInput.checked);
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

saveGlobalDefaultsButton.addEventListener("click", async () => {
  const persisted = persistBoardProfiles();
  if (!persisted) {
    globalDefaultsStatus.textContent =
      "Global Defaults: local profile could not be saved before save operation";
    triggerFeedback.textContent = "Status: Global defaults save aborted (local persistence failed)";
    return;
  }

  saveGlobalDefaultsButton.disabled = true;
  globalDefaultsStatus.textContent = "Global Defaults: save in progress ...";
  apiDiagnoseStatus.textContent = "API diagnostics: checking reachability + POST capability (save preflight) ...";
  try {
    const result = await saveGlobalDefaultsToServer();
    const snapshot = buildResolveSnapshot({
      routing: result.routing,
      endpoint: result.endpoint,
      method: result.method,
    });
    const remoteHint = getRemoteMismatchHint(result.routing);
    globalDefaultsStatus.textContent =
      `Global Defaults: saved (${result.target}, ${result.savedAt}) | ${formatResolveSnapshot(snapshot)} [${result.statusClass}]`;
    apiDiagnoseStatus.textContent =
      `API diagnostics: OK (${formatResolveSnapshot(snapshot)} | Preflight GET /api/health + OPTIONS /api/global-defaults)`;
    triggerFeedback.textContent =
      `Status: Global Defaults saved (${formatResolveSnapshot(snapshot)}; Status ${result.status}/${result.statusClass})${remoteHint ? ` ${remoteHint}` : ""}`;
  } catch (error) {
    const saveError = formatGlobalDefaultsSaveError(error);
    globalDefaultsStatus.textContent = `Global Defaults: ${saveError.statusText}`;
    apiDiagnoseStatus.textContent = saveError.diagnoseStatusText;
    triggerFeedback.textContent = saveError.feedbackText;
  } finally {
    saveGlobalDefaultsButton.disabled = false;
  }
});

loadApplyGlobalDefaultsButton?.addEventListener("click", async () => {
  loadApplyGlobalDefaultsButton.disabled = true;
  globalDefaultsStatus.textContent = "Global Defaults: load & apply in progress ...";
  try {
    const result = await loadAndApplyGlobalDefaults({ sourceLabel: "settings-button" });
    if (!result.persisted) {
      triggerFeedback.textContent =
        "Status: Defaults loaded and applied, but local persistence failed";
    }
  } catch (error) {
    const saveError = formatGlobalDefaultsSaveError(error);
    globalDefaultsStatus.textContent = `Global Defaults: ${saveError.statusText}`;
    apiDiagnoseStatus.textContent = saveError.diagnoseStatusText;
    triggerFeedback.textContent =
      `Status: Load & apply defaults failed. ${saveError.feedbackText}`;
  } finally {
    loadApplyGlobalDefaultsButton.disabled = false;
  }
});

exportGlobalDefaultsButton.addEventListener("click", () => {
  const persisted = persistBoardProfiles();
  if (!persisted) {
    globalDefaultsStatus.textContent =
      "Global Defaults: download export aborted (local persistence failed)";
    triggerFeedback.textContent = "Status: Download export could not be prepared";
    return;
  }

  const fileName = downloadGlobalDefaultsFallback();
  globalDefaultsStatus.textContent = `Global Defaults: download export completed (${fileName})`;
  triggerFeedback.textContent =
    "Status: Download export created (secondary fallback); primary path remains API save";
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

const resizeObserver = new ResizeObserver((entries) => {
  const size = entries[0].contentRect;
  canvas.width = Math.max(1, Math.floor(size.width));
  canvas.height = Math.max(1, Math.floor(size.height));
  updateCurrentBoardZoom(getBoardZoom(state.boardId));
  setPanCursorState();
  syncDashboardZoneVisibility();
  syncMobileStickyOffsets();
  updateMobilePerformanceStatus();
  validateViewExclusivity(state.uiView, { context: "resize-guard" });
  validateViewNavigationVisibility({ context: "resize-guard" });
  runMobileProjectionVisibilityGuard({ context: "resize-guard" });
  const layoutOk = runLayoutScrollRegression();
  const navigationOk = runNavigationStateRegression();
  if (!layoutOk || !navigationOk) {
    triggerFeedback.textContent =
      "Status: Resize guard reported layout/navigation drift (check scroll/resize/view switch)";
  }
});

resizeObserver.observe(stage);

function syncRuntimePanelsFromState() {
  switchBoard(state.boardId);
  roomAnimationSelect.value = state.roomDraft.animationId;
  roomOpacityInput.value = String(clampRoomOpacity(state.roomDraft.opacity));
  roomOpacityValue.textContent = clampRoomOpacity(state.roomDraft.opacity).toFixed(2);
  roomPlaybackSpeedInput.value = String(clampGifPlaybackSpeed(state.roomDraft.playbackSpeed));
  roomPlaybackSpeedValue.textContent = `${clampGifPlaybackSpeed(state.roomDraft.playbackSpeed).toFixed(2)}x`;
  syncGifRoomControls();
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
  syncOutsideFxPanel();
  syncAlignModePanel();
  syncBoardZoomPanel();
  syncDashboardZoneVisibility();
  updateMobilePerformanceStatus();
}

async function initializeApplication() {
  await loadExternalBoardZones();
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
  state.shipPolygonsByBoard = createDefaultShipPolygonsByBoard();
  state.outsideFxByBoard = createDefaultOutsideFxByBoard();
  state.boardZoomByBoard = createDefaultBoardZoomByBoard();
  state.animationSoundMap = normalizeAnimationSoundMap(createDefaultAnimationSoundMap());
  state.animationSpeed = clampAnimationSpeed(animationSpeedInput.value);
  state.startupDefaultsGuard.fallbackRequired = !hasStoredBoardProfilesInLocalStorage();
  state.startupDefaultsGuard.attempted = false;
  state.startupDefaultsGuard.applied = false;
  state.startupDefaultsGuard.outcome = state.startupDefaultsGuard.fallbackRequired
    ? "pending"
    : "local-storage-present";
  state.startupDefaultsGuard.detail = state.startupDefaultsGuard.fallbackRequired
    ? "fresh-device-fallback-required"
    : "local-profiles-detected";
  loadBoardProfiles();
  let startupDefaultsSnapshot = null;

  try {
    const bootstrap = await autoLoadGlobalDefaultsForFreshDevice();
    state.startupDefaultsGuard.attempted = Boolean(bootstrap.attempted);
    state.startupDefaultsGuard.applied = Boolean(bootstrap.applied);
    state.startupDefaultsGuard.outcome = bootstrap.applied ? "applied" : bootstrap.reason ?? "skipped";
    state.startupDefaultsGuard.detail = bootstrap.endpoint || bootstrap.reason || "n/a";
    if (bootstrap.applied) {
      syncRuntimePanelsFromState();
      startupDefaultsSnapshot = buildResolveSnapshot({
        routing: bootstrap.routing,
        endpoint: bootstrap.endpoint,
        method: "GET",
      });
    }
  } catch {
    if (state.startupDefaultsGuard.fallbackRequired) {
      state.startupDefaultsGuard.attempted = true;
      state.startupDefaultsGuard.applied = false;
      state.startupDefaultsGuard.outcome = "failed-explicit";
      state.startupDefaultsGuard.detail = "fallback-load-failed";
      globalDefaultsStatus.textContent =
        "Global Defaults: startup fallback failed (no silent ignore; defaults must be loaded manually)";
      apiDiagnoseStatus.textContent =
        "API diagnostics: startup fallback failed (check defaults endpoint or use the Settings button)";
      triggerFeedback.textContent =
        "Status: Startup guard active - empty local storage detected, global-defaults load explicitly failed";
    }
  }

  syncRuntimePanelsFromState();
  syncMobileStickyOffsets();
  applyOutputRoleViewContract();
  connectLiveSyncSocket();
  if (startupDefaultsSnapshot) {
    globalDefaultsStatus.textContent =
      `Global Defaults: automatically loaded & applied (${formatResolveSnapshot(startupDefaultsSnapshot)})`;
    triggerFeedback.textContent =
      `Status: Startup defaults active (${formatResolveSnapshot(startupDefaultsSnapshot)})`;
    apiDiagnoseStatus.textContent =
      `API diagnostics: startup load OK (${formatResolveSnapshot(startupDefaultsSnapshot)})`;
  }
  warmEventSoundAssets();
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
  requestAnimationFrame(draw);
}

void window.TT_BEAMER_BOOT.run(initializeApplication);
