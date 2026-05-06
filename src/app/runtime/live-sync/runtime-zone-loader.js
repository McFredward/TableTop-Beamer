// zone loader + board import module.
//
// Owns the board catalog loading pipeline (HTTP + static fallback
// chain with last-known-good memory), the JSON/image board import
// flows, the board activation helper, and the board select
// rehydration. BOARDS is reassigned via the injected setBoards
// callback.
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function syncZoneLoaderStatus() {
    const state = ctx.state;
    if (!ctx.zonesStatus) {
      return;
    }
    const boardIds = ctx.getBoards().map((board) => board.id);
    const boards = boardIds.map((boardId) => {
      const mode = state.zoneLoader.classificationByBoard[boardId] ?? "UNKNOWN";
      const fallback = state.zoneLoader.fallbackBoards[boardId] || "none";
      return `${boardId}: ${mode}${fallback !== "none" ? ` (${fallback})` : ""}`;
    });
    if (ctx.zonesStatus) {
      ctx.zonesStatus.textContent = `Board source: ${boards.join(" | ")}`;
    }
  }

  async function loadExternalBoardZones() {
    const state = ctx.state;
    try {
      const response = await ctx.fetchWithTimeout("/api/boards", {
        method: "GET",
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      });
      if (response.ok) {
        const payload = await response.json();
        const runtimeBoards = Array.isArray(payload?.runtimeBoards)
          ? payload.runtimeBoards
          : Array.isArray(payload?.boards)
            ? payload.boards.map((entry) => ({
              id: entry?.boardId,
              label: entry?.metadata?.name,
              src: entry?.metadata?.imageSrc,
              rooms: entry?.roomCatalog,
              roomClusters: entry?.roomClusters,
            }))
            : [];
        const normalizedBoards = runtimeBoards
          .map((board) => window.TT_BEAMER_ROOMS.normalizeBoard(board))
          .filter((board) => board?.id && Array.isArray(board.rooms));
        ctx.setBoards(normalizedBoards);
        for (const board of normalizedBoards) {
          state.zoneLoader.loadedBoards[board.id] = "/api/boards";
          state.zoneLoader.fallbackBoards[board.id] = "none";
          state.zoneLoader.classificationByBoard[board.id] = "CATALOG_LOADED";
          state.zoneLoader.detailByBoard[board.id] = "ok";
        }
        syncZoneLoaderStatus();
        // Phase-31 h46 (2026-05-06): SSR tab opens at server boot and
        // its first renderRoomOverlay (h38, on align-mode enable) can
        // race ahead of /api/boards — when it fires before BOARDS is
        // hydrated, board.rooms is empty and the early-return at
        // runtime-polygon-editor.js:356 paints nothing. The user
        // perceives this as "polygons only appear AFTER first
        // transform" because _redrawHandlesAfterCornerDrag's later
        // renderRoomOverlay call eventually wins the race. Fix: re-
        // render after BOARDS hydration if align-mode is currently
        // active. Idempotent on Pi/Dashboard (no-op when polygons
        // already painted).
        if (state?.alignMode === true && typeof ctx.renderRoomOverlay === "function") {
          try { ctx.renderRoomOverlay(); } catch (_) {}
        }
        return;
      }
    } catch {
      // /api/boards unreachable — clear catalog and let empty-state overlay handle it.
    }

    ctx.setBoards([]);
    state.zoneLoader.loadedBoards = {};
    state.zoneLoader.fallbackBoards = {};
    state.zoneLoader.classificationByBoard = {};
    state.zoneLoader.detailByBoard = {};
    syncZoneLoaderStatus();
  }

  async function importBoardFromFile(file) {
    if (!file) {
      throw new Error("Please select a JSON file first");
    }
    const text = await file.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("Selected file is not valid JSON");
    }

    const response = await ctx.fetchWithTimeout("/api/boards/import", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    let parsed = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const message = parsed?.error || parsed?.code || `HTTP ${response.status}`;
      throw new Error(`Board import failed: ${message}`);
    }

    await loadExternalBoardZones();
    ensureImportedBoardInCatalog(parsed);
    syncBoardSelectOptions();
    if (parsed?.boardId) {
      const activated = activateImportedBoard(parsed.boardId, "board-import");
      if (!activated) {
        throw new Error(`Board import succeeded but activation failed: ${parsed.boardId}`);
      }
    }
    // Final sync — switchBoard() above only sets the selected value,
    // it doesn't rebuild options. A second syncBoardSelectOptions
    // ensures the dropdown reflects every board even if some other
    // path raced in between (live-sync poll, panel refresh).
    syncBoardSelectOptions();
    return parsed;
  }

  function normalizeImportedBoardFromResponse(parsed) {
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const boardId = String(parsed?.boardId || parsed?.board?.boardId || parsed?.board?.id || "").trim();
    if (!boardId) {
      return null;
    }
    const boardPayload = parsed?.board;
    const roomCatalog = Array.isArray(boardPayload?.roomCatalog)
      ? boardPayload.roomCatalog
      : Array.isArray(boardPayload?.rooms)
        ? boardPayload.rooms
        : [];
    const roomClusters = Array.isArray(boardPayload?.roomClusters)
      ? boardPayload.roomClusters
      : Array.isArray(boardPayload?.clusters)
        ? boardPayload.clusters
        : [];
    const fallbackImagePath = String(parsed?.imagePath || "").trim();
    const fallbackImageSrc = fallbackImagePath ? `/${fallbackImagePath.replace(/^\/+/, "")}` : "";
    const runtimeCandidate = {
      id: boardId,
      label: String(boardPayload?.metadata?.name || boardPayload?.label || boardPayload?.name || boardId).trim() || boardId,
      src: String(boardPayload?.metadata?.imageSrc || boardPayload?.src || fallbackImageSrc).trim(),
      rooms: roomCatalog.map((room) => ({
        id: room?.id,
        name: room?.name,
        label: room?.name ?? room?.label,
        polygon: room?.polygon ?? room?.points,
        points: room?.polygon ?? room?.points,
        x: room?.x,
        y: room?.y,
        radius: room?.radius,
        meta: room?.meta,
      })),
      roomClusters,
    };
    if (!runtimeCandidate.src) {
      return null;
    }
    return window.TT_BEAMER_ROOMS.normalizeBoard(runtimeCandidate);
  }

  function ensureImportedBoardInCatalog(parsed) {
    const state = ctx.state;
    const board = normalizeImportedBoardFromResponse(parsed);
    const BOARDS = ctx.getBoards();
    if (!board?.id || BOARDS.some((entry) => entry.id === board.id)) {
      return false;
    }
    ctx.setBoards([...BOARDS, board]);
    state.zoneLoader.loadedBoards[board.id] = "import-response";
    state.zoneLoader.fallbackBoards[board.id] = "none";
    state.zoneLoader.classificationByBoard[board.id] = "CATALOG_LOADED";
    state.zoneLoader.detailByBoard[board.id] = "import-response";
    syncZoneLoaderStatus();
    return true;
  }

  function activateImportedBoard(boardId, reason) {
    const state = ctx.state;
    const targetId = String(boardId || "").trim();
    if (!targetId || !ctx.getBoards().some((board) => board.id === targetId)) {
      return false;
    }
    // Phase 28 (B2/D-06): board-switch save-gate — when /output/ has unsaved
    // align-mode changes, block the post-import activation and surface the
    // locked toast. The board still exists in the catalog; the user can
    // re-trigger after saving/discarding on /output/.
    if (state.alignModeDirtyOnOutput) {
      if (ctx.triggerFeedback) {
        ctx.triggerFeedback.textContent = "Status: unsaved align changes on /output/ — save or discard there first to switch board.";
      }
      return false;
    }
    ctx.switchBoard(targetId, { emitLiveContext: true, reason });
    return state.boardId === targetId;
  }

  async function importBoardFromImage(file, { boardName = "", boardId = "" } = {}) {
    if (!file) {
      throw new Error("Please select an image file first");
    }
    const formData = new FormData();
    formData.append("image", file, file.name || "board-image");
    const trimmedName = String(boardName || "").trim();
    const trimmedId = String(boardId || "").trim();
    if (trimmedName) {
      formData.append("boardName", trimmedName);
    }
    if (trimmedId) {
      formData.append("boardId", trimmedId);
    }

    const response = await ctx.fetchWithTimeout("/api/boards/import", {
      method: "POST",
      headers: {
        accept: "application/json",
      },
      body: formData,
    });

    let parsed = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const message = parsed?.error || parsed?.code || `HTTP ${response.status}`;
      throw new Error(`Image board import failed: ${message}`);
    }

    await loadExternalBoardZones();
    ensureImportedBoardInCatalog(parsed);
    syncBoardSelectOptions();
    if (parsed?.boardId) {
      const activated = activateImportedBoard(parsed.boardId, "board-import-image");
      if (!activated) {
        throw new Error(`Image import succeeded but activation failed: ${parsed.boardId}`);
      }
    }
    // Final dropdown re-sync (see importBoardFromFile for rationale).
    syncBoardSelectOptions();
    return parsed;
  }

  function syncBoardSelectOptions() {
    const state = ctx.state;
    ctx.boardSelect.replaceChildren();
    const BOARDS = ctx.getBoards();
    for (const board of BOARDS) {
      const option = document.createElement("option");
      option.value = board.id;
      option.textContent = board.label;
      ctx.boardSelect.append(option);
    }
    if (!BOARDS.some((board) => board.id === state.boardId)) {
      state.boardId = BOARDS[0]?.id ?? "";
    }
    ctx.boardSelect.value = state.boardId;
    syncBoardEmptyState(BOARDS.length === 0);
  }

  // Toggle the in-stage empty-state placeholder + hide the existing
  // board image when no boards are loaded. Also disables the delete
  // button so the user can't try to delete what isn't there.
  function syncBoardEmptyState(isEmpty) {
    const empty = document.querySelector("#board-empty-state");
    const img = document.querySelector("#board-image");
    const overlay = document.querySelector("#room-overlay");
    const deleteBtn = document.querySelector("#board-delete-current");
    if (empty) {
      if (isEmpty) empty.removeAttribute("hidden");
      else empty.setAttribute("hidden", "");
    }
    if (img) {
      img.style.visibility = isEmpty ? "hidden" : "";
    }
    if (overlay) {
      overlay.style.visibility = isEmpty ? "hidden" : "";
    }
    if (deleteBtn) {
      deleteBtn.disabled = isEmpty;
    }
  }

  // Delete an imported board on the server, then drop it from the
  // local BOARDS list and refresh the dropdown. Caller is responsible
  // for the user-confirmation flow (type-to-confirm in the UI).
  async function deleteBoardFromServer(boardId) {
    const target = String(boardId || "").trim();
    if (!target) {
      throw new Error("boardId required");
    }
    const response = await ctx.fetchWithTimeout("/api/boards/delete", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ boardId: target }),
    });
    let parsed = null;
    try { parsed = await response.json(); } catch { parsed = null; }
    if (!response.ok) {
      const message = parsed?.error || parsed?.code || `HTTP ${response.status}`;
      throw new Error(`Board delete failed: ${message}`);
    }
    const state = ctx.state;
    const remaining = ctx.getBoards().filter((board) => board.id !== target);
    ctx.setBoards(remaining);
    if (state.boardId === target) {
      const fallback = remaining[0]?.id ?? "";
      if (fallback) {
        // Phase 28 (B2/D-06): board-switch save-gate — when /output/ has
        // unsaved align-mode changes, block the post-delete fallback switch
        // and surface the locked toast. Rare branch (admin deleted the
        // current board while /output/ is dirty); state.boardId stays at
        // the deleted target until the user resolves /output/.
        if (state.alignModeDirtyOnOutput) {
          if (ctx.triggerFeedback) {
            ctx.triggerFeedback.textContent = "Status: unsaved align changes on /output/ — save or discard there first to switch board.";
          }
        } else {
          ctx.switchBoard(fallback, { emitLiveContext: true, reason: "board-deleted" });
        }
      } else {
        state.boardId = "";
      }
    }
    syncBoardSelectOptions();
    syncZoneLoaderStatus();
    return parsed;
  }

  window.TT_BEAMER_RUNTIME_ZONE_LOADER = {
    init,
    syncZoneLoaderStatus,
    loadExternalBoardZones,
    importBoardFromFile,
    normalizeImportedBoardFromResponse,
    ensureImportedBoardInCatalog,
    activateImportedBoard,
    importBoardFromImage,
    deleteBoardFromServer,
    syncBoardSelectOptions,
  };
})();
