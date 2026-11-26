const MAX_UPLOAD_FPS = 2;
const JPEG_BYTES_PER_MS = 750; // 6 Mbit/s of JPEG payload.
const cameraConstraints = {
  audio: false,
  video: {
    width: { ideal: 3840, max: 3840 },
    height: { ideal: 2160, max: 2160 },
    frameRate: { ideal: 5, max: 5 },
  },
};

function sendFrame(worker, frame, signal) {
  return new Promise((resolve, reject) => {
    function finish(callback, value) {
      worker.onmessage = null;
      worker.onerror = null;
      signal.removeEventListener("abort", onAbort);
      callback(value);
    }

    const onAbort = () => finish(reject, signal.reason);
    worker.onmessage = ({ data }) => finish(resolve, data);
    worker.onerror = (event) => finish(reject, new Error(event.message || "Camera encoder failed"));
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      worker.postMessage(frame, frame instanceof Blob ? [] : [frame]);
    } catch (error) {
      frame.close?.();
      finish(reject, error);
    }
  });
}

export async function bootOutputCamera() {
  const response = await fetch("/api/camera/output-config", {
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error("Camera configuration unavailable");
  const { enabled, fps } = await response.json();
  if (!enabled) return;

  const status = document.getElementById("output-camera-status");
  const message = document.getElementById("output-camera-message");
  const retry = document.getElementById("output-camera-retry");
  function show(text, canRetry = false) {
    message.textContent = text;
    retry.hidden = !canRetry;
    status.hidden = !text;
  }

  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    show("The board camera needs a trusted connection in Chromium.");
    return;
  }
  if (!window.ImageCapture || !window.OffscreenCanvas) {
    show("This browser cannot capture the board camera. Open this page in Chromium.");
    return;
  }

  const periodMs = 1000 / Math.min(fps, MAX_UPLOAD_FPS);
  let active;
  let timer;
  let restartOnShow = false;

  function start() {
    if (active) return;
    const controller = new AbortController();
    const { signal } = controller;
    active = controller;
    show("Allow access to the board camera in Chromium.");

    void (async () => {
      let stream;
      let worker;
      try {
        stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
        if (signal.aborted) return;
        const track = stream.getVideoTracks()[0];
        const capture = new ImageCapture(track);
        let usePhoto = typeof capture.takePhoto === "function";
        worker = new Worker(new URL("./output-camera-encode.worker.js", import.meta.url), { type: "module" });
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          worker.terminate();
          track.stop();
        }, { once: true });
        const fail = (error) => {
          if (signal.aborted) return;
          controller.abort();
          active = null;
          console.warn("[output-camera]", error);
          show("Board camera unavailable. Check the USB connection and Chromium camera permission.", true);
        };
        track.addEventListener("ended", () => fail(new Error("Camera disconnected")), { once: true });

        async function captureNext() {
          const started = performance.now();
          let delay = periodMs;
          try {
            if (!track.muted) {
              let frame;
              if (usePhoto) {
                const photo = await capture.takePhoto().catch(() => null);
                if (photo?.type === "image/jpeg") frame = photo;
                else if (photo) usePhoto = false;
              }
              if (signal.aborted) return;
              if (!frame) frame = await capture.grabFrame();
              if (signal.aborted) {
                frame.close?.();
                return;
              }
              const { bytes, status, error } = await sendFrame(worker, frame, signal);
              if (status === 403) {
                controller.abort();
                active = null;
                show("");
                return;
              }
              delay = Math.max(delay, (bytes || 0) / JPEG_BYTES_PER_MS);
              if (error) {
                if (status === 400 && usePhoto) usePhoto = false;
                show("Camera upload interrupted. Retrying…");
                delay = Math.max(delay, 1000);
              } else {
                show("");
              }
            }
            if (!signal.aborted) {
              timer = setTimeout(captureNext, Math.max(0, delay - (performance.now() - started)));
            }
          } catch (error) {
            fail(error);
          }
        }
        void captureNext();
      } catch (error) {
        stream?.getTracks().forEach((track) => track.stop());
        if (signal.aborted) return;
        active = null;
        console.warn("[output-camera]", error);
        show("Board camera unavailable. Check the USB connection and Chromium camera permission.", true);
      } finally {
        if (signal.aborted) stream?.getTracks().forEach((track) => track.stop());
      }
    })();
  }

  retry.addEventListener("click", start);
  window.addEventListener("pagehide", () => {
    restartOnShow = Boolean(active);
    active?.abort();
    active = null;
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && restartOnShow) start();
  });
  start();
}
