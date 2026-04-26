// lifecycle-state sub-module — owns the Live Editor's
// per-session state (the currently-edited animation id, the pre-edit
// snapshot for Discard, and the dirty flag) plus the two helpers that
// mutate it (markLiveEditorDirty + applyLiveEditorValue). Other
// lifecycle sub-modules (live-editor, running-list) read/write this
// state via the getLiveEditor* / setLiveEditor* / clearLiveEditorDirty
// surface so the state has a single owner.
(() => {
  let ctx = null;
  let liveEditorAnimationId = null;
  let liveEditorSnapshot = null;
  let liveEditorDirty = false;
  // W3.4-C3a addition (same shape as W3.2-C5's
  // addHandlesVisibleListener fanout): the lifecycle shim subscribes
  // to setLiveEditorAnimationId so its IIFE-local mirror stays in sync
  // with writes coming from the live-editor sub-module. Without this
  // bridge, the shim's renderRunningAnimationsList (still in shim
  // until W3.4-C4a) would read a stale `null` and the
  // auto-close-when-deleted check would silently no-op.
  const _animIdListeners = new Set();

  function init(dependencies) {
    ctx = dependencies?.ctx ?? dependencies;
  }

  function getLiveEditorAnimationId() {
    return liveEditorAnimationId;
  }

  function setLiveEditorAnimationId(value) {
    liveEditorAnimationId = value;
    for (const cb of _animIdListeners) {
      try { cb(value); } catch { /* listener errors must not break the editor */ }
    }
  }

  function addLiveEditorAnimationIdListener(cb) {
    if (typeof cb === "function") _animIdListeners.add(cb);
  }

  function getLiveEditorSnapshot() {
    return liveEditorSnapshot;
  }

  function setLiveEditorSnapshot(value) {
    liveEditorSnapshot = value;
  }

  function isLiveEditorDirty() {
    return liveEditorDirty;
  }

  function clearLiveEditorDirty() {
    liveEditorDirty = false;
  }

  function markLiveEditorDirty() {
    if (liveEditorDirty) return;
    liveEditorDirty = true;
    if (ctx.liveEditorPanel) {
      ctx.liveEditorPanel.classList.add("has-unsaved");
    }
    if (ctx.liveEditorClose) {
      ctx.liveEditorClose.textContent = "Done (save)";
    }
  }

  function applyLiveEditorValue(field, value) {
    const { state } = ctx;
    if (liveEditorAnimationId === null) {
      return;
    }
    const animation = state.runningAnimations.find((item) => item?.id === liveEditorAnimationId);
    if (animation) {
      animation[field] = value;
      // For cluster-scope edits, propagate the field to every
      // linked room-scoped child. Without this, the draw loop reads
      // memberAnimation[field] on each child (which never changes after
      // spawn) and the Live Editor slider appears inert — most obvious
      // with solid-color intensity/opacity in an "all rooms" cluster.
      if (animation.scope === "cluster") {
        for (const entry of state.runningAnimations) {
          if (entry?.parentClusterRunId === animation.id && entry?.scope === "room") {
            entry[field] = value;
          }
        }
      }
      markLiveEditorDirty();
    }
  }

  window.TT_BEAMER_RUNTIME_LIFECYCLE_STATE = {
    init,
    getLiveEditorAnimationId,
    setLiveEditorAnimationId,
    addLiveEditorAnimationIdListener,
    getLiveEditorSnapshot,
    setLiveEditorSnapshot,
    isLiveEditorDirty,
    markLiveEditorDirty,
    clearLiveEditorDirty,
    applyLiveEditorValue,
  };
})();
