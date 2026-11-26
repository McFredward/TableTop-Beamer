import {
  DOT_BITS, projectorDots, registerBoard, registerProjector, localContrast,
  detectDots, initialGrid, gridProbes, measureGrid, updateGrid, normalizeGrid,
} from "./calibration-math.js";

const MAX_ITERATIONS = 4;
const TARGET_ERROR = 3.5;
const MAX_VERIFIED_ERROR = 8;
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
        blob, gray: await grayscale(blob),
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
    let grid = initialGrid(registeredBoard, registeredProjector);
    let best;
    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
      normalizeGrid(grid, unlit.size);
      progress(`Checking corners and room positions · pass ${iteration}`);
      const probes = gridProbes(grid, registeredBoard);
      const photo = await capture(session.id, probes.map(({ projector }) => ({
        x: projector.x / unlit.size.width, y: projector.y / unlit.size.height,
      })), signal);
      const dots = detectDots(cv, dark, localContrast(cv, photo.gray));
      let measurement;
      try {
        measurement = measureGrid(probes, dots, registeredProjector);
      } catch (error) {
        if (best?.measurement.error <= MAX_VERIFIED_ERROR) break;
        throw error;
      }
      if (best && measurement.error >= best.measurement.error - 0.35) break;
      best = { grid, photo, measurement, iteration };
      if (measurement.error <= TARGET_ERROR) break;
      grid = updateGrid(grid, measurement);
    }
    if (!best || best.measurement.error > MAX_VERIFIED_ERROR) {
      throw new Error("Calibration could not verify the room positions. Check that the board is flat and fully visible.");
    }
    return {
      session, ...best,
      normalized: normalizeGrid(best.grid, unlit.size),
    };
  } finally {
    await jsonRequest("/api/calibration", { action: "stop", id: session.id }).catch(() => {});
  }
}

function drawReview(canvas, result) {
  return createImageBitmap(result.photo.blob).then(bitmap => {
    try {
      canvas.width = result.photo.gray.width;
      canvas.height = result.photo.gray.height;
      const context = canvas.getContext("2d");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#33e7ad";
      context.lineWidth = 2;
      for (const { target } of result.measurement.matches) {
        context.beginPath();
        context.arc(target.x, target.y, 10, 0, Math.PI * 2);
        context.stroke();
      }
      canvas.hidden = false;
    } finally {
      bitmap.close();
    }
  });
}

export function bindAutoCalibration({ dialog, pausePreview, resumePreview }) {
  const start = document.getElementById("auto-calibration-start");
  const cancel = document.getElementById("auto-calibration-cancel");
  const apply = document.getElementById("auto-calibration-apply");
  const status = document.getElementById("auto-calibration-status");
  const preview = document.getElementById("auto-calibration-review");
  let controller;
  let candidate;

  function clearReview() {
    candidate = null;
    preview.hidden = true;
    apply.hidden = true;
  }
  start.addEventListener("click", async () => {
    clearReview();
    pausePreview();
    const operation = new AbortController();
    controller = operation;
    start.disabled = true;
    cancel.hidden = false;
    try {
      const result = await runCalibration(operation.signal, message => { status.textContent = message; });
      if (operation.signal.aborted) return;
      await drawReview(preview, result);
      if (operation.signal.aborted) { clearReview(); return; }
      candidate = result;
      apply.hidden = false;
      status.textContent = `${result.normalized.srcXs.length} × ${result.normalized.srcYs.length} grid · ${result.measurement.matches.length} verified points · ${result.measurement.error.toFixed(1)} px error at the 90th percentile.`;
    } catch (error) {
      status.textContent = operation.signal.aborted ? "Calibration cancelled." : error.message;
    } finally {
      start.disabled = false;
      cancel.hidden = !candidate;
      controller = null;
      if (!candidate && dialog.open) resumePreview();
    }
  });
  cancel.addEventListener("click", () => {
    if (controller) controller.abort();
    else {
      clearReview();
      cancel.hidden = true;
      status.textContent = "";
      resumePreview();
    }
  });
  dialog.addEventListener("close", () => {
    controller?.abort();
    clearReview();
    cancel.hidden = true;
    status.textContent = "";
  });
  apply.addEventListener("click", async () => {
    if (!candidate) return;
    apply.disabled = true;
    cancel.disabled = true;
    start.disabled = true;
    try {
      const { session, normalized } = candidate;
      const name = "Auto " + new Date().toISOString().replace(/[.:]/g, "-");
      await jsonRequest("/api/projection-profiles", { boardId: session.boardId, name, data: normalized });
      const result = await jsonRequest("/api/live/command", {
        mutationType: "align-grid-snapshot",
        payload: {
          ...normalized, profileId: name, isBaseline: true,
          calibrationAgainst: { boardId: session.boardId, gridAt: session.gridAt },
        },
      });
      if (!result.applied) throw new Error("The board or grid changed. The new calibration was saved as a separate profile.");
      clearReview();
      cancel.hidden = true;
      status.textContent = "Calibration applied and saved as " + name + ".";
      if (dialog.open) resumePreview();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      apply.disabled = false;
      cancel.disabled = false;
      start.disabled = false;
    }
  });
}
