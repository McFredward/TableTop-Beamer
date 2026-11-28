import { readBitmap } from "../calibration/calibration-images.js";
import { createFireTracker, detectFireTokens } from "../vision/fire-observer.js";
import { createGameObserver, makeGameLayout } from "../vision/game-observer.js";
import { detectTrackBeads, prepareTrackBeads } from "../vision/track-beads.js";
import { createAnimationCameraBindings } from "../vision/animation-camera-bindings.js";
import { checkCameraReading, filterCameraObjects, readBoardObjects, registerCameraBoard } from "../vision/camera-board-readings.js";
import { createGameDetectionOverlay } from "./game-detection-overlay.js";

const classLabels = {
  alien: "Aliens", character: "Player figures", corpse: "Corpse miniatures", dice: "Dice", door: "Doors", fire: "Fire",
  hand: "Hands", malfunction: "Malfunction", noise: "Noise", round: "Round counter",
  "self-destruct": "Self-destruct counter", "track-marker": "Track markers",
  "xeno-corpse": "Xeno corpse tokens",
};

function textNode(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function updateRows(container, rows, createRow) {
  const signature = JSON.stringify(rows);
  if (container.dataset.rows === signature) return;
  container.dataset.rows = signature;
  const scrollTop = container.scrollTop;
  container.replaceChildren(...rows.map(createRow));
  if (scrollTop) container.scrollTop = scrollTop;
}

export function paintBoxes(context, boxes, zoom) {
  const { width, height } = context.canvas;
  const unit = width / (context.canvas.offsetWidth || width) / zoom;
  const labelScale = unit * Math.max(10, 13 * zoom ** -0.35) / 13;
  context.save();
  context.lineWidth = 1.5 * unit;
  for (const { contours, color } of boxes) {
    if (!contours?.length) continue;
    context.beginPath();
    for (const polygon of contours) {
      context.moveTo(polygon[0][0] * width, polygon[0][1] * height);
      for (const [x, y] of polygon.slice(1)) context.lineTo(x * width, y * height);
      context.closePath();
    }
    context.globalAlpha = 0.36;
    context.fillStyle = color;
    context.fill("evenodd");
  }
  context.globalAlpha = 1;
  for (const { box: [x, y, w, h], color, held } of boxes) {
    context.strokeStyle = color;
    context.setLineDash(held ? [5 * unit, 4 * unit] : []);
    context.strokeRect(x * width, y * height, w * width, h * height);
  }
  context.font = `bold ${13 * labelScale}px system-ui`;
  for (const { box: [x, y], label, color } of boxes) {
    const labelWidth = context.measureText(label).width + 6 * labelScale;
    const textX = Math.max(0, Math.min(x * width, width - labelWidth));
    const textY = Math.max(18 * labelScale, y * height - 2 * labelScale);
    context.fillStyle = "#10151e";
    context.fillRect(textX, textY - 16 * labelScale, labelWidth, 17 * labelScale);
    context.fillStyle = color;
    context.fillText(label, textX + 3 * labelScale, textY - 3 * labelScale);
  }
  context.restore();
}

export function createGameReview() {
  const panel = document.getElementById("game-review");
  const tracks = document.getElementById("game-review-tracks");
  const effects = document.getElementById("game-review-effects");
  const effectsEmpty = document.getElementById("game-review-effects-empty");
  const source = document.getElementById("game-review-source");
  const sourceClasses = document.getElementById("game-review-classes");
  const boxTypes = document.getElementById("game-box-classes");
  const boxCount = document.getElementById("game-box-count");
  const showAll = document.getElementById("game-box-all");
  const hideAll = document.getElementById("game-box-none");
  const hiddenKinds = new Set();
  let setup;

  function updateFilterCount() {
    const options = [...boxTypes.querySelectorAll("input")];
    const visible = options.filter(option => option.checked).length;
    boxCount.textContent = visible === options.length ? "All" : `${visible}/${options.length}`;
    showAll.disabled = !hiddenKinds.size;
    hideAll.disabled = !visible;
  }

  boxTypes.addEventListener("change", event => {
    const { value, checked } = event.target;
    if (checked) hiddenKinds.delete(value);
    else hiddenKinds.add(value);
    updateFilterCount();
  });
  showAll.addEventListener("click", () => {
    hiddenKinds.clear();
    boxTypes.querySelectorAll("input").forEach(input => { input.checked = true; });
    updateFilterCount();
  });
  hideAll.addEventListener("click", () => {
    for (const input of boxTypes.querySelectorAll("input")) {
      hiddenKinds.add(input.value);
      input.checked = false;
    }
    updateFilterCount();
  });

  function reset(visible) {
    panel.hidden = !visible;
    setup = null;
    tracks.textContent = "";
    effects.textContent = "";
    delete tracks.dataset.rows;
    delete effects.dataset.rows;
    effectsEmpty.hidden = false;
    sourceClasses.textContent = "";
    delete source.dataset.state;
    source.textContent = visible ? "Locating the printed board…" : "";
  }

  function unavailable(message) {
    source.textContent = message;
    delete source.dataset.state;
  }

  async function register(frame, generation, signal) {
    const init = { cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(6500)]) };
    const [live, catalog] = await Promise.all([
      fetch("/api/live/snapshot", init).then(response => response.json()),
      fetch("/api/boards", init).then(response => response.json()),
    ]);
    const id = live.session?.snapshot?.selectedBoard;
    const board = catalog.boards.find(candidate => candidate.boardId === id);
    const { cv, geometry, registration, reference, width, height } = await registerCameraBoard(board, frame, signal);
    const layout = makeGameLayout(board, registration, frame.width, frame.height);
    setup = {
      cv, geometry, registration, width, height, id, generation,
      beads: prepareTrackBeads(layout.slots, registration, reference, frame),
      native: createGameObserver(layout), trained: createGameObserver({ ...layout, slots: [] }),
      fire: createFireTracker(), fireEffect: layout.effects.fire,
      bindings: createAnimationCameraBindings(board, registration, frame.width, frame.height),
      overlays: new Map(),
      knownClasses: new Set(),
      checkedModels: new Map(),
    };
  }

  function renderReadings(native, proposed, fallback, view) {
    const trackCards = setup.beads.length ? ["round", "self-destruct"].map(kind => ({
      label: kind === "round" ? "Round" : "Self-destruct",
      ...native.tracks.find(track => track.kind === kind),
    })) : [];
    updateRows(tracks, trackCards, ({ label, status, value }) => {
      const card = textNode("section", "", "game-review-card");
      card.append(textNode("h3", label), textNode("strong", status === "inactive" ? "Off" : value ?? "—", "game-review-value"),
        textNode("p", status ?? "Waiting for counter", "game-review-meta"));
      return card;
    });

    const rows = proposed.map(({ zone, effect, active, status, kind, count }) => ({
      zone, name: effect.name, active, status: kind === "alien" && active ? `${status} · ${count} seen` : status,
    })).concat(fallback.map(item => ({ zone: item.room.name, name: "Fire", active: item.active, status: `local check · ${item.state}` })));
    rows.sort((a, b) => a.zone.localeCompare(b.zone) || a.name.localeCompare(b.name));
    effectsEmpty.hidden = rows.length > 0;
    updateRows(effects, rows, ({ zone, name, active, status }) => {
      const row = document.createElement("li");
      row.dataset.active = String(Boolean(active));
      row.append(textNode("strong", name), textNode("span", active ? "On" : status === "checking" ? "Confirming" : "Off", "game-review-state"),
        textNode("span", `${/^\d{3}$/.test(zone) ? `Room ${zone}` : zone} · ${status}`, "game-review-meta"));
      return row;
    });

    const label = view.delayed ? "Waiting for a newer model result"
      : view.classes.length ? "Trained model"
      : setup.bindings.modelIds.length ? "Waiting for the trained model" : "Local image checks";
    if (source.textContent !== label) source.textContent = label;
    source.dataset.state = view.classes.length && !view.delayed ? "live" : "waiting";
    const detail = view.classes.length ? view.classes.join(" · ")
      : setup.beads.length || setup.fireEffect ? "Fire and counters are available while the trained model is offline."
        : "Waiting for a trained model.";
    if (sourceClasses.textContent !== detail) sourceClasses.textContent = detail;
    for (const kind of view.classes) {
      if (kind !== "track-marker" || !setup.beads.length) setup.knownClasses.add(kind);
    }
    if (setup.beads.length) {
      setup.knownClasses.add("round");
      setup.knownClasses.add("self-destruct");
    }
    if (setup.fireEffect && setup.geometry) setup.knownClasses.add("fire");
    updateRows(boxTypes, [...setup.knownClasses].sort(), kind => {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = kind;
      input.checked = !hiddenKinds.has(kind);
      const label = document.createElement("label");
      label.append(input, document.createTextNode(Object.hasOwn(classLabels, kind) ? classLabels[kind] : kind));
      return label;
    });
    updateFilterCount();
  }

  async function readModels(generation, signal) {
    const current = setup;
    const modelIds = current.bindings.modelIds.length ? current.bindings.modelIds : [undefined];
    return Promise.all(modelIds.map(async modelId => {
      if (!current.overlays.has(modelId)) current.overlays.set(modelId, createGameDetectionOverlay());
      const feed = await readBoardObjects(signal, modelId).catch(() => null);
      const model = feed?.frameId.split("-")[1] === generation ? feed : null;
      const filtered = model && filterCameraObjects(model, current);
      return { modelId, model, overlay: current.overlays.get(modelId)(filtered) };
    }));
  }

  async function observe(bitmap, id, signal) {
    const frame = readBitmap(bitmap, true);
    const [, generation] = id.split("-");
    const boardId = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.getCurrentBoardId();
    if (!setup || generation !== setup.generation || frame.width !== setup.width || frame.height !== setup.height ||
        (boardId && boardId !== setup.id)) await register(frame, generation, signal);
    const readings = await readModels(generation, signal);
    signal.throwIfAborted();
    const view = {
      objects: readings.flatMap(reading => reading.overlay.objects),
      classes: [...new Set(readings.flatMap(reading => reading.overlay.classes))],
      delayed: readings.some(reading => reading.overlay.delayed),
    };
    const beads = detectTrackBeads(frame, setup.beads);
    const hits = setup.geometry && setup.fireEffect && !view.classes.includes("fire")
      ? detectFireTokens(setup.cv, frame, setup.geometry) : null;
    const fallback = hits ? setup.fire.observe(frame, hits, id, Number(id.split("-")[0]))
      .filter(item => item.active || item.state === "removed") : [];
    const native = setup.native.observe({ frameId: id, ...beads, classes: ["track-marker"], coverage: [0, 0, 1, 1] });
    const checked = await Promise.all(readings.map(async ({ modelId, model }) => {
      if (!model) return null;
      const reading = await checkCameraReading(model, setup, signal, frame, id);
      if (modelId) setup.bindings.observe(modelId, reading);
      return reading;
    }));
    signal.throwIfAborted();
    const checkedModel = checked.find(Boolean);
    const trained = checkedModel ? setup.trained.observe(checkedModel) : setup.trained.snapshot();
    const linked = setup.bindings.snapshots();
    const proposed = native.effects.concat(linked, trained.effects.filter(item =>
      !linked.some(binding => binding.roomId === item.roomId && binding.effect.id === item.effect.id)));
    renderReadings(native, proposed, fallback, view);

    const seenSlots = native.tracks.map(reading => {
      const previous = setup.beads.find(slot => slot.track === reading.kind && slot.value === reading.value);
      return previous ?? beads.objects.find(item => item.track === reading.kind);
    }).filter(Boolean);
    const markerBoxes = seenSlots.map(({ track, value, box }) => ({
      kind: track, box, label: `${track === "round" ? "Round" : "Self-destruct"} ${value}`, color: "#7ee6ff",
    }));
    const fireBoxes = fallback.filter(item => item.active).map(({ room, state, box: { x, y, w, h } }) => ({
      kind: "fire", box: [x / frame.width, y / frame.height, w / frame.width, h / frame.height],
      label: `${state === "visible" ? "Local fire check" : "Last seen fire"} · ${room.name}`,
      color: state === "visible" ? "#ffc359" : "#8be2ff",
    }));
    const modelBoxes = view.objects
      .filter(item => item.kind !== "track-marker" || !setup.beads.length)
      .map(({ kind, confidence, box, contours }) => ({ kind, box, label: `${kind} ${Math.round(confidence * 100)}%`,
        color: "#7be4b5", contours }));
    const boxes = [...markerBoxes, ...fireBoxes, ...modelBoxes];
    return boxes.filter(box => !hiddenKinds.has(box.kind));
  }

  return { reset, observe, unavailable };
}
