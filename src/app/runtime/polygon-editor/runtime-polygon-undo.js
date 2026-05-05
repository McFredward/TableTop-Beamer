// Undo/redo system for polygon editing operations.
//
// Maintains undo + redo stacks of room geometry snapshots. Each entry
// stores a deep clone of all room polygons + names. Capture points
// are inserted before destructive operations (vertex drag, insert,
// delete, room create/delete, room rename).
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;
  const MAX_STACK_SIZE = 50;
  let undoStack = [];
  let redoStack = [];

  function init(dependencies) {
    ctx = dependencies;
  }

  function captureCurrentState() {
    const state = ctx.state;
    const board = ctx.getBoard();
    const roomStates = board.rooms.map((room) => ({
      id: room.id,
      name: room.name ?? room.label,
      polygon: ctx.getSpecialPolygonPoints(state.boardId, room.id).map((p) => [p[0], p[1]]),
    }));
    // Also capture Play Area polygons for full undo coverage
    const playAreas = typeof ctx.getPlayAreas === "function" ? ctx.getPlayAreas(state.boardId) : [];
    const playAreaStates = playAreas.map((area) => ({
      id: area.id,
      name: area.name ?? area.id,
      polygon: (area.polygon || []).map((p) => [p[0], p[1]]),
    }));
    return { roomStates, playAreaStates };
  }

  function restoreState(snapshot) {
    const state = ctx.state;
    const board = ctx.getBoard();
    // Support both old format (array) and new format (object with roomStates + playAreaStates)
    const roomStates = Array.isArray(snapshot) ? snapshot : (snapshot.roomStates || []);
    const playAreaStates = Array.isArray(snapshot) ? [] : (snapshot.playAreaStates || []);

    // --- Restore rooms ---
    const currentRoomMap = new Map(board.rooms.map((r) => [r.id, r]));
    const restoredIds = new Set(roomStates.map((r) => r.id));

    board.rooms = board.rooms.filter((r) => restoredIds.has(r.id));

    for (const snap of roomStates) {
      let room = currentRoomMap.get(snap.id);
      if (!room) {
        room = {
          id: snap.id,
          name: snap.name,
          label: snap.name,
          polygon: snap.polygon.map((p) => [...p]),
          points: snap.polygon.map((p) => [...p]),
          radius: 0.055,
          x: 0.5,
          y: 0.5,
          meta: { schema: "tt-beamer.room.v2", spawnShape: "hexagon", templateSource: null },
        };
        board.rooms.push(room);
        ctx.ensureBoardRoomStateMaps(state.boardId);
      }
      room.name = snap.name;
      room.label = snap.name;
      room.polygon = snap.polygon.map((p) => [...p]);
      room.points = snap.polygon.map((p) => [...p]);
      ctx.setSpecialPolygonPoints(state.boardId, snap.id, snap.polygon.map((p) => [...p]));
    }

    // Rooms not in the restored snapshot were already filtered out of
    // board.rooms above (line 48); no tombstone bookkeeping needed —
    // the room-catalog mutation IS the undo. (29-04 / 29-AUDIT.md §3.)

    // --- Restore Play Area polygons ---
    if (playAreaStates.length > 0 && typeof ctx.getPlayAreas === "function" && typeof ctx.setPlayAreaPolygon === "function") {
      const currentAreas = ctx.getPlayAreas(state.boardId);
      for (const snap of playAreaStates) {
        const area = currentAreas.find((a) => a.id === snap.id);
        if (area) {
          area.polygon = snap.polygon.map((p) => [...p]);
          ctx.setPlayAreaPolygon(state.boardId, snap.id, snap.polygon.map((p) => [...p]));
        }
      }
    }

    ctx.persistBoardProfiles();
    ctx.syncPolygonEditorPanel();
    if (typeof ctx.syncShipPolygonEditorPanel === "function") ctx.syncShipPolygonEditorPanel();
    ctx.syncRoomPanelFromSelection();
    ctx.renderRoomOverlay();
    syncUndoRedoButtons();
  }

  function pushUndoState(description) {
    const snapshot = captureCurrentState();
    undoStack.push({ description: description || "edit", snapshot });
    if (undoStack.length > MAX_STACK_SIZE) {
      undoStack.shift();
    }
    redoStack = [];
    syncUndoRedoButtons();
  }

  function undo() {
    if (undoStack.length === 0) return;
    const currentSnapshot = captureCurrentState();
    redoStack.push({ description: "undo-point", snapshot: currentSnapshot });
    if (redoStack.length > MAX_STACK_SIZE) {
      redoStack.shift();
    }
    const entry = undoStack.pop();
    restoreState(entry.snapshot);
    ctx.triggerFeedback.textContent = `Status: Undo - ${entry.description}`;
  }

  function redo() {
    if (redoStack.length === 0) return;
    const currentSnapshot = captureCurrentState();
    undoStack.push({ description: "redo-point", snapshot: currentSnapshot });
    if (undoStack.length > MAX_STACK_SIZE) {
      undoStack.shift();
    }
    const entry = redoStack.pop();
    restoreState(entry.snapshot);
    ctx.triggerFeedback.textContent = `Status: Redo - ${entry.description}`;
  }

  function canUndo() {
    return undoStack.length > 0;
  }

  function canRedo() {
    return redoStack.length > 0;
  }

  function clearUndoStack() {
    undoStack = [];
    redoStack = [];
    syncUndoRedoButtons();
  }

  function syncUndoRedoButtons() {
    if (ctx.undoButton) {
      ctx.undoButton.disabled = !canUndo();
    }
    if (ctx.redoButton) {
      ctx.redoButton.disabled = !canRedo();
    }
  }

  window.TT_BEAMER_RUNTIME_POLYGON_UNDO = {
    init,
    pushUndoState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearUndoStack,
    syncUndoRedoButtons,
  };
})();
