// Phase 14-2: asset-ref normalizer module.
//
// Pure helpers for coded/gif/mp4 asset reference classification and
// normalization across room, inside, and outside FX profiles.
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function getOutsideCodedAssetKeys() {
    const knownOutsideRendererIds = ctx.OUTSIDE_SHIP_GLOBAL_ANIMATIONS
      .map((entry) => ctx.normalizeOutsideAnimationId(entry?.id, ""))
      .filter(Boolean);
    return Array.from(new Set(["outside-space", ...knownOutsideRendererIds]));
  }

  function getInsideCodedAssetKeys() {
    const knownInsideRendererIds = ctx.createDefaultInsideAnimationDefinitions()
      .map((entry) => ctx.normalizeInsideAnimationId(entry?.id, ""))
      .filter(Boolean);
    return Array.from(new Set(knownInsideRendererIds));
  }

  function getRoomCodedAssetKeys() {
    const knownDefaultRefs = ctx.createDefaultRoomAnimationDefinitions()
      .filter((entry) => ctx.normalizeRoomAssetType(entry?.assetType) === "coded")
      .map((entry) => String(entry?.assetRef || "").trim().toLowerCase())
      .filter(Boolean);
    const knownInsideRendererIds = getInsideCodedAssetKeys();
    return Array.from(new Set([
      ...knownInsideRendererIds,
      ...knownDefaultRefs,
      "special-slime",
      "special-scanning",
      "solid-color",
    ]));
  }

  function normalizeRoomCodedAssetRef(assetRef, fallbackAssetRef = "intruder-alert") {
    const normalizedRef = String(assetRef || "").trim().toLowerCase();
    if (getRoomCodedAssetKeys().includes(normalizedRef)) {
      return normalizedRef;
    }
    const normalizedFallback = String(fallbackAssetRef || "").trim().toLowerCase();
    if (getRoomCodedAssetKeys().includes(normalizedFallback)) {
      return normalizedFallback;
    }
    return getRoomCodedAssetKeys()[0] ?? "intruder-alert";
  }

  function getRoomAssetCandidates(assetType) {
    const normalizedType = ctx.normalizeRoomAssetType(assetType);
    if (normalizedType === "coded") {
      return getRoomCodedAssetKeys();
    }
    const extension = normalizedType === "mp4" ? ".mp4" : ".gif";
    return ctx.getOutsideResourceAssets().filter((entry) => entry.toLowerCase().endsWith(extension));
  }

  function normalizeRoomAssetRefForType(assetType, assetRef, fallbackAssetRef = "") {
    const normalizedType = ctx.normalizeRoomAssetType(assetType);
    const rawRef = String(assetRef || "").trim();
    if (normalizedType === "coded") {
      return normalizeRoomCodedAssetRef(rawRef, fallbackAssetRef);
    }

    const expectedExtension = normalizedType === "mp4" ? ".mp4" : ".gif";
    const isValidResourceRef = rawRef.startsWith("/resources/") && rawRef.toLowerCase().endsWith(expectedExtension);
    if (isValidResourceRef) {
      return rawRef;
    }

    const normalizedFallback = String(fallbackAssetRef || "").trim();
    const fallbackValid =
      normalizedFallback.startsWith("/resources/") && normalizedFallback.toLowerCase().endsWith(expectedExtension);
    if (fallbackValid) {
      return normalizedFallback;
    }

    const firstCandidate = getRoomAssetCandidates(normalizedType)[0];
    return firstCandidate || "";
  }

  function resolveRoomCodedEffectType(assetRef) {
    return normalizeRoomCodedAssetRef(assetRef);
  }

  function normalizeInsideCodedAssetRef(assetRef, fallbackAssetRef = "hull-flicker") {
    const normalizedRef = String(assetRef || "").trim().toLowerCase();
    if (getInsideCodedAssetKeys().includes(normalizedRef)) {
      return normalizedRef;
    }
    const normalizedFallback = String(fallbackAssetRef || "").trim().toLowerCase();
    if (getInsideCodedAssetKeys().includes(normalizedFallback)) {
      return normalizedFallback;
    }
    return getInsideCodedAssetKeys()[0] ?? "hull-flicker";
  }

  function getInsideAssetCandidates(assetType) {
    const normalizedType = ctx.normalizeInsideAssetType(assetType);
    if (normalizedType === "coded") {
      return getInsideCodedAssetKeys();
    }
    const extension = normalizedType === "mp4" ? ".mp4" : ".gif";
    return ctx.getOutsideResourceAssets().filter((entry) => entry.toLowerCase().endsWith(extension));
  }

  function normalizeInsideAssetRefForType(assetType, assetRef, fallbackAssetRef = "") {
    const normalizedType = ctx.normalizeInsideAssetType(assetType);
    const rawRef = String(assetRef || "").trim();
    if (normalizedType === "coded") {
      return normalizeInsideCodedAssetRef(rawRef, fallbackAssetRef);
    }

    const expectedExtension = normalizedType === "mp4" ? ".mp4" : ".gif";
    const isValidResourceRef = rawRef.startsWith("/resources/") && rawRef.toLowerCase().endsWith(expectedExtension);
    if (isValidResourceRef) {
      return rawRef;
    }

    const normalizedFallback = String(fallbackAssetRef || "").trim();
    const fallbackValid =
      normalizedFallback.startsWith("/resources/") && normalizedFallback.toLowerCase().endsWith(expectedExtension);
    if (fallbackValid) {
      return normalizedFallback;
    }

    const firstCandidate = getInsideAssetCandidates(normalizedType)[0];
    return firstCandidate || "";
  }

  function resolveInsideCodedEffectType(assetRef) {
    const normalized = normalizeInsideCodedAssetRef(assetRef);
    return getInsideCodedAssetKeys().includes(normalized) ? normalized : "hull-flicker";
  }

  function normalizeOutsideCodedAssetRef(assetRef) {
    const normalizedRef = String(assetRef || "").trim().toLowerCase();
    if (getOutsideCodedAssetKeys().includes(normalizedRef)) {
      return normalizedRef;
    }
    return "outside-space";
  }

  function getOutsideAssetCandidates(assetType) {
    const normalizedType = ctx.normalizeOutsideAssetType(assetType);
    if (normalizedType === "coded") {
      return getOutsideCodedAssetKeys();
    }
    const extension = normalizedType === "mp4" ? ".mp4" : ".gif";
    return ctx.getOutsideResourceAssets().filter((entry) => entry.toLowerCase().endsWith(extension));
  }

  function normalizeOutsideAssetRefForType(assetType, assetRef, fallbackAssetRef = "") {
    const normalizedType = ctx.normalizeOutsideAssetType(assetType);
    const rawRef = String(assetRef || "").trim();
    if (normalizedType === "coded") {
      return normalizeOutsideCodedAssetRef(rawRef);
    }

    const expectedExtension = normalizedType === "mp4" ? ".mp4" : ".gif";
    const isValidResourceRef = rawRef.startsWith("/resources/") && rawRef.toLowerCase().endsWith(expectedExtension);
    if (isValidResourceRef) {
      return rawRef;
    }

    const normalizedFallback = String(fallbackAssetRef || "").trim();
    const fallbackValid =
      normalizedFallback.startsWith("/resources/") && normalizedFallback.toLowerCase().endsWith(expectedExtension);
    if (fallbackValid) {
      return normalizedFallback;
    }

    const firstCandidate = getOutsideAssetCandidates(normalizedType)[0];
    return firstCandidate || "";
  }

  function resolveOutsideCodedEffectType(assetRef) {
    if (getOutsideCodedAssetKeys().includes(normalizeOutsideCodedAssetRef(assetRef))) {
      return "outside-space";
    }
    return "outside-space";
  }

  function isOutsideModeDirectionApplicable(definition) {
    if (!definition) {
      return false;
    }
    if (ctx.normalizeOutsideAssetType(definition.assetType) !== "coded") {
      return false;
    }
    return resolveOutsideCodedEffectType(definition.assetRef) === "outside-space";
  }

  window.TT_BEAMER_RUNTIME_ASSET_REFS = {
    init,
    getOutsideCodedAssetKeys,
    getInsideCodedAssetKeys,
    getRoomCodedAssetKeys,
    normalizeRoomCodedAssetRef,
    getRoomAssetCandidates,
    normalizeRoomAssetRefForType,
    resolveRoomCodedEffectType,
    normalizeInsideCodedAssetRef,
    getInsideAssetCandidates,
    normalizeInsideAssetRefForType,
    resolveInsideCodedEffectType,
    normalizeOutsideCodedAssetRef,
    getOutsideAssetCandidates,
    normalizeOutsideAssetRefForType,
    resolveOutsideCodedEffectType,
    isOutsideModeDirectionApplicable,
  };
})();
