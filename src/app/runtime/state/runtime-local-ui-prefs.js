// Local UI preferences persistence.
//
// Owns the small subset of session state that's purely local (not
// server-affecting and not part of the live-sync wire protocol):
//
//   - polygonEditor.roomVerticesVisible      "Show Room Vertices"
//   - polygonEditor.roomNamesVisible         "Show Room Names"
//   - polygonEditor.playAreaVerticesVisible  "Show Play Area Vertices"
//   - polygonEditor.handleScale              polygon corner size
//   - quickMode.mode                         tap-action mode
//   - dashboardZone                          mobile focus zone
//
// Other locally-persisted bits (board id, theme, settings subtab,
// projection mapping) already have their own dedicated keys and are
// untouched here.
//
// Wire format: a single localStorage key with a JSON object. Schema
// version in the payload so future field additions can be tolerated.
(() => {
  const STORAGE_KEY = "tt-beamer.local-ui-prefs.v1";
  const SCHEMA = "tt-beamer.local-ui-prefs.v1";

  function readRaw() {
    try {
      const raw = window.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.schema === SCHEMA) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  function writeRaw(payload) {
    try {
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // private mode / quota exceeded — silently ignore. The session
      // still works; just no persistence across reloads.
    }
  }

  function clamp(value, lo, hi, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(lo, Math.min(hi, n));
  }

  function normalizeQuickMode(value) {
    const m = String(value || "").toLowerCase();
    return (m === "off" || m === "clear" || m === "toggle") ? m : null;
  }

  function normalizeDashboardZone(value) {
    const z = String(value || "").toLowerCase();
    return (z === "trigger" || z === "manage") ? z : null;
  }

  // Apply persisted prefs onto state. Each field is validated and
  // falls back silently if missing/invalid so a corrupt payload
  // doesn't break the boot.
  function loadLocalUiPrefs(state) {
    if (!state || typeof state !== "object") return;
    const data = readRaw();
    if (!data) return;
    const pe = state.polygonEditor;
    if (pe && data.polygonEditor && typeof data.polygonEditor === "object") {
      const dpe = data.polygonEditor;
      if (typeof dpe.roomVerticesVisible === "boolean") {
        pe.roomVerticesVisible = dpe.roomVerticesVisible;
      }
      if (typeof dpe.roomNamesVisible === "boolean") {
        pe.roomNamesVisible = dpe.roomNamesVisible;
      }
      if (typeof dpe.playAreaVerticesVisible === "boolean") {
        pe.playAreaVerticesVisible = dpe.playAreaVerticesVisible;
      }
      const scale = clamp(dpe.handleScale, 0.25, 4, null);
      if (scale !== null) pe.handleScale = scale;
    }
    if (state.quickMode && data.quickMode && typeof data.quickMode === "object") {
      const m = normalizeQuickMode(data.quickMode.mode);
      if (m) state.quickMode.mode = m;
    }
    const z = normalizeDashboardZone(data.dashboardZone);
    if (z) state.dashboardZone = z;
  }

  function persistLocalUiPrefs(state) {
    if (!state || typeof state !== "object") return;
    const pe = state.polygonEditor || {};
    const payload = {
      schema: SCHEMA,
      savedAt: new Date().toISOString(),
      polygonEditor: {
        roomVerticesVisible: pe.roomVerticesVisible !== false,
        roomNamesVisible: pe.roomNamesVisible !== false,
        playAreaVerticesVisible: pe.playAreaVerticesVisible !== false,
        handleScale: clamp(pe.handleScale, 0.25, 4, 1),
      },
      quickMode: {
        mode: normalizeQuickMode(state.quickMode?.mode) ?? "toggle",
      },
      dashboardZone: normalizeDashboardZone(state.dashboardZone) ?? "trigger",
    };
    writeRaw(payload);
  }

  window.TT_BEAMER_LOCAL_UI_PREFS = {
    STORAGE_KEY,
    loadLocalUiPrefs,
    persistLocalUiPrefs,
  };
})();
