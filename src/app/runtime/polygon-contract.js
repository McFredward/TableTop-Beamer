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
    const points = entry?.polygon ?? entry?.points ?? entry;
    const normalizedPolygon = Array.isArray(points)
      ? points.map((point) => normalizePolygonPoint(point))
      : null;
    if (!isRenderableNormalizedPolygon(normalizedPolygon)) {
      return null;
    }
    const id = normalizePlayAreaId(entry?.id, fallbackIndex);
    const fallbackName = `Play Area ${fallbackIndex + 1}`;
    const name = String(entry?.name || "").trim() || fallbackName;
    return {
      id,
      name,
      polygon: normalizedPolygon,
    };
  }

  function normalizePlayAreasCollection(playAreas, fallbackPolygon) {
    const source = Array.isArray(playAreas) ? playAreas : [];
    const normalized = [];
    const seenIds = new Set();

    for (let index = 0; index < source.length; index += 1) {
      const area = normalizePlayAreaEntry(source[index], index);
      if (!area) {
        continue;
      }
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

  function collectValidPlayAreasWithoutImplicitFallback(playAreas) {
    const source = Array.isArray(playAreas) ? playAreas : [];
    const normalized = [];
    const seenIds = new Set();
    for (let index = 0; index < source.length; index += 1) {
      const area = normalizePlayAreaEntry(source[index], index);
      if (!area) {
        continue;
      }
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
    return normalized;
  }

  function mergeSnapshotAndCanonicalPlayAreas(snapshotPlayAreas, canonicalPlayAreas, fallbackPolygon) {
    const snapshotValid = collectValidPlayAreasWithoutImplicitFallback(snapshotPlayAreas);
    const canonicalValid = collectValidPlayAreasWithoutImplicitFallback(canonicalPlayAreas);

    if (snapshotValid.length === 0 && canonicalValid.length === 0) {
      return {
        playAreas: normalizePlayAreasCollection([], fallbackPolygon),
        strictSubsetFromSnapshot: false,
      };
    }

    if (snapshotValid.length === 0) {
      return {
        playAreas: canonicalValid,
        strictSubsetFromSnapshot: false,
      };
    }

    if (canonicalValid.length === 0) {
      return {
        playAreas: snapshotValid,
        strictSubsetFromSnapshot: false,
      };
    }

    const snapshotIdSet = new Set(snapshotValid.map((entry) => entry.id));
    const canonicalIdSet = new Set(canonicalValid.map((entry) => entry.id));
    const strictSubsetFromSnapshot =
      snapshotValid.length < canonicalValid.length
      && snapshotValid.every((entry) => canonicalIdSet.has(entry.id));

    const mergedById = new Map(canonicalValid.map((entry) => [entry.id, entry]));
    for (const snapshotArea of snapshotValid) {
      if (strictSubsetFromSnapshot && mergedById.has(snapshotArea.id)) {
        continue;
      }
      mergedById.set(snapshotArea.id, snapshotArea);
    }

    const ordered = [];
    const emitted = new Set();
    for (const entry of canonicalValid) {
      const next = mergedById.get(entry.id);
      if (next && !emitted.has(next.id)) {
        ordered.push(next);
        emitted.add(next.id);
      }
    }
    for (const entry of snapshotValid) {
      const next = mergedById.get(entry.id);
      if (next && !emitted.has(next.id)) {
        ordered.push(next);
        emitted.add(next.id);
      }
    }

    return {
      playAreas: ordered,
      strictSubsetFromSnapshot,
    };
  }

  function extractRenderablePlayAreaPolygons(
    playAreas,
    { fallbackPolygon = [], allowDefaultFallbackWhenEmpty = true } = {},
  ) {
    const source = Array.isArray(playAreas) ? playAreas : [];
    const renderable = source
      .map((entry) => {
        const points = entry?.polygon ?? entry?.points ?? entry;
        if (!Array.isArray(points)) {
          return null;
        }
        const normalized = points.map((point) => normalizePolygonPoint(point));
        return isRenderableNormalizedPolygon(normalized) ? normalized : null;
      })
      .filter((polygon) => Array.isArray(polygon));

    if (renderable.length > 0) {
      return renderable;
    }
    if (source.length > 0) {
      return [];
    }
    if (!allowDefaultFallbackWhenEmpty) {
      return [];
    }
    const fallback = normalizeSpecialPolygon(fallbackPolygon, []);
    return isRenderableNormalizedPolygon(fallback) ? [fallback] : [];
  }

  function resolveProfilePolygonContract(profile = {}, fallbackProfile = {}, shipPolygonDefault = []) {
    const profilePlayAreas = Array.isArray(profile.playAreas) ? profile.playAreas : null;
    const fallbackPlayAreas = Array.isArray(fallbackProfile.playAreas) ? fallbackProfile.playAreas : null;
    const candidatePlayAreas = Array.isArray(profilePlayAreas) && profilePlayAreas.length > 0
      ? profilePlayAreas
      : Array.isArray(fallbackPlayAreas) && fallbackPlayAreas.length > 0
        ? fallbackPlayAreas
        : null;
    const candidateFallbackPolygon =
      profile.playAreaPolygon
      ?? profile.shipPolygon
      ?? profile.shipMask
      ?? profile.insidePolygon
      ?? profile.outsidePolygon
      ?? profile.inside?.polygon
      ?? profile.inside?.playAreaPolygon
      ?? profile.outside?.polygon
      ?? profile.outside?.playAreaPolygon
      ?? fallbackProfile.playAreaPolygon
      ?? fallbackProfile.shipPolygon
      ?? fallbackProfile.shipMask
      ?? fallbackProfile.insidePolygon
      ?? fallbackProfile.outsidePolygon
      ?? fallbackProfile.inside?.polygon
      ?? fallbackProfile.inside?.playAreaPolygon
      ?? fallbackProfile.outside?.polygon
      ?? fallbackProfile.outside?.playAreaPolygon
      ?? shipPolygonDefault;
    const playAreas = normalizePlayAreasCollection(candidatePlayAreas, candidateFallbackPolygon);
    const preferredSelectedId = String(profile.selectedPlayAreaId || fallbackProfile.selectedPlayAreaId || "").trim();
    const selectedPlayAreaId = playAreas.some((entry) => entry.id === preferredSelectedId)
      ? preferredSelectedId
      : playAreas[0]?.id ?? "play-area-1";
    return {
      playAreas,
      selectedPlayAreaId,
    };
  }

  function extractBoardProfiles(snapshot, runtime) {
    if (snapshot?.boardProfiles && typeof snapshot.boardProfiles === "object") {
      return snapshot.boardProfiles;
    }
    if (runtime?.boardProfiles && typeof runtime.boardProfiles === "object") {
      return runtime.boardProfiles;
    }
    return null;
  }

  function applySnapshotPolygonState({ state, snapshot, runtime, boardIds = [], shipPolygonDefault = [] }) {
    const snapshotPlayAreasByBoard =
      snapshot?.playAreasByBoard && typeof snapshot.playAreasByBoard === "object"
        ? snapshot.playAreasByBoard
        : runtime?.playAreasByBoard && typeof runtime.playAreasByBoard === "object"
          ? runtime.playAreasByBoard
          : null;
    const snapshotSelectedByBoard =
      snapshot?.selectedPlayAreaIdByBoard && typeof snapshot.selectedPlayAreaIdByBoard === "object"
        ? snapshot.selectedPlayAreaIdByBoard
        : runtime?.selectedPlayAreaIdByBoard && typeof runtime.selectedPlayAreaIdByBoard === "object"
          ? runtime.selectedPlayAreaIdByBoard
          : null;
    const snapshotBoardProfiles = extractBoardProfiles(snapshot, runtime);

    const hasSnapshotPolygonData = Boolean(snapshotPlayAreasByBoard || snapshotSelectedByBoard || snapshotBoardProfiles);
    if (!hasSnapshotPolygonData) {
      return {
        playAreasByBoard: { ...(state?.playAreasByBoard ?? {}) },
        selectedPlayAreaIdByBoard: { ...(state?.selectedPlayAreaIdByBoard ?? {}) },
        appliedFromSnapshot: false,
      };
    }

    const candidateBoardIds = new Set([
      ...boardIds,
      ...Object.keys(state?.playAreasByBoard ?? {}),
      ...Object.keys(snapshotPlayAreasByBoard ?? {}),
      ...Object.keys(snapshotSelectedByBoard ?? {}),
      ...Object.keys(snapshotBoardProfiles ?? {}),
    ]);

    const nextPlayAreasByBoard = {};
    const nextSelectedPlayAreaIdByBoard = {};

    for (const boardId of candidateBoardIds) {
      const statePlayAreas = state?.playAreasByBoard?.[boardId];
      const stateSelectedId = String(state?.selectedPlayAreaIdByBoard?.[boardId] || "").trim();
      const profile = snapshotBoardProfiles?.[boardId] ?? null;

      const fallbackPolygon =
        (Array.isArray(statePlayAreas) && statePlayAreas[0]?.polygon)
        ?? profile?.playAreaPolygon
        ?? profile?.shipPolygon
        ?? profile?.insidePolygon
        ?? profile?.outsidePolygon
        ?? shipPolygonDefault;

      const contracted = resolveProfilePolygonContract(profile ?? {}, { playAreas: statePlayAreas ?? null, selectedPlayAreaId: stateSelectedId }, fallbackPolygon);
      const contractedPlayAreas = contracted.playAreas;
      const snapshotPlayAreas = Array.isArray(snapshotPlayAreasByBoard?.[boardId])
        ? snapshotPlayAreasByBoard[boardId]
        : null;
      const mergedSource = mergeSnapshotAndCanonicalPlayAreas(snapshotPlayAreas, contractedPlayAreas, fallbackPolygon);
      const normalizedPlayAreas = normalizePlayAreasCollection(mergedSource.playAreas, fallbackPolygon);

      const snapshotSelected = String(snapshotSelectedByBoard?.[boardId] || "").trim();
      const contractedSelected = String(contracted.selectedPlayAreaId || "").trim();
      const preferredSelected = mergedSource.strictSubsetFromSnapshot
        ? contractedSelected || snapshotSelected || stateSelectedId
        : snapshotSelected || contractedSelected || stateSelectedId;
      const selectedPlayAreaId = normalizedPlayAreas.some((entry) => entry.id === preferredSelected)
        ? preferredSelected
        : normalizedPlayAreas[0]?.id ?? "play-area-1";

      nextPlayAreasByBoard[boardId] = normalizedPlayAreas;
      nextSelectedPlayAreaIdByBoard[boardId] = selectedPlayAreaId;
    }

    return {
      playAreasByBoard: nextPlayAreasByBoard,
      selectedPlayAreaIdByBoard: nextSelectedPlayAreaIdByBoard,
      appliedFromSnapshot: true,
    };
  }

  const api = {
    normalizePolygonPoint,
    getNormalizedPolygonArea,
    isRenderableNormalizedPolygon,
    normalizeSpecialPolygon,
    normalizePlayAreasCollection,
    extractRenderablePlayAreaPolygons,
    resolveProfilePolygonContract,
    applySnapshotPolygonState,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof window !== "undefined") {
    window.TT_BEAMER_POLYGON_CONTRACT = api;
  }
})();
