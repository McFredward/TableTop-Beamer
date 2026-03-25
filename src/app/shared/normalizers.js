(() => {
  const {
    ALL_ANIMATION_TYPES,
    EVENT_SOUND_ASSETS,
    SOUND_MAPPING_NONE,
    ALL_SOUND_ASSET_PATHS,
  } = window.TT_BEAMER_CONFIG;

  function createDefaultAnimationSoundMap() {
    const defaults = {};
    for (const { id } of ALL_ANIMATION_TYPES) {
      defaults[id] = EVENT_SOUND_ASSETS[id]?.[0] ?? SOUND_MAPPING_NONE;
    }
    return defaults;
  }

  function getAnimationLabel(animationType) {
    return ALL_ANIMATION_TYPES.find((entry) => entry.id === animationType)?.label ?? animationType;
  }

  function getGlobalAnimationCategory(animationType, globalAnimations) {
    return globalAnimations.find((entry) => entry.id === animationType)?.category ?? "inside-ship";
  }

  function getGlobalCategoryRuntimeLabel(animationType, globalAnimations) {
    return getGlobalAnimationCategory(animationType, globalAnimations) === "outside-ship"
      ? "GLOBAL-OUTSIDE"
      : "GLOBAL-INSIDE";
  }

  function normalizeAnimationSoundPath(animationType, path) {
    if (path === SOUND_MAPPING_NONE) {
      return SOUND_MAPPING_NONE;
    }
    if (ALL_SOUND_ASSET_PATHS.includes(path)) {
      return path;
    }
    const defaultPath = EVENT_SOUND_ASSETS[animationType]?.[0];
    if (defaultPath && ALL_SOUND_ASSET_PATHS.includes(defaultPath)) {
      return defaultPath;
    }
    return SOUND_MAPPING_NONE;
  }

  function normalizeAnimationSoundMap(soundMap) {
    const defaults = createDefaultAnimationSoundMap();
    for (const animationType of Object.keys(defaults)) {
      defaults[animationType] = normalizeAnimationSoundPath(animationType, soundMap?.[animationType]);
    }
    return defaults;
  }

  function isFiniteUnitValue(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1;
  }

  function normalizeZoneRoom(room, fallbackRadius = 0.055) {
    const radius = Number.isFinite(Number(room?.radius)) ? Number(room.radius) : fallbackRadius;
    const base = {
      id: String(room?.id || "").trim(),
      label: String(room?.label || "").trim(),
      radius,
    };
    if (Array.isArray(room?.points)) {
      return {
        ...base,
        points: room.points.map((point) => [Number(point?.[0]), Number(point?.[1])]),
      };
    }
    return {
      ...base,
      x: Number(room?.x),
      y: Number(room?.y),
    };
  }

  function validateZoneRoom(room, roomIndex = 0) {
    const issues = [];
    if (!room.id) {
      issues.push(`rooms[${roomIndex}].id missing`);
    }
    if (!room.label) {
      issues.push(`rooms[${roomIndex}].label missing`);
    }
    if (!Number.isFinite(room.radius) || room.radius <= 0 || room.radius > 0.25) {
      issues.push(`rooms[${roomIndex}].radius invalid`);
    }
    if (Array.isArray(room.points)) {
      if (room.points.length < 3) {
        issues.push(`rooms[${roomIndex}].points requires >= 3 vertices`);
      }
      room.points.forEach((point, pointIndex) => {
        if (!isFiniteUnitValue(point?.[0]) || !isFiniteUnitValue(point?.[1])) {
          issues.push(`rooms[${roomIndex}].points[${pointIndex}] out of bounds`);
        }
      });
    } else if (!isFiniteUnitValue(room.x) || !isFiniteUnitValue(room.y)) {
      issues.push(`rooms[${roomIndex}] requires x/y in [0..1]`);
    }
    return issues;
  }

  function validateZonePayload(payload, expectedBoardId, requiredRoomIds = []) {
    const issues = [];
    if (!payload || typeof payload !== "object") {
      return {
        ok: false,
        code: "ZONE_INVALID_PAYLOAD",
        issues: ["payload must be an object"],
        normalizedBoard: null,
      };
    }
    const boardMeta = payload.board;
    if (!boardMeta || typeof boardMeta !== "object") {
      issues.push("board metadata missing");
    }
    if (String(boardMeta?.id || "") !== expectedBoardId) {
      issues.push(`board.id mismatch (expected ${expectedBoardId})`);
    }
    if (!boardMeta?.label || !boardMeta?.src) {
      issues.push("board.label/board.src required");
    }
    if (!Array.isArray(payload.rooms) || payload.rooms.length === 0) {
      issues.push("rooms[] required and cannot be empty");
    }

    const normalizedRooms = Array.isArray(payload.rooms)
      ? payload.rooms.map((room) => normalizeZoneRoom(room)).filter((room) => room.id)
      : [];
    const roomIds = new Set();
    normalizedRooms.forEach((room, roomIndex) => {
      const key = room.id;
      if (roomIds.has(key)) {
        issues.push(`duplicate room id: ${key}`);
      }
      roomIds.add(key);
      issues.push(...validateZoneRoom(room, roomIndex));
    });

    if (requiredRoomIds.length > 0) {
      const loadedRoomIds = new Set(normalizedRooms.map((room) => room.id));
      const missingRequired = requiredRoomIds.filter((roomId) => !loadedRoomIds.has(roomId));
      if (missingRequired.length > 0) {
        return {
          ok: false,
          code: "ZONE_PARTIAL_DATA",
          issues: [`missing required room ids: ${missingRequired.join(", ")}`],
          normalizedBoard: null,
        };
      }
    }

    if (issues.length > 0) {
      return {
        ok: false,
        code: "ZONE_VALIDATION_FAILED",
        issues,
        normalizedBoard: null,
      };
    }

    return {
      ok: true,
      code: "OK",
      issues: [],
      normalizedBoard: {
        id: expectedBoardId,
        label: boardMeta.label,
        src: boardMeta.src,
        rooms: normalizedRooms,
      },
    };
  }

  function classifyZoneFallback(responseStatus = null, errorCode = "") {
    if (responseStatus === 404) {
      return "ZONE_FILE_MISSING";
    }
    if (responseStatus === 0) {
      return "ZONE_ENDPOINT_UNREACHABLE";
    }
    if (errorCode === "ZONE_MALFORMED_JSON") {
      return "ZONE_MALFORMED_JSON";
    }
    if (errorCode === "ZONE_PARTIAL_DATA") {
      return "ZONE_PARTIAL_DATA";
    }
    if (errorCode === "ZONE_VALIDATION_FAILED" || errorCode === "ZONE_INVALID_PAYLOAD") {
      return "ZONE_INVALID_STRUCTURE";
    }
    return "ZONE_LOAD_FAILED";
  }

  function clampHitareaOffset(value) {
    return Math.max(-0.15, Math.min(0.15, value));
  }

  function clampHitareaScale(value) {
    return Math.max(0.85, Math.min(1.15, value));
  }

  function normalizeHitareaCalibration(calibration) {
    return {
      offsetX: clampHitareaOffset(Number(calibration?.offsetX) || 0),
      offsetY: clampHitareaOffset(Number(calibration?.offsetY) || 0),
      scale: clampHitareaScale(Number(calibration?.scale) || 1),
    };
  }

  function clampRoomRelativeOffset(value) {
    return Math.max(-0.25, Math.min(0.25, value));
  }

  function clampRoomAbsoluteCoordinate(value) {
    return Math.max(-0.2, Math.min(1.2, value));
  }

  window.TT_BEAMER_NORMALIZERS = {
    createDefaultAnimationSoundMap,
    getAnimationLabel,
    getGlobalAnimationCategory,
    getGlobalCategoryRuntimeLabel,
    normalizeAnimationSoundPath,
    normalizeAnimationSoundMap,
    isFiniteUnitValue,
    normalizeZoneRoom,
    validateZoneRoom,
    validateZonePayload,
    classifyZoneFallback,
    clampHitareaOffset,
    clampHitareaScale,
    normalizeHitareaCalibration,
    clampRoomRelativeOffset,
    clampRoomAbsoluteCoordinate,
  };
})();
