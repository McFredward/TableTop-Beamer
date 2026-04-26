// animation lifecycle module.
//
// Owns the animation stop/edit dispatch pipeline:
//   - collectAnimationStopIds / buildStopCommandTargetMeta
//   - stopAnimation / emitStopAnimationCommand
//   - editAnimation
//   - renderRunningAnimationsList / isRunningListInteractionActive
//   - validateRunningListParity
//   - refreshGlobalButtons
//   - liveSync pendingStopAnimationIds helpers
//
// Dependencies injected via ctx (large surface — this module touches
// the entire running-animations lifecycle from stop commands through
// list rendering).
(() => {
  let ctx = null;
  // Shim-side shadow of the lifecycle-state's animationId. Kept in
  // sync via lifecycleState.addLiveEditorAnimationIdListener (W3.2-C5
  // fanout pattern, extended in W3.4-C3a). Read by the still-in-shim
  // renderRunningAnimationsList for the auto-close-when-deleted check
  // until renderRunningAnimationsList migrates to running-list in C4a.
  let liveEditorAnimationId = null;
  // Lifecycle-state sub-module reference (W3.4-C1).
  let lifecycleState = null;
  // Shim-side shadows of stop-pipeline functions (W3.4-C2) used by the
  // still-in-shim renderRunningAnimationsList / dispatchClusterToggle /
  // dispatchClusterClear so their bare-name calls (`stopAnimation(...)`,
  // `collectAnimationStopIds(...)`, `isStopPendingForAnimationId(...)`)
  // remain byte-identical. Reassigned in init from the stop-pipeline
  // namespace.
  let stopAnimation = null;
  let collectAnimationStopIds = null;
  let isStopPendingForAnimationId = null;
  // Shim-side shadows of live-editor functions (W3.4-C3a) — read by
  // the still-in-shim renderRunningAnimationsList (`openLiveEditor`
  // for the Edit button click handler, `closeLiveEditor` for the
  // auto-close-when-deleted check). Public namespace exposes
  // editAnimation + closeLiveEditor directly via liveEditor.* refs in
  // the namespace block. Reassigned in init from the live-editor
  // namespace.
  let openLiveEditor = null;
  let closeLiveEditor = null;
  // Sub-module namespace refs. Captured at IIFE-top (defer-script
  // ordering ensures sub-module IIFEs have run before this one).
  const stopPipeline = window.TT_BEAMER_RUNTIME_LIFECYCLE_STOP_PIPELINE;
  const liveEditor = window.TT_BEAMER_RUNTIME_LIFECYCLE_LIVE_EDITOR;

  function init(dependencies) {
    ctx = dependencies;

    // Initialize the lifecycle-state sub-module first so subsequent
    // sub-module inits can hand it through.
    lifecycleState = window.TT_BEAMER_RUNTIME_LIFECYCLE_STATE;
    lifecycleState.init({ ctx: dependencies });

    // Initialize stop-pipeline (W3.4-C2). renderRunningAnimationsList +
    // refreshGlobalButtons are still in the shim until W3.4-C4a; they
    // are passed in as deps so stopAnimation's body can call them by
    // bare name byte-identically.
    stopPipeline.init({
      ctx: dependencies,
      renderRunningAnimationsList: () => renderRunningAnimationsList(),
      refreshGlobalButtons: () => refreshGlobalButtons(),
    });
    stopAnimation = stopPipeline.stopAnimation;
    collectAnimationStopIds = stopPipeline.collectAnimationStopIds;
    isStopPendingForAnimationId = stopPipeline.isStopPendingForAnimationId;

    // Continuous rAF tracking of the cluster rail
    // position. CSS transitions on .stage's transform mean the
    // bounding rect interpolates over ~120 ms after every pan/zoom
    // commit; one-shot rAF after the commit catches the START of
    // the transition but the rail then drifts until the next
    // render tick. A continuous rAF with diff-skip (only writes
    // CSS variables when the rect actually changed) is cheap and
    // keeps the rail perfectly glued.
    let lastRailKey = "";
    function rafTick() {
      const stage = ctx?.stage || document.getElementById("stage");
      const rail = document.getElementById("cluster-pads");
      if (stage && rail) {
        const rect = stage.getBoundingClientRect();
        if (rect.width > 0) {
          const layoutWidth = stage.clientWidth || rect.width;
          const scale = rect.width / Math.max(1, layoutWidth);
          const key = `${rect.left.toFixed(1)}|${rect.top.toFixed(1)}|${rect.height.toFixed(1)}|${scale.toFixed(4)}`;
          if (key !== lastRailKey) {
            lastRailKey = key;
            rail.style.setProperty("--rail-left", `${rect.left}px`);
            rail.style.setProperty("--rail-top", `${rect.top}px`);
            rail.style.setProperty("--rail-height", `${rect.height}px`);
            rail.style.setProperty("--rail-scale", String(scale));
          }
        }
      }
      window.requestAnimationFrame(rafTick);
    }
    window.requestAnimationFrame(rafTick);

    // Initialize live-editor sub-module (W3.4-C3a). The slider/close/
    // discard listener wiring previously inlined here moves into
    // liveEditor.init.
    liveEditor.init({ ctx: dependencies, lifecycleState });
    openLiveEditor = liveEditor.openLiveEditor;
    closeLiveEditor = liveEditor.closeLiveEditor;

    // Subscribe to lifecycleState's animationId mirror so the still-in-
    // shim renderRunningAnimationsList (until W3.4-C4a) keeps reading
    // the correct value via its IIFE-local shadow `liveEditorAnimationId`.
    // Same pattern as W3.2-C5's addHandlesVisibleListener fanout.
    lifecycleState.addLiveEditorAnimationIdListener((value) => {
      liveEditorAnimationId = value;
    });
  }

  // markLiveEditorDirty + applyLiveEditorValue + the `liveEditorDirty`
  // state moved to runtime-lifecycle-state.js (W3.4-C1).


  function renderRunningAnimationsList() {
    const {
      state, runningAnimationsList, triggerFeedback,
      getRunningAnimationsForList, getRoomAnimationLabelById, getAnimationLabel,
      getBoard, getClusterTargetById, getGlobalCategoryRuntimeLabel,
      clampRoomOpacity, clampRoomSpeed, clampRoomSoundVolume,
      clampClusterStaggerOffsetMs, getRoomGifAssetFileName, getRoomEquivalentType,
      getClusterMemberAnimationIds, shouldSuppressRapidTap, setDashboardZone,
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
    if (listAnimations.length === 0) {
      const empty = document.createElement("li");
      empty.className = "running-empty";
      empty.textContent = "No active animations";
      runningAnimationsList.append(empty);
      return;
    }

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
    let lastSectionKey = null;
    let lastSubgroupKey = null;
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

  // Cluster pads: artificial mini-rooms beside the board for each cluster
  // (users fire/clear cluster animations without picking individual rooms).
  // The position:fixed cluster rail is synced to the stage's current screen
  // rect on every tick + on resize — the rail sits outside #stage (avoiding
  // the dashboard's overflow:hidden chain) but visually attaches to the
  // stage's left edge.
  function updateClusterPadsRect() {
    const container = document.getElementById("cluster-pads");
    if (!container) return;
    const stage = ctx?.stage || document.getElementById("stage");
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0) return;
    // CSS variables — the rail's `transform: translateX(-100%) scale(s)`
    // pulls it leftward by its own width (so its right edge aligns
    // with --rail-left, i.e. stage's left edge), and scales by the
    // current stage scale so pan + zoom track together.
    container.style.setProperty("--rail-left", `${rect.left}px`);
    container.style.setProperty("--rail-top", `${rect.top}px`);
    container.style.setProperty("--rail-height", `${rect.height}px`);
    // Approximate stage scale from rect width vs layout width.
    const layoutWidth = stage.clientWidth || rect.width;
    const scale = rect.width / Math.max(1, layoutWidth);
    container.style.setProperty("--rail-scale", String(scale));
  }

  function renderClusterPads() {
    const { state } = ctx;
    const container = document.getElementById("cluster-pads");
    if (!container) {
      console.warn("[cluster-pads] container element missing from DOM");
      return;
    }
    updateClusterPadsRect();
    // Pads now live in the inner scrollable list,
    // not the rail container itself. The rail container also holds
    // the "Cluster" header which must NOT be touched by this pass.
    let listEl = document.getElementById("cluster-pads-list");
    if (!listEl) {
      // Defensive bootstrap if the list element is missing (e.g.
      // pre-W2-v8 cached HTML). Build it inside the container.
      listEl = document.createElement("div");
      listEl.id = "cluster-pads-list";
      listEl.className = "cluster-pads-list";
      listEl.setAttribute("role", "list");
      container.append(listEl);
    }
    const clusters = (typeof ctx.getBoardRoomClusters === "function")
      ? (ctx.getBoardRoomClusters(state.boardId) || [])
      : [];

    // Sync DOM children with cluster list. Reuse existing pads when
    // their clusterId matches so we don't churn DOM on every state
    // update — only running-state class flips.
    const existingByClusterId = new Map();
    let emptyHint = null;
    for (const child of Array.from(listEl.children)) {
      const clusterId = child?.dataset?.clusterId;
      if (clusterId) existingByClusterId.set(clusterId, child);
      else if (child?.classList?.contains("cluster-pads-empty")) emptyHint = child;
    }
    const seen = new Set();
    for (const cluster of clusters) {
      const clusterId = String(cluster.clusterId || "").trim();
      if (!clusterId) continue;
      seen.add(clusterId);
      let pad = existingByClusterId.get(clusterId);
      if (!pad) {
        pad = document.createElement("div");
        pad.className = "cluster-pad";
        pad.dataset.clusterId = clusterId;
        const render = document.createElement("div");
        render.className = "cluster-pad-render";
        // Per-pad canvas. Animation pixels for the
        // cluster's first member room get blitted in here every frame
        // by the draw loop's drawClusterPadCanvases pass — see
        // runtime-draw-loop.js. The pad now visually IS the running
        // animation, not a static label.
        const canvas = document.createElement("canvas");
        canvas.className = "cluster-pad-canvas";
        render.appendChild(canvas);
        const dot = document.createElement("span");
        dot.className = "cluster-pad-dot";
        dot.setAttribute("aria-hidden", "true");
        const label = document.createElement("div");
        label.className = "cluster-pad-label";
        pad.append(render, dot, label);
        // Pad behaves exactly like a room — tap
        // dispatches via the active Tap-Action (Off / Toggle /
        // Clear). No inline × control; mode is set globally on
        // the dashboard.
        pad.addEventListener("click", () => {
          dispatchClusterByTapAction(clusterId);
        });
        listEl.append(pad);
      }
      // Always sync label text (name may have changed in editor).
      const labelEl = pad.querySelector(".cluster-pad-label");
      if (labelEl) labelEl.textContent = cluster.name || clusterId;
      // Sync running state.
      const isRunning = state.runningAnimations.some(
        (anim) => anim?.scope === "cluster"
          && String(anim.clusterId || "").trim() === clusterId
          && String(anim.boardId || "").trim() === String(state.boardId || "").trim(),
      );
      pad.classList.toggle("is-running", isRunning);
    }
    // Remove pads for clusters that no longer exist.
    for (const [clusterId, pad] of existingByClusterId) {
      if (!seen.has(clusterId)) pad.remove();
    }
    // Empty-state hint: show a soft "no clusters" pill when there
    // are zero clusters on the active board so the rail position
    // is verifiable at a glance + the user knows the surface
    // exists.
    if (clusters.length === 0) {
      if (!emptyHint) {
        emptyHint = document.createElement("div");
        emptyHint.className = "cluster-pads-empty";
        emptyHint.textContent = "No clusters on this board";
        listEl.append(emptyHint);
      }
    } else if (emptyHint) {
      emptyHint.remove();
    }
  }

  // Pad tap routes through the active Tap-Action
  // mode just like room taps. Off = no-op; Toggle = toggle dispatch;
  // Clear = stop everything for this cluster.
  function dispatchClusterByTapAction(clusterId) {
    const { state } = ctx;
    const mode = String(state.quickMode?.mode || "toggle").toLowerCase();
    const armedId = String(state.roomDraft?.animationId || "").trim();
    if (ctx.triggerFeedback) {
      ctx.triggerFeedback.textContent =
        `Status: cluster pad tap (mode=${mode}, armed=${armedId || "(none)"})`;
    }
    if (mode === "off") return;
    if (mode === "clear") {
      dispatchClusterClear(clusterId);
      return;
    }
    // mode === "toggle" (default)
    dispatchClusterToggle(clusterId);
  }

  // Toggle is TYPE-aware: like a normal room tap, it toggles only
  // the armed animation TYPE on this cluster. Other cluster
  // animations of different types stay running (multi-animation
  // per cluster, same as multi-animation per room).
  function dispatchClusterToggle(clusterId) {
    const { state } = ctx;
    const normalizedClusterId = String(clusterId || "").trim();
    if (!normalizedClusterId) return;
    const armedType = String(state.roomDraft?.animationId || "").trim();
    // Find existing cluster-scope entries on this cluster of the
    // CURRENTLY ARMED type — those are the ones a same-type tap
    // should stop. Other cluster entries are left alone.
    const matchingTypeEntries = state.runningAnimations.filter(
      (anim) => anim?.scope === "cluster"
        && String(anim.clusterId || "").trim() === normalizedClusterId
        && String(anim.boardId || "").trim() === String(state.boardId || "").trim()
        && (!armedType || String(anim.type || "").trim() === armedType),
    );
    if (matchingTypeEntries.length > 0) {
      // stopAnimation is defined locally in this module — call it
      // directly. ctx.stopAnimation isn't forwarded.
      for (const anim of matchingTypeEntries) {
        stopAnimation(anim.id);
      }
      return;
    }
    // Start: temporarily flip roomDraft to target this cluster, then
    // call startRoomAnimationFromDraft (the same path the dropdown
    // + room-tap pipeline uses).
    const previousTargetType = state.roomDraft.targetType;
    const previousTargetId = state.roomDraft.targetId;
    const previousEditTargetId = state.roomDraft.editTargetId;
    state.roomDraft.targetType = "cluster";
    state.roomDraft.targetId = normalizedClusterId;
    state.roomDraft.editTargetId = null;
    if (typeof ctx.startRoomAnimationFromDraft === "function") {
      try {
        ctx.startRoomAnimationFromDraft();
      } catch (error) {
        console.error("[cluster-pad] startRoomAnimationFromDraft THREW:", error);
      }
    } else {
      console.warn("[cluster-pad] ctx.startRoomAnimationFromDraft is not a function");
    }
    state.roomDraft.targetType = previousTargetType;
    state.roomDraft.targetId = previousTargetId;
    state.roomDraft.editTargetId = previousEditTargetId;
    if (typeof ctx.syncRoomTargetSelect === "function") {
      ctx.syncRoomTargetSelect();
    }
  }

  function dispatchClusterClear(clusterId) {
    const { state } = ctx;
    const normalizedClusterId = String(clusterId || "").trim();
    if (!normalizedClusterId) return;
    const matches = state.runningAnimations.filter(
      (anim) => anim?.scope === "cluster"
        && String(anim.clusterId || "").trim() === normalizedClusterId
        && String(anim.boardId || "").trim() === String(state.boardId || "").trim(),
    );
    for (const anim of matches) {
      stopAnimation(anim.id);
    }
  }

  window.TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE = {
    init,
    collectAnimationStopIds: stopPipeline.collectAnimationStopIds,
    isStopPendingForAnimationId: stopPipeline.isStopPendingForAnimationId,
    markStopPending: stopPipeline.markStopPending,
    clearStopPending: stopPipeline.clearStopPending,
    reconcileStopPendingFromSnapshot: stopPipeline.reconcileStopPendingFromSnapshot,
    buildStopCommandTargetMeta: stopPipeline.buildStopCommandTargetMeta,
    emitStopAnimationCommand: stopPipeline.emitStopAnimationCommand,
    stopAnimation: stopPipeline.stopAnimation,
    editAnimation: liveEditor.editAnimation,
    renderRunningAnimationsList,
    isRunningListInteractionActive,
    validateRunningListParity,
    refreshGlobalButtons,
    renderClusterPads,
    closeLiveEditor: liveEditor.closeLiveEditor,
  };
})();
