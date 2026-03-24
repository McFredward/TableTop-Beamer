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

const EVENT_SOUNDS = {
  "intruder-alert": [
    { wave: "sawtooth", freq: 840, duration: 0.08, gain: 0.42 },
    { wave: "sawtooth", freq: 740, duration: 0.08, gain: 0.4 },
    { wave: "triangle", freq: 620, duration: 0.12, gain: 0.34 },
  ],
  "reactor-pulse": [
    { wave: "sine", freq: 110, duration: 0.16, gain: 0.38 },
    { wave: "sine", freq: 130, duration: 0.18, gain: 0.36 },
    { wave: "triangle", freq: 150, duration: 0.21, gain: 0.33 },
  ],
  "power-outage": [
    { wave: "square", freq: 92, duration: 0.22, gain: 0.4 },
    { wave: "triangle", freq: 74, duration: 0.24, gain: 0.35 },
    { wave: "sawtooth", freq: 58, duration: 0.28, gain: 0.28 },
  ],
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

const ctx = canvas.getContext("2d");

const HITAREA_CALIBRATION_DEFAULT = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};
const HITAREA_CALIBRATION_STORAGE_KEY = "tt-beamer.hitarea-calibration.v1";

const ROOM_GEOMETRY_DEFAULT = {
  mode: "relative",
  offsetX: 0,
  offsetY: 0,
  absoluteX: null,
  absoluteY: null,
  stretchX: 1,
  stretchY: 1,
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
};

let animationIdCounter = 1;
const ashParticles = [];
let lastListRenderAt = 0;
let audioCtx = null;
let audioMasterGain = null;

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

function clampRoomStretch(value) {
  return Math.max(0.6, Math.min(1.6, value));
}

function normalizeRoomGeometryMode(mode) {
  return mode === "absolute" ? "absolute" : "relative";
}

function getRawRoomCenter(room) {
  if (room?.points?.length) {
    const center = room.points.reduce(
      (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
      { x: 0, y: 0 },
    );
    return {
      x: center.x / room.points.length,
      y: center.y / room.points.length,
    };
  }
  return {
    x: Number(room?.x) || 0.5,
    y: Number(room?.y) || 0.5,
  };
}

function normalizeRoomGeometry(geometry, room) {
  const mode = normalizeRoomGeometryMode(geometry?.mode);
  const baseCenter = getRawRoomCenter(room);
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
    board.rooms.map((room) => [room.id, normalizeRoomGeometry(ROOM_GEOMETRY_DEFAULT, room)]),
  );
}

function createDefaultRoomGeometryByBoard() {
  return Object.fromEntries(
    BOARDS.map((board) => [board.id, createDefaultRoomGeometryMap(board.id)]),
  );
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
  try {
    window.localStorage.setItem(
      HITAREA_CALIBRATION_STORAGE_KEY,
      JSON.stringify(state.hitareaCalibrationByBoard),
    );
    return true;
  } catch {
    return false;
  }
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
  return normalizeRoomGeometry(boardGeometry[roomId], room);
}

function setRoomGeometry(boardId, roomId, geometry) {
  if (!state.roomGeometryByBoard[boardId]) {
    state.roomGeometryByBoard[boardId] = createDefaultRoomGeometryMap(boardId);
  }
  const room = getBoard(boardId).rooms.find((entry) => entry.id === roomId);
  state.roomGeometryByBoard[boardId][roomId] = normalizeRoomGeometry(geometry, room);
}

function updateRoomGeometry(boardId, roomId, partial) {
  const previous = getRoomGeometry(boardId, roomId);
  setRoomGeometry(boardId, roomId, { ...previous, ...partial });
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

function setActiveView(view) {
  const nextView = view === "settings" ? "settings" : "dashboard";
  state.uiView = nextView;
  const showSettings = nextView === "settings";
  document.querySelectorAll(".settings-only").forEach((entry) => {
    entry.classList.toggle("view-hidden", !showSettings);
  });
  document.querySelectorAll(".dashboard-only").forEach((entry) => {
    entry.classList.toggle("view-hidden", showSettings);
  });
  openDashboardViewButton.classList.toggle("active", !showSettings);
  openSettingsViewButton.classList.toggle("active", showSettings);
}

function syncAudioStatus() {
  const volumePercent = Math.round(state.audio.volume * 100);
  const mode = state.audio.enabled ? "ON" : "OFF";
  audioStatus.textContent = `Audio: ${mode} (${volumePercent}%)`;
}

function applyAudioGain() {
  if (!audioCtx || !audioMasterGain) {
    return;
  }
  const gainTarget = state.audio.enabled ? state.audio.volume : 0;
  audioMasterGain.gain.setValueAtTime(gainTarget, audioCtx.currentTime);
}

function ensureAudioGraph() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }
  if (!audioCtx) {
    const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
    audioCtx = new AudioContextCtor();
    audioMasterGain = audioCtx.createGain();
    audioMasterGain.connect(audioCtx.destination);
  }
  applyAudioGain();
  return audioCtx;
}

function playEventSound(effectType) {
  const pattern = EVENT_SOUNDS[effectType];
  if (!pattern || !state.audio.enabled) {
    return;
  }
  const ctx = ensureAudioGraph();
  if (!ctx || !audioMasterGain) {
    return;
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => undefined);
  }

  let cursor = ctx.currentTime + 0.01;
  for (const step of pattern) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = step.wave;
    osc.frequency.setValueAtTime(step.freq, cursor);

    const peak = step.gain * state.audio.volume;
    gain.gain.setValueAtTime(0.001, cursor);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), cursor + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, cursor + step.duration);

    osc.connect(gain);
    gain.connect(audioMasterGain);
    osc.start(cursor);
    osc.stop(cursor + step.duration + 0.02);
    osc.addEventListener("ended", () => {
      osc.disconnect();
      gain.disconnect();
    });
    cursor += step.duration * 0.72;
  }
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
  const baseCenter = getRawRoomCenter(room);
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
    const baseCenter = getRoomCenterFromPoints(room.points);
    return room.points
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
      state.selectedRoomId = room.id;
      state.selectedRoomByBoard[state.boardId] = room.id;
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
  renderRoomOverlay();
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
    state.runningAnimations = state.runningAnimations.filter((anim) => anim.id !== existing.id);
    triggerFeedback.textContent = `Status: ${type} gestoppt`;
  } else {
    state.runningAnimations.push(
      createAnimation({
        type,
        scope: "global",
        intensity: 1,
        hold: defaultDurationSec === null,
        durationSec: defaultDurationSec ?? 0,
      }),
    );
    playEventSound(type);
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
  triggerFeedback.textContent = `Status: ${ROOM_ANIMATIONS.find((item) => item.id === animation.type)?.label ?? animation.type} auf ${room.label} gestartet`;
  renderRunningAnimationsList();
}

function stopAnimation(animationId) {
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
    const isActive = state.runningAnimations.some(
      (anim) => anim.scope === "global" && anim.type === button.dataset.global,
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
    ctx.save();
    try {
      clipToRoom(room);
      drawEffectVisual(animation.type, age, animation.intensity, room);
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

function drawEffectVisual(type, age, intensity, room) {
  const w = canvas.width;
  const h = canvas.height;
  const roomCenter = room ? getRoomLabelPosition(room, state.boardId) : { x: 0.5, y: 0.5 };
  const roomX = roomCenter.x * w;
  const roomY = roomCenter.y * h;

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
    const r = room.radius * Math.min(w, h) * 1.4;
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
    for (let i = 0; i < 3; i += 1) {
      const rise = ((age * 45 + i * 24) % 120) - 60;
      const radius = 9 + ((age * 12 + i * 6) % 14);
      ctx.fillStyle = `rgba(225, 236, 255, ${0.09 * intensity})`;
      ctx.beginPath();
      ctx.arc(roomX + i * 11 - 11, roomY + rise, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (type === "contamination") {
    const alpha = (0.1 + Math.sin(age * 2.6) * 0.04) * intensity;
    const g = ctx.createRadialGradient(roomX, roomY, 2, roomX, roomY, room.radius * Math.min(w, h));
    g.addColorStop(0, `rgba(96, 232, 142, ${alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(roomX - 180, roomY - 180, 360, 360);
    return;
  }

  if (type === "electrical-arc") {
    ctx.strokeStyle = `rgba(120, 200, 255, ${0.8 * intensity})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const px = roomX + (Math.random() - 0.5) * room.radius * Math.min(w, h);
      const py = roomY + (Math.random() - 0.5) * room.radius * Math.min(w, h);
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
    const g = ctx.createRadialGradient(roomX, roomY, 3, roomX, roomY, room.radius * Math.min(w, h) * 0.9);
    g.addColorStop(0, `rgba(255, 123, 61, ${alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(roomX - 140, roomY - 140, 280, 280);
    return;
  }

  if (type === "alarm-beacon") {
    const pulse = (Math.sin(age * 8) + 1) / 2;
    const g = ctx.createRadialGradient(roomX, roomY, 2, roomX, roomY, room.radius * Math.min(w, h));
    g.addColorStop(0, `rgba(255, 60, 60, ${(0.12 + pulse * 0.18) * intensity})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(roomX - 150, roomY - 150, 300, 300);
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
    renderRunningAnimationsList();
    refreshGlobalButtons();
  }
}

function draw(now) {
  try {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pruneFinishedAnimations(now);

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
    ? "Status: Hitarea-Kalibrierung gespeichert"
    : "Status: Hitarea-Kalibrierung konnte nicht gespeichert werden";
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
  renderRoomOverlay();
  syncRoomGeometryPanel();
  if (statusSuffix) {
    triggerFeedback.textContent = `Status: ${room.label} ${statusSuffix}`;
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

document.querySelectorAll("button[data-global]").forEach((button) => {
  button.addEventListener("click", () => {
    const type = button.dataset.global;
    const mode = type === "ambient-drift" || type === "ash-fall" || type === "hull-flicker" ? null : 6;
    upsertGlobalAnimation(type, mode);
  });
});

stopAllButton.addEventListener("click", () => {
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
});

resizeObserver.observe(stage);

state.hitareaCalibrationByBoard = loadHitareaCalibrationMap();
state.roomGeometryByBoard = createDefaultRoomGeometryByBoard();

switchBoard(state.boardId);
roomAnimationSelect.value = state.roomDraft.animationId;
roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
audioEnabledInput.checked = state.audio.enabled;
audioVolumeInput.value = String(Math.round(state.audio.volume * 100));
audioVolumeValue.textContent = `${Math.round(state.audio.volume * 100)}%`;
syncAudioStatus();
syncHitareaCalibrationPanel();
syncRoomGeometryPanel();
setActiveView("dashboard");
renderRunningAnimationsList();
refreshGlobalButtons();
requestAnimationFrame(draw);
