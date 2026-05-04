// board profile hydration module.
//
// Owns the board-profile shape: create defaults, build snapshots from
// runtime state, serialize to storage, apply hydrated profiles back to
// state, extract candidates from persistence, migrate legacy profiles,
// and the top-level loadBoardProfiles bootstrap.
//
// BOARDS is reassigned via the injected setBoards callback.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  // Phase 28 B1 (T-28-01-01): path-traversal-safe profile-name validator.
  // Accepts trimmed strings matching /^[a-zA-Z0-9 _.-]{1,80}$/, returns the
  // trimmed string. Anything else (non-string, empty, traversal chars,
  // overlength, etc.) is silently coerced to null. Used both when building
  // outbound profiles and when applying inbound profiles, so the field is
  // always normalized at trust-boundary entry.
  const PROFILE_NAME_PATTERN = /^[a-zA-Z0-9 _.-]{1,80}$/;
  function validateProfileName(raw) {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return PROFILE_NAME_PATTERN.test(trimmed) ? trimmed : null;
  }

  function createDefaultBoardProfiles() {
    return Object.fromEntries(
      ctx.getBoards().map((board) => [
        board.id,
        {
          roomCatalog: board.rooms.map((room) => ctx.roomToCatalogEntry(room)),
          deletedRoomIds: [],
          roomClusters: Array.isArray(board.roomClusters) ? board.roomClusters.map((cluster) => ({ ...cluster })) : [],
          roomStateProfiles: ctx.createDefaultRoomStateProfileMap(board.id),
          specialPolygons: ctx.createDefaultSpecialPolygonMap(board.id),
          playAreas: ctx.normalizePlayAreasCollection(null, ctx.SHIP_POLYGON_DEFAULT),
          selectedPlayAreaId: "play-area-1",
          playAreaPolygon: ctx.normalizeShipPolygon(ctx.SHIP_POLYGON_DEFAULT),
          roomFx: ctx.normalizeRoomFxProfile({ animations: ctx.createDefaultRoomAnimationDefinitions() }),
          insideFx: ctx.normalizeInsideFxProfile({ animations: ctx.createDefaultInsideAnimationDefinitions() }),
          outsideFx: ctx.normalizeOutsideFxProfile(ctx.OUTSIDE_FX_DEFAULT),
        },
      ]),
    );
  }

  function buildBoardProfilesFromState() {
    const state = ctx.state;
    return Object.fromEntries(
      ctx.getBoards().map((board) => [
        board.id,
        {
          roomCatalog: board.rooms.map((room) => ctx.roomToCatalogEntry(room)),
          deletedRoomIds: ctx.normalizeRoomTombstoneIds(state.roomTombstonesByBoard?.[board.id], board.id),
          roomClusters: Array.isArray(board.roomClusters) ? board.roomClusters.map((cluster) => ({ ...cluster })) : [],
          roomStateProfiles: ctx.normalizeRoomStateProfileMap(state.roomStateProfilesByBoard[board.id], board.id),
          specialPolygons: ctx.normalizeSpecialPolygonMap(state.specialPolygonsByBoard[board.id], board.id),
          playAreas: ctx.getPlayAreas(board.id).map((area) => ({
            id: area.id,
            name: area.name,
            polygon: ctx.normalizeShipPolygon(area.polygon),
          })),
          selectedPlayAreaId: ctx.getSelectedPlayAreaId(board.id),
          playAreaPolygon: ctx.normalizeShipPolygon(state.shipPolygonsByBoard[board.id]),
          roomFx: ctx.normalizeRoomFxProfile(state.roomFxByBoard?.[board.id]),
          insideFx: ctx.normalizeInsideFxProfile(state.insideFxByBoard[board.id]),
          outsideFx: ctx.normalizeOutsideFxProfile(state.outsideFxByBoard[board.id]),
          defaultAnimations: state.defaultAnimationsByBoard[board.id] || [],
          frozenRooms: state.frozenRoomsByBoard[board.id] || {},
          // Phase 28 B1 (D-02): emit explicit null when invalid OR absent so
          // the round-trip is bit-exact for boards that have never had a
          // profile loaded. The server's BOARD_PROFILE_FIELDS iterator
          // skips `undefined` but persists `null`.
          lastUsedProfileName: validateProfileName(state.lastUsedProfileNameByBoard?.[board.id]),
        },
      ]),
    );
  }

  function buildPersistedRuntimeSettingsFromState() {
    const state = ctx.state;
    const mp4Controls = ctx.getMp4PerformanceControls();
    return {
      audio: {
        enabled: Boolean(state.audio.enabled),
        volume: window.TT_BEAMER_RUNTIME_UTILS.clamp01(Number(state.audio.volume) || 0),
      },
      animationSpeed: ctx.clampAnimationSpeed(state.animationSpeed),
      animationSoundMap: ctx.normalizeAnimationSoundMap(state.animationSoundMap),
      renderMode: normalizeRenderMode(state.renderMode),
      diagnosticOverlay: Boolean(state.diagnosticOverlay),
      mp4Performance: {
        tier: mp4Controls.tier,
        renderCap: mp4Controls.renderCap,
        qualityFloor: mp4Controls.qualityFloor,
        degradeThreshold: mp4Controls.degradeThreshold,
        recoverThreshold: mp4Controls.recoverThreshold,
      },
      // Projection mapping corners
      ...(window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING
        ? { projectionMapping: { corners: window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING.getCornersForPersistence() } }
        : {}),
    };
  }

  function normalizeRenderMode(value) {
    return value === "2d" || value === "gl" ? value : "auto";
  }

  function buildBoardProfileStoragePayload() {
    return {
      schema: "tt-beamer.board-profiles.v3",
      savedAt: new Date().toISOString(),
      boards: buildBoardProfilesFromState(),
      ...buildPersistedRuntimeSettingsFromState(),
    };
  }

  function applyPersistedRuntimeSettings(payload) {
    if (!payload || typeof payload !== "object") {
      return;
    }
    const state = ctx.state;

    if (payload.audio && typeof payload.audio === "object") {
      state.audio.enabled = Boolean(payload.audio.enabled);
      const nextVolume = Number(payload.audio.volume);
      if (Number.isFinite(nextVolume)) {
        state.audio.volume = window.TT_BEAMER_RUNTIME_UTILS.clamp01(nextVolume);
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "animationSpeed")) {
      state.animationSpeed = ctx.clampAnimationSpeed(payload.animationSpeed);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "animationSoundMap")) {
      state.animationSoundMap = ctx.normalizeAnimationSoundMap(payload.animationSoundMap);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "mp4Performance")) {
      state.runtimePerf.mp4Controls = ctx.normalizeMp4PerformanceControls(payload.mp4Performance);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "renderMode")) {
      state.renderMode = normalizeRenderMode(payload.renderMode);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "diagnosticOverlay")) {
      state.diagnosticOverlay = Boolean(payload.diagnosticOverlay);
    }
  }

  function applyBoardProfilesToState(profiles) {
    const state = ctx.state;
    const nextBoards = ctx.getBoards().map((board) => {
      const deletedRoomIds = ctx.normalizeRoomTombstoneIds(
        profiles?.[board.id]?.deletedRoomIds ?? profiles?.[board.id]?.roomTombstones,
        board.id,
      );
      const roomCatalog = profiles?.[board.id]?.roomCatalog ?? profiles?.[board.id]?.rooms ?? null;
      const nextBoard = ctx.applyRoomCatalog(board, roomCatalog, deletedRoomIds);
      nextBoard.roomClusters = Array.isArray(profiles?.[board.id]?.roomClusters)
        ? profiles[board.id].roomClusters.map((cluster) => ({ ...cluster }))
        : Array.isArray(nextBoard.roomClusters)
          ? nextBoard.roomClusters.map((cluster) => ({ ...cluster }))
          : [];
      return nextBoard;
    });
    ctx.setBoards(nextBoards);
    const BOARDS = ctx.getBoards();
    state.roomTombstonesByBoard = Object.fromEntries(
      BOARDS.map((board) => [
        board.id,
        ctx.normalizeRoomTombstoneIds(
          profiles?.[board.id]?.deletedRoomIds ?? profiles?.[board.id]?.roomTombstones,
          board.id,
        ),
      ]),
    );
    // hitareaCalibration + roomGeometry
    // no longer read from profiles. The migration script baked them
    // into specialPolygons and the pipeline is identity now.
    state.roomStateProfilesByBoard = Object.fromEntries(
      BOARDS.map((board) => [
        board.id,
        ctx.normalizeRoomStateProfileMap(profiles?.[board.id]?.roomStateProfiles, board.id),
      ]),
    );
    state.specialPolygonsByBoard = Object.fromEntries(
      BOARDS.map((board) => [
        board.id,
        ctx.normalizeSpecialPolygonMap(
          profiles?.[board.id]?.specialPolygons,
          board.id,
          state.specialPolygonsByBoard?.[board.id],
        ),
      ]),
    );
    state.defaultAnimationsByBoard = Object.fromEntries(
      BOARDS.map((board) => [board.id, Array.isArray(profiles?.[board.id]?.defaultAnimations) ? profiles[board.id].defaultAnimations : []]),
    );
    state.frozenRoomsByBoard = Object.fromEntries(
      BOARDS.map((board) => [board.id, ctx.normalizeFrozenRoomsMap(profiles?.[board.id]?.frozenRooms, board.id)]),
    );
    // Sync specialPolygonsByBoard → room.polygon so
    // getRoomSourcePoints (which reads room.polygon) sees the
    // user-edited coordinates, not the stale roomCatalog ones.
    // Previously the hitarea+geometry transform pipeline masked
    // this gap; with the pipeline now identity, room.polygon must
    // carry the authoritative polygon data directly.
    for (const board of BOARDS) {
      const boardPolygons = state.specialPolygonsByBoard[board.id] ?? {};
      for (const room of board.rooms) {
        const edited = boardPolygons[room.id];
        if (Array.isArray(edited) && edited.length >= 3) {
          room.polygon = edited.map((point) => [...point]);
          room.points = edited.map((point) => [...point]);
        }
      }
    }
    // The incoming config may carry polygons with a
    // different centroid than whatever we had cached. Clear every
    // anchor so each room reseats its stable stretch origin from the
    // freshly-hydrated polygon on next access.
    if (state.roomStretchAnchorCache) {
      state.roomStretchAnchorCache.clear();
    }
    state.playAreasByBoard = Object.fromEntries(
      BOARDS.map((board) => {
        const profile = profiles?.[board.id] ?? {};
        const migratedPlayAreas = ctx.normalizePlayAreasCollection(
          profile.playAreas,
          profile.playAreaPolygon ?? profile.shipPolygon ?? profile.shipMask ?? ctx.SHIP_POLYGON_DEFAULT,
        );
        return [board.id, migratedPlayAreas];
      }),
    );
    state.selectedPlayAreaIdByBoard = Object.fromEntries(
      BOARDS.map((board) => {
        const profile = profiles?.[board.id] ?? {};
        const areas = state.playAreasByBoard[board.id] ?? ctx.normalizePlayAreasCollection(null, ctx.SHIP_POLYGON_DEFAULT);
        const preferred = String(profile.selectedPlayAreaId || "").trim();
        const selected = areas.some((area) => area.id === preferred) ? preferred : areas[0]?.id ?? "play-area-1";
        return [board.id, selected];
      }),
    );
    state.shipPolygonsByBoard = Object.fromEntries(
      BOARDS.map((board) => {
        const selected = ctx.getSelectedPlayArea(board.id);
        return [board.id, ctx.normalizeShipPolygon(selected?.polygon ?? ctx.SHIP_POLYGON_DEFAULT)];
      }),
    );
    state.outsideFxByBoard = Object.fromEntries(
      BOARDS.map((board) => [board.id, ctx.normalizeOutsideFxProfile(profiles?.[board.id]?.outsideFx)]),
    );
    state.roomFxByBoard = Object.fromEntries(
      BOARDS.map((board) => [board.id, ctx.normalizeRoomFxProfile(profiles?.[board.id]?.roomFx)]),
    );
    state.insideFxByBoard = Object.fromEntries(
      BOARDS.map((board) => [board.id, ctx.normalizeInsideFxProfile(profiles?.[board.id]?.insideFx)]),
    );
    // Phase 28 B1 (D-02): hydrate per-board last-used projection profile name.
    // Validator rejects path-traversal characters (T-28-01-01) and clamps
    // invalid/absent values to null so legacy boards (no field on disk) cleanly
    // fall through to the auto-load default-geometry branch (D-03 fallback).
    state.lastUsedProfileNameByBoard = Object.fromEntries(
      BOARDS.map((board) => [
        board.id,
        validateProfileName(profiles?.[board.id]?.lastUsedProfileName),
      ]),
    );
  }

  function extractBoardProfilesCandidate(raw) {
    return ctx.extractBoardProfilesCandidateFromPersistence(raw, ctx.getBoards());
  }

  function buildMigratedBoardProfiles(candidate) {
    return ctx.buildMigratedBoardProfilesFromPersistence({
      boards: ctx.getBoards(),
      candidate,
      createDefaultBoardProfiles,
      createDefaultRoomGeometryMap: ctx.createDefaultRoomGeometryMap,
      createDefaultRoomStateProfileMap: ctx.createDefaultRoomStateProfileMap,
      createDefaultSpecialPolygonMap: ctx.createDefaultSpecialPolygonMap,
      HITAREA_CALIBRATION_DEFAULT: ctx.HITAREA_CALIBRATION_DEFAULT,
      SHIP_POLYGON_DEFAULT: ctx.SHIP_POLYGON_DEFAULT,
      createDefaultRoomAnimationDefinitions: ctx.createDefaultRoomAnimationDefinitions,
      createDefaultInsideAnimationDefinitions: ctx.createDefaultInsideAnimationDefinitions,
      OUTSIDE_FX_DEFAULT: ctx.OUTSIDE_FX_DEFAULT,
    });
  }

  // Hydrate from the server-supplied bootstrap payload. If none
  // is available, apply defaults so the runtime still has valid state (the
  // blocking error overlay handles user-visible messaging separately).
  function loadBoardProfiles() {
    const bootstrapPayload = window.__TT_BEAMER_BOOTSTRAP_CONFIG__ || null;
    if (bootstrapPayload && typeof bootstrapPayload === "object") {
      const candidate = extractBoardProfilesCandidate(bootstrapPayload);
      if (candidate) {
        applyBoardProfilesToState(buildMigratedBoardProfiles(candidate));
        applyPersistedRuntimeSettings(bootstrapPayload);
        return;
      }
    }
    applyBoardProfilesToState(buildMigratedBoardProfiles(null));
  }

  window.TT_BEAMER_RUNTIME_BOARD_PROFILES = {
    init,
    createDefaultBoardProfiles,
    buildBoardProfilesFromState,
    buildPersistedRuntimeSettingsFromState,
    buildBoardProfileStoragePayload,
    applyPersistedRuntimeSettings,
    applyBoardProfilesToState,
    extractBoardProfilesCandidate,
    buildMigratedBoardProfiles,
    loadBoardProfiles,
    normalizeRenderMode,
    // Phase 28 B1: exported for cross-module consumers (e.g. defensive
    // re-validation at write sites in runtime-projection-profile-persistence).
    validateProfileName,
  };
})();
