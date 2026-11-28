import { loadOpenCV, readBitmap, readImage } from "../calibration/calibration-images.js";
import { registerBoard } from "../calibration/calibration-math.js";
import { checkTrainedFireShapes, detectFireTokens, firePositionIsOverexposed, makeFireGeometry,
  malfunctionPositionIsOverexposed } from "./fire-observer.js";
import { isClassicNemesisBoard } from "./game-observer.js";

export async function readCameraBitmap(id, signal) {
  const response = await fetch("/api/camera/latest.jpg?" + new URLSearchParams({ frameId: id }), {
    cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(1800)]),
  });
  return response.ok ? createImageBitmap(await response.blob()) : null;
}

export async function readBoardObjects(signal, modelId, { preview = false } = {}) {
  const query = new URLSearchParams();
  if (modelId) query.set("modelId", modelId);
  if (preview) query.set("preview", "1");
  const response = await fetch("/api/camera/board-objects" + (query.size ? "?" + query : ""), {
    cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(1400)]),
  });
  return response.status === 200 ? response.json() : null;
}

export function filterCameraObjects(model, { registration, width, height }) {
  if (!registration) return model;
  const inside = ([x, y]) => registration.contains({ x: x * width, y: y * height });
  const objects = model.objects.filter(item => inside(item.anchor)).map(item => {
    if (!item.reclassifiedFrom) return item;
    const { kind, box: [x, y, w, h] } = item.reclassifiedFrom;
    const anchor = [x + w / 2, y + h * (kind === "alien" || kind === "character" ? 0.92 : 0.5)];
    if (inside(anchor)) return item;
    const { reclassifiedFrom, ...filtered } = item;
    return filtered;
  });
  return { ...model, objects };
}

export async function registerCameraBoard(board, frame, signal) {
  if (!board?.metadata?.imageSrc) throw new Error("Select a board with a reference image first.");
  const url = new URL(board.metadata.imageSrc, location.origin);
  if (url.origin !== location.origin) throw new Error("The board artwork must be stored in TT-Beamer.");
  const [{ cv }, response] = await Promise.all([loadOpenCV(), fetch(url, {
    cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(6500)]),
  })]);
  if (!response.ok) throw new Error("The board reference artwork is unavailable.");
  const classic = isClassicNemesisBoard(board.boardId);
  const reference = await readImage(await response.blob(), classic);
  signal.throwIfAborted();
  const registration = registerBoard(cv, reference, frame);
  const geometry = classic ? makeFireGeometry(registration, board.roomCatalog, frame.width, frame.height, reference) : null;
  return { cv, reference, registration, geometry, width: frame.width, height: frame.height };
}

export async function checkCameraReading(model, setup, signal, currentFrame, currentId) {
  const modelId = model.modelId ?? "default";
  const cached = setup.checkedModels.get(modelId);
  if (cached?.frameId === model.frameId) return cached;
  model = filterCameraObjects(model, setup);
  const checksFire = setup.geometry && model.classes.includes("fire");
  const checksVisibility = setup.bindings.needsVisibility(modelId);
  if (!checksFire && !checksVisibility) return model;

  let frame = currentFrame;
  if (currentId !== model.frameId) {
    const bitmap = await readCameraBitmap(model.frameId, signal).catch(() => null);
    try {
      signal.throwIfAborted();
      frame = bitmap ? readBitmap(bitmap, true) : null;
    } finally {
      bitmap?.close();
    }
  }
  let localFire;
  const checked = frame && frame.width === setup.width && frame.height === setup.height
    ? { ...(checksFire ? checkTrainedFireShapes(frame, setup.geometry, model) : model),
      fireOverexposed: box => firePositionIsOverexposed(frame, box),
      ...(checksVisibility && { malfunctionOverexposed: box => malfunctionPositionIsOverexposed(frame, box) }),
      ...(checksFire && setup.cv && { confirmFire: ([x, y, w, h]) => {
        localFire ??= detectFireTokens(setup.cv, frame, setup.geometry);
        return [...localFire.values()].some(({ box }) => {
          const cx = (box.x + box.w / 2) / frame.width, cy = (box.y + box.h / 2) / frame.height;
          return cx >= x && cx <= x + w && cy >= y && cy <= y + h;
        });
      } }) }
    : { ...model, verificationUnavailable: true,
      ...(checksFire && { classes: model.classes.filter(kind => kind !== "fire"),
        objects: model.objects.filter(item => item.kind !== "fire") }) };
  setup.checkedModels.set(modelId, checked);
  if (setup.checkedModels.size > 2) setup.checkedModels.delete(setup.checkedModels.keys().next().value);
  return checked;
}
