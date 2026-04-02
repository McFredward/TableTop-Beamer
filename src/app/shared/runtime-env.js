(() => {
  const OUTPUT_ROLE_CONTROL = "control";
  // `/output/final` is now served by output-final.html and never boots this runtime.
  // Keep the legacy constant as an inert alias to avoid breaking older imports.
  const OUTPUT_ROLE_FINAL = "control";

  function resolveOutputRoleFromLocation() {
    return OUTPUT_ROLE_CONTROL;
  }

  function resolveLiveWebSocketUrl({ outputRole, locationLike = window.location } = {}) {
    const resolvedRole = outputRole || resolveOutputRoleFromLocation(locationLike);
    const protocol = locationLike?.protocol === "https:" ? "wss:" : "ws:";
    const host = locationLike?.host || window.location.host;
    return `${protocol}//${host}/api/live/ws?role=${encodeURIComponent(resolvedRole)}`;
  }

  window.TT_BEAMER_RUNTIME_ENV = {
    OUTPUT_ROLE_CONTROL,
    OUTPUT_ROLE_FINAL,
    resolveOutputRoleFromLocation,
    resolveLiveWebSocketUrl,
  };
})();
