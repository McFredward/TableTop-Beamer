// Phase 14-2: settings-tab calibration event binders.
//
// Wires hitarea offset/scale/save/reset inputs and the room geometry
// mode/x/y/stretch inputs to their runtime side effects. Exposed as a
// single wireCalibrationBinders(ctx) entry point called once from the
// orchestration bootstrap.
(() => {
  function wireCalibrationBinders(ctx) {
    const {
      state,
      hitareaOffsetXInput,
      hitareaOffsetYInput,
      hitareaScaleInput,
      hitareaSaveButton,
      hitareaResetButton,
      roomGeometryModeInput,
      roomGeometryXInput,
      roomGeometryYInput,
      roomGeometryStretchXInput,
      roomGeometryStretchYInput,
      HITAREA_CALIBRATION_DEFAULT,
      clampHitareaOffset,
      clampHitareaScale,
      clampRoomAbsoluteCoordinate,
      clampRoomRelativeOffset,
      clampRoomStretch,
      updateActiveBoardHitareaCalibration,
      setHitareaCalibration,
      persistBoardProfiles,
      syncHitareaCalibrationPanel,
      renderRoomOverlay,
      triggerFeedback,
      getSelectedRoom,
      getRoomGeometry,
      getRawRoomCenter,
      normalizeRoomGeometryMode,
      updateSelectedRoomGeometry,
    } = ctx;

    hitareaOffsetXInput.addEventListener("input", () => {
      const offsetX = clampHitareaOffset(Number(hitareaOffsetXInput.value));
      updateActiveBoardHitareaCalibration({ offsetX });
    });

    hitareaOffsetYInput.addEventListener("input", () => {
      const offsetY = clampHitareaOffset(Number(hitareaOffsetYInput.value));
      updateActiveBoardHitareaCalibration({ offsetY });
    });

    hitareaScaleInput.addEventListener("input", () => {
      const scale = clampHitareaScale(Number(hitareaScaleInput.value));
      updateActiveBoardHitareaCalibration({ scale });
    });

    hitareaSaveButton.addEventListener("click", () => {
      const persisted = persistBoardProfiles();
      syncHitareaCalibrationPanel();
      triggerFeedback.textContent = persisted
        ? "Status: Board profile (hit area + geometry + shapes) saved"
        : "Status: Board profile could not be saved";
    });

    hitareaResetButton.addEventListener("click", () => {
      setHitareaCalibration(state.boardId, HITAREA_CALIBRATION_DEFAULT);
      const persisted = persistBoardProfiles();
      syncHitareaCalibrationPanel();
      renderRoomOverlay();
      triggerFeedback.textContent = persisted
        ? "Status: Hit area calibration reset to default"
        : "Status: Hit area default applied, persistence failed";
    });

    roomGeometryModeInput.addEventListener("change", () => {
      const room = getSelectedRoom();
      if (!room) {
        return;
      }
      const current = getRoomGeometry(state.boardId, room.id);
      const baseCenter = getRawRoomCenter(room);
      const nextMode = normalizeRoomGeometryMode(roomGeometryModeInput.value);
      if (nextMode === "absolute") {
        const absoluteX = clampRoomAbsoluteCoordinate(baseCenter.x + current.offsetX);
        const absoluteY = clampRoomAbsoluteCoordinate(baseCenter.y + current.offsetY);
        updateSelectedRoomGeometry({ mode: nextMode, absoluteX, absoluteY }, "set to ABS mode");
      } else {
        const offsetX = clampRoomRelativeOffset(current.absoluteX - baseCenter.x);
        const offsetY = clampRoomRelativeOffset(current.absoluteY - baseCenter.y);
        updateSelectedRoomGeometry({ mode: nextMode, offsetX, offsetY }, "set to REL mode");
      }
    });

    roomGeometryXInput.addEventListener("input", () => {
      const room = getSelectedRoom();
      if (!room) {
        return;
      }
      const geometry = getRoomGeometry(state.boardId, room.id);
      if (geometry.mode === "absolute") {
        const absoluteX = clampRoomAbsoluteCoordinate(Number(roomGeometryXInput.value));
        updateSelectedRoomGeometry({ absoluteX }, "X calibrated (ABS)");
      } else {
        const offsetX = clampRoomRelativeOffset(Number(roomGeometryXInput.value));
        updateSelectedRoomGeometry({ offsetX }, "X calibrated (REL)");
      }
    });

    roomGeometryYInput.addEventListener("input", () => {
      const room = getSelectedRoom();
      if (!room) {
        return;
      }
      const geometry = getRoomGeometry(state.boardId, room.id);
      if (geometry.mode === "absolute") {
        const absoluteY = clampRoomAbsoluteCoordinate(Number(roomGeometryYInput.value));
        updateSelectedRoomGeometry({ absoluteY }, "Y calibrated (ABS)");
      } else {
        const offsetY = clampRoomRelativeOffset(Number(roomGeometryYInput.value));
        updateSelectedRoomGeometry({ offsetY }, "Y calibrated (REL)");
      }
    });

    roomGeometryStretchXInput.addEventListener("input", () => {
      const stretchX = clampRoomStretch(Number(roomGeometryStretchXInput.value));
      updateSelectedRoomGeometry({ stretchX }, "Stretch X set");
    });

    roomGeometryStretchYInput.addEventListener("input", () => {
      const stretchY = clampRoomStretch(Number(roomGeometryStretchYInput.value));
      updateSelectedRoomGeometry({ stretchY }, "Stretch Y set");
    });
  }

  window.TT_BEAMER_RUNTIME_WIRE_CALIBRATION_BINDERS = {
    wireCalibrationBinders,
  };
})();
