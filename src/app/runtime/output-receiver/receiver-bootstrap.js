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
  getBackoffDelay,
  loadBackoffState,
  saveBackoffState,
  clearBackoffState,
  markStable,
  STABLE_RESET_THRESHOLD_MS,
  showCountdownReconnect,
  markConnectionStable,
  evaluateOverlayHide,
  OVERLAY_HIDE_AFTER_STABLE_MS,
} from "./receiver-status-ui.js";
// Phase 31 Plan 04 (D-D1): align-mode pointer events forwarded to server.
import { attachInputForwarder } from "./receiver-input-forwarder.js";

/**
 * Phase 32 D-B5: pre-flight check before opening a WebRTC session.
 * Polls /api/ssr/ready until 200 OK + { ready: true } (producer up) or
 * maxWaitMs elapses. Returns true when the producer is ready, false on timeout.
 * Best-effort — callers should proceed with the retry loop even on false.
 *
 * @param {object} [opts]
 * @param {Function} [opts.fetch]       - injectable fetch (for unit tests)
 * @param {number}   [opts.maxWaitMs]   - total timeout (default 60s)
 * @param {number}   [opts.pollIntervalMs] - poll cadence (default 1s)
 * @returns {Promise<boolean>}
 */
export async function waitForProducer({
  fetch: _fetch = (typeof window !== "undefined" ? window.fetch : globalThis.fetch),
  maxWaitMs = 60000,
  pollIntervalMs = 1000,
} = {}) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const r = await _fetch("/api/ssr/ready");
      if (r.ok) {
        const j = await r.json();
        if (j && j.ready === true) return true;
      }
    } catch {
      // Network hiccup or fetch reject — keep polling.
    }
    await new Promise((res) => setTimeout(res, pollIntervalMs));
  }
  return false;
}

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
  // h17 (2026-05-06): always show the diagnostic overlay on the Pi
  // receiver. The user explicitly wants render method, resolution,
  // encoder, etc. visible on the streamed display so they can read
  // exactly what's happening end-to-end. The overlay is hidden via
  // `?diagnostic=off` if needed (CSS gates on body[data-diagnostic-overlay]).
  if (!/[?&]diagnostic=off\b/.test(window.location.search || "")) {
    document.body.dataset.diagnosticOverlay = "true";
  }

  const chipEl = document.getElementById("output-status-chip");
  const videoEl = document.getElementById("ssr-video");
  const ui = createStatusUi({ chipEl });

  // D-D4: TT-Beamer splash + "Connecting…" first paint.
  ui.showSplash("Connecting to render server…");

  // Phase 32 D-B2: load persisted attempt count from sessionStorage so page
  // reloads do NOT reset the backoff to 1s rapid-fire. On a clean boot the
  // key is absent and we start at 0.
  const backoffStorage = (typeof window !== "undefined" && window.sessionStorage)
    ? window.sessionStorage : null;
  let receiver = null;
  let reconnectAttempts = loadBackoffState(backoffStorage).attempts;
  let connectionStableSince = null; // tracks when last stable connection started
  // Phase 32 hotfix h6 (2026-05-07): in-flight flag for tryConnect.
  // Replaces the monitor's `reconnectAttempts === 0` guard, which was
  // permanently disabled when sessionStorage held a non-zero attempt count
  // from a prior failed-session — leaving the monitor unable to fire
  // tryConnect() on mid-session drops, so the Pi sat stuck on the
  // RECONNECTING banner without ever retrying. The flag is set true on
  // tryConnect entry and cleared on completion (success OR catch).
  let tryConnectInFlight = false;
  // Phase 32 D-B3: countdown overlay state.
  let countdownStop = null;        // stop() returned by showCountdownReconnect
  const connectionStore = {};      // mutable store for markConnectionStable / evaluateOverlayHide
  let overlayHidePoller = null;    // setInterval handle for hide-after-stable check
  // Phase 33 Plan 01-T1 (Suspect 4): tracks the in-flight reconnect-backoff
  // setTimeout so the producer-ready handler can cancel it and jump to an
  // immediate retry. Null when no retry is pending.
  let pendingRetryTimeout = null;
  let lastFrameAtMs = performance.now();
  let lastHeartbeatAtMs = performance.now();
  let frameCount = 0;
  let frameWindowStartMs = performance.now();
  let receivedFps = 0;
  let pcState = "new";
  let monitorInterval = null;
  let ssrFps = null; // h8: SSR-tab's internal render fps (via heartbeat).
  // h17: rich diagnostic state — populated by heartbeat (server-side
  // info + ssr-tab self-reported stats) and consumer-side polling
  // (RTCPeerConnection.getStats + videoEl.getVideoPlaybackQuality).
  let ssrStats = null;
  let serverInfo = null;
  // RTC stats sampled every 1s from RTCPeerConnection.getStats(). Diff'd
  // against the prior tick to compute per-second rates (frames decoded,
  // packets received, bytes received).
  let rtcStats = {
    codec: null,
    inbound: { framesDecoded: 0, framesDropped: 0, framesPerSecond: 0, jitter: null,
      packetsLost: 0, packetsReceived: 0, bytesReceived: 0, totalDecodeTime: 0 },
    candidatePair: { rtt: null, availableIncomingBitrate: null },
    decoderImplementation: null,
  };
  let rtcStatsPrev = null;

  // D-B4 retry button — manual operator escalation. Always available
  // when the error overlay is visible.
  ui.onRetry(async () => {
    ui.hideError();
    ui.showSplash("Reconnecting…");
    reconnectAttempts = 0;
    clearBackoffState(backoffStorage);
    connectionStableSince = null;
    await tryConnect();
  });

  async function tryConnect() {
    // Phase 32 hotfix h6 (2026-05-07): early-return if already in flight to
    // prevent monitor floods firing parallel tryConnect calls during ICE
    // handshake. Flag is reset in the success path (onConnectionStateChange
    // "connected" / first frame) and in the catch block, so subsequent
    // monitor ticks or onConnectionStateChange events can re-enter.
    if (tryConnectInFlight) {
      return;
    }
    tryConnectInFlight = true;
    // Phase-31 h25 (2026-05-06): stop any prior receiver before
    // creating a new one. Without this, a failed connect attempt left
    // the previous receiver instance stranded — its WS still claimed a
    // server-side consumer slot. After ~10 attempts we hit the
    // MAX_CONSUMER_CONNECTIONS=10 cap and the server REJECTED any new
    // connect attempts → user could not reconnect at all.
    if (receiver) {
      try { receiver.stop(); } catch (_) {}
      receiver = null;
    }
    try {
      receiver = await createWebRtcReceiver({ videoEl, logger });
      receiver.onConnectionStateChange((s) => {
        pcState = s;
        if (s === "connected") {
          // Phase 32 D-B2: clear backoff state on successful connection.
          reconnectAttempts = 0;
          clearBackoffState(backoffStorage);
          connectionStableSince = Date.now();
          // Phase 32 hotfix h6: connection succeeded — clear in-flight flag
          // so monitor can detect future disconnects and re-fire tryConnect.
          tryConnectInFlight = false;
          // Phase 32 D-B3: stop any running countdown and start stable-hide poller.
          if (typeof countdownStop === "function") { countdownStop(); countdownStop = null; }
          markConnectionStable({ now: Date.now(), store: connectionStore });
          if (!overlayHidePoller) {
            overlayHidePoller = setInterval(() => {
              const { shouldHide } = evaluateOverlayHide({
                now: Date.now(), store: connectionStore,
                hideAfterMs: OVERLAY_HIDE_AFTER_STABLE_MS,
              });
              if (shouldHide) {
                try { ui.hideReconnect(); } catch {}
                if (typeof countdownStop === "function") { countdownStop(); countdownStop = null; }
                clearInterval(overlayHidePoller);
                overlayHidePoller = null;
              }
            }, 500);
          }
          ui.hideSplash();
          ui.hideReconnect();
          ui.hideError();
        }
        if (s === "failed" || s === "ws-closed" || s === "disconnected") {
          // Reset stable tracker so overlay re-shows on next retry.
          connectionStableSince = null;
          connectionStore.connectionStableAtMs = null;
          if (overlayHidePoller) { clearInterval(overlayHidePoller); overlayHidePoller = null; }
        }
        // Phase 33 Plan 01-T2 (Suspect 5): producer-closed → producer-gone.
        // Server tells us the upstream Producer ended (ssr-tab restart);
        // the WS is still healthy (heartbeats may keep arriving). Without
        // this branch the only recovery path was the 8s frame-stale timer.
        // Immediate restart() collapses that 8s gap to a single RPC roundtrip.
        if (s === "producer-gone") {
          connectionStableSince = null;
          connectionStore.connectionStableAtMs = null;
          if (overlayHidePoller) { clearInterval(overlayHidePoller); overlayHidePoller = null; }
          ui.hideSplash();
          ui.showReconnect("Render-Producer restarting…");
          // restart() = stop + reconnect. The bootstrap's onConnectionStateChange
          // will run again on the new receiver and clear the banner once
          // CONNECTED is reached. Best-effort — if restart throws (e.g. WS
          // was closing concurrently), the existing monitor + 8s frame-stale
          // path picks it up.
          try { receiver?.restart(); } catch (_) { /* fall through */ }
        }
        // D-B4: explicit render-host-down — server publishes this when
        // the Chromium tab dies. Show error UI instead of leaving the
        // last frozen frame and waiting for the operator to notice.
        if (s === "host-down") {
          connectionStableSince = null;
          connectionStore.connectionStableAtMs = null;
          if (typeof countdownStop === "function") { countdownStop(); countdownStop = null; }
          if (overlayHidePoller) { clearInterval(overlayHidePoller); overlayHidePoller = null; }
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
          // Phase 32 D-B2: clear backoff state on first frame received.
          reconnectAttempts = 0;
          clearBackoffState(backoffStorage);
          connectionStableSince = connectionStableSince ?? Date.now();
        }
        lastFrameAtMs = performance.now();
        frameCount += 1;
      });
      receiver.onHeartbeat(() => {
        lastHeartbeatAtMs = performance.now();
      });
      // h8: surface SSR-tab fps in the diagnostic chip alongside stream fps.
      receiver.onSsrFps((fps) => {
        ssrFps = fps;
      });
      // h17: extended ssr stats (decoder, board, gif counts, output res…)
      receiver.onSsrStats?.((stats) => {
        ssrStats = stats;
      });
      // h17: server info (encoder, preset, bitrate) — sticks for the
      // session, refreshed on every heartbeat for resilience.
      receiver.onServerInfo?.((info) => {
        serverInfo = info;
      });
      // Phase 33 Plan 01-T1 (Suspect 4): producer-ready → if we're idle in
      // a backoff timer or the consume RPC just rejected with no-producer-yet,
      // jump out and retry NOW instead of eating the up-to-1s pollIntervalMs
      // / up-to-30s backoff window.
      receiver.onProducerReady?.(() => {
        if (pendingRetryTimeout != null) {
          try { clearTimeout(pendingRetryTimeout); } catch {}
          pendingRetryTimeout = null;
          if (typeof countdownStop === "function") { countdownStop(); countdownStop = null; }
          // Fire the retry on the next tick so any ongoing message-handler
          // chain can finish first.
          setTimeout(() => { tryConnect(); }, 0);
        }
      });
    } catch (err) {
      logger.error(`[ssr-receiver] connect failed: ${err?.message ?? err}`);
      // Phase 32 D-B2: forever-retry with adaptive backoff schedule.
      // No hard attempt cap — the Pi retries until stable.
      reconnectAttempts += 1;
      saveBackoffState({ attempts: reconnectAttempts }, backoffStorage);
      connectionStableSince = null; // reset stable tracker on failure
      // h5: hide the splash before showing reconnect — splash z-index 50
      // sat above reconnect z-index 40, hiding the reconnect banner.
      // First-time /output/ load was the worst case: the SSR Chromium tab
      // takes ~1-2s to publish, the receiver retries until the producer
      // is up, and the splash stayed visible the whole time with no sign
      // of progress. Hiding it lets the reconnect banner show through.
      ui.hideSplash();
      // Use D-B2 schedule: attempt 0→1s, 1→2s, 2→5s, 3→10s, ≥4→30s.
      const delay = getBackoffDelay(reconnectAttempts - 1);
      // Phase 32 D-B3: show countdown overlay instead of plain text.
      if (typeof countdownStop === "function") { countdownStop(); }
      countdownStop = showCountdownReconnect({
        doc: (typeof document !== "undefined" ? document : null),
        delayMs: delay,
        attemptN: reconnectAttempts,
      });
      // Phase 33 Plan 01-T1 (Suspect 4): track the timeout handle so a
      // producer-ready event from the active receiver's WS can cancel it
      // and trigger an immediate retry instead of waiting out the backoff.
      if (pendingRetryTimeout != null) { try { clearTimeout(pendingRetryTimeout); } catch {} }
      pendingRetryTimeout = setTimeout(() => {
        pendingRetryTimeout = null;
        tryConnect();
      }, delay);
    } finally {
      // Phase 32 hotfix h7 (2026-05-07): ALWAYS clear in-flight flag when
      // tryConnect's body completes (try-block returned OR catch-block ran).
      // The flag's purpose is to prevent two concurrent createWebRtcReceiver
      // calls from racing — once that await resolves (success or fail), the
      // function is done and any subsequent retry path should be allowed.
      // Without this, if createWebRtcReceiver succeeded but the connection
      // never reached "connected" state (went connecting → ws-closed
      // directly), the flag would stay TRUE forever and the monitor would
      // be permanently blocked from triggering a retry — exactly the bug
      // h6 was supposed to fix but did not fully cover.
      tryConnectInFlight = false;
    }
  }

  // h17: RTC getStats polling. RTCPeerConnection exposes per-track stats
  // (jitter, packets lost, frames decoded, decoder implementation, RTT).
  // We snapshot every tick and diff against the prior snapshot to derive
  // per-second rates. Best-effort — if mediasoup-client doesn't expose
  // the underlying PC, we just leave the fields null.
  async function pollRtcStats() {
    try {
      const pc = receiver?.getRtcPeerConnection?.();
      if (!pc || typeof pc.getStats !== "function") return;
      const report = await pc.getStats();
      const next = {
        codec: null,
        inbound: { framesDecoded: 0, framesDropped: 0, framesPerSecond: 0, jitter: null,
          packetsLost: 0, packetsReceived: 0, bytesReceived: 0, totalDecodeTime: 0,
          frameWidth: 0, frameHeight: 0 },
        candidatePair: { rtt: null, availableIncomingBitrate: null },
        decoderImplementation: null,
      };
      let codecId = null;
      report.forEach((s) => {
        if (s.type === "inbound-rtp" && s.kind === "video") {
          next.inbound.framesDecoded = Number(s.framesDecoded || 0);
          next.inbound.framesDropped = Number(s.framesDropped || 0);
          next.inbound.framesPerSecond = Number(s.framesPerSecond || 0);
          next.inbound.jitter = typeof s.jitter === "number" ? s.jitter : null;
          next.inbound.packetsLost = Number(s.packetsLost || 0);
          next.inbound.packetsReceived = Number(s.packetsReceived || 0);
          next.inbound.bytesReceived = Number(s.bytesReceived || 0);
          next.inbound.totalDecodeTime = Number(s.totalDecodeTime || 0);
          next.inbound.frameWidth = Number(s.frameWidth || 0);
          next.inbound.frameHeight = Number(s.frameHeight || 0);
          if (typeof s.decoderImplementation === "string") {
            next.decoderImplementation = s.decoderImplementation;
          }
          if (s.codecId) codecId = s.codecId;
        } else if (s.type === "candidate-pair" && s.state === "succeeded" && s.nominated) {
          if (typeof s.currentRoundTripTime === "number") next.candidatePair.rtt = s.currentRoundTripTime;
          if (typeof s.availableIncomingBitrate === "number") {
            next.candidatePair.availableIncomingBitrate = s.availableIncomingBitrate;
          }
        }
      });
      if (codecId) {
        const codec = report.get?.(codecId);
        if (codec?.mimeType) next.codec = String(codec.mimeType);
      }
      rtcStatsPrev = rtcStats;
      rtcStats = next;
    } catch (_) {
      // never let stats polling break the receiver
    }
  }

  // Phase 32 hotfix h5 (2026-05-07): waitForProducer MUST run BEFORE the
  // monitor is armed. Original Phase 32 placement (after setInterval, before
  // tryConnect) caused a phantom-disconnect race: lastHeartbeatAtMs is
  // initialized to performance.now() at bootstrap-entry but only updated
  // by receiver.onHeartbeat — which can't fire until tryConnect creates a
  // receiver. With monitor armed during the up-to-60s waitForProducer,
  // tick-7 at T+8s evaluates `now - lastHeartbeatAtMs > DISCONNECT_THRESHOLD_MS`
  // as TRUE and fires a phantom tryConnect() in parallel. When the awaited
  // waitForProducer finally resolves, the original tryConnect() on line 446
  // calls receiver.stop() on the phantom-connected receiver and starts
  // over — observable as endless connect→disconnect→reconnect.
  // Producer-readiness gate (D-B5): Best-effort 60s wait BEFORE arming the
  // monitor, so the monitor's stale-heartbeat indicator can't false-positive
  // during the wait. If waitForProducer times out, fall through to the retry
  // loop (gate is best-effort, not blocking-forever).
  try {
    const producerReady = await waitForProducer({ maxWaitMs: 60000, pollIntervalMs: 1000 });
    if (!producerReady) {
      logger.warn("[receiver] waitForProducer timed out after 60s — entering retry loop anyway");
    }
  } catch (e) {
    logger.warn("[receiver] waitForProducer threw:", e?.message);
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
    // Phase 32 hotfix h6: replaced `reconnectAttempts === 0` with
    // `!tryConnectInFlight`. The old guard was permanently disabled when
    // sessionStorage held a non-zero attempt count from a prior session,
    // leaving the Pi unable to retry after a mid-session drop. The
    // in-flight flag instead prevents floods (parallel tryConnect calls)
    // without depending on attempt count state.
    if (dec.disconnected && !tryConnectInFlight && pcState !== "host-down") {
      // D-B4: surface ALL detected reasons in the banner so the operator
      // sees what triggered the reconnect. Empty banner == no info ==
      // bad UX.
      reconnectAttempts += 1;
      saveBackoffState({ attempts: reconnectAttempts }, backoffStorage);
      connectionStableSince = null;
      connectionStore.connectionStableAtMs = null;
      const monDelay = getBackoffDelay(reconnectAttempts - 1);
      // Phase 32 D-B3: countdown overlay for monitor-triggered reconnects.
      if (typeof countdownStop === "function") { countdownStop(); }
      countdownStop = showCountdownReconnect({
        doc: (typeof document !== "undefined" ? document : null),
        delayMs: monDelay,
        attemptN: reconnectAttempts,
      });
      try {
        receiver?.stop();
      } catch {}
      tryConnect();
    }

    // Phase 32 D-B2: stable-reset — if connected >= STABLE_RESET_THRESHOLD_MS,
    // reset attempts to 0 and clear sessionStorage backoff state.
    if (connectionStableSince !== null && reconnectAttempts > 0) {
      const stableMs = Date.now() - connectionStableSince;
      if (stableMs >= STABLE_RESET_THRESHOLD_MS) {
        reconnectAttempts = 0;
        clearBackoffState(backoffStorage);
        connectionStableSince = Date.now(); // re-stamp so we don't keep resetting
      }
    }

    // fps rolling average over the latest 1s window
    if (now - frameWindowStartMs >= 1000) {
      receivedFps = (frameCount * 1000) / (now - frameWindowStartMs);
      frameCount = 0;
      frameWindowStartMs = now;
    }
    // h17: poll RTC stats (codec, RTT, jitter, drops). Fire-and-forget;
    // fresh values land in `rtcStats` for the next chip render.
    void pollRtcStats();
    // h17: video element resolution (might lag a tick behind the actual
    // frame size when simulcast layer changes; that's fine).
    let videoW = 0, videoH = 0, videoDropped = 0, videoTotal = 0;
    try {
      videoW = Number(videoEl.videoWidth || 0);
      videoH = Number(videoEl.videoHeight || 0);
      const q = typeof videoEl.getVideoPlaybackQuality === "function"
        ? videoEl.getVideoPlaybackQuality()
        : null;
      if (q) {
        videoDropped = Number(q.droppedVideoFrames || 0);
        videoTotal = Number(q.totalVideoFrames || 0);
      }
    } catch {}
    ui.updateMetrics({
      // legacy fields
      receivedFps,
      pcConnectionState: pcState,
      lastFrameAgeMs: now - lastFrameAtMs,
      heartbeatAgeMs: now - lastHeartbeatAtMs,
      ssrFps,
      // h17 extended fields
      ssrStats,
      serverInfo,
      rtcStats,
      rtcStatsPrev,
      videoW,
      videoH,
      videoDropped,
      videoTotal,
      reconnectAttempts,
    });
  }, 1000);

  // Phase 32 hotfix h5 (2026-05-07): waitForProducer was MOVED above the
  // monitorInterval setInterval to fix the phantom-disconnect race
  // (see comment above the relocated block). tryConnect() now fires
  // immediately after the gate resolves; the monitor is already armed
  // and will track the live receiver from the first heartbeat onward.
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
    // h19: hand the <video> element to the forwarder so it can map
    // pointer coords from receiver-viewport space to stream-content
    // space (object-fit: cover crops on aspect mismatch — without this,
    // a click at the BOARD's TL in the stream sent the wrong coords).
    getVideoEl: () => videoEl,
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
      if (overlayHidePoller) { clearInterval(overlayHidePoller); overlayHidePoller = null; }
      if (typeof countdownStop === "function") { countdownStop(); countdownStop = null; }
      if (pendingRetryTimeout != null) { try { clearTimeout(pendingRetryTimeout); } catch {} pendingRetryTimeout = null; }
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
// Phase 32 D-B2: hard attempt cap removed (forever-retry); getBackoffDelay,
// loadBackoffState, saveBackoffState, clearBackoffState re-exported for tests.
export {
  DISCONNECT_THRESHOLD_MS,
  getBackoffDelay,
  loadBackoffState,
  saveBackoffState,
  clearBackoffState,
  markStable,
  STABLE_RESET_THRESHOLD_MS,
};
