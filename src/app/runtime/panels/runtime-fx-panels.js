// FX panels shim — re-exports the consolidated 28-key
// `TT_BEAMER_RUNTIME_FX_PANELS` namespace from the two split sub-modules:
//
//   - runtime-fx-panels-room.js          (room cluster: 6 keys + init)
//   - runtime-fx-panels-inside-outside.js (inside + outside: 21 keys + init)
//
// Public API surface is byte-identical to the pre-W3.6-C1 file: 28
// namespace keys, init(deps) fans out to both sub-modules. The shim
// owns no state and no functions of its own — it is a pure
// destructure-and-re-emit shell per §5 recipe.
//
// Cross-module dependency: loadOutsideResourceAssets (in inside-outside)
// calls syncRoomResourcePicker (in room). The shim wires this by passing
// `syncRoomResourcePicker: room.syncRoomResourcePicker` into
// insideOutside.init() so the inside-outside IIFE's bare-identifier call
// site stays byte-identical.
(() => {
  const room = window.TT_BEAMER_RUNTIME_FX_PANELS_ROOM;
  const insideOutside = window.TT_BEAMER_RUNTIME_FX_PANELS_INSIDE_OUTSIDE;

  function init(dependencies) {
    room.init(dependencies);
    insideOutside.init({
      ...dependencies,
      syncRoomResourcePicker: room.syncRoomResourcePicker,
    });
  }

  window.TT_BEAMER_RUNTIME_FX_PANELS = {
    init,
    // inside cluster (7 keys) — inside-outside sub-module
    syncOutsideModeDirectionVisibility: insideOutside.syncOutsideModeDirectionVisibility,
    buildInsideProfileWithSelectedAnimationPatch: insideOutside.buildInsideProfileWithSelectedAnimationPatch,
    syncInsideResourcePicker: insideOutside.syncInsideResourcePicker,
    getInsideEditorDraft: insideOutside.getInsideEditorDraft,
    setInsideEditorDraft: insideOutside.setInsideEditorDraft,
    collectInsideEditorDraftFromInputs: insideOutside.collectInsideEditorDraftFromInputs,
    syncInsideFxPanel: insideOutside.syncInsideFxPanel,
    renderInsideGlobalButtons: insideOutside.renderInsideGlobalButtons,
    // room cluster (6 keys) — room sub-module
    getRoomAnimationLabelById: room.getRoomAnimationLabelById,
    syncRoomResourcePicker: room.syncRoomResourcePicker,
    getRoomEditorDraft: room.getRoomEditorDraft,
    setRoomEditorDraft: room.setRoomEditorDraft,
    collectRoomEditorDraftFromInputs: room.collectRoomEditorDraftFromInputs,
    syncRoomFxPanel: room.syncRoomFxPanel,
    // outside cluster (14 keys) — inside-outside sub-module
    buildOutsideProfileWithSelectedAnimationPatch: insideOutside.buildOutsideProfileWithSelectedAnimationPatch,
    syncOutsideResourcePicker: insideOutside.syncOutsideResourcePicker,
    loadOutsideResourceAssets: insideOutside.loadOutsideResourceAssets,
    getOutsideEditorDraft: insideOutside.getOutsideEditorDraft,
    setOutsideEditorDraft: insideOutside.setOutsideEditorDraft,
    collectOutsideEditorDraftFromInputs: insideOutside.collectOutsideEditorDraftFromInputs,
    syncOutsideDraftVisibilityFromInputs: insideOutside.syncOutsideDraftVisibilityFromInputs,
    syncOutsideFxPanel: insideOutside.syncOutsideFxPanel,
    findOutsideGlobalAnimation: insideOutside.findOutsideGlobalAnimation,
    syncOutsideRuntimeMirror: insideOutside.syncOutsideRuntimeMirror,
    getOutsideEditingAnimationId: insideOutside.getOutsideEditingAnimationId,
    setOutsideEditingAnimationId: insideOutside.setOutsideEditingAnimationId,
    renderOutsideGlobalButtons: insideOutside.renderOutsideGlobalButtons,
  };
})();
