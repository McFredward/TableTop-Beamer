const output = location.pathname.replace(/\/$/, "") === "/ssr" || document.body.dataset.outputRole === "final-output";
const local = ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname);
const button = output ? null : document.getElementById("camera-automation-switch");
const status = button && document.getElementById("camera-automation-status");
const indicator = button && document.getElementById("camera-automation-indicator");
const descriptions = {
  off: "Camera effects are off.",
  host: "Waiting for TT-Beamer to start camera observation.",
  board: "Select a board to use camera effects.",
  bindings: "This board has no camera triggers configured.",
  camera: "Waiting for the board camera.",
  model: "Waiting for the linked trained model.",
  registering: "Locating the board in the camera image.",
  active: "Camera effects are active.",
  paused: "Camera effects are paused during calibration.",
  error: "Camera observation interrupted. Retrying…",
};
let worker;
let enabled = false;
let changing = false;
let revision = 0;

function show(state) {
  enabled = state.enabled;
  if (local && enabled && !worker) {
    worker = new Worker(new URL("../vision/camera-automation-worker.js", import.meta.url));
    worker.addEventListener("error", () => {
      worker?.terminate();
      worker = undefined;
    }, { once: true });
  } else if (!enabled && worker) {
    worker.terminate();
    worker = undefined;
  }
  if (!button) return;
  const text = descriptions[state.phase] ?? descriptions.host;
  const label = !enabled ? "Off" : state.phase === "model" ? "Waiting for model" : state.phase === "camera" ? "Waiting for camera" : "On";
  button.setAttribute("aria-checked", String(enabled));
  if (indicator.textContent !== label) indicator.textContent = label;
  button.classList.toggle("rd-btn-primary", enabled);
  button.classList.toggle("rd-btn-ghost", !enabled);
  button.title = text;
  if (status.textContent !== text) status.textContent = text;
  button.disabled = changing;
}

async function request(options) {
  const response = await fetch("/api/camera/automation", { cache: "no-store", signal: AbortSignal.timeout(3500), ...options });
  if (!response.ok) throw new Error(`Camera automation returned ${response.status}`);
  return response.json();
}

if (button) {
  button.hidden = false;
  button.addEventListener("click", async () => {
    changing = true;
    revision++;
    button.disabled = true;
    try {
      show(await request({ method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }) }));
    } catch {
      status.textContent = "Camera effects could not be changed. Try again.";
    } finally {
      changing = false;
      button.disabled = false;
    }
  });
}

if (button || local) {
  void (async () => {
    while (true) {
      const current = revision;
      try {
        const state = await request();
        if (!changing && current === revision) show(state);
      } catch {
        if (status && !changing) status.textContent = "Camera effects status is unavailable.";
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  })();
}
