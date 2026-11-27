import { loadOpenCV, readBitmap, readImage } from "../calibration/calibration-images.js";
import { registerBoard } from "../calibration/calibration-math.js";
import { checkTrainedFireShapes, firePositionIsOverexposed, makeFireGeometry } from "./fire-observer.js";
import { isClassicNemesisBoard } from "./game-observer.js";

export async function readCameraBitmap(id, signal) {
  const response = await fetch("/api/camera/latest.jpg?" + new URLSearchParams({ frameId: id }), {
    cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(1800)]),
  });
  return response.ok ? createImageBitmap(await response.blob()) : null;
}

export async function readBoardObjects(signal, modelId) {
  const query = modelId ? "?" + new URLSearchParams({ modelId }) : "";
  const response = await fetch("/api/camera/board-objects" + query, {
    cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(1400)]),
  });
  return response.status === 200 ? response.json() : null;
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
  const checksFire = setup.geometry && model.classes.includes("fire");
  const checksVisibility = setup.bindings.needsVisibility(modelId);
  if (!checksFire && !checksVisibility) return model;
  const cached = setup.checkedModels.get(modelId);
  if (cached?.frameId === model.frameId) return cached;

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
  const checked = frame?.width === setup.width && frame.height === setup.height
    ? { ...(checksFire ? checkTrainedFireShapes(frame, setup.geometry, model) : model),
      fireOverexposed: box => firePositionIsOverexposed(frame, box) }
    : { ...model, classes: checksVisibility ? [] : model.classes.filter(kind => kind !== "fire"),
      objects: checksVisibility ? [] : model.objects.filter(item => item.kind !== "fire") };
  setup.checkedModels.set(modelId, checked);
  if (setup.checkedModels.size > 2) setup.checkedModels.delete(setup.checkedModels.keys().next().value);
  return checked;
}
