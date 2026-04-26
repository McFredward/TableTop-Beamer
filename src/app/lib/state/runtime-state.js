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
      roomStateProfilesByBoard: {},
      specialPolygonsByBoard: {},
      defaultAnimationsByBoard: {},
      frozenRoomsByBoard: {},
      shipPolygonsByBoard: {},
      playAreasByBoard: {},
      selectedPlayAreaIdByBoard: {},
      roomFxByBoard: {},
      insideFxByBoard: {},
      outsideFxByBoard: {},
      boardZoomByBoard: {},
      roomClipboard: null,
      polygonEditor: {
        roomIdByBoard: {},
        handleScale: 1,
        roomVerticesVisible: true,
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
