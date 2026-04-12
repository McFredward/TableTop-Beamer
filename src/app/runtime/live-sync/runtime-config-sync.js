// Phase 14-2: config-sync module.
//
// Owns the local-dirty flag lifecycle + server apply/discard
// transport + blocking server-unreachable overlay. This is the
// "push local config to server / reload from server" wiring that
// lives on top of the bootstrap-hydrated state.
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;
  let cleanBaselineJson = null;
  let suppressBroadcastReapplyUntil = 0;

  function init(dependencies) {
    ctx = dependencies;
  }

  // Produce a stable, key-sorted JSON serialization of any value so two
  // structurally-equal objects always compare as identical strings.
  function stableStringify(value) {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  // Snapshot of everything that persistBoardProfiles is supposed to
  // cover: the full board profile map plus the persisted runtime
  // settings. Used as the dirty-gate comparison key.
  function buildDirtyComparisonSnapshot() {
    if (typeof ctx?.buildBoardProfilesFromState !== "function"
      || typeof ctx?.buildPersistedRuntimeSettingsFromState !== "function") {
      return null;
    }
    const snapshot = {
      boardProfiles: ctx.buildBoardProfilesFromState(),
      runtimeSettings: ctx.buildPersistedRuntimeSettingsFromState(),
    };
    return stableStringify(snapshot);
  }

  function captureCleanBaseline() {
    cleanBaselineJson = buildDirtyComparisonSnapshot();
  }

  // Phase 15-1: dirty flag only fires when state actually differs from
  // the clean baseline. Before this, every dropdown change that merely
  // re-selected the current value was incorrectly marking the config
  // dirty and triggering the "unsaved changes" banner.
  function persistBoardProfiles() {
    const currentJson = buildDirtyComparisonSnapshot();
    if (cleanBaselineJson === null) {
      // Baseline not yet captured (shouldn't happen in normal bootstrap
      // ordering, but stay safe). Fall back to legacy mark-always.
      markLocalConfigDirty("board-profiles-mutated");
      return { ok: true, target: "local-dirty", routing: "opt-in" };
    }
    if (currentJson === cleanBaselineJson) {
      // No net change vs. the last server-clean state. Ensure the dirty
      // flag is cleared in case an earlier mutation brought us here and
      // the user has since reverted.
      if (ctx.state.localConfigDirty) {
        clearLocalConfigDirty("Global config: no unsaved changes");
      }
      return { ok: true, target: "clean", routing: "opt-in" };
    }
    markLocalConfigDirty("board-profiles-mutated");
    return { ok: true, target: "local-dirty", routing: "opt-in" };
  }

  function markLocalConfigDirty(reason) {
    const state = ctx.state;
    state.localConfigDirty = true;
    refreshApplyDiscardButtonsUi();
    if (ctx.globalDefaultsStatus) {
      ctx.globalDefaultsStatus.textContent =
        `Local config: unsaved changes (${reason || "mutation"}). Click Apply to push to server.`;
    }
  }

  function clearLocalConfigDirty(reasonText) {
    const state = ctx.state;
    state.localConfigDirty = false;
    state.remoteConfigUpdateAwaiting = false;
    refreshApplyDiscardButtonsUi();
    if (ctx.globalDefaultsStatus) {
      ctx.globalDefaultsStatus.textContent = reasonText || "Global config: synced";
    }
  }

  function refreshApplyDiscardButtonsUi() {
    const state = ctx.state;
    const bar = document.getElementById("apply-global-config-bar");
    const applyButton = document.getElementById("apply-global-config");
    const discardButton = document.getElementById("discard-global-config");
    const indicator = document.getElementById("apply-global-config-indicator");
    const dirty = Boolean(state.localConfigDirty);
    const remoteAwaiting = Boolean(state.remoteConfigUpdateAwaiting);
    if (bar) {
      bar.classList.toggle("is-dirty", dirty || remoteAwaiting);
    }
    if (applyButton) {
      applyButton.disabled = !dirty;
      applyButton.textContent = dirty
        ? `Apply changes (unsaved)${remoteAwaiting ? " - overrides remote" : ""}`
        : "Apply changes (no pending edits)";
      applyButton.classList.toggle("has-unsaved", dirty);
    }
    if (discardButton) {
      discardButton.disabled = !(dirty || remoteAwaiting);
      discardButton.textContent = remoteAwaiting
        ? "Discard (load server version)"
        : "Discard local changes";
    }
    if (indicator) {
      if (remoteAwaiting) {
        indicator.textContent =
          "Server-Config wurde von einem anderen Client geaendert. Apply ueberschreibt die Serverversion, Discard laedt sie.";
        indicator.style.display = "";
      } else if (dirty) {
        indicator.textContent = "Lokale Aenderungen sind nicht gespeichert.";
        indicator.style.display = "";
      } else {
        indicator.textContent = "";
        indicator.style.display = "none";
      }
    }
  }

  async function applyLocalConfigToServer() {
    const state = ctx.state;
    if (!state.localConfigDirty) return { ok: true, nothingToDo: true };
    try {
      await ctx.saveGlobalDefaultsToServer();
      clearLocalConfigDirty("Global config: pushed local changes to server");
      captureCleanBaseline();
      return { ok: true };
    } catch (error) {
      const message = String(error?.message || error || "unknown");
      console.warn("[global-config] apply failed:", message);
      if (ctx.globalDefaultsStatus) {
        ctx.globalDefaultsStatus.textContent = `Global config: apply failed (${message})`;
      }
      return { ok: false, error: message };
    }
  }

  // Direct save + baseline capture without showing the apply/discard
  // bar. Used by the live animation editor's "Done" button — the
  // user's click is the explicit commit action, no intermediate
  // dirty-flag step needed.
  async function saveAndCaptureCleanBaseline() {
    try {
      // Suppress the global-config-update broadcast echo for 3 seconds
      // so our own save doesn't trigger a re-fetch that overwrites
      // local state changes the user is about to make next.
      suppressBroadcastReapplyUntil = Date.now() + 3000;
      await ctx.saveGlobalDefaultsToServer();
      clearLocalConfigDirty("Global config: synced");
      captureCleanBaseline();
      return { ok: true };
    } catch (error) {
      console.warn("[global-config] silent save failed:", error?.message || error);
      return { ok: false };
    }
  }

  function shouldSuppressBroadcastReapply() {
    return Date.now() < suppressBroadcastReapplyUntil;
  }

  async function discardLocalConfigAndReloadFromServer() {
    try {
      const loaded = await ctx.fetchGlobalDefaultsPayload();
      ctx.applyGlobalDefaultsPayloadToState(loaded.payload);
      ctx.syncRuntimePanelsFromState();
      ctx.renderRunningAnimationsList();
      ctx.refreshGlobalButtons();
      clearLocalConfigDirty("Global config: discarded local changes, reloaded from server");
      captureCleanBaseline();
      return { ok: true };
    } catch (error) {
      const message = String(error?.message || error || "unknown");
      console.warn("[global-config] discard reload failed:", message);
      if (ctx.globalDefaultsStatus) {
        ctx.globalDefaultsStatus.textContent = `Global config: discard reload failed (${message})`;
      }
      return { ok: false, error: message };
    }
  }

  function renderServerUnreachableOverlay(error) {
    const existing = document.getElementById("tt-beamer-server-unreachable-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "tt-beamer-server-unreachable-overlay";
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-live", "assertive");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(10, 12, 18, 0.94)",
      color: "#f4f7ff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "18px",
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      zIndex: "99999",
      padding: "32px",
      textAlign: "center",
    });

    const title = document.createElement("h1");
    title.textContent = "Server nicht erreichbar";
    title.style.fontSize = "24px";
    title.style.margin = "0";
    overlay.append(title);

    const detail = document.createElement("p");
    detail.textContent = String(error?.message || error || "Unknown error");
    detail.style.margin = "0";
    detail.style.maxWidth = "640px";
    detail.style.opacity = "0.85";
    overlay.append(detail);

    const info = document.createElement("p");
    info.textContent =
      "Die globale Config wird ausschließlich vom Server geladen. "
      + "Starte den Server und klicke Retry, um die App zu laden.";
    info.style.margin = "0";
    info.style.maxWidth = "640px";
    info.style.opacity = "0.75";
    overlay.append(info);

    const retryButton = document.createElement("button");
    retryButton.textContent = "Retry";
    retryButton.type = "button";
    Object.assign(retryButton.style, {
      padding: "10px 24px",
      fontSize: "16px",
      background: "#4c8bff",
      color: "#ffffff",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
    });
    retryButton.addEventListener("click", async () => {
      retryButton.disabled = true;
      retryButton.textContent = "Retrying...";
      try {
        const loaded = await ctx.fetchGlobalDefaultsPayload();
        window.__TT_BEAMER_BOOTSTRAP_CONFIG__ = loaded.payload;
        ctx.applyGlobalDefaultsPayloadToState(loaded.payload);
        ctx.syncRuntimePanelsFromState();
        overlay.remove();
        if (ctx.globalDefaultsStatus) {
          ctx.globalDefaultsStatus.textContent =
            `Global config: recovered after retry (${loaded.endpoint || "server-config"})`;
        }
      } catch (retryError) {
        retryButton.disabled = false;
        retryButton.textContent = "Retry";
        detail.textContent = String(retryError?.message || retryError || "Unknown error");
      }
    });
    overlay.append(retryButton);

    document.body.append(overlay);
  }

  window.TT_BEAMER_RUNTIME_CONFIG_SYNC = {
    init,
    persistBoardProfiles,
    markLocalConfigDirty,
    clearLocalConfigDirty,
    refreshApplyDiscardButtonsUi,
    applyLocalConfigToServer,
    discardLocalConfigAndReloadFromServer,
    renderServerUnreachableOverlay,
    captureCleanBaseline,
    saveAndCaptureCleanBaseline,
    shouldSuppressBroadcastReapply,
  };
})();
