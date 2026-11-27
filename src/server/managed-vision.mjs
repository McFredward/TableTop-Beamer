import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { resolve } from "node:path";

function isFile(path) {
  return Boolean(path && statSync(path, { throwIfNoEntry: false })?.isFile());
}

export function createManagedVision({ root, python, checkpoint, modelId = "nemesis", device = "cpu", vision,
  start = spawn, now = Date.now }) {
  const configured = Boolean(python || checkpoint);
  const executable = python && resolve(root, python);
  const weights = checkpoint && resolve(root, checkpoint);
  const manages = id => configured && id === modelId;
  let child;
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

  function ensure(modelIds, hasCamera, port) {
    if (shuttingDown || !modelIds.some(manages)) return;
    const status = vision.modelStatus(modelId);
    const time = now();
    if (status.phase === "ready") retryDelay = 5000;
    if (child) {
      if (status.phase !== phase || status.phase === "ready" || !hasCamera) {
        phase = status.phase;
        phaseSince = time;
      } else if (time - phaseSince >= 120_000 && !child.killed) {
        console.warn("[vision] Managed detector stopped making progress. Restarting it.");
        child.kill();
      }
      return;
    }
    if (time < retryAt || !["not-connected", "disconnected", "error"].includes(status.phase)) return;
    try {
      if (!isFile(executable)) { retry("dependencies"); return; }
      if (!isFile(weights)) { retry("checkpoint"); return; }
      if (!["cpu", "cuda"].includes(device)) { retry("device"); return; }
      const worker = start(executable, [resolve(root, "scripts/stream_board_vision.py"), "--port", String(port),
        "--game", "--checkpoint", weights, "--model-id", modelId, "--device", device, "--max-fps", "1"],
      { cwd: root, windowsHide: true, stdio: ["ignore", "inherit", "inherit"] });
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

  return { manages, ensure, stop() { shuttingDown = true; child?.kill(); } };
}
