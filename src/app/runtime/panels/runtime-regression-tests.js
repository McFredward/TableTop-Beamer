// Phase 14-2: runtime regression self-tests module.
//
// Owns the 9 run*Regression functions that exercise view visibility,
// layout scroll, startup defaults guard, zoom/pan editing, pan
// pointer capture, orientation state, navigation state, outside
// isolation, and ship-clip validation.
//
// Dependencies injected via ctx (large surface — these tests poke
// at nearly every runtime subsystem by design).
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function runViewVisibilityRegression() {
    const { state, setActiveView, validateViewExclusivity, validateSettingsControlOwnership } = ctx;
    const originalView = state.uiView;
    let ok = true;
    for (let i = 0; i < 10; i += 1) {
      const target = i % 2 === 0 ? "settings" : "dashboard";
      setActiveView(target, { skipGuard: true });
      ok = validateViewExclusivity(target, { silent: true, context: `toggle-${i + 1}` }) && ok;
    }
    const viewportContext = window.matchMedia("(max-width: 760px)").matches
      ? "small-screen"
      : "desktop";
    ok = validateViewExclusivity(state.uiView, { silent: true, context: viewportContext }) && ok;
    ok = validateSettingsControlOwnership({ silent: true, context: `${viewportContext}-settings-ownership` }) && ok;
    setActiveView(originalView, { skipGuard: true });
    return ok;
  }

  function runLayoutScrollRegression() {
    const {
      state, isMobileViewport, syncMobileStickyOffsets,
      controlPanel, projectionArea, dashboardStickyShell, primaryViewSwitch,
      runningOverviewPanel, globalAnimationPanel, runningAnimationsList,
      mobileZoneSwitch, mobileStartRoomButton,
      isElementRendered, logUi,
    } = ctx;
    const issues = [];
    const mobileViewport = isMobileViewport();
    syncMobileStickyOffsets();
    const panelOverflowY = controlPanel ? window.getComputedStyle(controlPanel).overflowY : "";
    const expectedPanelOverflow = mobileViewport ? ["visible", "auto", "scroll"] : ["auto", "scroll"];
    if (!expectedPanelOverflow.includes(panelOverflowY)) {
      issues.push(`control overflowY=${panelOverflowY || "missing"}`);
    }

    const projectionPosition = projectionArea
      ? window.getComputedStyle(projectionArea).position
      : "";
    if (projectionPosition !== "sticky" && projectionPosition !== "fixed") {
      issues.push(`projection position=${projectionPosition || "missing"}`);
    }

    const bodyOverflowY = window.getComputedStyle(document.body).overflowY;
    const expectedBodyOverflow = mobileViewport ? ["auto", "visible"] : ["hidden"];
    if (!expectedBodyOverflow.includes(bodyOverflowY)) {
      issues.push(`body overflowY=${bodyOverflowY}`);
    }

    if (dashboardStickyShell) {
      const stickyShellPosition = window.getComputedStyle(dashboardStickyShell).position;
      if (mobileViewport) {
        if (state.uiView === "dashboard" && !["static", "relative"].includes(stickyShellPosition)) {
          issues.push(`mobile trigger cluster must not be sticky/fixed (position=${stickyShellPosition || "missing"})`);
        }
      } else if (!["static", "relative"].includes(stickyShellPosition)) {
        issues.push(`desktop sticky-shell regression position=${stickyShellPosition || "missing"}`);
      }
    }

    if (primaryViewSwitch) {
      const navPosition = window.getComputedStyle(primaryViewSwitch).position;
      if (mobileViewport) {
        if (!["static", "relative"].includes(navPosition)) {
          issues.push(`mobile view nav must not be sticky/fixed (position=${navPosition || "missing"})`);
        }
      } else if (!["static", "relative"].includes(navPosition)) {
        issues.push(`desktop nav regression position=${navPosition || "missing"}`);
      }
    } else {
      issues.push("primary view switch missing");
    }

    if (!runningOverviewPanel || !globalAnimationPanel) {
      issues.push("running/global panel missing");
    } else {
      const runningPosition = window.getComputedStyle(runningOverviewPanel).position;
      const expectedRunningPositions = ["static", "relative"];
      if (!expectedRunningPositions.includes(runningPosition)) {
        issues.push(`running panel position=${runningPosition || "missing"}`);
      }

      if (!runningAnimationsList) {
        issues.push("running list missing");
      } else {
        const runningListStyle = window.getComputedStyle(runningAnimationsList);
        const overflowY = runningListStyle.overflowY;
        if (!mobileViewport && !["auto", "scroll"].includes(overflowY)) {
          issues.push(`running list overflowY=${overflowY || "missing"}`);
        }
        const maxHeight = runningListStyle.maxHeight;
        if (!mobileViewport && (!maxHeight || maxHeight === "none")) {
          issues.push(`running list maxHeight=${maxHeight || "missing"}`);
        }
      }

      // Phase 18: running-overview-panel (dashboard manage zone) and global-animation-panel
      // (settings board tab) are in different views. DOM order between cross-view panels
      // is not functionally relevant — skip this positional check.

      if (mobileViewport) {
        const mobileClusterEntries = [
          ["mobile zone switch", mobileZoneSwitch],
          ["mobile start room", mobileStartRoomButton],
          ["running panel", runningOverviewPanel],
        ];
        for (const [label, element] of mobileClusterEntries) {
          if (!element || !isElementRendered(element)) {
            continue;
          }
          const position = window.getComputedStyle(element).position;
          if (position === "sticky" || position === "fixed") {
            issues.push(`${label} must not be sticky/fixed (position=${position})`);
          }
        }
      }
    }

    if (issues.length > 0) {
      logUi.error("layout_regression_violation", {
        event: "layout-regression-violation",
        issues,
      });
      return false;
    }
    return true;
  }

  function runStartupDefaultsGuardRegression() {
    const { state, logRuntime } = ctx;
    const guard = state.startupDefaultsGuard;
    if (!guard?.fallbackRequired) {
      return true;
    }
    const attempted = guard.attempted === true;
    const explicitOutcome = guard.outcome === "applied" || guard.outcome === "failed-explicit";
    if (!attempted || !explicitOutcome) {
      logRuntime.error("startup_defaults_guard_violation", {
        event: "startup-defaults-guard-violation",
        fallbackRequired: guard.fallbackRequired,
        attempted: guard.attempted,
        outcome: guard.outcome,
        detail: guard.detail,
      });
      return false;
    }
    return true;
  }

  function runZoomPanEditRegression() {
    const {
      state, setActiveView, getRoomCenterForZoom, computePanForZoomFocus,
      updateCurrentBoardZoom, getStagePanBounds, getBoardZoom,
      canStartPanModeFromEvent, fitZoomToActiveSpecialRoom,
      boardZoomResetButton, setPanCursorState, logUi,
    } = ctx;
    const issues = [];
    const previousView = state.uiView;
    const previousSpacePressed = state.panMode.spacePressed;
    const previousZoom = getBoardZoom(state.boardId);

    try {
      setActiveView("settings", { skipGuard: true });
      const focus = getRoomCenterForZoom(state.boardId);
      const zoomed = computePanForZoomFocus(2, focus);
      updateCurrentBoardZoom(zoomed);

      const bounds = getStagePanBounds(2);
      updateCurrentBoardZoom({ scale: 2, panX: bounds.maxPanX * 4, panY: -bounds.maxPanY * 4 });
      const clamped = getBoardZoom(state.boardId);
      if (Math.abs(clamped.panX) - bounds.maxPanX > 0.5 || Math.abs(clamped.panY) - bounds.maxPanY > 0.5) {
        issues.push("pan bounds clamp failed");
      }

      state.panMode.spacePressed = true;
      const canPanWithSpace = canStartPanModeFromEvent({ button: 0 });
      if (!canPanWithSpace) {
        issues.push("space+drag pan gate failed");
      }
      state.panMode.spacePressed = false;

      const canPanWithoutSpace = canStartPanModeFromEvent({ button: 0 });
      if (canPanWithoutSpace) {
        issues.push("edit mode incorrectly blocked by pan gate");
      }

      const canPanWithMiddle = canStartPanModeFromEvent({ button: 1 });
      if (!canPanWithMiddle) {
        issues.push("middle-button pan alias failed");
      }

      fitZoomToActiveSpecialRoom();
      boardZoomResetButton.click();
      const reset = getBoardZoom(state.boardId);
      if (reset.scale !== 1 || Math.abs(reset.panX) > 0.5 || Math.abs(reset.panY) > 0.5) {
        issues.push("zoom/pan reset roundtrip failed");
      }
    } finally {
      state.panMode.spacePressed = previousSpacePressed;
      updateCurrentBoardZoom(previousZoom);
      setActiveView(previousView, { skipGuard: true });
      setPanCursorState();
    }

    if (issues.length > 0) {
      logUi.error("zoom_pan_edit_regression_violation", {
        event: "zoom-pan-edit-regression-violation",
        issues,
      });
      return false;
    }
    return true;
  }

  function runPanPointerCaptureRegression() {
    const {
      state, setActiveView, updateCurrentBoardZoom, computePanForZoomFocus,
      getRoomCenterForZoom, getBoardZoom, startPanMode, endPanMode,
      setPanCursorState, logUi,
    } = ctx;
    const issues = [];
    const prevView = state.uiView;
    const prevZoom = getBoardZoom(state.boardId);
    const prevPanMode = { ...state.panMode };

    try {
      setActiveView("settings", { skipGuard: true });
      updateCurrentBoardZoom(computePanForZoomFocus(2, getRoomCenterForZoom(state.boardId)));

      state.panMode.spacePressed = true;
      startPanMode({
        pointerId: 999,
        clientX: 10,
        clientY: 10,
      }, "space");

      if (!state.panMode.active) {
        issues.push("pan mode did not activate");
      }

      endPanMode(null, { canceled: false });
      if (state.panMode.active || state.panMode.pointerId !== null) {
        issues.push("pan mode did not clear pointer session");
      }
    } catch {
      issues.push("pan pointer-capture regression threw unexpectedly");
    } finally {
      state.panMode = {
        ...prevPanMode,
        active: false,
        pointerId: null,
        trigger: null,
      };
      updateCurrentBoardZoom(prevZoom);
      setActiveView(prevView, { skipGuard: true });
      setPanCursorState();
    }

    if (issues.length > 0) {
      logUi.error("pan_pointer_regression_violation", {
        event: "pan-pointer-regression-violation",
        issues,
      });
      return false;
    }
    return true;
  }

  function runOrientationStateRegression() {
    const { state, syncDashboardZoneVisibility, syncMobileLayoutStatus, logUi } = ctx;
    const before = {
      boardId: state.boardId,
      selectedRoomId: state.selectedRoomId,
      uiView: state.uiView,
      dashboardZone: state.dashboardZone,
      runningIds: state.runningAnimations.map((entry) => entry.id).join("|"),
    };

    syncDashboardZoneVisibility();
    syncMobileLayoutStatus();
    syncDashboardZoneVisibility();

    const after = {
      boardId: state.boardId,
      selectedRoomId: state.selectedRoomId,
      uiView: state.uiView,
      dashboardZone: state.dashboardZone,
      runningIds: state.runningAnimations.map((entry) => entry.id).join("|"),
    };

    const same =
      before.boardId === after.boardId &&
      before.selectedRoomId === after.selectedRoomId &&
      before.uiView === after.uiView &&
      before.dashboardZone === after.dashboardZone &&
      before.runningIds === after.runningIds;
    if (!same) {
      logUi.error("orientation_regression_violation", {
        event: "orientation-regression-violation",
        before,
        after,
      });
    }
    return same;
  }

  function runNavigationStateRegression() {
    const {
      state, setActiveView, setDashboardZone, syncDashboardZoneVisibility,
      syncMobileLayoutStatus, syncMobileStickyOffsets,
      validateViewNavigationVisibility, runMobileProjectionVisibilityGuard,
      logUi,
    } = ctx;
    const previousView = state.uiView;
    const previousZone = state.dashboardZone;
    let ok = true;

    const checkpoints = [
      { view: "dashboard", zone: "trigger", label: "dashboard-trigger" },
      { view: "settings", zone: "trigger", label: "settings" },
      { view: "dashboard", zone: "manage", label: "dashboard-manage" },
    ];

    try {
      for (const checkpoint of checkpoints) {
        setActiveView(checkpoint.view, { skipGuard: true });
        if (checkpoint.view === "dashboard") {
          setDashboardZone(checkpoint.zone);
        }
        syncDashboardZoneVisibility();
        syncMobileLayoutStatus();
        syncMobileStickyOffsets();
        ok =
          validateViewNavigationVisibility({
            silent: true,
            context: `navigation-${checkpoint.label}`,
          }) && ok;
        ok = runMobileProjectionVisibilityGuard({
          silent: true,
          context: `projection-${checkpoint.label}`,
        }) && ok;

        for (let i = 0; i < 3; i += 1) {
          syncDashboardZoneVisibility();
          syncMobileLayoutStatus();
          syncMobileStickyOffsets();
          ok = validateViewNavigationVisibility({
            silent: true,
            context: `navigation-resync-${checkpoint.label}-${i + 1}`,
          }) && ok;
        }
      }

      ok = runLayoutScrollRegression() && ok;
    } finally {
      setActiveView(previousView, { skipGuard: true });
      setDashboardZone(previousZone);
      syncDashboardZoneVisibility();
      syncMobileStickyOffsets();
    }

    if (!ok) {
      logUi.error("navigation_regression_violation", {
        event: "navigation-regression-violation",
        view: state.uiView,
        zone: state.dashboardZone,
      });
    }
    return ok;
  }

  function runOutsideIsolationRegression() {
    const {
      state, getOutsideFxProfile, setOutsideFxProfile, updateOutsideFxProfile,
      syncOutsideRuntimeMirror, syncOutsideFxPanel, refreshGlobalButtons,
      logRender,
    } = ctx;
    const issues = [];
    const boardId = state.boardId;
    const previousProfile = getOutsideFxProfile(boardId);

    const captureNonOutsideIds = () =>
      state.runningAnimations
        .filter((animation) => !(animation.scope === "global" && animation.type === "outside-space"))
        .map((animation) => animation.id)
        .sort();

    const before = captureNonOutsideIds();

    try {
      updateOutsideFxProfile(boardId, { enabled: true });
      syncOutsideRuntimeMirror(boardId);
      const during = captureNonOutsideIds();
      if (during.join("|") !== before.join("|")) {
        issues.push("outside enable changed non-outside runtime entries");
      }

      updateOutsideFxProfile(boardId, { enabled: false });
      syncOutsideRuntimeMirror(boardId);
      const after = captureNonOutsideIds();
      if (after.join("|") !== before.join("|")) {
        issues.push("outside disable changed non-outside runtime entries");
      }
    } catch {
      issues.push("outside isolation regression threw unexpectedly");
    } finally {
      setOutsideFxProfile(boardId, previousProfile);
      syncOutsideRuntimeMirror(boardId);
      syncOutsideFxPanel();
      refreshGlobalButtons();
    }

    if (issues.length > 0) {
      logRender.error("outside_isolation_regression_violation", {
        event: "outside-isolation-regression-violation",
        issues,
      });
      return false;
    }
    return true;
  }

  function runShipClipRegression() {
    const {
      state, canvasCtx, clipToInsideShip, clipToOutsideShip,
      getPlayAreas, setPlayAreas, getSelectedPlayAreaId, logRender,
    } = ctx;
    const boardId = state.boardId;
    const previousPlayAreas = getPlayAreas(boardId).map((area) => ({ ...area, polygon: [...area.polygon] }));
    const previousSelectedPlayAreaId = getSelectedPlayAreaId(boardId);
    const issues = [];

    try {
      canvasCtx.save();
      const insideValid = clipToInsideShip(boardId);
      canvasCtx.restore();
      if (!insideValid) {
        issues.push("inside clip rejected valid ship polygon");
      }

      canvasCtx.save();
      const outsideValid = clipToOutsideShip(boardId);
      canvasCtx.restore();
      if (!outsideValid) {
        issues.push("outside clip rejected valid ship polygon");
      }

      state.playAreasByBoard[boardId] = [
        {
          id: "invalid-area",
          name: "Invalid",
          polygon: [
            [0.2, 0.2],
            [0.8, 0.8],
          ],
        },
      ];
      state.selectedPlayAreaIdByBoard[boardId] = "invalid-area";

      canvasCtx.save();
      const insideInvalid = clipToInsideShip(boardId);
      canvasCtx.restore();
      if (insideInvalid) {
        issues.push("inside clip accepted invalid ship polygon");
      }

      canvasCtx.save();
      const outsideInvalid = clipToOutsideShip(boardId);
      canvasCtx.restore();
      if (outsideInvalid) {
        issues.push("outside clip accepted invalid ship polygon");
      }
    } catch {
      issues.push("ship clip regression threw unexpectedly");
    } finally {
      setPlayAreas(boardId, previousPlayAreas, { selectedPlayAreaId: previousSelectedPlayAreaId });
    }

    if (issues.length > 0) {
      logRender.error("ship_clip_regression_violation", {
        event: "ship-clip-regression-violation",
        issues,
      });
      return false;
    }
    return true;
  }

  window.TT_BEAMER_RUNTIME_REGRESSION_TESTS = {
    init,
    runViewVisibilityRegression,
    runLayoutScrollRegression,
    runStartupDefaultsGuardRegression,
    runZoomPanEditRegression,
    runPanPointerCaptureRegression,
    runOrientationStateRegression,
    runNavigationStateRegression,
    runOutsideIsolationRegression,
    runShipClipRegression,
  };
})();
