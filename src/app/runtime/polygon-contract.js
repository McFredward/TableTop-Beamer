(() => {
  function clampNormalizedCoordinate(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 0.5;
    }
    return Math.max(0, Math.min(1, numeric));
  }

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
    return [
      clampNormalizedCoordinate(rawX),
      clampNormalizedCoordinate(rawY),
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

  function normalizePlayAreaId(value, fallbackIndex = 0) {
    const raw = String(value || "").trim().toLowerCase();
    const sanitized = raw
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return sanitized || `play-area-${fallbackIndex + 1}`;
  }

  function normalizePlayAreaEntry(entry, fallbackIndex = 0) {
    const id = normalizePlayAreaId(entry?.id, fallbackIndex);
    const fallbackName = `Play Area ${fallbackIndex + 1}`;
    const name = String(entry?.name || "").trim() || fallbackName;
    const polygon = normalizeSpecialPolygon(entry?.polygon ?? entry?.points ?? entry);
    return {
      id,
      name,
      polygon,
    };
  }

  function normalizePlayAreasCollection(playAreas, fallbackPolygon) {
    const source = Array.isArray(playAreas) ? playAreas : [];
    const normalized = [];
    const seenIds = new Set();

    for (let index = 0; index < source.length; index += 1) {
      const area = normalizePlayAreaEntry(source[index], index);
      let uniqueId = area.id;
      let suffix = 2;
      while (seenIds.has(uniqueId)) {
        uniqueId = `${area.id}-${suffix}`;
        suffix += 1;
      }
      seenIds.add(uniqueId);
      normalized.push({
        ...area,
        id: uniqueId,
      });
    }

    if (normalized.length === 0) {
      normalized.push({
        id: "play-area-1",
        name: "Play Area 1",
        polygon: normalizeSpecialPolygon(fallbackPolygon),
      });
    }

    return normalized;
  }

  function applySnapshotPolygonState({ state, snapshot, runtime, boardIds = [], shipPolygonDefault = [] }) {
    void snapshot;
    void runtime;
    void boardIds;
    void shipPolygonDefault;
    // HF3-RED baseline (intentional): current runtime snapshot path does not hydrate polygon maps.
    return {
      playAreasByBoard: { ...(state?.playAreasByBoard ?? {}) },
      selectedPlayAreaIdByBoard: { ...(state?.selectedPlayAreaIdByBoard ?? {}) },
      appliedFromSnapshot: false,
    };
  }

  const api = {
    normalizePolygonPoint,
    getNormalizedPolygonArea,
    isRenderableNormalizedPolygon,
    normalizeSpecialPolygon,
    normalizePlayAreasCollection,
    applySnapshotPolygonState,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof window !== "undefined") {
    window.TT_BEAMER_POLYGON_CONTRACT = api;
  }
})();
