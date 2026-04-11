(() => {
  const OUTPUT_ROLE_CONTROL = "control";
  const OUTPUT_ROLE_FINAL = "final-output";

  function resolveOutputRoleFromLocation(locationLike = window.location) {
    const pathname = locationLike?.pathname || "/";
    return pathname === "/output/final" || pathname.startsWith("/output/final/")
      ? OUTPUT_ROLE_FINAL
      : OUTPUT_ROLE_CONTROL;
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
