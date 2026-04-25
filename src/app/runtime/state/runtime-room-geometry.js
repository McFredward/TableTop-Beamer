// room-geometry helpers module.
//
// Owns the pure-ish room/ship polygon geometry helpers the rest of
// the runtime consults: transform computation, stable stretch anchor
// cache (stable-anchor structural fix), hit-area calibration, display-space
// coordinate conversion, and per-room metrics used by the draw loop.
//
// Consumer API is destructured back into runtime-orchestration.js so
// existing call sites read the same as before the extraction.
//
// Shared runtime state + the "get" helpers (getBoard, getRoomGeometry,
// getRoomSourcePoints, getRawRoomCenter, getHitareaCalibration,
// getShipPolygonPoints, getPlayAreas, mapNormalizedPointToPixels)
// and the DOM `canvas` ref + the polygonContract module are injected
// via the init() call made once at startup by runtime-orchestration.js.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function applyHitareaCalibration(x, y, calibration) {
    const scaledX = (x - 0.5) * calibration.scale + 0.5 + calibration.offsetX;
    const scaledY = (y - 0.5) * calibration.scale + 0.5 + calibration.offsetY;
    return [Math.max(-0.2, Math.min(1.2, scaledX)), Math.max(-0.2, Math.min(1.2, scaledY))];
  }

  function getRoomCenterFromPoints(points) {
    if (!points.length) {
      return { x: 0.5, y: 0.5 };
    }
    const center = points.reduce(
      (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
      { x: 0, y: 0 },
    );
    return {
      x: center.x / points.length,
      y: center.y / points.length,
    };
  }

  // Stable stretch-anchor getter. The anchor is the
  // polygon's centroid at the moment the room first enters the
  // session, and it does not update on vertex edits. This keeps the
  // transform (and therefore every consumer of getRoomPoints: full
  // rebuild, incremental drag renderer, hit testing, zoom centering,
  // polygon editor handle renderer, …) stable when a single vertex
  // is edited on a room with stretch != 1. See planning docs in .planning/phases/phase-13/.
  function getStableRoomStretchAnchor(room, boardId) {
    const state = ctx.state;
    const effectiveBoardId = boardId ?? state.boardId;
    const key = `${effectiveBoardId}::${room.id}`;
    const cached = state.roomStretchAnchorCache.get(key);
    if (cached) return cached;
    const sourcePoints = ctx.getRoomSourcePoints(room, effectiveBoardId);
    const center = sourcePoints.length >= 3
      ? getRoomCenterFromPoints(sourcePoints)
      : ctx.getRawRoomCenter(room, effectiveBoardId);
    const anchor = { x: center.x, y: center.y };
    state.roomStretchAnchorCache.set(key, anchor);
    return anchor;
  }

  // Geometry offsets + stretch have been
  // baked into the stored polygon coordinates. The transform is now
  // identity — center equals the polygon centroid, stretch is 1:1.
  // Shape preserved for callers that destructure the return value
  // (projectDisplayNormalizedToRoomRaw, polygon drag pipeline, etc.).
  function getRoomTransform(room, boardId) {
    const baseCenter = getStableRoomStretchAnchor(room, boardId);
    return {
      centerX: baseCenter.x,
      centerY: baseCenter.y,
      stretchX: 1,
      stretchY: 1,
      baseCenterX: baseCenter.x,
      baseCenterY: baseCenter.y,
    };
  }

  // Hitarea calibration + room geometry
  // transforms have been baked into the stored polygon coordinates
  // by the p15-migrate-bake-transforms.mjs migration script. The
  // pipeline is now identity: source points map 1:1 to display
  // points (scaled ×1000 for the SVG overlay coordinate space).
  function getRoomPoints(room, boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const sourcePoints = ctx.getRoomSourcePoints(room, effectiveBoardId);
    if (sourcePoints.length >= 3) {
      return sourcePoints.map(([x, y]) => [x * 1000, y * 1000]);
    }
    const center = getRoomCenterFromPoints(sourcePoints.length ? sourcePoints : [[0.5, 0.5]]);
    const r = room.radius ?? 0.08;
    const points = [];
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 3) * i;
      points.push([(center.x + Math.cos(angle) * r) * 1000, (center.y + Math.sin(angle) * r) * 1000]);
    }
    return points;
  }

  function getRoomLabelPosition(room, boardId) {
    const points = getRoomPoints(room, boardId);
    if (points.length === 0) {
      return { x: 0.5, y: 0.5 };
    }
    const center = points.reduce(
      (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
      { x: 0, y: 0 },
    );
    return {
      x: center.x / points.length / 1000,
      y: center.y / points.length / 1000,
    };
  }

  function getRoomPolygonPixels(room, width, height, boardId) {
    return getRoomPoints(room, boardId).map(([x, y]) =>
      ctx.mapNormalizedPointToPixels(x / 1000, y / 1000, width, height),
    );
  }

  function getShipPolygonPixels(width, height, boardId) {
    const canvas = ctx.canvas;
    const effectiveWidth = width ?? canvas?.width ?? 0;
    const effectiveHeight = height ?? canvas?.height ?? 0;
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    return ctx.getShipPolygonPoints(effectiveBoardId).map(([x, y]) =>
      ctx.mapNormalizedPointToPixels(x, y, effectiveWidth, effectiveHeight),
    );
  }

  function getPlayAreaPolygonsPixels(width, height, boardId) {
    const canvas = ctx.canvas;
    const effectiveWidth = width ?? canvas?.width ?? 0;
    const effectiveHeight = height ?? canvas?.height ?? 0;
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const sourceAreas = ctx.getPlayAreas(effectiveBoardId);
    const polygonContract = ctx.polygonContract;
    const normalizedPolygons = polygonContract?.extractRenderablePlayAreaPolygons
      ? polygonContract.extractRenderablePlayAreaPolygons(sourceAreas, {
        fallbackPolygon: ctx.SHIP_POLYGON_DEFAULT,
        allowDefaultFallbackWhenEmpty: true,
      })
      : sourceAreas
        .map((area) => (Array.isArray(area?.polygon) ? area.polygon.map((point) => ctx.normalizePolygonPoint(point)) : []))
        .filter((polygon) => ctx.isRenderableNormalizedPolygon(polygon));

    return normalizedPolygons.map((polygon) => polygon.map(([x, y]) =>
      ctx.mapNormalizedPointToPixels(x, y, effectiveWidth, effectiveHeight),
    ));
  }

  function getRoomRenderMetrics(room, boardId) {
    const canvas = ctx.canvas;
    const polygon = getRoomPolygonPixels(room, canvas.width, canvas.height, boardId);
    if (polygon.length === 0) {
      return {
        polygon,
        centerX: canvas.width * 0.5,
        centerY: canvas.height * 0.5,
        minX: canvas.width * 0.4,
        maxX: canvas.width * 0.6,
        minY: canvas.height * 0.4,
        maxY: canvas.height * 0.6,
        width: Math.max(20, canvas.width * 0.2),
        height: Math.max(20, canvas.height * 0.2),
        radius: Math.max(10, Math.min(canvas.width, canvas.height) * 0.08),
      };
    }

    const center = polygon.reduce(
      (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
      { x: 0, y: 0 },
    );
    const centerX = center.x / polygon.length;
    const centerY = center.y / polygon.length;

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let radius = 0;
    for (const [x, y] of polygon) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      radius = Math.max(radius, Math.hypot(x - centerX, y - centerY));
    }

    return {
      polygon,
      centerX,
      centerY,
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(12, maxX - minX),
      height: Math.max(12, maxY - minY),
      radius: Math.max(8, radius),
    };
  }

  window.TT_BEAMER_RUNTIME_ROOM_GEOMETRY = {
    init,
    applyHitareaCalibration,
    getRoomCenterFromPoints,
    getStableRoomStretchAnchor,
    getRoomTransform,
    getRoomPoints,
    getRoomLabelPosition,
    getRoomPolygonPixels,
    getShipPolygonPixels,
    getPlayAreaPolygonsPixels,
    getRoomRenderMetrics,
  };
})();
