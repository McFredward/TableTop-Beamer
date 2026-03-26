#!/usr/bin/env node

const baseUrl = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const wsBaseUrl = `${baseUrl.replace(/^http/, "ws")}/api/live/ws`;

async function readJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status})`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function mutationId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function openLiveClient(role) {
  const ws = new WebSocket(`${wsBaseUrl}?role=${encodeURIComponent(role)}`);
  const listeners = [];
  ws.addEventListener("message", (event) => {
    let payload = null;
    try {
      payload = JSON.parse(String(event.data || "{}"));
    } catch {
      payload = null;
    }
    if (!payload) {
      return;
    }
    for (const entry of [...listeners]) {
      if (entry.predicate(payload)) {
        clearTimeout(entry.timeoutId);
        listeners.splice(listeners.indexOf(entry), 1);
        entry.resolve(payload);
      }
    }
  });

  async function waitFor(predicate, timeoutMs = 2500) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = listeners.findIndex((entry) => entry.timeoutId === timeoutId);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
        reject(new Error(`timeout waiting for websocket message (${role})`));
      }, timeoutMs);
      listeners.push({ predicate, resolve, timeoutId });
    });
  }

  const ready = waitFor((payload) => payload?.type === "live-hello", 3500);

  return {
    role,
    ws,
    ready,
    waitFor,
    send(payload) {
      ws.send(JSON.stringify(payload));
    },
    close() {
      try {
        ws.close();
      } catch {
        // ignore
      }
    },
  };
}

function findAnimation(runtime, animationId) {
  const list = Array.isArray(runtime?.runningAnimations) ? runtime.runningAnimations : [];
  return list.find((entry) => entry?.id === animationId) ?? null;
}

async function sendMutationAndWait(client, mutationType, payload) {
  const id = mutationId(mutationType);
  client.send({
    type: "live-mutation",
    mutationType,
    mutationId: id,
    payload,
  });
  const ack = await client.waitFor((message) => message?.type === "live-ack" && message?.mutationId === id, 3500);
  assert(ack?.applied === true, `${mutationType} not applied`);
  const update = await client.waitFor(
    (message) => message?.type === "live-session-update" && message?.mutationId === id,
    3500,
  );
  assert(Number(update?.session?.version ?? 0) >= Number(ack?.version ?? 0), `${mutationType} session-update version drift`);
  return {
    mutationId: id,
    ack,
    update,
  };
}

async function main() {
  const rows = [];
  const controlClient = openLiveClient("control");
  const finalClient = openLiveClient("final-output");
  const helloControl = await controlClient.ready;
  const helloFinal = await finalClient.ready;
  assert(helloControl?.session?.snapshot?.schema === "tt-beamer.live-state.v1", "control hello schema mismatch");
  assert(helloFinal?.session?.snapshot?.schema === "tt-beamer.live-state.v1", "final hello schema mismatch");

  const boards = await readJson("/api/boards");
  assert(Array.isArray(boards?.runtimeBoards) && boards.runtimeBoards.length > 0, "board catalog is empty");
  const board = boards.runtimeBoards[0];
  const room = Array.isArray(board?.rooms) ? board.rooms[0] : null;
  const cluster = Array.isArray(board?.roomClusters) ? board.roomClusters[0] : null;
  assert(room?.id, "board room seed missing");

  await sendMutationAndWait(controlClient, "context-update", {
    selectedBoard: board.id,
    selectedLayout: board.id,
  });

  const roomAnimationId = mutationId("room-animation");
  await sendMutationAndWait(controlClient, "trigger-room", {
    animation: {
      id: roomAnimationId,
      type: "alarm",
      targetType: "room",
      targetId: room.id,
      boardId: board.id,
      speed: 1,
      intensity: 0.6,
      soundVolume: 0.7,
      hold: true,
    },
  });
  let state = await readJson("/api/live/state");
  assert(findAnimation(state?.session?.snapshot?.runtime, roomAnimationId), "room start missing in runtime list");
  rows.push({ area: "room", behavior: "start", status: "PASS" });

  await sendMutationAndWait(controlClient, "edit-room", {
    animation: {
      id: roomAnimationId,
      speed: 0.45,
      intensity: 0.8,
      soundVolume: 0.5,
    },
  });
  state = await readJson("/api/live/state");
  const editedRoom = findAnimation(state?.session?.snapshot?.runtime, roomAnimationId);
  assert(Math.abs(Number(editedRoom?.speed) - 0.45) < 0.0001, "room edit did not update speed");
  rows.push({ area: "room", behavior: "edit", status: "PASS" });

  await sendMutationAndWait(controlClient, "stop-animation", {
    animationId: roomAnimationId,
  });
  state = await readJson("/api/live/state");
  assert(!findAnimation(state?.session?.snapshot?.runtime, roomAnimationId), "room stop failed");
  rows.push({ area: "room", behavior: "stop", status: "PASS" });

  if (cluster?.clusterId && Array.isArray(cluster?.roomIds) && cluster.roomIds.length > 0) {
    const clusterAnimationId = mutationId("cluster-animation");
    await sendMutationAndWait(controlClient, "trigger-room", {
      animation: {
        id: clusterAnimationId,
        type: "fire",
        targetType: "cluster",
        targetId: cluster.clusterId,
        roomIds: cluster.roomIds,
        boardId: board.id,
        speed: 0.75,
        hold: true,
      },
    });
    state = await readJson("/api/live/state");
    assert(findAnimation(state?.session?.snapshot?.runtime, clusterAnimationId), "cluster start missing in runtime list");
    rows.push({ area: "cluster", behavior: "start", status: "PASS" });

    await sendMutationAndWait(controlClient, "edit-room", {
      animation: {
        id: clusterAnimationId,
        intensity: 0.9,
      },
    });
    state = await readJson("/api/live/state");
    const editedCluster = findAnimation(state?.session?.snapshot?.runtime, clusterAnimationId);
    assert(Math.abs(Number(editedCluster?.intensity) - 0.9) < 0.0001, "cluster edit did not update intensity");
    rows.push({ area: "cluster", behavior: "edit", status: "PASS" });

    await sendMutationAndWait(controlClient, "stop-animation", {
      animationId: clusterAnimationId,
    });
    state = await readJson("/api/live/state");
    assert(!findAnimation(state?.session?.snapshot?.runtime, clusterAnimationId), "cluster stop failed");
    rows.push({ area: "cluster", behavior: "stop", status: "PASS" });
  } else {
    rows.push({ area: "cluster", behavior: "start/edit/stop", status: "SKIP", reason: "no cluster in catalog seed" });
  }

  await sendMutationAndWait(controlClient, "align-toggle", {
    alignMode: true,
  });
  state = await readJson("/api/live/state");
  assert(state?.session?.snapshot?.alignMode === true, "align start failed");
  rows.push({ area: "align", behavior: "start", status: "PASS" });

  await sendMutationAndWait(controlClient, "clear-all", {
    reason: "p7-hf1-align-clear-check",
  });
  state = await readJson("/api/live/state");
  assert(state?.session?.snapshot?.alignMode === true, "clear-all unexpectedly changed align mode");
  const runningAfterClear = state?.session?.snapshot?.runtime?.runningAnimations ?? [];
  assert(Array.isArray(runningAfterClear) && runningAfterClear.length === 0, "clear-all did not clear runtime animations");
  rows.push({ area: "align", behavior: "clear", status: "PASS" });

  await sendMutationAndWait(controlClient, "align-toggle", {
    alignMode: false,
  });
  state = await readJson("/api/live/state");
  assert(state?.session?.snapshot?.alignMode === false, "align stop failed");
  rows.push({ area: "align", behavior: "stop", status: "PASS" });

  const outsideMutation = await sendMutationAndWait(controlClient, "outside-update", {
    outsideBoardId: board.id,
    outsideFx: {
      enabled: true,
      speed: 1.2,
      intensity: 0.5,
      mode: "immersive",
      direction: "forward",
    },
  });
  controlClient.send({
    type: "live-apply-ack",
    mutationEnvelope: outsideMutation.update?.mutationEnvelope,
    appliedAt: new Date().toISOString(),
  });
  finalClient.send({
    type: "live-apply-ack",
    mutationEnvelope: outsideMutation.update?.mutationEnvelope,
    appliedAt: new Date().toISOString(),
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const telemetry = await readJson("/api/live/telemetry");
  const perClient = telemetry?.telemetry?.perClient ?? {};
  const roles = Object.values(perClient).map((entry) => entry?.role);
  assert(roles.includes("control"), "telemetry missing control role client");
  assert(roles.includes("final-output"), "telemetry missing final-output role client");
  rows.push({ area: "audio-role-routing", behavior: "role visibility", status: "PASS" });

  const defaultsBefore = await readJson("/api/global-defaults");
  await readJson("/api/global-defaults", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...defaultsBefore,
      source: "p7-hf1-non-regression",
      audio: {
        enabled: true,
        volume: 0.42,
      },
      animationSpeed: 0.88,
    }),
  });
  const defaultsAfter = await readJson("/api/global-defaults");
  assert(defaultsAfter?.source === "p7-hf1-non-regression", "persistence save source mismatch");
  assert(Math.abs(Number(defaultsAfter?.audio?.volume) - 0.42) < 0.0001, "persistence save volume mismatch");
  rows.push({ area: "persistence", behavior: "save/reload", status: "PASS" });

  await readJson("/api/global-defaults", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(defaultsBefore),
  });

  const stateBeforeRejoin = await readJson("/api/live/state");
  finalClient.close();
  const finalRejoin = openLiveClient("final-output");
  const helloRejoin = await finalRejoin.ready;
  assert(
    Number(helloRejoin?.session?.version ?? -1) === Number(stateBeforeRejoin?.session?.version ?? -2),
    "rejoin snapshot version mismatch",
  );
  rows.push({ area: "reload-rejoin", behavior: "snapshot parity", status: "PASS" });

  controlClient.close();
  finalRejoin.close();

  console.log(JSON.stringify({
    pass: rows.every((row) => row.status === "PASS" || row.status === "SKIP"),
    rows,
    checkedAt: new Date().toISOString(),
    baseUrl,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
