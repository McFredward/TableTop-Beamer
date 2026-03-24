const BOARDS = [
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

const ROOM_ANIMATIONS = [
  { id: "scanner-sweep", label: "Scanner Sweep" },
  { id: "steam-vent", label: "Steam Vent" },
  { id: "contamination", label: "Contamination Cloud" },
  { id: "electrical-arc", label: "Electrical Arc" },
  { id: "fire-pocket", label: "Fire Pocket" },
  { id: "alarm-beacon", label: "Alarm Beacon" },
];

const EVENT_SOUND_ASSETS = {
  "intruder-alert": [
    "resources/nemesis/sounds/alarm.mp3",
    "resources/nemesis/sounds/monsters/048.wav",
  ],
  "reactor-pulse": ["resources/nemesis/sounds/electricity.mp3"],
  "power-outage": ["resources/nemesis/sounds/power/3.wav"],
  "alarm-beacon": ["resources/nemesis/sounds/alarm.mp3"],
  "electrical-arc": ["resources/nemesis/sounds/electricity.mp3"],
};

const stage = document.querySelector("#stage");
const boardImage = document.querySelector("#board-image");
const canvas = document.querySelector("#fx-canvas");
const roomOverlay = document.querySelector("#room-overlay");
const boardSelect = document.querySelector("#board-select");
const boardStatus = document.querySelector("#board-status");
const outputRouteSelect = document.querySelector("#output-route-select");
const outputRouteStatus = document.querySelector("#output-route-status");
const applyOutputRouteButton = document.querySelector("#apply-output-route");
const triggerFeedback = document.querySelector("#trigger-feedback");
const stopAllButton = document.querySelector("#stop-all");
const roomSelected = document.querySelector("#room-selected");
const roomAnimationSelect = document.querySelector("#room-animation-select");
const roomIntensityInput = document.querySelector("#room-intensity");
const roomIntensityValue = document.querySelector("#room-intensity-value");
const roomDurationInput = document.querySelector("#room-duration");
const roomHoldInput = document.querySelector("#room-hold");
const startRoomAnimationButton = document.querySelector("#start-room-animation");
const runningAnimationsList = document.querySelector("#running-animations");
const audioEnabledInput = document.querySelector("#audio-enabled");
const audioVolumeInput = document.querySelector("#audio-volume");
const audioVolumeValue = document.querySelector("#audio-volume-value");
const audioStatus = document.querySelector("#audio-status");
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
const controlPanel = document.querySelector("#control-panel");
const projectionArea = document.querySelector(".projection-area");
const runningOverviewPanel = document.querySelector("#running-overview-panel");
const globalAnimationPanel = document.querySelector("#global-animation-panel");
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
const boardZoomRangeInput = document.querySelector("#board-zoom-range");
const boardZoomValue = document.querySelector("#board-zoom-value");
const boardZoomFitButton = document.querySelector("#board-zoom-fit");
const boardZoomResetButton = document.querySelector("#board-zoom-reset");
const boardZoomStatus = document.querySelector("#board-zoom-status");
const boardPanStatus = document.querySelector("#board-pan-status");
const dashboardViewGroups = Array.from(document.querySelectorAll('[data-view="dashboard"]'));
const settingsViewGroups = Array.from(document.querySelectorAll('[data-view="settings"]'));

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
};

const state = {
  boardId: BOARDS[0].id,
  selectedRoomId: null,
  selectedRoomByBoard: {},
  outputRoute: "auto",
  roomDraft: {
    animationId: ROOM_ANIMATIONS[0].id,
    intensity: Number(roomIntensityInput.value),
    durationSec: Number(roomDurationInput.value),
    hold: false,
  },
  runningAnimations: [],
  audio: {
    enabled: true,
    volume: 0.7,
  },
  uiView: "dashboard",
  hitareaCalibrationByBoard: {},
  roomGeometryByBoard: {},
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
};

let animationIdCounter = 1;
const ashParticles = [];
let lastListRenderAt = 0;
const audioAssetPoolByPath = new Map();
const audioAssetCursorByEffect = {};
const audioAssetVoiceCursorByPath = {};
const activeAnimationAudioById = new Map();

function getBoard(boardId = state.boardId) {
  return BOARDS.find((entry) => entry.id === boardId) ?? BOARDS[0];
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

function normalizeRoomGeometryMode(mode) {
  return mode === "absolute" ? "absolute" : "relative";
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
        specialPolygons: normalizeSpecialPolygonMap(state.specialPolygonsByBoard[board.id], board.id),
        shipPolygon: normalizeShipPolygon(state.shipPolygonsByBoard[board.id]),
        outsideFx: normalizeOutsideFxProfile(state.outsideFxByBoard[board.id]),
      },
    ]),
  );
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
    raw.specialPolygonsByBoard
  ) {
    return Object.fromEntries(
      BOARDS.map((board) => [
        board.id,
        {
          hitareaCalibration: raw.hitareaCalibrationByBoard?.[board.id],
          roomGeometry: raw.roomGeometryByBoard?.[board.id],
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
    const raw = window.localStorage.getItem(ROOM_GEOMETRY_STORAGE_KEY);
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
    const raw = window.localStorage.getItem(SPECIAL_POLYGON_STORAGE_KEY);
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
  try {
    window.localStorage.setItem(BOARD_PROFILE_STORAGE_KEY, JSON.stringify(buildBoardProfilesFromState()));
    return true;
  } catch {
    return false;
  }
}

function createDefaultHitareaCalibrationMap() {
  return Object.fromEntries(
    BOARDS.map((board) => [board.id, { ...HITAREA_CALIBRATION_DEFAULT }]),
  );
}

function loadHitareaCalibrationMap() {
  const defaults = createDefaultHitareaCalibrationMap();
  try {
    const raw = window.localStorage.getItem(HITAREA_CALIBRATION_STORAGE_KEY);
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

function clampRoomIntensity(value) {
  return Math.max(0.2, Math.min(1.5, value));
}

function clampRoomDurationSec(value) {
  return Math.max(1, Math.min(180, value));
}

function clampAudioVolumePercent(value) {
  return Math.max(0, Math.min(100, value));
}

function clampOutsideIntensity(value) {
  return Math.max(0.2, Math.min(1.5, Number(value) || OUTSIDE_FX_DEFAULT.intensity));
}

function clampOutsideSpeed(value) {
  return Math.max(0.3, Math.min(2.5, Number(value) || OUTSIDE_FX_DEFAULT.speed));
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
  return true;
}

function setActiveView(view, { skipGuard = false } = {}) {
  const nextView = view === "settings" ? "settings" : "dashboard";
  if (nextView !== "settings") {
    state.panMode.spacePressed = false;
    endPanMode(null, { canceled: true });
  }
  state.uiView = nextView;
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
    syncPolygonEditorPanel();
    syncShipPolygonEditorPanel();
  }
  syncStageZoomTransform();
  setPanCursorState();
  renderRoomOverlay();
  if (!skipGuard) {
    validateViewExclusivity(nextView, { context: "set-active-view" });
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
  setActiveView(originalView, { skipGuard: true });
  return ok;
}

function runLayoutScrollRegression() {
  const issues = [];
  const panelOverflowY = controlPanel ? window.getComputedStyle(controlPanel).overflowY : "";
  if (panelOverflowY !== "auto" && panelOverflowY !== "scroll") {
    issues.push(`control overflowY=${panelOverflowY || "missing"}`);
  }

  const projectionPosition = projectionArea
    ? window.getComputedStyle(projectionArea).position
    : "";
  if (projectionPosition !== "sticky" && projectionPosition !== "fixed") {
    issues.push(`projection position=${projectionPosition || "missing"}`);
  }

  const bodyOverflowY = window.getComputedStyle(document.body).overflowY;
  if (bodyOverflowY !== "hidden") {
    issues.push(`body overflowY=${bodyOverflowY}`);
  }

  if (!runningOverviewPanel || !globalAnimationPanel) {
    issues.push("running/global panel missing");
  } else {
    const runningPosition = window.getComputedStyle(runningOverviewPanel).position;
    if (runningPosition !== "sticky" && runningPosition !== "fixed") {
      issues.push(`running panel position=${runningPosition || "missing"}`);
    }
    const stickyTop = window.getComputedStyle(runningOverviewPanel).top;
    if (!stickyTop || stickyTop === "auto") {
      issues.push(`running panel top=${stickyTop || "missing"}`);
    }
    const orderMask = runningOverviewPanel.compareDocumentPosition(globalAnimationPanel);
    if ((orderMask & Node.DOCUMENT_POSITION_FOLLOWING) === 0) {
      issues.push("running panel not before trigger groups");
    }
  }

  if (issues.length > 0) {
    console.error("Layout regression violation", issues);
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
  outsideIntensityValue.textContent = outside.intensity.toFixed(2);
  outsideSpeedValue.textContent = `${outside.speed.toFixed(2)}x`;
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
  const paths = new Set(Object.values(EVENT_SOUND_ASSETS).flat());
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

function pickAssetPathForEffect(effectType) {
  const mappedPaths = EVENT_SOUND_ASSETS[effectType];
  if (!Array.isArray(mappedPaths) || mappedPaths.length === 0) {
    return null;
  }
  const currentIndex = audioAssetCursorByEffect[effectType] ?? 0;
  const nextPath = mappedPaths[currentIndex % mappedPaths.length];
  audioAssetCursorByEffect[effectType] = (currentIndex + 1) % mappedPaths.length;
  return nextPath;
}

function playSoundForAnimation(animation) {
  if (!animation || !state.audio.enabled) {
    return;
  }
  const path = pickAssetPathForEffect(animation.type);
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
    if (!state.runningAnimations.some((item) => item.id === animation.id)) {
      stopAnimationSound(animation.id);
    }
  };
  reusable.removeEventListener("ended", onEnded);
  reusable.addEventListener("ended", onEnded);
  reusable.pause();
  reusable.currentTime = 0;
  reusable.volume = state.audio.volume;
  activeAnimationAudioById.set(animation.id, {
    voice: reusable,
    onEnded,
  });
  reusable.play().catch(() => undefined);
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
  syncBoardZoomPanel();
  setPanCursorState();
  renderRoomOverlay();
  refreshGlobalButtons();
  triggerFeedback.textContent = "Status: Board gewechselt";
}

function syncRoomPanelFromSelection() {
  const room = getSelectedRoom();
  if (!room) {
    roomSelected.textContent = "Ausgewaehlter Raum: bitte Hex auf dem Board anklicken";
    startRoomAnimationButton.disabled = true;
    syncRoomGeometryPanel();
    return;
  }
  startRoomAnimationButton.disabled = false;
  roomSelected.textContent = `Ausgewaehlter Raum: ${room.label}`;
  syncRoomGeometryPanel();
}

function createAnimation({ type, scope, roomId = null, intensity = 0.8, hold = false, durationSec = 15 }) {
  return {
    id: `anim-${animationIdCounter++}`,
    boardId: state.boardId,
    type,
    scope,
    roomId,
    intensity,
    hold,
    durationMs: hold ? null : Math.max(1000, durationSec * 1000),
    startedAt: performance.now(),
  };
}

function upsertGlobalAnimation(type, defaultDurationSec) {
  const existing = state.runningAnimations.find((anim) => anim.scope === "global" && anim.type === type);
  if (existing) {
    stopAnimationSound(existing.id);
    state.runningAnimations = state.runningAnimations.filter((anim) => anim.id !== existing.id);
    triggerFeedback.textContent = `Status: ${type} gestoppt`;
  } else {
    const animation = createAnimation({
      type,
      scope: "global",
      intensity: 1,
      hold: defaultDurationSec === null,
      durationSec: defaultDurationSec ?? 0,
    });
    state.runningAnimations.push(animation);
    playSoundForAnimation(animation);
    triggerFeedback.textContent = `Status: ${type} gestartet`;
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

  const animation = createAnimation({
    type: state.roomDraft.animationId,
    scope: "room",
    roomId: room.id,
    intensity: clampRoomIntensity(state.roomDraft.intensity),
    hold: state.roomDraft.hold,
    durationSec: clampRoomDurationSec(state.roomDraft.durationSec),
  });

  state.runningAnimations.push(animation);
  playSoundForAnimation(animation);
  triggerFeedback.textContent = `Status: ${ROOM_ANIMATIONS.find((item) => item.id === animation.type)?.label ?? animation.type} auf ${room.label} gestartet`;
  renderRunningAnimationsList();
}

function stopAnimation(animationId) {
  stopAnimationSound(animationId);
  state.runningAnimations = state.runningAnimations.filter((item) => item.id !== animationId);
  renderRunningAnimationsList();
  refreshGlobalButtons();
}

function editAnimation(animationId) {
  const animation = state.runningAnimations.find((item) => item.id === animationId);
  if (!animation || animation.scope !== "room") {
    return;
  }
  state.boardId = animation.boardId;
  boardSelect.value = animation.boardId;
  boardImage.src = getBoard(animation.boardId).src;
  boardStatus.textContent = `Aktives Board: ${getBoard(animation.boardId).label}`;
  state.selectedRoomId = animation.roomId;
  state.selectedRoomByBoard[animation.boardId] = animation.roomId;
  state.roomDraft.animationId = animation.type;
  state.roomDraft.intensity = clampRoomIntensity(animation.intensity);
  state.roomDraft.durationSec = animation.durationMs
    ? clampRoomDurationSec(Math.round(animation.durationMs / 1000))
    : 18;
  state.roomDraft.hold = animation.hold;

  roomAnimationSelect.value = state.roomDraft.animationId;
  roomIntensityInput.value = String(state.roomDraft.intensity);
  roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
  roomDurationInput.value = String(state.roomDraft.durationSec);
  roomHoldInput.checked = state.roomDraft.hold;

  syncRoomPanelFromSelection();
  renderRoomOverlay();
  triggerFeedback.textContent = `Status: ${animation.id} in Editor geladen`;
}

function renderRunningAnimationsList() {
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
    const scopeLabel = anim.scope === "room" ? "ROOM" : "GLOBAL";
    title.textContent = `[${scopeLabel}] ${effectLabel} - ${roomLabel}`;

    const meta = document.createElement("div");
    meta.className = "running-meta";
    const remaining = anim.durationMs
      ? `${Math.max(0, Math.ceil((anim.startedAt + anim.durationMs - performance.now()) / 1000))}s`
      : "hold";
    meta.textContent = `Board: ${getBoard(anim.boardId).label} | Intensity: ${anim.intensity.toFixed(2)} | Rest: ${remaining}`;

    const actions = document.createElement("div");
    actions.className = "running-actions";
    const stopButton = document.createElement("button");
    stopButton.type = "button";
    stopButton.textContent = "Stop";
    stopButton.addEventListener("click", () => stopAnimation(anim.id));
    actions.append(stopButton);

    if (anim.scope === "room") {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => editAnimation(anim.id));
      actions.append(editButton);
    }

    li.append(title, meta, actions);
    runningAnimationsList.append(li);
  }
}

function refreshGlobalButtons() {
  document.querySelectorAll("button[data-global]").forEach((button) => {
    const type = button.dataset.global;
    const isActive = type === "outside-space"
      ? getOutsideFxProfile(state.boardId).enabled
      : state.runningAnimations.some((anim) => anim.scope === "global" && anim.type === type);
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

function clipToRoom(room) {
  const polygon = getRoomPolygonPixels(room, canvas.width, canvas.height);
  ctx.beginPath();
  polygon.forEach(([x, y], index) => {
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
  ctx.clip();
}

function clipToOutsideShip(boardId = state.boardId) {
  const shipPolygon = getShipPolygonPixels(canvas.width, canvas.height, boardId);
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  if (shipPolygon.length >= 3) {
    shipPolygon.forEach(([x, y], index) => {
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
  }
  ctx.clip("evenodd");
}

function drawAnimation(animation, now) {
  const age = (now - animation.startedAt) / 1000;
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
      clipToRoom(room);
      drawEffectVisual(animation.type, age, animation.intensity, room, roomMetrics);
    } finally {
      ctx.restore();
    }
    return;
  }
  if (animation.type === "outside-space") {
    ctx.save();
    try {
      clipToOutsideShip(state.boardId);
      drawEffectVisual(animation.type, age, animation.intensity, null);
    } finally {
      ctx.restore();
    }
    return;
  }

  drawEffectVisual(animation.type, age, animation.intensity, null);
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
    clipToOutsideShip(state.boardId);
    drawEffectVisual("outside-space", (now / 1000) * outside.speed, outside.intensity, null);
  } finally {
    ctx.restore();
  }
}

function drawEffectVisual(type, age, intensity, room, roomMetrics = null) {
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
    const starCount = Math.max(32, Math.round(90 * intensity));
    for (let i = 0; i < starCount; i += 1) {
      const lane = i / starCount;
      const drift = (age * 0.055 + lane * 1.618) % 1;
      const x = ((lane * 967 + age * 22) % 1) * w;
      const y = drift * h;
      const size = 0.8 + ((i * 37) % 3) * 0.5;
      const alpha = 0.12 + (((Math.sin(age * 2.4 + i) + 1) / 2) * 0.36 + 0.05) * intensity;
      ctx.fillStyle = `rgba(196, 222, 255, ${Math.min(0.9, alpha)})`;
      ctx.fillRect(x, y, size, size);
    }
    const sweep = (Math.sin(age * 0.9) + 1) / 2;
    const g = ctx.createLinearGradient(0, h * (0.15 + sweep * 0.15), w, h * (0.85 - sweep * 0.1));
    g.addColorStop(0, `rgba(33, 68, 120, ${0.08 * intensity})`);
    g.addColorStop(1, `rgba(122, 176, 255, ${0.14 * intensity})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
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
}

function draw(now) {
  try {
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
        "Status: fehlerhafte Animation isoliert, Render-Timer laeuft weiter";
    }

    if (now - lastListRenderAt > 500) {
      renderRunningAnimationsList();
      lastListRenderAt = now;
    }
  } finally {
    requestAnimationFrame(draw);
  }
}

for (const board of BOARDS) {
  const option = document.createElement("option");
  option.value = board.id;
  option.textContent = board.label;
  boardSelect.append(option);
}

boardSelect.addEventListener("change", () => switchBoard(boardSelect.value));

openDashboardViewButton.addEventListener("click", () => {
  setActiveView("dashboard");
});

openSettingsViewButton.addEventListener("click", () => {
  setActiveView("settings");
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
  syncOutsideFxPanel();
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
  setPanCursorState();
});

document.querySelectorAll("button[data-global]").forEach((button) => {
  button.addEventListener("click", () => {
    const type = button.dataset.global;
    if (type === "outside-space") {
      const current = getOutsideFxProfile(state.boardId);
      updateOutsideFxProfile(state.boardId, { enabled: !current.enabled });
      persistBoardProfiles();
      syncOutsideFxPanel();
      refreshGlobalButtons();
      triggerFeedback.textContent = current.enabled
        ? "Status: Outside Space gestoppt"
        : "Status: Outside Space gestartet";
      return;
    }
    const mode = type === "ambient-drift" || type === "ash-fall" || type === "hull-flicker" ? null : 6;
    upsertGlobalAnimation(type, mode);
  });
});

stopAllButton.addEventListener("click", () => {
  for (const animation of state.runningAnimations) {
    stopAnimationSound(animation.id);
  }
  state.runningAnimations = [];
  ashParticles.length = 0;
  renderRunningAnimationsList();
  refreshGlobalButtons();
  triggerFeedback.textContent = "Status: Clear All ausgefuehrt";
});

roomAnimationSelect.addEventListener("change", () => {
  state.roomDraft.animationId = roomAnimationSelect.value;
});

roomIntensityInput.addEventListener("input", () => {
  state.roomDraft.intensity = clampRoomIntensity(Number(roomIntensityInput.value));
  roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
});

roomDurationInput.addEventListener("input", () => {
  state.roomDraft.durationSec = clampRoomDurationSec(Number(roomDurationInput.value) || 1);
});

roomHoldInput.addEventListener("change", () => {
  state.roomDraft.hold = roomHoldInput.checked;
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

audioVolumeInput.addEventListener("input", () => {
  const volumePercent = clampAudioVolumePercent(Number(audioVolumeInput.value));
  state.audio.volume = volumePercent / 100;
  audioVolumeValue.textContent = `${volumePercent}%`;
  applyAudioGain();
  syncAudioStatus();
});

startRoomAnimationButton.addEventListener("click", () => {
  startRoomAnimationFromDraft();
});

applyOutputRouteButton.addEventListener("click", () => {
  applyOutputRoute(outputRouteSelect.value);
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
  validateViewExclusivity(state.uiView, { context: "resize-guard" });
  runLayoutScrollRegression();
});

resizeObserver.observe(stage);

state.hitareaCalibrationByBoard = createDefaultHitareaCalibrationMap();
state.roomGeometryByBoard = createDefaultRoomGeometryByBoard();
state.specialPolygonsByBoard = createDefaultSpecialPolygonsByBoard();
state.shipPolygonsByBoard = createDefaultShipPolygonsByBoard();
state.outsideFxByBoard = createDefaultOutsideFxByBoard();
state.boardZoomByBoard = createDefaultBoardZoomByBoard();
loadBoardProfiles();

switchBoard(state.boardId);
roomAnimationSelect.value = state.roomDraft.animationId;
roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
audioEnabledInput.checked = state.audio.enabled;
audioVolumeInput.value = String(Math.round(state.audio.volume * 100));
audioVolumeValue.textContent = `${Math.round(state.audio.volume * 100)}%`;
warmEventSoundAssets();
applyAudioGain();
syncAudioStatus();
syncHitareaCalibrationPanel();
syncRoomGeometryPanel();
syncPolygonEditorPanel();
syncShipPolygonEditorPanel();
syncOutsideFxPanel();
syncBoardZoomPanel();
setActiveView("dashboard");
setPanCursorState();
const viewRegressionOk = runViewVisibilityRegression();
const layoutRegressionOk = runLayoutScrollRegression();
const zoomPanRegressionOk = runZoomPanEditRegression();
const panPointerRegressionOk = runPanPointerCaptureRegression();
if (!viewRegressionOk || !layoutRegressionOk || !zoomPanRegressionOk || !panPointerRegressionOk) {
  triggerFeedback.textContent = "Status: Regression fehlgeschlagen (View/Layout/Zoom-Pan-Edit Guard)";
} else {
  triggerFeedback.textContent = "Status: Regression ok (View/Layout + Zoom-Pan-Edit + Pointer-Capture Guard)";
}
renderRunningAnimationsList();
refreshGlobalButtons();
requestAnimationFrame(draw);
