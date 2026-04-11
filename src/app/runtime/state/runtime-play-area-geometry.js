// Phase 14-2: play area + room geometry + polygon contract module.
//
// Owns polygon acceptance predicate, room geometry mode/normalization/
// default maps, room tombstone CRUD, special polygon merge helpers,
// board profile merger for global export, polygon contract resolver,
// play area normalizers (id/entry/collection/defaults), play area
// CRUD state accessors, ship polygon helpers, and the final
// normalizeRoomGeometryMap / normalizeSpecialPolygonMap.
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

  function normalizeRoomTombstoneIds(ids, boardId) {
    void boardId;
    return Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [])
          .map((entry) => String(entry || "").trim())
          .filter(Boolean),
      ),
    );
  }

  function createDefaultRoomTombstonesByBoard() {
    return Object.fromEntries(ctx.getBoards().map((board) => [board.id, []]));
  }

  function markRoomTombstone(boardId, roomId) {
    const state = ctx.state;
    if (!boardId || !roomId) {
      return;
    }
    const current = state.roomTombstonesByBoard?.[boardId] ?? [];
    const next = normalizeRoomTombstoneIds([...current, roomId], boardId);
    if (!state.roomTombstonesByBoard) {
      state.roomTombstonesByBoard = {};
    }
    state.roomTombstonesByBoard[boardId] = next;
  }

  function clearRoomTombstone(boardId, roomId) {
    const state = ctx.state;
    if (!boardId || !roomId) {
      return;
    }
    const current = state.roomTombstonesByBoard?.[boardId] ?? [];
    if (!current.includes(roomId)) {
      return;
    }
    if (!state.roomTombstonesByBoard) {
      state.roomTombstonesByBoard = {};
    }
    state.roomTombstonesByBoard[boardId] = normalizeRoomTombstoneIds(
      current.filter((entry) => entry !== roomId),
      boardId,
    );
  }

  function mergeSpecialPolygonMaps(primaryMap, fallbackMap) {
    const merged = { ...(fallbackMap && typeof fallbackMap === "object" ? fallbackMap : {}) };
    if (!primaryMap || typeof primaryMap !== "object") {
      return merged;
    }
    for (const [roomId, polygon] of Object.entries(primaryMap)) {
      if (ctx.isValidSpecialPolygon(polygon)) {
        merged[roomId] = polygon;
      }
    }
    return merged;
  }

  function filterRoomCatalogByDeletedIds(roomCatalog, deletedRoomIds) {
    if (!Array.isArray(roomCatalog)) {
      return null;
    }
    const tombstones = new Set(normalizeRoomTombstoneIds(deletedRoomIds));
    if (tombstones.size === 0) {
      return roomCatalog;
    }
    return roomCatalog.filter((room) => !tombstones.has(String(room?.id || "").trim()));
  }

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
        primary.playAreaPolygon
        ?? primary.shipPolygon
        ?? fallback.playAreaPolygon
        ?? fallback.shipPolygon
        ?? ctx.SHIP_POLYGON_DEFAULT,
      );
      const preferredSelectedPlayAreaId = String(primary.selectedPlayAreaId || fallback.selectedPlayAreaId || "").trim();
      const selectedPlayAreaId = mergedPlayAreas.some((area) => area.id === preferredSelectedPlayAreaId)
        ? preferredSelectedPlayAreaId
        : mergedPlayAreas[0].id;
      const selectedPlayArea = mergedPlayAreas.find((area) => area.id === selectedPlayAreaId) ?? mergedPlayAreas[0];
      const deletedRoomIds = normalizeRoomTombstoneIds([
        ...(Array.isArray(fallback.deletedRoomIds) ? fallback.deletedRoomIds : fallback.roomTombstones ?? []),
        ...(Array.isArray(primary.deletedRoomIds) ? primary.deletedRoomIds : primary.roomTombstones ?? []),
      ]);
      const roomCatalog = filterRoomCatalogByDeletedIds(
        Array.isArray(primary.roomCatalog)
          ? primary.roomCatalog
          : Array.isArray(fallback.roomCatalog)
            ? fallback.roomCatalog
            : null,
        deletedRoomIds,
      );

      merged[boardId] = {
        ...fallback,
        ...primary,
        roomCatalog,
        deletedRoomIds,
        specialPolygons: mergeSpecialPolygonMaps(primary.specialPolygons, fallback.specialPolygons),
        playAreas: mergedPlayAreas,
        selectedPlayAreaId,
        playAreaPolygon: normalizeShipPolygon(selectedPlayArea?.polygon ?? ctx.SHIP_POLYGON_DEFAULT),
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
      ?? ctx.SHIP_POLYGON_DEFAULT;
    const playAreas = normalizePlayAreasCollection(candidatePlayAreas, candidateFallbackPolygon);
    const preferredSelectedId = String(profile.selectedPlayAreaId || fallbackProfile.selectedPlayAreaId || "").trim();
    const selectedPlayAreaId = playAreas.some((entry) => entry.id === preferredSelectedId)
      ? preferredSelectedId
      : playAreas[0]?.id ?? "play-area-1";
    const selectedPlayArea = playAreas.find((entry) => entry.id === selectedPlayAreaId) ?? playAreas[0];
    return {
      playAreas,
      selectedPlayAreaId,
      playAreaPolygon: normalizeShipPolygon(selectedPlayArea?.polygon ?? candidateFallbackPolygon ?? ctx.SHIP_POLYGON_DEFAULT),
    };
  }

  function applyPolygonPrecedence(baseProfiles = {}, polygonOwnerProfiles = {}) {
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

  function createDefaultSpecialPolygonMap(boardId) {
    const board = ctx.getBoard(boardId);
    const specials = board.rooms.filter((room) => room.id.startsWith("special-") && ctx.getRoomSourcePoints(room, boardId).length >= 3);
    return Object.fromEntries(
      specials.map((room) => [room.id, ctx.normalizeSpecialPolygon(ctx.getRoomSourcePoints(room, boardId), ctx.getRoomSourcePoints(room, boardId))]),
    );
  }

  function createDefaultSpecialPolygonsByBoard() {
    return Object.fromEntries(
      ctx.getBoards().map((board) => [board.id, createDefaultSpecialPolygonMap(board.id)]),
    );
  }

  function normalizeShipPolygon(points) {
    return ctx.normalizeSpecialPolygon(points, ctx.SHIP_POLYGON_DEFAULT);
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
        normalizePlayAreasCollection(null, ctx.SHIP_POLYGON_DEFAULT),
      ]),
    );
  }

  function createDefaultSelectedPlayAreaIdByBoard() {
    return Object.fromEntries(
      ctx.getBoards().map((board) => {
        const defaults = normalizePlayAreasCollection(null, ctx.SHIP_POLYGON_DEFAULT);
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

  function normalizeSpecialPolygonMap(polygonMap, boardId, preservedPolygonMap = null) {
    const defaults = createDefaultSpecialPolygonMap(boardId);
    for (const room of ctx.getSpecialRooms(boardId)) {
      const preserved = preservedPolygonMap?.[room.id];
      const fallbackPoints = ctx.isValidSpecialPolygon(preserved) ? preserved : room.points ?? [];
      const source = ctx.isValidSpecialPolygon(polygonMap?.[room.id])
        ? polygonMap[room.id]
        : fallbackPoints;
      defaults[room.id] = ctx.normalizeSpecialPolygon(source, fallbackPoints);
    }
    return defaults;
  }

  window.TT_BEAMER_RUNTIME_PLAY_AREA_GEOMETRY = {
    init,
    isAcceptablePolygonPointerEvent,
    normalizeRoomGeometryMode,
    getRawRoomCenter,
    normalizeRoomGeometry,
    createDefaultRoomGeometryMap,
    createDefaultRoomGeometryByBoard,
    normalizeRoomTombstoneIds,
    createDefaultRoomTombstonesByBoard,
    markRoomTombstone,
    clearRoomTombstone,
    mergeSpecialPolygonMaps,
    filterRoomCatalogByDeletedIds,
    mergeBoardProfilesForGlobalExport,
    resolveProfilePolygonContract,
    applyPolygonPrecedence,
    createDefaultSpecialPolygonMap,
    createDefaultSpecialPolygonsByBoard,
    normalizeShipPolygon,
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
    normalizeSpecialPolygonMap,
  };
})();
