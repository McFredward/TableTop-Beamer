// animation-lifecycle re-export shell.
//
// W3.4 (Phase 24 Wave 3) decomposed the original 1369-line module
// into 5 sub-modules + this shell:
//   - runtime-lifecycle-state.js (W3.4-C1) — Live Editor state +
//     markLiveEditorDirty + applyLiveEditorValue.
//   - runtime-lifecycle-stop-pipeline.js (W3.4-C2) — stop pipeline
//     (collectAnimationStopIds, pendingStop* helpers,
//     buildStopCommandTargetMeta, emitStopAnimationCommand,
//     stopAnimation).
//   - runtime-lifecycle-live-editor.js (W3.4-C3a/C3b) — Live Editor
//     panel (openLiveEditor + helpers, editAnimation, discardLiveEditor,
//     closeLiveEditor) + slider/close/discard listener wiring.
//   - runtime-lifecycle-running-list.js (W3.4-C4a/C4b) — running
//     animations dashboard list (renderRunningAnimationsList + per-row
//     helpers, isRunningListInteractionActive, validateRunningListParity,
//     refreshGlobalButtons).
//   - runtime-lifecycle-cluster-pads.js (W3.4-C5) — cluster pad rail
//     + rAF rail-tracker registration + dispatch (updateClusterPadsRect,
//     renderClusterPads, dispatchClusterByTapAction,
//     dispatchClusterToggle, dispatchClusterClear).
//
// This shell owns: the IIFE wrapper, the dep-injecting `init` that
// fans out to each sub-module's init in dependency order, and the
// public namespace assembly. The 16-key
// window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE namespace is preserved
// byte-for-byte against the pre-W3.4 baseline so external destructures
// (orchestration:2237 closeLiveEditor) keep working.
(() => {
  // Sub-module namespace refs. Captured at IIFE-top (defer-script
  // ordering ensures sub-module IIFEs have run before this one).
  const lifecycleState = window.TT_BEAMER_RUNTIME_LIFECYCLE_STATE;
  const stopPipeline = window.TT_BEAMER_RUNTIME_LIFECYCLE_STOP_PIPELINE;
  const liveEditor = window.TT_BEAMER_RUNTIME_LIFECYCLE_LIVE_EDITOR;
  const runningList = window.TT_BEAMER_RUNTIME_LIFECYCLE_RUNNING_LIST;
  const clusterPads = window.TT_BEAMER_RUNTIME_LIFECYCLE_CLUSTER_PADS;

  function init(dependencies) {
    // 1. lifecycle-state owns the editor state vars + markLiveEditorDirty
    //    + applyLiveEditorValue. Must init first so other sub-modules
    //    can reach its setters during their own init.
    lifecycleState.init({ ctx: dependencies });

    // 2. stop-pipeline. renderRunningAnimationsList + refreshGlobalButtons
    //    live in running-list — passed through as ctx-arrow callbacks
    //    so stopAnimation's body can call them by bare name byte-
    //    identically. Arrows are necessary because runningList isn't
    //    init'd yet at this point in the timeline (runningList's
    //    callbacks resolve at call time, after running-list.init runs
    //    later in this function).
    stopPipeline.init({
      ctx: dependencies,
      renderRunningAnimationsList: () => runningList.renderRunningAnimationsList(),
      refreshGlobalButtons: () => runningList.refreshGlobalButtons(),
    });

    // 3. live-editor. Slider/close/discard listener wiring + the
    //    Live Editor panel's open/close/discard/edit functions.
    liveEditor.init({ ctx: dependencies, lifecycleState });

    // 4. cluster-pads. The rAF rail-tracker registration lives here —
    //    its init MUST run before runningList.init (which captures
    //    clusterPads.renderClusterPads) and the kernel comment lives
    //    with the cluster-pads code (Wave 2 INVENTORY C5.6
    //    preservation).
    clusterPads.init({
      ctx: dependencies,
      stopAnimation: stopPipeline.stopAnimation,
    });

    // 5. running-list. Cross-callbacks (closeLiveEditor /
    //    openLiveEditor / stopAnimation / collectAnimationStopIds /
    //    isStopPendingForAnimationId / renderClusterPads) injected via
    //    init-deps so the bare-name calls inside
    //    renderRunningAnimationsList + _buildRunningRow remain
    //    byte-identical.
    runningList.init({
      ctx: dependencies,
      lifecycleState,
      closeLiveEditor: liveEditor.closeLiveEditor,
      openLiveEditor: liveEditor.openLiveEditor,
      stopAnimation: stopPipeline.stopAnimation,
      collectAnimationStopIds: stopPipeline.collectAnimationStopIds,
      isStopPendingForAnimationId: stopPipeline.isStopPendingForAnimationId,
      renderClusterPads: clusterPads.renderClusterPads,
    });
  }

  // Public namespace — 16 keys, byte-for-byte identical to the
  // pre-W3.4 baseline. External callers (notably
  // runtime-orchestration.js:2122 init + :2237 closeLiveEditor
  // destructure) see the same surface area.
  window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE = {
    init,
    collectAnimationStopIds: stopPipeline.collectAnimationStopIds,
    isStopPendingForAnimationId: stopPipeline.isStopPendingForAnimationId,
    markStopPending: stopPipeline.markStopPending,
    clearStopPending: stopPipeline.clearStopPending,
    reconcileStopPendingFromSnapshot: stopPipeline.reconcileStopPendingFromSnapshot,
    buildStopCommandTargetMeta: stopPipeline.buildStopCommandTargetMeta,
    emitStopAnimationCommand: stopPipeline.emitStopAnimationCommand,
    stopAnimation: stopPipeline.stopAnimation,
    editAnimation: liveEditor.editAnimation,
    renderRunningAnimationsList: runningList.renderRunningAnimationsList,
    isRunningListInteractionActive: runningList.isRunningListInteractionActive,
    validateRunningListParity: runningList.validateRunningListParity,
    refreshGlobalButtons: runningList.refreshGlobalButtons,
    renderClusterPads: clusterPads.renderClusterPads,
    closeLiveEditor: liveEditor.closeLiveEditor,
  };
})();
