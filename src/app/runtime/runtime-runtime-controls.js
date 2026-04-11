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

  function hardStopRuntimeEffects({ clearVisuals = true } = {}) {
    const state = ctx.state;
    for (const animation of state.runningAnimations) {
      ctx.stopAnimationSound(animation.id);
    }
    ctx.clearAllActiveAnimationAudio();
    if (clearVisuals) {
      ctx.ashParticles.length = 0;
    }
  }

  function executeClearAll() {
    const state = ctx.state;
    if (ctx.getOutputRole() === ctx.OUTPUT_ROLE_CONTROL) {
      void ctx.emitLiveMutation("clear-all", {
        priorityHint: "high",
        reason: "control-clear-all",
      }).then(() => {
        ctx.triggerFeedback.textContent = "Pending: Clear All command accepted (waiting for snapshot)";
      }).catch(() => {
        ctx.triggerFeedback.textContent = "Status: Clear All command failed";
      });
      return;
    }
    hardStopRuntimeEffects({ clearVisuals: true });
    for (const board of ctx.getBoards()) {
      ctx.updateOutsideFxProfile(board.id, { enabled: false });
    }
    ctx.persistBoardProfiles();
    state.runningAnimations = [];
    ctx.clearRoomDraftEditTarget();
    ctx.syncOutsideFxPanel();
    ctx.renderRunningAnimationsList();
    ctx.refreshGlobalButtons();
    ctx.triggerFeedback.textContent = "Status: Clear All executed";
    void ctx.emitLiveMutation("clear-all", {
      priorityHint: "high",
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
  }

  function restoreSettingsSubtabPreference() {
    const state = ctx.state;
    let stored = "";
    try {
      stored = window.sessionStorage.getItem(ctx.SETTINGS_SUBTAB_STORAGE_KEY) || "";
    } catch {
      stored = "";
    }
    setSettingsSubtab(stored || state.settingsSubtab || "board", { persist: false });
  }

  function upsertGlobalAnimation(type, defaultDurationSec, { loopUntilStopped = false, playSound = true } = {}) {
    const state = ctx.state;
    const existing = state.runningAnimations.find(
      (anim) => anim.scope === "global" && anim.type === type && anim.boardId === state.boardId,
    );
    const isOutside = ctx.getGlobalAnimationCategory(type) === "outside-ship";
    const normalizedDefaultDurationSec = Number(defaultDurationSec);
    const effectiveDefaultDurationSec = loopUntilStopped
      ? null
      : (Number.isFinite(normalizedDefaultDurationSec) && normalizedDefaultDurationSec > 0
        ? normalizedDefaultDurationSec
        : null);
    if (ctx.getOutputRole() === ctx.OUTPUT_ROLE_CONTROL) {
      if (existing) {
        ctx.stopAnimation(existing.id);
      } else {
        const animation = ctx.createAnimation({
          type,
          scope: "global",
          boardId: state.boardId,
          intensity: 1,
          soundVolume: playSound ? 1 : 0,
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
        intensity: 1,
        soundVolume: playSound ? 1 : 0,
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
