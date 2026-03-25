import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const HOST = "127.0.0.1";
const PORT = 4291;
const BASE_URL = `http://${HOST}:${PORT}`;
const SESSION_ID = "p5-t36-hotfix";

const serverLogs = [];
const server = spawn("node", ["server.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOST,
    PORT: String(PORT),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (chunk) => {
  serverLogs.push(String(chunk));
});
server.stderr.on("data", (chunk) => {
  serverLogs.push(String(chunk));
});

async function waitForHealth(timeoutMs = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) {
        return true;
      }
    } catch {
      // wait for server startup
    }
    await sleep(120);
  }
  return false;
}

async function jsonRequest(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { response, parsed, text };
}

function hasLogCode(code) {
  return serverLogs.join("").includes(`\"code\":\"${code}\"`);
}

const results = {
  sseCloseCrashSafe: false,
  reconnectCycles: 0,
  endpointCodes: {
    connect: false,
    stream: false,
    heartbeat: false,
    event: false,
  },
  streamCleanupCode: false,
  streamWriteFailedCode: false,
  uiHeartbeatDiagnosisWired: false,
};

try {
  const ready = await waitForHealth();
  if (!ready) {
    throw new Error("server health timeout");
  }

  const connect = await jsonRequest(
    `${BASE_URL}/api/session/connect?sessionId=${SESSION_ID}&role=operator&version=5-1`,
    { method: "GET", headers: { accept: "application/json" } },
  );
  if (!connect.response.ok) {
    throw new Error(`connect failed ${connect.response.status}`);
  }
  const clientId = String(connect.parsed?.clientId || "").trim();
  if (!clientId) {
    throw new Error("missing clientId from connect response");
  }

  const streamAbort = new AbortController();
  const streamResponse = await fetch(
    `${BASE_URL}/api/session/stream?sessionId=${SESSION_ID}&clientId=${encodeURIComponent(clientId)}`,
    {
      method: "GET",
      headers: { accept: "text/event-stream" },
      signal: streamAbort.signal,
    },
  );
  if (!streamResponse.ok) {
    throw new Error(`stream open failed ${streamResponse.status}`);
  }
  streamAbort.abort();
  await sleep(60);

  const eventResponse = await jsonRequest(`${BASE_URL}/api/session/event`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      clientId,
      role: "operator",
      type: "state-sync",
      payload: { marker: "p5-t36" },
      sharedState: { outputRoute: "auto" },
    }),
  });
  const healthAfter = await fetch(`${BASE_URL}/api/health`);
  results.sseCloseCrashSafe = eventResponse.response.ok && healthAfter.ok;
  results.streamCleanupCode = hasLogCode("SESSION_STREAM_CLEANUP");
  results.streamWriteFailedCode = hasLogCode("SESSION_STREAM_WRITE_FAILED");

  for (let cycle = 1; cycle <= 5; cycle += 1) {
    const reconnect = await jsonRequest(
      `${BASE_URL}/api/session/connect?sessionId=${SESSION_ID}&role=operator&version=5-1&clientId=${encodeURIComponent(clientId)}`,
      { method: "GET", headers: { accept: "application/json" } },
    );
    if (!reconnect.response.ok) {
      break;
    }

    const cycleAbort = new AbortController();
    const cycleStream = await fetch(
      `${BASE_URL}/api/session/stream?sessionId=${SESSION_ID}&clientId=${encodeURIComponent(clientId)}`,
      {
        method: "GET",
        headers: { accept: "text/event-stream" },
        signal: cycleAbort.signal,
      },
    );
    if (!cycleStream.ok) {
      break;
    }
    cycleAbort.abort();

    const heartbeat = await jsonRequest(`${BASE_URL}/api/session/heartbeat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, clientId, role: "operator" }),
    });
    if (!heartbeat.response.ok) {
      break;
    }
    results.reconnectCycles = cycle;
    await sleep(50);
  }

  await jsonRequest(`${BASE_URL}/api/session/connect?sessionId=${SESSION_ID}&version=legacy-v0`, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  await jsonRequest(`${BASE_URL}/api/session/stream?sessionId=${SESSION_ID}`, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  await jsonRequest(`${BASE_URL}/api/session/heartbeat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION_ID }),
  });
  await jsonRequest(`${BASE_URL}/api/session/event`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION_ID }),
  });

  results.endpointCodes.connect = hasLogCode("SESSION_CONNECT_VERSION_MISMATCH");
  results.endpointCodes.stream = hasLogCode("SESSION_STREAM_CLIENT_REQUIRED");
  results.endpointCodes.heartbeat = hasLogCode("SESSION_HEARTBEAT_CLIENT_REQUIRED");
  results.endpointCodes.event = hasLogCode("SESSION_EVENT_CLIENT_REQUIRED");
  try {
    const fs = await import("node:fs/promises");
    const [html, app] = await Promise.all([
      fs.readFile("index.html", "utf8"),
      fs.readFile("src/app.js", "utf8"),
    ]);
    results.uiHeartbeatDiagnosisWired =
      Boolean(results.reconnectCycles >= 5) &&
      html.includes("session-heartbeat-endpoint-status") &&
      app.includes("Heartbeat Endpoint:") &&
      app.includes("lastHeartbeatEndpoint");
  } catch {
    results.uiHeartbeatDiagnosisWired = false;
  }
} finally {
  server.kill("SIGTERM");
  await sleep(120);
}

const summary = [
  `SSE_CLOSE_CRASH_SAFE=${results.sseCloseCrashSafe}`,
  `RECONNECT_CYCLES_OK=${results.reconnectCycles >= 5}`,
  `RECONNECT_CYCLES_COUNT=${results.reconnectCycles}`,
  `LOG_CODE_CONNECT=${results.endpointCodes.connect}`,
  `LOG_CODE_STREAM=${results.endpointCodes.stream}`,
  `LOG_CODE_HEARTBEAT=${results.endpointCodes.heartbeat}`,
  `LOG_CODE_EVENT=${results.endpointCodes.event}`,
  `LOG_CODE_STREAM_CLEANUP=${results.streamCleanupCode}`,
  `LOG_CODE_STREAM_WRITE_FAILED=${results.streamWriteFailedCode}`,
  `UI_HEARTBEAT_DIAG_WIRED=${results.uiHeartbeatDiagnosisWired}`,
].join("\n");

process.stdout.write(`${summary}\n`);
