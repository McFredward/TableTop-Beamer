function getApiBaseFromSaveEndpoint(saveEndpoint, windowOrigin = "") {
  try {
    const url = new URL(saveEndpoint);
    return url.origin;
  } catch {
    return windowOrigin || "http://127.0.0.1:4173";
  }
}

function formatResolverSourceLabel(source) {
  return source || "unbekannt";
}

function getApiHostName(base) {
  try {
    return String(new URL(base).hostname || "").toLowerCase();
  } catch {
    return "";
  }
}

function buildResolveSnapshot({ routing = null, endpoint = "", method = "POST", uiHost = "" } = {}) {
  return {
    uiHost: routing?.uiHost || uiHost || "unbekannt",
    apiHost: routing?.apiHost || getApiHostName(getApiBaseFromSaveEndpoint(endpoint, `http://${uiHost}:4173`)) || "unbekannt",
    source: formatResolverSourceLabel(routing?.source),
    endpoint,
    method,
  };
}

function formatResolveSnapshot(snapshot) {
  return `UI-Host ${snapshot.uiHost} -> API-Host ${snapshot.apiHost} | Quelle ${snapshot.source} | Endpoint ${snapshot.method} ${snapshot.endpoint}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const remoteRouting = {
  uiHost: "192.168.0.80",
  apiHost: "192.168.0.80",
  source: "ui-host-default",
};

const saveSnapshot = buildResolveSnapshot({
  routing: remoteRouting,
  endpoint: "http://192.168.0.80:4173/api/global-defaults",
  method: "POST",
});
const diagnoseSnapshot = buildResolveSnapshot({
  routing: remoteRouting,
  endpoint: "http://192.168.0.80:4173/api/global-defaults",
  method: "OPTIONS",
});

const saveText = formatResolveSnapshot(saveSnapshot);
const diagnoseText = formatResolveSnapshot(diagnoseSnapshot);

assert(saveText.includes("UI-Host 192.168.0.80 -> API-Host 192.168.0.80"), "save snapshot should stay host-transparent");
assert(
  diagnoseText.includes("UI-Host 192.168.0.80 -> API-Host 192.168.0.80"),
  "diagnose snapshot should stay host-transparent",
);
assert(!saveText.includes("localhost"), "save snapshot must not fall back to localhost in remote flow");
assert(!diagnoseText.includes("localhost"), "diagnose snapshot must not fall back to localhost in remote flow");

const fallbackBase = getApiBaseFromSaveEndpoint("invalid-url", "http://192.168.0.80:4173");
assert(fallbackBase === "http://192.168.0.80:4173", "invalid endpoint fallback must use UI origin");

console.log("SNAPSHOT_SAVE=" + saveText);
console.log("SNAPSHOT_DIAG=" + diagnoseText);
console.log("INVALID_ENDPOINT_FALLBACK=" + fallbackBase);
