import {
  clampAlienCount,
  clampAnimationSpeed,
  clampAudioVolumePercent,
  clampGifPlaybackSpeed,
  clampOutsideIntensity,
  clampOutsideSpeed,
  clampRoomDurationSec,
  clampRoomIntensity,
  clampRoomOpacity,
  clampRoomSpeed,
  normalizeOutsideDirection,
  normalizeOutsideMode,
  normalizeRoomGeometryMode,
} from "./state/index.js";
import { resolveRoomAnimationEffectType, getRoomEquivalentType } from "./effects/index.js";
import { clampRoomSoundVolume } from "./audio/index.js";
import { isElementRendered } from "./ui/index.js";
import { safeLocalStorageGet, safeLocalStorageSet } from "./persistence/index.js";
import { classifyHttpStatus } from "./api/save.js";
import { drawRenderFallback } from "./rendering/index.js";

let BOARDS = [
  {
    id: "nemesis-board-a",
    label: "Nemesis Board A",
    src: "resources/nemesis/boards/httpssteamusercontentaakamaihdnetugc946212227080494269577CF3785BAEF06122BDE208B776E07B27BFFA58.jpg",
    rooms: [
      ["a-01", "Hex A-01", 0.231, 0.248, 0.059],
      ["a-02", "Hex A-02", 0.383, 0.165, 0.058],
      ["a-03", "Hex A-03", 0.547, 0.167, 0.058],
      ["a-04", "Hex A-04", 0.694, 0.191, 0.057],
      ["a-05", "Hex A-05", 0.778, 0.41, 0.055],
      ["a-06", "Hex A-06", 0.623, 0.409, 0.054],
      ["a-07", "Hex A-07", 0.411, 0.358, 0.057],
      ["a-08", "Hex A-08", 0.206, 0.556, 0.057],
      ["a-09", "Hex A-09", 0.333, 0.56, 0.055],
      ["a-10", "Hex A-10", 0.409, 0.704, 0.056],
      ["a-11", "Hex A-11", 0.631, 0.63, 0.054],
      ["a-12", "Hex A-12", 0.777, 0.631, 0.054],
      ["a-13", "Hex A-13", 0.215, 0.835, 0.056],
      ["a-14", "Hex A-14", 0.385, 0.886, 0.056],
      ["a-15", "Hex A-15", 0.534, 0.879, 0.055],
      ["a-16", "Hex A-16", 0.69, 0.879, 0.055],
      {
        id: "special-cockpit",
        label: "Cockpit",
        radius: 0.066,
        points: [
          [0.026, 0.456],
          [0.056, 0.402],
          [0.098, 0.415],
          [0.119, 0.49],
          [0.1, 0.57],
          [0.058, 0.617],
          [0.027, 0.556],
        ],
      },
      {
        id: "special-cryoschlaf",
        label: "Cryoschlaf",
        radius: 0.091,
        points: [
          [0.457, 0.505],
          [0.49, 0.401],
          [0.55, 0.368],
          [0.59, 0.411],
          [0.6, 0.514],
          [0.585, 0.62],
          [0.547, 0.664],
          [0.495, 0.655],
          [0.466, 0.59],
        ],
      },
      {
        id: "special-maschinenraum-1",
        label: "Maschinenraum 1",
        radius: 0.059,
        points: [
          [0.855, 0.769],
          [0.888, 0.728],
          [0.953, 0.728],
          [0.981, 0.769],
          [0.981, 0.85],
          [0.952, 0.892],
          [0.888, 0.892],
          [0.855, 0.852],
        ],
      },
      {
        id: "special-maschinenraum-2",
        label: "Maschinenraum 2",
        radius: 0.052,
        points: [
          [0.857, 0.488],
          [0.889, 0.457],
          [0.952, 0.457],
          [0.98, 0.486],
          [0.98, 0.559],
          [0.952, 0.588],
          [0.889, 0.588],
          [0.857, 0.561],
        ],
      },
      {
        id: "special-maschinenraum-3",
        label: "Maschinenraum 3",
        radius: 0.055,
        points: [
          [0.855, 0.206],
          [0.888, 0.165],
          [0.952, 0.165],
          [0.981, 0.203],
          [0.981, 0.285],
          [0.95, 0.327],
          [0.888, 0.327],
          [0.855, 0.286],
        ],
      },
    ],
  },
  {
    id: "nemesis-board-b",
    label: "Nemesis Board B",
    src: "resources/nemesis/boards/httpssteamusercontentaakamaihdnetugc948472629471389466262B46FE788A03A16E28D87AE3C3D56A707BC356.jpg",
    rooms: [
      ["b-01", "Hex B-01", 0.082, 0.213, 0.059],
      ["b-02", "Hex B-02", 0.214, 0.303, 0.055],
      ["b-03", "Hex B-03", 0.468, 0.288, 0.056],
      ["b-04", "Hex B-04", 0.656, 0.252, 0.057],
      ["b-05", "Hex B-05", 0.812, 0.188, 0.058],
      ["b-06", "Hex B-06", 0.214, 0.552, 0.056],
      ["b-07", "Hex B-07", 0.451, 0.587, 0.055],
      ["b-08", "Hex B-08", 0.575, 0.587, 0.055],
      ["b-09", "Hex B-09", 0.693, 0.587, 0.055],
      ["b-10", "Hex B-10", 0.216, 0.781, 0.056],
      ["b-11", "Hex B-11", 0.477, 0.825, 0.056],
      ["b-12", "Hex B-12", 0.696, 0.875, 0.056],
      ["b-13", "Hex B-13", 0.811, 0.963, 0.056],
      ["b-14", "Hex B-14", 0.082, 0.869, 0.058],
      {
        id: "special-cockpit",
        label: "Cockpit",
        radius: 0.07,
        points: [
          [0.014, 0.383],
          [0.051, 0.347],
          [0.108, 0.348],
          [0.135, 0.392],
          [0.135, 0.67],
          [0.108, 0.71],
          [0.051, 0.71],
          [0.014, 0.668],
        ],
      },
      {
        id: "special-cryoschlaf",
        label: "Cryoschlaf",
        radius: 0.09,
        points: [
          [0.261, 0.402],
          [0.306, 0.347],
          [0.387, 0.347],
          [0.426, 0.392],
          [0.426, 0.667],
          [0.387, 0.709],
          [0.306, 0.709],
          [0.261, 0.668],
        ],
      },
      {
        id: "special-maschinenraum-1",
        label: "Maschinenraum 1",
        radius: 0.055,
        points: [
          [0.856, 0.587],
          [0.895, 0.558],
          [0.957, 0.558],
          [0.986, 0.587],
          [0.986, 0.678],
          [0.957, 0.704],
          [0.895, 0.704],
          [0.856, 0.676],
        ],
      },
      {
        id: "special-maschinenraum-2",
        label: "Maschinenraum 2",
        radius: 0.051,
        points: [
          [0.856, 0.455],
          [0.895, 0.425],
          [0.957, 0.425],
          [0.986, 0.453],
          [0.986, 0.542],
          [0.957, 0.572],
          [0.895, 0.572],
          [0.856, 0.545],
        ],
      },
      {
        id: "special-maschinenraum-3",
        label: "Maschinenraum 3",
        radius: 0.05,
        points: [
          [0.858, 0.323],
          [0.895, 0.294],
          [0.958, 0.294],
          [0.986, 0.323],
          [0.986, 0.409],
          [0.958, 0.435],
          [0.895, 0.435],
          [0.858, 0.411],
        ],
      },
    ],
  },
].map((board) => ({
  ...board,
  rooms: board.rooms.map((room) => {
    if (Array.isArray(room)) {
      const [id, label, x, y, radius = 0.055] = room;
      return { id, label, x, y, radius };
    }
    return room;
  }),
}));

const INLINE_FALLBACK_BOARDS = BOARDS.map((board) => ({
  ...board,
  rooms: board.rooms.map((room) => ({
    ...room,
    points: Array.isArray(room.points) ? room.points.map((point) => [...point]) : undefined,
  })),
}));

const ZONE_CONFIG_SOURCES = [
  {
    boardId: "nemesis-board-a",
    endpoint: "/config/zones/nemesis-board-a.json",
  },
  {
    boardId: "nemesis-board-b",
    endpoint: "/config/zones/nemesis-board-b.json",
  },
];

const ROOM_GIF_ANIMATION_ASSETS = {
  kaputt: "resources/nemesis/animations/malfunction.gif",
  feuer: "resources/nemesis/animations/fire.gif",
  schleim: "resources/nemesis/animations/final.gif",
};
const ROOM_GIF_MAPPING_NONE = "none";
const ROOM_GIF_ASSET_PATHS = Array.from(new Set(Object.values(ROOM_GIF_ANIMATION_ASSETS)));

const ROOM_GLOBAL_EQUIVALENT_MAP = {
  alarm: "intruder-alert",
  lichtflackern: "hull-flicker",
};

const ROOM_ANIMATIONS = [
  { id: "kaputt", label: "Kaputt (malfunction.gif)" },
  { id: "feuer", label: "Feuer (fire.gif)" },
  { id: "schleim", label: "Schleim (final.gif)" },
  { id: "nest", label: "Nest" },
  { id: "dekompression", label: "Dekompression" },
  { id: "lichtflackern", label: "Lichtflackern (global hull-flicker)" },
  { id: "alarm", label: "Alarm" },
];

const INSIDE_SHIP_GLOBAL_ANIMATIONS = [
  { id: "ambient-drift", label: "Ambient Drift", category: "inside-ship" },
  { id: "ash-fall", label: "Ash Fall", category: "inside-ship" },
  { id: "hull-flicker", label: "Hull Flicker", category: "inside-ship" },
  { id: "intruder-alert", label: "Intruder Alert", category: "inside-ship" },
  { id: "reactor-pulse", label: "Reactor Pulse", category: "inside-ship" },
  { id: "power-outage", label: "Power Outage", category: "inside-ship" },
];

const OUTSIDE_SHIP_GLOBAL_ANIMATIONS = [
  { id: "outside-space", label: "Outside Space", category: "outside-ship" },
];

const GLOBAL_ANIMATIONS = [...INSIDE_SHIP_GLOBAL_ANIMATIONS, ...OUTSIDE_SHIP_GLOBAL_ANIMATIONS];

const ALL_ANIMATION_TYPES = [...GLOBAL_ANIMATIONS, ...ROOM_ANIMATIONS];
const SOUND_MAPPING_NONE = "none";

const EVENT_SOUND_ASSETS = {
  "intruder-alert": [
    "resources/nemesis/sounds/alarm.mp3",
    "resources/nemesis/sounds/monsters/048.wav",
  ],
  "reactor-pulse": ["resources/nemesis/sounds/electricity.mp3"],
  "power-outage": ["resources/nemesis/sounds/power/3.wav"],
  "alarm-beacon": ["resources/nemesis/sounds/alarm.mp3"],
  "electrical-arc": ["resources/nemesis/sounds/electricity.mp3"],
  alarm: ["resources/nemesis/sounds/alarm.mp3"],
  lichtflackern: ["resources/nemesis/sounds/electricity.mp3"],
  feuer: ["resources/nemesis/sounds/power/3.wav"],
};

const ALL_SOUND_ASSET_PATHS = Array.from(new Set(Object.values(EVENT_SOUND_ASSETS).flat()));

const stage = document.querySelector("#stage");
const boardImage = document.querySelector("#board-image");
const canvas = document.querySelector("#fx-canvas");
const roomOverlay = document.querySelector("#room-overlay");
const boardSelect = document.querySelector("#board-select");
const boardStatus = document.querySelector("#board-status");
const zonesStatus = document.querySelector("#zones-status");
const outputRouteSelect = document.querySelector("#output-route-select");
const outputRouteStatus = document.querySelector("#output-route-status");
const applyOutputRouteButton = document.querySelector("#apply-output-route");
const saveGlobalDefaultsButton = document.querySelector("#save-global-defaults");
const loadApplyGlobalDefaultsButton = document.querySelector("#load-apply-global-defaults");
const exportGlobalDefaultsButton = document.querySelector("#export-global-defaults");
const globalDefaultsStatus = document.querySelector("#global-defaults-status");
const apiDiagnoseStatus = document.querySelector("#api-diagnose-status");
const triggerFeedback = document.querySelector("#trigger-feedback");
const stopAllButton = document.querySelector("#stop-all");
const roomSelected = document.querySelector("#room-selected");
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
const startRoomAnimationButton = document.querySelector("#start-room-animation");
const runningAnimationsList = document.querySelector("#running-animations");
const audioEnabledInput = document.querySelector("#audio-enabled");
const audioVolumeInput = document.querySelector("#audio-volume");
const audioVolumeValue = document.querySelector("#audio-volume-value");
const audioStatus = document.querySelector("#audio-status");
const audioMappingAnimationSelect = document.querySelector("#audio-mapping-animation");
const audioMappingSoundSelect = document.querySelector("#audio-mapping-sound");
const audioMappingStatus = document.querySelector("#audio-mapping-status");
const gifMappingAnimationSelect = document.querySelector("#gif-mapping-animation");
const gifMappingAssetSelect = document.querySelector("#gif-mapping-asset");
const gifMappingStatus = document.querySelector("#gif-mapping-status");
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
const polygonVertexSelect = document.querySelector("#polygon-vertex-select");
const polygonEdgeSelect = document.querySelector("#polygon-edge-select");
const polygonInsertVertexButton = document.querySelector("#polygon-insert-vertex");
const polygonDeleteVertexButton = document.querySelector("#polygon-delete-vertex");
const polygonResetRoomButton = document.querySelector("#polygon-reset-room");
const polygonFocusRoomButton = document.querySelector("#polygon-focus-room");
const polygonEditorStatus = document.querySelector("#polygon-editor-status");
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
const boardZoomFitButton = document.querySelector("#board-zoom-fit");
const boardZoomResetButton = document.querySelector("#board-zoom-reset");
const boardZoomStatus = document.querySelector("#board-zoom-status");
const boardPanStatus = document.querySelector("#board-pan-status");
const dashboardViewGroups = Array.from(document.querySelectorAll('[data-view="dashboard"]'));
const settingsViewGroups = Array.from(document.querySelectorAll('[data-view="settings"]'));
const dashboardZoneGroups = Array.from(document.querySelectorAll("[data-dashboard-zone]"));
const SETTINGS_EXCLUSIVE_CONTROL_IDS = [
  "board-select",
  "output-route-select",
  "apply-output-route",
  "save-global-defaults",
  "load-apply-global-defaults",
  "export-global-defaults",
  "animation-speed",
  "audio-enabled",
  "audio-volume",
  "audio-mapping-animation",
  "audio-mapping-sound",
  "board-zoom-range",
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
  "outside-enabled",
  "outside-intensity",
  "outside-speed",
  "outside-mode",
  "outside-direction",
 ];

const ctx = canvas.getContext("2d");

const HITAREA_CALIBRATION_DEFAULT = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};
const HITAREA_CALIBRATION_STORAGE_KEY = "tt-beamer.hitarea-calibration.v1";
const BOARD_PROFILE_STORAGE_KEY = "tt-beamer.board-profiles.v1";
const ROOM_GEOMETRY_STORAGE_KEY = "tt-beamer.room-geometry.v1";
const SPECIAL_POLYGON_STORAGE_KEY = "tt-beamer.special-polygons.v1";
const API_BASE_STORAGE_KEY = "tt-beamer.api-base.v1";
const API_BASE_URL_PARAM_KEYS = ["ttApiBase", "apiBase", "api_base"];
const API_PORT_FALLBACKS = [4173, 4174, 3000, 8080];
const API_REQUEST_TIMEOUT_MS = 3000;
const LOCAL_API_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

const ROOM_GEOMETRY_DEFAULT = {
  mode: "relative",
  offsetX: 0,
  offsetY: 0,
  absoluteX: null,
  absoluteY: null,
  stretchX: 1,
  stretchY: 1,
};

const BOARD_ZOOM_DEFAULT = {
  scale: 1,
  panX: 0,
  panY: 0,
};

const SHIP_POLYGON_DEFAULT = [
  [0.06, 0.08],
  [0.94, 0.08],
  [0.97, 0.5],
  [0.94, 0.92],
  [0.06, 0.92],
  [0.03, 0.5],
];

const OUTSIDE_FX_DEFAULT = {
  enabled: false,
  intensity: 0.7,
  speed: 1,
  mode: "standard",
  direction: "forward",
};

const ROOM_STATE_DEFAULT = {
  broken: false,
  burning: false,
  alienCount: 0,
  corpse: false,
};

const state = {
  boardId: BOARDS[0].id,
  selectedRoomId: null,
  selectedRoomByBoard: {},
  outputRoute: "auto",
  roomDraft: {
    editTargetId: null,
    animationId: ROOM_ANIMATIONS[0].id,
    opacity: Number(roomOpacityInput?.value ?? 0.9),
    playbackSpeed: Number(roomPlaybackSpeedInput?.value ?? 1),
    intensity: Number(roomIntensityInput.value),
    speed: Number(roomSpeedInput.value),
    soundVolume: Number(roomSoundVolumeInput.value) / 100,
    durationSec: 0,
    hold: true,
  },
  runningAnimations: [],
  audio: {
    enabled: true,
    volume: 0.7,
  },
  animationSpeed: 1,
  animationSoundMap: {},
  animationGifMap: {},
  uiView: "dashboard",
  dashboardZone: "trigger",
  hitareaCalibrationByBoard: {},
  roomGeometryByBoard: {},
  roomStateProfilesByBoard: {},
  specialPolygonsByBoard: {},
  shipPolygonsByBoard: {},
  outsideFxByBoard: {},
  boardZoomByBoard: {},
  polygonEditor: {
    roomIdByBoard: {},
    selectedVertexIndex: 0,
    selectedEdgeIndex: 0,
    dragVertexIndex: null,
    dragPointerId: null,
    dragRoomId: null,
    dragBoardId: null,
    dragStartPoints: null,
    dragMoved: false,
  },
  shipPolygonEditor: {
    selectedVertexIndex: 0,
    selectedEdgeIndex: 0,
    dragVertexIndex: null,
    dragPointerId: null,
    dragBoardId: null,
    dragStartPoints: null,
    dragMoved: false,
  },
  panMode: {
    spacePressed: false,
    active: false,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startPanX: 0,
    startPanY: 0,
    trigger: null,
  },
  touchActionGuard: {},
  clearAllGuard: {
    armedUntil: 0,
    timeoutId: null,
  },
  mobilePerf: {
    triggerLatencySamples: [],
    frameDeltaSamples: [],
    pendingTriggerAt: null,
    lastFrameAt: null,
    lastSnapshot: null,
  },
  runtimePerf: {
    frameCostSamples: [],
    qualityScale: 1,
  },
  renderTelemetry: {
    frameCount: 0,
    lastFrameAt: 0,
    lastFrameCostMs: 0,
    lastTick: {
      outsideLayerErrors: 0,
      animationLayerErrors: 0,
      clipErrors: 0,
      schedulerErrors: 0,
      totalErrors: 0,
    },
    totals: {
      outsideLayerErrors: 0,
      animationLayerErrors: 0,
      clipErrors: 0,
      schedulerErrors: 0,
    },
    clipFallbacks: {
      outsideEvenOddFallback: 0,
      outsideCompositeFallback: 0,
      insideInvalidPolygon: 0,
    },
    faultInjection: {
      outsideLayerFailOnce: false,
      clipFailOnce: false,
    },
  },
  renderWatchdog: {
    consecutiveInvisibleFrames: 0,
    lastVisibleFrameAt: 0,
  },
  startupDefaultsGuard: {
    fallbackRequired: false,
    attempted: false,
    applied: false,
    outcome: "pending",
    detail: "",
  },
  zoneLoader: {
    loadedBoards: {},
    fallbackBoards: {},
    classificationByBoard: {},
    detailByBoard: {},
  },
};

let animationIdCounter = 1;
const ashParticles = [];
let lastListRenderAt = 0;
const audioAssetPoolByPath = new Map();
const gifImageCacheByPath = new Map();
const gifPlaybackCacheByPath = new Map();
const audioAssetCursorByEffect = {};
const audioAssetVoiceCursorByPath = {};
const activeAnimationAudioById = new Map();
let evenOddClipCapability = null;

function createDefaultAnimationSoundMap() {
  const defaults = {};
  for (const { id } of ALL_ANIMATION_TYPES) {
    defaults[id] = EVENT_SOUND_ASSETS[id]?.[0] ?? SOUND_MAPPING_NONE;
  }
  return defaults;
}

function createDefaultAnimationGifMap() {
  const defaults = {};
  for (const { id } of ROOM_ANIMATIONS) {
    defaults[id] = ROOM_GIF_ANIMATION_ASSETS[id] ?? ROOM_GIF_MAPPING_NONE;
  }
  return defaults;
}

function getAnimationLabel(animationType) {
  return ALL_ANIMATION_TYPES.find((entry) => entry.id === animationType)?.label ?? animationType;
}

function getGlobalAnimationCategory(animationType) {
  return GLOBAL_ANIMATIONS.find((entry) => entry.id === animationType)?.category ?? "inside-ship";
}

function getGlobalCategoryRuntimeLabel(animationType) {
  return getGlobalAnimationCategory(animationType) === "outside-ship" ? "GLOBAL-OUTSIDE" : "GLOBAL-INSIDE";
}

function normalizeAnimationSoundPath(animationType, path) {
  if (path === SOUND_MAPPING_NONE) {
    return SOUND_MAPPING_NONE;
  }
  if (ALL_SOUND_ASSET_PATHS.includes(path)) {
    return path;
  }
  const defaultPath = EVENT_SOUND_ASSETS[animationType]?.[0];
  if (defaultPath && ALL_SOUND_ASSET_PATHS.includes(defaultPath)) {
    return defaultPath;
  }
  return SOUND_MAPPING_NONE;
}

function normalizeAnimationSoundMap(soundMap) {
  const defaults = createDefaultAnimationSoundMap();
  for (const animationType of Object.keys(defaults)) {
    defaults[animationType] = normalizeAnimationSoundPath(animationType, soundMap?.[animationType]);
  }
  return defaults;
}

function normalizeAnimationGifPath(animationType, path) {
  if (!isRoomAnimationType(animationType)) {
    return ROOM_GIF_MAPPING_NONE;
  }
  if (path === ROOM_GIF_MAPPING_NONE) {
    return ROOM_GIF_MAPPING_NONE;
  }
  if (ROOM_GIF_ASSET_PATHS.includes(path)) {
    return path;
  }
  const defaultPath = ROOM_GIF_ANIMATION_ASSETS[animationType];
  if (defaultPath && ROOM_GIF_ASSET_PATHS.includes(defaultPath)) {
    return defaultPath;
  }
  return ROOM_GIF_MAPPING_NONE;
}

function normalizeAnimationGifMap(gifMap) {
  const defaults = createDefaultAnimationGifMap();
  for (const animationType of Object.keys(defaults)) {
    defaults[animationType] = normalizeAnimationGifPath(animationType, gifMap?.[animationType]);
  }
  return defaults;
}

function getMappedGifPathForAnimation(animationType) {
  const mapped = normalizeAnimationGifPath(animationType, state.animationGifMap?.[animationType]);
  if (mapped === ROOM_GIF_MAPPING_NONE) {
    return null;
  }
  return mapped;
}

function getMappedSoundPathForAnimation(animationType) {
  const mapped = normalizeAnimationSoundPath(animationType, state.animationSoundMap[animationType]);
  if (mapped === SOUND_MAPPING_NONE) {
    return null;
  }
  return mapped;
}

function getBoard(boardId = state.boardId) {
  return BOARDS.find((entry) => entry.id === boardId) ?? BOARDS[0];
}

function cloneBoardEntry(board) {
  return {
    ...board,
    rooms: board.rooms.map((room) => ({
      ...room,
      points: Array.isArray(room.points) ? room.points.map((point) => [...point]) : undefined,
    })),
  };
}

const lastKnownGoodBoardById = new Map(INLINE_FALLBACK_BOARDS.map((board) => [board.id, cloneBoardEntry(board)]));

function isFiniteUnitValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1;
}

function normalizeZoneRoom(room, fallbackRadius = 0.055) {
  const radius = Number.isFinite(Number(room?.radius)) ? Number(room.radius) : fallbackRadius;
  const base = {
    id: String(room?.id || "").trim(),
    label: String(room?.label || "").trim(),
    radius,
  };
  if (Array.isArray(room?.points)) {
    return {
      ...base,
      points: room.points.map((point) => [Number(point?.[0]), Number(point?.[1])]),
    };
  }
  return {
    ...base,
    x: Number(room?.x),
    y: Number(room?.y),
  };
}

function validateZoneRoom(room, roomIndex = 0) {
  const issues = [];
  if (!room.id) {
    issues.push(`rooms[${roomIndex}].id missing`);
  }
  if (!room.label) {
    issues.push(`rooms[${roomIndex}].label missing`);
  }
  if (!Number.isFinite(room.radius) || room.radius <= 0 || room.radius > 0.25) {
    issues.push(`rooms[${roomIndex}].radius invalid`);
  }
  if (Array.isArray(room.points)) {
    if (room.points.length < 3) {
      issues.push(`rooms[${roomIndex}].points requires >= 3 vertices`);
    }
    room.points.forEach((point, pointIndex) => {
      if (!isFiniteUnitValue(point?.[0]) || !isFiniteUnitValue(point?.[1])) {
        issues.push(`rooms[${roomIndex}].points[${pointIndex}] out of bounds`);
      }
    });
  } else if (!isFiniteUnitValue(room.x) || !isFiniteUnitValue(room.y)) {
    issues.push(`rooms[${roomIndex}] requires x/y in [0..1]`);
  }
  return issues;
}

function validateZonePayload(payload, expectedBoardId, requiredRoomIds = []) {
  const issues = [];
  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      code: "ZONE_INVALID_PAYLOAD",
      issues: ["payload must be an object"],
      normalizedBoard: null,
    };
  }
  const boardMeta = payload.board;
  if (!boardMeta || typeof boardMeta !== "object") {
    issues.push("board metadata missing");
  }
  if (String(boardMeta?.id || "") !== expectedBoardId) {
    issues.push(`board.id mismatch (expected ${expectedBoardId})`);
  }
  if (!boardMeta?.label || !boardMeta?.src) {
    issues.push("board.label/board.src required");
  }
  if (!Array.isArray(payload.rooms) || payload.rooms.length === 0) {
    issues.push("rooms[] required and cannot be empty");
  }

  const normalizedRooms = Array.isArray(payload.rooms)
    ? payload.rooms.map((room) => normalizeZoneRoom(room)).filter((room) => room.id)
    : [];
  const roomIds = new Set();
  normalizedRooms.forEach((room, roomIndex) => {
    const key = room.id;
    if (roomIds.has(key)) {
      issues.push(`duplicate room id: ${key}`);
    }
    roomIds.add(key);
    issues.push(...validateZoneRoom(room, roomIndex));
  });

  if (requiredRoomIds.length > 0) {
    const loadedRoomIds = new Set(normalizedRooms.map((room) => room.id));
    const missingRequired = requiredRoomIds.filter((roomId) => !loadedRoomIds.has(roomId));
    if (missingRequired.length > 0) {
      return {
        ok: false,
        code: "ZONE_PARTIAL_DATA",
        issues: [`missing required room ids: ${missingRequired.join(", ")}`],
        normalizedBoard: null,
      };
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      code: "ZONE_VALIDATION_FAILED",
      issues,
      normalizedBoard: null,
    };
  }

  return {
    ok: true,
    code: "OK",
    issues: [],
    normalizedBoard: {
      id: expectedBoardId,
      label: boardMeta.label,
      src: boardMeta.src,
      rooms: normalizedRooms,
    },
  };
}

function classifyZoneFallback(responseStatus = null, errorCode = "") {
  if (responseStatus === 404) {
    return "ZONE_FILE_MISSING";
  }
  if (responseStatus === 0) {
    return "ZONE_ENDPOINT_UNREACHABLE";
  }
  if (errorCode === "ZONE_MALFORMED_JSON") {
    return "ZONE_MALFORMED_JSON";
  }
  if (errorCode === "ZONE_PARTIAL_DATA") {
    return "ZONE_PARTIAL_DATA";
  }
  if (errorCode === "ZONE_VALIDATION_FAILED" || errorCode === "ZONE_INVALID_PAYLOAD") {
    return "ZONE_INVALID_STRUCTURE";
  }
  return "ZONE_LOAD_FAILED";
}

function syncZoneLoaderStatus() {
  if (!zonesStatus) {
    return;
  }
  const boards = ZONE_CONFIG_SOURCES.map((source) => {
    const mode = state.zoneLoader.classificationByBoard[source.boardId] ?? "UNKNOWN";
    const fallback = state.zoneLoader.fallbackBoards[source.boardId] || "none";
    return `${source.boardId}: ${mode}${fallback !== "none" ? ` (${fallback})` : ""}`;
  });
  zonesStatus.textContent = `Zonenquelle: ${boards.join(" | ")}`;
}

async function loadExternalBoardZones() {
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

function getSelectedRoom() {
  return getBoard().rooms.find((room) => room.id === state.selectedRoomId) ?? null;
}

function clampHitareaOffset(value) {
  return Math.max(-0.15, Math.min(0.15, value));
}

function clampHitareaScale(value) {
  return Math.max(0.85, Math.min(1.15, value));
}

function normalizeHitareaCalibration(calibration) {
  return {
    offsetX: clampHitareaOffset(Number(calibration?.offsetX) || 0),
    offsetY: clampHitareaOffset(Number(calibration?.offsetY) || 0),
    scale: clampHitareaScale(Number(calibration?.scale) || 1),
  };
}

function clampRoomRelativeOffset(value) {
  return Math.max(-0.25, Math.min(0.25, value));
}

function clampRoomAbsoluteCoordinate(value) {
  return Math.max(-0.2, Math.min(1.2, value));
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

function getRawRoomCenter(room, boardId = state.boardId) {
  if (room?.points?.length) {
    const sourcePoints = getRoomSourcePoints(room, boardId);
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

function mergeBoardProfilesForGlobalExport(primaryProfiles, fallbackProfiles) {
  const merged = {};
  const boardIds = new Set([
    ...Object.keys(fallbackProfiles ?? {}),
    ...Object.keys(primaryProfiles ?? {}),
  ]);

  for (const boardId of boardIds) {
    const primary = primaryProfiles?.[boardId] ?? {};
    const fallback = fallbackProfiles?.[boardId] ?? {};
    const primaryShipPolygon = isValidSpecialPolygon(primary.shipPolygon) ? primary.shipPolygon : null;
    const fallbackShipPolygon = isValidSpecialPolygon(fallback.shipPolygon) ? fallback.shipPolygon : null;

    merged[boardId] = {
      ...fallback,
      ...primary,
      specialPolygons: mergeSpecialPolygonMaps(primary.specialPolygons, fallback.specialPolygons),
      shipPolygon: primaryShipPolygon ?? fallbackShipPolygon ?? SHIP_POLYGON_DEFAULT,
    };
  }

  return merged;
}

function createDefaultSpecialPolygonMap(boardId) {
  const board = getBoard(boardId);
  const specials = board.rooms.filter((room) => room.id.startsWith("special-") && room.points?.length >= 3);
  return Object.fromEntries(
    specials.map((room) => [room.id, normalizeSpecialPolygon(room.points, room.points)]),
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
        hitareaCalibration: { ...HITAREA_CALIBRATION_DEFAULT },
        roomGeometry: createDefaultRoomGeometryMap(board.id),
        roomStateProfiles: createDefaultRoomStateProfileMap(board.id),
        specialPolygons: createDefaultSpecialPolygonMap(board.id),
        shipPolygon: normalizeShipPolygon(SHIP_POLYGON_DEFAULT),
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
        hitareaCalibration: normalizeHitareaCalibration(state.hitareaCalibrationByBoard[board.id]),
        roomGeometry: normalizeRoomGeometryMap(state.roomGeometryByBoard[board.id], board.id),
        roomStateProfiles: normalizeRoomStateProfileMap(state.roomStateProfilesByBoard[board.id], board.id),
        specialPolygons: normalizeSpecialPolygonMap(state.specialPolygonsByBoard[board.id], board.id),
        shipPolygon: normalizeShipPolygon(state.shipPolygonsByBoard[board.id]),
        outsideFx: normalizeOutsideFxProfile(state.outsideFxByBoard[board.id]),
      },
    ]),
  );
}

function buildLocalProfileSnapshotFromState() {
  return {
    schema: "tt-beamer.local-profiles.v2",
    savedAt: new Date().toISOString(),
    boardProfiles: buildBoardProfilesFromState(),
    animationSoundMap: normalizeAnimationSoundMap(state.animationSoundMap),
    animationGifMap: normalizeAnimationGifMap(state.animationGifMap),
  };
}

function applyBoardProfilesToState(profiles) {
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
    BOARDS.map((board) => [board.id, normalizeShipPolygon(profiles?.[board.id]?.shipPolygon)]),
  );
  state.outsideFxByBoard = Object.fromEntries(
    BOARDS.map((board) => [board.id, normalizeOutsideFxProfile(profiles?.[board.id]?.outsideFx)]),
  );
}

function applyLocalProfileSnapshotToState(payload) {
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

  if (payload && Object.prototype.hasOwnProperty.call(payload, "animationSoundMap")) {
    state.animationSoundMap = normalizeAnimationSoundMap(payload.animationSoundMap);
  }
  if (payload && Object.prototype.hasOwnProperty.call(payload, "animationGifMap")) {
    state.animationGifMap = normalizeAnimationGifMap(payload.animationGifMap);
  }
}

function extractBoardProfilesCandidate(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  if (raw.boards && typeof raw.boards === "object") {
    return raw.boards;
  }

  if (raw.boardProfiles && typeof raw.boardProfiles === "object") {
    return raw.boardProfiles;
  }

  if (
    raw.hitareaCalibrationByBoard ||
    raw.roomGeometryByBoard ||
    raw.roomStateProfilesByBoard ||
    raw.specialPolygonsByBoard
  ) {
    return Object.fromEntries(
      BOARDS.map((board) => [
        board.id,
        {
          hitareaCalibration: raw.hitareaCalibrationByBoard?.[board.id],
          roomGeometry: raw.roomGeometryByBoard?.[board.id],
          roomStateProfiles: raw.roomStateProfilesByBoard?.[board.id],
          specialPolygons: raw.specialPolygonsByBoard?.[board.id],
        },
      ]),
    );
  }

  const hasBoardKeys = BOARDS.some((board) => raw[board.id] && typeof raw[board.id] === "object");
  if (hasBoardKeys) {
    return raw;
  }

  return null;
}

function loadLegacyRoomGeometryByBoard() {
  const defaults = createDefaultRoomGeometryByBoard();
  try {
    const raw = safeLocalStorageGet(ROOM_GEOMETRY_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return defaults;
    }
    for (const board of BOARDS) {
      defaults[board.id] = normalizeRoomGeometryMap(parsed[board.id], board.id);
    }
    return defaults;
  } catch {
    return defaults;
  }
}

function loadLegacySpecialPolygonsByBoard() {
  const defaults = createDefaultSpecialPolygonsByBoard();
  try {
    const raw = safeLocalStorageGet(SPECIAL_POLYGON_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return defaults;
    }
    for (const board of BOARDS) {
      defaults[board.id] = normalizeSpecialPolygonMap(parsed[board.id], board.id);
    }
    return defaults;
  } catch {
    return defaults;
  }
}

function buildMigratedBoardProfiles(candidate, legacyHitarea, legacyRoomGeometry, legacySpecialPolygons) {
  const migrated = createDefaultBoardProfiles();
  for (const board of BOARDS) {
    const profile = candidate?.[board.id] ?? {};
    migrated[board.id] = {
      hitareaCalibration:
        profile.hitareaCalibration ??
        profile.hitarea ??
        legacyHitarea[board.id] ??
        HITAREA_CALIBRATION_DEFAULT,
      roomGeometry:
        profile.roomGeometry ?? profile.geometry ?? legacyRoomGeometry[board.id] ?? createDefaultRoomGeometryMap(board.id),
      roomStateProfiles:
        profile.roomStateProfiles ?? profile.roomStates ?? createDefaultRoomStateProfileMap(board.id),
      specialPolygons:
        profile.specialPolygons ??
        profile.polygons ??
        legacySpecialPolygons[board.id] ??
        createDefaultSpecialPolygonMap(board.id),
      shipPolygon:
        profile.shipPolygon ??
        profile.shipMask ??
        SHIP_POLYGON_DEFAULT,
      outsideFx:
        profile.outsideFx ??
        profile.outside ??
        OUTSIDE_FX_DEFAULT,
    };
  }
  return migrated;
}

function loadBoardProfiles() {
  const legacyHitarea = loadHitareaCalibrationMap();
  const legacyRoomGeometry = loadLegacyRoomGeometryByBoard();
  const legacySpecialPolygons = loadLegacySpecialPolygonsByBoard();

  try {
    const raw = safeLocalStorageGet(BOARD_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const candidate = extractBoardProfilesCandidate(parsed);
      if (candidate) {
        applyLocalProfileSnapshotToState(parsed);
        const migratedProfiles = buildMigratedBoardProfiles(
          extractBoardProfilesCandidate(parsed),
          legacyHitarea,
          legacyRoomGeometry,
          legacySpecialPolygons,
        );
        applyBoardProfilesToState(migratedProfiles);
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
  return safeLocalStorageSet(BOARD_PROFILE_STORAGE_KEY, JSON.stringify(buildLocalProfileSnapshotFromState()));
}

function buildGlobalDefaultsPayload() {
  let localStorageProfiles = null;
  try {
    const raw = safeLocalStorageGet(BOARD_PROFILE_STORAGE_KEY);
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
    audio: {
      enabled: Boolean(state.audio.enabled),
      volume: Math.max(0, Math.min(1, Number(state.audio.volume) || 0)),
    },
    animationSpeed: clampAnimationSpeed(state.animationSpeed),
    animationSoundMap: normalizeAnimationSoundMap(state.animationSoundMap),
    animationGifMap: normalizeAnimationGifMap(state.animationGifMap),
  };
}

async function saveGlobalDefaultsToServer() {
  const payload = buildGlobalDefaultsPayload();
  const apiCandidates = resolveGlobalDefaultsApiCandidates();
  const requestBody = JSON.stringify(payload);
  let lastError = null;

  for (const candidate of apiCandidates) {
    const endpoint = candidate.endpoint;
    const preflight = await runApiPreflight(endpoint);
    if (!preflight.ok) {
      lastError = buildGlobalDefaultsSaveError({
        code: preflight.code,
        status: preflight.status,
        statusClass: classifyHttpStatus(preflight.status),
        details: preflight.details,
        endpoint,
        method: preflight.method,
        routing: candidate,
      });
      continue;
    }

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: requestBody,
      });

      if (!response.ok) {
        const details = await response.text();
        lastError = buildGlobalDefaultsSaveError({
          code: classifyFailedSaveResponse(response, details),
          status: response.status,
          statusClass: classifyHttpStatus(response.status),
          details,
          endpoint,
          method: "POST",
          routing: candidate,
        });
        continue;
      }

      const result = await response.json();
      return {
        savedAt: result?.savedAt ?? payload.savedAt,
        target: result?.target ?? "config/global-defaults.json",
        endpoint,
        method: "POST",
        status: response.status,
        statusClass: classifyHttpStatus(response.status),
        routing: candidate,
      };
    } catch (error) {
      lastError =
        error instanceof Error && "code" in error
          ? error
          : buildGlobalDefaultsSaveError({
              code: "API_UNREACHABLE",
              details: error instanceof Error ? error.message : "request failed",
              endpoint,
              method: "POST",
              routing: candidate,
            });
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("Global Defaults Save fehlgeschlagen");
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

async function runApiPreflight(saveEndpoint) {
  // Save uses the same endpoint snapshot as diagnostics. We always probe health + OPTIONS first,
  // so operators get deterministic feedback before the actual POST attempt.
  const healthEndpoint = `${getApiBaseFromSaveEndpoint(saveEndpoint)}/api/health`;
  try {
    const healthResponse = await fetchWithTimeout(healthEndpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });
    if (!healthResponse.ok) {
      const details = await healthResponse.text();
      return {
        ok: false,
        code: classifyFailedHealthResponse(healthResponse, details),
        method: "GET",
        status: healthResponse.status,
        details,
      };
    }
  } catch (error) {
    return {
      ok: false,
      code: "API_UNREACHABLE",
      method: "GET",
      status: null,
      details: error instanceof Error ? error.message : "health request failed",
    };
  }

  try {
    const optionsResponse = await fetchWithTimeout(saveEndpoint, {
      method: "OPTIONS",
    });
    if (!optionsResponse.ok) {
      const details = await optionsResponse.text();
      return {
        ok: false,
        code: classifyFailedSaveResponse(optionsResponse, details),
        method: "OPTIONS",
        status: optionsResponse.status,
        details,
      };
    }
    const allowHeader = String(optionsResponse.headers.get("allow") || "").toUpperCase();
    if (allowHeader && !allowHeader.split(",").map((entry) => entry.trim()).includes("POST")) {
      return {
        ok: false,
        code: "API_METHOD_UNAVAILABLE",
        method: "OPTIONS",
        status: optionsResponse.status,
        details: `allow=${allowHeader}`,
      };
    }
  } catch (error) {
    return {
      ok: false,
      code: "API_UNREACHABLE",
      method: "OPTIONS",
      status: null,
      details: error instanceof Error ? error.message : "options request failed",
    };
  }

  return {
    ok: true,
    code: "OK",
    method: "OPTIONS",
    status: 200,
    details: "preflight ok",
  };
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
  const endpoints = [];
  const seen = new Set();

  function addEndpoint(base, source) {
    const normalized = normalizeApiBase(base);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    endpoints.push({
      apiBase: normalized,
      endpoint: `${normalized}/api/global-defaults`,
      source,
      uiHost: getUiHostName(),
      apiHost: getApiHostName(normalized),
    });
  }

  const configured = readConfiguredApiBase();
  if (configured) {
    addEndpoint(configured.base, configured.source);
  }

  addEndpoint(window.location?.origin, "ui-host-default");

  const uiHost = getUiHostName();
  const uiProtocol = getUiProtocol();
  const fallbackHost = uiHost || "localhost";
  const allowLocalhostFallback = !uiHost || isLocalApiHost(uiHost);

  for (const port of API_PORT_FALLBACKS) {
    addEndpoint(`${uiProtocol}//${fallbackHost}:${port}`, `fallback:${fallbackHost}:${port}`);
  }

  if (allowLocalhostFallback) {
    addEndpoint("http://localhost:4173", "fallback:localhost:4173");
    addEndpoint("http://127.0.0.1:4173", "fallback:127.0.0.1:4173");
  }

  return endpoints;
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
    const localBase = normalizeApiBase(safeLocalStorageGet(API_BASE_STORAGE_KEY));
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
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
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
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const body = String(details || "").toLowerCase();
  if (response.status === 405 || response.status === 501) {
    return "API_METHOD_UNAVAILABLE";
  }
  if (contentType.includes("text/html") || body.includes("<html") || body.includes("<!doctype")) {
    return "API_HTML_ERROR";
  }
  if (response.status >= 500) {
    return "API_SERVER_ERROR";
  }
  return "API_REQUEST_FAILED";
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
  const error = new Error(`Global Defaults Save fehlgeschlagen (${code})`);
  error.code = code;
  error.status = status;
  error.statusClass = statusClass;
  error.details = details;
  error.endpoint = endpoint;
  error.method = method;
  error.routing = routing;
  return error;
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
    error && typeof error === "object" && "endpoint" in error ? String(error.endpoint || "") : "unbekannt";
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
      statusText: `Speichern blockiert - Static-only Server aktiv, Save nicht moeglich (${hostMeta}; ${endpointMeta}).`,
      feedbackText:
        `Status: Static-only Server aktiv, Save nicht moeglich (${hostMeta}; ${endpointMeta}). ${startHint}`,
      diagnoseStatusText: `API Diagnose: Static-only Server aktiv, Save nicht moeglich (${hostMeta}; ${endpointMeta})`,
    };
  }
  if (
    code === "API_UNREACHABLE" ||
    code === "API_HTML_ERROR" ||
    code === "API_METHOD_UNAVAILABLE" ||
    code === "API_HEALTH_FAILED"
  ) {
    return {
      statusText: `Speichern fehlgeschlagen - API-Endpoint nicht save-faehig (${hostMeta}; ${endpointMeta}).`,
      feedbackText: `Status: API fuer Global Defaults nicht verfuegbar (${hostMeta}; ${endpointMeta}). ${startHint}`,
      diagnoseStatusText: `API Diagnose: API-Endpoint nicht save-faehig (${hostMeta}; ${endpointMeta})`,
    };
  }
  if (code === "API_SERVER_ERROR") {
    return {
      statusText: `Speichern fehlgeschlagen - API-Serverfehler (${hostMeta}; ${endpointMeta}).`,
      feedbackText: `Status: API-Server hat den Save-Request nicht verarbeitet (${hostMeta}; ${endpointMeta}).`,
      diagnoseStatusText: `API Diagnose: API-Serverfehler (${hostMeta}; ${endpointMeta})`,
    };
  }
  return {
    statusText: `Speichern fehlgeschlagen - bitte Save-Setup pruefen (${hostMeta}; ${endpointMeta}).`,
    feedbackText: `Status: Save fehlgeschlagen (${hostMeta}; ${endpointMeta}). ${startHint}`,
    diagnoseStatusText: `API Diagnose: fehlgeschlagen (${hostMeta}; ${endpointMeta})`,
  };
}

function formatResolverSourceLabel(source) {
  return source || "unbekannt";
}

function buildResolveSnapshot({ routing = null, endpoint = "", method = "POST" } = {}) {
  return {
    uiHost: routing?.uiHost || getUiHostName() || "unbekannt",
    apiHost: routing?.apiHost || getApiHostName(getApiBaseFromSaveEndpoint(endpoint)) || "unbekannt",
    source: formatResolverSourceLabel(routing?.source),
    endpoint,
    method,
  };
}

function formatResolveSnapshot(snapshot) {
  if (!snapshot) {
    return "UI-Host unbekannt -> API-Host unbekannt | Quelle unbekannt | Endpoint unbekannt";
  }
  return `UI-Host ${snapshot.uiHost} -> API-Host ${snapshot.apiHost} | Quelle ${snapshot.source} | Endpoint ${snapshot.method} ${snapshot.endpoint}`;
}

function formatHostFlow(routing) {
  const uiHost = routing?.uiHost || getUiHostName() || "unbekannt";
  const apiHost = routing?.apiHost || "unbekannt";
  return `UI-Host ${uiHost} -> API-Host ${apiHost}`;
}

function getRemoteMismatchHint(routing) {
  const uiHost = routing?.uiHost || getUiHostName();
  const apiHost = routing?.apiHost || "";
  if (!uiHost || !apiHost) {
    return null;
  }
  if (!isLocalApiHost(uiHost) && isLocalApiHost(apiHost)) {
    return "Remote/LAN-Hinweis: Die UI laeuft remote, aber API zeigt auf localhost. Setze ?ttApiBase=http://<SERVER-IP>:4173 oder oeffne die UI direkt ueber den Server-Host.";
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
    `Next Steps (headless/LAN): Stoppe ggf. \`python3 -m http.server ${port}\` (Static-only) und starte \`${serverStartCmd}\` ` +
    `(alternativ \`${envStartCmd}\`). Pruefe danach API unter ${verifyUrl}/api/health und oeffne die UI ueber ${uiUrl}.`;
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
    const raw = safeLocalStorageGet(BOARD_PROFILE_STORAGE_KEY);
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
  const candidates = listGlobalDefaultsLoadCandidates();
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const response = await fetchWithTimeout(candidate.endpoint, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      });
      if (!response.ok) {
        lastError = buildGlobalDefaultsSaveError({
          code: "API_REQUEST_FAILED",
          status: response.status,
          statusClass: classifyHttpStatus(response.status),
          endpoint: candidate.endpoint,
          method: "GET",
          routing: candidate.routing,
        });
        continue;
      }
      const payload = await response.json();
      if (!payload || typeof payload !== "object") {
        continue;
      }
      return {
        payload,
        endpoint: candidate.endpoint,
        source: candidate.source,
        routing: candidate.routing,
      };
    } catch (error) {
      lastError =
        error instanceof Error && "code" in error
          ? error
          : buildGlobalDefaultsSaveError({
              code: "API_UNREACHABLE",
              details: error instanceof Error ? error.message : "defaults load failed",
              endpoint: candidate.endpoint,
              method: "GET",
              routing: candidate.routing,
            });
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw buildGlobalDefaultsSaveError({
    code: "API_REQUEST_FAILED",
    details: "no defaults endpoint reachable",
    endpoint: "n/a",
    method: "GET",
  });
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
  if (payload && Object.prototype.hasOwnProperty.call(payload, "animationGifMap")) {
    state.animationGifMap = normalizeAnimationGifMap(payload.animationGifMap);
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
    `Global Defaults: geladen & angewendet (${formatResolveSnapshot(snapshot)} | Quelle ${sourceLabel})`;
  apiDiagnoseStatus.textContent =
    `API Diagnose: OK (${formatResolveSnapshot(snapshot)} | GET /api/global-defaults oder config/global-defaults.json)`;
  triggerFeedback.textContent =
    `Status: Defaults geladen & angewendet (${formatResolveSnapshot(snapshot)} | ${sourceLabel})`;

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
  const defaults = createDefaultHitareaCalibrationMap();
  try {
    const raw = safeLocalStorageGet(HITAREA_CALIBRATION_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return defaults;
    }
    for (const board of BOARDS) {
      defaults[board.id] = normalizeHitareaCalibration(parsed[board.id]);
    }
    return defaults;
  } catch {
    return defaults;
  }
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
  return normalizeSpecialPolygon(boardPolygons[roomId], room?.points ?? []);
}

function setSpecialPolygonPoints(boardId, roomId, points) {
  if (!state.specialPolygonsByBoard[boardId]) {
    state.specialPolygonsByBoard[boardId] = createDefaultSpecialPolygonMap(boardId);
  }
  const room = getBoard(boardId).rooms.find((entry) => entry.id === roomId);
  state.specialPolygonsByBoard[boardId][roomId] = normalizeSpecialPolygon(points, room?.points ?? []);
}

function getRoomSourcePoints(room, boardId = state.boardId) {
  if (!room.points) {
    return [];
  }
  if (room.id.startsWith("special-")) {
    return getSpecialPolygonPoints(boardId, room.id);
  }
  return room.points;
}

function getSpecialRooms(boardId = state.boardId) {
  return getBoard(boardId).rooms.filter((room) => room.id.startsWith("special-"));
}

function getActivePolygonRoomId(boardId = state.boardId) {
  const available = getSpecialRooms(boardId);
  const preferred = state.polygonEditor.roomIdByBoard[boardId];
  if (available.some((room) => room.id === preferred)) {
    return preferred;
  }
  return available[0]?.id ?? null;
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
    ? "PAN aktiv (ziehen)"
    : state.panMode.spacePressed
      ? "PAN bereit (Space gedrueckt)"
      : "Edit-Modus";
  boardZoomStatus.textContent = `Zoom: ${percent}% (Min 100%, Max 300%) | Pan X ${Math.round(zoom.panX)}px, Y ${Math.round(zoom.panY)}px | Bounds ±${Math.round(bounds.maxPanX)}px/±${Math.round(bounds.maxPanY)}px`;
  if (boardPanStatus) {
    const hint = zoom.scale > 1
      ? "Space + Drag oder mittlere Maustaste: Board verschieben"
      : "Pan wird ab Zoom > 100% aktiv";
    boardPanStatus.textContent = `Pan-Status: ${modeLabel} | ${hint}`;
  }
}

function syncBoardZoomPanel() {
  const zoom = getBoardZoom(state.boardId);
  const percent = Math.round(zoom.scale * 100);
  boardZoomRangeInput.value = String(percent);
  boardZoomValue.textContent = `${percent}%`;
  syncBoardZoomStatus();
  syncStageZoomTransform();
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
    updateCurrentBoardZoom(BOARD_ZOOM_DEFAULT, "Zoom auf Default gesetzt");
    return;
  }

  const points = getRoomPoints(room, state.boardId).map(([x, y]) => [x / 1000, y / 1000]);
  if (!points.length) {
    updateCurrentBoardZoom(BOARD_ZOOM_DEFAULT, "Zoom auf Default gesetzt");
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
  updateCurrentBoardZoom(viewport, `${room.label} gezoomt (${Math.round(scale * 100)}%)`);
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
  triggerFeedback.textContent = "Status: Pan-Modus aktiv (Board verschieben)";
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
    ? "Status: Pan-Modus abgebrochen"
    : "Status: Pan-Modus beendet";
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

function getRoomGifAssetFileNameByPath(path) {
  if (!path || path === ROOM_GIF_MAPPING_NONE) {
    return null;
  }
  return path ? path.split("/").pop() ?? path : null;
}

function getRoomGifAssetFileName(type, explicitPath = null) {
  const path = explicitPath ?? getMappedGifPathForAnimation(type) ?? ROOM_GIF_ANIMATION_ASSETS[type];
  return getRoomGifAssetFileNameByPath(path);
}

function getGifImage(path) {
  if (!path) {
    return null;
  }
  if (!gifImageCacheByPath.has(path)) {
    const image = new Image();
    image.decoding = "async";
    image.src = path;
    gifImageCacheByPath.set(path, image);
  }
  return gifImageCacheByPath.get(path) ?? null;
}

function getGifPlayback(path) {
  if (!path) {
    return null;
  }
  if (gifPlaybackCacheByPath.has(path)) {
    return gifPlaybackCacheByPath.get(path) ?? null;
  }
  const fallbackImage = getGifImage(path);
  const record = {
    path,
    status: "loading",
    frames: [],
    totalDurationMs: 0,
    loopCount: Infinity,
    fallbackImage,
  };
  gifPlaybackCacheByPath.set(path, record);

  void (async () => {
    if (typeof ImageDecoder !== "function") {
      record.status = "error";
      return;
    }
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`GIF fetch failed: ${response.status}`);
      }
      const data = await response.arrayBuffer();
      const decoder = new ImageDecoder({ type: "image/gif", data });
      const track = decoder.tracks?.selectedTrack;
      const frameCount = Math.max(1, Number(track?.frameCount) || 1);
      const repetitionCount = Number(track?.repetitionCount);
      if (Number.isFinite(repetitionCount) && repetitionCount >= 0) {
        record.loopCount = repetitionCount === 0 ? Infinity : repetitionCount;
      } else {
        record.loopCount = Infinity;
      }
      const frames = [];
      let totalDurationMs = 0;
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        const result = await decoder.decode({ frameIndex, completeFramesOnly: true });
        const videoFrame = result?.image;
        if (!videoFrame) {
          continue;
        }
        const bitmap = await createImageBitmap(videoFrame);
        const rawDuration = Number(videoFrame.duration);
        const durationMs = Number.isFinite(rawDuration) && rawDuration > 0
          ? Math.max(20, Math.round(rawDuration / 1000))
          : 100;
        videoFrame.close();
        frames.push({ image: bitmap, durationMs });
        totalDurationMs += durationMs;
      }
      if (frames.length === 0) {
        throw new Error("GIF decode produced 0 frames");
      }
      record.frames = frames;
      record.totalDurationMs = Math.max(1, totalDurationMs);
      record.status = "ready";
      decoder.close();
    } catch {
      record.status = "error";
    }
  })();

  return record;
}

function getGifFrameForElapsedMs(playback, elapsedMs) {
  if (!playback || playback.status !== "ready" || playback.frames.length === 0) {
    return null;
  }
  if (playback.frames.length === 1 || playback.totalDurationMs <= 1) {
    return playback.frames[0]?.image ?? null;
  }

  const finiteLoop = Number.isFinite(playback.loopCount);
  let cursor = Math.max(0, elapsedMs);
  if (finiteLoop) {
    const maxDuration = playback.totalDurationMs * Math.max(1, playback.loopCount);
    if (cursor >= maxDuration) {
      return playback.frames[playback.frames.length - 1]?.image ?? null;
    }
  }
  cursor %= playback.totalDurationMs;

  let accumulator = 0;
  for (const frame of playback.frames) {
    accumulator += frame.durationMs;
    if (cursor < accumulator) {
      return frame.image;
    }
  }
  return playback.frames[playback.frames.length - 1]?.image ?? null;
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
    roomGeometryStatus.textContent = "Raum-Geometrie: bitte Raum auf dem Board waehlen";
    return;
  }
  const geometry = getRoomGeometry(state.boardId, room.id);
  if (geometry.mode === "absolute") {
    roomGeometryStatus.textContent = `Raum-Geometrie (${room.label}): ABS X ${formatRoomGeometryValue(geometry.absoluteX)}, Y ${formatRoomGeometryValue(geometry.absoluteY)} | Stretch ${formatRoomGeometryValue(geometry.stretchX)}:${formatRoomGeometryValue(geometry.stretchY)}`;
    return;
  }
  roomGeometryStatus.textContent = `Raum-Geometrie (${room.label}): REL dX ${formatRoomGeometryValue(geometry.offsetX)}, dY ${formatRoomGeometryValue(geometry.offsetY)} | Stretch ${formatRoomGeometryValue(geometry.stretchX)}:${formatRoomGeometryValue(geometry.stretchY)}`;
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
  const zoneLabel = state.dashboardZone === "manage" ? "Running managen" : "Triggern";
  mobileLayoutStatus.textContent = isMobile
    ? `Mobile (${orientation}): Fokus ${zoneLabel}`
    : "Desktop: Trigger- und Manage-Bereiche parallel sichtbar";
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
        "Status: Navigation-Guard meldet Ausfall (Dashboard/Settings nicht durchgaengig sichtbar)";
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
        "Status: Mobile-Projektions-Guard meldet Overlay (Board darf nicht von Controls ueberdeckt werden)";
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
        ? "Status: Mobile-Fokus auf Running-Management gesetzt"
        : "Status: Mobile-Fokus auf Trigger gesetzt";
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

function createEmptyRenderTickStats() {
  return {
    outsideLayerErrors: 0,
    animationLayerErrors: 0,
    clipErrors: 0,
    schedulerErrors: 0,
    totalErrors: 0,
  };
}

function beginRenderTick(now) {
  state.renderTelemetry.lastTick = createEmptyRenderTickStats();
  if (Number.isFinite(now)) {
    state.renderTelemetry.lastFrameAt = now;
  }
}

function recordRenderTickError(kind) {
  const bucketByKind = {
    outside: "outsideLayerErrors",
    animation: "animationLayerErrors",
    clip: "clipErrors",
    scheduler: "schedulerErrors",
  };
  const bucket = bucketByKind[kind] ?? "schedulerErrors";
  state.renderTelemetry.lastTick[bucket] += 1;
  state.renderTelemetry.lastTick.totalErrors += 1;
  state.renderTelemetry.totals[bucket] += 1;
}

function recordRenderClipFallback(kind) {
  if (!Object.prototype.hasOwnProperty.call(state.renderTelemetry.clipFallbacks, kind)) {
    return;
  }
  state.renderTelemetry.clipFallbacks[kind] += 1;
}

function finalizeRenderTick(frameCostMs) {
  state.renderTelemetry.frameCount += 1;
  state.renderTelemetry.lastFrameCostMs = Number.isFinite(frameCostMs) ? frameCostMs : 0;
}

function consumeRenderFaultInjectionFlag(key) {
  if (!state.renderTelemetry.faultInjection[key]) {
    return false;
  }
  state.renderTelemetry.faultInjection[key] = false;
  return true;
}

function getRenderTelemetrySnapshot() {
  return {
    frameCount: state.renderTelemetry.frameCount,
    lastFrameAt: state.renderTelemetry.lastFrameAt,
    lastFrameCostMs: state.renderTelemetry.lastFrameCostMs,
    lastTick: { ...state.renderTelemetry.lastTick },
    totals: { ...state.renderTelemetry.totals },
    clipFallbacks: { ...state.renderTelemetry.clipFallbacks },
  };
}

function installRenderReproHarness() {
  window.__TT_BEAMER_RENDER_HARNESS__ = {
    injectOutsideLayerFailureOnce() {
      state.renderTelemetry.faultInjection.outsideLayerFailOnce = true;
      return getRenderTelemetrySnapshot();
    },
    injectClipFailureOnce() {
      state.renderTelemetry.faultInjection.clipFailOnce = true;
      return getRenderTelemetrySnapshot();
    },
    getSnapshot() {
      return getRenderTelemetrySnapshot();
    },
    resetCounters() {
      state.renderTelemetry.frameCount = 0;
      state.renderTelemetry.lastFrameAt = 0;
      state.renderTelemetry.lastFrameCostMs = 0;
      state.renderTelemetry.lastTick = createEmptyRenderTickStats();
      state.renderTelemetry.totals = createEmptyRenderTickStats();
      state.renderTelemetry.clipFallbacks = {
        outsideEvenOddFallback: 0,
        outsideCompositeFallback: 0,
        insideInvalidPolygon: 0,
      };
      return getRenderTelemetrySnapshot();
    },
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
    mobilePerformanceStatus.textContent = "Mobile Performance: noch kein Snapshot";
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
  triggerFeedback.textContent = "Status: Clear All ausgefuehrt";
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
    stopAllButton.textContent = "Clear All bestaetigen";
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
        "Status: Konfigurations-Leak erkannt (Settings-Control ausserhalb Settings gefunden)";
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
      triggerFeedback.textContent = "Status: Tab-Exklusivitaet verletzt (sichtbarer Rest-Block erkannt)";
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
    const expectedRunningPositions = mobileViewport ? ["static", "relative"] : ["sticky", "fixed"];
    if (!expectedRunningPositions.includes(runningPosition)) {
      issues.push(`running panel position=${runningPosition || "missing"}`);
    }
    const stickyTop = window.getComputedStyle(runningOverviewPanel).top;
    if (!mobileViewport && (!stickyTop || stickyTop === "auto")) {
      issues.push(`running panel top=${stickyTop || "missing"}`);
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

function runGifDirectStartEditReloadRegression() {
  const gifType = ROOM_ANIMATIONS.find((animation) => isGifRoomAnimation(animation.id))?.id ?? "kaputt";
  const defaultPath = ROOM_GIF_ANIMATION_ASSETS[gifType] ?? null;
  const mappedPath = ROOM_GIF_ASSET_PATHS.find((path) => path !== defaultPath) ?? defaultPath;
  const targetRoom = getBoard().rooms[0];

  if (!targetRoom || !mappedPath) {
    return true;
  }

  const issues = [];
  const previousSelectedRoomId = state.selectedRoomId;
  const previousRoomDraft = { ...state.roomDraft };
  const previousRunningAnimations = state.runningAnimations.map((entry) => ({ ...entry }));
  const previousAnimationGifMap = { ...state.animationGifMap };
  const previousRunningIds = new Set(previousRunningAnimations.map((entry) => entry.id));

  let createdId = null;

  try {
    state.selectedRoomId = targetRoom.id;
    state.animationGifMap[gifType] = mappedPath;
    state.roomDraft = {
      ...state.roomDraft,
      animationId: gifType,
      intensity: 0.8,
      speed: 1,
      opacity: 0.9,
      playbackSpeed: 1,
      soundVolume: 1,
      editTargetId: null,
    };

    startRoomAnimationFromDraft();
    const created = state.runningAnimations.find(
      (entry) =>
        !previousRunningIds.has(entry.id) && entry.scope === "room" && entry.roomId === targetRoom.id,
    );
    if (!created) {
      issues.push("direct-start did not create room animation instance");
    } else {
      createdId = created.id;
      const normalizedMapped = normalizeAnimationGifPath(gifType, mappedPath);
      if (created.gifAssetPath !== normalizedMapped) {
        issues.push("direct-start instance missing mapped gifAssetPath");
      }
    }

    if (createdId) {
      state.roomDraft = {
        ...state.roomDraft,
        animationId: gifType,
        editTargetId: createdId,
      };
      startRoomAnimationFromDraft();
      const edited = state.runningAnimations.find((entry) => entry.id === createdId) ?? null;
      if (!edited) {
        issues.push("edit-flow replaced instance id instead of in-place update");
      } else {
        const normalizedMapped = normalizeAnimationGifPath(gifType, mappedPath);
        if (edited.gifAssetPath !== normalizedMapped) {
          issues.push("edit-flow changed gifAssetPath away from mapped value");
        }
      }
    }

    const snapshot = buildLocalProfileSnapshotFromState();
    state.animationGifMap[gifType] = ROOM_GIF_MAPPING_NONE;
    applyLocalProfileSnapshotToState(snapshot);
    const restoredMapped = normalizeAnimationGifPath(gifType, state.animationGifMap[gifType]);
    const expectedMapped = normalizeAnimationGifPath(gifType, mappedPath);
    if (restoredMapped !== expectedMapped) {
      issues.push("reload snapshot failed to restore mapped gif path");
    }
  } catch {
    issues.push("direct-start/edit/reload regression threw unexpectedly");
  } finally {
    const currentExtraIds = state.runningAnimations
      .filter((entry) => !previousRunningIds.has(entry.id))
      .map((entry) => entry.id);
    for (const animationId of currentExtraIds) {
      stopAnimationSound(animationId);
    }
    state.runningAnimations = previousRunningAnimations;
    state.animationGifMap = previousAnimationGifMap;
    state.selectedRoomId = previousSelectedRoomId;
    state.roomDraft = { ...previousRoomDraft };
    syncRoomForm();
  }

  if (issues.length > 0) {
    console.error("Direct-start GIF mapping regression violation", issues);
    return false;
  }
  return true;
}

function syncPolygonEditorStatus() {
  const roomId = getActivePolygonRoomId(state.boardId);
  const room = getBoard().rooms.find((entry) => entry.id === roomId);
  if (!room) {
    polygonEditorStatus.textContent = "Polygoneditor: keine Spezialraeume auf diesem Board";
    return;
  }
  const points = getSpecialPolygonPoints(state.boardId, room.id);
  const activeVertex = Math.max(0, Math.min(points.length - 1, state.polygonEditor.selectedVertexIndex));
  const activeEdge = Math.max(0, Math.min(points.length - 1, state.polygonEditor.selectedEdgeIndex));
  polygonEditorStatus.textContent = `Polygoneditor (${room.label}): ${points.length} Ecken | aktiv Ecke ${activeVertex + 1} | Kante ${activeEdge + 1}`;
}

function syncPolygonVertexSelect(roomId) {
  polygonVertexSelect.replaceChildren();
  const room = getBoard().rooms.find((entry) => entry.id === roomId);
  if (!room) {
    polygonVertexSelect.disabled = true;
    return;
  }
  const points = getSpecialPolygonPoints(state.boardId, room.id);
  for (let i = 0; i < points.length; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `Ecke ${i + 1}`;
    polygonVertexSelect.append(option);
  }
  const maxIndex = Math.max(0, points.length - 1);
  state.polygonEditor.selectedVertexIndex = Math.min(state.polygonEditor.selectedVertexIndex, maxIndex);
  state.polygonEditor.selectedEdgeIndex = Math.min(state.polygonEditor.selectedEdgeIndex, maxIndex);
  polygonVertexSelect.value = String(state.polygonEditor.selectedVertexIndex);
  polygonVertexSelect.disabled = points.length === 0;
  polygonDeleteVertexButton.disabled = points.length <= 3;
}

function syncPolygonEdgeSelect(roomId) {
  polygonEdgeSelect.replaceChildren();
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
    option.textContent = `Kante ${i + 1} (Ecke ${i + 1} -> ${next})`;
    polygonEdgeSelect.append(option);
  }
  const maxIndex = Math.max(0, points.length - 1);
  state.polygonEditor.selectedEdgeIndex = Math.min(state.polygonEditor.selectedEdgeIndex, maxIndex);
  polygonEdgeSelect.value = String(state.polygonEditor.selectedEdgeIndex);
  polygonEdgeSelect.disabled = points.length === 0;
}

function syncPolygonEditorPanel() {
  const specials = getSpecialRooms(state.boardId);
  const previous = polygonRoomSelect.value;
  polygonRoomSelect.replaceChildren();
  for (const room of specials) {
    const option = document.createElement("option");
    option.value = room.id;
    option.textContent = room.label;
    polygonRoomSelect.append(option);
  }
  const preferred = getActivePolygonRoomId(state.boardId);
  const activeRoomId = specials.some((room) => room.id === preferred)
    ? preferred
    : specials.some((room) => room.id === previous)
      ? previous
      : specials[0]?.id;
  if (activeRoomId) {
    setActivePolygonRoomId(state.boardId, activeRoomId);
    polygonRoomSelect.value = activeRoomId;
  }
  const disabled = specials.length === 0;
  polygonRoomSelect.disabled = disabled;
  polygonInsertVertexButton.disabled = disabled;
  polygonResetRoomButton.disabled = disabled;
  polygonFocusRoomButton.disabled = disabled;
  syncPolygonVertexSelect(activeRoomId);
  syncPolygonEdgeSelect(activeRoomId);
  syncPolygonEditorStatus();
}

function syncShipPolygonEditorStatus() {
  const points = getShipPolygonPoints(state.boardId);
  const activeVertex = Math.max(0, Math.min(points.length - 1, state.shipPolygonEditor.selectedVertexIndex));
  const activeEdge = Math.max(0, Math.min(points.length - 1, state.shipPolygonEditor.selectedEdgeIndex));
  shipPolygonEditorStatus.textContent = `Ship-Polygoneditor: ${points.length} Ecken | aktiv Ecke ${activeVertex + 1} | Kante ${activeEdge + 1}`;
}

function syncShipPolygonVertexSelect() {
  shipPolygonVertexSelect.replaceChildren();
  const points = getShipPolygonPoints(state.boardId);
  for (let i = 0; i < points.length; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `Ecke ${i + 1}`;
    shipPolygonVertexSelect.append(option);
  }
  const maxIndex = Math.max(0, points.length - 1);
  state.shipPolygonEditor.selectedVertexIndex = Math.min(state.shipPolygonEditor.selectedVertexIndex, maxIndex);
  state.shipPolygonEditor.selectedEdgeIndex = Math.min(state.shipPolygonEditor.selectedEdgeIndex, maxIndex);
  shipPolygonVertexSelect.value = String(state.shipPolygonEditor.selectedVertexIndex);
  shipPolygonDeleteVertexButton.disabled = points.length <= 3;
}

function syncShipPolygonEdgeSelect() {
  shipPolygonEdgeSelect.replaceChildren();
  const points = getShipPolygonPoints(state.boardId);
  for (let i = 0; i < points.length; i += 1) {
    const option = document.createElement("option");
    const next = i === points.length - 1 ? 1 : i + 2;
    option.value = String(i);
    option.textContent = `Kante ${i + 1} (Ecke ${i + 1} -> ${next})`;
    shipPolygonEdgeSelect.append(option);
  }
  const maxIndex = Math.max(0, points.length - 1);
  state.shipPolygonEditor.selectedEdgeIndex = Math.min(state.shipPolygonEditor.selectedEdgeIndex, maxIndex);
  shipPolygonEdgeSelect.value = String(state.shipPolygonEditor.selectedEdgeIndex);
}

function syncShipPolygonEditorPanel() {
  syncShipPolygonVertexSelect();
  syncShipPolygonEdgeSelect();
  syncShipPolygonEditorStatus();
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
    ? "Status: Ship-Polygon-Ecke verschoben"
    : "Status: Ship-Polygon-Ecke verschoben (Persistenz fehlgeschlagen)";
}

function cancelShipPolygonDrag() {
  const { dragBoardId, dragStartPoints } = state.shipPolygonEditor;
  if (dragBoardId && Array.isArray(dragStartPoints)) {
    setShipPolygonPoints(dragBoardId, dragStartPoints);
  }
  renderRoomOverlay();
  syncShipPolygonEditorStatus();
  triggerFeedback.textContent = "Status: Ship-Polygon-Drag abgebrochen";
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
  const points = getShipPolygonPoints(state.boardId).map(([x, y]) => [x * 1000, y * 1000]);
  if (points.length < 3) {
    return;
  }
  const zoomScale = getBoardZoom(state.boardId).scale;
  const inverseZoom = 1 / zoomScale;
  const edgeHitRadius = Math.max(8, 12 * inverseZoom);
  const edgeHandleRadius = Math.max(4, 5.5 * inverseZoom);
  const vertexHitRadius = Math.max(10, 16 * inverseZoom);
  const vertexHandleRadius = Math.max(5, 7.5 * inverseZoom);
  const vertexLabelSize = Math.max(9, 11 * inverseZoom);

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
      if (isPanArbitrating() || event.button !== 0) {
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
      if (isPanArbitrating() || event.button !== 0) {
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

function syncSpecialRoomSelection(roomId) {
  if (!roomId || !roomId.startsWith("special-")) {
    return;
  }
  const specials = getSpecialRooms(state.boardId);
  if (!specials.some((room) => room.id === roomId)) {
    return;
  }
  setActivePolygonRoomId(state.boardId, roomId);
  state.selectedRoomId = roomId;
  state.selectedRoomByBoard[state.boardId] = roomId;
  state.polygonEditor.selectedVertexIndex = 0;
  state.polygonEditor.selectedEdgeIndex = 0;
}

function renderPolygonEditorHandles() {
  if (state.uiView !== "settings") {
    return;
  }
  const roomId = getActivePolygonRoomId(state.boardId);
  const room = getBoard().rooms.find((entry) => entry.id === roomId);
  if (!room) {
    return;
  }
  const points = getRoomPoints(room, state.boardId);
  const zoomScale = getBoardZoom(state.boardId).scale;
  const inverseZoom = 1 / zoomScale;
  const edgeHitRadius = Math.max(8, 12 * inverseZoom);
  const edgeHandleRadius = Math.max(4, 5.5 * inverseZoom);
  const vertexHitRadius = Math.max(10, 16 * inverseZoom);
  const vertexHandleRadius = Math.max(5, 7.5 * inverseZoom);
  const vertexLabelSize = Math.max(9, 11 * inverseZoom);
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
      if (isPanArbitrating() || event.button !== 0) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      state.polygonEditor.selectedEdgeIndex = index;
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
      if (isPanArbitrating() || event.button !== 0) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      beginPolygonVertexDrag(event, room.id, index);
      state.polygonEditor.selectedVertexIndex = index;
      syncPolygonVertexSelect(room.id);
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
    ? "Status: Polygon-Ecke verschoben"
    : "Status: Polygon-Ecke verschoben (Persistenz fehlgeschlagen)";
}

function cancelPolygonDrag() {
  const { dragBoardId, dragRoomId, dragStartPoints } = state.polygonEditor;
  if (dragBoardId && dragRoomId && Array.isArray(dragStartPoints)) {
    setSpecialPolygonPoints(dragBoardId, dragRoomId, dragStartPoints);
  }
  renderRoomOverlay();
  syncPolygonEditorStatus();
  triggerFeedback.textContent = "Status: Polygon-Drag abgebrochen";
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

function syncAudioStatus() {
  const volumePercent = Math.round(state.audio.volume * 100);
  const mode = state.audio.enabled ? "ON" : "OFF";
  audioStatus.textContent = `Audio: ${mode} (${volumePercent}%)`;
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
      voice.volume = state.audio.enabled ? state.audio.volume : 0;
      voice.load();
    }
  }
}

function applyAudioGain() {
  const targetVolume = state.audio.enabled ? state.audio.volume : 0;
  for (const pool of audioAssetPoolByPath.values()) {
    for (const voice of pool) {
      voice.volume = targetVolume;
    }
  }
  for (const [animationId, active] of activeAnimationAudioById.entries()) {
    if (!active?.voice) {
      continue;
    }
    const instanceVolume = state.audio.enabled ? state.audio.volume * clampRoomSoundVolume(active.soundVolume ?? 1) : 0;
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

function playSoundForAnimation(animation) {
  if (!animation || !state.audio.enabled) {
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
    if (!stillRunning || !stillActive || !state.audio.enabled) {
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
    audioMappingStatus.textContent = "Sound-Mapping: keine Animationen verfuegbar";
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
          ? "Ausserhalb des Schiffs"
          : "Innerhalb des Schiffs";
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
  noneOption.textContent = "none (kein Sound)";
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
  state.animationSoundMap[selectedAnimationType] = mapped;
  audioMappingSoundSelect.value = mapped;
  syncAudioMappingStatus();
}

function syncGifMappingStatus() {
  const animationType = gifMappingAnimationSelect?.value || ROOM_ANIMATIONS[0]?.id;
  if (!animationType || !gifMappingStatus) {
    return;
  }
  const label = getAnimationLabel(animationType);
  const mapped = normalizeAnimationGifPath(animationType, state.animationGifMap?.[animationType]);
  if (mapped === ROOM_GIF_MAPPING_NONE) {
    gifMappingStatus.textContent = `GIF-Mapping: ${label} -> none`;
    return;
  }
  const fileName = mapped.split("/").pop() ?? mapped;
  gifMappingStatus.textContent = `GIF-Mapping: ${label} -> ${fileName}`;
}

function syncGifMappingPanel() {
  if (!gifMappingAnimationSelect || !gifMappingAssetSelect) {
    return;
  }

  if (gifMappingAnimationSelect.childElementCount === 0) {
    for (const animation of ROOM_ANIMATIONS) {
      const option = document.createElement("option");
      option.value = animation.id;
      option.textContent = animation.label;
      gifMappingAnimationSelect.append(option);
    }
  }

  const selectedAnimationType = ROOM_ANIMATIONS.some((entry) => entry.id === gifMappingAnimationSelect.value)
    ? gifMappingAnimationSelect.value
    : ROOM_ANIMATIONS[0]?.id;
  if (!selectedAnimationType) {
    return;
  }
  gifMappingAnimationSelect.value = selectedAnimationType;

  gifMappingAssetSelect.replaceChildren();
  const noneOption = document.createElement("option");
  noneOption.value = ROOM_GIF_MAPPING_NONE;
  noneOption.textContent = "none (kein GIF)";
  gifMappingAssetSelect.append(noneOption);

  for (const gifPath of ROOM_GIF_ASSET_PATHS) {
    const option = document.createElement("option");
    option.value = gifPath;
    option.textContent = gifPath.replace("resources/nemesis/animations/", "");
    gifMappingAssetSelect.append(option);
  }

  const mapped = normalizeAnimationGifPath(selectedAnimationType, state.animationGifMap?.[selectedAnimationType]);
  state.animationGifMap[selectedAnimationType] = mapped;
  gifMappingAssetSelect.value = mapped;
  syncGifMappingStatus();
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
  if (room.points) {
    const sourcePoints = getRoomSourcePoints(room, boardId);
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
  roomOverlay.replaceChildren();

  for (const room of board.rooms) {
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.classList.add("room-zone");
    polygon.dataset.roomId = room.id;
    polygon.setAttribute(
      "points",
      getRoomPoints(room, state.boardId)
        .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
        .join(" "),
    );
    polygon.addEventListener("click", () => {
      if (isPanArbitrating()) {
        return;
      }
      state.selectedRoomId = room.id;
      state.selectedRoomByBoard[state.boardId] = room.id;
      if (room.id.startsWith("special-")) {
        syncSpecialRoomSelection(room.id);
        syncPolygonEditorPanel();
      }
      syncRoomPanelFromSelection();
      renderRoomOverlay();
    });
    if (state.selectedRoomId === room.id) {
      polygon.classList.add("is-selected");
    }
    if (room.id.startsWith("special-")) {
      polygon.classList.add("is-special");
    }
    roomOverlay.append(polygon);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.classList.add("room-zone-label");
    if (room.id.startsWith("special-")) {
      label.classList.add("is-special");
    }
    const labelPosition = getRoomLabelPosition(room, state.boardId);
    label.setAttribute("x", String((labelPosition.x * 1000).toFixed(1)));
    label.setAttribute("y", String((labelPosition.y * 1000 + 8).toFixed(1)));
    label.textContent = room.label.startsWith("Hex ") ? room.label.replace("Hex ", "") : room.label;
    roomOverlay.append(label);
  }

  renderPolygonEditorHandles();
  renderShipPolygonEditorHandles();
}

function switchBoard(boardId) {
  const previousBoardId = state.boardId;
  const previousRoomId = state.selectedRoomId;
  if (previousBoardId && previousRoomId) {
    state.selectedRoomByBoard[previousBoardId] = previousRoomId;
  }

  const board = getBoard(boardId);
  state.boardId = board.id;
  boardImage.src = board.src;
  boardSelect.value = board.id;
  boardStatus.textContent = `Aktives Board: ${board.label}`;
  const rememberedRoom = state.selectedRoomByBoard[board.id];
  state.selectedRoomId = board.rooms.some((room) => room.id === rememberedRoom)
    ? rememberedRoom
    : board.rooms[0]?.id ?? null;
  state.selectedRoomByBoard[board.id] = state.selectedRoomId;
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
  triggerFeedback.textContent = "Status: Board gewechselt";
}

function syncRoomPanelFromSelection({ preserveDraftState = false } = {}) {
  const room = getSelectedRoom();
  if (!room) {
    roomSelected.textContent = "Ausgewaehlter Raum: bitte Hex auf dem Board anklicken";
    startRoomAnimationButton.disabled = true;
    roomOpacityInput.disabled = true;
    roomPlaybackSpeedInput.disabled = true;
    syncRoomGeometryPanel();
    syncDashboardZoneVisibility();
    return;
  }
  startRoomAnimationButton.disabled = false;
  roomOpacityInput.disabled = false;
  roomPlaybackSpeedInput.disabled = false;
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
  syncGifRoomControls();
  roomHoldInput.checked = true;
  roomSelected.textContent = `Ausgewaehlter Raum: ${room.label}`;
  syncRoomGeometryPanel();
  syncDashboardZoneVisibility();
}

function syncRoomDraftActionButton() {
  const isEditMode = Boolean(state.roomDraft.editTargetId);
  startRoomAnimationButton.textContent = isEditMode
    ? "Laufende Instanz aktualisieren"
    : "Animation fuer Raum starten";
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

function setLiveTriggerFeedback(message) {
  triggerFeedback.textContent = `Status: ${message} (direkt live)`;
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
  gifAssetPath = null,
  soundVolume = 1,
  hold = false,
  durationSec = 15,
}) {
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
    gifAssetPath: scope === "room" ? normalizeAnimationGifPath(type, gifAssetPath) : null,
    soundVolume: clampRoomSoundVolume(soundVolume),
    hold: effectiveHold,
    durationMs: effectiveHold ? null : Math.max(1000, durationSec * 1000),
    startedAt: performance.now(),
  };
}

function drawRoomComposition(animation, age, room, roomMetrics) {
  const qualityScale = getRuntimeQualityScale();
  const effectType = resolveRoomAnimationEffectType(animation.type, ROOM_GLOBAL_EQUIVALENT_MAP);
  const isGifAnimation = isGifRoomAnimation(animation.type);
  const playbackAge = isGifAnimation
    ? age * clampGifPlaybackSpeed(animation.playbackSpeed ?? animation.speed ?? 1)
    : age;
  const normalizedGifPath = normalizeAnimationGifPath(animation.type, animation.gifAssetPath);
  const gifAssetPath = normalizedGifPath === ROOM_GIF_MAPPING_NONE
    ? getMappedGifPathForAnimation(animation.type) ?? ROOM_GIF_ANIMATION_ASSETS[animation.type]
    : normalizedGifPath;
  return drawEffectVisual(
    effectType,
    playbackAge,
    animation.intensity,
    room,
    roomMetrics,
    {
      densityFactor: qualityScale,
      opacity: clampRoomOpacity(animation.opacity),
      gifAssetPath,
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
    setLiveTriggerFeedback(`${getAnimationLabel(type)} gestoppt`);
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
    setLiveTriggerFeedback(`${getAnimationLabel(type)} gestartet`);
  }
  renderRunningAnimationsList();
  refreshGlobalButtons();
}

function startRoomAnimationFromDraft() {
  const room = getSelectedRoom();
  if (!room) {
    triggerFeedback.textContent = "Status: zuerst einen Raum anklicken";
    return;
  }

  if (!isRoomAnimationType(state.roomDraft.animationId)) {
    state.roomDraft.animationId = ROOM_ANIMATIONS[0]?.id ?? "kaputt";
    roomAnimationSelect.value = state.roomDraft.animationId;
  }

  const draftPayload = {
    type: state.roomDraft.animationId,
    roomId: room.id,
    intensity: clampRoomIntensity(state.roomDraft.intensity),
    speed: clampRoomSpeed(state.roomDraft.speed),
    opacity: clampRoomOpacity(state.roomDraft.opacity),
    playbackSpeed: clampGifPlaybackSpeed(state.roomDraft.playbackSpeed),
    gifAssetPath: getMappedGifPathForAnimation(state.roomDraft.animationId),
    soundVolume: clampRoomSoundVolume(state.roomDraft.soundVolume),
    hold: true,
    durationMs: null,
  };

  if (state.roomDraft.editTargetId) {
    const editIndex = state.runningAnimations.findIndex(
      (item) => item.id === state.roomDraft.editTargetId && item.scope === "room",
    );
    if (editIndex >= 0) {
      const existing = state.runningAnimations[editIndex];
      const updated = {
        ...existing,
        ...draftPayload,
        gifAssetPath: isGifRoomAnimation(draftPayload.type)
          ? normalizeAnimationGifPath(draftPayload.type, existing.gifAssetPath ?? draftPayload.gifAssetPath)
          : ROOM_GIF_MAPPING_NONE,
        boardId: state.boardId,
        startedAt: performance.now(),
      };
      state.runningAnimations[editIndex] = updated;
      playSoundForAnimation(updated);
      setLiveTriggerFeedback(`${updated.id} in-place aktualisiert`);
      clearRoomDraftEditTarget();
      renderRunningAnimationsList();
      return;
    }
    clearRoomDraftEditTarget();
  }

  const animation = createAnimation({
    type: draftPayload.type,
    scope: "room",
    roomId: draftPayload.roomId,
    intensity: draftPayload.intensity,
    speed: draftPayload.speed,
    opacity: draftPayload.opacity,
    playbackSpeed: draftPayload.playbackSpeed,
    gifAssetPath: draftPayload.gifAssetPath,
    soundVolume: draftPayload.soundVolume,
    hold: true,
    durationSec: 0,
  });

  state.runningAnimations.push(animation);
  playSoundForAnimation(animation);
  setLiveTriggerFeedback(
    `${ROOM_ANIMATIONS.find((item) => item.id === animation.type)?.label ?? animation.type} auf ${room.label} gestartet`,
  );
  renderRunningAnimationsList();
}

function stopAnimation(animationId) {
  const target = state.runningAnimations.find((item) => item.id === animationId) ?? null;
  stopAnimationSound(animationId);
  state.runningAnimations = state.runningAnimations.filter((item) => item.id !== animationId);
  if (state.roomDraft.editTargetId === animationId) {
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
}

function editAnimation(animationId) {
  const animation = state.runningAnimations.find((item) => item.id === animationId);
  if (!animation || animation.scope !== "room" || !isRoomAnimationType(animation.type)) {
    return;
  }
  state.boardId = animation.boardId;
  boardSelect.value = animation.boardId;
  boardImage.src = getBoard(animation.boardId).src;
  boardStatus.textContent = `Aktives Board: ${getBoard(animation.boardId).label}`;
  state.selectedRoomId = animation.roomId;
  state.selectedRoomByBoard[animation.boardId] = animation.roomId;
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
  syncRoomDraftActionButton();

  syncRoomPanelFromSelection({ preserveDraftState: true });
  renderRoomOverlay();
  triggerFeedback.textContent = `Status: ${animation.id} in Editor geladen`;
}

function renderRunningAnimationsList() {
  const integrity = enforceRunningAnimationIntegrity();
  const parity = validateRunningListParity();
  runningAnimationsList.replaceChildren();
  if (state.runningAnimations.length === 0) {
    const empty = document.createElement("li");
    empty.className = "running-empty";
    empty.textContent = "Keine aktiven Animationen";
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
    const roomLabel =
      anim.scope === "room"
        ? animationBoard.rooms.find((r) => r.id === anim.roomId)?.label ?? anim.roomId
        : "Global";
    const scopeLabel = anim.scope === "room" ? "ROOM" : getGlobalCategoryRuntimeLabel(anim.type);
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
      ? ` | Opacity: ${clampRoomOpacity(anim.opacity ?? 0.9).toFixed(2)} | Playback: ${clampGifPlaybackSpeed(anim.playbackSpeed ?? 1).toFixed(2)}x | Speed: ${clampRoomSpeed(anim.speed ?? 1).toFixed(2)}x${getRoomGifAssetFileName(anim.type, anim.gifAssetPath) ? ` | GIF: ${getRoomGifAssetFileName(anim.type, anim.gifAssetPath)}` : ""}${getRoomEquivalentType(anim.type, ROOM_GLOBAL_EQUIVALENT_MAP) ? ` | GlobalEq: ${getRoomEquivalentType(anim.type, ROOM_GLOBAL_EQUIVALENT_MAP)}` : ""} | Sound: ${Math.round(
          clampRoomSoundVolume(anim.soundVolume ?? 1) * 100,
        )}%`
      : "";
    meta.textContent = `Instanz: ${anim.id} | Typ: ${anim.type} | Board: ${getBoard(anim.boardId).label} | Intensity: ${anim.intensity.toFixed(2)}${roomMeta} | Rest: ${remaining}`;

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

    if (anim.scope === "room") {
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

  if (integrity.repaired) {
    triggerFeedback.textContent = `Status: Running-Liste-Guard hat ${integrity.removed} inkonsistente Eintrag/Eintraege bereinigt`;
  }

  if (!parity.ok) {
    triggerFeedback.textContent = `Status: Running-Liste-Guard meldet Drift (${parity.reason})`;
  }
}

function enforceRunningAnimationIntegrity() {
  const next = [];
  const seen = new Set();
  let removed = 0;
  for (const animation of state.runningAnimations) {
    if (!animation?.id || seen.has(animation.id)) {
      removed += 1;
      continue;
    }
    if (!BOARDS.some((board) => board.id === animation.boardId)) {
      removed += 1;
      continue;
    }
    if (animation.scope === "room") {
      const board = getBoard(animation.boardId);
      if (!board.rooms.some((room) => room.id === animation.roomId)) {
        removed += 1;
        continue;
      }
    }
    seen.add(animation.id);
    next.push(animation);
  }
  if (removed > 0) {
    const previousIds = new Set(state.runningAnimations.map((entry) => entry.id));
    state.runningAnimations = next;
    for (const id of previousIds) {
      if (!seen.has(id)) {
        stopAnimationSound(id);
      }
    }
    refreshGlobalButtons();
  }
  if (
    state.roomDraft.editTargetId &&
    !next.some((animation) => animation.id === state.roomDraft.editTargetId)
  ) {
    clearRoomDraftEditTarget();
  }
  return { repaired: removed > 0, removed };
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

function applyOutputRoute(route) {
  const requested = route;
  outputRouteSelect.value = requested;
  if (requested === "beamer-fullscreen") {
    if (!document.fullscreenEnabled) {
      outputRouteStatus.textContent =
        "Output Route: beamer-fullscreen angefordert, Fallback auf windowed-preview (Fullscreen nicht verfuegbar)";
      state.outputRoute = "windowed-preview";
      outputRouteSelect.value = state.outputRoute;
      return;
    }
    stage
      .requestFullscreen({ navigationUI: "hide" })
      .then(() => {
        state.outputRoute = "beamer-fullscreen";
        outputRouteStatus.textContent = "Output Route: beamer-fullscreen aktiv";
      })
      .catch(() => {
        state.outputRoute = "windowed-preview";
        outputRouteSelect.value = state.outputRoute;
        outputRouteStatus.textContent =
          "Output Route: beamer-fullscreen fehlgeschlagen, Fallback auf windowed-preview";
      });
    return;
  }

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => undefined);
  }
  state.outputRoute = requested;
  outputRouteStatus.textContent = requested === "auto" ? "Output Route: auto" : "Output Route: windowed-preview";
}

function clipToPolygon(polygon, { evenodd = false } = {}) {
  try {
    if (consumeRenderFaultInjectionFlag("clipFailOnce")) {
      throw new Error("Render harness injected clip failure");
    }
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
  } catch (error) {
    recordRenderTickError("clip");
    console.error("clipToPolygon failed", error);
    return false;
  }
}

function clipToRoom(room, boardId = state.boardId) {
  const polygon = getRoomPolygonPixels(room, canvas.width, canvas.height, boardId);
  return clipToPolygon(polygon);
}

function getShipClipPolygon(boardId = state.boardId) {
  const shipPolygon = getShipPolygonPixels(canvas.width, canvas.height, boardId);
  return shipPolygon.length >= 3 ? shipPolygon : null;
}

function detectEvenOddClipCapability() {
  if (evenOddClipCapability !== null) {
    return evenOddClipCapability;
  }
  try {
    const testCanvas = document.createElement("canvas");
    testCanvas.width = 8;
    testCanvas.height = 8;
    const testCtx = testCanvas.getContext("2d", { willReadFrequently: true });
    if (!testCtx) {
      evenOddClipCapability = false;
      return evenOddClipCapability;
    }
    testCtx.beginPath();
    testCtx.rect(0, 0, 8, 8);
    testCtx.rect(2, 2, 4, 4);
    testCtx.clip("evenodd");
    testCtx.fillStyle = "rgba(255,0,0,1)";
    testCtx.fillRect(0, 0, 8, 8);
    const centerAlpha = testCtx.getImageData(4, 4, 1, 1).data[3];
    evenOddClipCapability = centerAlpha === 0;
  } catch {
    evenOddClipCapability = false;
  }
  return evenOddClipCapability;
}

function shouldUseOutsideCompositeFallback() {
  const fallback = !detectEvenOddClipCapability();
  if (fallback) {
    recordRenderClipFallback("outsideEvenOddFallback");
  }
  return fallback;
}

function cutOutShipMaskFromCurrentLayer(boardId = state.boardId) {
  const shipPolygon = getShipClipPolygon(boardId);
  if (!shipPolygon) {
    recordRenderClipFallback("insideInvalidPolygon");
    return false;
  }
  try {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    shipPolygon.forEach(([x, y], index) => {
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fill();
    ctx.restore();
    return true;
  } catch (error) {
    recordRenderTickError("clip");
    console.error("cutOutShipMaskFromCurrentLayer failed", error);
    return false;
  }
}

function clipToOutsideShip(boardId = state.boardId) {
  if (shouldUseOutsideCompositeFallback()) {
    return true;
  }
  const shipPolygon = getShipClipPolygon(boardId);
  if (!shipPolygon) {
    recordRenderClipFallback("insideInvalidPolygon");
    return clipToPolygon(null);
  }
  try {
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
  } catch (error) {
    recordRenderTickError("clip");
    console.error("clipToOutsideShip failed", error);
    return false;
  }
}

function clipToInsideShip(boardId = state.boardId) {
  const shipPolygon = getShipClipPolygon(boardId);
  return clipToPolygon(shipPolygon);
}

function drawAnimation(animation, now) {
  const runtimeSpeed = animation.scope === "room" ? clampRoomSpeed(animation.speed ?? 1) : 1;
  const age = ((now - animation.startedAt) / 1000) * state.animationSpeed * runtimeSpeed;
  if (animation.scope === "room") {
    if (animation.boardId !== state.boardId) {
      return true;
    }
    const room = getBoard(animation.boardId).rooms.find((entry) => entry.id === animation.roomId);
    if (!room) {
      return false;
    }
    const roomMetrics = getRoomRenderMetrics(room, animation.boardId);
    ctx.save();
    try {
      const clipped = clipToRoom(room, animation.boardId);
      if (!clipped) {
        drawRenderFallback(ctx, canvas, roomMetrics, age, "room");
        return true;
      }
      const rendered = drawRoomComposition(animation, age, room, roomMetrics);
      if (rendered === false) {
        // Critical render regression guard: if a specific effect cannot draw (e.g. GIF frame unavailable),
        // we still emit a visible fallback pulse so "audio-only" states are immediately obvious.
        drawRenderFallback(ctx, canvas, roomMetrics, age, "room");
      }
      return true;
    } finally {
      ctx.restore();
    }
  }
  if (animation.boardId && animation.boardId !== state.boardId) {
    return true;
  }
  if (animation.type === "outside-space") {
    // Outside is rendered in a dedicated isolated layer path.
    return true;
  }

  ctx.save();
  try {
    const clipped = clipToInsideShip(animation.boardId ?? state.boardId);
    if (!clipped) {
      drawRenderFallback(ctx, canvas, null, age, "global");
      return true;
    }
    const rendered = drawEffectVisual(animation.type, age, animation.intensity, null);
    if (rendered === false) {
      drawRenderFallback(ctx, canvas, null, age, "global");
    }
    return true;
  } finally {
    ctx.restore();
  }
}

function drawAnimationSafely(animation, now) {
  try {
    return drawAnimation(animation, now);
  } catch (error) {
    recordRenderTickError("animation");
    console.error(`Animation ${animation.id} failed`, error);
    return false;
  }
}

function drawOutsideFxLayer(now) {
  const outside = getOutsideFxProfile(state.boardId);
  if (!outside.enabled) {
    return;
  }
  try {
    if (consumeRenderFaultInjectionFlag("outsideLayerFailOnce")) {
      throw new Error("Render harness injected outside layer failure");
    }
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.filter = "none";
    const useCompositeFallback = shouldUseOutsideCompositeFallback();
    if (!useCompositeFallback) {
      const clipped = clipToOutsideShip(state.boardId);
      if (!clipped) {
        ctx.restore();
        return;
      }
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
    if (useCompositeFallback) {
      recordRenderClipFallback("outsideCompositeFallback");
      cutOutShipMaskFromCurrentLayer(state.boardId);
    }
    ctx.restore();
  } catch (error) {
    recordRenderTickError("outside");
    console.error("Outside layer failed", error);
  }
}

function clearCanvasSafely() {
  try {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } catch (error) {
    recordRenderTickError("scheduler");
    console.error("clearRect failed", error);
  }
}

function pruneFinishedAnimationsSafely(now) {
  try {
    pruneFinishedAnimations(now);
  } catch (error) {
    recordRenderTickError("scheduler");
    console.error("pruneFinishedAnimations failed", error);
  }
}

function updateRenderFaultFeedback() {
  const tick = state.renderTelemetry.lastTick;
  if (!tick || tick.totalErrors <= 0) {
    return;
  }
  triggerFeedback.textContent =
    `Status: Render-Fail-Safe aktiv (outside=${tick.outsideLayerErrors}, animation=${tick.animationLayerErrors}, clip=${tick.clipErrors}, scheduler=${tick.schedulerErrors})`;
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
    const alpha = (0.05 + Math.sin(age * 6.3) * 0.03) * intensity;
    ctx.fillStyle = `rgba(120, 255, 220, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
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

  if (type === "kaputt" || type === "feuer" || type === "schleim") {
    const gifPath = options.gifAssetPath ?? getMappedGifPathForAnimation(options.roomAnimationType ?? type) ?? ROOM_GIF_ANIMATION_ASSETS[type];
    const gifPlayback = getGifPlayback(gifPath);
    const gifFrame = getGifFrameForElapsedMs(gifPlayback, age * 1000);
    const fallbackImage = gifPlayback?.fallbackImage ?? getGifImage(gifPath);
    const drawableImage = gifFrame ?? (fallbackImage?.complete ? fallbackImage : null);
    if (!drawableImage) {
      return false;
    }
    const opacity = clampRoomOpacity(options.opacity ?? intensity);
    const baseScale = 1.04;
    const drawWidth = roomWidth * baseScale;
    const drawHeight = roomHeight * baseScale;
    const drawX = roomX - drawWidth / 2;
    const drawY = roomY - drawHeight / 2;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(drawableImage, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
    return true;
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
  state.runningAnimations = state.runningAnimations.filter((anim) => {
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
  beginRenderTick(now);
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

    clearCanvasSafely();
    pruneFinishedAnimationsSafely(now);
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
        "Status: fehlerhafte Animation isoliert, Render-Timer laeuft weiter";
    }

    if (now - lastListRenderAt > 500) {
      renderRunningAnimationsList();
      lastListRenderAt = now;
    }
    updateRenderFaultFeedback();
    const frameCostMs = performance.now() - frameStart;
    finalizeRenderTick(frameCostMs);
    recordRuntimeFrameCost(frameCostMs);
  } finally {
    requestAnimationFrame(draw);
  }
}

boardSelect.addEventListener("change", () => switchBoard(boardSelect.value));

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
  hitareaStatus.textContent = `${hitareaStatus.textContent} (nicht gespeichert)`;
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
    ? "Status: Board-Profil (Hitarea + Geometrie + Shapes) gespeichert"
    : "Status: Board-Profil konnte nicht gespeichert werden";
});

hitareaResetButton.addEventListener("click", () => {
  setHitareaCalibration(state.boardId, HITAREA_CALIBRATION_DEFAULT);
  const persisted = persistHitareaCalibrationMap();
  syncHitareaCalibrationPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? "Status: Hitarea-Kalibrierung auf Default gesetzt"
    : "Status: Hitarea-Default gesetzt, Persistenz fehlgeschlagen";
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
      ? `Status: ${room.label} ${statusSuffix}`
      : `Status: ${room.label} ${statusSuffix} (Persistenz fehlgeschlagen)`;
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
    updateSelectedRoomGeometry({ mode: nextMode, absoluteX, absoluteY }, "auf Modus ABS gesetzt");
  } else {
    const offsetX = clampRoomRelativeOffset(current.absoluteX - baseCenter.x);
    const offsetY = clampRoomRelativeOffset(current.absoluteY - baseCenter.y);
    updateSelectedRoomGeometry({ mode: nextMode, offsetX, offsetY }, "auf Modus REL gesetzt");
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
    updateSelectedRoomGeometry({ absoluteX }, "X kalibriert (ABS)");
  } else {
    const offsetX = clampRoomRelativeOffset(Number(roomGeometryXInput.value));
    updateSelectedRoomGeometry({ offsetX }, "X kalibriert (REL)");
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
    updateSelectedRoomGeometry({ absoluteY }, "Y kalibriert (ABS)");
  } else {
    const offsetY = clampRoomRelativeOffset(Number(roomGeometryYInput.value));
    updateSelectedRoomGeometry({ offsetY }, "Y kalibriert (REL)");
  }
});

roomGeometryStretchXInput.addEventListener("input", () => {
  const stretchX = clampRoomStretch(Number(roomGeometryStretchXInput.value));
  updateSelectedRoomGeometry({ stretchX }, "Stretch X gesetzt");
});

roomGeometryStretchYInput.addEventListener("input", () => {
  const stretchY = clampRoomStretch(Number(roomGeometryStretchYInput.value));
  updateSelectedRoomGeometry({ stretchY }, "Stretch Y gesetzt");
});

boardZoomRangeInput.addEventListener("input", () => {
  const scale = clampBoardZoomScale((Number(boardZoomRangeInput.value) || 100) / 100);
  const center = getRoomCenterForZoom(state.boardId);
  updateCurrentBoardZoom(computePanForZoomFocus(scale, center), `Board-Zoom auf ${Math.round(scale * 100)}% gesetzt`);
  setPanCursorState();
});

boardZoomFitButton.addEventListener("click", () => {
  endPanMode(null, { canceled: true });
  fitZoomToActiveSpecialRoom();
  setPanCursorState();
});

boardZoomResetButton.addEventListener("click", () => {
  updateCurrentBoardZoom(BOARD_ZOOM_DEFAULT, "Board-Zoom zurueckgesetzt");
  endPanMode(null, { canceled: true });
  setPanCursorState();
});

polygonRoomSelect.addEventListener("change", () => {
  const roomId = polygonRoomSelect.value;
  syncSpecialRoomSelection(roomId);
  const zoom = getBoardZoom(state.boardId);
  const center = getRoomCenterForZoom(state.boardId, roomId);
  updateCurrentBoardZoom(computePanForZoomFocus(zoom.scale, center));
  syncRoomPanelFromSelection();
  syncPolygonEditorPanel();
  renderRoomOverlay();
  setPanCursorState();
});

polygonVertexSelect.addEventListener("change", () => {
  state.polygonEditor.selectedVertexIndex = Math.max(0, Number(polygonVertexSelect.value) || 0);
  state.polygonEditor.selectedEdgeIndex = state.polygonEditor.selectedVertexIndex;
  syncPolygonEdgeSelect(getActivePolygonRoomId(state.boardId));
  renderRoomOverlay();
  syncPolygonEditorStatus();
});

polygonEdgeSelect.addEventListener("change", () => {
  state.polygonEditor.selectedEdgeIndex = Math.max(0, Number(polygonEdgeSelect.value) || 0);
  renderRoomOverlay();
  syncPolygonEditorStatus();
});

polygonInsertVertexButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan aktiv - Polygon-Edit pausiert";
    return;
  }
  const roomId = getActivePolygonRoomId(state.boardId);
  if (!roomId) {
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
    ? "Status: Polygon-Ecke eingefuegt"
    : "Status: Polygon-Ecke eingefuegt (Persistenz fehlgeschlagen)";
});

polygonDeleteVertexButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan aktiv - Polygon-Edit pausiert";
    return;
  }
  const roomId = getActivePolygonRoomId(state.boardId);
  if (!roomId) {
    return;
  }
  const points = getSpecialPolygonPoints(state.boardId, roomId);
  if (points.length <= 3) {
    triggerFeedback.textContent = "Status: Polygon braucht mindestens 3 Ecken";
    return;
  }
  const index = Math.max(0, Math.min(points.length - 1, state.polygonEditor.selectedVertexIndex));
  points.splice(index, 1);
  setSpecialPolygonPoints(state.boardId, roomId, points);
  const persisted = persistBoardProfiles();
  state.polygonEditor.selectedVertexIndex = Math.max(0, Math.min(index, points.length - 1));
  state.polygonEditor.selectedEdgeIndex = state.polygonEditor.selectedVertexIndex;
  syncPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? "Status: Polygon-Ecke geloescht"
    : "Status: Polygon-Ecke geloescht (Persistenz fehlgeschlagen)";
});

polygonResetRoomButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan aktiv - Polygon-Edit pausiert";
    return;
  }
  const roomId = getActivePolygonRoomId(state.boardId);
  if (!roomId) {
    return;
  }
  const room = getBoard().rooms.find((entry) => entry.id === roomId);
  setSpecialPolygonPoints(state.boardId, roomId, room?.points ?? []);
  const persisted = persistBoardProfiles();
  state.polygonEditor.selectedVertexIndex = 0;
  syncPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? "Status: Spezialraum-Polygon auf Default gesetzt"
    : "Status: Spezialraum-Polygon auf Default gesetzt (Persistenz fehlgeschlagen)";
});

polygonFocusRoomButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan aktiv - Polygon-Edit pausiert";
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
  triggerFeedback.textContent = "Status: Spezialraum im Overlay fokussiert";
});

shipPolygonVertexSelect.addEventListener("change", () => {
  state.shipPolygonEditor.selectedVertexIndex = Math.max(0, Number(shipPolygonVertexSelect.value) || 0);
  state.shipPolygonEditor.selectedEdgeIndex = state.shipPolygonEditor.selectedVertexIndex;
  syncShipPolygonEdgeSelect();
  renderRoomOverlay();
  syncShipPolygonEditorStatus();
});

shipPolygonEdgeSelect.addEventListener("change", () => {
  state.shipPolygonEditor.selectedEdgeIndex = Math.max(0, Number(shipPolygonEdgeSelect.value) || 0);
  renderRoomOverlay();
  syncShipPolygonEditorStatus();
});

shipPolygonInsertVertexButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan aktiv - Ship-Polygon-Edit pausiert";
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
    ? "Status: Ship-Polygon-Ecke eingefuegt"
    : "Status: Ship-Polygon-Ecke eingefuegt (Persistenz fehlgeschlagen)";
});

shipPolygonDeleteVertexButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan aktiv - Ship-Polygon-Edit pausiert";
    return;
  }
  const points = getShipPolygonPoints(state.boardId);
  if (points.length <= 3) {
    triggerFeedback.textContent = "Status: Ship-Polygon braucht mindestens 3 Ecken";
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
    ? "Status: Ship-Polygon-Ecke geloescht"
    : "Status: Ship-Polygon-Ecke geloescht (Persistenz fehlgeschlagen)";
});

shipPolygonResetButton.addEventListener("click", () => {
  if (isPanArbitrating()) {
    triggerFeedback.textContent = "Status: Pan aktiv - Ship-Polygon-Edit pausiert";
    return;
  }
  setShipPolygonPoints(state.boardId, SHIP_POLYGON_DEFAULT);
  const persisted = persistBoardProfiles();
  state.shipPolygonEditor.selectedVertexIndex = 0;
  state.shipPolygonEditor.selectedEdgeIndex = 0;
  syncShipPolygonEditorPanel();
  renderRoomOverlay();
  triggerFeedback.textContent = persisted
    ? "Status: Ship-Polygon auf Default gesetzt"
    : "Status: Ship-Polygon auf Default gesetzt (Persistenz fehlgeschlagen)";
});

outsideEnabledInput.addEventListener("change", () => {
  updateOutsideFxProfile(state.boardId, { enabled: outsideEnabledInput.checked });
  const persisted = persistBoardProfiles();
  syncOutsideRuntimeMirror(state.boardId);
  syncOutsideFxPanel();
  renderRunningAnimationsList();
  refreshGlobalButtons();
  triggerFeedback.textContent = persisted
    ? `Status: Outside Space ${outsideEnabledInput.checked ? "aktiviert" : "deaktiviert"}`
    : `Status: Outside Space ${outsideEnabledInput.checked ? "aktiviert" : "deaktiviert"} (Persistenz fehlgeschlagen)`;
});

outsideIntensityInput.addEventListener("input", () => {
  updateOutsideFxProfile(state.boardId, { intensity: clampOutsideIntensity(outsideIntensityInput.value) });
  const persisted = persistBoardProfiles();
  syncOutsideFxPanel();
  triggerFeedback.textContent = persisted
    ? "Status: Outside-Intensitaet aktualisiert"
    : "Status: Outside-Intensitaet aktualisiert (Persistenz fehlgeschlagen)";
});

outsideSpeedInput.addEventListener("input", () => {
  updateOutsideFxProfile(state.boardId, { speed: clampOutsideSpeed(outsideSpeedInput.value) });
  const persisted = persistBoardProfiles();
  syncOutsideFxPanel();
  triggerFeedback.textContent = persisted
    ? "Status: Outside-Geschwindigkeit aktualisiert"
    : "Status: Outside-Geschwindigkeit aktualisiert (Persistenz fehlgeschlagen)";
});

outsideModeInput.addEventListener("change", () => {
  updateOutsideFxProfile(state.boardId, { mode: normalizeOutsideMode(outsideModeInput.value) });
  const persisted = persistBoardProfiles();
  syncOutsideFxPanel();
  triggerFeedback.textContent = persisted
    ? `Status: Outside-Modus ${outsideModeInput.value === "immersive" ? "Immersive" : "Standard"} aktiviert`
    : `Status: Outside-Modus ${outsideModeInput.value === "immersive" ? "Immersive" : "Standard"} aktiviert (Persistenz fehlgeschlagen)`;
});

outsideDirectionInput.addEventListener("change", () => {
  updateOutsideFxProfile(state.boardId, {
    direction: normalizeOutsideDirection(outsideDirectionInput.value),
  });
  const persisted = persistBoardProfiles();
  syncOutsideFxPanel();
  triggerFeedback.textContent = persisted
    ? `Status: Outside-Richtung ${outsideDirectionInput.value === "reverse" ? "Reverse" : "Forward"} aktiviert`
    : `Status: Outside-Richtung ${outsideDirectionInput.value === "reverse" ? "Reverse" : "Forward"} aktiviert (Persistenz fehlgeschlagen)`;
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
  if (state.polygonEditor.dragVertexIndex === null || state.uiView !== "settings") {
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
    state.polygonEditor.dragVertexIndex === null ||
    state.polygonEditor.dragPointerId !== event.pointerId
  ) {
    return;
  }
  finishPolygonVertexDrag(event, { cancel: false });
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
  if (state.polygonEditor.dragPointerId !== event.pointerId) {
    return;
  }
  finishPolygonVertexDrag(event, { cancel: true });
});

roomOverlay.addEventListener("pointerdown", (event) => {
  if (!canStartPanModeFromEvent(event)) {
    return;
  }
  if (state.shipPolygonEditor.dragVertexIndex !== null) {
    finishShipPolygonVertexDrag(event, { cancel: true });
  }
  if (state.polygonEditor.dragVertexIndex !== null) {
    finishPolygonVertexDrag(event, { cancel: true });
  }
  event.preventDefault();
  event.stopPropagation();
  const trigger = event.button === 1 ? "middle" : "space";
  startPanMode(event, trigger);
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    if (event.repeat) {
      return;
    }
    state.panMode.spacePressed = true;
    if (state.polygonEditor.dragVertexIndex !== null) {
      finishPolygonVertexDrag(null, { cancel: true });
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
    ? "Status: Orientation gewechselt, UI-State/Navigation/Board-Sichtbarkeit stabil"
    : "Status: Orientation-Guard meldet Drift bei State, Navigation oder Board-Sichtbarkeit";
});

window.addEventListener(
  "scroll",
  () => {
    syncMobileStickyOffsets();
    const navigationOk = validateViewNavigationVisibility({ silent: true, context: "scroll" });
    const projectionOk = runMobileProjectionVisibilityGuard({ silent: true, context: "scroll" });
    if (!navigationOk || !projectionOk) {
      triggerFeedback.textContent =
        "Status: Scroll-Guard meldet Navigation/Board-Overlap-Problem im Mobile-Layout";
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
    triggerFeedback.textContent = "Status: Clear All ist bewaffnet - erneut tippen zum Bestaetigen";
    return;
  }
  resetClearAllGuard();
  executeClearAll();
});

roomAnimationSelect.addEventListener("change", () => {
  const selected = roomAnimationSelect.value;
  state.roomDraft.animationId = isRoomAnimationType(selected) ? selected : ROOM_ANIMATIONS[0]?.id ?? "kaputt";
  roomAnimationSelect.value = state.roomDraft.animationId;
  syncGifRoomControls();
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
  syncAudioStatus();
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
  const persisted = persistBoardProfiles();
  syncAudioMappingPanel();
  triggerFeedback.textContent = persisted
    ? `Status: Sound-Mapping fuer ${getAnimationLabel(animationType)} aktualisiert`
    : `Status: Sound-Mapping fuer ${getAnimationLabel(animationType)} aktualisiert (Persistenz fehlgeschlagen)`;
});

gifMappingAnimationSelect?.addEventListener("change", () => {
  syncGifMappingPanel();
});

gifMappingAssetSelect?.addEventListener("change", () => {
  const animationType = gifMappingAnimationSelect?.value;
  if (!animationType) {
    return;
  }
  state.animationGifMap[animationType] = normalizeAnimationGifPath(animationType, gifMappingAssetSelect.value);
  const persisted = persistBoardProfiles();
  syncGifMappingPanel();
  triggerFeedback.textContent = persisted
    ? `Status: GIF-Mapping fuer ${getAnimationLabel(animationType)} aktualisiert`
    : `Status: GIF-Mapping fuer ${getAnimationLabel(animationType)} aktualisiert (Persistenz fehlgeschlagen)`;
});

audioVolumeInput.addEventListener("input", () => {
  const volumePercent = clampAudioVolumePercent(Number(audioVolumeInput.value));
  state.audio.volume = volumePercent / 100;
  audioVolumeValue.textContent = `${volumePercent}%`;
  applyAudioGain();
  syncAudioStatus();
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

applyOutputRouteButton.addEventListener("click", () => {
  applyOutputRoute(outputRouteSelect.value);
});

saveGlobalDefaultsButton.addEventListener("click", async () => {
  const persisted = persistBoardProfiles();
  if (!persisted) {
    globalDefaultsStatus.textContent =
      "Global Defaults: lokales Profil konnte vor Save nicht gespeichert werden";
    triggerFeedback.textContent = "Status: Global-Defaults-Save abgebrochen (lokale Persistenz fehlgeschlagen)";
    return;
  }

  saveGlobalDefaultsButton.disabled = true;
  globalDefaultsStatus.textContent = "Global Defaults: Save laeuft ...";
  apiDiagnoseStatus.textContent = "API Diagnose: pruefe Reachability + POST-Faehigkeit (Save-Preflight) ...";
  try {
    const result = await saveGlobalDefaultsToServer();
    const snapshot = buildResolveSnapshot({
      routing: result.routing,
      endpoint: result.endpoint,
      method: result.method,
    });
    const remoteHint = getRemoteMismatchHint(result.routing);
    globalDefaultsStatus.textContent =
      `Global Defaults: gespeichert (${result.target}, ${result.savedAt}) | ${formatResolveSnapshot(snapshot)} [${result.statusClass}]`;
    apiDiagnoseStatus.textContent =
      `API Diagnose: OK (${formatResolveSnapshot(snapshot)} | Preflight GET /api/health + OPTIONS /api/global-defaults)`;
    triggerFeedback.textContent =
      `Status: Global Defaults gespeichert (${formatResolveSnapshot(snapshot)}; Status ${result.status}/${result.statusClass})${remoteHint ? ` ${remoteHint}` : ""}`;
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
  globalDefaultsStatus.textContent = "Global Defaults: Laden & Anwenden laeuft ...";
  try {
    const result = await loadAndApplyGlobalDefaults({ sourceLabel: "settings-button" });
    if (!result.persisted) {
      triggerFeedback.textContent =
        "Status: Defaults geladen und angewendet, aber lokale Persistenz fehlgeschlagen";
    }
  } catch (error) {
    const saveError = formatGlobalDefaultsSaveError(error);
    globalDefaultsStatus.textContent = `Global Defaults: ${saveError.statusText}`;
    apiDiagnoseStatus.textContent = saveError.diagnoseStatusText;
    triggerFeedback.textContent =
      `Status: Defaults laden & anwenden fehlgeschlagen. ${saveError.feedbackText}`;
  } finally {
    loadApplyGlobalDefaultsButton.disabled = false;
  }
});

exportGlobalDefaultsButton.addEventListener("click", () => {
  const persisted = persistBoardProfiles();
  if (!persisted) {
    globalDefaultsStatus.textContent =
      "Global Defaults: Download-Export abgebrochen (lokale Persistenz fehlgeschlagen)";
    triggerFeedback.textContent = "Status: Download-Export konnte nicht vorbereitet werden";
    return;
  }

  const fileName = downloadGlobalDefaultsFallback();
  globalDefaultsStatus.textContent = `Global Defaults: Download-Export heruntergeladen (${fileName})`;
  triggerFeedback.textContent =
    "Status: Download-Export erstellt (sekundaerer Fallback); primaerer Weg bleibt API-Speichern";
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
    `Status: Mobile-Snapshot erstellt (Trigger p95 ${snapshot.triggerP95Ms.toFixed(1)}ms, Frame p95 ${snapshot.frameP95Ms.toFixed(1)}ms, Jank ${snapshot.jankRatePct.toFixed(1)}%)`;
});

document.addEventListener("fullscreenchange", () => {
  if (state.outputRoute === "beamer-fullscreen" && !document.fullscreenElement) {
    state.outputRoute = "windowed-preview";
    outputRouteSelect.value = state.outputRoute;
    outputRouteStatus.textContent =
      "Output Route: beamer-fullscreen beendet, Fallback auf windowed-preview";
  }
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
      "Status: Resize-Guard meldet Layout-/Navigation-Drift (Scroll/Resize/View-Switch pruefen)";
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
  syncAudioStatus();
  syncAudioMappingPanel();
  syncGifMappingPanel();
  syncAnimationSpeedPanel();
  syncHitareaCalibrationPanel();
  syncRoomGeometryPanel();
  syncPolygonEditorPanel();
  syncShipPolygonEditorPanel();
  syncOutsideFxPanel();
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
      `Status: Zone-Fallback aktiv (${zoneFallbackCount} Board) - siehe Zonenquelle-Status im Settings-Panel`;
  }
  if (!state.boardId || !BOARDS.some((board) => board.id === state.boardId)) {
    state.boardId = BOARDS[0]?.id ?? "";
  }
  state.hitareaCalibrationByBoard = createDefaultHitareaCalibrationMap();
  state.roomGeometryByBoard = createDefaultRoomGeometryByBoard();
  state.roomStateProfilesByBoard = createDefaultRoomStateProfilesByBoard();
  state.specialPolygonsByBoard = createDefaultSpecialPolygonsByBoard();
  state.shipPolygonsByBoard = createDefaultShipPolygonsByBoard();
  state.outsideFxByBoard = createDefaultOutsideFxByBoard();
  state.boardZoomByBoard = createDefaultBoardZoomByBoard();
  state.animationSoundMap = normalizeAnimationSoundMap(createDefaultAnimationSoundMap());
  state.animationGifMap = normalizeAnimationGifMap(createDefaultAnimationGifMap());
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
        "Global Defaults: Startup-Fallback fehlgeschlagen (kein stilles Ignorieren; Defaults muessen manuell geladen werden)";
      apiDiagnoseStatus.textContent =
        "API Diagnose: Startup-Fallback fehlgeschlagen (bitte Defaults-Endpoint pruefen oder Settings-Button nutzen)";
      triggerFeedback.textContent =
        "Status: Startup-Guard aktiv - leerer Local Storage erkannt, Global-Defaults-Ladevorgang ist explizit fehlgeschlagen";
    }
  }

  syncRuntimePanelsFromState();
  syncMobileStickyOffsets();
  if (startupDefaultsSnapshot) {
    globalDefaultsStatus.textContent =
      `Global Defaults: automatisch geladen & angewendet (${formatResolveSnapshot(startupDefaultsSnapshot)})`;
    triggerFeedback.textContent =
      `Status: Startup-Defaults aktiv (${formatResolveSnapshot(startupDefaultsSnapshot)})`;
    apiDiagnoseStatus.textContent =
      `API Diagnose: Startup-Load OK (${formatResolveSnapshot(startupDefaultsSnapshot)})`;
  }
  warmEventSoundAssets();
  setActiveView("dashboard");
  setPanCursorState();
  installRenderReproHarness();
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
  const directStartGifRegressionOk = runGifDirectStartEditReloadRegression();
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
    !shipClipRegressionOk ||
    !directStartGifRegressionOk
  ) {
    triggerFeedback.textContent =
      "Status: Regression fehlgeschlagen (Startup/View/Layout/Zoom-Pan/Orientation/Navigation/Projection + Outside-Isolation + Ship-Clip + Direct-Start-GIF)";
  } else {
    triggerFeedback.textContent =
      "Status: Regression ok (Startup + View/Layout + Zoom-Pan-Edit + Orientation + Navigation + Projection + Pointer-Capture + Outside-Isolation + Ship-Clip + Direct-Start-GIF)";
  }
  renderRunningAnimationsList();
  refreshGlobalButtons();
  requestAnimationFrame(draw);
}

void initializeApplication();
