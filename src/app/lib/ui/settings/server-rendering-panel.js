// Phase 31 Plan 05 (Wave 5) — Server-side Rendering settings panel.
//
// Wires the 5 form controls (encoder dropdown, qualityPreset radio,
// resolutionPreference radio, fpsTarget radio, audioRoute toggle) and the
// read-only Detected-encoders badge against
// `config/global-defaults.json#serverRendering` via the existing live-sync
// API (`serverRendering-update` mutation, server-validated by Plan-04
// validateServerRenderingPatch).
//
// D-D2 REVERSAL (2026-05-06, .planning/phases/phase-31/31-D-D2-REVERSAL-ADDENDUM.md):
//   - Default audioRoute = "pi-local" (toggle UNCHECKED).
//   - The "in-stream" option is rendered DISABLED in HTML with a tooltip
//     until the WAVE0_AUDIO_CAPTURE_VERIFIED feature flag flips true.
//   - Sending serverRendering-update with audioRoute=in-stream is gated
//     here as well — sendPatch refuses to flip to in-stream when the flag
//     is false. This matches the disabled HTML attribute (defense-in-depth).
//
// Encoder change side-effect:
//   When the user changes the encoder dropdown, the server-side SSR tab
//   restarts (server.mjs encoder-restart wiring, Plan 05 Task 2b step 7).
//   The status line displays "Restarting render server…" until the live-
//   sync poll observes recovery (or 15s timeout → error message). Pi
//   reconnect banner from Plan 03 D-C2 fires automatically.
//
// IIFE module pattern matches the existing src/app/lib/ui/settings/* files
// (rooms.js etc.) and exposes a single init function on
// `window.TT_BEAMER_SETTINGS_SERVER_RENDERING_PANEL.initServerRenderingPanel`.

(() => {
  // Feature flag — flips true after Wave-0 audio-capture smoke test passes
  // (test/ssr-audio-capture-smoke.test.mjs is currently t.skip(); when it
  // runs green, set this to true to re-enable the in-stream toggle).
  const WAVE0_AUDIO_CAPTURE_VERIFIED = false;

  /**
   * Wire the 5 form controls + Detected-encoders badge to live-sync.
   *
   * @param {object} deps
   * @param {object} deps.refs - DOM refs from runtime-dom-refs.js
   * @param {function} deps.emitLiveMutation - (type, payload) => Promise
   * @param {function} [deps.fetchGlobalDefaults] - returns Promise<config>
   *   that resolves with the parsed /api/global-defaults JSON. Defaults to
   *   `fetch("/api/global-defaults").then(r => r.json())`.
   * @param {function} [deps.fetchAvailableEncoders] - returns Promise<string[]>
   *   for the Detected-encoders badge. Defaults to a snapshot fetch from
   *   /api/global-defaults#serverRendering.availableEncoders if present.
   * @param {function} [deps.onSnapshot] - register a snapshot listener.
   *   Optional; the panel polls /api/global-defaults on mount even without
   *   live-sync push so it works in non-SSR builds too.
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
      // Section not present in the current DOM (e.g. /output/ on Pi has no
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
      if (typeof serverRendering.audioRoute === "string") {
        // checked === in-stream; unchecked === pi-local (D-D2 reversal default)
        if (refs.ssrAudioRouteToggle) {
          refs.ssrAudioRouteToggle.checked = (serverRendering.audioRoute === "in-stream");
        }
      }
      // Detected encoders badge (read-only). Plan-04 validator silently drops
      // unknown keys, so availableEncoders is a passive snapshot field
      // populated by server.mjs after auto-detection completes.
      if (refs.ssrDetectedEncodersBadge) {
        const detected = Array.isArray(serverRendering.availableEncoders)
          && serverRendering.availableEncoders.length > 0
            ? serverRendering.availableEncoders.join(", ")
            : "(auto-detection in progress…)";
        refs.ssrDetectedEncodersBadge.textContent = `Detected: ${detected}`;
      }
    }

    function sendPatch(patch, statusMessage) {
      // D-D2 reversal guard: refuse to switch to in-stream until the
      // feature flag flips. The HTML disabled attribute is the primary
      // gate; this is defense-in-depth.
      if (
        patch && patch.audioRoute === "in-stream"
        && !WAVE0_AUDIO_CAPTURE_VERIFIED
      ) {
        setStatus("Server-side rendering: in-stream audio is currently deferred (Pi-local active).");
        return;
      }
      setStatus(statusMessage || "Server-side rendering: applying…");
      try {
        emitLiveMutation("serverRendering-update", patch);
      } catch (err) {
        setStatus(`Server-side rendering: error (${err?.message || "unknown"})`);
      }
    }

    // ── Wire controls ─────────────────────────────────────────────────
    refs.ssrEncoderSelect.addEventListener("change", (e) => {
      sendPatch(
        { encoder: e.target.value },
        "Restarting render server (encoder change)…",
      );
      // The server-side SSR tab is restarted by server.mjs when the
      // encoder field changes. Pi sees the Plan-03 reconnect banner
      // automatically per D-C2.
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
    if (refs.ssrAudioRouteToggle) {
      refs.ssrAudioRouteToggle.addEventListener("change", (e) => {
        sendPatch({ audioRoute: e.target.checked ? "in-stream" : "pi-local" });
      });
    }

    // ── Initial config fetch ─────────────────────────────────────────
    Promise.resolve(fetchGlobalDefaults())
      .then((cfg) => {
        const sr = (cfg && typeof cfg === "object" && cfg.serverRendering) || null;
        if (sr) {
          reflectConfig(sr);
          setStatus("Server-side rendering: ready");
        } else {
          setStatus("Server-side rendering: (no config — run server with SSR_RENDER_HOST=1)");
        }
      })
      .catch(() => {
        setStatus("Server-side rendering: failed to load configuration");
      });

    // ── Optional snapshot listener (live-sync push) ──────────────────
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
