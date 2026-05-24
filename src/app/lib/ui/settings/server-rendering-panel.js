// Server-side Rendering settings panel.
//
// Wires the four form controls (encoder dropdown, qualityPreset radio,
// resolutionPreference radio, fpsTarget radio, streamFpsCap radio) and
// the read-only Detected-encoders badge against
// `config/global-defaults.json#serverRendering` via the existing live-sync
// API (`serverRendering-update` mutation, server-validated by
// validateServerRenderingPatch).
//
// Encoder change side-effect:
//   When the operator changes the encoder dropdown, the SSR tab restarts
//   (server.mjs encoder-restart wiring). The status line shows
//   "Restarting render server…" until the live-sync poll observes
//   recovery; /output/ briefly shows a reconnect banner.

(() => {
  // Phase 50 (2026-05-24): pending SSR patch buffer + commit/discard
  // hooks. Slider input no longer fires emitLiveMutation directly —
  // dragging would otherwise restart the SSR Chromium tab on every
  // tick. Instead the slider accumulates into pendingPatch, marks the
  // global config dirty, and the operator commits via the Apply
  // changes bar (commitPendingSSRPatch is called from
  // applyLocalConfigToServer). Discard clears the buffer + refreshes
  // the slider from the server's persisted config.
  let pendingPatch = null;
  let panelDeps = null;

  function _resetPending() {
    pendingPatch = null;
  }

  function _accumPending(patch) {
    pendingPatch = { ...(pendingPatch || {}), ...patch };
  }

  function commitPendingSSRPatch() {
    if (!pendingPatch || !panelDeps?.emitLiveMutation) return Promise.resolve();
    const patchCopy = pendingPatch;
    pendingPatch = null;
    try {
      return Promise.resolve(panelDeps.emitLiveMutation("serverRendering-update", patchCopy));
    } catch (err) {
      console.warn("[ssr-panel] commitPendingSSRPatch failed:", err?.message || err);
      return Promise.resolve();
    }
  }

  function discardPendingSSRPatch() {
    _resetPending();
    // Re-fetch + reflect server's persisted config so the slider snaps
    // back to whatever's actually applied.
    if (typeof panelDeps?.fetchGlobalDefaults === "function" && panelDeps._reflectConfig) {
      Promise.resolve(panelDeps.fetchGlobalDefaults()).then((cfg) => {
        const sr = cfg?.serverRendering;
        if (sr) panelDeps._reflectConfig(sr);
      }).catch(() => { /* ignore */ });
    }
  }

  /**
   * Wire the form controls + Detected-encoders badge to live-sync.
   *
   * @param {object} deps
   * @param {object} deps.refs - DOM refs from runtime-dom-refs.js
   * @param {function} deps.emitLiveMutation - (type, payload) => Promise
   * @param {function} [deps.fetchGlobalDefaults] - returns Promise<config>
   * @param {function} [deps.onSnapshot] - register a snapshot listener
   * @param {function} [deps.markLocalConfigDirty] - mark global config dirty
   */
  function initServerRenderingPanel(deps = {}) {
    const refs = deps.refs ?? {};
    const emitLiveMutation = typeof deps.emitLiveMutation === "function"
      ? deps.emitLiveMutation
      : () => Promise.resolve();
    const fetchGlobalDefaults = typeof deps.fetchGlobalDefaults === "function"
      ? deps.fetchGlobalDefaults
      : () => fetch("/api/global-defaults").then((r) => r.ok ? r.json() : null).catch(() => null);

    if (!refs.ssrEncoderSelect) {
      // Section not present in the current DOM (e.g. /output/ has no
      // settings UI). Pure no-op — keeps the orchestration init chain safe.
      return;
    }

    function setStatus(text) {
      if (refs.ssrServerRenderingStatus) {
        refs.ssrServerRenderingStatus.textContent = text;
      }
    }

    function reflectConfig(serverRendering) {
      if (!serverRendering || typeof serverRendering !== "object") return;
      if (typeof serverRendering.encoder === "string") {
        refs.ssrEncoderSelect.value = serverRendering.encoder;
      }
      // Phase 50: bitrate slider replaced with 3-option preset radio
      // (Low=3, Standard=10, Maximum=30 Mbit/s). Numeric streamBitrateMbps
      // is still the canonical config field. If a legacy persisted value
      // (e.g. 16) doesn't match any radio button, the nearest option is
      // selected so the UI reflects intent without losing the value.
      if (Number.isFinite(serverRendering.streamBitrateMbps) && refs.ssrBitratePresetRadios) {
        const v = Math.round(serverRendering.streamBitrateMbps);
        const presetValues = [3, 10, 30];
        let chosen = presetValues.reduce((best, p) =>
          Math.abs(p - v) < Math.abs(best - v) ? p : best, presetValues[1]);
        for (const r of refs.ssrBitratePresetRadios) {
          r.checked = (Number(r.value) === chosen);
        }
      }
      if (typeof serverRendering.resolutionPreference === "string") {
        for (const r of (refs.ssrResolutionPreferenceRadios || [])) {
          r.checked = (r.value === serverRendering.resolutionPreference);
        }
      }
      if (serverRendering.fpsTarget != null) {
        for (const r of (refs.ssrFpsTargetRadios || [])) {
          r.checked = (Number(r.value) === Number(serverRendering.fpsTarget));
        }
      }
      if (serverRendering.streamFpsCap != null) {
        for (const r of (refs.ssrStreamFpsCapRadios || [])) {
          r.checked = (Number(r.value) === Number(serverRendering.streamFpsCap));
        }
      }
      // Phase 50 (2026-05-24): codec + content-hint reflectance.
      if (typeof serverRendering.codecPreference === "string" && refs.ssrCodecSelect) {
        refs.ssrCodecSelect.value = serverRendering.codecPreference;
      }
      if (typeof serverRendering.contentHint === "string" && refs.ssrContentHintSelect) {
        refs.ssrContentHintSelect.value = serverRendering.contentHint;
      }
      if (refs.ssrDetectedEncodersBadge) {
        // Phase 50 (2026-05-24, follow-up): distinguish three states so
        // the badge isn't permanently stuck at "(auto-detection in
        // progress…)" on hardware where only the software fallback is
        // available. Operator UAT (2026-05-24): "Dort steht bei mir
        // noch konstant 'Detected: (auto-detection in progress...)".
        //   1. availableEncoders not yet populated → still probing
        //   2. only "x264-software" present → no hardware encoder
        //      available (legitimate end-state, not an error)
        //   3. one or more hardware encoders → list them
        const list = Array.isArray(serverRendering.availableEncoders)
          ? serverRendering.availableEncoders
          : null;
        let detected;
        if (!list || list.length === 0) {
          detected = "(auto-detection in progress…)";
        } else {
          const hw = list.filter((e) => e !== "x264-software");
          detected = hw.length > 0
            ? hw.join(", ")
            : "software only (no hardware encoder)";
        }
        refs.ssrDetectedEncodersBadge.textContent = `Detected: ${detected}`;
      }
    }

    function sendPatch(patch, statusMessage) {
      setStatus(statusMessage || "Server-side rendering: applying…");
      try {
        emitLiveMutation("serverRendering-update", patch);
      } catch (err) {
        setStatus(`Server-side rendering: error (${err?.message || "unknown"})`);
      }
    }

    refs.ssrEncoderSelect.addEventListener("change", (e) => {
      sendPatch(
        { encoder: e.target.value },
        "Restarting render server (encoder change)…",
      );
    });
    // Phase 50 (refined): bitrate preset radio. Each click sends the
    // mutation immediately (radios don't have the slider's drag-cost
    // problem). The legacy pendingPatch / Apply-bar path is retired
    // for this control — radios are inherently discrete picks.
    for (const r of (refs.ssrBitratePresetRadios || [])) {
      r.addEventListener("change", () => {
        if (!r.checked) return;
        const v = Math.max(2, Math.min(50, Math.round(Number(r.value) || 10)));
        sendPatch(
          { streamBitrateMbps: v },
          "Restarting render server (bitrate cap change)…",
        );
      });
    }
    for (const r of (refs.ssrResolutionPreferenceRadios || [])) {
      r.addEventListener("change", () => {
        if (r.checked) sendPatch({ resolutionPreference: r.value });
      });
    }
    for (const r of (refs.ssrFpsTargetRadios || [])) {
      r.addEventListener("change", () => {
        if (r.checked) sendPatch({ fpsTarget: Number(r.value) });
      });
    }
    for (const r of (refs.ssrStreamFpsCapRadios || [])) {
      r.addEventListener("change", () => {
        if (r.checked) sendPatch({ streamFpsCap: Number(r.value) });
      });
    }
    // Phase 50 (2026-05-24): codec + content-hint operator change handlers.
    // Each restarts the SSR Chromium tab (server.mjs's restartKeys list
    // includes codecPreference + contentHint).
    if (refs.ssrCodecSelect) {
      refs.ssrCodecSelect.addEventListener("change", (e) => {
        sendPatch(
          { codecPreference: e.target.value },
          "Restarting render server (codec change)…",
        );
      });
    }
    if (refs.ssrContentHintSelect) {
      refs.ssrContentHintSelect.addEventListener("change", (e) => {
        sendPatch(
          { contentHint: e.target.value },
          "Restarting render server (content hint change)…",
        );
      });
    }

    Promise.resolve(fetchGlobalDefaults())
      .then((cfg) => {
        const sr = (cfg && typeof cfg === "object" && cfg.serverRendering) || null;
        if (sr) {
          reflectConfig(sr);
          setStatus("Server-side rendering: ready");
        } else {
          setStatus("Server-side rendering: (no config available)");
        }
      })
      .catch(() => {
        setStatus("Server-side rendering: failed to load configuration");
      });

    if (typeof deps.onSnapshot === "function") {
      deps.onSnapshot((snapshot) => {
        const sr = snapshot?.serverRendering ?? snapshot?.globalDefaults?.serverRendering ?? null;
        if (sr) reflectConfig(sr);
      });
    }

    // Phase 50 (refined): stash deps + reflectConfig so the
    // namespace-level commit/discard hooks can later emit the live
    // mutation (commit) or refresh UI from server (discard).
    panelDeps = {
      emitLiveMutation,
      fetchGlobalDefaults,
      _reflectConfig: reflectConfig,
    };
  }

  window.TT_BEAMER_SETTINGS_SERVER_RENDERING_PANEL = {
    initServerRenderingPanel,
    commitPendingSSRPatch,
    discardPendingSSRPatch,
    hasPendingSSRPatch: () => pendingPatch !== null,
  };
})();
