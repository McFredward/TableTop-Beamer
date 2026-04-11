// Phase 14-2: runtime snapshot + toast + canonical-polygon issue module.
//
// Owns the outbound runtime snapshot builder for live-sync, the
// adaptive polling scheduler, the toast stack (with dedupe), the
// high-level reportActionError channel, the canonical play-area
// issue collector, canonical issue reporter, snapshot envelope
// normalizer, and the pending-mutation-by-version resolver.
(() => {
  let ctx = null;
  const toastDedupByKey = new Map();

  function init(dependencies) {
    ctx = dependencies;
  }

  function buildRuntimeSnapshotForLiveSync() {
    const state = ctx.state;
    return {
      boardId: state.boardId,
      selectedBoard: state.selectedBoard ?? state.boardId,
      selectedLayout: state.selectedLayout ?? state.boardId,
      selectedRoomId: state.selectedRoomId,
      selectedRoomByBoard: state.selectedRoomByBoard,
      insideFxByBoard: Object.fromEntries(
        ctx.getBoards().map((board) => [board.id, ctx.normalizeInsideFxProfile(state.insideFxByBoard[board.id])]),
      ),
      roomFxByBoard: Object.fromEntries(
        ctx.getBoards().map((board) => [board.id, ctx.normalizeRoomFxProfile(state.roomFxByBoard?.[board.id])]),
      ),
      outsideFxByBoard: Object.fromEntries(
        ctx.getBoards().map((board) => [board.id, ctx.normalizeOutsideFxProfile(state.outsideFxByBoard[board.id])]),
      ),
      runningAnimations: state.runningAnimations.map((animation) => ({
        ...animation,
        startedAtEpochMs: ctx.getAnimationStartedAtEpochMs(animation),
      })),
      roomDraft: state.roomDraft,
      animationSpeed: state.animationSpeed,
      audio: state.audio,
      alignMode: state.alignMode,
      mp4Performance: ctx.getMp4PerformanceControls(),
    };
  }

  function getAdaptivePollingIntervalMs() {
    const liveSync = ctx.liveSync;
    const now = Date.now();
    const documentVisible = document.visibilityState === "visible";
    const fastMode =
      liveSync.pendingMutations.size > 0 ||
      liveSync.dirtyHintUntil > now ||
      liveSync.preferFastPollingUntil > now ||
      documentVisible;
    return fastMode ? ctx.LIVE_POLL_FAST_MS : ctx.LIVE_POLL_IDLE_MS;
  }

  function scheduleNextLiveSnapshotPoll(delayOverrideMs = null) {
    const liveSync = ctx.liveSync;
    if (!liveSync.pollingEnabled) {
      return;
    }
    if (ctx.isHeavyInteractionActive()) {
      if (liveSync.pollTimerId !== null) {
        window.clearTimeout(liveSync.pollTimerId);
        liveSync.pollTimerId = null;
      }
      return;
    }
    if (liveSync.pollTimerId !== null) {
      window.clearTimeout(liveSync.pollTimerId);
      liveSync.pollTimerId = null;
    }
    const adaptive = getAdaptivePollingIntervalMs();
    const backoff = Math.max(0, Number(liveSync.pollBackoffMs) || 0);
    const delayMs = Math.max(0, Number.isFinite(delayOverrideMs) ? Number(delayOverrideMs) : Math.max(adaptive, backoff));
    liveSync.pollTimerId = window.setTimeout(() => {
      liveSync.pollTimerId = null;
      void ctx.pollLiveSnapshotOnce();
    }, delayMs);
  }

  function showToast(message, { kind = "error", timeoutMs = ctx.TOAST_DEFAULT_TIMEOUT_MS, dedupeKey = "" } = {}) {
    if (!ctx.toastStack || !message || ctx.outputRole === ctx.OUTPUT_ROLE_FINAL) {
      return;
    }
    const key = String(dedupeKey || message).trim();
    const now = Date.now();
    if (key) {
      const previousAt = Number(toastDedupByKey.get(key) || 0);
      if (now - previousAt < ctx.TOAST_DEDUPE_COOLDOWN_MS) {
        return;
      }
      toastDedupByKey.set(key, now);
    }
    const node = document.createElement("div");
    node.className = `toast toast-${kind}`;
    node.textContent = String(message);
    ctx.toastStack.prepend(node);
    while (ctx.toastStack.childElementCount > ctx.TOAST_MAX_ENTRIES) {
      ctx.toastStack.lastElementChild?.remove();
    }
    window.setTimeout(() => {
      node.remove();
    }, Math.max(1200, Number(timeoutMs) || ctx.TOAST_DEFAULT_TIMEOUT_MS));
  }

  function reportActionError(statusText, {
    toastText = statusText,
    dedupeKey = "runtime-action-error",
  } = {}) {
    if (ctx.triggerFeedback) {
      ctx.triggerFeedback.textContent = statusText.startsWith("Status:") ? statusText : `Status: ${statusText}`;
    }
    showToast(toastText, { kind: "error", dedupeKey });
  }

  function collectCanonicalPlayAreaIssuesFromProfiles(boardProfilesById, { sourceLabel = "unknown" } = {}) {
    const issues = [];
    if (!boardProfilesById || typeof boardProfilesById !== "object") {
      return issues;
    }
    for (const [boardId, profile] of Object.entries(boardProfilesById)) {
      const sourcePlayAreas = Array.isArray(profile?.playAreas) ? profile.playAreas : [];
      if (sourcePlayAreas.length === 0) {
        continue;
      }
      const renderable = ctx.polygonContract?.extractRenderablePlayAreaPolygons
        ? ctx.polygonContract.extractRenderablePlayAreaPolygons(sourcePlayAreas, {
          fallbackPolygon: ctx.SHIP_POLYGON_DEFAULT,
          allowDefaultFallbackWhenEmpty: false,
        })
        : [];
      if (!Array.isArray(renderable) || renderable.length === 0) {
        issues.push({
          code: "canonical-play-areas-invalid",
          boardId,
          source: sourceLabel,
          detail: "No renderable canonical play-area polygon found in source payload",
        });
      }
    }
    return issues;
  }

  function reportCanonicalPolygonIssues(issues, { sourceLabel = "runtime" } = {}) {
    const state = ctx.state;
    if (!Array.isArray(issues) || issues.length === 0) {
      return;
    }
    const first = issues[0] ?? {};
    const boardId = String(first.boardId || state.boardId || "unknown-board");
    const source = String(first.source || sourceLabel || "unknown-source");
    const detail = String(first.detail || first.code || "canonical load/apply failed");
    const statusText = `Status: Canonical polygon load/apply warning (${boardId} | source=${source}) - ${detail}`;
    if (ctx.triggerFeedback) {
      ctx.triggerFeedback.textContent = statusText;
    }
    for (const issue of issues) {
      const issueBoard = String(issue?.boardId || boardId);
      const issueSource = String(issue?.source || source);
      const issueDetail = String(issue?.detail || issue?.code || detail);
      showToast(`Canonical polygon issue: ${issueBoard} (${issueSource}) - ${issueDetail}`, {
        kind: "error",
        dedupeKey: `canonical-polygon-issue:${issueBoard}:${issueSource}:${issue?.code || "unknown"}`,
      });
    }
  }

  function normalizeSnapshotEnvelope(payload) {
    const session = payload?.session;
    const version = Number.isFinite(Number(session?.version)) ? Number(session.version) : null;
    return {
      version,
      snapshot: session?.snapshot ?? null,
      changed: payload?.changed === true,
    };
  }

  function resolvePendingMutationsByVersion(appliedVersion) {
    const liveSync = ctx.liveSync;
    for (const [mutationId, entry] of liveSync.pendingMutations.entries()) {
      const acceptedVersion = Number(entry?.acceptedVersion ?? 0);
      if (acceptedVersion > 0 && Number(appliedVersion) >= acceptedVersion) {
        liveSync.pendingMutations.delete(mutationId);
        ctx.recordMutationTrace(mutationId, "snapshot_applied");
      }
    }
  }

  window.TT_BEAMER_RUNTIME_SNAPSHOT_HELPERS = {
    init,
    buildRuntimeSnapshotForLiveSync,
    getAdaptivePollingIntervalMs,
    scheduleNextLiveSnapshotPoll,
    showToast,
    reportActionError,
    collectCanonicalPlayAreaIssuesFromProfiles,
    reportCanonicalPolygonIssues,
    normalizeSnapshotEnvelope,
    resolvePendingMutationsByVersion,
  };
})();
