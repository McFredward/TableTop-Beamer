const output = location.pathname.replace(/\/$/, "") === "/ssr" || document.body.dataset.outputRole === "final-output";
const local = ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname);
const button = output ? null : document.getElementById("camera-automation-switch");
const status = button && document.getElementById("camera-automation-status");
const indicator = button && document.getElementById("camera-automation-indicator");
const modelProgress = button && document.getElementById("camera-model-progress");
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
const modelSteps = {
  starting: [0, "Checking the Python environment"],
  loading: [1, "Loading model weights"],
  preparing: [2, "Preparing the detector"],
  "waiting-camera": [3, "Model loaded. Waiting for the board camera"],
  inference: [3, "Analyzing the first camera image"],
  ready: [4, "Receiving model detections"],
  reconnecting: [0, "Connection interrupted. Retrying automatically"],
  stalled: [3, "Waiting for a fresh detection"],
  "not-connected": [0, "No model worker connected"],
  disconnected: [0, "Model worker disconnected"],
  error: [0, "Model worker could not start or continue"],
};
const modelHelp = {
  checkpoint: "Check that the worker uses the trained checkpoint for this model.",
  dependencies: "Install PyTorch and RF-DETR in the worker’s Python environment.",
  device: "Restart the worker with --device cpu or check its CUDA installation.",
  "frame-size": "Check the worker’s --roi against the current camera resolution.",
  server: "Check that the worker port matches this TT-Beamer server and use a matching app version.",
  worker: "Check the detector terminal or the server log for the error.",
};
const startHelp = "Start the detector with --game and its trained checkpoint on the TT-Beamer PC.";
const managedHelp = {
  checkpoint: "Place the trained checkpoint in .vision/nemesis.pth or check the configured path.",
  dependencies: "Run the TT-Beamer launcher to prepare the detector or check the configured Python environment.",
};
let worker;
let enabled = false;
let changing = false;
let revision = 0;
let renderedModels;

function showModelProgress(models) {
  if (!modelProgress) return;
  modelProgress.hidden = !models.length;
  const signature = JSON.stringify(models);
  if (signature === renderedModels) return;
  renderedModels = signature;
  modelProgress.replaceChildren(...models.map(model => {
    const [step, stage] = modelSteps[model.phase] ?? modelSteps["not-connected"];
    const entry = document.createElement("div");
    const label = document.createElement("p");
    label.textContent = `${model.name} · ${stage}`;
    const progress = document.createElement("progress");
    progress.max = modelSteps.ready[0];
    progress.value = step;
    progress.setAttribute("aria-label", label.textContent);
    entry.append(label, progress);
    let help = model.phase === "error" ? modelHelp[model.error] ?? modelHelp.worker
      : ["not-connected", "disconnected"].includes(model.phase) ? startHelp : null;
    if (help && model.managed) help = model.phase === "error"
      ? `${managedHelp[model.error] ?? help} TT-Beamer retries the configured detector automatically.`
      : "TT-Beamer will start the configured detector automatically.";
    if (help) {
      const hint = document.createElement("p");
      hint.textContent = help;
      entry.append(hint);
    }
    return entry;
  }));
}

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
  const models = enabled ? state.modelProgress ?? [] : [];
  showModelProgress(models);
  const text = descriptions[state.phase] ?? descriptions.host;
  let label = !enabled ? "Off" : state.phase === "camera" ? "Waiting for camera" : "On";
  if (state.phase === "model") {
    const modelPhases = models.map(model => model.phase);
    if (modelPhases.includes("error")) label = "Model error";
    else if (modelPhases.some(phase => ["starting", "loading", "preparing", "inference"].includes(phase))) label = "Starting model";
    else if (modelPhases.some(phase => ["not-connected", "disconnected"].includes(phase))) label = "Model offline";
    else label = "Waiting for model";
  }
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
