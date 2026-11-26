import {
  DOT_BITS, projectorDots, registerBoard, registerProjector, localContrast,
  detectDots, measureGrid, refineProjectionGrid, normalizeGrid,
} from "./calibration-math.js";
import { refineRoomOutlines } from "./calibration-room-outlines.js";
import { edgeContacts, printedIndicators } from "./calibration-targets.js";

import { loadOpenCV, readImage } from "./calibration-images.js";

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

async function capture(id, pattern, signal, keepColor = false) {
  const { step } = await jsonRequest("/api/calibration", { action: "pattern", id, ...pattern }, signal);
  const timeout = AbortSignal.timeout(9500);
  const combined = AbortSignal.any([signal, timeout]);
  while (!combined.aborted) {
    const response = await fetch("/api/calibration?" + new URLSearchParams({ id, step }), {
      cache: "no-store", signal: combined,
    });
    if (response.status === 200) {
      const blob = await response.blob();
      return {
        gray: await readImage(blob, keepColor),
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
    const reference = await readImage(await image.blob(), true);
    const rooms = board.roomCatalog ?? [];

    progress("Finding the printed board in the camera image…");
    const unlit = await capture(session.id, { points: [] }, signal, true);
    const registeredBoard = registerBoard(cv, reference, unlit.gray, edgeContacts(rooms));
    const nearBoard = point => registeredBoard.contains(point, 6);
    const indicators = printedIndicators(rooms, registeredBoard, reference, unlit.gray);
    const dark = localContrast(cv, unlit.gray);
    const lit = localContrast(cv, (await capture(session.id, { points: projectorDots }, signal)).gray);
    const bits = [];
    for (let bit = 0; bit < DOT_BITS; bit++) {
      progress(`Measuring the projector · pattern ${bit + 1} of ${DOT_BITS}`);
      const pattern = projectorDots.filter(dot => dot.id & (1 << bit));
      bits.push(localContrast(cv, (await capture(session.id, { points: pattern }, signal)).gray));
    }

    const registeredProjector = registerProjector(cv, registeredBoard, dark, lit, bits, unlit.size);
    const measured = await refineProjectionGrid({
      board: registeredBoard,
      projector: registeredProjector,
      size: unlit.size,
      rooms,
      async verify(probes, { level, pass, index, groups }) {
        progress(`Refining the ${level} × ${level} grid · pass ${pass} · pattern ${index + 1} of ${groups}`);
        const points = probes.map(({ projector }) => ({
          x: projector.x / unlit.size.width, y: projector.y / unlit.size.height,
        }));
        const photo = await capture(session.id, { points }, signal);
        const dots = detectDots(cv, dark, localContrast(cv, photo.gray), nearBoard);
        return measureGrid(probes, dots, registeredProjector);
      },
    });
    const refined = await refineRoomOutlines({
      measured, board: registeredBoard, projector: registeredProjector, reference, dark: unlit.gray,
      rooms, indicators, size: unlit.size,
      async capture(paths, pass) {
        progress(pass === 1 ? "Checking projected room outlines against the printed board…"
          : "Verifying the room outline correction…");
        return (await capture(session.id, { paths }, signal)).gray;
      },
      async captureIndicators(points) {
        progress("Measuring the small printed indicators…");
        const photo = await capture(session.id, { points }, signal);
        return detectDots(cv, dark, localContrast(cv, photo.gray), nearBoard);
      },
    });
    signal.throwIfAborted();
    progress("Applying the verified calibration…");
    const grid = normalizeGrid(refined.grid, unlit.size);
    const { profileId } = await jsonRequest("/api/calibration", { action: "apply", id: session.id, grid });
    const profiles = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE;
    if (profiles?.getCurrentBoardId() === session.boardId) {
      profiles.applyAndCaptureSnapshot(grid, profileId, { broadcast: false, remember: true });
    }
    return { profileId, grid, error: measured.error, verified: measured.matches.length,
      outline: refined.outline, indicators: refined.indicators };
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
      const dots = `${result.verified} points checked · ${result.error.toFixed(1)} px at P90`;
      const outlines = result.outline ? ` · ${result.outline.count} outline samples · ${result.outline.error.toFixed(1)} px at P90` : "";
      const marks = result.indicators ? ` · ${result.indicators.count} printed indicators · ${result.indicators.error.toFixed(1)} px at P90` : "";
      status.textContent = `${result.profileId} active · ${result.grid.srcXs.length} × ${result.grid.srcYs.length} grid · ${dots}${outlines}${marks}.`;
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
