// Phase 18-3: undo/redo system for polygon editing operations.
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
    return roomStates;
  }

  function restoreState(roomStates) {
    const state = ctx.state;
    const board = ctx.getBoard();
    // Build a map of current rooms by id for efficient lookup
    const currentRoomMap = new Map(board.rooms.map((r) => [r.id, r]));
    const restoredIds = new Set(roomStates.map((r) => r.id));

    // Remove rooms that are not in the snapshot
    board.rooms = board.rooms.filter((r) => restoredIds.has(r.id));

    // Add back rooms that existed in snapshot but not in current board
    for (const snap of roomStates) {
      let room = currentRoomMap.get(snap.id);
      if (!room) {
        // Room was deleted -- recreate a minimal room object
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
        ctx.clearRoomTombstone(state.boardId, snap.id);
      }
      // Restore name + polygon
      room.name = snap.name;
      room.label = snap.name;
      room.polygon = snap.polygon.map((p) => [...p]);
      room.points = snap.polygon.map((p) => [...p]);
      ctx.setSpecialPolygonPoints(state.boardId, snap.id, snap.polygon.map((p) => [...p]));
    }

    // Mark rooms that were removed by undo as tombstones
    for (const [id] of currentRoomMap) {
      if (!restoredIds.has(id)) {
        ctx.markRoomTombstone(state.boardId, id);
      }
    }

    ctx.persistBoardProfiles();
    ctx.syncPolygonEditorPanel();
    ctx.syncRoomPanelFromSelection();
    ctx.renderRoomOverlay();
    syncUndoRedoButtons();
  }

  function pushUndoState(description) {
    const snapshot = captureCurrentState();
    undoStack.push({ description: description || "edit", roomStates: snapshot });
    if (undoStack.length > MAX_STACK_SIZE) {
      undoStack.shift();
    }
    // Any new action clears the redo stack
    redoStack = [];
    syncUndoRedoButtons();
  }

  function undo() {
    if (undoStack.length === 0) return;
    // Save current state to redo stack before restoring
    const currentSnapshot = captureCurrentState();
    redoStack.push({ description: "undo-point", roomStates: currentSnapshot });
    if (redoStack.length > MAX_STACK_SIZE) {
      redoStack.shift();
    }
    const entry = undoStack.pop();
    restoreState(entry.roomStates);
    ctx.triggerFeedback.textContent = `Status: Undo - ${entry.description}`;
  }

  function redo() {
    if (redoStack.length === 0) return;
    // Save current state to undo stack before restoring
    const currentSnapshot = captureCurrentState();
    undoStack.push({ description: "redo-point", roomStates: currentSnapshot });
    if (undoStack.length > MAX_STACK_SIZE) {
      undoStack.shift();
    }
    const entry = redoStack.pop();
    restoreState(entry.roomStates);
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
