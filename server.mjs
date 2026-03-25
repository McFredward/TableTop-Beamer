import { createServer } from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.PORT ?? 4173);
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GLOBAL_DEFAULTS_PATH = path.join(ROOT_DIR, "config", "global-defaults.json");
const liveSessionState = {
  sendCounter: 0,
  liveCount: 0,
  sends: [],
};

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
    animationGifMap: parsed.animationGifMap ?? {},
  };

  await writeFile(GLOBAL_DEFAULTS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  sendJson(res, 200, {
    ok: true,
    target: "config/global-defaults.json",
    savedAt: next.savedAt,
  });
}

async function readJsonPayload(req, res) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (chunks.reduce((size, item) => size + item.length, 0) > 2 * 1024 * 1024) {
      sendJson(res, 413, { error: "payload too large" });
      return null;
    }
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    sendJson(res, 400, { error: "invalid JSON payload" });
    return null;
  }
}

async function handleLiveSend(req, res) {
  const payload = await readJsonPayload(req, res);
  if (!payload) {
    return;
  }
  const previewItems = Array.isArray(payload.previewItems) ? payload.previewItems : [];
  if (previewItems.length === 0 || previewItems.length > 200) {
    sendJson(res, 400, { error: "previewItems must be a non-empty array (<=200)" });
    return;
  }

  liveSessionState.sendCounter += 1;
  const sendId = `live-${Date.now()}-${liveSessionState.sendCounter}`;
  const committedCount = previewItems.length;
  liveSessionState.liveCount += committedCount;
  liveSessionState.sends.push({
    sendId,
    committedCount,
    sentAt: payload.sentAt ?? new Date().toISOString(),
    boardId: payload.boardId ?? null,
  });

  sendJson(res, 200, {
    ok: true,
    sendId,
    committedCount,
    liveCount: liveSessionState.liveCount,
  });
}

async function handleLiveRollback(req, res) {
  const payload = await readJsonPayload(req, res);
  if (!payload) {
    return;
  }
  if (liveSessionState.sends.length === 0) {
    sendJson(res, 409, { error: "no send available for rollback" });
    return;
  }
  const expectedSendId = payload?.sendId ? String(payload.sendId) : null;
  const lastSend = liveSessionState.sends[liveSessionState.sends.length - 1];
  if (expectedSendId && expectedSendId !== lastSend.sendId) {
    sendJson(res, 409, {
      error: "rollback must target latest send",
      latestSendId: lastSend.sendId,
    });
    return;
  }
  const rolledBack = liveSessionState.sends.pop();
  liveSessionState.liveCount = Math.max(0, liveSessionState.liveCount - rolledBack.committedCount);
  sendJson(res, 200, {
    ok: true,
    rolledBackSendId: rolledBack.sendId,
    liveCount: liveSessionState.liveCount,
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
  try {
    const routePath = normalizeRoutePath(req.url || "/");

    if (req.method === "GET" && routePath === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        service: "tt-beamer-api",
        saveEndpoint: "/api/global-defaults",
        postSupported: true,
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

    if (req.method === "OPTIONS" && (routePath === "/api/live/send" || routePath === "/api/live/rollback")) {
      res.writeHead(204, {
        allow: "POST,OPTIONS",
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

    if (req.method === "GET" && routePath === "/api/live/state") {
      const lastSend = liveSessionState.sends[liveSessionState.sends.length - 1] ?? null;
      sendJson(res, 200, {
        ok: true,
        liveCount: liveSessionState.liveCount,
        sendCount: liveSessionState.sends.length,
        lastSend,
      });
      return;
    }

    if (req.method === "POST" && routePath === "/api/live/send") {
      await handleLiveSend(req, res);
      return;
    }

    if (req.method === "POST" && routePath === "/api/live/rollback") {
      await handleLiveRollback(req, res);
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
    sendJson(res, 500, {
      error: "internal server error",
      detail: error instanceof Error ? error.message : "unknown",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`TT Beamer server listening on http://${HOST}:${PORT}`);
});
