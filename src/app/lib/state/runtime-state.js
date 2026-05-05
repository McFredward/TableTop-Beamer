// Runtime-state factory. createDefaultState composes the full per-board
// and per-room state maps that orchestration's bootstrap.init populates
// and that every sub-module reads via ctx.state.

(() => {
  function createInitialState({
    defaultBoardId,
    defaultRoomAnimationId,
    roomOpacity,
    roomIntensity,
    roomSpeed,
    roomSoundVolume,
  }) {
    return {
      boardId: defaultBoardId,
      selectedBoard: defaultBoardId,
      selectedLayout: defaultBoardId,
      selectedRoomId: null,
      selectedRoomByBoard: {},
      alignMode: false,
      // Phase 27 (B5/D-06): mirrors liveSessionState.snapshot.alignModeDirtyOnOutput on the server.
      // True while /output/ has unsaved align-mode geometry changes. Read-only for all clients
      // except /output/ which POSTs changes via /api/align-mode-dirty.
      alignModeDirtyOnOutput: false,
      roomDraft: {
        editTargetId: null,
        targetType: "room",
        targetId: null,
        animationId: defaultRoomAnimationId,
        opacity: Number(roomOpacity ?? 0.9),
        intensity: Number(roomIntensity ?? 1),
        speed: Number(roomSpeed ?? 1),
        soundVolume: Number(roomSoundVolume ?? 100) / 100,
        staggerStart: false,
        staggerOffsetMs: 140,
        durationSec: 0,
        rotationDeg: 0,
        stretchToPolygon: true,
        widthScale: 1,
        heightScale: 1,
        offsetXScale: 0,
        offsetYScale: 0,
        colorHex: "#ff0000",
      },
      runningAnimations: [],
      audio: {
        enabled: true,
        volume: 0.7,
      },
      animationSpeed: 1,
      animationSoundMap: {},
      // /output/ render-mode: "auto" (GL only when interior grid points
      // are displaced), "2d" (always skip GL — Pi-friendly), "gl"
      // (always run GL warp). Server-persisted via global-defaults so a
      // PC dashboard can flip the mode and the Pi /output/ picks it up
      // live via the global-config-update broadcast.
      renderMode: "auto",
      // Diagnostic overlay: when true, the floating status chip
      // (version · fps · mode · canvas · frame-cost) is visible on
      // every client. Server-persisted alongside renderMode so toggle
      // on the dashboard PC propagates to /output/ on the Pi.
      diagnosticOverlay: false,
      uiView: "dashboard",
      settingsSubtab: "board",
      dashboardZone: "trigger",
      quickMode: {
        mode: "toggle",
        inflightByRoom: {},
      },
      hitareaCalibrationByBoard: {},
      roomTombstonesByBoard: {},
      roomGeometryByBoard: {},
      specialPolygonsByBoard: {},
      defaultAnimationsByBoard: {},
      frozenRoomsByBoard: {},
      shipPolygonsByBoard: {},
      playAreasByBoard: {},
      selectedPlayAreaIdByBoard: {},
      roomFxByBoard: {},
      insideFxByBoard: {},
      outsideFxByBoard: {},
      // Phase 28 B1 (D-02): per-board map of the last-loaded/saved projection
      // profile name. Server-authoritative via boards/<id>.json round-trip.
      // Empty default; populated by applyBoardProfilesToState on hydration
      // and by the four save/load triggers in runtime-projection-profile-persistence.
      lastUsedProfileNameByBoard: {},
      boardZoomByBoard: {},
      roomClipboard: null,
      polygonEditor: {
        roomIdByBoard: {},
        handleScale: 1,
        roomVerticesVisible: true,
        // Global toggle for the SVG room-name overlay labels rendered
        // by renderRoomOverlay. Default true preserves existing behaviour.
        // Mirrors roomVerticesVisible — session-level, not persisted.
        // (Phase 25 BACKLOG #6)
        roomNamesVisible: true,
        // 0..1 transparency of the polygon vertex handles in the
        // overlay. 1 = fully opaque (legacy), 0 = invisible. Mirrors
        // handleScale's session-level lifecycle but persisted via
        // the local-ui-prefs module so it survives reloads.
        // (Phase 25 user feedback.)
        handleOpacity: 1,
        playAreaVerticesVisible: true,
        selectedVertexIndex: 0,
        selectedEdgeIndex: 0,
        vertexSelectionActive: false,
        dragVertexIndex: null,
        dragPointerId: null,
        dragRoomId: null,
        dragBoardId: null,
        dragStartPoints: null,
        dragMoved: false,
        suppressRoomClickUntil: 0,
        pendingAreaPointerId: null,
        pendingAreaRoomId: null,
        pendingAreaBoardId: null,
        pendingAreaStartPointerPoint: null,
        dragAreaPointerId: null,
        dragAreaRoomId: null,
        dragAreaBoardId: null,
        dragAreaStartPoints: null,
        dragAreaStartPointerPoint: null,
        dragAreaMoved: false,
        // Optional rotation mode toggled from the polygon
        // context menu. When set to a roomId, pointer-drag on that
        // room's polygon rotates it around its centroid instead of
        // translating or vertex-editing.
        rotatingRoomId: null,
        rotateBoardId: null,
        rotatePointerId: null,
        rotateStartAngle: 0,
        rotateStartPoints: null,
        rotateCenter: null,
        rotateMoved: false,
      },
      shipPolygonEditor: {
        selectedVertexIndex: 0,
        selectedEdgeIndex: 0,
        dragVertexIndex: null,
        dragPointerId: null,
        dragBoardId: null,
        dragStartPoints: null,
        dragMoved: false,
      },
      panMode: {
        spacePressed: false,
        active: false,
        pointerId: null,
        startClientX: 0,
        startClientY: 0,
        startPanX: 0,
        startPanY: 0,
        trigger: null,
      },
      touchActionGuard: {},
      clearAllGuard: {
        armedUntil: 0,
        timeoutId: null,
      },
      mobilePerf: {
        triggerLatencySamples: [],
        frameDeltaSamples: [],
        pendingTriggerAt: null,
        lastFrameAt: null,
        lastSnapshot: null,
      },
      runtimePerf: {
        frameCostSamples: [],
        qualityScale: 1,
        frameBudgetMs: 16.7,
        pressureLevel: 0,
        nonCriticalCoalesceStride: 1,
        maxRenderAnimationsPerFrame: 96,
        maxAshParticles: 240,
        maxOutsideStarsPerLayer: 110,
        frameIndex: 0,
        mp4Controls: {
          tier: "balanced",
          renderCap: 48,
          qualityFloor: 0.68,
          degradeThreshold: 1.35,
          recoverThreshold: 0.92,
        },
      },
      startupDefaultsGuard: {
        fallbackRequired: false,
        attempted: false,
        applied: false,
        outcome: "pending",
        detail: "",
      },
      zoneLoader: {
        loadedBoards: {},
        fallbackBoards: {},
        classificationByBoard: {},
        detailByBoard: {},
      },
    };
  }

  function createStateSelectors({ getBoards, getState }) {
    function getBoard(boardId = getState().boardId) {
      const boards = getBoards();
      return boards.find((entry) => entry.id === boardId) ?? boards[0];
    }

    function getSelectedRoom() {
      return getBoard().rooms.find((room) => room.id === getState().selectedRoomId) ?? null;
    }

    return {
      getBoard,
      getSelectedRoom,
    };
  }

  window.TT_BEAMER_STATE = {
    createInitialState,
    createStateSelectors,
  };
})();
