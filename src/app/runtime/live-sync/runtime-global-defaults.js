// global defaults API + error/hint formatting module.
//
// Owns the global-defaults API facade singleton, fetchWithTimeout with
// abort-error translation, all API classification + host/routing
// helpers, human-readable error formatters, the file-download fallback,
// and the top-level load/save/apply glue (autoLoadGlobalDefaultsForFreshDevice,
// loadAndApplyGlobalDefaults).
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;
  let globalDefaultsApiFacade = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function buildGlobalDefaultsPayload() {
    const stateProfiles = ctx.buildBoardProfilesFromState();
    return {
      schema: "tt-beamer.global-defaults.v1",
      savedAt: new Date().toISOString(),
      source: "runtime-state",
      boardProfiles: stateProfiles,
      ...ctx.buildPersistedRuntimeSettingsFromState(),
    };
  }

  async function saveGlobalDefaultsToServer() {
    const payload = buildGlobalDefaultsPayload();
    return getGlobalDefaultsApiFacade().saveGlobalDefaults(payload);
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), ctx.API_REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw buildGlobalDefaultsSaveError({
          code: "API_UNREACHABLE",
          details: `timeout after ${ctx.API_REQUEST_TIMEOUT_MS}ms`,
          endpoint: url,
          method: options.method ?? "GET",
        });
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function getGlobalDefaultsApiFacade() {
    if (globalDefaultsApiFacade) {
      return globalDefaultsApiFacade;
    }
    globalDefaultsApiFacade = window.TT_BEAMER_API.createGlobalDefaultsApiFacade({
      apiBaseUrlParamKeys: ctx.API_BASE_URL_PARAM_KEYS,
      apiPortFallbacks: ctx.API_PORT_FALLBACKS,
      localApiHosts: ctx.LOCAL_API_HOSTS,
      requestTimeoutMs: ctx.API_REQUEST_TIMEOUT_MS,
      fetchWithTimeout,
      location: window.location,
    });
    return globalDefaultsApiFacade;
  }

  async function runApiPreflight(saveEndpoint) {
    return getGlobalDefaultsApiFacade().runApiPreflight(saveEndpoint);
  }

  function classifyHttpStatus(status) {
    return getGlobalDefaultsApiFacade().classifyHttpStatus(status);
  }

  function getApiBaseFromSaveEndpoint(saveEndpoint) {
    try {
      const url = new URL(saveEndpoint);
      return url.origin;
    } catch {
      return window.location?.origin || "http://127.0.0.1:4173";
    }
  }

  function resolveGlobalDefaultsApiCandidates() {
    return getGlobalDefaultsApiFacade().resolveGlobalDefaultsApiCandidates();
  }

  function readConfiguredApiBase() {
    const globalBase = normalizeApiBase(window.__TT_BEAMER_API_BASE__);
    if (globalBase) {
      return {
        base: globalBase,
        source: "override:window.__TT_BEAMER_API_BASE__",
      };
    }
    const queryBase = readApiBaseFromQuery();
    if (queryBase) {
      return queryBase;
    }
    return null;
  }

  function readApiBaseFromQuery() {
    try {
      const params = new URLSearchParams(window.location?.search || "");
      for (const key of ctx.API_BASE_URL_PARAM_KEYS) {
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

  function normalizeApiBase(value) {
    return getGlobalDefaultsApiFacade().normalizeApiBase(value);
  }

  function getUiHostName() {
    try {
      return String(window.location?.hostname || "").toLowerCase();
    } catch {
      return "";
    }
  }

  function getUiProtocol() {
    const protocol = String(window.location?.protocol || "http:").toLowerCase();
    return protocol === "https:" ? "https:" : "http:";
  }

  function isLocalApiHost(hostname) {
    if (!hostname) {
      return false;
    }
    const normalized = String(hostname).toLowerCase();
    return ctx.LOCAL_API_HOSTS.has(normalized) || normalized.startsWith("127.");
  }

  function classifyFailedSaveResponse(response, details) {
    return getGlobalDefaultsApiFacade().classifyFailedSaveResponse(response, details);
  }

  function classifyFailedHealthResponse(response, details) {
    if (isStaticOnlyHealthResponse(response, details)) {
      return "STATIC_ONLY_SERVER";
    }
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const body = String(details || "").toLowerCase();
    if (contentType.includes("text/html") || body.includes("<html") || body.includes("<!doctype")) {
      return "API_HTML_ERROR";
    }
    if (response.status >= 500) {
      return "API_SERVER_ERROR";
    }
    return "API_HEALTH_FAILED";
  }

  function isStaticOnlyHealthResponse(response, details) {
    const status = Number(response?.status);
    if (status !== 404) {
      return false;
    }
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const serverHeader = String(response.headers.get("server") || "").toLowerCase();
    const body = String(details || "").toLowerCase();
    const headerSignals =
      serverHeader.includes("simplehttp") ||
      serverHeader.includes("python") ||
      serverHeader.includes("http.server") ||
      serverHeader.includes("static") ||
      serverHeader.includes("file");
    const bodySignals =
      body.includes("error response") ||
      body.includes("error code: 404") ||
      body.includes("file not found") ||
      body.includes("directory listing") ||
      body.includes("/api/health") ||
      body.includes("cannot get /api/health") ||
      body.includes("not found");
    return headerSignals || (contentType.includes("text/html") && bodySignals);
  }

  function buildGlobalDefaultsSaveError({
    code,
    status = null,
    statusClass = "n/a",
    details = "",
    endpoint = "",
    method = "POST",
    routing = null,
  }) {
    return getGlobalDefaultsApiFacade().buildGlobalDefaultsSaveError({
      code,
      status,
      statusClass,
      details,
      endpoint,
      method,
      routing,
    });
  }

  function getApiHostName(base) {
    try {
      return String(new URL(base).hostname || "").toLowerCase();
    } catch {
      return "";
    }
  }

  function formatGlobalDefaultsSaveError(error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN";
    const endpoint =
      error && typeof error === "object" && "endpoint" in error ? String(error.endpoint || "") : "unknown";
    const method =
      error && typeof error === "object" && "method" in error ? String(error.method || "POST") : "POST";
    const status = error && typeof error === "object" && "status" in error ? error.status : null;
    const statusClass =
      error && typeof error === "object" && "statusClass" in error
        ? String(error.statusClass || classifyHttpStatus(status))
        : classifyHttpStatus(status);
    const routing = error && typeof error === "object" && "routing" in error ? error.routing : null;
    const snapshot = buildResolveSnapshot({ routing, endpoint, method });
    const endpointMeta = `${method} ${endpoint} | Status ${status ?? "n/a"} (${statusClass})`;
    const startHint = buildGuidedFixHint({ routing, endpoint });
    const hostMeta = formatResolveSnapshot(snapshot);
    if (code === "STATIC_ONLY_SERVER") {
      return {
        statusText: `Save blocked - static-only server active, save not possible (${hostMeta}; ${endpointMeta}).`,
        feedbackText:
          `Status: Static-only server active, save not possible (${hostMeta}; ${endpointMeta}). ${startHint}`,
        diagnoseStatusText: `API diagnostics: static-only server active, save not possible (${hostMeta}; ${endpointMeta})`,
      };
    }
    if (
      code === "API_UNREACHABLE" ||
      code === "API_HTML_ERROR" ||
      code === "API_METHOD_UNAVAILABLE" ||
      code === "API_HEALTH_FAILED"
    ) {
      return {
        statusText: `Save failed - API endpoint is not save-capable (${hostMeta}; ${endpointMeta}).`,
        feedbackText: `Status: API for global defaults is not available (${hostMeta}; ${endpointMeta}). ${startHint}`,
        diagnoseStatusText: `API diagnostics: API endpoint is not save-capable (${hostMeta}; ${endpointMeta})`,
      };
    }
    if (code === "API_SERVER_ERROR") {
      return {
        statusText: `Save failed - API server error (${hostMeta}; ${endpointMeta}).`,
        feedbackText: `Status: API server did not process the save request (${hostMeta}; ${endpointMeta}).`,
        diagnoseStatusText: `API diagnostics: API server error (${hostMeta}; ${endpointMeta})`,
      };
    }
    return {
      statusText: `Save failed - please check the save setup (${hostMeta}; ${endpointMeta}).`,
      feedbackText: `Status: Save failed (${hostMeta}; ${endpointMeta}). ${startHint}`,
      diagnoseStatusText: `API diagnostics: failed (${hostMeta}; ${endpointMeta})`,
    };
  }

  function formatResolverSourceLabel(source) {
    return source || "unknown";
  }

  function buildResolveSnapshot({ routing = null, endpoint = "", method = "POST" } = {}) {
    return {
      uiHost: routing?.uiHost || getUiHostName() || "unknown",
      apiHost: routing?.apiHost || getApiHostName(getApiBaseFromSaveEndpoint(endpoint)) || "unknown",
      source: formatResolverSourceLabel(routing?.source),
      endpoint,
      method,
    };
  }

  function formatResolveSnapshot(snapshot) {
    if (!snapshot) {
      return "UI host unknown -> API host unknown | Source unknown | Endpoint unknown";
    }
    return `UI host ${snapshot.uiHost} -> API host ${snapshot.apiHost} | Source ${snapshot.source} | Endpoint ${snapshot.method} ${snapshot.endpoint}`;
  }

  function formatHostFlow(routing) {
    const uiHost = routing?.uiHost || getUiHostName() || "unknown";
    const apiHost = routing?.apiHost || "unknown";
    return `UI host ${uiHost} -> API host ${apiHost}`;
  }

  function getRemoteMismatchHint(routing) {
    const uiHost = routing?.uiHost || getUiHostName();
    const apiHost = routing?.apiHost || "";
    if (!uiHost || !apiHost) {
      return null;
    }
    if (!isLocalApiHost(uiHost) && isLocalApiHost(apiHost)) {
      return "Remote/LAN hint: UI is running remotely, but API points to localhost. Set ?ttApiBase=http://<SERVER-IP>:4173 or open the UI directly from the server host.";
    }
    return null;
  }

  function buildGuidedFixHint({ routing, endpoint } = {}) {
    const port = getEndpointPort(endpoint);
    const uiHost = routing?.uiHost || getUiHostName() || "<SERVER-IP>";
    const apiHost = routing?.apiHost || uiHost;
    const remoteHint = getRemoteMismatchHint(routing);
    const serverStartCmd = `node server.mjs --host 0.0.0.0 --port ${port}`;
    const envStartCmd = `HOST=0.0.0.0 PORT=${port} node server.mjs`;
    const verifyUrl = `http://${apiHost}:${port}`;
    const uiUrl = `http://${uiHost}:${port}`;
    const baseHint =
      `Next steps (headless/LAN): stop \`python3 -m http.server ${port}\` if running (static-only) and start \`${serverStartCmd}\` ` +
      `(alternative: \`${envStartCmd}\`). Then verify API at ${verifyUrl}/api/health and open the UI at ${uiUrl}.`;
    return remoteHint ? `${baseHint} ${remoteHint}` : baseHint;
  }

  function getEndpointPort(endpoint) {
    try {
      const parsed = new URL(endpoint);
      if (parsed.port) {
        return Number(parsed.port) || 4173;
      }
      return parsed.protocol === "https:" ? 443 : 80;
    } catch {
      return 4173;
    }
  }

  function downloadGlobalDefaultsFallback() {
    const payload = buildGlobalDefaultsPayload();
    const stamp = payload.savedAt.replace(/[.:]/g, "-");
    const fileName = `global-defaults-download-export-${stamp}.json`;
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return fileName;
  }

  function hasStoredBoardProfilesInLocalStorage() {
    return false;
  }

  function listGlobalDefaultsLoadCandidates() {
    const seen = new Set();
    const candidates = [];

    function addCandidate(endpoint, source, routing = null) {
      if (!endpoint || seen.has(endpoint)) {
        return;
      }
      seen.add(endpoint);
      candidates.push({ endpoint, source, routing });
    }

    for (const candidate of resolveGlobalDefaultsApiCandidates()) {
      addCandidate(candidate.endpoint, candidate.source, candidate);
    }

    const origin = window.location?.origin;
    if (origin) {
      addCandidate(`${origin}/config/global-defaults.json`, "static:ui-origin-config");
    }
    addCandidate("/config/global-defaults.json", "static:relative-config");

    return candidates;
  }

  async function fetchGlobalDefaultsPayload() {
    return getGlobalDefaultsApiFacade().fetchGlobalDefaultsPayload();
  }

  function applyGlobalDefaultsPayloadToState(payload) {
    const state = ctx.state;
    const boardCandidate = ctx.extractBoardProfilesCandidate(payload);
    if (boardCandidate) {
      const migratedProfiles = ctx.buildMigratedBoardProfiles(
        boardCandidate,
        state.hitareaCalibrationByBoard,
        state.roomGeometryByBoard,
        state.specialPolygonsByBoard,
      );
      const canonicalIssues = ctx.collectCanonicalPlayAreaIssuesFromProfiles(boardCandidate, {
        sourceLabel: "global-defaults",
      });
      ctx.applyBoardProfilesToState(migratedProfiles);
      ctx.reportCanonicalPolygonIssues(canonicalIssues, {
        sourceLabel: "global-defaults",
      });
    }

    if (payload?.audio && typeof payload.audio === "object") {
      state.audio.enabled = Boolean(payload.audio.enabled);
      const nextVolume = Number(payload.audio.volume);
      if (Number.isFinite(nextVolume)) {
        state.audio.volume = window.TT_BEAMER_RUNTIME_UTILS.clamp01(nextVolume);
      }
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, "animationSpeed")) {
      state.animationSpeed = ctx.clampAnimationSpeed(payload.animationSpeed);
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, "animationSoundMap")) {
      state.animationSoundMap = ctx.normalizeAnimationSoundMap(payload.animationSoundMap);
    }
  }

  async function autoLoadGlobalDefaultsForFreshDevice({ force = false } = {}) {
    if (!force && hasStoredBoardProfilesInLocalStorage()) {
      return {
        attempted: false,
        applied: false,
        reason: "local-profiles-present",
      };
    }

    const loaded = await fetchGlobalDefaultsPayload();
    applyGlobalDefaultsPayloadToState(loaded.payload);
    const persisted = ctx.persistBoardProfiles();
    return {
      attempted: true,
      applied: true,
      persisted,
      source: loaded.source,
      endpoint: loaded.endpoint,
      routing: loaded.routing,
    };
  }

  async function loadAndApplyGlobalDefaults({ sourceLabel = "manual" } = {}) {
    const loaded = await fetchGlobalDefaultsPayload();
    applyGlobalDefaultsPayloadToState(loaded.payload);
    const persisted = ctx.persistBoardProfiles();
    ctx.syncRuntimePanelsFromState();
    ctx.renderRunningAnimationsList();
    ctx.refreshGlobalButtons();

    const snapshot = buildResolveSnapshot({
      routing: loaded.routing,
      endpoint: loaded.endpoint,
      method: "GET",
    });
    if (ctx.globalDefaultsStatus) {
      ctx.globalDefaultsStatus.textContent =
        `Global Defaults: loaded & applied (${formatResolveSnapshot(snapshot)} | Source ${sourceLabel})`;
    }
    if (ctx.apiDiagnoseStatus) {
      ctx.apiDiagnoseStatus.textContent =
        `API diagnostics: OK (${formatResolveSnapshot(snapshot)} | GET /api/global-defaults or config/global-defaults.json)`;
    }
    ctx.triggerFeedback.textContent =
      `Status: Defaults loaded & applied (${formatResolveSnapshot(snapshot)} | ${sourceLabel})`;

    return {
      snapshot,
      persisted,
      endpoint: loaded.endpoint,
      routing: loaded.routing,
    };
  }

  window.TT_BEAMER_RUNTIME_GLOBAL_DEFAULTS = {
    init,
    buildGlobalDefaultsPayload,
    saveGlobalDefaultsToServer,
    fetchWithTimeout,
    getGlobalDefaultsApiFacade,
    runApiPreflight,
    classifyHttpStatus,
    getApiBaseFromSaveEndpoint,
    resolveGlobalDefaultsApiCandidates,
    readConfiguredApiBase,
    readApiBaseFromQuery,
    normalizeApiBase,
    getUiHostName,
    getUiProtocol,
    isLocalApiHost,
    classifyFailedSaveResponse,
    classifyFailedHealthResponse,
    isStaticOnlyHealthResponse,
    buildGlobalDefaultsSaveError,
    getApiHostName,
    formatGlobalDefaultsSaveError,
    formatResolverSourceLabel,
    buildResolveSnapshot,
    formatResolveSnapshot,
    formatHostFlow,
    getRemoteMismatchHint,
    buildGuidedFixHint,
    getEndpointPort,
    downloadGlobalDefaultsFallback,
    hasStoredBoardProfilesInLocalStorage,
    listGlobalDefaultsLoadCandidates,
    fetchGlobalDefaultsPayload,
    applyGlobalDefaultsPayloadToState,
    autoLoadGlobalDefaultsForFreshDevice,
    loadAndApplyGlobalDefaults,
  };
})();
