// polygon metrics + global animation helpers.
//
// Owns getGlobalAnimationCategory, getGlobalCategoryRuntimeLabel,
// cloneBoardEntry, clampRoomStretch, clampPolygonHandleScale,
// getCurrentPolygonHandleScale, getCoarsePointerHitMultiplier,
// getPolygonEditorHandleMetrics.
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
    // Shrink the "100%" preset further: what was 75% on the slider
    // becomes the new 100%. Compounds the prior 0.75 trim with another
    // 0.75, so the default visual size is 0.5625 × the original.
    // The slider still runs 10–100% — only the visible handles shrink;
    // hit targets keep their old size for touch ergonomics.
    const visualTrim = 0.5625;
    return {
      // Hit-target radii stay slightly larger than the visible handle
      // (so the user has some pointer-placement forgiveness) but no
      // longer the 4× generous floor that made adjacent vertices
      // impossible to disambiguate. About 1.5–1.8× the visible
      // handle, scaling proportionally with both zoom and handle-size
      // slider — at high zoom the user gets pixel-precise grabbing.
      edgeHitRadius: Math.max(2.5, 6 * inverseZoom) * normalizedHandleScale * coarse,
      edgeHandleRadius: Math.max(4, 5.5 * inverseZoom) * normalizedHandleScale * visualTrim,
      vertexHitRadius: Math.max(3, 7 * inverseZoom) * normalizedHandleScale * coarse,
      vertexHandleRadius: Math.max(5, 7.5 * inverseZoom) * normalizedHandleScale * visualTrim,
      // Label size = ~75% of handle diameter so it always fits inside the bubble
      vertexLabelSize: Math.max(5, 7.5 * inverseZoom) * normalizedHandleScale * 1.5 * visualTrim,
      strokeScale: Math.max(0.4, normalizedHandleScale * visualTrim),
    };
  }

  window.TT_BEAMER_RUNTIME_POLYGON_METRICS = {
    init,
    getGlobalAnimationCategory,
    getGlobalCategoryRuntimeLabel,
    cloneBoardEntry,
    clampRoomStretch,
    clampPolygonHandleScale,
    getCurrentPolygonHandleScale,
    getCoarsePointerHitMultiplier,
    getPolygonEditorHandleMetrics,
  };
})();
