// Viewport lifecycle. Window resize and orientationchange handler
// factory used by runtime-stage-viewport; encapsulates the rAF-coalesced
// resize callback so the stage module stays focused on geometry.

(() => {
  function runStageViewportLifecycle({
    applyStageViewportRecompute,
    getBoardZoom,
    state,
    updateCurrentBoardZoom,
    setPanCursorState,
    syncDashboardZoneVisibility,
    syncMobileStickyOffsets,
    syncMobilePerformanceStatus,
    validateViewExclusivity,
    validateViewNavigationVisibility,
    runMobileProjectionVisibilityGuard,
    runLayoutScrollRegression,
    runNavigationStateRegression,
    triggerFeedback,
    reason = "unknown",
  }) {
    const changed = applyStageViewportRecompute(reason);
    if (!changed) {
      return;
    }
    updateCurrentBoardZoom(getBoardZoom(state.boardId));
    setPanCursorState();
    syncDashboardZoneVisibility();
    syncMobileStickyOffsets();
    syncMobilePerformanceStatus();
    validateViewExclusivity(state.uiView, { context: "resize-guard" });
    validateViewNavigationVisibility({ context: "resize-guard" });
    runMobileProjectionVisibilityGuard({ context: "resize-guard" });
    const layoutOk = runLayoutScrollRegression();
    const navigationOk = runNavigationStateRegression();
    if (!layoutOk || !navigationOk) {
      triggerFeedback.textContent =
        "Status: Resize guard reported layout/navigation drift (check scroll/resize/view switch)";
    }
  }

  function scheduleStageViewportLifecycle({
    stageViewport,
    requestAnimationFrame,
    run,
    reason = "unknown",
  }) {
    // Coalesce resize/orientation/fullscreen bursts into one frame-bound recompute.
    stageViewport.pendingReasons.add(reason);
    if (stageViewport.rafId !== null) {
      return;
    }
    stageViewport.rafId = requestAnimationFrame(() => {
      const reasons = Array.from(stageViewport.pendingReasons).join(", ");
      stageViewport.pendingReasons.clear();
      stageViewport.rafId = null;
      run(reasons || "scheduled");
    });
  }

  function bindDevicePixelRatioWatcher({
    stageViewport,
    windowLike,
    onDprChange,
  }) {
    const mediaQuery = stageViewport.dprMediaQuery;
    if (mediaQuery) {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", onDprChange);
      } else if (typeof mediaQuery.removeListener === "function") {
        mediaQuery.removeListener(onDprChange);
      }
    }
    stageViewport.dprMediaQuery = windowLike.matchMedia(
      `(resolution: ${Math.max(1, Number(windowLike.devicePixelRatio) || 1)}dppx)`,
    );
    if (typeof stageViewport.dprMediaQuery.addEventListener === "function") {
      stageViewport.dprMediaQuery.addEventListener("change", onDprChange);
    } else if (typeof stageViewport.dprMediaQuery.addListener === "function") {
      stageViewport.dprMediaQuery.addListener(onDprChange);
    }
  }

  window.TT_BEAMER_RENDER_VIEWPORT = {
    runStageViewportLifecycle,
    scheduleStageViewportLifecycle,
    bindDevicePixelRatioWatcher,
  };
})();
