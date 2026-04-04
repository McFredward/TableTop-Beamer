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
    createDefaultRoomAnimationDefinitions,
    createDefaultInsideAnimationDefinitions,
    OUTSIDE_FX_DEFAULT,
  }) {
    const migrated = createDefaultBoardProfiles();
    for (const board of boards) {
      const profile = candidate?.[board.id] ?? {};
      const legacyPolygon =
        profile.playAreaPolygon ??
        profile.playArea ??
        profile.shipPolygon ??
        profile.shipMask ??
        profile.insidePolygon ??
        profile.outsidePolygon ??
        profile.inside?.polygon ??
        profile.inside?.playAreaPolygon ??
        profile.outside?.polygon ??
        profile.outside?.playAreaPolygon ??
        SHIP_POLYGON_DEFAULT;
      const playAreas = Array.isArray(profile.playAreas) && profile.playAreas.length > 0
        ? profile.playAreas
        : [
          {
            id: "play-area-1",
            name: "Play Area 1",
            polygon: legacyPolygon,
          },
        ];
        migrated[board.id] = {
          roomCatalog: profile.roomCatalog ?? profile.rooms ?? profile.roomModel ?? null,
          deletedRoomIds: profile.deletedRoomIds ?? profile.roomTombstones ?? [],
          roomClusters: profile.roomClusters ?? profile.clusters ?? null,
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
        playAreas,
        selectedPlayAreaId: profile.selectedPlayAreaId ?? playAreas[0]?.id ?? "play-area-1",
        playAreaPolygon: legacyPolygon,
        roomFx: {
          animations:
            profile.roomFx?.animations
            ?? profile.room?.animations
            ?? profile.roomAnimations
            ?? createDefaultRoomAnimationDefinitions(),
          selectedAnimationId:
            profile.roomFx?.selectedAnimationId
            ?? profile.room?.selectedAnimationId
            ?? profile.selectedRoomAnimationId
            ?? createDefaultRoomAnimationDefinitions()[0]?.id
            ?? "kaputt",
        },
        insideFx: {
          animations:
            profile.insideFx?.animations ??
            profile.inside?.animations ??
            profile.insideAnimations ??
            createDefaultInsideAnimationDefinitions(),
          selectedAnimationId:
            profile.insideFx?.selectedAnimationId ??
            profile.inside?.selectedAnimationId ??
            profile.selectedInsideAnimationId ??
            createDefaultInsideAnimationDefinitions()[0]?.id ??
            "ambient-drift",
        },
        outsideFx: {
          ...(profile.outsideFx ?? profile.outside ?? OUTSIDE_FX_DEFAULT),
          ...(Array.isArray(profile.outsideAnimations) ? { animations: profile.outsideAnimations } : {}),
          ...(profile.selectedOutsideAnimationId
            ? { selectedAnimationId: profile.selectedOutsideAnimationId }
            : {}),
        },
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
