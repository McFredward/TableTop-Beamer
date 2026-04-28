// inside/outside/room FX profile normalizer module.
//
// Owns the normalize/create/get/set helpers for FX profiles across
// the three scopes (inside, outside, room). All cross-dependencies
// (BOARDS, state, asset-ref normalizers, clamp helpers) are injected
// via ctx.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  // Shared sound-asset-ref normalizer used by all three
  // animation definition normalizers. Accepts an explicit path from
  // ALL_SOUND_ASSET_PATHS, the sentinel "none" (SOUND_MAPPING_NONE),
  // or falls back to "none" for empty/unknown input. Default per
  // user request: animations start with no sound.
  function normalizeSoundAssetRef(value) {
    const sentinelNone = ctx?.SOUND_MAPPING_NONE ?? "none";
    const allPaths = Array.isArray(ctx?.ALL_SOUND_ASSET_PATHS) ? ctx.ALL_SOUND_ASSET_PATHS : [];
    if (value == null || value === "" || value === sentinelNone) {
      return sentinelNone;
    }
    const trimmed = String(value).trim();
    if (trimmed === sentinelNone || !trimmed) {
      return sentinelNone;
    }
    if (allPaths.includes(trimmed)) return trimmed;
    // Allow user-uploaded sound files in /resources/sounds/.
    // Accept any path under that folder with a known audio extension —
    // the server's upload endpoint only writes files matching this
    // pattern, so accepting them here closes the round-trip.
    if (/^\/resources\/sounds\/.+\.(mp3|wav|ogg|m4a)$/i.test(trimmed)) {
      return trimmed;
    }
    return sentinelNone;
  }

  // Accept a design-system icon key if it exists in
  // ICON_DEFS (loaded by icons.js), otherwise return null. null is
  // the "no user override" sentinel — resolveAnimationIcon falls back
  // to its heuristic (coded-effect type / name keywords) in that case.
  // If icons.js hasn't loaded yet (server-side snapshot parse, boot
  // ordering quirks) we just round-trip whatever string came in, so
  // we never lose the field; a later re-normalize with icons loaded
  // will validate it.
  function normalizeIconKey(value) {
    if (value == null) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const defs = window.TT_BEAMER_UI_ICONS?.ICON_DEFS;
    if (!defs) return trimmed;
    return Object.prototype.hasOwnProperty.call(defs, trimmed) ? trimmed : null;
  }

  // ========= INSIDE =========

  function normalizeInsideAssetType(value) {
    return ctx.OUTSIDE_ANIMATION_ASSET_TYPES.includes(value) ? value : "coded";
  }

  function normalizeInsideAnimationId(value, fallback = "hull-flicker") {
    const trimmed = String(value || "").trim();
    return trimmed || fallback;
  }

  function normalizeInsideAnimationDefinition(definition, fallbackIndex = 0) {
    const fallbackDefaults = ctx.createDefaultInsideAnimationDefinitions()[0] ?? {
      id: `inside-${fallbackIndex + 1}`,
      name: `Inside Animation ${fallbackIndex + 1}`,
      assetType: "coded",
      assetRef: "hull-flicker",
      intensity: 1,
      speed: 1,
    };
    const id = normalizeInsideAnimationId(definition?.id, fallbackDefaults.id);
    const name = String(definition?.name || "").trim() || fallbackDefaults.name;
    const assetType = normalizeInsideAssetType(definition?.assetType);
    const rawAssetRef = String(definition?.assetRef || "").trim();
    const fallbackAssetRef = assetType === "coded" ? id : "";
    const assetRef = ctx.normalizeInsideAssetRefForType(assetType, rawAssetRef, fallbackAssetRef);
    return {
      id,
      name,
      assetType,
      assetRef,
      intensity: ctx.clampOutsideIntensity(definition?.intensity),
      speed: ctx.clampOutsideSpeed(definition?.speed),
      loopUntilStopped: Boolean(definition?.loopUntilStopped ?? definition?.hold),
      // Per-definition sound selector. Default = none.
      soundAssetRef: normalizeSoundAssetRef(definition?.soundAssetRef),
      // User-assigned icon key from the design-system set.
      // Empty string / missing → null so resolveAnimationIcon falls back
      // to its heuristic (coded-effect type / name keywords).
      icon: normalizeIconKey(definition?.icon),
    };
  }

  function normalizeInsideAnimationDefinitions(definitions, { allowEmpty = false } = {}) {
    // allowEmpty=true: caller passed an explicit array (possibly
    // empty) and wants the result respected verbatim. Used for
    // newly-imported boards which start with no animations so the
    // user can populate them via "copy from board".
    const isExplicitArray = Array.isArray(definitions);
    const incoming = isExplicitArray ? definitions : [];
    const normalized = incoming
      .map((entry, index) => normalizeInsideAnimationDefinition(entry, index))
      .filter((entry) => entry && typeof entry === "object");
    const uniqueById = [];
    const seen = new Set();
    for (const entry of normalized) {
      if (seen.has(entry.id)) {
        continue;
      }
      seen.add(entry.id);
      uniqueById.push(entry);
    }
    if (uniqueById.length > 0 || (allowEmpty && isExplicitArray)) {
      return uniqueById;
    }
    return ctx.createDefaultInsideAnimationDefinitions().map((entry, index) => normalizeInsideAnimationDefinition(entry, index));
  }

  function normalizeInsideFxProfile(profile) {
    const legacyProfile = profile && typeof profile === "object" ? profile : {};
    const rawAnimations = legacyProfile?.animations ?? legacyProfile?.insideAnimations;
    const animations = normalizeInsideAnimationDefinitions(rawAnimations, {
      allowEmpty: Array.isArray(rawAnimations),
    });
    if (animations.length === 0) {
      // Empty animations on purpose (new board). Return a profile
      // shape that downstream renderers can read without crashing —
      // selected ids/refs are blank, gating booleans default to off.
      return {
        selectedAnimationId: "",
        animations,
        intensity: 1,
        speed: 1,
        assetType: "coded",
        assetRef: "",
        loopUntilStopped: false,
      };
    }
    const preferredId = normalizeInsideAnimationId(
      legacyProfile?.selectedAnimationId ?? legacyProfile?.selectedInsideAnimationId,
      animations[0]?.id ?? "hull-flicker",
    );
    const selectedAnimation = animations.find((entry) => entry.id === preferredId) ?? animations[0];
    return {
      selectedAnimationId: selectedAnimation.id,
      animations,
      intensity: selectedAnimation.intensity,
      speed: selectedAnimation.speed,
      assetType: selectedAnimation.assetType,
      assetRef: selectedAnimation.assetRef,
      loopUntilStopped: Boolean(selectedAnimation.loopUntilStopped),
    };
  }

  function createDefaultInsideFxByBoard() {
    return Object.fromEntries(
      ctx.getBoards().map((board) => [board.id, normalizeInsideFxProfile({ animations: ctx.createDefaultInsideAnimationDefinitions() })]),
    );
  }

  function getInsideFxProfile(boardId = ctx.state.boardId) {
    return normalizeInsideFxProfile(ctx.state.insideFxByBoard?.[boardId]);
  }

  function setInsideFxProfile(boardId, profile) {
    ctx.state.insideFxByBoard[boardId] = normalizeInsideFxProfile(profile);
  }

  function getSelectedInsideAnimationDefinition(boardId = ctx.state.boardId) {
    const profile = getInsideFxProfile(boardId);
    const selectedId = normalizeInsideAnimationId(profile.selectedAnimationId, profile.animations[0]?.id);
    return profile.animations.find((entry) => entry.id === selectedId) ?? profile.animations[0] ?? null;
  }

  function createInsideAnimationDefinition(name, existingDefinitions = [], initialValues = null) {
    const baseName = String(name || "").trim() || "Inside Animation";
    const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "inside-animation";
    let candidateId = slug;
    const existingIds = new Set(existingDefinitions.map((entry) => String(entry.id || "").trim()));
    let suffix = 2;
    while (existingIds.has(candidateId)) {
      candidateId = `${slug}-${suffix}`;
      suffix += 1;
    }
    // Seed the new definition with the user's current
    // editor-panel values when provided, so "Create" captures what
    // the user has already been configuring instead of forcing a
    // follow-up edit step.
    const seeded = initialValues && typeof initialValues === "object" ? initialValues : {};
    return normalizeInsideAnimationDefinition({
      id: candidateId,
      name: baseName,
      assetType: seeded.assetType ?? "coded",
      assetRef: seeded.assetRef ?? "hull-flicker",
      intensity: seeded.intensity ?? 1,
      speed: seeded.speed ?? 1,
      soundAssetRef: seeded.soundAssetRef,
    });
  }

  // ========= OUTSIDE =========

  function normalizeOutsideAssetType(value) {
    return ctx.OUTSIDE_ANIMATION_ASSET_TYPES.includes(value) ? value : "coded";
  }

  function normalizeOutsideAnimationId(value, fallback = "outside-space") {
    const trimmed = String(value || "").trim();
    return trimmed || fallback;
  }

  function normalizeOutsideAnimationDefinition(definition, fallbackIndex = 0) {
    const fallbackDefaults = ctx.createDefaultOutsideAnimationDefinitions()[0] ?? {
      id: `outside-${fallbackIndex + 1}`,
      name: `Outside Animation ${fallbackIndex + 1}`,
      assetType: "coded",
      assetRef: "outside-space",
      intensity: 0.7,
      speed: 1,
      mode: "standard",
      direction: "forward",
      soundEnabled: false,
    };
    const id = normalizeOutsideAnimationId(definition?.id, fallbackDefaults.id);
    const name = String(definition?.name || "").trim() || fallbackDefaults.name;
    const assetType = normalizeOutsideAssetType(definition?.assetType);
    const rawAssetRef = String(definition?.assetRef || "").trim();
    const fallbackAssetRef =
      assetType === "coded"
        ? "outside-space"
        : ctx.normalizeOutsideAssetRefForType(assetType, fallbackDefaults.assetRef, "");
    const assetRef = ctx.normalizeOutsideAssetRefForType(assetType, rawAssetRef, fallbackAssetRef);
    return {
      id,
      name,
      assetType,
      assetRef,
      intensity: ctx.clampOutsideIntensity(definition?.intensity),
      speed: ctx.clampOutsideSpeed(definition?.speed),
      mode: ctx.normalizeOutsideMode(definition?.mode),
      direction: ctx.normalizeOutsideDirection(definition?.direction),
      soundEnabled: Boolean(definition?.soundEnabled),
      // Per-definition sound selector. Default = none.
      soundAssetRef: normalizeSoundAssetRef(definition?.soundAssetRef),
      // User-assigned icon key (see Inside normalizer).
      icon: normalizeIconKey(definition?.icon),
    };
  }

  function normalizeOutsideAnimationDefinitions(definitions, legacyProfile = null, { allowEmpty = false } = {}) {
    const isExplicitArray = Array.isArray(definitions);
    const incoming = isExplicitArray ? definitions : [];
    const normalized = incoming
      .map((entry, index) => normalizeOutsideAnimationDefinition(entry, index))
      .filter((entry) => entry && typeof entry === "object");
    const uniqueById = [];
    const seen = new Set();
    for (const entry of normalized) {
      if (seen.has(entry.id)) {
        continue;
      }
      seen.add(entry.id);
      uniqueById.push(entry);
    }
    if (uniqueById.length > 0 || (allowEmpty && isExplicitArray)) {
      return uniqueById;
    }
    const defaults = ctx.createDefaultOutsideAnimationDefinitions();
    if (!legacyProfile || typeof legacyProfile !== "object") {
      return defaults.map((entry, index) => normalizeOutsideAnimationDefinition(entry, index));
    }
    return defaults.map((entry, index) => {
      if (index !== 0) {
        return normalizeOutsideAnimationDefinition(entry, index);
      }
      return normalizeOutsideAnimationDefinition(
        {
          ...entry,
          intensity: legacyProfile?.intensity,
          speed: legacyProfile?.speed,
          mode: legacyProfile?.mode,
          direction: legacyProfile?.direction,
        },
        index,
      );
    });
  }

  function normalizeOutsideFxProfile(profile) {
    const legacyProfile = profile && typeof profile === "object" ? profile : ctx.OUTSIDE_FX_DEFAULT;
    const rawAnimations = legacyProfile?.animations ?? legacyProfile?.outsideAnimations;
    const animations = normalizeOutsideAnimationDefinitions(
      rawAnimations,
      legacyProfile,
      { allowEmpty: Array.isArray(rawAnimations) },
    );
    if (animations.length === 0) {
      return {
        enabled: Boolean(legacyProfile?.enabled),
        selectedAnimationId: "",
        animations,
        intensity: 1,
        speed: 1,
        mode: "standard",
        direction: "forward",
        assetType: "coded",
        assetRef: "",
      };
    }
    const preferredId = normalizeOutsideAnimationId(
      legacyProfile?.selectedAnimationId ?? legacyProfile?.selectedOutsideAnimationId,
      animations[0]?.id ?? "outside-space",
    );
    const selectedAnimation = animations.find((entry) => entry.id === preferredId) ?? animations[0];
    return {
      enabled: Boolean(legacyProfile?.enabled),
      selectedAnimationId: selectedAnimation.id,
      animations,
      intensity: selectedAnimation.intensity,
      speed: selectedAnimation.speed,
      mode: selectedAnimation.mode,
      direction: selectedAnimation.direction,
      assetType: selectedAnimation.assetType,
      assetRef: selectedAnimation.assetRef,
    };
  }

  function createDefaultOutsideFxByBoard() {
    return Object.fromEntries(
      ctx.getBoards().map((board) => [board.id, normalizeOutsideFxProfile(ctx.OUTSIDE_FX_DEFAULT)]),
    );
  }

  function getOutsideFxProfile(boardId = ctx.state.boardId) {
    return normalizeOutsideFxProfile(ctx.state.outsideFxByBoard[boardId]);
  }

  function setOutsideFxProfile(boardId, profile) {
    ctx.state.outsideFxByBoard[boardId] = normalizeOutsideFxProfile(profile);
  }

  function updateOutsideFxProfile(boardId, partial) {
    const current = getOutsideFxProfile(boardId);
    const merged = { ...current, ...partial };
    const definitions = normalizeOutsideAnimationDefinitions(merged.animations, merged);
    const selectedId = normalizeOutsideAnimationId(merged.selectedAnimationId, definitions[0]?.id);
    const selectedDefinition = definitions.find((entry) => entry.id === selectedId) ?? definitions[0];
    const updatedDefinitions = definitions.map((entry) => (entry.id === selectedDefinition.id
      ? {
        ...entry,
        intensity: ctx.clampOutsideIntensity(merged.intensity),
        speed: ctx.clampOutsideSpeed(merged.speed),
        mode: ctx.normalizeOutsideMode(merged.mode),
        direction: ctx.normalizeOutsideDirection(merged.direction),
        assetType: normalizeOutsideAssetType(merged.assetType),
        assetRef: String(merged.assetRef || "").trim() || entry.assetRef,
      }
      : entry));
    setOutsideFxProfile(boardId, {
      ...merged,
      selectedAnimationId: selectedDefinition.id,
      animations: updatedDefinitions,
    });
  }

  function getSelectedOutsideAnimationDefinition(boardId = ctx.state.boardId) {
    const profile = getOutsideFxProfile(boardId);
    const selectedId = normalizeOutsideAnimationId(profile.selectedAnimationId, profile.animations[0]?.id);
    return profile.animations.find((entry) => entry.id === selectedId) ?? profile.animations[0] ?? null;
  }

  // "Is this animation type an outside animation?" — driven
  // purely by the board's outside profile, so custom outside animations
  // are recognized just like built-in ones. Used by the render path to
  // decide whether an animation belongs to the outside (masked) layer
  // instead of the inside-ship layer.
  function isOutsideAnimationType(type, boardId = ctx.state.boardId) {
    if (!type) return false;
    const profile = getOutsideFxProfile(boardId);
    return Array.isArray(profile?.animations)
      && profile.animations.some((entry) => entry?.id === type);
  }

  function resolveOutsideTimeline(elapsedSeconds, speed) {
    const normalizedElapsed = Math.max(0, Number(elapsedSeconds) || 0);
    const normalizedSpeed = ctx.clampOutsideSpeed(speed);
    return {
      timeline: normalizedElapsed * normalizedSpeed,
    };
  }

  function createOutsideAnimationDefinition(name, existingDefinitions = [], initialValues = null) {
    const baseName = String(name || "").trim() || "Outside Animation";
    const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "outside-animation";
    let candidateId = slug;
    const existingIds = new Set(existingDefinitions.map((entry) => String(entry.id || "").trim()));
    let suffix = 2;
    while (existingIds.has(candidateId)) {
      candidateId = `${slug}-${suffix}`;
      suffix += 1;
    }
    // Inherit the user's current editor values so the
    // newly-created entry matches what the user has been configuring.
    const seeded = initialValues && typeof initialValues === "object" ? initialValues : {};
    return normalizeOutsideAnimationDefinition({
      id: candidateId,
      name: baseName,
      assetType: seeded.assetType ?? "coded",
      assetRef: seeded.assetRef ?? "outside-space",
      intensity: seeded.intensity ?? 0.7,
      speed: seeded.speed ?? 1,
      mode: seeded.mode ?? "standard",
      direction: seeded.direction ?? "forward",
      soundEnabled: seeded.soundEnabled ?? false,
      soundAssetRef: seeded.soundAssetRef,
    });
  }

  // ========= ROOM =========

  function normalizeRoomAssetType(value) {
    return ctx.OUTSIDE_ANIMATION_ASSET_TYPES.includes(value) ? value : "coded";
  }

  function normalizeRoomAnimationId(value, fallback = "kaputt") {
    const trimmed = String(value || "").trim();
    return trimmed || fallback;
  }

  function normalizeRoomAnimationDefinition(definition, fallbackIndex = 0) {
    const fallbackDefaults = ctx.createDefaultRoomAnimationDefinitions()[0] ?? {
      id: `room-animation-${fallbackIndex + 1}`,
      name: `Room Animation ${fallbackIndex + 1}`,
      assetType: "coded",
      assetRef: "intruder-alert",
    };
    const id = normalizeRoomAnimationId(definition?.id, fallbackDefaults.id);
    const name = String(definition?.name || "").trim() || fallbackDefaults.name;
    const assetType = normalizeRoomAssetType(definition?.assetType);
    const rawAssetRef = String(definition?.assetRef || "").trim();
    const fallbackAssetRef = ctx.normalizeRoomAssetRefForType(assetType, fallbackDefaults.assetRef, "");
    const assetRef = ctx.normalizeRoomAssetRefForType(assetType, rawAssetRef, fallbackAssetRef);
    // mp4/gif room animations now support per-definition
    // transform options. Defaults preserve the pre-phase behaviour
    // (stretch to polygon, no rotation, no offset).
    const clamp = (value, min, max, fallback) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, n));
    };
    return {
      id,
      name,
      assetType,
      assetRef,
      // Per-definition sound selector. Default = none.
      soundAssetRef: normalizeSoundAssetRef(definition?.soundAssetRef),
      rotationDeg: clamp(definition?.rotationDeg, -360, 360, 0),
      stretchToPolygon: definition?.stretchToPolygon !== false,
      widthScale: clamp(definition?.widthScale, 0.05, 10, 1),
      heightScale: clamp(definition?.heightScale, 0.05, 10, 1),
      offsetXScale: clamp(definition?.offsetXScale, -2, 2, 0),
      offsetYScale: clamp(definition?.offsetYScale, -2, 2, 0),
      opacity: clamp(definition?.opacity, 0.1, 1, 0.9),
      intensity: clamp(definition?.intensity, 0.2, 1.5, 0.8),
      speed: clamp(definition?.speed, 0.1, 2.5, 1),
      soundVolume: clamp(definition?.soundVolume, 0, 1, 1),
      colorHex: typeof definition?.colorHex === "string" && /^#[0-9a-f]{6}$/i.test(definition.colorHex) ? definition.colorHex : "#ff0000",
      // Opt-in. When true and this definition resolves to
      // hull-flicker, a running instance in room R cuts any concurrent
      // solid-color animation in R during the flicker's off-gate.
      breaksSolidColor: Boolean(definition?.breaksSolidColor),
      // User-assigned icon key (see Inside normalizer).
      icon: normalizeIconKey(definition?.icon),
    };
  }

  function normalizeRoomAnimationDefinitions(definitions, { allowEmpty = false } = {}) {
    const isExplicitArray = Array.isArray(definitions);
    const incoming = isExplicitArray ? definitions : [];
    const normalized = incoming
      .map((entry, index) => normalizeRoomAnimationDefinition(entry, index))
      .filter((entry) => entry && typeof entry === "object");
    const uniqueById = [];
    const seen = new Set();
    for (const entry of normalized) {
      if (seen.has(entry.id)) {
        continue;
      }
      seen.add(entry.id);
      uniqueById.push(entry);
    }
    if (uniqueById.length > 0 || (allowEmpty && isExplicitArray)) {
      return uniqueById;
    }
    return ctx.createDefaultRoomAnimationDefinitions().map((entry, index) => normalizeRoomAnimationDefinition(entry, index));
  }

  function normalizeRoomFxProfile(profile) {
    const legacyProfile = profile && typeof profile === "object" ? profile : {};
    const rawAnimations = legacyProfile?.animations ?? legacyProfile?.roomAnimations;
    const animations = normalizeRoomAnimationDefinitions(rawAnimations, {
      allowEmpty: Array.isArray(rawAnimations),
    });
    if (animations.length === 0) {
      return {
        selectedAnimationId: "",
        animations,
      };
    }
    const preferredId = normalizeRoomAnimationId(
      legacyProfile?.selectedAnimationId ?? legacyProfile?.selectedRoomAnimationId,
      animations[0]?.id ?? "kaputt",
    );
    const selectedAnimation = animations.find((entry) => entry.id === preferredId) ?? animations[0];
    return {
      selectedAnimationId: selectedAnimation.id,
      animations,
    };
  }

  function createDefaultRoomFxByBoard() {
    return Object.fromEntries(
      ctx.getBoards().map((board) => [board.id, normalizeRoomFxProfile({ animations: ctx.createDefaultRoomAnimationDefinitions() })]),
    );
  }

  function getRoomFxProfile(boardId = ctx.state.boardId) {
    return normalizeRoomFxProfile(ctx.state.roomFxByBoard?.[boardId]);
  }

  function setRoomFxProfile(boardId, profile) {
    ctx.state.roomFxByBoard[boardId] = normalizeRoomFxProfile(profile);
  }

  function getSelectedRoomAnimationDefinition(boardId = ctx.state.boardId) {
    const profile = getRoomFxProfile(boardId);
    const selectedId = normalizeRoomAnimationId(profile.selectedAnimationId, profile.animations[0]?.id);
    return profile.animations.find((entry) => entry.id === selectedId) ?? profile.animations[0] ?? null;
  }

  function getRoomAnimationDefinitionById(animationId, boardId = ctx.state.boardId) {
    const profile = getRoomFxProfile(boardId);
    const normalizedId = normalizeRoomAnimationId(animationId, profile.animations[0]?.id ?? "kaputt");
    return profile.animations.find((entry) => entry.id === normalizedId) ?? null;
  }

  function createRoomAnimationDefinition(name, existingDefinitions = [], initialValues = null) {
    const baseName = String(name || "").trim() || "Room Animation";
    const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "room-animation";
    let candidateId = slug;
    const existingIds = new Set(existingDefinitions.map((entry) => String(entry.id || "").trim()));
    let suffix = 2;
    while (existingIds.has(candidateId)) {
      candidateId = `${slug}-${suffix}`;
      suffix += 1;
    }
    // Inherit the user's current asset-type/asset-ref
    // editor values so creating a new animation doesn't discard
    // whatever was already selected in the dropdowns.
    const seeded = initialValues && typeof initialValues === "object" ? initialValues : {};
    return normalizeRoomAnimationDefinition({
      id: candidateId,
      name: baseName,
      assetType: seeded.assetType ?? "coded",
      assetRef: seeded.assetRef ?? "intruder-alert",
      soundAssetRef: seeded.soundAssetRef,
      rotationDeg: seeded.rotationDeg,
      stretchToPolygon: seeded.stretchToPolygon,
      widthScale: seeded.widthScale,
      heightScale: seeded.heightScale,
      offsetXScale: seeded.offsetXScale,
      offsetYScale: seeded.offsetYScale,
    });
  }

  window.TT_BEAMER_RUNTIME_FX_NORMALIZERS = {
    init,
    normalizeInsideAssetType,
    normalizeInsideAnimationId,
    normalizeInsideAnimationDefinition,
    normalizeInsideAnimationDefinitions,
    normalizeInsideFxProfile,
    createDefaultInsideFxByBoard,
    getInsideFxProfile,
    setInsideFxProfile,
    getSelectedInsideAnimationDefinition,
    createInsideAnimationDefinition,
    normalizeOutsideAssetType,
    normalizeOutsideAnimationId,
    normalizeOutsideAnimationDefinition,
    normalizeOutsideAnimationDefinitions,
    normalizeOutsideFxProfile,
    createDefaultOutsideFxByBoard,
    getOutsideFxProfile,
    setOutsideFxProfile,
    updateOutsideFxProfile,
    getSelectedOutsideAnimationDefinition,
    isOutsideAnimationType,
    resolveOutsideTimeline,
    createOutsideAnimationDefinition,
    normalizeRoomAssetType,
    normalizeRoomAnimationId,
    normalizeRoomAnimationDefinition,
    normalizeRoomAnimationDefinitions,
    normalizeRoomFxProfile,
    createDefaultRoomFxByBoard,
    getRoomFxProfile,
    setRoomFxProfile,
    getSelectedRoomAnimationDefinition,
    getRoomAnimationDefinitionById,
    createRoomAnimationDefinition,
  };
})();
