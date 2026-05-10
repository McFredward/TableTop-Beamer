// Phase 35-iter2 h4 — Raw pointer/keyboard input forwarder for /output/.
//
// Replaces the Phase 31 receiver-input-forwarder.js's narrow-scope
// `align-corner-drag` mutation. The 4-corner approximation only covered
// ONE handle type (corner pulls); operator-reported 2026-05-10 that
// vertex / midpoint / rotation / image-pan / right-click-menu / CTRL+Z
// were all broken on /output/ after Phase 35-A pure-extracted bootAlignMode
// because no broadcast path existed for those interactions.
//
// Architecture (input forwarding):
//   1. /output/ has a transparent #ssr-input-overlay positioned over the
//      <video> element. We capture ALL pointer events + a body-level
//      keydown listener while alignMode is active.
//   2. Each captured event is serialized into an `align-input-event`
//      mutation and POSTed to /api/live/ws (regular live-mutation envelope).
//   3. Server validates payload, writes payload to
//      runtime.lastAlignInputEvent with a monotonic sequenceId, broadcasts
//      via live-session-update.
//   4. SSR Chromium tab's runtime-orchestration (loaded via /ssr) has a
//      receiver that watches runtime.lastAlignInputEvent and dispatches a
//      synthetic event on document at the forwarded clientX/clientY. The
//      EXISTING handle-ui / polygon-editor / runtime-orchestration
//      handlers process it as a local pointer/keyboard event.
//
// SSR resolution alignment: the SSR Chromium tab is launched at the same
// viewport size as the operator's /output/ display. /api/ssr/ready exposes
// the SSR window dimensions so we can scale clientX/clientY when /output/'s
// viewport differs from the SSR resolution. Default: pass-through (1:1).
//
// Why broadcast events as mutations (not a side-channel WS message):
//   - Existing /api/live/ws plumbing already handles fanout, validation,
//     reconnect, originator-skip, ASVS validation. Reusing it is < 100 LOC.
//   - Snapshot churn is bounded: align-mode is operator-driven (not
//     continuous), and the lastAlignInputEvent payload is small (< 200 B).
//   - Pattern matches existing align-corner-drag — operators familiar
//     with the codebase will recognize the shape.

let sequenceCounter = 0;

/**
 * @typedef {Object} InputForwarderOpts
 * @property {Element} overlayEl - Transparent capture overlay over <video>.
 * @property {() => boolean} isAlignModeActive
 * @property {() => string|null} getCurrentProfileId
 * @property {Console} [logger]
 */

/**
 * Attach raw pointer + keyboard event forwarders. Captures all pointer
 * events (down/move/up/click/contextmenu/wheel) and document-level keyboard
 * events (CTRL+Z, etc.) while align-mode is active. Forwards to
 * /api/live/ws as `align-input-event` live-mutations.
 *
 * @param {InputForwarderOpts} opts
 * @returns {{ teardown: () => void }}
 */
export function attachOutputInputForwarder({
  overlayEl,
  isAlignModeActive,
  getCurrentProfileId,
  logger = console,
}) {
  const wsUrl = `ws://${location.host}/api/live/ws?role=final-output-input`;
  let ws = null;
  let reconnectTimer = null;
  let stopped = false;

  function connectWs() {
    if (stopped) return;
    try {
      ws = new WebSocket(wsUrl);
      ws.addEventListener("open", () => {
        logger.info?.("[output-input-forwarder] WS open");
      });
      ws.addEventListener("close", () => {
        ws = null;
        if (stopped) return;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWs, 1000);
      });
      ws.addEventListener("error", (err) => {
        logger.warn?.("[output-input-forwarder] WS error", err?.message ?? err);
      });
    } catch (err) {
      logger.warn?.("[output-input-forwarder] connect failed:", err?.message ?? err);
      reconnectTimer = setTimeout(connectWs, 1000);
    }
  }
  connectWs();

  function send(eventType, e) {
    if (!isAlignModeActive()) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    sequenceCounter = (sequenceCounter + 1) & 0x7fffffff;
    const payload = {
      eventType,
      clientX: clamp(Number(e.clientX) || 0, -10000, 10000),
      clientY: clamp(Number(e.clientY) || 0, -10000, 10000),
      button: Number.isInteger(e.button) ? e.button : 0,
      buttons: Number.isInteger(e.buttons) ? e.buttons : 0,
      key: typeof e.key === "string" ? e.key.slice(0, 32) : "",
      ctrlKey: Boolean(e.ctrlKey),
      shiftKey: Boolean(e.shiftKey),
      altKey: Boolean(e.altKey),
      metaKey: Boolean(e.metaKey),
      deltaX: Number.isFinite(e.deltaX) ? e.deltaX : 0,
      deltaY: Number.isFinite(e.deltaY) ? e.deltaY : 0,
      sequenceId: sequenceCounter,
      profileId: getCurrentProfileId() ?? null,
    };
    const msg = {
      type: "live-mutation",
      mutationId: `align-input-${Date.now()}-${sequenceCounter}`,
      mutationType: "align-input-event",
      payload,
      clientSentAt: new Date().toISOString(),
    };
    try {
      ws.send(JSON.stringify(msg));
      // Log start/end of drags + non-pointermove events at info level for
      // operator-paste-from-devtools debug. pointermove is high-frequency
      // so we sample 1-in-15 to avoid flooding without losing visibility.
      const isMove = eventType === "pointermove";
      send._moveCount = ((send._moveCount || 0) + 1);
      if (!isMove || send._moveCount % 15 === 1) {
        console.log(
          `[output-input-forwarder] sent ${eventType} seq=${sequenceCounter}`,
          `xy=(${payload.clientX.toFixed(0)},${payload.clientY.toFixed(0)})`,
          `btn=${payload.button} buttons=${payload.buttons}`,
        );
      }
    } catch (err) {
      logger.warn?.("[output-input-forwarder] send failed:", err?.message ?? err);
    }
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  // Pointer event capture
  function onPointerDown(e) {
    if (!isAlignModeActive()) return;
    e.preventDefault();
    try { overlayEl.setPointerCapture?.(e.pointerId); } catch {}
    send("pointerdown", e);
  }
  function onPointerMove(e) {
    if (!isAlignModeActive()) return;
    // Only forward moves while a button is held (drag). Hover-moves
    // would flood the WS at 60-120Hz with no upside.
    if (!e.buttons) return;
    send("pointermove", e);
  }
  function onPointerUp(e) {
    if (!isAlignModeActive()) return;
    try { overlayEl.releasePointerCapture?.(e.pointerId); } catch {}
    send("pointerup", e);
  }
  function onClick(e) {
    if (!isAlignModeActive()) return;
    send("click", e);
  }
  function onContextMenu(e) {
    if (!isAlignModeActive()) return;
    e.preventDefault(); // Suppress browser native menu — SSR-tab will dispatch the app's menu
    send("contextmenu", e);
  }
  function onDblClick(e) {
    if (!isAlignModeActive()) return;
    send("dblclick", e);
  }
  function onWheel(e) {
    if (!isAlignModeActive()) return;
    e.preventDefault();
    send("wheel", e);
  }

  // Keyboard capture (document-level — CTRL+Z, arrow keys for fine-tune)
  function onKeyDown(e) {
    if (!isAlignModeActive()) return;
    // Only forward keys we expect align-mode to handle, to avoid forwarding
    // unrelated typing into other dashboard inputs on the SSR tab.
    const isUndoRedo = (e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z" || e.key === "y" || e.key === "Y");
    const isArrow = e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight";
    const isEditKey = e.key === "Delete" || e.key === "Backspace" || e.key === "Enter" || e.key === "Escape";
    if (!isUndoRedo && !isArrow && !isEditKey) return;
    send("keydown", e);
  }

  overlayEl.addEventListener("pointerdown", onPointerDown);
  overlayEl.addEventListener("pointermove", onPointerMove);
  overlayEl.addEventListener("pointerup", onPointerUp);
  overlayEl.addEventListener("pointercancel", onPointerUp);
  overlayEl.addEventListener("click", onClick);
  overlayEl.addEventListener("contextmenu", onContextMenu);
  overlayEl.addEventListener("dblclick", onDblClick);
  overlayEl.addEventListener("wheel", onWheel, { passive: false });
  document.addEventListener("keydown", onKeyDown);

  return {
    teardown() {
      stopped = true;
      overlayEl.removeEventListener("pointerdown", onPointerDown);
      overlayEl.removeEventListener("pointermove", onPointerMove);
      overlayEl.removeEventListener("pointerup", onPointerUp);
      overlayEl.removeEventListener("pointercancel", onPointerUp);
      overlayEl.removeEventListener("click", onClick);
      overlayEl.removeEventListener("contextmenu", onContextMenu);
      overlayEl.removeEventListener("dblclick", onDblClick);
      overlayEl.removeEventListener("wheel", onWheel);
      document.removeEventListener("keydown", onKeyDown);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { ws?.close(); } catch {}
      ws = null;
    },
  };
}
