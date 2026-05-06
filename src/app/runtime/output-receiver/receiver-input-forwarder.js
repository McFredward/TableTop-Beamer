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
  // Phase-31 h19 (2026-05-06): inject the <video> element so we can map
  // pointer coords from receiver-viewport space → stream-content space.
  // Without this, the user clicked at viewport (0, 0.5) and we sent
  // grid coords (0, 0.5) — but with object-fit: cover the stream's
  // actual content was cropped, so (0, 0.5) didn't correspond to the
  // board's top-left edge that the user was AIMING at.
  getVideoEl = () => null,
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

  // Phase-31 h19: map pointer coords from receiver-viewport pixels to
  // STREAM-CONTENT-NORMALIZED [0..1] space. The stream is encoded at the
  // SSR tab's page dimensions (e.g. 1920×1080); the <video> displays it
  // with object-fit: cover, so the visible rect on the receiver may be
  // larger than the viewport and clipped. We compute the visible stream
  // rect from videoEl.videoWidth/Height + viewport dims, then convert
  // the click position to (clickX - streamLeft) / streamWidth.
  //
  // When videoEl is missing or videoWidth=0 (no frame yet) we fall back
  // to overlay-rect normalization so the previous behavior is preserved.
  function pointerToNormalized(e) {
    const rect = overlayEl.getBoundingClientRect();
    const videoEl = typeof getVideoEl === "function" ? getVideoEl() : null;
    const vw = Number(videoEl?.videoWidth || 0);
    const vh = Number(videoEl?.videoHeight || 0);
    if (vw <= 0 || vh <= 0 || rect.width <= 0 || rect.height <= 0) {
      return {
        normalizedX: (e.clientX - rect.left) / rect.width,
        normalizedY: (e.clientY - rect.top) / rect.height,
      };
    }
    // object-fit: cover — scale to fill the longer axis, crop the shorter.
    const viewportAspect = rect.width / rect.height;
    const streamAspect = vw / vh;
    let displayedW, displayedH, offsetX, offsetY;
    if (streamAspect > viewportAspect) {
      // stream is wider than viewport → cover scales to fill height,
      // crops left/right. Visible stream content is the centered slice
      // of the viewport in X, full height.
      displayedH = rect.height;
      displayedW = rect.height * streamAspect;
      offsetX = (rect.width - displayedW) / 2;
      offsetY = 0;
    } else {
      // stream is taller than viewport → cover scales to fill width,
      // crops top/bottom. Visible content is centered in Y.
      displayedW = rect.width;
      displayedH = rect.width / streamAspect;
      offsetX = 0;
      offsetY = (rect.height - displayedH) / 2;
    }
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    // Map into stream-content space, clamped to [0..1] (clicks outside
    // the visible content area shouldn't crash, just clamp to nearest
    // edge — the SSR-side handler clamps too).
    const nx = Math.max(0, Math.min(1, (localX - offsetX) / displayedW));
    const ny = Math.max(0, Math.min(1, (localY - offsetY) / displayedH));
    return { normalizedX: nx, normalizedY: ny };
  }

  // h19: viewport-relative normalize for the ghost (so the visual lands
  // under the user's finger, regardless of object-fit cropping).
  function pointerToViewportNormalized(e) {
    const rect = overlayEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { vx: 0, vy: 0 };
    return {
      vx: (e.clientX - rect.left) / rect.width,
      vy: (e.clientY - rect.top) / rect.height,
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
    const { vx, vy } = pointerToViewportNormalized(e);
    moveGhost(vx, vy);
    sendDrag("start", vid, normalizedX, normalizedY);
  }

  function onPointerMove(e) {
    if (activeVertexId == null) return;
    const { normalizedX, normalizedY } = pointerToNormalized(e);
    const { vx, vy } = pointerToViewportNormalized(e);
    moveGhost(vx, vy);
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
