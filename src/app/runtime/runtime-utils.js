(() => {
  function clamp(min, max, v) {
    return Math.max(min, Math.min(max, v));
  }
  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }
  function bboxOfPolygon(points) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { minX, maxX, minY, maxY };
  }
  window.TT_BEAMER_RUNTIME_UTILS = { clamp, clamp01, bboxOfPolygon };
})();
