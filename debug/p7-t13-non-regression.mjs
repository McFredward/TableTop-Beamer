#!/usr/bin/env node

import { setTimeout as delay } from "node:timers/promises";

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

function findGlobalAnimation(runtime, type, boardId, animationId = null) {
  const list = Array.isArray(runtime?.runningAnimations) ? runtime.runningAnimations : [];
  return list.find((entry) => (
    entry?.scope === "global"
    && entry?.type === type
    && entry?.boardId === boardId
    && (!animationId || entry?.id === animationId)
  )) ?? null;
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

  const globalAnimationId = mutationId("hf3-global");
  const globalStartAck = await sendCommand("trigger-global", {
    animationType: "alarm",
    action: "start",
    boardId: board.id,
    animation: {
      id: globalAnimationId,
      type: "alarm",
      scope: "global",
      boardId: board.id,
      hold: false,
      durationMs: 5000,
      intensity: 1,
      speed: 1,
      startedAtEpochMs: Date.now(),
    },
  });
  await waitForAllClientsVersion(clients, globalStartAck.version);
  const globalTriggerRevisions = new Set();
  const globalTriggerKeys = new Set();
  for (const client of clients) {
    const globalAnimation = findGlobalAnimation(client.snapshot?.runtime, "alarm", board.id, globalAnimationId);
    assert(globalAnimation, `global trigger missing on ${client.role}`);
    assert(Number.isInteger(Number(globalAnimation.triggerRevision)) && Number(globalAnimation.triggerRevision) > 0, `global trigger revision missing on ${client.role}`);
    assert(typeof globalAnimation.triggerKey === "string" && globalAnimation.triggerKey.length > 0, `global trigger key missing on ${client.role}`);
    globalTriggerRevisions.add(Number(globalAnimation.triggerRevision));
    globalTriggerKeys.add(globalAnimation.triggerKey);
  }
  assert(globalTriggerRevisions.size === 1, "global trigger revision mismatch across clients");
  assert(globalTriggerKeys.size === 1, "global trigger key mismatch across clients");
  rows.push({ area: "global", behavior: "snapshot trigger revision/key parity across 4 polling clients", status: "PASS" });

  await delay(1300);
  await Promise.all(clients.map((client) => pollClientOnce(client)));
  for (const client of clients) {
    const globalAnimation = findGlobalAnimation(client.snapshot?.runtime, "alarm", board.id, globalAnimationId);
    assert(globalAnimation, `global trigger ended early on ${client.role}`);
  }
  rows.push({ area: "global", behavior: "global trigger remains active without explicit snapshot stop", status: "PASS" });

  const globalStopAck = await sendCommand("trigger-global", {
    animationType: "alarm",
    action: "stop",
    animationId: globalAnimationId,
    boardId: board.id,
    priorityHint: "high",
  });
  await waitForAllClientsVersion(clients, globalStopAck.version);
  for (const client of clients) {
    const globalAnimation = findGlobalAnimation(client.snapshot?.runtime, "alarm", board.id, globalAnimationId);
    assert(!globalAnimation, `global stop not visible on ${client.role}`);
  }
  const liveStateAfterStop = await readJson("/api/live/state");
  const stopKey = `${board.id}:alarm`;
  const stopRevision = Number(liveStateAfterStop?.session?.snapshot?.runtime?.globalStopRevisions?.[stopKey] ?? 0);
  assert(stopRevision > 0, "global stop revision not recorded in snapshot runtime");
  rows.push({ area: "global", behavior: "explicit stop removes global animation and records stop revision", status: "PASS" });

  const staggerOffsetMs = 260;
  const roomDraftSyncAck = await sendCommand("context-update", {
    selectedBoard: board.id,
    selectedLayout: board.id,
    boardId: board.id,
    runtime: {
      selectedBoard: board.id,
      selectedLayout: board.id,
      roomDraft: {
        targetType: "cluster",
        targetId: "hf3-cluster",
        staggerStart: true,
        staggerOffsetMs,
      },
    },
  });
  await waitForAllClientsVersion(clients, roomDraftSyncAck.version);
  for (const client of clients) {
    const roomDraft = client.snapshot?.runtime?.roomDraft;
    assert(roomDraft?.targetType === "cluster", `roomDraft targetType drift on ${client.role}`);
    assert(Boolean(roomDraft?.staggerStart) === true, `roomDraft staggerStart drift on ${client.role}`);
    assert(Number(roomDraft?.staggerOffsetMs) === staggerOffsetMs, `roomDraft staggerOffsetMs drift on ${client.role}`);
  }
  rows.push({ area: "cluster", behavior: "stagger draft config replicated via snapshot runtime state", status: "PASS" });

  const staggerRoomIds = board.rooms.slice(0, 3).map((entry) => entry.id);
  assert(staggerRoomIds.length >= 3, "insufficient room count for sequential stagger regression");
  const staggerPlan = staggerRoomIds.map((roomId, index) => ({
    roomId,
    startDelayMs: index * staggerOffsetMs,
  }));
  const clusterAnimationId = mutationId("hf3-cluster-run");
  const memberAnimationIds = staggerPlan.map((entry) => mutationId(`hf3-member-${entry.roomId}`));
  const clusterStartAck = await sendCommand("trigger-room", {
    animationId: clusterAnimationId,
    animation: {
      id: clusterAnimationId,
      type: "alarm",
      scope: "cluster",
      boardId: board.id,
      clusterId: "hf3-cluster",
      clusterName: "HF3 Cluster",
      clusterStartMode: "staggered",
      clusterStartOffsetMs: staggerOffsetMs,
      memberRoomIds: staggerPlan.map((entry) => entry.roomId),
      memberAnimationIds,
      memberStartDelays: Object.fromEntries(staggerPlan.map((entry) => [entry.roomId, entry.startDelayMs])),
      hold: true,
      startedAtEpochMs: Date.now(),
    },
  });
  const memberStartAcks = await Promise.all(staggerPlan.map((entry, index) => sendCommand("trigger-room", {
    animationId: memberAnimationIds[index],
    animation: {
      id: memberAnimationIds[index],
      type: "alarm",
      scope: "room",
      targetType: "room",
      targetId: entry.roomId,
      roomId: entry.roomId,
      boardId: board.id,
      parentClusterRunId: clusterAnimationId,
      hold: true,
      startDelayMs: entry.startDelayMs,
      startedAtEpochMs: Date.now() + entry.startDelayMs,
    },
  })));
  const staggerVersion = Math.max(
    Number(clusterStartAck.version || 0),
    ...memberStartAcks.map((entry) => Number(entry.version || 0)),
  );
  await waitForAllClientsVersion(clients, staggerVersion);
  const expectedDelayMap = Object.fromEntries(staggerPlan.map((entry) => [entry.roomId, entry.startDelayMs]));
  for (const client of clients) {
    const clusterAnimation = findAnimation(client.snapshot?.runtime, clusterAnimationId);
    assert(clusterAnimation, `cluster animation missing on ${client.role}`);
    assert(clusterAnimation.clusterStartMode === "staggered", `cluster start mode drift on ${client.role}`);
    assert(Number(clusterAnimation.clusterStartOffsetMs) === staggerOffsetMs, `cluster offset drift on ${client.role}`);
    assert(JSON.stringify(clusterAnimation.memberStartDelays ?? {}) === JSON.stringify(expectedDelayMap), `cluster delay map drift on ${client.role}`);
  }
  rows.push({ area: "cluster", behavior: "sequential stagger member delay parity across polling clients", status: "PASS" });

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
