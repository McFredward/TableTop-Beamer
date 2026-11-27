import { loadOpenCV, readBitmap, readImage } from "../calibration/calibration-images.js";
import { registerBoard } from "../calibration/calibration-math.js";
import { checkTrainedFireShapes, createFireTracker, detectFireTokens, firePositionIsOverexposed, makeFireGeometry } from "../vision/fire-observer.js";
import { createGameObserver, isClassicNemesisBoard, makeGameLayout } from "../vision/game-observer.js";
import { detectTrackBeads, prepareTrackBeads } from "../vision/track-beads.js";
import { createAnimationCameraBindings } from "../vision/animation-camera-bindings.js";

function paintBoxes(context, boxes) {
  const { width, height } = context.canvas;
  const unit = width / 960;
  context.save();
  context.lineWidth = Math.max(2, unit * 1.5);
  context.font = `bold ${12 * unit}px system-ui`;
  for (const { box, label, color } of boxes) {
    const [x, y, w, h] = box.map((value, i) => value * (i % 2 === 0 ? width : height));
    const textX = Math.min(x, width - context.measureText(label).width - 6 * unit);
    const textY = Math.max(17 * unit, y - 2 * unit);
    context.strokeStyle = color;
    context.strokeRect(x, y, w, h);
    context.fillStyle = "#10151e";
    context.fillRect(textX, textY - 14 * unit, context.measureText(label).width + 6 * unit, 16 * unit);
    context.fillStyle = color;
    context.fillText(label, textX + 3 * unit, textY - 2 * unit);
  }
  context.restore();
}

export function createGameReview(getSourceFrame) {
  const panel = document.getElementById("game-review");
  const tracks = document.getElementById("game-review-tracks");
  const effects = document.getElementById("game-review-effects");
  const source = document.getElementById("game-review-source");
  let setup;

  function reset(visible) {
    panel.hidden = !visible;
    setup = null;
    tracks.textContent = "";
    effects.textContent = "";
    source.textContent = visible ? "Locating the printed board…" : "";
  }

  function unavailable(message) {
    source.textContent = message;
  }

  async function register(frame, generation, signal) {
    const init = { cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(6500)]) };
    const [live, catalog, { cv }] = await Promise.all([
      fetch("/api/live/snapshot", init).then(response => response.json()),
      fetch("/api/boards", init).then(response => response.json()),
      loadOpenCV(),
    ]);
    const id = live.session?.snapshot?.selectedBoard;
    const board = catalog.boards.find(candidate => candidate.boardId === id);
    if (!board?.metadata?.imageSrc) throw new Error("Select a board with a reference image first.");
    const url = new URL(board.metadata.imageSrc, location.origin);
    if (url.origin !== location.origin) throw new Error("The board artwork must be stored in TT-Beamer.");
    const response = await fetch(url, init);
    if (!response.ok) throw new Error("The board reference artwork is unavailable.");
    const classic = isClassicNemesisBoard(id);
    const reference = await readImage(await response.blob(), classic);
    signal.throwIfAborted();
    const registration = registerBoard(cv, reference, frame);
    const layout = makeGameLayout(board, registration, frame.width, frame.height);
    setup = {
      id, generation, width: frame.width, height: frame.height, cv,
      geometry: classic ? makeFireGeometry(registration, board.roomCatalog, frame.width, frame.height, reference) : null,
      beads: prepareTrackBeads(layout.slots, registration, reference, frame),
      native: createGameObserver(layout), trained: createGameObserver({ ...layout, slots: [] }),
      fire: createFireTracker(), fireEffect: layout.effects.fire,
      bindings: createAnimationCameraBindings(board, registration, frame.width, frame.height),
      checkedModels: new Map(),
    };
  }

  function render(element, lines, fallback) {
    const value = lines.join(" / ") || fallback;
    if (element.textContent !== value) element.textContent = value;
  }

  async function modelForObservation(model, frame, id, signal) {
    const current = setup;
    const modelId = model.modelId ?? "default";
    const needsFireChecks = current.geometry && model.classes.includes("fire");
    const needsVisibility = current.bindings.needsVisibility(modelId);
    if (!needsFireChecks && !needsVisibility) return model;
    const cached = current.checkedModels.get(modelId);
    if (cached?.frameId === model.frameId) return cached;

    let matchingFrame = frame;
    if (id !== model.frameId) {
      const bitmap = await getSourceFrame(model.frameId, signal).catch(() => null);
      try {
        signal.throwIfAborted();
        matchingFrame = bitmap ? readBitmap(bitmap, true) : null;
      } finally {
        bitmap?.close();
      }
    }
    const checked = matchingFrame?.width === current.width && matchingFrame.height === current.height
      ? { ...(needsFireChecks ? checkTrainedFireShapes(matchingFrame, current.geometry, model) : model),
        fireOverexposed: box => firePositionIsOverexposed(matchingFrame, box) }
      // With no paired source image, hold state for bindings that verify visibility.
      : { ...model, classes: needsVisibility ? [] : model.classes.filter(kind => kind !== "fire"),
        objects: needsVisibility ? [] : model.objects.filter(item => item.kind !== "fire") };
    current.checkedModels.set(modelId, checked);
    if (current.checkedModels.size > 2) current.checkedModels.delete(current.checkedModels.keys().next().value);
    return checked;
  }

  async function readModel(signal, modelId) {
    const query = modelId ? "?" + new URLSearchParams({ modelId }) : "";
    const response = await fetch("/api/camera/board-objects" + query, {
      cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(1400)]),
    });
    return response.status === 200 ? response.json() : null;
  }

  async function observeBindings(model, frame, id, generation, signal) {
    const current = setup;
    return (await Promise.all(current.bindings.modelIds.map(async modelId => {
      const feed = model && (model.modelId ?? "default") === modelId ? model : await readModel(signal, modelId).catch(() => null);
      if (feed?.frameId.split("-")[1] !== generation) return [];
      const reading = await modelForObservation(feed, frame, id, signal);
      const { actions, effects } = current.bindings.observe(modelId, reading);
      for (const action of actions) {
        void fetch("/api/camera/animation", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...action, boardId: current.id, modelId, frameId: reading.frameId }),
          signal: AbortSignal.any([signal, AbortSignal.timeout(3500)]),
        }).catch(() => {});
      }
      return effects;
    }))).flat();
  }

  async function observe(bitmap, id, context, signal, { annotated = false } = {}) {
    const frame = readBitmap(bitmap, true);
    const [, generation] = id.split("-");
    const boardId = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.getCurrentBoardId();
    if (!setup || generation !== setup.generation || frame.width !== setup.width || frame.height !== setup.height ||
        (boardId && boardId !== setup.id)) await register(frame, generation, signal);
    const candidate = await readModel(signal);
    signal.throwIfAborted();
    const model = candidate?.frameId.split("-")[1] === generation ? candidate : null;
    const beads = detectTrackBeads(frame, setup.beads);
    const hits = setup.geometry && setup.fireEffect && !model?.classes.includes("fire")
      ? detectFireTokens(setup.cv, frame, setup.geometry) : null;
    const fallback = hits ? setup.fire.observe(frame, hits, id, Number(id.split("-")[0]))
      .filter(item => item.active || item.state === "removed") : [];
    const native = setup.native.observe({ frameId: id, ...beads, classes: ["track-marker"], coverage: [0, 0, 1, 1] });
    const checkedModel = model ? await modelForObservation(model, frame, id, signal) : null;
    signal.throwIfAborted();
    const trained = checkedModel ? setup.trained.observe(checkedModel) : null;
    const linked = await observeBindings(model, frame, id, generation, signal);
    signal.throwIfAborted();
    const proposed = native.effects.concat(linked, (trained?.effects ?? []).filter(item =>
      !linked.some(binding => binding.roomId === item.roomId && binding.effect.id === item.effect.id)));
    render(tracks, native.tracks.map(track => {
      const label = track.kind === "round" ? "Round" : "Self-destruct";
      return track.status === "inactive" ? `${label} · inactive`
        : `${label} ${track.value ?? "—"} · ${track.status}`;
    }), setup.beads.length ? "Looking for the transparent track counters…" : "Track slots are mapped on Nemesis Board A and B.");
    render(effects, proposed.map(item =>
      `${item.zone} · ${item.effect.name} ${item.active ? "on" : "off"} · ${item.status}${item.kind === "alien" ? ` (${item.count} seen)` : ""}`)
      .concat(fallback.map(item => `${item.room.name} · ${item.proposal} · ${item.state}`)),
    "Waiting for confirmed positions.");
    render(source, model ? [`Trained classes: ${model.classes.join(", ")}`] : [],
      "Local prototype checks Fire and track counters. Other pieces need a trained detector.");

    const markerBoxes = beads.objects.map(({ track, value, box }) => ({
      box, label: `${track === "round" ? "Round" : "Self-destruct"} ${value}`, color: "#7ee6ff",
    }));
    const fireBoxes = fallback.filter(item => item.active).map(({ room, state, box: { x, y, w, h } }) => ({
      box: [x / frame.width, y / frame.height, w / frame.width, h / frame.height],
      label: `${state === "visible" ? "Fire" : "Last seen fire"} · ${room.name}`,
      color: state === "visible" ? "#ffc359" : "#8be2ff",
    }));
    const modelBoxes = !annotated && model?.frameId === id ? model.objects
      .filter(item => item.kind !== "track-marker" || !setup.beads.length)
      .map(({ kind, confidence, box }) => ({ box, label: `${kind} ${Math.round(confidence * 100)}%`, color: "#7be4b5" })) : [];
    paintBoxes(context, [...markerBoxes, ...fireBoxes, ...modelBoxes]);
  }

  return { reset, observe, unavailable };
}
