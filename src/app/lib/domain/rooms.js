// Rooms domain. Pure helpers — normalizeBoard, normalizeRoom,
// mergeRoomCatalog — used by every client of the rooms data
// shape - runtime, settings, live-sync, and persistence.

(() => {
  const ROOM_SCHEMA = "tt-beamer.room.v2";

  function clampUnit(value) {
    return Math.max(-0.2, Math.min(1.2, Number(value) || 0));
  }

  function normalizePoint(point) {
    return [clampUnit(point?.[0]), clampUnit(point?.[1])];
  }

  function isValidPolygon(points) {
    return Array.isArray(points) && points.length >= 3;
  }

  function createHexagonPolygon({ x = 0.5, y = 0.5, radius = 0.055 } = {}) {
    const polygon = [];
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 3) * i;
      polygon.push(normalizePoint([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]));
    }
    return polygon;
  }

  function normalizeRoomName(value, fallback = "Room") {
    const trimmed = String(value || "").trim();
    return trimmed || fallback;
  }

  function normalizeRoom(room, index = 0) {
    const id = String(room?.id || "").trim() || `room-${index + 1}`;
    const radius = Number(room?.radius) || 0.055;
    const x = Number(room?.x);
    const y = Number(room?.y);
    const polygon = isValidPolygon(room?.polygon)
      ? room.polygon.map(normalizePoint)
      : isValidPolygon(room?.points)
        ? room.points.map(normalizePoint)
        : Number.isFinite(x) && Number.isFinite(y)
          ? createHexagonPolygon({ x, y, radius })
          : createHexagonPolygon();
    const fallbackLabel = String(room?.label || "").trim() || `Room ${index + 1}`;
    const name = normalizeRoomName(room?.name ?? room?.label, fallbackLabel);
    return {
      id,
      name,
      label: name,
      polygon,
      points: polygon.map((point) => [...point]),
      x: Number.isFinite(x) ? x : polygon[0]?.[0] ?? 0.5,
      y: Number.isFinite(y) ? y : polygon[0]?.[1] ?? 0.5,
      radius,
      meta: {
        schema: ROOM_SCHEMA,
        spawnShape: room?.meta?.spawnShape || (room?.points ? "custom" : "hexagon"),
        templateSource: room?.meta?.templateSource ? String(room.meta.templateSource) : null,
      },
    };
  }

  function normalizeBoard(board) {
    const roomIds = new Set((board?.rooms || []).map((room) => String(room?.id || "").trim()).filter(Boolean));
    const roomClusters = (Array.isArray(board?.roomClusters) ? board.roomClusters : [])
      .map((cluster, index) => {
        const clusterId = String(cluster?.clusterId || cluster?.id || "").trim() || `cluster-${index + 1}`;
        const name = String(cluster?.name || cluster?.label || "").trim() || `Cluster ${index + 1}`;
        const roomIdsInCluster = Array.from(
          new Set(
            (Array.isArray(cluster?.roomIds) ? cluster.roomIds : [])
              .map((roomId) => String(roomId || "").trim())
              .filter((roomId) => roomIds.has(roomId)),
          ),
        );
        return {
          clusterId,
          name,
          roomIds: roomIdsInCluster,
        };
      })
      .filter((cluster) => cluster.roomIds.length > 0);
    return {
      ...board,
      rooms: (board?.rooms || []).map((room, index) => normalizeRoom(room, index)),
      roomClusters,
    };
  }

  function cloneBoard(board) {
    return {
      ...board,
      rooms: (board?.rooms || []).map((room, index) => normalizeRoom(room, index)),
    };
  }

  function roomToCatalogEntry(room) {
    return {
      id: room.id,
      name: room.name || room.label || room.id,
      polygon: (room.polygon || room.points || []).map(normalizePoint),
      meta: {
        schema: ROOM_SCHEMA,
        spawnShape: room?.meta?.spawnShape || "custom",
        templateSource: room?.meta?.templateSource ? String(room.meta.templateSource) : null,
      },
    };
  }

  function mergeRoomCatalog(board, roomCatalog = []) {
    const baseRooms = board.rooms || [];
    if (!Array.isArray(roomCatalog) || roomCatalog.length === 0) {
      return normalizeBoard({
        ...board,
        rooms: baseRooms,
      });
    }
    const catalogById = new Map(roomCatalog.map((room) => [room.id, room]));
    const merged = baseRooms.map((room, index) => {
      const catalogRoom = catalogById.get(room.id);
      if (!catalogRoom) {
        return normalizeRoom(room, index);
      }
      return normalizeRoom(
        {
          ...room,
          id: room.id,
          name: catalogRoom.name,
          polygon: catalogRoom.polygon,
          meta: {
            ...(room.meta || {}),
            ...(catalogRoom.meta || {}),
          },
        },
        index,
      );
    });
    for (const catalogRoom of roomCatalog) {
      if (merged.some((room) => room.id === catalogRoom.id)) {
        continue;
      }
      merged.push(normalizeRoom(catalogRoom, merged.length));
    }
    return {
      ...board,
      rooms: merged,
    };
  }

  function createRoomId(board) {
    const existing = new Set((board.rooms || []).map((room) => room.id));
    let i = (board.rooms || []).length + 1;
    let candidate = `room-${i}`;
    while (existing.has(candidate)) {
      i += 1;
      candidate = `room-${i}`;
    }
    return candidate;
  }

  window.TT_BEAMER_ROOMS = {
    ROOM_SCHEMA,
    normalizePoint,
    isValidPolygon,
    createHexagonPolygon,
    normalizeRoomName,
    normalizeRoom,
    normalizeBoard,
    cloneBoard,
    roomToCatalogEntry,
    applyRoomCatalog: mergeRoomCatalog,
    createRoomId,
  };
})();
