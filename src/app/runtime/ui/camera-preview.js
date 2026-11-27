import { bindAutoCalibration } from "../calibration/auto-calibration.js";
import { createGameReview, paintBoxes } from "./game-review.js";
import { readCameraBitmap } from "../vision/camera-board-readings.js";

function bootCameraPreview() {
  if (location.pathname.replace(/\/$/, "") === "/ssr" || document.body.dataset.outputRole === "final-output") return;

  const trigger = document.getElementById("camera-preview-open");
  const dialog = document.getElementById("camera-preview");
  const canvas = document.getElementById("camera-preview-image");
  const context = canvas.getContext("2d", { alpha: false });
  const status = document.getElementById("camera-preview-status");
  const metrics = document.getElementById("camera-preview-metrics");
  const modeButtons = dialog.querySelectorAll("[data-camera-mode]");
  const game = createGameReview();
  let mode = "game";
  let active;

  async function getFrame(source, after, signal) {
    const path = source === "vision" ? "vision.jpg" : "latest.jpg";
    const query = after ? "?after=" + encodeURIComponent(after) : "";
    return fetch("/api/camera/" + path + query, {
      cache: "no-store",
      signal: AbortSignal.any([signal, AbortSignal.timeout(2500)]),
    });
  }

  function setStatus(message) {
    if (status.textContent !== message) status.textContent = message;
  }

  async function refresh(signal) {
    let visibleId;
    let visibleSource;
    let retryBoardAt = 0;
    while (!signal.aborted) {
      const started = performance.now();
      let delay = 200;
      try {
        let source = mode === "game" ? "raw" : mode;
        let response = await getFrame(source, visibleSource === source ? visibleId : null, signal);
        if (source === "vision" && response.status === 503) {
          source = "raw";
          response = await getFrame(source, visibleSource === source ? visibleId : null, signal);
        }
        if (signal.aborted) return;

        if (response.status === 200) {
          const blob = await response.blob();
          const id = response.headers.get("X-Camera-Frame-Id");
          const bitmap = await createImageBitmap(blob);
          let original;
          try {
            if (signal.aborted) return;
            if (source === "vision") {
              original = await readCameraBitmap(id, signal).catch(() => null);
            }
            if (signal.aborted) return;
            const camera = original ?? bitmap;
            let overlay = null;
            if (original) {
              const coverage = response.headers.get("X-Vision-Coverage");
              overlay = coverage ? coverage.split(",").map(Number)
                : Math.abs(bitmap.width / bitmap.height - camera.width / camera.height) < 0.025 ? [0, 0, 1, 1] : null;
            }
            let boxes = [];
            const selectedBoard = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.getCurrentBoardId();
            const boardOverlay = mode === "vision" && selectedBoard?.startsWith("nemesis-") &&
              (original || source === "raw") && performance.now() >= retryBoardAt;
            if (mode === "game" || boardOverlay) {
              try {
                boxes = await game.observe(camera, id, signal, { annotated: Boolean(overlay) });
              } catch (error) {
                if (signal.aborted) return;
                if (mode === "game") {
                  game.unavailable(error.message);
                  delay = 1000;
                } else {
                  retryBoardAt = performance.now() + 3000;
                }
              }
            }
            if (signal.aborted) return;
            if (canvas.width !== camera.width || canvas.height !== camera.height) {
              canvas.width = camera.width;
              canvas.height = camera.height;
            }
            // Present the image and overlays together after the asynchronous readings.
            context.drawImage(camera, 0, 0);
            if (overlay) {
              const [x, y, w, h] = overlay;
              context.drawImage(bitmap, x * camera.width, y * camera.height, w * camera.width, h * camera.height);
            }
            if (boxes.length) paintBoxes(context, boxes);
          } finally {
            original?.close();
            bitmap.close();
          }
          canvas.hidden = false;
          visibleId = id;
          visibleSource = source;
          if (source === "vision") {
            const header = (name) => response.headers.get("X-Vision-" + name);
            const weights = header("Weights") === "pretrained" ? "COCO pretrained" : "custom checkpoint";
            metrics.textContent = `RF-DETR ${header("Model")} · ${weights} · ${header("Device").toUpperCase()} · ${header("Count")} detections · ${header("Masks")} masks · ${header("MS")} ms`;
          } else {
            metrics.textContent = `${canvas.width} × ${canvas.height} px`;
          }
        }
        if (response.status === 200 || response.status === 204) {
          setStatus(source === "raw" && mode === "vision" ? "Local detections. Waiting for RF-DETR." : "");
        } else {
          canvas.hidden = true;
          metrics.textContent = "";
          visibleId = null;
          if (mode === "game") game.unavailable("Waiting for a fresh camera frame. Observation is paused.");
          if (response.status === 403) {
            setStatus("Open TT-Beamer on the server PC using localhost to view the camera.");
            return;
          }
          if (response.status !== 503) throw new Error(`Camera preview returned HTTP ${response.status}`);
          setStatus("Waiting for the board camera. Check camera access in /output/ on the Pi.");
          delay = 750;
        }
      } catch {
        if (signal.aborted) return;
        canvas.hidden = true;
        metrics.textContent = "";
        visibleId = null;
        if (mode === "game") game.unavailable("Observation paused during the camera interruption.");
        setStatus("Camera connection interrupted. Retrying…");
        delay = 750;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, delay - (performance.now() - started))));
    }
  }

  function start() {
    active?.abort();
    active = new AbortController();
    game.reset(mode === "game");
    canvas.hidden = true;
    metrics.textContent = "";
    setStatus("Connecting to the board camera…");
    for (const button of modeButtons) button.disabled = false;
    void refresh(active.signal);
  }

  trigger.addEventListener("click", () => {
    dialog.showModal();
    start();
  });
  dialog.addEventListener("close", () => {
    active?.abort();
    game.reset(false);
    canvas.width = 1;
    canvas.height = 1;
  });
  for (const button of modeButtons) {
    button.addEventListener("click", () => {
      if (mode === button.dataset.cameraMode) return;
      mode = button.dataset.cameraMode;
      for (const option of modeButtons) {
        option.setAttribute("aria-pressed", String(option === button));
      }
      start();
    });
  }
  bindAutoCalibration({
    dialog,
    pausePreview() {
      active?.abort();
      game.reset(false);
      canvas.hidden = true;
      metrics.textContent = "";
      setStatus("");
      for (const button of modeButtons) button.disabled = true;
    },
    resumePreview: start,
  });
  trigger.hidden = false;
}

bootCameraPreview();
