// src/app/runtime/output-receiver/receiver-input-forwarder.js
//
// Phase 31 Plan 04 — D-D1 Align-Mode round-trip on Pi /output/.
//
// Forwards pointer events (touch + mouse) during align-mode to the server's
// existing /api/live/ws live-sync channel as `align-corner-drag` mutations.
// Server validates the payload (V5 ASVS in server.mjs:validateAlignCornerDragPayload)
// and broadcasts it via fanout — the SSR Chromium tab and Pi /output/ are
// just live-sync clients receiving the snapshot update. The SSR tab's
// existing align-mode handlers translate the drag into a mesh-warp profile
// update, which the Pi sees through the next streamed video frame.
//
// Pitfall 6 mitigation (RESEARCH § Component sketch §4): a local SVG
// "ghost" circle follows the user's finger immediately so the operator
// gets <16ms visual feedback, even before the round-tripped server frame
// arrives (~30-150ms in LAN). The ghost is hidden on pointerup.

/**
 * @typedef {Object} InputForwarderOpts
 * @property {Element} overlayEl — transparent capture overlay positioned over <video>
 * @property {() => boolean} isAlignModeActive — reads alignMode from local snapshot mirror
 * @property {() => string|null} getCurrentProfileId — returns active projection-profile id
 * @property {(point: {x:number, y:number}) => number|null} hitTestVertex — vertex idx under pointer or null
 * @property {Console} [logger]
 */

/**
 * Attach pointer event listeners to overlayEl, send align-corner-drag
 * mutations on every drag, and render an immediate-feedback SVG ghost.
 *
 * @param {InputForwarderOpts} opts
 * @returns {{teardown: () => void}}
 */
export function attachInputForwarder({
  overlayEl,
  isAlignModeActive,
  getCurrentProfileId,
  hitTestVertex,
  logger = console,
}) {
  const wsUrl = `ws://${location.host}/api/live/ws?role=final-output-input`;
  let ws = null;
  let activeVertexId = null;
  let ghostEl = null;
  let svgEl = null;
  let reconnectTimer = null;

  function connectWs() {
    try {
      ws = new WebSocket(wsUrl);
      ws.addEventListener("open", () => {
        logger.info?.("[input-forwarder] WS open");
      });
      ws.addEventListener("close", () => {
        ws = null;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWs, 1000);
      });
      ws.addEventListener("error", (err) => {
        logger.warn?.("[input-forwarder] WS error", err);
      });
    } catch (err) {
      logger.warn?.("[input-forwarder] WS connect failed", err);
      reconnectTimer = setTimeout(connectWs, 1000);
    }
  }
  connectWs();

  function sendDrag(phase, vertexId, normalizedX, normalizedY) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const profileId = getCurrentProfileId();
    if (!profileId) return;
    const clampedX = Math.max(0, Math.min(1, normalizedX));
    const clampedY = Math.max(0, Math.min(1, normalizedY));
    const msg = {
      type: "live-mutation",
      mutationId: `align-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mutationType: "align-corner-drag",
      payload: {
        phase,
        vertexId,
        normalizedX: clampedX,
        normalizedY: clampedY,
        profileId,
      },
      clientSentAt: new Date().toISOString(),
    };
    try {
      ws.send(JSON.stringify(msg));
    } catch (err) {
      logger.warn?.("[input-forwarder] WS send failed", err);
    }
  }

  // Pitfall 6: local SVG ghost for instant visual feedback.
  function ensureGhost() {
    if (ghostEl) return;
    svgEl = document.getElementById("ssr-ghost-svg");
    if (!svgEl) {
      svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgEl.id = "ssr-ghost-svg";
      svgEl.setAttribute("viewBox", "0 0 100 100");
      svgEl.setAttribute("preserveAspectRatio", "none");
      svgEl.style.cssText =
        "position:fixed;inset:0;width:100vw;height:100vh;z-index:5;pointer-events:none";
      document.body.appendChild(svgEl);
    }
    ghostEl = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ghostEl.setAttribute("r", "1.5");
    ghostEl.setAttribute("fill", "rgba(50,211,163,0.6)");
    ghostEl.setAttribute("stroke", "#fff");
    ghostEl.setAttribute("stroke-width", "0.5");
    ghostEl.style.pointerEvents = "none";
    svgEl.appendChild(ghostEl);
  }

  function moveGhost(normalizedX, normalizedY) {
    ensureGhost();
    ghostEl.setAttribute("cx", String(normalizedX * 100));
    ghostEl.setAttribute("cy", String(normalizedY * 100));
    ghostEl.style.display = "block";
  }

  function hideGhost() {
    if (ghostEl) ghostEl.style.display = "none";
  }

  function pointerToNormalized(e) {
    const rect = overlayEl.getBoundingClientRect();
    return {
      normalizedX: (e.clientX - rect.left) / rect.width,
      normalizedY: (e.clientY - rect.top) / rect.height,
    };
  }

  function onPointerDown(e) {
    if (!isAlignModeActive()) return;
    e.preventDefault();
    try {
      overlayEl.setPointerCapture(e.pointerId);
    } catch {}
    const { normalizedX, normalizedY } = pointerToNormalized(e);
    const vid = hitTestVertex({ x: normalizedX, y: normalizedY });
    if (vid == null) return;
    activeVertexId = vid;
    moveGhost(normalizedX, normalizedY);
    sendDrag("start", vid, normalizedX, normalizedY);
  }

  function onPointerMove(e) {
    if (activeVertexId == null) return;
    const { normalizedX, normalizedY } = pointerToNormalized(e);
    moveGhost(normalizedX, normalizedY);
    sendDrag("move", activeVertexId, normalizedX, normalizedY);
  }

  function onPointerUp(e) {
    if (activeVertexId == null) return;
    const { normalizedX, normalizedY } = pointerToNormalized(e);
    sendDrag("end", activeVertexId, normalizedX, normalizedY);
    activeVertexId = null;
    try {
      overlayEl.releasePointerCapture(e.pointerId);
    } catch {}
    hideGhost();
  }

  overlayEl.addEventListener("pointerdown", onPointerDown);
  overlayEl.addEventListener("pointermove", onPointerMove);
  overlayEl.addEventListener("pointerup", onPointerUp);
  overlayEl.addEventListener("pointercancel", onPointerUp);

  return {
    teardown: () => {
      overlayEl.removeEventListener("pointerdown", onPointerDown);
      overlayEl.removeEventListener("pointermove", onPointerMove);
      overlayEl.removeEventListener("pointerup", onPointerUp);
      overlayEl.removeEventListener("pointercancel", onPointerUp);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {}
      ws = null;
      if (ghostEl) ghostEl.remove();
      ghostEl = null;
      const svg = document.getElementById("ssr-ghost-svg");
      if (svg) svg.remove();
      svgEl = null;
    },
  };
}
