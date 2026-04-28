// polygon-drag support module.
//
// This module owns the infrastructure the room/ship polygon drag
// pipelines rely on: heavy-interaction flag, rAF-coalesced overlay
// renderer, cached drag DOM refs, incremental SVG writer, and the
// drag-time lifecycle hooks (beginPolygonDragInteraction /
// endPolygonDragInteraction). It also owns the cached stage
// geometry used by touch zoom/pan to avoid forced reflows.
//
// It does NOT own:
//  - the touch gesture state machine (stays in runtime-orchestration)
//  - the per-drag entry points (`beginPolygonVertexDrag`,
//    `beginPolygonAreaDrag`, etc.) — those live near the hit-target
//    wiring they are called from
//  - renderRoomOverlay / renderPolygonEditorHandles themselves
//
// The module is a classic-script IIFE that accepts its dependencies
// via an init() call made by runtime-orchestration.js once state and
// DOM refs exist. Consumers in runtime-orchestration.js destructure
// the public API back into their own lexical scope so call sites read
// the same as before the extraction.
(() => {
  let ctx = null;

  // Module-local flag. The touch gesture state machine lives in
  // runtime-orchestration.js and flips `touchGestureActive` there;
  // we read it through a ctx-supplied getter.
  let polygonDragActive = false;
  let pendingRoomOverlayRenderHandle = null;

  const stageGeometryCache = {
    rect: null,
    layoutWidth: 0,
    layoutHeight: 0,
  };

  function init(dependencies) {
    ctx = dependencies;
    window.addEventListener("resize", () => {
      stageGeometryCache.rect = null;
    });
  }

  function isHeavyInteractionActive() {
    const touchActive = ctx?.getTouchGestureActive ? ctx.getTouchGestureActive() : false;
    return touchActive || polygonDragActive;
  }

  // rAF-coalesced wrapper around renderRoomOverlay().
  // Multiple same-frame drag pointermove events collapse into one SVG
  // rebuild per animation frame instead of one per event. finish*Drag
  // helpers call renderRoomOverlay() directly to flush.
  function scheduleRoomOverlayRender() {
    if (pendingRoomOverlayRenderHandle !== null) return;
    pendingRoomOverlayRenderHandle = window.requestAnimationFrame(() => {
      pendingRoomOverlayRenderHandle = null;
      ctx?.renderRoomOverlay?.();
    });
  }
  function flushPendingRoomOverlayRender() {
    if (pendingRoomOverlayRenderHandle !== null) {
      window.cancelAnimationFrame(pendingRoomOverlayRenderHandle);
      pendingRoomOverlayRenderHandle = null;
    }
  }

  // Incremental SVG drag renderer. On drag start we
  // cache references to the exact DOM nodes that represent the
  // dragged polygon + its handles; per-event updates then set
  // attributes on those cached nodes directly, without rebuilding the
  // whole overlay. renderRoomOverlay is only called once at drag end
  // to resync class toggles, selection state, etc.
  function cacheRoomPolygonDragDomRefs(roomId) {
    const roomOverlay = ctx?.roomOverlay;
    if (!roomOverlay) return null;
    const polygon = roomOverlay.querySelector(
      `polygon.room-zone[data-room-id="${roomId}"]`,
    );
    const vertexHitTargets = Array.from(
      roomOverlay.querySelectorAll(
        ".polygon-vertex-hit-target:not(.ship-polygon-vertex-hit-target)",
      ),
    );
    const vertexHandles = Array.from(
      roomOverlay.querySelectorAll(
        ".polygon-vertex-handle:not(.ship-polygon-vertex-handle)",
      ),
    );
    const vertexLabels = Array.from(
      roomOverlay.querySelectorAll(
        ".polygon-vertex-index:not(.ship-polygon-vertex-index)",
      ),
    );
    const edgeHitTargets = Array.from(
      roomOverlay.querySelectorAll(
        ".polygon-edge-hit-target:not(.ship-polygon-edge-hit-target)",
      ),
    );
    const edgeHandles = Array.from(
      roomOverlay.querySelectorAll(
        ".polygon-edge-handle:not(.ship-polygon-edge-handle)",
      ),
    );
    return { polygon, vertexHitTargets, vertexHandles, vertexLabels, edgeHitTargets, edgeHandles };
  }

  function cacheShipPolygonDragDomRefs() {
    const roomOverlay = ctx?.roomOverlay;
    if (!roomOverlay) return null;
    const mask = roomOverlay.querySelector("polygon.ship-zone-mask.is-active");
    const vertexHitTargets = Array.from(
      roomOverlay.querySelectorAll(".ship-polygon-vertex-hit-target"),
    );
    const vertexHandles = Array.from(
      roomOverlay.querySelectorAll(".ship-polygon-vertex-handle"),
    );
    const vertexLabels = Array.from(
      roomOverlay.querySelectorAll(".ship-polygon-vertex-index"),
    );
    const edgeHitTargets = Array.from(
      roomOverlay.querySelectorAll(".ship-polygon-edge-hit-target"),
    );
    const edgeHandles = Array.from(
      roomOverlay.querySelectorAll(".ship-polygon-edge-handle"),
    );
    return { mask, vertexHitTargets, vertexHandles, vertexLabels, edgeHitTargets, edgeHandles };
  }

  // Incremental drag renderer consumes points already
  // in SVG viewBox units (0..1000 per axis) — the same space
  // `getRoomPoints` returns.
  function applyIncrementalPolygonPointsToDom(polygonNode, points) {
    if (!polygonNode) return;
    const value = points
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");
    polygonNode.setAttribute("points", value);
  }

  // Update one vertex's hit-target/handle/label, plus the two edge
  // midpoints adjacent to it. Used during single-vertex drags so we
  // skip the N-1 unchanged vertices' attribute writes (the dominant
  // SVG cost on polygons with many vertices).
  function writeVertexAndAdjacentEdges(refs, points, index) {
    const n = points.length;
    if (n === 0) return;
    const idx = ((index % n) + n) % n;
    const [ux, uy] = points[idx];
    const xStr = ux.toFixed(1);
    const yStr = uy.toFixed(1);
    const hit = refs.vertexHitTargets?.[idx];
    if (hit) {
      hit.setAttribute("cx", xStr);
      hit.setAttribute("cy", yStr);
    }
    const handle = refs.vertexHandles?.[idx];
    if (handle) {
      handle.setAttribute("cx", xStr);
      handle.setAttribute("cy", yStr);
    }
    const label = refs.vertexLabels?.[idx];
    if (label) {
      label.setAttribute("x", xStr);
      label.setAttribute("y", (uy + 3).toFixed(1));
    }
    if (!Array.isArray(refs.edgeHitTargets) || refs.edgeHitTargets.length === 0) return;
    // Edge i sits between vertex i and vertex i+1, so moving vertex
    // `idx` repositions edges (idx - 1) and (idx) — the two segments
    // that share this vertex.
    const edgeIndices = [(idx - 1 + n) % n, idx];
    for (const ei of edgeIndices) {
      const [ax, ay] = points[ei];
      const [bx, by] = points[(ei + 1) % n];
      const cx = ((ax + bx) / 2).toFixed(1);
      const cy = ((ay + by) / 2).toFixed(1);
      const eHit = refs.edgeHitTargets[ei];
      if (eHit) {
        eHit.setAttribute("cx", cx);
        eHit.setAttribute("cy", cy);
      }
      const eHandle = refs.edgeHandles?.[ei];
      if (eHandle) {
        eHandle.setAttribute("cx", cx);
        eHandle.setAttribute("cy", cy);
      }
    }
  }

  function applyIncrementalVertexHandlesToDom(refs, points) {
    if (!refs) return;
    const n = points.length;
    for (let i = 0; i < n; i += 1) {
      const ux = points[i][0];
      const uy = points[i][1];
      const xStr = ux.toFixed(1);
      const yStr = uy.toFixed(1);
      const hit = refs.vertexHitTargets?.[i];
      if (hit) {
        hit.setAttribute("cx", xStr);
        hit.setAttribute("cy", yStr);
      }
      const handle = refs.vertexHandles?.[i];
      if (handle) {
        handle.setAttribute("cx", xStr);
        handle.setAttribute("cy", yStr);
      }
      const label = refs.vertexLabels?.[i];
      if (label) {
        label.setAttribute("x", xStr);
        label.setAttribute("y", (uy + 3).toFixed(1));
      }
    }
    if (Array.isArray(refs.edgeHitTargets) && refs.edgeHitTargets.length > 0) {
      for (let i = 0; i < n; i += 1) {
        const ax = points[i][0];
        const ay = points[i][1];
        const bx = points[(i + 1) % n][0];
        const by = points[(i + 1) % n][1];
        const cx = ((ax + bx) / 2).toFixed(1);
        const cy = ((ay + by) / 2).toFixed(1);
        const hit = refs.edgeHitTargets[i];
        if (hit) {
          hit.setAttribute("cx", cx);
          hit.setAttribute("cy", cy);
        }
        const handle = refs.edgeHandles?.[i];
        if (handle) {
          handle.setAttribute("cx", cx);
          handle.setAttribute("cy", cy);
        }
      }
    }
  }

  function applyIncrementalRoomDrag(refs, overlayPoints, changedIndex = null) {
    if (!refs) return;
    applyIncrementalPolygonPointsToDom(refs.polygon, overlayPoints);
    if (Number.isInteger(changedIndex)) {
      writeVertexAndAdjacentEdges(refs, overlayPoints, changedIndex);
    } else {
      applyIncrementalVertexHandlesToDom(refs, overlayPoints);
    }
  }

  function applyIncrementalShipDrag(refs, overlayPoints, changedIndex = null) {
    if (!refs) return;
    applyIncrementalPolygonPointsToDom(refs.mask, overlayPoints);
    if (Number.isInteger(changedIndex)) {
      writeVertexAndAdjacentEdges(refs, overlayPoints, changedIndex);
    } else {
      applyIncrementalVertexHandlesToDom(refs, overlayPoints);
    }
  }

  // Invert the live, session-stable room transform so
  // a pointer position expressed in display-normalized [0, 1] space
  // can be written back to raw storage.
  function projectDisplayNormalizedToRoomRaw(displayNormalizedX, displayNormalizedY, room, boardId) {
    const effectiveBoardId = boardId ?? ctx?.state?.boardId;
    const transform = ctx.getRoomTransform(room, effectiveBoardId);
    const calibration = ctx.getHitareaCalibration(effectiveBoardId);
    const scale = calibration.scale || 1;
    const preCalibX = ((displayNormalizedX - 0.5 - (calibration.offsetX || 0)) / scale) + 0.5;
    const preCalibY = ((displayNormalizedY - 0.5 - (calibration.offsetY || 0)) / scale) + 0.5;
    const rawX = transform.baseCenterX + (preCalibX - transform.centerX) / (transform.stretchX || 1);
    const rawY = transform.baseCenterY + (preCalibY - transform.centerY) / (transform.stretchY || 1);
    return [rawX, rawY];
  }

  // Clamp a display-space coordinate to the visible board [0, 1].
  // Used by the vertex drag path so vertices stick to the edge.
  function clampDisplayNormalizedCoordinate(value) {
    return window.TT_BEAMER_RUNTIME_UTILS.clamp01(Number(value) || 0);
  }

  // Heavy-interaction flag: pauses the draw loop's render pipeline so
  // polygon edit gestures stay smooth (see runtime-draw-loop.js's
  // heavy-interaction guard). Set on gesture start; cleared on end.
  function beginPolygonDragInteraction() {
    if (polygonDragActive) return;
    polygonDragActive = true;
    // Capture stage geometry NOW (layout is clean) so subsequent
    // mapClientPointToNormalized calls during the drag can read from
    // the cache and avoid forcing a sync layout flush after each SVG
    // attribute write.
    refreshStageGeometryCache();
    try {
      const liveSync = ctx?.liveSync;
      if (liveSync?.pollTimerId !== null && liveSync?.pollTimerId !== undefined) {
        window.clearTimeout(liveSync.pollTimerId);
        liveSync.pollTimerId = null;
      }
    } catch { /* best effort */ }
  }
  function endPolygonDragInteraction() {
    if (!polygonDragActive) return;
    const state = ctx?.state;
    if (
      state?.shipPolygonEditor?.dragVertexIndex !== null
      || state?.polygonEditor?.dragVertexIndex !== null
      || state?.polygonEditor?.dragAreaPointerId !== null
      || state?.polygonEditor?.pendingAreaPointerId !== null
    ) {
      return;
    }
    polygonDragActive = false;
    // Cached rect is stale once the drag ends — next gesture should
    // recompute from a fresh getBoundingClientRect.
    stageGeometryCache.rect = null;
    flushPendingRoomOverlayRender();
    ctx?.renderRoomOverlay?.();
    try { ctx?.scheduleNextLiveSnapshotPoll?.(0); } catch { /* best effort */ }
  }

  // Cached stage geometry to avoid forced reflows
  // during high-frequency touch gestures on mobile.
  function refreshStageGeometryCache() {
    const stage = ctx?.stage;
    if (!stage) return;
    stageGeometryCache.rect = stage.getBoundingClientRect();
    stageGeometryCache.layoutWidth = stage.clientWidth || 0;
    stageGeometryCache.layoutHeight = stage.clientHeight || 0;
  }
  function getCachedStageGeometry() {
    if (!stageGeometryCache.rect || stageGeometryCache.layoutWidth <= 0) {
      refreshStageGeometryCache();
    }
    return stageGeometryCache;
  }

  window.TT_BEAMER_RUNTIME_POLYGON_DRAG_SUPPORT = {
    init,
    isHeavyInteractionActive,
    scheduleRoomOverlayRender,
    flushPendingRoomOverlayRender,
    cacheRoomPolygonDragDomRefs,
    cacheShipPolygonDragDomRefs,
    applyIncrementalRoomDrag,
    applyIncrementalShipDrag,
    projectDisplayNormalizedToRoomRaw,
    clampDisplayNormalizedCoordinate,
    beginPolygonDragInteraction,
    endPolygonDragInteraction,
    refreshStageGeometryCache,
    getCachedStageGeometry,
  };
})();
