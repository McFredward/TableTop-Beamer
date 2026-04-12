import { createServer } from "node:http";
import { readFile, writeFile, stat, appendFile, mkdir, readdir, rename } from "node:fs/promises";
import { createReadStream, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFairQueueState,
  dequeueFairMutation,
  createApplySliceController,
} from "./src/live/hf9-command-pipeline.mjs";

const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.PORT ?? 4173);
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GLOBAL_DEFAULTS_PATH = path.join(ROOT_DIR, "config", "global-defaults.json");
const LIVE_LOG_PATH = process.env.TT_BEAMER_LIVE_LOG_PATH ?? path.join(ROOT_DIR, "logs", "live-sync.jsonl");
const ZONES_DIR = path.join(ROOT_DIR, "config", "zones");
const BOARD_STORAGE_DIR = path.join(ROOT_DIR, "config", "boards");
const LEGACY_IMPORTED_BOARDS_DIR = path.join(BOARD_STORAGE_DIR, "imported");
const BOARD_ASSETS_DIR = path.join(BOARD_STORAGE_DIR, "assets");
const RESOURCES_DIR = path.join(ROOT_DIR, "resources");

const BOARD_CATALOG_SCHEMA = "tt-beamer.board-catalog.v1";
const BOARD_DEFINITION_SCHEMA = "tt-beamer.board-definition.v1";
const BOARD_IMPORT_SCHEMA = "tt-beamer.board-import.v1";
// Phase 16: no more builtin board IDs — all boards are catalog entries.
const BUILTIN_BOARD_IDS = new Set();

const LIVE_STATE_SCHEMA = "tt-beamer.live-state.v1";

const liveSessionState = {
  version: 0,
  updatedAt: new Date().toISOString(),
  lastMutation: null,
  snapshot: {
    schema: LIVE_STATE_SCHEMA,
    alignMode: false,
    selectedBoard: null,
    selectedLayout: null,
    outsideFxByBoard: {},
    runtime: null,
  },
};

const liveClients = new Map();
const processedMutations = new Map();
const lastClientSequenceById = new Map();
const lastBroadcastVersionByClient = new Map();
const MAX_PROCESSED_MUTATIONS = 4000;
const LIVE_MUTATION_TYPES = new Set([
  "trigger-global",
  "trigger-room",
  "edit-room",
  "stop-animation",
  "clear-all",
  "align-toggle",
  "outside-update",
  "context-update",
]);
const CONTROL_CRITICAL_MUTATIONS = new Set(["stop-animation", "clear-all"]);
const NON_COALESCING_MUTATIONS = new Set([
  "trigger-global",
  "trigger-room",
  "edit-room",
  "stop-animation",
  "clear-all",
  "align-toggle",
]);
const LIVE_QUEUE_MAX_SIZE = 512;
const LIVE_COALESCE_CLASS_MAX_SIZE = 96;
const LIVE_APPLY_SLICE_BUDGET_MS = 8;
const GLOBAL_ONE_SHOT_DEFAULT_DURATION_MS = 4_000;

const liveMutationQueue = {
  control: [],
  state: [],
  noisy: [],
  processing: false,
  queued: 0,
  droppedOverflow: 0,
  coalesced: 0,
  maxDepthObserved: 0,
  droppedByClass: {
    "control-critical": 0,
    "state-sync": 0,
    "config-noisy": 0,
  },
};
const liveFairQueueState = createFairQueueState();
const liveApplySliceController = createApplySliceController({
  budgetMs: LIVE_APPLY_SLICE_BUDGET_MS,
  now: () => Date.now(),
});

const liveTelemetry = {
  hops: {
    ingestToCommit: [],
    commitToClientAck: [],
    commitToApplyAck: [],
  },
  gates: {
    commandAccepted: 0,
    snapshotVersionVisible: 0,
    snapshotApplied: 0,
    ghostStateDetections: 0,
    duplicateCommands: 0,
    staleCommands: 0,
  },
  perClient: new Map(),
};
const LIVE_TELEMETRY_SAMPLE_LIMIT = 5000;

async function appendLiveLog(className, payload = {}) {
  const entry = {
    ts: new Date().toISOString(),
    class: className,
    ...payload,
  };
  try {
    await mkdir(path.dirname(LIVE_LOG_PATH), { recursive: true });
    await appendFile(LIVE_LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    console.error("[live-log] failed to write log entry", error);
  }
}

function logSessionEvent(event, context = {}) {
  void appendLiveLog("session_event", {
    event,
    ...context,
  });
}

function logStateChange(mutationType, context = {}) {
  void appendLiveLog("state_change", {
    mutationType,
    ...context,
  });
}

function logErrorEvent(event, detail, context = {}) {
  void appendLiveLog("error", {
    event,
    detail,
    ...context,
  });
}

function rememberProcessedMutation(key, value) {
  processedMutations.set(key, value);
  if (processedMutations.size <= MAX_PROCESSED_MUTATIONS) {
    return;
  }
  const oldestKey = processedMutations.keys().next().value;
  if (oldestKey) {
    processedMutations.delete(oldestKey);
  }
}

function acceptLiveMutationType(type) {
  return LIVE_MUTATION_TYPES.has(type);
}

function classifyLiveMutationType(type, payload = null) {
  if (payload?.priorityHint === "high" || CONTROL_CRITICAL_MUTATIONS.has(type) || (type === "trigger-global" && payload?.action === "stop")) {
    return "control-critical";
  }
  if (type === "outside-update" && normalizeNonEmptyString(payload?.reason) === "outside-apply-changes") {
    return "state-sync";
  }
  if (type === "outside-update" || type === "context-update") {
    return "config-noisy";
  }
  return "state-sync";
}

function resolveMutationPriority(type, payload = null) {
  if (payload?.priorityHint === "high" || CONTROL_CRITICAL_MUTATIONS.has(type) || (type === "trigger-global" && payload?.action === "stop")) {
    return "high";
  }
  if (type === "outside-update" && normalizeNonEmptyString(payload?.reason) === "outside-apply-changes") {
    return "normal";
  }
  if (type === "outside-update" || type === "context-update") {
    return "low";
  }
  return "normal";
}

function recordLiveHopSample(bucket, value) {
  if (!Array.isArray(bucket) || !Number.isFinite(value) || value < 0) {
    return;
  }
  bucket.push(value);
  if (bucket.length > LIVE_TELEMETRY_SAMPLE_LIMIT) {
    bucket.shift();
  }
}

function upsertClientTelemetry(clientId, role) {
  if (!liveTelemetry.perClient.has(clientId)) {
    liveTelemetry.perClient.set(clientId, {
      role,
      commitToAck: [],
      commitToApplyAck: [],
      lastAckAt: null,
      lastApplyAckAt: null,
    });
  }
  const current = liveTelemetry.perClient.get(clientId);
  if (role) {
    current.role = role;
  }
  return current;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function resolveAnimationStartEpochMs(animation, nowEpochMs = Date.now()) {
  const directEpoch = Number(animation?.startedAtEpochMs);
  if (Number.isFinite(directEpoch)) {
    return directEpoch;
  }
  const startedAtPerf = Number(animation?.startedAt);
  if (!Number.isFinite(startedAtPerf)) {
    return nowEpochMs;
  }
  return nowEpochMs;
}

function isAnimationActiveForSnapshot(animation, nowEpochMs = Date.now()) {
  if (!isPlainObject(animation)) {
    return false;
  }
  if (animation.hold === true) {
    return true;
  }
  const durationMs = Number(animation.durationMs);
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return true;
  }
  const hasExplicitStart = Number.isFinite(Number(animation?.startedAtEpochMs)) || Number.isFinite(Number(animation?.startedAt));
  if (!hasExplicitStart) {
    return false;
  }
  const startedAtEpochMs = resolveAnimationStartEpochMs(animation, nowEpochMs);
  return startedAtEpochMs + durationMs > nowEpochMs;
}

function reconcileSnapshotRunningAnimations(runningAnimations, nowEpochMs = Date.now()) {
  return (Array.isArray(runningAnimations) ? runningAnimations : [])
    .filter((animation) => isAnimationActiveForSnapshot(animation, nowEpochMs));
}

function isBoardContextSuppressedReason(reason) {
  const normalized = normalizeNonEmptyString(reason);
  if (!normalized) {
    return false;
  }
  return normalized === "room-draft-sync" || normalized === "align-toggle";
}

function readRuntimeSnapshot() {
  return isPlainObject(liveSessionState.snapshot.runtime) ? cloneJson(liveSessionState.snapshot.runtime) : {};
}

function readOutsideFxByBoard() {
  const topLevel = isPlainObject(liveSessionState.snapshot.outsideFxByBoard)
    ? cloneJson(liveSessionState.snapshot.outsideFxByBoard)
    : {};
  const runtime = readRuntimeSnapshot();
  const runtimeOutside = isPlainObject(runtime.outsideFxByBoard) ? runtime.outsideFxByBoard : {};
  return {
    ...runtimeOutside,
    ...topLevel,
  };
}

function applyOutsideUpdatePatch(payload) {
  const nextRuntime = readRuntimeSnapshot();
  const outsideFxByBoard = readOutsideFxByBoard();
  const targetBoardId = normalizeNonEmptyString(payload?.outsideBoardId) ?? null;

  if (isPlainObject(payload?.outsideFxByBoard)) {
    for (const [boardId, profile] of Object.entries(payload.outsideFxByBoard)) {
      if (!boardId || !isPlainObject(profile)) {
        continue;
      }
      outsideFxByBoard[boardId] = {
        ...(isPlainObject(outsideFxByBoard[boardId]) ? outsideFxByBoard[boardId] : {}),
        ...profile,
      };
    }
  }

  if (targetBoardId && isPlainObject(payload?.outsideFx)) {
    outsideFxByBoard[targetBoardId] = {
      ...(isPlainObject(outsideFxByBoard[targetBoardId]) ? outsideFxByBoard[targetBoardId] : {}),
      ...payload.outsideFx,
    };
  }

  nextRuntime.outsideFxByBoard = outsideFxByBoard;
  return {
    runtime: nextRuntime,
    outsideFxByBoard,
    ...(targetBoardId
      ? {
        selectedBoard: targetBoardId,
        selectedLayout: targetBoardId,
      }
      : {}),
  };
}

function applyRoomMutationPatch(mutationType, payload) {
  const nextRuntime = readRuntimeSnapshot();
  const runningAnimations = Array.isArray(nextRuntime.runningAnimations) ? cloneJson(nextRuntime.runningAnimations) : [];
  const globalStopRevisions = isPlainObject(nextRuntime.globalStopRevisions)
    ? { ...nextRuntime.globalStopRevisions }
    : {};
  let globalClearRevision = Number(nextRuntime.globalClearRevision) || 0;
  const stopAnimationId = normalizeNonEmptyString(payload?.animationId);
  const stopTargetScope = normalizeNonEmptyString(payload?.targetScope);
  const stopTargetType = normalizeNonEmptyString(payload?.targetType);
  const stopTargetBoardId = normalizeNonEmptyString(payload?.boardId);
  const payloadBoardId =
    normalizeNonEmptyString(payload?.boardId)
    ?? normalizeNonEmptyString(payload?.animation?.boardId)
    ?? normalizeNonEmptyString(payload?.runtime?.selectedBoard)
    ?? normalizeNonEmptyString(payload?.runtime?.boardId)
    ?? null;
  const inferredRunningBoardId = normalizeNonEmptyString(runningAnimations[0]?.boardId) ?? null;
  const authoritativeBoardId =
    payloadBoardId
    ?? inferredRunningBoardId
    ?? normalizeNonEmptyString(nextRuntime?.selectedBoard)
    ?? normalizeNonEmptyString(nextRuntime?.boardId)
    ?? normalizeNonEmptyString(liveSessionState.snapshot?.selectedBoard)
    ?? null;
  let outsideFxByBoardPatch = null;

  if (authoritativeBoardId) {
    nextRuntime.selectedBoard = authoritativeBoardId;
    nextRuntime.boardId = authoritativeBoardId;
  }

  if (mutationType === "trigger-room" && isPlainObject(payload?.animation) && typeof payload.animation.id === "string") {
    const existingIndex = runningAnimations.findIndex((entry) => entry?.id === payload.animation.id);
    if (existingIndex === -1) {
      runningAnimations.push(cloneJson(payload.animation));
    }
  } else if (
    mutationType === "edit-room" &&
    isPlainObject(payload?.animation) &&
    typeof payload.animation.id === "string"
  ) {
    const existingIndex = runningAnimations.findIndex((entry) => entry?.id === payload.animation.id);
    if (existingIndex >= 0) {
      runningAnimations[existingIndex] = {
        ...runningAnimations[existingIndex],
        ...cloneJson(payload.animation),
      };
    } else {
      runningAnimations.push(cloneJson(payload.animation));
    }
  } else if (mutationType === "stop-animation") {
    if (!stopAnimationId) {
      if (stopTargetScope !== "global" || !stopTargetType) {
        nextRuntime.runningAnimations = runningAnimations;
        nextRuntime.globalStopRevisions = globalStopRevisions;
        nextRuntime.globalClearRevision = globalClearRevision;
        return {
          runtime: nextRuntime,
          ...(authoritativeBoardId
            ? {
              selectedBoard: authoritativeBoardId,
              selectedLayout: authoritativeBoardId,
            }
            : {}),
        };
      }
    }
    const stoppedEntry = runningAnimations.find((entry) => entry?.id === stopAnimationId);
    const resolvedGlobalStopScope = stoppedEntry?.scope ?? stopTargetScope;
    const resolvedGlobalStopType = normalizeNonEmptyString(stoppedEntry?.type) ?? stopTargetType;
    const resolvedGlobalStopBoardId = normalizeNonEmptyString(stoppedEntry?.boardId) ?? stopTargetBoardId;
    if (resolvedGlobalStopScope === "global" && resolvedGlobalStopBoardId && resolvedGlobalStopType) {
      const triggerKey = `${resolvedGlobalStopBoardId}:${resolvedGlobalStopType}`;
      const stopRevision = Number(globalStopRevisions[triggerKey]) || 0;
      globalStopRevisions[triggerKey] = stopRevision + 1;
    }
    const stopIds = new Set([stopAnimationId]);
    if (stoppedEntry?.scope === "cluster") {
      const linkedMemberIds = Array.isArray(stoppedEntry.memberAnimationIds)
        ? stoppedEntry.memberAnimationIds.map((entry) => normalizeNonEmptyString(entry)).filter(Boolean)
        : [];
      for (const memberId of linkedMemberIds) {
        stopIds.add(memberId);
      }
    }
    if (stoppedEntry?.scope === "room" && stoppedEntry?.parentClusterRunId) {
      const parentClusterId = normalizeNonEmptyString(stoppedEntry.parentClusterRunId);
      if (parentClusterId) {
        const hasOtherMembers = runningAnimations.some((entry) => (
          entry?.id !== stopAnimationId
          && entry?.scope === "room"
          && normalizeNonEmptyString(entry?.parentClusterRunId) === parentClusterId
        ));
        if (!hasOtherMembers) {
          stopIds.add(parentClusterId);
        }
      }
    }
    const shouldFallbackGlobalTypeStop =
      resolvedGlobalStopScope === "global"
      && Boolean(resolvedGlobalStopType)
      && (!stopAnimationId || !stoppedEntry);
    const nextList = runningAnimations.filter((entry) => !stopIds.has(normalizeNonEmptyString(entry?.id)));
    runningAnimations.length = 0;
    if (shouldFallbackGlobalTypeStop) {
      runningAnimations.push(...nextList.filter((entry) => !(
        entry?.scope === "global"
        && normalizeNonEmptyString(entry?.type) === resolvedGlobalStopType
        && (!resolvedGlobalStopBoardId || normalizeNonEmptyString(entry?.boardId) === resolvedGlobalStopBoardId)
      )));
    } else {
      runningAnimations.push(...nextList);
    }
    if (
      (resolvedGlobalStopScope === "global" && resolvedGlobalStopType === "outside-space")
      || payload?.outsideHint === true
    ) {
      const outsideStopBoardId =
        resolvedGlobalStopBoardId
        ?? normalizeNonEmptyString(liveSessionState.snapshot?.selectedBoard)
        ?? null;
      if (outsideStopBoardId) {
        const outsideFxByBoard = readOutsideFxByBoard();
        outsideFxByBoard[outsideStopBoardId] = {
          ...(isPlainObject(outsideFxByBoard[outsideStopBoardId]) ? outsideFxByBoard[outsideStopBoardId] : {}),
          enabled: false,
        };
        outsideFxByBoardPatch = outsideFxByBoard;
        nextRuntime.outsideFxByBoard = outsideFxByBoard;
      }
    }
  } else if (mutationType === "clear-all") {
    for (const entry of runningAnimations) {
      if (entry?.scope !== "global" || !entry?.boardId || !entry?.type) {
        continue;
      }
      const triggerKey = `${entry.boardId}:${entry.type}`;
      const stopRevision = Number(globalStopRevisions[triggerKey]) || 0;
      globalStopRevisions[triggerKey] = stopRevision + 1;
    }
    runningAnimations.length = 0;
    const outsideFxByBoard = readOutsideFxByBoard();
    for (const [boardId, profile] of Object.entries(outsideFxByBoard)) {
      outsideFxByBoard[boardId] = {
        ...(isPlainObject(profile) ? profile : {}),
        enabled: false,
      };
    }
    nextRuntime.outsideFxByBoard = outsideFxByBoard;
    nextRuntime.runningAnimations = runningAnimations;
    nextRuntime.globalStopRevisions = globalStopRevisions;
    globalClearRevision += 1;
    nextRuntime.globalClearRevision = globalClearRevision;
    return {
      runtime: nextRuntime,
      outsideFxByBoard,
      ...(authoritativeBoardId
        ? {
          selectedBoard: authoritativeBoardId,
          selectedLayout: authoritativeBoardId,
        }
        : {}),
    };
  }

  nextRuntime.runningAnimations = runningAnimations;
  nextRuntime.globalStopRevisions = globalStopRevisions;
  nextRuntime.globalClearRevision = globalClearRevision;
  return {
    runtime: nextRuntime,
    ...(authoritativeBoardId
      ? {
        selectedBoard: authoritativeBoardId,
        selectedLayout: authoritativeBoardId,
      }
      : {}),
    ...(outsideFxByBoardPatch ? { outsideFxByBoard: outsideFxByBoardPatch } : {}),
  };
}

function applyGlobalMutationPatch(payload) {
  const nextRuntime = readRuntimeSnapshot();
  const serverNowEpochMs = Date.now();
  const runningAnimations = Array.isArray(nextRuntime.runningAnimations) ? cloneJson(nextRuntime.runningAnimations) : [];
  const globalTriggerRevisions = isPlainObject(nextRuntime.globalTriggerRevisions)
    ? { ...nextRuntime.globalTriggerRevisions }
    : {};
  const globalStopRevisions = isPlainObject(nextRuntime.globalStopRevisions)
    ? { ...nextRuntime.globalStopRevisions }
    : {};
  const action = normalizeNonEmptyString(payload?.action) ?? "start";
  const animationType = normalizeNonEmptyString(payload?.animationType)
    ?? normalizeNonEmptyString(payload?.animation?.type);
  const boardId = normalizeNonEmptyString(payload?.boardId)
    ?? normalizeNonEmptyString(payload?.animation?.boardId)
    ?? normalizeNonEmptyString(liveSessionState.snapshot?.selectedBoard)
    ?? null;
  const directTriggerKey = boardId && animationType ? `${boardId}:${animationType}` : null;

  if (boardId) {
    nextRuntime.selectedBoard = boardId;
    nextRuntime.boardId = boardId;
  }

  if (action === "stop") {
    const stopAnimationId = normalizeNonEmptyString(payload?.animationId);
    let inferredTriggerKey = directTriggerKey;
    if (!inferredTriggerKey && stopAnimationId) {
      const match = runningAnimations.find((entry) => entry?.id === stopAnimationId);
      if (match?.boardId && match?.type) {
        inferredTriggerKey = `${match.boardId}:${match.type}`;
      }
    }
    if (inferredTriggerKey) {
      const currentStopRevision = Number(globalStopRevisions[inferredTriggerKey]) || 0;
      globalStopRevisions[inferredTriggerKey] = currentStopRevision + 1;
    }
    const filtered = runningAnimations.filter((entry) => {
      if (stopAnimationId && entry?.id === stopAnimationId) {
        return false;
      }
      if (!stopAnimationId && entry?.scope === "global" && entry?.type === animationType && (!boardId || entry?.boardId === boardId)) {
        return false;
      }
      return true;
    });
    nextRuntime.runningAnimations = filtered;
  } else if (action === "start" && boardId && animationType) {
    const incomingAnimation = isPlainObject(payload?.animation) ? payload.animation : {};
    const triggerKey = normalizeNonEmptyString(incomingAnimation.triggerKey) ?? directTriggerKey;
    const requestedLoopUntilStopped =
      typeof payload?.loopUntilStopped === "boolean"
        ? payload.loopUntilStopped
        : incomingAnimation?.hold === true;
    const requestedDurationMs = Number(incomingAnimation?.durationMs);
    const requestedSoundVolume = Number(incomingAnimation?.soundVolume);
    const soundEnabled =
      typeof payload?.playSound === "boolean"
        ? payload.playSound
        : !(Number.isFinite(requestedSoundVolume) && requestedSoundVolume <= 0);
    const authoritativeAnimation = {
      id: "",
      scope: "global",
      boardId,
      type: animationType,
      intensity: Number.isFinite(Number(incomingAnimation?.intensity)) ? Number(incomingAnimation.intensity) : 1,
      hold: requestedLoopUntilStopped,
      durationMs: requestedLoopUntilStopped
        ? null
        : (Number.isFinite(requestedDurationMs) && requestedDurationMs > 0
          ? Math.max(1000, Math.trunc(requestedDurationMs))
          : GLOBAL_ONE_SHOT_DEFAULT_DURATION_MS),
      soundVolume: soundEnabled ? 1 : 0,
      startedAtEpochMs: serverNowEpochMs,
    };
    if (triggerKey) {
      const currentTriggerRevision = Number(globalTriggerRevisions[triggerKey]) || 0;
      const nextTriggerRevision = currentTriggerRevision + 1;
      globalTriggerRevisions[triggerKey] = nextTriggerRevision;
      authoritativeAnimation.triggerKey = triggerKey;
      authoritativeAnimation.triggerRevision = nextTriggerRevision;
      authoritativeAnimation.id = `global-${triggerKey}-${nextTriggerRevision}`;
    }
    if (!authoritativeAnimation.id) {
      authoritativeAnimation.id = `global-${boardId}-${animationType}-${serverNowEpochMs}`;
    }
    const retained = runningAnimations.filter((entry) => !(
      entry?.scope === "global"
      && normalizeNonEmptyString(entry?.boardId) === boardId
      && normalizeNonEmptyString(entry?.type) === animationType
    ));
    retained.push(authoritativeAnimation);
    nextRuntime.runningAnimations = retained;
  } else {
    nextRuntime.runningAnimations = runningAnimations;
  }

  nextRuntime.globalTriggerRevisions = globalTriggerRevisions;
  nextRuntime.globalStopRevisions = globalStopRevisions;

  if (animationType === "outside-space" || payload?.outsideHint === true) {
    const outsideFxByBoard = readOutsideFxByBoard();
    const targetBoardId = boardId ?? normalizeNonEmptyString(liveSessionState.snapshot?.selectedBoard) ?? null;
    if (targetBoardId) {
      outsideFxByBoard[targetBoardId] = {
        ...(isPlainObject(outsideFxByBoard[targetBoardId]) ? outsideFxByBoard[targetBoardId] : {}),
        enabled: action !== "stop",
      };
      nextRuntime.outsideFxByBoard = outsideFxByBoard;
      return {
        runtime: nextRuntime,
        outsideFxByBoard,
        ...(boardId
          ? {
            selectedBoard: boardId,
            selectedLayout: boardId,
          }
          : {}),
      };
    }
  }

  return {
    runtime: nextRuntime,
    ...(boardId
      ? {
        selectedBoard: boardId,
        selectedLayout: boardId,
      }
      : {}),
  };
}

function applyContextUpdatePatch(payload) {
  const nextRuntime = readRuntimeSnapshot();
  const runtimePatch = isPlainObject(payload?.runtime) ? payload.runtime : {};
  const reason =
    normalizeNonEmptyString(payload?.reason)
    ?? normalizeNonEmptyString(runtimePatch?.reason)
    ?? null;
  const previousSelectedBoard =
    normalizeNonEmptyString(liveSessionState.snapshot?.selectedBoard) ??
    normalizeNonEmptyString(nextRuntime?.selectedBoard) ??
    normalizeNonEmptyString(nextRuntime?.boardId) ??
    null;
  const alignMode =
    typeof payload?.alignMode === "boolean"
      ? payload.alignMode
      : typeof runtimePatch?.alignMode === "boolean"
        ? runtimePatch.alignMode
        : null;
  const requestedSelectedBoard =
    normalizeNonEmptyString(payload?.selectedBoard) ??
    normalizeNonEmptyString(payload?.boardId) ??
    normalizeNonEmptyString(runtimePatch?.selectedBoard) ??
    normalizeNonEmptyString(runtimePatch?.boardId) ??
    normalizeNonEmptyString(liveSessionState.snapshot?.selectedBoard) ??
    normalizeNonEmptyString(nextRuntime?.selectedBoard) ??
    normalizeNonEmptyString(nextRuntime?.boardId) ??
    null;
  const requestedSelectedLayout =
    normalizeNonEmptyString(payload?.selectedLayout) ??
    normalizeNonEmptyString(payload?.layoutId) ??
    normalizeNonEmptyString(runtimePatch?.selectedLayout) ??
    normalizeNonEmptyString(runtimePatch?.layoutId) ??
    requestedSelectedBoard;
  const atomicSwitchTransactionId =
    normalizeNonEmptyString(payload?.contextSwitchTransactionId)
    ?? normalizeNonEmptyString(runtimePatch?.contextSwitchTransactionId)
    ?? null;
  const allowBoardContextMutation = Boolean(atomicSwitchTransactionId) || !isBoardContextSuppressedReason(reason);
  const selectedBoard = allowBoardContextMutation
    ? requestedSelectedBoard
    : previousSelectedBoard;
  const selectedLayout = allowBoardContextMutation
    ? requestedSelectedLayout
    : (
      normalizeNonEmptyString(liveSessionState.snapshot?.selectedLayout)
      ?? normalizeNonEmptyString(nextRuntime?.selectedLayout)
      ?? normalizeNonEmptyString(nextRuntime?.layoutId)
      ?? previousSelectedBoard
      ?? null
    );
  const boardSwitched =
    Boolean(selectedBoard)
    && Boolean(previousSelectedBoard)
    && selectedBoard !== previousSelectedBoard;
  const alreadyAppliedTransaction =
    Boolean(atomicSwitchTransactionId)
    && normalizeNonEmptyString(nextRuntime?.lastContextSwitchTransactionId) === atomicSwitchTransactionId;
  const shouldAtomicClear = boardSwitched && !alreadyAppliedTransaction;

  if (selectedBoard) {
    nextRuntime.boardId = selectedBoard;
    nextRuntime.selectedBoard = selectedBoard;
  }
  if (selectedLayout) {
    nextRuntime.selectedLayout = selectedLayout;
  }
  if (isPlainObject(runtimePatch?.roomDraft)) {
    nextRuntime.roomDraft = {
      ...(isPlainObject(nextRuntime.roomDraft) ? nextRuntime.roomDraft : {}),
      ...cloneJson(runtimePatch.roomDraft),
    };
  }

  if (shouldAtomicClear) {
    nextRuntime.runningAnimations = [];
  }

  if (atomicSwitchTransactionId) {
    nextRuntime.lastContextSwitchTransactionId = atomicSwitchTransactionId;
    nextRuntime.lastContextSwitchBoardId = selectedBoard;
  }

  if (alignMode !== null) {
    nextRuntime.alignMode = alignMode;
  }

  return {
    runtime: nextRuntime,
    selectedBoard,
    selectedLayout,
    ...(alignMode !== null ? { alignMode } : {}),
  };
}

function sanitizeLiveSnapshotForBoardContext(snapshot) {
  const baseSnapshot = isPlainObject(snapshot) ? cloneJson(snapshot) : {};
  const runtime = isPlainObject(baseSnapshot.runtime) ? cloneJson(baseSnapshot.runtime) : {};
  const runningAnimations = reconcileSnapshotRunningAnimations(runtime.runningAnimations, Date.now());
  const inferredBoardFromRunning = runningAnimations.reduce((first, entry) => {
    if (first) {
      return first;
    }
    return normalizeNonEmptyString(entry?.boardId) ?? null;
  }, null);
  const selectedBoard =
    normalizeNonEmptyString(baseSnapshot.selectedBoard)
    ?? normalizeNonEmptyString(baseSnapshot.selectedLayout)
    ?? normalizeNonEmptyString(runtime.selectedBoard)
    ?? normalizeNonEmptyString(runtime.boardId)
    ?? inferredBoardFromRunning
    ?? null;
  const sanitizedRunningAnimations =
    selectedBoard
      ? runningAnimations.filter((entry) => normalizeNonEmptyString(entry?.boardId) === selectedBoard)
      : runningAnimations;

  runtime.runningAnimations = sanitizedRunningAnimations;
  if (selectedBoard) {
    runtime.selectedBoard = selectedBoard;
    runtime.boardId = selectedBoard;
    baseSnapshot.selectedBoard = selectedBoard;
    baseSnapshot.selectedLayout =
      normalizeNonEmptyString(baseSnapshot.selectedLayout)
      ?? normalizeNonEmptyString(runtime.selectedLayout)
      ?? selectedBoard;
  }
  baseSnapshot.runtime = runtime;
  return baseSnapshot;
}

function getMutationQueueByPriority(priority) {
  if (priority === "high") {
    return liveMutationQueue.control;
  }
  if (priority === "low") {
    return liveMutationQueue.noisy;
  }
  return liveMutationQueue.state;
}

function getLiveQueueSize() {
  return liveMutationQueue.control.length + liveMutationQueue.state.length + liveMutationQueue.noisy.length;
}

function buildCoalesceKey({ mutationType, payload, clientId }) {
  if (mutationType === "outside-update" && normalizeNonEmptyString(payload?.reason) === "outside-apply-changes") {
    return null;
  }
  if (NON_COALESCING_MUTATIONS.has(mutationType)) {
    return null;
  }
  const boardId = normalizeNonEmptyString(payload?.outsideBoardId) ?? normalizeNonEmptyString(payload?.selectedBoard) ?? "global";
  return `${clientId}:${mutationType}:${boardId}`;
}

function maybeCoalesceQueuedMutation(nextEntry, queue) {
  if (!nextEntry?.coalesceKey) {
    return false;
  }
  let found = false;
  let classCount = 0;
  for (let index = queue.length - 1; index >= 0; index -= 1) {
    const current = queue[index];
    if (current?.mutationClass === nextEntry.mutationClass) {
      classCount += 1;
    }
    if (current?.coalesceKey === nextEntry.coalesceKey) {
      queue[index] = {
        ...nextEntry,
        enqueuedAt: current.enqueuedAt,
      };
      found = true;
      break;
    }
  }
  if (!found && classCount >= LIVE_COALESCE_CLASS_MAX_SIZE) {
    const dropIndex = queue.findIndex((item) => item?.mutationClass === nextEntry.mutationClass);
    if (dropIndex >= 0) {
      queue.splice(dropIndex, 1);
      liveMutationQueue.droppedOverflow += 1;
      if (nextEntry.mutationClass && Object.hasOwn(liveMutationQueue.droppedByClass, nextEntry.mutationClass)) {
        liveMutationQueue.droppedByClass[nextEntry.mutationClass] += 1;
      }
    }
  }
  if (found) {
    liveMutationQueue.coalesced += 1;
  }
  return found;
}

function dequeueNextLiveMutation() {
  return dequeueFairMutation(liveFairQueueState, {
    control: liveMutationQueue.control,
    state: liveMutationQueue.state,
    noisy: liveMutationQueue.noisy,
  });
}

function applyLiveMutation({
  clientId,
  role,
  mutationType,
  payload,
  mutationId,
  clientSequence,
  ingestAt,
  clientSentAt,
  mutationClass,
  priority,
}) {
  if (!acceptLiveMutationType(mutationType)) {
    logErrorEvent("invalid-mutation-type", String(mutationType ?? "unknown"), {
      clientId,
      role,
    });
    return null;
  }

  const normalizedMutationId = typeof mutationId === "string" && mutationId.trim() ? mutationId.trim() : null;
  const dedupKey = normalizedMutationId ? normalizedMutationId : null;
  if (dedupKey && processedMutations.has(dedupKey)) {
    const previous = processedMutations.get(dedupKey);
    return {
      applied: false,
      duplicate: true,
      stale: false,
      mutationClass: mutationClass ?? classifyLiveMutationType(mutationType, payload),
      priority: priority ?? resolveMutationPriority(mutationType, payload),
      serverTimestamp: previous?.serverTimestamp ?? new Date().toISOString(),
      serverIngestTimestamp: previous?.serverIngestTimestamp ?? ingestAt ?? new Date().toISOString(),
      version: previous?.version ?? liveSessionState.version,
    };
  }

  const normalizedSequence = Number.isFinite(Number(clientSequence)) ? Math.trunc(Number(clientSequence)) : null;
  if (Number.isInteger(normalizedSequence) && normalizedSequence > 0) {
    const lastSequence = lastClientSequenceById.get(clientId) ?? 0;
    if (normalizedSequence <= lastSequence) {
      return {
        applied: false,
        duplicate: false,
        stale: true,
        mutationClass: mutationClass ?? classifyLiveMutationType(mutationType, payload),
        priority: priority ?? resolveMutationPriority(mutationType, payload),
        serverTimestamp: new Date().toISOString(),
        serverIngestTimestamp: ingestAt ?? new Date().toISOString(),
        version: liveSessionState.version,
      };
    }
    lastClientSequenceById.set(clientId, normalizedSequence);
  }

  let nextSnapshotPatch = null;
  if (mutationType === "outside-update") {
    nextSnapshotPatch = applyOutsideUpdatePatch(payload);
  } else if (mutationType === "trigger-global") {
    nextSnapshotPatch = applyGlobalMutationPatch(payload);
  } else if (mutationType === "context-update") {
    nextSnapshotPatch = applyContextUpdatePatch(payload);
  } else if (
    mutationType === "trigger-room" ||
    mutationType === "edit-room" ||
    mutationType === "stop-animation" ||
    mutationType === "clear-all"
  ) {
    nextSnapshotPatch = applyRoomMutationPatch(mutationType, payload);
  } else {
    nextSnapshotPatch = {
      runtime: payload?.runtime ?? liveSessionState.snapshot.runtime,
      selectedBoard:
        normalizeNonEmptyString(payload?.selectedBoard) ??
        normalizeNonEmptyString(payload?.runtime?.selectedBoard) ??
        normalizeNonEmptyString(payload?.runtime?.boardId) ??
        normalizeNonEmptyString(liveSessionState.snapshot.selectedBoard),
      selectedLayout:
        normalizeNonEmptyString(payload?.selectedLayout) ??
        normalizeNonEmptyString(payload?.runtime?.selectedLayout) ??
        normalizeNonEmptyString(payload?.runtime?.layoutId) ??
        normalizeNonEmptyString(payload?.runtime?.boardId) ??
        normalizeNonEmptyString(liveSessionState.snapshot.selectedLayout),
      outsideFxByBoard:
        payload?.outsideFxByBoard ??
        payload?.runtime?.outsideFxByBoard ??
        liveSessionState.snapshot.outsideFxByBoard ?? {},
    };
  }

  if (typeof payload?.alignMode === "boolean") {
    nextSnapshotPatch.alignMode = payload.alignMode;
    if (isPlainObject(nextSnapshotPatch.runtime)) {
      nextSnapshotPatch.runtime.alignMode = payload.alignMode;
    }
  }
  if (mutationType === "stop-animation") {
    const stopTargetType = normalizeNonEmptyString(payload?.targetType);
    const isGlobalOutsideStop = stopTargetType === "outside-space" || payload?.outsideHint === true;
    if (isGlobalOutsideStop) {
      const targetBoardId =
        normalizeNonEmptyString(payload?.boardId)
        ?? normalizeNonEmptyString(nextSnapshotPatch?.selectedBoard)
        ?? normalizeNonEmptyString(nextSnapshotPatch?.runtime?.selectedBoard)
        ?? normalizeNonEmptyString(nextSnapshotPatch?.runtime?.boardId)
        ?? normalizeNonEmptyString(liveSessionState.snapshot?.selectedBoard)
        ?? null;
      if (targetBoardId) {
        const outsideFxByBoard = isPlainObject(nextSnapshotPatch?.outsideFxByBoard)
          ? cloneJson(nextSnapshotPatch.outsideFxByBoard)
          : readOutsideFxByBoard();
        outsideFxByBoard[targetBoardId] = {
          ...(isPlainObject(outsideFxByBoard[targetBoardId]) ? outsideFxByBoard[targetBoardId] : {}),
          enabled: false,
        };
        nextSnapshotPatch.outsideFxByBoard = outsideFxByBoard;
        if (!isPlainObject(nextSnapshotPatch.runtime)) {
          nextSnapshotPatch.runtime = readRuntimeSnapshot();
        }
        nextSnapshotPatch.runtime.outsideFxByBoard = outsideFxByBoard;
      }
    }
  }
  const serverTimestamp = new Date().toISOString();
  const session = mutateLiveSession({
    mutation: {
      type: mutationType,
      mutationId: normalizedMutationId,
      byClientId: clientId,
      byRole: role,
      mutationClass: mutationClass ?? classifyLiveMutationType(mutationType, payload),
      priority: priority ?? resolveMutationPriority(mutationType, payload),
      clientSentAt: clientSentAt ?? null,
      ingestAt: ingestAt ?? null,
      at: serverTimestamp,
    },
    nextSnapshotPatch,
  });

  const commitLatencyMs = Math.max(0, Date.now() - Date.parse(ingestAt ?? serverTimestamp));
  recordLiveHopSample(liveTelemetry.hops.ingestToCommit, commitLatencyMs);

  if (dedupKey) {
    rememberProcessedMutation(dedupKey, {
      version: session.version,
      serverTimestamp,
      serverIngestTimestamp: ingestAt ?? serverTimestamp,
    });
  }

  const envelope = {
    mutationId: normalizedMutationId,
    mutationType,
    mutationClass: mutationClass ?? classifyLiveMutationType(mutationType, payload),
    priority: priority ?? resolveMutationPriority(mutationType, payload),
    clientId,
    role,
    serverVersion: session.version,
    serverTimestamp,
    serverIngestTimestamp: ingestAt ?? serverTimestamp,
    clientSentTimestamp: clientSentAt ?? null,
  };

  return {
    applied: true,
    duplicate: false,
    stale: false,
    mutationClass: envelope.mutationClass,
    priority: envelope.priority,
    serverTimestamp: envelope.serverTimestamp,
    serverIngestTimestamp: envelope.serverIngestTimestamp,
    envelope,
    version: session.version,
  };
}

function encodeWebSocketTextFrame(message) {
  const payload = Buffer.from(message, "utf8");
  const payloadLength = payload.length;
  if (payloadLength < 126) {
    return Buffer.concat([Buffer.from([0x81, payloadLength]), payload]);
  }
  if (payloadLength < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);
    return Buffer.concat([header, payload]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payloadLength), 2);
  return Buffer.concat([header, payload]);
}

function decodeWebSocketTextFrame(chunk) {
  if (!chunk || chunk.length < 6) {
    return null;
  }
  const firstByte = chunk[0];
  const secondByte = chunk[1];
  const opcode = firstByte & 0x0f;
  if (opcode === 0x8) {
    return { close: true, text: null };
  }
  if (opcode !== 0x1) {
    return null;
  }
  const masked = (secondByte & 0x80) === 0x80;
  const initialPayloadLength = secondByte & 0x7f;
  if (!masked) {
    return null;
  }
  let payloadLength = initialPayloadLength;
  let cursor = 2;
  if (initialPayloadLength === 126) {
    if (chunk.length < cursor + 2) {
      return null;
    }
    payloadLength = chunk.readUInt16BE(cursor);
    cursor += 2;
  } else if (initialPayloadLength === 127) {
    if (chunk.length < cursor + 8) {
      return null;
    }
    const value = Number(chunk.readBigUInt64BE(cursor));
    if (!Number.isFinite(value) || value > 8 * 1024 * 1024) {
      return null;
    }
    payloadLength = value;
    cursor += 8;
  }
  if (chunk.length < cursor + 4 + payloadLength) {
    return null;
  }
  const maskOffset = cursor;
  const payloadOffset = maskOffset + 4;
  const mask = chunk.subarray(maskOffset, maskOffset + 4);
  const payload = chunk.subarray(payloadOffset, payloadOffset + payloadLength);
  const unmasked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i += 1) {
    unmasked[i] = payload[i] ^ mask[i % 4];
  }
  return { close: false, text: unmasked.toString("utf8") };
}

function sendLiveSocketMessage(socket, payload) {
  if (!socket || socket.destroyed) {
    return;
  }
  const encoded = encodeWebSocketTextFrame(JSON.stringify(payload));
  socket.write(encoded);
}

function buildLiveSessionEnvelope(type, extra = {}) {
  return {
    type,
    session: {
      version: liveSessionState.version,
      updatedAt: liveSessionState.updatedAt,
      lastMutation: liveSessionState.lastMutation,
      snapshot: liveSessionState.snapshot,
    },
    ...extra,
  };
}

function buildLiveTelemetrySnapshot() {
  const perClient = {};
  for (const [clientId, stats] of liveTelemetry.perClient.entries()) {
    perClient[clientId] = {
      role: stats.role,
      commitToAckMs: stats.commitToAck,
      commitToApplyAckMs: stats.commitToApplyAck,
      lastAckAt: stats.lastAckAt,
      lastApplyAckAt: stats.lastApplyAckAt,
    };
  }
  return {
    queue: {
      depth: getLiveQueueSize(),
      maxDepthObserved: liveMutationQueue.maxDepthObserved,
      droppedOverflow: liveMutationQueue.droppedOverflow,
      droppedByClass: liveMutationQueue.droppedByClass,
      coalesced: liveMutationQueue.coalesced,
    },
    hopsMs: {
      ingestToCommit: liveTelemetry.hops.ingestToCommit,
      commitToClientAck: liveTelemetry.hops.commitToClientAck,
      commitToApplyAck: liveTelemetry.hops.commitToApplyAck,
    },
    gates: {
      ...liveTelemetry.gates,
    },
    perClient,
  };
}

function broadcastLiveSession(type, extra = {}, { finalFirst = false } = {}) {
  const payload = buildLiveSessionEnvelope(type, extra);
  const clients = [...liveClients.entries()];
  const orderedClients = finalFirst
    ? clients.sort(([, left], [, right]) => {
      const leftFinal = left?.role === "final-output" ? 0 : 1;
      const rightFinal = right?.role === "final-output" ? 0 : 1;
      return leftFinal - rightFinal;
    })
    : clients;
  for (const [clientId, client] of orderedClients) {
    if (!client?.socket || client.socket.destroyed) {
      liveClients.delete(clientId);
      continue;
    }
    if (type === "live-session-update") {
      const lastVersion = Number(lastBroadcastVersionByClient.get(clientId) ?? 0);
      const nextVersion = Number(payload?.session?.version ?? 0);
      if (Number.isFinite(nextVersion) && nextVersion <= lastVersion) {
        continue;
      }
      if (Number.isFinite(nextVersion)) {
        lastBroadcastVersionByClient.set(clientId, nextVersion);
      }
    }
    sendLiveSocketMessage(client.socket, payload);
  }
}

function processLiveMutationQueue() {
  if (liveMutationQueue.processing) {
    return;
  }
  liveMutationQueue.processing = true;

  const step = () => {
    const sliceStartedAt = Date.now();
    while (liveApplySliceController.shouldContinue(sliceStartedAt)) {
      const next = dequeueNextLiveMutation();
      if (!next) {
        liveMutationQueue.processing = false;
        return;
      }
      liveMutationQueue.queued = Math.max(0, liveMutationQueue.queued - 1);
      const mutationResult = applyLiveMutation(next);
      if (!mutationResult) {
        continue;
      }
      liveTelemetry.gates.commandAccepted += 1;
      if (mutationResult.duplicate) {
        liveTelemetry.gates.duplicateCommands += 1;
      }
      if (mutationResult.stale) {
        liveTelemetry.gates.staleCommands += 1;
      }
      const nowIso = new Date().toISOString();
      const ackPayload = buildLiveSessionEnvelope("live-ack", {
        mutationType: next.mutationType,
        mutationId: next.mutationId,
        version: mutationResult.version,
        applied: mutationResult.applied,
        duplicate: mutationResult.duplicate,
        stale: mutationResult.stale,
        mutationClass: mutationResult.mutationClass,
        priority: mutationResult.priority,
        serverTimestamp: mutationResult.serverTimestamp,
        serverIngestTimestamp: mutationResult.serverIngestTimestamp,
        queueDepth: getLiveQueueSize(),
        queueWaitMs: Math.max(0, Date.now() - Number(next.enqueuedAt || Date.now())),
        ackTimestamp: nowIso,
      });
      if (next.socket) {
        sendLiveSocketMessage(next.socket, ackPayload);
      }
      if (typeof next.resolveAck === "function") {
        next.resolveAck(ackPayload);
      }
      if (mutationResult.applied) {
        liveTelemetry.gates.snapshotVersionVisible += 1;
        broadcastLiveSession("live-session-update", {
          mutationType: next.mutationType,
          mutationId: next.mutationId,
          version: mutationResult.version,
          mutationEnvelope: mutationResult.envelope,
        }, {
          finalFirst: true,
        });
        broadcastLiveSession("state-dirty", {
          mutationType: next.mutationType,
          mutationId: next.mutationId,
          version: mutationResult.version,
          wake: true,
        }, {
          finalFirst: true,
        });
      }
    }
    setImmediate(step);
  };

  setImmediate(step);
}

function enqueueLiveMutation({ socket = null, clientId, role, mutationType, payload, mutationId, clientSequence, clientSentAt, resolveAck = null }) {
  const mutationClass = classifyLiveMutationType(mutationType, payload);
  const priority = resolveMutationPriority(mutationType, payload);
  const ingestAt = new Date().toISOString();
  const queue = getMutationQueueByPriority(priority);
  const queueSize = getLiveQueueSize();
  const queueEntry = {
    socket,
    clientId,
    role,
    mutationType,
    payload,
    mutationId,
    clientSequence,
    clientSentAt: normalizeNonEmptyString(clientSentAt),
    mutationClass,
    priority,
    ingestAt,
    enqueuedAt: Date.now(),
    coalesceKey: buildCoalesceKey({ mutationType, payload, clientId }),
    resolveAck,
  };

  if (queueSize >= LIVE_QUEUE_MAX_SIZE && priority !== "high") {
    logSessionEvent("queue-backpressure", {
      queueDepth: queueSize,
      mutationType,
      mutationClass,
      priority,
      policy: "no-drop",
    });
  }

  const coalesced = maybeCoalesceQueuedMutation(queueEntry, queue);
  if (!coalesced) {
    queue.push(queueEntry);
    liveMutationQueue.queued += 1;
    liveMutationQueue.maxDepthObserved = Math.max(liveMutationQueue.maxDepthObserved, getLiveQueueSize());
  }
  processLiveMutationQueue();
}

function attachLiveWebSocket(server) {
  server.on("upgrade", (req, socket) => {
    const routePath = normalizeRoutePath(req.url || "/");
    if (routePath !== "/api/live/ws") {
      socket.destroy();
      return;
    }

    const key = req.headers["sec-websocket-key"];
    if (!key) {
      socket.destroy();
      return;
    }

    const accept = createHash("sha1")
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, "utf8")
      .digest("base64");
    const responseHeaders = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "",
      "",
    ];
    socket.write(responseHeaders.join("\r\n"));

    const requestUrl = new URL(req.url || "/api/live/ws", "http://localhost");
    const role = requestUrl.searchParams.get("role") || "control";
    const clientId = `live-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    liveClients.set(clientId, { socket, role, connectedAt: new Date().toISOString() });
    lastBroadcastVersionByClient.set(clientId, Number(liveSessionState.version || 0));
    upsertClientTelemetry(clientId, role);
    logSessionEvent("connect", {
      clientId,
      role,
      routePath,
      remoteAddress: req.socket.remoteAddress ?? null,
      connectedClients: liveClients.size,
    });

    sendLiveSocketMessage(socket, buildLiveSessionEnvelope("live-hello", {
      clientId,
      role,
      replay: {
        mode: "snapshot-base-version",
        baseVersion: liveSessionState.version,
      },
    }));
    logSessionEvent("join-snapshot", {
      clientId,
      role,
      snapshotVersion: liveSessionState.version,
    });

    socket.on("data", (chunk) => {
      const frame = decodeWebSocketTextFrame(chunk);
      if (!frame) {
        logErrorEvent("invalid-ws-frame", "frame-decode-failed", {
          clientId,
          role,
        });
        return;
      }
      if (frame.close) {
        socket.end();
        return;
      }
      try {
        const parsed = JSON.parse(frame.text || "{}");
        if (parsed?.type === "live-receive-ack") {
          const envelope = isPlainObject(parsed?.mutationEnvelope) ? parsed.mutationEnvelope : null;
          const commitAt = Date.parse(envelope?.serverTimestamp ?? "");
          const receiveAt = Date.parse(parsed?.receivedAt ?? "");
          if (Number.isFinite(commitAt) && Number.isFinite(receiveAt) && receiveAt >= commitAt) {
            const delta = receiveAt - commitAt;
            const clientStats = upsertClientTelemetry(clientId, role);
            clientStats.commitToAck.push(delta);
            if (clientStats.commitToAck.length > LIVE_TELEMETRY_SAMPLE_LIMIT) {
              clientStats.commitToAck.shift();
            }
            clientStats.lastAckAt = new Date(receiveAt).toISOString();
            recordLiveHopSample(liveTelemetry.hops.commitToClientAck, delta);
          }
          return;
        }
        if (parsed?.type === "live-apply-ack") {
          const envelope = isPlainObject(parsed?.mutationEnvelope) ? parsed.mutationEnvelope : null;
          const commitAt = Date.parse(envelope?.serverTimestamp ?? "");
          const applyAt = Date.parse(parsed?.appliedAt ?? "");
          if (Number.isFinite(commitAt) && Number.isFinite(applyAt) && applyAt >= commitAt) {
            const delta = applyAt - commitAt;
            const clientStats = upsertClientTelemetry(clientId, role);
            clientStats.commitToApplyAck.push(delta);
            if (clientStats.commitToApplyAck.length > LIVE_TELEMETRY_SAMPLE_LIMIT) {
              clientStats.commitToApplyAck.shift();
            }
            clientStats.lastApplyAckAt = new Date(applyAt).toISOString();
            recordLiveHopSample(liveTelemetry.hops.commitToApplyAck, delta);
            liveTelemetry.gates.snapshotApplied += 1;
          }
          return;
        }
        if (parsed?.type !== "live-mutation") {
          return;
        }
        const mutationId = typeof parsed?.mutationId === "string" ? parsed.mutationId : null;
        enqueueLiveMutation({
          socket,
          clientId,
          role,
          mutationType: parsed.mutationType,
          payload: parsed.payload,
          mutationId,
          clientSequence: parsed?.clientSequence,
          clientSentAt: parsed?.clientTimestamp,
        });
      } catch {
        logErrorEvent("malformed-ws-payload", "invalid-json", {
          clientId,
          role,
        });
      }
    });

    socket.on("close", () => {
      liveClients.delete(clientId);
      lastBroadcastVersionByClient.delete(clientId);
      logSessionEvent("disconnect", {
        clientId,
        role,
        connectedClients: liveClients.size,
      });
    });
    socket.on("error", (error) => {
      liveClients.delete(clientId);
      lastBroadcastVersionByClient.delete(clientId);
      logErrorEvent("socket-error", error instanceof Error ? error.message : "unknown", {
        clientId,
        role,
      });
    });
  });
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

function toSafePath(urlPath) {
  const cleaned = decodeURIComponent(urlPath.split("?")[0] || "/");
  const normalized = path.normalize(cleaned).replace(/^([.][.][/\\])+/, "");
  const fullPath = path.join(ROOT_DIR, normalized === "/" ? "index.html" : normalized);
  if (!fullPath.startsWith(ROOT_DIR)) {
    return null;
  }
  return fullPath;
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function parseJsonBody(req, { maxBytes = 2 * 1024 * 1024 } = {}) {
  const chunks = [];
  let totalSize = 0;
  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > maxBytes) {
      throw new Error("payload too large");
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw);
}

function mutateLiveSession({ mutation, nextSnapshotPatch }) {
  liveSessionState.version += 1;
  liveSessionState.updatedAt = new Date().toISOString();
  liveSessionState.lastMutation = mutation;
  const mergedSnapshot = {
    ...liveSessionState.snapshot,
    ...nextSnapshotPatch,
    schema: LIVE_STATE_SCHEMA,
  };
  liveSessionState.snapshot = sanitizeLiveSnapshotForBoardContext(mergedSnapshot);
  const outsideFxByBoard = liveSessionState.snapshot?.runtime?.outsideFxByBoard;
  const outsideEnabledBoards =
    outsideFxByBoard && typeof outsideFxByBoard === "object"
      ? Object.values(outsideFxByBoard).filter((entry) => Boolean(entry?.enabled)).length
      : 0;
  logStateChange(mutation?.type ?? "unknown", {
    version: liveSessionState.version,
    byClientId: mutation?.byClientId ?? null,
    byRole: mutation?.byRole ?? null,
    alignMode: liveSessionState.snapshot.alignMode,
    selectedBoard: liveSessionState.snapshot.selectedBoard ?? null,
    selectedLayout: liveSessionState.snapshot.selectedLayout ?? null,
    outsideEnabledBoards,
  });
  return {
    version: liveSessionState.version,
    updatedAt: liveSessionState.updatedAt,
    lastMutation: liveSessionState.lastMutation,
    snapshot: liveSessionState.snapshot,
  };
}

async function acceptCommandMutation({ mutationType, payload, mutationId = null, role = "control", clientId = "http-command" }) {
  return new Promise((resolve) => {
    const fallbackTimeout = setTimeout(() => {
      resolve(buildLiveSessionEnvelope("live-ack", {
        mutationType,
        mutationId,
        applied: false,
        duplicate: false,
        stale: false,
        timeout: true,
        version: liveSessionState.version,
      }));
    }, 3500);
    enqueueLiveMutation({
      socket: null,
      clientId,
      role,
      mutationType,
      payload,
      mutationId,
      clientSequence: null,
      clientSentAt: new Date().toISOString(),
      resolveAck: (ack) => {
        clearTimeout(fallbackTimeout);
        resolve(ack);
      },
    });
  });
}

function normalizeRoutePath(urlValue = "/") {
  try {
    const routeUrl = new URL(urlValue, "http://localhost");
    const pathname = routeUrl.pathname || "/";
    return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  } catch {
    return "/";
  }
}

function normalizeUnit(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(-0.2, Math.min(1.2, numeric));
}

function normalizeRadius(value, fallback = 0.055) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0.01, Math.min(0.25, numeric));
}

function isValidRoomPolygon(points) {
  return (
    Array.isArray(points) &&
    points.length >= 3 &&
    points.every((point) => Array.isArray(point) && point.length >= 2 && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])))
  );
}

function normalizeRoomCatalogEntry(room, index = 0) {
  const id = String(room?.id || "").trim() || `room-${index + 1}`;
  const name = String(room?.name || room?.label || "").trim() || `Room ${index + 1}`;
  const radius = normalizeRadius(room?.radius, 0.055);
  const polygon = isValidRoomPolygon(room?.polygon)
    ? room.polygon
    : isValidRoomPolygon(room?.points)
      ? room.points
      : null;

  const normalized = {
    id,
    name,
    radius,
    meta: {
      ...(room?.meta && typeof room.meta === "object" ? room.meta : {}),
      schema: "tt-beamer.room.v2",
    },
  };

  if (polygon) {
    normalized.polygon = polygon.map((point) => [normalizeUnit(point[0]), normalizeUnit(point[1])]);
  } else {
    normalized.x = normalizeUnit(room?.x, 0.5);
    normalized.y = normalizeUnit(room?.y, 0.5);
  }

  return normalized;
}

function normalizeRoomClusterEntry(cluster, roomIds = new Set(), index = 0) {
  const clusterId = String(cluster?.clusterId || cluster?.id || "").trim() || `cluster-${index + 1}`;
  const name = String(cluster?.name || cluster?.label || "").trim() || `Cluster ${index + 1}`;
  const uniqueRoomIds = Array.from(new Set((Array.isArray(cluster?.roomIds) ? cluster.roomIds : [])
    .map((roomId) => String(roomId || "").trim())
    .filter((roomId) => roomId && roomIds.has(roomId))));
  return {
    clusterId,
    name,
    roomIds: uniqueRoomIds,
  };
}

function normalizeBoardDefinition(inputBoard, { source = "catalog", allowEmptyRoomCatalog = false } = {}) {
  const boardId = String(inputBoard?.boardId || inputBoard?.id || "").trim();
  const name = String(inputBoard?.metadata?.name || inputBoard?.label || "").trim();
  const rawImageSrc = String(inputBoard?.metadata?.imageSrc || inputBoard?.src || "").trim();
  const imageSrc = rawImageSrc.replace("/config/boards/imported/assets/", "/config/boards/assets/");
  const roomCatalogRaw = Array.isArray(inputBoard?.roomCatalog)
    ? inputBoard.roomCatalog
    : Array.isArray(inputBoard?.rooms)
      ? inputBoard.rooms
      : [];
  const roomCatalog = roomCatalogRaw.map((room, index) => normalizeRoomCatalogEntry(room, index));
  const roomIdSet = new Set(roomCatalog.map((room) => room.id));
  const roomClustersRaw = Array.isArray(inputBoard?.roomClusters)
    ? inputBoard.roomClusters
    : Array.isArray(inputBoard?.clusters)
      ? inputBoard.clusters
      : [];
  const roomClusters = roomClustersRaw
    .map((cluster, index) => normalizeRoomClusterEntry(cluster, roomIdSet, index))
    .filter((cluster) => cluster.roomIds.length > 0);

  const issues = [];
  if (!boardId) {
    issues.push("boardId is required");
  }
  if (!name) {
    issues.push("metadata.name is required");
  }
  if (!imageSrc) {
    issues.push("metadata.imageSrc is required");
  }
  if (roomCatalog.length === 0 && !allowEmptyRoomCatalog) {
    issues.push("roomCatalog must contain at least one room");
  }

  const roomSeen = new Set();
  for (const room of roomCatalog) {
    if (roomSeen.has(room.id)) {
      issues.push(`duplicate room id: ${room.id}`);
      continue;
    }
    roomSeen.add(room.id);
    if (!room.id) {
      issues.push("room id cannot be empty");
    }
    if (!room.name) {
      issues.push(`room ${room.id || "<unknown>"} requires a name`);
    }
    if (!isValidRoomPolygon(room.polygon) && (!Number.isFinite(Number(room.x)) || !Number.isFinite(Number(room.y)))) {
      issues.push(`room ${room.id || "<unknown>"} requires polygon or x/y`);
    }
  }

  const clusterSeen = new Set();
  for (const cluster of roomClusters) {
    if (clusterSeen.has(cluster.clusterId)) {
      issues.push(`duplicate cluster id: ${cluster.clusterId}`);
      continue;
    }
    clusterSeen.add(cluster.clusterId);
  }

  return {
    ok: issues.length === 0,
    issues,
    board: {
      schema: BOARD_DEFINITION_SCHEMA,
      boardId,
      metadata: {
        name,
        imageSrc,
        source,
      },
      roomCatalog,
      roomClusters,
    },
  };
}

function buildDefaultSpecialCluster(roomCatalog = []) {
  const specialRoomIds = roomCatalog
    .map((room) => String(room?.id || "").trim())
    .filter((roomId) => roomId.startsWith("special-"));
  if (specialRoomIds.length < 2) {
    return [];
  }
  return [
    {
      clusterId: "cluster-special-rooms",
      name: "Special Rooms",
      roomIds: specialRoomIds,
    },
  ];
}

function toRuntimeBoard(boardDefinition) {
  return {
    id: boardDefinition.boardId,
    label: boardDefinition.metadata.name,
    src: boardDefinition.metadata.imageSrc,
    rooms: boardDefinition.roomCatalog.map((room) => ({
      id: room.id,
      name: room.name,
      label: room.name,
      radius: normalizeRadius(room.radius, 0.055),
      polygon: isValidRoomPolygon(room.polygon) ? room.polygon : undefined,
      points: isValidRoomPolygon(room.polygon) ? room.polygon : undefined,
      x: Number.isFinite(Number(room.x)) ? Number(room.x) : undefined,
      y: Number.isFinite(Number(room.y)) ? Number(room.y) : undefined,
      meta: {
        ...(room.meta && typeof room.meta === "object" ? room.meta : {}),
        schema: "tt-beamer.room.v2",
      },
    })),
    roomClusters: boardDefinition.roomClusters.map((cluster) => ({
      clusterId: cluster.clusterId,
      name: cluster.name,
      roomIds: [...cluster.roomIds],
    })),
  };
}

function sanitizeBoardFileName(boardId) {
  const safe = String(boardId || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  return safe.replace(/^-|-$/g, "");
}

// Phase 15-4 helper: used by auto-suffix board ID resolution during
// image board import. Returns true if the given path exists on disk.
async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function migrateLegacyImportedBoardStorage() {
  await mkdir(BOARD_STORAGE_DIR, { recursive: true });
  await mkdir(BOARD_ASSETS_DIR, { recursive: true });
  let legacyEntries = [];
  try {
    legacyEntries = await readdir(LEGACY_IMPORTED_BOARDS_DIR, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of legacyEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }
    const legacyPath = path.join(LEGACY_IMPORTED_BOARDS_DIR, entry.name);
    const canonicalPath = path.join(BOARD_STORAGE_DIR, entry.name);
    try {
      await stat(canonicalPath);
    } catch {
      try {
        await rename(legacyPath, canonicalPath);
      } catch {
        // leave legacy file in place if migration move fails
      }
    }
  }

  const legacyAssetsDir = path.join(LEGACY_IMPORTED_BOARDS_DIR, "assets");
  let legacyAssetEntries = [];
  try {
    legacyAssetEntries = await readdir(legacyAssetsDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of legacyAssetEntries) {
    if (!entry.isFile()) {
      continue;
    }
    const legacyPath = path.join(legacyAssetsDir, entry.name);
    const canonicalPath = path.join(BOARD_ASSETS_DIR, entry.name);
    try {
      await stat(canonicalPath);
    } catch {
      try {
        await rename(legacyPath, canonicalPath);
      } catch {
        // leave legacy file in place if migration move fails
      }
    }
  }
}

async function loadBuiltInBoardsFromZones() {
  let entries = [];
  try {
    entries = await readdir(ZONES_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const boards = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }
    const filePath = path.join(ZONES_DIR, entry.name);
    try {
      const raw = await readFile(filePath, "utf8");
      const payload = JSON.parse(raw);
      const sourceRoomCatalog = Array.isArray(payload?.rooms)
        ? payload.rooms.map((room) => ({
          id: room.id,
          name: room.name ?? room.label,
          x: room.x,
          y: room.y,
          radius: room.radius,
          polygon: room.polygon ?? room.points,
        }))
        : [];
      const normalized = normalizeBoardDefinition(
        {
          boardId: payload?.board?.id,
          metadata: {
            name: payload?.board?.label,
            imageSrc: payload?.board?.src,
          },
          roomCatalog: sourceRoomCatalog,
          roomClusters: Array.isArray(payload?.roomClusters) ? payload.roomClusters : buildDefaultSpecialCluster(sourceRoomCatalog),
        },
        {
          source: "builtin-zone",
        },
      );
      if (!normalized.ok) {
        continue;
      }
      boards.push(normalized.board);
    } catch {
      continue;
    }
  }

  boards.sort((a, b) => a.boardId.localeCompare(b.boardId));
  return boards;
}

async function loadCanonicalBoardsFromStorage() {
  await migrateLegacyImportedBoardStorage();
  await mkdir(BOARD_STORAGE_DIR, { recursive: true });
  const entries = await readdir(BOARD_STORAGE_DIR, { withFileTypes: true });
  const catalogBoards = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name.startsWith(".")) {
      continue;
    }
    const filePath = path.join(BOARD_STORAGE_DIR, entry.name);
    try {
      const raw = await readFile(filePath, "utf8");
      const payload = JSON.parse(raw);
      const normalized = normalizeBoardDefinition(payload?.board ?? payload, {
        source: "catalog-storage",
        allowEmptyRoomCatalog: true,
      });
      if (!normalized.ok) {
        continue;
      }
      catalogBoards.push(normalized.board);
    } catch {
      continue;
    }
  }

  catalogBoards.sort((a, b) => a.boardId.localeCompare(b.boardId));
  return catalogBoards;
}

// Phase 16: all boards are catalog entries in config/boards/.
// The old zone-based builtin loading path is no longer needed.
async function loadBoardCatalog() {
  const storedBoards = await loadCanonicalBoardsFromStorage();
  const boards = storedBoards.sort((a, b) => a.boardId.localeCompare(b.boardId));
  return {
    schema: BOARD_CATALOG_SCHEMA,
    generatedAt: new Date().toISOString(),
    boardCount: boards.length,
    boards,
    runtimeBoards: boards.map(toRuntimeBoard),
  };
}

async function listResourceFilesRecursive(baseDir, relativeDir = "") {
  const absoluteDir = path.join(baseDir, relativeDir);
  let entries = [];
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const nextRelative = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listResourceFilesRecursive(baseDir, nextRelative)));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    files.push(`/${path.posix.join("resources", ...nextRelative.split(path.sep))}`);
  }
  return files;
}

async function loadResourceAssetCatalog() {
  const files = await listResourceFilesRecursive(RESOURCES_DIR);
  files.sort((a, b) => a.localeCompare(b));
  return {
    schema: "tt-beamer.resources.v1",
    generatedAt: new Date().toISOString(),
    count: files.length,
    files,
  };
}

const IMAGE_IMPORT_ALLOWED_MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const IMAGE_IMPORT_ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const IMAGE_IMPORT_MAX_BYTES = 10 * 1024 * 1024;

function parseMultipartBoundary(contentType = "") {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(String(contentType));
  const rawBoundary = (match?.[1] ?? match?.[2] ?? "").trim();
  return rawBoundary || null;
}

function parseContentDispositionParams(headerValue = "") {
  const params = {};
  const parts = String(headerValue).split(";").map((entry) => entry.trim());
  for (const part of parts.slice(1)) {
    const [rawKey, ...rest] = part.split("=");
    const key = String(rawKey || "").trim().toLowerCase();
    const rawValue = rest.join("=").trim();
    if (!key) {
      continue;
    }
    params[key] = rawValue.replace(/^"|"$/g, "");
  }
  return params;
}

async function parseMultipartFormData(req, { maxBytes = IMAGE_IMPORT_MAX_BYTES } = {}) {
  const contentType = String(req.headers["content-type"] || "");
  const boundary = parseMultipartBoundary(contentType);
  if (!boundary) {
    throw Object.assign(new Error("missing multipart boundary"), { code: "IMPORT_MULTIPART_BOUNDARY_MISSING" });
  }

  const chunks = [];
  let totalSize = 0;
  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > maxBytes) {
      throw Object.assign(new Error("multipart payload too large"), { code: "IMPORT_PAYLOAD_TOO_LARGE" });
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("binary");
  const marker = `--${boundary}`;
  const segments = raw.split(marker);
  const parts = [];

  for (let segment of segments) {
    if (!segment || segment === "--" || segment === "--\r\n") {
      continue;
    }
    if (segment.startsWith("\r\n")) {
      segment = segment.slice(2);
    }
    if (segment.endsWith("\r\n")) {
      segment = segment.slice(0, -2);
    }
    if (segment.endsWith("--")) {
      segment = segment.slice(0, -2);
    }
    const separatorIndex = segment.indexOf("\r\n\r\n");
    if (separatorIndex < 0) {
      continue;
    }
    const headerBlock = segment.slice(0, separatorIndex);
    const bodyBinary = segment.slice(separatorIndex + 4);
    const headers = {};
    for (const line of headerBlock.split("\r\n")) {
      const colonIndex = line.indexOf(":");
      if (colonIndex <= 0) {
        continue;
      }
      const key = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();
      headers[key] = value;
    }
    const disposition = parseContentDispositionParams(headers["content-disposition"] || "");
    const part = {
      headers,
      name: disposition.name || null,
      filename: disposition.filename || null,
      contentType: String(headers["content-type"] || "").toLowerCase(),
      data: Buffer.from(bodyBinary, "binary"),
    };
    parts.push(part);
  }

  return parts;
}

function resolveImageImportExtension(filePart) {
  const mimeExt = IMAGE_IMPORT_ALLOWED_MIME_TO_EXT[filePart.contentType] ?? null;
  if (mimeExt) {
    return mimeExt;
  }
  const filename = String(filePart.filename || "").toLowerCase();
  const ext = path.extname(filename).replace(/^\./, "");
  if (IMAGE_IMPORT_ALLOWED_EXTENSIONS.has(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return null;
}

async function handleImageBoardImport(req, res) {
  let parts;
  try {
    parts = await parseMultipartFormData(req, { maxBytes: IMAGE_IMPORT_MAX_BYTES });
  } catch (error) {
    const code = String(error?.code || "");
    if (code === "IMPORT_PAYLOAD_TOO_LARGE") {
      sendJson(res, 413, { error: "payload too large", code });
      return;
    }
    sendJson(res, 400, { error: "invalid multipart payload", code: code || "IMPORT_MULTIPART_INVALID" });
    return;
  }

  const textFieldMap = new Map();
  let imagePart = null;
  for (const part of parts) {
    if (part.filename && part.name === "image" && !imagePart) {
      imagePart = part;
      continue;
    }
    if (part.name && !part.filename) {
      textFieldMap.set(part.name, part.data.toString("utf8").trim());
    }
  }

  if (!imagePart) {
    sendJson(res, 400, {
      error: "missing image file field 'image'",
      code: "IMPORT_IMAGE_MISSING_FILE",
    });
    return;
  }

  if (!imagePart.data || imagePart.data.length === 0) {
    sendJson(res, 400, {
      error: "uploaded image is empty",
      code: "IMPORT_IMAGE_EMPTY",
    });
    return;
  }

  const extension = resolveImageImportExtension(imagePart);
  if (!extension) {
    sendJson(res, 400, {
      error: "unsupported image type; allowed: jpg, jpeg, png, webp",
      code: "IMPORT_IMAGE_INVALID_TYPE",
    });
    return;
  }

  const requestedBoardId = String(textFieldMap.get("boardId") || "").trim();
  const requestedBoardName = String(textFieldMap.get("boardName") || textFieldMap.get("name") || "").trim();
  const filenameStem = path.basename(String(imagePart.filename || "upload"), path.extname(String(imagePart.filename || "upload")));
  // Phase 15-4: prefer boardName -> filenameStem -> timestamp when no
  // explicit boardId is supplied. The client no longer exposes a
  // boardId text input; the server derives + conflict-resolves.
  const boardIdSeed = requestedBoardId
    || requestedBoardName
    || filenameStem
    || `board-${Date.now().toString(36)}`;
  const baseSafeBoardId = sanitizeBoardFileName(boardIdSeed);
  if (!baseSafeBoardId) {
    sendJson(res, 400, {
      error: "boardId is invalid after normalization",
      code: "IMPORT_INVALID_BOARD_ID",
    });
    return;
  }

  await migrateLegacyImportedBoardStorage();
  await mkdir(BOARD_STORAGE_DIR, { recursive: true });
  await mkdir(BOARD_ASSETS_DIR, { recursive: true });

  // Phase 15-4: auto-resolve conflicts with a -2 / -3 / ... suffix so
  // the user never needs to type an ID themselves. If the user DID
  // provide an explicit boardId we still respect it exactly and
  // return 409 on collision (caller opted into their own naming).
  let safeBoardId = baseSafeBoardId;
  let boardJsonPath = path.join(BOARD_STORAGE_DIR, `${safeBoardId}.json`);
  if (requestedBoardId) {
    if (BUILTIN_BOARD_IDS.has(safeBoardId)) {
      sendJson(res, 409, {
        error: "boardId conflicts with a built-in board",
        code: "IMPORT_BOARD_ID_CONFLICT",
        boardId: safeBoardId,
      });
      return;
    }
    try {
      await stat(boardJsonPath);
      sendJson(res, 409, {
        error: "board import already exists",
        code: "IMPORT_ALREADY_EXISTS",
        boardId: safeBoardId,
      });
      return;
    } catch {
      // proceed
    }
  } else {
    let suffix = 2;
    while (BUILTIN_BOARD_IDS.has(safeBoardId) || await pathExists(boardJsonPath)) {
      safeBoardId = `${baseSafeBoardId}-${suffix}`;
      boardJsonPath = path.join(BOARD_STORAGE_DIR, `${safeBoardId}.json`);
      suffix += 1;
      if (suffix > 500) {
        sendJson(res, 500, {
          error: "could not find a free boardId after 500 attempts",
          code: "IMPORT_BOARD_ID_EXHAUSTED",
          boardId: baseSafeBoardId,
        });
        return;
      }
    }
  }

  const imageFileName = `${safeBoardId}-${Date.now().toString(36)}.${extension}`;
  const imageFilePath = path.join(BOARD_ASSETS_DIR, imageFileName);
  await writeFile(imageFilePath, imagePart.data);

  const imageSrc = `/config/boards/assets/${imageFileName}`;
  const normalized = normalizeBoardDefinition({
    boardId: safeBoardId,
    metadata: {
      name: requestedBoardName || safeBoardId,
      imageSrc,
    },
    roomCatalog: [],
    roomClusters: [],
  }, {
    source: "catalog-image",
    allowEmptyRoomCatalog: true,
  });
  if (!normalized.ok) {
    sendJson(res, 400, {
      error: "board image import validation failed",
      code: "IMPORT_IMAGE_VALIDATION_FAILED",
      issues: normalized.issues,
    });
    return;
  }

  const payload = {
    schema: BOARD_IMPORT_SCHEMA,
    importedAt: new Date().toISOString(),
    board: normalized.board,
  };
  await writeFile(boardJsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const catalog = await loadBoardCatalog();
  sendJson(res, 201, {
    ok: true,
    code: "IMPORT_IMAGE_OK",
    boardId: safeBoardId,
    board: normalized.board,
    imagePath: `config/boards/assets/${imageFileName}`,
    targetPath: `config/boards/${safeBoardId}.json`,
    boardCount: catalog.boardCount,
    catalogGeneratedAt: catalog.generatedAt,
  });
}

async function handleBoardImport(req, res) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (contentType.startsWith("multipart/form-data")) {
    await handleImageBoardImport(req, res);
    return;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (chunks.reduce((size, item) => size + item.length, 0) > 5 * 1024 * 1024) {
      sendJson(res, 413, { error: "payload too large", code: "IMPORT_PAYLOAD_TOO_LARGE" });
      return;
    }
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    sendJson(res, 400, { error: "invalid JSON payload", code: "IMPORT_INVALID_JSON" });
    return;
  }

  const incomingBoard = parsed?.board ?? parsed;
  const normalized = normalizeBoardDefinition(incomingBoard, { source: "catalog-import" });
  if (!normalized.ok) {
    sendJson(res, 400, {
      error: "board import validation failed",
      code: "IMPORT_VALIDATION_FAILED",
      issues: normalized.issues,
    });
    return;
  }

  const board = normalized.board;
  if (BUILTIN_BOARD_IDS.has(board.boardId)) {
    sendJson(res, 409, {
      error: "boardId conflicts with a built-in board",
      code: "IMPORT_BOARD_ID_CONFLICT",
      boardId: board.boardId,
    });
    return;
  }

  const safeFileName = sanitizeBoardFileName(board.boardId);
  if (!safeFileName) {
    sendJson(res, 400, {
      error: "boardId produced an invalid file name",
      code: "IMPORT_INVALID_BOARD_ID",
    });
    return;
  }

  await migrateLegacyImportedBoardStorage();
  await mkdir(BOARD_STORAGE_DIR, { recursive: true });
  const targetPath = path.join(BOARD_STORAGE_DIR, `${safeFileName}.json`);
  try {
    await stat(targetPath);
    sendJson(res, 409, {
      error: "board import already exists",
      code: "IMPORT_ALREADY_EXISTS",
      boardId: board.boardId,
    });
    return;
  } catch {
    // proceed
  }

  const payload = {
    schema: BOARD_IMPORT_SCHEMA,
    importedAt: new Date().toISOString(),
    board,
  };
  await writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const catalog = await loadBoardCatalog();
  sendJson(res, 201, {
    ok: true,
    code: "IMPORT_OK",
    boardId: board.boardId,
    targetPath: `config/boards/${safeFileName}.json`,
    board,
    catalogGeneratedAt: catalog.generatedAt,
    boardCount: catalog.boardCount,
  });
}

function isValidPolygon(points) {
  return (
    Array.isArray(points) &&
    points.length >= 3 &&
    points.every(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1])),
    )
  );
}

function mergeSpecialPolygonMap(primaryMap, fallbackMap) {
  const merged = { ...(fallbackMap && typeof fallbackMap === "object" ? fallbackMap : {}) };
  if (!primaryMap || typeof primaryMap !== "object") {
    return merged;
  }
  for (const [roomId, polygon] of Object.entries(primaryMap)) {
    if (isValidPolygon(polygon)) {
      merged[roomId] = polygon;
    }
  }
  return merged;
}

function mergeBoardProfiles(primaryProfiles, fallbackProfiles) {
  const merged = {};
  const boardIds = new Set([
    ...Object.keys(fallbackProfiles ?? {}),
    ...Object.keys(primaryProfiles ?? {}),
  ]);

  for (const boardId of boardIds) {
    const primary = primaryProfiles?.[boardId] ?? {};
    const fallback = fallbackProfiles?.[boardId] ?? {};
    const mergedPlayAreas = Array.isArray(primary.playAreas) && primary.playAreas.length > 0
      ? primary.playAreas
      : Array.isArray(fallback.playAreas) && fallback.playAreas.length > 0
        ? fallback.playAreas
        : null;
    const selectedPlayAreaCandidate = String(primary.selectedPlayAreaId || fallback.selectedPlayAreaId || "").trim();
    const selectedPlayAreaId = mergedPlayAreas && mergedPlayAreas.some((entry) => String(entry?.id || "").trim() === selectedPlayAreaCandidate)
      ? selectedPlayAreaCandidate
      : String(mergedPlayAreas?.[0]?.id || "play-area-1");
    const selectedPlayArea = Array.isArray(mergedPlayAreas)
      ? mergedPlayAreas.find((entry) => String(entry?.id || "").trim() === selectedPlayAreaId) ?? mergedPlayAreas[0]
      : null;
    const selectedPlayAreaPolygon = isValidPolygon(selectedPlayArea?.polygon)
      ? selectedPlayArea.polygon
      : null;
    merged[boardId] = {
      ...fallback,
      ...primary,
      specialPolygons: mergeSpecialPolygonMap(primary.specialPolygons, fallback.specialPolygons),
      ...(Array.isArray(mergedPlayAreas)
        ? {
          playAreas: mergedPlayAreas,
          selectedPlayAreaId,
        }
        : {}),
      playAreaPolygon: isValidPolygon(primary.playAreaPolygon)
        ? primary.playAreaPolygon
        : selectedPlayAreaPolygon
          ?? (isValidPolygon(primary.shipPolygon)
            ? primary.shipPolygon
            : isValidPolygon(fallback.playAreaPolygon)
              ? fallback.playAreaPolygon
              : isValidPolygon(fallback.shipPolygon)
                ? fallback.shipPolygon
                : undefined),
    };
  }

  return merged;
}

async function handleGlobalDefaultsSave(req, res) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (chunks.reduce((size, item) => size + item.length, 0) > 5 * 1024 * 1024) {
      sendJson(res, 413, { error: "payload too large" });
      return;
    }
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    sendJson(res, 400, { error: "invalid JSON payload" });
    return;
  }

  if (!parsed || typeof parsed !== "object") {
    sendJson(res, 400, { error: "payload must be an object" });
    return;
  }

  let existing = null;
  try {
    const currentRaw = await readFile(GLOBAL_DEFAULTS_PATH, "utf8");
    existing = JSON.parse(currentRaw);
  } catch {
    existing = null;
  }

  const next = {
    schema: "tt-beamer.global-defaults.v1",
    savedAt: new Date().toISOString(),
    source: parsed.source ?? "browser-local-state",
    boardProfiles: mergeBoardProfiles(parsed.boardProfiles ?? {}, existing?.boardProfiles ?? {}),
    audio: parsed.audio ?? { enabled: true, volume: 0.7 },
    animationSpeed: parsed.animationSpeed ?? 1,
    animationSoundMap: parsed.animationSoundMap ?? {},
  };

  await writeFile(GLOBAL_DEFAULTS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  // Phase 13-1: broadcast a config-update notification to every connected
  // client so they refetch and apply the new global config immediately.
  // We reuse the existing live-session WebSocket fan-out.
  try {
    broadcastLiveSession("global-config-update", {
      target: "config/global-defaults.json",
      savedAt: next.savedAt,
      source: next.source,
    });
  } catch (error) {
    // Broadcast failures must not break the file write response.
    console.warn("[global-defaults] broadcast failed:", error?.message || error);
  }

  sendJson(res, 200, {
    ok: true,
    target: "config/global-defaults.json",
    savedAt: next.savedAt,
  });
}

function resolveStaticPath(urlValue, routePath) {
  if (routePath === "/output/final") {
    return path.join(ROOT_DIR, "index.html");
  }
  return toSafePath(urlValue || "/");
}

async function handleStaticFile(req, res, routePath) {
  const targetPath = resolveStaticPath(req.url, routePath);
  if (!targetPath) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }

  try {
    const fileStat = await stat(targetPath);
    const resolvedPath = fileStat.isDirectory() ? path.join(targetPath, "index.html") : targetPath;
    const stream = createReadStream(resolvedPath);
    res.writeHead(200, {
      "content-type": getMimeType(resolvedPath),
    });
    stream.pipe(res);
  } catch {
    res.writeHead(404, {
      "content-type": "text/plain; charset=utf-8",
    });
    res.end("not found");
  }
}

const server = createServer(async (req, res) => {
  try {
    const routePath = normalizeRoutePath(req.url || "/");

    if (req.method === "GET" && routePath === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        service: "tt-beamer-api",
        saveEndpoint: "/api/global-defaults",
        boardCatalogEndpoint: "/api/boards",
        boardImportEndpoint: "/api/boards/import",
        liveTelemetryEndpoint: "/api/live/telemetry",
        postSupported: true,
        liveLogPath: LIVE_LOG_PATH,
      });
      return;
    }

    if (req.method === "OPTIONS" && routePath === "/api/global-defaults") {
      res.writeHead(204, {
        allow: "GET,HEAD,POST,OPTIONS",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && routePath === "/api/live/state") {
      sendJson(res, 200, {
        ok: true,
        session: liveSessionState,
      });
      return;
    }

    if (req.method === "GET" && routePath === "/api/live/snapshot") {
      const requestUrl = new URL(req.url || "/api/live/snapshot", "http://localhost");
      const sinceVersion = Number.parseInt(requestUrl.searchParams.get("sinceVersion") ?? "0", 10);
      const normalizedSince = Number.isFinite(sinceVersion) && sinceVersion > 0 ? sinceVersion : 0;
      const currentVersion = Number(liveSessionState.version ?? 0);
      const changed = currentVersion > normalizedSince;
      sendJson(res, 200, {
        ok: true,
        changed,
        sinceVersion: normalizedSince,
        session: {
          version: currentVersion,
          updatedAt: liveSessionState.updatedAt,
          snapshot: liveSessionState.snapshot,
          lastMutation: liveSessionState.lastMutation,
        },
      });
      return;
    }

    if (req.method === "POST" && routePath === "/api/live/command") {
      let parsed;
      try {
        parsed = await parseJsonBody(req, { maxBytes: 2 * 1024 * 1024 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "invalid JSON payload";
        if (message.includes("payload too large")) {
          sendJson(res, 413, { ok: false, error: "payload too large" });
          return;
        }
        sendJson(res, 400, { ok: false, error: "invalid JSON payload" });
        return;
      }
      const mutationType = normalizeNonEmptyString(parsed?.mutationType);
      if (!mutationType || !acceptLiveMutationType(mutationType)) {
        sendJson(res, 400, {
          ok: false,
          error: "invalid mutationType",
          code: "LIVE_COMMAND_INVALID_TYPE",
        });
        return;
      }
      const payload = isPlainObject(parsed?.payload) ? parsed.payload : {};
      const mutationId = normalizeNonEmptyString(parsed?.mutationId)
        ?? `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const role = normalizeNonEmptyString(parsed?.role) ?? "control";
      const clientId = normalizeNonEmptyString(parsed?.clientId) ?? "http-command";
      const ack = await acceptCommandMutation({
        mutationType,
        payload,
        mutationId,
        role,
        clientId,
      });
      sendJson(res, 202, {
        ok: true,
        commandAccepted: true,
        mutationType,
        mutationId,
        version: ack?.version ?? liveSessionState.version,
        applied: Boolean(ack?.applied),
        duplicate: Boolean(ack?.duplicate),
        stale: Boolean(ack?.stale),
        overflow: Boolean(ack?.overflow),
        queueDepth: ack?.queueDepth ?? getLiveQueueSize(),
        serverTimestamp: ack?.serverTimestamp ?? liveSessionState.updatedAt,
        serverIngestTimestamp: ack?.serverIngestTimestamp ?? null,
      });
      return;
    }

    if (req.method === "GET" && routePath === "/api/live/telemetry") {
      sendJson(res, 200, {
        ok: true,
        schema: "tt-beamer.live-telemetry.v1",
        generatedAt: new Date().toISOString(),
        telemetry: buildLiveTelemetrySnapshot(),
      });
      return;
    }

    if (req.method === "GET" && routePath === "/api/boards") {
      const catalog = await loadBoardCatalog();
      sendJson(res, 200, catalog);
      return;
    }

    if (req.method === "GET" && routePath === "/api/resources") {
      const catalog = await loadResourceAssetCatalog();
      sendJson(res, 200, catalog);
      return;
    }

    if (req.method === "POST" && routePath === "/api/boards/import") {
      await handleBoardImport(req, res);
      return;
    }

    if (req.method === "POST" && routePath === "/api/global-defaults") {
      await handleGlobalDefaultsSave(req, res);
      return;
    }

    if (req.method === "GET" && routePath === "/api/global-defaults") {
      try {
        const content = await readFile(GLOBAL_DEFAULTS_PATH, "utf8");
        const parsed = JSON.parse(content);
        sendJson(res, 200, parsed);
      } catch {
        sendJson(res, 404, { error: "global defaults not found" });
      }
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, {
        allow: "GET,HEAD,POST,OPTIONS",
      });
      res.end();
      return;
    }

    await handleStaticFile(req, res, routePath);
  } catch (error) {
    logErrorEvent("http-handler-error", error instanceof Error ? error.message : "unknown", {
      route: req.url || "/",
      method: req.method,
    });
    sendJson(res, 500, {
      error: "internal server error",
      detail: error instanceof Error ? error.message : "unknown",
    });
  }
});

attachLiveWebSocket(server);

// Phase 16: auto-start default animations from global-defaults.json
// so the first snapshot clients receive already includes them.
try {
  const globalDefaultsRaw = readFileSync(path.join(ROOT_DIR, "config", "global-defaults.json"), "utf8");
  const globalDefaults = JSON.parse(globalDefaultsRaw);
  const boardProfiles = globalDefaults?.boardProfiles ?? {};
  const allDefaults = [];
  for (const [boardId, profile] of Object.entries(boardProfiles)) {
    const defaults = Array.isArray(profile?.defaultAnimations) ? profile.defaultAnimations : [];
    for (const def of defaults) {
      if (!def?.type || !def?.scope) continue;
      allDefaults.push({
        id: `default-${boardId}-${def.roomId || def.type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        boardId: def.boardId || boardId,
        type: def.type,
        animationName: def.animationName ?? def.type,
        scope: def.scope || "room",
        roomId: def.roomId ?? null,
        clusterId: def.clusterId ?? null,
        clusterName: def.clusterName ?? null,
        roomAssetType: def.roomAssetType ?? "coded",
        roomAssetRef: def.roomAssetRef ?? def.type,
        soundAssetRef: def.soundAssetRef ?? "none",
        intensity: def.intensity ?? 0.8,
        speed: def.speed ?? 1,
        opacity: def.opacity ?? 0.9,
        soundVolume: def.soundVolume ?? 1,
        rotationDeg: def.rotationDeg ?? 0,
        stretchToPolygon: def.stretchToPolygon !== false,
        widthScale: def.widthScale ?? 1,
        heightScale: def.heightScale ?? 1,
        offsetXScale: def.offsetXScale ?? 0,
        offsetYScale: def.offsetYScale ?? 0,
        hold: true,
        durationMs: null,
        startedAtEpochMs: Date.now(),
      });
    }
  }
  if (allDefaults.length > 0) {
    if (!liveSessionState.snapshot.runtime) {
      liveSessionState.snapshot.runtime = {};
    }
    liveSessionState.snapshot.runtime.runningAnimations = allDefaults;
    liveSessionState.version = 1;
    liveSessionState.updatedAt = new Date().toISOString();
    console.log(`[default-animations] Pre-loaded ${allDefaults.length} default animation(s) into live session`);
  }
} catch (error) {
  console.warn("[default-animations] Could not load defaults:", error?.message || error);
}

server.listen(PORT, HOST, () => {
  logSessionEvent("server-start", {
    host: HOST,
    port: PORT,
    logPath: LIVE_LOG_PATH,
  });
  console.log(`TT Beamer server listening on http://${HOST}:${PORT}`);
});
