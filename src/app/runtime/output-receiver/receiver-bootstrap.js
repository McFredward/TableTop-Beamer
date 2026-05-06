// Phase 31 Plan 03 — Pi /output/ thin-client receiver bootstrap.
//
// Replaces the full render pipeline (runtime-orchestration.js) on Pi /output/
// when no `?ssr=1` flag is present. Loads the WebRTC consumer + status UI,
// runs D-C4 three-indicator disconnect monitoring, and surfaces every
// disconnect via explicit reconnect banner / error overlay UI. D-B4 binding:
// NEVER black screen — every disconnect path renders a status / error UI.
//
// D-D2 REVERSAL: this bootstrap also loads the existing
// runtime-wire-room-audio-binders.js script-tag (already wired into
// index.html) implicitly — it executes before this module via classic
// `defer` ordering, which means Pi-local audio (HTML5 <audio> via
// WebSocket triggers) keeps playing untouched.

import { createWebRtcReceiver } from "./receiver-webrtc-client.js";
import {
  createStatusUi,
  evaluateDisconnect,
  DISCONNECT_THRESHOLD_MS,
  MAX_RECONNECT_ATTEMPTS,
} from "./receiver-status-ui.js";

/**
 * Returns true if the current location should boot the receiver — i.e. it's
 * /output/ on the Pi without `?ssr=1`. The SSR Chromium tab on the server
 * runs the full pipeline (Plan 01/02 contract) and is identified by
 * `?ssr=1`; the dashboard on `/` is not a final-output page at all.
 *
 * @param {{pathname?:string, search?:string}} [locationLike]
 * @returns {boolean}
 */
export function isReceiverPath(locationLike = window.location) {
  const path = locationLike?.pathname || "/";
  const search = locationLike?.search || "";
  const isFinalOutput =
    path === "/output" ||
    path === "/output/" ||
    path.startsWith("/output/final");
  const isSsrTab = /[?&]ssr=1(\b|&)/.test(search);
  return isFinalOutput && !isSsrTab;
}

/**
 * Boot the Pi receiver: splash → connect → video → metric polling +
 * three-indicator monitoring → reconnect → error overlay.
 *
 * @param {object} [opts]
 * @param {Console} [opts.logger]
 */
export async function bootReceiver({ logger = console } = {}) {
  // Mark body so CSS hides existing canvas chrome on Pi /output/.
  // (data-output-role is also set by runtime-orchestration.js when it
  // runs the early-exit branch, but we set it again here defensively
  // in case the bootstrap is invoked from a fresh context.)
  document.body.dataset.outputRole = "final-output";

  const chipEl = document.getElementById("output-status-chip");
  const videoEl = document.getElementById("ssr-video");
  const ui = createStatusUi({ chipEl });

  // D-D4: TT-Beamer splash + "Connecting…" first paint.
  ui.showSplash("Connecting to render server…");

  let receiver = null;
  let reconnectAttempts = 0;
  let lastFrameAtMs = performance.now();
  let lastHeartbeatAtMs = performance.now();
  let frameCount = 0;
  let frameWindowStartMs = performance.now();
  let receivedFps = 0;
  let pcState = "new";
  let monitorInterval = null;

  // D-B4 retry button — manual operator escalation. Always available
  // when the error overlay is visible.
  ui.onRetry(async () => {
    ui.hideError();
    ui.showSplash("Reconnecting…");
    reconnectAttempts = 0;
    await tryConnect();
  });

  async function tryConnect() {
    try {
      receiver = await createWebRtcReceiver({ videoEl, logger });
      receiver.onConnectionStateChange((s) => {
        pcState = s;
        if (s === "connected") {
          reconnectAttempts = 0;
          ui.hideSplash();
          ui.hideReconnect();
          ui.hideError();
        }
        // D-B4: explicit render-host-down — server publishes this when
        // the Chromium tab dies. Show error UI instead of leaving the
        // last frozen frame and waiting for the operator to notice.
        if (s === "host-down") {
          ui.showError(
            "Render host crashed. The server is restarting the render tab — click Retry to reconnect.",
          );
        }
        if (s === "failed" || s === "ws-closed") {
          ui.showReconnect(`Server reconnecting (${s})…`);
        }
      });
      receiver.onFrameReceived(() => {
        lastFrameAtMs = performance.now();
        frameCount += 1;
      });
      receiver.onHeartbeat(() => {
        lastHeartbeatAtMs = performance.now();
      });
    } catch (err) {
      logger.error(`[ssr-receiver] connect failed: ${err?.message ?? err}`);
      reconnectAttempts += 1;
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        // D-B4 escalation cap reached — surface the explicit error UI
        // with the Retry button. Operator must take action.
        ui.showError(
          `Cannot reach render server after ${MAX_RECONNECT_ATTEMPTS} attempts. Check server status, then click Retry.`,
        );
        return;
      }
      const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
      ui.showReconnect(
        `Retrying in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})…`,
      );
      setTimeout(() => {
        tryConnect();
      }, delay);
    }
  }

  // D-C4 three-indicator monitor + diagnostic chip refresh. Polls every
  // 1s — the chip metrics need that cadence for a useful liveness signal,
  // and disconnect detection at 1s granularity means user-visible
  // reconnect UI within ~3-4s of any indicator going stale (D-C2 budget).
  monitorInterval = setInterval(() => {
    const now = performance.now();
    const dec = evaluateDisconnect({
      pcConnectionState: pcState,
      lastFrameAtMs,
      lastHeartbeatAtMs,
      nowMs: now,
    });
    if (dec.disconnected && reconnectAttempts === 0 && pcState !== "host-down") {
      // D-B4: surface ALL detected reasons in the banner so the operator
      // sees what triggered the reconnect. Empty banner == no info ==
      // bad UX.
      ui.showReconnect(`Server reconnecting (${dec.reasons.join(", ")})…`);
      reconnectAttempts += 1;
      try {
        receiver?.stop();
      } catch {}
      tryConnect();
    }

    // fps rolling average over the latest 1s window
    if (now - frameWindowStartMs >= 1000) {
      receivedFps = (frameCount * 1000) / (now - frameWindowStartMs);
      frameCount = 0;
      frameWindowStartMs = now;
    }
    ui.updateMetrics({
      receivedFps,
      pcConnectionState: pcState,
      lastFrameAgeMs: now - lastFrameAtMs,
      heartbeatAgeMs: now - lastHeartbeatAtMs,
    });
  }, 1000);

  await tryConnect();

  // Returned for test / debug introspection. The bootstrap is a one-shot
  // top-level coordinator on the page so most callers ignore the return.
  return {
    stop() {
      if (monitorInterval) clearInterval(monitorInterval);
      try {
        receiver?.stop();
      } catch {}
    },
    getStatus() {
      return {
        pcState,
        reconnectAttempts,
        receivedFps,
        lastFrameAgeMs: performance.now() - lastFrameAtMs,
        heartbeatAgeMs: performance.now() - lastHeartbeatAtMs,
      };
    },
  };
}

// Re-export the shared constants so test code can reference them through
// the bootstrap module entry point if it prefers a single import.
export { DISCONNECT_THRESHOLD_MS, MAX_RECONNECT_ATTEMPTS };
