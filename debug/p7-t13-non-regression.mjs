#!/usr/bin/env node

const baseUrl = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function mutationId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status})`);
  }
  return response.json();
}

async function sendCommand(mutationType, payload, role = "control") {
  const mutationIdValue = mutationId(mutationType);
  const response = await readJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      mutationId: mutationIdValue,
      mutationType,
      role,
      clientId: `script-${role}`,
      payload,
    }),
  });
  assert(response?.commandAccepted === true, `${mutationType} command not accepted`);
  return response;
}

function findAnimation(runtime, animationId) {
  const list = Array.isArray(runtime?.runningAnimations) ? runtime.runningAnimations : [];
  return list.find((entry) => entry?.id === animationId) ?? null;
}

function createPollingClient(role) {
  return {
    role,
    appliedVersion: 0,
    snapshot: null,
  };
}

async function pollClientOnce(client) {
  const payload = await readJson(`/api/live/snapshot?sinceVersion=${encodeURIComponent(String(client.appliedVersion))}`);
  const version = Number(payload?.session?.version ?? 0);
  if (Number.isFinite(version) && version > client.appliedVersion) {
    client.appliedVersion = version;
    client.snapshot = payload?.session?.snapshot ?? null;
  }
  return client;
}

async function waitForAllClientsVersion(clients, minVersion, timeoutMs = 2600) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    await Promise.all(clients.map((client) => pollClientOnce(client)));
    if (clients.every((client) => Number(client.appliedVersion) >= Number(minVersion))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`timeout waiting for clients to reach version ${minVersion}`);
}

async function main() {
  const rows = [];
  const clients = [
    createPollingClient("control-a"),
    createPollingClient("control-b"),
    createPollingClient("control-c"),
    createPollingClient("final-output"),
  ];

  const finalRoute = await fetch(`${baseUrl}/output/final`);
  assert(finalRoute.ok, "/output/final route unavailable");
  rows.push({ area: "final-output", behavior: "route-availability", status: "PASS" });

  const boards = await readJson("/api/boards");
  assert(Array.isArray(boards?.runtimeBoards) && boards.runtimeBoards.length > 0, "board catalog empty");
  const board = boards.runtimeBoards[0];
  const room = Array.isArray(board?.rooms) ? board.rooms[0] : null;
  assert(room?.id, "board seed missing room");

  const contextAck = await sendCommand("context-update", {
    selectedBoard: board.id,
    selectedLayout: board.id,
    boardId: board.id,
  });
  await waitForAllClientsVersion(clients, contextAck.version);
  rows.push({ area: "sync", behavior: "context-update visible on all clients", status: "PASS" });

  const roomAnimationId = mutationId("hf2-room");
  const startAck = await sendCommand("trigger-room", {
    animationId: roomAnimationId,
    animation: {
      id: roomAnimationId,
      type: "alarm",
      scope: "room",
      targetType: "room",
      targetId: room.id,
      roomId: room.id,
      boardId: board.id,
      hold: true,
      speed: 1,
      intensity: 0.65,
      soundVolume: 0.7,
      startedAtEpochMs: Date.now(),
    },
  });
  await waitForAllClientsVersion(clients, startAck.version);
  for (const client of clients) {
    assert(findAnimation(client.snapshot?.runtime, roomAnimationId), `start not visible on ${client.role}`);
  }
  rows.push({ area: "room", behavior: "start deterministic across 4 polling clients", status: "PASS" });

  const stopAck = await sendCommand("stop-animation", {
    animationId: roomAnimationId,
    priorityHint: "high",
  });
  await waitForAllClientsVersion(clients, stopAck.version);
  for (const client of clients) {
    assert(!findAnimation(client.snapshot?.runtime, roomAnimationId), `stop not visible on ${client.role}`);
  }
  rows.push({ area: "room", behavior: "stop deterministic across 4 polling clients", status: "PASS" });

  const burstIds = [mutationId("burst-a"), mutationId("burst-b"), mutationId("burst-c")];
  const burstAcks = await Promise.all(
    burstIds.map((id, index) => sendCommand("trigger-room", {
      animationId: id,
      animation: {
        id,
        type: index % 2 === 0 ? "fire" : "alarm",
        scope: "room",
        targetType: "room",
        targetId: room.id,
        roomId: room.id,
        boardId: board.id,
        hold: true,
        startedAtEpochMs: Date.now(),
      },
    })),
  );
  const burstVersion = Math.max(...burstAcks.map((entry) => Number(entry.version || 0)));
  await waitForAllClientsVersion(clients, burstVersion);

  const clearAck = await sendCommand("clear-all", {
    reason: "p7-hf2-burst-clear",
    priorityHint: "high",
  });
  await waitForAllClientsVersion(clients, clearAck.version);
  for (const client of clients) {
    const list = Array.isArray(client.snapshot?.runtime?.runningAnimations) ? client.snapshot.runtime.runningAnimations : [];
    assert(list.length === 0, `ghost state remained on ${client.role}`);
  }
  rows.push({ area: "ghost-state", behavior: "burst + clear-all leaves no residual animation", status: "PASS" });

  const telemetry = await readJson("/api/live/telemetry");
  const gates = telemetry?.telemetry?.gates ?? {};
  assert(Number(gates.commandAccepted ?? 0) > 0, "telemetry.gates.commandAccepted missing");
  assert(Number(gates.snapshotVersionVisible ?? 0) > 0, "telemetry.gates.snapshotVersionVisible missing");
  rows.push({ area: "telemetry", behavior: "command/snapshot gate counters available", status: "PASS" });

  console.log(JSON.stringify({
    pass: rows.every((row) => row.status === "PASS"),
    rows,
    clients: clients.map((client) => ({
      role: client.role,
      appliedVersion: client.appliedVersion,
    })),
    checkedAt: new Date().toISOString(),
    baseUrl,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
