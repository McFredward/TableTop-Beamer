import { readBitmap } from "../calibration/calibration-images.js";
import { createFireTracker, detectFireTokens } from "../vision/fire-observer.js";
import { createGameObserver, makeGameLayout } from "../vision/game-observer.js";
import { detectTrackBeads, prepareTrackBeads } from "../vision/track-beads.js";
import { createAnimationCameraBindings } from "../vision/animation-camera-bindings.js";
import { checkCameraReading, readBoardObjects, registerCameraBoard } from "../vision/camera-board-readings.js";
import { createGameDetectionOverlay } from "./game-detection-overlay.js";

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

export function paintBoxes(context, boxes) {
  const { width, height } = context.canvas;
  const unit = width / 960;
  context.save();
  context.lineWidth = Math.max(2, unit * 1.5);
  context.font = `bold ${12 * unit}px system-ui`;
  for (const { box, label, color, held } of boxes) {
    const [x, y, w, h] = box.map((value, i) => value * (i % 2 === 0 ? width : height));
    const textX = Math.min(x, width - context.measureText(label).width - 6 * unit);
    const textY = Math.max(17 * unit, y - 2 * unit);
    context.strokeStyle = color;
    context.setLineDash(held ? [5 * unit, 4 * unit] : []);
    context.strokeRect(x, y, w, h);
    context.fillStyle = "#10151e";
    context.fillRect(textX, textY - 14 * unit, context.measureText(label).width + 6 * unit, 16 * unit);
    context.fillStyle = color;
    context.fillText(label, textX + 3 * unit, textY - 2 * unit);
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
  let setup;

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
      cv, geometry, width, height, id, generation,
      beads: prepareTrackBeads(layout.slots, registration, reference, frame),
      native: createGameObserver(layout), trained: createGameObserver({ ...layout, slots: [] }),
      fire: createFireTracker(), fireEffect: layout.effects.fire,
      bindings: createAnimationCameraBindings(board, registration, frame.width, frame.height),
      overlay: createGameDetectionOverlay(),
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

    const label = view.delayed ? "Showing last model frame" : view.classes.length ? "Trained model live" : "Local image checks";
    if (source.textContent !== label) source.textContent = label;
    source.dataset.state = view.classes.length && !view.delayed ? "live" : "waiting";
    const detail = view.classes.length ? view.classes.join(" · ")
      : setup.beads.length || setup.fireEffect ? "Fire and counters are available while the trained model is offline."
        : "Waiting for a trained model.";
    if (sourceClasses.textContent !== detail) sourceClasses.textContent = detail;
  }

  async function observeBindings(model, frame, id, generation, signal) {
    const current = setup;
    await Promise.all(current.bindings.modelIds.map(async modelId => {
      const feed = model && (model.modelId ?? "default") === modelId ? model : await readBoardObjects(signal, modelId).catch(() => null);
      if (feed?.frameId.split("-")[1] !== generation) return;
      const reading = await checkCameraReading(feed, current, signal, frame, id);
      current.bindings.observe(modelId, reading);
    }));
    return current.bindings.snapshots();
  }

  async function observe(bitmap, id, signal, { annotated = false } = {}) {
    const frame = readBitmap(bitmap, true);
    const [, generation] = id.split("-");
    const boardId = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.getCurrentBoardId();
    if (!setup || generation !== setup.generation || frame.width !== setup.width || frame.height !== setup.height ||
        (boardId && boardId !== setup.id)) await register(frame, generation, signal);
    const candidate = await readBoardObjects(signal).catch(() => null);
    signal.throwIfAborted();
    const model = candidate?.frameId.split("-")[1] === generation ? candidate : null;
    const view = setup.overlay(model);
    const beads = detectTrackBeads(frame, setup.beads);
    const hits = setup.geometry && setup.fireEffect && !view.classes.includes("fire")
      ? detectFireTokens(setup.cv, frame, setup.geometry) : null;
    const fallback = hits ? setup.fire.observe(frame, hits, id, Number(id.split("-")[0]))
      .filter(item => item.active || item.state === "removed") : [];
    const native = setup.native.observe({ frameId: id, ...beads, classes: ["track-marker"], coverage: [0, 0, 1, 1] });
    const checkedModel = model ? await checkCameraReading(model, setup, signal, frame, id) : null;
    signal.throwIfAborted();
    const trained = checkedModel ? setup.trained.observe(checkedModel) : setup.trained.snapshot();
    const linked = await observeBindings(model, frame, id, generation, signal);
    signal.throwIfAborted();
    const proposed = native.effects.concat(linked, trained.effects.filter(item =>
      !linked.some(binding => binding.roomId === item.roomId && binding.effect.id === item.effect.id)));
    if (!panel.hidden) renderReadings(native, proposed, fallback, view);

    const seenSlots = native.tracks.map(reading => {
      const previous = setup.beads.find(slot => slot.track === reading.kind && slot.value === reading.value);
      return previous ?? beads.objects.find(item => item.track === reading.kind);
    }).filter(Boolean);
    const markerBoxes = seenSlots.map(({ track, value, box }) => ({
      box, label: `${track === "round" ? "Round" : "Self-destruct"} ${value}`, color: "#7ee6ff",
    }));
    const fireBoxes = fallback.filter(item => item.active).map(({ room, state, box: { x, y, w, h } }) => ({
      box: [x / frame.width, y / frame.height, w / frame.width, h / frame.height],
      label: `${state === "visible" ? "Local fire check" : "Last seen fire"} · ${room.name}`,
      color: state === "visible" ? "#ffc359" : "#8be2ff",
    }));
    const modelBoxes = !annotated ? view.objects
      .filter(item => item.kind !== "track-marker" || !setup.beads.length)
      .map(({ kind, confidence, box, held }) => ({ box, label: held ? `${kind} · last seen` : `${kind} ${Math.round(confidence * 100)}%`,
        color: "#7be4b5", held })) : [];
    return [...markerBoxes, ...fireBoxes, ...modelBoxes];
  }

  return { reset, observe, unavailable };
}
