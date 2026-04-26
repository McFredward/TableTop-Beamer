// animation lifecycle module.
//
// Owns the animation stop/edit dispatch pipeline:
//   - collectAnimationStopIds / buildStopCommandTargetMeta
//   - stopAnimation / emitStopAnimationCommand
//   - editAnimation
//   - renderRunningAnimationsList / isRunningListInteractionActive
//   - validateRunningListParity
//   - refreshGlobalButtons
//   - liveSync pendingStopAnimationIds helpers
//
// Dependencies injected via ctx (large surface — this module touches
// the entire running-animations lifecycle from stop commands through
// list rendering).
(() => {
  let ctx = null;
  // Lifecycle-state sub-module reference (W3.4-C1).
  let lifecycleState = null;
  // Sub-module namespace refs. Captured at IIFE-top (defer-script
  // ordering ensures sub-module IIFEs have run before this one).
  const stopPipeline = window.TT_BEAMER_RUNTIME_LIFECYCLE_STOP_PIPELINE;
  const liveEditor = window.TT_BEAMER_RUNTIME_LIFECYCLE_LIVE_EDITOR;
  const runningList = window.TT_BEAMER_RUNTIME_LIFECYCLE_RUNNING_LIST;
  const clusterPads = window.TT_BEAMER_RUNTIME_LIFECYCLE_CLUSTER_PADS;

  function init(dependencies) {
    ctx = dependencies;

    // Initialize the lifecycle-state sub-module first so subsequent
    // sub-module inits can hand it through.
    lifecycleState = window.TT_BEAMER_RUNTIME_LIFECYCLE_STATE;
    lifecycleState.init({ ctx: dependencies });

    // Initialize stop-pipeline (W3.4-C2). renderRunningAnimationsList +
    // refreshGlobalButtons live in the running-list sub-module
    // (W3.4-C4a) — passed through as ctx-arrow callbacks so
    // stopAnimation's body can call them by bare name byte-identically.
    stopPipeline.init({
      ctx: dependencies,
      renderRunningAnimationsList: () => runningList.renderRunningAnimationsList(),
      refreshGlobalButtons: () => runningList.refreshGlobalButtons(),
    });

    // Initialize live-editor sub-module (W3.4-C3a). The slider/close/
    // discard listener wiring previously inlined here moves into
    // liveEditor.init.
    liveEditor.init({ ctx: dependencies, lifecycleState });

    // Initialize cluster-pads sub-module (W3.4-C5). The rAF rail-tracker
    // registration moves with this init — the position:fixed cluster
    // rail kernel travels with the cluster-pads code per Wave 2
    // INVENTORY's preservation requirement.
    clusterPads.init({
      ctx: dependencies,
      stopAnimation: stopPipeline.stopAnimation,
    });

    // Initialize running-list sub-module (W3.4-C4a). Cross-callbacks
    // (closeLiveEditor / openLiveEditor / stopAnimation /
    // collectAnimationStopIds / isStopPendingForAnimationId /
    // renderClusterPads) injected via init-deps so the bare-name calls
    // inside renderRunningAnimationsList remain byte-identical.
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

  // markLiveEditorDirty + applyLiveEditorValue + the `liveEditorDirty`
  // state moved to runtime-lifecycle-state.js (W3.4-C1).
  // renderRunningAnimationsList / isRunningListInteractionActive /
  // validateRunningListParity / refreshGlobalButtons moved to
  // runtime-lifecycle-running-list.js (W3.4-C4a).

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
