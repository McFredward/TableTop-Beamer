// quick-mode module.
//
// Owns the quick-mode state machine (off/activate/deactivate/clear),
// per-room inflight tracking, tap dispatch, and status sync.
//
// Dependencies injected via ctx:
//   state
//   DOM refs: quickModeOffButton, quickModeToggleButton,
//             quickModeClearButton, quickModeStatus,
//             quickModePanel, triggerFeedback
//   Constants: QUICK_MODE_VALUES, QUICK_MODE_LABELS
//   Helpers: showToast, startRoomAnimationFromDraft,
//            syncRoomTargetSelect, stopAnimation, getBoard,
//            getRoomAnimationLabelById, preserveMobileBoardOverview
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  // Toggle is now the default mode; Select drops to the
  // rightmost slot and stops being the implicit fallback.
  function normalizeQuickMode(mode) {
    const normalized = String(mode || "").trim().toLowerCase();
    return ctx.QUICK_MODE_VALUES.has(normalized) ? normalized : "toggle";
  }

  function getQuickModeInflightMap() {
    const state = ctx.state;
    if (!state.quickMode || typeof state.quickMode !== "object") {
      state.quickMode = { mode: "toggle", inflightByRoom: {} };
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
    // buttonMap reflects the 3-segment UI. The activate
    // and deactivate refs are retained so stored state that still
    // carries those modes (snapshots, remote commands) lights up
    // Toggle visually — both converge there in the new UX.
    const buttonMap = {
      off: ctx.quickModeOffButton,
      toggle: ctx.quickModeToggleButton,
      activate: ctx.quickModeToggleButton,
      deactivate: ctx.quickModeToggleButton,
      clear: ctx.quickModeClearButton,
    };
    const segmentedButtons = [
      ctx.quickModeOffButton,
      ctx.quickModeToggleButton,
      ctx.quickModeClearButton,
    ];
    // Reset visual state first so only the mapped segment lights up.
    for (const btn of segmentedButtons) {
      if (!btn) continue;
      btn.classList.remove("active");
      btn.setAttribute("aria-selected", "false");
      btn.setAttribute("aria-pressed", "false");
    }
    const targetBtn = buttonMap[mode];
    if (targetBtn) {
      targetBtn.classList.add("active");
      targetBtn.setAttribute("aria-selected", "true");
      targetBtn.setAttribute("aria-pressed", "true");
    }
    if (ctx.quickModeStatus) {
      const contextualMessages = {
        off: "Select a room on the board",
        toggle: "Tap a room to toggle its armed animation",
        activate: "Tap a room to toggle its armed animation",
        deactivate: "Tap a room to toggle its armed animation",
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
    // Picker is the "armed animation library" — visible
    // whenever a room tap is meaningful (toggle + legacy activate/
    // deactivate). Hidden in Select (no room-tap action) and Clear
    // (armed animation doesn't matter when clearing all).
    syncQuickAnimationPicker(mode);
  }

  function syncQuickAnimationPicker(mode) {
    const picker = ctx.quickAnimationPicker;
    if (!picker) return;
    if (mode !== "activate" && mode !== "deactivate" && mode !== "toggle") {
      picker.style.display = "none";
      return;
    }
    // Clear the inline display so the CSS layout rule
    // wins. The legacy theme used flex via inline style; the
    // Obsidian theme uses a grid declared in theme-obsidian.css.
    picker.style.display = "";
    // Get room animation definitions for current board
    const state = ctx.state;
    const roomFx = ctx.getRoomFxProfile(state.boardId);
    const animations = roomFx?.animations;
    if (!Array.isArray(animations) || animations.length === 0) {
      picker.style.display = "none";
      return;
    }
    const currentId = state.roomDraft.animationId;
    // Rebuild pills when the animation list changes structurally OR
    // when any animation's name / resolved icon changes. The earlier
    // ID-only fingerprint missed in-place edits (rename, icon swap)
    // and missed board switches when both boards happened to have the
    // same default animation IDs in the same order — pills stayed
    // stale until the user cycled tap-action mode. (Phase 25 BACKLOG #3)
    const icons = window.TT_BEAMER_UI_ICONS;
    function resolveIconFor(def) {
      return icons?.resolveAnimationIcon ? icons.resolveAnimationIcon(def) : "sparkles";
    }
    const pillFingerprints = Array.from(picker.children).map((el) => el.dataset.animationFingerprint || "");
    const defFingerprints = animations.map((d) => `${d.id}|${d.name || ""}|${resolveIconFor(d)}`);
    const needsRebuild = pillFingerprints.length !== defFingerprints.length
      || pillFingerprints.some((fp, i) => fp !== defFingerprints[i]);
    if (needsRebuild) {
      picker.replaceChildren();
      // Build each entry as an icon tile (icon top, label
      // bottom). Icon resolution falls back through coded-effect type →
      // name keyword → sparkles (see resolveAnimationIcon). Future work will
      // let users override via the animation editor's icon picker.
      for (let i = 0; i < animations.length; i += 1) {
        const definition = animations[i];
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "quick-animation-pill";
        pill.dataset.animationId = definition.id;
        pill.dataset.animationFingerprint = defFingerprints[i];
        pill.setAttribute("role", "option");
        pill.setAttribute("title", definition.name || definition.id);
        if (icons && typeof icons.createIcon === "function") {
          pill.append(icons.createIcon(resolveIconFor(definition), { size: 22 }));
        }
        const label = document.createElement("span");
        label.className = "quick-animation-pill-label";
        label.textContent = definition.name;
        pill.append(label);
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

  // Toggle mode — start the armed animation in the room
  // if it isn't already running there, otherwise stop the running
  // instance(s) of that same animation. Collapses the legacy Start +
  // Stop modes into a single tap-to-toggle flow.
  function toggleRoomAnimationByQuickTap(roomId) {
    const state = ctx.state;
    const selectedAnimationType = String(state.roomDraft.animationId || "").trim();
    if (!selectedAnimationType) {
      return {
        ok: false,
        action: "toggle",
        roomLabel: getQuickModeRoomLabel(roomId),
        reason: "missing-animation-selection",
        message: "Pick an animation from the library first",
      };
    }
    const running = collectQuickTapRoomAnimationIds(roomId, {
      onlyType: selectedAnimationType,
    });
    if (running.length > 0) {
      for (const animationId of running) {
        ctx.stopAnimation(animationId);
      }
      return {
        ok: true,
        action: "toggle",
        roomLabel: getQuickModeRoomLabel(roomId),
        count: running.length,
        result: "stopped",
      };
    }
    const activated = activateRoomAnimationByQuickTap(roomId);
    if (activated?.ok) {
      return {
        ok: true,
        action: "toggle",
        roomLabel: activated.roomLabel,
        result: "started",
      };
    }
    return activated ?? {
      ok: false,
      action: "toggle",
      roomLabel: getQuickModeRoomLabel(roomId),
      reason: "activate-failed",
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
    // "toggle" is the new primary mode. "activate" and
    // "deactivate" are routed to the same handler so snapshots / remote
    // commands carrying legacy mode names still do the right thing.
    if (mode === "toggle" || mode === "activate" || mode === "deactivate") {
      const outcome = toggleRoomAnimationByQuickTap(roomId);
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
    toggleRoomAnimationByQuickTap,
    clearRoomAnimationsByQuickTap,
    reportQuickModeTapOutcome,
    handleQuickModeRoomTap,
  };
})();
