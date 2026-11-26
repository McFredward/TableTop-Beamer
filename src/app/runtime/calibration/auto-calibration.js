import {
  DOT_BITS, projectorDots, registerBoard, registerProjector, localContrast,
  detectDots, measureGrid, refineProjectionGrid, normalizeGrid,
} from "./calibration-math.js";

let cvReady;

function loadOpenCV() {
  if (!cvReady) {
    cvReady = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timer = setTimeout(() => reject(new Error("OpenCV did not load.")), 15000);
      script.src = "/vendor/calibration-opencv.js";
      script.onerror = () => {
        clearTimeout(timer);
        reject(new Error("OpenCV is unavailable. Restart TT-Beamer with its current dependencies."));
      };
      script.onload = () => {
        const instance = window.cv;
        const ready = () => {
          clearTimeout(timer);
          resolve({ cv: instance });
        };
        if (!instance) {
          clearTimeout(timer);
          reject(new Error("OpenCV is unavailable."));
        } else if (instance.Mat) ready();
        else instance.onRuntimeInitialized = ready;
      };
      document.head.append(script);
    }).catch(error => { cvReady = undefined; throw error; });
  }
  return cvReady;
}

async function jsonRequest(path, body, signal) {
  const deadline = AbortSignal.timeout(5000);
  const response = await fetch(path, {
    cache: "no-store", signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
    ...(body && { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Calibration request failed.");
  return result;
}

async function grayscale(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const width = Math.min(1920, bitmap.width);
    const height = Math.round(bitmap.height * width / bitmap.width);
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, width, height);
    const rgba = context.getImageData(0, 0, width, height).data;
    const pixels = new Uint8Array(width * height);
    for (let i = 0, j = 0; i < pixels.length; i++, j += 4) {
      pixels[i] = (77 * rgba[j] + 150 * rgba[j+1] + 29 * rgba[j+2]) >> 8;
    }
    return { width, height, pixels };
  } finally {
    bitmap.close();
  }
}

async function capture(id, points, signal) {
  const { step } = await jsonRequest("/api/calibration", { action: "pattern", id, points }, signal);
  const timeout = AbortSignal.timeout(9500);
  const combined = AbortSignal.any([signal, timeout]);
  while (!combined.aborted) {
    const response = await fetch("/api/calibration?" + new URLSearchParams({ id, step }), {
      cache: "no-store", signal: combined,
    });
    if (response.status === 200) {
      const blob = await response.blob();
      return {
        gray: await grayscale(blob),
        size: { width: Number(response.headers.get("X-Projector-Width")), height: Number(response.headers.get("X-Projector-Height")) },
      };
    }
    if (response.status !== 204) {
      const { error } = await response.json();
      throw new Error(error || "Camera measurement failed.");
    }
    await new Promise(resolve => setTimeout(resolve, 220));
  }
  throw new Error("The projector did not confirm a fresh camera image. Keep its Output window in the foreground.");
}

async function runCalibration(signal, progress) {
  progress("Checking the projector and camera…");
  signal.throwIfAborted();
  const session = await jsonRequest("/api/calibration", { action: "start" });
  try {
    signal.throwIfAborted();
    progress("Loading the board and calibration tools…");
    const [{ cv }, catalog] = await Promise.all([loadOpenCV(), jsonRequest("/api/boards", null, signal)]);
    signal.throwIfAborted();
    const board = catalog.boards.find(board => board.boardId === session.boardId);
    if (!board?.metadata?.imageSrc) throw new Error("The selected board needs a reference image.");
    const url = new URL(board.metadata.imageSrc, location.origin);
    if (url.origin !== location.origin) throw new Error("Import the board reference image into TT-Beamer first.");
    const image = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]) });
    if (!image.ok) throw new Error("The selected board's reference image is unavailable.");
    const reference = await grayscale(await image.blob());

    progress("Finding the printed board in the camera image…");
    const unlit = await capture(session.id, [], signal);
    const registeredBoard = registerBoard(cv, reference, unlit.gray);
    const dark = localContrast(cv, unlit.gray);
    const lit = localContrast(cv, (await capture(session.id, projectorDots, signal)).gray);
    const bits = [];
    for (let bit = 0; bit < DOT_BITS; bit++) {
      progress(`Measuring the projector · pattern ${bit + 1} of ${DOT_BITS}`);
      const pattern = projectorDots.filter(dot => dot.id & (1 << bit));
      bits.push(localContrast(cv, (await capture(session.id, pattern, signal)).gray));
    }

    const registeredProjector = registerProjector(cv, registeredBoard, dark, lit, bits, unlit.size);
    const measured = await refineProjectionGrid({
      board: registeredBoard,
      projector: registeredProjector,
      size: unlit.size,
      rooms: board.roomCatalog ?? [],
      async verify(probes, { level, pass, index, groups }) {
        progress(`Refining the ${level} × ${level} grid · pass ${pass} · pattern ${index + 1} of ${groups}`);
        const photo = await capture(session.id, probes.map(({ projector }) => ({
          x: projector.x / unlit.size.width, y: projector.y / unlit.size.height,
        })), signal);
        const dots = detectDots(cv, dark, localContrast(cv, photo.gray));
        return measureGrid(probes, dots, registeredProjector);
      },
    });
    signal.throwIfAborted();
    progress("Applying the verified calibration…");
    const grid = normalizeGrid(measured.grid, unlit.size);
    const { profileId } = await jsonRequest("/api/calibration", { action: "apply", id: session.id, grid });
    const profiles = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE;
    if (profiles?.getCurrentBoardId() === session.boardId) {
      profiles.applyAndCaptureSnapshot(grid, profileId, { broadcast: false, remember: true });
    }
    return { profileId, grid, error: measured.error, verified: measured.matches.length };
  } finally {
    await jsonRequest("/api/calibration", { action: "stop", id: session.id }).catch(() => {});
  }
}

export function bindAutoCalibration({ dialog, pausePreview, resumePreview }) {
  const start = document.getElementById("auto-calibration-start");
  const cancel = document.getElementById("auto-calibration-cancel");
  const status = document.getElementById("auto-calibration-status");
  let controller;

  start.addEventListener("click", async () => {
    pausePreview();
    const operation = new AbortController();
    controller = operation;
    start.disabled = true;
    cancel.hidden = false;
    try {
      const result = await runCalibration(operation.signal, message => {
        status.textContent = message;
      });
      status.textContent = `${result.profileId} active · ${result.grid.srcXs.length} × ${result.grid.srcYs.length} grid · ${result.verified} verified points · ${result.error.toFixed(1)} px error at the 90th percentile.`;
    } catch (error) {
      status.textContent = operation.signal.aborted ? "Calibration cancelled." : error.message;
    } finally {
      start.disabled = false;
      cancel.hidden = true;
      controller = null;
      if (dialog.open) resumePreview();
    }
  });
  cancel.addEventListener("click", () => controller?.abort());
  dialog.addEventListener("close", () => controller?.abort());
}
