// Runtime-env constants. Output role detection - CONTROL vs FINAL -
// plus the OUTPUT_ROLE_FINAL string constant used by orchestration
// to gate output-only behaviour.

(() => {
  const OUTPUT_ROLE_CONTROL = "control";
  const OUTPUT_ROLE_FINAL = "final-output";

  function resolveOutputRoleFromLocation(locationLike = window.location) {
    const pathname = locationLike?.pathname || "/";
    if (pathname === "/output/final" || pathname.startsWith("/output/final/")) {
      return OUTPUT_ROLE_FINAL;
    }
    if (pathname === "/output" || pathname.startsWith("/output/")) {
      return OUTPUT_ROLE_FINAL;
    }
    return OUTPUT_ROLE_CONTROL;
  }

  function resolveLiveWebSocketUrl({ outputRole, locationLike = window.location } = {}) {
    const resolvedRole = outputRole || resolveOutputRoleFromLocation(locationLike);
    const protocol = locationLike?.protocol === "https:" ? "wss:" : "ws:";
    const host = locationLike?.host || window.location.host;
    return `${protocol}//${host}/api/live/ws?role=${encodeURIComponent(resolvedRole)}`;
  }

  /**
   * Phase 31 Plan 05 — runtime-environment classification used by Phase-30
   * hotfix gates. See `.planning/phases/phase-31/31-HOTFIX-AUDIT.md` for
   * the full classification of which hotfixes are Pi-only vs server-keep.
   *
   * Three classifications:
   *   - "server-ssr"  — the SSR Chromium tab on the server (URL has ?ssr=1)
   *   - "pi"          — Pi /output/ in receiver mode, OR ARM hardware
   *                     defense-in-depth fallback even with ?ssr=1
   *   - "desktop"     — dashboard / control role on operator workstation
   *
   * ARM-UA defense-in-depth: a Pi 4 (`armv7l|armv8|aarch64`) cannot
   * legitimately produce ?ssr=1 because the SSR tab is server-spawned on
   * x86_64 hardware (RESEARCH.md § Q1). If we ever see ARM UA we clamp
   * to "pi" regardless of URL — the worst case is a defensive Pi-class
   * code path running on an ARM machine that doesn't need it (no quality
   * regression beyond Phase-30 baseline).
   *
   * @param {object} [opts]
   * @param {{pathname:string,search:string}} [opts.location]
   * @param {string} [opts.userAgent]
   * @returns {"pi"|"server-ssr"|"desktop"}
   */
  function getRuntimeEnvironment({ location: loc, userAgent: ua } = {}) {
    const safeLoc = loc ?? (typeof window !== "undefined" ? window.location : { pathname: "/", search: "" });
    const safeUa = typeof ua === "string"
      ? ua
      : (typeof navigator !== "undefined" && typeof navigator.userAgent === "string"
        ? navigator.userAgent
        : "");
    if (safeUa && /armv7l|armv8|aarch64/i.test(safeUa)) {
      return "pi";
    }
    const search = safeLoc?.search ?? "";
    const pathname = safeLoc?.pathname ?? "/";
    const isSsr = /[?&]ssr=1(\b|&)/.test(search);
    const isOutput =
      pathname === "/output" ||
      pathname === "/output/" ||
      pathname.startsWith("/output/");
    if (isSsr) return "server-ssr";
    if (isOutput) return "pi";
    return "desktop";
  }

  window.TT_BEAMER_RUNTIME_ENV = {
    OUTPUT_ROLE_CONTROL,
    OUTPUT_ROLE_FINAL,
    resolveOutputRoleFromLocation,
    resolveLiveWebSocketUrl,
    getRuntimeEnvironment,
  };
})();
