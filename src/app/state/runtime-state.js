(() => {
  function createInitialState({
    defaultBoardId,
    defaultRoomAnimationId,
    roomOpacity,
    roomPlaybackSpeed,
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
        playbackSpeed: Number(roomPlaybackSpeed ?? 1),
        intensity: Number(roomIntensity ?? 1),
        speed: Number(roomSpeed ?? 1),
        soundVolume: Number(roomSoundVolume ?? 100) / 100,
        durationSec: 0,
        hold: true,
      },
      runningAnimations: [],
      audio: {
        enabled: true,
        volume: 0.7,
      },
      animationSpeed: 1,
      animationSoundMap: {},
      uiView: "dashboard",
      dashboardZone: "trigger",
      hitareaCalibrationByBoard: {},
      roomGeometryByBoard: {},
      roomStateProfilesByBoard: {},
      specialPolygonsByBoard: {},
      shipPolygonsByBoard: {},
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
