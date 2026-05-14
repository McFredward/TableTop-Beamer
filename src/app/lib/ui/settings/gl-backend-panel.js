// 2026-05-14 — GL backend selector panel (Settings → System).
//
// Self-contained IIFE module. On dashboard mount: fetches
// /api/system/info, reflects the current backend in the radio group,
// disables the Mesa option when the server reports no compatible iGPU,
// and shows the disable-reason tooltip. On radio change: POSTs
// /api/system/gl-backend with { backend } — server persists the value
// to config/runtime-system.json and restarts the SSR Chromium tab so
// the new --use-angle flag takes effect immediately.
//
// /output/ has no settings UI; the panel's no-op early-return at
// "no fieldset" keeps the orchestrator init chain safe on receiver-only
// pages.

(() => {
  function setStatus(line, text) {
    if (line) line.textContent = text;
  }

  async function fetchInfo() {
    try {
      const resp = await fetch("/api/system/info", { cache: "no-store" });
      if (!resp.ok) return null;
      const json = await resp.json();
      return json?.ok ? json : null;
    } catch {
      return null;
    }
  }

  async function postBackend(backend) {
    const resp = await fetch("/api/system/gl-backend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ backend }),
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.ok) {
      const err = json?.error || `HTTP ${resp.status}`;
      throw new Error(json?.detail ? `${err}: ${json.detail}` : err);
    }
    return json;
  }

  function init() {
    const fieldset = document.getElementById("gl-backend-radio-group");
    if (!fieldset) return; // /output/ — no settings UI

    const radios = Array.from(
      fieldset.querySelectorAll('input[name="gl-backend"]'),
    );
    const mesaLabel = document.getElementById("gl-backend-mesa-label");
    const swLabel = document.getElementById("gl-backend-swiftshader-label");
    const hint = document.getElementById("gl-backend-disabled-hint");
    const status = document.getElementById("gl-backend-status");

    let appliedBackend = null;
    let suppressEvents = false;

    function reflect(info) {
      if (!info || !info.glBackend) return;
      const { current, hasIgpuDev, disabledReasons } = info.glBackend;
      // Disable Mesa if no compatible GPU was detected at server boot.
      // Show the reason inline + as a tooltip on the disabled label.
      const mesaInput = radios.find((r) => r.value === "mesa");
      if (mesaInput) {
        mesaInput.disabled = !hasIgpuDev;
        if (mesaLabel) {
          if (!hasIgpuDev) {
            mesaLabel.setAttribute("title", disabledReasons?.mesa || "no GPU");
            mesaLabel.classList.add("gl-backend-disabled");
          } else {
            mesaLabel.removeAttribute("title");
            mesaLabel.classList.remove("gl-backend-disabled");
          }
        }
      }
      if (hint) {
        if (!hasIgpuDev && disabledReasons?.mesa) {
          hint.textContent = disabledReasons.mesa;
          hint.hidden = false;
        } else {
          hint.hidden = true;
        }
      }
      // Reflect current selection. If the server has no persisted pick yet
      // (current === null), leave all radios unchecked so the operator
      // makes an explicit choice rather than us defaulting silently.
      suppressEvents = true;
      try {
        radios.forEach((r) => {
          r.checked = (current === r.value);
        });
        appliedBackend = current;
      } finally {
        suppressEvents = false;
      }
      if (current) {
        const label = current === "mesa" ? "Mesa (GPU)" : "SoftwareWebGL";
        setStatus(status, `GL backend: ${label}`);
      } else {
        setStatus(status, "GL backend: nicht gesetzt — wähle eine Option.");
      }
    }

    fieldset.addEventListener("change", async (event) => {
      if (suppressEvents) return;
      const target = event.target;
      if (!target || target.name !== "gl-backend") return;
      const next = target.value;
      if (next === appliedBackend) return;
      setStatus(status, `Wechsel zu ${next} — SSR-Tab startet neu…`);
      // Disable inputs during the round-trip to prevent rapid toggling
      // before the SSR tab finishes restarting.
      radios.forEach((r) => { r.dataset.prevDisabled = r.disabled ? "1" : "0"; r.disabled = true; });
      try {
        const result = await postBackend(next);
        appliedBackend = result.glBackend;
        const label = appliedBackend === "mesa" ? "Mesa (GPU)" : "SoftwareWebGL";
        setStatus(status, result.restartFired
          ? `GL backend: ${label} — SSR-Tab neugestartet (Stream lädt neu).`
          : `GL backend: ${label} — gespeichert (kein aktiver SSR-Tab zum Neustarten).`,
        );
      } catch (err) {
        setStatus(status, `Fehler: ${err?.message || err}`);
        // Revert selection on failure so the radios match the on-disk state.
        const info = await fetchInfo();
        reflect(info);
      } finally {
        radios.forEach((r) => {
          // Restore disabled state from before the round-trip; the
          // Mesa-disabled-because-no-iGPU state stays via reflect().
          if (r.dataset.prevDisabled === "1") r.disabled = true;
          else r.disabled = false;
          delete r.dataset.prevDisabled;
        });
        const info = await fetchInfo();
        reflect(info);
      }
    });

    // Initial reflect on mount.
    fetchInfo().then((info) => {
      if (info) reflect(info);
      else setStatus(status, "GL backend: /api/system/info nicht erreichbar");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.TT_BEAMER_SETTINGS_GL_BACKEND_PANEL = { init };
})();
