import { createServer } from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import { createReadStream, appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.PORT ?? 4173);
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GLOBAL_DEFAULTS_PATH = path.join(ROOT_DIR, "config", "global-defaults.json");
const SESSION_LOG_PATH = path.join(ROOT_DIR, "logs", "session-api.log");
const SESSION_PROTOCOL_VERSION = "5-1";
const HEARTBEAT_INTERVAL_MS = 4000;
const STALE_CLIENT_TIMEOUT_MS = 16000;
const SESSION_ENDPOINTS = {
  connect: "/api/session/connect",
  stream: "/api/session/stream",
  heartbeat: "/api/session/heartbeat",
  event: "/api/session/event",
};
const sessionStore = new Map();

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

function logSessionCode(code, {
  endpoint,
  sessionId = "",
  clientId = "",
  status = null,
  detail = "",
  method = "",
  level = "warn",
} = {}) {
  const payload = {
    scope: "session",
    code,
    endpoint: endpoint || "unknown",
    method: method || "-",
    sessionId: String(sessionId || "").trim() || "default-session",
    clientId: String(clientId || "").trim() || "-",
  };
  if (Number.isFinite(Number(status))) {
    payload.status = Number(status);
  }
  if (detail) {
    payload.detail = String(detail);
  }
  const message = JSON.stringify(payload);
  if (level === "error") {
    console.error(message);
  } else if (level === "info") {
    console.log(message);
  } else {
    console.warn(message);
  }
  void appendSessionLog(payload);
}

function appendSessionLog(payload) {
  const entry = {
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const serialized = `${JSON.stringify(entry)}\n`;
  try {
    mkdirSync(path.dirname(SESSION_LOG_PATH), { recursive: true });
    appendFileSync(SESSION_LOG_PATH, serialized, "utf8");
  } catch (error) {
    console.warn(
      JSON.stringify({
        scope: "session",
        code: "SESSION_LOG_WRITE_FAILED",
        endpoint: "logfile",
        method: "-",
        status: 500,
        detail: error instanceof Error ? error.message : "unknown",
      }),
    );
  }
}

function isSessionApiPath(routePath) {
  return (
    routePath === SESSION_ENDPOINTS.connect ||
    routePath === SESSION_ENDPOINTS.stream ||
    routePath === SESSION_ENDPOINTS.heartbeat ||
    routePath === SESSION_ENDPOINTS.event
  );
}

function getRequestClientIp(req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean);
  if (forwardedFor) {
    return forwardedFor;
  }
  const realIp = String(req.headers["x-real-ip"] || "").trim();
  if (realIp) {
    return realIp;
  }
  return String(req.socket?.remoteAddress || "-").trim() || "-";
}

function logSessionAccess({ req, path: routePath, status, durationMs, clientIp = "" }) {
  appendSessionLog({
    scope: "session",
    code: "SESSION_ACCESS",
    method: req.method || "-",
    path: routePath || "-",
    status: Number.isFinite(Number(status)) ? Number(status) : 0,
    duration: `${Math.max(0, Number(durationMs) || 0)}ms`,
    "client-ip": clientIp || getRequestClientIp(req),
  });
}

function logSessionRequest({
  code,
  endpoint,
  method,
  status,
  sessionId = "",
  clientId = "",
  detail = "",
}) {
  logSessionCode(code, {
    endpoint,
    method,
    status,
    sessionId,
    clientId,
    detail,
    level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
  });
}

function normalizeRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "operator" || normalized === "alignment" || normalized === "final-output") {
    return normalized;
  }
  return "operator";
}

function randomId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function writeSse(res, eventName, payload) {
  if (!res || res.destroyed || res.writableEnded) {
    return false;
  }
  try {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

function createSession(sessionId) {
  return {
    id: sessionId,
    seq: 0,
    sharedState: {
      boardId: null,
      selectedRoomId: null,
      runningAnimations: [],
      alignmentOverlayEnabled: false,
      outputRoute: "auto",
      outsideFxByBoard: {},
    },
    clients: new Map(),
    streams: new Set(),
    recentEventIds: new Map(),
    updatedAt: Date.now(),
  };
}

function rememberSessionEventId(session, eventId) {
  const cleaned = String(eventId || "").trim();
  if (!cleaned) {
    return { duplicated: false };
  }
  const now = Date.now();
  const ttlMs = 5 * 60 * 1000;
  for (const [knownId, seenAt] of session.recentEventIds.entries()) {
    if (now - Number(seenAt || 0) > ttlMs) {
      session.recentEventIds.delete(knownId);
    }
  }
  if (session.recentEventIds.has(cleaned)) {
    return { duplicated: true };
  }
  session.recentEventIds.set(cleaned, now);
  if (session.recentEventIds.size > 600) {
    const oldestKey = session.recentEventIds.keys().next().value;
    if (oldestKey) {
      session.recentEventIds.delete(oldestKey);
    }
  }
  return { duplicated: false };
}

function parseJsonQueryValue(rawValue) {
  if (!rawValue) {
    return {};
  }
  const text = String(rawValue || "").trim();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getSession(sessionId) {
  const key = String(sessionId || "").trim() || "default-session";
  if (!sessionStore.has(key)) {
    sessionStore.set(key, createSession(key));
  }
  return sessionStore.get(key);
}

function markClientStale(session, clientId) {
  if (!clientId || !session.clients.has(clientId)) {
    return;
  }
  const previous = session.clients.get(clientId);
  session.clients.set(clientId, {
    ...previous,
    lastHeartbeatAt: Math.min(previous.lastHeartbeatAt, Date.now() - STALE_CLIENT_TIMEOUT_MS - 1),
  });
}

function removeSessionStream(session, stream, { clientId = "", reason = "" } = {}) {
  if (!session.streams.has(stream)) {
    return false;
  }
  session.streams.delete(stream);
  markClientStale(session, clientId);
  logSessionCode("SESSION_STREAM_CLEANUP", {
    endpoint: SESSION_ENDPOINTS.stream,
    sessionId: session.id,
    clientId,
    detail: reason || "stream closed/cleaned",
    level: "info",
  });
  return true;
}

function listClients(session) {
  return Array.from(session.clients.values()).map((client) => ({
    clientId: client.clientId,
    role: client.role,
    lastHeartbeatAt: client.lastHeartbeatAt,
  }));
}

function buildSessionSnapshot(session) {
  return {
    sessionId: session.id,
    seq: session.seq,
    serverVersion: SESSION_PROTOCOL_VERSION,
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    staleTimeoutMs: STALE_CLIENT_TIMEOUT_MS,
    sharedState: session.sharedState,
    clients: listClients(session),
  };
}

function broadcastSessionEvent(session, event) {
  session.seq += 1;
  session.updatedAt = Date.now();
  const packet = {
    seq: session.seq,
    serverTime: new Date().toISOString(),
    ...event,
    snapshot: buildSessionSnapshot(session),
  };
  for (const stream of Array.from(session.streams)) {
    const writeOk = writeSse(stream, "session-event", packet);
    if (!writeOk) {
      session.streams.delete(stream);
      logSessionCode("SESSION_STREAM_WRITE_FAILED", {
        endpoint: SESSION_ENDPOINTS.stream,
        sessionId: session.id,
        detail: "broadcast write failed on stale/closed stream",
      });
    }
  }
}

function pruneStaleClients(session) {
  const now = Date.now();
  let changed = false;
  for (const [clientId, entry] of session.clients.entries()) {
    if (now - entry.lastHeartbeatAt > STALE_CLIENT_TIMEOUT_MS) {
      session.clients.delete(clientId);
      changed = true;
    }
  }
  if (changed) {
    broadcastSessionEvent(session, {
      type: "client-prune",
      sourceClientId: "server",
      payload: { reason: "stale-timeout" },
    });
  }
}

setInterval(() => {
  for (const session of sessionStore.values()) {
    pruneStaleClients(session);
  }
}, Math.max(1200, Math.floor(HEARTBEAT_INTERVAL_MS * 0.75))).unref();

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

async function parseRequestBody(req, { maxBytes = 1024 * 1024 } = {}) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      return { ok: false, error: "payload too large" };
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return { ok: true, value: raw ? JSON.parse(raw) : {} };
  } catch {
    return { ok: false, error: "invalid JSON payload" };
  }
}

async function handleGlobalDefaultsSave(req, res) {
  const parsedPayload = await parseRequestBody(req, { maxBytes: 5 * 1024 * 1024 });
  if (!parsedPayload.ok) {
    sendJson(res, 400, { error: parsedPayload.error });
    return;
  }
  const parsed = parsedPayload.value;
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

function handleSessionConnect(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const version = String(url.searchParams.get("version") || "").trim();
  const sessionId = String(url.searchParams.get("sessionId") || "default-session").trim() || "default-session";
  const requestedClientId = String(url.searchParams.get("clientId") || "").trim();
  if (version && version !== SESSION_PROTOCOL_VERSION) {
    logSessionCode("SESSION_CONNECT_VERSION_MISMATCH", {
      endpoint: SESSION_ENDPOINTS.connect,
      sessionId,
      clientId: requestedClientId,
      status: 409,
      method: req.method,
      detail: `expected=${SESSION_PROTOCOL_VERSION}, received=${version}`,
    });
    sendJson(res, 409, {
      error: "SESSION_VERSION_MISMATCH",
      expected: SESSION_PROTOCOL_VERSION,
      received: version,
    });
    return;
  }
  const role = normalizeRole(url.searchParams.get("role"));
  const clientId = requestedClientId || randomId("client");
  const session = getSession(sessionId);
  const now = Date.now();
  session.clients.set(clientId, {
    clientId,
    role,
    userAgent: String(req.headers["user-agent"] || ""),
    lastHeartbeatAt: now,
  });

  sendJson(res, 200, {
    ok: true,
    sessionId,
    clientId,
    role,
    snapshot: buildSessionSnapshot(session),
  });
  logSessionRequest({
    code: "SESSION_CONNECT_OK",
    endpoint: SESSION_ENDPOINTS.connect,
    method: req.method,
    status: 200,
    sessionId,
    clientId,
  });
}

function handleSessionStream(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const sessionId = String(url.searchParams.get("sessionId") || "default-session").trim() || "default-session";
  const clientId = String(url.searchParams.get("clientId") || "").trim();
  if (!clientId) {
    logSessionCode("SESSION_STREAM_CLIENT_REQUIRED", {
      endpoint: SESSION_ENDPOINTS.stream,
      sessionId,
      status: 400,
      method: req.method,
      detail: "missing clientId query param",
    });
    sendJson(res, 400, { error: "clientId required" });
    return;
  }
  const session = getSession(sessionId);

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  res.write("retry: 2000\n\n");
  session.streams.add(res);
  logSessionRequest({
    code: "SESSION_STREAM_OPEN",
    endpoint: SESSION_ENDPOINTS.stream,
    method: req.method,
    status: 200,
    sessionId,
    clientId,
  });

  const initialSnapshotWritten = writeSse(res, "session-snapshot", {
    sourceClientId: "server",
    snapshot: buildSessionSnapshot(session),
  });
  if (!initialSnapshotWritten) {
    session.streams.delete(res);
    logSessionCode("SESSION_STREAM_INIT_WRITE_FAILED", {
      endpoint: SESSION_ENDPOINTS.stream,
      sessionId,
      clientId,
      detail: "unable to write initial snapshot",
    });
    res.end();
    return;
  }

  let cleanedUp = false;
  const cleanup = (reason = "stream-close") => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    removeSessionStream(session, res, { clientId, reason });
  };

  req.on("close", () => cleanup("req-close"));
  req.on("aborted", () => cleanup("req-aborted"));
  req.on("error", () => cleanup("req-error"));
  res.on("close", () => cleanup("res-close"));
  res.on("finish", () => cleanup("res-finish"));
  res.on("error", () => cleanup("res-error"));
}

async function handleSessionHeartbeat(req, res) {
  let body = {};
  if (req.method === "GET") {
    const url = new URL(req.url || "/", "http://localhost");
    body = {
      sessionId: String(url.searchParams.get("sessionId") || "default-session").trim() || "default-session",
      clientId: String(url.searchParams.get("clientId") || "").trim(),
      role: String(url.searchParams.get("role") || "operator").trim() || "operator",
    };
  } else {
    const parsed = await parseRequestBody(req, { maxBytes: 64 * 1024 });
    if (!parsed.ok) {
      logSessionCode("SESSION_HEARTBEAT_BAD_PAYLOAD", {
        endpoint: SESSION_ENDPOINTS.heartbeat,
        status: 400,
        method: req.method,
        detail: parsed.error,
      });
      sendJson(res, 400, { error: parsed.error });
      return;
    }
    body = parsed.value && typeof parsed.value === "object" ? parsed.value : {};
  }
  const session = getSession(body.sessionId);
  const clientId = String(body.clientId || "").trim();
  if (!clientId) {
    logSessionCode("SESSION_HEARTBEAT_CLIENT_REQUIRED", {
      endpoint: SESSION_ENDPOINTS.heartbeat,
      sessionId: session.id,
      status: 400,
      method: req.method,
      detail: "missing clientId",
    });
    sendJson(res, 400, { error: "clientId required" });
    return;
  }
  const existing = session.clients.get(clientId) || { clientId, role: "operator" };
  session.clients.set(clientId, {
    ...existing,
    role: normalizeRole(body.role || existing.role),
    lastHeartbeatAt: Date.now(),
  });
  pruneStaleClients(session);
  sendJson(res, 200, {
    ok: true,
    snapshot: buildSessionSnapshot(session),
  });
  logSessionRequest({
    code: "SESSION_HEARTBEAT_OK",
    endpoint: SESSION_ENDPOINTS.heartbeat,
    method: req.method,
    status: 200,
    sessionId: session.id,
    clientId,
  });
}

async function handleSessionEvent(req, res) {
  let body = {};
  if (req.method === "GET") {
    const url = new URL(req.url || "/", "http://localhost");
    const payload = parseJsonQueryValue(url.searchParams.get("payload"));
    const sharedState = parseJsonQueryValue(url.searchParams.get("sharedState"));
    if (payload === null || sharedState === null) {
      logSessionCode("SESSION_EVENT_BAD_PAYLOAD", {
        endpoint: SESSION_ENDPOINTS.event,
        status: 400,
        method: req.method,
        detail: "invalid JSON query payload/sharedState",
      });
      sendJson(res, 400, { error: "invalid JSON query payload/sharedState" });
      return;
    }
    body = {
      sessionId: String(url.searchParams.get("sessionId") || "default-session").trim() || "default-session",
      clientId: String(url.searchParams.get("clientId") || "").trim(),
      role: String(url.searchParams.get("role") || "operator").trim() || "operator",
      type: String(url.searchParams.get("type") || "state-sync").trim() || "state-sync",
      eventId: String(url.searchParams.get("eventId") || "").trim(),
      payload,
      sharedState,
    };
  } else {
    const parsed = await parseRequestBody(req, { maxBytes: 512 * 1024 });
    if (!parsed.ok) {
      logSessionCode("SESSION_EVENT_BAD_PAYLOAD", {
        endpoint: SESSION_ENDPOINTS.event,
        status: 400,
        method: req.method,
        detail: parsed.error,
      });
      sendJson(res, 400, { error: parsed.error });
      return;
    }
    body = parsed.value && typeof parsed.value === "object" ? parsed.value : {};
  }
  const session = getSession(body.sessionId);
  const clientId = String(body.clientId || "").trim();
  if (!clientId) {
    logSessionCode("SESSION_EVENT_CLIENT_REQUIRED", {
      endpoint: SESSION_ENDPOINTS.event,
      sessionId: session.id,
      status: 400,
      method: req.method,
      detail: "missing clientId",
    });
    sendJson(res, 400, { error: "clientId required" });
    return;
  }
  const existingClient = session.clients.get(clientId) || {
    clientId,
    role: normalizeRole(body.role),
    userAgent: String(req.headers["user-agent"] || ""),
  };
  session.clients.set(clientId, {
    ...existingClient,
    role: normalizeRole(body.role || existingClient.role),
    lastHeartbeatAt: Date.now(),
  });

  const eventType = String(body.type || "state-sync").trim() || "state-sync";
  const eventId = String(body.eventId || "").trim();
  const seen = rememberSessionEventId(session, eventId);
  if (seen.duplicated) {
    logSessionRequest({
      code: "SESSION_EVENT_DUPLICATE_IGNORED",
      endpoint: SESSION_ENDPOINTS.event,
      method: req.method,
      status: 200,
      sessionId: session.id,
      clientId,
      detail: eventId,
    });
    sendJson(res, 200, {
      ok: true,
      duplicate: true,
      snapshot: buildSessionSnapshot(session),
    });
    return;
  }
  if (body.sharedState && typeof body.sharedState === "object") {
    session.sharedState = {
      ...session.sharedState,
      ...body.sharedState,
      runningAnimations: Array.isArray(body.sharedState.runningAnimations)
        ? body.sharedState.runningAnimations
        : session.sharedState.runningAnimations,
      outsideFxByBoard:
        body.sharedState.outsideFxByBoard && typeof body.sharedState.outsideFxByBoard === "object"
          ? body.sharedState.outsideFxByBoard
          : session.sharedState.outsideFxByBoard,
    };
  }

  broadcastSessionEvent(session, {
    type: eventType,
    sourceClientId: clientId,
    payload: body.payload && typeof body.payload === "object" ? body.payload : {},
  });

  sendJson(res, 200, {
    ok: true,
    snapshot: buildSessionSnapshot(session),
  });
  logSessionRequest({
    code: "SESSION_EVENT_OK",
    endpoint: SESSION_ENDPOINTS.event,
    method: req.method,
    status: 200,
    sessionId: session.id,
    clientId,
    detail: eventType,
  });
}

async function handleStaticFile(req, res) {
  const targetPath = toSafePath(req.url || "/");
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
  const requestStartedAt = Date.now();
  const requestClientIp = getRequestClientIp(req);
  let accessPath = "/";
  let accessLogged = false;
  const logSessionAccessOnFinish = () => {
    if (accessLogged || !isSessionApiPath(accessPath)) {
      return;
    }
    accessLogged = true;
    logSessionAccess({
      req,
      path: accessPath,
      status: res.statusCode,
      durationMs: Date.now() - requestStartedAt,
      clientIp: requestClientIp,
    });
  };
  res.on("finish", logSessionAccessOnFinish);
  res.on("close", logSessionAccessOnFinish);
  let routePath = "/";
  try {
    routePath = normalizeRoutePath(req.url || "/");
    accessPath = routePath;

    if (req.method === "GET" && routePath === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        service: "tt-beamer-api",
        saveEndpoint: "/api/global-defaults",
        postSupported: true,
        sessionEndpoint: {
          connect: SESSION_ENDPOINTS.connect,
          stream: SESSION_ENDPOINTS.stream,
          heartbeat: SESSION_ENDPOINTS.heartbeat,
          event: SESSION_ENDPOINTS.event,
          version: SESSION_PROTOCOL_VERSION,
        },
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

    if (req.method === "GET" && routePath === "/api/session/connect") {
      handleSessionConnect(req, res);
      return;
    }

    if (req.method === "GET" && routePath === "/api/session/stream") {
      handleSessionStream(req, res);
      return;
    }

    if ((req.method === "POST" || req.method === "GET") && routePath === "/api/session/heartbeat") {
      await handleSessionHeartbeat(req, res);
      return;
    }

    if ((req.method === "POST" || req.method === "GET") && routePath === "/api/session/event") {
      await handleSessionEvent(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, {
        allow: "GET,HEAD,POST,OPTIONS",
      });
      res.end();
      return;
    }

    await handleStaticFile(req, res);
  } catch (error) {
    if (routePath.startsWith("/api/session/")) {
      logSessionCode("SESSION_ENDPOINT_UNHANDLED_ERROR", {
        endpoint: routePath,
        status: 500,
        method: req.method,
        detail: error instanceof Error ? error.message : "unknown",
        level: "error",
      });
    }
    sendJson(res, 500, {
      error: "internal server error",
      detail: error instanceof Error ? error.message : "unknown",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`TT Beamer server listening on http://${HOST}:${PORT}`);
});
