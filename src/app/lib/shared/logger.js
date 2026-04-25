(() => {
  const LEVELS = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
  };

  function resolveMinLevel() {
    const explicit = String(window.__TT_BEAMER_LOG_LEVEL__ || "").trim().toLowerCase();
    if (LEVELS[explicit]) {
      return explicit;
    }
    // Log level override moved from localStorage to URL query param.
    try {
      const params = new URLSearchParams(window.location?.search || "");
      const queryLevel = String(params.get("logLevel") || "").trim().toLowerCase();
      if (LEVELS[queryLevel]) {
        return queryLevel;
      }
    } catch {
      // ignore URL parse failures
    }
    return "warn";
  }

  function shouldLog(level) {
    return LEVELS[level] >= LEVELS[resolveMinLevel()];
  }

  function emit(level, payload) {
    const message = JSON.stringify(payload);
    if (level === "error") {
      console.error(message);
      return;
    }
    if (level === "warn") {
      console.warn(message);
      return;
    }
    if (level === "info") {
      console.info(message);
      return;
    }
    console.debug(message);
  }

  function createLogger(scope, defaults = {}) {
    function log(level, event, meta = {}) {
      if (!shouldLog(level)) {
        return;
      }
      emit(level, {
        ts: new Date().toISOString(),
        level,
        scope,
        event,
        ...defaults,
        ...meta,
      });
    }
    return {
      debug(event, meta) {
        log("debug", event, meta);
      },
      info(event, meta) {
        log("info", event, meta);
      },
      warn(event, meta) {
        log("warn", event, meta);
      },
      error(event, meta) {
        log("error", event, meta);
      },
    };
  }

  window.TT_BEAMER_LOGGER = {
    createLogger,
  };
})();
