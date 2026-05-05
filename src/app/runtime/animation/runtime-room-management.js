// room + cluster management module.
//
// Owns room CRUD (create/delete/rename/copy/paste), cluster CRUD
// (create/update/delete/select), room/cluster target selectors,
// and the room/cluster settings panel sync helpers.
//
// Dependencies injected via ctx (large surface — this module
// touches the entire room/cluster state mutation path).
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function syncRoomManagementPanel(statusText = null) {
    const board = ctx.getBoard();
    ctx.syncSelectedRoomStateForBoard(ctx.state.boardId);
    const selectedRoom = ctx.getSelectedRoom();
    syncRoomCreateShapeOptions(board);
    if (ctx.roomDeleteButton) {
      ctx.roomDeleteButton.disabled = board.rooms.length <= 1 || !selectedRoom;
    }
    if (ctx.roomNameInput && selectedRoom) {
      ctx.roomNameInput.value = selectedRoom.name ?? selectedRoom.label ?? "";
    }
    if (ctx.roomManagementStatus && statusText) {
      ctx.roomManagementStatus.textContent = statusText;
    }
    syncClusterManagementPanel();
    syncRoomFrozenCheckbox();
  }

  function syncRoomCreateShapeOptions(board) {
    const effectiveBoard = board ?? ctx.getBoard();
    if (!ctx.roomCreateShapeSelect) {
      return;
    }
    const previousValue = ctx.roomCreateShapeSelect.value;
    const options = [
      { value: "hexagon", label: "Hexagon (starter template)" },
      { value: "free", label: "Free triangle (starter template)" },
      { value: "template-play-area", label: "Create room from existing polygon: Play Area" },
      ...effectiveBoard.rooms.map((room) => ({
        value: `template-room:${room.id}`,
        label: `Create room from existing polygon: ${room.name ?? room.label ?? room.id}`,
      })),
    ];
    ctx.roomCreateShapeSelect.replaceChildren();
    for (const entry of options) {
      const option = document.createElement("option");
      option.value = entry.value;
      option.textContent = entry.label;
      ctx.roomCreateShapeSelect.append(option);
    }
    const hasPrevious = options.some((entry) => entry.value === previousValue);
    ctx.roomCreateShapeSelect.value = hasPrevious ? previousValue : "hexagon";
  }

  function getSelectedOptionValues(selectEl) {
    if (!selectEl) {
      return [];
    }
    return Array.from(selectEl.selectedOptions || [])
      .map((option) => String(option.value || "").trim())
      .filter(Boolean);
  }

  function createClusterId(board) {
    const existing = new Set(
      (Array.isArray(board?.roomClusters) ? board.roomClusters : [])
        .map((cluster) => String(cluster?.clusterId || cluster?.id || "").trim())
        .filter(Boolean),
    );
    let index = existing.size + 1;
    let candidate = `cluster-${index}`;
    while (existing.has(candidate)) {
      index += 1;
      candidate = `cluster-${index}`;
    }
    return candidate;
  }

  function normalizeClusterRoomIds(roomIds, board) {
    const effectiveBoard = board ?? ctx.getBoard();
    const validIds = new Set((effectiveBoard.rooms || []).map((room) => room.id));
    return Array.from(new Set((Array.isArray(roomIds) ? roomIds : [])
      .map((roomId) => String(roomId || "").trim())
      .filter((roomId) => validIds.has(roomId))));
  }

  function getSelectedClusterForBoard(board) {
    const effectiveBoard = board ?? ctx.getBoard();
    if (!ctx.clusterSelect) {
      return null;
    }
    const clusters = getBoardRoomClusters(effectiveBoard.id);
    const selectedId = String(ctx.clusterSelect.value || "").trim();
    return clusters.find((cluster) => cluster.clusterId === selectedId) ?? null;
  }

  function syncClusterRoomMultiSelect(board, selectedRoomIds = []) {
    if (!ctx.clusterRoomIdsSelect) {
      return;
    }
    const normalizedSelection = new Set(normalizeClusterRoomIds(selectedRoomIds, board));
    ctx.clusterRoomIdsSelect.replaceChildren();
    // Sort alphabetically by display name (case-insensitive) for the
    // cluster-membership picker. The original room order on the board
    // model is creation-order which made finding rooms in a long list
    // tedious — alphabetical is what the user expects (Phase 25).
    const sortedRooms = [...board.rooms].sort((a, b) => {
      const an = String(a.name ?? a.label ?? a.id ?? "");
      const bn = String(b.name ?? b.label ?? b.id ?? "");
      return an.localeCompare(bn, undefined, { sensitivity: "base", numeric: true });
    });
    // Phase 26: detect rooms that share a name (case-insensitive,
    // trimmed). For those entries, append a position hint so the user
    // can tell two same-named rooms apart in the picker — typically
    // useful when the board has accidental "ghost" rooms (tiny
    // polygons left over from a misclick) that share a name with the
    // intended room.
    const nameCounts = new Map();
    for (const room of sortedRooms) {
      const key = String(room.name ?? room.label ?? room.id ?? "").trim().toLowerCase();
      nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
    }
    for (const room of sortedRooms) {
      const option = document.createElement("option");
      option.value = room.id;
      const baseName = String(room.name ?? room.label ?? room.id);
      const key = baseName.trim().toLowerCase();
      option.textContent = (nameCounts.get(key) || 0) > 1
        ? `${baseName} · ${getRoomPositionHint(room)}`
        : baseName;
      option.selected = normalizedSelection.has(room.id);
      ctx.clusterRoomIdsSelect.append(option);
    }
    ctx.clusterRoomIdsSelect.disabled = board.rooms.length === 0;
  }

  function getRoomPositionHint(room) {
    const pts = Array.isArray(room?.polygon) ? room.polygon
      : Array.isArray(room?.points) ? room.points : null;
    if (pts && pts.length >= 3) {
      const xs = pts.map((p) => Number(p?.[0])).filter(Number.isFinite);
      const ys = pts.map((p) => Number(p?.[1])).filter(Number.isFinite);
      if (xs.length && ys.length) {
        const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
        return `${Math.round(cx * 100)}%/${Math.round(cy * 100)}%`;
      }
    }
    if (Number.isFinite(Number(room?.x)) && Number.isFinite(Number(room?.y))) {
      return `${Math.round(Number(room.x) * 100)}%/${Math.round(Number(room.y) * 100)}%`;
    }
    return String(room?.id || "");
  }

  function syncClusterManagementPanel(statusText = null, { preferredClusterId = null } = {}) {
    if (!ctx.clusterSelect || !ctx.clusterNameInput || !ctx.clusterRoomIdsSelect) {
      return;
    }
    const board = ctx.getBoard();
    const clusters = getBoardRoomClusters(board.id);
    const previousSelection = String(ctx.clusterSelect.value || "").trim();
    ctx.clusterSelect.replaceChildren();
    for (const cluster of clusters) {
      const option = document.createElement("option");
      option.value = cluster.clusterId;
      option.textContent = `${cluster.name} (${cluster.roomIds.length} rooms)`;
      ctx.clusterSelect.append(option);
    }

    const fallbackClusterId = clusters[0]?.clusterId ?? "";
    const nextClusterId = clusters.some((cluster) => cluster.clusterId === preferredClusterId)
      ? preferredClusterId
      : clusters.some((cluster) => cluster.clusterId === previousSelection)
        ? previousSelection
        : fallbackClusterId;
    ctx.clusterSelect.value = nextClusterId;
    const selectedCluster = clusters.find((cluster) => cluster.clusterId === nextClusterId) ?? null;
    ctx.clusterNameInput.value = selectedCluster?.name ?? "";
    syncClusterRoomMultiSelect(board, selectedCluster?.roomIds ?? []);
    ctx.clusterSelect.disabled = clusters.length === 0;
    if (ctx.clusterSaveButton) {
      ctx.clusterSaveButton.disabled = !selectedCluster;
    }
    if (ctx.clusterDeleteButton) {
      ctx.clusterDeleteButton.disabled = !selectedCluster;
    }
    if (ctx.clusterManagementStatus && statusText) {
      ctx.clusterManagementStatus.textContent = statusText;
    }
  }

  function createClusterFromSettings() {
    const board = ctx.getBoard();
    const selectedRoomIds = normalizeClusterRoomIds(getSelectedOptionValues(ctx.clusterRoomIdsSelect), board);
    if (selectedRoomIds.length === 0) {
      syncClusterManagementPanel("Cluster management: select at least one room");
      return false;
    }
    const clusterId = createClusterId(board);
    const fallbackName = `Cluster ${getBoardRoomClusters(board.id).length + 1}`;
    const name = String(ctx.clusterNameInput?.value || "").trim() || fallbackName;
    const nextClusters = [
      ...getBoardRoomClusters(board.id),
      {
        clusterId,
        name,
        roomIds: selectedRoomIds,
      },
    ];
    board.roomClusters = nextClusters;
    const persisted = ctx.persistBoardProfiles();
    ctx.syncRoomTargetSelect();
    refreshClusterPadRail();
    syncClusterManagementPanel(
      persisted
        ? `Cluster management: ${name} created`
        : `Cluster management: ${name} created (persistence failed)`,
      { preferredClusterId: clusterId },
    );
    return persisted;
  }

  function updateClusterFromSettings() {
    const board = ctx.getBoard();
    const selectedCluster = getSelectedClusterForBoard(board);
    if (!selectedCluster) {
      syncClusterManagementPanel("Cluster management: update skipped (no cluster selected)");
      return false;
    }
    const selectedRoomIds = normalizeClusterRoomIds(getSelectedOptionValues(ctx.clusterRoomIdsSelect), board);
    if (selectedRoomIds.length === 0) {
      syncClusterManagementPanel("Cluster management: select at least one room");
      return false;
    }
    const name = String(ctx.clusterNameInput?.value || "").trim() || selectedCluster.name || "Cluster";
    board.roomClusters = getBoardRoomClusters(board.id).map((cluster) => (
      cluster.clusterId === selectedCluster.clusterId
        ? {
          ...cluster,
          name,
          roomIds: selectedRoomIds,
        }
        : cluster
    ));
    const persisted = ctx.persistBoardProfiles();
    ctx.syncRoomTargetSelect();
    refreshClusterPadRail();
    syncClusterManagementPanel(
      persisted
        ? `Cluster management: ${name} updated`
        : `Cluster management: ${name} updated (persistence failed)`,
      { preferredClusterId: selectedCluster.clusterId },
    );
    return persisted;
  }

  function deleteSelectedClusterFromSettings() {
    const state = ctx.state;
    const board = ctx.getBoard();
    const selectedCluster = getSelectedClusterForBoard(board);
    if (!selectedCluster) {
      syncClusterManagementPanel("Cluster management: delete skipped (no cluster selected)");
      return false;
    }
    board.roomClusters = getBoardRoomClusters(board.id).filter((cluster) => cluster.clusterId !== selectedCluster.clusterId);
    if (state.roomDraft.targetType === "cluster" && state.roomDraft.targetId === selectedCluster.clusterId) {
      state.roomDraft.targetType = "room";
      state.roomDraft.targetId = state.selectedRoomId;
    }
    const persisted = ctx.persistBoardProfiles();
    ctx.syncRoomTargetSelect();
    refreshClusterPadRail();
    syncClusterManagementPanel(
      persisted
        ? `Cluster management: ${selectedCluster.name} deleted`
        : `Cluster management: ${selectedCluster.name} deleted (persistence failed)`,
    );
    return persisted;
  }

  // Refresh the dashboard's cluster pad rail after a cluster CRUD
  // op so create / save / delete is reflected immediately without
  // a page reload (Phase 25 user feedback). Defensive — the
  // ANIMATION_LIFECYCLE namespace may not be ready at module-init
  // time but is ready by the time these functions are invoked.
  function refreshClusterPadRail() {
    const lifecycle = window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE;
    try { lifecycle?.renderClusterPads?.(); } catch { /* defensive */ }
  }

  function calculatePolygonCenterAndRadius(polygon, fallbackCenter = { x: 0.5, y: 0.5 }, fallbackRadius = 0.055) {
    if (!Array.isArray(polygon) || polygon.length < 3) {
      return {
        center: fallbackCenter,
        radius: fallbackRadius,
      };
    }
    const center = polygon.reduce(
      (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
      { x: 0, y: 0 },
    );
    const normalizedCenter = {
      x: ctx.clampRoomAbsoluteCoordinate(center.x / polygon.length),
      y: ctx.clampRoomAbsoluteCoordinate(center.y / polygon.length),
    };
    const radius = polygon.reduce(
      (maxRadius, [x, y]) => Math.max(maxRadius, Math.hypot(x - normalizedCenter.x, y - normalizedCenter.y)),
      fallbackRadius,
    );
    return {
      center: normalizedCenter,
      radius: Math.max(0.01, Math.min(0.25, radius)),
    };
  }

  function cloneRoomSnapshot(room) {
    if (!room) {
      return null;
    }
    return {
      ...room,
      polygon: (room.polygon || room.points || []).map((point) => ctx.normalizeRoomPoint(point)),
      points: (room.points || room.polygon || []).map((point) => ctx.normalizeRoomPoint(point)),
      meta: {
        ...(room.meta || {}),
      },
    };
  }

  function buildCopiedRoomName(board, sourceRoom) {
    const baseName = `${sourceRoom?.name ?? sourceRoom?.label ?? sourceRoom?.id ?? "Room"} Copy`;
    const existing = new Set((board.rooms || []).map((room) => String(room.name ?? room.label ?? "").trim()));
    if (!existing.has(baseName)) {
      return baseName;
    }
    let suffix = 2;
    let candidate = `${baseName} ${suffix}`;
    while (existing.has(candidate)) {
      suffix += 1;
      candidate = `${baseName} ${suffix}`;
    }
    return candidate;
  }

  function copySelectedRoomToClipboard() {
    const state = ctx.state;
    const roomId = ctx.syncSelectedRoomStateForBoard(state.boardId);
    const room = roomId ? ctx.getSelectedRoom() : null;
    if (!room) {
      syncRoomManagementPanel("Room management: copy skipped (no room selected)");
      return false;
    }
    state.roomClipboard = {
      boardId: state.boardId,
      roomId: room.id,
      room: cloneRoomSnapshot(room),
      geometry: {
        ...ctx.getRoomGeometry(state.boardId, room.id),
      },
    };
    syncRoomManagementPanel(`Room management: copied ${room.name ?? room.label ?? room.id}`);
    return true;
  }

  function pasteRoomFromClipboard() {
    const state = ctx.state;
    const board = ctx.getBoard();
    const clipboard = state.roomClipboard;
    if (!clipboard?.room) {
      syncRoomManagementPanel("Room management: paste skipped (clipboard empty)");
      return false;
    }
    const id = ctx.createRoomId(board);
    const sourceRoom = cloneRoomSnapshot(clipboard.room);
    const name = buildCopiedRoomName(board, sourceRoom);
    const room = {
      ...sourceRoom,
      id,
      name,
      label: name,
      polygon: (sourceRoom.polygon || sourceRoom.points || []).map((point) => ctx.normalizeRoomPoint(point)),
      points: (sourceRoom.points || sourceRoom.polygon || []).map((point) => ctx.normalizeRoomPoint(point)),
      meta: {
        ...(sourceRoom.meta || {}),
        copiedFromBoardId: clipboard.boardId,
        copiedFromRoomId: clipboard.roomId,
      },
    };
    board.rooms.push(room);
    ctx.ensureBoardRoomStateMaps(state.boardId);
    ctx.clearRoomTombstone(state.boardId, id);
    ctx.setSpecialPolygonPoints(state.boardId, id, room.polygon);
    ctx.setRoomGeometry(state.boardId, id, clipboard.geometry);
    state.selectedRoomId = id;
    state.selectedRoomByBoard[state.boardId] = id;
    state.roomDraft.targetType = "room";
    state.roomDraft.targetId = id;
    state.polygonEditor.vertexSelectionActive = false;
    ctx.setActivePolygonRoomId(state.boardId, id);
    const persisted = ctx.persistBoardProfiles();
    ctx.syncRoomPanelFromSelection();
    ctx.syncPolygonEditorPanel();
    ctx.renderRoomOverlay();
    syncRoomManagementPanel(
      persisted
        ? `Room management: ${name} pasted from clipboard`
        : `Room management: ${name} pasted from clipboard (persistence failed)`,
    );
    return persisted;
  }

  function clearSelectedRoomSelection(statusText = null) {
    const state = ctx.state;
    if (!state.selectedRoomId) {
      if (statusText) {
        syncRoomManagementPanel(statusText);
      }
      return;
    }
    state.selectedRoomId = null;
    state.selectedRoomByBoard[state.boardId] = null;
    state.polygonEditor.vertexSelectionActive = false;
    ctx.setActivePolygonRoomId(state.boardId, null);
    ctx.clearRoomDraftEditTarget();
    ctx.syncRoomPanelFromSelection({ preserveDraftState: true });
    syncRoomManagementPanel(statusText ?? "Room management: selection cleared");
    ctx.renderRoomOverlay();
  }

  function isTypingShortcutTarget(target) {
    if (!target || !(target instanceof Element)) {
      return false;
    }
    const NON_TYPING_INPUT_TYPES = new Set([
      "checkbox", "radio", "button", "submit", "reset",
      "file", "color", "image", "range",
    ]);
    const isTextInput = (el) => {
      if (!(el instanceof HTMLInputElement)) return false;
      return !NON_TYPING_INPUT_TYPES.has(String(el.type || "").toLowerCase());
    };
    if (target instanceof HTMLTextAreaElement) return true;
    // <select> used to count as typing — that meant
    // a focused dropdown (e.g. Active Play Area) swallowed DELETE,
    // Ctrl+Z etc. A select isn't a text field; only treat the native
    // combobox as typing when the user is mid-interaction (its
    // dropdown panel being open isn't reliably detectable, so we
    // just drop the check entirely — shortcuts now work while a
    // select has focus, which matches desktop native UX).
    if (isTextInput(target)) return true;
    if (target.isContentEditable) return true;
    // Walk up the tree; stop at the first matching ancestor
    let el = target.parentElement;
    while (el) {
      if (el instanceof HTMLTextAreaElement) return true;
      if (isTextInput(el)) return true;
      if (el.isContentEditable) return true;
      el = el.parentElement;
    }
    return false;
  }

  function isPlayAreaShortcutContext(target) {
    if (ctx.state.shipPolygonEditor.dragVertexIndex !== null) {
      return true;
    }
    if (!target || !(target instanceof Element)) {
      return false;
    }
    return Boolean(
      target.closest(
        "#show-play-area-vertices, #ship-polygon-vertex-select, #ship-polygon-edge-select, #ship-polygon-insert-vertex, #ship-polygon-delete-vertex, #ship-polygon-reset, #outside-enabled, #outside-intensity, #outside-speed, #outside-mode, #outside-direction",
      ),
    );
  }

  function createRoomFromSettings() {
    const state = ctx.state;
    const board = ctx.getBoard();
    const id = ctx.createRoomId(board);
    const selectedRoom = ctx.getSelectedRoom() ?? board.rooms[0] ?? null;
    const selectedCenter = selectedRoom ? ctx.getRawRoomCenter(selectedRoom) : { x: 0.5, y: 0.5 };
    const createMode = ctx.roomCreateShapeSelect?.value ?? "hexagon";
    const spawnShape = createMode === "free" ? "free" : createMode === "hexagon" ? "hexagon" : "template";
    const fallbackName = `Room ${board.rooms.length + 1}`;
    const name = ctx.normalizeRoomName(ctx.roomNameInput?.value, fallbackName);
    let templateLabel = null;
    let polygon = null;
    let copiedGeometry = null;
    let copiedTransform = null;
    if (createMode === "template-play-area") {
      templateLabel = "Play Area";
      polygon = ctx.getShipPolygonPoints(state.boardId).map((point) => ctx.normalizeRoomPoint(point));
    } else if (createMode.startsWith("template-room:")) {
      const templateRoomId = createMode.slice("template-room:".length);
      const templateRoom = board.rooms.find((room) => room.id === templateRoomId);
      templateLabel = templateRoom?.name ?? templateRoom?.label ?? templateRoomId;
      polygon = ctx.getSpecialPolygonPoints(state.boardId, templateRoomId).map((point) => ctx.normalizeRoomPoint(point));
      copiedGeometry = templateRoom ? ctx.getRoomGeometry(state.boardId, templateRoom.id) : null;
      copiedTransform = templateRoom
        ? {
          x: Number.isFinite(Number(templateRoom.x)) ? Number(templateRoom.x) : null,
          y: Number.isFinite(Number(templateRoom.y)) ? Number(templateRoom.y) : null,
          radius: Number.isFinite(Number(templateRoom.radius)) ? Number(templateRoom.radius) : null,
        }
        : null;
    }

    if (!Array.isArray(polygon) || polygon.length < 3) {
      polygon = spawnShape === "hexagon"
        ? ctx.createHexagonPolygon({ x: selectedCenter.x, y: selectedCenter.y, radius: selectedRoom?.radius ?? 0.055 })
        : [
          ctx.normalizeRoomPoint([selectedCenter.x - 0.03, selectedCenter.y - 0.03]),
          ctx.normalizeRoomPoint([selectedCenter.x + 0.04, selectedCenter.y]),
          ctx.normalizeRoomPoint([selectedCenter.x - 0.02, selectedCenter.y + 0.04]),
        ];
      templateLabel = null;
    }

    const { center, radius } = calculatePolygonCenterAndRadius(
      polygon,
      selectedCenter,
      selectedRoom?.radius ?? 0.055,
    );
    const room = {
      id,
      name,
      label: name,
      polygon: polygon.map((point) => [...point]),
      points: polygon.map((point) => [...point]),
      radius: copiedTransform?.radius ?? radius,
      x: copiedTransform?.x ?? center.x,
      y: copiedTransform?.y ?? center.y,
      meta: {
        schema: "tt-beamer.room.v2",
        spawnShape,
        templateSource:
          createMode === "template-play-area"
            ? "play-area"
            : createMode.startsWith("template-room:")
              ? createMode.slice("template-room:".length)
              : null,
      },
    };
    board.rooms.push(room);
    ctx.ensureBoardRoomStateMaps(state.boardId);
    ctx.clearRoomTombstone(state.boardId, id);
    if (copiedGeometry) {
      ctx.setRoomGeometry(state.boardId, id, copiedGeometry);
    }
    state.selectedRoomId = id;
    state.selectedRoomByBoard[state.boardId] = id;
    state.roomDraft.targetType = "room";
    state.roomDraft.targetId = id;
    state.polygonEditor.vertexSelectionActive = false;
    ctx.setActivePolygonRoomId(state.boardId, id);
    const persisted = ctx.persistBoardProfiles();
    ctx.syncRoomPanelFromSelection();
    ctx.syncPolygonEditorPanel();
    ctx.renderRoomOverlay();
    syncRoomManagementPanel(
      persisted
        ? `Room management: ${name} created (${templateLabel ? `template copy from ${templateLabel}` : spawnShape === "hexagon" ? "hexagon starter" : "free starter"})`
        : `Room management: ${name} created (persistence failed)`,
    );
  }

  function deleteSelectedRoom({ roomId = null } = {}) {
    const state = ctx.state;
    const board = ctx.getBoard();
    const selectedRoomId = roomId ?? ctx.syncSelectedRoomStateForBoard(state.boardId);
    const room = board.rooms.find((entry) => entry.id === selectedRoomId) ?? null;
    if (!room) {
      syncRoomManagementPanel("Room management: delete skipped (no room selected)");
      return false;
    }
    if (board.rooms.length <= 1) {
      syncRoomManagementPanel("Room management: at least one room must remain");
      return false;
    }
    const nextRooms = board.rooms.filter((entry) => entry.id !== room.id);
    board.rooms = nextRooms;
    board.roomClusters = getBoardRoomClusters(state.boardId)
      .map((cluster) => ({
        ...cluster,
        roomIds: cluster.roomIds.filter((roomId) => roomId !== room.id),
      }))
      .filter((cluster) => cluster.roomIds.length > 0);
    state.runningAnimations = state.runningAnimations.filter((anim) => {
      if (anim.scope !== "room") {
        return true;
      }
      const sameBoard = anim.boardId === state.boardId;
      const sameRoom = anim.roomId === room.id;
      if (sameBoard && sameRoom) {
        ctx.stopAnimationSound(anim.id);
        return false;
      }
      return true;
    });
    if (state.roomGeometryByBoard[state.boardId]) {
      delete state.roomGeometryByBoard[state.boardId][room.id];
    }
    if (state.specialPolygonsByBoard[state.boardId]) {
      delete state.specialPolygonsByBoard[state.boardId][room.id];
    }
    if (state.frozenRoomsByBoard?.[state.boardId]) {
      delete state.frozenRoomsByBoard[state.boardId][room.id];
    }
    ctx.markRoomTombstone(state.boardId, room.id);
    const fallbackRoomId = nextRooms[0]?.id ?? null;
    state.selectedRoomId = fallbackRoomId;
    state.selectedRoomByBoard[state.boardId] = fallbackRoomId;
    state.polygonEditor.vertexSelectionActive = false;
    state.roomDraft.targetType = "room";
    state.roomDraft.targetId = fallbackRoomId;
    ctx.setActivePolygonRoomId(state.boardId, fallbackRoomId);
    ctx.clearRoomDraftEditTarget();
    const persisted = ctx.persistBoardProfiles();
    ctx.syncRoomPanelFromSelection();
    ctx.syncPolygonEditorPanel();
    ctx.renderRoomOverlay();
    ctx.renderRunningAnimationsList();
    syncRoomManagementPanel(
      persisted
        ? `Room management: ${room.name ?? room.label ?? room.id} deleted`
        : `Room management: ${room.name ?? room.label ?? room.id} deleted (persistence failed)`,
    );
    return persisted;
  }

  function refreshPersistentRoomSelectionVisualState() {
    const selectedRoomId = ctx.syncSelectedRoomStateForBoard(ctx.state.boardId);
    ctx.syncPolygonRoomSelection(selectedRoomId);
    ctx.syncPolygonEditorPanel();
    ctx.syncRoomPanelFromSelection({ preserveDraftState: true });
    ctx.renderRoomOverlay();
  }

  function renameSelectedRoom(nextName) {
    const state = ctx.state;
    const roomId = ctx.syncSelectedRoomStateForBoard(state.boardId);
    const room = roomId ? ctx.getSelectedRoom() : null;
    if (!room) {
      return;
    }
    const normalized = ctx.normalizeRoomName(nextName, room.name ?? room.label ?? room.id);
    room.name = normalized;
    room.label = normalized;
    const persisted = ctx.persistBoardProfiles();
    ctx.syncRoomPanelFromSelection({ preserveDraftState: true });
    ctx.syncPolygonEditorPanel();
    ctx.renderRoomOverlay();
    syncRoomManagementPanel(
      persisted
        ? `Room management: name updated (${normalized})`
        : `Room management: name updated (${normalized}, persistence failed)`,
    );
  }

  function getBoardRoomClusters(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const board = ctx.getBoard(effectiveBoardId);
    const roomIds = new Set(board.rooms.map((room) => room.id));
    const clusters = Array.isArray(board.roomClusters) ? board.roomClusters : [];
    return clusters
      .map((cluster, index) => {
        const clusterId = String(cluster?.clusterId || cluster?.id || "").trim() || `cluster-${index + 1}`;
        const name = String(cluster?.name || cluster?.label || "").trim() || `Cluster ${index + 1}`;
        const roomIdsInCluster = Array.from(
          new Set(
            (Array.isArray(cluster?.roomIds) ? cluster.roomIds : [])
              .map((roomId) => String(roomId || "").trim())
              .filter((roomId) => roomIds.has(roomId)),
          ),
        );
        return {
          clusterId,
          name,
          roomIds: roomIdsInCluster,
        };
      })
      .filter((cluster) => cluster.roomIds.length > 0);
  }

  function getRoomTargetOptions(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const board = ctx.getBoard(effectiveBoardId);
    const roomTargets = board.rooms
      .filter((room) => !ctx.isRoomFrozen(effectiveBoardId, room.id))
      .map((room) => ({
        value: `room:${room.id}`,
        label: `Room: ${room.name ?? room.label}`,
        targetType: "room",
        targetId: room.id,
      }));
    const clusterTargets = getBoardRoomClusters(effectiveBoardId).map((cluster) => ({
      value: `cluster:${cluster.clusterId}`,
      label: `Cluster: ${cluster.name} (${cluster.roomIds.length})`,
      targetType: "cluster",
      targetId: cluster.clusterId,
    }));
    return [...roomTargets, ...clusterTargets];
  }

  function parseRoomTargetValue(value) {
    const [targetType, ...rest] = String(value || "").split(":");
    const targetId = rest.join(":");
    if ((targetType === "room" || targetType === "cluster") && targetId) {
      return { targetType, targetId };
    }
    return null;
  }

  function syncRoomFrozenCheckbox() {
    if (!ctx.roomFrozenCheckbox) {
      return;
    }
    const roomId = ctx.syncSelectedRoomStateForBoard(ctx.state.boardId);
    ctx.roomFrozenCheckbox.disabled = !roomId;
    ctx.roomFrozenCheckbox.checked = roomId ? ctx.isRoomFrozen(ctx.state.boardId, roomId) : false;
  }

  window.TT_BEAMER_RUNTIME_ROOM_MANAGEMENT = {
    init,
    syncRoomManagementPanel,
    syncRoomCreateShapeOptions,
    getSelectedOptionValues,
    createClusterId,
    normalizeClusterRoomIds,
    getSelectedClusterForBoard,
    syncClusterRoomMultiSelect,
    syncClusterManagementPanel,
    createClusterFromSettings,
    updateClusterFromSettings,
    deleteSelectedClusterFromSettings,
    calculatePolygonCenterAndRadius,
    cloneRoomSnapshot,
    buildCopiedRoomName,
    copySelectedRoomToClipboard,
    pasteRoomFromClipboard,
    clearSelectedRoomSelection,
    isTypingShortcutTarget,
    isPlayAreaShortcutContext,
    createRoomFromSettings,
    deleteSelectedRoom,
    refreshPersistentRoomSelectionVisualState,
    renameSelectedRoom,
    getBoardRoomClusters,
    getRoomTargetOptions,
    parseRoomTargetValue,
    syncRoomFrozenCheckbox,
  };
})();
