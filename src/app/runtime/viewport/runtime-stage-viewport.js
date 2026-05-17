// stage viewport + align mode + mapping helpers.
//
// Owns applyOutputRoleViewContract, syncAlignModePanel, setAlignMode,
// module-private stageViewport state, collectStageViewportMetrics,
// getCanonicalViewportRect, mapClientPointToNormalized,
// mapNormalizedPointToPixels, applyStageViewportRecompute,
// runStageViewportLifecycle, scheduleStageViewportLifecycle,
// handleDevicePixelRatioChange, bindDevicePixelRatioWatcher.
(() => {
  let ctx = null;
  const stageViewport = {
    rafId: null,
    pendingReasons: new Set(),
    lastCssWidth: 0,
    lastCssHeight: 0,
    lastPixelWidth: 0,
    lastPixelHeight: 0,
    lastDpr: 0,
    dprMediaQuery: null,
  };

  function init(dependencies) {
    ctx = dependencies;
  }

  function applyOutputRoleViewContract() {
    if (ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) {
      return;
    }
    document.body.dataset.finalFxOnly = "true";
    if (ctx.controlPanel) {
      ctx.controlPanel.hidden = true;
      ctx.controlPanel.setAttribute("aria-hidden", "true");
      ctx.controlPanel.setAttribute("inert", "");
    }
    if (ctx.boardImage) {
      ctx.boardImage.setAttribute("aria-hidden", "true");
      ctx.boardImage.style.display = "none";
    }
    if (ctx.projectionArea) {
      ctx.projectionArea.setAttribute("aria-label", "Final Output FX-only");
    }
    ctx.triggerFeedback.textContent = "Status: Final-Output aktiv (FX-only, ohne Controller-UI)";
  }

  let _lastAlignModeState = null;

  function syncAlignModeDirtyDashboardState() {
    // [align-exit-trace] Phase 48 W1 — diagnostic (removed in W2 final task)
    try {
      console.log(
        "[align-exit-trace] dirty-dashboard-state",
        "alignModeDirtyOnOutput=" + Boolean(ctx?.state?.alignModeDirtyOnOutput),
        "alignMode=" + Boolean(ctx?.state?.alignMode),
        "outputRole=" + (ctx?.outputRole || "?"),
        "t=" + Date.now(),
      );
    } catch (_) { /* defensive */ }
    // Phase 27 (B5/D-05): when /output/ is dirty, disable the dashboard align-mode toggle
    // with the locked hint copy. Only the dashboard (control role) shows this state.
    if (!ctx || ctx.outputRole === ctx.OUTPUT_ROLE_FINAL) return;
    const dirty = Boolean(ctx.state?.alignModeDirtyOnOutput);
    const btn = ctx.alignModeButton;
    if (!btn) return;
    const hint = document.getElementById("align-mode-dirty-hint");
    // h8: shorter on-screen chip copy (the long form would force a horizontal
    // scrollbar in narrow topbar layouts). The full message stays in the
    // button's title= attribute (tooltip) and aria-describedby for AT.
    const HINT_COPY_FULL = "Unsaved changes on /output/ — save or discard there first.";
    const HINT_COPY_CHIP = "Unsaved on /output/";
    // Phase 28 (B2/D-05): board-switch flavor of the long-form hint. The chip
    // copy is shared with the align-toggle gate, but the long-form ends in
    // "…to switch board." so the user knows which action is gated.
    const HINT_COPY_FULL_BOARD_SWITCH = "Unsaved align changes on /output/ — save or discard there first to switch board.";
    if (dirty) {
      btn.setAttribute("disabled", "");
      btn.setAttribute("title", HINT_COPY_FULL);
      btn.setAttribute("aria-describedby", "align-mode-dirty-hint");
      if (hint) {
        hint.textContent = HINT_COPY_CHIP;
        hint.removeAttribute("hidden");
      }
    } else {
      btn.removeAttribute("disabled");
      btn.removeAttribute("aria-describedby");
      // Restore the title that matches the current align state (don't call syncAlignModePanel — avoids loop).
      const enabled = Boolean(ctx.state?.alignMode);
      btn.setAttribute("title", enabled ? "Align mode on (click to turn off)" : "Toggle align mode");
      if (hint) {
        hint.textContent = "";
        hint.setAttribute("hidden", "");
      }
    }
    // Phase 28 (B2/D-06): gate the board-switch dropdown identically. Same
    // chip text reused; the long-form differs (ends in "…to switch board.").
    const boardSelect = ctx.boardSelect ?? document.getElementById("board-select");
    const boardSwitchHint = document.getElementById("board-switch-dirty-hint");
    if (boardSelect) {
      if (dirty) {
        boardSelect.setAttribute("disabled", "");
        boardSelect.setAttribute("title", HINT_COPY_FULL_BOARD_SWITCH);
        boardSelect.setAttribute("aria-describedby", "board-switch-dirty-hint");
      } else {
        boardSelect.removeAttribute("disabled");
        boardSelect.removeAttribute("aria-describedby");
        boardSelect.removeAttribute("title");
      }
    }
    // Phase 28 h4: inline contextual hint directly under the dropdown in
    // the Board Setup panel — explains WHY the dropdown is disabled, since
    // the topbar chip is far from where the user is clicking.
    if (boardSwitchHint) {
      if (dirty) {
        boardSwitchHint.textContent = HINT_COPY_FULL_BOARD_SWITCH;
        boardSwitchHint.removeAttribute("hidden");
      } else {
        boardSwitchHint.textContent = "";
        boardSwitchHint.setAttribute("hidden", "");
      }
    }
  }

  function syncAlignModePanel() {
    const state = ctx.state;
    const enabled = Boolean(state.alignMode);
    if (ctx.alignModeToggleInput) {
      ctx.alignModeToggleInput.checked = enabled;
    }
    // The button is now icon-only in the topbar; reflect
    // state via aria-pressed + title only (the SVG child is permanent).
    if (ctx.alignModeButton) {
      ctx.alignModeButton.setAttribute("aria-pressed", enabled ? "true" : "false");
      ctx.alignModeButton.setAttribute(
        "title",
        enabled ? "Align mode on (click to turn off)" : "Toggle align mode",
      );
      ctx.alignModeButton.setAttribute(
        "aria-label",
        enabled ? "Align mode on" : "Toggle align mode",
      );
      ctx.alignModeButton.classList.toggle("is-active", enabled);
      ctx.alignModeButton.classList.toggle("is-on", enabled);
    }
    if (ctx.alignModeStatus) {
      ctx.alignModeStatus.textContent = `Align-Mode: ${enabled ? "ON" : "OFF"}`;
    }
    document.body.classList.toggle("align-mode-active", enabled);
    // Show/hide sticky indicator bar on Dashboard (cached lookup)
    if (!ctx._alignIndicator) {
      ctx._alignIndicator = document.getElementById("align-mode-indicator");
    }
    if (ctx._alignIndicator) {
      ctx._alignIndicator.style.display = enabled ? "flex" : "none";
    }
    // Notify projection mapping only when state actually changed
    if (enabled !== _lastAlignModeState && typeof ctx.onAlignModeChanged === "function") {
      _lastAlignModeState = enabled;
      ctx.onAlignModeChanged(enabled);
    }
    if (ctx.roomOverlay) {
      if (ctx.outputRole === ctx.OUTPUT_ROLE_CONTROL) {
        ctx.roomOverlay.style.display = "";
        ctx.roomOverlay.setAttribute("aria-hidden", "false");
        // Phase 27 (B5): re-evaluate dirty-disable on every align-state change.
        syncAlignModeDirtyDashboardState();
        return;
      }
      const hiddenInFinal = ctx.outputRole === ctx.OUTPUT_ROLE_FINAL && !enabled;
      ctx.roomOverlay.style.display = hiddenInFinal ? "none" : "block";
      ctx.roomOverlay.setAttribute("aria-hidden", hiddenInFinal ? "true" : "false");
    }
    // Phase 27 (B5): re-evaluate dirty-disable on every align-state change.
    syncAlignModeDirtyDashboardState();
  }

  function setAlignMode(enabled, { emit = true } = {}) {
    // [align-exit-trace] Phase 48 W1 — diagnostic (removed in W2 final task)
    try {
      console.log(
        "[align-exit-trace] setAlignMode-emit",
        "enabled=" + Boolean(enabled),
        "emit=" + Boolean(emit),
        "outputRole=" + (ctx?.outputRole || "?"),
        "currentAlignMode=" + Boolean(ctx?.state?.alignMode),
        "currentDirty=" + Boolean(ctx?.state?.alignModeDirtyOnOutput),
        "t=" + Date.now(),
      );
    } catch (_) { /* defensive */ }
    const state = ctx.state;
    const nextAlignMode = Boolean(enabled);
    if (emit && ctx.outputRole === ctx.OUTPUT_ROLE_CONTROL) {
      // Phase 48 W2 — optimistic dashboard update. Pre-fix, state.alignMode
      // only flipped after the server's snapshot echo (120-250 ms later),
      // leaving the dashboard's dirty-chip + indicator + body class stale
      // for ~2-3 s after the click (operator UAT 2026-05-17, ROADMAP Phase 48).
      // Now we mutate locally + sync panels synchronously, then emit + await
      // server confirmation. On emit failure we rollback to the previous state.
      // applyLiveRuntimeSnapshot's alignMode hoist (live-sync-core.js line 374)
      // is idempotent via the _lastAlignModeState gate (line 146 of this file).
      const previousAlignMode = state.alignMode;
      state.alignMode = nextAlignMode;
      syncAlignModePanel();
      ctx.renderRoomOverlay();
      void ctx.emitLiveMutation("context-update", {
        reason: "align-toggle",
        alignMode: nextAlignMode,
        runtime: {
          alignMode: nextAlignMode,
        },
      }).then(() => {
        ctx.triggerFeedback.textContent = `Pending: align mode ${nextAlignMode ? "ON" : "OFF"} (waiting for snapshot)`;
      }).catch(() => {
        // Phase 48 W2 — rollback on emit failure.
        state.alignMode = previousAlignMode;
        syncAlignModePanel();
        ctx.renderRoomOverlay();
        ctx.triggerFeedback.textContent = "Status: align-mode command failed";
      });
      return;
    }
    state.alignMode = nextAlignMode;
    syncAlignModePanel();
    ctx.renderRoomOverlay();
  }

  function collectStageViewportMetrics() {
    // Use clientWidth/clientHeight instead of getBoundingClientRect().
    // getBoundingClientRect() includes CSS transforms (zoom/pan), which inflates
    // the dimensions at non-1x zoom. clientWidth/clientHeight return the layout
    // dimensions before transforms — the correct basis for canvas pixel buffer.
    const stage = ctx.stage;
    const rawWidth = stage?.clientWidth || ctx.projectionArea?.clientWidth || window.innerWidth || 1;
    const rawHeight = stage?.clientHeight || ctx.projectionArea?.clientHeight || window.innerHeight || 1;
    const cssWidth = Math.max(1, Math.round(rawWidth));
    const cssHeight = Math.max(1, Math.round(rawHeight));
    const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
    return {
      cssWidth,
      cssHeight,
      dpr,
      pixelWidth,
      pixelHeight,
    };
  }

  function getCanonicalViewportRect() {
    // During a polygon drag the stage transform is frozen (no
    // concurrent zoom/pan), so the cached rect from polygon-drag
    // support stays valid for the whole gesture. That avoids the
    // forced synchronous layout that getBoundingClientRect() triggers
    // after each applyIncrementalRoomDrag SVG attribute write —
    // forced layout was the dominant cost per pointermove on
    // high-Hz mice.
    const dragSupport = window.TT_BEAMER_RUNTIME_POLYGON_DRAG_SUPPORT;
    if (dragSupport?.isHeavyInteractionActive?.()) {
      const cached = dragSupport.getCachedStageGeometry?.();
      if (cached?.rect && cached.rect.width > 0 && cached.rect.height > 0) {
        return cached.rect;
      }
    }
    const stageRect = ctx.stage?.getBoundingClientRect?.();
    if (stageRect && stageRect.width > 0 && stageRect.height > 0) {
      return stageRect;
    }
    const fallbackRect = ctx.projectionArea?.getBoundingClientRect?.();
    if (fallbackRect && fallbackRect.width > 0 && fallbackRect.height > 0) {
      return fallbackRect;
    }
    return {
      left: 0,
      top: 0,
      width: Math.max(1, Number(window.innerWidth) || 1),
      height: Math.max(1, Number(window.innerHeight) || 1),
    };
  }

  function mapClientPointToNormalized(clientX, clientY) {
    const rect = getCanonicalViewportRect();
    const normalizedX = (Number(clientX) - rect.left) / Math.max(1, rect.width);
    const normalizedY = (Number(clientY) - rect.top) / Math.max(1, rect.height);
    return [
      ctx.clampRoomAbsoluteCoordinate(normalizedX),
      ctx.clampRoomAbsoluteCoordinate(normalizedY),
    ];
  }

  function mapNormalizedPointToPixels(normalizedX, normalizedY, width, height) {
    return [
      ctx.clampRoomAbsoluteCoordinate(normalizedX) * Math.max(1, Number(width) || 1),
      ctx.clampRoomAbsoluteCoordinate(normalizedY) * Math.max(1, Number(height) || 1),
    ];
  }

  function applyStageViewportRecompute(reason = "unknown") {
    const metrics = collectStageViewportMetrics();
    const cssChanged =
      metrics.cssWidth !== stageViewport.lastCssWidth || metrics.cssHeight !== stageViewport.lastCssHeight;
    const dprChanged = metrics.dpr !== stageViewport.lastDpr;
    const pixelChanged =
      metrics.pixelWidth !== stageViewport.lastPixelWidth ||
      metrics.pixelHeight !== stageViewport.lastPixelHeight;
    if (!cssChanged && !dprChanged && !pixelChanged) {
      return false;
    }

    ctx.canvas.style.width = `${metrics.cssWidth}px`;
    ctx.canvas.style.height = `${metrics.cssHeight}px`;
    ctx.canvas.width = metrics.pixelWidth;
    ctx.canvas.height = metrics.pixelHeight;

    stageViewport.lastCssWidth = metrics.cssWidth;
    stageViewport.lastCssHeight = metrics.cssHeight;
    stageViewport.lastPixelWidth = metrics.pixelWidth;
    stageViewport.lastPixelHeight = metrics.pixelHeight;
    stageViewport.lastDpr = metrics.dpr;

    const reasonSuffix = reason ? ` (${reason})` : "";
    ctx.stage.dataset.viewport = `${metrics.cssWidth}x${metrics.cssHeight}@${metrics.dpr.toFixed(2)}${reasonSuffix}`;
    return true;
  }

  function runStageViewportLifecycle(reason = "unknown") {
    window.TT_BEAMER_RENDER_VIEWPORT.runStageViewportLifecycle({
      applyStageViewportRecompute,
      getBoardZoom: ctx.getBoardZoom,
      state: ctx.state,
      updateCurrentBoardZoom: ctx.updateCurrentBoardZoom,
      setPanCursorState: ctx.setPanCursorState,
      syncDashboardZoneVisibility: ctx.syncDashboardZoneVisibility,
      syncMobileStickyOffsets: ctx.syncMobileStickyOffsets,
      validateViewExclusivity: ctx.validateViewExclusivity,
      validateViewNavigationVisibility: ctx.validateViewNavigationVisibility,
      runMobileProjectionVisibilityGuard: ctx.runMobileProjectionVisibilityGuard,
      runLayoutScrollRegression: ctx.runLayoutScrollRegression,
      runNavigationStateRegression: ctx.runNavigationStateRegression,
      triggerFeedback: ctx.triggerFeedback,
      reason,
    });
  }

  function scheduleStageViewportLifecycle(reason = "unknown") {
    window.TT_BEAMER_RENDER_VIEWPORT.scheduleStageViewportLifecycle({
      stageViewport,
      requestAnimationFrame,
      run: (scheduledReason) => {
        runStageViewportLifecycle(scheduledReason);
      },
      reason,
    });
  }

  function handleDevicePixelRatioChange() {
    bindDevicePixelRatioWatcher();
    scheduleStageViewportLifecycle("dpr-change");
  }

  function bindDevicePixelRatioWatcher() {
    window.TT_BEAMER_RENDER_VIEWPORT.bindDevicePixelRatioWatcher({
      stageViewport,
      windowLike: window,
      onDprChange: handleDevicePixelRatioChange,
    });
  }

  window.TT_BEAMER_RUNTIME_STAGE_VIEWPORT = {
    init,
    applyOutputRoleViewContract,
    syncAlignModePanel,
    syncAlignModeDirtyDashboardState,
    setAlignMode,
    collectStageViewportMetrics,
    getCanonicalViewportRect,
    mapClientPointToNormalized,
    mapNormalizedPointToPixels,
    applyStageViewportRecompute,
    runStageViewportLifecycle,
    scheduleStageViewportLifecycle,
    handleDevicePixelRatioChange,
    bindDevicePixelRatioWatcher,
  };
})();
