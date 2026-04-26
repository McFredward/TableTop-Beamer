// Inside + Outside fx-panel sync sub-module.
//
// Owns the inside/outside FX panel DOM sync + editor-draft helpers
// (syncInsideFxPanel / syncOutsideFxPanel and friends), the inside/
// outside resource pickers, editor draft storage helpers,
// buildInsideProfileWithSelectedAnimationPatch /
// buildOutsideProfileWithSelectedAnimationPatch, the outside runtime
// mirror (syncOutsideRuntimeMirror), and the inside/outside global
// button renderers.
//
// Dependencies injected via ctx + cross-module hooks (syncRoomResourcePicker)
// at init time. Per-IIFE-private populateSoundRefSelect mirror is duplicated
// from the original consolidated file to preserve byte-identical bodies in
// the moved sync*FxPanel functions.
(() => {
  let ctx = null;
  // Cross-module hook: loadOutsideResourceAssets calls syncRoomResourcePicker
  // (which lives in runtime-fx-panels-room.js post-split). Wired in init
  // via deps.syncRoomResourcePicker so loadOutsideResourceAssets's body
  // remains byte-identical (bare-identifier call site preserved).
  let syncRoomResourcePicker = null;

  // Separate "which outside animation am I editing" from
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
    if (typeof dependencies?.syncRoomResourcePicker === "function") {
      syncRoomResourcePicker = dependencies.syncRoomResourcePicker;
    }
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
    // Carry per-definition sound selection through the draft.
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
    // The Dashboard's Inside-Play-Area global
    // buttons are rendered by renderInsideGlobalButtons() at the END
    // of this function — skipping the whole sync over the now-removed
    // legacy sidebar refs killed those buttons too. Null-guard the
    // legacy-only writes individually instead.
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
    if (ctx.insideAnimationRenameInput) {
      ctx.insideAnimationRenameInput.value = selectedDefinition?.name ?? "";
    }
    const iconPickerApi = window.TT_BEAMER_UI_ICON_PICKER;
    if (iconPickerApi && ctx.insideIconPicker) {
      const api = iconPickerApi.mount(ctx.insideIconPicker);
      api?.setValue(selectedDefinition?.icon ?? null);
    }
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
    if (ctx.insideIntensityInput) ctx.insideIntensityInput.value = String(intensity);
    if (ctx.insideSpeedInput) ctx.insideSpeedInput.value = String(speed);
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
    if (ctx.insideIntensityValue) ctx.insideIntensityValue.textContent = intensity.toFixed(2);
    if (ctx.insideSpeedValue) ctx.insideSpeedValue.textContent = `${speed.toFixed(2)}x`;
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

  function buildOutsideProfileWithSelectedAnimationPatch(boardId, patch = {}, profileOverride = null) {
    const effectiveBoardId = boardId ?? ctx.state.boardId;
    const baseProfile = ctx.normalizeOutsideFxProfile(profileOverride ?? ctx.getOutsideFxProfile(effectiveBoardId));
    // Edits land on the definition the user is currently *editing*
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
    // Carry per-definition sound selection through the draft.
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
    // Dashboard's Outside-Play-Area buttons are
    // rendered by renderOutsideGlobalButtons() at the END; skipping
    // this function over the removed legacy panel refs killed those
    // buttons too. Null-guard the legacy-only writes individually.
    const state = ctx.state;
    const outside = ctx.getOutsideFxProfile(state.boardId);
    // The editor shows the animation tracked by the per-board
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
    if (ctx.outsideAnimationRenameInput) {
      ctx.outsideAnimationRenameInput.value = selectedDefinition?.name ?? "";
    }
    const outsideIconPickerApi = window.TT_BEAMER_UI_ICON_PICKER;
    if (outsideIconPickerApi && ctx.outsideIconPicker) {
      const api = outsideIconPickerApi.mount(ctx.outsideIconPicker);
      api?.setValue(selectedDefinition?.icon ?? null);
    }
    if (ctx.outsideModeIndicator) {
      if (selectedDefinition) {
        ctx.outsideModeIndicator.textContent = `Editing: ${selectedDefinition.name}`;
        ctx.outsideModeIndicator.dataset.mode = "editing";
      } else {
        ctx.outsideModeIndicator.textContent = "Creating new animation";
        ctx.outsideModeIndicator.dataset.mode = "creating";
      }
    }
    if (ctx.outsideEnabledInput) ctx.outsideEnabledInput.checked = outside.enabled;
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
    if (ctx.outsideIntensityInput) ctx.outsideIntensityInput.value = String(intensity);
    if (ctx.outsideSpeedInput) ctx.outsideSpeedInput.value = String(speed);
    if (ctx.outsideModeInput) ctx.outsideModeInput.value = mode;
    if (ctx.outsideDirectionInput) ctx.outsideDirectionInput.value = direction;
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
    if (ctx.outsideIntensityValue) ctx.outsideIntensityValue.textContent = intensity.toFixed(2);
    if (ctx.outsideSpeedValue) ctx.outsideSpeedValue.textContent = `${speed.toFixed(2)}x`;
    renderOutsideGlobalButtons();
  }

  // "Is this running animation the outside animation for this
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

  window.TT_BEAMER_RUNTIME_FX_PANELS_INSIDE_OUTSIDE = {
    init,
    syncOutsideModeDirectionVisibility,
    buildInsideProfileWithSelectedAnimationPatch,
    syncInsideResourcePicker,
    getInsideEditorDraft,
    setInsideEditorDraft,
    collectInsideEditorDraftFromInputs,
    syncInsideFxPanel,
    renderInsideGlobalButtons,
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
