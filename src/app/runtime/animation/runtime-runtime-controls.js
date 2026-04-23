// Phase 14-2: runtime controls module.
//
// Owns the high-level runtime control surface that doesn't fit into
// any other module:
//   - recordTriggerIntent (input guard bridge)
//   - hardStopRuntimeEffects / executeClearAll (clear-all pipeline)
//   - resetClearAllGuard / armClearAllGuard (clear-all confirm flow)
//   - settings subtab state machine (normalize/persist/sync/set/restore)
//   - upsertGlobalAnimation (global trigger dispatch)
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function recordTriggerIntent() {
    window.TT_BEAMER_INPUT_GUARDS.recordTriggerIntent(ctx.state);
  }

  // Phase 15-6: graceful audio for global inside non-loop animations.
  // When a non-loop inside global is stopped (clear-all, snapshot
  // stop, etc.), we previously called stopAnimationSound which
  // hard-cut the voice mid-sample. That's fine for loops (the user
  // expects an immediate stop) and for outside animations (long
  // ambient audio), but for short inside one-shots it was jarring.
  // Now we pass `graceful: true` so the active iteration plays to
  // its natural `ended` event while the animation is still removed
  // from the tracking map. We also stop calling
  // clearAllActiveAnimationAudio unconditionally — that wipes the
  // tracking map even for voices we want to fade out naturally.
  function shouldGracefulStopAudio(animation) {
    if (!animation || animation.scope !== "global") return false;
    // Outside animations get the hard stop so the ambient track doesn't
    // drift into silence uncontrollably when the user clears the board.
    // Any type listed in the board's outside profile counts as outside —
    // the old hardcoded "outside-space" fallback is kept only for
    // backwards compatibility with boards that still carry that id.
    const boardId = animation.boardId ?? ctx.state.boardId;
    if (ctx.isOutsideAnimationType?.(animation.type, boardId)) return false;
    if (animation.type === "outside-space") return false;
    return !animation.loopUntilStopped;
  }

  function hardStopRuntimeEffects({ clearVisuals = true } = {}) {
    const state = ctx.state;
    let anyGraceful = false;
    for (const animation of state.runningAnimations) {
      const graceful = shouldGracefulStopAudio(animation);
      if (graceful) {
        anyGraceful = true;
      }
      ctx.stopAnimationSound(animation.id, { graceful });
    }
    // Only flush the entire voice map when nothing wants a graceful
    // fade-out. Otherwise the graceful voices would be orphaned.
    if (!anyGraceful) {
      ctx.clearAllActiveAnimationAudio();
    }
    if (clearVisuals) {
      ctx.ashParticles.length = 0;
    }
  }

  function executeClearAll() {
    const state = ctx.state;
    const clearDefaults = Boolean(ctx.stopAllIncludeDefaultsCheckbox?.checked);
    if (ctx.getOutputRole() === ctx.OUTPUT_ROLE_CONTROL) {
      void ctx.emitLiveMutation("clear-all", {
        priorityHint: "high",
        reason: "control-clear-all",
        clearDefaults,
      }).then(() => {
        ctx.triggerFeedback.textContent = clearDefaults
          ? "Pending: Clear All (incl. defaults) command accepted"
          : "Pending: Clear All command accepted (waiting for snapshot)";
      }).catch(() => {
        ctx.triggerFeedback.textContent = "Status: Clear All command failed";
      });
      return;
    }
    if (clearDefaults) {
      hardStopRuntimeEffects({ clearVisuals: true });
      for (const board of ctx.getBoards()) {
        ctx.updateOutsideFxProfile(board.id, { enabled: false });
      }
      state.runningAnimations = [];
    } else {
      // Keep default animations (id prefix "default-") running
      for (const animation of state.runningAnimations) {
        if (String(animation?.id || "").startsWith("default-")) continue;
        const graceful = shouldGracefulStopAudio(animation);
        ctx.stopAnimationSound(animation.id, { graceful });
      }
      ctx.ashParticles.length = 0;
      state.runningAnimations = state.runningAnimations.filter(
        (a) => String(a?.id || "").startsWith("default-"),
      );
    }
    ctx.persistBoardProfiles();
    ctx.clearRoomDraftEditTarget();
    ctx.syncOutsideFxPanel();
    ctx.renderRunningAnimationsList();
    ctx.refreshGlobalButtons();
    ctx.triggerFeedback.textContent = "Status: Clear All executed";
    void ctx.emitLiveMutation("clear-all", {
      priorityHint: "high",
      clearDefaults,
    });
  }

  function resetClearAllGuard() {
    const state = ctx.state;
    if (state.clearAllGuard.timeoutId !== null) {
      window.clearTimeout(state.clearAllGuard.timeoutId);
    }
    state.clearAllGuard.armedUntil = 0;
    state.clearAllGuard.timeoutId = null;
    if (ctx.stopAllButton) {
      ctx.stopAllButton.textContent = "Clear All";
      ctx.stopAllButton.classList.remove("is-armed");
    }
  }

  function armClearAllGuard() {
    const state = ctx.state;
    resetClearAllGuard();
    state.clearAllGuard.armedUntil = performance.now() + 2600;
    if (ctx.stopAllButton) {
      ctx.stopAllButton.textContent = "Confirm Clear All";
      ctx.stopAllButton.classList.add("is-armed");
    }
    state.clearAllGuard.timeoutId = window.setTimeout(() => {
      resetClearAllGuard();
    }, 2700);
  }

  function normalizeSettingsSubtab(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "animations" || normalized === "system") {
      return normalized;
    }
    return "board";
  }

  function persistSettingsSubtab(nextSubtab) {
    // Phase 13-1: subtab memory is ephemeral per browser-tab session.
    try {
      window.sessionStorage.setItem(ctx.SETTINGS_SUBTAB_STORAGE_KEY, nextSubtab);
    } catch {
      // Best-effort only.
    }
  }

  function syncSettingsSubtabVisibility() {
    const state = ctx.state;
    const activeSubtab = normalizeSettingsSubtab(state.settingsSubtab);
    for (const button of ctx.settingsSubtabButtons) {
      const tabId = normalizeSettingsSubtab(button.dataset.settingsSubtab);
      const isActive = tabId === activeSubtab;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
    for (const section of ctx.settingsTabbedSections) {
      const tabId = normalizeSettingsSubtab(section.dataset.settingsTab);
      const isActive = tabId === activeSubtab;
      section.classList.toggle("settings-subtab-hidden", !isActive);
      section.setAttribute("aria-hidden", isActive ? "false" : "true");
      if ("inert" in section) {
        section.inert = !isActive;
      }
    }
    if (ctx.settingsSubtabStatus) {
      ctx.settingsSubtabStatus.textContent = `Settings focus: ${ctx.SETTINGS_SUBTAB_LABELS[activeSubtab] ?? ctx.SETTINGS_SUBTAB_LABELS.board}`;
    }
  }

  function setSettingsSubtab(nextSubtab, { persist = true } = {}) {
    const state = ctx.state;
    state.settingsSubtab = normalizeSettingsSubtab(nextSubtab);
    syncSettingsSubtabVisibility();
    if (persist) {
      persistSettingsSubtab(state.settingsSubtab);
    }
    // Phase 22 W3b: Animations subtab auto-opens the full-page editor
    // (per the redesign — the three sidebar panels it replaces are
    // queued for removal in W3b-5). Other subtabs close the editor.
    const editor = window.TT_BEAMER_ANIMATION_EDITOR_VIEW;
    if (editor && state.uiView === "settings") {
      if (state.settingsSubtab === "animations") {
        if (!editor.isOpen()) editor.open();
      } else if (editor.isOpen()) {
        // Already on a different subtab — close without re-navigating
        // (the close() hook would push back to "board" otherwise).
        document.body.removeAttribute("data-animation-editor-open");
        const page = document.querySelector("#animation-editor-page");
        if (page) page.hidden = true;
      }
    }
  }

  function restoreSettingsSubtabPreference() {
    const state = ctx.state;
    let stored = "";
    try {
      stored = window.sessionStorage.getItem(ctx.SETTINGS_SUBTAB_STORAGE_KEY) || "";
    } catch {
      stored = "";
    }
    // Phase 22 W3b-5: "animations" must never be the restored default.
    // The full-page editor is a deliberate destination, not a landing
    // screen; a stale "animations" preference used to leave the sidebar
    // blank on reload (legacy panels removed, editor didn't auto-open).
    if (stored === "animations") stored = "";
    setSettingsSubtab(stored || (state.settingsSubtab !== "animations" ? state.settingsSubtab : "") || "board", { persist: false });
  }

  function upsertGlobalAnimation(type, defaultDurationSec, { loopUntilStopped = false, playSound = true } = {}) {
    const state = ctx.state;
    const existing = state.runningAnimations.find(
      (anim) => anim.scope === "global" && anim.type === type && anim.boardId === state.boardId,
    );
    // Phase 20: resolve the category dynamically. Custom outside animations
    // created by the user aren't in GLOBAL_ANIMATIONS (which only knows the
    // built-in outside-space), so we also check the board's outside profile.
    const outsideProfileForCategory = ctx.getOutsideFxProfile(state.boardId);
    const isOutsideByProfile = outsideProfileForCategory?.animations?.some((a) => a.id === type) ?? false;
    const isOutside = isOutsideByProfile || ctx.getGlobalAnimationCategory(type) === "outside-ship";
    // Phase 21-1: outside animations are conceptually continuous (they
    // loop forever until the user toggles them off). Force loop mode so
    // they don't silently vanish from the Active Animations list after
    // the global one-shot window (GLOBAL_ONE_SHOT_DURATION_SEC = 4s)
    // even though the underlying outside layer is still drawing.
    const effectiveLoopUntilStopped = isOutside ? true : loopUntilStopped;
    // Phase 20: only one outside animation may play at a time. When we're
    // about to start a new outside, stop any other outside animation
    // currently running on this board so the switch is clean.
    if (isOutside && !existing) {
      const outsideIds = new Set(
        (outsideProfileForCategory?.animations ?? []).map((a) => a.id),
      );
      outsideIds.add("outside-space");
      const otherRunningOutside = state.runningAnimations.filter(
        (anim) =>
          anim.scope === "global"
          && anim.boardId === state.boardId
          && anim.type !== type
          && outsideIds.has(anim.type),
      );
      for (const other of otherRunningOutside) {
        ctx.stopAnimation(other.id);
      }
    }
    // Phase 15-9: look up the matching global animation definition so
    // we can copy its per-definition soundAssetRef onto the dispatched
    // animation entry. For inside globals the type == definition.id;
    // for outside we also match by id.
    const lookupProfile = isOutside
      ? ctx.getOutsideFxProfile(state.boardId)
      : ctx.getInsideFxProfile(state.boardId);
    const matchedDefinition = lookupProfile?.animations?.find((entry) => entry.id === type) ?? null;
    const definitionSoundAssetRef = matchedDefinition?.soundAssetRef ?? "none";
    const normalizedDefaultDurationSec = Number(defaultDurationSec);
    const effectiveDefaultDurationSec = effectiveLoopUntilStopped
      ? null
      : (Number.isFinite(normalizedDefaultDurationSec) && normalizedDefaultDurationSec > 0
        ? normalizedDefaultDurationSec
        : null);
    if (ctx.getOutputRole() === ctx.OUTPUT_ROLE_CONTROL) {
      if (existing) {
        ctx.stopAnimation(existing.id);
      } else {
        // Phase 21-1: align outside/inside global animations with the
        // room model — copy the definition's tunable fields onto the
        // running instance at trigger time so Settings only edits the
        // DEFAULT and the running animation's values live on the
        // instance (Live Editor target). Without this snapshot, the
        // draw path reaches back into the definition every frame,
        // which (a) prevents per-instance Live Editor edits from
        // being visible, and (b) makes toggle-off+on "revert" to the
        // last committed-to-server definition since the live-sync
        // snapshot roundtrip overwrites the local pending changes.
        const animation = ctx.createAnimation({
          type,
          scope: "global",
          boardId: state.boardId,
          intensity: Number(matchedDefinition?.intensity) || 1,
          speed: Number(matchedDefinition?.speed) || 1,
          opacity: Number(matchedDefinition?.opacity) || 1,
          mode: matchedDefinition?.mode ?? "",
          direction: matchedDefinition?.direction ?? "",
          soundVolume: playSound ? 1 : 0,
          soundAssetRef: playSound ? definitionSoundAssetRef : "none",
          hold: effectiveDefaultDurationSec === null,
          durationSec: effectiveDefaultDurationSec ?? 0,
        });
        void ctx.emitLiveMutation("trigger-global", {
          animationType: type,
          action: "start",
          boardId: state.boardId,
          outsideHint: isOutside,
          loopUntilStopped: effectiveDefaultDurationSec === null,
          playSound,
          animation: ctx.buildAnimationSnapshotForLiveSync(animation),
        }).then(() => {
          ctx.triggerFeedback.textContent = `Pending: ${ctx.getAnimationLabel(type)} start accepted (waiting for snapshot)`;
        }).catch(() => {
          ctx.triggerFeedback.textContent = `Status: ${ctx.getAnimationLabel(type)} start command failed`;
        });
      }
      return;
    }
    if (existing) {
      ctx.stopAnimationSound(existing.id);
      state.runningAnimations = state.runningAnimations.filter((anim) => anim.id !== existing.id);
      if (isOutside) {
        ctx.updateOutsideFxProfile(existing.boardId, { enabled: false });
        ctx.persistBoardProfiles();
        ctx.syncOutsideFxPanel();
      }
      ctx.triggerFeedback.textContent = `Status: ${ctx.getAnimationLabel(type)} stopped`;
      void ctx.emitStopAnimationCommand(existing.id, {
        priorityHint: "high",
        targetAnimation: existing,
      });
    } else {
      const animation = ctx.createAnimation({
        type,
        scope: "global",
        intensity: Number(matchedDefinition?.intensity) || 1,
        speed: Number(matchedDefinition?.speed) || 1,
        opacity: Number(matchedDefinition?.opacity) || 1,
        mode: matchedDefinition?.mode ?? "",
        direction: matchedDefinition?.direction ?? "",
        soundVolume: playSound ? 1 : 0,
        soundAssetRef: playSound ? definitionSoundAssetRef : "none",
        hold: effectiveDefaultDurationSec === null,
        durationSec: effectiveDefaultDurationSec ?? 0,
      });
      ctx.triggerFeedback.textContent = `Pending: ${ctx.getAnimationLabel(type)} start accepted (waiting for snapshot)`;
      void ctx.emitLiveMutation("trigger-global", {
        animationType: type,
        action: "start",
        boardId: state.boardId,
        outsideHint: isOutside,
        loopUntilStopped: effectiveDefaultDurationSec === null,
        playSound,
        animation: ctx.buildAnimationSnapshotForLiveSync(animation),
      }).catch(() => {
        ctx.triggerFeedback.textContent = `Status: ${ctx.getAnimationLabel(type)} start command failed`;
      });
    }
    ctx.renderRunningAnimationsList();
    ctx.refreshGlobalButtons();
  }

  window.TT_BEAMER_RUNTIME_RUNTIME_CONTROLS = {
    init,
    recordTriggerIntent,
    hardStopRuntimeEffects,
    executeClearAll,
    resetClearAllGuard,
    armClearAllGuard,
    normalizeSettingsSubtab,
    persistSettingsSubtab,
    syncSettingsSubtabVisibility,
    setSettingsSubtab,
    restoreSettingsSubtabPreference,
    upsertGlobalAnimation,
  };
})();
