import { bindAutoCalibration } from "../calibration/auto-calibration.js";
import { bindCameraZoom } from "./camera-preview-zoom.js";
import { createGameReview, paintBoxes } from "./game-review.js";

function bootCameraPreview() {
  if (location.pathname.replace(/\/$/, "") === "/ssr" || document.body.dataset.outputRole === "final-output") return;

  const trigger = document.getElementById("camera-preview-open");
  const dialog = document.getElementById("camera-preview");
  const canvas = document.getElementById("camera-preview-image");
  const context = canvas.getContext("2d", { alpha: false });
  const overlay = document.getElementById("camera-preview-overlay");
  const overlayContext = overlay.getContext("2d");
  const status = document.getElementById("camera-preview-status");
  const metrics = document.getElementById("camera-preview-metrics");
  const modeButtons = [...dialog.querySelectorAll("[data-camera-mode]")];
  const panel = document.getElementById("camera-view-panel");
  const game = createGameReview();
  const zoom = bindCameraZoom(dialog, canvas, scale => {
    zoomScale = scale;
    paintOverlay();
  });
  let mode = "game";
  let active;
  let zoomScale = 1;
  let boxes = [];

  function paintOverlay() {
    if (overlay.hidden) return;
    overlayContext.clearRect(0, 0, overlay.width, overlay.height);
    if (boxes.length) paintBoxes(overlayContext, boxes, zoomScale);
  }

  async function getFrame(after, signal) {
    const query = new URLSearchParams();
    if (after) query.set("after", after);
    return fetch("/api/camera/latest.jpg" + (query.size ? "?" + query : ""), {
      cache: "no-store",
      signal: AbortSignal.any([signal, AbortSignal.timeout(2500)]),
    });
  }

  function setStatus(message) {
    if (status.textContent !== message) status.textContent = message;
  }

  function showFrame(visible) {
    canvas.hidden = !visible;
    overlay.hidden = !visible || mode === "raw";
    zoom.setAvailable(visible);
  }

  async function refresh(signal) {
    let visibleId;
    while (!signal.aborted) {
      const started = performance.now();
      let delay = 200;
      try {
        const response = await getFrame(visibleId, signal);
        if (signal.aborted) return;

        if (response.status === 200) {
          const blob = await response.blob();
          const id = response.headers.get("X-Camera-Frame-Id");
          const bitmap = await createImageBitmap(blob);
          try {
            if (signal.aborted) return;
            let nextBoxes = [];
            if (mode !== "raw") {
              try {
                nextBoxes = await game.observe(bitmap, id, signal);
              } catch (error) {
                if (signal.aborted) return;
                game.unavailable(error.message);
                delay = 1000;
              }
            }
            if (signal.aborted) return;
            if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
              overlay.width = canvas.width = bitmap.width;
              overlay.height = canvas.height = bitmap.height;
            }
            context.drawImage(bitmap, 0, 0);
            boxes = nextBoxes;
          } finally {
            bitmap.close();
          }
          showFrame(true);
          paintOverlay();
          visibleId = id;
          metrics.textContent = `${canvas.width} × ${canvas.height} px`;
        }
        if (response.status === 200 || response.status === 204) {
          if (response.status === 200 || !visibleId) setStatus("");
        } else {
          showFrame(false);
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
        showFrame(false);
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
    boxes = [];
    showFrame(false);
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
    zoom.reset();
    showFrame(false);
    canvas.width = 1;
    canvas.height = 1;
    overlay.width = 1;
    overlay.height = 1;
  });
  function select(button) {
    if (mode === button.dataset.cameraMode) return;
    mode = button.dataset.cameraMode;
    for (const option of modeButtons) {
      option.setAttribute("aria-selected", String(option === button));
      option.tabIndex = option === button ? 0 : -1;
    }
    panel.setAttribute("aria-labelledby", button.id);
    start();
  }
  for (const button of modeButtons) {
    button.addEventListener("click", () => select(button));
    button.addEventListener("keydown", event => {
      const next = event.key === "Home" ? modeButtons[0] : event.key === "End" ? modeButtons.at(-1)
        : ["ArrowLeft", "ArrowRight"].includes(event.key) ? modeButtons.find(option => option !== button) : null;
      if (!next) return;
      event.preventDefault();
      select(next);
      next.focus();
    });
  }
  bindAutoCalibration();
  trigger.hidden = false;
}

bootCameraPreview();
