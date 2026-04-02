(() => {
  const logBootstrap =
    window.TT_BEAMER_LOGGER?.createLogger?.("bootstrap", { source: "app-shell" }) ??
    (() => ({ info() {}, warn() {}, error() {} }))();

  const requiredDomains = [
    "TT_BEAMER_EDITOR_FLOWS",
    "TT_BEAMER_SYNC_HANDLERS",
    "TT_BEAMER_SETTINGS_CONTROLLERS",
    "TT_BEAMER_MEDIA_HANDLERS",
    "TT_BEAMER_RUNTIME_PANELS",
  ];

  const missing = requiredDomains.filter((domainKey) => !window[domainKey]);
  if (missing.length > 0) {
    logBootstrap.warn("domain-modules-missing", {
      scope: "bootstrap",
      event: "domain-modules-missing",
      missing,
    });
  }

  logBootstrap.info("bootstrap-shell-ready", {
    scope: "bootstrap",
    event: "bootstrap-shell-ready",
    domainsLoaded: requiredDomains.length - missing.length,
  });
})();
