// Phase 22 W3b — full-page animation editor controller.
//
// Owns visibility + library/search/scope state. The middle editor
// pane and the preview column are populated by follow-up sub-commits
// (W3b-2 / W3b-4); this scaffold lives on its own so the entry/exit
// flow and the library interactions can land first, exercised end-to-
// end, and iterated on.
//
// State shape (kept module-local, not in ctx.state):
//   scope:        "inside" | "outside" | "room"
//   search:       string
//   selectedIds:  { inside, outside, room } — id per scope so
//                 switching tabs remembers the last selection.
//
// Public API (set on window.TT_BEAMER_ANIMATION_EDITOR_VIEW):
//   init(ctx)
//   open(scope?)    — open with an optional scope; defaults to last
//   close()         — close and return to Settings → Board subtab
//   isOpen()        — boolean
//   getSelection()  — { scope, id }  (future W3b-2 uses this)
//   onSelectionChange(handler)
//                   — register a listener (future W3b-2)
//   render()        — re-render library + pane (external callers
//                     can re-render after a profile change)
(() => {
  let ctx = null;
  const state = {
    scope: "inside",
    search: "",
    selectedIds: { inside: null, outside: null, room: null },
    open: false,
  };
  const listeners = new Set();

  function init(dependencies) {
    ctx = dependencies;
    bindDom();
    render();
  }

  function bindDom() {
    const back = ctx.animEditorBackButton;
    if (back && !back._ttBeamerBound) {
      back.addEventListener("click", close);
      back._ttBeamerBound = true;
    }
    if (ctx.animEditorSearchInput && !ctx.animEditorSearchInput._ttBeamerBound) {
      ctx.animEditorSearchInput.addEventListener("input", () => {
        state.search = String(ctx.animEditorSearchInput.value || "").trim().toLowerCase();
        renderList();
      });
      ctx.animEditorSearchInput._ttBeamerBound = true;
    }
    if (ctx.animEditorScopeTabs && !ctx.animEditorScopeTabs._ttBeamerBound) {
      for (const btn of ctx.animEditorScopeTabs.querySelectorAll("button[data-anim-scope]")) {
        btn.addEventListener("click", () => {
          const nextScope = btn.dataset.animScope;
          if (nextScope && nextScope !== state.scope) {
            state.scope = nextScope;
            if (ctx.animEditorSearchInput) {
              // Search is scope-local; clearing on switch keeps the
              // list predictable when hopping between scopes.
              ctx.animEditorSearchInput.value = "";
              state.search = "";
            }
            render();
          }
        });
      }
      ctx.animEditorScopeTabs._ttBeamerBound = true;
    }
    // W3b-4 will wire the add button; for now render a short-circuit.
    if (ctx.animEditorAddButton && !ctx.animEditorAddButton._ttBeamerBound) {
      ctx.animEditorAddButton.addEventListener("click", () => {
        if (ctx.triggerFeedback) {
          ctx.triggerFeedback.textContent =
            "Status: Add coming in the next sub-commit — use Dashboard → Settings’ legacy Create flow until then";
        }
      });
      ctx.animEditorAddButton._ttBeamerBound = true;
    }
  }

  function isOpen() {
    return Boolean(state.open);
  }

  function open(scope) {
    state.open = true;
    if (scope && (scope === "inside" || scope === "outside" || scope === "room")) {
      state.scope = scope;
    }
    if (ctx.animEditorPage) {
      ctx.animEditorPage.hidden = false;
    }
    document.body.setAttribute("data-animation-editor-open", "true");
    render();
    if (ctx.animEditorSearchInput) {
      // Drop focus into the search box; it's the primary affordance.
      try { ctx.animEditorSearchInput.focus(); } catch {}
    }
  }

  function close() {
    state.open = false;
    if (ctx.animEditorPage) {
      ctx.animEditorPage.hidden = true;
    }
    document.body.removeAttribute("data-animation-editor-open");
    // Return to Settings → Board subtab so the user lands somewhere
    // meaningful (Animations subtab would just re-open the editor).
    if (typeof ctx.setSettingsSubtab === "function") {
      ctx.setSettingsSubtab("board");
    }
  }

  function collectAnimations(scope) {
    const boardId = ctx.state?.boardId;
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
      const loopText = def.loopUntilStopped ? "Loop" : "One-shot";
      const assetText = def.assetType
        ? String(def.assetType).toUpperCase()
        : "";
      sub.textContent = assetText ? `${loopText} · ${assetText}` : loopText;
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
        notifySelection();
      });
      list.append(row);
    }
    notifySelection();
  }

  function getSelection() {
    return {
      scope: state.scope,
      id: state.selectedIds[state.scope],
    };
  }

  function onSelectionChange(handler) {
    if (typeof handler === "function") listeners.add(handler);
    return () => listeners.delete(handler);
  }

  function notifySelection() {
    const sel = getSelection();
    for (const handler of listeners) {
      try { handler(sel); } catch (err) { console.error(err); }
    }
  }

  window.TT_BEAMER_ANIMATION_EDITOR_VIEW = {
    init,
    open,
    close,
    isOpen,
    getSelection,
    onSelectionChange,
    render,
  };
})();
