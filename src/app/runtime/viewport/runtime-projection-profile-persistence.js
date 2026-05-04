// Unified Grid Projection — server-side profile persistence.
//
// Sub-module of runtime-projection-mapping. Owns the HTTP round-trips
// against /api/projection-profiles + the grid-payload (de)serializers
// + the profile picker menu wrapper.
//
// Functions: getCurrentBoardId, buildGridPayload, applyGridPayload,
// saveLoadedProfileFlow, saveAsNewProfileFlow, discardChanges,
// fetchProfileList, profileLoadFlow, profileDeleteFlow,
// showProfilePickerMenu, isDirty, isCurrentlyDirty, getLoadedProfileName,
// addDirtyListener, removeDirtyListener, notifyDirtyChanged.
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

  // --- Phase 27 dirty-flag state (B3 + B4) ---
  let _loadedProfileName = null;          // String|null — name as last loaded; null = "Unsaved"
  let _loadedProfileSnapshot = null;      // {srcXs,srcYs,points} captured at load; null = no profile loaded
  let _dirty = false;                     // last computed dirty value
  const _dirtyListeners = new Set();      // (boolean) -> void callbacks
  let _gridStateApi = null;               // injected via init() — exposes snapshotGridState/restoreGridSnapshot/buildNewProfileDefaultGrid

  // --- Phase 27 (B5) align-mode dirty POST broadcaster ---
  let _alignModeDirtyPostInflight = false;

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

  async function fetchProfileList(boardId) {
    const resp = await fetch(`/api/projection-profiles?boardId=${encodeURIComponent(boardId)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const body = await resp.json();
    return Array.isArray(body?.names) ? body.names : [];
  }

  // Deep-equal of two grid snapshots with the 0.001 float-drift tolerance
  // pattern from grid-state.js hasGridDisplacements (line 87 — THRESHOLD constant).
  function _snapshotsEqual(a, b) {
    const TH = 0.001;
    if (!a || !b) return false;
    if (a.srcXs.length !== b.srcXs.length) return false;
    if (a.srcYs.length !== b.srcYs.length) return false;
    for (let i = 0; i < a.srcXs.length; i++) if (Math.abs(a.srcXs[i] - b.srcXs[i]) > TH) return false;
    for (let i = 0; i < a.srcYs.length; i++) if (Math.abs(a.srcYs[i] - b.srcYs[i]) > TH) return false;
    if (a.points.length !== b.points.length) return false;
    for (let r = 0; r < a.points.length; r++) {
      if (a.points[r].length !== b.points[r].length) return false;
      for (let c = 0; c < a.points[r].length; c++) {
        if (Math.abs(a.points[r][c].x - b.points[r][c].x) > TH) return false;
        if (Math.abs(a.points[r][c].y - b.points[r][c].y) > TH) return false;
      }
    }
    return true;
  }

  function isDirty() {
    if (!_gridStateApi) return false;
    const cur = _gridStateApi.snapshotGridState();
    if (_loadedProfileSnapshot === null) {
      // No profile loaded: dirty iff current geometry differs from buildNewProfileDefaultGrid result.
      const def = _gridStateApi.buildNewProfileDefaultGrid();
      // Build a "default" snapshot at runtime so we can deep-equal.
      const defSnap = {
        srcXs: def.srcXs.slice(),
        srcYs: def.srcYs.slice(),
        points: def.srcYs.map((y) => def.srcXs.map((x) => ({ x, y }))),
      };
      return !_snapshotsEqual(cur, defSnap);
    }
    return !_snapshotsEqual(cur, _loadedProfileSnapshot);
  }

  function _recomputeAndNotifyDirty() {
    const next = isDirty();
    if (next === _dirty) return;
    _dirty = next;
    for (const cb of _dirtyListeners) {
      try { cb(_dirty); } catch (e) { console.warn("[profile-dirty] listener error:", e?.message || e); }
    }
  }

  function getLoadedProfileName() { return _loadedProfileName; }
  function isCurrentlyDirty() { return _dirty; }
  function addDirtyListener(cb) { if (typeof cb === "function") _dirtyListeners.add(cb); }
  function removeDirtyListener(cb) { _dirtyListeners.delete(cb); }
  function notifyDirtyChanged() { _recomputeAndNotifyDirty(); }

  function _validateGridPayloadSchema(data) {
    // D-08: cleanly reject malformed payloads. Returns { ok: true } or { ok: false, reason: string }.
    if (!data || typeof data !== "object") return { ok: false, reason: "payload not an object" };
    if (!Array.isArray(data.srcXs) || data.srcXs.length < 2) return { ok: false, reason: "srcXs not array of length >= 2" };
    if (!Array.isArray(data.srcYs) || data.srcYs.length < 2) return { ok: false, reason: "srcYs not array of length >= 2" };
    for (const v of data.srcXs) if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) return { ok: false, reason: "srcXs entry not a finite number in [0,1]" };
    for (const v of data.srcYs) if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) return { ok: false, reason: "srcYs entry not a finite number in [0,1]" };
    if (data.points !== undefined) {
      if (!Array.isArray(data.points)) return { ok: false, reason: "points not an array" };
      for (const p of data.points) {
        if (!p || typeof p !== "object") return { ok: false, reason: "points entry not object" };
        if (typeof p.row !== "number" || typeof p.col !== "number") return { ok: false, reason: "points entry missing row/col" };
        if (typeof p.x !== "number" || typeof p.y !== "number") return { ok: false, reason: "points entry missing x/y" };
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < -0.05 || p.x > 1.05 || p.y < -0.05 || p.y > 1.05) {
          return { ok: false, reason: "points entry x/y out of [-0.05,1.05] range" };
        }
      }
    }
    return { ok: true };
  }

  async function saveLoadedProfileFlow() {
    // Save = overwrite the loaded profile in place. If none loaded, defer to saveAsNewProfileFlow.
    const boardId = getCurrentBoardId();
    if (!boardId) { _showAlignErrorToast("No board selected."); return { ok: false }; }
    if (!_loadedProfileName) { return saveAsNewProfileFlow(); }
    try {
      const resp = await fetch("/api/projection-profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId, name: _loadedProfileName, data: buildGridPayload() }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      // Re-snapshot the freshly saved geometry so dirty becomes false.
      _loadedProfileSnapshot = _gridStateApi.snapshotGridState();
      _recomputeAndNotifyDirty();
      return { ok: true, name: _loadedProfileName };
    } catch (err) {
      _showAlignErrorToast("Save failed: " + (err?.message || err));
      return { ok: false, error: err };
    }
  }

  async function saveAsNewProfileFlow() {
    // Open the modal (UI-SPEC: title "Save as new profile" / body "Give this alignment a name so you can reload it later." / placeholder "e.g. Main stage, Angled left" / confirm "Save profile" / cancel "Keep editing").
    const boardId = getCurrentBoardId();
    if (!boardId) { _showAlignErrorToast("No board selected."); return { ok: false }; }
    const name = await _promptProfileNameModal();
    if (!name) return { ok: false, cancelled: true };
    try {
      const resp = await fetch("/api/projection-profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId, name, data: buildGridPayload() }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      _loadedProfileName = name;
      _loadedProfileSnapshot = _gridStateApi.snapshotGridState();
      _recomputeAndNotifyDirty();
      return { ok: true, name };
    } catch (err) {
      _showAlignErrorToast("Save failed: " + (err?.message || err));
      return { ok: false, error: err };
    }
  }

  function discardChanges() {
    // D-04 (B4): no confirm modal. If a profile is loaded, restore its snapshot; otherwise reset to new-profile default.
    pushUndo();
    if (_loadedProfileSnapshot) {
      _gridStateApi.restoreGridSnapshot(_loadedProfileSnapshot);
    } else {
      const def = _gridStateApi.buildNewProfileDefaultGrid();
      _gridStateApi.restoreGridSnapshot({
        srcXs: def.srcXs.slice(),
        srcYs: def.srcYs.slice(),
        points: def.srcYs.map((y) => def.srcXs.map((x) => ({ x, y }))),
      });
    }
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
    _recomputeAndNotifyDirty();
  }

  function _promptProfileNameModal() {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "tt-modal-backdrop";
      const modal = document.createElement("div");
      modal.className = "tt-modal tt-modal-fade";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      const title = document.createElement("div");
      title.className = "tt-modal-title";
      title.textContent = "Save as new profile";
      const body = document.createElement("div");
      body.className = "tt-modal-body";
      body.textContent = "Give this alignment a name so you can reload it later.";
      const input = document.createElement("input");
      input.className = "tt-modal-input";
      input.type = "text";
      input.placeholder = "e.g. Main stage, Angled left";
      input.maxLength = 80;
      const actions = document.createElement("div");
      actions.className = "tt-modal-actions";
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "tt-modal-btn tt-modal-btn-ghost";
      cancelBtn.textContent = "Keep editing";
      const confirmBtn = document.createElement("button");
      confirmBtn.className = "tt-modal-btn tt-modal-btn-primary";
      confirmBtn.textContent = "Save profile";
      confirmBtn.disabled = true;
      const close = (val) => {
        document.body.removeChild(backdrop);
        document.removeEventListener("keydown", onKey);
        resolve(val);
      };
      const onKey = (e) => {
        if (e.key === "Escape") { e.preventDefault(); close(null); }
        if (e.key === "Enter" && !confirmBtn.disabled) { e.preventDefault(); close(input.value.trim()); }
      };
      input.addEventListener("input", () => { confirmBtn.disabled = input.value.trim().length === 0; });
      cancelBtn.addEventListener("click", () => close(null));
      confirmBtn.addEventListener("click", () => close(input.value.trim()));
      backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(null); });
      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      modal.appendChild(title);
      modal.appendChild(body);
      modal.appendChild(input);
      modal.appendChild(actions);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      document.addEventListener("keydown", onKey);
      setTimeout(() => input.focus(), 0);
    });
  }

  function _showAlignErrorToast(msg) {
    // Minimal in-place hint — render an absolutely-positioned pill near the toolbar.
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = "position:fixed;top:64px;left:50%;transform:translateX(-50%);background:rgba(40,8,8,0.92);color:#FF5B5B;border:1px solid rgba(255,91,91,0.5);padding:8px 14px;border-radius:8px;font:600 12px 'Space Grotesk',sans-serif;z-index:10002;backdrop-filter:blur(6px);pointer-events:none;";
    document.body.appendChild(el);
    setTimeout(() => { try { document.body.removeChild(el); } catch {} }, 3500);
  }

  async function profileLoadFlow() {
    const boardId = getCurrentBoardId();
    if (!boardId) { _showAlignErrorToast("No board selected."); return; }
    let names;
    try { names = await fetchProfileList(boardId); }
    catch (err) { _showAlignErrorToast("Could not fetch profiles: " + (err?.message || err)); return; }
    if (names.length === 0) { _showAlignErrorToast("No saved profiles for this board."); return; }
    showProfilePickerMenu(names, async (name) => {
      try {
        const resp = await fetch(`/api/projection-profiles/load?boardId=${encodeURIComponent(boardId)}&name=${encodeURIComponent(name)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const body = await resp.json();
        const validation = _validateGridPayloadSchema(body?.data);
        if (!validation.ok) {
          // D-08 recovery — explicit confirm IS allowed here (rare error path); Discard uses no confirm per D-04.
          const offerReset = window.confirm(
            `Could not load profile "${name}" — format may be incompatible. Reset to default?`
          );
          if (offerReset) {
            const def = _gridStateApi.buildNewProfileDefaultGrid();
            pushUndo();
            _gridStateApi.restoreGridSnapshot({
              srcXs: def.srcXs.slice(),
              srcYs: def.srcYs.slice(),
              points: def.srcYs.map((y) => def.srcXs.map((x) => ({ x, y }))),
            });
            _loadedProfileName = null;
            _loadedProfileSnapshot = null;
            saveToLocalStorage();
            if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
            applyTransform();
            if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
            _recomputeAndNotifyDirty();
          }
          return;
        }
        pushUndo();
        applyGridPayload(body.data);
        _loadedProfileName = name;
        _loadedProfileSnapshot = _gridStateApi.snapshotGridState();
        saveToLocalStorage();
        if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
        applyTransform();
        if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
        _recomputeAndNotifyDirty();
      } catch (err) {
        _showAlignErrorToast("Load failed: " + (err?.message || err));
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

  async function _postAlignModeDirtyToServer(nextDirty) {
    if (_alignModeDirtyPostInflight) return;
    _alignModeDirtyPostInflight = true;
    try {
      const resp = await fetch("/api/align-mode-dirty", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dirty: Boolean(nextDirty) }),
      });
      if (!resp.ok && resp.status !== 429) {
        // 429 is the rate-limit (T-27-03). The next change will retry.
        console.warn("[align-mode-dirty] POST failed:", resp.status);
      }
    } catch (err) {
      console.warn("[align-mode-dirty] POST error:", err?.message || err);
    } finally {
      _alignModeDirtyPostInflight = false;
    }
  }

  function _maybeStartOutputDirtyBroadcaster() {
    // Only on /output/ (D-04). The dashboard never authoritatively writes the dirty flag.
    if (!ctx || ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;
    // Subscribe to the local dirty listener (added by plan 27-02 task 1).
    addDirtyListener((dirty) => {
      // Fire-and-forget POST. The 100 ms server rate limit prevents oscillation issues.
      void _postAlignModeDirtyToServer(dirty);
    });
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
    // NEW: capture grid-state API for snapshot/restore/default access:
    _gridStateApi = dependencies?.gridStateApi || null;
    // Subscribe to handlesVisible changes so the local mirror is kept
    // in sync with handle-ui's authoritative flag.
    const gs = dependencies?.gridState;
    if (gs && typeof gs.addHandlesVisibleListener === "function") {
      gs.addHandlesVisibleListener((v) => { handlesVisible = v; });
    }
    // Phase 27 (B5): on /output/ only, subscribe the dirty POST broadcaster.
    _maybeStartOutputDirtyBroadcaster();
  }

  window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE = {
    init,
    // legacy:
    profileLoadFlow,
    profileDeleteFlow,
    buildGridPayload,
    applyGridPayload,
    fetchProfileList,
    showProfilePickerMenu,
    getCurrentBoardId,
    // Phase 27:
    saveLoadedProfileFlow,
    saveAsNewProfileFlow,
    discardChanges,
    isDirty,
    isCurrentlyDirty,
    getLoadedProfileName,
    addDirtyListener,
    removeDirtyListener,
    notifyDirtyChanged,
  };
})();
