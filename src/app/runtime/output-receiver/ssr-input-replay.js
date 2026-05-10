// Phase 35-iter2 h5 — SSR Chromium tab event-replay receiver.
//
// Pairs with output-input-forwarder.js. The Pi /output/ forwards raw
// pointer + keyboard events as `align-input-event` mutations via
// /api/live/ws. This module — only active in the SSR Chromium tab —
// listens for those mutations on the live-sync session snapshot and
// dispatches synthetic events on document at the forwarded coords.
//
// The synthetic events flow into the EXISTING handle-ui /
// polygon-editor / runtime-orchestration handlers as if the user had
// clicked directly on the SSR tab. No new handler logic is added —
// every align-mode interaction (corner pull, vertex drag, midpoint
// squish, rotation, image-pan, right-click context menu, CTRL+Z) is
// already wired in the dashboard code path; we just feed it the right
// events.
//
// SSR-tab-only guard: index.html sets `document.body.dataset.ssrTab`
// to "true" when ?ssr=1 / /ssr (Phase 34 D-04). The bootstrap below
// no-ops when the marker is absent so the dashboard's local pointer
// handling is unaffected.

const PROCESSED_SEQUENCE_KEY = "__ttbLastReplayedAlignInputSeq";

function dispatchSyntheticEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== "object") return;
  const { eventType, clientX, clientY } = rawEvent;
  if (typeof eventType !== "string") return;

  // Find the target via document.elementFromPoint — synthetic events
  // dispatched on document don't bubble through the right elements
  // unless we route to elementFromPoint first. Falls back to body if
  // the point is outside the viewport (shouldn't happen but safe).
  const target = document.elementFromPoint(clientX, clientY) ?? document.body;
  if (!target) return;

  // Common init dict for pointer/mouse events. screenX/Y are 1:1 with
  // clientX/Y because the SSR Chromium tab is positioned at (0, 0).
  const baseInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    composed: true,
    clientX,
    clientY,
    screenX: clientX,
    screenY: clientY,
    button: rawEvent.button ?? 0,
    buttons: rawEvent.buttons ?? 0,
    ctrlKey: Boolean(rawEvent.ctrlKey),
    shiftKey: Boolean(rawEvent.shiftKey),
    altKey: Boolean(rawEvent.altKey),
    metaKey: Boolean(rawEvent.metaKey),
  };

  let evt = null;

  if (
    eventType === "pointerdown"
    || eventType === "pointermove"
    || eventType === "pointerup"
    || eventType === "pointercancel"
  ) {
    if (typeof PointerEvent === "function") {
      evt = new PointerEvent(eventType, {
        ...baseInit,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        width: 1,
        height: 1,
        pressure: eventType === "pointerdown" ? 0.5 : 0,
      });
    }
  } else if (eventType === "click" || eventType === "contextmenu" || eventType === "dblclick") {
    if (typeof MouseEvent === "function") {
      evt = new MouseEvent(eventType, baseInit);
    }
  } else if (eventType === "keydown" || eventType === "keyup") {
    if (typeof KeyboardEvent === "function") {
      evt = new KeyboardEvent(eventType, {
        bubbles: true,
        cancelable: true,
        view: window,
        composed: true,
        key: rawEvent.key ?? "",
        ctrlKey: Boolean(rawEvent.ctrlKey),
        shiftKey: Boolean(rawEvent.shiftKey),
        altKey: Boolean(rawEvent.altKey),
        metaKey: Boolean(rawEvent.metaKey),
      });
    }
  } else if (eventType === "wheel") {
    if (typeof WheelEvent === "function") {
      evt = new WheelEvent("wheel", {
        ...baseInit,
        deltaX: rawEvent.deltaX ?? 0,
        deltaY: rawEvent.deltaY ?? 0,
        deltaMode: 0,
      });
    }
  }

  if (!evt) return;

  // Keyboard events go to document/body; pointer + mouse + wheel events
  // route to the element under the pointer.
  const dispatchTarget = (eventType === "keydown" || eventType === "keyup")
    ? (document.activeElement ?? document.body)
    : target;
  try {
    dispatchTarget.dispatchEvent(evt);
  } catch (e) {
    console.warn("[ssr-input-replay] dispatch failed:", e?.message);
  }
}

/**
 * Boot the SSR-tab input replay listener. Subscribes to the runtime
 * snapshot via the existing live-sync infrastructure. Watches
 * runtime.lastAlignInputEvent for sequenceId changes and dispatches
 * synthetic events.
 *
 * Looks for either a passed-in liveSync handle (preferred) or, as a
 * fallback, opens a thin live-sync subscription itself via the
 * proven output-live-sync.js API.
 *
 * @param {Object} [opts]
 * @param {Object} [opts.liveSync] - Optional pre-existing live-sync handle.
 * @param {Console} [opts.logger]
 * @returns {{ stop: () => void } | null}
 */
export function bootSsrInputReplay({ liveSync = null, logger = console } = {}) {
  if (typeof document === "undefined") return null;

  // SSR-tab marker check. Defer-script and module-script execution order
  // is implementation-defined for runtime-orchestration.js (the script
  // that sets document.body.dataset.ssrTab) vs this module's import.
  // If the marker isn't set yet, also check the URL — the SAME rules
  // runtime-orchestration.js uses (Phase 34 D-04: pathname starts with
  // /ssr, or legacy ?ssr=1 query). This avoids a race where this
  // module's check runs before runtime-orchestration.js has stamped
  // the marker on body.
  const isSsrByMarker = document.body?.dataset?.ssrTab === "true";
  const path = (typeof location !== "undefined" && location.pathname) || "";
  const search = (typeof location !== "undefined" && location.search) || "";
  const isSsrByUrl = path === "/ssr" || path.startsWith("/ssr/") || /[?&]ssr=1(\b|&)/.test(search);
  if (!isSsrByMarker && !isSsrByUrl) {
    // No-op outside the SSR Chromium tab. Safe to import on every page.
    return null;
  }

  let stopped = false;
  let pollTimer = null;
  let ws = null;

  function processIfNew(envelope) {
    const snap = envelope?.session?.snapshot ?? envelope?.snapshot ?? envelope ?? null;
    const evt = snap?.runtime?.lastAlignInputEvent;
    if (!evt || typeof evt !== "object") return;
    const seq = Number(evt.sequenceId);
    if (!Number.isFinite(seq)) return;
    const last = window[PROCESSED_SEQUENCE_KEY];
    if (typeof last === "number" && seq <= last) return;
    window[PROCESSED_SEQUENCE_KEY] = seq;
    dispatchSyntheticEvent(evt);
  }

  // Subscribe path. Use the WS directly so we see EVERY snapshot update
  // (including same-content updates due to monotonic sequenceId).
  function connect() {
    if (stopped) return;
    try {
      ws = new WebSocket(`ws://${location.host}/api/live/ws?role=ssr-input-replay`);
      ws.addEventListener("message", (msgEvt) => {
        try {
          const envelope = JSON.parse(msgEvt.data);
          if (envelope?.type !== "live-hello" && envelope?.type !== "live-session-update") return;
          processIfNew(envelope);
        } catch {}
      });
      ws.addEventListener("close", () => {
        ws = null;
        if (!stopped) setTimeout(connect, 1000);
      });
      ws.addEventListener("error", () => { /* close handler reconnects */ });
    } catch (err) {
      logger.warn?.("[ssr-input-replay] WS connect failed:", err?.message ?? err);
      setTimeout(connect, 1000);
    }
  }
  connect();

  logger.log?.("[ssr-input-replay] active in SSR tab");

  return {
    stop() {
      stopped = true;
      if (pollTimer) clearInterval(pollTimer);
      try { ws?.close(); } catch {}
      ws = null;
    },
  };
}

if (typeof globalThis !== "undefined" && typeof globalThis.window !== "undefined") {
  globalThis.window.TT_BEAMER_SSR_INPUT_REPLAY = { bootSsrInputReplay };
}
