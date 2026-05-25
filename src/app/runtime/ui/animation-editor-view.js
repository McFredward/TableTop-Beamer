// Full-page animation editor controller.
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
  // Phase 24 W3.3-C1..C4: this module is now a thin re-export shell.
  // All implementation lives in 4 sub-modules loaded earlier in
  // index.html (shell, library-list, edit-pane, live-preview). The
  // shim's only job is to (a) wire each sub-module's init in
  // dependency order with the cross-module callbacks they need, and
  // (b) aggregate the legacy `window.TT_BEAMER_ANIMATION_EDITOR_VIEW`
  // namespace from the sub-module exports so external callers
  // (orchestration's conditional guard at runtime-orchestration.js,
  // runtime-runtime-controls.js's editor.open()/.isOpen()) see the
  // same 7 keys they did before W3.3.
  const shell = window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_SHELL;
  const libraryList = window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIBRARY_LIST;
  const editPane = window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_EDIT_PANE;
  const livePreview = window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW;

  function init(deps) {
    // Live-preview is read-only against shell + edit-pane. Init it
    // first so its function references are stable bindings the other
    // sub-modules can wire up via deps. (It also has no side effects
    // beyond storing ctx, so order here vs after edit-pane doesn't
    // matter — but initializing it first keeps the wireup linear.)
    livePreview.init({
      ...deps,
      shell,
      findDefinition: editPane.findDefinition,
      scopeLabel: editPane.scopeLabel,
      deleteAnimation: editPane.deleteAnimation,
    });
    // Edit-pane needs: shell, state, library-list's render/renderList/
    // collectAnimations, live-preview's renderPreview /
    // updatePreviewDynamicBits, shell's syncDirtyBar / getEditorBoardId /
    // getSelection.
    editPane.init({
      ...deps,
      shell,
      state: shell.getState(),
      // Phase 50 (2026-05-25): shell.getState() overrides `state` with the
      // shell-local UI state (scope/search/selectedIds/...). Pass the
      // runtime state separately so patchAnimation can read state.boardId
      // and clear state.roomDraft.lastSyncedAnimationId after a def edit,
      // forcing the dashboard trigger to re-seed the draft from the new
      // def values. Operator UAT (2026-05-25): "Die Transform-Einstellungen
      // … werden nicht respektiert".
      runtimeState: deps.state,
      render: libraryList.render,
      renderList: libraryList.renderList,
      collectAnimations: libraryList.collectAnimations,
      renderPreview: livePreview.renderPreview,
      updatePreviewDynamicBits: livePreview.updatePreviewDynamicBits,
      syncDirtyBar: shell.syncDirtyBar,
      getEditorBoardId: shell.getEditorBoardId,
      getSelection: shell.getSelection,
    });
    // Library-list needs: shell, state, edit-pane's renderPane,
    // live-preview's renderPreview, shell's notifySelection /
    // syncDirtyBar / getEditorBoardId.
    libraryList.init({
      ...deps,
      shell,
      state: shell.getState(),
      renderPane: editPane.renderPane,
      renderPreview: livePreview.renderPreview,
      notifySelection: shell.notifySelection,
      syncDirtyBar: shell.syncDirtyBar,
      getEditorBoardId: shell.getEditorBoardId,
    });
    // Shell consumes: library-list's render / renderList, edit-pane's
    // createAnimation / clearPaneCache, live-preview's stopCodedPreview.
    shell.init({
      ...deps,
      render: libraryList.render,
      renderList: libraryList.renderList,
      createAnimation: editPane.createAnimation,
      clearPaneCache: editPane.clearPaneCache,
      stopCodedPreview: livePreview.stopCodedPreview,
    });
  }

  window.TT_BEAMER_ANIMATION_EDITOR_VIEW = {
    init,
    open: shell.open,
    close: shell.close,
    isOpen: shell.isOpen,
    getSelection: shell.getSelection,
    onSelectionChange: shell.onSelectionChange,
    render: libraryList.render,
  };
})();
