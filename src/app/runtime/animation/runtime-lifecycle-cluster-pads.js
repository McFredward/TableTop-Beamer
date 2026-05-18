// lifecycle-cluster-pads sub-module — owns the
// cluster pad rail beside the board: the rAF rail-tracker (registered
// once in init), syncClusterPadsRect, renderClusterPads,
// dispatchClusterByTapAction, dispatchClusterToggle, dispatchClusterClear.
//
// W3.4-C5 critical: the rAF rail-tracker MUST register inside this
// module's init (NOT in the lifecycle shim). Per Wave 2 INVENTORY
// C5.6 kernel + RESEARCH §9 risk #6, the rAF is registered once and
// runs forever; if it stays in the wrong place the rail freezes
// silently. The kernel comment ("Cluster pads: artificial mini-rooms…
// the position:fixed cluster rail is synced to the stage's current
// screen rect on every tick + on resize") moves with the cluster-pads
// code (see W3.4-C5 verification requirement).
//
// dispatchClusterToggle / dispatchClusterClear call stopAnimation
// (cross-module → stop-pipeline). It is injected via init-deps so the
// bare-name calls inside those bodies remain byte-identical.
(() => {
  let ctx = null;
  // Cross-module callback injected at init time.
  let stopAnimation = null;

  // Phase 49 gap-closure-35: shared helper for the two rail-position
  // writers (the rAF tracker here + the post-zoom rAF in
  // runtime-viewport-zoom.js → syncStageZoomTransform). Returns the
  // rail-top + rail-height CSS-var values, clipped so the rail's visual
  // extent stays inside the .projection-area's bounding rect.
  function _computeClippedRail(rect, scale) {
    let railTop = rect.top;
    let railHeight = rect.height;
    if (scale <= 0) return { railTop, railHeight };
    const projArea = document.querySelector(".projection-area");
    if (!projArea) return { railTop, railHeight };
    const paRect = projArea.getBoundingClientRect();
    const origVisualTop = rect.top;
    const origVisualBottom = rect.top + rect.height * scale;
    const effVisualTop = Math.max(origVisualTop, paRect.top);
    const effVisualBottom = Math.min(origVisualBottom, paRect.bottom);
    const effVisualHeight = Math.max(0, effVisualBottom - effVisualTop);
    return {
      railTop: effVisualTop,
      railHeight: effVisualHeight / scale,
    };
  }

  function init(dependencies) {
    ctx = dependencies?.ctx ?? dependencies;
    stopAnimation = dependencies?.stopAnimation ?? null;

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
          // Phase 49 gap-closure-35 (2026-05-19): clip the rail's vertical
          // extent to the intersection with .projection-area's bounding
          // rect. The rail is position:fixed so it escapes the
          // projection-area's overflow:hidden — when the user pans the
          // board down the cluster pads overlay the dashboard controls
          // below (TableTop Beamer logo, Settings button, etc.).
          // The board itself stays clipped by projection-area's
          // overflow:hidden; the rail must behave the same way.
          //
          // CSS rail uses transform-origin: 100% 0 + scale(rail-scale),
          // so visual_top = rail-top, visual_bottom = rail-top + rail-height * rail-scale.
          // To clip to [paRect.top, paRect.bottom], new rail-height =
          // clippedVisualHeight / rail-scale.
          const { railTop, railHeight } = _computeClippedRail(rect, scale);
          const key = `${rect.left.toFixed(1)}|${railTop.toFixed(1)}|${railHeight.toFixed(1)}|${scale.toFixed(4)}`;
          if (key !== lastRailKey) {
            lastRailKey = key;
            rail.style.setProperty("--rail-left", `${rect.left}px`);
            rail.style.setProperty("--rail-top", `${railTop}px`);
            rail.style.setProperty("--rail-height", `${railHeight}px`);
            rail.style.setProperty("--rail-scale", String(scale));
          }
        }
      }
      window.requestAnimationFrame(rafTick);
    }
    window.requestAnimationFrame(rafTick);
  }

  // Cluster pads: artificial mini-rooms beside the board for each cluster
  // (users fire/clear cluster animations without picking individual rooms).
  // The position:fixed cluster rail is synced to the stage's current screen
  // rect on every tick + on resize — the rail sits outside #stage (avoiding
  // the dashboard's overflow:hidden chain) but visually attaches to the
  // stage's left edge.
  function syncClusterPadsRect() {
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
    // gap-closure-35: rail-top + rail-height clipped to projection-area.
    const layoutWidth = stage.clientWidth || rect.width;
    const scale = rect.width / Math.max(1, layoutWidth);
    const { railTop, railHeight } = _computeClippedRail(rect, scale);
    container.style.setProperty("--rail-left", `${rect.left}px`);
    container.style.setProperty("--rail-top", `${railTop}px`);
    container.style.setProperty("--rail-height", `${railHeight}px`);
    container.style.setProperty("--rail-scale", String(scale));
  }

  function renderClusterPads() {
    const { state } = ctx;
    const container = document.getElementById("cluster-pads");
    if (!container) {
      console.warn("[cluster-pads] container element missing from DOM");
      return;
    }
    syncClusterPadsRect();
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

  window.TT_BEAMER_RUNTIME_LIFECYCLE_CLUSTER_PADS = {
    init,
    updateClusterPadsRect: syncClusterPadsRect,
    renderClusterPads,
    dispatchClusterByTapAction,
    dispatchClusterToggle,
    dispatchClusterClear,
  };
})();
