// Global-defaults HTTP API facade. Wraps fetch with timeout + base-URL
// discovery for the persisted-config endpoints. Pure transport — no
// state, no caching; consumers (runtime-global-defaults) handle merge
// + persistence.

(() => {
  function createGlobalDefaultsApiFacade({
    apiBaseUrlParamKeys,
    apiPortFallbacks,
    localApiHosts,
    requestTimeoutMs,
    fetchWithTimeout,
    location,
  }) {
    // localStorage-backed apiBase override removed. Overrides
    // are now resolved from `window.__TT_BEAMER_API_BASE__` or a URL query
    // parameter only — no browser persistent storage.
    function classifyHttpStatus(status) {
      if (!Number.isFinite(Number(status))) {
        return "n/a";
      }
      return `${Math.floor(Number(status) / 100)}xx`;
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

    function getApiBaseFromSaveEndpoint(saveEndpoint) {
      try {
        return new URL(saveEndpoint).origin;
      } catch {
        return location?.origin || "http://127.0.0.1:4173";
      }
    }

    function getUiHostName() {
      try {
        return String(location?.hostname || "").toLowerCase();
      } catch {
        return "";
      }
    }

    function getUiProtocol() {
      const protocol = String(location?.protocol || "http:").toLowerCase();
      return protocol === "https:" ? "https:" : "http:";
    }

    function getApiHostName(base) {
      try {
        return String(new URL(base).hostname || "").toLowerCase();
      } catch {
        return "";
      }
    }

    function isLocalApiHost(hostname) {
      if (!hostname) {
        return false;
      }
      const normalized = String(hostname).toLowerCase();
      return localApiHosts.has(normalized) || normalized.startsWith("127.");
    }

    function readApiBaseFromQuery() {
      try {
        const params = new URLSearchParams(location?.search || "");
        for (const key of apiBaseUrlParamKeys) {
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

      // No localStorage fallback. If no window global or URL
      // query param is set, we fall through to the UI origin.
      return null;
    }

    function resolveGlobalDefaultsApiCandidates() {
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
          uiHost: getUiHostName(),
          apiHost: getApiHostName(normalized),
        });
      }

      const configured = readConfiguredApiBase();
      if (configured) {
        addEndpoint(configured.base, configured.source);
      }

      addEndpoint(location?.origin, "ui-host-default");

      const uiHost = getUiHostName();
      const uiProtocol = getUiProtocol();
      const fallbackHost = uiHost || "localhost";
      const allowLocalhostFallback = !uiHost || isLocalApiHost(uiHost);

      for (const port of apiPortFallbacks) {
        addEndpoint(`${uiProtocol}//${fallbackHost}:${port}`, `fallback:${fallbackHost}:${port}`);
      }

      if (allowLocalhostFallback) {
        addEndpoint("http://localhost:4173", "fallback:localhost:4173");
        addEndpoint("http://127.0.0.1:4173", "fallback:127.0.0.1:4173");
      }

      return endpoints;
    }

    function classifyFailedSaveResponse(response, details) {
      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      const body = String(details || "").toLowerCase();
      if (response.status === 405 || response.status === 501) {
        return "API_METHOD_UNAVAILABLE";
      }
      if (contentType.includes("text/html") || body.includes("<html") || body.includes("<!doctype")) {
        return "API_HTML_ERROR";
      }
      if (response.status >= 500) {
        return "API_SERVER_ERROR";
      }
      return "API_REQUEST_FAILED";
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

    function buildGlobalDefaultsSaveError({
      code,
      status = null,
      statusClass = "n/a",
      details = "",
      endpoint = "",
      method = "POST",
      routing = null,
    }) {
      const error = new Error(`Global Defaults save failed (${code})`);
      error.code = code;
      error.status = status;
      error.statusClass = statusClass;
      error.details = details;
      error.endpoint = endpoint;
      error.method = method;
      error.routing = routing;
      return error;
    }

    async function runApiPreflight(saveEndpoint) {
      const healthEndpoint = `${getApiBaseFromSaveEndpoint(saveEndpoint)}/api/health`;
      try {
        const healthResponse = await fetchWithTimeout(healthEndpoint, {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        });
        if (!healthResponse.ok) {
          const details = await healthResponse.text();
          return {
            ok: false,
            code: classifyFailedHealthResponse(healthResponse, details),
            method: "GET",
            status: healthResponse.status,
            details,
          };
        }
      } catch (error) {
        return {
          ok: false,
          code: "API_UNREACHABLE",
          method: "GET",
          status: null,
          details: error instanceof Error ? error.message : "health request failed",
        };
      }

      try {
        const optionsResponse = await fetchWithTimeout(saveEndpoint, {
          method: "OPTIONS",
        });
        if (!optionsResponse.ok) {
          const details = await optionsResponse.text();
          return {
            ok: false,
            code: classifyFailedSaveResponse(optionsResponse, details),
            method: "OPTIONS",
            status: optionsResponse.status,
            details,
          };
        }
        const allowHeader = String(optionsResponse.headers.get("allow") || "").toUpperCase();
        if (allowHeader && !allowHeader.split(",").map((entry) => entry.trim()).includes("POST")) {
          return {
            ok: false,
            code: "API_METHOD_UNAVAILABLE",
            method: "OPTIONS",
            status: optionsResponse.status,
            details: `allow=${allowHeader}`,
          };
        }
      } catch (error) {
        return {
          ok: false,
          code: "API_UNREACHABLE",
          method: "OPTIONS",
          status: null,
          details: error instanceof Error ? error.message : "options request failed",
        };
      }

      return {
        ok: true,
        code: "OK",
        method: "OPTIONS",
        status: 200,
        details: "preflight ok",
      };
    }

    async function saveGlobalDefaults(payload) {
      const apiCandidates = resolveGlobalDefaultsApiCandidates();
      const requestBody = JSON.stringify(payload);
      let lastError = null;

      for (const candidate of apiCandidates) {
        const endpoint = candidate.endpoint;
        const preflight = await runApiPreflight(endpoint);
        if (!preflight.ok) {
          lastError = buildGlobalDefaultsSaveError({
            code: preflight.code,
            status: preflight.status,
            statusClass: classifyHttpStatus(preflight.status),
            details: preflight.details,
            endpoint,
            method: preflight.method,
            routing: candidate,
          });
          continue;
        }

        try {
          const response = await fetchWithTimeout(endpoint, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: requestBody,
          });

          if (!response.ok) {
            const details = await response.text();
            lastError = buildGlobalDefaultsSaveError({
              code: classifyFailedSaveResponse(response, details),
              status: response.status,
              statusClass: classifyHttpStatus(response.status),
              details,
              endpoint,
              method: "POST",
              routing: candidate,
            });
            continue;
          }

          const result = await response.json();
          return {
            savedAt: result?.savedAt ?? payload.savedAt,
            target: result?.target ?? "config/global-defaults.json",
            endpoint,
            method: "POST",
            status: response.status,
            statusClass: classifyHttpStatus(response.status),
            routing: candidate,
          };
        } catch (error) {
          lastError =
            error instanceof Error && "code" in error
              ? error
              : buildGlobalDefaultsSaveError({
                  code: "API_UNREACHABLE",
                  details: error instanceof Error ? error.message : "request failed",
                  endpoint,
                  method: "POST",
                  routing: candidate,
                });
        }
      }

      if (lastError instanceof Error) {
        throw lastError;
      }
      throw new Error("Global Defaults save failed");
    }

    async function fetchGlobalDefaultsPayload() {
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

      const origin = location?.origin;
      if (origin) {
        addCandidate(`${origin}/config/global-defaults.json`, "static:ui-origin-config");
      }
      addCandidate("/config/global-defaults.json", "static:relative-config");

      let lastError = null;
      for (const candidate of candidates) {
        try {
          const response = await fetchWithTimeout(candidate.endpoint, {
            method: "GET",
            headers: {
              accept: "application/json",
            },
          });
          if (!response.ok) {
            lastError = buildGlobalDefaultsSaveError({
              code: "API_REQUEST_FAILED",
              status: response.status,
              statusClass: classifyHttpStatus(response.status),
              endpoint: candidate.endpoint,
              method: "GET",
              routing: candidate.routing,
            });
            continue;
          }
          const payload = await response.json();
          if (!payload || typeof payload !== "object") {
            continue;
          }
          return {
            payload,
            endpoint: candidate.endpoint,
            source: candidate.source,
            routing: candidate.routing,
          };
        } catch (error) {
          lastError =
            error instanceof Error && "code" in error
              ? error
              : buildGlobalDefaultsSaveError({
                  code: "API_UNREACHABLE",
                  details: error instanceof Error ? error.message : "defaults load failed",
                  endpoint: candidate.endpoint,
                  method: "GET",
                  routing: candidate.routing,
                });
        }
      }

      if (lastError instanceof Error) {
        throw lastError;
      }

      throw buildGlobalDefaultsSaveError({
        code: "API_REQUEST_FAILED",
        details: "no defaults endpoint reachable",
        endpoint: "n/a",
        method: "GET",
      });
    }

    return {
      classifyHttpStatus,
      normalizeApiBase,
      getApiBaseFromSaveEndpoint,
      getUiHostName,
      getApiHostName,
      isLocalApiHost,
      classifyFailedSaveResponse,
      classifyFailedHealthResponse,
      buildGlobalDefaultsSaveError,
      runApiPreflight,
      resolveGlobalDefaultsApiCandidates,
      saveGlobalDefaults,
      fetchGlobalDefaultsPayload,
      requestTimeoutMs,
    };
  }

  window.TT_BEAMER_API = {
    createGlobalDefaultsApiFacade,
  };
})();
