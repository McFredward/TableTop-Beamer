#!/usr/bin/env node

import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const boardId = process.env.TT_BEAMER_BOARD_ID ?? "nemesis-board-a";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function mutationId(label) {
  return `hf10-${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function readJson(path, init = undefined) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}) ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function sendCommand(mutationType, payload, label) {
  const id = mutationId(label);
  const ack = await readJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      mutationId: id,
      mutationType,
      role: "control",
      clientId: "hf10-smoke",
      payload,
    }),
  });
  assert(ack?.ok === true, `${mutationType} ack missing ok=true`);
  assert(ack?.commandAccepted === true, `${mutationType} command not accepted`);
  assert(ack?.applied === true, `${mutationType} command not applied`);
  return ack;
}

function runningIds(snapshot) {
  const runtime = snapshot?.session?.snapshot?.runtime;
  const running = Array.isArray(runtime?.runningAnimations) ? runtime.runningAnimations : [];
  return new Set(running.map((entry) => entry?.id).filter(Boolean));
}

function findAnimation(snapshot, animationId) {
  const runtime = snapshot?.session?.snapshot?.runtime;
  const running = Array.isArray(runtime?.runningAnimations) ? runtime.runningAnimations : [];
  return running.find((entry) => entry?.id === animationId) ?? null;
}

async function readSnapshot() {
  return readJson("/api/live/snapshot?sinceVersion=0");
}

async function waitFor(assertion, { timeoutMs = 2400, intervalMs = 120, failMessage = "condition not met" } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() <= deadline) {
    try {
      const value = await assertion();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMs);
  }
  if (lastError) {
    throw lastError;
  }
  throw new Error(failMessage);
}

async function main() {
  const timeline = [];
  const mark = (event, detail = {}) => {
    timeline.push({
      at: new Date().toISOString(),
      event,
      ...detail,
    });
  };

  const roomId = "room-a-01";
  const roomAnimationId = mutationId("room-start");
  const globalInsideAnimationId = mutationId("global-inside-start");
  const clusterAnimationId = mutationId("cluster-start");
  const clusterMemberAnimationId = mutationId("cluster-member");

  const contextAck = await sendCommand("context-update", {
    reason: "hf10-smoke-bootstrap",
    contextSwitchTransactionId: mutationId("context-switch"),
    selectedBoard: boardId,
    selectedLayout: boardId,
    boardId,
    layoutId: boardId,
  }, "context");
  mark("context-bootstrap-ack", { version: contextAck.version });

  const clearAck = await sendCommand("clear-all", {
    reason: "hf10-smoke-reset",
    boardId,
    priorityHint: "high",
  }, "clear-initial");
  mark("clear-all-initial-ack", { version: clearAck.version });

  const roomAck = await sendCommand("trigger-room", {
    boardId,
    animationId: roomAnimationId,
    targetScope: "room",
    targetType: "kaputt",
    animation: {
      id: roomAnimationId,
      boardId,
      scope: "room",
      roomId,
      type: "kaputt",
      hold: true,
      durationMs: null,
      startedAtEpochMs: Date.now(),
    },
  }, "start-room");
  mark("start-room-ack", { version: roomAck.version, animationId: roomAnimationId });

  const globalInsideAck = await sendCommand("trigger-global", {
    boardId,
    animationType: "intruder-alert",
    action: "start",
    targetScope: "global",
    targetType: "intruder-alert",
    animation: {
      id: globalInsideAnimationId,
      boardId,
      scope: "global",
      type: "intruder-alert",
      hold: true,
      durationMs: null,
      startedAtEpochMs: Date.now(),
    },
  }, "start-global-inside");
  mark("start-global-inside-ack", { version: globalInsideAck.version, animationId: globalInsideAnimationId });

  const clusterAck = await sendCommand("trigger-room", {
    boardId,
    animationId: clusterAnimationId,
    targetScope: "cluster",
    targetType: "kaputt",
    animation: {
      id: clusterAnimationId,
      boardId,
      scope: "cluster",
      type: "kaputt",
      clusterId: "hf10-smoke-cluster",
      clusterName: "HF10 Smoke Cluster",
      memberRoomIds: [roomId],
      memberAnimationIds: [clusterMemberAnimationId],
      hold: true,
      durationMs: null,
      startedAtEpochMs: Date.now(),
    },
  }, "start-cluster");
  mark("start-cluster-ack", { version: clusterAck.version, animationId: clusterAnimationId });

  const clusterMemberAck = await sendCommand("trigger-room", {
    boardId,
    animationId: clusterMemberAnimationId,
    targetScope: "room",
    targetType: "kaputt",
    animation: {
      id: clusterMemberAnimationId,
      boardId,
      scope: "room",
      roomId,
      parentClusterRunId: clusterAnimationId,
      type: "kaputt",
      hold: true,
      durationMs: null,
      startedAtEpochMs: Date.now(),
    },
  }, "start-cluster-member");
  mark("start-cluster-member-ack", { version: clusterMemberAck.version, animationId: clusterMemberAnimationId });

  await waitFor(async () => {
    const snapshot = await readSnapshot();
    const ids = runningIds(snapshot);
    return ids.has(roomAnimationId)
      && ids.has(globalInsideAnimationId)
      && ids.has(clusterAnimationId)
      && ids.has(clusterMemberAnimationId)
      ? snapshot
      : null;
  }, { failMessage: "start smoke failed: room/global-inside/cluster not concurrently active" });

  const persistenceSamples = [];
  const persistenceChecks = 6;
  for (let index = 0; index < persistenceChecks; index += 1) {
    await delay(150);
    const snapshot = await readSnapshot();
    const ids = runningIds(snapshot);
    const allActive = ids.has(roomAnimationId)
      && ids.has(globalInsideAnimationId)
      && ids.has(clusterAnimationId)
      && ids.has(clusterMemberAnimationId);
    persistenceSamples.push({
      index,
      version: snapshot?.session?.version ?? null,
      allActive,
      activeIds: [...ids],
    });
    assert(allActive, `persistence sample ${index} failed: start set did not remain active`);
  }
  mark("persistence-window-pass", { sampleCount: persistenceSamples.length });

  const stopRoomAck = await sendCommand("stop-animation", {
    boardId,
    animationId: roomAnimationId,
    targetScope: "room",
    targetType: "kaputt",
    priorityHint: "high",
  }, "stop-room");
  mark("stop-room-ack", { version: stopRoomAck.version });

  await waitFor(async () => {
    const snapshot = await readSnapshot();
    const ids = runningIds(snapshot);
    return !ids.has(roomAnimationId) && ids.has(globalInsideAnimationId) && ids.has(clusterAnimationId)
      ? snapshot
      : null;
  }, { failMessage: "stop smoke failed: room stop did not apply while others stayed active" });
  mark("stop-room-visibility-pass");

  const clearFinalAck = await sendCommand("clear-all", {
    boardId,
    priorityHint: "high",
    reason: "hf10-smoke-final-clear",
  }, "clear-final");
  mark("clear-all-final-ack", { version: clearFinalAck.version });

  const finalSnapshot = await waitFor(async () => {
    const snapshot = await readSnapshot();
    const ids = runningIds(snapshot);
    return ids.size === 0 ? snapshot : null;
  }, { failMessage: "final clear smoke failed: running list not empty" });
  mark("clear-all-visibility-pass", { finalVersion: finalSnapshot?.session?.version ?? null });

  const finalRuntime = finalSnapshot?.session?.snapshot?.runtime ?? {};
  assert(finalSnapshot?.session?.snapshot?.selectedBoard === boardId, "selectedBoard drifted during smoke run");
  assert(!findAnimation(finalSnapshot, roomAnimationId), "room animation still present after clear");
  assert(!findAnimation(finalSnapshot, globalInsideAnimationId), "global-inside animation still present after clear");
  assert(!findAnimation(finalSnapshot, clusterAnimationId), "cluster animation still present after clear");

  console.log(JSON.stringify({
    pass: true,
    gate: "HF10 hard smoke",
    boardId,
    versions: {
      context: contextAck.version,
      clearInitial: clearAck.version,
      roomStart: roomAck.version,
      globalInsideStart: globalInsideAck.version,
      clusterStart: clusterAck.version,
      clusterMemberStart: clusterMemberAck.version,
      stopRoom: stopRoomAck.version,
      clearFinal: clearFinalAck.version,
      finalSnapshot: finalSnapshot?.session?.version ?? null,
    },
    assertions: {
      startVisibility: true,
      persistenceUntilStopOrClear: true,
      stopRoomAppliedWithoutGlobalNeutralization: true,
      clearAllLeavesRunningEmpty: true,
      selectedBoardStable: finalSnapshot?.session?.snapshot?.selectedBoard === boardId,
      globalTriggerRevisionsPresent: typeof finalRuntime.globalTriggerRevisions === "object",
      globalStopRevisionsPresent: typeof finalRuntime.globalStopRevisions === "object",
    },
    persistenceSamples,
    timeline,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    pass: false,
    gate: "HF10 hard smoke",
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});
