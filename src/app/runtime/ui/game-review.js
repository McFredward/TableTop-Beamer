import { loadOpenCV, readBitmap, readImage } from "../calibration/calibration-images.js";
import { registerBoard } from "../calibration/calibration-math.js";
import { createFireTracker, detectFireTokens, makeFireGeometry } from "../vision/fire-observer.js";
import { createGameObserver, makeGameLayout } from "../vision/game-observer.js";
import { detectTrackBeads, prepareTrackBeads } from "../vision/track-beads.js";

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

  async function observe(bitmap, id, context, signal) {
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
    const objects = detectTrackBeads(frame, setup.beads);
    const fallback = setup.geometry && setup.fireEffect && !model?.classes.includes("fire")
      ? setup.fire.observe(frame, detectFireTokens(setup.cv, frame, setup.geometry), id, Number(id.split("-")[0]))
      : [];
    const native = setup.native.observe({ frameId: id, objects, classes: ["track-marker"], coverage: [0, 0, 1, 1] });
    const trained = model ? setup.trained.observe(model) : null;
    const proposed = native.effects.concat(trained?.effects ?? []);
    render(tracks, native.tracks.map(track => {
      const label = track.kind === "round" ? "Round" : "Self-destruct";
      return `${label} ${track.value ?? "—"} · ${track.status}`;
    }), setup.beads.length ? "Looking for the transparent track counters…" : "Track slots are mapped on Nemesis Board A.");
    render(effects, proposed.map(item =>
      `${item.zone} · ${item.effect.name} ${item.active ? "on" : "off"} · ${item.status}${item.kind === "alien" ? ` (${item.count} seen)` : ""}`)
      .concat(fallback.map(item => `${item.room.name} · ${item.proposal} · ${item.state}`)),
    "Waiting for confirmed positions.");
    render(source, model ? [`Trained classes: ${model.classes.join(", ")}`] : [],
      "Local prototype checks Fire and track counters. Other pieces need a trained detector.");

    const width = context.canvas.width, height = context.canvas.height;
    context.save();
    context.lineWidth = Math.max(2, width / 640);
    context.strokeStyle = "#7ee6ff";
    for (const { box: [x, y, w, h] } of objects) context.strokeRect(x * width, y * height, w * width, h * height);
    context.restore();
  }

  return { reset, observe, unavailable };
}
