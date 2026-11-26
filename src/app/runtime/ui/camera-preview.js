function bootCameraPreview() {
  if (location.pathname.replace(/\/$/, "") === "/ssr" || document.body.dataset.outputRole === "final-output") return;

  const trigger = document.getElementById("camera-preview-open");
  const dialog = document.getElementById("camera-preview");
  const canvas = document.getElementById("camera-preview-image");
  const context = canvas.getContext("2d", { alpha: false });
  const status = document.getElementById("camera-preview-status");
  const metrics = document.getElementById("camera-preview-metrics");
  const modeButtons = dialog.querySelectorAll("[data-camera-mode]");
  let mode = "vision";
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
    while (!signal.aborted) {
      const started = performance.now();
      let delay = 200;
      try {
        let source = mode;
        let response = await getFrame(source, visibleSource === source ? visibleId : null, signal);
        if (source === "vision" && response.status === 503) {
          source = "raw";
          response = await getFrame(source, visibleSource === source ? visibleId : null, signal);
        }
        if (signal.aborted) return;

        if (response.status === 200) {
          const bitmap = await createImageBitmap(await response.blob());
          try {
            if (signal.aborted) return;
            if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
              canvas.width = bitmap.width;
              canvas.height = bitmap.height;
            }
            context.drawImage(bitmap, 0, 0);
          } finally {
            bitmap.close();
          }
          canvas.hidden = false;
          visibleId = response.headers.get("X-Camera-Frame-Id");
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
          setStatus(source === "raw" && mode === "vision" ? "Waiting for RF-DETR. Showing the live camera." : "");
        } else {
          canvas.hidden = true;
          metrics.textContent = "";
          visibleId = null;
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
        setStatus("Camera connection interrupted. Retrying…");
        delay = 750;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, delay - (performance.now() - started))));
    }
  }

  function start() {
    active?.abort();
    active = new AbortController();
    canvas.hidden = true;
    metrics.textContent = "";
    setStatus("Connecting to the board camera…");
    void refresh(active.signal);
  }

  trigger.addEventListener("click", () => {
    dialog.showModal();
    start();
  });
  dialog.addEventListener("close", () => {
    active?.abort();
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
  trigger.hidden = false;
}

bootCameraPreview();
