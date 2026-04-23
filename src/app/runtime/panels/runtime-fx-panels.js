// Phase 14-2: FX panel syncs module.
//
// Owns the inside/room/outside FX panel DOM sync + editor-draft
// helpers: syncInsideFxPanel / syncRoomFxPanel / syncOutsideFxPanel,
// their resource pickers, editor draft storage helpers,
// buildInsideProfileWithSelectedAnimationPatch /
// buildOutsideProfileWithSelectedAnimationPatch, the outside runtime
// mirror (syncOutsideRuntimeMirror), plus getRoomAnimationLabelById
// and loadOutsideResourceAssets.
//
// Dependencies injected via ctx (large DOM surface — these panels
// write the entire settings UI in lockstep with state).
(() => {
  let ctx = null;

  // Phase 20: separate "which outside animation am I editing" from
  // "which outside animation is currently playing". The dropdown in the
  // Outside editor updates this UI-only map, not the persisted
  // selectedAnimationId — switching the dropdown must not swap the live
  // animation. Only actual parameter edits to the *running* animation
  // propagate live (via buildOutsideProfileWithSelectedAnimationPatch).
  const outsideEditingAnimationIdByBoard = {};

  function getOutsideEditingAnimationId(boardId) {
    const effective = boardId ?? ctx.state.boardId;
    return outsideEditingAnimationIdByBoard[effective] ?? null;
  }

  function setOutsideEditingAnimationId(boardId, animationId) {
    const effective = boardId ?? ctx.state.boardId;
    outsideEditingAnimationIdByBoard[effective] = animationId;
  }

  function init(dependencies) {
    ctx = dependencies;
  }

  // Phase 15-9: shared sound-selector dropdown populator. Each
  // animation editor block has a <select> for picking the sound that
  // plays when the animation fires. Options are "(kein Sound)" plus
  // every path in ALL_SOUND_ASSET_PATHS. Selection defaults to the
  // definition's current soundAssetRef or the SOUND_MAPPING_NONE
  // sentinel.
  function populateSoundRefSelect(selectEl, selectedValue) {
    if (!selectEl) return;
    const noneSentinel = ctx.SOUND_MAPPING_NONE ?? "none";
    const allPaths = Array.isArray(ctx.ALL_SOUND_ASSET_PATHS) ? ctx.ALL_SOUND_ASSET_PATHS : [];
    selectEl.replaceChildren();
    const noneOption = document.createElement("option");
    noneOption.value = noneSentinel;
    noneOption.textContent = "(no sound)";
    selectEl.append(noneOption);
    for (const path of allPaths) {
      const option = document.createElement("option");
      option.value = path;
      option.textContent = path.split("/").pop() || path;
      selectEl.append(option);
    }
    const effectiveValue = selectedValue && (selectedValue === noneSentinel || allPaths.includes(selectedValue))
      ? selectedValue
      : noneSentinel;
    selectEl.value = effectiveValue;
  }

  function syncOutsideModeDirectionVisibility(definition) {
    const visible = ctx.isOutsideModeDirectionApplicable(definition);
    ctx.setConditionalFieldMounted(ctx.outsideModeFieldMount, visible);
    ctx.setConditionalFieldMounted(ctx.outsideDirectionFieldMount, visible);
    if (ctx.outsideAnimationsPanel) {
      ctx.outsideAnimationsPanel.dataset.outsideModeDirectionVisible = visible ? "true" : "false";
    }
    if (ctx.outsideModeField) {
      ctx.outsideModeField.hidden = false;
      ctx.outsideModeField.setAttribute("aria-hidden", "false");
    }
    if (ctx.outsideDirectionField) {
      ctx.outsideDirectionField.hidden = false;
      ctx.outsideDirectionField.setAttribute("aria-hidden", "false");
    }
    if (ctx.outsideModeInput) {
      if (!visible) {
        ctx.outsideModeInput.value = "standard";
      }
      ctx.outsideModeInput.disabled = !visible;
    }
    if (ctx.outsideDirectionInput) {
      if (!visible) {
        ctx.outsideDirectionInput.value = "forward";
      }
      ctx.outsideDirectionInput.disabled = !visible;
    }
  }

  function buildInsideProfileWithSelectedAnimationPatch(boardId, patch = {}, profileOverride = null) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const baseProfile = ctx.normalizeInsideFxProfile(profileOverride ?? ctx.getInsideFxProfile(effectiveBoardId));
    const selectedDefinition =
      baseProfile.animations.find((entry) => entry.id === baseProfile.selectedAnimationId) ?? baseProfile.animations[0];
    if (!selectedDefinition) {
      return baseProfile;
    }
    const nextAnimations = baseProfile.animations.map((entry) => {
      if (entry.id !== selectedDefinition.id) {
        return entry;
      }
      return ctx.normalizeInsideAnimationDefinition({
        ...entry,
        ...patch,
      });
    });
    return ctx.normalizeInsideFxProfile({
      ...baseProfile,
      selectedAnimationId: selectedDefinition.id,
      animations: nextAnimations,
    });
  }

  function syncInsideResourcePicker(assetTypeOverride = null, selectedAssetRef = "") {
    if (!ctx.insideResourceSelect) {
      return;
    }
    const assetType = ctx.normalizeInsideAssetType(assetTypeOverride ?? ctx.insideAssetTypeInput?.value);
    const candidateAssets = ctx.getInsideAssetCandidates(assetType);
    ctx.insideResourceSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent =
      candidateAssets.length > 0
        ? assetType === "coded"
          ? "Select coded renderer key…"
          : `Select ${assetType.toUpperCase()} resource asset…`
        : assetType === "coded"
          ? "No coded renderer keys available"
          : `No ${assetType.toUpperCase()} resource assets available`;
    ctx.insideResourceSelect.append(placeholder);
    for (const assetPath of candidateAssets) {
      const option = document.createElement("option");
      option.value = assetPath;
      option.textContent = assetType === "coded" ? assetPath : assetPath.replace(/^\//, "");
      ctx.insideResourceSelect.append(option);
    }
    ctx.insideResourceSelect.value = candidateAssets.includes(selectedAssetRef) ? selectedAssetRef : "";
  }

  function getInsideEditorDraft(boardId, selectedDefinition = null) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const definition = selectedDefinition ?? ctx.getSelectedInsideAnimationDefinition(effectiveBoardId);
    if (!definition) {
      delete ctx.insideEditorDraftByBoard[effectiveBoardId];
      return null;
    }
    const existing = ctx.insideEditorDraftByBoard[effectiveBoardId];
    if (existing && existing.animationId === definition.id) {
      return existing;
    }
    const next = {
      animationId: definition.id,
      intensity: ctx.clampOutsideIntensity(definition.intensity),
      speed: ctx.clampOutsideSpeed(definition.speed),
      assetType: ctx.normalizeInsideAssetType(definition.assetType),
      assetRef: String(definition.assetRef || "").trim(),
      loopUntilStopped: Boolean(definition.loopUntilStopped),
      soundAssetRef: String(definition.soundAssetRef || ctx.SOUND_MAPPING_NONE),
    };
    ctx.insideEditorDraftByBoard[effectiveBoardId] = next;
    return next;
  }

  function setInsideEditorDraft(boardId, partial = {}) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const base = getInsideEditorDraft(effectiveBoardId);
    if (!base) {
      return null;
    }
    const next = {
      ...base,
      ...partial,
      intensity: ctx.clampOutsideIntensity(partial?.intensity ?? base.intensity),
      speed: ctx.clampOutsideSpeed(partial?.speed ?? base.speed),
      assetType: ctx.normalizeInsideAssetType(partial?.assetType ?? base.assetType),
      assetRef: String(partial?.assetRef ?? base.assetRef ?? "").trim(),
      loopUntilStopped: Boolean(partial?.loopUntilStopped ?? base.loopUntilStopped),
    };
    ctx.insideEditorDraftByBoard[effectiveBoardId] = next;
    return next;
  }

  function collectInsideEditorDraftFromInputs(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const assetType = ctx.normalizeInsideAssetType(ctx.insideAssetTypeInput?.value);
    const assetRef = ctx.normalizeInsideAssetRefForType(
      assetType,
      String(ctx.insideAssetRefInput?.value || "").trim(),
    );
    // Phase 15-9: carry per-definition sound selection through the draft.
    const soundAssetRef = String(ctx.insideSoundRefSelect?.value || ctx.SOUND_MAPPING_NONE);
    return setInsideEditorDraft(effectiveBoardId, {
      intensity: ctx.clampOutsideIntensity(ctx.insideIntensityInput?.value),
      speed: ctx.clampOutsideSpeed(ctx.insideSpeedInput?.value),
      assetType,
      assetRef,
      soundAssetRef,
      loopUntilStopped: Boolean(ctx.insideLoopUntilStopInput?.checked),
    });
  }

  function syncInsideFxPanel() {
    // Phase 22 W3b-5: legacy "Inside Animations" sidebar panel removed.
    // When its DOM roots are gone, the full-page animation editor owns
    // the per-animation UI and this sync is a no-op.
    if (!ctx.insideAnimationSelect && !ctx.insideIntensityInput) return;
    const state = ctx.state;
    const inside = ctx.getInsideFxProfile(state.boardId);
    const selectedDefinition = ctx.getSelectedInsideAnimationDefinition(state.boardId);
    const draft = getInsideEditorDraft(state.boardId, selectedDefinition);
    if (ctx.insideAnimationSelect) {
      ctx.insideAnimationSelect.replaceChildren();
      for (const definition of inside.animations) {
        const option = document.createElement("option");
        option.value = definition.id;
        option.textContent = definition.name;
        ctx.insideAnimationSelect.append(option);
      }
      ctx.insideAnimationSelect.value = selectedDefinition?.id ?? inside.animations[0]?.id ?? "";
    }
    // Phase 21-1: keep the rename input in sync with the selected def.
    if (ctx.insideAnimationRenameInput) {
      ctx.insideAnimationRenameInput.value = selectedDefinition?.name ?? "";
    }
    // Phase 22 W3a: reflect selected definition's icon in the picker.
    // The picker's onChange was already wired at init in the binders.
    const iconPickerApi = window.TT_BEAMER_UI_ICON_PICKER;
    if (iconPickerApi && ctx.insideIconPicker) {
      const api = iconPickerApi.mount(ctx.insideIconPicker);
      api?.setValue(selectedDefinition?.icon ?? null);
    }
    // Phase 18-2: update mode indicator badge
    if (ctx.insideModeIndicator) {
      if (selectedDefinition) {
        ctx.insideModeIndicator.textContent = `Editing: ${selectedDefinition.name}`;
        ctx.insideModeIndicator.dataset.mode = "editing";
      } else {
        ctx.insideModeIndicator.textContent = "Creating new animation";
        ctx.insideModeIndicator.dataset.mode = "creating";
      }
    }
    const intensity = draft?.intensity ?? selectedDefinition?.intensity ?? inside.intensity;
    const speed = draft?.speed ?? selectedDefinition?.speed ?? inside.speed;
    const assetType = ctx.normalizeInsideAssetType(draft?.assetType ?? selectedDefinition?.assetType ?? inside.assetType);
    const assetRef = ctx.normalizeInsideAssetRefForType(
      assetType,
      draft?.assetRef ?? selectedDefinition?.assetRef ?? inside.assetRef ?? "",
      selectedDefinition?.assetRef ?? inside.assetRef ?? "",
    );
    if (draft && (draft.assetType !== assetType || draft.assetRef !== assetRef)) {
      setInsideEditorDraft(state.boardId, { assetType, assetRef });
    }
    ctx.insideIntensityInput.value = String(intensity);
    ctx.insideSpeedInput.value = String(speed);
    if (ctx.insideAssetTypeInput) {
      ctx.insideAssetTypeInput.value = assetType;
    }
    if (ctx.insideAssetRefInput) {
      ctx.insideAssetRefInput.value = assetRef;
    }
    if (ctx.insideLoopUntilStopInput) {
      ctx.insideLoopUntilStopInput.checked = Boolean(
        draft?.loopUntilStopped
        ?? selectedDefinition?.loopUntilStopped
        ?? inside.loopUntilStopped,
      );
    }
    syncInsideResourcePicker(assetType, assetRef);
    populateSoundRefSelect(
      ctx.insideSoundRefSelect,
      draft?.soundAssetRef ?? selectedDefinition?.soundAssetRef,
    );
    ctx.insideIntensityValue.textContent = intensity.toFixed(2);
    ctx.insideSpeedValue.textContent = `${speed.toFixed(2)}x`;
    renderInsideGlobalButtons();
  }

  function renderInsideGlobalButtons() {
    if (!ctx.insideGlobalButtons) {
      return;
    }
    const inside = ctx.getInsideFxProfile(ctx.state.boardId);
    ctx.insideGlobalButtons.replaceChildren();
    for (const definition of inside.animations) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.global = definition.id;
      button.textContent = definition.name;
      ctx.insideGlobalButtons.append(button);
    }
  }

  // Phase 20: one dashboard button per outside animation definition.
  function renderOutsideGlobalButtons() {
    if (!ctx.outsideGlobalButtons) {
      return;
    }
    const outside = ctx.getOutsideFxProfile(ctx.state.boardId);
    ctx.outsideGlobalButtons.replaceChildren();
    for (const definition of outside.animations) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.global = definition.id;
      button.dataset.globalScope = "outside";
      button.textContent = definition.name;
      ctx.outsideGlobalButtons.append(button);
    }
  }

  function getRoomAnimationLabelById(animationId, boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const definition = ctx.getRoomAnimationDefinitionById(animationId, effectiveBoardId);
    if (definition?.name) {
      return definition.name;
    }
    return ctx.ROOM_ANIMATIONS.find((item) => item.id === animationId)?.label ?? animationId;
  }

  function syncRoomResourcePicker(assetTypeOverride = null, selectedAssetRef = "") {
    if (!ctx.roomResourceSelect) {
      return;
    }
    const assetType = ctx.normalizeRoomAssetType(assetTypeOverride ?? ctx.roomAssetTypeInput?.value);
    const candidateAssets = ctx.getRoomAssetCandidates(assetType);
    ctx.roomResourceSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent =
      candidateAssets.length > 0
        ? assetType === "coded"
          ? "Select coded renderer key…"
          : `Select ${assetType.toUpperCase()} resource asset…`
        : assetType === "coded"
          ? "No coded renderer keys available"
          : `No ${assetType.toUpperCase()} resource assets available`;
    ctx.roomResourceSelect.append(placeholder);
    for (const assetPath of candidateAssets) {
      const option = document.createElement("option");
      option.value = assetPath;
      option.textContent = assetType === "coded" ? assetPath : assetPath.replace(/^\//, "");
      ctx.roomResourceSelect.append(option);
    }
    ctx.roomResourceSelect.value = candidateAssets.includes(selectedAssetRef) ? selectedAssetRef : "";
  }

  function getRoomEditorDraft(boardId, selectedDefinition = null) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const definition = selectedDefinition ?? ctx.getSelectedRoomAnimationDefinition(effectiveBoardId);
    if (!definition) {
      delete ctx.roomEditorDraftByBoard[effectiveBoardId];
      return null;
    }
    const existing = ctx.roomEditorDraftByBoard[effectiveBoardId];
    if (existing && existing.animationId === definition.id) {
      return existing;
    }
    const next = {
      animationId: definition.id,
      assetType: ctx.normalizeRoomAssetType(definition.assetType),
      assetRef: String(definition.assetRef || "").trim(),
      soundAssetRef: String(definition.soundAssetRef || ctx.SOUND_MAPPING_NONE),
      // Phase 15-3: transform options
      rotationDeg: Number(definition.rotationDeg) || 0,
      stretchToPolygon: definition.stretchToPolygon !== false,
      widthScale: Number.isFinite(Number(definition.widthScale)) ? Number(definition.widthScale) : 1,
      heightScale: Number.isFinite(Number(definition.heightScale)) ? Number(definition.heightScale) : 1,
      offsetXScale: Number(definition.offsetXScale) || 0,
      offsetYScale: Number(definition.offsetYScale) || 0,
      // Phase 21-1: opt-in hull-flicker ⇒ cuts concurrent solid-color in room.
      breaksSolidColor: Boolean(definition.breaksSolidColor),
    };
    ctx.roomEditorDraftByBoard[effectiveBoardId] = next;
    return next;
  }

  function setRoomEditorDraft(boardId, partial = {}) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const base = getRoomEditorDraft(effectiveBoardId);
    if (!base) {
      return null;
    }
    const next = {
      ...base,
      ...partial,
      assetType: ctx.normalizeRoomAssetType(partial?.assetType ?? base.assetType),
      assetRef: String(partial?.assetRef ?? base.assetRef ?? "").trim(),
    };
    ctx.roomEditorDraftByBoard[effectiveBoardId] = next;
    return next;
  }

  function collectRoomEditorDraftFromInputs(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const assetType = ctx.normalizeRoomAssetType(ctx.roomAssetTypeInput?.value);
    const assetRef = ctx.normalizeRoomAssetRefForType(
      assetType,
      String(ctx.roomAssetRefInput?.value || "").trim(),
    );
    // Phase 15-9: carry per-definition sound selection through the draft.
    const soundAssetRef = String(ctx.roomSoundRefSelect?.value || ctx.SOUND_MAPPING_NONE);
    // Phase 15-3: carry transform options through the draft.
    const rotationDeg = Number(ctx.roomRotationDegInput?.value) || 0;
    const stretchToPolygon = ctx.roomStretchToPolygonInput
      ? Boolean(ctx.roomStretchToPolygonInput.checked)
      : true;
    const widthScale = Number(ctx.roomWidthScaleInput?.value) || 1;
    const heightScale = Number(ctx.roomHeightScaleInput?.value) || 1;
    const offsetXScale = Number(ctx.roomOffsetXScaleInput?.value) || 0;
    const offsetYScale = Number(ctx.roomOffsetYScaleInput?.value) || 0;
    const opacity = Number(ctx.roomDefOpacityInput?.value) || 0.9;
    const intensity = Number(ctx.roomDefIntensityInput?.value) || 0.8;
    const speed = Number(ctx.roomDefSpeedInput?.value) || 1;
    const soundVolume = (Number(ctx.roomDefSoundVolumeInput?.value) || 100) / 100;
    const breaksSolidColor = ctx.roomBreaksSolidColorInput
      ? Boolean(ctx.roomBreaksSolidColorInput.checked)
      : undefined;
    return setRoomEditorDraft(effectiveBoardId, {
      assetType,
      assetRef,
      soundAssetRef,
      rotationDeg,
      stretchToPolygon,
      widthScale,
      heightScale,
      offsetXScale,
      offsetYScale,
      opacity,
      intensity,
      speed,
      soundVolume,
      ...(breaksSolidColor !== undefined ? { breaksSolidColor } : {}),
    });
  }

  function syncRoomFxPanel() {
    // Phase 22 W3b-5 fix: the Dashboard's "Room animation" picker
    // (#room-animation-select) is populated by this function too —
    // not just the removed sidebar panel. Every write below is
    // already null-guarded per target, so let the function run even
    // when the legacy sidebar DOM is gone.
    const state = ctx.state;
    const roomFx = ctx.getRoomFxProfile(state.boardId);
    const selectedDefinition = ctx.getSelectedRoomAnimationDefinition(state.boardId);
    const draft = getRoomEditorDraft(state.boardId, selectedDefinition);

    if (ctx.roomAnimationSettingsSelect) {
      ctx.roomAnimationSettingsSelect.replaceChildren();
      for (const definition of roomFx.animations) {
        const option = document.createElement("option");
        option.value = definition.id;
        option.textContent = definition.name;
        ctx.roomAnimationSettingsSelect.append(option);
      }
      ctx.roomAnimationSettingsSelect.value = selectedDefinition?.id ?? roomFx.animations[0]?.id ?? "";
    }
    // Phase 18-2: update mode indicator badge and delete button visibility
    if (ctx.roomModeIndicator) {
      if (selectedDefinition) {
        ctx.roomModeIndicator.textContent = `Editing: ${selectedDefinition.name}`;
        ctx.roomModeIndicator.dataset.mode = "editing";
      } else {
        ctx.roomModeIndicator.textContent = "Creating new animation";
        ctx.roomModeIndicator.dataset.mode = "creating";
      }
    }
    if (ctx.roomAnimationSettingsDeleteButton) {
      ctx.roomAnimationSettingsDeleteButton.hidden = !selectedDefinition || roomFx.animations.length <= 1;
    }
    // Phase 21-1: keep the rename input in sync with the selected def.
    if (ctx.roomAnimationRenameInput) {
      ctx.roomAnimationRenameInput.value = selectedDefinition?.name ?? "";
    }
    // Phase 22 W3a: reflect selected room definition's icon in the picker.
    const roomIconPickerApi = window.TT_BEAMER_UI_ICON_PICKER;
    if (roomIconPickerApi && ctx.roomIconPicker) {
      const api = roomIconPickerApi.mount(ctx.roomIconPicker);
      api?.setValue(selectedDefinition?.icon ?? null);
    }

    if (ctx.roomAnimationSelect) {
      ctx.roomAnimationSelect.replaceChildren();
      for (const definition of roomFx.animations) {
        const option = document.createElement("option");
        option.value = definition.id;
        option.textContent = definition.name;
        ctx.roomAnimationSelect.append(option);
      }
      const selectedDraftId = ctx.normalizeRoomAnimationId(
        state.roomDraft.animationId,
        selectedDefinition?.id ?? roomFx.animations[0]?.id ?? "kaputt",
      );
      const validSelectedDraftId = roomFx.animations.some((entry) => entry.id === selectedDraftId)
        ? selectedDraftId
        : roomFx.animations[0]?.id ?? "kaputt";
      state.roomDraft.animationId = validSelectedDraftId;
      ctx.roomAnimationSelect.value = validSelectedDraftId;
    }

    const assetType = ctx.normalizeRoomAssetType(draft?.assetType ?? selectedDefinition?.assetType);
    const assetRef = ctx.normalizeRoomAssetRefForType(
      assetType,
      draft?.assetRef ?? selectedDefinition?.assetRef ?? "",
      selectedDefinition?.assetRef ?? "",
    );
    if (draft && (draft.assetType !== assetType || draft.assetRef !== assetRef)) {
      setRoomEditorDraft(state.boardId, { assetType, assetRef });
    }
    if (ctx.roomAssetTypeInput) {
      ctx.roomAssetTypeInput.value = assetType;
    }
    if (ctx.roomAssetRefInput) {
      ctx.roomAssetRefInput.value = assetRef;
    }
    if (ctx.roomAnimationSettingsDeleteButton) {
      ctx.roomAnimationSettingsDeleteButton.disabled = roomFx.animations.length <= 1;
    }
    syncRoomResourcePicker(assetType, assetRef);
    populateSoundRefSelect(
      ctx.roomSoundRefSelect,
      draft?.soundAssetRef ?? selectedDefinition?.soundAssetRef,
    );
    // Phase 15-3: sync transform inputs from the draft / definition.
    const rotationDeg = Number(
      draft?.rotationDeg ?? selectedDefinition?.rotationDeg ?? 0,
    );
    const stretchToPolygon = draft?.stretchToPolygon !== undefined
      ? Boolean(draft.stretchToPolygon)
      : (selectedDefinition?.stretchToPolygon !== false);
    const widthScale = Number(
      draft?.widthScale ?? selectedDefinition?.widthScale ?? 1,
    );
    const heightScale = Number(
      draft?.heightScale ?? selectedDefinition?.heightScale ?? 1,
    );
    const offsetXScale = Number(
      draft?.offsetXScale ?? selectedDefinition?.offsetXScale ?? 0,
    );
    const offsetYScale = Number(
      draft?.offsetYScale ?? selectedDefinition?.offsetYScale ?? 0,
    );
    if (ctx.roomRotationDegInput) {
      ctx.roomRotationDegInput.value = String(rotationDeg);
    }
    if (ctx.roomRotationDegValue) {
      ctx.roomRotationDegValue.textContent = String(Math.round(rotationDeg));
    }
    if (ctx.roomStretchToPolygonInput) {
      ctx.roomStretchToPolygonInput.checked = stretchToPolygon;
    }
    if (ctx.roomWidthScaleInput) {
      ctx.roomWidthScaleInput.value = String(widthScale);
      ctx.roomWidthScaleInput.disabled = stretchToPolygon;
    }
    if (ctx.roomWidthScaleValue) {
      ctx.roomWidthScaleValue.textContent = widthScale.toFixed(2);
    }
    if (ctx.roomHeightScaleInput) {
      ctx.roomHeightScaleInput.value = String(heightScale);
      ctx.roomHeightScaleInput.disabled = stretchToPolygon;
    }
    if (ctx.roomHeightScaleValue) {
      ctx.roomHeightScaleValue.textContent = heightScale.toFixed(2);
    }
    if (ctx.roomOffsetXScaleInput) {
      ctx.roomOffsetXScaleInput.value = String(offsetXScale);
      ctx.roomOffsetXScaleInput.disabled = stretchToPolygon;
    }
    if (ctx.roomOffsetXScaleValue) {
      ctx.roomOffsetXScaleValue.textContent = offsetXScale.toFixed(2);
    }
    if (ctx.roomOffsetYScaleInput) {
      ctx.roomOffsetYScaleInput.value = String(offsetYScale);
      ctx.roomOffsetYScaleInput.disabled = stretchToPolygon;
    }
    if (ctx.roomOffsetYScaleValue) {
      ctx.roomOffsetYScaleValue.textContent = offsetYScale.toFixed(2);
    }
    if (ctx.roomTransformDetails) {
      const isTransformable = assetType === "gif" || assetType === "mp4";
      ctx.roomTransformDetails.hidden = !isTransformable;
    }
    const defOpacity = Number(draft?.opacity ?? selectedDefinition?.opacity ?? 0.9);
    const defIntensity = Number(draft?.intensity ?? selectedDefinition?.intensity ?? 0.8);
    const defSpeed = Number(draft?.speed ?? selectedDefinition?.speed ?? 1);
    const defSoundVolume = Number(draft?.soundVolume ?? selectedDefinition?.soundVolume ?? 1);
    if (ctx.roomDefOpacityInput) {
      ctx.roomDefOpacityInput.value = String(defOpacity);
    }
    if (ctx.roomDefOpacityValue) {
      ctx.roomDefOpacityValue.textContent = defOpacity.toFixed(2);
    }
    if (ctx.roomDefIntensityInput) {
      ctx.roomDefIntensityInput.value = String(defIntensity);
    }
    if (ctx.roomDefIntensityValue) {
      ctx.roomDefIntensityValue.textContent = defIntensity.toFixed(2);
    }
    if (ctx.roomDefSpeedInput) {
      ctx.roomDefSpeedInput.value = String(defSpeed);
    }
    if (ctx.roomDefSpeedValue) {
      ctx.roomDefSpeedValue.textContent = `${defSpeed.toFixed(2)}x`;
    }
    if (ctx.roomDefSoundVolumeInput) {
      ctx.roomDefSoundVolumeInput.value = String(Math.round(defSoundVolume * 100));
    }
    if (ctx.roomDefSoundVolumeValue) {
      ctx.roomDefSoundVolumeValue.textContent = `${Math.round(defSoundVolume * 100)}%`;
    }
    // Phase 21-1: breaksSolidColor checkbox — only meaningful on the
    // hull-flicker coded backbone. Hidden for every other animation so it
    // doesn't pollute unrelated editors.
    if (ctx.roomBreaksSolidColorInput || ctx.roomBreaksSolidColorLabel) {
      const resolvedAssetRef = ctx.resolveRoomCodedEffectType(
        assetRef || selectedDefinition?.assetRef || "",
      );
      const isHullFlicker = assetType === "coded" && resolvedAssetRef === "hull-flicker";
      if (ctx.roomBreaksSolidColorLabel) {
        ctx.roomBreaksSolidColorLabel.style.display = isHullFlicker ? "" : "none";
      }
      if (ctx.roomBreaksSolidColorInput) {
        const currentValue = Boolean(
          draft?.breaksSolidColor ?? selectedDefinition?.breaksSolidColor ?? false,
        );
        ctx.roomBreaksSolidColorInput.checked = currentValue;
      }
    }
  }

  function buildOutsideProfileWithSelectedAnimationPatch(boardId, patch = {}, profileOverride = null) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const baseProfile = ctx.normalizeOutsideFxProfile(profileOverride ?? ctx.getOutsideFxProfile(effectiveBoardId));
    // Phase 20: edits land on the definition the user is currently *editing*
    // (driven by the UI-only editing map), not the one that happens to be
    // marked as selectedAnimationId. Preserve the persisted
    // selectedAnimationId so the running animation isn't disturbed.
    const editingId = getOutsideEditingAnimationId(effectiveBoardId)
      ?? baseProfile.selectedAnimationId
      ?? baseProfile.animations[0]?.id
      ?? null;
    const editingDefinition =
      baseProfile.animations.find((entry) => entry.id === editingId) ?? baseProfile.animations[0];
    if (!editingDefinition) {
      return baseProfile;
    }
    const nextAnimations = baseProfile.animations.map((entry) => {
      if (entry.id !== editingDefinition.id) {
        return entry;
      }
      return ctx.normalizeOutsideAnimationDefinition({
        ...entry,
        ...patch,
      });
    });
    return ctx.normalizeOutsideFxProfile({
      ...baseProfile,
      // Preserve the previously selected animation — only the animation
      // definitions themselves get patched. The caller may override this
      // through the returned profile if they really intend to swap.
      selectedAnimationId: baseProfile.selectedAnimationId ?? editingDefinition.id,
      animations: nextAnimations,
    });
  }

  function syncOutsideResourcePicker(assetTypeOverride = null, selectedAssetRef = "") {
    if (!ctx.outsideResourceSelect) {
      return;
    }
    const assetType = ctx.normalizeOutsideAssetType(assetTypeOverride ?? ctx.outsideAssetTypeInput?.value);
    const candidateAssets = ctx.getOutsideAssetCandidates(assetType);
    ctx.outsideResourceSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent =
      candidateAssets.length > 0
        ? assetType === "coded"
          ? "Select coded renderer key…"
          : `Select ${assetType.toUpperCase()} resource asset…`
        : assetType === "coded"
          ? "No coded renderer keys available"
          : `No ${assetType.toUpperCase()} resource assets available`;
    ctx.outsideResourceSelect.append(placeholder);
    for (const assetPath of candidateAssets) {
      const option = document.createElement("option");
      option.value = assetPath;
      option.textContent = assetType === "coded" ? assetPath : assetPath.replace(/^\//, "");
      ctx.outsideResourceSelect.append(option);
    }
    ctx.outsideResourceSelect.value = candidateAssets.includes(selectedAssetRef) ? selectedAssetRef : "";
  }

  async function loadOutsideResourceAssets() {
    try {
      const response = await fetch("/api/resources");
      if (!response.ok) {
        throw new Error(`resource list failed (${response.status})`);
      }
      const payload = await response.json();
      const files = Array.isArray(payload?.files) ? payload.files : [];
      ctx.setOutsideResourceAssets(
        files
          .map((entry) => String(entry || "").trim())
          .filter((entry) => entry.startsWith("/resources/") && /\.(gif|mp4)$/i.test(entry))
          .sort(),
      );
    } catch {
      ctx.setOutsideResourceAssets([]);
    }
    syncOutsideResourcePicker(ctx.outsideAssetTypeInput?.value, String(ctx.outsideAssetRefInput?.value || "").trim());
    syncInsideResourcePicker(ctx.insideAssetTypeInput?.value, String(ctx.insideAssetRefInput?.value || "").trim());
    syncRoomResourcePicker(ctx.roomAssetTypeInput?.value, String(ctx.roomAssetRefInput?.value || "").trim());
  }

  function getOutsideEditorDraft(boardId, selectedDefinition = null) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const definition = selectedDefinition ?? ctx.getSelectedOutsideAnimationDefinition(effectiveBoardId);
    if (!definition) {
      delete ctx.outsideEditorDraftByBoard[effectiveBoardId];
      return null;
    }
    const existing = ctx.outsideEditorDraftByBoard[effectiveBoardId];
    if (existing && existing.animationId === definition.id) {
      return existing;
    }
    const next = {
      animationId: definition.id,
      intensity: ctx.clampOutsideIntensity(definition.intensity),
      speed: ctx.clampOutsideSpeed(definition.speed),
      mode: ctx.normalizeOutsideMode(definition.mode),
      direction: ctx.normalizeOutsideDirection(definition.direction),
      assetType: ctx.normalizeOutsideAssetType(definition.assetType),
      assetRef: String(definition.assetRef || "").trim(),
      soundAssetRef: String(definition.soundAssetRef || ctx.SOUND_MAPPING_NONE),
    };
    ctx.outsideEditorDraftByBoard[effectiveBoardId] = next;
    return next;
  }

  function setOutsideEditorDraft(boardId, partial = {}) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const base = getOutsideEditorDraft(effectiveBoardId);
    if (!base) {
      return null;
    }
    const next = {
      ...base,
      ...partial,
      intensity: ctx.clampOutsideIntensity(partial?.intensity ?? base.intensity),
      speed: ctx.clampOutsideSpeed(partial?.speed ?? base.speed),
      mode: ctx.normalizeOutsideMode(partial?.mode ?? base.mode),
      direction: ctx.normalizeOutsideDirection(partial?.direction ?? base.direction),
      assetType: ctx.normalizeOutsideAssetType(partial?.assetType ?? base.assetType),
      assetRef: String(partial?.assetRef ?? base.assetRef ?? "").trim(),
    };
    ctx.outsideEditorDraftByBoard[effectiveBoardId] = next;
    return next;
  }

  function collectOutsideEditorDraftFromInputs(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const assetType = ctx.normalizeOutsideAssetType(ctx.outsideAssetTypeInput?.value);
    const assetRef = ctx.normalizeOutsideAssetRefForType(
      assetType,
      String(ctx.outsideAssetRefInput?.value || "").trim(),
    );
    const allowModeDirection = ctx.isOutsideModeDirectionApplicable({ assetType, assetRef });
    // Phase 15-9: carry per-definition sound selection through the draft.
    const soundAssetRef = String(ctx.outsideSoundRefSelect?.value || ctx.SOUND_MAPPING_NONE);
    return setOutsideEditorDraft(effectiveBoardId, {
      intensity: ctx.clampOutsideIntensity(ctx.outsideIntensityInput?.value),
      speed: ctx.clampOutsideSpeed(ctx.outsideSpeedInput?.value),
      mode: allowModeDirection ? ctx.normalizeOutsideMode(ctx.outsideModeInput?.value) : "standard",
      direction: allowModeDirection ? ctx.normalizeOutsideDirection(ctx.outsideDirectionInput?.value) : "forward",
      assetType,
      assetRef,
      soundAssetRef,
    });
  }

  function syncOutsideDraftVisibilityFromInputs(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const assetType = ctx.normalizeOutsideAssetType(ctx.outsideAssetTypeInput?.value);
    const assetRef = ctx.normalizeOutsideAssetRefForType(assetType, String(ctx.outsideAssetRefInput?.value || "").trim());
    setOutsideEditorDraft(effectiveBoardId, {
      assetType,
      assetRef,
    });
    if (ctx.outsideAssetRefInput) {
      ctx.outsideAssetRefInput.value = assetRef;
    }
    syncOutsideModeDirectionVisibility({ assetType, assetRef });
    syncOutsideResourcePicker(assetType, assetRef);
  }

  function syncOutsideFxPanel() {
    // Phase 22 W3b-5: legacy "Outside Animations" sidebar panel removed.
    if (!ctx.outsideAnimationSelect && !ctx.outsideEnabledInput) return;
    const state = ctx.state;
    const outside = ctx.getOutsideFxProfile(state.boardId);
    // Phase 20: the editor shows the animation tracked by the per-board
    // UI-only `outsideEditingAnimationIdByBoard` — independent of the
    // persisted `selectedAnimationId` that determines what actually
    // plays when outside FX is enabled.
    const editingId = getOutsideEditingAnimationId(state.boardId)
      ?? outside.selectedAnimationId
      ?? outside.animations[0]?.id
      ?? null;
    const selectedDefinition = outside.animations.find((a) => a.id === editingId)
      ?? outside.animations[0]
      ?? null;
    const draft = getOutsideEditorDraft(state.boardId, selectedDefinition);
    if (ctx.outsideAnimationSelect) {
      ctx.outsideAnimationSelect.replaceChildren();
      for (const definition of outside.animations) {
        const option = document.createElement("option");
        option.value = definition.id;
        option.textContent = definition.name;
        ctx.outsideAnimationSelect.append(option);
      }
      ctx.outsideAnimationSelect.value = selectedDefinition?.id ?? outside.animations[0]?.id ?? "";
    }
    // Phase 21-1: keep the rename input in sync with the currently-edited def.
    if (ctx.outsideAnimationRenameInput) {
      ctx.outsideAnimationRenameInput.value = selectedDefinition?.name ?? "";
    }
    // Phase 22 W3a: reflect selected outside definition's icon in the picker.
    const outsideIconPickerApi = window.TT_BEAMER_UI_ICON_PICKER;
    if (outsideIconPickerApi && ctx.outsideIconPicker) {
      const api = outsideIconPickerApi.mount(ctx.outsideIconPicker);
      api?.setValue(selectedDefinition?.icon ?? null);
    }
    // Phase 18-2: update mode indicator badge
    if (ctx.outsideModeIndicator) {
      if (selectedDefinition) {
        ctx.outsideModeIndicator.textContent = `Editing: ${selectedDefinition.name}`;
        ctx.outsideModeIndicator.dataset.mode = "editing";
      } else {
        ctx.outsideModeIndicator.textContent = "Creating new animation";
        ctx.outsideModeIndicator.dataset.mode = "creating";
      }
    }
    ctx.outsideEnabledInput.checked = outside.enabled;
    const intensity = draft?.intensity ?? selectedDefinition?.intensity ?? outside.intensity;
    const speed = draft?.speed ?? selectedDefinition?.speed ?? outside.speed;
    const mode = ctx.isOutsideModeDirectionApplicable(selectedDefinition)
      ? draft?.mode ?? selectedDefinition?.mode ?? outside.mode
      : "standard";
    const direction = ctx.isOutsideModeDirectionApplicable(selectedDefinition)
      ? draft?.direction ?? selectedDefinition?.direction ?? outside.direction
      : "forward";
    const assetType = ctx.normalizeOutsideAssetType(draft?.assetType ?? selectedDefinition?.assetType ?? outside.assetType);
    const assetRef = ctx.normalizeOutsideAssetRefForType(
      assetType,
      draft?.assetRef ?? selectedDefinition?.assetRef ?? outside.assetRef ?? "",
      selectedDefinition?.assetRef ?? outside.assetRef ?? "",
    );
    if (draft && (draft.assetType !== assetType || draft.assetRef !== assetRef)) {
      setOutsideEditorDraft(state.boardId, { assetType, assetRef });
    }
    ctx.outsideIntensityInput.value = String(intensity);
    ctx.outsideSpeedInput.value = String(speed);
    ctx.outsideModeInput.value = mode;
    ctx.outsideDirectionInput.value = direction;
    if (ctx.outsideAssetTypeInput) {
      ctx.outsideAssetTypeInput.value = assetType;
    }
    if (ctx.outsideAssetRefInput) {
      ctx.outsideAssetRefInput.value = assetRef;
    }
    syncOutsideModeDirectionVisibility({
      ...selectedDefinition,
      assetType,
      assetRef,
    });
    syncOutsideResourcePicker(assetType, assetRef);
    populateSoundRefSelect(
      ctx.outsideSoundRefSelect,
      draft?.soundAssetRef ?? selectedDefinition?.soundAssetRef,
    );
    ctx.outsideIntensityValue.textContent = intensity.toFixed(2);
    ctx.outsideSpeedValue.textContent = `${speed.toFixed(2)}x`;
    renderOutsideGlobalButtons();
  }

  // Phase 20: "is this running animation the outside animation for this
  // board?" — recognises any type listed in the board's outside profile,
  // not just the built-in outside-space id.
  function findOutsideGlobalAnimation(boardId) {
    return ctx.state.runningAnimations.find(
      (animation) =>
        animation?.scope === "global"
        && animation?.boardId === boardId
        && (ctx.isOutsideAnimationType?.(animation?.type, boardId)
          || animation?.type === "outside-space"),
    );
  }

  function syncOutsideRuntimeMirror(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const state = ctx.state;
    const profile = ctx.getOutsideFxProfile(effectiveBoardId);
    const outsideEnabled = profile.enabled;
    const existing = findOutsideGlobalAnimation(effectiveBoardId);
    // Current "selected" outside definition drives which type the
    // mirrored running animation takes on — no more hardcoded
    // "outside-space".
    const selectedDefinition =
      profile.animations.find((entry) => entry.id === profile.selectedAnimationId)
      ?? profile.animations[0]
      ?? null;
    const desiredType = selectedDefinition?.id ?? null;

    // If the selected animation changed while outside was already on, swap
    // the mirrored type so the renderer picks up the new definition.
    if (outsideEnabled && existing && desiredType && existing.type !== desiredType) {
      ctx.stopAnimationSound(existing.id);
      state.runningAnimations = state.runningAnimations.filter((animation) => animation.id !== existing.id);
      ctx.clearOutsideMp4PlaybackState(effectiveBoardId);
      ctx.clearOutsideTimelineState(effectiveBoardId);
      const outsideAnimation = ctx.createAnimation({
        boardId: effectiveBoardId,
        type: desiredType,
        scope: "global",
        intensity: 1,
        hold: true,
        durationSec: 0,
      });
      state.runningAnimations.push(outsideAnimation);
      ctx.playSoundForAnimation(outsideAnimation);
      return true;
    }

    if (outsideEnabled && !existing && desiredType) {
      const outsideAnimation = ctx.createAnimation({
        boardId: effectiveBoardId,
        type: desiredType,
        scope: "global",
        intensity: 1,
        hold: true,
        durationSec: 0,
      });
      state.runningAnimations.push(outsideAnimation);
      ctx.playSoundForAnimation(outsideAnimation);
      return true;
    }

    if (!outsideEnabled && existing) {
      ctx.stopAnimationSound(existing.id);
      state.runningAnimations = state.runningAnimations.filter((animation) => animation.id !== existing.id);
      ctx.clearOutsideMp4PlaybackState(effectiveBoardId);
      ctx.clearOutsideTimelineState(effectiveBoardId);
      return true;
    }

    return false;
  }

  window.TT_BEAMER_RUNTIME_FX_PANELS = {
    init,
    syncOutsideModeDirectionVisibility,
    buildInsideProfileWithSelectedAnimationPatch,
    syncInsideResourcePicker,
    getInsideEditorDraft,
    setInsideEditorDraft,
    collectInsideEditorDraftFromInputs,
    syncInsideFxPanel,
    renderInsideGlobalButtons,
    getRoomAnimationLabelById,
    syncRoomResourcePicker,
    getRoomEditorDraft,
    setRoomEditorDraft,
    collectRoomEditorDraftFromInputs,
    syncRoomFxPanel,
    buildOutsideProfileWithSelectedAnimationPatch,
    syncOutsideResourcePicker,
    loadOutsideResourceAssets,
    getOutsideEditorDraft,
    setOutsideEditorDraft,
    collectOutsideEditorDraftFromInputs,
    syncOutsideDraftVisibilityFromInputs,
    syncOutsideFxPanel,
    findOutsideGlobalAnimation,
    syncOutsideRuntimeMirror,
    getOutsideEditingAnimationId,
    setOutsideEditingAnimationId,
    renderOutsideGlobalButtons,
  };
})();
