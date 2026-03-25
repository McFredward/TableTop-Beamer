import { readFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const HOST = "127.0.0.1";
const PORT = 4292;
const BASE_URL = `http://${HOST}:${PORT}`;
const SESSION_ID = "p5-t44-hotfix";

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

const jitterCheck = spawnSync("node", ["debug/p5-t43-session-jitter-regression.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8",
});
const jitterStdout = String(jitterCheck.stdout || "");

const results = {
  jitterGuardsOk: jitterCheck.status === 0 && jitterStdout.includes("JITTER_REGRESSION_GUARD=true"),
  heartbeatGet404: false,
  heartbeatPost200: false,
  runbookMainReadmePostOnly: false,
  runbookPhaseReadmePostOnly: false,
};

const server = spawn("node", ["server.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOST,
    PORT: String(PORT),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  const ready = await waitForHealth();
  if (!ready) {
    throw new Error("server health timeout");
  }

  const connect = await jsonRequest(
    `${BASE_URL}/api/session/connect?sessionId=${SESSION_ID}&role=operator&version=5-1`,
    { method: "GET", headers: { accept: "application/json" } },
  );
  const clientId = String(connect.parsed?.clientId || "").trim();

  const heartbeatGet = await fetch(`${BASE_URL}/api/session/heartbeat`, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  results.heartbeatGet404 = heartbeatGet.status === 404;

  if (clientId) {
    const heartbeatPost = await jsonRequest(`${BASE_URL}/api/session/heartbeat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        clientId,
        role: "operator",
      }),
    });
    results.heartbeatPost200 = heartbeatPost.response.status === 200;
  }

  const [mainReadme, phaseReadme] = await Promise.all([
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../.planning/phases/phase-05/README.md", import.meta.url), "utf8"),
  ]);
  results.runbookMainReadmePostOnly =
    mainReadme.includes("POST-only") &&
    mainReadme.includes("GET /api/session/heartbeat") &&
    mainReadme.includes("curl -i -X POST");
  results.runbookPhaseReadmePostOnly =
    phaseReadme.includes("POST-only") &&
    phaseReadme.includes("GET /api/session/heartbeat") &&
    phaseReadme.includes("curl -i -X POST");
} finally {
  server.kill("SIGTERM");
  await sleep(120);
}

const allOk =
  results.jitterGuardsOk &&
  results.heartbeatGet404 &&
  results.heartbeatPost200 &&
  results.runbookMainReadmePostOnly &&
  results.runbookPhaseReadmePostOnly;

const summary = [
  `JITTER_GUARDS_OK=${results.jitterGuardsOk}`,
  `HEARTBEAT_GET_404=${results.heartbeatGet404}`,
  `HEARTBEAT_POST_200=${results.heartbeatPost200}`,
  `RUNBOOK_MAIN_README_POST_ONLY=${results.runbookMainReadmePostOnly}`,
  `RUNBOOK_PHASE_README_POST_ONLY=${results.runbookPhaseReadmePostOnly}`,
  `PLAN_5_5_VERIFICATION=${allOk}`,
].join("\n");

process.stdout.write(`${summary}\n`);

if (!allOk) {
  process.exit(1);
}
