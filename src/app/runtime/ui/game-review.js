import { loadOpenCV, readBitmap, readImage } from "../calibration/calibration-images.js";
import { registerBoard } from "../calibration/calibration-math.js";
import { createFireTracker, detectFireTokens, makeFireGeometry } from "../vision/fire-observer.js";
import { createGameObserver, makeGameLayout } from "../vision/game-observer.js";
import { detectTrackBeads, prepareTrackBeads } from "../vision/track-beads.js";

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

export function createGameReview() {
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
    if (!board?.metadata?.imageSrc || !id.startsWith("nemesis-")) throw new Error("Select a Nemesis board first.");
    const url = new URL(board.metadata.imageSrc, location.origin);
    if (url.origin !== location.origin) throw new Error("The board artwork must be stored in TT-Beamer.");
    const response = await fetch(url, init);
    if (!response.ok) throw new Error("The board reference artwork is unavailable.");
    const reference = await readImage(await response.blob());
    signal.throwIfAborted();
    const registration = registerBoard(cv, reference, frame);
    const layout = makeGameLayout(board, registration, frame.width, frame.height);
    setup = {
      id, generation, width: frame.width, height: frame.height, cv,
      geometry: id === "nemesis-board-a" ? makeFireGeometry(registration, board.roomCatalog, frame.width, frame.height) : null,
      beads: prepareTrackBeads(layout.slots, registration, reference, frame),
      native: createGameObserver(layout), trained: createGameObserver({ ...layout, slots: [] }),
      fire: createFireTracker(), fireEffect: layout.effects.fire,
    };
  }

  function render(element, lines, fallback) {
    const value = lines.join(" / ") || fallback;
    if (element.textContent !== value) element.textContent = value;
  }

  async function observe(bitmap, id, context, signal, { annotated = false } = {}) {
    const frame = readBitmap(bitmap, true);
    const [, generation] = id.split("-");
    const boardId = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.getCurrentBoardId();
    if (!setup || generation !== setup.generation || frame.width !== setup.width || frame.height !== setup.height ||
        (boardId && boardId !== setup.id)) await register(frame, generation, signal);
    const sampleModel = await fetch("/api/camera/board-objects", {
      cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(1400)]),
    });
    signal.throwIfAborted();
    const candidate = sampleModel.status === 200 ? await sampleModel.json() : null;
    signal.throwIfAborted();
    const model = candidate?.frameId.split("-")[1] === generation ? candidate : null;
    const beads = detectTrackBeads(frame, setup.beads);
    const hits = setup.geometry && setup.fireEffect && !model?.classes.includes("fire")
      ? detectFireTokens(setup.cv, frame, setup.geometry) : null;
    const fallback = hits ? setup.fire.observe(frame, hits, id, Number(id.split("-")[0])) : [];
    const native = setup.native.observe({ frameId: id, ...beads, classes: ["track-marker"], coverage: [0, 0, 1, 1] });
    const trained = model ? setup.trained.observe(model) : null;
    const proposed = native.effects.concat(trained?.effects ?? []);
    render(tracks, native.tracks.map(track => {
      const label = track.kind === "round" ? "Round" : "Self-destruct";
      return track.status === "inactive" ? `${label} · inactive`
        : `${label} ${track.value ?? "—"} · ${track.status}`;
    }), setup.beads.length ? "Looking for the transparent track counters…" : "Track slots are mapped on Nemesis Board A.");
    render(effects, proposed.map(item =>
      `${item.zone} · ${item.effect.name} ${item.active ? "on" : "off"} · ${item.status}${item.kind === "alien" ? ` (${item.count} seen)` : ""}`)
      .concat(fallback.map(item => `${item.room.name} · ${item.proposal} · ${item.state}`)),
    "Waiting for confirmed positions.");
    render(source, model ? [`Trained classes: ${model.classes.join(", ")}`] : [],
      "Local prototype checks Fire and track counters. Other pieces need a trained detector.");

    const markerBoxes = beads.objects.map(({ track, value, box }) => ({
      box, label: `${track === "round" ? "Round" : "Self-destruct"} ${value}`, color: "#7ee6ff",
    }));
    const fireBoxes = hits ? [...hits.values()].map(({ room, box: { x, y, w, h } }) => ({
      box: [x / frame.width, y / frame.height, w / frame.width, h / frame.height],
      label: `Fire · ${room.name}`, color: "#ffc359",
    })) : [];
    const modelBoxes = !annotated && model?.frameId === id ? model.objects
      .filter(item => item.kind !== "track-marker" || !setup.beads.length)
      .map(({ kind, confidence, box }) => ({ box, label: `${kind} ${Math.round(confidence * 100)}%`, color: "#7be4b5" })) : [];
    paintBoxes(context, [...markerBoxes, ...fireBoxes, ...modelBoxes]);
  }

  return { reset, observe, unavailable };
}
