// Phase 14-2: quick-mode module.
//
// Owns the quick-mode state machine (off/activate/deactivate/clear),
// per-room inflight tracking, tap dispatch, and status sync.
//
// Dependencies injected via ctx:
//   state
//   DOM refs: quickModeOffButton, quickModeActivateButton,
//             quickModeDeactivateButton, quickModeClearButton,
//             quickModeStatus, quickModePanel, triggerFeedback
//   Constants: QUICK_MODE_VALUES, QUICK_MODE_LABELS
//   Helpers: showToast, startRoomAnimationFromDraft,
//            syncRoomTargetSelect, stopAnimation, getBoard,
//            getRoomAnimationLabelById, preserveMobileBoardOverview
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function normalizeQuickMode(mode) {
    const normalized = String(mode || "").trim().toLowerCase();
    return ctx.QUICK_MODE_VALUES.has(normalized) ? normalized : "off";
  }

  function getQuickModeInflightMap() {
    const state = ctx.state;
    if (!state.quickMode || typeof state.quickMode !== "object") {
      state.quickMode = { mode: "off", inflightByRoom: {} };
    }
    if (!state.quickMode.inflightByRoom || typeof state.quickMode.inflightByRoom !== "object") {
      state.quickMode.inflightByRoom = {};
    }
    return state.quickMode.inflightByRoom;
  }

  function getQuickModeInflightCount() {
    return Object.keys(getQuickModeInflightMap()).length;
  }

  function markQuickModeRoomInflight(roomId, holdMs = 520) {
    const normalizedRoomId = String(roomId || "").trim();
    if (!normalizedRoomId) {
      return false;
    }
    const inflightMap = getQuickModeInflightMap();
    if (inflightMap[normalizedRoomId]) {
      return false;
    }
    const timeoutId = window.setTimeout(() => {
      clearQuickModeRoomInflight(normalizedRoomId);
    }, Math.max(180, Number(holdMs) || 520));
    inflightMap[normalizedRoomId] = timeoutId;
    syncQuickModePanel();
    return true;
  }

  function clearQuickModeRoomInflight(roomId) {
    const normalizedRoomId = String(roomId || "").trim();
    if (!normalizedRoomId) {
      return;
    }
    const inflightMap = getQuickModeInflightMap();
    const timeoutId = inflightMap[normalizedRoomId];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
    delete inflightMap[normalizedRoomId];
    syncQuickModePanel();
  }

  function clearAllQuickModeInflight() {
    const inflightMap = getQuickModeInflightMap();
    for (const roomId of Object.keys(inflightMap)) {
      clearQuickModeRoomInflight(roomId);
    }
  }

  function syncQuickModePanel() {
    const state = ctx.state;
    const mode = normalizeQuickMode(state.quickMode?.mode);
    const inflightCount = getQuickModeInflightCount();
    const buttonMap = {
      off: ctx.quickModeOffButton,
      activate: ctx.quickModeActivateButton,
      deactivate: ctx.quickModeDeactivateButton,
      clear: ctx.quickModeClearButton,
    };
    for (const [value, button] of Object.entries(buttonMap)) {
      if (!button) {
        continue;
      }
      const isActive = mode === value;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
    if (ctx.quickModeStatus) {
      const contextualMessages = {
        off: "Select a room on the board",
        activate: "Tap a room to start its animation",
        deactivate: "Tap a room to stop its animation",
        clear: "Tap a room to clear all its animations",
      };
      const baseMessage = contextualMessages[mode] ?? contextualMessages.off;
      ctx.quickModeStatus.textContent = inflightCount > 0
        ? `${baseMessage} | busy: ${inflightCount}`
        : baseMessage;
    }
    if (ctx.quickModePanel) {
      ctx.quickModePanel.dataset.mode = mode;
      ctx.quickModePanel.classList.toggle("is-busy", inflightCount > 0);
    }
    // Phase 18: sync inline animation picker — visible in "activate" and "deactivate" modes
    syncQuickAnimationPicker(mode);
  }

  function syncQuickAnimationPicker(mode) {
    const picker = ctx.quickAnimationPicker;
    if (!picker) return;
    if (mode !== "activate" && mode !== "deactivate") {
      picker.style.display = "none";
      return;
    }
    picker.style.display = "flex";
    // Get room animation definitions for current board
    const state = ctx.state;
    const roomFx = ctx.getRoomFxProfile(state.boardId);
    const animations = roomFx?.animations;
    if (!Array.isArray(animations) || animations.length === 0) {
      picker.style.display = "none";
      return;
    }
    const currentId = state.roomDraft.animationId;
    // Only rebuild pills if the animation list changed
    const pillIds = Array.from(picker.children).map((el) => el.dataset.animationId);
    const defIds = animations.map((d) => d.id);
    const needsRebuild = pillIds.length !== defIds.length || pillIds.some((id, i) => id !== defIds[i]);
    if (needsRebuild) {
      picker.replaceChildren();
      for (const definition of animations) {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "quick-animation-pill";
        pill.dataset.animationId = definition.id;
        pill.textContent = definition.name;
        pill.setAttribute("role", "option");
        pill.addEventListener("click", () => {
          state.roomDraft.animationId = definition.id;
          // Also sync the main dropdown
          if (ctx.roomAnimationSelect) {
            ctx.roomAnimationSelect.value = definition.id;
          }
          syncQuickAnimationPickerSelection(definition.id);
        });
        picker.append(pill);
      }
    }
    syncQuickAnimationPickerSelection(currentId);
  }

  function syncQuickAnimationPickerSelection(selectedId) {
    const picker = ctx.quickAnimationPicker;
    if (!picker) return;
    for (const pill of picker.children) {
      const isSelected = pill.dataset.animationId === selectedId;
      pill.classList.toggle("is-selected", isSelected);
      pill.setAttribute("aria-selected", isSelected ? "true" : "false");
    }
  }

  function setQuickMode(nextMode, { announce = true } = {}) {
    const state = ctx.state;
    const normalizedMode = normalizeQuickMode(nextMode);
    const currentMode = normalizeQuickMode(state.quickMode?.mode);
    const inflightCount = getQuickModeInflightCount();
    if (
      normalizedMode !== currentMode
      && normalizedMode !== "off"
      && currentMode !== "off"
      && inflightCount > 0
    ) {
      ctx.triggerFeedback.textContent = "Status: Quick mode switch blocked while room actions are in flight";
      ctx.showToast("Quick mode switch blocked until in-flight room actions settle", {
        kind: "error",
        dedupeKey: "quick-mode-switch-blocked",
      });
      syncQuickModePanel();
      return;
    }
    state.quickMode.mode = normalizedMode;
    syncQuickModePanel();
    if (announce) {
      ctx.triggerFeedback.textContent = `Status: Quick mode ${ctx.QUICK_MODE_LABELS[normalizedMode] ?? ctx.QUICK_MODE_LABELS.off}`;
    }
  }

  function isQuickModeActive() {
    return normalizeQuickMode(ctx.state.quickMode?.mode) !== "off";
  }

  function getQuickModeRoomLabel(roomId) {
    return ctx.getBoard(ctx.state.boardId).rooms.find((entry) => entry.id === roomId)?.name ?? roomId;
  }

  function activateRoomAnimationByQuickTap(roomId) {
    const state = ctx.state;
    const normalizedRoomId = String(roomId || "").trim();
    if (!normalizedRoomId) {
      return;
    }
    const previousTargetType = state.roomDraft.targetType;
    const previousTargetId = state.roomDraft.targetId;
    const previousEditTargetId = state.roomDraft.editTargetId;
    state.roomDraft.targetType = "room";
    state.roomDraft.targetId = normalizedRoomId;
    state.roomDraft.editTargetId = null;
    ctx.startRoomAnimationFromDraft();
    state.roomDraft.targetType = previousTargetType;
    state.roomDraft.targetId = previousTargetId;
    state.roomDraft.editTargetId = previousEditTargetId;
    ctx.syncRoomTargetSelect();
    return {
      ok: true,
      action: "activate",
      roomLabel: getQuickModeRoomLabel(normalizedRoomId),
    };
  }

  function collectQuickTapRoomAnimationIds(roomId, { onlyType = null } = {}) {
    const state = ctx.state;
    const normalizedRoomId = String(roomId || "").trim();
    const normalizedType = typeof onlyType === "string" ? onlyType.trim() : "";
    if (!normalizedRoomId) {
      return [];
    }
    return state.runningAnimations
      .filter((animation) => {
        if (animation?.scope !== "room") {
          return false;
        }
        if (String(animation.roomId || "").trim() !== normalizedRoomId) {
          return false;
        }
        if (String(animation.boardId || "").trim() !== String(state.boardId || "").trim()) {
          return false;
        }
        if (!normalizedType) {
          return true;
        }
        return String(animation.type || "").trim() === normalizedType;
      })
      .map((animation) => animation.id)
      .filter(Boolean);
  }

  function deactivateRoomAnimationByQuickTap(roomId) {
    const state = ctx.state;
    const selectedAnimationType = String(state.roomDraft.animationId || "").trim();
    if (!selectedAnimationType) {
      return {
        ok: false,
        action: "deactivate",
        roomLabel: getQuickModeRoomLabel(roomId),
        reason: "missing-animation-selection",
        message: "Quick deactivate needs a selected animation",
      };
    }
    const targetIds = collectQuickTapRoomAnimationIds(roomId, { onlyType: selectedAnimationType });
    if (targetIds.length === 0) {
      const roomLabel = getQuickModeRoomLabel(roomId);
      return {
        ok: false,
        action: "deactivate",
        roomLabel,
        reason: "no-target",
        message: `No ${ctx.getRoomAnimationLabelById(selectedAnimationType, state.boardId)} running in ${roomLabel}`,
      };
    }
    for (const animationId of targetIds) {
      ctx.stopAnimation(animationId);
    }
    return {
      ok: true,
      action: "deactivate",
      roomLabel: getQuickModeRoomLabel(roomId),
      count: targetIds.length,
    };
  }

  function clearRoomAnimationsByQuickTap(roomId) {
    const targetIds = collectQuickTapRoomAnimationIds(roomId);
    if (targetIds.length === 0) {
      const roomLabel = getQuickModeRoomLabel(roomId);
      return {
        ok: false,
        action: "clear",
        roomLabel,
        reason: "no-target",
        message: `Clear mode found no running room animations in ${roomLabel}`,
      };
    }
    for (const animationId of targetIds) {
      ctx.stopAnimation(animationId);
    }
    return {
      ok: true,
      action: "clear",
      roomLabel: getQuickModeRoomLabel(roomId),
      count: targetIds.length,
    };
  }

  function reportQuickModeTapOutcome(mode, outcome, roomId) {
    if (!outcome) {
      return;
    }
    const roomLabel = outcome.roomLabel ?? getQuickModeRoomLabel(roomId);
    if (!outcome.ok) {
      const message = outcome.message || `Quick ${mode} had no effect in ${roomLabel}`;
      ctx.triggerFeedback.textContent = `Status: ${message}`;
      ctx.showToast(`Quick ${mode}: ${message}`, {
        kind: "error",
        dedupeKey: `quick-${mode}-${outcome.reason || "no-effect"}`,
        timeoutMs: 3200,
      });
      return;
    }
    const countSuffix = Number(outcome.count) > 0 ? ` (${outcome.count})` : "";
    ctx.triggerFeedback.textContent = `Pending: quick ${mode} accepted for ${roomLabel}${countSuffix}`;
    ctx.showToast(`Quick ${mode}: ${roomLabel}${countSuffix}`, {
      kind: "success",
      dedupeKey: `quick-${mode}-ok-${roomId}`,
      timeoutMs: 2200,
    });
  }

  function handleQuickModeRoomTap(roomId) {
    const state = ctx.state;
    if (ctx.isRoomFrozen(state.boardId, roomId)) {
      ctx.triggerFeedback.textContent = "Status: Room is frozen";
      return;
    }
    const mode = normalizeQuickMode(state.quickMode?.mode);
    ctx.preserveMobileBoardOverview("quick-mode-room-tap");
    if (!markQuickModeRoomInflight(roomId)) {
      ctx.triggerFeedback.textContent = "Status: Quick mode room action already in flight";
      return;
    }
    if (mode === "activate") {
      const outcome = activateRoomAnimationByQuickTap(roomId);
      reportQuickModeTapOutcome(mode, outcome, roomId);
      return;
    }
    if (mode === "deactivate") {
      const outcome = deactivateRoomAnimationByQuickTap(roomId);
      reportQuickModeTapOutcome(mode, outcome, roomId);
      return;
    }
    if (mode === "clear") {
      const outcome = clearRoomAnimationsByQuickTap(roomId);
      reportQuickModeTapOutcome(mode, outcome, roomId);
      return;
    }
    clearQuickModeRoomInflight(roomId);
    ctx.triggerFeedback.textContent = `Status: Quick mode ${ctx.QUICK_MODE_LABELS[mode] ?? mode} is OFF`;
  }

  window.TT_BEAMER_RUNTIME_QUICK_MODE = {
    init,
    normalizeQuickMode,
    getQuickModeInflightMap,
    getQuickModeInflightCount,
    markQuickModeRoomInflight,
    clearQuickModeRoomInflight,
    clearAllQuickModeInflight,
    syncQuickModePanel,
    setQuickMode,
    isQuickModeActive,
    getQuickModeRoomLabel,
    activateRoomAnimationByQuickTap,
    collectQuickTapRoomAnimationIds,
    deactivateRoomAnimationByQuickTap,
    clearRoomAnimationsByQuickTap,
    reportQuickModeTapOutcome,
    handleQuickModeRoomTap,
  };
})();
