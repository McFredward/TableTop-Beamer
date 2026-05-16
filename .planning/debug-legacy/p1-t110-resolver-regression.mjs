const API_BASE_STORAGE_KEY = "tt-beamer.api-base.v1";
const API_BASE_URL_PARAM_KEYS = ["ttApiBase", "apiBase", "api_base"];
const API_PORT_FALLBACKS = [4173, 4174, 3000, 8080];
const LOCAL_API_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function createWindowMock({ origin, hostname, protocol, search = "", storageBase = null, globalBase = null }) {
  const storage = new Map();
  if (storageBase) {
    storage.set(API_BASE_STORAGE_KEY, storageBase);
  }
  return {
    __TT_BEAMER_API_BASE__: globalBase,
    location: {
      origin,
      hostname,
      protocol,
      search,
    },
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
    },
  };
}

function normalizeApiBase(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function getUiHostName(windowRef) {
  try {
    return String(windowRef.location?.hostname || "").toLowerCase();
  } catch {
    return "";
  }
}

function getUiProtocol(windowRef) {
  const protocol = String(windowRef.location?.protocol || "http:").toLowerCase();
  return protocol === "https:" ? "https:" : "http:";
}

function isLocalApiHost(hostname) {
  if (!hostname) {
    return false;
  }
  const normalized = String(hostname).toLowerCase();
  return LOCAL_API_HOSTS.has(normalized) || normalized.startsWith("127.");
}

function getApiHostName(base) {
  try {
    return String(new URL(base).hostname || "").toLowerCase();
  } catch {
    return "";
  }
}

function readApiBaseFromQuery(windowRef) {
  try {
    const params = new URLSearchParams(windowRef.location?.search || "");
    for (const key of API_BASE_URL_PARAM_KEYS) {
      const value = normalizeApiBase(params.get(key));
      if (value) {
        return {
          base: value,
          source: `override:url(${key})`,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function readConfiguredApiBase(windowRef) {
  const globalBase = normalizeApiBase(windowRef.__TT_BEAMER_API_BASE__);
  if (globalBase) {
    return {
      base: globalBase,
      source: "override:window.__TT_BEAMER_API_BASE__",
    };
  }

  const queryBase = readApiBaseFromQuery(windowRef);
  if (queryBase) {
    return queryBase;
  }

  try {
    const localBase = normalizeApiBase(windowRef.localStorage.getItem(API_BASE_STORAGE_KEY));
    if (localBase) {
      return {
        base: localBase,
        source: `override:localStorage(${API_BASE_STORAGE_KEY})`,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

function resolveGlobalDefaultsApiCandidates(windowRef) {
  const endpoints = [];
  const seen = new Set();

  function addEndpoint(base, source) {
    const normalized = normalizeApiBase(base);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    endpoints.push({
      apiBase: normalized,
      endpoint: `${normalized}/api/global-defaults`,
      source,
      uiHost: getUiHostName(windowRef),
      apiHost: getApiHostName(normalized),
    });
  }

  const configured = readConfiguredApiBase(windowRef);
  if (configured) {
    addEndpoint(configured.base, configured.source);
  }

  addEndpoint(windowRef.location?.origin, "ui-host-default");

  const uiHost = getUiHostName(windowRef);
  const uiProtocol = getUiProtocol(windowRef);
  const fallbackHost = uiHost || "localhost";
  const allowLocalhostFallback = !uiHost || isLocalApiHost(uiHost);

  for (const port of API_PORT_FALLBACKS) {
    addEndpoint(`${uiProtocol}//${fallbackHost}:${port}`, `fallback:${fallbackHost}:${port}`);
  }

  if (allowLocalhostFallback) {
    addEndpoint("http://localhost:4173", "fallback:localhost:4173");
    addEndpoint("http://127.0.0.1:4173", "fallback:127.0.0.1:4173");
  }

  return endpoints;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const remoteWindow = createWindowMock({
  origin: "http://192.168.0.80:4173",
  hostname: "192.168.0.80",
  protocol: "http:",
});
const remoteCandidates = resolveGlobalDefaultsApiCandidates(remoteWindow);
assert(remoteCandidates[0].apiHost === "192.168.0.80", "remote default should use UI host");
assert(
  !remoteCandidates.some((entry) => entry.apiHost === "localhost" || entry.apiHost === "127.0.0.1"),
  "remote defaults must not include localhost hosts",
);

const overrideWindow = createWindowMock({
  origin: "http://192.168.0.80:4173",
  hostname: "192.168.0.80",
  protocol: "http:",
  search: "?ttApiBase=http://localhost:4173",
});
const overrideCandidates = resolveGlobalDefaultsApiCandidates(overrideWindow);
assert(overrideCandidates[0].source.startsWith("override:"), "override should have highest priority");
assert(overrideCandidates[0].apiHost === "localhost", "explicit override should remain compatible");

console.log(
  `REMOTE_FIRST=${remoteCandidates[0].apiHost} REMOTE_HAS_LOCALHOST=${remoteCandidates.some((entry) => isLocalApiHost(entry.apiHost))}`,
);
console.log(
  `OVERRIDE_FIRST=${overrideCandidates[0].apiHost} OVERRIDE_SOURCE=${overrideCandidates[0].source}`,
);
