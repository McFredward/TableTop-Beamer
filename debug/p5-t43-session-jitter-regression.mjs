import { readFile } from "node:fs/promises";

const [appSource, configSource] = await Promise.all([
  readFile(new URL("../src/app.js", import.meta.url), "utf8"),
  readFile(new URL("../src/app/shared/config.js", import.meta.url), "utf8"),
]);

const apiTimeoutMatch = configSource.match(/const\s+API_REQUEST_TIMEOUT_MS\s*=\s*(\d+)\s*;/);
const sessionTimeoutMatch = configSource.match(/const\s+SESSION_REQUEST_TIMEOUT_MS\s*=\s*(\d+)\s*;/);
const apiTimeout = apiTimeoutMatch ? Number(apiTimeoutMatch[1]) : NaN;
const sessionTimeout = sessionTimeoutMatch ? Number(sessionTimeoutMatch[1]) : NaN;

const checks = [
  {
    name: "SESSION_TIMEOUT_DECOUPLED",
    ok: Number.isFinite(apiTimeout) && Number.isFinite(sessionTimeout) && sessionTimeout > apiTimeout,
  },
  {
    name: "SESSION_CONNECT_HEARTBEAT_TIMEOUT_WIRED",
    ok:
      appSource.includes("timeoutMs: SESSION_REQUEST_TIMEOUT_MS") &&
      appSource.includes("fetchWithTimeout(buildSessionEndpoint(SESSION_ENDPOINT_PATHS.heartbeat)"),
  },
  {
    name: "SESSION_STREAM_TIMEOUT_GUARD",
    ok:
      appSource.includes("sessionStreamConnectTimeoutTimer") &&
      appSource.includes("SSE_STREAM_TIMEOUT") &&
      appSource.includes("scheduleSessionReconnect({ reason: \"sse-timeout\" })"),
  },
  {
    name: "HEARTBEAT_N_FAILURE_GUARD",
    ok:
      appSource.includes("SESSION_HEARTBEAT_FAILURE_THRESHOLD") &&
      appSource.includes("retry.heartbeatFailureCount < threshold") &&
      appSource.includes("Heartbeat-Fehler toleriert"),
  },
  {
    name: "RECONNECT_TRANSITION_SERIALIZED",
    ok:
      appSource.includes("reconnectTransitionId") &&
      appSource.includes("Number(getSessionRetryState().reconnectTransitionId) !== transitionId"),
  },
  {
    name: "RETRY_GRACE_WINDOW_GUARD",
    ok:
      appSource.includes("SESSION_RETRY_TERMINAL_GRACE_MS") &&
      appSource.includes("withinGraceWindow"),
  },
  {
    name: "RETRY_RESET_ON_STABLE_HEARTBEAT",
    ok:
      appSource.includes("retry.stableResetPending") &&
      appSource.includes("state.session.reconnectAttempts = 0"),
  },
];

for (const check of checks) {
  console.log(`${check.name}=${check.ok ? "true" : "false"}`);
}

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  console.error(`FAILED_CHECKS=${failed.map((entry) => entry.name).join(",")}`);
  process.exit(1);
}

console.log("JITTER_REGRESSION_GUARD=true");
