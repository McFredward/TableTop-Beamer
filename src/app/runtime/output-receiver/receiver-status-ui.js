// Phase 31 Plan 03 — Pi /output/ status UI module.
// Surfaces splash, reconnect banner, error overlay, diagnostic chip metrics.
// Implements D-D3 (status UIs only on Pi DOM), D-D4 (TT-Beamer splash),
// D-B4 (NEVER black screen — every disconnect path renders error UI),
// D-C4 (three-indicator disconnect detection: pc-failed, pc-disconnected,
// frame-stale, heartbeat-stale).
//
// Pure unit-testable: `evaluateDisconnect` has zero browser deps and is
// covered by test/ssr-receiver-disconnect-detection.test.mjs.

export const DISCONNECT_THRESHOLD_MS = 3000;
export const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Pure unit-testable: given the three D-C4 indicators, decide if the
 * receiver should consider itself disconnected. Returns reason codes that
 * the bootstrap surfaces in the reconnect banner / error overlay copy —
 * those strings are part of the user-visible D-B4 evidence chain.
 *
 * @param {object} input
 * @param {string} input.pcConnectionState - RTCPeerConnection.connectionState
 * @param {number} input.lastFrameAtMs - performance.now() of last requestVideoFrameCallback
 * @param {number} input.lastHeartbeatAtMs - performance.now() of last heartbeat WS message
 * @param {number} input.nowMs - performance.now()
 * @param {number} [input.thresholdMs=3000] - stale threshold
 * @returns {{disconnected: boolean, reasons: string[]}}
 */
export function evaluateDisconnect({
  pcConnectionState,
  lastFrameAtMs,
  lastHeartbeatAtMs,
  nowMs,
  thresholdMs = DISCONNECT_THRESHOLD_MS,
}) {
  const reasons = [];
  if (pcConnectionState === "failed") reasons.push("pc-failed");
  if (pcConnectionState === "disconnected") reasons.push("pc-disconnected");
  if (pcConnectionState === "closed") reasons.push("pc-closed");
  // Frame staleness only meaningful when PC is supposedly connected — a
  // disconnected PC already triggers via the explicit reason above.
  if (pcConnectionState === "connected" && nowMs - lastFrameAtMs > thresholdMs) {
    reasons.push("frame-stale");
  }
  if (nowMs - lastHeartbeatAtMs > thresholdMs) {
    reasons.push("heartbeat-stale");
  }
  return { disconnected: reasons.length > 0, reasons };
}

/**
 * Browser-only UI factory. Returns object that controls splash/banner/error
 * overlays and a polling-based diagnostic-chip updater. The chipEl arg is
 * the existing #output-status-chip element from index.html — Plan 03 keeps
 * that chip but switches its data source from local rAF/perf to received-fps
 * + connection-state + heartbeat-age (D-D3).
 *
 * @param {object} [opts]
 * @param {Document} [opts.document]
 * @param {Performance} [opts.performance]
 * @param {Element|null} [opts.chipEl]
 */
export function createStatusUi({
  document: doc = document,
  performance: perf = performance,
  chipEl = null,
} = {}) {
  const splashEl = doc.getElementById("ssr-splash");
  const splashStatusEl = doc.getElementById("ssr-splash-status");
  const videoEl = doc.getElementById("ssr-video");
  const reconnectEl = doc.getElementById("ssr-reconnect-banner");
  const errorEl = doc.getElementById("ssr-error-overlay");
  const errorBodyEl = doc.getElementById("ssr-error-body");
  const retryBtn = doc.getElementById("ssr-retry-button");

  function showSplash(text = "Connecting to render server…") {
    if (splashStatusEl) splashStatusEl.textContent = text;
    if (splashEl) splashEl.hidden = false;
    if (videoEl) videoEl.hidden = true;
  }
  function hideSplash() {
    if (splashEl) splashEl.hidden = true;
    if (videoEl) videoEl.hidden = false;
  }
  function showReconnect(text = "Server reconnecting…") {
    if (reconnectEl) {
      reconnectEl.textContent = text;
      reconnectEl.hidden = false;
    }
  }
  function hideReconnect() {
    if (reconnectEl) reconnectEl.hidden = true;
  }
  function showError(
    text = "The connection to the render server has been lost. Please retry.",
  ) {
    if (errorBodyEl) errorBodyEl.textContent = text;
    if (errorEl) errorEl.hidden = false;
  }
  function hideError() {
    if (errorEl) errorEl.hidden = true;
  }
  function onRetry(handler) {
    if (retryBtn && typeof handler === "function") {
      retryBtn.addEventListener("click", handler);
    }
  }

  // Diagnostic chip — D-D3. Renders received-fps · pc-state · frame-age ·
  // heartbeat-age. The chip always stays visible on Pi /output/ because
  // the operator needs an at-a-glance liveness signal even when the
  // primary <video> element is happy.
  function updateMetrics({
    receivedFps,
    pcConnectionState,
    lastFrameAgeMs,
    heartbeatAgeMs,
    ssrFps, // h8: SSR-tab's internal render fps (server-side rAF rate)
  }) {
    if (!chipEl) return;
    const piFpsStr =
      typeof receivedFps === "number" && Number.isFinite(receivedFps)
        ? `stream=${receivedFps.toFixed(0)}fps`
        : "stream=—fps";
    // h8: SSR fps is null until the first heartbeat arrives carrying it.
    const ssrFpsStr =
      typeof ssrFps === "number" && Number.isFinite(ssrFps)
        ? `ssr=${ssrFps.toFixed(0)}fps`
        : "ssr=—";
    const parts = [
      piFpsStr,
      ssrFpsStr,
      `pc=${pcConnectionState ?? "?"}`,
      `frame=${
        typeof lastFrameAgeMs === "number" && Number.isFinite(lastFrameAgeMs)
          ? Math.round(lastFrameAgeMs) + "ms"
          : "?"
      }`,
      `hb=${
        typeof heartbeatAgeMs === "number" && Number.isFinite(heartbeatAgeMs)
          ? Math.round(heartbeatAgeMs) + "ms"
          : "?"
      }`,
    ];
    chipEl.textContent = parts.join(" · ");
    chipEl.setAttribute("aria-hidden", "false");
  }

  return {
    showSplash,
    hideSplash,
    showReconnect,
    hideReconnect,
    showError,
    hideError,
    onRetry,
    updateMetrics,
  };
}
