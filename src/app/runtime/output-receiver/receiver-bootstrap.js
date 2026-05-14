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
//
// Phase 33 Plan 03 (2026-05-08): refactored from ad-hoc state strings
// (`"connected"`, `"ws-closed"`, `"host-down"`, `"frame-stale"`, `"failed"`)
// to a single `ConnectionState` enum (LiveKit-style — research §1.4 + §5).
// Transitions go through `setState(next, { reason })`; illegal transitions
// throw to surface contract violations during tests. The enum eliminates the
// "monitor guarded forever on host-down" bug (Suspect 14) by letting state
// changes carry their own gate semantics.

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
  setReconnectDetail,
  showGivenUpOverlay,
  hideGivenUpOverlay,
} from "./receiver-status-ui.js";
// Phase 31 Plan 04 (D-D1): align-mode pointer events forwarded to server.
import { attachInputForwarder } from "./receiver-input-forwarder.js";

/**
 * Phase 33 Plan 03-T1 (Suspect 14, R-1, R-7): receiver-side ConnectionState
 * enum. Replaces the loose collection of `pcState` strings (`"connected"`,
 * `"ws-closed"`, `"host-down"`, `"frame-stale"`, `"failed"`) with a closed
 * set of high-level states. The legacy strings still flow through from the
 * receiver-webrtc-client (mediasoup-client emits `connecting`, `connected`,
 * `disconnected`, `failed`, `closed`); we MAP them through `setState()`.
 *
 * NEW       — boot entry, before any WS attempt
 * CONNECTING — tryConnect() is in flight (WS opening, RPC roundtrip)
 * CONNECTED  — first frame received (NOT just RTC connected — see 03-T3)
 * RECONNECTING — backoff timer is pending; previous attempt failed
 * GIVEN_UP   — capped retry hit (10 attempts OR 120s elapsed); operator action required
 * HOST_DOWN  — server told us the render-host crashed
 * STOPPED    — operator clicked stop or page is unloading
 */
export const ConnectionState = Object.freeze({
  NEW: "NEW",
  // Phase 39 Plan 39-3 D-02: first-attempt window, no RECONNECTING banner.
  // Replaces the direct NEW → CONNECTING edge for cold-boot. Failures during
  // the INITIAL_CONNECT_GRACE_MS window silently retry instead of routing
  // through RECONNECTING (which fires the visible banner + counts against
  // capped-retry budget).
  INITIAL_CONNECT: "INITIAL_CONNECT",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  RECONNECTING: "RECONNECTING",
  GIVEN_UP: "GIVEN_UP",
  HOST_DOWN: "HOST_DOWN",
  STOPPED: "STOPPED",
});

/**
 * Phase 33 Plan 03-T2: capped retry constants. Forever-retry is forbidden
 * (research finding R-7). After whichever of these caps trips first, we
 * transition to GIVEN_UP — the operator must click Retry to get out.
 */
export const MAX_RECONNECT_ATTEMPTS_BEFORE_GIVEUP = 10;
export const MAX_TOTAL_RECONNECT_DURATION_MS = 120000; // 2 minutes

/**
 * Phase 39 Plan 39-3 D-02: first-attempt grace window. While in INITIAL_CONNECT,
 * failures silently re-enter INITIAL_CONNECT (no RECONNECTING banner) until
 * this many milliseconds have elapsed since firstAttemptStartedAtMs. After
 * that the state escalates to RECONNECTING and the existing capped-retry
 * budget (10 attempts / 120s) engages.
 *
 * Configurable via process.env.RECEIVER_INITIAL_CONNECT_GRACE_MS (Node test
 * harness) or window.__TT_BEAMER_INITIAL_CONNECT_GRACE_MS (browser-side
 * runtime tuning). Defaults to 5000ms per 39-RESEARCH.md §"D-02 Implementation
 * approach" step 5.
 */
const _ENV_GRACE = (typeof process !== "undefined" && process?.env?.RECEIVER_INITIAL_CONNECT_GRACE_MS) || null;
const _WIN_GRACE = (typeof window !== "undefined" && window?.__TT_BEAMER_INITIAL_CONNECT_GRACE_MS) || null;
export const INITIAL_CONNECT_GRACE_MS = Number(_WIN_GRACE ?? _ENV_GRACE) > 0
  ? Number(_WIN_GRACE ?? _ENV_GRACE)
  : 5000;

/**
 * Phase 33 Plan 03-T1: legal state transitions (Suspect 14 forcing function).
 * Each entry maps a state to the set of states that can be reached from it.
 * Any `setState()` call outside this graph throws — caught in tests, logged
 * loud in production so contract violations surface immediately.
 */
const LEGAL_TRANSITIONS = Object.freeze({
  // Phase 39 Plan 39-3 D-02: cold boot must go via INITIAL_CONNECT
  // (no RECONNECTING banner during the publisher-boot race window).
  // CONNECTING removed from NEW's set — the only legal first move is to
  // INITIAL_CONNECT (or STOPPED for operator-aborted boots).
  [ConnectionState.NEW]:          new Set([ConnectionState.INITIAL_CONNECT, ConnectionState.STOPPED]),
  [ConnectionState.INITIAL_CONNECT]: new Set([
    ConnectionState.CONNECTED,
    ConnectionState.RECONNECTING,
    ConnectionState.HOST_DOWN,
    ConnectionState.STOPPED,
  ]),
  [ConnectionState.CONNECTING]:   new Set([
    ConnectionState.CONNECTED,
    ConnectionState.RECONNECTING,
    ConnectionState.HOST_DOWN,
    ConnectionState.GIVEN_UP,
    ConnectionState.STOPPED,
  ]),
  [ConnectionState.CONNECTED]:    new Set([
    ConnectionState.RECONNECTING,
    ConnectionState.HOST_DOWN,
    ConnectionState.STOPPED,
  ]),
  [ConnectionState.RECONNECTING]: new Set([
    ConnectionState.CONNECTING,
    ConnectionState.HOST_DOWN,
    ConnectionState.GIVEN_UP,
    ConnectionState.STOPPED,
  ]),
  [ConnectionState.HOST_DOWN]:    new Set([
    ConnectionState.CONNECTING,
    ConnectionState.STOPPED,
  ]),
  [ConnectionState.GIVEN_UP]:     new Set([
    ConnectionState.CONNECTING,
    ConnectionState.STOPPED,
  ]),
  [ConnectionState.STOPPED]:      new Set([]), // terminal
});

/**
 * Pure helper — exported for unit tests. Validates that `next` is a legal
 * successor of `current`. Throws `Error` if not.
 *
 * @param {string} current
 * @param {string} next
 */
export function assertLegalTransition(current, next) {
  const allowed = LEGAL_TRANSITIONS[current];
  if (!allowed) {
    throw new Error(`Unknown ConnectionState: ${current}`);
  }
  if (current === next) return; // self-transitions are no-ops, allowed silently
  if (!allowed.has(next)) {
    throw new Error(
      `Illegal ConnectionState transition: ${current} → ${next}`,
    );
  }
}

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
 * Phase 33 Plan 03-T4 (Suspect 11): detect a fresh page-load via the
 * PerformanceNavigationTiming API. Returns true on `navigate` or `reload`.
 * Pure helper — exported for unit tests with a mock perf object.
 *
 * @param {Performance} [perf=performance]
 * @returns {boolean}
 */
export function isFreshPageLoad(perf = (typeof performance !== "undefined" ? performance : null)) {
  if (!perf || typeof perf.getEntriesByType !== "function") return false;
  try {
    const entries = perf.getEntriesByType("navigation");
    if (!entries || entries.length === 0) return false;
    const t = entries[0]?.type;
    return t === "navigate" || t === "reload" || t === "back_forward";
  } catch {
    return false;
  }
}

/**
 * Boot the Pi receiver: splash → connect → video → metric polling +
 * three-indicator monitoring → reconnect → error overlay.
 *
 * @param {object} [opts]
 * @param {Console} [opts.logger]
 * @param {import('./output-live-sync.js').LiveSyncSubscription | null} [opts.liveSync]
 *   Shared live-sync subscription (Phase 35 D-02). When provided,
 *   alignMode + activeProjectionProfileId are read from the subscription
 *   getters and the inline 1Hz /api/live/snapshot poll loop is skipped
 *   (single source of truth across audio-binder + bootAlignMode + here).
 *   When omitted, falls back to the legacy inline poll for backwards
 *   compatibility.
 */
export async function bootReceiver({ logger = console, liveSync = null } = {}) {
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

  // Phase 33 Plan 03-T4 (Suspect 11): clear sessionStorage backoff state on
  // a fresh page-load. The persistence was meant to survive WS-close mid-
  // handshake, NOT a browser refresh. Without this, after a previous failed
  // session (attempts=4) the user reloads → first retry waits 30s → hang UX.
  if (isFreshPageLoad()) {
    clearBackoffState(backoffStorage);
    logger?.log?.("[receiver] fresh page-load detected — sessionStorage backoff cleared");
  }

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
  // Phase 33 Plan 03-T1: high-level connection state. The legacy `pcState`
  // string carried mediasoup-client's RTC enum (`new`/`connecting`/
  // `connected`/`disconnected`/`failed`/`closed`) AND a few overload values
  // (`ws-closed`/`host-down`/`producer-gone`); we now keep an explicit
  // `currentState` in the new enum and map the receiver's emissions through
  // `setState()`. `pcState` is still tracked for the disconnect monitor's
  // RTC-level evaluation (frame-stale only meaningful when RTC reports
  // connected), but is no longer the source of truth for UI/transition logic.
  let currentState = ConnectionState.NEW;
  let pcState = "new"; // raw RTC state from mediasoup-client (used by evaluateDisconnect)
  // Phase 33 Plan 03-T2 (R-7): capped-retry tracking. Records the timestamp
  // of the FIRST failure in the current run; reset on first-frame CONNECTED
  // and on operator Retry. Combined with reconnectAttempts gives us the
  // two-axis cap (attempts OR elapsed).
  let firstFailureAtMs = null;
  // Phase 39 Plan 39-3 D-02: timestamp at which the receiver first entered
  // INITIAL_CONNECT (i.e. when the cold-boot attempt started). Compared
  // against INITIAL_CONNECT_GRACE_MS in handleConnectFailure() to decide
  // whether to stay in INITIAL_CONNECT (silent retry) or escalate to
  // RECONNECTING (banner visible, counts against capped-retry budget).
  // Reset to null on CONNECTED (first frame) and on STOPPED.
  let firstAttemptStartedAtMs = null;
  // Phase 33 Plan 03-T3 (R-2): frames since last entry into CONNECTING.
  // Reset to 0 on every CONNECTING transition; incremented on each `frame`
  // event. Backoff state resets ONLY when this hits 1 (first frame proves
  // RTP is actually flowing). The legacy "reset on pcState===connected"
  // gate could repeatedly satisfy itself without any frames arriving and
  // never escalate to GIVEN_UP.
  let framesSinceLastReconnect = 0;
  // Phase 33 Plan 04-T1: telemetry — last error message + last successful
  // connect timestamp. Drives the status-detail line under the countdown
  // banner so the operator can see WHY without devtools.
  let lastErrorMessage = null;
  let lastSuccessfulConnectAtMs = null;
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

  /**
   * Phase 33 Plan 03-T1: centralized state-transition function. ALL state
   * changes go through this. Validates the transition is legal (throws
   * on contract violation), logs every transition, and runs side-effects
   * keyed off the transition (UI updates, telemetry).
   *
   * NOTE: on illegal transitions we LOG the violation and return early
   * rather than throw at runtime — operations on production hardware
   * mustn't crash on a state-machine bug. The unit tests still throw
   * because they call assertLegalTransition() directly.
   *
   * @param {string} next
   * @param {{ reason?: string }} [opts]
   */
  function setState(next, { reason = "" } = {}) {
    const prev = currentState;
    if (prev === next) return; // idempotent self-transitions

    try {
      assertLegalTransition(prev, next);
    } catch (err) {
      logger?.error?.(`[receiver] ${err.message} (reason=${reason})`);
      // Don't crash the Pi on a contract violation — surface it loudly,
      // then proceed. This lets us catch it in tests AND keep the system
      // resilient if a future code path emits an unexpected state.
    }

    currentState = next;
    logger?.log?.(`[receiver] state ${prev} → ${next}${reason ? ` (${reason})` : ""}`);

    // Phase 39 Plan 39-3 D-02: clear the cold-boot timestamp on STOPPED so
    // a future restart (manual retry from a terminal state goes through
    // CONNECTING, not NEW — but defense-in-depth covers any re-bootstrap).
    if (next === ConnectionState.STOPPED) {
      firstAttemptStartedAtMs = null;
    }

    // 03-T5 (Suspect 14): when leaving HOST_DOWN, also clear pcState so the
    // monitor's `pcState !== "host-down"` legacy guard re-arms naturally.
    // (The new state-machine doesn't depend on it, but pcState is still
    // exposed via getStatus and used by evaluateDisconnect — we want it
    // to reflect a fresh attempt, not the prior terminal label.)
    if (prev === ConnectionState.HOST_DOWN && next !== ConnectionState.HOST_DOWN) {
      pcState = "new";
    }

    // 03-T2: GIVEN_UP entry side-effects — stop retry monitor, clear
    // backoff state (so a manual Retry starts fresh), surface the overlay.
    if (next === ConnectionState.GIVEN_UP) {
      // Cancel any pending retry timer so we don't keep cycling.
      if (pendingRetryTimeout != null) {
        try { clearTimeout(pendingRetryTimeout); } catch {}
        pendingRetryTimeout = null;
      }
      if (typeof countdownStop === "function") { countdownStop(); countdownStop = null; }
      // Clear sessionStorage so a manual Retry truly starts at attempt=1.
      // The capped-retry counters (reconnectAttempts, firstFailureAtMs) are
      // explicitly NOT reset here — that's the manual Retry's job.
      clearBackoffState(backoffStorage);

      // Stop the auto-retry monitor: it must NOT fire tryConnect during
      // GIVEN_UP. Rather than tearing it down, we let the monitor itself
      // gate on `currentState !== GIVEN_UP` (see monitor body below). This
      // keeps the diagnostic chip refreshing during operator-wait.
      try { ui.hideReconnect(); } catch {}
      try { ui.hideSplash(); } catch {}
      try { ui.hideError(); } catch {}
      // GivenUp overlay — operator-actionable Retry button.
      try {
        showGivenUpOverlay({
          doc: (typeof document !== "undefined" ? document : null),
          lastError: lastErrorMessage || "Verbindung dauerhaft verloren",
          attempts: reconnectAttempts,
          lastSuccessAtMs: lastSuccessfulConnectAtMs,
          onRetry: () => doManualRetry(),
        });
      } catch (e) {
        logger?.warn?.(`[receiver] showGivenUpOverlay failed: ${e?.message}`);
      }
    }

    // Hide the GivenUp overlay on any transition out of GIVEN_UP. This
    // covers the manual-Retry path (operator clicked → CONNECTING).
    if (prev === ConnectionState.GIVEN_UP && next !== ConnectionState.GIVEN_UP) {
      try { hideGivenUpOverlay({ doc: (typeof document !== "undefined" ? document : null) }); } catch {}
    }
  }

  /**
   * Phase 33 Plan 03-T2: capped-retry decision. Returns true if we have
   * exceeded MAX_RECONNECT_ATTEMPTS_BEFORE_GIVEUP OR
   * MAX_TOTAL_RECONNECT_DURATION_MS since the first failure.
   *
   * Called immediately after incrementing reconnectAttempts in the catch
   * path. Pure: no UI side effect — the caller drives setState(GIVEN_UP).
   *
   * @returns {boolean}
   */
  function shouldGiveUp() {
    // Phase 39 Plan 39-3 D-02: INITIAL_CONNECT attempts do NOT count against
    // the capped-retry budget. The 10-attempt / 120s cap engages only after
    // the first escalation to RECONNECTING — silent grace-window retries
    // (e.g. ~17 in worst case at 300ms/retry over 5s) must not exhaust the
    // budget before the real reconnect loop even begins.
    if (currentState === ConnectionState.INITIAL_CONNECT) return false;
    if (reconnectAttempts < 1) return false;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS_BEFORE_GIVEUP) return true;
    if (firstFailureAtMs != null) {
      const elapsed = Date.now() - firstFailureAtMs;
      if (elapsed >= MAX_TOTAL_RECONNECT_DURATION_MS) return true;
    }
    return false;
  }

  /**
   * Phase 39 Plan 39-3 D-02: failure routing helper. Centralizes the choice
   * between (a) silent retry while still inside the INITIAL_CONNECT grace
   * window and (b) escalation to RECONNECTING (capped-retry path).
   *
   * - INITIAL_CONNECT + elapsed < grace → schedule a fast silent retry,
   *   stay in INITIAL_CONNECT, do NOT increment reconnectAttempts or set
   *   firstFailureAtMs. No banner shown.
   * - INITIAL_CONNECT + elapsed >= grace → escalate to RECONNECTING,
   *   start the capped-retry budget (reconnectAttempts=1, firstFailureAtMs
   *   set), schedule normal exponential backoff.
   * - Any other source state (CONNECTING/CONNECTED via the existing paths)
   *   → standard escalation: transition to RECONNECTING, increment counters,
   *   schedule reconnect.
   *
   * @param {string} reason - short tag for logs
   */
  function handleConnectFailure(reason) {
    const now = Date.now();
    if (currentState === ConnectionState.INITIAL_CONNECT) {
      const elapsed = firstAttemptStartedAtMs != null
        ? (now - firstAttemptStartedAtMs)
        : Infinity;
      if (elapsed < INITIAL_CONNECT_GRACE_MS) {
        // Silent retry — stay in INITIAL_CONNECT. No banner, no budget hit.
        logger?.log?.(
          `[receiver] initial-connect silent retry (elapsed=${elapsed}ms `
          + `<${INITIAL_CONNECT_GRACE_MS}ms) reason=${reason}`,
        );
        scheduleInitialConnectRetry(reason);
        return;
      }
      // Grace expired — escalate to RECONNECTING and start the capped budget.
      logger?.warn?.(
        `[receiver] initial-connect grace expired after ${elapsed}ms — `
        + `escalating to RECONNECTING (reason=${reason})`,
      );
      setState(ConnectionState.RECONNECTING, { reason: `initial-connect-grace-expired:${reason}` });
      firstFailureAtMs = now;
      reconnectAttempts = 1;
      saveBackoffState({ attempts: reconnectAttempts }, backoffStorage);
      scheduleReconnectAfterFailure(reason);
      return;
    }
    // Existing path: CONNECTING/CONNECTED failure → standard RECONNECTING.
    setState(ConnectionState.RECONNECTING, { reason });
    reconnectAttempts += 1;
    if (firstFailureAtMs == null) firstFailureAtMs = now;
    saveBackoffState({ attempts: reconnectAttempts }, backoffStorage);
    scheduleReconnectAfterFailure(reason);
  }

  /**
   * Phase 39 Plan 39-3 D-02: schedules a quick silent retry during the
   * INITIAL_CONNECT grace window. Fixed 300ms delay — small enough to not
   * delay legitimate cold-boots, large enough to not busy-loop. Does NOT
   * touch reconnectAttempts or firstFailureAtMs (those are for RECONNECTING
   * only).
   */
  function scheduleInitialConnectRetry(_reason) {
    if (pendingRetryTimeout != null) {
      try { clearTimeout(pendingRetryTimeout); } catch {}
    }
    pendingRetryTimeout = setTimeout(() => {
      pendingRetryTimeout = null;
      // Only retry if still in INITIAL_CONNECT (operator could have stopped).
      if (currentState === ConnectionState.INITIAL_CONNECT) {
        tryConnect();
      }
    }, 300);
  }

  /**
   * Phase 39 Plan 39-3 D-02: schedules a normal backoff retry after we've
   * already escalated to RECONNECTING. Mirrors the existing tryConnect catch
   * block's backoff/countdown plumbing — extracted into a helper so both
   * the in-flight catch path AND the post-grace escalation path share it.
   *
   * @param {string} reason - short tag, used for the countdown overlay
   */
  function scheduleReconnectAfterFailure(_reason) {
    const delay = getBackoffDelay(reconnectAttempts - 1);
    if (typeof countdownStop === "function") { countdownStop(); }
    countdownStop = showCountdownReconnect({
      doc: (typeof document !== "undefined" ? document : null),
      delayMs: delay,
      attemptN: reconnectAttempts,
    });
    try {
      setReconnectDetail({
        doc: (typeof document !== "undefined" ? document : null),
        lastError: lastErrorMessage,
        lastSuccessAtMs: lastSuccessfulConnectAtMs,
      });
    } catch {}
    if (pendingRetryTimeout != null) { try { clearTimeout(pendingRetryTimeout); } catch {} }
    pendingRetryTimeout = setTimeout(() => {
      pendingRetryTimeout = null;
      tryConnect();
    }, delay);
  }

  /**
   * Phase 33 Plan 03-T2 + 04-T2: operator-driven manual retry. Resets the
   * capped-retry counters AND the legacy backoff state, hides the overlay,
   * and kicks off a fresh tryConnect. Wired to the GivenUp overlay's
   * "Erneut verbinden" button AND to the existing D-B4 Retry button.
   */
  async function doManualRetry() {
    logger?.log?.("[receiver] manual retry requested");
    reconnectAttempts = 0;
    firstFailureAtMs = null;
    framesSinceLastReconnect = 0;
    clearBackoffState(backoffStorage);
    connectionStableSince = null;
    if (pendingRetryTimeout != null) {
      try { clearTimeout(pendingRetryTimeout); } catch {}
      pendingRetryTimeout = null;
    }
    if (typeof countdownStop === "function") { countdownStop(); countdownStop = null; }
    try { hideGivenUpOverlay({ doc: (typeof document !== "undefined" ? document : null) }); } catch {}
    try { ui.hideError(); } catch {}
    try { ui.hideReconnect(); } catch {}
    ui.showSplash("Reconnecting…");
    setState(ConnectionState.CONNECTING, { reason: "manual-retry" });
    await tryConnect();
  }

  // D-B4 retry button — manual operator escalation. Always available
  // when the error overlay is visible. Re-routes to doManualRetry() so the
  // capped-retry counters reset uniformly across the manual paths.
  ui.onRetry(async () => {
    await doManualRetry();
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
    // Phase 33 Plan 03-T2: refuse to start a new attempt while in GIVEN_UP.
    // The monitor or a stray timer could call us; we honor the operator-wait
    // contract. Manual retry transitions out of GIVEN_UP first.
    if (currentState === ConnectionState.GIVEN_UP) {
      return;
    }
    tryConnectInFlight = true;
    // Phase 39 Plan 39-3 D-02: route the first-ever attempt through
    // INITIAL_CONNECT (no RECONNECTING banner during the 5s grace window).
    // Subsequent attempts (currentState === RECONNECTING or already in
    // INITIAL_CONNECT for a silent retry) follow the existing pathway:
    //   - RECONNECTING → CONNECTING (LEGAL_TRANSITIONS)
    //   - INITIAL_CONNECT → INITIAL_CONNECT (idempotent silent retry)
    if (currentState === ConnectionState.NEW) {
      setState(ConnectionState.INITIAL_CONNECT, { reason: "tryConnect-cold-boot" });
      firstAttemptStartedAtMs = Date.now();
      // Phase 39 Plan 39-3 D-02: render the clean cold-boot splash and
      // explicitly suppress any prior RECONNECTING banner / status-detail
      // line. This is what the operator sees during the 5s grace window.
      try { ui.showInitialConnect("Connecting to render server…"); } catch {}
    } else if (currentState === ConnectionState.RECONNECTING) {
      setState(ConnectionState.CONNECTING, { reason: "tryConnect-reconnect" });
    }
    // If currentState === INITIAL_CONNECT (silent retry during grace), or
    // === CONNECTING (manual-retry path already transitioned us), leave the
    // state untouched — both are valid entry conditions for the attempt.
    // 03-T3: any new attempt starts a fresh frame-arrival window. The
    // backoff reset is gated on this counter reaching 1, NOT on the RTC
    // pcState becoming "connected".
    framesSinceLastReconnect = 0;
    // Phase 33 iter-4 (2026-05-09): reset heartbeat + frame timestamps
    // for the new attempt. ROOT CAUSE of "monitor fire: heartbeat-stale
    // after retry" loops:
    //   - bootstrap inits lastHeartbeatAtMs = performance.now() at T=0
    //   - first tryConnect's createWebRtcReceiver() awaits the consume RPC
    //   - heartbeats arrive on the WS but emit("heartbeat") has no
    //     subscriber yet (onHeartbeat is registered AFTER the await
    //     returns, which it doesn't if consume times out)
    //   - if consume times out at T=10s → tryConnect catch fires → retry
    //   - 1s later monitor evaluates: now-lastHeartbeatAtMs = 11000ms >
    //     8000ms → heartbeat-stale fires → another reconnect attempt
    //   - loop: every retry's monitor instantly fires stale before any
    //     heartbeat can land
    // Resetting both timestamps here gives the new attempt a fresh
    // window to receive a heartbeat / frame before stale-evaluation.
    const _now = performance.now();
    lastFrameAtMs = _now;
    lastHeartbeatAtMs = _now;
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
          // Phase 33 Plan 03-T3 (R-2): we DO NOT reset backoff state here
          // anymore. RTC `connected` only proves DTLS is up, not that RTP
          // is flowing. Wait for the first frame event (see onFrameReceived
          // below) before declaring success.
          tryConnectInFlight = false;
          // Phase 32 D-B3: stop any running countdown and start stable-hide poller.
          if (typeof countdownStop === "function") { countdownStop(); countdownStop = null; }
          // (Stable-hide poller is started on first frame — see below.)
          ui.hideSplash();
        }
        if (s === "failed" || s === "ws-closed" || s === "disconnected") {
          // Reset stable tracker so overlay re-shows on next retry.
          connectionStableSince = null;
          connectionStore.connectionStableAtMs = null;
          if (overlayHidePoller) { clearInterval(overlayHidePoller); overlayHidePoller = null; }
          // 03-T1: capture the last-error reason for telemetry.
          if (s === "failed") lastErrorMessage = "RTC peer-connection failed";
          else if (s === "ws-closed") lastErrorMessage = "WebSocket closed";
          else if (s === "disconnected") lastErrorMessage = "RTC peer-connection disconnected";
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
          lastErrorMessage = "producer-closed (ssr-tab restart)";
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
          // Phase 33 Plan 04-T3 (Suspect 13): the overlay-hide poller wasn't
          // cleared on host-down — it could keep ticking and clobber the
          // error overlay we're about to show.
          if (overlayHidePoller) { clearInterval(overlayHidePoller); overlayHidePoller = null; }
          lastErrorMessage = "Render-Host abgestürzt";
          ui.hideSplash(); // h5: error must be visible above splash
          ui.showError(
            "Render host crashed. The server is restarting the render tab — click Retry to reconnect.",
          );
          setState(ConnectionState.HOST_DOWN, { reason: "server-render-host-down" });
        }
        if (s === "failed" || s === "ws-closed") {
          // Phase 39 Plan 39-3 D-02: suppress the RECONNECTING banner while
          // in INITIAL_CONNECT — the cold-boot splash stays visible during
          // the 5s grace window. handleConnectFailure routes the failure
          // (silent retry vs. escalate) per the grace-window contract.
          if (currentState !== ConnectionState.INITIAL_CONNECT) {
            ui.hideSplash(); // h5: reconnect banner must be visible above splash
            ui.showReconnect(`Server reconnecting (${s})…`);
          }
        }
      });
      // h5: hide the splash on the FIRST received frame too — `connected`
      // state can lag the actual first paint (transport may report
      // `connecting` while frames are already flowing). First frame is
      // the unambiguous proof that the stream is live.
      receiver.onFrameReceived(() => {
        // Phase 33 Plan 03-T3 (R-2): frame-arrival is the canonical "we
        // really connected" signal. Reset backoff state HERE, not on RTC
        // connected, so a connection that never produces frames eventually
        // reaches GIVEN_UP via the capped-retry path.
        framesSinceLastReconnect += 1;
        if (frameCount === 0 || framesSinceLastReconnect === 1) {
          ui.hideSplash();
          ui.hideReconnect();
          ui.hideError();
          // First frame after CONNECTING / INITIAL_CONNECT — declare success.
          reconnectAttempts = 0;
          firstFailureAtMs = null;
          // Phase 39 Plan 39-3 D-02: clear the cold-boot timestamp on success
          // so a future restart-from-STOPPED can re-enter INITIAL_CONNECT.
          firstAttemptStartedAtMs = null;
          lastErrorMessage = null;
          lastSuccessfulConnectAtMs = Date.now();
          clearBackoffState(backoffStorage);
          connectionStableSince = connectionStableSince ?? Date.now();
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
          // Drive the high-level state to CONNECTED. Phase 39 Plan 39-3 D-02:
          // INITIAL_CONNECT → CONNECTED is also legal (happy-path success
          // during the cold-boot grace window).
          if (currentState === ConnectionState.CONNECTING
              || currentState === ConnectionState.INITIAL_CONNECT) {
            setState(ConnectionState.CONNECTED, { reason: "first-frame" });
          }
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
      const errMsg = err?.message ?? String(err);
      logger.error(`[ssr-receiver] connect failed: ${errMsg}`);
      lastErrorMessage = errMsg.slice(0, 80);
      connectionStableSince = null; // reset stable tracker on failure
      // Phase 39 Plan 39-3 D-02: route failure through handleConnectFailure.
      // While in INITIAL_CONNECT during the grace window: silent retry, no
      // RECONNECTING banner, no capped-retry budget hit. After grace expires
      // (or for non-INITIAL_CONNECT states): escalate to RECONNECTING with
      // the existing backoff + countdown plumbing.
      handleConnectFailure(`attempt-failed:${errMsg.slice(0, 40)}`);

      // 03-T2: GIVEN_UP gate — check AFTER handleConnectFailure has updated
      // reconnectAttempts + firstFailureAtMs (only when escalated past the
      // INITIAL_CONNECT grace). shouldGiveUp() returns false during
      // INITIAL_CONNECT, so this branch is a no-op while in grace.
      if (shouldGiveUp()) {
        logger?.warn?.(
          `[receiver] giving up after ${reconnectAttempts} attempts ` +
          `(${Date.now() - firstFailureAtMs}ms elapsed)`,
        );
        // Cancel the pending retry that handleConnectFailure scheduled so we
        // don't fight ourselves on the way into GIVEN_UP.
        if (pendingRetryTimeout != null) {
          try { clearTimeout(pendingRetryTimeout); } catch {}
          pendingRetryTimeout = null;
        }
        if (typeof countdownStop === "function") { countdownStop(); countdownStop = null; }
        setState(ConnectionState.GIVEN_UP, { reason: "max-retries-or-duration" });
        return;
      }
      // The retry timer is owned by scheduleInitialConnectRetry() (silent
      // grace path) or scheduleReconnectAfterFailure() (escalated path).
      // ui.hideSplash() is intentionally NOT called during INITIAL_CONNECT
      // — we want the splash to stay visible across silent retries. It's
      // hidden by the receiver's onConnectionStateChange "connected" branch
      // and the first-frame handler on actual success.
      if (currentState === ConnectionState.RECONNECTING) {
        ui.hideSplash();
      }
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
    //
    // Phase 33 Plan 03-T2 + 03-T5 (Suspect 14): also gate on currentState.
    // GIVEN_UP and HOST_DOWN are operator-action-required terminals; the
    // monitor must NOT fire tryConnect from those states (the operator's
    // Retry handler is the only legal exit). Note the monitor naturally
    // re-arms on the manual-retry path because doManualRetry transitions
    // out of HOST_DOWN/GIVEN_UP, which clears pcState (03-T5 setState side
    // effect) so the next disconnect evaluation starts from a clean slate.
    // 2026-05-14 fix: also block the monitor while a backoff retry is
    // already pending. Without this, the monitor fires every 1 s during
    // RECONNECTING, each fire calls handleConnectFailure → which CANCELS
    // the scheduled pendingRetryTimeout and reschedules with a longer
    // backoff. Net effect: the retry never runs because each monitor tick
    // restarts it, the operator's "retries waren instant statt die
    // Sekunden abzuwarten" complaint. With the gate, the monitor only
    // ticks the diagnostic line; the scheduled retry actually fires on
    // its backoff delay.
    const monitorBlocked =
      tryConnectInFlight ||
      pendingRetryTimeout != null ||
      currentState === ConnectionState.GIVEN_UP ||
      currentState === ConnectionState.HOST_DOWN;
    if (dec.disconnected && !monitorBlocked) {
      // Phase 33 iteration 2 diagnostic: log WHY the monitor fired so the
      // probe can see whether it's pc-failed/pc-disconnected/pc-closed/
      // frame-stale/heartbeat-stale. Without this the state-machine log
      // shows only "monitor-disconnected" with no actionable reason.
      logger?.warn?.(
        `[receiver] monitor fire: reasons=[${dec.reasons.join(",")}] ` +
        `pcState=${pcState} ` +
        `lastFrameAgeMs=${Math.round(now - lastFrameAtMs)} ` +
        `lastHbAgeMs=${Math.round(now - lastHeartbeatAtMs)} ` +
        `attempt=${reconnectAttempts + 1}`,
      );
      // D-B4: surface ALL detected reasons in the banner so the operator
      // sees what triggered the reconnect. Empty banner == no info ==
      // bad UX.
      connectionStableSince = null;
      connectionStore.connectionStableAtMs = null;
      // Surface the detected reasons so the telemetry line has something.
      if (dec.reasons?.length) {
        lastErrorMessage = dec.reasons.join(",").slice(0, 80);
      }
      // Phase 39 Plan 39-3 D-02: route through handleConnectFailure. In
      // monitor context the source state is typically CONNECTED (the
      // monitor doesn't fire from INITIAL_CONNECT because it gates on
      // pcState and INITIAL_CONNECT doesn't have a settled pcState), so
      // this almost always falls through to the standard escalation
      // branch — but the helper centralizes the bookkeeping (counters,
      // backoff schedule, countdown overlay) in one place.
      handleConnectFailure(`monitor:${dec.reasons?.join(",") || "?"}`);
      // 03-T2: capped-retry gate.
      if (shouldGiveUp()) {
        logger?.warn?.(
          `[receiver] monitor: giving up after ${reconnectAttempts} attempts ` +
          `(reasons=${dec.reasons?.join(",") || "?"})`,
        );
        // Cancel the retry scheduled by handleConnectFailure.
        if (pendingRetryTimeout != null) {
          try { clearTimeout(pendingRetryTimeout); } catch {}
          pendingRetryTimeout = null;
        }
        if (typeof countdownStop === "function") { countdownStop(); countdownStop = null; }
        setState(ConnectionState.GIVEN_UP, { reason: "monitor-max-retries-or-duration" });
        try { receiver?.stop(); } catch {}
        return;
      }
      try {
        receiver?.stop();
      } catch {}
    }

    // Phase 32 D-B2: stable-reset — if connected >= STABLE_RESET_THRESHOLD_MS,
    // reset attempts to 0 and clear sessionStorage backoff state.
    if (connectionStableSince !== null && reconnectAttempts > 0) {
      const stableMs = Date.now() - connectionStableSince;
      if (stableMs >= STABLE_RESET_THRESHOLD_MS) {
        reconnectAttempts = 0;
        firstFailureAtMs = null;
        clearBackoffState(backoffStorage);
        connectionStableSince = Date.now(); // re-stamp so we don't keep resetting
      }
    }

    // Phase 33 Plan 04-T1: keep status-detail telemetry fresh (the
    // "letzte Verbindung: 2m 17s" component re-computes per tick).
    if (currentState === ConnectionState.RECONNECTING) {
      try {
        setReconnectDetail({
          doc: (typeof document !== "undefined" ? document : null),
          lastError: lastErrorMessage,
          lastSuccessAtMs: lastSuccessfulConnectAtMs,
        });
      } catch {}
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
  //
  // Phase 35 D-02 (Track B): when a shared liveSync subscription is
  // provided, read state from its getters and subscribe to alignMode
  // changes for the overlay pointer-events toggle. The inline 1Hz
  // /api/live/snapshot poll loop that previously lived here is REMOVED
  // — output-live-sync.js owns that poll now (single source of truth).
  //
  // Legacy fallback: if no liveSync was passed (older callers, pre-35-B
  // bootstraps, tests), the inline poll loop still runs.
  let alignMode = false;
  let currentProfileId = null;
  let snapshotInterval = null;
  let offAlignModeChange = null;
  let offProjectionProfileChange = null;
  if (liveSync) {
    alignMode = Boolean(liveSync.getAlignMode?.());
    currentProfileId = liveSync.getActiveProjectionProfileId?.() ?? null;
    // Phase 36 D-02 (a): overlay pointer-events permanently "none" so handle
    // DOM (z:9999, pointer-events:auto via inline style from handle-ui creation)
    // captures clicks directly. receiver-input-forwarder remains attached but
    // dormant during align-mode-ON — no events reach overlayEl in this model.
    // alignMode state is still tracked because hitTestVertex (Wave-4 fallback
    // when bootHandleUi is not active) gates on it via `isAlignModeActive`.
    overlayEl.style.pointerEvents = "none";
    offAlignModeChange = liveSync.onAlignModeChange?.((enabled) => {
      alignMode = Boolean(enabled);
      // Phase 36 D-02 (a): overlay stays "none" regardless of align-mode toggle.
      overlayEl.style.pointerEvents = "none";
    });
    offProjectionProfileChange = liveSync.onProjectionProfileChange?.((pid) => {
      currentProfileId = pid ?? null;
    });
  } else {
    snapshotInterval = setInterval(async () => {
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
          // Phase 36 D-02 (a): overlay stays "none" in legacy poll fallback too.
          overlayEl.style.pointerEvents = "none";
        }
      } catch {
        /* ignore — next tick retries */
      }
    }, 1000);
  }

  const inputForwarder = attachInputForwarder({
    overlayEl,
    isAlignModeActive: () => liveSync ? Boolean(liveSync.getAlignMode?.()) : alignMode,
    getCurrentProfileId: () => liveSync ? (liveSync.getActiveProjectionProfileId?.() ?? null) : currentProfileId,
    // h19: hand the <video> element to the forwarder so it can map
    // pointer coords from receiver-viewport space to stream-content
    // space (object-fit: cover crops on aspect mismatch — without this,
    // a click at the BOARD's TL in the stream sent the wrong coords).
    getVideoEl: () => videoEl,
    // Phase 35-iter2 h9: 4-corner approximation restored (Phase 34
    // baseline). bootAlignMode rendering on /output/ was partial-
    // reverted — Phase 36 owns the comprehensive align-mode refactor.
    // Until then, /output/ supports basic corner-pull alignment via the
    // 4-corner zones: pointer-down in any quadrant maps to the nearest
    // corner-id (0=TL, 1=TR, 2=BR, 3=BL); receiver-input-forwarder
    // sends `align-corner-drag` mutation; SSR-tab applies via existing
    // align-mode handlers. Operators with full vertex/midpoint/rotation
    // requirements use the dashboard on a separate device for now.
    hitTestVertex: ({ x, y }) => {
      // Map normalized [0..1] to corner-id 0..3:
      //   TL (0,0)..(0.5,0.5) → 0
      //   TR (0.5,0)..(1,0.5) → 1
      //   BR (0.5,0.5)..(1,1) → 2
      //   BL (0,0.5)..(0.5,1) → 3
      if (typeof x !== "number" || typeof y !== "number") return null;
      const right = x >= 0.5;
      const bottom = y >= 0.5;
      if (!right && !bottom) return 0;
      if (right && !bottom) return 1;
      if (right && bottom) return 2;
      return 3;
    },
    logger,
  });

  // Returned for test / debug introspection. The bootstrap is a one-shot
  // top-level coordinator on the page so most callers ignore the return.
  return {
    stop() {
      setState(ConnectionState.STOPPED, { reason: "operator-stop" });
      if (monitorInterval) clearInterval(monitorInterval);
      if (snapshotInterval) clearInterval(snapshotInterval);
      if (typeof offAlignModeChange === "function") { try { offAlignModeChange(); } catch {} }
      if (typeof offProjectionProfileChange === "function") { try { offProjectionProfileChange(); } catch {} }
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
        currentState,
        reconnectAttempts,
        firstFailureAtMs,
        framesSinceLastReconnect,
        lastErrorMessage,
        lastSuccessfulConnectAtMs,
        receivedFps,
        lastFrameAgeMs: performance.now() - lastFrameAtMs,
        heartbeatAgeMs: performance.now() - lastHeartbeatAtMs,
      };
    },
    /** Phase 33 Plan 03-T1: external accessor for the connection state. */
    getCurrentState() { return currentState; },
    /** Phase 33 Plan 03-T2: programmatic manual retry (for tests + UI). */
    manualRetry: () => doManualRetry(),
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
