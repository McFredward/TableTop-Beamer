const BOARDS = [
  {
    id: "nemesis-board-a",
    label: "Nemesis Board A",
    src: "resources/nemesis/boards/httpssteamusercontentaakamaihdnetugc946212227080494269577CF3785BAEF06122BDE208B776E07B27BFFA58.jpg",
  },
  {
    id: "nemesis-board-b",
    label: "Nemesis Board B",
    src: "resources/nemesis/boards/httpssteamusercontentaakamaihdnetugc948472629471389466262B46FE788A03A16E28D87AE3C3D56A707BC356.jpg",
  },
];

const stage = document.querySelector("#stage");
const boardImage = document.querySelector("#board-image");
const canvas = document.querySelector("#fx-canvas");
const roomOverlay = document.querySelector("#room-overlay");
const ctx = canvas.getContext("2d");
const boardSelect = document.querySelector("#board-select");
const boardStatus = document.querySelector("#board-status");
const boardMetric = document.querySelector("#board-metric");
const powerOutageMetric = document.querySelector("#power-outage-metric");
const intensityInput = document.querySelector("#intensity");
const intensityValue = document.querySelector("#intensity-value");
const offsetXInput = document.querySelector("#offset-x");
const offsetYInput = document.querySelector("#offset-y");
const scaleInput = document.querySelector("#scale");
const rotationInput = document.querySelector("#rotation");
const resetCalibrationButton = document.querySelector("#reset-calibration");
const triggerFeedback = document.querySelector("#trigger-feedback");
const activeEffectsList = document.querySelector("#active-effects");
const offsetXValue = document.querySelector("#offset-x-value");
const offsetYValue = document.querySelector("#offset-y-value");
const scaleValue = document.querySelector("#scale-value");
const rotationValue = document.querySelector("#rotation-value");
const roomSelected = document.querySelector("#room-selected");
const roomTriggerSelect = document.querySelector("#room-trigger-select");
const roomIntensityInput = document.querySelector("#room-intensity");
const roomIntensityValue = document.querySelector("#room-intensity-value");

const state = {
  ambient: false,
  ash: false,
  leak: false,
  intruderUntil: 0,
  reactorUntil: 0,
  fireUntil: 0,
  blackoutUntil: 0,
  intensity: Number(intensityInput.value),
};

const particles = [];
let emergencyStopRequested = false;
const powerOutageLatencySamples = [];
let pendingPowerOutageRequestAt = null;
let pointerPressWasHandled = false;
const POWER_OUTAGE_SAMPLE_WINDOW = 24;
const POWER_OUTAGE_TARGET_MS = 150;
const CLEAR_PRIORITY_WINDOW_MS = 220;
let clearPriorityUntil = 0;
const SESSION_KEY = "tt-beamer.phase1.session";
const defaultSession = {
  boardId: BOARDS[0].id,
  intensity: 0.8,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
};

const ROOM_ZONES = [
  { id: "bridge", label: "Bridge", x: 0.19, y: 0.28 },
  { id: "lab", label: "Lab", x: 0.3, y: 0.53 },
  { id: "nest", label: "Nest", x: 0.43, y: 0.42 },
  { id: "engine", label: "Engine", x: 0.56, y: 0.64 },
  { id: "comms", label: "Comms", x: 0.72, y: 0.29 },
  { id: "cargo", label: "Cargo", x: 0.84, y: 0.55 },
];

const ROOM_TRIGGER_OPTIONS = ["intruder", "reactor", "fire", "blackout", "ambient", "ash", "leak"];

function createDefaultRoomConfigs() {
  return Object.fromEntries(ROOM_ZONES.map((zone) => [zone.id, { trigger: "intruder", intensity: 1 }]));
}

const DEFAULT_ACTIVE_ROOM_ID = ROOM_ZONES[0].id;
const DEFAULT_ROOM_CONFIGS = createDefaultRoomConfigs();

state.activeRoomId = DEFAULT_ACTIVE_ROOM_ID;
state.roomConfigs = createDefaultRoomConfigs();

const zoneAnchors = ROOM_ZONES.map((zone) => [zone.x, zone.y]);

for (const board of BOARDS) {
  const option = document.createElement("option");
  option.value = board.id;
  option.textContent = board.label;
  boardSelect.append(option);
}

const boardPreload = new Map();

function preloadBoardAssets() {
  for (const board of BOARDS) {
    const image = new Image();
    image.src = board.src;
    boardPreload.set(board.id, image.decode().catch(() => undefined));
  }
}

function saveSessionState() {
  const payload = {
    boardId: boardSelect.value,
    intensity: Number(intensityInput.value),
    offsetX: Number(offsetXInput.value),
    offsetY: Number(offsetYInput.value),
    scale: Number(scaleInput.value),
    rotation: Number(rotationInput.value),
    activeRoomId: state.activeRoomId,
    roomConfigs: state.roomConfigs,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

function sanitizeRoomConfigs(input) {
  const safe = createDefaultRoomConfigs();
  if (!input || typeof input !== "object") {
    return safe;
  }

  for (const zone of ROOM_ZONES) {
    const candidate = input[zone.id];
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const trigger = ROOM_TRIGGER_OPTIONS.includes(candidate.trigger) ? candidate.trigger : safe[zone.id].trigger;
    const intensity = Number(candidate.intensity);
    safe[zone.id] = {
      trigger,
      intensity: Number.isFinite(intensity) ? Math.max(0.5, Math.min(1.5, intensity)) : safe[zone.id].intensity,
    };
  }

  return safe;
}

function loadSessionState() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return {
        ...defaultSession,
        activeRoomId: DEFAULT_ACTIVE_ROOM_ID,
        roomConfigs: createDefaultRoomConfigs(),
      };
    }
    const parsed = JSON.parse(raw);
    return {
      boardId: BOARDS.some((b) => b.id === parsed.boardId) ? parsed.boardId : defaultSession.boardId,
      intensity: Number.isFinite(parsed.intensity) ? parsed.intensity : defaultSession.intensity,
      offsetX: Number.isFinite(parsed.offsetX) ? parsed.offsetX : defaultSession.offsetX,
      offsetY: Number.isFinite(parsed.offsetY) ? parsed.offsetY : defaultSession.offsetY,
      scale: Number.isFinite(parsed.scale) ? parsed.scale : defaultSession.scale,
      rotation: Number.isFinite(parsed.rotation) ? parsed.rotation : defaultSession.rotation,
      activeRoomId: ROOM_ZONES.some((zone) => zone.id === parsed.activeRoomId)
        ? parsed.activeRoomId
        : DEFAULT_ACTIVE_ROOM_ID,
      roomConfigs: sanitizeRoomConfigs(parsed.roomConfigs),
    };
  } catch {
    return {
      ...defaultSession,
      activeRoomId: DEFAULT_ACTIVE_ROOM_ID,
      roomConfigs: createDefaultRoomConfigs(),
    };
  }
}

function applySessionState(session) {
  boardSelect.value = session.boardId;
  intensityInput.value = String(session.intensity);
  offsetXInput.value = String(session.offsetX);
  offsetYInput.value = String(session.offsetY);
  scaleInput.value = String(session.scale);
  rotationInput.value = String(session.rotation);
  state.activeRoomId = session.activeRoomId ?? DEFAULT_ACTIVE_ROOM_ID;
  state.roomConfigs = sanitizeRoomConfigs(session.roomConfigs ?? DEFAULT_ROOM_CONFIGS);
  state.intensity = Number(intensityInput.value);
  intensityValue.textContent = state.intensity.toFixed(2);
  updateStageTransform();
  syncRoomConfigControls();
}

function getSelectedRoom() {
  return ROOM_ZONES.find((zone) => zone.id === state.activeRoomId) ?? ROOM_ZONES[0];
}

function syncRoomConfigControls() {
  const selectedRoom = getSelectedRoom();
  const config = state.roomConfigs[selectedRoom.id] ?? DEFAULT_ROOM_CONFIGS[selectedRoom.id];
  roomSelected.textContent = `Ausgewaehlter Raum: ${selectedRoom.label}`;
  roomTriggerSelect.value = config.trigger;
  roomIntensityInput.value = String(config.intensity);
  roomIntensityValue.textContent = `${config.intensity.toFixed(2)}x`;
}

function getMasterIntensity(multiplier = 1) {
  const value = state.intensity * multiplier;
  return Math.max(0, Math.min(1, value));
}

function createEffectRegistry(effectState, allParticles) {
  const registry = {
    ambient: {
      start: () => {
        effectState.ambient = true;
      },
      stop: () => {
        effectState.ambient = false;
      },
      toggle: () => {
        effectState.ambient = !effectState.ambient;
      },
      isActive: () => effectState.ambient,
    },
    ash: {
      start: () => {
        effectState.ash = true;
      },
      stop: () => {
        effectState.ash = false;
      },
      toggle: () => {
        effectState.ash = !effectState.ash;
      },
      isActive: () => effectState.ash,
    },
    leak: {
      start: () => {
        effectState.leak = true;
      },
      stop: () => {
        effectState.leak = false;
      },
      toggle: () => {
        effectState.leak = !effectState.leak;
      },
      isActive: () => effectState.leak,
    },
    intruder: {
      start: (now) => {
        effectState.intruderUntil = now + 6500;
      },
      stop: () => {
        effectState.intruderUntil = 0;
      },
      isActive: (now) => effectState.intruderUntil > now,
    },
    reactor: {
      start: (now) => {
        effectState.reactorUntil = now + 9000;
      },
      stop: () => {
        effectState.reactorUntil = 0;
      },
      isActive: (now) => effectState.reactorUntil > now,
    },
    fire: {
      start: (now) => {
        effectState.fireUntil = now + 4200;
      },
      stop: () => {
        effectState.fireUntil = 0;
      },
      isActive: (now) => effectState.fireUntil > now,
    },
    blackout: {
      start: (now) => {
        effectState.blackoutUntil = now + 2600;
      },
      stop: () => {
        effectState.blackoutUntil = 0;
      },
      isActive: (now) => effectState.blackoutUntil > now,
    },
  };

  return {
    ...registry,
    clear: {
      start: () => {
        Object.values(registry).forEach((effect) => effect.stop());
        allParticles.length = 0;
      },
      stop: () => {},
      isActive: () => false,
    },
  };
}

const effects = createEffectRegistry(state, particles);

function clearAllEffectsNow() {
  clearPriorityUntil = performance.now() + CLEAR_PRIORITY_WINDOW_MS;
  pendingPowerOutageRequestAt = null;
  effects.clear.start();
  triggerFeedback.textContent = "Event Feedback: Safety stop aktiv";
  refreshButtonStates();
}

function bindPressFirstAction(button, action) {
  button.addEventListener(
    "pointerdown",
    (event) => {
      event.preventDefault();
      pointerPressWasHandled = true;
      action("pointerdown");
    },
    { passive: false },
  );

  button.addEventListener("click", () => {
    if (pointerPressWasHandled) {
      pointerPressWasHandled = false;
      return;
    }
    action("click");
  });
}

function updatePowerOutageMetric() {
  if (powerOutageLatencySamples.length === 0) {
    powerOutageMetric.textContent = "Power Outage: noch keine Messwerte";
    return;
  }
  const total = powerOutageLatencySamples.reduce((sum, sample) => sum + sample, 0);
  const average = total / powerOutageLatencySamples.length;
  const latest = powerOutageLatencySamples[powerOutageLatencySamples.length - 1];
  const status = average <= POWER_OUTAGE_TARGET_MS ? "OK" : "WARN";
  powerOutageMetric.textContent = `Power Outage: avg ${average.toFixed(1)} ms | last ${latest.toFixed(1)} ms (${status})`;
}

function triggerPowerOutage(triggerSource) {
  const requestStartedAt = performance.now();
  if (requestStartedAt <= clearPriorityUntil) {
    triggerFeedback.textContent = "Event Feedback: blackout durch Safety-Fenster geblockt";
    return;
  }
  pendingPowerOutageRequestAt = requestStartedAt;
  effects.blackout.start(requestStartedAt);
  triggerFeedback.textContent = `Event Feedback: blackout via ${triggerSource}`;
  refreshButtonStates();
}

async function switchBoard(boardId) {
  const selected = BOARDS.find((item) => item.id === boardId);
  if (!selected) {
    return;
  }

  const start = performance.now();
  boardMetric.textContent = "Boardwechsel: laeuft...";
  await boardPreload.get(boardId);
  boardImage.src = selected.src;
  const elapsed = performance.now() - start;
  const outcome = elapsed < 1000 ? "OK" : "WARN";
  boardStatus.textContent = `Aktives Board: ${selected.label}`;
  boardMetric.textContent = `Boardwechsel: ${elapsed.toFixed(0)} ms (${outcome})`;
}

boardSelect.addEventListener("change", () => {
  saveSessionState();
  void switchBoard(boardSelect.value);
});

intensityInput.addEventListener("input", () => {
  state.intensity = Number(intensityInput.value);
  intensityValue.textContent = state.intensity.toFixed(2);
  saveSessionState();
});

const updateStageTransform = () => {
  stage.style.transform = `translate3d(${offsetXInput.value}px, ${offsetYInput.value}px, 0) scale(${scaleInput.value}) rotate(${rotationInput.value}deg)`;
  offsetXValue.textContent = `${Number(offsetXInput.value)} px`;
  offsetYValue.textContent = `${Number(offsetYInput.value)} px`;
  scaleValue.textContent = `${Number(scaleInput.value).toFixed(2)}x`;
  rotationValue.textContent = `${Number(rotationInput.value).toFixed(1)}°`;
};

[offsetXInput, offsetYInput, scaleInput, rotationInput].forEach((input) => {
  input.addEventListener("input", () => {
    updateStageTransform();
    saveSessionState();
  });
});

resetCalibrationButton.addEventListener("click", () => {
  applySessionState(defaultSession);
  saveSessionState();
  void switchBoard(boardSelect.value);
});

document.querySelectorAll("button[data-trigger]").forEach((button) => {
  if (button.dataset.trigger === "clear") {
    bindPressFirstAction(button, () => {
      emergencyStopRequested = true;
      clearAllEffectsNow();
    });
    return;
  }

  if (button.dataset.trigger === "blackout") {
    bindPressFirstAction(button, (source) => {
      const start = performance.now();
      triggerPowerOutage(source);
      const elapsed = performance.now() - start;
      button.classList.add("event-fired");
      setTimeout(() => button.classList.remove("event-fired"), 280);
      triggerFeedback.textContent = `Event Feedback: blackout queued in ${elapsed.toFixed(1)} ms`;
    });
    return;
  }

  button.addEventListener("click", () => {
    const trigger = button.dataset.trigger;
    const start = performance.now();
    applyTrigger(trigger);
    const elapsed = performance.now() - start;
    if (!["ambient", "ash", "leak", "clear"].includes(trigger)) {
      triggerFeedback.textContent = `Event Feedback: ${trigger} in ${elapsed.toFixed(1)} ms`;
      button.classList.add("event-fired");
      setTimeout(() => button.classList.remove("event-fired"), 280);
    }
    refreshButtonStates();
  });
});

function applyTrigger(trigger) {
  const now = performance.now();
  const effect = effects[trigger];
  if (!effect) {
    return;
  }

  if (effect.toggle) {
    effect.toggle(now);
  } else {
    effect.start(now);
  }
}

function refreshButtonStates() {
  const activeAmbientEffects = [];
  document.querySelectorAll("button[data-trigger]").forEach((button) => {
    const trigger = button.dataset.trigger;
    const effect = effects[trigger];
    if (!effect) {
      return;
    }
    const active = Boolean(effect.isActive(performance.now()));
    const isAmbient = button.dataset.kind === "ambient";
    button.classList.toggle("active", isAmbient && active);
    if (isAmbient) {
      button.setAttribute("aria-pressed", active ? "true" : "false");
      if (active) {
        activeAmbientEffects.push(button.textContent.trim());
      }
    }
  });

  activeEffectsList.replaceChildren();
  if (activeAmbientEffects.length === 0) {
    const empty = document.createElement("li");
    empty.className = "is-empty";
    empty.textContent = "Keine";
    activeEffectsList.append(empty);
    return;
  }
  for (const name of activeAmbientEffects) {
    const item = document.createElement("li");
    item.textContent = name;
    activeEffectsList.append(item);
  }
}

function highlightRoomZone(roomId) {
  state.activeRoomId = roomId;
  roomOverlay.querySelectorAll(".room-zone").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.roomId === roomId);
  });
  syncRoomConfigControls();
  saveSessionState();
}

function handleRoomZoneClick(zone) {
  const roomButton = roomOverlay.querySelector(`[data-room-id="${zone.id}"]`);
  if (!roomButton) {
    return;
  }
  highlightRoomZone(zone.id);
  roomButton.classList.add("is-fired");
  setTimeout(() => roomButton.classList.remove("is-fired"), 320);
  triggerFeedback.textContent = `Event Feedback: room ${zone.label} markiert`;
}

function renderRoomZones() {
  roomOverlay.replaceChildren();
  for (const zone of ROOM_ZONES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "room-zone";
    button.dataset.roomId = zone.id;
    button.textContent = zone.label;
    button.style.left = `${zone.x * 100}%`;
    button.style.top = `${zone.y * 100}%`;
    button.addEventListener("click", () => handleRoomZoneClick(zone));
    roomOverlay.append(button);
  }
}

roomTriggerSelect.addEventListener("change", () => {
  const selectedRoom = getSelectedRoom();
  state.roomConfigs[selectedRoom.id] = {
    ...state.roomConfigs[selectedRoom.id],
    trigger: roomTriggerSelect.value,
  };
  saveSessionState();
});

roomIntensityInput.addEventListener("input", () => {
  const selectedRoom = getSelectedRoom();
  const intensity = Number(roomIntensityInput.value);
  state.roomConfigs[selectedRoom.id] = {
    ...state.roomConfigs[selectedRoom.id],
    intensity,
  };
  roomIntensityValue.textContent = `${intensity.toFixed(2)}x`;
  saveSessionState();
});

const resizeObserver = new ResizeObserver((entries) => {
  const size = entries[0].contentRect;
  canvas.width = Math.max(1, Math.floor(size.width));
  canvas.height = Math.max(1, Math.floor(size.height));
});

resizeObserver.observe(stage);

function draw(timestamp) {
  const w = canvas.width;
  const h = canvas.height;

  if (emergencyStopRequested) {
    emergencyStopRequested = false;
    clearAllEffectsNow();
  }

  ctx.clearRect(0, 0, w, h);
  const t = timestamp / 1000;
  const gain = getMasterIntensity();

  if (state.ambient) {
    const alpha = (0.08 + Math.sin(t * 1.6) * 0.03) * gain;
    const gradient = ctx.createRadialGradient(w * 0.5, h * 0.55, h * 0.05, w * 0.5, h * 0.55, h * 0.85);
    gradient.addColorStop(0, `rgba(90, 130, 180, ${alpha})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  if (state.ash && Math.random() > 0.7 - gain * 0.2) {
    particles.push({
      x: Math.random() * w,
      y: -14,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.45 + Math.random() * 0.9,
      life: 1,
      kind: "ash",
      size: 0.8 + Math.random() * 2.8,
    });
  }

  if (state.leak && Math.random() > 0.8 - gain * 0.18) {
    const [zx, zy] = zoneAnchors[(Math.random() * zoneAnchors.length) | 0];
    particles.push({
      x: zx * w + (Math.random() - 0.5) * 40,
      y: zy * h + (Math.random() - 0.5) * 22,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -0.15 - Math.random() * 0.32,
      life: 1,
      kind: "leak",
      size: 8 + Math.random() * 12,
    });
  }

  const intruder = Math.max(0, state.intruderUntil - timestamp);
  if (intruder > 0) {
    const pulse = (Math.sin(t * 11) + 1) / 2;
    ctx.fillStyle = `rgba(255, 45, 45, ${(0.12 + pulse * 0.2) * gain})`;
    ctx.fillRect(0, 0, w, h);
  }

  const reactor = Math.max(0, state.reactorUntil - timestamp);
  if (reactor > 0) {
    const phase = 1 - reactor / 9000;
    const radius = (0.12 + phase * 0.7) * Math.max(w, h);
    const gradient = ctx.createRadialGradient(w * 0.5, h * 0.5, radius * 0.15, w * 0.5, h * 0.5, radius);
    gradient.addColorStop(0, `rgba(255, 156, 45, ${0.32 * gain})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  const fire = Math.max(0, state.fireUntil - timestamp);
  if (fire > 0) {
    const flicker = 0.2 + Math.random() * 0.28;
    for (const [zx, zy] of zoneAnchors) {
      const gradient = ctx.createRadialGradient(zx * w, zy * h, 1, zx * w, zy * h, 70);
      gradient.addColorStop(0, `rgba(255, 120, 45, ${flicker * gain})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(zx * w - 72, zy * h - 72, 144, 144);
    }
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.008;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    if (p.kind === "ash") {
      ctx.fillStyle = `rgba(210, 220, 230, ${p.life * 0.42 * gain})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      continue;
    }

    ctx.fillStyle = `rgba(95, 210, 140, ${p.life * 0.2 * gain})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  const blackout = Math.max(0, state.blackoutUntil - timestamp);
  if (blackout > 0) {
    if (pendingPowerOutageRequestAt !== null) {
      const latency = Math.max(0, timestamp - pendingPowerOutageRequestAt);
      powerOutageLatencySamples.push(latency);
      if (powerOutageLatencySamples.length > POWER_OUTAGE_SAMPLE_WINDOW) {
        powerOutageLatencySamples.shift();
      }
      pendingPowerOutageRequestAt = null;
      updatePowerOutageMetric();
    }
    const alpha = (0.82 - (blackout / 2600) * 0.18) * getMasterIntensity(0.95);
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  requestAnimationFrame(draw);
}

preloadBoardAssets();
renderRoomZones();
applySessionState(loadSessionState());
highlightRoomZone(state.activeRoomId);
saveSessionState();
void switchBoard(boardSelect.value);
refreshButtonStates();
updatePowerOutageMetric();
requestAnimationFrame(draw);
