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
// Phase 31 Plan 04 (D-D1): align-mode pointer events forwarded to server.
import { attachInputForwarder } from "./receiver-input-forwarder.js";

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
          ui.hideSplash(); // h5: error must be visible above splash
          ui.showError(
            "Render host crashed. The server is restarting the render tab — click Retry to reconnect.",
          );
        }
        if (s === "failed" || s === "ws-closed") {
          ui.hideSplash(); // h5: reconnect banner must be visible above splash
          ui.showReconnect(`Server reconnecting (${s})…`);
        }
      });
      // h5: hide the splash on the FIRST received frame too — `connected`
      // state can lag the actual first paint (transport may report
      // `connecting` while frames are already flowing). First frame is
      // the unambiguous proof that the stream is live.
      receiver.onFrameReceived(() => {
        if (frameCount === 0) {
          ui.hideSplash();
          ui.hideReconnect();
          ui.hideError();
          reconnectAttempts = 0;
        }
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
        ui.hideSplash(); // h5: error must be visible above splash
        ui.showError(
          `Cannot reach render server after ${MAX_RECONNECT_ATTEMPTS} attempts. Check server status, then click Retry.`,
        );
        return;
      }
      // h5: hide the splash before showing reconnect — splash z-index 50
      // sat above reconnect z-index 40, hiding the reconnect banner.
      // First-time /output/ load was the worst case: the SSR Chromium tab
      // takes ~1-2s to publish, the receiver retries until the producer
      // is up, and the splash stayed visible the whole time with no sign
      // of progress. Hiding it lets the reconnect banner show through.
      ui.hideSplash();
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

  // ── Phase 31 Plan 04 (D-D1): align-mode pointer forwarding ─────────────
  //
  // Create a transparent fixed-position overlay above the <video> that
  // captures pointer events ONLY while alignMode is active. The forwarder
  // sends each drag as a `align-corner-drag` mutation; server validates +
  // fanouts, the SSR Chromium tab applies the mesh-warp update, and the
  // Pi sees it via the next streamed frame. A local SVG ghost (Pitfall 6
  // mitigation) gives instant visual feedback.
  let overlayEl = document.getElementById("ssr-input-overlay");
  if (!overlayEl) {
    overlayEl = document.createElement("div");
    overlayEl.id = "ssr-input-overlay";
    overlayEl.style.cssText =
      "position:fixed;inset:0;z-index:4;touch-action:none;pointer-events:none";
    document.body.appendChild(overlayEl);
  }

  // Local snapshot mirror — alignMode + active projection-profile id.
  // Wave-4 minimum implementation: poll the existing /api/live/snapshot
  // route (Phase 13) at 1Hz. Plan-06 UAT can refine this to a WS-driven
  // mirror if latency requires it.
  let alignMode = false;
  let currentProfileId = null;
  const snapshotInterval = setInterval(async () => {
    try {
      const r = await fetch("/api/live/snapshot");
      if (r.ok) {
        const j = await r.json();
        const snap = j?.snapshot ?? j?.session?.snapshot ?? {};
        alignMode = Boolean(snap?.alignMode);
        currentProfileId =
          snap?.runtime?.activeProjectionProfileId
          ?? snap?.selectedBoard?.lastUsedProfileName
          ?? (typeof snap?.selectedBoard === "string" ? snap.selectedBoard : null)
          ?? null;
        overlayEl.style.pointerEvents = alignMode ? "auto" : "none";
      }
    } catch {
      /* ignore — next tick retries */
    }
  }, 1000);

  const inputForwarder = attachInputForwarder({
    overlayEl,
    isAlignModeActive: () => alignMode,
    getCurrentProfileId: () => currentProfileId,
    hitTestVertex: ({ x, y }) => {
      // Wave-4 minimum: 4-corner hit-test (TL/TR/BR/BL with 20% radius).
      // The actual mesh-vertex resolution lives in the SSR tab — Pi sends
      // the closest corner ID and lets the server's mesh-warp profile
      // resolver pick the precise vertex.
      const corners = [
        { x: 0, y: 0, id: 0 },
        { x: 1, y: 0, id: 1 },
        { x: 1, y: 1, id: 2 },
        { x: 0, y: 1, id: 3 },
      ];
      let bestId = null;
      let bestDist = Infinity;
      for (const c of corners) {
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < bestDist) {
          bestDist = d;
          bestId = c.id;
        }
      }
      return bestDist < 0.2 ? bestId : null;
    },
    logger,
  });

  // Returned for test / debug introspection. The bootstrap is a one-shot
  // top-level coordinator on the page so most callers ignore the return.
  return {
    stop() {
      if (monitorInterval) clearInterval(monitorInterval);
      if (snapshotInterval) clearInterval(snapshotInterval);
      try {
        inputForwarder.teardown();
      } catch {}
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
