// Phase 14-2: room/inside/outside FX panel event binders.
//
// Wires 28 event listeners for the three FX panels: animation settings
// create/select/delete, asset type/ref inputs, resource selects, apply
// buttons, intensity/speed sliders, outside mode/direction/enabled.
// Exposed as wireFxPanelBinders(ctx).
(() => {
  function wireFxPanelBinders(ctx) {
    const {
      state,
      roomAnimationSettingsCreateButton,
      roomAnimationSettingsSelect,
      roomAnimationSettingsDeleteButton,
      roomAnimationSettingsNameInput,
      roomAssetTypeInput,
      roomAssetRefInput,
      roomResourceSelect,
      roomApplyChangesButton,
      insideAnimationCreateButton,
      insideAnimationNameInput,
      insideAnimationSelect,
      insideIntensityInput,
      insideIntensityValue,
      insideSpeedInput,
      insideSpeedValue,
      insideAssetTypeInput,
      insideAssetRefInput,
      insideLoopUntilStopInput,
      insideApplyChangesButton,
      outsideEnabledInput,
      outsideAnimationCreateButton,
      outsideAnimationNameInput,
      outsideAnimationSelect,
      outsideIntensityInput,
      outsideIntensityValue,
      outsideSpeedInput,
      outsideSpeedValue,
      outsideModeInput,
      outsideDirectionInput,
      outsideAssetTypeInput,
      outsideAssetRefInput,
      outsideApplyChangesButton,
      triggerFeedback,
      roomEditorDraftByBoard,
      insideEditorDraftByBoard,
      outputRole,
      OUTPUT_ROLE_CONTROL,
      getRoomFxProfile,
      setRoomFxProfile,
      getInsideFxProfile,
      setInsideFxProfile,
      getOutsideFxProfile,
      setOutsideFxProfile,
      updateOutsideFxProfile,
      createRoomAnimationDefinition,
      createInsideAnimationDefinition,
      createOutsideAnimationDefinition,
      normalizeRoomAnimationId,
      normalizeInsideAnimationId,
      normalizeOutsideAnimationId,
      normalizeRoomAssetType,
      normalizeInsideAssetType,
      normalizeRoomAssetRefForType,
      normalizeInsideAssetRefForType,
      normalizeOutsideMode,
      normalizeOutsideDirection,
      normalizeRoomFxProfile,
      clampOutsideIntensity,
      clampOutsideSpeed,
      setRoomEditorDraft,
      setInsideEditorDraft,
      setOutsideEditorDraft,
      collectRoomEditorDraftFromInputs,
      collectInsideEditorDraftFromInputs,
      collectOutsideEditorDraftFromInputs,
      buildInsideProfileWithSelectedAnimationPatch,
      buildOutsideProfileWithSelectedAnimationPatch,
      syncRoomFxPanel,
      syncInsideFxPanel,
      syncOutsideFxPanel,
      syncRoomResourcePicker,
      syncInsideResourcePicker,
      syncOutsideDraftVisibilityFromInputs,
      syncOutsideRuntimeMirror,
      persistBoardProfiles,
      renderRunningAnimationsList,
      refreshGlobalButtons,
      emitLiveMutation,
      emitOutsideFxMutation,
    } = ctx;

    roomAnimationSettingsCreateButton?.addEventListener("click", () => {
      const profile = getRoomFxProfile(state.boardId);
      const definition = createRoomAnimationDefinition(roomAnimationSettingsNameInput?.value, profile.animations);
      const nextProfile = {
        ...profile,
        animations: [...profile.animations, definition],
        selectedAnimationId: definition.id,
      };
      setRoomFxProfile(state.boardId, nextProfile);
      const persisted = persistBoardProfiles();
      delete roomEditorDraftByBoard[state.boardId];
      if (roomAnimationSettingsNameInput) {
        roomAnimationSettingsNameInput.value = "";
      }
      syncRoomFxPanel();
      triggerFeedback.textContent = persisted
        ? `Status: Room animation ${definition.name} created`
        : `Status: Room animation ${definition.name} created (persistence failed)`;
    });

    roomAnimationSettingsSelect?.addEventListener("change", () => {
      const selectedAnimationId = normalizeRoomAnimationId(roomAnimationSettingsSelect.value);
      const profile = getRoomFxProfile(state.boardId);
      setRoomFxProfile(state.boardId, {
        ...profile,
        selectedAnimationId,
      });
      const persisted = persistBoardProfiles();
      delete roomEditorDraftByBoard[state.boardId];
      syncRoomFxPanel();
      triggerFeedback.textContent = persisted
        ? "Status: Room animation selection updated"
        : "Status: Room animation selection updated (persistence failed)";
    });

    roomAnimationSettingsDeleteButton?.addEventListener("click", () => {
      const profile = getRoomFxProfile(state.boardId);
      if (profile.animations.length <= 1) {
        triggerFeedback.textContent = "Status: Keep at least one room animation definition";
        return;
      }
      const selectedId = normalizeRoomAnimationId(profile.selectedAnimationId, profile.animations[0]?.id ?? "kaputt");
      const selectedDefinition = profile.animations.find((entry) => entry.id === selectedId) ?? profile.animations[0];
      const nextAnimations = profile.animations.filter((entry) => entry.id !== selectedDefinition.id);
      const nextSelected = nextAnimations[0]?.id ?? "kaputt";
      setRoomFxProfile(state.boardId, {
        ...profile,
        animations: nextAnimations,
        selectedAnimationId: nextSelected,
      });
      if (state.roomDraft.animationId === selectedDefinition.id) {
        state.roomDraft.animationId = nextSelected;
      }
      delete roomEditorDraftByBoard[state.boardId];
      const persisted = persistBoardProfiles();
      syncRoomFxPanel();
      triggerFeedback.textContent = persisted
        ? `Status: Room animation ${selectedDefinition.name} deleted`
        : `Status: Room animation ${selectedDefinition.name} deleted (persistence failed)`;
    });

    roomAssetTypeInput?.addEventListener("change", () => {
      const assetType = normalizeRoomAssetType(roomAssetTypeInput.value);
      const currentAssetRef = String(roomAssetRefInput?.value || "").trim();
      const normalizedAssetRef = normalizeRoomAssetRefForType(assetType, currentAssetRef);
      setRoomEditorDraft(state.boardId, {
        assetType,
        assetRef: normalizedAssetRef,
      });
      if (roomAssetRefInput) {
        roomAssetRefInput.value = normalizedAssetRef;
      }
      syncRoomResourcePicker(assetType, normalizedAssetRef);
      triggerFeedback.textContent = "Status: Room draft updated - apply changes to commit";
    });

    roomAssetRefInput?.addEventListener("change", () => {
      const assetType = normalizeRoomAssetType(roomAssetTypeInput?.value);
      const assetRef = normalizeRoomAssetRefForType(assetType, String(roomAssetRefInput.value || "").trim());
      roomAssetRefInput.value = assetRef;
      setRoomEditorDraft(state.boardId, { assetRef });
      syncRoomResourcePicker(assetType, assetRef);
      triggerFeedback.textContent = "Status: Room draft updated - apply changes to commit";
    });

    roomAssetRefInput?.addEventListener("input", () => {
      const assetType = normalizeRoomAssetType(roomAssetTypeInput?.value);
      const assetRef = normalizeRoomAssetRefForType(assetType, String(roomAssetRefInput.value || "").trim());
      setRoomEditorDraft(state.boardId, { assetRef });
      syncRoomResourcePicker(assetType, assetRef);
    });

    roomResourceSelect?.addEventListener("change", () => {
      const selectedAsset = String(roomResourceSelect.value || "").trim();
      if (!selectedAsset) {
        return;
      }
      if (roomAssetRefInput) {
        roomAssetRefInput.value = selectedAsset;
      }
      setRoomEditorDraft(state.boardId, { assetRef: selectedAsset });
      triggerFeedback.textContent = "Status: Room draft updated - apply changes to commit";
    });

    roomApplyChangesButton?.addEventListener("click", () => {
      const draft = collectRoomEditorDraftFromInputs(state.boardId);
      if (!draft) {
        triggerFeedback.textContent = "Status: Room apply failed - no animation selected";
        return;
      }
      const profile = getRoomFxProfile(state.boardId);
      const selectedDefinition = profile.animations.find((entry) => entry.id === profile.selectedAnimationId) ?? profile.animations[0];
      const nextProfile = normalizeRoomFxProfile({
        ...profile,
        animations: profile.animations.map((entry) => (entry.id === selectedDefinition.id
          ? {
            ...entry,
            assetType: draft.assetType,
            assetRef: draft.assetRef,
          }
          : entry)),
      });
      setRoomFxProfile(state.boardId, nextProfile);
      const persisted = persistBoardProfiles();
      syncRoomFxPanel();
      triggerFeedback.textContent = persisted
        ? "Status: Room changes applied"
        : "Status: Room changes applied (persistence failed)";
    });

    insideAnimationCreateButton?.addEventListener("click", () => {
      const profile = getInsideFxProfile(state.boardId);
      const definition = createInsideAnimationDefinition(insideAnimationNameInput?.value, profile.animations);
      const nextProfile = {
        ...profile,
        animations: [...profile.animations, definition],
        selectedAnimationId: definition.id,
      };
      setInsideFxProfile(state.boardId, nextProfile);
      const persisted = persistBoardProfiles();
      syncInsideFxPanel();
      renderRunningAnimationsList();
      refreshGlobalButtons();
      if (insideAnimationNameInput) {
        insideAnimationNameInput.value = "";
      }
      delete insideEditorDraftByBoard[state.boardId];
      triggerFeedback.textContent = persisted
        ? `Status: Inside animation ${definition.name} created`
        : `Status: Inside animation ${definition.name} created (persistence failed)`;
    });

    insideAnimationSelect?.addEventListener("change", () => {
      const selectedAnimationId = normalizeInsideAnimationId(insideAnimationSelect.value);
      const profile = getInsideFxProfile(state.boardId);
      setInsideFxProfile(state.boardId, {
        ...profile,
        selectedAnimationId,
      });
      const persisted = persistBoardProfiles();
      delete insideEditorDraftByBoard[state.boardId];
      syncInsideFxPanel();
      triggerFeedback.textContent = persisted
        ? "Status: Inside animation selection updated"
        : "Status: Inside animation selection updated (persistence failed)";
    });

    insideIntensityInput?.addEventListener("input", () => {
      const intensity = clampOutsideIntensity(insideIntensityInput.value);
      setInsideEditorDraft(state.boardId, { intensity });
      insideIntensityValue.textContent = intensity.toFixed(2);
    });

    insideSpeedInput?.addEventListener("input", () => {
      const speed = clampOutsideSpeed(insideSpeedInput.value);
      setInsideEditorDraft(state.boardId, { speed });
      insideSpeedValue.textContent = `${speed.toFixed(2)}x`;
    });

    insideAssetTypeInput?.addEventListener("change", () => {
      const assetType = normalizeInsideAssetType(insideAssetTypeInput.value);
      const currentAssetRef = String(insideAssetRefInput?.value || "").trim();
      const normalizedAssetRef = normalizeInsideAssetRefForType(assetType, currentAssetRef);
      setInsideEditorDraft(state.boardId, {
        assetType,
        assetRef: normalizedAssetRef,
      });
      if (insideAssetRefInput) {
        insideAssetRefInput.value = normalizedAssetRef;
      }
      syncInsideResourcePicker(assetType, normalizedAssetRef);
      triggerFeedback.textContent = "Status: Inside draft updated - apply changes to commit";
    });

    insideAssetRefInput?.addEventListener("change", () => {
      const assetType = normalizeInsideAssetType(insideAssetTypeInput?.value);
      const assetRef = normalizeInsideAssetRefForType(assetType, String(insideAssetRefInput.value || "").trim());
      insideAssetRefInput.value = assetRef;
      setInsideEditorDraft(state.boardId, { assetRef });
      syncInsideResourcePicker(assetType, assetRef);
      triggerFeedback.textContent = "Status: Inside draft updated - apply changes to commit";
    });

    insideLoopUntilStopInput?.addEventListener("change", () => {
      setInsideEditorDraft(state.boardId, {
        loopUntilStopped: Boolean(insideLoopUntilStopInput.checked),
      });
      triggerFeedback.textContent = "Status: Inside draft updated - apply changes to commit";
    });

    insideApplyChangesButton?.addEventListener("click", () => {
      const draft = collectInsideEditorDraftFromInputs(state.boardId);
      if (!draft) {
        triggerFeedback.textContent = "Status: Inside apply failed - no animation selected";
        return;
      }
      const nextProfile = buildInsideProfileWithSelectedAnimationPatch(state.boardId, {
        intensity: draft.intensity,
        speed: draft.speed,
        assetType: draft.assetType,
        assetRef: draft.assetRef,
        loopUntilStopped: Boolean(draft.loopUntilStopped),
      });
      setInsideFxProfile(state.boardId, nextProfile);
      const persisted = persistBoardProfiles();
      syncInsideFxPanel();
      triggerFeedback.textContent = persisted
        ? "Status: Inside changes applied"
        : "Status: Inside changes applied (persistence failed)";
    });

    outsideEnabledInput.addEventListener("change", () => {
      if (outputRole === OUTPUT_ROLE_CONTROL) {
        const nextProfile = {
          ...getOutsideFxProfile(state.boardId),
          enabled: Boolean(outsideEnabledInput.checked),
        };
        void emitLiveMutation("outside-update", {
          outsideBoardId: state.boardId,
          reason: "outside-enabled-toggle",
          outsideFx: nextProfile,
          outsideFxByBoard: {
            [state.boardId]: nextProfile,
          },
        }).then(() => {
          triggerFeedback.textContent = `Pending: Outside Space ${outsideEnabledInput.checked ? "enabled" : "disabled"} (waiting for snapshot)`;
        }).catch(() => {
          triggerFeedback.textContent = "Status: Outside toggle command failed";
          syncOutsideFxPanel();
        });
        return;
      }
      updateOutsideFxProfile(state.boardId, { enabled: outsideEnabledInput.checked });
      const persisted = persistBoardProfiles();
      syncOutsideRuntimeMirror(state.boardId);
      syncOutsideFxPanel();
      renderRunningAnimationsList();
      refreshGlobalButtons();
      emitOutsideFxMutation(state.boardId, "outside-enabled-toggle");
      triggerFeedback.textContent = persisted
        ? `Status: Outside Space ${outsideEnabledInput.checked ? "enabled" : "disabled"}`
        : `Status: Outside Space ${outsideEnabledInput.checked ? "enabled" : "disabled"} (persistence failed)`;
    });

    outsideAnimationCreateButton?.addEventListener("click", () => {
      const profile = getOutsideFxProfile(state.boardId);
      const definition = createOutsideAnimationDefinition(outsideAnimationNameInput?.value, profile.animations);
      const nextAnimations = [...profile.animations, definition];
      const nextProfile = {
        ...profile,
        animations: nextAnimations,
        selectedAnimationId: definition.id,
      };
      if (outputRole === OUTPUT_ROLE_CONTROL) {
        void emitLiveMutation("outside-update", {
          outsideBoardId: state.boardId,
          reason: "outside-animation-create",
          outsideFx: nextProfile,
          outsideFxByBoard: {
            [state.boardId]: nextProfile,
          },
        }).then(() => {
          if (outsideAnimationNameInput) {
            outsideAnimationNameInput.value = "";
          }
          triggerFeedback.textContent = `Pending: Outside animation ${definition.name} created (waiting for snapshot)`;
        }).catch(() => {
          triggerFeedback.textContent = "Status: Outside animation create command failed";
        });
        return;
      }
      updateOutsideFxProfile(state.boardId, {
        animations: nextAnimations,
        selectedAnimationId: definition.id,
      });
      const persisted = persistBoardProfiles();
      syncOutsideFxPanel();
      emitOutsideFxMutation(state.boardId, "outside-animation-create");
      if (outsideAnimationNameInput) {
        outsideAnimationNameInput.value = "";
      }
      triggerFeedback.textContent = persisted
        ? `Status: Outside animation ${definition.name} created`
        : `Status: Outside animation ${definition.name} created (persistence failed)`;
    });

    outsideAnimationSelect?.addEventListener("change", () => {
      const selectedAnimationId = normalizeOutsideAnimationId(outsideAnimationSelect.value);
      if (outputRole === OUTPUT_ROLE_CONTROL) {
        const nextProfile = {
          ...getOutsideFxProfile(state.boardId),
          selectedAnimationId,
        };
        void emitLiveMutation("outside-update", {
          outsideBoardId: state.boardId,
          reason: "outside-animation-select",
          outsideFx: nextProfile,
          outsideFxByBoard: {
            [state.boardId]: nextProfile,
          },
        }).then(() => {
          triggerFeedback.textContent = "Pending: Outside animation selection command accepted (waiting for snapshot)";
        }).catch(() => {
          triggerFeedback.textContent = "Status: Outside animation selection command failed";
          syncOutsideFxPanel();
        });
        return;
      }
      updateOutsideFxProfile(state.boardId, { selectedAnimationId });
      const persisted = persistBoardProfiles();
      syncOutsideFxPanel();
      emitOutsideFxMutation(state.boardId, "outside-animation-select");
      triggerFeedback.textContent = persisted
        ? "Status: Outside animation selection updated"
        : "Status: Outside animation selection updated (persistence failed)";
    });

    outsideIntensityInput.addEventListener("input", () => {
      const intensity = clampOutsideIntensity(outsideIntensityInput.value);
      setOutsideEditorDraft(state.boardId, { intensity });
      outsideIntensityValue.textContent = intensity.toFixed(2);
    });

    outsideSpeedInput.addEventListener("input", () => {
      const speed = clampOutsideSpeed(outsideSpeedInput.value);
      setOutsideEditorDraft(state.boardId, { speed });
      outsideSpeedValue.textContent = `${speed.toFixed(2)}x`;
    });

    outsideModeInput.addEventListener("change", () => {
      if (outsideModeInput.disabled) {
        return;
      }
      setOutsideEditorDraft(state.boardId, { mode: normalizeOutsideMode(outsideModeInput.value) });
      triggerFeedback.textContent = "Status: Outside draft updated - apply changes to commit";
    });

    outsideDirectionInput.addEventListener("change", () => {
      if (outsideDirectionInput.disabled) {
        return;
      }
      setOutsideEditorDraft(state.boardId, {
        direction: normalizeOutsideDirection(outsideDirectionInput.value),
      });
      triggerFeedback.textContent = "Status: Outside draft updated - apply changes to commit";
    });

    outsideAssetTypeInput?.addEventListener("change", () => {
      syncOutsideDraftVisibilityFromInputs(state.boardId);
      triggerFeedback.textContent = "Status: Outside draft updated - apply changes to commit";
    });

    outsideAssetRefInput?.addEventListener("change", () => {
      syncOutsideDraftVisibilityFromInputs(state.boardId);
      triggerFeedback.textContent = "Status: Outside draft updated - apply changes to commit";
    });

    outsideAssetRefInput?.addEventListener("input", () => {
      syncOutsideDraftVisibilityFromInputs(state.boardId);
      triggerFeedback.textContent = "Status: Outside draft updated - apply changes to commit";
    });

    outsideApplyChangesButton?.addEventListener("click", () => {
      const draft = collectOutsideEditorDraftFromInputs(state.boardId);
      if (!draft) {
        triggerFeedback.textContent = "Status: Outside apply failed - no animation selected";
        return;
      }
      const nextProfile = buildOutsideProfileWithSelectedAnimationPatch(state.boardId, {
        intensity: draft.intensity,
        speed: draft.speed,
        mode: draft.mode,
        direction: draft.direction,
        assetType: draft.assetType,
        assetRef: draft.assetRef,
      });
      if (outputRole === OUTPUT_ROLE_CONTROL) {
        void emitLiveMutation("outside-update", {
          outsideBoardId: state.boardId,
          reason: "outside-apply-changes",
          outsideFx: nextProfile,
          outsideFxByBoard: {
            [state.boardId]: nextProfile,
          },
        }).then(() => {
          triggerFeedback.textContent = "Pending: Outside changes applied atomically (waiting for snapshot)";
        }).catch(() => {
          triggerFeedback.textContent = "Status: Outside apply command failed";
          syncOutsideFxPanel();
        });
        return;
      }
      setOutsideFxProfile(state.boardId, nextProfile);
      const persisted = persistBoardProfiles();
      syncOutsideFxPanel();
      emitOutsideFxMutation(state.boardId, "outside-apply-changes");
      triggerFeedback.textContent = persisted
        ? "Status: Outside changes applied"
        : "Status: Outside changes applied (persistence failed)";
    });
  }

  window.TT_BEAMER_RUNTIME_WIRE_FX_PANEL_BINDERS = {
    wireFxPanelBinders,
  };
})();
