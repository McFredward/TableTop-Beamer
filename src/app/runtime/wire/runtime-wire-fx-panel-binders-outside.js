// Outside FX panel event binders extracted from
// runtime-wire-fx-panel-binders.js (W3.6-C3 Option B minimal split).
//
// Owns the contiguous outside-scope cluster (file lines 480-742, 263
// lines): outsideEnabledInput toggle, outsideAnimation create / select
// / delete, commitOutsideDraftToDefinition helper, intensity / speed /
// mode / direction / assetType / assetRef input handlers, and the
// outsideApplyChangesButton with optimistic-local-apply + live-mutation
// fan-out for both CONTROL and OUTPUT roles.
//
// Wire-binder pattern preserved per RESEARCH §1 / §9 #10 — entry
// point is `wireFxPanelBindersOutside(ctx, deps)`, NO `init({ctx})`.
// The shim's `wireFxPanelBinders(ctx)` calls this sub-binder at the
// same step so any DOM-ready / paint timing assumptions inside the
// outside block are preserved.
//
// The single non-ctx closure ref (`switchAnimationSectionTab`,
// originally a top-level fn inside the parent IIFE) is forwarded via
// `deps.switchAnimationSectionTab` and stored in a module-private
// `let` binding so the body's bare-identifier call sites stay byte-
// identical with the pre-W3.6 IIFE.
(() => {
  // Forwarded by the shell at parse-time-after-init via the deps bag.
  // Sub-binder is called exactly once per boot so a single `let`
  // binding is safe (no overwrite hazard).
  let switchAnimationSectionTab = null;

  function wireFxPanelBindersOutside(ctx, deps) {
    if (deps && typeof deps.switchAnimationSectionTab === "function") {
      switchAnimationSectionTab = deps.switchAnimationSectionTab;
    }
    const {
      state,
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
      outsideEditorDraftByBoard,
      outputRole,
      OUTPUT_ROLE_CONTROL,
      getOutsideFxProfile,
      setOutsideFxProfile,
      updateOutsideFxProfile,
      createOutsideAnimationDefinition,
      normalizeOutsideAnimationId,
      normalizeOutsideMode,
      normalizeOutsideDirection,
      clampOutsideIntensity,
      clampOutsideSpeed,
      setOutsideEditorDraft,
      collectOutsideEditorDraftFromInputs,
      buildOutsideProfileWithSelectedAnimationPatch,
      syncOutsideFxPanel,
      syncOutsideDraftVisibilityFromInputs,
      syncOutsideRuntimeMirror,
      persistBoardProfiles,
      renderRunningAnimationsList,
      refreshGlobalButtons,
      emitLiveMutation,
      emitOutsideFxMutation,
    } = ctx;

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
  }

  window.TT_BEAMER_RUNTIME_WIRE_FX_PANEL_BINDERS_OUTSIDE = {
    wireFxPanelBindersOutside,
  };
})();
