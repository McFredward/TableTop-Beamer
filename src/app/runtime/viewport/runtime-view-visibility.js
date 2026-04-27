// view visibility + exclusivity module.
//
// Owns setViewGroupVisibility, isViewGroupVisible,
// validateSettingsControlOwnership, validateViewExclusivity, and
// the top-level setActiveView switcher.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function setViewGroupVisibility(groups, visible) {
    for (const entry of groups) {
      const shouldHide = !visible;
      entry.classList.toggle("view-hidden", shouldHide);
      entry.toggleAttribute("hidden", shouldHide);
      entry.setAttribute("aria-hidden", shouldHide ? "true" : "false");
      if ("inert" in entry) {
        entry.inert = shouldHide;
      }
    }
  }

  function isViewGroupVisible(entry) {
    return !entry.hidden && !entry.classList.contains("view-hidden") && entry.getAttribute("aria-hidden") !== "true";
  }

  function validateSettingsControlOwnership({ silent = false, context = "runtime" } = {}) {
    const outsideDefinition = ctx.getSelectedOutsideAnimationDefinition(ctx.state.boardId);
    const outsideModeDirectionApplicable = ctx.isOutsideModeDirectionApplicable(outsideDefinition);
    const leaks = [];
    for (const id of ctx.SETTINGS_EXCLUSIVE_CONTROL_IDS) {
      const element = document.getElementById(id);
      if (!element) {
        if ((id === "outside-mode" || id === "outside-direction") && !outsideModeDirectionApplicable) {
          continue;
        }
        leaks.push(`missing control: #${id}`);
        continue;
      }
      const viewOwner = element.closest("[data-view]");
      const ownerView = viewOwner?.dataset?.view;
      if (ownerView !== "settings") {
        leaks.push(`settings-control leak: #${id} mounted in ${ownerView ?? "unknown"}`);
        break;
      }
    }

    if (leaks.length > 0) {
      if (!silent) {
        ctx.logUi.error("settings_ownership_violation", {
          event: "settings-ownership-violation",
          context,
          leaks,
        });
        ctx.triggerFeedback.textContent =
          "Status: Configuration leak detected (settings control found outside Settings view)";
      }
      return false;
    }
    return true;
  }

  function validateViewExclusivity(expectedView, { silent = false, context = "runtime" } = {}) {
    const leaks = [];
    const expectSettings = expectedView === "settings";
    const rootView = ctx.controlPanel?.dataset.activeView;

    if (rootView !== expectedView) {
      leaks.push(`root-view mismatch: expected ${expectedView}, got ${rootView ?? "missing"}`);
    }

    if (expectSettings && ctx.settingsViewGroups.every((entry) => !isViewGroupVisible(entry))) {
      leaks.push("settings groups unexpectedly hidden");
    }
    if (!expectSettings && ctx.dashboardViewGroups.every((entry) => !isViewGroupVisible(entry))) {
      leaks.push("dashboard groups unexpectedly hidden");
    }

    for (const entry of ctx.settingsViewGroups) {
      if (isViewGroupVisible(entry) !== expectSettings) {
        leaks.push(`settings leak: ${entry.tagName.toLowerCase()}`);
        break;
      }
    }
    for (const entry of ctx.dashboardViewGroups) {
      if (isViewGroupVisible(entry) === expectSettings) {
        leaks.push(`dashboard leak: ${entry.tagName.toLowerCase()}`);
        break;
      }
    }

    if (leaks.length > 0) {
      if (!silent) {
        ctx.logUi.error("view_exclusivity_violation", {
          event: "view-exclusivity-violation",
          context,
          leaks,
        });
        ctx.triggerFeedback.textContent = "Status: Tab exclusivity violated (visible leftover block detected)";
      }
      return false;
    }
    return validateSettingsControlOwnership({ silent, context });
  }

  function setActiveView(view, { skipGuard = false } = {}) {
    const state = ctx.state;
    const nextView = view === "settings" ? "settings" : "dashboard";
    if (
      !skipGuard
      && nextView === "dashboard"
      && state.uiView === "settings"
      && state.localConfigDirty
    ) {
      const accepted = window.confirm(
        "You have unsaved changes.\n\n"
        + "OK = Save and switch to Dashboard\n"
        + "Cancel = Stay in Settings",
      );
      if (!accepted) {
        return;
      }
      void ctx.applyLocalConfigToServer().then((result) => {
        if (result.ok) {
          setActiveView("dashboard", { skipGuard: true });
        }
      });
      return;
    }
    if (nextView !== "settings") {
      state.panMode.spacePressed = false;
      ctx.endPanMode(null, { canceled: true });
    }
    // Entering Settings should default to "nothing selected" so the
    // selected-room highlight doesn't stick to whatever the user was
    // last editing. Clear selection state on the transition.
    if (nextView === "settings" && state.uiView !== "settings") {
      state.selectedRoomId = null;
      if (state.selectedRoomByBoard) {
        state.selectedRoomByBoard[state.boardId] = null;
      }
      state.polygonEditor.selectedVertexIndex = null;
      state.polygonEditor.selectedEdgeIndex = null;
      state.polygonEditor.vertexSelectionActive = false;
      if (state.shipPolygonEditor) {
        state.shipPolygonEditor.selectedVertexIndex = null;
      }
      state.lastPolygonFocus = null;
    }
    state.uiView = nextView;
    ctx.ensurePrimaryNavigationVisible();
    if (ctx.controlPanel) {
      ctx.controlPanel.dataset.activeView = nextView;
    }
    const showSettings = nextView === "settings";
    setViewGroupVisibility(ctx.settingsViewGroups, showSettings);
    setViewGroupVisibility(ctx.dashboardViewGroups, !showSettings);
    ctx.openDashboardViewButton.classList.toggle("active", !showSettings);
    ctx.openSettingsViewButton.classList.toggle("active", showSettings);
    ctx.openDashboardViewButton.setAttribute("aria-pressed", showSettings ? "false" : "true");
    ctx.openSettingsViewButton.setAttribute("aria-pressed", showSettings ? "true" : "false");
    ctx.syncSettingsSubtabVisibility();
    if (showSettings) {
      ctx.resetClearAllGuard();
      ctx.syncPolygonEditorPanel();
      ctx.syncShipPolygonEditorPanel();
    }
    ctx.syncDashboardZoneVisibility();
    ctx.syncMobileStickyOffsets();
    ctx.syncStageZoomTransform();
    ctx.setPanCursorState();
    ctx.renderRoomOverlay();
    if (!skipGuard) {
      validateViewExclusivity(nextView, { context: "set-active-view" });
      ctx.validateViewNavigationVisibility({ context: "set-active-view" });
      ctx.runMobileProjectionVisibilityGuard({ context: "set-active-view" });
    }
  }

  window.TT_BEAMER_RUNTIME_VIEW_VISIBILITY = {
    init,
    setViewGroupVisibility,
    isViewGroupVisible,
    validateSettingsControlOwnership,
    validateViewExclusivity,
    setActiveView,
  };
})();
