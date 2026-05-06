// Phase-31 h15 — pure, testable fetch-with-abort-and-retry helper.
//
// Why this exists:
//   The h14 global GIF fetch mutex was actively HARMFUL: when one fetch
//   hung (Chromium-under-Xvfb broken-keep-alive deadlock observed in the
//   SSR Chromium tab), the mutex never released and EVERY subsequent
//   fetch blocked forever — one stalled GIF cascaded into all GIFs
//   missing. This helper replaces the mutex with per-fetch
//   AbortController + timeout + bounded retry, so a single stalled
//   socket can never cascade.
//
// Design notes:
//   - Hardware-agnostic: no branches on environment. Works the same on
//     dashboard, Pi-direct /output/, SSR Chromium tab, future receivers.
//   - Pairs with server-side `Connection: close` on /resources/animations/*
//     (server.mjs handleStaticFile + src/server/static-resource-headers.mjs)
//     which prevents the broken-keep-alive condition in the first place.
//     The client-side abort+retry is the second line of defense.
//   - All timing/abort dependencies are injectable so the function can
//     be exercised in pure node tests via readFileSync + eval (the
//     IIFE-with-eval pattern established by runtime-env.js).
//
// Loaded in the browser via:
//   <script src="/src/app/lib/shared/fetch-with-retry.js" defer></script>
// before runtime-gif-playback.js. Exposes:
//   window.TT_BEAMER_FETCH_WITH_RETRY = { fetchWithAbortAndRetry }

(() => {
  /**
   * @param {object} args
   * @param {string} args.url
   * @param {RequestInit} [args.init]
   * @param {number} [args.timeoutMs=4000] - per-attempt timeout
   * @param {number} [args.maxAttempts=2]  - total attempts (1 = no retry)
   * @param {(event: string, payload: object) => void} [args.onProbe]
   * @param {typeof fetch} [args.fetchImpl]
   * @param {typeof AbortController} [args.AbortControllerImpl]
   * @param {typeof setTimeout} [args.setTimeoutImpl]
   * @param {typeof clearTimeout} [args.clearTimeoutImpl]
   * @returns {Promise<Response>}
   */
  async function fetchWithAbortAndRetry({
    url,
    init = {},
    timeoutMs = 4000,
    maxAttempts = 2,
    onProbe,
    fetchImpl = (typeof fetch !== "undefined" ? fetch : undefined),
    AbortControllerImpl = (typeof AbortController !== "undefined" ? AbortController : undefined),
    setTimeoutImpl = (typeof setTimeout !== "undefined" ? setTimeout : undefined),
    clearTimeoutImpl = (typeof clearTimeout !== "undefined" ? clearTimeout : undefined),
  } = {}) {
    if (typeof fetchImpl !== "function") {
      throw new Error("fetchWithAbortAndRetry: fetchImpl is required");
    }
    if (typeof AbortControllerImpl !== "function") {
      throw new Error("fetchWithAbortAndRetry: AbortControllerImpl is required");
    }

    let lastErr = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortControllerImpl();
      const timer = setTimeoutImpl(
        () => controller.abort("fetch-timeout"),
        timeoutMs,
      );
      try {
        const response = await fetchImpl(url, { ...init, signal: controller.signal });
        clearTimeoutImpl(timer);
        return response;
      } catch (err) {
        clearTimeoutImpl(timer);
        const isAbort =
          err?.name === "AbortError" || /timeout|aborted/i.test(String(err?.message || ""));
        if (typeof onProbe === "function") {
          try {
            onProbe("fetch-attempt-failed", {
              attempt,
              aborted: isAbort,
              err: String(err?.message || err).slice(0, 80),
            });
          } catch (_probeErr) { /* never let probes break fetch */ }
        }
        lastErr = err;
      }
    }
    throw lastErr || new Error("fetch-with-retry: all attempts failed");
  }

  if (typeof window !== "undefined") {
    window.TT_BEAMER_FETCH_WITH_RETRY = { fetchWithAbortAndRetry };
  }
})();
