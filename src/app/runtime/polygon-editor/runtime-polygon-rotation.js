// Phase 21-1: optional polygon rotation mode.
//
// When a room is put into "rotation mode" (via right-click → Rotate
// polygon in the polygon-context-menu), pointer-drag on that room's
// polygon rotates it around its centroid instead of translating or
// editing individual vertices. The user exits via right-click → Exit
// rotation (or ESC).
//
// The module keeps rotation state on ctx.state.polygonEditor.rotatingRoomId
// and a small set of sibling fields that are populated only for the
// duration of a single drag. Render paths that care (e.g., overlay
// styling) can read rotatingRoomId directly.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
    bindOverlayEvents();
    bindDismissEvents();
  }

  function enterRotationMode(roomId) {
    const state = ctx.state;
    if (!roomId) return;
    if (state.uiView !== "settings") return;
    state.polygonEditor.rotatingRoomId = roomId;
    state.polygonEditor.rotateBoardId = state.boardId;
    state.polygonEditor.rotatePointerId = null;
    state.polygonEditor.rotateStartAngle = 0;
    state.polygonEditor.rotateStartPoints = null;
    state.polygonEditor.rotateCenter = null;
    state.polygonEditor.rotateMoved = false;
    ctx.renderRoomOverlay?.();
    if (ctx.triggerFeedback) {
      ctx.triggerFeedback.textContent = "Status: Rotation mode — drag the polygon to rotate around its center";
    }
  }

  function exitRotationMode() {
    const state = ctx.state;
    if (!state.polygonEditor.rotatingRoomId) return;
    state.polygonEditor.rotatingRoomId = null;
    state.polygonEditor.rotateBoardId = null;
    state.polygonEditor.rotatePointerId = null;
    state.polygonEditor.rotateStartAngle = 0;
    state.polygonEditor.rotateStartPoints = null;
    state.polygonEditor.rotateCenter = null;
    state.polygonEditor.rotateMoved = false;
    ctx.renderRoomOverlay?.();
    if (ctx.triggerFeedback) {
      ctx.triggerFeedback.textContent = "Status: Rotation mode off";
    }
  }

  function isRotationActive() {
    return Boolean(ctx.state.polygonEditor?.rotatingRoomId);
  }

  function resolveRoomIdAtEvent(event) {
    const target = event.target;
    if (!(target instanceof Element)) return null;
    const zone = target.closest?.(".room-zone");
    return zone?.dataset?.roomId ?? null;
  }

  function computeCentroid(points) {
    if (!Array.isArray(points) || points.length === 0) return [0.5, 0.5];
    let sx = 0;
    let sy = 0;
    for (const [x, y] of points) {
      sx += Number(x) || 0;
      sy += Number(y) || 0;
    }
    return [sx / points.length, sy / points.length];
  }

  // Phase 21-1: rotations MUST happen in aspect-corrected (pixel) space —
  // the board canvas is rarely square, so rotating in normalized [0,1]
  // coordinates was squashing the polygon into an ellipse. We pick an
  // isotropic scale from the live canvas (width × height) so pixel-space
  // rotation lands at the same pixel positions regardless of the
  // original aspect ratio. When we convert back to normalized points,
  // the polygon is a true rigid rotation.
  function getAspectScale() {
    const canvas = ctx.canvas;
    const w = Number(canvas?.width) || 1;
    const h = Number(canvas?.height) || 1;
    return { w, h };
  }

  function rotatePointsAround(points, cx, cy, angle) {
    const { w, h } = getAspectScale();
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Move to pixel space (cx_px, cy_px) around which we rotate.
    const cxPx = cx * w;
    const cyPx = cy * h;
    return points.map(([x, y]) => {
      const dxPx = x * w - cxPx;
      const dyPx = y * h - cyPx;
      const rxPx = cxPx + dxPx * cos - dyPx * sin;
      const ryPx = cyPx + dxPx * sin + dyPx * cos;
      return [rxPx / w, ryPx / h];
    });
  }

  // Same aspect correction when computing the start/current pointer
  // angles, so dragging feels like a natural rotation of what the user
  // actually sees on screen.
  function pointerAngleFromCentroid(pointer, center) {
    const { w, h } = getAspectScale();
    const [px, py] = pointer;
    const [cx, cy] = center;
    return Math.atan2((py - cy) * h, (px - cx) * w);
  }

  function beginRotationDrag(event) {
    const state = ctx.state;
    const rotatingRoomId = state.polygonEditor.rotatingRoomId;
    if (!rotatingRoomId) return false;
    const zoneRoomId = resolveRoomIdAtEvent(event);
    if (zoneRoomId !== rotatingRoomId) return false;
    const boardId = state.polygonEditor.rotateBoardId ?? state.boardId;
    const startPoints = ctx.getSpecialPolygonPoints?.(boardId, rotatingRoomId);
    if (!Array.isArray(startPoints) || startPoints.length < 3) return false;
    const [cx, cy] = computeCentroid(startPoints);
    const [px, py] = ctx.getNormalizedOverlayPoint(event);
    event.preventDefault();
    event.stopPropagation();
    if (typeof ctx.pushUndoState === "function") {
      ctx.pushUndoState(`Rotate polygon ${rotatingRoomId}`);
    }
    state.polygonEditor.rotatePointerId = event.pointerId;
    state.polygonEditor.rotateStartAngle = pointerAngleFromCentroid([px, py], [cx, cy]);
    state.polygonEditor.rotateStartPoints = startPoints.map(([x, y]) => [Number(x) || 0, Number(y) || 0]);
    state.polygonEditor.rotateCenter = [cx, cy];
    state.polygonEditor.rotateMoved = false;
    try {
      ctx.roomOverlay.setPointerCapture?.(event.pointerId);
    } catch {}
    return true;
  }

  function continueRotationDrag(event) {
    const state = ctx.state;
    const pointerId = state.polygonEditor.rotatePointerId;
    if (pointerId === null || pointerId !== event.pointerId) return;
    const startPoints = state.polygonEditor.rotateStartPoints;
    const center = state.polygonEditor.rotateCenter;
    if (!Array.isArray(startPoints) || !Array.isArray(center)) return;
    const [cx, cy] = center;
    const [px, py] = ctx.getNormalizedOverlayPoint(event);
    const currentAngle = pointerAngleFromCentroid([px, py], [cx, cy]);
    const deltaAngle = currentAngle - state.polygonEditor.rotateStartAngle;
    const rotated = rotatePointsAround(startPoints, cx, cy, deltaAngle);
    ctx.setSpecialPolygonPoints(state.polygonEditor.rotateBoardId ?? state.boardId,
      state.polygonEditor.rotatingRoomId, rotated);
    state.polygonEditor.rotateMoved = true;
    ctx.renderRoomOverlay?.();
  }

  function finishRotationDrag(event, { cancel = false } = {}) {
    const state = ctx.state;
    const pointerId = state.polygonEditor.rotatePointerId;
    if (pointerId === null) return;
    if (event && ctx.roomOverlay.hasPointerCapture?.(pointerId)) {
      try { ctx.roomOverlay.releasePointerCapture(pointerId); } catch {}
    }
    if (cancel && state.polygonEditor.rotateStartPoints) {
      ctx.setSpecialPolygonPoints(state.polygonEditor.rotateBoardId ?? state.boardId,
        state.polygonEditor.rotatingRoomId, state.polygonEditor.rotateStartPoints);
      ctx.renderRoomOverlay?.();
    } else if (state.polygonEditor.rotateMoved) {
      const persisted = ctx.persistBoardProfiles?.();
      if (ctx.triggerFeedback) {
        ctx.triggerFeedback.textContent = persisted
          ? "Status: Polygon rotated"
          : "Status: Polygon rotated (persistence failed)";
      }
    }
    state.polygonEditor.rotatePointerId = null;
    state.polygonEditor.rotateStartAngle = 0;
    state.polygonEditor.rotateStartPoints = null;
    state.polygonEditor.rotateCenter = null;
    state.polygonEditor.rotateMoved = false;
  }

  function bindOverlayEvents() {
    const overlay = ctx.roomOverlay;
    if (!overlay) return;

    // Rotation drag must run in the capture phase, BEFORE the standard
    // polygon-editor area-drag handler would start a translation. When
    // rotation mode is off, the handler silently returns and the normal
    // editor flow runs unchanged.
    overlay.addEventListener("pointerdown", (event) => {
      if (!isRotationActive()) return;
      if (event.button !== 0 && event.pointerType === "mouse") return;
      beginRotationDrag(event);
    }, true);

    overlay.addEventListener("pointermove", (event) => {
      if (!isRotationActive()) return;
      continueRotationDrag(event);
    }, true);

    overlay.addEventListener("pointerup", (event) => {
      if (!isRotationActive()) return;
      finishRotationDrag(event);
    }, true);

    overlay.addEventListener("pointercancel", (event) => {
      if (!isRotationActive()) return;
      finishRotationDrag(event, { cancel: true });
    }, true);
  }

  function bindDismissEvents() {
    // ESC exits rotation mode entirely.
    document.addEventListener("keydown", (event) => {
      if (!isRotationActive()) return;
      if (event.key === "Escape") {
        // If we're mid-drag, cancel the drag first. Then exit mode.
        if (ctx.state.polygonEditor.rotatePointerId !== null) {
          finishRotationDrag(null, { cancel: true });
        }
        exitRotationMode();
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }

  window.TT_BEAMER_RUNTIME_POLYGON_ROTATION = {
    init,
    enterRotationMode,
    exitRotationMode,
    isRotationActive,
  };
})();
