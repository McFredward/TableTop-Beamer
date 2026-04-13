// Phase 14-2: mobile layout + view visibility module.
//
// Owns the mobile viewport probes (isMobileViewport,
// isMobilePortraitViewport, getMobileOrientationLabel), mobile
// sticky-offset bookkeeping, dashboard zone visibility, navigation
// visibility validator, mobile projection visibility guard, and
// setDashboardZone.
//
// Dependencies injected via ctx: state, DOM refs, helpers.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function isMobileViewport() {
    return window.matchMedia("(max-width: 920px)").matches;
  }

  function isMobilePortraitViewport() {
    return window.matchMedia("(max-width: 920px) and (orientation: portrait)").matches;
  }

  function getMobileOrientationLabel() {
    return window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
  }

  function isElementRendered(element) {
    if (!element || element.hidden) {
      return false;
    }
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function measureRenderedHeight(element) {
    if (!isElementRendered(element)) {
      return 0;
    }
    return Math.max(0, Math.round(element.getBoundingClientRect().height));
  }

  function syncMobileStickyOffsets() {
    if (!ctx.controlPanel) {
      return;
    }
    let navOffset = 0;
    if (isMobileViewport() && ctx.state.uiView === "dashboard") {
      navOffset += measureRenderedHeight(ctx.primaryViewSwitch);
      navOffset += measureRenderedHeight(ctx.dashboardStickyShell);
    }
    ctx.controlPanel.style.setProperty("--mobile-projection-offset", `${navOffset}px`);
    ctx.controlPanel.style.setProperty("--mobile-nav-offset", `${navOffset}px`);
    if (ctx.projectionArea) {
      ctx.projectionArea.style.scrollMarginTop = `${Math.max(0, navOffset) + 8}px`;
    }
  }

  function preserveMobileBoardOverview(context = "quick-mode") {
    if (!isMobileViewport() || ctx.state.uiView !== "dashboard") {
      return;
    }
    setDashboardZone("trigger");
    syncMobileStickyOffsets();
    const projectionOk = runMobileProjectionVisibilityGuard({ silent: true, context });
    if (!projectionOk) {
      ctx.triggerFeedback.textContent = "Status: Mobile board overview guard detected control overlap";
    }
  }

  function ensurePrimaryNavigationVisible() {
    if (!ctx.primaryViewSwitch) {
      return;
    }
    ctx.primaryViewSwitch.toggleAttribute("hidden", false);
    ctx.primaryViewSwitch.setAttribute("aria-hidden", "false");
    if ("inert" in ctx.primaryViewSwitch) {
      ctx.primaryViewSwitch.inert = false;
    }
  }

  function syncMobileLayoutStatus() {
    if (!ctx.controlPanel || !ctx.mobileLayoutStatus) {
      return;
    }
    const orientation = getMobileOrientationLabel();
    const isMobile = isMobileViewport();
    ctx.controlPanel.dataset.mobileViewport = isMobile ? "true" : "false";
    ctx.controlPanel.dataset.mobileOrientation = orientation;
    const zoneLabel = ctx.state.dashboardZone === "manage" ? "Active" : "Control";
    ctx.mobileLayoutStatus.textContent = isMobile
      ? `Mobile (${orientation}): focus ${zoneLabel}`
      : "Desktop: Control and Active sections visible in parallel";
  }

  function syncDashboardZoneVisibility() {
    const state = ctx.state;
    ensurePrimaryNavigationVisible();
    const mobilePortrait = isMobilePortraitViewport();
    for (const entry of ctx.dashboardZoneGroups) {
      const zone = entry.dataset.dashboardZone;
      const shouldHide = mobilePortrait && zone && zone !== state.dashboardZone;
      entry.classList.toggle("dashboard-zone-hidden", shouldHide);
    }

    if (ctx.openTriggerZoneButton && ctx.openManageZoneButton) {
      const showSwitch = isMobileViewport() && state.uiView === "dashboard";
      ctx.openTriggerZoneButton.parentElement?.classList.toggle("mobile-zone-switch-hidden", !showSwitch);
      ctx.openTriggerZoneButton.classList.toggle("active", state.dashboardZone === "trigger");
      ctx.openManageZoneButton.classList.toggle("active", state.dashboardZone === "manage");
      ctx.openTriggerZoneButton.setAttribute("aria-pressed", state.dashboardZone === "trigger" ? "true" : "false");
      ctx.openManageZoneButton.setAttribute("aria-pressed", state.dashboardZone === "manage" ? "true" : "false");
    }

    if (ctx.mobileStartRoomButton) {
      const roomSelectedNow = Boolean(ctx.getSelectedRoom());
      const showStart = isMobileViewport() && state.uiView === "dashboard";
      ctx.mobileStartRoomButton.toggleAttribute("hidden", !showStart);
      ctx.mobileStartRoomButton.disabled = !roomSelectedNow;
    }

    syncMobileStickyOffsets();
    syncMobileLayoutStatus();
  }

  function validateViewNavigationVisibility({ silent = false, context = "runtime" } = {}) {
    const state = ctx.state;
    const issues = [];
    const navButtons = [
      ["dashboard", ctx.openDashboardViewButton],
      ["settings", ctx.openSettingsViewButton],
    ];

    for (const [key, button] of navButtons) {
      if (!button) {
        issues.push(`missing navigation button: ${key}`);
        continue;
      }
      const style = window.getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      if (
        button.hidden ||
        button.disabled ||
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.pointerEvents === "none" ||
        rect.width < 1 ||
        rect.height < 1
      ) {
        issues.push(`navigation button unreachable: ${key}`);
      }
    }

    if (!isElementRendered(ctx.primaryViewSwitch)) {
      issues.push("navigation container hidden");
    }

    if (ctx.controlPanel?.dataset.activeView !== state.uiView) {
      issues.push(`navigation state drift: dataset=${ctx.controlPanel?.dataset.activeView} state=${state.uiView}`);
    }

    if (issues.length > 0) {
      if (!silent) {
        ctx.logUi.error("navigation_visibility_violation", {
          event: "navigation-visibility-violation",
          context,
          issues,
        });
        ctx.triggerFeedback.textContent =
          "Status: Navigation guard reported a failure (Dashboard/Settings not continuously visible)";
      }
      return false;
    }
    return true;
  }

  function runMobileProjectionVisibilityGuard({ silent = false, context = "runtime" } = {}) {
    const state = ctx.state;
    if (!isMobileViewport() || !ctx.projectionArea) {
      return true;
    }

    const issues = [];
    const projectionRect = ctx.projectionArea.getBoundingClientRect();
    if (projectionRect.width < 1 || projectionRect.height < 1) {
      return true;
    }

    const blockers = [
      ctx.primaryViewSwitch,
      state.uiView === "dashboard" ? ctx.dashboardStickyShell : null,
      state.uiView === "dashboard" ? ctx.mobileZoneSwitch : null,
      state.uiView === "dashboard" ? ctx.runningOverviewPanel : null,
    ].filter(Boolean);
    for (const blocker of blockers) {
      if (!isElementRendered(blocker)) {
        continue;
      }
      const blockerStyle = window.getComputedStyle(blocker);
      if (blockerStyle.position === "sticky" || blockerStyle.position === "fixed") {
        issues.push(`mobile control uses sticky/fixed: ${blocker.className || blocker.id || blocker.tagName}`);
      }
      const rect = blocker.getBoundingClientRect();
      const probeX = projectionRect.left + projectionRect.width * 0.5;
      const probeY = projectionRect.top + projectionRect.height * 0.5;
      const intersectsProbe =
        probeX >= rect.left && probeX <= rect.right && probeY >= rect.top && probeY <= rect.bottom;
      if (intersectsProbe) {
        const probeTarget = document.elementFromPoint(probeX, probeY);
        if (probeTarget && !ctx.projectionArea.contains(probeTarget) && probeTarget !== ctx.projectionArea) {
          issues.push(`projection overlap by ${blocker.className || blocker.id || blocker.tagName}`);
        }
      }
    }

    const projectionStyle = window.getComputedStyle(ctx.projectionArea);
    if (projectionStyle.pointerEvents === "none") {
      issues.push("projection pointer-events disabled");
    }

    const probePoints = [
      [projectionRect.left + projectionRect.width * 0.5, projectionRect.top + projectionRect.height * 0.5],
      [projectionRect.left + projectionRect.width * 0.2, projectionRect.top + projectionRect.height * 0.35],
      [projectionRect.left + projectionRect.width * 0.8, projectionRect.top + projectionRect.height * 0.65],
    ];
    for (const [probeX, probeY] of probePoints) {
      if (!Number.isFinite(probeX) || !Number.isFinite(probeY)) {
        continue;
      }
      const probeTarget = document.elementFromPoint(probeX, probeY);
      if (probeTarget && !ctx.projectionArea.contains(probeTarget) && probeTarget !== ctx.projectionArea) {
        issues.push(`projection pointer path blocked by ${probeTarget.className || probeTarget.id || probeTarget.tagName}`);
        break;
      }
    }

    if (issues.length > 0) {
      if (!silent) {
        ctx.logUi.error("mobile_projection_visibility_violation", {
          event: "mobile-projection-visibility-violation",
          context,
          issues,
        });
        ctx.triggerFeedback.textContent =
          "Status: Mobile projection guard reported overlap (board must not be covered by controls)";
      }
      return false;
    }
    return true;
  }

  function setDashboardZone(zone, { announce = false } = {}) {
    const state = ctx.state;
    const nextZone = zone === "manage" ? "manage" : "trigger";
    if (nextZone !== "manage") {
      ctx.resetClearAllGuard();
    }
    state.dashboardZone = nextZone;
    syncDashboardZoneVisibility();
    if (announce && state.uiView === "dashboard") {
      ctx.triggerFeedback.textContent =
        nextZone === "manage"
          ? "Status: Mobile focus set to Active"
          : "Status: Mobile focus set to Control";
    }
  }

  window.TT_BEAMER_RUNTIME_MOBILE_LAYOUT = {
    init,
    isMobileViewport,
    isMobilePortraitViewport,
    getMobileOrientationLabel,
    isElementRendered,
    measureRenderedHeight,
    syncMobileStickyOffsets,
    preserveMobileBoardOverview,
    ensurePrimaryNavigationVisible,
    syncMobileLayoutStatus,
    syncDashboardZoneVisibility,
    validateViewNavigationVisibility,
    runMobileProjectionVisibilityGuard,
    setDashboardZone,
  };
})();
