// Phase 14-2: per-board runtime state accessors.
//
// Owns per-board getters/setters for hitarea calibration, room
// geometry, special polygons, room source points, active-polygon
// room tracking, room state profiles (broken/burning/alien/corpse),
// simple clamp helpers, room animation type predicates, and
// resolve helpers for the room→global equivalent mapping.
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

  function getSpecialPolygonPoints(boardId, roomId) {
    const state = ctx.state;
    const boardPolygons = state.specialPolygonsByBoard[boardId] ?? {};
    const room = ctx.getBoard(boardId).rooms.find((entry) => entry.id === roomId);
    return ctx.normalizeSpecialPolygon(boardPolygons[roomId], room?.polygon ?? room?.points ?? []);
  }

  function setSpecialPolygonPoints(boardId, roomId, points) {
    const state = ctx.state;
    if (!state.specialPolygonsByBoard[boardId]) {
      state.specialPolygonsByBoard[boardId] = ctx.createDefaultSpecialPolygonMap(boardId);
    }
    const room = ctx.getBoard(boardId).rooms.find((entry) => entry.id === roomId);
    const normalized = ctx.normalizeSpecialPolygon(points, room?.polygon ?? room?.points ?? []);
    state.specialPolygonsByBoard[boardId][roomId] = normalized;
    if (room) {
      room.polygon = normalized.map((point) => [...point]);
      room.points = normalized.map((point) => [...point]);
    }
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
    return ctx.getBoard(boardId).rooms;
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

  function normalizeRoomStateProfile(profile) {
    return {
      broken: Boolean(profile?.broken),
      burning: Boolean(profile?.burning),
      alienCount: clampAlienCount(profile?.alienCount),
      corpse: Boolean(profile?.corpse),
    };
  }

  function createDefaultRoomStateProfileMap(boardId) {
    const board = ctx.getBoard(boardId);
    return Object.fromEntries(
      board.rooms.map((room) => [room.id, normalizeRoomStateProfile(ctx.ROOM_STATE_DEFAULT)]),
    );
  }

  function createDefaultRoomStateProfilesByBoard() {
    return Object.fromEntries(
      ctx.getBoards().map((board) => [board.id, createDefaultRoomStateProfileMap(board.id)]),
    );
  }

  function normalizeRoomStateProfileMap(profiles, boardId) {
    const defaults = createDefaultRoomStateProfileMap(boardId);
    for (const room of ctx.getBoard(boardId).rooms) {
      defaults[room.id] = normalizeRoomStateProfile(profiles?.[room.id]);
    }
    return defaults;
  }

  function getRoomStateProfile(boardId, roomId) {
    return normalizeRoomStateProfile(ctx.state.roomStateProfilesByBoard?.[boardId]?.[roomId]);
  }

  function setRoomStateProfile(boardId, roomId, profile) {
    const state = ctx.state;
    if (!state.roomStateProfilesByBoard[boardId]) {
      state.roomStateProfilesByBoard[boardId] = createDefaultRoomStateProfileMap(boardId);
    }
    state.roomStateProfilesByBoard[boardId][roomId] = normalizeRoomStateProfile(profile);
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
    getSpecialPolygonPoints,
    setSpecialPolygonPoints,
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
    normalizeRoomStateProfile,
    createDefaultRoomStateProfileMap,
    createDefaultRoomStateProfilesByBoard,
    normalizeRoomStateProfileMap,
    getRoomStateProfile,
    setRoomStateProfile,
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
