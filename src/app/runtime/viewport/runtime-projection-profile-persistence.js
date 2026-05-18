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

  // h10: reload-resilience for loaded-profile metadata.
  // The grid geometry already persists across reloads via grid-state's
  // localStorage write. But _loadedProfileName / _loadedProfileSnapshot
  // were lost on reload, so post-reload the toolbar showed "Unsaved"
  // (instead of the profile name) and isDirty compared to the default
  // (instead of the snapshot). Storing both lets a mid-edit reload
  // preserve the dirty flag, the loaded profile name, and the correct
  // dirty comparison target.
  const LOADED_PROFILE_LS_KEY = "tt-beamer.align-loaded-profile.v1";

  function _persistLoadedProfileToLs() {
    try {
      if (_loadedProfileName && _loadedProfileSnapshot) {
        window.localStorage?.setItem(
          LOADED_PROFILE_LS_KEY,
          JSON.stringify({ name: _loadedProfileName, snapshot: _loadedProfileSnapshot }),
        );
      } else {
        window.localStorage?.removeItem(LOADED_PROFILE_LS_KEY);
      }
    } catch { /* ignore quota/security errors */ }
  }

  function _restoreLoadedProfileFromLs() {
    try {
      const raw = window.localStorage?.getItem(LOADED_PROFILE_LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.name === "string"
          && parsed.snapshot && typeof parsed.snapshot === "object"
          && Array.isArray(parsed.snapshot.srcXs)
          && Array.isArray(parsed.snapshot.srcYs)
          && Array.isArray(parsed.snapshot.points)) {
        // Phase-31 h24 (2026-05-06): mismatch-detection cleanup.
        // h23 force-applied the LS snapshot to the grid which
        // OVERWROTE the user's intent (e.g. wrong default, lost
        // edits). Reverted to a softer policy: at boot, if the LS
        // snapshot doesn't match the current grid (which has been
        // populated from grid-state's own LS or from defaults), we
        // CLEAR the loaded-profile pointer instead of force-syncing.
        // Result: isDirty() returns false (no profile loaded), align
        // mode toggle is unblocked, and the user can explicitly load
        // a profile to opt back into dirty tracking.
        if (_gridStateApi && typeof _gridStateApi.snapshotGridState === "function") {
          const currentGrid = _gridStateApi.snapshotGridState();
          if (_snapshotsEqual(currentGrid, parsed.snapshot)) {
            _loadedProfileName = parsed.name;
            _loadedProfileSnapshot = parsed.snapshot;
          } else {
            // Mismatch — treat as no profile loaded. Clear the LS
            // pointer so a future boot doesn't try the same compare.
            try { window.localStorage?.removeItem(LOADED_PROFILE_LS_KEY); } catch (_) {}
            console.info(
              "[profile-persistence] LS-loaded profile",
              parsed.name,
              "doesn't match current grid — cleared (re-load via menu if you need dirty tracking)",
            );
          }
        } else {
          // No grid-state API — fall back to legacy behavior.
          _loadedProfileName = parsed.name;
          _loadedProfileSnapshot = parsed.snapshot;
        }
      }
    } catch { /* ignore */ }
  }

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
    const payload = { srcXs: grid.srcXs.slice(), srcYs: grid.srcYs.slice(), points: pointsArr };
    // h6: include toolbar position in saved profile so each profile
    // remembers where the user last positioned the toolbar.
    try {
      const handleUi = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
      const pos = handleUi?.getAlignToolbarPosition?.();
      if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
        payload.toolbarPosition = { x: pos.x, y: pos.y };
      }
    } catch { /* ignore */ }
    return payload;
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
    // h6: restore toolbar position from saved profile (if present).
    // Persist=true so the position also lands in localStorage, surviving reloads.
    try {
      const handleUi = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
      if (handleUi?.setAlignToolbarPosition) {
        if (data.toolbarPosition && Number.isFinite(data.toolbarPosition.x)
            && Number.isFinite(data.toolbarPosition.y)) {
          handleUi.setAlignToolbarPosition({ x: data.toolbarPosition.x, y: data.toolbarPosition.y }, { persist: true });
        }
        // If no toolbarPosition in saved profile, leave the current position
        // alone — switching profiles shouldn't snap the toolbar back to centered
        // for legacy profiles that pre-date h6.
      }
    } catch { /* ignore */ }
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
    // Phase 29 h3: dirty ONLY means "loaded profile has unsaved edits since
    // load". With no profile loaded, the current geometry IS the session
    // state (auto-persisted to localStorage); there's nothing to be unsaved
    // against, so dirty is permanently false. The /output/ broadcaster
    // therefore never POSTs dirty=true unless the user explicitly loaded or
    // created a profile + made changes since — which is what the dashboard
    // chip is supposed to surface.
    if (_loadedProfileSnapshot === null) return false;
    const cur = _gridStateApi.snapshotGridState();
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

  // Phase 46 iter4 (2026-05-16): force-fan-out for chip refresh after a
  // profile-name change. The dirty listeners (see handle-ui.js:847) also
  // serve as the chip-refresh trigger — they call _refreshAlignToolbarVisual
  // which re-reads getLoadedProfileName(). When a profile load sets
  // _loadedProfileName but dirty was already false and stays false,
  // _recomputeAndNotifyDirty's early-exit suppresses the listener call →
  // chip stays at the previous name (often "Unsaved") until the next
  // gesture flips dirty. This helper unconditionally invokes listeners
  // so the chip refreshes the moment a profile is loaded.
  function _notifyChipRefresh() {
    for (const cb of _dirtyListeners) {
      try { cb(_dirty); } catch (e) { console.warn("[profile-dirty] listener error:", e?.message || e); }
    }
  }

  function getLoadedProfileName() { return _loadedProfileName; }
  function isCurrentlyDirty() { return _dirty; }
  function addDirtyListener(cb) { if (typeof cb === "function") _dirtyListeners.add(cb); }
  function removeDirtyListener(cb) { _dirtyListeners.delete(cb); }

  // 2026-05-15 fix: capture a remote-applied baseline as the LOCAL loaded
  // profile. Background: /output/'s `_loadedProfileSnapshot` was set only
  // when /output/ explicitly loaded a profile via its own toolbar. When
  // the dashboard loaded a profile and broadcast it (or after a server
  // restart that auto-loaded a profile via live-hello), /output/ applied
  // the new grid but kept its own _loadedProfileSnapshot null →
  // isDirty() always returned false → /output/'s Save/Discard buttons
  // never activated on drag. Operator UAT: "Die flag wird korrekt
  // gesetzt wenn man vorher ein neues Profil geladen hat. Wird der
  // Server einfach nur neugestartet und das Profil nicht verändert und
  // dann in den align mode gegangen wird in /output/ das flag nicht
  // korrekt gesetzt!".
  //
  // captureRemoteBaseline takes the just-applied grid as the new local
  // baseline + records the profileId. Skips when profileId is a
  // synthesized "unsaved-*" sentinel (no real profile to track) and
  // when grid-state isn't ready. It does NOT push undo or mutate the
  // grid — the grid was already applied by the WS-receive path; this
  // just snapshots it as "the loaded baseline" so subsequent drags
  // can correctly flip _dirty=true on profile-divergent edits.
  function captureRemoteBaseline(profileId) {
    if (!_gridStateApi || typeof _gridStateApi.snapshotGridState !== "function") {
      return;
    }
    const isSyntheticUnsaved =
      typeof profileId === "string" && profileId.startsWith("unsaved-");
    const nextName = (typeof profileId === "string" && !isSyntheticUnsaved)
      ? profileId
      : null;
    _loadedProfileName = nextName;
    _loadedProfileSnapshot = _gridStateApi.snapshotGridState();
    try { _persistLoadedProfileToLs(); } catch (_) { /* never break a sync */ }
    _recomputeAndNotifyDirty();
    // Phase 46 iter3 (2026-05-16): force chip refresh even when _dirty
    // didn't change. See _notifyChipRefresh comment.
    _notifyChipRefresh();
  }
  function notifyDirtyChanged() {
    // Phase 36 M5 (D-06 + Q1 LOCKED) — on /output/, every gesture broadcasts
    // dirty=true to the dashboard via the existing /api/align-mode-dirty
    // endpoint. The local _dirty state machine (used for dashboard
    // aria-describedby + chip UX) only flips on profile-divergent edits
    // (Phase 29 h3), but the gesture-driven dirty signal must fire
    // unconditionally on /output/ so the dashboard hint reflects ANY
    // operator action — per Phase 36 D-06 contract verified by T9.
    // The 100ms server rate-limit (T-27-03) prevents POST flooding.
    if (ctx?.outputRole === ctx?.OUTPUT_ROLE_FINAL) {
      void _postAlignModeDirtyToServer(true);
    }
    _recomputeAndNotifyDirty();
  }

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
      // Phase 28 B1 (D-01): persist the per-board last-used profile name on
      // every explicit save. Auto-load on board-switch reads this back to
      // restore the same profile silently. Discard / Reset / Default fall-back
      // intentionally do NOT touch this field.
      if (ctx?.state) {
        (ctx.state.lastUsedProfileNameByBoard ??= {})[boardId] = _loadedProfileName;
      }
      if (typeof ctx?.persistBoardProfiles === "function") ctx.persistBoardProfiles();
      _persistLoadedProfileToLs();
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
      // Phase 28 B1 (D-01): persist last-used profile name on save-as-new.
      if (ctx?.state) {
        (ctx.state.lastUsedProfileNameByBoard ??= {})[boardId] = _loadedProfileName;
      }
      if (typeof ctx?.persistBoardProfiles === "function") ctx.persistBoardProfiles();
      _persistLoadedProfileToLs();
      _recomputeAndNotifyDirty();
      return { ok: true, name };
    } catch (err) {
      _showAlignErrorToast("Save failed: " + (err?.message || err));
      return { ok: false, error: err };
    }
  }

  async function createNewProfileFlow() {
    // h4: "New" button — prompt for a name, then LOAD THE DEFAULT
    // geometry into the editor (instead of the current state), and
    // save it as a fresh new profile under the given name. Any
    // unsaved changes from the previous session are silently
    // discarded — consistent with D-04 (no confirm modal for
    // destructive operations on align state, since align geometry
    // is easy to redo).
    const boardId = getCurrentBoardId();
    if (!boardId) { _showAlignErrorToast("No board selected."); return { ok: false }; }
    const name = await _promptProfileNameModal({ kind: "create-new" });
    if (!name) return { ok: false, cancelled: true };
    // Step 1: load the new-profile default geometry into the editor
    // (this becomes the profile's saved state).
    pushUndo();
    const def = _gridStateApi.buildNewProfileDefaultGrid();
    _gridStateApi.restoreGridSnapshot({
      srcXs: def.srcXs.slice(),
      srcYs: def.srcYs.slice(),
      points: def.points.map((row) => row.map((p) => ({ x: p.x, y: p.y }))),
    });
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
    // Step 2: persist the default geometry as a new profile so it is
    // immediately selectable in the load picker.
    try {
      const resp = await fetch("/api/projection-profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId, name, data: buildGridPayload() }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      _loadedProfileName = name;
      _loadedProfileSnapshot = _gridStateApi.snapshotGridState();
      // Phase 28 B1 (D-01): persist last-used profile name on create-new.
      if (ctx?.state) {
        (ctx.state.lastUsedProfileNameByBoard ??= {})[boardId] = _loadedProfileName;
      }
      if (typeof ctx?.persistBoardProfiles === "function") ctx.persistBoardProfiles();
      _persistLoadedProfileToLs();
      _recomputeAndNotifyDirty();
      return { ok: true, name };
    } catch (err) {
      _showAlignErrorToast("Create failed: " + (err?.message || err));
      return { ok: false, error: err };
    }
  }

  function discardChanges() {
    // D-04 (B4): no confirm modal. If a profile is loaded, restore its snapshot; otherwise reset to new-profile default.
    pushUndo();
    const usingProfile = !!_loadedProfileSnapshot;
    if (usingProfile) {
      _gridStateApi.restoreGridSnapshot(_loadedProfileSnapshot);
    } else {
      const def = _gridStateApi.buildNewProfileDefaultGrid();
      _gridStateApi.restoreGridSnapshot({
        srcXs: def.srcXs.slice(),
        srcYs: def.srcYs.slice(),
        // h5: use the displaced points from buildNewProfileDefaultGrid
        // (def.points), NOT a synthesized identity points array. The
        // identity version would set points == srcXs and disable the GL
        // warp, leaving the board at 100% with alignment lines at 80%.
        points: def.points.map((row) => row.map((p) => ({ x: p.x, y: p.y }))),
      });
    }
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
    _recomputeAndNotifyDirty();
    // Phase-31 h30: discard changes the grid → broadcast so SSR tab follows.
    // 2026-05-15: tag this as a baseline reset so /output/'s WS-receive
    // doesn't relay dirty=true (and the server clears any stale flag).
    try { _gridStateApi?.broadcastGridSnapshot?.({ force: true, isBaseline: true }); } catch {}
    // Phase-31 h36 (2026-05-06): the user reported that after the FIRST
    // ESC the streamed board updates but the local handle/lines stay at
    // the dragged positions; the SECOND ESC catches them up. The first
    // ESC frequently coincides with a `video resize` event from the
    // receiver stream re-establishing — and the videoEl's
    // getBoundingClientRect can lag the actual DOM mutation by an
    // animation frame, so the synchronous drawLines above uses a stale
    // layout and renders into the wrong box. Schedule a delayed retry
    // so the next frame catches the fresh layout. Cheap (≤ 1 ms) and
    // idempotent — drawing the same grid twice produces the same output.
    try {
      window.requestAnimationFrame?.(() => {
        if (handlesVisible && typeof rebuildHandleElements === "function") {
          try {
            rebuildHandleElements();
            drawLines();
            positionRotateHandles();
          } catch (_) { /* defensive */ }
        }
      });
    } catch (_) {}
    // h35 diagnostic: trace discardChanges so we can see if it actually
    // ran AND what state it restored to. The user reported first-ESC
    // resets animations but not lines, second-ESC resets lines —
    // logging both ESCs side-by-side will show whether the state changes.
    try {
      const ui = window.TT_BEAMER_RUNTIME_PROJECTION_HANDLE_UI;
      if (ui?.piDiag) {
        const grid = _gridStateApi?.getGrid?.();
        const tlx = grid?.points?.[0]?.[0]?.x;
        const tly = grid?.points?.[0]?.[0]?.y;
        ui.piDiag(
          "discard",
          `usingProfile=${usingProfile} loadedName=${_loadedProfileName} `
          + `handlesVisible=${handlesVisible} `
          + `restoredTL=(${tlx?.toFixed?.(3)},${tly?.toFixed?.(3)})`,
        );
      }
    } catch (_) {}
  }

  function _promptProfileNameModal({ kind = "save-as-new" } = {}) {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "tt-modal-backdrop";
      const modal = document.createElement("div");
      modal.className = "tt-modal tt-modal-fade";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      const title = document.createElement("div");
      title.className = "tt-modal-title";
      // h4: variant copy. "save-as-new" preserves the current geometry
      // under a new name; "create-new" loads the default geometry first.
      title.textContent = kind === "create-new" ? "Create new profile" : "Save as new profile";
      const body = document.createElement("div");
      body.className = "tt-modal-body";
      body.textContent = kind === "create-new"
        ? "Give the new profile a name. The default 80% layout will be loaded, replacing any unsaved changes."
        : "Give this alignment a name so you can reload it later.";
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
      confirmBtn.textContent = kind === "create-new" ? "Create profile" : "Save profile";
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
              // h1: use the pre-displaced points from buildNewProfileDefaultGrid
              // (def.points), NOT a synthesized identity points array — the
              // identity version would map srcXs/srcYs onto themselves, which
              // would disable the GL warp and leave the board at 100%.
              points: def.points.map((row) => row.map((p) => ({ x: p.x, y: p.y }))),
            });
            _loadedProfileName = null;
            _loadedProfileSnapshot = null;
            _persistLoadedProfileToLs();
            saveToLocalStorage();
            if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
            applyTransform();
            if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
            _recomputeAndNotifyDirty();
            _notifyChipRefresh();
          }
          return;
        }
        pushUndo();
        applyGridPayload(body.data);
        _loadedProfileName = name;
        _loadedProfileSnapshot = _gridStateApi.snapshotGridState();
        // Phase 28 B1 (D-01): persist last-used profile name when the user
        // explicitly picks a profile from the picker. Auto-load on board-switch
        // does NOT touch this field — only user-driven flows do.
        if (ctx?.state) {
          (ctx.state.lastUsedProfileNameByBoard ??= {})[boardId] = _loadedProfileName;
        }
        if (typeof ctx?.persistBoardProfiles === "function") ctx.persistBoardProfiles();
        _persistLoadedProfileToLs();
        saveToLocalStorage();
        if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
        applyTransform();
        if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
        _recomputeAndNotifyDirty();
        // Phase 46 iter4 (2026-05-16): force chip refresh so the new
        // profile name appears immediately — operator UAT: "der name
        // wird erst angezeigt nachdem ich etwas bearbeite".
        _notifyChipRefresh();
        // Phase 36 iter2 h4 (2026-05-10): broadcast the new grid so the SSR
        // Chromium tab's mesh-warp follows. Mirrors applyAndCaptureSnapshot's
        // Phase-31 h30 fix (line 657). Without this, profileLoadFlow mutates
        // the dashboard's grid LOCALLY but never pushes to other clients —
        // operator UAT 2026-05-10: "ich sehe wie die Linien sich sofort
        // ändern, aber der Stream ändert sich nicht (desync)". The /output/
        // lines update via onProjectionProfileChange's snapshot refetch path
        // which does NOT touch grid; only this broadcast brings the stream
        // (rendered by SSR tab from grid.points) into sync.
        // 2026-05-15: tag isBaseline so /output/ doesn't relay dirty=true
        // after a clean profile load (operator's "Unsaved on /output/"
        // stuck after profile-load complaint).
        try { _gridStateApi?.broadcastGridSnapshot?.({ force: true, isBaseline: true }); } catch {}
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
    items.push({ label: "Keep editing", action: () => {} });
    showContextMenu(Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2), items);
  }

  // Phase 49 gap-closure-25 (2026-05-18): "Import from other board" flow.
  // Toolbar button → board picker (excluding current) → profile picker for
  // chosen source board → fetch profile data → POST to save under CURRENT
  // boardId (same profile name; confirm overwrite on conflict) → apply as
  // if loaded normally (becomes _loadedProfileName, lastUsedProfileNameByBoard
  // entry, isBaseline broadcast to SSR). Operator UAT: "ich hätte gernen
  // einen button in /output/ … mit dem man explizit ein Profil eines
  // anderen Boards laden kann. … in dem moment in dem man das 'Fremdprofil'
  // importiert hat, ist es auch ein gültiges Profil für das board und soll
  // auch vollumfänglich so behandelt werden."
  async function importProfileFromOtherBoardFlow() {
    const currentBoardId = getCurrentBoardId();
    if (!currentBoardId) { _showAlignErrorToast("No board selected."); return; }
    // Fetch list of all boards
    let allBoards = [];
    try {
      const r = await fetch("/api/boards");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = await r.json();
      const list = Array.isArray(body?.runtimeBoards) ? body.runtimeBoards : [];
      allBoards = list.filter((b) => b?.id && b.id !== currentBoardId);
    } catch (err) {
      _showAlignErrorToast("Could not fetch boards: " + (err?.message || err));
      return;
    }
    if (allBoards.length === 0) {
      _showAlignErrorToast("No other boards available to import from.");
      return;
    }
    // Show board picker
    const boardItems = allBoards.map((b) => ({
      label: b.label || b.name || b.id,
      action: () => _continueImportPickProfile(currentBoardId, b.id, b.label || b.name || b.id),
    }));
    boardItems.push({ label: "Cancel", action: () => {} });
    showContextMenu(
      Math.round(window.innerWidth / 2),
      Math.round(window.innerHeight / 2),
      boardItems,
    );
  }

  async function _continueImportPickProfile(currentBoardId, sourceBoardId, sourceBoardLabel) {
    // Fetch profile list for source board
    let names = [];
    try { names = await fetchProfileList(sourceBoardId); }
    catch (err) { _showAlignErrorToast("Could not fetch profiles: " + (err?.message || err)); return; }
    if (names.length === 0) {
      _showAlignErrorToast(`No profiles on "${sourceBoardLabel}".`);
      return;
    }
    showProfilePickerMenu(names, async (sourceName) => {
      await _continueImportFetchAndSave(currentBoardId, sourceBoardId, sourceName);
    });
  }

  async function _continueImportFetchAndSave(currentBoardId, sourceBoardId, sourceName) {
    // Fetch profile data from source
    let payload;
    try {
      const r = await fetch(
        `/api/projection-profiles/load?boardId=${encodeURIComponent(sourceBoardId)}`
        + `&name=${encodeURIComponent(sourceName)}`,
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      payload = await r.json();
    } catch (err) {
      _showAlignErrorToast("Could not fetch source profile: " + (err?.message || err));
      return;
    }
    const validation = _validateGridPayloadSchema(payload?.data);
    if (!validation.ok) {
      _showAlignErrorToast(`Source profile invalid: ${validation.reason}`);
      return;
    }
    // Check for name conflict on current board
    let existingNames = [];
    try { existingNames = await fetchProfileList(currentBoardId); }
    catch (_) { /* non-fatal — proceed without conflict-check */ }
    if (existingNames.includes(sourceName)) {
      const overwrite = window.confirm(
        `A profile named "${sourceName}" already exists on the current board. Overwrite it?`,
      );
      if (!overwrite) return;
    }
    // POST to save under current board (same profile name)
    try {
      const r = await fetch("/api/projection-profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId: currentBoardId, name: sourceName, data: payload.data }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (err) {
      _showAlignErrorToast("Save failed: " + (err?.message || err));
      return;
    }
    // Apply as loaded — same sequence as profileLoadFlow's onPick path so
    // _loadedProfileName, _loadedProfileSnapshot, lastUsedProfileNameByBoard,
    // and the isBaseline broadcast all match an explicit load.
    pushUndo();
    applyGridPayload(payload.data);
    _loadedProfileName = sourceName;
    _loadedProfileSnapshot = _gridStateApi.snapshotGridState();
    if (ctx?.state) {
      (ctx.state.lastUsedProfileNameByBoard ??= {})[currentBoardId] = _loadedProfileName;
    }
    if (typeof ctx?.persistBoardProfiles === "function") ctx.persistBoardProfiles();
    _persistLoadedProfileToLs();
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
    _recomputeAndNotifyDirty();
    _notifyChipRefresh();
    try { _gridStateApi?.broadcastGridSnapshot?.({ force: true, isBaseline: true }); } catch {}
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

  // Phase 28 B1 (D-03): canonical "apply geometry + snapshot=loaded" sequence
  // used by the silent auto-load on board-switch. Mirrors the order in
  // profileLoadFlow.onPick so isDirty()===false post-load (the
  // _loadedProfileSnapshot becomes equal to the freshly applied state).
  // CRITICAL: this helper does NOT update state.lastUsedProfileNameByBoard.
  // Per D-01, only user-explicit save/load triggers may write that field —
  // auto-load is silent in BOTH directions (no popup, no field-write).
  function applyAndCaptureSnapshot(data, name) {
    if (!_gridStateApi) return;
    pushUndo();
    applyGridPayload(data);
    _loadedProfileName = name || null;
    _loadedProfileSnapshot = _gridStateApi.snapshotGridState();
    _persistLoadedProfileToLs();
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
    applyTransform();
    if (typeof ctx?.renderRoomOverlay === "function") ctx.renderRoomOverlay();
    _recomputeAndNotifyDirty();
    // Phase 46 iter4 (2026-05-16): force chip refresh so the new
    // profile name appears immediately on profile-load — without this,
    // the chip stayed on the previous name until the operator's next
    // gesture flipped dirty.
    _notifyChipRefresh();
    // Phase-31 h30: profile load swaps the grid wholesale → broadcast.
    // 2026-05-15: silent auto-load is a baseline reset.
    try { _gridStateApi?.broadcastGridSnapshot?.({ force: true, isBaseline: true }); } catch {}
  }

  // Phase 28 B1 (D-03 fallback): silent default-geometry restore for the
  // null-remembered-name branch and any auto-load failure path. Same
  // snapshot=loaded contract as above; same D-01 binding (no field-write).
  function applyDefaultAndCaptureSnapshot() {
    if (!_gridStateApi) return;
    pushUndo();
    const def = _gridStateApi.buildNewProfileDefaultGrid();
    _gridStateApi.restoreGridSnapshot({
      srcXs: def.srcXs.slice(),
      srcYs: def.srcYs.slice(),
      points: def.points.map((row) => row.map((p) => ({ x: p.x, y: p.y }))),
    });
    _loadedProfileName = null;
    _loadedProfileSnapshot = _gridStateApi.snapshotGridState();
    _persistLoadedProfileToLs();
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
    applyTransform();
    if (typeof ctx?.renderRoomOverlay === "function") ctx.renderRoomOverlay();
    _recomputeAndNotifyDirty();
    // Phase 36 iter2 h4 (2026-05-10): broadcast the default grid so other
    // clients converge to identity at boot. Without this, the SSR tab boots
    // with default identity AND broadcasts nothing, while the Pi /output/
    // (booting independently) might have applied a stale lastAlignGridSnapshot
    // from a previous session via live-hello — leaving them out of sync until
    // the next gesture broadcasts. Mirrors applyAndCaptureSnapshot.
    // 2026-05-15: identity reset is a baseline.
    try { _gridStateApi?.broadcastGridSnapshot?.({ force: true, isBaseline: true }); } catch {}
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

    // h10: reload-resilience. Restore the previously-loaded profile name +
    // snapshot from localStorage. Then force an initial dirty recompute so
    // the toolbar's dirty dot reflects reality after a mid-edit reload (the
    // `_dirty=false` initial value otherwise hid a freshly-loaded dirty
    // state until the next user action).
    _restoreLoadedProfileFromLs();
    // Defer one frame so all dependencies (including grid-state) are fully
    // wired and grid.points has been loaded from localStorage.
    Promise.resolve().then(() => {
      _recomputeAndNotifyDirty();
    });
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
    createNewProfileFlow,
    discardChanges,
    isDirty,
    isCurrentlyDirty,
    getLoadedProfileName,
    addDirtyListener,
    removeDirtyListener,
    notifyDirtyChanged,
    // 2026-05-14 fix: recompute the LOCAL dirty state against the loaded
    // profile snapshot WITHOUT broadcasting dirty=true to the server. Used
    // by remote-driven sync paths (live-sync-core's align-grid-snapshot
    // WS-receive) where the grid changed but no local user gesture
    // happened — calling notifyDirtyChanged there would falsely report
    // "Unsaved on /output/" to the dashboard after a profile load.
    recomputeDirtyOnly: _recomputeAndNotifyDirty,
    captureRemoteBaseline,
    // Phase 28 B1: silent auto-load helpers consumed by runtime-board-switch
    // autoLoadRememberedProjectionProfile().
    applyAndCaptureSnapshot,
    applyDefaultAndCaptureSnapshot,
    // Phase 49 gap-closure-25: import-from-other-board flow.
    importProfileFromOtherBoardFlow,
  };
})();
