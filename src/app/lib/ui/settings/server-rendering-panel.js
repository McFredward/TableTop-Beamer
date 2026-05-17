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
  /**
   * Wire the form controls + Detected-encoders badge to live-sync.
   *
   * @param {object} deps
   * @param {object} deps.refs - DOM refs from runtime-dom-refs.js
   * @param {function} deps.emitLiveMutation - (type, payload) => Promise
   * @param {function} [deps.fetchGlobalDefaults] - returns Promise<config>
   * @param {function} [deps.onSnapshot] - register a snapshot listener
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
      if (typeof serverRendering.qualityPreset === "string") {
        for (const r of (refs.ssrQualityPresetRadios || [])) {
          r.checked = (r.value === serverRendering.qualityPreset);
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
      if (refs.ssrDetectedEncodersBadge) {
        // Hide x264-software from the badge — it's the universal software
        // fallback that's always present in the availability list and
        // operators read it as noise (Phase 47 gap-closure-11: operator
        // feedback "x264-software ausblenden"). The fallback stays
        // active in pickPreferredEncoder; this is display-only.
        const hardwareEncoders = Array.isArray(serverRendering.availableEncoders)
          ? serverRendering.availableEncoders.filter((e) => e !== "x264-software")
          : [];
        const detected = hardwareEncoders.length > 0
          ? hardwareEncoders.join(", ")
          : "(auto-detection in progress…)";
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
    for (const r of (refs.ssrQualityPresetRadios || [])) {
      r.addEventListener("change", () => {
        if (r.checked) sendPatch({ qualityPreset: r.value });
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
  }

  window.TT_BEAMER_SETTINGS_SERVER_RENDERING_PANEL = {
    initServerRenderingPanel,
  };
})();
