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

  function init(dependencies) {
    ctx = dependencies;
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
    return setInsideEditorDraft(effectiveBoardId, {
      intensity: ctx.clampOutsideIntensity(ctx.insideIntensityInput?.value),
      speed: ctx.clampOutsideSpeed(ctx.insideSpeedInput?.value),
      assetType,
      assetRef,
      loopUntilStopped: Boolean(ctx.insideLoopUntilStopInput?.checked),
    });
  }

  function syncInsideFxPanel() {
    const state = ctx.state;
    const inside = ctx.getInsideFxProfile(state.boardId);
    const selectedDefinition = ctx.getSelectedInsideAnimationDefinition(state.boardId);
    const draft = getInsideEditorDraft(state.boardId, selectedDefinition);
    if (ctx.insideAnimationSelect) {
      ctx.insideAnimationSelect.replaceChildren();
      for (const definition of inside.animations) {
        const option = document.createElement("option");
        option.value = definition.id;
        option.textContent = `${definition.name} (${definition.id})`;
        ctx.insideAnimationSelect.append(option);
      }
      ctx.insideAnimationSelect.value = selectedDefinition?.id ?? inside.animations[0]?.id ?? "";
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
    return setRoomEditorDraft(effectiveBoardId, {
      assetType,
      assetRef,
    });
  }

  function syncRoomFxPanel() {
    const state = ctx.state;
    const roomFx = ctx.getRoomFxProfile(state.boardId);
    const selectedDefinition = ctx.getSelectedRoomAnimationDefinition(state.boardId);
    const draft = getRoomEditorDraft(state.boardId, selectedDefinition);

    if (ctx.roomAnimationSettingsSelect) {
      ctx.roomAnimationSettingsSelect.replaceChildren();
      for (const definition of roomFx.animations) {
        const option = document.createElement("option");
        option.value = definition.id;
        option.textContent = `${definition.name} (${definition.id})`;
        ctx.roomAnimationSettingsSelect.append(option);
      }
      ctx.roomAnimationSettingsSelect.value = selectedDefinition?.id ?? roomFx.animations[0]?.id ?? "";
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
  }

  function buildOutsideProfileWithSelectedAnimationPatch(boardId, patch = {}, profileOverride = null) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const baseProfile = ctx.normalizeOutsideFxProfile(profileOverride ?? ctx.getOutsideFxProfile(effectiveBoardId));
    const selectedDefinition =
      baseProfile.animations.find((entry) => entry.id === baseProfile.selectedAnimationId) ?? baseProfile.animations[0];
    if (!selectedDefinition) {
      return baseProfile;
    }
    const nextAnimations = baseProfile.animations.map((entry) => {
      if (entry.id !== selectedDefinition.id) {
        return entry;
      }
      return ctx.normalizeOutsideAnimationDefinition({
        ...entry,
        ...patch,
      });
    });
    return ctx.normalizeOutsideFxProfile({
      ...baseProfile,
      selectedAnimationId: selectedDefinition.id,
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
    return setOutsideEditorDraft(effectiveBoardId, {
      intensity: ctx.clampOutsideIntensity(ctx.outsideIntensityInput?.value),
      speed: ctx.clampOutsideSpeed(ctx.outsideSpeedInput?.value),
      mode: allowModeDirection ? ctx.normalizeOutsideMode(ctx.outsideModeInput?.value) : "standard",
      direction: allowModeDirection ? ctx.normalizeOutsideDirection(ctx.outsideDirectionInput?.value) : "forward",
      assetType,
      assetRef,
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
    const state = ctx.state;
    const outside = ctx.getOutsideFxProfile(state.boardId);
    const selectedDefinition = ctx.getSelectedOutsideAnimationDefinition(state.boardId);
    const draft = getOutsideEditorDraft(state.boardId, selectedDefinition);
    if (ctx.outsideAnimationSelect) {
      ctx.outsideAnimationSelect.replaceChildren();
      for (const definition of outside.animations) {
        const option = document.createElement("option");
        option.value = definition.id;
        option.textContent = `${definition.name} (${definition.id})`;
        ctx.outsideAnimationSelect.append(option);
      }
      ctx.outsideAnimationSelect.value = selectedDefinition?.id ?? outside.animations[0]?.id ?? "";
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
    ctx.outsideIntensityValue.textContent = intensity.toFixed(2);
    ctx.outsideSpeedValue.textContent = `${speed.toFixed(2)}x`;
  }

  function findOutsideGlobalAnimation(boardId) {
    return ctx.state.runningAnimations.find(
      (animation) =>
        animation.scope === "global" && animation.type === "outside-space" && animation.boardId === boardId,
    );
  }

  function syncOutsideRuntimeMirror(boardId) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const state = ctx.state;
    const outsideEnabled = ctx.getOutsideFxProfile(effectiveBoardId).enabled;
    const existing = findOutsideGlobalAnimation(effectiveBoardId);

    if (outsideEnabled && !existing) {
      const outsideAnimation = ctx.createAnimation({
        boardId: effectiveBoardId,
        type: "outside-space",
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
  };
})();
