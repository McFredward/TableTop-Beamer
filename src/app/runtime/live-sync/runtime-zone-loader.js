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
  const lastKnownGoodBoardById = new Map();

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
        // Always overwrite BOARDS from /api/boards when the response
        // is OK — even if the catalog is empty. The fallback below
        // would otherwise install INLINE_FALLBACK_BOARDS (now empty)
        // and silently drop the board the user just imported. The
        // server is authoritative once it answers OK.
        ctx.setBoards(normalizedBoards);
        for (const board of normalizedBoards) {
          state.zoneLoader.loadedBoards[board.id] = "/api/boards";
          state.zoneLoader.fallbackBoards[board.id] = "none";
          state.zoneLoader.classificationByBoard[board.id] = "CATALOG_LOADED";
          state.zoneLoader.detailByBoard[board.id] = "ok";
        }
        syncZoneLoaderStatus();
        return;
      }
    } catch {
      // fall back to static zone files below
    }

    const loadedByBoardId = new Map();
    const loadedBoards = {};
    const fallbackBoards = {};
    const classificationByBoard = {};
    const detailByBoard = {};

    for (const source of ctx.ZONE_CONFIG_SOURCES) {
      const fallbackInline = ctx.INLINE_FALLBACK_BOARDS.find((board) => board.id === source.boardId);
      const fallbackLastKnown = lastKnownGoodBoardById.get(source.boardId) ?? fallbackInline;
      let responseStatus = null;
      try {
        const response = await ctx.fetchWithTimeout(source.endpoint, {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        });
        responseStatus = response.status;
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        let payload;
        try {
          payload = await response.json();
        } catch {
          throw Object.assign(new Error("malformed JSON"), { zoneCode: "ZONE_MALFORMED_JSON" });
        }

        const requiredRoomIds = (fallbackInline?.rooms ?? []).map((room) => room.id);
        const validated = ctx.validateZonePayload(payload, source.boardId, requiredRoomIds);
        if (!validated.ok || !validated.normalizedBoard) {
          throw Object.assign(new Error(validated.issues.join("; ")), {
            zoneCode: validated.code,
          });
        }

        const board = ctx.cloneBoardEntry(validated.normalizedBoard);
        loadedByBoardId.set(source.boardId, board);
        lastKnownGoodBoardById.set(source.boardId, ctx.cloneBoardEntry(board));
        loadedBoards[source.boardId] = source.endpoint;
        fallbackBoards[source.boardId] = "none";
        classificationByBoard[source.boardId] = "ZONE_LOADED";
        detailByBoard[source.boardId] = "ok";
      } catch (error) {
        const zoneCode =
          error && typeof error === "object" && "zoneCode" in error ? String(error.zoneCode || "") : "";
        const classification = ctx.classifyZoneFallback(responseStatus, zoneCode);
        const fallbackType = lastKnownGoodBoardById.has(source.boardId) ? "fallback:last-known-good" : "fallback:inline";
        loadedByBoardId.set(source.boardId, ctx.cloneBoardEntry(fallbackLastKnown));
        loadedBoards[source.boardId] = "fallback";
        fallbackBoards[source.boardId] = fallbackType;
        classificationByBoard[source.boardId] = classification;
        detailByBoard[source.boardId] =
          error instanceof Error ? error.message : zoneCode || `status=${responseStatus ?? "n/a"}`;
      }
    }

    ctx.setBoards(ctx.INLINE_FALLBACK_BOARDS.map(
      (fallbackBoard) => ctx.cloneBoardEntry(loadedByBoardId.get(fallbackBoard.id) ?? fallbackBoard),
    ));
    state.zoneLoader.loadedBoards = loadedBoards;
    state.zoneLoader.fallbackBoards = fallbackBoards;
    state.zoneLoader.classificationByBoard = classificationByBoard;
    state.zoneLoader.detailByBoard = detailByBoard;
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
        ctx.switchBoard(fallback, { emitLiveContext: true, reason: "board-deleted" });
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
