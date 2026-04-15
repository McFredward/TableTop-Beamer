// Phase 14-2: polygon metrics + global animation helpers.
//
// Owns getGlobalAnimationCategory, getGlobalCategoryRuntimeLabel,
// getMappedSoundPathForAnimation, cloneBoardEntry, clampRoomStretch,
// clampPolygonHandleScale, getCurrentPolygonHandleScale,
// getCoarsePointerHitMultiplier, getPolygonEditorHandleMetrics.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function getGlobalAnimationCategory(animationType) {
    return ctx.getGlobalAnimationCategoryFromModule(animationType, ctx.GLOBAL_ANIMATIONS);
  }

  function getGlobalCategoryRuntimeLabel(animationType) {
    return ctx.getGlobalCategoryRuntimeLabelFromModule(animationType, ctx.GLOBAL_ANIMATIONS);
  }

  function getMappedSoundPathForAnimation(animationType) {
    const mapped = ctx.normalizeAnimationSoundPath(animationType, ctx.state.animationSoundMap[animationType]);
    if (mapped === ctx.SOUND_MAPPING_NONE) {
      return null;
    }
    return mapped;
  }

  function cloneBoardEntry(board) {
    return ctx.cloneRoomBoard(board);
  }

  function clampRoomStretch(value) {
    return Math.max(0.6, Math.min(1.6, value));
  }

  function clampPolygonHandleScale(value) {
    return Math.max(0.1, Math.min(1, Number(value) || 1));
  }

  function getCurrentPolygonHandleScale() {
    return clampPolygonHandleScale(ctx.state.polygonEditor.handleScale);
  }

  function getCoarsePointerHitMultiplier() {
    try {
      if (typeof window.matchMedia === "function") {
        if (window.matchMedia("(pointer: coarse)").matches) return 1.8;
        if (window.matchMedia("(any-pointer: coarse)").matches) return 1.5;
      }
    } catch {
      // fall through to default
    }
    return 1;
  }

  function getPolygonEditorHandleMetrics(zoomScale, handleScale = 1) {
    const safeZoomScale = Math.max(0.1, Number(zoomScale) || 1);
    const inverseZoom = 1 / safeZoomScale;
    const normalizedHandleScale = clampPolygonHandleScale(handleScale);
    const coarse = getCoarsePointerHitMultiplier();
    return {
      edgeHitRadius: Math.max(8, 12 * inverseZoom) * normalizedHandleScale * coarse,
      edgeHandleRadius: Math.max(4, 5.5 * inverseZoom) * normalizedHandleScale,
      vertexHitRadius: Math.max(10, 16 * inverseZoom) * normalizedHandleScale * coarse,
      vertexHandleRadius: Math.max(5, 7.5 * inverseZoom) * normalizedHandleScale,
      // Phase 18: label and stroke scale proportionally with handle size
      vertexLabelSize: Math.max(5, 11 * inverseZoom * normalizedHandleScale),
      strokeScale: Math.max(0.4, normalizedHandleScale),
    };
  }

  window.TT_BEAMER_RUNTIME_POLYGON_METRICS = {
    init,
    getGlobalAnimationCategory,
    getGlobalCategoryRuntimeLabel,
    getMappedSoundPathForAnimation,
    cloneBoardEntry,
    clampRoomStretch,
    clampPolygonHandleScale,
    getCurrentPolygonHandleScale,
    getCoarsePointerHitMultiplier,
    getPolygonEditorHandleMetrics,
  };
})();
