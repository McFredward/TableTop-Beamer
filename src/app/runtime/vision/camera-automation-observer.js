import { readBitmap } from "../calibration/calibration-images.js";
import { createAnimationCameraBindings } from "./animation-camera-bindings.js";
import { checkCameraReading, readBoardObjects, readCameraBitmap, registerCameraBoard } from "./camera-board-readings.js";

function post(path, payload) {
  return fetch(path, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    signal: AbortSignal.timeout(3500),
  });
}

export async function runCameraAutomation() {
  const owner = crypto.randomUUID();
  let phase = "board";
  let setup;

  async function observe() {
    const response = await post("/api/camera/automation/lease", { owner, phase });
    if (response.status === 204) {
      setup = undefined;
      return;
    }
    if (!response.ok) throw new Error(`Camera automation lease returned ${response.status}`);
    const lease = await response.json();
    if (lease.paused) {
      setup = undefined;
      phase = "paused";
      return;
    }
    if (!lease.boardId) { phase = "board"; return; }
    if (!lease.frameId) { phase = "camera"; return; }

    const generation = lease.frameId.split("-")[1];
    const key = `${lease.token}:${lease.boardId}:${generation}`;
    const signal = AbortSignal.timeout(18_000);
    if (setup?.key !== key) {
      const catalog = await fetch("/api/boards", { cache: "no-store", signal });
      if (!catalog.ok) throw new Error("The board catalog is unavailable");
      const board = (await catalog.json()).boards.find(entry => entry.boardId === lease.boardId);
      if (!board) { phase = "board"; return; }
      const hasBindings = ["roomFx", "insideFx", "outsideFx"].some(scope =>
        board[scope]?.animations?.some(animation => animation.cameraTrigger?.modelId));
      if (!hasBindings) {
        setup = { key, modelIds: [] };
        phase = "bindings";
        return;
      }

      phase = "registering";
      await post("/api/camera/automation/lease", { owner, phase });
      const bitmap = await readCameraBitmap(lease.frameId, signal);
      if (!bitmap) { phase = "camera"; return; }
      let frame;
      try { frame = readBitmap(bitmap, true); }
      finally { bitmap.close(); }
      const { registration, geometry, width, height } = await registerCameraBoard(board, frame, signal);
      const bindings = createAnimationCameraBindings(board, registration, width, height);
      setup = { key, geometry, width, height, bindings, modelIds: bindings.modelIds, last: new Map(), checkedModels: new Map() };
    }

    if (!setup.modelIds.length) { phase = "bindings"; return; }
    const reports = await Promise.all(setup.modelIds.map(async modelId => {
      const model = await readBoardObjects(signal, modelId);
      const [time, modelGeneration] = model?.frameId.split("-") ?? [];
      if (modelGeneration !== generation || Number(time) < lease.since) return false;
      if (setup.last.get(modelId) === model.frameId) return true;

      const reading = await checkCameraReading(model, setup, signal);
      setup.last.set(modelId, model.frameId);
      const { actions } = setup.bindings.observe(modelId, reading);
      await Promise.all(actions.map(async action => {
        const result = await post("/api/camera/animation", { ...action, boardId: lease.boardId, token: lease.token,
          frameId: model.frameId, modelId });
        if (!result.ok && result.status !== 409) throw new Error(`Camera animation returned ${result.status}`);
      }));
      return true;
    }));
    phase = reports.some(Boolean) ? "active" : "model";
  }

  while (true) {
    try { await observe(); }
    catch { phase = "error"; }
    await new Promise(resolve => setTimeout(resolve, phase === "active" ? 650 : phase === "error" ? 2500 : 1100));
  }
}
