// Room fx-panel sync sub-module.
//
// Owns the room FX panel DOM sync + editor-draft helpers
// (syncRoomFxPanel and friends), the room resource picker, the room
// editor draft storage helpers, and getRoomAnimationLabelById.
//
// syncRoomFxPanel (191 lines pre-split) is decomposed in-place into
// 6 nested helpers (identity / source / sound / transform / color /
// conditional fields), each with byte-identical body sub-blocks from
// the original function. The helpers share parent closure (state,
// roomFx, selectedDefinition, draft, assetType, assetRef) so no
// rewrite is required at the call sites. PLAN W3.6-C1 specified 5
// helpers but the original linear flow has source-asset (497-515),
// sound-populate (516-519), transforms (520-579) interleaved — to
// preserve byte-identical contiguous sub-blocks the executor split
// transforms into its own helper. All 6 helpers are <150 lines.
//
// Separate "which animation am I editing" from "which animation is
// currently playing" — the room panel always edits the currently
// selected definition (different from outside which has its own
// editing-id map), so no module-private editing-id map is needed.
//
// Per-IIFE-private populateSoundRefSelect mirror is duplicated from
// the original consolidated file to preserve byte-identical bodies in
// the moved syncRoomFxPanel function.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  // Shared sound-selector dropdown populator. Each
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
      // Transform options
      rotationDeg: Number(definition.rotationDeg) || 0,
      stretchToPolygon: definition.stretchToPolygon !== false,
      widthScale: Number.isFinite(Number(definition.widthScale)) ? Number(definition.widthScale) : 1,
      heightScale: Number.isFinite(Number(definition.heightScale)) ? Number(definition.heightScale) : 1,
      offsetXScale: Number(definition.offsetXScale) || 0,
      offsetYScale: Number(definition.offsetYScale) || 0,
      // Opt-in hull-flicker ⇒ cuts concurrent solid-color in room.
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
    // Carry per-definition sound selection through the draft.
    const soundAssetRef = String(ctx.roomSoundRefSelect?.value || ctx.SOUND_MAPPING_NONE);
    // Carry transform options through the draft.
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
    // The Dashboard's "Room animation" picker
    // (#room-animation-select) is populated by this function too —
    // not just the removed sidebar panel. Every write below is
    // already null-guarded per target, so let the function run even
    // when the legacy sidebar DOM is gone.
    const state = ctx.state;
    const roomFx = ctx.getRoomFxProfile(state.boardId);
    const selectedDefinition = ctx.getSelectedRoomAnimationDefinition(state.boardId);
    const draft = getRoomEditorDraft(state.boardId, selectedDefinition);

    // 6 nested helpers with byte-identical body sub-blocks of the
    // original 191-line syncRoomFxPanel. Each helper closes over
    // state / roomFx / selectedDefinition / draft from this parent
    // scope, plus assetType / assetRef once Source has computed them.
    function _renderRoomFxIdentitySection() {
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
      if (ctx.roomAnimationRenameInput) {
        ctx.roomAnimationRenameInput.value = selectedDefinition?.name ?? "";
      }
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
    }

    function _renderRoomFxSourceSection() {
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
      return { assetType, assetRef };
    }

    function _renderRoomFxSoundSection() {
      populateSoundRefSelect(
        ctx.roomSoundRefSelect,
        draft?.soundAssetRef ?? selectedDefinition?.soundAssetRef,
      );
    }

    function _renderRoomFxTransformSection(assetType) {
      // Sync transform inputs from the draft / definition.
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
    }

    function _renderRoomFxColorSection() {
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
    }

    function _renderRoomFxConditionalFields(assetType, assetRef) {
      // breaksSolidColor checkbox — only meaningful on the
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

    _renderRoomFxIdentitySection();
    const { assetType, assetRef } = _renderRoomFxSourceSection();
    _renderRoomFxSoundSection();
    _renderRoomFxTransformSection(assetType);
    _renderRoomFxColorSection();
    _renderRoomFxConditionalFields(assetType, assetRef);
  }

  window.TT_BEAMER_RUNTIME_FX_PANELS_ROOM = {
    init,
    getRoomAnimationLabelById,
    syncRoomResourcePicker,
    getRoomEditorDraft,
    setRoomEditorDraft,
    collectRoomEditorDraftFromInputs,
    syncRoomFxPanel,
  };
})();
