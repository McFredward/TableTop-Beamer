(() => {
  function readJson(storage, key) {
    try {
      const raw = storage.getItem(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeJson(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function extractBoardProfilesCandidate(raw, boards) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    if (raw.boards && typeof raw.boards === "object") {
      return raw.boards;
    }

    if (raw.boardProfiles && typeof raw.boardProfiles === "object") {
      return raw.boardProfiles;
    }

    if (
      raw.hitareaCalibrationByBoard ||
      raw.roomGeometryByBoard ||
      raw.roomStateProfilesByBoard ||
      raw.specialPolygonsByBoard ||
      raw.roomCatalogByBoard
    ) {
      return Object.fromEntries(
        boards.map((board) => [
          board.id,
          {
            roomCatalog: raw.roomCatalogByBoard?.[board.id] ?? raw.roomsByBoard?.[board.id],
            hitareaCalibration: raw.hitareaCalibrationByBoard?.[board.id],
            roomGeometry: raw.roomGeometryByBoard?.[board.id],
            roomStateProfiles: raw.roomStateProfilesByBoard?.[board.id],
            specialPolygons: raw.specialPolygonsByBoard?.[board.id],
          },
        ]),
      );
    }

    const hasBoardKeys = boards.some((board) => raw[board.id] && typeof raw[board.id] === "object");
    if (hasBoardKeys) {
      return raw;
    }

    return null;
  }

  function loadLegacyRoomGeometryByBoard({ storage, key, boards, createDefault, normalizeMap }) {
    const defaults = createDefault();
    const parsed = readJson(storage, key);
    if (!parsed || typeof parsed !== "object") {
      return defaults;
    }
    for (const board of boards) {
      defaults[board.id] = normalizeMap(parsed[board.id], board.id);
    }
    return defaults;
  }

  function loadLegacySpecialPolygonsByBoard({ storage, key, boards, createDefault, normalizeMap }) {
    const defaults = createDefault();
    const parsed = readJson(storage, key);
    if (!parsed || typeof parsed !== "object") {
      return defaults;
    }
    for (const board of boards) {
      defaults[board.id] = normalizeMap(parsed[board.id], board.id);
    }
    return defaults;
  }

  function loadHitareaCalibrationMap({ storage, key, boards, createDefault, normalize }) {
    const defaults = createDefault();
    const parsed = readJson(storage, key);
    if (!parsed || typeof parsed !== "object") {
      return defaults;
    }
    for (const board of boards) {
      defaults[board.id] = normalize(parsed[board.id]);
    }
    return defaults;
  }

  function buildMigratedBoardProfiles({
    boards,
    candidate,
    legacyHitarea,
    legacyRoomGeometry,
    legacySpecialPolygons,
    createDefaultBoardProfiles,
    createDefaultRoomGeometryMap,
    createDefaultRoomStateProfileMap,
    createDefaultSpecialPolygonMap,
    HITAREA_CALIBRATION_DEFAULT,
    SHIP_POLYGON_DEFAULT,
    OUTSIDE_FX_DEFAULT,
  }) {
    const migrated = createDefaultBoardProfiles();
    for (const board of boards) {
      const profile = candidate?.[board.id] ?? {};
      migrated[board.id] = {
        roomCatalog: profile.roomCatalog ?? profile.rooms ?? profile.roomModel ?? null,
        hitareaCalibration:
          profile.hitareaCalibration ?? profile.hitarea ?? legacyHitarea[board.id] ?? HITAREA_CALIBRATION_DEFAULT,
        roomGeometry:
          profile.roomGeometry ??
          profile.geometry ??
          legacyRoomGeometry[board.id] ??
          createDefaultRoomGeometryMap(board.id),
        roomStateProfiles:
          profile.roomStateProfiles ?? profile.roomStates ?? createDefaultRoomStateProfileMap(board.id),
        specialPolygons:
          profile.specialPolygons ??
          profile.polygons ??
          legacySpecialPolygons[board.id] ??
          createDefaultSpecialPolygonMap(board.id),
        shipPolygon: profile.shipPolygon ?? profile.shipMask ?? SHIP_POLYGON_DEFAULT,
        outsideFx: profile.outsideFx ?? profile.outside ?? OUTSIDE_FX_DEFAULT,
      };
    }
    return migrated;
  }

  window.TT_BEAMER_PERSISTENCE = {
    readJson,
    writeJson,
    extractBoardProfilesCandidate,
    loadLegacyRoomGeometryByBoard,
    loadLegacySpecialPolygonsByBoard,
    loadHitareaCalibrationMap,
    buildMigratedBoardProfiles,
  };
})();
