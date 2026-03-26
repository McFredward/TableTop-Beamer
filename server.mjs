import { createServer } from "node:http";
import { readFile, writeFile, stat, appendFile, mkdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.PORT ?? 4173);
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GLOBAL_DEFAULTS_PATH = path.join(ROOT_DIR, "config", "global-defaults.json");
const LIVE_LOG_PATH = process.env.TT_BEAMER_LIVE_LOG_PATH ?? path.join(ROOT_DIR, "logs", "live-sync.jsonl");

const LIVE_STATE_SCHEMA = "tt-beamer.live-state.v1";

const liveSessionState = {
  version: 0,
  updatedAt: new Date().toISOString(),
  lastMutation: null,
  snapshot: {
    schema: LIVE_STATE_SCHEMA,
    alignMode: false,
    outsideFxByBoard: {},
    runtime: null,
  },
};

const liveClients = new Map();

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

function acceptLiveMutationType(type) {
  return new Set([
    "trigger-global",
    "trigger-room",
    "edit-room",
    "stop-animation",
    "clear-all",
    "align-toggle",
    "outside-update",
  ]).has(type);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function applyLiveMutation({ clientId, role, mutationType, payload }) {
  if (!acceptLiveMutationType(mutationType)) {
    logErrorEvent("invalid-mutation-type", String(mutationType ?? "unknown"), {
      clientId,
      role,
    });
    return null;
  }
  let nextSnapshotPatch = null;
  if (mutationType === "outside-update") {
    nextSnapshotPatch = applyOutsideUpdatePatch(payload);
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
  return mutateLiveSession({
    mutation: {
      type: mutationType,
      byClientId: clientId,
      byRole: role,
      at: new Date().toISOString(),
    },
    nextSnapshotPatch,
  });
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
        const session = applyLiveMutation({
          clientId,
          role,
          mutationType: parsed.mutationType,
          payload: parsed.payload,
        });
        if (!session) {
          return;
        }
        sendLiveSocketMessage(socket, buildLiveSessionEnvelope("live-ack", { mutationType: parsed.mutationType }));
        broadcastLiveSession("live-session-update", {
          mutationType: parsed.mutationType,
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
