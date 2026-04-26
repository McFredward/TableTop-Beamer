// Unified Grid Projection — server-side profile persistence.
//
// Sub-module of runtime-projection-mapping. Owns the HTTP round-trips
// against /api/projection-profiles + the grid-payload (de)serializers
// + the profile picker menu wrapper.
//
// Functions: getCurrentBoardId, buildGridPayload, applyGridPayload,
// profileSaveFlow, fetchProfileList, profileLoadFlow,
// profileDeleteFlow, showProfilePickerMenu.
//
// Cross-module references (grid, getPoint, setPoint, pushUndo,
// saveToLocalStorage, buildDefaultPoints, applyTransform,
// rebuildHandleElements, drawLines, positionRotateHandles,
// showContextMenu, handlesVisible) are init-injected as IIFE-local
// lets so the moved bodies remain byte-identical.
(() => {
  let ctx = null;

  // Grid-state bindings.
  let grid = null;
  let getPoint = () => ({ x: 0, y: 0 });
  let setPoint = () => {};
  let pushUndo = () => {};
  let saveToLocalStorage = () => {};
  let buildDefaultPoints = () => {};

  // Cross-module callbacks.
  let applyTransform = () => {};
  let rebuildHandleElements = () => {};
  let drawLines = () => {};
  let positionRotateHandles = () => {};
  let showContextMenu = () => {};

  // handlesVisible mirror — kept in sync via gridState's listener
  // registry so profileLoadFlow's `if (handlesVisible)` body stays
  // byte-identical to its pre-split form.
  let handlesVisible = false;

  function getCurrentBoardId() {
    try {
      return typeof ctx?.getBoardId === "function" ? ctx.getBoardId() : null;
    } catch { return null; }
  }

  function buildGridPayload() {
    const pointsArr = [];
    for (let row = 0; row < grid.srcYs.length; row++) {
      for (let col = 0; col < grid.srcXs.length; col++) {
        const pt = getPoint(row, col);
        pointsArr.push({ row, col, x: pt.x, y: pt.y });
      }
    }
    return { srcXs: grid.srcXs.slice(), srcYs: grid.srcYs.slice(), points: pointsArr };
  }

  function applyGridPayload(data) {
    if (!data || typeof data !== "object") return;
    if (Array.isArray(data.srcXs) && data.srcXs.length >= 2) {
      grid.srcXs = data.srcXs.filter((v) => typeof v === "number").slice().sort((a, b) => a - b);
    }
    if (Array.isArray(data.srcYs) && data.srcYs.length >= 2) {
      grid.srcYs = data.srcYs.filter((v) => typeof v === "number").slice().sort((a, b) => a - b);
    }
    buildDefaultPoints();
    if (Array.isArray(data.points)) {
      for (const p of data.points) {
        if (typeof p.row === "number" && typeof p.col === "number"
          && typeof p.x === "number" && typeof p.y === "number") {
          setPoint(p.row, p.col, p.x, p.y);
        }
      }
    }
  }

  async function profileSaveFlow() {
    const boardId = getCurrentBoardId();
    if (!boardId) { alert("No board selected."); return; }
    const name = window.prompt("Profile name:", "");
    if (!name || !name.trim()) return;
    try {
      const resp = await fetch("/api/projection-profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId, name: name.trim(), data: buildGridPayload() }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
      alert("Save failed: " + (err?.message || err));
    }
  }

  async function fetchProfileList(boardId) {
    const resp = await fetch(`/api/projection-profiles?boardId=${encodeURIComponent(boardId)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const body = await resp.json();
    return Array.isArray(body?.names) ? body.names : [];
  }

  async function profileLoadFlow() {
    const boardId = getCurrentBoardId();
    if (!boardId) { alert("No board selected."); return; }
    let names;
    try {
      names = await fetchProfileList(boardId);
    } catch (err) {
      alert("Could not fetch profiles: " + (err?.message || err));
      return;
    }
    if (names.length === 0) { alert("No saved profiles for this board."); return; }
    showProfilePickerMenu(names, async (name) => {
      try {
        const resp = await fetch(`/api/projection-profiles/load?boardId=${encodeURIComponent(boardId)}&name=${encodeURIComponent(name)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const body = await resp.json();
        pushUndo();
        applyGridPayload(body?.data);
        saveToLocalStorage();
        if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
        applyTransform();
        if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
      } catch (err) {
        alert("Load failed: " + (err?.message || err));
      }
    });
  }

  async function profileDeleteFlow() {
    const boardId = getCurrentBoardId();
    if (!boardId) { alert("No board selected."); return; }
    let names;
    try {
      names = await fetchProfileList(boardId);
    } catch (err) {
      alert("Could not fetch profiles: " + (err?.message || err));
      return;
    }
    if (names.length === 0) { alert("No saved profiles to delete."); return; }
    showProfilePickerMenu(names, async (name) => {
      if (!confirm(`Delete profile "${name}"?`)) return;
      try {
        const resp = await fetch(`/api/projection-profiles?boardId=${encodeURIComponent(boardId)}&name=${encodeURIComponent(name)}`, { method: "DELETE" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch (err) {
        alert("Delete failed: " + (err?.message || err));
      }
    });
  }

  function showProfilePickerMenu(names, onPick) {
    // Put the menu at the center of the viewport
    const items = names.map((name) => ({
      label: name,
      action: () => onPick(name),
    }));
    items.push({ label: "Cancel", action: () => {} });
    showContextMenu(Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2), items);
  }

  function init(dependencies) {
    ctx = dependencies;
    if (dependencies?.grid) grid = dependencies.grid;
    if (typeof dependencies?.getPoint === "function") getPoint = dependencies.getPoint;
    if (typeof dependencies?.setPoint === "function") setPoint = dependencies.setPoint;
    if (typeof dependencies?.pushUndo === "function") pushUndo = dependencies.pushUndo;
    if (typeof dependencies?.saveToLocalStorage === "function") saveToLocalStorage = dependencies.saveToLocalStorage;
    if (typeof dependencies?.buildDefaultPoints === "function") buildDefaultPoints = dependencies.buildDefaultPoints;
    if (typeof dependencies?.applyTransform === "function") applyTransform = dependencies.applyTransform;
    if (typeof dependencies?.rebuildHandleElements === "function") rebuildHandleElements = dependencies.rebuildHandleElements;
    if (typeof dependencies?.drawLines === "function") drawLines = dependencies.drawLines;
    if (typeof dependencies?.positionRotateHandles === "function") positionRotateHandles = dependencies.positionRotateHandles;
    if (typeof dependencies?.showContextMenu === "function") showContextMenu = dependencies.showContextMenu;
    // Subscribe to handlesVisible changes so the local mirror is kept
    // in sync with handle-ui's authoritative flag.
    const gs = dependencies?.gridState;
    if (gs && typeof gs.addHandlesVisibleListener === "function") {
      gs.addHandlesVisibleListener((v) => { handlesVisible = v; });
    }
  }

  window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE = {
    init,
    profileSaveFlow,
    profileLoadFlow,
    profileDeleteFlow,
    buildGridPayload,
    applyGridPayload,
    fetchProfileList,
    showProfilePickerMenu,
    getCurrentBoardId,
  };
})();
