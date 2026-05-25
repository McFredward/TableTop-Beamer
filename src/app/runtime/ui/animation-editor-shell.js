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

  // Phase 50 (2026-05-22): track the previous dirty-flag value so
  // syncDirtyBar() only blurs the focused input on the false→true
  // transition (when the bar first appears), not on every subsequent
  // call. Without this gating, every keystroke in the animation Name
  // field — which marks dirty + fires syncDirtyBar — would blur the
  // input and dismiss the mobile soft keyboard.
  let _lastDirtyState = false;

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

  // Phase 49 gap-closure-24 (2026-05-19): blur whatever input currently
  // has focus + the soft keyboard. Wired to pointerdown on the Apply /
  // Discard buttons so the FIRST tap on a button doesn't get eaten by
  // the browser's "first tap dismisses keyboard" behavior on mobile.
  function _blurFocusedInput() {
    try {
      const el = document.activeElement;
      if (el && typeof el.blur === "function" && el !== document.body) {
        el.blur();
      }
    } catch {
      // ignore — defensive only
    }
  }

  // Phase 49 gap-closure-25 (2026-05-19): true touch-device detection.
  // `(hover: none) and (pointer: coarse)` is the CSS Media Queries Level 4
  // compound query that uniquely identifies finger-driven touchscreens
  // (Android, iOS) and excludes hybrid laptops / tablets-with-trackpad
  // where the soft keyboard is not a concern. Used to gate the open()
  // auto-focus so phones never get the search input pre-focused (which
  // raises the Android soft keyboard and triggers the dirty-bar
  // double-tap pathology — see _isTouchOnly comments below).
  function _isTouchOnly() {
    try {
      return typeof window.matchMedia === "function"
        && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    } catch {
      return false;
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
    // Phase 49 gap-closure-24 (2026-05-19): on mobile the Apply/Discard
    // buttons required a double-tap when the dirty bar was visible. The
    // editor's `open()` auto-focuses the search input (line ~323), which
    // brings up the soft keyboard on touch devices. On a focused-input +
    // keyboard-up state, the first tap on a button dismisses the
    // keyboard, the second tap fires the click. Blurring the focused
    // element on pointerdown of the Apply/Discard buttons ensures the
    // synthetic click fires on the FIRST tap.
    if (ctx.animEditorApplyButton && !ctx.animEditorApplyButton._ttBeamerBound) {
      ctx.animEditorApplyButton.addEventListener("pointerdown", _blurFocusedInput);
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
      ctx.animEditorDiscardButton.addEventListener("pointerdown", _blurFocusedInput);
      ctx.animEditorDiscardButton.addEventListener("click", () => {
        if (typeof ctx.discardLocalConfigAndReloadFromServer === "function") {
          // Phase 49 gap-closure-28 (2026-05-19): wait for the async
          // discard to RESOLVE before re-rendering. The previous
          // implementation used `setTimeout(50, render)` which fired
          // BEFORE the /api/global-defaults fetch completed on real
          // devices — render() calls syncDirtyBar() which reads
          // state.localConfigDirty, and that flag was still TRUE at
          // +50ms because the fetch was still in flight. Once the
          // fetch eventually resolved, clearLocalConfigDirty() flipped
          // the flag to false but NOTHING called syncDirtyBar() again,
          // leaving the dirty bar visible on screen even though the
          // local state was clean. The user perceived "first tap did
          // nothing" and tapped again. On the second tap, the fetch is
          // a no-op (already clean) and render() at +50ms finally sees
          // dirty=false → bar hides → looks like "second tap worked".
          // Switching to .then(render) mirrors Apply's pattern and
          // guarantees the bar-visibility sync happens AFTER the dirty
          // flag has been cleared. Empirically reproduced in Playwright
          // with a 300 ms artificial network delay: timeline showed
          // bar_hidden=False persisting from tap dispatch until end of
          // poll window. Verification after fix below. */
          Promise.resolve(ctx.discardLocalConfigAndReloadFromServer())
            .then(() => {
              clearPaneCache();
              render();
            })
            .catch(() => {
              // Even on failure, re-render so the UI reflects whatever
              // state actually ended up in `state`. clearLocalConfigDirty
              // is not called on failure, so the bar will correctly stay
              // visible — but we still want the rest of the editor in
              // sync with current state.
              clearPaneCache();
              render();
            });
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
    if (ctx.animEditorSearchInput && !_isTouchOnly()) {
      // Drop focus into the search box; it's the primary affordance on
      // desktop. SKIP on touch-only devices (phones / Android Chrome):
      // auto-focusing a text input raises the soft keyboard, which
      // remains up throughout the session (the long-press-drag reorder
      // never blurs it). When the dirty bar then appears and the user
      // taps Apply/Discard, Android Chrome routes the first touchend to
      // its "tap outside focused input → dismiss keyboard" pathway —
      // the visualViewport resize between touchstart and touchend
      // causes click synthesis to be cancelled, eating the first tap.
      // Operator UAT (Phase 49 gap-closure-25, 2026-05-19): "muss man
      // immer wenn die dirty flag gesetzt wurde und man einen der
      // Buttons 'Discord' oder 'Save' am Handy drücken will zwei mal
      // drauf tippen, damit es reagiert". gap-closure-24's
      // pointerdown.blur() did not fix this — by the time pointerdown
      // executes the touchstart has already entered the keyboard-
      // dismiss pipeline. The robust fix is to never raise the
      // keyboard in the first place on touch devices.
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
    // Phase 50 (2026-05-22): blur input ONLY on the false→true transition.
    // gap-closure-25 (Phase 49) blurred on every syncDirtyBar() call where
    // dirty was true — but syncDirtyBar fires after EVERY mutation
    // (patchAnimation runs it on every keystroke in the Name field), so
    // typing one letter dirtied the flag, fired syncDirtyBar, blurred the
    // input, dismissed the soft keyboard. Operator UAT (2026-05-22): "nach
    // jedem Tastendruck im Namenfeld einer Animation endet die Eingabe
    // sofort". The original gap-closure-25 intent was only to dismiss the
    // keyboard the moment the bar APPEARS (so the operator's next tap on
    // Apply/Discard isn't eaten by the keyboard-dismiss pipeline). Once
    // the bar is already visible and the user is editing, we must NOT
    // touch focus.
    //
    // Phase 50 (2026-05-25): even the false→true transition still blurred
    // the Name-input on the first keystroke — because TYPING is what flips
    // the dirty bit, the activeElement at that moment IS the input the
    // operator is typing in. Operator UAT (2026-05-25): "wenn die dirty
    // flag kommt (zB weil ich den Namen ändere), kann ich den namen nicht
    // mehr weiter reinschreiben, sondern ich muss explizit noch einmal
    // reindrücken … das man den namen weiter eintippen kann, ohne explizit
    // noch einmal reindrücken zu müssen". Fix: skip the blur entirely
    // when the focused element is a text-entry input/textarea — those
    // ARE the elements where the soft keyboard lives, AND they're the
    // only ones where active typing is plausible. The keyboard-dismiss-
    // before-Apply intent only mattered for the case "user finished
    // typing → moved to Apply" — and by then the user has already tapped
    // outside the input themselves (normal browser dismisses on outside
    // tap). Other focus targets (SELECT, BUTTON) don't summon keyboards.
    if (dirty && !_lastDirtyState) {
      const focused = document.activeElement;
      const tag = focused?.tagName;
      const isTextEntry = tag === "TEXTAREA"
        || (tag === "INPUT"
            && /^(text|search|email|tel|url|password|number)$/i.test(focused.type || "text"));
      if (focused
          && focused !== document.body
          && !isTextEntry
          && (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
          && typeof focused.blur === "function") {
        try { focused.blur(); } catch {}
      }
    }
    _lastDirtyState = dirty;
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
