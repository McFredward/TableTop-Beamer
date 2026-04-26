// lifecycle-running-list sub-module — owns the
// running-animations dashboard list (renderRunningAnimationsList +
// helpers isRunningListInteractionActive, validateRunningListParity,
// refreshGlobalButtons).
//
// The big renderRunningAnimationsList function references many
// cross-module symbols by bare name (closeLiveEditor, openLiveEditor,
// stopAnimation, collectAnimationStopIds, isStopPendingForAnimationId,
// renderClusterPads). Those are injected via init-deps so the function
// body remains byte-identical to its post-C3 location in the shim.
//
// renderRunningAnimationsList also reads `liveEditorAnimationId`; the
// running-list IIFE owns its own shadow, kept in sync via
// lifecycleState.addLiveEditorAnimationIdListener.
(() => {
  let ctx = null;
  let liveEditorAnimationId = null;
  // Cross-module callbacks injected at init time so the function bodies
  // can reference them by bare name byte-identically.
  let closeLiveEditor = null;
  let openLiveEditor = null;
  let stopAnimation = null;
  let collectAnimationStopIds = null;
  let isStopPendingForAnimationId = null;
  let renderClusterPads = null;

  function init(dependencies) {
    ctx = dependencies?.ctx ?? dependencies;
    closeLiveEditor = dependencies?.closeLiveEditor ?? null;
    openLiveEditor = dependencies?.openLiveEditor ?? null;
    stopAnimation = dependencies?.stopAnimation ?? null;
    collectAnimationStopIds = dependencies?.collectAnimationStopIds ?? null;
    isStopPendingForAnimationId = dependencies?.isStopPendingForAnimationId ?? null;
    renderClusterPads = dependencies?.renderClusterPads ?? null;
    const lifecycleState = dependencies?.lifecycleState ?? window.TT_BEAMER_RUNTIME_LIFECYCLE_STATE;
    if (lifecycleState && typeof lifecycleState.addLiveEditorAnimationIdListener === "function") {
      // Pick up the current value first (in case the live-editor module
      // already wrote one) and stay in sync afterwards.
      liveEditorAnimationId = lifecycleState.getLiveEditorAnimationId();
      lifecycleState.addLiveEditorAnimationIdListener((value) => {
        liveEditorAnimationId = value;
      });
    }
  }

  // W3.4-C4b: renderRunningAnimationsList (369 lines) decomposed into
  // 4 named per-row helpers + a thin outer orchestrator. Helper bodies
  // are byte-identical to the corresponding sub-blocks of the post-C4a
  // renderRunningAnimationsList (verified via diff -w against the
  // captured C4a body). Renamed two helpers vs PLAN: PLAN proposed
  // `_applyRunningRowState` + `_wireRunningRowListeners`, but the actual
  // code has no separate "apply row state" step (state is read once at
  // build time) and listener wiring is tightly intertwined with button
  // creation. The natural cut is by execution phase
  // (counters → categorize → outer loop → per-row build), which the
  // helper names below reflect.

  function _renderRunningCountersChip(state) {
    // Topbar running-count chip — split into
    // default (auto-restoring) and custom (ad-hoc) animation counts.
    // An animation counts as "default" when its (type, roomId, scope)
    // triple is present in state.defaultAnimationsByBoard for its
    // board; everything else is "custom". Each line hides when its
    // count is zero; the whole chip hides when both are zero.
    const allRunning = Array.isArray(state.runningAnimations)
      ? state.runningAnimations
      : [];
    const totalRunning = allRunning.length;
    const defaultsByBoard = state.defaultAnimationsByBoard || {};
    let defaultCount = 0;
    for (const anim of allRunning) {
      const defs = defaultsByBoard[anim?.boardId] || [];
      const explicitDefault = defs.some(
        (d) => d.type === anim.type && d.roomId === anim.roomId && d.scope === anim.scope,
      );
      // Outside animations persist via the outside
      // profile's `enabled` flag, not through defaultAnimationsByBoard.
      // They still auto-restart on reload, so they belong in the
      // "default" count. scope === "global" covers outside-ship
      // animations that the outside FX panel pushes into runningAnimations.
      const impliedAutostart = anim?.scope === "global";
      if (explicitDefault || impliedAutostart) defaultCount += 1;
    }
    const customCount = totalRunning - defaultCount;
    if (ctx.runningCountChip) {
      ctx.runningCountChip.hidden = totalRunning === 0;
    }
    if (ctx.runningCountChipLabelDefault) {
      ctx.runningCountChipLabelDefault.hidden = defaultCount === 0;
      ctx.runningCountChipLabelDefault.textContent = `${defaultCount} default`;
    }
    if (ctx.runningCountChipLabelCustom) {
      ctx.runningCountChipLabelCustom.hidden = customCount === 0;
      ctx.runningCountChipLabelCustom.textContent = `${customCount} custom`;
    }
    if (ctx.runningCountChipLabel) {
      // Keep the single-line summary for screen readers + legacy
      // consumers.
      ctx.runningCountChipLabel.textContent = `${totalRunning} running`;
    }
  }

  function _categorizeAndOrderAnimations(listAnimations, getGlobalCategoryRuntimeLabel, getBoard, getClusterTargetById) {
    // Categorize into Outside / Inside / Cluster / Room /
    // Frozen sections with a heading per section, and sort newest-first
    // (by startedAt) within each section. Empty sections are omitted.
    // Frozen-room animations are pulled out of the Room/Cluster buckets
    // so the user can see at-a-glance what's playing in rooms they've
    // explicitly frozen.
    const isFrozenRoomAnim = (anim) => {
      if (typeof ctx.isRoomFrozen !== "function") return false;
      if (anim.scope === "room" && anim.roomId) {
        return ctx.isRoomFrozen(anim.boardId, anim.roomId);
      }
      return false;
    };
    const bucketFor = (anim) => {
      if (isFrozenRoomAnim(anim)) return "freezed";
      if (anim.scope === "cluster") return "cluster";
      if (anim.scope === "room") return "room";
      // scope === "global" — split outside vs inside by category label.
      const label = typeof getGlobalCategoryRuntimeLabel === "function"
        ? String(getGlobalCategoryRuntimeLabel(anim.type)).toLowerCase()
        : "";
      if (label === "outside" || label.includes("outside")) return "outside";
      return "inside";
    };
    const buckets = { outside: [], inside: [], cluster: [], room: [], freezed: [] };
    for (const anim of listAnimations) {
      const key = bucketFor(anim);
      if (buckets[key]) buckets[key].push(anim);
    }
    for (const key of Object.keys(buckets)) {
      buckets[key].sort((a, b) => {
        const startedDelta = Number(b.startedAt || 0) - Number(a.startedAt || 0);
        if (startedDelta !== 0) return startedDelta;
        return String(a.id || "").localeCompare(String(b.id || ""));
      });
    }
    const sectionMeta = [
      { key: "outside", label: "Outside" },
      { key: "inside", label: "Inside" },
      { key: "cluster", label: "Cluster" },
      { key: "room", label: "Room" },
      { key: "freezed", label: "Frozen Rooms" },
    ];
    // Within Room / Cluster / Frozen sections, animations
    // are further grouped by the room or cluster they target so the
    // user can see at a glance when multiple animations are stacked
    // inside one room. Outside + Inside stay flat (they apply board-
    // wide). The secondary sort is still newest-first within each
    // subgroup so the most-recently-triggered anim is on top.
    const GROUPED_SECTIONS = new Set(["room", "cluster", "freezed"]);
    const subgroupKeyFor = (anim) => {
      if (anim.scope === "room") return `room:${anim.roomId}`;
      if (anim.scope === "cluster") return `cluster:${anim.clusterId}`;
      return null;
    };
    const subgroupLabelFor = (anim) => {
      if (anim.scope === "room") {
        const board = getBoard(anim.boardId);
        return board.rooms.find((r) => r.id === anim.roomId)?.label ?? anim.roomId;
      }
      if (anim.scope === "cluster") {
        return anim.clusterName
          ?? getClusterTargetById(anim.clusterId, anim.boardId)?.name
          ?? anim.clusterId
          ?? "Cluster";
      }
      return "";
    };
    const sortedAnimations = [];
    const sectionKeyByAnimationId = new Map();
    const sectionLabelByKey = new Map();
    const sectionCountByKey = new Map();
    for (const { key, label } of sectionMeta) {
      const entries = buckets[key];
      if (!entries || entries.length === 0) continue;
      sectionLabelByKey.set(key, label);
      sectionCountByKey.set(key, entries.length);
      let orderedEntries = entries;
      if (GROUPED_SECTIONS.has(key)) {
        // Cluster members (rooms) together; rooms with more active
        // animations appear first so stacks are visually prominent.
        const byKey = new Map();
        for (const anim of entries) {
          const k = subgroupKeyFor(anim) ?? `_:${anim.id}`;
          if (!byKey.has(k)) byKey.set(k, []);
          byKey.get(k).push(anim);
        }
        const orderedKeys = [...byKey.keys()].sort((a, b) => {
          const la = byKey.get(a).length;
          const lb = byKey.get(b).length;
          if (lb !== la) return lb - la;
          return String(a).localeCompare(String(b));
        });
        orderedEntries = [];
        for (const k of orderedKeys) {
          const rooms = byKey.get(k);
          rooms.sort((a, b) =>
            Number(b.startedAt || 0) - Number(a.startedAt || 0),
          );
          orderedEntries.push(...rooms);
        }
      }
      for (const anim of orderedEntries) {
        sectionKeyByAnimationId.set(anim.id, key);
        sortedAnimations.push(anim);
      }
    }
    const subgroupCounts = new Map();
    // Pre-count so we know which rooms/clusters have a real stack
    // (> 1 anim) and therefore deserve a visual sub-cluster header.
    // Rooms with a single animation stay flat so the list doesn't
    // gain an extra heading per row in the common case.
    for (const anim of sortedAnimations) {
      const sk = sectionKeyByAnimationId.get(anim.id);
      if (!GROUPED_SECTIONS.has(sk)) continue;
      const gk = subgroupKeyFor(anim);
      if (!gk) continue;
      subgroupCounts.set(gk, (subgroupCounts.get(gk) || 0) + 1);
    }
    const stackedSubgroups = new Set();
    for (const [gk, count] of subgroupCounts) {
      if (count > 1) stackedSubgroups.add(gk);
    }
    return {
      sortedAnimations, sectionKeyByAnimationId, sectionLabelByKey,
      sectionCountByKey, subgroupKeyFor, subgroupLabelFor,
      subgroupCounts, stackedSubgroups, GROUPED_SECTIONS,
    };
  }

  function _buildRunningRow(anim, sectionKey, isStacked, deps) {
    const {
      runningAnimationsList, getRoomAnimationLabelById, getAnimationLabel,
      getBoard, getClusterTargetById, shouldSuppressRapidTap, setDashboardZone,
    } = deps;
    const li = document.createElement("li");
    li.className = "running-item";
    if (isStacked) {
      li.classList.add("running-item-grouped");
    }
    // Icon tile prepended to each row. Tint driven by
    // data-scope; glyph resolved from the animation definition via
    // ctx.getRoomAnimationDefinitionById (room + cluster scope), or
    // synthesized directly from anim.type for global scope (type IS
    // the coded key there — fire / malfunction / hull-flicker / …).
    const iconWrap = document.createElement("span");
    iconWrap.className = "running-item-icon";
    iconWrap.dataset.scope = sectionKey || "inside";
    iconWrap.setAttribute("aria-hidden", "true");
    const iconsApi = window.TT_BEAMER_UI_ICONS;
    if (iconsApi && typeof iconsApi.createIcon === "function") {
      let def = null;
      if ((anim.scope === "room" || anim.scope === "cluster")
          && typeof ctx.getRoomAnimationDefinitionById === "function") {
        def = ctx.getRoomAnimationDefinitionById(anim.type, anim.boardId);
      }
      const resolverInput = {
        icon: def?.icon ?? null,
        name: def?.name ?? anim.animationName ?? getAnimationLabel(anim.type),
        type: def?.type ?? (anim.scope === "global" ? "coded" : anim.type),
        codedEffectType:
          def?.codedEffectType
          ?? (anim.scope === "global" ? anim.type : null),
        codedKey: def?.codedKey ?? (anim.scope === "global" ? anim.type : null),
        assetType: def?.assetType ?? null,
        assetRef: def?.assetRef ?? null,
      };
      const iconName = iconsApi.resolveAnimationIcon
        ? iconsApi.resolveAnimationIcon(resolverInput)
        : "sparkles";
      iconWrap.append(iconsApi.createIcon(iconName, { size: 18 }));
    }
    li.append(iconWrap);
    const title = document.createElement("div");
    title.className = "running-title";
    const effectLabel = (anim.scope === "room" || anim.scope === "cluster") && anim.animationName
      ? anim.animationName
      : anim.scope === "room" || anim.scope === "cluster"
        ? getRoomAnimationLabelById(anim.type, anim.boardId)
        : getAnimationLabel(anim.type);
    title.textContent = effectLabel;

    // Compact single-line sub-meta. For non-stacked
    // rooms/clusters we prefix the target name so the user still
    // knows WHICH room/cluster the animation belongs to — stacked
    // rows omit it because the subgroup header already shows it.
    // Outside / Inside sections are board-wide so no target prefix.
    // The "hold" state (no durationMs) is the default for most
    // animations, so we omit the timer entirely in that case —
    // showing "hold" on every row just adds noise.
    const meta = document.createElement("div");
    meta.className = "running-meta";
    const hasTimer = Number(anim.durationMs) > 0;
    const timerLabel = hasTimer
      ? `in ${Math.max(0, Math.ceil((anim.startedAt + anim.durationMs - performance.now()) / 1000))}s`
      : null;
    let targetLabel = null;
    if (!isStacked) {
      if (anim.scope === "room") {
        const board = getBoard(anim.boardId);
        targetLabel = board.rooms.find((r) => r.id === anim.roomId)?.label
          ?? anim.roomId
          ?? null;
      } else if (anim.scope === "cluster") {
        targetLabel = anim.clusterName
          ?? getClusterTargetById(anim.clusterId, anim.boardId)?.name
          ?? anim.clusterId
          ?? null;
      }
    }
    if (targetLabel) {
      const targetEl = document.createElement("span");
      targetEl.className = "running-meta-target";
      targetEl.textContent = targetLabel;
      meta.append(targetEl);
      if (timerLabel) {
        const sep = document.createElement("span");
        sep.className = "running-meta-sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "·";
        const timerEl = document.createElement("span");
        timerEl.className = "running-meta-timer";
        timerEl.textContent = timerLabel;
        meta.append(sep, timerEl);
      }
    } else if (timerLabel) {
      meta.textContent = timerLabel;
    } else {
      meta.hidden = true;
    }

    const actions = document.createElement("div");
    actions.className = "running-actions";
    const stopButton = document.createElement("button");
    stopButton.type = "button";
    const stopPending = [...collectAnimationStopIds(anim)].some((id) => isStopPendingForAnimationId(id));
    stopButton.textContent = stopPending ? "Stopping..." : "Stop";
    stopButton.disabled = stopPending;
    stopButton.addEventListener("click", () => {
      const pendingAtClick = [...collectAnimationStopIds(anim)].some((id) => isStopPendingForAnimationId(id));
      if (pendingAtClick) {
        return;
      }
      if (shouldSuppressRapidTap(`running-stop-${anim.id}`)) {
        return;
      }
      setDashboardZone("manage");
      stopAnimation(anim.id);
    });
    actions.append(stopButton);

    // Also allow Live Editor on scope="global" so outside
    // (and inside) running animations can have their per-instance
    // intensity/speed edited, independent of the definition defaults.
    if (anim.scope === "room" || anim.scope === "cluster" || anim.scope === "global") {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        if (shouldSuppressRapidTap(`running-edit-${anim.id}`)) {
          return;
        }
        setDashboardZone("manage");
        openLiveEditor(anim.id);
      });
      actions.append(editButton);
    }

    li.append(title, meta, actions);
    runningAnimationsList.append(li);
  }

  function _renderRunningRowsContainer(orderInfo, deps) {
    const { runningAnimationsList } = deps;
    const {
      sortedAnimations, sectionKeyByAnimationId, sectionLabelByKey,
      sectionCountByKey, subgroupKeyFor, subgroupLabelFor,
      subgroupCounts, stackedSubgroups, GROUPED_SECTIONS,
    } = orderInfo;
    let lastSectionKey = null;
    let lastSubgroupKey = null;
    for (const anim of sortedAnimations) {
      const sectionKey = sectionKeyByAnimationId.get(anim.id);
      if (sectionKey && sectionKey !== lastSectionKey) {
        const heading = document.createElement("li");
        heading.className = `running-section-heading running-section-${sectionKey}`;
        heading.setAttribute("role", "presentation");
        heading.textContent = `${sectionLabelByKey.get(sectionKey)} (${sectionCountByKey.get(sectionKey)})`;
        runningAnimationsList.append(heading);
        lastSectionKey = sectionKey;
        lastSubgroupKey = null;
      }
      const subKey = GROUPED_SECTIONS.has(sectionKey) ? subgroupKeyFor(anim) : null;
      const isStacked = subKey && stackedSubgroups.has(subKey);
      if (isStacked && subKey !== lastSubgroupKey) {
        const subLabel = subgroupLabelFor(anim);
        const count = subgroupCounts.get(subKey);
        const subHeading = document.createElement("li");
        subHeading.className = "running-subgroup-heading";
        subHeading.setAttribute("role", "presentation");
        const name = document.createElement("span");
        name.className = "running-subgroup-name";
        name.textContent = subLabel;
        subHeading.append(name);
        const countChip = document.createElement("span");
        countChip.className = "running-subgroup-count";
        countChip.textContent = `${count} anims`;
        subHeading.append(countChip);
        runningAnimationsList.append(subHeading);
        lastSubgroupKey = subKey;
      } else if (!isStacked) {
        lastSubgroupKey = null;
      }
      _buildRunningRow(anim, sectionKey, isStacked, deps);
    }
  }

  function renderRunningAnimationsList() {
    const {
      state, runningAnimationsList, triggerFeedback,
      getRunningAnimationsForList, getRoomAnimationLabelById, getAnimationLabel,
      getBoard, getClusterTargetById, getGlobalCategoryRuntimeLabel,
      shouldSuppressRapidTap, setDashboardZone,
    } = ctx;
    // Auto-close live editor if the animation it targets no longer exists.
    if (liveEditorAnimationId !== null) {
      const editorAnimationStillRunning = state.runningAnimations.some(
        (item) => item?.id === liveEditorAnimationId,
      );
      if (!editorAnimationStillRunning) {
        closeLiveEditor();
      }
    }
    const parity = validateRunningListParity();
    runningAnimationsList.replaceChildren();
    const listAnimations = getRunningAnimationsForList();
    _renderRunningCountersChip(state);
    if (listAnimations.length === 0) {
      const empty = document.createElement("li");
      empty.className = "running-empty";
      empty.textContent = "No active animations";
      runningAnimationsList.append(empty);
      return;
    }

    const orderInfo = _categorizeAndOrderAnimations(
      listAnimations,
      getGlobalCategoryRuntimeLabel,
      getBoard,
      getClusterTargetById,
    );
    _renderRunningRowsContainer(orderInfo, {
      runningAnimationsList,
      getRoomAnimationLabelById,
      getAnimationLabel,
      getBoard,
      getClusterTargetById,
      shouldSuppressRapidTap,
      setDashboardZone,
    });

    if (!parity.ok) {
      triggerFeedback.textContent = `Status: Running-Liste-Guard meldet Drift (${parity.reason})`;
    }
  }

  function isRunningListInteractionActive() {
    const { runningAnimationsList } = ctx;
    if (!runningAnimationsList) {
      return false;
    }
    if (runningAnimationsList.matches(":hover") || runningAnimationsList.matches(":focus-within")) {
      return true;
    }
    const activeElement = document.activeElement;
    return Boolean(activeElement && runningAnimationsList.contains(activeElement));
  }

  function validateRunningListParity() {
    const { state } = ctx;
    const seenIds = new Set();
    const activeClusterIds = new Set();
    for (const entry of state.runningAnimations) {
      if (!entry?.id || seenIds.has(entry.id)) {
        return { ok: false, reason: "duplicate-or-missing-id" };
      }
      seenIds.add(entry.id);
      if (entry.scope === "cluster") {
        activeClusterIds.add(entry.id);
      }
    }
    for (const entry of state.runningAnimations) {
      if (entry?.scope !== "room" || !entry?.parentClusterRunId) {
        continue;
      }
      if (activeClusterIds.has(entry.parentClusterRunId)) {
        continue;
      }
      return { ok: false, reason: "orphaned-cluster-member" };
    }
    return { ok: true, reason: "ok" };
  }

  function refreshGlobalButtons() {
    const { state } = ctx;
    document.querySelectorAll("button[data-global]").forEach((button) => {
      const type = button.dataset.global;
      const isActive = state.runningAnimations.some(
        (anim) => anim.scope === "global" && anim.type === type && anim.boardId === state.boardId,
      );
      button.classList.toggle("active", isActive);
    });
    try { renderClusterPads(); } catch { /* defensive — never crash render loop */ }
  }

  window.TT_BEAMER_RUNTIME_LIFECYCLE_RUNNING_LIST = {
    init,
    renderRunningAnimationsList,
    isRunningListInteractionActive,
    validateRunningListParity,
    refreshGlobalButtons,
  };
})();
