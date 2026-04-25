// canvas clipping helpers module.
//
// Owns the 2D-canvas polygon clipping helpers used by the draw loop
// to mask room animations, ship interiors, and outside-ship
// play-area regions.
//
// Dependencies injected via ctx:
//   state                       — for default boardId
//   canvas                      — HTMLCanvasElement (width/height)
//   canvasCtx                   — CanvasRenderingContext2D
//   getRoomPolygonPixels        — returns room polygon in canvas pixels
//   getShipPolygonPixels        — returns ship polygon in canvas pixels
//   getPlayAreaPolygonsPixels   — returns play area polygons
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function clipToPolygon(polygon, { evenodd = false } = {}) {
    if (!Array.isArray(polygon) || polygon.length < 3) {
      return false;
    }
    const c = ctx.canvasCtx;
    c.beginPath();
    polygon.forEach(([x, y], index) => {
      if (index === 0) {
        c.moveTo(x, y);
      } else {
        c.lineTo(x, y);
      }
    });
    c.closePath();
    if (evenodd) {
      c.clip("evenodd");
    } else {
      c.clip();
    }
    return true;
  }

  function isFiniteCanvasPoint(point) {
    return Array.isArray(point)
      && point.length >= 2
      && Number.isFinite(Number(point[0]))
      && Number.isFinite(Number(point[1]));
  }

  function getPolygonSignedArea(polygon) {
    if (!Array.isArray(polygon) || polygon.length < 3) {
      return 0;
    }
    let area = 0;
    for (let index = 0; index < polygon.length; index += 1) {
      const current = polygon[index];
      const next = polygon[(index + 1) % polygon.length];
      if (!isFiniteCanvasPoint(current) || !isFiniteCanvasPoint(next)) {
        return 0;
      }
      area += Number(current[0]) * Number(next[1]) - Number(next[0]) * Number(current[1]);
    }
    return area / 2;
  }

  function isRenderableCanvasPolygon(polygon, { minArea = 8 } = {}) {
    if (!Array.isArray(polygon) || polygon.length < 3) {
      return false;
    }
    if (!polygon.every((point) => isFiniteCanvasPoint(point))) {
      return false;
    }
    return Math.abs(getPolygonSignedArea(polygon)) >= minArea;
  }

  function clipToRoom(room, boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const polygon = ctx.getRoomPolygonPixels(room, ctx.canvas.width, ctx.canvas.height, effectiveBoardId);
    if (!isRenderableCanvasPolygon(polygon)) {
      return true;
    }
    return clipToPolygon(polygon);
  }

  function getShipClipPolygon(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const selected = ctx.getShipPolygonPixels(ctx.canvas.width, ctx.canvas.height, effectiveBoardId);
    return selected.length >= 3 ? selected : null;
  }

  function getPlayAreaClipPolygons(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    return ctx.getPlayAreaPolygonsPixels(ctx.canvas.width, ctx.canvas.height, effectiveBoardId)
      .filter((polygon) => isRenderableCanvasPolygon(polygon));
  }

  function appendPolygonPath(polygon) {
    const c = ctx.canvasCtx;
    polygon.forEach(([x, y], index) => {
      if (index === 0) {
        c.moveTo(x, y);
      } else {
        c.lineTo(x, y);
      }
    });
    c.closePath();
  }

  function clipToOutsideShip(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const playAreaPolygons = getPlayAreaClipPolygons(effectiveBoardId);
    if (playAreaPolygons.length === 0) {
      return false;
    }
    const c = ctx.canvasCtx;
    c.beginPath();
    c.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (const polygon of playAreaPolygons) {
      appendPolygonPath(polygon);
    }
    c.clip("evenodd");
    return true;
  }

  function clipToInsideShip(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const playAreaPolygons = getPlayAreaClipPolygons(effectiveBoardId);
    if (playAreaPolygons.length === 0) {
      return false;
    }
    const c = ctx.canvasCtx;
    c.beginPath();
    for (const polygon of playAreaPolygons) {
      appendPolygonPath(polygon);
    }
    c.clip();
    return true;
  }

  window.TT_BEAMER_RUNTIME_CANVAS_CLIP = {
    init,
    clipToPolygon,
    isFiniteCanvasPoint,
    getPolygonSignedArea,
    isRenderableCanvasPolygon,
    clipToRoom,
    getShipClipPolygon,
    getPlayAreaClipPolygons,
    appendPolygonPath,
    clipToOutsideShip,
    clipToInsideShip,
  };
})();
