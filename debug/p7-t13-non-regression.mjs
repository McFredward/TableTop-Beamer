#!/usr/bin/env node

import { setTimeout as delay } from "node:timers/promises";
import { readFile } from "node:fs/promises";

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

function readRunningAnimations(runtime) {
  return Array.isArray(runtime?.runningAnimations) ? runtime.runningAnimations : [];
}

function countCrossBoardResidue(runtime, selectedBoard) {
  const normalizedSelectedBoard = typeof selectedBoard === "string" ? selectedBoard.trim() : "";
  const running = readRunningAnimations(runtime);
  if (!normalizedSelectedBoard) {
    return running.length;
  }
  return running.filter((entry) => {
    const entryBoardId = typeof entry?.boardId === "string" ? entry.boardId.trim() : "";
    return !entryBoardId || entryBoardId !== normalizedSelectedBoard;
  }).length;
}

function collectRunningIds(runtime) {
  return new Set(readRunningAnimations(runtime).map((entry) => entry?.id).filter(Boolean));
}

function assertNoUnexpectedIdsAfterStop(beforeIds, afterIds, removedIds, messagePrefix) {
  const removedSet = new Set(removedIds.filter(Boolean));
  const expectedAfter = new Set([...beforeIds].filter((id) => !removedSet.has(id)));
  const unexpected = [...afterIds].filter((id) => !expectedAfter.has(id));
  assert(unexpected.length === 0, `${messagePrefix}: unexpected animation IDs after stop (${unexpected.join(",")})`);
}

function createPollingClient(role) {
  return {
    role,
    appliedVersion: 0,
    snapshot: null,
  };
}

const HF4_ROOM_DRAFT_FIELDS = [
  "animationId",
  "targetType",
  "targetId",
  "opacity",
  "playbackSpeed",
  "intensity",
  "speed",
  "soundVolume",
  "staggerStart",
  "staggerOffsetMs",
  "durationSec",
  "hold",
];

function normalizeDraftValue(field, value) {
  switch (field) {
    case "opacity":
    case "playbackSpeed":
    case "intensity":
    case "speed":
    case "soundVolume":
      return Number(value);
    case "staggerOffsetMs":
    case "durationSec":
      return Math.round(Number(value));
    case "staggerStart":
    case "hold":
      return Boolean(value);
    default:
      return value ?? null;
  }
}

function normalizeRoomDraftForComparison(roomDraft) {
  return Object.fromEntries(HF4_ROOM_DRAFT_FIELDS.map((field) => [
    field,
    normalizeDraftValue(field, roomDraft?.[field]),
  ]));
}

function assertRoomDraftStableAcrossClients(clients, expectedDraft, messagePrefix) {
  for (const client of clients) {
    const runtimeDraft = normalizeRoomDraftForComparison(client.snapshot?.runtime?.roomDraft ?? {});
    assert(
      JSON.stringify(runtimeDraft) === JSON.stringify(expectedDraft),
      `${messagePrefix}: roomDraft drift on ${client.role}`,
    );
  }
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
  assert(boards.runtimeBoards.length >= 2, "need at least two boards for board-switch residue regression");
  const board = boards.runtimeBoards[0];
  const secondaryBoard = boards.runtimeBoards[1];
  const room = Array.isArray(board?.rooms) ? board.rooms[0] : null;
  assert(room?.id, "board seed missing room");

  const alignOnAck = await sendCommand("context-update", {
    reason: "hf5-align-on",
    selectedBoard: board.id,
    selectedLayout: board.id,
    boardId: board.id,
    alignMode: true,
    runtime: {
      alignMode: true,
    },
  });
  await waitForAllClientsVersion(clients, alignOnAck.version);
  for (const client of clients) {
    const alignMode =
      typeof client.snapshot?.alignMode === "boolean"
        ? client.snapshot.alignMode
        : Boolean(client.snapshot?.runtime?.alignMode);
    assert(alignMode === true, `align ON not visible on ${client.role}`);
  }
  rows.push({ area: "hf5", behavior: "align ON visible via context snapshot on all clients incl. final-output", status: "PASS" });

  const alignOffAck = await sendCommand("context-update", {
    reason: "hf5-align-off",
    selectedBoard: board.id,
    selectedLayout: board.id,
    boardId: board.id,
    alignMode: false,
    runtime: {
      alignMode: false,
    },
  });
  await waitForAllClientsVersion(clients, alignOffAck.version);
  for (const client of clients) {
    const alignMode =
      typeof client.snapshot?.alignMode === "boolean"
        ? client.snapshot.alignMode
        : Boolean(client.snapshot?.runtime?.alignMode);
    assert(alignMode === false, `align OFF not visible on ${client.role}`);
  }
  rows.push({ area: "hf5", behavior: "align OFF roundtrip remains deterministic across all polling clients", status: "PASS" });

  const contextAck = await sendCommand("context-update", {
    reason: "board-switch",
    contextSwitchTransactionId: mutationId("hf9-board-anchor"),
    selectedBoard: board.id,
    selectedLayout: board.id,
    boardId: board.id,
  });
  await waitForAllClientsVersion(clients, contextAck.version);
  for (const client of clients) {
    const selectedBoardId = client.snapshot?.selectedBoard ?? client.snapshot?.runtime?.selectedBoard ?? client.snapshot?.runtime?.boardId ?? null;
    assert(selectedBoardId === board.id, `context-update board anchor missing on ${client.role}`);
  }
  rows.push({ area: "sync", behavior: "context-update visible on all clients", status: "PASS" });

  const hf4DraftBaseline = {
    animationId: "fire",
    targetType: "room",
    targetId: room.id,
    opacity: 0.72,
    playbackSpeed: 1.25,
    intensity: 0.68,
    speed: 1.18,
    soundVolume: 0.63,
    staggerStart: false,
    staggerOffsetMs: 220,
    durationSec: 18,
    hold: true,
  };
  const hf4DraftAck = await sendCommand("context-update", {
    selectedBoard: board.id,
    selectedLayout: board.id,
    boardId: board.id,
    runtime: {
      selectedBoard: board.id,
      selectedLayout: board.id,
      roomDraft: hf4DraftBaseline,
    },
  });
  await waitForAllClientsVersion(clients, hf4DraftAck.version);
  const expectedDraft = normalizeRoomDraftForComparison(hf4DraftBaseline);
  assertRoomDraftStableAcrossClients(clients, expectedDraft, "hf4 baseline");
  rows.push({ area: "hf4", behavior: "draft baseline replicated without drift", status: "PASS" });

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
  await delay(420);
  await Promise.all(clients.map((client) => pollClientOnce(client)));
  for (const client of clients) {
    const selectedBoardId = client.snapshot?.selectedBoard ?? client.snapshot?.runtime?.selectedBoard ?? client.snapshot?.runtime?.boardId ?? null;
    assert(selectedBoardId === board.id, `board drifted before hf9 draft-sync check on ${client.role}`);
    assert(findAnimation(client.snapshot?.runtime, roomAnimationId), `room start did not persist before stop on ${client.role}`);
  }
  const hf9DraftSyncAck = await sendCommand("context-update", {
    reason: "room-draft-sync",
    runtime: {
      roomDraft: {
        ...hf4DraftBaseline,
        targetType: "room",
        targetId: room.id,
      },
    },
  });
  await waitForAllClientsVersion(clients, hf9DraftSyncAck.version);
  for (const client of clients) {
    const selectedBoardId = client.snapshot?.selectedBoard ?? client.snapshot?.runtime?.selectedBoard ?? client.snapshot?.runtime?.boardId ?? null;
    assert(selectedBoardId === board.id, `room-draft sync unexpectedly switched board on ${client.role} (expected ${board.id}, got ${selectedBoardId ?? "null"})`);
    assert(findAnimation(client.snapshot?.runtime, roomAnimationId), `room start was neutralized by room-draft sync on ${client.role}`);
  }
  assertRoomDraftStableAcrossClients(clients, expectedDraft, "hf4 room-start stability");
  rows.push({ area: "room", behavior: "start deterministic across 4 polling clients", status: "PASS" });
  rows.push({ area: "hf4", behavior: "room start keeps draft animation/target/sliders stable (no jump to cluster/Malfunction)", status: "PASS" });
  rows.push({ area: "hf9", behavior: "room start survives trailing room-draft context mutation without board/status rollback", status: "PASS" });

  const roomStopBaselineByRole = Object.fromEntries(clients.map((client) => [
    client.role,
    collectRunningIds(client.snapshot?.runtime),
  ]));
  const stopAck = await sendCommand("stop-animation", {
    animationId: roomAnimationId,
    priorityHint: "high",
  });
  await waitForAllClientsVersion(clients, stopAck.version);
  for (const client of clients) {
    assert(!findAnimation(client.snapshot?.runtime, roomAnimationId), `stop not visible on ${client.role}`);
    const afterIds = collectRunningIds(client.snapshot?.runtime);
    assertNoUnexpectedIdsAfterStop(
      roomStopBaselineByRole[client.role],
      afterIds,
      [roomAnimationId],
      `room-stop-no-id-increment on ${client.role}`,
    );
  }
  rows.push({ area: "room", behavior: "stop deterministic across 4 polling clients", status: "PASS" });
  rows.push({ area: "hf7", behavior: "room stop keeps anim-id set monotonic (no increment/retrigger)", status: "PASS" });

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

  const globalStopBaselineByRole = Object.fromEntries(clients.map((client) => [
    client.role,
    collectRunningIds(client.snapshot?.runtime),
  ]));
  const globalStopAck = await sendCommand("stop-animation", {
    animationId: globalAnimationId,
    priorityHint: "high",
  });
  await waitForAllClientsVersion(clients, globalStopAck.version);
  for (const client of clients) {
    const globalAnimation = findGlobalAnimation(client.snapshot?.runtime, "alarm", board.id, globalAnimationId);
    assert(!globalAnimation, `global stop not visible on ${client.role}`);
    const afterIds = collectRunningIds(client.snapshot?.runtime);
    assertNoUnexpectedIdsAfterStop(
      globalStopBaselineByRole[client.role],
      afterIds,
      [globalAnimationId],
      `global-stop-no-id-increment on ${client.role}`,
    );
  }
  const liveStateAfterStop = await readJson("/api/live/state");
  const stopKey = `${board.id}:alarm`;
  const stopRevision = Number(liveStateAfterStop?.session?.snapshot?.runtime?.globalStopRevisions?.[stopKey] ?? 0);
  assert(stopRevision > 0, "global stop revision not recorded in snapshot runtime");
  rows.push({ area: "global", behavior: "explicit stop removes global animation and records stop revision", status: "PASS" });
  rows.push({ area: "hf7", behavior: "global stop via stop-animation keeps anim-id non-increment invariant", status: "PASS" });

  const outsideAnimationId = mutationId("hf8-global-outside");
  const outsideStartAck = await sendCommand("trigger-global", {
    animationType: "outside-space",
    action: "start",
    boardId: board.id,
    outsideHint: true,
    animation: {
      id: outsideAnimationId,
      type: "outside-space",
      scope: "global",
      boardId: board.id,
      hold: true,
      durationMs: null,
      intensity: 1,
      speed: 1,
      startedAtEpochMs: Date.now(),
    },
  });
  await waitForAllClientsVersion(clients, outsideStartAck.version);
  for (const client of clients) {
    assert(findGlobalAnimation(client.snapshot?.runtime, "outside-space", board.id, outsideAnimationId), `global-outside start missing on ${client.role}`);
  }
  await delay(420);
  await Promise.all(clients.map((client) => pollClientOnce(client)));
  for (const client of clients) {
    assert(findGlobalAnimation(client.snapshot?.runtime, "outside-space", board.id, outsideAnimationId), `global-outside lifecycle did not persist before stop on ${client.role}`);
  }
  rows.push({ area: "hf8", behavior: "global-outside start is visible across all clients incl. final-output", status: "PASS" });
  rows.push({ area: "hf9", behavior: "global-outside lifecycle persists until explicit stop", status: "PASS" });

  const outsideStopBaselineByRole = Object.fromEntries(clients.map((client) => [
    client.role,
    collectRunningIds(client.snapshot?.runtime),
  ]));
  const outsideStopAck = await sendCommand("stop-animation", {
    animationId: outsideAnimationId,
    priorityHint: "high",
    targetScope: "global",
    targetType: "outside-space",
    boardId: board.id,
    outsideHint: true,
  });
  await waitForAllClientsVersion(clients, outsideStopAck.version);
  for (const client of clients) {
    const outsideAnimation = findGlobalAnimation(client.snapshot?.runtime, "outside-space", board.id, outsideAnimationId);
    assert(!outsideAnimation, `global-outside stop not visible on ${client.role}`);
    const afterIds = collectRunningIds(client.snapshot?.runtime);
    assertNoUnexpectedIdsAfterStop(
      outsideStopBaselineByRole[client.role],
      afterIds,
      [outsideAnimationId],
      `global-outside-stop-no-id-increment on ${client.role}`,
    );
  }
  const outsideStateAfterStop = await readJson("/api/live/state");
  const outsideProfileByBoard =
    outsideStateAfterStop?.session?.snapshot?.outsideFxByBoard
    ?? outsideStateAfterStop?.session?.snapshot?.runtime?.outsideFxByBoard
    ?? {};
  assert(
    outsideProfileByBoard?.[board.id]?.enabled === false,
    "global-outside stop did not disable outsideFx enabled flag",
  );
  rows.push({ area: "hf8", behavior: "global-outside stop is stop-only/idempotent and disables outsideFx on authoritative snapshot", status: "PASS" });

  const staggerOffsetMs = 260;
  const hf4ClusterDraft = {
    ...hf4DraftBaseline,
    targetType: "cluster",
    targetId: "hf3-cluster",
    staggerStart: true,
    staggerOffsetMs,
  };
  const roomDraftSyncAck = await sendCommand("context-update", {
    selectedBoard: board.id,
    selectedLayout: board.id,
    boardId: board.id,
    runtime: {
      selectedBoard: board.id,
      selectedLayout: board.id,
      roomDraft: hf4ClusterDraft,
    },
  });
  await waitForAllClientsVersion(clients, roomDraftSyncAck.version);
  const expectedClusterDraft = normalizeRoomDraftForComparison(hf4ClusterDraft);
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
  await delay(420);
  await Promise.all(clients.map((client) => pollClientOnce(client)));
  for (const client of clients) {
    const runtime = client.snapshot?.runtime;
    assert(findAnimation(runtime, clusterAnimationId), `cluster run did not persist before stop on ${client.role}`);
    for (const memberId of memberAnimationIds) {
      assert(findAnimation(runtime, memberId), `cluster member ${memberId} ended early on ${client.role}`);
    }
  }
  assertRoomDraftStableAcrossClients(clients, expectedClusterDraft, "hf4 cluster-start stability");
  rows.push({ area: "cluster", behavior: "sequential stagger member delay parity across polling clients", status: "PASS" });
  rows.push({ area: "hf4", behavior: "cluster start keeps draft target path stable", status: "PASS" });
  rows.push({ area: "hf9", behavior: "cluster lifecycle persists until explicit stop (no implicit cleanup)", status: "PASS" });

  const clusterStopBaselineByRole = Object.fromEntries(clients.map((client) => [
    client.role,
    collectRunningIds(client.snapshot?.runtime),
  ]));
  const clusterStopAck = await sendCommand("stop-animation", {
    animationId: clusterAnimationId,
    priorityHint: "high",
  });
  await waitForAllClientsVersion(clients, clusterStopAck.version);
  for (const client of clients) {
    const runtime = client.snapshot?.runtime;
    assert(!findAnimation(runtime, clusterAnimationId), `cluster controller stop not visible on ${client.role}`);
    for (const memberId of memberAnimationIds) {
      assert(!findAnimation(runtime, memberId), `cluster member ${memberId} still running on ${client.role}`);
    }
    const afterIds = collectRunningIds(runtime);
    assertNoUnexpectedIdsAfterStop(
      clusterStopBaselineByRole[client.role],
      afterIds,
      [clusterAnimationId, ...memberAnimationIds],
      `cluster-stop-no-id-increment on ${client.role}`,
    );
  }
  rows.push({ area: "cluster", behavior: "cluster stop propagates to all members on all clients incl. final-output", status: "PASS" });
  rows.push({ area: "hf7", behavior: "cluster stop keeps anim-id non-increment invariant", status: "PASS" });

  const appSource = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert(
    /polygon\.addEventListener\("click",\s*\(\)\s*=>[\s\S]*applyRoomDraftTargetFromRoomClick\(room\.id\)/.test(appSource),
    "room-click target autofill handler missing",
  );
  assert(
    /function applyRoomDraftTargetFromRoomClick\(roomId\)[\s\S]*state\.roomDraft\.targetType = "room";[\s\S]*state\.roomDraft\.targetId = normalizedRoomId;/.test(appSource),
    "room-click target autofill no longer target-only",
  );
  rows.push({ area: "hf4", behavior: "room-click target autofill remains target-only path", status: "PASS" });

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
    const list = readRunningAnimations(client.snapshot?.runtime);
    assert(list.length === 0, `ghost state remained on ${client.role}`);
  }
  rows.push({ area: "ghost-state", behavior: "burst + clear-all leaves no residual animation", status: "PASS" });

  const residueAnimationId = mutationId("hf5-residue");
  const residueStartAck = await sendCommand("trigger-room", {
    animationId: residueAnimationId,
    animation: {
      id: residueAnimationId,
      type: "fire",
      scope: "room",
      targetType: "room",
      targetId: room.id,
      roomId: room.id,
      boardId: board.id,
      hold: true,
      startedAtEpochMs: Date.now(),
    },
  });
  await waitForAllClientsVersion(clients, residueStartAck.version);
  for (const client of clients) {
    assert(findAnimation(client.snapshot?.runtime, residueAnimationId), `hf5 residue seed start missing on ${client.role}`);
  }

  const boardSwitchAck = await sendCommand("context-update", {
    reason: "hf5-board-switch",
    contextSwitchTransactionId: mutationId("hf6-context-switch"),
    selectedBoard: secondaryBoard.id,
    selectedLayout: secondaryBoard.id,
    boardId: secondaryBoard.id,
    runtime: {
      selectedBoard: secondaryBoard.id,
      selectedLayout: secondaryBoard.id,
    },
  });
  await waitForAllClientsVersion(clients, boardSwitchAck.version);
  let crossBoardResidueCount = 0;
  for (const client of clients) {
    const runtime = client.snapshot?.runtime;
    const list = readRunningAnimations(runtime);
    assert(list.length === 0, `running residue remained after board switch on ${client.role}`);
    const selectedBoardId = client.snapshot?.selectedBoard ?? runtime?.selectedBoard ?? runtime?.boardId ?? null;
    assert(selectedBoardId === secondaryBoard.id, `selected board drifted after board switch on ${client.role}`);
    crossBoardResidueCount += countCrossBoardResidue(runtime, selectedBoardId);
  }
  assert(crossBoardResidueCount === 0, `cross-board residue detected after board switch: ${crossBoardResidueCount}`);
  rows.push({ area: "hf5", behavior: "board switch atomically clears running list on all clients", status: "PASS" });

  const reconnectClient = createPollingClient("reconnect-final-output");
  await pollClientOnce(reconnectClient);
  assert(Number(reconnectClient.appliedVersion) >= Number(boardSwitchAck.version), "reconnect client did not hydrate current board-switch version");
  const reconnectRuntime = reconnectClient.snapshot?.runtime;
  const reconnectList = readRunningAnimations(reconnectRuntime);
  assert(reconnectList.length === 0, "reconnect snapshot rehydrated stale running entries after board switch");
  const reconnectBoardId = reconnectClient.snapshot?.selectedBoard ?? reconnectRuntime?.selectedBoard ?? reconnectRuntime?.boardId ?? null;
  assert(reconnectBoardId === secondaryBoard.id, "reconnect snapshot selected wrong board after board switch");
  crossBoardResidueCount += countCrossBoardResidue(reconnectRuntime, reconnectBoardId);
  assert(crossBoardResidueCount === 0, `cross-board residue detected after reconnect hydration: ${crossBoardResidueCount}`);
  rows.push({ area: "hf5", behavior: "reconnect snapshot keeps board-switch running-clear no-residue parity", status: "PASS" });
  rows.push({ area: "hf6", behavior: "switch + reconnect keeps crossBoardResidueCount = 0 across clients incl. final-output", status: "PASS" });
  rows.push({ area: "hf7", behavior: "room/global/cluster stop matrix parity holds across control + final-output clients", status: "PASS" });
  rows.push({ area: "hf8", behavior: "all-scope stop matrix parity holds for room/global-inside/global-outside/cluster", status: "PASS" });

  const telemetry = await readJson("/api/live/telemetry");
  const gates = telemetry?.telemetry?.gates ?? {};
  assert(Number(gates.commandAccepted ?? 0) > 0, "telemetry.gates.commandAccepted missing");
  assert(Number(gates.snapshotVersionVisible ?? 0) > 0, "telemetry.gates.snapshotVersionVisible missing");
  rows.push({ area: "telemetry", behavior: "command/snapshot gate counters available", status: "PASS" });

  const appSourceForHover = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const stylesSource = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  assert(/function isRunningListInteractionActive\(\)/.test(appSourceForHover), "running-list interaction guard helper missing");
  assert(/now - lastListRenderAt > 500[\s\S]*!isRunningListInteractionActive\(\)/.test(appSourceForHover), "periodic running-list refresh is not interaction-guarded");
  assert(/\.running-actions button:hover,[\s\S]*\.running-actions button:focus-visible[\s\S]*transform: none;/.test(stylesSource), "running action hover/focus style stabilization missing");
  rows.push({ area: "hf8", behavior: "running-list hover style guard is stable (no periodic hover flicker loop)", status: "PASS" });
  assert(/function switchBoard\(boardId, \{ emitLiveContext = false, reason = "board-switch", announceStatus = true \} = \{\}\)/.test(appSourceForHover), "switchBoard announceStatus guard missing");
  assert(/function syncRuntimePanelsFromState\(\) \{[\s\S]*switchBoard\(state\.boardId, \{ announceStatus: false \}\);/.test(appSourceForHover), "runtime sync still emits board switched status");
  rows.push({ area: "hf9", behavior: "board-switched status stays contextual and does not mask snapshot start lifecycle updates", status: "PASS" });

  console.log(JSON.stringify({
    pass: rows.every((row) => row.status === "PASS"),
    rows,
    clients: clients.map((client) => ({
      role: client.role,
      appliedVersion: client.appliedVersion,
    })),
    checkedAt: new Date().toISOString(),
    baseUrl,
    crossBoardResidueCount,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
