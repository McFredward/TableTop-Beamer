import { readBitmap } from "../calibration/calibration-images.js";
import { createAnimationCameraBindings } from "./animation-camera-bindings.js";
import { checkCameraReading, readBoardObjects, readCameraBitmap, registerCameraBoard } from "./camera-board-readings.js";
import { createGameObserver, makeGameLayout, trackActivation, trackAnimationBindings } from "./game-observer.js";
import { detectTrackBeads, prepareTrackBeads } from "./track-beads.js";

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

  async function observeTracks(lease, signal, frame) {
    const { frameId, boardId, token, since } = lease;
    if (!setup.tracks || Number(frameId.split("-")[0]) < since) return;
    if (setup.lastTrackFrame === frameId) return;
    if (!frame) {
      const bitmap = await readCameraBitmap(frameId, signal);
      if (!bitmap) return;
      try { frame = readBitmap(bitmap); }
      finally { bitmap.close(); }
    }
    if (frame.width !== setup.width || frame.height !== setup.height) return;
    setup.lastTrackFrame = frameId;
    const { tracks } = setup.tracks.observe({ ...detectTrackBeads(frame, setup.beads), frameId,
      classes: ["track-marker"], coverage: [0, 0, 1, 1] });
    await Promise.all(setup.trackBindings.map(async ({ track, scope, roomId, definition }) => {
      const reading = tracks.find(item => item.kind === track);
      if (!["confirmed", "inactive"].includes(reading?.status)) return;
      const active = trackActivation(track, reading.value);
      if (setup.trackTargets.get(track) === active) return;
      const result = await post("/api/camera/animation", { boardId, token, frameId, scope, roomId,
        animationId: definition.id, track, value: reading.value, action: active ? "start" : "stop" });
      if (!result.ok && result.status !== 409) throw new Error(`Camera track returned ${result.status}`);
      if (result.ok) setup.trackTargets.set(track, active);
    }));
  }

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
      selection = { key: boardKey, board, trackBindings: trackAnimationBindings(board),
        targets: { boardId: lease.boardId, modelIds } };
    }
    if (!selection.targets.modelIds.length && !selection.trackBindings.length) { phase = "bindings"; return; }
    if (!lease.frameId) { phase = "camera"; return; }

    const generation = lease.frameId.split("-")[1];
    const key = `${boardKey}:${generation}`;
    let frame;
    if (setup?.key !== key) {
      phase = "registering";
      await heartbeat();
      const bitmap = await readCameraBitmap(lease.frameId, signal);
      if (!bitmap) { phase = "camera"; return; }
      try { frame = readBitmap(bitmap, true); }
      finally { bitmap.close(); }
      const { cv, registration, geometry, reference, width, height } = await registerCameraBoard(selection.board, frame, signal);
      const bindings = createAnimationCameraBindings(selection.board, registration, width, height);
      setup = { key, cv, geometry, width, height, bindings, modelIds: bindings.modelIds, last: new Map(), checkedModels: new Map(),
        trackBindings: selection.trackBindings, trackTargets: new Map() };
      if (setup.trackBindings.length) {
        const layout = makeGameLayout(selection.board, registration, width, height);
        setup.tracks = createGameObserver(layout, { kinds: [] });
        setup.beads = prepareTrackBeads(layout.slots, registration, reference, frame);
      }
    }

    const modelReports = setup.modelIds.map(async modelId => {
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
    });
    const [tracks, ...reports] = await Promise.allSettled([observeTracks(lease, signal, frame), ...modelReports]);
    if (tracks.status === "rejected") throw tracks.reason;
    if (reports.some(report => report.status === "fulfilled" && report.value) || (!setup.modelIds.length && setup.tracks)) {
      phase = "active";
    } else {
      phase = reports.every(report => report.status === "rejected") ? "error" : "model";
    }
  }

  while (true) {
    try { await observe(); }
    catch { phase = "error"; }
    const tracking = phase === "active" || (phase === "model" && (setup?.last.size > 0 || setup?.tracks));
    await new Promise(resolve => setTimeout(resolve, tracking ? 250 : phase === "error" ? 2500 : 1100));
  }
}
