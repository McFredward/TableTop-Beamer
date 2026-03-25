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
      selectedRoomId: null,
      selectedRoomByBoard: {},
      outputRoute: "auto",
      role: "operator",
      alignmentOverlayEnabled: false,
      session: {
        id: "default-session",
        clientId: null,
        apiBase: "",
        apiSource: "unresolved",
        selectedVia: "unresolved",
        resolvedEndpoint: "",
        fallbackReason: "none",
        lastSuccessfulSessionId: "",
        serverVersion: "unknown",
        connected: false,
        lastSeq: 0,
        lastHeartbeatAt: 0,
        reconnectAttempts: 0,
        retry: {
          status: "idle",
          attempt: 0,
          maxAttempts: 8,
          nextDelayMs: 0,
          nextRetryAt: 0,
          terminal: false,
          lastError: "",
          lastErrorCode: "",
          lastErrorAt: 0,
          lastAttemptAt: 0,
          lastSuccessAt: 0,
          lastEndpoint: "",
          lastHeartbeatEndpoint: "",
          lastHeartbeatMethod: "POST",
          lastHeartbeatFallbackReason: "none",
          lastHeartbeatMethodSwitchAt: 0,
          lastHeartbeatMethodSwitchLabel: "-",
          lastHeartbeatMethodChanged: false,
          lastEventEndpoint: "",
          lastEventMethod: "POST",
          lastEventFallbackReason: "none",
          lastEventMethodSwitchAt: 0,
          lastEventMethodSwitchLabel: "-",
          lastEventMethodChanged: false,
          heartbeatFailureCount: 0,
          heartbeatFailureThreshold: 3,
          stableResetPending: false,
          reconnectTransitionId: 0,
        },
      },
      roomDraft: {
        editTargetId: null,
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
      polygonEditor: {
        roomIdByBoard: {},
        handleScale: 1,
        selectedVertexIndex: 0,
        selectedEdgeIndex: 0,
        dragVertexIndex: null,
        dragPointerId: null,
        dragRoomId: null,
        dragBoardId: null,
        dragStartPoints: null,
        dragMoved: false,
        suppressRoomClickUntil: 0,
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
