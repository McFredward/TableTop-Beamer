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

  // Pull global-defaults from the server and reflect diagnosticOverlay
  // into body.dataset so the chip's CSS gate updates immediately. Called
  // on live-hello (initial state) and on every global-config-update
  // envelope. Best-effort — a failed fetch leaves the previous value in
  // place; never throws.
  async function _refreshDiagnosticOverlayFromGlobalDefaults() {
    try {
      const r = await fetch("/api/global-defaults");
      if (!r.ok) return;
      const cfg = await r.json();
      if (cfg && typeof cfg === "object" && Object.prototype.hasOwnProperty.call(cfg, "diagnosticOverlay")) {
        document.body.dataset.diagnosticOverlay = cfg.diagnosticOverlay ? "true" : "false";
      }
    } catch (e) {
      logger?.warn?.("[output-live-sync] global-defaults fetch failed:", e?.message ?? e);
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
  //
  // Phase 38 W3 (2026-05-11): two additional guards address operator-
  // reported regressions:
  //   (a) "Lines snap back to stream after drag-end" — Pi's poll path
  //       was fetching server snapshots that pre-dated Pi's just-finished
  //       drag (round-trip still in-flight) and applying them, clobbering
  //       the optimistic local state. We now track Pi's last local
  //       broadcast time; if a remote snap is older than that (with a
  //       200ms clock-skew tolerance), it's stale → skip apply.
  //   (b) "Complex profile desync" — 9×9 profile broadcasts triggered
  //       large, redundant re-applies at 30Hz (poll + WS). We now dedup
  //       by snap.at; same timestamp → already applied → skip. Also
  //       reduces CPU load during drag bursts.
  let _lastLocalBroadcastAtMs = 0;       // Pi clock — set on every Pi emit
  let _lastAppliedSnapAtMs = 0;           // server clock — last applied snap.at
  // Phase 38 W4 (2026-05-11): cache the LATEST grid snapshot that arrived
  // while window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE was not yet defined.
  //
  // Why this matters: Pi /output/ is the thin Phase-34 HTML that does NOT
  // ship runtime-projection-grid-state.js in its initial script set — that
  // module is part of the IIFE bundle lazy-loaded by
  // output-align-mode-loader.js on the FIRST alignMode=true toggle. The
  // W2 fix wired live-hello + 1Hz poll to call _applyAlignGridSnapshot;
  // those paths fire AS SOON AS the WS connects (i.e. immediately on page
  // load, BEFORE align-mode is toggled and BEFORE the bundle is loaded).
  // The pre-W4 silent-return at the !gs guard meant every server-side
  // snapshot was dropped on the floor until SOME post-bundle broadcast
  // arrived.
  //
  // Worse: the loader's iter2-h2 defensive broadcast fires Pi's grid
  // (still at the 3x3 default since live-hello-seed silently failed)
  // immediately after bundle load — server stores Pi's 3x3 identity as
  // the authoritative snapshot, fanning out to SSR + dashboard. The
  // operator's just-loaded 9x9 xrandrv2 profile gets wiped.
  //
  // W4 fix: when grid-state isn't ready, CACHE the latest snap instead
  // of dropping it. Expose applyPendingGridSnapshot() so the align-mode
  // loader can drain the cache after the bundle finishes initializing
  // and BEFORE the iter2-h2 defensive broadcast fires.
  let _pendingGridSnapshot = null;        // server snap, applied on bundle-ready
  function _applyAlignGridSnapshot(snap) {
    if (!snap || typeof snap !== "object") return;
    if (!Array.isArray(snap.srcXs) || !Array.isArray(snap.srcYs)
        || !Array.isArray(snap.points)) return;
    // Skip self-originator (Pi's own broadcast bouncing back). The local
    // drag handler already mutated grid.points; applying the roundtrip
    // would either be a no-op or clobber a fresh in-flight drag.
    const isOriginator = !!clientId && snap.originatorClientId === clientId;
    if (isOriginator) return;
    // (b) Dedup: skip applies of a snap we've already applied. Server's
    // `at` is unique per mutation (millisecond precision), so identical
    // at = same mutation. Cuts CPU during 30Hz drag bursts: WS dispatches
    // each broadcast AND the 1Hz poll, doubling the apply rate without
    // dedup.
    const snapAt = Date.parse(snap.at);
    if (Number.isFinite(snapAt) && _lastAppliedSnapAtMs > 0
        && snapAt === _lastAppliedSnapAtMs) {
      return;
    }
    // (a) Protect Pi's recent local broadcast from stale remote clobbers.
    // If we emitted locally within the last 2s AND this remote snap's
    // server-clock `at` is OLDER than our last local emission (allowing
    // 200ms clock skew), the server hasn't processed our broadcast yet
    // — applying this older state would lose the operator's input.
    if (_lastLocalBroadcastAtMs > 0 && Number.isFinite(snapAt)) {
      const localAgeMs = Date.now() - _lastLocalBroadcastAtMs;
      const remoteAgeMs = Date.now() - snapAt;
      if (localAgeMs < 2000 && remoteAgeMs > localAgeMs + 200) {
        // Remote snap is older than our local emission by more than
        // clock-skew tolerance → server-side race: Pi's broadcast still
        // in-flight. Skip — Pi's local is the latest truth.
        return;
      }
    }
    const gs = window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE;
    if (!gs || typeof gs.restoreGridSnapshot !== "function") {
      // Phase 38 W4: grid-state module not loaded yet (this is the thin
      // /output/ before its first alignMode toggle). Cache the snap so
      // the loader can drain it once the bundle initializes. Last-writer-
      // wins (idempotent for grid-snapshot — newer snap subsumes older).
      _pendingGridSnapshot = snap;
      return;
    }
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
      if (Number.isFinite(snapAt)) _lastAppliedSnapAtMs = snapAt;
      // Trigger handle-ui redraw so overlay lines reflect the new grid
      // immediately (matches runtime-live-sync-core.js's
      // _redrawHandlesAfterCornerDrag). Best-effort — handle-ui may not
      // be loaded if align-mode hasn't been toggled on yet (lazy loader),
      // in which case the redraw is a no-op and lines update on the next
      // align-mode activation.
      //
      // Phase 38 W3: when the grid DIMENSIONS change (e.g. profile-load
      // from 3×3 default to 9×9 xrandrv2), handle-ui's cached handleElements
      // array no longer matches the grid layout. Call rebuildHandleElements
      // if available so the handle count tracks the new grid before
      // positionHandles iterates.
      const ui = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
      if (ui) {
        try { ui.rebuildHandleElements?.(); } catch {}
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
      // Pull the diagnostic-overlay preference from global-defaults so
      // /output/ reflects the operator's dashboard toggle on first paint.
      _refreshDiagnosticOverlayFromGlobalDefaults();
      emit("connect");
      return;
    }
    // Dashboard toggled a global-defaults field. The only such field
    // visible on /output/ today is diagnosticOverlay — refresh it.
    // Skip asset-manifest broadcasts which use the same envelope type.
    if (envelope.type === "global-config-update") {
      if (envelope.target !== "config/asset-manifest.json") {
        _refreshDiagnosticOverlayFromGlobalDefaults();
      }
      return;
    }
    if (envelope.type !== "live-session-update") return;
    const mt = envelope.mutationType;
    const mutation = envelope.mutation ?? {};
    // Phase 49 gap-closure-6: trace EVERY live-session-update mutationType so
    // operators can confirm which envelopes /output/ actually receives. Audio
    // bug investigation 2026-05-17: operator reported no [output-audio] logs
    // when animations triggered — this log confirms whether start-animation
    // envelopes are even arriving on the WS, vs the animation propagating
    // via context-update snapshots (which wouldn't fire animationStart).
    console.info(`[output-live-sync] mutationType=${mt} (mutation keys: ${Object.keys(mutation).join(",")})`);
    if (mt === "context-update") {
      const snap = envelope?.session?.snapshot;
      if (snap) reconcileSnapshot(snap);
    } else if (mt === "start-animation") {
      console.info(`[output-live-sync] emit animationStart for id=${mutation.animation?.id ?? "?"} soundAssetRef=${JSON.stringify(mutation.animation?.soundAssetRef ?? null)}`);
      emit("animationStart", mutation.animation);
    } else if (mt === "stop-animation") {
      emit("animationStop", mutation.animationId ?? mutation.animation?.id);
    } else if (mt === "trigger-global" || mt === "trigger-room") {
      // Phase 49 gap-closure-8 (2026-05-17): globally-scoped + room-scoped
      // animations are dispatched via `trigger-global` / `trigger-room`
      // mutations from the dashboard, NOT `start-animation`. The dashboard's
      // runtime-runtime-controls.js (line 292) emits these with payload
      // `{animationType, action: "start"|"stop", boardId, playSound, animation}`.
      // /output/'s output-audio-binder needs animationStart events to play
      // sounds — without translating trigger-* → animationStart/Stop the
      // audio path was silent for all non-per-room animations (operator
      // UAT 2026-05-17: "Intruder Alert" scope=global never produced audio).
      const action = mutation?.action;
      const anim = mutation?.animation;
      if (action === "start" && anim) {
        console.info(`[output-live-sync] ${mt} → animationStart for id=${anim.id ?? "?"} type=${anim.type ?? mutation.animationType} soundAssetRef=${JSON.stringify(anim.soundAssetRef ?? null)}`);
        emit("animationStart", anim);
      } else if (action === "stop") {
        const stopId = anim?.id ?? mutation?.animationId ?? null;
        console.info(`[output-live-sync] ${mt} → animationStop for id=${stopId ?? "?"}`);
        if (stopId) emit("animationStop", stopId);
      }
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
        // Phase 38 W3: still mark as "Pi has recent local intent" even
        // when the WS isn't open — protects Pi's local grid from being
        // clobbered by a stale poll snapshot during the WS-closed window.
        if (mutationType === "align-grid-snapshot") {
          _lastLocalBroadcastAtMs = Date.now();
        }
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
      // Phase 38 W3: track Pi's last local broadcast time so the apply
      // path can protect against being clobbered by older remote snapshots
      // during the round-trip window. See _applyAlignGridSnapshot.
      if (mutationType === "align-grid-snapshot") {
        _lastLocalBroadcastAtMs = Date.now();
      }
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
    // Phase 38 W4 (2026-05-11): drain the cached pending grid snapshot
    // and apply it via _applyAlignGridSnapshot. Caller (the align-mode
    // loader) is expected to call this AFTER the IIFE bundle has loaded
    // (so window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE is defined) and
    // BEFORE the loader's iter2-h2 defensive broadcast — otherwise Pi
    // would emit its 3x3 default before adopting the server-side state,
    // overwriting the dashboard's loaded profile on the server.
    applyPendingGridSnapshot() {
      if (!_pendingGridSnapshot) return false;
      const snap = _pendingGridSnapshot;
      _pendingGridSnapshot = null;
      // Direct call into the apply path — re-run all the gates (originator,
      // dedup, skew) for safety, even though the cached snap is by
      // definition from before the bundle existed.
      try {
        _applyAlignGridSnapshot(snap);
        return true;
      } catch (err) {
        logger?.warn?.("[output-live-sync] applyPendingGridSnapshot threw:", err?.message || err);
        return false;
      }
    },
    // Phase 38 W4: expose pending-snapshot presence so callers can decide
    // whether to seed via this path vs. fetch /api/live/snapshot.
    hasPendingGridSnapshot: () => !!_pendingGridSnapshot,
    stop() {
      stopped = true;
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      try { ws?.close(); } catch {}
    },
  };
}
