// Animation editor library-list — owns the scope tabs, the filtered
// search list, and the selection-driven re-render fan-out (pane +
// preview). Reads shell.state by reference; cross-module callbacks
// (renderPane / renderPreview / notifySelection / syncDirtyBar /
// getEditorBoardId) are wired at init time so call sites stay
// byte-identical with the pre-W3.3 IIFE.
//
// Phase 24 W3.3-C2: extracted from animation-editor-view.js.
(() => {
  let ctx = null;
  let state = null;

  // Cross-sub-module callbacks injected at init time. Local shadow
  // declarations let renderList / render / etc. keep their bare-
  // identifier call sites byte-identical with the pre-split IIFE.
  let getEditorBoardId = null;
  let syncDirtyBar = null;
  let notifySelection = null;
  let renderPane = null;
  let renderPreview = null;

  function init(deps) {
    ctx = deps;
    state = deps.state ?? deps.shell?.getState?.() ?? null;
    if (deps.shell) {
      getEditorBoardId = deps.shell.getEditorBoardId;
      syncDirtyBar = deps.shell.syncDirtyBar;
      notifySelection = deps.shell.notifySelection;
    }
    if (typeof deps.getEditorBoardId === "function") getEditorBoardId = deps.getEditorBoardId;
    if (typeof deps.syncDirtyBar === "function") syncDirtyBar = deps.syncDirtyBar;
    if (typeof deps.notifySelection === "function") notifySelection = deps.notifySelection;
    if (typeof deps.renderPane === "function") renderPane = deps.renderPane;
    if (typeof deps.renderPreview === "function") renderPreview = deps.renderPreview;
  }

  function collectAnimations(scope) {
    const boardId = getEditorBoardId();
    if (!boardId) return [];
    if (scope === "inside" && typeof ctx.getInsideFxProfile === "function") {
      return ctx.getInsideFxProfile(boardId)?.animations ?? [];
    }
    if (scope === "outside" && typeof ctx.getOutsideFxProfile === "function") {
      return ctx.getOutsideFxProfile(boardId)?.animations ?? [];
    }
    if (scope === "room" && typeof ctx.getRoomFxProfile === "function") {
      return ctx.getRoomFxProfile(boardId)?.animations ?? [];
    }
    return [];
  }

  function render() {
    renderScopeTabs();
    renderList();
    renderPane();
    renderPreview();
    syncDirtyBar();
  }

  // Phase 46 iter6 (2026-05-17): drag-and-drop reorder. Operator UAT —
  // "Ich will im Animations-Editor in der Lage sein bei den Elementen
  // auf der linken Seite die Reihenfolge zu verändern per drag and drop.
  // Die Reihenfolge soll dann entsprechend auch direkt bei der Toggle
  // 'Tap Action' bei den Kacheln sichtbar sein und server seitig
  // genauso gespeichert werden."
  //
  // The Tap-Action picker + Dashboard global buttons read directly from
  // the profile's animations array, so persisting a new array order
  // propagates automatically.
  function reorderAnimations(scope, fromId, toId, dropPos /* "before" | "after" */) {
    const boardId = getEditorBoardId();
    if (!boardId || !fromId || !toId || fromId === toId) return;
    const getter = scope === "inside" ? ctx.getInsideFxProfile
      : scope === "outside" ? ctx.getOutsideFxProfile
      : scope === "room" ? ctx.getRoomFxProfile
      : null;
    const setter = scope === "inside" ? ctx.setInsideFxProfile
      : scope === "outside" ? ctx.setOutsideFxProfile
      : scope === "room" ? ctx.setRoomFxProfile
      : null;
    if (!getter || !setter) return;
    const profile = getter(boardId);
    if (!profile?.animations) return;
    const arr = profile.animations.slice();
    const fromIdx = arr.findIndex((d) => d.id === fromId);
    if (fromIdx < 0) return;
    const [moved] = arr.splice(fromIdx, 1);
    let toIdx = arr.findIndex((d) => d.id === toId);
    if (toIdx < 0) {
      arr.splice(fromIdx, 0, moved);
      return;
    }
    if (dropPos === "after") toIdx += 1;
    arr.splice(toIdx, 0, moved);
    setter(boardId, { ...profile, animations: arr });
    if (typeof ctx.persistBoardProfiles === "function") ctx.persistBoardProfiles();
    if (typeof ctx.refreshGlobalButtons === "function") ctx.refreshGlobalButtons();
    if (typeof syncDirtyBar === "function") syncDirtyBar();
    renderList();
  }

  function renderScopeTabs() {
    const nav = ctx.animEditorScopeTabs;
    if (!nav) return;
    for (const btn of nav.querySelectorAll("button[data-anim-scope]")) {
      const isActive = btn.dataset.animScope === state.scope;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    }
  }

  function renderList() {
    const list = ctx.animEditorList;
    const empty = ctx.animEditorEmpty;
    const count = ctx.animEditorCount;
    if (!list) return;

    const all = collectAnimations(state.scope);
    const filtered = state.search
      ? all.filter((def) =>
          String(def.name || "").toLowerCase().includes(state.search)
          || String(def.id || "").toLowerCase().includes(state.search))
      : all;

    if (count) {
      count.textContent = `${all.length} configured`;
    }
    list.replaceChildren();
    if (filtered.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    // If no selection for this scope yet, seed from the first visible
    // entry so the editor pane (W3b-2) has something to render.
    if (!state.selectedIds[state.scope]) {
      state.selectedIds[state.scope] = filtered[0].id;
    }

    const icons = window.TT_BEAMER_UI_ICONS;
    for (const def of filtered) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "anim-editor-row";
      row.setAttribute("role", "option");
      row.dataset.animationId = def.id;
      // Phase 46 iter6: native HTML5 drag-and-drop reorder.
      row.draggable = true;
      if (state.selectedIds[state.scope] === def.id) {
        row.classList.add("is-selected");
        row.setAttribute("aria-selected", "true");
      } else {
        row.setAttribute("aria-selected", "false");
      }

      const iconWrap = document.createElement("span");
      iconWrap.className = "anim-editor-row-icon";
      iconWrap.setAttribute("aria-hidden", "true");
      if (icons?.createIcon) {
        const name = icons.resolveAnimationIcon
          ? icons.resolveAnimationIcon({
            ...def,
            codedEffectType: def.codedEffectType,
            codedKey: def.codedKey,
          })
          : "sparkles";
        iconWrap.append(icons.createIcon(name, { size: 16 }));
      }
      row.append(iconWrap);

      const body = document.createElement("span");
      body.className = "anim-editor-row-body";
      const nm = document.createElement("span");
      nm.className = "anim-editor-row-name";
      nm.textContent = def.name;
      body.append(nm);
      const sub = document.createElement("span");
      sub.className = "anim-editor-row-sub";
      sub.textContent = def.assetType ? String(def.assetType).toUpperCase() : "";
      body.append(sub);
      row.append(body);

      const dot = document.createElement("span");
      dot.className = "anim-editor-row-loop";
      dot.title = def.loopUntilStopped ? "Loops until stopped" : "Plays once";
      dot.setAttribute("aria-hidden", "true");
      row.append(dot);

      row.addEventListener("click", (e) => {
        // Phase 46 iter6: a drag-end fires click on some browsers — skip
        // selection if we just dropped (drag flag was set during dragstart
        // and cleared on dragend).
        if (row.dataset.justDropped === "1") {
          delete row.dataset.justDropped;
          return;
        }
        state.selectedIds[state.scope] = def.id;
        renderList();
        // The click handler used to only refresh
        // the list + notify listeners. The pane subscribes via
        // render() at init, not notifySelection, so the pane didn't
        // rebuild when the user picked another animation. Call
        // renderPane() / renderPreview() directly so both follow the
        // selection.
        renderPane();
        renderPreview();
        notifySelection();
      });

      // Phase 46 iter6: drag-and-drop reorder handlers per row.
      row.addEventListener("dragstart", (e) => {
        row.classList.add("is-dragging");
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          // Required for Firefox to fire drag events.
          try { e.dataTransfer.setData("text/plain", def.id); } catch {}
        }
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("is-dragging");
        row.dataset.justDropped = "1";
        // Clean any stray drop indicators.
        for (const r of list.querySelectorAll(".anim-editor-row")) {
          r.classList.remove("is-drop-before", "is-drop-after");
        }
      });
      row.addEventListener("dragover", (e) => {
        const dragging = list.querySelector(".anim-editor-row.is-dragging");
        if (!dragging || dragging === row) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        const rect = row.getBoundingClientRect();
        const isAfter = (e.clientY - rect.top) > rect.height / 2;
        row.classList.toggle("is-drop-after", isAfter);
        row.classList.toggle("is-drop-before", !isAfter);
      });
      row.addEventListener("dragleave", () => {
        row.classList.remove("is-drop-before", "is-drop-after");
      });
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        const dragging = list.querySelector(".anim-editor-row.is-dragging");
        const fromId = dragging?.dataset.animationId;
        const toId = row.dataset.animationId;
        const isAfter = row.classList.contains("is-drop-after");
        row.classList.remove("is-drop-before", "is-drop-after");
        if (fromId && toId) {
          reorderAnimations(state.scope, fromId, toId, isAfter ? "after" : "before");
        }
      });

      list.append(row);
    }
    notifySelection();
  }

  window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIBRARY_LIST = {
    init,
    collectAnimations,
    render,
    renderScopeTabs,
    renderList,
    reorderAnimations,
  };
})();
