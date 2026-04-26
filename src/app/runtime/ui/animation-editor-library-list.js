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

      row.addEventListener("click", () => {
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
  };
})();
