// asset-ref normalizer module.
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

  // Phase 58-w3.8p — UNIFIED coded-effect catalog. All three scopes
  // now return the SAME set (config.ALL_CODED_EFFECT_TYPES, the single
  // source of truth) so the editor offers every coded effect for room,
  // inside AND outside (operator spec 2026-06-08: "überall sollen
  // dieselben verfügbar sein, kein Unterschied"). Before w3.8p inside
  // derived its keys from createDefaultInsideAnimationDefinitions (only
  // hull-flicker / intruder-alert / power-outage) and outside hard-
  // coded just outside-space — that artificial per-scope filtering is
  // what made inside/outside expose fewer effects. Cross-scope
  // rendering is wired in the draw loop: each scope passes its own
  // region metrics (room polygon / inside-ship region / outside
  // region) into drawEffectVisual so e.g. heat radiates from the
  // scope's centroid and city-workers walk within its bounds.
  function getAllCodedEffectKeys() {
    const keys = Array.isArray(ctx.ALL_CODED_EFFECT_TYPES) ? ctx.ALL_CODED_EFFECT_TYPES : [];
    return Array.from(new Set(keys.map((key) => String(key || "").trim().toLowerCase()).filter(Boolean)));
  }

  function getOutsideCodedAssetKeys() {
    return getAllCodedEffectKeys();
  }

  function getInsideCodedAssetKeys() {
    return getAllCodedEffectKeys();
  }

  function getRoomCodedAssetKeys() {
    return getAllCodedEffectKeys();
  }

  // Legacy assetRef spellings → canonical registry key. Applied in
  // normalizeRoomCodedAssetRef so definitions saved under the old
  // name keep resolving to the same renderer without the registry
  // (and therefore the editor's Effect dropdown) listing both names.
  // Phase 58-w3.7x: "generator-heat" shipped in v1.2.26 and was
  // renamed to plain "heat" one version later — operator boards and
  // runtime-active-animations.json may still carry the old key.
  const ROOM_CODED_ASSET_ALIASES = {
    "generator-heat": "heat",
    // Phase 58-w3.8i: the w3.8e A/B variant key folds into the merged
    // configurable city-workers effect. Definitions saved with the lit
    // key keep rendering lit: normalizeRoomAnimationDefinition derives
    // workerStyle "lit" from the RAW assetRef before this alias
    // rewrites it (and drawEffectVisual keeps a last-resort type
    // check for un-normalized callers / pre-merge snapshot instances).
    "city-workers-lit": "city-workers",
  };

  function normalizeRoomCodedAssetRef(assetRef, fallbackAssetRef = "intruder-alert") {
    const rawRef = String(assetRef || "").trim().toLowerCase();
    const normalizedRef = ROOM_CODED_ASSET_ALIASES[rawRef] ?? rawRef;
    if (getRoomCodedAssetKeys().includes(normalizedRef)) {
      return normalizedRef;
    }
    const rawFallback = String(fallbackAssetRef || "").trim().toLowerCase();
    const normalizedFallback = ROOM_CODED_ASSET_ALIASES[rawFallback] ?? rawFallback;
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
    // Phase 58-w3.8p — return the ACTUAL resolved effect type so the
    // outside layer can render any coded effect (heat, city-workers,
    // hull-flicker, …), not just the space star-field. Pre-w3.8p this
    // hard-returned "outside-space" regardless of input, which is what
    // forced every outside coded animation to render as stars.
    // normalizeOutsideCodedAssetRef still falls back to "outside-space"
    // for unknown refs, and isOutsideModeDirectionApplicable keeps the
    // mode/direction controls scoped to the outside-space effect only.
    return normalizeOutsideCodedAssetRef(assetRef);
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
