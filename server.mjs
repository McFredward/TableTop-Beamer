import { createServer } from "node:http";
import { readFile, writeFile, stat, appendFile, mkdir, readdir, unlink } from "node:fs/promises";
import { createReadStream, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFairQueueState,
  dequeueFairMutation,
  createApplySliceController,
} from "./src/live/hf9-command-pipeline.mjs";
import { bootSsrRenderHost, setActiveSsrRenderHost, shutdownSsrRenderHost, getActiveSsrRenderHost } from "./src/server/ssr-render-host.mjs";
import { bootMediasoupRouter, shutdownMediasoupRouter, purgeStaleMediasoupWorker, setOnRouterRecreated } from "./src/server/ssr-mediasoup-router.mjs";
import { attachWebRtcSignaling } from "./src/server/ssr-webrtc-signaling.mjs";
import { buildSsrReadyResponse } from "./src/server/ssr-ready-handler.mjs";
import { ensureMediasoupClientBundle, readMediasoupClientBundle, MEDIASOUP_CLIENT_BUNDLE_PATH } from "./src/server/ssr-stream-publisher.mjs";
// active-animations persistence (in-session writer; cold-start
// restore was retired in Phase 43 per operator request) + align-mode
// grid round-trip.
import {
  persistRunningAnimations, flushRunningAnimations,
  loadActiveGrid, persistActiveGrid, flushActiveGrid,
} from "./src/server/ssr-state-restore.mjs";
// Phase 31 Plan 04: serverRendering config schema (5 enum settings) + live-sync.
import {
  validateServerRenderingPatch,
  applyServerRenderingPatch,
  readFullConfig as readServerRenderingFullConfig,
  scheduleServerRenderingWrite,
  SERVER_RENDERING_DEFAULTS,
} from "./src/server/ssr-server-rendering-config.mjs";
// Phase-31 h15: hardware-agnostic resource header helper (Connection: close
// for /resources/animations/* etc.) — see module header for rationale.
import { buildStaticResourceHeaders } from "./src/server/static-resource-headers.mjs";

// Phase 32 D-B5: module-scoped signalingState reference so the /api/ssr/ready
// route handler can read state.videoProducer without touching the boot block.
let signalingState = null;

const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.PORT ?? 4173);
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GLOBAL_DEFAULTS_PATH = path.join(ROOT_DIR, "config", "global-defaults.json");
const LIVE_LOG_PATH = process.env.TT_BEAMER_LIVE_LOG_PATH ?? path.join(ROOT_DIR, "logs", "live-sync.jsonl");
const PROJECTION_PROFILES_PATH = path.join(ROOT_DIR, "config", "projection-profiles.json");
const BOARD_STORAGE_DIR = path.join(ROOT_DIR, "config", "boards");
const BOARD_ASSETS_DIR = path.join(BOARD_STORAGE_DIR, "assets");
const RESOURCES_DIR = path.join(ROOT_DIR, "resources");
// Phase 28 B5 — central asset manifest with sha256[:12] cache-busting tokens.
const ASSET_MANIFEST_PATH = path.join(ROOT_DIR, "config", "asset-manifest.json");
const ASSET_MANIFEST_SCHEMA = "tt-beamer.asset-manifest.v1";

const BOARD_CATALOG_SCHEMA = "tt-beamer.board-catalog.v1";
const BOARD_DEFINITION_SCHEMA = "tt-beamer.board.v2";
const BOARD_IMPORT_SCHEMA = "tt-beamer.board-import.v1";
const BOARD_PACKAGE_SCHEMA = "tt-beamer.board-package.v4";
// Phase 16: no more builtin board IDs — all boards are catalog entries.
const BUILTIN_BOARD_IDS = new Set();

// Phase 26: per-board live-state fields stored inline in
// config/boards/<id>.json. Anything in this list is what used to
// live in global-defaults.json :: boardProfiles[<id>] before the
// unification. global-defaults.json now only holds truly-global
// state (audio, animationSpeed, projectionMapping).
// Phase 29 h1: per-room polygons collapsed to `roomCatalog[*].polygon`
// (single source of truth — the polygon-editor now writes/reads
// `room.polygon` directly). `roomGeometry` removed from disk
// persistence — runtime keeps the in-memory `roomGeometryByBoard`
// slice (drawAnimation reads stretchX/offsetX defaults) but the
// on-disk field was always `{}` and contributed nothing.
const BOARD_PROFILE_FIELDS = Object.freeze([
  "hitareaCalibration",
  "playAreas",
  "selectedPlayAreaId",
  "outsideFx",
  "insideFx",
  "roomFx",
  "defaultAnimations",
  "frozenRooms",
  // Phase 28 B1 (D-02): per-board memory of the last-loaded/saved
  // projection profile. Read+written via the existing extract/persist
  // iterators below — no other server.mjs change is required.
  "lastUsedProfileName",
]);

function extractProfileFromUnifiedBoard(board) {
  if (!board || typeof board !== "object") return {};
  const profile = {};
  // roomCatalog and roomClusters are part of the unified board
  // shape AND part of what runtime-side boardProfiles consumers
  // expect. Both surfaces read them — emit them in the synthesized
  // profile too.
  if (Array.isArray(board.roomCatalog)) profile.roomCatalog = board.roomCatalog;
  if (Array.isArray(board.roomClusters)) profile.roomClusters = board.roomClusters;
  for (const field of BOARD_PROFILE_FIELDS) {
    if (board[field] !== undefined) {
      profile[field] = board[field];
    }
  }
  return profile;
}

// Phase 29 D-07: Bundle export filters the board payload to LIVE fields only.
// The allowed-set is derived from BOARD_PROFILE_FIELDS (post-Phase-29 = 11 entries)
// plus the structural keys that every board carries (schema, boardId, metadata,
// roomCatalog, roomClusters). Any DEAD field still lingering in in-memory state
// is silently dropped from the exported package.
function filterBoardToLiveFields(board) {
  if (!board || typeof board !== "object") return board;
  const allowedTopKeys = new Set([
    "schema",
    "boardId",
    "metadata",
    "roomCatalog",
    "roomClusters",
    ...BOARD_PROFILE_FIELDS,
  ]);
  const out = {};
  for (const [k, v] of Object.entries(board)) {
    if (allowedTopKeys.has(k)) out[k] = v;
  }
  return out;
}

const LIVE_STATE_SCHEMA = "tt-beamer.live-state.v1";

const liveSessionState = {
  version: 0,
  updatedAt: new Date().toISOString(),
  lastMutation: null,
  snapshot: {
    schema: LIVE_STATE_SCHEMA,
    alignMode: false,
    // Phase 27 (B5/D-06): true while /output/ has unsaved align-mode geometry.
    // Cleared on /output/ save/discard, OR by the 10s grace timer if /output/
    // disconnects while dirty.
    alignModeDirtyOnOutput: false,
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
  // Phase 31 Plan 04 (D-D1): Pi pointer drag → server mesh-warp update.
  "align-corner-drag",
  // Phase 31 h30 (2026-05-06): full-grid sync from Pi handle-drag to SSR tab.
  // The single-vertex align-corner-drag misses rotate / scale / line / squish
  // gestures; this mutation carries the full grid so the SSR tab can
  // reproduce any handle-ui drag.
  "align-grid-snapshot",
  // Phase 31 Plan 04 (publishability): live-sync write to
  // config/global-defaults.json#serverRendering (5 enum settings).
  "serverRendering-update",
]);
const CONTROL_CRITICAL_MUTATIONS = new Set(["stop-animation", "clear-all"]);
const NON_COALESCING_MUTATIONS = new Set([
  "trigger-global",
  "trigger-room",
  "edit-room",
  "stop-animation",
  "clear-all",
  "align-toggle",
  // Phase 31 Plan 04: each serverRendering-update click is a discrete
  // intent — config writes must NOT coalesce. align-corner-drag is
  // INTENTIONALLY coalescible (60Hz drag benefits from coalescing).
  "serverRendering-update",
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

// Phase 31 Plan 04 (D-D1) — V5 ASVS payload validation for align-corner-drag.
// STRIDE T-31-04-01 mitigation: Pi pointer events are LAN-trusted but the
// payload shape must still be validated server-side before apply.
//
//   phase           ∈ {"start","move","end"}
//   vertexId        ∈ ℤ ∩ [0, 99]
//   normalizedX/Y   ∈ ℝ ∩ [0, 1] (finite)
//   profileId       ∈ string, length 1..200
function validateAlignCornerDragPayload(p) {
  if (!p || typeof p !== "object") return false;
  if (p.phase !== "start" && p.phase !== "move" && p.phase !== "end") return false;
  if (!Number.isInteger(p.vertexId) || p.vertexId < 0 || p.vertexId > 99) return false;
  if (!Number.isFinite(p.normalizedX) || p.normalizedX < 0 || p.normalizedX > 1) return false;
  if (!Number.isFinite(p.normalizedY) || p.normalizedY < 0 || p.normalizedY > 1) return false;
  if (typeof p.profileId !== "string" || p.profileId.length === 0 || p.profileId.length > 200) return false;
  return true;
}

// Phase 35-iter2 h8 (2026-05-10): the h4-h7 align-input-event mutation
// + validator was removed because the architecture was incorrect — the
// SSR Chromium tab doesn't render align-mode handles (per
// runtime-projection-handle-ui.js _isSsrChromiumTab gate at line 1638),
// so dispatching synthetic events on the SSR tab had no effect. Pi
// /output/ owns the full align-mode UI; align-grid-snapshot is the
// single mutation that Pi → SSR uses to keep the warp grid in sync.

// Phase 31 h30 (2026-05-06) — full-grid sync mutation.
//
// align-corner-drag is too narrow: it only conveys a single vertex move
// matching the receiver-input-forwarder's 4-corner hit-test. When the user
// drags handles directly on Pi /output/ (handle-ui's full feature set —
// rotate handles, scale handles, line drag, squish bars, arrow-key fine
// tune), each gesture mutates many points or shifts the srcXs/srcYs lines.
// align-grid-snapshot carries the FULL grid so the SSR Chromium tab can
// reproduce ANY gesture exactly.
//
// Payload shape:
//   srcXs    : finite numbers in [0, 1], strictly ascending, length 2..16
//   srcYs    : same as srcXs
//   points   : array of {row:int, col:int, x:number, y:number}, each
//              row/col in-range, x/y in [0, 1]; length === srcXs.length * srcYs.length
//   profileId: string 1..200 (active projection-profile id; informational)
//
// Sized to the existing 5x5 default grid (25 points) plus headroom.
// 16x16 = 256 points * ~32 bytes JSON ≈ 8 KB, well under the WS frame
// budget.  STRIDE T-31-30-01 mitigation: full server-side shape check
// before apply.
function validateAlignGridSnapshotPayload(p) {
  if (!p || typeof p !== "object") return false;
  if (typeof p.profileId !== "string" || p.profileId.length === 0 || p.profileId.length > 200) return false;
  if (!Array.isArray(p.srcXs) || p.srcXs.length < 2 || p.srcXs.length > 16) return false;
  if (!Array.isArray(p.srcYs) || p.srcYs.length < 2 || p.srcYs.length > 16) return false;
  for (const v of p.srcXs) {
    if (!Number.isFinite(v) || v < 0 || v > 1) return false;
  }
  for (const v of p.srcYs) {
    if (!Number.isFinite(v) || v < 0 || v > 1) return false;
  }
  if (!Array.isArray(p.points)) return false;
  const expected = p.srcXs.length * p.srcYs.length;
  if (p.points.length !== expected) return false;
  for (const pt of p.points) {
    if (!pt || typeof pt !== "object") return false;
    if (!Number.isInteger(pt.row) || pt.row < 0 || pt.row >= p.srcYs.length) return false;
    if (!Number.isInteger(pt.col) || pt.col < 0 || pt.col >= p.srcXs.length) return false;
    if (!Number.isFinite(pt.x) || pt.x < 0 || pt.x > 1) return false;
    if (!Number.isFinite(pt.y) || pt.y < 0 || pt.y > 1) return false;
  }
  return true;
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
    const clearDefaults = payload?.clearDefaults === true;
    const isDefault = (entry) => String(entry?.id || "").startsWith("default-");
    const shouldStop = (entry) => clearDefaults || !isDefault(entry);

    for (const entry of runningAnimations) {
      if (!shouldStop(entry)) continue;
      if (entry?.scope !== "global" || !entry?.boardId || !entry?.type) continue;
      const triggerKey = `${entry.boardId}:${entry.type}`;
      const stopRevision = Number(globalStopRevisions[triggerKey]) || 0;
      globalStopRevisions[triggerKey] = stopRevision + 1;
    }
    const kept = runningAnimations.filter((e) => !shouldStop(e));
    runningAnimations.length = 0;
    runningAnimations.push(...kept);

    let outsideFxByBoard = null;
    if (clearDefaults) {
      outsideFxByBoard = readOutsideFxByBoard();
      for (const [boardId, profile] of Object.entries(outsideFxByBoard)) {
        outsideFxByBoard[boardId] = {
          ...(isPlainObject(profile) ? profile : {}),
          enabled: false,
        };
      }
      nextRuntime.outsideFxByBoard = outsideFxByBoard;
    }
    nextRuntime.runningAnimations = runningAnimations;
    nextRuntime.globalStopRevisions = globalStopRevisions;
    globalClearRevision += 1;
    nextRuntime.globalClearRevision = globalClearRevision;
    return {
      runtime: nextRuntime,
      ...(outsideFxByBoard ? { outsideFxByBoard } : {}),
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
    // Phase 21-1: persist per-instance outside knobs (speed/opacity/mode/
    // direction) through the server-authoritative record so the Pi client
    // (and /output) render with the values the control client captured
    // from the definition at trigger time. Without this, the snapshot
    // roundtrip stripped these fields and the draw path had to fall back
    // to the definition.
    const incomingSpeed = Number(incomingAnimation?.speed);
    const incomingOpacity = Number(incomingAnimation?.opacity);
    const incomingMode = normalizeNonEmptyString(incomingAnimation?.mode);
    const incomingDirection = normalizeNonEmptyString(incomingAnimation?.direction);
    const authoritativeAnimation = {
      id: "",
      scope: "global",
      boardId,
      type: animationType,
      intensity: Number.isFinite(Number(incomingAnimation?.intensity)) ? Number(incomingAnimation.intensity) : 1,
      ...(Number.isFinite(incomingSpeed) ? { speed: incomingSpeed } : {}),
      ...(Number.isFinite(incomingOpacity) ? { opacity: incomingOpacity } : {}),
      ...(incomingMode ? { mode: incomingMode } : {}),
      ...(incomingDirection ? { direction: incomingDirection } : {}),
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
      const prevProfile = isPlainObject(outsideFxByBoard[targetBoardId]) ? outsideFxByBoard[targetBoardId] : {};
      outsideFxByBoard[targetBoardId] = {
        ...prevProfile,
        enabled: action !== "stop",
        // Phase 20: trigger-global for an outside animation must also point
        // the renderer at that specific definition — otherwise starting
        // "outside-sandstorm" still renders whatever selectedAnimationId
        // previously pointed to (often "outside-space" or nothing).
        ...(action !== "stop" && animationType
          ? { selectedAnimationId: animationType }
          : {}),
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
    nextRuntime.runningAnimations = buildDefaultAnimationsForBoard(selectedBoard);
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

  // Phase 31 Plan 04 (D-D1): V5 ASVS validation for align-corner-drag.
  // STRIDE T-31-04-01 mitigation. Reject malformed payloads BEFORE apply.
  if (mutationType === "align-corner-drag") {
    if (!validateAlignCornerDragPayload(payload)) {
      logErrorEvent("align-corner-drag-rejected", "invalid-payload-shape", {
        clientId,
        role,
        mutationId: normalizedMutationId,
      });
      return {
        applied: false,
        duplicate: false,
        stale: false,
        rejected: true,
        rejectReason: "align-corner-drag-invalid-payload",
        mutationClass: mutationClass ?? classifyLiveMutationType(mutationType, payload),
        priority: priority ?? resolveMutationPriority(mutationType, payload),
        serverTimestamp: new Date().toISOString(),
        serverIngestTimestamp: ingestAt ?? new Date().toISOString(),
        version: liveSessionState.version,
      };
    }
  }

  // Phase 31 h30: full-grid sync validation. Reject malformed payloads
  // BEFORE apply. STRIDE T-31-30-01 mitigation.
  if (mutationType === "align-grid-snapshot") {
    if (!validateAlignGridSnapshotPayload(payload)) {
      logErrorEvent("align-grid-snapshot-rejected", "invalid-payload-shape", {
        clientId,
        role,
        mutationId: normalizedMutationId,
      });
      return {
        applied: false,
        duplicate: false,
        stale: false,
        rejected: true,
        rejectReason: "align-grid-snapshot-invalid-payload",
        mutationClass: mutationClass ?? classifyLiveMutationType(mutationType, payload),
        priority: priority ?? resolveMutationPriority(mutationType, payload),
        serverTimestamp: new Date().toISOString(),
        serverIngestTimestamp: ingestAt ?? new Date().toISOString(),
        version: liveSessionState.version,
      };
    }
  }

  // Phase 31 Plan 04 (publishability): validate serverRendering-update before apply.
  if (mutationType === "serverRendering-update") {
    const validation = validateServerRenderingPatch(payload);
    if (!validation.valid) {
      logErrorEvent("serverRendering-update-rejected", validation.reason, {
        clientId,
        role,
        mutationId: normalizedMutationId,
      });
      return {
        applied: false,
        duplicate: false,
        stale: false,
        rejected: true,
        rejectReason: validation.reason,
        mutationClass: mutationClass ?? classifyLiveMutationType(mutationType, payload),
        priority: priority ?? resolveMutationPriority(mutationType, payload),
        serverTimestamp: new Date().toISOString(),
        serverIngestTimestamp: ingestAt ?? new Date().toISOString(),
        version: liveSessionState.version,
      };
    }
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
  } else if (mutationType === "align-corner-drag") {
    if (process.env.SSR_ALIGN_DEBUG === "1"
      && (payload.phase === "start" || payload.phase === "end")) {
      console.log(
        `[align-drag] received phase=${payload.phase} v=${payload.vertexId}`,
        `xy=(${Number(payload.normalizedX).toFixed(3)},${Number(payload.normalizedY).toFixed(3)})`,
        `from=${role}/${clientId}`,
      );
    }
    // The SSR Chromium tab is a live-sync client and applies the mesh-warp
    // update via existing client-side align-mode handlers. Server's role
    // here is validation + fanout — runtime patch carries the drag event
    // through unchanged so the SSR tab and dashboard preview both see it.
    nextSnapshotPatch = {
      runtime: {
        ...readRuntimeSnapshot(),
        lastAlignCornerDrag: {
          phase: payload.phase,
          vertexId: payload.vertexId,
          normalizedX: payload.normalizedX,
          normalizedY: payload.normalizedY,
          profileId: payload.profileId,
          at: new Date().toISOString(),
        },
      },
    };
  } else if (mutationType === "align-grid-snapshot") {
    // Write the full grid snapshot to runtime so the broadcast carries
    // it to all clients. The SSR Chromium tab applies it via
    // gridState.restoreGridSnapshot. The originating client ignores it
    // via the originatorClientId check in the live-sync apply path.
    //
    // Diagnostic log fires per snapshot (one line per drag tick) — it's
    // the proof-of-decode signal for phase-38-w10 WS reassembly tests.
    // Only emits during active align-mode drag, so it's bounded by
    // operator interaction; no steady-state spam.
    {
      const cornerTL = payload.points?.find?.((p) => p.row === 0 && p.col === 0);
      const lastRow = (payload.srcYs?.length ?? 1) - 1;
      const lastCol = (payload.srcXs?.length ?? 1) - 1;
      const cornerBR = payload.points?.find?.((p) => p.row === lastRow && p.col === lastCol);
      const dims = `${payload.srcYs?.length ?? 0}×${payload.srcXs?.length ?? 0}`;
      console.log(
        `[align-grid-snapshot] server-recv from=${role}/${clientId} `
        + `dims=${dims} `
        + `corners=TL(${cornerTL?.x?.toFixed(2)},${cornerTL?.y?.toFixed(2)})..`
        + `BR(${cornerBR?.x?.toFixed(2)},${cornerBR?.y?.toFixed(2)}) `
        + `profile=${payload.profileId}`,
      );
    }
    nextSnapshotPatch = {
      runtime: {
        ...readRuntimeSnapshot(),
        lastAlignGridSnapshot: {
          srcXs: payload.srcXs.slice(),
          srcYs: payload.srcYs.slice(),
          points: payload.points.map((pt) => ({
            row: pt.row, col: pt.col, x: pt.x, y: pt.y,
          })),
          profileId: payload.profileId,
          originatorClientId: clientId,
          at: new Date().toISOString(),
          // 2026-05-15 fix: propagate isBaseline so /output/'s WS-receive
          // can distinguish a profile-load reset from a drag-mutation and
          // POST dirty=false (instead of the relay POST(true)) — fixes
          // operator's "Unsaved on /output/" sticking after a clean load.
          isBaseline: Boolean(payload.isBaseline),
        },
      },
    };
    // Server-side mirror: a baseline mutation also clears the dirty flag
    // immediately, so the broadcast that lands on clients carries
    // alignModeDirtyOnOutput=false in the same envelope (no race with the
    // separate /api/align-mode-dirty POST).
    if (payload.isBaseline) {
      _setAlignModeDirty(false, "align-grid-snapshot-baseline");
    }
    // Phase-31 h41: persist the active grid to disk so the SSR Chromium
    // tab's next boot and any newly-connecting client picks it up via
    // live-hello + the h40 apply path. Debounced 200 ms inside
    // persistActiveGrid; fire-and-forget here.
    persistActiveGrid({
      rootDir: ROOT_DIR,
      srcXs: payload.srcXs,
      srcYs: payload.srcYs,
      points: payload.points,
      profileId: payload.profileId,
    }).catch((err) => {
      console.error("[active-grid] persist failed:", err?.message || err);
    });
  } else if (mutationType === "serverRendering-update") {
    // Persist the patched 5-key serverRendering block to global-defaults.json
    // via the Phase-13-style debounced writer. Snapshot patch is a no-op
    // wrt runtime state — the broadcast itself is the live-sync signal so
    // Plan-05's UI re-fetches /api/global-defaults.
    //
    // When the patched key includes `encoder`/`qualityPreset`/
    // `fpsTarget`/`resolutionPreference`, restart the SSR Chromium tab so
    // the new value takes effect on the next launch. /output/ reconnect
    // banner fires automatically.
    (async () => {
      try {
        const current = await readServerRenderingFullConfig({ rootDir: ROOT_DIR });
        const next = applyServerRenderingPatch(current, payload);
        await scheduleServerRenderingWrite({ rootDir: ROOT_DIR, fullConfig: next });
        // h18 (2026-05-06): restart the SSR host on ANY quality-relevant
        // key change (not just `encoder`). resolveEncoderConfig reads
        // qualityPreset, fpsTarget, resolutionPreference too — so user
        // changing preset in the dashboard MUST restart for the change
        // to be reflected in the encoder, the diagnostic overlay's
        // serverInfo, AND the streamed output. Without this, the user
        // sees "balanced" forever in the chip (h17 reported issue).
        const restartKeys = ["encoder", "qualityPreset", "fpsTarget", "resolutionPreference"];
        const needsRestart =
          payload && typeof payload === "object"
          && restartKeys.some((k) => Object.prototype.hasOwnProperty.call(payload, k));
        if (needsRestart) {
          const changedKeys = restartKeys.filter((k) =>
            Object.prototype.hasOwnProperty.call(payload, k),
          );
          console.log(
            `[serverRendering-update] keys=${changedKeys.join(",")} → restarting SSR render host…`,
          );
          try { await shutdownSsrRenderHost(); } catch (err) {
            console.warn("[serverRendering-update] shutdown error:", err?.message || err);
          }
          try {
            // Phase 33 Plan 01-T3 + 02-T2: same onHostDown + watchdog wiring.
            const ssrHost = bootSsrRenderHost({
              port: PORT,
              autoStart: true,
              onHostDown: () => {
                try { signalingState?.broadcastRenderHostDown?.(); } catch (err) {
                  console.warn(`[server] broadcastRenderHostDown failed: ${err?.message ?? err}`);
                }
              },
              // Phase 33 Plan 02-T2 (h2): default to -1 (the cold-boot
              // sentinel) when signaling isn't attached or accessor is
              // missing — Infinity would falsely trip the watchdog before
              // the publisher has had a chance to connect.
              getPublisherWsAgeMs: () => {
                try { return signalingState?.getPublisherWsAgeMs?.() ?? -1; }
                catch { return -1; }
              },
            });
            setActiveSsrRenderHost(ssrHost);
            // h18: re-publish serverInfo from the new host so the
            // diagnostic overlay reflects the new preset/encoder/bitrate
            // within ~250ms of the restart completing.
            try {
              await globalThis.__ttbRefreshServerInfo?.(ssrHost);
            } catch (err) {
              console.warn(
                "[serverRendering-update] serverInfo refresh failed:",
                err?.message || err,
              );
            }
          } catch (err) {
            console.warn("[serverRendering-update] reboot error:", err?.message || err);
          }
        }
      } catch (err) {
        console.warn("[serverRendering-update] persist failed:", err?.message || err);
      }
    })();
    nextSnapshotPatch = {
      runtime: readRuntimeSnapshot(),
    };
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

// Phase 38 W10 (2026-05-11) — streaming-capable WebSocket frame decoder.
//
// Sentinel return shapes:
//   { kind: "need-more", consumed: 0 }                 // not enough bytes yet
//   { kind: "frame", frame: {close, text}, consumed }  // one complete frame consumed
//   { kind: "protocol-error", consumed }               // malformed / non-text / unmasked
//
// Callers maintain a per-socket Buffer and drain it in a loop. This replaces
// the pre-W10 single-shot decoder (which assumed each socket.on("data", chunk)
// event delivered a complete frame). That assumption held on localhost (MTU
// 65536) but broke on real Ethernet (MTU 1500) the moment a single frame
// exceeded ~1380 bytes — e.g. the operator's 9×9 xrandrv2 align-grid-snapshot
// (~3-5 KB) which fragmented across multiple TCP segments and was silently
// dropped. See test/phase-38-w10-ws-frame-fragmentation.test.mjs for the
// reproducer that proved this.
function tryDecodeWebSocketFrame(buf) {
  if (!buf || buf.length < 2) {
    return { kind: "need-more", consumed: 0 };
  }
  const firstByte = buf[0];
  const secondByte = buf[1];
  const opcode = firstByte & 0x0f;
  // Opcodes we accept: 0x1 (text) and 0x8 (close). Anything else is a
  // protocol error — consume the header byte to make forward progress.
  if (opcode === 0x8) {
    // Close frames: we don't care about the body, just signal close. Still
    // need enough bytes for the 2-byte header + optional mask+payload.
    if (buf.length < 2) return { kind: "need-more", consumed: 0 };
    // Don't bother parsing close payload; the caller will close the socket.
    return { kind: "frame", frame: { close: true, text: null }, consumed: 2 };
  }
  if (opcode !== 0x1) {
    return { kind: "protocol-error", consumed: 1 };
  }
  const masked = (secondByte & 0x80) === 0x80;
  const initialPayloadLength = secondByte & 0x7f;
  // Client→server frames MUST be masked per RFC 6455 §5.1. If a client
  // sends an unmasked frame, the connection is malformed.
  if (!masked) {
    return { kind: "protocol-error", consumed: 0 };
  }
  let cursor = 2;
  let payloadLength = initialPayloadLength;
  if (initialPayloadLength === 126) {
    if (buf.length < cursor + 2) return { kind: "need-more", consumed: 0 };
    payloadLength = buf.readUInt16BE(cursor);
    cursor += 2;
  } else if (initialPayloadLength === 127) {
    if (buf.length < cursor + 8) return { kind: "need-more", consumed: 0 };
    const value = Number(buf.readBigUInt64BE(cursor));
    if (!Number.isFinite(value) || value > 8 * 1024 * 1024) {
      // 8 MB hard cap (T-31-30-01 sized for grid-snapshot 16×16 worst case
      // with headroom). Frames larger than this are rejected to bound
      // memory; consume the whole frame's header so the buffer can move on.
      return { kind: "protocol-error", consumed: cursor + 8 };
    }
    payloadLength = value;
    cursor += 8;
  }
  // 4-byte mask + payload bytes must all be present before we can decode.
  const need = cursor + 4 + payloadLength;
  if (buf.length < need) {
    return { kind: "need-more", consumed: 0 };
  }
  const maskOffset = cursor;
  const payloadOffset = maskOffset + 4;
  const mask = buf.subarray(maskOffset, maskOffset + 4);
  const payload = buf.subarray(payloadOffset, payloadOffset + payloadLength);
  const unmasked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i += 1) {
    unmasked[i] = payload[i] ^ mask[i % 4];
  }
  return {
    kind: "frame",
    frame: { close: false, text: unmasked.toString("utf8") },
    consumed: need,
  };
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
      // Phase 31 h1: do NOT destroy — other upgrade handlers (e.g. SSR
      // WebRTC signaling at /api/webrtc/signal) need a chance to claim
      // this socket. Just ignore and return; if no other handler claims
      // it, Node closes the socket itself when no listener responds.
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
    if (role === "final-output") {
      // Phase 27 (B5/D-06): a fresh /output/ client connecting cancels any pending grace timer.
      // The new client will (re)broadcast its dirty state via POST /api/align-mode-dirty as needed.
      _resetAlignModeDirtyGraceTimer();
    }
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

    // Phase 38 W10 (2026-05-11): per-socket WS frame reassembly buffer.
    // Each socket.on("data", chunk) appends to recvBuf; we then drain the
    // buffer via tryDecodeWebSocketFrame in a loop until either no more
    // complete frames are available or a protocol error is encountered.
    // The 8 MB cap on the accumulator bounds memory if a misbehaving client
    // sends junk without ever completing a frame.
    let recvBuf = Buffer.alloc(0);
    const RECV_BUF_MAX = 8 * 1024 * 1024 + 1024; // payload cap + header headroom

    function handleDecodedFrame(frame) {
      if (frame.close) {
        socket.end();
        return false; // stop draining
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
          return true;
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
          return true;
        }
        if (parsed?.type !== "live-mutation") {
          return true;
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
      return true;
    }

    socket.on("data", (chunk) => {
      // Append the new bytes to the per-socket reassembly buffer. Bound the
      // accumulator so a stuck client cannot exhaust server memory.
      recvBuf = recvBuf.length === 0 ? chunk : Buffer.concat([recvBuf, chunk]);
      if (recvBuf.length > RECV_BUF_MAX) {
        logErrorEvent("invalid-ws-frame", "recv-buffer-overflow", {
          clientId,
          role,
          bufLen: recvBuf.length,
        });
        socket.destroy();
        return;
      }
      // Drain all complete frames currently in the buffer.
      while (recvBuf.length > 0) {
        const r = tryDecodeWebSocketFrame(recvBuf);
        if (r.kind === "need-more") {
          // Wait for more bytes to arrive in a subsequent "data" event.
          return;
        }
        if (r.kind === "protocol-error") {
          logErrorEvent("invalid-ws-frame", "frame-decode-failed", {
            clientId,
            role,
            consumed: r.consumed,
            bufLen: recvBuf.length,
          });
          // Advance past the broken header byte to make forward progress
          // (or drop the buffer entirely if consumed === 0 — defensive).
          if (r.consumed > 0 && r.consumed <= recvBuf.length) {
            recvBuf = recvBuf.subarray(r.consumed);
          } else {
            recvBuf = Buffer.alloc(0);
          }
          continue;
        }
        // r.kind === "frame" — consume and dispatch.
        recvBuf = recvBuf.subarray(r.consumed);
        const keepDraining = handleDecodedFrame(r.frame);
        if (!keepDraining) return;
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
      // Phase 27 (B5/D-06): if a final-output client disconnected while dirty=true,
      // start the 10 s grace timer. D-04 single-/output/ assumption keeps this safe.
      if (role === "final-output" && liveSessionState.snapshot.alignModeDirtyOnOutput) {
        _startAlignModeDirtyGraceTimer();
      }
    });
    socket.on("error", (error) => {
      liveClients.delete(clientId);
      lastBroadcastVersionByClient.delete(clientId);
      logErrorEvent("socket-error", error instanceof Error ? error.message : "unknown", {
        clientId,
        role,
      });
      // Phase 27 (B5/D-06): same grace timer on socket error for final-output.
      if (role === "final-output" && liveSessionState.snapshot.alignModeDirtyOnOutput) {
        _startAlignModeDirtyGraceTimer();
      }
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
  // Phase 39 Plan 39-2 D-01: video MIME types. Without these, Chromium 131
  // refuses to decode .mp4 served as application/octet-stream and the
  // <video> element errors with MEDIA_ELEMENT_ERROR (Format error /
  // NETWORK_NO_SOURCE). Verified empirically in 39-RESEARCH.md.
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".m4v":  "video/mp4",
  ".mov":  "video/quicktime",
  // Additional audio MIME entries (research Pitfall 2 — audit asset extensions).
  ".ogg":  "audio/ogg",
  ".aac":  "audio/aac",
  ".m4a":  "audio/mp4",
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

// ── Projection profiles (per-board, server-side) ───────────────────────────
// Layout on disk: { [boardId]: { [profileName]: gridState } }

async function loadProjectionProfilesRaw() {
  try {
    const content = await readFile(PROJECTION_PROFILES_PATH, "utf8");
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveProjectionProfilesRaw(data) {
  await mkdir(path.dirname(PROJECTION_PROFILES_PATH), { recursive: true });
  await writeFile(PROJECTION_PROFILES_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// ── Minimal pure-Node ZIP encoder/decoder (DEFLATE) ───────────────────────
// Used by the board-package export/import so large MP4 assets travel as
// real .zip instead of base64-inflated JSON.
let ZIP_CRC_TABLE = null;
function zipCrc32(buffer) {
  if (!ZIP_CRC_TABLE) {
    ZIP_CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      ZIP_CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) {
    c = ZIP_CRC_TABLE[(c ^ buffer[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function buildZipArchive(entries) {
  // entries: [{ path: string, data: Buffer, store?: boolean }]
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >>> 1)) & 0xFFFF;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.path, "utf8");
    const raw = entry.data;
    const crc = zipCrc32(raw);
    // Already-compressed media (mp4/gif/png/jpg/mp3/webm/...) barely shrinks
    // through deflate and just wastes CPU. Store them uncompressed.
    const ext = path.extname(entry.path).slice(1).toLowerCase();
    const incompressible = new Set(["mp4", "mp3", "gif", "png", "jpg", "jpeg", "webp", "webm", "ogg", "m4a", "aac", "flac"]);
    const store = entry.store ?? incompressible.has(ext);
    const compressed = store ? raw : deflateRawSync(raw);
    const method = store ? 0 : 8;

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6); // UTF-8 filename
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(dosTime, 10);
    lh.writeUInt16LE(dosDate, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(compressed.length, 18);
    lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    chunks.push(lh, nameBuf, compressed);
    central.push({ nameBuf, crc, compressedSize: compressed.length, uncompressedSize: raw.length, offset, dosTime, dosDate, method });
    offset += 30 + nameBuf.length + compressed.length;
  }

  const centralStart = offset;
  for (const e of central) {
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(0x031E, 4); // made by: UNIX / v3.0
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(e.method, 10);
    c.writeUInt16LE(e.dosTime, 12);
    c.writeUInt16LE(e.dosDate, 14);
    c.writeUInt32LE(e.crc, 16);
    c.writeUInt32LE(e.compressedSize, 20);
    c.writeUInt32LE(e.uncompressedSize, 24);
    c.writeUInt16LE(e.nameBuf.length, 28);
    c.writeUInt16LE(0, 30);
    c.writeUInt16LE(0, 32);
    c.writeUInt16LE(0, 34);
    c.writeUInt16LE(0, 36);
    c.writeUInt32LE(0, 38);
    c.writeUInt32LE(e.offset, 42);
    chunks.push(c, e.nameBuf);
    offset += 46 + e.nameBuf.length;
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(central.length, 8);
  eocd.writeUInt16LE(central.length, 10);
  eocd.writeUInt32LE(offset - centralStart, 12);
  eocd.writeUInt32LE(centralStart, 16);
  eocd.writeUInt16LE(0, 20);
  chunks.push(eocd);
  return Buffer.concat(chunks);
}

function parseZipArchive(buffer) {
  // Scan backwards for EOCD signature (allow for ZIP comments up to 65535)
  let eocd = -1;
  const maxScan = Math.max(0, buffer.length - 65558);
  for (let i = buffer.length - 22; i >= maxScan; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error("not a ZIP file (no end-of-central-directory signature)");
  const totalEntries = buffer.readUInt16LE(eocd + 10);
  const centralStart = buffer.readUInt32LE(eocd + 16);

  const entries = [];
  let p = centralStart;
  for (let i = 0; i < totalEntries; i++) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) throw new Error("bad central directory");
    const method = buffer.readUInt16LE(p + 10);
    const compressedSize = buffer.readUInt32LE(p + 20);
    const nameLen = buffer.readUInt16LE(p + 28);
    const extraLen = buffer.readUInt16LE(p + 30);
    const commentLen = buffer.readUInt16LE(p + 32);
    const localOffset = buffer.readUInt32LE(p + 42);
    const filename = buffer.slice(p + 46, p + 46 + nameLen).toString("utf8");

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("bad local header");
    const lnl = buffer.readUInt16LE(localOffset + 26);
    const lel = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lnl + lel;
    const rawData = buffer.slice(dataStart, dataStart + compressedSize);
    let data;
    if (method === 0) data = rawData;
    else if (method === 8) data = inflateRawSync(rawData);
    else throw new Error(`unsupported compression method ${method} in entry "${filename}"`);
    entries.push({ path: filename, data });

    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readRawBody(req, { maxBytes = 500 * 1024 * 1024 } = {}) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("payload too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Phase 27 (B5/D-06) — align-mode dirty-flag enforcement.
let _alignModeDirtyGraceTimer = null;
let _alignModeDirtyLastAcceptedMs = 0;   // T-27-03 rate limit (one toggle per 100 ms)
const ALIGN_MODE_DIRTY_RATE_LIMIT_MS = 100;
const ALIGN_MODE_DIRTY_GRACE_TIMEOUT_MS = 10_000;

function _broadcastAlignModeDirty() {
  try {
    broadcastLiveSession("global-config-update", {
      target: "live-session.alignModeDirtyOnOutput",
      source: "align-mode-dirty-update",
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("[align-mode-dirty] broadcast failed:", error?.message || error);
  }
}

function _setAlignModeDirty(nextDirty, sourceContext = "unknown") {
  const next = Boolean(nextDirty);
  if (liveSessionState.snapshot.alignModeDirtyOnOutput === next) {
    return false;
  }
  liveSessionState.snapshot = {
    ...liveSessionState.snapshot,
    alignModeDirtyOnOutput: next,
  };
  liveSessionState.version += 1;
  liveSessionState.updatedAt = new Date().toISOString();
  logSessionEvent("align-mode-dirty-update", { dirty: next, source: sourceContext });
  _broadcastAlignModeDirty();
  return true;
}

function _resetAlignModeDirtyGraceTimer() {
  if (_alignModeDirtyGraceTimer) {
    clearTimeout(_alignModeDirtyGraceTimer);
    _alignModeDirtyGraceTimer = null;
  }
}

function _startAlignModeDirtyGraceTimer() {
  _resetAlignModeDirtyGraceTimer();
  _alignModeDirtyGraceTimer = setTimeout(() => {
    _alignModeDirtyGraceTimer = null;
    if (liveSessionState.snapshot.alignModeDirtyOnOutput) {
      _setAlignModeDirty(false, "grace-timer-expired");
    }
  }, ALIGN_MODE_DIRTY_GRACE_TIMEOUT_MS);
}

function sanitizeProfileName(value) {
  const s = String(value || "").trim();
  if (!s) return null;
  if (s.length > 80) return null;
  return s;
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
  // Persist running animations to disk for in-session SSR-tab crash
  // recovery (200ms debounce in ssr-state-restore.mjs). Phase 43 retired
  // the cold-boot restore path; the file is still useful for mid-session
  // SSR-tab respawn.
  {
    const runtime = liveSessionState.snapshot?.runtime;
    if (runtime && Array.isArray(runtime.runningAnimations)) {
      const boardId =
        normalizeNonEmptyString(liveSessionState.snapshot.selectedBoard)
        ?? normalizeNonEmptyString(runtime.selectedBoard)
        ?? normalizeNonEmptyString(runtime.boardId)
        ?? null;
      persistRunningAnimations({
        rootDir: ROOT_DIR,
        boardId,
        runningAnimations: runtime.runningAnimations,
      }).catch((err) => {
        console.error("[ssr-persist] failed:", err?.message || err);
      });
    }
  }
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
  const imageSrc = String(inputBoard?.metadata?.imageSrc || inputBoard?.src || "").trim();
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

  // Pass through Phase-26 unified profile fields so the on-disk
  // shape (config/boards/<id>.json) can carry both static catalog
  // data and live-state data in one file.
  const profileExtras = {};
  for (const field of BOARD_PROFILE_FIELDS) {
    if (inputBoard?.[field] !== undefined) {
      profileExtras[field] = inputBoard[field];
    }
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
      ...profileExtras,
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

async function loadCanonicalBoardsFromStorage() {
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

// Phase 26: synthesize the runtime-side boardProfiles map by
// reading every config/boards/<id>.json and projecting each into
// just the live-state fields. Used to keep the GET /api/global-
// defaults response shape stable for existing clients.
async function synthesizeBoardProfiles() {
  const storedBoards = await loadCanonicalBoardsFromStorage();
  const profiles = {};
  for (const board of storedBoards) {
    profiles[board.boardId] = extractProfileFromUnifiedBoard(board);
  }
  return profiles;
}

// Phase 26: write a single board's live-state fields back into
// its config/boards/<id>.json, preserving the static fields (and
// any extras the caller didn't touch). Caller passes the
// per-board slice of the incoming boardProfiles payload.
async function persistBoardProfileToBoardFile(boardId, profile) {
  const safeFileName = sanitizeBoardFileName(boardId);
  if (!safeFileName) return false;
  const filePath = path.join(BOARD_STORAGE_DIR, `${safeFileName}.json`);
  let outer;
  try {
    const raw = await readFile(filePath, "utf8");
    outer = JSON.parse(raw);
  } catch {
    return false;
  }
  const inner = outer && typeof outer === "object" ? (outer.board ?? outer) : null;
  if (!inner || typeof inner !== "object") return false;

  // Apply incoming profile fields. Profile owns roomCatalog +
  // roomClusters because the runtime is the canonical source for
  // user-edited geometry.
  if (profile && typeof profile === "object") {
    if (Array.isArray(profile.roomCatalog)) inner.roomCatalog = profile.roomCatalog;
    if (Array.isArray(profile.roomClusters)) inner.roomClusters = profile.roomClusters;
    for (const field of BOARD_PROFILE_FIELDS) {
      if (profile[field] !== undefined) {
        inner[field] = profile[field];
      }
    }
  }

  if (outer.board) {
    outer.board = inner;
  } else {
    outer = inner;
  }
  await writeFile(filePath, `${JSON.stringify(outer, null, 2)}\n`, "utf8");
  return true;
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
  // Phase 28 B5 — flat hashByPath map for client cache-busting.
  const manifest = runtimeAssetManifest || (await loadAssetManifest());
  const hashByPath = {};
  for (const [url, entry] of Object.entries(manifest.hashByPath || {})) {
    if (entry && typeof entry.hash === "string") {
      hashByPath[url] = entry.hash;
    }
  }
  return {
    schema: "tt-beamer.resources.v1",
    generatedAt: new Date().toISOString(),
    count: files.length,
    files,
    hashByPath,
  };
}

const ANIMATION_RESOURCE_CONFIG = {
  folder: "animations",
  absoluteDir: path.join(RESOURCES_DIR, "animations"),
  maxBytes: 50 * 1024 * 1024,
  extensions: new Set(["gif", "mp4"]),
};
const SOUND_RESOURCE_CONFIG = {
  folder: "sounds",
  absoluteDir: path.join(RESOURCES_DIR, "sounds"),
  maxBytes: 20 * 1024 * 1024,
  extensions: new Set(["mp3", "wav", "ogg", "m4a"]),
};

// ============================================================================
// Phase 28 B5 — asset manifest infrastructure.
//
// The manifest is a single JSON file at config/asset-manifest.json holding a
// flat hashByPath map. Each entry stores `{ hash, size, mtime }` where `hash`
// is a sha256(bytes).digest("hex").substring(0, 12) cache-busting token (NOT
// a security/integrity control — purely a URL cache-busting suffix). Clients
// build `?v=<hash>` URL suffixes which invalidate (a) the browser HTTP cache,
// (b) the path-keyed in-memory `Image`/`HTMLVideoElement` Maps in the render
// layer, all in one stroke because the URL string IS the cache key.
// ============================================================================

let runtimeAssetManifest = null;

async function loadAssetManifest() {
  try {
    const raw = await readFile(ASSET_MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (
      parsed?.schema !== ASSET_MANIFEST_SCHEMA
      || !parsed.hashByPath
      || typeof parsed.hashByPath !== "object"
    ) {
      return {
        schema: ASSET_MANIFEST_SCHEMA,
        generatedAt: new Date().toISOString(),
        hashByPath: {},
      };
    }
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {
        schema: ASSET_MANIFEST_SCHEMA,
        generatedAt: new Date().toISOString(),
        hashByPath: {},
      };
    }
    console.warn("[asset-manifest] load failed:", error?.message || error);
    return {
      schema: ASSET_MANIFEST_SCHEMA,
      generatedAt: new Date().toISOString(),
      hashByPath: {},
    };
  }
}

async function saveAssetManifest(manifest) {
  manifest.schema = ASSET_MANIFEST_SCHEMA;
  manifest.generatedAt = new Date().toISOString();
  await mkdir(path.dirname(ASSET_MANIFEST_PATH), { recursive: true });
  await writeFile(
    ASSET_MANIFEST_PATH,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

function computeAssetHash(buffer) {
  // D-12: sha256[:12] — cache-busting token only, NOT for content authentication.
  return createHash("sha256").update(buffer).digest("hex").substring(0, 12);
}

async function synthesizeAssetManifestFromDisk() {
  const manifest = {
    schema: ASSET_MANIFEST_SCHEMA,
    generatedAt: new Date().toISOString(),
    hashByPath: {},
  };
  for (const config of [ANIMATION_RESOURCE_CONFIG, SOUND_RESOURCE_CONFIG]) {
    let entries = [];
    try {
      entries = await readdir(config.absoluteDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filename = entry.name;
      const ext = path.extname(filename).replace(/^\./, "").toLowerCase();
      if (!config.extensions.has(ext)) continue;
      const absolute = path.join(config.absoluteDir, filename);
      try {
        const buf = await readFile(absolute);
        const fileStat = await stat(absolute);
        const url = `/resources/${config.folder}/${filename}`;
        manifest.hashByPath[url] = {
          hash: computeAssetHash(buf),
          size: buf.length,
          mtime: fileStat.mtime.toISOString(),
        };
      } catch (err) {
        console.warn(
          `[asset-manifest] failed to hash ${absolute}:`,
          err?.message || err,
        );
      }
    }
  }
  return manifest;
}

async function ensureAssetManifestOnBoot() {
  const existing = await loadAssetManifest();
  const synthesized = await synthesizeAssetManifestFromDisk();
  // Preserve existing mtime where the hash matches (avoid touching mtime on
  // every boot just because the file was re-stat'd). Idempotent: re-running
  // yields identical output as long as the bytes on disk are unchanged.
  for (const [url, entry] of Object.entries(synthesized.hashByPath)) {
    const prior = existing.hashByPath?.[url];
    if (prior && prior.hash === entry.hash && prior.mtime) {
      entry.mtime = prior.mtime;
    }
  }
  await saveAssetManifest(synthesized);
  runtimeAssetManifest = synthesized;
  console.log(
    `[asset-manifest] ready (${Object.keys(synthesized.hashByPath).length} entries)`,
  );
}

function sanitizeResourceFilename(raw, config) {
  const cleaned = String(raw ?? "")
    .replace(/\\/g, "/")
    .split("/").pop()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!cleaned) return null;
  const ext = path.extname(cleaned).replace(/^\./, "");
  if (!config.extensions.has(ext)) return null;
  const stem = path.basename(cleaned, `.${ext}`);
  if (!stem) return null;
  return `${stem}.${ext}`;
}

function resolveResourcePath(filename, config) {
  const safe = sanitizeResourceFilename(filename, config);
  if (!safe) return null;
  const resolved = path.join(config.absoluteDir, safe);
  if (!resolved.startsWith(config.absoluteDir + path.sep)) return null;
  return { absolute: resolved, filename: safe, url: `/resources/${config.folder}/${safe}` };
}

async function handleResourceUpload(req, res, config) {
  const requestUrl = new URL(req.url || `/api/resources/${config.folder}`, "http://localhost");
  const rawName = requestUrl.searchParams.get("filename");
  const target = resolveResourcePath(rawName, config);
  if (!target) {
    const allow = Array.from(config.extensions).map((e) => `.${e}`).join(", ");
    sendJson(res, 400, { ok: false, error: `invalid filename; allowed extensions: ${allow}` });
    return;
  }
  const chunks = [];
  let totalSize = 0;
  try {
    for await (const chunk of req) {
      totalSize += chunk.length;
      if (totalSize > config.maxBytes) {
        sendJson(res, 413, { ok: false, error: "payload too large" });
        return;
      }
      chunks.push(chunk);
    }
  } catch {
    sendJson(res, 400, { ok: false, error: "upload stream error" });
    return;
  }
  if (totalSize === 0) {
    sendJson(res, 400, { ok: false, error: "empty payload" });
    return;
  }
  // Phase 28 B5 — compute cache-busting hash + persist manifest + broadcast.
  const buffer = Buffer.concat(chunks);
  const hash = computeAssetHash(buffer);
  try {
    await mkdir(config.absoluteDir, { recursive: true });
    await writeFile(target.absolute, buffer);
  } catch {
    sendJson(res, 500, { ok: false, error: "write failed" });
    return;
  }
  // Manifest update + broadcast — failures here MUST NOT fail the upload (the
  // file is already on disk). The manifest will be lazy-rebuilt on next boot.
  try {
    const manifest = await loadAssetManifest();
    manifest.hashByPath[target.url] = {
      hash,
      size: buffer.length,
      mtime: new Date().toISOString(),
    };
    await saveAssetManifest(manifest);
    runtimeAssetManifest = manifest;
    try {
      broadcastLiveSession("global-config-update", {
        target: "config/asset-manifest.json",
        savedAt: manifest.generatedAt,
        source: "asset-upload",
      });
    } catch (broadcastErr) {
      console.warn(
        "[asset-manifest] broadcast failed:",
        broadcastErr?.message || broadcastErr,
      );
    }
  } catch (manifestErr) {
    console.warn(
      "[asset-manifest] update on upload failed:",
      manifestErr?.message || manifestErr,
    );
  }
  sendJson(res, 200, { ok: true, path: target.url, filename: target.filename, hash });
}

async function handleResourceDelete(req, res, config) {
  const requestUrl = new URL(req.url || `/api/resources/${config.folder}`, "http://localhost");
  const rawPath = requestUrl.searchParams.get("path") || requestUrl.searchParams.get("filename");
  const prefixRegex = new RegExp(`^resources\\/${config.folder}\\/`);
  const candidate = String(rawPath || "").replace(/^\/+/, "").replace(prefixRegex, "");
  const target = resolveResourcePath(candidate, config);
  if (!target) {
    sendJson(res, 400, { ok: false, error: "invalid path" });
    return;
  }
  try {
    await unlink(target.absolute);
  } catch (error) {
    if (error?.code === "ENOENT") {
      sendJson(res, 404, { ok: false, error: "file not found" });
      return;
    }
    sendJson(res, 500, { ok: false, error: "delete failed" });
    return;
  }
  // Phase 28 B5 — drop manifest entry + broadcast. Same fail-soft semantics as
  // the upload path: file is already removed, manifest will heal on next boot.
  try {
    const manifest = await loadAssetManifest();
    delete manifest.hashByPath[target.url];
    await saveAssetManifest(manifest);
    runtimeAssetManifest = manifest;
    try {
      broadcastLiveSession("global-config-update", {
        target: "config/asset-manifest.json",
        savedAt: manifest.generatedAt,
        source: "asset-delete",
      });
    } catch (broadcastErr) {
      console.warn(
        "[asset-manifest] broadcast failed:",
        broadcastErr?.message || broadcastErr,
      );
    }
  } catch (manifestErr) {
    console.warn(
      "[asset-manifest] update on delete failed:",
      manifestErr?.message || manifestErr,
    );
  }
  sendJson(res, 200, { ok: true, path: target.url });
}

const handleAnimationResourceUpload = (req, res) => handleResourceUpload(req, res, ANIMATION_RESOURCE_CONFIG);
const handleAnimationResourceDelete = (req, res) => handleResourceDelete(req, res, ANIMATION_RESOURCE_CONFIG);
const handleSoundResourceUpload = (req, res) => handleResourceUpload(req, res, SOUND_RESOURCE_CONFIG);
const handleSoundResourceDelete = (req, res) => handleResourceDelete(req, res, SOUND_RESOURCE_CONFIG);

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
  // Phase 26: image-imported boards start completely empty —
  // including the FX libraries. Explicit empty arrays are written
  // (rather than omitting the fields) so the client's normalizers
  // respect them as "intentionally empty" instead of falling back
  // to factory defaults. The user populates the new board via the
  // animation editor's "copy from another board" feature.
  const normalized = normalizeBoardDefinition({
    boardId: safeBoardId,
    metadata: {
      name: requestedBoardName || safeBoardId,
      imageSrc,
    },
    roomCatalog: [],
    roomClusters: [],
    insideFx: { animations: [] },
    outsideFx: { enabled: false, animations: [] },
    roomFx: { animations: [] },
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

async function handleBoardDelete(req, res) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (chunks.reduce((size, item) => size + item.length, 0) > 64 * 1024) {
      sendJson(res, 413, { error: "payload too large", code: "DELETE_PAYLOAD_TOO_LARGE" });
      return;
    }
  }
  let parsed = {};
  if (chunks.length > 0) {
    const raw = Buffer.concat(chunks).toString("utf8");
    if (raw.trim()) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        sendJson(res, 400, { error: "invalid JSON payload", code: "DELETE_INVALID_JSON" });
        return;
      }
    }
  }
  const boardId = String(parsed?.boardId || "").trim();
  if (!boardId) {
    sendJson(res, 400, { error: "boardId required", code: "DELETE_BOARD_ID_REQUIRED" });
    return;
  }
  if (BUILTIN_BOARD_IDS.has(boardId)) {
    sendJson(res, 409, { error: "cannot delete a built-in board", code: "DELETE_BUILTIN_FORBIDDEN", boardId });
    return;
  }
  const safeFileName = sanitizeBoardFileName(boardId);
  if (!safeFileName) {
    sendJson(res, 400, { error: "invalid boardId", code: "DELETE_INVALID_BOARD_ID" });
    return;
  }
  const targetPath = path.join(BOARD_STORAGE_DIR, `${safeFileName}.json`);
  try {
    await stat(targetPath);
  } catch {
    sendJson(res, 404, { error: "board not found", code: "DELETE_NOT_FOUND", boardId });
    return;
  }
  // Read the board to find its image asset (if any) so we can clean
  // up the orphan image file too. Best-effort — proceeds even if
  // metadata is missing or malformed.
  let imageAssetPath = null;
  try {
    const raw = await readFile(targetPath, "utf8");
    const parsedBoard = JSON.parse(raw);
    const imageSrc = String(parsedBoard?.board?.metadata?.imageSrc || "").trim();
    if (imageSrc.startsWith("/config/boards/assets/")) {
      const rel = imageSrc.replace(/^\/+/, "");
      imageAssetPath = path.join(ROOT_DIR, rel);
    }
  } catch { /* best-effort */ }
  await unlink(targetPath);
  if (imageAssetPath) {
    try { await unlink(imageAssetPath); } catch { /* asset already gone — fine */ }
  }

  // Phase 26: per-board live-state lives inline in the board JSON
  // we just unlinked, so no boardProfiles cascade is needed. We
  // still scrub projection-profiles since those are stored
  // separately keyed by boardId. Shared media (animation gifs/
  // mp4s under /resources/animations/) is intentionally left in
  // place — those are not board-owned.
  try {
    const allProjection = await loadProjectionProfilesRaw();
    if (Object.prototype.hasOwnProperty.call(allProjection, boardId)) {
      delete allProjection[boardId];
      await saveProjectionProfilesRaw(allProjection);
    }
  } catch { /* fine */ }

  const catalog = await loadBoardCatalog();
  sendJson(res, 200, {
    ok: true,
    code: "DELETE_OK",
    boardId,
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

  // Phase 26: per-board live state goes into config/boards/<id>.json,
  // not global-defaults.json. Split the incoming boardProfiles map
  // here and dispatch each entry to its own file.
  const incomingProfiles = parsed.boardProfiles && typeof parsed.boardProfiles === "object"
    ? parsed.boardProfiles
    : {};
  for (const boardId of Object.keys(incomingProfiles)) {
    const profile = incomingProfiles[boardId];
    if (!profile || typeof profile !== "object") continue;
    try {
      await persistBoardProfileToBoardFile(boardId, profile);
    } catch (error) {
      console.warn(`[global-defaults] persist board profile ${boardId} failed:`, error?.message || error);
    }
  }

  const incomingDiagnosticOverlay = typeof parsed.diagnosticOverlay === "boolean" ? parsed.diagnosticOverlay : null;
  const existingDiagnosticOverlay = typeof existing?.diagnosticOverlay === "boolean" ? existing.diagnosticOverlay : null;
  const diagnosticOverlay = incomingDiagnosticOverlay ?? existingDiagnosticOverlay ?? false;

  const next = {
    schema: "tt-beamer.global-defaults.v1",
    savedAt: new Date().toISOString(),
    source: parsed.source ?? "browser-local-state",
    audio: parsed.audio ?? { enabled: true, volume: 0.7 },
    animationSpeed: parsed.animationSpeed ?? 1,
    diagnosticOverlay,
    // Phase 19-2: projection mapping corners persist across saves
    ...(parsed.projectionMapping || existing?.projectionMapping
      ? { projectionMapping: parsed.projectionMapping ?? existing?.projectionMapping }
      : {}),
    // Preserve the serverRendering block written by the separate
    // serverRendering-update mutation path. Without this preserve,
    // every saveGlobalDefaults POST (diagnosticOverlay toggle, audio
    // volume change, etc.) wipes the operator's encoder / preset /
    // resolution / fpsTarget / streamFpsCap and the Settings → System
    // → Server-side Rendering radios reset to "no value selected".
    ...(existing?.serverRendering && typeof existing.serverRendering === "object"
      ? { serverRendering: existing.serverRendering }
      : {}),
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
  // Phase 34 D-04: SSR Chromium tab navigates here for the full app.
  // Localhost-only enforcement is layered at the ssr-tab WS role guard
  // (ssr-webrtc-signaling.mjs:269); the HTTP response itself is the same
  // index.html bytes the dashboard receives, so no fingerprinting risk.
  if (routePath === "/ssr") {
    return path.join(ROOT_DIR, "index.html");
  }
  // Phase 34 D-04: thin consumer page (Pi /output/, /output/final).
  // Replaces the previous "return index.html for /output" mapping.
  if (routePath === "/output/final" || routePath === "/output") {
    return path.join(ROOT_DIR, "output.html");
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
    const contentType = getMimeType(resolvedPath);
    // Phase-31 h15 (2026-05-06): hardware-agnostic GIF/MP4 fetch fix.
    // Resource paths get Connection: close so HTTP/1.1 clients (Chromium,
    // Pi, Firefox, curl) cannot reuse a half-broken keep-alive socket.
    // See src/server/static-resource-headers.mjs for full rationale.
    const headers = buildStaticResourceHeaders(routePath, contentType);

    // Phase 39 Plan 39-2 D-01: HTTP Range request support.
    // Required so Chromium's <video> element can seek (loop-wrap in
    // runtime-outside-mp4.js#maybeWrapOutsideMp4Loop sets video.currentTime
    // and Chromium issues a Range request). Without 206 support the
    // mp4 re-buffers from byte 0 on every loop wrap.
    const rangeHeader = req.headers["range"];
    if (typeof rangeHeader === "string" && rangeHeader.toLowerCase().startsWith("bytes=")) {
      const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader);
      if (match) {
        const totalSize = fileStat.size;
        const startRaw = match[1];
        const endRaw = match[2];
        let start;
        let end;
        if (startRaw === "" && endRaw !== "") {
          // suffix length form: bytes=-N -> last N bytes
          const suffix = Number(endRaw);
          start = Math.max(0, totalSize - suffix);
          end = totalSize - 1;
        } else if (startRaw !== "" && endRaw === "") {
          // open-ended form: bytes=N-
          start = Number(startRaw);
          end = totalSize - 1;
        } else if (startRaw !== "" && endRaw !== "") {
          start = Number(startRaw);
          end = Math.min(Number(endRaw), totalSize - 1);
        } else {
          start = NaN;
          end = NaN;
        }
        if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && start <= end && start < totalSize) {
          headers["accept-ranges"] = "bytes";
          headers["content-range"] = `bytes ${start}-${end}/${totalSize}`;
          headers["content-length"] = String(end - start + 1);
          res.writeHead(206, headers);
          createReadStream(resolvedPath, { start, end }).pipe(res);
          return;
        }
        // Range header was syntactically valid `bytes=N-M` but out of range
        // → 416 Range Not Satisfiable.
        res.writeHead(416, { ...headers, "content-range": `bytes */${totalSize}` });
        res.end();
        return;
      }
      // Unknown units in Range header → fall through to 200 (RFC 7233 §4.4).
    }

    // Default: full 200 response. Advertise Accept-Ranges on all responses
    // so clients know seeking is supported (additive header — does not
    // affect the Phase 31 h15 `connection: close` contract on /resources/animations/).
    headers["accept-ranges"] = "bytes";
    headers["content-length"] = String(fileStat.size);
    res.writeHead(200, headers);
    createReadStream(resolvedPath).pipe(res);
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

    // Phase 32 D-B5: producer-readiness gate endpoint.
    // Pi receiver polls this before opening a WebRTC session to avoid the
    // cold-boot race where consume() is attempted before the SSR tab's
    // producer is up. Returns 503 until videoProducer is non-null, then 200.
    if (req.method === "GET" && routePath === "/api/ssr/ready") {
      const { status, body } = buildSsrReadyResponse(signalingState);
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
      return;
    }

    // Phase 38 W0 diagnostic — query the SSR Chromium tab's runtime grid
    // state directly via CDP. Bypasses console.log scraping (which is rate-
    // limited and buffered) so tests can deterministically verify that the
    // SSR tab's grid.points matches the latest broadcast.
    //
    // Returns 503 when CDP isn't yet attached to the SSR tab. Returns 200
    // with { grid: {srcXs, srcYs, points} } otherwise.
    if (req.method === "GET" && routePath === "/api/diag/ssr-grid") {
      const host = getActiveSsrRenderHost();
      if (!host || typeof host.evaluateInTab !== "function") {
        sendJson(res, 503, { ok: false, reason: "ssr-host-inactive" });
        return;
      }
      try {
        const result = await host.evaluateInTab(
          "(() => { const g = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE; "
          + "if (!g || typeof g.snapshotGridState !== 'function') return null; "
          + "return JSON.stringify(g.snapshotGridState()); })()",
        );
        if (!result?.ok) {
          sendJson(res, 503, { ok: false, reason: result?.reason || "eval-failed", detail: result });
          return;
        }
        const grid = result.value ? JSON.parse(result.value) : null;
        sendJson(res, 200, { ok: true, grid });
      } catch (err) {
        sendJson(res, 500, { ok: false, reason: "exception", detail: err?.message || String(err) });
      }
      return;
    }

    // Phase 38 W0 — JPEG screenshot of the SSR tab via CDP. Tests use this
    // to verify the mesh-warp render reflects grid mutations, end-to-end.
    if (req.method === "GET" && routePath === "/api/diag/ssr-screenshot") {
      const host = getActiveSsrRenderHost();
      if (!host || typeof host.captureScreenshot !== "function") {
        sendJson(res, 503, { ok: false, reason: "ssr-host-inactive" });
        return;
      }
      try {
        const result = await host.captureScreenshot();
        if (!result?.ok) {
          sendJson(res, 503, { ok: false, reason: result?.reason || "screenshot-failed", detail: result });
          return;
        }
        res.writeHead(200, { "content-type": "image/jpeg" });
        res.end(Buffer.from(result.base64, "base64"));
      } catch (err) {
        sendJson(res, 500, { ok: false, reason: "exception", detail: err?.message || String(err) });
      }
      return;
    }

    // Phase 39 Plan 39-1: Generic CDP eval endpoint for diagnostic tests.
    // Reused by D-01 (probe <video> readyState) and D-03 (probe renderMode +
    // DOM state). Security: localhost-only OR SSR_DIAG_ENABLE=1; expr length
    // <= 2048; no newlines; no nested eval/Function patterns. See
    // 39-RESEARCH.md "Security baseline".
    //
    // Returns:
    //   200 { ok: true, value: <CDP-returnByValue result> } on success
    //   403 { ok: false, error: "forbidden" } when non-localhost without env-gate
    //   400 { ok: false, error: "invalid_expr" } when expr fails validation
    //   503 { ok: false, error: "ssr_host_not_available" } when CDP not attached
    //   500 { ok: false, error: <msg> } on host.evaluateInTab throw
    if (req.method === "GET" && routePath === "/api/diag/ssr-eval-in-tab") {
      const remote = req.socket?.remoteAddress || "";
      const isLocalhostAddr = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
      if (!isLocalhostAddr && process.env.SSR_DIAG_ENABLE !== "1") {
        res.writeHead(403, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "forbidden" }));
        return;
      }
      const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const expr = urlObj.searchParams.get("expr");
      if (
        typeof expr !== "string"
        || expr.length === 0
        || expr.length > 2048
        || /[\n\r]/.test(expr)
        || /eval\s*\(|Function\s*\(/.test(expr)
      ) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "invalid_expr" }));
        return;
      }
      const host = getActiveSsrRenderHost();
      if (!host || typeof host.evaluateInTab !== "function") {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "ssr_host_not_available" }));
        return;
      }
      try {
        const result = await host.evaluateInTab(expr, { timeoutMs: 3000 });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, value: result }));
      } catch (err) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
      }
      return;
    }

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

    // Phase 31 Plan 02 — serve the bundled mediasoup-client browser blob
    // for the in-page publisher script injected into the SSR Chromium tab.
    // The bundle is built on first request (esbuild, ~218 KB IIFE) and
    // cached on disk. Subsequent boots are instant.
    if ((req.method === "GET" || req.method === "HEAD") && routePath === "/vendor/mediasoup-client.min.js") {
      try {
        const bundle = await readMediasoupClientBundle({ logger: console });
        res.writeHead(200, {
          "content-type": "application/javascript; charset=utf-8",
          "content-length": bundle.length,
          "cache-control": "public, max-age=3600",
        });
        if (req.method === "HEAD") {
          res.end();
        } else {
          res.end(bundle);
        }
      } catch (err) {
        sendJson(res, 500, { error: "mediasoup-client bundle unavailable", detail: err?.message ?? "unknown" });
      }
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

    // Phase-31 h33 — Pi → server diagnostic-log bridge.
    // Pi /output/'s browser console isn't visible in server stdout (the
    // CDP forwarding only covers the SSR Chromium tab spawned by the
    // server). To trace Pi-side issues — handle-drag, layout, broadcast —
    // we ship Pi-side logs through a tiny POST endpoint and echo them to
    // server stdout with a [pi-log] prefix.  Heavily rate-limited (one
    // payload per call, 4 KB cap) to keep an unhelpful client from
    // flooding the server.  Tagged so the operator can grep for them.
    if (req.method === "POST" && routePath === "/api/diag-log") {
      let parsed;
      try {
        parsed = await parseJsonBody(req, { maxBytes: 4 * 1024 });
      } catch (_) {
        sendJson(res, 400, { ok: false, error: "invalid-body" });
        return;
      }
      const tag = typeof parsed?.tag === "string" ? parsed.tag.slice(0, 32) : "pi";
      const message = typeof parsed?.message === "string" ? parsed.message.slice(0, 1024) : "";
      console.log(`[${tag}-log] ${message}`);
      sendJson(res, 200, { ok: true });
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

    if (req.method === "POST" && routePath === "/api/resources/animations") {
      await handleAnimationResourceUpload(req, res);
      return;
    }

    if (req.method === "DELETE" && routePath === "/api/resources/animations") {
      await handleAnimationResourceDelete(req, res);
      return;
    }

    if (req.method === "POST" && routePath === "/api/resources/sounds") {
      await handleSoundResourceUpload(req, res);
      return;
    }

    if (req.method === "DELETE" && routePath === "/api/resources/sounds") {
      await handleSoundResourceDelete(req, res);
      return;
    }

    // Per-board PACKAGE: a real .zip holding board definition, runtime
    // profile, align-mode profiles, the board image, and every GIF / MP4 /
    // sound the animations reference. Self-contained — share the exported
    // file and the receiver has everything they need.
    if (req.method === "GET" && routePath === "/api/boards/bundle-export") {
      const requestUrl = new URL(req.url || "/api/boards/bundle-export", "http://localhost");
      const boardId = normalizeNonEmptyString(requestUrl.searchParams.get("boardId"));
      if (!boardId) {
        sendJson(res, 400, { ok: false, error: "boardId required" });
        return;
      }
      const safeFileName = sanitizeBoardFileName(boardId);
      if (!safeFileName) {
        sendJson(res, 400, { ok: false, error: "invalid boardId" });
        return;
      }
      // Phase 26: board JSON is now self-contained — both static
      // catalog data AND live-state fields live inline. The package
      // exports the unified board verbatim; no separate boardProfile
      // field is needed.
      let board = null;
      try {
        const boardRaw = await readFile(path.join(BOARD_STORAGE_DIR, `${safeFileName}.json`), "utf8");
        const parsed = JSON.parse(boardRaw);
        board = parsed?.board ?? parsed;
      } catch {
        sendJson(res, 404, { ok: false, error: "board not found" });
        return;
      }
      const allProjection = await loadProjectionProfilesRaw();
      const projectionProfiles = allProjection[boardId] ?? {};

      // Grab the board image from disk so we can embed it in the zip.
      let boardImagePath = null;
      let boardImageData = null;
      const imageSrc = String(board?.metadata?.imageSrc || "");
      if (imageSrc) {
        try {
          const relPath = imageSrc.replace(/^\/+/, "");
          const resolvedPath = path.join(ROOT_DIR, relPath);
          if (resolvedPath.startsWith(ROOT_DIR)) {
            boardImageData = await readFile(resolvedPath);
            boardImagePath = relPath;
          }
        } catch { /* missing — exported package just won't include it */ }
      }

      // Collect every /resources/... path referenced anywhere in
      // the unified board (animations, sound assets, etc.).
      const referencedPaths = new Set();
      const collectRefs = (node) => {
        if (!node) return;
        if (typeof node === "string") {
          const trimmed = node.trim();
          if (/^\/?resources\//i.test(trimmed)) {
            referencedPaths.add(trimmed.replace(/^\/+/, ""));
          }
          return;
        }
        if (Array.isArray(node)) { for (const e of node) collectRefs(e); return; }
        if (typeof node === "object") for (const v of Object.values(node)) collectRefs(v);
      };
      collectRefs(board);

      // Read each resource file from disk.
      const resourceEntries = [];
      for (const relPath of referencedPaths) {
        try {
          const resolved = path.join(ROOT_DIR, relPath);
          if (!resolved.startsWith(ROOT_DIR)) continue;
          const buf = await readFile(resolved);
          resourceEntries.push({ path: relPath, data: buf });
        } catch { /* missing — skip silently */ }
      }

      // Assemble the zip. `package.json` carries the manifest; all referenced
      // files live at their canonical paths inside the archive.
      const manifest = {
        schema: BOARD_PACKAGE_SCHEMA,
        exportedAt: new Date().toISOString(),
        boardId,
        // Phase 29 D-07: filter the outgoing board payload to LIVE fields only.
        // Any DEAD field still lingering in in-memory state is silently dropped
        // before the v4 package is built.
        board: filterBoardToLiveFields(board),
        projectionProfiles,
        boardImagePath: boardImagePath ?? null,
        resourcePaths: resourceEntries.map((e) => e.path),
      };
      const zipEntries = [
        { path: "package.json", data: Buffer.from(JSON.stringify(manifest, null, 2), "utf8") },
      ];
      if (boardImageData && boardImagePath) {
        zipEntries.push({ path: boardImagePath, data: boardImageData });
      }
      for (const entry of resourceEntries) zipEntries.push(entry);

      const zipBuffer = buildZipArchive(zipEntries);
      const downloadName = `tt-beamer-board-${safeFileName}-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.zip`;
      res.writeHead(200, {
        "content-type": "application/zip",
        "content-length": zipBuffer.length,
        "content-disposition": `attachment; filename="${downloadName}"`,
      });
      res.end(zipBuffer);
      return;
    }

    if (req.method === "POST" && routePath === "/api/boards/bundle-import") {
      // Phase 21-2: optional ?renameTo=<label> overrides the embedded
      // board.metadata.name so users can rename a package before import.
      const importUrl = new URL(req.url || "/api/boards/bundle-import", "http://localhost");
      const renameTo = String(importUrl.searchParams.get("renameTo") || "").trim().slice(0, 80);
      let body;
      try {
        body = await readRawBody(req, { maxBytes: 500 * 1024 * 1024 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "invalid payload";
        if (message.includes("payload too large")) {
          sendJson(res, 413, { ok: false, error: "payload too large" });
          return;
        }
        sendJson(res, 400, { ok: false, error: "invalid payload" });
        return;
      }
      let entries;
      try {
        entries = parseZipArchive(body);
      } catch (error) {
        sendJson(res, 400, { ok: false, error: `not a valid board package (.zip): ${error?.message || error}` });
        return;
      }

      // Find the manifest.
      const fileMap = new Map(entries.map((e) => [e.path, e.data]));
      const manifestBuf = fileMap.get("package.json");
      if (!manifestBuf) {
        sendJson(res, 400, { ok: false, error: "package.json missing inside the zip" });
        return;
      }
      let manifest;
      try {
        manifest = JSON.parse(manifestBuf.toString("utf8"));
      } catch {
        sendJson(res, 400, { ok: false, error: "package.json inside the zip is invalid JSON" });
        return;
      }
      const schema = manifest?.schema;
      if (schema !== BOARD_PACKAGE_SCHEMA) {
        sendJson(res, 400, {
          ok: false,
          error: `Package format outdated (schema=${schema || "unknown"}). Re-export from a v0.29+ server.`,
          code: "SCHEMA_OUTDATED",
        });
        return;
      }
      // Phase 26: package format v3 carries the unified board
      // (static + live-state inline). Older v1/v2 packages with a
      // separate boardProfile field are rejected — pre-release, no
      // back-compat for old packages.
      const incomingBoard = manifest?.board;
      if (renameTo && incomingBoard && typeof incomingBoard === "object") {
        if (!incomingBoard.metadata || typeof incomingBoard.metadata !== "object") {
          incomingBoard.metadata = {};
        }
        incomingBoard.metadata.name = renameTo;
        // Phase 28 h6: also re-derive a fresh boardId from the new name
        // so the import lands as a NEW independent board instead of
        // overwriting whichever board the package was originally exported
        // from. Apply the same -2/-3 collision-suffix logic that
        // image-imports already use.
        const renamedBaseBoardId = sanitizeBoardFileName(renameTo);
        if (renamedBaseBoardId) {
          let candidate = renamedBaseBoardId;
          let candidatePath = path.join(BOARD_STORAGE_DIR, `${candidate}.json`);
          let suffix = 2;
          while (BUILTIN_BOARD_IDS.has(candidate) || await pathExists(candidatePath)) {
            candidate = `${renamedBaseBoardId}-${suffix}`;
            candidatePath = path.join(BOARD_STORAGE_DIR, `${candidate}.json`);
            suffix += 1;
            if (suffix > 500) break;
          }
          incomingBoard.boardId = candidate;
          // Phase 28 h8: defaultAnimations entries embed a per-entry
          // boardId pointing back at the package's original board. The
          // server's autostart loop (buildDefaultAnimationsForBoard ->
          // line 3697 `def.boardId || targetBoardId`) preserves whatever
          // boardId is on the entry, so without this remap the imported
          // board's autostart animations would spawn under the original
          // boardId and the runtime would route them to the wrong board.
          // Same risk for nested clusterId references in cluster-scoped
          // entries — but cluster IDs are preserved 1:1 across import,
          // so only boardId needs rewriting here.
          if (Array.isArray(incomingBoard.defaultAnimations)) {
            for (const entry of incomingBoard.defaultAnimations) {
              if (entry && typeof entry === "object") {
                entry.boardId = candidate;
              }
            }
          }
        }
      }
      const normalized = normalizeBoardDefinition(incomingBoard, { source: "package-import", allowEmptyRoomCatalog: true });
      if (!normalized.ok) {
        sendJson(res, 400, { ok: false, error: "board package validation failed", issues: normalized.issues });
        return;
      }
      const board = normalized.board;
      const boardId = board.boardId;
      const safeBoardId = sanitizeBoardFileName(boardId);
      if (!safeBoardId) {
        sendJson(res, 400, { ok: false, error: "invalid boardId" });
        return;
      }

      await mkdir(BOARD_ASSETS_DIR, { recursive: true });

      // Resources: write everything the manifest flagged, but NEVER overwrite
      // existing files. Skipping pre-existing resources means the same MP4
      // doesn't accumulate as copies when importing multiple boards that
      // reference it.
      let resourcesWritten = 0;
      let resourcesSkipped = 0;
      const resourcePaths = Array.isArray(manifest?.resourcePaths) ? manifest.resourcePaths : [];
      for (const relRaw of resourcePaths) {
        const rel = String(relRaw || "").replace(/^\/+/, "");
        if (!rel.startsWith("resources/") || rel.includes("..")) { resourcesSkipped++; continue; }
        const data = fileMap.get(rel);
        if (!data) { resourcesSkipped++; continue; }
        const resolved = path.join(ROOT_DIR, rel);
        if (!resolved.startsWith(ROOT_DIR)) { resourcesSkipped++; continue; }
        try {
          try { await stat(resolved); resourcesSkipped++; continue; } catch { /* new, proceed */ }
          await mkdir(path.dirname(resolved), { recursive: true });
          await writeFile(resolved, data);
          resourcesWritten++;
        } catch { resourcesSkipped++; }
      }

      // Board image: if bundled at boardImagePath, write a uniquely-named
      // copy into config/boards/assets/ and rewrite imageSrc. If the zip
      // didn't carry an image, keep whatever imageSrc was in the manifest —
      // the destination may already have that file locally.
      let rewrittenImageSrc = null;
      const imagePathInZip = String(manifest?.boardImagePath || "").replace(/^\/+/, "");
      if (imagePathInZip) {
        const imgBuf = fileMap.get(imagePathInZip);
        if (imgBuf && imgBuf.length > 0 && imgBuf.length <= IMAGE_IMPORT_MAX_BYTES) {
          // Prefer the destination copy if the same imagePathInZip already
          // exists — avoids redundant duplicates in config/boards/assets/.
          if (imagePathInZip.startsWith("resources/")) {
            // image is in resources/, handled by the resource loop already.
            rewrittenImageSrc = `/${imagePathInZip}`;
          } else {
            const ext = path.extname(imagePathInZip).slice(1).toLowerCase() || "png";
            const validExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "png";
            const fileName = `${safeBoardId}-${Date.now().toString(36)}.${validExt}`;
            try {
              await writeFile(path.join(BOARD_ASSETS_DIR, fileName), imgBuf);
              rewrittenImageSrc = `/config/boards/assets/${fileName}`;
            } catch { /* keep original imageSrc */ }
          }
        }
      }

      // Phase 26: write the unified board JSON. The normalized
      // shape already includes profile fields (roomCatalog,
      // roomClusters, hitareaCalibration, playAreas, etc.),
      // pulled directly from manifest.board.
      await mkdir(BOARD_STORAGE_DIR, { recursive: true });
      const targetPath = path.join(BOARD_STORAGE_DIR, `${safeBoardId}.json`);
      if (rewrittenImageSrc) {
        board.metadata = { ...(board.metadata ?? {}), imageSrc: rewrittenImageSrc };
      }
      const boardPayload = {
        schema: BOARD_IMPORT_SCHEMA,
        importedAt: new Date().toISOString(),
        board,
      };
      await writeFile(targetPath, JSON.stringify(boardPayload, null, 2) + "\n", "utf8");

      // Merge align-mode projection profiles.
      const projectionProfiles = manifest?.projectionProfiles;
      if (projectionProfiles && typeof projectionProfiles === "object") {
        const all = await loadProjectionProfilesRaw();
        all[boardId] = {
          ...(all[boardId] && typeof all[boardId] === "object" ? all[boardId] : {}),
          ...projectionProfiles,
        };
        await saveProjectionProfilesRaw(all);
      }

      sendJson(res, 200, { ok: true, boardId, resourcesWritten, resourcesSkipped });
      return;
    }

    if (req.method === "POST" && routePath === "/api/boards/import") {
      await handleBoardImport(req, res);
      return;
    }

    if (req.method === "POST" && routePath === "/api/boards/delete") {
      await handleBoardDelete(req, res);
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
        // Phase 26: per-board profile data lives inline in each
        // config/boards/<id>.json now; synthesize boardProfiles
        // here so existing clients (which still expect the merged
        // shape on /api/global-defaults) keep working.
        const synthesized = await synthesizeBoardProfiles();
        const response = { ...parsed, boardProfiles: synthesized };
        // Always surface a fully-populated serverRendering block so the
        // dashboard Settings → System radios reflect the current state
        // on first paint. Disk-resident keys win; missing keys fall back
        // to hardware-aware defaults. The auto-detected encoder list
        // (read-only, populated by SSR boot) is layered on top.
        const detected = liveSessionState.snapshot?.serverRendering?.availableEncoders;
        const sr = (parsed && typeof parsed === "object" && parsed.serverRendering
          && typeof parsed.serverRendering === "object")
            ? parsed.serverRendering
            : {};
        const srDefaults = SERVER_RENDERING_DEFAULTS({
          available: Array.isArray(detected) ? detected : [],
        });
        response.serverRendering = {
          ...srDefaults,
          ...sr,
          ...(Array.isArray(detected) && detected.length > 0 ? { availableEncoders: detected } : {}),
        };
        sendJson(res, 200, response);
      } catch {
        sendJson(res, 404, { error: "global defaults not found" });
      }
      return;
    }

    // Projection profiles — per-board server-side calibration profiles
    if (req.method === "GET" && routePath === "/api/projection-profiles") {
      const requestUrl = new URL(req.url || "/api/projection-profiles", "http://localhost");
      const boardId = normalizeNonEmptyString(requestUrl.searchParams.get("boardId"));
      if (!boardId) {
        sendJson(res, 400, { ok: false, error: "boardId required" });
        return;
      }
      const all = await loadProjectionProfilesRaw();
      const boardProfiles = all[boardId] && typeof all[boardId] === "object" ? all[boardId] : {};
      sendJson(res, 200, { ok: true, boardId, names: Object.keys(boardProfiles).sort() });
      return;
    }

    if (req.method === "GET" && routePath === "/api/projection-profiles/load") {
      const requestUrl = new URL(req.url || "/api/projection-profiles/load", "http://localhost");
      const boardId = normalizeNonEmptyString(requestUrl.searchParams.get("boardId"));
      const name = sanitizeProfileName(requestUrl.searchParams.get("name"));
      if (!boardId || !name) {
        sendJson(res, 400, { ok: false, error: "boardId and name required" });
        return;
      }
      const all = await loadProjectionProfilesRaw();
      const data = all[boardId]?.[name];
      if (!data) {
        sendJson(res, 404, { ok: false, error: "profile not found" });
        return;
      }
      sendJson(res, 200, { ok: true, boardId, name, data });
      return;
    }

    if (req.method === "POST" && routePath === "/api/projection-profiles") {
      let parsed;
      try {
        parsed = await parseJsonBody(req, { maxBytes: 128 * 1024 });
      } catch {
        sendJson(res, 400, { ok: false, error: "invalid JSON payload" });
        return;
      }
      const boardId = normalizeNonEmptyString(parsed?.boardId);
      const name = sanitizeProfileName(parsed?.name);
      const data = parsed?.data;
      if (!boardId || !name || !data || typeof data !== "object") {
        sendJson(res, 400, { ok: false, error: "boardId, name, data required" });
        return;
      }
      const all = await loadProjectionProfilesRaw();
      if (!all[boardId] || typeof all[boardId] !== "object") all[boardId] = {};
      all[boardId][name] = data;
      await saveProjectionProfilesRaw(all);
      sendJson(res, 200, { ok: true, boardId, name });
      return;
    }

    if (req.method === "DELETE" && routePath === "/api/projection-profiles") {
      const requestUrl = new URL(req.url || "/api/projection-profiles", "http://localhost");
      const boardId = normalizeNonEmptyString(requestUrl.searchParams.get("boardId"));
      const name = sanitizeProfileName(requestUrl.searchParams.get("name"));
      if (!boardId || !name) {
        sendJson(res, 400, { ok: false, error: "boardId and name required" });
        return;
      }
      const all = await loadProjectionProfilesRaw();
      if (all[boardId] && all[boardId][name]) {
        delete all[boardId][name];
        if (Object.keys(all[boardId]).length === 0) delete all[boardId];
        await saveProjectionProfilesRaw(all);
      }
      sendJson(res, 200, { ok: true, boardId, name });
      return;
    }

    // Phase 27 (B5/D-06): align-mode dirty-flag endpoint.
    if (req.method === "OPTIONS" && routePath === "/api/align-mode-dirty") {
      res.writeHead(204, { allow: "POST,OPTIONS" });
      res.end();
      return;
    }

    if (req.method === "POST" && routePath === "/api/align-mode-dirty") {
      // T-27-03: rate limit (max 1 accepted toggle per 100 ms) to prevent grace-timer reset DoS.
      const nowMs = Date.now();
      if (nowMs - _alignModeDirtyLastAcceptedMs < ALIGN_MODE_DIRTY_RATE_LIMIT_MS) {
        sendJson(res, 429, { ok: false, error: "rate-limited" });
        return;
      }
      let parsed;
      try { parsed = await parseJsonBody(req, { maxBytes: 1024 }); }
      catch { sendJson(res, 400, { ok: false, error: "invalid JSON payload" }); return; }
      // T-27-02: strict type validation — only boolean accepted.
      if (typeof parsed?.dirty !== "boolean") {
        sendJson(res, 400, { ok: false, error: "dirty must be a boolean" });
        return;
      }
      _alignModeDirtyLastAcceptedMs = nowMs;
      const dirty = parsed.dirty;
      // Phase 36 W0 (T9): observable stdout marker for the live-E2E rail.
      // The prefix `[align-mode-dirty] received dirty=` is grep-asserted by
      // test_phase36_align_handles.py::test_t9_dirty_flag_visible_on_dashboard.
      console.log(`[align-mode-dirty] received dirty=${Boolean(dirty)} from=http-post`);
      // Heartbeat semantics (D-06): if a still-dirty POST arrives during the grace window,
      // reset the timer so the flag stays set as long as /output/ keeps reporting dirty.
      if (dirty && _alignModeDirtyGraceTimer) {
        _startAlignModeDirtyGraceTimer();
      }
      _setAlignModeDirty(dirty, "post-endpoint");
      sendJson(res, 200, { ok: true, alignModeDirtyOnOutput: liveSessionState.snapshot.alignModeDirtyOnOutput });
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

// Phase 44: SSR is the only render path. The previous SSR_RENDER_HOST
// + SSR_PUBLISH env-var gating (added during the Phase 31 experimental
// rollout) is retired — `node server.mjs` now always boots the
// Chromium SSR tab + publisher, no opt-in required.
{
  (async () => {
    try {
      // Phase 43: server-restart no longer restores operator-triggered
      // animations. Only the default-animations pre-load (top-level,
      // synchronous, board-scoped) seeds runningAnimations on boot —
      // anything the operator triggered during the previous session is
      // dropped. runtime-active-animations.json is still written during
      // the session (so an SSR-tab in-session crash recovery could
      // theoretically read it) but the cold-server-start path ignores
      // it. Operator request 2026-05-16: "Bei Server Start sollen NUR
      // die autostart Animationen direkt starten ansonsten soll sich
      // nichts über einen neustart hinweg halten".

      // Phase-31 h41: load the persisted active projection grid so the
      // SSR Chromium tab — which spawns with a fresh user-data-dir and
      // therefore an empty localStorage — picks up the operator's
      // calibrated grid via live-hello on its first connect. The
      // applyLiveRuntimeSnapshot path on the SSR tab handles
      // runtime.lastAlignGridSnapshot (h40) and snaps the warp +
      // handles + polygons in lockstep.
      //
      // Phase 38 W5 (2026-05-11): operator UAT — "after server start the
      // board fills the entire screen with no mesh-warp distortion" (Bug B).
      // Root cause: when `runtime-active-grid.json` is absent (e.g. fresh
      // install, or operator never saved an align edit since the file was
      // introduced), this block leaves `runtime.lastAlignGridSnapshot` null
      // and `liveSessionState.version` at 0. Every client then falls back
      // through autoLoadRememberedProjectionProfile → applyDefaultAndCaptureSnapshot
      // → identity 3×3 grid → `hasGridDisplacements()` returns false →
      // postDrawMeshWarp returns at the "no warp" guard → fx-canvas is the
      // visible surface, board fills full screen.
      //
      // Fix (W5): if loadActiveGrid returns nothing, scan
      // config/boards/<id>.json for the active board and apply its
      // `lastUsedProfileName` from config/projection-profiles.json. Failing
      // that, pick the first available profile for the active board. The
      // SSR mesh-warp now has real geometry on cold boot — exactly what
      // the operator expects when xrandrv2 was their saved profile.
      try {
        let gridSeed = null;
        let gridSeedSource = "none";

        const gridRestored = await loadActiveGrid({ rootDir: ROOT_DIR });
        if (gridRestored && Array.isArray(gridRestored.points) && gridRestored.points.length > 0) {
          gridSeed = {
            srcXs: gridRestored.srcXs.slice(),
            srcYs: gridRestored.srcYs.slice(),
            points: gridRestored.points.map((p) => ({
              row: p.row, col: p.col, x: p.x, y: p.y,
            })),
            profileId: gridRestored.profileId,
            persistedAt: gridRestored.persistedAt || null,
          };
          gridSeedSource = "runtime-active-grid";
        }

        // W5 fallback path — only when runtime-active-grid.json was missing
        // or empty. Picks an existing profile so SSR boots with mesh-warp.
        if (!gridSeed) {
          try {
            const storedBoards = await loadCanonicalBoardsFromStorage();
            const allProfiles = await loadProjectionProfilesRaw();
            // Choose the first board that has at least one profile.
            // We don't have `selectedBoard` yet at boot (it lands via context-
            // update from clients), so picking deterministically the first
            // board with calibration is the safe choice.
            for (const board of storedBoards) {
              const boardId = board?.boardId;
              if (!boardId) continue;
              const profilesForBoard = allProfiles[boardId];
              if (!profilesForBoard || typeof profilesForBoard !== "object") continue;
              const profileNames = Object.keys(profilesForBoard);
              if (profileNames.length === 0) continue;
              // Prefer board's remembered lastUsedProfileName when it exists,
              // otherwise the first sorted name (stable across reboots).
              const remembered = typeof board.lastUsedProfileName === "string"
                ? board.lastUsedProfileName
                : null;
              const pickName = remembered && profilesForBoard[remembered]
                ? remembered
                : profileNames.sort()[0];
              const data = profilesForBoard[pickName];
              if (data
                  && Array.isArray(data.srcXs)
                  && Array.isArray(data.srcYs)
                  && Array.isArray(data.points)
                  && data.points.length > 0) {
                gridSeed = {
                  srcXs: data.srcXs.slice(),
                  srcYs: data.srcYs.slice(),
                  points: data.points.map((p) => ({
                    row: p.row, col: p.col, x: p.x, y: p.y,
                  })),
                  profileId: pickName,
                  persistedAt: null,
                };
                gridSeedSource = `projection-profile/${boardId}/${pickName}`;
                // Also seed selectedBoard so downstream consumers
                // (animations restore, runtime ctx) land on the same board
                // as the grid. Don't overwrite if disk-animation-restore
                // already set it to a specific value.
                if (!normalizeNonEmptyString(liveSessionState.snapshot.selectedBoard)) {
                  liveSessionState.snapshot.selectedBoard = boardId;
                }
                break;
              }
            }
          } catch (err) {
            console.warn("[active-grid w5] profile-fallback failed:", err?.message || err);
          }
        }

        if (gridSeed) {
          if (!liveSessionState.snapshot.runtime) liveSessionState.snapshot.runtime = {};
          liveSessionState.snapshot.runtime.lastAlignGridSnapshot = {
            srcXs: gridSeed.srcXs,
            srcYs: gridSeed.srcYs,
            points: gridSeed.points,
            profileId: gridSeed.profileId,
            // No client originated this — it came from disk. Use a
            // server sentinel so live-sync's originator filter won't
            // match any real client.
            originatorClientId: "server-disk-restore",
            at: gridSeed.persistedAt || new Date().toISOString(),
          };
          // h42: bump the live-session version so clients DO apply the
          // seeded snapshot via live-hello. shouldApplySnapshotVersion
          // rejects incomingVersion <= client.lastAppliedVersion, and
          // a fresh client starts with lastAppliedVersion=0; if the
          // server's version stays at 0, the live-hello snapshot is
          // dropped silently and the client's own auto-loaded grid
          // wins. Bumping to 1 lets the gate pass so the disk-restored
          // grid lands on every client immediately on connect.
          liveSessionState.version = Math.max(1, Number(liveSessionState.version || 0) + 1);
          liveSessionState.updatedAt = new Date().toISOString();
          console.log(
            `[active-grid] restored profile=${gridSeed.profileId} `
            + `srcXs=${gridSeed.srcXs.length} srcYs=${gridSeed.srcYs.length} `
            + `points=${gridSeed.points.length} `
            + `version=${liveSessionState.version} `
            + `source=${gridSeedSource}`,
          );
        } else {
          console.log("[active-grid] no persisted profile available — SSR will boot at identity");
        }
      } catch (err) {
        console.warn("[active-grid] load failed:", err?.message || err);
      }
      // 2026-05-14 boot-race fix: attach the /api/webrtc/signal WebSocket
      // upgrade handler BEFORE the mediasoup boot. Without this, the HTTP
      // server is listening but `/api/webrtc/signal` has no upgrade handler
      // during the multi-second mediasoup boot — Firefox sees "Can't
      // connect" and the receiver waits the full 10 s ws-open timeout
      // before retrying. With the handler attached early, the WS opens
      // immediately; per-RPC handlers return "router-not-ready" until the
      // router boots, and the receiver's INITIAL_CONNECT 300 ms silent-
      // retry path picks up the moment it's ready.
      signalingState = attachWebRtcSignaling(server);
      // Phase 32 D-B4: purge any stale mediasoup-worker process from a prior
      // crashed server run before booting the new Worker. This frees the RTC
      // port range (40000-40100) and clears dangling state.
      console.log("[server] purging stale mediasoup-worker (D-B4 / Phase 33-02-T3 PID-scoped)");
      await purgeStaleMediasoupWorker();
      await bootMediasoupRouter();
      // Phase 33 Plan 02-T1 (Suspect 8): when the mediasoup-worker auto-respawns
      // after a `worker.died` event, broadcast `producer-ready` to the still-
      // connected consumers so they jump out of their backoff window. The
      // SSR Chromium tab will re-attach + re-publish on its own restart path
      // (or the next health-ping breach triggers it).
      setOnRouterRecreated(() => {
        try { signalingState?.broadcastProducerReady?.(); } catch (err) {
          console.warn(`[server] broadcastProducerReady from router-recreated failed: ${err?.message ?? err}`);
        }
      });
      // Best-effort: pre-warm the mediasoup-client browser bundle so the
      // first SSR-tab fetch is instant. Failure is non-fatal — the route
      // will rebuild on demand.
      ensureMediasoupClientBundle().catch((err) => {
        console.warn(`[server] mediasoup-client pre-warm failed: ${err?.message ?? "unknown"}`);
      });
      // Phase 33 Plan 01-T3 (Suspect 7): wire render-host → consumer signal.
      // The render-host invokes onHostDown when its CDP health-ping breaches
      // the 3-failures-in-15s threshold OR Chromium browser disconnects. The
      // signaling layer fans out a `render-host-down` text frame to every
      // open consumer WS, so the Pi UI flips to the actionable
      // "Render host crashed" overlay instead of the generic reconnect banner.
      // Phase 33 Plan 02-T2 (Suspect 6): wire publisher-WS watchdog.
      const ssrHost = bootSsrRenderHost({
        port: PORT,
        autoStart: true,
        onHostDown: () => {
          try { signalingState?.broadcastRenderHostDown?.(); } catch (err) {
            console.warn(`[server] broadcastRenderHostDown failed: ${err?.message ?? err}`);
          }
        },
        getPublisherWsAgeMs: () => {
          try { return signalingState?.getPublisherWsAgeMs?.() ?? -1; }
          catch { return -1; }
        },
      });
      setActiveSsrRenderHost(ssrHost);
      // Phase 31 Plan 05 Task 2b step 6: surface the auto-detection result
      // to the System & Performance UI's Detected-encoders badge. The badge
      // reads `serverRendering.availableEncoders` from /api/global-defaults
      // (response is enriched here), or — when live-sync push is wired in
      // a follow-up — from a snapshot listener.
      // h17: poll the SSR host status until encoderConfig is resolved
      // (start() sets it synchronously after spawn). Fire-and-forget —
      // the rest of server boot doesn't depend on this.
      // h18: extracted into a reusable helper so the
      // serverRendering-update path can re-publish after a host restart.
      async function refreshServerInfoFromActiveHost(host = ssrHost) {
        const startedAt = Date.now();
        const TIMEOUT_MS = 15000;
        while (Date.now() - startedAt < TIMEOUT_MS) {
          const status = host?.getStatus?.();
          if (status?.encoderConfig) {
            const enc = status.encoderConfig;
            try {
              if (enc.available) {
                if (!liveSessionState.snapshot.serverRendering) {
                  liveSessionState.snapshot.serverRendering = {};
                }
                liveSessionState.snapshot.serverRendering.availableEncoders = enc.available;
              }
              if (signalingState?.setServerInfo) {
                signalingState.setServerInfo({
                  encoder: String(enc.encoder || "unknown"),
                  encoderSource: String(enc.source || "auto"),
                  availableEncoders: Array.isArray(enc.available) ? enc.available.join(",") : "",
                  qualityPreset: String(enc.preset || "balanced"),
                  bitrateBps: Number(enc.bitrate || 0),
                  fpsTarget: Number(enc.fpsTarget || 30),
                  keyframeIntervalSec: Number(enc.keyframeIntervalSec || 2),
                  x264Preset: String(enc.x264Preset || ""),
                });
                console.log(
                  `[server] serverInfo published — encoder=${enc.encoder} preset=${enc.preset} bitrate=${enc.bitrate} fpsTarget=${enc.fpsTarget}`,
                );
              }
            } catch (err) {
              console.warn(`[server] availableEncoders snapshot wire failed: ${err?.message ?? "unknown"}`);
            }
            return;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
        console.warn("[server] encoder-config snapshot timed out — diagnostic overlay will lack encoder info");
      }
      // h18: kick off the initial poll. Fire-and-forget — boot doesn't
      // wait. We expose the helper on globalThis so the
      // serverRendering-update mutation handler in applyMutation()
      // can re-call it after a host restart, refreshing the consumer's
      // diagnostic overlay's serverInfo with the new preset/bitrate
      // immediately instead of leaving stale h17 boot-time data.
      globalThis.__ttbRefreshServerInfo = refreshServerInfoFromActiveHost;
      void refreshServerInfoFromActiveHost();
    } catch (err) {
      console.error(`[server] SSR boot failed: ${err?.message ?? "unknown"}`);
      process.exit(1);
    }
  })();
  process.on("SIGINT", async () => {
    console.log("[server] SIGINT — shutting down SSR render host…");
    // Phase 31 Plan 04 (D-X7): flush pending debounced active-animations
    // write BEFORE tearing down the SSR host so we never lose state.
    try { await flushRunningAnimations(); } catch (err) { console.error(err); }
    // h41: flush the active-grid pending write so the operator's
    // last calibration survives an immediate shutdown.
    try { await flushActiveGrid(); } catch (err) { console.error(err); }
    try { await shutdownSsrRenderHost(); } catch (err) { console.error(err); }
    try { await shutdownMediasoupRouter(); } catch (err) { console.error(err); }
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    console.log("[server] SIGTERM — shutting down SSR render host…");
    try { await flushRunningAnimations(); } catch (err) { console.error(err); }
    // h41: flush the active-grid pending write so the operator's
    // last calibration survives an immediate shutdown.
    try { await flushActiveGrid(); } catch (err) { console.error(err); }
    try { await shutdownSsrRenderHost(); } catch (err) { console.error(err); }
    try { await shutdownMediasoupRouter(); } catch (err) { console.error(err); }
    process.exit(0);
  });
}

// Phase 26: read defaultAnimations from the board's unified JSON
// (config/boards/<id>.json) instead of global-defaults.boardProfiles.
function buildDefaultAnimationsForBoard(targetBoardId) {
  try {
    const safeFileName = sanitizeBoardFileName(targetBoardId);
    if (!safeFileName) return [];
    const boardPath = path.join(BOARD_STORAGE_DIR, `${safeFileName}.json`);
    const raw = readFileSync(boardPath, "utf8");
    const outer = JSON.parse(raw);
    const inner = outer?.board ?? outer;
    if (!inner || typeof inner !== "object") return [];
    const defaults = Array.isArray(inner.defaultAnimations) ? inner.defaultAnimations : [];
    return defaults
      .filter((def) => def?.type && def?.scope)
      .map((def) => ({
        id: `default-${targetBoardId}-${def.roomId || def.type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        boardId: def.boardId || targetBoardId,
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
        // Phase 21-1: carry colorHex so autostarted solid-color
        // animations come back up with the user's chosen color
        // instead of the factory #ff0000 default.
        ...(typeof def.colorHex === "string" && /^#[0-9a-f]{6}$/i.test(def.colorHex)
          ? { colorHex: def.colorHex }
          : {}),
        hold: true,
        durationMs: null,
        startedAtEpochMs: Date.now(),
      }));
  } catch {
    return [];
  }
}

// Auto-start default animations on server startup — only for the
// ACTIVE board (taken from runtime-active-animations.json#boardId),
// not every board on disk. Pre-loading defaults for boards that
// aren't selected wastes asset cache slots and adds noise to the
// snapshot fanout. If no persisted boardId is available we fall
// back to the first board file we find on disk so a fresh install
// still has something to render.
try {
  let activeBoardId = null;
  try {
    const raw = readFileSync(path.join(ROOT_DIR, "config", "runtime-active-animations.json"), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.boardId === "string") activeBoardId = parsed.boardId;
  } catch { /* missing or unparseable — fall back below */ }

  if (!activeBoardId) {
    try {
      const entries = readdirSync(BOARD_STORAGE_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name.startsWith(".")) continue;
        activeBoardId = entry.name.replace(/\.json$/, "");
        break;
      }
    } catch { /* dir missing — pre-load skipped */ }
  }

  if (activeBoardId) {
    const boardDefaults = buildDefaultAnimationsForBoard(activeBoardId);
    if (boardDefaults.length > 0) {
      if (!liveSessionState.snapshot.runtime) liveSessionState.snapshot.runtime = {};
      liveSessionState.snapshot.runtime.runningAnimations = boardDefaults;
      liveSessionState.snapshot.selectedBoard = activeBoardId;
      liveSessionState.version = 1;
      liveSessionState.updatedAt = new Date().toISOString();
      console.log(
        `[default-animations] Pre-loaded ${boardDefaults.length} default animation(s) for board ${activeBoardId}`,
      );
    }
  }
} catch (error) {
  console.warn("[default-animations] Could not load defaults:", error?.message || error);
}

// Phase 28 B5 — synchronously ensure the asset manifest is ready BEFORE the
// HTTP listener accepts requests. Synthesis is idempotent (sha256[:12] of every
// file in resources/animations + resources/sounds); existing entries with
// matching hashes preserve their mtime to keep the manifest stable across boots.
try {
  await ensureAssetManifestOnBoot();
} catch (error) {
  console.warn(
    "[asset-manifest] boot synthesis failed (continuing without manifest):",
    error?.message || error,
  );
}

server.listen(PORT, HOST, () => {
  logSessionEvent("server-start", {
    host: HOST,
    port: PORT,
    logPath: LIVE_LOG_PATH,
  });
  console.log(`TT Beamer server listening on http://${HOST}:${PORT}`);
});
