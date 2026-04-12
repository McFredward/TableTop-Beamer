// Phase 15-2: hitarea calibration + room geometry panels removed.
//
// The legacy per-board hitarea offset/scale and per-room
// position/stretch sliders were a pre-polygon calibration mechanism.
// Polygons now fully replace both, so the entire panel — and the
// event binders that mutated the underlying state — are gone.
//
// We keep the module (and its init stub) so the orchestration wire
// call site and the runtime-module-exports-check smoke test stay
// satisfied without a separate follow-up cleanup commit. The
// function is a no-op; the underlying state fields
// (hitareaCalibrationByBoard, roomGeometryByBoard) still exist so
// existing persisted board profiles keep loading and rendering
// polygons identically.
(() => {
  function wireCalibrationBinders(_ctx) {
    // intentionally empty — panels removed in Phase 15-2
  }

  window.TT_BEAMER_RUNTIME_WIRE_CALIBRATION_BINDERS = {
    wireCalibrationBinders,
  };
})();
