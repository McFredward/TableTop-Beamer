import { spawn, spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

function isFile(path) {
  try {
    return typeof path === "string" && statSync(path, { throwIfNoEntry: false })?.isFile() === true;
  } catch {
    return false;
  }
}

function stopWorker(worker) {
  if (!worker || worker.killed) return;
  // A Windows venv launches the interpreter through a redirector.
  if (process.platform === "win32" && worker.pid) {
    const result = spawnSync("taskkill.exe", ["/F", "/T", "/PID", String(worker.pid)], {
      windowsHide: true, stdio: "ignore", timeout: 3000,
    });
    if (result.status === 0) return;
  }
  worker.kill();
}

export function localVisionOptions({ root, env = process.env, platform = process.platform }) {
  let settings = {};
  try {
    settings = JSON.parse(readFileSync(resolve(root, ".vision/settings.json"), "utf8").replace(/^\uFEFF/, "")) ?? {};
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("[vision] Could not read .vision/settings.json:", error.message);
  }
  const localPython = resolve(root, ".vision", platform === "win32" ? "venv/Scripts/python.exe" : "venv/bin/python");
  const installedPython = platform === "win32" && env.LOCALAPPDATA
    ? resolve(env.LOCALAPPDATA, "tt-beamer-vision", "Scripts/python.exe") : undefined;
  const get = (key, envKey) => env[envKey] || (typeof settings[key] === "string" ? settings[key] : undefined);
  const explicitPython = get("python", "TT_BEAMER_VISION_PYTHON");
  const explicitCheckpoint = get("checkpoint", "TT_BEAMER_VISION_CHECKPOINT");
  const python = explicitPython || (!isFile(localPython) && isFile(installedPython) ? installedPython : localPython);
  const checkpoint = explicitCheckpoint || ".vision/nemesis.pth";
  const enabled = env.TT_BEAMER_VISION_AUTOSTART === "0" ? false : Boolean(
    env.TT_BEAMER_VISION_AUTOSTART === "1" || explicitPython || explicitCheckpoint || isFile(resolve(root, checkpoint)),
  );
  return { root, enabled, python, checkpoint, modelId: get("modelId", "TT_BEAMER_VISION_MODEL_ID"),
    device: get("device", "TT_BEAMER_VISION_DEVICE"), roi: get("roi", "TT_BEAMER_VISION_ROI"),
    tileSize: get("tileSize", "TT_BEAMER_VISION_TILE_SIZE") || (Number.isSafeInteger(settings.tileSize) ? settings.tileSize : undefined) };
}

export function createManagedVision({ root, python, checkpoint, modelId = "nemesis", device = "cpu", roi, tileSize, vision,
  enabled = Boolean(python || checkpoint), start = spawn, now = Date.now }) {
  const executable = python && resolve(root, python);
  const weights = checkpoint && resolve(root, checkpoint);
  const manages = id => enabled && id === modelId;
  let child;
  let timer;
  let phase;
  let phaseSince = 0;
  let retryAt = 0;
  let retryDelay = 5000;
  let shuttingDown = false;

  function retry(error) {
    if (error) vision.reportModelStatus({ modelId, phase: "error", error });
    retryAt = now() + retryDelay;
    retryDelay = Math.min(retryDelay * 2, 60_000);
  }

  function ensure(hasCamera, port) {
    if (shuttingDown || !enabled) return;
    const status = vision.modelStatus(modelId);
    const time = now();
    if (status.phase === "ready") retryDelay = 5000;
    if (child) {
      if (status.phase !== phase || status.phase === "ready" || !hasCamera) {
        phase = status.phase;
        phaseSince = time;
      } else if (time - phaseSince >= 120_000 && !child.killed) {
        console.warn("[vision] Managed detector stopped making progress. Restarting it.");
        phaseSince = time;
        stopWorker(child);
      }
      return;
    }
    if (time < retryAt || !["not-connected", "disconnected", "error"].includes(status.phase)) return;
    try {
      if (!isFile(weights)) {
        console.warn(`[vision] Trained checkpoint missing: ${weights ?? ".vision/nemesis.pth"}`);
        retry("checkpoint");
        return;
      }
      if (!isFile(executable)) {
        console.warn(`[vision] Python runtime missing: ${executable ?? ".vision/venv"}`);
        retry("dependencies");
        return;
      }
      if (!["cpu", "cuda"].includes(device)) { retry("device"); return; }
      console.log(`[vision] Starting ${modelId} detector on ${device}.`);
      const worker = start(executable, [resolve(root, "scripts/stream_board_vision.py"), "--port", String(port),
        "--game", "--objects-only", "--checkpoint", weights, "--model-id", modelId, "--device", device, "--max-fps", "1",
        ...(roi ? ["--roi", roi] : []), ...(tileSize ? ["--tile-size", String(tileSize)] : [])],
      { cwd: root, windowsHide: true, stdio: ["ignore", "inherit", "inherit"], env: {
        ...process.env, PYTHONUNBUFFERED: "1",
        ...(device === "cpu" ? { OMP_NUM_THREADS: process.env.OMP_NUM_THREADS ?? "4",
          MKL_NUM_THREADS: process.env.MKL_NUM_THREADS ?? "4" } : {}),
      } });
      child = worker;
      phase = "starting";
      phaseSince = time;
      vision.reportModelStatus({ modelId, phase });
      worker.on("error", error => console.warn(`[vision] Could not run the managed detector: ${error.message}`));
      worker.once("close", () => {
        if (child !== worker) return;
        child = undefined;
        if (!shuttingDown) retry(vision.modelStatus(modelId).phase === "error" ? null : "worker");
      });
    } catch (error) {
      console.warn(`[vision] Could not start the managed detector: ${error.message}`);
      retry("worker");
    }
  }

  return {
    manages,
    modelIds: enabled ? [modelId] : [],
    start(port, hasCamera) {
      if (!enabled || shuttingDown || timer) return;
      const tick = () => ensure(hasCamera(), port);
      tick();
      timer = setInterval(tick, 2000).unref();
    },
    ensure,
    stop() {
      if (shuttingDown) return;
      shuttingDown = true;
      clearInterval(timer);
      stopWorker(child);
    },
  };
}
