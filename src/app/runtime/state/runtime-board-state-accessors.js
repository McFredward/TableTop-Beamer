// per-board runtime state accessors.
//
// Owns per-board getters/setters for hitarea calibration, room
// geometry, room polygons (read/write room.polygon directly), room
// source points, active-polygon room tracking, simple clamp helpers,
// room animation type predicates, and resolve helpers for the
// room→global equivalent mapping.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function createDefaultHitareaCalibrationMap() {
    return Object.fromEntries(
      ctx.getBoards().map((board) => [board.id, { ...ctx.HITAREA_CALIBRATION_DEFAULT }]),
    );
  }

  function getHitareaCalibration(boardId = ctx.state.boardId) {
    return (
      ctx.state.hitareaCalibrationByBoard[boardId] ?? {
        ...ctx.HITAREA_CALIBRATION_DEFAULT,
      }
    );
  }

  function setHitareaCalibration(boardId, calibration) {
    ctx.state.hitareaCalibrationByBoard[boardId] = ctx.normalizeHitareaCalibration(calibration);
  }

  function getRoomGeometry(boardId, roomId) {
    const state = ctx.state;
    const boardGeometry = state.roomGeometryByBoard[boardId] ?? {};
    const room = ctx.getBoard(boardId).rooms.find((entry) => entry.id === roomId);
    return ctx.normalizeRoomGeometry(boardGeometry[roomId], room, boardId);
  }

  function setRoomGeometry(boardId, roomId, geometry) {
    const state = ctx.state;
    if (!state.roomGeometryByBoard[boardId]) {
      state.roomGeometryByBoard[boardId] = ctx.createDefaultRoomGeometryMap(boardId);
    }
    const room = ctx.getBoard(boardId).rooms.find((entry) => entry.id === roomId);
    state.roomGeometryByBoard[boardId][roomId] = ctx.normalizeRoomGeometry(geometry, room, boardId);
  }

  function updateRoomGeometry(boardId, roomId, partial) {
    const previous = getRoomGeometry(boardId, roomId);
    setRoomGeometry(boardId, roomId, { ...previous, ...partial });
  }

  // Phase 29 h1: legacy per-room shadow map collapsed to room.polygon
  // as the single source of truth. The previous accessor-level map
  // was redundant — every read had a fallback to room.polygon and
  // every write mirrored back to room.polygon + room.points. Now
  // read/write room.polygon directly via the renamed helpers below.
  function getRoomPolygonPoints(boardId, roomId) {
    const room = ctx.getBoard(boardId)?.rooms?.find((entry) => entry.id === roomId);
    const fallback = room?.polygon ?? room?.points ?? [];
    return ctx.normalizeSpecialPolygon(fallback, fallback);
  }

  function setRoomPolygonPoints(boardId, roomId, points) {
    const room = ctx.getBoard(boardId)?.rooms?.find((entry) => entry.id === roomId);
    if (!room) return;
    const fallbackPoints = room.polygon ?? room.points ?? [];
    const normalized = ctx.normalizeSpecialPolygon(points, fallbackPoints);
    room.polygon = normalized.map((point) => [...point]);
    room.points = normalized.map((point) => [...point]);
  }

  function getDefaultRoomPolygon(boardId, roomId) {
    const fallbackBoard = ctx.INLINE_FALLBACK_BOARDS.find((board) => board.id === boardId);
    const fallbackRoom = fallbackBoard?.rooms?.find((room) => room.id === roomId);
    const normalizedRoom = fallbackRoom ? window.TT_BEAMER_ROOMS.normalizeRoom(fallbackRoom) : null;
    if (normalizedRoom?.polygon?.length >= 3) {
      return normalizedRoom.polygon;
    }
    return null;
  }

  function getRoomSourcePoints(room, boardId = ctx.state.boardId) {
    if (Array.isArray(room?.polygon) && room.polygon.length >= 3) {
      return room.polygon;
    }
    if (Array.isArray(room?.points) && room.points.length >= 3) {
      return room.points;
    }
    return [];
  }

  function getSpecialRooms(boardId = ctx.state.boardId) {
    // During init (nav regression) the board catalog may not be ready yet.
    // Return an empty array instead of crashing on board?.rooms.
    const board = ctx.getBoard(boardId);
    return Array.isArray(board?.rooms) ? board.rooms : [];
  }

  function getActivePolygonRoomId(boardId = ctx.state.boardId) {
    const available = getSpecialRooms(boardId);
    const preferred = ctx.state.polygonEditor.roomIdByBoard[boardId];
    if (available.some((room) => room.id === preferred)) {
      return preferred;
    }
    return available[0]?.id ?? null;
  }

  function resolvePolygonEditingRoomId(boardId = ctx.state.boardId) {
    const rooms = getSpecialRooms(boardId);
    const selectedRoomId = syncSelectedRoomStateForBoard(boardId);
    if (rooms.some((room) => room.id === selectedRoomId)) {
      setActivePolygonRoomId(boardId, selectedRoomId);
      return selectedRoomId;
    }
    return getActivePolygonRoomId(boardId);
  }

  function syncSelectedRoomStateForBoard(boardId = ctx.state.boardId) {
    const state = ctx.state;
    const rooms = getSpecialRooms(boardId);
    const remembered = state.selectedRoomByBoard[boardId];
    const current = boardId === state.boardId ? state.selectedRoomId : remembered;
    const nextRoomId = rooms.some((room) => room.id === current)
      ? current
      : rooms.some((room) => room.id === remembered)
        ? remembered
        : null;
    state.selectedRoomByBoard[boardId] = nextRoomId;
    if (boardId === state.boardId) {
      state.selectedRoomId = nextRoomId;
    }
    return nextRoomId;
  }

  function setActivePolygonRoomId(boardId, roomId) {
    ctx.state.polygonEditor.roomIdByBoard[boardId] = roomId;
  }

  function clampRoomIntensity(value) {
    return Math.max(0.2, Math.min(1.5, value));
  }

  function clampRoomOpacity(value) {
    return Math.max(0.1, Math.min(1, Number(value) || 1));
  }

  function clampGifPlaybackSpeed(value) {
    return Math.max(0.25, Math.min(3, Number(value) || 1));
  }

  function clampRoomDurationSec(value) {
    return Math.max(1, Math.min(180, value));
  }

  function clampAlienCount(value) {
    return Math.max(0, Math.min(2, Math.round(Number(value) || 0)));
  }

  function isRoomAnimationType(type) {
    return Boolean(ctx.getRoomAnimationDefinitionById(type, ctx.state.boardId));
  }

  function isRoomGlobalEquivalent(type) {
    return Boolean(getRoomEquivalentType(type, ctx.state.boardId));
  }

  function resolveRoomAnimationEffectType(type, boardId = ctx.state.boardId) {
    const definition = ctx.getRoomAnimationDefinitionById(type, boardId);
    if (definition && ctx.normalizeRoomAssetType(definition.assetType) === "coded") {
      return ctx.resolveRoomCodedEffectType(definition.assetRef);
    }
    if (type === "scanning") {
      return "special-scanning";
    }
    return ctx.ROOM_GLOBAL_EQUIVALENT_MAP[type] ?? type;
  }

  function getRoomEquivalentType(type, boardId = ctx.state.boardId) {
    const definition = ctx.getRoomAnimationDefinitionById(type, boardId);
    if (definition && ctx.normalizeRoomAssetType(definition.assetType) === "coded") {
      const resolved = ctx.resolveRoomCodedEffectType(definition.assetRef);
      if (resolved === "intruder-alert" || resolved === "hull-flicker") {
        return resolved;
      }
      return null;
    }
    return ctx.ROOM_GLOBAL_EQUIVALENT_MAP[type] ?? null;
  }

  function getRoomGifAssetFileName(type, boardId = ctx.state.boardId) {
    const definition = ctx.getRoomAnimationDefinitionById(type, boardId);
    const path = definition && ctx.normalizeRoomAssetType(definition.assetType) === "gif"
      ? definition.assetRef
      : ctx.ROOM_GIF_ANIMATION_ASSETS[type];
    return path ? path.split("/").pop() ?? path : null;
  }

  function isRoomFrozen(boardId = ctx.state.boardId, roomId) {
    return Boolean(ctx.state.frozenRoomsByBoard?.[boardId]?.[roomId]);
  }

  function setRoomFrozen(boardId, roomId, frozen) {
    const state = ctx.state;
    if (!state.frozenRoomsByBoard[boardId]) {
      state.frozenRoomsByBoard[boardId] = {};
    }
    if (frozen) {
      state.frozenRoomsByBoard[boardId][roomId] = true;
    } else {
      delete state.frozenRoomsByBoard[boardId][roomId];
    }
  }

  function normalizeFrozenRoomsMap(raw, boardId) {
    if (!raw || typeof raw !== "object") {
      return {};
    }
    const board = ctx.getBoard(boardId);
    const validIds = new Set(board.rooms.map((room) => room.id));
    const result = {};
    for (const roomId of Object.keys(raw)) {
      if (validIds.has(roomId) && raw[roomId]) {
        result[roomId] = true;
      }
    }
    return result;
  }

  window.TT_BEAMER_RUNTIME_BOARD_STATE_ACCESSORS = {
    init,
    createDefaultHitareaCalibrationMap,
    getHitareaCalibration,
    setHitareaCalibration,
    getRoomGeometry,
    setRoomGeometry,
    updateRoomGeometry,
    getRoomPolygonPoints,
    setRoomPolygonPoints,
    getDefaultRoomPolygon,
    getRoomSourcePoints,
    getSpecialRooms,
    getActivePolygonRoomId,
    resolvePolygonEditingRoomId,
    syncSelectedRoomStateForBoard,
    setActivePolygonRoomId,
    clampRoomIntensity,
    clampRoomOpacity,
    clampGifPlaybackSpeed,
    clampRoomDurationSec,
    clampAlienCount,
    isRoomAnimationType,
    isRoomGlobalEquivalent,
    resolveRoomAnimationEffectType,
    getRoomEquivalentType,
    getRoomGifAssetFileName,
    isRoomFrozen,
    setRoomFrozen,
    normalizeFrozenRoomsMap,
  };
})();
