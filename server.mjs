import { createServer } from "node:http";
import { readFile, writeFile, stat, appendFile, mkdir, readdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.PORT ?? 4173);
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GLOBAL_DEFAULTS_PATH = path.join(ROOT_DIR, "config", "global-defaults.json");
const LIVE_LOG_PATH = process.env.TT_BEAMER_LIVE_LOG_PATH ?? path.join(ROOT_DIR, "logs", "live-sync.jsonl");
const ZONES_DIR = path.join(ROOT_DIR, "config", "zones");
const BOARD_STORAGE_DIR = path.join(ROOT_DIR, "config", "boards");
const IMPORTED_BOARDS_DIR = path.join(BOARD_STORAGE_DIR, "imported");

const BOARD_CATALOG_SCHEMA = "tt-beamer.board-catalog.v1";
const BOARD_DEFINITION_SCHEMA = "tt-beamer.board-definition.v1";
const BOARD_IMPORT_SCHEMA = "tt-beamer.board-import.v1";
const BUILTIN_BOARD_IDS = new Set(["nemesis-board-a", "nemesis-board-b"]);

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
const MAX_PROCESSED_MUTATIONS = 4000;

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
  return new Set([
    "trigger-global",
    "trigger-room",
    "edit-room",
    "stop-animation",
    "clear-all",
    "align-toggle",
    "outside-update",
    "context-update",
  ]).has(type);
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

  if (typeof payload?.outsideBoardId === "string" && isPlainObject(payload?.outsideFx)) {
    const boardId = payload.outsideBoardId;
    outsideFxByBoard[boardId] = {
      ...(isPlainObject(outsideFxByBoard[boardId]) ? outsideFxByBoard[boardId] : {}),
      ...payload.outsideFx,
    };
  }

  nextRuntime.outsideFxByBoard = outsideFxByBoard;
  return {
    runtime: nextRuntime,
    outsideFxByBoard,
  };
}

function applyRoomMutationPatch(mutationType, payload) {
  const nextRuntime = readRuntimeSnapshot();
  const runningAnimations = Array.isArray(nextRuntime.runningAnimations) ? cloneJson(nextRuntime.runningAnimations) : [];

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
  } else if (mutationType === "stop-animation" && typeof payload?.animationId === "string") {
    const nextList = runningAnimations.filter((entry) => entry?.id !== payload.animationId);
    runningAnimations.length = 0;
    runningAnimations.push(...nextList);
  } else if (mutationType === "clear-all") {
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
    return {
      runtime: nextRuntime,
      outsideFxByBoard,
    };
  }

  nextRuntime.runningAnimations = runningAnimations;
  return {
    runtime: nextRuntime,
  };
}

function applyContextUpdatePatch(payload) {
  const nextRuntime = readRuntimeSnapshot();
  const runtimePatch = isPlainObject(payload?.runtime) ? payload.runtime : {};
  const selectedBoard =
    normalizeNonEmptyString(payload?.selectedBoard) ??
    normalizeNonEmptyString(payload?.boardId) ??
    normalizeNonEmptyString(runtimePatch?.selectedBoard) ??
    normalizeNonEmptyString(runtimePatch?.boardId) ??
    normalizeNonEmptyString(liveSessionState.snapshot?.selectedBoard) ??
    normalizeNonEmptyString(nextRuntime?.selectedBoard) ??
    normalizeNonEmptyString(nextRuntime?.boardId) ??
    null;
  const selectedLayout =
    normalizeNonEmptyString(payload?.selectedLayout) ??
    normalizeNonEmptyString(payload?.layoutId) ??
    normalizeNonEmptyString(runtimePatch?.selectedLayout) ??
    normalizeNonEmptyString(runtimePatch?.layoutId) ??
    selectedBoard;

  if (selectedBoard) {
    nextRuntime.boardId = selectedBoard;
    nextRuntime.selectedBoard = selectedBoard;
  }
  if (selectedLayout) {
    nextRuntime.selectedLayout = selectedLayout;
  }

  return {
    runtime: nextRuntime,
    selectedBoard,
    selectedLayout,
  };
}

function applyLiveMutation({ clientId, role, mutationType, payload, mutationId, clientSequence }) {
  if (!acceptLiveMutationType(mutationType)) {
    logErrorEvent("invalid-mutation-type", String(mutationType ?? "unknown"), {
      clientId,
      role,
    });
    return null;
  }

  const normalizedMutationId = typeof mutationId === "string" && mutationId.trim() ? mutationId.trim() : null;
  const dedupKey = normalizedMutationId ? `${clientId}:${normalizedMutationId}` : null;
  if (dedupKey && processedMutations.has(dedupKey)) {
    const previous = processedMutations.get(dedupKey);
    return {
      applied: false,
      duplicate: true,
      stale: false,
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
        version: liveSessionState.version,
      };
    }
    lastClientSequenceById.set(clientId, normalizedSequence);
  }

  let nextSnapshotPatch = null;
  if (mutationType === "outside-update") {
    nextSnapshotPatch = applyOutsideUpdatePatch(payload);
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
  const session = mutateLiveSession({
    mutation: {
      type: mutationType,
      byClientId: clientId,
      byRole: role,
      at: new Date().toISOString(),
    },
    nextSnapshotPatch,
  });

  if (dedupKey) {
    rememberProcessedMutation(dedupKey, {
      version: session.version,
    });
  }

  return {
    applied: true,
    duplicate: false,
    stale: false,
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

function broadcastLiveSession(type, extra = {}) {
  const payload = buildLiveSessionEnvelope(type, extra);
  for (const [clientId, client] of liveClients.entries()) {
    if (!client?.socket || client.socket.destroyed) {
      liveClients.delete(clientId);
      continue;
    }
    sendLiveSocketMessage(client.socket, payload);
  }
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
    logSessionEvent("connect", {
      clientId,
      role,
      routePath,
      remoteAddress: req.socket.remoteAddress ?? null,
      connectedClients: liveClients.size,
    });

    sendLiveSocketMessage(socket, buildLiveSessionEnvelope("live-hello", { clientId, role }));
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
        if (parsed?.type !== "live-mutation") {
          return;
        }
        const mutationId = typeof parsed?.mutationId === "string" ? parsed.mutationId : null;
        const mutationResult = applyLiveMutation({
          clientId,
          role,
          mutationType: parsed.mutationType,
          payload: parsed.payload,
          mutationId,
          clientSequence: parsed?.clientSequence,
        });
        if (!mutationResult) {
          return;
        }
        sendLiveSocketMessage(
          socket,
          buildLiveSessionEnvelope("live-ack", {
            mutationType: parsed.mutationType,
            mutationId,
            version: mutationResult.version,
            applied: mutationResult.applied,
            duplicate: mutationResult.duplicate,
            stale: mutationResult.stale,
          }),
        );
        if (mutationResult.applied) {
          broadcastLiveSession("live-session-update", {
            mutationType: parsed.mutationType,
            mutationId,
            version: mutationResult.version,
          });
        }
      } catch {
        logErrorEvent("malformed-ws-payload", "invalid-json", {
          clientId,
          role,
        });
      }
    });

    socket.on("close", () => {
      liveClients.delete(clientId);
      logSessionEvent("disconnect", {
        clientId,
        role,
        connectedClients: liveClients.size,
      });
    });
    socket.on("error", (error) => {
      liveClients.delete(clientId);
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

function mutateLiveSession({ mutation, nextSnapshotPatch }) {
  liveSessionState.version += 1;
  liveSessionState.updatedAt = new Date().toISOString();
  liveSessionState.lastMutation = mutation;
  liveSessionState.snapshot = {
    ...liveSessionState.snapshot,
    ...nextSnapshotPatch,
    schema: LIVE_STATE_SCHEMA,
  };
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

function normalizeBoardDefinition(inputBoard, { source = "imported", imported = true } = {}) {
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
  if (roomCatalog.length === 0) {
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
        imported: Boolean(imported),
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
          imported: false,
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

async function loadImportedBoards() {
  await mkdir(IMPORTED_BOARDS_DIR, { recursive: true });
  const entries = await readdir(IMPORTED_BOARDS_DIR, { withFileTypes: true });
  const importedBoards = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }
    const filePath = path.join(IMPORTED_BOARDS_DIR, entry.name);
    try {
      const raw = await readFile(filePath, "utf8");
      const payload = JSON.parse(raw);
      const normalized = normalizeBoardDefinition(payload?.board ?? payload, { source: "imported", imported: true });
      if (!normalized.ok) {
        continue;
      }
      importedBoards.push(normalized.board);
    } catch {
      continue;
    }
  }

  importedBoards.sort((a, b) => a.boardId.localeCompare(b.boardId));
  return importedBoards;
}

async function loadBoardCatalog() {
  const builtInBoards = await loadBuiltInBoardsFromZones();
  const importedBoards = await loadImportedBoards();
  const byId = new Map();

  for (const board of builtInBoards) {
    byId.set(board.boardId, board);
  }
  for (const board of importedBoards) {
    byId.set(board.boardId, board);
  }

  const boards = Array.from(byId.values()).sort((a, b) => a.boardId.localeCompare(b.boardId));
  return {
    schema: BOARD_CATALOG_SCHEMA,
    generatedAt: new Date().toISOString(),
    boardCount: boards.length,
    boards,
    runtimeBoards: boards.map(toRuntimeBoard),
  };
}

async function handleBoardImport(req, res) {
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
  const normalized = normalizeBoardDefinition(incomingBoard, { source: "imported", imported: true });
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

  await mkdir(IMPORTED_BOARDS_DIR, { recursive: true });
  const targetPath = path.join(IMPORTED_BOARDS_DIR, `${safeFileName}.json`);
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
    targetPath: `config/boards/imported/${safeFileName}.json`,
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
    merged[boardId] = {
      ...fallback,
      ...primary,
      specialPolygons: mergeSpecialPolygonMap(primary.specialPolygons, fallback.specialPolygons),
      shipPolygon: isValidPolygon(primary.shipPolygon)
        ? primary.shipPolygon
        : isValidPolygon(fallback.shipPolygon)
          ? fallback.shipPolygon
          : undefined,
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

    if (req.method === "GET" && routePath === "/api/boards") {
      const catalog = await loadBoardCatalog();
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

server.listen(PORT, HOST, () => {
  logSessionEvent("server-start", {
    host: HOST,
    port: PORT,
    logPath: LIVE_LOG_PATH,
  });
  console.log(`TT Beamer server listening on http://${HOST}:${PORT}`);
});
