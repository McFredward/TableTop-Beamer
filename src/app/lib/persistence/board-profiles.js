// Board-profile persistence. localStorage read/write plus JSON-schema
// validation for the tt-beamer.board-profiles.v3 key. Pure storage
// layer; the projection-mapping module owns the in-memory profile state.

(() => {
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
      raw.roomCatalogByBoard
    ) {
      // Phase 29 h1: legacy *ByBoard fan-out for room polygons +
      // roomGeometry dropped — roomCatalog (with embedded
      // room.polygon) is the single source of truth.
      return Object.fromEntries(
        boards.map((board) => [
          board.id,
          {
            roomCatalog: raw.roomCatalogByBoard?.[board.id] ?? raw.roomsByBoard?.[board.id],
            hitareaCalibration: raw.hitareaCalibrationByBoard?.[board.id],
          },
        ]),
      );
    }

    const hasBoardKeys = boards.some((board) => raw[board.id] && typeof raw[board.id] === "object");
    if (hasBoardKeys) {
      return raw;
    }

    const looksLikeBoardProfileMap = Object.entries(raw).some(([key, value]) => {
      if (!key || typeof value !== "object" || Array.isArray(value) || !value) {
        return false;
      }
      return Boolean(
        value.playAreas
        || value.roomCatalog
        || value.outsideFx
        || value.roomFx
        || value.insideFx,
      );
    });

    if (looksLikeBoardProfileMap) {
      return raw;
    }

    return null;
  }

  function buildMigratedBoardProfiles({
    boards,
    candidate,
    createDefaultBoardProfiles,
    createDefaultRoomGeometryMap,
    HITAREA_CALIBRATION_DEFAULT,
    SHIP_POLYGON_DEFAULT,
    createDefaultRoomAnimationDefinitions,
    createDefaultInsideAnimationDefinitions,
    OUTSIDE_FX_DEFAULT,
  }) {
    const migrated = createDefaultBoardProfiles();
    const boardIdSet = new Set([...(boards || []).map((board) => board.id), ...Object.keys(candidate || {})]);
    for (const boardId of boardIdSet) {
      const board = boards.find((entry) => entry.id === boardId) ?? { id: boardId };
      const profile = candidate?.[boardId] ?? {};
      const legacyPolygon =
        profile.playArea ??
        profile.shipPolygon ??
        profile.shipMask ??
        profile.insidePolygon ??
        profile.outsidePolygon ??
        profile.inside?.polygon ??
        profile.outside?.polygon ??
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
      migrated[boardId] = {
        roomCatalog: profile.roomCatalog ?? profile.rooms ?? profile.roomModel ?? null,
        roomClusters: profile.roomClusters ?? profile.clusters ?? null,
        hitareaCalibration:
          profile.hitareaCalibration ?? profile.hitarea ?? HITAREA_CALIBRATION_DEFAULT,
        // Phase 29 h1: per-room polygons live exclusively in
        // roomCatalog[*].polygon — no separate top-level entry.
        roomGeometry:
          profile.roomGeometry ??
          profile.geometry ??
          createDefaultRoomGeometryMap(boardId),
        playAreas,
        selectedPlayAreaId: profile.selectedPlayAreaId ?? playAreas[0]?.id ?? "play-area-1",
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
            "hull-flicker",
        },
        outsideFx: {
          ...(profile.outsideFx ?? profile.outside ?? OUTSIDE_FX_DEFAULT),
          ...(Array.isArray(profile.outsideAnimations) ? { animations: profile.outsideAnimations } : {}),
          ...(profile.selectedOutsideAnimationId
            ? { selectedAnimationId: profile.selectedOutsideAnimationId }
            : {}),
        },
        defaultAnimations: Array.isArray(profile.defaultAnimations) ? profile.defaultAnimations : [],
        frozenRooms: profile.frozenRooms && typeof profile.frozenRooms === "object" ? profile.frozenRooms : {},
      };
    }
    return migrated;
  }

  window.TT_BEAMER_PERSISTENCE = {
    extractBoardProfilesCandidate,
    buildMigratedBoardProfiles,
  };
})();
