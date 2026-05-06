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

  // h17: pure formatter — extracted so the rich multi-line chip output
  // can be unit-tested without a DOM.
  function formatDiagnosticOverlay({
    receivedFps,
    pcConnectionState,
    lastFrameAgeMs,
    heartbeatAgeMs,
    ssrFps,
    ssrStats,
    serverInfo,
    rtcStats,
    rtcStatsPrev,
    videoW,
    videoH,
    videoDropped,
    videoTotal,
    reconnectAttempts,
  } = {}) {
    const fmtFps = (v) =>
      typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(0)}fps` : "—fps";
    const fmtMs = (v) =>
      typeof v === "number" && Number.isFinite(v) ? `${Math.round(v)}ms` : "?";
    const fmtN = (v, dp = 0) =>
      typeof v === "number" && Number.isFinite(v) ? v.toFixed(dp) : "?";
    const fmtBitrate = (bps) => {
      if (typeof bps !== "number" || !Number.isFinite(bps) || bps <= 0) return "?";
      if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)}Mbps`;
      if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)}kbps`;
      return `${Math.round(bps)}bps`;
    };

    // Per-second rates from rtc stats diff (frames/packets/bytes).
    const pktLossPctPart = (() => {
      const inb = rtcStats?.inbound;
      if (!inb) return "?";
      const totalRcvLost = inb.packetsReceived + inb.packetsLost;
      if (!totalRcvLost) return "0%";
      return `${((inb.packetsLost / totalRcvLost) * 100).toFixed(1)}%`;
    })();

    const stream = rtcStats?.inbound;
    const codec = (rtcStats?.codec || "").replace(/^video\//, "");
    const decoderImpl = rtcStats?.decoderImplementation || "?";
    const rtt = rtcStats?.candidatePair?.rtt;
    const rttMs = typeof rtt === "number" ? Math.round(rtt * 1000) : null;
    const jitterMs = typeof stream?.jitter === "number"
      ? Math.round(stream.jitter * 1000) : null;
    const availBitrate = rtcStats?.candidatePair?.availableIncomingBitrate;

    const dropFracPart = (() => {
      if (!stream || !stream.framesDecoded) {
        if (videoTotal && videoDropped) {
          return `${videoDropped}/${videoTotal}`;
        }
        return "0/0";
      }
      return `${stream.framesDropped}/${stream.framesDecoded}`;
    })();

    // Stream resolution: prefer rtcStats (always fresh from sender),
    // fall back to videoEl dims.
    const streamW = stream?.frameWidth || videoW || 0;
    const streamH = stream?.frameHeight || videoH || 0;
    const streamRes = streamW > 0 && streamH > 0
      ? `${streamW}x${streamH}`
      : "?";

    // SSR (server-render) info from heartbeat.
    const ssrFpsStr = fmtFps(ssrFps);
    const ssrW = ssrStats?.outputW || 0;
    const ssrH = ssrStats?.outputH || 0;
    const ssrRes = ssrW > 0 && ssrH > 0 ? `${ssrW}x${ssrH}` : "?";
    const ssrDecoder = ssrStats?.lastDecodeVia || "?";
    const ssrRenderer = ssrStats?.webglRenderer || "?";
    const board = ssrStats?.boardId || "?";
    const activeAnims = typeof ssrStats?.activeAnimations === "number"
      ? ssrStats.activeAnimations : "?";
    const alignMode = ssrStats?.alignMode === true
      ? "ALIGN" : (ssrStats?.alignMode === false ? "off" : "?");
    const gifsReady = ssrStats?.gifsReady ?? null;
    const gifsTotal = ssrStats?.gifsTotal ?? null;
    const gifsLoading = ssrStats?.gifsLoading ?? 0;
    const gifsFallback = ssrStats?.gifsFallback ?? 0;
    const gifsStr = gifsTotal != null
      ? `${gifsReady}/${gifsTotal}` +
        (gifsLoading > 0 ? ` ld${gifsLoading}` : "") +
        (gifsFallback > 0 ? ` fb${gifsFallback}` : "")
      : "?";

    // Server-info one-shot.
    const enc = serverInfo?.encoder || "?";
    const encSrc = serverInfo?.encoderSource || "?";
    const preset = serverInfo?.qualityPreset || "?";
    const targetBps = serverInfo?.bitrateBps;
    const fpsTarget = serverInfo?.fpsTarget;

    // Six-line layout — one section per concern, label-prefixed for
    // skim-readability. A monospace renderer (CSS `font-family: monospace;
    // white-space: pre`) keeps the columns aligned.
    const lines = [
      `STREAM  ${fmtFps(receivedFps)} · ${streamRes} · ${codec || "?"} · drops=${dropFracPart} · loss=${pktLossPctPart}`,
      `RTC     rtt=${rttMs != null ? rttMs + "ms" : "?"} · jitter=${jitterMs != null ? jitterMs + "ms" : "?"} · avail=${fmtBitrate(availBitrate)} · dec=${decoderImpl}`,
      `SSR     ${ssrFpsStr} · ${ssrRes} · via=${ssrDecoder} · gpu=${ssrRenderer}`,
      `ENCODE  ${enc}/${encSrc} · ${preset} · target=${fmtBitrate(targetBps)} · ${fpsTarget != null ? fpsTarget + "fps" : "?"}`,
      `PIPE    pc=${pcConnectionState ?? "?"} · gifs=${gifsStr} · attempts=${reconnectAttempts ?? 0}`,
      `BOARD   ${board} · anims=${activeAnims} · ${alignMode} · frame=${fmtMs(lastFrameAgeMs)} · hb=${fmtMs(heartbeatAgeMs)}`,
    ];
    return lines.join("\n");
  }

  // Diagnostic chip — D-D3 (extended in h17). Renders the multi-line
  // overlay produced by formatDiagnosticOverlay. Stays visible on Pi
  // /output/ because the operator needs an at-a-glance liveness signal
  // even when the primary <video> element is happy.
  function updateMetrics(input = {}) {
    if (!chipEl) return;
    chipEl.textContent = formatDiagnosticOverlay(input);
    // Tag the chip so CSS can switch to the multi-line layout (white-
    // space:pre + monospace). The original chip's CSS continues to work
    // for any caller that still passes only the legacy fields.
    chipEl.setAttribute("data-overlay-extended", "true");
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
    // h17: pure formatter exposed for unit tests (covers the chip text
    // contract without spinning up a DOM).
    formatDiagnosticOverlay,
  };
}

// h17: also export at the module level for direct test imports — the
// formatter has no DOM deps so it can be used standalone. Implementation
// is colocated with the factory above so duplication is avoided.
export function formatDiagnosticOverlay(input) {
  // Build a transient factory just to grab the formatter — keeps the
  // single source of truth inside createStatusUi while still exposing
  // a top-level binding for tests / other modules.
  const tmp = createStatusUi({
    document: { getElementById: () => null },
    chipEl: null,
  });
  return tmp.formatDiagnosticOverlay(input);
}
