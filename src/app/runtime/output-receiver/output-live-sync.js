// Phase 35 D-02 (Track B) — Thin live-sync subscriber for /output/.
//
// NEW, parallel module to runtime-live-sync-core.js — NOT an extraction.
// Per 35-RESEARCH.md §B.1, the dashboard's live-sync core is entangled
// with ~30 ctx callbacks (playSoundForAnimation, persistGridState,
// applyTransform, ...). Pulling the subscription primitive out cleanly
// would break those closures — high regression risk. The thin /output/
// needs none of that; we model a small focused subscriber on the proven
// output-audio-binder.js WS reconnect pattern instead.
//
// Contract — bootOutputLiveSync({ logger, role, url }) returns:
//   7 callback registrars (each: handler → unsubscribe):
//     onAnimationStart, onAnimationStop, onClearAll,
//     onAlignModeChange, onProjectionProfileChange,
//     onConnect, onDisconnect
//   3 getters: getAlignMode, getActiveProjectionProfileId, getCurrentClientId
//   1 teardown: stop()
//
// Behaviour:
//   1. Open WS to /api/live/ws?role=final-output (overridable via url).
//   2. Reconnect on close with exponential backoff
//      [500,1000,2000,5000,10000,30000]ms (T-35-B-01 mitigation).
//   3. Parse envelopes:
//        live-hello             → seed clientId + initial snapshot, emit "connect".
//        live-session-update with mutationType:
//          context-update       → reconcile alignMode + projectionProfileId
//          start-animation      → emit "animationStart", animation
//          stop-animation       → emit "animationStop", animationId
//          clear-all            → emit "clearAll"
//   4. Cold-start fallback: 1Hz GET /api/live/snapshot (covers the gap
//      between page load and live-hello, replaces the inline poll loop
//      receiver-bootstrap.js used to run at lines 968-987).
//   5. Malformed JSON envelopes silently dropped (T-35-B-03 mitigation).
//
// @typedef {Object} LiveSyncSubscription
// @property {(handler: (animation: any) => void) => () => void} onAnimationStart
// @property {(handler: (animationId: string) => void) => () => void} onAnimationStop
// @property {(handler: () => void) => () => void} onClearAll
// @property {(handler: (alignMode: boolean) => void) => () => void} onAlignModeChange
// @property {(handler: (profileId: string|null) => void) => () => void} onProjectionProfileChange
// @property {(handler: () => void) => () => void} onConnect
// @property {(handler: () => void) => () => void} onDisconnect
// @property {() => boolean} getAlignMode
// @property {() => string|null} getActiveProjectionProfileId
// @property {() => string|null} getCurrentClientId
// @property {() => void} stop

const RECONNECT_BACKOFF_MS = [500, 1000, 2000, 5000, 10000, 30000];

/**
 * Boot a thin live-sync subscriber for the /output/ thin path.
 *
 * @param {{ logger?: Console, role?: string, url?: string }} [opts]
 * @returns {LiveSyncSubscription}
 */
export function bootOutputLiveSync({ logger = console, role = "final-output", url } = {}) {
  const proto = (typeof window !== "undefined" && window.location?.protocol === "https:") ? "wss:" : "ws:";
  const host = (typeof window !== "undefined" && window.location?.host) ? window.location.host : "localhost";
  const wsUrl = url ?? `${proto}//${host}/api/live/ws?role=${role}`;

  const handlers = {
    animationStart: new Set(),
    animationStop: new Set(),
    clearAll: new Set(),
    alignModeChange: new Set(),
    projectionProfileChange: new Set(),
    connect: new Set(),
    disconnect: new Set(),
    // Phase 38 W2: align-grid-snapshot subscription so consumers can react
    // to remote grid mutations (e.g. force a handle-ui redraw after the
    // local grid is replaced).
    alignGridSnapshot: new Set(),
  };
  let alignMode = false;
  let profileId = null;
  let clientId = null;
  let ws = null;
  let stopped = false;
  let attempt = 0;
  let reconnectTimer = null;
  let pollTimer = null;
  // Phase 36 iter2 h7 (2026-05-10): single-slot per-type queue for
  // mutations attempted while ws is not OPEN. Flushed on next ws.open.
  // Keys are mutation-type strings; values are the LATEST payload
  // attempted (last writer wins — grid-snapshot is idempotent).
  const _pendingLatestByType = new Map();

  function emit(event, ...args) {
    for (const h of handlers[event]) {
      try { h(...args); }
      catch (e) { logger?.warn?.(`[output-live-sync] ${event} handler threw:`, e?.message ?? e); }
    }
  }

  function on(event) {
    return (handler) => {
      handlers[event].add(handler);
      return () => handlers[event].delete(handler);
    };
  }

  function reconcileSnapshot(snap) {
    if (!snap || typeof snap !== "object") return;
    if (typeof snap.alignMode === "boolean" && snap.alignMode !== alignMode) {
      alignMode = snap.alignMode;
      emit("alignModeChange", alignMode);
    }
    const pid =
      snap?.runtime?.activeProjectionProfileId
      ?? snap?.selectedBoard?.lastUsedProfileName
      ?? (typeof snap?.selectedBoard === "string" ? snap.selectedBoard : null)
      ?? null;
    if (pid !== profileId) {
      profileId = pid;
      emit("projectionProfileChange", profileId);
    }
  }

  // Phase 38 W2 (2026-05-11): Pi /output/'s thin live-sync must apply
  // incoming align-grid-snapshot broadcasts to grid-state directly.
  //
  // Background: Pi /output/ does NOT load runtime-live-sync-core.js (full
  // module) — only this thin module + the lazy align-mode-loader bundle.
  // The full module's WS message handler has fast-path apply for
  // align-grid-snapshot; this thin module previously didn't, so Pi's local
  // grid never updated from remote broadcasts. Result (operator UAT
  // 2026-05-11): "linien an einer leicht verschobenen stelle gegenüber dem
  // was der Stream anzeigt" — Pi's overlay lines drawn from stale grid,
  // while SSR-tab's streamed mesh-warp updated correctly.
  //
  // Fix: when an align-grid-snapshot envelope arrives, build the points2D
  // representation and call gridState.restoreGridSnapshot directly (gated
  // by originator-filter so Pi doesn't clobber its own local drag with
  // its own broadcast roundtrip).
  function _applyAlignGridSnapshot(snap) {
    if (!snap || typeof snap !== "object") return;
    if (!Array.isArray(snap.srcXs) || !Array.isArray(snap.srcYs)
        || !Array.isArray(snap.points)) return;
    // Skip self-originator (Pi's own broadcast bouncing back). The local
    // drag handler already mutated grid.points; applying the roundtrip
    // would either be a no-op or clobber a fresh in-flight drag.
    const isOriginator = !!clientId && snap.originatorClientId === clientId;
    if (isOriginator) return;
    const gs = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
    if (!gs || typeof gs.restoreGridSnapshot !== "function") return;
    try {
      const points2D = [];
      for (let r = 0; r < snap.srcYs.length; r++) {
        points2D[r] = [];
        for (let c = 0; c < snap.srcXs.length; c++) {
          points2D[r][c] = { x: snap.srcXs[c], y: snap.srcYs[r] };
        }
      }
      for (const pt of snap.points) {
        if (Number.isInteger(pt.row) && Number.isInteger(pt.col)
            && points2D[pt.row] && points2D[pt.row][pt.col]) {
          points2D[pt.row][pt.col] = { x: pt.x, y: pt.y };
        }
      }
      gs.restoreGridSnapshot({
        srcXs: snap.srcXs.slice(),
        srcYs: snap.srcYs.slice(),
        points: points2D,
      });
      // Trigger handle-ui redraw so overlay lines reflect the new grid
      // immediately (matches runtime-live-sync-core.js's
      // _redrawHandlesAfterCornerDrag). Best-effort — handle-ui may not
      // be loaded if align-mode hasn't been toggled on yet (lazy loader),
      // in which case the redraw is a no-op and lines update on the next
      // align-mode activation.
      const ui = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
      if (ui) {
        try { ui.positionHandles?.(); } catch {}
        try { ui.positionRotateHandles?.(); } catch {}
        try { ui.drawLines?.(); } catch {}
      }
    } catch (err) {
      logger?.warn?.("[output-live-sync] align-grid-snapshot apply failed:", err?.message || err);
    }
  }

  function dispatch(envelope) {
    if (!envelope || typeof envelope !== "object") return;
    if (envelope.type === "live-hello") {
      clientId = envelope.clientId ?? null;
      const snap = envelope?.session?.snapshot;
      if (snap) reconcileSnapshot(snap);
      // Phase 38 W2: also seed Pi's grid from the hello snapshot's
      // lastAlignGridSnapshot. Without this, Pi's grid stays at its
      // localStorage default while dashboard/SSR are already at the
      // server-persisted state → first-paint desync until next broadcast.
      try {
        const helloGrid = envelope?.session?.snapshot?.runtime?.lastAlignGridSnapshot;
        if (helloGrid) _applyAlignGridSnapshot(helloGrid);
      } catch {}
      emit("connect");
      return;
    }
    if (envelope.type !== "live-session-update") return;
    const mt = envelope.mutationType;
    const mutation = envelope.mutation ?? {};
    if (mt === "context-update") {
      const snap = envelope?.session?.snapshot;
      if (snap) reconcileSnapshot(snap);
    } else if (mt === "start-animation") {
      emit("animationStart", mutation.animation);
    } else if (mt === "stop-animation") {
      emit("animationStop", mutation.animationId ?? mutation.animation?.id);
    } else if (mt === "clear-all") {
      emit("clearAll");
    } else if (mt === "align-grid-snapshot") {
      // Phase 38 W2: apply the broadcast grid directly to grid-state.
      const snap = envelope?.session?.snapshot?.runtime?.lastAlignGridSnapshot;
      _applyAlignGridSnapshot(snap);
      emit("alignGridSnapshot", snap);
    }
  }

  function delayMs() {
    return RECONNECT_BACKOFF_MS[Math.min(attempt, RECONNECT_BACKOFF_MS.length - 1)];
  }

  function scheduleReconnect() {
    if (stopped) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, delayMs());
  }

  function connect() {
    if (stopped) return;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      logger?.warn?.(`[output-live-sync] WS construct failed: ${e?.message ?? e}`);
      scheduleReconnect();
      return;
    }
    ws.addEventListener("open", () => {
      attempt = 0;
      logger?.log?.("[output-live-sync] WS open");
      // Phase 36 iter2 h7 (2026-05-10): flush any mutations that were
      // queued while ws was not OPEN. Operator UAT root cause: profile-
      // load broadcast fires while ws is mid-close-handshake → silently
      // dropped → SSR tab never receives → stream stays stale until
      // user makes a small drag (which broadcasts again post-reconnect).
      // The queue stores the LATEST mutation per type (idempotent for
      // grid-snapshot — last writer wins) so no broadcast storm even
      // if multiple emits happened during the WS down window.
      try {
        if (_pendingLatestByType.size > 0) {
          for (const [mType, mPayload] of _pendingLatestByType) {
            const mutationId = `${mType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-flush`;
            try {
              ws.send(JSON.stringify({
                type: "live-mutation",
                mutationId,
                mutationType: mType,
                payload: mPayload,
                clientSentAt: new Date().toISOString(),
              }));
              logger?.log?.(`[output-live-sync] flushed pending mutation type=${mType} on WS reopen`);
            } catch (e) {
              logger?.warn?.(`[output-live-sync] flush send failed type=${mType}:`, e?.message);
            }
          }
          _pendingLatestByType.clear();
        }
      } catch (err) {
        logger?.warn?.("[output-live-sync] flush failed:", err?.message || err);
      }
      // NOTE: emit("connect") is fired from dispatch() on live-hello,
      // not here. Adding it here would double-fire onConnect handlers.
    });
    ws.addEventListener("message", (event) => {
      try { dispatch(JSON.parse(event.data)); }
      catch { /* malformed envelope — silently skip per T-35-B-03 */ }
    });
    ws.addEventListener("close", () => {
      logger?.log?.(`[output-live-sync] WS close — reconnect in ${delayMs()}ms`);
      attempt += 1;
      emit("disconnect");
      scheduleReconnect();
    });
    ws.addEventListener("error", () => {
      // close handler owns the reconnect schedule; error is informational.
    });
  }

  async function pollOnce() {
    if (stopped) return;
    try {
      const r = await fetch("/api/live/snapshot");
      if (r.ok) {
        const j = await r.json();
        const snap = j?.snapshot ?? j?.session?.snapshot ?? j ?? {};
        reconcileSnapshot(snap);
        // Phase 38 W2: also reconcile the grid snapshot. This is the
        // safety net for WS-packet-loss — even if a single align-grid-
        // snapshot broadcast was dropped on the wire, the 1Hz poll
        // catches up within ~1s. Idempotent (no-op when grid already
        // matches; gated by originator-filter inside _applyAlignGridSnapshot).
        try {
          const pollGrid = snap?.runtime?.lastAlignGridSnapshot;
          if (pollGrid) _applyAlignGridSnapshot(pollGrid);
        } catch {}
      }
    } catch {
      /* ignore — next tick retries */
    }
  }

  // Cold-start: kick a poll immediately, then run at 1Hz until stopped.
  // The WS will overtake this once live-hello arrives, but the poll
  // remains as a redundancy net (cheap; same payload as Phase 13's existing route).
  pollTimer = setInterval(pollOnce, 1000);
  pollOnce();
  connect();

  // Phase 36 A1 — emitLiveMutation (RESEARCH §1.3 critical fix #1, §1.5).
  // Mirrors runtime-live-sync-core.js's emitLiveMutation envelope shape so the
  // server-side validator accepts mutations from /output/. Used by grid-state's
  // broadcastGridSnapshot when wired through liveSyncCoreOverride. Returns
  // silently if ws is null or not OPEN (caller logs upstream if it cares).
  function emitLiveMutation(mutationType, payload) {
    try {
      // Phase 36 iter2 h7 (2026-05-10): queue-and-flush instead of
      // silently dropping when ws is not OPEN. The previous behavior
      // (drop + warn) lost mutations during WS close handshakes or
      // reconnect windows — including the operator's profile-load
      // broadcast. Now: store LATEST mutation per type and flush on
      // next ws.open. Idempotent for grid-snapshot (last writer wins).
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        _pendingLatestByType.set(mutationType, payload);
        console.warn(`[output-live-sync] emitLiveMutation queued — ws not OPEN (type=${mutationType}, queue=${_pendingLatestByType.size})`);
        return;
      }
      const mutationId = `${mutationType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      ws.send(JSON.stringify({
        type: "live-mutation",
        mutationId,
        mutationType,
        payload,
        clientSentAt: new Date().toISOString(),
      }));
    } catch (err) {
      // If send threw (e.g., ws transitioned to CLOSING between the
      // readyState check and send), queue the mutation for retry on
      // the next reconnect.
      try {
        _pendingLatestByType.set(mutationType, payload);
        console.warn(`[output-live-sync] emitLiveMutation send threw — queued for retry (type=${mutationType}):`, err?.message || err);
      } catch (e) {
        console.warn("[output-live-sync] emitLiveMutation failed:", err?.message || err);
      }
    }
  }

  return {
    onAnimationStart: on("animationStart"),
    onAnimationStop: on("animationStop"),
    onClearAll: on("clearAll"),
    onAlignModeChange: on("alignModeChange"),
    onProjectionProfileChange: on("projectionProfileChange"),
    onConnect: on("connect"),
    onDisconnect: on("disconnect"),
    onAlignGridSnapshot: on("alignGridSnapshot"),
    getAlignMode: () => alignMode,
    getActiveProjectionProfileId: () => profileId,
    getCurrentClientId: () => clientId,
    // Phase 36 iter2 h3 (2026-05-10): expose ws-open state so callers
    // can defer emitLiveMutation until the connection is established.
    // The HTTP-poll-fallback path can fire onAlignModeChange BEFORE the
    // WS handshake completes — in that window emitLiveMutation silently
    // drops the message, breaking h2's defensive grid-resync broadcast.
    isWsOpen: () => ws?.readyState === WebSocket.OPEN,
    emitLiveMutation,
    stop() {
      stopped = true;
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      try { ws?.close(); } catch {}
    },
  };
}
