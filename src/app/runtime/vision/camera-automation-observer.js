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
  let selection;

  const heartbeat = () => post("/api/camera/automation/lease", { owner, phase, ...selection?.targets });

  async function observe() {
    const response = await heartbeat();
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
    if (!lease.boardId) { selection = undefined; phase = "board"; return; }

    const boardKey = `${lease.token}:${lease.boardId}`;
    const signal = AbortSignal.timeout(18_000);
    if (selection?.key !== boardKey) {
      const catalog = await fetch("/api/boards", { cache: "no-store", signal });
      if (!catalog.ok) throw new Error("The board catalog is unavailable");
      const board = (await catalog.json()).boards.find(entry => entry.boardId === lease.boardId);
      if (!board) { phase = "board"; return; }
      const modelIds = [...new Set(["roomFx", "insideFx", "outsideFx"].flatMap(scope =>
        (board[scope]?.animations ?? []).map(animation => animation.cameraTrigger?.modelId).filter(Boolean)))];
      selection = { key: boardKey, board, targets: { boardId: lease.boardId, modelIds } };
    }
    if (!selection.targets.modelIds.length) { phase = "bindings"; return; }
    if (!lease.frameId) { phase = "camera"; return; }

    const generation = lease.frameId.split("-")[1];
    const key = `${boardKey}:${generation}`;
    if (setup?.key !== key) {
      phase = "registering";
      await heartbeat();
      const bitmap = await readCameraBitmap(lease.frameId, signal);
      if (!bitmap) { phase = "camera"; return; }
      let frame;
      try { frame = readBitmap(bitmap, true); }
      finally { bitmap.close(); }
      const { cv, registration, geometry, width, height } = await registerCameraBoard(selection.board, frame, signal);
      const bindings = createAnimationCameraBindings(selection.board, registration, width, height);
      setup = { key, cv, geometry, width, height, bindings, modelIds: bindings.modelIds, last: new Map(), checkedModels: new Map() };
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
        try {
          const result = await post("/api/camera/animation", { ...action, boardId: lease.boardId, token: lease.token,
            frameId: model.frameId, modelId });
          if (result.headers.get("X-Camera-Reading-Expired")) setup.bindings.retry(modelId, action);
          if (!result.ok && result.status !== 409) throw new Error(`Camera animation returned ${result.status}`);
        } catch (error) {
          setup.bindings.retry(modelId, action);
          throw error;
        }
      }));
      return true;
    }));
    phase = reports.some(Boolean) ? "active" : "model";
  }

  while (true) {
    try { await observe(); }
    catch { phase = "error"; }
    const tracking = phase === "active" || (phase === "model" && setup?.last.size > 0);
    await new Promise(resolve => setTimeout(resolve, tracking ? 250 : phase === "error" ? 2500 : 1100));
  }
}
