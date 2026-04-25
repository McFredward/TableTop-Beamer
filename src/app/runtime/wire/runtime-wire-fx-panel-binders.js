// room/inside/outside FX panel event binders.
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
      roomAnimationRenameInput,
      roomAssetTypeInput,
      roomAssetRefInput,
      roomResourceSelect,
      roomApplyChangesButton,
      roomDefOpacityInput,
      roomDefOpacityValue,
      roomDefIntensityInput,
      roomDefIntensityValue,
      roomDefSpeedInput,
      roomDefSpeedValue,
      roomDefSoundVolumeInput,
      roomDefSoundVolumeValue,
      roomBreaksSolidColorInput,
      roomBreaksSolidColorLabel,
      insideAnimationCreateButton,
      insideAnimationNameInput,
      insideAnimationRenameInput,
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
      outsideAnimationRenameInput,
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
      clampRoomOpacity,
      clampRoomIntensity,
      clampRoomSpeed,
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
      // Create with defaults (user configures in the Edit tab).
      const definition = createRoomAnimationDefinition(
        roomAnimationSettingsNameInput?.value,
        profile.animations,
        null,
      );
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
      switchAnimationSectionTab(roomAnimationSettingsCreateButton, "edit");
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

    function commitRoomDraftToDefinition(patch) {
      const profile = getRoomFxProfile(state.boardId);
      const selectedDefinition = profile.animations.find((entry) => entry.id === profile.selectedAnimationId) ?? profile.animations[0];
      if (!selectedDefinition) return;
      const nextProfile = normalizeRoomFxProfile({
        ...profile,
        animations: profile.animations.map((entry) => (entry.id === selectedDefinition.id
          ? { ...entry, ...patch }
          : entry)),
      });
      setRoomFxProfile(state.boardId, nextProfile);
      persistBoardProfiles();
      // When the definition being edited in Settings is the
      // same animation the dashboard currently has selected, mirror the
      // patch onto state.roomDraft so the next Start picks up the new
      // default immediately (no "first-Start uses old values" lag). Also
      // re-run the dashboard panel sync so the on-screen slider moves.
      if (state.roomDraft.animationId === selectedDefinition.id) {
        const draftPatch = {};
        if (patch.opacity !== undefined) draftPatch.opacity = Number(patch.opacity);
        if (patch.intensity !== undefined) draftPatch.intensity = Number(patch.intensity);
        if (patch.speed !== undefined) draftPatch.speed = Number(patch.speed);
        if (patch.soundVolume !== undefined) draftPatch.soundVolume = Number(patch.soundVolume);
        if (patch.rotationDeg !== undefined) draftPatch.rotationDeg = Number(patch.rotationDeg);
        if (patch.stretchToPolygon !== undefined) draftPatch.stretchToPolygon = Boolean(patch.stretchToPolygon);
        if (patch.widthScale !== undefined) draftPatch.widthScale = Number(patch.widthScale);
        if (patch.heightScale !== undefined) draftPatch.heightScale = Number(patch.heightScale);
        if (patch.offsetXScale !== undefined) draftPatch.offsetXScale = Number(patch.offsetXScale);
        if (patch.offsetYScale !== undefined) draftPatch.offsetYScale = Number(patch.offsetYScale);
        Object.assign(state.roomDraft, draftPatch);
        if (typeof ctx.syncRoomPanelFromSelection === "function") {
          ctx.syncRoomPanelFromSelection({ preserveDraftState: true });
        }
      }
    }

    roomAssetTypeInput?.addEventListener("change", () => {
      const assetType = normalizeRoomAssetType(roomAssetTypeInput.value);
      const currentAssetRef = String(roomAssetRefInput?.value || "").trim();
      const normalizedAssetRef = normalizeRoomAssetRefForType(assetType, currentAssetRef);
      setRoomEditorDraft(state.boardId, { assetType, assetRef: normalizedAssetRef });
      if (roomAssetRefInput) {
        roomAssetRefInput.value = normalizedAssetRef;
      }
      syncRoomResourcePicker(assetType, normalizedAssetRef);
      commitRoomDraftToDefinition({ assetType, assetRef: normalizedAssetRef });
      syncRoomFxPanel();
    });

    roomAssetRefInput?.addEventListener("change", () => {
      const assetType = normalizeRoomAssetType(roomAssetTypeInput?.value);
      const assetRef = normalizeRoomAssetRefForType(assetType, String(roomAssetRefInput.value || "").trim());
      roomAssetRefInput.value = assetRef;
      setRoomEditorDraft(state.boardId, { assetRef });
      syncRoomResourcePicker(assetType, assetRef);
      commitRoomDraftToDefinition({ assetRef });
    });

    roomAssetRefInput?.addEventListener("input", () => {
      const assetType = normalizeRoomAssetType(roomAssetTypeInput?.value);
      const assetRef = normalizeRoomAssetRefForType(assetType, String(roomAssetRefInput.value || "").trim());
      setRoomEditorDraft(state.boardId, { assetRef });
      syncRoomResourcePicker(assetType, assetRef);
      commitRoomDraftToDefinition({ assetRef });
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
      commitRoomDraftToDefinition({ assetRef: selectedAsset });
    });

    // Live preview for transform sliders. Writing to the
    // draft only — commit happens on Apply. Value labels update in
    // real time so the user can see the exact numbers.
    ctx.roomRotationDegInput?.addEventListener("input", () => {
      const v = Number(ctx.roomRotationDegInput.value) || 0;
      if (ctx.roomRotationDegValue) ctx.roomRotationDegValue.textContent = String(Math.round(v));
      setRoomEditorDraft(state.boardId, { rotationDeg: v });
      commitRoomDraftToDefinition({ rotationDeg: v });
    });
    ctx.roomStretchToPolygonInput?.addEventListener("change", () => {
      const stretch = Boolean(ctx.roomStretchToPolygonInput.checked);
      if (ctx.roomWidthScaleInput) ctx.roomWidthScaleInput.disabled = stretch;
      if (ctx.roomHeightScaleInput) ctx.roomHeightScaleInput.disabled = stretch;
      if (ctx.roomOffsetXScaleInput) ctx.roomOffsetXScaleInput.disabled = stretch;
      if (ctx.roomOffsetYScaleInput) ctx.roomOffsetYScaleInput.disabled = stretch;
      setRoomEditorDraft(state.boardId, { stretchToPolygon: stretch });
      commitRoomDraftToDefinition({ stretchToPolygon: stretch });
    });
    ctx.roomWidthScaleInput?.addEventListener("input", () => {
      const v = Number(ctx.roomWidthScaleInput.value) || 1;
      if (ctx.roomWidthScaleValue) ctx.roomWidthScaleValue.textContent = v.toFixed(2);
      setRoomEditorDraft(state.boardId, { widthScale: v });
      commitRoomDraftToDefinition({ widthScale: v });
    });
    ctx.roomHeightScaleInput?.addEventListener("input", () => {
      const v = Number(ctx.roomHeightScaleInput.value) || 1;
      if (ctx.roomHeightScaleValue) ctx.roomHeightScaleValue.textContent = v.toFixed(2);
      setRoomEditorDraft(state.boardId, { heightScale: v });
      commitRoomDraftToDefinition({ heightScale: v });
    });
    ctx.roomOffsetXScaleInput?.addEventListener("input", () => {
      const v = Number(ctx.roomOffsetXScaleInput.value) || 0;
      if (ctx.roomOffsetXScaleValue) ctx.roomOffsetXScaleValue.textContent = v.toFixed(2);
      setRoomEditorDraft(state.boardId, { offsetXScale: v });
      commitRoomDraftToDefinition({ offsetXScale: v });
    });
    ctx.roomOffsetYScaleInput?.addEventListener("input", () => {
      const v = Number(ctx.roomOffsetYScaleInput.value) || 0;
      if (ctx.roomOffsetYScaleValue) ctx.roomOffsetYScaleValue.textContent = v.toFixed(2);
      setRoomEditorDraft(state.boardId, { offsetYScale: v });
      commitRoomDraftToDefinition({ offsetYScale: v });
    });

    roomDefOpacityInput?.addEventListener("input", () => {
      const v = clampRoomOpacity(Number(roomDefOpacityInput.value));
      if (roomDefOpacityValue) roomDefOpacityValue.textContent = v.toFixed(2);
      setRoomEditorDraft(state.boardId, { opacity: v });
      commitRoomDraftToDefinition({ opacity: v });
    });
    roomDefIntensityInput?.addEventListener("input", () => {
      const v = clampRoomIntensity(Number(roomDefIntensityInput.value));
      if (roomDefIntensityValue) roomDefIntensityValue.textContent = v.toFixed(2);
      setRoomEditorDraft(state.boardId, { intensity: v });
      commitRoomDraftToDefinition({ intensity: v });
    });
    roomDefSpeedInput?.addEventListener("input", () => {
      const v = clampRoomSpeed(Number(roomDefSpeedInput.value));
      if (roomDefSpeedValue) roomDefSpeedValue.textContent = `${v.toFixed(2)}x`;
      setRoomEditorDraft(state.boardId, { speed: v });
      commitRoomDraftToDefinition({ speed: v });
    });
    roomDefSoundVolumeInput?.addEventListener("input", () => {
      const v = Math.max(0, Math.min(100, Math.round(Number(roomDefSoundVolumeInput.value) || 0)));
      if (roomDefSoundVolumeValue) roomDefSoundVolumeValue.textContent = `${v}%`;
      setRoomEditorDraft(state.boardId, { soundVolume: v / 100 });
      commitRoomDraftToDefinition({ soundVolume: v / 100 });
    });
    // Opt-in hull-flicker ⇒ cuts concurrent solid-color in room.
    roomBreaksSolidColorInput?.addEventListener("change", () => {
      const v = Boolean(roomBreaksSolidColorInput.checked);
      setRoomEditorDraft(state.boardId, { breaksSolidColor: v });
      commitRoomDraftToDefinition({ breaksSolidColor: v });
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
            // Persist the per-definition sound selection.
            soundAssetRef: draft.soundAssetRef ?? entry.soundAssetRef ?? "none",
            // Persist the per-definition transform options.
            rotationDeg: draft.rotationDeg ?? entry.rotationDeg ?? 0,
            stretchToPolygon: draft.stretchToPolygon ?? entry.stretchToPolygon ?? true,
            widthScale: draft.widthScale ?? entry.widthScale ?? 1,
            heightScale: draft.heightScale ?? entry.heightScale ?? 1,
            offsetXScale: draft.offsetXScale ?? entry.offsetXScale ?? 0,
            offsetYScale: draft.offsetYScale ?? entry.offsetYScale ?? 0,
            opacity: draft.opacity ?? entry.opacity ?? 0.9,
            intensity: draft.intensity ?? entry.intensity ?? 0.8,
            speed: draft.speed ?? entry.speed ?? 1,
            soundVolume: draft.soundVolume ?? entry.soundVolume ?? 1,
            colorHex: draft.colorHex ?? entry.colorHex ?? "#ff0000",
            // Opt-in hull-flicker ⇒ cuts concurrent solid-color.
            breaksSolidColor: Boolean(draft.breaksSolidColor ?? entry.breaksSolidColor),
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
      // Create with defaults (user configures in the Edit tab).
      const definition = createInsideAnimationDefinition(
        insideAnimationNameInput?.value,
        profile.animations,
        null,
      );
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
      switchAnimationSectionTab(insideAnimationCreateButton, "edit");
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

    function commitInsideDraftToDefinition(patch) {
      const nextProfile = buildInsideProfileWithSelectedAnimationPatch(state.boardId, patch);
      setInsideFxProfile(state.boardId, nextProfile);
      persistBoardProfiles();
    }

    insideIntensityInput?.addEventListener("input", () => {
      const intensity = clampOutsideIntensity(insideIntensityInput.value);
      setInsideEditorDraft(state.boardId, { intensity });
      insideIntensityValue.textContent = intensity.toFixed(2);
      commitInsideDraftToDefinition({ intensity });
    });

    insideSpeedInput?.addEventListener("input", () => {
      const speed = clampOutsideSpeed(insideSpeedInput.value);
      setInsideEditorDraft(state.boardId, { speed });
      insideSpeedValue.textContent = `${speed.toFixed(2)}x`;
      commitInsideDraftToDefinition({ speed });
    });

    insideAssetTypeInput?.addEventListener("change", () => {
      const assetType = normalizeInsideAssetType(insideAssetTypeInput.value);
      const currentAssetRef = String(insideAssetRefInput?.value || "").trim();
      const normalizedAssetRef = normalizeInsideAssetRefForType(assetType, currentAssetRef);
      setInsideEditorDraft(state.boardId, { assetType, assetRef: normalizedAssetRef });
      if (insideAssetRefInput) {
        insideAssetRefInput.value = normalizedAssetRef;
      }
      syncInsideResourcePicker(assetType, normalizedAssetRef);
      commitInsideDraftToDefinition({ assetType, assetRef: normalizedAssetRef });
    });

    insideAssetRefInput?.addEventListener("change", () => {
      const assetType = normalizeInsideAssetType(insideAssetTypeInput?.value);
      const assetRef = normalizeInsideAssetRefForType(assetType, String(insideAssetRefInput.value || "").trim());
      insideAssetRefInput.value = assetRef;
      setInsideEditorDraft(state.boardId, { assetRef });
      syncInsideResourcePicker(assetType, assetRef);
      commitInsideDraftToDefinition({ assetRef });
    });

    insideLoopUntilStopInput?.addEventListener("change", () => {
      const loopUntilStopped = Boolean(insideLoopUntilStopInput.checked);
      setInsideEditorDraft(state.boardId, { loopUntilStopped });
      commitInsideDraftToDefinition({ loopUntilStopped });
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
        soundAssetRef: draft.soundAssetRef ?? "none",
      });
      setInsideFxProfile(state.boardId, nextProfile);
      const persisted = persistBoardProfiles();
      syncInsideFxPanel();
      triggerFeedback.textContent = persisted
        ? "Status: Inside changes applied"
        : "Status: Inside changes applied (persistence failed)";
    });

    outsideEnabledInput?.addEventListener("change", () => {
      if (outputRole === OUTPUT_ROLE_CONTROL) {
        const nextProfile = {
          ...getOutsideFxProfile(state.boardId),
          enabled: Boolean(outsideEnabledInput.checked),
        };
        // Optimistic local apply + persist so the dirty flag
        // fires on toggle (the broadcast-snapshot roundtrip bypassed
        // persistBoardProfiles, leaving the apply/discard bar blind).
        updateOutsideFxProfile(state.boardId, { enabled: Boolean(outsideEnabledInput.checked) });
        persistBoardProfiles();
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
      // Create with defaults (user configures in the Edit tab).
      const definition = createOutsideAnimationDefinition(
        outsideAnimationNameInput?.value,
        profile.animations,
        null,
      );
      const nextAnimations = [...profile.animations, definition];
      const nextProfile = {
        ...profile,
        animations: nextAnimations,
        selectedAnimationId: definition.id,
      };
      if (outputRole === OUTPUT_ROLE_CONTROL) {
        // Optimistic local apply + persist so the dirty flag
        // fires on create.
        updateOutsideFxProfile(state.boardId, {
          animations: nextAnimations,
          selectedAnimationId: definition.id,
        });
        persistBoardProfiles();
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
          switchAnimationSectionTab(outsideAnimationCreateButton, "edit");
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
      switchAnimationSectionTab(outsideAnimationCreateButton, "edit");
      triggerFeedback.textContent = persisted
        ? `Status: Outside animation ${definition.name} created`
        : `Status: Outside animation ${definition.name} created (persistence failed)`;
    });

    outsideAnimationSelect?.addEventListener("change", () => {
      // Picking another animation in the Edit tab changes ONLY
      // which definition the editor shows. It must NOT switch the running
      // outside animation or emit a live mutation. Changes land on the
      // running animation only if the user then edits a parameter of the
      // animation that happens to be the currently-selected/playing one.
      const editingId = normalizeOutsideAnimationId(outsideAnimationSelect.value);
      ctx.setOutsideEditingAnimationId(state.boardId, editingId);
      delete outsideEditorDraftByBoard[state.boardId];
      syncOutsideFxPanel();
    });

    ctx.outsideAnimationDeleteButton?.addEventListener("click", () => {
      const profile = getOutsideFxProfile(state.boardId);
      if (profile.animations.length <= 1) {
        triggerFeedback.textContent = "Status: Keep at least one outside animation definition";
        return;
      }
      const editingId = ctx.getOutsideEditingAnimationId(state.boardId)
        ?? profile.selectedAnimationId
        ?? profile.animations[0]?.id;
      const victim = profile.animations.find((entry) => entry.id === editingId)
        ?? profile.animations[0];
      if (!victim) return;
      const nextAnimations = profile.animations.filter((entry) => entry.id !== victim.id);
      const nextSelected = profile.selectedAnimationId === victim.id
        ? (nextAnimations[0]?.id ?? null)
        : profile.selectedAnimationId;
      const nextProfile = {
        ...profile,
        animations: nextAnimations,
        selectedAnimationId: nextSelected,
      };
      // Any ongoing edit-drafts are now stale.
      delete outsideEditorDraftByBoard[state.boardId];
      // Point the editor at whatever animation is now first.
      ctx.setOutsideEditingAnimationId(state.boardId, nextAnimations[0]?.id ?? null);

      if (outputRole === OUTPUT_ROLE_CONTROL) {
        // Optimistic local apply + persist so the dirty flag
        // fires on delete.
        updateOutsideFxProfile(state.boardId, {
          animations: nextAnimations,
          selectedAnimationId: nextSelected,
        });
        persistBoardProfiles();
        void emitLiveMutation("outside-update", {
          outsideBoardId: state.boardId,
          reason: "outside-animation-delete",
          outsideFx: nextProfile,
          outsideFxByBoard: { [state.boardId]: nextProfile },
        }).then(() => {
          triggerFeedback.textContent = `Status: Outside animation ${victim.name} deleted`;
        }).catch(() => {
          triggerFeedback.textContent = "Status: Outside animation delete command failed";
        });
        return;
      }
      updateOutsideFxProfile(state.boardId, {
        animations: nextAnimations,
        selectedAnimationId: nextSelected,
      });
      const persisted = persistBoardProfiles();
      syncOutsideFxPanel();
      emitOutsideFxMutation(state.boardId, "outside-animation-delete");
      triggerFeedback.textContent = persisted
        ? `Status: Outside animation ${victim.name} deleted`
        : `Status: Outside animation ${victim.name} deleted (persistence failed)`;
    });

    function commitOutsideDraftToDefinition(patch) {
      const nextProfile = buildOutsideProfileWithSelectedAnimationPatch(state.boardId, patch);
      updateOutsideFxProfile(state.boardId, nextProfile);
      persistBoardProfiles();
    }

    outsideIntensityInput?.addEventListener("input", () => {
      const intensity = clampOutsideIntensity(outsideIntensityInput.value);
      setOutsideEditorDraft(state.boardId, { intensity });
      if (outsideIntensityValue) outsideIntensityValue.textContent = intensity.toFixed(2);
      commitOutsideDraftToDefinition({ intensity });
    });

    outsideSpeedInput?.addEventListener("input", () => {
      const speed = clampOutsideSpeed(outsideSpeedInput.value);
      setOutsideEditorDraft(state.boardId, { speed });
      if (outsideSpeedValue) outsideSpeedValue.textContent = `${speed.toFixed(2)}x`;
      commitOutsideDraftToDefinition({ speed });
    });

    outsideModeInput?.addEventListener("change", () => {
      if (outsideModeInput.disabled) {
        return;
      }
      const mode = normalizeOutsideMode(outsideModeInput.value);
      setOutsideEditorDraft(state.boardId, { mode });
      commitOutsideDraftToDefinition({ mode });
    });

    outsideDirectionInput?.addEventListener("change", () => {
      if (outsideDirectionInput.disabled) {
        return;
      }
      const direction = normalizeOutsideDirection(outsideDirectionInput.value);
      setOutsideEditorDraft(state.boardId, { direction });
      commitOutsideDraftToDefinition({ direction });
    });

    outsideAssetTypeInput?.addEventListener("change", () => {
      syncOutsideDraftVisibilityFromInputs(state.boardId);
      const draft = collectOutsideEditorDraftFromInputs(state.boardId);
      if (draft) commitOutsideDraftToDefinition({ assetType: draft.assetType, assetRef: draft.assetRef });
    });

    outsideAssetRefInput?.addEventListener("change", () => {
      syncOutsideDraftVisibilityFromInputs(state.boardId);
      const draft = collectOutsideEditorDraftFromInputs(state.boardId);
      if (draft) commitOutsideDraftToDefinition({ assetRef: draft.assetRef });
    });

    outsideAssetRefInput?.addEventListener("input", () => {
      syncOutsideDraftVisibilityFromInputs(state.boardId);
      const draft = collectOutsideEditorDraftFromInputs(state.boardId);
      if (draft) commitOutsideDraftToDefinition({ assetRef: draft.assetRef });
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
        soundAssetRef: draft.soundAssetRef ?? "none",
      });
      if (outputRole === OUTPUT_ROLE_CONTROL) {
        // Optimistic local apply + persist so the dirty flag
        // fires on Apply Changes.
        setOutsideFxProfile(state.boardId, nextProfile);
        persistBoardProfiles();
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

    // Phase 20: wire the two-tab switcher in every animation section.
    // Expects each section to contain `.animation-tab-button[data-animation-tab]`
    // buttons and `[data-animation-tab-panel]` panels.
    const tabButtons = document.querySelectorAll(".animation-tab-button[data-animation-tab]");
    for (const button of tabButtons) {
      button.addEventListener("click", () => {
        switchAnimationSectionTab(button, button.dataset.animationTab);
      });
    }

    // Rename handlers for the three animation sections. Each
    // takes the current text-input value, writes it to the selected
    // definition's `name`, persists + re-syncs, and (for outside/inside)
    // also handles the network push via the same paths as other def
    // edits. Empty names are ignored.
    function sanitizeRenameInput(rawValue, fallback) {
      const trimmed = String(rawValue ?? "").trim();
      return trimmed.slice(0, 64) || fallback;
    }

    // Per user feedback, rename fires on input change — no
    // extra "Rename" button. Each change writes the new name to the
    // selected definition and marks the config dirty via
    // persistBoardProfiles. The user confirms via the global Apply bar
    // like every other definition edit. Empty names fall back to the
    // current name (no accidental unnamed animations).
    roomAnimationRenameInput?.addEventListener("input", () => {
      const profile = getRoomFxProfile(state.boardId);
      const selectedDefinition = profile.animations.find((entry) => entry.id === profile.selectedAnimationId)
        ?? profile.animations[0];
      if (!selectedDefinition) return;
      const nextName = sanitizeRenameInput(roomAnimationRenameInput.value, selectedDefinition.name);
      if (nextName === selectedDefinition.name) return;
      const nextProfile = normalizeRoomFxProfile({
        ...profile,
        animations: profile.animations.map((entry) => (entry.id === selectedDefinition.id
          ? { ...entry, name: nextName }
          : entry)),
      });
      setRoomFxProfile(state.boardId, nextProfile);
      persistBoardProfiles();
      // Refresh the animation dropdowns so the new name shows
      // everywhere, but do NOT reset the rename input (would move the
      // caret to the start and ruin typing). syncRoomFxPanel writes
      // ctx.roomAnimationRenameInput.value back — skip that by bypassing
      // the sync here; the select/label refresh can happen on next tick
      // via a minimal select repopulation.
      if (ctx.roomAnimationSettingsSelect) {
        ctx.roomAnimationSettingsSelect.replaceChildren();
        for (const def of nextProfile.animations) {
          const opt = document.createElement("option");
          opt.value = def.id;
          opt.textContent = def.name;
          ctx.roomAnimationSettingsSelect.append(opt);
        }
        ctx.roomAnimationSettingsSelect.value = selectedDefinition.id;
      }
      if (ctx.roomAnimationSelect) {
        ctx.roomAnimationSelect.replaceChildren();
        for (const def of nextProfile.animations) {
          const opt = document.createElement("option");
          opt.value = def.id;
          opt.textContent = def.name;
          ctx.roomAnimationSelect.append(opt);
        }
        ctx.roomAnimationSelect.value = state.roomDraft.animationId;
      }
    });

    insideAnimationRenameInput?.addEventListener("input", () => {
      const profile = getInsideFxProfile(state.boardId);
      const selectedDefinition = profile.animations.find((entry) => entry.id === profile.selectedAnimationId)
        ?? profile.animations[0];
      if (!selectedDefinition) return;
      const nextName = sanitizeRenameInput(insideAnimationRenameInput.value, selectedDefinition.name);
      if (nextName === selectedDefinition.name) return;
      const nextProfile = buildInsideProfileWithSelectedAnimationPatch(state.boardId, { name: nextName });
      setInsideFxProfile(state.boardId, nextProfile);
      persistBoardProfiles();
      // Refresh the inside select without clobbering the rename input caret.
      if (ctx.insideAnimationSelect) {
        ctx.insideAnimationSelect.replaceChildren();
        for (const def of nextProfile.animations) {
          const opt = document.createElement("option");
          opt.value = def.id;
          opt.textContent = def.name;
          ctx.insideAnimationSelect.append(opt);
        }
        ctx.insideAnimationSelect.value = selectedDefinition.id;
      }
      refreshGlobalButtons?.();
    });

    outsideAnimationRenameInput?.addEventListener("input", () => {
      const profile = getOutsideFxProfile(state.boardId);
      const editingId = ctx.getOutsideEditingAnimationId?.(state.boardId)
        ?? profile.selectedAnimationId
        ?? profile.animations[0]?.id;
      const selectedDefinition = profile.animations.find((entry) => entry.id === editingId)
        ?? profile.animations[0];
      if (!selectedDefinition) return;
      const nextName = sanitizeRenameInput(outsideAnimationRenameInput.value, selectedDefinition.name);
      if (nextName === selectedDefinition.name) return;
      const nextProfile = buildOutsideProfileWithSelectedAnimationPatch(state.boardId, { name: nextName });
      updateOutsideFxProfile(state.boardId, nextProfile);
      persistBoardProfiles();
      if (ctx.outsideAnimationSelect) {
        ctx.outsideAnimationSelect.replaceChildren();
        for (const def of nextProfile.animations) {
          const opt = document.createElement("option");
          opt.value = def.id;
          opt.textContent = def.name;
          ctx.outsideAnimationSelect.append(opt);
        }
        ctx.outsideAnimationSelect.value = selectedDefinition.id;
      }
      refreshGlobalButtons?.();
    });

    // One-time icon-picker mounts. Each picker's
    // onChange patches definition.icon and persists; syncFxPanel
    // mirrors the selection via setValue (see fx-panels.js).
    const iconPickerApi = window.TT_BEAMER_UI_ICON_PICKER;
    const withDirtyPersist = (mutation) => {
      mutation();
      persistBoardProfiles();
      refreshGlobalButtons?.();
    };

    if (iconPickerApi && ctx.insideIconPicker) {
      iconPickerApi.mount(ctx.insideIconPicker, {
        onChange: (name) => {
          withDirtyPersist(() => {
            const next = buildInsideProfileWithSelectedAnimationPatch(
              state.boardId,
              { icon: name },
            );
            setInsideFxProfile(state.boardId, next);
          });
        },
      });
    }

    if (iconPickerApi && ctx.outsideIconPicker) {
      iconPickerApi.mount(ctx.outsideIconPicker, {
        onChange: (name) => {
          withDirtyPersist(() => {
            const next = buildOutsideProfileWithSelectedAnimationPatch(
              state.boardId,
              { icon: name },
            );
            updateOutsideFxProfile(state.boardId, next);
          });
        },
      });
    }

    if (iconPickerApi && ctx.roomIconPicker) {
      iconPickerApi.mount(ctx.roomIconPicker, {
        onChange: (name) => {
          commitRoomDraftToDefinition({ icon: name });
        },
      });
    }
  }

  // Activate a tab within the nearest enclosing <section>. `anchorEl` can be
  // any element inside the section (typically a button that just fired).
  function switchAnimationSectionTab(anchorEl, tabName) {
    const section = anchorEl?.closest("section");
    if (!section) return;
    for (const btn of section.querySelectorAll(".animation-tab-button[data-animation-tab]")) {
      btn.classList.toggle("is-active", btn.dataset.animationTab === tabName);
    }
    for (const panel of section.querySelectorAll("[data-animation-tab-panel]")) {
      panel.hidden = panel.dataset.animationTabPanel !== tabName;
    }
  }

  window.TT_BEAMER_RUNTIME_WIRE_FX_PANEL_BINDERS = {
    wireFxPanelBinders,
  };
})();
