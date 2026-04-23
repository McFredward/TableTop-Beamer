// Phase 14-2: runtime-side polygon normalizers.
//
// These are the permissive ([-0.2, 1.2]) normalization helpers used by
// the runtime's drag pipeline and specialPolygon persistence. They are
// NOT a duplicate of `src/app/runtime/polygon-contract.js` — that file
// has strict [0, 1] clamps. The runtime versions allow off-board
// intermediate values so animations can compute out-of-bounds points
// without being silently collapsed into the visible area.
//
// The one external dependency, `clampRoomAbsoluteCoordinate`, is
// sourced from `window.TT_BEAMER_NORMALIZERS` — the same binding that
// runtime-orchestration.js reaches for. Having a local module scope
// lets the runtime entry point destructure four small helpers into
// its call graph instead of declaring them inline.
(() => {
  const clampRoomAbsoluteCoordinate =
    window.TT_BEAMER_NORMALIZERS?.clampRoomAbsoluteCoordinate
    ?? ((value) => Math.max(-0.2, Math.min(1.2, Number(value) || 0)));

  function normalizePolygonPoint(point) {
    const objectLikePoint = point && typeof point === "object" && !Array.isArray(point)
      ? point
      : null;
    const rawX = Array.isArray(point)
      ? point[0]
      : objectLikePoint?.x ?? objectLikePoint?.[0];
    const rawY = Array.isArray(point)
      ? point[1]
      : objectLikePoint?.y ?? objectLikePoint?.[1];
    // Phase 22 W5 fix: `|| 0.5` treated 0 as "missing" and threw the
    // vertex into the board centre whenever the clamp drove a
    // coordinate to the left / top edge. Use an explicit finite-check
    // so legitimate zeroes pass through.
    const numX = Number(rawX);
    const numY = Number(rawY);
    return [
      clampRoomAbsoluteCoordinate(Number.isFinite(numX) ? numX : 0.5),
      clampRoomAbsoluteCoordinate(Number.isFinite(numY) ? numY : 0.5),
    ];
  }

  function getNormalizedPolygonArea(points) {
    if (!Array.isArray(points) || points.length < 3) {
      return 0;
    }
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      if (!Array.isArray(current) || !Array.isArray(next)) {
        return 0;
      }
      area += Number(current[0]) * Number(next[1]) - Number(next[0]) * Number(current[1]);
    }
    return Math.abs(area / 2);
  }

  function isRenderableNormalizedPolygon(points, { minArea = 0.00003 } = {}) {
    if (!Array.isArray(points) || points.length < 3) {
      return false;
    }
    return getNormalizedPolygonArea(points) >= minArea;
  }

  function normalizeSpecialPolygon(points, fallbackPoints = []) {
    const source = Array.isArray(points) && points.length >= 3 ? points : fallbackPoints;
    const normalized = source.map((entry) => normalizePolygonPoint(entry));
    if (isRenderableNormalizedPolygon(normalized)) {
      return normalized;
    }
    const normalizedFallback = (Array.isArray(fallbackPoints) ? fallbackPoints : [])
      .map((entry) => normalizePolygonPoint(entry));
    if (isRenderableNormalizedPolygon(normalizedFallback)) {
      return normalizedFallback;
    }
    return [
      [0.45, 0.45],
      [0.55, 0.45],
      [0.5, 0.55],
    ];
  }

  function isValidSpecialPolygon(points) {
    return Array.isArray(points) && points.length >= 3;
  }

  window.TT_BEAMER_RUNTIME_POLYGON_NORMALIZERS = {
    normalizePolygonPoint,
    getNormalizedPolygonArea,
    isRenderableNormalizedPolygon,
    normalizeSpecialPolygon,
    isValidSpecialPolygon,
  };
})();
