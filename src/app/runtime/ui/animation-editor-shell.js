// Animation editor shell — owns the editor's visibility, scope/search/
// selection state, board picker, dirty bar, and Back/Apply/Discard
// flows. Sub-modules (library-list, edit-pane, live-preview) read shell
// state via the shared `state` object reference (passed at init time)
// and via the `getState` / `getEditorBoardId` getters exposed on the
// shell namespace.
//
// Phase 24 W3.3-C1: extracted from animation-editor-view.js. Body of
// every function preserved byte-identical with the following bridge
// adjustments (W3.2-style closures-over-IIFE-state pattern):
//   - render / renderList / createAnimation / clearPaneCache /
//     stopCodedPreview are injected at init time via deps. Local `let`
//     declarations inside this IIFE shadow the originals so call sites
//     in bindDom / open / close stay byte-identical (e.g. `render()`,
//     `renderList()`, `createAnimation(state.scope)`).
//   - The two `currentPaneKey = null;` mutations in bindDom (original
//     lines 74, 125) become `clearPaneCache();` calls — `currentPaneKey`
//     itself was moved to the edit-pane sub-module along with the
//     functions that own its read/write lifecycle (renderPane,
//     buildSelectRow, createAnimation, deleteAnimation). Documented as a
//     W3.3-C1 deviation in INVENTORY.md (closure-over-IIFE-state
//     bridge — same shape as W3.2-C1's handlesVisible setter).
(() => {
  let ctx = null;
  const state = {
    scope: "room",
    search: "",
    selectedIds: { inside: null, outside: null, room: null },
    open: false,
    // Editor-scoped board id. null = "use whatever board the
    // dashboard currently targets". Populated when the user picks a
    // different board from the editor's own board dropdown; reset back
    // to null on every open() so the editor re-inherits the dashboard
    // selection each session.
    editorBoardId: null,
  };

  function getEditorBoardId() {
    return state.editorBoardId ?? ctx?.state?.boardId ?? null;
  }
  const listeners = new Set();

  // Cross-sub-module callbacks (wired at init time by the shim). Local
  // shadow declarations preserve byte-identical bodies in bindDom /
  // open / close / handleBack — the call sites read these as bare
  // identifiers, same as before the split.
  let render = null;
  let renderList = null;
  let createAnimation = null;
  let clearPaneCache = null;
  let stopCodedPreview = null;

  function getState() {
    return state;
  }
  function setEditorBoardId(id) {
    state.editorBoardId = id;
  }
  // Allow the shim to seed the bridge functions before init() runs its
  // body (in particular, `render()` is called from inside init).
  function setRender(fn) { render = fn; }
  function setRenderList(fn) { renderList = fn; }
  function setCreateAnimation(fn) { createAnimation = fn; }
  function setClearPaneCache(fn) { clearPaneCache = fn; }
  function setStopCodedPreview(fn) { stopCodedPreview = fn; }
  // Mark dirty: convenience wrapper used by sub-modules that mutate
  // profile data — keeps the dirty-bar plumbing in shell.
  function markDirty() {
    if (ctx?.state) {
      ctx.state.localConfigDirty = true;
    }
  }

  function init(dependencies) {
    ctx = dependencies;
    if (typeof dependencies.render === "function") render = dependencies.render;
    if (typeof dependencies.renderList === "function") renderList = dependencies.renderList;
    if (typeof dependencies.createAnimation === "function") createAnimation = dependencies.createAnimation;
    if (typeof dependencies.clearPaneCache === "function") clearPaneCache = dependencies.clearPaneCache;
    if (typeof dependencies.stopCodedPreview === "function") stopCodedPreview = dependencies.stopCodedPreview;
    bindDom();
    render();
  }

  function bindDom() {
    const back = ctx.animEditorBackButton;
    if (back && !back._ttBeamerBound) {
      back.addEventListener("click", handleBack);
      back._ttBeamerBound = true;
    }
    if (ctx.animEditorApplyButton && !ctx.animEditorApplyButton._ttBeamerBound) {
      ctx.animEditorApplyButton.addEventListener("click", () => {
        if (typeof ctx.applyLocalConfigToServer === "function") {
          Promise.resolve(ctx.applyLocalConfigToServer()).then(() => {
            syncDirtyBar();
          });
        }
      });
      ctx.animEditorApplyButton._ttBeamerBound = true;
    }
    if (ctx.animEditorDiscardButton && !ctx.animEditorDiscardButton._ttBeamerBound) {
      ctx.animEditorDiscardButton.addEventListener("click", () => {
        if (typeof ctx.discardLocalConfigAndReloadFromServer === "function") {
          ctx.discardLocalConfigAndReloadFromServer();
          // Wait a tick for the reload to flush through, then
          // re-render + refresh the dirty bar.
          setTimeout(() => {
            clearPaneCache();
            render();
          }, 50);
        }
      });
      ctx.animEditorDiscardButton._ttBeamerBound = true;
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
    // + button creates a new animation in the
    // currently-selected scope.
    if (ctx.animEditorAddButton && !ctx.animEditorAddButton._ttBeamerBound) {
      ctx.animEditorAddButton.addEventListener("click", () => {
        createAnimation(state.scope);
      });
      ctx.animEditorAddButton._ttBeamerBound = true;
    }
    // "Copy from another board" — bulk-imports every animation
    // definition (room + inside + outside scopes) from a chosen
    // source board into the current editor board. Animations whose
    // name already exists on the target are skipped, so this is
    // safe to run repeatedly. Designed as the starting point for a
    // freshly-imported board.
    if (ctx.animEditorCopyFromBoardButton && !ctx.animEditorCopyFromBoardButton._ttBeamerBound) {
      ctx.animEditorCopyFromBoardButton.addEventListener("click", () => {
        handleCopyAnimationsFromBoard();
      });
      ctx.animEditorCopyFromBoardButton._ttBeamerBound = true;
    }
    // Editor-scoped board picker. Change fires a re-render
    // targeting the new board id — does NOT call switchBoard(), so the
    // dashboard stage is untouched.
    if (ctx.animEditorBoardSelect && !ctx.animEditorBoardSelect._ttBeamerBound) {
      ctx.animEditorBoardSelect.addEventListener("change", () => {
        const next = String(ctx.animEditorBoardSelect.value || "").trim();
        state.editorBoardId = next || null;
        // Selection ids are per-board: wipe them when hopping boards so
        // the library default-selects the first animation of the new
        // board rather than sticking on an id that doesn't exist there.
        state.selectedIds = { inside: null, outside: null, room: null };
        clearPaneCache();
        render();
      });
      ctx.animEditorBoardSelect._ttBeamerBound = true;
    }
  }

  // Copy every animation definition (room + inside + outside) from
  // a source board into the current editor board. Animations whose
  // `name` already exists on the target (case-insensitive, trimmed)
  // are skipped. Each copy gets a fresh id so the source and target
  // entries can co-exist independently.
  async function handleCopyAnimationsFromBoard() {
    const targetId = getEditorBoardId();
    if (!targetId) return;
    const getBoards = typeof ctx.getBoards === "function" ? ctx.getBoards : null;
    const boards = Array.isArray(getBoards?.()) ? getBoards() : [];
    const candidates = boards.filter((b) => b?.id && b.id !== targetId);
    const modal = window.TT_BEAMER_RUNTIME_MODAL;
    if (candidates.length === 0) {
      if (modal?.showConfirm) {
        await modal.showConfirm({
          title: "Copy animations",
          body: "There is only one board configured. Add another board first to copy animations between them.",
          confirmLabel: "OK",
          cancelLabel: "",
        });
      } else if (ctx.triggerFeedback) {
        ctx.triggerFeedback.textContent = "Status: no other board to copy from";
      }
      return;
    }
    if (!modal?.showSelect) return;
    const targetBoard = boards.find((b) => b?.id === targetId);
    const targetLabel = targetBoard?.label || targetBoard?.name || targetId;
    const options = candidates.map((b) => ({
      value: b.id,
      label: b.label || b.name || b.metadata?.name || b.id,
    }));
    const sourceId = await modal.showSelect({
      title: "Copy animations from board",
      body: `Copy every animation definition (Room, Inside, Outside) into "${targetLabel}". Animations with a name that already exists are skipped.`,
      options,
      initialValue: options[0]?.value,
      confirmLabel: "Copy",
    });
    if (!sourceId) return;
    const result = copyAnimationsFromBoard(sourceId, targetId);
    if (typeof ctx.persistBoardProfiles === "function") ctx.persistBoardProfiles();
    if (typeof ctx.refreshGlobalButtons === "function") ctx.refreshGlobalButtons();
    clearPaneCache();
    render();
    if (ctx.triggerFeedback) {
      const total = result.copied;
      const skipped = result.skipped;
      ctx.triggerFeedback.textContent = total === 0
        ? `Status: nothing to copy (all ${skipped} animation${skipped === 1 ? "" : "s"} already exist by name)`
        : `Status: copied ${total} animation${total === 1 ? "" : "s"}${skipped > 0 ? `, skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}` : ""}`;
    }
  }

  function copyAnimationsFromBoard(sourceId, targetId) {
    const scopes = [
      { key: "room",    get: ctx.getRoomFxProfile,    set: ctx.setRoomFxProfile,    prefix: "room" },
      { key: "inside",  get: ctx.getInsideFxProfile,  set: ctx.setInsideFxProfile,  prefix: "inside" },
      { key: "outside", get: ctx.getOutsideFxProfile, set: ctx.setOutsideFxProfile, prefix: "outside" },
    ];
    let copied = 0;
    let skipped = 0;
    for (const scope of scopes) {
      if (typeof scope.get !== "function" || typeof scope.set !== "function") continue;
      const sourceProfile = scope.get(sourceId);
      const targetProfile = scope.get(targetId);
      const sourceAnims = Array.isArray(sourceProfile?.animations) ? sourceProfile.animations : [];
      const existing = Array.isArray(targetProfile?.animations) ? targetProfile.animations : [];
      const existingNames = new Set(existing.map((a) => String(a?.name || "").trim().toLowerCase()).filter(Boolean));
      const existingIds = new Set(existing.map((a) => String(a?.id || "").trim()).filter(Boolean));
      const additions = [];
      for (const def of sourceAnims) {
        const name = String(def?.name || "").trim();
        const key = name.toLowerCase();
        if (!key || existingNames.has(key)) {
          skipped += 1;
          continue;
        }
        // Mint a fresh id so source and target entries are independent.
        let newId;
        let n = 0;
        do {
          newId = `${scope.prefix}-${Date.now().toString(36)}-${additions.length + n + 1}`;
          n += 1;
        } while (existingIds.has(newId));
        existingIds.add(newId);
        existingNames.add(key);
        // Deep clone so future edits on either side don't mutate the
        // other. JSON round-trip is fine here — animation defs hold
        // only plain data.
        const cloned = JSON.parse(JSON.stringify(def));
        cloned.id = newId;
        additions.push(cloned);
        copied += 1;
      }
      if (additions.length > 0) {
        scope.set(targetId, {
          ...(targetProfile && typeof targetProfile === "object" ? targetProfile : {}),
          animations: [...existing, ...additions],
        });
      }
    }
    return { copied, skipped };
  }

  function populateBoardSelect() {
    const select = ctx?.animEditorBoardSelect;
    if (!select) return;
    const getBoards = typeof ctx.getBoards === "function" ? ctx.getBoards : null;
    const boards = Array.isArray(getBoards?.()) ? getBoards() : [];
    const activeId = getEditorBoardId();
    select.replaceChildren();
    for (const board of boards) {
      if (!board?.id) continue;
      const opt = document.createElement("option");
      opt.value = board.id;
      opt.textContent = board.label || board.name || board.metadata?.name || board.id;
      select.append(opt);
    }
    if (activeId && boards.some((b) => b?.id === activeId)) {
      select.value = activeId;
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
    // Every open() re-inherits the dashboard's board id. The
    // editor's board picker is a session-scoped override, not a sticky
    // preference — reopening the editor always starts from the active
    // dashboard selection.
    state.editorBoardId = null;
    if (ctx.animEditorPage) {
      ctx.animEditorPage.hidden = false;
    }
    document.body.setAttribute("data-animation-editor-open", "true");
    populateBoardSelect();
    render();
    if (ctx.animEditorSearchInput) {
      // Drop focus into the search box; it's the primary affordance.
      try { ctx.animEditorSearchInput.focus(); } catch {}
    }
  }

  function close() {
    state.open = false;
    // Make sure the coded-preview rAF loop
    // stops when the editor closes, even if the canvas isn't
    // immediately garbage-collected.
    stopCodedPreview();
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

  // Back is fully blocked while there are
  // unsaved edits. A click in the dirty state now flashes the dirty
  // bar so the user understands *why* Back is inert and what they
  // need to do next (Apply or Discard).
  function handleBack() {
    if (ctx.state?.localConfigDirty) {
      flashDirtyBar();
      return;
    }
    close();
  }

  function flashDirtyBar() {
    const bar = ctx.animEditorDirtyBar;
    if (!bar) return;
    bar.classList.remove("anim-editor-dirty-bar--flash");
    // Force reflow so removing + re-adding the class triggers a new
    // animation cycle when the user spams Back.
    void bar.offsetWidth;
    bar.classList.add("anim-editor-dirty-bar--flash");
    window.setTimeout(() => {
      bar.classList.remove("anim-editor-dirty-bar--flash");
    }, 900);
  }

  function syncDirtyBar() {
    const bar = ctx.animEditorDirtyBar;
    const dirty = Boolean(ctx.state?.localConfigDirty);
    if (bar) bar.hidden = !dirty;
    if (ctx.animEditorBackButton) {
      ctx.animEditorBackButton.classList.toggle("anim-editor-back--dirty", dirty);
      ctx.animEditorBackButton.disabled = dirty;
      ctx.animEditorBackButton.setAttribute("aria-disabled", dirty ? "true" : "false");
    }
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

  window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_SHELL = {
    init,
    getState,
    getEditorBoardId,
    setEditorBoardId,
    open,
    close,
    isOpen,
    getSelection,
    onSelectionChange,
    flashDirtyBar,
    syncDirtyBar,
    markDirty,
    notifySelection,
    populateBoardSelect,
    bindDom,
    handleBack,
    setRender,
    setRenderList,
    setCreateAnimation,
    setClearPaneCache,
    setStopCodedPreview,
  };
})();
