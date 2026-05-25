// play area + room geometry + polygon contract module.
//
// Owns polygon acceptance predicate, room geometry mode/normalization/
// default maps, room tombstone CRUD, board profile merger for global
// export, polygon contract resolver, play area normalizers
// (id/entry/collection/defaults), play area CRUD state accessors,
// ship polygon helpers, and the final normalizeRoomGeometryMap.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function isAcceptablePolygonPointerEvent(event) {
    if (!event) return false;
    const pointerType = String(event.pointerType || "").toLowerCase();
    if (pointerType === "touch" || pointerType === "pen") return true;
    return event.button === 0;
  }

  function normalizeRoomGeometryMode(mode) {
    return mode === "absolute" ? "absolute" : "relative";
  }

  function getRawRoomCenter(room, boardId = ctx.state.boardId) {
    const sourcePoints = ctx.getRoomSourcePoints(room, boardId);
    if (sourcePoints.length) {
      const center = sourcePoints.reduce(
        (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
        { x: 0, y: 0 },
      );
      return {
        x: center.x / sourcePoints.length,
        y: center.y / sourcePoints.length,
      };
    }
    return {
      x: Number(room?.x) || 0.5,
      y: Number(room?.y) || 0.5,
    };
  }

  function normalizeRoomGeometry(geometry, room, boardId = ctx.state.boardId) {
    const mode = normalizeRoomGeometryMode(geometry?.mode);
    const baseCenter = getRawRoomCenter(room, boardId);
    const offsetX = ctx.clampRoomRelativeOffset(Number(geometry?.offsetX) || 0);
    const offsetY = ctx.clampRoomRelativeOffset(Number(geometry?.offsetY) || 0);
    const absoluteX = Number.isFinite(Number(geometry?.absoluteX))
      ? ctx.clampRoomAbsoluteCoordinate(Number(geometry?.absoluteX))
      : baseCenter.x;
    const absoluteY = Number.isFinite(Number(geometry?.absoluteY))
      ? ctx.clampRoomAbsoluteCoordinate(Number(geometry?.absoluteY))
      : baseCenter.y;
    return {
      mode,
      offsetX,
      offsetY,
      absoluteX,
      absoluteY,
      stretchX: ctx.clampRoomStretch(Number(geometry?.stretchX) || 1),
      stretchY: ctx.clampRoomStretch(Number(geometry?.stretchY) || 1),
    };
  }

  function createDefaultRoomGeometryMap(boardId) {
    const board = ctx.getBoard(boardId);
    return Object.fromEntries(
      board.rooms.map((room) => [room.id, normalizeRoomGeometry(ctx.ROOM_GEOMETRY_DEFAULT, room, boardId)]),
    );
  }

  function createDefaultRoomGeometryByBoard() {
    return Object.fromEntries(
      ctx.getBoards().map((board) => [board.id, createDefaultRoomGeometryMap(board.id)]),
    );
  }

  // Phase 29 h1: mergeSpecialPolygonMaps removed — room polygons now
  // live exclusively in roomCatalog[*].polygon, which mergeBoardProfiles
  // already merges via the `primary.roomCatalog ?? fallback.roomCatalog`
  // selection below.

  function mergeBoardProfilesForGlobalExport(primaryProfiles, fallbackProfiles) {
    const merged = {};
    const boardIds = new Set([
      ...Object.keys(fallbackProfiles ?? {}),
      ...Object.keys(primaryProfiles ?? {}),
    ]);

    for (const boardId of boardIds) {
      const primary = primaryProfiles?.[boardId] ?? {};
      const fallback = fallbackProfiles?.[boardId] ?? {};
      const mergedPlayAreas = normalizePlayAreasCollection(
        Array.isArray(primary.playAreas) && primary.playAreas.length > 0
          ? primary.playAreas
          : Array.isArray(fallback.playAreas)
            ? fallback.playAreas
            : null,
        primary.shipPolygon
        ?? fallback.shipPolygon
        ?? ctx.SHIP_POLYGON_DEFAULT,
      );
      const preferredSelectedPlayAreaId = String(primary.selectedPlayAreaId || fallback.selectedPlayAreaId || "").trim();
      const selectedPlayAreaId = mergedPlayAreas.some((area) => area.id === preferredSelectedPlayAreaId)
        ? preferredSelectedPlayAreaId
        : mergedPlayAreas[0].id;
      const roomCatalog = Array.isArray(primary.roomCatalog)
        ? primary.roomCatalog
        : Array.isArray(fallback.roomCatalog)
          ? fallback.roomCatalog
          : null;

      // Phase 29 h1: per-room polygons travel inside roomCatalog now —
      // no separate per-room polygon map on the merged profile.
      merged[boardId] = {
        ...fallback,
        ...primary,
        roomCatalog,
        playAreas: mergedPlayAreas,
        selectedPlayAreaId,
        roomFx: ctx.normalizeRoomFxProfile(primary.roomFx ?? fallback.roomFx),
        insideFx: ctx.normalizeInsideFxProfile(primary.insideFx ?? fallback.insideFx),
        outsideFx: ctx.normalizeOutsideFxProfile(primary.outsideFx ?? fallback.outsideFx),
      };
    }

    return merged;
  }

  function resolveProfilePolygonContract(profile = {}, fallbackProfile = {}) {
    const profilePlayAreas = Array.isArray(profile.playAreas) ? profile.playAreas : null;
    const fallbackPlayAreas = Array.isArray(fallbackProfile.playAreas) ? fallbackProfile.playAreas : null;
    const candidatePlayAreas = Array.isArray(profilePlayAreas) && profilePlayAreas.length > 0
      ? profilePlayAreas
      : Array.isArray(fallbackPlayAreas) && fallbackPlayAreas.length > 0
        ? fallbackPlayAreas
        : null;
    const candidateFallbackPolygon =
      profile.shipPolygon
      ?? profile.shipMask
      ?? profile.insidePolygon
      ?? profile.outsidePolygon
      ?? profile.inside?.polygon
      ?? profile.outside?.polygon
      ?? fallbackProfile.shipPolygon
      ?? fallbackProfile.shipMask
      ?? fallbackProfile.insidePolygon
      ?? fallbackProfile.outsidePolygon
      ?? fallbackProfile.inside?.polygon
      ?? fallbackProfile.outside?.polygon
      ?? ctx.SHIP_POLYGON_DEFAULT;
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

  function mergePolygonPrecedence(baseProfiles = {}, polygonOwnerProfiles = {}) {
    const merged = {};
    const boardIds = new Set([
      ...Object.keys(baseProfiles ?? {}),
      ...Object.keys(polygonOwnerProfiles ?? {}),
      ...ctx.getBoards().map((board) => board.id),
    ]);

    for (const boardId of boardIds) {
      const baseProfile = baseProfiles?.[boardId] ?? {};
      const polygonOwnerProfile = polygonOwnerProfiles?.[boardId] ?? {};
      const polygonContract = resolveProfilePolygonContract(polygonOwnerProfile, baseProfile);
      merged[boardId] = {
        ...baseProfile,
        ...polygonContract,
      };
    }

    return merged;
  }

  // Phase 29 h1: createDefaultSpecialPolygonMap /
  // createDefaultSpecialPolygonsByBoard removed — the runtime no longer
  // keeps a separate per-room polygon map. Room polygons live in
  // board.rooms[i].polygon (populated by applyRoomCatalog from
  // roomCatalog[*].polygon at hydration time).

  function normalizeShipPolygon(points) {
    return ctx.normalizeSpecialPolygon(points, ctx.SHIP_POLYGON_DEFAULT);
  }

  // Phase 50 (2026-05-25): default-polygon builder that adapts to the
  // board image's aspect ratio so the polygon's pixel-margins stay
  // roughly equal on all four sides. Previously the literal
  // SHIP_POLYGON_DEFAULT (designed for a ~1.46:1 board) stretched
  // non-uniformly on square or wide boards. Operator UAT (2026-05-25):
  // "Das default profil mit den 80% nicht mehr perfekt für alle boards
  // geeignet … das default board sollte die ursprüngliche board-länge
  // nicht verzerren/stretchen sondern die ratio zwischen höhe und länge
  // einhalten. Der User kann es dann hinterher noch so verzerren wie er
  // es möchte". Returns the original SHIP_POLYGON_DEFAULT when aspect
  // ratio is unknown so existing behavior is preserved for boards
  // whose image dimensions haven't been probed.
  function buildAspectAwareDefaultPolygon(aspectRatio) {
    const ar = Number(aspectRatio);
    if (!Number.isFinite(ar) || ar <= 0) {
      return ctx.SHIP_POLYGON_DEFAULT.map((point) => [...point]);
    }
    // Anchor margins to the shorter axis so pixel margins are equal on
    // both axes. baseMargin = 0.08 (8%) and baseChamfer = 0.04 (4%) are
    // the values that match the original polygon on a 1.0:1 board.
    const baseMargin = 0.08;
    const baseChamfer = 0.04;
    const minMargin = 0.02; // never collapse the polygon entirely
    let xMargin;
    let yMargin;
    let xChamfer;
    if (ar >= 1) {
      // wider than tall — shrink X-margin so its pixel value matches Y
      yMargin = baseMargin;
      xMargin = Math.max(minMargin, baseMargin / ar);
      xChamfer = Math.max(minMargin / 2, baseChamfer / ar);
    } else {
      // taller than wide — shrink Y-margin so its pixel value matches X
      xMargin = baseMargin;
      yMargin = Math.max(minMargin, baseMargin * ar);
      xChamfer = baseChamfer;
    }
    return [
      [xMargin, yMargin],
      [1 - xMargin, yMargin],
      [Math.min(1, 1 - xMargin + xChamfer), 0.5],
      [1 - xMargin, 1 - yMargin],
      [xMargin, 1 - yMargin],
      [Math.max(0, xMargin - xChamfer), 0.5],
    ];
  }

  function _resolveBoardAspectRatio(boardId) {
    const board = ctx.getBoard?.(boardId);
    const ar = Number(board?.aspectRatio);
    if (Number.isFinite(ar) && ar > 0) return ar;
    const w = Number(board?.imageWidth);
    const h = Number(board?.imageHeight);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return w / h;
    return null;
  }

  function getDefaultShipPolygonForBoard(boardId = ctx.state.boardId) {
    const ar = _resolveBoardAspectRatio(boardId);
    return buildAspectAwareDefaultPolygon(ar);
  }

  function normalizePlayAreaId(value, fallbackIndex = 0) {
    const raw = String(value || "").trim().toLowerCase();
    const sanitized = raw
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (sanitized) {
      return sanitized;
    }
    return `play-area-${fallbackIndex + 1}`;
  }

  function normalizePlayAreaEntry(entry, fallbackIndex = 0) {
    const id = normalizePlayAreaId(entry?.id, fallbackIndex);
    const fallbackName = `Play Area ${fallbackIndex + 1}`;
    const name = String(entry?.name || "").trim() || fallbackName;
    const polygon = normalizeShipPolygon(entry?.polygon ?? entry?.points ?? entry);
    return {
      id,
      name,
      polygon,
    };
  }

  function normalizePlayAreasCollection(playAreas, fallbackPolygon = ctx.SHIP_POLYGON_DEFAULT) {
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
        polygon: normalizeShipPolygon(fallbackPolygon),
      });
    }

    return normalized;
  }

  function createDefaultPlayAreasByBoard() {
    return Object.fromEntries(
      ctx.getBoards().map((board) => [
        board.id,
        normalizePlayAreasCollection(null, getDefaultShipPolygonForBoard(board.id)),
      ]),
    );
  }

  function createDefaultSelectedPlayAreaIdByBoard() {
    return Object.fromEntries(
      ctx.getBoards().map((board) => {
        const defaults = normalizePlayAreasCollection(null, getDefaultShipPolygonForBoard(board.id));
        return [board.id, defaults[0].id];
      }),
    );
  }

  function getPlayAreas(boardId = ctx.state.boardId) {
    const state = ctx.state;
    const source = state.playAreasByBoard?.[boardId];
    const normalizeCollection = ctx.polygonContract?.normalizePlayAreasCollection ?? normalizePlayAreasCollection;
    const normalized = normalizeCollection(source, ctx.SHIP_POLYGON_DEFAULT);
    state.playAreasByBoard[boardId] = normalized;
    return normalized;
  }

  function getSelectedPlayAreaId(boardId = ctx.state.boardId) {
    const state = ctx.state;
    const areas = getPlayAreas(boardId);
    const preferred = String(state.selectedPlayAreaIdByBoard?.[boardId] || "").trim();
    if (areas.some((area) => area.id === preferred)) {
      return preferred;
    }
    const fallback = areas[0]?.id ?? "play-area-1";
    state.selectedPlayAreaIdByBoard[boardId] = fallback;
    return fallback;
  }

  function setSelectedPlayAreaId(boardId, playAreaId) {
    const state = ctx.state;
    const areas = getPlayAreas(boardId);
    const preferred = String(playAreaId || "").trim();
    const next = areas.some((area) => area.id === preferred) ? preferred : areas[0]?.id;
    if (next) {
      state.selectedPlayAreaIdByBoard[boardId] = next;
    }
  }

  function setPlayAreas(boardId, playAreas, { selectedPlayAreaId = null } = {}) {
    const state = ctx.state;
    const normalized = normalizePlayAreasCollection(playAreas, ctx.SHIP_POLYGON_DEFAULT);
    state.playAreasByBoard[boardId] = normalized;
    const preferred = String(selectedPlayAreaId || state.selectedPlayAreaIdByBoard?.[boardId] || "").trim();
    const selected = normalized.some((area) => area.id === preferred) ? preferred : normalized[0].id;
    state.selectedPlayAreaIdByBoard[boardId] = selected;
    state.shipPolygonsByBoard[boardId] = normalizeShipPolygon(
      normalized.find((area) => area.id === selected)?.polygon ?? normalized[0].polygon,
    );
  }

  function getSelectedPlayArea(boardId = ctx.state.boardId) {
    const areas = getPlayAreas(boardId);
    const selectedId = getSelectedPlayAreaId(boardId);
    return areas.find((area) => area.id === selectedId) ?? areas[0];
  }

  function getShipPolygonPoints(boardId = ctx.state.boardId) {
    return normalizeShipPolygon(getSelectedPlayArea(boardId)?.polygon ?? ctx.SHIP_POLYGON_DEFAULT);
  }

  function setShipPolygonPoints(boardId, points) {
    const areas = getPlayAreas(boardId);
    const selectedId = getSelectedPlayAreaId(boardId);
    const nextPolygon = normalizeShipPolygon(points);
    const updated = areas.map((area) => (area.id === selectedId
      ? { ...area, polygon: nextPolygon }
      : { ...area, polygon: normalizeShipPolygon(area.polygon) }));
    setPlayAreas(boardId, updated, { selectedPlayAreaId: selectedId });
  }

  function normalizeRoomGeometryMap(roomGeometry, boardId) {
    const defaults = createDefaultRoomGeometryMap(boardId);
    for (const room of ctx.getBoard(boardId).rooms) {
      defaults[room.id] = normalizeRoomGeometry(roomGeometry?.[room.id], room, boardId);
    }
    return defaults;
  }

  // Phase 29 h1: normalizeSpecialPolygonMap removed — room polygons live
  // in board.rooms[i].polygon, applied by applyRoomCatalog at hydration.

  window.TT_BEAMER_RUNTIME_PLAY_AREA_GEOMETRY = {
    init,
    isAcceptablePolygonPointerEvent,
    normalizeRoomGeometryMode,
    getRawRoomCenter,
    normalizeRoomGeometry,
    createDefaultRoomGeometryMap,
    createDefaultRoomGeometryByBoard,
    mergeBoardProfilesForGlobalExport,
    resolveProfilePolygonContract,
    applyPolygonPrecedence: mergePolygonPrecedence,
    normalizeShipPolygon,
    buildAspectAwareDefaultPolygon,
    getDefaultShipPolygonForBoard,
    normalizePlayAreaId,
    normalizePlayAreaEntry,
    normalizePlayAreasCollection,
    createDefaultPlayAreasByBoard,
    createDefaultSelectedPlayAreaIdByBoard,
    getPlayAreas,
    getSelectedPlayAreaId,
    setSelectedPlayAreaId,
    setPlayAreas,
    getSelectedPlayArea,
    getShipPolygonPoints,
    setShipPolygonPoints,
    normalizeRoomGeometryMap,
  };
})();
